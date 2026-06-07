/** RGB triplet for hex color math. */
interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parsed brand tokens applied to :root at runtime. */
export interface BrandTokens {
  '--color-brand': string;
  '--color-brand-hover': string;
  '--color-brand-muted': string;
  '--color-brand-fg': string;
  '--color-chart-1': string;
  '--color-chart-2': string;
}

/**
 * Parses a 6-digit hex color string.
 * @param hex - Color in #RRGGBB format
 * @returns RGB components or null when invalid
 */
function parseHex(hex: string): Rgb | null {
  const normalized = hex.replace('#', '').trim();
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/**
 * Converts RGB components to a hex color string.
 * @param rgb - RGB triplet
 * @returns Hex color #RRGGBB
 */
function toHex(rgb: Rgb): string {
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(rgb.r), clamp(rgb.g), clamp(rgb.b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Linearly mixes two RGB colors.
 * @param base - Starting color
 * @param target - Color to mix toward
 * @param targetWeight - Weight of target color (0–1)
 * @returns Mixed RGB triplet
 */
function mixRgb(base: Rgb, target: Rgb, targetWeight: number): Rgb {
  const weight = Math.max(0, Math.min(1, targetWeight));
  return {
    r: base.r * (1 - weight) + target.r * weight,
    g: base.g * (1 - weight) + target.g * weight,
    b: base.b * (1 - weight) + target.b * weight,
  };
}

/**
 * Darkens a hex color by mixing it toward black.
 * @param hex - Source color #RRGGBB
 * @param amount - Mix amount toward black (0–1)
 * @returns Darkened hex color
 */
export function darkenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  return toHex(mixRgb(rgb, { r: 0, g: 0, b: 0 }, amount));
}

/**
 * Lightens a hex color by mixing it toward white.
 * @param hex - Source color #RRGGBB
 * @param amount - Mix amount toward white (0–1)
 * @returns Lightened hex color
 */
export function lightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  return toHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, amount));
}

/**
 * Picks white or near-black foreground for readable text on a background.
 * @param hex - Background color #RRGGBB
 * @returns #ffffff or #0a0a0a
 */
export function contrastForeground(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return '#ffffff';
  }
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? '#0a0a0a' : '#ffffff';
}

/**
 * Derives brand and chart tokens from a tenant primary color.
 * @param primaryHex - Tenant primary brand color
 * @returns CSS custom property map for runtime theming
 */
export function deriveBrandTokens(primaryHex: string): BrandTokens {
  return {
    '--color-brand': primaryHex,
    '--color-brand-hover': darkenHex(primaryHex, 0.12),
    '--color-brand-muted': `color-mix(in srgb, ${primaryHex} 10%, transparent)`,
    '--color-brand-fg': contrastForeground(primaryHex),
    '--color-chart-1': primaryHex,
    '--color-chart-2': lightenHex(primaryHex, 0.15),
  };
}
