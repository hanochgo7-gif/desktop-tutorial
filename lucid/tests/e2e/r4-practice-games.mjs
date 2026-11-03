// Browser checks for lane r4-practice-games of the final UX round (docs/qa/panels-r3-retest/plan-r4.json, lane
// "practice-games": PG-1 to PG-15). Serves lucid/ itself, drives Chromium through Playwright and prints one
// PASS/FAIL line per check; exits 1 when any check fails.
// Usage: node tests/e2e/r4-practice-games.mjs [--only <substring>] [--shots <dir>] [--port <n>]
//   (port: --port, R4PG_PORT or LANE_PORT, default 9733)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const PORT = Number(arg('--port') || process.env.R4PG_PORT || process.env.LANE_PORT) || 9733;
const BASE = `http://127.0.0.1:${PORT}/`;
const ONLY = arg('--only');
const SHOTS = arg('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const pics = JSON.parse(readFileSync(join(root, 'content', 'pictures.json'), 'utf8'));
const byHe = new Map(pics.sets.flatMap((s) => s.words).map((w) => [w.he, w.word]));

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${e.message.split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const shot = (page, name, opts = {}) => (SHOTS ? page.screenshot({ path: join(SHOTS, `${name}.png`), ...opts }) : null);

async function newPage(browser, { w = 390, h = 844, touch = false, dark = false, init = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  return { ctx, page };
}
// A learner at a course level (as the main suite makes one), with optional settings.
async function learnerAt(page, level, { text = 100, settings = {} } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, text, settings }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: text, ...settings });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, text, settings });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
const go = async (page, route, sel) => { await page.goto(`${BASE}#/${route}`); if (sel) await page.waitForSelector(sel); await page.waitForTimeout(150); };
const setText = (page, text) => page.evaluate(async (t) => (await import('./js/core/learner.js')).saveSettings({ text_size: t }), text);
const learnerSettings = (page) => page.evaluate(async () => (await import('./js/core/learner.js')).settings());
// The index of the right option in a stage-1 word-quiz question, from the level's lesson words.
const rightOption = (page, level) => page.evaluate(async (level) => {
  const { content } = await import('./js/core/content.js');
  const { wordPool } = await import('./js/core/wordgame.js');
  const cur = await content.curriculum();
  const ids = cur.levels.find((l) => l.id === level).lessons.map((l) => l.id);
  const pool = wordPool((await Promise.all(ids.map((id) => content.lesson(id).catch(() => null)))).filter(Boolean), level);
  const prompt = document.querySelector('.game-word').textContent.trim();
  const w = pool.find((x) => x.word === prompt);
  return [...document.querySelectorAll('[data-opt] .game-opt')].findIndex((o) => o.textContent.trim() === w.meaning);
}, level);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
await sleep(700);
const browser = await chromium.launch();
try {
  // ---------- PG-1 ----------
  await check('PG-1. Settings segments at 390px, text 100/130/150: no label overflows or overlaps, "לפי הרמה" on one line, 3-option groups one row at 100%', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'B1');
    for (const text of [100, 130, 150]) {
      await setText(page, text);
      await go(page, 'settings', '[data-seg="hebrew_support"]');
      await page.waitForFunction((t) => (document.documentElement.dataset.text || "100") === String(t), text);
      await page.waitForTimeout(200);
      const m = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.settings-view .seg button')];
        const over = btns.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => `${b.closest('[data-seg]').dataset.seg}:${b.textContent.trim()} ${b.scrollWidth}>${b.clientWidth}`);
        const rects = btns.map((b) => [b, b.getBoundingClientRect()]);
        const overlaps = [];
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const [a, ra] = rects[i], [b, rb] = rects[j];
          if (ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) overlaps.push(`${a.textContent.trim()} / ${b.textContent.trim()}`);
        }
        const hs = [...document.querySelectorAll('[data-seg="hebrew_support"] button')];
        const auto = hs.find((b) => b.dataset.v === 'auto').getBoundingClientRect().height;
        const others = Math.max(...hs.filter((b) => b.dataset.v !== 'auto').map((b) => b.getBoundingClientRect().height));
        const rowsOf = (name) => new Set([...document.querySelectorAll(`[data-seg="${name}"] button`)].map((b) => Math.round(b.getBoundingClientRect().top))).size;
        const threes = [...document.querySelectorAll('.settings-view [data-seg][data-n="3"]')].map((g) => [g.dataset.seg, rowsOf(g.dataset.seg)]);
        const wide = document.documentElement.scrollWidth - innerWidth;
        return { over, overlaps, auto, others, threes, wide };
      });
      assert(!m.over.length, `${text}%: labels overflow: ${m.over.join(' | ')}`);
      assert(!m.overlaps.length, `${text}%: buttons overlap: ${m.overlaps.join(' | ')}`);
      assert(m.auto <= m.others + 1, `${text}%: "לפי הרמה" wraps (${m.auto} > ${m.others})`);
      assert(m.wide <= 0, `${text}%: the page scrolls sideways by ${m.wide}px`);
      if (text === 100) assert(m.threes.length >= 3 && m.threes.every(([, r]) => r === 1), `100%: 3-option groups wrap: ${JSON.stringify(m.threes)}`);
      await shot(page, `pg1-settings-${text}-390`);
    }
    await ctx.close();
  });
  // ---------- PG-2 ----------
  await check('PG-2. One speed switch, "אתגר מהירות במשחקים", in Settings and on #/games: role=switch, 44px, same help; it advances a right quiz answer only when on', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'A2');
    const read = () => page.evaluate(() => {
      const sw = [...document.querySelectorAll('#view [role="switch"]')];
      return sw.map((s) => { const r = s.getBoundingClientRect(); const ids = (s.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); return { name: s.textContent.replace(/\s+/g, ' ').trim(), label: s.getAttribute('aria-label'), w: r.width, h: r.height, checked: s.getAttribute('aria-checked'), help: ids.map((id) => document.getElementById(id)?.textContent.trim()).join(' ') }; });
    });
    await go(page, 'settings', '[data-seg="text_size"]');
    const inSettings = await read();
    const named = (list) => list.filter((s) => (s.label || s.name) === 'אתגר מהירות במשחקים');
    assert(named(inSettings).length === 1 && inSettings.length === 1, `Settings switches: ${JSON.stringify(inSettings)}`);
    assert(!(await page.$('#view input[type="checkbox"][data-relaxed]')) && !/קצב רגוע/.test(await page.textContent('#view')), 'the old "קצב רגוע" checkbox is still there');
    await go(page, 'games', '.game-levels');
    const inGames = await read();
    assert(named(inGames).length === 1 && inGames.length === 1, `#/games switches: ${JSON.stringify(inGames)}`);
    for (const s of [inSettings[0], inGames[0]]) assert(s.w >= 44 && s.h >= 44 && s.checked === 'false', `switch size or state: ${JSON.stringify(s)}`);
    assert(inSettings[0].help && inSettings[0].help === inGames[0].help && /המשחק מחכה לכם/.test(inGames[0].help), `help lines differ: ${inSettings[0].help} | ${inGames[0].help}`);
    assert(!(await page.$('[data-pace-note]')) && !/קצב רגוע/.test(await page.textContent('#view')), 'the "קצב רגוע כבוי" note is still on #/games');
    await shot(page, 'pg2-games-switch-390');
    // Turned on in Settings, on in #/games.
    await go(page, 'settings', '[role="switch"]');
    await page.click('[role="switch"]');
    assert((await page.getAttribute('[role="switch"]', 'aria-checked')) === 'true', 'the Settings switch did not turn on');
    assert(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'switch'), 'the focus left the switch');
    await page.$eval('[role="switch"]', (x) => x.scrollIntoView({ block: 'center' }));
    await shot(page, 'pg2-settings-switch-on-390');
    const s = await learnerSettings(page);
    assert(s.game_speed_challenge === true && s.relaxed_pace === false, `saved: ${s.game_speed_challenge} ${s.relaxed_pace}`);
    await go(page, 'games', '[role="switch"]');
    assert((await page.getAttribute('[role="switch"]', 'aria-checked')) === 'true', '#/games does not show the challenge as on');
    // Challenge on: a right answer moves on by itself within 1.5 s.
    await go(page, 'games/A2/1', '[data-opt]:not([disabled])');
    await page.waitForTimeout(200);
    await page.click(`[data-opt="${await rightOption(page, 'A2')}"]`);
    const t0 = Date.now();
    await page.waitForFunction(() => /שאלה 2 מתוך/.test(document.querySelector('.step-count')?.textContent || ''), null, { timeout: 1500 });
    assert(Date.now() - t0 <= 1500, 'a right answer did not move on within 1.5 s');
    // Challenge off (switched on #/games): the verdict stays for 4 s.
    await go(page, 'games', '[role="switch"]');
    await page.click('[role="switch"]');
    assert((await page.getAttribute('[role="switch"]', 'aria-checked')) === 'false' && (await learnerSettings(page)).game_speed_challenge === false, 'the #/games switch did not turn off');
    await go(page, 'games/A2/1', '[data-opt]:not([disabled])');
    await page.waitForTimeout(200);
    await page.click(`[data-opt="${await rightOption(page, 'A2')}"]`);
    await page.waitForTimeout(4000);
    assert(await page.$('.game-verdict') && /שאלה 1 מתוך/.test(await page.textContent('.step-count')), 'with the challenge off the verdict did not stay');
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
if (pageErrors.length) console.log(`\nPage errors:\n  ${[...new Set(pageErrors)].slice(0, 12).join('\n  ')}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
