import { Array as Arr, Option, pipe } from "effect";

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

function trackNamed<
  const Tracks extends readonly Track[],
  const Name extends Tracks[number]["name"],
>(name: Name): (song: Tracked<Tracks>) => FirstNamed<Tracks, Name>;
function trackNamed<
  const Tracks extends readonly Track[],
  const Name extends Tracks[number]["name"],
>(song: Tracked<Tracks>, name: Name): FirstNamed<Tracks, Name>;
function trackNamed(
  subject: Tracked<readonly Track[]> | string,
  name = "",
): Named | undefined | ((song: Tracked<readonly Track[]>) => Named | undefined) {
  if (typeof subject === "string") {
    return (song) => firstTrack(song, subject);
  }
  return firstTrack(subject, name);
}

function tracksNamed<
  const Tracks extends readonly Track[],
  const Name extends Tracks[number]["name"],
>(name: Name): (song: Tracked<Tracks>) => AllNamed<Tracks, Name>;
function tracksNamed<
  const Tracks extends readonly Track[],
  const Name extends Tracks[number]["name"],
>(song: Tracked<Tracks>, name: Name): AllNamed<Tracks, Name>;
function tracksNamed(
  subject: Tracked<readonly Track[]> | string,
  name = "",
): readonly Track[] | ((song: Tracked<readonly Track[]>) => readonly Track[]) {
  if (typeof subject === "string") {
    return (song) => allTracks(song, subject);
  }
  return allTracks(subject, name);
}

export { readSong, trackNamed, tracksNamed };
export type { AllNamed, FirstNamed, Named, Tracked };
