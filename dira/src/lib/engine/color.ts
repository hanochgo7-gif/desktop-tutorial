// Colour math: sRGB transfer curves, luminance and CIELAB lightness.

/** sRGB 8-bit value -> linear light 0..1. */
export const SRGB_TO_LINEAR = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();

const ENC_SIZE = 4096;
/** Linear 0..1 (sampled at 4096 steps) -> sRGB encoded 0..1. */
const LINEAR_TO_SRGB = (() => {
  const t = new Float32Array(ENC_SIZE + 1);
  for (let i = 0; i <= ENC_SIZE; i++) {
    const c = i / ENC_SIZE;
    t[i] = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
  return t;
})();

/** Linear 0..1 -> sRGB encoded 0..1, via a lookup table with linear interpolation. */
export function encodeSrgb(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // The curve is steep near black; use the exact formula there for accuracy.
  if (x < 0.004) return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  const f = x * ENC_SIZE;
  const i = f | 0;
  const t = f - i;
  return LINEAR_TO_SRGB[i] + (LINEAR_TO_SRGB[i + 1] - LINEAR_TO_SRGB[i]) * t;
}

export function decodeSrgb(x: number): number {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** Rec. 709 / sRGB relative luminance of linear RGB. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** CIE L* (0..100) from linear relative luminance (0..1). */
export function lightnessFromY(y: number): number {
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

/** Linear relative luminance from CIE L*. */
export function yFromLightness(l: number): number {
  return l > 8 ? Math.pow((l + 16) / 116, 3) : (l * 27) / 24389;
}

/** Linear sRGB -> CIELAB (D65). */
export function linearToLab(r: number, g: number, b: number): [number, number, number] {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Correlated colour temperature from linear sRGB, using McCamy's approximation on CIE xy.
 * Good to a few percent between ~2,500K and ~10,000K, which covers indoor and daylight scenes.
 */
export function kelvinFromLinearRgb(r: number, g: number, b: number): number | null {
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const s = X + Y + Z;
  if (s <= 1e-6) return null;
  const x = X / s;
  const y = Y / s;
  const n = (x - 0.332) / (0.1858 - y);
  const cct = 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;
  if (!Number.isFinite(cct) || cct < 1500 || cct > 20000) return null;
  return Math.round(cct / 50) * 50;
}
