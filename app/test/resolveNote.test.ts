import assert from "node:assert/strict";
import test from "node:test";
import { findNote } from "../src/lib/resolveNote.ts";

const files = [
  { relPath: "a/Page.md", name: "Page.md", isDir: false },
  { relPath: "b/Page.md", name: "Page.md", isDir: false },
  { relPath: "a/Other.md", name: "Other.md", isDir: false },
  { relPath: "pics", name: "pics", isDir: true },
];

test("an exact path wins over another note with the same name", () => {
  assert.equal(findNote(files, "a/Page"), "a/Page.md");
  assert.equal(findNote(files, "b/page"), "b/Page.md");
});

test("a bare name resolves to the first note with that file name", () => {
  assert.equal(findNote(files, "Other"), "a/Other.md");
  assert.equal(findNote(files, "Page"), "a/Page.md");
});

test("a missing note resolves to nothing", () => {
  assert.equal(findNote(files, "Missing"), null);
  assert.equal(findNote(files, "   "), null);
});
