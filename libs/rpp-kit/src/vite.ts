import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, ManagedRuntime, Match, String as Str, pipe } from "effect";
import type { Plugin } from "vite-plus";

import { mapRpp } from "./map.ts";
import { readSong } from "./read.ts";

type Source = Readonly<{ id: string; content: string }>;

const RPP_EXTENSION = /\.rpp$/iu;

const DECLARATION_EXTENSION = ".d.rpp.ts";

const declarationPath = (id: string): string =>
  pipe(id, Str.replace(RPP_EXTENSION, DECLARATION_EXTENSION));

const writeIfChanged = Effect.fn("writeIfChanged")(function* writeIfChanged(
  path: string,
  code: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const current = yield* fileSystem.readFileString(path).pipe(Effect.orElseSucceed(() => ""));
  if (current !== code) {
    yield* fileSystem.writeFileString(path, code).pipe(Effect.orDie);
  }
});

const writeDeclaration = ({
  id,
  content,
}: Source): Effect.Effect<void, never, FileSystem.FileSystem> =>
  Match.value(mapRpp(content)).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ code }) => writeIfChanged(declarationPath(id), code),
      error: () => Effect.void,
    }),
  );

const moduleOf = (content: string): string =>
  `export const song = ${JSON.stringify(readSong(content))};\nexport default song;\n`;

const loadRpp = Effect.fn("loadRpp")(function* loadRpp(source: Source) {
  yield* writeDeclaration(source);
  return { code: moduleOf(source.content) };
});

const runtime = ManagedRuntime.make(NodeServices.layer);

const transformRpp = (content: string, id: string): Promise<Readonly<{ code: string }>> =>
  runtime.runPromise(loadRpp({ id, content }));

const rpp = (): Plugin => ({
  name: "rpp-kit",
  transform: { filter: { id: RPP_EXTENSION }, handler: transformRpp },
  configureVitest: ({ defineCacheKeyGenerator }) => {
    defineCacheKeyGenerator(({ id }) =>
      Match.value(id).pipe(
        Match.when(
          (path) => RPP_EXTENSION.test(path),
          (): false => false,
        ),
        Match.orElse(() => ""),
      ),
    );
  },
});

export { declarationPath, rpp };
