// Browser checks for the round-3 lane "bilingual-text" (BL-1, BL-3, BL-4, BL-5; BL-8 is tests/unit/copy.test.mjs).
// Serves lucid/ on port 9133 (BT_PORT), drives Chromium through Playwright, prints one line per check and exits 1
// on any failure. Usage: node tests/e2e/bilingual-text.mjs [--only <substring>]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const app = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.BT_PORT) || 9133;
const BASE = `http://127.0.0.1:${PORT}/`;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

async function newPage(browser, { w = 390, h = 844, touch = w < 600, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce', locale: 'he-IL', colorScheme: dark ? 'dark' : 'light', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  return { ctx, page };
}
// A learner placed at a level, made through the app's own store.
async function learnerAt(page, level, { text = 100, lang = 'he' } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, text, lang }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: lang, goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, text, lang });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
async function go(page, hash) {
  await page.goto(`${BASE}${hash}${hash.includes('?') ? '&' : '?'}t=${Date.now()}`);
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(400);
}
// The line boxes of an element's text: [{ l, r, top }], one per visual line.
const LINES = `(e) => { const g = document.createRange(); g.selectNodeContents(e); const rows = {}; for (const x of g.getClientRects()) { if (!x.width) continue; const k = Math.round(x.bottom); rows[k] = rows[k] ? { l: Math.min(rows[k].l, x.left), r: Math.max(rows[k].r, x.right), top: x.top } : { l: x.left, r: x.right, top: x.top }; } return Object.values(rows); }`;

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: app, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ } await sleep(100); }
  browser = await chromium.launch();

  // ---------- BL-1 ----------
  await check('BL-1a. #/lesson/a1-02 at 390: the objective reads "/s/, /z/ או /ɪz/" in order, IPA whole', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await go(page, '#/lesson/a1-02');
    const r = await page.evaluate(() => {
      const he = [...document.querySelectorAll('.point .bi-he')].find((e) => e.textContent.includes('/ɪz/'));
      if (!he) return null;
      const bdis = [...he.querySelectorAll('bdi')];
      const sz = bdis.find((b) => b.textContent === '/s/, /z/');
      const iz = bdis.find((b) => b.textContent.startsWith('/ɪz/'));
      // "או" between them, as a text range.
      const walker = document.createTreeWalker(he, NodeFilter.SHOW_TEXT);
      let or = null;
      for (let n; (n = walker.nextNode());) { const i = n.textContent.indexOf(' או '); if (i >= 0 && !n.parentElement.closest('bdi')) { or = document.createRange(); or.setStart(n, i + 1); or.setEnd(n, i + 3); break; } }
      // The first line box of each piece (a long isolate may go on to the next line).
      const box = (x) => { const b = x.getClientRects()[0]; return { l: b.left, r: b.right, t: Math.round(b.top), bt: Math.round(b.bottom) }; };
      return { sz: sz && box(sz), iz: iz && box(iz), or: or && box(or), texts: bdis.map((b) => b.textContent), szLines: sz ? new Set([...sz.getClientRects()].map((x) => Math.round(x.top))).size : 0 };
    });
    assert(r && r.sz && r.iz && r.or, `isolates: ${JSON.stringify(r?.texts)}`);
    assert(r.texts.every((t) => (t.match(/\//g) || []).length % 2 === 0), `an IPA token is cut: ${JSON.stringify(r.texts)}`);
    // Right to left: "/s/, /z/" before "או" before "/ɪz/" (to its left on the same line, or on a later line).
    const before = (a, b) => (Math.abs(a.t - b.t) < 6 ? a.r >= b.r : a.t < b.t);
    assert(before(r.sz, r.or) && before(r.or, r.iz), `out of order: ${JSON.stringify(r)}`);
    assert(r.szLines === 1, '"/s/, /z/" breaks across lines');
    await ctx.close();
  });

  await check('BL-1b. #/lesson/pa1-02 pitfall at 390: "/æ/ (cat)" is one isolate on one line', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await go(page, '#/lesson/pa1-02');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    const r = await page.evaluate(() => [...document.querySelectorAll('.lesson-learn .block-warning bdi')].filter((b) => b.textContent.includes('(cat)')).map((b) => ({ t: b.textContent, lines: new Set([...b.getClientRects()].map((x) => Math.round(x.top))).size })));
    assert(r.length && r.every((x) => x.t.startsWith('/æ/') && x.lines === 1), `pitfall isolates: ${JSON.stringify(r)}`);
    await ctx.close();
  });

  await check('BL-1c. #/expressions at 390: the "Chill" list number 3 sits outside the English; nothing scrolls sideways at 320 and 150%', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await go(page, '#/expressions');
    const r = await page.evaluate(() => {
      const he = [...document.querySelectorAll('.entry-he')].find((e) => e.textContent.includes('My manager is really chill'));
      return he ? [...he.querySelectorAll('bdi')].map((b) => b.textContent) : null;
    });
    assert(r, 'no "Chill" entry on the page');
    assert(r.includes('My manager is really chill.') && r.every((t) => !/(^\d|\s\d+\)?$)/.test(t)), `a number inside the English: ${JSON.stringify(r)}`);
    await ctx.close();
    const n = await newPage(browser, { w: 320, h: 700 });
    await learnerAt(n.page, 'A2', { text: 150 });
    for (const route of ['#/expressions', '#/lesson/a1-02', '#/lesson/pa1-02']) {
      await go(n.page, route);
      const over = await n.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(over <= 1, `${route} scrolls sideways by ${over}px at 320 and 150%`);
    }
    await n.ctx.close();
  });

  // ---------- BL-3 ----------
  await check('BL-3a. #/lesson/pa1-01 exercise 1 at 390: the Hebrew instruction leads in ink, at least the English size', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await go(page, '#/lesson/pa1-01');
    await page.click('[data-skip-learn]');
    await page.waitForSelector('#exroot .ex-prompt');
    const r = await page.evaluate(() => {
      const p = document.querySelector('#exroot .ex-prompt');
      const he = p.querySelector('.bi-he'), en = p.querySelector('.bi-en');
      const probe = document.createElement('span'); probe.style.color = 'var(--ink)'; document.body.append(probe);
      const ink = getComputedStyle(probe).color; probe.remove();
      return { ink, heColor: getComputedStyle(he).color, heSize: parseFloat(getComputedStyle(he).fontSize), enSize: parseFloat(getComputedStyle(en).fontSize), heFirst: he.getBoundingClientRect().top < en.getBoundingClientRect().top };
    });
    assert(r.heColor === r.ink, `Hebrew colour ${r.heColor}, ink ${r.ink}`);
    assert(r.heSize >= r.enSize && r.heFirst, `Hebrew is not the leading line: ${JSON.stringify(r)}`);
    await ctx.close();
  });

  await check('BL-3b. #/lesson/pa1-01 learn: paragraphs show the Hebrew and an "EN" chip, not both texts; the chip opens the English', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await go(page, '#/lesson/pa1-01');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    const blocks = '.lesson-learn > .stack > :is(p:not(.table-hint), .block-rule, .block-tip, .block-warning)';
    const r = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => ({ he: Boolean(b.querySelector('.bi-he.primary')), enShown: [...b.querySelectorAll('.bi-en')].some((e) => !e.hidden), chip: b.querySelector('.en-reveal')?.textContent.trim().slice(0, 2) })), blocks);
    assert(r.length >= 3 && r.every((x) => x.he && !x.enShown && x.chip === 'EN'), `paragraphs: ${JSON.stringify(r)}`);
    const chip = page.locator(`${blocks} .en-reveal`).first();
    await chip.click();
    assert(await chip.evaluate((b) => b.getAttribute('aria-expanded') === 'true' && !b.nextElementSibling.hidden && b.nextElementSibling.lang === 'en'), '"EN" does not open the English');
    await ctx.close();
  });

  await check('BL-3c. A2 and B1 lessons render as before: English first, Hebrew under it or one tap away', async () => {
    for (const [level, lesson] of [['A2', 'a2-01'], ['B1', 'b1-02']]) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, level);
      await go(page, `#/lesson/${lesson}`);
      await page.click('[data-skip-learn]');
      await page.waitForSelector('#exroot .ex-prompt');
      const r = await page.evaluate(() => { const b = document.querySelector('#exroot .ex-prompt .bi'); return { first: b.firstElementChild.className, heFirst: document.querySelectorAll('.he-first, .bi-he.primary').length }; });
      assert(r.first === 'bi-en' && r.heFirst === 0, `${lesson}: ${JSON.stringify(r)}`);
      await ctx.close();
    }
  });

  // ---------- BL-4 ----------
  await check('BL-4a. #/path and #/today at 1440: an English title and the can-do on its row share the right edge (< 8px)', async () => {
    const { ctx, page } = await newPage(browser, { w: 1440, h: 900 });
    await learnerAt(page, 'A2');
    await go(page, '#/path');
    const gaps = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.lesson-list .lesson-row')].map((row) => { const en = row.querySelector('.l-en'), meta = row.querySelector('.meta[dir="ltr"]'); return en && meta ? Math.abs(Math.max(...lines(en).map((x) => x.r)) - Math.max(...lines(meta).map((x) => x.r))) : null; }).filter((x) => x != null); }, LINES);
    assert(gaps.length >= 5 && gaps.every((g) => g < 8), `path title/can-do gaps: ${gaps.map(Math.round)}`);
    await go(page, '#/today');
    const today = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.plan-item')].map((row) => { const en = row.querySelector('.l-en'), can = row.querySelector('[lang="en"][dir="ltr"]:not(.l-en)'); return en && can ? Math.abs(Math.max(...lines(en).map((x) => x.r)) - Math.max(...lines(can).map((x) => x.r))) : null; }).filter((x) => x != null); }, LINES);
    assert(today.length >= 1 && today.every((g) => g < 8), `today title/can-do gaps: ${today.map(Math.round)}`);
    await ctx.close();
  });

  await check('BL-4b. #/lesson/b2-01 examples are left-aligned whatever their length (390 and 1440)', async () => {
    for (const w of [390, 1440]) {
      const { ctx, page } = await newPage(browser, { w, h: 900 });
      await learnerAt(page, 'B2');
      await go(page, '#/lesson/b2-01');
      await page.click('[data-go="learn"]');
      await page.waitForSelector('.lesson-learn .example');
      const lefts = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.lesson-learn .example')].flatMap((c) => lines(c.querySelector('.l-en')).map((x) => Math.round(x.l - c.getBoundingClientRect().left))); }, LINES);
      assert(lefts.length >= 8 && Math.max(...lefts) - Math.min(...lefts) <= 2, `${w}: example lines start at ${[...new Set(lefts)]}`);
      await ctx.close();
    }
  });

  await check('BL-4c. #/scenario phrase cards align the same way for one-line and two-line phrases', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await go(page, '#/scenario/rl-airport-checkin-overweight');
    const cards = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.example')].map((c) => { const L = lines(c.querySelector('.l-en')); return { n: L.length, left: Math.round(Math.min(...L.map((x) => x.l)) - c.getBoundingClientRect().left) }; }); }, LINES);
    const one = cards.filter((c) => c.n === 1), two = cards.filter((c) => c.n > 1);
    assert(one.length && two.length, `need one-line and two-line phrases: ${JSON.stringify(cards)}`);
    const lefts = new Set(cards.map((c) => c.left));
    assert(lefts.size === 1, `phrase cards start at ${[...lefts]}`);
    await ctx.close();
  });

  // ---------- BL-5 ----------
  const chips = (page) => page.evaluate(() => [...document.querySelectorAll('#view .he-reveal')].filter((b) => b.offsetParent).map((b) => {
    const r = b.getBoundingClientRect(), prev = b.previousElementSibling?.getBoundingClientRect();
    return { label: b.firstChild.textContent.trim(), w: r.width, h: r.height, inline: prev ? r.top < prev.bottom - 2 : false };
  }));
  const chipsOk = (list, where) => {
    assert(list.length >= 2, `${where}: ${list.length} chips`);
    assert(list.every((c) => c.label === 'בעברית'), `${where}: labels ${[...new Set(list.map((c) => c.label))]}`);
    assert(list.every((c) => !c.inline), `${where}: a chip sits inside an English sentence`);
    assert(list.every((c) => c.w >= 44 && c.h >= 44), `${where}: a chip under 44x44 (${list.map((c) => `${Math.round(c.w)}x${Math.round(c.h)}`)})`);
  };
  await check('BL-5. #/lesson/b1-02 and #/checkpoint/B1 results: chips read "בעברית", sit on their own line, 44x44 on touch', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await go(page, '#/lesson/b1-02');
    chipsOk(await chips(page), 'b1-02 intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    chipsOk(await chips(page), 'b1-02 learn');
    await go(page, '#/checkpoint/B1');
    await page.click('[data-begin]');
    for (let i = 0; i < 80 && !(await page.$('a.key.enter[href="#/path/B1"]')); i++) {
      const idk = await page.$('[data-idk]:not([disabled])');
      if (idk) await idk.click();
      const next = await page.$('[data-next]:not([disabled])');
      if (next) await next.click();
      await page.waitForTimeout(60);
    }
    await page.waitForSelector('a.key.enter[href="#/path/B1"]');
    chipsOk(await chips(page), 'checkpoint B1 results');
    const open = page.locator('#view .he-reveal').first();
    await open.click();
    assert(await open.evaluate((b) => !b.nextElementSibling.hidden && /[א-ת]/.test(b.nextElementSibling.textContent)), 'the chip does not open the Hebrew');
    await ctx.close();
  });
} finally {
  await browser?.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 10).join('\n  ')}`);
process.exit(failed.length ? 1 : 0);
