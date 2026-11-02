// Browser acceptance checks for the UX round 3 lane "first-run-today" (docs/qa/panels-r3/plan.json): Welcome,
// onboarding, placement, Today and its daily plan, the path and Progress. Serves lucid/ itself, drives Chromium
// through Playwright (Hebrew UI, phone 390x844 with touch and desktop 1440x900), prints one line per check and
// exits 1 on any failure.
// Usage: node tests/e2e/first-run-today.mjs [--only <substring>] [--shots <dir>]
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
const PORT = Number(process.env.LANE_PORT) || 9153;
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

// ---------- helpers ----------
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
async function newPage(browser, { viewport = PHONE, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  return { ctx, page };
}
const shot = (page, name, full = true) => (SHOTS ? page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full }) : null);
async function onboard(page, { start = 'zero', goals = ['travel'], minutes = 20, year = new Date().getFullYear() - 30 } = {}) {
  await page.goto(`${BASE}#/start`);
  await page.waitForSelector('#ob-form');
  await page.selectOption('#ob-year', String(year));
  await page.click('button[type=submit]');
  for (const g of goals) await page.click(`[data-goal="${g}"]`);
  await page.click(`[data-min="${minutes}"]`);
  await page.click('button[type=submit]');
  await page.click(`[data-start="${start}"]`);
  await page.click('button[type=submit]');
  await page.check('input[name=terms]');
  await page.click('button[type=submit]');
  await page.waitForTimeout(500);
}
// A learner at a course level, made through the app's own store.
async function learnerAt(page, level, { goals = ['travel'], minutes = 20, text = 100, lang = 'he' } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, goals, minutes, text, lang }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 1990, ui_language: lang, goals, created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: minutes, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, goals, minutes, text, lang });
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
// A lesson finished as the player records it: every exercise answered today, then passed.
async function finishLessonToday(page, id, score = 0.9) {
  await page.evaluate(async ({ id, score }) => {
    const L = await import('./js/core/learner.js');
    const lesson = await (await fetch(`content/lessons/${id}.json`)).json();
    L.startLesson(lesson);
    for (const e of lesson.exercises) L.recordAttempt({ source: 'lesson', lesson: id, exercise: e.id, topic: lesson.topics[0], skill: e.skill || 'grammar', level: lesson.level, correct: score >= 0.7 });
    L.finishLesson(lesson, { score, passed: score >= 0.7 });
  }, { id, score });
}
async function today(page) {
  await page.goto(`${BASE}#/today?t=${Date.now()}`);
  await page.waitForSelector('#view section[aria-labelledby="plan-h"]');
  await page.waitForTimeout(500);
}
// Answers whatever exercise is on screen (not necessarily right), as tests/e2e/run.mjs does.
function answerCurrent(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#exroot');
    const opts = [...root.querySelectorAll('.option')];
    if (opts.length) { opts[0].click(); return; }
    const gaps = [...root.querySelectorAll('.gap-input:not([readonly])')];
    if (gaps.length) { gaps.forEach((g) => { g.value = 'zzz'; g.dispatchEvent(new Event('input', { bubbles: true })); }); return; }
    const chips = [...root.querySelectorAll('[data-chip]')];
    if (chips.length) { chips[0].click(); return; }
    const ta = root.querySelector('textarea');
    if (ta) { ta.value = 'I am a student and I am happy today.'; ta.dispatchEvent(new Event('input', { bubbles: true })); return; }
    const ins = [...root.querySelectorAll('[data-in]')];
    if (ins.length) { for (const b of ins) b.click(); return; }
    const l = [...root.querySelectorAll('[data-l]')];
    if (l.length) { for (const a of l) { a.click(); root.querySelector(`[data-r="${a.dataset.l}"]`)?.click(); } return; }
    const items = [...root.querySelectorAll('[data-item]')];
    if (items.length) { for (let i = 0; i < 20; i++) { const it = root.querySelector('[data-item]'); if (!it) break; it.click(); root.querySelector('[data-bin]').click(); } return; }
    root.querySelector('[data-self="1"]')?.click();
  });
}
const planSection = '#view section[aria-labelledby="plan-h"]';

