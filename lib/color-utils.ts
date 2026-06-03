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
