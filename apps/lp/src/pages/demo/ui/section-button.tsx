import { useCallback } from "react";
import type { ReactNode } from "react";
import type { Section } from "rpp-kit";

import { usePlaybackControls } from "#/pages/demo/model/playback";

const SectionButton = ({ section }: Readonly<{ section: Section }>): ReactNode => {
  const { seek } = usePlaybackControls();
  const jump = useCallback(() => {
    seek(section.start);
  }, [section.start, seek]);
  return (
    <button
      className="bg-card border-border rounded border px-2 py-1 text-xs"
      onClick={jump}
      type="button"
    >
      {section.name}
    </button>
  );
};

export { SectionButton };
