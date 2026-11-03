import type { ReactNode } from "react";

import { hero } from "#/pages/demo/model/content";

const Hero = (): ReactNode => (
  <section className="flex flex-wrap items-end justify-between gap-4">
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hero.title}</h1>
    <a className="border-border rounded-lg border px-4 py-2 text-sm font-medium" href={hero.href}>
      {hero.source}
    </a>
  </section>
);

export { Hero };
