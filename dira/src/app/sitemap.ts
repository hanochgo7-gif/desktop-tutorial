import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/rent", "/sale", "/pricing", "/trust", "/legal"];
  return pages.flatMap((p) =>
    (["he", "en"] as const).map((lang) => ({
      url: `${SITE_URL}/${lang}${p}/`,
      changeFrequency: "monthly" as const,
      priority: p === "" ? 1 : 0.6,
      alternates: { languages: { he: `${SITE_URL}/he${p}/`, en: `${SITE_URL}/en${p}/`, "x-default": `${SITE_URL}/he${p}/` } },
    })),
  );
}
