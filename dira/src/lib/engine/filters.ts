// Image filters on single-channel float planes. All are O(pixels) regardless of radius.

import type { Raster } from "./types";

export type Plane = { width: number; height: number; data: Float32Array };

export function plane(width: number, height: number, data?: Float32Array): Plane {
  return { width, height, data: data ?? new Float32Array(width * height) };
}

/** Box mean with a square window of (2r+1)^2, clamped at the borders. Separable running sums. */
export function boxBlur(src: Plane, r: number): Plane {
  const { width: w, height: h } = src;
  if (r < 1) return plane(w, h, src.data.slice());
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const s = src.data;
  // Horizontal pass.
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    let n = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) {
      acc += s[row + x];
      n++;
    }
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / n;
      const add = x + r + 1;
      const sub = x - r;
      if (add < w) {
        acc += s[row + add];
        n++;
      }
      if (sub >= 0) {
        acc -= s[row + sub];
        n--;
      }
    }
  }
  // Vertical pass.
  for (let x = 0; x < w; x++) {
    let acc = 0;
    let n = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) {
      acc += tmp[y * w + x];
      n++;
    }
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / n;
      const add = y + r + 1;
      const sub = y - r;
      if (add < h) {
        acc += tmp[add * w + x];
        n++;
      }
      if (sub >= 0) {
        acc -= tmp[sub * w + x];
        n--;
      }
    }
  }
  return plane(w, h, out);
}

/**
 * Guided filter (He, Sun & Tang 2010). Smooths `p` while keeping the edges of guide `I`.
 * Returns the linear coefficients (a, b) so callers can apply them at a higher resolution
 * (the "fast guided filter" trick): q = a * I + b.
 */
export function guidedCoefficients(I: Plane, p: Plane, r: number, eps: number): { a: Plane; b: Plane } {
  const n = I.width * I.height;
  const Ip = new Float32Array(n);
  const II = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    Ip[i] = I.data[i] * p.data[i];
    II[i] = I.data[i] * I.data[i];
  }
  const meanI = boxBlur(I, r).data;
  const meanP = boxBlur(p, r).data;
  const meanIp = boxBlur(plane(I.width, I.height, Ip), r).data;
  const meanII = boxBlur(plane(I.width, I.height, II), r).data;
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const cov = meanIp[i] - meanI[i] * meanP[i];
    const v = meanII[i] - meanI[i] * meanI[i];
    a[i] = cov / (v + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }
  return { a: boxBlur(plane(I.width, I.height, a), r), b: boxBlur(plane(I.width, I.height, b), r) };
}

/** Bilinear sample of a plane at fractional coordinates (clamped to the edges). */
export function sampleBilinear(p: Plane, x: number, y: number): number {
  const w = p.width;
  const h = p.height;
  if (x < 0) x = 0;
  else if (x > w - 1) x = w - 1;
  if (y < 0) y = 0;
  else if (y > h - 1) y = h - 1;
  const x0 = x | 0;
  const y0 = y | 0;
  const x1 = x0 + 1 < w ? x0 + 1 : x0;
  const y1 = y0 + 1 < h ? y0 + 1 : y0;
  const fx = x - x0;
  const fy = y - y0;
  const d = p.data;
  const top = d[y0 * w + x0] * (1 - fx) + d[y0 * w + x1] * fx;
  const bot = d[y1 * w + x0] * (1 - fx) + d[y1 * w + x1] * fx;
  return top * (1 - fy) + bot * fy;
}

/** Box-averaged downscale of an RGBA raster so its long edge is at most `maxEdge`. */
export function downscale(src: Raster, maxEdge: number): Raster {
  const { width: w, height: h } = src;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  if (scale >= 1) return { width: w, height: h, data: new Uint8ClampedArray(src.data) };
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const out = new Uint8ClampedArray(tw * th * 4);
  const sx = w / tw;
  const sy = h / th;
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor(ty * sy);
    const y1 = Math.min(h, Math.max(y0 + 1, Math.floor((ty + 1) * sy)));
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor(tx * sx);
      const x1 = Math.min(w, Math.max(x0 + 1, Math.floor((tx + 1) * sx)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * w + x0) * 4;
        for (let x = x0; x < x1; x++) {
          r += src.data[i];
          g += src.data[i + 1];
          b += src.data[i + 2];
          a += src.data[i + 3];
          n++;
          i += 4;
        }
      }
      const o = (ty * tw + tx) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = a / n;
    }
  }
  return { width: tw, height: th, data: out };
}

