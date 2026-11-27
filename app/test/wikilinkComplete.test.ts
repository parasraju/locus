import assert from "node:assert/strict";
import test from "node:test";
import { wikilinkCompletion } from "../src/lib/wikilinkComplete.ts";

test("accepting a completion replaces the typed wikilink with one pair of brackets", () => {
  const match = "[[hel";
  const result = wikilinkCompletion(match, ["notes/hello.md", "skip.txt", "other.md"]);
  assert.ok(result);
  const hello = result.options.find((option) => option.label === "hello");
  assert.ok(hello);
  assert.equal(hello.detail, "notes/hello.md");
  assert.equal(match.slice(0, result.fromOffset) + hello.apply, "[[hello]]");
  assert.equal(
    result.options.some((option) => option.detail === "skip.txt"),
    false,
  );
});

test("a query that matches nothing suggests no notes", () => {
  const result = wikilinkCompletion("[[zzz", ["notes/hello.md"]);
  assert.ok(result);
  assert.deepEqual(result.options, []);
});

test("text that is not a wikilink is not completed", () => {
  assert.equal(wikilinkCompletion("hello", ["notes/hello.md"]), null);
});
