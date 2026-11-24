import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { LOCALES, dirOf, getDict, isLocale } from "@/i18n";
import { Analytics } from "@/components/analytics";
import { firstPaintFiles, fontCss } from "@/lib/fonts";
import { pageMeta } from "@/lib/seo";
import { SITE_URL, asset } from "@/lib/site";
import "../globals.css";

// Fonts are self-hosted so each language preloads only its own subset (see lib/fonts.ts).
const FONT_CSS = fontCss(asset);

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  const home = pageMeta(lang, "", t.meta.title, t.meta.description);
  return {
    ...home,
    metadataBase: new URL(`${SITE_URL}/`),
    title: { default: t.meta.title, template: `%s · ${t.brand.name}` },
    applicationName: t.brand.name,
    openGraph: { ...home.openGraph, siteName: t.brand.name },
    icons: { icon: asset("/icon.svg"), apple: asset("/apple-icon.png") },
  };
}

export const viewport: Viewport = {
  themeColor: "#093484",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  for (const file of firstPaintFiles(lang)) preload(asset(file), { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
