import { useCallback } from "react";
import type { ReactNode } from "react";

import { playground } from "#/pages/demo/model/content";
import { useResultTab } from "#/pages/demo/model/tabs";

import { ConsoleView } from "./console-view";
import { Pane } from "./pane";
import { Panel } from "./panel";
import { TabButton } from "./tab-button";

const ResultPanel = (): ReactNode => {
  const [tab, setTab] = useResultTab();
  const showConsole = useCallback(() => {
    setTab("console");
  }, [setTab]);
  const showGenerated = useCallback(() => {
    setTab("generated");
  }, [setTab]);
  return (
    <Panel
      tabs={
        <>
          <TabButton
            label={playground.panes.console}
            active={tab === "console"}
            onSelect={showConsole}
          />
          <TabButton
            label={playground.panes.generated}
            active={tab === "generated"}
            onSelect={showGenerated}
          />
        </>
      }
    >
      <ConsoleView active={tab === "console"} />
      <Pane name="generated" active={tab === "generated"} />
    </Panel>
  );
};

export { ResultPanel };
