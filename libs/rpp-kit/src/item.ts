import { Array as Arr, Match, Option, Order, pipe } from "effect";

import { midiNotes } from "./midi.ts";
import type { MidiClip } from "./midi.ts";
import { PARAM_INDEX, ZERO, chunksOf, numberOr, paramOf, textOf } from "./nodes.ts";
import type { Chunk, Line, Node, Param } from "./parse.ts";
import type { TempoMap } from "./tempo.ts";
import type { Item, Note, Source } from "./types.ts";

type Mark = Readonly<{ line: Line; index: number }>;

type Window = Readonly<{ base: number; length: number; offset: number; rate: number }>;

type Placement = Readonly<{ window: Window; loop: boolean; tempo: TempoMap }>;

const NO_SOURCE: Source = { kind: "other", type: "" };

const LOOP_ON = 1;

const NORMAL_RATE = 1;

const EPSILON = 1e-9;

const NEXT = 1;

const BEFORE_FIRST = -1;

const firstParam = (chunk: Chunk, token: string): Option.Option<Param> =>
  paramOf({ chunk, token, index: PARAM_INDEX.first });

const marksOf = (item: Chunk): readonly Mark[] =>
  pipe(
    item.children,
    Arr.map((node: Node, index) => ({ node, index })),
    Arr.flatMap(({ node, index }) =>
      Match.value(node).pipe(
        Match.when({ kind: "line", token: "TAKE" }, (line): readonly Mark[] => [{ line, index }]),
        Match.orElse((): readonly Mark[] => []),
      ),
    ),
  );

const takeChildren =
  (item: Chunk, starts: readonly number[]) =>
  (start: number, take: number): readonly Node[] => {
    const end = Option.getOrElse(Arr.get(starts, take + NEXT), () => item.children.length);
    return pipe(item.children, Arr.take(end), Arr.drop(start + NEXT));
  };

const isSelected = ({ line }: Mark): boolean =>
  pipe(
    line.params,
    Arr.some(({ text }) => text === "SEL"),
  );

const selectedTake = (item: Chunk): Chunk => {
  const marks = marksOf(item);
  const starts = pipe(
    marks,
    Arr.map(({ index }) => index),
    Arr.prepend(BEFORE_FIRST),
  );
  const takes = pipe(
    starts,
    Arr.map(takeChildren(item, starts)),
    Arr.map((children): Chunk => ({ ...item, children })),
  );
  return pipe(
    marks,
    Arr.findFirstIndex(isSelected),
    Option.flatMap((selected) => Arr.get(takes, selected + NEXT)),
    Option.orElse(() => Arr.head(takes)),
    Option.getOrElse(() => item),
  );
};

const loopsOf = ({ window, loop }: Placement, length: number): readonly number[] =>
  Match.value(loop && length > ZERO).pipe(
    Match.when(true, () =>
      Arr.range(
        Math.floor(window.offset / length),
        Math.ceil((window.offset + window.length) / length),
      ),
    ),
    Match.orElse(() => [ZERO]),
  );

const placedNotes = (clip: MidiClip, placement: Placement): readonly Note[] => {
  const { window, tempo } = placement;
  const secondsOf = (beat: number): number => tempo.secondsAt(window.base + beat / window.rate);
  return pipe(
    loopsOf(placement, clip.length),
    Arr.flatMap((loop) => {
      const shift = loop * clip.length - window.offset;
      return pipe(
        clip.notes,
        Arr.map((note) => ({
          note,
          start: note.start + shift,
          end: Math.min(note.end + shift, window.length),
        })),
      );
    }),
    Arr.filter(({ start }) => start > -EPSILON && start < window.length - EPSILON),
    Arr.map(({ note, start, end }) => ({
      pitch: note.pitch,
      velocity: note.velocity,
      start: secondsOf(start),
      duration: secondsOf(end) - secondsOf(start),
    })),
    Arr.sortWith(({ start }) => start, Order.Number),
  );
};

const innermost = (source: Chunk): Chunk =>
  Option.match(Arr.head(chunksOf({ chunk: source, token: "SOURCE" })), {
    onNone: () => source,
    onSome: innermost,
  });

const fileSource = (
  source: Chunk,
  type: string,
  kind: Extract<Source, { file: string }>["kind"],
): Source =>
  Option.match(firstParam(source, "FILE"), {
    onNone: () => ({ kind: "other", type }),
    onSome: ({ text: file }) => ({ kind, file }),
  });

const sourceOf = (outer: Chunk, placement: Placement): Source => {
  const source = innermost(outer);
  return Match.value(textOf(Arr.get(source.params, PARAM_INDEX.first))).pipe(
    Match.when("MIDI", (): Source => ({
      kind: "midi",
      notes: placedNotes(midiNotes(source), placement),
    })),
    Match.when("VIDEO", (type) => fileSource(source, type, "video")),
    Match.orElse((type) => fileSource(source, type, "audio")),
  );
};

type OffsetBase = Readonly<{ position: number; base: number; tempo: TempoMap }>;

const offsetOf = (take: Chunk, { position, base, tempo }: OffsetBase): number =>
  Option.match(paramOf({ chunk: take, token: "SOFFS", index: PARAM_INDEX.second }), {
    onSome: (quarters) => numberOr(ZERO)(Option.some(quarters)),
    onNone: () => tempo.beatAt(position + numberOr(ZERO)(firstParam(take, "SOFFS"))) - base,
  });

type ItemInput = Readonly<{ item: Chunk; tempo: TempoMap }>;

const readItem = ({ item, tempo }: ItemInput): Item => {
  const take = selectedTake(item);
  const position = numberOr(ZERO)(firstParam(item, "POSITION"));
  const length = numberOr(ZERO)(firstParam(item, "LENGTH"));
  const base = tempo.beatAt(position);
  const rate = numberOr(NORMAL_RATE)(firstParam(take, "PLAYRATE"));
  const placement: Placement = {
    window: {
      base,
      length: (tempo.beatAt(position + length) - base) * rate,
      offset: offsetOf(take, { position, base, tempo }),
      rate,
    },
    loop: numberOr(ZERO)(firstParam(item, "LOOP")) === LOOP_ON,
    tempo,
  };
  return {
    name: textOf(firstParam(take, "NAME")),
    position,
    length,
    source: Option.match(Arr.head(chunksOf({ chunk: take, token: "SOURCE" })), {
      onNone: () => NO_SOURCE,
      onSome: (source) => sourceOf(source, placement),
    }),
  };
};

export { innermost, readItem };
export type { ItemInput };
