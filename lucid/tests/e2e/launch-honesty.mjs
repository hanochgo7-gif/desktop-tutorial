// Browser acceptance checks for the launch audit's honesty lane (BLK-01/02/06/07, FR-03/04/05/07/09/10/12/13, TS-06..09,
// IS-09, HE-21): with accounts and AI off (config.js as shipped) every screen says only what is true on this site, in
// the Hebrew and the English interface; with AI on (a mocked config) the AI entry points come back. Serves lucid/
// itself, drives Chromium through Playwright, prints one line per check and exits 1 on any failure.
// Usage: node tests/e2e/launch-honesty.mjs [--only <substring>] [--shots <dir>]      port: LH_PORT (default 13060)
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
const PORT = Number(process.env.LH_PORT) || 13060;
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
const AI_CONFIG = "export const CONFIG = { supabaseUrl: 'https://mock.supabase.co', supabaseKey: 'sb_publishable_test', aiEnabled: true, aiFunction: 'lucid-ai' };";
async function newPage(browser, { viewport = PHONE, ai = false, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: 'block', colorScheme: dark ? 'dark' : 'light', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  if (ai) {
    // AI on this site, no account signed in: the entry points are offered (they then ask for an account).
    await page.route(/\/config\.js$/, (r) => r.fulfill({ contentType: 'text/javascript', body: AI_CONFIG }));
    await page.route(/mock\.supabase\.co/, (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  }
  return { ctx, page };
}
const shot = (page, name, full = true) => (SHOTS ? page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full }) : null);
async function learnerAt(page, level, { lang = 'he', birthYear = 1990, start = null, goals = ['travel'] } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, lang, birthYear, start, goals }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: birthYear, ui_language: lang, goals, created_at: new Date().toISOString(), ...(start ? { start_choice: start } : {}) });
    L.saveSettings({ daily_minutes: 20 });
    if (level) await L.applyPlacement(P.selfReportResult(level));
  }, { level, lang, birthYear, start, goals });
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
const text = (page, sel = '#view') => page.textContent(sel);
const LANGS = ['he', 'en'];
const by = (lang, he, en) => (lang === 'he' ? he : en);
const curriculum = JSON.parse(readFileSync(join(app, 'content/curriculum.json'), 'utf8'));
const LESSONS = curriculum.levels.reduce((n, l) => n + l.lessons.length, 0);
const SCENARIOS = JSON.parse(readFileSync(join(app, 'content/real-life/index.json'), 'utf8')).scenarios.length;
const AI_OFF = { he: 'AI לא פעיל באתר הזה. כל השאר עובד.', en: 'AI is not active on this site. Everything else works.' };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();

