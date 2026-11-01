"use client";
// Export: renders each photo at full resolution with its recipe, then derives the chosen formats
// (portal, WhatsApp, Instagram, story) on a canvas. Canvas re-encoding drops all camera metadata,
// including GPS location. Virtually staged photos always carry the staging label.

import { renderPhoto } from "@/lib/engine/client";
import type { Change } from "@/lib/engine/types";
import type { AiVersion, Photo, Project } from "./db";
import { buildZip, type ZipEntry } from "./zip";

export type PresetId = "full" | "portal" | "whatsapp" | "instagram" | "story";

type Preset = { id: PresetId; kind: "fit" | "cover" | "story" | "none"; long?: number; w?: number; h?: number; quality: number };

export const PRESETS: Record<PresetId, Preset> = {
  full: { id: "full", kind: "none", quality: 0.92 },
  portal: { id: "portal", kind: "fit", long: 2048, quality: 0.86 },
  whatsapp: { id: "whatsapp", kind: "fit", long: 1600, quality: 0.86 },
  instagram: { id: "instagram", kind: "cover", w: 1080, h: 1350, quality: 0.9 },
  story: { id: "story", kind: "story", w: 1080, h: 1920, quality: 0.9 },
};

export type Overlay = {
  staged?: string; // label text, mandatory for staged images
  aiEdited?: string;
  broker?: { name: string; license: string; licenseLabel: string };
};

export type ExportOptions = {
  presets: PresetId[];
  includeOriginals: boolean;
  manifest: { include: boolean; filename: string; build: (items: ManifestItem[]) => string };
  overlay: { stagedLabel: string; aiLabel: string; broker?: { name: string; license: string; licenseLabel: string } };
  onProgress?: (done: number, total: number) => void;
};

export type ManifestItem = { index: number; name: string; changes: Change[]; version?: AiVersion; files: string[] };

async function bitmapOf(blob: Blob) {
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

/** High-quality downscale by halving steps (browsers alias badly on big single-step reductions). */
function drawScaled(src: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  let cur: CanvasImageSource & { width: number; height: number } = src;
  let cw = src.width;
  let ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    cw = Math.round(cw / 2);
    ch = Math.round(ch / 2);
    const { c, ctx } = canvas(cw, ch);
    ctx.drawImage(cur, 0, 0, cw, ch);
    cur = c;
  }
  const { c, ctx } = canvas(w, h);
  ctx.drawImage(cur, 0, 0, w, h);
  return { c, ctx };
}

function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, o: Overlay, rtl: boolean) {
  const unit = Math.max(12, Math.round(Math.min(w, h) * 0.028));
  ctx.save();
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textBaseline = "middle";
  const pill = (text: string, x: number, y: number, alignEnd: boolean, bg: string) => {
    // next/font serves the face under a generated name, exposed through this CSS variable.
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-plex").trim() || "system-ui, sans-serif";
    ctx.font = `600 ${unit}px ${family}`;
    const tw = ctx.measureText(text).width;
    const pw = tw + unit * 1.3;
    const ph = unit * 2;
    const px = alignEnd ? x - pw : x;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(px, y, pw, ph, unit * 0.35);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(text, px + pw / 2, y + ph / 2 + 1);
  };
  const m = unit;
  // Staging / AI label: top, reading-start corner, on every derived image.
  const top = o.staged ?? o.aiEdited;
  if (top) pill(top, rtl ? w - m : m, m, rtl, o.staged ? "rgba(26,58,140,0.92)" : "rgba(20,25,34,0.78)");
  if (o.broker && (o.broker.name || o.broker.license)) {
    const text = [o.broker.name, o.broker.license ? `${o.broker.licenseLabel} ${o.broker.license}` : ""].filter(Boolean).join(" · ");
    pill(text, rtl ? m : w - m, h - m - unit * 2, !rtl, "rgba(20,25,34,0.72)");
  }
  ctx.restore();
}

