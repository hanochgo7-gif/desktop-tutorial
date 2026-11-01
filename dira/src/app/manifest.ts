import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "דירה מוכנה · Dira Ready",
    short_name: "דירה מוכנה",
    start_url: "/he/studio",
    display: "standalone",
    background_color: "#f3f4f5",
    theme_color: "#1a3a8c",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
