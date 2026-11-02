"use client";

import { useId } from "react";
import { useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { describeChange, describeChangePlain, describeFinding } from "@/lib/describe";
import { findings } from "@/lib/engine/analyze";
import { autoRecipe } from "@/lib/engine/pipeline";
import type { Adjustments, Recipe } from "@/lib/engine/types";
import type { Photo } from "@/lib/studio/db";
import type { Studio } from "@/lib/studio/use-studio";

type PanelProps = { s: Studio; t: Dict; lang: Locale; photo: Photo };

export function Switch({ checked, onChange, label, disabled, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div>
        <span className="text-[15px]">{label}</span>
        {hint && <p className="mt-0.5 text-[13px] text-ink-3">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch mt-0.5" onClick={() => onChange(!checked)} />
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  // Hebrew labels have no \w characters, so the id can't be derived from the label.
  const id = useId();
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[15px]">
          {label}
        </label>
        <span className="tnum text-[13px] text-ink-3" dir="ltr">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)}
      />
    </div>
  );
}

function ApplyAll({ s, t, lang, recipe }: { s: Studio; t: Dict; lang: Locale; recipe: Recipe }) {
  const toast = useToast();
  if (s.photos.length < 2) return null;
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm w-full"
      onClick={async () => {
        const n = await s.applyRecipeToAll(recipe);
        toast.show({ text: fmt(t.studio.appliedAll, { n }, lang) });
      }}
    >
      {t.studio.applyAll}
    </button>
  );
}

