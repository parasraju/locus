import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { remarkCallouts, remarkWikilinks } from "../src/lib/remarkPlugins.ts";
import { noteUrlTransform } from "../src/lib/urlTransform.ts";

function render(markdown: string): string {
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkWikilinks, remarkCallouts],
      rehypePlugins: [rehypeRaw],
      urlTransform: noteUrlTransform,
      children: markdown,
    }),
  );
}

function titleText(html: string): string {
  const match = html.match(/class="locus-callout-title">([\s\S]*?)<\/div>/);
  if (!match) return "";
  return match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

test("a callout keeps the following lines as the body", () => {
  const html = render("> [!note]\n> Just a body.\n");
  assert.match(html, /locus-callout-note/);
  assert.equal(titleText(html), "Note");
  assert.match(html, /Just a body\./);
});

test("a titled callout keeps its title and its body", () => {
  const html = render("> [!note] Custom\n> Just a body.\n");
  assert.match(html, /locus-callout-note/);
  assert.equal(titleText(html), "Note — Custom");
  assert.match(html, /Just a body\./);
  assert.equal(titleText(html).includes("Just a body"), false);
});

test("a wikilink on the callout title line stays visible", () => {
  const html = render("> [!warning] See [[Other|the other note]]\n> Body stays.\n");
  assert.match(html, /locus-callout-warning/);
  assert.match(html, /locus-wikilink/);
  assert.match(html, /the other note/);
  assert.match(html, /Body stays\./);
  assert.equal(titleText(html).includes("Body stays"), false);
  assert.match(titleText(html), /See/);
  assert.match(titleText(html), /the other note/);
});

test("a blank line between a callout marker and its body still renders both", () => {
  const html = render("> [!tip]\n>\n> Bring a pencil.\n");
  assert.match(html, /locus-callout-success/);
  assert.equal(titleText(html), "Tip");
  assert.match(html, /Bring a pencil\./);
});

test("a blockquote that is not a callout stays a blockquote", () => {
  const html = render("> Just a quote.\n");
  assert.equal(html.includes("locus-callout"), false);
  assert.match(html, /Just a quote\./);
});

test("a wikilink in prose is a link and a wikilink in code is not", () => {
  const html = render("Use `[[Note]]` and [[Note|the note]].");
  assert.equal((html.match(/locus-wikilink/g) ?? []).length, 1);
  assert.match(html, /<code>\[\[Note\]\]<\/code>/);
  assert.match(html, /href="locus:\/\/Note"/);
  assert.match(html, /the note/);
});
