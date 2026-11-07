import Link from "next/link";
import type { ReactNode } from "react";
import { fmt, type Dict, type Locale } from "@/i18n";
import { PRODUCTS, perCredit } from "@/lib/plans";

type PlanKey = "free" | "pack" | "pro" | "business";

/** The four plans. `cta` lets the pricing page swap links for live purchase buttons. */
export function PricingPlans({ lang, t, cta, soon = false }: { lang: Locale; t: Dict; cta?: (k: PlanKey) => ReactNode; soon?: boolean }) {
  const P = t.pricing.plans;
  const order: PlanKey[] = ["free", "pack", "pro", "business"];
  const credit: Partial<Record<PlanKey, number>> = {
    pack: perCredit(PRODUCTS.pack10),
    pro: perCredit(PRODUCTS.pro30),
    business: perCredit(PRODUCTS.business30),
  };
  return (
    <div className="grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-4">
      {order.map((k) => {
        const plan = P[k];
        const featured = k === "pack" && !soon;
        const isSoon = soon && k !== "free";
        return (
          <div key={k} className={`flex flex-col p-6 ${featured ? "bg-prussian-tint" : "bg-surface"}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[17px] font-semibold">{plan.name}</h3>
              {featured && <span className="rounded-md bg-prussian px-2 py-0.5 text-[12px] font-semibold text-white">{t.pricing.popular}</span>}
              {isSoon && <span className="rounded-md bg-prussian-tint px-2 py-0.5 text-[12px] font-semibold text-prussian">{t.pricing.soon}</span>}
            </div>
            <p className="mt-1 text-[14px] text-ink-3">{plan.d}</p>
            <p className="mt-5 flex items-baseline gap-2">
              <span className={`display tnum text-[40px] ${isSoon ? "text-ink-3" : ""}`}>{plan.price}</span>
              <span className="text-[14px] text-ink-3">{plan.unit}</span>
            </p>
            <p className="mt-1 h-5 text-[13px] text-ink-3 tnum">{credit[k] ? fmt(t.pricing.perCredit, { v: credit[k]! }, lang) : ""}</p>
            <ul className="prose-list mt-5 grid flex-1 content-start gap-2 text-[14.5px] text-ink-2">
              {plan.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
            <div className="mt-6">
              {cta ? (
                cta(k)
              ) : (
                <Link href={k === "free" ? `/${lang}/studio?new=1` : `/${lang}/pricing#${k}`} className={`btn w-full ${featured ? "btn-primary" : "btn-quiet"}`}>
                  {plan.cta}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
