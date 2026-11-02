import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { HomeJsonLd } from "@/components/json-ld";
import { HeroDemo } from "@/components/landing/hero-demo";
import { HeroDrop, SampleButton } from "@/components/landing/hero-drop";
import { MobileCta } from "@/components/landing/mobile-cta";
import { PricingPlans } from "@/components/pricing-plans";
import { getDict, isLocale } from "@/i18n";
import { AI_LIVE, asset, whatsappLink } from "@/lib/site";

const Check = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={`flex-none ${className}`}>
    <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const L = t.landing;
  // FAQ answers about AI tools appear only once those tools are live.
  const faq = L.faq.filter((f) => AI_LIVE || !("ai" in f && f.ai));
  // The hero photo is the largest thing on the first screen: fetch it before fonts and scripts.
  preload(asset("/bg/hero-1280.webp"), { as: "image", fetchPriority: "high", media: "(max-width: 899px)" });
  preload(asset("/bg/hero-2400.webp"), { as: "image", fetchPriority: "high", media: "(min-width: 900px)" });

  return (
    <>
      <HomeJsonLd lang={lang} t={t} faq={faq} />

      {/* 1. Hero: what it is, the upload, and real output side by side. */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[620px] lg:h-[min(100%,1000px)]">
          <picture>
            <source media="(min-width: 900px)" srcSet={asset("/bg/hero-2400.webp")} />
            <img src={asset("/bg/hero-1280.webp")} alt="" className="hero-photo absolute inset-0 h-full w-full object-cover" fetchPriority="high" decoding="async" />
          </picture>
          <div className="hero-scrim absolute inset-0" />
        </div>
        <p className="absolute end-3 top-3 hidden rounded bg-paper/70 px-1.5 py-0.5 text-[11.5px] text-ink-3 backdrop-blur-sm sm:block">{L.bgNote}</p>
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-7 px-4 pb-14 pt-7 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-x-14 lg:gap-y-7 lg:pb-20 lg:pt-14">
          <HeroDemo
            lang={lang}
            t={t}
            intro={
              <>
                <p className="text-[15px] font-semibold text-prussian">{L.eyebrow}</p>
                <h1 className="display mt-2 text-[40px] sm:text-[56px] lg:text-[64px]">{L.h1}</h1>
                <p className="mt-4 max-w-[34rem] text-[17px] leading-[1.65] text-ink-2 sm:text-[18px]">{L.lead}</p>
              </>
            }
            action={
              <>
                <div className="max-w-[34rem]">
                  <HeroDrop lang={lang} t={t} />
                  <SampleButton lang={lang} t={t} />
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14.5px] font-semibold text-ink">
                  {L.facts.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="text-ok" />
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            }
          />
        </div>
      </section>

      {/* 2. Who it's for. */}
      <section className="border-t border-line-2 bg-surface">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2">
          {[L.rent, L.sale].map((m) => (
            <div key={m.t}>
              <h2 className="display text-[30px] sm:text-[36px]">{m.t}</h2>
              <p className="mt-3 max-w-lg text-[17px] leading-[1.7] text-ink-2">{m.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. How it works — a real sequence, so it is numbered. */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="display max-w-2xl text-[34px] sm:text-[42px]">{L.howTitle}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {L.how.map((s, i) => (
              <li key={s.t} className="border-t-2 border-ink pt-5">
                <span className="tnum text-[15px] font-semibold text-prussian">{i + 1}</span>
                <h3 className="mt-1 text-[21px] font-semibold">{s.t}</h3>
                <p className="mt-2 max-w-sm text-[16px] text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-12 grid gap-x-8 gap-y-3 border-t border-line pt-8 text-[16px] text-ink-2 sm:grid-cols-2 lg:grid-cols-3">
            {L.toolsStudioList.map((x) => (
              <li key={x} className="flex items-start gap-2.5">
                <Check className="mt-1 text-ok" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. What we won't do. */}
      <section className="border-y border-line-2 bg-surface">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="display text-[32px] sm:text-[40px]">{L.trustTitle}</h2>
            <p className="mt-4 max-w-md text-[17px] leading-[1.7] text-ink-2">{L.trustLead}</p>
            <Link href={`/${lang}/trust`} className="mt-6 inline-block font-semibold text-prussian underline underline-offset-4 hover:no-underline">
              {L.trustCta}
            </Link>
          </div>
          <ul className="grid content-start border-t border-line">
            {L.trustList.map((x) => (
              <li key={x} className="flex items-center gap-3 border-b border-line py-4 text-[17px]">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-none text-err">
                  <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Price — only what is live is offered. */}
      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
        {AI_LIVE ? (
          <>
            <h2 className="display max-w-3xl text-[34px] sm:text-[42px]">{t.pricing.title}</h2>
            <p className="mt-4 max-w-2xl text-[17px] leading-[1.7] text-ink-2">{t.pricing.lead}</p>
            <div className="mt-10">
              <PricingPlans lang={lang} t={t} />
            </div>
          </>
        ) : (
          <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start">
            <div>
              <h2 className="display text-[34px] sm:text-[42px]">{L.priceTitle}</h2>
              <p className="mt-4 max-w-xl text-[17px] leading-[1.7] text-ink-2">{L.priceLead}</p>
              <ul className="mt-6 grid gap-2.5 text-[16px]">
                {t.pricing.plans.free.list.map((x) => (
                  <li key={x} className="flex items-center gap-2.5">
                    <Check className="text-ok" />
                    {x}
                  </li>
                ))}
              </ul>
              <Link href={`/${lang}/pricing`} className="mt-6 inline-block font-semibold text-prussian underline underline-offset-4 hover:no-underline">
                {L.priceMore}
              </Link>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-dashed border-line bg-surface p-6">
              <p className="inline-block rounded-md bg-prussian-tint px-2 py-0.5 text-[13px] font-semibold text-prussian">{t.pricing.soon}</p>
              <h3 className="mt-3 text-[20px] font-semibold">{L.aiSoonTitle}</h3>
              <p className="mt-2 text-[15.5px] leading-[1.7] text-ink-2">{L.aiSoon}</p>
              <a href={whatsappLink(L.aiSoonMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-quiet btn-sm mt-4">
                {L.aiSoonCta}
              </a>
            </div>
          </div>
        )}
      </section>

      {/* 6. FAQ. */}
      <section className="border-t border-line-2 bg-surface">
        <div className="mx-auto max-w-[860px] px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="display text-[34px] sm:text-[42px]">{L.faqTitle}</h2>
          <div className="mt-8 border-t border-line">
            {faq.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[18px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-none transition-transform duration-200 group-open:rotate-45">
                    <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="pb-5 text-[16.5px] leading-[1.75] text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Closing call to action: the same upload. */}
      <section id="final-cta" className="relative isolate overflow-hidden bg-stage text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <picture>
            <source media="(min-width: 900px)" srcSet={asset("/bg/dusk-2400.webp")} />
            <img src={asset("/bg/dusk-1280.webp")} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
          </picture>
          <div className="dusk-scrim absolute inset-0" />
        </div>
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2">
          <div>
            <h2 className="display text-[38px] sm:text-[48px]">{L.finalTitle}</h2>
            <p className="mt-3 text-[18px] text-white/80">{L.finalLead}</p>
          </div>
          <div>
            <HeroDrop lang={lang} t={t} variant="panel" />
            <SampleButton lang={lang} t={t} dark />
          </div>
        </div>
      </section>

      <MobileCta lang={lang} t={t} />
    </>
  );
}
