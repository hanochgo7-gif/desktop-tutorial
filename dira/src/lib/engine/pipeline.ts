// The Studio Enhance pipeline. Deterministic: the same photo and recipe always give the same pixels.
//
// Order of operations
//   1. object removal (classic, texture copied from the same photo)
//   2. vertical correction (perspective homography + crop)
//   3. chroma noise reduction (edge-aware, guided by luminance)
//   4. light: black point, white balance, exposure and local tone mapping in linear light
//      (a base/detail split like HDR software: dark corners open up, windows are held back)
//   5. contrast, vibrance
//   6. adaptive detail: one pass that smooths luminance noise in flat areas and sharpens edges
//   7. optional classic ×2 enlargement (Lanczos-3)

import { SRGB_TO_LINEAR, encodeSrgb, kelvinFromLinearRgb, luminance, yFromLightness } from "./color";
import { boxBlur, downscale, guidedCoefficients, plane, resizeLanczos, sampleBilinear, type Plane } from "./filters";
import { inpaint, strokesToMask } from "./inpaint";
import type { Analysis, Change, ProgressFn, Raster, Recipe, RenderResult } from "./types";
import { warpVerticals } from "./verticals";

export const DEFAULT_ADJUST = { brightness: 0, warmth: 0, contrast: 0, saturation: 0, shadows: 0 };

