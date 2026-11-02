import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StudioApp } from "@/components/studio/studio-app";
import { getDict, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/studio">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return pageMeta(lang, "studio", t.studio.title, t.meta.description, { noindex: true });
}

export default async function StudioPage({ params }: PageProps<"/[lang]/studio">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <Suspense fallback={<div className="h-dvh bg-stage" />}>
      <StudioApp lang={lang} t={getDict(lang)} />
    </Suspense>
  );
}
