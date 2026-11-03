import { useCallback } from "react";
import type { ReactNode } from "react";

import { playground } from "#/pages/demo/model/content";
import { useSourceTab } from "#/pages/demo/model/tabs";

import { Pane } from "./pane";
import { Panel } from "./panel";
import { TabButton } from "./tab-button";

const SourcePanel = (): ReactNode => {
  const [tab, setTab] = useSourceTab();
  const showMain = useCallback(() => {
    setTab("main");
  }, [setTab]);
  const showRpp = useCallback(() => {
    setTab("rpp");
  }, [setTab]);
  return (
    <Panel
      tabs={
        <>
          <TabButton label={playground.panes.main} active={tab === "main"} onSelect={showMain} />
          <TabButton label={playground.panes.rpp} active={tab === "rpp"} onSelect={showRpp} />
        </>
      }
    >
      <Pane name="main" active={tab === "main"} />
      <Pane name="rpp" active={tab === "rpp"} />
    </Panel>
  );
};

export { SourcePanel };
