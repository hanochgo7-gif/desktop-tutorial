// The service worker precaches content/manifest.json's offline list (P-54). It must name every module the
// app can load, or a screen never opened before fails offline. release.json holds a hash of every file the
// worker can serve from its cache, and sw.js's RELEASE names the cache; both must follow every change to a
// shipped byte (perf D1), or learners keep old code. Rebuild with node tools/build-manifest.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { buildManifest, computeManifest, computeRelease, fileHash, shellOf } from '../../tools/build-manifest.mjs';

const root = new URL('../../', import.meta.url);
const rootDir = fileURLToPath(root);
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
  assert.ok(!manifest.offline.some((f) => f.startsWith('content/centers/') || f.startsWith('content/pool/')), 'centre and pool files are cached on first use');
  for (const f of manifest.offline) assert.doesNotThrow(() => readFileSync(new URL(f, root)), f);
});

test('content/manifest.json, release.json and the RELEASE line of sw.js are up to date (run node tools/build-manifest.mjs)', () => {
  const r = buildManifest(rootDir, { write: false });
  assert.deepEqual(r.stale, [], `stale: ${r.stale.join(', ')}; run node tools/build-manifest.mjs`);
  const release = JSON.parse(readFileSync(new URL('release.json', root), 'utf8'));
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  assert.equal(sw.match(/^const RELEASE = '([^']*)';$/m)[1], release.release, 'sw.js RELEASE equals release.json release');
  assert.match(release.release, /^[0-9a-f]{12}$/);
});

