import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { song } from "#/pages/demo/model/song";

import { Lane } from "./lane";
import { SectionStrip } from "./section-strip";

const Board = (): ReactNode => (
  <div className="bg-card border-border overflow-hidden rounded-lg border">
    <div className="flex">
      <div className="w-20 shrink-0 sm:w-28" />
      <SectionStrip />
    </div>
    {pipe(
      song.trackOrder,
      Arr.flatMap((name) => Arr.fromOption(Option.fromNullishOr(song.tracks[name]))),
      Arr.map((track, index) => <Lane index={index} key={track.name} track={track} />),
    )}
  </div>
);

export { Board };
