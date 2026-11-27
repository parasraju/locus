export interface WikilinkOption {
  label: string;
  detail: string;
  apply: string;
}

export function wikilinkCompletion(
  matchText: string,
  paths: readonly string[],
): { fromOffset: number; options: WikilinkOption[] } | null {
  if (!/^\[\[[^\]\n]*$/.test(matchText)) return null;
  const typed = matchText.slice(2).toLowerCase();
  const options: WikilinkOption[] = [];
  for (const relPath of paths) {
    if (!relPath.toLowerCase().endsWith(".md")) continue;
    if (typed && !relPath.toLowerCase().includes(typed)) continue;
    const base = relPath.replace(/\.md$/i, "").split("/").pop() ?? relPath;
    options.push({ label: base, detail: relPath, apply: `[[${base}]]` });
    if (options.length >= 50) break;
  }
  return { fromOffset: 0, options };
}
