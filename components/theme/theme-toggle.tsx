"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, resolveTheme, setTheme, type TouseTheme } from "@/lib/touse-theme";

interface ThemeToggleProps {
  /** Sidebar footer: ghost icon only */
  variant?: "sidebar" | "default";
}

export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<TouseTheme>("light");

  useEffect(() => {
    const t = resolveTheme();
    setThemeState(t);
    applyTheme(t, false);
    requestAnimationFrame(() => {
      document.documentElement.setAttribute("data-theme-ready", "true");
    });
  }, []);

  function onToggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        className="ds-btn ds-btn-ghost ds-btn-icon"
        style={{ color: "rgba(247,246,243,0.65)" }}
        onClick={onToggle}
        aria-label={label}
        title={label}
      >
        {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="ds-btn ds-btn-ghost ds-btn-icon"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}
