import type { Option } from "effect";

import type { Param } from "./parse.ts";

type Note = Readonly<{ pitch: number; velocity: number; start: number; duration: number }>;

type Source =
  | Readonly<{ kind: "midi"; notes: readonly Note[] }>
  | Readonly<{ kind: "audio"; file: string }>
  | Readonly<{ kind: "other"; type: string }>;

type Item = Readonly<{ name: string; position: number; length: number; source: Source }>;

type Track = Readonly<{ name: string; items: readonly Item[] }>;

type Marker = Readonly<{ id: number; name: string; time: number }>;

type Section = Readonly<{ name: string; start: number; end: number }>;

type Tempo = Readonly<{ bpm: number; numerator: number; denominator: number }>;

type Song = Readonly<{
  tempo: Tempo;
  sampleRate: number;
  length: number;
  markers: Readonly<Record<string, Marker>>;
  sections: readonly Section[];
  tracks: Readonly<Record<string, Track>>;
  trackOrder: readonly string[];
}>;

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

export type {
  Item,
  Marker,
  MarkerOutline,
  Note,
  Section,
  Song,
  SongOutline,
  Source,
  Spanned,
  Tempo,
  Track,
  TrackOutline,
};
