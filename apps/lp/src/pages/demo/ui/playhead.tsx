import type { ReactNode } from "react";

import { percentOf } from "#/pages/demo/model/format";
import { usePlayback } from "#/pages/demo/model/playback";

const Playhead = (): ReactNode => {
  const { position } = usePlayback();
  return (
    <line
      className="stroke-foreground"
      x1={percentOf(position)}
      x2={percentOf(position)}
      y1="0"
      y2="100%"
    />
  );
};

export { Playhead };
