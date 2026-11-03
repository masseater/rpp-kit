import { useAtom } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

type SourceTab = "main" | "rpp";

type ResultTab = "console" | "generated";

type Tabs<Tab> = readonly [Tab, (tab: Tab) => void];

const sourceTabAtom = Atom.make<SourceTab>("main").pipe(Atom.keepAlive);

const resultTabAtom = Atom.make<ResultTab>("console").pipe(Atom.keepAlive);

const useSourceTab = (): Tabs<SourceTab> => useAtom(sourceTabAtom);

const useResultTab = (): Tabs<ResultTab> => useAtom(resultTabAtom);

export { useResultTab, useSourceTab };
