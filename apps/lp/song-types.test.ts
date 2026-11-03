import { Array as Arr, Match, Option, String as Str, pipe } from "effect";
import ts from "typescript-6";
import { describe, expect, it } from "vite-plus/test";

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

const errorsOf = (body: string): readonly string[] =>
  pipe(
    serviceOf(`${HEADER}${body}`).getSemanticDiagnostics(PROBE),
    Arr.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
  );

const completionsOf = (body: string): readonly string[] => {
  const code = `${HEADER}${pipe(body, Str.replace(CURSOR, ""))}`;
  const cursor = HEADER.length + Option.getOrElse(Str.indexOf(CURSOR)(body), () => body.length);
  return pipe(
    Option.fromNullishOr(serviceOf(code).getCompletionsAtPosition(PROBE, cursor, {})),
    Option.map(({ entries }) =>
      pipe(
        entries,
        Arr.map(({ name }) => name),
      ),
    ),
    Option.getOrElse(() => []),
  );
};

describe("import した .rpp の tracks の型", () => {
  it("trackNamed の名前の候補に、トラックの名前が全部出る", () => {
    expect(completionsOf('trackNamed(song, "|");\n')).toStrictEqual(
      expect.arrayContaining([...TRACK_NAMES]),
    );
  });

  it("存在する名前なら型のエラーにならず、無い名前はエラーになる", () => {
    expect({
      known: errorsOf('trackNamed(song, "Drums   (BB)");\ntracksNamed(song, "Midi GM");\n'),
      unknown: errorsOf('trackNamed(song, "Drums");\n'),
    }).toStrictEqual({ known: [], unknown: [expect.stringContaining('"Drums"')] });
  });

  it("並びの番号でトラックを取ると、名前がその文字列のリテラルの型になる", () => {
    expect(
      errorsOf(
        'const midi: "Midi GM" = song.tracks[0].name;\nconst drums: { readonly index: 2 } = trackNamed(song, "Drums   (BB)");\n',
      ),
    ).toStrictEqual([]);
  });
});
