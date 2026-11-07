"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { api, useAccount } from "@/lib/client/account";
import { renderPhoto } from "@/lib/engine/client";
import type { Recipe } from "@/lib/engine/types";
import { TOOL_COST } from "@/lib/plans";
import { uid, type AiTool, type Photo } from "@/lib/studio/db";
import type { Studio } from "@/lib/studio/use-studio";

const TOOLS: AiTool[] = ["stage", "declutter", "refresh", "sky", "erase", "upscale"];
const ROOMS = ["living", "bedroom", "kitchen", "dining", "office", "kids"] as const;
const STYLES = ["modern", "scandinavian", "minimalist", "luxury", "mediterranean", "contemporary"] as const;

/** White strokes on black at the image's size, slightly dilated so edges and shadows go too. */
async function maskPng(photo: Photo, w: number, h: number): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = ctx.fillStyle = "#fff";
  ctx.lineCap = ctx.lineJoin = "round";
  const long = Math.max(w, h);
  const grow = Math.max(6, long * 0.006);
  for (const s of photo.recipe?.removals ?? []) {
    const r = s.radius * long + grow;
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    if (s.points.length === 1) {
      ctx.arc(s.points[0][0] * w, s.points[0][1] * h, r, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.stroke();
  }
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("mask"))), "image/png"));
}

