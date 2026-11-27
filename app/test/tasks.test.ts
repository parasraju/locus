import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { applyTaskToggle } from "../src/lib/format.ts";
import { rehypeTaskIndex } from "../src/lib/taskIndex.ts";

test("checking the second task marks that line only", () => {
  const content = "before\n- [ ] buy milk\n- [ ] eggs\n";
  assert.equal(applyTaskToggle(content, 1, true), "before\n- [ ] buy milk\n- [x] eggs\n");
});

test("a task inside a code fence is not a checkbox", () => {
  const content = "```\n- [ ] hidden\n```\n\n- [ ] shown\n";
  assert.equal(applyTaskToggle(content, 0, true), "```\n- [ ] hidden\n```\n\n- [x] shown\n");
});

test("checking a star task marks that line", () => {
  const content = "* [ ] star\n";
  assert.equal(applyTaskToggle(content, 0, true), "* [x] star\n");
});

test("checking a plus task marks that line", () => {
  const content = "+ [ ] plus\n";
  assert.equal(applyTaskToggle(content, 0, true), "+ [x] plus\n");
});

test("unchecking a task restores the empty box", () => {
  const content = "- [x] done\n";
  assert.equal(applyTaskToggle(content, 0, false), "- [ ] done\n");
});

test("a line that is not a task stays as it is", () => {
  const content = "- not a task\n";
  assert.equal(applyTaskToggle(content, 0, true), content);
});

test("preview checkboxes are numbered in source order", () => {
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeTaskIndex],
      children: "- [ ] one\n- [x] two\n",
    }),
  );
  assert.match(html, /data-task-index="0"/);
  assert.match(html, /data-task-index="1"/);
});

test("an index that is not a task changes nothing", () => {
  const content = "- [ ] item\n";
  assert.equal(applyTaskToggle(content, -1, true), content);
  assert.equal(applyTaskToggle(content, 3, true), content);
});