// ---------- server ----------
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- TF-1: text size from the first screen ----------
  await check('TF-1 text size on #/start at 390: 130% applies at once, survives a reload, opens lesson 1 at 130% and shows in Settings; Welcome cycles it', async () => {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/welcome`);
    await page.waitForSelector('[data-text-cycle]');
    await page.click('[data-text-cycle]');
    assert(await page.evaluate(() => document.documentElement.dataset.text) === '115', 'Welcome A+ did not move to 115%');
    assert(await page.evaluate(() => document.activeElement?.matches('[data-text-cycle]')), 'focus left the A+ control');
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    const before = await page.$eval('.onboard h1', (h) => parseFloat(getComputedStyle(h).fontSize));
    await page.click('[data-size="130"]');
    const after = await page.$eval('.onboard h1', (h) => parseFloat(getComputedStyle(h).fontSize));
    assert(after > before && await page.evaluate(() => document.documentElement.dataset.text) === '130', `130% did not apply at once (${before} -> ${after})`);
    await page.reload();
    await page.waitForSelector('#ob-form');
    assert(await page.evaluate(() => document.documentElement.dataset.text) === '130' && await page.getAttribute('[data-size="130"]', 'aria-pressed') === 'true', 'a reload lost the text size');
    await shot(page, 'tf1-start-130-390');
    await page.selectOption('#ob-year', '1990');
    await page.click('button[type=submit]');
    await page.click('[data-min="20"]');
    await page.click('button[type=submit]');
    await page.click('[data-start="zero"]');
    await page.click('button[type=submit]');
    await page.check('input[name=terms]');
    await page.click('button[type=submit]');
    await page.waitForURL(/#\/lesson\/pa1-01/);
    await page.waitForTimeout(400);
    assert(await page.evaluate(() => document.documentElement.dataset.text) === '130', 'lesson 1 did not open at 130%');
    await page.goto(`${BASE}#/settings`);
    await page.waitForTimeout(500);
    const pressed = await page.$$eval('button[aria-pressed="true"]', (x) => x.map((b) => b.textContent.trim()));
    assert(pressed.includes('130%'), `Settings does not show 130%: ${pressed}`);
    await ctx.close();
  });

  // ---------- TF-2: Today can say "done" ----------
  await check('TF-2 a whole lesson: Today says the plan is complete, no Enter key, extras under "רוצים עוד?" with a game, and the done text links to #/practice', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 20 });
    await page.goto(`${BASE}#/lesson/a2-01`);
    await page.waitForSelector('.lesson-intro');
    await finishLessonToday(page, 'a2-01');
    await today(page);
    const txt = await page.textContent(planSection);
    assert(/התוכנית להיום הושלמה/.test(txt), 'no "plan complete" headline');
    assert(!(await page.$(`${planSection} .key.enter`)), 'an orange start key is still there');
    assert(await page.$('.done-banner a[href="#/practice"]'), 'the done text does not link to #/practice');
    const more = await page.$$eval('.more-today a', (x) => x.map((a) => a.getAttribute('href')));
    assert(/רוצים עוד\?/.test(await page.textContent('.more-today h3')) && more.some((h) => h.startsWith('#/lesson/a2-02')) && more.some((h) => h.startsWith('#/games/A2/')), `extras: ${more}`);
    assert(!(await page.$('.more-today .key')), 'an extra is a key');
    await shot(page, 'tf2-done-full-390');
    await ctx.close();
  });

  await check('TF-2 only today\'s part (10 min, through the player): the same done state; a run under 50% reads "השיעור עוד פתוח"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 10 });
    const upto = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const l = await (await fetch('content/lessons/a2-01.json')).json(); return L.todayPlan(10, { lesson: l }).blocks.find((b) => b.id === 'learn').slice.upto; });
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-skip-learn]');
    for (let i = 0; i < upto; i++) {
      await page.waitForSelector('#exroot');
      await answerCurrent(page);
      const c = await page.$('[data-check]:not([disabled])'); if (c) await c.click(); else await page.click('[data-dontknow]');
      if (i < upto - 1 || await page.$('[data-next]')) { await page.waitForSelector('[data-next]'); await page.click('[data-next]'); }
    }
    await page.waitForSelector('.part-end');
    await page.click('[data-part-stop]');
    await page.waitForSelector(planSection);
    await page.waitForTimeout(500);
    assert(/התוכנית להיום הושלמה/.test(await page.textContent(planSection)) && !(await page.$(`${planSection} .key.enter`)), 'today\'s part done does not give the done state');
    assert(await page.$('.more-today a[href="#/lesson/a2-01?resume=1"]'), 'the rest of the lesson is not offered as an extra');
    await shot(page, 'tf2-done-part-390');
    const ids = await page.evaluate(async () => (await (await fetch('content/lessons/a2-01.json')).json()).exercises.map((e) => e.id));
    await page.evaluate((ids) => window.lucid.store.put('progress', { id: 'a2-01', level: 'A2', status: 'started', best_score: 0.3, last_score: 0.3, missed: { ids: ids.slice(1, 12), first: [], at: new Date().toISOString() } }), ids);
    await today(page);
    const lead = await page.textContent(planSection);
    assert(/השיעור עוד פתוח/.test(lead) && !/כמעט סיימת/.test(lead), 'a 30% run still reads "nearly done"');
    await ctx.close();
  });
  // ---------- TF-3: short days still move the lesson forward ----------
  await check('TF-3 10 minutes and 11 due words: review at most 3 דק׳ and timed from the cards, a part of at least 4; after the review it is not the main action; imported words are called new', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1', { minutes: 10 });
    await page.evaluate(async () => {
      const S = await import('./js/core/srs.js');
      const lesson = await (await fetch('content/lessons/pa1-03.json')).json();
      const before = new Date(Date.now() - 2 * 86_400_000);
      for (const c of S.vocabCardsFor(lesson, [], before).slice(0, 11)) {
        const card = S.review(c, S.Rating.Good, { now: before });
        window.lucid.store.put('cards', { ...card, fsrs: { ...card.fsrs, due: new Date(Date.now() - 3_600_000).toISOString() } });
      }
    });
    await today(page);
    const review = await page.$eval('.plan a[href^="#/review"]', (a) => a.textContent.replace(/\s+/g, ' '));
    const min = Number(review.match(/(\d+) דק׳/)[1]);
    assert(/11/.test(review) && min <= 3 && min === Math.ceil((11 * 10) / 60), `review row: ${review}`);
    assert(/לרענן/.test(review) && !/בדיוק לפני שכחה/.test(review), `due words are not called words to refresh: ${review}`);
    const learn = await page.$eval('.plan a[href^="#/lesson/"]', (a) => a.textContent);
    const upto = Number((learn.match(/עד תרגיל (\d+)/) || [])[1]);
    assert(upto >= 4, `lesson part: ${learn.replace(/\s+/g, ' ')}`);
    await shot(page, 'tf3-10min-390');
    await page.evaluate(async () => {
      const L = await import('./js/core/learner.js');
      const list = L.due();
      for (const c of list) L.gradeCard(c, { correct: c !== list[0] });
      L.logEvent({ type: 'review', mode: 'review', count: list.length, right: list.length - 1 });
    });
    await today(page);
    const key = await page.getAttribute('.start-bar a.key.enter', 'href');
    assert(key && !key.startsWith('#/review'), `after the review the main action is ${key}`);
    await ctx.close();
    const b = await newPage(browser);
    await learnerAt(b.page, 'B1', { minutes: 20 });
    await today(b.page);
    await b.page.click('[data-import]');
    await b.page.waitForTimeout(800);
    const row = await b.page.$eval('.plan a[href^="#/review"]', (a) => a.textContent);
    assert(/מילים חדשות: סבב ראשון/.test(row), `imported words are not called new: ${row.replace(/\s+/g, ' ')}`);
    await b.ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
if (pageErrors.length) console.log(`page errors:\n  ${pageErrors.join('\n  ')}`);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
