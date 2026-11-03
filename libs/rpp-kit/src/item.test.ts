import { Array as Arr, Match, Number as Num, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { readSong } from "./read.ts";
import { mismatchesOf, songOf } from "./song.fixture.ts";

test("選ばれたテイクのソースを、トリム・再生速度・ループ・開始位置のずれに合わせて鳴らす", () =>
  expect(mismatchesOf({ rpp: "case.rpp", truth: "truth.json" })).resolves.toStrictEqual([]));

test("アイテムの名前は選ばれたテイクの名前にする", () =>
  expect(songOf("case.rpp")).resolves.toMatchObject({
    tracks: [
      { items: [{ name: "trim" }] },
      { items: [{ name: "rate2" }] },
      { items: [{ name: "loop" }] },
      { items: [{ name: "" }] },
    ],
  }));

test("SOFFS に拍の数が無ければ、秒をアイテムの位置のテンポで拍に直す", () => {
  const source = `<REAPER_PROJECT 0.1 7.0 0
  TEMPO 120 4 4
  <TEMPOENVEX
    PT 0 120 1
    PT 0.25 60 1
  >
  <TRACK
    NAME Keys
    <ITEM
      POSITION 0
      LENGTH 1
      LOOP 0
      SOFFS 0.5
      <SOURCE MIDI
        HASDATA 1 960 QN
        E 0 90 3c 64
        E 480 80 3c 00
        E 480 90 3e 64
        E 480 80 3e 00
      >
    >
  >
>
`;
  expect(readSong(source).tracks).toMatchObject([
    { items: [{ source: { kind: "midi", notes: [{ pitch: 62, start: 0, duration: 0.25 }] } }] },
  ]);
});

const RATE_RPP = `<REAPER_PROJECT 0.1 7.0 0
  TEMPO 120 4 4
  <TEMPOENVEX
    PT 0 120 1
    PT 4 90 1
  >
  <TRACK
    NAME Keys
    <ITEM
      POSITION 2
      LENGTH 3
      LOOP 1
      SOFFS 0 0
      PLAYRATE 2 1 0 -1 0 0.0025
      <SOURCE MIDI
        HASDATA 1 960 QN
        E 0 90 3c 64
        E 240 80 3c 00
        E 720 b0 7b 00
      >
    >
  >
>
`;

const DIGITS = 4;

test("PLAYRATE はテンポの変わり目をまたいでも、プロジェクトの拍に対してかける", () => {
  const starts = pipe(
    readSong(RATE_RPP).tracks,
    Arr.flatMap(({ items }) => items),
    Arr.flatMap(({ source }) =>
      Match.value(source).pipe(
        Match.when({ kind: "midi" }, (midi) => midi.notes),
        Match.orElse(() => []),
      ),
    ),
    Arr.map(({ start }) => ({ start: Num.round(start, DIGITS) })),
  );
  expect(starts).toStrictEqual([
    { start: 2 },
    { start: 2.25 },
    { start: 2.5 },
    { start: 2.75 },
    { start: 3 },
    { start: 3.25 },
    { start: 3.5 },
    { start: 3.75 },
    { start: 4 },
    { start: 4.3333 },
    { start: 4.6667 },
  ]);
});
