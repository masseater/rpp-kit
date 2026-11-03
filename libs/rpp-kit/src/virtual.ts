import { Array as Arr, Match, Option, pipe } from "effect";

import type { Param } from "./parse.ts";
import type { SongOutline, Spanned } from "./types.ts";

type Segment =
  | Readonly<{ kind: "text"; text: string }>
  | Readonly<{ kind: "verbatim"; start: number; end: number }>
  | Readonly<{ kind: "alias"; text: string; start: number; end: number }>
  | Readonly<{ kind: "atom"; text: string; start: number; end: number }>;

type VirtualInput = Readonly<{ outline: SongOutline; missing: readonly Param[] }>;

const PLAIN_NAME = /^[^"\\\r\n]*$/u;

const NUMERIC = /^-?\d+(?:\.\d+)?$/u;

const QUOTE = '"';

const text = (value: string): Segment => ({ kind: "text", text: value });

const keyOf = (param: Option.Option<Param>, fallback: string): readonly Segment[] =>
  Option.match(param, {
    onNone: () => [text(JSON.stringify(fallback))],
    onSome: ({ text: name, start, end }) =>
      Match.value(PLAIN_NAME.test(name)).pipe(
        Match.when(true, (): readonly Segment[] => [
          text(QUOTE),
          { kind: "verbatim", start, end },
          text(QUOTE),
        ]),
        Match.orElse((): readonly Segment[] => [
          { kind: "alias", text: JSON.stringify(name), start, end },
        ]),
      ),
  });

const literalOf = ({ value, param }: Spanned): Segment =>
  pipe(
    param,
    Option.filter((found) => NUMERIC.test(found.text) && Number(found.text) === value),
    Option.match({
      onNone: () => text(String(value)),
      onSome: ({ start, end }): Segment => ({ kind: "verbatim", start, end }),
    }),
  );

const tempoSegments = ({ tempo }: SongOutline): readonly Segment[] => [
  text("  readonly tempo: { readonly bpm: "),
  literalOf(tempo.bpm),
  text("; readonly numerator: "),
  literalOf(tempo.numerator),
  text("; readonly denominator: "),
  literalOf(tempo.denominator),
  text(" };\n"),
];

const markerSegments = ({ markers }: SongOutline): readonly Segment[] =>
  pipe(
    markers,
    Arr.flatMap(({ marker, name, time }) => [
      text("    readonly "),
      ...keyOf(name, marker.name),
      text(": Marker & { readonly time: "),
      literalOf({ value: marker.time, param: time }),
      text(" };\n"),
    ]),
  );

const trackSegments = ({ tracks }: SongOutline): readonly Segment[] =>
  pipe(
    tracks,
    Arr.flatMap(({ track, name }) => [
      text("    readonly "),
      ...keyOf(name, track.name),
      text(": Track;\n"),
    ]),
  );

const missingSegments = (missing: readonly Param[]): readonly Segment[] =>
  pipe(
    missing,
    Arr.flatMap(({ text: file, start, end }): readonly Segment[] => [
      text("assetExists("),
      { kind: "atom", text: JSON.stringify(file), start, end },
      text(");\n"),
    ]),
  );

const trackOrderOf = ({ tracks }: SongOutline): string =>
  pipe(
    tracks,
    Arr.map(({ track }) => JSON.stringify(track.name)),
    Arr.join(", "),
  );

const segmentsOf = ({ outline, missing }: VirtualInput): readonly Segment[] => [
  text('import type { Marker, Section, Track } from "rpp-kit";\n'),
  text('declare function assetExists(file: "このパスに素材のファイルがありません"): void;\n'),
  text("declare const song: {\n"),
  ...tempoSegments(outline),
  text(
    `  readonly sampleRate: ${String(outline.song.sampleRate)};\n  readonly length: number;\n  readonly markers: {\n`,
  ),
  ...markerSegments(outline),
  text("  };\n  readonly sections: readonly Section[];\n  readonly tracks: {\n"),
  ...trackSegments(outline),
  text(
    `  };\n  readonly trackOrder: readonly [${trackOrderOf(outline)}];\n};\nexport { song };\nexport default song;\n`,
  ),
  ...missingSegments(missing),
];

export { segmentsOf };
export type { Segment, VirtualInput };
