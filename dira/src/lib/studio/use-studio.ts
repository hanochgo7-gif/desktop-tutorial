"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EngineError, analyzePhoto, renderPhoto } from "@/lib/engine/client";
import { autoRecipe } from "@/lib/engine/pipeline";
import type { Change, Recipe } from "@/lib/engine/types";
import { MAX_PHOTOS } from "@/lib/site";
import {
  createProject,
  deletePhoto,
  getPhotos,
  getProject,
  listProjects,
  putPhoto,
  requestPersistence,
  uid,
  updatePhoto,
  updateProject,
  type AiVersion,
  type Listing,
  type Photo,
  type Project,
} from "./db";

export type Preview = { url: string; key: string; changes: Change[] };

const keyOf = (r: Recipe) => JSON.stringify(r);

/** Object URLs for blobs, created once per blob and revoked when no longer used. */
function useBlobUrls() {
  const map = useRef(new Map<Blob, string>());
  const get = useCallback((b?: Blob) => {
    if (!b) return undefined;
    let u = map.current.get(b);
    if (!u) {
      u = URL.createObjectURL(b);
      map.current.set(b, u);
    }
    return u;
  }, []);
  const drop = useCallback((b?: Blob) => {
    if (!b) return;
    const u = map.current.get(b);
    if (u) URL.revokeObjectURL(u);
    map.current.delete(b);
  }, []);
  useEffect(() => {
    const m = map.current;
    return () => {
      for (const u of m.values()) URL.revokeObjectURL(u);
      m.clear();
    };
  }, []);
  return { get, drop };
}

