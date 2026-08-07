import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";

const hideSyntax = Decoration.mark({
  attributes: {
    style: "color: transparent; position: absolute; pointer-events: none; user-select: none; width: 0; overflow: hidden;",
  },
});

const headingStyles: Record<number, string> = {
  1: "font-size: 34px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.25; margin: 1.5em 0 0.45em; font-family: var(--font-locus-sans);",
  2: "font-size: 26px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.25; margin: 1.2em 0 0.4em; font-family: var(--font-locus-sans);",
  3: "font-size: 21px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.3; margin: 1em 0 0.35em; font-family: var(--font-locus-sans);",
  4: "font-size: 17px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.35; margin: 0.8em 0 0.3em; font-family: var(--font-locus-sans);",
};

function buildDecorations(view: { state: EditorState }): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const totalLines = doc.lines;

  for (let i = 1; i <= totalLines; i++) {
    const line = doc.line(i);
    const text = line.text;
    const from = line.from;

    // --- Headings: hide "# " prefix ---
    const headingMatch = text.match(/^(#{1,6})\s+/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const prefixLen = headingMatch[0].length;
      const styl = headingStyles[level] || headingStyles[4];
      // Hide the "# " prefix
      builder.add(from, from + prefixLen, hideSyntax);
      // Style the heading text
      builder.add(from + prefixLen, line.to, Decoration.mark({
        attributes: { style: styl },
      }));
      continue;
    }

    // --- Fenced code blocks: hide ``` ---
    if (text.trimStart().startsWith("```")) {
      const trimLen = text.length - text.trimStart().length;
      const tripleLen = 3;
      const rest = text.slice(trimLen + tripleLen);
      const langEnd = rest.search(/\s/);
      const markerEnd = langEnd >= 0 ? trimLen + tripleLen + langEnd : line.to;
      builder.add(from, markerEnd, hideSyntax);
      continue;
    }

    // --- Blockquotes: hide "> " ---
    if (/^>\s+/.test(text)) {
      builder.add(from, from + 2, hideSyntax);
      continue;
    }

    // --- Unordered list: hide "- " ---
    if (/^[-*+]\s+/.test(text)) {
      const m = text.match(/^[-*+]\s+/)!;
      builder.add(from, from + m[0].length, hideSyntax);
      continue;
    }

    // --- Ordered list: hide "1. " ---
    if (/^\d+\.\s+/.test(text)) {
      const m = text.match(/^\d+\.\s+/)!;
      builder.add(from, from + m[0].length, hideSyntax);
      continue;
    }

    // --- Task list: hide "- [x] " or "- [ ] " ---
    const taskMatch = text.match(/^[-*+]\s+\[[ xX]\]\s+/);
    if (taskMatch) {
      builder.add(from, from + taskMatch[0].length, hideSyntax);
      continue;
    }

    // --- Horizontal rule: hide "---" ---
    if (/^[-*_]{3,}\s*$/.test(text)) {
      builder.add(from, line.to, hideSyntax);
      builder.add(from, line.to, Decoration.mark({
        attributes: { style: "border-top: 1px solid var(--color-locus-border); margin: 1.6em 0; display: block; height: 0;" },
      }));
      continue;
    }

    // --- Inline decorations: bold, italic, code, links ---
    // We process the line character by character for inline elements
    let pos = from;
    while (pos < line.to) {
      const ch = text[pos - from];

      // Bold: **text**
      if (ch === "*" && text[pos - from + 1] === "*" && pos + 2 < line.to) {
        const end = findInlineEnd(text, pos - from, "**", 2);
        if (end >= 0) {
          // Hide opening **
          builder.add(pos, pos + 2, hideSyntax);
          // Style the bold text
          builder.add(pos + 2, from + end, Decoration.mark({
            attributes: { style: "font-weight: 700;" },
          }));
          // Hide closing **
          builder.add(from + end, from + end + 2, hideSyntax);
          pos = from + end + 2;
          continue;
        }
      }

      // Italic: *text* (single *)
      if (ch === "*" && (pos === from || text[pos - from - 1] !== "*") && text[pos - from + 1] !== "*") {
        const end = findInlineEnd(text, pos - from, "*", 1);
        if (end >= 0) {
          builder.add(pos, pos + 1, hideSyntax);
          builder.add(pos + 1, from + end, Decoration.mark({
            attributes: { style: "font-style: italic;" },
          }));
          builder.add(from + end, from + end + 1, hideSyntax);
          pos = from + end + 1;
          continue;
        }
      }

      // Inline code: `code`
      if (ch === "`") {
        const end = text.indexOf("`", pos - from + 1);
        if (end >= 0) {
          builder.add(pos, pos + 1, hideSyntax);
          builder.add(pos + 1, from + end, Decoration.mark({
            attributes: { style: "font-family: var(--font-locus-mono); font-size: 0.88em; background: var(--color-locus-border-soft); border: 1px solid var(--color-locus-border); border-radius: 5px; padding: 0.06em 0.35em;" },
          }));
          builder.add(from + end, from + end + 1, hideSyntax);
          pos = from + end + 1;
          continue;
        }
      }

      // Link: [text](url) — hide the markdown, show text with accent color
      if (ch === "[") {
        const pipeIdx = text.indexOf("](", pos - from + 1);
        if (pipeIdx >= 0) {
          const closeParen = text.indexOf(")", pipeIdx + 2);
          if (closeParen >= 0) {
            // Hide [
            builder.add(pos, pos + 1, hideSyntax);
            // Style the link text
            builder.add(pos + 1, from + pipeIdx, Decoration.mark({
              attributes: { style: "color: var(--color-locus-accent); text-decoration: none;" },
            }));
            // Hide ](url)
            builder.add(from + pipeIdx, from + closeParen + 1, hideSyntax);
            pos = from + closeParen + 1;
            continue;
          }
        }
      }

      pos++;
    }
  }

  return builder.finish();
}

function findInlineEnd(text: string, start: number, marker: string, markerLen: number): number {
  let i = start + markerLen;
  while (i < text.length - markerLen + 1) {
    if (text.slice(i, i + markerLen) === marker) {
      // Make sure it's not escaped
      if (i === 0 || text[i - 1] !== "\\") {
        return i;
      }
    }
    i++;
  }
  return -1;
}

export const renderedEditorPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
