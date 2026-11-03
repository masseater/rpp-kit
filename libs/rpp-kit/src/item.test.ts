import { Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { readSong } from "./read.ts";
import { mismatchesOf, songOf } from "./song.fixture.ts";

const TRACK_NAMES = ["DeckA", "DeckB", "LoopT", "TakeT"] as const;

const TRACK_NAME = /^ {4}NAME .*$/u;

const renameTracks = (rpp: string): string => {
  const lines = Str.split(rpp, "\n");
  const tracks = pipe(
    lines,
    Arr.map((line, index) => ({ line, index })),
    Arr.filter(({ line }) => TRACK_NAME.test(line)),
    Arr.map(({ index }) => index),
  );
  return pipe(
    lines,
    Arr.map((line, index) =>
      pipe(
        Arr.findFirstIndex(tracks, (track) => track === index),
        Arr.fromOption,
        Arr.flatMap((track) => Arr.fromOption(Arr.get(TRACK_NAMES, track))),
        Arr.match({ onEmpty: () => line, onNonEmpty: ([name]) => `    NAME ${name}` }),
      ),
    ),
    Arr.join("\n"),
  );
};

test("選ばれたテイクのソースを、トリム・再生速度・ループ・開始位置のずれに合わせて鳴らす", () =>
  expect(
    mismatchesOf({ rpp: "case.rpp", truth: "truth.json", edit: renameTracks }),
  ).resolves.toStrictEqual([]));

test("アイテムの名前は選ばれたテイクの名前にする", () =>
  expect(songOf("case.rpp")).resolves.toMatchObject({
    tracks: { Deck: { items: [{ name: "trim" }] } },
  }));

test("SOFFS に拍の数が無ければ、秒をテンポの線で拍に直す", () => {
  const source = `<REAPER_PROJECT 0.1 7.0 0
  TEMPO 120 4 4
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
  expect(readSong(source).tracks).toMatchObject({
    Keys: {
      items: [{ source: { kind: "midi", notes: [{ pitch: 62, start: 0, duration: 0.25 }] } }],
    },
  });
});
