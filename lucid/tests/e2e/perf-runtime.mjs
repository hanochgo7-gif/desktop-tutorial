// Browser acceptance checks for the perf programme's runtime lane (docs/perf/plan.json, lane "runtime"): the learner
// model, store and Intl speed changes keep what the learner sees. A heavy learner (tools/perf/seed-heavy.mjs: six
// months of history, about 700 words) opens the vocabulary notebook, the expressions list, Progress, Today and a word
// game in Chromium's own ICU; the order and labels on the first rendered frame are compared with the pre-change code
// (a new Intl object per row and per comparison), and they must not change afterwards.
// Serves lucid/ itself, prints one line per check and exits 1 on any failure.
// Usage: node tests/e2e/perf-runtime.mjs [--only <substring>]      port: LANE_PORT (default 9403)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seedHeavy } from '../../tools/perf/seed-heavy.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const PORT = Number(process.env.LANE_PORT) || 9403;
const BASE = `http://127.0.0.1:${PORT}/`;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const ONLY = arg('--only');

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// Records the first state of the vocabulary list and the expressions list as they enter the DOM (the content of the
// first frame they are painted in), and counts IndexedDB getAll calls (the store's reads of the database).
function probe() {
  if (window.top !== window) return;
  const F = window.__first = { vocab: null, slang: null, bars: null, getAll: 0 };
  try {
    const orig = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function getAll(...a) { F.getAll++; return orig.apply(this, a); };
  } catch { /* no IndexedDB */ }
  const snap = () => {
    if (!F.vocab && document.querySelector('#vocab-list .vocab-row')) {
      F.vocab = { at: Date.now(), groups: [...document.querySelectorAll('#vocab-list details[data-level]')].map((d) => ({ level: d.dataset.level, ids: [...d.querySelectorAll('.vocab-row')].map((r) => r.dataset.word), when: [...d.querySelectorAll('.vocab-row-when')].map((x) => x.textContent) })) };
    }
    if (!F.slang && document.querySelector('#view article.entry[data-entry]')) F.slang = [...document.querySelectorAll('#view article.entry[data-entry]')].map((x) => x.dataset.entry);
    if (!F.bars && document.querySelector('#view .bars[aria-label]')) F.bars = { at: Date.now(), label: document.querySelector('#view .bars').getAttribute('aria-label') };
  };
  new MutationObserver(snap).observe(document, { childList: true, subtree: true });
}

