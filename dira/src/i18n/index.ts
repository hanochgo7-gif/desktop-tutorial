import he, { type Dict } from "./he";
import en from "./en";

export const LOCALES = ["he", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "he";

const dicts: Record<Locale, Dict> = { he, en };

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

export function getDict(locale: Locale): Dict {
  return dicts[locale];
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

/** Replace {name} placeholders. Numbers are formatted for the locale. */
export function fmt(template: string, values: Record<string, string | number>, locale: Locale = "he"): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = values[k];
    if (v === undefined) return `{${k}}`;
    return typeof v === "number" ? v.toLocaleString(locale === "he" ? "he-IL" : "en-GB", { maximumFractionDigits: 1 }) : v;
  });
}

export type { Dict };
