import type { Remote } from "comlink";
import { Array as Arr, Effect, Ref, pipe } from "effect";

import type { Checker } from "./checker.worker";
import { playground } from "./content";
import type { Checked } from "./editors";
import type { Entry, Line, Report } from "./output";
import { runScript } from "./runner";

type Fork = (effect: Effect.Effect<void>) => unknown;

type Execution = Readonly<{
  worker: Remote<Checker>;
  song: Ref.Ref<string>;
  report: Report;
  fork: Fork;
}>;

const COLUMN_BASE = 1;

const typeLines = ({ doc, lints }: Checked): readonly Line[] =>
  pipe(
    lints,
    Arr.map(({ from, message }): Line => {
      const line = doc.lineAt(from);
      return {
        kind: "type",
        text: `${playground.panes.main}:${line.number}:${from - line.from + COLUMN_BASE} ${message}`,
      };
    }),
  );

const execute = ({ worker, song, report }: Execution, checked: Checked): Effect.Effect<void> =>
  Effect.gen(function* executeMain() {
    const code = yield* Effect.promise(() => worker.transpile(checked.doc.toString()));
    const lines = yield* runScript({ code, song: yield* Ref.get(song) });
    report({
      status: "ran",
      entries: pipe(
        [...typeLines(checked), ...lines],
        Arr.map((line, id): Entry => ({ id, kind: line.kind, text: line.text })),
      ),
    });
  });

const executor =
  (execution: Execution) =>
  (checked: Checked): void => {
    execution.fork(execute(execution, checked));
  };

export { executor };