async function heavyLearner(browser, { lang = 'he' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block' });
  await ctx.addInitScript(probe);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`${page.url()} :: console: ${m.text()}`); });
  await page.goto(`${BASE}#/welcome`);
  await page.waitForFunction(() => Boolean(window.lucid?.store));
  const info = await page.evaluate(seedHeavy, {});
  if (lang !== 'he') await page.evaluate(async (l) => { const L = await import('./js/core/learner.js'); L.saveProfile({ ...L.profile(), ui_language: l }); await window.lucid.store.flush(); }, lang);
  return { ctx, page, info };
}
const open = async (page, route, sel) => {
  await page.goto(`${BASE}#/${route}`);
  await page.reload();
  await page.waitForSelector(sel, { timeout: 30_000 });
};

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  const { ctx, page, info } = await heavyLearner(browser);

  await check(`heavy learner seeded through the app (${info.attempts} attempts, ${info.events} events, ${info.cards} cards)`, async () => {
    assert(info.attempts > 4000 && info.events > 1000 && info.cards > 500, JSON.stringify(info));
  });

  await check('R4: Today opens with one read of the IndexedDB store (the probe read is the load) and shows the plan', async () => {
    await open(page, 'today', '#view .today .plan');
    const n = await page.evaluate(() => window.__first.getAll);
    assert(n === 1, `${n} getAll calls at boot`);
    const rows = await page.evaluate(() => document.querySelectorAll('#view .today .plan li').length);
    assert(rows > 0, 'no plan blocks');
  });

  await check('R8: the vocabulary notebook\'s first frame has the old A-Z order and next-review labels in every level', async () => {
    await open(page, 'vocab', '#vocab-list .vocab-row');
    const first = await page.evaluate(() => window.__first.vocab);
    assert(first && first.groups.length, 'no first frame recorded');
    const expected = await page.evaluate(async (at) => {
      const S = await import('./js/core/srs.js');
      const cards = window.lucid.store.all('cards');
      const wordKey = (id) => String(id).replace(/:(meaning|form)$/, '');
      const nextDue = new Map();
      for (const c of cards) { const k = wordKey(c.id); const d = c.fsrs?.due; if (d && (!nextDue.has(k) || d < nextDue.get(k))) nextDue.set(k, d); }
      // The pre-change code: localeCompare per comparison and a new RelativeTimeFormat per row.
      const old = (iso, now) => {
        const ms = new Date(iso) - now;
        if (!(ms > 0)) return null;
        const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto' });
        const fmt = (n, unit) => rtf.format(n, unit).replace(/\s*\(\d+\)$/, '');
        const hours = ms / 3_600_000;
        if (hours < 1) return fmt(Math.max(1, Math.round(ms / 60_000)), 'minute');
        if (hours < 24) return fmt(Math.round(hours), 'hour');
        const days = Math.round(hours / 24);
        if (days < 45) return fmt(days, 'day');
        if (days < 365) return fmt(Math.round(days / 30), 'month');
        return fmt(Math.round(days / 365), 'year');
      };
      const words = cards.filter((c) => c.kind === 'meaning').map((c) => {
        const p = { word: c.ref?.word || '', ...(c.payload || {}) };
        return { id: c.id, word: p.word, level: S.cardLevel(c), due: nextDue.get(wordKey(c.id)) || c.fsrs?.due };
      }).filter((w) => w.word).sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
      const byLevel = {};
      for (const w of words) (byLevel[w.level] ||= []).push(w);
      const label = (w, now) => { const isDue = !w.due || new Date(w.due) <= now; return (isDue ? null : old(w.due, now)) || 'לחזרה עכשיו'; };
      return Object.fromEntries(Object.entries(byLevel).map(([l, ws]) => [l, { ids: ws.map((w) => w.id), when: [at, at - 1000].map((t) => ws.map((w) => label(w, new Date(t)))) }]));
    }, first.at);
    let rows = 0;
    for (const g of first.groups) {
      const e = expected[g.level];
      assert(e, `level ${g.level} not expected`);
      const ids = e.ids.slice(0, g.ids.length);
      assert(JSON.stringify(ids) === JSON.stringify(g.ids), `${g.level}: order differs at ${g.ids.findIndex((x, i) => x !== ids[i])}`);
      const ok = e.when.some((w) => JSON.stringify(w.slice(0, g.when.length)) === JSON.stringify(g.when));
      assert(ok, `${g.level}: next-review labels differ (${g.when.slice(0, 3).join(' | ')} vs ${e.when[0].slice(0, 3).join(' | ')})`);
      rows += g.ids.length;
    }
    assert(rows > 100, `only ${rows} rows`);
  });

  await check('R8: the vocabulary list never reorders after its first frame', async () => {
    await page.waitForTimeout(1500);
    const now = await page.evaluate(() => [...document.querySelectorAll('#vocab-list details[data-level]')].map((d) => ({ level: d.dataset.level, ids: [...d.querySelectorAll('.vocab-row')].map((r) => r.dataset.word) })));
    const first = await page.evaluate(() => window.__first.vocab.groups.map(({ level, ids }) => ({ level, ids })));
    assert(JSON.stringify(now) === JSON.stringify(first), 'the list changed after its first frame');
  });

  await check('R6: the expressions list\'s first frame has the old order (by level, then A-Z with localeCompare)', async () => {
    await open(page, 'expressions', '#view article.entry[data-entry]');
    const first = await page.evaluate(() => window.__first.slang);
    const expected = await page.evaluate(async () => {
      const A = await import('./js/core/adaptive.js');
      const L = await import('./js/core/learner.js');
      const data = await (await fetch('content/real-life/slang.json')).json();
      const all = data.entries.filter((x) => x?.id && x.term);
      const byTerm = (a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' });
      const byLevel = (a, b) => A.levelIndex(a.level) - A.levelIndex(b.level) || byTerm(a, b);
      const level = A.levelIndex(L.model().courseLevel) <= A.levelIndex('A2');
      return [...all].sort(level ? byLevel : byTerm).map((x) => x.id);
    });
    const shown = new Set(first);
    const want = expected.filter((id) => shown.has(id));
    assert(first.length > 10, `only ${first.length} entries`);
    assert(JSON.stringify(want) === JSON.stringify(first), `order differs at ${first.findIndex((x, i) => x !== want[i])}`);
    await page.waitForTimeout(1000);
    const later = await page.evaluate(() => [...document.querySelectorAll('#view article.entry[data-entry]')].map((x) => x.dataset.entry));
    assert(JSON.stringify(later) === JSON.stringify(first), 'the list changed after its first frame');
  });

  await check('R6 and R7: Progress\'s week chart has Chromium\'s own narrow weekday names and the old per-day counts (Hebrew)', async () => {
    await open(page, 'progress', '#rep-h');
    const r = await page.evaluate(() => {
      const lang = document.documentElement.lang;
      const attempts = window.lucid.store.all('attempts');
      const at = window.__first.bars.at;
      const want = Array.from({ length: 7 }, (_, i) => { const d = new Date(at - (6 - i) * 86_400_000); const k = d.toISOString().slice(0, 10); return `${d.toLocaleDateString(lang, { weekday: 'narrow' })}: ${attempts.filter((a) => a.at.slice(0, 10) === k && a.source !== 'placement').length}`; }).join(', ');
      return { lang, got: window.__first.bars.label, want };
    });
    assert(r.lang === 'he', `lang ${r.lang}`);
    assert(r.got === r.want, `${r.got} vs ${r.want}`);
  });

  await check('R3 and R6: in Chromium, util.dayOf equals todayKey(new Date(x)) and groupDigits equals toLocaleString("en-US")', async () => {
    const bad = await page.evaluate(async () => {
      const U = await import('./js/core/util.js');
      const out = [];
      for (let i = 0; i < 5000; i++) { const iso = new Date(Math.floor(Math.random() * 4102444800000)).toISOString(); if (U.dayOf(iso) !== U.todayKey(new Date(iso))) out.push(iso); }
      for (const x of ['2026-11-06T23:30:00+03:00', '2026-02-30T00:00:00.000Z', '2026-11-06T10:00:00Z']) if (U.dayOf(x) !== U.todayKey(new Date(x))) out.push(x);
      for (const n of [0, 7, 999, 1000, 1500, 12345, 999999, 1000000, 1234567, -1500]) if (U.groupDigits(n) !== n.toLocaleString('en-US')) out.push(n);
      return out;
    });
    assert(!bad.length, `differs for ${bad.slice(0, 3).join(', ')}`);
  });

  await check('R5: the word game from Today builds a round of four different options (heavy learner)', async () => {
    await open(page, 'games/A1/1', '[data-opt]:not([disabled])');
    const opts = await page.evaluate(() => [...document.querySelectorAll('[data-opt]')].map((b) => b.textContent.trim()));
    assert(opts.length === 4 && new Set(opts).size === 4, JSON.stringify(opts));
  });
  await ctx.close();

  await check('R6: Progress\'s week chart in the English UI has Chromium\'s narrow weekday names', async () => {
    const en = await heavyLearner(browser, { lang: 'en' });
    await open(en.page, 'progress', '#rep-h');
    const r = await en.page.evaluate(() => {
      const lang = document.documentElement.lang;
      const at = window.__first.bars.at;
      const want = Array.from({ length: 7 }, (_, i) => new Date(at - (6 - i) * 86_400_000).toLocaleDateString(lang, { weekday: 'narrow' }));
      return { lang, got: window.__first.bars.label.split(', ').map((x) => x.split(':')[0]), want };
    });
    assert(r.lang === 'en', `lang ${r.lang}`);
    assert(JSON.stringify(r.got) === JSON.stringify(r.want), `${r.got} vs ${r.want}`);
    await en.ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
if (pageErrors.length) console.log(`page errors:\n  ${pageErrors.join('\n  ')}`);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
