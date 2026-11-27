"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { moveToTrash } = require("../electron/trash.cjs");

const DAY = new Date("2026-11-27T12:00:00.000Z");
const STAMP = "2026-11-27";

async function writeRel(root, rel, text) {
  const full = path.join(root, ...rel.split("/"));
  await fsp.mkdir(path.dirname(full), { recursive: true });
  await fsp.writeFile(full, text, "utf8");
}

async function walkFiles(root, dir, out) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") return;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (rel === ".locus" || rel.startsWith(".locus/")) continue;
    if (entry.isDirectory()) await walkFiles(root, full, out);
    else if (entry.isFile()) out.push({ rel, text: await fsp.readFile(full, "utf8") });
  }
}

async function filesOutsideTrash(root) {
  const out = [];
  await walkFiles(root, root, out);
  out.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return out;
}

async function trashTexts(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err && typeof err === "object" && err.code === "ENOENT") return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(await fsp.readFile(full, "utf8"));
    }
  }
  await walk(path.join(root, ".locus", "trash"));
  out.sort();
  return out;
}

async function withVault(fn) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "locus-trash-"));
  try {
    await fn(root);
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
}

test("trashing two same-named notes on the same day keeps both texts", async () => {
  await withVault(async (root) => {
    await writeRel(root, "a/Ideas.md", "from a\n");
    await writeRel(root, "a/Other.md", "other\n");
    await writeRel(root, "b/Ideas.md", "from b\n");
    await writeRel(root, "keep/Stay.md", "stay\n");

    await moveToTrash({ vaultRoot: root, relPath: "a/Ideas.md", now: DAY });
    await moveToTrash({ vaultRoot: root, relPath: "b/Ideas.md", now: DAY });

    assert.deepEqual(await trashTexts(root), ["from a\n", "from b\n"]);
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", STAMP, "a", "Ideas.md"), "utf8"),
      "from a\n",
    );
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", STAMP, "b", "Ideas.md"), "utf8"),
      "from b\n",
    );
    await assert.rejects(() => fsp.lstat(path.join(root, "a", "Ideas.md")), { code: "ENOENT" });
    await assert.rejects(() => fsp.lstat(path.join(root, "b", "Ideas.md")), { code: "ENOENT" });
    assert.deepEqual(await filesOutsideTrash(root), [
      { rel: "a/Other.md", text: "other\n" },
      { rel: "keep/Stay.md", text: "stay\n" },
    ]);
  });
});

test("trashing the same note twice in one day keeps both copies", async () => {
  await withVault(async (root) => {
    await writeRel(root, "a/Ideas.md", "first\n");
    await moveToTrash({ vaultRoot: root, relPath: "a/Ideas.md", now: DAY });
    await writeRel(root, "a/Ideas.md", "second\n");
    await moveToTrash({ vaultRoot: root, relPath: "a/Ideas.md", now: DAY });

    assert.deepEqual(await trashTexts(root), ["first\n", "second\n"]);
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", STAMP, "a", "Ideas.md"), "utf8"),
      "first\n",
    );
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", `${STAMP}-2`, "a", "Ideas.md"), "utf8"),
      "second\n",
    );
    await assert.rejects(() => fsp.lstat(path.join(root, "a", "Ideas.md")), { code: "ENOENT" });
    assert.deepEqual(await filesOutsideTrash(root), []);
  });
});

test("trashing two same-named folders on the same day keeps both trees", async () => {
  await withVault(async (root) => {
    await writeRel(root, "a/Notes/One.md", "one\n");
    await writeRel(root, "a/Notes/nested/Deep.md", "deep\n");
    await writeRel(root, "a/Other.md", "other\n");
    await writeRel(root, "b/Notes/Two.md", "two\n");
    await writeRel(root, "keep/Stay.md", "stay\n");

    await moveToTrash({ vaultRoot: root, relPath: "a/Notes", now: DAY });
    await moveToTrash({ vaultRoot: root, relPath: "b/Notes", now: DAY });

    assert.deepEqual(await trashTexts(root), ["deep\n", "one\n", "two\n"]);
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", STAMP, "a", "Notes", "One.md"), "utf8"),
      "one\n",
    );
    assert.equal(
      await fsp.readFile(
        path.join(root, ".locus", "trash", STAMP, "a", "Notes", "nested", "Deep.md"),
        "utf8",
      ),
      "deep\n",
    );
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", STAMP, "b", "Notes", "Two.md"), "utf8"),
      "two\n",
    );
    await assert.rejects(() => fsp.lstat(path.join(root, "a", "Notes")), { code: "ENOENT" });
    await assert.rejects(() => fsp.lstat(path.join(root, "b", "Notes")), { code: "ENOENT" });
    assert.deepEqual(await filesOutsideTrash(root), [
      { rel: "a/Other.md", text: "other\n" },
      { rel: "keep/Stay.md", text: "stay\n" },
    ]);
  });
});

test("a third trash of the same folder still keeps every copy", async () => {
  await withVault(async (root) => {
    await writeRel(root, "a/Notes/One.md", "one\n");
    await moveToTrash({ vaultRoot: root, relPath: "a/Notes", now: DAY });
    await writeRel(root, "a/Notes/One.md", "two\n");
    await moveToTrash({ vaultRoot: root, relPath: "a/Notes", now: DAY });
    await writeRel(root, "a/Notes/One.md", "three\n");
    await moveToTrash({ vaultRoot: root, relPath: "a/Notes", now: DAY });

    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", STAMP, "a", "Notes", "One.md"), "utf8"),
      "one\n",
    );
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", `${STAMP}-2`, "a", "Notes", "One.md"), "utf8"),
      "two\n",
    );
    assert.equal(
      await fsp.readFile(path.join(root, ".locus", "trash", `${STAMP}-3`, "a", "Notes", "One.md"), "utf8"),
      "three\n",
    );
  });
});
