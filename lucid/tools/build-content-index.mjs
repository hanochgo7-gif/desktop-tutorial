// Writes the generated content files that let a screen download only what it shows (perf plan C1, contract C-2):
//   content/real-life/index.json           {scenarios: [{id, module, level, title_en, title_he, goal, n_practice}]}
//   content/real-life/scenario/<id>.json   one scenario, as in real-life/scenarios.json
//   content/writing/index.json             {exercises: [row], assignments: [row]}; row = {id, stage, level, kind,
//                                          title_en, title_he, word_range, min_words, max_words, time_limit_min,
//                                          n_items, prompt}, each only when the source has it
//   content/writing/task/<id>.json         one writing exercise or assignment, as in its source file
//   content/centers/{read,listen,speak}.json  {lessons: {id: {id, level, title_en, title_he, topics}},
//                                          items: [{lesson, i, ex}]}: the exercises of the centre's types, in
//                                          curriculum order (i = the exercise's index in its lesson)
//   content/pool/<level>.json              {lessons: {id: {id, level, topics, pitfalls}}, items: [{lesson, ex}]}:
//                                          the auto-graded exercises (pool.AUTO_TYPES) of the level's lessons, in
//                                          lesson-file order; a lesson's topics and pitfalls are stored once
// The sources (scenarios.json, writing/*.json, lessons/*.json) stay the truth: run this after editing any of them,
// then node tools/build-manifest.mjs. The output is deterministic (two runs are byte-identical);
// node tools/validate-content.mjs and tests/unit/content-index.test.mjs fail when a generated file is stale.
// Usage (from lucid/): node tools/build-content-index.mjs [--check]
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenarioIndexOf, writingIndexOf, CENTERS } from '../js/core/content.js';
import { AUTO_TYPES } from '../js/core/pool.js';

export const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
// Directories that hold only generated files: a file here that the generator does not write is stale.
export const GENERATED_DIRS = ['real-life/scenario', 'writing/task', 'centers', 'pool'];
export const GENERATED_FILES = ['real-life/index.json', 'writing/index.json'];
// Ids become file names and URL path segments: letters, digits, dot, dash and underscore only, never '/'.
export const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const readJson = (root, rel) => (existsSync(join(root, rel)) ? JSON.parse(readFileSync(join(root, rel), 'utf8')) : null);
const text = (v) => `${JSON.stringify(v)}\n`;
function safeId(id, where) {
  if (typeof id !== 'string' || !SAFE_ID.test(id)) throw new Error(`${where}: id ${JSON.stringify(id)} cannot be a file name (letters, digits, . _ - only)`);
  return id;
}
// The lesson files in the order the manifest lists them (tools/build-manifest.mjs sorts the file names).
export function lessonIds(root = CONTENT) {
  return readdirSync(join(root, 'lessons')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
}

// Every generated file: Map of path (relative to content/) -> file text.
export function buildContentIndex(root = CONTENT) {
  const out = new Map();
  const scenarios = readJson(root, 'real-life/scenarios.json');
  if (scenarios) {
    out.set('real-life/index.json', text(scenarioIndexOf(scenarios)));
    for (const s of scenarios.scenarios || []) out.set(`real-life/scenario/${safeId(s.id, 'real-life/scenarios.json')}.json`, text(s));
  }
  const ex = readJson(root, 'writing/exercises.json');
  const as = readJson(root, 'writing/assignments.json');
  if (ex || as) {
    out.set('writing/index.json', text(writingIndexOf(ex, as)));
    for (const x of [...(ex?.exercises || []), ...(as?.assignments || [])]) {
      const path = `writing/task/${safeId(x.id, 'writing')}.json`;
      if (out.has(path)) throw new Error(`writing: two tasks have the id ${x.id}`);
      out.set(path, text(x));
    }
  }
  const curriculum = readJson(root, 'curriculum.json');
  const order = new Map((curriculum?.levels || []).flatMap((l) => l.lessons).map((l, i) => [l.id, i]));
  const lessons = lessonIds(root).map((id) => readJson(root, `lessons/${id}.json`));
  for (const [name, types] of Object.entries(CENTERS)) {
    const items = [];
    for (const l of lessons) (l.exercises || []).forEach((e, i) => { if (types.includes(e.type)) items.push({ l, i, e, rank: (order.get(l.id) ?? 9999) * 100 + i }); });
    items.sort((a, b) => a.rank - b.rank);
    const meta = {};
    for (const { l } of items) meta[l.id] ||= { id: l.id, level: l.level, title_en: l.title_en, title_he: l.title_he, topics: l.topics };
    out.set(`centers/${name}.json`, text({ lessons: meta, items: items.map(({ l, i, e }) => ({ lesson: l.id, i, ex: e })) }));
  }
  for (const level of LEVELS) {
    const meta = {};
    const items = [];
    for (const l of lessons.filter((x) => x.level === level)) {
      const own = (l.exercises || []).filter((e) => AUTO_TYPES.has(e.type));
      if (!own.length) continue;
      meta[safeId(l.id, 'lessons')] = { id: l.id, level: l.level, topics: l.topics, pitfalls: l.hebrew_pitfalls || [] };
      for (const e of own) items.push({ lesson: l.id, ex: e });
    }
    if (items.length) out.set(`pool/${level}.json`, text({ lessons: meta, items }));
  }
  return out;
}

const listDir = (root, dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.json')).map((f) => `${dir}/${f}`) : []);
// What is stale on disk: [{ path, problem: 'missing' | 'differs' | 'extra' }]. Empty when everything is current.
export function drift(root = CONTENT) {
  const want = buildContentIndex(root);
  const out = [];
  for (const [path, body] of want) {
    if (!existsSync(join(root, path))) out.push({ path, problem: 'missing' });
    else if (readFileSync(join(root, path), 'utf8') !== body) out.push({ path, problem: 'differs' });
  }
  for (const path of [...GENERATED_DIRS.flatMap((d) => listDir(root, d)), ...GENERATED_FILES.filter((f) => existsSync(join(root, f)))]) {
    if (!want.has(path)) out.push({ path, problem: 'extra' });
  }
  return out;
}

export function writeContentIndex(root = CONTENT) {
  const want = buildContentIndex(root);
  for (const dir of GENERATED_DIRS) for (const path of listDir(root, dir)) if (!want.has(path)) rmSync(join(root, path));
  for (const [path, body] of want) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    if (!existsSync(join(root, path)) || readFileSync(join(root, path), 'utf8') !== body) writeFileSync(join(root, path), body);
  }
  return want;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.includes('--check')) {
    const stale = drift();
    for (const d of stale) console.log(`${d.problem.padEnd(7)} content/${d.path}`);
    console.log(stale.length ? `${stale.length} generated files are stale: run node tools/build-content-index.mjs` : 'generated content files are current');
    process.exitCode = stale.length ? 1 : 0;
  } else {
    const files = writeContentIndex();
    console.log(`content index: ${files.size} generated files`);
  }
}
