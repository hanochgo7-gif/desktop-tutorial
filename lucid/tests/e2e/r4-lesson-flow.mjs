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
  } catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
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
    const row = await page.$$eval('.plan a.plan-item[href^="#/review"]', (as) => as.map((a) => a.textContent.replace(/\s+/g, ' ')));
    const n = Number(row.join(' ').match(/(\d+) מילים/)?.[1]);
    assert(words > 0 && words === n, `end screen ${words} words, Today's review row ${n} (${row.join(' | ')})`);
    await shot(page, 'lf1-today-done', { fullPage: true });
    await ctx.close();
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
    const r = await page.$eval('#pfoot', (f) => ({ text: f.textContent, en: [...f.querySelectorAll('.verdict-body [lang="en"]')].map((x) => x.textContent) }));
    assert(/עוד לא. אפשר לתקן בעצמכם/.test(r.text), 'not the second-try footer');
    assert(!/We eat lunch/i.test(r.text) && !/we eat/i.test(r.text), `the note gives the answer: ${r.text}`);
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
