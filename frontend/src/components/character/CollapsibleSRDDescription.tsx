"use client";

/**
 * src/components/character/CollapsibleSRDDescription.tsx
 * 
 * Reusable component for displaying SRD language descriptions with collapsible
 * functionality. Automatically collapses if content height exceeds threshold.
 */

import React, { useState, useRef, useEffect } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";

interface CollapsibleSRDDescriptionProps {
  title: string;
  content: string;
  /** Height threshold in pixels. Default: 175 */
  heightThreshold?: number;
  /** Additional CSS classes */
  className?: string;
}

export function CollapsibleSRDDescription({
  title,
  content,
  heightThreshold = 175,
  className = "",
}: CollapsibleSRDDescriptionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [shouldCollapse, setShouldCollapse] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setShouldCollapse(height > heightThreshold);
      // Default to collapsed if too tall
      if (height > heightThreshold) {
        setIsExpanded(false);
      }
    }
  }, [content, heightThreshold]);

  return (
    <div
      className={`rounded-lg border border-slate-700/60 bg-slate-850/50 overflow-hidden min-w-0 ${className}`}
    >
      {/* Header with title and toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={!shouldCollapse}
        aria-expanded={shouldCollapse ? isExpanded : undefined}
        className={`
          w-full text-left px-4 py-3 flex items-start justify-between gap-3
          transition-colors rounded-t-lg
          ${shouldCollapse
            ? "hover:bg-slate-800/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-inset"
            : "cursor-default focus:outline-none"
          }
        `}
      >
        <p className="text-xs font-semibold uppercase text-[#6a8fb5] flex-1">
          {title}
        </p>
        {shouldCollapse && (
          <span
            aria-hidden="true"
            className={`
              text-[#b9baa3]/60 shrink-0 transition-transform duration-200
              ${isExpanded ? "rotate-0" : "-rotate-90"}
            `}
          >
            ▼
          </span>
        )}
      </button>

      {/* Content area — capped at max-h-48 on mobile, max-h-96 on sm+ to avoid consuming full viewport */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? "max-h-48 sm:max-h-96" : "max-h-0"}
        `}
      >
        <div ref={contentRef} className="border-t border-slate-700/40 px-4 py-3">
          <MarkdownContent
            className="text-sm text-[#b9baa3]/70 leading-relaxed"
          >
            {content}
          </MarkdownContent>
        </div>
      </div>
    </div>
  );
}
