// Browser acceptance tests for the Phase 16 criteria. Serves the repository, drives Chromium through
// Playwright, and prints PASS/FAIL per criterion. Server features (accounts, AI) are exercised against a
// mock Supabase (auth, REST and the lucid-ai function) injected with request interception, so the real
// UI code paths run without credentials.
// Usage: node tests/e2e/run.mjs [--only <substring>] [--shots <dir>]
// E2E_ROOT=<dir> serves and reads <dir>/lucid instead of this repository's copy (for example a tree built by
// tools/build/build.mjs); the default is the repository.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { BROKEN, NOT_FOUND } from './screen-errors.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const repo = process.env.E2E_ROOT ? resolve(process.env.E2E_ROOT) : join(here, '..', '..', '..');
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
// The router's and the views' error screens anywhere in the view, and their not-found screens (an .empty block), in
// both languages (screen-errors.mjs).
// What is wrong with the screen on show, or '' when nothing is.
async function screenProblem(page) {
  const { all, empty } = await page.evaluate(() => ({ all: document.querySelector('#view')?.textContent || '', empty: [...document.querySelectorAll('#view .empty')].map((e) => e.textContent).join(' | ') }));
  return BROKEN.test(all) || NOT_FOUND.test(empty) ? (empty || all).trim().replace(/\s+/g, ' ').slice(0, 100) : '';
}

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
      if (body.task === 'roleplay_feedback') return json(route, { feedback: { conversation_score: 72, task_completed: true, strengths: ['"Could I check in, please?" was a clear, polite request.'], grammar: { score: 70, comments: ['Mostly accurate.'] }, vocabulary: { score: 75, comments: ['Good range.'] }, naturalness: { score: 68, comments: ['A bit direct.'] }, better_alternatives: [{ you_said: body.history.find((h) => h.role === 'learner')?.text || 'x', more_natural: 'Could you help me with my booking, please?', why: 'Softer and more polite.' }], practice: ['Polite requests'], summary: 'You achieved the goal.', summary_he: 'השגת את המטרה.', strengths_he: ['״Could I check in, please?״ היא בקשה ברורה ומנומסת.'], practice_he: ['בקשות מנומסות'] } });
      if (body.task === 'tutor_turn') return json(route, { reply: `Good question. **Present perfect** links the past to now. Try: "I ___ (live) here since 2020."` });
    }
    return json(route, { error: { message: `unmocked ${url.pathname}` } }, 404);
  });
}

// ---------- server ----------
// E2E_SERVE=vercel: served by tools/build/serve.mjs instead, with the response headers of vercel.json and 404.html for
// an unknown path, as Vercel serves Lucid. Use it with E2E_ROOT pointing at a directory whose lucid/ is the output of
// tools/build/vercel-build.mjs (see .github/workflows/lucid-verify.yml).
const VERCEL = process.env.E2E_SERVE === 'vercel';
const server = VERCEL
  ? spawn(process.execPath, [join(here, '..', '..', 'tools/build/serve.mjs'), '--root', join(repo, 'lucid'), '--port', String(PORT), '--mount', '/lucid/', '--host', 'localhost'], { stdio: 'ignore' })
  : spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: repo, stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();
const manifest = JSON.parse(readFileSync(join(repo, 'lucid/content/manifest.json'), 'utf8'));
const has = (id) => manifest.lessons.includes(id);

