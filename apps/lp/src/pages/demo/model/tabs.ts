import { useAtom } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

type SourceTab = "main" | "rpp";

type Tabs<Tab> = readonly [Tab, (tab: Tab) => void];

const sourceTabAtom = Atom.make<SourceTab>("main").pipe(Atom.keepAlive);

const useSourceTab = (): Tabs<SourceTab> => useAtom(sourceTabAtom);

export { useSourceTab };
