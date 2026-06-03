import type { Config } from "tailwindcss";

const greekScale = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const greekColors = Object.fromEntries(
  greekScale.map((s) => [s, `hsl(var(--greek-${s}) / <alpha-value>)`]),
) as Record<string, string>;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        greek: greekColors,
        regal: {
          navy: "hsl(var(--regal-navy) / <alpha-value>)",
          green: "hsl(var(--regal-green) / <alpha-value>)",
          gold: "hsl(var(--regal-gold) / <alpha-value>)",
        },
        club: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#4c1d95",
          950: "#2e1065",
        },
        sports: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#1e3a5f",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#172554",
          950: "#0f172a",
        },
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Cormorant Garamond", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 hsl(220 55% 14% / 0.06), 0 1px 2px -1px hsl(220 55% 14% / 0.04)",
        "card-md":
          "0 4px 14px -2px hsl(220 55% 14% / 0.08), 0 2px 6px -2px hsl(152 100% 13% / 0.04)",
        "card-lg":
          "0 12px 28px -6px hsl(220 55% 14% / 0.12), 0 4px 10px -4px hsl(152 100% 13% / 0.06)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
