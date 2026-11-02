// Lane e2e for the exercises lane of UX round 3 (EX-1 … EX-11): exercise renderers and answer checking.
// Serves lucid/ itself, drives Chromium through Playwright in the Hebrew UI (390x844 with touch, and 1440x900
// for keyboard checks), prints one line per check and exits 1 on any failure.
// Usage: node tests/e2e/exercises.mjs [--only <substring>]   (port: EX_PORT, default 9123)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const lucid = join(here, '..', '..');
const PORT = Number(process.env.EX_PORT) || 9123;
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

// ---------- helpers ----------
async function newPage(browser, { desktop = false, dark = false } = {}) {
  const ctx = await browser.newContext({
    viewport: desktop ? { width: 1440, height: 900 } : { width: 390, height: 844 },
    hasTouch: !desktop, isMobile: !desktop, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  // Record what would be spoken (headless Chromium has no voices).
  await page.addInitScript(() => { window.__said = []; if (window.speechSynthesis) window.speechSynthesis.speak = (u) => { window.__said.push(u.text); }; });
  return { ctx, page };
}
// A learner at a course level, made through the app's own modules.
async function learnerAt(page, level) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async (lv) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 50, text_size: 100 });
    await L.applyPlacement(P.selfReportResult(lv));
  }, level);
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
// Open lesson `id` at exercise n (1-based) through a saved place, as "Continue" would.
async function openExercise(page, id, n) {
  await page.evaluate(async ({ id, n }) => {
    const { content } = await import('./js/core/content.js');
    const { store } = await import('./js/core/store.js');
    const l = await content.lesson(id);
    store.put('progress', { id, level: l.level, status: 'started', resume: { qi: n - 1, queue: l.exercises.map((e) => [e.id, false]), first: [], missed: false, since: new Date().toISOString(), at: new Date().toISOString() } });
  }, { id, n });
  await page.waitForTimeout(150);
  await page.goto(`${BASE}#/lesson/${id}?resume=1&t=${Date.now()}`);
  await page.waitForSelector('#exroot > *');
  await page.waitForTimeout(200);
}
const lessonEx = (page, id, eid) => page.evaluate(async ({ id, eid }) => (await (await import('./js/core/content.js')).content.lesson(id)).exercises.find((e) => e.id === eid), { id, eid });
const verdict = (page) => page.evaluate(() => ({ cls: document.querySelector('#pfoot')?.className || '', text: (document.querySelector('.verdict')?.textContent || '').replace(/\s+/g, ' ').trim(), selfJudge: Boolean(document.querySelector('[data-self-judge]')) }));
const focusIsBody = (page) => page.evaluate(() => !document.activeElement || document.activeElement === document.body);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', lucid], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- EX-1 ----------
  await check('EX-1 matching: one slip then all six pairs checks itself, amber, not queued again; pairs side by side; the live line speaks after every pair; the wrong mark stays until the next tap with reduced motion', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await openExercise(page, 'a1-01', 1);
    assert(await page.$$eval('.match-col[role="group"]', (g) => g.map((x) => x.getAttribute('aria-label')).join('|')) === 'אנגלית|עברית', 'the columns are not named groups "אנגלית" and "עברית"');
    const ids = await page.$$eval('[data-l]', (b) => b.map((x) => x.dataset.l));
    const live = () => page.textContent('#exroot [data-live]');
    const lives = [];
    await page.click(`[data-l="${ids[0]}"]`);
    await page.click(`[data-r="${ids[1]}"]`);
    lives.push(await live());
    await page.waitForTimeout(700);
    assert(await page.$$eval('.match-item.is-wrong', (x) => x.length) === 2, 'the wrong pair lost its mark before the next tap');
    assert(await page.$$eval('.match-item.is-wrong svg', (x) => x.length) === 2, 'no cross on the wrong pair');
    await page.click(`[data-l="${ids[0]}"]`);
    assert(await page.$$eval('.match-item.is-wrong', (x) => x.length) === 0, 'the wrong mark stays after the next tap');
    await page.click(`[data-r="${ids[0]}"]`);
    lives.push(await live());
    for (const id of ids.slice(1)) { await page.click(`[data-l="${id}"]`); await page.click(`[data-r="${id}"]`); lives.push(await live()); }
    await page.waitForSelector('[data-next]', { timeout: 3000 });
    assert(lives.every((t, k) => t && (k === 0 || t !== lives[k - 1])), `the live line did not change after every pair: ${JSON.stringify(lives)}`);
    assert(/לא מתאים/.test(lives[0]) && /נמצא/.test(lives[1]), `live wording: ${lives.slice(0, 2)}`);
    const v = await verdict(page);
    assert(/almost/.test(v.cls) && /כל הזוגות נכונים/.test(v.text) && /ניסיון נוסף אחד/.test(v.text), `not an amber "all pairs right · one extra try": ${v.cls} ${v.text}`);
    assert(await page.$$eval('.match-row', (r) => r.length) === 6, 'the pairs are not shown as rows');
    const queue = await page.evaluate(() => window.lucid.store.get('progress', 'a1-01')?.resume?.queue || []);
    assert(!queue.some(([id, retry]) => id === 'e1' && retry), 'the matching exercise was queued again');
    await ctx.close();
  });

  await check('EX-1/EX-2/EX-10 layout: at 320px with 150% text, the letter board with pair numbers, the pair rows, the word bank and the sound options never scroll sideways', async () => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 800 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
    await learnerAt(page, 'PreA1');
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.saveSettings({ text_size: 150 }); });
    await page.reload();
    await page.waitForSelector('#view > *');
    // A phone widens its layout viewport to fit what overflows, so compare with the 320px screen itself.
    const wide = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth, ...[...document.querySelectorAll('#exroot *')].map((e) => Math.ceil(e.getBoundingClientRect().right))) - 320);
    const over = [];
    await openExercise(page, 'pa1-01', 3);
    const ids = await page.$$eval('[data-l]', (b) => b.map((x) => x.dataset.l));
    for (const id of ids.slice(0, 3)) { await page.click(`[data-l="${id}"]`); await page.click(`[data-r="${id}"]`); }
    if (await wide() > 1) over.push(`letter board ${await wide()}px`);
    for (const id of ids.slice(3)) { await page.click(`[data-l="${id}"]`); await page.click(`[data-r="${id}"]`); }
    await page.waitForSelector('.match-row');
    if (await wide() > 1) over.push(`pair rows ${await wide()}px`);
    await openExercise(page, 'pa1-02', 9);
    if (await wide() > 1) over.push(`word bank ${await wide()}px`);
    await openExercise(page, 'pa1-02', 6);
    if (await wide() > 1) over.push(`sound options ${await wide()}px`);
    assert(!over.length, over.join(', '));
    await ctx.close();
  });

  // ---------- EX-2 ----------
  await check('EX-2 word bank: a chip fills the tapped gap; Backspace on a filled gap empties it and frees its chip; used chips are marked aria-disabled; chips read left to right', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    await openExercise(page, 'pa1-02', 9);
    await page.click('.gap-input[data-gap="1"]');
    await page.click('[data-chip="sit"]');
    const vals = await page.$$eval('.gap-input', (x) => x.map((i) => i.value));
    assert(vals[0] === '' && vals[1] === 'sit', `gap 2 then "sit" gave ${JSON.stringify(vals)}`);
    const used = await page.$eval('[data-chip="sit"]', (c) => ({ cls: c.classList.contains('used'), aria: c.getAttribute('aria-disabled'), bg: getComputedStyle(c).backgroundColor }));
    const free = await page.$eval('[data-chip="seat"]', (c) => getComputedStyle(c).backgroundColor);
    assert(used.cls && used.aria === 'true' && used.bg !== free, `the used chip is not marked: ${JSON.stringify(used)}`);
    const row = await page.$eval('[data-bank]', (c) => ({ dir: c.getAttribute('dir'), lang: c.getAttribute('lang'), xs: [...c.children].map((b) => b.getBoundingClientRect().x) }));
    assert(row.dir === 'ltr' && row.lang === 'en' && row.xs.every((x, k) => k === 0 || x > row.xs[k - 1]), `the chip row does not read left to right: ${JSON.stringify(row)}`);
    // Tapping a filled gap chooses it without clearing it and shows the clear key; every chip index works.
    for (const [gap, word] of [[0, 'seat'], [1, 'sit']]) {
      await page.click(`.gap-input[data-gap="${gap}"]`);
      if (!(await page.$eval(`.gap-input[data-gap="${gap}"]`, (i) => i.value))) await page.click(`[data-chip="${word}"]`);
      await page.click(`.gap-input[data-gap="${gap}"]`);
      const tools = await page.evaluate((g) => ({ shown: !document.querySelector('[data-gap-tools]').hidden, label: document.querySelector('[data-gap-clear]').textContent.trim(), value: document.querySelector(`.gap-input[data-gap="${g}"]`).value, target: document.querySelector(`.gap-input[data-gap="${g}"]`).getAttribute('aria-current') }), gap);
      assert(tools.shown && tools.label.includes(`רווח ${gap + 1}`) && tools.value === word && tools.target === 'true', `tapping filled gap ${gap + 1}: ${JSON.stringify(tools)}`);
    }
    await page.click('[data-gap-clear]');
    const cleared = await page.evaluate(() => ({ v: document.querySelector('.gap-input[data-gap="1"]').value, aria: document.querySelector('[data-chip="sit"]').getAttribute('aria-disabled') }));
    assert(cleared.v === '' && cleared.aria === 'false', `the clear key did not empty gap 2: ${JSON.stringify(cleared)}`);
    await ctx.close();
    const d = await newPage(browser, { desktop: true });
    await learnerAt(d.page, 'PreA1');
    await openExercise(d.page, 'pa1-02', 9);
    await d.page.focus('[data-chip="seat"]');
    await d.page.keyboard.press('Enter');
    await d.page.keyboard.press('Enter');
    assert(await d.page.evaluate(() => document.activeElement?.matches('[data-check]')), 'after the last gap the focus is not on Check');
    await d.page.keyboard.press('Shift+Tab');
    for (let t = 0; t < 8 && !(await d.page.evaluate(() => document.activeElement?.matches('.gap-input[data-gap="0"]'))); t++) await d.page.keyboard.press('Shift+Tab');
    assert(await d.page.evaluate(() => document.activeElement?.matches('.gap-input[data-gap="0"]')), 'Tab never reaches the filled gap');
    const label = await d.page.$eval('.gap-input[data-gap="0"]', (i) => i.getAttribute('aria-label'));
    assert(/מילה חסרה 1: seat\. Backspace לניקוי/.test(label), `gap label: ${label}`);
    await d.page.keyboard.press('Backspace');
    const after = await d.page.evaluate(() => ({ v: document.querySelector('.gap-input[data-gap="0"]').value, aria: document.querySelector('[data-chip="seat"]').getAttribute('aria-disabled') }));
    assert(after.v === '' && after.aria === 'false', `Backspace did not empty the gap and free its chip: ${JSON.stringify(after)}`);
    await d.ctx.close();
  });

  // ---------- EX-3 ----------
  await check('EX-3 focus: by keyboard on a1-01, categorize 8 items in ≤24 Tabs, order 5 tokens in ≤8, match 6 pairs in ≤20; focus is never BODY after an action', async () => {
    const { ctx, page } = await newPage(browser, { desktop: true });
    await learnerAt(page, 'A1');
    let bodies = 0;
    const act = async (key = 'Enter') => { await page.keyboard.press(key); await page.waitForTimeout(20); if (await focusIsBody(page)) bodies++; };
    const tabsTo = async (pred, arg) => {
      for (let t = 0; t <= 40; t++) { if (await page.evaluate(pred, arg)) return t; await page.keyboard.press('Tab'); }
      throw new Error('a target was never reached by Tab');
    };
    // categorize
    await openExercise(page, 'a1-01', 3);
    const cat = await lessonEx(page, 'a1-01', 'e3');
    await page.focus('.ex-prompt');
    let catTabs = 0;
    for (let k = 0; k < cat.items.length; k++) {
      catTabs += await tabsTo(() => document.activeElement?.matches('[data-item]'));
      const text = await page.evaluate(() => document.activeElement.textContent.trim());
      await act();
      catTabs += await tabsTo((c) => document.activeElement?.matches('[data-bin] > .label') && document.activeElement.textContent.trim() === c, cat.items.find((x) => x.text === text).category);
      await act();
    }
    // order
    await openExercise(page, 'a1-01', 8);
    await page.focus('.ex-prompt');
    let orderTabs = 0;
    for (const w of ['They', 'drink', 'coffee', 'every', 'morning']) {
      orderTabs += await tabsTo((x) => document.activeElement?.matches('[data-in]') && document.activeElement.textContent.trim() === x, w);
      await act();
    }
    // match
    await openExercise(page, 'a1-01', 1);
    await page.focus('.ex-prompt');
    let matchTabs = 0;
    for (let k = 0; k < 6; k++) {
      matchTabs += await tabsTo(() => document.activeElement?.matches('[data-l]:not(:disabled)'));
      const l = await page.evaluate(() => document.activeElement.dataset.l);
      await act();
      matchTabs += await tabsTo((x) => document.activeElement?.matches(`[data-r="${x}"]`), l);
      await act();
    }
    // a number key in a multiple-choice item puts the focus on Check
    await openExercise(page, 'a1-01', 4);
    await page.keyboard.press('3');
    const onCheck = await page.evaluate(() => document.activeElement?.matches('[data-check]'));
    console.log(`      tabs: categorize ${catTabs}, order ${orderTabs}, match ${matchTabs}; BODY focus after an action: ${bodies}`);
    assert(catTabs <= 24 && orderTabs <= 8 && matchTabs <= 20, `too many Tabs: categorize ${catTabs}, order ${orderTabs}, match ${matchTabs}`);
    assert(bodies === 0, `focus fell to BODY ${bodies} times`);
    assert(onCheck, 'after a number key the focus is not on Check');
    await ctx.close();
  });

  // ---------- EX-4 ----------
  await check('EX-4 reveal() and reopen(): every listed type stays on screen locked with the answer marked and play keys kept; typed types reopen with the text kept, wrong fields marked and focused', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    const out = await page.evaluate(async () => {
      const { content } = await import('./js/core/content.js');
      const X = await import('./js/ui/exercise.js');
      const a1 = await content.lesson('a1-01'); const p2 = await content.lesson('pa1-02');
      const by = (l, id) => l.exercises.find((e) => e.id === id);
      const view = document.querySelector('#view');
      const mount = (ex) => {
        view.innerHTML = '<div class="player"><div class="player-body"><div id="exroot"></div></div><div class="player-foot"><button data-check disabled>c</button></div></div>';
        const root = document.querySelector('#exroot');
        return { root, ctl: X.mountExercise(root, ex, { level: 'A1', onChange: (r) => { document.querySelector('[data-check]').disabled = !r; } }) };
      };
      const res = {};
      for (const [name, ex] of [['mcq', by(a1, 'e4')], ['listen', by(p2, 'e1')], ['gap', by(a1, 'e7')], ['gap-bank', by(a1, 'e6')], ['transform', by(a1, 'e9')], ['correct', by(a1, 'e10')], ['dictation', by(a1, 'e13')], ['match', by(a1, 'e1')], ['categorize', by(a1, 'e3')], ['read', by(a1, 'e12')]]) {
        const { root, ctl } = mount(ex);
        await new Promise((r) => setTimeout(r, 80));
        const playsBefore = root.querySelectorAll('[data-say], [data-say-tile]').length;
        if (typeof ctl.reveal !== 'function') { res[name] = { missing: true }; continue; }
        ctl.reveal();
        const open = [...root.querySelectorAll('button:not([disabled]), input:not([readonly]), textarea:not([readonly])')]
          .filter((b) => !b.matches('[data-say], [data-say-tile], [data-reveal-he]') && !b.closest('[hidden]') && !root.dataset.locked);
        res[name] = {
          marked: root.querySelectorAll('.is-right, .reveal-answer, .match-row.is-right').length,
          plays: root.querySelectorAll('[data-say], [data-say-tile]').length >= playsBefore,
          transcript: Boolean(root.querySelector('.transcript')),
          open: open.length,
          prompt: Boolean(root.querySelector('.ex-prompt')),
        };
        ctl.destroy();
      }
      for (const [name, ex, typed] of [['gap', by(a1, 'e7'), ['every', 'in']], ['transform', by(a1, 'e9'), 'We lives in Jerusalem.'], ['correct', by(a1, 'e10'), 'We are eating lunch at one every day.'], ['dictation', by(a1, 'e13'), 'We go to gym on Monday.']]) {
        const { root, ctl } = mount(ex);
        await new Promise((r) => setTimeout(r, 80));
        const fields = [...root.querySelectorAll('.gap-input, textarea')];
        fields.forEach((f, i) => { f.value = Array.isArray(typed) ? typed[i] : typed; f.dispatchEvent(new Event('input', { bubbles: true })); });
        const r1 = await ctl.check();
        ctl.reopen();
        const wrong = fields.filter((f) => f.classList.contains('wrong'));
        res[`reopen-${name}`] = {
          retryable: ctl.retryable === true, first: r1.correct,
          kept: fields.every((f, i) => f.value === (Array.isArray(typed) ? typed[i] : typed)),
          wrongOpen: wrong.length > 0 && wrong.every((f) => !f.readOnly),
          focused: document.activeElement === wrong[0],
          noKeyShown: !root.querySelector('.word-diff'),
          checkOn: !document.querySelector('[data-check]').disabled,
        };
        ctl.destroy();
      }
      return res;
    });
    const bad = [];
    for (const [k, v] of Object.entries(out)) {
      if (v.missing) { bad.push(`${k}: no reveal()`); continue; }
      if (k.startsWith('reopen-')) { if (!(v.retryable && v.first === false && v.kept && v.wrongOpen && v.focused && v.noKeyShown && v.checkOn)) bad.push(`${k}: ${JSON.stringify(v)}`); continue; }
      if (!(v.marked > 0 && v.plays && v.open === 0 && v.prompt) || (k === 'listen' && !v.transcript)) bad.push(`${k}: ${JSON.stringify(v)}`);
    }
    assert(!bad.length, bad.join(' | '));
    await ctx.close();
  });

  // ---------- EX-5 ----------
  await check('EX-5 self-credit: b1-01 e11 "You have ever been to Eilat? x" and b1-02 e11 "I did lived …" are red with no self-credit key; "Have you been to Eilat before?" still gets it; the verdict shows a word diff', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    const tryIt = async (id, n, text) => { await openExercise(page, id, n); await page.fill('#exroot textarea', text); await page.click('[data-check]'); await page.waitForSelector('[data-next]'); return { ...(await verdict(page)), diff: Boolean(await page.$('.verdict .answer-diff del, .verdict .answer-diff ins')) }; };
    const a = await tryIt('b1-01', 11, 'You have ever been to Eilat? x');
    assert(/bad/.test(a.cls) && !a.selfJudge && /עדיין כמו המקור|still the same as the original/.test(a.text) && a.diff, `junk: ${JSON.stringify(a)}`);
    const b = await tryIt('b1-02', 11, 'I did lived in Tel Aviv since 2020.');
    assert(/bad/.test(b.cls) && !b.selfJudge && b.diff, `did lived: ${JSON.stringify(b)}`);
    const c = await tryIt('b1-01', 11, 'Have you been to Eilat before?');
    assert(c.selfJudge && /almost/.test(c.cls), `a paraphrase lost self-credit: ${JSON.stringify(c)}`);
    await ctx.close();
  });

  // ---------- EX-6 ----------
  await check('EX-6 direction: the a1-01 e9 Hebrew source is lang=he, right-aligned, full stop at the left end; True sits left of False and the chosen key is marked after Check; b1-02 e7 has one speaker per line; #/reading passages are numbered', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await openExercise(page, 'a1-01', 9);
    const src = await page.$eval('#exroot .ex-source', (p) => {
      const node = p.firstChild; const r = document.createRange();
      r.setStart(node, node.length - 1); r.setEnd(node, node.length); const stop = r.getBoundingClientRect();
      r.setStart(node, 0); r.setEnd(node, 1); const first = r.getBoundingClientRect();
      const all = document.createRange(); all.selectNodeContents(p);
      return { lang: p.lang, dir: p.dir, rightGap: Math.round(p.getBoundingClientRect().right - Math.max(...[...all.getClientRects()].map((x) => x.right))), stopLeftOfFirst: stop.left < first.left };
    });
    assert(src.lang === 'he' && src.dir === 'rtl' && src.rightGap <= 2 && src.stopLeftOfFirst, `Hebrew source: ${JSON.stringify(src)}`);
    await openExercise(page, 'a1-01', 12);
    const [t, f] = await page.$$eval('[data-tf="0"]', (bs) => bs.map((b) => b.getBoundingClientRect().x));
    assert(t < f, 'True is not left of False');
    await page.evaluate(() => document.querySelectorAll('[data-q]').forEach((q) => { q.querySelector('[data-tf][data-v="true"]')?.click(); q.querySelector('[data-mq]')?.click(); q.querySelectorAll('[data-rg]').forEach((g) => { g.value = 'late'; g.dispatchEvent(new Event('input', { bubbles: true })); }); }));
    await page.click('[data-check]');
    await page.waitForSelector('[data-next]');
    const tf = await page.$$eval('[data-tf="0"]', (bs) => bs.map((b) => ({ v: b.dataset.v, cls: b.className, icon: Boolean(b.querySelector('.ex-mark')) })));
    const chosen = tf.find((x) => x.v === 'true');
    assert(/is-(right|wrong)/.test(chosen.cls) && chosen.icon && tf.some((x) => /is-right/.test(x.cls)), `the chosen key is not marked: ${JSON.stringify(tf)}`);
    assert(/התשובה: (True|False)/.test(await page.textContent('[data-q="0"] .q-fb')) || /נכון/.test(await page.textContent('[data-q="0"] .q-fb')), 'the answer line does not read "התשובה: True/False"');
    await openExercise(page, 'b1-02', 7);
    const turns = await page.$$eval('#exroot .ex-text .speaker', (s) => s.map((x) => ({ name: x.textContent, top: Math.round(x.getBoundingClientRect().top), br: x.previousElementSibling?.tagName === 'BR' })));
    assert(turns.length === 3 && turns[1].top > turns[0].top && turns[2].top > turns[1].top && turns.slice(1).every((x) => x.br), `speakers do not start new lines: ${JSON.stringify(turns)}`);
    await page.goto(`${BASE}#/reading`);
    await page.waitForSelector('a.lesson-row');
    await page.evaluate(() => { location.hash = [...document.querySelectorAll('a.lesson-row')].find((a) => /a1-14/.test(a.getAttribute('href'))).getAttribute('href'); });
    await page.waitForSelector('.passage');
    const nums = await page.$$eval('.passage > p', (ps) => ps.map((p) => getComputedStyle(p, '::before').content));
    assert(nums.length > 1 && nums.every((c) => /counter\(para\)/.test(c)), `passage paragraphs are not numbered: ${nums}`);
    await ctx.close();
  });

  // ---------- EX-7 ----------
  await check('EX-7 typing: pa1-01 e10 "BVGE" marks only J; pa1-02 e10 "tenn" is almost; the a1-01 dictation "thursday" shows the missing letter in amber; "mom" for the "mum" key is right', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    const type = async (id, n, text) => { await openExercise(page, id, n); await page.fill('#exroot textarea', text); await page.click('[data-check]'); await page.waitForSelector('[data-next]'); return verdict(page); };
    await type('pa1-01', 10, 'BVGE');
    const miss = await page.$$eval('#exroot .word-diff .w-miss', (x) => x.map((s) => s.textContent));
    const ok = await page.$$eval('#exroot .word-diff .w-ok', (x) => x.map((s) => s.textContent));
    assert(miss.join() === 'J' && ok.join() === 'B,V,E', `letter code: miss ${miss}, ok ${ok}`);
    assert(/כתבתם G, נאמר J/.test((await verdict(page)).text), 'no "כתבתם G, נאמר J"');
    const tenn = await type('pa1-02', 10, 'Get on the bus at tenn.');
    assert(/almost/.test(tenn.cls), `"tenn" is not almost: ${tenn.cls}`);
    const th = await type('a1-01', 13, 'We go to the gym on Mondays and thursday.');
    const amber = await page.evaluate(() => { const el = document.querySelector('#exroot .w-slip .l-add'); const probe = document.createElement('span'); probe.style.color = 'var(--warn)'; document.body.append(probe); const warn = getComputedStyle(probe).color; probe.remove(); return el ? { text: el.textContent, color: getComputedStyle(el).color, warn } : null; });
    assert(/almost/.test(th.cls) && amber?.text === 's' && amber.color === amber.warn, `thursday: ${th.cls} ${JSON.stringify(amber)}`);
    const mom = await type('a1-02', 11, 'My mom teaches English at a high school.');
    assert(/ok/.test(mom.cls) && !/almost/.test(mom.cls), `US spelling is not right: ${mom.cls}`);
    await ctx.close();
  });

  // ---------- EX-8 ----------
  await check('EX-8 Enter in a2-01 e6 moves from gap 1 to gap 2; with every gap filled, Enter shows the verdict', async () => {
    const { ctx, page } = await newPage(browser, { desktop: true });
    await learnerAt(page, 'A2');
    await openExercise(page, 'a2-01', 6);
    const hints = await page.$$eval('.gap-input', (x) => x.map((i) => i.getAttribute('enterkeyhint')));
    assert(hints.join() === 'next,next,done', `enterkeyhint: ${hints}`);
    await page.focus('.gap-input[data-gap="0"]');
    await page.keyboard.type('swimming');
    await page.keyboard.press('Enter');
    assert(await page.evaluate(() => document.activeElement?.dataset.gap === '1'), 'Enter did not move to gap 2');
    await page.keyboard.type('writing'); await page.keyboard.press('Enter');
    await page.keyboard.type('lying'); await page.keyboard.press('Enter');
    await page.waitForSelector('.verdict', { timeout: 2000 });
    await ctx.close();
  });

  // ---------- EX-9 ----------
  await check('EX-9 sorting: picking a chip highlights the bins; "They lives in Eilat." in the Wrong bin is struck through with no green tick', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await openExercise(page, 'a1-01', 3);
    const cat = await lessonEx(page, 'a1-01', 'e3');
    const help = await page.$eval('[data-cat-help]', (p) => ({ before: Boolean(p.compareDocumentPosition(document.querySelector('[data-pool]')) & Node.DOCUMENT_POSITION_FOLLOWING), size: parseFloat(getComputedStyle(p).fontSize) }));
    assert(help.before && help.size >= 16, `the instruction is not above the items at body size: ${JSON.stringify(help)}`);
    await page.click('[data-item]');
    assert(await page.$$eval('.cat-bin', (b) => b.every((x) => x.classList.contains('is-target'))), 'the bins are not highlighted while an item is chosen');
    for (let k = 0; k < 12; k++) {
      const it = await page.$('[data-item]'); if (!it) break;
      const text = (await it.textContent()).trim();
      await it.click();
      await page.click(`[data-bin="${cat.items.find((x) => x.text === text).category}"] > .label`);
    }
    await page.click('[data-check]');
    await page.waitForSelector('[data-next]');
    const lives = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-bin="Wrong"] [data-placed]')].find((x) => x.textContent.includes('They lives')); return b && { struck: Boolean(b.querySelector('s, del')), tick: Boolean(b.querySelector('svg')), right: b.classList.contains('is-right') }; });
    assert(lives && lives.struck && !lives.tick && !lives.right, `"They lives in Eilat.": ${JSON.stringify(lives)}`);
    await ctx.close();
  });

  // ---------- EX-10 ----------
  await check('EX-10 sound questions: pa1-02 e6 and e7 have play keys for "cup"/"time" and for each option, outside the options; playing does not choose', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'PreA1');
    for (const [n, word] of [[6, 'cup'], [7, 'time']]) {
      await openExercise(page, 'pa1-02', n);
      const info = await page.evaluate(() => ({ prompt: [...document.querySelectorAll('#exroot .ex-text [data-say-tile]')].map((b) => b.dataset.sayTile), options: document.querySelectorAll('#exroot .opt-row > [data-say-tile]').length, total: document.querySelectorAll('#exroot .option').length, inside: document.querySelectorAll('#exroot .option [data-say-tile]').length }));
      assert(info.prompt.includes(word) && info.options === info.total && info.inside === 0, `e${n}: ${JSON.stringify(info)}`);
      await page.click('#exroot .opt-row:first-child > [data-say-tile]');
      await page.waitForTimeout(1400);
      const chosen = await page.$$eval('#exroot .option[aria-pressed="true"]', (x) => x.length);
      assert(chosen === 0 && await page.$eval('[data-check]', (b) => b.disabled), `e${n}: playing chose an option`);
      assert((await page.evaluate(() => window.__said)).length > 0, `e${n}: nothing was played`);
    }
    await ctx.close();
  });

  // ---------- EX-11 ----------
  await check('EX-11 writing step: on c2-03 with 7 words the key is off, reads "שמירה ובדיקה" and shows the words still needed; the b2-01 e16 checklist lines up with its boxes at 390', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'C2');
    const idx = await page.evaluate(async () => (await (await import('./js/core/content.js')).content.lesson('c2-03')).exercises.findIndex((e) => e.type === 'write') + 1);
    await openExercise(page, 'c2-03', idx);
    await page.fill('#exroot textarea', 'This is my answer with seven words.');
    const key = await page.$eval('[data-check]', (b) => ({ off: b.disabled, text: b.textContent.replace(/\s+/g, ' ') }));
    assert(key.off && /שמירה ובדיקה/.test(key.text) && /עוד \d+ מילים/.test(key.text), `writing key: ${JSON.stringify(key)}`);
    await ctx.close();
    const b = await newPage(browser);
    await learnerAt(b.page, 'B2');
    await openExercise(b.page, 'b2-01', 16);
    await b.page.fill('#exroot textarea', Array.from({ length: 30 }, () => 'By the time we arrived, the film had already started.').join(' '));
    await b.page.click('[data-check]');
    await b.page.waitForSelector('.self-check-item');
    const rows = await b.page.$$eval('.self-check-item', (ls) => ls.map((l) => { const box = l.querySelector('input').getBoundingClientRect(); const t = l.querySelector('.self-check-text').getBoundingClientRect(); return { beside: box.right <= t.left + 1 && Math.abs(t.top - box.top) < 8, left: Math.round(t.left) }; }));
    assert(rows.length > 3 && rows.every((r) => r.beside) && new Set(rows.map((r) => r.left)).size === 1, `checklist rows: ${JSON.stringify(rows)}`);
    const wide = await b.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert(!wide, 'the page scrolls sideways at 390');
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
