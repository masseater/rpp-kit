import type { ReactNode } from "react";

import type { Entry } from "#/pages/demo/model/output";

const KIND_CLASS = {
  log: "text-foreground",
  warn: "text-warning",
  error: "text-destructive",
  type: "text-destructive",
} as const satisfies Record<Entry["kind"], string>;

const ConsoleLine = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className={`border-border border-b px-4 py-1 whitespace-pre-wrap ${KIND_CLASS[entry.kind]}`}>
    {entry.text}
  </li>
);

export { ConsoleLine };
