// Classic object removal: fills a brushed area with texture copied from the rest of the photo
// (multi-scale PatchMatch, Barnes et al. 2009 / Wexler et al. 2007). No generative model is used,
// so nothing new is invented: every filled pixel comes from somewhere else in the same photo.
// Works best for small objects on walls, floors and counters (a cable, a socket cover, a magnet).

import { boxBlur, plane } from "./filters";
import type { Raster, Stroke } from "./types";

const PR = 3; // patch radius -> 7x7 patches
const PATCH_AREA = (2 * PR + 1) * (2 * PR + 1);
const TEX_WEIGHT = 3;

/** Rasterise brush strokes (normalised coordinates) into a 0/1 mask at the given size. */
export function strokesToMask(strokes: Stroke[], width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  const long = Math.max(width, height);
  const disk = (cx: number, cy: number, r: number) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(width - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(height - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) mask[y * width + x] = 1;
    }
  };
  for (const s of strokes) {
    const r = Math.max(1.5, s.radius * long);
    const pts = s.points.map(([x, y]) => [x * width, y * height] as const);
    if (pts.length === 1) disk(pts[0][0], pts[0][1], r);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (r * 0.4)));
      for (let k = 0; k <= steps; k++) disk(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, r);
    }
  }
  return mask;
}

type Level = { w: number; h: number; img: Float32Array; hole: Uint8Array };

function downLevel(l: Level): Level {
  const w = Math.max(1, l.w >> 1), h = Math.max(1, l.h >> 1);
  const img = new Float32Array(w * h * 3);
  const hole = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0, anyHole = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = Math.min(l.w - 1, 2 * x + dx), sy = Math.min(l.h - 1, 2 * y + dy);
      const i = sy * l.w + sx;
      if (l.hole[i]) anyHole = 1;
      else {
        r += l.img[i * 3]; g += l.img[i * 3 + 1]; b += l.img[i * 3 + 2]; n++;
      }
    }
    const o = y * w + x;
    hole[o] = anyHole;
    if (n) {
      img[o * 3] = r / n; img[o * 3 + 1] = g / n; img[o * 3 + 2] = b / n;
    }
  }
  return { w, h, img, hole };
}

/** Rough initial fill: repeatedly average known neighbours into the hole, from the edge inwards. */
function onionFill(l: Level) {
  const { w, h, img } = l;
  const known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = l.hole[i] ? 0 : 1;
  let remaining = w * h - known.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (remaining > 0 && guard++ < w + h) {
    const next: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (known[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!known[j]) continue;
        r += img[j * 3]; g += img[j * 3 + 1]; b += img[j * 3 + 2]; n++;
      }
      if (n) {
        img[i * 3] = r / n; img[i * 3 + 1] = g / n; img[i * 3 + 2] = b / n;
        next.push(i);
      }
    }
    if (!next.length) break;
    for (const i of next) known[i] = 1;
    remaining -= next.length;
  }
}

function textureMap(l: Level, valid: Uint8Array): Float32Array {
  const { w, h, img } = l;
  const n = w * h;
  const v = new Float32Array(n);
  const v2 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const m = (img[i * 3] + img[i * 3 + 1] + img[i * 3 + 2]) / 3;
    v[i] = m;
    v2[i] = m * m;
  }
  const mean = boxBlur(plane(w, h, v), PR).data;
  const mean2 = boxBlur(plane(w, h, v2), PR).data;
  const tex = new Float32Array(n);
  const known = new Uint8Array(n);
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!valid[i]) continue;
    tex[i] = Math.sqrt(Math.max(0, mean2[i] - mean[i] * mean[i]));
    known[i] = 1;
    frontier.push(i);
  }
  // Breadth-first spread from intact patches into everything else (the hole and the image border).
  while (frontier.length) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w, y = (i / w) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) {
        if (j < 0 || known[j]) continue;
        known[j] = 1;
        tex[j] = tex[i];
        next.push(j);
      }
    }
    frontier = next;
  }
  return tex;
}

/** Number of patch centres whose whole patch is inside the image and outside the hole. */
function countSources(l: Level): number {
  const { w, h, hole } = l;
  // Running 2D sum of hole pixels to test each (2PR+1)^2 window in O(1).
  const S = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    S[(y + 1) * (w + 1) + x + 1] = hole[y * w + x] + S[y * (w + 1) + x + 1] + S[(y + 1) * (w + 1) + x] - S[y * (w + 1) + x];
  }
  let n = 0;
  for (let y = PR; y < h - PR; y++) for (let x = PR; x < w - PR; x++) {
    const a = S[(y - PR) * (w + 1) + x - PR], b = S[(y - PR) * (w + 1) + x + PR + 1];
    const c = S[(y + PR + 1) * (w + 1) + x - PR], d = S[(y + PR + 1) * (w + 1) + x + PR + 1];
    if (d - b - c + a === 0) n++;
  }
  return n;
}

