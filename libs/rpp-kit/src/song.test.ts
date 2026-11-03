import { Array as Arr, Match, pipe, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import type { SongOutline } from "./outline.ts";
import { parseRpp } from "./parse.ts";
import { markerNamed, markersNamed, readSong, trackNamed, tracksNamed } from "./read.ts";
import { fromSong, songOf } from "./song.fixture.ts";
import { outlineSong } from "./song.ts";
import { renderSegments, segmentsOf } from "./virtual.ts";
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

const outlineOf = (source: string): SongOutline => {
  const parsed = parseRpp(source);
  if (parsed.status === "error") {
    throw new Error(parsed.error.message);
  }
  return outlineSong(parsed.root);
};

const outline = (): SongOutline => outlineOf(SMALL_RPP);

const sourceOf = ({ start, end }: Readonly<{ start: number; end: number }>): string =>
  pipe(SMALL_RPP, Str.slice(start, end));

const render = (segments: readonly Segment[]): string =>
  renderSegments({ content: SMALL_RPP, segments });

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
  expect(code).toContain(
    'readonly markers: readonly [\n    Marker & { readonly name: "Intro"; readonly time: 0.000000 },\n    Marker & { readonly name: "Big Chorus"; readonly time: 4.000000 },\n  ];',
  );
  expect(code).toContain(
    'readonly tracks: readonly [\n    Track & { readonly index: 0; readonly name: "Keys" },\n    Track & { readonly index: 1; readonly name: "Vocal" },\n  ];',
  );
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
  const song = readSong(SMALL_RPP);
  expect(markerNamed(song, "Big Chorus")).toStrictEqual({ id: 2, name: "Big Chorus", time: 4 });
  expect(song).toMatchObject({
    sections: [
      { name: "Intro", start: 0, end: 4 },
      { name: "Big Chorus", start: 4, end: 8 },
    ],
    length: 8,
  });
});

test("MIDI のノートを秒に直し、項目の位置を足す", () => {
  expect(trackNamed(readSong(SMALL_RPP), "Keys")).toMatchObject({
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
  });
});

test("音声の項目は素材のファイル名を持ち、トラックは並び順の番号と GUID を持つ", () => {
  expect(readSong(SMALL_RPP).tracks).toMatchObject([
    { index: 0, guid: "{00000000-0000-0000-0000-000000000010}", name: "Keys" },
    {
      index: 1,
      guid: "{00000000-0000-0000-0000-000000000011}",
      name: "Vocal",
      items: [{ source: { kind: "audio", file: "vocal take.wav" } }],
    },
  ]);
});

test("閉じていないチャンクは、開いた位置をエラーにする", () => {
  expect(parseRpp("<REAPER_PROJECT\n  <TRACK\n    NAME Keys\n>\n")).toMatchObject({
    status: "error",
    error: { start: 0 },
  });
});

test("同じ名前のマーカーも全部残り、時刻の順に並び、名前で最初のものと全部を引ける", () => {
  const source =
    "<REAPER_PROJECT 0.1 7.0 0\n  TEMPO 120 4 4\n  MARKER 3 4 Am7 0\n  MARKER 1 0 Am7 0\n  MARKER 2 2 G7 0\n>\n";
  const song = readSong(source);
  expect({
    first: markerNamed(song, "Am7"),
    all: pipe(song, markersNamed("Am7")),
  }).toStrictEqual({
    first: { id: 1, name: "Am7", time: 0 },
    all: [
      { id: 1, name: "Am7", time: 0 },
      { id: 3, name: "Am7", time: 4 },
    ],
  });
  expect(song).toMatchObject({
    markers: [
      { id: 1, time: 0 },
      { id: 2, time: 2 },
      { id: 3, time: 4 },
    ],
    sections: [
      { name: "Am7", start: 0, end: 2 },
      { name: "G7", start: 2, end: 4 },
      { name: "Am7", start: 4, end: 4 },
    ],
  });
});

