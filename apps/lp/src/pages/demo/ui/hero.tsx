import type { ReactNode } from "react";

import { hero } from "#/pages/demo/model/content";

const Hero = (): ReactNode => (
  <section className="flex flex-col gap-4">
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hero.title}</h1>
    <p className="text-muted-foreground max-w-3xl">{hero.lead}</p>
  </section>
);

export { Hero };
