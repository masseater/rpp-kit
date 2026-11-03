import { Array as Arr, Match, Option, Order, Record as Rec, pipe } from "effect";

import { midiNotes } from "./midi.ts";
import { PARAM_INDEX, ZERO, chunksOf, linesOf, numberOr, paramOf, textOf } from "./nodes.ts";
import type { MarkerOutline, SongOutline, TrackOutline } from "./outline.ts";
import type { Chunk, Param } from "./parse.ts";
import { tempoMapOf } from "./tempo.ts";
import type { TempoMap } from "./tempo.ts";
import type { Item, Marker, Note, Section, Source } from "./types.ts";

type Placed = Readonly<{ chunk: Chunk; tempo: TempoMap }>;

const DEFAULT_SAMPLE_RATE = 44_100;

const NEXT = 1;

const NO_SOURCE: Source = { kind: "other", type: "" };

const firstParam = (chunk: Chunk, token: string): Option.Option<Param> =>
  paramOf({ chunk, token, index: PARAM_INDEX.first });

const placedNotes = (source: Chunk, position: number, tempo: TempoMap): readonly Note[] => {
  const base = tempo.beatAt(position);
  return pipe(
    midiNotes(source),
    Arr.map(({ pitch, velocity, start, end }) => {
      const startTime = tempo.secondsAt(base + start);
      return {
        pitch,
        velocity,
        start: startTime,
        duration: tempo.secondsAt(base + end) - startTime,
      };
    }),
  );
};

const sourceOf = (source: Chunk, position: number, tempo: TempoMap): Source =>
  Match.value(textOf(Arr.get(source.params, PARAM_INDEX.first))).pipe(
    Match.when("MIDI", (): Source => ({
      kind: "midi",
      notes: placedNotes(source, position, tempo),
    })),
    Match.orElse((type): Source =>
      Option.match(firstParam(source, "FILE"), {
        onNone: () => ({ kind: "other", type }),
        onSome: (file) => ({ kind: "audio", file: file.text }),
      }),
    ),
  );

const readItem = ({ chunk, tempo }: Placed): Item => {
  const position = numberOr(ZERO)(firstParam(chunk, "POSITION"));
  return {
    name: textOf(firstParam(chunk, "NAME")),
    position,
    length: numberOr(ZERO)(firstParam(chunk, "LENGTH")),
    source: Option.match(Arr.head(chunksOf({ chunk, token: "SOURCE" })), {
      onNone: () => NO_SOURCE,
      onSome: (source) => sourceOf(source, position, tempo),
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

const tracksOf = ({ chunk: root, tempo }: Placed): readonly TrackOutline[] =>
  pipe(
    chunksOf({ chunk: root, token: "TRACK" }),
    Arr.map((chunk) => {
      const name = firstParam(chunk, "NAME");
      const items = pipe(
        chunksOf({ chunk, token: "ITEM" }),
        Arr.map((item) => readItem({ chunk: item, tempo })),
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

const outlineSong = (root: Chunk): SongOutline => {
  const tempoMap = tempoMapOf(root);
  const tempo = tempoMap.outline;
  const allMarkers = markersOf(root);
  const allTracks = tracksOf({ chunk: root, tempo: tempoMap });
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
    tempoMap: tempoMap.points,
    sampleRate: numberOr(DEFAULT_SAMPLE_RATE)(firstParam(root, "SAMPLERATE")),
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
