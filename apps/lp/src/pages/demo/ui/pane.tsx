import type { ReactNode } from "react";

import type { Pane as PaneName } from "#/pages/demo/model/mount";

const Pane = ({
  name,
  label,
  className,
}: Readonly<{ name: PaneName; label: string; className: string }>): ReactNode => (
  <figure
    className={`border-border bg-card flex min-w-0 flex-col overflow-hidden rounded-lg border ${className}`}
  >
    <figcaption className="border-border text-muted-foreground border-b px-3 py-1.5 font-mono text-xs">
      {label}
    </figcaption>
    <div data-pane={name} className="min-h-0 flex-1" />
  </figure>
);

export { Pane };
