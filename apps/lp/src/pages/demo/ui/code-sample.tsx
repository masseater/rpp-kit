import type { ReactNode } from "react";

import { typing } from "#/pages/demo/model/content";

const CodeSample = (): ReactNode => (
  <section className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold">{typing.heading}</h2>
    <pre className="bg-card border-border overflow-x-auto rounded-lg border p-4 text-sm">
      {typing.usage}
    </pre>
    <pre className="bg-foreground text-background overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
      {typing.output}
    </pre>
    <p className="text-muted-foreground text-sm">{typing.note}</p>
  </section>
);

export { CodeSample };
