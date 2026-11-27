import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const electron = path.join(appRoot, "node_modules", "electron", "dist", "electron");
const notesDir = path.join(appRoot, "..", "docs", "qa");

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function bigNote() {
  const lines = ["# Big", ""];
  for (let i = 0; i < 5000; i++) {
    if (i % 40 === 0) lines.push(`## Section ${i}`);
    else if (i % 10 === 0) lines.push(`See [[Note ${i % 200}]].`);
    else if (i % 25 === 0) lines.push(`Inline $x_{${i}} = ${i}^{2}$.`);
    else lines.push(`Line ${i} records a sentence about the vault and the work in it.`);
  }
  lines.push("", "```mermaid", "graph TD", "  A-->B", "```", "");
  return lines.join("\n");
}

async function waitForJson(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* electron is still booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const root = await fsp.mkdtemp(path.join(os.tmpdir(), "locus-perf-"));
const userData = await fsp.mkdtemp(path.join(os.tmpdir(), "locus-edata-"));
await fsp.mkdir(path.join(root, "notes"), { recursive: true });
await fsp.writeFile(path.join(root, "Welcome.md"), "# Welcome\n\nOpen [[Big]].\n", "utf8");
await fsp.writeFile(path.join(root, "Big.md"), bigNote(), "utf8");
for (let i = 0; i < 400; i++) {
  await fsp.writeFile(path.join(root, "notes", `Note ${i}.md`), `# Note ${i}\n\nShort.\n`, "utf8");
}
await fsp.mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
for (let i = 0; i < 300; i++) {
  await fsp.writeFile(
    path.join(root, "node_modules", "pkg", `secret-${i}.md`),
    `# secret ${i}\n`,
    "utf8",
  );
}
await fsp.writeFile(
  path.join(userData, "locus-settings.json"),
  JSON.stringify({ theme: "dark", favorites: [], recentVaults: [root] }, null, 2),
);

const child = spawn(
  "xvfb-run",
  ["-a", electron, ".", `--user-data-dir=${userData}`, "--remote-debugging-port=9223", "--no-sandbox"],
  { cwd: appRoot, stdio: "ignore", env: { ...process.env } },
);

const report = { opens: [], previews: [], keystrokes: [], heap: null, nodeModulesListed: null };
try {
  await waitForJson("http://127.0.0.1:9223/json/version", 20000);
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = browser.contexts()[0].pages().find((item) => item.url().includes("index.html")) ?? browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.getByRole("button", { name: root, exact: true }).waitFor();

  async function closeVault() {
    await page.keyboard.press("Control+KeyP");
    const field = page.getByPlaceholder("Type a command or note name…");
    await field.waitFor();
    await field.fill("Close vault");
    await page.getByText("Close vault", { exact: true }).click();
    await page.getByRole("button", { name: "Open folder as vault" }).waitFor();
  }

  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await page.getByRole("button", { name: root, exact: true }).click();
    await page.locator(".cm-content").waitFor();
    report.opens.push(Date.now() - start);
    report.nodeModulesListed = await page.getByRole("button", { name: "node_modules", exact: true }).count();
    await closeVault();
  }

  await page.getByRole("button", { name: root, exact: true }).click();
  await page.locator(".cm-content").waitFor();
  await page.locator("button.flex-1", { hasText: "Big.md" }).click();
  await page.locator(".cm-content").waitFor();

  async function modeText() {
    return (await page.locator("span.w-12").innerText()).trim();
  }
  async function cycleTo(label) {
    for (let i = 0; i < 4; i++) {
      if ((await modeText()) === label) return;
      await page.keyboard.press("Control+KeyE");
    }
  }

  const client = await page.context().newCDPSession(page);
  await client.send("Profiler.enable");
  await client.send("Profiler.start");
  const profileStart = Date.now();
  await cycleTo("Reading");
  await page.getByRole("heading", { name: "Section 4960" }).waitFor({ timeout: 60000 });
  const profileMs = Date.now() - profileStart;
  const { profile } = await client.send("Profiler.stop");
  const samples = new Map();
  for (const node of profile.nodes) {
    samples.set(node.id, 0);
  }
  for (const id of profile.samples ?? []) samples.set(id, (samples.get(id) ?? 0) + 1);
  const ranked = [...samples.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  report.profileMs = profileMs;
  report.top = ranked.map(([id, hits]) => {
    const node = byId.get(id);
    return `${node?.callFrame?.functionName || "(anonymous)"} ${hits}`;
  });

  for (let i = 0; i < 5; i++) {
    await cycleTo("Source");
    const start = Date.now();
    await cycleTo("Reading");
    await page.getByRole("heading", { name: "Section 4960" }).waitFor({ timeout: 60000 });
    report.previews.push(Date.now() - start);
  }

  await cycleTo("Split");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  for (let i = 0; i < 5; i++) {
    const marker = `MARK${i}`;
    const start = Date.now();
    await page.keyboard.type(marker);
    await page.locator(".locus-prose").getByText(marker).waitFor({ timeout: 30000 });
    report.keystrokes.push(Date.now() - start);
  }

  await client.send("HeapProfiler.enable");
  const before = await client.send("Runtime.evaluate", {
    expression: "window.gc && window.gc(); performance.memory && performance.memory.usedJSHeapSize",
    returnByValue: true,
  });
  for (let i = 0; i < 50; i++) {
    await page.locator("button.flex-1", { hasText: "Welcome.md" }).click();
    await page.locator("button.flex-1", { hasText: "Big.md" }).click();
  }
  const after = await client.send("Runtime.evaluate", {
    expression: "performance.memory && performance.memory.usedJSHeapSize",
    returnByValue: true,
  });
  report.heap = { before: before.result.value, after: after.result.value };

  const lines = [
    "# Perf notes 2026-11-27",
    "",
    "Production Electron build (`npm run build`, then `electron .`) on a vault with Welcome, one 5,000-line note (wikilinks every 10 lines, KaTeX every 25 lines, one Mermaid diagram), 400 short notes, and 300 markdown files under `node_modules/pkg`.",
    "",
    `Vault open, click recent vault until the editor is visible. 5 runs: ${report.opens.join(", ")} ms. Median ${median(report.opens)} ms, range ${Math.min(...report.opens)}–${Math.max(...report.opens)} ms.`,
    "",
    `Buttons named node_modules in the explorer: ${report.nodeModulesListed}.`,
    "",
    `First reading-mode render of the 5,000-line note, including two mode-cycle keypresses: ${report.profileMs} ms. Hottest sample names: ${report.top.join("; ")}.`,
    "",
    `Reading-mode preview, source then reading, until the last section heading is visible. 5 runs: ${report.previews.join(", ")} ms. Median ${median(report.previews)} ms, range ${Math.min(...report.previews)}–${Math.max(...report.previews)} ms.`,
    "",
    `Split-mode keystrokes until the typed marker is visible in the preview. 5 runs: ${report.keystrokes.join(", ")} ms. Median ${median(report.keystrokes)} ms, range ${Math.min(...report.keystrokes)}–${Math.max(...report.keystrokes)} ms. This includes the editor's 250 ms publish delay.`,
    "",
    `JS heap usedJSHeapSize before and after 50 Welcome/Big switches: ${JSON.stringify(report.heap)}. GC was not exposed in this Electron build, so the after number is not a post-GC snapshot.`,
    "",
  ];
  await fsp.mkdir(notesDir, { recursive: true });
  await fsp.writeFile(path.join(notesDir, "2026-11-27-perf.md"), lines.join("\n"));
  console.log(lines.join("\n"));
} finally {
  try {
    child.kill("SIGKILL");
  } catch {
    /* already exited */
  }
  await Promise.race([
    Promise.all([
      fsp.rm(root, { recursive: true, force: true }),
      fsp.rm(userData, { recursive: true, force: true }),
    ]),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
}
