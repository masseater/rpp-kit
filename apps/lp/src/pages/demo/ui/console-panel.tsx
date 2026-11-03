import type { ReactNode } from "react";

import { playground } from "#/pages/demo/model/content";

import { ConsoleView } from "./console-view";
import { Panel } from "./panel";
import { PanelBody } from "./panel-body";
import { PanelLabel } from "./panel-label";

const ConsolePanel = (): ReactNode => (
  <Panel className="max-h-96">
    <PanelLabel label={playground.panes.console} />
    <PanelBody>
      <ConsoleView />
    </PanelBody>
  </Panel>
);

export { ConsolePanel };
