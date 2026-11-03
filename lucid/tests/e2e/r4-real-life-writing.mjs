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
} finally {
  await browser.close();
  server.kill();
}

if (pageErrors.length) { console.log(`FAIL  no page errors\n      ${pageErrors.slice(0, 3).join('\n      ')}`); results.push({ ok: false }); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
