import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { moveToTrash } from "../electron/trash.cjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = "/opt/cursor/artifacts";

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      /* try the next one */
    }
  }
  throw new Error("Chrome is not installed");
}

async function writeRel(root, rel, text) {
  const full = path.join(root, ...rel.split("/"));
  await fsp.mkdir(path.dirname(full), { recursive: true });
  await fsp.writeFile(full, text, "utf8");
}

async function listFiles(root) {
  const out = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const relPath = path.relative(root, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        out.push({ relPath, name: entry.name, isDir: true });
        await walk(full);
      } else if (entry.isFile()) {
        const stat = await fsp.stat(full);
        out.push({ relPath, name: entry.name, isDir: false, size: stat.size, mtime: stat.mtimeMs });
      }
    }
  }
  await walk(root);
  return out;
}

function safeRel(relPath) {
  if (typeof relPath !== "string" || !relPath || relPath.includes("\0") || relPath.includes("..")) {
    throw new Error("Invalid path");
  }
  return relPath.replace(/^[/\\]+/, "");
}

async function waitFor(label, fn, timeoutMs = 8000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
      last = value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}: ${last}`);
}

test("renderer smoke: edit, preview, links, tasks, trash, focus, motion", { timeout: 180_000 }, async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "locus-smoke-"));
  const welcome = [
    "# Welcome",
    "",
    "See [[Other]] and [[Missing]].",
    "",
    "> [!note] Custom",
    "> Callout body stays.",
    "",
    "- [ ] dash task",
    "* [ ] star task",
    "",
    "Inline $E = mc^2$ and invalid $\\frac{$.",
    "",
    "$$",
    "a^2 + b^2 = c^2",
    "$$",
    "",
    "```mermaid",
    "graph TD",
    "  A-->B",
    "```",
    "",
    "```mermaid",
    "not a diagram",
    "```",
    "",
  ].join("\n");
  await writeRel(root, "Welcome.md", welcome);
  await writeRel(root, "Other.md", "# Other\n\nThe other note.\n");
  await writeRel(root, "a/Ideas.md", "from a\n");
  await writeRel(root, "b/Ideas.md", "from b\n");

  const settings = { theme: "dark", favorites: [], recentVaults: [root] };
  const themeSets = [];
  let active = null;

  const server = await createServer({
    configFile: path.join(appRoot, "vite.config.ts"),
    server: { host: "127.0.0.1", port: 5199, strictPort: false },
    logLevel: "error",
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0];
  assert.ok(url, "vite did not report a local url");

  const browser = await chromium.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("dialog", (dialog) => dialog.accept());

  try {
    await page.exposeFunction("__locus", async (op, payload) => {
      if (op === "settings.get") {
        return settings[payload.key] === undefined ? payload.fallback : settings[payload.key];
      }
      if (op === "settings.set") {
        settings[payload.key] = payload.value;
        if (payload.key === "theme") themeSets.push(payload.value);
        return true;
      }
      if (op === "vault.recent") return settings.recentVaults;
      if (op === "vault.open") {
        active = payload.path;
        const files = await listFiles(active);
        return { path: active, count: files.filter((file) => !file.isDir).length };
      }
      if (op === "vault.close") {
        active = null;
        return true;
      }
      if (op === "vault.removeRecent") {
        settings.recentVaults = settings.recentVaults.filter((item) => item !== payload.path);
        return true;
      }
      if (!active) throw new Error("No active vault");
      const rel = payload.relPath ? safeRel(payload.relPath) : "";
      const full = rel ? path.join(active, ...rel.split("/")) : active;
      if (op === "fs.list") return listFiles(active);
      if (op === "fs.read") {
        try {
          return await fsp.readFile(full, "utf8");
        } catch {
          return null;
        }
      }
      if (op === "fs.write") {
        await fsp.mkdir(path.dirname(full), { recursive: true });
        await fsp.writeFile(full, String(payload.content ?? ""), "utf8");
        return true;
      }
      if (op === "fs.createNote") {
        if (existsSync(full)) throw new Error("Already exists");
        await fsp.mkdir(path.dirname(full), { recursive: true });
        await fsp.writeFile(full, String(payload.content ?? ""), "utf8");
        return true;
      }
      if (op === "fs.createFolder") {
        await fsp.mkdir(full, { recursive: true });
        return true;
      }
      if (op === "fs.rename") {
        const next = safeRel(payload.newRel);
        await fsp.rename(full, path.join(active, ...next.split("/")));
        return { rewritten: 0 };
      }
      if (op === "fs.trash") {
        await moveToTrash({ vaultRoot: active, relPath: rel });
        return true;
      }
      if (op === "fs.reveal") return true;
      if (op === "search.notes") return [];
      throw new Error(`Unknown op ${op}`);
    });

    await page.addInitScript(() => {
      const call = (op, payload) => window.__locus(op, payload ?? {});
      window.locus = {
        settings: {
          get: (key, fallback) => call("settings.get", { key, fallback }),
          set: (key, value) => call("settings.set", { key, value }),
        },
        vault: {
          recent: () => call("vault.recent"),
          pickFolder: () => call("vault.pickFolder"),
          create: (parent, name) => call("vault.create", { parent, name }),
          open: (folder) => call("vault.open", { path: folder }),
          close: () => call("vault.close"),
          removeRecent: (folder) => call("vault.removeRecent", { path: folder }),
        },
        fs: {
          list: () => call("fs.list"),
          read: (relPath) => call("fs.read", { relPath }),
          write: (relPath, content) => call("fs.write", { relPath, content }),
          createNote: (relPath, content) => call("fs.createNote", { relPath, content }),
          createFolder: (relPath) => call("fs.createFolder", { relPath }),
          rename: (oldRel, newRel) => call("fs.rename", { relPath: oldRel, newRel }),
          trash: (relPath) => call("fs.trash", { relPath }),
          reveal: (relPath) => call("fs.reveal", { relPath }),
        },
        search: {
          notes: (query, opts) => call("search.notes", { query, opts }),
        },
        on: {
          fsChanged: (cb) => {
            const listener = () => cb();
            window.addEventListener("locus-fs", listener);
            return () => window.removeEventListener("locus-fs", listener);
          },
          themeToggle: (cb) => {
            const listener = (event) => cb(event.detail);
            window.addEventListener("locus-theme", listener);
            return () => window.removeEventListener("locus-theme", listener);
          },
        },
      };
    });

    await page.goto(url);
    await page.getByRole("button", { name: root, exact: true }).click();
    await page.locator(".cm-content").waitFor();
    assert.match(await page.locator(".cm-content").innerText(), /Welcome/);

    const motionBefore = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "locus-anim-fade";
      document.body.appendChild(el);
      const name = getComputedStyle(el).animationName;
      el.remove();
      return name;
    });
    assert.equal(motionBefore, "locus-fade");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const motionAfter = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "locus-anim-fade";
      document.body.appendChild(el);
      const name = getComputedStyle(el).animationName;
      el.remove();
      return name;
    });
    assert.equal(motionAfter, "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" ENDMARK");
    await page.keyboard.press("Control+KeyS");
    await waitFor("ENDMARK saved", async () => {
      const text = await fsp.readFile(path.join(root, "Welcome.md"), "utf8");
      return text.includes("ENDMARK") ? text : "";
    });

    await page.keyboard.type(" FASTMARK");
    await page.locator("button.flex-1", { hasText: "Other.md" }).click();
    await waitFor("FASTMARK saved on the note that was left", async () => {
      const text = await fsp.readFile(path.join(root, "Welcome.md"), "utf8");
      return text.includes("FASTMARK") ? text : "";
    });
    const other = await fsp.readFile(path.join(root, "Other.md"), "utf8");
    assert.equal(other.includes("FASTMARK"), false);
    assert.equal(other.includes("ENDMARK"), false);
    await waitFor("other note is showing", async () => {
      const text = await page.locator(".cm-content").innerText();
      return text.includes("The other note") && !text.includes("FASTMARK") ? text : "";
    });

    await page.locator("button.flex-1", { hasText: "Welcome.md" }).click();
    await waitFor("welcome editor", async () => {
      const text = await page.locator(".cm-content").innerText();
      return text.includes("ENDMARK") ? text : "";
    });

    async function modeText() {
      return (await page.locator("span.w-12").innerText()).trim();
    }
    async function cycleTo(label) {
      for (let i = 0; i < 3; i++) {
        if ((await modeText()) === label) return;
        await page.keyboard.press("Control+KeyE");
        await page.waitForTimeout(50);
      }
      assert.equal(await modeText(), label);
    }
    assert.equal(await modeText(), "Source");
    await page.keyboard.press("Control+KeyE");
    await waitFor("split mode", async () => (await modeText()) === "Split");
    assert.equal(await page.locator(".cm-editor").count(), 1);
    assert.match(await page.locator(".locus-callout-title").innerText(), /Note/);
    assert.match(await page.locator(".locus-callout-title").innerText(), /Custom/);
    assert.equal((await page.locator(".locus-callout-title").innerText()).includes("Callout body"), false);
    assert.match(await page.locator(".locus-prose").innerText(), /Callout body stays/);

    await page.keyboard.press("Control+KeyE");
    await waitFor("reading mode", async () => (await modeText()) === "Reading");
    assert.equal(await page.locator(".cm-editor").count(), 0);
    await page.locator(".katex").first().waitFor();
    assert.ok((await page.locator(".katex-error").count()) >= 1);
    await page.locator(".locus-mermaid svg").first().waitFor({ timeout: 30_000 });
    await page.locator(".locus-mermaid-error").waitFor({ timeout: 30_000 });
    await fsp.mkdir(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, "reading-preview.png") });

    const working = page.locator("a.locus-wikilink", { hasText: "Other" });
    assert.equal(await working.evaluate((el) => el.classList.contains("locus-wikilink-missing")), false);
    await working.click();
    await waitFor("followed wikilink", async () => {
      if ((await page.locator(".cm-content").count()) === 0) return "";
      const text = await page.locator(".cm-content").innerText();
      return text.includes("The other note") ? text : "";
    });

    await page.locator("button.flex-1", { hasText: "Welcome.md" }).click();
    await cycleTo("Reading");
    const missing = page.locator("a.locus-wikilink-missing", { hasText: "Missing" });
    await missing.waitFor();
    await missing.click();
    await waitFor("missing-note toast", async () => {
      const text = await page.locator("body").innerText();
      return text.includes('No note named "Missing"') ? text : "";
    });

    const boxes = page.locator('.locus-prose input[type="checkbox"]');
    await boxes.nth(0).click();
    await waitFor("first task saved", async () => {
      const text = await fsp.readFile(path.join(root, "Welcome.md"), "utf8");
      return text.includes("- [x] dash task") ? text : "";
    });
    await boxes.nth(1).click();
    await waitFor("task marks saved", async () => {
      const text = await fsp.readFile(path.join(root, "Welcome.md"), "utf8");
      if (text.includes("- [x] dash task") && text.includes("* [x] star task")) return text;
      throw new Error(text.split("\n").slice(0, 16).join(" | "));
    });

    await page.keyboard.press("Control+Shift+KeyL");
    await page.keyboard.press("Control+Shift+KeyL");
    assert.deepEqual(themeSets.slice(0, 2), ["light", "system"]);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");

    await page.keyboard.press("Control+KeyO");
    await page.getByPlaceholder("Open a note…").fill("Other");
    await page.keyboard.press("Enter");
    await waitFor("palette opened Other", async () => {
      const text = await page.locator(".cm-content").innerText();
      return text.includes("The other note") ? text : "";
    });

    await page.keyboard.press("Control+KeyN");
    await page.getByPlaceholder("Note name").fill("Created");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await waitFor("created note", async () => existsSync(path.join(root, "Created.md")));
    assert.match(await fsp.readFile(path.join(root, "Created.md"), "utf8"), /# Created/);

    await page.getByRole("button", { name: "a", exact: true }).click();
    const ideaA = page.locator("button.flex-1[title='a/Ideas.md']");
    await ideaA.hover();
    await ideaA.locator("xpath=ancestor::div[contains(@class,'group')]").getByLabel("Note actions").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "b", exact: true }).click();
    const ideaB = page.locator("button.flex-1[title='b/Ideas.md']");
    await ideaB.hover();
    await ideaB.locator("xpath=ancestor::div[contains(@class,'group')]").getByLabel("Note actions").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await waitFor("both ideas left the vault", async () => {
      const left = existsSync(path.join(root, "a", "Ideas.md")) || existsSync(path.join(root, "b", "Ideas.md"));
      return left ? "" : "gone";
    });
    const trashed = [];
    async function walkTrash(dir) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walkTrash(full);
        else trashed.push(await fsp.readFile(full, "utf8"));
      }
    }
    await walkTrash(path.join(root, ".locus", "trash"));
    trashed.sort();
    assert.deepEqual(trashed, ["from a\n", "from b\n"]);

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    const seen = [];
    let focused = null;
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return {
          tag: el.tagName,
          className: String(el.className).slice(0, 80),
          outline: style.outlineStyle,
          width: style.outlineWidth,
        };
      });
      seen.push(focused);
      if (focused && focused.outline === "solid" && focused.width !== "0px") break;
    }
    assert.ok(
      focused && focused.outline === "solid",
      `no focus ring after Tab: ${JSON.stringify(seen)}`,
    );
    await page.screenshot({ path: path.join(artifacts, "focus-ring.png") });

    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    await server.close();
    await fsp.rm(root, { recursive: true, force: true });
  }
});
