import { Array as Arr, Order, String as Str, pipe } from "effect";
import { markerNamed, markersNamed, trackNamed } from "rpp-kit";
import { createTwoslasher } from "twoslash";
import ts from "typescript-6";
import { beforeAll, describe, expect, expectTypeOf, it } from "vite-plus/test";

import { song } from "./src/pages/demo/model/song";

const TRACK_NAMES = [
  "Midi GM",
  "Bass    (BB)",
  "Drums   (BB)",
  "Piano   (BB)",
  "Strings (BB)",
  "Melody  (BB)",
] as const;

const MARKER_NAMES = ["Gm9", "Cm9", "Bb2", "Gm7", "Ebm9", "Ebm11", "Fm9"] as const;

const MARKER_COUNT = 25;

const CM9_TIME = 16;

const NOT_ASSIGNABLE = 2345;

const COMMENT = "//";

const twoslasher = createTwoslasher({
  tsModule: ts,
  tsLibDirectory: new URL("node_modules/typescript-6/lib", import.meta.url).pathname,
  vfsRoot: new URL("src/pages/demo/model", import.meta.url).pathname,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    allowArbitraryExtensions: true,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
});

const QUOTE = '"';

const completeAfter = (call: string): readonly string[] => [
  `${call}${QUOTE}${QUOTE});`,
  `${COMMENT}${pipe(" ", Str.repeat(call.length + QUOTE.length - COMMENT.length))}^|`,
];

const PROBE = [
  'import { markerNamed, markersNamed, trackNamed, tracksNamed } from "rpp-kit";',
  'import { song } from "./song";',
  'trackNamed(song, "Drums   (BB)");',
  'tracksNamed(song, "Midi GM");',
  'markerNamed(song, "Cm9");',
  'markersNamed(song, "Gm9");',
  'trackNamed(song, "Drums");',
  'markerNamed(song, "Gm8");',
  ...completeAfter("trackNamed(song, "),
  ...completeAfter("markerNamed(song, "),
];

type Probed = Readonly<{ errors: readonly string[]; completions: readonly (readonly string[])[] }>;

const cache: Probed[] = [];

const probe = (): Probed =>
  pipe(
    Arr.head(cache),
    Arr.fromOption,
    Arr.match({
      onNonEmpty: ([found]) => found,
      onEmpty: () => {
        const result = twoslasher(pipe(PROBE, Arr.join("\n")), "ts", {
          handbookOptions: { errors: [NOT_ASSIGNABLE] },
        });
        const made = {
          errors: pipe(
            result.errors,
            Arr.map(({ text }) => text),
          ),
          completions: pipe(
            result.completions,
            Arr.map(({ completions }) =>
              pipe(
                completions,
                Arr.map(({ name }) => name),
                Arr.sortWith((name) => name, Order.String),
              ),
            ),
          ),
        };
        cache.push(made);
        return made;
      },
    }),
  );

describe("import した .rpp の名前で引く関数の型", () => {
  beforeAll(() => {
    probe();
  });

  it("候補に、トラックとマーカーの名前が全部出る", () => {
    expect(probe().completions).toStrictEqual([
      pipe(
        TRACK_NAMES,
        Arr.sortWith((name) => name, Order.String),
      ),
      pipe(
        MARKER_NAMES,
        Arr.sortWith((name) => name, Order.String),
      ),
    ]);
  });

  it("存在する名前なら型のエラーにならず、無い名前はエラーになる", () => {
    expect(probe().errors).toStrictEqual([
      expect.stringContaining('"Drums"'),
      expect.stringContaining('"Gm8"'),
      expect.stringContaining('""'),
      expect.stringContaining('""'),
    ]);
  });
});

describe("import した .rpp の tracks と markers", () => {
  it("並びの番号や名前で取ると、名前と時刻がリテラルの型になる", () => {
    const [midi, , drums] = song.tracks;
    const [, cm9, gm9] = song.markers;
    expectTypeOf(midi.name).toEqualTypeOf<"Midi GM">();
    expectTypeOf(trackNamed(song, "Drums   (BB)")).toEqualTypeOf(drums);
    expectTypeOf(markerNamed(song, "Cm9").time).toEqualTypeOf<typeof CM9_TIME>();
    expectTypeOf(markerNamed(song, "Cm9")).toEqualTypeOf(cm9);
    expectTypeOf(gm9.name).toEqualTypeOf<"Gm9">();
  });

  it("マーカーは 25 個とも時刻の順に残り、同じ名前のものを全部引ける", () => {
    expect({
      count: song.markers.length,
      gm9: pipe(
        markersNamed(song, "Gm9"),
        Arr.map(({ time }) => ({ time })),
      ),
    }).toStrictEqual({
      count: MARKER_COUNT,
      gm9: [
        { time: 0 },
        { time: 24 },
        { time: 56 },
        { time: 72 },
        { time: 104 },
        { time: 120 },
        { time: 152 },
      ],
    });
  });
});
