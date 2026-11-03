import type { ReactNode } from "react";

const Panel = ({
  className,
  children,
}: Readonly<{ className: string; children: ReactNode }>): ReactNode => (
  <div
    className={`border-border bg-card flex min-w-0 flex-col overflow-hidden rounded-lg border ${className}`}
  >
    {children}
  </div>
);

export { Panel };