/** Deterministic PRNG so the same brush strokes always give the same result. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function solveLevel(l: Level, nnx: Int32Array, nny: Int32Array, iters: number, rand: () => number, finalCopy = false, voteFirst = false) {
  const { w, h, img, hole } = l;
  // Source patches: fully inside the image and touching no hole pixel.
  const valid = new Uint8Array(w * h);
  const srcList: number[] = [];
  const holeDil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!hole[y * w + x]) continue;
    for (let dy = -PR; dy <= PR; dy++) for (let dx = -PR; dx <= PR; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) holeDil[yy * w + xx] = 1;
    }
  }
  for (let y = PR; y < h - PR; y++) for (let x = PR; x < w - PR; x++) {
    const i = y * w + x;
    if (!holeDil[i]) { valid[i] = 1; srcList.push(i); }
  }
  if (srcList.length === 0) return false;

  const targets: number[] = [];
  for (let i = 0; i < w * h; i++) if (holeDil[i]) targets.push(i);

  // Texture energy: the local standard deviation of each intact patch, spread into the hole from its
  // nearest intact surroundings. Matching it keeps grainy floors grainy and smooth walls smooth, and
  // stops the fill drifting toward the blandest patch in the photo (plain colour distance favours those).
  const tex = textureMap(l, valid);

  const dist = (px: number, py: number, qx: number, qy: number, best: number) => {
    let d = 0;
    let n = 0;
    for (let dy = -PR; dy <= PR; dy++) {
      const ty = py + dy;
      if (ty < 0 || ty >= h) continue;
      const sy = qy + dy;
      for (let dx = -PR; dx <= PR; dx++) {
        const tx = px + dx;
        if (tx < 0 || tx >= w) continue;
        const ti = (ty * w + tx) * 3;
        const si = (sy * w + qx + dx) * 3;
        const a = img[ti] - img[si], b = img[ti + 1] - img[si + 1], c = img[ti + 2] - img[si + 2];
        d += a * a + b * b + c * c;
        n++;
      }
      // Early out: the final mean can't be lower than d / (full patch size).
      if (d > best * PATCH_AREA) return Infinity;
    }
    const t = tex[qy * w + qx] - tex[py * w + px];
    return d / Math.max(1, n) + TEX_WEIGHT * t * t;
  };

  const cost = new Float32Array(w * h).fill(Infinity);
  for (const i of targets) {
    let q = nny[i] * w + nnx[i];
    if (!(nnx[i] >= 0 && valid[q])) {
      q = srcList[(rand() * srcList.length) | 0];
      nnx[i] = q % w;
      nny[i] = (q / w) | 0;
    }
    cost[i] = dist(i % w, (i / w) | 0, nnx[i], nny[i], Infinity);
  }

  const tryCandidate = (i: number, px: number, py: number, qx: number, qy: number) => {
    if (qx < PR || qy < PR || qx >= w - PR || qy >= h - PR) return;
    if (!valid[qy * w + qx]) return;
    const d = dist(px, py, qx, qy, cost[i]);
    if (d < cost[i]) {
      cost[i] = d;
      nnx[i] = qx;
      nny[i] = qy;
    }
  };

  const isTarget = holeDil;
  const search = () => {
    for (let pass = 0; pass < 2; pass++) {
      const forward = pass === 0;
      const order = forward ? targets : [...targets].reverse();
      const step = forward ? -1 : 1;
      for (const i of order) {
        const px = i % w, py = (i / w) | 0;
        // Propagation from the neighbour already visited in this scan direction.
        const lx = px + step;
        if (lx >= 0 && lx < w && isTarget[py * w + lx]) {
          const j = py * w + lx;
          tryCandidate(i, px, py, nnx[j] - step, nny[j]);
        }
        const ly = py + step;
        if (ly >= 0 && ly < h && isTarget[ly * w + px]) {
          const j = ly * w + px;
          tryCandidate(i, px, py, nnx[j], nny[j] - step);
        }
        // Random search in shrinking windows around the current best.
        let radius = Math.max(w, h);
        while (radius >= 1) {
          const qx = Math.round(nnx[i] + (rand() * 2 - 1) * radius);
          const qy = Math.round(nny[i] + (rand() * 2 - 1) * radius);
          tryCandidate(i, px, py, qx, qy);
          radius >>= 1;
        }
      }
    }
  };
  // Voting: every hole pixel becomes the weighted average of what overlapping patches propose.
  // Weights fall off sharply with patch distance (σ² = 75th percentile, after Wexler et al.),
  // so good matches dominate and the copied texture stays crisp.
  const vote = () => {
    const costs = targets.map((i) => cost[i]).filter(Number.isFinite).sort((x, y) => x - y);
    const s2 = Math.max(1e-6, costs[Math.floor(costs.length * 0.75)] ?? 1e-3);
    const acc = new Float32Array(w * h * 4);
    for (const i of targets) {
      const px = i % w, py = (i / w) | 0;
      const wgt = Number.isFinite(cost[i]) ? Math.exp(-cost[i] / (2 * s2)) + 1e-6 : 1e-6;
      for (let dy = -PR; dy <= PR; dy++) {
        const ty = py + dy;
        if (ty < 0 || ty >= h) continue;
        for (let dx = -PR; dx <= PR; dx++) {
          const tx = px + dx;
          if (tx < 0 || tx >= w) continue;
          const t = ty * w + tx;
          if (!hole[t]) continue;
          const s = ((nny[i] + dy) * w + nnx[i] + dx) * 3;
          acc[t * 4] += img[s] * wgt;
          acc[t * 4 + 1] += img[s + 1] * wgt;
          acc[t * 4 + 2] += img[s + 2] * wgt;
          acc[t * 4 + 3] += wgt;
        }
      }
    }
    for (let t = 0; t < w * h; t++) {
      if (!hole[t] || acc[t * 4 + 3] === 0) continue;
      img[t * 3] = acc[t * 4] / acc[t * 4 + 3];
      img[t * 3 + 1] = acc[t * 4 + 1] / acc[t * 4 + 3];
      img[t * 3 + 2] = acc[t * 4 + 2] / acc[t * 4 + 3];
    }
    for (const i of targets) cost[i] = dist(i % w, (i / w) | 0, nnx[i], nny[i], Infinity);
  };

  // On finer levels, first rebuild the hole from the matches carried up from the coarser level, so
  // the search starts from real texture instead of a blurry enlargement.
  if (voteFirst) vote();
  for (let it = 0; it < iters; it++) {
    search();
    vote();
  }
  if (finalCopy) {
    // Last step at full size: copy each hole pixel straight from its best match, mixed with the vote.
    // Pure copying keeps grain and texture; the vote keeps neighbouring copies consistent.
    for (const i of targets) {
      if (!hole[i]) continue;
      const s = (nny[i] * w + nnx[i]) * 3;
      img[i * 3] = img[i * 3] * 0.35 + img[s] * 0.65;
      img[i * 3 + 1] = img[i * 3 + 1] * 0.35 + img[s + 1] * 0.65;
      img[i * 3 + 2] = img[i * 3 + 2] * 0.35 + img[s + 2] * 0.65;
    }
  }
  return true;
}

/** Fill the masked area of `src`. Returns a new raster; untouched pixels are copied exactly. */
export function inpaint(src: Raster, mask: Uint8Array, maxWorkEdge = 1400): Raster {
  const { width: W, height: H } = src;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const out: Raster = { width: W, height: H, data: new Uint8ClampedArray(src.data) };
  if (x1 < 0) return out;

  // Work in a window around the hole with enough surrounding texture to copy from.
  const margin = Math.max(64, Math.round(Math.max(x1 - x0, y1 - y0) * 2));
  const rx0 = Math.max(0, x0 - margin), ry0 = Math.max(0, y0 - margin);
  const rx1 = Math.min(W - 1, x1 + margin), ry1 = Math.min(H - 1, y1 + margin);
  const rw = rx1 - rx0 + 1, rh = ry1 - ry0 + 1;
  // Very large windows are solved at reduced size and the fill is scaled back up.
  const scale = Math.min(1, maxWorkEdge / Math.max(rw, rh));
  const ww = Math.max(8, Math.round(rw * scale)), wh = Math.max(8, Math.round(rh * scale));

  const base: Level = { w: ww, h: wh, img: new Float32Array(ww * wh * 3), hole: new Uint8Array(ww * wh) };
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    const sx0 = rx0 + Math.floor(x / scale), sy0 = ry0 + Math.floor(y / scale);
    const sx1 = Math.min(rx1, rx0 + Math.floor((x + 1) / scale) - 1), sy1 = Math.min(ry1, ry0 + Math.floor((y + 1) / scale) - 1);
    let r = 0, g = 0, b = 0, n = 0, anyHole = 0;
    for (let sy = sy0; sy <= Math.max(sy0, sy1); sy++) for (let sx = sx0; sx <= Math.max(sx0, sx1); sx++) {
      const i = sy * W + sx;
      if (mask[i]) anyHole = 1;
      r += src.data[i * 4]; g += src.data[i * 4 + 1]; b += src.data[i * 4 + 2]; n++;
    }
    const o = y * ww + x;
    base.hole[o] = anyHole;
    base.img[o * 3] = r / n / 255; base.img[o * 3 + 1] = g / n / 255; base.img[o * 3 + 2] = b / n / 255;
  }

  // Go down until the hole is about one patch wide: there the rough initial fill hardly matters and
  // texture is chosen by matching, then refined level by level.
  const holeSpan = Math.max(x1 - x0 + 1, y1 - y0 + 1) * scale;
  const levels: Level[] = [base];
  while (levels.length < 9) {
    const top = levels[levels.length - 1];
    const span = holeSpan / 2 ** (levels.length - 1);
    if (span <= 2 * PR + 2 || Math.min(top.w, top.h) < 4 * PR + 6) break;
    levels.push(downLevel(top));
  }

  // Start at the coarsest level that still has enough intact texture to copy from.
  let start = levels.length - 1;
  while (start > 0) {
    const l = levels[start];
    const holes = l.hole.reduce((a, b) => a + b, 0);
    if (countSources(l) >= Math.max(64, holes * 2)) break;
    start--;
  }

  const rand = rng(x0 * 73856093 ^ y0 * 19349663 ^ (x1 - x0) * 83492791);
  let nnx = new Int32Array(0), nny = new Int32Array(0);
  for (let li = start; li >= 0; li--) {
    const l = levels[li];
    if (li === start) {
      onionFill(l);
      nnx = new Int32Array(l.w * l.h).fill(-1);
      nny = new Int32Array(l.w * l.h).fill(-1);
    } else {
      // Upsample the previous level's fill and nearest-neighbour field.
      const prev = levels[li + 1];
      const ux = new Int32Array(l.w * l.h), uy = new Int32Array(l.w * l.h);
      for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
        const px = Math.min(prev.w - 1, x >> 1), py = Math.min(prev.h - 1, y >> 1);
        const pi = py * prev.w + px;
        const i = y * l.w + x;
        ux[i] = prev.hole[pi] || nnx[pi] >= 0 ? Math.min(l.w - 1, nnx[pi] * 2 + (x & 1)) : -1;
        uy[i] = prev.hole[pi] || nny[pi] >= 0 ? Math.min(l.h - 1, nny[pi] * 2 + (y & 1)) : -1;
        if (l.hole[i]) {
          l.img[i * 3] = prev.img[pi * 3];
          l.img[i * 3 + 1] = prev.img[pi * 3 + 1];
          l.img[i * 3 + 2] = prev.img[pi * 3 + 2];
        }
      }
      nnx = ux;
      nny = uy;
    }
    const iters = li === 0 ? 5 : li === start ? 10 : 6;
    // When there is nothing intact to copy from, the smooth fill from the edges stays in place.
    solveLevel(l, nnx, nny, iters, rand, li === 0, li !== start);
  }

  // Paste the filled pixels back at full resolution.
  const fin = levels[0];
  if (start === 0 && countSources(fin) === 0) onionFill(fin);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (!mask[i]) continue;
    const fx = Math.min(ww - 1, (x - rx0) * scale), fy = Math.min(wh - 1, (y - ry0) * scale);
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const jx = Math.min(ww - 1, ix + 1), jy = Math.min(wh - 1, iy + 1);
    const tx = fx - ix, ty = fy - iy;
    for (let c = 0; c < 3; c++) {
      const a = fin.img[(iy * ww + ix) * 3 + c], b = fin.img[(iy * ww + jx) * 3 + c];
      const d = fin.img[(jy * ww + ix) * 3 + c], e = fin.img[(jy * ww + jx) * 3 + c];
      out.data[i * 4 + c] = ((a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty) * 255;
    }
  }
  return out;
}