export function useStudio(opts: { projectId?: string | null; newProjectName: string; initialFiles?: File[] | null; fresh?: boolean }) {
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [rendering, setRendering] = useState<Record<string, number>>({}); // photoId -> progress 0..1
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const urls = useBlobUrls();
  const tokens = useRef(new Map<string, number>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const patchLocal = useCallback((id: string, patch: Partial<Photo>) => {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const persist = useCallback(async (id: string, patch: Partial<Photo>) => {
    patchLocal(id, patch);
    setSaving(true);
    try {
      await updatePhoto(id, patch);
    } finally {
      setSaving(false);
    }
  }, [patchLocal]);

  // ---- analysis queue ---------------------------------------------------------------------
  const analyzeOne = useCallback(
    async (photo: Photo) => {
      patchLocal(photo.id, { status: "analyzing", error: undefined });
      try {
        const r = await analyzePhoto(photo.original);
        const recipe = photo.recipe ?? autoRecipe(r.analysis);
        await persist(photo.id, {
          status: "ready",
          analysis: r.analysis,
          recipe,
          width: r.width,
          height: r.height,
          proxy: r.proxy,
          thumb: r.thumb,
          error: undefined,
        });
      } catch (e) {
        const code = e instanceof EngineError ? e.code : "unknown";
        await persist(photo.id, { status: "error", error: code });
      }
    },
    [patchLocal, persist],
  );

  const enqueueAnalysis = useCallback(
    (list: Photo[]) => {
      for (const p of list) queue.current = queue.current.then(() => analyzeOne(p));
    },
    [analyzeOne],
  );

  // ---- loading --------------------------------------------------------------------------
  const addFilesTo = useCallback(
    async (proj: Project, files: File[], existing: number): Promise<Photo[]> => {
      const room = Math.max(0, MAX_PHOTOS - existing);
      const take = files.slice(0, room);
      const created: Photo[] = take.map((f) => ({
        id: uid(),
        projectId: proj.id,
        name: f.name,
        type: f.type,
        size: f.size,
        createdAt: Date.now(),
        original: f,
        status: "new",
        versions: [],
      }));
      for (const p of created) await putPhoto(p);
      const next = await updateProject(proj.id, { photoIds: [...proj.photoIds, ...created.map((p) => p.id)] });
      if (next) setProject(next);
      return created;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      requestPersistence();
      let proj: Project | undefined;
      if (opts.projectId) proj = await getProject(opts.projectId);
      if (!proj) {
        // "Start" opens a clean property; an empty one left over from last time is reused, not duplicated.
        const latest = (await listProjects())[0];
        const fresh = opts.fresh || !!opts.initialFiles?.length;
        if (latest && (!fresh || latest.photoIds.length === 0)) proj = latest;
      }
      if (!proj) proj = await createProject(opts.newProjectName);
      if (cancelled) return;
      const stored = await getPhotos(proj.id);
      const order = new Map(proj.photoIds.map((id, i) => [id, i]));
      stored.sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
      setProject(proj);
      setPhotos(stored);
      let added: Photo[] = [];
      if (opts.initialFiles?.length) {
        added = await addFilesTo(proj, opts.initialFiles, stored.length);
        if (cancelled) return;
        setPhotos((l) => [...l, ...added]);
      }
      setSelectedId((stored[0] ?? added[0])?.id ?? null);
      setLoaded(true);
      // Resume anything that was interrupted (tab closed mid-analysis).
      enqueueAnalysis([...stored.filter((p) => p.status !== "ready" && p.status !== "error"), ...added]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Files dropped before the project has loaded wait here and are added as soon as it's ready.
  const pendingFiles = useRef<File[]>([]);
  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return 0;
      if (!project) {
        pendingFiles.current.push(...files);
        return files.length;
      }
      const created = await addFilesTo(project, files, photosRef.current.length);
      setPhotos((l) => [...l, ...created]);
      if (!selectedId && created[0]) setSelectedId(created[0].id);
      enqueueAnalysis(created);
      return created.length;
    },
    [project, addFilesTo, enqueueAnalysis, selectedId],
  );

  useEffect(() => {
    if (!project || !loaded || pendingFiles.current.length === 0) return;
    const files = pendingFiles.current;
    pendingFiles.current = [];
    addFiles(files);
  }, [project, loaded, addFiles]);

  const retry = useCallback((id: string) => {
    const p = photosRef.current.find((x) => x.id === id);
    if (p) enqueueAnalysis([p]);
  }, [enqueueAnalysis]);

  const removePhoto = useCallback(
    async (id: string) => {
      if (!project) return null;
      const photo = photosRef.current.find((p) => p.id === id);
      if (!photo) return null;
      const idx = photosRef.current.findIndex((p) => p.id === id);
      const remaining = photosRef.current.filter((p) => p.id !== id);
      setPhotos(remaining);
      if (selectedId === id) setSelectedId(remaining[Math.min(idx, remaining.length - 1)]?.id ?? null);
      await deletePhoto(id);
      const next = await updateProject(project.id, { photoIds: project.photoIds.filter((x) => x !== id) });
      if (next) setProject(next);
      return { photo, index: idx };
    },
    [project, selectedId],
  );

  const restorePhoto = useCallback(
    async (photo: Photo, index: number) => {
      if (!project) return;
      await putPhoto(photo);
      const ids = project.photoIds.filter((x) => x !== photo.id);
      ids.splice(index, 0, photo.id);
      const next = await updateProject(project.id, { photoIds: ids });
      if (next) setProject(next);
      setPhotos((l) => {
        const copy = l.filter((p) => p.id !== photo.id);
        copy.splice(index, 0, photo);
        return copy;
      });
      setSelectedId(photo.id);
    },
    [project],
  );

  /** Reorders photos; the first one is the listing's cover and is exported first. */
  const movePhoto = useCallback(
    async (id: string, to: number) => {
      if (!project) return;
      const list = [...photosRef.current];
      const from = list.findIndex((p) => p.id === id);
      if (from < 0 || from === to) return;
      const [p] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(to, list.length)), 0, p);
      setPhotos(list);
      const next = await updateProject(project.id, { photoIds: list.map((x) => x.id) });
      if (next) setProject(next);
    },
    [project],
  );

  // ---- recipes and previews ---------------------------------------------------------------
  const setRecipe = useCallback(
    (id: string, recipe: Recipe) => {
      persist(id, { recipe });
    },
    [persist],
  );

  const applyRecipeToAll = useCallback(
    async (from: Recipe) => {
      // Shared look: strength, steps the user turned off, adjustments. Per-photo geometry
      // (vertical correction availability, removals) stays with each photo.
      let n = 0;
      for (const p of photosRef.current) {
        if (!p.recipe || !p.analysis) continue;
        const next: Recipe = {
          ...p.recipe,
          strength: from.strength,
          adjust: { ...from.adjust },
          steps: { ...from.steps, verticals: from.steps.verticals && Boolean(p.analysis.verticals?.confident) },
        };
        await persist(p.id, { recipe: next });
        n++;
      }
      return n;
    },
    [persist],
  );

  const renderPreview = useCallback(
    async (photo: Photo, draft: boolean) => {
      if (!photo.analysis || !photo.recipe || !photo.proxy) return;
      const key = keyOf(photo.recipe);
      const token = (tokens.current.get(photo.id) ?? 0) + 1;
      tokens.current.set(photo.id, token);
      setRendering((r) => ({ ...r, [photo.id]: 0.01 }));
      try {
        const res = await renderPhoto(photo.proxy, photo.analysis, photo.recipe, {
          maxEdge: draft ? 900 : 1600,
          quality: draft ? 0.8 : 0.9,
          onProgress: (f) => {
            if (tokens.current.get(photo.id) === token) setRendering((r) => ({ ...r, [photo.id]: f }));
          },
        });
        if (tokens.current.get(photo.id) !== token) return; // a newer render superseded this one
        setPreviews((prev) => {
          const old = prev[photo.id];
          if (old) URL.revokeObjectURL(old.url);
          return { ...prev, [photo.id]: { url: URL.createObjectURL(res.blob), key: draft ? `${key}:draft` : key, changes: res.changes } };
        });
        if (!draft) {
          patchLocal(photo.id, { preview: res.blob, previewKey: key, previewChanges: res.changes });
          updatePhoto(photo.id, { preview: res.blob, previewKey: key, previewChanges: res.changes });
        }
      } catch {
        /* surfaced through the photo's status when it matters; a failed preview keeps the last one */
      } finally {
        if (tokens.current.get(photo.id) === token) {
          setRendering((r) => {
            const rest = { ...r };
            delete rest[photo.id];
            return rest;
          });
        }
      }
    },
    [patchLocal],
  );

  const selected = useMemo(() => photos.find((p) => p.id === selectedId) ?? null, [photos, selectedId]);

  // Keep the selected photo's preview in sync with its recipe: a quick draft right away,
  // the full preview once the sliders settle.
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const p = selected;
    if (!p || p.status !== "ready" || !p.recipe) return;
    const key = keyOf(p.recipe);
    const current = previews[p.id];
    if (current?.key === key) return;
    // A preview saved on the device for exactly this recipe is shown as is (see previewOf).
    if (!current && p.preview && p.previewKey === key) return;
    // A quick low-resolution draft right away, the full preview once the sliders settle.
    const draft = current ? setTimeout(() => renderPreview(p, true), 0) : null;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => renderPreview(p, false), current ? 450 : 0);
    return () => {
      if (draft) clearTimeout(draft);
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.status, selected?.recipe]);

  useEffect(
    () => () => {
      setPreviews((prev) => {
        for (const p of Object.values(prev)) URL.revokeObjectURL(p.url);
        return {};
      });
    },
    [],
  );

  // ---- project -------------------------------------------------------------------------
  const renameProject = useCallback(
    async (name: string) => {
      if (!project) return;
      const next = await updateProject(project.id, { name: name.trim() || project.name });
      if (next) setProject(next);
    },
    [project],
  );

  const setListing = useCallback(
    async (listing: Listing) => {
      if (!project) return;
      const next = await updateProject(project.id, { listing });
      if (next) setProject(next);
    },
    [project],
  );

  const saveProject = useCallback(
    async (patch: Partial<Project>) => {
      if (!project) return;
      const next = await updateProject(project.id, patch);
      if (next) setProject(next);
    },
    [project],
  );

  const addVersion = useCallback(
    async (photoId: string, v: AiVersion) => {
      const p = photosRef.current.find((x) => x.id === photoId);
      if (!p) return;
      await persist(photoId, { versions: [...p.versions, v], activeVersion: v.id });
    },
    [persist],
  );

  const setActiveVersion = useCallback((photoId: string, versionId: string | undefined) => persist(photoId, { activeVersion: versionId }), [persist]);

  /** The preview to show for a photo: a fresh render, or the one saved for its current recipe. */
  const previewOf = useCallback(
    (p: Photo): { url: string; changes: Change[] } | undefined => {
      const fresh = previews[p.id];
      if (fresh) return fresh;
      if (p.preview && p.recipe && p.previewKey === keyOf(p.recipe)) return { url: urls.get(p.preview)!, changes: p.previewChanges ?? [] };
      return undefined;
    },
    [previews, urls],
  );

  const counts = useMemo(() => {
    const ready = photos.filter((p) => p.status === "ready").length;
    return { ready, total: photos.length, busy: photos.some((p) => p.status === "new" || p.status === "analyzing") };
  }, [photos]);

  return {
    loaded,
    saving,
    project,
    photos,
    selected,
    selectedId,
    setSelectedId,
    previews,
    previewOf,
    rendering,
    counts,
    url: urls.get,
    addFiles,
    retry,
    removePhoto,
    restorePhoto,
    movePhoto,
    setRecipe,
    applyRecipeToAll,
    renameProject,
    setListing,
    saveProject,
    addVersion,
    setActiveVersion,
  };
}

export type Studio = ReturnType<typeof useStudio>;
