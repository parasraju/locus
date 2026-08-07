import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";

export type ToolbarFormat =
  | "undo"
  | "redo"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "h1"
  | "h2"
  | "h3"
  | "link"
  | "image"
  | "quote"
  | "divider"
  | "ul"
  | "ol"
  | "task"
  | "table";

function wrapToken(view: EditorView, token: string) {
  const { from, to } = view.state.selection.main;
  const inner = view.state.sliceDoc(from, to) || "text";
  const insert = `${token}${inner}${token}`;
  const selection =
    from === to
      ? EditorSelection.cursor(from + token.length + Math.min(4, inner.length))
      : EditorSelection.range(from + token.length, to + token.length);
  view.dispatch({ changes: { from, to, insert }, selection, scrollIntoView: true });
  return true;
}

function wrapHtml(view: EditorView, tag: string) {
  const { from, to } = view.state.selection.main;
  const inner = view.state.sliceDoc(from, to) || "text";
  const insert = `<${tag}>${inner}</${tag}>`;
  const selection =
    from === to
      ? EditorSelection.cursor(from + tag.length + 2 + Math.min(4, inner.length))
      : EditorSelection.range(from + tag.length + 2, to + tag.length + 2);
  view.dispatch({ changes: { from, to, insert }, selection, scrollIntoView: true });
  return true;
}

function togglePrefix(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const firstLine = view.state.doc.lineAt(from).number;
  const lastLine = view.state.doc.lineAt(to).number;
  const changes: { from: number; to: number; insert: string }[] = [];
  for (let n = firstLine; n <= lastLine; n++) {
    const line = view.state.doc.line(n);
    const lineText = view.state.sliceDoc(line.from, line.to);
    const bullet = /^(\s*)([-*+]|\d+\.)\s+/.exec(lineText);
    if (lineText.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: "" });
    } else if (bullet) {
      changes.push({ from: line.from, to: line.from + bullet[0].length, insert: prefix });
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix });
    }
  }
  view.dispatch({ changes });
  return true;
}

function toggleHeading(view: EditorView, level: number) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const m = /^(#{1,6})\s+/.exec(view.state.sliceDoc(line.from, line.to));
  const marker = `${"#".repeat(level)} `;
  let insert: string;
  if (m && m[1].length === level) insert = "";
  else if (m) insert = marker.replace(/^#{1,6} /, `${"#".repeat(level)} `);
  else insert = marker;
  const to = m ? line.from + m[0].length : line.from;
  const cursor = insert ? line.from + insert.length : line.from;
  view.dispatch({
    changes: { from: line.from, to, insert },
    selection: EditorSelection.cursor(cursor),
  });
  return true;
}
function insertLink(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const inner = view.state.sliceDoc(from, to) || "text";
  const insert = `[${inner}](https://)`;
  const urlStart = from + inner.length + 3;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.range(urlStart, urlStart + "https://".length),
    scrollIntoView: true,
  });
  return true;
}

function insertImage(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const alt = view.state.sliceDoc(from, to) || "alt";
  const insert = `![${alt}](https://)`;
  const urlStart = from + alt.length + 5;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.range(urlStart, urlStart + "https://".length),
    scrollIntoView: true,
  });
  return true;
}

function insertAtCursor(view: EditorView, text: string, cursorOffset = 0) {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: text },
    selection: EditorSelection.cursor(from + text.length - cursorOffset),
    scrollIntoView: true,
  });
  return true;
}

function insertTable(view: EditorView) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const atLineEnd = line.to === line.from ? line.from : line.to;
  const table =
    "\n\n| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |\n";
  view.dispatch({
    changes: { from: atLineEnd, insert: table },
    selection: EditorSelection.cursor(atLineEnd + table.length),
    scrollIntoView: true,
  });
  return true;
}

export function runFormat(view: EditorView, kind: ToolbarFormat): boolean {
  switch (kind) {
    case "undo":
      return undo(view);
    case "redo":
      return redo(view);
    case "bold":
      return wrapToken(view, "**");
    case "italic":
      return wrapToken(view, "*");
    case "underline":
      return wrapHtml(view, "u");
    case "strike":
      return wrapToken(view, "~~");
    case "code":
      return wrapToken(view, "`");
    case "h1":
      return toggleHeading(view, 1);
    case "h2":
      return toggleHeading(view, 2);
    case "h3":
      return toggleHeading(view, 3);
    case "link":
      return insertLink(view);
    case "image":
      return insertImage(view);
    case "quote":
      return togglePrefix(view, "> ");
    case "divider":
      return insertAtCursor(view, "\n\n---\n\n");
    case "ul":
      return togglePrefix(view, "- ");
    case "ol":
      return togglePrefix(view, "1. ");
    case "task":
      return togglePrefix(view, "- [ ] ");
    case "table":
      return insertTable(view);
    default:
      return false;
  }
}
