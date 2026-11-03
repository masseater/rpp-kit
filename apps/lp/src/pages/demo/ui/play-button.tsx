import type { ReactNode } from "react";

import { transport } from "#/pages/demo/model/content";
import { usePlayback, usePlaybackControls } from "#/pages/demo/model/playback";

const labelOf = (playing: boolean): string => {
  if (playing) {
    return transport.stop;
  }
  return transport.play;
};

const PlayButton = (): ReactNode => {
  const playback = usePlayback();
  const { toggle } = usePlaybackControls();
  return (
    <button
      className="bg-primary text-primary-foreground rounded-lg px-4 py-2 font-semibold"
      onClick={toggle}
      type="button"
    >
      {labelOf(playback.status === "playing")}
    </button>
  );
};

export { PlayButton };
