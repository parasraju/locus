export interface NoteFile {
  relPath: string;
  name: string;
  isDir: boolean;
}

export function findNote(files: readonly NoteFile[], target: string): string | null {
  const normalized = target.trim().toLowerCase();
  if (!normalized) return null;
  const exact = files.find(
    (file) => !file.isDir && file.relPath.replace(/\.md$/i, "").toLowerCase() === normalized,
  );
  if (exact) return exact.relPath;
  const base = normalized.split("/").pop() ?? normalized;
  const match = files.find(
    (file) => !file.isDir && file.name.replace(/\.md$/i, "").toLowerCase() === base,
  );
  return match ? match.relPath : null;
}
