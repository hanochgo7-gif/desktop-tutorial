// קרודו הנדסה · מצלם את תמונת השיתוף ומפיק PDF של רשימת הבדיקה.
// דורש שרת מקומי מתיקיית הריפו: python3 -m http.server 8765
// ואז: NODE_PATH=$(npm root -g) node krudoeng/tools/render.cjs   (Playwright מותקן גלובלית)
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');
const HERE = __dirname;
const ROOT = dirname(HERE);
const BASE = process.env.BASE || 'http://127.0.0.1:8765/krudoeng';
const out = join(HERE, 'out');
mkdirSync(out, { recursive: true });
(async () => {
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(`${BASE}/tools/og.html`);
await p.waitForSelector('body[data-ready]');
await p.waitForTimeout(400);
await p.locator('.og').screenshot({ path: join(out, 'og.png') });
console.log('og');
await p.goto(`${BASE}/checklist/`, { waitUntil: 'networkidle' });
await p.emulateMedia({ media: 'print' });
await p.pdf({ path: join(ROOT, 'assets', 'krudo-checklist.pdf'), format: 'A4', printBackground: true, tagged: true, outline: true, margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' } });
console.log('pdf');
await b.close();
})();
