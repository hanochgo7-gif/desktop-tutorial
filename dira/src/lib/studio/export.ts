"use client";
// Export: renders each photo at full resolution with its recipe, then derives the chosen formats
// (portal, WhatsApp, Instagram, story) on a canvas. Canvas re-encoding drops all camera metadata,
// including GPS location. Virtually staged photos always carry the staging label.

import { renderPhoto } from "@/lib/engine/client";
import type { Change } from "@/lib/engine/types";
import type { AiVersion, Photo, Project } from "./db";
import { buildZip, type ZipEntry } from "./zip";

export type PresetId = "full" | "portal" | "whatsapp" | "instagram" | "story";

type Preset = { id: PresetId; kind: "fit" | "backdrop" | "none"; long?: number; w?: number; h?: number; quality: number; folder: string; safeY?: number };

/**
 * Social formats never crop: the whole room sits on a blurred copy of itself, so no wall or window
 * is cut off. The story keeps its labels inside the safe zone that Instagram's own UI leaves clear.
 */
export const PRESETS: Record<PresetId, Preset> = {
  portal: { id: "portal", kind: "fit", long: 2048, quality: 0.86, folder: "yad2-madlan" },
  whatsapp: { id: "whatsapp", kind: "fit", long: 1600, quality: 0.86, folder: "whatsapp" },
  instagram: { id: "instagram", kind: "backdrop", w: 1080, h: 1350, quality: 0.9, folder: "instagram" },
  story: { id: "story", kind: "backdrop", w: 1080, h: 1920, quality: 0.9, folder: "story", safeY: 0.13 },
  full: { id: "full", kind: "none", quality: 0.92, folder: "full-size" },
};
export const PRESET_ORDER = Object.keys(PRESETS) as PresetId[];

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
  untitled?: string; // the default project name, left out of file names
};

/** One output file: `path` inside the ZIP folder, `name` when it is saved or shared on its own. */
export type ExportFile = { path: string; name: string; blob: Blob; image: boolean; duplicate?: boolean };
export type ExportResult = { folder: string; files: ExportFile[] };

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

function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, o: Overlay, rtl: boolean, safeY = 0) {
  // Sized from the width too, so labels stay legible when a portal shows the photo phone-size
  // (a 2048 px photo shown 390 px wide: about 11 px text).
  const unit = Math.max(12, Math.round(Math.min(w, h) * 0.028), Math.round(w * 0.03));
  const inset = Math.round(h * safeY);
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
  if (top) pill(top, rtl ? w - m : m, inset + m, rtl, o.staged ? "rgba(26,58,140,0.92)" : "rgba(20,25,34,0.78)");
  if (o.broker && (o.broker.name || o.broker.license)) {
    const text = [o.broker.name, o.broker.license ? `${o.broker.licenseLabel} ${o.broker.license}` : ""].filter(Boolean).join(" · ");
    pill(text, rtl ? m : w - m, h - inset - m - unit * 2, !rtl, "rgba(20,25,34,0.72)");
  }
  ctx.restore();
}

/** Output size of a preset for a W×H photo — equal sizes mean identical files. */
function outSize(p: Preset, W: number, H: number) {
  if (p.kind === "none") return { w: W, h: H };
  if (p.kind === "fit") {
    const s = Math.min(1, p.long! / Math.max(W, H));
    return { w: Math.round(W * s), h: Math.round(H * s) };
  }
  return { w: p.w!, h: p.h! };
}

