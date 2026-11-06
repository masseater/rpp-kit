import { NodeServices } from "@effect/platform-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Match,
  Option,
  Schema,
  pipe,
} from "effect";

import { readSong } from "./read.ts";
import type { Song } from "./types.ts";

type Comparison = Readonly<{ rpp: string; truth: string }>;

const TOLERANCE = 0.001;

const TruthNote = Schema.Struct({ pitch: Schema.Finite, start: Schema.Finite, end: Schema.Finite });

const TruthTrack = Schema.Struct({
  track: Schema.Int,
  name: Schema.String,
  notes: Schema.Array(TruthNote),
});

const Truth = Schema.fromJsonString(Schema.Array(TruthTrack));

type Played = typeof TruthNote.Type;

const runtime = ManagedRuntime.make(NodeServices.layer);

const readFixture = Effect.fn("readFixture")(function* readFixture(name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.readFileString(new URL(`fixtures/${name}`, import.meta.url).pathname);
});

type Reading<Result> = Readonly<{ name: string; read: (song: Song) => Result }>;

const fromSong = <Result>({ name, read }: Reading<Result>): Promise<Result> =>
  runtime.runPromise(Effect.map(readFixture(name), (text) => read(readSong(text))));

const songOf = (name: string): Promise<Song> => fromSong({ name, read: (song) => song });

const near = (left: number, right: number): boolean => Math.abs(left - right) <= TOLERANCE;

const playedOf = (song: Song, track: number, name: string): readonly Played[] =>
  pipe(
    Arr.get(song.tracks, track),
    Option.filter((found) => found.name === name),
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

const compare = Effect.fn("compare")(function* compare({ rpp, truth }: Comparison) {
  const rppText = yield* readFixture(rpp);
  const truthText = yield* readFixture(truth);
  const song = readSong(rppText);
  const tracks = yield* Schema.decodeEffect(Truth)(truthText);
  return pipe(
    tracks,
    Arr.flatMap(({ track, name, notes }) => {
      const actual = playedOf(song, track, name);
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

export { fromSong, mismatchesOf, songOf };
export type { Comparison, Reading };
