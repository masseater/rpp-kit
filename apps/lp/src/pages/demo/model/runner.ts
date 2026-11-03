import { Effect, Schema } from "effect";
import type { Scope } from "effect";

import { playground } from "./content";
import { LineSchema } from "./output";
import type { Line } from "./output";

type Script = Readonly<{ code: string; song: string }>;

const Lines = Schema.Array(LineSchema);

const TIMEOUT = "3 seconds";

const HARNESS = `"use strict";
const __lines = [];
const __format = (value) => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.name + ": " + value.message;
  try {
    const json = JSON.stringify(value, null, 2);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
};
const __record = (kind) => (...values) => {
  __lines.push({ kind, text: values.map(__format).join(" ") });
};
console.log = __record("log");
console.info = __record("log");
console.debug = __record("log");
console.warn = __record("warn");
console.error = __record("error");
`;

const scriptOf = ({ code, song }: Script): string =>
  `${HARNESS}const __song = ${song};
const __require = (specifier) => {
  if (specifier === "./intro.rpp") return { song: __song, default: __song };
  throw new Error("Cannot find module '" + specifier + "'");
};
try {
  (function (exports, require, module) {
${code}
  })({}, __require, { exports: {} });
} catch (error) {
  console.error(error);
}
postMessage(__lines);
`;

const errorLine = (text: string): readonly Line[] => [{ kind: "error", text }];

const sandbox = (script: string): Effect.Effect<Worker, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => URL.createObjectURL(new Blob([script], { type: "text/javascript" }))),
    (url) =>
      Effect.sync(() => {
        URL.revokeObjectURL(url);
      }),
  ).pipe(
    Effect.flatMap((url) =>
      Effect.acquireRelease(
        Effect.sync(() => new Worker(url)),
        (thread) =>
          Effect.sync(() => {
            thread.terminate();
          }),
      ),
    ),
  );

const outcome = (thread: Worker): Effect.Effect<readonly Line[]> =>
  Effect.callback<unknown>((resume) => {
    thread.addEventListener("message", (event) => {
      resume(Effect.succeed(event.data));
    });
    thread.addEventListener("error", (event) => {
      event.preventDefault();
      resume(Effect.succeed(errorLine(event.message)));
    });
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Lines)),
    Effect.orElseSucceed(() => errorLine(playground.output.broken)),
  );

const runScript = (script: Script): Effect.Effect<readonly Line[]> =>
  Effect.scoped(
    sandbox(scriptOf(script)).pipe(
      Effect.flatMap(outcome),
      Effect.timeoutOrElse({
        duration: TIMEOUT,
        orElse: () => Effect.succeed(errorLine(playground.output.timeout)),
      }),
    ),
  );

export { runScript };
