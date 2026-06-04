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
        "primary-foreground": "var(--color-text-inverse)",
        org: "var(--color-org-primary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
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
