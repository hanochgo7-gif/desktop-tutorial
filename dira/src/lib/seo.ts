import type { Metadata } from "next";
import type { Locale } from "@/i18n";

// One place for page metadata: canonical and language alternates (with x-default → Hebrew), and
// per-page share cards. Paths are relative to metadataBase (SITE_URL, which already includes any
// base path), so they must NOT go through asset() — that would add the base path twice.

const OG_LOCALE: Record<Locale, string> = { he: "he_IL", en: "en_GB" };

export function pageMeta(
  lang: Locale,
  path: string,
  title: string,
  description: string,
  opts: { noindex?: boolean; absoluteTitle?: boolean } = {},
): Metadata {
  const p = path ? `${path.replace(/\/$/, "")}/` : "";
  const url = `/${lang}/${p}`;
  const image = { url: `/og-${lang}.jpg`, width: 1200, height: 630, alt: title };
  if (opts.noindex) {
    // Not for search, but their own canonical and share URL — not the home page's (inherited).
    return { title, description, robots: { index: false, follow: true }, alternates: { canonical: url, languages: {} }, openGraph: { url, title, description, images: [image] } };
  }
  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: { he: `/he/${p}`, en: `/en/${p}`, "x-default": `/he/${p}` },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[lang === "he" ? "en" : "he"]],
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
