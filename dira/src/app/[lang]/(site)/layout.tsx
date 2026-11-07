import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDict, isLocale } from "@/i18n";

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <>
      <SiteHeader lang={lang} t={t} />
      <main id="main">{children}</main>
      <SiteFooter lang={lang} t={t} />
    </>
  );
}
