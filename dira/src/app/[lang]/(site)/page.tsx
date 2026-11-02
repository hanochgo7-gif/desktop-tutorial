import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getDict, isLocale } from "@/i18n";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <LandingPage lang={lang} t={getDict(lang)} />;
}
