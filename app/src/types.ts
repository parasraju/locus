export interface FlatEntry {
  relPath: string;
  name: string;
  isDir: boolean;
  size?: number;
  mtime?: number;
}

export interface SearchResult {
  relPath: string;
  title: string;
  snippet: string;
  nameMatch: boolean;
  mtime?: number;
  error?: string;
}

export type Theme = "light" | "dark" | "system";

export interface Settings {
  theme: Theme;
  recentVaults: string[];
  favorites: string[];
}

export type EditorMode = "source" | "split" | "reading";

export interface Tab {
  relPath: string;
  name: string;
  mode: EditorMode;
  dirty: boolean;
}

export interface Command {
  id: string;
  title: string;
  category: string;
  hint?: string;
  run: () => void;
}
