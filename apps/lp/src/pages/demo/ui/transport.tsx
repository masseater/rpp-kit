import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";

import { transport } from "#/pages/demo/model/content";
import { clockOf } from "#/pages/demo/model/format";
import { usePlayback } from "#/pages/demo/model/playback";
import { song } from "#/pages/demo/model/song";

import { PlayButton } from "./play-button";

const Transport = (): ReactNode => {
  const { position } = usePlayback();
  const section = Option.match(
    Arr.findFirst(song.sections, ({ start, end }) => start <= position && position < end),
    { onNone: () => "", onSome: ({ name }) => name },
  );
  const meter = `${String(song.tempo.bpm)} ${transport.bpm} ・ ${String(song.tempo.numerator)}/${String(song.tempo.denominator)}`;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <PlayButton />
      <span className="text-sm tabular-nums">{`${clockOf(position)} / ${clockOf(song.length)}`}</span>
      <span className="text-muted-foreground text-sm">{section}</span>
      <span className="text-muted-foreground ml-auto text-xs">{meter}</span>
    </div>
  );
};

export { Transport };