try {
  // ---------- FR-03 ----------
  await check('FR-03. Without AI no AI-only entry point is offered: no tutor in the rail or Practice, no Conversations link, no roleplay or AI feedback tab, Settings has no AI controls (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser, { viewport: DESKTOP });
      await learnerAt(page, 'B1', { lang });
      await go(page, 'practice', '.practice-labs');
      assert(!(await page.$('#deck a[href="#/tutor"]')), `${lang}: the rail offers the AI tutor`);
      assert(!(await page.$('#view a[href="#/tutor"]')), `${lang}: Practice offers the AI tutor`);
      await go(page, 'real-life', '.hub-row');
      assert(!(await page.$('#view a[href="#/conversations"]')), `${lang}: Real life links to the AI Conversations`);
      assert(!/היכרויות/.test(await text(page)), `${lang}: Real life says "היכרויות"`);
      // An old link to Conversations: no claim that the AI plays the other side; the scripted practice is named.
      await go(page, 'conversations', '.hub-row');
      const conv = await text(page);
      assert(!/ה-AI משחק|The AI plays/.test(conv) && conv.includes(AI_OFF[lang]) && /תרגול מובנה|scripted practice/.test(conv), `${lang}: Conversations copy: ${conv.slice(0, 240)}`);
      assert(!(await page.$('#view a.hub-row[href*="tab=roleplay"]')), `${lang}: a Conversations row opens the AI roleplay`);
      // A scenario has no AI roleplay tab, and an old link to it opens the scripted practice.
      await go(page, 'scenario/rl-hotel-checkin-basics', '.scenario-tabs');
      assert(!(await page.$('[data-tab="roleplay"]')) && (await page.$$('.scenario-tabs [data-tab]')).length === 3, `${lang}: the scenario shows the AI roleplay tab`);
      await go(page, 'scenario/rl-hotel-checkin-basics?tab=roleplay', '.scenario-tabs');
      assert(await page.$('[data-tab="practise"][aria-pressed="true"]'), `${lang}: ?tab=roleplay did not open the scripted practice`);
      // The Writing lab has no AI feedback tab.
      await go(page, 'writing/free', 'aside .seg');
      const tabs = await page.$$eval('aside .seg [data-tab]', (b) => b.map((x) => x.dataset.tab));
      assert(!tabs.includes('ai') && tabs.includes('checks') && tabs.includes('rubric'), `${lang}: essay tabs ${tabs}`);
      // Settings: one sentence, no disabled AI controls.
      await go(page, 'settings', '#set-feedback');
      assert(!(await page.$('[data-ai]')) && !(await page.$('[data-seg="corrections"]')) && !(await page.$('[data-seg="feedback_scope"]')) && !(await page.$('#view [disabled]')), `${lang}: Settings shows AI controls`);
      assert((await text(page, '#ai-off')).includes(AI_OFF[lang]), `${lang}: the Settings AI-off line`);
      assert(!/AI/.test(await text(page, '#offline')), `${lang}: Offline use talks about AI features this site does not have`);
      // The tutor's own route still answers an old link honestly.
      await go(page, 'tutor', '[data-ai-notice]');
      assert(!(await page.$('[data-mode]')), `${lang}: the tutor offers modes without AI`);
      await shot(page, `fr03-tutor-${lang}`);
      await ctx.close();
    }
  });

  await check('FR-03. With AI on the site the entry points come back: the rail and Practice tutor, the Conversations link, the roleplay and AI feedback tabs, the Settings controls', async () => {
    const { ctx, page } = await newPage(browser, { viewport: DESKTOP, ai: true });
    await learnerAt(page, 'B1');
    await go(page, 'practice', '.practice-labs');
    assert(await page.$('#deck a[href="#/tutor"]') && await page.$('#view a[href="#/tutor"]'), 'no tutor with AI on');
    await go(page, 'real-life', '.hub-row');
    assert(await page.$('#view a[href="#/conversations"]'), 'no Conversations link with AI on');
    await go(page, 'conversations', '.hub-row');
    assert(/ה-AI משחק/.test(await text(page)), 'the Conversations intro is the scripted one with AI on');
    await go(page, 'scenario/rl-hotel-checkin-basics', '.scenario-tabs');
    assert(await page.$('[data-tab="roleplay"]'), 'no roleplay tab with AI on');
    await go(page, 'writing/free', 'aside .seg');
    assert(await page.$('aside [data-tab="ai"]'), 'no AI feedback tab with AI on');
    await go(page, 'settings', '[data-ai]');
    assert(await page.$('[data-seg="corrections"]') && !(await page.$('#ai-off')), 'no AI settings with AI on');
    await ctx.close();
  });

  await check('FR-03. With AI on the site, at 390 and 150% text, the four scenario parts (with AI roleplay) stay on screen (RW-11 checks the three without AI)', async () => {
    const { ctx, page } = await newPage(browser, { ai: true });
    await learnerAt(page, 'A2');
    await page.evaluate(async () => (await import('./js/core/learner.js')).saveSettings({ text_size: 150 }));
    await go(page, 'scenario/rl-airport-checkin-overweight', '.scenario-tabs');
    const tabs = await page.$$eval('.scenario-tabs button', (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    assert(tabs.length === 4 && tabs.every(Boolean), `switcher tabs off screen at 150% with AI: ${tabs}`);
    await ctx.close();
  });

  // ---------- FR-04 ----------
  await check('FR-04. Without AI, writing is never shown as a level to reach: Progress, Today\'s skill line and the level check say it is self-assessed here (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'B1', { lang });
      await go(page, 'progress', '[data-skill-note]');
      const p = await text(page);
      assert(p.includes(by(lang, 'באתר הזה Lucid לא מעריך רמת כתיבה', 'Lucid does not assess writing level on this site')), `${lang}: Progress does not say writing is not assessed here`);
      assert(!/לפי טקסטים שקיבלו משוב AI|From texts with AI feedback|רק מטקסטים שהוערכו במשוב AI|only from texts assessed with AI feedback/.test(p), `${lang}: Progress presents an AI writing level`);
      const skill = await page.evaluate(async () => { const { skillProfile } = await import('./js/views/today.js'); const d = document.createElement('div'); const { model } = await import('./js/core/learner.js'); const { render } = await import('./js/core/util.js'); render(d, skillProfile(model().skills) || ''); return d.textContent; });
      assert(!/From texts with AI feedback|לפי טקסטים שקיבלו משוב AI/.test(skill), `${lang}: the skill rows promise AI-assessed writing`);
      await go(page, 'checkpoint/B1', '[data-writing-task]');
      const c = await text(page, '[data-writing-task]');
      assert(c.includes(by(lang, 'תרגול עם הערכה עצמית', 'practice with your own self-assessment')) && !/חלק נפרד מההוכחה|separate part of the evidence/.test(c), `${lang}: level check: ${c}`);
      await ctx.close();
    }
  });

  // ---------- FR-05, FR-09 ----------
  await check('FR-05/FR-09. The path counts its lessons from the curriculum and says "in preparation" only while a lesson has no file (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'A1', { lang });
      await go(page, 'path', '[data-path-intro]');
      const intro = await text(page, '[data-path-intro]');
      assert(intro.includes(`${LESSONS}`) && !/עוד נכתבים|still being written/.test(intro), `${lang}: path intro: ${intro}`);
      // A lesson with no file: the sentence comes back.
      const manifest = JSON.parse(readFileSync(join(app, 'content/manifest.json'), 'utf8'));
      await page.route(/content\/manifest\.json/, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...manifest, lessons: manifest.lessons.filter((l) => l !== 'b2-03') }) }));
      await page.reload();
      await go(page, 'path/B2', '[data-path-intro]');
      assert(/עוד נכתבים|still being written/.test(await text(page, '[data-path-intro]')), `${lang}: a missing lesson is not mentioned`);
      await ctx.close();
    }
  });

  // ---------- FR-07 ----------
  await check('FR-07. Profile\'s under-16 and under-18 notes describe this device-only site, not accounts or AI (Hebrew and English)', async () => {
    const year = new Date().getFullYear();
    for (const lang of LANGS) {
      for (const [age, sel] of [[12, '[data-under16]'], [17, '[data-under18]']]) {
        const { ctx, page } = await newPage(browser);
        await learnerAt(page, 'A1', { lang, birthYear: year - age });
        await go(page, 'profile', sel);
        const note = await text(page, sel);
        assert(!/חשבון בשרת|בחשבון השרת|משוב AI|server|AI feedback/.test(note), `${lang} ${age}: ${note}`);
        if (age === 12) assert(note.includes(by(lang, 'באתר הזה ההתקדמות נשמרת רק במכשיר', 'On this site your progress stays on this device')), `${lang}: ${note}`);
        else assert(/שיווק|marketing/.test(note), `${lang}: ${note}`);
        await ctx.close();
      }
    }
  });

  // ---------- FR-09, TS-09, IS-09 ----------
  await check('FR-09/TS-09/IS-09. Welcome counts lessons and scenarios from the content, never says "היכרויות", and links the privacy policy and the accessibility statement as 44px targets (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${BASE}#/welcome`);
      await page.waitForSelector('.welcome [data-count-scenarios]');
      if (lang === 'en') { await page.click('[data-lang="en"]'); await page.waitForSelector('[data-lang="en"][aria-pressed="true"]'); }
      const w = await text(page, '.welcome');
      assert(await page.getAttribute('[data-count-lessons]', 'data-count-lessons') === String(LESSONS), `${lang}: lessons counted ${await page.getAttribute('[data-count-lessons]', 'data-count-lessons')}`);
      assert(await page.getAttribute('[data-count-scenarios]', 'data-count-scenarios') === String(SCENARIOS), `${lang}: scenarios counted ${await page.getAttribute('[data-count-scenarios]', 'data-count-scenarios')}`);
      assert(w.includes(by(lang, `${SCENARIOS} תרחישים מהחיים`, `${SCENARIOS} real-life scenarios`)) && w.includes(by(lang, `${LESSONS} שיעורים`, `${LESSONS} lessons`)), `${lang}: welcome counts: ${w.slice(0, 400)}`);
      assert(!/היכרויות/.test(w), `${lang}: Welcome says "היכרויות"`);
      for (const [href, name] of [['privacy.html', by(lang, 'מדיניות הפרטיות', 'Privacy policy')], ['accessibility.html', by(lang, 'הצהרת נגישות', 'Accessibility statement')]]) {
        const a = await page.$(`.welcome-links a[href="${href}"]`);
        assert(a, `${lang}: no ${href} link on Welcome`);
        assert((await a.textContent()).trim() === name, `${lang}: ${href} link reads "${await a.textContent()}"`);
        const h = (await a.boundingBox()).height;
        assert(h >= 44, `${lang}: ${href} link is ${h}px tall`);
      }
      await shot(page, `is09-welcome-${lang}`);
      await ctx.close();
    }
  });

  // ---------- FR-10 ----------
  await check('FR-10. Progress counts lesson writing as writing "in lessons and the Writing lab" (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'B1', { lang });
      await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.logEvent({ type: 'writing', lesson: 'b1-03' }); });
      await go(page, 'progress', '[data-writing-sessions]');
      const d = await text(page, '[data-writing-sessions] .d');
      assert(d.trim() === by(lang, 'בשיעורים ובמעבדת הכתיבה, בלי הערכת רמה', 'In lessons and the Writing lab, no level claim'), `${lang}: ${d}`);
      await ctx.close();
    }
  });

  // ---------- FR-12 ----------
  await check('FR-12. "I\'m advanced" starts at B2 named as the highest start without a test, with one line on C1 and C2; other starts keep "your own estimate" (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, null, { lang, start: 'advanced', goals: ['writing', 'studies'] });
      await go(page, 'placement', '[data-skip-level="B2"]');
      const key = await text(page, '[data-skip-level="B2"]');
      assert(key.includes(by(lang, 'ההתחלה הגבוהה ביותר בלי מבחן', 'the highest start without a test')) && !/ההערכה שלכם|your own estimate/.test(key), `${lang}: ${key}`);
      const note = await text(page, '[data-start-cap]');
      assert(/C1/.test(note) && /C2/.test(note) && note.includes(by(lang, 'במסלול', 'on the Path')), `${lang}: ${note}`);
      await shot(page, `fr12-placement-${lang}`);
      await ctx.close();
      const b = await newPage(browser);
      await learnerAt(b.page, null, { lang, start: 'comfortable' });
      await go(b.page, 'placement', '[data-skip-level="B1"]');
      assert(/ההערכה שלכם|your own estimate/.test(await text(b.page, '[data-skip-level="B1"]')) && !(await b.page.$('[data-start-cap]')), `${lang}: the B1 start changed`);
      await b.ctx.close();
    }
  });

  // ---------- FR-13 ----------
  await check('FR-13. A legend\'s Hebrew subtitle is not drawn in the link colour, and stays at AA contrast (light and dark)', async () => {
    for (const dark of [false, true]) {
      const { ctx, page } = await newPage(browser, { dark });
      await learnerAt(page, 'A2', { goals: ['travel', 'writing'] });
      await go(page, 'real-life', '.hub-row .legend .l-he');
      const r = await page.evaluate(() => {
        const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return getComputedStyle(document.body).backgroundColor; };
        const he = document.querySelector('.hub-row .legend .l-he');
        const link = getComputedStyle(document.documentElement).getPropertyValue('--cobalt').trim();
        const c = rgb(getComputedStyle(he).color); const l = rgb(link); const bg = rgb(bgOf(he));
        const [a, b] = [lum(c), lum(bg)].sort((x, y) => y - x);
        return { c, l, ratio: (a + 0.05) / (b + 0.05) };
      });
      assert(r.c.join() !== r.l.join(), `${dark ? 'dark' : 'light'}: the Hebrew subtitle is the link colour ${r.c}`);
      assert(r.ratio >= 4.5, `${dark ? 'dark' : 'light'}: contrast ${r.ratio.toFixed(2)}`);
      await ctx.close();
    }
  });

  // ---------- TS-07 ----------
  await check('TS-07. The Writing lab and a lesson\'s writing task say not to type real personal details (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'A1', { lang });
      await go(page, 'writing/free', '[data-no-real-details]');
      assert((await text(page, '[data-no-real-details]')).includes(by(lang, 'אל תכתבו פרטים אישיים אמיתיים; אפשר להמציא.', 'Do not type real personal details; you can make them up.')), `${lang}: the Writing lab note`);
      // The lesson renderer's writing step, with a1-15's final task (it asks for name, age and where you live).
      const lesson = await page.evaluate(async () => {
        const { content } = await import('./js/core/content.js');
        const { mountExercise } = await import('./js/ui/exercise.js');
        const l = await content.lesson('a1-15');
        const ex = l.exercises.find((x) => x.type === 'write');
        const box = document.createElement('div'); document.body.append(box);
        mountExercise(box, ex, { level: 'A1' });
        return { note: box.querySelector('[data-no-real-details]')?.textContent || '', task: box.textContent };
      });
      assert(lesson.note.includes(by(lang, 'אפשר להמציא', 'you can make them up')), `${lang}: the lesson writing step has no note`);
      assert(/אפשר להמציא|you can make these up/.test(lesson.task), `${lang}: the a1-15 task does not say the details can be made up`);
      await ctx.close();
    }
  });

  // ---------- TS-08 ----------
  await check('TS-08. The export holds the preferences Lucid keeps in localStorage (not the sign-in session) and a restore brings them back; Help names both browser exceptions', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await page.evaluate(() => { localStorage.setItem('lucid-mic-notice', '1'); localStorage.setItem('lucid-he-all', '["a1-01"]'); localStorage.setItem('lucid-session', '{"secret":"x"}'); });
    await go(page, 'settings', '[data-export]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export]')]);
    const file = await dl.path();
    const data = JSON.parse(readFileSync(file, 'utf8'));
    assert(data.preferences?.['lucid-mic-notice'] === '1' && data.preferences?.['lucid-he-all'] === '["a1-01"]', `preferences: ${JSON.stringify(data.preferences)}`);
    assert(!('lucid-session' in data.preferences) && !JSON.stringify(data).includes('secret'), 'the sign-in session is in the export');
    await page.evaluate(() => { localStorage.removeItem('lucid-mic-notice'); localStorage.removeItem('lucid-he-all'); });
    await page.setInputFiles('[data-import]', file);
    await page.click('dialog button[value="yes"]');
    await page.waitForFunction(() => localStorage.getItem('lucid-mic-notice') === '1', null, { timeout: 4000 }).catch(() => { throw new Error('the restore did not bring the preferences back'); });
    await go(page, 'help', '#view details');
    const mine = await page.evaluate(() => [...document.querySelectorAll('#view details')].find((d) => d.querySelector('summary').textContent.includes('המידע שלי'))?.textContent || '');
    assert(/שני חריגים/.test(mine) && /זיהוי הדיבור/.test(mine) && /קול ההקראה הוא שירות מקוון/.test(mine), `Help "My data": ${mine}`);
    await ctx.close();
  });

  // ---------- HE-21 ----------
  await check('HE-21. Help names the Writing lab key as it is: "בדיקה אוטומטית"', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A1');
    await go(page, 'help', '#view details');
    const ans = await page.evaluate(() => [...document.querySelectorAll('#view details')].find((d) => d.querySelector('summary').textContent.includes('מעבדת הכתיבה'))?.textContent || '');
    assert(ans.includes('לחצו ״בדיקה אוטומטית״'), `Help: ${ans}`);
    await go(page, 'writing/free', '[data-check]');
    assert((await text(page, '[data-check]')).trim() === 'בדיקה אוטומטית', 'the key is not "בדיקה אוטומטית"');
    await ctx.close();
  });

  // ---------- BLK-06 ----------
  await check('BLK-06. Help has a Contact answer: while contact.js is empty it says the details will be published before the public launch; filled in, it gives the address as a mailto link (Hebrew and English)', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await learnerAt(page, 'A1', { lang });
      await go(page, 'help?q=contact', '[data-contact][open]');
      const c = await text(page, '[data-contact]');
      assert(await page.$('[data-contact-pending]') && c.includes(by(lang, 'יפורסמו כאן ובמדיניות הפרטיות לפני ההשקה הציבורית', 'will be published here and in the privacy policy before the public launch')), `${lang}: ${c}`);
      assert(!(await page.$('#view a[href^="mailto:"]')) && !/@/.test(c), `${lang}: an address shows while contact.js is empty`);
      await ctx.close();
    }
    // Filled in (a test-only value on a reserved domain): the address, as a mailto link with a subject.
    const { ctx, page } = await newPage(browser);
    await page.route(/js\/core\/contact\.js$/, async (r) => {
      // The served file: the source, or the built tree's minified copy (`email:""`).
      const fill = (src, key, value) => { const out = src.replace(new RegExp(`(${key}:\\s*)(''|"")`), `$1${JSON.stringify(value)}`); if (out === src) throw new Error(`contact.js: no empty ${key}`); return out; };
      let src = readFileSync(join(app, 'js/core/contact.js'), 'utf8');
      src = fill(fill(fill(src, 'email', 'help@lucid.invalid'), 'name_he', 'מפעיל לבדיקה'), 'name_en', 'Test operator');
      await r.fulfill({ contentType: 'text/javascript', body: src });
    });
    await learnerAt(page, 'A1');
    await go(page, 'help?q=contact', '[data-contact][open]');
    assert(await page.getAttribute('[data-contact-email]', 'href') === 'mailto:help@lucid.invalid?subject=Lucid', 'the mailto link');
    assert((await text(page, '[data-contact]')).includes('מפעיל לבדיקה') && !(await page.$('[data-contact-pending]')), 'the filled contact answer');
    await ctx.close();
  });

  // ---------- BLK-02 ----------
  await check('BLK-02. Onboarding asks only that the privacy policy was read (box, link and error), in Hebrew and English', async () => {
    for (const lang of LANGS) {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${BASE}#/start`);
      await page.waitForSelector('#ob-form');
      if (lang === 'en') { await page.click('[data-ui="en"]'); await page.waitForSelector('[data-ui="en"][aria-pressed="true"]'); }
      await page.selectOption('#ob-year', String(new Date().getFullYear() - 30));
      await page.click('button[type=submit]');
      await page.click('button[type=submit]');
      await page.click('[data-start="basics"]');
      await page.click('button[type=submit]');
      await page.waitForSelector('input[name=terms]');
      const label = await page.evaluate(() => [...document.querySelector('input[name=terms]').labels].map((l) => l.textContent).join(' ').trim());
      assert(label === by(lang, 'קראתי את מדיניות הפרטיות', 'I have read the privacy policy'), `${lang}: box: ${label}`);
      const link = (await text(page, '#ob-terms-help a')).trim();
      assert(link === by(lang, 'לקריאת מדיניות הפרטיות (בחלון חדש)', 'Read the privacy policy (opens in a new window)'), `${lang}: link: ${link}`);
      await page.click('button[type=submit]');
      await page.waitForSelector('#ob-err');
      const err = (await text(page, '#ob-err')).trim();
      assert(!/תנאים|terms/.test(err) && /מדיניות הפרטיות|privacy policy/.test(err), `${lang}: error: ${err}`);
      assert(!/תנאים|the terms/.test(await text(page, '#ob-form')), `${lang}: the step still mentions terms`);
      await ctx.close();
    }
  });

  // ---------- BLK-07, BLK-01 ----------
  await check('BLK-07/BLK-01. The accessibility statement opens in both languages with no compliance claim, and is linked from Help, Settings and the privacy policy; the privacy policy says AI is off here', async () => {
    const { ctx, page } = await newPage(browser);
    const res = await page.goto(`${BASE}accessibility.html`);
    assert(res.status() === 200, `accessibility.html: ${res.status()}`);
    const a = await text(page, 'main');
    assert(a.includes('הצהרת נגישות') && a.includes('Accessibility statement') && a.includes('axe-core'), 'the statement is not in both languages');
    assert((await page.$$('[data-legal-pending]')).length === 2 && (await page.$$('[data-contact-placeholder]')).length === 2, 'the legal note or the contact box is missing');
    assert(await page.$eval('section[lang="en"]', (s) => s.dir === 'ltr'), 'the English section is not LTR');
    await page.goto(`${BASE}privacy.html`);
    assert(await page.$('main a[href="accessibility.html"]'), 'privacy.html does not link the statement');
    const off = await page.$$eval('[data-ai-off]', (x) => x.map((p) => p.textContent));
    assert(off.length === 2 && off[0].includes('AI לא פעיל באתר הזה') && off[1].includes('AI is not active on this site'), `privacy AI box: ${off}`);
    assert((await page.title()) === 'מדיניות פרטיות · Lucid', `privacy title: ${await page.title()}`);
    await ctx.close();
    for (const lang of LANGS) {
      const b = await newPage(browser);
      await learnerAt(b.page, 'A1', { lang });
      for (const r of ['help', 'settings']) {
        await go(b.page, r, '#view a[href="accessibility.html"]');
        const name = (await text(b.page, '#view a[href="accessibility.html"]')).trim();
        assert(name === by(lang, 'הצהרת נגישות', 'Accessibility statement'), `${lang} ${r}: ${name}`);
        assert(!/פרטיות ותנאים|Privacy and terms/.test(await text(b.page)), `${lang} ${r}: still says "privacy and terms"`);
      }
      await b.ctx.close();
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
