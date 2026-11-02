import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, IBM_Plex_Sans_Hebrew } from "next/font/google";
import { notFound } from "next/navigation";
import { LOCALES, dirOf, getDict, isLocale } from "@/i18n";
import { Analytics } from "@/components/analytics";
import { pageMeta } from "@/lib/seo";
import { SITE_URL, asset } from "@/lib/site";
import "../globals.css";

const frank = Frank_Ruhl_Libre({ subsets: ["hebrew"], weight: ["500", "700"], variable: "--font-frank", display: "swap" });
const plex = IBM_Plex_Sans_Hebrew({ subsets: ["hebrew"], weight: ["400", "600", "700"], variable: "--font-plex", display: "swap" });

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
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${frank.variable} ${plex.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
