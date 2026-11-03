import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { PARAM_INDEX, ZERO, linesOf, numberOr, textOf } from "./nodes.ts";
import type { MarkerOutline } from "./outline.ts";
import type { Chunk, Line } from "./parse.ts";
import type { Marker, Region, Section } from "./types.ts";

type Timeline = Readonly<{ markers: readonly MarkerOutline[]; regions: readonly Region[] }>;

const REGION_FLAG = 2;

const PAIR = 2;

const NEXT = 1;

const isRegion = (line: Line): boolean =>
  numberOr(ZERO)(Arr.get(line.params, PARAM_INDEX.fourth)) % REGION_FLAG !== ZERO;

const outlineOf = (line: Line): MarkerOutline => {
  const name = Arr.get(line.params, PARAM_INDEX.third);
  const time = Arr.get(line.params, PARAM_INDEX.second);
  const id = numberOr(ZERO)(Arr.get(line.params, PARAM_INDEX.first));
  return { marker: { id, name: textOf(name), time: numberOr(ZERO)(time) }, name, time };
};

const byTime = Order.mapInput(Order.Number, (marker: Marker) => marker.time);

const regionOf = ([first, ...rest]: readonly [MarkerOutline, ...MarkerOutline[]]): Region => ({
  id: first.marker.id,
  name: first.marker.name,
  start: first.marker.time,
  end: Option.match(Arr.head(rest), {
    onNone: () => first.marker.time,
    onSome: ({ marker }) => marker.time,
  }),
});

const regionsOf = (lines: readonly Line[]): readonly Region[] =>
  pipe(
    lines,
    Arr.map(outlineOf),
    Arr.groupBy(({ marker }) => String(marker.id)),
    Rec.values,
    Arr.flatMap((group) => Arr.chunksOf(group, PAIR)),
    Arr.map(regionOf),
    Arr.sortWith(({ start }) => start, Order.Number),
  );

const timelineOf = (root: Chunk): Timeline => {
  const lines = linesOf({ chunk: root, token: "MARKER" });
  return {
    markers: pipe(
      lines,
      Arr.filter((line) => !isRegion(line)),
      Arr.map(outlineOf),
    ),
    regions: pipe(lines, Arr.filter(isRegion), regionsOf),
  };
};

const named = ({ marker }: MarkerOutline): boolean => Str.isNonEmpty(marker.name);

type Sectioning = Readonly<{ timeline: Timeline; length: number }>;

const markerSections = (markers: readonly MarkerOutline[], length: number): readonly Section[] => {
  const ordered = Arr.sortWith(markers, ({ marker }) => marker, byTime);
  return pipe(
    ordered,
    Arr.map((outline, index) => ({
      outline,
      end: Option.match(Arr.get(ordered, index + NEXT), {
        onNone: () => length,
        onSome: (next) => next.marker.time,
      }),
    })),
    Arr.filter(({ outline }) => named(outline)),
    Arr.map(({ outline: { marker }, end }) => ({ name: marker.name, start: marker.time, end })),
  );
};

const sectionsOf = ({ timeline, length }: Sectioning): readonly Section[] =>
  Arr.match(timeline.regions, {
    onEmpty: () => markerSections(timeline.markers, length),
    onNonEmpty: (regions) =>
      pipe(
        regions,
        Arr.filter(({ name }) => Str.isNonEmpty(name)),
        Arr.map(({ name, start, end }) => ({ name, start, end })),
      ),
  });

export { named, sectionsOf, timelineOf };
export type { Sectioning, Timeline };
