"use client";

import { useEffect, useRef, useState } from "react";
import { validateFiles } from "@/components/drop-zone";
import type { Dict, Locale } from "@/i18n";
import { useStartStudio } from "./hero-drop";

/**
 * Phones: once the hero's upload box has scrolled away, a bar at the bottom keeps the one action
 * in reach. It hides again over the closing call to action, which has its own upload box.
 */
export function MobileCta({ lang, t }: { lang: Locale; t: Dict }) {
  const [show, setShow] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const start = useStartStudio(lang);

  useEffect(() => {
    const hero = document.getElementById("hero-action");
    const final = document.getElementById("final-cta");
    if (!hero || !final) return;
    const seen = { hero: true, final: false };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) seen.hero = e.isIntersecting;
        if (e.target === final) seen.final = e.isIntersecting;
      }
      setShow(!seen.hero && !seen.final);
    });
    io.observe(hero);
    io.observe(final);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line-2 bg-paper/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 md:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
      aria-hidden={!show}
    >
      <button type="button" tabIndex={show ? 0 : -1} className="btn btn-primary w-full" onClick={() => input.current?.click()}>
        {t.landing.stickyCta}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) {
            const { ok } = validateFiles(e.target.files);
            if (ok.length) start(ok, "sticky");
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
