import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FlatEntry } from "../types";
import { formatBytes } from "../lib/format";
import {
  Search,
  Plus,
  FilePlus2,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Star,
  Clock,
  Settings,
  Palette,
  LogOut,
  FolderGit2,
} from "lucide-react";

interface TreeNode {
  relPath: string;
  name: string;
  isDir: boolean;
  size?: number;
  mtime?: number;
  children: Map<string, TreeNode>;
}

function buildTree(entries: FlatEntry[]): TreeNode {
  const root: TreeNode = {
    relPath: "",
    name: "",
    isDir: true,
    children: new Map(),
  };
  for (const e of entries) {
    const parts = e.relPath.split("/");
    let node = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      const isLast = i === parts.length - 1;
      let child = node.children.get(parts[i]);
      if (!child) {
        child = {
          relPath: acc,
          name: parts[i],
          isDir: isLast ? e.isDir : true,
          size: isLast ? e.size : undefined,
          mtime: isLast ? e.mtime : undefined,
          children: new Map(),
        };
        node.children.set(parts[i], child);
      }
      node = child;
    }
  }
  return root;
}

function sortChildren(node: TreeNode, by: "name" | "mtime"): TreeNode[] {
  const arr = Array.from(node.children.values());
  arr.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    if (by === "mtime") return (b.mtime ?? 0) - (a.mtime ?? 0);
    return a.name.localeCompare(b.name);
  });
  return arr;
}

interface ExplorerProps {
  files: FlatEntry[];
  activeRelPath: string | null;
  favorites: string[];
  vaultName: string;
  dark: boolean;
  onOpen: (relPath: string) => void;
  onNewNote: (folder: string) => void;
  onNewFolder: (folder: string) => void;
  onRename: (oldRel: string, newRel: string) => void;
  onDelete: (relPath: string) => void;
  onToggleFavorite: (relPath: string) => void;
  onReveal: (relPath: string) => void;
  onToggleTheme: () => void;
  onCloseVault: () => void;
}

