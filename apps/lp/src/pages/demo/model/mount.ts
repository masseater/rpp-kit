import { Effect, Fiber, Option } from "effect";

import type { playground } from "./content";

type Pane = keyof typeof playground.panes;

const paneOf = (container: HTMLElement, pane: Pane): Option.Option<HTMLElement> =>
  Option.fromNullishOr(container.querySelector<HTMLElement>(`[data-pane="${pane}"]`));

const mountPlayground = (container: HTMLDivElement): (() => void) => {
  const fiber = Effect.runFork(
    Option.all({
      rpp: paneOf(container, "rpp"),
      generated: paneOf(container, "generated"),
      main: paneOf(container, "main"),
    }).pipe(
      Effect.fromOption,
      Effect.flatMap((panes) =>
        Effect.promise(() => import("./playground")).pipe(
          Effect.flatMap(({ runPlayground }) => Effect.scoped(runPlayground(panes))),
        ),
      ),
    ),
  );
  return () => {
    Effect.runFork(Fiber.interrupt(fiber));
  };
};

export { mountPlayground };
export type { Pane };
