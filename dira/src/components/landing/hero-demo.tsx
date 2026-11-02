"use client";

import { useState, type ReactNode } from "react";
import { CompareView } from "@/components/compare-view";
import { ZoneScale } from "@/components/zone-scale";
import type { Dict, Locale } from "@/i18n";
import demoData from "@/lib/demo-data.json";
import { describeChange, describeChangePlain } from "@/lib/describe";
import type { Change } from "@/lib/engine/types";
import { asset } from "@/lib/site";

type Sample = (typeof demoData)[number];
type SampleId = "bedroom" | "living" | "kitchen";

// The living room at night leads (the biggest real change: bulb light, darkness, leaning walls);
// the empty bedroom follows and shows the stains we leave in place.
const ORDER: SampleId[] = ["living", "bedroom", "kitchen"];
const demo = ORDER.map((id) => demoData.find((d) => d.id === id)!).filter(Boolean);

/**
 * The hero: on phones the order is headline → upload → demo; on desktop the demo sits beside them.
 * The proof under the photo is in plain words; the measured numbers are one tap away.
 */
export function HeroDemo({ lang, t, intro, action }: { lang: Locale; t: Dict; intro: ReactNode; action: ReactNode }) {
  const [i, setI] = useState(0);
  const s = demo[i];
  const id = s.id as SampleId;
  const dir = lang === "he" ? "rtl" : "ltr";
  return (
    <>
      <div className="lg:col-start-1 lg:row-start-1 lg:self-end">{intro}</div>
      <div id="hero-action" className="lg:col-start-1 lg:row-start-2 lg:self-start">
        {action}
      </div>
      <div id="hero-sample" className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <CompareView
          before={asset(`/demo/${s.id}-before.jpg`)}
          after={asset(`/demo/${s.id}-after.jpg`)}
          labels={{ before: t.landing.demoBefore, after: t.landing.demoAfter, slider: t.landing.demoCaption }}
          alt={t.landing.sampleNames[id]}
          dir={dir}
          fit="cover"
          hint
          className="aspect-[4/3] w-full rounded-[var(--radius-photo)] bg-stage shadow-[0_2px_6px_rgb(20_25_34/0.12),0_24px_60px_-20px_rgb(20_25_34/0.45)] ring-1 ring-white/70"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-md bg-paper/85 px-2 py-1 text-[14px] text-ink-2 backdrop-blur-sm">{t.landing.demoCaption}</p>
          <div
            className="segmented max-w-full overflow-x-auto shadow-[0_1px_2px_rgb(20_25_34/0.08)] [&>button]:min-h-[42px] [&>button]:whitespace-nowrap"
            role="tablist"
            aria-label={t.landing.samples}
            onKeyDown={(e) => {
              // Arrow keys follow reading direction; Home/End jump to the ends.
              const next = lang === "he" ? "ArrowLeft" : "ArrowRight";
              const prev = lang === "he" ? "ArrowRight" : "ArrowLeft";
              let k = i;
              if (e.key === next) k = (i + 1) % demo.length;
              else if (e.key === prev) k = (i - 1 + demo.length) % demo.length;
              else if (e.key === "Home") k = 0;
              else if (e.key === "End") k = demo.length - 1;
              else return;
              e.preventDefault();
              setI(k);
              (e.currentTarget.children[k] as HTMLElement | undefined)?.focus();
            }}
          >
            {demo.map((d, k) => (
              <button key={d.id} type="button" role="tab" aria-selected={k === i} aria-controls="hero-sample" tabIndex={k === i ? 0 : -1} onClick={() => setI(k)}>
                {t.landing.sampleNames[d.id as SampleId]}
              </button>
            ))}
          </div>
        </div>
        <Proof sample={s} id={id} lang={lang} t={t} />
      </div>
    </>
  );
}

function Proof({ sample, id, lang, t }: { sample: Sample; id: SampleId; lang: Locale; t: Dict }) {
  const changes = sample.changes as Change[];
  const plain = changes.filter((c) => c.kind !== "crop" && c.kind !== "sharpen" && c.kind !== "contrast" && c.kind !== "color").slice(0, 4);
  const summary = `${t.landing.toneTitle}: ${t.landing.toneBefore} ${Math.round(sample.medianBefore)}, ${t.landing.toneAfter} ${Math.round(sample.medianAfter)}`;
  return (
    <section aria-label={t.landing.measuredTitle} className="mt-4 rounded-[var(--radius-panel)] bg-surface/92 p-4 shadow-[0_1px_2px_rgb(20_25_34/0.06)] ring-1 ring-line-2 backdrop-blur-sm sm:p-5">
      <h2 className="text-[15px] font-semibold">{t.landing.measuredTitle}</h2>
      <ul className="mt-2 grid gap-1.5 text-[15px] text-ink-2 sm:grid-cols-2">
        {plain.map((c, k) => (
          <li key={k} className="flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-1 flex-none text-ok">
              <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {describeChangePlain(c, t, lang)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[14px] font-medium text-ink">{t.landing.sampleNotes[id]}</p>
      <details className="mt-3 border-t border-line-2 pt-3">
        <summary className="cursor-pointer text-[14px] font-semibold text-prussian">{t.landing.measuredNumbers}</summary>
        <div className="mt-3 grid gap-5 md:grid-cols-[1.1fr_1fr]">
          <ul className="prose-list grid gap-1 text-[14px] text-ink-2">
            {changes.map((c, k) => (
              <li key={k} className="tnum">
                {describeChange(c, t, lang)}
              </li>
            ))}
          </ul>
          <ZoneScale
            summary={summary}
            caption={t.landing.toneNote}
            rows={[
              { label: t.landing.toneBefore, zones: sample.zonesBefore, tone: "muted" },
              { label: t.landing.toneAfter, zones: sample.zonesAfter, tone: "accent" },
            ]}
          />
        </div>
        <p className="mt-3 text-[13px] text-ink-3">{t.landing.measuredNote}</p>
      </details>
    </section>
  );
}
