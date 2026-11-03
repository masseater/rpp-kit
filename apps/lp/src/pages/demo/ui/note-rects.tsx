import { Array as Arr, pipe } from "effect";
import { memo } from "react";
import type { ReactNode } from "react";
import type { Note } from "rpp-kit";

const MIN_WIDTH = 0.05;

const ROW = 1;

type Props = Readonly<{ notes: readonly Note[]; low: number; span: number; fill: string }>;

const AllNotes = ({ notes, low, span, fill }: Props): ReactNode =>
  pipe(
    notes,
    Arr.map((note) => (
      <rect
        className={fill}
        height={ROW}
        key={`${String(note.start)}-${String(note.pitch)}`}
        width={Math.max(note.duration, MIN_WIDTH)}
        x={note.start}
        y={span - (note.pitch - low) - ROW}
      />
    )),
  );

const NoteRects = memo(AllNotes);

export { NoteRects };
