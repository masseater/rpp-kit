import { Array as Arr, Match, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { readSong } from "./read.ts";
import { fromSong } from "./song.fixture.ts";
import type { Fx, FxParam } from "./types.ts";

const FIRST = 0;

const SECOND = 1;

const THIRD = 2;

type Picked = readonly FxParam[];

const PERF: Picked = [
  { slider: 1, value: 1 },
  { slider: 2, value: -1 },
  { slider: 6, value: -51 },
  { slider: 22, value: -3602 },
  { slider: 64, value: -2 },
  { slider: 65, value: -2 },
  { slider: 83, value: -2 },
];

const SCRATCH: Picked = [
  { slider: 1, value: 101 },
  { slider: 2, value: "rs_load_a1.wav" },
  { slider: 22, value: 8 },
  { slider: 63, value: 120 },
  { slider: 64, value: 0.5003 },
  { slider: 65, value: "(empty).wav" },
  { slider: 83, value: 1 },
  { slider: 256, value: 0 },
];

const LIMITER: Picked = [{ slider: 2, value: -1.6 }];

const summaryOf =
  (picked: Picked) =>
  (fx: Fx): unknown =>
    Match.value(fx).pipe(
      Match.when({ kind: "js" }, ({ params, ...rest }) => ({
        ...rest,
        count: params.length,
        picked: pipe(
          params,
          Arr.filter(({ slider }) =>
            pipe(
              picked,
              Arr.some((wanted) => wanted.slider === slider),
            ),
          ),
        ),
      })),
      Match.orElse((other) => other),
    );

const fxAt = (index: number, picked: Picked): Promise<unknown> =>
  fromSong({
    name: "fx_case.rpp",
    read: ({ tracks }) =>
      pipe(
        tracks,
        Arr.flatMap(({ fx }) => fx),
        Arr.get(index),
        Option.map(summaryOf(picked)),
        Option.getOrNull,
      ),
  });

test("1 つ目の FX は reascratch_perf で、64 本目より後ろのスライダーも番号付きで読む", () =>
  expect(fxAt(FIRST, PERF)).resolves.toStrictEqual({
    kind: "js",
    file: "ReaScratch/reascratch_perf.jsfx",
    guid: "{00000000-0000-0000-0000-000000000000}",
    bypass: false,
    offline: false,
    count: 83,
    picked: PERF,
  }));

test("2 つ目の FX は bypass で、ファイルを選ぶスライダーはファイル名の文字列を持つ", () =>
  expect(fxAt(SECOND, SCRATCH)).resolves.toStrictEqual({
    kind: "js",
    file: "ReaScratch/reascratch.jsfx",
    guid: "{00000000-0000-0000-0000-000000000001}",
    bypass: true,
    offline: false,
    count: 131,
    picked: SCRATCH,
  }));

test("3 つ目の FX は offline で、引用符付きのファイル名を読む", () =>
  expect(fxAt(THIRD, LIMITER)).resolves.toStrictEqual({
    kind: "js",
    file: "Tukan/Turquoise Limiter S2 (Tukan)",
    guid: "{00000000-0000-0000-0000-000000000002}",
    bypass: false,
    offline: true,
    count: 8,
    picked: LIMITER,
  }));

test("使っていないスライダーと、64 本目の後ろの空の値は数えない", () =>
  expect(
    fromSong({
      name: "fx_case.rpp",
      read: ({ tracks }) =>
        pipe(
          tracks,
          Arr.flatMap(({ fx }) => fx),
          Arr.flatMap((fx) =>
            Match.value(fx).pipe(
              Match.when({ kind: "js" }, ({ params }) =>
                pipe(
                  params,
                  Arr.filter(({ value }) => value === "-" || value === ""),
                ),
              ),
              Match.orElse(() => []),
            ),
          ),
        ),
    }),
  ).resolves.toStrictEqual([]));

const CHAIN_RPP = `<REAPER_PROJECT 0.1 7.0 0
  <TRACK
    NAME Synth
    <FXCHAIN
      BYPASS 0 0 0
      <VST "VSTi: Synth" synth.dll 0 ""
        AAAA
      >
      FXID {00000000-0000-0000-0000-00000000000A}
      BYPASS 0 0 0
      <CLAP "CLAP: Delay" com.example.delay
      >
      FXID {00000000-0000-0000-0000-00000000000B}
      BYPASS 0 0 0
      <JS Utility/volume ""
        -6 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      >
      <JS_SER
        AAAA
      >
      <JS_PINMAP
        BBBB
      >
      FXID {00000000-0000-0000-0000-00000000000C}
      <COMMENT
        Y29tbWVudA==
      >
    >
  >
  <TRACK
    NAME Empty
  >
>
`;

test("JS 以外の FX は種類の名前だけを持ち、JS_SER などの付属のチャンクは FX に数えない", () => {
  expect(readSong(CHAIN_RPP).tracks).toMatchObject([
    {
      fx: [
        {
          kind: "other",
          type: "VST",
          guid: "{00000000-0000-0000-0000-00000000000A}",
          bypass: false,
          offline: false,
        },
        { kind: "other", type: "CLAP", guid: "{00000000-0000-0000-0000-00000000000B}" },
        {
          kind: "js",
          file: "Utility/volume",
          guid: "{00000000-0000-0000-0000-00000000000C}",
          params: [{ slider: 1, value: -6 }],
        },
      ],
    },
    { fx: [] },
  ]);
});
