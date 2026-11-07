// The one-time upgrade from release 2026-11-03.1 (js/core/compat.js, tests/e2e/upgrade.mjs). A tab started on that
// release keeps its boot modules and opens this release's screens, so:
// - on this release, compat.js gives the core modules' own functions and leaves content.js untouched;
// - on an old page, it gives the same results built on the old modules (content.js's C-1 methods and the C-3 helpers);
// - no module the old page can load from this release imports a name the old modules lack, and a module that calls
//   a content method the old `content` object lacks imports compat.js (tests/unit/fixtures/release-2026-11-03.1.json
//   lists that release's modules, their exports, its boot graph and its content methods).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT = join(APP, 'content');
const OLD = JSON.parse(readFileSync(join(APP, 'tests/unit/fixtures/release-2026-11-03.1.json'), 'utf8'));
const readJson = (rel) => JSON.parse(readFileSync(join(CONTENT, rel), 'utf8'));

// fetch over the content folder: blocked paths fail like a network error, missing files are 404.
function diskFetch({ blocked = [], log = [] } = {}) {
  return async (url) => {
    const path = fileURLToPath(String(url));
    log.push(path.slice(CONTENT.length + 1));
    if (blocked.some((b) => path.includes(b))) throw new TypeError('Failed to fetch');
    if (!existsSync(path)) return new Response('', { status: 404 });
    return new Response(readFileSync(path), { status: 200 });
  };
}
// release 2026-11-03.1's content object: the full files only, through its own memo.
function oldContent(fetchFn) {
  const memo = new Map();
  const get = (p) => {
    if (!memo.has(p)) memo.set(p, fetchFn(pathToFileURL(join(CONTENT, p))).then((r) => (r.ok ? r.json() : null)));
    return memo.get(p);
  };
  return { scenarios: () => get('real-life/scenarios.json'), writingExercises: () => get('writing/exercises.json'), assignments: () => get('writing/assignments.json') };
}
const BASE = pathToFileURL(`${CONTENT}/`);

test('on this release, compat.js gives the core modules\' own functions and adds nothing to content', async () => {
  const contentModule = await import('../../js/core/content.js');
  const util = await import('../../js/core/util.js');
  const before = Object.fromEntries(Object.entries(contentModule.content));
  const compat = await import('../../js/core/compat.js');
  assert.equal(compat.withItemCount, contentModule.withItemCount);
  assert.equal(compat.CENTERS, contentModule.CENTERS);
  assert.equal(compat.collatorEn, util.collatorEn);
  assert.equal(compat.relTime, util.relTime);
  assert.equal(compat.groupDigits, util.groupDigits);
  assert.deepEqual(Object.fromEntries(Object.entries(contentModule.content)), before, 'content.js\'s methods are its own');
});

test('on a page still running release 2026-11-03.1, the C-1 methods are added and read the same files as content.js', async () => {
  const { upgrade } = await import('../../js/core/compat.js');
  const { scenarioIndexOf, writingIndexOf } = await import('../../js/core/content.js');
  const log = [];
  const content = oldContent(diskFetch({ log }));
  const api = upgrade({ content }, {}, { base: BASE, fetchFn: diskFetch({ log }) });
  for (const m of ['scenarioIndex', 'scenario', 'writingIndex', 'writingTask', 'center', 'pool']) assert.equal(typeof content[m], 'function', m);
  assert.deepEqual(await content.scenarioIndex(), readJson('real-life/index.json'));
  assert.deepEqual(await content.scenario('rl-airport-checkin-overweight'), readJson('real-life/scenario/rl-airport-checkin-overweight.json'));
  assert.equal(await content.scenario('no-such-scenario'), null);
  assert.deepEqual(await content.writingIndex(), readJson('writing/index.json'));
  assert.deepEqual(await content.writingTask('we-01'), readJson('writing/task/we-01.json'));
  assert.equal(await content.writingTask('free'), null);
  assert.deepEqual(await content.center('read'), readJson('centers/read.json'));
  assert.deepEqual(await content.pool('A1'), readJson('pool/A1.json'));
  await assert.rejects(content.pool('Z9'));
  assert.ok(!log.some((p) => /scenarios\.json|exercises\.json|assignments\.json/.test(p)), `the full files were read: ${log}`);
  // The generated files unreachable (offline with only the full files cached): the rows are built from the full files,
  // the same rows the generated files hold.
  const off = oldContent(diskFetch());
  upgrade({ content: off }, {}, { base: BASE, fetchFn: diskFetch({ blocked: ['/index.json', '/scenario/', '/task/', '/centers/', '/pool/'] }) });
  assert.deepEqual(await off.scenarioIndex(), scenarioIndexOf(readJson('real-life/scenarios.json')));
  assert.deepEqual(await off.scenarioIndex(), readJson('real-life/index.json'));
  assert.deepEqual(await off.writingIndex(), writingIndexOf(readJson('writing/exercises.json'), readJson('writing/assignments.json')));
  assert.deepEqual(await off.scenario('rl-airport-checkin-overweight'), readJson('real-life/scenario/rl-airport-checkin-overweight.json'));
  assert.deepEqual(await off.writingTask('we-01'), readJson('writing/task/we-01.json'));
  await assert.rejects(off.center('read'), 'a centre file that cannot be loaded rejects, so the centre uses the lessons');
  // A method the old object has is never replaced.
  const own = () => 'own';
  const mixed = { ...oldContent(diskFetch()), scenarioIndex: own };
  upgrade({ content: mixed }, {}, { base: BASE, fetchFn: diskFetch() });
  assert.equal(mixed.scenarioIndex, own);
  assert.ok(api.withItemCount && api.CENTERS);
});

