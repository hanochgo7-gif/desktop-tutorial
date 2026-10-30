// Accessibility audit: axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on every route, in Hebrew and English UI,
// light and dark themes. Prints violations grouped by rule. Usage: node tests/e2e/a11y.mjs [--routes a,b]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 8772;
const BASE = `http://localhost:${PORT}/lucid/`;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const ROUTES = (arg('--routes') || 'welcome,today,path,practice,vocab,grammar,reading,listening,speaking,writing,writing/free,tutor,real-life,expressions,conversations,progress,profile,settings,account,lesson/pa1-05,review').split(',');

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: repo, stdio: 'ignore' });
await sleep(800);
const browser = await chromium.launch();
const byRule = new Map();
let total = 0;
try {
  for (const [lang, theme, width] of [['he', 'light', 390], ['he', 'dark', 1440], ['en', 'light', 1440]]) {
    // bypassCSP only so the audit can inject axe; the app's CSP is checked by the e2e suite.
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', colorScheme: theme, bypassCSP: true });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/welcome`);
    await page.waitForSelector('.welcome');
    // Create a learner directly through the app's store (onboarding itself is covered by the e2e suite).
    await page.evaluate(async (l) => {
      const { saveProfile, saveSettings, applyPlacement } = await import('./js/core/learner.js');
      const { zeroResult } = await import('./js/core/placement.js');
      saveProfile({ onboarded: true, name: 'Dana', birth_year: 2000, ui_language: l, goals: ['travel'], created_at: new Date().toISOString() });
      saveSettings({ daily_minutes: 35 });
      await applyPlacement(zeroResult());
    }, lang);
    for (const r of ROUTES) {
      await page.goto(`${BASE}#/${r}?a11y=${lang}${theme}`);
      await page.waitForTimeout(500);
      if (r === 'lesson/pa1-05') { await page.click('[data-go="learn"]').catch(() => {}); await page.waitForTimeout(200); }
      await page.addScriptTag({ content: axeSource });
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} :: ${n.failureSummary.split('\n').slice(1, 2).join(' ').slice(0, 160)}`) }));
      });
      for (const v of res) {
        total++;
        const k = `${v.impact} ${v.id}: ${v.help}`;
        if (!byRule.has(k)) byRule.set(k, []);
        byRule.get(k).push(`[${lang}/${theme}/${width}] ${r} -> ${v.nodes.join(' | ')}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
for (const [k, list] of byRule) { console.log(`\n${k} (${list.length})`); list.slice(0, 6).forEach((x) => console.log(`  ${x}`)); }
console.log(`\n${total} violations across ${ROUTES.length} routes x 3 configurations`);
process.exit(total ? 1 : 0);
