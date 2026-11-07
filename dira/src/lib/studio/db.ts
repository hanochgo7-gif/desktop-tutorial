"use client";
// On-device storage for projects and photos (IndexedDB). Originals are kept untouched; edits are
// stored as a recipe and re-rendered on demand, so nothing is ever lost or degraded by re-saving.

import type { Analysis, Change, Recipe } from "@/lib/engine/types";

export type Listing = "rent" | "sale";

export type Project = {
  id: string;
  name: string;
  listing: Listing;
  createdAt: number;
  updatedAt: number;
  photoIds: string[];
  exports: number;
  broker?: { name: string; license: string };
};

export type AiTool = "stage" | "declutter" | "refresh" | "sky" | "erase" | "upscale";

export type AiVersion = {
  id: string;
  tool: AiTool;
  model: string;
  createdAt: number;
  blob: Blob;
  width: number;
  height: number;
  params: Record<string, string>;
  /** Produced by the development mock provider; never shown as real output. */
  test?: boolean;
};

export type PhotoStatus = "new" | "analyzing" | "ready" | "error";

export type Photo = {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  original: Blob;
  width?: number;
  height?: number;
  status: PhotoStatus;
  error?: "decode" | "memory" | "unknown" | "unsupported";
  analysis?: Analysis;
  recipe?: Recipe;
  /** Small JPEG for the filmstrip. */
  thumb?: Blob;
  /** 1600 px JPEG of the original (orientation applied): shown as "before", source for previews. */
  proxy?: Blob;
  /** Last rendered preview and the recipe it was made from. */
  preview?: Blob;
  previewKey?: string;
  previewChanges?: Change[];
  versions: AiVersion[];
  /** Which version is used for export: undefined = studio correction of the original. */
  activeVersion?: string;
};

const DB_NAME = "dira-studio";
const VERSION = 1;
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) {
        const s = db.createObjectStore("photos", { keyPath: "id" });
        s.createIndex("projectId", "projectId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("database blocked"));
  });
  dbp.catch(() => (dbp = null));
  return dbp;
}

function tx<T>(store: "projects" | "photos", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const r = fn(s);
        let value: T;
        if (r) r.onsuccess = () => (value = r.result);
        t.oncomplete = () => resolve(value);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? new Error("transaction aborted"));
      }),
  );
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export async function listProjects(): Promise<Project[]> {
  const all = await tx<Project[]>("projects", "readonly", (s) => s.getAll());
  return (all ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string) {
  return tx<Project | undefined>("projects", "readonly", (s) => s.get(id));
}

export async function createProject(name: string, listing: Listing = "rent"): Promise<Project> {
  const now = Date.now();
  const p: Project = { id: uid(), name, listing, createdAt: now, updatedAt: now, photoIds: [], exports: 0 };
  await tx("projects", "readwrite", (s) => s.put(p));
  return p;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project | undefined> {
  const p = await getProject(id);
  if (!p) return undefined;
  const next = { ...p, ...patch, id, updatedAt: Date.now() };
  await tx("projects", "readwrite", (s) => s.put(next));
  return next;
}

export async function deleteProject(id: string) {
  const photos = await getPhotos(id);
  await Promise.all(photos.map((ph) => tx("photos", "readwrite", (s) => s.delete(ph.id))));
  await tx("projects", "readwrite", (s) => s.delete(id));
}

export async function getPhotos(projectId: string): Promise<Photo[]> {
  const all = await tx<Photo[]>("photos", "readonly", (s) => s.index("projectId").getAll(projectId));
  return all ?? [];
}

export function getPhoto(id: string) {
  return tx<Photo | undefined>("photos", "readonly", (s) => s.get(id));
}

export async function putPhoto(photo: Photo) {
  await tx("photos", "readwrite", (s) => s.put(photo));
}

export async function updatePhoto(id: string, patch: Partial<Photo>): Promise<Photo | undefined> {
  const p = await getPhoto(id);
  if (!p) return undefined;
  const next = { ...p, ...patch, id };
  await putPhoto(next);
  return next;
}

export async function deletePhoto(id: string) {
  await tx("photos", "readwrite", (s) => s.delete(id));
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist?.();
  } catch {
    /* not available */
  }
}

export async function storageEstimate(): Promise<{ used: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || e.usage === undefined || e.quota === undefined) return null;
    return { used: e.usage, quota: e.quota };
  } catch {
    return null;
  }
}

/** Hands files from the landing page to the studio (same tab, no storage round-trip needed). */
let handoff: File[] | null = null;
export function setHandoff(files: File[]) {
  handoff = files;
}
export function takeHandoff(): File[] | null {
  const f = handoff;
  handoff = null;
  return f;
}
