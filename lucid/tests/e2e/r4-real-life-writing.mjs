// Browser checks for the round-4 lane "real-life-writing" (RW-1 to RW-12 in docs/qa/panels-r3-retest/plan-r4.json):
// the writing checks and their summary, the essay editor and rubric, scenario practice, the Real life and
// Conversations hubs and Expressions. Serves lucid/ on its own port, drives Chromium through Playwright in the
// Hebrew UI, prints one PASS/FAIL line per check and exits 1 on any failure.
// Usage: node tests/e2e/r4-real-life-writing.mjs [--only <substring>] [--shots <dir>] [--port <n>]
// The port is 9743 unless --port or R4RW_PORT says otherwise.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const lucid = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const PORT = Number(arg('--port') || process.env.R4RW_PORT) || 9743;
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

async function newPage(browser, { width = 390, height = 844, dark = false } = {}) {
  const touch = width < 600;
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  return { ctx, page, tap: (sel) => (touch ? page.tap(sel) : page.click(sel)) };
}
// A learner at a course level with goals and a text size, made through the app's own modules.
async function learnerAt(page, level, { goals = ['travel'], text = 100 } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, goals, text }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals, created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, goals, text });
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(250);
}
const open = async (page, hash, sel) => { await page.goto(`${BASE}#/${hash}`); await page.waitForSelector(sel); await page.waitForTimeout(200); };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) }); };
const typeEssay = async (page, text) => { await page.fill('#essay', text); await page.dispatchEvent('#essay', 'input'); };
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', lucid], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  await check('RW-2 Free writing (B1, 130%): no lang=en element holds Hebrew or a list comma, each status item is its own isolate, and the connector tags are Hebrew', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'B1', { text: 130 });
    await open(page, 'writing/free', '#essay');
    await typeEssay(page, "i think i am agree with you, and it's cheap, but it depends in the weather so we discussed about it");
    await tap('[data-check]');
    await page.waitForSelector('[data-status]:not(:empty)');
    const r = await page.evaluate(() => {
      const view = document.querySelector('#view');
      const he = [...view.querySelectorAll('[lang="en"]')].filter((e) => /[א-ת]/.test(e.textContent)).map((e) => e.outerHTML.slice(0, 80));
      const status = document.querySelector('[data-status]');
      const iso = [...status.querySelectorAll('bdi, [lang="en"], [dir="ltr"]')].map((e) => e.textContent);
      const commas = iso.filter((t) => /^\s*[,،]|[,،]\s*$/.test(t));
      const items = status.querySelectorAll('.sum-item').length;
      const tags = [...view.querySelectorAll('.connector-tag')].map((e) => e.textContent.trim());
      return { he, iso, commas, items, tags, text: status.textContent };
    });
    await shot(page, 'rw2-free-130');
    assert(!r.he.length, `lang=en elements with Hebrew: ${r.he.join(' | ')}`);
    assert(!r.commas.length, `an English isolate holds a list comma: ${JSON.stringify(r.commas)} in "${r.text}"`);
    assert(r.items >= 3, `the status line has ${r.items} separate items: "${r.text}"`);
    assert(r.tags.length >= 2 && r.tags.every((t) => /[א-ת]/.test(t)), `connector tags: ${JSON.stringify(r.tags)}`);
    await ctx.close();
  });

  await check('RW-5 Essay editor: no check icon by the counts, "נשמר" after typing, the target says what is left; self-final from the accepted minimum; "התחלתם" for a draft; a timed version says "בזמן"', async () => {
    const { ctx, page, tap } = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(page, 'B2');
    await open(page, 'writing/final-B2', '#essay');
    await typeEssay(page, 'Remote work is changing how cities use their office space and how people travel to work every day.');
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => ({ svg: document.querySelectorAll('.editor-stats svg').length, saved: (() => { const s = document.querySelector('[data-saved]'); return s && !s.hasAttribute('data-off') && getComputedStyle(s).visibility !== 'hidden' ? s.textContent.trim() : ''; })(), target: document.querySelector('[data-target]')?.textContent || '' }));
    await page.$eval('.editor-bar', (e) => e.scrollIntoView({ block: 'center' }));
    await shot(page, 'rw5-final-b2-1440');
    assert(st.svg === 0, `.editor-stats has ${st.svg} icon(s)`);
    assert(st.saved === 'נשמר', `save mark: "${st.saved}"`);
    assert(/יעד 450-600 · עוד 432/.test(st.target), `target: "${st.target}"`);
    // wa-05 (800-1,000 words) with 432 words: the self-assessed final stays closed until 800, the accepted minimum.
    await open(page, 'writing/wa-05', '#essay');
    await typeEssay(page, words(432));
    await tap('[data-tab="rubric"]');
    await page.waitForSelector('[data-self-final]');
    const wa = await page.evaluate(() => { const b = document.querySelector('[data-self-final]'); return { disabled: b.disabled, why: document.getElementById(b.getAttribute('aria-describedby') || '')?.textContent || '' }; });
    assert(wa.disabled && /מ-800 מילים/.test(wa.why), `wa-05 at 432 words: ${JSON.stringify(wa)}`);
    // The C1 final accepts 750-1,100 (the brief says 800-1,000): its gate is 750.
    await open(page, 'writing/final-C1', '#essay');
    await typeEssay(page, words(432));
    await tap('[data-tab="rubric"]');
    await page.waitForSelector('[data-self-final]');
    const c1 = await page.evaluate(() => { const b = document.querySelector('[data-self-final]'); return { disabled: b.disabled, why: document.getElementById(b.getAttribute('aria-describedby') || '')?.textContent || '' }; });
    assert(c1.disabled && /מ-750 מילים/.test(c1.why), `final-C1 at 432 words: ${JSON.stringify(c1)}`);
    // A one-sentence draft of wa-08, checked: the C2 final's topic tag says "started", not "wrote".
    await open(page, 'writing/wa-08', '#essay');
    await typeEssay(page, 'Governments should not set a legal minimum age of sixteen for social media accounts.');
    await tap('[data-check]');
    await page.waitForTimeout(300);
    await open(page, 'writing/final-C2', 'input[name=topic]');
    const tag = await page.evaluate(() => [...document.querySelectorAll('.topic-pick .tag.warn')].map((t) => t.textContent));
    assert(tag.length === 1 && /^התחלתם את המטלה הזו ב-/.test(tag[0]), `topic tag: ${JSON.stringify(tag)}`);
    // we-14 has a 40-minute timer: a version checked while it runs is marked "בזמן".
    await open(page, 'writing/we-14', '#essay');
    await tap('[data-timer]');
    await typeEssay(page, 'Timed writing makes me plan before I write, and that helps me keep each paragraph on one idea.');
    await tap('[data-check]');
    await tap('[data-tab="versions"]');
    await page.waitForTimeout(200);
    const vs = await page.evaluate(() => [...document.querySelectorAll('.essay-side li.row')].map((li) => li.textContent));
    assert(vs.length === 1 && /בזמן/.test(vs[0]), `versions: ${JSON.stringify(vs)}`);
    await ctx.close();
  });

  await check('RW-6 1440: the wa-05 rubric panel is at most 1,800px with its save key in view; the C2 final brief has at most one Hebrew toggle per card, and it opens every line; topic radios are 24px', async () => {
    const { ctx, page, tap } = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(page, 'C2');
    await open(page, 'writing/wa-05', '#essay');
    await tap('[data-tab="rubric"]');
    await page.waitForSelector('[data-save-self]');
    const r = await page.evaluate(() => {
      const side = document.querySelector('aside.essay-side');
      side.scrollTop = 0;
      const s = side.getBoundingClientRect(); const k = document.querySelector('[data-save-self]').getBoundingClientRect();
      return { h: side.scrollHeight, inSide: k.top >= s.top && k.bottom <= s.bottom, inView: k.top >= 0 && k.bottom <= innerHeight, final: Boolean(document.querySelector('[data-self-final]')) };
    });
    await shot(page, 'rw6-rubric-1440');
    assert(r.h <= 1800, `rubric panel scrollHeight ${r.h}px`);
    assert(r.inSide && r.inView, `the save key is not in view: ${JSON.stringify(r)}`);
    // Scrolled to the end, the keys are still at the top of the panel.
    const stuck = await page.evaluate(() => { const side = document.querySelector('aside.essay-side'); side.scrollTop = side.scrollHeight; const s = side.getBoundingClientRect(); const k = document.querySelector('[data-save-self]').getBoundingClientRect(); return k.top >= s.top - 1 && k.bottom <= s.bottom; });
    assert(stuck, 'the save key scrolls out of the panel');
    await open(page, 'writing/final-C2', 'input[name=topic]');
    const c = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#view .panel')];
      const per = cards.map((p) => p.querySelectorAll('[data-reveal-he], [data-he-all]').length);
      const radios = [...document.querySelectorAll('.topic-pick input[type=radio]')].map((i) => i.getBoundingClientRect().width);
      return { per, chips: document.querySelectorAll('#view [data-reveal-he]').length, toggles: document.querySelectorAll('#view [data-he-all]').length, radios, hidden: document.querySelectorAll('.task-brief .bi-he[hidden], .topic-pick .bi-he[hidden]').length };
    });
    assert(c.per.every((n) => n <= 1), `Hebrew toggles per card: ${JSON.stringify(c.per)}`);
    assert(c.chips === 0 && c.toggles >= 1, `chips ${c.chips}, toggles ${c.toggles}`);
    assert(c.radios.length === 4 && c.radios.every((w) => w >= 20), `topic radios: ${JSON.stringify(c.radios)}`);
    await page.click('[data-he-all="brief"]');
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => ({ hidden: document.querySelectorAll('.task-brief .bi-he[hidden], .topic-pick .bi-he[hidden]').length, shown: document.querySelectorAll('.task-brief .bi-he:not([hidden]), .topic-pick .bi-he:not([hidden])').length, exp: document.querySelector('[data-he-all="brief"]').getAttribute('aria-expanded') }));
    await shot(page, 'rw6-final-c2-1440');
    assert(c.hidden >= 5 && after.hidden === 0 && after.shown >= 5 && after.exp === 'true', `the toggle did not open every Hebrew line: before ${c.hidden} hidden, after ${JSON.stringify(after)}`);
    await ctx.close();
  });

  await check('RW-7 390x844: the scenario footer sits in the same place at turns 1 and 2, its key is full width, and after "Spot on" the own-words box gets a neutral footer that ends above the last issue card', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2');
    await open(page, 'scenario/rl-airport-checkin-overweight?tab=practise', '[data-opt]');
    const foot = () => page.evaluate(() => { const f = document.querySelector('.scenario-foot'); const k = f.querySelector('.key.enter'); return { top: Math.round(f.getBoundingClientRect().top), key: Math.round(k.getBoundingClientRect().width), cls: f.className }; });
    const t1 = await foot();
    // The best reply of the turn, found by its text in the scenario data.
    const pickBest = async () => {
      const i = await page.evaluate(async () => {
        const d = await (await fetch('content/real-life/scenarios.json')).json();
        const s = d.scenarios.find((x) => x.id === 'rl-airport-checkin-overweight');
        const step = Number(document.querySelector('[data-step]').textContent.match(/\d+/)[0]) - 1;
        const best = s.practice[step].options.find((o) => o.verdict === 'best').text;
        return [...document.querySelectorAll('[data-opt]')].findIndex((b) => b.textContent.includes(best));
      });
      await tap(`[data-opt="${i}"]`);
      await tap('[data-check-turn]');
      await page.waitForSelector('[data-next-turn]');
    };
    await pickBest();
    await tap('[data-next-turn]');
    await page.waitForTimeout(300);
    const t2 = await foot();
    assert(Math.abs(t1.top - t2.top) <= 2, `footer top: turn 1 ${t1.top}, turn 2 ${t2.top}`);
    assert(t1.key >= 300 && t2.key >= 300, `check key width: ${t1.key}, ${t2.key}`);
    await pickBest();
    assert(/\bok\b/.test((await foot()).cls), 'the best pick did not give the "Spot on" footer');
    await tap('[data-own-box] > summary');
    await page.fill('[data-own]', 'I am agree. Nice to know you. I cant find my bag.');
    await tap('[data-own-check]');
    await page.waitForSelector('.own-result .error-card');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => { const cards = [...document.querySelectorAll('.own-result .error-card')]; const f = document.querySelector('.scenario-foot'); return { n: cards.length, last: Math.round(cards.at(-1).getBoundingClientRect().bottom), top: Math.round(f.getBoundingClientRect().top), cls: f.className, label: f.textContent.trim() }; });
    await shot(page, 'rw7-own-words-390');
    assert(r.n === 3, `${r.n} issue cards`);
    assert(r.last <= r.top, `the last card ends at ${r.last}, under the footer at ${r.top}`);
    assert(!/\bok\b/.test(r.cls) && r.label === 'המשך', `footer while writing: "${r.cls}" "${r.label}"`);
    await ctx.close();
  });

  await check('RW-10 390: Real life and Conversations are each under 2,500px with one open topic; a Pre-A1 work learner starts with work scenarios', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { goals: ['travel'] });
    for (const [hash, name] of [['real-life', 'rw10-real-life-390'], ['conversations', 'rw10-conversations-390']]) {
      await open(page, hash, '.hub-topics details');
      const r = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, open: document.querySelectorAll('.hub-topics details[open]').length, all: document.querySelectorAll('.hub-topics details').length }));
      await shot(page, name);
      assert(r.h < 2500, `#/${hash} is ${r.h}px tall`);
      assert(r.open === 1 && r.all >= 7, `#/${hash}: ${r.open} open of ${r.all} topics`);
    }
    await ctx.close();
    const pre = await newPage(browser);
    await learnerAt(pre.page, 'PreA1', { goals: ['work'] });
    await open(pre.page, 'real-life', '.start-here .lesson-row');
    const start = await pre.page.$$eval('.start-here .lesson-row', (a) => a.map((x) => x.getAttribute('href')));
    assert(start[0].includes('rl-work-'), `start here for Pre-A1 work: ${start}`);
    await pre.ctx.close();
  });

  await check('RW-8 A saved scenario place: after 2 answered turns the scenario reopens on its resume offer, and the Real life and Conversations rows say "בתהליך · תור 3 מתוך 5"', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2');
    await open(page, 'scenario/rl-airport-checkin-overweight?tab=practise', '[data-opt]');
    for (let i = 0; i < 2; i++) { await tap('[data-opt="0"]'); await tap('[data-check-turn]'); await tap('[data-next-turn]'); await page.waitForTimeout(100); }
    await open(page, 'real-life', '.hub-topics');
    const row = await page.$$eval('a[href="#/scenario/rl-airport-checkin-overweight"]', (a) => a.map((x) => x.textContent));
    assert(row.length && row.every((t) => /בתהליך · תור 3 מתוך 5/.test(t)), `Real life rows: ${JSON.stringify(row)}`);
    await open(page, 'conversations', '.hub-topics');
    const conv = await page.$$eval('a[href^="#/scenario/rl-airport-checkin-overweight?"]', (a) => a.map((x) => x.textContent));
    assert(conv.length && conv.every((t) => /בתהליך/.test(t)), `Conversations rows: ${JSON.stringify(conv)}`);
    await open(page, 'scenario/rl-airport-checkin-overweight', '.scenario-tabs');
    const r = await page.evaluate(() => { const b = document.querySelector('[data-resume]'); if (!b) return null; const rr = b.getBoundingClientRect(); return { visible: rr.width > 0 && rr.top >= 0 && rr.bottom <= innerHeight, tab: document.querySelector('.scenario-tabs [aria-pressed="true"]')?.dataset.tab }; });
    await shot(page, 'rw8-resume-390');
    assert(r && r.visible && r.tab === 'practise', `resume on open: ${JSON.stringify(r)}`);
    // From another tab, the line above the tabs offers the same place.
    await tap('[data-tab="prepare"]');
    assert(/עצרתם בתור 3 מתוך 5/.test(await page.textContent('[data-resume-line]')), 'no saved-place line above the tabs');
    await tap('[data-resume-line] [data-resume]');
    await page.waitForSelector('[data-step]');
    assert(/^3 מתוך 5/.test((await page.textContent('[data-step]')).trim()), 'the line does not continue from turn 3');
    await ctx.close();
  });

  await check('RW-9 Scenario: no two play keys share a name with "השמעה", every Latin-only note is lang=en, and the Hebrew glosses are not cobalt and not bold', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2');
    const names = () => page.$$eval('#view button', (bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter((n) => /השמעה/.test(n)));
    await open(page, 'scenario/rl-airport-checkin-overweight?tab=prepare', '.examples');
    const prep = await names();
    const notes = await page.$$eval('.examples .note', (ns) => ns.filter((n) => !/[א-ת]/.test(n.textContent)).map((n) => n.getAttribute('lang')));
    const gloss = await page.evaluate(() => { const he = document.querySelector('.scenario-view .bi-he'); const cs = getComputedStyle(he); const probe = document.createElement('span'); probe.style.color = 'var(--cobalt)'; document.body.append(probe); const cobalt = getComputedStyle(probe).color; probe.remove(); return { color: cs.color, weight: Number(cs.fontWeight), cobalt }; });
    await shot(page, 'rw9-prepare-390');
    await tap('[data-tab="listen"]');
    await page.waitForSelector('.chat-log');
    const listen = await names();
    for (const [where, list] of [['prepare', prep], ['listen', listen]]) {
      assert(list.length >= 3 && new Set(list).size === list.length, `${where}: play keys share names: ${JSON.stringify(list.slice(0, 4))}`);
    }
    assert(notes.length && notes.every((l) => l === 'en'), `Latin-only notes: ${JSON.stringify(notes)}`);
    assert(gloss.color !== gloss.cobalt && gloss.weight <= 400, `Hebrew gloss: ${JSON.stringify(gloss)}`);
    await ctx.close();
  });

  for (const size of [100, 150]) await check(`RW-12 390 at ${size}%: in the expressions filter sheet every option label is one line, and the register options are a 2 x 2 grid`, async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2', { text: size });
    await open(page, 'expressions', '.entry');
    await tap('[data-filters]');
    await page.waitForSelector('#xp-filters:not([hidden])');
    const r = await page.evaluate(() => [...document.querySelectorAll('#xp-filters .seg > button')].map((b) => { const cs = getComputedStyle(b); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25; const range = document.createRange(); range.selectNodeContents(b); const h = range.getBoundingClientRect().height; return { t: b.textContent.trim(), h: Math.round(h), lh: Math.round(lh), one: h <= lh * 1.3, overflow: b.scrollWidth > b.clientWidth + 1 }; }));
    const grid = await page.$eval('[aria-labelledby="xf-formality"]', (s) => getComputedStyle(s).gridTemplateColumns.split(' ').length);
    await shot(page, `rw12-filters-390-${size}`);
    const bad = r.filter((x) => !x.one || x.overflow);
    assert(!bad.length, `labels that wrap or overflow: ${JSON.stringify(bad)}`);
    assert(grid === 2, `register options: ${grid} columns`);
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}

if (pageErrors.length) { console.log(`FAIL  no page errors\n      ${pageErrors.slice(0, 3).join('\n      ')}`); results.push({ ok: false }); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
