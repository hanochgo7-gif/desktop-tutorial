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
