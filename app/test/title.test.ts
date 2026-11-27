import assert from "node:assert/strict";
import test from "node:test";
import { titleOf } from "../src/lib/format.ts";

test("a CRLF note uses its frontmatter title", () => {
  const content = "---\r\ntitle: From Frontmatter\r\n---\r\n\r\n# Heading Title\r\n";
  assert.equal(titleOf(content, "file.md"), "From Frontmatter");
});

test("a quoted CRLF frontmatter title drops the quotes", () => {
  const content = "---\r\ntitle: \"From Frontmatter\"\r\n---\r\n\r\n# Heading Title\r\n";
  assert.equal(titleOf(content, "file.md"), "From Frontmatter");
});

test("an LF note uses its frontmatter title", () => {
  const content = "---\ntitle: From Frontmatter\n---\n\n# Heading Title\n";
  assert.equal(titleOf(content, "file.md"), "From Frontmatter");
});

test("a heading title has no carriage return", () => {
  assert.equal(titleOf("# Heading Title\r\n\r\nBody\r\n", "file.md"), "Heading Title");
  assert.equal(titleOf("# Heading Title\n\nBody\n", "file.md"), "Heading Title");
});

test("a note with no title falls back to the file name", () => {
  assert.equal(titleOf("just words\n", "My File.md"), "My File");
});
