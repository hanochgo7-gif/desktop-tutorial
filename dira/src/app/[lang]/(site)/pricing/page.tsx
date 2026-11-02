import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuyButton, CancelledNotice, PaymentsNotice } from "@/components/account/buy-button";
import { PricingPlans } from "@/components/pricing-plans";
import { getDict, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";
import { AI_LIVE, whatsappLink } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/pricing">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return pageMeta(lang, "pricing", t.seo.pricingTitle, t.pricing.lead);
}

export default async function Pricing({ params }: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const heads = [t.pricing.plans.free.name, t.pricing.plans.pack.name, t.pricing.plans.pro.name, t.pricing.plans.business.name];
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="display max-w-3xl text-[40px] sm:text-[54px]">{t.pricing.title}</h1>
      <p className="mt-5 max-w-2xl text-[18px] leading-[1.7] text-ink-2">{t.pricing.lead}</p>
      <Suspense>
        <CancelledNotice t={t} />
      </Suspense>
      <PaymentsNotice t={t} />
      <div className="mt-10">
        <PricingPlans
          lang={lang}
          t={t}
          soon={!AI_LIVE}
          cta={(k) =>
            k === "free" ? (
              <Link href={`/${lang}/studio?new=1`} className="btn btn-primary w-full">
                {t.pricing.plans.free.cta}
              </Link>
            ) : k === "business" ? (
              <a href={whatsappLink(AI_LIVE ? t.pricing.plans.business.name : t.landing.aiSoonMessage)} className="btn btn-quiet w-full" target="_blank" rel="noopener noreferrer">
                {AI_LIVE ? t.pricing.plans.business.cta : t.pricing.whatsapp}
              </a>
            ) : (
              <BuyButton product={k === "pack" ? "pack10" : "pro30"} label={t.pricing.plans[k].cta} featured={k === "pack"} lang={lang} t={t} />
            )
          }
        />
      </div>
      <p className="mt-4 text-[13.5px] text-ink-3">
        {t.pricing.vat}. {t.pricing.note}
      </p>

      <h2 className="display mt-16 text-[30px]">{t.pricing.compareTitle}</h2>
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-panel)] border border-line-2 bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-[15px]">
          <thead>
            <tr className="border-b border-line-2 text-start">
              <th scope="col" className="p-4 text-start font-semibold text-ink-3" />
              {heads.map((h) => (
                <th key={h} scope="col" className="p-4 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.pricing.compareRows.map((row) => (
              <tr key={row[0]} className="border-b border-line-2 last:border-0">
                <th scope="row" className="p-4 text-start font-normal text-ink-2">
                  {row[0]}
                </th>
                {row.slice(1).map((c, i) => (
                  <td key={i} className="tnum p-4">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
