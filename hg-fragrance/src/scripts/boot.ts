export interface CatalogEntry {
  name: string;
  number: string;
  label: string;
  price: number;
  slug: string;
  available: boolean;
}

export interface Boot {
  catalog: Record<string, CatalogEntry>;
  strings: Record<string, string>;
  currency: string;
  locale: string;
  maxQty: number;
}

const el = document.getElementById('hg-boot');
export const boot: Boot = el ? JSON.parse(el.textContent || '{}') : { catalog: {}, strings: {}, currency: 'USD', locale: 'en', maxQty: 6 };

export const s = (key: string) => boot.strings[key] ?? key;

const fmt = new Intl.NumberFormat(boot.locale, {
  style: 'currency',
  currency: boot.currency,
  maximumFractionDigits: 0,
});
export const money = (n: number) => fmt.format(n);

export const reducedMotion = () => !document.documentElement.classList.contains('motion');
