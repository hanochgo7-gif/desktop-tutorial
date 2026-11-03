// Browser checks for the lesson-flow lane of UX round 3 (docs/qa/panels-r3/plan.json, LF-1 to LF-12): resuming,
// the explanation in steps, tables, end screens, keyboard and focus, second tries, the progress bar, notes from
// the learner's own mistakes, reading scores, the "all in Hebrew" switch, exits and the level check result.
// Serves lucid/ itself and drives Chromium through Playwright. One line per check; exit 1 on any failure.
// Usage: node tests/e2e/lesson-flow.mjs [--only <substring>] [--shots <dir>]   (LANE_PORT, default 9113)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const PORT = Number(process.env.LANE_PORT) || 9113;
const BASE = `http://127.0.0.1:${PORT}/`;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const ONLY = arg('--only');
const SHOTS = arg('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try {
    const r = await fn();
    results.push({ name, ok: true }); console.log(`PASS  ${name}`);
  } catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const lessonJson = (id) => JSON.parse(readFileSync(join(app, `content/lessons/${id}.json`), 'utf8'));
const scoredIds = (l) => l.exercises.filter((e) => !['speak', 'write'].includes(e.type)).map((e) => e.id);

// Speech synthesis is stubbed: what would be said is recorded in window.__spoken, so a replay can be detected
// and a dictation's text read, with no audio and no wait for voices.
const speechStub = () => {
  window.__spoken = [];
  const s = window.speechSynthesis;
  if (!s) return;
  const add = s.addEventListener.bind(s);
  s.addEventListener = (t, fn, o) => { if (t === 'voiceschanged') setTimeout(fn, 0); else add(t, fn, o); };
  s.speak = (u) => { window.__spoken.push(u.text); setTimeout(() => u.onend?.(), 5); };
  s.cancel = () => {};
};
async function newPage(browser, { width = 390, height = 844, motion = 'reduce' } = {}) {
  const touch = width < 800;
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: motion, locale: 'he-IL', serviceWorkers: 'block' });
  await ctx.addInitScript(speechStub);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  return { ctx, page };
}
// A learner at a course level, made through the app's own store.
async function learnerAt(page, level, { text = 100, minutes = 20 } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, text, minutes }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: minutes, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, text, minutes });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(250);
}
// Opens a lesson at one exercise through the saved place (first tries before it count as right unless given).
async function lessonAt(page, lessonId, exId, first = null) {
  await page.evaluate(async ({ lessonId, exId, first }) => {
    const l = await (await fetch(`content/lessons/${lessonId}.json`)).json();
    const ids = l.exercises.map((e) => e.id);
    const qi = exId ? ids.indexOf(exId) : ids.length;
    const scored = l.exercises.filter((e) => !['speak', 'write'].includes(e.type)).map((e) => e.id);
    const done = first ? Object.entries(first) : scored.filter((x) => ids.indexOf(x) < qi).map((x) => [x, 1]);
    window.lucid.store.put('progress', { id: lessonId, level: l.level, status: 'started', resume: { qi, queue: ids.map((x) => [x, false]), first: done } });
  }, { lessonId, exId, first });
  await page.goto(`${BASE}#/lesson/${lessonId}?resume=1&t=${Date.now()}`);
  await page.waitForSelector(exId ? '#exroot' : '.player h1');
}
// Answers the exercise on screen, right or wrong. The exercise is recognised from what it shows (question,
// source sentence, tiles, bins, passage), or for dictation from what its play key says.
async function solve(page, exercises, ok = true) {
  return page.evaluate(async ({ exercises, ok }) => {
    const root = document.querySelector('#exroot');
    const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
    const fire = (el) => el.dispatchEvent(new Event('input', { bubbles: true }));
    const first = (a) => (Array.isArray(a) ? a[0] : a);
    const exText = norm(root.querySelector('.ex-text')?.textContent);
    const prompt = norm(root.querySelector('.ex-prompt')?.textContent);
    const pool = exercises.filter((e) => prompt.includes(norm(e.prompt?.en ?? e.prompt)));
    let ex = null;
    if (root.querySelector('.passage')) ex = pool.find((e) => e.type === 'read' && root.querySelector('.passage').textContent.replace(/\s+/g, '').includes(e.passage.replace(/\s+/g, '').slice(0, 60)));
    else if (root.querySelector('[data-self]')) ex = pool.find((e) => e.type === 'speak' && norm(e.target) === exText);
    else if (root.querySelector('[data-wc]')) ex = pool.find((e) => e.type === 'write');
    else if (root.querySelector('.option')) ex = pool.find((e) => ['mcq', 'listen'].includes(e.type) && norm(e.question) === exText);
    else if (root.querySelector('.gap-input')) ex = pool.find((e) => e.type === 'gap' && norm(e.text.replace(/___/g, '')) === norm(exText));
    else if (root.querySelector('[data-in]')) ex = pool.find((e) => e.type === 'order' && [...e.tokens].sort().join('|') === [...root.querySelectorAll('[data-in]')].map((b) => b.textContent).sort().join('|'));
    else if (root.querySelector('[data-l]')) ex = pool.find((e) => e.type === 'match' && e.pairs.every((p) => [...root.querySelectorAll('[data-l]')].some((b) => norm(b.textContent) === norm(p[0]))));
    else if (root.querySelector('[data-bin]')) ex = pool.find((e) => e.type === 'categorize' && e.categories.every((c) => root.querySelector(`[data-bin="${CSS.escape(c)}"]`)));
    else if (root.querySelector('textarea') && exText) ex = pool.find((e) => ['transform', 'correct'].includes(e.type) && norm(e.type === 'transform' ? e.source : e.sentence) === exText);
    else if (root.querySelector('textarea')) {
      const d = pool.filter((e) => e.type === 'dictation');
      if (d.length === 1) ex = d[0];
      else { root.querySelector('[data-say="normal"]')?.click(); await new Promise((r) => setTimeout(r, 60)); const said = window.__spoken.at(-1); ex = d.find((e) => e.audio_text === said); }
    }
    if (!ex) return null;
    const r = root;
    switch (ex.type) {
      case 'mcq': case 'listen': r.querySelector(`[data-opt="${ok ? ex.answer : ex.options.findIndex((_, i) => i !== ex.answer)}"]`).click(); break;
      case 'gap': {
        const want = ex.answers.map(first);
        if (ex.word_bank) { r.querySelectorAll('.gap-input').forEach((g, i) => { g.value = ok ? want[i] : ex.word_bank.find((w) => w !== want[i]); fire(g); }); }
        else r.querySelectorAll('.gap-input').forEach((g, i) => { g.value = ok ? want[i] : 'zzz'; fire(g); });
        break;
      }
      case 'transform': case 'correct': case 'dictation': { const ta = r.querySelector('textarea'); ta.value = ok ? ex.answers[0] : 'zzz qqq'; fire(ta); break; }
      case 'order': { const toks = ok ? ex.tokens : [...ex.tokens].reverse(); for (const t of toks) [...r.querySelectorAll('[data-in]:not(.used)')].find((b) => b.textContent === t)?.click(); break; }
      case 'match': for (const a of [...r.querySelectorAll('[data-l]')]) { if (!ok) { const w = [...r.querySelectorAll('[data-r]:not(:disabled)')].find((x) => x.dataset.r !== a.dataset.l); if (w) { a.click(); w.click(); } } a.click(); r.querySelector(`[data-r="${a.dataset.l}"]`)?.click(); } break;
      case 'categorize': for (let i = 0; i < 40; i++) { const it = r.querySelector('[data-item]'); if (!it) break; const item = ex.items[Number(it.dataset.item)]; it.click(); [...r.querySelectorAll('[data-bin]')].find((b) => (b.dataset.bin === item.category) === ok).click(); } break;
      case 'read': ex.questions.forEach((q, qi) => { if (q.type === 'tf') r.querySelector(`[data-tf="${qi}"][data-v="${ok ? q.answer : !q.answer}"]`).click(); else if (q.type === 'mcq') r.querySelector(`[data-mq="${qi}"][data-o="${ok ? q.answer : (q.answer + 1) % q.options.length}"]`).click(); else r.querySelectorAll(`[data-rg="${qi}"]`).forEach((g, i) => { g.value = ok ? first(q.answers[i]) : 'zzz'; fire(g); }); }); break;
      case 'speak': r.querySelector('[data-self="1"]').click(); break;
      case 'write': { const ta = r.querySelector('textarea'); ta.value = 'I am a student and I work in a bank. My friends live in Haifa and we study English together every week.'; fire(ta); break; }
      default: return null;
    }
    return ex;
  }, { exercises, ok });
}
// Answers one exercise and moves on. Returns the exercise answered.
async function step(page, exercises, ok = true) {
  const ex = await solve(page, exercises, ok);
  assert(ex, `could not recognise the exercise: ${(await page.textContent('#exroot .ex-prompt').catch(() => '?')).slice(0, 80)}`);
  // A matching board shows its verdict by itself when the last pair locks (EX-1), so it needs no key here.
  if (ex.type !== 'match') { const c = await page.$('[data-check]:not([disabled])'); if (c) await c.click(); else await page.click('[data-dontknow]'); }
  if (ex.type === 'speak') { await page.waitForTimeout(150); return ex; }
  await page.waitForSelector('[data-next], [data-try-again]');
  if (await page.$('[data-try-again]')) { await page.click('[data-show-answer]'); await page.waitForSelector('[data-next]'); }
  await page.click('[data-next]');
  return ex;
}
// Runs the lesson on screen to its end screen; today's part end goes on.
async function finish(page, exercises, ok = () => true) {
  for (let i = 0; i < 40; i++) {
    await page.waitForSelector('#exroot, .part-end, .player h1');
    if (await page.$('.part-end')) { await page.click('[data-part-go]'); continue; }
    if (!(await page.$('#exroot'))) return;
    await step(page, exercises, ok(i));
  }
}
const inView = (page, sel) => page.$eval(sel, (b) => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; });

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- LF-1 ----------
  for (const [w, h, text] of [[390, 844, 100], [768, 1024, 130]]) {
    await check(`LF-1 Coming back never restarts: the path row resumes at the saved place, and a plain lesson link (Progress, "Your next lesson") opens the intro with resume as the footer's main key, at ${w}x${h} and ${text}% text`, async () => {
      const { ctx, page } = await newPage(browser, { width: w, height: h });
      await learnerAt(page, 'A2', { text });
      const l = lessonJson('a2-01');
      await page.goto(`${BASE}#/lesson/a2-01`);
      await page.waitForSelector('.lesson-intro');
      await page.click('[data-skip-learn]');
      await page.waitForSelector('#exroot');
      await step(page, l.exercises, true);
      await step(page, l.exercises, false);
      // From the path, a started lesson opens at its saved place (TF-11): never a restart.
      await page.goto(`${BASE}#/path/A2`);
      const row = 'a.lesson-row[href^="#/lesson/a2-01"]';
      await page.waitForSelector(row);
      const href = await page.$eval(row, (a) => a.getAttribute('href'));
      assert(href === '#/lesson/a2-01?resume=1', `the path row does not resume: ${href}`);
      await page.click(row);
      await page.waitForSelector('#exroot');
      assert((await page.textContent('.step-count')).trim() === '3 מתוך 16', `the path row does not resume at 3: ${await page.textContent('.step-count')}`);
      // A plain link with no ?resume=1 (here Progress's "Your next lesson"; also the grammar pages and a bookmark)
      // opens the intro, and the intro's footer main key resumes (plan.conflicts: LF-1 and TF-11).
      await page.goto(`${BASE}#/progress`);
      const link = '#view a[href="#/lesson/a2-01"]';
      await page.waitForSelector(link);
      await page.click(link);
      await page.waitForSelector('.lesson-intro');
      const primary = await page.$eval('#pfoot .key.enter', (b) => ({ resume: b.hasAttribute('data-resume'), text: b.textContent }));
      assert(primary.resume && /3 מתוך 16/.test(primary.text), `the footer's main key is not resume: ${primary.text}`);
      assert(await inView(page, '[data-resume]'), 'the resume key is not visible without scrolling');
      assert(!(await page.$('[data-skip-learn]')), '"Skip to practice" (a restart) is offered while resuming');
      assert(await page.$('[data-resume-banner]') && await page.$eval('.lesson-intro', (x) => x.firstElementChild.matches('[data-resume-banner]')), 'the banner is not first in the body');
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf1-resume-${w}-${text}.png` });
      await page.keyboard.press('Enter');
      await page.waitForSelector('#exroot');
      assert((await page.textContent('.step-count')).trim() === '3 מתוך 16', `Enter does not resume at 3: ${await page.textContent('.step-count')}`);
      await ctx.close();
    });
  }
  await check('LF-1 "Start again" asks first, and the earlier wrong first try still counts at the end', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 50 });
    const l = lessonJson('a2-01');
    await page.goto(`${BASE}#/lesson/a2-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-skip-learn]');
    await page.waitForSelector('#exroot');
    await step(page, l.exercises, true);
    await step(page, l.exercises, false);
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('[data-restart]');
    await page.click('[data-restart]');
    await page.waitForSelector('dialog[open]');
    assert(/מההתחלה/.test(await page.textContent('dialog[open]')), 'no confirmation for a restart');
    await page.click('dialog[open] [value="yes"]');
    await page.waitForSelector('.lesson-learn');
    await page.click('[data-go="practice"]');
    await page.waitForSelector('#exroot');
    assert((await page.textContent('.step-count')).trim() === '1 מתוך 16', 'the restart does not start from the first exercise');
    await finish(page, l.exercises, () => true);
    const n = scoredIds(l).length;
    const pct = Math.round(((n - 1) / n) * 100);
    const body = await page.textContent('.player-body');
    assert(body.includes(`${pct}%`) && !body.includes('100%'), `the restart rewrote the first tries to 100%: ${body.slice(0, 160)}`);
    await ctx.close();
  });

  // ---------- LF-2 ----------
  for (const [lvl, id] of [['PreA1', 'pa1-01'], ['B1', 'b1-01']]) {
    await check(`LF-2 ${id}: the explanation comes in steps of at most 2,000 px, with dots, Back, and the pitfall with audio in step 1`, async () => {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, lvl);
      await page.goto(`${BASE}#/lesson/${id}`);
      await page.waitForSelector('.lesson-intro');
      await page.click('[data-go="learn"]');
      await page.waitForSelector('.lesson-learn');
      // Steps are measured again once the font has loaded; read them after that.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(50);
      assert(await page.evaluate(() => document.activeElement?.tagName === 'H1' && scrollY === 0), 'the learn stage does not open at its heading');
      const one = await page.evaluate(() => ({ pit: document.querySelectorAll('.lesson-learn .pitfall').length, say: document.querySelectorAll('.lesson-learn .pitfall [data-say-text]').length, head: document.querySelector('.lesson-learn .pitfall-head')?.textContent }));
      assert(one.pit >= 1 && one.say >= 1 && /מלכודת לדוברי עברית/.test(one.head), `step 1 has no pitfall box with play keys: ${JSON.stringify(one)}`);
      const heights = [];
      let n = 0;
      for (let k = 0; k < 9; k++) {
        const s = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, label: document.querySelector('[data-step-label]').textContent, dots: document.querySelectorAll('.learn-steps .dot').length, text: document.querySelector('.player').textContent }));
        heights.push(s.h);
        assert(!/הסבר קצר/.test(s.text), '"short explanation" is still said');
        assert(new RegExp(`^${k + 1} מתוך \\d+ · כ-\\d+ דק׳ קריאה`).test(s.label.trim()) && s.dots > 1, `no step indicator: ${s.label}`);
        n = Number(s.label.match(/מתוך (\d+)/)[1]);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf2-${id}-${k + 1}.png`, fullPage: true });
        if (!(await page.$('[data-learn-next]'))) break;
        await page.click('[data-learn-next]');
        assert(await page.evaluate(() => document.activeElement?.id === 'learn-h' && scrollY === 0), 'a new step does not open at its heading');
      }
      assert(heights.length === n && heights.every((h) => h <= 2000), `step heights: ${heights}`);
      await page.click('[data-learn-prev]');
      assert((await page.textContent('[data-step-label]')).startsWith(`${n - 1} מתוך`), 'Back does not go to the previous step');
      assert(await page.$('#pfoot [data-go="practice"]'), 'no way to practice from a step');
      await ctx.close();
    });
  }

  await check('LF-2 at 320px and 150% text, every step of the 14-step pa1-02 and pa1-03 explanations fits: the step dots never push the page sideways (plan.keep)', async () => {
    const { ctx, page } = await newPage(browser, { width: 320, height: 640 });
    await learnerAt(page, 'PreA1', { text: 150 });
    for (const id of ['pa1-02', 'pa1-03']) {
      await page.goto(`${BASE}#/lesson/${id}?t=${Date.now()}`);
      await page.waitForSelector('.lesson-intro');
      await page.click('[data-go="learn"]');
      await page.waitForSelector('.lesson-learn');
      await page.evaluate(() => document.fonts.ready);
      let n = 0;
      for (let k = 1; k <= 20; k++) {
        await page.waitForFunction((k) => document.querySelector('[data-step-label]')?.textContent.trim().startsWith(`${k} מתוך`), k);
        const r = await page.evaluate(() => ({ head: document.querySelector('.learn-head').scrollWidth - document.querySelector('.learn-head').clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, dots: document.querySelectorAll('.learn-steps .dot').length }));
        assert(r.head <= 1 && r.doc <= 1 && r.dots > 1, `${id} step ${k} scrolls sideways: ${JSON.stringify(r)}`);
        n = r.dots;
        const next = page.locator('.player-foot [data-learn-next]');
        if (!(await next.count())) break;
        await next.click();
      }
      assert(n >= 11, `${id} no longer has more than 10 steps at 150%, so this check no longer tests the long dot row: ${n}`);
    }
    await ctx.close();
  });

  // ---------- LF-3 ----------
  await check('LF-3 a1-01: the sentence table reads "I | work | in a bank." left to right; at 150% it fits with the Hebrew visible', async () => {
    for (const text of [100, 150]) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'A1', { text });
      await page.goto(`${BASE}#/lesson/a1-01`);
      await page.waitForSelector('.lesson-intro');
      await page.click('[data-go="learn"]');
      await page.waitForSelector('.lesson-learn');
      for (let s = 0; s < 6 && !(await page.$('.lesson-learn .table-wrap')); s++) await page.click('[data-learn-next]');
      const t = await page.evaluate(() => {
        const w = document.querySelector('.lesson-learn .table-wrap');
        const tds = [...w.querySelectorAll('tbody tr:first-child td')];
        const en = tds.filter((x) => x.classList.contains('c-en')).map((x) => ({ t: x.textContent.trim(), l: x.getBoundingClientRect().left }));
        const he = tds.find((x) => x.classList.contains('c-he'));
        const hr = he.getBoundingClientRect();
        return { dir: getComputedStyle(w).direction, en, last: tds.at(-1) === he, heIn: hr.left >= 0 && hr.right <= innerWidth && hr.width > 20, scrolls: w.scrollWidth > w.clientWidth + 2, hint: !w.previousElementSibling.hidden };
      });
      assert(t.dir === 'ltr' && t.en.map((x) => x.t).join(' | ') === 'I | work | in a bank.' && t.en.every((x, i) => !i || x.l > t.en[i - 1].l), `not left to right: ${JSON.stringify(t)}`);
      assert(t.last && t.heIn, `the Hebrew column is not last and visible at ${text}%: ${JSON.stringify(t)}`);
      assert(!t.scrolls && !t.hint, `the table scrolls sideways at ${text}%`);
      if (SHOTS) { await page.locator('.lesson-learn .table-wrap').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SHOTS}/lf3-a1-01-${text}.png` }); }
      await ctx.close();
    }
  });
  await check('LF-3 pa1-01: the alphabet table has 26 play keys and an A-Z key; IPA stays hidden until asked for', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await page.goto(`${BASE}#/lesson/pa1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    for (let s = 0; s < 6 && !(await page.$('.lesson-learn .table-wrap')); s++) await page.click('[data-learn-next]');
    const a = await page.evaluate(() => ({ plays: document.querySelectorAll('.table-wrap .row-say').length, az: Boolean(document.querySelector('[data-say-slow]')), ipa: [...document.querySelectorAll('.table-wrap .col-ipa')].some((x) => x.getClientRects().length) }));
    assert(a.plays === 26 && a.az && !a.ipa, `alphabet table: ${JSON.stringify(a)}`);
    await page.click('.row-say');
    await page.waitForFunction(() => window.__spoken.includes('A'));
    await page.click('[data-ipa-toggle]');
    assert(await page.evaluate(() => [...document.querySelectorAll('.table-wrap .col-ipa')].some((x) => x.getClientRects().length)), 'IPA does not show when asked');
    await ctx.close();
  });

  await check('LF-3 A table still wider than its frame keeps its scroll cue (pa1-01 with IPA shown, at 150%)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1', { text: 150 });
    await page.goto(`${BASE}#/lesson/pa1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    for (let s = 0; s < 6 && !(await page.$('.lesson-learn .table-wrap')); s++) await page.click('[data-learn-next]');
    await page.click('[data-ipa-toggle]');
    const w = await page.evaluate(() => { const x = document.querySelector('.lesson-learn .table-wrap'); return { scrolls: x.classList.contains('scrolls'), hint: !x.previousElementSibling.hidden, tab: x.tabIndex, page: document.documentElement.scrollWidth <= innerWidth }; });
    assert(w.scrolls && w.hint && w.tab === 0 && w.page, `no scroll cue on a wide table: ${JSON.stringify(w)}`);
    await page.evaluate(() => { const x = document.querySelector('.lesson-learn .table-wrap.scrolls'); x.scrollLeft = x.scrollWidth; x.dispatchEvent(new Event('scroll')); });
    assert(await page.$('.lesson-learn .table-wrap.scrolls.at-end'), 'the fade stays at the far side');
    await ctx.close();
  });

  // ---------- LF-4 ----------
  await check('LF-4 End titles: all wrong is "not complete yet" with re-reading first; about 60% is "nearly there"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const l = lessonJson('a2-01');
    const ids = scoredIds(l);
    await lessonAt(page, 'a2-01', null, Object.fromEntries(ids.map((x) => [x, 0])));
    assert((await page.textContent('.player h1')).trim() === 'השיעור עוד פתוח', `h1: ${await page.textContent('.player h1')}`);
    const p = await page.$eval('#pfoot .key.enter', (b) => ({ relearn: b.hasAttribute('data-relearn'), text: b.textContent }));
    assert(p.relearn && /לקרוא שוב את ההסבר/.test(p.text), `the main key does not re-read the explanation: ${p.text}`);
    assert(/לתרגל רק את 14 הטעויות/.test(await page.textContent('#pfoot')), 'no "practise only the mistakes"');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf4-all-wrong.png`, fullPage: true });
    await page.click('[data-relearn]');
    await page.waitForSelector('.lesson-learn');
    await page.click('[data-go="practice"]');
    await page.waitForSelector('#exroot');
    assert((await page.textContent('.step-count')).trim() === `1 מתוך ${ids.length}`, 'the re-read does not lead to the missed exercises');
    const k = Math.round(ids.length * 0.6);
    await lessonAt(page, 'a2-01', null, Object.fromEntries(ids.map((x, i) => [x, i < k ? 1 : 0])));
    assert((await page.textContent('.player h1')).trim() === 'כמעט שם', `about 60%: ${await page.textContent('.player h1')}`);
    await ctx.close();
  });
  await check('LF-4 The intro banner, the end screen and Today give the same minutes for the missed exercises', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const ids = scoredIds(lessonJson('a2-01'));
    await lessonAt(page, 'a2-01', null, Object.fromEntries(ids.map((x, i) => [x, i < 5 ? 0 : 1])));
    const end = (await page.textContent('[data-retry]')).match(/כ-(\d+) דק׳/)[1];
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('[data-missed-banner]');
    const banner = (await page.textContent('[data-missed-banner]')).match(/כ-(\d+) דק׳/)[1];
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.start-bar a');
    const today = (await page.textContent('.start-bar a')).match(/כ-(\d+) דק׳/)?.[1] || (await page.textContent('.plan li:has(a[href*="a2-01"]) .plan-time')).match(/\d+/)[0];
    assert(end === banner && banner === today, `minutes: end ${end}, intro ${banner}, Today ${today}`);
    await ctx.close();
  });
  await check('LF-4 A pass while reviews are due opens the review itself (r4 LF-1: never Today); the review promise is honest', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.addVocabCards(await (await fetch('content/lessons/a1-01.json')).json(), new Date(Date.now() - 5 * 86400000)); });
    await lessonAt(page, 'a2-01', null, Object.fromEntries(scoredIds(lessonJson('a2-01')).map((x) => [x, 1])));
    const p = await page.$eval('#pfoot .key.enter', (b) => ({ text: b.textContent, href: b.getAttribute('href') }));
    assert(/^להמשיך בתוכנית: חזרה על מילים · \d+ דק׳/.test(p.text.trim()) && p.href === '#/review', `main key: ${JSON.stringify(p)}`);
    assert(await page.$('#pfoot [data-next-lesson]'), '"Next lesson" is not offered second');
    const body = await page.textContent('.player-body');
    assert(!/בדיוק לפני שתשכחו/.test(body) && /בזמן שמתאים לזיכרון/.test(body), 'the review promise still overclaims');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf4-pass-plan.png`, fullPage: true });
    await ctx.close();
  });
  await check('LF-4 A 10-minute part end shows today\'s right answers and the minutes to finish', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 10 });
    const l = lessonJson('a2-01');
    await page.goto(`${BASE}#/lesson/a2-01`);
    await page.waitForSelector('.lesson-intro');
    const note = (await page.textContent('[data-part-line]')).trim();
    assert(/^היום: עד תרגיל \d+ · כ-\d+ דק׳$/.test(note), `the plan note is not one short line: ${note}`);
    await page.click('[data-skip-learn]');
    let right = 0, n = 0;
    for (let i = 0; i < 20 && !(await page.$('.part-end')); i++) {
      await page.waitForSelector('#exroot, .part-end');
      if (await page.$('.part-end')) break;
      const ok = i % 3 !== 1;
      const ex = await step(page, l.exercises, ok);
      if (!['speak', 'write'].includes(ex.type)) { n++; if (ok) right++; }
    }
    await page.waitForSelector('.part-end');
    const s = (await page.textContent('[data-part-score]')).trim();
    assert(s.startsWith(`היום: ${right} מתוך ${n} נכונות`), `part score: ${s} (expected ${right} of ${n})`);
    assert(/להמשיך ולסיים · כ-\d+ דק׳/.test(await page.textContent('[data-part-go]')), 'no minutes to finish');
    assert((await page.getAttribute('#pfoot .key.enter', 'href')) === '#/today', '"Stop here" is not the main key');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf4-part-end.png`, fullPage: true });
    await ctx.close();
  });

  // ---------- LF-5 ----------
  await check('LF-5 Keyboard only through a1-01: focus on the prompt, Enter checks from the play key, a self-rating and the last chip', async () => {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(page, 'A1', { minutes: 50 });
    const l = lessonJson('a1-01');
    await page.goto(`${BASE}#/lesson/a1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.lesson-learn');
    for (let i = 0; i < 9 && !(await page.$('#exroot')); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
    const seen = new Set();
    for (let i = 0; i < 30 && await page.$('#exroot'); i++) {
      await page.waitForTimeout(160);
      const focus = await page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, prompt: a.matches('.ex-prompt'), field: Boolean(document.querySelector('#exroot')?.contains(a) && ['INPUT', 'TEXTAREA'].includes(a.tagName)) }; });
      assert(focus.prompt || focus.field, `focus is on ${focus.tag} on a new exercise`);
      const ex = await page.evaluate((exs) => { if (document.querySelector('#exroot [data-wc]')) return exs.find((e) => e.type === 'write')?.id; const t = document.querySelector('#exroot .ex-text')?.textContent.replace(/\s+/g, ' ').trim(); return exs.find((e) => (e.question || e.target) === t)?.id || null; }, l.exercises);
      const cur = l.exercises.find((e) => e.id === ex);
      if (cur?.type === 'listen' && !seen.has('listen')) {
        seen.add('listen');
        await page.keyboard.press(String(cur.answer + 1));
        await page.focus('#exroot [data-say="normal"]');
        const before = await page.evaluate(() => window.__spoken.length);
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-next]');
        await page.waitForTimeout(150);
        assert(await page.evaluate((b) => window.__spoken.length === b, before), 'Enter on the play key replayed the audio');
      } else if (cur?.type === 'speak' && !seen.has('speak')) {
        seen.add('speak');
        await page.click('#exroot [data-self="1"]');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !document.querySelector('#exroot [data-self]'));
        continue;
      } else if (await page.$('#exroot [data-chip]') && !seen.has('chip')) {
        seen.add('chip');
        const shown = (await page.textContent('#exroot .ex-text')).replace(/\s+/g, ' ').trim();
        const g = l.exercises.find((e) => e.type === 'gap' && e.word_bank && e.text.replace(/___/g, '').replace(/\s+/g, ' ').trim() === shown);
        for (const w of g.answers.map((a) => (Array.isArray(a) ? a[0] : a))) await page.click(`#exroot [data-chip="${w}"]`);
        const vals = await page.$$eval('#exroot .gap-input', (x) => x.map((i) => i.value).join('|'));
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-next]');
        assert(vals === await page.$$eval('#exroot .gap-input', (x) => x.map((i) => i.value).join('|')), 'Enter on the last chip inserted it again');
      } else if (cur?.type === 'write') {
        await solve(page, l.exercises, true);
        await page.focus('#exroot textarea');
        await page.keyboard.press('Control+Enter');
        await page.waitForSelector('[data-next]');
        seen.add('ctrl');
      } else {
        await solve(page, l.exercises, true);
        if (await page.$('[data-check]:not([disabled])')) await page.keyboard.press('Control+Enter');
        if (cur?.type === 'speak') continue;
        await page.waitForSelector('[data-next]');
      }
      assert(await page.evaluate(() => document.activeElement?.matches('[data-next]')), 'focus is not on Continue after checking');
      await page.keyboard.press('Enter');
    }
    assert(['listen', 'speak', 'chip', 'ctrl'].every((k) => seen.has(k)), `not every case was met: ${[...seen]}`);
    await ctx.close();
  });
  await check('LF-5 "I don\'t know" leaves focus on Continue, never on the page', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await lessonAt(page, 'a1-01', 'e4');
    await page.click('[data-dontknow]');
    await page.waitForSelector('[data-next]');
    assert(await page.evaluate(() => document.activeElement?.matches('[data-next]')), `focus: ${await page.evaluate(() => document.activeElement.tagName)}`);
    assert(/הנה התשובה/.test(await page.textContent('#pfoot .verdict-title')), 'the "I don\'t know" title is not neutral');
    await ctx.close();
  });

  // ---------- LF-6 ----------
  const hasReopen = async (page) => page.evaluate(async () => { const X = await import('./js/ui/exercise.js'); const d = document.createElement('div'); const c = X.mountExercise(d, { id: 't', type: 'transform', prompt: { en: 'x' }, source: 'a b', answers: ['b a'] }, {}); const ok = Boolean(c.retryable && typeof c.reopen === 'function' && typeof c.reveal === 'function'); c.destroy(); return ok; });
  // The second-try flow on a2-05 e10 and "I don't know" on pa1-02 e1, with the real controller.
  async function secondTry(page) {
    await lessonAt(page, 'a2-05', 'e10');
    const wrong = 'Yesterday Omer gets up at seven and has breakfast with his dad.';
    await page.fill('#exroot textarea', wrong);
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-try-again]');
    const foot = await page.textContent('#pfoot');
    assert(/both verbs change|שני הפעלים משתנים/.test(foot) && !/התשובה הנכונה|got up at seven and had/.test(foot), `the note or the answer: ${foot}`);
    assert((await page.getAttribute('#pfoot', 'class')).includes('almost'), 'the second-try footer is not amber');
    await page.click('[data-try-again]');
    const ta = await page.$eval('#exroot textarea', (t) => ({ ro: t.readOnly, v: t.value, focus: document.activeElement === t }));
    assert(!ta.ro && ta.v === wrong && ta.focus, `the field is not open with the learner's text: ${JSON.stringify(ta)}`);
    await page.fill('#exroot textarea', 'Yesterday Omer got up at seven and has breakfast with his dad.');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    assert(/התשובה הנכונה/.test(await page.textContent('#pfoot')), 'the second miss does not show the answer');
    const first = (await page.evaluate(() => window.lucid.store.get('progress', 'a2-05'))).resume.first.find((x) => x[0] === 'e10');
    assert(first && first[1] === 0, `the first try is not the first answer's: ${JSON.stringify(first)}`);
    await lessonAt(page, 'pa1-02', 'e1');
    await page.click('[data-dontknow]');
    await page.waitForSelector('[data-next]');
    const kept = await page.evaluate(() => ({ opts: document.querySelectorAll('#exroot .option').length, right: document.querySelectorAll('#exroot .option.is-right').length, play: Boolean(document.querySelector('#exroot [data-say="normal"]') && document.querySelector('#exroot [data-say="slow"]')) }));
    assert(kept.opts > 1 && kept.right === 1 && kept.play, `"I don't know" removed the exercise: ${JSON.stringify(kept)}`);
  }
  // The exercises lane (EX-4) is merged, so the real controller must have the second try: no stand-in, no skip.
  await check('LF-6 A wrong typed answer gets its note and a second try; "I don\'t know" keeps the exercise (exercises lane controller)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    assert(await hasReopen(page), 'the exercises controller has no reopen/reveal/retryable');
    await secondTry(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf6-second-try.png` });
    await ctx.close();
  });
  await check('LF-6 b1-02: after "My answer is also correct" the end screen says so', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1', { minutes: 50 });
    const l = lessonJson('b1-02');
    await lessonAt(page, 'b1-02', 'e9');
    await page.fill('#exroot textarea', 'Just now Maya passed the test for driving.');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-self-judge]');
    await page.click('[data-self-judge]');
    await page.waitForSelector('[data-next]');
    await page.click('[data-next]');
    await finish(page, l.exercises, () => true);
    assert(/כולל תשובה אחת שסימנתם בעצמכם/.test(await page.textContent('[data-judged-note]').catch(() => '')), 'the end screen does not mention the self-credited answer');
    await ctx.close();
  });

  // ---------- LF-7 ----------
  await check('LF-7 At 390 and 150% the bar keeps 120 px or more, no running tally, and the width moves smoothly', async () => {
    const { ctx, page } = await newPage(browser, { motion: 'no-preference' });
    await learnerAt(page, 'A2', { text: 150 });
    const l = lessonJson('a2-01');
    await lessonAt(page, 'a2-01', 'e11');
    const s = await page.evaluate(() => ({ bar: document.querySelector('.player-top .progress').getBoundingClientRect().width, label: document.querySelector('.step-count').textContent.trim() }));
    assert(s.label === '11 מתוך 16' && s.bar >= 120, `bar ${s.bar}px at "${s.label}"`);
    await step(page, l.exercises, false);
    const after = (await page.textContent('.step-count')).trim();
    assert(after === '12 מתוך 16' && !/לחזרה/.test(after), `the counter after a mistake: ${after}`);
    assert(await page.$eval('.player-top .progress', (b) => b.getBoundingClientRect().width) >= 120, 'the bar shrank after a mistake');
    await solve(page, l.exercises, true);
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    await page.click('[data-next]');
    const w0 = await page.$eval('.player-top .progress span', (x) => x.getBoundingClientRect().width);
    await page.waitForTimeout(200);
    const w1 = await page.$eval('.player-top .progress span', (x) => x.getBoundingClientRect().width);
    assert(Math.abs(w1 - w0) > 0.5, `the bar jumps instead of moving: ${w0} -> ${w1}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf7-150.png` });
    await ctx.close();
  });

  // ---------- LF-8 ----------
  await check('LF-8 a1-01: "Worth watching" quotes "We are go → We go", not "go – went – gone"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1', { minutes: 50 });
    const l = lessonJson('a1-01');
    await lessonAt(page, 'a1-01', 'e4');
    await page.click('#exroot [data-opt="1"]'); // "are go"
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    await page.click('[data-next]');
    await finish(page, l.exercises, () => true);
    const box = await page.textContent('[data-mistakes]');
    assert(/We are go/.test(box) && /We go/.test(box) && /Don't add are|לא מוסיפים are/.test(box), `the box: ${box}`);
    assert(!/went/.test(box), 'the box shows the general irregular-verb note');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf8-a1-01.png`, fullPage: true });
    await ctx.close();
  });
  await check('LF-8 pa1-01: an E/I miss shows the item\'s E/I note; b1-02: a since/for miss shows no "depends on"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1', { minutes: 50 });
    const pa = lessonJson('pa1-01');
    await lessonAt(page, 'pa1-01', 'e5');
    await page.click('#exroot [data-opt="1"]'); // Kinji
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    await page.click('[data-next]');
    await finish(page, pa.exercises, () => true);
    const a = await page.textContent('[data-mistakes]');
    assert(/second letter is E|האות השנייה היא E/.test(a), `pa1-01 box: ${a}`);
    const b1 = lessonJson('b1-02');
    await lessonAt(page, 'b1-02', 'e7');
    await page.evaluate(() => { const g = document.querySelectorAll('#exroot .gap-input'); ['yet', 'for', 'since'].forEach((w, i) => { g[i].value = w; g[i].dispatchEvent(new Event('input', { bubbles: true })); }); });
    await page.click('[data-check]:not([disabled])');
    // A word-bank gap gets no second try (plan.conflicts: typed answers only), so the answer shows at once.
    await page.waitForSelector('[data-next]');
    assert(!(await page.$('[data-try-again]')), 'a word-bank gap offers a second try');
    await page.click('[data-next]');
    await finish(page, b1.exercises, () => true);
    const b = await page.textContent('[data-mistakes]');
    assert(/since/.test(b) && !/depends/.test(b) && !/תלוי ב/.test(b), `b1-02 box: ${b}`);
    await ctx.close();
  });
  await check('LF-8 "Why?" adds the lesson\'s Hebrew-speaker pitfall for that kind of mistake', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await lessonAt(page, 'b1-02', 'e13');
    await page.fill('#exroot textarea', 'I know Noa for ten years.');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next], [data-try-again]');
    if (await page.$('[data-try-again]')) { await page.click('[data-show-answer]'); await page.waitForSelector('[data-next]'); }
    await page.click('#pfoot details.why > summary');
    assert(/מלכודת לדוברי עברית/.test(await page.textContent('#pfoot details.why')), 'no pitfall under "Why?"');
    await ctx.close();
  });

  // ---------- LF-9 ----------
  await check('LF-9 b1-02 e8 with 5 of 6 right: amber "5 מתוך 6 נכונות", counted as 0.83, not among the missed', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    const l = lessonJson('b1-02');
    const e8 = l.exercises.find((e) => e.id === 'e8');
    await lessonAt(page, 'b1-02', 'e8');
    await solve(page, l.exercises, true);
    await page.evaluate((q) => { const k = q.findIndex((x) => x.type === 'tf'); document.querySelector(`[data-tf="${k}"][data-v="${!q[k].answer}"]`).click(); }, e8.questions);
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    assert((await page.textContent('#pfoot .verdict-title')).trim() === '5 מתוך 6 נכונות' && (await page.getAttribute('#pfoot', 'class')).includes('almost'), 'not an amber 5 of 6');
    const first = (await page.evaluate(() => window.lucid.store.get('progress', 'b1-02'))).resume.first.find((x) => x[0] === 'e8');
    assert(Math.abs(first[1] - 5 / 6) < 1e-6, `points: ${first[1]}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf9-read.png` });
    const ids = scoredIds(l);
    await lessonAt(page, 'b1-02', null, Object.fromEntries(ids.map((x, i) => [x, x === 'e8' ? 5 / 6 : i < 6 ? 0 : 1])));
    const missed = (await page.evaluate(() => window.lucid.store.get('progress', 'b1-02'))).missed?.ids || [];
    assert(missed.length && !missed.includes('e8'), `the reading text is among the missed: ${missed}`);
    await ctx.close();
  });

  // ---------- LF-10 ----------
  await check('LF-10 One switch shows all the Hebrew at B1, is remembered for the level, and stays in the lesson', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await page.goto(`${BASE}#/lesson/b1-02`);
    await page.waitForSelector('.lesson-intro [data-he-switch]');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn [data-he-switch]');
    const count = () => page.evaluate(() => ({ chips: [...document.querySelectorAll('.player .he-reveal')].filter((x) => x.getClientRects().length).length, hidden: [...document.querySelectorAll('.lesson-learn .bi-he')].filter((x) => !x.getClientRects().length).length }));
    const before = await count();
    assert(before.chips > 0 && before.hidden > 0, `nothing folded at B1: ${JSON.stringify(before)}`);
    await page.click('[data-he-switch]');
    const after = await count();
    assert(after.chips === 0 && after.hidden === 0 && await page.getAttribute('[data-he-switch]', 'aria-pressed') === 'true', `after one tap: ${JSON.stringify(after)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf10-on.png`, fullPage: true });
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    assert(await page.evaluate(() => !('heAll' in document.documentElement.dataset)), 'the switch leaks into Today');
    await page.goto(`${BASE}#/lesson/b1-03`);
    await page.waitForSelector('.lesson-intro [data-he-switch]');
    assert(await page.getAttribute('[data-he-switch]', 'aria-pressed') === 'true' && await page.evaluate(() => document.documentElement.dataset.heAll === '1'), 'another B1 lesson does not open with the switch on');
    await ctx.close();
  });

  // ---------- LF-11 ----------
  await check('LF-11 The exit returns to the path, to Today, or to Today after a direct link', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.goto(`${BASE}#/path/A2`);
    await page.waitForSelector('a.lesson-row[href="#/lesson/a2-02"]');
    await page.click('a.lesson-row[href="#/lesson/a2-02"]');
    await page.waitForSelector('[data-exit]');
    await page.click('[data-exit]');
    await page.waitForFunction(() => location.hash === '#/path/A2');
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan a[href^="#/lesson/"]');
    await page.click('.plan a[href^="#/lesson/"]');
    await page.waitForSelector('[data-exit]');
    await page.click('[data-exit]');
    await page.waitForFunction(() => location.hash === '#/today');
    await page.goto(`${BASE}#/lesson/a2-03`);
    await page.reload();
    await page.waitForSelector('[data-exit]');
    await page.click('[data-exit]');
    await page.waitForFunction(() => location.hash === '#/today');
    await ctx.close();
  });

  // ---------- LF-12 ----------
  await check('LF-12 #/checkpoint/B2 at 1440: the result has page margins, the learner\'s answers, an honest pass text and a C1 link', async () => {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(page, 'B2');
    const manifest = JSON.parse(readFileSync(join(app, 'content/manifest.json'), 'utf8'));
    const b2 = manifest.lessons.filter((x) => x.startsWith('b2-')).flatMap((x) => lessonJson(x).exercises);
    await page.goto(`${BASE}#/checkpoint/B2`);
    await page.waitForSelector('[data-begin]');
    const intro = await page.textContent('.check-rows');
    assert(/75% ומעלה מסמנים את הרמה כ״מוכחת״/.test(intro) && !/כ״הוכחה״/.test(intro), `intro: ${intro}`);
    // A miss: one wrong answer, then everything right; the result passes.
    await page.click('[data-begin]');
    // The items come in a random order. The miss goes on the first item whose answer the result can show (an
    // option or a typed answer, not a reading, word-count or self-check item); a matching board checks itself (EX-1).
    let k = 0, missed = false;
    for (; k < 30 && await page.$('#exroot'); k++) {
      const wrongNow = !missed && await page.evaluate(() => Boolean(document.querySelector('#exroot :is(.option, .gap-input, textarea, [data-in])')) && !document.querySelector('#exroot :is(.passage, [data-wc], [data-self])'));
      if (wrongNow) missed = true;
      const ex = await solve(page, b2, !wrongNow);
      assert(ex, `could not answer item ${k + 1}`);
      if (ex.type !== 'match') await page.click('[data-check]:not([disabled])');
      await page.waitForTimeout(60);
    }
    assert(missed, 'no item could take a deliberate miss');
    await page.waitForSelector('.check-result');
    const r = await page.evaluate(() => { const c = document.querySelector('.check-result'); const b = c.getBoundingClientRect(); return { left: b.left, right: innerWidth - b.right, h1: c.querySelector('h1').textContent, mine: c.querySelectorAll('.mine-line').length, text: c.textContent, next: c.querySelector('[data-next-level]')?.getAttribute('href') }; });
    assert(r.left > 100 && r.right > 100, `no page margins: ${r.left} / ${r.right}`);
    assert(r.mine >= 1 && /כתבתם:|בחרתם:/.test(r.text), 'a missed item does not show the learner\'s answer');
    assert(/נרשם כראיה לרמה/.test(r.text) && !/בפרופיל המיומנויות/.test(r.text), `the pass text: ${r.text.slice(0, 200)}`);
    assert(r.next === '#/path/C1', `no C1 link after a pass: ${r.next}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lf12-result.png` });
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length ? 1 : 0);
