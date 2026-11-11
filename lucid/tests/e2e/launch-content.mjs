// Lane e2e for the launch audit's content lane (EK-02, EK-05, EK-08, EK-09, TS-03): the real player grading the
// changed items, the level check's pointer to the writing task, and the social scenarios a child sees.
// Serves lucid/ itself, drives Chromium through Playwright in the Hebrew UI (390x844 with touch), prints one line
// per check and exits 1 on any failure.
// Usage: node tests/e2e/launch-content.mjs [--only <substring>]   (port: LC_PORT, default 9131)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const lucid = join(here, '..', '..');
const PORT = Number(process.env.LC_PORT) || 9131;
const BASE = `http://127.0.0.1:${PORT}/`;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  await page.addInitScript(() => { if (window.speechSynthesis) window.speechSynthesis.speak = () => {}; });
  return { ctx, page };
}
// A learner at a course level, made through the app's own modules.
async function learnerAt(page, level, { birthYear = 2000 } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ lv, by }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: by, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 50, text_size: 100 });
    await L.applyPlacement(P.selfReportResult(lv));
  }, { lv: level, by: birthYear });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
// Open lesson `id` at exercise `eid` through a saved place, as "Continue" would.
async function openExercise(page, id, eid) {
  await page.evaluate(async ({ id, eid }) => {
    const { content } = await import('./js/core/content.js');
    const { store } = await import('./js/core/store.js');
    const l = await content.lesson(id);
    const qi = l.exercises.findIndex((e) => e.id === eid);
    store.put('progress', { id, level: l.level, status: 'started', resume: { qi, queue: l.exercises.map((e) => [e.id, false]), first: [], missed: false, since: new Date().toISOString(), at: new Date().toISOString() } });
  }, { id, eid });
  await page.waitForTimeout(150);
  await page.goto(`${BASE}#/lesson/${id}?resume=1&t=${Date.now()}`);
  await page.waitForSelector('#exroot > *');
  await page.waitForTimeout(200);
}
const foot = (page) => page.evaluate(() => ({ cls: document.querySelector('#pfoot')?.className || '', text: (document.querySelector('#pfoot')?.textContent || '').replace(/\s+/g, ' ').trim() }));
async function typeAndCheck(page, text) {
  await page.fill('#exroot textarea', text);
  await page.click('[data-check]:not([disabled])');
  await page.waitForSelector('[data-next], [data-try-again], [data-show-answer]');
  return foot(page);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', lucid], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  await check('EK-08: the player counts "Tel-Aviv" (a1-01 e9) and "2 days ago" (a2-04 e9) as correct', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await openExercise(page, 'a1-01', 'e9');
    const a = await typeAndCheck(page, 'We live in Jerusalem and work in Tel-Aviv.');
    assert(/\bok\b/.test(a.cls), `Tel-Aviv: ${JSON.stringify(a)}`);
    await openExercise(page, 'a2-04', 'e9');
    const b = await typeAndCheck(page, 'I called you 2 days ago.');
    assert(/\bok\b/.test(b.cls), `2 days ago: ${JSON.stringify(b)}`);
    await ctx.close();
  });

  await check('EK-02: pa1-05 e9 is a choice of the short form: "Im" is wrong with its note, "I\'m" is right', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await openExercise(page, 'pa1-05', 'e9');
    assert(!(await page.$('#exroot textarea')), 'the short form is still typed (copying "I am Dana." passes)');
    // Options are shown shuffled; data-opt is the option's index in the item, the last span its text.
    const options = () => page.$$eval('#exroot [data-opt]', (b) => b.map((x) => ({ i: x.dataset.opt, text: x.lastElementChild.textContent.trim() })));
    const opts = await options();
    assert(opts.length === 3 && opts.some((o) => o.text === "I'm"), `options: ${JSON.stringify(opts)}`);
    const pick = async (label) => { const o = (await options()).find((x) => x.text === label); await page.click(`#exroot [data-opt="${o.i}"]`); await page.click('[data-check]:not([disabled])'); await page.waitForSelector('[data-next], [data-try-again], [data-show-answer]'); return foot(page); };
    const wrong = await pick('Im');
    assert(!/\bok\b/.test(wrong.cls) && /גרש|apostrophe/i.test(wrong.text), `Im: ${JSON.stringify(wrong)}`);
    await openExercise(page, 'pa1-05', 'e9');
    const right = await pick("I'm");
    assert(/\bok\b/.test(right.cls), `I'm: ${JSON.stringify(right)}`);
    await ctx.close();
  });

  await check('EK-09: b1-02 e10 asks to keep "last year", and "I have seen this film." gets a note about it', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await openExercise(page, 'b1-02', 'e10');
    assert(/last year/.test(await page.textContent('#exroot')), 'the prompt does not ask to keep last year');
    // The second-try note names the rule without the answer; "Show the answer" then gives the item's own note.
    const f = await typeAndCheck(page, 'I have seen this film.');
    assert(!/\bok\b/.test(f.cls) && /ציון הזמן/.test(f.text), `no rule note: ${JSON.stringify(f)}`);
    await page.click('[data-show-answer]');
    await page.waitForSelector('[data-next]');
    const g = await foot(page);
    assert(/last year/.test(g.text) && /משפט תקין/.test(g.text), `no note after the answer: ${JSON.stringify(g)}`);
    await ctx.close();
  });

  await check('EK-05: the level check points to the level\'s writing task on the path and links to it', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await page.goto(`${BASE}#/checkpoint/B1`);
    await page.waitForSelector('[data-begin]');
    const text = await page.textContent('#view');
    assert(!/בשיעור האחרון|in its last lesson/.test(text), 'the check still says the writing task is in the last lesson');
    assert(await page.getAttribute('[data-final-task]', 'href') === '#/writing/final-B1', 'no link to the B1 writing task');
    await page.click('[data-final-task]');
    await page.waitForFunction(() => location.hash === '#/writing/final-B1');
    await ctx.close();
  });

  await check('TS-03: a 12-year-old sees the language exchange with no contact swap, and the safety tip in Hebrew', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { birthYear: new Date().getUTCFullYear() - 12 });
    await page.goto(`${BASE}#/scenario/rl-social-language-exchange`);
    await page.waitForSelector('.block-tip');
    const learn = await page.textContent('#view');
    assert(!/Instagram|swap numbers|WhatsApp/i.test(learn), 'the phrases still teach swapping contacts');
    assert(/מתחת לגיל 18/.test(learn) && /מקום ציבורי/.test(learn), 'no safety tip');
    await page.click('[data-tab="practise"]');
    await page.waitForSelector('[data-opt]');
    for (let t = 0; t < 8; t++) {
      const opts = await page.$$eval('[data-opt]', (b) => b.map((x) => x.textContent));
      assert(!opts.some((o) => /Instagram|swap numbers|number/i.test(o)), `a practice turn offers a contact swap: ${opts.join(' | ')}`);
      await page.click('[data-opt="0"]');
      await page.click('[data-check-turn]');
      const next = await page.waitForSelector('[data-next-turn], [data-restart]', { timeout: 3000 }).catch(() => null);
      if (!next || !(await page.$('[data-next-turn]'))) break;
      await page.click('[data-next-turn]');
      await page.waitForSelector('[data-opt]', { timeout: 3000 }).catch(() => {});
      if (!(await page.$('[data-opt]'))) break;
    }
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 10).join('\n  ')}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
