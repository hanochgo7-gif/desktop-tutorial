// Photo analysis: measures what is wrong with a photo before anything is changed.
// Runs on a reduced copy (long edge ~1024 px) except noise, which needs real pixels.

import { SRGB_TO_LINEAR, kelvinFromLinearRgb, lightnessFromY, linearToLab, luminance } from "./color";
import { downscale, lumaPlane } from "./filters";
import type { Analysis, Raster, SceneProfile } from "./types";
import { detectVerticalLines, fitVerticals } from "./verticals";

export const ANALYSIS_EDGE = 1024;

function percentile(hist: Float64Array, total: number, p: number, binsPerUnit: number) {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i];
    if (acc >= target) return i / binsPerUnit;
  }
  return (hist.length - 1) / binsPerUnit;
}

/** Immerkær's fast noise estimate on a full-resolution centre crop (sigma in 0..255 units). */
function estimateNoise(src: Raster): number {
  const size = Math.min(768, src.width - 2, src.height - 2);
  if (size < 16) return 0;
  const x0 = Math.floor((src.width - size) / 2);
  const y0 = Math.floor((src.height - size) / 2);
  const w = src.width;
  const d = src.data;
  const gray = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  };
  // Only count flat areas: strong edges would be mistaken for noise.
  let sum = 0;
  let n = 0;
  for (let y = y0 + 1; y < y0 + size - 1; y++) {
    for (let x = x0 + 1; x < x0 + size - 1; x++) {
      const c = gray(x, y);
      const l = gray(x - 1, y), r = gray(x + 1, y), u = gray(x, y - 1), b = gray(x, y + 1);
      const grad = Math.abs(r - l) + Math.abs(b - u);
      if (grad > 24) continue;
      const v =
        gray(x - 1, y - 1) - 2 * u + gray(x + 1, y - 1) -
        2 * l + 4 * c - 2 * r +
        gray(x - 1, y + 1) - 2 * b + gray(x + 1, y + 1);
      sum += Math.abs(v);
      n++;
    }
  }
  if (n < 500) return 0;
  return Math.sqrt(Math.PI / 2) * (sum / n) / 6;
}

function guessProfile(proxy: Raster): SceneProfile {
  // Sky-like pixels in the top quarter: bright, and either blue or nearly colourless and smooth.
  const { width: w, height: h, data: d } = proxy;
  const rows = Math.floor(h * 0.25);
  let sky = 0;
  let total = 0;
  let green = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      total++;
      const bright = (r + g + b) / 3;
      if (b > r + 12 && b >= g && bright > 110) sky++;
    }
  }
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (g > r + 10 && g > b + 10) green++;
    }
  }
  const greenShare = green / ((h / 2) * (w / 2));
  return sky / Math.max(1, total) > 0.18 || greenShare > 0.22 ? "exterior" : "interior";
}

