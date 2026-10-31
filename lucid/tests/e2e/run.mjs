// Browser acceptance tests for the Phase 16 criteria. Serves the repository, drives Chromium through
// Playwright, and prints PASS/FAIL per criterion. Server features (accounts, AI) are exercised against a
// mock Supabase (auth, REST and the lucid-ai function) injected with request interception, so the real
// UI code paths run without credentials.
// Usage: node tests/e2e/run.mjs [--only <substring>] [--shots <dir>]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const PORT = Number(process.env.E2E_PORT) || 8771;
const BASE = `http://localhost:${PORT}/lucid/`;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const ONLY = arg('--only');
const SHOTS = arg('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, err: e.message }); console.log(`FAIL  ${name}\n      ${e.message.split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// ---------- helpers ----------
async function newPage(browser, { viewport = { width: 390, height: 844 }, mock = false, serviceWorkers = 'block' } = {}) {
  // The service worker is blocked except in the offline check, so page.route mocks see every request.
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()} :: console ${m.text()}`); });
  if (mock) await installMockServer(page);
  return { ctx, page };
}
const idb = (page, fn) => page.evaluate(fn);
async function onboard(page, { start = 'zero', year = new Date().getFullYear() - 22 } = {}) {
  await page.goto(`${BASE}#/start`);
  await page.waitForSelector('#ob-form');
  await page.fill('#ob-name', 'Test');
  await page.selectOption('#ob-year', String(year));
  await page.click('button[type=submit]');
  await page.click('[data-goal="travel"]');
  await page.click('[data-min="20"]');
  await page.click('button[type=submit]');
  await page.click(`[data-start="${start}"]`);
  await page.click('button[type=submit]');
  await page.check('input[name=terms]');
  await page.click('button[type=submit]');
  await page.waitForTimeout(500);
}
const store = (page, coll) => page.evaluate((c) => window.lucid.store.all(c), coll);
// A learner at a course level, made through the app's store (onboarding itself is check 1).
async function learnerAt(page, level, { goals = ['travel'], text = 100, lang = 'he', birthYear = 2000 } = {}) {
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ level, goals, text, lang, birthYear }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: birthYear, ui_language: lang, goals, created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: text });
    await L.applyPlacement(P.selfReportResult(level));
  }, { level, goals, text, lang, birthYear });
  await page.waitForTimeout(500);
  await page.reload();
  // Wait until the app has booted and drawn its first route, so a following hash change is not lost.
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
async function answerCurrent(page, { correct = true } = {}) {
  // Answers whatever exercise is on screen using the lesson data exposed in the DOM state.
  return page.evaluate(async (ok) => {
    const root = document.querySelector('#exroot');
    const opts = [...root.querySelectorAll('.option')];
    if (opts.length) { (ok ? opts[0] : opts[opts.length - 1]).click(); return 'option'; }
    const gaps = [...root.querySelectorAll('.gap-input:not([readonly])')];
    if (gaps.length) { gaps.forEach((g) => { g.value = 'zzz'; g.dispatchEvent(new Event('input', { bubbles: true })); }); return 'gap'; }
    const chips = [...root.querySelectorAll('[data-chip]')];
    if (chips.length) { chips[0].click(); return 'chip'; }
    const ta = root.querySelector('textarea');
    if (ta) { ta.value = (ta.value ? ta.value + ' ' : '') + 'I am a student and I am happy today. My friend is a teacher.'; ta.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
    const ins = [...root.querySelectorAll('[data-in]')];
    if (ins.length) { for (const b of ins) b.click(); return 'order'; }
    const l = [...root.querySelectorAll('[data-l]')], r = [...root.querySelectorAll('[data-r]')];
    if (l.length) { for (const a of l) { a.click(); root.querySelector(`[data-r="${a.dataset.l}"]`)?.click(); } return 'match'; }
    const items = [...root.querySelectorAll('[data-item]')];
    if (items.length) { for (let i = 0; i < 20; i++) { const it = root.querySelector('[data-item]'); if (!it) break; it.click(); root.querySelector('[data-bin]').click(); } return 'cat'; }
    const self = root.querySelector('[data-self="1"]');
    if (self) { self.click(); return 'self'; }
    const tf = [...root.querySelectorAll('[data-tf]')];
    if (tf.length) { tf.filter((b) => b.dataset.v === 'true').forEach((b) => b.click()); root.querySelectorAll('[data-mq]').forEach((b) => b.dataset.o === '0' && b.click()); return 'read'; }
    const mq = [...root.querySelectorAll('[data-mq]')];
    if (mq.length) { const seen = new Set(); mq.forEach((b) => { if (!seen.has(b.dataset.mq)) { seen.add(b.dataset.mq); b.click(); } }); root.querySelectorAll('[data-rg]').forEach((g) => { g.value = 'x'; g.dispatchEvent(new Event('input', { bubbles: true })); }); return 'read'; }
    return 'none';
  }, correct);
}

// ---------- mock Supabase + AI ----------
function installMockServer(page) {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'learner@example.com' };
  // Account checks can switch the signed-in user (db.user), require email confirmation (db.confirm) and see
  // which token every push used (db.pushes). Password 'wrong password' is refused.
  const db = { profile: null, records: new Map(), usage: 0, aiBodies: [], user, confirm: false, pushes: [] };
  page.lucidMock = db;
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const evaluation = (text, previous) => ({
    evaluation: {
      task_fulfilment: { status: 'complete', note: 'Opinion and reasons are both present.' },
      cefr_estimate: 'B1', cefr_low: 'A2', cefr_high: 'B1', low_confidence: ['coherence'], runs: 1, summary: 'A clear opinion with one reason; the argument needs evidence and a counterargument.', summary_he: 'דעה ברורה עם נימוק אחד; חסרות ראיות וטיעון נגדי.',
      strengths: ['Your opinion is stated clearly in the first sentence.'], priorities: ['Add an example for each reason.'],
      categories: ['grammar', 'vocabulary', 'sentence_structure', 'coherence', 'cohesion', 'argument_strength', 'evidence_quality', 'counterarguments', 'academic_tone', 'clarity', 'precision', 'overall'].map((id, i) => ({ id, applicable: id !== 'academic_tone', score: id === 'academic_tone' ? null : 2 + (i % 3), explanation: `Explanation for ${id}.`, examples: [], improvement: 'Improve this.', practice: 'Practise that.' })),
      errors: text.includes('more better') ? [{ quote: 'more better', type: 'comparison-form', severity: 'important', explanation: 'Use either more or -er.', explanation_he: 'משתמשים או ב-more או ב-er.', hint: 'Look at the comparative.', correction: 'better' }] : [],
      required_elements: [], revision: { tasks: ['Add evidence.'], progress_since_previous: previous ? 'You fixed the comparative form.' : null }, dropped_errors: 0,
    },
  });
  return page.route(/(config\.js$)|(mock\.supabase\.co)/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith('/config.js')) {
      return route.fulfill({ contentType: 'text/javascript', body: "export const CONFIG = { supabaseUrl: 'https://mock.supabase.co', supabaseKey: 'sb_publishable_test', aiEnabled: true, aiFunction: 'lucid-ai' };" });
    }
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const token = (req.headers().authorization || '').replace(/^Bearer /, '');
    if (url.pathname.startsWith('/auth/v1/token') && body?.password === 'wrong password') return json(route, { error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
    if (url.pathname.startsWith('/auth/v1/signup') && db.confirm) return json(route, { ...db.user, confirmation_sent_at: new Date().toISOString() });
    if (url.pathname.startsWith('/auth/v1/signup') || url.pathname.startsWith('/auth/v1/token')) {
      return json(route, { access_token: `tok-${db.user.id}`, refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user: db.user });
    }
    if (url.pathname === '/auth/v1/user') {
      if (token !== `tok-${db.user.id}`) return json(route, { msg: 'invalid JWT' }, 401);
      if (req.method() === 'PUT') db.passwordChanged = body.password;
      return json(route, db.user);
    }
    if (url.pathname.startsWith('/auth/v1/logout')) return json(route, {});
    if (url.pathname.startsWith('/rest/v1/lucid_profiles')) {
      if (req.method() === 'GET') return json(route, db.profile ? [db.profile] : []);
      if (req.method() === 'POST') { db.profile = { ...body, id: user.id }; return json(route, [db.profile]); }
      if (req.method() === 'PATCH') { db.profile = { ...db.profile, ...body }; return route.fulfill({ status: 204 }); }
    }
    if (url.pathname.startsWith('/rest/v1/lucid_records')) {
      if (req.method() === 'POST') { db.pushes.push({ token, rows: body }); const now = new Date().toISOString(); const out = body.map((r) => { const row = { ...r, updated_at: now }; db.records.set(`${r.coll}/${r.id}`, row); return { coll: r.coll, id: r.id, updated_at: now }; }); return json(route, out); }
      return json(route, []);
    }
    if (url.pathname.startsWith('/rest/v1/rpc/lucid_export')) return json(route, { profile: db.profile, records: [...db.records.values()] });
    if (url.pathname.startsWith('/rest/v1/rpc/lucid_delete_account')) { db.profile = null; db.records.clear(); return route.fulfill({ status: 204 }); }
    if (url.pathname.startsWith('/functions/v1/lucid-ai')) {
      db.usage++;
      db.aiBodies.push(body);
      if (body.task === 'evaluate_writing') return json(route, evaluation(body.text, body.previous));
      if (body.task === 'roleplay_turn') return json(route, { reply: 'Sure, let me check that for you. Could you spell your last name?', scene_complete: body.history.length >= 5, hint_he: body.history.at(-1)?.text === 'um' ? 'אפשר לאיית: K-O-H-E-N.' : null });
      if (body.task === 'roleplay_feedback') return json(route, { feedback: { conversation_score: 72, task_completed: true, strengths: ['"Could I check in, please?" was a clear, polite request.'], grammar: { score: 70, comments: ['Mostly accurate.'] }, vocabulary: { score: 75, comments: ['Good range.'] }, naturalness: { score: 68, comments: ['A bit direct.'] }, better_alternatives: [{ you_said: body.history.find((h) => h.role === 'learner')?.text || 'x', more_natural: 'Could you help me with my booking, please?', why: 'Softer and more polite.' }], practice: ['Polite requests'], summary: 'You achieved the goal.', summary_he: 'השגת את המטרה.' } });
      if (body.task === 'tutor_turn') return json(route, { reply: `Good question. **Present perfect** links the past to now. Try: "I ___ (live) here since 2020."` });
    }
    return json(route, { error: { message: `unmocked ${url.pathname}` } }, 404);
  });
}

// ---------- server ----------
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: repo, stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();
const manifest = JSON.parse(readFileSync(join(repo, 'lucid/content/manifest.json'), 'utf8'));
const has = (id) => manifest.lessons.includes(id);

