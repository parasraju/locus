import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  dropCursor,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";
import type { FlatEntry, EditorMode } from "../types";
import { MarkdownView } from "../lib/markdown";
import { runFormat, type ToolbarFormat } from "../lib/formatActions";

export interface EditorPaneHandle {
  scrollToOffset: (offset: number) => void;
  saveNow: () => void;
  format: (kind: ToolbarFormat) => void;
  focus: () => void;
}

interface EditorPaneProps {
  relPath: string;
  name: string;
  content: string;
  mode: EditorMode;
  files: FlatEntry[];
  dark: boolean;
  onChange: (content: string) => void;
  onOpenNote: (target: string) => void;
  onTaskToggle: (offset: number, checked: boolean) => void;
  onRequestSave: () => void;
  innerRef?: Ref<EditorPaneHandle>;
}

function wikilinkCompletions(files: FlatEntry[]) {
  return (context: { matchBefore: (re: RegExp) => { from: number; to: number; text: string } | null }) => {
    const word = context.matchBefore(/\[\[[^\]\n]*$/);
    if (!word) return null;
    const typed = word.text.slice(2).toLowerCase();
    const options = files
      .filter((f) => !f.isDir && f.name.endsWith(".md"))
      .map((f) => f.relPath)
      .filter((p) => !typed || p.toLowerCase().includes(typed))
      .slice(0, 50)
      .map((p) => {
        const base = p.replace(/\.md$/i, "").split("/").pop() ?? p;
        return { label: base, detail: p, apply: `[[${base}]]` };
      });
    return { from: word.from + 2, options };
  };
}

export function EditorPane(props: EditorPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(props.content);
  const themeComp = useRef(new Compartment());
  const autoComp = useRef(new Compartment());
  const propsRef = useRef(props);
  propsRef.current = props;

  const buildExtensions = () => {
    const theme = props.dark
      ? [oneDark, EditorView.theme({ "&": { backgroundColor: "transparent" } })]
      : [syntaxHighlighting(defaultHighlightStyle)];
    return [
      lineNumbers(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      keymap.of([indentWithTab]),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      markdown(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        {
          key: "Mod-s",
          preventDefault: true,
          run: () => {
            propsRef.current.onRequestSave();
            return true;
          },
        },
      ]),
      autoComp.current.of(autocompletion({ override: [wikilinkCompletions(props.files)] })),
      themeComp.current.of(theme),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const next = update.state.doc.toString();
          if (next !== lastSent.current) {
            lastSent.current = next;
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
              propsRef.current.onChange(next);
            }, 250);
          }
        }
      }),
    ];
  };

  const isSourceShown = props.mode === "source" || props.mode === "split";
  const isPreviewShown = props.mode === "split" || props.mode === "reading";

  useEffect(() => {
    if (!hostRef.current || !isSourceShown) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: props.content,
        extensions: buildExtensions(),
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    lastSent.current = props.content;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSourceShown]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeComp.current.reconfigure(
        props.dark
          ? [oneDark, EditorView.theme({ "&": { backgroundColor: "transparent" } })]
          : [syntaxHighlighting(defaultHighlightStyle)],
      ),
    });
  }, [props.dark]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: autoComp.current.reconfigure(autocompletion({ override: [wikilinkCompletions(props.files)] })),
    });
  }, [props.files]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== props.content && !view.hasFocus) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: props.content },
      });
      lastSent.current = props.content;
    }
  }, [props.content, props.relPath]);

  useImperativeHandle(props.innerRef, () => ({
    scrollToOffset(offset: number) {
      const view = viewRef.current;
      if (!view) return;
      const line = view.state.doc.lineAt(Math.min(offset, view.state.doc.length));
      view.dispatch({
        selection: { anchor: offset },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      view.focus();
    },
    saveNow() {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      propsRef.current.onRequestSave();
    },
    format(kind: ToolbarFormat) {
      const view = viewRef.current;
      if (!view) return;
      runFormat(view, kind);
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  return (
    <div className="flex h-full w-full overflow-hidden">
      {isSourceShown && (
        <div
          ref={hostRef}
          className={`h-full overflow-hidden ${
            props.mode === "split"
              ? "w-1/2 border-r border-locus-border/50 locus-split-mode"
              : "w-full"
          }`}
        />
      )}
      {isPreviewShown && (
        <div
          className={`h-full overflow-y-auto ${
            props.mode === "split"
              ? "w-1/2 bg-locus-bg/50 px-10 py-10"
              : "w-full px-10 py-10"
          }`}
        >
          <div className="mx-auto max-w-[46rem]">
            <MarkdownView
              content={props.content}
              reading={props.mode === "reading"}
              onOpenNote={props.onOpenNote}
              onTaskToggle={props.onTaskToggle}
            />
          </div>
        </div>
      )}
    </div>
  );
}
