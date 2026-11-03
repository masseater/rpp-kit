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

type TempoPoint = Readonly<{
  time: number;
  bpm: number;
  numerator: number;
  denominator: number;
  shape: "square" | "linear";
}>;

type Song = Readonly<{
  tempo: Tempo;
  tempoMap: readonly TempoPoint[];
  sampleRate: number;
  length: number;
  markers: Readonly<Record<string, Marker>>;
  sections: readonly Section[];
  tracks: Readonly<Record<string, Track>>;
  trackOrder: readonly string[];
}>;

export type { Item, Marker, Note, Section, Song, Source, Tempo, TempoPoint, Track };
