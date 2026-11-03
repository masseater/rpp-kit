import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { Remote } from "comlink";
import { Effect, Match, Ref } from "effect";
import { mapRpp, readSong } from "rpp-kit";

import type { Checker } from "./checker.worker";
import { GENERATED_PATH, notifySongChanged, replaceDocument } from "./editors";

type Views = Readonly<{
  worker: Remote<Checker>;
  generated: EditorView;
  main: EditorView;
  song: Ref.Ref<string>;
}>;

type Rendered = Readonly<{ content: string; code: string }>;

type Problem = Readonly<{ start: number; end: number; message: string }>;

const MIN_ERROR_LENGTH = 1;

const songOf = (content: string): string => JSON.stringify(readSong(content));

const refreshChecker = (
  { worker, main, song }: Views,
  { content, code }: Rendered,
): Effect.Effect<void> =>
  Ref.set(song, songOf(content)).pipe(
    Effect.andThen(Effect.promise(() => worker.updateFile({ path: GENERATED_PATH, code }))),
    Effect.andThen(
      Effect.sync(() => {
        notifySongChanged(main);
      }),
    ),
  );

const errorAt = ({ start, end, message }: Problem): readonly Diagnostic[] => [
  { from: start, to: Math.max(end, start + MIN_ERROR_LENGTH), severity: "error", message },
];

const rppPane = (views: Views): readonly Extension[] => [
  linter((view): readonly Diagnostic[] => {
    const content = view.state.doc.toString();
    return Match.value(mapRpp(content)).pipe(
      Match.discriminatorsExhaustive("status")({
        ok: ({ code }): readonly Diagnostic[] => {
          replaceDocument({ view: views.generated, code });
          Effect.runFork(refreshChecker(views, { content, code }));
          return [];
        },
        error: ({ error }) => errorAt(error),
      }),
    );
  }),
];

export { rppPane, songOf };