export function FixPanel({ s, t, lang, photo, onSave }: PanelProps & { onSave: () => void }) {
  const a = photo.analysis!;
  const r = photo.recipe!;
  const list = findings(a);
  const set = (patch: Partial<Recipe>) => s.setRecipe(photo.id, { ...r, ...patch });
  const steps = r.steps;
  const preview = s.previewOf(photo);
  const described = list.map((f) => ({ id: f.id, ...describeFinding(f, t, lang) }));
  const changes = preview?.changes ?? [];
  const lowres = list.some((f) => f.id === "lowres");
  return (
    <div className="grid gap-6">
      <section className="rounded-[12px] bg-ok-tint p-4">
        <p className="text-[16px] font-semibold text-ok">{t.studio.readyTitle}</p>
        <p className="mt-1 text-[14.5px] text-ink-2">{t.studio.readyLead}</p>
        <button type="button" className="btn btn-primary btn-sm mt-3" onClick={onSave}>
          {t.studio.saveNow}
        </button>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold text-ink-2">{t.studio.found}</h3>
        {described.length === 0 ? (
          <p className="mt-2 text-[15px] text-ink-2">{t.studio.nothingFound}</p>
        ) : (
          <ul className="mt-2 grid gap-2.5">
            {described.map((d) => (
              <li key={d.id} className="border-s-2 border-prussian ps-3">
                <p className="text-[15px] font-semibold">{d.title}</p>
                <p className="text-[14px] text-ink-2">{d.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChangeLog t={t} lang={lang} changes={changes} />

      {lowres && (
        <Switch label={t.studio.upscale} hint={t.studio.upscaleHint} checked={r.upscale === 2} onChange={(v) => set({ upscale: v ? 2 : 1 })} />
      )}

      {(changes.length > 0 || described.some((d) => d.numbers)) && (
        <details className="group rounded-[10px] border border-line-2 px-3 py-2">
          <summary className="cursor-pointer text-[14px] font-semibold text-ink-2">{t.done.numbers}</summary>
          <ul className="prose-list mt-2 grid gap-1 text-[13.5px] text-ink-2">
            {described.filter((d) => d.numbers).map((d) => (
              <li key={d.id} className="tnum">
                {d.title}: {d.numbers}
              </li>
            ))}
            {changes.map((c, i) => (
              <li key={i} className="tnum">
                {describeChange(c, t, lang)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="rounded-[10px] border border-line-2 px-3 py-2">
        <summary className="cursor-pointer text-[14px] font-semibold text-ink-2">{t.studio.advanced}</summary>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[15px]">{t.studio.profile}</span>
          <div className="segmented" role="group" aria-label={t.studio.profile}>
            {(["interior", "exterior"] as const).map((p) => (
              <button key={p} type="button" aria-pressed={r.profile === p} onClick={() => set({ profile: p })}>
                {p === "interior" ? t.studio.interior : t.studio.exterior}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Slider
            label={t.studio.strength}
            value={Math.round(r.strength * 100)}
            min={0}
            max={150}
            step={5}
            onChange={(v) => set({ strength: v / 100 })}
            format={(v) => `${v}%`}
          />
          <p className="text-[12.5px] text-ink-3">{t.studio.strengthHint}</p>
        </div>
        <div className="mt-3 divide-y divide-line-2">
          {(Object.keys(steps) as (keyof Recipe["steps"])[]).map((k) => {
            const unavailable = k === "verticals" && !a.verticals?.confident;
            return (
              <Switch
                key={k}
                label={t.studio.steps[k]}
                checked={steps[k] && !unavailable}
                disabled={unavailable || (k === "whiteBalance" && !a.neutralMean)}
                hint={unavailable ? t.studio.verticalsUnavailable : undefined}
                onChange={(v) => set({ steps: { ...steps, [k]: v } })}
              />
            );
          })}
          {!lowres && <Switch label={t.studio.upscale} hint={t.studio.upscaleHint} checked={r.upscale === 2} onChange={(v) => set({ upscale: v ? 2 : 1 })} />}
        </div>
      </details>

      <div className="grid gap-2">
        <button type="button" className="btn btn-quiet btn-sm w-full" onClick={() => s.setRecipe(photo.id, { ...autoRecipe(a), removals: r.removals })}>
          {t.studio.reset}
        </button>
        <ApplyAll s={s} t={t} lang={lang} recipe={r} />
      </div>
    </div>
  );
}

export function ChangeLog({ t, lang, changes }: { t: Dict; lang: Locale; changes: Parameters<typeof describeChange>[0][] }) {
  return (
    <section>
      <h3 className="text-[14px] font-semibold text-ink-2">{t.studio.changesTitle}</h3>
      {changes.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-3">{t.studio.changesEmpty}</p>
      ) : (
        <ul className="prose-list mt-2 grid gap-1 text-[14.5px] text-ink-2">
          {changes.map((c, i) => (
            <li key={i}>{describeChangePlain(c, t, lang)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdjustPanel({ s, t, lang, photo }: PanelProps) {
  const r = photo.recipe!;
  const setAdj = (k: keyof Adjustments, v: number) => s.setRecipe(photo.id, { ...r, adjust: { ...r.adjust, [k]: v } });
  const keys: (keyof Adjustments)[] = ["brightness", "shadows", "contrast", "warmth", "saturation"];
  return (
    <div className="grid gap-5">
      <div>
        {keys.map((k) => (
          <Slider
            key={k}
            label={t.studio.adjust[k]}
            value={Math.round(r.adjust[k] * 100)}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => setAdj(k, v / 100)}
            format={(v) => (v > 0 ? `+${v}` : `${v}`)}
          />
        ))}
      </div>
      <div className="grid gap-2">
        <button type="button" className="btn btn-quiet btn-sm w-full" onClick={() => s.setRecipe(photo.id, { ...r, adjust: { brightness: 0, warmth: 0, contrast: 0, saturation: 0, shadows: 0 } })}>
          {t.studio.reset}
        </button>
        <ApplyAll s={s} t={t} lang={lang} recipe={r} />
      </div>
    </div>
  );
}

export function RemovePanel({
  s,
  t,
  lang,
  photo,
  radius,
  setRadius,
  view,
  setView,
}: PanelProps & { radius: number; setRadius: (r: number) => void; view: "paint" | "result"; setView: (v: "paint" | "result") => void }) {
  const r = photo.recipe!;
  const strokes = r.removals;
  const applied = s.previewOf(photo)?.changes.find((c) => c.kind === "removal")?.count ?? 0;
  const working = s.rendering[photo.id] !== undefined || (strokes.length > 0 && applied !== strokes.length);
  // Rough area check: brushed length × width relative to the photo.
  const area = strokes.reduce((acc, st) => {
    let len = 0;
    for (let i = 1; i < st.points.length; i++) len += Math.hypot(st.points[i][0] - st.points[i - 1][0], st.points[i][1] - st.points[i - 1][1]);
    return acc + (len + st.radius * 2) * st.radius * 2;
  }, 0);
  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-[16px] font-semibold">{t.studio.removeTitle}</h3>
        <p className="mt-1 text-[14px] text-ink-2">{t.studio.removeLead}</p>
        <p className="mt-2 rounded-md bg-warn-tint px-3 py-2 text-[13.5px] text-warn">{t.studio.removeWarn}</p>
      </div>
      <div className="segmented w-full [&>button]:flex-1" role="group" aria-label={t.studio.removeTitle}>
        <button type="button" aria-pressed={view === "paint"} onClick={() => setView("paint")}>
          {t.studio.removeView.paint}
        </button>
        <button type="button" aria-pressed={view === "result"} onClick={() => setView("result")} disabled={!strokes.length}>
          {t.studio.removeView.result}
        </button>
      </div>
      {strokes.length > 0 && (
        <p role="status" className={`text-[14px] ${working ? "text-ink-2" : "font-medium text-ok"}`}>
          {working ? t.studio.removing : view === "result" ? t.studio.removed : fmt(t.studio.strokes, { n: strokes.length }, lang)}
        </p>
      )}
      {view === "paint" && (
        <Slider label={t.studio.brush} value={Math.round(radius * 1000)} min={4} max={60} step={1} onChange={(v) => setRadius(v / 1000)} format={(v) => `${v}`} />
      )}
      {area > 0.06 && <p className="text-[13.5px] text-warn">{t.studio.removeLarge}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-quiet btn-sm" disabled={!strokes.length} onClick={() => s.setRecipe(photo.id, { ...r, removals: strokes.slice(0, -1) })}>
          {t.studio.undoStroke}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={!strokes.length} onClick={() => s.setRecipe(photo.id, { ...r, removals: [] })}>
          {t.studio.clearStrokes}
        </button>
      </div>
    </div>
  );
}
