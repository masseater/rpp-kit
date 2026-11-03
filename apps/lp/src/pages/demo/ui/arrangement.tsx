import type { ReactNode } from "react";

import { Board } from "./board";
import { SectionButtons } from "./section-buttons";
import { Transport } from "./transport";

const Arrangement = (): ReactNode => (
  <section className="flex flex-col gap-3">
    <Transport />
    <SectionButtons />
    <Board />
  </section>
);

export { Arrangement };
