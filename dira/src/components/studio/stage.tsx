"use client";

import { useEffect, useState } from "react";
import { CompareView, type CompareMode } from "@/components/compare-view";
import { fmt, type Dict, type Locale } from "@/i18n";
import type { Stroke } from "@/lib/engine/types";
import type { Studio } from "@/lib/studio/use-studio";
import { BrushCanvas } from "./brush-canvas";

type Props = {
  s: Studio;
  t: Dict;
  lang: Locale;
  brush: { active: boolean; radius: number; onStroke: (st: Stroke) => void } | null;
  mode: CompareMode;
  setMode: (m: CompareMode) => void;
};

const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Stage({ s, t, lang, brush, mode, setMode }: Props) {
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const photo = s.selected;
  const dir = lang === "he" ? "rtl" : "ltr";
  const idx = photo ? s.photos.findIndex((p) => p.id === photo.id) : -1;

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full]);

  const go = (d: number) => {
    if (idx < 0) return;
    const next = s.photos[(idx + d + s.photos.length) % s.photos.length];
    if (next) s.setSelectedId(next.id);
  };

  // Keyboard: [ and ] or PageUp/PageDown move between photos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.getAttribute("role") === "slider") return;
      if (e.key === "]" || e.key === "PageDown") go(1);
      if (e.key === "[" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const version = photo?.versions.find((v) => v.id === photo.activeVersion);
  const before = s.url(photo?.proxy);
  const after = version ? s.url(version.blob) : photo ? s.previewOf(photo)?.url : undefined;
  const progress = photo ? s.rendering[photo.id] : undefined;
  const effectiveMode: CompareMode = brush?.active ? "before" : mode;

  const afterLabel = version ? (version.tool === "stage" ? t.ai.staged : t.ai.aiEdited) : t.studio.after;

  return (
    <div className={`on-stage relative flex min-h-0 flex-col bg-stage text-white ${full ? "fixed inset-0 z-50" : "h-full"}`}>
      <div className="relative min-h-0 flex-1">
        {photo && before && after ? (
          <CompareView
            priority
            before={before}
            after={after}
            dir={dir}
            mode={effectiveMode}
            zoomable
            zoom={zoom}
            onZoomChange={setZoom}
            labels={{ before: t.studio.before, after: afterLabel, slider: t.studio.compareHint }}
            alt={photo.name}
            className="absolute inset-0"
            overlay={
              brush?.active && photo.width && photo.height ? (
                <BrushCanvas
                  aspect={photo.width / photo.height}
                  strokes={photo.recipe?.removals ?? []}
                  radius={brush.radius}
                  onStroke={brush.onStroke}
                />
              ) : undefined
            }
            overlayActive={Boolean(brush?.active)}
          />
        ) : photo && before ? (
          // Analysed but the first preview is still rendering: show the original, dimmed.
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={before} alt={photo.name} className="absolute inset-0 h-full w-full object-contain opacity-60" />
          </div>
        ) : photo ? (
          <div className="stage-skeleton absolute inset-0" aria-hidden="true" />
        ) : null}

        {photo && (progress !== undefined || photo.status === "analyzing" || photo.status === "new") && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-white/10" role="progressbar" aria-label={t.studio.processing} aria-valuenow={Math.round((progress ?? 0.1) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[#9db4ee] transition-[width] duration-200" style={{ width: `${Math.max(6, (progress ?? 0.15) * 100)}%` }} />
          </div>
        )}
        {photo && (photo.status === "analyzing" || photo.status === "new") && (
          <p className="absolute inset-x-0 bottom-4 text-center text-[14px] text-white/80">{t.studio.analyzing}</p>
        )}
        {brush?.active && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[13px] text-white/80">{t.studio.paintHint}</p>}
      </div>

      {/* Toolbar */}
      <div className="flex min-w-0 flex-none items-center gap-1 overflow-x-auto border-t border-stage-line px-1.5 py-1.5 sm:px-3">
        <div className="segmented !bg-stage-2" role="group" aria-label={t.studio.viewSplit}>
          {(["split", "after", "before"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={effectiveMode === m}
              disabled={Boolean(brush?.active)}
              onClick={() => setMode(m)}
              className="!px-2.5 !text-[13px] !text-white/70 aria-pressed:!bg-white/15 aria-pressed:!text-white sm:!px-[0.9rem] sm:!text-[14px]"
            >
              {m === "split" ? t.studio.viewSplit : m === "after" ? t.studio.viewAfter : t.studio.viewBefore}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center">
          {/* Zoom buttons on larger screens; phones pinch or double-tap. */}
          <div className="hidden items-center sm:flex">
          <button type="button" className="icon-btn hover:bg-white/10" aria-label={t.studio.zoomOut} onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1}>
            <Icon d="M5 12h14" />
          </button>
          <button type="button" className="tnum min-w-[3.2rem] rounded-md px-1 py-2 text-[13px] text-white/75 hover:bg-white/10" aria-label={t.studio.zoomReset} onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="icon-btn hover:bg-white/10" aria-label={t.studio.zoomIn} onClick={() => setZoom((z) => Math.min(6, z * 1.5))}>
            <Icon d="M12 5v14M5 12h14" />
          </button>
          <span className="mx-1 h-6 w-px bg-stage-line" aria-hidden="true" />
          </div>
          <button type="button" className="icon-btn hover:bg-white/10" aria-label={t.studio.prev} onClick={() => go(-1)} disabled={s.photos.length < 2}>
            <Icon d={dir === "rtl" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
          </button>
          <span className="tnum hidden px-1 text-[13px] text-white/70 min-[380px]:inline">
            {idx + 1}/{s.photos.length}
          </span>
          <button type="button" className="icon-btn hover:bg-white/10" aria-label={t.studio.next} onClick={() => go(1)} disabled={s.photos.length < 2}>
            <Icon d={dir === "rtl" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
          </button>
          <button type="button" className="icon-btn hover:bg-white/10" aria-label={full ? t.studio.exitFullscreen : t.studio.fullscreen} onClick={() => setFull((f) => !f)}>
            <Icon d={full ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"} />
          </button>
        </div>
      </div>
      {full && <span className="sr-only">{fmt(t.studio.batch, { done: idx + 1, total: s.photos.length }, lang)}</span>}
    </div>
  );
}
