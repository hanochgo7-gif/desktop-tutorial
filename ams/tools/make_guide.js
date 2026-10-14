// בונה את המדריך למתחילים: guide/starter-guide.html -> guide/ams-starter-guide.pdf + תמונת השער לאתר.
// הרצה מתיקיית ams, עם שרת מקומי שמגיש את התיקייה:  python3 -m http.server 8765  ואז:  node tools/make_guide.js
// דורש Playwright (NODE_PATH_PW = הנתיב למודול playwright).
const { chromium } = require(process.env.NODE_PATH_PW || 'playwright');

(async () => {
  const base = process.env.BASE || 'http://localhost:8765/ams/';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(base + 'guide/starter-guide.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: 'guide/ams-starter-guide.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  // תמונת השער: העמוד הראשון ביחס A4
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: 'guide/cover.png', clip: { x: 0, y: 0, width: 794, height: 1123 } });
  await browser.close();
})();
