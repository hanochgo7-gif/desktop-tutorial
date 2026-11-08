// Shared helpers: safe HTML templating, DOM helpers, ids, small utilities.

// ---------- HTML templating ----------
// html`...` escapes every interpolated value unless it is itself an Html (from html`` or raw()).
// Arrays are joined, null/undefined/false render as nothing.
export class Html {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new Html(String(s ?? ''));
function toHtml(v) {
  if (v == null || v === false) return '';
  if (v instanceof Html) return v.s;
  if (Array.isArray(v)) return v.map(toHtml).join('');
  return esc(v);
}
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += toHtml(vals[i]); });
  return new Html(out);
}
export function render(el, content) {
  el.innerHTML = toHtml(content);
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Delegated listener: on(root, 'click', '[data-act]', (e, el) => ...). Returns an unsubscribe function.
export function on(root, type, selector, fn, opts) {
  const handler = (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) fn(e, el);
  };
  root.addEventListener(type, handler, opts);
  return () => root.removeEventListener(type, handler, opts);
}

// ---------- ids & misc ----------
let idCounter = 0;
export function uid(prefix = 'id') {
  idCounter = (idCounter + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`;
}
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const sum = (arr, fn = (x) => x) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0);
export function debounce(fn, ms = 250) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}
export function shuffle(arr, seed = Math.random()) {
  // Seeded Fisher-Yates (mulberry32) so a shuffle can be reproduced within a session.
  let s = Math.floor(seed * 2 ** 31) || 1;
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// ---------- dates as ISO strings (contract C-3) ----------
// A canonical timestamp is exactly what Date.prototype.toISOString() writes for years 0-9999:
// "YYYY-MM-DDTHH:mm:ss.sssZ" with a real calendar date. Such a string already starts with its UTC day, and two of
// them order as plain strings, so the hot paths need no Date per record. Anything else (offsets, no milliseconds,
// Date objects, numbers, impossible dates that Date would roll over) goes the old way.
const ISO_SHAPE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function isCanonicalIso(x) {
  if (typeof x !== 'string' || x.length !== 24 || !ISO_SHAPE.test(x)) return false;
  const day = (x.charCodeAt(8) - 48) * 10 + x.charCodeAt(9) - 48;
  if (day <= 28) return true;
  const month = (x.charCodeAt(5) - 48) * 10 + x.charCodeAt(6) - 48;
  if (month !== 2) return day <= MONTH_DAYS[month - 1];
  const year = Number(x.slice(0, 4));
  return day <= ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28);
}
// The UTC day of a timestamp: todayKey(new Date(x)) without building a Date for a canonical string.
export const dayOf = (x) => (isCanonicalIso(x) ? x.slice(0, 10) : todayKey(new Date(x)));

// ---------- shared Intl objects (contract C-3) ----------
// Building an Intl object is the expensive part (the first one of a kind also loads its ICU data), so lists
// format and sort with one shared object per kind and language instead of one per row or per comparison. Their
// options are the ones the call sites used, so the output is identical.
let collator = null;
// a.localeCompare(b, 'en', { sensitivity: 'base' }) as one object: collatorEn().compare(a, b).
export const collatorEn = () => (collator ||= new Intl.Collator('en', { sensitivity: 'base' }));
const relTimes = new Map();
// new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }), one per language.
export function relTime(lang) {
  let f = relTimes.get(lang);
  if (!f) relTimes.set(lang, (f = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })));
  return f;
}
// n.toLocaleString('en-US') for an integer ("1,500"), without ICU; anything else is passed to toLocaleString.
export const groupDigits = (n) => (Number.isSafeInteger(n) && !Object.is(n, -0) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : n.toLocaleString('en-US'));
// Builds the shared objects (and loads their ICU data) when the page is idle, so the first open of the vocabulary
// notebook or the expressions list does not pay for it. Boot calls it once after the first route renders; later
// calls do nothing.
let warmed = false;
export function warmIntl(lang = globalThis.document?.documentElement?.lang) {
  if (warmed) return;
  warmed = true;
  const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 1));
  idle(() => {
    try {
      collatorEn().compare('a', 'b');
      relTime(lang === 'he' ? 'he' : 'en').format(1, 'day');
    } catch { /* no Intl: the callers build theirs */ }
  });
}
export const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);

// Download text as a file (export).
export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
