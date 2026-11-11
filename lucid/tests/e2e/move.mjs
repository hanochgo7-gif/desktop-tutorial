// Moving learners to Lucid's own address (IS-02, FR-06, FR-11), in Chromium with two real origins:
// - the old copy, served like GitHub Pages at http://127.0.0.1:<MOVE_PORT>/lucid/ (python http.server);
// - the new address, served like Vercel at the root of http://127.0.0.1:<MOVE_PORT+1>/ (tools/build/serve.mjs with
//   vercel.json's headers);
// - a third origin, http://127.0.0.1:<MOVE_PORT+2>/, plays a page that tries to forge a move.
// config.js is answered per test with NEW_HOME and OLD_HOME set to the local origins (or as shipped: NEW_HOME empty).
// Usage: node tests/e2e/move.mjs [--only <text>] [--shots <dir>]   Ports: MOVE_PORT (default 13010) and the next two.
// E2E_ROOT=<dir> serves <dir>/lucid (for example the output of tools/build/vercel-build.mjs) on both origins.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = process.env.E2E_ROOT ? join(resolve(process.env.E2E_ROOT), 'lucid') : join(here, '..', '..');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = Number(process.env.MOVE_PORT) || 13010;
const OLD = `http://127.0.0.1:${PORT}/lucid/`;
const NEW = `http://127.0.0.1:${PORT + 1}/`;
const EVIL = `http://127.0.0.1:${PORT + 2}/`;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const SHOTS = process.argv.includes('--shots') ? resolve(process.argv[process.argv.indexOf('--shots') + 1]) : null; // optional screenshots
const shot = async (page, name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); } };

const results = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// The old copy lives under /lucid/ of a directory that holds only the app (as GitHub Pages serves the repository).
const tmp = mkdtempSync(join(tmpdir(), 'lucid-move-'));
symlinkSync(app, join(tmp, 'lucid'));
mkdirSync(join(tmp, 'evil'));
writeFileSync(join(tmp, 'evil', 'index.html'), '<!doctype html><title>other site</title><p>another site</p>');
const servers = [
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', tmp], { stdio: 'ignore' }),
  spawn(process.execPath, [join(here, '..', '..', 'tools/build/serve.mjs'), '--root', app, '--port', String(PORT + 1)], { stdio: 'ignore' }),
  spawn('python3', ['-m', 'http.server', String(PORT + 2), '--bind', '127.0.0.1', '--directory', join(tmp, 'evil')], { stdio: 'ignore' }),
];
await sleep(900);
const browser = await chromium.launch();
const pageErrors = [];

