import type { ReactNode } from "react";

const TabButton = ({
  label,
  active,
  onSelect,
}: Readonly<{ label: string; active: boolean; onSelect: () => void }>): ReactNode => (
  <button
    aria-selected={active}
    className="text-muted-foreground aria-selected:border-primary aria-selected:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 font-mono text-xs"
    onClick={onSelect}
    role="tab"
    type="button"
  >
    {label}
  </button>
);

export { TabButton };
