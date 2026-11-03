import { createSystem, createVirtualTypeScriptEnvironment } from "@typescript/vfs";
import { createWorker } from "@valtown/codemirror-ts/worker";
import { expose } from "comlink";
import { Array as Arr, Record as Rec, String as Str, pipe } from "effect";
import ts from "typescript-6";

const LIBS = import.meta.glob<string>("/node_modules/typescript-6/lib/lib.{es,decorators}*.d.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const SONG_TYPES = import.meta.glob<string>("/node_modules/rpp-kit/src/types.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const DIRECTORY = /^.*\//u;

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2024,
  lib: ["es2024"],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
};

const fileMap = (): Map<string, string> =>
  new Map([
    ...pipe(
      Rec.toEntries(LIBS),
      Arr.map(([file, text]): [string, string] => [pipe(file, Str.replace(DIRECTORY, "/")), text]),
    ),
    ...pipe(
      Rec.values(SONG_TYPES),
      Arr.map((text): [string, string] => ["/node_modules/rpp-kit/index.d.ts", text]),
    ),
  ]);

expose(
  createWorker(() => createVirtualTypeScriptEnvironment(createSystem(fileMap()), [], ts, OPTIONS)),
);
