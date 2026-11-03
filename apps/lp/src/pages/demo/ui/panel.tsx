import type { ReactNode } from "react";

const Panel = ({
  tabs,
  children,
}: Readonly<{ tabs: ReactNode; children: ReactNode }>): ReactNode => (
  <div className="border-border bg-card flex h-96 min-w-0 flex-col overflow-hidden rounded-lg border lg:h-auto">
    <div className="border-border flex border-b px-1" role="tablist">
      {tabs}
    </div>
    <div className="min-h-0 flex-1">{children}</div>
  </div>
);

export { Panel };
