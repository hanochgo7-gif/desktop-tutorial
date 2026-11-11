// Hosting on Vercel (BLK-03, BLK-05, BLK-12, IS-03, IS-10): what dist/ holds and does not hold, the response headers
// of vercel.json, the 404 page, and the whole build (skipped without esbuild, except in CI, like build.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, cpSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shippedFiles, isShipped } from '../../tools/build/shipped.mjs';
import { personalise, newHomeOf, distProblems, CANONICAL_MARK, vercelBuild } from '../../tools/build/vercel-build.mjs';
import { headersFor, sourceToRegExp, serve } from '../../tools/build/serve.mjs';
import { computeManifest } from '../../tools/build-manifest.mjs';

const app = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(join(app, p), 'utf8');
const vercel = JSON.parse(read('vercel.json'));
const hasEsbuild = existsSync(join(app, 'tools/build/node_modules/esbuild/package.json'));
const skip = hasEsbuild || process.env.CI === 'true' ? false : 'esbuild not installed (npm ci --prefix tools/build)';
const metaCsp = (html) => html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)?.[1];

test('vercel.json: no framework, installs only the deploy build\'s esbuild, builds with vercel-build.mjs into dist', () => {
  assert.equal(vercel.framework, null);
  assert.equal(vercel.installCommand, 'npm ci --prefix tools/build --no-audit --no-fund');
  assert.equal(vercel.buildCommand, 'node tools/build/vercel-build.mjs');
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(vercel.cleanUrls, false);
  assert.ok(!('rewrites' in vercel) && !('redirects' in vercel), 'every app route is a # route: nothing to rewrite');
});

test('shipped files: the app and nothing internal; everything the worker and its integrity check need is in', () => {
  const files = shippedFiles(app);
  for (const f of ['index.html', 'privacy.html', '404.html', 'sw.js', 'release.json', 'config.js', 'manifest.webmanifest', 'favicon.ico', 'js/app.js', 'css/app.css', 'vendor/ts-fsrs.mjs', 'fonts/rubik-hebrew.woff2', 'content/curriculum.json', 'assets/favicon.svg', 'assets/icons/icon-512.png', 'assets/og-image.png']) assert.ok(files.includes(f), f);
  for (const f of files) assert.doesNotMatch(f, /^(docs|tests|tools|supabase|node_modules|dist)\/|^[^/]+\.md$|^package|^vercel\.json$|(^|\/)\./, f);
  const release = JSON.parse(read('release.json'));
  for (const p of [...Object.keys(release.hashes), ...computeManifest(app).manifest.offline]) assert.ok(files.includes(p), `${p} is needed but not shipped`);
  for (const p of ['docs/setup.md', 'PRODUCT.md', 'README.md', 'tests/unit/build.test.mjs', 'tools/build/build.mjs', 'supabase/migrations', 'package.json', 'package-lock.json', 'vercel.json', '.impeccable/x', 'node_modules/playwright/index.js', 'dist/index.html', 'js/.DS_Store']) assert.equal(isShipped(p), false, p);
  for (const p of ['js/app.js.map', 'css/app.css.map', 'config.js.map', 'terms.html', 'accessibility.html']) assert.equal(isShipped(p), true, p);
  assert.equal(isShipped('other.js.map'), false);
});

test('headers: the page CSP plus frame-ancestors, no framing, nosniff, referrer, microphone for Lucid only', () => {
  const index = metaCsp(read('index.html'));
  assert.ok(index, 'index.html has a CSP meta');
  for (const path of ['/', '/index.html', '/privacy.html', '/404.html', '/js/app.js', '/sw.js', '/content/lessons/a1-01.json', '/nope/deeper']) {
    const h = headersFor(path, vercel);
    assert.equal(h['content-security-policy'], `${index}; frame-ancestors 'none'`, `${path}: the CSP header is the meta CSP plus frame-ancestors`);
    assert.equal(h['x-frame-options'], 'DENY');
    assert.equal(h['x-content-type-options'], 'nosniff');
    assert.equal(h['referrer-policy'], 'strict-origin-when-cross-origin');
    const pp = Object.fromEntries(h['permissions-policy'].split(/,\s*/).map((d) => d.split('=')));
    assert.equal(pp.microphone, '(self)', 'speech practice keeps the microphone');
    for (const f of ['camera', 'geolocation', 'payment', 'usb']) assert.equal(pp[f], '()', f);
    assert.ok(!('cross-origin-opener-policy' in h), 'COOP would cut the window link the one-click move uses (docs/setup.md 5)');
  }
});

