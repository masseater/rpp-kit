import { Array as Arr, Match, pipe, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { parseRpp } from "./parse.ts";
import { readSong } from "./read.ts";
import { outlineSong } from "./song.ts";
import type { SongOutline } from "./types.ts";
import { segmentsOf } from "./virtual.ts";
import type { Segment } from "./virtual.ts";

const SMALL_RPP = `
<REAPER_PROJECT 0.1 7.0 0
  TEMPO 120 3 4
  SAMPLERATE 44100 0 0
  MARKER 1 0.000000 Intro 0 0 1 B {00000000-0000-0000-0000-000000000001}
  MARKER 2 4.000000 "Big Chorus" 0 0 1 B {00000000-0000-0000-0000-000000000002}
  <TRACK {00000000-0000-0000-0000-000000000010}
    NAME Keys
    <ITEM
      POSITION 1
      LENGTH 2
      NAME Keys
      <SOURCE MIDI
        HASDATA 1 960 QN
        E 0 90 3c 64
        E 960 80 3c 00
        E 0 90 40 50
        E 480 80 40 00
      >
    >
  >
  <TRACK {00000000-0000-0000-0000-000000000011}
    NAME Vocal
    <ITEM
      POSITION 2
      LENGTH 6
      <SOURCE WAVE
        FILE "vocal take.wav"
      >
    >
  >
>
`;

const outline = (): SongOutline => {
  const parsed = parseRpp(SMALL_RPP);
  if (parsed.status === "error") {
    throw new Error(parsed.error.message);
  }
  return outlineSong(parsed.root);
};

const sourceOf = ({ start, end }: Readonly<{ start: number; end: number }>): string =>
  pipe(SMALL_RPP, Str.slice(start, end));

const render = (segments: readonly Segment[]): string =>
  pipe(
    segments,
    Arr.map((segment) =>
      Match.value(segment).pipe(
        Match.discriminatorsExhaustive("kind")({
          text: ({ text }) => text,
          verbatim: sourceOf,
          alias: ({ text }) => text,
          atom: ({ text }) => text,
        }),
      ),
    ),
    Arr.join(""),
  );

const atomsOf = (segments: readonly Segment[]): readonly string[] =>
  pipe(
    segments,
    Arr.flatMap((segment) =>
      Match.value(segment).pipe(
        Match.when({ kind: "atom" }, (atom) => [sourceOf(atom)]),
        Match.orElse(() => []),
      ),
    ),
  );

test("テンポとマーカー名を、.rpp の文字に対応づけたリテラル型にする", () => {
  const code = render(segmentsOf({ outline: outline(), missing: [] }));
  expect(code).toContain("readonly bpm: 120; readonly numerator: 3; readonly denominator: 4");
  expect(code).toContain('readonly "Intro": Marker & { readonly time: 0.000000 }');
  expect(code).toContain('readonly trackOrder: readonly ["Keys", "Vocal"]');
});

test("無い素材のファイルごとに、そのパラメーターへ対応づけた assetExists の呼び出しを置く", () => {
  const { files } = outline();
  const segments = segmentsOf({ outline: outline(), missing: files });
  expect(atomsOf(segments)).toStrictEqual(["vocal take.wav"]);
  expect(render(segments)).toContain('assetExists("vocal take.wav");');
});

test("素材がそろっていれば assetExists を呼ばない", () => {
  const segments = segmentsOf({ outline: outline(), missing: [] });
  expect(atomsOf(segments)).toStrictEqual([]);
});

test("テンポと拍子とサンプルレートを読む", () => {
  expect(readSong(SMALL_RPP)).toMatchObject({
    tempo: { bpm: 120, numerator: 3, denominator: 4 },
    sampleRate: 44_100,
  });
});

test("マーカーを名前で引け、区間は次のマーカーか曲の終わりまで続く", () => {
  expect(readSong(SMALL_RPP)).toMatchObject({
    markers: { "Big Chorus": { id: 2, name: "Big Chorus", time: 4 } },
    sections: [
      { name: "Intro", start: 0, end: 4 },
      { name: "Big Chorus", start: 4, end: 8 },
    ],
    length: 8,
  });
});

test("MIDI のノートを秒に直し、項目の位置を足す", () => {
  expect(readSong(SMALL_RPP).tracks).toMatchObject({
    Keys: {
      items: [
        {
          source: {
            kind: "midi",
            notes: [
              { pitch: 60, velocity: 100, start: 1, duration: 0.5 },
              { pitch: 64, velocity: 80, start: 1.5, duration: 0.25 },
            ],
          },
        },
      ],
    },
  });
});

test("音声の項目は素材のファイル名を持ち、トラックは並び順を保つ", () => {
  expect(readSong(SMALL_RPP)).toMatchObject({
    tracks: { Vocal: { items: [{ source: { kind: "audio", file: "vocal take.wav" } }] } },
    trackOrder: ["Keys", "Vocal"],
  });
});

test("閉じていないチャンクは、開いた位置をエラーにする", () => {
  expect(parseRpp("<REAPER_PROJECT\n  <TRACK\n    NAME Keys\n>\n")).toMatchObject({
    status: "error",
    error: { start: 0 },
  });
});
