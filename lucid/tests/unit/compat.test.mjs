// The one-time upgrade from the releases before the perf programme (js/core/compat.js, tests/e2e/upgrade.mjs):
// 2026-11-07.1 (d83a500, in production now, no age limit) and 2026-11-03.1 (b2b669b, a tab open since before the
// 2026-11-07.1 deploy). A tab started on either keeps its boot modules and opens this release's screens, so:
// - on this release, compat.js gives the core modules' own functions and leaves content.js untouched;
// - on an old page, it gives the same results built on the old modules (content.js's C-1 methods and the C-3 helpers);
// - no module the old page can load from this release imports a name the old modules lack, and a module that calls
//   a content method the old `content` object lacks imports compat.js (tests/unit/fixtures/release-<RELEASE>.json,
//   written by tools/release-fixture.mjs, lists each release's modules, their exports, its boot graph and its
//   content methods);
// - under 16, the content methods compat.js adds or wraps leave flagged items out, as content.js does.
// For 2026-11-03.1, the names 2026-11-07.1 added (learner.js aiConsent, session.js recheckProfile and
// syncPauseReason) are not checked: main's own deploy of 2026-11-07.1 already loads screens that import them into
// such a tab, a reload fixes it, and the old session code cannot be given the new guardian rules from a screen
// (architecture.md section 7). Every other name is still checked against it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT = join(APP, 'content');
const fixture = (release) => JSON.parse(readFileSync(join(APP, `tests/unit/fixtures/release-${release}.json`), 'utf8'));
// The release in production (d83a500) first, then the one before it.
const PROD = fixture('2026-11-07.1');
const PREV = fixture('2026-11-03.1');
// The names PROD's modules added: not checked against PREV (see the top of this file).
const ADDED = Object.fromEntries(Object.entries(PROD.exports).map(([f, names]) => [f, names.filter((n) => PREV.exports[f] && !PREV.exports[f].includes(n))]).filter(([, n]) => n.length));
const OLDS = [{ OLD: PROD, exempt: {} }, { OLD: PREV, exempt: ADDED }];
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

// Release 2026-11-07.1's content object: as 2026-11-03.1's, but scenarios() and slang() leave flagged items out for a
// learner under 16, on each call (its content.js forAge).
function prodContent(fetchFn, learner) {
  const old = oldContent(fetchFn);
  const forAge = (key) => (d) => {
    if (!d || !Array.isArray(d[key])) return d;
    const { shown, hidden } = forLearnerRef(d[key], learner());
    return hidden ? { ...d, [key]: shown, hidden_for_age: hidden } : d;
  };
  return { ...old, scenarios: () => old.scenarios().then(forAge('scenarios')), slang: () => fetchFn(pathToFileURL(join(CONTENT, 'real-life/slang.json'))).then((r) => r.json()).then(forAge('entries')) };
}
let forLearnerRef;

// A copy of the content folder's real-life files in which one scenario and one expression are flagged, served over
// fetch like diskFetch (no real item is flagged today, so the check adds them, as a content author would).
function flaggedFetch({ blocked = [] } = {}) {
  const scenarios = readJson('real-life/scenarios.json');
  const id = scenarios.scenarios[0].id;
  scenarios.scenarios[0] = { ...scenarios.scenarios[0], sensitive: ['alcohol'] };
  const slang = readJson('real-life/slang.json');
  slang.entries.push({ ...slang.entries[0], id: 'zz-flagged', sensitive: ['vulgar'] });
  const index = readJson('real-life/index.json');
  index.scenarios[0] = { ...index.scenarios[0], sensitive: ['alcohol'] };
  const files = { 'real-life/scenarios.json': scenarios, 'real-life/slang.json': slang, 'real-life/index.json': index, [`real-life/scenario/${id}.json`]: scenarios.scenarios[0] };
  const disk = diskFetch({ blocked });
  const fetchFn = async (url) => {
    const rel = fileURLToPath(String(url)).slice(CONTENT.length + 1);
    if (blocked.some((b) => `/${rel}`.includes(b))) throw new TypeError('Failed to fetch');
    if (files[rel]) return new Response(JSON.stringify(files[rel]), { status: 200 });
    return disk(url);
  };
  return { fetchFn, id, n: scenarios.scenarios.length, nSlang: slang.entries.length };
}

