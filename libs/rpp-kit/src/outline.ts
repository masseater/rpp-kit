import type { Option } from "effect";

import type { Param } from "./parse.ts";
import type { Marker, Song, Track } from "./types.ts";

type Spanned = Readonly<{ value: number; param: Option.Option<Param> }>;

type MarkerOutline = Readonly<{
  marker: Marker;
  name: Option.Option<Param>;
  time: Option.Option<Param>;
}>;

type TrackOutline = Readonly<{ track: Track; name: Option.Option<Param> }>;

type SongOutline = Readonly<{
  song: Song;
  tempo: Readonly<{ bpm: Spanned; numerator: Spanned; denominator: Spanned }>;
  markers: readonly MarkerOutline[];
  tracks: readonly TrackOutline[];
  files: readonly Param[];
}>;

export type { MarkerOutline, SongOutline, Spanned, TrackOutline };
