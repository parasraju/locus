"use strict";

const path = require("node:path");
const fsp = require("node:fs/promises");

// Move a vault file or folder into `.locus/trash/<YYYY-MM-DD>/<relative path>`.
// A second trash of that same path on the same day uses `<YYYY-MM-DD>-2`, `-3`, …
// The path under the day folder stays the original vault location, so restore
// can read it back without a sidecar.

const MAX_COLLISIONS = 10000;

function vaultRelative(vaultRoot, relPath) {
  if (typeof vaultRoot !== "string" || vaultRoot.length === 0) {
    throw new Error("vaultRoot must be a non-empty string");
  }
  if (typeof relPath !== "string") throw new Error("relPath must be a string");
  if (!relPath || relPath.includes("\0")) throw new Error("Invalid path");
  const root = path.resolve(vaultRoot);
  const rel = relPath.replace(/^[/\\]+/, "");
  if (!rel || rel === ".") throw new Error("relPath cannot be empty");
  const source = path.resolve(root, rel);
  const relative = path.relative(root, source);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes vault root");
  }
  return {
    root,
    rel: relative.split(path.sep).join("/"),
    source,
  };
}

function dayStamp(now) {
  const when = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return when.toISOString().slice(0, 10);
}

async function pathExists(target) {
  try {
    await fsp.lstat(target);
    return true;
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") return false;
    throw err;
  }
}

async function allocateTrashDest({ root, rel, stamp }) {
  const segments = rel.split("/");
  for (let n = 1; n <= MAX_COLLISIONS; n += 1) {
    const day = n === 1 ? stamp : `${stamp}-${n}`;
    const dest = path.join(root, ".locus", "trash", day, ...segments);
    if (!(await pathExists(dest))) return dest;
  }
  throw new Error("Could not find a free trash path");
}

async function moveToTrash({ vaultRoot, relPath, now }) {
  const { root, rel, source } = vaultRelative(vaultRoot, relPath);
  const dest = await allocateTrashDest({ root, rel, stamp: dayStamp(now) });
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.rename(source, dest);
  return dest;
}

module.exports = { moveToTrash };
