// The boot's network waterfall (perf plan B1, B2): index.html preloads app.js's whole static import graph and the
// two content files every boot reads, and js/core/route-deps.js (each route's modules beyond that graph) is what
// tools/build-route-deps.mjs generates from the code as it stands.
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
