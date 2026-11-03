import { expect, test } from "vite-plus/test";

import { readSong } from "./read.ts";
import { mismatchesOf, songOf } from "./song.fixture.ts";

test("テンポの線の段差となめらかな変化をまたいで、MIDI のノートを秒に直す", () =>
  expect(mismatchesOf({ rpp: "case_b.rpp", truth: "truth_b.json" })).resolves.toStrictEqual([]));

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
