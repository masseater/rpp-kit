import { Array as Arr, Match, pipe } from "effect";
import type { ReactNode } from "react";

import { playground } from "#/pages/demo/model/content";
import { useOutput } from "#/pages/demo/model/output";
import type { Entry, Output } from "#/pages/demo/model/output";

import { ConsoleLine } from "./console-line";

const entriesOf = (output: Output): readonly Entry[] =>
  Match.value(output).pipe(
    Match.discriminatorsExhaustive("status")({
      pending: (): readonly Entry[] => [],
      ran: ({ entries }) => entries,
    }),
  );

const noticeOf = (output: Output): string =>
  Match.value(output).pipe(
    Match.discriminatorsExhaustive("status")({
      pending: () => playground.output.pending,
      ran: ({ entries }) =>
        Arr.match(entries, { onEmpty: () => playground.output.empty, onNonEmpty: () => "" }),
    }),
  );

const ConsoleView = (): ReactNode => {
  const output = useOutput();
  const notice = noticeOf(output);
  return (
    <div className="h-full overflow-auto font-mono text-xs" role="log">
      <ol>
        {pipe(
          entriesOf(output),
          Arr.map((entry) => <ConsoleLine key={entry.id} entry={entry} />),
        )}
      </ol>
      <p hidden={notice === ""} className="text-muted-foreground px-3 py-2">
        {notice}
      </p>
    </div>
  );
};

export { ConsoleView };
