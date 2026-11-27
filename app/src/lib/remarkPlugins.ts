// Remark plugins (PRD §6.2, FR-04 wikilinks, FR-23 callouts).
// Operate on the mdast tree so source positions of other nodes stay valid.

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
  const split = splitCallout(blockquote);
  if (!split) {
    processCallouts(blockquote);
    return [blockquote];
  }
  const conf = CALLOUT_TYPES[split.type.toLowerCase()] ?? CALLOUT_TYPES.note;
  const open = {
    type: "html",
    value: `<div class="locus-callout locus-callout-${conf.css}"><div class="locus-callout-title">${conf.label}`,
  };
  const title: MdNode[] = [];
  if (split.title.length > 0) {
    title.push({ type: "html", value: " — " }, ...split.title);
  }
  const closeTitle = { type: "html", value: "</div>" };
  const close = { type: "html", value: "</div>" };
  const body = { type: "root", children: split.body };
  processCallouts(body);
  return [open, ...title, closeTitle, ...(body.children ?? []), close];
}

// The marker is only the first line. Later lines in the same paragraph are the body,
// and inline nodes on the title line (a wikilink, for example) stay in the title.
function splitCallout(blockquote: MdNode): { type: string; title: MdNode[]; body: MdNode[] } | null {
  const blocks = blockquote.children ?? [];
  const first = blocks[0];
  if (!first || first.type !== "paragraph") return null;
  const inline = first.children ?? [];
  const head = inline[0];
  if (!head || head.type !== "text" || typeof head.value !== "string") return null;
  const newline = head.value.indexOf("\n");
  const firstLine = newline >= 0 ? head.value.slice(0, newline) : head.value;
  const marker = firstLine.match(/^\[!([a-zA-Z-]+)\][ \t]*(.*)$/);
  if (!marker) return null;

  const title: MdNode[] = [];
  if (marker[2]) title.push({ type: "text", value: marker[2] });
  const bodyInline: MdNode[] = [];

  if (newline >= 0) {
    const after = head.value.slice(newline + 1);
    if (after) bodyInline.push({ type: "text", value: after });
    bodyInline.push(...inline.slice(1));
  } else {
    let consumedTitle = true;
    for (let i = 1; i < inline.length; i++) {
      const child = inline[i];
      if (consumedTitle && child.type === "text" && typeof child.value === "string" && child.value.includes("\n")) {
        const splitAt = child.value.indexOf("\n");
        const before = child.value.slice(0, splitAt);
        const after = child.value.slice(splitAt + 1);
        if (before) title.push({ type: "text", value: before });
        if (after) bodyInline.push({ type: "text", value: after });
        bodyInline.push(...inline.slice(i + 1));
        consumedTitle = false;
        break;
      }
      if (consumedTitle) title.push(child);
    }
  }

  const body: MdNode[] = [];
  const hasBodyInline = bodyInline.some(
    (node) => node.type !== "text" || String(node.value ?? "").trim() !== "",
  );
  if (hasBodyInline) body.push({ type: "paragraph", children: bodyInline });
  body.push(...blocks.slice(1));
  return { type: marker[1], title, body };
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
