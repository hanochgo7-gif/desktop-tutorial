"use client";

// Before/after comparison. The divider is moved by dragging anywhere (or with the keyboard);
// when zoomed in, dragging pans and the divider is moved by its handle. Both images share one
// zoom/pan transform so details line up exactly.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type CompareMode = "split" | "before" | "after";

type Props = {
  before: string;
  after: string;
  labels: { before: string; after: string; slider: string };
  alt: string;
  dir: "rtl" | "ltr";
  /** cover: fill a fixed-aspect box (landing). contain: fit inside the box (studio). */
  fit?: "cover" | "contain";
  mode?: CompareMode;
  zoomable?: boolean;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  className?: string;
  /** Extra layer drawn above the images (e.g. the brush canvas), in the same transform. */
  overlay?: ReactNode;
  /** When true, pointer input goes to the overlay instead of moving the divider or panning. */
  overlayActive?: boolean;
  priority?: boolean;
  /** Glide the divider once when it first comes into view, to show it can be dragged. */
  hint?: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function CompareView({
  before,
  after,
  labels,
  alt,
  dir,
  fit = "contain",
  mode = "split",
  zoomable = false,
  zoom: zoomProp,
  onZoomChange,
  className = "",
  overlay,
  overlayActive = false,
  priority = false,
  hint = false,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  // Divider position, % from the left edge. "Before" sits on the reading-start side.
  const pos = useRef(50);
  const [posState, setPosState] = useState(50);
  const view = useRef({ z: 1, x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // "pending": a finger is down but hasn't shown whether it means to scroll or to drag the divider.
  const gesture = useRef<{ kind: "divider" | "pending" | "pan" | "pinch" | null; startDist?: number; startZ?: number; lastX?: number; lastY?: number }>({ kind: null });
  const raf = useRef(0);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, true>>({});
  const markLoaded = (url: string) => setLoadedUrls((m) => (m[url] ? m : { ...m, [url]: true }));
  // Images can finish loading before React attaches onLoad (cached, or server-rendered): check on mount.
  const loadedRef = (url: string) => (el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) markLoaded(url);
  };

  const apply = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = box.current;
      if (!el) return;
      el.style.setProperty("--pos", `${pos.current}%`);
      const { z, x, y } = view.current;
      el.style.setProperty("--tf", `translate(${x}px, ${y}px) scale(${z})`);
    });
  }, []);

  const setZoom = useCallback(
    (z: number, cx?: number, cy?: number) => {
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nz = clamp(z, 1, 6);
      const v = view.current;
      // Zoom around a point (cursor or centre) so it stays under the finger.
      const px = (cx ?? r.left + r.width / 2) - r.left - r.width / 2;
      const py = (cy ?? r.top + r.height / 2) - r.top - r.height / 2;
      const k = nz / v.z;
      let x = px - (px - v.x) * k;
      let y = py - (py - v.y) * k;
      const maxX = ((nz - 1) * r.width) / 2;
      const maxY = ((nz - 1) * r.height) / 2;
      x = clamp(x, -maxX, maxX);
      y = clamp(y, -maxY, maxY);
      view.current = nz === 1 ? { z: 1, x: 0, y: 0 } : { z: nz, x, y };
      apply();
      onZoomChange?.(view.current.z);
      setZoomLevel(view.current.z);
    },
    [apply, onZoomChange],
  );

  useEffect(() => {
    if (zoomProp !== undefined && Math.abs(zoomProp - view.current.z) > 0.001) setZoom(zoomProp);
  }, [zoomProp, setZoom]);

  // Reset zoom when the photo changes.
  useEffect(() => {
    view.current = { z: 1, x: 0, y: 0 };
    apply();
  }, [before, after, apply]);

  useEffect(() => {
    apply();
    return () => cancelAnimationFrame(raf.current);
  }, [apply]);

  // One gentle glide (50 → 36 → 50%) the first time the slider is seen; skipped for reduced motion
  // and as soon as the visitor touches it.
  const touched = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!hint || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || touched.current) return;
        io.disconnect();
        const t0 = performance.now() + 500;
        const step = (now: number) => {
          if (touched.current) return;
          const k = Math.min(1, Math.max(0, (now - t0) / 1400));
          const ease = Math.sin(k * Math.PI) * (1 - k * 0.15);
          pos.current = 50 - 14 * ease;
          apply();
          if (k < 1) frame = requestAnimationFrame(step);
          else pos.current = 50;
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [hint, apply]);

  const posFromClient = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * 100, 0, 100);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    touched.current = true;
    if (overlayActive) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const onHandle = (e.target as HTMLElement).closest("[data-handle]");
    if (pointers.current.size === 2 && zoomable) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", startDist: Math.hypot(a.x - b.x, a.y - b.y), startZ: view.current.z };
      return;
    }
    if (view.current.z > 1 && !onHandle) {
      gesture.current = { kind: "pan", lastX: e.clientX, lastY: e.clientY };
      return;
    }
    if (mode !== "split") return;
    // Touch: wait to see the direction — a vertical swipe is the page scrolling, not a drag.
    if (e.pointerType === "touch") {
      gesture.current = { kind: "pending", lastX: e.clientX, lastY: e.clientY };
      return;
    }
    gesture.current = { kind: "divider" };
    // Grabbing the handle never jumps the line; a click elsewhere moves it there.
    if (!onHandle) {
      pos.current = posFromClient(e.clientX);
      apply();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === "pending") {
      const dx = e.clientX - (g.lastX ?? e.clientX);
      const dy = e.clientY - (g.lastY ?? e.clientY);
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) gesture.current = { kind: "divider" };
      else if (Math.abs(dy) > 8) gesture.current = { kind: null };
      return;
    }
    if (g.kind === "divider") {
      pos.current = posFromClient(e.clientX);
      apply();
    } else if (g.kind === "pan") {
      const r = box.current!.getBoundingClientRect();
      const v = view.current;
      const maxX = ((v.z - 1) * r.width) / 2;
      const maxY = ((v.z - 1) * r.height) / 2;
      v.x = clamp(v.x + (e.clientX - (g.lastX ?? e.clientX)), -maxX, maxX);
      v.y = clamp(v.y + (e.clientY - (g.lastY ?? e.clientY)), -maxY, maxY);
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      apply();
    } else if (g.kind === "pinch" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom((g.startZ ?? 1) * (d / (g.startDist || d)), (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    // A tap (no swipe) moves the divider to where the finger touched.
    if (gesture.current.kind === "pending" && e.type === "pointerup") {
      pos.current = posFromClient(e.clientX);
      gesture.current = { kind: "divider" };
      apply();
    }
    if (gesture.current.kind === "divider") setPosState(Math.round(pos.current));
    if (pointers.current.size === 0) gesture.current = { kind: null };
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!zoomable) return;
    e.preventDefault();
    setZoom(view.current.z * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
  };

  // Wheel listeners must be non-passive to prevent page scroll while zooming.
  useEffect(() => {
    const el = box.current;
    if (!el || !zoomable) return;
    const stop = (ev: WheelEvent) => ev.preventDefault();
    el.addEventListener("wheel", stop, { passive: false });
    return () => el.removeEventListener("wheel", stop);
  }, [zoomable]);

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!zoomable || overlayActive) return;
    setZoom(view.current.z > 1 ? 1 : 2.5, e.clientX, e.clientY);
  };

  const onKey = (e: React.KeyboardEvent) => {
    // Keyboard use ends the intro glide and starts from where the slider officially is.
    if (!touched.current) {
      touched.current = true;
      pos.current = posState;
    }
    const step = e.shiftKey ? 10 : 2;
    let p = pos.current;
    if (e.key === "ArrowLeft") p -= step;
    else if (e.key === "ArrowRight") p += step;
    else if (e.key === "Home") p = 0;
    else if (e.key === "End") p = 100;
    else return;
    e.preventDefault();
    pos.current = clamp(p, 0, 100);
    setPosState(Math.round(pos.current));
    apply();
  };

  const rtl = dir === "rtl";
  // Clip the "before" layer to its side of the divider.
  const beforeClip =
    mode === "before" ? "none" : mode === "after" ? "inset(0 0 0 100%)" : rtl ? "inset(0 0 0 var(--pos))" : "inset(0 calc(100% - var(--pos)) 0 0)";
  const imgClass = `absolute inset-0 h-full w-full select-none ${fit === "cover" ? "object-cover" : "object-contain"}`;
  const ready = Boolean(loadedUrls[before] && loadedUrls[after]);
  const zoomed = zoomLevel > 1;

  return (
    <div
      ref={box}
      className={`overflow-hidden select-none ${className.includes("absolute") ? "" : "relative"} ${className}`}
      // Vertical swipes scroll the page; sideways drags move the divider. Zoomed in or painting,
      // every gesture belongs to the photo.
      style={{ ["--pos" as string]: "50%", ["--tf" as string]: "none", touchAction: zoomed || overlayActive ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      data-zoomed={zoomed || undefined}
    >
      {!ready && <div className="stage-skeleton absolute inset-0" aria-hidden="true" />}
      <div className="absolute inset-0 origin-center will-change-transform" style={{ transform: "var(--tf)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={after}
          alt={alt}
          draggable={false}
          className={imgClass}
          ref={loadedRef(after)}
          onLoad={() => markLoaded(after)}
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
      <div className="absolute inset-0" style={{ clipPath: beforeClip }} aria-hidden="true">
        <div className="absolute inset-0 origin-center will-change-transform" style={{ transform: "var(--tf)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt=""
            draggable={false}
            className={imgClass}
            ref={loadedRef(before)}
            onLoad={() => markLoaded(before)}
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
        </div>
      </div>
      {overlay && (
        <div className="absolute inset-0 origin-center" style={{ transform: "var(--tf)", pointerEvents: overlayActive ? "auto" : "none" }}>
          {overlay}
        </div>
      )}

      {mode === "split" && (
        <div className="pointer-events-none absolute inset-y-0" style={{ left: "var(--pos)" }}>
          {/* Physical left: in RTL an unanchored child would sit on the other side of the line. */}
          <div className="absolute inset-y-0 left-0 -ml-px w-[2px] bg-white/95 shadow-[0_0_0_1px_rgb(0_0_0/0.18)]" />
          <div
            data-handle
            role="slider"
            tabIndex={0}
            aria-label={labels.slider}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={posState}
            aria-valuetext={`${posState}%`}
            onKeyDown={onKey}
            className="pointer-events-auto absolute left-0 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white text-ink shadow-[0_2px_10px_rgb(0_0_0/0.35)]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 5 2 10l5 5M13 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {mode !== "after" && (
        <span className={`pointer-events-none absolute top-3 rounded-md bg-ink/75 px-2.5 py-1 text-[13px] font-semibold text-white ${rtl ? "right-3" : "left-3"}`}>
          {labels.before}
        </span>
      )}
      {mode !== "before" && (
        <span className={`pointer-events-none absolute top-3 rounded-md bg-prussian px-2.5 py-1 text-[13px] font-semibold text-white ${rtl ? "left-3" : "right-3"}`}>
          {labels.after}
        </span>
      )}
    </div>
  );
}
