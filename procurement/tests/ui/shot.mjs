// Screenshot a screen of the app on the dev server, signed in as a given user.
// node procurement/tests/ui/shot.mjs <hash-path> <width> <out.png> [email] [full]
// Prints console errors and failed requests, which count as failures.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [path = '', width = '1440', out = '/tmp/shot.png', email = 'demo@example.com', full = ''] = process.argv.slice(2);
const W = Number(width);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: W < 800 ? 844 : 900 }, deviceScaleFactor: 1, locale: 'he-IL' });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()} ${r.url()}`); });
await page.goto(`http://localhost:${process.env.APP_PORT || 8787}/procurement/`);
await page.fill('#lg-e', email);
await page.fill('#lg-p', 'demo1234');
await page.click('button[type=submit]');
await page.waitForSelector('.layout', { timeout: 15000 });
if (path) { await page.evaluate((p) => { location.hash = '#/' + p; }, path); }
await page.waitForTimeout(400);
await page.waitForFunction(() => !document.querySelector('#main .skel'), null, { timeout: 15000 }).catch(() => problems.push('still loading'));
await page.waitForTimeout(300);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 1) problems.push('horizontal overflow ' + overflow + 'px');
await page.screenshot({ path: out, fullPage: !!full });
console.log(problems.length ? problems.join('\n') : 'clean');
await browser.close();
