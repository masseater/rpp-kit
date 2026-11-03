import { Array as Arr, Function as Fn, Option, pipe } from "effect";

import { parseRpp } from "./parse.ts";
import { outlineSong } from "./song.ts";
import type { Song, Track } from "./types.ts";

type Named = Readonly<{ name: string }>;

type Tracked<Tracks extends readonly Track[]> = Readonly<{ tracks: Tracks }>;

type FirstNamed<List, Name> = List extends readonly [
  infer Head extends Named,
  ...infer Rest extends readonly Named[],
]
  ? Name extends Head["name"]
    ? Head
    : FirstNamed<Rest, Name>
  : List extends readonly (infer Element)[]
    ? Element | undefined
    : undefined;

type AllNamed<List extends readonly Named[], Name> = readonly Extract<
  List[number],
  Readonly<{ name: Name }>
>[];

const readSong = (source: string): Song => {
  const result = parseRpp(source);
  if (result.status === "error") {
    throw new Error(result.error.message);
  }
  return outlineSong(result.root).song;
};

const firstTrack = (song: Tracked<readonly Track[]>, name: string): Track | undefined =>
  pipe(
    song.tracks,
    Arr.findFirst((track) => track.name === name),
    Option.getOrUndefined,
  );

const allTracks = (song: Tracked<readonly Track[]>, name: string): readonly Track[] =>
  pipe(
    song.tracks,
    Arr.filter((track) => track.name === name),
  );

const ARITY = 2;

const trackNamed: {
  <const Tracks extends readonly Track[], const Name extends Tracks[number]["name"]>(
    name: Name,
  ): (song: Tracked<Tracks>) => FirstNamed<Tracks, Name>;
  <const Tracks extends readonly Track[], const Name extends Tracks[number]["name"]>(
    song: Tracked<Tracks>,
    name: Name,
  ): FirstNamed<Tracks, Name>;
} = Fn.dual(ARITY, firstTrack);

const tracksNamed: {
  <const Tracks extends readonly Track[], const Name extends Tracks[number]["name"]>(
    name: Name,
  ): (song: Tracked<Tracks>) => AllNamed<Tracks, Name>;
  <const Tracks extends readonly Track[], const Name extends Tracks[number]["name"]>(
    song: Tracked<Tracks>,
    name: Name,
  ): AllNamed<Tracks, Name>;
} = Fn.dual(ARITY, allTracks);

export { readSong, trackNamed, tracksNamed };
export type { AllNamed, FirstNamed, Named, Tracked };
