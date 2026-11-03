import { Array as Arr, Match, Option, String as Str, pipe } from "effect";
import { markerNamed, markersNamed, trackNamed } from "rpp-kit";
import ts from "typescript-6";
import { beforeAll, describe, expect, expectTypeOf, it } from "vite-plus/test";

import { song } from "./src/pages/demo/model/song";

const MARKER_NAMES = ["Gm9", "Cm9", "Bb2", "Gm7", "Ebm9", "Ebm11", "Fm9"] as const;

const MARKER_COUNT = 25;

const CM9_TIME = 16;

const DIRECTORY = new URL("src/pages/demo/model/", import.meta.url).pathname;

const PROBE = `${DIRECTORY}song-types.probe.ts`;

const HEADER =
  'import { markerNamed, markersNamed, trackNamed, tracksNamed } from "rpp-kit";\nimport { song } from "./song";\n';

const CURSOR = "|";

const OPTIONS: ts.CompilerOptions = {
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
};

const TRACK_NAMES = [
  "Midi GM",
  "Bass    (BB)",
  "Drums   (BB)",
  "Piano   (BB)",
  "Strings (BB)",
  "Melody  (BB)",
] as const;

const readOf =
  (code: string) =>
  (file: string): string | undefined =>
    Match.value(file).pipe(
      Match.when(PROBE, () => code),
      Match.orElse(() => ts.sys.readFile(file)),
    );

const serviceOf = (code: string): ts.LanguageService => {
  const read = readOf(code);
  return ts.createLanguageService(
    {
      getScriptFileNames: () => [PROBE],
      getScriptVersion: () => "1",
      getScriptSnapshot: (file) =>
        pipe(
          Option.fromNullishOr(read(file)),
          Option.map((text) => ts.ScriptSnapshot.fromString(text)),
          Option.getOrUndefined,
        ),
      getCurrentDirectory: () => DIRECTORY,
      getCompilationSettings: () => OPTIONS,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (file) => file === PROBE || ts.sys.fileExists(file),
      readFile: read,
      directoryExists: (directory) => ts.sys.directoryExists(directory),
      getDirectories: (directory) => ts.sys.getDirectories(directory),
    },
    ts.createDocumentRegistry(),
  );
};

const PROBE_LINES = {
  known:
    'trackNamed(song, "Drums   (BB)");\ntracksNamed(song, "Midi GM");\nmarkerNamed(song, "Cm9");\nmarkersNamed(song, "Gm9");\n',
  unknownTrack: 'trackNamed(song, "Drums");\n',
  unknownMarker: 'markerNamed(song, "Gm8");\n',
  trackCompletion: 'trackNamed(song, "|");\n',
  markerCompletion: 'markerNamed(song, "|");\n',
} as const;

type Section = keyof typeof PROBE_LINES;

type Report = Readonly<{
  errors: Readonly<Record<Section, readonly string[]>>;
  completions: Readonly<Record<Section, readonly string[]>>;
}>;

const SECTIONS: readonly Section[] = [
  "known",
  "unknownTrack",
  "unknownMarker",
  "trackCompletion",
  "markerCompletion",
];

const NO_POSITION = -1;

const HERE = 0;

const NEXT = 1;

const lengthOf = (section: Section): number =>
  pipe(PROBE_LINES[section], Str.replace(CURSOR, "")).length;

const bySection = (
  read: (section: Section) => readonly string[],
): Readonly<Record<Section, readonly string[]>> => ({
  known: read("known"),
  unknownTrack: read("unknownTrack"),
  unknownMarker: read("unknownMarker"),
  trackCompletion: read("trackCompletion"),
  markerCompletion: read("markerCompletion"),
});

const reportOf = (): Report => {
  const code = pipe(
    SECTIONS,
    Arr.map((section) => pipe(PROBE_LINES[section], Str.replace(CURSOR, ""))),
    Arr.join(""),
    (body) => `${HEADER}${body}`,
  );
  const starts = Arr.scan(SECTIONS, HEADER.length, (start, section) => start + lengthOf(section));
  const startOf = (section: Section, offset: number): Option.Option<number> =>
    pipe(
      Arr.findFirstIndex(SECTIONS, (found) => found === section),
      Option.flatMap((index) => Arr.get(starts, index + offset)),
    );
  const service = serviceOf(code);
  const diagnostics = service.getSemanticDiagnostics(PROBE);
  const errorsIn = (section: Section): readonly string[] =>
    pipe(
      diagnostics,
      Arr.filter(({ start = NO_POSITION }) =>
        Option.match(Option.all([startOf(section, HERE), startOf(section, NEXT)]), {
          onNone: () => false,
          onSome: ([from, to]) => start >= from && start < to,
        }),
      ),
      Arr.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
    );
  const completionsIn = (section: Section): readonly string[] =>
    pipe(
      Option.all([startOf(section, HERE), Str.indexOf(CURSOR)(PROBE_LINES[section])]),
      Option.flatMap(([start, cursor]) =>
        Option.fromNullishOr(service.getCompletionsAtPosition(PROBE, start + cursor, {})),
      ),
      Option.map(({ entries }) =>
        pipe(
          entries,
          Arr.map(({ name }) => name),
        ),
      ),
      Option.getOrElse(() => []),
    );
  return { errors: bySection(errorsIn), completions: bySection(completionsIn) };
};

const cache: Report[] = [];

const report = (): Report =>
  Option.getOrElse(Arr.head(cache), () => {
    const made = reportOf();
    cache.push(made);
    return made;
  });

describe("import した .rpp の名前で引く関数の型", () => {
  beforeAll(() => {
    report();
  });

  it("候補に、トラックの名前が全部出る", () => {
    expect(report().completions.trackCompletion).toStrictEqual(
      expect.arrayContaining([...TRACK_NAMES]),
    );
  });

  it("候補に、マーカーの名前が全部出る", () => {
    expect(report().completions.markerCompletion).toStrictEqual(
      expect.arrayContaining([...MARKER_NAMES]),
    );
  });

  it("存在する名前なら型のエラーにならず、無い名前はエラーになる", () => {
    expect({
      known: report().errors.known,
      unknownTrack: report().errors.unknownTrack,
      unknownMarker: report().errors.unknownMarker,
    }).toStrictEqual({
      known: [],
      unknownTrack: [expect.stringContaining('"Drums"')],
      unknownMarker: [expect.stringContaining('"Gm8"')],
    });
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
