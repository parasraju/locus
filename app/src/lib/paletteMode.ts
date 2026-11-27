export type PaletteMode = "commands" | "files";

export function nextPaletteMode(
  current: PaletteMode,
  previousQuery: string,
  nextQuery: string,
): PaletteMode {
  if (nextQuery.startsWith("/")) return "files";
  if (current === "files" && previousQuery.startsWith("/")) return "commands";
  return current;
}
