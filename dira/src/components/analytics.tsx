"use client";

import Script from "next/script";
import { useEffect } from "react";
import { captureCampaign } from "@/lib/track";

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/** Loads cookieless analytics only when configured; always remembers the visit's campaign tags. */
export function Analytics() {
  useEffect(() => captureCampaign(), []);
  if (!DOMAIN) return null;
  return <Script defer data-domain={DOMAIN} src="https://plausible.io/js/script.tagged-events.js" strategy="afterInteractive" />;
}
