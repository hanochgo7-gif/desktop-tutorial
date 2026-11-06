// The boot (perf plan B1, B4, B5): index.html preloads app.js's whole static import graph and the two content files
// every boot reads; its boot frame uses the app's own colours, and the module script does not wait for the stylesheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { APP, bootModules } from '../../tools/build-route-deps.mjs';

const read = (rel, root = APP) => readFileSync(join(root, rel), 'utf8');
const links = (html, rel) => [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((tag) => new RegExp(`\\brel="${rel}"`).test(tag));
const hrefOf = (tag) => tag.match(/\bhref="([^"]+)"/)?.[1];
const modulepreloads = (root = APP) => links(read('index.html', root), 'modulepreload').map(hrefOf);

// What is imported at boot but not preloaded, and what is preloaded but not imported at boot.
function preloadDrift(root = APP) {
  const boot = bootModules(root);
  const pre = modulepreloads(root);
  return { missing: boot.filter((f) => !pre.includes(f)), extra: pre.filter((f) => !boot.includes(f)) };
}

test('index.html preloads exactly the static import graph of js/app.js (B1)', () => {
  const pre = modulepreloads();
  assert.equal(new Set(pre).size, pre.length, 'a module is preloaded twice');
  assert.deepEqual(preloadDrift(), { missing: [], extra: [] }, 'add or remove <link rel="modulepreload"> lines in index.html');
  for (const f of ['js/core/session.js', 'js/core/placement.js']) assert.ok(pre.includes(f), f);
});

