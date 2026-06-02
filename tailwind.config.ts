import type { Config } from "tailwindcss";

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
        navy: {
          DEFAULT: "#0A1628",
          50: "#E8EBF0",
          100: "#C5CCD8",
          900: "#0A1628",
          950: "#060E1A",
        },
        racing: {
          DEFAULT: "#1B4D2E",
          50: "#EEF4F0",
          100: "#D4E6DA",
          600: "#1B4D2E",
          700: "#164028",
          800: "#123524",
          900: "#0F2318",
          950: "#0A1810",
        },
        gold: {
          DEFAULT: "#C9A84C",
          50: "#FBF6EA",
          100: "#F3E8C8",
          600: "#C9A84C",
          700: "#A8873A",
        },
        parchment: "#F8F6F1",
        sidebar: {
          DEFAULT: "#0F2318",
          active: "#1A3D28",
        },
        /* Legacy aliases → regal palette */
        greek: {
          50: "#EEF4F0",
          100: "#D4E6DA",
          200: "#A8CDB5",
          300: "#7DB490",
          400: "#519B6B",
          500: "#1B4D2E",
          600: "#1B4D2E",
          700: "#164028",
          800: "#123524",
          900: "#0F2318",
          950: "#0A1810",
        },
        sports: {
          50: "#E8EBF0",
          100: "#C5CCD8",
          500: "#0A1628",
          600: "#0A1628",
          700: "#060E1A",
        },
        surface: {
          0: "rgb(var(--surface-0) / <alpha-value>)",
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Cabinet Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        xl: "0.75rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 4px 24px rgba(10, 22, 40, 0.08)",
        "card-md": "0 8px 32px rgba(10, 22, 40, 0.1)",
        "card-lg": "0 16px 48px rgba(10, 22, 40, 0.12)",
        regal: "0 4px 24px rgba(10, 22, 40, 0.08), 0 1px 0 rgba(201, 168, 76, 0.06)",
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
