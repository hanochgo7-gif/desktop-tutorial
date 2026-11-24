// Age, decided when it is used. Lucid has no minimum age (owner's decision, November 2026); it asks only the
// year of birth (data minimisation) because some protections depend on age:
// - under 18: no marketing consent (the database also forces it off for accounts);
// - under 16: content flagged as offensive, vulgar, sexual or about alcohol is not shown, and a parent or
//   guardian confirms before data leaves the device (creating or syncing an account, turning on AI feedback).
// Only the year is known, so the real age is one of two values: the current year minus the birth year (after the
// birthday) or one less (before it). The sanity bound (ageFromYear) uses the older value, so nobody is turned
// away; the protections (isMinor, isUnder16) use the younger one, so a 15-year-old born late in the year is
// still protected as under 16 (the same rule as the database trigger, migration 004, and privacy.html).
// The current year is the UTC year, on every device and in the database trigger (which also uses UTC), so the
// app and the server never disagree for a few hours around New Year's Eve in another time zone.
// It is worked out again on every use, never frozen: the 'minor' flag that onboarding stores is kept for
// compatibility and only consulted when there is no birth year.
// Pure functions, no imports, so content.js, session.js and the views can all use them.

export const ADULT_AGE = 18;
export const GUARDIAN_AGE = 16;
// The oldest age the database accepts (a sanity bound, as in lucid_profiles_guard).
export const MAX_AGE = 120;
// Content flags that hide an item from learners under GUARDIAN_AGE (docs/content-schema.md).
export const SENSITIVE_FLAGS = ['offensive', 'vulgar', 'sexual', 'alcohol'];

// The year now, in UTC (the same clock as lucid_profiles_guard).
export const currentYear = (now = new Date()) => now.getUTCFullYear();

export function ageFromYear(birthYear, now = new Date()) {
  const y = Number(birthYear);
  if (!Number.isInteger(y) || y <= 0) return null;
  const age = currentYear(now) - y;
  return age >= 0 && age <= MAX_AGE ? age : null;
}

export const ageOf = (p, now) => ageFromYear(p?.birth_year, now);

// The youngest the learner can be this year (0 for someone born this year). Protections decide on this value.
export function youngestAge(birthYear, now = new Date()) {
  const a = ageFromYear(birthYear, now);
  return a == null ? null : Math.max(0, a - 1);
}

// Under 18. Without a usable birth year, the stored flag decides (older profiles; a profile without a year
// is not created by onboarding).
export function isMinor(p, now) {
  const a = youngestAge(p?.birth_year, now);
  return a == null ? Boolean(p?.minor) : a < ADULT_AGE;
}

// Under 16: the protections that are new with the removal of the age limit.
export function isUnder16(p, now) {
  const a = youngestAge(p?.birth_year, now);
  return a != null && a < GUARDIAN_AGE;
}

// The flags an item carries (`sensitive: ['alcohol']`), limited to the known ones.
export const flagsOf = (item) => (Array.isArray(item?.sensitive) ? item.sensitive.filter((f) => SENSITIVE_FLAGS.includes(f)) : []);

// What a learner may see from a list: { shown, hidden } (hidden is a count, never the items).
export function forLearner(items = [], p, now) {
  if (!isUnder16(p, now)) return { shown: items, hidden: 0 };
  const shown = items.filter((x) => !flagsOf(x).length);
  return { shown, hidden: items.length - shown.length };
}

// The year-of-birth choices: this year and the 110 years before it (ages 0 to 110; the database accepts up to 120).
export const birthYears = (now = new Date()) => Array.from({ length: 111 }, (_, i) => currentYear(now) - i);

// AI feedback is on for this learner: the consent is given and, under 16, with a parent's or guardian's agreement
// (ai_guardian_consent_at). A learner onboarded when Lucid was 16+ may be counted as under 16 now and have consent
// without that agreement; for them AI stays off until Settings takes it.
export const aiConsented = (s, p, now) => Boolean(s?.ai_consent) && (!isUnder16(p, now) || Boolean(s?.ai_guardian_consent_at));
