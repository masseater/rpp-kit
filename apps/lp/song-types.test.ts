import { Array as Arr, Match, Option, String as Str, pipe } from "effect";
import { trackNamed } from "rpp-kit";
import ts from "typescript-6";
import { beforeAll, describe, expect, expectTypeOf, it } from "vite-plus/test";

import { song } from "./src/pages/demo/model/song";

const DIRECTORY = new URL("src/pages/demo/model/", import.meta.url).pathname;

const PROBE = `${DIRECTORY}song-types.probe.ts`;

const HEADER =
  'import { trackNamed, tracksNamed } from "rpp-kit";\nimport { song } from "./song";\n';

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
  known: 'trackNamed(song, "Drums   (BB)");\ntracksNamed(song, "Midi GM");\n',
  unknown: 'trackNamed(song, "Drums");\n',
  completion: 'trackNamed(song, "|");\n',
} as const;

type Section = keyof typeof PROBE_LINES;

type Report = Readonly<{
  errors: Readonly<Record<Section, readonly string[]>>;
  completions: readonly string[];
}>;

const SECTIONS: readonly Section[] = ["known", "unknown", "completion"];

const NO_POSITION = -1;

const NEXT = 1;

const reportOf = (): Report => {
  const body = pipe(
    SECTIONS,
    Arr.map((section) => PROBE_LINES[section]),
    Arr.join(""),
  );
  const code = `${HEADER}${pipe(body, Str.replace(CURSOR, ""))}`;
  const cursor = HEADER.length + Option.getOrElse(Str.indexOf(CURSOR)(body), () => body.length);
  const starts = Arr.scan(
    SECTIONS,
    HEADER.length,
    (start, section) => start + PROBE_LINES[section].length - Number(section === "completion"),
  );
  const service = serviceOf(code);
  const diagnostics = service.getSemanticDiagnostics(PROBE);
  const errorsIn = (section: Section): readonly string[] => {
    const index = Option.getOrElse(
      Arr.findFirstIndex(SECTIONS, (found) => found === section),
      () => NO_POSITION,
    );
    return pipe(
      diagnostics,
      Arr.filter(({ start = NO_POSITION }) =>
        Option.match(Option.all([Arr.get(starts, index), Arr.get(starts, index + NEXT)]), {
          onNone: () => false,
          onSome: ([from, to]) => start >= from && start < to,
        }),
      ),
      Arr.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
    );
  };
  return {
    errors: {
      known: errorsIn("known"),
      unknown: errorsIn("unknown"),
      completion: [],
    },
    completions: pipe(
      Option.fromNullishOr(service.getCompletionsAtPosition(PROBE, cursor, {})),
      Option.map(({ entries }) =>
        pipe(
          entries,
          Arr.map(({ name }) => name),
        ),
      ),
      Option.getOrElse(() => []),
    ),
  };
};

const cache: Report[] = [];

const report = (): Report =>
  Option.getOrElse(Arr.head(cache), () => {
    const made = reportOf();
    cache.push(made);
    return made;
  });

describe("import した .rpp の tracks の型", () => {
  beforeAll(() => {
    report();
  });

  it("trackNamed の名前の候補に、トラックの名前が全部出る", () => {
    expect(report().completions).toStrictEqual(expect.arrayContaining([...TRACK_NAMES]));
  });

  it("存在する名前なら型のエラーにならず、無い名前はエラーになる", () => {
    expect({ known: report().errors.known, unknown: report().errors.unknown }).toStrictEqual({
      known: [],
      unknown: [expect.stringContaining('"Drums"')],
    });
  });

  it("並びの番号でトラックを取ると、名前がその文字列のリテラルの型になる", () => {
    const [midi, , drums] = song.tracks;
    expectTypeOf(midi.name).toEqualTypeOf<"Midi GM">();
    expectTypeOf(trackNamed(song, "Drums   (BB)")).toEqualTypeOf(drums);
  });
});