test("リージョンは始まりと終わりの行を id で組にし、マーカーには入れず、区間はリージョンにする", () =>
  expect(songOf("case.rpp")).resolves.toMatchObject({
    regions: [
      { id: 1, name: "Intro", start: 0, end: 4 },
      { id: 2, name: "Verse", start: 4, end: 8 },
    ],
    markers: [{ id: 3, name: "Drop", time: 10 }],
    sections: [
      { name: "Intro", start: 0, end: 4 },
      { name: "Verse", start: 4, end: 8 },
    ],
  }));

test("名前の無いマーカーは、前の区間を切るが、マーカーにも区間にも出さない", () => {
  const source =
    '<REAPER_PROJECT 0.1 7.0 0\n  MARKER 1 0 Am 0\n  MARKER 2 2 "" 0\n  MARKER 3 4 Em 0\n>\n';
  expect(readSong(source)).toStrictEqual(
    expect.objectContaining({
      markers: [
        { id: 1, name: "Am", time: 0 },
        { id: 3, name: "Em", time: 4 },
      ],
      sections: [
        { name: "Am", start: 0, end: 2 },
        { name: "Em", start: 4, end: 4 },
      ],
    }),
  );
});

const MEDIA_RPP = `<REAPER_PROJECT 0.1 7.0 0
  <TRACK
    NAME Media
    <ITEM
      POSITION 0
      LENGTH 4
      <SOURCE VIDEO
        FILE "clip.mp4"
      >
    >
    <ITEM
      POSITION 4
      LENGTH 4
      <SOURCE VIDEO
        FILE "cover.png"
      >
    >
    <ITEM
      POSITION 8
      LENGTH 2
      <SOURCE SECTION
        LENGTH 2
        STARTPOS 1
        <SOURCE WAVE
          FILE "loop.wav"
        >
      >
    >
  >
>
`;

test("動画と画像の SOURCE VIDEO は video にし、SECTION は中の SOURCE を読む", () => {
  expect(trackNamed(readSong(MEDIA_RPP), "Media")).toMatchObject({
    items: [
      { source: { kind: "video", file: "clip.mp4" } },
      { source: { kind: "video", file: "cover.png" } },
      { source: { kind: "audio", file: "loop.wav" } },
    ],
  });
});

test("SECTION の中の素材のファイルも、有無を確かめる対象にする", () => {
  expect(
    pipe(
      outlineOf(MEDIA_RPP).files,
      Arr.map(({ text }) => text),
    ),
  ).toStrictEqual(["clip.mp4", "cover.png", "loop.wav"]);
});

test("リージョンだけの曲では、区間はリージョンを開始の順に並べ、名前の無いものは出さない", () => {
  const source = `<REAPER_PROJECT 0.1 7.0 0
  MARKER 2 8 Chorus 1
  MARKER 2 16 "" 1
  MARKER 1 0 Verse 1
  MARKER 1 8 "" 1
  MARKER 3 16 "" 1
  MARKER 3 20 "" 1
>
`;
  expect(readSong(source).sections).toStrictEqual([
    { name: "Verse", start: 0, end: 8 },
    { name: "Chorus", start: 8, end: 16 },
  ]);
});

test("同じ名前のトラックも全部残り、名前で全部を並び順に引ける", () =>
  expect(
    fromSong({ name: "case.rpp", read: (song) => tracksNamed(song, "Deck") }),
  ).resolves.toMatchObject([
    { index: 0, guid: "{E0DD263E-4330-4D03-A36C-4D092D024364}", name: "Deck" },
    { index: 1, guid: "{3BC109D1-C88F-4745-80B6-DABE2C87CA39}", name: "Deck" },
  ]));

test("名前で引くと最初のトラックを返し、pipe からも使える", () =>
  expect(
    fromSong({ name: "case.rpp", read: (song) => pipe(song, trackNamed("")) }),
  ).resolves.toMatchObject({
    index: 2,
    items: [{ name: "loop" }],
  }));

test("無い名前で引くと何も返さない", () => {
  expect(trackNamed(readSong(SMALL_RPP), "Bass")).toBeUndefined();
});
