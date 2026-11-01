/// <reference lib="webworker" />
// Runs the engine off the main thread. Decodes images with createImageBitmap, renders with the
// pipeline and encodes JPEGs with OffscreenCanvas, so the page stays responsive on phones.

import { analyze } from "./analyze";
import { render } from "./pipeline";
import type { Analysis, Change, Raster, Recipe } from "./types";

export type WorkerRequest =
  | { id: number; type: "analyze"; blob: Blob; maxEdge: number }
  | { id: number; type: "render"; blob: Blob; analysis: Analysis; recipe: Recipe; maxEdge: number; quality: number; mime: "image/jpeg" | "image/webp" };

export type WorkerResponse =
  | { id: number; type: "progress"; fraction: number; stage: string }
  | { id: number; type: "analyzed"; analysis: Analysis; width: number; height: number; proxy: Blob; thumb: Blob }
  | { id: number; type: "rendered"; blob: Blob; width: number; height: number; changes: Change[] }
  | { id: number; type: "error"; message: string; code: "decode" | "memory" | "unknown" };

// iOS Safari refuses canvases above ~16.7 MP; stay under that everywhere.
const MAX_PIXELS = 16_000_000;

function rasterFrom(bitmap: ImageBitmap, maxEdge: number): Raster {
  let w = bitmap.width;
  let h = bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h), Math.sqrt(MAX_PIXELS / (w * h)));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  return { width: w, height: h, data };
}

async function decode(blob: Blob, maxEdge: number): Promise<Raster> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  try {
    return rasterFrom(bitmap, maxEdge);
  } finally {
    bitmap.close();
  }
}

/** A downscaled JPEG of the bitmap (proxy for previews, thumbnail for the filmstrip). */
async function scaledJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const s = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * s));
  const h = Math.max(1, Math.round(bitmap.height * s));
  // Two-step reduction keeps fine detail from aliasing on large photos.
  let src: ImageBitmap | OffscreenCanvas = bitmap;
  if (s < 0.5) {
    const mid = new OffscreenCanvas(w * 2, h * 2);
    const mctx = mid.getContext("2d")!;
    mctx.imageSmoothingQuality = "high";
    mctx.drawImage(bitmap, 0, 0, w * 2, h * 2);
    src = mid;
  }
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return c.convertToBlob({ type: "image/jpeg", quality });
}

async function encode(r: Raster, mime: string, quality: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(r.width, r.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.width, r.height), 0, 0);
  return canvas.convertToBlob({ type: mime, quality });
}

const post = (msg: WorkerResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "analyze") {
      const bitmap = await createImageBitmap(req.blob, { imageOrientation: "from-image" });
      try {
        const analysis = analyze(rasterFrom(bitmap, req.maxEdge));
        // Report the original's real size; the analysis itself is resolution-independent.
        analysis.width = bitmap.width;
        analysis.height = bitmap.height;
        analysis.megapixels = Math.round((bitmap.width * bitmap.height) / 1e5) / 10;
        const proxy = await scaledJpeg(bitmap, 1600, 0.9);
        const thumb = await scaledJpeg(bitmap, 320, 0.8);
        post({ id: req.id, type: "analyzed", analysis, width: bitmap.width, height: bitmap.height, proxy, thumb });
      } finally {
        bitmap.close();
      }
      return;
    }
    if (req.type === "render") {
      post({ id: req.id, type: "progress", fraction: 0.01, stage: "decode" });
      const raster = await decode(req.blob, req.maxEdge);
      const result = render(raster, req.analysis, req.recipe, (fraction, stage) =>
        post({ id: req.id, type: "progress", fraction: fraction * 0.92, stage }),
      );
      post({ id: req.id, type: "progress", fraction: 0.95, stage: "encode" });
      const blob = await encode(result.raster, req.mime, req.quality);
      post({ id: req.id, type: "rendered", blob, width: result.raster.width, height: result.raster.height, changes: result.changes });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = /decode|source image|InvalidState|not.*supported/i.test(message)
      ? "decode"
      : /memory|allocation|Array buffer/i.test(message)
        ? "memory"
        : "unknown";
    post({ id: req.id, type: "error", message, code });
  }
};
