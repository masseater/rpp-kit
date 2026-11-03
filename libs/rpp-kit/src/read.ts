import { Array as Arr, Function as Fn, Option, pipe } from "effect";

import { parseRpp } from "./parse.ts";
import { outlineSong } from "./song.ts";
import type { Marker, Song, Track } from "./types.ts";

type Named = Readonly<{ name: string }>;

type Tracked<Tracks extends readonly Track[]> = Readonly<{ tracks: Tracks }>;

type Marked<Markers extends readonly Marker[]> = Readonly<{ markers: Markers }>;

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

const firstNamed = <Element extends Named>(
  list: readonly Element[],
  name: string,
): Element | undefined =>
  pipe(
    list,
    Arr.findFirst((element) => element.name === name),
    Option.getOrUndefined,
  );

const allNamed = <Element extends Named>(
  list: readonly Element[],
  name: string,
): readonly Element[] =>
  pipe(
    list,
    Arr.filter((element) => element.name === name),
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
} = Fn.dual(ARITY, (song: Tracked<readonly Track[]>, name: string) =>
  firstNamed(song.tracks, name),
);

const tracksNamed: {
  <const Tracks extends readonly Track[], const Name extends Tracks[number]["name"]>(
    name: Name,
  ): (song: Tracked<Tracks>) => AllNamed<Tracks, Name>;
  <const Tracks extends readonly Track[], const Name extends Tracks[number]["name"]>(
    song: Tracked<Tracks>,
    name: Name,
  ): AllNamed<Tracks, Name>;
} = Fn.dual(ARITY, (song: Tracked<readonly Track[]>, name: string) => allNamed(song.tracks, name));

const markerNamed: {
  <const Markers extends readonly Marker[], const Name extends Markers[number]["name"]>(
    name: Name,
  ): (song: Marked<Markers>) => FirstNamed<Markers, Name>;
  <const Markers extends readonly Marker[], const Name extends Markers[number]["name"]>(
    song: Marked<Markers>,
    name: Name,
  ): FirstNamed<Markers, Name>;
} = Fn.dual(ARITY, (song: Marked<readonly Marker[]>, name: string) =>
  firstNamed(song.markers, name),
);

const markersNamed: {
  <const Markers extends readonly Marker[], const Name extends Markers[number]["name"]>(
    name: Name,
  ): (song: Marked<Markers>) => AllNamed<Markers, Name>;
  <const Markers extends readonly Marker[], const Name extends Markers[number]["name"]>(
    song: Marked<Markers>,
    name: Name,
  ): AllNamed<Markers, Name>;
} = Fn.dual(ARITY, (song: Marked<readonly Marker[]>, name: string) => allNamed(song.markers, name));

export { markerNamed, markersNamed, readSong, trackNamed, tracksNamed };
export type { AllNamed, FirstNamed, Marked, Named, Tracked };
