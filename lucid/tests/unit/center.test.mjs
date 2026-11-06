// The practice hubs' logic (js/ui/center.js, the review hint): lane r4-practice-games (PG-15, PG-8, PG-12, PG-14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wasUnheard, bestScore, nextSuggestion, metLesson, gatherExercises, findItem, attemptsOn } from '../../js/ui/center.js';
import { levelIndex } from '../../js/core/adaptive.js';
import { hintFor } from '../../js/views/review.js';
import { withoutIpa, SOUND_SETS } from '../../js/views/speaking.js';

const listen = { type: 'listen' };
const dictation = { type: 'dictation' };
const read = { type: 'read' };

test('PG-15: a listening result marked unheard by exercise.js is never scored (contract b)', () => {
  assert.equal(wasUnheard({ correct: true, unheard: true }, listen), true);
  assert.equal(wasUnheard({ correct: false, unheard: true }, read), true, 'the flag wins whatever the type');
});

test('PG-15: without the flag, a listening item is unheard when the browser cannot speak or every play stayed silent', () => {
  assert.equal(wasUnheard({ correct: true }, listen, { speech: false }), true);
  assert.equal(wasUnheard({ correct: true }, listen, { speech: true, silent: true, started: false }), true);
  assert.equal(wasUnheard({ correct: true }, dictation, { speech: true, silent: true, started: false }), true, 'a dictation is a listening item too');
  assert.equal(wasUnheard({ correct: true }, listen, { speech: true, silent: true, started: true }), false, 'one play that started is enough');
  assert.equal(wasUnheard({ correct: true }, listen, { speech: true, silent: false, started: false }), false, 'never played is not "nothing heard"');
  assert.equal(wasUnheard({ correct: true }, read, { speech: false }), false, 'reading is not a listening item');
  assert.equal(wasUnheard({ correct: false, dontKnow: true }, listen, { speech: false }), false, '"I don\'t know" stays a wrong first try');
  assert.equal(wasUnheard({ graded: false }, listen, { speech: false }), false);
});

test('bestScore leaves out attempts with no score', () => {
  assert.equal(bestScore([]), null);
  assert.equal(bestScore([{ score: null, correct: false }]), null);
  assert.equal(bestScore([{ score: null, correct: true }, { score: 0.5 }]), 0.5);
  assert.equal(bestScore([{ correct: true }]), 1);
});

test('PG-8: a review hint adds what the card does not show', () => {
  assert.equal(hintFor({ kind: 'form', payload: { word: 'river', example: 'The river is wide.' } }), 'r _ _ _ _ (5)');
  assert.equal(hintFor({ kind: 'meaning', payload: { word: 'doctor', example: 'He is a doctor.', def: 'a person who helps sick people', pos: 'noun' } }), 'a person who helps sick people');
  assert.equal(hintFor({ kind: 'meaning', payload: { word: 'run', example: 'I run.', pos: 'verb' } }), 'verb', 'no definition: the part of speech');
  assert.equal(hintFor({ kind: 'meaning', payload: { word: 'x', example: 'An x.' } }), null, 'nothing new: no hint');
  assert.equal(hintFor({ kind: 'meaning', payload: { word: 'x', example: 'a thing you see', def: 'a thing you see' } }), null, 'a definition that is the example is not new');
});

test('PG-12: the next listening item comes from a met lesson first, then from the learner\'s next lesson', () => {
  const item = (lesson, level, ex, rank) => ({ lesson: { id: lesson, level }, ex: { id: ex }, rank });
  const items = [item('a1-01', 'A1', 'e3', 100), item('a1-02', 'A1', 'e3', 200), item('a1-03', 'A1', 'e2', 300), item('a1-04', 'A1', 'e1', 400)];
  const progress = new Map([['a1-01', { status: 'completed' }]]);
  const done = (lesson, ex) => ({ lesson, exercise: ex });
  assert.equal(nextSuggestion(items, [], 'A1', progress, 'a1-03').lesson.id, 'a1-01', 'an undone item in a met lesson comes first');
  assert.equal(nextSuggestion(items, [done('a1-01', 'e3')], 'A1', progress, 'a1-03').lesson.id, 'a1-03', 'then the next lesson');
  assert.equal(nextSuggestion(items, [done('a1-01', 'e3')], 'A1', progress).lesson.id, 'a1-02', 'without a next lesson, curriculum order');
  assert.ok(metLesson(progress, items[0]) && !metLesson(progress, items[1]));
});

