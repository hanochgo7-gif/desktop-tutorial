import type { Dict, Locale } from "@/i18n";
import { SITE_URL, WHATSAPP } from "@/lib/site";

// Structured data for search engines, built from the same text the page shows (FAQ answers must
// match what visitors see). No ratings or reviews: there are none to report.
export function HomeJsonLd({ lang, t, faq }: { lang: Locale; t: Dict; faq: { q: string; a: string }[] }) {
  const base = `${SITE_URL}/`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}#org`,
        name: "דירה מוכנה",
        alternateName: "Dira Ready",
        url: `${base}he/`,
        logo: `${base}icon-512.png`,
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: `https://wa.me/${WHATSAPP}`, availableLanguage: ["he", "en"] },
      },
      { "@type": "WebSite", "@id": `${base}#website`, url: `${base}he/`, name: "דירה מוכנה", alternateName: "Dira Ready", inLanguage: ["he-IL", "en"], publisher: { "@id": `${base}#org` } },
      {
        "@type": "WebApplication",
        name: `${t.brand.name} — ${t.brand.tagline}`,
        url: `${base}${lang}/`,
        applicationCategory: "PhotographyApplication",
        operatingSystem: "Web browser",
        inLanguage: lang,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" },
        featureList: t.landing.toolsStudioList,
        publisher: { "@id": `${base}#org` },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
