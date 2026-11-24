// Drills and level checks from the per-level pool files (perf plan C10): the same items, in the same order, as the
// pool built from every lesson file, so seeded drill and level-check sets are unchanged; and the fallback to the
// lesson files when a pool file cannot be loaded (offline, never opened online).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const read = (rel) => JSON.parse(readFileSync(join(CONTENT, rel), 'utf8'));
const manifest = read('manifest.json');
const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// content.js fetches files from disk; paths containing a blocked part fail like a network error.
let blocked = [];
let requests = [];
globalThis.fetch = async (url) => {
  const path = fileURLToPath(String(url));
  const rel = path.slice(CONTENT.length + 1);
  requests.push(rel);
  if (blocked.some((b) => rel.includes(b))) throw new TypeError('Failed to fetch');
  if (!existsSync(path)) return new Response('', { status: 404 });
  return new Response(readFileSync(path), { status: 200 });
};
const { exercisePool, drillSet, checkpointSet, poolFromLessons, AUTO_TYPES } = await import('../../js/core/pool.js');

// The pool exactly as js/core/pool.js built it before the pool files (every lesson the manifest lists).
const lessons = manifest.lessons.map((id) => read(`lessons/${id}.json`));
const before = lessons.flatMap((l) => l.exercises.filter((e) => AUTO_TYPES.has(e.type)).map((ex) => ({
  ex, lesson: l.id, level: l.level, topic: ex.topic || l.topics[0], topics: l.topics, pitfalls: l.hebrew_pitfalls || [],
  errors: new Set([ex.error_type, ...Object.values(ex.option_errors || {}), ...(ex.wrong_feedback || []).map((f) => f.error_type)].filter(Boolean)),
})));
const plain = (items) => items.map((p) => ({ ...p, errors: [...p.errors].sort() }));

// A seeded Math.random, restarted for each call that is compared.
const realRandom = Math.random;
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
async function withSeed(seed, fn) {
  Math.random = seeded(seed);
  try { return await fn(); } finally { Math.random = realRandom; }
}
const ids = (set) => set.map((p) => `${p.lesson}:${p.ex.id}`);

// The tests run in this order: the fallback (old) results first, while nothing is memoised, then the pool files.
const cases = [
  () => checkpointSet('A1'), () => checkpointSet('B2', 12), () => checkpointSet('PreA1'),
  () => drillSet({ topic: 'present-simple', level: 'A1' }), () => drillSet({ error: 'article', level: 'B1' }),
  () => drillSet({ topic: 'conditionals-2', level: 'B2', size: 10 }), () => drillSet({ error: 'third-person-s', level: 'PreA1' }),
  () => drillSet({ topic: 'present-simple', level: null }), () => drillSet({ error: 'article' }), // no course level: every level
];
const old = [];

test('C10: poolFromLessons is the old pool, item for item', () => {
  assert.deepEqual(plain(poolFromLessons(lessons)), plain(before));
});

test('C10: offline with no pool file, the pool comes from the lessons on this device, as before', async () => {
  blocked = ['pool/', 'lessons/a2-'];
  try {
    assert.equal((await exercisePool(['A2'])).length, 0, 'no A2 lesson on this device: no A2 items');
    assert.deepEqual(plain(await exercisePool(['A1'])), plain(before.filter((p) => p.level === 'A1')));
    // The old way, for the seeded comparison below: with the pool files unreachable the pool is the lesson files'.
    blocked = ['pool/'];
    for (const [i, c] of cases.entries()) old.push(ids(await withSeed(100 + i, c)));
    assert.ok(old.every((x) => x.length > 0), 'every case picks items');
  } finally { blocked = []; }
});

test('C10: a level check loads one pool file and no lesson; a drill loads pool files only', async () => {
  requests = [];
  await checkpointSet('B1');
  assert.deepEqual(requests.filter((r) => r.startsWith('pool/') || r.startsWith('lessons/')).sort(), ['pool/B1.json']);
  requests = [];
  await drillSet({ topic: 'present-simple', level: 'A1' });
  assert.deepEqual(requests.filter((r) => r.startsWith('pool/') || r.startsWith('lessons/')).sort(), ['pool/A1.json', 'pool/A2.json', 'pool/PreA1.json'], 'up to one level above, each file tried again after the offline failure');
});

