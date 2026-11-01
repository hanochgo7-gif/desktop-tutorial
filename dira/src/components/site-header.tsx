"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { Logo } from "./logo";

export function swapLocalePath(pathname: string, to: Locale) {
  const parts = pathname.split("/");
  parts[1] = to;
  return parts.join("/") || `/${to}`;
}

export function LanguageLink({ lang, t, className }: { lang: Locale; t: Dict; className?: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const other: Locale = lang === "he" ? "en" : "he";
  return (
    <Link
      href={swapLocalePath(pathname, other)}
      hrefLang={other}
      lang={other}
      aria-label={t.nav.languageLabel}
      className={className}
      onClick={() => {
        document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      {t.nav.language}
    </Link>
  );
}

export function SiteHeader({ lang, t }: { lang: Locale; t: Dict }) {
  // The menu belongs to the page it was opened on, so navigating closes it.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);

  const links = [
    { href: `/${lang}#how`, label: t.nav.how },
    { href: `/${lang}/pricing`, label: t.nav.pricing },
    { href: `/${lang}/trust`, label: t.nav.trust },
    { href: `/${lang}/projects`, label: t.nav.projects },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line-2 bg-paper/90 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        {t.nav.skip}
      </a>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link href={`/${lang}`} className="shrink-0" aria-label={t.brand.name}>
          <Logo name={t.brand.name} />
        </Link>
        <nav aria-label={t.nav.menu} className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-[15px] text-ink-2 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageLink lang={lang} t={t} className="hidden rounded-md px-3 py-2 text-[15px] text-ink-2 hover:text-ink sm:inline-block" />
          <Link href={`/${lang}/account`} className="hidden rounded-md px-3 py-2 text-[15px] text-ink-2 hover:text-ink md:inline-block">
            {t.nav.account}
          </Link>
          <Link href={`/${lang}/studio`} className="btn btn-primary btn-sm hidden sm:inline-flex">
            {t.nav.open}
          </Link>
          <button
            type="button"
            className="icon-btn md:hidden hover:bg-line-2"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.close : t.nav.menu}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-line-2 bg-paper px-4 pb-5 pt-2 md:hidden">
          <nav aria-label={t.nav.menu} className="flex flex-col">
            {[...links, { href: `/${lang}/account`, label: t.nav.account }].map((l) => (
              <Link key={l.href} href={l.href} className="border-b border-line-2 py-3.5 text-[17px]">
                {l.label}
              </Link>
            ))}
            <LanguageLink lang={lang} t={t} className="py-3.5 text-[17px] text-ink-2" />
          </nav>
          <Link href={`/${lang}/studio`} className="btn btn-primary mt-3 w-full">
            {t.nav.open}
          </Link>
        </div>
      )}
    </header>
  );
}
