import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { innermost, readItem } from "./item.ts";
import { named, sectionsOf, timelineOf } from "./markers.ts";
import type { Timeline } from "./markers.ts";
import { PARAM_INDEX, ZERO, chunksOf, numberOr, paramOf, textOf } from "./nodes.ts";
import type { SongOutline, TrackOutline } from "./outline.ts";
import type { Chunk, Param } from "./parse.ts";
import { tempoMapOf } from "./tempo.ts";
import type { TempoMap } from "./tempo.ts";

type Placed = Readonly<{ chunk: Chunk; tempo: TempoMap }>;

const DEFAULT_SAMPLE_RATE = 44_100;

const firstParam = (chunk: Chunk, token: string): Option.Option<Param> =>
  paramOf({ chunk, token, index: PARAM_INDEX.first });

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
    Arr.map((chunk, index) => {
      const name = firstParam(chunk, "NAME");
      const items = pipe(
        chunksOf({ chunk, token: "ITEM" }),
        Arr.map((item) => readItem({ item, tempo })),
      );
      const guid = pipe(
        Arr.get(chunk.params, PARAM_INDEX.first),
        Option.orElse(() => firstParam(chunk, "TRACKID")),
      );
      return { track: { index, guid: textOf(guid), name: textOf(name), items }, name };
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
  const tracks = tracksOf({ chunk: root, tempo: tempoMap });
  const length = lengthOf(timeline, tracks);
  const markers = pipe(
    timeline.markers,
    Arr.filter(named),
    Arr.dedupeWith((left, right) => left.marker.name === right.marker.name),
  );
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
    sections: sectionsOf({ timeline, length }),
    tracks: pipe(
      tracks,
      Arr.map(({ track }) => track),
    ),
  };
  return { song, tempo, markers, tracks, files: filesOf(root) };
};

export { outlineSong };
