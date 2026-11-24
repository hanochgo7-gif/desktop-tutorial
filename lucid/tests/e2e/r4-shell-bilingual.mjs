// Browser checks for the round-4 lane "shell-bilingual" (SB-1 to SB-11; the isolation rules of SB-2, SB-3 and SB-4
// also have unit tests in tests/unit/i18n.test.mjs, SB-6's column rule in tests/unit/shell-r4.test.mjs, and SB-7's
// glossary check in tests/unit/copy.test.mjs).
// Serves lucid/ on port 9753 (R4_PORT), drives Chromium through Playwright, prints one line per check and exits 1 on
// any failure. Usage: node tests/e2e/r4-shell-bilingual.mjs [--only <substring>] [--shots <dir>]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const app = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.R4_PORT) || 9753;
const BASE = `http://127.0.0.1:${PORT}/`;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const ONLY = arg('--only');
const SHOTS = arg('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);

// A phone is 390x844 with touch; a desktop is 1440x900 with a mouse. bypassCSP only so axe can be injected (SB-5).
async function newPage(browser, { w = 390, h = 844, touch = w < 1000, dark = false, locale = 'he-IL' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce', locale, colorScheme: dark ? 'dark' : 'light', serviceWorkers: 'block', bypassCSP: true });
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
// A lesson opened at one exercise (or at its end screen with exId null), through the saved place.
async function lessonAt(page, lessonId, exId) {
  await page.evaluate(async ({ lessonId, exId }) => {
    const l = await (await fetch(`content/lessons/${lessonId}.json`)).json();
    const ids = l.exercises.map((e) => e.id);
    const qi = exId ? ids.indexOf(exId) : ids.length;
    const scored = l.exercises.filter((e) => !['speak', 'write'].includes(e.type)).map((e) => e.id);
    window.lucid.store.put('progress', { id: lessonId, level: l.level, status: 'started', resume: { qi, queue: ids.map((x) => [x, false]), first: scored.filter((x) => ids.indexOf(x) < qi).map((x) => [x, 1]) } });
  }, { lessonId, exId });
  await page.goto(`${BASE}#/lesson/${lessonId}?resume=1&t=${Date.now()}`);
  await page.waitForSelector(exId ? '#exroot > *' : '.player h1');
  await page.waitForTimeout(300);
}
// The line boxes of an element's text: [{ l, r, top }], one per visual line, top to bottom.
const LINES = `(e) => { const g = document.createRange(); g.selectNodeContents(e); const rows = {}; for (const x of g.getClientRects()) { if (!x.width) continue; const k = Math.round(x.bottom); rows[k] = rows[k] ? { l: Math.min(rows[k].l, x.left), r: Math.max(rows[k].r, x.right), top: x.top } : { l: x.left, r: x.right, top: x.top }; } return Object.values(rows).sort((a, b) => a.top - b.top); }`;
// The text of each visual line of an element, read left to right on the screen.
const LINE_TEXT = `(el) => { const rows = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) { for (let i = 0; i < n.length; i++) { const g = document.createRange(); g.setStart(n, i); g.setEnd(n, i + 1); const r = g.getClientRects()[0]; if (!r || !r.width) continue; const k = Math.round(r.top + r.height / 2); let row = rows.find((x) => Math.abs(x.y - k) < 6); if (!row) rows.push(row = { y: k, c: [] }); row.c.push({ x: r.left, ch: n.data[i] }); } } return rows.sort((a, b) => a.y - b.y).map((r) => r.c.sort((a, b) => a.x - b.x).map((c) => c.ch).join('')); }`;
// WCAG contrast in the page: any CSS colour (oklch, color-mix) is drawn on a canvas and read back as sRGB.
const CONTRAST_FN = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const c = cv.getContext('2d', { willReadFrequently: true });
  const rgb = (col) => { c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = col; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; };
  const lum = (col) => { const [r, g, b] = rgb(col).slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  return { ratio };
})()`;

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: app, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ } await sleep(100); }
  browser = await chromium.launch();

  // ---------- SB-1 ----------
  // In each card, the first lines of the English meta-text blocks start at one x, whatever their line count.
  const englishStarts = (page) => page.evaluate((js) => {
    const lines = eval(js);
    const cards = new Map();
    for (const e of document.querySelectorAll('#view .bi-en')) {
      if (e.hidden || !e.getClientRects().length) continue;
      const L = lines(e);
      if (!L.length) continue;
      const card = e.closest('.panel, .ex-prompt, .player-body') || document.body;
      if (!cards.has(card)) cards.set(card, []);
      cards.get(card).push({ x: Math.round(L[0].l), n: L.length, align: getComputedStyle(e).textAlign, t: e.textContent.slice(0, 24) });
    }
    return [...cards.values()];
  }, LINES);
  await check('SB-1. #/lesson/b2-02 and #/lesson/a1-03 at 1440 and 390: English meta-text starts at one x in each card, one line or several; none is right-aligned; the title still ends at the Hebrew edge', async () => {
    for (const w of [1440, 390]) {
      for (const [level, id] of [['B2', 'b2-02'], ['A1', 'a1-03']]) {
        const { ctx, page } = await newPage(browser, { w, h: 900 });
        await learnerAt(page, level);
        await go(page, `#/lesson/${id}`);
        const intro = await englishStarts(page);
        const title = await page.evaluate((js) => { const lines = eval(js); const h = document.querySelector('.player h1 .legend, .player .legend'); if (!h) return null; const en = lines(h.querySelector('.l-en')), he = h.querySelector('.l-he') ? lines(h.querySelector('.l-he')) : null; return he ? Math.abs(Math.max(...en.map((x) => x.r)) - Math.max(...he.map((x) => x.r))) : 0; }, LINES);
        await shot(page, `sb1-${id}-${w}`);
        await page.click('[data-skip-learn]');
        await page.waitForSelector('#exroot .ex-prompt');
        const first = await englishStarts(page);
        await ctx.close();
        const all = [...intro, ...first];
        assert(intro.flat().length >= 3, `${id} at ${w}: only ${intro.flat().length} English blocks on the intro`);
        assert(all.flat().every((b) => b.align !== 'right'), `${id} at ${w}: a right-aligned English block: ${JSON.stringify(all.flat().filter((b) => b.align === 'right'))}`);
        for (const card of all) { const xs = card.map((b) => b.x); assert(Math.max(...xs) - Math.min(...xs) <= 4, `${id} at ${w}: English blocks in one card start at ${JSON.stringify(card)}`); }
        assert(title != null && title <= 8, `${id} at ${w}: the English title does not end at the Hebrew edge (${title}px)`);
      }
    }
  });

  // ---------- SB-2 ----------
  await check('SB-2. #/lesson/a1-01 end screen at 390/150%: no line of a key point starts with a full stop before English', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1', { text: 150 });
    await lessonAt(page, 'a1-01', null);
    const lines = await page.evaluate((js) => { const f = eval(js); return [...document.querySelectorAll('.point .bi-he, .point .bi-en')].filter((e) => !e.hidden).map((e) => f(e)); }, LINE_TEXT);
    await page.locator('.point-list').first().scrollIntoViewIfNeeded();
    await shot(page, 'sb2-a1-01-end');
    await ctx.close();
    assert(lines.length >= 3, `key points: ${lines.length}`);
    const bad = lines.flat().filter((l) => /^\s*\.\s*[A-Za-z]/.test(l));
    assert(!bad.length, `a line starts with ".": ${JSON.stringify(bad)}`);
  });

  // ---------- SB-3 ----------
  await check('SB-3. #/lesson/a2-01 after the second-try note, the shown answer at 390/150%: "lie → lying" is on one line, and "ל-" holds only "y"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { text: 150 });
    await lessonAt(page, 'a2-01', 'e6');
    const gaps = await page.$$('#exroot .gap-input');
    await gaps[0].fill('swimming'); await gaps[1].fill('writing'); await gaps[2].fill('lieing');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-try-again]');
    await page.waitForTimeout(200);
    // LF-2: the second-try note never gives the answer; the note with "lying" comes with the shown answer.
    assert(!(await page.textContent('#pfoot')).includes('lying'), 'the second-try note gives away "lying" (LF-2)');
    await page.click('[data-show-answer]');
    await page.waitForTimeout(200);
    const r = await page.evaluate((js) => {
      const f = eval(js);
      const he = [...document.querySelectorAll('#pfoot .bi-he')].find((e) => e.textContent.includes('lying'));
      if (!he) return null;
      const lines = f(he);
      return { lines, bdis: [...he.querySelectorAll('bdi')].map((b) => b.textContent) };
    }, LINE_TEXT);
    await shot(page, 'sb3-a2-01-second-try');
    await ctx.close();
    assert(r, 'no Hebrew note with "lying" in the second-try footer');
    assert(r.lines.some((l) => l.includes('lie → lying')), `"lie → lying" breaks across lines: ${JSON.stringify(r.lines)}`);
    assert(r.bdis.includes('y') && r.bdis.some((b) => /^lie → lying\.?$/.test(b)), `the prefix isolate is greedy: ${JSON.stringify(r.bdis)}`);
  });

  // ---------- SB-4 ----------
  await check('SB-4. English UI: at B2 (minimal) #/today and #/path show no Hebrew subtitles; at A2 (partial) a subtitle starts at its title\'s edge', async () => {
    {
      const { ctx, page } = await newPage(browser, { w: 1440, h: 900, locale: 'en-US' });
      await learnerAt(page, 'B2', { lang: 'en' });
      for (const route of ['#/today', '#/path']) {
        await go(page, route);
        const n = await page.$$eval('#view .legend .l-he', (xs) => xs.filter((x) => x.getClientRects().length && getComputedStyle(x).display !== 'none').length);
        const support = await page.evaluate(() => document.documentElement.dataset.support);
        assert(support === 'minimal' && n === 0, `${route} (${support}) shows ${n} Hebrew subtitles`);
      }
      await shot(page, 'sb4-en-b2-path');
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, { w: 1440, h: 900, locale: 'en-US' });
      await learnerAt(page, 'A2', { lang: 'en' });
      for (const route of ['#/today', '#/path']) {
        await go(page, route);
        const gaps = await page.evaluate((js) => { const lines = eval(js); return [...document.querySelectorAll('#view .legend')].map((g) => { const he = g.querySelector('.l-he'), en = g.querySelector('.l-en'); if (!he || !he.getClientRects().length) return null; return Math.round(Math.min(...lines(he).map((x) => x.l)) - Math.min(...lines(en).map((x) => x.l))); }).filter((x) => x != null); }, LINES);
        assert(gaps.length && gaps.every((g) => Math.abs(g) <= 4), `${route}: Hebrew subtitles start ${JSON.stringify(gaps)}px from their titles`);
      }
      await ctx.close();
    }
  });

  // ---------- SB-5 ----------
  await check('SB-5. Scenario feedback at 100%: every Hebrew line is at least 14px and at least its English; colour contrast passes in dark mode', async () => {
    for (const dark of [false, true]) {
      const { ctx, page } = await newPage(browser, { dark });
      await learnerAt(page, 'A2');
      await go(page, '#/scenario/rl-hotel-towels-late-checkout?tab=practise');
      await page.locator('#view .option').nth(1).click();
      await page.click('.scenario-foot .key.enter, [data-check]');
      await page.waitForTimeout(500);
      const sizes = await page.evaluate(() => [...document.querySelectorAll('#view .bi-he')].filter((e) => !e.hidden && e.getClientRects().length).map((e) => { const en = e.parentElement.querySelector(':scope > .bi-en'); return { he: parseFloat(getComputedStyle(e).fontSize), en: en ? parseFloat(getComputedStyle(en).fontSize) : 0 }; }));
      assert(sizes.length >= 2, `only ${sizes.length} Hebrew lines in the feedback`);
      assert(sizes.every((s) => s.he >= 14 && s.he >= s.en), `Hebrew under English is smaller: ${JSON.stringify(sizes)}`);
      if (dark) {
        await page.addScriptTag({ content: axeSource });
        const v = await page.evaluate(async () => (await window.axe.run('#view', { runOnly: { type: 'rule', values: ['color-contrast'] } })).violations.flatMap((x) => x.nodes.map((n) => n.target.join(' '))));
        assert(!v.length, `colour contrast in dark mode: ${v.slice(0, 4).join(', ')}`);
        await shot(page, 'sb5-scenario-dark');
      }
      await ctx.close();
    }
  });

  // ---------- SB-6 ----------
  const segs = (page) => page.evaluate((fn) => {
    const C = eval(fn);
    return [...document.querySelectorAll('#view .seg')].filter((s) => s.getClientRects().length).map((s) => {
      const keys = [...s.querySelectorAll(':scope > button')];
      const on = keys.find((b) => b.getAttribute('aria-pressed') === 'true');
      const rows = [...new Set(keys.map((b) => Math.round(b.getBoundingClientRect().top)))];
      return {
        clipped: keys.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim()),
        rows: rows.length, widths: keys.map((b) => Math.round(b.getBoundingClientRect().width)),
        edge: on ? C.ratio(getComputedStyle(on).borderTopColor, getComputedStyle(s).backgroundColor) : null,
        edgeWidth: on ? parseFloat(getComputedStyle(on).borderTopWidth) : 0,
      };
    });
  }, CONTRAST_FN);
  await check('SB-6. Segmented controls at 390/150% (#/progress, #/vocab): no label is cut, and a wrapped control is a grid of equal cells; in dark mode the selected segment has an edge of 3:1 on its track; the dark deck stands 1.5:1 off the ground', async () => {
    {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'A2', { text: 150 });
      await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const { content } = await import('./js/core/content.js'); L.addVocabCards(await content.lesson('a1-01')); });
      for (const route of ['#/progress', '#/vocab']) {
        await go(page, route);
        const list = await segs(page);
        assert(list.length, `${route}: no segmented control`);
        for (const s of list) {
          assert(!s.clipped.length, `${route}: cut labels ${JSON.stringify(s.clipped)}`);
          if (s.rows > 1) assert(Math.max(...s.widths) - Math.min(...s.widths) <= 1, `${route}: a wrapped control has unequal cells ${JSON.stringify(s.widths)}`);
        }
        await shot(page, `sb6-${route.slice(2)}-390-150`);
      }
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, { w: 1440, h: 900, dark: true });
      await learnerAt(page, 'A2');
      await go(page, '#/progress');
      const [s] = await segs(page);
      assert(s && s.edgeWidth >= 1 && s.edge >= 3, `the selected segment's edge in dark mode: ${JSON.stringify(s)}`);
      const deck = await page.evaluate((fn) => { const C = eval(fn); const d = document.querySelector('.deck'), a = d.querySelector('a[aria-current="page"]'); return { ground: C.ratio(getComputedStyle(d).backgroundColor, getComputedStyle(document.body).backgroundColor), pill: C.ratio(getComputedStyle(a).backgroundColor, getComputedStyle(d).backgroundColor) }; }, CONTRAST_FN);
      assert(deck.ground >= 1.5 && deck.pill >= 1.5, `the dark deck: ${JSON.stringify(deck)}`);
      await shot(page, 'sb6-progress-dark-1440');
      await ctx.close();
    }
  });

  // ---------- SB-7 ----------
  await check('SB-7. The short tab label is "מהחיים" at 390/130%; at 150% the top-bar title has one size on Today, Writing lab and Real life (320 and 390, Hebrew and English)', async () => {
    {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'A1', { text: 130 });
      await go(page, '#/today');
      const tabs = await page.$$eval('#tabbar .tab-l', (ls) => ls.filter((l) => getComputedStyle(l).display !== 'none').map((l) => l.textContent));
      assert(tabs.includes('מהחיים') && !tabs.includes('לחיים'), `tab labels: ${tabs}`);
      await ctx.close();
    }
    for (const [w, lang] of [[320, 'he'], [390, 'he'], [390, 'en']]) {
      const { ctx, page } = await newPage(browser, { w, locale: lang === 'en' ? 'en-US' : 'he-IL' });
      await learnerAt(page, 'A1', { text: 150, lang });
      const sizes = [];
      for (const route of ['#/today', '#/writing', '#/real-life']) {
        await go(page, route);
        sizes.push(await page.$eval('#top-title', (t) => `${t.textContent}:${getComputedStyle(t).fontSize}`));
      }
      await ctx.close();
      assert(new Set(sizes.map((x) => x.split(':')[1])).size === 1, `${w} ${lang}: top-bar title sizes ${sizes.join(', ')}`);
    }
  });

  // ---------- SB-8 ----------
  await check('SB-8. Desktop rail at 1440x900: all 12 links (13 with AI: the tutor, launch FR-03) are above Help and Settings; at 130% the list fades at the bottom while it scrolls', async () => {
    const { ctx, page } = await newPage(browser, { w: 1440, h: 900 });
    await learnerAt(page, 'A1');
    await go(page, '#/today');
    const rail = () => page.evaluate(() => {
      const nav = document.querySelector('.deck nav'), foot = document.querySelector('.deck .foot').getBoundingClientRect();
      const links = [...nav.querySelectorAll('a.nav')];
      const after = getComputedStyle(nav, '::after');
      return { n: links.length, shown: links.filter((a) => a.getBoundingClientRect().bottom <= Math.min(foot.top, nav.getBoundingClientRect().bottom) + 0.5).length, scrolls: nav.classList.contains('scrolls'), fade: after.content !== 'none' && parseFloat(after.height) > 10 && /gradient/.test(after.backgroundImage) };
    });
    const a = await rail();
    assert(a.n === 12 && a.shown === 12, `at 1440x900 ${a.shown} of ${a.n} links are in view`);
    await shot(page, 'sb8-rail-1440x900');
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.saveSettings({ text_size: 130 }); });
    await page.waitForTimeout(500);
    const b = await rail();
    assert(b.shown === b.n || (b.scrolls && b.fade), `at 130% the rail hides links with no cue: ${JSON.stringify(b)}`);
    await shot(page, 'sb8-rail-1440x900-130');
    await ctx.close();
  });

  // ---------- SB-9 ----------
  await check('SB-9. With no English voice: the "can\'t hear" note ends with the placement\'s last listening item; in #/lesson/pa1-02 e1 it never covers the "לאט" key (or is not shown, with EX-4)', async () => {
    {
      const { ctx, page } = await newPage(browser);
      // Every placement item is a listening item, so the item before the result is one.
      await page.route('**/content/placement.json*', async (route) => {
        const res = await route.fetch();
        const bank = await res.json();
        bank.items = bank.items.map((i) => (i.type === 'listen' ? i : { ...i, type: 'listen', skill: 'listening', audio_text: i.question || 'Hello there.' }));
        await route.fulfill({ response: res, json: bank });
      });
      await learnerAt(page, 'A1');
      assert(await page.evaluate(() => speechSynthesis.getVoices().length) === 0, 'this browser has voices; the check needs none');
      // The test is deterministic for the same answers: count its items once, then play only the last one.
      const run = async (playAt) => {
        await page.goto(`${BASE}#/placement?restart=1&t=${Date.now()}`);
        await page.waitForSelector('[data-begin]');
        await page.tap('[data-begin]');
        for (let n = 1; n < 40; n++) {
          await page.waitForSelector('[data-idk], .onboard .key.enter[href="#/today"], .onboard a.key.enter');
          if (!(await page.$('[data-idk]'))) return n - 1;
          if (n === playAt) {
            // EX-4: a listen item says so in place and gets no toast; take the mark off to stand for a play key outside a listen item.
            if (await page.$('#exroot[data-silent-inline]')) {
              await page.tap('#exroot [data-say="normal"]');
              await page.waitForSelector('#exroot .silent-note', { timeout: 2500 });
              assert(!(await page.$('#toast-root .toast')), 'a toast on a listen item that says so in place');
              await page.evaluate(() => document.querySelector('#exroot').removeAttribute('data-silent-inline'));
              await page.waitForTimeout(4100);
            }
            await page.tap('#exroot [data-say="normal"]');
            await page.waitForSelector('#toast-root .toast', { timeout: 2500 });
          }
          await page.tap('[data-idk]');
          await page.waitForTimeout(60);
        }
        return 40;
      };
      const items = await run(0);
      assert(items > 3 && items < 40, `the placement asked ${items} items`);
      assert(await run(items) === items, 'the placement asked a different number of items the second time');
      const t0 = Date.now();
      const gone = await page.waitForFunction(() => !document.querySelector('#toast-root .toast'), null, { timeout: 500 }).then(() => true, () => false);
      await shot(page, 'sb9-placement-result');
      assert(gone, `the note still covers the result after ${Date.now() - t0} ms: "${await page.textContent('#toast-root')}"`);
      await ctx.close();
    }
    for (const text of [100, 150]) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'PreA1', { text });
      await lessonAt(page, 'pa1-02', 'e1');
      const inline = await page.$('#exroot[data-silent-inline], #exroot [data-silent-inline]');
      await page.tap('#exroot [data-say="normal"]');
      if (inline) {
        await page.waitForTimeout(1500);
        assert(!(await page.$('#toast-root .toast')), 'a note appears on an item that says so in place (EX-4)');
      } else {
        await page.waitForSelector('#toast-root .toast', { timeout: 2500 });
        const r = await page.evaluate(() => { const a = document.querySelector('#toast-root .toast').getBoundingClientRect(); const out = {}; for (const k of ['normal', 'slow']) { const b = document.querySelector(`#exroot [data-say="${k}"]`).getBoundingClientRect(); out[k] = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; } out.text = document.querySelector('#toast-root .toast').textContent; return out; });
        assert(!r.slow && !r.normal, `at ${text}% the note covers a play key: ${JSON.stringify(r)}`);
        assert(r.text === 'לא שומעים? בדקו את עוצמת הקול ומצב שקט.', `the note reads "${r.text}"`);
      }
      await shot(page, `sb9-pa1-02-${text}`);
      await ctx.close();
    }
  });

  // ---------- SB-10 ----------
  await check('SB-10. #/help on a phone: the mistakes answer mentions the second try, the AI answer matches the AI-off state, and "מדיניות הפרטיות" and "הצהרת נגישות" are 44px tall (launch BLK-02, BLK-07)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await go(page, '#/help');
    const r = await page.evaluate(() => {
      const ans = (q) => [...document.querySelectorAll('#view details')].find((d) => d.querySelector('summary').textContent.includes(q))?.querySelector('p')?.textContent || '';
      const h = (name) => { const a = [...document.querySelectorAll('#view .help-foot a')].find((x) => x.textContent.trim() === name); return a ? a.getBoundingClientRect().height : 0; };
      return { mistakes: ans('טעיתי'), ai: ans('משוב AI'), page: document.querySelector('#view').textContent, link: h('מדיניות הפרטיות'), a11y: h('הצהרת נגישות') };
    });
    await ctx.close();
    assert(r.mistakes.includes('לנסות שוב'), `the mistakes answer: ${r.mistakes}`);
    assert(!r.page.includes('והסכמה בהגדרות') && r.ai.startsWith('AI לא פעיל באתר הזה. כל השאר עובד'), `the AI answer: ${r.ai}`);
    assert(r.link >= 44, `"מדיניות הפרטיות" is ${r.link}px tall`);
    assert(r.a11y >= 44, `"הצהרת נגישות" is ${r.a11y}px tall`);
  });

  // ---------- SB-11 ----------
  await check('SB-11. The skip link speaks the interface language: "Skip to content" with lang="en" in the English UI, "דילוג לתוכן" with lang="he" in Hebrew', async () => {
    for (const [lang, text] of [['en', 'Skip to content'], ['he', 'דילוג לתוכן']]) {
      const { ctx, page } = await newPage(browser, { w: 1440, h: 900, locale: lang === 'en' ? 'en-US' : 'he-IL' });
      await learnerAt(page, 'A2', { lang });
      await go(page, '#/today');
      const s = await page.$eval('a.skip', (a) => ({ text: a.textContent, lang: a.lang, dir: a.dir }));
      await ctx.close();
      assert(s.text === text && s.lang === lang && s.dir === (lang === 'he' ? 'rtl' : 'ltr'), `${lang} UI: ${JSON.stringify(s)}`);
    }
  });
} finally {
  await browser?.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 10).join('\n  ')}`);
process.exit(failed.length ? 1 : 0);
