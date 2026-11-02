// Browser acceptance checks for the UX round 3 lane "practice-hubs" (docs/qa/panels-r3/plan.json): review, the
// practice hubs (listening, vocabulary, grammar, speaking), Practice, the tutor, account and Settings. Serves lucid/
// itself, drives Chromium through Playwright (Hebrew UI, phone 390x844 with touch and desktop 1440x900), prints one
// line per check and exits 1 on any failure.
// Usage: node tests/e2e/practice-hubs.mjs [--only <substring>] [--shots <dir>]
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
const PORT = Number(process.env.LANE_PORT) || 9163;
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
async function newPage(browser, { viewport = PHONE, dark = false, init = null } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  return { ctx, page };
}
const shot = (page, name, full = true) => (SHOTS ? page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full }) : null);
// A learner at a course level, made through the app's own store.
async function learnerAt(page, level, { goals = ['travel'], text = 100, lang = 'he' } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, goals, text, lang }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 1990, ui_language: lang, goals, created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, goals, text, lang });
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
async function go(page, hash, sel = '#view > *') {
  await page.goto(`${BASE}#/${hash}`);
  await page.waitForSelector(sel);
  await page.waitForTimeout(250);
}
const store = (page, coll) => page.evaluate((c) => window.lucid.store.all(c), coll);
const heWords = (s) => s.split(/\s+/).filter((w) => /[א-ת]/.test(w)).length;
// The words of the A1 lessons, entered in review for an A2 learner (placed out of A1); only `ids` are due now.
async function a1Words(page) {
  await page.evaluate(async () => { const L = await import('./js/core/learner.js'); await L.importPlacedOutVocab('A1'); });
  return (await store(page, 'cards')).filter((c) => c.kind === 'meaning');
}
async function dueOnly(page, ids) {
  await page.evaluate((ids) => {
    const now = Date.now();
    for (const c of window.lucid.store.all('cards')) window.lucid.store.put('cards', { ...c, fsrs: { ...c.fsrs, due: new Date(ids.includes(c.id) ? now - 1000 : now + 5 * 86_400_000).toISOString() } });
  }, ids);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- PH-1 ----------
  await check('PH-1. Review options: the right answer moves, no distractor set repeats, verbs among verbs, no option over 4 words', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const cards = await a1Words(page);
    const verbs = cards.filter((c) => c.payload.pos === 'verb');
    const others = cards.filter((c) => c.payload.pos !== 'verb');
    const sessions = [[...verbs.slice(0, 4), ...others.slice(0, 4)], [...verbs.slice(4, 8), ...others.slice(4, 8)]].map((s) => s.map((c) => c.id));
    const positions = new Set(); const sets = []; let verbCards = 0;
    for (const [n, ids] of sessions.entries()) {
      await dueOnly(page, ids);
      await go(page, `review?session=${n}`, '.flash');
      for (let k = 0; k < ids.length; k++) {
        await page.waitForSelector('[data-pick]');
        const word = (await page.textContent('.prompt-word')).trim();
        const card = cards.find((c) => c.payload.word === word);
        const opts = await page.$$eval('[data-pick] span:not(.k)', (x) => x.map((s) => s.textContent.trim()));
        assert(opts.length === 4, `${word}: ${opts.length} options`);
        for (const o of opts) assert(heWords(o) <= 4, `${word}: option "${o}" is longer than 4 words`);
        await page.click('[data-pick="0"]');
        await page.click('[data-check]');
        await page.waitForSelector('[data-next]');
        const answer = await page.$$eval('[data-pick]', (x) => x.findIndex((b) => b.classList.contains('is-right')));
        assert(answer >= 0, `${word}: no right option marked`);
        positions.add(answer);
        const key = opts.filter((_, n) => n !== answer).sort().join('|');
        assert(!sets.includes(key), `${word}: distractor set repeats: ${key}`);
        sets.push(key);
        if (card.payload.pos === 'verb') { verbCards++; for (const o of opts) assert(o.startsWith('ל'), `verb "${word}" shows a non-verb option "${o}"`); }
        if (k === 0) await shot(page, 'ph1-review-390', false);
        await page.click('[data-next]');
      }
      await page.waitForSelector('#rv-done');
    }
    assert(verbCards === 8, `${verbCards} verb cards`);
    assert(positions.size >= 3, `the right answer sat only at ${[...positions]}`);
    await ctx.close();
  });

  // ---------- PH-2 ----------
  await check('PH-2. Review works like a lesson: a tap selects, Check commits; empty typed answer keeps Check off; an override turns green; the end lists missed words', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const cards = await a1Words(page);
    const pickIds = cards.slice(0, 2).map((c) => c.id);
    const typedIds = cards.slice(2, 4).map((c) => c.id);
    await page.evaluate((ids) => { for (const c of window.lucid.store.all('cards')) if (ids.includes(c.id)) window.lucid.store.put('cards', { ...c, fsrs: { ...c.fsrs, reps: 3 } }); }, typedIds);
    await dueOnly(page, [...pickIds, ...typedIds]);
    await go(page, 'review', '.flash');
    let missedWords = [];
    for (let k = 0; k < 4; k++) {
      const word = (await page.textContent('.prompt-word')).trim();
      if (await page.$('[data-pick]')) {
        assert(await page.$eval('[data-check]', (b) => b.disabled), 'Check is on before an option is chosen');
        const attempts0 = (await store(page, 'attempts')).length;
        await page.tap('[data-pick="1"]');
        await page.waitForTimeout(150);
        assert(!(await page.$('[data-next]')), 'a tap graded the option');
        assert((await store(page, 'attempts')).length === attempts0, 'a tap recorded an attempt');
        assert(await page.$eval('[data-pick="1"]', (b) => b.getAttribute('aria-pressed') === 'true'), 'the tapped option is not pressed');
        await page.keyboard.press('3');
        assert(await page.$eval('[data-pick="2"]', (b) => b.getAttribute('aria-pressed') === 'true'), 'key 3 did not select the third option');
        assert(!(await page.$('[data-next]')), 'a number key graded the option');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-next]');
        if (await page.$('#pfoot.bad')) missedWords.push(word);
      } else {
        assert(await page.$eval('[data-check]', (b) => b.disabled), 'Check is on with an empty field');
        await page.fill('#ans', 'א');
        assert(!(await page.$eval('[data-check]', (b) => b.disabled)), 'Check stays off after typing');
        await page.fill('#ans', '   ');
        assert(await page.$eval('[data-check]', (b) => b.disabled), 'Check is on with only spaces');
        await page.fill('#ans', 'משהו אחר לגמרי');
        await page.click('[data-check]');
        await page.waitForSelector('[data-override]');
        if (!missedWords.includes('override')) {
          await page.click('[data-override]');
          const foot = await page.$eval('#pfoot', (f) => ({ cls: f.className, text: f.textContent }));
          assert(/\bok\b/.test(foot.cls) && /נספר כנכון/.test(foot.text) && foot.text.includes(word), `override footer: ${foot.cls} ${foot.text}`);
          await shot(page, 'ph2-override-390', false);
          missedWords.push('override');
        } else missedWords.push(word);
      }
      await page.keyboard.press('Enter');
    }
    missedWords = missedWords.filter((w) => w !== 'override');
    await page.waitForSelector('#rv-done');
    await shot(page, 'ph2-end-390');
    const listed = await page.$$eval('.review-miss', (x) => x.map((li) => li.textContent));
    assert(listed.length === missedWords.length && missedWords.every((w) => listed.some((t) => t.includes(w))), `missed ${missedWords} but listed ${listed.length}`);
    if (missedWords.length) {
      assert(listed.every((t) => /תחזור/.test(t)), 'missed words do not say when they come back');
      const href = await page.getAttribute('a[href^="#/games/"]', 'href');
      assert(href && /focus=/.test(href) && /לשחק במילים האלה/.test(await page.textContent('a[href^="#/games/"]')), `no game with these words: ${href}`);
    }
    assert(await page.$('.player-foot a[href="#/today"]'), 'no way back to Today');
    await ctx.close();

    // Nothing due at 1440: a heading, the action and a way out, centred.
    const d = await newPage(browser, { viewport: DESKTOP });
    await learnerAt(d.page, 'A2');
    await go(d.page, 'review', '.empty');
    await shot(d.page, 'ph2-empty-1440', false);
    const box = await d.page.$eval('.empty', (e) => { const r = e.getBoundingClientRect(); return { mid: r.left + r.width / 2, top: r.top, bottom: r.bottom, w: innerWidth, h: innerHeight }; });
    assert(Math.abs(box.mid - box.w / 2) < 4 && box.top > 0 && box.bottom < box.h, `empty state not centred: ${JSON.stringify(box)}`);
    assert(await d.page.$('.empty h1'), 'no h1');
    assert(/להוסיף את המילים של A1/.test(await d.page.textContent('.empty')), 'placed-out learner is not offered the A1 words');
    assert(await d.page.$('.empty a[href="#/today"]'), 'no exit to Today');
    await d.page.click('[data-import]');
    await d.page.waitForSelector('.flash');
    await d.ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

if (pageErrors.length) { console.log(`FAIL  page errors\n      ${pageErrors.slice(0, 5).join('\n      ')}`); results.push({ ok: false }); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
