"use client";
// Main-thread side of the engine: a small pool of Web Workers with a promise API.

import type { WorkerRequest, WorkerResponse } from "./worker";
import type { Analysis, Change, Recipe } from "./types";

type Pending = {
  resolve: (r: WorkerResponse) => void;
  reject: (e: EngineError) => void;
  onProgress?: (fraction: number, stage: string) => void;
};

export class EngineError extends Error {
  constructor(message: string, public code: "decode" | "memory" | "unknown" | "unsupported") {
    super(message);
  }
}

let pool: Worker[] | null = null;
let next = 0;
let seq = 1;
const pending = new Map<number, Pending>();

function workers(): Worker[] {
  if (pool) return pool;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    throw new EngineError("This browser can't process photos on the device.", "unsupported");
  }
  // Two workers on machines with enough cores: a batch then processes two photos at a time.
  const size = Math.min(2, Math.max(1, (navigator.hardwareConcurrency ?? 2) >= 6 ? 2 : 1));
  pool = Array.from({ length: size }, () => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.type === "progress") {
        p.onProgress?.(msg.fraction, msg.stage);
        return;
      }
      pending.delete(msg.id);
      if (msg.type === "error") p.reject(new EngineError(msg.message, msg.code));
      else p.resolve(msg);
    };
    w.onerror = (e) => {
      for (const [id, p] of pending) {
        p.reject(new EngineError(e.message || "worker crashed", "unknown"));
        pending.delete(id);
      }
    };
    return w;
  });
  return pool;
}

type RequestBody = WorkerRequest extends infer R ? (R extends unknown ? Omit<R, "id"> : never) : never;

function send(req: RequestBody, onProgress?: Pending["onProgress"]): Promise<WorkerResponse> {
  const list = workers();
  const id = seq++;
  const worker = list[next++ % list.length];
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    worker.postMessage({ ...req, id } as WorkerRequest);
  });
}

/** Analysis runs on a copy with a long edge of at most 2048 px (enough for every measurement). */
export async function analyzePhoto(blob: Blob): Promise<{ analysis: Analysis; width: number; height: number; proxy: Blob; thumb: Blob }> {
  const res = await send({ type: "analyze", blob, maxEdge: 2048 });
  if (res.type !== "analyzed") throw new EngineError("unexpected response", "unknown");
  return { analysis: res.analysis, width: res.width, height: res.height, proxy: res.proxy, thumb: res.thumb };
}

export async function renderPhoto(
  blob: Blob,
  analysis: Analysis,
  recipe: Recipe,
  opts: { maxEdge: number; quality?: number; mime?: "image/jpeg" | "image/webp"; onProgress?: (f: number, stage: string) => void },
): Promise<{ blob: Blob; width: number; height: number; changes: Change[] }> {
  const res = await send(
    { type: "render", blob, analysis, recipe, maxEdge: opts.maxEdge, quality: opts.quality ?? 0.92, mime: opts.mime ?? "image/jpeg" },
    opts.onProgress,
  );
  if (res.type !== "rendered") throw new EngineError("unexpected response", "unknown");
  return { blob: res.blob, width: res.width, height: res.height, changes: res.changes };
}
