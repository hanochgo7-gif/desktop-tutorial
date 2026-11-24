import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";
import { AI_LIVE } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/trust">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return pageMeta(lang, "trust", t.trust.title, t.trust.lead);
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "label" | "no" }) {
  const mark =
    tone === "ok" ? (
      <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : tone === "label" ? (
      <path d="M3 5.5h10M3 10.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    );
  const color = tone === "ok" ? "text-ok" : tone === "label" ? "text-prussian" : "text-err";
  return (
    <section className="border-t-2 border-ink pt-5">
      <h2 className="text-[21px] font-semibold">{title}</h2>
      <ul className="mt-4 grid gap-3">
        {items.map((x) => (
          <li key={x} className="flex gap-3 text-[16.5px] leading-[1.6]">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={`mt-1.5 flex-none ${color}`}>
              {mark}
            </svg>
            {x}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function Trust({ params }: PageProps<"/[lang]/trust">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const T = t.trust;
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="display max-w-3xl text-[40px] sm:text-[54px]">{T.title}</h1>
      <p className="mt-5 max-w-2xl text-[18px] leading-[1.7] text-ink-2">{T.lead}</p>
      <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
        <Block title={T.allowedTitle} items={T.allowed} tone="ok" />
        <Block title={AI_LIVE ? T.labeledTitle : T.labeledTitleSoon} items={T.labeled} tone="label" />
        <Block title={T.forbiddenTitle} items={T.forbidden} tone="no" />
      </div>
      <section className="mt-16 grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <h2 className="display text-[30px]">{T.howTitle}</h2>
        <ol className="grid gap-4">
          {!AI_LIVE && <li className="text-[16px] font-semibold text-ink-2">{T.howSoon}</li>}
          {T.how.map((x, i) => (
            <li key={x} className="flex gap-4 text-[16.5px] leading-[1.6]">
              <span className="tnum mt-0.5 font-semibold text-prussian">{i + 1}</span>
              {x}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-16 rounded-[var(--radius-panel)] bg-surface p-6 sm:p-8">
        <h2 className="text-[19px] font-semibold">{T.lawTitle}</h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-[1.75] text-ink-2">{T.law}</p>
        <p className="mt-3 text-[13.5px] text-ink-3">{T.lawNote}</p>
      </section>
    </div>
  );
}