test('under 16, the content methods compat.js gives an old page leave flagged items out, as content.js does (2026-11-07.1 and 2026-11-03.1)', async () => {
  const { upgrade } = await import('../../js/core/compat.js');
  ({ forLearner: forLearnerRef } = await import('../../js/core/age.js'));
  const year = new Date().getUTCFullYear();
  for (const [name, make] of [['2026-11-07.1', prodContent], ['2026-11-03.1', (f) => oldContent(f)]]) {
    for (const blocked of [[], ['/index.json', '/scenario/']]) {
      const where = `${name}${blocked.length ? ', generated files unreachable' : ''}`;
      let p = { onboarded: true, birth_year: year - 10 };
      const learner = () => p;
      const { fetchFn, id, n, nSlang } = flaggedFetch({ blocked });
      const content = make(fetchFn, learner);
      if (!content.slang) content.slang = () => fetchFn(pathToFileURL(join(CONTENT, 'real-life/slang.json'))).then((r) => r.json());
      upgrade({ content }, {}, { base: BASE, fetchFn, learner });
      const index = await content.scenarioIndex();
      assert.ok(!index.scenarios.some((x) => x.id === id), `${where}: a 10-year-old sees the flagged scenario in the list`);
      assert.equal(index.scenarios.length, n - 1, `${where}: every unflagged scenario stays`);
      assert.equal(index.hidden_for_age, 1, `${where}: the list says one is not shown`);
      assert.equal(await content.scenario(id), null, `${where}: a 10-year-old opens the flagged scenario by its link`);
      assert.ok(await content.scenario(index.scenarios[0].id), `${where}: an unflagged scenario opens`);
      const all = await content.scenarios();
      assert.ok(!all.scenarios.some((x) => x.id === id) && all.hidden_for_age === 1, `${where}: scenarios() shows the flagged scenario`);
      const slang = await content.slang();
      assert.ok(!slang.entries.some((x) => x.id === 'zz-flagged') && slang.hidden_for_age === 1 && slang.entries.length === nSlang - 1, `${where}: slang() shows the flagged expression`);
      // Born 16 years ago: may still be 15 (the youngest age decides).
      p = { onboarded: true, birth_year: year - 16 };
      assert.equal(await content.scenario(id), null, `${where}: turning 16 this year may still be 15`);
      // Surely 16, decided on the call (the memo keeps the file, not the filtered list).
      p = { onboarded: true, birth_year: year - 17 };
      const later = await content.scenarioIndex();
      assert.ok(later.scenarios.some((x) => x.id === id) && later.hidden_for_age === undefined, `${where}: a 16-year-old does not see the flagged scenario`);
      assert.equal((await content.scenario(id))?.id, id, `${where}: a 16-year-old cannot open the flagged scenario`);
      assert.equal((await content.slang()).entries.length, nSlang, `${where}: a 16-year-old does not see the flagged expression`);
      p = null;
      assert.equal((await content.scenarioIndex()).scenarios.length, n, `${where}: no profile, nothing is hidden`);
    }
  }
  // Wrapped once: a second upgrade() on the same object does not wrap again.
  const { fetchFn } = flaggedFetch();
  const once = oldContent(fetchFn);
  upgrade({ content: once }, {}, { base: BASE, fetchFn });
  const wrapped = once.scenarios;
  upgrade({ content: once }, {}, { base: BASE, fetchFn });
  assert.equal(once.scenarios, wrapped);
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

// ---------- the modules an old page can load from this release ----------
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

test('the fixtures: 2026-11-07.1 is 2026-11-03.1 plus age.js and the no-age-limit names', () => {
  assert.equal(PROD.commit, 'd83a500');
  assert.equal(PREV.commit, 'b2b669b');
  assert.deepEqual(PROD.contentMethods, PREV.contentMethods, 'the content object has the same methods');
  assert.deepEqual(PROD.boot.filter((f) => !PREV.boot.includes(f)), ['js/core/age.js']);
  assert.deepEqual(PREV.boot.filter((f) => !PROD.boot.includes(f)), []);
  assert.deepEqual(ADDED, { 'js/core/learner.js': ['aiConsent'], 'js/core/session.js': ['recheckProfile', 'syncPauseReason'] });
  for (const [f, names] of Object.entries(PREV.exports)) for (const n of names) assert.ok(PROD.exports[f]?.includes(n), `${f} lost ${n}`);
});

for (const { OLD, exempt } of OLDS) test(`no module release ${OLD.release}'s page can load from this release imports a name that release's modules lack`, () => {
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
      for (const n of names) if (!old.includes(n) && !exempt[target]?.includes(n)) problems.push(`${f} imports ${n} from ${target}`);
    }
  }
  assert.ok(checked > 100, `only ${checked} imports checked`);
  assert.deepEqual(problems, [], 'take it from js/core/compat.js');
});

for (const { OLD } of OLDS) test(`a module that calls a content method release ${OLD.release}'s content object lacks imports compat.js`, () => {
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
