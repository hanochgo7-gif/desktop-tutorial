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
// Speech synthesis stubbed in the page: with an English voice, and either playing (start, then end) or silent
// (speak() never starts, so speech.js reports 'silent' after 1.5 s).
const speechStub = (works) => `(() => {
  const s = window.speechSynthesis; if (!s) return;
  const voice = { lang: 'en-US', name: 'Stub English', default: true, localService: true, voiceURI: 'stub' };
  s.getVoices = () => [voice];
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  s.cancel = () => {};
  s.speak = ${works} ? (u) => { setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 60); }, 20); } : () => {};
})();`;
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
// The English word of picture-game tile k (named by its Hebrew word for screen readers).
const picWord = async (page, k) => byHe.get(await page.textContent(`[data-pic="${k}"] [data-he]`));
// Matches every pair still open on the current picture board (pointer).
async function playBoard(page) {
  await page.waitForSelector('.pic-tile:not([disabled])');
  await page.waitForTimeout(500);
  const n = (await page.$$('.pic-tile')).length;
  const words = await page.$$eval('[data-word]', (xs) => xs.map((x) => x.textContent.trim()));
  for (let k = 0; k < n; k++) {
    if (await page.$eval(`[data-pic="${k}"]`, (x) => x.disabled)) continue;
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
// Plays a memory board to the end with a perfect memory; with slip, one deliberate slip (the pair had been seen and
// another card is turned). Returns whether the slip was made.
async function playMemory(page, { slip = false } = {}) {
  const n = (await page.$$('.mem-card')).length;
  const known = new Map();
  let slipped = false;
  const see = async (i) => { await page.click(`[data-card="${i}"]`); known.set(i, await cardWord(page, i)); };
  for (let guard = 0; guard < 80; guard++) {
    const done = new Set(await page.$$eval('.mem-card:disabled', (xs) => xs.map((x) => Number(x.dataset.card))));
    if (done.size === n) break;
    let pair = null;
    for (const i of known.keys()) for (const j of known.keys()) if (i < j && known.get(i) === known.get(j) && !done.has(i)) pair = [i, j];
    await page.waitForTimeout(460); // a tap on a card of the last mismatch is ignored for 450 ms (a double tap)
    if (pair) { for (const i of pair) await page.click(`[data-card="${i}"]`); continue; }
    const fresh = [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i));
    await see(fresh);
    const partner = [...known.keys()].find((j) => j !== fresh && known.get(j) === known.get(fresh) && !done.has(j));
    let second = partner ?? [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i) && i !== fresh);
    if (slip && !slipped && partner !== undefined) {
      second = [...Array(n).keys()].find((i) => i !== fresh && i !== partner && !done.has(i));
      slipped = true;
    }
    await see(second);
  }
  await page.waitForSelector('.game-total');
  return slipped;
}

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
  // ---------- PG-3 ----------
  await check('PG-3. Words and pictures in calm mode: no penalty (12 pairs, 1 mistake = 120), the wrong-pair line names the pair, no "מורידה" on the hub, the board-end key in #pfoot', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games', '#lvl-pictures');
    const hub = await page.textContent('#view');
    assert(!/מורידה/.test(hub), 'the hub still says a mistake takes points off');
    await go(page, 'games/pictures/1', '.pic-tile');
    await page.waitForSelector('.pic-tile:not([disabled])');
    await page.waitForTimeout(500);
    const pic0 = await picWord(page, 0);
    const picHe = await page.textContent('[data-pic="0"] [data-he]');
    const words = await page.$$eval('[data-word]', (xs) => xs.map((x) => x.textContent.trim()));
    const wrong = words.findIndex((w) => w !== pic0);
    await page.click('[data-pic="0"]');
    await page.click(`[data-word="${wrong}"]`);
    await page.waitForSelector('#gfb .bad-text');
    const live = (await page.textContent('#gfb')).replace(/\s+/g, ' ');
    assert(live.includes(words[wrong]) && live.includes(picHe) && /לא מתאים/.test(live) && !/פחות/.test(live), `the wrong-pair line: ${live}`);
    assert((await page.textContent('.game-score')).match(/\d+/)[0] === '0', 'the score changed after a mistake');
    await shot(page, 'pg3-wrong-pair-390');
    // Finish the round: 12 pairs and that one mistake.
    for (let bd = 0; bd < 3; bd++) {
      await playBoard(page);
      assert(await page.$('#pfoot.game-foot [data-nextboard]') && !(await page.$('#gfb [data-nextboard]')), 'the board-end key is not in the footer');
      if (bd === 0) {
        const r = await page.$eval('#pfoot [data-nextboard]', (b) => ({ w: b.getBoundingClientRect().width, foot: b.closest('#pfoot').clientWidth }));
        assert(r.w >= r.foot * 0.8, `the board-end key is not full width: ${JSON.stringify(r)}`);
        await shot(page, 'pg3-board-end-390');
      }
      await page.click('[data-nextboard]');
    }
    await page.waitForSelector('.game-total');
    const total = Number((await page.textContent('.game-total')).match(/\d+/)[0]);
    const ev = await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'picture-round'));
    assert(total === 120 && ev.length === 1 && ev[0].score === 120 && ev[0].mistakes === 1, `calm score ${total}: ${JSON.stringify(ev)}`);
    const res = (await page.textContent('.game-result')).replace(/\s+/g, ' ');
    assert(/ניסיון אחד שלא התאים/.test(res) && !/−/.test(res), `the calm result: ${res.slice(0, 220)}`);
    await shot(page, 'pg3-result-390');
    await ctx.close();
  });
  // ---------- PG-4 ----------
  await check('PG-4. Memory in calm mode: the end screen has no "%" and no slip tally; level 2 opens through the picture game, not memory accuracy', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1');
    await go(page, 'games/memory/1', '.mem-card');
    await page.waitForTimeout(500);
    const slipped = await playMemory(page, { slip: true });
    assert(slipped, 'the test never had the chance to slip');
    const ev = (await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'memory-round')))[0];
    assert(ev && ev.slips >= 1 && ev.accuracy < 1, `no slip recorded: ${JSON.stringify(ev)}`);
    const res = (await page.textContent('.game-result')).replace(/\s+/g, ' ');
    // The only percentage left is the picture game's 70% in the unlock rule; nothing measures memory.
    const own = (await page.$eval('.game-result', (r) => { const c = r.cloneNode(true); c.querySelector('[data-unlock-line]')?.remove(); return c.textContent; })).replace(/\s+/g, ' ');
    assert(!/%/.test(own) && !/נבחר קלף אחר/.test(res) && !/דיוק/.test(res), `the calm end screen: ${res.slice(0, 260)}`);
    assert(/6 זוגות ב-\d+ תורות/.test(res), `no "N זוגות ב-M תורות": ${res.slice(0, 200)}`);
    assert(!(await page.$('a[href="#/games/memory/2"]')), 'memory level 2 opened on memory accuracy');
    assert(await page.$('.game-result a[href="#/games/pictures/1"]') && /במשחק המילים והתמונות ברמה 1/.test(res), 'the unlock line does not point to the picture game');
    await shot(page, 'pg4-memory-end-calm-390');
    // A picture-game level-1 best of 70% opens memory level 2.
    await page.evaluate(() => window.lucid.store.put('events', { id: 'ev-pic1', at: new Date().toISOString(), type: 'picture-round', level: 1, score: 100, accuracy: 0.75, matches: 12, mistakes: 4, total: 12, mode: 'calm' }));
    await go(page, 'games', '#lvl-memory');
    assert(await page.$('#lvl-memory a.game-stage[href="#/games/memory/2"]'), 'memory level 2 did not open with a picture-game best of 75%');
    const sub = await page.textContent('#lvl-memory a.game-stage[href="#/games/memory/1"]');
    assert(!/%/.test(sub) && /תורות/.test(sub), `the memory best on the hub: ${sub}`);
    await ctx.close();
  });

  await check('PG-4. Memory at 390x844, 150% text: an 8-card board fits the screen, the board-size link is 44px tall and the score pill says "נקודות"', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'PreA1', { text: 150 });
    await go(page, 'games/memory/1', '.mem-card');
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.mem-card')];
      const link = document.querySelector('.mem-size').getBoundingClientRect();
      const pill = document.querySelector('.game-score');
      return { n: cards.length, bottom: cards.at(-1).getBoundingClientRect().bottom, h: innerHeight, link: link.height, pill: pill.innerText.replace(/\s+/g, ' ').trim(), wide: document.documentElement.scrollWidth - innerWidth };
    });
    assert(m.n === 8, `${m.n} cards at 150%`);
    assert(m.bottom <= m.h, `the last card ends at ${m.bottom} of ${m.h}`);
    assert(m.link >= 44, `the board-size link is ${m.link}px tall`);
    assert(/נקודות/.test(m.pill), `the score pill shows "${m.pill}"`);
    assert(m.wide <= 0, `the page scrolls sideways by ${m.wide}px`);
    await shot(page, 'pg4-memory-150-390');
    // The full board is still one tap away.
    await page.click('.mem-size');
    await page.waitForFunction(() => document.querySelectorAll('.mem-card').length === 12);
    await ctx.close();
  });
  // ---------- PG-15 ----------
  await check('PG-15. Listening hub: with speech silent the item is stored with no score and says "לא נספר"; with speech working the footer has "לא יודע/ת", which shows the answer', async () => {
    const attemptsOn = (page) => page.evaluate(() => window.lucid.store.all('attempts').filter((a) => a.lesson === 'a1-02' && a.exercise === 'e3'));
    // Silent: speak() never starts.
    const silent = await newPage(browser, { touch: true, init: speechStub(false) });
    await learnerAt(silent.page, 'A1');
    await go(silent.page, 'listening?l=a1-02&e=e3', '[data-say="normal"]');
    await silent.page.click('[data-say="normal"]');
    await silent.page.waitForTimeout(1900);
    const tr = await silent.page.$('#exroot button:is([data-transcript], [data-show-transcript])');
    if (tr) await tr.click(); // the transcript path, where exercise.js offers one (EX-4)
    await silent.page.click('#exroot [data-opt="0"]');
    await silent.page.click('[data-check]');
    await silent.page.waitForSelector('[data-next]');
    const sa = await attemptsOn(silent.page);
    assert(sa.length === 1 && sa[0].score === null, `the unheard attempt: ${JSON.stringify(sa)}`);
    const foot = (await silent.page.textContent('#pfoot')).replace(/\s+/g, ' ');
    assert(/לא נספר/.test(foot) && !/^נכון|לא בדיוק/.test(foot), `the unheard footer: ${foot}`);
    await shot(silent.page, 'pg15-unheard-390');
    await silent.ctx.close();
    // Working speech: "I don't know" records a wrong first try and shows the answer.
    const ok = await newPage(browser, { touch: true, init: speechStub(true) });
    await learnerAt(ok.page, 'A1');
    await go(ok.page, 'listening?l=a1-02&e=e3', '[data-say="normal"]');
    const idk = await ok.page.$('#pfoot [data-dontknow]');
    assert(idk && /לא יודע\/ת/.test(await idk.textContent()), 'no "לא יודע/ת" in the footer');
    await shot(ok.page, 'pg15-idk-key-390');
    await idk.click();
    await ok.page.waitForSelector('[data-next]');
    const shown = (await ok.page.textContent('#pfoot')).replace(/\s+/g, ' ');
    assert(/He plays tennis\./.test(shown) && /הנה התשובה/.test(shown), `the answer is not shown: ${shown}`);
    const oa = await attemptsOn(ok.page);
    assert(oa.length === 1 && oa[0].correct === false && oa[0].score === 0, `the "I don't know" attempt: ${JSON.stringify(oa)}`);
    await shot(ok.page, 'pg15-idk-390');
    await ok.ctx.close();
  });
  // ---------- PG-5 ----------
  await check('PG-5. Word quiz: a wrong pick says "לא בדיוק" on the lessons\' neutral verdict surface (not --bad-tint); #/games has no "איך מנקדים" or singular "הרמה שלך"', async () => {
    for (const dark of [false, true]) {
      const { ctx, page } = await newPage(browser, { touch: true, dark });
      await learnerAt(page, 'A2', { settings: { game_speed_challenge: true } });
      await go(page, 'games', '.game-levels');
      const hub = await page.textContent('#view');
      assert(!/איך מנקדים/.test(hub) && /איך סופרים נקודות\?/.test(hub), 'the scoring summary is not "איך סופרים נקודות?"');
      assert(!/הרמה שלך(?![א-ת])/.test(hub), 'the hub still says "הרמה שלך"');
      await go(page, 'games/A2/1', '[data-opt]:not([disabled])');
      await page.waitForTimeout(200);
      const k = await rightOption(page, 'A2');
      await page.click(`[data-opt="${(k + 1) % 4}"]`);
      await page.waitForSelector('.game-verdict');
      const v = await page.evaluate(() => {
        const g = document.querySelector('.game-verdict');
        const probe = (prop, value) => { const x = document.createElement('div'); x.style[prop] = value; document.body.append(x); const c = getComputedStyle(x)[prop]; x.remove(); return c; };
        return { text: g.textContent.replace(/\s+/g, ' '), bg: getComputedStyle(g).backgroundColor, key: probe('backgroundColor', 'var(--key)'), badTint: probe('backgroundColor', 'var(--bad-tint)'), bar: getComputedStyle(g).borderInlineStartColor, bad: probe('color', 'var(--bad)'), barW: parseFloat(getComputedStyle(g).borderInlineStartWidth) };
      });
      assert(/לא בדיוק/.test(v.text) && !/לא נכון/.test(v.text), `the wrong verdict: ${v.text}`);
      assert(v.bg === v.key && v.bg !== v.badTint, `verdict background ${v.bg}, lesson surface ${v.key}, bad tint ${v.badTint}`);
      assert(v.bar === v.bad && v.barW >= 3, `no --bad accent bar at the inline start: ${v.bar} ${v.barW}`);
      await shot(page, `pg5-quiz-wrong-390${dark ? '-dark' : ''}`);
      await ctx.close();
    }
  });
  // ---------- PG-6 ----------
  await check('PG-6. Leaving the word quiz after 2 answers and coming back offers "להמשיך משאלה 3 מתוך 10", which keeps the score; "סיבוב חדש" starts over', async () => {
    const { ctx, page } = await newPage(browser, { touch: true });
    await learnerAt(page, 'A2');
    await go(page, 'games/A2/1', '[data-opt]:not([disabled])');
    await page.waitForTimeout(200);
    const asked = [];
    for (let q = 0; q < 2; q++) {
      await page.waitForSelector('[data-opt]:not([disabled])');
      asked.push((await page.textContent('.game-word')).trim());
      await page.click(`[data-opt="${await rightOption(page, 'A2')}"]`);
      await page.waitForSelector('[data-next]');
      if (q === 0) { await page.click('[data-next]'); }
    }
    const score = (await page.textContent('.game-score')).match(/\d+/)[0];
    assert(score === '20', `score after two right answers: ${score}`);
    await go(page, 'today', '#view > *');
    await go(page, 'games/A2/1', '[data-resume-round]');
    const offer = (await page.textContent('[data-resume-round]')).replace(/\s+/g, ' ');
    assert(/שאלה 3/.test(offer) && /להמשיך משאלה 3 מתוך 10/.test(offer), `the resume key: ${offer}`);
    assert(await page.$('[data-new-round]'), 'no "סיבוב חדש"');
    await shot(page, 'pg6-resume-390');
    await page.click('[data-resume-round]');
    await page.waitForSelector('[data-opt]:not([disabled])');
    assert(/שאלה 3 מתוך 10/.test(await page.textContent('.step-count')), `resumed at ${await page.textContent('.step-count')}`);
    assert((await page.textContent('.game-score')).match(/\d+/)[0] === '20', 'the score was not kept');
    assert(!asked.includes((await page.textContent('.game-word')).trim()), 'question 3 repeats an earlier word');
    // A new round starts from question 1 with 0 points.
    await go(page, 'today', '#view > *');
    await go(page, 'games/A2/1', '[data-new-round]');
    await page.click('[data-new-round]');
    await page.waitForSelector('[data-opt]:not([disabled])');
    assert(/שאלה 1 מתוך 10/.test(await page.textContent('.step-count')) && (await page.textContent('.game-score')).match(/\d+/)[0] === '0', 'a new round did not start over');
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
