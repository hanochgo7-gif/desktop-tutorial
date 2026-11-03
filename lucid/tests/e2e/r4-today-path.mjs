// Browser acceptance checks for the UX round 4 lane "today-path" (docs/qa/panels-r3-retest/plan-r4.json): Today,
// the daily plan and day status, onboarding, placement, the path, Progress and Welcome. Serves lucid/ itself,
// drives Chromium through Playwright (Hebrew UI; phone 390x844 with touch, 320x568, and desktop 1440x900), prints
// one line per check and exits 1 on any failure.
// Usage: node tests/e2e/r4-today-path.mjs [--only <substring>] [--shots <dir>] [--port <n>]  (or R4_PORT=<n>)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const PORT = Number(arg('--port')) || Number(process.env.R4_PORT) || 9723;
const BASE = `http://127.0.0.1:${PORT}/`;
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
const SMALL = { width: 320, height: 568 };
const DESKTOP = { width: 1440, height: 900 };
async function newPage(browser, { viewport = PHONE, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: false, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light', bypassCSP: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  return { ctx, page };
}
// Viewport screenshots: a full-page shot on an emulated touch phone resets the pointer media features.
const shot = (page, name, full = false) => (SHOTS ? page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full }) : null);
// A learner at a course level, made through the app's own store.
async function learnerAt(page, level, { goals = ['travel'], minutes = 20, text = 100, lang = 'he', support = 'auto' } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, goals, minutes, text, lang, support }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 1990, ui_language: lang, goals, created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: minutes, text_size: text, hebrew_support: support });
    await L.applyPlacement(level === 'PreA1' ? P.zeroResult() : P.selfReportResult(level));
  }, { level, goals, minutes, text, lang, support });
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
// Today's part of a lesson, as the player leaves it at the part end: the part's first tries answered today and
// the saved place right after them. speak: also log a self-rated lesson speak item (TP-4).
async function partToday(page, id, { minutes, speak = false } = {}) {
  return page.evaluate(async ({ id, minutes, speak }) => {
    const L = await import('./js/core/learner.js');
    const lesson = await (await fetch(`content/lessons/${id}.json`)).json();
    const upto = L.todayPlan(minutes, { lesson }).blocks.find((b) => b.id === 'learn').slice.upto;
    L.startLesson(lesson);
    for (const e of lesson.exercises.slice(0, upto)) L.recordAttempt({ source: 'lesson', lesson: id, exercise: e.id, topic: lesson.topics[0], skill: e.skill || 'grammar', level: lesson.level, correct: true });
    if (speak) L.logEvent({ type: 'speaking', lesson: id, self: 1, recognised: false });
    const p = L.progressOf(id);
    window.lucid.store.put('progress', { ...p, resume: { qi: upto, queue: lesson.exercises.map((e) => [e.id, false]), at: new Date().toISOString() } });
    return upto;
  }, { id, minutes, speak });
}
async function today(page) {
  await page.goto(`${BASE}#/today?t=${Date.now()}`);
  await page.waitForSelector('#view section[aria-labelledby="plan-h"]');
  await page.waitForTimeout(600);
}
const planSection = '#view section[aria-labelledby="plan-h"]';
const doneRow = '.plan a.plan-item.done[href*="lesson/"]';
async function axeContrast(page, selector) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (sel) => {
    const out = await window.axe.run({ include: [[sel]] }, { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return out.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message || ''}`));
  }, selector);
}

// ---------- server ----------
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- TP-1: one day-status rule ----------
  await check('TP-1 pa1-01 finished on a 10-minute day: Today shows the done banner, and a [data-first-recall] link to #/review sits above #more-h', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1', { minutes: 10 });
    await finishLessonToday(page, 'pa1-01');
    await today(page);
    assert(await page.$('.done-banner'), 'no done banner');
    const link = await page.$('[data-first-recall]');
    assert(link, 'no first-recall line');
    const href = await link.getAttribute('href');
    assert(href && href.startsWith('#/review'), `first-recall link: ${href}`);
    assert(/המילים החדשות של היום מחכות לסבב ראשון/.test(await link.textContent()), `first-recall text: ${await link.textContent()}`);
    const above = await page.evaluate(() => {
      const a = document.querySelector('[data-first-recall]'); const h = document.querySelector('#more-h');
      return Boolean(a && h && (a.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) && a.getBoundingClientRect().bottom <= h.getBoundingClientRect().top);
    });
    assert(above, 'the first-recall line is not above "רוצים עוד?"');
    assert(!(await page.$('.more-today a.plan-item[href^="#/review"]')), 'the review is listed again among the extras');
    const fromModule = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const T = await import('./js/views/today.js'); return [typeof L.dayStatus, typeof T.todayMinutes, L.dayStatus().complete]; });
    assert(fromModule[0] === 'function' && fromModule[1] === 'function' && fromModule[2] === true, `exports: ${fromModule}`);
    await shot(page, 'tp1-first-recall-390');
    await ctx.close();
  });

  // ---------- TP-2: done rows say what was done ----------
  await check('TP-2 a part of a2-01 on 10 minutes: the done row says "N תרגילים" with no minutes, unchanged at 20 minutes; the banner has no digits', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 10 });
    const upto = await partToday(page, 'a2-01', { minutes: 10 });
    await today(page);
    const time = await page.textContent(`${doneRow} .plan-time`);
    assert(/תרגילים/.test(time) && !/דק׳/.test(time) && time.includes(String(upto)), `done row time cell: ${time}`);
    const banner = await page.textContent('.done-banner strong');
    assert(!/\d/.test(banner), `banner: ${banner}`);
    const before = (await page.textContent(doneRow)).replace(/\s+/g, ' ');
    await shot(page, 'tp2-done-row-10');
    await page.click('[data-min="20"]');
    await page.waitForTimeout(600);
    assert(await page.$(doneRow), 'the done row reopened at 20 minutes');
    const after = (await page.textContent(doneRow)).replace(/\s+/g, ' ');
    assert(after === before, `row changed: "${before}" -> "${after}"`);
    await shot(page, 'tp2-done-row-20');
    await ctx.close();
  });

  // ---------- TP-3: done cards keep AA contrast ----------
  for (const dark of [false, true]) {
    await check(`TP-3 a part of a1-01 (${dark ? 'dark' : 'light'}): the done card is not faded, passes axe color-contrast, and reads "הושלם היום", not "המשך:"`, async () => {
      const { ctx, page } = await newPage(browser, { dark });
      await learnerAt(page, 'A1', { minutes: 10 });
      await partToday(page, 'a1-01', { minutes: 10 });
      await today(page);
      const op = await page.$eval(doneRow, (a) => getComputedStyle(a).opacity);
      assert(op === '1', `opacity ${op}`);
      const text = await page.textContent(doneRow);
      assert(/הושלם היום/.test(text) && !/המשך:/.test(text), `done card: ${text.replace(/\s+/g, ' ')}`);
      // The rest of the lesson is offered only under "רוצים עוד?", never as a second card beside the done one.
      const resumeRows = await page.$$eval('a.plan-item[href*="lesson/a1-01"]', (x) => x.map((a) => Boolean(a.closest('.more-today'))));
      assert(resumeRows.length >= 1 && resumeRows.filter((x) => !x).length === 1, `lesson cards outside "רוצים עוד?": ${resumeRows}`);
      const bad = await axeContrast(page, '.plan-item.done');
      assert(!bad.length, bad.join(' | '));
      await shot(page, `tp3-done-card-${dark ? 'dark' : 'light'}`);
      await ctx.close();
    });
  }

  // ---------- TP-4: speaking is ticked only for speaking practice ----------
  await check('TP-4 a pa1-01 part with a self-rated speak item, then 35 minutes: ol.plan has no ticked "דיבור" row', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1', { minutes: 10, goals: [] });
    await partToday(page, 'pa1-01', { minutes: 10, speak: true });
    await today(page);
    await page.click('[data-min="35"]');
    await page.waitForTimeout(600);
    const ticked = await page.$$eval('ol.plan a.plan-item.done', (x) => x.map((a) => a.textContent.replace(/\s+/g, ' ')));
    assert(!ticked.some((t) => /דיבור/.test(t)), `ticked rows: ${ticked.join(' | ')}`);
    await shot(page, 'tp4-35min');
    await ctx.close();
  });

  // ---------- TP-5: Hebrew leads the can-do lines at full support ----------
  await check('TP-5 Pre-A1: Today\'s lesson card leads with the Hebrew can-do (.bi-he.primary before the English); B2 with minimal support: the path row shows no Hebrew can-do', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1', { minutes: 20 });
    await today(page);
    const card = '.plan a.plan-item[href*="lesson/pa1-01"]';
    const order = await page.$eval(card, (a) => {
      const he = a.querySelector('.bi-he.primary'); const en = he?.parentElement.querySelector('.bi-en');
      return he && en ? { he: he.textContent.trim(), first: Boolean(he.compareDocumentPosition(en) & Node.DOCUMENT_POSITION_FOLLOWING), lang: he.getAttribute('lang') } : null;
    });
    assert(order && /[א-ת]/.test(order.he) && order.first && order.lang === 'he', `can-do on the lesson card: ${JSON.stringify(order)}`);
    await shot(page, 'tp5-today-prea1');
    const b = await newPage(browser);
    await learnerAt(b.page, 'B2', { minutes: 20, support: 'minimal' });
    await b.page.goto(`${BASE}#/path/B2`);
    await b.page.waitForSelector('.lesson-row');
    await b.page.waitForTimeout(300);
    const he = await b.page.$$eval('.lesson-row .can-do', (x) => x.filter((c) => [...c.querySelectorAll('[lang="he"]')].some((s) => !s.hidden && s.offsetParent !== null)).length);
    const rows = await b.page.$$eval('.lesson-row .can-do', (x) => x.length);
    assert(rows > 0 && he === 0, `${he} of ${rows} B2 path rows show a Hebrew can-do`);
    assert(!(await b.page.$('.lesson-row button')), 'a button inside a path link');
    await shot(b.page, 'tp5-path-b2-minimal');
    await b.ctx.close();
    await ctx.close();
  });

  // ---------- TP-6: the path and Today act on a passed level check ----------
  await check('TP-6 check:B2 completed at 75%: #/path/B2 says "עברה" with a link to the first C1 lesson and no "לבדיקת רמה B2" key; Today offers the same', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B2', { minutes: 20 });
    await page.evaluate(() => window.lucid.store.put('progress', { id: 'check:B2', level: 'B2', kind: 'checkpoint', status: 'completed', best_score: 0.75, last_score: 0.75, attempts: 1, completed_at: new Date().toISOString() }));
    await page.goto(`${BASE}#/path/B2`);
    await page.waitForSelector('.lesson-row');
    await page.waitForTimeout(300);
    const text = await page.textContent('#view');
    assert(/עברה/.test(text) && /75%/.test(text), 'the path does not say the check was passed');
    assert(await page.$('#view a[href="#/lesson/c1-01"]'), 'no link to the first C1 lesson');
    const keys = await page.$$eval('#view a.key, #view button.key', (x) => x.map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
    assert(!keys.some((k) => /לבדיקת רמה/.test(k)), `keys: ${keys.join(' | ')}`);
    await page.evaluate(() => document.querySelector('[data-check-passed]')?.scrollIntoView({ block: 'center' }));
    await shot(page, 'tp6-path-b2');
    await today(page);
    const offer = await page.$('[data-check-passed]');
    assert(offer && /עברה/.test(await offer.textContent()) && await offer.$('a[href="#/lesson/c1-01"]'), 'Today does not show the passed check and the way on to C1');
    await offer.scrollIntoViewIfNeeded();
    await shot(page, 'tp6-today');
    // Once a C1 lesson was opened, Today no longer repeats it.
    await page.evaluate(() => window.lucid.store.put('progress', { id: 'c1-01', level: 'C1', status: 'started', started_at: new Date().toISOString() }));
    await today(page);
    assert(!(await page.$('[data-check-passed]')), 'the offer stays after a C1 lesson was opened');
    await ctx.close();
  });

  // ---------- TP-7: the start key on the first screen, tidy controls ----------
  await check('TP-7 320x568 at 150%: the start key ends above the tab bar; no minutes choice while placement is pending; "לא עכשיו" is transparent; "לכל השיעורים" is 44px tall', async () => {
    const { ctx, page } = await newPage(browser, { viewport: SMALL });
    await learnerAt(page, 'A2', { minutes: 20, text: 150 });
    await today(page);
    const key = await page.$eval('.start-bar .key', (k) => k.getBoundingClientRect().bottom);
    const tabTop = await page.$eval('#tabbar', (n) => n.getBoundingClientRect().top);
    assert(key < tabTop, `start key bottom ${Math.round(key)} >= tab bar top ${Math.round(tabTop)}`);
    assert(await page.$('.today .today-minutes'), 'the minutes choice is gone in the compact layout');
    await shot(page, 'tp7-320-150');
    await page.evaluate(() => { window.lucid.store.put('profile', { ...window.lucid.store.get('profile', 'me'), start_choice: 'conversations' }); window.lucid.store.remove('placement', 'latest'); });
    await today(page);
    assert(await page.evaluate(async () => (await import('./js/core/learner.js')).model().placementPending), 'the placement is not pending in this setup');
    assert(!(await page.$('.today-minutes')), 'the minutes choice shows before any plan exists');
    await ctx.close();
    const b = await newPage(browser);
    await learnerAt(b.page, 'B1', { minutes: 20 });
    await today(b.page);
    const later = await b.page.$eval('[data-import-later]', (k) => { const s = getComputedStyle(k); return { bg: s.backgroundColor, border: s.borderTopColor, h: k.getBoundingClientRect().height }; });
    assert(['transparent', 'rgba(0, 0, 0, 0)'].includes(later.bg) && later.h >= 44, `"לא עכשיו": ${JSON.stringify(later)}`);
    const all = await b.page.$eval('a[href="#/path"].all-lessons', (a) => a.getBoundingClientRect().height);
    assert(all >= 44, `"לכל השיעורים" is ${all}px tall`);
    await b.page.$eval('[data-import-later]', (k) => k.scrollIntoView({ block: 'center' }));
    await shot(b.page, 'tp7-not-now-390');
    await b.ctx.close();
  });

  // ---------- TP-8: writing work shows on Today and in Progress ----------
  await check('TP-8 a wa-05 draft with a writing goal: Today links to #/writing/wa-05 with "גרסה"; #/progress counts the writing and drops the "first report" text', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B2', { minutes: 20, goals: ['writing'] });
    await page.evaluate(async () => {
      const L = await import('./js/core/learner.js');
      const text = 'Cities that face a housing shortage should not build on their parks. '.repeat(20);
      window.lucid.store.put('writing', { id: 'ess:wa-05', kind: 'essay-summary', exercise: 'wa-05', title: 'Homes or parkland?', status: 'draft', versions: 1, updated: new Date().toISOString() });
      window.lucid.store.put('writing', { id: 'ess:wa-05#1', kind: 'essay-version', exercise: 'wa-05', n: 1, text, words: 240, at: new Date().toISOString() });
      window.lucid.store.put('writing', { id: 'ess:wa-05#draft', kind: 'essay-draft', exercise: 'wa-05', text: `${text} More.` });
      L.logEvent({ type: 'writing', exercise: 'wa-05' });
    });
    await today(page);
    const link = await page.$('a[href="#/writing/wa-05"]');
    assert(link && /גרסה/.test(await link.textContent()), 'no "continue" line for the open wa-05 draft');
    await link.scrollIntoViewIfNeeded();
    await shot(page, 'tp8-today-writing');
    await page.goto(`${BASE}#/progress`);
    await page.waitForSelector('#rep-h');
    await page.waitForTimeout(300);
    const n = await page.$eval('[data-writing-sessions]', (s) => Number(s.dataset.writingSessions)).catch(() => 0);
    assert(n >= 1, `writing count ${n}`);
    assert(!/הדוח הראשון יופיע/.test(await page.textContent('#view')), 'Progress still shows the "first report" text');
    await shot(page, 'tp8-progress');
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

if (pageErrors.length) { console.log(`FAIL  page errors\n      ${pageErrors.slice(0, 5).join('\n      ')}`); results.push({ ok: false }); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
