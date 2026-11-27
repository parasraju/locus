interface HastNode {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

export function rehypeTaskIndex() {
  return (tree: HastNode) => {
    let index = 0;
    const visit = (node: HastNode) => {
      if (node.type === "element" && node.tagName === "input" && node.properties?.type === "checkbox") {
        node.properties.dataTaskIndex = index;
        index += 1;
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
