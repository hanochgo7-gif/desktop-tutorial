// Browser checks for the lesson-flow lane of UX round 4 (docs/qa/panels-r3-retest/plan-r4.json, LF-1 to LF-14):
// the lesson end against Today, second tries that never give the answer away, the lesson chrome at large text,
// the end-of-lesson mistakes, items nobody could hear, learn steps that resume, the part end, IPA in tables,
// the return after a weak lesson, targeted drills, level-check results, short writing drafts and the exit key.
// Serves lucid/ itself and drives Chromium through Playwright. One line per check; exit 1 on any failure.
// Usage: node tests/e2e/r4-lesson-flow.mjs [--only <substring>] [--shots <dir>]   (R4_LF_PORT, default 9703)
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
const PORT = Number(process.env.R4_LF_PORT) || 9703;
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
    await fn();
    results.push({ name, ok: true }); console.log(`PASS  ${name}`);
  } catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); if (process.env.R4_DEBUG) console.log(e.stack); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const lessonJson = (id) => JSON.parse(readFileSync(join(app, `content/lessons/${id}.json`), 'utf8'));
const scoredIds = (l) => l.exercises.filter((e) => !['speak', 'write'].includes(e.type)).map((e) => e.id);
const shot = async (page, name, opts = {}) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); };

// Speech synthesis is stubbed: what would be said is recorded in window.__spoken, with no audio and no wait for
// voices. window.__silent = true makes every utterance end in an error, as on a device with no English voice.
const speechStub = () => {
  window.__spoken = [];
  const s = window.speechSynthesis;
  if (!s) return;
  const add = s.addEventListener.bind(s);
  s.addEventListener = (t, fn, o) => { if (t === 'voiceschanged') setTimeout(fn, 0); else add(t, fn, o); };
  s.speak = (u) => {
    window.__spoken.push(u.text);
    if (window.__silent) setTimeout(() => u.onerror?.({ error: 'synthesis-unavailable' }), 5);
    else setTimeout(() => { u.onstart?.(); u.onend?.(); }, 5);
  };
  s.cancel = () => {};
};
async function newPage(browser, { width = 390, height = 844, motion = 'reduce', scheme = 'light' } = {}) {
  const touch = width < 800;
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: motion, colorScheme: scheme, locale: 'he-IL', serviceWorkers: 'block' });
  await ctx.addInitScript(speechStub);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  return { ctx, page };
}
// A learner at a course level, made through the app's own store.
async function learnerAt(page, level, { text = 100, minutes = 20, support = null } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, text, minutes, support }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: minutes, text_size: text, ...(support ? { hebrew_support: support } : {}) });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, text, minutes, support });
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
// Answers the exercise on screen, right or wrong (see lesson-flow.mjs, where this helper comes from).
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
    else if (root.querySelector('.option')) ex = pool.find((e) => ['mcq', 'listen'].includes(e.type) && norm(e.question) === exText) || pool.find((e) => ['mcq', 'listen'].includes(e.type));
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
      case 'write': { const ta = r.querySelector('textarea'); const s = 'I am a student and I work in a bank. My friends live in Haifa and we study English together every week. '; ta.value = s.repeat(Math.max(1, Math.ceil((ex.min_words || 0) / 22))).trim(); fire(ta); break; }
      default: return null;
    }
    return ex;
  }, { exercises, ok });
}
// Answers one exercise and moves on. Returns the exercise answered.
async function step(page, exercises, ok = true) {
  const ex = await solve(page, exercises, ok);
  assert(ex, `could not recognise the exercise: ${(await page.textContent('#exroot .ex-prompt').catch(() => '?')).slice(0, 80)}`);
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
// Types into the exercise's fields (gaps or the sentence field) and presses Check.
async function typeAndCheck(page, values) {
  await page.evaluate((values) => {
    const fire = (el) => el.dispatchEvent(new Event('input', { bubbles: true }));
    const fields = [...document.querySelectorAll('#exroot :is(.gap-input, textarea):not([readonly])')];
    fields.forEach((f, i) => { f.value = values[Math.min(i, values.length - 1)]; fire(f); });
  }, values);
  await page.click('[data-check]:not([disabled])');
  await page.waitForSelector('[data-next], [data-try-again]');
}
const store = (page, name) => page.evaluate((n) => window.lucid.store.all(n), name);

// Another server already on the port would serve some other copy of the app: refuse to test that.
const busy = await fetch(BASE).then(() => true, () => false);
if (busy) { console.log(`FAIL  port ${PORT} is already in use; set R4_LF_PORT to a free port`); process.exit(1); }
const server = spawn('python3',['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- LF-1: the lesson end agrees with Today ----------
  await check('LF-1 A 10-minute day done by a1-01: the end key says "סיימתם להיום" and goes to Today, Today shows the done banner, and both count the same new words', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1', { minutes: 10 });
    const l = lessonJson('a1-01');
    await page.goto(`${BASE}#/lesson/a1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-skip-learn]');
    await finish(page, l.exercises);
    await page.waitForSelector('#pfoot .key.enter');
    const p = await page.$eval('#pfoot .key.enter', (b) => ({ text: b.textContent.trim(), href: b.getAttribute('href') }));
    assert(/סיימתם להיום/.test(p.text) && p.href === '#/today', `main key: ${JSON.stringify(p)}`);
    const words = Number((await page.textContent('[data-words-added]')).match(/(\d+) מילים מהשיעור נכנסו היום/)?.[1]);
    await shot(page, 'lf1-end-done', { fullPage: true });
    await page.click('#pfoot .key.enter');
    await page.waitForSelector('.done-banner');
    const row = await page.$$eval('.plan a.plan-item[href^="#/review"], a[data-first-recall][href^="#/review"]', (as) => as.map((a) => a.textContent.replace(/\s+/g, ' ')));
    const n = Number(row.join(' ').match(/(\d+) (?:ה)?מילים/)?.[1]);
    assert(words > 0 && words === n, `end screen ${words} words, Today's review row ${n} (${row.join(' | ')})`);
    await shot(page, 'lf1-today-done', { fullPage: true });
    await ctx.close();
  });
  await check('LF-1 A lesson read today but not answered counts the same at the lesson end and on Today: b1-01\'s explanation, then a2-01\'s last items on a 10-minute day', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 10 });
    // Read the start of b1-01's explanation (a 'learn' event, contract (f)), then leave it.
    await page.goto(`${BASE}#/lesson/b1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('button.key.enter[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    // a2-01's last items, answered here, end the lesson.
    const l = lessonJson('a2-01');
    await lessonAt(page, 'a2-01', 'e14');
    await finish(page, l.exercises);
    await page.waitForSelector('#pfoot .key.enter');
    const p = await page.$eval('#pfoot .key.enter', (b) => ({ text: b.textContent.trim(), href: b.getAttribute('href') }));
    const endDone = /סיימתם להיום/.test(p.text) && p.href === '#/today';
    // The day as both screens count it: learner.dayStatus with the paces of every lesson answered or read today.
    const mins = await page.evaluate(async () => {
      const L = await import('./js/core/learner.js'); const A = await import('./js/core/adaptive.js');
      const paces = new Map();
      for (const id of L.todayLessonIds()) { const x = await (await fetch(`content/lessons/${id}.json`)).json(); paces.set(id, { minutes: x.minutes, exercises: x.exercises.length, intro: A.introSlots(x) }); }
      return { ids: L.todayLessonIds(), withRead: L.dayStatus({ paces }).minutesDone, withoutRead: L.dayStatus({ paces: new Map([...paces].filter(([k]) => k !== 'b1-01')) }).minutesDone };
    });
    await shot(page, 'lf1-read-end', { fullPage: true });
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    await page.waitForTimeout(300);
    const todayDone = Boolean(await page.$('.done-banner'));
    await shot(page, 'lf1-read-today', { fullPage: true });
    await ctx.close();
    // The b1-01 reading is what finishes the day here, so a lesson end that counted it at the default pace would differ.
    assert(mins.ids.includes('b1-01') && mins.withRead >= 10 && mins.withoutRead < 10, `the case does not test the reading: ${JSON.stringify(mins)}`);
    assert(endDone === todayDone && todayDone, `lesson end done ${endDone} (${p.text}), Today done ${todayDone}, ${JSON.stringify(mins)}`);
  });
  await check('LF-1 A 30-minute day with the review still open: the end key opens #/review itself, not Today', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 30 });
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.addVocabCards(await (await fetch('content/lessons/a1-01.json')).json(), new Date(Date.now() - 5 * 86400000)); });
    await lessonAt(page, 'a2-01', null, Object.fromEntries(scoredIds(lessonJson('a2-01')).map((x) => [x, 1])));
    const p = await page.$eval('#pfoot .key.enter', (b) => ({ text: b.textContent.trim(), href: b.getAttribute('href') }));
    assert(p.href === '#/review' && /חזרה על מילים/.test(p.text), `main key: ${JSON.stringify(p)}`);
    await ctx.close();
  });

  // ---------- LF-2: the second try never shows the answer ----------
  await check('LF-2 a1-01 e10 "We are eating…": the fix-it-yourself note does not contain "We eat lunch" and has no English line', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await lessonAt(page, 'a1-01', 'e10');
    await typeAndCheck(page, ['We are eating lunch at one every day.']);
    assert(await page.$('[data-try-again]'), 'no second try');
    const r = await page.$eval('#pfoot', (f) => ({ text: f.textContent, en: [...f.querySelectorAll('.verdict-body [lang="en"]')].filter((x) => !x.closest('[lang="he"]')).map((x) => x.textContent) }));
    assert(/עוד לא. אפשר לתקן בעצמכם/.test(r.text), 'not the second-try footer');
    assert(!/We eat lunch/i.test(r.text) && !/we eat/i.test(r.text) && !/a habit/i.test(r.text), `the note gives the answer: ${r.text}`);
    assert(!r.en.length, `English from the note at full support: ${r.en}`);
    await shot(page, 'lf2-a1-01-second-try');
    await ctx.close();
  });
  await check('LF-2 a2-05 e8 "leaved": the note does not contain "left"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await lessonAt(page, 'a2-05', 'e8');
    await typeAndCheck(page, ['leaved', 'came', 'slept']);
    assert(await page.$('[data-try-again]'), 'no second try');
    const t = await page.textContent('#pfoot .verdict');
    assert(!/\bleft\b/.test(t), `the note gives the answer: ${t}`);
    await ctx.close();
  });
  await check('LF-2 b1-02 e11: after "I did lived…" and a second try "I did live…", no self-credit is offered and the answer is shown', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await lessonAt(page, 'b1-02', 'e11');
    await typeAndCheck(page, ['I did lived in Tel Aviv since 2020.']);
    assert(await page.$('[data-try-again]'), 'no second try after "I did lived"');
    await page.click('[data-try-again]');
    await typeAndCheck(page, ['I did live in Tel Aviv since 2020.']);
    assert(!(await page.$('[data-self-judge]')), 'self-credit is offered after a second try');
    const t = await page.textContent('#pfoot .verdict');
    assert(/I have lived in Tel Aviv since 2020/.test(t), `the answer is not shown: ${t}`);
    await shot(page, 'lf2-b1-02-after-second');
    await ctx.close();
  });

  // ---------- LF-3: the lesson chrome at large text ----------
  for (const [w, h] of [[320, 568], [390, 844]]) {
    await check(`LF-3 ${w}x${h} at 150% text: the top is one row (64 px at most), and after a wrong check the footer stays within 45% with the verdict scrolling and a gap still in view`, async () => {
      const { ctx, page } = await newPage(browser, { width: w, height: h });
      await learnerAt(page, 'A2', { text: 150, minutes: 50 });
      await page.goto(`${BASE}#/lesson/a2-01?stage=practice`);
      await page.waitForSelector('#exroot');
      const top = await page.$eval('.player-top', (t) => t.getBoundingClientRect().height);
      assert(top <= 64, `the player top is ${top}px`);
      await shot(page, `lf3-top-${w}`);
      await lessonAt(page, 'a1-01', 'e7');
      await typeAndCheck(page, ['zzz']);
      await page.evaluate(() => document.activeElement?.blur());
      const r = await page.evaluate(() => {
        const foot = document.querySelector('#pfoot');
        const v = foot.querySelector('.verdict');
        const ft = foot.getBoundingClientRect().top;
        const gaps = [...document.querySelectorAll('#exroot .gap-input')].map((g) => g.getBoundingClientRect());
        const over = v.scrollHeight - v.clientHeight > 2;
        const out = { foot: foot.getBoundingClientRect().height, ih: innerHeight, over, fade: v.classList.contains('fade'), scrolls: getComputedStyle(v).overflowY, gapInView: gaps.some((g) => g.top >= 0 && g.bottom <= ft) };
        if (over) { v.scrollTop = v.scrollHeight; out.reached = Math.abs(v.scrollTop + v.clientHeight - v.scrollHeight) < 2; }
        return out;
      });
      assert(r.foot <= 0.45 * r.ih + 0.5, `the footer is ${Math.round(r.foot)}px of ${r.ih}`);
      assert(!r.over || (r.fade && ['auto', 'scroll'].includes(r.scrolls) && r.reached), `the verdict overflows without a fade or a scroll: ${JSON.stringify(r)}`);
      assert(r.gapInView, 'no gap input is fully visible above the footer');
      await page.waitForTimeout(50);
      assert(!r.over || !(await page.$eval('#pfoot .verdict', (v) => v.classList.contains('fade'))), 'the fade stays at the end of the verdict');
      await shot(page, `lf3-second-try-${w}`);
      await ctx.close();
    });
  }
  await check('LF-3 at 100% text the exit key stays on screen after Check (a1-01 e2)', async () => {
    const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
    await learnerAt(page, 'A1');
    await lessonAt(page, 'a1-01', 'e2');
    await solve(page, lessonJson('a1-01').exercises, false);
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
    await page.waitForTimeout(100);
    const top = await page.$eval('[data-exit]', (b) => b.getBoundingClientRect().top);
    assert(top >= 0, `the exit key is at ${top}px`);
    await ctx.close();
  });

  // ---------- LF-13: the exit shows a word ----------
  await check('LF-13 at 390 and 100% text the exit key shows "יציאה" and is at least 44 px tall; at 150% it is the icon alone', async () => {
    const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
    await learnerAt(page, 'A2');
    await page.goto(`${BASE}#/lesson/a2-01?stage=practice`);
    await page.waitForSelector('#exroot');
    const k = await page.$eval('[data-exit]', (b) => ({ text: b.innerText.trim(), h: b.getBoundingClientRect().height, label: b.getAttribute('aria-label') }));
    assert(k.text.includes('יציאה') && k.h >= 44 && /יציאה/.test(k.label), `exit key: ${JSON.stringify(k)}`);
    await page.evaluate(() => { document.documentElement.dataset.text = '150'; });
    const big = await page.$eval('[data-exit]', (b) => ({ text: b.innerText.trim(), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }));
    assert(!big.text && big.h >= 44 && big.w >= 44, `at 150%: ${JSON.stringify(big)}`);
    await ctx.close();
  });

  // ---------- LF-4: "Worth watching" explains the right error and shows only what changed ----------
  // Opens a lesson at one exercise, answers it with `answer` (typed values, or { click: selector }), handles a
  // second try with `second` (values) or "Show the answer", and runs the rest of the lesson right to its end.
  async function missThenFinish(page, lessonId, exId, answer, second = null) {
    const l = lessonJson(lessonId);
    await lessonAt(page, lessonId, exId);
    if (answer.click) { await page.click(answer.click); if (process.env.R4_DEBUG) console.log(await page.evaluate(() => document.querySelector('#pfoot')?.outerHTML.slice(0, 600))); await page.click('[data-check]:not([disabled])'); await page.waitForSelector('[data-next], [data-try-again]'); }
    else await typeAndCheck(page, answer);
    if (await page.$('[data-try-again]')) {
      if (second) { await page.click('[data-try-again]'); await typeAndCheck(page, second); }
      else await page.click('[data-show-answer]');
    }
    await page.waitForSelector('[data-next]');
    await page.click('[data-next]');
    await finish(page, l.exercises);
    await page.waitForSelector('[data-mistakes]');
  }
  await check('LF-4 b1-01 e11 "Have you ever went to Eilat?": the end-screen note is not the word-order rule', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1', { minutes: 50 });
    await missThenFinish(page, 'b1-01', 'e11', ['Have you ever went to Eilat?']);
    const box = await page.textContent('[data-mistakes]');
    assert(/Eilat/.test(box), `e11 is not in the box: ${box}`);
    assert(!/have\/has comes before|בא לפני הנושא/.test(box), `the word-order rule is the note: ${box}`);
    await shot(page, 'lf4-b1-01', { fullPage: true });
    await ctx.close();
  });
  await check('LF-4 a2-05 e8 "leaved": the mistake line shows the change with at most 8 words', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { minutes: 50 });
    await missThenFinish(page, 'a2-05', 'e8', ['leaved', 'came', 'slept']);
    const pair = await page.$eval('[data-mistakes] .mistake-pair', (p) => ({ text: p.textContent, words: (p.textContent.match(/[A-Za-z']+/g) || []).length, del: p.querySelector('del')?.textContent, ins: p.querySelector('ins')?.textContent }));
    assert(pair.words <= 8, `${pair.words} words: ${pair.text}`);
    assert(/leaved/.test(pair.del) && /left/.test(pair.ins), `the change is not marked: ${JSON.stringify(pair)}`);
    await shot(page, 'lf4-a2-05', { fullPage: true });
    await ctx.close();
  });
  await check('LF-4 b2-09 e2 answered wrong: "you chose · the answer", with no arrow and no correction styling', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B2', { minutes: 50 });
    await missThenFinish(page, 'b2-09', 'e2', { click: '#exroot [data-opt="0"]' });
    const item = await page.$eval('[data-mistakes] .mistake-list > li', (li) => ({ text: li.textContent, right: Boolean(li.querySelector('.m-right')) }));
    assert(/parking rules/.test(item.text), `not the b2-09 e2 item: ${item.text}`);
    assert(!item.text.includes('→') && !item.right, `the choice is shown as a correction: ${item.text}`);
    await ctx.close();
  });
  await check('LF-4 a1-01 e9 fixed on the second try: tagged "תיקנתם בעצמכם", not struck through', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1', { minutes: 50 });
    await missThenFinish(page, 'a1-01', 'e9', ['We lives in Jerusalem and works in Tel Aviv.'], ['We live in Jerusalem and work in Tel Aviv.']);
    const item = await page.$eval('[data-mistakes] .mistake-list > li', (li) => ({ text: li.textContent, wrong: Boolean(li.querySelector('.m-wrong, .m-del')) }));
    assert(/תיקנתם בעצמכם/.test(item.text) && !item.wrong, `the fixed item: ${JSON.stringify(item)}`);
    await shot(page, 'lf4-a1-01-fixed', { fullPage: true });
    await ctx.close();
  });

  // ---------- LF-5: an item nobody could hear is not first-try evidence ----------
  await check('LF-5 pa1-02 e1 answered with no English voice: its attempt has no score, it is not missed, and the end percentage leaves it out', async () => {
    const { ctx, page } = await newPage(browser);
    await ctx.addInitScript(() => { window.__silent = true; });
    // Until the exercises lane (EX-4) marks a listen result answered after silence with unheard:true, the listen
    // controller is given that flag here; with EX-4 merged its own transcript path is used.
    let ex4 = false;
    await ctx.route('**/js/ui/exercise.js', async (route) => {
      const res = await route.fetch();
      let src = await res.text();
      ex4 = /unheard/.test(src);
      if (!ex4) src = `${src.replace('export function mountExercise(', 'function mountExerciseR4(')}\nexport function mountExercise(root, ex, opts) { const c = mountExerciseR4(root, ex, opts); if (ex.type === 'listen' && window.__silent) { const check = c.check; c.check = async () => ({ ...(await check()), unheard: true }); } return c; }\n`;
      await route.fulfill({ response: res, body: src });
    });
    await learnerAt(page, 'PreA1', { minutes: 50 });
    const l = lessonJson('pa1-02');
    const others = scoredIds(l).filter((x) => x !== 'e1');
    const fixture = Object.fromEntries(others.map((x, i) => [x, i % 2 ? 1 : 0]));
    await lessonAt(page, 'pa1-02', 'e1', fixture);
    if (ex4) {
      await page.click('#exroot [data-say="normal"]');
      await page.getByText('להציג את התמליל עכשיו').click();
    }
    await page.click('#exroot [data-opt="0"]');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    assert(/נשמע\? לא נספר/.test(await page.textContent('#pfoot .verdict-title')), `verdict: ${await page.textContent('#pfoot .verdict-title')}`);
    await shot(page, 'lf5-unheard');
    // The rest of the lesson as the fixture says: jump to the end with the saved place.
    await page.evaluate((fixture) => { const p = window.lucid.store.get('progress', 'pa1-02'); window.lucid.store.put('progress', { ...p, resume: { ...p.resume, qi: p.resume.queue.length, first: Object.entries(fixture) } }); }, fixture);
    await page.goto(`${BASE}#/lesson/pa1-02?resume=1&t=${Date.now()}`);
    await page.waitForSelector('[data-score-line]');
    const at = (await store(page, 'attempts')).filter((a) => a.lesson === 'pa1-02' && a.exercise === 'e1');
    assert(at.length === 1 && at[0].score === null, `e1 attempts: ${JSON.stringify(at)}`);
    const prog = await page.evaluate(() => window.lucid.store.get('progress', 'pa1-02'));
    assert(!(prog.missed?.ids || []).includes('e1'), `e1 is among the missed: ${JSON.stringify(prog.missed?.ids)}`);
    const pct = Math.floor((Object.values(fixture).reduce((a, b) => a + b, 0) / others.length) * 100 + 1e-6);
    const line = await page.textContent('[data-score-line]');
    assert(line.includes(`${pct}%`), `the end percentage is not over the other ${others.length} items (${pct}%): ${line}`);
    await shot(page, 'lf5-end', { fullPage: true });
    await ctx.close();
  });

  // ---------- LF-6: learn steps resume, and only step 1 has the big title ----------
  await check('LF-6 a fresh learner leaves a2-02 at learn step 3: the intro offers "continue reading · step 3", which opens step 3; a learn event is stored; step 2 has no title h1', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    assert(!(await page.evaluate(() => window.lucid.store.get('progress', 'a2-02'))?.learn_step), 'not a fresh learner');
    await page.goto(`${BASE}#/lesson/a2-02`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn [data-step-label]');
    const n = Number((await page.textContent('[data-step-label]')).match(/מתוך (\d+)/)?.[1]);
    assert(n >= 3, `a2-02 has ${n} steps`);
    await page.click('[data-learn-next]');
    await page.waitForFunction(() => /^2 מתוך/.test(document.querySelector('[data-step-label]')?.textContent.trim()));
    const h1s = await page.$$eval('.lesson-learn h1', (hs) => hs.map((h) => h.textContent));
    const title = lessonJson('a2-02').title_en;
    assert(!h1s.some((t) => t.includes(title)), `step 2 repeats the title h1: ${h1s}`);
    await shot(page, 'lf6-step2');
    await page.click('[data-learn-next]');
    await page.waitForFunction(() => /^3 מתוך/.test(document.querySelector('[data-step-label]')?.textContent.trim()));
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('#view > *');
    await page.goto(`${BASE}#/lesson/a2-02?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    const key = (await page.textContent('#pfoot .key.enter')).trim();
    assert(/שלב 3/.test(key), `the intro primary: ${key}`);
    await shot(page, 'lf6-intro-continue');
    await page.click('#pfoot .key.enter');
    await page.waitForFunction(() => /^3 מתוך/.test(document.querySelector('[data-step-label]')?.textContent.trim()));
    const ev = (await store(page, 'events')).filter((e) => e.type === 'learn' && e.lesson === 'a2-02');
    assert(ev.length >= 3, `learn events: ${JSON.stringify(ev)}`);
    await ctx.close();
  });
  await check('LF-6 the reading time is worked out per lesson: pa1-01 and a1-01 show different times', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    const time = async (lid) => {
      await page.goto(`${BASE}#/lesson/${lid}?t=${Date.now()}`);
      await page.waitForSelector('.lesson-intro');
      await page.click('[data-go="learn"]');
      await page.waitForSelector('[data-step-label]');
      return (await page.textContent('[data-step-label]')).match(/כ-(\d+) דק׳ קריאה/)?.[1];
    };
    const a = await time('pa1-01');
    const b = await time('a1-01');
    assert(a && b && a !== b, `pa1-01 ${a} min, a1-01 ${b} min`);
    await ctx.close();
  });

  // ---------- LF-7: the part end, Today and resume name the same place ----------
  await check('LF-7 a 10-minute learner on b1-01: the part end, Today and the resumed counter name the same exercise; the place comes before the score; "Stop here" stays the main key', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1', { minutes: 10 });
    const l = lessonJson('b1-01');
    await page.goto(`${BASE}#/lesson/b1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-skip-learn]');
    for (let i = 0; i < 20 && !(await page.$('.part-end')); i++) {
      await page.waitForSelector('#exroot, .part-end');
      if (await page.$('.part-end')) break;
      await step(page, l.exercises, i % 2 === 0);
    }
    await page.waitForSelector('.part-end');
    const end = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('.part-end p')];
      const place = ps.find((p) => /המקום שלכם נשמר/.test(p.textContent));
      const score = document.querySelector('.part-score');
      return { place: place?.textContent || '', counter: document.querySelector('.step-count')?.textContent.trim(), scoreAfter: place && score ? Boolean(place.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING) : null, stop: document.querySelector('[data-part-stop]')?.matches('.key.enter') };
    });
    const at = end.place.match(/מתרגיל (\d+) מתוך (\d+)/);
    assert(at, `no place on the part end: ${end.place}`);
    await shot(page, 'lf7-part-end', { fullPage: true });
    await page.click('[data-part-stop]');
    await page.waitForSelector('.plan');
    const today = (await page.textContent('.plan')).match(/ממשיכים מתרגיל (\d+) מתוך (\d+)/);
    assert(today && today[1] === at[1], `Today says ${today?.[0]}, the part end ${at[0]}`);
    await page.goto(`${BASE}#/lesson/b1-01?resume=1&t=${Date.now()}`);
    await page.waitForSelector('#exroot');
    const counter = (await page.textContent('.step-count')).trim();
    assert(counter.startsWith(`${at[1]} מתוך`), `the resumed counter is ${counter}, the part end ${at[0]}`);
    assert(end.scoreAfter === true, 'the score does not come after the saved place');
    assert(end.stop, '"Stop here" is not the main key');
    assert(/הושלמו/.test(end.counter || ''), `the part-end counter does not say what was done: ${end.counter}`);
    await ctx.close();
  });

  // ---------- LF-8: "Show IPA" hides all IPA at Pre-A1, sound tables play their examples, Hebrew headers ----------
  // Text nodes in the learn step that show IPA and are really on screen.
  const visibleIpa = (page) => page.evaluate(() => {
    const out = [];
    const walk = document.createTreeWalker(document.querySelector('.lesson-learn'), NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!/\/[æɪʌɒθ]/.test(n.textContent)) continue;
      const e = n.parentElement;
      if (e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.sr-only')) out.push(n.textContent.trim());
    }
    return out;
  });
  async function learnStepWith(page, lid, sel, max = 14) {
    await page.goto(`${BASE}#/lesson/${lid}?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    for (let s = 0; s < max && !(await page.$(sel)); s++) { const n = await page.$('[data-learn-next]'); if (!n) break; await n.click(); await page.waitForTimeout(60); }
    return Boolean(await page.$(sel));
  }
  for (const text of [100, 150]) {
    await check(`LF-8 pa1-02 learn step 1 at 390 and ${text}% text: no IPA on screen until "Show IPA", then it shows`, async () => {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'PreA1', { text });
      await learnStepWith(page, 'pa1-02', '.lesson-learn');
      assert(await page.$('.lesson-learn [data-ipa-toggle]'), 'step 1 has no "Show IPA" key');
      const off = await visibleIpa(page);
      assert(!off.length, `IPA on screen with the toggle off: ${off.slice(0, 4).join(' | ')}`);
      await shot(page, `lf8-pa1-02-off-${text}`, { fullPage: true });
      await page.click('.lesson-learn [data-ipa-toggle]');
      const on = await visibleIpa(page);
      assert(on.length > 0, 'IPA does not show after "Show IPA"');
      await ctx.close();
    });
  }
  await check('LF-8 pa1-02: the th/w/v table has "Show IPA", and each row\'s play key sits in its examples cell and plays it', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    assert(await learnStepWith(page, 'pa1-02', '.table-wrap:has(td[data-label^="Sound"])'), 'no th/w/v table');
    const t = await page.evaluate(() => {
      const w = document.querySelector('.table-wrap:has(td[data-label^="Sound"])');
      const tools = w.previousElementSibling?.previousElementSibling;
      const rows = [...w.querySelectorAll('tbody tr')].map((tr) => { const b = tr.querySelector('.row-say'); const td = b?.closest('td'); return { say: b?.dataset.sayText, cell: td ? [...td.childNodes].filter((n) => n !== b).map((n) => n.textContent).join('').trim() : null, label: td?.dataset.label }; });
      return { toggle: Boolean(tools?.querySelector('[data-ipa-toggle]')), rows };
    });
    assert(t.toggle, 'the th/w/v table has no "Show IPA"');
    assert(t.rows.length && t.rows.every((r) => r.say && r.say === r.cell && /^Examples/.test(r.label)), `play keys: ${JSON.stringify(t.rows)}`);
    // The vowel table too: the play key is in the examples cell, not by the letter.
    await page.goto(`${BASE}#/lesson/pa1-02?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn .table-wrap');
    const v = await page.$$eval('.lesson-learn .table-wrap .row-say', (bs) => bs.map((b) => ({ label: b.closest('td').dataset.label, say: b.dataset.sayText })));
    assert(v.length === 5 && v.every((x) => /^Examples/.test(x.label)), `vowel table play keys: ${JSON.stringify(v)}`);
    await ctx.close();
  });
  await check('LF-8 pa1-01 word cards show no IPA or part of speech until "Show IPA"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    assert(await learnStepWith(page, 'pa1-01', '.lesson-learn .word-row'), 'no word cards in pa1-01');
    const shown = () => page.$$eval('.lesson-learn .word-row .word-line > span', (ss) => ss.filter((s) => s.getClientRects().length).map((s) => s.textContent.trim()));
    const off = await shown();
    assert(!off.some((x) => /^\/.*\/$|^(noun|verb|adjective|adverb)/.test(x)), `IPA or part of speech on a word card: ${off.join(' | ')}`);
    await page.click('.lesson-learn [data-ipa-toggle]');
    assert((await shown()).some((x) => /^\/.*\/$/.test(x)), 'IPA does not show on the word cards after "Show IPA"');
    await shot(page, 'lf8-pa1-01-words');
    await ctx.close();
  });
  await check('LF-8 a table with headers_he shows the Hebrew under each header, and its English columns stay left to right', async () => {
    const { ctx, page } = await newPage(browser);
    await ctx.route('**/content/lessons/pa1-02.json', async (route) => {
      const res = await route.fetch();
      const l = await res.json();
      const t = l.explanation.find((b) => b.type === 'table');
      t.headers_he = ['אות', 'צליל קצר', 'דוגמאות', 'איך זה נשמע'];
      await route.fulfill({ response: res, json: l });
    });
    await learnerAt(page, 'PreA1');
    await learnStepWith(page, 'pa1-02', '.lesson-learn .table-wrap');
    const r = await page.evaluate(() => {
      const w = document.querySelector('.lesson-learn .table-wrap');
      const ths = [...w.querySelectorAll('thead th')].map((th) => ({ he: th.querySelector('.th-he')?.textContent, cls: th.className }));
      const en = [...w.querySelectorAll('tbody tr:first-child td.c-en')].map((td) => getComputedStyle(td).direction);
      return { dir: getComputedStyle(w).direction, ths, en, label: w.querySelector('tbody td.c-en')?.dataset.label };
    });
    assert(r.ths.filter((x) => !/c-he/.test(x.cls)).every((x) => x.he), `a header without its Hebrew: ${JSON.stringify(r.ths)}`);
    assert(r.dir === 'ltr' && r.en.length >= 2 && r.en.every((d) => d === 'ltr'), `the English columns are not left to right: ${JSON.stringify(r)}`);
    assert(/אות/.test(r.label || ''), `the card label has no Hebrew: ${r.label}`);
    await ctx.close();
  });

  // ---------- LF-10: targeted drills give the lesson's help ----------
  const typedItem = (page) => page.evaluate(() => Boolean(document.querySelector('#exroot textarea:not([readonly]), #exroot .gap-input:not([readonly])')) && !document.querySelector('#exroot [data-chip], #exroot [data-wc]'));
  await check('LF-10 #/drill?error=article: a primer with the pitfall first; a wrong typed item gets "Try again"; "Why?" then holds the pitfall', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await page.goto(`${BASE}#/drill?error=article`);
    await page.waitForSelector('[data-drill-primer]');
    assert(await page.$('[data-drill-primer] .pitfall-head'), 'the primer has no pitfall');
    await shot(page, 'lf10-primer');
    await page.click('[data-drill-start]');
    let found = false;
    for (let k = 0; k < 12 && !found; k++) {
      await page.waitForSelector('#exroot');
      if (await typedItem(page)) {
        await typeAndCheck(page, ['zzz']);
        found = Boolean(await page.$('[data-try-again]'));
        if (!found) { await page.click('[data-next]'); continue; }
      } else {
        await page.click('[data-idk]');
        await page.waitForSelector('[data-next]');
        await page.click('[data-next]');
      }
    }
    assert(found, 'no wrong typed item offered "Try again"');
    await shot(page, 'lf10-second-try');
    await page.click('[data-show-answer]');
    await page.waitForSelector('[data-next]');
    assert(await page.$('#pfoot details.why .pitfall-why'), '"Why?" has no pitfall');
    await ctx.close();
  });
  await check('LF-10 #/checkpoint/A1 stays unassisted: a wrong typed item gets no second try', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await page.goto(`${BASE}#/checkpoint/A1`);
    await page.waitForSelector('[data-begin]');
    await page.click('[data-begin]');
    let typed = false;
    for (let k = 0; k < 16 && !typed; k++) {
      await page.waitForSelector('#exroot');
      typed = await typedItem(page);
      if (typed) {
        await page.evaluate(() => document.querySelectorAll('#exroot :is(textarea, .gap-input):not([readonly])').forEach((f) => { f.value = 'zzz'; f.dispatchEvent(new Event('input', { bubbles: true })); }));
        await page.click('[data-check]:not([disabled])');
      } else await page.click('[data-idk]');
      await page.waitForTimeout(150);
      assert(!(await page.$('[data-try-again], [data-show-answer]')), 'the level check offers a second try');
    }
    assert(typed, 'no typed item in the level check');
    await ctx.close();
  });

  // ---------- LF-11: level-check results show the question; the intro claims only what the check shows ----------
  await check('LF-11 #/checkpoint/B1 with every multiple-choice item wrong: each missed item shows its question; no "מה באמת בשליטה"', async () => {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(page, 'B1');
    const manifest = JSON.parse(readFileSync(join(app, 'content/manifest.json'), 'utf8'));
    const ids = (manifest.lessons || []).map((x) => (typeof x === 'string' ? x : x.id)).filter((x) => /^b1-/.test(x));
    const b1 = ids.flatMap((x) => lessonJson(x).exercises);
    await page.goto(`${BASE}#/checkpoint/B1`);
    await page.waitForSelector('[data-begin]');
    assert(!/מה באמת בשליטה/.test(await page.textContent('body')), 'the intro still claims "what you really know"');
    await page.click('[data-begin]');
    const questions = [];
    for (let k = 0; k < 30 && await page.$('#exroot'); k++) {
      const choice = await page.evaluate(() => Boolean(document.querySelector('#exroot .option')) && !document.querySelector('#exroot .passage'));
      const ex = await solve(page, b1, !choice);
      assert(ex, `could not answer item ${k + 1}`);
      if (choice && ex.question) questions.push(ex.question);
      if (ex.type !== 'match') await page.click('[data-check]:not([disabled])');
      await page.waitForTimeout(60);
    }
    await page.waitForSelector('.check-result');
    assert(questions.length > 0, 'no multiple-choice item in the check');
    const misses = await page.$$eval('.check-miss', (ms) => ms.map((m) => m.textContent.replace(/\s+/g, ' ')));
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const lost = questions.filter((q) => !misses.some((m) => m.includes(norm(q))));
    assert(!lost.length, `missed items without their question: ${lost.join(' | ')}`);
    assert(!/מה באמת בשליטה/.test(await page.textContent('body')), 'the result page claims "what you really know"');
    await shot(page, 'lf11-check-result', { fullPage: true });
    await ctx.close();
  });

  // ---------- LF-14: a short writing draft is amber ----------
  await check('LF-14 b1-01 e16 saved at 40 words: the result footer is amber ("almost"), not green', async () => {
    const { ctx, page } = await newPage(browser);
    // Until the exercises lane (EX-7) adds short:true to a short save, the write result is given it here.
    await ctx.route('**/js/ui/exercise.js', async (route) => {
      const res = await route.fetch();
      let src = await res.text();
      if (!/short\s*:/.test(src)) src = src.replace('response: text, writing: true }', 'response: text, writing: true, short: countWords(text) < (ex.min_words || 0) }');
      await route.fulfill({ response: res, body: src });
    });
    await learnerAt(page, 'B1');
    await lessonAt(page, 'b1-01', 'e16');
    const words = Array.from({ length: 40 }, (_, i) => (i % 8 === 7 ? 'travelled.' : ['I', 'have', 'never', 'been', 'to', 'Eilat', 'but'][i % 8] || 'and')).join(' ');
    await page.fill('#exroot textarea', words);
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    const cls = await page.getAttribute('#pfoot', 'class');
    assert(/\balmost\b/.test(cls) && !/\bok\b/.test(cls), `footer class: ${cls}`);
    await shot(page, 'lf14-short-draft');
    await ctx.close();
  });

  // ---------- LF-9: after a weak lesson ----------
  await check('LF-9 a2-01 under 50%: at most two footer keys, a "להיום" text link, and coming back leads with re-reading', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const ids = scoredIds(lessonJson('a2-01'));
    await lessonAt(page, 'a2-01', null, Object.fromEntries(ids.map((x, i) => [x, i < 3 ? 1 : 0])));
    const keys = await page.$$eval('#pfoot .key', (b) => b.length);
    assert(keys <= 2, `${keys} keys in the failed footer`);
    const later = await page.$$eval('.player-body a[href="#/today"]', (as) => as.map((a) => a.textContent.trim()));
    assert(later.includes('להיום'), `no "להיום" link in the page: ${later}`);
    assert(/מה שעניתם נכון נשמר, ולא צריך לעשות אותו שוב/.test(await page.textContent('.player-body')), 'the kept-answers line is not the new one');
    await shot(page, 'lf9-failed-end', { fullPage: true });
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    assert(await page.$('#pfoot .key.enter[data-relearn]'), `the intro primary is not re-reading: ${await page.textContent('#pfoot .key.enter')}`);
    assert((await page.$$('#pfoot .key')).length <= 2, 'the intro footer has more than two keys');
    await shot(page, 'lf9-return-intro', { fullPage: true });
    await ctx.close();
  });

  // ---------- LF-12: the lesson end leads with what was gained ----------
  await check('LF-12 a1-01 end screen: plural address, and the words banner comes before the percentage line', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await lessonAt(page, 'a1-01', null, Object.fromEntries(scoredIds(lessonJson('a1-01')).map((x) => [x, 1])));
    const r = await page.evaluate(() => {
      const body = document.querySelector('.player-body');
      const w = body.querySelector('[data-words-added]');
      const s = body.querySelector('[data-score-line]');
      return { text: body.textContent, order: w && s ? Boolean(w.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) : null };
    });
    assert(!/ענית /.test(r.text), 'singular "ענית" on the end screen');
    assert(r.order === true, `the words banner does not come before the percentage (${r.order})`);
    await shot(page, 'lf12-end', { fullPage: true });
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
