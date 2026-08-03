import { PenLine } from "lucide-react";

export function EmptyState({ onNewNote, onOpenFile }: { onNewNote: () => void; onOpenFile: () => void }) {
  return (
    <div className="locus-anim-rise flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-locus-xl bg-locus-accent-soft text-locus-accent shadow-locus-card">
        <PenLine size={28} />
      </div>
      <h1 className="mt-6 font-locus-sans text-xl font-semibold tracking-tight text-locus-ink">
        Start writing
      </h1>
      <p className="mt-1.5 text-[14px] text-locus-ink-muted">
        or press <kbd className="rounded-locus-sm bg-locus-surface-hover px-1.5 py-0.5 font-mono text-[12px] text-locus-ink-secondary">Ctrl+P</kbd> to open a note
      </p>
      <button
        className="mt-6 flex items-center gap-2 rounded-locus-md bg-locus-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-locus-card transition-all duration-150 hover:bg-locus-accent/90 active:scale-95"
        onClick={onNewNote}
      >
        <PenLine size={16} />
        New Note
      </button>
      <button className="mt-3 text-[13px] text-locus-ink-muted underline-offset-2 hover:text-locus-ink hover:underline" onClick={onOpenFile}>
        Browse existing notes
      </button>
    </div>
  );
}