export function analyze(src: Raster): Analysis {
  const proxy = downscale(src, ANALYSIS_EDGE);
  const { width: w, height: h, data: d } = proxy;
  const n = w * h;

  const BINS = 1000; // L* in 0.1 steps
  const hist = new Float64Array(BINS + 1);
  const yHist = new Float64Array(4097);
  const zones = new Array(11).fill(0);
  let lsum = 0;
  let clipped = 0;
  let crushed = 0;
  let nr = 0, ng = 0, nb = 0, nn = 0;
  let castA = 0, castB = 0;

  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const r8 = d[j], g8 = d[j + 1], b8 = d[j + 2];
    const r = SRGB_TO_LINEAR[r8], g = SRGB_TO_LINEAR[g8], b = SRGB_TO_LINEAR[b8];
    const Y = luminance(r, g, b);
    const L = lightnessFromY(Y);
    hist[Math.min(BINS, Math.round(L * 10))]++;
    yHist[Math.min(4096, Math.round(Y * 4096))]++;
    zones[Math.min(10, Math.floor(L / (100 / 11)))]++;
    lsum += L;
    if (r8 >= 253 && g8 >= 253 && b8 >= 253) clipped++;
    if (L < 2) crushed++;
    // Neutral-ish midtones carry the colour of the light.
    if (L > 15 && L < 92) {
      const [, a, bb] = linearToLab(r, g, b);
      const chroma = Math.hypot(a, bb);
      if (chroma < 22) {
        nr += r; ng += g; nb += b; nn++;
        castA += a; castB += bb;
      }
    }
  }

  const lightness = {
    p01: percentile(hist, n, 0.01, 10),
    p05: percentile(hist, n, 0.05, 10),
    p50: percentile(hist, n, 0.5, 10),
    p95: percentile(hist, n, 0.95, 10),
    p99: percentile(hist, n, 0.99, 10),
    mean: lsum / n,
  };
  const enough = nn > n * 0.04;
  const neutralMean: [number, number, number] | null = enough ? [nr / nn, ng / nn, nb / nn] : null;

  // Sharpness: variance of the Laplacian on the proxy.
  const gray = lumaPlane(proxy);
  let lapSum = 0;
  let lapSq = 0;
  let lapN = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      const v = gray.data[i - 1] + gray.data[i + 1] + gray.data[i - w] + gray.data[i + w] - 4 * gray.data[i];
      lapSum += v;
      lapSq += v * v;
      lapN++;
    }
  }
  const lapMean = lapSum / lapN;
  const sharpness = (lapSq / lapN - lapMean * lapMean) * 1e4;

  const lines = detectVerticalLines(gray);
  const verticals = fitVerticals(lines, w, h);

  return {
    v: 1,
    width: src.width,
    height: src.height,
    megapixels: Math.round((src.width * src.height) / 1e5) / 10,
    lightness: {
      p01: round1(lightness.p01),
      p05: round1(lightness.p05),
      p50: round1(lightness.p50),
      p95: round1(lightness.p95),
      p99: round1(lightness.p99),
      mean: round1(lightness.mean),
    },
    clippedHighlights: clipped / n,
    crushedShadows: crushed / n,
    zones: zones.map((z) => z / n),
    kelvin: neutralMean ? kelvinFromLinearRgb(...neutralMean) : null,
    cast: enough ? { a: round1(castA / nn), b: round1(castB / nn) } : { a: 0, b: 0 },
    neutralMean,
    noise: round1(estimateNoise(src)),
    sharpness: round1(sharpness),
    verticals,
    profile: guessProfile(proxy),
    blackLevel: percentile(yHist, n, 0.003, 4096),
    medianLuminance: percentile(yHist, n, 0.5, 4096),
  };
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

export type Finding =
  | { id: "dark"; value: number }
  | { id: "bright"; value: number }
  | { id: "cast"; kelvin: number | null; warm: boolean }
  | { id: "lean"; degrees: number }
  | { id: "noise"; value: number }
  | { id: "lowres"; megapixels: number }
  | { id: "blown"; share: number }
  | { id: "flat"; range: number };

/** Plain-language findings shown to the user, most important first. */
export function findings(a: Analysis): Finding[] {
  const out: Finding[] = [];
  if (a.lightness.p50 < 45) out.push({ id: "dark", value: a.lightness.p50 });
  else if (a.lightness.p50 > 78) out.push({ id: "bright", value: a.lightness.p50 });
  // Only a cast people would notice: clearly outside daylight, or strongly tinted when the
  // colour temperature can't be measured. "Warm" follows the measured temperature when there is one.
  const castStrength = Math.hypot(a.cast.a, a.cast.b);
  const offDaylight = a.kelvin !== null && (a.kelvin < 4300 || a.kelvin > 7500);
  if (offDaylight || (a.kelvin === null ? castStrength > 7 : castStrength > 10)) {
    out.push({ id: "cast", kelvin: a.kelvin, warm: a.kelvin !== null ? a.kelvin < 5500 : a.cast.b > 0 });
  }
  // A lean is reported only if it is visible (half a degree) and the correction really reduces it.
  const v = a.verticals;
  if (v?.confident && v.leanBefore >= 0.5 && v.leanBefore - v.leanAfter >= 0.3) out.push({ id: "lean", degrees: v.leanBefore });
  if (a.noise > 3.2) out.push({ id: "noise", value: a.noise });
  if (a.clippedHighlights > 0.04) out.push({ id: "blown", share: a.clippedHighlights });
  if (a.lightness.p95 - a.lightness.p05 < 55) out.push({ id: "flat", range: a.lightness.p95 - a.lightness.p05 });
  if (a.megapixels < 2) out.push({ id: "lowres", megapixels: a.megapixels });
  return out;
}
