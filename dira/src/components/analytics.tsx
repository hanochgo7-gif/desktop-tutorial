"use client";

import Script from "next/script";
import { useEffect } from "react";
import { captureCampaign, track } from "@/lib/track";

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/** Loads cookieless analytics only when configured; always remembers the visit's campaign tags. */
export function Analytics() {
  useEffect(() => captureCampaign(), []);
  // Every WhatsApp link (contact, "tell me when AI opens") counts as a lead, wherever it is.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="https://wa.me/"]');
      if (a) track("whatsapp_click", { where: location.pathname.split("/").filter(Boolean).slice(-1)[0] ?? "home" });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  if (!DOMAIN) return null;
  return <Script defer data-domain={DOMAIN} src="https://plausible.io/js/script.tagged-events.js" strategy="afterInteractive" />;
}
