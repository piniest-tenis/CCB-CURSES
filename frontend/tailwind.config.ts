import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/src/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS variable–based semantic tokens (used in @apply directives)
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Deep burgundy — primary brand / headers
        burgundy: {
          50:  "#fdf2f4",
          100: "#fce7ea",
          200: "#f9d0d8",
          300: "#f4a8b8",
          400: "#ec7592",
          500: "#e0486e",
          600: "#cb2d56",
          700: "#aa2047",
          800: "#8e1e3e",
          900: "#4a0a14",
          950: "#2d0509",
        },
        // Warm gold — accents, XP dots, highlights
        gold: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        // Parchment / cream — text on dark
        parchment: {
          50:  "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#f5e6a3",
          400: "#e8c96d",
          500: "#d4a94a",
          600: "#b8872c",
          700: "#966520",
          800: "#7a4f1c",
          900: "#653f1a",
        },
        // Slate dark backgrounds — use Tailwind's built-in slate scale
        // plus extra custom shades
        slate: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          // Custom dark additions
          850: "#151e2d",
          900: "#0f172a",
          950: "#080d17",
        },
      },
      fontFamily: {
        // warbler-deck — small-caps header font (Adobe Typekit)
        serif:   ['"warbler-deck"', "Georgia", "Cambria", "serif"],
        // sofia-pro-narrow — default body/UI font (Adobe Typekit)
        sans:    ['"sofia-pro-narrow"', "Inter", "system-ui", "sans-serif"],
        // jetsam-collection-basilea — attention-getting display font (Adobe Typekit)
        display: ['"jetsam-collection-basilea"', '"warbler-deck"', "Georgia", "serif"],
        mono:    ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        card:      "0 2px 8px rgba(0,0,0,0.55), 0 0 0 1px rgba(74,10,20,0.35)",
        sheet:     "0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,10,20,0.25)",
        "glow-gold": "0 0 14px rgba(212,169,74,0.45), 0 0 4px rgba(212,169,74,0.25)",
        // Legacy aliases kept for compat with older components
        "card-fantasy":       "0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(157,35,71,0.3)",
        "card-fantasy-hover": "0 4px 16px rgba(0,0,0,0.8), 0 0 0 1px rgba(202,138,4,0.5)",
        "glow-burgundy":      "0 0 12px rgba(157,35,71,0.5)",
      },
      backgroundImage: {
        "parchment-texture":
          "radial-gradient(ellipse at top, #1a1024 0%, #0f1219 60%)",
        "card-glow":
          "linear-gradient(135deg, rgba(157,35,71,0.15) 0%, transparent 60%)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow-goldenrod": {
          "0%, 100%": { color: "rgba(218,165,32,0.45)", textShadow: "0 0 0px rgba(218,165,32,0)" },
          "50%":      { color: "rgba(218,165,32,0.9)",  textShadow: "0 0 8px rgba(218,165,32,0.6), 0 0 2px rgba(218,165,32,0.4)" },
        },
      },
      animation: {
        "fade-in":              "fade-in 0.2s ease-out",
        shimmer:                "shimmer 1.5s infinite",
        "pulse-glow-goldenrod": "pulse-glow-goldenrod 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
