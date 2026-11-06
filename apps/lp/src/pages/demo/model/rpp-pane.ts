import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { Remote } from "comlink";
import { Effect, Match, Ref, Schema } from "effect";
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

const encodeSong = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const songOf = (content: string): Effect.Effect<string> =>
  encodeSong(readSong(content)).pipe(Effect.orDie);

const refreshChecker = (
  { worker, main, song }: Views,
  { content, code }: Rendered,
): Effect.Effect<void> =>
  songOf(content).pipe(
    Effect.flatMap((json) => Ref.set(song, json)),
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
