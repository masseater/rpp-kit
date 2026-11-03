import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

import { startPlayer } from "./player";
import type { Player } from "./player";

type Playback =
  | Readonly<{ status: "stopped"; position: number }>
  | Readonly<{ status: "playing"; position: number; player: Player }>;

type Controls = Readonly<{ toggle: () => void; seek: (time: number) => void }>;

const START = 0;

const playbackAtom = Atom.make<Playback>({ status: "stopped", position: START }).pipe(
  Atom.keepAlive,
);

const halt = (playback: Playback): void => {
  if (playback.status === "playing") {
    playback.player.stop();
  }
};

const usePlayback = (): Playback => useAtomValue(playbackAtom);

const usePlaybackControls = (): Controls => {
  const playback = useAtomValue(playbackAtom);
  const set = useAtomSet(playbackAtom);
  const begin = useCallback(
    (from: number) => {
      const player = startPlayer({
        from,
        onTick: (position) => {
          set((current) => ({ ...current, position }));
        },
        onEnd: () => {
          player.stop();
          set({ status: "stopped", position: START });
        },
      });
      set({ status: "playing", position: from, player });
    },
    [set],
  );
  const toggle = useCallback(() => {
    halt(playback);
    if (playback.status === "playing") {
      set({ status: "stopped", position: playback.position });
    } else {
      begin(playback.position);
    }
  }, [begin, playback, set]);
  const seek = useCallback(
    (time: number) => {
      halt(playback);
      if (playback.status === "playing") {
        begin(time);
      } else {
        set({ status: "stopped", position: time });
      }
    },
    [begin, playback, set],
  );
  return { toggle, seek };
};

export { usePlayback, usePlaybackControls };
export type { Playback };
