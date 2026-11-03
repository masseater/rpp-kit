import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

import { mapRpp } from "./map.ts";
import { transform } from "./transform.ts";

const SOURCE = `<REAPER_PROJECT 0.1 7.0 0
  TEMPO 96 4 4
  MARKER 1 0 Intro 0
  MARKER 2 8 "Big Chorus" 0
  <TRACK
    NAME Keys
  >
>
`;

const mapperOutput = Effect.promise(() =>
  transform({ fileName: "/song.rpp", content: SOURCE, positionEncoding: "utf-16" }),
).pipe(Effect.map(({ text }) => ({ status: "ok", code: text })));

test("素材の無い .rpp では、content mapper と同じ TypeScript を返す", () =>
  expect(Effect.runPromise(mapperOutput)).resolves.toStrictEqual(mapRpp(SOURCE)));

test("読めない .rpp は、エラーの位置を返す", () => {
  expect(mapRpp("<REAPER_PROJECT\n  <TRACK\n>\n")).toMatchObject({
    status: "error",
    error: { start: 0 },
  });
});
