import { Array as Arr, Match, Option, Record as Rec, pipe } from "effect";

import { named, sectionsOf, timelineOf } from "./markers.ts";
import type { Timeline } from "./markers.ts";
import { midiNotes } from "./midi.ts";
import { PARAM_INDEX, ZERO, chunksOf, numberOr, paramOf, textOf } from "./nodes.ts";
import type { SongOutline, TrackOutline } from "./outline.ts";
import type { Chunk, Param } from "./parse.ts";
import { tempoMapOf } from "./tempo.ts";
import type { TempoMap } from "./tempo.ts";
import type { Item, Note, Source } from "./types.ts";

type Placed = Readonly<{ chunk: Chunk; tempo: TempoMap }>;

const DEFAULT_SAMPLE_RATE = 44_100;

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

const innermost = (source: Chunk): Chunk =>
  Option.match(Arr.head(chunksOf({ chunk: source, token: "SOURCE" })), {
    onNone: () => source,
    onSome: innermost,
  });

const fileSource = (source: Chunk, type: string): Source =>
  Option.match(firstParam(source, "FILE"), {
    onNone: () => ({ kind: "other", type }),
    onSome: ({ text: file }) =>
      Match.value(type).pipe(
        Match.when("VIDEO", (): Source => ({ kind: "video", file })),
        Match.orElse((): Source => ({ kind: "audio", file })),
      ),
  });

const sourceOf = (outer: Chunk, position: number, tempo: TempoMap): Source => {
  const source = innermost(outer);
  return Match.value(textOf(Arr.get(source.params, PARAM_INDEX.first))).pipe(
    Match.when("MIDI", (): Source => ({
      kind: "midi",
      notes: placedNotes(source, position, tempo),
    })),
    Match.orElse((type) => fileSource(source, type)),
  );
};

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
    Arr.flatMap((source) => Arr.fromOption(firstParam(innermost(source), "FILE"))),
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

const lengthOf = ({ markers, regions }: Timeline, tracks: readonly TrackOutline[]): number => {
  const itemEnds = pipe(
    tracks,
    Arr.flatMap(({ track }) => track.items),
    Arr.map((item) => item.position + item.length),
  );
  const markerTimes = pipe(
    markers,
    Arr.map(({ marker }) => marker.time),
  );
  const regionEnds = pipe(
    regions,
    Arr.map(({ end }) => end),
  );
  return Math.max(ZERO, ...itemEnds, ...markerTimes, ...regionEnds);
};

const outlineSong = (root: Chunk): SongOutline => {
  const tempoMap = tempoMapOf(root);
  const tempo = tempoMap.outline;
  const timeline = timelineOf(root);
  const allTracks = tracksOf({ chunk: root, tempo: tempoMap });
  const length = lengthOf(timeline, allTracks);
  const markers = pipe(
    timeline.markers,
    Arr.filter(named),
    Arr.dedupeWith((left, right) => left.marker.name === right.marker.name),
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
    regions: timeline.regions,
    sections: sectionsOf({ markers: timeline.markers, length }),
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
