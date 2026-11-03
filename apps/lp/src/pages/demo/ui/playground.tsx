import { useCallback } from "react";
import type { ReactNode } from "react";

import { mountPlayground } from "#/pages/demo/model/mount";
import { useReport } from "#/pages/demo/model/output";

import { ResultPanel } from "./result-panel";
import { SourcePanel } from "./source-panel";

const Playground = (): ReactNode => {
  const report = useReport();
  const mount = useCallback(
    (container: HTMLDivElement) => mountPlayground({ container, report }),
    [report],
  );
  return (
    <section>
      <div ref={mount} className="grid gap-3 lg:h-144 lg:grid-cols-2">
        <SourcePanel />
        <ResultPanel />
      </div>
    </section>
  );
};

export { Playground };
