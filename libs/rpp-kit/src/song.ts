import { Array as Arr, Match, Option, Order, Record as Rec, pipe } from "effect";

import { midiNotes } from "./midi.ts";
import { PARAM_INDEX, ZERO, chunksOf, linesOf, numberOr, paramOf, textOf } from "./nodes.ts";
import type { Chunk, Param } from "./parse.ts";
import type {
  Item,
  Marker,
  MarkerOutline,
  Section,
  SongOutline,
  Source,
  Spanned,
  TrackOutline,
} from "./types.ts";

type Placed = Readonly<{ chunk: Chunk; secondsPerQuarter: number }>;

const DEFAULTS = { bpm: 120, numerator: 4, denominator: 4, sampleRate: 44_100 } as const;

const SECONDS_PER_MINUTE = 60;

const NEXT = 1;

const NO_SOURCE: Source = { kind: "other", type: "" };

const firstParam = (chunk: Chunk, token: string): Option.Option<Param> =>
  paramOf({ chunk, token, index: PARAM_INDEX.first });

const sourceOf = (source: Chunk, position: number, secondsPerQuarter: number): Source =>
  Match.value(textOf(Arr.get(source.params, PARAM_INDEX.first))).pipe(
    Match.when("MIDI", (): Source => ({
      kind: "midi",
      notes: midiNotes({ source, position, secondsPerQuarter }),
    })),
    Match.orElse((type): Source =>
      Option.match(firstParam(source, "FILE"), {
        onNone: () => ({ kind: "other", type }),
        onSome: (file) => ({ kind: "audio", file: file.text }),
      }),
    ),
  );

const readItem = ({ chunk, secondsPerQuarter }: Placed): Item => {
  const position = numberOr(ZERO)(firstParam(chunk, "POSITION"));
  return {
    name: textOf(firstParam(chunk, "NAME")),
    position,
    length: numberOr(ZERO)(firstParam(chunk, "LENGTH")),
    source: Option.match(Arr.head(chunksOf({ chunk, token: "SOURCE" })), {
      onNone: () => NO_SOURCE,
      onSome: (source) => sourceOf(source, position, secondsPerQuarter),
    }),
  };
};

const filesOf = (root: Chunk): readonly Param[] =>
  pipe(
    chunksOf({ chunk: root, token: "TRACK" }),
    Arr.flatMap((track) => chunksOf({ chunk: track, token: "ITEM" })),
    Arr.flatMap((item) => chunksOf({ chunk: item, token: "SOURCE" })),
    Arr.flatMap((source) => Arr.fromOption(firstParam(source, "FILE"))),
  );

const markersOf = (root: Chunk): readonly MarkerOutline[] =>
  pipe(
    linesOf({ chunk: root, token: "MARKER" }),
    Arr.map((line) => {
      const name = Arr.get(line.params, PARAM_INDEX.third);
      const time = Arr.get(line.params, PARAM_INDEX.second);
      const id = numberOr(ZERO)(Arr.get(line.params, PARAM_INDEX.first));
      return { marker: { id, name: textOf(name), time: numberOr(ZERO)(time) }, name, time };
    }),
  );

const tracksOf = ({ chunk: root, secondsPerQuarter }: Placed): readonly TrackOutline[] =>
  pipe(
    chunksOf({ chunk: root, token: "TRACK" }),
    Arr.map((chunk) => {
      const name = firstParam(chunk, "NAME");
      const items = pipe(
        chunksOf({ chunk, token: "ITEM" }),
        Arr.map((item) => readItem({ chunk: item, secondsPerQuarter })),
      );
      return { track: { name: textOf(name), items }, name };
    }),
  );

const byTime = Order.mapInput(Order.Number, (marker: Marker) => marker.time);

const sectionsOf = (markers: readonly MarkerOutline[], length: number): readonly Section[] => {
  const ordered = Arr.sortWith(markers, ({ marker }) => marker, byTime);
  return pipe(
    ordered,
    Arr.map(({ marker }, index) => ({
      name: marker.name,
      start: marker.time,
      end: Option.match(Arr.get(ordered, index + NEXT), {
        onNone: () => length,
        onSome: (next) => next.marker.time,
      }),
    })),
  );
};

const lengthOf = (markers: readonly MarkerOutline[], tracks: readonly TrackOutline[]): number => {
  const itemEnds = pipe(
    tracks,
    Arr.flatMap(({ track }) => track.items),
    Arr.map((item) => item.position + item.length),
  );
  const markerTimes = pipe(
    markers,
    Arr.map(({ marker }) => marker.time),
  );
  return Math.max(ZERO, ...itemEnds, ...markerTimes);
};

const tempoOf = (root: Chunk): SongOutline["tempo"] => {
  const spanned = (index: number, fallback: number): Spanned => {
    const param = paramOf({ chunk: root, token: "TEMPO", index });
    return { value: numberOr(fallback)(param), param };
  };
  return {
    bpm: spanned(PARAM_INDEX.first, DEFAULTS.bpm),
    numerator: spanned(PARAM_INDEX.second, DEFAULTS.numerator),
    denominator: spanned(PARAM_INDEX.third, DEFAULTS.denominator),
  };
};

const outlineSong = (root: Chunk): SongOutline => {
  const tempo = tempoOf(root);
  const allMarkers = markersOf(root);
  const allTracks = tracksOf({
    chunk: root,
    secondsPerQuarter: SECONDS_PER_MINUTE / tempo.bpm.value,
  });
  const length = lengthOf(allMarkers, allTracks);
  const markers = Arr.dedupeWith(
    allMarkers,
    (left, right) => left.marker.name === right.marker.name,
  );
  const tracks = Arr.dedupeWith(allTracks, (left, right) => left.track.name === right.track.name);
  const song = {
    tempo: {
      bpm: tempo.bpm.value,
      numerator: tempo.numerator.value,
      denominator: tempo.denominator.value,
    },
    sampleRate: numberOr(DEFAULTS.sampleRate)(firstParam(root, "SAMPLERATE")),
    length,
    markers: pipe(
      markers,
      Arr.map(({ marker }) => [marker.name, marker] as const),
      Rec.fromEntries,
    ),
    sections: sectionsOf(allMarkers, length),
    tracks: pipe(
      tracks,
      Arr.map(({ track }) => [track.name, track] as const),
      Rec.fromEntries,
    ),
    trackOrder: pipe(
      tracks,
      Arr.map(({ track }) => track.name),
    ),
  };
  return { song, tempo, markers, tracks, files: filesOf(root) };
};

export { outlineSong };
