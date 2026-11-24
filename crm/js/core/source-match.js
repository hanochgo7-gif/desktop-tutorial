// Map a free-text source from an imported spreadsheet ("אינסטגרם ממומן", "המלצה של לקוח") to a lead source.
// Paid vs organic decides ROAS and CAC, so the words that say "ad" are checked first, and anything unclear
// is left unknown rather than guessed. Pure: takes the source rows, so it can be tested in Node.

const PAID = /(ממומן|ממומנ|מודע|קמפיין|ads\b|adwords|ppc|\bcpc\b|sponsored|paid)/;
const META = /(פייסבוק|אינסטגרם|אינסטה|facebook|instagram|\bfb\b|\big\b|\bmeta\b)/;
const GOOGLE = /(גוגל|google)/;
const ORGANIC = /(אורגני|organic|seo|חיפוש)/;
const REFERRAL = /(המלצ|ממליץ|הפני|הופנ|חבר|מפה לאוזן|referr)/;
const REPEAT = /(לקוח חוזר|חוזר|repeat|returning)/;
const WHATSAPP = /(וואטסאפ|ווטסאפ|whatsapp|\bwa\b)/;
const EVENT = /(כנס|הרצא|אירוע|event|conference)/;

export function matchSourceText(text, sources) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  const byKey = (k) => sources.find((s) => s.key === k) || null;
  const base = (s) => s.name.toLowerCase().replace(/\(.*?\)/g, '').trim();
  const exact = sources.find((s) => s.name.toLowerCase() === t || base(s) === t);
  if (exact) return exact;
  if (META.test(t)) return byKey(PAID.test(t) ? 'meta_ads' : 'social');
  if (GOOGLE.test(t)) return PAID.test(t) ? byKey('google_ads') : ORGANIC.test(t) ? byKey('organic') : null;
  if (REFERRAL.test(t)) return byKey('referral');
  if (REPEAT.test(t)) return byKey('repeat');
  if (WHATSAPP.test(t)) return byKey('whatsapp');
  if (EVENT.test(t)) return byKey('event');
  // a source the user added: its name (without the explanation in brackets) appears in the text
  return sources.find((s) => base(s).length >= 3 && t.includes(base(s))) || null;
}
