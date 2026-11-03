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
import { expect, test } from "vite-plus/test";

import { readSong } from "./read.ts";
import type { Song } from "./types.ts";

const TOLERANCE = 0.001;

const TruthNote = Schema.Struct({ pitch: Schema.Finite, start: Schema.Finite, end: Schema.Finite });

const TruthTrack = Schema.Struct({ name: Schema.String, notes: Schema.Array(TruthNote) });

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

const playedOf = (song: Song, name: string): readonly Played[] =>
  pipe(
    Rec.get(song.tracks, name),
    Option.map((track) => track.items),
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

const mismatchesOf = Effect.fn("mismatchesOf")(function* mismatchesOf(
  rpp: string,
  truthFile: string,
) {
  const song = readSong(yield* readFixture(rpp));
  const truth = yield* Schema.decodeEffect(Truth)(yield* readFixture(truthFile));
  return pipe(
    truth,
    Arr.flatMap(({ name, notes }) => {
      const actual = playedOf(song, name);
      return Match.value(actual.length === notes.length).pipe(
        Match.when(false, () => [{ name, expected: notes, actual }]),
        Match.orElse(() =>
          pipe(
            Arr.zip(notes, actual),
            Arr.filter(differs),
            Arr.map(([expected, found]) => ({ name, expected: [expected], actual: [found] })),
          ),
        ),
      );
    }),
  );
});

test("テンポの線の段差となめらかな変化をまたいで、MIDI のノートを秒に直す", () =>
  expect(runtime.runPromise(mismatchesOf("case_b.rpp", "truth_b.json"))).resolves.toStrictEqual(
    [],
  ));

test("テンポの線があれば、tempo は線の最初の点に合わせ、線を tempoMap に出す", () =>
  expect(songOf("case_b.rpp")).resolves.toMatchObject({
    tempo: { bpm: 120, numerator: 4, denominator: 4 },
    tempoMap: [
      { time: 0, bpm: 120, numerator: 4, denominator: 4, shape: "square" },
      { time: 4, bpm: 90, numerator: 4, denominator: 4, shape: "square" },
      { time: 8, bpm: 100, numerator: 4, denominator: 4, shape: "linear" },
      { time: 12, bpm: 140, numerator: 4, denominator: 4, shape: "square" },
    ],
  }));

test("TEMPO 行とテンポの線が食い違えば、テンポの線を使う", () => {
  const source = `<REAPER_PROJECT 0.1 7.0 0
  TEMPO 75 4 4 0
  <TEMPOENVEX
    PT 0 128 1 524291 0 1
  >
>
`;
  expect(readSong(source)).toMatchObject({
    tempo: { bpm: 128, numerator: 3, denominator: 8 },
    tempoMap: [{ time: 0, bpm: 128, numerator: 3, denominator: 8, shape: "square" }],
  });
});
