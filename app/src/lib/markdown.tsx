import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { remarkWikilinks, remarkCallouts } from "./remarkPlugins";
import { sanitizeSchema } from "./sanitize";
import { noteUrlTransform } from "./urlTransform";
import { rehypeTaskIndex } from "./taskIndex";
import type { ReactNode } from "react";

export interface MarkdownViewProps {
  content: string;
  reading?: boolean;
  onOpenNote?: (target: string) => void;
  noteExists?: (target: string) => boolean;
  onTaskToggle?: (offset: number, checked: boolean) => void;
  className?: string;
}

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const dark = typeof document !== "undefined"
    ? document.documentElement.getAttribute("data-theme") === "dark"
    : false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "neutral",
        });
        const id = `mm-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
          const errNode = doc.querySelector("parsererror");
          if (errNode) {
            setError("Invalid SVG from Mermaid");
          } else {
            ref.current.innerHTML = "";
            ref.current.appendChild(doc.documentElement);
          }
        }
      } catch (e) {
        if (!cancelled) setError(String((e as Error).message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, dark]);

  if (error) {
    return <div className="locus-mermaid locus-mermaid-error">Mermaid: {error}</div>;
  }
  return <div ref={ref} className="locus-mermaid" />;
}

function Code({ inline, className, children }: {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];
  if (!inline && lang === "mermaid") {
    return <MermaidBlock code={String(children ?? "").replace(/\n$/, "")} />;
  }
  return <code className={className}>{children}</code>;
}

export function MarkdownView({
  content,
  reading,
  onOpenNote,
  noteExists,
  onTaskToggle,
  className,
}: MarkdownViewProps) {
  return (
    <div className={`locus-prose ${reading ? "reading" : ""} ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkWikilinks, remarkCallouts]}
        rehypePlugins={[
          [rehypeKatex, { throwOnError: false, strict: false }],
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeTaskIndex,
        ]}
        urlTransform={noteUrlTransform}
        components={{
          a: ({ href, children }) => {
            if (typeof href === "string" && href.startsWith("locus://")) {
              const rest = href.slice("locus://".length);
              const target = decodeURIComponent(rest.split("#")[0]);
              const missing = noteExists ? !noteExists(target) : false;
              return (
                <a
                  href="#"
                  className={`locus-wikilink underline decoration-dotted${missing ? " locus-wikilink-missing" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenNote?.(target);
                  }}
                >
                  {children}
                </a>
              );
            }
            if (typeof href === "string" && href.startsWith("http")) {
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            }
            return <a href={href}>{children}</a>;
          },
          input: ({ node, checked, disabled: _disabled, ...rest }) => {
            const raw = (node?.properties as { dataTaskIndex?: unknown } | undefined)?.dataTaskIndex;
            const index = typeof raw === "number" ? raw : -1;
            return (
              <input
                {...rest}
                type="checkbox"
                checked={checked}
                disabled={false}
                className="align-middle"
                onChange={(e) => {
                  if (index >= 0) onTaskToggle?.(index, e.target.checked);
                }}
              />
            );
          },
          code: Code as never,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
