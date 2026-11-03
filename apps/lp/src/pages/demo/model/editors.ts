import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { EditorState, StateEffect } from "@codemirror/state";
import type { Extension, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  tsAutocompleteWorker,
  tsFacetWorker,
  tsHoverWorker,
  tsSyncWorker,
} from "@valtown/codemirror-ts";
import type { WorkerShape } from "@valtown/codemirror-ts/worker";
import { basicSetup } from "codemirror";
import { Array as Arr, Effect, pipe } from "effect";
import type { Scope } from "effect";

import { playground } from "./content";

type Editor = Readonly<{ host: HTMLElement; doc: string; extensions: readonly Extension[] }>;

type Checked = Readonly<{ doc: Text; lints: readonly Diagnostic[] }>;

type MainPane = Readonly<{ worker: WorkerShape; onChecked: (checked: Checked) => void }>;

type Replacement = Readonly<{ view: EditorView; code: string }>;

const GENERATED_PATH = `/${playground.panes.generated}`;

const MAIN_PATH = `/${playground.panes.main}`;

const songChanged = StateEffect.define<true>();

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "0.8125rem" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-tooltip": { maxWidth: "min(36rem, 90vw)" },
  ".cm-tooltip-hover, .cm-diagnostic": { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
});

const shadowOf = (host: HTMLElement): ShadowRoot =>
  host.shadowRoot ?? host.attachShadow({ mode: "open" });

const createEditor = ({ host, doc, extensions }: Editor): EditorView => {
  const root = shadowOf(host);
  return new EditorView({
    parent: root,
    root,
    doc,
    extensions: [basicSetup, theme, ...extensions],
  });
};

const scopedEditor = (editor: Editor): Effect.Effect<EditorView, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => createEditor(editor)),
    (view) =>
      Effect.sync(() => {
        view.destroy();
      }),
  );

const typescriptPane = (worker: WorkerShape, path: string): readonly Extension[] => [
  javascript({ typescript: true }),
  tsFacetWorker.of({ worker, path }),
  tsSyncWorker(),
  tsHoverWorker(),
];

const generatedPane = (worker: WorkerShape): readonly Extension[] => [
  EditorState.readOnly.of(true),
  ...typescriptPane(worker, GENERATED_PATH),
];

const mainPane = ({ worker, onChecked }: MainPane): readonly Extension[] => [
  ...typescriptPane(worker, MAIN_PATH),
  linter(
    (view) =>
      Effect.runPromise(
        Effect.promise(() =>
          worker.getLints({ path: MAIN_PATH, diagnosticCodesToIgnore: [] }),
        ).pipe(
          Effect.tap((lints) =>
            Effect.sync(() => {
              onChecked({ doc: view.state.doc, lints });
            }),
          ),
        ),
      ),
    {
      needsRefresh: (update) =>
        pipe(
          update.transactions,
          Arr.some((transaction) =>
            pipe(
              transaction.effects,
              Arr.some((effect) => effect.is(songChanged)),
            ),
          ),
        ),
    },
  ),
  autocompletion({ override: [tsAutocompleteWorker()] }),
];

const replaceDocument = ({ view, code }: Replacement): void => {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
};

const notifySongChanged = (view: EditorView): void => {
  view.dispatch({ effects: songChanged.of(true) });
};

export {
  GENERATED_PATH,
  generatedPane,
  mainPane,
  notifySongChanged,
  replaceDocument,
  scopedEditor,
};
export type { Checked };