test('release.json hashes every file the worker precaches, every lesson, every font and the full files the index files replace, and nothing else', () => {
  const { hashes } = JSON.parse(readFileSync(new URL('release.json', root), 'utf8'));
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  const precache = [...shellOf(sw).map((p) => (p === './' ? 'index.html' : p)).filter((p) => p !== 'release.json'), ...manifest.offline];
  for (const p of precache) assert.ok(hashes[p], `${p} has no hash`);
  for (const l of manifest.lessons) assert.ok(hashes[`content/lessons/${l}.json`], `lesson ${l} has no hash`);
  for (const [p, h] of Object.entries(hashes)) {
    assert.equal(h, fileHash(readFileSync(new URL(p, root))), `${p}: hash does not match the file`);
    // The full files are fetched when an index file cannot be loaded (content.js); a copy is kept only once checked.
    const replaced = ['content/real-life/scenarios.json', 'content/writing/exercises.json', 'content/writing/assignments.json'];
    assert.ok(precache.includes(p) || /^content\/(lessons|centers|pool)\//.test(p) || /^fonts\/[\w-]+\.woff2$/.test(p) || replaced.includes(p), `${p} is hashed but never served from the release cache`);
  }
  assert.ok(!('release.json' in hashes) && !('sw.js' in hashes));
});

test('content/manifest.json keeps its shape and stays small (it is read at boot)', () => {
  assert.deepEqual(Object.keys(manifest), ['version', 'lessons', 'offline']);
  // 726 bytes gzipped at the delivery lane's base; the content lane's split files (contract C-2) add about 500.
  // The per-file hashes live in release.json, which only the worker and the tools read.
  const gz = gzipSync(readFileSync(new URL('content/manifest.json', root))).length;
  assert.ok(gz <= 1536, `manifest.json is ${gz} bytes gzipped`);
  assert.ok(!/[0-9a-f]{12}"\s*[,}]/.test(JSON.stringify(manifest.offline)), 'no hashes in the boot-path manifest');
});

// A copy of the shipped files in a temporary directory: a one-byte edit must make the check fail until the tool
// is run again (perf D1 acceptance).
test('a 1-byte edit to a precached file, a lesson or the logic of sw.js makes the release stale until rebuilt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-release-'));
  try {
    for (const p of ['js', 'vendor', 'css', 'fonts', 'content', 'assets', 'index.html', 'config.js', 'manifest.webmanifest', 'privacy.html', 'sw.js', 'release.json']) {
      if (existsSync(join(rootDir, p))) cpSync(join(rootDir, p), join(dir, p), { recursive: true });
    }
    assert.deepEqual(buildManifest(dir, { write: false }).stale, []);
    const first = computeRelease(dir).release;
    const edits = [
      ['js/views/today.js', (s) => `${s} `],
      ['content/lessons/a1-01.json', (s) => `${s} `],
      ['sw.js', (s) => s.replace('const SCOPE', 'const  SCOPE')],
      ['css/app.css', (s) => `${s}\n`],
      ['index.html', (s) => `${s}\n`],
    ];
    const seen = new Set([first]);
    for (const [p, edit] of edits) {
      writeFileSync(join(dir, p), edit(readFileSync(join(dir, p), 'utf8')));
      const stale = buildManifest(dir, { write: false }).stale;
      assert.ok(stale.includes('release.json') && stale.includes('sw.js'), `${p}: not detected (${stale})`);
      const r = buildManifest(dir);
      assert.ok(!seen.has(r.release), `${p}: the release did not change`);
      seen.add(r.release);
      assert.deepEqual(buildManifest(dir, { write: false }).stale, [], `${p}: still stale after rebuilding`);
    }
    // A new lesson file changes the manifest too.
    writeFileSync(join(dir, 'content/lessons/zz-99.json'), '{}');
    assert.deepEqual(buildManifest(dir, { write: false }).stale.sort(), ['content/manifest.json', 'release.json', 'sw.js']);
    // Only the RELEASE line itself does not count (it is normalised), so stamping is stable.
    buildManifest(dir);
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    writeFileSync(join(dir, 'sw.js'), sw.replace(/^const RELEASE = '[^']*';$/m, "const RELEASE = 'xyz';"));
    assert.equal(computeRelease(dir).release, JSON.parse(readFileSync(join(dir, 'release.json'), 'utf8')).release);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('index files replace the big source files in the offline list; centre and pool files are never precached (contract C-2)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-split-'));
  try {
    for (const p of ['js', 'vendor', 'content', 'sw.js']) cpSync(join(rootDir, p), join(dir, p), { recursive: true });
    // Start from a tree without the generated files (as before the content lane), then add them one kind at a time.
    for (const p of ['real-life/index.json', 'real-life/scenario', 'writing/index.json', 'writing/task', 'centers', 'pool']) rmSync(join(dir, 'content', p), { recursive: true, force: true });
    const before = computeManifest(dir).manifest.offline;
    assert.ok(before.includes('content/real-life/scenarios.json') && before.includes('content/writing/exercises.json'));
    for (const d of ['real-life/scenario', 'writing/task', 'centers', 'pool']) mkdirSync(join(dir, 'content', d), { recursive: true });
    writeFileSync(join(dir, 'content/real-life/index.json'), '{}');
    cpSync(join(dir, 'content/taxonomy.json'), join(dir, 'content/real-life/scenario/rl-a.json'));
    writeFileSync(join(dir, 'content/writing/index.json'), '{}');
    cpSync(join(dir, 'content/taxonomy.json'), join(dir, 'content/writing/task/w-a.json'));
    cpSync(join(dir, 'content/taxonomy.json'), join(dir, 'content/centers/read.json'));
    cpSync(join(dir, 'content/taxonomy.json'), join(dir, 'content/pool/A1.json'));
    const after = computeManifest(dir).manifest.offline;
    for (const f of ['content/real-life/index.json', 'content/real-life/scenario/rl-a.json', 'content/writing/index.json', 'content/writing/task/w-a.json']) assert.ok(after.includes(f), f);
    for (const f of ['content/real-life/scenarios.json', 'content/writing/exercises.json', 'content/writing/assignments.json', 'content/centers/read.json', 'content/pool/A1.json']) assert.ok(!after.includes(f), f);
    assert.ok(after.includes('content/real-life/slang.json'));
    // The committed tree (both lanes merged): every split file is listed, so a scenario or task opens offline; the
    // centre and pool files and the replaced sources are not (their views fall back to the saved lessons).
    const real = computeManifest(rootDir).manifest.offline;
    for (const d of ['real-life/scenario', 'writing/task']) {
      const ids = readdirSync(join(rootDir, 'content', d)).filter((f) => f.endsWith('.json'));
      assert.ok(ids.length > 0 && ids.every((f) => real.includes(`content/${d}/${f}`)), d);
    }
    assert.ok(!real.some((f) => /^content\/(centers|pool)\/|^content\/real-life\/scenarios\.json$|^content\/writing\/(exercises|assignments)\.json$/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
