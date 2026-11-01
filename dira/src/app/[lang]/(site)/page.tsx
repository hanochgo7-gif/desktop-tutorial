import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroDemo } from "@/components/landing/hero-demo";
import { HeroDrop } from "@/components/landing/hero-drop";
import { PricingPlans } from "@/components/pricing-plans";
import { getDict, isLocale } from "@/i18n";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const L = t.landing;

  return (
    <>
      {/* Hero: the product itself — drop a photo, or look at real output. */}
      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-x-14 lg:gap-y-8 lg:pt-14">
        <HeroDemo
          lang={lang}
          t={t}
          intro={
            <>
              <h1 className="display text-[42px] sm:text-[58px] lg:text-[66px]">{L.h1}</h1>
              <p className="mt-5 max-w-[34rem] text-[17px] leading-[1.65] text-ink-2 sm:text-[18px]">{L.lead}</p>
            </>
          }
          action={
            <>
              <div className="max-w-[34rem]">
                <HeroDrop lang={lang} t={t} />
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-2">
                {L.facts.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="text-ok">
                      <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </>
          }
        />
      </section>

      {/* How it works — a real sequence, so it is numbered. */}
      <section id="how" className="border-t border-line-2 bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="display max-w-2xl text-[34px] sm:text-[42px]">{L.howTitle}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {L.how.map((s, i) => (
              <li key={s.t} className="border-t-2 border-ink pt-5">
                <span className="tnum text-[14px] font-semibold text-prussian">{i + 1}</span>
                <h3 className="mt-1 text-[21px] font-semibold">{s.t}</h3>
                <p className="mt-2 max-w-sm text-[16px] text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Two kinds of work. */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="display max-w-2xl text-[34px] sm:text-[42px]">{L.toolsTitle}</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line rtl:md:divide-x-reverse">
          <div className="md:pe-10">
            <h3 className="text-[22px] font-semibold">{L.toolsStudio}</h3>
            <p className="mt-1 text-[14px] font-semibold text-ok">{L.toolsStudioNote}</p>
            <ul className="prose-list mt-5 grid gap-2.5 text-[16px] text-ink-2">
              {L.toolsStudioList.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="md:ps-10">
            <h3 className="text-[22px] font-semibold">{L.toolsAi}</h3>
            <p className="mt-1 text-[14px] font-semibold text-prussian">{L.toolsAiNote}</p>
            <ul className="prose-list mt-5 grid gap-2.5 text-[16px] text-ink-2">
              {L.toolsAiList.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rent / sale. */}
      <section className="border-y border-line-2 bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="display text-[34px] sm:text-[42px]">{L.marketTitle}</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {[L.rent, L.sale].map((m) => (
              <div key={m.t}>
                <h3 className="text-[22px] font-semibold">{m.t}</h3>
                <p className="mt-3 max-w-lg text-[17px] leading-[1.7] text-ink-2">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust. */}
      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="display text-[34px] sm:text-[42px]">{L.trustTitle}</h2>
          <p className="mt-4 max-w-md text-[17px] leading-[1.7] text-ink-2">{L.trustLead}</p>
          <Link href={`/${lang}/trust`} className="mt-6 inline-block font-semibold text-prussian underline underline-offset-4 hover:no-underline">
            {L.trustCta}
          </Link>
        </div>
        <ul className="grid content-start gap-0 border-t border-line">
          {L.trustList.map((x) => (
            <li key={x} className="flex items-center gap-3 border-b border-line py-4 text-[17px]">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-none text-err">
                <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {x}
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing. */}
      <section className="border-t border-line-2 bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="display max-w-3xl text-[34px] sm:text-[42px]">{t.pricing.title}</h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-[1.7] text-ink-2">{t.pricing.lead}</p>
          <div className="mt-10">
            <PricingPlans lang={lang} t={t} />
          </div>
          <p className="mt-4 text-[13.5px] text-ink-3">
            {t.pricing.vat}. {t.pricing.note}
          </p>
        </div>
      </section>

      {/* FAQ. */}
      <section className="mx-auto max-w-[860px] px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="display text-[34px] sm:text-[42px]">{L.faqTitle}</h2>
        <div className="mt-8 border-t border-line">
          {L.faq.map((f) => (
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
      </section>

      {/* Final call to action: the same drop zone. */}
      <section className="bg-stage text-white">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2">
          <div>
            <h2 className="display text-[38px] sm:text-[48px]">{L.finalTitle}</h2>
            <p className="mt-3 text-[18px] text-white/75">{L.finalLead}</p>
          </div>
          <HeroDrop lang={lang} t={t} variant="panel" />
        </div>
      </section>
    </>
  );
}
