import type { ReactNode } from "react";

import { usePlayback } from "#/pages/demo/model/playback";

const TimeCursor = (): ReactNode => {
  const { position } = usePlayback();
  return (
    <line
      className="stroke-foreground"
      vectorEffect="non-scaling-stroke"
      x1={position}
      x2={position}
      y1="0"
      y2="100%"
    />
  );
};

export { TimeCursor };
