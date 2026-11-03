import { Array as Arr, Match, Option, pipe } from "effect";

import type { Track } from "./types.ts";

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

type Lookup<Result> = (song: Tracked<readonly Track[]>, name: string) => Result;

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

const dualLookup =
  <Result>(lookup: Lookup<Result>) =>
  (subject: Tracked<readonly Track[]> | string, name: string): unknown =>
    Match.value(subject).pipe(
      Match.when(Match.string, (only) => (song: Tracked<readonly Track[]>) => lookup(song, only)),
      Match.orElse((song) => lookup(song, name)),
    );

const firstTrack = dualLookup((song, name) => firstNamed(song.tracks, name));

const allTracks = dualLookup((song, name) => allNamed(song.tracks, name));

function trackNamed<
  const Tracks extends readonly Track[],
  const Name extends Tracks[number]["name"],
>(name: Name): (song: Tracked<Tracks>) => FirstNamed<Tracks, Name>;
function trackNamed<
  const Tracks extends readonly Track[],
  const Name extends Tracks[number]["name"],
>(song: Tracked<Tracks>, name: Name): FirstNamed<Tracks, Name>;
function trackNamed(subject: Tracked<readonly Track[]> | string, name = ""): unknown {
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
function tracksNamed(subject: Tracked<readonly Track[]> | string, name = ""): unknown {
  return allTracks(subject, name);
}

export { trackNamed, tracksNamed };
export type { AllNamed, FirstNamed, Named, Tracked };
