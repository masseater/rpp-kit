import type { ReactNode } from "react";

const LaneLabel = ({ name, detail }: Readonly<{ name: string; detail: string }>): ReactNode => (
  <div className="w-20 shrink-0 py-2 pr-2 text-xs font-medium sm:w-28">
    <div>{name}</div>
    <div className="text-muted-foreground font-normal">{detail}</div>
  </div>
);

export { LaneLabel };
