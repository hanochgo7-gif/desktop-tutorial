// Vertical line correction ("upright"), the way architectural photographers fix leaning walls.
//
// 1. Find near-vertical straight lines (door frames, wall corners, windows) with a Hough transform
//    restricted to ±20° of vertical.
// 2. Fit the camera's roll and pitch so that, after a virtual rotation of the camera, those lines
//    become vertical. The correction is a true perspective homography H = K·R·K⁻¹, not a stretch.
// 3. Warp the photo and crop away the empty corners, keeping the original aspect ratio.
//
// This only changes the viewpoint geometry. It never makes a room bigger or adds anything.

import type { Line, Raster, VerticalFit } from "./types";
import type { Plane } from "./filters";

const DEG = Math.PI / 180;

export function detectVerticalLines(gray: Plane, maxLines = 40): Line[] {
  const { width: w, height: h, data: g } = gray;
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = g[i - w - 1], b = g[i - w], c = g[i - w + 1];
      const d = g[i - 1], f = g[i + 1];
      const p = g[i + w - 1], q = g[i + w], r = g[i + w + 1];
      const sx = c + 2 * f + r - a - 2 * d - p;
      const sy = p + 2 * q + r - a - 2 * b - c;
      gx[i] = sx;
      gy[i] = sy;
      mag[i] = Math.hypot(sx, sy);
    }
  }
  // Strong edges only: above the 85th percentile and an absolute floor.
  const sample: number[] = [];
  for (let i = 0; i < mag.length; i += 7) sample.push(mag[i]);
  sample.sort((a, b) => a - b);
  const thr = Math.max(0.12, sample[Math.floor(sample.length * 0.85)] ?? 0);

  const ANG_MAX = 20; // degrees
  const ANG_STEP = 0.25;
  const nA = Math.round((2 * ANG_MAX) / ANG_STEP) + 1;
  const nX = w + 2 * Math.ceil(h * Math.tan(ANG_MAX * DEG));
  const xOff = Math.ceil(h * Math.tan(ANG_MAX * DEG));
  const acc = new Float32Array(nA * nX);
  const cy = h / 2;
  const tanTable = new Float32Array(nA);
  for (let k = 0; k < nA; k++) tanTable[k] = Math.tan((-ANG_MAX + k * ANG_STEP) * DEG);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (mag[i] < thr) continue;
      const sx = gx[i];
      const sy = gy[i];
      // Near-vertical edge means a mostly horizontal gradient.
      if (Math.abs(sx) < Math.abs(sy) * 2.75) continue;
      const local = Math.atan(-sy / sx) / DEG; // edge deviation from vertical
      const k0 = Math.max(0, Math.floor((local - 2 + ANG_MAX) / ANG_STEP));
      const k1 = Math.min(nA - 1, Math.ceil((local + 2 + ANG_MAX) / ANG_STEP));
      for (let k = k0; k <= k1; k++) {
        const x0 = x - (y - cy) * tanTable[k];
        const xi = Math.round(x0) + xOff;
        if (xi >= 0 && xi < nX) acc[k * nX + xi] += 1;
      }
    }
  }

  // Peaks: local maxima above a minimum supporting length (12% of the height).
  const minVotes = h * 0.12;
  const peaks: { k: number; xi: number; v: number }[] = [];
  for (let k = 0; k < nA; k++) {
    for (let xi = 0; xi < nX; xi++) {
      const v = acc[k * nX + xi];
      if (v < minVotes) continue;
      let isMax = true;
      for (let dk = -4; dk <= 4 && isMax; dk++) {
        const kk = k + dk;
        if (kk < 0 || kk >= nA) continue;
        for (let dx = -5; dx <= 5; dx++) {
          const xx = xi + dx;
          if ((dk === 0 && dx === 0) || xx < 0 || xx >= nX) continue;
          const o = acc[kk * nX + xx];
          if (o > v || (o === v && (dk < 0 || (dk === 0 && dx < 0)))) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax) peaks.push({ k, xi, v });
    }
  }
  peaks.sort((a, b) => b.v - a.v);
  return peaks.slice(0, maxLines).map(({ k, xi, v }) => {
    const t = tanTable[k];
    const x0 = xi - xOff;
    const y1 = h * 0.2;
    const y2 = h * 0.8;
    return { x1: x0 + (y1 - cy) * t, y1, x2: x0 + (y2 - cy) * t, y2, weight: v / h };
  });
}

type Mat3 = number[]; // row-major 3x3

function mul(a: Mat3, b: Mat3): Mat3 {
  const o = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }
  return o;
}

/**
 * Homography that maps original image coordinates to corrected coordinates, for a camera
 * rotated by -roll around the optical axis and -pitch around the horizontal axis.
 */
export function correctionHomography(w: number, h: number, roll: number, pitch: number, focal: number): Mat3 {
  const f = focal * Math.max(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const K = [f, 0, cx, 0, f, cy, 0, 0, 1];
  const Kinv = [1 / f, 0, -cx / f, 0, 1 / f, -cy / f, 0, 0, 1];
  const cr = Math.cos(-roll * DEG), sr = Math.sin(-roll * DEG);
  const cp = Math.cos(-pitch * DEG), sp = Math.sin(-pitch * DEG);
  const Rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
  return mul(K, mul(mul(Rx, Rz), Kinv));
}

export function invert3(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const s = 1 / det;
  return [
    A * s, -(b * i - c * h) * s, (b * f - c * e) * s,
    B * s, (a * i - c * g) * s, -(a * f - c * d) * s,
    C * s, -(a * h - b * g) * s, (a * e - b * d) * s,
  ];
}

function apply(m: Mat3, x: number, y: number): [number, number] {
  const z = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / z, (m[3] * x + m[4] * y + m[5]) / z];
}

