import { String as Str } from "effect";

import { song } from "./song";

const PERCENT = 100;

const SECONDS_PER_MINUTE = 60;

const SECONDS_WIDTH = 2;

const ORIGIN = 0;

const percentOf = (time: number): string => `${String((time / song.length) * PERCENT)}%`;

const clockOf = (time: number): string => {
  const whole = Math.max(ORIGIN, Math.floor(time));
  const seconds = Str.padStart(SECONDS_WIDTH, "0")(String(whole % SECONDS_PER_MINUTE));
  return `${String(Math.floor(whole / SECONDS_PER_MINUTE))}:${seconds}`;
};

const TRACK_FILLS = [
  "fill-track-1",
  "fill-track-2",
  "fill-track-3",
  "fill-track-4",
  "fill-track-5",
  "fill-track-6",
  "fill-track-7",
  "fill-track-8",
] as const;

const fillOf = (index: number): string =>
  TRACK_FILLS[index % TRACK_FILLS.length] ?? "fill-foreground";

export { clockOf, fillOf, percentOf };
