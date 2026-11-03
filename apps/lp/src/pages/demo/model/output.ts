import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Schema } from "effect";
import { Atom } from "effect/reactivity";

const LineSchema = Schema.Struct({
  kind: Schema.Literals(["log", "warn", "error", "type"]),
  text: Schema.String,
});

type Line = typeof LineSchema.Type;

type Entry = Readonly<Line & { id: number }>;

type Output =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "ran"; entries: readonly Entry[] }>;

type Report = (output: Output) => void;

const outputAtom = Atom.make<Output>({ status: "pending" }).pipe(Atom.keepAlive);

const useOutput = (): Output => useAtomValue(outputAtom);

const useReport = (): Report => useAtomSet(outputAtom);

export { LineSchema, useOutput, useReport };
export type { Entry, Line, Output, Report };
