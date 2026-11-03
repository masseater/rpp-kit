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
    (container: HTMLElement) => mountPlayground({ container, report }),
    [report],
  );
  return (
    <section ref={mount} className="flex flex-col gap-3">
      <div className="grid gap-3 lg:h-120 lg:grid-cols-2">
        <SourcePanel />
        <GeneratedPanel />
      </div>
      <ConsolePanel />
    </section>
  );
};

export { Playground };
