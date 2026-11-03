import { Array as Arr, Match, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import { PARAM_INDEX, ZERO, numberOr, paramOf } from "./nodes.ts";
import type { Chunk, Line, Node, Param } from "./parse.ts";

type SourceNote = Readonly<{ pitch: number; velocity: number; start: number; end: number }>;

type MidiClip = Readonly<{ notes: readonly SourceNote[]; length: number }>;

type Pending = Readonly<{ start: number; velocity: number }>;

type Event = Readonly<{ ticks: number; kind: number; pitch: number; velocity: number }>;

type Timed = Readonly<{ event: Event; beat: number }>;

type MidiState = Readonly<{
  open: Readonly<Record<string, Pending>>;
  notes: readonly SourceNote[];
}>;

const DEFAULT_TICKS_PER_QUARTER = 960;

const HEX = 16;

const INITIAL_TOTAL = 1;

const NOTE_ON = 0x90;

const NOTE_OFF = 0x80;

const MIDI_EVENTS = new Set(["E", "e"]);

const byStart = Order.mapInput(Order.Number, (note: SourceNote) => note.start);

const hexAt =
  (index: number) =>
  (params: readonly Param[]): number =>
    pipe(
      Arr.get(params, index),
      Option.map((param) => Number.parseInt(param.text, HEX)),
      Option.filter((value) => !Number.isNaN(value)),
      Option.getOrElse(() => ZERO),
    );

const eventOf = (line: Line): Event => {
  const status = hexAt(PARAM_INDEX.second)(line.params);
  return {
    ticks: numberOr(ZERO)(Arr.get(line.params, PARAM_INDEX.first)),
    kind: status - (status % HEX),
    pitch: hexAt(PARAM_INDEX.third)(line.params),
    velocity: hexAt(PARAM_INDEX.fourth)(line.params),
  };
};

const release =
  ({ event, beat }: Timed) =>
  (state: MidiState): MidiState =>
    Option.match(Rec.get(state.open, String(event.pitch)), {
      onNone: () => state,
      onSome: (pending) => ({
        open: Rec.remove(state.open, String(event.pitch)),
        notes: Arr.append(state.notes, {
          pitch: event.pitch,
          velocity: pending.velocity,
          start: pending.start,
          end: beat,
        }),
      }),
    });

const apply =
  (timed: Timed) =>
  (state: MidiState): MidiState =>
    Match.value(timed.event).pipe(
      Match.when({ kind: NOTE_ON, velocity: Num.isGreaterThan(ZERO) }, (event) => ({
        ...state,
        open: Rec.set(state.open, String(event.pitch), {
          start: timed.beat,
          velocity: event.velocity,
        }),
      })),
      Match.when({ kind: (kind: number) => kind === NOTE_ON || kind === NOTE_OFF }, () =>
        release(timed)(state),
      ),
      Match.orElse(() => state),
    );

const timedEvents = (source: Chunk): readonly Timed[] => {
  const ticksPerQuarter = numberOr(DEFAULT_TICKS_PER_QUARTER)(
    paramOf({ chunk: source, token: "HASDATA", index: PARAM_INDEX.second }),
  );
  const events = pipe(
    source.children,
    Arr.filter((node: Node): node is Line => node.kind === "line" && MIDI_EVENTS.has(node.token)),
    Arr.map(eventOf),
  );
  const ticks = Arr.scan(events, ZERO, (total, event) => total + event.ticks);
  return Arr.zipWith(events, Arr.drop(ticks, INITIAL_TOTAL), (event, total) => ({
    event,
    beat: total / ticksPerQuarter,
  }));
};

const midiNotes = (source: Chunk): MidiClip => {
  const timed = timedEvents(source);
  let state: MidiState = { open: {}, notes: [] };
  for (const event of timed) {
    state = apply(event)(state);
  }
  return {
    notes: Arr.sortWith(state.notes, (note) => note, byStart),
    length: Option.match(Arr.last(timed), { onNone: () => ZERO, onSome: ({ beat }) => beat }),
  };
};

export { midiNotes };
export type { MidiClip, SourceNote };
