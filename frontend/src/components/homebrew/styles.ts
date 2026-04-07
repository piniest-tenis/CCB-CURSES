/**
 * src/components/homebrew/styles.ts
 *
 * Shared Tailwind class-name constants used across all homebrew form
 * components and the markdown-upload page.  Centralised here so that
 * visual tweaks only need to happen in one place.
 */

// ─── Input / Label / Textarea ─────────────────────────────────────────────────

export const INPUT_CLS =
  "w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-parchment-600 focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:border-coral-400/50 transition-colors";

export const LABEL_CLS = "block text-sm font-medium text-parchment-500 mb-1";

export const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const BTN_PRIMARY =
  "rounded-xl border border-coral-400/60 bg-coral-400/10 px-5 py-2.5 font-semibold text-base text-coral-400 hover:bg-coral-400/20 hover:border-coral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]";

export const BTN_SECONDARY =
  "rounded-lg border border-slate-700/60 px-4 py-2 text-sm text-parchment-500 hover:text-[#b9baa3] hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-400/50";

// ─── Soft-warning banner (used by balance guardrails) ─────────────────────────

export const SOFT_WARNING_CLS =
  "rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400/90";