const CONFIG = (newHome) => `export const CONFIG = { supabaseUrl: '', supabaseKey: '', aiEnabled: false, aiFunction: 'lucid-ai' };
export const NEW_HOME = ${JSON.stringify(newHome)};
export const OLD_HOME = ${JSON.stringify(OLD)};
`;
// A browser with the service worker off (so every config.js request is answered here), NEW_HOME as given.
async function browserWith({ newHome = NEW, lang = 'he-IL', downloads = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: lang, serviceWorkers: 'block', acceptDownloads: downloads, bypassCSP: true }); // bypassCSP only so axe can be injected; run.mjs checks the CSP
  if (newHome !== null) await ctx.route(/\/config\.js$/, (route) => route.fulfill({ contentType: 'text/javascript', body: CONFIG(newHome) }));
  ctx.on('page', (p) => {
    p.on('pageerror', (e) => pageErrors.push(`${p.url()} :: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`${p.url()} :: console ${m.text()}`); });
  });
  return ctx;
}
// A learner made through the app's own store (onboarding is covered by run.mjs), with lessons, words and a text.
async function learner(page, base, { lang = 'he', name = 'Noa' } = {}) {
  await page.goto(`${base}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async ({ lang, name }) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    const { store } = await import('./js/core/store.js');
    const S = await import('./js/core/srs.js');
    L.saveProfile({ onboarded: true, name, birth_year: 2003, ui_language: lang, goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20 });
    await L.applyPlacement(P.selfReportResult('A1'));
    store.put('progress', { id: 'a1-01', level: 'A1', status: 'completed', completed_at: new Date().toISOString() });
    for (const w of ['apple', 'bread', 'water']) store.put('cards', { ...S.newCard({ id: `v:${w}:meaning`, kind: 'vocab', ref: w }), payload: { word: w } });
    store.put('writing', { id: 'w-move', text: 'I moved my progress.' });
    await store.flush();
  }, { lang, name });
  await page.reload();
  await page.waitForSelector('#view > *');
  await page.waitForTimeout(300);
}
const snapshot = (page) => page.evaluate(async () => { const { store } = await import('./js/core/store.js'); const s = store.snapshot(); return { name: s.profile.find((p) => p.id === 'me')?.name || null, onboarded: Boolean(s.profile.find((p) => p.id === 'me')?.onboarded), cards: s.cards.length, done: s.progress.filter((p) => p.status === 'completed').length, writing: s.writing.length }; });
async function axe(page, label) {
  await page.addScriptTag({ content: axeSource }).catch(() => {});
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(', ')}`));
  assert(!v.length, `${label}: axe ${v.join(' | ')}`);
}

try {
  await check('M1. NEW_HOME empty (as shipped): nothing about a move shows on the old copy; Welcome offers "I have a backup"', async () => {
    const ctx = await browserWith({ newHome: null });
    const page = await ctx.newPage();
    await page.goto(`${OLD}#/welcome`);
    await page.waitForSelector('.welcome');
    assert(await page.$('a[data-has-backup][href="#/import"]'), 'no "יש לי גיבוי" on Welcome');
    await learner(page, OLD);
    await page.goto(`${OLD}#/today`);
    await page.waitForSelector('#view .today, #view h1');
    await page.waitForTimeout(400);
    assert(!(await page.$('#moved')), 'a move banner shows while NEW_HOME is empty');
    await ctx.close();
  });

  await check('M2. NEW_HOME set: the old copy shows "Lucid moved" on Welcome and the hubs, never in a lesson; the new address shows nothing', async () => {
    const ctx = await browserWith();
    const page = await ctx.newPage();
    await page.goto(`${OLD}#/welcome`);
    await page.waitForSelector('#moved');
    await shot(page, 'old-welcome-banner');
    const text = await page.textContent('#moved');
    assert(/Lucid עבר לכתובת חדשה/.test(text) && text.includes(`127.0.0.1:${PORT + 1}`), `banner: ${text}`);
    assert(!(await page.$('#moved [data-move]')), 'no move button without a learner');
    assert((await page.getAttribute('#moved a[data-moved-link]', 'href')) === NEW, 'the link is NEW_HOME');
    await learner(page, OLD);
    await page.goto(`${OLD}#/today`);
    await page.waitForSelector('#moved [data-move]');
    await axe(page, 'Today with the banner');
    await shot(page, 'old-today-banner');
    await page.goto(`${OLD}#/lesson/a1-01`);
    await page.waitForTimeout(800);
    assert(await page.$eval('#moved', (b) => b.hidden), 'the banner shows inside a lesson');
    const fresh = await ctx.newPage();
    await fresh.goto(`${NEW}#/welcome`);
    await fresh.waitForSelector('.welcome');
    await fresh.waitForTimeout(300);
    assert(!(await fresh.$('#moved')), 'the new address shows the banner');
    await ctx.close();
  });

  await check('M3. One click moves the progress: the new address opens, shows what arrives, writes nothing until the learner confirms, then Today with the same data', async () => {
    const ctx = await browserWith();
    const page = await ctx.newPage();
    await learner(page, OLD, { name: 'Noa' });
    const before = await snapshot(page);
    await page.goto(`${OLD}#/today`);
    await page.waitForSelector('#moved [data-move]');
    const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#moved [data-move]')]);
    await popup.waitForLoadState();
    assert(new RegExp(`^${NEW.replace(/[.]/g, '\\.')}#/import\\?move=[0-9a-f]{32}$`).test(popup.url()), `opened ${popup.url()}`);
    await popup.waitForSelector('[data-restore-summary]');
    const summary = await popup.textContent('[data-restore-summary]');
    assert(/Noa/.test(summary) && /שיעורים שהושלמו: 1/.test(summary) && /מילים בחזרה: 3/.test(summary), `summary: ${summary}`);
    const early = await snapshot(popup);
    assert(!early.name && !early.cards, `written before the learner confirmed: ${JSON.stringify(early)}`);
    await axe(popup, 'the move summary');
    await shot(popup, 'new-move-summary');
    await popup.click('[data-restore-go]');
    await popup.waitForFunction(() => location.hash.startsWith('#/today'));
    const after = await snapshot(popup);
    assert(JSON.stringify(after) === JSON.stringify(before), `moved ${JSON.stringify(after)} vs ${JSON.stringify(before)}`);
    await page.waitForFunction(() => /ההתקדמות הועברה/.test(document.querySelector('[data-move-status]')?.textContent || ''));
    assert(JSON.stringify(await snapshot(page)) === JSON.stringify(before), 'the old copy kept its data');
    await ctx.close();
  });

  await check('M4. Cancelling on the new address writes nothing there and tells the old copy', async () => {
    const ctx = await browserWith();
    const page = await ctx.newPage();
    await learner(page, OLD);
    await page.goto(`${OLD}#/today`);
    await page.waitForSelector('#moved [data-move]');
    const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#moved [data-move]')]);
    await popup.waitForSelector('[data-restore-cancel]');
    await popup.click('[data-restore-cancel]');
    await popup.waitForSelector('[data-restore-note]');
    const s = await snapshot(popup);
    assert(!s.name && !s.cards, 'data was written after Cancel');
    await page.waitForFunction(() => /ההעברה בוטלה/.test(document.querySelector('[data-move-status]')?.textContent || ''));
    await ctx.close();
  });

  await check('M5. Another site that opens the new address cannot hand it data, and hears nothing back', async () => {
    const ctx = await browserWith();
    const evil = await ctx.newPage();
    await evil.goto(EVIL);
    const nonce = 'a'.repeat(32);
    await evil.evaluate(() => { window.heard = []; addEventListener('message', (e) => window.heard.push(e.data)); });
    const [popup] = await Promise.all([ctx.waitForEvent('page'), evil.evaluate((u) => { window.w = window.open(u); }, `${NEW}#/import?move=${nonce}`)]);
    await popup.waitForSelector('#restore-h');
    const forged = { app: 'lucid', version: 1, device: { profile: [{ id: 'me', onboarded: true, name: 'Forged' }] } };
    for (let i = 0; i < 6; i++) {
      await evil.evaluate(({ nonce, forged, to }) => { window.w.postMessage({ type: 'lucid-move-data', nonce, backup: forged }, to); window.w.postMessage({ type: 'lucid-move-data', nonce, backup: forged }, '*'); }, { nonce, forged, to: NEW.slice(0, -1) });
      await evil.waitForTimeout(250);
    }
    assert(!(await popup.$('[data-restore-summary]')), 'a forged backup reached the confirmation');
    assert(!(await snapshot(popup)).name, 'a forged backup was written');
    assert((await evil.evaluate(() => window.heard.length)) === 0, 'the new address answered another origin');
    await ctx.close();
  });

  await check('M6. FR-06: on a new device, "I have a backup" on Welcome restores the downloaded backup without making a profile first; a wrong file changes nothing', async () => {
    const ctx = await browserWith({ downloads: true });
    const page = await ctx.newPage();
    await learner(page, OLD, { name: 'Maya' });
    await page.goto(`${OLD}#/today`);
    await page.waitForSelector('#moved [data-move-backup]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#moved [data-move-backup]')]);
    assert(/^lucid-data-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    const file = join(tmp, 'backup.json');
    await dl.saveAs(file);
    const before = await snapshot(page);
    await ctx.close();
    const other = await browserWith();
    const p = await other.newPage();
    await p.goto(`${NEW}#/welcome`);
    await p.click('a[data-has-backup]');
    await p.waitForSelector('[data-restore-file]', { state: 'attached' });
    assert((await p.evaluate(() => location.hash)) === '#/import', 'Welcome leads to #/import');
    await axe(p, 'the restore screen');
    await shot(p, 'new-restore-choose');
    writeFileSync(join(tmp, 'wrong.json'), '{"app":"something else"}');
    await p.setInputFiles('[data-restore-file]', join(tmp, 'wrong.json'));
    await p.waitForFunction(() => document.querySelector('[data-restore-err]')?.textContent.length > 10);
    assert(!(await snapshot(p)).name, 'a wrong file wrote data');
    await p.setInputFiles('[data-restore-file]', file);
    await p.waitForSelector('[data-restore-summary]');
    assert(/Maya/.test(await p.textContent('[data-restore-summary]')), 'the summary names the profile');
    await p.click('[data-restore-go]');
    await p.waitForFunction(() => location.hash.startsWith('#/today'));
    assert(JSON.stringify(await snapshot(p)) === JSON.stringify(before), 'restored data differs');
    await p.reload();
    await p.waitForSelector('#view > *');
    assert((await p.evaluate(() => location.hash)).startsWith('#/today'), 'after a reload the learner is still in (onboarded)');
    // The device-only Account screen offers the same restore before there is a profile.
    const third = await browserWith();
    const a = await third.newPage();
    await a.goto(`${NEW}#/account`);
    await a.waitForSelector('#view a[href="#/import"]');
    await third.close();
    await other.close();
  });

  await check('M7. FR-11: after "Delete all data", an English-interface learner lands on Welcome in English', async () => {
    const ctx = await browserWith({ newHome: null });
    const page = await ctx.newPage();
    await learner(page, OLD, { lang: 'en' });
    await page.goto(`${OLD}#/settings`);
    await page.waitForSelector('[data-wipe]');
    await page.click('[data-wipe]');
    await page.click('dialog button[value="yes"]');
    await page.waitForFunction(() => location.hash === '#/welcome' && document.querySelector('.welcome h1'));
    await page.waitForTimeout(300);
    const h1 = await page.textContent('.welcome h1');
    assert(/English, from your first letter/.test(h1), `Welcome after the wipe: ${h1}`);
    assert(await page.evaluate(() => document.documentElement.lang) === 'en', 'html lang');
    assert(!(await snapshot(page)).name, 'the data was not deleted');
    await ctx.close();
  });
} finally {
  await browser.close();
  for (const s of servers) s.kill();
  rmSync(tmp, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 15).join('\n  ')}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
