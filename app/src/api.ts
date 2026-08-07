import type { FlatEntry, SearchResult, Settings, Theme } from "./types";

interface LocusApi {
  settings: {
    get: (key: keyof Settings, fallback: unknown) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<boolean>;
  };
  vault: {
    recent: () => Promise<string[]>;
    pickFolder: () => Promise<string | null>;
    create: (parent: string, name: string) => Promise<string>;
    open: (path: string) => Promise<{ path: string; count: number }>;
    close: () => Promise<boolean>;
    removeRecent: (path: string) => Promise<boolean>;
  };
  fs: {
    list: () => Promise<FlatEntry[]>;
    read: (relPath: string) => Promise<string | null>;
    write: (relPath: string, content: string) => Promise<boolean>;
    createNote: (relPath: string, content: string) => Promise<boolean>;
    createFolder: (relPath: string) => Promise<boolean>;
    rename: (oldRel: string, newRel: string) => Promise<{ rewritten: number }>;
    trash: (relPath: string) => Promise<boolean>;
    reveal: (relPath: string) => Promise<boolean>;
  };
  search: {
    notes: (query: string, opts?: { caseSensitive?: boolean; regex?: boolean; folder?: string }) => Promise<SearchResult[]>;
  };
  on: {
    fsChanged: (cb: () => void) => () => void;
    themeToggle: (cb: (theme: Theme) => void) => () => void;
  };
}

declare global {
  interface Window {
    locus?: LocusApi;
  }
}

export function api(): LocusApi {
  if (!window.locus) {
    throw new Error(
      "Locus API unavailable. Run the app via `npm run dev:electron`, not in a plain browser.",
    );
  }
  return window.locus;
}

export const hasApi = Boolean(window.locus);
