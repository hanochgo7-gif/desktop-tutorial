// Shared helpers: safe HTML templating, formatting (he-IL), dates, CSV, misc.

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
export const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
export function debounce(fn, ms = 250) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export function groupBy(arr, fn) {
  const m = new Map();
  for (const x of arr) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}
export const sum = (arr, fn = (x) => x) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0);
export function sortBy(arr, fn, dir = 1) {
  return [...arr].sort((a, b) => {
    const x = fn(a), y = fn(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y), 'he') * dir;
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
// Stable hue from a string, for avatars.
export function hueFor(str = '') {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
export function normalize(s) {
  return String(s ?? '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[-()\s.]/g, '');
}
export function normalizePhone(p) {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.startsWith('972')) d = '0' + d.slice(3);
  return d;
}
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

// ---------- formatting ----------
const nf = new Intl.NumberFormat('he-IL');
const nf1 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });
const moneyFmt = {};
export const fmt = {
  number: (n) => (n == null || n === '' || isNaN(n) ? '' : nf.format(Number(n))),
  decimal: (n) => (n == null || n === '' || isNaN(n) ? '' : nf1.format(Number(n))),
  money(n, currency = 'ILS', compact = false) {
    if (n == null || n === '' || isNaN(n)) return '';
    const key = currency + compact;
    moneyFmt[key] ||= new Intl.NumberFormat('he-IL', {
      style: 'currency', currency, maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    });
    return moneyFmt[key].format(Number(n));
  },
  percent: (n) => (n == null || n === '' || isNaN(n) ? '' : `${nf1.format(Number(n))}%`),
  date(d) {
    if (!d) return '';
    const x = new Date(d);
    if (isNaN(x)) return '';
    return x.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  dateShort(d) {
    if (!d) return '';
    const x = new Date(d);
    return isNaN(x) ? '' : x.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  },
  dateTime(d) {
    if (!d) return '';
    const x = new Date(d);
    if (isNaN(x)) return '';
    return x.toLocaleString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  time(d) {
    if (!d) return '';
    const x = new Date(d);
    return isNaN(x) ? '' : x.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  },
  relative(d) {
    if (!d) return '';
    const x = new Date(d).getTime();
    const diff = x - Date.now();
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto' });
    const min = 60e3, hr = 36e5, day = 864e5;
    if (abs < min) return 'עכשיו';
    if (abs < hr) return rtf.format(Math.round(diff / min), 'minute');
    if (abs < day) return rtf.format(Math.round(diff / hr), 'hour');
    if (abs < 30 * day) return rtf.format(Math.round(diff / day), 'day');
    if (abs < 365 * day) return rtf.format(Math.round(diff / (30 * day)), 'month');
    return rtf.format(Math.round(diff / (365 * day)), 'year');
  },
  month(d) {
    const x = new Date(d);
    return x.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
  },
};

// ---------- dates ----------
export const DAY = 864e5;
export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
export function startOfMonth(d = new Date()) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }
export function startOfWeek(d = new Date()) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; } // Sunday, Israeli week
export function startOfQuarter(d = new Date()) { const x = startOfMonth(d); x.setMonth(Math.floor(x.getMonth() / 3) * 3); return x; }
export function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY); }
export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
// Value for <input type=date> / datetime-local in local time.
export function toDateInput(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
export function toDateTimeInput(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${toDateInput(x)}T${p(x.getHours())}:${p(x.getMinutes())}`;
}
export const monthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };

// ---------- CSV ----------
// RFC 4180 parser; handles quoted fields, escaped quotes, CRLF, BOM, and ; or tab delimiters (auto-detected).
export function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const c of firstLine) { if (c === '"') q = !q; else if (!q && c in counts) counts[c]++; }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}
export function toCSV(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens Hebrew correctly
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function readFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}

// Deterministic PRNG (mulberry32) for repeatable demo data.
export function prng(seed = 1) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rnd.int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
  rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  rnd.chance = (p) => rnd() < p;
  rnd.weighted = (pairs) => { // [[value, weight], ...]
    const total = pairs.reduce((a, p) => a + p[1], 0);
    let r = rnd() * total;
    for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
    return pairs[pairs.length - 1][0];
  };
  return rnd;
}

// Simple template merge: "שלום {{contact.firstName}}" with fallback "{{contact.firstName|חבר}}".
export function mergeTemplate(text, ctx) {
  return String(text ?? '').replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g, (_, path, fb) => {
    const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx);
    return v == null || v === '' ? (fb ?? '') : String(v);
  });
}