try {
  await check('1. A new user can register (onboarding creates a profile; under-16 is refused, on its own screen, for the session; P-10)', async () => {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    assert(!/16/.test(await page.textContent('#ob-year-help')), 'the age threshold is shown before the answer');
    await page.selectOption('#ob-year', String(new Date().getFullYear() - 14));
    await page.click('button[type=submit]');
    await page.waitForSelector('.onboard[role=alert] h1');
    assert(!(await page.$('#ob-form')) && /16/.test(await page.textContent('.onboard')), 'no refusal screen for a 14-year-old');
    // The refusal holds for this browser session: another year cannot simply be tried.
    await page.goto(`${BASE}#/welcome`);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('.onboard[role=alert]');
    assert(!(await page.$('#ob-form')), 'a refused learner can try another year in the same session');
    assert(!(await store(page, 'profile')).length, 'something was saved for a refused learner');
    await ctx.close();
    const fresh = await newPage(browser);
    await onboard(fresh.page, { start: 'zero' });
    const p = await store(fresh.page, 'profile');
    assert(p[0]?.onboarded && p[0].birth_year, 'profile not created');
    await fresh.ctx.close();
  });

  await check('2. A new user can complete a placement assessment', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    if (await page.$('[data-begin]')) {
      await page.click('[data-begin]');
      for (let i = 0; i < 40 && !(await page.$('a[href="#/today"].key.enter')); i++) {
        const opt = await page.$('#exroot .option');
        if (opt) { await opt.click(); await page.click('[data-answer]'); } else await page.click('[data-idk]');
        await page.waitForTimeout(60);
      }
      const placement = await store(page, 'placement');
      assert(placement[0]?.start_level, 'no placement result stored');
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/placement-result.png`, fullPage: true });
    } else {
      assert(await page.$('[data-zero]'), 'placement bank missing and no fallback offered');
      throw new Error('placement bank (content/placement.json) not present');
    }
    await ctx.close();
  });

  await check('3. A learner can start at absolute beginner level (no test, first lesson)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    assert(page.url().includes('#/lesson/pa1-01'), `expected lesson pa1-01, got ${page.url()}`);
    const pl = await store(page, 'placement');
    assert(pl[0]?.start_level === 'PreA1', 'start level not PreA1');
    await ctx.close();
  });

  await check('4-6. Lessons have real content, exercises give feedback, progress is saved across reloads', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1280, height: 860 } });
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/lesson/pa1-05`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    const blocks = await page.$$eval('.block-rule, .table-wrap, .example', (x) => x.length);
    assert(blocks >= 5, `explanation too thin (${blocks} blocks)`);
    await page.click('[data-go="practice"]');
    let feedbackSeen = false;
    for (let i = 0; i < 40; i++) {
      if (await page.$('[data-next-lesson], [data-retry]')) break;
      // Speaking is practice with no verdict (PS1 covers it): skip it here.
      if (await page.$('[data-skip-speak]')) { await page.click('[data-skip-speak]'); continue; }
      await answerCurrent(page, { correct: i % 3 !== 1 });
      const check = await page.$('[data-check]:not([disabled])');
      if (check) await check.click(); else await page.click('[data-dontknow]').catch(() => {});
      await page.waitForSelector('[data-next]', { timeout: 3000 });
      const verdict = await page.textContent('.verdict');
      if (/Correct answer|התשובה הנכונה|Not quite|לא בדיוק/.test(verdict)) feedbackSeen = true;
      await page.click('[data-next]');
    }
    assert(feedbackSeen, 'never saw corrective feedback');
    const attempts = await store(page, 'attempts');
    assert(attempts.length >= 8, `only ${attempts.length} attempts recorded`);
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForTimeout(800);
    const prog = await store(page, 'progress');
    assert(prog.some((p) => p.id === 'pa1-05'), 'progress lost after reload');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lesson-review.png`, fullPage: true });
    await ctx.close();
  });

  await check('7. The curriculum adapts: repeated mistakes add targeted practice to the plan', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.evaluate(() => {
      const now = Date.now();
      for (let d = 0; d < 3; d++) for (let i = 0; i < 2; i++) window.lucid.store.put('attempts', { id: `t${d}${i}`, at: new Date(now - d * 86400000 - i * 1000).toISOString(), source: 'lesson', topic: 'be-present', skill: 'grammar', level: 'PreA1', correct: false, score: 0, error_type: 'copula-omission' });
    });
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', daily_minutes: 35 }));
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    const html = await page.innerHTML('.plan');
    assert(/drill\?error=copula-omission/.test(html), 'targeted practice for the recurring error not in the plan');
    await page.click('a[href="#/drill?error=copula-omission"]');
    await page.waitForTimeout(800);
    assert(await page.$('#exroot') || await page.$('.empty'), 'drill did not open');
    await ctx.close();
  });

  await check('8. Vocabulary can be reviewed (cards from a passed lesson, objective grading)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.evaluate(async () => {
      const lesson = await (await fetch('content/lessons/pa1-05.json')).json();
      const { addVocabCards } = await import('./js/core/learner.js');
      addVocabCards(lesson, new Date(Date.now() - 3 * 86400000));
    });
    await page.goto(`${BASE}#/review`);
    await page.waitForSelector('.flash');
    const before = (await store(page, 'cards'))[0].fsrs.reps;
    if (await page.$('[data-pick]')) await page.click('[data-pick]'); else { await page.fill('#ans', 'סטודנט'); await page.click('[data-check]'); }
    await page.waitForSelector('[data-next]');
    const cards = await store(page, 'cards');
    assert(cards.some((c) => c.fsrs.reps > before), 'card was not rescheduled');
    await page.goto(`${BASE}#/vocab`);
    await page.waitForTimeout(500);
    assert((await page.textContent('#view')).includes('student'), 'notebook does not list the word');
    await ctx.close();
  });

  await check('9. Travel English is functional (scenario: phrases, model dialogue, scripted practice)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    await page.goto(`${BASE}#/real-life`);
    await page.waitForSelector('.lesson-row');
    await page.click('.lesson-row');
    await page.waitForSelector('.example');
    await page.click('[data-tab="listen"]');
    await page.waitForSelector('.chat-log .msg');
    await page.click('[data-tab="practise"]');
    await page.click('[data-opt="0"]');
    await page.waitForSelector('.explain');
    await page.fill('[data-own]', 'Could you help me, please?');
    await page.click('[data-own-check]');
    assert(await page.isVisible('[data-next-turn]'), 'cannot continue the scripted practice');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/scenario-practice.png`, fullPage: true });
    await ctx.close();
  });

  await check('10. Slang explanations include context (usage, formality, when not to use)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    await page.goto(`${BASE}#/expressions`);
    await page.waitForTimeout(700);
    const text = await page.textContent('#view');
    assert(/No worries/i.test(text), 'expression list missing "No worries"');
    const details = await page.$('details, [aria-expanded]');
    if (details) await details.click();
    await page.waitForTimeout(300);
    const after = await page.textContent('#view');
    assert(/(When NOT|מתי לא|avoid)/i.test(after), 'no "when not to use" context shown');
    await ctx.close();
  });

  await check('11-12. Writing can be submitted, evaluated (automatic + mocked AI) and revised with version comparison', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1280, height: 860 }, mock: true });
    await onboard(page, { start: 'basics' });
    await page.goto(`${BASE}#/account?mode=signup`);
    await page.fill('#em', 'learner@example.com'); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true, ai_consent_at: new Date().toISOString() }));
    await page.goto(`${BASE}#/writing/free`);
    await page.waitForSelector('#essay');
    // P-29: a disabled "Get feedback" says why.
    await page.fill('#essay', 'I think so.');
    assert(await page.$('[data-ai][disabled]'), 'feedback open for a 3-word text');
    assert(/15/.test(await page.textContent('[data-ai-why]')), `no reason under the disabled button: "${await page.textContent('[data-ai-why]')}"`);
    const essay1 = 'I think public transport is more better than cars. It is cheaper and cleaner for everyone in the city.';
    await page.fill('#essay', essay1);
    assert((await page.textContent('[data-ai-why]')).trim() === '', 'reason still shown when feedback is available');
    await page.click('[data-check]');
    await page.waitForSelector('.check-item');
    assert((await page.textContent('aside.panel')).includes('more better'), 'automatic check missed "more better"');
    assert((await page.textContent('[data-status]')).trim(), 'no visible result next to the Check button (P-63)');
    const checksBefore = await page.$$eval('aside .error-card .quote', (q) => q.map((x) => x.textContent));
    await page.click('[data-ai]');
    await page.waitForSelector('.error-card .quote');
    const sent = page.lucidMock.aiBodies.at(-1);
    assert(sent.stage === 0 && sent.draft_number === 1, `stage/draft not sent: ${JSON.stringify({ stage: sent.stage, draft: sent.draft_number })}`);
    assert(!/Correction:|תיקון:/.test(await page.textContent('aside.panel')), 'correction shown before the learner asked for it');
    // P-30: a mistake can be selected in the text.
    await page.click('.error-card [data-locate="0"]');
    assert(await page.evaluate(() => { const ta = document.querySelector('#essay'); return ta.value.slice(ta.selectionStart, ta.selectionEnd); }) === 'more better', 'the quoted mistake is not selected in the text');
    // Hint ladder (research E, 9.5): hints open on request, the correction only after an attempt in the text.
    for (let i = 0; i < 3 && await page.$('[data-rung="0"]:not([disabled])'); i++) await page.click('[data-rung="0"]');
    assert(await page.$('[data-rung="0"][disabled]'), 'correction reachable without any attempt');
    assert(!/Correction:|תיקון:/.test(await page.textContent('aside.panel')), 'correction shown before an attempt');
    // P-72: a wrong fix is "changed", never "looks fixed", although "better" is still in the essay.
    await page.fill('#essay', 'I think public transport is more good than cars. It is cheaper and better for everyone in the city.');
    await page.waitForSelector('[data-rung="0"]:not([disabled])');
    assert(/You changed this|שיניתם את זה/.test(await page.textContent('[data-fix="0"]')), `wrong fix labelled: "${await page.textContent('[data-fix="0"]')}"`);
    await page.click('[data-rung="0"]');
    assert(/Correction:|תיקון:/.test(await page.textContent('aside.panel')), 'correction not revealed after an attempt');
    const hints = await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'hint-level').map((e) => `${e.level}:${e.after}`));
    assert(hints.at(-1) === '4:attempt' && hints.length >= 2, `hint levels not logged: ${hints}`);
    assert(!/Estimated level of this text|הערכת רמה של הטקסט/.test(await page.textContent('aside.panel')), 'overall level shown on a first draft');
    // P-81: the Checks tab shows the same automatic checks after AI feedback.
    await page.click('[data-tab="checks"]');
    assert(JSON.stringify(await page.$$eval('aside .error-card .quote', (q) => q.map((x) => x.textContent))) === JSON.stringify(checksBefore), 'automatic checks changed after AI feedback');
    await page.fill('#essay', 'I think public transport is better than cars. It is cheaper and cleaner for everyone in the city.');
    await page.waitForSelector('[data-fix="0"]', { state: 'detached' }).catch(() => {});
    await page.click('[data-ai]');
    await page.waitForFunction(() => document.querySelector('aside.panel')?.textContent.includes('You fixed'));
    assert(page.lucidMock.aiBodies.at(-1).draft_number === 2, 'second draft number not sent');
    // P-71: no level on drafts, in Versions or in My drafts.
    await page.click('[data-tab="versions"]');
    assert(!(await page.$('aside.panel .tag.level')), 'a draft shows a level in Versions');
    // P-73: previous vs latest by default, any two versions on request.
    assert((await page.textContent('aside .diff del')) === 'more', `default comparison is not v1 -> v2: "${await page.textContent('aside .diff')}"`);
    // P-80: after the third round the draft is final by itself, the range appears and advice looks forward.
    await page.fill('#essay', 'I think public transport is better than cars. It is cheaper and cleaner for everyone who lives in the city.');
    await page.click('[data-ai]');
    await page.waitForFunction(() => /Estimated level of this text|הערכת רמה של הטקסט/.test(document.querySelector('aside.panel')?.textContent || ''));
    assert(page.lucidMock.aiBodies.at(-1).draft_number === 3, 'third draft number not sent');
    assert(/A2.B1/.test(await page.textContent('aside.panel .tag.level')), 'CEFR range not shown on the final draft');
    assert(!(await page.$('[data-final]')), '"Mark as final" still offered after the last round');
    assert(/What to carry into your next task|מה לקחת למשימה הבאה/.test(await page.textContent('aside.panel')), 'advice still says "for your next draft"');
    assert(await page.$('[data-ai][disabled]') && (await page.textContent('[data-ai-why]')).trim(), 'no reason given after the last round');
    assert(await page.evaluate(() => window.lucid.store.get('writing', 'ess:free').status === 'final'), 'task not marked final after the last round');
    await page.click('[data-tab="versions"]');
    assert((await page.$$('aside.panel .tag.level')).length === 1, 'only the final version shows a level range');
    await page.selectOption('[data-cmp="a"]', '1');
    await page.selectOption('[data-cmp="b"]', 'now');
    assert(await page.$('aside .diff ins'), 'no diff between v1 and the current text');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/essay-feedback.png`, fullPage: true });
    await page.goto(`${BASE}#/writing`);
    await page.waitForSelector('.lesson-list');
    assert(/A2.B1/.test(await page.textContent('section .lesson-list')), 'My drafts does not show the final range');
    // S-18: an essay can be deleted; its text leaves the device and its quotes leave the progress record.
    await page.goto(`${BASE}#/writing/free`);
    await page.waitForSelector('#essay');
    await page.click('[data-tab="versions"]');
    await page.click('[data-delete]');
    await page.click('dialog [value="yes"]');
    await page.waitForFunction(() => window.lucid.store.all('writing').filter((w) => w.exercise === 'free').length === 0, null, { timeout: 4000 }).catch(() => { throw new Error('essay records still on the device after delete'); });
    assert((await page.inputValue('#essay')) === '', 'deleted text still in the editor');
    assert(await page.evaluate(() => window.lucid.store.all('attempts').filter((a) => a.source === 'writing' && a.exercise === 'free').every((a) => !a.response)), 'mistake quotes kept after delete');
    await page.goto(`${BASE}#/writing`);
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => window.lucid.store.all('writing').filter((w) => w.exercise === 'free').length === 0), 'leaving the page brought the deleted draft back');
    await ctx.close();
  });

  await check('13. Advanced argumentative writing is available (assignments B2-C2, level final tasks with topics, sources and limits)', async () => {
    const as = JSON.parse(readFileSync(join(repo, 'lucid/content/writing/assignments.json'), 'utf8')).assignments;
    assert(as.length >= 10, `${as.length} assignments`);
    assert(as.some((a) => a.level === 'C2') && as.some((a) => a.level === 'C1'), 'no C1/C2 assignments');
    // P-75: every level final has a full brief; packs are referenced, not invented.
    const cur = JSON.parse(readFileSync(join(repo, 'lucid/content/curriculum.json'), 'utf8'));
    for (const l of cur.levels) {
      const fa = l.final_assessment;
      assert(fa.instructions?.en && fa.required_elements?.length >= 3, `${l.id} final has no full brief`);
      if (['PreA1', 'A1', 'A2', 'B1'].includes(l.id)) assert(fa.instructions.he && fa.required_elements.every((r) => r.he), `${l.id} final has no Hebrew instructions`);
      if (['B1', 'B2', 'C1', 'C2'].includes(l.id)) assert(fa.topics?.length >= 3, `${l.id} final has no topic choice`);
      for (const tp of fa.topics || []) if (tp.assignment) assert(as.find((a) => a.id === tp.assignment)?.source_pack?.length, `${l.id} topic points to ${tp.assignment}, which has no source pack`);
    }
    assert(/reference list does not count/.test(cur.levels.find((l) => l.id === 'C2').final_assessment.instructions.en), 'C2 final does not say whether references count');
    const { ctx, page } = await newPage(browser, { viewport: { width: 1440, height: 900 }, mock: true });
    await onboard(page, { start: 'basics' });
    await page.goto(`${BASE}#/account?mode=signup`);
    await page.fill('#em', 'learner@example.com'); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true, ai_consent_at: new Date().toISOString() }));
    await page.goto(`${BASE}#/writing/final-C2`);
    await page.waitForSelector('#essay');
    assert(!(await page.$('[data-tab="sources"]')), 'Sources tab before a topic with a pack is chosen');
    await page.click('input[name=topic][value="0"]');
    await page.waitForSelector('[data-tab="sources"]');
    await page.click('aside [data-tab="sources"]');
    assert((await page.$$('aside .passage.source')).length >= 3, 'source pack not shown beside the text (P-84)');
    // P-78: a long paper with its references (over the old 16,000-character limit) is accepted and counted
    // without its references.
    const para = 'Remote work changes how cities use office space, and the evidence on its effects is mixed and contested. ';
    const paper = `${Array.from({ length: 10 }, () => para.repeat(13)).join('\n\n')}\n\nReferences\n${'Varga, E., Nandi, P., & Holm, J. (2024). Social media use and well-being from age 12 to 16. Teralund Journal of Adolescent Health.\n'.repeat(24)}`;
    await page.fill('#essay', paper);
    assert(/\+\d+/.test(await page.textContent('[data-wc]')), 'reference words not shown apart');
    await page.click('[data-ai]');
    await page.waitForSelector('[data-final]');
    const body = page.lucidMock.aiBodies.at(-1);
    assert(body.text.length > 16000 && /Topic chosen by the learner: Should governments/.test(body.exercise.instructions) && /Source pack \(fictional/.test(body.exercise.instructions), 'topic or pack titles not sent');
    // P-79: what AI feedback cannot check, next to the bands.
    assert(/cannot check whether a source exists|לא יכול לבדוק אם מקור קיים/.test(await page.textContent('aside.panel')), 'no statement of what AI cannot verify');
    // P-85: the final action is a visible button, phrased as an action.
    assert(/Mark as final draft|לסמן כטיוטה סופית/.test(await page.textContent('[data-final]')) && !(await page.$('[data-final].ghost')), 'final button looks like a status or plain text');
    await page.click('[data-final]');
    await page.waitForFunction(() => /Estimated level of this text|הערכת רמה של הטקסט/.test(document.querySelector('aside.panel')?.textContent || ''));
    // P-78: too long, refused before sending, in words; a server refusal is never shown raw.
    await page.goto(`${BASE}#/writing/final-C1`);
    await page.waitForSelector('#essay');
    await page.click('input[name=topic][value="0"]');
    await page.fill('#essay', para.repeat(240));
    assert(await page.$('[data-ai][disabled]') && /24,000/.test(await page.textContent('[data-ai-why]')), `no length reason: "${await page.textContent('[data-ai-why]')}"`);
    await page.fill('#essay', para.repeat(80));
    await page.route(/functions\/v1\/lucid-ai/, (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { code: 'invalid_request', message: 'text: String must contain at most 16000 character(s)' } }) }));
    await page.click('[data-ai]');
    await page.waitForSelector('.error-text');
    const err = await page.textContent('.error-text');
    assert(!/String must contain|text:/.test(err) && /ארוך מדי|too long/.test(err), `raw or unclear error: "${err}"`);
    await page.unroute(/functions\/v1\/lucid-ai/);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/essay-final-c1-error.png` });
    await ctx.close();
  });

  await check('14-15. Mobile (320, 390), tablet and desktop layouts, every route loads without errors or horizontal overflow; welcome and start before a profile; 130-150% text (P-01, P-24, P-40, P-51)', async () => {
    // Welcome and onboarding, before there is a profile.
    for (const vp of [{ width: 320, height: 640 }, { width: 360, height: 780 }, { width: 390, height: 844 }]) {
      const { ctx, page } = await newPage(browser, { viewport: vp });
      for (const r of ['welcome', 'start']) {
        for (const lang of ['he', 'en']) {
          await page.goto(`${BASE}#/${r}`);
          await page.waitForSelector('.welcome, #ob-form');
          if (lang === 'en') await page.click('[data-lang="en"], [data-ui="en"]');
          await page.waitForTimeout(150);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert(overflow <= 1, `${r} (${lang}, no profile) overflows horizontally by ${overflow}px at ${vp.width}`);
        }
      }
      await ctx.close();
    }
    const routes = ['today', 'help', 'path', 'path/B2', 'practice', 'vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing', 'writing/free', 'writing/final-B2', 'tutor', 'real-life', 'expressions', 'conversations', 'progress', 'profile', 'settings', 'account', 'lesson/pa1-05', 'review', 'checkpoint/PreA1'];
    for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      const { ctx, page } = await newPage(browser, { viewport: vp });
      await onboard(page, { start: 'zero' });
      const before = pageErrors.length;
      for (const r of routes) {
        await page.goto(`${BASE}#/${r}`);
        await page.waitForTimeout(450);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(overflow <= 1, `${r} overflows horizontally by ${overflow}px at ${vp.width}`);
        const txt = await page.textContent('#view');
        assert(!/Something went wrong|משהו השתבש|did not load|לא נטען/.test(txt), `${r} failed to render at ${vp.width}`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp.width}-${r.replace(/\//g, '_')}.png`, fullPage: true });
      }
      assert(pageErrors.length === before, `page errors: ${pageErrors.slice(before).join(' | ')}`);
      await ctx.close();
    }
    // Large text at 390px, with the longest lesson titles on Today's main button (B2 and C1 learners) and a
    // speaking exercise.
    const big = ['today', 'path/B2', 'speaking?l=a2-01&e=e15', 'lesson/a2-01', 'real-life', 'expressions', 'conversations', 'reading', 'scenario/rl-airport-checkin-overweight', 'scenario/rl-social-party-small-talk?tab=practise', 'settings', 'profile', 'account'];
    for (const [level, text, width] of [['B2', 150, 390], ['C1', 130, 390], ['B2', 150, 320]]) {
      const { ctx, page } = await newPage(browser, { viewport: { width, height: 844 } });
      await learnerAt(page, level, { text });
      for (const r of big) {
        await page.goto(`${BASE}#/${r}`);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(overflow <= 1, `${r} overflows horizontally by ${overflow}px at ${width}px and ${text}% text`);
      }
      if (SHOTS) { await page.goto(`${BASE}#/today`); await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}/today-${level}-${text}-${width}.png` }); }
      await ctx.close();
    }
  });

  await check('16. User data handled securely (CSP, no secrets in client, export and deletion)', async () => {
    const index = readFileSync(join(repo, 'lucid/index.html'), 'utf8');
    assert(/Content-Security-Policy[^>]*script-src 'self'/.test(index), 'CSP missing or allows external scripts');
    const { execSync } = await import('node:child_process');
    const leak = execSync(`grep -rEl "sk-ant-|service_role|SUPABASE_SERVICE_ROLE_KEY" ${join(repo, 'lucid/js')} ${join(repo, 'lucid/config.js')} || true`).toString().trim();
    assert(!leak, `possible secret in client code: ${leak}`);
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/settings`);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export]')]);
    const data = JSON.parse(readFileSync(await dl.path(), 'utf8'));
    assert(data.app === 'lucid' && data.device.profile.length === 1, 'export incomplete');
    // Another app on the same origin keeps its data when Lucid's data is deleted (security review S-04).
    await page.evaluate(() => { localStorage.setItem('hgos-session', 'crm'); localStorage.setItem('hgos-outbox', '[1]'); sessionStorage.setItem('other-app', 'x'); });
    await page.click('[data-wipe]');
    await page.click('dialog [value="yes"]');
    await page.waitForTimeout(1200);
    assert(page.url().includes('#/welcome'), 'not returned to welcome after deletion');
    const prof = await page.evaluate(() => window.lucid?.store.all('profile').length ?? 0);
    assert(prof === 0, 'profile still present after deletion');
    const keys = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert(keys.local.includes('hgos-session') && keys.local.includes('hgos-outbox') && keys.session.includes('other-app'), `other apps' data was deleted: ${JSON.stringify(keys)}`);
    assert(![...keys.local, ...keys.session].some((k) => k.startsWith('lucid-')), `Lucid keys left: ${JSON.stringify(keys)}`);
    // A malformed hash does not stop the app from starting (S-17).
    await page.goto('about:blank');
    await page.goto(`${BASE}#/%E0%A4%A`);
    await page.waitForSelector('.welcome, [data-start], #view h1', { timeout: 5000 });
    assert(!(await page.textContent('#view')).includes('could not start'), 'boot failed on a malformed hash');
    assert(page.url().endsWith('#/welcome'), `malformed hash not replaced: ${page.url()}`);
    await ctx.close();
  });

  await check('17. AI features are functional or clearly marked as requiring configuration', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    for (const r of ['tutor', 'writing/free', 'conversations']) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForTimeout(500);
      const txt = await page.textContent('#view');
      assert(/(not configured|לא הוגדר|עוד לא הוגדרה|עוד לא הוגדרו|not available on this site|עוד לא זמינה באתר)/.test(txt), `${r}: no configuration notice`);
    }
    await ctx.close();
    const m = await newPage(browser, { mock: true });
    await onboard(m.page, { start: 'basics' });
    await m.page.goto(`${BASE}#/account?mode=signin`);
    await m.page.fill('#em', 'learner@example.com'); await m.page.fill('#pw', 'correct horse 1');
    await m.page.click('[data-auth] button[type=submit]');
    await m.page.click('[data-owner-dialog="unowned"] [value="move"]');
    await m.page.waitForFunction(() => !location.hash.startsWith('#/account'));
    await m.page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true }));
    await m.page.goto(`${BASE}#/tutor?mode=grammar`);
    await m.page.waitForSelector('#tin');
    await m.page.fill('#tin', 'When do I use the present perfect?');
    await m.page.click('[data-send] button[type=submit]');
    await m.page.waitForFunction(() => document.querySelector('#log')?.textContent.includes('Present perfect'));
    const strong = await m.page.$('#log strong');
    assert(strong, 'tutor reply formatting missing');
    await m.ctx.close();
  });

  // ---------- accounts (security review S-01, S-04, S-05, S-06, S-12, S-18; persona P-22) ----------
  const waitFor = async (fn, ms = 4000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await sleep(50); } return true; };
  const signInWith = async (page, email, password = 'correct horse 1') => {
    await page.goto(`${BASE}#/account?mode=signin`);
    await page.waitForSelector('[data-auth]');
    await page.fill('#em', email); await page.fill('#pw', password);
    await page.click('[data-auth] button[type=submit]');
  };

  await check('18. Accounts: email links count only on the device that asked; signing up returns to where the learner was (S-01, S-05, P-22)', async () => {
    const { ctx, page } = await newPage(browser, { mock: true });
    const db = page.lucidMock;
    await onboard(page, { start: 'basics' });
    // A link built from someone else's tokens is ignored: no session, nothing uploaded.
    await page.goto('about:blank');
    await page.goto(`${BASE}#access_token=tok-attacker&refresh_token=r&expires_in=3600&token_type=bearer&type=signup`);
    await page.waitForSelector('[data-notice]');
    assert(page.url().includes('notice=link') && !page.url().includes('access_token'), `foreign link not refused: ${page.url()}`);
    assert(!(await page.evaluate(() => localStorage.getItem('lucid-session'))), 'a foreign session was stored');
    await sleep(300);
    assert(db.pushes.length === 0, 'data was uploaded after a foreign link');
    // Sign up from a scenario's roleplay tab; the confirmation link, opened in this browser, brings the learner back there.
    db.confirm = true;
    await page.goto(`${BASE}#/real-life`);
    await page.waitForSelector('.lesson-row');
    await page.click('.lesson-row');
    await page.click('[data-tab="roleplay"]');
    const scenario = new URL(page.url()).hash.split('?')[0];
    await page.click('a[href^="#/account?mode=signin"]');
    await page.waitForSelector('[data-auth]');
    await page.click('[data-mode="signup"]');
    await page.fill('#em', db.user.email); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.waitForSelector('[data-auth] .banner');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/account-signup-sent.png`, fullPage: true });
    await page.goto('about:blank');
    await page.goto(`${BASE}#access_token=tok-${db.user.id}&refresh_token=r&expires_in=3600&token_type=bearer&type=signup`);
    await page.waitForFunction((h) => location.hash.startsWith(h), scenario);
    assert(page.url().includes('tab=roleplay'), `not returned to the roleplay tab: ${page.url()}`);
    await page.waitForSelector('[data-tab="roleplay"][aria-pressed="true"]', { timeout: 4000 }).catch(() => { throw new Error('roleplay tab not shown'); });
    assert(await waitFor(() => db.pushes.length > 0), 'device data did not sync to the confirmed account');
    assert(db.pushes.every((p) => p.token === `tok-${db.user.id}`), 'a push used another token');
    assert(db.profile?.birth_year, 'no server profile after an email-link sign-in (S-05)');
    await ctx.close();
  });

  await check('19. Accounts: on a shared browser, a second learner must remove the first one\'s data or cancel; nothing is merged (S-06)', async () => {
    const { ctx, page } = await newPage(browser, { mock: true });
    const db = page.lucidMock;
    await onboard(page, { start: 'basics' });
    await signInWith(page, db.user.email);
    await page.waitForSelector('[data-owner-dialog="unowned"]');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/account-move-dialog.png`, fullPage: true });
    await page.click('dialog [value="move"]');
    await page.waitForFunction(() => !location.hash.startsWith('#/account'));
    const first = db.user;
    assert(await waitFor(() => db.pushes.length > 0), 'first learner did not sync');
    await page.goto(`${BASE}#/settings`);
    await page.click('[data-signout]');
    await page.waitForSelector('a[href="#/account?mode=signin"]');
    db.user = { id: '22222222-2222-4222-8222-222222222222', email: 'second@example.com' };
    db.profile = null;
    const before = db.pushes.length;
    await signInWith(page, db.user.email);
    await page.waitForSelector('[data-owner-dialog="other"]');
    assert((await page.textContent('dialog')).includes('second@example.com'), 'the dialog does not name the account');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/account-other-dialog.png`, fullPage: true });
    await page.click('dialog [value="cancel"]');
    await page.waitForSelector('[data-notice]');
    assert(!(await page.evaluate(() => localStorage.getItem('lucid-session'))), 'still signed in after cancelling');
    assert((await store(page, 'profile'))[0]?.name === 'Test', 'the first learner\'s data changed after cancelling');
    await signInWith(page, db.user.email);
    await page.waitForSelector('[data-owner-dialog="other"]');
    await page.click('dialog [value="clear"]');
    await page.waitForFunction(() => /^#\/(start|welcome)/.test(location.hash));
    assert((await store(page, 'profile')).length === 0 && (await store(page, 'attempts')).length === 0, 'the first learner\'s data is still on the device');
    await sleep(300);
    assert(db.pushes.length === before, 'something was pushed into the second account');
    assert(db.profile === null, 'the first learner\'s profile was written to the second account');
    assert((await page.evaluate(() => localStorage.getItem('lucid-owner'))) === db.user.id && first.id !== db.user.id, 'owner not recorded');
    await ctx.close();
  });

  await check('20. Accounts: password change needs the current password, a deleted tutor chat leaves no content on the server, sign-out can remove the device data (S-12, S-18, S-04)', async () => {
    const { ctx, page } = await newPage(browser, { mock: true });
    const db = page.lucidMock;
    await onboard(page, { start: 'basics' });
    // Signing in from the tutor's prompt comes back to the tutor (P-22).
    await page.goto(`${BASE}#/tutor?mode=grammar`);
    await page.click('a[href="#/account?mode=signin"]');
    await page.fill('#em', db.user.email); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.click('[data-owner-dialog="unowned"] [value="move"]');
    await page.waitForFunction(() => location.hash === '#/tutor?mode=grammar', null, { timeout: 4000 }).catch(() => { throw new Error('not returned to the tutor after signing in'); });
    await page.evaluate(() => window.lucid.store.update('settings', 'me', { ai_consent: true }));
    // Tutor: delete a conversation; the server keeps only an empty tombstone.
    await page.goto(`${BASE}#/today`);
    await page.goto(`${BASE}#/tutor?mode=grammar`);
    await page.fill('#tin', 'My secret question about the present perfect');
    await page.click('[data-send] button[type=submit]');
    await page.waitForFunction(() => document.querySelector('#log')?.textContent.includes('Present perfect'));
    const chatId = (await store(page, 'chats'))[0].id;
    await page.click('[data-delete]');
    await page.click('dialog [value="yes"]');
    await page.waitForFunction(() => window.lucid.store.all('chats').length === 0, null, { timeout: 4000 }).catch(() => { throw new Error('chat still listed after delete'); });
    assert(!(await page.textContent('#log')).includes('secret question'), 'chat still on screen after delete');
    await page.goto(`${BASE}#/settings`);
    await page.click('[data-sync]');
    assert(await waitFor(() => db.records.get(`chats/${chatId}`)?.deleted === true), 'deletion not synced');
    assert(JSON.stringify(db.records.get(`chats/${chatId}`).data) === '{}', 'the server still holds the chat text');
    // Password: the current one is required, even on a hand-typed ?reset=1.
    await page.click('[data-pw]');
    await page.fill('#cp', 'wrong password'); await page.fill('#np', 'new password 22');
    await page.click('[data-newpass] button[type=submit]');
    await page.waitForSelector('[data-newpass] .error-text');
    assert(db.passwordChanged === undefined, 'password changed with a wrong current password');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-password.png`, fullPage: true });
    await page.fill('#cp', 'correct horse 1'); await page.fill('#np', 'new password 22');
    await page.click('[data-newpass] button[type=submit]');
    assert(await waitFor(() => db.passwordChanged === 'new password 22'), 'password not changed with the right current password');
    await page.goto(`${BASE}#/settings?reset=1`);
    await page.waitForSelector('[data-newpass]');
    assert(await page.$('#cp'), 'a hand-typed ?reset=1 skips the current password');
    // Sign out and remove: Lucid's data goes, another app's stays.
    await page.evaluate(() => { localStorage.setItem('hgos-session', 'crm'); window.beforeErase = true; });
    await page.click('[data-signout-erase]');
    await page.click('dialog [value="yes"]');
    let reloaded = false; // the page reloads after erasing; poll across the navigation
    for (let i = 0; i < 80 && !reloaded; i++) { await sleep(100); reloaded = await page.evaluate(() => !window.beforeErase && location.hash === '#/welcome' && Boolean(window.lucid)).catch(() => false); }
    assert(reloaded, 'did not return to welcome after sign-out and remove');
    const left = await page.evaluate(() => ({ keys: Object.keys(localStorage), profiles: window.lucid.store.all('profile').length }));
    assert(left.profiles === 0, 'profile still on the device');
    assert(left.keys.includes('hgos-session') && !left.keys.some((k) => k.startsWith('lucid-')), `wrong keys after sign-out and remove: ${left.keys}`);
    await ctx.close();
  });

  // ---------- learner logic: placement, Today, path and progress (persona findings P-xx) ----------
  await check('L1. Placement: leaving keeps the answers; Today offers to continue or start again, never a silent Pre-A1 start (P-37)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'conversations' });
    await page.click('[data-begin]');
    for (let i = 0; i < 3; i++) { await page.click('#exroot .option'); await page.click('[data-answer]'); await page.waitForTimeout(60); }
    await page.click('.player-top a[href="#/today"]');
    await page.waitForSelector('a[href="#/placement?resume=1"]');
    assert(!(await page.$('#view a[href^="#/lesson/"]')), 'Today links to a lesson before the placement is done');
    assert(await page.$('a[href="#/placement?restart=1"]'), 'no way to start the test again');
    await page.click('a[href="#/placement?resume=1"]');
    await page.waitForSelector('#exroot');
    assert((await page.textContent('.player-top .num')).trim() === '4', 'the test did not resume at question 4');
    await ctx.close();
  });

  await check('L2. Placement: a perfect run is reported cautiously; untested skills say "not yet assessed" and no skill shows C1/C2 (P-49, P-76, P-25, P-50, P-18)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    const r = await page.evaluate(async () => {
      const L = await import('./js/core/learner.js');
      const P = await import('./js/core/placement.js');
      const bank = await (await fetch('content/placement.json')).json();
      const t = P.createPlacement(bank.items, { start: 'B2' });
      let item;
      while ((item = t.next())) t.answer(item, { correct: true });
      const res = t.result();
      await L.applyPlacement(res);
      return res;
    });
    assert(r.demonstrated === 'C2' && r.top_band, `unexpected result ${r.demonstrated}`);
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.skills');
    const levels = await page.$$eval('.skills .skill-level', (x) => x.map((e) => e.textContent.trim()));
    assert(!levels.some((l) => /C1|C2/.test(l)), `a skill shows C1/C2 from placement alone: ${levels}`);
    assert(await page.$$eval('.skills .skill-level.none', (x) => x.length) >= 2, 'speaking and writing are not marked as not assessed');
    await ctx.close();
  });

  await check('L3. Path: after "Start from B2" a finished lesson is recorded, Today moves on, Progress counts it; revising a placed-out lesson keeps the level (P-48, P-70, P-67)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const P = await import('./js/core/placement.js'); await L.applyPlacement(P.selfReportResult('C1')); });
    await page.goto(`${BASE}#/path/B2`);
    await page.click('[data-move="B2"]');
    await page.click('dialog [value="yes"]');
    await page.waitForTimeout(300);
    await page.goto(`${BASE}#/lesson/b2-01`);
    await page.waitForSelector('.lesson-intro');
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.recordAttempt({ source: 'lesson', lesson: 'b2-01', skill: 'grammar', level: 'B2', correct: true }); L.finishLesson(await (await fetch('content/lessons/b2-01.json')).json(), { score: 0.8, passed: true }); });
    await page.goto(`${BASE}#/lesson/b1-03`); // placed out: opened to revise
    await page.waitForSelector('.lesson-intro');
    await page.waitForTimeout(400);
    await page.reload();
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan a[href^="#/lesson/"]');
    const href = await page.getAttribute('.plan a[href^="#/lesson/"]', 'href');
    assert(href.startsWith('#/lesson/b2-02'), `Today's lesson is still ${href}`);
    assert(await page.$('.start-bar .tag.ok'), 'no "lesson completed today" tag after a finished lesson');
    const rec = await page.evaluate(() => window.lucid.store.get('progress', 'b2-01', { includeDeleted: true }));
    assert(rec.status === 'completed' && !rec._deleted, `b2-01 stored as ${JSON.stringify(rec)}`);
    await page.goto(`${BASE}#/progress`);
    await page.waitForSelector('.stat');
    const completed = await page.$$eval('.stat', (x) => x.map((s) => s.textContent));
    assert(completed.some((t) => /^\s*1\s*(שיעורים שהושלמו|Lessons completed)/.test(t)), `Progress does not count the lesson: ${completed.join(' | ')}`);
    // A finished scenario is not a lesson.
    await page.evaluate(() => window.lucid.store.put('progress', { id: 'rl:rl-hotel-checkin-basics', status: 'completed', completed_at: new Date().toISOString() }));
    const lessonsToday = await page.evaluate(async () => (await import('./js/core/adaptive.js')).periodReport({ progress: window.lucid.store.all('progress'), now: Date.now() }).lessons_completed);
    assert(lessonsToday === 1, `a scenario counted as a lesson (${lessonsToday})`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/progress-after-level-move.png`, fullPage: true });
    await ctx.close();
  });

  await check('L4. Today and the path never route to a lesson that has no file; unwritten rows say so in words (P-14, P-26, P-61)', async () => {
    // Simulate a lesson that is still being written: the manifest leaves it out and its file is missing.
    const curriculum = JSON.parse(readFileSync(join(repo, 'lucid/content/curriculum.json'), 'utf8'));
    const order = curriculum.levels.flatMap((l) => l.lessons);
    const gap = order.findIndex((l) => l.id === 'b1-05');
    const missing = order[gap];
    const expected = order[gap + 1];
    const { ctx, page } = await newPage(browser);
    await page.route(/content\/manifest\.json$/, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...manifest, lessons: manifest.lessons.filter((id) => id !== missing.id) }) }));
    await page.route(new RegExp(`content/lessons/${missing.id}\\.json$`), (route) => route.fulfill({ status: 404, body: '' }));
    await onboard(page, { start: 'zero' });
    await page.evaluate((ids) => { for (const id of ids) window.lucid.store.put('progress', { id, status: 'completed', completed_at: '2026-01-01T00:00:00Z' }); }, order.slice(0, gap).map((l) => l.id));
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    const links = await page.$$eval('#view a[href^="#/lesson/"]', (x) => x.map((a) => a.getAttribute('href').split('/')[2].split('?')[0]));
    assert(!links.includes(missing.id), `Today links to the unwritten lesson: ${links}`);
    assert(links.includes(expected.id), `Today does not offer ${expected.id}: ${links}`);
    assert((await page.textContent('.plan')).includes(missing.title_he), 'Today does not say which lesson is still being written');
    await page.goto(`${BASE}#/path/${missing.level}`);
    await page.waitForSelector('.lesson-list');
    const pathLinks = await page.$$eval('.lesson-list a[href^="#/lesson/"]', (x) => x.map((a) => a.getAttribute('href').split('/')[2]));
    assert(!pathLinks.includes(missing.id), 'the path links to the unwritten lesson');
    const unwritten = await page.$$eval('.lesson-row.unwritten', (x) => x.map((r) => r.textContent));
    assert(unwritten.length === 1 && /בהכנה|In preparation/.test(unwritten[0]), 'the unwritten row is not labelled in words');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/path-unwritten.png`, fullPage: true });
    await ctx.close();
  });

  await check('L5. Today: the plan shows the real lesson length and splits a long lesson; one "Continue" way back in (P-07, P-38, P-43)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const P = await import('./js/core/placement.js'); await L.applyPlacement(P.selfReportResult('A2')); });
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', daily_minutes: 10 }));
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    const learn = await page.textContent('.plan li:has(a[href^="#/lesson/a2-01"])');
    assert(/25|22/.test(learn) && /(עד תרגיל|up to exercise)/.test(learn), `no real length or part in the plan: ${learn}`);
    const total = Number((await page.textContent('#plan-h + span')).match(/\d+/)[0]);
    assert(total <= 12, `a 10-minute plan lasts ${total} min`);
    await page.goto(`${BASE}#/lesson/a2-01`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-skip-learn]');
    for (let i = 0; i < 3; i++) {
      await answerCurrent(page);
      const c = await page.$('[data-check]:not([disabled])'); if (c) await c.click(); else await page.click('[data-dontknow]');
      await page.waitForSelector('[data-next]'); await page.click('[data-next]');
    }
    await page.click('[data-exit]');
    await page.waitForSelector('.start-bar a');
    const cta = await page.getAttribute('.start-bar a', 'href');
    assert(cta === '#/lesson/a2-01?resume=1', `the main button does not resume: ${cta}`);
    assert(/להמשיך|Continue/.test(await page.textContent('.start-bar a')), 'the main button does not say Continue');
    const ways = await page.$$eval('#view a[href^="#/lesson/a2-01"]', (x) => [...new Set(x.map((a) => a.getAttribute('href')))]);
    assert(ways.length === 1, `more than one way into the lesson: ${ways}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/today-continue.png`, fullPage: true });
    await ctx.close();
  });

  await check('L6. Today: a travel goal names a real-life scenario; placed learners can add placed-out words to review (P-56, P-28, P-82)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' }); // the onboarding helper picks the travel goal and 20 minutes
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const P = await import('./js/core/placement.js'); await L.applyPlacement(P.selfReportResult('B1')); });
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    assert(await page.$('.plan a[href^="#/scenario/rl-airport"]'), 'the travel goal did not pick an airport scenario');
    await page.click('[data-import]');
    await page.waitForTimeout(800);
    const cards = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); return { all: L.allCards().length, due: L.due().length, per: L.settings().new_per_day }; });
    assert(cards.all > 20, `only ${cards.all} words added`);
    assert(cards.due <= cards.per, `${cards.due} new words due at once`);
    await ctx.close();
  });

  await check('L7. Progress: the exercises chart draws bars and minutes include the open session (P-62, P-34)', async () => {
    const { ctx, page } = await newPage(browser);
    await page.clock.install();
    await onboard(page, { start: 'zero' });
    await page.evaluate(() => { const now = Date.now(); for (let i = 0; i < 12; i++) window.lucid.store.put('attempts', { id: `b${i}`, at: new Date(now - (i % 2) * 86400000).toISOString(), source: 'lesson', topic: 'alphabet', skill: 'vocabulary', level: 'PreA1', correct: true, score: 1 }); });
    await page.clock.fastForward('04:00');
    await page.goto(`${BASE}#/progress`);
    await page.waitForSelector('.bars .bar');
    const tallest = await page.$$eval('.bars .bar', (x) => Math.max(...x.map((b) => b.getBoundingClientRect().height)));
    assert(tallest > 40, `bars do not draw (tallest ${tallest}px)`);
    const minutes = await page.$$eval('.stat', (x) => x.map((s) => s.textContent).find((t) => /דקות פעילות|Active minutes/.test(t)));
    assert(Number(minutes.match(/\d+/)[0]) >= 3, `active minutes ignore the open session: ${minutes}`);
    await ctx.close();
  });

  // ---------- real life, bidi and privacy (persona panel round 1) ----------
  await check('RL1. Real life and Conversations: a start strip for the level and goals, level guidance, topic and level filters, topics folded to two, no placeholder icons (P-46, P-64)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { goals: ['travel'] });
    await page.goto(`${BASE}#/real-life`);
    await page.waitForSelector('.start-here');
    const start = await page.$$eval('.start-here .tag.level', (x) => x.map((t) => t.textContent.trim()));
    assert(start.length === 3 && start.every((l) => ['A1', 'A2'].includes(l)), `start strip is not at the learner's level: ${start}`);
    assert((await page.textContent('.level-guide')).includes('A2'), 'no level guidance');
    const circle = await page.evaluate(async () => (await import('./js/ui/icons.js')).iconSvg('circle'));
    const heads = await page.$$eval('.hub-head', (x) => x.map((h) => ({ id: h.id, svg: h.querySelector('svg').outerHTML })));
    assert(heads.length >= 7 && heads.every((h) => h.svg !== circle), `a topic heading shows the placeholder icon: ${heads.filter((h) => h.svg === circle).map((h) => h.id)}`);
    assert(heads.findIndex((h) => h.id === 'hub-emergency') < heads.findIndex((h) => h.id === 'hub-restaurant'), 'emergencies are listed last');
    const folded = await page.$$eval('section[aria-labelledby^="hub-"]', (x) => x.map((sec) => sec.querySelectorAll('.lesson-row').length));
    assert(folded.every((n) => n <= 2), `topics are not folded to two: ${folded}`);
    await page.click('[data-unfold="airport"]');
    assert((await page.$$('section[aria-labelledby="hub-airport"] .lesson-row')).length > 2 && await page.getAttribute('[data-unfold="airport"]', 'aria-expanded') === 'true', 'Show all does not unfold the topic');
    await page.click('[data-scope="mine"]');
    assert(!(await page.$('.hub-filters ~ .stack-lg .fit-hard')), 'the level filter keeps scenarios two levels up');
    await page.click('[data-m="emergency"]');
    assert((await page.$$('section[aria-labelledby^="hub-"]')).length === 1, 'the topic filter shows other topics');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/real-life-390.png` });
    await page.goto(`${BASE}#/conversations`);
    await page.waitForSelector('.hub-filters');
    assert(await page.$('.page-head a[href="#/real-life"]') && await page.$('.level-guide'), 'Conversations is not grouped with Real life or has no level guidance');
    assert((await page.$$eval('section[aria-labelledby^="hub-"]', (x) => x.map((sec) => sec.querySelectorAll('.lesson-row').length))).every((n) => n <= 2), 'Conversations topics are not folded');
    await ctx.close();
  });

  await check('RL2. Scenario practice on a phone: the explanation comes into view, each other reply and its feedback are separate LTR/RTL lines, the own-words check is a suggestion, the end shows a summary and the next scenario (P-55, P-60, P-65, P-66)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.goto(`${BASE}#/scenario/rl-social-party-small-talk?tab=practise`);
    await page.waitForSelector('[data-opt]');
    const poor = await page.$$eval('[data-opt]', (bs) => bs.findIndex((b) => /Why do you want to know/.test(b.textContent)));
    await page.click(`[data-opt="${poor}"]`);
    await page.waitForSelector('[data-explain]');
    await page.waitForTimeout(200);
    const seen = await page.evaluate(() => { const e = document.querySelector('[data-explain]'); const r = e.getBoundingClientRect(); return { focused: document.activeElement === e, top: r.top, h: innerHeight }; });
    assert(seen.focused && seen.top >= 0 && seen.top < seen.h * 0.6, `the explanation is not brought into view: ${JSON.stringify(seen)}`);
    const alts = await page.$$eval('.alt-list > li', (x) => x.map((li) => ({ q: li.querySelector('.alt-quote')?.getAttribute('dir'), qd: getComputedStyle(li.querySelector('.alt-quote')).display, fb: Boolean(li.querySelector('.bi')) })));
    assert(alts.length === 2 && alts.every((a) => a.q === 'ltr' && a.qd === 'block' && a.fb), `other replies are not quote and feedback on their own lines: ${JSON.stringify(alts)}`);
    await page.fill('[data-own]', 'Hi, I work with Dana on the product team. How do you know her?');
    await page.click('[data-own-check]');
    const own = await page.textContent('.panel.flat');
    assert(/שאלה בחזרה|question back/.test(own) && /מחפשת רק מילות מפתח|only looks for key words/.test(own) && !/נסו להשתמש|Try using/.test(own), `the own-words check reads as a judgement: ${own}`);
    for (let i = 0; i < 8 && await page.$('[data-next-turn], [data-opt]:not([disabled])'); i++) {
      if (!(await page.$('[data-next-turn]'))) await page.click('[data-opt]:not([disabled])');
      await page.click('[data-next-turn]');
    }
    await page.waitForSelector('[data-done-head]');
    const done = await page.textContent('#view');
    assert(/מתוך 5|out of 5/.test(done), `no summary at the end: ${done.slice(-300)}`);
    assert(!(await page.$('[data-tab="roleplay"].key.enter')), 'AI roleplay is the main action although AI is not available');
    const next = await page.getAttribute('a.key.enter[href^="#/scenario/"]', 'href');
    assert(next && !next.includes('rl-social-party-small-talk'), `no next scenario as the main action: ${next}`);
    assert((await store(page, 'progress')).some((x) => x.id === 'rl:rl-social-party-small-talk' && x.status === 'completed'), 'practice not recorded');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/scenario-done-390.png` });
    await ctx.close();
  });

  await check('RL3. AI roleplay: the correction setting and Hebrew tips are sent, help on request, Hebrew hints isolated, the report leads with the outcome and strengths and opens at its heading (P-16, P-17, P-19, P-21)', async () => {
    const { ctx, page } = await newPage(browser, { mock: true });
    const db = page.lucidMock;
    await learnerAt(page, 'B1');
    await signInWith(page, db.user.email);
    await page.click('[data-owner-dialog="unowned"] [value="move"]').catch(() => {});
    await page.waitForFunction(() => !location.hash.startsWith('#/account'));
    await page.waitForTimeout(400); // let the sign-in finish its first sync before the settings change
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true, ai_consent_at: new Date().toISOString(), corrections: 'light' }));
    await page.waitForTimeout(200);
    await page.goto(`${BASE}#/scenario/rl-hotel-checkin-basics?tab=roleplay`);
    await page.waitForSelector('[data-start-rp]');
    assert(/רק מה שחוסם הבנה|Only what blocks meaning/.test(await page.textContent('#view')), 'the roleplay does not say which correction setting applies');
    assert(await page.isChecked('[data-tips]'), 'Hebrew tips are off for an A1 scene because the course level is B1');
    await page.click('[data-start-rp]');
    await page.fill('#rpin', 'um');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForSelector('.hint-box bdi');
    let body = db.aiBodies.at(-1);
    assert(body.corrections === 'light' && ['full', 'partial'].includes(body.hebrew_support), `roleplay request: ${JSON.stringify({ c: body.corrections, h: body.hebrew_support })}`);
    const hint = await page.evaluate(() => { const b = document.querySelector('.hint-box bdi'); return { iso: b.textContent, after: b.nextSibling?.textContent }; });
    assert(hint.iso === 'K-O-H-E-N' && hint.after === '.', `Hebrew hint not isolated: ${JSON.stringify(hint)}`);
    await page.uncheck('[data-tips]');
    await page.fill('#rpin', 'My name is Kohen.');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForFunction((n) => document.querySelectorAll('#rplog .msg.me').length === n, 2);
    await page.waitForFunction(() => !document.querySelector('#rplog .spinner'));
    body = db.aiBodies.at(-1);
    assert(!['full', 'partial'].includes(body.hebrew_support), `tips off still asks for Hebrew hints: ${body.hebrew_support}`);
    // Help on request: the goal and the scene's phrases, ready to copy into the reply.
    await page.click('button[data-stuck]');
    await page.waitForSelector('[data-help] [data-use-phrase]');
    const phrase = await page.textContent('[data-help] [data-use-phrase="0"]');
    await page.click('[data-help] [data-use-phrase="0"]');
    assert((await page.inputValue('#rpin')) === phrase.trim(), 'a help phrase does not go into the reply box');
    assert((await store(page, 'events')).some((e) => e.type === 'roleplay-help'), 'help use not logged');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/roleplay-help-390.png`, fullPage: true });
    await page.click('[data-end-rp]');
    await page.waitForSelector('[data-report-head]');
    await page.waitForTimeout(300);
    const head = await page.evaluate(() => { const h = document.querySelector('[data-report-head]'); const r = h.getBoundingClientRect(); return { focused: document.activeElement === h, top: r.top, h: innerHeight }; });
    assert(head.focused && head.top >= 0 && head.top < head.h, `the report does not open at its heading: ${JSON.stringify(head)}`);
    const report = await page.textContent('#view');
    assert(/מה עבד טוב|What worked/.test(report) && report.includes('Could I check in, please?'), 'strengths are not shown');
    assert(report.indexOf('Could I check in, please?') < report.search(/ניסוחים טבעיים יותר|More natural ways/), 'strengths do not come before the corrections');
    assert(!(await page.$eval('details.panel', (d) => d.open)), 'scores are not folded');
    assert(db.aiBodies.at(-1).task === 'roleplay_feedback' && db.aiBodies.at(-1).corrections === 'light', 'feedback request without the correction setting');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/roleplay-report-390.png` });
    await page.goto(`${BASE}#/conversations`);
    await page.waitForSelector('.hub-filters');
    const recent = await page.textContent('#view');
    assert(/המטרה הושגה|Goal reached/.test(recent) && !/\d+\/100/.test(recent), 'recent conversations lead with a score');
    await ctx.close();
  });

  await check('RL4. Expressions sort by level for beginners and search word starts; the Reading centre opens at the learner\'s level (P-68, P-35)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.goto(`${BASE}#/expressions`);
    await page.waitForSelector('.entry');
    assert(await page.getAttribute('[data-sort="level"]', 'aria-pressed') === 'true', 'not sorted by level for an A2 learner');
    const levels = await page.$$eval('.entry .tag.level', (x) => x.map((t) => t.textContent.trim()));
    assert(levels[0] === 'A2' && levels.join() === [...levels].sort().join(), `not in level order: ${levels.slice(0, 8)}`);
    await page.fill('#xp-q', 'mate');
    assert(!/Ballpark/i.test(await page.textContent('#xp-list')), '"mate" matches inside "estimate"');
    await page.fill('#xp-q', '');
    await page.click('[data-scope="mine"]');
    assert(!(await page.$$eval('.entry .tag.level', (x) => x.map((t) => t.textContent.trim()))).includes('B2'), 'the level filter keeps B2 expressions for an A2 learner');
    await page.click('[data-sort="az"]');
    const terms = await page.$$eval('.entry .entry-word', (x) => x.map((t) => t.textContent.trim().toLowerCase()));
    assert(terms.join('|') === [...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).join('|'), 'A–Z sort does not sort');
    await ctx.close();
    const r = await newPage(browser);
    await learnerAt(r.page, 'B1');
    await r.page.goto(`${BASE}#/reading`);
    await r.page.waitForSelector('section[aria-labelledby^="rd-"]');
    const first = await r.page.getAttribute('section[aria-labelledby^="rd-"]', 'aria-labelledby');
    assert(first === 'rd-B1', `the reading list does not start at the learner's level: ${first}`);
    assert(await r.page.$('.easier-head'), 'easier texts are not marked');
    await r.ctx.close();
  });

  await check('RL5. Mixed Hebrew and English render in place: the Hebrew full stop at the Hebrew end, English punctuation with the English, no English "Hebrew" line (P-19, P-47, P-55, P-69)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const m = await page.evaluate(async () => {
      const { isolateLatin, legend } = await import('./js/core/i18n.js');
      const put = (s) => { const p = document.createElement('p'); p.dir = 'rtl'; p.lang = 'he'; p.style.cssText = 'font-size:20px;width:700px'; p.innerHTML = String(s); document.body.append(p); return p; };
      const charBox = (node, i) => { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); return r.getBoundingClientRect(); };
      // "תאייתו: K-O-H-E-N." — the full stop sits left of the English (the end of the Hebrew sentence).
      const a = put(isolateLatin('תאייתו: K-O-H-E-N.'));
      const dot = charBox(a.lastChild, a.lastChild.length - 1);
      // "...: Can I get a coffee? = 'אפשר קפה?'" — the question mark is the right end of the English.
      const b = put(isolateLatin('להזמין: Can I get a coffee? = \'אפשר קפה?\''));
      const t = b.querySelector('bdi').firstChild;
      const q = charBox(t, t.length - 1);
      const c = charBox(t, 0);
      // An English-only line in a Hebrew slot: "?" stays at the right end.
      const d = put(isolateLatin('Have you ever...?'));
      const dt = d.querySelector('bdi').firstChild;
      return { dotRight: dot.right, bdiLeft: a.querySelector('bdi').getBoundingClientRect().left, qLeft: q.left, cRight: c.right,
        qEnd: charBox(dt, dt.length - 1).left > charBox(dt, 0).left,
        legend: String(legend('Have you ever...?', 'Have you ever...?')).includes('l-he') };
    });
    assert(m.dotRight <= m.bdiLeft + 1, `the Hebrew full stop is not at the Hebrew end: ${JSON.stringify(m)}`);
    assert(m.qLeft > m.cRight && m.qEnd, `English punctuation moved: ${JSON.stringify(m)}`);
    assert(!m.legend, 'an English title is repeated as its "Hebrew" line');
    // Placeholders in English fields read right to left in the Hebrew UI until the learner types.
    await page.goto(`${BASE}#/scenario/rl-social-party-small-talk?tab=practise`);
    await page.click('[data-opt="0"]');
    const ph = await page.$eval('[data-own]', (i) => getComputedStyle(i).direction);
    await page.fill('[data-own]', 'Hello');
    const typed = await page.$eval('[data-own]', (i) => getComputedStyle(i).direction);
    assert(ph === 'rtl' && typed === 'ltr', `placeholder direction ${ph}, typed ${typed}`);
    await ctx.close();
  });

  await check('RL6. Privacy: the policy, onboarding and Profile say only what the code does (microphone, AI context, under-18s, contact placeholder) (P-04, P-05, P-11, S-08)', async () => {
    const policy = readFileSync(join(repo, 'lucid/privacy.html'), 'utf8');
    for (const must of ['Microphone and voice', 'מיקרופון וקול', 'Not sent', 'recurring mistake types', 'To be filled in before public launch', 'להשלמה לפני הפעלה ציבורית', 'refuses marketing consent']) assert(policy.includes(must), `privacy.html lacks "${must}"`);
    assert(!/strictest|מחמירות|none of this leaves the device/.test(policy), 'privacy.html still claims what the code does not do');
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    await page.selectOption('#ob-year', String(new Date().getFullYear() - 17));
    await page.click('button[type=submit]');
    await page.click('[data-goal="travel"]');
    await page.click('button[type=submit]');
    await page.click('[data-start="basics"]');
    await page.click('button[type=submit]');
    const step = await page.textContent('#ob-form');
    assert(/מיקרופון|microphone/.test(step) && /Anthropic/.test(step) && !/מחמירות|strictest/.test(step), `onboarding privacy step: ${step}`);
    await ctx.close();
    const p = await newPage(browser);
    await learnerAt(p.page, 'A1', { birthYear: new Date().getFullYear() - 17 });
    await p.page.goto(`${BASE}#/profile`);
    await p.page.waitForSelector('.page-head');
    const prof = await p.page.textContent('#view');
    assert(!/מחמירה|strictest/.test(prof) && /שיווק|marketing/.test(prof), 'Profile still claims stricter settings for under-18s');
    await p.ctx.close();
  });

  // ---------- player and speaking (persona panel round 1) ----------
  // A stand-in for the browser's speech recognition that "hears" window.__heard, so recognition paths run.
  const fakeRecognition = (ctx) => ctx.addInitScript(() => {
    window.__heard = 'my name is maya maya';
    class FakeRec { start() { setTimeout(() => { this.onresult?.({ results: [[{ transcript: window.__heard, confidence: 0.8 }]] }); this.onend?.(); }, 100); } stop() {} abort() {} }
    window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
  });
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
  const lessonJson = (id) => JSON.parse(readFileSync(join(repo, `lucid/content/lessons/${id}.json`), 'utf8'));

  await check('OF1. Offline: screens never opened before, review and saved lessons work without a connection (P-54)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    await onboard(page, { start: 'zero' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.goto(`${BASE}#/settings`);
    await page.click('[data-offline]');
    await page.waitForFunction(() => /75/.test(document.querySelector('[data-offline-status]')?.textContent || '') && !document.querySelector('[data-offline]').disabled, null, { timeout: 60000 });
    assert(/All 75|כל 75/.test(await page.textContent('[data-offline-status]')), `lessons not all saved: ${await page.textContent('[data-offline-status]')}`);
    await ctx.setOffline(true);
    for (const r of ['review', 'conversations', 'real-life', 'expressions', 'scenario/rl-airport-checkin-overweight', 'lesson/b1-03', 'writing', 'progress']) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForTimeout(500);
      const txt = await page.textContent('#view');
      assert(!/did not load|לא נטען|Something went wrong|משהו השתבש/.test(txt), `${r} failed offline: ${txt.slice(0, 120)}`);
    }
    await page.reload();
    await page.waitForSelector('#view');
    assert(!/did not load|לא נטען/.test(await page.textContent('#view')), 'reload failed offline');
    await ctx.close();
  });

  await check('PS1. Speaking in lessons is practice: what was recognised, no verdict or score, "Can\'t speak right now" skips with no retry, a microphone notice first (P-02, P-27, P-57, P-05)', async () => {
    const { ctx, page } = await newPage(browser);
    await fakeRecognition(ctx);
    await onboard(page, { start: 'zero' });
    // A recognition "mistake" saved by an older version must not show under "Worth watching".
    await page.evaluate(() => window.lucid.store.put('attempts', { id: 'old-speak', at: new Date(Date.now() - 86400000).toISOString(), source: 'lesson', lesson: 'pa1-01', exercise: 'e12', topic: 'alphabet', skill: 'speaking', level: 'PreA1', correct: false, score: 0.4, error_type: 'pron-w-v' }));
    await lessonAt(page, 'pa1-01', 'e11');
    assert(await page.$('[data-skip-speak]') && !(await page.$('[data-dontknow]')), 'no "Can\'t speak right now", or "I don\'t know" offered on a speaking item');
    assert(await page.$('#exroot [data-self="1"]') && await page.$('#exroot [data-self="0"]'), 'self-rating not offered where recognition exists');
    // The notice comes before the first use; "Not now" keeps the microphone off and the item usable.
    await page.click('#exroot [data-rec]');
    await page.waitForSelector('dialog[open]');
    const notice = await page.textContent('dialog[open]');
    assert(/הדפדפן|browser/.test(notice) && /לא מקליט ולא שומר|never records or keeps/.test(notice), `notice does not say who processes the voice and that nothing is kept: ${notice}`);
    await page.click('dialog[open] [value="no"]');
    await page.waitForSelector('#exroot .error-text');
    assert(!(await page.$('#exroot .recognised')), 'recognition ran after "Not now"');
    await page.click('#exroot [data-rec]');
    await page.waitForSelector('dialog[open]');
    await page.click('dialog[open] [value="yes"]');
    await page.waitForSelector('#exroot .recognised');
    assert((await page.textContent('#exroot .recognised')).includes('my name is maya maya'), 'what was recognised is not shown');
    assert(!/Not quite|לא בדיוק|Correct answer|התשובה הנכונה/.test(await page.textContent('.player')), 'a speaking item shows a verdict');
    await page.click('[data-check]:not([disabled])');
    await page.waitForFunction(() => document.querySelector('#exroot')?.textContent.includes('M-A-Y-A'));
    const a11 = (await store(page, 'attempts')).filter((a) => a.exercise === 'e11');
    assert(a11.length === 1 && a11[0].score === null && a11[0].error_type === null, `speaking attempt is scored: ${JSON.stringify(a11)}`);
    // Second use: no notice. Then skip without speaking.
    await page.click('#exroot [data-rec]');
    await page.waitForSelector('#exroot .recognised');
    assert(!(await page.$('dialog[open]')), 'the notice came back');
    await page.click('[data-skip-speak]');
    await page.waitForSelector('#exroot textarea');
    assert(!(await store(page, 'attempts')).some((a) => a.exercise === 'e12' && a.id !== 'old-speak'), 'skipping recorded an attempt');
    assert(!/לחזרה|to revisit/.test(await page.textContent('.step-count')), `a speaking item came back for a retry: ${await page.textContent('.step-count')}`);
    await answerCurrent(page);
    await page.click('[data-check]:not([disabled])');
    await page.click('[data-next]');
    await page.waitForSelector('.player h1');
    const review = await page.textContent('.player-body');
    assert(/השיעור הושלם|Lesson complete/.test(review) && /100%/.test(review), `speaking changed the score: ${review.slice(0, 160)}`);
    assert(!/w and v|w ו-v/i.test(review), 'a recognition result produced a mistake type');
    assert(await page.evaluate(() => localStorage.getItem('lucid-mic-notice')) === '1', 'notice not remembered');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lesson-review-speaking.png`, fullPage: true });
    await ctx.close();
  });

  await check('PS2. Feedback on a phone: full-width verdict, Continue below, "Why?" folded, a wrong sort lists only its misplaced items; the counter keeps its total (P-03, P-39, P-59, P-06, P-42, P-12)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await lessonAt(page, 'b2-01', 'e1');
    const total = lessonJson('b2-01').exercises.length;
    assert((await page.textContent('.step-count')).trim() === `1 מתוך ${total}`, `counter: ${await page.textContent('.step-count')}`);
    const wrong = lessonJson('b2-01').exercises[0].options.findIndex((_, i) => i !== lessonJson('b2-01').exercises[0].answer);
    await page.click(`#exroot [data-opt="${wrong}"]`);
    await page.click('[data-check]');
    await page.waitForSelector('[data-next]');
    const box = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { inner: r('#pfoot .inner').width, verdict: r('#pfoot .verdict').width, vBottom: r('#pfoot .verdict').bottom, next: r('[data-next]'), why: document.querySelector('#pfoot details.why')?.open };
    });
    assert(box.verdict >= box.inner - 2, `verdict is squeezed (${box.verdict} of ${box.inner}px)`);
    assert(box.next.top >= box.vBottom - 1 && box.next.width >= box.inner - 2, 'Continue is not a full-width button below the verdict');
    assert(box.why === false, 'the explanation is not folded behind "Why?"');
    await page.click('[data-next]');
    await page.waitForSelector('#exroot .cat-bin');
    assert((await page.textContent('.step-count')).trim() === `2 מתוך ${total} · 1 לחזרה`, `total moved or retries not counted apart: ${await page.textContent('.step-count')}`);
    await page.evaluate(() => { const root = document.querySelector('#exroot'); for (let i = 0; i < 20; i++) { const it = root.querySelector('[data-item]'); if (!it) break; it.click(); root.querySelector('[data-bin]').click(); } });
    await page.click('[data-check]');
    await page.waitForSelector('[data-next]');
    const ex2 = lessonJson('b2-01').exercises[1];
    const firstBin = ex2.categories[0];
    const listed = await page.$$eval('#pfoot .fix-list li', (x) => x.map((li) => li.textContent));
    assert(listed.length && !listed.some((t) => t.startsWith(`${firstBin}:`)), `items already in the right place are listed: ${listed}`);
    assert(!(await page.textContent('#pfoot')).includes('→'), 'the answer key is one run-on line');
    assert((await page.$$('#exroot .chip.is-wrong')).length && (await page.$$('#exroot .chip.is-right')).length, 'items are not marked in place');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/verdict-sort-390.png` });
    await ctx.close();
  });

  await check('PS3. "Nearly there" offers only the missed exercises and fixing them completes the lesson; every stage opens at its top (P-41, P-44)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    // Learn opens at the top with focus on its heading.
    await page.goto(`${BASE}#/lesson/a2-01?t=1`);
    await page.waitForSelector('.lesson-intro');
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    assert(await page.evaluate(() => window.scrollY === 0 && document.activeElement?.tagName === 'H1'), 'the learn stage does not open at its top');
    const lesson = lessonJson('a2-01');
    const missedIds = ['e2', 'e4', 'e5', 'e6', 'e7'];
    const scored = lesson.exercises.filter((e) => !['speak', 'write'].includes(e.type)).map((e) => e.id);
    await lessonAt(page, 'a2-01', null, Object.fromEntries(scored.map((x) => [x, missedIds.includes(x) ? 0 : 1])));
    assert(/כמעט שם|Nearly there/.test(await page.textContent('.player h1')), 'not "Nearly there"');
    const href = await page.getAttribute('[data-retry]', 'href');
    assert(href.includes('stage=missed') && /5/.test(await page.textContent('[data-retry]')), `the main action is not "practise the 5 I missed": ${href}`);
    // P-06: the path says "in progress" until the lesson is passed, not a failing percentage.
    await page.goto(`${BASE}#/path/A2`);
    await page.waitForSelector('.lesson-list');
    const row = await page.textContent('a.lesson-row[href="#/lesson/a2-01"]');
    assert(/בתהליך|In progress/.test(row) && !/%/.test(row), `the path shows a failing score: ${row}`);
    await page.goto(`${BASE}${href}`);
    await page.waitForSelector('#exroot');
    for (const [n, id] of missedIds.entries()) {
      assert((await page.textContent('.step-count')).trim() === `${n + 1} מתוך ${missedIds.length}`, `missed-only counter: ${await page.textContent('.step-count')}`);
      const ex = lesson.exercises.find((e) => e.id === id);
      if (ex.type === 'gap') await page.evaluate((answers) => document.querySelectorAll('#exroot .gap-input').forEach((g, i) => { g.value = answers[i][0]; g.dispatchEvent(new Event('input', { bubbles: true })); }), ex.answers);
      else await page.click(`#exroot [data-opt="${ex.answer}"]`);
      await page.click('[data-check]:not([disabled])');
      await page.waitForSelector('[data-next]');
      await page.click('[data-next]');
    }
    await page.waitForSelector('.player h1');
    assert(/השיעור הושלם|Lesson complete/.test(await page.textContent('.player h1')), 'fixing the misses did not complete the lesson');
    assert((await store(page, 'progress')).find((p) => p.id === 'a2-01')?.status === 'completed', 'progress not completed');
    await ctx.close();
  });

  await check('PS4. Open rewrites from B1: the key is "one model answer" and "My answer is also correct" counts it, logged as self-judged (P-77)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1440, height: 900 } });
    await onboard(page, { start: 'zero' });
    await lessonAt(page, 'c1-03', 'e8');
    await page.fill('#exroot textarea, #exroot input', 'The study suggests that the new app could improve sleep quality.');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-self-judge]');
    const v = await page.textContent('#pfoot');
    assert(/One model answer|תשובה אחת לדוגמה/.test(v) && !/Correct answer:|התשובה הנכונה:/.test(v), `the key is called the correct answer: ${v}`);
    await page.click('[data-self-judge]');
    await page.waitForFunction(() => /Counted as correct|נספר כנכון/.test(document.querySelector('#pfoot')?.textContent || ''));
    const at = (await store(page, 'attempts')).filter((a) => a.exercise === 'e8' && a.lesson === 'c1-03');
    assert(at.length === 1 && at[0].correct && at[0].self_judged && at[0].score === 1, `not saved as a self-judged right answer: ${JSON.stringify(at)}`);
    assert((await store(page, 'events')).some((e) => e.type === 'self-judged' && e.exercise === 'e8'), 'no self-judged event for content review');
    assert(!/לחזרה|to revisit/.test(await page.textContent('.step-count')), 'a self-judged answer still comes back as a retry');
    await ctx.close();
  });

  await check('PS5. A lesson that is still being written says so and links to the next ready lesson, never "try reloading" (P-14, P-26, P-61)', async () => {
    const { ctx, page } = await newPage(browser);
    await page.route(/content\/manifest\.json$/, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...manifest, lessons: manifest.lessons.filter((id) => id !== 'b1-05') }) }));
    await page.route(/content\/lessons\/b1-05\.json$/, (route) => route.fulfill({ status: 404, body: '' }));
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/lesson/b1-05`);
    await page.waitForSelector('.missing-lesson');
    const txt = await page.textContent('.missing-lesson');
    assert(/עוד בכתיבה|still being written/.test(txt) && !/רענ|reload/i.test(txt), `unclear dead end: ${txt}`);
    assert(await page.getAttribute('[data-alt-lesson]', 'href') === '#/lesson/b1-06', 'no link to the next ready lesson');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lesson-unwritten.png` });
    await ctx.close();
  });

  await check('PS6. Speaking lab, tutor, review and letters: shadowing has no verdict, tabs name example words, the tutor says it cannot hear, "count it" only for typed answers, letter tiles play (P-15, P-23, P-20, P-08, P-09)', async () => {
    const { ctx, page } = await newPage(browser);
    await fakeRecognition(ctx);
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/speaking`);
    await page.waitForSelector('.sound-tabs');
    assert((await page.textContent('.sound-tabs')).includes('ship / sheep'), 'sound tabs are IPA only');
    const href = await page.getAttribute('a.lesson-row[href*="speaking?l="]', 'href');
    await page.goto(`${BASE}${href}`);
    await page.click('#exroot [data-rec]');
    await page.click('dialog[open] [value="yes"]');
    await page.waitForSelector('#exroot .recognised');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next]');
    const foot = await page.textContent('#pfoot');
    assert(!/Not quite|לא בדיוק|Correct answer|התשובה הנכונה/.test(foot) && !(await page.$('#pfoot.bad')), `shadowing is graded: ${foot}`);
    const [, l, e] = href.match(/l=([^&]+)&e=(.+)$/);
    const sa = (await store(page, 'attempts')).filter((a) => a.lesson === decodeURIComponent(l) && a.exercise === decodeURIComponent(e));
    assert(sa.length === 1 && sa[0].score === null, `shadowing stored a score: ${JSON.stringify(sa)}`);
    await page.goto(`${BASE}#/tutor`);
    await page.click('[data-mode="pronunciation"]');
    await page.waitForSelector('[data-pron-note] a[href="#/speaking"]');
    // Review: a picked meaning is right or wrong; only a typed one can be "what I meant".
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); L.addVocabCards(await (await fetch('content/lessons/pa1-05.json')).json(), new Date(Date.now() - 3 * 86400000)); });
    await page.goto(`${BASE}#/review?mode=early`);
    await page.waitForSelector('[data-pick], #ans');
    for (let n = 0; n < 12 && !(await page.$('[data-pick]')); n++) { await page.click('[data-idk]'); await page.click('[data-next]'); await page.waitForSelector('[data-pick], #ans, .empty'); }
    const picks = await page.$$('[data-pick]');
    assert(picks.length, 'no multiple-choice review card');
    const word = await page.textContent('.prompt-word');
    const rightHe = await page.evaluate((w) => window.lucid.store.all('cards').find((c) => c.payload?.word === w)?.payload.he, word.trim());
    for (const b of picks) if ((await b.getAttribute('data-pick')) !== rightHe) { await b.click(); break; }
    await page.waitForSelector('[data-next]');
    assert(!(await page.$('[data-override]')), '"count it" offered on a picked option');
    await page.evaluate(() => { for (const c of window.lucid.store.all('cards')) if (c.kind === 'meaning') window.lucid.store.put('cards', { ...c, fsrs: { ...c.fsrs, reps: 3 } }); });
    await page.goto(`${BASE}#/review?mode=early&t=2`);
    for (let n = 0; n < 12; n++) {
      await page.waitForSelector('#ans');
      if (/המשמעות|meaning/i.test(await page.textContent('.panel.flash'))) break;
      await page.click('[data-idk]'); await page.click('[data-next]');
    }
    await page.fill('#ans', 'משהו אחר לגמרי');
    await page.click('[data-check]');
    await page.waitForSelector('[data-override]');
    // Letter tiles: each letter can be heard, pointed Hebrew is larger.
    await lessonAt(page, 'pa1-01', 'e1');
    assert((await page.$$('#exroot [data-say-tile]')).length === lessonJson('pa1-01').exercises[0].pairs.length, 'letter tiles have no play buttons');
    const sizes = await page.evaluate(() => ['.match-item.pointed', '.match-item:not(.pointed)'].map((s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize)));
    assert(sizes[0] > sizes[1], `pointed Hebrew is not larger: ${sizes}`);
    await ctx.close();
  });

  await check('PS7. English inside Hebrew screens: left-aligned blocks, tables laid out left to right from their first column, key-point icons on the line (P-32, P-58, P-13)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/lesson/b2-01?t=1`);
    await page.waitForSelector('.lesson-intro');
    const objective = await page.evaluate(() => { const p = document.querySelector('.point'); const i = p.querySelector('.icon').getBoundingClientRect(); const t = p.querySelector('.grow').getBoundingClientRect(); return { iconTop: i.top, textTop: t.top, iconBottom: i.bottom }; });
    assert(objective.iconBottom <= objective.textTop + 40 && Math.abs(objective.iconTop - objective.textTop) < 12, `objective icon is not on the line of its text: ${JSON.stringify(objective)}`);
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn .table-wrap');
    const en = await page.evaluate(() => { const s = document.querySelector('.lesson-learn .bi-en'); const cs = getComputedStyle(s); return { display: cs.display, dir: cs.direction, align: cs.textAlign }; });
    assert(en.display === 'block' && en.dir === 'ltr' && ['start', 'left'].includes(en.align), `English explanation is not a left-aligned block: ${JSON.stringify(en)}`);
    const table = await page.evaluate(() => { const w = document.querySelector('.lesson-learn .table-wrap'); const th = w.querySelector('th').getBoundingClientRect(); return { dir: getComputedStyle(w).direction, firstLeft: th.left - w.getBoundingClientRect().left, overflow: getComputedStyle(w).overflowX }; });
    assert(table.dir === 'ltr' && table.firstLeft < 4 && table.overflow === 'auto', `English table does not start at its first column: ${JSON.stringify(table)}`);
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length ? 1 : 0);
