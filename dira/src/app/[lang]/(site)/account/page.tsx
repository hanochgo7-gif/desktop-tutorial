import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountView } from "@/components/account/account-view";
import { getDict, isLocale } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDict(lang).account.title, robots: { index: false } };
}

export default async function Account({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <Suspense>
      <AccountView lang={lang} t={getDict(lang)} />
    </Suspense>
  );
}
