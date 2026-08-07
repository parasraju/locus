export function stripFrontmatter(content: string): string {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? content.slice(m[0].length) : content;
}

export function titleOf(content: string, name: string): string {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    const t = fm[1].match(/^title:\s*(.+)$/m);
    if (t) return t[1].trim().replace(/^['"]|['"]$/g, "");
  }
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return name.replace(/\.md$/i, "");
}

function stripCodeAndFrontmatter(content: string): string {
  return stripFrontmatter(content).replace(/```[\s\S]*?```/g, " ");
}

export function wordCount(content: string): number {
  const text = stripCodeAndFrontmatter(content);
  const words = text.match(/[\p{L}\p{N}]+(?:[''-][\p{L}\p{N}]+)*/gu) ?? [];
  return words.length;
}

export function paragraphCount(content: string): number {
  return stripCodeAndFrontmatter(content)
    .split(/\n{2,}/)
    .filter((p) => p.trim()).length;
}

export function readingTimeMinutes(content: string): number {
  const wpm = 220;
  return Math.max(1, Math.round(wordCount(content) / wpm));
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatBytes(n?: number): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
