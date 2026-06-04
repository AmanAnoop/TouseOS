import type { Config } from "tailwindcss";

/** Layout-only Tailwind — all colors via CSS variables in globals.css */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-subtle": "var(--color-bg-subtle)",
        "bg-raised": "var(--color-bg-raised)",
        sidebar: "var(--color-sidebar)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        foreground: "var(--color-text-primary)",
        muted: "var(--color-text-secondary)",
        "muted-foreground": "var(--color-text-secondary)",
        tertiary: "var(--color-text-tertiary)",
        background: "var(--color-bg)",
        card: "var(--color-bg-raised)",
        primary: "var(--color-org-primary)",
        "primary-foreground": "var(--color-text-on-brand)",
        org: "var(--color-org-primary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
        /* Legacy aliases — map old utility names to design tokens */
        "surface-1": "var(--color-bg-subtle)",
        "surface-2": "color-mix(in srgb, var(--color-text-primary) 4%, var(--color-bg))",
        greek: {
          50: "color-mix(in srgb, var(--color-org-primary) 8%, var(--color-bg))",
          100: "color-mix(in srgb, var(--color-org-primary) 12%, var(--color-bg))",
          200: "color-mix(in srgb, var(--color-org-primary) 20%, var(--color-bg))",
          300: "color-mix(in srgb, var(--color-org-primary) 30%, var(--color-border))",
          400: "color-mix(in srgb, var(--color-org-primary) 55%, var(--color-text-secondary))",
          500: "var(--color-org-primary)",
          600: "var(--color-org-primary)",
          700: "var(--color-org-primary)",
          950: "color-mix(in srgb, var(--color-org-primary) 18%, var(--color-bg-subtle))",
        },
        club: {
          50: "color-mix(in srgb, var(--color-org-primary) 8%, var(--color-bg))",
          600: "var(--color-org-primary)",
          700: "color-mix(in srgb, var(--color-org-primary) 85%, #000000)",
        },
        ring: "var(--color-org-primary)",
      },
      boxShadow: {
        card: "var(--shadow-sm)",
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      maxWidth: {
        content: "var(--content-max)",
      },
      spacing: {
        sidebar: "var(--sidebar-width)",
      },
    },
  },
  plugins: [],
};

export default config;