async function derive(base: ImageBitmap, p: Preset, overlay: Overlay, rtl: boolean): Promise<Blob> {
  let out: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  const W = base.width;
  const H = base.height;
  const size = outSize(p, W, H);
  if (p.kind === "none") {
    out = canvas(W, H);
    out.ctx.drawImage(base, 0, 0);
  } else if (p.kind === "fit") {
    out = drawScaled(base, size.w, size.h);
  } else {
    // The whole photo, centred, on a blurred and darkened copy of itself.
    const tw = size.w, th = size.h;
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
  drawOverlay(out.ctx, out.c.width, out.c.height, overlay, rtl, p.safeY);
  return new Promise((resolve, reject) =>
    out.c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", p.quality),
  );
}

/** The final full-resolution image of a photo: its active AI version, or the studio correction. */
export async function finalImage(photo: Photo, onProgress?: (f: number) => void, maxEdge = 8192): Promise<{ blob: Blob; changes: Change[]; version?: AiVersion }> {
  const version = photo.versions.find((v) => v.id === photo.activeVersion);
  if (version) return { blob: version.blob, changes: [], version };
  if (!photo.analysis || !photo.recipe) throw new Error("photo not analysed");
  const r = await renderPhoto(photo.original, photo.analysis, photo.recipe, {
    maxEdge,
    quality: 0.95,
    onProgress: (f) => onProgress?.(f),
  });
  return { blob: r.blob, changes: r.changes };
}

// Hebrew letters to Latin, so "הרצל 12" still tells two downloads apart ("hrtzl-12").
const HE: Record<string, string> = {
  א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "ch", ט: "t", י: "y", כ: "k", ך: "k", ל: "l", מ: "m", ם: "m",
  נ: "n", ן: "n", ס: "s", ע: "a", פ: "p", ף: "f", צ: "tz", ץ: "tz", ק: "k", ר: "r", ש: "sh", ת: "t",
};

/**
 * File and folder names are kept to plain Latin characters: some browsers save a download with a
 * Hebrew name as "download" (no extension), and Windows' built-in unzip garbles non-Latin names.
 * Hebrew is transliterated; the project's real name is written inside the change log.
 */
export function slug(s: string) {
  const ascii = s
    .replace(/[\u05d0-\u05ea]/g, (c) => HE[c] ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
  // A Hebrew name leaves little or nothing in Latin letters; a dated name beats "a" or "3".
  return ascii.replace(/[-_]/g, "").length >= 3 ? ascii : `dira-photos-${new Date().toISOString().slice(0, 10)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-02-sale-hrtzl-12": sorts by date, says rent or sale, then the property. */
export function folderName(project: Project, untitled?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const name = project.name.trim() && project.name.trim() !== untitled ? slug(project.name) : "";
  const named = name && !name.startsWith("dira-photos-") ? `-${name}` : "-dira-photos";
  return `${date}-${project.listing}${named}`.slice(0, 80);
}

export async function exportPhotos(project: Project, photos: Photo[], opts: ExportOptions, rtl: boolean): Promise<ExportResult> {
  const folder = folderName(project, opts.untitled);
  const files: ExportFile[] = [];
  const manifest: ManifestItem[] = [];
  const presets = PRESET_ORDER.filter((p) => opts.presets.includes(p));
  // One format: files sit at the top of the folder. Several: a folder per format, ready to upload.
  const sub = (p: Preset) => (presets.length > 1 ? `${p.folder}/` : "");
  const total = photos.length;
  // Rendering at full resolution is the slow part; portal or social sizes don't need it.
  const need = presets.includes("full") ? 8192 : Math.max(...presets.map((id) => PRESETS[id].long ?? Math.max(PRESETS[id].w!, PRESETS[id].h!)));
  opts.onProgress?.(0, total);
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const { blob, changes, version } = await finalImage(photo, undefined, need);
    const base = await bitmapOf(blob);
    const overlay: Overlay = {
      staged: version?.tool === "stage" ? opts.overlay.stagedLabel : undefined,
      aiEdited: version && version.tool !== "stage" && version.tool !== "upscale" ? opts.overlay.aiLabel : undefined,
      broker: opts.overlay.broker,
    };
    const names: string[] = [];
    // A small photo comes out the same size for portal, WhatsApp and full: render it once.
    const made = new Map<string, Blob>();
    for (const pid of presets) {
      const p = PRESETS[pid];
      const size = outSize(p, base.width, base.height);
      const key = p.kind === "backdrop" ? pid : `${size.w}x${size.h}`;
      const known = made.get(key);
      const out = known ?? (await derive(base, p, overlay, rtl));
      made.set(key, out);
      const path = `${sub(p)}${pad(i + 1)}.jpg`;
      files.push({ path, name: `${folder}-${presets.length > 1 ? `${p.folder}-` : ""}${pad(i + 1)}.jpg`, blob: out, image: true, duplicate: Boolean(known) });
      names.push(path);
    }
    base.close();
    if (opts.includeOriginals) {
      const ext = (photo.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg").toLowerCase();
      const path = `originals/${pad(i + 1)}-original${ext}`;
      files.push({ path, name: `${folder}-original-${pad(i + 1)}${ext}`, blob: photo.original, image: true });
      names.push(path);
    }
    manifest.push({ index: i + 1, name: photo.name, changes, version, files: names });
    opts.onProgress?.(i + 1, total);
  }
  if (opts.manifest.include) {
    const text = new Blob([opts.manifest.build(manifest)], { type: "text/plain;charset=utf-8" });
    files.push({ path: opts.manifest.filename, name: opts.manifest.filename, blob: text, image: false });
  }
  return { folder, files };
}

/** One file is handed over as itself; more than one as a ZIP with the folder layout. */
export async function packResult(r: ExportResult): Promise<{ blob: Blob; filename: string }> {
  if (r.files.length === 1) return { blob: r.files[0].blob, filename: r.files[0].name };
  const entries: ZipEntry[] = [];
  for (const f of r.files) entries.push({ name: `${r.folder}/${f.path}`, data: new Uint8Array(await f.blob.arrayBuffer()) });
  return { blob: buildZip(entries), filename: `${r.folder}.zip` };
}

/** The images to put in the phone's share sheet: each picture once, no change log. */
export function shareable(r: ExportResult): File[] {
  return r.files.filter((f) => f.image && !f.duplicate).map((f) => new File([f.blob], f.name, { type: f.blob.type || "image/jpeg" }));
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

/** True where the browser can hand image files to the system share sheet (phones, mostly). */
export function canShareFiles(): boolean {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare) return false;
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "x.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

/** Share sheet on phones (save to Photos, send on WhatsApp). "cancel" when the person closed it. */
export async function shareFiles(files: File[], title?: string): Promise<"shared" | "cancel" | "failed"> {
  if (!files.length || !navigator.canShare?.({ files })) return "failed";
  try {
    await navigator.share({ files, title });
    return "shared";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancel" : "failed";
  }
}
