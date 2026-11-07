import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/he/studio", "/en/studio", "/he/account", "/en/account", "/he/projects", "/en/projects", "/he/pay/", "/en/pay/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
