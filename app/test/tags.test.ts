import assert from "node:assert/strict";
import test from "node:test";
import { extractTags } from "../src/lib/format.ts";

test("tags in prose are collected once", () => {
  const content = "See #project and #project again, plus #project/sub.\n";
  assert.deepEqual(extractTags(content), ["project", "project/sub"]);
});

test("tags inside fenced or inline code are not tags", () => {
  const content = "```js\n#hidden\n```\n\nSee `#also-hidden` and #shown.\n";
  assert.deepEqual(extractTags(content), ["shown"]);
});

test("a note with no tags has none", () => {
  assert.deepEqual(extractTags("# A heading\n\nJust prose.\n"), []);
});
