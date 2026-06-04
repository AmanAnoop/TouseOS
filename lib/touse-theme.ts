export type TouseTheme = "light" | "dark";

const STORAGE_KEY = "touse-theme";

export function getSystemTheme(): TouseTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): TouseTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function resolveTheme(): TouseTheme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: TouseTheme, enableTransition = true) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (enableTransition) {
    root.setAttribute("data-theme-ready", "true");
  }
}

export function setTheme(theme: TouseTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme, true);
}

export function toggleTheme(): TouseTheme {
  const next = resolveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/** Inline script for root layout — runs before paint */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('touse-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
