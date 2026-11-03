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
          key={section.start}
          width={percentOf(section.end - section.start)}
          x={percentOf(section.start)}
        />
      )),
    )}
    {pipe(
      song.sections,
      Arr.map((section) => (
        <svg
          className="hidden sm:block"
          key={section.start}
          overflow="hidden"
          width={percentOf(section.end - section.start)}
          x={percentOf(section.start)}
        >
          <text className="fill-card text-xs" dominantBaseline="middle" x={LABEL_OFFSET} y="50%">
            {section.name}
          </text>
        </svg>
      )),
    )}
    <Playhead />
  </svg>
);

export { SectionStrip };
