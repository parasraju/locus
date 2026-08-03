"use strict";

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeTheme,
  session,
  Menu,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const chokidar = require("chokidar");

const IS_DEV = Boolean(process.env.VITE_DEV_SERVER_URL);
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

// ---------------------------------------------------------------------------
// Security policy (PRD §16)
// ---------------------------------------------------------------------------
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'";

const IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".locus",
  ".obsidian",
  ".trash",
]);

const MAX_INDEXED_ENTRIES = 200_000;
const MAX_SEARCH_FILES = 5_000;
const MAX_SEARCH_RESULTS = 200;
const CONTENT_CACHE_LIMIT = 500;

// ---------------------------------------------------------------------------
// Settings store (app user-data)
// ---------------------------------------------------------------------------
function settingsPath() {
  return path.join(app.getPath("userData"), "locus-settings.json");
}

function readSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function getSetting(key, fallback) {
  const s = readSettings();
  return s[key] === undefined ? fallback : s[key];
}

// ---------------------------------------------------------------------------
// Active vault state
// ---------------------------------------------------------------------------
let activeVault = null;
let watcher = null;
let cachedEntries = [];
let contentCache = new Map();

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Path safety (PRD §16.7 SS-20): canonicalize and refuse to escape vault root.
function safeResolve(relPath) {
  if (!activeVault) throw new Error("No active vault");
  const root = path.resolve(activeVault);
  const rel = String(relPath || "").replace(/^[/\\]+/, "");
  if (!rel || rel === ".") return root;
  const candidate = path.resolve(root, rel);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes vault root");
  }
  return candidate;
}

function isIgnored(entry) {
  return entry.name.startsWith(".") && IGNORED_DIRS.has(entry.name);
}

async function walkVault(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    if (out.length > MAX_INDEXED_ENTRIES) break;
    const dir = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue; // permission errors: skip subtree (PRD §8.3)
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const entry of entries) {
      if (isIgnored(entry)) continue;
      const full = path.join(dir, entry.name);
      const relPath = path.relative(root, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        out.push({ relPath, name: entry.name, isDir: true });
        stack.push(full);
      } else if (entry.isFile()) {
        let stat = null;
        try {
          stat = await fsp.stat(full);
        } catch {
          continue;
        }
        out.push({
          relPath,
          name: entry.name,
          isDir: false,
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      }
    }
  }
  return out;
}

async function refreshIndex() {
  if (!activeVault) return;
  cachedEntries = await walkVault(activeVault);
  contentCache = new Map();
}

