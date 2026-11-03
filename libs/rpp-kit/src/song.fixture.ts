import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, ManagedRuntime } from "effect";

import { readSong } from "./read.ts";
import type { Song } from "./types.ts";

const runtime = ManagedRuntime.make(NodeServices.layer);

const readFixture = Effect.fn("readFixture")(function* readFixture(name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.readFileString(new URL(`fixtures/${name}`, import.meta.url).pathname);
});

const fixtureText = (name: string): Promise<string> => runtime.runPromise(readFixture(name));

const songOf = (name: string): Promise<Song> =>
  runtime.runPromise(Effect.map(readFixture(name), readSong));

export { fixtureText, songOf };
