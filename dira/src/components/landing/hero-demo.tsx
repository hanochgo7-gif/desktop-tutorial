"use client";

import { useState, type ReactNode } from "react";
import { CompareView } from "@/components/compare-view";
import { ZoneScale } from "@/components/zone-scale";
import type { Dict, Locale } from "@/i18n";
import demo from "@/lib/demo-data.json";
import { describeChange } from "@/lib/describe";
import type { Change } from "@/lib/engine/types";
import { asset } from "@/lib/site";

type Sample = (typeof demo)[number];

export function HeroDemo({ lang, t, intro, action }: { lang: Locale; t: Dict; intro: ReactNode; action: ReactNode }) {
  const [i, setI] = useState(0);
  const s = demo[i];
  const dir = lang === "he" ? "rtl" : "ltr";
  return (
    <>
      <div className="lg:col-start-1 lg:row-start-1 lg:self-end">{intro}</div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
      <CompareView
        before={asset(`/demo/${s.id}-before.jpg`)}
        after={asset(`/demo/${s.id}-after.jpg`)}
        labels={{ before: t.landing.demoBefore, after: t.landing.demoAfter, slider: t.landing.demoCaption }}
        alt={t.landing.sampleNames[i]}
        dir={dir}
        fit="cover"
        priority
        className="aspect-[4/3] w-full rounded-[var(--radius-photo)] bg-stage shadow-[0_2px_6px_rgb(20_25_34/0.12),0_24px_60px_-20px_rgb(20_25_34/0.45)] ring-1 ring-white/70"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-md bg-paper/85 px-2 py-1 text-[13.5px] text-ink-2 backdrop-blur-sm">{t.landing.demoCaption}</p>
        <div className="segmented max-w-full overflow-x-auto shadow-[0_1px_2px_rgb(20_25_34/0.08)] [&>button]:whitespace-nowrap" role="tablist" aria-label={t.landing.samples}>
          {demo.map((d, k) => (
            <button key={d.id} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
              {t.landing.sampleNames[k]}
            </button>
          ))}
        </div>
      </div>
      </div>
      <div className="lg:col-start-1 lg:row-start-2 lg:self-start">{action}</div>
      <div className="lg:col-span-2">
        <MeasuredPanel sample={s} lang={lang} t={t} />
      </div>
    </>
  );
}

function MeasuredPanel({ sample, lang, t }: { sample: Sample; lang: Locale; t: Dict }) {
  const changes = sample.changes as Change[];
  const summary = `${t.landing.toneTitle}: ${t.landing.toneBefore} ${Math.round(sample.medianBefore)}, ${t.landing.toneAfter} ${Math.round(sample.medianAfter)}`;
  return (
    <section aria-label={t.landing.measuredTitle} className="on-stage rounded-[var(--radius-panel)] bg-stage p-5 text-white sm:p-7">
      <h2 className="text-[15px] font-semibold text-white/90">{t.landing.measuredTitle}</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <ul className="grid gap-2 text-[14.5px] text-white/85">
          {changes.map((c, k) => (
            <li key={k} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-[#9db4ee]" />
              <span className="tnum">{describeChange(c, t, lang)}</span>
            </li>
          ))}
        </ul>
        <ZoneScale
          dark
          summary={summary}
          caption={t.landing.toneNote}
          rows={[
            { label: t.landing.toneBefore, zones: sample.zonesBefore, tone: "muted" },
            { label: t.landing.toneAfter, zones: sample.zonesAfter, tone: "accent" },
          ]}
        />
      </div>
      <p className="mt-4 text-[12.5px] text-white/50">{t.landing.measuredNote}</p>
    </section>
  );
}
