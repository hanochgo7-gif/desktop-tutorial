import type { MetadataRoute } from "next";
import { asset } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "דירה מוכנה · Dira Ready",
    short_name: "דירה מוכנה",
    start_url: asset("/he/studio/"),
    display: "standalone",
    background_color: "#f3f4f5",
    theme_color: "#1a3a8c",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
