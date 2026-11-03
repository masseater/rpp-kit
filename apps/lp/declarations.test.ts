import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { mapRpp } from "rpp-kit";
import { declarationPath } from "rpp-kit/vite";
import { describe, expect, it } from "vite-plus/test";

const SOURCES = import.meta.glob<string>("./src/**/*.rpp", {
  query: "?raw",
  import: "default",
  eager: true,
});

const DECLARATIONS = import.meta.glob<string>("./src/**/*.d.rpp.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

describe(".d.rpp.ts", () => {
  it.each(
    pipe(
      Rec.toEntries(SOURCES),
      Arr.map(([path, content]) => ({ path, content })),
    ),
  )("$path の型が content mapper の出力と同じ", ({ path, content }) => {
    expect(mapRpp(content)).toStrictEqual({
      status: "ok",
      code: Rec.get(DECLARATIONS, declarationPath(path)).pipe(Option.getOrElse(() => "")),
    });
  });
});
