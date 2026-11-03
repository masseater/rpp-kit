import type { ReactNode } from "react";

import { playground } from "#/pages/demo/model/content";
import { mountPlayground } from "#/pages/demo/model/mount";

import { Pane } from "./pane";

const Playground = (): ReactNode => (
  <section className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold">{playground.heading}</h2>
    <div ref={mountPlayground} className="grid gap-3 lg:h-144 lg:grid-cols-2 lg:grid-rows-2">
      <Pane name="rpp" label={playground.panes.rpp} className="h-96 lg:row-span-2 lg:h-auto" />
      <Pane name="main" label={playground.panes.main} className="h-72 lg:h-auto" />
      <Pane name="generated" label={playground.panes.generated} className="h-72 lg:h-auto" />
    </div>
  </section>
);

export { Playground };
