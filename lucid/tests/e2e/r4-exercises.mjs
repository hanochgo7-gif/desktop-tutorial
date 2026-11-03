// Lane e2e for the exercises lane of UX round 4 (EX-1 … EX-12): exercise renderers, answer checking and lesson
// content. Serves lucid/ itself, drives Chromium through Playwright in the Hebrew UI (390x844 with touch, and
// 1440x900 for keyboard checks), prints one line per check and exits 1 on any failure.
// Usage: node tests/e2e/r4-exercises.mjs [--only <substring>] [--port <n>]   (port: R4EX_PORT, default 9713)
// Screenshots go to R4EX_SHOTS when it is set.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const lucid = join(here, '..', '..');
const argv = process.argv;
const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const PORT = Number(arg('--port') || process.env.R4EX_PORT) || 9713;
const BASE = `http://127.0.0.1:${PORT}/`;
const ONLY = arg('--only');
const SHOTS = process.env.R4EX_SHOTS || null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) }); };

// ---------- helpers ----------
// speech: 'silent' (nothing ever starts, as on a device with no English voice) or 'works' (every utterance starts
// and ends, as with a working voice).
async function newPage(browser, { desktop = false, dark = false, speech = 'silent' } = {}) {
  const ctx = await browser.newContext({
    viewport: desktop ? { width: 1440, height: 900 } : { width: 390, height: 844 },
    hasTouch: !desktop, isMobile: !desktop, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  await page.addInitScript((mode) => {
    window.__said = [];
    const s = window.speechSynthesis;
    if (!s) return;
    s.speak = (u) => {
      window.__said.push(u.text);
      if (mode === 'works') setTimeout(() => { u.onstart?.(); setTimeout(() => u.onend?.(), 40); }, 20);
    };
    s.cancel = () => {};
  }, speech);
  return { ctx, page };
}
// A learner at a course level, made through the app's own modules.
async function learnerAt(page, level, { text = 100 } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ lv, size }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 50, text_size: size });
    await L.applyPlacement(P.selfReportResult(lv));
  }, { lv: level, size: text });
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
    const qi = typeof eid === 'number' ? eid - 1 : l.exercises.findIndex((e) => e.id === eid);
    store.put('progress', { id, level: l.level, status: 'started', resume: { qi, queue: l.exercises.map((e) => [e.id, false]), first: [], missed: false, since: new Date().toISOString(), at: new Date().toISOString() } });
  }, { id, eid });
  await page.waitForTimeout(150);
  await page.goto(`${BASE}#/lesson/${id}?resume=1&t=${Date.now()}`);
  await page.waitForSelector('#exroot > *');
  await page.waitForTimeout(200);
}
// Mount one exercise on its own (no player) and keep its controller at window.__ctl, so a check can read the
// result that check() returns.
async function mountAlone(page, id, eid, level) {
  await page.evaluate(async ({ id, eid, level }) => {
    const { content } = await import('./js/core/content.js');
    const { mountExercise } = await import('./js/ui/exercise.js');
    const l = await content.lesson(id);
    const ex = l.exercises.find((e) => e.id === eid);
    document.querySelector('#__alone')?.remove();
    const host = document.createElement('div');
    host.id = '__alone';
    host.className = 'player';
    host.innerHTML = '<div id="__root"></div><div id="pfoot"><button type="button" data-check disabled>check</button></div>';
    document.body.prepend(host);
    window.__ready = false;
    window.__ctl = mountExercise(host.querySelector('#__root'), ex, { level: level || l.level, onChange: (r) => { window.__ready = r; host.querySelector('[data-check]').disabled = !r; } });
  }, { id, eid, level });
  await page.waitForTimeout(150);
}
const lessonEx = (page, id, eid) => page.evaluate(async ({ id, eid }) => (await (await import('./js/core/content.js')).content.lesson(id)).exercises.find((e) => e.id === eid), { id, eid });
const verdict = (page) => page.evaluate(() => ({ cls: document.querySelector('#pfoot')?.className || '', text: (document.querySelector('#pfoot .verdict')?.textContent || '').replace(/\s+/g, ' ').trim() }));
const optionsOff = (page, scope = '#exroot') => page.$$eval(`${scope} .option`, (os) => os.every((o) => o.disabled || o.getAttribute('aria-disabled') === 'true'));

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', lucid], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- EX-1 ----------
  await check('EX-1 word bank: Tab through the gaps to the first chip and Enter fills gap 1; the chip names its gap; a tapped gap 3 takes the next chip', async () => {
    const { ctx, page } = await newPage(browser, { desktop: true });
    await learnerAt(page, 'A1');
    await openExercise(page, 'a1-01', 'e6');
    await page.focus('#exroot .gap-input[data-gap="0"]');
    for (let i = 0; i < 10; i++) {
      if (await page.evaluate(() => document.activeElement?.matches('[data-chip]'))) break;
      await page.keyboard.press('Tab');
    }
    assert(await page.evaluate(() => document.activeElement?.matches('[data-chip]')), 'Tab never reached a chip');
    const chip = await page.evaluate(() => document.activeElement.dataset.chip);
    const desc = await page.evaluate(() => { const c = document.activeElement; return (c.getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' '); });
    assert(/מילה חסרה 1/.test(desc), `the chip's description does not name gap 1: "${desc}"`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const values = await page.$$eval('#exroot .gap-input', (g) => g.map((x) => x.value));
    assert(values[0] === chip && !values[1] && !values[2], `values after Tab + Enter: ${JSON.stringify(values)}`);
    // A tap on gap 3, then a chip: it goes into gap 3.
    await page.click('#exroot .gap-input[data-gap="2"]');
    const desc3 = await page.$eval('#exroot [data-chip][aria-disabled="false"]', (c) => document.getElementById(c.getAttribute('aria-describedby'))?.textContent || '');
    assert(/מילה חסרה 3/.test(desc3), `after choosing gap 3 the chips say "${desc3}"`);
    const next = await page.$eval('#exroot [data-chip][aria-disabled="false"]', (c) => c.dataset.chip);
    await page.click(`#exroot [data-chip="${next}"]`);
    const after = await page.$$eval('#exroot .gap-input', (g) => g.map((x) => x.value));
    assert(after[2] === next && !after[1], `after tapping gap 3 and a chip: ${JSON.stringify(after)}`);
    await ctx.close();
  });

  // ---------- EX-4 ----------
  await check('EX-4 listen with no sound: pa1-02 e1 locks the options after Play, says so inline, and the transcript now unlocks them and marks the result unheard', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await openExercise(page, 'pa1-02', 'e1');
    assert(await page.$('#exroot[data-silent-inline]'), 'the listen root is not marked data-silent-inline');
    await page.click('#exroot [data-say="normal"]');
    await page.waitForTimeout(150);
    assert(await optionsOff(page), 'the options are answerable while the sound has not started');
    await page.waitForSelector('#exroot .silent-note', { state: 'visible', timeout: 5000 });
    assert(await optionsOff(page), 'the options are answerable after silence');
    await shot(page, 'ex4-silent-390');
    assert(!(await page.$('#exroot .transcript')), 'the transcript shows before the learner asks for it');
    await page.click('#exroot [data-transcript-now]');
    assert(!(await optionsOff(page)), 'the options stay locked after "show the transcript now"');
    assert(/sheep/.test(await page.textContent('#exroot .transcript')), 'no transcript after "show the transcript now"');
    await shot(page, 'ex4-transcript-390');
    // The controller's result says unheard (contract b).
    await mountAlone(page, 'pa1-02', 'e1');
    await page.click('#__root [data-say="normal"]');
    await page.waitForSelector('#__root .silent-note', { timeout: 5000 });
    await page.click('#__root [data-transcript-now]');
    await page.click('#__root [data-opt="1"]');
    const r = await page.evaluate(() => window.__ctl.check());
    assert(r.unheard === true, `check() after the transcript: ${JSON.stringify(r)}`);
    await ctx.close();
  });

  await check('EX-4 the listening hub (a1-02 e3) does the same with no sound', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await page.goto(`${BASE}#/listening?l=a1-02&e=e3`);
    await page.waitForSelector('#exroot .option');
    await page.click('#exroot [data-say="normal"]');
    await page.waitForSelector('#exroot .silent-note', { state: 'visible', timeout: 5000 });
    assert(await optionsOff(page), 'the hub options are answerable after silence');
    await page.click('#exroot [data-transcript-now]');
    assert(!(await optionsOff(page)) && await page.$('#exroot .transcript'), 'the hub transcript did not unlock the options');
    await ctx.close();
  });

  await check('EX-4 with working speech the options open after Play, there is no note, and no transcript before Check', async () => {
    const { ctx, page } = await newPage(browser, { speech: 'works' });
    await learnerAt(page, 'PreA1');
    await openExercise(page, 'pa1-02', 'e1');
    await page.click('#exroot [data-say="normal"]');
    await page.waitForTimeout(2500);
    assert(!(await optionsOff(page)), 'the options are locked although the sound played');
    assert(!(await page.$('#exroot .silent-note')) && !(await page.$('#exroot .transcript')), 'a note or a transcript shows with working speech');
    await mountAlone(page, 'pa1-02', 'e1');
    await page.click('#__root [data-say="normal"]');
    await page.waitForTimeout(1800);
    await page.click('#__root [data-opt="1"]');
    const r = await page.evaluate(() => window.__ctl.check());
    assert(!r.unheard && r.correct, `check() with sound: ${JSON.stringify(r)}`);
    await ctx.close();
  });
  // ---------- EX-5 ----------
  await check('EX-5 the first-try note states the rule without the answer: a2-05 e8 "leaved", and b1-02 e11 "I did lived …"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await openExercise(page, 'a2-05', 'e8');
    const gaps = await page.$$('#exroot .gap-input');
    await gaps[0].fill('leaved'); await gaps[1].fill('came'); await gaps[2].fill('slept');
    await page.click('[data-check]');
    await page.waitForSelector('[data-try-again]');
    const v = await verdict(page);
    assert(/לא מוסיפים לו ed/.test(v.text), `the rule is not shown: ${v.text}`);
    assert(!/\bleft\b/.test(v.text), `the first-try note gives the answer: ${v.text}`);
    await shot(page, 'ex5-rule-390');
    await openExercise(page, 'b1-02', 'e11');
    await page.fill('#exroot textarea', 'I did lived in Tel Aviv since 2020.');
    await page.click('[data-check]');
    await page.waitForSelector('[data-try-again]');
    const w = await verdict(page);
    assert(/since/.test(w.text) && /V3/.test(w.text), `no structure note: ${w.text}`);
    assert(!/did live|have lived/.test(w.text), `the note leads to a wrong sentence or gives the answer: ${w.text}`);
    await ctx.close();
  });
  // ---------- EX-6 ----------
  await check('EX-6 a1-07 learn step 1 at 390: every row has a Hebrew cell under "מתי?"; pa1-02 tables carry headers_he with English headers', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await page.goto(`${BASE}#/lesson/a1-07`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForTimeout(300);
    // The explanation is paged by height (LF-2): walk the steps to the table.
    for (let i = 0; i < 6 && !(await page.$('.lesson-learn:not(.learn-measure) table.data')); i++) {
      await page.click('.player-foot [data-learn-next]');
      await page.waitForTimeout(250);
    }
    await page.waitForSelector('.lesson-learn:not(.learn-measure) table.data');
    const t = await page.$eval('.lesson-learn:not(.learn-measure) table.data', (tb) => {
      const ths = [...tb.querySelectorAll('thead th')].map((x) => x.textContent.trim());
      const at = ths.indexOf('מתי?');
      const rows = [...tb.querySelectorAll('tbody tr')].map((r) => { const c = r.children[at]; return c ? { lang: c.getAttribute('lang'), text: c.textContent.trim() } : null; });
      return { ths, at, rows };
    });
    assert(t.at >= 0 && t.rows.length === 6 && t.rows.every((r) => r && r.lang === 'he' && /[֐-׿]/.test(r.text)), `a1-07 table: ${JSON.stringify(t)}`);
    await shot(page, 'ex6-a1-07-table-390');
    const tables = await page.evaluate(async () => (await (await import('./js/core/content.js')).content.lesson('pa1-02')).explanation.filter((b) => b.type === 'table'));
    assert(tables.every((b) => Array.isArray(b.headers_he) && b.headers_he.length === b.headers.length), 'pa1-02 tables have no headers_he');
    assert(tables.every((b) => b.headers.every((h, i) => !/[֐-׿]/.test(h) || b.headers_he[i] === '')), 'a new Hebrew header was put into headers');
    await ctx.close();
  });

  await check('EX-6 first-try notes: pa1-02 e11 "I tink so, tanks!" gets t guidance, not "s במקום"; a1-11 e9 "I have new phone." names the missing word', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await openExercise(page, 'pa1-02', 'e11');
    await page.fill('#exroot textarea', 'I tink so, tanks!');
    await page.click('[data-check]');
    await page.waitForSelector('[data-try-again]');
    const v = await verdict(page);
    assert(/כתבתם t/.test(v.text) && !/s במקום/.test(v.text), `pa1-02 e11 note: ${v.text}`);
    assert(!/think|thanks/.test(v.text), `the first-try note gives the answer: ${v.text}`);
    await openExercise(page, 'a1-11', 'e9');
    await page.fill('#exroot textarea', 'I have new phone.');
    await page.click('[data-check]');
    await page.waitForSelector('[data-try-again]');
    const w = await verdict(page);
    assert(/חסרה מילה/.test(w.text), `a1-11 e9 note: ${w.text}`);
    await ctx.close();
  });
  // ---------- EX-7 ----------
  await check('EX-7 lesson writing: one range "יעד 80-120" on b1-01 e16; 40 words save as a short draft (short:true); a story does not flag "didn\'t" as formal', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await openExercise(page, 'b1-01', 'e16');
    const counter = await page.textContent('#exroot [data-wc]');
    assert(/יעד 80-120/.test(counter) && !/לפחות/.test(counter), `counter: ${counter}`);
    const forty = Array.from({ length: 5 }, () => 'I have been to Eilat and it was a really nice trip.').join(' ').split(' ').slice(0, 40).join(' ');
    await page.fill('#exroot textarea', 'I have been to Eilat.');
    const key = (await page.textContent('[data-check]')).replace(/\s+/g, ' ');
    assert(/אפשר לשמור טיוטה מ-20 מילים \(עוד 15\)/.test(key), `the disabled key: ${key}`);
    await page.fill('#exroot textarea', forty);
    await shot(page, 'ex7-counter-390');
    await page.click('[data-check]');
    await page.waitForSelector('[data-next]');
    const v = await verdict(page);
    assert(/קצר מהיעד/.test(v.text) && /נשמר כטיוטה/.test(v.text), `verdict: ${v.text}`);
    await shot(page, 'ex7-short-390');
    await mountAlone(page, 'b1-01', 'e16');
    await page.fill('#__root textarea', forty);
    const r = await page.evaluate(() => window.__ctl.check());
    assert(r.short === true && r.missing === 40, `check(): ${JSON.stringify({ short: r.short, missing: r.missing })}`);
    await ctx.close();
    const b = await newPage(browser);
    await learnerAt(b.page, 'B2');
    await openExercise(b.page, 'b2-01', 'e16');
    await b.page.fill('#exroot textarea', Array.from({ length: 25 }, () => "I didn't know what had happened before we arrived at the old house.").join(' '));
    await b.page.click('[data-check]');
    await b.page.waitForSelector('#exroot [data-writeout]');
    const out = await b.page.textContent('#exroot [data-writeout]');
    assert(!/קיצור בכתיבה רשמית/.test(out), 'a story flags "didn\'t" as a contraction in formal writing');
    await b.ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 10).join('\n  ')}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