function titleOf(content, name) {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    const t = fm[1].match(/^title:\s*(.+)$/m);
    if (t) return t[1].trim().replace(/^['"]|['"]$/g, "");
  }
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return name.replace(/\.md$/i, "");
}

async function readNote(relPath) {
  const full = safeResolve(relPath);
  try {
    const stat = await fsp.stat(full);
    const cached = contentCache.get(relPath);
    if (cached && cached.mtime === stat.mtimeMs) return cached.content;
    const content = await fsp.readFile(full, "utf8");
    if (contentCache.size >= CONTENT_CACHE_LIMIT) {
      contentCache.delete(contentCache.keys().next().value);
    }
    contentCache.set(relPath, { mtime: stat.mtimeMs, content });
    return content;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vault mutation helpers
// ---------------------------------------------------------------------------
async function writeFileAtomic(relPath, content) {
  const full = safeResolve(relPath);
  const dir = path.dirname(full);
  await fsp.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.locus-tmp-${process.pid}-${Date.now()}.tmp`);
  await fsp.writeFile(tmp, content, "utf8");
  await fsp.rename(tmp, full);
  contentCache.delete(relPath);
}

function ensureSafeName(name) {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "-").trim();
  if (!cleaned) throw new Error("Invalid name");
  return cleaned;
}

async function trashPath(relPath) {
  const full = safeResolve(relPath);
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(
    activeVault,
    ".locus",
    "trash",
    stamp,
    path.basename(full),
  );
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.rename(full, dest);
}

async function rewriteLinks(oldBase, newBase) {
  // PRD FR-02.3: rewrite [[OldBase]] / [[OldBase|...]] to the new base name.
  if (!oldBase || oldBase === newBase) return;
  const re = new RegExp(`\\[\\[${escapeRegExp(oldBase)}(\\]|\\|)`, "g");
  let rewritten = 0;
  for (const entry of cachedEntries) {
    if (entry.isDir || !entry.name.endsWith(".md")) continue;
    const content = await readNote(entry.relPath);
    if (content && re.test(content)) {
      const next = content.replace(re, `[[${newBase}$1`);
      await writeFileAtomic(entry.relPath, next);
      rewritten += 1;
    }
  }
  return rewritten;
}

// ---------------------------------------------------------------------------
// Search (PRD FR-08) — simple content+filename search over the cached index.
// Placeholder for the SQLite FTS engine (ADR-005); API-compatible.
// ---------------------------------------------------------------------------
async function searchNotes(query, opts = {}) {
  const q = String(query || "").trim();
  const caseSensitive = Boolean(opts.caseSensitive);
  const regex = Boolean(opts.regex);
  const folder = opts.folder ? String(opts.folder).replace(/^\/+|\/+$/g, "") : "";

  if (!q) return [];
  let needle;
  try {
    needle = regex
      ? new RegExp(q, caseSensitive ? "" : "i")
      : new RegExp(escapeRegExp(q), caseSensitive ? "" : "i");
  } catch {
    return [{ error: "Invalid regular expression" }];
  }

  const results = [];
  let scanned = 0;
  for (const entry of cachedEntries) {
    if (entry.isDir || !entry.name.endsWith(".md")) continue;
    if (folder && !entry.relPath.startsWith(folder + "/")) continue;
    if (++scanned > MAX_SEARCH_FILES) break;
    const content = (await readNote(entry.relPath)) || "";
    const nameMatch = needle.test(entry.name);
    const contentMatch = needle.test(content);
    if (!nameMatch && !contentMatch) continue;

    let snippet = "";
    const first = content.search(needle);
    if (first >= 0) {
      const start = Math.max(0, first - 60);
      snippet = content.slice(start, first + 120).replace(/\n+/g, " ");
    }
    results.push({
      relPath: entry.relPath,
      title: titleOf(content, entry.name),
      snippet,
      nameMatch,
      mtime: entry.mtime,
    });
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }
  return results;
}

// ---------------------------------------------------------------------------
// IPC gateway (PRD §16.1 SS-02/SS-17/SS-18/SS-19)
// ---------------------------------------------------------------------------
function registerIpc() {
  ipcMain.handle("settings:get", (_e, key, fallback) =>
    getSetting(key, fallback),
  );
  ipcMain.handle("settings:set", (_e, key, value) => {
    writeSettings({ [key]: value });
    return true;
  });

  ipcMain.handle("vault:recent", () => getSetting("recentVaults", []));
  ipcMain.handle("vault:pickFolder", async () => {
    const r = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });

  ipcMain.handle("vault:create", async (_e, parentPath, name) => {
    const cleaned = ensureSafeName(name);
    const dir = path.join(parentPath, cleaned);
    if (fs.existsSync(dir)) throw new Error("A folder with that name already exists");
    await fsp.mkdir(dir, { recursive: true });
    const welcome = path.join(dir, "Welcome.md");
    if (!fs.existsSync(welcome)) {
      await fsp.writeFile(
        welcome,
        "# Welcome to Locus\n\nYour notes are plain `.md` files on disk.\n\n- Type `Ctrl+P` for the command palette\n- Link ideas with `[[Another Note]]`\n- Enjoy the calm.\n",
        "utf8",
      );
    }
    return dir;
  });

  ipcMain.handle("vault:open", async (_e, vaultPath) => {
    const resolved = path.resolve(vaultPath);
    const stat = await fsp.stat(resolved);
    if (!stat.isDirectory()) throw new Error("Not a folder");
    await closeVaultInternal();
    activeVault = resolved;
    await refreshIndex();
    const recents = getSetting("recentVaults", []);
    writeSettings({
      recentVaults: [resolved, ...recents.filter((p) => p !== resolved)].slice(0, 25),
    });
    startWatcher();
    return { path: resolved, count: cachedEntries.filter((e) => !e.isDir).length };
  });

  ipcMain.handle("vault:close", async () => {
    await closeVaultInternal();
    return true;
  });

  ipcMain.handle("vault:removeRecent", (_e, p) => {
    writeSettings({ recentVaults: getSetting("recentVaults", []).filter((x) => x !== p) });
    return true;
  });

  ipcMain.handle("fs:list", () => cachedEntries);

  ipcMain.handle("fs:read", async (_e, relPath) => readNote(String(relPath)));

  ipcMain.handle("fs:write", async (_e, relPath, content) => {
    await writeFileAtomic(String(relPath), String(content));
    return true;
  });

  ipcMain.handle("fs:createNote", async (_e, relPath, content) => {
    const p = safeResolve(String(relPath));
    if (fs.existsSync(p)) throw new Error("Already exists");
    await writeFileAtomic(String(relPath), String(content ?? ""));
    return true;
  });

  ipcMain.handle("fs:createFolder", async (_e, relPath) => {
    await fsp.mkdir(safeResolve(String(relPath)), { recursive: true });
    return true;
  });

  ipcMain.handle("fs:rename", async (_e, oldRel, newRel) => {
    const src = safeResolve(String(oldRel));
    const dst = safeResolve(String(newRel));
    if (fs.existsSync(dst)) throw new Error("Destination already exists");
    await fsp.mkdir(path.dirname(dst), { recursive: true });
    await fsp.rename(src, dst);
    const oldBase = path.basename(String(oldRel)).replace(/\.md$/i, "");
    const newBase = path.basename(String(newRel)).replace(/\.md$/i, "");
    if (String(oldRel).toLowerCase().endsWith(".md")) {
      await rewriteLinks(oldBase, newBase);
    }
    await refreshIndex();
    return true;
  });

  ipcMain.handle("fs:trash", async (_e, relPath) => {
    await trashPath(String(relPath));
    await refreshIndex();
    return true;
  });

  ipcMain.handle("search:notes", async (_e, query, opts) => searchNotes(query, opts));

  ipcMain.handle("shell:reveal", (_e, relPath) => {
    const full = safeResolve(String(relPath));
    shell.showItemInFolder(full);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Watcher (PRD FR-02.5) — OS fs events, debounced broadcast
// ---------------------------------------------------------------------------
function startWatcher() {
  if (!activeVault || watcher) return;
  let timer = null;
  watcher = chokidar
    .watch(activeVault, {
      ignored: (p) => {
        const rel = path.relative(activeVault, p);
        const parts = rel.split(path.sep);
        return parts.some((part) => IGNORED_DIRS.has(part));
      },
      ignoreInitial: true,
      depth: 24,
    })
    .on("all", () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await refreshIndex();
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("fs:changed");
        }
      }, 400);
    });
}

async function closeVaultInternal() {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
  activeVault = null;
  cachedEntries = [];
  contentCache = new Map();
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#111315" : "#F7F8FA",
    show: false,
    title: "Locus",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (e) => e.preventDefault());

  if (IS_DEV) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  return win;
}

function buildMenu(win) {
  const template = [
    ...(process.platform === "darwin"
      ? [{ role: "appMenu" }]
      : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Theme",
          accelerator: "CmdOrCtrl+Shift+L",
          click: () => {
            const next = nativeTheme.shouldUseDarkColors ? "light" : "dark";
            nativeTheme.themeSource = next;
            win.webContents.send("theme:toggle", next);
          },
        },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  registerIpc();
  const win = createWindow();
  buildMenu(win);

  if (!IS_DEV) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [CSP],
        },
      });
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (err) => {
  console.error("[locus] uncaught", err);
});
