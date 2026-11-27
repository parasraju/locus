import assert from "node:assert/strict";
import test from "node:test";
import { nextPaletteMode } from "../src/lib/paletteMode.ts";

test("typing a note name in file mode stays in file mode", () => {
  assert.equal(nextPaletteMode("files", "", "welcome"), "files");
});

test("typing a command stays in command mode", () => {
  assert.equal(nextPaletteMode("commands", "", "new"), "commands");
});

test("a slash query opens file mode", () => {
  assert.equal(nextPaletteMode("commands", "", "/welcome"), "files");
});

test("deleting the slash returns to command mode", () => {
  assert.equal(nextPaletteMode("files", "/welcome", "welcome"), "commands");
});
