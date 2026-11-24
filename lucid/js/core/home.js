// Where Lucid lives (LB-01, docs/setup.md "Launch switch"). config.js names two addresses:
// - NEW_HOME: Lucid's own address (its own origin, on Vercel). Empty until the owner knows it. When set, the copy
//   at OLD_HOME shows a banner that offers to move the learner's progress there (js/core/move.js), and accounts
//   and AI may run only there.
// - OLD_HOME: the GitHub Pages copy, which shares its origin with other sites of the same account.
// config.js is read as a namespace, so a config.js without these exports (an older release's, or a test's mock)
// reads as empty instead of failing to load.
import * as config from '../../config.js';

export const NEW_HOME = typeof config.NEW_HOME === 'string' ? config.NEW_HOME.trim() : '';
export const OLD_HOME = typeof config.OLD_HOME === 'string' ? config.OLD_HOME.trim() : '';

// The origin of an absolute http(s) URL, or '' for anything else (empty, relative, another scheme).
export function originOf(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : '';
  } catch { return ''; }
}

// LB-01: the origins where accounts and AI may run. Only Lucid's own address; local development (http on
// localhost or 127.0.0.1, any port) is allowed separately in originAllowed.
export const ACCOUNT_ORIGINS = Object.freeze([originOf(NEW_HOME)].filter(Boolean));

const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// Whether accounts and AI may run at `origin`. Never on *.github.io: every Pages site of an account shares that
// origin, so other sites' scripts could read the session (docs/setup.md 2.1). Otherwise only an origin on the list.
export function originAllowed(origin, allow = ACCOUNT_ORIGINS) {
  if (typeof origin !== 'string' || !origin) return false;
  if (LOCAL.test(origin)) return true;
  let host = '';
  try { host = new URL(origin).hostname.toLowerCase(); } catch { return false; }
  if (host === 'github.io' || host.endsWith('.github.io')) return false;
  return allow.includes(origin);
}

// This page is the old copy and Lucid has a new address: the "Lucid moved" banner shows. Never on the new address
// itself, and never while NEW_HOME is empty.
export function isOldCopy(origin, { newHome = NEW_HOME, oldHome = OLD_HOME } = {}) {
  const to = originOf(newHome), from = originOf(oldHome);
  return Boolean(to && from && to !== from && origin === from);
}