export function Explorer(props: ExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([""]));
  const [filter, setFilter] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tree = useMemo(() => buildTree(props.files), [props.files]);

  const recentNotes = useMemo(() => {
    return props.files
      .filter((f) => !f.isDir && f.name.endsWith(".md"))
      .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
      .slice(0, 5);
  }, [props.files]);

  function toggleExpand(relPath: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(relPath)) next.delete(relPath);
      else next.add(relPath);
      return next;
    });
  }

  function startRename(relPath: string) {
    setRenaming(relPath);
    setRenameValue(relPath.split("/").pop() ?? relPath);
    setMenuFor(null);
  }

  function commitRename() {
    if (renaming && renameValue) {
      const parts = renaming.split("/");
      parts[parts.length - 1] = renameValue;
      props.onRename(renaming, parts.join("/"));
    }
    setRenaming(null);
  }

  function renderRow(node: TreeNode, depth: number): ReactNode {
    const isActive = node.relPath === props.activeRelPath;
    const isFav = props.favorites.includes(node.relPath);
    const isOpen = expanded.has(node.relPath);
    const children = sortChildren(node, "name");

    return (
      <div key={node.relPath || "/"}>
        <div
          className={`group relative flex items-center gap-1 rounded-locus-sm py-0.5 pr-1 text-[13px] transition-colors duration-150 ${
            isActive
              ? "bg-locus-accent-soft text-locus-ink"
              : "text-locus-ink-secondary hover:bg-locus-surface-hover"
          }`}
          style={{ paddingLeft: depth * 14 + 6 }}
        >
          <button
            className="flex h-5 w-4 items-center justify-center text-locus-ink-muted"
            onClick={() => toggleExpand(node.relPath)}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {node.isDir ? (
              isOpen ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )
            ) : null}
          </button>
          <span className={node.isDir ? "text-locus-accent/80" : "text-locus-ink-muted"}>
            {node.isDir ? (
              isOpen ? (
                <FolderOpen size={14} />
              ) : (
                <Folder size={14} />
              )
            ) : node.name.endsWith(".md") ? (
              <FileText size={14} />
            ) : (
              <FileText size={14} className="opacity-60" />
            )}
          </span>
          <button
            className="flex-1 truncate text-left"
            onClick={() => (node.isDir ? toggleExpand(node.relPath) : props.onOpen(node.relPath))}
            title={node.relPath}
          >
            {renaming === node.relPath ? (
              <input
                autoFocus
                className="w-full rounded-locus-sm border border-locus-accent bg-locus-surface px-1 text-locus-ink"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(null);
                }}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={node.isDir ? "font-medium" : ""}>{node.name}</span>
            )}
          </button>
          {!node.isDir && node.size != null && (
            <span className="hidden shrink-0 text-[11px] text-locus-ink-muted group-hover:inline">
              {formatBytes(node.size)}
            </span>
          )}
          <button
            className={`hidden shrink-0 text-locus-ink-muted group-hover:inline ${isFav ? "!inline text-locus-warning" : ""}`}
            onClick={() => props.onToggleFavorite(node.relPath)}
            title={isFav ? "Remove favorite" : "Favorite"}
          >
            <Star size={13} fill={isFav ? "currentColor" : "none"} />
          </button>
          <button
            className="hidden shrink-0 text-locus-ink-muted group-hover:inline"
            onClick={(e) => {
              e.stopPropagation();
              setMenuFor(menuFor === node.relPath ? null : node.relPath);
            }}
            title="Actions"
          >
            <Plus size={13} className="rotate-45" />
          </button>
        </div>

        {menuFor === node.relPath && (
          <div
            className="locus-anim-pop z-20 ml-6 mt-0.5 flex flex-col gap-0.5 rounded-locus-md border border-locus-border bg-locus-surface p-1 text-[12px] shadow-locus-card"
            onClick={(e) => e.stopPropagation()}
          >
            {node.isDir && (
              <>
                <MenuItem label="New note" icon={<FilePlus2 size={13} />} onClick={() => { props.onNewNote(node.relPath); setMenuFor(null); }} />
                <MenuItem label="New folder" icon={<FolderPlus size={13} />} onClick={() => { props.onNewFolder(node.relPath); setMenuFor(null); }} />
              </>
            )}
            <MenuItem label="Rename" onClick={() => startRename(node.relPath)} />
            <MenuItem label={isFav ? "Unfavorite" : "Favorite"} icon={<Star size={13} />} onClick={() => { props.onToggleFavorite(node.relPath); setMenuFor(null); }} />
            <MenuItem label="Reveal in OS" onClick={() => { props.onReveal(node.relPath); setMenuFor(null); }} />
            <MenuItem label="Delete" danger onClick={() => { props.onDelete(node.relPath); setMenuFor(null); }} />
          </div>
        )}

        {node.isDir && isOpen && children.map((c) => renderRow(c, depth + 1))}
      </div>
    );
  }

  const favoritesRows = props.favorites
    .filter((f) => props.files.some((e) => e.relPath === f))
    .map((f) => (
      <button
        key={f}
        className="flex w-full items-center gap-2 rounded-locus-sm px-2 py-1 text-[13px] text-locus-ink-secondary transition-colors hover:bg-locus-surface-hover hover:text-locus-ink"
        onClick={() => props.onOpen(f)}
        title={f}
      >
        <Star size={12} className="shrink-0 text-locus-warning" fill="currentColor" />
        <span className="truncate">{f.split("/").pop()}</span>
      </button>
    ));

  return (
    <div className="flex h-full flex-col bg-locus-sidebar">
      <div className="px-3 pb-2 pt-3">
        <button
          className="flex w-full items-center gap-2 rounded-locus-md px-2 py-1.5 transition-colors hover:bg-locus-surface-hover"
          onClick={() => setSettingsOpen((s) => !s)}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-locus-sm bg-locus-accent-soft text-locus-accent">
            <FolderGit2 size={14} />
          </span>
          <span className="flex-1 truncate text-left text-[13px] font-semibold text-locus-ink">
            {props.vaultName}
          </span>
          <ChevronDown size={14} className="text-locus-ink-muted" />
        </button>
      </div>

      <div className="px-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-locus-ink-muted" />
          <input
            className="w-full rounded-locus-md border border-locus-border bg-locus-surface py-1.5 pl-8 pr-7 text-[13px] text-locus-ink placeholder:text-locus-ink-muted focus:border-locus-accent focus:outline-none"
            placeholder="Filter files…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-locus-ink-muted hover:text-locus-ink"
              onClick={() => setFilter("")}
              title="Clear filter"
            >
              <Plus size={13} className="rotate-45" />
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            className="flex items-center justify-center gap-1.5 rounded-locus-md border border-locus-border bg-locus-surface py-1.5 text-[12px] font-medium text-locus-ink-secondary transition-colors hover:border-locus-accent hover:text-locus-ink"
            onClick={() => props.onNewNote("")}
            title="New note (Ctrl+N)"
          >
            <FilePlus2 size={13} /> Note
          </button>
          <button
            className="flex items-center justify-center gap-1.5 rounded-locus-md border border-locus-border bg-locus-surface py-1.5 text-[12px] font-medium text-locus-ink-secondary transition-colors hover:border-locus-accent hover:text-locus-ink"
            onClick={() => props.onNewFolder("")}
            title="New folder"
          >
            <FolderPlus size={13} /> Folder
          </button>
        </div>
      </div>

      {favoritesRows.length > 0 && (
        <div className="mt-3 px-1">
          <SectionLabel icon={<Star size={11} />} label="Favorites" />
          <div className="flex flex-col gap-0.5 px-1.5">{favoritesRows}</div>
        </div>
      )}

      {recentNotes.length > 0 && !filter && (
        <div className="mt-3 px-1">
          <SectionLabel icon={<Clock size={11} />} label="Recent" />
          <div className="flex flex-col gap-0.5 px-1.5">
            {recentNotes.map((f) => (
              <button
                key={f.relPath}
                className={`flex items-center gap-2 truncate rounded-locus-sm px-2 py-1 text-[13px] transition-colors hover:bg-locus-surface-hover ${
                  f.relPath === props.activeRelPath
                    ? "bg-locus-accent-soft text-locus-ink"
                    : "text-locus-ink-secondary"
                }`}
                onClick={() => props.onOpen(f.relPath)}
                title={f.relPath}
              >
                <FileText size={12} className="shrink-0 text-locus-ink-muted" />
                <span className="truncate">{f.relPath}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-3 my-2 border-t border-locus-border" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1.5 pb-2">
        {sortChildren(tree, "name").map((c) => renderRow(c, 0))}
        {props.files.length === 0 && (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-locus-lg bg-locus-accent-soft text-locus-accent">
              <FilePlus2 size={20} />
            </div>
            <p className="mt-3 text-[13px] text-locus-ink-secondary">Vault is empty</p>
            <button
              className="mt-2 text-[13px] font-medium text-locus-accent hover:underline"
              onClick={() => props.onNewNote("")}
            >
              Create your first note
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-locus-border p-2">
        <button
          className="flex w-full items-center gap-2 rounded-locus-md px-2 py-1.5 text-[13px] text-locus-ink-secondary transition-colors hover:bg-locus-surface-hover hover:text-locus-ink"
          onClick={() => setSettingsOpen((s) => !s)}
        >
          <Settings size={15} className="text-locus-ink-muted" />
          <span className="flex-1 text-left">Settings</span>
          <ChevronRight size={13} className="text-locus-ink-muted" />
        </button>
      </div>

      {settingsOpen && (
        <div
          className="absolute bottom-14 left-2 z-30 w-56 locus-anim-pop rounded-locus-md border border-locus-border bg-locus-surface p-1 shadow-locus-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem label={props.dark ? "Light theme" : "Dark theme"} icon={<Palette size={13} />} onClick={() => { props.onToggleTheme(); setSettingsOpen(false); }} />
          <MenuItem label="Close vault" icon={<LogOut size={13} />} onClick={() => { props.onCloseVault(); setSettingsOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-locus-ink-muted">
      {icon}
      {label}
    </div>
  );
}

function MenuItem({
  label,
  icon,
  danger,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-center gap-2 rounded-locus-sm px-2 py-1.5 text-left text-[12px] transition-colors ${
        danger
          ? "text-locus-danger hover:bg-locus-danger/10"
          : "text-locus-ink-secondary hover:bg-locus-surface-hover hover:text-locus-ink"
      }`}
      onClick={onClick}
    >
      {icon && <span className="text-locus-ink-muted">{icon}</span>}
      <span className="flex-1">{label}</span>
    </button>
  );
}