test('PG-14: without IPA, a speaking tip names each sound by its example word', () => {
  const set = (id) => SOUND_SETS.find((x) => x.id === id);
  assert.equal(withoutIpa('For /iː/ (sheep) spread your lips', set('ih-ee')), 'For sheep spread your lips');
  assert.equal(withoutIpa('צליל ארוך: sheep /iː/.', set('ih-ee')), 'צליל ארוך: sheep.');
  assert.equal(withoutIpa('you get /s/ or /t/.', set('th-s-t')), 'you get “sink” or “tank”.');
  assert.equal(withoutIpa('as /θ/, between', set('dh-d')), 'as “think”, between', 'a sound from another set');
  for (const x of SOUND_SETS) for (const t of [x.tip.en, x.tip.he]) assert.ok(!/\/[^/\s]+\//.test(withoutIpa(t, x)), `${x.id}: IPA left in "${withoutIpa(t, x)}"`);
});

// ---------- C4: the centres list from the centre files, with the lesson files as the offline fallback ----------
const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
let blockedContent = [];
let contentRequests = [];
// content.js in Node: files from disk; a blocked path fails like a network error.
globalThis.fetch = async (url) => {
  const path = fileURLToPath(String(url));
  const rel = path.slice(CONTENT.length + 1);
  contentRequests.push(rel);
  if (blockedContent.some((b) => rel.includes(b))) throw new TypeError('Failed to fetch');
  if (!existsSync(path)) return new Response('', { status: 404 });
  return new Response(readFileSync(path), { status: 200 });
};
const view = (items) => items.map(({ lesson, ex, rank }) => ({ lesson: { id: lesson.id, level: lesson.level, title_en: lesson.title_en, title_he: lesson.title_he, topics: lesson.topics }, ex, rank }));
const CENTER_TYPES = [['read'], ['listen', 'dictation'], ['speak'], ['listen'], ['dictation']];

test('C4: the centre files give the same items, in the same order and rank, as every lesson file did', async () => {
  // The old path first (centre files unreachable, so the lesson files are read, as before C4), then the centre files.
  blockedContent = ['centers/'];
  const old = [];
  const oldRead = await gatherExercises(['read']);
  for (const types of CENTER_TYPES) old.push(view(await gatherExercises(types)));
  assert.ok(contentRequests.some((r) => r.startsWith('lessons/')), 'the fallback reads the lesson files');
  blockedContent = [];
  contentRequests = [];
  for (const [i, types] of CENTER_TYPES.entries()) {
    const items = await gatherExercises(types);
    assert.deepEqual(view(items), old[i], types.join('+'));
    assert.ok(items.length > 0 && items.every((x) => types.includes(x.ex.type)));
  }
  assert.ok(!contentRequests.some((r) => r.startsWith('lessons/')), 'a lesson file was loaded');
  assert.deepEqual([...new Set(contentRequests.filter((r) => r.startsWith('centers/')))].sort(), ['centers/listen.json', 'centers/read.json', 'centers/speak.json']);
  // findItem and the done counts work on these items as on the old ones.
  const items = await gatherExercises(['read']);
  const first = items[0];
  assert.equal(findItem(items, { l: first.lesson.id, e: first.ex.id }), first);
  const key = (x) => x && `${x.lesson.id}:${x.ex.id}`;
  const done = items.filter((x, i) => i % 3 === 0).map((x) => ({ lesson: x.lesson.id, exercise: x.ex.id, score: 1 }));
  const met = new Map(items.slice(0, 6).map((x) => [x.lesson.id, { status: 'started' }]));
  for (const level of ['PreA1', 'A2', 'B1', 'C2']) assert.equal(key(nextSuggestion(items, done, level, met, items[9].lesson.id)), key(nextSuggestion(oldRead, done, level, met, items[9].lesson.id)), level);
});

// ---------- C6: attempts grouped by lesson and exercise once per attempts array ----------
test('C6: attemptsOn gives the same attempts as a filter, and the done counts and suggestions are unchanged', async () => {
  const items = await gatherExercises(['listen', 'dictation']);
  // A heavy history: attempts on most items, from lessons, centres and drills, plus attempts on things that are
  // not centre items (scenario turns, writing tasks, other exercises of the same lessons).
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const attempts = [];
  for (let i = 0; i < 5300; i++) {
    const x = items[Math.floor(rnd() * items.length)];
    const r = rnd();
    if (r < 0.7) attempts.push({ lesson: x.lesson.id, exercise: x.ex.id, source: 'listening', score: r < 0.1 ? null : rnd(), correct: rnd() > 0.4, at: new Date(2026, 0, 1 + (i % 180)).toISOString() });
    else if (r < 0.85) attempts.push({ lesson: x.lesson.id, exercise: 'e99', source: 'lesson', score: 1, correct: true });
    else attempts.push({ source: 'scenario', exercise: `rl-x:${i % 5}`, score: 0.5, correct: false });
  }
  Object.freeze(attempts);
  const filter = (list, item) => list.filter((a) => a.exercise === item.ex.id && a.lesson === item.lesson.id);
  for (const x of items) {
    const got = attemptsOn(attempts, x);
    assert.deepEqual(got, filter(attempts, x), `${x.lesson.id}:${x.ex.id}`);
    assert.ok(Object.isFrozen(got) || got.length > 0);
    assert.equal(bestScore(got), bestScore(filter(attempts, x)));
  }
  assert.equal(attemptsOn(attempts, items[0]), attemptsOn(attempts, items[0]), 'one grouping per array');
  const groupsDone = (fn) => items.filter((x) => fn(attempts, x).length).length;
  assert.equal(groupsDone(attemptsOn), groupsDone(filter));
  // A new attempts array (the model rebuilt after recordAttempt) is grouped again.
  const extra = items.find((x) => !filter(attempts, x).length) || items[0];
  const more = [...attempts, { lesson: extra.lesson.id, exercise: extra.ex.id, score: 1, correct: true }];
  assert.deepEqual(attemptsOn(more, extra), filter(more, extra));
  assert.ok(attemptsOn(more, extra).length > 0);
  // nextSuggestion is the same with the grouped lookup.
  const oldNext = (list, at, level) => list.filter((x) => levelIndex(x.lesson.level) <= levelIndex(level) && !filter(at, x).length)
    .sort((a, b) => levelIndex(b.lesson.level) - levelIndex(a.lesson.level) || a.rank - b.rank)[0] || null;
  for (const level of ['PreA1', 'A1', 'B1', 'C2']) assert.equal(nextSuggestion(items, attempts, level), oldNext(items, attempts, level), level);
});
