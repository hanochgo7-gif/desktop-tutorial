// Launch readiness (BLK-13, IS-03..IS-08): the launch check, install icons and manifest, the share preview, the
// theme colour, noindex kept while the contact is a placeholder, and the repository's root 404 page for Lucid paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { launchItems } from '../../tools/launch-check.mjs';
import { ico } from '../../tools/build-images.mjs';

const app = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(join(app, p), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
const index = read('index.html');
const meta = (html, attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
const pngSize = (p) => { const b = readFileSync(join(app, p)); assert.equal(b.toString('latin1', 1, 4), 'PNG', `${p} is a PNG`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('launch-check lists every item left today and nothing once the owner\'s edits are in', () => {
  const ids = launchItems(app).map((i) => `${i.id}:${i.file}`).sort();
  assert.deepEqual(ids, ['contact:js/core/contact.js', 'contact:privacy.html', 'new-home:config.js', 'noindex:accessibility.html', 'noindex:index.html', 'noindex:privacy.html', 'placeholder:accessibility.html', 'placeholder:privacy.html']);
  const dir = mkdtempSync(join(tmpdir(), 'lucid-launch-'));
  try {
    for (const p of ['index.html', 'privacy.html', 'accessibility.html', '404.html', 'config.js', 'js/core/contact.js']) cpSync(join(app, p), join(dir, p));
    writeFileSync(join(dir, 'js/core/contact.js'), read('js/core/contact.js').replace("email: '',", "email: 'privacy@example.org',"));
    // The owner's edits (docs/setup.md "Launch switch"), with made-up values for the test only.
    writeFileSync(join(dir, 'config.js'), read('config.js').replace("export const NEW_HOME = '';", "export const NEW_HOME = 'https://lucid.example.org/';"));
    writeFileSync(join(dir, 'index.html'), index.replace('<meta name="robots" content="noindex, nofollow">', ''));
    const privacy = read('privacy.html').replace('<meta name="robots" content="noindex, nofollow">', '')
      .replace(/<p class="banner warn">[\s\S]*?<\/p>/g, '<p>Filled in. <a href="mailto:privacy@example.org">privacy@example.org</a></p>');
    writeFileSync(join(dir, 'privacy.html'), privacy);
    writeFileSync(join(dir, 'accessibility.html'), read('accessibility.html').replace('<meta name="robots" content="noindex, nofollow">', '')
      .replace(/<p class="banner warn" data-contact-placeholder>[\s\S]*?<\/p>/g, '<p>Filled in. <a href="mailto:privacy@example.org">privacy@example.org</a></p>'));
    assert.deepEqual(launchItems(dir), [], '404.html keeps its noindex on purpose');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('noindex stays while the operator contact is a placeholder (BLK-13, IS-03); 404.html is never indexed', () => {
  assert.match(read('privacy.html'), /להשלמה לפני הפעלה ציבורית/);
  for (const p of ['index.html', 'privacy.html']) assert.match(read(p), /<meta name="robots" content="noindex, nofollow">/, p);
  assert.match(read('404.html'), /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(index, /<link rel="canonical"/, 'no canonical until NEW_HOME is known (the build adds it)');
});

test('install: manifest id, Hebrew description, education, PNG icons 192/512, a maskable 512, matching sizes', () => {
  assert.equal(manifest.id, './');
  assert.equal(manifest.start_url, './#/today', 'unchanged: installed apps keep their identity');
  assert.match(manifest.description, /^[^a-zA-Z]*אנגלית לדוברי עברית/);
  assert.deepEqual(manifest.categories, ['education']);
  const icons = Object.fromEntries(manifest.icons.map((i) => [`${i.sizes} ${i.purpose}`, i]));
  assert.equal(icons['any any'].src, 'assets/favicon.svg');
  for (const [key, size] of [['192x192 any', 192], ['512x512 any', 512], ['512x512 maskable', 512]]) {
    assert.ok(icons[key], key);
    assert.equal(icons[key].type, 'image/png');
    assert.deepEqual(pngSize(icons[key].src), [size, size], icons[key].src);
  }
  assert.deepEqual(pngSize('assets/icons/apple-touch-icon.png'), [180, 180]);
  for (const page of ['index.html', 'privacy.html']) {
    const html = read(page);
    assert.match(html, /<link rel="apple-touch-icon" href="assets\/icons\/apple-touch-icon\.png">/, page);
    assert.match(html, /<link rel="icon" href="favicon\.ico" sizes="16x16 32x32 48x48">/, page);
  }
  // favicon.ico: three PNG images, 16, 32 and 48 px.
  const icoFile = readFileSync(join(app, 'favicon.ico'));
  assert.equal(icoFile.readUInt16LE(2), 1);
  assert.deepEqual([0, 1, 2].map((i) => icoFile.readUInt8(6 + 16 * i)), [16, 32, 48]);
  const one = ico([{ size: 16, data: Buffer.from('x') }]);
  assert.equal(one.readUInt32LE(6 + 12), 22, 'the image follows the 6-byte header and one 16-byte entry');
});

test('share preview: Hebrew title and description, Open Graph and Twitter tags, a 1200x630 image, no made-up address', () => {
  assert.match(index, /<title>Lucid · אנגלית לדוברי עברית<\/title>/);
  const desc = meta(index, 'name', 'description');
  assert.match(desc, /^שיעורים שנבנו לדוברי עברית/);
  assert.equal(meta(index, 'property', 'og:description'), desc);
  assert.equal(meta(index, 'property', 'og:title'), 'Lucid · אנגלית לדוברי עברית');
  assert.equal(meta(index, 'property', 'og:locale'), 'he_IL');
  assert.equal(meta(index, 'property', 'og:image'), 'assets/og-image.png');
  assert.equal(meta(index, 'name', 'twitter:card'), 'summary_large_image');
  assert.deepEqual(pngSize('assets/og-image.png'), [1200, 630]);
  assert.ok(readFileSync(join(app, 'assets/og-image.png')).length < 300 * 1024);
  assert.equal(meta(index, 'property', 'og:url'), undefined, 'og:url only once NEW_HOME is set (the build adds it)');
  assert.doesNotMatch(index.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''), /https?:\/\//, 'no absolute address is guessed in index.html');
  assert.ok(meta(read('privacy.html'), 'name', 'description'));
});

// The colour the light header paints (--ground, oklch) as sRGB hex: the status bar and title bar match it (IS-07).
function oklchHex(value) {
  const [L, C, h] = value.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/).slice(1).map(Number);
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return `#${[4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)).map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('')}`;
}
test('theme colour: light and dark match the app\'s ground (the header), in the pages and the manifest', () => {
  const css = read('css/app.css');
  const light = css.match(/--n1: (oklch\([^)]*\));/)[1];
  const dark = css.match(/@media \(prefers-color-scheme: dark\) \{\n  :root:not\(\[data-theme='light'\]\) \{\n    --ground: (oklch\([^)]*\));/)[1];
  assert.match(css, /--ground: var\(--n1\);/);
  assert.equal(oklchHex('oklch(1 0 0)'), '#ffffff');
  for (const page of ['index.html', 'privacy.html', '404.html']) {
    const html = read(page);
    assert.match(html, new RegExp(`<meta name="theme-color" content="${oklchHex(light)}" media="\\(prefers-color-scheme: light\\)">`), page);
    assert.match(html, new RegExp(`<meta name="theme-color" content="${oklchHex(dark)}" media="\\(prefers-color-scheme: dark\\)">`), page);
  }
  assert.equal(manifest.theme_color, oklchHex(light));
  assert.equal(manifest.background_color, oklchHex(light));
});

// The repository's root 404.html serves every unknown path of the github.io site (BLK-05, IS-04).
function root404(pathname) {
  const html = readFileSync(join(app, '..', '404.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const went = [];
  vm.runInNewContext(script, { location: { pathname, search: '?x=1', replace: (u) => went.push(u) }, decodeURIComponent });
  return went[0];
}
test('the root 404 page keeps a mistyped Lucid address inside Lucid, and still handles Dira and the rest', () => {
  assert.ok(existsSync(join(app, '..', '404.html')));
  for (const p of ['/desktop-tutorial/lucid/nope', '/desktop-tutorial/lucid/help', '/desktop-tutorial/lucid/terms', '/desktop-tutorial/lucid/accessibility', '/desktop-tutorial/lucid/privacy', '/desktop-tutorial/lucid']) assert.equal(root404(p), '/desktop-tutorial/lucid/?x=1', p);
  assert.equal(root404('/desktop-tutorial/lucidity'), '/', 'only Lucid\'s own folder');
  assert.equal(root404('/desktop-tutorial/dira/x'), '/desktop-tutorial/dira/he/?x=1');
  assert.equal(root404('/somewhere/privacy'), '/privacy.html');
});
