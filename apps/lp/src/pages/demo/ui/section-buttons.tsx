import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { song } from "#/pages/demo/model/song";

import { SectionButton } from "./section-button";

const SectionButtons = (): ReactNode => (
  <div className="flex flex-wrap gap-1">
    {pipe(
      song.sections,
      Arr.map((section) => <SectionButton key={section.name} section={section} />),
    )}
  </div>
);

export { SectionButtons };
