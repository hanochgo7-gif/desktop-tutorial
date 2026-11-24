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
      // A matching board checks itself when the last pair locks (EX-1); a wrong typed answer gets a second try
      // first (LF-6), and "Show the answer" moves on.
      if (!(await page.$('[data-next]'))) { const c = await page.$('[data-check]:not([disabled])'); if (c) await c.click(); else await page.click('[data-dontknow]'); }
      if (await page.$('[data-show-answer]')) await page.click('[data-show-answer]');
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
  // ---------- TF-4: goals stay visible on short days ----------
  await check('TF-4 travel goal and 10 minutes: Today offers an optional travel scenario line that opens #/scenario/<id>; step 2 explains 10 minutes under the time choice', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics', goals: ['travel'], minutes: 10 });
    await page.waitForSelector('[data-begin]');
    // The placement test places this learner at A2 (their own estimate stands in for the test here).
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const P = await import('./js/core/placement.js'); await L.applyPlacement(P.selfReportResult('A2')); });
    await today(page);
    const offer = await page.$('.more-list a[href^="#/scenario/"]');
    assert(offer, 'no optional scenario line under the 10-minute plan');
    assert(/יש עוד 4 דקות\?/.test(await offer.textContent()), `the line does not ask for 4 more minutes: ${await offer.textContent()}`);
    assert(!(await page.$('.plan a[href^="#/scenario/"].plan-item:not(.more-item)')), 'the scenario was put inside the 10-minute plan');
    await shot(page, 'tf4-today-10-travel-390');
    await offer.click();
    await page.waitForURL(/#\/scenario\/rl-/);
    await page.goto(`${BASE}#/start?again=1`);
    await page.waitForSelector('#ob-form');
    await page.selectOption('#ob-year', '1990');
    await page.click('button[type=submit]');
    const note = await page.textContent('#ob-min-note');
    // UX r4 TP-9: the note says when goal suggestions begin (from A1).
    assert(/ב-10 דקות: שיעור וחזרה\. ההצעות לפי המטרות מתחילות מרמה A1, ומ-20 דקות הן בתוך התוכנית\./.test(note), `step 2 note: ${note}`);
    const below = await page.evaluate(() => { const g = document.querySelector('[role="radiogroup"][aria-labelledby="ob-min-h"]'); return g.nextElementSibling?.id; });
    assert(below === 'ob-min-note', 'the note is not right under the minutes choice');
    assert(/דיבור וכתיבה לסירוגין/.test(await page.textContent('[data-goal="everyday"]')) && !/לא משנה את התוכנית/.test(await page.textContent('#ob-form')), 'the everyday goal still says it changes nothing');
    await ctx.close();
  });

  // ---------- TF-5: today's minutes, labelled and for today only ----------
  await check('TF-5 tapping 35 on #/today: a visible label names the control, a status line appears, #/settings keeps the daily minutes, and the next day the default is back', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 20 });
    await today(page);
    const named = await page.$eval('#view .seg:has([data-min])', (g) => { const l = document.getElementById(g.getAttribute('aria-labelledby')); return l && l.offsetParent ? l.textContent.trim() : null; });
    assert(named === 'כמה זמן יש לכם היום?', `the minutes control is named ${named}`);
    await page.click('[data-min="35"]');
    await page.waitForTimeout(300);
    const status = await page.$eval('[data-min-status]', (s) => ({ role: s.getAttribute('role'), text: s.textContent.trim() }));
    assert(status.role === 'status' && status.text === 'התוכנית עודכנה ל-35 דקות', `status: ${JSON.stringify(status)}`);
    assert(await page.evaluate(() => document.activeElement?.dataset.min === '35'), 'focus left the minutes control');
    await shot(page, 'tf5-today-35-390', false);
    await page.goto(`${BASE}#/settings`);
    await page.waitForTimeout(500);
    const pressed = (await page.$$eval('button[aria-pressed="true"]', (x) => x.map((b) => b.textContent.trim()))).filter((t) => /דק׳/.test(t));
    assert(pressed.length === 1 && pressed[0] === '20 דק׳', `Settings shows ${pressed}`);
    assert(await page.evaluate(() => window.lucid.store.get('settings', 'me').daily_minutes) === 20, 'the daily minutes changed');
    await page.evaluate(() => window.lucid.store.update('settings', 'me', { today_minutes: { date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), n: 35 } }));
    await today(page);
    assert(await page.$eval('[data-min][aria-pressed="true"]', (b) => b.dataset.min) === '20', 'yesterday\'s choice still counts today');
    const plan = await page.evaluate(async () => (await import('./js/core/learner.js')).todayPlan().minutes);
    assert(plan <= 22, `the next day plans ${plan} minutes`);
    await ctx.close();
  });

  // ---------- TF-6: onboarding by keyboard and screen reader ----------
  await check('TF-6 #/start by keyboard: steps open on their h1, ArrowDown moves the minutes choice, a missing year focuses the select (aria-invalid, message under it), goal cards show a check; #/profile uses the same cards', async () => {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    await page.focus('button[type=submit]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const err = await page.evaluate(() => { const a = document.activeElement; const msg = document.getElementById('ob-err'); return { id: a.id, invalid: a.getAttribute('aria-invalid'), desc: a.getAttribute('aria-describedby'), next: a.nextElementSibling?.id, msg: msg?.textContent.trim() }; });
    assert(err.id === 'ob-year' && err.invalid === 'true' && err.desc.split(' ').includes('ob-err') && err.next === 'ob-err' && /שנת לידה/.test(err.msg), `missing year: ${JSON.stringify(err)}`);
    await shot(page, 'tf6-year-error-390');
    await page.selectOption('#ob-year', '1990');
    await page.focus('button[type=submit]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => document.activeElement?.tagName === 'H1' && document.activeElement.id === 'ob-h'), 'step 2 does not open with focus on its h1');
    assert(await page.$eval('[role="radiogroup"][aria-labelledby="ob-min-h"]', (g) => document.getElementById(g.getAttribute('aria-labelledby'))?.textContent.trim().length > 0), 'the minutes group has no name');
    await page.focus('[data-goal="travel"]');
    await page.keyboard.press('Enter');
    const check = await page.$eval('[data-goal="travel"] .ob-mark.check', (m) => ({ pressed: m.parentElement.getAttribute('aria-pressed'), bg: getComputedStyle(m).backgroundColor, icon: Boolean(m.querySelector('svg')) }));
    assert(check.pressed === 'true' && check.icon && check.bg !== 'rgba(0, 0, 0, 0)', `the chosen goal shows no check: ${JSON.stringify(check)}`);
    assert(await page.$('[data-min] .ob-mark.radio'), 'minutes cards have no round dot');
    await page.focus('[data-min][tabindex="0"]');
    const before = await page.evaluate(() => document.activeElement.dataset.min);
    await page.keyboard.press('ArrowDown');
    const after = await page.evaluate(() => ({ focus: document.activeElement.dataset.min, checked: document.querySelector('[data-min][aria-checked="true"]')?.dataset.min, stops: document.querySelectorAll('[data-min][tabindex="0"]').length }));
    assert(before === '20' && after.focus === '35' && after.checked === '35' && after.stops === 1, `ArrowDown: ${before} -> ${JSON.stringify(after)}`);
    await shot(page, 'tf6-step2-390');
    await page.focus('button[type=submit]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => document.activeElement?.id === 'ob-h'), 'step 3 does not open on its h1');
    await page.focus('button[type=submit]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => document.activeElement?.matches('[data-start]') && document.activeElement.closest('[role=radiogroup]').getAttribute('aria-invalid') === 'true'), 'a missing start point does not focus its group');
    await ctx.close();
    const p = await newPage(browser);
    await learnerAt(p.page, 'A2', { goals: ['travel'] });
    await p.page.goto(`${BASE}#/profile`);
    await p.page.waitForSelector('[data-goal="travel"]');
    assert(!(await p.page.$('#view input[type=checkbox]')), 'Profile still uses native checkboxes for goals');
    assert(await p.page.getAttribute('[data-goal="travel"]', 'aria-pressed') === 'true' && /טיולים ונסיעות לחו״ל/.test(await p.page.textContent('[data-goal="travel"]')), 'Profile goals do not use the onboarding cards and labels');
    await p.page.click('[data-goal="studies"]');
    await p.page.click('[data-form] button[type=submit]');
    await p.page.waitForTimeout(300);
    const goals = await p.page.evaluate(() => window.lucid.store.get('profile', 'me').goals);
    assert(goals.includes('travel') && goals.includes('studies'), `Profile did not save the goals: ${goals}`);
    await shot(p.page, 'tf6-profile-390');
    await p.ctx.close();
  });

  // ---------- TF-7: no AI consent where there is no AI ----------
  await check('TF-7 device-only #/start step 4: no AI checkbox, only the one line; the terms checkbox\'s name is 12 words or fewer', async () => {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    await page.selectOption('#ob-year', '1990');
    await page.click('button[type=submit]');
    await page.click('button[type=submit]');
    await page.click('[data-start="basics"]');
    await page.click('button[type=submit]');
    await page.waitForSelector('input[name=terms]');
    assert(!(await page.$('input[name=ai_consent]')), 'an AI checkbox is still there');
    const line = (await page.textContent('.ob-ai-off')).trim();
    assert(line === 'AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם.', `AI line: ${line}`);
    const name = await page.evaluate(() => { const i = document.querySelector('input[name=terms]'); return [...i.labels].map((l) => l.textContent).join(' ').trim(); });
    assert(name.split(/\s+/).length <= 12, `the terms name has ${name.split(/\s+/).length} words`);
    const box = await page.$eval('input[name=terms]', (i) => { const r = i.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    assert(box[0] >= 24 && box[1] >= 24, `the box is ${box}`);
    await shot(page, 'tf7-step4-390');
    await ctx.close();
  });
  // ---------- TF-8: Progress shows what the evidence is ----------
  await check('TF-8 after a 100% grammar lesson today, the #/progress grammar row shows the evidence and "יום 1 מתוך 2"; after a passed B2 level check the row mentions it; the placement row says "נראה טוב גם ב-"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B2');
    await page.evaluate(async () => {
      const L = await import('./js/core/learner.js');
      const lesson = await (await fetch('content/lessons/b2-01.json')).json();
      for (const e of lesson.exercises) L.recordAttempt({ source: 'lesson', lesson: 'b2-01', exercise: e.id, topic: lesson.topics[0], skill: 'grammar', level: 'B2', correct: true });
    });
    await page.goto(`${BASE}#/progress`);
    await page.waitForSelector('.skills');
    const grammar = async () => (await page.$$eval('.skills .skill-row', (x) => x.map((r) => r.textContent.replace(/\s+/g, ' ').trim()))).find((t) => t.startsWith('דקדוק'));
    const row = await grammar();
    assert(/אוספים ראיות: \d+ תשובות ב-B2, 100% נכון/.test(row) && /יום 1 מתוך 2/.test(row) && !/עוד לא נבדק/.test(row), `grammar row: ${row}`);
    await page.evaluate(async () => {
      const L = await import('./js/core/learner.js');
      for (let i = 0; i < 16; i++) L.recordAttempt({ source: 'checkpoint', lesson: `b2-0${1 + (i % 5)}`, exercise: `c${i}`, topic: 'x', skill: i % 2 ? 'grammar' : 'vocabulary', level: 'B2', correct: i !== 3 && i !== 8 });
      window.lucid.store.put('progress', { id: 'check:B2', level: 'B2', kind: 'checkpoint', status: 'completed', best_score: 0.88, last_score: 0.88, attempts: 1, completed_at: new Date().toISOString() });
    });
    await page.goto(`${BASE}#/progress?t=${Date.now()}`);
    await page.waitForSelector('.skills');
    const after = await grammar();
    assert(/B2 בבדיקת רמה, 88%/.test(after), `the grammar row does not mention the level check: ${after}`);
    await shot(page, 'tf8-progress-390');
    // The placement result: a capped skill reads as something to confirm, not a contradiction.
    await page.evaluate(async () => {
      const L = await import('./js/core/learner.js');
      const P = await import('./js/core/placement.js');
      const A = await import('./js/core/adaptive.js');
      const bank = await (await fetch('content/placement.json')).json();
      window.lucid.store.remove('placement', 'latest');
      L.saveProfile({ start_choice: 'basics', goals: ['travel'] });
      const t = P.createPlacement(bank.items, { start: 'A1' });
      let item;
      while ((item = t.next())) t.answer(item, { correct: item.level === 'A2' ? ['grammar', 'reading'].includes(item.skill) : A.LEVELS.indexOf(item.level) <= 1 });
      L.savePlacementDraft({ start: 'A1', answers: t.answers });
    });
    await page.goto(`${BASE}#/placement?t=${Date.now()}`);
    await page.click('[data-begin]');
    await page.waitForSelector('.onboard h1');
    const result = await page.textContent('.onboard .panel');
    assert(/נראה טוב גם ב-A2 \(\d מתוך \d\), יאושר בבדיקת רמה/.test(result.replace(/\s+/g, ' ')) && !/נכונות ב-A2/.test(result), `placement rows: ${result.replace(/\s+/g, ' ')}`);
    await shot(page, 'tf8-placement-result-390');
    await ctx.close();
  });
  // ---------- TF-9: placement: how long, what next, readable items ----------
  await check('TF-9 #/placement: the intro offers "להתחיל מהאותיות (Pre-A1)" and "להתחיל ב-A1"; the counter says "מתוך כ-"; the bar stays under 90% until the last block; a reading item has its passage and question apart; the result names the level above', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    await page.waitForSelector('[data-begin]');
    const offers = await page.$$eval('.no-test button', (x) => x.map((b) => b.textContent.trim()));
    assert(offers.includes('להתחיל מהאותיות (Pre-A1)') && offers.includes('להתחיל ב-A1'), `intro offers: ${offers}`);
    await page.click('[data-begin]');
    const bank = await page.evaluate(async () => (await (await fetch('content/placement.json')).json()).items);
    const order = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const seen = [];
    let reading = null;
    for (let i = 0; i < 40 && await page.$('#exroot'); i++) {
      const s = await page.evaluate(() => ({ counter: document.querySelector('.pl-count')?.textContent.trim(), bar: parseFloat(document.querySelector('.player-top .progress > span').style.width), opts: [...document.querySelectorAll('#exroot .option')].map((o) => o.textContent.trim().replace(/^\d\s*/, '')) }));
      seen.push(s);
      if (!reading && await page.$('.pl-reading')) {
        reading = await page.evaluate(() => ({ passage: document.querySelector('.pl-reading .passage')?.textContent.trim(), question: document.querySelector('.pl-reading .pl-question strong')?.textContent.trim() }));
        await shot(page, 'tf9-reading-390', false);
      }
      // A B1 learner: right up to B1, "I don't know" above it.
      const item = bank.find((it) => it.options?.length === s.opts.length && it.options.every((o, k) => o === s.opts[k]));
      if (item && order.indexOf(item.level) <= order.indexOf('B1') && item.type !== 'gap') { await page.click(`#exroot .option[data-opt="${item.answer}"]`); await page.click('[data-answer]'); } else await page.click('[data-idk]');
      await page.waitForTimeout(40);
    }
    await page.waitForSelector('.onboard h1');
    assert(seen.length >= 8 && seen.every((s) => /^שאלה \d+ מתוך כ-\d+$/.test(s.counter)), `counters: ${seen.map((s) => s.counter)}`);
    const early = seen.slice(0, Math.max(0, seen.length - 4));
    assert(early.every((s) => s.bar < 90), `the bar passed 90% before the last block: ${seen.map((s) => Math.round(s.bar))}`);
    assert(reading && reading.passage.length > 40 && reading.question.endsWith('?') && !reading.passage.includes(reading.question), `reading item: ${JSON.stringify(reading)}`);
    const ceiling = await page.textContent('.pl-ceiling').catch(() => '');
    assert(/^ב-B2, הרמה שמעל: \d+ מתוך \d+ נכונות\.$/.test(ceiling.trim()), `the result does not name the level above: ${ceiling}`);
    await shot(page, 'tf9-result-390');
    await ctx.close();
  });
  // ---------- TF-10: Today and Welcome layout ----------
  await check('TF-10 at 390 on #/today the start key is 20px or more above the plan and plan text runs 260px or wider; at 1440 the Welcome h1 takes 3 lines at most; an A1 start key is in Hebrew; the review key names its words', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await today(page);
    const m = await page.evaluate(() => {
      const a = document.querySelector('.start-bar').getBoundingClientRect(); const b = document.querySelector('ol.plan').getBoundingClientRect();
      return { gap: b.top - a.bottom, cols: [...document.querySelectorAll('ol.plan .plan-item > .why')].map((e) => e.getBoundingClientRect().width), key: document.querySelector('.start-bar a').textContent.trim() };
    });
    assert(m.gap >= 20, `gap ${m.gap}`);
    assert(m.cols.length && m.cols.every((w) => w >= 260), `text columns ${m.cols}`);
    assert(/^להתחיל: הווה פשוט/.test(m.key), `the A1 key: ${m.key}`);
    await shot(page, 'tf10-today-a1-390');
    await page.evaluate(async () => {
      const S = await import('./js/core/srs.js');
      const lesson = await (await fetch('content/lessons/pa1-03.json')).json();
      for (const c of S.vocabCardsFor(lesson, [], new Date()).slice(0, 8)) window.lucid.store.put('cards', c);
    });
    await today(page);
    const review = (await page.textContent('.start-bar a')).trim();
    assert(review === 'להתחיל: חזרה על 8 מילים', `review key: ${review}`);
    await ctx.close();
    const d = await newPage(browser, { viewport: DESKTOP });
    await d.page.goto(`${BASE}#/welcome`);
    await d.page.waitForSelector('.welcome h1');
    const h1 = await d.page.$eval('.welcome h1', (e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)));
    assert(h1 <= 3, `the welcome h1 takes ${h1} lines at 1440`);
    const cta = await d.page.evaluate(() => document.querySelector('.check-rows').getBoundingClientRect().top - document.querySelector('.welcome .start-bar').getBoundingClientRect().bottom);
    assert(cta >= 20, `the welcome CTA is ${cta}px from its list`);
    await shot(d.page, 'tf10-welcome-1440', false);
    await d.ctx.close();
  });
  // ---------- TF-11: path details ----------
  await check('TF-11 #/path/A2 as an A2 learner has no button that does nothing; an in-progress lesson link ends with ?resume=1; "Pre-A1" stays on one line on the rail; the level\'s Hebrew name starts at the heading\'s edge', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.evaluate(async () => {
      const l = await (await fetch('content/lessons/a2-03.json')).json();
      window.lucid.store.put('progress', { id: 'a2-03', level: 'A2', status: 'started', resume: { qi: 3, queue: l.exercises.map((e) => [e.id, false]), first: [], at: new Date().toISOString() } });
    });
    await page.goto(`${BASE}#/path/A2`);
    await page.waitForSelector('.lesson-list');
    assert(!(await page.$('[data-move="A2"]')), 'the current level still offers "Start from A2"');
    assert(/זו הרמה הנוכחית שלכם/.test(await page.textContent('.path-current')), 'the current level is not named in words');
    const checks = await page.$$eval('#view a[href="#/checkpoint/A2"]', (x) => x.map((a) => a.textContent.trim()));
    assert(checks.includes('לבדיקת רמה A2') && !checks.some((t) => /לבחון את עצמי/.test(t)), `checkpoint links: ${checks}`);
    assert(await page.getAttribute('a[href^="#/lesson/a2-03"]', 'href') === '#/lesson/a2-03?resume=1', 'the in-progress lesson link does not resume');
    const edge = await page.$eval('.path-level-h', (h) => Math.abs(h.querySelector('.l-en').getBoundingClientRect().right - h.querySelector('.l-he').getBoundingClientRect().right));
    assert(edge <= 1, `the Hebrew level name is ${edge}px off the heading's edge`);
    await shot(page, 'tf11-path-a2-390');
    for (const viewport of [PHONE, DESKTOP]) {
      const p = viewport === PHONE ? page : (await newPage(browser, { viewport })).page;
      if (p !== page) await learnerAt(p, 'A2');
      await today(p);
      const pre = await p.$eval('.level-rail-labels [data-l="PreA1"]', (s) => { const r = document.createRange(); r.selectNodeContents(s); return { lines: r.getClientRects().length, size: parseFloat(getComputedStyle(s).fontSize), text: s.textContent }; });
      assert(pre.text === 'Pre-A1' && pre.lines === 1 && pre.size >= 12, `Pre-A1 label at ${viewport.width}: ${JSON.stringify(pre)}`);
      if (p !== page) await p.context().close();
    }
    await ctx.close();
  });
  // ---------- TF-12: Today's offers come at the right time ----------
  await check('TF-12 a new B1 learner sees the plan first (the English-UI offer waits for 3 active days, below the plan); adding words leaves a focused inline status; the English UI shows the rewritten strings', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1', { minutes: 10 });
    await today(page);
    const first = await page.evaluate(() => document.querySelector('.page-head').nextElementSibling?.className);
    assert(first === 'today', `the first block after the header is ${first}`);
    assert(!(await page.$('[data-ui-en]')), 'the English-UI offer greets a learner who just chose Hebrew');
    await page.click('[data-import]');
    await page.waitForSelector('[data-import-status]');
    const status = await page.evaluate(() => ({ focus: document.activeElement?.matches('[data-import-status]'), text: document.querySelector('[data-import-status]').textContent.trim(), role: document.querySelector('[data-import-status]').getAttribute('role') }));
    assert(status.focus && status.role === 'status' && /^נוספו \d+ מילים לחזרה\. עד 8 חדשות ביום\.$/.test(status.text), `import status: ${JSON.stringify(status)}`);
    await shot(page, 'tf12-import-390');
    // Three active days: the offer appears, after the plan.
    await page.evaluate(() => { for (let d = 1; d <= 3; d++) window.lucid.store.put('attempts', { id: `day${d}`, at: new Date(Date.now() - d * 86_400_000).toISOString(), source: 'lesson', lesson: 'b1-01', exercise: `x${d}`, skill: 'grammar', level: 'B1', correct: true, score: 1 }); });
    await today(page);
    const order = await page.evaluate(() => { const offer = document.querySelector('[data-ui-en]'); const plan = document.querySelector('ol.plan'); return offer && plan ? Boolean(plan.compareDocumentPosition(offer) & Node.DOCUMENT_POSITION_FOLLOWING) : null; });
    assert(order === true, `the English-UI offer is not below the plan (${order})`);
    await ctx.close();
    const en = await newPage(browser);
    await learnerAt(en.page, 'B1', { minutes: 10, lang: 'en' });
    await today(en.page);
    const txt = await en.page.textContent(planSection);
    assert(/You skipped A2\. Add its key words to your reviews\? Up to 8 new a day\./.test(txt), 'the English import offer is not rewritten');
    assert(/Today you'll do part of this \d+-minute lesson: up to exercise \d+ of \d+\./.test(txt), 'the English lesson part line is not rewritten');
    await en.ctx.close();
  });

  // ---------- perf lane "content" (docs/perf/plan.json) ----------
  await check('PERF-C7. A day-1 learner\'s Today draws once per load, with the lesson card and its real length', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    for (const route of ['#/today', `#/today?t=${Date.now()}`]) {
      await page.goto(`${BASE}${route}`);
      await page.reload();
      await page.waitForSelector('#view section[aria-labelledby="plan-h"]');
      await page.waitForTimeout(1200);
      const draws = await page.evaluate(() => performance.getEntriesByName('today:draw').length);
      assert(draws === 1, `${route}: Today drew ${draws} times`);
      const learn = await page.textContent('.plan');
      assert(/pa1-01|Pre-A1|\d+ (דקות|min)/.test(learn) && await page.$('.plan a[href^="#/lesson/pa1-01"]'), 'no lesson card for the first lesson');
    }
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
if (pageErrors.length) console.log(`page errors:\n  ${pageErrors.join('\n  ')}`);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
