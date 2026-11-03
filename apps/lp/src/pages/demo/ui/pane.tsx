import type { ReactNode } from "react";

import type { Pane as PaneName } from "#/pages/demo/model/mount";

const Pane = ({ name, active }: Readonly<{ name: PaneName; active: boolean }>): ReactNode => (
  <div data-pane={name} hidden={!active} className="h-full min-h-0" />
);

export { Pane };
