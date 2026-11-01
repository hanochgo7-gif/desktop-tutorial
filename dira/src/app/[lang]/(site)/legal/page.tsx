import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/legal">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return { title: `${t.legal.privacyTitle} · ${t.legal.termsTitle}` };
}

export default async function Legal({ params }: PageProps<"/[lang]/legal">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 id="privacy" className="display text-[40px]">{t.legal.privacyTitle}</h1>
      <ul className="prose-list mt-6 grid gap-3 text-[16.5px] leading-[1.75] text-ink-2">
        {t.legal.privacy.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h2 id="terms" className="display mt-14 text-[34px]">{t.legal.termsTitle}</h2>
      <ul className="prose-list mt-6 grid gap-3 text-[16.5px] leading-[1.75] text-ink-2">
        {t.legal.terms.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p className="mt-10 text-[13.5px] text-ink-3">{t.trust.lawNote}</p>
    </div>
  );
}
