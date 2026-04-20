"use client";

/**
 * src/components/marketing/FAQAccordion.tsx
 *
 * Expandable Q&A using CSS grid 0fr→1fr animation.
 * Full ARIA support: aria-expanded, aria-controls, role="region".
 */

import React, { useState, useId } from "react";
import { RevealSection } from "./RevealSection";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

function FAQEntry({ item, index }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const buttonId = `${id}-button-${index}`;
  const panelId = `${id}-panel-${index}`;

  return (
    <div className="border-b border-slate-700/30 last:border-b-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex items-center justify-between w-full min-h-[44px] py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-sm group"
        >
          <span className="font-serif text-base font-semibold text-parchment-100 pr-4 group-hover:text-gold-400 transition-colors">
            {item.question}
          </span>
          <i
            className={`fa-solid fa-chevron-down text-xs text-gold-400/60 shrink-0 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`faq-accordion-grid ${isOpen ? "open" : ""}`}
      >
        <div>
          <p className="text-sm text-parchment-400 leading-relaxed pb-4 pr-8">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQAccordion({ items, className = "" }: FAQAccordionProps) {
  return (
    <RevealSection className={className}>
      <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 divide-y-0">
        <div className="px-6 sm:px-8">
          {items.map((item, i) => (
            <FAQEntry key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
