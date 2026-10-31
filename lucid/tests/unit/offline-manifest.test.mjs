// The service worker precaches content/manifest.json's offline list (P-54). It must name every module the
// app can load, or a screen never opened before fails offline. Rebuild with node tools/build-manifest.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('content/manifest.json', root), 'utf8'));
const walk = (dir) => readdirSync(new URL(dir + '/', root), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.m?js$/.test(d.name) ? [`${dir}/${d.name}`] : []));

test('the offline list names every module and every lazily loaded view', () => {
  const missing = [...walk('js'), ...walk('vendor')].filter((f) => !manifest.offline.includes(f));
  assert.deepEqual(missing, [], 'run node tools/build-manifest.mjs');
  const router = readFileSync(new URL('js/core/router.js', root), 'utf8');
  for (const m of router.matchAll(/import\('\.\.\/views\/([\w-]+)\.js'\)/g)) assert.ok(manifest.offline.includes(`js/views/${m[1]}.js`), m[1]);
});

test('lessons are not precached on install (about 3 MB); everything listed exists', () => {
  assert.ok(!manifest.offline.some((f) => f.startsWith('content/lessons/')));
  for (const f of manifest.offline) assert.doesNotThrow(() => readFileSync(new URL(f, root)), f);
});