// drillSet and checkpointSet as they were before C10 (base commit), over the whole old pool.
const { shuffle } = await import('../../js/core/util.js');
const { levelIndex } = await import('../../js/core/adaptive.js');
const { ERROR_TOPICS, COMPETITORS } = await import('../../js/core/pool.js');
function oldDrillSet({ topic = null, error = null, level = null, size = 8, attempts = [] }) {
  const pool = before;
  const fresh = new Set(attempts.filter((a) => a.correct && Date.now() - new Date(a.at).getTime() < 86_400_000).map((a) => `${a.lesson}:${a.exercise}`));
  const key = (p) => `${p.lesson}:${p.ex.id}`;
  const maxLevel = level ? levelIndex(level) + 1 : LEVELS.length - 1;
  const eligible = pool.filter((p) => levelIndex(p.level) <= maxLevel);
  let target = [];
  if (topic) target = eligible.filter((p) => p.topic === topic || p.topics.includes(topic));
  if (error) {
    target = eligible.filter((p) => p.errors.has(error));
    if (target.length < size) target = target.concat(eligible.filter((p) => (ERROR_TOPICS[error] || []).includes(p.topic) && !target.includes(p)));
  }
  const competitorTopics = topic ? COMPETITORS[topic] || [] : [];
  const competing = eligible.filter((p) => competitorTopics.includes(p.topic));
  const prefer = (list) => [...list.filter((p) => !fresh.has(key(p))), ...list.filter((p) => fresh.has(key(p)))];
  const nTarget = competing.length ? Math.ceil(size * 0.7) : size;
  const chosen = [...prefer(shuffle(target, Math.random())).slice(0, nTarget), ...prefer(shuffle(competing, Math.random())).slice(0, size - nTarget)];
  return shuffle(chosen, Math.random());
}
function oldCheckpointSet(level, size = 16) {
  const pool = before.filter((p) => p.level === level);
  const byLesson = new Map();
  for (const p of shuffle(pool, Math.random())) { if (!byLesson.has(p.lesson)) byLesson.set(p.lesson, []); byLesson.get(p.lesson).push(p); }
  const out = [];
  let round = 0;
  while (out.length < size && round < 4) {
    for (const list of byLesson.values()) if (list[round] && out.length < size) out.push(list[round]);
    round++;
  }
  return shuffle(out, Math.random());
}
const oldCases = [
  () => oldCheckpointSet('A1'), () => oldCheckpointSet('B2', 12), () => oldCheckpointSet('PreA1'),
  () => oldDrillSet({ topic: 'present-simple', level: 'A1' }), () => oldDrillSet({ error: 'article', level: 'B1' }),
  () => oldDrillSet({ topic: 'conditionals-2', level: 'B2', size: 10 }), () => oldDrillSet({ error: 'third-person-s', level: 'PreA1' }),
  () => oldDrillSet({ topic: 'present-simple', level: null }), () => oldDrillSet({ error: 'article' }),
];

test('C10: seeded level checks and drills are the same sets as before (the base code over all lessons, and the fallback)', async () => {
  for (const [i, c] of cases.entries()) {
    const now = ids(await withSeed(100 + i, c));
    assert.deepEqual(now, ids(await withSeed(100 + i, oldCases[i])), `case ${i}: base code`);
    assert.deepEqual(now, old[i], `case ${i}: fallback`);
  }
  // More seeds for one drill and one check.
  for (let seed = 1; seed <= 20; seed++) {
    assert.deepEqual(ids(await withSeed(seed, () => drillSet({ topic: 'past-simple-regular', level: 'A2' }))), ids(await withSeed(seed, () => oldDrillSet({ topic: 'past-simple-regular', level: 'A2' }))), `drill seed ${seed}`);
    assert.deepEqual(ids(await withSeed(seed, () => checkpointSet('C1'))), ids(await withSeed(seed, () => oldCheckpointSet('C1'))), `check seed ${seed}`);
  }
});

test('C10: each level\'s pool from its file equals the lesson-file items of that level (deep-equal, errors sorted)', async () => {
  requests = [];
  for (const level of LEVELS) assert.deepEqual(plain(await exercisePool([level])), plain(before.filter((p) => p.level === level)), level);
  assert.deepEqual(plain(await exercisePool()), plain(before), 'all levels: the same items in the same order');
  assert.ok(!requests.some((r) => r.startsWith('lessons/')), `a lesson file was loaded: ${requests.filter((r) => r.startsWith('lessons/'))}`);
  assert.deepEqual(plain(await exercisePool(['A2', 'PreA1', 'A1'])), plain(before.filter((p) => ['PreA1', 'A1', 'A2'].includes(p.level))), 'any level order gives the manifest order');
});
