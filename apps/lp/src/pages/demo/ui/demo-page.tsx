import type { ReactNode } from "react";

import { Arrangement } from "./arrangement";
import { Hero } from "./hero";
import { Playground } from "./playground";
import { SongCredit } from "./song-credit";

const DemoPage = (): ReactNode => (
  <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6">
    <Hero />
    <Arrangement />
    <SongCredit />
    <Playground />
  </main>
);

export { DemoPage };
