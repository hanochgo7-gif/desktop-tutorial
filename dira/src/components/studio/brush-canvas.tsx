"use client";

// Brush layer for marking objects to remove. Draws over the original photo; strokes are stored in
// coordinates relative to the photo (0..1), so they apply at any resolution.

import { useEffect, useRef } from "react";
import type { Stroke } from "@/lib/engine/types";

type Props = {
  aspect: number; // photo width / height
  strokes: Stroke[];
  radius: number; // fraction of the photo's long edge
  onStroke: (s: Stroke) => void;
};

export function BrushCanvas({ aspect, strokes, radius, onStroke }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);

  // Lay the canvas exactly over the letterboxed photo (object-fit: contain).
  const layout = () => {
    const el = wrap.current;
    const c = cv.current;
    if (!el || !c) return null;
    const W = el.clientWidth;
    const H = el.clientHeight;
    let w = W;
    let h = W / aspect;
    if (h > H) {
      h = H;
      w = H * aspect;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    c.style.left = `${(W - w) / 2}px`;
    c.style.top = `${(H - h) / 2}px`;
    if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr);
    if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
    return { w: c.width, h: c.height };
  };

  const draw = () => {
    const size = layout();
    const c = cv.current;
    if (!size || !c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, size.w, size.h);
    const long = Math.max(size.w, size.h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 64, 64, 0.55)";
    ctx.fillStyle = "rgba(255, 64, 64, 0.55)";
    const all = current.current ? [...strokes, current.current] : strokes;
    for (const s of all) {
      const r = s.radius * long;
      ctx.lineWidth = r * 2;
      if (s.points.length === 1) {
        ctx.beginPath();
        ctx.arc(s.points[0][0] * size.w, s.points[0][1] * size.h, r, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * size.w, y * size.h) : ctx.moveTo(x * size.w, y * size.h)));
      ctx.stroke();
    }
  };

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, aspect]);

  const point = (e: React.PointerEvent): [number, number] => {
    const r = cv.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  return (
    <div ref={wrap} className="absolute inset-0">
      <canvas
        ref={cv}
        className="absolute cursor-crosshair touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          current.current = { points: [point(e)], radius };
          draw();
        }}
        onPointerMove={(e) => {
          if (!current.current) return;
          const p = point(e);
          const last = current.current.points[current.current.points.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.003) return;
          current.current.points.push(p);
          draw();
        }}
        onPointerUp={() => {
          if (current.current) onStroke(current.current);
          current.current = null;
        }}
        onPointerCancel={() => {
          current.current = null;
          draw();
        }}
      />
    </div>
  );
}
