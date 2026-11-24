import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountView } from "@/components/account/account-view";
import { getDict, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return pageMeta(lang, "account", t.account.title, t.account.signInLead, { noindex: true });
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
