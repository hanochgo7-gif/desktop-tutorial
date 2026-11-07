// Public business details. NEXT_PUBLIC_* values are baked in at build time.

/** WhatsApp number in international format without +. Default: the number on the existing site. */
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP ?? "972553340694";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Set when the site is served from a sub-path (the static GitHub Pages build). */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** True for the static build: no server, so accounts, AI tools and payments are off. */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC === "1";

/** A file from /public, with the base path. */
export const asset = (p: string) => `${BASE_PATH}${p}`;

export function whatsappLink(text?: string) {
  return `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Max photos per project and max file size, shared by the client and the server. */
export const MAX_PHOTOS = 60;
export const MAX_FILE_BYTES = 40 * 1024 * 1024;

/**
 * AI tools and paid plans are shown as live only when this is set at build time (together with the
 * server keys). Until then the site says "coming soon" and sells nothing.
 */
export const AI_LIVE = process.env.NEXT_PUBLIC_AI_LIVE === "1";
