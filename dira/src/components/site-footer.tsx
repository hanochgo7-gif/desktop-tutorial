import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { whatsappLink } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter({ lang, t }: { lang: Locale; t: Dict }) {
  return (
    <footer className="border-t border-line-2 bg-paper">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-md">
          <Logo name={t.brand.name} />
          <p className="mt-4 text-[15px] text-ink-2">{t.footer.line}</p>
          <p className="mt-2 text-[13px] text-ink-3">{t.footer.notBroker}</p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-6 gap-y-3 text-[15px] text-ink-2 md:justify-end" aria-label="footer">
          <Link href={`/${lang}/studio`} className="hover:text-ink">{t.nav.studio}</Link>
          <Link href={`/${lang}/pricing`} className="hover:text-ink">{t.nav.pricing}</Link>
          <Link href={`/${lang}/trust`} className="hover:text-ink">{t.nav.trust}</Link>
          <Link href={`/${lang}/legal`} className="hover:text-ink">{t.footer.privacy} · {t.footer.terms}</Link>
          <a href={whatsappLink()} className="hover:text-ink" target="_blank" rel="noopener noreferrer">{t.footer.contact}</a>
        </nav>
      </div>
    </footer>
  );
}
