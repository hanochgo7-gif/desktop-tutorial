import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";
import { AI_LIVE } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/legal">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return pageMeta(lang, "legal", `${t.legal.privacyTitle} · ${t.legal.termsTitle}`, t.legal.privacy[0]);
}

const List = ({ items }: { items: string[] }) => (
  <ul className="prose-list mt-6 grid gap-3 text-[16.5px] leading-[1.75] text-ink-2">
    {items.map((x) => (
      <li key={x}>{x}</li>
    ))}
  </ul>
);

export default async function Legal({ params }: PageProps<"/[lang]/legal">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 id="privacy" className="display text-[40px]">{t.legal.privacyTitle}</h1>
      <List items={AI_LIVE ? [...t.legal.privacy, ...t.legal.privacyAi] : t.legal.privacy} />
      {!AI_LIVE && (
        <>
          <h3 className="mt-8 text-[17px] font-semibold">{t.legal.laterTitle}</h3>
          <List items={t.legal.privacyAi} />
        </>
      )}
      <h2 id="terms" className="display mt-14 text-[34px]">{t.legal.termsTitle}</h2>
      <List items={AI_LIVE ? [...t.legal.terms, ...t.legal.termsAi] : t.legal.terms} />
      {!AI_LIVE && (
        <>
          <h3 className="mt-8 text-[17px] font-semibold">{t.legal.laterTitle}</h3>
          <List items={t.legal.termsAi} />
        </>
      )}
      <p className="mt-10 text-[13.5px] text-ink-3">{t.trust.lawNote}</p>
    </div>
  );
}
