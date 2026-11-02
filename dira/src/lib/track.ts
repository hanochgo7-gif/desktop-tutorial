"use client";
// Privacy-respecting measurement. Off unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set (cookieless
// Plausible). Never sends file names, image data, dimensions or EXIF — only event names, coarse
// buckets and the visit's first-touch campaign tags (utm_*), kept in sessionStorage.

type Props = Record<string, string | number | boolean>;
type Plausible = (event: string, opts?: { props?: Props }) => void;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const STORE = "dira.utm";

export function captureCampaign() {
  try {
    if (sessionStorage.getItem(STORE)) return;
    const q = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = q.get(k);
      if (v) utm[k] = v.slice(0, 80);
    }
    if (q.has("gclid")) utm.click = "google";
    else if (q.has("fbclid")) utm.click = "meta";
    sessionStorage.setItem(STORE, JSON.stringify(utm));
  } catch {
    /* storage unavailable: measure without campaign tags */
  }
}

function campaign(): Props {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? "{}") as Props;
  } catch {
    return {};
  }
}

export function track(event: "upload_start" | "correction_ready" | "download" | "share" | "whatsapp_click", props: Props = {}) {
  if (typeof window === "undefined") return;
  const p = (window as unknown as { plausible?: Plausible }).plausible;
  if (!p) return;
  p(event, { props: { ...campaign(), ...props, lang: document.documentElement.lang } });
}

export const countBucket = (n: number) => (n <= 1 ? "1" : n <= 5 ? "2-5" : n <= 20 ? "6-20" : "21+");
