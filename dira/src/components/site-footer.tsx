import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { AI_LIVE, whatsappLink } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter({ lang, t }: { lang: Locale; t: Dict }) {
  return (
    <footer className="border-t border-line-2 bg-paper">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-md">
          <Logo name={t.brand.name} />
          <p className="mt-4 text-[15px] text-ink-2">{AI_LIVE ? t.footer.line : t.footer.lineSoon}</p>
          <p className="mt-2 text-[13px] text-ink-3">{t.footer.notBroker}</p>
          <p className="mt-1 text-[13px] text-ink-3">{t.footer.bgNote}</p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-6 gap-y-1 text-[15px] text-ink-2 md:justify-end" aria-label="footer">
          <Link prefetch={false} href={`/${lang}/studio?new=1`} className="inline-block py-2 hover:text-ink">{t.nav.studio}</Link>
          <Link prefetch={false} href={`/${lang}/pricing`} className="inline-block py-2 hover:text-ink">{t.nav.pricing}</Link>
          <Link prefetch={false} href={`/${lang}/trust`} className="inline-block py-2 hover:text-ink">{t.nav.trust}</Link>
          <Link prefetch={false} href={`/${lang}/legal`} className="inline-block py-2 hover:text-ink">{t.footer.privacy} · {t.footer.terms}</Link>
          <a href={whatsappLink()} className="inline-block py-2 hover:text-ink" target="_blank" rel="noopener noreferrer">{t.footer.contact}</a>
        </nav>
      </div>
    </footer>
  );
}
