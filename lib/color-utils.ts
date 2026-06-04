/** Convert #RRGGBB to HSL channels for CSS: "h s% l%" */
export function hexToHslChannels(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "220 45% 18%";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lum = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      default:
        hue = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(lum * 100)}%`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

/** WCAG relative luminance for #RRGGBB */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

/** Pick light or dark text for text on a solid brand/background color */
export function pickReadableTextColor(
  backgroundHex: string,
  light = "#F7F6F3",
  dark = "#1A1916",
): string {
  const hex = backgroundHex?.trim().startsWith("#") ? backgroundHex.trim() : `#${backgroundHex?.trim() ?? "500000"}`;
  try {
    return relativeLuminance(hex) > 0.45 ? dark : light;
  } catch {
    return light;
  }
}

/** True when background is dark enough to require light foreground */
export function isDarkBackground(hex: string): boolean {
  return relativeLuminance(hex) <= 0.45;
}

/** Mix two hex colors (weight on first color 0–1). */
export function blendHex(a: string, b: string, weightA = 0.5): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const w = Math.min(1, Math.max(0, weightA));
  const r = Math.round(ca.r * w + cb.r * (1 - w));
  const g = Math.round(ca.g * w + cb.g * (1 - w));
  const bl = Math.round(ca.b * w + cb.b * (1 - w));
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
