import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { fillOf, percentOf } from "#/pages/demo/model/format";
import { song } from "#/pages/demo/model/song";

import { Playhead } from "./playhead";

const LABEL_OFFSET = 4;

const SectionStrip = (): ReactNode => (
  <svg aria-hidden className="block h-8 min-w-0 flex-1">
    {pipe(
      song.sections,
      Arr.map((section, index) => (
        <rect
          className={fillOf(index)}
          height="100%"
          key={section.name}
          width={percentOf(section.end - section.start)}
          x={percentOf(section.start)}
        />
      )),
    )}
    {pipe(
      song.sections,
      Arr.map((section) => (
        <text
          className="fill-card hidden text-xs sm:block"
          dominantBaseline="middle"
          dx={LABEL_OFFSET}
          key={section.name}
          x={percentOf(section.start)}
          y="50%"
        >
          {section.name}
        </text>
      )),
    )}
    <Playhead />
  </svg>
);

export { SectionStrip };
