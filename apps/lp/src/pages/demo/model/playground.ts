import { wrap } from "comlink";
import type { Remote } from "comlink";
import { Effect, FiberHandle, Match, Ref } from "effect";
import { mapRpp } from "rpp-kit";
import type { Mapped } from "rpp-kit";

import type { Checker } from "./checker.worker";
import { playground } from "./content";
import { GENERATED_PATH, generatedPane, mainPane, scopedEditor } from "./editors";
import { executor } from "./execution";
import type { Report } from "./output";
import { rppPane, songOf } from "./rpp-pane";
import source from "./timmy-intro.rpp?raw";

type Panes = Readonly<{ rpp: HTMLElement; generated: HTMLElement; main: HTMLElement }>;

type Session = Readonly<{ panes: Panes; report: Report }>;

const codeOf = (mapped: Mapped): string =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ code }) => code,
      error: () => "",
    }),
  );

const checker = Effect.acquireRelease(
  Effect.sync(() => new Worker(new URL("checker.worker.ts", import.meta.url), { type: "module" })),
  (thread) =>
    Effect.sync(() => {
      thread.terminate();
    }),
).pipe(Effect.map((thread) => wrap<Checker>(thread)));

const prepare = (worker: Remote<Checker>, code: string): Effect.Effect<void> =>
  Effect.promise(() => worker.initialize()).pipe(
    Effect.andThen(Effect.promise(() => worker.updateFile({ path: GENERATED_PATH, code }))),
  );

const runPlayground = Effect.fn("runPlayground")(function* runPlayground({
  panes,
  report,
}: Session) {
  const worker = yield* checker;
  const code = codeOf(mapRpp(source));
  const song = yield* songOf(source).pipe(Effect.flatMap((json) => Ref.make(json)));
  const fork = yield* FiberHandle.makeRuntime<never>();
  yield* prepare(worker, code);
  const generated = yield* scopedEditor({
    host: panes.generated,
    doc: code,
    extensions: generatedPane(worker),
  });
  const onChecked = executor({ worker, song, report, fork });
  const main = yield* scopedEditor({
    host: panes.main,
    doc: playground.usage,
    extensions: mainPane({ worker, onChecked }),
  });
  yield* scopedEditor({
    host: panes.rpp,
    doc: source,
    extensions: rppPane({ worker, generated, main, song }),
  });
  return yield* Effect.never;
});

export { runPlayground };
export type { Panes };
