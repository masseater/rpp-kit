import { flatMap, promise, runPromise } from "effect/Effect";
import { runContentMapper } from "ts-content-mapper";

runContentMapper({
  diagnosticSource: "rpp",
  transform: ({ fileName, content }, { positionEncoding }) =>
    runPromise(
      promise(() => import("./transform.ts")).pipe(
        flatMap(({ transform }) =>
          promise(() => transform({ fileName, content, positionEncoding })),
        ),
      ),
    ),
});
