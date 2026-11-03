// Acceptance checks for the UX round 3 lane "lesson-content" (BL-2, BL-6, BL-7): Hebrew glosses that state the
// claim, the content fixes the panels asked for, and pronunciation notes that lead with Hebrew.
// Serves lucid/ on its own port, drives Chromium through Playwright, prints one line per check and exits 1 on any
// failure. Usage: node tests/e2e/lesson-content.mjs [--only <substring>]   (LANE_PORT overrides the port, 9143)
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const PORT = Number(process.env.LANE_PORT) || 9143;
const BASE = `http://127.0.0.1:${PORT}/`;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const { glossStats } = await import('../../tools/validate-content.mjs');

const results = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const HE = /[֐-׿]/;

async function learner(browser, level, { wide = false } = {}) {
  const ctx = await browser.newContext({ viewport: wide ? { width: 1440, height: 900 } : { width: 390, height: 844 }, hasTouch: !wide, isMobile: !wide, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async (lvl) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 50, text_size: 100 });
    await L.applyPlacement(P.selfReportResult(lvl));
  }, level);
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(200);
  return { ctx, page };
}
// The Hebrew lines on screen (elements marked lang=he that hold their own text), as the learner reads them.
const hebrewLines = (page, scope) => page.$$eval(`${scope} [lang="he"]`, (els) => els.filter((e) => !e.hidden && e.offsetParent !== null).map((e) => e.innerText.trim()).filter(Boolean));
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// Opens a lesson's learn stage and walks its steps (if it has any) until the selector shows, or the stage ends.
async function learnUntil(page, id, sel) {
  await page.goto(`${BASE}#/lesson/${id}`);
  await page.waitForSelector('.lesson-intro');
  await page.click('[data-go="learn"]');
  await page.waitForTimeout(300);
  for (let i = 0; i < 8; i++) {
    if (await page.locator(sel).count()) return true;
    // The learn stage's Next key (LF-2). (A \b after a Hebrew letter never matches, so find it by its attribute.)
    const next = page.locator('.player-foot [data-learn-next]');
    if (!(await next.count())) return false;
    await next.first().click();
    await page.waitForTimeout(250);
  }
  return false;
}
// Skips forward to exercise n (1-based) with "I don't know" / "Can't speak right now".
async function toExercise(page, id, n) {
  await page.goto(`${BASE}#/lesson/${id}`);
  await page.waitForSelector('.lesson-intro');
  await page.click('[data-skip-learn]');
  for (let i = 1; i < n; i++) {
    await page.waitForSelector('[data-dontknow], [data-skip-speak]');
    await page.click((await page.$('[data-skip-speak]')) ? '[data-skip-speak]' : '[data-dontknow]');
    await page.waitForTimeout(150);
    if (await page.$('[data-next]')) await page.click('[data-next]');
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('#exroot');
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: app, stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();
try {
  await check('BL-2 validator: 0 errors and 0 gloss findings from Pre-A1 to B1', async () => {
    const r = spawnSync('node', ['tools/validate-content.mjs'], { cwd: app, encoding: 'utf8' });
    assert(r.status === 0, `validator exit ${r.status}: ${r.stdout.split('\n').filter((l) => l.startsWith('ERROR')).slice(0, 2).join(' | ')}`);
    const gloss = r.stdout.split('\n').filter((l) => /lessons\/(pa1|a1|a2|b1)-/.test(l) && /Hebrew gloss|Hebrew letters/.test(l));
    assert(gloss.length === 0, `${gloss.length} gloss findings, e.g. ${gloss[0]}`);
  });

  await check('BL-2 a1-03 intro and explanation: Hebrew lines hold no full English sentences (390)', async () => {
    const { ctx, page } = await learner(browser, 'A1');
    await page.goto(`${BASE}#/lesson/a1-03`);
    await page.waitForSelector('.lesson-intro');
    const intro = await hebrewLines(page, '.lesson-intro');
    assert(intro.length >= 3, `only ${intro.length} Hebrew lines in the intro`);
    const badIntro = intro.filter((t) => glossStats(t).sentences.length > 0 || glossStats(t).latinWords > 8);
    assert(!badIntro.length, `intro: "${badIntro[0]}"`);
    assert(!intro.some((t) => t.includes("I don't eat meat")), 'an intro Hebrew line repeats "I don\'t eat meat"');
    await learnUntil(page, 'a1-03', '.lesson-learn');
    const learn = (await hebrewLines(page, '.lesson-learn')).filter((t) => !/^(דוגמאות|מילים חדשות|שימו לב)/.test(t));
    const badLearn = learn.filter((t) => glossStats(t).sentences.length > 1 || glossStats(t).latinWords > 8);
    assert(!badLearn.length, `learn: "${badLearn[0]}"`);
    assert(!learn.some((t) => t.includes('Do you work on Fridays? – No, I don\'t.')), 'the explanation\'s Hebrew repeats its English examples');
    assert(await overflow(page) <= 0, 'horizontal scroll at 390');
    await ctx.close();
  });

  await check('BL-2 a1-03 listening feedback reads as one Hebrew sentence at 390', async () => {
    const { ctx, page } = await learner(browser, 'A1');
    await toExercise(page, 'a1-03', 1);
    await page.locator('#exroot .option').first().click();
    if (await page.$('[data-check]:not([disabled])')) await page.click('[data-check]');
    await page.waitForTimeout(400);
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes("הקשיבו ל-don't: הדובר/ת לא אוכל/ת בשר"), 'the Hebrew feedback line is missing');
    const line = text.split('\n').find((l) => l.includes("הקשיבו ל-don't"));
    assert(glossStats(line).sentences.length === 0, `the feedback quotes an English sentence: ${line}`);
    assert(await overflow(page) <= 0, 'horizontal scroll at 390');
    await ctx.close();
  });

  await check('BL-6 a1-02 e12 "Sara is study English every evening." gets specific feedback', async () => {
    const { ctx, page } = await learner(browser, 'A1');
    await toExercise(page, 'a1-02', 12);
    await page.fill('#exroot textarea, #exroot input[type=text]', 'Sara is study English every evening.');
    await page.click('[data-check]');
    await page.waitForTimeout(400);
    // r4 LF-2: this feedback ends with the answer, so the second-try note leaves it out; it shows with the answer.
    if (await page.$('[data-show-answer]')) { await page.click('[data-show-answer]'); await page.waitForTimeout(200); }
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('לא מוסיפים is לפני הפועל') || text.includes("Don't add is before the verb"), 'no be + base verb feedback');
    await ctx.close();
  });

  await check('BL-6 pa1-01 learn notes show Hebrew', async () => {
    const { ctx, page } = await learner(browser, 'PreA1');
    assert(await learnUntil(page, 'pa1-01', '.note[lang="he"]'), 'no Hebrew note in the learn stage');
    // The examples may run over more than one learn step (LF-2 keeps each step short): collect them all.
    const notes = [];
    for (let i = 0; i < 8; i++) {
      notes.push(...await page.$$eval('.note[lang="he"]', (els) => els.map((e) => e.innerText.trim())));
      const next = await page.$('.player-foot [data-learn-next]');
      if (!next) break;
      await next.click();
      await page.waitForTimeout(250);
    }
    assert(notes.length >= 7 && notes.every((t) => /[֐-׿]/.test(t)), `${notes.length} Hebrew notes`);
    assert(notes.includes('שואלים את זה כשלא יודעים איך כותבים שם'), 'the spell-that note is not in Hebrew');
    await ctx.close();
  });

  await check('BL-6 #/path/B1 shows Hebrew titles for b1-01 and b1-09, and Hebrew can-dos', async () => {
    const { ctx, page } = await learner(browser, 'B1', { wide: true });
    await page.goto(`${BASE}#/path/B1`);
    await page.waitForSelector('.lesson-list');
    const he = await page.$$eval('.lesson-list [lang="he"]', (els) => els.map((e) => e.innerText.trim()));
    assert(he.includes('חוויות בחיים: present perfect'), 'b1-01 has no Hebrew title');
    assert(he.includes('פועל + ing או פועל + to'), 'b1-09 has no Hebrew title');
    assert(he.includes('אני יודע/ת לדבר על חוויות בחיים.'), 'the b1-01 can-do is English only');
    await ctx.close();
  });

  await check('BL-7 a1-01 live/leave note starts with the Hebrew instruction, IPA after it', async () => {
    const { ctx, page } = await learner(browser, 'A1');
    assert(await learnUntil(page, 'a1-01', '.lesson-learn [lang="he"]:has-text("ב-leave")'), 'the live/leave note is not on the learn stage');
    const note = (await hebrewLines(page, '.lesson-learn')).filter((t) => t.includes('ב-leave')).sort((a, b) => a.length - b.length)[0] || '';
    assert(note.startsWith('מותחים את השפתיים'), `starts with: ${note.slice(0, 30)}`);
    const firstIpa = note.search(/\/[^/\s]+\//);
    assert(firstIpa > note.indexOf('ומאריכים'), 'IPA comes before the instruction');
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