test('on an old page, the C-3 helpers and content.js\'s exports behave as this release\'s', async () => {
  const { upgrade } = await import('../../js/core/compat.js');
  const contentModule = await import('../../js/core/content.js');
  const util = await import('../../js/core/util.js');
  const old = upgrade({ content: oldContent(diskFetch()) }, {}, { base: BASE, fetchFn: diskFetch() });
  assert.notEqual(old.collatorEn, util.collatorEn, 'the fallbacks are in use');
  assert.deepEqual(old.CENTERS, contentModule.CENTERS);
  for (const row of [{ id: 'x', n_items: 3 }, { id: 'y', items: [1] }, { id: 'z' }, null]) assert.deepEqual(old.withItemCount(row), contentModule.withItemCount(row));
  const words = ['apple', 'Zebra', 'éclair', 'eclair', 'Ünder', 'under', 'b', 'B', ''];
  for (const a of words) for (const b of words) assert.equal(Math.sign(old.collatorEn().compare(a, b)), Math.sign(util.collatorEn().compare(a, b)), `${a} ${b}`);
  for (const lang of ['he', 'en']) for (const n of [-2, -1, 0, 1, 3]) assert.equal(old.relTime(lang).format(n, 'day'), util.relTime(lang).format(n, 'day'));
  for (const n of [0, 7, 999, 1000, 1500, 1234567, -4200, 2.5]) assert.equal(old.groupDigits(n), util.groupDigits(n), String(n));
});

// ---------- the modules release 2026-11-03.1's page can load from this release ----------
const walk = (dir) => readdirSync(join(APP, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.m?js$/.test(d.name) ? [`${dir}/${d.name}`] : []));
function importsOf(code) {
  const out = [];
  for (const m of code.matchAll(/(?:^|\n)\s*(import|export)\s+([^'";]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[2];
    const names = [];
    const braces = spec.match(/\{([^}]*)\}/);
    if (braces) for (const p of braces[1].split(',')) { const n = p.trim().split(/\s+as\s+/)[0].trim(); if (n) names.push(n); }
    if (m[1] === 'import' && spec.replace(/\{[^}]*\}/, '').replace(/\*\s*as\s+[\w$]+/, '').replace(/,/g, '').trim()) names.push('default');
    out.push({ from: m[3], names });
  }
  for (const m of code.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) out.push({ from: m[1], names: [] });
  return out;
}

test('no module release 2026-11-03.1\'s page can load from this release imports a name that release\'s modules lack', () => {
  const problems = [];
  let checked = 0;
  for (const f of [...walk('js'), 'config.js', ...walk('vendor')]) {
    if (OLD.boot.includes(f)) continue; // loaded at boot: an old page has that release's copy, a new page this one's
    for (const { from, names } of importsOf(readFileSync(join(APP, f), 'utf8'))) {
      if (!from.startsWith('.')) continue;
      const target = posix.normalize(posix.join(posix.dirname(f), from));
      const old = OLD.exports[target];
      if (!old) continue; // a module that release did not have: always this release's copy
      checked += 1;
      for (const n of names) if (!old.includes(n)) problems.push(`${f} imports ${n} from ${target}`);
    }
  }
  assert.ok(checked > 100, `only ${checked} imports checked`);
  assert.deepEqual(problems, [], 'take it from js/core/compat.js');
});

test('a module that calls a content method release 2026-11-03.1\'s content object lacks imports compat.js', () => {
  const problems = [];
  for (const f of walk('js')) {
    if (OLD.boot.includes(f) || f === 'js/core/compat.js') continue;
    const code = readFileSync(join(APP, f), 'utf8');
    const imported = importsOf(code).some(({ from, names }) => posix.normalize(posix.join(posix.dirname(f), from)) === 'js/core/content.js' && names.includes('content'));
    if (!imported) continue; // another variable of that name
    const calls = [...code.matchAll(/\bcontent\.(\w+)\s*\??\.?\(/g)].map((m) => m[1]).filter((m) => !OLD.contentMethods.includes(m));
    const viaCompat = importsOf(code).some(({ from }) => posix.normalize(posix.join(posix.dirname(f), from)) === 'js/core/compat.js');
    if (calls.length && !viaCompat) problems.push(`${f}: content.${[...new Set(calls)].join(', content.')}`);
  }
  assert.deepEqual(problems, []);
});
