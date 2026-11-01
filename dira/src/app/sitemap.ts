import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/pricing", "/trust", "/legal"];
  return pages.flatMap((p) =>
    (["he", "en"] as const).map((lang) => ({
      url: `${SITE_URL}/${lang}${p}`,
      changeFrequency: "monthly" as const,
      priority: p === "" ? 1 : 0.6,
      alternates: { languages: { he: `${SITE_URL}/he${p}`, en: `${SITE_URL}/en${p}` } },
    })),
  );
}
