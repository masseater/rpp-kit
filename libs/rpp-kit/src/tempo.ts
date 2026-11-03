import { Array as Arr, Match, Option, pipe } from "effect";

import { PARAM_INDEX, ZERO, chunksOf, linesOf, numberOr, paramOf } from "./nodes.ts";
import type { Spanned, TempoOutline } from "./outline.ts";
import type { Chunk, Line } from "./parse.ts";
import type { TempoPoint } from "./types.ts";

type Meter = Readonly<{ numerator: number; denominator: number }>;

type Ramp = Readonly<{ time: number; bpm: number; slope: number; duration: number }>;

type Segment = Ramp & Readonly<{ beat: number }>;

type TempoMap = Readonly<{
  outline: TempoOutline;
  points: readonly TempoPoint[];
  beatAt: (seconds: number) => number;
  secondsAt: (beat: number) => number;
}>;

const DEFAULTS = { bpm: 120, numerator: 4, denominator: 4 } as const;

const SECONDS_PER_MINUTE = 60;

const METER_BASE = 0x1_00_00;

const LINEAR_SHAPE = 0;

const HALF = 2;

const NEXT = 1;

const PT_INDEX = { time: 0, bpm: 1, shape: 2, meter: 3 } as const;

const spannedOf = (root: Chunk, index: number, fallback: number): Spanned => {
  const param = paramOf({ chunk: root, token: "TEMPO", index });
  return { value: numberOr(fallback)(param), param };
};

const projectTempo = (root: Chunk): TempoOutline => ({
  bpm: spannedOf(root, PARAM_INDEX.first, DEFAULTS.bpm),
  numerator: spannedOf(root, PARAM_INDEX.second, DEFAULTS.numerator),
  denominator: spannedOf(root, PARAM_INDEX.third, DEFAULTS.denominator),
});

const meterOf = (line: Line, previous: Meter): Meter =>
  pipe(
    numberOr(ZERO)(Arr.get(line.params, PT_INDEX.meter)),
    Option.liftPredicate((packed: number) => packed > ZERO),
    Option.match({
      onNone: () => previous,
      onSome: (packed) => ({
        numerator: packed % METER_BASE,
        denominator: Math.floor(packed / METER_BASE),
      }),
    }),
  );

const shapeOf = (line: Line): TempoPoint["shape"] =>
  Match.value(numberOr(ZERO)(Arr.get(line.params, PT_INDEX.shape))).pipe(
    Match.when(LINEAR_SHAPE, () => "linear" as const),
    Match.orElse(() => "square" as const),
  );

type Envelope = Readonly<{ points: readonly TempoPoint[]; first: Option.Option<Spanned> }>;

const envelopeOf = (root: Chunk, project: TempoOutline): Envelope => {
  const lines = pipe(
    Arr.head(chunksOf({ chunk: root, token: "TEMPOENVEX" })),
    Option.map((envelope) => linesOf({ chunk: envelope, token: "PT" })),
    Option.getOrElse(() => Arr.empty<Line>()),
  );
  const meters = Arr.scan(
    lines,
    { numerator: project.numerator.value, denominator: project.denominator.value },
    (previous: Meter, line) => meterOf(line, previous),
  );
  const bpmOf = (line: Line): Spanned => {
    const param = Arr.get(line.params, PT_INDEX.bpm);
    return { value: numberOr(project.bpm.value)(param), param };
  };
  return {
    points: Arr.zipWith(lines, Arr.drop(meters, NEXT), (line, meter) => ({
      time: numberOr(ZERO)(Arr.get(line.params, PT_INDEX.time)),
      bpm: bpmOf(line).value,
      ...meter,
      shape: shapeOf(line),
    })),
    first: Option.map(Arr.head(lines), bpmOf),
  };
};

const beatsWithin = (ramp: Ramp, seconds: number): number =>
  (ramp.bpm * seconds + (ramp.slope * seconds * seconds) / HALF) / SECONDS_PER_MINUTE;

const secondsWithin = (ramp: Ramp, beats: number): number => {
  const scaled = beats * SECONDS_PER_MINUTE;
  return (HALF * scaled) / (ramp.bpm + Math.sqrt(ramp.bpm * ramp.bpm + HALF * ramp.slope * scaled));
};

const rampsOf = (points: readonly TempoPoint[]): readonly Ramp[] =>
  pipe(
    points,
    Arr.map((point, index) => {
      const next = Arr.get(points, index + NEXT);
      const duration = Option.match(next, {
        onNone: () => Number.POSITIVE_INFINITY,
        onSome: (found) => found.time - point.time,
      });
      const slope = pipe(
        next,
        Option.filter((found) => point.shape === "linear" && found.bpm !== point.bpm),
        Option.match({
          onNone: () => ZERO,
          onSome: (found) => (found.bpm - point.bpm) / duration,
        }),
      );
      return { time: point.time, bpm: point.bpm, slope, duration };
    }),
  );

const segmentsOf = (points: readonly TempoPoint[]): readonly Segment[] => {
  const ramps = rampsOf(points);
  const beats = Arr.scan(ramps, ZERO, (beat, ramp) => beat + beatsWithin(ramp, ramp.duration));
  return Arr.zipWith(ramps, beats, (ramp, beat) => ({ ...ramp, beat }));
};

const lastWhere = (segments: readonly Segment[], reached: (segment: Segment) => boolean): Segment =>
  pipe(
    segments,
    Arr.findLast(reached),
    Option.orElse(() => Arr.head(segments)),
    Option.getOrElse(() => ({
      time: ZERO,
      beat: ZERO,
      bpm: DEFAULTS.bpm,
      slope: ZERO,
      duration: ZERO,
    })),
  );

const tempoMapOf = (root: Chunk): TempoMap => {
  const project = projectTempo(root);
  const envelope = envelopeOf(root, project);
  const points = Arr.match(envelope.points, {
    onEmpty: (): readonly TempoPoint[] => [
      {
        time: ZERO,
        bpm: project.bpm.value,
        numerator: project.numerator.value,
        denominator: project.denominator.value,
        shape: "square",
      },
    ],
    onNonEmpty: (found) => found,
  });
  const segments = segmentsOf(points);
  const outline = Option.match(Option.all([envelope.first, Arr.head(points)]), {
    onNone: () => project,
    onSome: ([bpm, first]) => ({
      bpm,
      numerator: { value: first.numerator, param: Option.none() },
      denominator: { value: first.denominator, param: Option.none() },
    }),
  });
  return {
    outline,
    points,
    beatAt: (seconds) => {
      const segment = lastWhere(segments, ({ time }) => time <= seconds);
      return segment.beat + beatsWithin(segment, seconds - segment.time);
    },
    secondsAt: (beat) => {
      const segment = lastWhere(segments, (found) => found.beat <= beat);
      return segment.time + secondsWithin(segment, beat - segment.beat);
    },
  };
};

export { tempoMapOf };
export type { TempoMap };
