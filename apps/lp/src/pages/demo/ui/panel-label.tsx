import type { ReactNode } from "react";

const PanelLabel = ({
  label,
  note = "",
}: Readonly<{ label: string; note?: string }>): ReactNode => (
  <div className="border-border text-muted-foreground flex items-baseline gap-2 border-b px-4 py-2 font-mono text-xs">
    {label}
    <span hidden={note === ""} className="font-sans">
      {note}
    </span>
  </div>
);

export { PanelLabel };
