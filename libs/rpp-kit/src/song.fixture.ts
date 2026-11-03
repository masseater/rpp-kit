import { NodeServices } from "@effect/platform-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Match,
  Option,
  Record as Rec,
  Schema,
  pipe,
} from "effect";

import { readSong } from "./read.ts";
import type { Song } from "./types.ts";

type Comparison = Readonly<{ rpp: string; truth: string; edit: (rpp: string) => string }>;

const TOLERANCE = 0.001;

const TruthNote = Schema.Struct({ pitch: Schema.Finite, start: Schema.Finite, end: Schema.Finite });

const TruthTrack = Schema.Struct({ track: Schema.Int, notes: Schema.Array(TruthNote) });

const Truth = Schema.fromJsonString(Schema.Array(TruthTrack));

type Played = typeof TruthNote.Type;

const runtime = ManagedRuntime.make(NodeServices.layer);

const readFixture = Effect.fn("readFixture")(function* readFixture(name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.readFileString(new URL(`fixtures/${name}`, import.meta.url).pathname);
});

const songOf = (name: string): Promise<Song> =>
  runtime.runPromise(Effect.map(readFixture(name), readSong));

const near = (left: number, right: number): boolean => Math.abs(left - right) <= TOLERANCE;

const playedOf = (song: Song, track: number): readonly Played[] =>
  pipe(
    Arr.get(song.trackOrder, track),
    Option.flatMap((name) => Rec.get(song.tracks, name)),
    Option.map(({ items }) => items),
    Option.getOrElse(() => []),
    Arr.flatMap(({ source }) =>
      Match.value(source).pipe(
        Match.when({ kind: "midi" }, (midi) => midi.notes),
        Match.orElse(() => []),
      ),
    ),
    Arr.map(({ pitch, start, duration }) => ({ pitch, start, end: start + duration })),
  );

const differs = ([expected, actual]: readonly [Played, Played]): boolean =>
  expected.pitch !== actual.pitch ||
  !near(expected.start, actual.start) ||
  !near(expected.end, actual.end);

const compare = Effect.fn("compare")(function* compare({ rpp, truth, edit }: Comparison) {
  const song = readSong(edit(yield* readFixture(rpp)));
  const tracks = yield* Schema.decodeEffect(Truth)(yield* readFixture(truth));
  return pipe(
    tracks,
    Arr.flatMap(({ track, notes }) => {
      const actual = playedOf(song, track);
      return Match.value(actual.length === notes.length).pipe(
        Match.when(false, () => [{ track, expected: notes, actual }]),
        Match.orElse(() =>
          pipe(
            Arr.zip(notes, actual),
            Arr.filter(differs),
            Arr.map(([expected, found]) => ({ track, expected: [expected], actual: [found] })),
          ),
        ),
      );
    }),
  );
});

const mismatchesOf = (comparison: Comparison): Promise<readonly unknown[]> =>
  runtime.runPromise(compare(comparison));

export { mismatchesOf, songOf };
export type { Comparison };
