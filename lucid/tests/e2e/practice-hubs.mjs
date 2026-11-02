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
  // ---------- PH-3 ----------
  await check('PH-3. Settings: every group is named by its label; the pressed control keeps the focus and Tab moves on', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await go(page, 'settings', '[data-seg="text_size"]');
    const groups = (await page.locator('#view').ariaSnapshot()).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- group'));
    assert(groups.length >= 13 && groups.every((l) => /^- group "[^"]+"/.test(l)), `unnamed groups: ${groups.filter((l) => !/^- group "/.test(l)).join(' | ')}`);
    assert(groups.some((l) => l.startsWith('- group "גודל טקסט"')), 'the text-size group is not named "גודל טקסט"');
    await page.focus('[data-seg="text_size"] [data-v="150"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.documentElement.dataset.text === '150');
    const after = await page.evaluate(() => { const a = document.activeElement; return `${a.closest('[data-seg]')?.dataset.seg}:${a.dataset.v}:${a.getAttribute('aria-pressed')}`; });
    assert(after === 'text_size:150:true', `focus after 150%: ${after}`);
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => document.activeElement.closest('[data-seg]')?.dataset.seg);
    assert(next === 'hebrew_support', `Tab went to ${next}`);
    await page.focus('[data-relaxed]');
    await page.keyboard.press('Space');
    assert(await page.evaluate(() => document.activeElement.matches('[data-relaxed]')), 'the checkbox lost the focus');
    await shot(page, 'ph3-settings-150-390');
    await ctx.close();
  });

  // ---------- PH-4 ----------
  await check('PH-4. Settings opens with "תמיכה בלמידה": text size, Hebrew support, speech speed, sounds and a relaxed pace that is on by default and saved', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await go(page, 'settings', '[data-relaxed]');
    const first = await page.$eval('.settings-view > section', (s) => ({ h: s.querySelector('h2').textContent.trim(), segs: [...s.querySelectorAll('[data-seg]')].map((g) => g.dataset.seg), relaxed: Boolean(s.querySelector('[data-relaxed]')), text: s.textContent }));
    assert(first.h === 'תמיכה בלמידה', `first section: ${first.h}`);
    for (const k of ['text_size', 'hebrew_support', 'speech_rate', 'sound']) assert(first.segs.includes(k), `${k} is not in the first section`);
    assert(first.relaxed && /קצב רגוע/.test(first.text) && /בלי בונוס מהירות ובלי מעבר אוטומטי במשחקים/.test(first.text), 'no relaxed pace in the first section');
    const defaults = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); return [L.DEFAULT_SETTINGS.relaxed_pace, L.DEFAULT_SETTINGS.game_speed_challenge, L.settings().relaxed_pace]; });
    assert(defaults[0] === true && defaults[1] === false && defaults[2] === true, `defaults: ${defaults}`);
    assert(await page.isChecked('[data-relaxed]'), 'relaxed pace is not on by default');
    await page.click('[data-relaxed]');
    assert(await page.evaluate(async () => (await import('./js/core/learner.js')).settings().relaxed_pace) === false, 'turning it off was not saved');
    await page.evaluate(async () => (await import('./js/core/learner.js')).saveSettings({ game_speed_challenge: true }));
    await page.click('[data-relaxed]');
    const s = await page.evaluate(async () => { const x = (await import('./js/core/learner.js')).settings(); return [x.relaxed_pace, x.game_speed_challenge]; });
    assert(s[0] === true && s[1] === false, `turning it on saved ${s}`);
    await page.reload();
    await page.waitForSelector('[data-relaxed]');
    assert(await page.isChecked('[data-relaxed]'), 'not kept after a reload');
    await ctx.close();
  });

  // ---------- PH-5 ----------
  await check('PH-5. Without AI: the Settings checkbox is off and silent, the AI groups are greyed, the tutor shows no mode chips, Practice and the copy say so', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await go(page, 'settings', '[data-ai]');
    assert(await page.$eval('[data-ai]', (c) => c.disabled && !c.checked), 'the AI checkbox is enabled or ticked');
    await page.click('[data-ai]', { force: true });
    await page.waitForTimeout(300);
    assert(!(await page.$('.toast')), `a toast appeared: ${await page.textContent('.toast').catch(() => '')}`);
    assert((await page.textContent('#ai-off')).trim() === 'AI לא פעיל באתר הזה. כל השאר עובד.', 'the AI-off sentence is missing');
    const off = await page.$$eval('[data-seg][aria-disabled="true"]', (x) => x.map((g) => g.dataset.seg).sort().join(','));
    assert(off === 'corrections,feedback_scope', `greyed groups: ${off}`);
    const before = await page.evaluate(async () => (await import('./js/core/learner.js')).settings().corrections);
    await page.click('[data-seg="corrections"] [data-v="intensive"]', { force: true });
    assert(await page.evaluate(async () => (await import('./js/core/learner.js')).settings().corrections) === before, 'a greyed group still changes the setting');
    const opacity = await page.$eval('[data-seg="corrections"]', (g) => Number(getComputedStyle(g).opacity));
    assert(opacity < 1, 'the AI groups are not greyed');
    const text = await page.textContent('.settings-view');
    assert(/כדי שלא ייווצר עומס/.test(text) && !/עמסה/.test(text) && /גבוה \(95%\)/.test(text) && !/מבחן \(95%\)/.test(text), 'Settings copy not updated');
    assert(await page.$eval('[data-seg="hebrew_support"] [data-v="minimal"]', (b) => b.textContent.trim()) === 'בלחיצה', 'the Hebrew-support option does not match its help text');
    await go(page, 'tutor', '[data-ai-notice]');
    assert(!(await page.$('[data-mode]')), 'the tutor shows its mode chips');
    const order = await page.evaluate(() => { const n = document.querySelector('[data-ai-notice]'); const h = document.querySelector('#view .page-head'); return [...document.querySelectorAll('#view .page-head ~ *')][0]?.contains(n) && Boolean(h); });
    assert(order, 'the notice is not the first thing after the heading');
    const tut = await page.textContent('#view');
    assert(/AI לא פעיל באתר הזה. כל השאר עובד./.test(tut) && !/מזויפת/.test(tut), `tutor notice: ${tut.slice(0, 200)}`);
    await go(page, 'practice', 'a.lesson-row[href="#/tutor"]');
    assert(/לא פעיל באתר הזה/.test(await page.textContent('a.lesson-row[href="#/tutor"]')), 'the Practice tutor row does not say AI is off');
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
    await go(page, 'listening', '#view details');
    const info = await page.evaluate(() => {
      const ds = [...document.querySelectorAll('#view details[data-level]')];
      return { h: document.documentElement.scrollHeight, order: ds.map((d) => d.dataset.level), open: ds.filter((d) => d.open).map((d) => d.dataset.level), firstTag: ds[0]?.querySelector('summary .tag')?.textContent.trim(), titles: [...ds[0].querySelectorAll('.lesson-row .grow > span:first-child')].map((s) => s.textContent.trim()).slice(0, 4), next: document.querySelector('.page-head a.key.enter')?.getAttribute('href') };
    });
    await shot(page, 'ph6-listening-A2-390');
    assert(info.h < 4000, `#/listening is ${info.h}px tall`);
    assert(info.order[0] === 'A2' && info.firstTag === 'מומלץ לרמה שלך', `first group: ${info.order[0]} "${info.firstTag}"`);
    assert(info.open.join() === 'A2' && info.order.includes('PreA1'), `open groups: ${info.open}`);
    assert(info.order.join() === 'A2,B1,B2,C1,C2,A1,PreA1', `group order: ${info.order}`);
    assert(info.titles.length && info.titles.every((x) => /[א-ת]/.test(x)), `rows are not named by the Hebrew lesson title: ${info.titles}`);
    assert(/l=a2-05&/.test(info.next || ''), `"next" is not from the started lesson: ${info.next}`);
    await page.click('#view details[data-level="PreA1"] > summary');
    assert(await page.$eval('#view details[data-level="PreA1"]', (d) => d.open), 'a folded level does not open');
    await ctx.close();
    const b = await newPage(browser);
    await learnerAt(b.page, 'B1');
    await go(b.page, 'listening', '#view details');
    const first = await b.page.$eval('#view details[data-level]', (d) => [d.dataset.level, d.open]);
    assert(first[0] === 'B1' && first[1], `a B1 learner starts at ${first}`);
    await b.ctx.close();
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
} finally {
  await browser.close();
  server.kill();
}

if (pageErrors.length) { console.log(`FAIL  page errors\n      ${pageErrors.slice(0, 5).join('\n      ')}`); results.push({ ok: false }); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
