import type { ReactNode } from "react";

const PanelBody = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="min-h-0 flex-1">{children}</div>
);

export { PanelBody };
