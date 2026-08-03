import type { ReactNode } from "react";
import type { ToolbarFormat } from "../lib/formatActions";
import {
  Search,
  Undo2,
  Redo2,
  Sparkles,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Code,
  Link2,
  Table,
  ListTodo,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image,
  Command,
} from "lucide-react";

const baseBtn =
  "flex h-8 w-8 items-center justify-center rounded-locus-sm text-locus-ink-secondary transition-colors duration-150 hover:bg-locus-surface-hover hover:text-locus-ink active:scale-95";

function GroupDivider() {
  return <div className="mx-1 h-4 w-px bg-locus-border" />;
}

function ToolButton({
  label,
  children,
  onClick,
  accent,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      className={baseBtn}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <span className={accent ? "text-locus-accent" : ""}>{children}</span>
    </button>
  );
}

export function Toolbar({
  visible,
  onFormat,
  onSearch,
  onAssistant,
  onPalette,
}: {
  visible: boolean;
  onFormat: (kind: ToolbarFormat) => void;
  onSearch: () => void;
  onAssistant: () => void;
  onPalette: () => void;
}) {
  return (
    <div
      className={`absolute left-1/2 top-4 z-30 -translate-x-1/2 transition-all duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-0.5 rounded-locus-lg border border-locus-border bg-locus-surface/90 px-1.5 py-1 shadow-locus-card backdrop-blur-md">
        <ToolButton label="Search (Ctrl+P)" onClick={onSearch}>
          <Search size={15} />
        </ToolButton>
        <ToolButton label="Undo (Ctrl+Z)" onClick={() => onFormat("undo")}>
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={() => onFormat("redo")}>
          <Redo2 size={15} />
        </ToolButton>
        <GroupDivider />
        <ToolButton label="AI Assistant" onClick={onAssistant} accent>
          <Sparkles size={15} />
        </ToolButton>
        <GroupDivider />
        <ToolButton label="Heading 1" onClick={() => onFormat("h1")}>
          <Heading1 size={16} />
        </ToolButton>
        <ToolButton label="Heading 2" onClick={() => onFormat("h2")}>
          <Heading2 size={16} />
        </ToolButton>
        <ToolButton label="Heading 3" onClick={() => onFormat("h3")}>
          <Heading3 size={16} />
        </ToolButton>
        <GroupDivider />
        <ToolButton label="Bold (Ctrl+B)" onClick={() => onFormat("bold")}>
          <Bold size={15} />
        </ToolButton>
        <ToolButton label="Italic (Ctrl+I)" onClick={() => onFormat("italic")}>
          <Italic size={15} />
        </ToolButton>
        <ToolButton label="Underline" onClick={() => onFormat("underline")}>
          <Underline size={15} />
        </ToolButton>
        <ToolButton label="Inline code" onClick={() => onFormat("code")}>
          <Code size={15} />
        </ToolButton>
        <ToolButton label="Link" onClick={() => onFormat("link")}>
          <Link2 size={15} />
        </ToolButton>
        <GroupDivider />
        <ToolButton label="Insert table" onClick={() => onFormat("table")}>
          <Table size={15} />
        </ToolButton>
        <ToolButton label="Checklist" onClick={() => onFormat("task")}>
          <ListTodo size={15} />
        </ToolButton>
        <ToolButton label="Bullet list" onClick={() => onFormat("ul")}>
          <List size={15} />
        </ToolButton>
        <ToolButton label="Numbered list" onClick={() => onFormat("ol")}>
          <ListOrdered size={15} />
        </ToolButton>
        <ToolButton label="Quote" onClick={() => onFormat("quote")}>
          <Quote size={15} />
        </ToolButton>
        <ToolButton label="Divider" onClick={() => onFormat("divider")}>
          <Minus size={15} />
        </ToolButton>
        <ToolButton label="Insert image" onClick={() => onFormat("image")}>
          <Image size={15} />
        </ToolButton>
        <GroupDivider />
        <ToolButton label="Command palette (Ctrl+P)" onClick={onPalette}>
          <Command size={15} />
        </ToolButton>
      </div>
    </div>
  );
}
