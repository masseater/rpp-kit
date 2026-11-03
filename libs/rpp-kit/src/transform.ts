import { NodeServices } from "@effect/platform-node";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Match, Path, pipe } from "effect";
import { MappedCodeBuilder, stringIndexToPosition } from "ts-content-mapper";
import type { PositionEncoding, TransformResult } from "ts-content-mapper";

import { parseRpp } from "./parse.ts";
import type { Param, ParseError } from "./parse.ts";
import { outlineSong } from "./song.ts";
import { segmentsOf } from "./virtual.ts";
import type { Segment } from "./virtual.ts";

type Request = Readonly<{ fileName: string; content: string; positionEncoding: PositionEncoding }>;

const PARSE_ERROR = 1;

const NEVER_SONG = "declare const song: never;\nexport { song };\nexport default song;\n";

const parseFailure = (
  { content, positionEncoding }: Request,
  error: ParseError,
): TransformResult => {
  const start = stringIndexToPosition(content, error.start, positionEncoding);
  const end = stringIndexToPosition(content, error.end, positionEncoding);
  return {
    text: NEVER_SONG,
    extension: ".ts",
    diagnostics: [{ messageText: error.message, start, length: end - start, code: PARSE_ERROR }],
  };
};

const build = (
  { content, positionEncoding }: Request,
  segments: readonly Segment[],
): TransformResult => {
  const builder = new MappedCodeBuilder(content, { positionEncoding });
  for (const segment of segments) {
    Match.value(segment).pipe(
      Match.discriminatorsExhaustive("kind")({
        text: ({ text }) => builder.append(text),
        verbatim: ({ start, end }) => builder.appendVerbatim(start, end),
        alias: ({ text, start, end }) => builder.appendAlias(text, start, end),
        atom: ({ text, start, end }) => builder.appendAtom(text, start, end),
      }),
    );
  }
  return builder.build(".ts");
};

const missingFiles = Effect.fn("missingFiles")(function* missingFiles(
  fileName: string,
  files: readonly Param[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const base = path.dirname(fileName);
  return yield* pipe(
    files,
    Effect.filter((file) =>
      Effect.map(fileSystem.exists(path.resolve(base, file.text)), (exists) => !exists),
    ),
  );
});

const transformRpp = Effect.fn("transformRpp")(function* transformRpp(request: Request) {
  const parsed = parseRpp(request.content);
  if (parsed.status === "error") {
    return parseFailure(request, parsed.error);
  }
  const outline = outlineSong(parsed.root);
  const missing = yield* missingFiles(request.fileName, outline.files);
  return build(request, segmentsOf({ outline, missing: Arr.fromIterable(missing) }));
});

const runtime = ManagedRuntime.make(NodeServices.layer);

const transform = (request: Request): Promise<TransformResult> =>
  runtime.runPromise(transformRpp(request));

export { transform };
export type { Request };
