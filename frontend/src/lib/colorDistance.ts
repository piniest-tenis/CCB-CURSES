/**
 * src/lib/colorDistance.ts
 *
 * CIE76 Delta-E color distance calculation.
 * Converts hex colors to CIELAB and computes Euclidean distance.
 * Used to enforce a minimum perceptual distance between Hope and Fear dice.
 */

// ─── Hex → sRGB → Linear RGB → XYZ → Lab pipeline ───────────────────────────

/** Parse "#RRGGBB" into [r, g, b] each in 0-255. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** sRGB channel (0-255) → linear (0-1). */
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Linear RGB → CIE XYZ (D65 illuminant). */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  return [
    rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750,
    rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041,
  ];
}

/** CIE XYZ → CIELAB (D65 reference white). */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65 reference white
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  return [
    116 * fy - 16,   // L*
    500 * (fx - fy), // a*
    200 * (fy - fz), // b*
  ];
}

/** Convert a hex color string to CIELAB. */
export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * CIE76 Delta-E: Euclidean distance in CIELAB space.
 * A value of ~2.3 is "just noticeable"; 50+ is "very different".
 */
export function deltaE(hex1: string, hex2: string): number {
  const [L1, a1, b1] = hexToLab(hex1);
  const [L2, a2, b2] = hexToLab(hex2);
  return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/** Minimum Delta-E between Hope and Fear dice (face colors). */
export const MIN_HOPE_FEAR_DELTA_E = 50;
