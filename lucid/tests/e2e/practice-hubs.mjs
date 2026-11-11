// Browser acceptance checks for the UX round 3 lane "practice-hubs" (docs/qa/panels-r3/plan.json): review, the
// practice hubs (listening, vocabulary, grammar, speaking), Practice, the tutor, account and Settings. Serves lucid/
// itself, drives Chromium through Playwright (Hebrew UI, phone 390x844 with touch and desktop 1440x900), prints one
// line per check and exits 1 on any failure.
// Usage: node tests/e2e/practice-hubs.mjs [--only <substring>] [--shots <dir>]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync, readFileSync } from 'node:fs';
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
  await page.waitForSelector(sel, { state: 'attached' });
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
      // UX r4 PG-8: when they come back is one line in Today's terms, and the game is in the footer.
      assert(!listed.some((t) => /תחזור/.test(t)) && /יחזרו|תחזור/.test(await page.textContent('[data-back-line]')), 'missed words do not say (once) when they come back');
      const href = await page.getAttribute('#pfoot a[href^="#/games/"]', 'href');
      assert(href && /focus=/.test(href) && /לשחק במילים האלה/.test(await page.textContent('#pfoot a[href^="#/games/"]')), `no game with these words: ${href}`);
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
  // ---------- PH-3 ----------
  await check('PH-3. Settings: every group is named by its label; the pressed control keeps the focus and Tab moves on', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await go(page, 'settings', '[data-seg="text_size"]');
    const groups = (await page.locator('#view').ariaSnapshot()).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- group'));
    // Every group on the page (11 without AI: launch FR-03 removed the two AI groups; 13 with AI).
    const shown = await page.$$eval('#view [role="group"]', (g) => g.length);
    assert(shown >= 11 && groups.length === shown && groups.every((l) => /^- group "[^"]+"/.test(l)), `unnamed groups: ${groups.filter((l) => !/^- group "/.test(l)).join(' | ')} (${groups.length} of ${shown})`);
    assert(groups.some((l) => l.startsWith('- group "גודל טקסט"')), 'the text-size group is not named "גודל טקסט"');
    await page.focus('[data-seg="text_size"] [data-v="150"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.documentElement.dataset.text === '150');
    const after = await page.evaluate(() => { const a = document.activeElement; return `${a.closest('[data-seg]')?.dataset.seg}:${a.dataset.v}:${a.getAttribute('aria-pressed')}`; });
    assert(after === 'text_size:150:true', `focus after 150%: ${after}`);
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => document.activeElement.closest('[data-seg]')?.dataset.seg);
    assert(next === 'hebrew_support', `Tab went to ${next}`);
    await page.focus('[data-speed-switch]');
    await page.keyboard.press('Space');
    assert(await page.evaluate(() => document.activeElement.matches('[data-speed-switch][aria-checked="true"]')), 'the speed switch lost the focus');
    await shot(page, 'ph3-settings-150-390');
    await ctx.close();
  });

  // ---------- PH-4 ----------
  // UX r4 PG-2: the calm pace is the default of the one games speed setting, "אתגר מהירות במשחקים" (off), shown in
  // this first section and on the games page as the same switch.
  await check('PH-4. Settings opens with "תמיכה בלמידה": text size, Hebrew support, speech speed, sounds and the games speed switch, off (calm) by default and saved', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await go(page, 'settings', '[data-speed-switch]');
    const first = await page.$eval('.settings-view > section', (s) => ({ h: s.querySelector('h2').textContent.trim(), segs: [...s.querySelectorAll('[data-seg]')].map((g) => g.dataset.seg), speed: Boolean(s.querySelector('[data-speed-switch][role="switch"]')), text: s.textContent }));
    assert(first.h === 'תמיכה בלמידה', `first section: ${first.h}`);
    for (const k of ['text_size', 'hebrew_support', 'speech_rate', 'sound']) assert(first.segs.includes(k), `${k} is not in the first section`);
    assert(first.speed && /אתגר מהירות במשחקים/.test(first.text) && /המשחק מחכה לכם/.test(first.text), 'no speed switch with its calm help line in the first section');
    const defaults = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); return [L.DEFAULT_SETTINGS.relaxed_pace, L.DEFAULT_SETTINGS.game_speed_challenge, L.settings().game_speed_challenge]; });
    assert(defaults[0] === true && defaults[1] === false && defaults[2] === false, `defaults: ${defaults}`);
    assert((await page.getAttribute('[data-speed-switch]', 'aria-checked')) === 'false', 'the speed challenge is on by default');
    await page.click('[data-speed-switch]');
    let s = await page.evaluate(async () => { const x = (await import('./js/core/learner.js')).settings(); return [x.relaxed_pace, x.game_speed_challenge]; });
    assert(s[0] === false && s[1] === true, `turning it on saved ${s}`);
    await page.click('[data-speed-switch]');
    s = await page.evaluate(async () => { const x = (await import('./js/core/learner.js')).settings(); return [x.relaxed_pace, x.game_speed_challenge]; });
    assert(s[0] === true && s[1] === false, `turning it off saved ${s}`);
    await page.click('[data-speed-switch]');
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector('[data-speed-switch]');
    assert((await page.getAttribute('[data-speed-switch]', 'aria-checked')) === 'true', 'not kept after a reload');
    // The games page shows the same switch, and turning it off there shows off in Settings.
    await go(page, 'games', '[data-speed-switch]');
    assert((await page.getAttribute('[data-speed-switch]', 'aria-checked')) === 'true', 'the games page does not show the challenge as on');
    await page.click('[data-speed-switch]');
    await go(page, 'settings', '[data-speed-switch]');
    assert((await page.getAttribute('[data-speed-switch]', 'aria-checked')) === 'false', 'Settings shows the challenge as on after it was turned off on the games page');
    await ctx.close();
  });

  // ---------- PH-5 ----------
  // Launch FR-03: without AI on the site, Settings shows no AI control at all (it showed greyed ones before) and
  // Practice no tutor row; the tutor's own route still says AI is off.
  await check('PH-5. Without AI: Settings has no AI checkbox or AI groups, only the AI-off sentence; the tutor shows no mode chips; Practice offers no tutor; the copy says so', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await go(page, 'settings', '#ai-off');
    assert(!(await page.$('[data-ai]')), 'the AI checkbox is still there');
    assert((await page.textContent('#ai-off')).trim().startsWith('AI לא פעיל באתר הזה. כל השאר עובד.'), 'the AI-off sentence is missing');
    const off = await page.$$eval('[data-seg="corrections"], [data-seg="feedback_scope"], [data-seg][aria-disabled="true"]', (x) => x.length);
    assert(off === 0, `${off} AI groups are still shown`);
    const text = await page.textContent('.settings-view');
    assert(/כדי שלא ייווצר עומס/.test(text) && !/עמסה/.test(text) && /גבוה \(95%\)/.test(text) && !/מבחן \(95%\)/.test(text), 'Settings copy not updated');
    assert(await page.$eval('[data-seg="hebrew_support"] [data-v="minimal"]', (b) => b.textContent.trim()) === 'בלחיצה', 'the Hebrew-support option does not match its help text');
    await go(page, 'tutor', '[data-ai-notice]');
    assert(!(await page.$('[data-mode]')), 'the tutor shows its mode chips');
    const order = await page.evaluate(() => { const n = document.querySelector('[data-ai-notice]'); const h = document.querySelector('#view .page-head'); return [...document.querySelectorAll('#view .page-head ~ *')][0]?.contains(n) && Boolean(h); });
    assert(order, 'the notice is not the first thing after the heading');
    const tut = await page.textContent('#view');
    assert(/AI לא פעיל באתר הזה. כל השאר עובד./.test(tut) && !/מזויפת/.test(tut), `tutor notice: ${tut.slice(0, 200)}`);
    await go(page, 'practice', '.practice-labs');
    assert(!(await page.$('a.lesson-row[href="#/tutor"]')), 'Practice offers the tutor on a site without AI');
    await go(page, 'account', '#view h1');
    assert(/באתר הזה אין חשבונות\./.test(await page.textContent('#view')), 'account copy not updated');
    await ctx.close();
    // With AI on the site the checkbox and the groups work as before.
    const a = await newPage(browser, { init: null });
    await a.page.route(/config\.js$/, (r) => r.fulfill({ contentType: 'text/javascript', body: "export const CONFIG = { supabaseUrl: 'https://mock.supabase.co', supabaseKey: 'sb_publishable_test', aiEnabled: true, aiFunction: 'lucid-ai' };" }));
    await a.page.route(/mock\.supabase\.co/, (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await learnerAt(a.page, 'B1');
    await go(a.page, 'settings', '[data-ai]');
    assert(!(await a.page.$('#ai-off')) && !(await a.page.$('[data-seg][aria-disabled]')) && !(await a.page.$eval('[data-ai]', (c) => c.disabled)), 'AI settings are off on a site with AI');
    await a.page.click('[data-ai]');
    assert(await a.page.evaluate(async () => (await import('./js/core/learner.js')).settings().ai_consent) === true, 'consent not saved with AI on');
    await go(a.page, 'tutor', '[data-mode]');
    await a.ctx.close();
  });

  // ---------- PH-6 ----------
  await check('PH-6. Listening opens at the learner\'s level: under 4,000px for A2 at 390, the recommended group first and open, Pre-A1 folded, rows by Hebrew lesson title, "next" from a started lesson', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.startLesson(await (await fetch('content/lessons/a2-05.json')).json()); });
    await go(page, 'listening', '#view details[data-level]');
    const info = await page.evaluate(() => {
      const ds = [...document.querySelectorAll('#view details[data-level]')];
      return { h: document.documentElement.scrollHeight, order: ds.map((d) => d.dataset.level), open: ds.filter((d) => d.open).map((d) => d.dataset.level), firstTag: ds[0]?.querySelector('summary .tag')?.textContent.trim(), titles: [...ds[0].querySelectorAll('.lesson-row .grow > span:first-child')].map((s) => s.textContent.trim()).slice(0, 4), next: document.querySelector('.page-head a.key.enter')?.getAttribute('href') };
    });
    await shot(page, 'ph6-listening-A2-390');
    assert(info.h < 4000, `#/listening is ${info.h}px tall`);
    assert(info.order[0] === 'A2' && info.firstTag === 'מומלץ לרמה שלכם', `first group: ${info.order[0]} "${info.firstTag}"`);
    assert(info.open.join() === 'A2' && info.order.includes('PreA1'), `open groups: ${info.open}`);
    assert(info.order.join() === 'A2,B1,B2,C1,C2,A1,PreA1', `group order: ${info.order}`);
    assert(info.titles.length && info.titles.every((x) => /[א-ת]/.test(x)), `rows are not named by the Hebrew lesson title: ${info.titles}`);
    assert(/l=a2-05&/.test(info.next || ''), `"next" is not from the started lesson: ${info.next}`);
    await page.click('#view details[data-level="PreA1"] > summary');
    assert(await page.$eval('#view details[data-level="PreA1"]', (d) => d.open), 'a folded level does not open');
    await ctx.close();
    const b = await newPage(browser);
    await learnerAt(b.page, 'B1');
    await go(b.page, 'listening', '#view details[data-level]');
    const first = await b.page.$eval('#view details[data-level]', (d) => [d.dataset.level, d.open]);
    assert(first[0] === 'B1' && first[1], `a B1 learner starts at ${first}`);
    await b.ctx.close();
  });

  // ---------- PH-7 ----------
  await check('PH-7. Vocabulary as compact rows: 172 words at 390 stay under 8,000px, a tap opens a row, Enter toggles it', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const words = (await a1Words(page)).length;
    await go(page, 'vocab', '.vocab-row');
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await shot(page, 'ph7-vocab-390');
    assert(words === 172 && h < 8000, `${words} words, ${h}px`);
    const open = await page.$$eval('details[data-level][open]', (d) => d.map((x) => x.dataset.level));
    assert(open.length === 1, `open levels: ${open}`);
    const row = page.locator('details[open] .vocab-row').first();
    assert(await row.getAttribute('aria-expanded') === 'false', 'a row starts open');
    await row.tap();
    const detail = page.locator(`#${await row.getAttribute('aria-controls')}`);
    assert(await row.getAttribute('aria-expanded') === 'true' && await detail.isVisible(), 'a tap does not open the row');
    assert(/[A-Za-z]/.test(await detail.textContent()), 'the opened row shows no example or definition');
    await row.focus();
    await page.keyboard.press('Enter');
    assert(await row.getAttribute('aria-expanded') === 'false' && !(await detail.isVisible()), 'Enter does not close the row');
    await page.keyboard.press('Enter');
    assert(await row.getAttribute('aria-expanded') === 'true', 'Enter does not open the row');
    // Every level opens; a long level shows the rest on request.
    const big = await page.$$eval('details[data-level]', (d) => d.find((x) => x.querySelector('[data-more]'))?.dataset.level);
    if (big) {
      await page.click(`details[data-level="${big}"] > summary`);
      const before = await page.locator(`details[data-level="${big}"] .vocab-row`).count();
      await page.click(`details[data-level="${big}"] [data-more]`);
      assert(await page.locator(`details[data-level="${big}"] .vocab-row`).count() > before, '"show more" shows nothing');
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the page scrolls sideways');
    await ctx.close();
  });

  // ---------- PH-8 ----------
  // A fake English voice: 'plays' starts speaking 50 ms after speak(); 'silent' lists a voice but never starts.
  const fakeVoice = (mode) => `(() => {
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    const synth = { speaking: false, pending: false, paused: false,
      getVoices: () => [{ lang: 'en-US', name: 'Fake English', default: true }],
      addEventListener() {}, removeEventListener() {},
      cancel() { this.speaking = false; },
      speak(u) { if ('${mode}' === 'silent') return; setTimeout(() => { this.speaking = true; u.onstart?.(); setTimeout(() => { this.speaking = false; u.onend?.(); }, 300); }, 50); } };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  })();`;
  await check('PH-8. Speaking lab: with no English voice a banner and closed answers; answers open only once a word really plays; plain heading; shadowing left to right; the mouth before the IPA', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await go(page, 'speaking', '#sp-hear h3');
    await page.waitForSelector('[data-no-voice]', { timeout: 5000 });
    const keys = await page.$$eval('[data-hear-pick]', (b) => b.map((x) => x.disabled));
    assert(keys.length === 2 && keys.every(Boolean), `answer keys with no voice: ${keys}`);
    assert(!(await page.$('[data-hear-play]')), 'a play key with no English voice');
    const head = (await page.textContent('#sp-shadow')).trim();
    assert(head === 'חוזרים אחרי הדובר (shadowing)' && !/שאדואינג/.test(await page.textContent('#view')), `shadowing heading: ${head}`);
    const sent = await page.$eval('#sp-shadow-list details[open] .shadow-sentence', (s) => { const r = s.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(s); const t = range.getClientRects()[0]; return { dir: getComputedStyle(s).direction, align: getComputedStyle(s).textAlign, gap: Math.round(t.left - r.left) }; });
    assert(sent.dir === 'ltr' && sent.align === 'left' && sent.gap <= 1, `shadowing sentence: ${JSON.stringify(sent)}`);
    const tip = (await page.textContent('#sp-set .block-tip')).trim();
    const he = await page.$eval('#sp-set .block-tip', (b) => [...b.querySelectorAll('[lang="he"], .bi-he')].map((x) => x.textContent.trim()).find((x) => /[א-ת]/.test(x)) || '');
    assert(/^[א-ת]/.test(he) && he.indexOf('מותחים') < he.indexOf('/iː/'), `the Hebrew tip does not lead with the mouth: ${he || tip}`);
    await shot(page, 'ph8-speaking-novoice-390', false);
    const events = (await store(page, 'events')).filter((e) => e.drill === 'minimal-pairs').length;
    assert(events === 0, 'a result was recorded without a voice');
    await ctx.close();

    const v = await newPage(browser, { init: fakeVoice('plays') });
    await learnerAt(v.page, 'A2');
    await go(v.page, 'speaking', '[data-hear-play]');
    assert(!(await v.page.$('[data-no-voice]')), 'the no-voice banner shows with an English voice');
    assert(await v.page.$$eval('[data-hear-pick]', (b) => b.every((x) => x.disabled)), 'answers open before playing');
    await v.page.click('[data-hear-play]');
    await v.page.waitForFunction(() => [...document.querySelectorAll('[data-hear-pick]')].every((x) => !x.disabled), null, { timeout: 4000 });
    await v.ctx.close();

    const s = await newPage(browser, { init: fakeVoice('silent') });
    await learnerAt(s.page, 'A2');
    await go(s.page, 'speaking', '[data-hear-play]');
    await s.page.click('[data-hear-play]');
    await s.page.waitForSelector('[data-hear-silent]', { timeout: 5000 });
    assert(await s.page.$$eval('[data-hear-pick]', (b) => b.every((x) => x.disabled)), 'answers open although nothing played');
    await s.ctx.close();
  });

  // ---------- PH-9 ----------
  await check('PH-9. Practice is useful from day one: a word game and a scenario for a freshly placed B1 learner, labs in two columns on desktop; Grammar says "1 answer" and "בשליטה"', async () => {
    for (const viewport of [PHONE, DESKTOP]) {
      const { ctx, page } = await newPage(browser, { viewport });
      await learnerAt(page, 'B1');
      await go(page, 'practice', '#now-h');
      const recs = await page.$$eval('section[aria-labelledby="now-h"] a.plan-item', (x) => x.map((a) => a.getAttribute('href')));
      assert(recs.length >= 2 && recs.includes('#/games/B1/1') && recs.some((h) => h.startsWith('#/scenario/')), `recommendations: ${recs}`);
      await shot(page, `ph9-practice-${viewport.width}`, false);
      if (viewport === DESKTOP) {
        const cols = await page.$eval('.practice-labs', (u) => getComputedStyle(u).gridTemplateColumns.split(' ').length);
        assert(cols === 2, `labs grid has ${cols} columns at 1440`);
      }
      const sc = recs.find((h) => h.startsWith('#/scenario/'));
      await go(page, sc.slice(2), '#view h1');
      assert(!/לא נמצא|not found/i.test(await page.textContent('#view')), `the recommended scenario does not open: ${sc}`);
      await ctx.close();
    }
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    const topic = await page.evaluate(async () => { const tx = await (await fetch('content/taxonomy.json')).json(); const tp = tx.topics.find((x) => x.skill === 'grammar' && x.level === 'B1'); window.lucid.store.put('attempts', { id: 'one', at: new Date().toISOString(), source: 'lesson', topic: tp.id, skill: 'grammar', level: 'B1', correct: true, score: 1 }); return tp.id; });
    await go(page, 'grammar', '.topic-row');
    const text = await page.textContent('#view');
    assert(/תשובה אחת/.test(text) && !/\b1 תשובות/.test(text) && !/נשלט/.test(text) && /בשליטה/.test(text), `grammar copy for ${topic}`);
    await page.evaluate(async () => (await import('./js/core/learner.js')).saveProfile({ ui_language: 'en' }));
    await go(page, 'practice', '#now-h');
    await go(page, 'grammar', '.topic-row');
    const en = await page.textContent('#view');
    assert(/(^|[^0-9])1 answer\b/.test(en) && !/(^|[^0-9])1 answers/.test(en), `English grammar: ${en.match(/.{30}answer.{10}/g)?.slice(0, 3)}`);
    await ctx.close();
  });

  // ---------- PH-10 ----------
  await check('PH-10. Settings: languages in their own names, equal-width data buttons, and a restore error that says what to choose', async () => {
    for (const viewport of [PHONE, DESKTOP]) {
      const { ctx, page } = await newPage(browser, { viewport });
      await learnerAt(page, 'B1');
      await go(page, 'settings', '.settings-data');
      const langs = await page.$$eval('[data-seg="ui_language"] button', (x) => x.map((b) => `${b.textContent.trim()}/${b.lang}`));
      assert(langs.join(',') === 'עברית/he,English/en', `language control: ${langs}`);
      const widths = await page.$$eval('.settings-data > *', (x) => x.map((b) => Math.round(b.getBoundingClientRect().width)));
      assert(widths.length === 3 && new Set(widths).size === 1, `data buttons: ${widths}`);
      await page.setInputFiles('[data-import]', { name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
      await page.waitForFunction(() => document.querySelector('[data-restore-msg]')?.textContent.trim());
      const msg = await page.textContent('[data-restore-msg]');
      assert(/בחרו את קובץ ה-JSON שהורדתם ב״הורדת כל המידע״\./.test(msg), `restore error: ${msg}`);
      await shot(page, `ph10-settings-data-${viewport.width}`, false);
      // The language switch works both ways and keeps the focus on the chosen language.
      await page.click('[data-seg="ui_language"] [data-v="en"]');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      assert(await page.evaluate(() => document.activeElement.dataset.v === 'en'), 'focus lost after switching language');
      assert(/Learning support/.test(await page.textContent('.settings-view h2')), 'English UI first section');
      await page.click('[data-seg="ui_language"] [data-v="he"]');
      await page.waitForFunction(() => document.documentElement.lang === 'he');
      await ctx.close();
    }
  });

  // ---------- perf lane "content" (docs/perf/plan.json): centres, drills and level checks from small files ----------
  const requested = (page) => { const urls = []; page.on('request', (r) => urls.push(new URL(r.url()).pathname)); return urls; };
  const readJson = (rel) => JSON.parse(readFileSync(join(app, 'content', rel), 'utf8'));
  await check('PERF-C4. Reading, listening and speaking list from the centre files: every text, no lesson file downloaded', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const urls = requested(page);
    for (const [route, file, rowSel] of [['reading', 'read', 'a.lesson-row[href*="reading?l="]'], ['listening', 'listen', 'a.lesson-row[href*="listening?l="]'], ['speaking', 'speak', 'a.lesson-row[href*="speaking?l="]']]) {
      await go(page, route, rowSel);
      assert(urls.includes(`/content/centers/${file}.json`), `${route}: centers/${file}.json not loaded`);
      const items = readJson(`centers/${file}.json`).items;
      if (route === 'reading') {
        const rows = await page.$$eval(rowSel, (a) => a.length);
        assert(rows === items.length, `reading lists ${rows} texts, the lessons have ${items.length}`);
      }
      // A text opens in the player from the centre file alone.
      const href = await page.getAttribute(rowSel, 'href');
      await page.goto(`${BASE}${href}`);
      await page.waitForSelector('#exroot > *');
    }
    const lessons = urls.filter((u) => u.startsWith('/content/lessons/'));
    assert(!lessons.length, `lesson files downloaded: ${lessons.slice(0, 4)}`);
    await ctx.close();
  });
  await check('PERF-C4. Offline with Reading never opened online: the texts of the 2 lessons on the device are listed and open, as before', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    const saved = ['a1-01', 'a1-02'];
    await page.route(/content\/(centers\/|lessons\/)/, (r) => (saved.some((id) => r.request().url().endsWith(`/lessons/${id}.json`)) ? r.continue() : r.abort()));
    await go(page, 'reading', '.page-head');
    await page.waitForTimeout(300);
    const hrefs = await page.$$eval('a.lesson-row[href*="reading?l="]', (a) => a.map((x) => x.getAttribute('href')));
    const want = saved.flatMap((id) => readJson(`lessons/${id}.json`).exercises.filter((e) => e.type === 'read').map((e) => `#/reading?l=${id}&e=${e.id}`));
    assert(hrefs.length === want.length && want.every((h) => hrefs.includes(h)), `listed ${hrefs.length}: ${hrefs.slice(0, 3)}; want ${want.length}`);
    await page.goto(`${BASE}${hrefs[0]}`);
    await page.waitForSelector('#exroot > *');
    await ctx.close();
  });
  await check('PERF-C10. A level check and a drill load their level\'s pool files, never the 75 lesson files', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    const urls = requested(page);
    await go(page, 'checkpoint/A1', '[data-begin]');
    assert(urls.includes('/content/pool/A1.json'), 'pool/A1.json not loaded');
    await page.click('[data-begin]');
    await page.waitForSelector('#exroot > *');
    await go(page, 'drill?topic=present-simple', '#exroot > *');
    const pools = [...new Set(urls.filter((u) => u.startsWith('/content/pool/')))].sort();
    assert(pools.join() === ['/content/pool/A1.json', '/content/pool/A2.json', '/content/pool/PreA1.json'].join(), `pool files: ${pools}`);
    const lessons = urls.filter((u) => u.startsWith('/content/lessons/'));
    assert(!lessons.length, `lesson files downloaded: ${lessons.slice(0, 4)}`);
    await ctx.close();
  });
  await check('PERF-C10. Offline with A1 lessons saved and no pool file: the A1 level check runs from those lessons, as before', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await page.route(/content\/(pool\/|lessons\/)/, (r) => (/\/lessons\/a1-\d+\.json$/.test(r.request().url()) ? r.continue() : r.abort()));
    await go(page, 'checkpoint/A1', '[data-begin]');
    const from = await page.evaluate(async () => [...new Set((await (await import('./js/core/pool.js')).checkpointSet('A1')).map((p) => p.lesson))]);
    assert(from.length >= 8 && from.every((id) => id.startsWith('a1-')), `items from ${from}`);
    await page.click('[data-begin]');
    await page.waitForSelector('#exroot > *');
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

if (pageErrors.length) { console.log(`FAIL  page errors\n      ${pageErrors.slice(0, 5).join('\n      ')}`); results.push({ ok: false }); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
