import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, hasApi } from "./api";
import type { Command, EditorMode, FlatEntry, Tab, Theme } from "./types";
import { todayIso } from "./lib/format";
import type { ToolbarFormat } from "./lib/formatActions";
import { VaultGate } from "./components/VaultGate";
import { Explorer } from "./components/Explorer";
import { EditorPane, type EditorPaneHandle } from "./components/EditorPane";
import { CommandPalette } from "./components/CommandPalette";
import { StatusBar } from "./components/StatusBar";
import { RightPanel } from "./components/RightPanel";
import { Toolbar } from "./components/Toolbar";
import { PromptModal, type PromptRequest } from "./components/PromptModal";
import { AssistantPanel } from "./components/AssistantPanel";
import { EmptyState } from "./components/EmptyState";
import { X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  kind: "info" | "error";
}

const MODE_ORDER: EditorMode[] = ["source", "reading"];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [noApi, setNoApi] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [vault, setVault] = useState<string | null>(null);
  const [files, setFiles] = useState<FlatEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeRel, setActiveRel] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"commands" | "files">("commands");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prompt, setPrompt] = useState<PromptRequest | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toolbarHover, setToolbarHover] = useState(false);
  const [toolbarTyping, setToolbarTyping] = useState(false);
  const editorRef = useRef<EditorPaneHandle | null>(null);

  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());

  // ---- theme ----
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    if (!hasApi) {
      setNoApi(true);
      setReady(true);
      return;
    }
    (async () => {
      const t = (await api().settings.get("theme", "dark")) as Theme;
      setTheme(t);
      const favs = (await api().settings.get("favorites", [])) as string[];
      setFavorites(favs);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!hasApi) return;
    return api().on.themeToggle((t) => {
      setTheme(t);
      api().settings.set("theme", t);
    });
  }, []);

  useEffect(() => {
    if (!hasApi) return;
    return api().on.fsChanged(() => {
      refreshFiles();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault]);

  const toast = useCallback((message: string, kind: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  // ---- vault ----
  async function refreshFiles() {
    if (!vault) return;
    try {
      setFiles(await api().fs.list());
    } catch (e) {
      toast(String((e as Error).message ?? e), "error");
    }
  }

  async function openVault(path: string) {
    try {
      const res = await api().vault.open(path);
      setVault(res.path);
      setTabs([]);
      setActiveRel(null);
      setContent("");
      setDirty(false);
      await refreshFiles();
      const list = await api().fs.list();
      const welcome = list.find((f) => !f.isDir && f.name === "Welcome.md");
      const first = list.find((f) => !f.isDir && f.name.endsWith(".md"));
      if (welcome) await openNote(welcome.relPath);
      else if (first) await openNote(first.relPath);
    } catch (e) {
      toast(String((e as Error).message ?? e), "error");
    }
  }

  async function openNote(relPath: string) {
    if (!vault) return;
    try {
      if (activeRel && activeRel !== relPath && dirty) {
        await api().fs.write(activeRel, content);
      }
      setTabs((prev) => {
        const existing = prev.find((t) => t.relPath === relPath);
        if (existing) return prev;
        return [...prev, { relPath, name: relPath.split("/").pop() ?? relPath, mode: "source", dirty: false }];
      });
      setActiveRel(relPath);
      const c = await api().fs.read(relPath);
      setContent(c ?? "");
      setDirty(false);
    } catch (e) {
      toast(String((e as Error).message ?? e), "error");
    }
  }

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave(relPath: string, text: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api()
        .fs.write(relPath, text)
        .then((ok) => {
          if (ok) {
            setDirty((d) => (activeRel === relPath ? false : d));
            setTabs((prev) => prev.map((t) => (t.relPath === relPath ? { ...t, dirty: false } : t)));
          } else {
            toast("Save failed — changes kept in memory", "error");
          }
        })
        .catch(() => toast("Save failed — changes kept in memory", "error"));
    }, 800);
  }

  function handleChange(next: string) {
    if (!activeRel) return;
    setContent(next);
    setDirty(true);
    setTabs((prev) => prev.map((t) => (t.relPath === activeRel ? { ...t, dirty: true } : t)));
    scheduleSave(activeRel, next);
  }

  const contentRef = useRef(content);
  contentRef.current = content;
  const activeRelRef = useRef(activeRel);
  activeRelRef.current = activeRel;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  function requestSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const rel = activeRelRef.current;
    if (rel && dirtyRef.current) {
      api()
        .fs.write(rel, contentRef.current)
        .then((ok) => {
          if (ok) {
            setDirty(false);
            setTabs((prev) => prev.map((t) => (t.relPath === rel ? { ...t, dirty: false } : t)));
          }
        })
        .catch(() => toast("Save failed — changes kept in memory", "error"));
    }
  }

  function closeTab(relPath: string) {
    if (relPath === activeRel && dirty) {
      api().fs.write(relPath, content).catch(() => toast("Save failed", "error"));
    }
    setTabs((prev) => {
      const next = prev.filter((t) => t.relPath !== relPath);
      if (activeRel === relPath) {
        const neighbor = next[next.length - 1];
        if (neighbor) {
          setActiveRel(neighbor.relPath);
          api().fs.read(neighbor.relPath).then((c) => setContent(c ?? ""));
          setDirty(false);
        } else {
          setActiveRel(null);
          setContent("");
          setDirty(false);
        }
      }
      return next;
    });
  }

  function cycleMode() {
    const tab = tabs.find((t) => t.relPath === activeRel);
    if (!tab) return;
    const next = MODE_ORDER[(MODE_ORDER.indexOf(tab.mode) + 1) % MODE_ORDER.length];
    setTabs((prev) => prev.map((t) => (t.relPath === activeRel ? { ...t, mode: next } : t)));
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    setTheme(next);
    if (hasApi) api().settings.set("theme", next);
  }

  async function newNote(folder = "") {
    if (!vault) return;
    setPrompt({
      title: folder ? `New note in ${folder}` : "New note",
      placeholder: "Note name",
      initial: "Untitled",
      onSubmit: async (name) => {
        const rel = folder ? `${folder}/${name}.md` : `${name}.md`;
        try {
          await api().fs.createNote(rel, `# ${name}\n\n`);
        } catch {
          // File already exists — just open it
        }
        await refreshFiles();
        await openNote(rel);
      },
    });
  }

  async function newFolder(folder = "") {
    if (!vault) return;
    setPrompt({
      title: folder ? `New folder in ${folder}` : "New folder",
      placeholder: "Folder name",
      onSubmit: (name) => {
        const rel = folder ? `${folder}/${name}` : name;
        api()
          .fs.createFolder(rel)
          .then(async () => {
            await refreshFiles();
          })
          .catch((e) => toast(String((e as Error).message ?? e), "error"));
      },
    });
  }

  async function openDaily() {
    if (!vault) return;
    const name = todayIso();
    const rel = `${name}.md`;
    try {
      await api().fs.createNote(rel, `# ${name}\n\n`);
    } catch {
      // File already exists — just open it
    }
    await refreshFiles();
    await openNote(rel);
  }

  async function renameFile(oldRel: string, newRel: string) {
    try {
      const { rewritten } = await api().fs.rename(oldRel, newRel);
      await refreshFiles();
      setTabs((prev) => prev.map((t) => (t.relPath === oldRel ? { ...t, relPath: newRel, name: newRel.split("/").pop() ?? newRel } : t)));
      if (activeRel === oldRel) setActiveRel(newRel);
      if (rewritten > 0) {
        toast(`Renamed and updated ${rewritten} link${rewritten > 1 ? "s" : ""}`);
      } else {
        toast("Renamed");
      }
    } catch (e) {
      toast(String((e as Error).message ?? e), "error");
    }
  }

  async function deleteFile(relPath: string) {
    if (!window.confirm(`Move "${relPath}" to trash?`)) return;
    try {
      await api().fs.trash(relPath);
      setFavorites((prev) => {
        const next = prev.filter((x) => x !== relPath);
        api().settings.set("favorites", next);
        return next;
      });
      await refreshFiles();
      closeTab(relPath);
      toast("Moved to trash");
    } catch (e) {
      toast(String((e as Error).message ?? e), "error");
    }
  }

  function toggleFavorite(relPath: string) {
    setFavorites((prev) => {
      const next = prev.includes(relPath) ? prev.filter((x) => x !== relPath) : [...prev, relPath];
      api().settings.set("favorites", next);
      return next;
    });
  }

  async function reveal(relPath: string) {
    try {
      await api().fs.reveal(relPath);
    } catch {
      /* ignore */
    }
  }

  function openByTitle(target: string) {
    const normalized = target.toLowerCase();
    const hit = files.find((f) => !f.isDir && f.relPath.replace(/\.md$/i, "").toLowerCase() === normalized);
    if (hit) {
      openNote(hit.relPath);
    } else {
      const base = normalized.split("/").pop() ?? normalized;
      const match = files.find((f) => !f.isDir && f.name.replace(/\.md$/i, "").toLowerCase() === base);
      if (match) openNote(match.relPath);
      else toast(`Note "${target}" not found — create it?`);
    }
  }

  function onTaskToggle(offset: number, checked: boolean) {
    if (offset < 0) return;
    setContent((prev) => {
      const lines = prev.split("\n");
      let acc = 0;
      for (let i = 0; i < lines.length; i++) {
        const start = acc;
        acc += lines[i].length + 1;
        if (offset >= start && offset < acc) {
          lines[i] = lines[i].replace(/^\s*-\s+\[[ xX]\]/, (m) =>
            m.replace(/\[[ xX]\]/, checked ? "[x]" : "[ ]"),
          );
          break;
        }
      }
      return lines.join("\n");
    });
  }

  function outlineJump(offset: number) {
    editorRef.current?.scrollToOffset(offset);
  }

  function handleFormat(kind: ToolbarFormat) {
    editorRef.current?.format(kind);
  }

  const commands: Command[] = useMemo(
    () => [
      { id: "open-note", title: "Open note…", category: "File", run: () => setPaletteMode("files") },
      { id: "new-note", title: "New note", category: "File", hint: "Ctrl+N", run: () => newNote() },
      { id: "daily", title: "Open daily note", category: "File", hint: "Ctrl+J", run: () => openDaily() },
      { id: "save", title: "Save note", category: "File", hint: "Ctrl+S", run: () => editorRef.current?.saveNow() },
      { id: "cycle-mode", title: "Cycle editor mode", category: "View", hint: "Ctrl+E", run: () => cycleMode() },
      { id: "toggle-sidebar", title: "Toggle sidebar", category: "View", hint: "Ctrl+Shift+S", run: () => setShowSidebar((s) => !s) },
      { id: "toggle-panel", title: "Toggle panel", category: "View", hint: "Ctrl+Shift+E", run: () => setShowRight((s) => !s) },
      { id: "toggle-theme", title: "Toggle theme", category: "Appearance", hint: "Ctrl+Shift+L", run: () => toggleTheme() },
      { id: "close-vault", title: "Close vault", category: "Vault", run: () => api().vault.close().then(() => setVault(null)) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vault, tabs, activeRel],
  );

  // ---- global keyboard (PRD §11) ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "p") {
        e.preventDefault();
        setPaletteMode("commands");
        setPaletteOpen(true);
      } else if (k === "o") {
        e.preventDefault();
        setPaletteMode("files");
        setPaletteOpen(true);
      } else if (e.shiftKey && k === "s") {
        e.preventDefault();
        setShowSidebar((s) => !s);
      } else if (e.shiftKey && k === "e") {
        e.preventDefault();
        setShowRight((s) => !s);
      } else if (e.shiftKey && k === "l") {
        e.preventDefault();
        toggleTheme();
      } else if (k === "e") {
        e.preventDefault();
        cycleMode();
      } else if (k === "s") {
        e.preventDefault();
        editorRef.current?.saveNow();
      } else if (k === "n") {
        e.preventDefault();
        newNote();
      } else if (k === "j") {
        e.preventDefault();
        openDaily();
      } else if (k === "w") {
        e.preventDefault();
        if (activeRel) closeTab(activeRel);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRel, vault]);

  const activeTab = tabs.find((t) => t.relPath === activeRel);
  const activeMode = activeTab?.mode ?? "source";
  const vaultName = vault ? vault.split(/[\\/]/).pop() ?? vault : "";

  const toolbarVisible = Boolean(activeRel) && toolbarHover && !toolbarTyping;

  if (!ready) return <div className="flex h-full items-center justify-center bg-locus-bg text-locus-ink-muted">Locus…</div>;
  if (noApi) {
    return (
      <div className="flex h-full items-center justify-center bg-locus-bg p-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-locus-ink">Locus</h1>
          <p className="mt-2 text-locus-ink-muted">
            This page must run inside the desktop app. Start it with{" "}
            <code className="rounded-locus-sm bg-locus-border-soft px-1 py-0.5 font-mono">npm run dev:electron</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-locus-bg text-locus-ink">
      {!vault ? (
        <VaultGate onOpenVault={openVault} />
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1">
            {showSidebar && (
              <aside className="w-[280px] shrink-0">
                <Explorer
                  files={files}
                  activeRelPath={activeRel}
                  favorites={favorites}
                  vaultName={vaultName}
                  dark={dark}
                  onOpen={openNote}
                  onNewNote={newNote}
                  onNewFolder={newFolder}
                  onRename={renameFile}
                  onDelete={deleteFile}
                  onToggleFavorite={toggleFavorite}
                  onReveal={reveal}
                  onToggleTheme={toggleTheme}
                  onCloseVault={() => api().vault.close().then(() => setVault(null))}
                />
              </aside>
            )}

            <main
              className="relative flex min-w-0 flex-1 flex-col"
              onMouseEnter={() => setToolbarHover(true)}
              onMouseLeave={() => setToolbarHover(false)}
              onMouseMove={() => setToolbarTyping(false)}
              onKeyDown={() => setToolbarTyping(true)}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-locus-border px-2 pt-1.5 scrollbar-hidden">
                {tabs.map((t) => (
                  <div
                    key={t.relPath}
                    className={`group flex max-w-[220px] cursor-pointer items-center gap-1.5 rounded-locus-md px-3 py-1.5 text-[12.5px] transition-colors ${
                      t.relPath === activeRel
                        ? "bg-locus-surface text-locus-ink shadow-locus-card"
                        : "text-locus-ink-muted hover:bg-locus-surface-hover hover:text-locus-ink"
                    }`}
                    onClick={() => openNote(t.relPath)}
                  >
                    <span className="truncate">{t.name}</span>
                    {t.dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-locus-warning" />}
                    <button
                      className="ml-0.5 hidden text-locus-ink-muted hover:text-locus-danger group-hover:inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(t.relPath);
                      }}
                      title="Close tab"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {activeRel && (
                <Toolbar
                  visible={toolbarVisible}
                  onFormat={handleFormat}
                  onSearch={() => {
                    setPaletteMode("files");
                    setPaletteOpen(true);
                  }}
                  onAssistant={() => setAssistantOpen((s) => !s)}
                  onPalette={() => {
                    setPaletteMode("commands");
                    setPaletteOpen(true);
                  }}
                />
              )}

              <div className="min-h-0 flex-1">
                {activeRel && (
                  <EditorPane
                    key={activeRel}
                    relPath={activeRel}
                    name={activeTab?.name ?? ""}
                    content={content}
                    mode={activeMode}
                    files={files}
                    dark={dark}
                    onChange={handleChange}
                    onOpenNote={openByTitle}
                    onTaskToggle={onTaskToggle}
                    onRequestSave={requestSave}
                    innerRef={editorRef}
                  />
                )}
                {!activeRel && (
                  <EmptyState
                    onNewNote={() => newNote()}
                    onOpenFile={() => {
                      setPaletteMode("files");
                      setPaletteOpen(true);
                    }}
                  />
                )}
              </div>
              </div>
            </main>

            {showRight && (
              <RightPanel
                files={files}
                activeRelPath={activeRel}
                activeContent={content}
                onOpenNote={openNote}
                onOutlineJump={outlineJump}
              />
            )}
          </div>

          <StatusBar
            vaultName={vaultName}
            noteName={activeTab?.name ?? null}
            content={content}
            mode={activeMode}
            dirty={dirty}
            dark={dark}
            onCycleMode={cycleMode}
            onToggleTheme={toggleTheme}
            onToggleSidebar={() => setShowSidebar((s) => !s)}
            onToggleRight={() => setShowRight((s) => !s)}
          />
        </>
      )}

      {assistantOpen && activeRel && (
        <AssistantPanel
          title={activeTab?.name ?? ""}
          content={content}
          onClose={() => setAssistantOpen(false)}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        files={files}
        mode={paletteMode}
        onClose={() => setPaletteOpen(false)}
        onOpenFile={openNote}
        onSwitchMode={setPaletteMode}
      />

      <PromptModal request={prompt} onClose={() => setPrompt(null)} />

      <div className="pointer-events-none fixed bottom-8 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`locus-anim-rise pointer-events-auto rounded-locus-md border px-3 py-2 text-[13px] shadow-locus-card ${
              t.kind === "error"
                ? "border-locus-danger/40 bg-locus-surface text-locus-danger"
                : "border-locus-border bg-locus-surface text-locus-ink"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
