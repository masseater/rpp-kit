import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { WorkerShape } from "@valtown/codemirror-ts/worker";
import { wrap } from "comlink";
import { Effect, Match } from "effect";
import type { Scope } from "effect";
import { mapRpp } from "rpp-kit";
import type { Mapped } from "rpp-kit";

import { playground } from "./content";
import {
  GENERATED_PATH,
  createEditor,
  generatedPane,
  mainPane,
  notifySongChanged,
  replaceDocument,
} from "./editors";
import source from "./timmy-intro.rpp?raw";

type Panes = Readonly<{ rpp: HTMLElement; generated: HTMLElement; main: HTMLElement }>;

type Views = Readonly<{ worker: WorkerShape; generated: EditorView; main: EditorView }>;

const MIN_ERROR_LENGTH = 1;

const codeOf = (mapped: Mapped): string =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ code }) => code,
      error: () => "",
    }),
  );

const refreshChecker = ({ worker, main }: Views, code: string): Effect.Effect<void> =>
  Effect.promise(() => worker.updateFile({ path: GENERATED_PATH, code })).pipe(
    Effect.andThen(
      Effect.sync(() => {
        notifySongChanged(main);
      }),
    ),
  );

const showSong = (views: Views, code: string): void => {
  replaceDocument({ view: views.generated, code });
  Effect.runFork(refreshChecker(views, code));
};

const rppLinter = (views: Views): Extension =>
  linter((view): readonly Diagnostic[] =>
    Match.value(mapRpp(view.state.doc.toString())).pipe(
      Match.discriminatorsExhaustive("status")({
        ok: ({ code }): readonly Diagnostic[] => {
          showSong(views, code);
          return [];
        },
        error: ({ error }): readonly Diagnostic[] => [
          {
            from: error.start,
            to: Math.max(error.end, error.start + MIN_ERROR_LENGTH),
            severity: "error",
            message: error.message,
          },
        ],
      }),
    ),
  );

const editor = (create: () => EditorView): Effect.Effect<EditorView, never, Scope.Scope> =>
  Effect.acquireRelease(Effect.sync(create), (view) =>
    Effect.sync(() => {
      view.destroy();
    }),
  );

const checker = Effect.acquireRelease(
  Effect.sync(() => new Worker(new URL("checker.worker.ts", import.meta.url), { type: "module" })),
  (thread) =>
    Effect.sync(() => {
      thread.terminate();
    }),
);

const runPlayground = Effect.fn("runPlayground")(function* runPlayground(panes: Panes) {
  const worker = wrap<WorkerShape>(yield* checker);
  const code = codeOf(mapRpp(source));
  yield* Effect.promise(() => worker.initialize());
  yield* Effect.promise(() => worker.updateFile({ path: GENERATED_PATH, code }));
  const generated = yield* editor(() =>
    createEditor({ host: panes.generated, doc: code, extensions: generatedPane(worker) }),
  );
  const main = yield* editor(() =>
    createEditor({ host: panes.main, doc: playground.usage, extensions: mainPane(worker) }),
  );
  yield* editor(() =>
    createEditor({
      host: panes.rpp,
      doc: source,
      extensions: [rppLinter({ worker, generated, main })],
    }),
  );
  return yield* Effect.never;
});

export { runPlayground };
export type { Panes };
