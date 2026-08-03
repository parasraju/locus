import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

// PRD §16.5 SS-13 — allow-list sanitizer schema.
// Everything rendered from note content passes through this.
export const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["href"],
      ["className"],
      ["title"],
    ],
    div: [["className"]],
    span: [["className"]],
    input: [["type"], ["checked"], ["disabled"], ["className"]],
    img: [["src"], ["alt"], ["title"], ["className"], ["width"], ["height"]],
    pre: [["className"]],
    code: [["className"]],
    table: [["className"]],
    figure: [["className"]],
    figcaption: [["className"]],
  },
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    href: [
      ...(defaultSchema.protocols?.href ?? []),
      "locus",
      "file",
      "vault",
    ],
    src: ["https", "http", "data", "blob", "file", "vault"],
  },
};
