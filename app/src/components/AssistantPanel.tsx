import { useMemo, useState } from "react";
import { Sparkles, X, FileText, ListTree, Quote, Timer } from "lucide-react";
import { wordCount, readingTimeMinutes, paragraphCount } from "../lib/format";

interface AssistantPanelProps {
  title: string;
  content: string;
  onClose: () => void;
}

function summarize(text: string): string[] {
  const clean = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`~|-]/g, "");
  const paras = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 24);
  const points: string[] = [];
  for (const p of paras) {
    const firstSentence = p.split(/(?<=[.!?])\s+/)[0].slice(0, 140);
    if (firstSentence && !points.includes(firstSentence)) points.push(firstSentence);
    if (points.length >= 5) break;
  }
  return points.length ? points : ["Note is too short to summarize."];
}

function keyHeadings(text: string): string[] {
  const re = /^#{2,4}\s+(.+)$/gm;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1].trim());
  return out.length ? out : ["No subheadings found."];
}

export function AssistantPanel({ title, content, onClose }: AssistantPanelProps) {
  const [result, setResult] = useState<{ label: string; lines: string[] } | null>(null);
  const stats = useMemo(
    () => ({ words: wordCount(content), time: readingTimeMinutes(content), paras: paragraphCount(content) }),
    [content],
  );

  const actions = [
    { label: "Summarize", icon: <FileText size={14} />, run: () => setResult({ label: "Summary", lines: summarize(content) }) },
    { label: "Key headings", icon: <ListTree size={14} />, run: () => setResult({ label: "Headings", lines: keyHeadings(content) }) },
    { label: "First quote", icon: <Quote size={14} />, run: () => {
      const m = content.match(/^>\s+(.+)$/m);
      setResult({ label: "Quote", lines: [m ? m[1].trim() : "No blockquote found."] });
    } },
    { label: "Reading time", icon: <Timer size={14} />, run: () => setResult({ label: "Stats", lines: [`${stats.words} words · ${stats.time} min read · ${stats.paras} paragraphs`] }) },
  ];

  return (
    <div className="locus-anim-pop absolute bottom-16 right-4 z-40 w-80 overflow-hidden rounded-locus-xl border border-locus-border bg-locus-surface shadow-locus-pop">
      <div className="flex items-center gap-2 border-b border-locus-border bg-locus-sidebar/60 px-3 py-2.5">
        <Sparkles size={14} className="text-locus-accent" />
        <span className="flex-1 truncate text-[13px] font-semibold text-locus-ink">Assistant</span>
        <span className="text-[10px] text-locus-ink-muted">local</span>
        <button className="text-locus-ink-muted hover:text-locus-ink" onClick={onClose} aria-label="Close assistant">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-locus-ink-muted">
          <FileText size={12} />
          <span className="truncate">{title || "No note"}</span>
        </div>
        {!content ? (
          <p className="text-[12px] text-locus-ink-muted">Open a note to use the assistant.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {actions.map((a) => (
                <button
                  key={a.label}
                  className="flex items-center gap-1.5 rounded-locus-md bg-locus-sidebar px-2.5 py-2 text-[12px] font-medium text-locus-ink-secondary transition-colors hover:bg-locus-surface-hover hover:text-locus-ink"
                  onClick={a.run}
                >
                  <span className="text-locus-accent">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
            {result && (
              <div className="locus-anim-rise mt-1 rounded-locus-md border border-locus-border bg-locus-sidebar/60 p-2.5">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-locus-ink-muted">
                  {result.label}
                </div>
                <ul className="flex flex-col gap-1 text-[12px] text-locus-ink-secondary">
                  {result.lines.map((l, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-locus-accent">•</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
