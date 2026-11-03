import { Array as Arr, Duration, Effect, Fiber, Option, Order, Schedule, pipe } from "effect";
import type { Note } from "rpp-kit";

import { createEngine, play } from "./engine";
import { song } from "./song";

type Scheduled = Readonly<{ track: string; note: Note }>;

type Player = Readonly<{ stop: () => void }>;

type StartOptions = Readonly<{
  from: number;
  onTick: (position: number) => void;
  onEnd: () => void;
}>;

const LEAD_IN = 0.05;

const LOOKAHEAD = 0.25;

const TICK_MILLIS = 40;

const TICK = Duration.millis(TICK_MILLIS);

const STEP = 1;

const byStart = Order.mapInput(Order.Number, ({ note }: Scheduled) => note.start);

const unsorted: readonly Scheduled[] = pipe(
  song.tracks,
  Arr.flatMap(({ name: track, items }) =>
    pipe(
      items,
      Arr.flatMap((item) => {
        if (item.source.kind === "midi") {
          return item.source.notes;
        }
        return [];
      }),
      Arr.map((note) => ({ track, note })),
    ),
  ),
);

const scheduled = Arr.sortWith(unsorted, (entry) => entry, byStart);

const startPlayer = ({ from, onTick, onEnd }: StartOptions): Player => {
  const engine = createEngine();
  const origin = engine.now() + LEAD_IN - from;
  let next = Option.getOrElse(
    Arr.findFirstIndex(scheduled, ({ note }) => note.start >= from),
    () => scheduled.length,
  );
  const tick = Effect.sync(() => {
    const position = engine.now() - origin;
    for (const hit of Arr.takeWhile(
      Arr.drop(scheduled, next),
      ({ note }) => note.start <= position + LOOKAHEAD,
    )) {
      play(engine)({ ...hit, at: origin + hit.note.start });
      next += STEP;
    }
    onTick(position);
    if (position >= song.length) {
      onEnd();
    }
  });
  const fiber = Effect.runFork(Effect.repeat(tick, Schedule.spaced(TICK)));
  return {
    stop: () => {
      const close = Effect.promise(engine.close);
      Effect.runFork(Effect.andThen(Fiber.interrupt(fiber), close));
    },
  };
};

export { startPlayer };
export type { Player };
