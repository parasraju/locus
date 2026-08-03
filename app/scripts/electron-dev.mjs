// Dev launcher: starts the Vite dev server, then launches Electron pointed at
// whatever port Vite actually bound (robust to port collisions).
import { spawn } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import waitOn from "wait-on";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const portFile = path.join(root, ".vite-port.json");
const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
const electronEntry = path.join(root, "node_modules", "electron", "cli.js");

try {
  unlinkSync(portFile);
} catch {
  /* ignore */
}

const vite = spawn(process.execPath, [viteEntry], { stdio: "inherit" });

async function main() {
  try {
    await waitOn({ resources: [portFile], timeout: 30000 });
  } catch (err) {
    console.error("[locus] Vite dev server did not start in time:", err.message ?? err);
    vite.kill();
    process.exit(1);
  }
  let port = 5173;
  try {
    port = JSON.parse(readFileSync(portFile, "utf8")).port;
  } catch {
    /* fall back */
  }
  const env = {
    ...process.env,
    VITE_DEV_SERVER_URL: `http://localhost:${port}`,
  };
  const electron = spawn(process.execPath, [electronEntry, "."], {
    stdio: "inherit",
    env,
  });
  electron.on("exit", (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
  process.on("SIGINT", () => {
    vite.kill();
    electron.kill();
    process.exit(130);
  });
}

main();
