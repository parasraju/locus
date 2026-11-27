import assert from "node:assert/strict";
import test from "node:test";
import { noteUrlTransform } from "../src/lib/urlTransform.ts";

test("wikilink urls are kept", () => {
  assert.equal(noteUrlTransform("locus://Other"), "locus://Other");
  assert.equal(noteUrlTransform("locus://Folder%2FPage#Heading"), "locus://Folder%2FPage#Heading");
});

test("ordinary web urls are kept", () => {
  assert.equal(noteUrlTransform("https://example.com/a"), "https://example.com/a");
});

test("script urls are dropped", () => {
  assert.equal(noteUrlTransform("javascript:alert(1)"), "");
});