/** The recommended recipe for a photo, from its analysis. */
export function autoRecipe(a: Analysis): Recipe {
  return {
    v: 1,
    profile: a.profile,
    strength: 1,
    steps: {
      exposure: true,
      whiteBalance: a.neutralMean !== null,
      toneMap: true,
      verticals: Boolean(a.verticals?.confident),
      denoise: a.noise > 2.2,
      sharpen: true,
    },
    adjust: { ...DEFAULT_ADJUST },
    removals: [],
    upscale: 1,
  };
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

/** All numbers the pixel loop needs, derived from the analysis and the recipe. */
export function lightParams(a: Analysis, r: Recipe) {
  const s = clamp(r.strength, 0, 1.5);
  const interior = r.profile === "interior";

  // Exposure: bring the median to a bright, airy target (L* ~61 indoors, ~54 outdoors).
  const targetL = interior ? 61 : 54;
  const medianY = Math.max(1e-4, a.medianLuminance);
  let ev = r.steps.exposure ? Math.log2(yFromLightness(targetL) / medianY) : 0;
  ev = clamp(ev, -1.2, 2.8) * s + r.adjust.brightness * 1.5;

  // White balance: gains that neutralise the light, kept slightly warm indoors because
  // fully neutral interiors look cold. Partial (85%) so the scene keeps its character.
  let gains: [number, number, number] = [1, 1, 1];
  if (r.steps.whiteBalance && a.neutralMean) {
    const [nr, ng, nb] = a.neutralMean;
    const warmBias = interior ? 1.035 : 1.0;
    const full: [number, number, number] = [(ng / Math.max(1e-5, nr)) * warmBias, 1, (ng / Math.max(1e-5, nb)) / warmBias];
    const amt = 0.85 * Math.min(1, s);
    gains = full.map((g) => clamp(1 + (g - 1) * amt, 0.6, 1.8)) as [number, number, number];
  }
  const warm = r.adjust.warmth * 0.09;
  gains = [gains[0] * (1 + warm), gains[1], gains[2] * (1 - warm)];
  // Keep overall brightness unchanged by the gains (exposure handles brightness).
  const gl = luminance(gains[0], gains[1], gains[2]);
  gains = gains.map((g) => g / gl) as [number, number, number];

  // Local tone mapping: compress the large-scale light differences between bright and dark areas.
  // Two slopes around the median: one for shadows (how much dark corners open up) and one for
  // highlights, solved so the brightest 1% of the photo lands at L* ~93 instead of clipping to white
  // after the exposure change.
  const range = (a.lightness.p95 - a.lightness.p05) / 100; // 0..1
  let compress = 1;
  let compressHi = 1;
  if (r.steps.toneMap) {
    const auto = interior ? 0.36 : 0.26;
    const need = clamp(range * 0.9 + (a.clippedHighlights > 0.02 ? 0.1 : 0), 0.3, 1);
    compress = 1 - clamp(auto * need * s + r.adjust.shadows * 0.25, -0.2, 0.6);
    const midIn = Math.log2(medianY);
    const hi = Math.log2(Math.max(medianY * 1.05, yFromLightness(a.lightness.p99)));
    const room = Math.log2(yFromLightness(93)) - (midIn + ev);
    const fit = room > 0 ? room / Math.max(0.05, hi - midIn) : 0.45;
    compressHi = clamp(Math.min(compress, fit), 0.45, 1);
  }
  const blackPoint = r.steps.exposure ? clamp(a.blackLevel * Math.min(1, s), 0, 0.012) : 0;
  const contrast = clamp((r.steps.toneMap ? 0.18 : 0.06) * Math.min(1, s) + r.adjust.contrast * 0.5, -0.6, 0.8);
  const vibrance = clamp((interior ? 0.12 : 0.22) * Math.min(1, s) + r.adjust.saturation * 0.6, -0.9, 1);
  return { ev, gains, compress, compressHi, blackPoint, contrast, vibrance, medianY };
}

function rasterizeChanges(a: Analysis, r: Recipe, p: ReturnType<typeof lightParams>, kept: number | null): Change[] {
  const out: Change[] = [];
  if (r.removals.length) out.push({ kind: "removal", count: r.removals.length });
  if (kept !== null && a.verticals) {
    out.push({ kind: "verticals", from: a.verticals.leanBefore, to: a.verticals.leanAfter });
    out.push({ kind: "crop", value: Math.round((1 - kept) * 1000) / 10 });
  }
  if (Math.abs(p.ev) >= 0.1) out.push({ kind: "exposure", value: Math.round(p.ev * 10) / 10 });
  if (a.neutralMean && (r.steps.whiteBalance || r.adjust.warmth !== 0)) {
    const [nr, ng, nb] = a.neutralMean;
    const after = kelvinFromLinearRgb(nr * p.gains[0], ng * p.gains[1], nb * p.gains[2]);
    if (a.kelvin && after && Math.abs(after - a.kelvin) >= 150) out.push({ kind: "whiteBalance", from: a.kelvin, to: after });
  }
  if (p.compress < 0.98) out.push({ kind: "toneMap", value: Math.round((1 - p.compress) * 100) });
  if (Math.abs(p.contrast) >= 0.05) out.push({ kind: "contrast", value: Math.round(p.contrast * 100) });
  if (Math.abs(p.vibrance) >= 0.05) out.push({ kind: "color", value: Math.round(p.vibrance * 100) });
  if (r.steps.denoise) out.push({ kind: "denoise", value: Math.round(a.noise * 10) / 10 });
  if (r.steps.sharpen) out.push({ kind: "sharpen" });
  if (r.upscale === 2) out.push({ kind: "upscale", value: 2 });
  return out;
}

/** Apply a recipe. `analysis` must be of the same original photo (any resolution of it). */
export function render(input: Raster, a: Analysis, r: Recipe, progress?: ProgressFn): RenderResult {
  const report = progress ?? (() => {});
  let src = input;
  const W = src.width;
  const H = src.height;

  if (r.removals.length) {
    report(0.02, "removal");
    src = inpaint(src, strokesToMask(r.removals, W, H));
  }

  let kept: number | null = null;
  if (r.steps.verticals && a.verticals && (Math.abs(a.verticals.roll) > 0.05 || Math.abs(a.verticals.pitch) > 0.1)) {
    report(0.2, "verticals");
    const s = clamp(r.strength, 0, 1);
    const warped = warpVerticals(src, a.verticals.roll * s, a.verticals.pitch * s, a.verticals.focal);
    src = warped.raster;
    kept = warped.kept;
  }

  report(0.35, "light");
  const p = lightParams(a, r);
  const n = W * H;
  const d = src.data;

  // Low-resolution guides: one for the tone-mapping base layer, one for chroma noise.
  const lowEdge = 640;
  const low = downscale(src, lowEdge);
  const lw = low.width, lh = low.height;
  const logY = new Float32Array(lw * lh);
  for (let i = 0, j = 0; i < lw * lh; i++, j += 4) {
    const Y = luminance(SRGB_TO_LINEAR[low.data[j]], SRGB_TO_LINEAR[low.data[j + 1]], SRGB_TO_LINEAR[low.data[j + 2]]);
    logY[i] = Math.log2(Math.max(1e-5, Y));
  }
  const logPlane = plane(lw, lh, logY);
  const radius = Math.max(4, Math.round(Math.max(lw, lh) * 0.035));
  const toneCoef = guidedCoefficients(logPlane, logPlane, radius, 0.35);

  let chroma: { ycoef: { a: Plane; b: Plane }[] } | null = null;
  if (r.steps.denoise) {
    const cbL = new Float32Array(lw * lh);
    const crL = new Float32Array(lw * lh);
    const yL = new Float32Array(lw * lh);
    for (let i = 0, j = 0; i < lw * lh; i++, j += 4) {
      const R = low.data[j] / 255, G = low.data[j + 1] / 255, B = low.data[j + 2] / 255;
      const Y = 0.299 * R + 0.587 * G + 0.114 * B;
      yL[i] = Y;
      cbL[i] = B - Y;
      crL[i] = R - Y;
    }
    const yp = plane(lw, lh, yL);
    const cr = Math.max(2, Math.round(Math.max(lw, lh) / 320));
    const cbC = guidedCoefficients(yp, plane(lw, lh, cbL), cr, 0.004);
    const crC = guidedCoefficients(yp, plane(lw, lh, crL), cr, 0.004);
    chroma = { ycoef: [cbC, crC] };
  }
  const chromaAmt = r.steps.denoise ? clamp((a.noise - 1) / 5, 0.35, 0.9) : 0;

  const out = new Uint8ClampedArray(n * 4);
  const sxLow = lw / W;
  const syLow = lh / H;
  const midIn = Math.log2(p.medianY);
  const midOut = midIn + p.ev;
  const bp = p.blackPoint;
  const bpScale = 1 / (1 - bp);
  const [gr, gg, gb] = p.gains;
  const detailGain = 1 + (1 - p.compress) * 0.25;
  const knee = 0.78;
  const shoulder = (x: number) => (x <= knee ? x : knee + (1 - knee) * (1 - Math.exp(-(x - knee) / (1 - knee))));
  const con = p.contrast;
  const vib = p.vibrance;

  for (let y = 0; y < H; y++) {
    if ((y & 63) === 0) report(0.35 + 0.45 * (y / H), "light");
    const ly = (y + 0.5) * syLow - 0.5;
    for (let x = 0; x < W; x++) {
      const j = (y * W + x) * 4;
      let R8 = d[j], G8 = d[j + 1], B8 = d[j + 2];

      if (chroma) {
        // Replace noisy colour with an edge-aware smoothed version, keep luminance.
        const lx = (x + 0.5) * sxLow - 0.5;
        const R = R8 / 255, G = G8 / 255, B = B8 / 255;
        const Yv = 0.299 * R + 0.587 * G + 0.114 * B;
        const [cbC, crC] = chroma.ycoef;
        const cbS = sampleBilinear(cbC.a, lx, ly) * Yv + sampleBilinear(cbC.b, lx, ly);
        const crS = sampleBilinear(crC.a, lx, ly) * Yv + sampleBilinear(crC.b, lx, ly);
        const cb = (B - Yv) + (cbS - (B - Yv)) * chromaAmt;
        const crv = (R - Yv) + (crS - (R - Yv)) * chromaAmt;
        const Rn = Yv + crv;
        const Bn = Yv + cb;
        const Gn = (Yv - 0.299 * Rn - 0.114 * Bn) / 0.587;
        R8 = clamp(Math.round(Rn * 255), 0, 255);
        G8 = clamp(Math.round(Gn * 255), 0, 255);
        B8 = clamp(Math.round(Bn * 255), 0, 255);
      }

      let r = SRGB_TO_LINEAR[R8], g = SRGB_TO_LINEAR[G8], b = SRGB_TO_LINEAR[B8];
      if (bp > 0) {
        r = Math.max(0, r - bp) * bpScale;
        g = Math.max(0, g - bp) * bpScale;
        b = Math.max(0, b - bp) * bpScale;
      }
      r *= gr; g *= gg; b *= gb;
      const Y = Math.max(1e-5, luminance(r, g, b));
      const L = Math.log2(Y);
      const lx = (x + 0.5) * sxLow - 0.5;
      const base = sampleBilinear(toneCoef.a, lx, ly) * L + sampleBilinear(toneCoef.b, lx, ly);
      const detail = L - base;
      const L2 = midOut + (base - midIn) * (base > midIn ? p.compressHi : p.compress) + detail * detailGain;
      const Y2 = shoulder(Math.pow(2, L2));
      const ratio = Y2 / Y;
      // Lifting shadows a lot also lifts their colour; pull saturation back a little there.
      const desat = ratio > 1 ? Math.min(0.25, Math.log2(ratio) * 0.06) : 0;
      r = r * ratio; g = g * ratio; b = b * ratio;
      if (desat > 0) {
        r = Y2 + (r - Y2) * (1 - desat);
        g = Y2 + (g - Y2) * (1 - desat);
        b = Y2 + (b - Y2) * (1 - desat);
      }
      // Highlights that exceed 1 in one channel: compress toward luminance instead of clipping hue.
      const mx = Math.max(r, g, b);
      if (mx > 1) {
        const t = (mx - 1) / mx;
        r += (Y2 - r) * t; g += (Y2 - g) * t; b += (Y2 - b) * t;
      }
      let er = encodeSrgb(r), eg = encodeSrgb(g), eb = encodeSrgb(b);
      if (con !== 0) {
        er += con * (er * er * (3 - 2 * er) - er);
        eg += con * (eg * eg * (3 - 2 * eg) - eg);
        eb += con * (eb * eb * (3 - 2 * eb) - eb);
      }
      if (vib !== 0) {
        const ey = 0.2126 * er + 0.7152 * eg + 0.0722 * eb;
        const sat = Math.max(er, eg, eb) - Math.min(er, eg, eb);
        const k = 1 + vib * (vib > 0 ? 1 - sat : 1);
        er = ey + (er - ey) * k;
        eg = ey + (eg - ey) * k;
        eb = ey + (eb - ey) * k;
      }
      out[j] = er * 255 + 0.5;
      out[j + 1] = eg * 255 + 0.5;
      out[j + 2] = eb * 255 + 0.5;
      out[j + 3] = 255;
    }
  }

  if (r.steps.denoise || r.steps.sharpen) {
    report(0.82, "detail");
    adaptiveDetail(out, W, H, r.steps.denoise ? a.noise * Math.min(2, Math.pow(2, Math.max(0, p.ev) * 0.5)) : 0, r.steps.sharpen ? 0.55 * Math.min(1.2, r.strength) : 0);
  }

  let raster: Raster = { width: W, height: H, data: out };
  if (r.upscale === 2) {
    report(0.92, "upscale");
    raster = resizeLanczos(raster, W * 2, H * 2);
  }
  report(1, "done");
  return { raster, changes: rasterizeChanges(a, r, p, kept) };
}

/**
 * Adaptive local detail (a Lee/Wiener filter fused with an unsharp mask): in flat areas where the
 * local variance is close to the noise level, detail is smoothed away; on real edges it is boosted.
 * Works on luminance only so colours are untouched.
 */
function adaptiveDetail(buf: Uint8ClampedArray, w: number, h: number, noiseSigma: number, sharpen: number) {
  const n = w * h;
  const Y = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) Y[i] = 0.2126 * buf[j] + 0.7152 * buf[j + 1] + 0.0722 * buf[j + 2];
  const r = Math.max(1, Math.round(Math.max(w, h) / 2400));
  const mean = boxBlur(plane(w, h, Y), r).data;
  let variance: Float32Array | null = null;
  if (noiseSigma > 0) {
    const sq = new Float32Array(n);
    for (let i = 0; i < n; i++) sq[i] = Y[i] * Y[i];
    const msq = boxBlur(plane(w, h, sq), r).data;
    variance = new Float32Array(n);
    for (let i = 0; i < n; i++) variance[i] = Math.max(0, msq[i] - mean[i] * mean[i]);
  }
  const nv = noiseSigma * noiseSigma;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let gain = 1;
    if (variance) {
      const v = variance[i];
      const wiener = v > 1e-6 ? Math.max(0, v - nv) / v : 0;
      gain = 0.25 + 0.75 * wiener; // never flatten completely: keeps natural texture
    }
    if (sharpen > 0) gain *= 1 + sharpen * (variance ? Math.min(1, gain) : 1);
    const delta = (Y[i] - mean[i]) * (gain - 1);
    if (delta === 0) continue;
    buf[j] = buf[j] + delta;
    buf[j + 1] = buf[j + 1] + delta;
    buf[j + 2] = buf[j + 2] + delta;
  }
}
