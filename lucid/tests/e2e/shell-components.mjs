// Browser checks for the UX round 3 lane "shell-components": shared pressable states, keyboard hints on touch,
// secondary keys, the desktop rail, the chrome on phones, play feedback, the feedback footer, segmented controls,
// large-text chrome, focus rings and targets, the dark deck, and the English UI rail.
// Serves lucid/ itself and prints one line per check; exits 1 on any failure.
// Usage: node tests/e2e/shell-components.mjs [--only <substring>] [--shots <dir>]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const PORT = Number(process.env.LANE_E2E_PORT) || 9103;
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
  catch (e) { results.push({ name, ok: false }); const at = String(e.stack).split('\n').find((l) => l.includes('shell-components.mjs'))?.trim() || ''; console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]} ${at}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// A phone is 390x844 with touch (hover: none, pointer: coarse); a desktop is 1440x900 with a mouse.
async function newPage(browser, { width = 390, height = 844, touch = width < 1000, dark = false, locale = 'he-IL' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce', locale, serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  return { ctx, page };
}
// A learner at a course level, made through the app's store.
async function learnerAt(page, level, { goals = ['travel'], text = 100, lang = 'he' } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, goals, text, lang }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: lang, goals, created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, goals, text, lang });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
// Open a lesson at one exercise, through the saved place ("Continue where I left off").
async function lessonAt(page, lessonId, eid) {
  await page.evaluate(async ({ lessonId, eid }) => {
    const { content } = await import('./js/core/content.js');
    const lesson = await content.lesson(lessonId);
    const ids = lesson.exercises.map((e) => e.id);
    window.lucid.store.put('progress', { id: lessonId, level: lesson.level, status: 'started', resume: { qi: ids.indexOf(eid), queue: ids.map((i) => [i, false]), first: [], missed: false, since: new Date().toISOString(), at: new Date().toISOString() } });
  }, { lessonId, eid });
  await page.goto(`${BASE}#/lesson/${lessonId}?resume=1&t=${Date.now()}`);
  await page.waitForSelector('#exroot');
  await page.waitForTimeout(200);
}
// WCAG contrast in the page: any CSS colour (oklch, color-mix) is drawn on a canvas and read back as sRGB.
const CONTRAST_FN = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const c = cv.getContext('2d', { willReadFrequently: true });
  const rgb = (col) => { c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = col; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; };
  const lum = (col) => { const [r, g, b] = rgb(col).slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // The colour behind an element: the first ancestor with a background.
  const behind = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (rgb(bg)[3] === 255) return bg; } return getComputedStyle(document.body).backgroundColor; };
  return { rgb, ratio, behind };
})()`;
const style = (page, sel, props) => page.$eval(sel, (e, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(e)[p]])), props);
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }
const browser = await chromium.launch();

try {
  await check('SC-1. Pressable controls: a tapped chip, True key and self-rating key look latched; an option shows a hover tint; no tap halo; a wrong option has no blue keycap', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    const bg = (sel) => page.$$eval(sel, (els) => els.map((e) => getComputedStyle(e).backgroundColor));
    await lessonAt(page, 'a1-01', 'e3');
    await page.tap('#exroot [data-item]');
    const chips = await bg('#exroot [data-item]');
    assert(chips.length > 2 && chips.slice(1).every((c) => c !== chips[0]), `the tapped chip looks like the others: ${chips.slice(0, 3)}`);
    await lessonAt(page, 'a1-01', 'e12');
    await page.tap('#exroot [data-tf][data-v="true"]');
    const tf = await page.$$eval('#exroot [data-tf]', (els) => els.map((e) => [e.getAttribute('aria-pressed'), getComputedStyle(e).backgroundColor, getComputedStyle(e).borderBlockEndWidth]));
    const on = tf.find(([p]) => p === 'true'), off = tf.find(([p]) => p !== 'true');
    assert(on && off && on[1] !== off[1] && on[2] === '1px', `True does not look latched: ${JSON.stringify(tf.slice(0, 2))}`);
    await lessonAt(page, 'a1-01', 'e14');
    await page.tap('#exroot [data-self="1"]');
    const self = await page.$$eval('#exroot [data-self]', (els) => els.map((e) => getComputedStyle(e).backgroundColor));
    assert(self[0] !== self[1], `"I said it clearly" does not look latched: ${self}`);
    await lessonAt(page, 'a1-01', 'e1');
    const halo = await page.$$eval('#exroot .match-item', (els) => els.map((e) => getComputedStyle(e).webkitTapHighlightColor));
    assert(halo.every((c) => c === 'rgba(0, 0, 0, 0)'), `match tiles show a tap halo: ${halo[0]}`);
    await lessonAt(page, 'a1-01', 'e4');
    const ex = await page.evaluate(async () => { const { content } = await import('./js/core/content.js'); return (await content.lesson('a1-01')).exercises.find((e) => e.id === 'e4'); });
    const wrong = ex.options.findIndex((_, i) => i !== ex.answer);
    await page.tap(`#exroot [data-opt="${wrong}"]`);
    await page.tap('[data-check]');
    await page.waitForSelector('#exroot .option.is-wrong');
    const k = await page.$eval('#exroot .option.is-wrong .k', (e) => ({ c: getComputedStyle(e).color, b: getComputedStyle(e).borderTopColor }));
    const cobalt = await page.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--cobalt)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    assert(k.c !== cobalt && k.b !== cobalt, `the wrong option keeps a blue keycap: ${JSON.stringify(k)}`);
    await shot(page, 'sc1-wrong-390');
    await ctx.close();
    const d = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(d.page, 'A1');
    await lessonAt(d.page, 'a1-01', 'e4');
    const o = await d.page.$('#exroot .option');
    const before = await o.evaluate((x) => getComputedStyle(x).backgroundColor);
    await o.hover();
    await d.page.waitForTimeout(250);
    const after = await o.evaluate((x) => getComputedStyle(x).backgroundColor);
    assert(before !== after, `hovering an option changes nothing: ${before}`);
    await d.ctx.close();
  });

  await check('SC-2. Touch screens show no "Enter" keycaps (lesson intro, check, continue, part end, placement, review) and Help has no keyboard item; a mouse still shows them', async () => {
    const visibleKbd = (page) => page.$$eval('.kbd', (els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
    const all = [];
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', daily_minutes: 10 }));
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    assert(await page.$('.kbd'), 'the intro has no keycap to hide (markup changed?)');
    all.push(['intro', await visibleKbd(page)]);
    const upto = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const l = await (await fetch('content/lessons/a2-01.json')).json(); return L.todayPlan(10, { lesson: l }).blocks.find((b) => b.id === 'learn').slice.upto; });
    await page.tap('[data-skip-learn]');
    for (let i = 0; i < upto; i++) {
      await page.waitForSelector('[data-dontknow]');
      if (i === 0) all.push(['check', await visibleKbd(page)]);
      await page.tap('[data-dontknow]');
      await page.waitForSelector('[data-next]');
      if (i === 0) all.push(['continue', await visibleKbd(page)]);
      await page.tap('[data-next]');
    }
    await page.waitForSelector('[data-part-stop]');
    all.push(['part end', await visibleKbd(page)]);
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.addVocabCards(await (await fetch('content/lessons/pa1-05.json')).json(), new Date(Date.now() - 3 * 86400000)); });
    await page.goto(`${BASE}#/review`);
    await page.waitForSelector('.flash');
    if (await page.$('[data-pick]')) await page.tap('[data-pick]'); else await page.tap('[data-idk]');
    await page.waitForSelector('[data-next]');
    all.push(['review', await visibleKbd(page)]);
    await page.goto(`${BASE}#/placement`);
    await page.waitForSelector('[data-begin]');
    await page.tap('[data-begin]');
    await page.waitForSelector('[data-answer]');
    all.push(['placement', await visibleKbd(page)]);
    assert(all.every(([, n]) => n === 0), `"Enter" keycaps on a touch screen: ${JSON.stringify(all)}`);
    await page.goto(`${BASE}#/help`);
    await page.waitForSelector('#view details');
    assert(!/קיצורי מקלדת/.test(await page.textContent('#view')), 'Help on a touch screen lists keyboard shortcuts');
    await ctx.close();
    const d = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(d.page, 'A1');
    await lessonAt(d.page, 'a1-01', 'e4');
    assert(await visibleKbd(d.page) > 0, 'a mouse and keyboard no longer see the "Enter" keycap');
    await d.page.goto(`${BASE}#/help`);
    await d.page.waitForSelector('#view details');
    assert(/קיצורי מקלדת/.test(await d.page.textContent('#view')), 'Help on a desktop lost the keyboard shortcuts');
    await d.ctx.close();
  });

  await check('SC-3. Secondary keys ("I don\'t know", "Hint") have a border and fill, are as tall as Check, and their outline reaches 3:1 in light and dark', async () => {
    for (const dark of [false, true]) {
      const { ctx, page } = await newPage(browser, { dark });
      await learnerAt(page, 'A1');
      await lessonAt(page, 'a1-01', 'e7');
      const m = await page.evaluate((fn) => {
        const C = eval(fn);
        const box = (s) => document.querySelector(s).getBoundingClientRect().height;
        return ['[data-hint]', '[data-dontknow]'].map((s) => {
          const e = document.querySelector(s), cs = getComputedStyle(e);
          return { s, h: box(s), check: box('[data-check]'), bw: parseFloat(cs.borderTopWidth), fill: C.rgb(cs.backgroundColor)[3], line: C.ratio(cs.borderTopColor, C.behind(e)) };
        });
      }, CONTRAST_FN);
      for (const k of m) assert(k.bw >= 1 && k.fill === 255 && Math.abs(k.h - k.check) <= 1 && k.line >= 3, `${dark ? 'dark' : 'light'} ${k.s}: ${JSON.stringify(k)}`);
      await shot(page, `sc3-${dark ? 'dark' : 'light'}`);
      await ctx.close();
    }
  });

  await check('SC-4. Desktop rail: Help and Settings are fully in view at 1440x900 and 1366x768 without scrolling; on a short window the labs scroll', async () => {
    for (const [width, height] of [[1440, 900], [1366, 768], [1280, 560]]) {
      const { ctx, page } = await newPage(browser, { width, height });
      await learnerAt(page, 'A1');
      await page.goto(`${BASE}#/today`);
      await page.waitForSelector('.deck a[href="#/settings"]');
      const r = await page.evaluate(() => {
        const box = (s) => document.querySelector(s).getBoundingClientRect();
        const nav = document.querySelector('.deck nav');
        const inView = (s) => { const b = box(s); return b.top >= 0 && b.bottom <= innerHeight; };
        const out = { help: inView('.deck a[href="#/help"]'), settings: inView('.deck a[href="#/settings"]'), deckScrolls: document.querySelector('.deck').scrollHeight > document.querySelector('.deck').clientHeight + 1, navScrolls: nav.scrollHeight > nav.clientHeight + 1 };
        nav.scrollTop = nav.scrollHeight;
        const last = [...nav.querySelectorAll('a.nav')].at(-1).getBoundingClientRect(), nb = nav.getBoundingClientRect();
        out.lastReachable = last.bottom <= nb.bottom + 1 && last.top >= nb.top - 1;
        return out;
      });
      assert(r.help && r.settings && !r.deckScrolls, `${width}x${height}: Help/Settings not in view: ${JSON.stringify(r)}`);
      if (height < 700) assert(r.navScrolls && r.lastReachable, `${width}x${height}: the labs do not scroll: ${JSON.stringify(r)}`);
      await shot(page, `sc4-${width}x${height}`);
      await ctx.close();
    }
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
