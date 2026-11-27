"use strict";

function titleOf(content, name) {
  const text = typeof content === "string" ? content : "";
  const fallback = typeof name === "string" ? name : "";
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (fm) {
    const t = fm[1].match(/^title:\s*(.+)$/m);
    if (t) return t[1].trim().replace(/^['"]|['"]$/g, "");
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return fallback.replace(/\.md$/i, "");
}

module.exports = { titleOf };
