import type { ReactNode } from "react";

import { credit } from "#/pages/demo/model/content";

const SongCredit = (): ReactNode => (
  <p className="text-muted-foreground text-sm">
    {credit.before}
    <a className="underline" href={credit.href}>
      {credit.title}
    </a>
    {credit.after}
  </p>
);

export { SongCredit };