export function AiPanel({ s, t, lang, photo }: { s: Studio; t: Dict; lang: Locale; photo: Photo }) {
  const { config, me, loading, refresh } = useAccount();
  const toast = useToast();
  const [tool, setTool] = useState<AiTool>("stage");
  const [room, setRoom] = useState<(typeof ROOMS)[number]>("living");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("scandinavian");
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);
  const cancelled = useRef(false);
  useEffect(() => () => void (cancelled.current = true), []);

  if (loading || !config) return <div className="skeleton h-40 rounded-[10px]" />;
  if (!config.ai) return <p className="rounded-[10px] bg-line-2 p-4 text-[14.5px] text-ink-2">{t.ai.off}</p>;

  const cost = TOOL_COST[tool];
  const strokes = photo.recipe?.removals.length ?? 0;
  const blocked = tool === "erase" && strokes === 0;

  const run = async () => {
    if (!photo.analysis || !photo.recipe) return;
    setJob({ id: "", status: "uploading" });
    try {
      // The corrected photo is the best starting point; for removal keep the original geometry so
      // the brushed mask lines up.
      const recipe: Recipe = tool === "erase" ? { ...photo.recipe, removals: [], steps: { ...photo.recipe.steps, verticals: false } } : photo.recipe;
      const active = photo.versions.find((v) => v.id === photo.activeVersion);
      const base =
        tool === "upscale" && active
          ? { blob: active.blob, width: active.width, height: active.height }
          : await renderPhoto(photo.original, photo.analysis, recipe, { maxEdge: 2048, quality: 0.93 });
      const form = new FormData();
      form.set("tool", tool);
      form.set("key", uid());
      if (tool === "stage") {
        form.set("room", room);
        form.set("style", style);
      }
      form.set("image", base.blob, "image.jpg");
      if (tool === "erase") form.set("mask", await maskPng(photo, base.width, base.height), "mask.png");
      const r = await api<{ id?: string; status?: string; error?: string }>("/api/ai/jobs", { method: "POST", body: form });
      if (!r.ok || !r.data.id) {
        toast.show({ text: r.data.error === "no_credits" ? t.ai.noCredits : t.ai.failed, tone: "error" });
        setJob(null);
        refresh();
        return;
      }
      setJob({ id: r.data.id, status: r.data.status ?? "running" });
      refresh();
      // Poll until done (the server also receives a webhook; polling picks the result up here).
      for (let i = 0; i < 120 && !cancelled.current; i++) {
        const p = await api<{ status: string; outputUrl: string | null; model: string; test: boolean }>(`/api/ai/jobs/${r.data.id}`);
        if (p.ok && p.data.status === "succeeded" && p.data.outputUrl) {
          const blob = await (await fetch(p.data.outputUrl)).blob();
          const bmp = await createImageBitmap(blob);
          const params: Record<string, string> = tool === "stage" ? { room, style } : {};
          await s.addVersion(photo.id, { id: uid(), tool, model: p.data.model, createdAt: Date.now(), blob, width: bmp.width, height: bmp.height, params, test: p.data.test });
          bmp.close();
          toast.show({ text: t.ai.done });
          break;
        }
        if (!p.ok || p.data.status === "failed" || p.data.status === "canceled") {
          toast.show({ text: t.ai.failed, tone: "error" });
          break;
        }
        await new Promise((res) => setTimeout(res, i < 10 ? 2000 : 4000));
      }
    } catch (e) {
      console.error(e);
      toast.show({ text: t.ai.failed, tone: "error" });
    } finally {
      setJob(null);
      refresh();
    }
  };

  return (
    <div className="grid gap-5">
      {config.testMode && <p className="rounded-md bg-warn-tint px-3 py-2 text-[13px] text-warn">{t.ai.test}</p>}
      <p className="text-[14px] text-ink-2">{t.ai.lead}</p>

      <div role="radiogroup" aria-label={t.ai.title} className="grid gap-1.5">
        {TOOLS.map((k) => (
          <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-colors ${tool === k ? "border-prussian bg-prussian-tint" : "border-line-2 bg-surface hover:border-line"}`}>
            <input type="radio" name="ai-tool" className="mt-1 accent-[var(--color-prussian)]" checked={tool === k} onChange={() => setTool(k)} />
            <span className="flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">{t.ai.tools[k].t}</span>
                <span className="tnum text-[12.5px] text-ink-3">{fmt(TOOL_COST[k] === 1 ? t.ai.cost : t.ai.costMany, { n: TOOL_COST[k] }, lang)}</span>
              </span>
              <span className="block text-[13px] text-ink-3">{t.ai.tools[k].d}</span>
            </span>
          </label>
        ))}
      </div>

      {tool === "stage" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ai-room">
              {t.ai.roomType}
            </label>
            <select id="ai-room" className="field" value={room} onChange={(e) => setRoom(e.target.value as typeof room)}>
              {ROOMS.map((r) => (
                <option key={r} value={r}>
                  {t.ai.rooms[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ai-style">
              {t.ai.style}
            </label>
            <select id="ai-style" className="field" value={style} onChange={(e) => setStyle(e.target.value as typeof style)}>
              {STYLES.map((x) => (
                <option key={x} value={x}>
                  {t.ai.styles[x]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {tool === "erase" && <p className="text-[13.5px] text-ink-2">{t.ai.eraseHint}</p>}

      {!me ? (
        <Link href={`/${lang}/account?next=studio`} className="btn btn-primary w-full">
          {t.ai.signIn}
        </Link>
      ) : (
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-3">{t.account.balance}</span>
            <span className="tnum font-semibold">{fmt(t.ai.credits, { n: me.credits }, lang)}</span>
          </div>
          {me.credits < cost ? (
            <Link href={`/${lang}/pricing`} className="btn btn-primary w-full">
              {t.ai.buy}
            </Link>
          ) : (
            <button type="button" className="btn btn-primary w-full" disabled={Boolean(job) || blocked} onClick={run}>
              {job ? (job.status === "uploading" ? t.ai.queued : t.ai.running) : `${t.ai.run} · ${fmt(cost === 1 ? t.ai.cost : t.ai.costMany, { n: cost }, lang)}`}
            </button>
          )}
          {job && <div className="skeleton h-1.5 rounded-full" role="progressbar" aria-label={t.ai.running} />}
        </div>
      )}

      {photo.versions.length > 0 && (
        <section>
          <h3 className="text-[13px] font-semibold text-ink-3">{t.ai.versions}</h3>
          <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label={t.ai.versions}>
            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-line-2 bg-surface p-2.5">
              <input type="radio" name="ver" className="accent-[var(--color-prussian)]" checked={!photo.activeVersion} onChange={() => s.setActiveVersion(photo.id, undefined)} />
              <span className="text-[14px]">{t.ai.versionOriginal}</span>
            </label>
            {photo.versions.map((v) => (
              <label key={v.id} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-line-2 bg-surface p-2.5">
                <input type="radio" name="ver" className="accent-[var(--color-prussian)]" checked={photo.activeVersion === v.id} onChange={() => s.setActiveVersion(photo.id, v.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url(v.blob)} alt="" className="h-10 w-14 rounded object-cover" />
                <span className="flex-1 text-[14px]">
                  {t.ai.tools[v.tool].t}
                  {v.params.style ? ` · ${t.ai.styles[v.params.style as keyof typeof t.ai.styles]}` : ""}
                  {v.test && <span className="ms-2 rounded bg-warn-tint px-1.5 py-0.5 text-[11.5px] font-semibold text-warn">TEST</span>}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