function leanOf(m: Mat3 | null, l: Line): number {
  const [x1, y1] = m ? apply(m, l.x1, l.y1) : [l.x1, l.y1];
  const [x2, y2] = m ? apply(m, l.x2, l.y2) : [l.x2, l.y2];
  return Math.atan2(x2 - x1, y2 - y1) / DEG;
}

/** Fit roll and pitch so the detected lines become vertical. Robust to a few non-vertical lines. */
export function fitVerticals(lines: Line[], w: number, h: number, focal = 0.75): VerticalFit | null {
  if (lines.length < 3) return null;
  const TRUNC = 3; // degrees: lines that stay more than this off after correction don't count
  const cost = (roll: number, pitch: number) => {
    const H = correctionHomography(w, h, roll, pitch, focal);
    let c = 0;
    for (const l of lines) {
      const a = leanOf(H, l);
      c += l.weight * Math.min(a * a, TRUNC * TRUNC);
    }
    return c;
  };
  let best = { roll: 0, pitch: 0, c: cost(0, 0) };
  const search = (r0: number, r1: number, rs: number, p0: number, p1: number, ps: number) => {
    for (let r = r0; r <= r1 + 1e-9; r += rs) {
      for (let p = p0; p <= p1 + 1e-9; p += ps) {
        const c = cost(r, p);
        if (c < best.c) best = { roll: r, pitch: p, c };
      }
    }
  };
  search(-8, 8, 0.25, -24, 24, 0.5);
  const { roll: rb, pitch: pb } = best;
  search(rb - 0.3, rb + 0.3, 0.05, pb - 0.6, pb + 0.6, 0.1);

  const H = correctionHomography(w, h, best.roll, best.pitch, focal);
  let inliers = 0;
  let before = 0;
  let after = 0;
  let wsum = 0;
  for (const l of lines) {
    const a0 = leanOf(null, l);
    const a1 = leanOf(H, l);
    if (Math.abs(a1) < 0.6) {
      inliers++;
      before += Math.abs(a0) * l.weight;
      after += Math.abs(a1) * l.weight;
      wsum += l.weight;
    }
  }
  const leanBefore = wsum ? before / wsum : 0;
  const leanAfter = wsum ? after / wsum : 0;
  const roll = Math.round(best.roll * 100) / 100;
  const pitch = Math.round(best.pitch * 100) / 100;
  const meaningful = Math.abs(roll) >= 0.2 || Math.abs(pitch) >= 0.5;
  return {
    roll,
    pitch,
    focal,
    inliers,
    leanBefore: Math.round(leanBefore * 100) / 100,
    leanAfter: Math.round(leanAfter * 100) / 100,
    confident: inliers >= 4 && inliers >= lines.length * 0.35 && meaningful,
  };
}

/**
 * The largest centred crop (in corrected coordinates) with the original aspect ratio that contains
 * no empty area after the warp.
 */
export function cropForCorrection(w: number, h: number, H: Mat3) {
  const [tlx, tly] = apply(H, 0, 0);
  const [trx, try_] = apply(H, w, 0);
  const [blx, bly] = apply(H, 0, h);
  const [brx, bry] = apply(H, w, h);
  const left = Math.max(tlx, blx);
  const right = Math.min(trx, brx);
  const top = Math.max(tly, try_);
  const bottom = Math.min(bly, bry);
  let cw = right - left;
  let ch = bottom - top;
  const cxm = (left + right) / 2;
  const cym = (top + bottom) / 2;
  const aspect = w / h;
  if (cw / ch > aspect) cw = ch * aspect;
  else ch = cw / aspect;
  return { x: cxm - cw / 2, y: cym - ch / 2, w: cw, h: ch, kept: (cw * ch) / (w * h) };
}

/** Warp a raster with the correction, cropped and resampled back to the same pixel size. */
export function warpVerticals(src: Raster, roll: number, pitch: number, focal: number): { raster: Raster; kept: number } {
  const { width: w, height: h, data } = src;
  const H = correctionHomography(w, h, roll, pitch, focal);
  const Hinv = invert3(H);
  const crop = cropForCorrection(w, h, H);
  const out = new Uint8ClampedArray(w * h * 4);
  const sx = crop.w / w;
  const sy = crop.h / h;
  for (let y = 0; y < h; y++) {
    const cyv = crop.y + (y + 0.5) * sy;
    for (let x = 0; x < w; x++) {
      const cxv = crop.x + (x + 0.5) * sx;
      const z = Hinv[6] * cxv + Hinv[7] * cyv + Hinv[8];
      let u = (Hinv[0] * cxv + Hinv[1] * cyv + Hinv[2]) / z - 0.5;
      let v = (Hinv[3] * cxv + Hinv[4] * cyv + Hinv[5]) / z - 0.5;
      if (u < 0) u = 0; else if (u > w - 1) u = w - 1;
      if (v < 0) v = 0; else if (v > h - 1) v = h - 1;
      const x0 = u | 0;
      const y0 = v | 0;
      const x1 = x0 + 1 < w ? x0 + 1 : x0;
      const y1 = y0 + 1 < h ? y0 + 1 : y0;
      const fx = u - x0;
      const fy = v - y0;
      const i00 = (y0 * w + x0) * 4, i01 = (y0 * w + x1) * 4, i10 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = data[i00 + c] + (data[i01 + c] - data[i00 + c]) * fx;
        const bot = data[i10 + c] + (data[i11 + c] - data[i10 + c]) * fx;
        out[o + c] = top + (bot - top) * fy;
      }
    }
  }
  return { raster: { width: w, height: h, data: out }, kept: crop.kept };
}
