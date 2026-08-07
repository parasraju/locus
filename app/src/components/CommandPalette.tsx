import { useEffect, useMemo, useRef, useState } from "react";
import type { Command, FlatEntry } from "../types";
import { FileText, Command as CommandIcon, CornerDownLeft, Search } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  files: FlatEntry[];
  mode: "commands" | "files";
  onClose: () => void;
  onOpenFile: (relPath: string) => void;
  onSwitchMode: (mode: "commands" | "files") => void;
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx >= 0) return 100 - idx;
  let score = 0;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 10;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

export function CommandPalette({
  open,
  commands,
  files,
  mode,
  onClose,
  onOpenFile,
  onSwitchMode,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim();
    if (mode === "files" || !q || q.startsWith("/")) {
      const needFile = mode === "files" || q.startsWith("/");
      const needle = (needFile ? q.replace(/^\//, "") : q).toLowerCase();
      return files
        .filter((f) => !f.isDir && f.name.endsWith(".md"))
        .map((f) => ({
          kind: "file" as const,
          id: `file:${f.relPath}`,
          title: f.name.replace(/\.md$/i, ""),
          detail: f.relPath,
          relPath: f.relPath,
        }))
        .filter((r) => !needle || fuzzyScore(needle, r.title) >= 0 || r.detail.toLowerCase().includes(needle))
        .slice(0, 50)
        .sort((a, b) => {
          const sa = needle ? fuzzyScore(needle, a.title) : 50;
          const sb = needle ? fuzzyScore(needle, b.title) : 50;
          return sb - sa;
        });
    }
    return commands
      .map((c) => ({
        kind: "command" as const,
        id: `cmd:${c.id}`,
        title: c.title,
        detail: c.category,
        hint: c.hint,
        cmd: c,
      }))
      .filter((r) => fuzzyScore(q, r.title) >= 0 || fuzzyScore(q, r.detail) >= 0)
      .sort((a, b) => fuzzyScore(q, b.title) - fuzzyScore(q, a.title))
      .slice(0, 30);
  }, [query, mode, commands, files]);

  useEffect(() => setSelected(0), [query, mode]);

  if (!open) return null;

  function run(index: number) {
    const r = results[index];
    if (!r) return;
    if (r.kind === "file") onOpenFile(r.relPath);
    else r.cmd!.run();
    onClose();
  }

  return (
    <div
      className="locus-anim-fade fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[14vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="locus-anim-pop w-full max-w-xl overflow-hidden rounded-locus-xl border border-locus-border bg-locus-surface shadow-locus-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-locus-border px-4">
          {mode === "files" ? (
            <Search size={16} className="shrink-0 text-locus-ink-muted" />
          ) : (
            <CommandIcon size={16} className="shrink-0 text-locus-ink-muted" />
          )}
          <input
            ref={inputRef}
            className="w-full bg-transparent py-3.5 text-[15px] text-locus-ink placeholder:text-locus-ink-muted focus:outline-none"
            placeholder={mode === "files" ? "Open a note…" : "Type a command or note name…"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.startsWith("/")) onSwitchMode("files");
              else onSwitchMode("commands");
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter") {
                run(selected);
              } else if (e.key === "Escape") {
                onClose();
              } else if (e.key === "/") {
                onSwitchMode("files");
              }
            }}
          />
          {mode === "files" && (
            <span className="shrink-0 rounded-locus-sm bg-locus-border-soft px-1.5 py-0.5 text-[10px] text-locus-ink-muted">
              / files
            </span>
          )}
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-locus-ink-muted">
              No matches. Try a different query.
            </li>
          )}
          {results.map((r, i) => (
            <li
              key={r.id}
              className={`flex cursor-pointer items-center gap-2.5 rounded-locus-md px-2.5 py-2 text-[14px] transition-colors ${
                i === selected ? "bg-locus-accent-soft text-locus-ink" : "text-locus-ink-secondary"
              }`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => run(i)}
            >
              {r.kind === "file" ? (
                <FileText size={15} className="shrink-0 text-locus-ink-muted" />
              ) : (
                <CommandIcon size={15} className="shrink-0 text-locus-ink-muted" />
              )}
              <span className="truncate">{r.title}</span>
              {r.kind === "file" && r.detail && (
                <span className="ml-auto truncate font-mono text-[11px] text-locus-ink-muted">{r.detail}</span>
              )}
              {r.kind === "command" && (
                <span className="ml-auto flex items-center gap-2">
                  {r.hint && (
                    <span className="rounded-locus-sm bg-locus-border-soft px-1.5 py-0.5 text-[10px] text-locus-ink-muted">
                      {r.hint}
                    </span>
                  )}
                  {i === selected && <CornerDownLeft size={13} className="text-locus-ink-muted" />}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 border-t border-locus-border px-4 py-2 text-[11px] text-locus-ink-muted">
          <span className="flex items-center gap-1"><span className="rounded bg-locus-border-soft px-1">↑↓</span> navigate</span>
          <span className="flex items-center gap-1"><span className="rounded bg-locus-border-soft px-1">↵</span> run</span>
          <span className="flex items-center gap-1"><span className="rounded bg-locus-border-soft px-1">/</span> files</span>
          <span className="ml-auto flex items-center gap-1"><span className="rounded bg-locus-border-soft px-1">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
