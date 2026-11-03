import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import type { Track } from "rpp-kit";

import { lane } from "#/pages/demo/model/content";
import { fillOf } from "#/pages/demo/model/format";
import { song } from "#/pages/demo/model/song";

import { LaneLabel } from "./lane-label";
import { NoteRects } from "./note-rects";
import { TimeCursor } from "./time-cursor";

const HEIGHT = 40;

const ROW = 1;

const Lane = ({ track, index }: Readonly<{ track: Track; index: number }>): ReactNode => {
  const notes = pipe(
    track.items,
    Arr.flatMap((item) => {
      if (item.source.kind === "midi") {
        return item.source.notes;
      }
      return [];
    }),
  );
  const pitches = pipe(
    notes,
    Arr.map((note) => note.pitch),
  );
  const low = Math.min(...pitches);
  const span = Math.max(ROW, Math.max(...pitches) - low + ROW);
  if (Arr.isReadonlyArrayEmpty(notes)) {
    return (
      <div className="border-border flex items-stretch border-t">
        <LaneLabel detail="" name={track.name} />
      </div>
    );
  }
  return (
    <div className="border-border flex items-stretch border-t">
      <LaneLabel detail={`${String(notes.length)} ${lane.notes}`} name={track.name} />
      <svg
        aria-hidden
        className="block min-w-0 flex-1"
        height={HEIGHT}
        preserveAspectRatio="none"
        viewBox={`0 0 ${String(song.length)} ${String(span)}`}
      >
        <NoteRects fill={fillOf(index)} low={low} notes={notes} span={span} />
        <TimeCursor />
      </svg>
    </div>
  );
};

export { Lane };
