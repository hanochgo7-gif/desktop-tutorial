// Public business details. NEXT_PUBLIC_* values are baked in at build time.

/** WhatsApp number in international format without +. Default: the number on the existing site. */
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP ?? "972553340694";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function whatsappLink(text?: string) {
  return `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Max photos per project and max file size, shared by the client and the server. */
export const MAX_PHOTOS = 60;
export const MAX_FILE_BYTES = 40 * 1024 * 1024;
