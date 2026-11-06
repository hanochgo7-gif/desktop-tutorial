// The generated content files (perf plan C1, contract C-2): tools/build-content-index.mjs cuts the index, per-item,
// centre and pool files from the source files. They must be current, deterministic and equal to their sources, and
// content.js must fall back to the source files when a generated file cannot be loaded (contract C-1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildContentIndex, drift, writeContentIndex, CONTENT, SAFE_ID, GENERATED_DIRS } from '../../tools/build-content-index.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => JSON.parse(readFileSync(join(CONTENT, rel), 'utf8'));
const gzKB = (rel) => gzipSync(readFileSync(join(CONTENT, rel))).length / 1024;
const scenarios = read('real-life/scenarios.json').scenarios;
const exercises = read('writing/exercises.json').exercises;
const assignments = read('writing/assignments.json').assignments;

// A copy of the content folder to edit.
function copy() {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-content-'));
  cpSync(CONTENT, dir, { recursive: true });
  return dir;
}

test('C1: the generated files are current (run node tools/build-content-index.mjs after editing a source)', () => {
  assert.deepEqual(drift(), []);
});

test('C1: two generator runs are byte-identical', () => {
  const a = buildContentIndex();
  const b = buildContentIndex();
  assert.deepEqual([...a.keys()], [...b.keys()]);
  for (const [k, v] of a) assert.equal(b.get(k), v, k);
  const dir = copy();
  try {
    writeContentIndex(dir);
    const first = new Map([...a.keys()].map((k) => [k, readFileSync(join(dir, k), 'utf8')]));
    writeContentIndex(dir);
    for (const [k, v] of first) assert.equal(readFileSync(join(dir, k), 'utf8'), v, k);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('C1: the drift check fails on a hand-edited source, a hand-edited generated file, a stale file and a missing file', () => {
  const dir = copy();
  try {
    const p = join(dir, 'real-life/scenarios.json');
    const data = JSON.parse(readFileSync(p, 'utf8'));
    data.scenarios[0].title_en += ' (edited)';
    writeFileSync(p, JSON.stringify(data, null, 1));
    const ex = join(dir, 'writing/exercises.json');
    const w = JSON.parse(readFileSync(ex, 'utf8'));
    w.exercises[0].items.pop();
    writeFileSync(ex, JSON.stringify(w, null, 1));
    const l = join(dir, 'lessons/a1-01.json');
    const lesson = JSON.parse(readFileSync(l, 'utf8'));
    lesson.exercises.find((e) => e.type === 'read').instructions = { en: 'Edited.' };
    writeFileSync(l, JSON.stringify(lesson, null, 1));
    writeFileSync(join(dir, 'pool/A2.json'), '{}\n');
    writeFileSync(join(dir, 'real-life/scenario/rl-gone.json'), '{}\n');
    rmSync(join(dir, 'centers/speak.json'));
    const found = new Map(drift(dir).map((d) => [d.path, d.problem]));
    assert.equal(found.get('real-life/index.json'), 'differs');
    assert.equal(found.get(`real-life/scenario/${scenarios[0].id}.json`), 'differs');
    assert.equal(found.get('writing/index.json'), 'differs', 'n_items follows the items');
    assert.equal(found.get(`writing/task/${exercises[0].id}.json`), 'differs');
    assert.equal(found.get('centers/read.json'), 'differs');
    assert.equal(found.get('pool/A2.json'), 'differs');
    assert.equal(found.get('real-life/scenario/rl-gone.json'), 'extra');
    assert.equal(found.get('centers/speak.json'), 'missing');
    // Regenerating repairs every one of them and removes the stale file.
    writeContentIndex(dir);
    assert.deepEqual(drift(dir), []);
    assert.equal(existsSync(join(dir, 'real-life/scenario/rl-gone.json')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('C1: ids used as file names are URL-safe; an id with "/" stops the generator', () => {
  for (const x of [...scenarios, ...exercises, ...assignments]) assert.match(x.id, SAFE_ID);
  assert.equal(SAFE_ID.test('a/b'), false);
  assert.equal(SAFE_ID.test('../x'), false);
  const dir = copy();
  try {
    const p = join(dir, 'real-life/scenarios.json');
    const data = JSON.parse(readFileSync(p, 'utf8'));
    data.scenarios[0].id = 'rl/escape';
    writeFileSync(p, JSON.stringify(data));
    assert.throws(() => buildContentIndex(dir), /cannot be a file name/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const ids = [...exercises, ...assignments].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'a writing exercise and an assignment share an id');
});

test('C1: every real-life index row equals its scenario\'s fields; each scenario file is its scenario', () => {
  const index = read('real-life/index.json');
  assert.deepEqual(index.scenarios.map((r) => r.id), scenarios.map((s) => s.id), 'same scenarios, same order');
  index.scenarios.forEach((row, i) => {
    const s = scenarios[i];
    assert.deepEqual(row, { id: s.id, module: s.module, level: s.level, title_en: s.title_en, title_he: s.title_he, goal: s.goal, n_practice: s.practice.length });
    assert.deepEqual(read(`real-life/scenario/${s.id}.json`), s);
  });
  assert.equal(readdirSync(join(CONTENT, 'real-life/scenario')).length, scenarios.length);
});

test('C1: every writing index row equals its task\'s fields (contract C-11 names); each task file is its task', () => {
  const index = read('writing/index.json');
  const FIELDS = ['id', 'stage', 'level', 'kind', 'title_en', 'title_he', 'word_range', 'min_words', 'max_words', 'time_limit_min', 'prompt'];
  const rowOf = (x) => {
    const r = Object.fromEntries(FIELDS.filter((k) => x[k] !== undefined).map((k) => [k, x[k]]));
    if (Array.isArray(x.items)) r.n_items = x.items.length;
    return r;
  };
  assert.deepEqual(index.exercises, exercises.map(rowOf));
  assert.deepEqual(index.assignments, assignments.map(rowOf));
  for (const x of [...exercises, ...assignments]) assert.deepEqual(read(`writing/task/${x.id}.json`), x);
  assert.ok(index.exercises.some((r) => r.n_items && !r.min_words), 'a sentence-exercise task keeps its item count');
});

test('C1: the centre and pool files hold exactly the lessons\' exercises', async () => {
  const { AUTO_TYPES } = await import('../../js/core/pool.js');
  const ids = readdirSync(join(CONTENT, 'lessons')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  const lessons = ids.map((id) => read(`lessons/${id}.json`));
  for (const [name, types] of Object.entries({ read: ['read'], listen: ['listen', 'dictation'], speak: ['speak'] })) {
    const file = read(`centers/${name}.json`);
    const want = lessons.flatMap((l) => l.exercises.map((ex, i) => ({ l, ex, i })).filter((x) => types.includes(x.ex.type)));
    assert.equal(file.items.length, want.length, name);
    for (const it of file.items) {
      const l = lessons.find((x) => x.id === it.lesson);
      assert.deepEqual(it.ex, l.exercises[it.i], `${name} ${it.lesson} ${it.i}`);
      assert.deepEqual(file.lessons[it.lesson], { id: l.id, level: l.level, title_en: l.title_en, title_he: l.title_he, topics: l.topics });
    }
  }
  for (const level of ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    const file = read(`pool/${level}.json`);
    const want = lessons.filter((l) => l.level === level).flatMap((l) => l.exercises.filter((e) => AUTO_TYPES.has(e.type)).map((ex) => ({ lesson: l.id, ex })));
    assert.deepEqual(file.items, want, level);
    for (const [id, row] of Object.entries(file.lessons)) {
      const l = lessons.find((x) => x.id === id);
      assert.deepEqual(row, { id, level: l.level, topics: l.topics, pitfalls: l.hebrew_pitfalls || [] });
    }
  }
});

test('C1: generated file sizes stay within the plan (gzip)', () => {
  assert.ok(gzKB('real-life/index.json') <= 8, `real-life index ${gzKB('real-life/index.json').toFixed(1)} KB`);
  assert.ok(gzKB('writing/index.json') <= 3, `writing index ${gzKB('writing/index.json').toFixed(1)} KB`);
  const largest = (dir) => Math.max(...readdirSync(join(CONTENT, dir)).map((f) => gzKB(`${dir}/${f}`)));
  assert.ok(largest('real-life/scenario') <= 6, `largest scenario ${largest('real-life/scenario').toFixed(1)} KB`);
  assert.ok(largest('pool') <= 60, `largest pool file ${largest('pool').toFixed(1)} KB`);
  for (const d of GENERATED_DIRS) assert.ok(readdirSync(join(CONTENT, d)).length > 0, d);
});

test('C3: no view loads the full scenario or writing files (only content.js, and a feature-detected router fallback)', () => {
  const walk = (dir) => readdirSync(join(APP, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : d.name.endsWith('.js') ? [`${dir}/${d.name}`] : []));
  const hits = [];
  for (const f of walk('js')) {
    if (f === 'js/core/content.js') continue;
    readFileSync(join(APP, f), 'utf8').split('\n').forEach((line, i) => {
      if (!/content\.(scenarios|writingExercises|assignments)\(\)/.test(line)) return;
      // The router may call a new method and fall back to the old one when it is absent (contract C-1).
      if (f === 'js/core/router.js' && /content\.\w+\?\.\(/.test(line)) return;
      hits.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});

// ---------- content.js: the new methods, their memo and their fallbacks (contract C-1) ----------
// fetch for content.js in Node: files from disk, with paths that fail like a network error (blocked) or a 404.
function fakeFetch({ blocked = [], log = [] } = {}) {
  return async (url) => {
    const path = fileURLToPath(String(url));
    log.push(path.slice(CONTENT.length + 1));
    if (blocked.some((b) => path.includes(b))) throw new TypeError('Failed to fetch');
    if (!existsSync(path)) return new Response('', { status: 404 });
    return new Response(readFileSync(path), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}
const fresh = async (tag) => (await import(`../../js/core/content.js?${tag}`)).content;

test('C-1: the new methods load the small files, and scenario(id) / writingTask(id) are null for an unknown id', async () => {
  const log = [];
  globalThis.fetch = fakeFetch({ log });
  const content = await fresh('online');
  assert.deepEqual(await content.scenarioIndex(), read('real-life/index.json'));
  assert.deepEqual(await content.scenario(scenarios[3].id), scenarios[3]);
  assert.deepEqual(await content.writingIndex(), read('writing/index.json'));
  assert.deepEqual(await content.writingTask(assignments[2].id), assignments[2]);
  assert.deepEqual(await content.writingTask(exercises[0].id), exercises[0]);
  assert.equal(await content.scenario('rl-no-such-scenario'), null);
  assert.equal(await content.writingTask('we-99'), null);
  assert.deepEqual(await content.center('read'), read('centers/read.json'));
  assert.deepEqual(await content.pool('A1'), read('pool/A1.json'));
  // Memoised: the same promise, one request each.
  assert.equal(content.scenario(scenarios[3].id), content.scenario(scenarios[3].id));
  await content.scenarioIndex();
  assert.equal(log.filter((p) => p === 'real-life/index.json').length, 1);
  assert.ok(!log.some((p) => /scenarios\.json|exercises\.json|assignments\.json|lessons\//.test(p)), `a full file was loaded: ${log}`);
});

test('C-1: when the small files cannot be loaded (offline, never cached), the full files give the same answers', async () => {
  globalThis.fetch = fakeFetch({ blocked: ['real-life/index.json', 'real-life/scenario/', 'writing/index.json', 'writing/task/', 'centers/', 'pool/'] });
  const content = await fresh('offline');
  assert.deepEqual(await content.scenarioIndex(), read('real-life/index.json'));
  assert.deepEqual(await content.scenario(scenarios[5].id), scenarios[5]);
  assert.deepEqual(await content.writingIndex(), read('writing/index.json'));
  assert.deepEqual(await content.writingTask(assignments[0].id), assignments[0]);
  assert.equal(await content.scenario('rl-no-such-scenario'), null);
  await assert.rejects(content.center('read'));
  await assert.rejects(content.pool('A1'));
});

test('C-1: with nothing loadable the lists are null, as the full files were, and a later call tries again', async () => {
  let offline = true;
  const online = fakeFetch();
  globalThis.fetch = (url) => (offline ? Promise.reject(new TypeError('Failed to fetch')) : online(url));
  const content = await fresh('none');
  assert.equal(await content.scenarioIndex(), null);
  assert.equal(await content.scenario(scenarios[0].id), null);
  assert.equal(await content.writingIndex(), null);
  offline = false;
  assert.deepEqual(await content.scenarioIndex(), read('real-life/index.json'));
  assert.deepEqual(await content.scenario(scenarios[0].id), scenarios[0]);
});

// ---------- C2: Today's plan from the index rows equals the plan from the full files ----------
test('C2: the Today plan, with each block\'s minutes, is identical from the index rows for 5 seeded learners', async () => {
  globalThis.fetch = fakeFetch();
  globalThis.addEventListener ??= () => {};
  globalThis.document ??= { documentElement: { dataset: {} }, visibilityState: 'visible' };
  const S = await import('../../js/core/store.js');
  const L = await import('../../js/core/learner.js');
  const { selfReportResult } = await import('../../js/core/placement.js');
  const { withItemCount } = await import('../../js/core/content.js');
  const scenarioRows = read('real-life/index.json').scenarios;
  const writingRows = read('writing/index.json').exercises.map(withItemCount);
  const day = new Date().toISOString();
  const learners = [
    { level: 'A1', goals: ['travel'], minutes: 20 },
    { level: 'A1', goals: ['writing'], minutes: 35 },
    { level: 'B1', goals: ['studies', 'conversation'], minutes: 60, done: ['we-02', 'we-04'] },
    { level: 'B2', goals: ['work', 'writing'], minutes: 10, events: [{ type: 'writing', exercise: 'we-06' }] },
    { level: 'A2', goals: ['conversation', 'writing'], minutes: 35, events: [{ type: 'speaking', scenario: scenarios[1].id }], started: ['we-03'] },
  ];
  let sentenceTask = false;
  for (const x of learners) {
    await S.openStore();
    await L.initModel();
    L.saveProfile({ onboarded: true, goals: x.goals, start_choice: 'some' });
    L.saveSettings({ daily_minutes: x.minutes });
    await L.applyPlacement(selfReportResult(x.level));
    for (const id of x.done || []) S.store.put('writing', { id: `ess:${id}`, kind: 'essay-summary', exercise: id, status: 'done', updated: day });
    for (const id of x.started || []) S.store.put('writing', { id: `ess:${id}#draft`, kind: 'essay-draft', exercise: id, text: 'A start.', updated_at: day });
    for (const e of x.events || []) L.logEvent(e);
    const next = L.model().next;
    const lesson = next ? read(`lessons/${next.id}.json`) : null;
    const full = L.todayPlan(x.minutes, { lesson, scenarios, writingTasks: exercises });
    const rows = L.todayPlan(x.minutes, { lesson, scenarios: scenarioRows, writingTasks: writingRows });
    assert.deepEqual(JSON.parse(JSON.stringify(rows)), JSON.parse(JSON.stringify(full)), `${x.level} ${x.goals}`);
    const status = (s, w) => JSON.parse(JSON.stringify(L.dayStatus({ lesson, scenarios: s, writingTasks: w })));
    assert.deepEqual(status(scenarioRows, writingRows), status(scenarios, exercises), `${x.level} ${x.goals}: day status`);
    const use = [...full.blocks, ...full.extras].find((b) => b.id === 'use' && b.task);
    if (use && exercises.find((t) => t.id === use.task)?.items) sentenceTask = true;
  }
  assert.ok(sentenceTask, 'one learner\'s writing pick is a set of sentence exercises (its minutes come from the item count)');
});
