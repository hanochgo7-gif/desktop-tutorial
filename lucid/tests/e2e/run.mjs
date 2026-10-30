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
const PORT = 8771;
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
async function newPage(browser, { viewport = { width: 390, height: 844 }, mock = false } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'he-IL' });
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
  const db = { profile: null, records: new Map(), usage: 0 };
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const evaluation = (text, previous) => ({
    evaluation: {
      cefr_estimate: 'B1', summary: 'A clear opinion with one reason; the argument needs evidence and a counterargument.', summary_he: 'דעה ברורה עם נימוק אחד; חסרות ראיות וטיעון נגדי.',
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
    if (url.pathname.startsWith('/auth/v1/signup') || url.pathname.startsWith('/auth/v1/token')) {
      return json(route, { access_token: 'header.payload.sig', refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user });
    }
    if (url.pathname.startsWith('/auth/v1/logout')) return json(route, {});
    if (url.pathname.startsWith('/rest/v1/lucid_profiles')) {
      if (req.method() === 'GET') return json(route, db.profile ? [db.profile] : []);
      if (req.method() === 'POST') { db.profile = { ...body, id: user.id }; return json(route, [db.profile]); }
      if (req.method() === 'PATCH') { db.profile = { ...db.profile, ...body }; return route.fulfill({ status: 204 }); }
    }
    if (url.pathname.startsWith('/rest/v1/lucid_records')) {
      if (req.method() === 'POST') { const now = new Date().toISOString(); const out = body.map((r) => { const row = { ...r, updated_at: now }; db.records.set(`${r.coll}/${r.id}`, row); return { coll: r.coll, id: r.id, updated_at: now }; }); return json(route, out); }
      return json(route, []);
    }
    if (url.pathname.startsWith('/rest/v1/rpc/lucid_export')) return json(route, { profile: db.profile, records: [...db.records.values()] });
    if (url.pathname.startsWith('/rest/v1/rpc/lucid_delete_account')) { db.profile = null; db.records.clear(); return route.fulfill({ status: 204 }); }
    if (url.pathname.startsWith('/functions/v1/lucid-ai')) {
      db.usage++;
      if (body.task === 'evaluate_writing') return json(route, evaluation(body.text, body.previous));
      if (body.task === 'roleplay_turn') return json(route, { reply: 'Sure, let me check that for you. Could you spell your last name?', scene_complete: body.history.length >= 5, hint_he: null });
      if (body.task === 'roleplay_feedback') return json(route, { feedback: { conversation_score: 72, task_completed: true, grammar: { score: 70, comments: ['Mostly accurate.'] }, vocabulary: { score: 75, comments: ['Good range.'] }, naturalness: { score: 68, comments: ['A bit direct.'] }, better_alternatives: [{ you_said: body.history.find((h) => h.role === 'learner')?.text || 'x', more_natural: 'Could you help me with my booking, please?', why: 'Softer and more polite.' }], practice: ['Polite requests'], summary: 'You achieved the goal.', summary_he: 'השגת את המטרה.' } });
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
  await check('1. A new user can register (onboarding creates a profile; under-16 is refused)', async () => {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    await page.selectOption('#ob-year', String(new Date().getFullYear() - 14));
    await page.click('button[type=submit]');
    assert(await page.isVisible('[role=alert]'), 'no age-gate error for a 14-year-old');
    await onboard(page, { start: 'zero' });
    const p = await store(page, 'profile');
    assert(p[0]?.onboarded && p[0].birth_year, 'profile not created');
    await ctx.close();
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
    await page.fill('#essay', 'I think public transport is more better than cars. It is cheaper and cleaner for everyone in the city.');
    await page.click('[data-check]');
    await page.waitForSelector('.check-item');
    assert((await page.textContent('aside.panel')).includes('more better'), 'automatic check missed "more better"');
    await page.click('[data-ai]');
    await page.waitForSelector('.error-card .quote');
    await page.click('[data-reveal="0"]');
    assert((await page.textContent('aside.panel')).includes('better'), 'correction not revealed');
    await page.fill('#essay', 'I think public transport is better than cars. It is cheaper and cleaner for everyone in the city.');
    await page.click('[data-ai]');
    await page.waitForFunction(() => document.querySelector('aside.panel')?.textContent.includes('You fixed'));
    await page.click('[data-tab="versions"]');
    await page.click('[data-compare="1"]');
    assert(await page.$('aside.panel del'), 'no version diff shown');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/essay-feedback.png`, fullPage: true });
    await ctx.close();
  });

  await check('13. Advanced argumentative writing is available (assignments B2-C2)', async () => {
    const as = JSON.parse(readFileSync(join(repo, 'lucid/content/writing/assignments.json'), 'utf8')).assignments;
    assert(as.length >= 10, `${as.length} assignments`);
    assert(as.some((a) => a.level === 'C2') && as.some((a) => a.level === 'C1'), 'no C1/C2 assignments');
  });

  await check('14-15. Mobile and desktop layouts, every route loads without errors or horizontal overflow', async () => {
    const routes = ['today', 'help', 'path', 'path/B2', 'practice', 'vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing', 'writing/free', 'tutor', 'real-life', 'expressions', 'conversations', 'progress', 'profile', 'settings', 'account', 'lesson/pa1-05', 'review', 'checkpoint/PreA1'];
    for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
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
    await page.click('[data-wipe]');
    await page.click('dialog [value="yes"]');
    await page.waitForTimeout(1200);
    assert(page.url().includes('#/welcome'), 'not returned to welcome after deletion');
    const prof = await page.evaluate(() => window.lucid?.store.all('profile').length ?? 0);
    assert(prof === 0, 'profile still present after deletion');
    await ctx.close();
  });

  await check('17. AI features are functional or clearly marked as requiring configuration', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    for (const r of ['tutor', 'writing/free', 'conversations']) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForTimeout(500);
      const txt = await page.textContent('#view');
      assert(/(not configured|לא הוגדר|עוד לא הוגדרה|עוד לא הוגדרו)/.test(txt), `${r}: no configuration notice`);
    }
    await ctx.close();
    const m = await newPage(browser, { mock: true });
    await onboard(m.page, { start: 'basics' });
    await m.page.goto(`${BASE}#/account?mode=signin`);
    await m.page.fill('#em', 'learner@example.com'); await m.page.fill('#pw', 'correct horse 1');
    await m.page.click('[data-auth] button[type=submit]');
    await m.page.waitForTimeout(500);
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
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length ? 1 : 0);