test('caching matches GitHub Pages: no-cache for pages, sw.js and release.json; ten minutes for the rest; never both', () => {
  const cache = (p) => headersFor(p, vercel)['cache-control']; // headersFor throws when two rules set one header
  for (const p of ['/', '/index.html', '/privacy.html', '/404.html', '/terms.html', '/sw.js', '/release.json']) assert.equal(cache(p), 'no-cache', p);
  for (const p of shippedFiles(app).filter((f) => !/\.html$/.test(f) && f !== 'sw.js' && f !== 'release.json')) assert.equal(cache(`/${p}`), 'public, max-age=600', p);
  for (const p of ['/js/sw.js', '/content/release.json', '/js/app.js.map', '/robots.txt', '/nope']) assert.equal(cache(p), 'public, max-age=600', p);
  assert.throws(() => headersFor('/x', { headers: [{ source: '/(.*)', headers: [{ key: 'A', value: '1' }] }, { source: '/x', headers: [{ key: 'a', value: '2' }] }] }), /set by/);
});

test('sourceToRegExp follows path-to-regexp: literals, regex groups, no named parameters or capturing groups inside', () => {
  assert.ok(sourceToRegExp('/sw.js').test('/sw.js'));
  assert.ok(!sourceToRegExp('/sw.js').test('/swajs'), 'a literal dot is a dot');
  assert.ok(sourceToRegExp('/(.*)').test('/'));
  assert.ok(sourceToRegExp('/((?!a$).+)').test('/b'));
  assert.ok(!sourceToRegExp('/((?!a$).+)').test('/a'));
  assert.throws(() => sourceToRegExp('/:path*'), /named/);
  assert.throws(() => sourceToRegExp('/(?!x)'), /start with/);
  assert.throws(() => sourceToRegExp('/(a(b))'), /capturing/);
});

