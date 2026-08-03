// Remark plugins (PRD §6.2, FR-04 wikilinks, FR-23 callouts).
// Operate on the mdast tree so source positions of other nodes stay valid
// (needed for task-list toggling and outline scroll in the editor).

type MdNode = {
  type: string;
  value?: string;
  children?: MdNode[];
  [key: string]: unknown;
};

const SKIP_CONTAINERS = new Set([
  "code",
  "inlineCode",
  "link",
  "html",
  "footnoteReference",
]);

function walkChildren(parent: MdNode): void {
  if (!parent.children) return;
  const out: MdNode[] = [];
  for (const child of parent.children) {
    if (child.type === "text" && typeof child.value === "string" && child.value.includes("[[")) {
      out.push(...splitWikilinks(child.value));
    } else {
      if (!SKIP_CONTAINERS.has(child.type)) walkChildren(child);
      out.push(child);
    }
  }
  parent.children = out;
}

function splitWikilinks(text: string): MdNode[] {
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const nodes: MdNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push({ type: "text", value: text.slice(last, m.index) });
    const rawTarget = m[1];
    const alias = (m[2] ?? m[1]).trim();
    let target = rawTarget.trim();
    let anchor = "";
    const hash = target.indexOf("#");
    if (hash >= 0) {
      anchor = target.slice(hash);
      target = target.slice(0, hash);
    }
    const href = `locus://${encodeURIComponent(target)}${anchor}`;
    nodes.push({
      type: "html",
      value: `<a href="${href}" class="locus-wikilink">${escapeHtml(alias)}</a>`,
    });
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push({ type: "text", value: text.slice(last) });
  return nodes.length ? nodes : [{ type: "text", value: text }];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CALLOUT_TYPES: Record<string, { css: string; label: string }> = {
  note: { css: "note", label: "Note" },
  info: { css: "note", label: "Info" },
  tip: { css: "success", label: "Tip" },
  warning: { css: "warning", label: "Warning" },
  danger: { css: "danger", label: "Danger" },
  error: { css: "danger", label: "Error" },
  success: { css: "success", label: "Success" },
  question: { css: "info", label: "Question" },
  example: { css: "info", label: "Example" },
};

function processCallouts(parent: MdNode): void {
  if (!parent.children) return;
  const out: MdNode[] = [];
  for (const child of parent.children) {
    if (child.type === "blockquote") {
      out.push(...transformBlockquote(child));
    } else {
      processCallouts(child);
      out.push(child);
    }
  }
  parent.children = out;
}

function transformBlockquote(blockquote: MdNode): MdNode[] {
  const children = blockquote.children ?? [];
  const first = children.find((c) => c.type === "paragraph");
  const markerText = paragraphMarker(first);
  if (!markerText) {
    processCallouts(blockquote);
    return [blockquote];
  }
  const conf = CALLOUT_TYPES[markerText.type.toLowerCase()] ?? CALLOUT_TYPES.note;
  const open = {
    type: "html",
    value: `<div class="locus-callout locus-callout-${conf.css}"><div class="locus-callout-title">${conf.label}${markerText.title ? ` — ${escapeHtml(markerText.title)}` : ""}</div>`,
  };
  const close = { type: "html", value: "</div>" };
  const body = children.filter((c) => c !== first);
  processCallouts({ ...blockquote, children: body });
  return [open, ...body, close];
}

function paragraphMarker(para?: MdNode): { type: string; title: string } | null {
  if (!para) return null;
  const text = (para.children ?? [])
    .filter((c) => c.type === "text")
    .map((c) => String(c.value ?? ""))
    .join("");
  const m = text.match(/^\[!([a-zA-Z-]+)\]\s*(.*)$/);
  if (!m) return null;
  return { type: m[1], title: m[2].trim() };
}

export function remarkWikilinks() {
  return (tree: MdNode) => {
    walkChildren(tree);
  };
}

export function remarkCallouts() {
  return (tree: MdNode) => {
    processCallouts(tree);
  };
}
