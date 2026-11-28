"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const listenersBefore = process.listeners("uncaughtException");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "electron") {
    return {
      app: {
        whenReady() {
          return new Promise(() => {});
        },
        on() {},
      },
      BrowserWindow: {},
      ipcMain: {},
      dialog: {},
      shell: {},
      nativeTheme: {},
      session: {},
      Menu: {},
    };
  }
  return originalRequire.apply(this, arguments);
};

const { walkVault } = require("../electron/main.cjs");

Module.prototype.require = originalRequire;
for (const listener of process.listeners("uncaughtException")) {
  if (!listenersBefore.includes(listener)) {
    process.removeListener("uncaughtException", listener);
  }
}

async function writeRel(root, rel, text) {
  const full = path.join(root, ...rel.split("/"));
  await fsp.mkdir(path.dirname(full), { recursive: true });
  await fsp.writeFile(full, text, "utf8");
}

test("walkVault omits node_modules paths from the vault listing", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "locus-walk-"));
  try {
    await writeRel(root, "keep.md", "# Keep\n");
    await writeRel(root, "src/note.md", "# Note\n");
    await writeRel(root, ".hidden.md", "# Hidden\n");
    await writeRel(root, "node_modules/pkg/readme.md", "# Package\n");
    await writeRel(root, "vendor/node_modules/left.md", "# Left\n");
    await writeRel(root, ".git/config", "git\n");

    const relPaths = (await walkVault(root)).map((entry) => entry.relPath).sort();

    assert.deepEqual(relPaths, [".hidden.md", "keep.md", "src", "src/note.md", "vendor"]);
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
});