async function derive(base: ImageBitmap, p: Preset, overlay: Overlay, rtl: boolean): Promise<Blob> {
  let out: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  const W = base.width;
  const H = base.height;
  if (p.kind === "none") {
    out = canvas(W, H);
    out.ctx.drawImage(base, 0, 0);
  } else if (p.kind === "fit") {
    const s = Math.min(1, p.long! / Math.max(W, H));
    out = drawScaled(base, Math.round(W * s), Math.round(H * s));
  } else if (p.kind === "cover") {
    const tw = p.w!, th = p.h!;
    const s = Math.max(tw / W, th / H);
    const sw = tw / s, sh = th / s;
    const sx = (W - sw) / 2, sy = (H - sh) / 2;
    const tmp = canvas(Math.round(sw), Math.round(sh));
    tmp.ctx.drawImage(base, sx, sy, sw, sh, 0, 0, tmp.c.width, tmp.c.height);
    out = drawScaled(tmp.c, tw, th);
  } else {
    // Story: the whole photo, centred, on a blurred and darkened copy of itself.
    const tw = p.w!, th = p.h!;
    out = canvas(tw, th);
    const bs = Math.max(tw / W, th / H);
    out.ctx.filter = "blur(36px) brightness(0.55)";
    out.ctx.drawImage(base, (tw - W * bs) / 2, (th - H * bs) / 2, W * bs, H * bs);
    out.ctx.filter = "none";
    const fs = Math.min(tw / W, th / H);
    const fw = Math.round(W * fs), fh = Math.round(H * fs);
    const fitted = drawScaled(base, fw, fh);
    out.ctx.drawImage(fitted.c, (tw - fw) / 2, (th - fh) / 2);
  }
  drawOverlay(out.ctx, out.c.width, out.c.height, overlay, rtl);
  return new Promise((resolve, reject) =>
    out.c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", p.quality),
  );
}

/** The final full-resolution image of a photo: its active AI version, or the studio correction. */
export async function finalImage(photo: Photo, onProgress?: (f: number) => void): Promise<{ blob: Blob; changes: Change[]; version?: AiVersion }> {
  const version = photo.versions.find((v) => v.id === photo.activeVersion);
  if (version) return { blob: version.blob, changes: [], version };
  if (!photo.analysis || !photo.recipe) throw new Error("photo not analysed");
  const r = await renderPhoto(photo.original, photo.analysis, photo.recipe, {
    maxEdge: 8192,
    quality: 0.95,
    onProgress: (f) => onProgress?.(f),
  });
  return { blob: r.blob, changes: r.changes };
}

export function slug(s: string) {
  return s.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-").slice(0, 60) || "photos";
}

const pad = (n: number) => String(n).padStart(2, "0");

export async function exportPhotos(project: Project, photos: Photo[], opts: ExportOptions, rtl: boolean): Promise<{ blob: Blob; filename: string }> {
  const folder = slug(project.name);
  const entries: ZipEntry[] = [];
  const manifest: ManifestItem[] = [];
  const total = photos.length;
  let done = 0;
  opts.onProgress?.(0, total);
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const { blob, changes, version } = await finalImage(photo);
    const base = await bitmapOf(blob);
    const overlay: Overlay = {
      staged: version?.tool === "stage" ? opts.overlay.stagedLabel : undefined,
      aiEdited: version && version.tool !== "stage" && version.tool !== "upscale" ? opts.overlay.aiLabel : undefined,
      broker: opts.overlay.broker,
    };
    const files: string[] = [];
    for (const pid of opts.presets) {
      const out = await derive(base, PRESETS[pid], overlay, rtl);
      const name = `${pad(i + 1)}-${pid}.jpg`;
      entries.push({ name: `${folder}/${name}`, data: new Uint8Array(await out.arrayBuffer()) });
      files.push(name);
    }
    base.close();
    if (opts.includeOriginals) {
      const ext = (photo.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg").toLowerCase();
      const name = `originals/${pad(i + 1)}-original${ext}`;
      entries.push({ name: `${folder}/${name}`, data: new Uint8Array(await photo.original.arrayBuffer()) });
      files.push(name);
    }
    manifest.push({ index: i + 1, name: photo.name, changes, version, files });
    done++;
    opts.onProgress?.(done, total);
  }
  if (opts.manifest.include) {
    entries.push({ name: `${folder}/${opts.manifest.filename}`, data: new TextEncoder().encode(opts.manifest.build(manifest)) });
  }
  // One photo in one format and nothing else: hand over the JPEG itself, no ZIP.
  if (entries.length === 1) {
    return { blob: new Blob([entries[0].data as BlobPart], { type: "image/jpeg" }), filename: `${folder}-${entries[0].name.split("/").pop()}` };
  }
  return { blob: buildZip(entries), filename: `${folder}.zip` };
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Share sheet on phones (save to Photos, send on WhatsApp). */
export async function shareFiles(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
