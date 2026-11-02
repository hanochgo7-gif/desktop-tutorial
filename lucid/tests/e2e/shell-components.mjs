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
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
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
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
