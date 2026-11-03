type Note = Readonly<{ pitch: number; velocity: number; start: number; duration: number }>;

type Source =
  | Readonly<{ kind: "midi"; notes: readonly Note[] }>
  | Readonly<{ kind: "audio"; file: string }>
  | Readonly<{ kind: "video"; file: string }>
  | Readonly<{ kind: "other"; type: string }>;

type Item = Readonly<{ name: string; position: number; length: number; source: Source }>;

type Track = Readonly<{ index: number; guid: string; name: string; items: readonly Item[] }>;

type Marker = Readonly<{ id: number; name: string; time: number }>;

type Region = Readonly<{ id: number; name: string; start: number; end: number }>;

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
  regions: readonly Region[];
  sections: readonly Section[];
  tracks: readonly Track[];
}>;

export type { Item, Marker, Note, Region, Section, Song, Source, Tempo, TempoPoint, Track };
