import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, IBM_Plex_Sans_Hebrew } from "next/font/google";
import { notFound } from "next/navigation";
import { LOCALES, dirOf, getDict, isLocale } from "@/i18n";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const frank = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], weight: ["500", "700"], variable: "--font-frank", display: "swap" });
const plex = IBM_Plex_Sans_Hebrew({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: `%s · ${t.brand.name}` },
    description: t.meta.description,
    alternates: { canonical: `/${lang}`, languages: { he: "/he", en: "/en" } },
    openGraph: {
      type: "website",
      locale: lang === "he" ? "he_IL" : "en_GB",
      title: t.meta.title,
      description: t.meta.description,
      siteName: t.brand.name,
      images: [{ url: "/og.jpg", width: 1200, height: 630 }],
    },
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f3f4f5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${frank.variable} ${plex.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