test('the preload check fails when a boot import is added without a preload', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-preload-'));
  try {
    mkdirSync(join(dir, 'js/core'), { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<link rel="modulepreload" href="js/app.js">\n<link rel="modulepreload" href="js/core/a.js">\n');
    writeFileSync(join(dir, 'js/app.js'), "import { a } from './core/a.js';\nimport('./views/lazy.js');\n");
    writeFileSync(join(dir, 'js/core/a.js'), "export const a = 1;\n");
    assert.deepEqual(preloadDrift(dir), { missing: [], extra: [] }, 'a dynamic import() is not part of the boot graph');
    writeFileSync(join(dir, 'js/core/a.js'), "import { b } from './b.js';\nexport { c } from './c.js';\nexport const a = b;\n");
    writeFileSync(join(dir, 'js/core/b.js'), "export const b = 1;\n");
    writeFileSync(join(dir, 'js/core/c.js'), "export const c = 1;\n");
    assert.deepEqual(preloadDrift(dir).missing, ['js/core/b.js', 'js/core/c.js']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the two content files every boot reads are preloaded so content.js uses the same response (B1)', () => {
  const tags = links(read('index.html'), 'preload').filter((tag) => /\bas="fetch"/.test(tag));
  assert.deepEqual(tags.map(hrefOf).sort(), ['content/curriculum.json', 'content/manifest.json']);
  // crossorigin (anonymous) gives the preload the same mode and credentials as a plain fetch(), so it matches.
  for (const tag of tags) assert.match(tag, /\scrossorigin(?:[\s>]|="anonymous")/, tag);
  const content = read('js/core/content.js');
  assert.match(content, /fetch\(new URL\(path, base\)\)/, 'content.js fetches with no init, which the crossorigin preload matches');
  assert.match(content, /new URL\('\.\.\/\.\.\/content\/', import\.meta\.url\)/, 'content files resolve from the app root, as index.html does');
  assert.match(content, /curriculum: \(\) => get\('curriculum\.json'\)/);
  assert.match(content, /manifest: \(\) => get\('manifest\.json'/);
  // Both are read on every boot, before the first route (learner.initModel), so neither preload goes unused.
  const init = read('js/core/learner.js').match(/export async function initModel\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(init, /content\.curriculum\(\)/);
  assert.match(init, /content\.availableLessons\(\)/);
  assert.match(read('js/core/content.js'), /async availableLessons\(\) \{\s*const m = await this\.manifest\(\);/);
  assert.match(read('js/app.js'), /await initModel\(\);[\s\S]*await router\.start\(\)/);
});

// ---------- the boot frame (B5) and the hidden main column (B4) ----------
// A token's value in a block of app.css, with var(--x) references resolved in the light :root block.
const css = read('css/app.css');
function block(start) {
  const i = css.indexOf(start);
  assert.ok(i >= 0, start);
  const from = css.indexOf('{', i);
  let depth = 0;
  let j = from;
  for (; j < css.length; j++) { if (css[j] === '{') depth++; else if (css[j] === '}' && --depth === 0) break; }
  return css.slice(from + 1, j);
}
const LIGHT = block(':root {');
const DARK = block("@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) {\n    --ground");
function token(name, scope = LIGHT) {
  const v = (scope.match(new RegExp(`--${name}:\\s*([^;]+);`)) || LIGHT.match(new RegExp(`--${name}:\\s*([^;]+);`)))?.[1].trim();
  const ref = v?.match(/^var\(--([\w-]+)\)$/);
  return ref ? token(ref[1], LIGHT) : v;
}
const frameCss = read('index.html').match(/<style>([\s\S]*?)<\/style>/)[1];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rule = (sel, text = frameCss) => text.match(new RegExp(`(?:^|[}\\n])${esc(sel)}\\{([^}]*)\\}`))?.[1] || '';
const decl = (body, prop) => body.match(new RegExp(`(?:^|;)${prop}:([^;]+)`))?.[1].trim();
const darkCss = frameCss.match(/@media \(prefers-color-scheme:dark\)\{([\s\S]*?\})\}/)[1];

test('the boot frame paints in the app\'s ground, ink and key colours, light and dark (B5)', () => {
  const frame = rule('.bootframe');
  assert.equal(decl(rule('.booting'), 'background'), token('ground'));
  assert.equal(decl(frame, 'background'), token('ground'));
  assert.equal(decl(frame, 'color'), token('ink'));
  const spin = rule('.bootframe-spin');
  assert.equal(decl(spin, 'border').replace(/^[\d.]+px solid /, ''), token('key-edge'));
  assert.equal(decl(spin, 'border-top-color'), token('cobalt'));
  const key = rule('.bootframe-key');
  assert.equal(decl(key, 'background'), token('enter'));
  assert.equal(decl(key, 'color'), token('enter-ink'));
  assert.equal(decl(key, 'border-bottom').replace(/^[\d.]+px solid /, ''), token('enter-skirt'));
  // Dark: never a white first frame.
  assert.equal(decl(rule('.booting,.bootframe', darkCss), 'background'), token('ground', DARK));
  assert.equal(decl(rule('.bootframe', darkCss), 'color'), token('ink', DARK));
  assert.equal(decl(rule('.bootframe-spin', darkCss), 'border-color'), token('key-edge', DARK));
  assert.equal(decl(rule('.bootframe-spin', darkCss), 'border-top-color'), token('cobalt', DARK));
  assert.ok(token('ground', DARK).startsWith('oklch(0.1'), 'the dark ground is dark');
});

test('the module script does not wait for the stylesheet, which comes after the frame; the frame is hidden from assistive technology (B4, B5)', () => {
  const html = read('index.html');
  const at = (s) => { const i = html.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('<script type="module" async src="js/app.js"></script>') < at('</head>'), 'the module script is in the head, async');
  assert.ok(at('<link rel="preload" href="css/app.css" as="style">') < at('</head>'));
  assert.ok(at('<div class="bootframe" aria-hidden="true">') < at('<link rel="stylesheet" href="css/app.css">'));
  assert.ok(at('<link rel="stylesheet" href="css/app.css">') < at('<a class="skip"'), 'the skip link is still the first thing to focus');
  assert.equal(html.match(/<link rel="stylesheet"/g).length, 1);
  assert.equal(html.match(/<script\b/g).length, 1, 'no inline script (CSP script-src self)');
  assert.match(html, /<html lang="he" dir="rtl" class="booting">/);
  assert.match(html, /<div class="boot boot-first"><span class="spinner" role="status" aria-label="Loading"><\/span><\/div>/);
  // Without JavaScript the frame never covers the page.
  assert.match(html, /<noscript><style>\.bootframe\{display:none\}\.booting \.main\{visibility:visible\}<\/style><\/noscript>/);
  // app.css: the main column is hidden only while booting and the frame goes with the class; app.js removes it when
  // it draws the shell and when the boot fails.
  assert.match(css, /\.booting \.main \{ visibility: hidden; \}/);
  assert.match(css, /html:not\(\.booting\) \.bootframe \{ display: none; \}/);
  const app = read('js/app.js');
  assert.match(app, /function drawShell\(route\) \{\n  document\.documentElement\.classList\.remove\('booting'\);/);
  assert.match(app, /boot\(\)\.catch\(async \(e\) => \{\n  console\.error\(e\);\n  await domReady\(\);\n  document\.documentElement\.classList\.remove\('booting'\);/);
  // Running before the page is parsed, app.js touches the body only after the document is ready.
  assert.match(app, /primeRoute\(\); \} catch \(e\) \{ console\.warn\(e\); \}\n  await domReady\(\);\n\n  if \(configured\(\)\)/);
});