test('404.html: Lucid\'s, in Hebrew and English, self-contained, a link home, not indexed, a strict CSP', () => {
  const page = read('404.html');
  assert.match(page, /<html lang="he" dir="rtl">/);
  assert.match(page, /הדף הזה לא קיים\./);
  assert.match(page, /<section lang="en">[\s\S]*This page does not exist\./);
  assert.match(page, /<a class="go" href="\/">/);
  assert.match(page, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(page, /<script|<link rel="stylesheet"|src="(?!data:)/, 'served at any depth: no script, no relative asset');
  assert.match(metaCsp(page), /default-src 'self'/);
});

test('personalise: robots.txt always; with NEW_HOME the canonical link, og:url, an absolute share image and a sitemap of indexable pages', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-personal-'));
  try {
    for (const p of ['index.html', 'privacy.html', '404.html']) cpSync(join(app, p), join(dir, p));
    assert.ok(read('index.html').includes(CANONICAL_MARK));
    assert.deepEqual(personalise(dir, ''), ['robots.txt']);
    assert.equal(readFileSync(join(dir, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\n');
    assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), read('index.html'), 'NEW_HOME empty: index.html untouched');
    // With NEW_HOME and the noindex still on: canonical yes, sitemap no (nothing indexable yet).
    personalise(dir, 'https://lucid.example.org/');
    let page = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(page, /<link rel="canonical" href="https:\/\/lucid\.example\.org\/">\n<meta property="og:url" content="https:\/\/lucid\.example\.org\/">/);
    assert.match(page, /<meta property="og:image" content="https:\/\/lucid\.example\.org\/assets\/og-image\.png">/);
    assert.match(page, /<meta name="twitter:image" content="https:\/\/lucid\.example\.org\/assets\/og-image\.png">/);
    assert.equal(metaCsp(page), metaCsp(read('index.html')));
    assert.ok(!existsSync(join(dir, 'sitemap.xml')));
    // After the launch switch (noindex removed): the sitemap lists the pages, never 404.html.
    for (const p of ['index.html', 'privacy.html']) writeFileSync(join(dir, p), read(p).replace(/<meta name="robots" content="noindex, nofollow">\n/, ''));
    personalise(dir, 'https://lucid.example.org/');
    const map = readFileSync(join(dir, 'sitemap.xml'), 'utf8');
    assert.match(map, /<loc>https:\/\/lucid\.example\.org\/<\/loc>/);
    assert.match(map, /<loc>https:\/\/lucid\.example\.org\/privacy\.html<\/loc>/);
    assert.doesNotMatch(map, /404/);
    assert.match(readFileSync(join(dir, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/lucid\.example\.org\/sitemap\.xml/);
    writeFileSync(join(dir, 'index.html'), '<html></html>');
    assert.throws(() => personalise(dir, 'https://lucid.example.org/'), /canonical marker/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('NEW_HOME must be Lucid\'s own https address ending in "/"; empty is fine', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-home-'));
  const home = (v) => { writeFileSync(join(dir, 'config.js'), `export const CONFIG = {};\nexport const NEW_HOME = ${JSON.stringify(v)};\n`); return newHomeOf(dir); };
  try {
    assert.equal(await newHomeOf(app), '', 'the repository ships with NEW_HOME empty');
    assert.equal(await home(''), '');
    assert.equal(await home('https://lucid.example.org/'), 'https://lucid.example.org/');
    await assert.rejects(home('http://lucid.example.org/'), /https/);
    await assert.rejects(home('https://hanochgo7-gif.github.io/desktop-tutorial/lucid/'), /github\.io/);
    await assert.rejects(home('https://lucid.example.org'), /end with/);
    await assert.rejects(home('lucid.example.org/'), /not an address/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the Vercel build: dist holds exactly the shipped files (built, with maps), robots.txt, passes verify; nothing internal', { skip }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-vercel-'));
  const out = join(dir, 'dist');
  try {
    const r = await vercelBuild({ root: app, out });
    const all = (d, pre = '') => readdirSync(join(d, pre), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? all(d, `${pre}${e.name}/`) : [`${pre}${e.name}`]));
    const got = all(out).sort();
    assert.deepEqual(got.filter((f) => !f.endsWith('.map') && f !== 'robots.txt'), r.files, 'dist holds the shipped files');
    assert.ok(got.includes('js/app.js.map') && got.includes('config.js.map'), 'source maps are shipped on purpose');
    assert.deepEqual(distProblems(out), []);
    for (const f of got) assert.ok(isShipped(f) || f === 'robots.txt', f);
    assert.ok(/sourceMappingURL=app\.js\.map/.test(readFileSync(join(out, 'js/app.js'), 'utf8')), 'built');
    assert.equal(JSON.parse(readFileSync(join(out, 'release.json'), 'utf8')).release, r.release);
    assert.equal(metaCsp(readFileSync(join(out, 'index.html'), 'utf8')), metaCsp(read('index.html')));
    // Served with the vercel.json headers: the page loads with them, an unknown path gets the 404 page.
    const port = 13040;
    const server = await serve({ root: out, port });
    try {
      const home = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(home.status, 200);
      assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      assert.equal(home.headers.get('cache-control'), 'no-cache');
      const nope = await fetch(`http://127.0.0.1:${port}/no/such/page`);
      assert.equal(nope.status, 404);
      assert.match(await nope.text(), /הדף הזה לא קיים/);
      assert.equal((await fetch(`http://127.0.0.1:${port}/docs/setup.md`)).status, 404);
      assert.equal((await fetch(`http://127.0.0.1:${port}/js/app.js`)).headers.get('cache-control'), 'public, max-age=600');
    } finally { server.close(); }
    // An internal file that slipped in fails the build's last check.
    writeFileSync(join(out, 'README.md'), 'x');
    assert.deepEqual(distProblems(out), ['README.md: not a shipped file']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
