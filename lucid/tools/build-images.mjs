// Writes Lucid's install icons and share image (IS-05, IS-06), rendered with the Chromium that Playwright drives (a
// dev dependency of the tests; nothing new is installed). The output is committed; run this again only after
// changing assets/favicon.svg or the share image below.
// - assets/icons/icon-192.png, icon-512.png: assets/favicon.svg as it is (purpose "any", transparent corners);
// - assets/icons/maskable-512.png: full-bleed key colour, the two letters inside the central safe zone (Android);
// - assets/icons/apple-touch-icon.png (180): opaque, for iOS "Add to Home Screen";
// - favicon.ico (16, 32 and 48 px PNGs) at the app root;
// - assets/og-image.png (1200x630): the share preview, with the welcome screen's own headline.
// The letters are drawn in Rubik, the app's font (fonts/, embedded here), as the brand mark in the app is, so the
// result does not depend on the fonts installed where this runs. favicon.svg itself keeps its system font stack.
// Usage (from lucid/): node tools/build-images.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = (f) => `data:font/woff2;base64,${readFileSync(join(APP, 'fonts', f)).toString('base64')}`;
const FACES = `@font-face{font-family:Rubik;src:url(${font('rubik-latin.woff2')}) format('woff2');font-weight:300 900;unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Rubik;src:url(${font('rubik-hebrew.woff2')}) format('woff2');font-weight:300 900;unicode-range:U+0590-05FF}`;
const SVG = readFileSync(join(APP, 'assets/favicon.svg'), 'utf8');
// The favicon's letters only (the two <text> elements), for the full-bleed icons.
const LETTERS = SVG.match(/<text[\s\S]*<\/text>/)[0];

const page = (body, w, h, bg = 'transparent') => `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}
html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${bg}}svg{display:block;width:${w}px;height:${h}px}svg text{font-family:Rubik,sans-serif!important}</style></head><body>${body}</body></html>`;

// favicon.svg as is.
const anyIcon = (n) => page(SVG.replace('<svg ', `<svg width="${n}" height="${n}" `), n, n);
// Full bleed in the key colour with the letters scaled about the centre: scale 0.85 keeps them inside the maskable
// safe zone (the central circle of 80% diameter); the apple-touch tile is cropped less, so 0.95.
const fullBleed = (n, scale) => page(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${n}" height="${n}"><rect width="64" height="64" fill="#f0883e"/><g transform="translate(32 32) scale(${scale}) translate(-31 -30)">${LETTERS}</g></svg>`, n, n, '#f0883e');

// The share image: the brand, the welcome headline (js/views/welcome.js, both languages) and the dual-legend keys.
const KEYS = [['L', 'ך'], ['U', 'ו'], ['C', 'ב'], ['I', 'ן'], ['D', 'ג']];
const SHARE = page(`<div class="og" dir="rtl" lang="he">
  <div class="brand"><span class="mark">L<small>ל</small></span><span>Lucid</span></div>
  <h1>אנגלית, מהאות הראשונה ועד הטיעון הכי טוב שלכם.</h1>
  <p class="en" dir="ltr" lang="en">English, from your first letter to your best argument.</p>
  <div class="keys" dir="ltr">${KEYS.map(([l, h]) => `<span class="k"><b>${l}</b><i>${h}</i></span>`).join('')}</div>
</div>
<style>
.og{box-sizing:border-box;width:1200px;height:630px;padding:64px 80px;display:flex;flex-direction:column;justify-content:space-between;background:oklch(0.972 0.004 250);color:oklch(0.185 0.010 250);font-family:Rubik,sans-serif}
.brand{display:flex;align-items:center;gap:20px;font-size:44px;font-weight:700}
.mark{position:relative;display:grid;place-items:center;width:76px;height:76px;border-radius:18px;background:#f0883e;color:#241912;border-bottom:8px solid #b4502a;font-size:40px}
.mark small{position:absolute;bottom:2px;inset-inline-start:10px;font-size:20px;color:#1f3a8a;font-weight:600}
h1{margin:0;font-size:64px;line-height:1.18;font-weight:700;max-width:1000px}
.en{margin:0;font-size:32px;color:oklch(0.42 0.012 250);text-align:left}
.keys{display:flex;gap:16px;align-self:flex-start}
.k{position:relative;width:84px;height:84px;border-radius:16px;background:#fff;border:2px solid oklch(0.88 0.008 250);border-bottom:7px solid oklch(0.82 0.01 250);display:block}
.k b{position:absolute;top:10px;left:14px;font-size:34px;font-weight:600}
.k i{position:absolute;bottom:8px;right:14px;font-style:normal;font-size:24px;color:#1f3a8a}
</style>`, 1200, 630);

// An ICO file holding PNG images (allowed since Windows Vista; every current browser reads it).
export function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

async function main() {
  const { chromium } = createRequire(join(APP, 'package.json'))('playwright');
  const browser = await chromium.launch();
  const shot = async (html, w, h, { transparent = false } = {}) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    const png = await p.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
    return png;
  };
  mkdirSync(join(APP, 'assets/icons'), { recursive: true });
  const out = {
    'assets/icons/icon-192.png': await shot(anyIcon(192), 192, 192, { transparent: true }),
    'assets/icons/icon-512.png': await shot(anyIcon(512), 512, 512, { transparent: true }),
    'assets/icons/maskable-512.png': await shot(fullBleed(512, 0.85), 512, 512),
    'assets/icons/apple-touch-icon.png': await shot(fullBleed(180, 0.95), 180, 180),
    'assets/og-image.png': await shot(SHARE, 1200, 630),
  };
  out['favicon.ico'] = ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await shot(anyIcon(size), size, size, { transparent: true }) }))));
  await browser.close();
  for (const [rel, data] of Object.entries(out)) { writeFileSync(join(APP, rel), data); console.log(`${rel}: ${data.length} bytes`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
