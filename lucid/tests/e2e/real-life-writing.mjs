// Browser checks for the round-3 lane "real-life-writing" (RW-1 to RW-12): scenario practice, the writing checks,
// the essay editor, the writing lab, Real life and Expressions. Serves lucid/ on its own port, drives Chromium
// through Playwright in the Hebrew UI, prints one PASS/FAIL line per check and exits 1 on any failure.
// Usage: node tests/e2e/real-life-writing.mjs [--only <substring>] [--shots <dir>]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const lucid = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.RW_PORT) || 9183;
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
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) }); };
const noOverflow = async (page, where) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert(o <= 0, `${where}: the page scrolls sideways by ${o}px`); };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', lucid], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  await check('RW-1 Scenario practice: a tap selects, "Check" commits, and "Continue" is fully visible above the tab bar on all 5 turns without scrolling; play keys at least 44x44', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.goto(`${BASE}#/scenario/rl-airport-checkin-overweight?tab=practise`);
    await page.waitForSelector('[data-opt]');
    const keys = await page.$$eval('[data-say-text]', (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    assert(keys.length && keys.every(([w, h]) => w >= 44 && h >= 44), `play keys: ${JSON.stringify(keys)}`);
    for (let i = 0; i < 5; i++) {
      const before = (await page.evaluate(() => window.lucid.store.all('attempts').length));
      await tap(`[data-opt="${i % 3}"]`);
      assert(await page.getAttribute(`[data-opt="${i % 3}"]`, 'aria-pressed') === 'true' && !(await page.$('[data-explain]')), `turn ${i + 1}: a tap graded the reply instead of selecting it`);
      assert((await page.evaluate(() => window.lucid.store.all('attempts').length)) === before, `turn ${i + 1}: a tap recorded an attempt`);
      await tap('[data-check-turn]');
      await page.waitForSelector('[data-next-turn]');
      await page.waitForTimeout(150);
      const s = await page.evaluate(() => { const b = document.querySelector('[data-next-turn]'); const r = b.getBoundingClientRect(); const tb = document.querySelector('.tabbar'); const top = getComputedStyle(tb).display === 'none' ? innerHeight : tb.getBoundingClientRect().top; const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { top: r.top, bottom: r.bottom, bar: top, hit: b === hit || b.contains(hit) }; });
      assert(s.top >= 0 && s.bottom <= s.bar && s.hit, `turn ${i + 1}: "Continue" is not fully visible above the tab bar: ${JSON.stringify(s)}`);
      if (i === 0) await shot(page, 'rw1-checked-390');
      await tap('[data-next-turn]');
    }
    await page.waitForSelector('[data-done-head]');
    await ctx.close();
  });

  await check('RW-2 Writing checks: the we-06 sample flags at least 10 of its 14 errors; "But by the time ..., I had" is not a run-on; a 3-word essay names the missing words, never "no problems"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    const sample = 'Volunteering give young people a chance to grow. I think every school need a volunteering program for teenagers. Last year I was volunteer in a old people\'s home near my house. The old people was very kind to me, and I learned alot from them about life and about patience. It is very important thing for teenagers, because they dont know much about the real world. Volunteering is also more better than sitting at home with a phone all day. In the other hand, some students say that they need the time for find a job and earn money. I am agree that money is important, but volunteering can improve there CV and help them later. I worked there one hour in week, and it was enough for me. I hope that more schools will try it next year.';
    const errors = ['volunteering give', 'every school need', 'i was volunteer', 'a old', 'people was', 'alot', 'very important thing', 'dont', 'more better', 'in the other hand', 'for find', 'i am agree', 'there cv', 'one hour in week'];
    await page.goto(`${BASE}#/writing/we-06`);
    await page.waitForSelector('#essay');
    await page.fill('#essay', sample);
    await page.click('[data-check]');
    await page.waitForSelector('aside .error-card');
    const quotes = await page.$$eval('aside .error-card .quote', (q) => q.map((x) => x.textContent.toLowerCase()));
    const found = errors.filter((e) => quotes.some((q) => q.includes(e) || e.includes(q)));
    assert(found.length >= 10, `only ${found.length} of 14 flagged: ${found}`);
    await shot(page, 'rw2-we06-390');
    const runOn = await page.evaluate(async () => (await import('./js/core/writing-analyzer.js')).analyzeWriting('But by the time the meeting started, I had written down every step.', { level: 'B2' }).issues.length);
    assert(runOn === 0, 'the lesson\'s own "by the time" sentence is flagged');
    await page.goto(`${BASE}#/writing/we-16`);
    await page.waitForSelector('#essay');
    await page.fill('#essay', 'This is short.');
    await page.click('[data-check]');
    await page.waitForSelector('[data-checks-head]');
    const status = await page.textContent('[data-status]');
    const head = await page.textContent('[data-checks-head]');
    assert(/חסרות 297 מילים/.test(status) && !/לא נמצאו בעיות|לא מצאה בעיות/.test(`${status} ${head}`) && /מהדברים שאנחנו בודקים/.test(head), `status: "${status}" | heading: "${head}"`);
    await ctx.close();
  });

  await check('RW-3 Own-words replies: "I am agree ... Nice to know you." flags both, "fix the bug until Thursday?" flags until -> by, and the field is a 3-line textarea', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2', { goals: ['work'] });
    await page.goto(`${BASE}#/scenario/rl-work-first-day-intro?tab=practise`);
    await page.waitForSelector('[data-opt]');
    await tap('[data-opt="0"]');
    await tap('[data-check-turn]');
    await tap('[data-own-box] > summary');
    const field = await page.$eval('[data-own]', (t) => ({ tag: t.tagName, rows: t.rows, lines: Math.round((t.clientHeight - parseFloat(getComputedStyle(t).paddingTop) - parseFloat(getComputedStyle(t).paddingBottom)) / parseFloat(getComputedStyle(t).lineHeight)) }));
    assert(field.tag === 'TEXTAREA' && field.rows === 3 && field.lines >= 3, `reply field: ${JSON.stringify(field)}`);
    const own = async (text) => { await page.fill('[data-own]', text); await tap('[data-own-check]'); await page.waitForSelector('.own-result'); return page.evaluate(() => ({ head: document.querySelector('.own-l1-h')?.textContent || '', ex: [...document.querySelectorAll('.own-result .issue-ex')].map((x) => x.textContent) })); };
    const a = await own('I am agree to work with you. Nice to know you.');
    assert(/טעות נפוצה לדוברי עברית/.test(a.head) && a.ex.some((x) => x.includes('I agree')) && a.ex.some((x) => x.includes('Nice to meet you')), `first reply: ${JSON.stringify(a)}`);
    await shot(page, 'rw3-own-390');
    const b = await own('Can you fix the bug until Thursday?');
    assert(b.ex.some((x) => x.includes('by Thursday')), `until -> by not flagged: ${JSON.stringify(b)}`);
    await ctx.close();
  });

  await check('RW-4 Essay editor: at 1440 a check low on final-B2 leaves the panel in view; at 390 the Check key does not move while typing; a 3-word check on we-16 keeps the model locked', async () => {
    const wide = await newPage(browser, { width: 1440, height: 900 });
    await learnerAt(wide.page, 'B2');
    await wide.page.goto(`${BASE}#/writing/final-B2`);
    await wide.page.waitForSelector('#essay');
    await wide.page.fill('#essay', 'Schools should teach students how to manage money. '.repeat(10));
    await wide.page.$eval('#essay', (e) => e.scrollIntoView({ block: 'end' }));
    await wide.page.mouse.wheel(0, 600);
    await wide.page.click('[data-check]');
    await wide.page.waitForTimeout(400);
    const r = await wide.page.evaluate(() => { const h = document.querySelector('[data-checks-head]').getBoundingClientRect(); return { y: scrollY, top: h.top, bottom: h.bottom, vh: innerHeight }; });
    assert(r.y > 200 && r.top >= 0 && r.bottom <= r.vh, `the checks are not in view after a check at y=${Math.round(r.y)}: ${JSON.stringify(r)}`);
    await shot(wide.page, 'rw4-final-b2-1440');
    await wide.ctx.close();
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B2');
    await page.goto(`${BASE}#/writing/final-B2`);
    await page.waitForSelector('#essay');
    const pos = () => page.$eval('[data-check]', (b) => { const x = b.getBoundingClientRect(); return `${Math.round(x.left)},${Math.round(x.top + scrollY)}`; });
    const seen = new Set();
    await page.focus('#essay');
    for (const w of 'I think schools should teach money skills because many young people do not know how to save'.split(' ')) { await page.keyboard.type(`${w} `); seen.add(await pos()); }
    await page.waitForTimeout(800);
    seen.add(await pos());
    assert(seen.size === 1, `the Check key moved while typing: ${[...seen]}`);
    await page.goto(`${BASE}#/writing/we-16`);
    await page.waitForSelector('#essay');
    await page.fill('#essay', 'This is short.');
    await page.click('[data-check]');
    await page.waitForTimeout(300);
    assert(!(await page.$$eval('details summary', (s) => s.some((x) => /דוגמה למשימה דומה/.test(x.textContent)))), 'a 3-word check unlocked the model answer');
    assert(await page.$('aside [data-tab="sources"]'), 'the text to respond to is not in the Sources tab');
    await ctx.close();
  });

  await check('RW-5 Rubric without AI: on wa-05 the rubric tab shows Band 5/3/1 descriptors, a self-rating saves with the version, marking final shows "הערכה עצמית" on the lab card, and the writing level does not change', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'C1');
    const level = () => page.evaluate(async () => JSON.stringify((await import('./js/core/learner.js')).model().skills.writing));
    const before = await level();
    await page.goto(`${BASE}#/writing/wa-05`);
    await page.waitForSelector('#essay');
    await page.click('aside [data-tab="rubric"]');
    await page.waitForSelector('.rubric-cat');
    const bands = await page.$$eval('.rubric-cat', (c) => c.map((x) => x.querySelectorAll('.band-row').length));
    assert(bands.length >= 8 && bands.every((n) => n === 3), `rubric descriptors: ${bands}`);
    await page.fill('#essay', 'Halvarden should build more homes near the station. '.repeat(70));
    await page.selectOption('[data-self="argument_strength"]', '3');
    await page.click('[data-save-self]');
    const saved = await page.evaluate(() => window.lucid.store.all('writing').some((w) => w.kind === 'essay-version' && w.exercise === 'wa-05' && w.self?.argument_strength === 3));
    assert(saved, 'the self-rating was not saved with the version');
    await page.click('[data-self-final]');
    await page.waitForSelector('.final-box .tag.ok');
    await page.goto(`${BASE}#/writing?stage=8`);
    await page.waitForSelector('a[href="#/writing/wa-05"]');
    const cards = await page.$$eval('a[href="#/writing/wa-05"]', (a) => a.map((x) => x.textContent));
    assert(cards.length && cards.every((t) => /הערכה עצמית/.test(t)), `lab card: ${cards}`);
    await shot(page, 'rw5-lab-390');
    assert((await level()) === before, `the writing level changed: ${before} -> ${await level()}`);
    await ctx.close();
  });

  await check('RW-6 Source tasks: on wa-05, two copied sentences are flagged as Source A, the citation list is right, and a cited sentence ticks evidence with its phrase', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'C1');
    await page.goto(`${BASE}#/writing/wa-05`);
    await page.waitForSelector('#essay');
    await page.fill('#essay', "Halvarden's population has grown faster than its housing supply for ten years, and average rents have risen faster than average incomes over the same period. The office estimates that it could provide about 900 homes, 40% of them at rents below the market rate.\n\nI think the city should build on the northern edge. Merrow (2025) argues that the park will disappear. The survey shows that 58% opposed building (Halvarden Residents' Panel, 2025).");
    await page.click('[data-check]');
    await page.waitForSelector('.source-use');
    const copied = await page.$$eval('aside .error-card .tag', (t) => t.filter((x) => /מקור A/.test(x.textContent)).length);
    assert(copied === 2, `copied sentences flagged as Source A: ${copied}`);
    const src = await page.textContent('.source-use');
    assert(/צוטטו:\s*Dana Merrow \(2025\), Halvarden Residents' Panel \(2025\)/.test(src) && /לא צוטטו:\s*Halvarden City Planning Office \(2025\)/.test(src), `citation list: ${src}`);
    const ev = await page.$$eval('.sig-row', (r) => r.map((x) => x.textContent).find((t) => /ראיות/.test(t)) || '');
    assert(/Merrow \(2025\)/.test(ev), `evidence tick without its phrase: ${ev}`);
    await shot(page, 'rw6-wa05-390');
    await ctx.close();
  });

  await check('RW-7 English in the lab reads left to right: wa-05 source passages are left-aligned with full stops at the line ends; the we-10 plan is numbered on the left; checklist boxes sit on the line of their items at 390', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'C1');
    await page.goto(`${BASE}#/writing/wa-05`);
    await page.waitForSelector('#essay');
    await page.click('aside [data-tab="sources"]');
    await page.waitForSelector('aside .passage.source');
    const ps = await page.$$eval('aside .passage.source .en-block-lab p', (p) => p.map((x) => { const cs = getComputedStyle(x); const r = document.createRange(); r.selectNodeContents(x); const rects = [...r.getClientRects()]; return { dir: cs.direction, align: cs.textAlign, startsLeft: Math.round(rects[0].left - x.getBoundingClientRect().left) <= 1, dotLast: x.textContent.trim().endsWith('.') ? rects.at(-1).right <= x.getBoundingClientRect().right + 1 : true }; }));
    assert(ps.length > 3 && ps.every((p) => p.dir === 'ltr' && p.startsLeft && p.dotLast), `source passages: ${JSON.stringify(ps.slice(0, 3))}`);
    await page.goto(`${BASE}#/writing/we-10`);
    await page.waitForSelector('#essay');
    const plan = await page.evaluate(() => { const ol = document.querySelector('ol.lab-list'); ol.closest('details').open = true; const li = ol.querySelector('li'); return { dir: getComputedStyle(ol).direction, markerLeft: li.getBoundingClientRect().left - ol.getBoundingClientRect().left > 10 }; });
    assert(plan.dir === 'ltr' && plan.markerLeft, `plan list: ${JSON.stringify(plan)}`);
    const boxes = await page.evaluate(() => { const d = document.querySelector('.check-labels').closest('details'); d.open = true; return [...d.querySelectorAll('.check-label')].map((l) => { const b = l.querySelector('input').getBoundingClientRect(); const t = l.querySelector('span').getBoundingClientRect(); return Math.abs(b.top - t.top) < 14 && b.right <= t.left + 1; }); });
    assert(boxes.length && boxes.every(Boolean), `checklist boxes: ${boxes}`);
    await shot(page, 'rw7-we10-390');
    await ctx.close();
  });

  await check('RW-8 Email mode: a correct 23-word email gets no length or connector warning; an email without a sign-off is flagged', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await page.goto(`${BASE}#/writing/free`);
    await page.waitForSelector('#essay');
    await page.click('[data-kind="email"]');
    await page.fill('#essay', 'Hi James,\nThanks for checking in. Could we move the report deadline to Monday? The sales figures from Dana are late.\n\nBest,\nYael');
    assert(/^23 /.test((await page.textContent('[data-wc]')).trim()), `not 23 words: ${await page.textContent('[data-wc]')}`);
    await page.click('[data-check]');
    await page.waitForSelector('[data-checks-head]');
    const side = await page.textContent('aside');
    const bad = await page.$$eval('aside .check-item.bad', (x) => x.map((c) => c.textContent.trim()));
    assert(!bad.length && !/לפחות 30|at least 30/.test(side) && !/מילות קישור|Connectors/.test(side), `warnings on a correct email: ${bad} | ${side.slice(0, 200)}`);
    await page.fill('#essay', 'Hi James,\nThanks for checking in. Could we move the report deadline to Monday? The sales figures from Dana are late.');
    await page.click('[data-check]');
    await page.waitForTimeout(300);
    const missing = await page.$$eval('aside .check-item.bad', (x) => x.map((c) => c.textContent.trim()));
    assert(missing.length === 1 && /ברכת סיום/.test(missing[0]), `no sign-off not flagged: ${missing}`);
    await shot(page, 'rw8-email-390');
    await ctx.close();
  });

  await check('RW-9 Real life follows the goals: with work at B2, start here is work, "בעבודה" comes first with its B2 items first, and after rl-work-disagree-politely the next scenario is B1 or B2 work', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'B2', { goals: ['work'] });
    await page.goto(`${BASE}#/real-life`);
    await page.waitForSelector('.start-here');
    const r = await page.evaluate(() => ({ start: [...document.querySelectorAll('.start-here .lesson-row')].map((a) => a.getAttribute('href')), first: document.querySelector('.hub-head')?.id, firstText: document.querySelector('.hub-head')?.textContent, work: [...document.querySelectorAll('section[aria-labelledby="hub-work"] .tag.level')].map((t) => t.textContent.trim()) }));
    assert(r.start.length === 3 && r.start.every((h) => h.includes('rl-work-')), `start here: ${r.start}`);
    assert(r.first === 'hub-work' && /בעבודה/.test(r.firstText) && r.work[0] === 'B2', `topics: ${JSON.stringify(r)}`);
    await shot(page, 'rw9-real-life-390');
    await page.goto(`${BASE}#/scenario/rl-work-disagree-politely?tab=practise`);
    await page.waitForSelector('[data-opt]');
    for (let i = 0; i < 6 && !(await page.$('[data-done-head]')); i++) { await tap('[data-opt="0"]'); await tap('[data-check-turn]'); await tap('[data-next-turn]'); await page.waitForTimeout(80); }
    await page.waitForSelector('[data-done-head]');
    const next = (await page.getAttribute('a[href^="#/scenario/"]', 'href')).match(/scenario\/([^?]+)/)[1];
    const lvl = await page.evaluate(async (id) => (await (await fetch('./content/real-life/scenarios.json')).json()).scenarios.find((s) => s.id === id), next);
    assert(lvl.module === 'work' && ['B1', 'B2'].includes(lvl.level), `next scenario: ${next} (${lvl.module} ${lvl.level})`);
    await ctx.close();
  });

  await check('RW-10 Expressions at 390: the first card starts under 300px, "Chill" senses are list items 1-3, play keys are at least 44x44, and "Brilliant (UK)" says "Brilliant"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await page.goto(`${BASE}#/expressions`);
    await page.waitForSelector('.entry');
    const r = await page.evaluate(() => ({ top: document.querySelector('.entry').getBoundingClientRect().top, keys: [...document.querySelectorAll('.entry [data-say-text]')].slice(0, 8).map((b) => { const x = b.getBoundingClientRect(); return [Math.round(x.width), Math.round(x.height)]; }) }));
    assert(r.top < 300, `the first card starts at ${Math.round(r.top)}px`);
    assert(r.keys.length && r.keys.every(([w, h]) => w >= 44 && h >= 44), `play keys: ${JSON.stringify(r.keys)}`);
    await shot(page, 'rw10-expressions-390');
    await page.fill('#xp-q', 'chill');
    await page.waitForSelector('[data-entry="ex-chill"]');
    assert((await page.$$('[data-entry="ex-chill"] ol.senses > li')).length === 3, 'Chill senses are not a 3-item list');
    await page.fill('#xp-q', 'brilliant');
    await page.waitForSelector('[data-entry="ex-brilliant-uk"]');
    assert(await page.getAttribute('[data-entry="ex-brilliant-uk"] [data-say-text]', 'data-say-text') === 'Brilliant', 'the play key says the label too');
    await page.click('[data-filters]');
    assert((await page.$$eval('.xp-filter-row .label', (l) => l.length)) === 4, 'the filters are not in labelled rows');
    await ctx.close();
  });

  await check('RW-11 Scenario keeps its place (Today and back, and a reload, offer "3 מתוך 5"); at 390 and 150% every part of the switcher is on screen and the US/UK table needs no sideways scroll', async () => {
    const { ctx, page, tap } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.goto(`${BASE}#/scenario/rl-hotel-towels-late-checkout?tab=practise`);
    await page.waitForSelector('[data-opt]');
    for (let i = 0; i < 2; i++) { await tap('[data-opt="0"]'); await tap('[data-check-turn]'); await tap('[data-next-turn]'); await page.waitForTimeout(80); }
    await page.goto(`${BASE}#/today`);
    await page.waitForTimeout(300);
    await page.goBack();
    await page.waitForSelector('[data-resume]');
    assert(/להמשיך מתור 3 מתוך 5/.test(await page.textContent('[data-resume]')), 'no offer after Today and back');
    await page.reload();
    await page.waitForSelector('[data-resume]');
    assert(/להמשיך מתור 3 מתוך 5/.test(await page.textContent('[data-resume]')), 'no offer after a reload');
    await tap('[data-resume]');
    assert((await page.textContent('[data-step]')).trim() === '3 מתוך 5', 'continue does not start at turn 3');
    await ctx.close();
    const big = await newPage(browser);
    await learnerAt(big.page, 'A2', { text: 150 });
    await big.page.goto(`${BASE}#/scenario/rl-airport-checkin-overweight`);
    await big.page.waitForSelector('.scenario-tabs');
    const tabs = await big.page.$$eval('.scenario-tabs button', (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    assert(tabs.length === 4 && tabs.every(Boolean), `switcher tabs off screen at 150%: ${tabs}`);
    const t = await big.page.$eval('.variants-wrap', (w) => ({ sw: w.scrollWidth, cw: w.clientWidth, dir: getComputedStyle(w).direction }));
    assert(t.sw <= t.cw && t.dir === 'ltr', `US/UK table: ${JSON.stringify(t)}`);
    await noOverflow(big.page, 'scenario at 150%');
    await shot(big.page, 'rw11-scenario-150');
    await big.ctx.close();
  });

  await check('RW-12 Writing lab: stage cards show labelled counts and chevrons; final-C2 shows assignment titles, not ids, and both word ranges', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'C2');
    await page.goto(`${BASE}#/writing`);
    await page.waitForSelector('[data-stage]');
    const cards = await page.$$eval('[data-stage]', (bs) => bs.map((b) => ({ chev: Boolean(b.querySelector('.chev svg')), count: b.querySelector('.stage-meta .num')?.textContent || '', chip: Boolean(b.querySelector('.tag.level')) })));
    assert(cards.length === 10 && cards.every((c) => c.chev && /משימ/.test(c.count) && !c.chip), `stage cards: ${JSON.stringify(cards.slice(0, 2))}`);
    await page.goto(`${BASE}#/writing/final-C2`);
    await page.waitForSelector('#essay');
    const text = await page.textContent('#view');
    assert(!/wa-\d\d/.test(text) && /A minimum age for social media/.test(text), 'the C2 final still shows assignment ids');
    assert(/יעד 1,500-2,000 \(מתקבל 1,400-2,200\)/.test(await page.textContent('.editor-stats')), `ranges: ${await page.textContent('.editor-stats')}`);
    await ctx.close();
  });

  await check('Layout: lane screens at 390 (light and dark) and at 150% text do not scroll sideways', async () => {
    for (const opt of [{ text: 100 }, { text: 150, dark: true }]) {
      const { ctx, page } = await newPage(browser, { dark: opt.dark });
      await learnerAt(page, 'B2', { goals: ['work'], text: opt.text });
      for (const r of ['real-life', 'conversations', 'expressions', 'scenario/rl-work-email-extension?tab=practise', 'writing', 'writing/free', 'writing/wa-05', 'writing/final-C2']) {
        await page.goto(`${BASE}#/${r}`);
        await page.waitForTimeout(450);
        await noOverflow(page, `#/${r} at ${opt.text}%`);
      }
      await ctx.close();
    }
  });

  await check('No page errors on the lane screens', async () => {
    assert(!pageErrors.length, pageErrors.slice(0, 3).join(' | '));
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
