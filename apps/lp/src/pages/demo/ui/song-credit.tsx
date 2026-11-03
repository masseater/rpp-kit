import type { ReactNode } from "react";

import { credit } from "#/pages/demo/model/content";

const SongCredit = (): ReactNode => (
  <p className="text-muted-foreground flex flex-wrap gap-x-3 text-sm">
    <span aria-hidden>{credit.mark}</span>
    <a className="underline" href={credit.href}>
      {credit.title}
    </a>
    <span>{credit.author}</span>
    <span>{credit.license}</span>
  </p>
);

export { SongCredit };
