const DEFAULT_PRIMARY_COLOR = '#0891b2'; // Teal

/**
 * Parse hex color and convert to HSL
 */
function hexToHsl(hex: string): string {
  // Remove # and parse hex
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / delta + 2) / 6;
        break;
      case b:
        hue = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  const h_deg = Math.round(hue * 360);
  const s_pct = Math.round(saturation * 100);
  const l_pct = Math.round(lightness * 100);

  return `hsl(${h_deg}, ${s_pct}%, ${l_pct}%)`;
}

/**
 * Convert HSL to hex color
 */
function hslToHex(hsl: string): string {
  // Parse HSL values
  const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid HSL format: ${hsl}`);
  }

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adjust the lightness of an HSL color
 */
function adjustLightness(hsl: string, adjustBy: number): string {
  const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid HSL format: ${hsl}`);
  }

  const h = match[1];
  const s = match[2];
  let l = parseInt(match[3]) + adjustBy;

  // Clamp lightness between 0 and 100
  l = Math.max(0, Math.min(100, l));

  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Derive a complete RF theme from a primary hex color
 */
function deriveRfTheme(hex?: string): Record<string, string> {
  const normalized = (hex ?? DEFAULT_PRIMARY_COLOR).toLowerCase();
  const hslColor = hexToHsl(normalized);

  return {
    '--rf-primary': normalized,
    '--rf-primary-hover': hslToHex(adjustLightness(hslColor, -8)),
    '--rf-primary-soft': hslToHex(adjustLightness(hslColor, 82)),
    '--rf-primary-softer': hslToHex(adjustLightness(hslColor, 88)),
    '--rf-primary-ink': hslToHex(adjustLightness(hslColor, -60)),
    '--rf-primary-dark': hslToHex(adjustLightness(hslColor, -30)),
    '--rf-primary-darker': hslToHex(adjustLightness(hslColor, -42)),
    '--rf-on-primary': '#ffffff',
  };
}

/**
 * Get theme CSS variables for a primary color
 * Returns a string of CSS variable declarations for use in a <style> tag
 */
export function getThemeCss(primaryColor?: string | null): string {
  const color = primaryColor ?? DEFAULT_PRIMARY_COLOR;
  const theme = deriveRfTheme(color);

  return Object.entries(theme)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

/**
 * Format theme CSS as a style tag content
 * Wraps CSS variables in :root selector
 */
export function formatThemeStyle(primaryColor?: string | null): string {
  const css = getThemeCss(primaryColor);
  return `:root{${css}}`;
}
