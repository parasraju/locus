import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FlatEntry } from "../types";
import { api } from "../api";
import { wordCount, readingTimeMinutes, paragraphCount, titleOf } from "../lib/format";
import { ListTree, Link2, FileText, Tags, Hash } from "lucide-react";

type PanelTab = "outline" | "links" | "properties";

interface RightPanelProps {
  files: FlatEntry[];
  activeRelPath: string | null;
  activeContent: string;
  onOpenNote: (relPath: string) => void;
  onOutlineJump: (offset: number) => void;
}

interface Heading {
  level: number;
  text: string;
  offset: number;
}

function extractHeadings(content: string): Heading[] {
  const out: Heading[] = [];
  const re = /^(#{1,6})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    out.push({ level: m[1].length, text: m[2].trim(), offset: m.index });
  }
  return out;
}

function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const re = /#([\p{L}\p{N}_/-]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const t = m[1];
    if (!/^(note|warning|danger|success|info)$/.test(t)) tags.add(t);
  }
  return [...tags];
}

export function RightPanel({
  files,
  activeRelPath,
  activeContent,
  onOpenNote,
  onOutlineJump,
}: RightPanelProps) {
  const [tab, setTab] = useState<PanelTab>("outline");
  const headings = useMemo(() => extractHeadings(activeContent), [activeContent]);
  const tags = useMemo(() => extractTags(activeContent), [activeContent]);
  const activeName = activeRelPath ? activeRelPath.split("/").pop() ?? "" : "";
  const title = activeRelPath
    ? titleOf(activeContent, activeName)
    : "";
  const modified = activeRelPath
    ? files.find((f) => f.relPath === activeRelPath)?.mtime
    : undefined;

  return (
    <div className="flex h-full w-72 flex-col bg-locus-sidebar">
      <div className="flex gap-1 border-b border-locus-border px-2 pt-2">
        {(
          [
            { id: "outline", label: "Outline", icon: <ListTree size={14} /> },
            { id: "links", label: "Links", icon: <Link2 size={14} /> },
            { id: "properties", label: "Properties", icon: <FileText size={14} /> },
          ] as { id: PanelTab; label: string; icon: ReactNode }[]
        ).map((t) => (
          <button
            key={t.id}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-locus-sm border-b-2 px-2 py-2 text-[12px] transition-colors ${
              tab === t.id
                ? "border-locus-accent font-semibold text-locus-ink"
                : "border-transparent text-locus-ink-muted hover:text-locus-ink"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === "outline" && (
          <div className="flex flex-col gap-0.5">
            {headings.length === 0 && (
              <p className="px-2 py-4 text-center text-[12px] text-locus-ink-muted">
                No headings yet — use a <span className="font-mono"># Heading</span> to build an outline.
              </p>
            )}
            {headings.map((h, i) => (
              <button
                key={i}
                className="group flex items-center gap-2 rounded-locus-sm px-2 py-1 text-left text-[13px] text-locus-ink-secondary transition-colors hover:bg-locus-surface-hover hover:text-locus-ink"
                style={{ paddingLeft: 8 + (h.level - 1) * 14 }}
                onClick={() => onOutlineJump(h.offset)}
              >
                <Hash size={11} className="shrink-0 text-locus-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="truncate">{h.text}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "links" && (
          <div>
            {activeRelPath ? (
              <BacklinkList name={activeName.replace(/\.md$/i, "")} onOpen={onOpenNote} />
            ) : (
              <p className="px-2 py-4 text-center text-[12px] text-locus-ink-muted">
                Open a note to see its backlinks.
              </p>
            )}
          </div>
        )}

        {tab === "properties" && (
          <div className="flex flex-col gap-1">
            {activeRelPath && (
              <>
                <Property label="Title" value={title} />
                <Property label="Path" value={activeRelPath} mono />
                {typeof modified === "number" && (
                  <Property label="Modified" value={new Date(modified).toLocaleString()} />
                )}
                <div className="my-2 border-t border-locus-border" />
                <Property label="Words" value={String(wordCount(activeContent))} />
                <Property label="Reading time" value={`${readingTimeMinutes(activeContent)} min`} />
                <Property label="Paragraphs" value={String(paragraphCount(activeContent))} />
                {tags.length > 0 && (
                  <>
                    <div className="my-2 border-t border-locus-border" />
                    <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-locus-ink-muted">
                      <Tags size={11} />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1 px-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-locus-full bg-locus-accent-soft px-2 py-0.5 text-[11px] text-locus-accent"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {!activeRelPath && (
              <p className="px-2 py-4 text-center text-[12px] text-locus-ink-muted">
                Open a note to see its properties.
              </p>
            )}
          </div>
        )}
      </div>

      {activeRelPath && (
        <div className="border-t border-locus-border px-3 py-2 text-[11px] text-locus-ink-muted">
          {wordCount(activeContent)} words · {readingTimeMinutes(activeContent)} min read
        </div>
      )}
    </div>
  );
}

function Property({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-locus-sm bg-locus-surface px-2.5 py-1.5">
      <span className="shrink-0 text-[11px] text-locus-ink-muted">{label}</span>
      <span
        className={`min-w-0 truncate text-right text-[12px] text-locus-ink-secondary ${
          mono ? "font-mono text-[11px]" : ""
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function BacklinkList({ name, onOpen }: { name: string; onOpen: (relPath: string) => void }) {
  const [items, setItems] = useState<{ relPath: string; linked: boolean }[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await api().search.notes(name, { caseSensitive: false });
        if (cancelled || !Array.isArray(results)) return;
        const rows = await Promise.all(
          results.map(async (r) => {
            const content = await api().fs.read(r.relPath);
            return {
              relPath: r.relPath,
              linked: content ? content.includes(`[[${name}`) : false,
            };
          }),
        );
        if (!cancelled) {
          setItems(rows.filter((i) => i.relPath !== undefined));
          setTitle(name);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  const linked = items.filter((i) => i.linked);
  const unlinked = items.filter((i) => !i.linked);

  if (items.length === 0) {
    return <p className="px-2 py-4 text-center text-[12px] text-locus-ink-muted">No mentions found for “{title || name}”.</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-locus-ink-muted">
        Linked ({linked.length})
      </div>
      {linked.map((i) => (
        <button
          key={i.relPath}
          className="truncate rounded-locus-sm px-2 py-1 text-left text-[13px] text-locus-accent hover:bg-locus-surface-hover"
          onClick={() => onOpen(i.relPath)}
        >
          {i.relPath}
        </button>
      ))}
      {linked.length === 0 && (
        <p className="px-2 pb-2 text-[12px] text-locus-ink-muted">No linked mentions.</p>
      )}
      <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-locus-ink-muted">
        Unlinked ({unlinked.length})
      </div>
      {unlinked.map((i) => (
        <button
          key={i.relPath}
          className="truncate rounded-locus-sm px-2 py-1 text-left text-[13px] text-locus-ink-secondary hover:bg-locus-surface-hover"
          onClick={() => onOpen(i.relPath)}
        >
          {i.relPath}
        </button>
      ))}
      {unlinked.length === 0 && (
        <p className="px-2 pb-2 text-[12px] text-locus-ink-muted">No unlinked mentions.</p>
      )}
    </div>
  );
}
