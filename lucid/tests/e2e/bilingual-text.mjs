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
// The learn stage comes in steps (LF-2): run fn on every step, from the current one to the last.
async function eachLearnStep(page, fn) {
  const out = [];
  for (let i = 0; i < 12; i++) {
    out.push(await fn(page));
    // A locator re-resolves the key after the footer redraws, and the step label tells when the next step is up.
    const next = page.locator('.player-foot [data-learn-next]');
    if (!(await next.count())) break;
    const label = await page.textContent('[data-step-label]');
    await next.click();
    await page.waitForFunction((was) => document.querySelector('[data-step-label]')?.textContent !== was, label);
  }
  return out;
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
    // Pitfalls sit beside the rule on their learn step (LF-2), and the note leads with the Hebrew (BL-7), so the
    // pair may read "cat (/æ/)" or "/æ/ (cat)": either way one isolate on one line.
    const r = (await eachLearnStep(page, (p) => p.evaluate(() => [...document.querySelectorAll('.lesson-learn .pitfall bdi')].filter((b) => b.textContent.includes('/æ/')).map((b) => ({ t: b.textContent, lines: new Set([...b.getClientRects()].map((x) => Math.round(x.top))).size }))))).flat();
    assert(r.length && r.every((x) => /^(cat \(\/æ\/\)|\/æ\/ \(cat\))$/.test(x.t) && x.lines === 1), `pitfall isolates: ${JSON.stringify(r)}`);
    await ctx.close();
  });

  await check('BL-1c / RW-10. #/expressions at 390: the "Chill" senses are a numbered list, with no list number inside the English; nothing scrolls sideways at 320 and 150%', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    // Numbered senses are a list (RW-10): the numbers are list markers, and each English example is its own run.
    await go(page, '#/expressions?open=ex-chill');
    await page.waitForSelector('ol.senses.entry-he');
    const r = await page.evaluate(() => {
      const he = [...document.querySelectorAll('ol.senses.entry-he')].find((e) => e.textContent.includes('My manager is really chill'));
      return he ? { items: he.querySelectorAll(':scope > li').length, marker: getComputedStyle(he).listStyleType, en: [...he.querySelectorAll('[lang="en"], bdi')].map((b) => b.textContent.trim()) } : null;
    });
    assert(r, 'no "Chill" entry on the page');
    assert(r.items === 3 && r.marker !== 'none', `the senses are not a numbered list: ${JSON.stringify(r)}`);
    assert(r.en.includes('My manager is really chill.') && r.en.every((t) => !/(^\d|\d\)?$)/.test(t)), `a number inside the English: ${JSON.stringify(r)}`);
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

  // RW-10 made the expressions' senses a list, so no screen now shows a Hebrew list number after English text. The
  // BL-1 rule is still checked in the page: the panel's own string goes through the app's isolateLatin into #view.
  await check('BL-1d. The numbered gloss "…really chill. 3) Chill!" keeps each number outside the English and each full stop inside, rendered in the page at 390', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await go(page, '#/expressions');
    const r = await page.evaluate(async () => {
      const { isolateLatin } = await import('./js/core/i18n.js');
      const { render } = await import('./js/core/util.js');
      const chill = "1) (פועל) לנוח, להירגע: We just chilled at home (סתם עשינו צ'יל בבית). 2) (תואר) רגוע, זורם: My manager is really chill. 3) Chill! או Chill out! = 'תירגעו!'";
      const p = document.createElement('p');
      p.lang = 'he'; p.dir = 'rtl'; p.className = 'entry-he';
      document.querySelector('#view').prepend(p);
      render(p, isolateLatin(chill));
      const bdis = [...p.querySelectorAll('bdi')];
      const manager = bdis.find((b) => b.textContent.includes('My manager'));
      // A sentence of 30 characters or fewer sits in its one-line unit (SB-3): the text after the unit follows it.
      const box = manager?.parentElement?.classList.contains('nw') ? manager.parentElement : manager;
      return { en: bdis.map((b) => b.textContent), after: box?.nextSibling?.textContent || '', text: p.textContent };
    });
    assert(r.en.includes('My manager is really chill.'), `the sentence is not one isolate with its full stop: ${JSON.stringify(r.en)}`);
    assert(r.en.every((t) => !/(^\d|\d\)?$)/.test(t)), `a list number inside the English: ${JSON.stringify(r.en)}`);
    assert(/^\s*3\)/.test(r.after), `"3)" does not follow the English outside it: ${JSON.stringify(r.after)}`);
    assert(r.en.includes('Chill!') && r.en.includes('Chill out!'), `the senses' English is not isolated: ${JSON.stringify(r.en)}`);
    await ctx.close();
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
    // The learn stage comes in steps (LF-2), with pitfalls beside the rule: collect the blocks on every step.
    const blocks = '.lesson-learn .learn-units :is(.learn-unit > p:not(.table-hint), .block-rule, .block-tip, .block-warning, .pitfall > div:not(.pitfall-say))';
    const r = (await eachLearnStep(page, (p) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => ({ he: Boolean(b.querySelector('.bi-he.primary')), enShown: [...b.querySelectorAll('.bi-en')].some((e) => !e.hidden), chip: b.querySelector('.en-reveal')?.textContent.trim().slice(0, 2) })), blocks))).flat();
    assert(r.length >= 3 && r.every((x) => x.he && !x.enShown && x.chip === 'EN'), `paragraphs: ${JSON.stringify(r)}`);
    // Back to the first step (a reload would land on the saved last step), and open the first chip there.
    for (let i = 0; i < 12 && (await page.$('[data-learn-prev]')); i++) { await page.click('[data-learn-prev]'); await page.waitForTimeout(250); }
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
  // At A2 the can-do is an English meta line; at A1 (full support, TP-5) it is bi()'s English under the Hebrew.
  await check('BL-4a. #/path and #/today at 1440, at A2 and A1: an English title and the can-do on its row share the right edge (< 8px)', async () => {
    for (const level of ['A2', 'A1']) {
      const { ctx, page } = await newPage(browser, { w: 1440, h: 900 });
      await learnerAt(page, level);
      await go(page, '#/path');
      const gaps = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.lesson-list .lesson-row')].map((row) => { const en = row.querySelector('.l-en'), meta = row.querySelector('.can-do .bi-en, .meta[dir="ltr"]'); return en && meta ? Math.abs(Math.max(...lines(en).map((x) => x.r)) - Math.max(...lines(meta).map((x) => x.r))) : null; }).filter((x) => x != null); }, LINES);
      assert(gaps.length >= 5 && gaps.every((g) => g < 8), `${level} path title/can-do gaps: ${gaps.map(Math.round)}`);
      await go(page, '#/today');
      const today = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.plan-item')].map((row) => { const en = row.querySelector('.l-en'), can = row.querySelector('.can-do .bi-en') || row.querySelector('[lang="en"][dir="ltr"]:not(.l-en, bdi)'); return en && can ? Math.abs(Math.max(...lines(en).map((x) => x.r)) - Math.max(...lines(can).map((x) => x.r))) : null; }).filter((x) => x != null); }, LINES);
      assert(today.length >= 1 && today.every((g) => g < 8), `${level} today title/can-do gaps: ${today.map(Math.round)}`);
      await ctx.close();
    }
  });

  await check('BL-4b. #/lesson/b2-01 examples are left-aligned whatever their length (390 and 1440)', async () => {
    for (const w of [390, 1440]) {
      const { ctx, page } = await newPage(browser, { w, h: 900 });
      await learnerAt(page, 'B2');
      await go(page, '#/lesson/b2-01');
      await page.click('[data-go="learn"]');
      await page.waitForSelector('.lesson-learn');
      // The examples have their own learn step(s) (LF-2): collect the lines from every step.
      const lefts = (await eachLearnStep(page, (p) => p.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('.lesson-learn .example')].flatMap((c) => lines(c.querySelector('.l-en')).map((x) => Math.round(x.l - c.getBoundingClientRect().left))); }, LINES))).flat();
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

  // The shared-edge rule at A2 and above, where the English leads (BL-4 with BL-3), and in the SC-7 verdict footer.
  // SB-1 (round 4) changed the instruction half of this check to the role rule: bi() meta-text is a left-to-right
  // block at every length, so a one-line instruction starts at the column's left edge like a two-line one.
  await check('BL-4d. At 1440 (A2): a one-line exercise instruction is a left-aligned block (role rule, SB-1); in the verdict, a one-line answer and the fix list sit under their Hebrew label, not beside the keys', async () => {
    const { ctx, page } = await newPage(browser, { w: 1440, h: 900 });
    await learnerAt(page, 'A2');
    const openAt = async (id, eid) => {
      await page.evaluate(async ({ id, eid }) => {
        const l = await (await fetch(`content/lessons/${id}.json`)).json();
        window.lucid.store.put('progress', { id, level: l.level, status: 'started', resume: { qi: l.exercises.findIndex((e) => e.id === eid), queue: l.exercises.map((e) => [e.id, false]), first: [] } });
      }, { id, eid });
      await go(page, `#/lesson/${id}?resume=1`);
      await page.waitForSelector('#exroot > *');
    };
    const right = (sel) => page.$eval(sel, (e) => { const g = document.createRange(); g.selectNodeContents(e); const r = [...g.getClientRects()].filter((x) => x.width); return { r: Math.round(Math.max(...r.map((x) => x.right))), l: Math.round(Math.min(...r.map((x) => x.left))), lines: new Set(r.map((x) => Math.round(x.bottom))).size }; });
    await openAt('a2-05', 'e1');
    const en = await right('#exroot .ex-prompt .bi-en');
    const col = await page.$eval('#exroot .ex-prompt .bi-en', (e) => ({ l: Math.round(e.getBoundingClientRect().left), align: getComputedStyle(e).textAlign }));
    assert(en.lines === 1 && Math.abs(en.l - col.l) < 4 && col.align === 'left', `the one-line instruction is not a left-aligned block: en ${JSON.stringify(en)}, block ${JSON.stringify(col)}`);
    await openAt('a2-05', 'e10');
    await page.fill('#exroot textarea', 'Yesterday Omer gets up at seven and has breakfast with his dad.');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-show-answer]');
    await page.click('[data-show-answer]');
    await page.waitForSelector('[data-next]');
    const label = await page.evaluate(() => { const p = [...document.querySelectorAll('#pfoot .verdict-body p')].find((x) => /התשובה הנכונה/.test(x.textContent)); const g = document.createRange(); g.setStart(p.firstChild, 0); g.setEnd(p.firstChild, p.firstChild.length); return Math.round(Math.max(...[...g.getClientRects()].map((x) => x.right))); });
    const ans = await right('#pfoot .verdict-body .answer');
    const keys = await page.$eval('#pfoot [data-next]', (b) => Math.round(b.getBoundingClientRect().right));
    assert(ans.lines === 1 && Math.abs(ans.r - label) < 8 && ans.l > keys + 40, `the answer is not under its label: answer ${JSON.stringify(ans)}, label right ${label}, Continue key right ${keys}`);
    await openAt('a2-05', 'e2');
    const n = await page.$$eval('[data-item]', (x) => x.length);
    for (let k = 0; k < n; k++) { await page.click('[data-pool] [data-item]'); await page.click('[data-bin] > .label'); }
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('#pfoot .fix-list');
    const list = await page.$eval('#pfoot .fix-list', (u) => ({ r: Math.round(u.getBoundingClientRect().right), body: Math.round(u.closest('.verdict-body').getBoundingClientRect().right), l: Math.round(Math.min(...[...u.querySelectorAll('li')].map((li) => li.getBoundingClientRect().left))) }));
    const k2 = await page.$eval('#pfoot [data-next]', (b) => Math.round(b.getBoundingClientRect().right));
    assert(Math.abs(list.r - list.body) < 4 && list.l > k2 + 40, `the fix list is not at the Hebrew edge: ${JSON.stringify(list)}, Continue key right ${k2}`);
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
