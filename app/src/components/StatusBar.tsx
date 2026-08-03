import type { EditorMode } from "../types";
import type { ReactNode } from "react";
import { wordCount, readingTimeMinutes } from "../lib/format";
import { Eye, PanelLeft, PanelRight, Moon, Sun, CircleDot } from "lucide-react";

interface StatusBarProps {
  vaultName: string;
  noteName: string | null;
  content: string;
  mode: EditorMode;
  dirty: boolean;
  dark: boolean;
  onCycleMode: () => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onToggleRight: () => void;
}

export function StatusBar(props: StatusBarProps) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-locus-border bg-locus-sidebar px-3 text-[11px] text-locus-ink-muted">
      <span className="truncate font-medium text-locus-ink-secondary">{props.vaultName}</span>
      {props.noteName && (
        <span className="flex min-w-0 items-center gap-1.5">
          {props.dirty && <CircleDot size={11} className="shrink-0 text-locus-warning" />}
          <span className="truncate">{props.noteName}</span>
        </span>
      )}
      {props.noteName && (
        <span className="hidden shrink-0 sm:inline">
          {wordCount(props.content)} words · {readingTimeMinutes(props.content)} min read
        </span>
      )}
      <span className="ml-auto flex items-center gap-0.5">
        <StatusBtn onClick={props.onToggleSidebar} title="Toggle sidebar (Ctrl+Shift+S)">
          <PanelLeft size={13} />
        </StatusBtn>
        <StatusBtn onClick={props.onToggleRight} title="Toggle panel (Ctrl+Shift+E)">
          <PanelRight size={13} />
        </StatusBtn>
        <StatusBtn onClick={props.onCycleMode} title="Cycle editor mode (Ctrl+E)">
          <Eye size={13} />
        </StatusBtn>
        <StatusBtn onClick={props.onToggleTheme} title="Toggle theme (Ctrl+Shift+L)">
          {props.dark ? <Sun size={13} /> : <Moon size={13} />}
        </StatusBtn>
        <span className="ml-1 hidden w-12 text-[11px] md:inline">{modeLabel(props.mode)}</span>
      </span>
    </div>
  );
}

function modeLabel(mode: EditorMode): string {
  return mode === "source" ? "Source" : mode === "split" ? "Split" : "Reading";
}

function StatusBtn({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="flex h-5 w-6 items-center justify-center rounded-locus-sm text-locus-ink-muted transition-colors hover:bg-locus-surface-hover hover:text-locus-ink"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
