import { useCallback } from "react";
import type { ReactNode } from "react";

import { mountPlayground } from "#/pages/demo/model/mount";
import { useReport } from "#/pages/demo/model/output";

import { ConsolePanel } from "./console-panel";
import { GeneratedPanel } from "./generated-panel";
import { SourcePanel } from "./source-panel";

const Playground = (): ReactNode => {
  const report = useReport();
  const mount = useCallback(
    (container: HTMLDivElement) => mountPlayground({ container, report }),
    [report],
  );
  return (
    <section>
      <div ref={mount} className="grid gap-3 lg:h-160 lg:grid-cols-2 lg:grid-rows-3">
        <SourcePanel />
        <GeneratedPanel />
        <ConsolePanel />
      </div>
    </section>
  );
};

export { Playground };
