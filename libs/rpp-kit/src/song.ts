import { Array as Arr, Match, Number as Num, Option, Order, pipe } from "effect";

import { innermost, readItem } from "./item.ts";
import { named, sectionsOf, timelineOf } from "./markers.ts";
import type { Timeline } from "./markers.ts";
import { PARAM_INDEX, ZERO, chunksOf, numberOr, paramOf, textOf } from "./nodes.ts";
import type { SongOutline, TrackOutline } from "./outline.ts";
import type { Chunk, Line, Node, Param } from "./parse.ts";
import { tempoMapOf } from "./tempo.ts";
import type { TempoMap } from "./tempo.ts";
import type { Fx, FxParam, FxState } from "./types.ts";

type Placed = Readonly<{ chunk: Chunk; tempo: TempoMap }>;

const DEFAULT_SAMPLE_RATE = 44_100;

const NEXT = 1;

const firstParam = (chunk: Chunk, token: string): Option.Option<Param> =>
  paramOf({ chunk, token, index: PARAM_INDEX.first });

const filesOf = (root: Chunk): readonly Param[] =>
  pipe(
    chunksOf({ chunk: root, token: "TRACK" }),
    Arr.flatMap((track) => chunksOf({ chunk: track, token: "ITEM" })),
    Arr.flatMap((item) => chunksOf({ chunk: item, token: "SOURCE" })),
    Arr.flatMap((source) => Arr.fromOption(firstParam(innermost(source), "FILE"))),
  );

const SLIDERS_BEFORE_GAP = 64;

const FIRST_SLIDER = 1;

const UNUSED = "-";

const ON = 1;

const isOn = (line: Option.Option<Line>, index: number): boolean =>
  pipe(
    line,
    Option.flatMap((found) => Arr.get(found.params, index)),
    (param) => numberOr(ZERO)(param) === ON,
  );

const sliderValues = (js: Chunk): readonly string[] =>
  pipe(
    js.children,
    Arr.findFirst((node: Node): node is Line => node.kind === "line"),
    Option.map((line) => [
      line.token,
      ...pipe(
        line.params,
        Arr.map(({ text }) => text),
      ),
    ]),
    Option.getOrElse(() => Arr.empty<string>()),
  );

const paramsOf = (js: Chunk): readonly FxParam[] =>
  pipe(
    sliderValues(js),
    Arr.filter((_text, index) => index !== SLIDERS_BEFORE_GAP),
    Arr.map((text, index) => ({ slider: index + FIRST_SLIDER, text })),
    Arr.filter(({ text }) => text !== UNUSED),
    Arr.map(({ slider, text }) => ({
      slider,
      value: Option.getOrElse(Num.parse(text), () => text),
    })),
  );

const isLine =
  (token: string) =>
  (node: Node): node is Line =>
    node.kind === "line" && node.token === token;

const stateOf = (chain: Chunk, index: number): FxState => {
  const bypass = pipe(Arr.take(chain.children, index), Arr.findLast(isLine("BYPASS")));
  const guid = pipe(
    Arr.drop(chain.children, index + NEXT),
    Arr.takeWhile((node) => !isLine("BYPASS")(node)),
    Arr.findFirst(isLine("FXID")),
    Option.flatMap((line) => Arr.head(line.params)),
    textOf,
  );
  return {
    guid,
    bypass: isOn(bypass, PARAM_INDEX.first),
    offline: isOn(bypass, PARAM_INDEX.second),
  };
};

const fxAt = (chain: Chunk, fx: Chunk, index: number): Fx => {
  const state = stateOf(chain, index);
  return Match.value(fx.token).pipe(
    Match.when("JS", (): Fx => ({
      ...state,
      kind: "js",
      file: textOf(Arr.head(fx.params)),
      params: paramsOf(fx),
    })),
    Match.orElse((type): Fx => ({ ...state, kind: "other", type })),
  );
};

const fxOf = (chain: Chunk): readonly Fx[] =>
  pipe(
    chain.children,
    Arr.map((node, index) => ({ node, index })),
    Arr.flatMap(({ node, index }) =>
      Match.value(node).pipe(
        Match.when(
          (found: Node): found is Chunk =>
            found.kind === "chunk" &&
            pipe(Arr.get(chain.children, index - NEXT), Option.exists(isLine("BYPASS"))),
          (fx): readonly Fx[] => [fxAt(chain, fx, index)],
        ),
        Match.orElse((): readonly Fx[] => []),
      ),
    ),
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
      const fx = pipe(
        Arr.head(chunksOf({ chunk, token: "FXCHAIN" })),
        Option.map(fxOf),
        Option.getOrElse(() => Arr.empty<Fx>()),
      );
      return { track: { index, guid: textOf(guid), name: textOf(name), items, fx }, name };
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
    Arr.sortWith(({ marker }) => marker.time, Order.Number),
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
      Arr.map(({ marker }) => marker),
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
