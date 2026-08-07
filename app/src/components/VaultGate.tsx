import { useEffect, useState } from "react";
import { api } from "../api";
import { FolderOpen, FolderPlus, History, X } from "lucide-react";
import icon from "../assets/icon.png";

interface VaultGateProps {
  onOpenVault: (path: string) => void;
}

export function VaultGate({ onOpenVault }: VaultGateProps) {
  const [recents, setRecents] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [parentPath, setParentPath] = useState<string | null>(null);

  useEffect(() => {
    api().vault.recent().then(setRecents).catch(() => {});
  }, []);

  async function openFolder() {
    setBusy("pick");
    try {
      const folder = await api().vault.pickFolder();
      if (folder) onOpenVault(folder);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function pickParent() {
    const folder = await api().vault.pickFolder();
    if (folder) setParentPath(folder);
  }

  async function createVault() {
    if (!parentPath || !createName.trim()) return;
    setBusy("create");
    try {
      const path = await api().vault.create(parentPath, createName.trim());
      onOpenVault(path);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function removeRecent(p: string) {
    await api().vault.removeRecent(p);
    setRecents((r) => r.filter((x) => x !== p));
  }

  return (
    <div className="locus-anim-fade flex h-full items-center justify-center bg-locus-bg px-6">
      <div className="locus-anim-rise w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <img
            src={icon}
            alt="Locus"
            className="h-14 w-14 rounded-locus-xl shadow-locus-card"
            draggable={false}
          />
          <h1 className="mt-5 text-[30px] font-semibold tracking-tight text-locus-ink">Locus</h1>
          <p className="mt-1.5 text-[14px] text-locus-ink-muted">
            Fast, local-first Markdown knowledge workspace. Your notes are plain files on disk.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-locus-md bg-locus-accent text-[15px] font-semibold text-white shadow-locus-card transition-all duration-150 hover:bg-locus-accent/90 active:scale-[0.98] disabled:opacity-50"
            onClick={openFolder}
            disabled={busy !== null}
          >
            <FolderOpen size={17} />
            {busy === "pick" ? "Opening…" : "Open folder as vault"}
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-locus-md border border-locus-border bg-locus-surface text-[15px] font-semibold text-locus-ink transition-colors hover:bg-locus-surface-hover"
            onClick={() => setCreateOpen(true)}
          >
            <FolderPlus size={17} />
            Create a new vault
          </button>
        </div>

        {createOpen && (
          <div className="locus-anim-rise mt-4 rounded-locus-lg border border-locus-border bg-locus-surface p-4 shadow-locus-card">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-locus-md border border-locus-border bg-locus-bg px-3 py-2 text-[14px] text-locus-ink focus:border-locus-accent focus:outline-none"
                placeholder="Vault name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createVault()}
                autoFocus
              />
              <button
                className="rounded-locus-md border border-locus-border px-3 py-2 text-[13px] text-locus-ink-secondary transition-colors hover:bg-locus-surface-hover"
                onClick={pickParent}
              >
                {parentPath ? "Change" : "Choose location"}
              </button>
            </div>
            {parentPath && (
              <p className="mt-2 truncate text-[12px] text-locus-ink-muted" title={parentPath}>
                {parentPath}
              </p>
            )}
            <button
              className="mt-3 h-10 w-full rounded-locus-md bg-locus-accent text-[14px] font-semibold text-white transition-colors hover:bg-locus-accent/90 disabled:opacity-50"
              disabled={!parentPath || !createName.trim() || busy !== null}
              onClick={createVault}
            >
              {busy === "create" ? "Creating…" : "Create vault"}
            </button>
          </div>
        )}

        {recents.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-locus-ink-muted">
              <History size={12} />
              Recent vaults
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {recents.map((p) => (
                <li key={p} className="group flex items-center gap-2">
                  <button
                    className="flex-1 truncate rounded-locus-md px-3 py-1.5 text-left text-[14px] text-locus-ink-secondary transition-colors hover:bg-locus-surface-hover hover:text-locus-ink"
                    title={p}
                    onClick={() => onOpenVault(p)}
                  >
                    {p}
                  </button>
                  <button
                    className="hidden text-locus-ink-muted hover:text-locus-danger group-hover:inline"
                    onClick={() => removeRecent(p)}
                    title="Forget this vault (files are untouched)"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-locus-md border border-locus-danger/40 bg-locus-danger/10 p-2 text-[13px] text-locus-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
