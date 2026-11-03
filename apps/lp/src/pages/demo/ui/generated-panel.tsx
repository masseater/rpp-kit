import type { ReactNode } from "react";

import { playground } from "#/pages/demo/model/content";

import { Pane } from "./pane";
import { Panel } from "./panel";
import { PanelBody } from "./panel-body";
import { PanelLabel } from "./panel-label";

const GeneratedPanel = (): ReactNode => (
  <Panel className="h-72 lg:h-auto">
    <PanelLabel label={playground.panes.generated} note={playground.generatedNote} />
    <PanelBody>
      <Pane name="generated" active />
    </PanelBody>
  </Panel>
);

export { GeneratedPanel };
