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
    <Suspense
      fallback={
        <div className="flex h-dvh flex-col" aria-busy="true">
          <div className="h-14 flex-none border-b border-line-2 bg-paper" />
          <div className="flex flex-1 items-center justify-center bg-stage">
            <div className="stage-skeleton h-2 w-40 rounded-full" />
          </div>
        </div>
      }
    >
      <StudioApp lang={lang} t={getDict(lang)} />
    </Suspense>
  );
}
