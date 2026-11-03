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
// Matches every pair on the current picture board (pointer), after `wrong` deliberate wrong pairs on the first
// pictures. Returns the words of the pictures that were given a wrong word.
async function playBoard(page, { wrong = 0 } = {}) {
  await page.waitForSelector('.pic-tile:not([disabled])');
  await page.waitForTimeout(500);
  const n = (await page.$$('.pic-tile')).length;
  const words = await page.$$eval('[data-word]', (xs) => xs.map((x) => x.textContent.trim()));
  const missed = [];
  for (let k = 0; k < wrong; k++) {
    const wk = await picWord(page, k);
    await page.click(`[data-pic="${k}"]`);
    await page.click(`[data-word="${words.findIndex((w) => w !== wk)}"]`);
    missed.push(wk);
    await page.waitForTimeout(100);
  }
  for (let k = 0; k < n; k++) {
    await page.click(`[data-word="${words.indexOf(await picWord(page, k))}"]`);
    await page.click(`[data-pic="${k}"]`);
  }
  await page.waitForSelector('[data-nextboard]');
  return missed;
}
// What memory card i is (its English word), once it is face up.
const cardWord = async (page, i) => {
  const he = await page.$(`[data-card="${i}"] [data-he]`);
  return he ? byHe.get(await he.textContent()) : (await page.textContent(`[data-card="${i}"] [data-word]`)).trim();
};
// Plays a memory board to the end with a perfect memory (no slips, no misses). `known` maps cards already seen
// to their word (a string, or { word }).
async function playMemoryFrom(page, known = new Map()) {
  const n = (await page.$$('.mem-card')).length;
  const word = (i) => (typeof known.get(i) === 'string' ? known.get(i) : known.get(i)?.word);
  const see = async (i) => { await page.click(`[data-card="${i}"]`); known.set(i, await cardWord(page, i)); };
  for (let guard = 0; guard < 60; guard++) {
    const done = new Set(await page.$$eval('.mem-card:disabled', (xs) => xs.map((x) => Number(x.dataset.card))));
    if (done.size === n) break;
    let pair = null;
    for (const i of known.keys()) for (const j of known.keys()) if (i < j && word(i) === word(j) && !done.has(i)) pair = [i, j];
    await page.waitForTimeout(460); // a tap on a card of the last mismatch is ignored for 450 ms (a double tap)
    if (pair) { for (const i of pair) await page.click(`[data-card="${i}"]`); continue; }
    const fresh = [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i));
    await see(fresh);
    const partner = [...known.keys()].find((j) => j !== fresh && word(j) === word(fresh) && !done.has(j));
    const second = partner ?? [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i) && i !== fresh);
    await see(second);
  }
  await page.waitForSelector('.game-total');
}
const playMemory = (page) => playMemoryFrom(page);

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
    await go(page, 'games', '[data-speed-switch]');
    assert((await page.getAttribute('[data-speed-switch]', 'aria-checked')) === 'false', 'the speed challenge is on by default');
    await page.click('[data-speed-switch]');
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

  // UX r4 PG-2 replaced the Settings "calm pace" box with the one speed switch: the hub's promise that the game waits
  // holds whenever the challenge is off, also for a learner who had turned the old box off.
  await check('GM-1f. The hub says "the game waits for you" with the challenge off, also after the legacy relaxed_pace was turned off; no Settings note', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1', { settings: { relaxed_pace: false } });
    await go(page, 'games', '[data-speed-switch]');
    const calm = await page.textContent('.game-pace');
    assert(/המשחק מחכה לכם/.test(calm) && !(await page.$('[data-pace-note]')), `the calm hub: ${calm}`);
    assert((await page.getAttribute('[data-speed-switch]', 'aria-checked')) === 'false', 'the speed challenge turned on');
    await go(page, 'games/A1/1', '[data-opt]');
    await page.waitForTimeout(300);
    await page.click(`[data-opt="${await rightOption(page, 'A1', 1)}"]`);
    await page.waitForTimeout(2500);
    assert(/שאלה 1 מתוך 10/.test(await page.textContent('.step-count')), 'with the legacy relaxed_pace off, the quiz moved on by itself');
    await ctx.close();
  });

  await check('GM top bar (LF-7 rule): at 320, 360 and 390 with 150% text, the round counter has its own row, the progress bar keeps a real width and nothing scrolls sideways', async () => {
    const bad = [];
    for (const w of [320, 360, 390]) {
      const { ctx, page } = await newPage(browser, { w, h: 844, touch: true });
      await learnerAt(page, 'A1', { text: 150 });
      for (const [route, sel] of [['games/A1/1', '[data-opt]'], ['games/pictures/1', '.pic-tile'], ['games/memory/1', '.mem-card']]) {
        await go(page, route, sel);
        const r = await page.evaluate(() => {
          const top = document.querySelector('.player-top');
          const bar = top.querySelector('.progress').getBoundingClientRect();
          const count = top.querySelector('.step-count').getBoundingClientRect();
          return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, bar: Math.round(bar.width), share: bar.width / top.clientWidth, ownRow: count.top >= bar.bottom - 1 };
        });
        if (r.over > 1 || r.share < 0.3 || !r.ownRow) bad.push(`${route} at ${w}: ${JSON.stringify(r)}`);
      }
      await ctx.close();
    }
    assert(!bad.length, bad.join(' | '));
  });

  await check('GM-1e. Picture and memory games: calm rounds show no bonus; with the speed challenge on, the bonus line and the challenge mode come back', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    for (const challenge of [false, true]) {
      await page.evaluate(async (on) => (await import('./js/core/learner.js')).saveSettings({ game_speed_challenge: on }), challenge);
      await go(page, 'games/pictures/1', '.pic-tile');
      for (let bd = 0; bd < 3; bd++) { await playBoard(page); await page.click('[data-nextboard]'); }
      await page.waitForSelector('.game-total');
      const pt = await page.textContent('.game-result');
      assert(/בונוס מהירות/.test(pt) === challenge, `picture result, challenge ${challenge}: ${pt.replace(/\s+/g, ' ').slice(0, 200)}`);
      await go(page, 'games/memory/1', '.mem-card');
      await page.waitForTimeout(500);
      await playMemory(page);
      const mt = await page.textContent('.game-result');
      assert(/בונוס/.test(mt) === challenge, `memory result, challenge ${challenge}: ${mt.replace(/\s+/g, ' ').slice(0, 200)}`);
      if (challenge) await shot(page, 'gm1-memory-challenge-result', { fullPage: true });
    }
    const modes = (await page.evaluate(() => window.lucid.store.all('events').filter((e) => /picture-round|memory-round/.test(e.type)).map((e) => `${e.type}:${e.mode}`)));
    assert(modes.join() === 'picture-round:calm,memory-round:calm,picture-round:challenge,memory-round:challenge', `modes: ${modes}`);
    await ctx.close();
  });

  await check('GM-2a. Games hub at 390: one line per game and no rules paragraph above the first game card; the scoring table only with the speed challenge on', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'A1');
    await go(page, 'games', '.game-stage');
    const before = await page.evaluate(() => {
      const first = document.querySelector('.game-stage');
      const walker = document.createTreeWalker(document.querySelector('#view'), NodeFilter.SHOW_TEXT);
      let text = '';
      for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (first.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) break; text += n.data; }
      return text;
    });
    assert(!/בונוס|פספוס|\d+s\b|\+\d/.test(before), `scoring rules above the first card: ${before.replace(/\s+/g, ' ').slice(0, 200)}`);
    assert(!(await page.$('.game-scoring, .game-rules')), 'the scoring rules show with the challenge off');
    const lines = await page.$$eval('.game-section > p.muted', (ps) => ps.map((p) => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight))));
    assert(lines.length === 3 && lines.every((n) => n <= 2), `game descriptions are not short: ${lines} lines`);
    await page.click('[data-speed-switch]');
    await page.waitForSelector('.game-scoring');
    await page.click('.game-scoring > summary');
    const table = await page.textContent('.game-scoring-table');
    assert(/עד 3 שניות/.test(table) && !/\d+s\b/.test(table), `the scoring table is not in Hebrew words: ${table.slice(0, 120)}`);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    assert(sw <= 390, `the hub scrolls sideways: ${sw}`);
    await shot(page, 'gm2-hub-challenge-390', { fullPage: true });
    await ctx.close();
  });

  await check('GM-2b. The result sum reads "7 × 10 = 70" left to right', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'A1');
    await go(page, 'games/A1/1', '[data-opt]');
    await playQuiz(page, 'A1', 1, (q) => q < 7);
    const order = await page.evaluate(() => {
      const b = document.querySelector('.game-result bdi.num');
      const t = b.firstChild; const out = [];
      for (let i = 0; i < t.length; i++) { if (!t.data[i].trim()) continue; const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); out.push([t.data[i], r.getBoundingClientRect().x]); }
      return out.sort((a, c) => a[1] - c[1]).map((x) => x[0]).join('');
    });
    assert(order === '7×10=70', `the sum reads "${order}" from left to right`);
    await shot(page, 'gm2-quiz-result-390', { fullPage: true });
    await ctx.close();
  });

  await check('GM-3a. A B1 learner: the B1 quiz is the first card, the hub is under 2,000 px at 390, and picture level 3 and memory level 3 are playable', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'B1');
    await go(page, 'games', '.game-stage');
    await page.waitForTimeout(200);
    assert((await page.getAttribute('.game-stage', 'href')) === '#/games/B1/1', `first card: ${await page.getAttribute('.game-stage', 'href')}`);
    assert(/הרמה שלך/.test(await page.textContent('.game-mine')), 'the learner\'s level is not tagged');
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    assert(h < 2000, `the hub is ${h} px tall`);
    assert(await page.$('a.game-stage[href="#/games/pictures/3"]') && await page.$('a.game-stage[href="#/games/memory/3"]'), 'level 3 is not open on the hub');
    assert(await page.$('a.game-stage[href="#/games/C1/1"]') && !(await page.$('a.game-stage[href="#/games/C1/2"]')), 'other levels do not keep their stage locks');
    await shot(page, 'gm3-hub-B1-390', { fullPage: true });
    await go(page, 'games/pictures/3', '.pic-tile');
    await go(page, 'games/memory/3', '.mem-card');
    await ctx.close();
  });

  await check('GM-3b. A locked stage or level address shows "still locked" with a way on, not a silent jump to the hub', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'B1');
    await go(page, 'games/B1/3', '.game-locked-page');
    assert(/השלב הזה עוד נעול/.test(await page.textContent('.game-locked-page h1')), 'no locked message');
    assert(/#\/games\/B1\/3$/.test(page.url()), `the address moved: ${page.url()}`);
    assert(await page.$('.game-locked-page a[href="#/games/B1/1"]') && await page.$('.game-locked-page a[href="#/games"]'), 'no link to the open stage or the hub');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => document.activeElement?.matches('.game-locked-page h1')), 'focus is not on the message');
    await shot(page, 'gm3-locked-B1-3-390');
    await ctx.close();
    const a2 = await newPage(browser, { touch: true });
    await learnerAt(a2.page, 'A2');
    await go(a2.page, 'games/pictures/2', '.pic-tile');
    await go(a2.page, 'games/memory/3', '.game-locked-page');
    assert(/הרמה הזו עוד נעולה/.test(await a2.page.textContent('.game-locked-page h1')), 'no locked message for a level');
    assert(await a2.page.$('.game-locked-page a[href="#/games/memory/2"]'), 'no link to the highest open level');
    await a2.ctx.close();
  });

  await check('GM-4. Words and pictures: a finished board shows the English word large on each tile (Hebrew small under it); after 2 wrong taps only the 2 missed pictures are listed', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games/pictures/1', '.pic-tile');
    const missed = await playBoard(page, { wrong: 2 });
    const tiles = await page.$$eval('.pic-tile', (xs) => xs.map((x) => {
      const en = x.querySelector('.pic-cap .pic-en'), he = x.querySelector('.pic-cap .pic-he');
      return { en: en?.textContent.trim(), lang: en?.lang, enSize: en ? parseFloat(getComputedStyle(en).fontSize) : 0, heSize: he ? parseFloat(getComputedStyle(he).fontSize) : 0, he: x.querySelector('[data-he]').textContent };
    }));
    for (const t of tiles) {
      assert(t.en === byHe.get(t.he) && t.lang === 'en', `a matched tile does not show its English word: ${JSON.stringify(t)}`);
      assert(t.enSize >= 18 && t.enSize > t.heSize, `the English word is not the large one: ${JSON.stringify(t)}`);
    }
    await shot(page, 'gm4-board-done-390');
    await page.click('[data-nextboard]');
    await playBoard(page);
    await page.click('[data-nextboard]');
    await playBoard(page);
    await page.click('[data-nextboard]');
    await page.waitForSelector('.game-total');
    const listed = await page.$$eval('.pic-missed strong', (xs) => xs.map((x) => x.textContent.trim()));
    assert(listed.length === 2 && missed.every((m) => listed.includes(m)), `listed ${listed}, missed ${missed}`);
    const ev = (await events(page, 'picture-round'))[0];
    assert(ev.mistakes === 2, `mistakes: ${ev.mistakes}`);
    await shot(page, 'gm4-results-390', { fullPage: true });
    await ctx.close();
  });

  await check('GM-5a. Memory at 390 and 100%: card words are at least 20 px; a mismatch names both cards in the live line', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games/memory/1', '.mem-card');
    await page.waitForTimeout(500);
    const n = (await page.$$('.mem-card')).length;
    const sizes = [];
    let named = null;
    for (let a = 0; a + 1 < n; a += 2) {
      await page.click(`[data-card="${a}"]`);
      await page.click(`[data-card="${a + 1}"]`);
      sizes.push(...await page.$$eval('.mem-card .mem-word', (xs) => xs.map((x) => [x.textContent, parseFloat(getComputedStyle(x).fontSize), x.scrollWidth <= x.closest('.mem-card').clientWidth])));
      if (!named && await page.$('.mem-card.is-wrong')) {
        named = await page.evaluate(() => ({ live: document.querySelector('#gfb').getAttribute('aria-live'), text: document.querySelector('#gfb').textContent.replace(/\s+/g, ' ').trim() }));
        await shot(page, 'gm5-mismatch-390');
      }
    }
    assert(sizes.length, 'no word card was turned');
    const small = sizes.filter(([, px]) => px < 20);
    assert(!small.length, `card words under 20 px: ${JSON.stringify(small)}`);
    const wide = sizes.filter(([, , fits]) => !fits);
    assert(!wide.length, `card words wider than their card: ${JSON.stringify(wide)}`);
    assert(named && named.live, 'no mismatch, or no live region');
    assert(/קלף \d+: (תמונה|מילה), .+\. קלף \d+: (תמונה|מילה), .+\. לא זוג\./.test(named.text), `the live line does not name both cards: "${named.text}"`);
    await ctx.close();
  });

  await check('GM-5b. Memory end screen: every pair with its picture, word and play key; only real misses (a picture paired with a word card already seen) are words to go over; a slip costs no points by default', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games/memory/1', '.mem-card');
    await page.waitForTimeout(500);
    const n = (await page.$$('.mem-card')).length;
    const known = new Map(); // card -> { word, pic }
    // A pause before each turn: a tap on a card of the mismatch just made is ignored for 450 ms (a double tap).
    const flip = async (i, turnStart = false) => { if (turnStart) await page.waitForTimeout(500); await page.click(`[data-card="${i}"]`); known.set(i, { word: await cardWord(page, i), pic: Boolean(await page.$(`[data-card="${i}"] [data-he]`)) }); };
    const doneSet = async () => new Set(await page.$$eval('.mem-card:disabled', (xs) => xs.map((x) => Number(x.dataset.card))));
    // Look at the first half of the board, two cards a turn (exploring: never a miss).
    for (let a = 0; a + 1 < n / 2; a += 2) { await flip(a, true); await flip(a + 1); }
    let done = await doneSet();
    const open = [...known].filter(([i]) => !done.has(i));
    // A miss: a picture, then a word card already seen that is not its word.
    const pic = open.find(([, v]) => v.pic && open.some(([, w]) => !w.pic && w.word !== v.word));
    assert(pic, 'the board gave no chance of a miss');
    const wrongWord = open.find(([, w]) => !w.pic && w.word !== pic[1].word);
    await flip(pic[0], true); await flip(wrongWord[0]);
    const missWord = pic[1].word;
    // A slip of place: a card whose pair has been seen, then an unseen card instead (not a miss).
    done = await doneSet();
    const pairSeen = [...known].find(([i, v]) => !done.has(i) && [...known].some(([j, w]) => j !== i && w.word === v.word && !done.has(j)));
    const unseen = [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i));
    let slipWord = null;
    if (pairSeen && unseen !== undefined) {
      const partnerUnseen = [...Array(n).keys()].filter((i) => !known.has(i) && !done.has(i));
      await flip(pairSeen[0], true);
      const second = partnerUnseen.find((i) => i !== pairSeen[0]);
      await flip(second);
      if (known.get(second).word !== pairSeen[1].word) slipWord = pairSeen[1].word;
    }
    await playMemoryFrom(page, known);
    const ev = (await events(page, 'memory-round'))[0];
    assert(ev.score === ev.matches * 10, `slips cost points by default: ${JSON.stringify(ev)}`);
    const listed = await page.$$eval('.pic-missed strong', (xs) => xs.map((x) => x.textContent.trim()));
    assert(listed.length === 1 && listed[0] === missWord, `words to go over: ${listed} (the miss was ${missWord}${slipWord ? `, the slip ${slipWord}` : ''})`);
    const pairs = await page.$$eval('.game-pairs li', (xs) => xs.map((x) => ({ word: x.querySelector('strong')?.textContent, svg: Boolean(x.querySelector('svg')), say: Boolean(x.querySelector('[data-say]')) })));
    assert(pairs.length === n / 2 && pairs.every((x) => x.word && x.svg), `not every pair is listed: ${JSON.stringify(pairs)}`);
    await shot(page, 'gm5-results-390', { fullPage: true });
    await ctx.close();
  });

  await check('GM-5c. Memory level 1 offers a small board: 4 pairs, 8 cards, and back to the full board', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await go(page, 'games/memory/1', '.mem-card');
    await page.waitForTimeout(500);
    await page.click('a.mem-size');
    await page.waitForFunction(() => document.querySelectorAll('.mem-card').length === 8);
    await page.waitForTimeout(500);
    await playMemory(page);
    const ev = (await events(page, 'memory-round'))[0];
    assert(ev.total === 4 && ev.matches === 4, `small round not logged: ${JSON.stringify(ev)}`);
    await page.waitForTimeout(500);
    await page.click('[data-again]');
    await page.waitForFunction(() => document.querySelectorAll('.mem-card').length === 8);
    await page.waitForTimeout(500);
    await page.click('a.mem-size');
    await page.waitForFunction(() => document.querySelectorAll('.mem-card').length === 12);
    await ctx.close();
  });

  await check('GM-6a. Word quiz on a touch phone: "הבחירה נבדקת מיד" above the options, no 1-4 keycaps; after an answer the footer Continue key is present, full width and focused', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'A1');
    await go(page, 'games/A1/1', '[data-opt]');
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => {
      const line = document.querySelector('.game-instant');
      const opts = document.querySelector('.game-options');
      return { line: line?.textContent.trim(), above: Boolean(line && opts && (line.compareDocumentPosition(opts) & Node.DOCUMENT_POSITION_FOLLOWING)), keycaps: [...document.querySelectorAll('.game-options .option .k')].filter((k) => k.getBoundingClientRect().width > 0).length, foot: Boolean(document.querySelector('#pfoot')) };
    });
    assert(before.line === 'הבחירה נבדקת מיד.' && before.above, `no instant-check line above the options: ${JSON.stringify(before)}`);
    assert(before.keycaps === 0, `${before.keycaps} keycaps show on touch`);
    assert(!before.foot, 'a footer shows before the answer');
    await shot(page, 'gm6-question-390-touch');
    await page.tap('[data-opt="2"]');
    await page.waitForSelector('#pfoot [data-next]');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const b = document.querySelector('#pfoot [data-next]');
      const foot = document.querySelector('#pfoot');
      return { focused: document.activeElement === b, text: b.textContent.trim(), sticky: getComputedStyle(foot).position, wide: b.getBoundingClientRect().width / foot.querySelector('.inner').getBoundingClientRect().width, inView: b.getBoundingClientRect().bottom <= innerHeight };
    });
    assert(after.focused && /^המשך/.test(after.text), `the footer key is not focused Continue: ${JSON.stringify(after)}`);
    assert(after.sticky === 'sticky' && after.wide > 0.95 && after.inView, `the footer key is not a full-width sticky key: ${JSON.stringify(after)}`);
    await shot(page, 'gm6-answered-390-touch');
    await page.tap('#pfoot [data-next]');
    await page.waitForFunction(() => /שאלה 2 מתוך 10/.test(document.querySelector('.step-count')?.textContent));
    assert(!(await page.$('#pfoot')), 'the footer stays on the next question');
    await ctx.close();
  });

  await check('GM-6b. Word quiz with a keyboard (1440): keys 1-4 answer, the keycaps show, Enter on the focused Continue key moves on once', async () => {
    const { ctx, page } = await newPage(browser, { w: 1440, h: 900 });
    await learnerAt(page, 'A1');
    await go(page, 'games/A1/1', '[data-opt]');
    await page.waitForTimeout(300);
    const caps = await page.$$eval('.game-options .option .k', (ks) => ks.filter((k) => k.getBoundingClientRect().width > 0).length);
    assert(caps === 4, `keycaps on a desktop: ${caps}`);
    await page.keyboard.press('3');
    await page.waitForSelector('#pfoot [data-next]');
    assert(await page.evaluate(() => document.activeElement?.matches('#pfoot [data-next]')), 'Continue is not focused');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /שאלה 2 מתוך 10/.test(document.querySelector('.step-count')?.textContent));
    await page.waitForTimeout(200);
    assert(/שאלה 2 מתוך 10/.test(await page.textContent('.step-count')) && !(await page.$('.game-verdict')), 'Enter did not move on exactly once');
    await shot(page, 'gm6-question-1440');
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
