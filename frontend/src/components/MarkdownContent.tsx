"use client";

/**
 * src/components/MarkdownContent.tsx
 *
 * Renders markdown text from DynamoDB fields.
 * Converts Obsidian-style [[WikiLink]] and [[WikiLink|Alias]] syntax into
 * external links pointing to https://publish.obsidian.md/tidwell/<PageName>.
 * All other markdown (bold, italic, inline code, paragraphs) is rendered
 * via react-markdown with remark-gfm.
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ─── Wiki-link pre-processing ─────────────────────────────────────────────────

const OBSIDIAN_BASE = "https://publish.obsidian.md/tidwell";

/**
 * Replace [[Target]] and [[Target|Alias]] with a standard markdown link.
 * Target may contain path separators — we use only the last segment as the
 * URL slug (matching how Obsidian Publish resolves short links).
 */
function resolveWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]]+?)\]\]/g, (_match, inner: string) => {
    // Split on | to get optional alias
    const pipeIdx = inner.indexOf("|");
    const target = pipeIdx >= 0 ? inner.slice(0, pipeIdx).trim() : inner.trim();
    const alias  = pipeIdx >= 0 ? inner.slice(pipeIdx + 1).trim() : target;

    // Use the last path segment as the page slug
    const segments = target.split("/");
    const slug = encodeURIComponent(segments[segments.length - 1].trim());
    const href = `${OBSIDIAN_BASE}/${slug}`;

    return `[${alias}](${href})`;
  });
}

// ─── Custom renderers ─────────────────────────────────────────────────────────

function makeComponents(linkClassName: string): Components {
  return {
    // Open all links in a new tab; apply passed-in class
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {children}
        </a>
      );
    },
    // Render paragraphs without extra wrapper margin (caller controls spacing)
    p({ children }) {
      return <span className="block">{children}</span>;
    },
    // Restore list styles stripped by Tailwind preflight
    ul({ children }) {
      return <ul className="list-disc list-outside pl-5 space-y-0.5">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-outside pl-5 space-y-0.5">{children}</ol>;
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MarkdownContentProps {
  /** Raw text from DynamoDB (may contain [[WikiLinks]] and markdown syntax). */
  children: string;
  /** Extra classes applied to the wrapping div. */
  className?: string;
  /**
   * Tailwind classes applied to rendered <a> elements.
   * Defaults to a subtle underline in the steel-blue accent colour.
   */
  linkClassName?: string;
}

export function MarkdownContent({
  children,
  className = "",
  linkClassName = "underline decoration-[#577399]/60 hover:decoration-[#577399] text-[#8fbad6] hover:text-[#b0d0e6] transition-colors",
}: MarkdownContentProps) {
  const processed = resolveWikiLinks(children);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={makeComponents(linkClassName)}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
