// Browser checks for the games lane of UX round 3 (docs/qa/panels-r3/plan.json, lane "games": GM-1 to GM-6).
// Serves lucid/ itself, drives Chromium through Playwright and prints one PASS/FAIL line per check.
// Usage: node tests/e2e/games.mjs [--only <substring>] [--shots <dir>]   (port: GAMES_PORT, default 9173)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.GAMES_PORT) || 9173;
const BASE = `http://127.0.0.1:${PORT}/`;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
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

async function newPage(browser, { w = 390, h = 844, touch = false, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block' });
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
const go = async (page, route, sel) => { await page.goto(`${BASE}#/${route}`); if (sel) await page.waitForSelector(sel); };
const events = (page, type) => page.evaluate((t) => window.lucid.store.all('events').filter((e) => e.type === t), type);

// The index of the right option in a word-quiz choice question, from the level's lesson words.
async function rightOption(page, level, stage) {
  return page.evaluate(async ({ level, stage }) => {
    const { content } = await import('./js/core/content.js');
    const { wordPool } = await import('./js/core/wordgame.js');
    const cur = await content.curriculum();
    const ids = cur.levels.find((l) => l.id === level).lessons.map((l) => l.id);
    const pool = wordPool((await Promise.all(ids.map((id) => content.lesson(id).catch(() => null)))).filter(Boolean), level);
    const prompt = document.querySelector('.game-word').textContent.trim();
    const w = pool.find((x) => (stage === 1 ? x.word : x.meaning) === prompt);
    const want = stage === 1 ? w.meaning : w.word;
    return [...document.querySelectorAll('[data-opt] .game-opt')].findIndex((o) => o.textContent.trim() === want);
  }, { level, stage });
}
// Plays a whole word-quiz round of choice questions: `right` decides, per question, whether to answer right.
async function playQuiz(page, level, stage, right = () => true) {
  for (let q = 0; q < 10; q++) {
    await page.waitForSelector('[data-opt]:not([disabled])');
    const k = await rightOption(page, level, stage);
    await page.click(`[data-opt="${right(q) ? k : (k + 1) % 4}"]`);
    await page.waitForSelector('[data-next]');
    await page.click('[data-next]');
  }
  await page.waitForSelector('.game-total');
}
// The English word of picture-game tile k (named by its Hebrew word for screen readers).
const picWord = async (page, k) => byHe.get(await page.textContent(`[data-pic="${k}"] [data-he]`));
// Matches every pair on the current picture board (pointer), after one deliberate wrong pair when `wrong` is set.
async function playBoard(page, { wrong = false } = {}) {
  await page.waitForSelector('.pic-tile:not([disabled])');
  await page.waitForTimeout(500);
  const n = (await page.$$('.pic-tile')).length;
  const words = await page.$$eval('[data-word]', (xs) => xs.map((x) => x.textContent.trim()));
  if (wrong) {
    const w0 = await picWord(page, 0);
    await page.click('[data-pic="0"]');
    await page.click(`[data-word="${words.findIndex((w) => w !== w0)}"]`);
    await page.waitForTimeout(100);
  }
  for (let k = 0; k < n; k++) {
    await page.click(`[data-word="${words.indexOf(await picWord(page, k))}"]`);
    await page.click(`[data-pic="${k}"]`);
  }
  await page.waitForSelector('[data-nextboard]');
}
// What memory card i is (its English word), once it is face up.
const cardWord = async (page, i) => {
  const he = await page.$(`[data-card="${i}"] [data-he]`);
  return he ? byHe.get(await he.textContent()) : (await page.textContent(`[data-card="${i}"] [data-word]`)).trim();
};
// Plays a memory board to the end with a perfect memory (no slips).
async function playMemory(page) {
  const n = (await page.$$('.mem-card')).length;
  const known = new Map();
  for (let guard = 0; guard < 60; guard++) {
    const done = new Set(await page.$$eval('.mem-card:disabled', (xs) => xs.map((x) => Number(x.dataset.card))));
    if (done.size === n) break;
    let pair = null;
    for (const [i, a] of known) for (const [j, b] of known) if (i < j && a === b && !done.has(i)) pair = [i, j];
    if (pair) { for (const i of pair) await page.click(`[data-card="${i}"]`); continue; }
    const fresh = [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i));
    await page.click(`[data-card="${fresh}"]`);
    known.set(fresh, await cardWord(page, fresh));
    const partner = [...known].find(([j, w]) => j !== fresh && w === known.get(fresh) && !done.has(j))?.[0];
    const second = partner ?? [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i) && i !== fresh);
    await page.click(`[data-card="${second}"]`);
    known.set(second, await cardWord(page, second));
  }
  await page.waitForSelector('.game-total');
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
await sleep(700);
const browser = await chromium.launch();
try {
  await check('GM-1a. Word quiz waits: after a right answer the verdict stays for 10 s until the key is pressed; no speed bonus by default', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'A1');
    await go(page, 'games/A1/1', '[data-opt]');
    await page.waitForTimeout(300);
    const k = await rightOption(page, 'A1', 1);
    await page.click(`[data-opt="${k}"]`);
    await page.waitForSelector('.game-verdict.ok');
    await page.waitForTimeout(10000);
    assert(await page.$('.game-verdict.ok'), 'the verdict of a right answer did not stay');
    assert(/שאלה 1 מתוך 10/.test(await page.textContent('.step-count')), 'the quiz moved on by itself');
    assert(!/בונוס/.test(await page.textContent('#gfb')), 'a speed bonus was paid with the challenge off');
    await page.click('[data-next]');
    await page.waitForFunction(() => /שאלה 2 מתוך 10/.test(document.querySelector('.step-count')?.textContent));
    await ctx.close();
  });

  await check('GM-1b. Words and pictures: a finished board stays on screen until "Next board"', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games/pictures/1', '.pic-tile');
    await playBoard(page);
    await page.waitForTimeout(4000);
    assert(/לוח 1 מתוך 3/.test(await page.textContent('.step-count')), 'the board moved on by itself');
    assert(await page.$('.game-verdict.ok [data-nextboard]'), 'the finished board is not on screen');
    assert(!/בונוס/.test(await page.textContent('#gfb')), 'a board bonus was paid with the challenge off');
    await ctx.close();
  });

  await check('GM-1c. Memory: a mismatch stays face up (4 s) until the next tap', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games/memory/1', '.mem-card');
    await page.waitForTimeout(500);
    const n = (await page.$$('.mem-card')).length;
    let pair = null;
    for (let a = 0; a + 1 < n && !pair; a += 2) {
      await page.click(`[data-card="${a}"]`);
      await page.click(`[data-card="${a + 1}"]`);
      if (await page.$('.mem-card.is-wrong')) pair = [a, a + 1];
    }
    assert(pair, 'no mismatch was made');
    await page.waitForTimeout(4000);
    const faceUp = (i) => page.$(`[data-card="${i}"].is-up [data-he], [data-card="${i}"].is-up [data-word]`);
    for (const i of pair) assert(await faceUp(i), `card ${i + 1} of the mismatch turned back by itself`);
    const next = [...Array(n).keys()].find((i) => !pair.includes(i) && !(i < pair[0]));
    await page.click(`[data-card="${next}"]`);
    for (const i of pair) assert(!(await faceUp(i)), `card ${i + 1} did not turn back on the next tap`);
    await ctx.close();
  });

  await check('GM-1d. Results: no "בונוס מהירות" with the switch off; the hub switch saves the setting and brings the bonus back, with bests kept per mode', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await go(page, 'games/A1/1', '[data-opt]');
    await playQuiz(page, 'A1', 1);
    let text = await page.textContent('.game-result');
    assert(!/בונוס מהירות/.test(text), `the calm result mentions a speed bonus: ${text.slice(0, 160)}`);
    assert(/10 מתוך 10 נכונות/.test(text), 'the result does not show the accuracy');
    const calm = (await events(page, 'game-round'))[0];
    assert(calm.mode === 'calm' && calm.score === 100, `calm round not saved as calm: ${JSON.stringify(calm)}`);
    await go(page, 'games', '[data-challenge]');
    assert(!(await page.isChecked('[data-challenge]')), 'the speed challenge is on by default');
    await page.check('[data-challenge]');
    assert((await page.evaluate(async () => (await import('./js/core/learner.js')).settings().game_speed_challenge)) === true, 'the switch did not save game_speed_challenge');
    await go(page, 'games/A1/1', '[data-opt]');
    await playQuiz(page, 'A1', 1);
    text = await page.textContent('.game-result');
    assert(/בונוס מהירות/.test(text), `the challenge result has no bonus line: ${text.slice(0, 160)}`);
    assert(/השיא הראשון שלך/.test(text), 'the first challenge round is not its own first best');
    const ch = (await events(page, 'game-round'))[1];
    assert(ch.mode === 'challenge' && ch.score > 100, `challenge round not saved with its bonus: ${JSON.stringify(ch)}`);
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