/** Downscale a float plane by an integer-ish factor using box averaging. */
export function downscalePlane(src: Plane, tw: number, th: number): Plane {
  const { width: w, height: h } = src;
  const out = new Float32Array(tw * th);
  const sx = w / tw;
  const sy = h / th;
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor(ty * sy);
    const y1 = Math.min(h, Math.max(y0 + 1, Math.floor((ty + 1) * sy)));
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor(tx * sx);
      const x1 = Math.min(w, Math.max(x0 + 1, Math.floor((tx + 1) * sx)));
      let acc = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        acc += src.data[y * w + x];
        n++;
      }
      out[ty * tw + tx] = acc / n;
    }
  }
  return plane(tw, th, out);
}

function lanczos3(x: number): number {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  const px = Math.PI * x;
  return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px);
}

/**
 * Lanczos-3 resize of an RGBA raster (used for the classic ×2 enlargement).
 * Separable: horizontal pass into a float buffer, then vertical pass.
 */
export function resizeLanczos(src: Raster, tw: number, th: number): Raster {
  const { width: w, height: h } = src;
  const weightsFor = (srcLen: number, dstLen: number) => {
    const scale = srcLen / dstLen;
    const support = scale > 1 ? 3 * scale : 3;
    const filterScale = scale > 1 ? scale : 1;
    const starts = new Int32Array(dstLen);
    const counts = new Int32Array(dstLen);
    const all: number[][] = [];
    for (let i = 0; i < dstLen; i++) {
      const center = (i + 0.5) * scale - 0.5;
      const start = Math.max(0, Math.ceil(center - support));
      const end = Math.min(srcLen - 1, Math.floor(center + support));
      const ws: number[] = [];
      let sum = 0;
      for (let j = start; j <= end; j++) {
        const wv = lanczos3((j - center) / filterScale);
        ws.push(wv);
        sum += wv;
      }
      for (let k = 0; k < ws.length; k++) ws[k] /= sum || 1;
      starts[i] = start;
      counts[i] = ws.length;
      all.push(ws);
    }
    return { starts, counts, all };
  };
  const hx = weightsFor(w, tw);
  const vy = weightsFor(h, th);
  const tmp = new Float32Array(tw * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < tw; x++) {
      const ws = hx.all[x];
      const s0 = hx.starts[x];
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < ws.length; k++) {
        const i = (y * w + s0 + k) * 4;
        const wv = ws[k];
        r += src.data[i] * wv;
        g += src.data[i + 1] * wv;
        b += src.data[i + 2] * wv;
        a += src.data[i + 3] * wv;
      }
      const o = (y * tw + x) * 4;
      tmp[o] = r;
      tmp[o + 1] = g;
      tmp[o + 2] = b;
      tmp[o + 3] = a;
    }
  }
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const ws = vy.all[y];
    const s0 = vy.starts[y];
    for (let x = 0; x < tw; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < ws.length; k++) {
        const i = ((s0 + k) * tw + x) * 4;
        const wv = ws[k];
        r += tmp[i] * wv;
        g += tmp[i + 1] * wv;
        b += tmp[i + 2] * wv;
        a += tmp[i + 3] * wv;
      }
      const o = (y * tw + x) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }
  }
  return { width: tw, height: th, data: out };
}

/** Grayscale luminance plane (sRGB-encoded 0..1, i.e. perceptual) of a raster. */
export function lumaPlane(src: Raster): Plane {
  const n = src.width * src.height;
  const out = new Float32Array(n);
  const d = src.data;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    out[i] = (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255;
  }
  return plane(src.width, src.height, out);
}
