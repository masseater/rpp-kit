import { parseRpp } from "./parse.ts";
import { outlineSong } from "./song.ts";
import type { Song } from "./types.ts";

const readSong = (source: string): Song => {
  const result = parseRpp(source);
  if (result.status === "error") {
    throw new Error(result.error.message);
  }
  return outlineSong(result.root).song;
};

export { readSong };
