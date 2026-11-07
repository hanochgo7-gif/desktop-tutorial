import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getDict, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";

// Landing page for rent listings: the same studio, opened with the promise an ad for rent makes.
export async function generateMetadata({ params }: PageProps<"/[lang]/rent">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const P = getDict(lang).landing.pages.rent;
  return pageMeta(lang, "rent", P.title, P.lead, { absoluteTitle: true });
}

export default async function Page({ params }: PageProps<"/[lang]/rent">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <LandingPage lang={lang} t={getDict(lang)} variant="rent" />;
}