try {
  if (VERCEL) await check('V1. Served as on Vercel (BLK-03, BLK-05): the headers forbid framing, the app works under its CSP header, and a mistyped path gets Lucid\'s own 404 page', async () => {
    const res = await fetch(BASE);
    const csp = res.headers.get('content-security-policy') || '';
    assert(/frame-ancestors 'none'/.test(csp) && res.headers.get('x-frame-options') === 'DENY' && res.headers.get('x-content-type-options') === 'nosniff', `headers: ${csp}`);
    assert(res.headers.get('cache-control') === 'no-cache' && (await fetch(`${BASE}js/app.js`)).headers.get('cache-control') === 'public, max-age=600', 'caching as on GitHub Pages');
    const { ctx, page } = await newPage(browser);
    const violations = [];
    page.on('console', (m) => { if (/Content Security Policy|Permissions-Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
    await page.goto(`${BASE}#/welcome`);
    await page.waitForSelector('.welcome h1');
    await page.goto(`${BASE}#/help`);
    await page.waitForSelector('#view h1, #view h2');
    assert(!violations.length, `console: ${violations.join(' | ')}`);
    // Framed by another page: the browser refuses to show Lucid (its own context: the refusal is logged as an error).
    const framer = await browser.newContext();
    const host = await framer.newPage();
    await host.setContent(`<iframe src="${BASE}#/welcome" style="width:400px;height:400px"></iframe>`);
    await host.waitForTimeout(1500);
    const framed = host.frames().find((f) => f !== host.mainFrame());
    const inside = await framed?.evaluate(() => (document.querySelector('.welcome') ? 'lucid' : '')).catch(() => '');
    assert(framed && inside !== 'lucid', 'Lucid rendered inside a frame');
    await framer.close();
    // A mistyped path: status 404 and Lucid's page with a link home.
    const nope = await page.goto(`${BASE}no-such-page`);
    assert(nope.status() === 404, `status ${nope.status()}`);
    assert(/הדף הזה לא קיים/.test(await page.textContent('h1')) && await page.$('a.go[href="/"]') && /Lucid/.test(await page.textContent('.brand')), 'Lucid\'s 404 page');
    await ctx.close();
  });

  // No minimum age (owner's decision, November 2026): nobody is refused; protections depend on the year of birth.
  await check('1. A new user of any age can register: a 10-year-old registers and reaches Today; nobody is refused, and a browser refused by the former 16+ gate can register now', async () => {
    const year = new Date().getFullYear();
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}#/start`);
    await page.waitForSelector('#ob-form');
    const help = await page.textContent('#ob-year-help');
    assert(!/16|גיל מינימלי|minimum/i.test(help) && /הגנות|protections/.test(help), `the year's help text: ${help}`);
    const years = await page.$$eval('#ob-year option[value]:not([value=""])', (o) => o.map((x) => Number(x.value)));
    assert(years[0] === year && years.at(-1) === year - 110 && years.length === 111, `year list ${years[0]}..${years.at(-1)} (${years.length})`);
    await ctx.close();
    // A 10-year-old goes through onboarding (device only: no guardian box, nothing leaves the device) and reaches Today.
    const kid = await newPage(browser);
    await kid.page.goto(`${BASE}#/start`);
    await kid.page.waitForSelector('#ob-form');
    await kid.page.selectOption('#ob-year', String(year - 10));
    await kid.page.click('button[type=submit]');
    await kid.page.waitForSelector('[data-goal]');
    assert(!(await kid.page.$('[role=alert] h1')), 'a refusal screen for a 10-year-old');
    await kid.page.click('[data-goal="travel"]');
    await kid.page.click('button[type=submit]');
    await kid.page.click('[data-start="basics"]');
    await kid.page.click('button[type=submit]');
    await kid.page.waitForSelector('input[name=terms]');
    const step = await kid.page.textContent('#ob-form');
    assert(await kid.page.$('[data-under16]') && /מתחת לגיל 16/.test(step) && /מתחת לגיל 18/.test(step), `the privacy step does not say what differs under 16 and under 18: ${step}`);
    assert(!(await kid.page.$('input[name=guardian]')), 'a guardian box where nothing leaves the device');
    await kid.page.check('input[name=terms]');
    await kid.page.click('button[type=submit]');
    await kid.page.waitForTimeout(500);
    const p = await store(kid.page, 'profile');
    assert(p[0]?.onboarded && p[0].birth_year === year - 10 && p[0].minor === true, `profile not created for a 10-year-old: ${JSON.stringify(p[0])}`);
    assert((await store(kid.page, 'settings'))[0]?.marketing === false, 'marketing is not off for a 10-year-old');
    await kid.page.goto(`${BASE}#/today`);
    await kid.page.waitForSelector('#view section[aria-labelledby="plan-h"]', { timeout: 6000 }).catch(() => { throw new Error('a 10-year-old does not reach Today'); });
    await kid.ctx.close();
    // A browser refused under the old gate (the 24-hour key is still there): the form shows and the key is removed.
    const before = await newPage(browser);
    await before.page.goto(`${BASE}#/welcome`);
    await before.page.waitForSelector('.welcome');
    await before.page.evaluate(() => localStorage.setItem('lucid-age-refused', String(Date.now() - 60_000)));
    await before.page.goto(`${BASE}#/start`);
    await before.page.waitForSelector('#ob-form');
    assert(!(await before.page.$('.onboard[role=alert]')), 'the old refusal screen is still shown');
    assert(await before.page.evaluate(() => localStorage.getItem('lucid-age-refused')) === null, 'the old refusal key was not removed');
    await onboard(before.page, { start: 'zero', year: year - 14 });
    const p2 = await store(before.page, 'profile');
    assert(p2[0]?.onboarded && p2[0].birth_year === year - 14, 'a learner refused before cannot register now');
    await before.ctx.close();
    // Adults register as before.
    const fresh = await newPage(browser);
    await onboard(fresh.page, { start: 'zero' });
    const p3 = await store(fresh.page, 'profile');
    assert(p3[0]?.onboarded && p3[0].birth_year && p3[0].minor === false, 'profile not created');
    await fresh.ctx.close();
  });

  await check('AGE1. Under 16 (counting the youngest age the birth year allows), expressions flagged as sensitive are not shown (one neutral note); 16 and over see them with their warning', async () => {
    const year = new Date().getFullYear();
    const real = JSON.parse(readFileSync(join(repo, 'lucid/content/real-life/slang.json'), 'utf8'));
    // No real entry is flagged today, so the check adds one through the network, as a content author would.
    const flagged = { ...real.entries[0], id: 'zz-flagged-test', term: 'Zzflagged', level: 'A1', sensitive: ['vulgar'], related: [], warning: { en: 'Flagged test warning.', he: 'אזהרת בדיקה.' } };
    const withFlag = (page) => page.route(/content\/real-life\/slang\.json$/, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ entries: [...real.entries, flagged] }) }));
    const kid = await newPage(browser);
    await withFlag(kid.page);
    await learnerAt(kid.page, 'A1', { birthYear: year - 10 });
    await kid.page.goto(`${BASE}#/expressions?q=Zzflagged`);
    await kid.page.waitForSelector('#xp-list');
    await kid.page.waitForTimeout(200);
    assert(!(await kid.page.$('[data-entry="zz-flagged-test"]')), 'a 10-year-old sees the flagged expression');
    assert(await kid.page.$('[data-age-note]'), 'no note that some expressions are not shown');
    await kid.page.goto(`${BASE}#/expressions`);
    await kid.page.waitForSelector('#xp-count');
    const count = await kid.page.textContent('#xp-count');
    assert(count.includes(String(real.entries.length)), `every unflagged expression should stay: ${count}`);
    await kid.ctx.close();
    // Turning 15 or 16 this year: still 15 until the birthday, so still protected (only the year is stored).
    for (const age of [15, 16]) {
      const teen = await newPage(browser);
      await withFlag(teen.page);
      await learnerAt(teen.page, 'A1', { birthYear: year - age });
      await teen.page.goto(`${BASE}#/expressions?q=Zzflagged`);
      await teen.page.waitForSelector('#xp-list');
      await teen.page.waitForTimeout(200);
      assert(!(await teen.page.$('[data-entry="zz-flagged-test"]')) && await teen.page.$('[data-age-note]'), `born ${year - age} (may be 15) sees the flagged expression`);
      await teen.ctx.close();
    }
    // Turning 17 this year: surely 16.
    for (const age of [17, 30]) {
      const other = await newPage(browser);
      await withFlag(other.page);
      await learnerAt(other.page, 'A1', { birthYear: year - age });
      await other.page.goto(`${BASE}#/expressions?open=zz-flagged-test&q=Zzflagged`);
      await other.page.waitForSelector('[data-entry="zz-flagged-test"]', { timeout: 4000 }).catch(() => { throw new Error(`a ${age}-year-old does not see the flagged expression`); });
      assert(!(await other.page.$('[data-age-note]')), `the age note shows for a ${age}-year-old`);
      const text = await other.page.textContent('[data-entry="zz-flagged-test"]');
      assert(/אזהרת בדיקה|Flagged test warning/.test(text), `the warning is missing for a ${age}-year-old`);
      await other.ctx.close();
    }
  });

  await check('AGE2. Under 16, where data would leave the device (an account, AI feedback) a parent or guardian confirms first; under 18 marketing stays off (mock server: accounts and AI are off on the live site)', async () => {
    const year = new Date().getFullYear();
    // The live site's configuration: no server, no AI. There the boxes never appear, because nothing leaves the device.
    // The repository's config.js as written, and the served one (E2E_ROOT: minified by tools/build, `"" ` and `!1`).
    const live = readFileSync(join(here, '..', '..', 'config.js'), 'utf8');
    assert(/supabaseUrl: ''/.test(live) && /aiEnabled: false/.test(live), 'config.js is no longer device-only; review these checks');
    const served = readFileSync(join(repo, 'lucid/config.js'), 'utf8');
    assert(/supabaseUrl:\s*(''|"")/.test(served) && /aiEnabled:\s*(false|!1)\b/.test(served), 'the served config.js is no longer device-only; review these checks');
    const { ctx, page } = await newPage(browser, { mock: true });
    const db = page.lucidMock;
    await learnerAt(page, 'A1', { birthYear: year - 10 });
    // Account: the box is required; without it nothing is sent.
    await page.goto(`${BASE}#/account?mode=signup`);
    await page.waitForSelector('[data-guardian-account] #guardian');
    await page.fill('#em', db.user.email); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.waitForSelector('#guardian-err');
    assert(await page.evaluate(() => document.activeElement?.id) === 'guardian', 'the focus is not on the guardian box');
    assert(await page.inputValue('#em') === db.user.email, 'the typed email was lost');
    await sleep(300);
    assert(!db.profile && !db.pushes.length && !(await page.evaluate(() => localStorage.getItem('lucid-session'))), 'data left the device without the guardian box');
    await page.check('#guardian');
    await page.click('[data-auth] button[type=submit]');
    const until = async (fn, ms = 4000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await sleep(50); } return true; };
    assert(await until(() => db.pushes.length > 0), 'no sync after the guardian agreed');
    const local = (await store(page, 'profile'))[0];
    assert(local.guardian_consent_at && db.profile?.guardian_consent_at === local.guardian_consent_at, `the agreement was not stored and sent: ${JSON.stringify(db.profile)}`);
    assert(db.profile.marketing_opt_in !== true, 'marketing consent was sent for a 10-year-old');
    // AI feedback: the switch does not turn on until the guardian box is ticked.
    await page.goto(`${BASE}#/settings`);
    await page.waitForSelector('[data-guardian-ai]');
    await page.click('[data-ai]');
    await page.waitForSelector('#ai-guardian-err');
    assert(!(await page.isChecked('[data-ai]')) && !(await store(page, 'settings'))[0]?.ai_consent, 'AI turned on without the guardian box');
    await page.click('[data-guardian-ai]');
    assert(await page.isChecked('[data-guardian-ai]') && !(await page.$('#ai-guardian-err')), 'ticking the guardian box after the error did not keep it ticked or clear the error');
    await page.click('[data-ai]');
    await page.waitForTimeout(300);
    const s = (await store(page, 'settings'))[0];
    assert(s.ai_consent && s.ai_guardian_consent_at && db.profile.consent_ai_at, `AI consent not stored with the guardian's agreement: ${JSON.stringify(s)}`);
    // Turning it off clears both, so turning it on again asks again.
    await page.click('[data-ai]');
    await page.waitForTimeout(200);
    const off = (await store(page, 'settings'))[0];
    assert(!off.ai_consent && !off.ai_guardian_consent_at && await page.$('[data-guardian-ai]'), 'turning AI off did not clear the agreement');
    await ctx.close();
    // Onboarding with AI available: ticking AI without the guardian box stops at the box.
    const ob = await newPage(browser, { mock: true });
    await ob.page.goto(`${BASE}#/start`);
    await ob.page.waitForSelector('#ob-form');
    await ob.page.selectOption('#ob-year', String(year - 12));
    await ob.page.click('button[type=submit]');
    await ob.page.click('[data-goal="travel"]');
    await ob.page.click('button[type=submit]');
    await ob.page.click('[data-start="zero"]');
    await ob.page.click('button[type=submit]');
    await ob.page.check('input[name=ai_consent]');
    await ob.page.check('input[name=terms]');
    await ob.page.click('button[type=submit]');
    await ob.page.waitForSelector('#ob-err');
    assert(await ob.page.evaluate(() => document.activeElement?.name) === 'guardian' && !(await store(ob.page, 'profile')).length, 'onboarding went on with AI and without the guardian box');
    await ob.page.check('input[name=guardian]');
    await ob.page.click('button[type=submit]');
    await ob.page.waitForTimeout(500);
    const os = (await store(ob.page, 'settings'))[0];
    assert(os?.ai_consent && os.ai_guardian_consent_at && os.marketing === false, `onboarding did not store AI with the guardian's agreement: ${JSON.stringify(os)}`);
    await ob.ctx.close();
    // A session that is already signed in (for example from before onboarding) waits for the agreement: sync is
    // paused, Settings says so and takes the agreement, and only then is the profile created.
    const waiting = await newPage(browser, { mock: true });
    const wdb = waiting.page.lucidMock;
    await learnerAt(waiting.page, 'A1', { birthYear: year - 9 });
    await waiting.page.evaluate((u) => { localStorage.setItem('lucid-session', JSON.stringify({ access_token: `tok-${u.id}`, refresh_token: 'r', expires_at: Date.now() + 3_600_000, user: u })); window.lucid.store.setOwner(u.id); }, wdb.user);
    await waiting.page.reload();
    await waiting.page.goto(`${BASE}#/settings`);
    await waiting.page.waitForSelector('[data-guardian-account]');
    await sleep(300);
    assert(!wdb.profile && !wdb.pushes.length, 'data left the device before the agreement');
    await waiting.page.click('[data-guardian-account]'); // the box goes away once the agreement is saved
    const waitPush = async () => { const t0 = Date.now(); while (!wdb.pushes.length) { if (Date.now() - t0 > 4000) return false; await sleep(50); } return true; };
    assert(await waitPush() && wdb.profile?.guardian_consent_at, 'sync did not start after the agreement in Settings');
    await waiting.ctx.close();
    // Turning 16 this year may still be 15: the box is there.
    const late = await newPage(browser, { mock: true });
    await learnerAt(late.page, 'A1', { birthYear: year - 16 });
    await late.page.goto(`${BASE}#/account?mode=signup`);
    await late.page.waitForSelector('[data-auth]');
    assert(await late.page.$('[data-guardian-account] #guardian'), `no guardian box for a learner born ${year - 16}, who may be 15`);
    await late.ctx.close();
    // Surely 16 (turning 17 this year) and over: no guardian box anywhere.
    const teen = await newPage(browser, { mock: true });
    await learnerAt(teen.page, 'A1', { birthYear: year - 17 });
    await teen.page.goto(`${BASE}#/account?mode=signup`);
    await teen.page.waitForSelector('[data-auth]');
    assert(!(await teen.page.$('#guardian')), 'a guardian box for a learner who is surely 16');
    await teen.page.goto(`${BASE}#/settings`);
    await teen.page.waitForSelector('[data-ai]');
    assert(!(await teen.page.$('[data-guardian-ai]')), 'a guardian AI box for a learner who is surely 16');
    await teen.ctx.close();
  });

  await check('AGE3. Signed in, a 12-year-old without a guardian\'s agreement still finishes onboarding and reaches Today (sync waits; nothing is stored on the server); a second device with the agreement on the server syncs and says nothing is paused (mock server)', async () => {
    const year = new Date().getFullYear();
    const until = async (fn, ms = 4000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await sleep(50); } return true; };
    // Sign up before onboarding (no local profile, so the age is not known yet): only the email goes to sign-in.
    const kid = await newPage(browser, { mock: true });
    const db = kid.page.lucidMock;
    await kid.page.goto(`${BASE}#/account?mode=signup`);
    await kid.page.waitForSelector('[data-auth]');
    await kid.page.fill('#em', db.user.email); await kid.page.fill('#pw', 'correct horse 1');
    await kid.page.click('[data-auth] button[type=submit]');
    await kid.page.waitForFunction(() => location.hash.startsWith('#/start'), null, { timeout: 5000 }).catch(() => { throw new Error('sign-up did not lead to onboarding'); });
    await kid.page.waitForSelector('#ob-form');
    await kid.page.selectOption('#ob-year', String(year - 12));
    await kid.page.click('button[type=submit]');
    await kid.page.click('[data-goal="travel"]');
    await kid.page.click('button[type=submit]');
    await kid.page.click('[data-start="zero"]');
    await kid.page.click('button[type=submit]');
    await kid.page.waitForSelector('input[name=guardian]');
    assert(!(await kid.page.$eval('input[name=guardian]', (x) => x.required)), 'the guardian box is required to finish');
    await kid.page.check('input[name=terms]');
    await kid.page.click('button[type=submit]');
    await kid.page.waitForFunction(() => !location.hash.startsWith('#/start'), null, { timeout: 5000 }).catch(() => { throw new Error('a signed-in 12-year-old without the agreement is stuck in onboarding'); });
    const p = (await store(kid.page, 'profile'))[0];
    assert(p?.onboarded && p.birth_year === year - 12 && !p.guardian_consent_at, `profile: ${JSON.stringify(p)}`);
    await kid.page.goto(`${BASE}#/today`);
    await kid.page.waitForSelector('#view section[aria-labelledby="plan-h"]', { timeout: 6000 }).catch(() => { throw new Error('a signed-in 12-year-old does not reach Today'); });
    await sleep(400);
    assert(!db.profile && !db.pushes.length, `data left the device without the agreement: ${JSON.stringify(db.profile)} ${db.pushes.length}`);
    // Settings says sync is paused and takes the agreement; then the profile is created and sync starts.
    await kid.page.goto(`${BASE}#/settings`);
    await kid.page.waitForSelector('[data-guardian-account-box]', { timeout: 4000 }).catch(() => { throw new Error('Settings does not say sync is paused'); });
    await kid.page.click('[data-guardian-account]');
    assert(await until(() => db.pushes.length > 0) && db.profile?.guardian_consent_at, 'sync did not start after the agreement');
    await sleep(300);
    assert(!(await kid.page.$('[data-guardian-account-box]')), 'the paused box is still shown while syncing');
    const server = { ...db.profile };
    await kid.ctx.close();

    // Second device: the server already has the profile with the agreement.
    const two = await newPage(browser, { mock: true });
    const db2 = two.page.lucidMock;
    db2.profile = server;
    await two.page.goto(`${BASE}#/account?mode=signin`);
    await two.page.waitForSelector('[data-auth]');
    assert(!(await two.page.$('#guardian')), 'a guardian box before the age is known');
    await two.page.fill('#em', db2.user.email); await two.page.fill('#pw', 'correct horse 1');
    await two.page.click('[data-auth] button[type=submit]');
    await two.page.waitForFunction(() => !location.hash.startsWith('#/account'), null, { timeout: 5000 });
    await sleep(500);
    const local = (await store(two.page, 'profile'))[0];
    assert(local?.birth_year === year - 12 && local.guardian_consent_at === server.guardian_consent_at && local.consent_terms_at === server.consent_terms_at, `the agreement was not adopted from the server: ${JSON.stringify(local)}`);
    await two.page.goto(`${BASE}#/settings`);
    await two.page.waitForSelector('[data-sync]');
    await sleep(400);
    assert(!(await two.page.$('[data-guardian-account-box]')), 'Settings says sync is paused on a device that syncs');
    await two.page.click('[data-seg="daily_minutes"] [data-v="35"]');
    await two.page.click('[data-sync]');
    assert(await until(() => db2.pushes.length > 0), 'the second device does not sync');
    assert(!(await two.page.$('[data-guardian-account-box]')), 'Settings says sync is paused while it syncs');
    await two.page.reload();
    await two.page.waitForSelector('[data-sync]');
    await sleep(500);
    assert(!(await two.page.$('[data-guardian-account-box]')), 'after a reload, Settings says sync is paused on a device that syncs');
    await two.page.goto(`${BASE}#/account`);
    await sleep(300);
    assert(!(await two.page.$('#guardian')), 'the account screen asks for the agreement again');
    await two.ctx.close();
  });

  await check('AGE4. A learner who signed up when Lucid was 16+ (born year - 16, now counted as under 16) and is still signed in: sync, AI and the tutor wait for a guardian; Settings takes the agreement and says what really happened (mock server)', async () => {
    const year = new Date().getFullYear();
    const until = async (fn, ms = 4000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await sleep(50); } return true; };
    const toasts = (page) => page.$$eval('#toast-root .toast', (xs) => xs.map((x) => x.textContent.trim()));
    const t = await newPage(browser, { mock: true });
    const db = t.page.lucidMock;
    const old = '2026-10-01T00:00:00.000Z';
    // As the 16+ gate on main left it: a server profile without the agreement, AI consent on, a stored session.
    db.profile = { id: db.user.id, display_name: 'Old', birth_year: year - 16, ui_language: 'he', goals: ['travel'], consent_terms_at: old, consent_ai_at: old, guardian_consent_at: null };
    await learnerAt(t.page, 'A2', { birthYear: year - 16 });
    await t.page.evaluate(async ({ u, old }) => {
      const L = await import('./js/core/learner.js');
      localStorage.setItem('lucid-session', JSON.stringify({ access_token: `tok-${u.id}`, refresh_token: 'r', expires_at: Date.now() + 3_600_000, user: u }));
      window.lucid.store.setOwner(u.id);
      L.saveProfile({ minor: true, consent_terms_at: old });
      L.saveSettings({ ai_consent: true, ai_consent_at: old });
    }, { u: db.user, old });
    await sleep(500); // the store writes to IndexedDB in the background
    assert((await store(t.page, 'settings'))[0]?.ai_consent === true, 'the test did not store the AI consent');
    await t.page.reload();
    await t.page.waitForSelector('#view > *');
    await sleep(800);
    assert(!db.pushes.length, `progress was uploaded without a guardian's agreement (${db.pushes.length} pushes)`);
    // AI is off for this learner until a guardian agrees: the tutor sends nothing and points to Settings.
    await t.page.goto(`${BASE}#/tutor`);
    await t.page.waitForSelector('[data-ai-notice]', { timeout: 4000 }).catch(() => { throw new Error('the tutor is open for an under-16 without a guardian\'s agreement'); });
    assert(!(await t.page.$('#tin')) && db.usage === 0, 'an AI request could be sent');
    // Settings: the account box is there, AI shows as off with its guardian box.
    await t.page.goto(`${BASE}#/settings`);
    await t.page.waitForSelector('[data-guardian-account-box]', { timeout: 4000 }).catch(() => { throw new Error('Settings does not say sync waits for a guardian'); });
    assert(!(await t.page.isChecked('[data-ai]')) && await t.page.$('[data-guardian-ai]'), 'AI shows as on without a guardian\'s agreement');
    // "Sync now" while waiting for a guardian points to the box; it does not promise an automatic retry.
    await t.page.click('[data-sync]');
    await sleep(300);
    const syncToast = (await toasts(t.page)).join(' | ');
    assert(/בתיבה שלמעלה/.test(syncToast) && !/ננסה שוב אוטומטית/.test(syncToast), `Sync now said: ${syncToast}`);
    assert(!db.pushes.length, 'Sync now uploaded without the agreement');
    await t.page.evaluate(() => document.querySelectorAll('#toast-root .toast').forEach((x) => x.remove()));
    // The agreement while offline: saved, and the toast says sync waits for the connection, not that it started.
    // (The mock answers before the network, so the connection is cut by aborting its requests.)
    const cut = (route) => route.abort('internetdisconnected');
    await t.page.route(/mock\.supabase\.co\/rest/, cut);
    await t.page.click('[data-guardian-account]');
    await sleep(800);
    const offToast = (await toasts(t.page)).join(' | ');
    assert(/האישור נשמר/.test(offToast) && /אין כרגע חיבור לשרת/.test(offToast) && !/הסנכרון התחיל|יתחיל עכשיו/.test(offToast), `offline agreement said: ${offToast}`);
    assert(!db.pushes.length && !db.profile.guardian_consent_at, 'something was sent while offline');
    // Back online: the agreement goes to the existing profile, then sync runs.
    await t.page.unroute(/mock\.supabase\.co\/rest/, cut);
    await t.page.evaluate(() => dispatchEvent(new Event('online')));
    assert(await until(() => db.pushes.length > 0), 'sync did not start once back online');
    const local = (await store(t.page, 'profile'))[0];
    assert(db.profile.guardian_consent_at && db.profile.guardian_consent_at === local.guardian_consent_at, `the agreement did not reach the server profile: ${JSON.stringify(db.profile)}`);
    await t.ctx.close();
    // Online, the agreement toast says sync started only when it did.
    const k = await newPage(browser, { mock: true });
    const kdb = k.page.lucidMock;
    await learnerAt(k.page, 'A1', { birthYear: year - 12 });
    await k.page.evaluate((u) => { localStorage.setItem('lucid-session', JSON.stringify({ access_token: `tok-${u.id}`, refresh_token: 'r', expires_at: Date.now() + 3_600_000, user: u })); window.lucid.store.setOwner(u.id); }, kdb.user);
    await k.page.reload();
    await k.page.goto(`${BASE}#/settings`);
    await k.page.waitForSelector('[data-guardian-account]');
    await k.page.click('[data-guardian-account]');
    assert(await until(() => kdb.pushes.length > 0), 'no sync after the agreement');
    await sleep(200);
    const okToast = (await toasts(k.page)).join(' | ');
    assert(/האישור נשמר, והסנכרון התחיל/.test(okToast), `the agreement said: ${okToast}`);
    await k.ctx.close();
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
      if (check) await check.click(); else if (!(await page.$('[data-next]'))) await page.click('[data-dontknow]').catch(() => {}); // a finished matching board checks itself (EX-1)
      await page.waitForSelector('[data-next], [data-show-answer]', { timeout: 3000 });
      if (await page.$('[data-show-answer]')) { await page.click('[data-show-answer]'); await page.waitForSelector('[data-next]', { timeout: 3000 }); } // LF-6: a second try first
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
    assert(await page.$('#exroot') || await page.$('[data-drill-primer]') || await page.$('.empty'), 'drill did not open'); // r4 LF-10: a primer card comes first
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
    if (await page.$('[data-pick]')) { await page.click('[data-pick]'); await page.click('[data-check]'); } else { await page.fill('#ans', 'סטודנט'); await page.click('[data-check]'); } // PH-2: a tap selects, Check commits
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
    await page.click('[data-check-turn]'); // RW-1: a tap selects, "Check" commits
    await page.waitForSelector('.explain');
    await page.click('[data-own-box] > summary');
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
    // D11: grouped by level and folded, like Real life; a search shows every match.
    assert((await page.$$('#xp-list section h2')).length >= 3 && (await page.$$('#xp-list .entry')).length <= 20 && await page.$('[data-unfold-group]'), 'expressions are one long list, not grouped and folded');
    await page.fill('#xp-q', 'no worries');
    const text = await page.textContent('#view');
    assert(/No worries/i.test(text), 'expression list missing "No worries"');
    const details = await page.$('details, [data-toggle]'); // RW-10: the filter key is the first [aria-expanded] now
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
    // Launch TS-06: "Mark a mistake" says where the mark is kept and that nobody reviews it yet, in both languages.
    assert((await page.textContent('[data-report]')).trim() === 'סימון טעות במשוב', `the mark key: ${await page.textContent('[data-report]')}`);
    await page.click('[data-report]');
    const marked = await page.textContent('.toast');
    assert(/כרגע אף אחד לא עובר על הסימונים האלה/.test(marked) && /יצירת קשר/.test(marked) && !/לבדוק את איכות המשוב/.test(marked), `mark toast: ${marked}`);
    assert((await store(page, 'events')).some((e) => e.type === 'ai-report'), 'the mark was not saved');
    await page.evaluate(async () => (await import('./js/core/i18n.js')).setUiLang('en'));
    await page.click('[data-report]');
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /Nobody reviews these marks yet/.test(t.textContent)), null, { timeout: 3000 }).catch(() => { throw new Error('the English mark note does not say nobody reviews it'); });
    assert(!/audit feedback quality/.test(await page.textContent('body')), 'the English note promises an audit');
    await page.evaluate(async () => (await import('./js/core/i18n.js')).setUiLang('he'));
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
      // T6: every level, B2-C2 included, has Hebrew instructions, topics and "Must include" (shown on request from B2).
      assert(fa.instructions.he && fa.required_elements.every((r) => r.he) && (fa.topics || []).every((tp) => tp.he), `${l.id} final has no Hebrew instructions`);
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
    await page.waitForSelector('aside [data-tab="sources"]'); // RW-4: the brief (and its own Sources key) folds once a topic is chosen
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
    const routes = ['today', 'help', 'path', 'path/B2', 'practice', 'games', 'games/PreA1/1', 'games/pictures/1', 'games/memory/1', 'vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing', 'writing/free', 'writing/final-B2', 'tutor', 'real-life', 'expressions', 'conversations', 'progress', 'profile', 'settings', 'account', 'lesson/pa1-05', 'review', 'checkpoint/PreA1'];
    for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      const { ctx, page } = await newPage(browser, { viewport: vp });
      await onboard(page, { start: 'zero' });
      const before = pageErrors.length;
      for (const r of routes) {
        await page.goto(`${BASE}#/${r}`);
        await page.waitForTimeout(450);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(overflow <= 1, `${r} overflows horizontally by ${overflow}px at ${vp.width}`);
        const problem = await screenProblem(page);
        assert(!problem, `${r} failed to render at ${vp.width}: ${problem}`);
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
    // The one key kept: the interface language for this browser session, not learner data (FR-11, tests/e2e/move.mjs M7).
    assert(![...keys.local, ...keys.session.filter((k) => k !== 'lucid-ui-lang')].some((k) => k.startsWith('lucid-')), `Lucid keys left: ${JSON.stringify(keys)}`);
    assert(['he', 'en'].includes(await page.evaluate(() => sessionStorage.getItem('lucid-ui-lang'))), 'only the language code is kept');
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
      assert(/(not configured|לא הוגדר|עוד לא הוגדרה|עוד לא הוגדרו|not available on this site|עוד לא זמינה באתר|עוד לא זמין באתר|לא פעיל באתר הזה|not active on this site)/.test(txt), `${r}: no configuration notice`);
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
    assert(/פרטים אישיים אמיתיים/.test(await m.page.textContent('[data-no-real-details]')), 'the tutor does not say to make up personal details');
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
    // On a phone "Level by skill" is folded to one line (R2-20); it opens on a tap.
    await page.waitForSelector('details[data-skills] > summary');
    assert(!(await page.$eval('details[data-skills]', (d) => d.open)), 'the skill panel is not folded on a phone');
    assert(!/C1|C2/.test(await page.textContent('.skill-fold-sum')), 'the folded summary shows C1/C2 from placement alone');
    await page.click('details[data-skills] > summary');
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
    // The lesson finished today is ticked in the plan and the next one is offered beyond it (UX r3 TF-2).
    const hrefs = await page.$$eval('#view .plan a[href^="#/lesson/"]', (x) => x.map((a) => a.getAttribute('href')));
    assert(hrefs.some((h) => h.startsWith('#/lesson/b2-02')), `Today's lesson is still ${hrefs}`);
    assert(await page.$('.plan a.done[href="#/lesson/b2-01"]'), 'the lesson finished today is not ticked');
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
      const c = await page.$('[data-check]:not([disabled])'); if (c) await c.click(); else if (!(await page.$('[data-next]'))) await page.click('[data-dontknow]'); // a finished matching board checks itself (EX-1)
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

  // ---------- learner model, plan and progress (persona panel round 2) ----------
  await check('LP1. Today: after "Nearly there" the main action practises only the missed exercises; a saved run counts like the player; icons and reasons fit the block (R2-02, R2-25, R2-17, R1-N6, R1-D7, R2-22, R2-30, R2-39)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    const ids = JSON.parse(readFileSync(join(repo, 'lucid/content/lessons/a2-01.json'), 'utf8')).exercises.map((e) => e.id);
    // A saved run: 5 of the first pass done, two retries waiting at the end.
    await page.evaluate((ids) => window.lucid.store.put('progress', { id: 'a2-01', level: 'A2', status: 'started', resume: { qi: 5, queue: [...ids.map((x) => [x, false]), [ids[1], true], [ids[2], true]], first: [], at: new Date().toISOString() } }), ids);
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.start-bar a[href="#/lesson/a2-01?resume=1"]');
    const cta = await page.textContent('.start-bar a');
    const row = await page.textContent('.plan li:has(a[href="#/lesson/a2-01?resume=1"])');
    assert(cta.includes(`6 מתוך ${ids.length}`) && row.includes(`6 מתוך ${ids.length}`) && row.includes('2 לחזרה'), `Today does not count like the player: ${cta} / ${row}`);
    assert(![cta, row].some((x) => x.includes(`מתוך ${ids.length + 2}`)), `retries grow the total: ${cta} / ${row}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lp1-today-resume-390.png`, fullPage: true });
    // The run ended "Nearly there" with four missed.
    await page.evaluate((ids) => window.lucid.store.put('progress', { id: 'a2-01', level: 'A2', status: 'started', best_score: 0.6, last_score: 0.6, missed: { ids: ids.slice(1, 5), first: [], at: new Date().toISOString() } }), ids);
    await page.waitForSelector('.start-bar a[href="#/lesson/a2-01?stage=missed"]');
    assert(/לתרגל את 4 הטעויות/.test(await page.textContent('.start-bar a')), `the main action is not "practise the 4 you missed": ${await page.textContent('.start-bar a')}`);
    assert(/כמעט סיימת/.test(await page.textContent('.plan')), 'the plan does not describe the lesson as nearly done');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lp1-today-missed-390.png`, fullPage: true });
    // No placeholder glyph anywhere in the plan (an unknown icon falls back to the circle).
    // Icons compared as the browser serialises them.
    const svgOf = (pg, name) => pg.evaluate(async (n) => { const d = document.createElement('div'); d.innerHTML = (await import('./js/ui/icons.js')).iconSvg(n); return d.innerHTML; }, name);
    const circle = await svgOf(page, 'circle');
    assert(!(await page.$$eval('.plan .glyph', (g, c) => g.some((x) => x.innerHTML.trim() === c.trim()), circle)), 'a plan block shows the placeholder circle');
    await ctx.close();
    // A reading block from the academic-writing goal: a book icon, and the goal the learner chose.
    const second = await newPage(browser, { viewport: { width: 1440, height: 900 } });
    await learnerAt(second.page, 'C1', { goals: ['work', 'writing'] });
    // Writing and a workplace scenario yesterday, so the goals' rotation comes to reading today.
    await second.page.evaluate(() => { for (const type of ['writing', 'speaking']) window.lucid.store.put('events', { id: `ev-${type}`, type, at: new Date(Date.now() - 86_400_000).toISOString() }); });
    await second.page.goto(`${BASE}#/today`);
    await second.page.waitForSelector('.plan a[href="#/reading"]');
    const reading = await second.page.$eval('.plan a[href="#/reading"]', (a) => ({ glyph: a.querySelector('.glyph').innerHTML.trim(), text: a.textContent }));
    assert(reading.glyph === (await svgOf(second.page, 'reading')).trim(), 'the reading block does not show the reading icon');
    assert(/כתיבה אקדמית/.test(reading.text) && !/בגרות|לימודים/.test(reading.text), `the reading block names a goal the learner did not choose: ${reading.text}`);
    if (SHOTS) await second.page.screenshot({ path: `${SHOTS}/lp1-today-c1-1440.png`, fullPage: true });
    await second.ctx.close();
  });

  await check('LP2. Today: every plan link opens content, weak real-life topics go to their scenario, and only what was done is ticked (R2-24, R2-27)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2');
    await page.evaluate(() => {
      const now = Date.now();
      // Yesterday's scripted practice: acceptable ("ok") replies, so the topic is not secure yet.
      for (let i = 0; i < 4; i++) window.lucid.store.put('attempts', { id: `sc${i}`, at: new Date(now - 86_400_000 + i * 1000).toISOString(), source: 'scenario', exercise: `rl-airport-checkin-overweight:${i}`, topic: 'travel-functional', skill: 'speaking', level: 'A2', correct: false, score: 0.5 });
    });
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    const hrefs = await page.$$eval('.plan a', (x) => x.map((a) => a.getAttribute('href')));
    assert(hrefs.includes('#/scenario/rl-airport-checkin-overweight?tab=practise'), `the weak travel topic does not go to its scenario: ${hrefs}`);
    assert(!hrefs.some((h) => /drill\?topic=(travel|social)-functional/.test(h)), `a plan block opens an empty drill: ${hrefs}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lp2-today-scenario-practice-390.png`, fullPage: true });
    for (const h of hrefs) {
      await page.goto(`${BASE}${h}`);
      await page.waitForTimeout(700);
      const txt = await page.textContent('#view');
      assert(!/אין עדיין תרגילים|No exercises for this/.test(txt) && txt.trim().length > 40, `${h} opens an empty page`);
    }
    // Today a different airport scenario was finished: the block shows that one, ticked, not the next one.
    await page.evaluate(() => {
      window.lucid.store.put('progress', { id: 'rl:rl-airport-arrival-immigration', status: 'completed', completed_at: new Date().toISOString() });
      window.lucid.store.put('events', { id: 'ev-sc', type: 'speaking', scenario: 'rl-airport-arrival-immigration', at: new Date().toISOString() });
    });
    await page.goto(`${BASE}#/today`);
    await page.waitForSelector('.plan');
    const done = await page.$$eval('.plan a.done', (x) => x.map((a) => a.getAttribute('href')));
    assert(done.every((h) => !/^#\/scenario\/rl-(?!airport-arrival-immigration)/.test(h)) && done.includes('#/scenario/rl-airport-arrival-immigration'), `ticked blocks: ${done}`);
    await ctx.close();
  });

  await check('LP3. Path: while the placement is pending there is no current level or "Next", only the test; the learner\'s level tab is in view (R2-15, R1-D2, R2-23)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'conversations' });
    await page.click('[data-begin]');
    for (let i = 0; i < 3; i++) { await page.click('#exroot .option'); await page.click('[data-answer]'); await page.waitForTimeout(60); }
    await page.click('.player-top a[href="#/today"]');
    await page.waitForSelector('a[href="#/placement?resume=1"]');
    await page.goto(`${BASE}#/path`);
    await page.waitForSelector('.lesson-list');
    assert(await page.$('#view a[href="#/placement?resume=1"]'), 'the path has no "Continue the test"');
    assert(!(await page.$('.lesson-row.next')) && !(await page.$('.lesson-row[aria-current="step"]')), 'the path marks a "Next" lesson while the test is pending');
    assert(!/הרמה הנוכחית שלך|Your current level/.test(await page.textContent('#view')), 'the path names a current level while the test is pending');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lp3-path-pending-390.png`, fullPage: true });
    await ctx.close();
    const b2 = await newPage(browser);
    await learnerAt(b2.page, 'B2');
    await b2.page.goto(`${BASE}#/path`);
    await b2.page.waitForSelector('.level-tab[aria-current="true"]');
    await b2.page.waitForTimeout(200);
    const fit = await b2.page.$eval('.level-tab[aria-current="true"]', (t) => { const r = t.getBoundingClientRect(); const p = t.parentElement.getBoundingClientRect(); return { inView: r.left >= p.left - 1 && r.right <= p.right + 1, name: t.textContent }; });
    assert(fit.inView && /B2/.test(fit.name), `the B2 tab is off screen: ${JSON.stringify(fit)}`);
    if (SHOTS) await b2.page.screenshot({ path: `${SHOTS}/lp3-path-b2-390.png` });
    await b2.ctx.close();
  });

  await check('LP4. Placement result says only what was confirmed and why it starts where it does; Progress recommends only what this learner can do (R2-29, R2-36, R2-38, R1-Y2, R2-03, R2-20)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'basics' });
    // Replays a finished run as a saved draft, so the real result screen draws it.
    const showResult = async (goals, rule, start) => {
      await page.evaluate(async ({ goals, rule, start }) => {
        const L = await import('./js/core/learner.js');
        const P = await import('./js/core/placement.js');
        const A = await import('./js/core/adaptive.js');
        const bank = await (await fetch('content/placement.json')).json();
        if (window.lucid.store.get('placement', 'latest')) window.lucid.store.remove('placement', 'latest');
        L.saveProfile({ goals, start_choice: { A1: 'basics', B2: 'advanced' }[start] });
        const knows = (l, item) => A.LEVELS.indexOf(item.level) <= A.LEVELS.indexOf(l);
        const answer = (item) => (rule === 'moshe' ? (item.level === 'A2' ? ['grammar', 'reading'].includes(item.skill) : knows('A1', item)) : knows('C1', item));
        const t = P.createPlacement(bank.items, { start, goals });
        let item;
        while ((item = t.next())) t.answer(item, { correct: answer(item) });
        L.savePlacementDraft({ start, answers: t.answers });
      }, { goals, rule, start });
      await page.goto(`${BASE}#/placement?t=${Date.now()}`);
      await page.click('[data-begin]');
      await page.waitForSelector('.onboard h1');
      return page.textContent('.onboard');
    };
    const moshe = await showResult(['travel'], 'moshe', 'A1');
    assert(/עד רמה A1/.test(moshe) && /נתחיל ב-A1/.test(moshe), `the start is not the confirmed A1: ${moshe.slice(0, 200)}`);
    const levels = await page.$$eval('.onboard .panel .row bdi', (x) => x.map((b) => b.textContent.trim()));
    assert(levels.every((l) => ['Pre-A1', 'A1'].includes(l)), `a skill shows more than the confirmed A1: ${levels}`);
    assert(!moshe.includes('B2+'), 'the C1/C2 note is shown to an A1 learner');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lp4-placement-a1-390.png`, fullPage: true });
    const eitan = await showResult(['work', 'writing'], 'c1', 'B2');
    assert(/C1/.test(eitan) && !/C1-C2/.test(eitan), `the headline claims C1-C2: ${eitan.slice(0, 200)}`);
    assert(/B2\+/.test(eitan) && /נראה טוב גם ב-C1/.test(eitan), 'capped skills do not say where their answers were');
    assert((await store(page, 'placement')).find((p) => p.id === 'latest').start_level === 'C1', 'academic writing chosen: the start should be C1');
    const yael = await showResult(['work', 'travel'], 'c1', 'B2');
    assert(/נתחיל ב-B2/.test(yael) && await page.$('[data-start-at="C1"]'), `a work and travel learner is started on the C1 track: ${yael.slice(0, 240)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lp4-placement-work-c1-390.png`, fullPage: true });
    await ctx.close();
    // Device only, Pre-A1, AI off: no AI writing advice and no C2 check in view.
    const noa = await newPage(browser);
    await onboard(noa.page, { start: 'zero' });
    await noa.page.evaluate(() => { for (let i = 0; i < 6; i++) window.lucid.store.put('attempts', { id: `n${i}`, at: new Date().toISOString(), source: 'lesson', lesson: 'pa1-01', exercise: `e${i}`, topic: 'alphabet', skill: 'vocabulary', level: 'PreA1', correct: i % 2 === 0, score: i % 2 === 0 ? 1 : 0 }); });
    await noa.page.goto(`${BASE}#/progress`);
    await noa.page.waitForSelector('.stat');
    const recs = await noa.page.$$eval('#view ul.stack-sm a', (x) => x.map((a) => a.getAttribute('href')));
    assert(!recs.includes('#/writing'), `AI writing feedback is recommended without AI: ${recs}`);
    const visibleChecks = await noa.page.$$eval('a[href^="#/checkpoint/"]', (x) => x.filter((a) => !a.closest('details:not([open])')).map((a) => a.getAttribute('href')));
    assert(!visibleChecks.includes('#/checkpoint/C2') && visibleChecks.includes('#/checkpoint/PreA1'), `level checks in view: ${visibleChecks}`);
    assert(await noa.page.$('details.more-checks'), 'higher level checks are not behind "Show all levels"');
    if (SHOTS) await noa.page.screenshot({ path: `${SHOTS}/lp4-progress-prea1-390.png`, fullPage: true });
    await noa.ctx.close();
  });

  // ---------- real life, bidi and privacy (persona panel round 1) ----------
  await check('RL1. Real life and Conversations: a start strip for the level and goals, level guidance, topic and level filters, topics folded to two, no placeholder icons (P-46, P-64)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'A2', { goals: ['travel'] });
    await page.goto(`${BASE}#/real-life`);
    await page.waitForSelector('.start-here');
    const start = await page.$$eval('.start-here .tag.level', (x) => x.map((t) => t.textContent.trim()));
    assert(start.length === 3 && start.every((l) => ['A1', 'A2'].includes(l)), `start strip is not at the learner's level: ${start}`);
    assert((await page.textContent('.level-guide:not(.offline-note)')).includes('A2'), 'no level guidance');
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
    // A hash change keeps the document, so the Real life view (with its own .hub-filters) may still be up: wait for
    // the Conversations page itself and its level guidance before reading them.
    await page.waitForSelector('.page-head a[href="#/real-life"]');
    await page.waitForFunction(() => document.querySelector('.level-guide')?.textContent.trim(), null, { timeout: 5000 }).catch(() => {});
    assert(await page.$('.page-head a[href="#/real-life"]') && (await page.$eval('.level-guide', (g) => g.textContent.trim()).catch(() => '')), 'Conversations is not grouped with Real life or has no level guidance');
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
    await page.click('[data-check-turn]'); // RW-1: a tap selects, "Check" commits
    await page.waitForSelector('[data-explain]');
    await page.waitForTimeout(200);
    const seen = await page.evaluate(() => { const e = document.querySelector('[data-explain]'); const r = e.getBoundingClientRect(); return { focused: document.activeElement === e, top: r.top, h: innerHeight }; });
    assert(seen.focused && seen.top >= 0 && seen.top < seen.h * 0.6, `the explanation is not brought into view: ${JSON.stringify(seen)}`);
    const alts = await page.$$eval('.alt-list > li', (x) => x.map((li) => ({ q: li.querySelector('.alt-quote')?.getAttribute('dir'), qd: getComputedStyle(li.querySelector('.alt-quote')).display, fb: Boolean(li.querySelector('.bi')) })));
    assert(alts.length === 2 && alts.every((a) => a.q === 'ltr' && a.qd === 'block' && a.fb), `other replies are not quote and feedback on their own lines: ${JSON.stringify(alts)}`);
    await page.click('[data-own-box] > summary');
    await page.fill('[data-own]', 'Hi, I work with Dana on the product team. How do you know her?');
    await page.click('[data-own-check]');
    const own = await page.textContent('.panel.flat');
    // RW-3: a question back alone is not praised; the check says what it looks for.
    assert(/לא מצאנו את המילים|did not find the words/.test(own) && /מחפשת מילות מפתח|looks for key words/.test(own) && !/נסו להשתמש|Try using/.test(own), `the own-words check reads as a judgement: ${own}`);
    for (let i = 0; i < 8 && await page.$('[data-next-turn], [data-opt]:not([disabled])'); i++) {
      if (!(await page.$('[data-next-turn]'))) { await page.click('[data-opt]:not([disabled])'); await page.click('[data-check-turn]'); }
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
    assert(/פרטים אישיים אמיתיים/.test(await page.textContent('[data-no-real-details]')), 'the roleplay does not say to make up personal details');
    await page.click('[data-start-rp]');
    await page.waitForSelector('#rplog');
    assert(await page.$('[data-no-real-details]'), 'the roleplay chat does not say to make up personal details');
    await page.fill('#rpin', 'um');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForSelector('.hint-box bdi');
    let body = db.aiBodies.at(-1);
    assert(body.corrections === 'light' && ['full', 'partial'].includes(body.hebrew_support), `roleplay request: ${JSON.stringify({ c: body.corrections, h: body.hebrew_support })}`);
    const hint = await page.evaluate(() => { const b = document.querySelector('.hint-box bdi'); return { iso: b.textContent.replace(/[\u2011]/g, '-').replace(/\u00a0/g, ' '), after: b.nextSibling?.textContent }; });
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
    await page.click('[data-filters]'); // RW-10: the filters sit behind one key
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
      const dotNode = a.querySelector('bdi').nextSibling;
      const dot = charBox(dotNode, dotNode.length - 1);
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
    await page.click('[data-check-turn]');
    await page.click('[data-own-box] > summary');
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
    // No minimum age (November 2026): the policy says so in both languages and no longer claims a 16+ limit.
    assert(policy.includes('אין גיל מינימלי') && policy.includes('no minimum age') && policy.includes('מתחת לגיל 16') && policy.includes('under 16') && !/16 ומעלה|aged 16 and over|16-17/.test(policy), 'privacy.html does not describe the age rules as they are');
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
    // Device only: no AI consent, one honest line instead (UX r3 TF-7); the AI details show only where AI works.
    assert(/מיקרופון|microphone/.test(step) && /AI לא פעיל באתר הזה/.test(step) && !(await page.$('input[name=ai_consent]')) && !/מחמירות|strictest/.test(step), `onboarding privacy step: ${step}`);
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
    // Each screen with what it shows when it works: an error screen fails, and so does a screen without its content.
    for (const [r, sel] of [['review', '.review-empty, .review, #exroot'], ['conversations', '.hub-filters'], ['real-life', '.hub-row'], ['expressions', '.entry'], ['scenario/rl-airport-checkin-overweight', '.scenario-view'], ['lesson/b1-03', '.lesson-player'], ['writing', '.stage-panel .hub-row'], ['progress', '.page-head + .stack-lg']]) {
      await page.goto(`${BASE}#/${r}`);
      const shown = await page.waitForSelector(`#view :is(${sel})`, { timeout: 15000 }).then(() => true).catch(() => false);
      const problem = await screenProblem(page);
      assert(shown && !problem, `${r} failed offline: ${problem || `no ${sel}: ${(await page.textContent('#view')).trim().slice(0, 100)}`}`);
    }
    await page.reload();
    await page.waitForSelector('#view > :not(.boot)');
    assert(!(await screenProblem(page)), 'reload failed offline');
    await ctx.close();
  });

  // perf D4: the precache alone (no lesson saved) is enough for every screen that needs no lesson file.
  await check('OF2. Offline sweep: right after the worker installs, with the network cut, 13 screens render without a lesson saved (perf D4)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    await learnerAt(page, 'A1');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });
    await ctx.setOffline(true);
    // Each screen with what it shows when its content loaded (the scenario, the expressions, the essay box...).
    const routes = [['today', '.today'], ['path', '.level-tabs'], ['practice', '.page-head + .stack-lg'], ['review', '.review-empty, .review, #exroot'], ['vocab', '.page-head'], ['games', '.game-section'], ['real-life', '.hub-row'], ['scenario/rl-airport-checkin-overweight', '.scenario-view'], ['expressions', '.entry'], ['writing', '.stage-panel .hub-row'], ['writing/final-B2', '#essay'], ['progress', '.page-head + .stack-lg'], ['settings', '.settings-view']];
    const failed = [];
    for (const [r, sel] of routes) {
      await page.goto(`${BASE}#/${r}`);
      const shown = await page.waitForSelector(`#view :is(${sel})`, { timeout: 15000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(300);
      const problem = await screenProblem(page);
      if (!shown || problem) failed.push(`${r}: ${problem || `no ${sel}: ${((await page.textContent('#view')) || '').trim().slice(0, 80)}`}`);
    }
    assert(!failed.length, `failed offline: ${failed.join(' | ')}`);
    await page.reload();
    await page.waitForSelector('#view > :not(.boot)');
    assert(!(await screenProblem(page)), 'reload failed offline');
    await ctx.close();
  });

  await check('RL7. A past AI conversation can be deleted from Conversations; only its id is kept for sync (S-18)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 } });
    await onboard(page, { start: 'zero' });
    await page.evaluate(() => window.lucid.store.put('chats', { id: 'rp-test', kind: 'roleplay', scenario: 'rl-airport-checkin-overweight', turns: [{ role: 'learner', text: 'Hi, I would like to check in.' }], report: { task_completed: true, summary: 'ok' }, done: true, at: new Date().toISOString() }));
    await page.goto(`${BASE}#/conversations`);
    await page.waitForSelector('[data-del-chat="rp-test"]');
    await page.click('[data-del-chat="rp-test"]');
    await page.click('dialog[open] button[value="yes"]');
    await page.waitForFunction(() => !document.querySelector('[data-del-chat="rp-test"]'));
    const raw = await page.evaluate(() => window.lucid.store.all('chats', { includeDeleted: true }).find((c) => c.id === 'rp-test'));
    assert(!raw || (!raw.turns && !raw.report), `deleted conversation still holds content: ${JSON.stringify(raw).slice(0, 120)}`);
    await ctx.close();
  });

  await check('WG1. Word game: levels and stages; an answer is marked right or wrong at once; a 10-question round ends with a score, a best and words to review', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 } });
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/practice`);
    await page.click('main a[href="#/games"]');
    await page.waitForSelector('.game-levels');
    assert((await page.$$('.game-levels > li')).length === 7, 'not seven levels');
    assert(await page.$('a.game-stage[href="#/games/A1/1"]'), 'stage 1 not open');
    assert(!(await page.$('a.game-stage[href="#/games/A1/2"]')), 'stage 2 open before stage 1 was played');
    await page.click('a.game-stage[href="#/games/PreA1/1"]');
    for (let q = 0; q < 10; q++) {
      await page.waitForSelector('[data-opt]:not([disabled])');
      assert(!(await page.$('[data-check]')), 'a check button appeared for a choice question');
      const t0 = Date.now();
      await page.click(`[data-opt="${q % 4}"]`);
      await page.waitForSelector('.game-verdict');
      assert(Date.now() - t0 < 1500, 'feedback was not immediate');
      assert(await page.$('.option.is-right'), 'the right answer is not shown');
      await page.click('[data-next]', { timeout: 400 }).catch(() => {}); // it also moves on by itself
    }
    await page.waitForSelector('.game-total');
    const total = Number((await page.textContent('.game-total')).match(/\d+/)[0]);
    const ev = await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'game-round'));
    assert(ev.length === 1 && ev[0].score === total && ev[0].total === 10, `round not logged once: ${JSON.stringify(ev)}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'game-round').length)) === 1, 'Enter on the results counted the round again');
    if (await page.$('[data-add]')) {
      await page.click('[data-add]');
      const cards = await page.evaluate(() => window.lucid.store.all('cards'));
      assert(cards.length > 0 && cards.every((c) => /^v:.+:meaning$/.test(c.id) && c.ref?.via === 'game' && c.payload?.word), `missed words not added as review cards: ${JSON.stringify(cards[0]).slice(0, 160)}`);
    }
    // Play again: the new result is compared with the best so far, not with the bests from before the first round.
    const first = await page.evaluate(() => window.lucid.store.all('events').find((e) => e.type === 'game-round'));
    await page.click('[data-again]');
    for (let q = 0; q < 10; q++) {
      await page.waitForSelector('[data-opt]:not([disabled])');
      await page.click('[data-opt="0"]');
      await page.waitForSelector('.game-verdict');
      await page.click('[data-next]', { timeout: 400 }).catch(() => {});
    }
    await page.waitForSelector('.game-total');
    const second = await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'game-round').at(-1));
    const resultText = await page.textContent('.game-result');
    const better = second.correct > first.correct || (second.correct === first.correct && second.score > first.score);
    assert(better ? /New best|שיא חדש/.test(resultText) : /Your best|השיא שלכם/.test(resultText), `second round compared with the wrong best: ${resultText.slice(0, 160)}`);
    assert(!/first best|השיא הראשון/.test(resultText), 'second round called the first best');
    // Enter on the exit link leaves the game.
    await page.click('[data-again]');
    await page.waitForSelector('[data-opt]');
    await page.focus('.player-top a[href="#/games"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.game-levels');
    await ctx.close();
  });

  await check('WG2. Word game completion: a right spelling is accepted as it is typed; a wrong one is marked on Enter with the answer shown; stages open at 70%', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1280, height: 860 } });
    await onboard(page, { start: 'zero' });
    await page.evaluate(() => { for (const stage of [1, 2]) window.lucid.store.put('events', { id: `ev-g${stage}`, at: new Date().toISOString(), type: 'game-round', level: 'A1', stage, score: 120, correct: 8, total: 10, accuracy: 0.8 }); });
    await page.goto(`${BASE}#/games`);
    await page.waitForSelector('a.game-stage[href="#/games/A1/3"]');
    await page.click('a.game-stage[href="#/games/A1/3"]');
    await page.waitForSelector('#gw');
    // Find the hidden word from the lesson data, as a learner who knows it would.
    const answer = await page.evaluate(async () => {
      const { content } = await import('./js/core/content.js');
      const { wordPool } = await import('./js/core/wordgame.js');
      const cur = await content.curriculum();
      const ids = cur.levels.find((l) => l.id === 'A1').lessons.map((l) => l.id);
      const pool = wordPool((await Promise.all(ids.map((id) => content.lesson(id)))).filter(Boolean), 'A1');
      const text = document.querySelector('.game-sentence').textContent;
      const w = pool.find((x) => { const m = x.example.match(new RegExp(`(?<![A-Za-z])${x.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'i')); return m && x.example.slice(0, m.index) + x.example.slice(m.index + m[0].length) === text; });
      return w ? w.example.match(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))[0] : null;
    });
    assert(answer, 'could not find the hidden word');
    await page.type('#gw', answer, { delay: 20 });
    await page.waitForSelector('.game-verdict.ok', { timeout: 2000 });
    assert(await page.evaluate(() => document.activeElement?.id === 'gw'), 'focus left the input, which would close a phone keyboard');
    // UX r3 GM-6: after an answer the footer holds Continue, so no active Check remains.
    assert(!(await page.$('[data-check]:not([disabled])')) && await page.$('#pfoot [data-next]'), 'check still active, or no Continue key, after an accepted answer');
    await page.click('[data-next]', { timeout: 400 }).catch(() => {});
    await page.waitForSelector('#gw:not([readonly])');
    assert(await page.evaluate(() => document.activeElement?.id === 'gw'), 'the next question did not keep the input focused');
    await page.type('#gw', 'qqqqqq');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.game-verdict.bad');
    assert(/Answer:|התשובה:/.test(await page.textContent('.game-verdict')), 'the right answer is not shown after a wrong one');
    await ctx.close();
  });

  await check('PG1. Words and pictures: listed after the learner\'s level on the games page; level 2 locked at first; a pair is marked right or wrong at once; a mistake costs points and lists the picture\'s word; a keyboard-finished board waits; a double tap on "See results" keeps the results; a 3-board round is logged once and opens level 2', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 } });
    const pics = JSON.parse(readFileSync(join(repo, 'lucid', 'content', 'pictures.json'), 'utf8'));
    const byHe = new Map(pics.sets.flatMap((s) => s.words).map((w) => [w.he, w.word]));
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/games`);
    await page.waitForSelector('a.game-stage[href="#/games/pictures/1"]');
    await page.waitForTimeout(200);
    const inView = () => page.$eval('#lvl-pictures', (x) => { const r = x.getBoundingClientRect(); return r.top >= -1 && r.top < innerHeight / 2; });
    // UX r3 GM-3: the learner's own level comes first on a first visit; the picture game follows it.
    assert(await page.$eval('#lvl-pictures', (x) => x.getBoundingClientRect().top > document.querySelector('.game-mine').getBoundingClientRect().top), 'the learner\'s level is not first');
    assert(!(await page.$('a.game-stage[href="#/games/pictures/2"]')), 'level 2 open before level 1 was played');
    await page.click('a.game-stage[href="#/games/pictures/1"]');
    const wordOf = async (k) => byHe.get(await page.textContent(`[data-pic="${k}"] [data-he]`));
    let wrongDone = false, wrongPic = null;
    for (let bd = 0; bd < 3; bd++) {
      await page.waitForSelector('.pic-tile:not([disabled])');
      assert(!(await page.$('.pic-tile[aria-pressed="true"], .pic-word[aria-pressed="true"]')), 'a card was chosen by the tap that opened the board');
      await page.waitForTimeout(500); // taps in the first moment of a board are dropped (a double tap on the button before)
      const n = (await page.$$('.pic-tile')).length;
      assert(n === 4, `level 1 board has ${n} pictures`);
      const words = await page.$$eval('[data-word]', (xs) => xs.map((x) => x.textContent.trim()));
      if (!wrongDone) {
        const right = await wordOf(0);
        wrongPic = right;
        const other = words.findIndex((w) => w !== right);
        const t0 = Date.now();
        await page.click('[data-pic="0"]');
        assert((await page.getAttribute('[data-pic="0"]', 'aria-pressed')) === 'true', 'the chosen picture is not marked as chosen');
        await page.click(`[data-word="${other}"]`);
        await page.waitForSelector('.pic-tile.is-wrong, #gfb .bad-text');
        assert(Date.now() - t0 < 1500, 'a wrong pair was not marked at once');
        assert((await page.textContent('.game-score')).match(/-?\d+/)[0] === '0', 'a mistake before any pair took the score below 0');
        wrongDone = true;
      }
      const keyboard = bd === 1;
      for (let k = 0; k < n; k++) {
        const w = await wordOf(k);
        const idx = words.indexOf(w);
        assert(idx >= 0, `no word for picture ${k}`);
        const before = (await page.$$('.pic-tile.is-right')).length;
        if (keyboard) {
          await page.focus(`[data-pic="${k}"]`); await page.keyboard.press('Enter');
          await page.focus(`[data-word="${idx}"]`); await page.keyboard.press('Space');
        } else {
          // Word first, then picture: either order works.
          await page.click(`[data-word="${idx}"]`);
          await page.click(`[data-pic="${k}"]`);
        }
        assert((await page.$$('.pic-tile.is-right')).length === before + 1, 'a right pair was not marked at once');
        assert(await page.$eval(`[data-pic="${k}"]`, (x) => x.disabled && x.querySelector('.pic-he').textContent.length > 0 && /matched|הותאמה/.test(x.textContent)), 'a matched picture is not locked with its Hebrew and "matched"');
        if (keyboard && k < n - 1) assert(await page.evaluate(() => document.activeElement?.matches('.pic-tile:not(:disabled)')), 'focus left the board after a match');
      }
      await page.waitForSelector('[data-nextboard]');
      if (keyboard) {
        await page.waitForTimeout(2800);
        assert(await page.evaluate(() => document.activeElement?.matches('[data-nextboard]')), 'a board finished with the keyboard moved on by itself');
        await page.keyboard.press('Enter');
      } else if (bd === 2) {
        // A double tap on "See results": the second tap must not press what appears under it.
        await page.dblclick('[data-nextboard]');
        await page.waitForTimeout(300);
        assert(/pictures\/1$/.test(page.url()) && await page.$('.game-total'), `a double tap skipped the results (${page.url()})`);
      } else await page.dblclick('[data-nextboard]', { timeout: 400 }).catch(() => {}); // a double tap; it also moves on by itself
    }
    await page.waitForSelector('.game-total');
    const total = Number((await page.textContent('.game-total')).match(/\d+/)[0]);
    const ev = await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'picture-round'));
    assert(ev.length === 1 && ev[0].matches === 12 && ev[0].mistakes === 1 && ev[0].score === total && ev[0].level === 1, `round not logged once and right: ${JSON.stringify(ev)}`);
    assert(total >= 12 * 10 - 3 && total <= 12 * 10 - 3 + 15, `score ${total} does not follow the rules`);
    // UX r3 GM-4: only the picture that was given a wrong word is listed, not the word chosen for it.
    const listed = await page.$$eval('.pic-missed strong', (xs) => xs.map((x) => x.textContent));
    assert(listed.length === 1 && listed[0] === wrongPic, `the wrong pair did not list just the picture's word: ${listed} (${wrongPic})`);
    assert(await page.$('a[href="#/games/pictures/2"]'), 'level 2 did not open at 92% accuracy');
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'picture-round').length)) === 1, 'the round was counted twice');
    // Missed words come first in the next round.
    const missed = await page.$$eval('.pic-missed strong', (xs) => xs.map((x) => x.textContent));
    await page.click('[data-missed]');
    await page.waitForSelector('.pic-tile:not([disabled])');
    await page.waitForTimeout(500);
    const seen = [];
    for (let k = 0; k < (await page.$$('.pic-tile')).length; k++) seen.push(await wordOf(k));
    assert(missed.every((m) => seen.includes(m)), `missed words ${missed} are not on the first board of a focus round (${seen})`);
    // The hub shows the best and the open level.
    await page.goto(`${BASE}#/games`);
    await page.waitForSelector('a.game-stage[href="#/games/pictures/2"]');
    await page.waitForTimeout(200);
    assert(await inView(), 'back from the picture game, the games page is not at the picture levels');
    assert(/92%/.test(await page.textContent('a.game-stage[href="#/games/pictures/1"]')), 'the best accuracy is not on the hub');
    await ctx.close();
  });

  await check('MG1. Memory game: cards hide what they are until turned; each turn is marked at once and a mismatch stays up until the next card; only a mismatch after the pair was seen is a slip; a round is logged once, and level 2 opens through the picture game (UX r4 PG-4)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 } });
    const pics = JSON.parse(readFileSync(join(repo, 'lucid', 'content', 'pictures.json'), 'utf8'));
    const byHe = new Map(pics.sets.flatMap((s) => s.words).map((w) => [w.he, w.word]));
    await onboard(page, { start: 'zero' });
    await page.goto(`${BASE}#/games`);
    await page.waitForSelector('a.game-stage[href="#/games/memory/1"]');
    assert(!(await page.$('a.game-stage[href="#/games/memory/2"]')), 'memory level 2 open before level 1 was played');
    await page.click('a.game-stage[href="#/games/memory/1"]');
    await page.waitForSelector('.mem-card');
    await page.waitForTimeout(500);
    const n = (await page.$$('.mem-card')).length;
    assert(n === 12, `level 1 has ${n} cards`);
    assert(!(await page.$('.mem-card [data-he], .mem-card [data-word]')), 'a face-down card shows what it is');
    const idOf = async (i) => { const he = await page.$(`[data-card="${i}"] [data-he]`); return he ? byHe.get(await he.textContent()) : (await page.textContent(`[data-card="${i}"] [data-word]`)).trim(); };
    const known = new Map();
    const found = () => page.$$eval('.mem-card:disabled', (xs) => xs.map((x) => Number(x.dataset.card)));
    let slipped = false, sawMismatch = false, keyboardTurns = 0, slipWord = null;
    const flip = async (i) => {
      if (keyboardTurns < 2) { await page.focus(`[data-card="${i}"]`); await page.keyboard.press('Enter'); } else await page.click(`[data-card="${i}"]`);
      known.set(i, await idOf(i));
    };
    for (let guard = 0; guard < 40; guard++) {
      const done = new Set(await found());
      if (done.size === n) break;
      let pair = null;
      for (const [i, wi] of known) for (const [j, wj] of known) if (i < j && wi === wj && !done.has(i)) pair = [i, j];
      if (pair) { await flip(pair[0]); await flip(pair[1]); keyboardTurns++; await page.waitForTimeout(150); continue; }
      const fresh = [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i));
      await flip(fresh);
      const partner = [...known].find(([j, wj]) => j !== fresh && wj === known.get(fresh) && !done.has(j))?.[0];
      let second = partner;
      if (partner !== undefined && !slipped) {
        // One deliberate slip: the pair was seen, another card is chosen.
        second = [...Array(n).keys()].find((i) => i !== fresh && i !== partner && !done.has(i));
        slipped = true;
        slipWord = known.get(fresh);
      } else if (partner === undefined) second = [...Array(n).keys()].find((i) => !known.has(i) && !done.has(i) && i !== fresh);
      const t0 = Date.now();
      await flip(second);
      keyboardTurns++;
      if (known.get(second) !== known.get(fresh)) {
        await page.waitForSelector('.mem-card.is-wrong');
        assert(Date.now() - t0 < 1500, 'a mismatch was not marked at once');
        if (!sawMismatch) {
          sawMismatch = true;
          // Calm pace (the default): the mismatch stays face up until the next card is chosen (UX r3 GM-1).
          await page.waitForTimeout(1600);
          assert(await page.$(`[data-card="${fresh}"] [data-he], [data-card="${fresh}"] [data-word]`), 'a mismatched card turned back by itself');
        }
      } else assert(await page.$eval(`[data-card="${second}"]`, (x) => x.disabled && x.classList.contains('is-right')), 'a match was not kept face up');
    }
    assert(slipped, 'the test never had the chance to slip');
    await page.waitForSelector('.game-total');
    const total = Number((await page.textContent('.game-total')).match(/\d+/)[0]);
    const ev = await page.evaluate(() => window.lucid.store.all('events').filter((e) => e.type === 'memory-round'));
    assert(ev.length === 1 && ev[0].matches === 6 && ev[0].slips === 1 && ev[0].score === total && Math.abs(ev[0].accuracy - 6 / 7) < 1e-9, `round not logged once and right: ${JSON.stringify(ev)}`);
    const listed = await page.$$eval('.pic-missed strong', (xs) => xs.map((x) => x.textContent));
    // UX r3 GM-5: a slip of place is not a word to go over; only a picture paired with a word card already seen is.
    assert(listed.length <= 1, `more words listed to go over than the one turn that could be a miss (${listed}; ${slipWord})`);
    assert(!(await page.$('a[href="#/games/memory/2"]')) && await page.$('.game-result a[href="#/games/pictures/1"]'), 'memory level 2 opened on calm memory accuracy, or the result does not point to the picture game (UX r4 PG-4)');
    await page.waitForTimeout(500);
    await page.click('[data-again]');
    await page.waitForSelector('.mem-card');
    assert((await page.$$('.mem-card')).length === 12 && !(await page.$('.mem-card:disabled')), '"Play again" did not deal a fresh board');
    await page.goto(`${BASE}#/games`);
    await page.waitForSelector('a.game-stage[href="#/games/memory/1"]');
    assert(/6 זוגות ב-\d+ תורות/.test(await page.textContent('a.game-stage[href="#/games/memory/1"]')), 'the memory best is not on the games page');
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
    // r4 EX-9: keeping the microphone off is a neutral note (role=status), not an error.
    await page.waitForSelector('#exroot .speak-note[role="status"]');
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
    // LF-7: the first pass shows no running tally of mistakes; the retry comes later, in its own round.
    assert((await page.textContent('.step-count')).trim() === `2 מתוך ${total}`, `total moved or a running tally shown: ${await page.textContent('.step-count')}`);
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
    await page.goto(`${BASE}#/tutor?mode=pronunciation`); // PH-5: without AI on the site the mode chips are hidden
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
    // PH-1/PH-2: options show the short gloss and a tap selects; Check commits.
    for (const b of picks) if (!rightHe.startsWith((await b.$eval('span:not(.k)', (s) => s.textContent)).trim())) { await b.click(); break; }
    await page.click('[data-check]');
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
    // LF-2: the explanation comes in steps; go on to the step with the first table.
    await page.waitForSelector('.lesson-learn');
    for (let s = 0; s < 6 && !(await page.$('.lesson-learn .table-wrap')); s++) await page.click('[data-learn-next]');
    const en = await page.evaluate(() => { const s = document.querySelector('.lesson-learn .bi-en'); const cs = getComputedStyle(s); return { display: cs.display, dir: cs.direction, align: cs.textAlign }; });
    assert(en.display === 'block' && en.dir === 'ltr' && ['start', 'left'].includes(en.align), `English explanation is not a left-aligned block: ${JSON.stringify(en)}`);
    // LF-3: on a phone the rows are cards, so the first cell starts after the card's own padding (1rem).
    const table = await page.evaluate(() => { const w = document.querySelector('.lesson-learn .table-wrap'); const td = w.querySelector('tbody td').getBoundingClientRect(); return { dir: getComputedStyle(w).direction, firstLeft: td.left - w.getBoundingClientRect().left, overflow: getComputedStyle(w).overflowX }; });
    assert(table.dir === 'ltr' && table.firstLeft < 24 && table.overflow === 'auto', `English table does not start at its first column: ${JSON.stringify(table)}`);
    await ctx.close();
  });

  // ---------- lesson player, i18n and speaking: persona round 2 ----------
  const bdiOf = (page, sel) => page.$$eval(`${sel} bdi`, (x) => x.map((b) => b.textContent.replace(/[\u2011]/g, '-').replace(/\u00a0/g, ' ')));
  await check('PL1. Brackets stay with their English inside Hebrew; "Why?" explains the item, not its error type in general (R2-01, R2-04)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await lessonAt(page, 'pa1-08', 'e5');
    await page.evaluate(() => { const g = document.querySelectorAll('#exroot .gap-input'); g[0].value = 'first'; g[1].value = 'three'; g.forEach((x) => x.dispatchEvent(new Event('input', { bubbles: true }))); });
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-next], [data-show-answer]');
    if (await page.$('[data-show-answer]')) { await page.click('[data-show-answer]'); await page.waitForSelector('[data-next]'); } // LF-6: a second try first
    const iso = await bdiOf(page, '#pfoot');
    assert(iso.includes('third (3rd)'), `the bracket pair is split: ${JSON.stringify(iso)}`);
    await page.click('#pfoot details.why > summary').catch(() => {});
    const why = await page.textContent('#pfoot');
    assert(!/make a decision|strong coffee/.test(why), `"Why?" shows the general word-choice note: ${why}`);
    // The summary's key point: "double (A, double N, A)." keeps both brackets in the English.
    await lessonAt(page, 'pa1-01', null);
    const kp = await bdiOf(page, '.point-list');
    assert(kp.includes('double (A, double N, A)'), `key point isolates: ${JSON.stringify(kp)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pl1-keypoint.png`, fullPage: true });
    await ctx.close();
  });

  await check('PL2. After "Nearly there" the intro offers only the missed exercises; a near miss never reads as the pass mark (R2-02, R2-25, R2-26)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    const lesson = lessonJson('a2-01');
    const scored = lesson.exercises.filter((e) => !['speak', 'write'].includes(e.type)).map((e) => e.id);
    // First tries that average 0.696: one miss, the rest right enough not to count as missed (Math.round would
    // show 70%). A reading text or a sort is scored per question and missed under 0.8 (LF-9), so those two are 1.
    const perQ = new Set(lesson.exercises.filter((e) => ['read', 'categorize'].includes(e.type)).map((e) => e.id));
    const x = (0.696 * scored.length - perQ.size) / (scored.length - 1 - perQ.size);
    await lessonAt(page, 'a2-01', null, Object.fromEntries(scored.map((id, i) => [id, i === 1 ? 0 : perQ.has(id) ? 1 : x])));
    const summary = await page.textContent('.player-body');
    assert(/כמעט שם|Nearly there/.test(summary) && /69%/.test(summary) && !/\b70% (בניסיון|on the first)/.test(summary), `a near miss reads as the pass mark: ${summary.slice(0, 200)}`);
    await page.click('.player a[href="#/today"]'); // r4 LF-9: "להיום" is a text link above the footer
    await page.waitForSelector('.start-bar, .plan, .banner');
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    assert(await page.$('[data-missed-banner]'), 'the intro does not say the lesson is nearly done');
    const primary = await page.textContent('#pfoot .key.enter');
    assert(/data-missed/.test(await page.innerHTML('#pfoot')) && /(1 I missed|לתרגל את הטעות)/.test(primary), `the main action is not the missed exercise: ${primary}`);
    assert(await page.$('#pfoot [data-skip-learn]'), '"Practise everything again" is not offered');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#exroot');
    assert((await page.textContent('.step-count')).trim() === '1 מתוך 1', `not the missed exercise only: ${await page.textContent('.step-count')}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pl2-missed-intro.png` });
    await ctx.close();
  });

  await check('PL3. Today\'s part: the intro states the real length and the part; the player stops there with "Stop here" or "Keep going" (R2-28, R1-N7, R1-D3)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const P = await import('./js/core/placement.js'); await L.applyPlacement(P.selfReportResult('A2')); });
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', daily_minutes: 10 }));
    const upto = await page.evaluate(async () => { const L = await import('./js/core/learner.js'); const l = await (await fetch('content/lessons/a2-01.json')).json(); return L.todayPlan(10, { lesson: l }).blocks.find((b) => b.id === 'learn').slice.upto; });
    assert(upto > 1 && upto < 16, `no part planned: ${upto}`);
    await page.goto(`${BASE}#/lesson/a2-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    const line = await page.textContent('[data-part-line]');
    // LF-1: the part is one short line under the main key; the lesson's length is in the line above the title.
    assert(/25/.test(await page.textContent('.lesson-intro')) && new RegExp(`(עד תרגיל|up to exercise) ${upto} `).test(line), `the intro does not state the length and the part: ${line}`);
    await page.click('[data-skip-learn]');
    for (let i = 0; i < upto; i++) {
      await page.waitForSelector('#exroot');
      await answerCurrent(page);
      const c = await page.$('[data-check]:not([disabled])'); if (c) await c.click(); else if (!(await page.$('[data-next]'))) await page.click('[data-dontknow]'); // a finished matching board checks itself (EX-1)
      if (i < upto - 1 || await page.$('[data-next]')) { await page.waitForSelector('[data-next]'); await page.click('[data-next]'); }
    }
    await page.waitForSelector('.part-end');
    assert(/החלק של היום הושלם|Today's part is done/.test(await page.textContent('.part-end h1')), 'no end-of-part screen');
    assert(await page.getAttribute('[data-part-stop]', 'href') === '#/today' && await page.$('[data-part-go]'), 'no stop/continue choice');
    assert(await page.evaluate(() => document.activeElement?.tagName === 'H1' && window.scrollY === 0), 'the part screen does not open at its heading');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pl3-part-end.png` });
    await page.click('[data-part-go]');
    await page.waitForSelector('#exroot');
    assert((await page.textContent('.step-count')).startsWith(`${upto + 1} `), `keep going does not continue: ${await page.textContent('.step-count')}`);
    await ctx.close();
  });

  await check('PL4. Hebrew support follows the level shown at placement; partial support folds long paragraphs; shadowing opens at the level (R2-06, R1-D10, R1-A10, R2-05)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    await page.evaluate(async () => { const L = await import('./js/core/learner.js'); await L.applyPlacement({ demonstrated: 'A2', level: 'A2', start_level: 'B1', items: 16, answers: [], skills: {} }); });
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.dataset.support) === 'partial', 'placement showed A2 but support is not partial');
    await page.goto(`${BASE}#/lesson/b1-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    assert(await page.$('.lesson-intro .point .bi-he-after:not([hidden])'), 'objectives have no Hebrew at partial support');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    // A step drawn before its fonts arrived (the IPA font loads on demand) is measured and drawn again once they
    // have (lesson.js remeasure): the folds are looked up after that, so the click lands on the step on screen.
    await page.evaluate(() => document.fonts.ready);
    const folds = await page.$$('.lesson-learn .he-reveal-text');
    assert(folds.length >= 2, `long paragraphs are not folded (${folds.length})`);
    await folds[0].click();
    assert(await folds[0].evaluate((b) => !b.nextElementSibling.hidden && b.getAttribute('aria-expanded') === 'true'), 'the paragraph\'s Hebrew does not open');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pl4-partial-learn.png` });
    await page.goto(`${BASE}#/speaking`);
    await page.waitForSelector('#sp-shadow-list details');
    const open = await page.$$eval('#sp-shadow-list details[open]', (d) => d.map((x) => x.dataset.level));
    assert(open.length === 1 && open[0] === 'B1', `shadowing does not open at the level: ${open}`);
    const href = await page.getAttribute('[data-next-shadow]', 'href');
    assert(/speaking\?l=b1-/.test(href), `the next sentence is not at the level: ${href}`);
    await page.goto(`${BASE}${href}`);
    await page.waitForSelector('#exroot .speak-focus');
    assert(await page.$('#exroot .speak-focus .bi-he:not([hidden])'), 'the articulation note has no Hebrew');
    await ctx.close();
  });

  await check('PL5. Speaking at 150% text: Hear it and Say it on the first screen; words not caught are grey, not red (R2-19, R2-08)', async () => {
    const { ctx, page } = await newPage(browser);
    await fakeRecognition(ctx);
    await page.addInitScript(() => localStorage.setItem('lucid-mic-notice', '1'));
    await learnerAt(page, 'PreA1', { text: 150 });
    await lessonAt(page, 'pa1-01', 'e12');
    const box = await page.evaluate(() => ({ rec: document.querySelector('#exroot [data-rec]')?.getBoundingClientRect().bottom, foot: document.querySelector('#pfoot')?.getBoundingClientRect().top, fold: Boolean(document.querySelector('#exroot details.speak-focus-fold:not([open])')) }));
    assert(box.rec && box.rec <= box.foot, `Say it is below the fold at 150%: ${JSON.stringify(box)}`);
    assert(box.fold, 'the pronunciation tip is not folded at large text');
    await page.click('#exroot [data-rec]');
    await page.waitForSelector('#exroot .recognised');
    const rec = await page.evaluate(() => ({ miss: document.querySelectorAll('#exroot .w-miss').length, uncaught: [...document.querySelectorAll('#exroot .word-diff .w-uncaught')].map((x) => getComputedStyle(x).textDecorationStyle), text: document.querySelector('#exroot .recognised').textContent }));
    assert(!rec.miss && rec.uncaught.length && rec.uncaught.every((s) => s === 'dotted'), `missed words look like errors: ${JSON.stringify(rec)}`);
    assert(/לא נקלט|not caught/.test(rec.text) && /מאויתות|spelled letters/.test(rec.text), `no "not caught" key or spelled-letters note: ${rec.text}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pl5-speak-150.png` });
    await ctx.close();
  });

  await check('PL6. English blocks in Hebrew screens, wide tables say they scroll, find-and-fix counts an equivalent answer, an unsaved lesson offline points to what works (R2-18, R1-M9, R2-32, R1-E2, R2-11)', async () => {
    const { ctx, page } = await newPage(browser);
    await onboard(page, { start: 'zero' });
    // Listening transcript: its own left-to-right block.
    await lessonAt(page, 'pa1-01', 'e2');
    await page.click('#exroot [data-opt]');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('#exroot .transcript .en-block');
    const tr = await page.$eval('#exroot .transcript .en-block', (p) => { const cs = getComputedStyle(p); return { dir: cs.direction, display: cs.display, align: cs.textAlign }; });
    assert(tr.dir === 'ltr' && tr.display === 'block' && ['start', 'left'].includes(tr.align), `transcript is not an LTR block: ${JSON.stringify(tr)}`);
    // LF-3 (replacing R2-32's cue at this width): at 390 px a table of three or more columns is a stack of
    // cards with nothing to scroll sideways. The cue stays for a table still wider than its frame (lane e2e).
    await page.goto(`${BASE}#/lesson/b2-01?t=${Date.now()}`);
    await page.waitForSelector('.lesson-intro');
    await page.click('[data-go="learn"]');
    await page.waitForSelector('.lesson-learn');
    for (let s = 0; s < 6 && !(await page.$('.lesson-learn .table-wrap')); s++) await page.click('[data-learn-next]');
    const wide = await page.evaluate(() => [...document.querySelectorAll('.lesson-learn .table-wrap')].map((w) => ({ over: w.scrollWidth > w.clientWidth + 2, hint: !w.previousElementSibling.hidden, cards: w.classList.contains('tstack') })));
    assert(wide.length && wide.every((w) => !w.over && !w.hint && w.cards), `a table still scrolls sideways at 390 px: ${JSON.stringify(wide)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pl6-wide-table.png` });
    // Find and fix at C1: an equivalent wording can be counted.
    await lessonAt(page, 'c1-03', 'e11');
    await page.fill('#exroot textarea', 'To a certain extent, the results support the original hypothesis.');
    await page.click('[data-check]:not([disabled])');
    await page.waitForSelector('[data-self-judge]');
    assert(/One model answer|תשובה אחת לדוגמה/.test(await page.textContent('#pfoot')), 'find and fix calls the key the correct answer');
    await page.click('[data-self-judge]');
    await page.waitForFunction(() => /Counted as correct|נספר כנכון/.test(document.querySelector('#pfoot')?.textContent || ''));
    // An unsaved lesson that does not load: what works offline, and where to save lessons next time.
    await page.route(/content\/lessons\/pa1-06\.json/, (route) => route.abort());
    await page.goto(`${BASE}#/lesson/pa1-06?t=${Date.now()}`);
    await page.waitForSelector('.missing-lesson');
    const miss = await page.textContent('.missing-lesson');
    assert(await page.getAttribute('[data-offline-settings]', 'href') === '#/settings' && /שימוש בלי אינטרנט|Offline use/.test(miss), `no pointer to saving lessons: ${miss}`);
    await ctx.close();
  });
  // ---------- persona round 2: writing, real life, settings and layout ----------
  const titleWidthsEm = (page) => page.$$eval('.lesson-list .lesson-row > .grow', (els) => els.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().width / parseFloat(getComputedStyle(e).fontSize)));
  const labelsOverlap = (page) => page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.level-rail-labels > span')].filter((s) => getComputedStyle(s).visibility !== 'hidden').map((s) => { const r = document.createRange(); r.selectNodeContents(s); return [...r.getClientRects()]; });
    const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxes[i].some((a) => boxes[j].some((b) => hit(a, b)))) return true;
    return false;
  });
  await check('RW1. Large text on phones: Path and Real life titles keep at least 8em, rail labels never overlap, skill rows stack, nothing scrolls sideways at 320 (R2-13, R2-14, R2-31, D5)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B2', { text: 150 });
    for (const [r, ready] of [['path/B2', '.lesson-row.next'], ['real-life', '.start-here .lesson-row'], ['writing', '[data-stage] + .lesson-list .lesson-row']]) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForSelector(ready);
      const w = await titleWidthsEm(page);
      assert(w.length && Math.min(...w) >= 8, `${r} at 390/150%: a title box is ${Math.min(...w).toFixed(1)}em wide`);
    }
    await page.goto(`${BASE}#/path/B2`);
    await page.waitForSelector('.lesson-row.next');
    const tags = await page.evaluate(() => { const row = document.querySelector('.lesson-row.next'); const t = row.querySelector(':scope > .row'); const g = row.querySelector(':scope > .grow'); return t.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1; });
    assert(tags, 'the "Next" tag is not under the title');
    for (const [width, text] of [[390, 130], [390, 150], [320, 150], [1440, 130]]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate((t) => window.lucid.store.update('settings', 'me', { text_size: t }), text);
      await page.goto(`${BASE}#/today`);
      await page.waitForSelector('.level-rail-labels');
      assert(!(await labelsOverlap(page)), `rail labels overlap at ${width}px, ${text}%`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Today scrolls sideways at ${width}px, ${text}%`);
    }
    // Skill rows with levels (the component Today and Progress share), at 320px and 150%.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${BASE}#/progress`);
    await page.waitForSelector('#view h1');
    const skills = await page.evaluate(async () => {
      const T = await import('./js/views/today.js'); const U = await import('./js/core/util.js');
      const host = document.createElement('div'); host.className = 'panel stack'; document.querySelector('#view').prepend(host);
      U.render(host, T.skillProfile({ grammar: { level: 'B1', source: 'practice', evidence: 12, days: 3 }, vocabulary: { level: 'A2', source: 'placement', evidence: 4, provisional: true }, listening: null, speaking: null, writing: { evidence: 1 } }));
      const row = host.querySelector('.skill-row .meter').closest('.skill-row');
      return { meter: host.querySelector('.meter').getBoundingClientRect().width / row.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert(skills.meter > 0.9 && skills.overflow <= 0, `skill rows do not stack at 320/150%: ${JSON.stringify(skills)}`);
    await ctx.close();
  });

  await check('RW2. Scenarios and roleplay: one-line top title and unwrapped tabs at 130%, the chosen reply quoted, both account options, a name slot in help phrases, an LTR goal, a Hebrew report (R2-07, R2-09, R2-10, R2-33, R2-34, R2-35)', async () => {
    const { ctx, page } = await newPage(browser, { mock: true });
    const db = page.lucidMock;
    await learnerAt(page, 'B1', { text: 130 });
    await page.goto(`${BASE}#/scenario/rl-emergency-lost-passport`);
    await page.waitForSelector('.scenario-tabs');
    const head = await page.evaluate(() => { const t = document.getElementById('top-title'); const tabs = [...document.querySelectorAll('.scenario-tabs button')]; return { lines: t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight), rows: new Set(tabs.map((b) => Math.round(b.getBoundingClientRect().top))).size, overflow: document.documentElement.scrollWidth - innerWidth, inView: tabs.every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }) }; });
    // RW-11: at 130% and above the four parts wrap to two rows, so every one is on screen.
    assert(head.lines < 1.6 && head.rows <= 2 && head.inView && head.overflow <= 0, `scenario header at 390/130%: ${JSON.stringify(head)}`);
    await page.click('[data-tab="practise"]');
    const picked = await page.evaluate(() => { const o = [...document.querySelectorAll('[data-opt]')].at(-1); const text = o.textContent.replace(/^\d+/, '').trim(); o.click(); document.querySelector('[data-check-turn]').click(); return text; });
    await page.waitForSelector('.chosen-quote');
    assert((await page.textContent('.chosen-quote')).includes(picked), 'the chosen reply is not quoted in the explanation');
    // No account yet: both ways in, sign-up first on a device that was never signed in.
    await page.click('[data-tab="roleplay"]');
    const links = await page.$$eval('#view a[href^="#/account"]', (a) => a.map((x) => new URL(x.href).hash));
    assert(links.length === 2 && /mode=signup/.test(links[0]) && /mode=signin/.test(links[1]) && links.every((h) => h.includes('next=')), `account options: ${links}`);
    assert(/חשבון|account/i.test(await page.textContent('#view .banner')), 'no reason why an account is needed');
    await signInWith(page, db.user.email);
    await page.click('[data-owner-dialog="unowned"] [value="move"]').catch(() => {});
    await page.waitForFunction(() => !location.hash.startsWith('#/account'));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true, ai_consent_at: new Date().toISOString(), text_size: 100 }));
    await page.goto(`${BASE}#/scenario/rl-hotel-checkin-basics?tab=roleplay`);
    await page.waitForSelector('[data-start-rp]');
    await page.click('[data-start-rp]');
    await page.click('button[data-stuck]');
    await page.waitForSelector('[data-help] [data-use-phrase]');
    const help = await page.textContent('[data-help]');
    assert(!/Dana Cohen|דנה כהן/.test(help) && help.includes('[your name]'), 'a help phrase still carries someone else\'s name');
    const slot = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-use-phrase]')].find((x) => x.textContent.includes('[your name]')); b.click(); const i = document.querySelector('#rpin'); return i.value.slice(i.selectionStart, i.selectionEnd); });
    assert(slot === '[your name]', `the name slot is not selected after copying: "${slot}"`);
    const goal = await page.$eval('.goal-block .bi-en', (e) => { const cs = getComputedStyle(e); return { display: cs.display, dir: cs.direction }; });
    assert(goal.display === 'block' && goal.dir === 'ltr', `the English goal is not its own LTR block: ${JSON.stringify(goal)}`);
    await page.fill('#rpin', 'Could I check in, please?');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForFunction(() => !document.querySelector('#rplog .spinner') && document.querySelectorAll('#rplog .msg.me').length === 1);
    await page.click('[data-end-rp]');
    await page.waitForSelector('[data-report-head]');
    const rep = await page.evaluate(() => [...document.querySelectorAll('.report-list')].map((l) => ({ dir: getComputedStyle(l.querySelector('li')).direction, he: l.querySelector('.bi-he')?.textContent || '' })));
    assert(rep.length === 2 && rep.every((r) => r.dir === 'rtl' && /[א-ת]/.test(r.he)), `report lists without Hebrew or not under their headings: ${JSON.stringify(rep)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/roleplay-report-he-390.png`, fullPage: true });
    await ctx.close();
  });

  await check('RW3. Writing: text type in free writing, paragraph compare, AI note apart, self-rating for the next draft, reopening on AI feedback, Hebrew B2-C2 briefs, LTR topics, the Writing lab highlighted (Y6, R2-21, R2-40, R2-41, R2-42, R2-43, T6, M9)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1440, height: 900 }, mock: true });
    await learnerAt(page, 'B2');
    await page.goto(`${BASE}#/account?mode=signup`);
    await page.fill('#em', 'learner@example.com'); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true, ai_consent_at: new Date().toISOString() }));
    for (const r of ['writing', 'writing/free']) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForSelector('#deck a.nav');
      const cur = await page.$$eval('#deck a.nav[aria-current="page"]', (a) => a.map((x) => x.getAttribute('href')));
      assert(cur.length === 1 && cur[0] === '#/writing', `#/${r} highlights ${cur}`);
    }
    // Y6: an email is not an argued essay, its sign-off is not a punctuation problem, and AI feedback gets its kind.
    await page.click('[data-kind="email"]');
    await page.fill('#essay', 'Hi Tom,\nI am writing about the meeting next week. I have not finished the report yet, but it is nearly done. Could we meet on Tuesday instead?\n\nBest,\nYael');
    await page.click('[data-check]');
    await page.waitForSelector('.check-item');
    const side = await page.textContent('aside.panel');
    assert(!/Argument structure|מבנה הטיעון/.test(side) && !/run-on|משפט רץ/.test(side), 'an email is checked as an argumentative essay');
    await page.click('[data-ai]');
    await page.waitForSelector('[data-final]');
    assert(page.lucidMock.aiBodies.at(-1).exercise.kind === 'email', `sent as ${page.lucidMock.aiBodies.at(-1).exercise.kind}`);
    // R2-21: reopening a draft in revision opens on its AI feedback.
    await page.goto(`${BASE}#/writing`);
    await page.goto(`${BASE}#/writing/free`);
    await page.waitForSelector('aside [data-tab="ai"]');
    assert(await page.getAttribute('aside [data-tab="ai"]', 'aria-pressed') === 'true', 'a draft with AI feedback reopens on the Checks tab');
    // R2-40: a long draft is compared by paragraph, with the changed ones only and a jump list.
    const paras = Array.from({ length: 9 }, (_, i) => `Paragraph ${i + 1} says something about public transport. It has two sentences.`);
    await page.fill('#essay', paras.join('\n\n'));
    await page.click('[data-check]');
    const v2 = [...paras]; v2[1] = 'Paragraph 2 says something about public transport.\n\nIt has two sentences.'; v2[6] = 'Paragraph 7 says something new about buses. It has two sentences.';
    await page.fill('#essay', v2.join('\n\n'));
    await page.click('[data-check]');
    await page.click('aside [data-tab="versions"]');
    await page.waitForSelector('.cmp-para');
    const cmp = await page.evaluate(() => ({ paras: document.querySelectorAll('.cmp-para').length, jumps: document.querySelectorAll('[data-cmp-jump]').length, marks: document.querySelectorAll('.cmp-para .para-mark').length, gaps: document.querySelectorAll('.cmp-gap').length }));
    assert(cmp.paras >= 2 && cmp.paras <= 4 && cmp.jumps === cmp.paras && cmp.marks >= 1 && cmp.gaps >= 2, `paragraph compare: ${JSON.stringify(cmp)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/essay-compare-paragraphs-1440.png` });
    await page.click('[data-cmp-all="1"]');
    assert((await page.$$('.cmp-para')).length === 0 && (await page.$$('aside .diff')).length === 1, 'the whole-text comparison is not offered');
    // R2-41, R2-42: the AI's note is its own labelled block; after feedback the self-rating is for the next draft.
    await page.goto(`${BASE}#/writing/final-C1`);
    await page.waitForSelector('#essay');
    await page.click('aside [data-tab="ai"]');
    assert(/Before the feedback|לפני המשוב:/.test(await page.textContent('aside .self-rate')), 'no self-rating before the first feedback');
    await page.click('input[name=topic][value="0"]');
    await page.fill('#essay', 'Judging the past is hard. '.repeat(120));
    await page.route(/functions\/v1\/lucid-ai/, async (route) => {
      const body = JSON.parse(route.request().postData());
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ evaluation: { task_fulfilment: { status: 'complete', note: '' }, cefr_estimate: 'B2', cefr_low: 'B2', cefr_high: 'C1', summary: 'Clear.', summary_he: null, strengths: [], priorities: [], categories: [{ id: 'grammar', applicable: true, score: 3, explanation: 'x', examples: [], improvement: 'y', practice: 'z' }], errors: [], required_elements: [], revision: { tasks: ['Add a source.'], progress_since_previous: null }, verification_note: 'Check the 2019 survey you cite before you rely on it.', dropped_errors: 0, text: body.text.length } }) });
    });
    await page.click('[data-ai]');
    await page.waitForSelector('.source-limits .ai-note');
    const note = await page.evaluate(() => { const n = document.querySelector('.source-limits .ai-note'); return { label: n.querySelector('strong').textContent, text: n.textContent, lucid: n.previousElementSibling?.textContent || '' }; });
    assert(/From the AI feedback|מהמשוב של ה-AI/.test(note.label) && note.text.includes('2019 survey') && !note.lucid.includes('2019 survey'), `AI note not apart: ${JSON.stringify(note)}`);
    const self = await page.textContent('aside .self-rate summary');
    assert(/next feedback|המשוב הבא/.test(self) && !/^Before the feedback/.test(self), `self-rating label after feedback: "${self}"`);
    if (SHOTS) { await page.$eval(".source-limits", (e) => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: `${SHOTS}/essay-ai-note-1440.png` }); }
    await page.unroute(/functions\/v1\/lucid-ai/);
    // T6, M9: B2-C2 final tasks carry Hebrew (on request), and topics and "Must include" read left to right.
    await page.goto(`${BASE}#/writing/final-B2`);
    await page.waitForSelector('.topic-pick');
    const brief = await page.evaluate(() => ({ he: Boolean(document.querySelector('.task-brief .bi-he, .task-brief [data-reveal-he]')), topic: getComputedStyle(document.querySelector('.topic-pick .note-row')).direction, req: getComputedStyle(document.querySelector('.req-list')).direction }));
    assert(brief.he && brief.topic === 'ltr' && brief.req === 'ltr', `final B2 brief: ${JSON.stringify(brief)}`);
    await ctx.close();
  });

  // ---------- launch lane ai-safety (audit BLK-09, TS-05, BLK-10, BLK-11): AI and accounts are off on the live site,
  // so these run against the mock server with the configuration the owner would set to turn them on. ----------
  const aiLearner = async (page, { level = 'B1' } = {}) => {
    const db = page.lucidMock;
    await learnerAt(page, level);
    await signInWith(page, db.user.email);
    await page.click('[data-owner-dialog] [value="move"]', { timeout: 1500 }).catch(() => {});
    await page.waitForFunction(() => !location.hash.startsWith('#/account'));
    await page.waitForTimeout(400); // let the sign-in finish its first sync before the settings change
    await page.evaluate(() => window.lucid.store.put('settings', { id: 'me', ai_consent: true, ai_consent_at: new Date().toISOString() }));
    await page.waitForTimeout(200);
    return db;
  };
  const withConfig = (page, extra) => page.route(/config\.js$/, (route) => route.fulfill({ contentType: 'text/javascript', body: `export const CONFIG = { supabaseUrl: 'https://mock.supabase.co', supabaseKey: 'sb_publishable_test', aiEnabled: true, aiFunction: 'lucid-ai', ${extra} };` }));

  await check('AIS1. AI safety (BLK-09, TS-05): when the AI flags a disclosure, the tutor, the roleplay and writing feedback show Lucid\'s own help card with the checked numbers, record no score, and tutor and roleplay replies can be reported (mock server)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1280, height: 860 }, mock: true });
    const db = await aiLearner(page);
    const SAFE = 'מה שכתבתם חשוב יותר מהשיעור.';
    let flagFeedback = false;
    const flagged = (b) => /hurts me/i.test(JSON.stringify([b.message, b.text, b.history?.at(-1)?.text]));
    await page.route(/functions\/v1\/lucid-ai/, async (route) => {
      const body = JSON.parse(route.request().postData());
      db.aiBodies.push(body);
      const reply = (x) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(x) });
      const f = flagged(body);
      if (body.task === 'tutor_turn') return reply({ reply: f ? SAFE : 'Good question.', safety_concern: f });
      if (body.task === 'roleplay_turn') return reply({ reply: f ? SAFE : 'Sure, what name is the booking under?', scene_complete: f, hint_he: null, safety_concern: f });
      if (body.task === 'roleplay_feedback' && flagFeedback) return reply({ feedback: { safety_concern: true, summary: 'Please talk to an adult you trust.', summary_he: SAFE, task_completed: false, conversation_score: null, strengths: [], strengths_he: null, better_alternatives: [], practice: [], practice_he: null, grammar: null, vocabulary: null, naturalness: null } });
      if (body.task === 'evaluate_writing' && f) return reply({ evaluation: { safety_concern: true, summary: 'Please talk to an adult you trust.', summary_he: SAFE, cefr_estimate: null, cefr_low: null, cefr_high: null, categories: [], errors: [], strengths: [], priorities: [], required_elements: [], revision: { tasks: [], progress_since_previous: null }, verification_note: null, task_fulfilment: null, dropped_errors: 0, low_confidence: [], runs: 1 } });
      return route.fallback();
    });
    const card = async (scope) => {
      await page.waitForSelector(`${scope} [data-help-card]`, { timeout: 4000 }).catch(() => { throw new Error(`no help card in ${scope}`); });
      return page.$eval(`${scope} [data-help-card]`, (c) => ({ text: c.textContent, tel: [...c.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')) }));
    };
    const numbersOk = (c) => JSON.stringify(c.tel) === JSON.stringify(['tel:101', 'tel:100', 'tel:1201', 'tel:105']) && /מבוגר שאתם סומכים עליו/.test(c.text) && /מחוץ לישראל/.test(c.text);
    // Tutor: an ordinary reply has no card and can be reported; a flagged one shows the card under the conversation.
    await page.goto(`${BASE}#/tutor?mode=conversation`);
    await page.fill('#tin', 'How do I use the present perfect?');
    await page.click('[data-send] button[type=submit]');
    await page.waitForFunction(() => document.querySelector('#log')?.textContent.includes('Good question.'));
    assert(!(await page.$('[data-help-card]')), 'a help card under an ordinary tutor reply');
    await page.click('[data-report-reply]');
    assert((await store(page, 'events')).some((e) => e.type === 'ai-report' && e.area === 'tutor'), 'a tutor reply cannot be reported');
    await page.fill('#tin', 'Someone at home hurts me');
    await page.click('[data-send] button[type=submit]');
    const t = await card('#view');
    assert(numbersOk(t), `tutor help card: ${JSON.stringify(t)}`);
    assert((await page.textContent('#log')).includes(SAFE), 'the tutor\'s out-of-role reply is not shown');
    assert(!(await store(page, 'events')).some((e) => /safety/.test(e.type)), 'a disclosure was written to the event log');
    // Roleplay: a flagged turn ends the scene, shows the card instead of "Finish and get feedback", and scores nothing.
    await page.goto(`${BASE}#/scenario/rl-hotel-checkin-basics?tab=roleplay`);
    await page.waitForSelector('[data-start-rp]');
    await page.click('[data-start-rp]');
    await page.fill('#rpin', 'Hello, I have a booking.');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('#rplog .msg.them').length === 2);
    await page.click('[data-report-reply]');
    assert((await store(page, 'events')).some((e) => e.type === 'ai-report' && e.area === 'roleplay' && e.scenario === 'rl-hotel-checkin-basics'), 'a roleplay reply cannot be reported');
    await page.fill('#rpin', 'Someone at home hurts me');
    await page.click('[data-rp-send] button[type=submit]');
    const r = await card('#view');
    assert(numbersOk(r), `roleplay help card: ${JSON.stringify(r)}`);
    assert(await page.$('#rplog [data-safety-reply]') && !(await page.$('[data-end-rp]')) && await page.$('#rpin[disabled]'), 'the scene goes on after a flagged turn');
    assert(!(await store(page, 'attempts')).some((a) => a.source === 'roleplay'), 'a roleplay attempt was recorded');
    // Flagged feedback (the learner finished first): the report shows the reply and the card, no scores, no completion.
    await page.click('[data-new-rp]');
    await page.click('[data-start-rp]');
    await page.fill('#rpin', 'Hello, I have a booking.');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForFunction(() => !document.querySelector('#rplog .spinner') && document.querySelectorAll('#rplog .msg.them').length === 2);
    flagFeedback = true;
    await page.click('[data-end-rp]');
    const f = await card('#view');
    assert(numbersOk(f) && !/\d+\/100/.test(await page.textContent('#view')), `roleplay report after a flag: ${JSON.stringify(f)}`);
    assert(!(await store(page, 'attempts')).some((a) => a.source === 'roleplay'), 'flagged feedback recorded an attempt');
    assert(!(await store(page, 'progress')).some((p) => p.id === 'rl:rl-hotel-checkin-basics'), 'flagged feedback completed the scenario');
    assert((await store(page, 'chats')).filter((c) => c.kind === 'roleplay').every((c) => !c.report), 'a flagged report was kept as a report');
    // Writing: the card replaces the feedback; the text is kept, nothing is scored and no feedback round is used.
    await page.goto(`${BASE}#/writing/free`);
    await page.waitForSelector('#essay');
    await page.fill('#essay', 'I do not want to write about transport today. Someone at home hurts me and I am scared to go home after school.');
    await page.click('[data-ai]');
    const w = await card('aside.panel');
    assert(numbersOk(w), `writing help card: ${JSON.stringify(w)}`);
    assert(!(await page.$('aside.panel .band')) && !(await page.$('aside.panel .error-card [data-rung]')), 'scores or AI mistakes shown with the help card');
    const wr = await store(page, 'writing');
    assert(wr.some((x) => x.kind === 'essay-version') && wr.every((x) => !x.evaluation), `the text is not kept, or kept with an evaluation: ${JSON.stringify(wr.map((x) => [x.kind, Boolean(x.evaluation)]))}`);
    assert(!(await store(page, 'attempts')).some((a) => a.source === 'writing'), 'a writing attempt was recorded');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-safety-writing-1280.png` });
    await ctx.close();
  });

  await check('AIS2. AI scores hidden (BLK-11, LB-08): with aiScoring \'hidden\' the writing feedback keeps located mistakes and hints but shows no bands, no level range and no AI writing level; the roleplay report shows no numbers (mock server)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1280, height: 860 }, mock: true });
    await withConfig(page, "aiScoring: 'hidden'");
    await aiLearner(page);
    await page.goto(`${BASE}#/writing/free`);
    await page.waitForSelector('#essay');
    await page.fill('#essay', 'I think public transport is more better than cars. It is cheaper and cleaner for everyone in the city.');
    await page.click('[data-ai]');
    await page.waitForSelector('aside.panel .error-card .quote');
    let aside = await page.textContent('aside.panel');
    assert(aside.includes('more better') && await page.$('aside.panel [data-locate="0"]') && await page.$('aside.panel [data-rung="0"]'), 'located mistakes or the hint ladder are missing');
    assert(/לפי קטגוריה|By category/.test(aside) && /Explanation for grammar/.test(aside), 'category comments are missing');
    assert(!(await page.$('aside.panel .band')), 'category bands are shown');
    assert(!/עומד ביעד|Meets target|מתקרב ליעד|Approaching target|How do the bands work|איך עובד הדירוג/.test(aside), `band wording is shown: ${aside.slice(0, 200)}`);
    await page.click('[data-final]');
    await page.waitForSelector('aside.panel [data-final-done]');
    aside = await page.textContent('aside.panel');
    assert(!(await page.$('aside.panel .tag.level')) && !/A2.B1|הערכת רמה של הטקסט|Estimated level of this text/.test(aside), 'a level range on the final draft');
    await page.click('[data-tab="versions"]');
    assert(!(await page.$('aside.panel .tag.level')), 'a level range in Versions');
    assert(await page.evaluate(() => window.lucid.store.get('writing', 'ess:free').final_range === null), 'the range was stored for the writing list');
    const overall = (await store(page, 'attempts')).filter((a) => a.source === 'writing' && !a.error_type);
    assert(overall.length === 1 && overall[0].score === null, `the writing attempt counts as evidence: ${JSON.stringify(overall)}`);
    // Three AI-assessed final drafts on three days: a writing level when scores are shown, none when hidden.
    const seed = () => page.evaluate(() => {
      const day = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
      for (const [i, ex] of ['we-01', 'we-02', 'we-03'].entries()) window.lucid.store.put('writing', { id: `ess:${ex}#1`, kind: 'essay-version', exercise: ex, n: 1, final: true, at: day(i + 1), evaluation: { cefr_estimate: 'B2', cefr_low: 'B2', cefr_high: 'B2' } });
      // A summary written while scores were shown keeps its stored range; the list must not show it now.
      window.lucid.store.put('writing', { id: 'ess:we-01', kind: 'essay-summary', exercise: 'we-01', title: 'x', status: 'final', final_range: 'B2', versions: 1, updated: day(1) });
    });
    await seed();
    await page.waitForTimeout(300); // the store writes to IndexedDB before the reload
    await page.goto(`${BASE}#/today`);
    await page.reload();
    await page.waitForSelector('#view > *');
    const hiddenLevel = await page.evaluate(async () => (await import('./js/core/learner.js')).model().skills.writing);
    assert(hiddenLevel.level === null && !hiddenLevel.source, `an AI writing level while scores are hidden: ${JSON.stringify(hiddenLevel)}`);
    await page.goto(`${BASE}#/progress`);
    await page.waitForSelector('#view h1');
    assert(!/שני טקסטים שהוערכו|two assessed texts/.test(await page.textContent('#view')), 'Progress promises a writing level from assessed texts');
    await page.goto(`${BASE}#/writing`);
    await page.waitForSelector('#view h1');
    assert(!(await page.$('#view .tag.level[title="טווח הרמה של הטיוטה הסופית"], #view .tag.level[title="Level range of the final draft"]')), 'the writing list shows a final draft\'s level range');
    // The roleplay report: comments stay, numbers go, and the attempt is practice.
    await page.goto(`${BASE}#/scenario/rl-hotel-checkin-basics?tab=roleplay`);
    await page.waitForSelector('[data-start-rp]');
    await page.click('[data-start-rp]');
    await page.fill('#rpin', 'Could I check in, please?');
    await page.click('[data-rp-send] button[type=submit]');
    await page.waitForFunction(() => !document.querySelector('#rplog .spinner') && document.querySelectorAll('#rplog .msg.them').length === 2);
    await page.click('[data-end-rp]');
    await page.waitForSelector('[data-report-head]');
    const report = await page.textContent('#view');
    assert(!/\d+\/100/.test(report) && /Mostly accurate/.test(report) && /More natural ways|ניסוחים טבעיים יותר/.test(report), `roleplay report with scores hidden: ${report.slice(0, 300)}`);
    assert((await store(page, 'attempts')).filter((a) => a.source === 'roleplay').every((a) => a.score === null), 'the roleplay attempt counts as evidence');
    await ctx.close();
    // The same seeded drafts with scores shown (the mock's default) give a writing level, so the check above is real.
    const shown = await newPage(browser, { mock: true });
    await aiLearner(shown.page);
    await shown.page.evaluate(() => {
      const day = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
      for (const [i, ex] of ['we-01', 'we-02', 'we-03'].entries()) window.lucid.store.put('writing', { id: `ess:${ex}#1`, kind: 'essay-version', exercise: ex, n: 1, final: true, at: day(i + 1), evaluation: { cefr_estimate: 'B2', cefr_low: 'B2', cefr_high: 'B2' } });
    });
    await shown.page.waitForTimeout(300); // the store writes to IndexedDB before the reload
    await shown.page.reload();
    await shown.page.waitForSelector('#view > *');
    const shownLevel = await shown.page.evaluate(async () => (await import('./js/core/learner.js')).model().skills.writing.level);
    assert(shownLevel === 'B2', `no writing level with scores shown: ${shownLevel}`);
    await shown.page.evaluate(() => window.lucid.store.put('writing', { id: 'ess:we-01', kind: 'essay-summary', exercise: 'we-01', title: 'x', status: 'final', final_range: 'B2', versions: 1, updated: new Date().toISOString() }));
    await shown.page.goto(`${BASE}#/writing`);
    await shown.page.waitForSelector('#view h1');
    assert(await shown.page.$('#view .tag.level[title="טווח הרמה של הטיוטה הסופית"], #view .tag.level[title="Level range of the final draft"]'), 'the writing list shows no stored range with scores shown, so the hidden check proves nothing');
    await shown.ctx.close();
  });

  await check('AIS3. CAPTCHA (BLK-10): off, the auth forms load nothing from a provider and send no token; on (Turnstile, with the CSP from docs/setup.md), sign-up, sign-in, reset and a password change send a fresh token each (mock server, stub widget)', async () => {
    const authBodies = (page) => { const bodies = []; page.route(/mock\.supabase\.co\/auth\/v1\/(signup|token|recover)/, (route) => { bodies.push({ path: new URL(route.request().url()).pathname, body: JSON.parse(route.request().postData() || '{}') }); return route.fallback(); }); return bodies; };
    // Off (the shipped setting): no widget, no provider request, the same bodies as before.
    const off = await newPage(browser, { mock: true });
    const provider = [];
    off.page.on('request', (req) => { if (/challenges\.cloudflare\.com|hcaptcha\.com/.test(req.url())) provider.push(req.url()); });
    const offBodies = authBodies(off.page);
    await onboard(off.page, { start: 'basics' });
    for (const mode of ['signup', 'signin', 'reset']) {
      await off.page.goto(`${BASE}#/account?mode=${mode}`);
      await off.page.waitForSelector('[data-auth]');
      assert(!(await off.page.$('[data-captcha]')), `a CAPTCHA slot on ${mode} while CAPTCHA is off`);
    }
    await off.page.goto(`${BASE}#/account?mode=reset`);
    await off.page.waitForSelector('[data-auth]');
    await off.page.fill('#em', off.page.lucidMock.user.email);
    await off.page.click('[data-auth] button[type=submit]');
    await off.page.waitForSelector('[data-auth] [role=alert]');
    await signInWith(off.page, off.page.lucidMock.user.email);
    await off.page.click('[data-owner-dialog] [value="move"]', { timeout: 1500 }).catch(() => {});
    await off.page.waitForFunction(() => !location.hash.startsWith('#/account'));
    assert(offBodies.length >= 2 && offBodies.every((b) => !('gotrue_meta_security' in b.body)), `a token field while CAPTCHA is off: ${JSON.stringify(offBodies)}`);
    assert(!provider.length, `a provider request while CAPTCHA is off: ${provider}`);
    await off.ctx.close();
    // On: the page is served with the Turnstile CSP that docs/setup.md gives, and the provider's script is a stub.
    const setup = readFileSync(join(here, '..', '..', 'docs', 'setup.md'), 'utf8');
    const csp = setup.match(/<!-- csp:turnstile -->\s*```\s*([^`]+?)\s*```/)[1];
    const on = await newPage(browser, { mock: true });
    const page = on.page;
    await withConfig(page, "captchaProvider: 'turnstile', captchaSiteKey: '1x00000000000000000000AA'");
    await page.route(/\/lucid\/(index\.html)?(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace(/(http-equiv="?Content-Security-Policy"? content=)"[^"]*"/, `$1"${csp}"`);
      return route.fulfill({ response: res, body });
    });
    const stub = 'window.turnstile={n:0,render(el,p){const i=++this.n;const d=document.createElement("div");d.className="ts-stub";d.textContent="widget "+i;el.append(d);window.__ts=p;setTimeout(()=>p.callback("test-token-"+i),20);return "w"+i;},remove(){}};';
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (route) => route.fulfill({ contentType: 'text/javascript', body: stub }));
    const bodies = authBodies(page);
    await onboard(page, { start: 'basics' });
    await page.goto(`${BASE}#/account?mode=signup`);
    await page.waitForSelector('[data-auth] [data-captcha] .ts-stub', { timeout: 4000 }).catch(() => { throw new Error('the widget is not drawn on sign-up (script blocked by the documented CSP?)'); });
    const params = await page.evaluate(() => ({ sitekey: window.__ts.sitekey, appearance: window.__ts.appearance }));
    assert(params.sitekey === '1x00000000000000000000AA' && params.appearance === 'interaction-only', `widget parameters: ${JSON.stringify(params)}`);
    await page.fill('#em', page.lucidMock.user.email); await page.fill('#pw', 'correct horse 1');
    await page.click('[data-auth] button[type=submit]');
    await page.click('[data-owner-dialog] [value="move"]', { timeout: 1500 }).catch(() => {});
    await page.waitForFunction(() => !location.hash.startsWith('#/account'));
    await page.goto(`${BASE}#/account?mode=reset`);
    await page.waitForSelector('[data-auth] [data-captcha] .ts-stub');
    await page.fill('#em', page.lucidMock.user.email);
    await page.click('[data-auth] button[type=submit]');
    await page.waitForSelector('[data-auth] [role=alert]');
    await signInWith(page, page.lucidMock.user.email);
    await page.click('[data-owner-dialog] [value="move"]', { timeout: 1500 }).catch(() => {});
    await page.waitForFunction(() => !location.hash.startsWith('#/account'));
    await page.goto(`${BASE}#/settings`);
    await page.click('[data-pw]');
    await page.waitForSelector('[data-newpass] [data-captcha] .ts-stub');
    await page.fill('#cp', 'correct horse 1'); await page.fill('#np', 'new password 22');
    await page.click('[data-newpass] button[type=submit]');
    assert(await waitFor(() => page.lucidMock.passwordChanged === 'new password 22'), 'the password was not changed with CAPTCHA on');
    const sent = bodies.map((b) => [b.path, b.body.gotrue_meta_security?.captcha_token || null]);
    assert(sent.length === 4 && sent.every(([, t]) => /^test-token-\d+$/.test(t)), `tokens sent: ${JSON.stringify(sent)}`);
    assert(new Set(sent.map(([, t]) => t)).size === 4, `a token was used twice: ${JSON.stringify(sent)}`);
    assert(JSON.stringify(sent.map(([p]) => p)) === JSON.stringify(['/auth/v1/signup', '/auth/v1/recover', '/auth/v1/token', '/auth/v1/token']), `requests: ${JSON.stringify(sent)}`);
    // A refused token says so in words, and the form stays usable.
    await page.unroute(/mock\.supabase\.co\/auth\/v1\/(signup|token|recover)/);
    await page.route(/mock\.supabase\.co\/auth\/v1\/recover/, (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (captcha verification process failed)' }) }));
    await page.goto(`${BASE}#/account?mode=reset`);
    await page.waitForSelector('[data-auth] [data-captcha] .ts-stub');
    await page.fill('#em', page.lucidMock.user.email);
    await page.click('[data-auth] button[type=submit]');
    await page.waitForSelector('[data-auth] [role=alert]');
    assert(/לא הצלחנו לאמת את הבקשה|could not verify the request/.test(await page.textContent('[data-auth] [role=alert]')), 'a refused token is not explained');
    assert(await page.$('[data-auth] [data-captcha] .ts-stub'), 'no fresh widget after a refused token');
    await on.ctx.close();
  });

  await check('RW4. Settings at 390: no option alone on a line; "Offline use" is linked from Real life and Help; a phone shows when it is offline; a toast does not follow the learner to the next screen (M10, M1, Y13)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page, 'B1');
    await page.goto(`${BASE}#/settings`);
    // Without AI the AI groups are not shown (launch FR-03); every group that is shown is checked.
    await page.waitForSelector('.settings-view [data-seg="retention"]');
    const alone = await page.$$eval('.settings-view [data-seg]', (segs) => segs.filter((g) => { const tops = [...g.children].map((b) => Math.round(b.getBoundingClientRect().top)); const rows = [...new Set(tops)]; return rows.length > 1 && rows.some((r) => tops.filter((t) => t === r).length === 1); }).map((g) => g.dataset.seg));
    assert(!alone.length, `an option sits alone on a line: ${alone}`);
    await page.goto(`${BASE}#/real-life`);
    await page.waitForSelector('a[href="#/settings?section=offline"]');
    await page.click('a[href="#/settings?section=offline"]');
    await page.waitForFunction(() => document.activeElement?.id === 'offline');
    const top = await page.$eval('#offline', (s) => s.getBoundingClientRect().top);
    assert(top >= 0 && top < 300, `the Offline use section is not in view: ${top}`);
    await page.goto(`${BASE}#/help`);
    await page.waitForSelector('#view details');
    assert(await page.$('#view a[href="#/settings?section=offline"]'), 'Help does not point to Offline use');
    await ctx.setOffline(true);
    await page.evaluate(() => dispatchEvent(new Event('offline')));
    await page.waitForSelector('#top .net-badge');
    assert(await page.isVisible('#top .net-badge'), 'no offline indicator on a phone');
    await ctx.setOffline(false);
    await page.evaluate(() => dispatchEvent(new Event('online')));
    await page.waitForSelector('#top .net-badge', { state: 'detached' });
    // Y13: in the Hebrew UI every English title on the path ends at the same (right) edge, wrapped or not.
    await page.goto(`${BASE}#/path/B2`);
    await page.waitForSelector('.lesson-row.next, .lesson-list .lesson-row .l-en');
    const edges = await page.$$eval('.lesson-list .lesson-row .l-en', (els) => els.map((e) => { const r = document.createRange(); r.selectNodeContents(e); return [...r.getClientRects()].map((x) => Math.round(e.getBoundingClientRect().right - x.right)); }).flat());
    assert(edges.length > 5 && edges.every((d) => Math.abs(d) <= 2), `path titles are not aligned to one edge: ${edges}`);
    await page.evaluate(async () => { const C = await import('./js/ui/components.js'); C.toast('Your path was updated'); });
    await page.waitForTimeout(700);
    await page.goto(`${BASE}#/path`);
    await page.waitForTimeout(100);
    assert(!(await page.$('#toast-root .toast')), 'a toast follows the learner to the next screen');
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
