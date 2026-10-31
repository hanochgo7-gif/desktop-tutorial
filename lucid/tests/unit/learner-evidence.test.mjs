// Learner model, plan and progress, persona round 2: first tries only as evidence (R2-12), topics that are
// real (R2-37), a practice block always has content (R2-24), "Nearly there" continues with the missed
// exercises (R2-02, R2-25), Today counts a saved run as the player does (R2-17, N6, D7), writing time
// (R2-16), only what was done is ticked (R2-27), placement estimates and start (R2-29, R2-38, R1-Y2).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { skillLevels, placementSkillEstimate, topicMastery, weakTopics, firstTries, dailyPlan, lessonSlice, writingMinutes, periodReport, LEVELS } from '../../js/core/adaptive.js';
import { createPlacement, startFor } from '../../js/core/placement.js';

const T0 = new Date('2026-10-01T09:00:00Z');
const at = (days, h = 0) => new Date(T0.getTime() + days * 86_400_000 + h * 3_600_000).toISOString();

// ---------- R2-12: first tries only ----------
test('R2-12: retries and same-day redos are not skill evidence; a lesson passed only through retries does not raise the level', () => {
  const answer = (lesson, i, ok, day, h) => ({ source: 'lesson', lesson, exercise: `e${i}`, skill: 'grammar', level: 'B2', correct: ok, score: ok ? 1 : 0, at: at(day, h) });
  // Day 0: first tries 7 of 11; the 4 misses come back as end-of-set retries, then "Practise the 4 I missed".
  const firstRun = Array.from({ length: 11 }, (_, i) => answer('b2-01', i + 1, i < 7, 0, i / 20));
  const retries = [8, 9, 10, 11].map((i) => answer('b2-01', i, true, 0, 1 + i / 20));
  const missedRedo = [8, 9, 10, 11].map((i) => answer('b2-01', i, true, 0, 2 + i / 20));
  // Day 1: three first tries in the next lesson, two right.
  const nextDay = [1, 2, 3].map((i) => answer('b2-02', i, i < 3, 1, i / 20));
  const all = [...firstRun, ...retries, ...missedRedo, ...nextDay];
  // Counting every answer would read 17 of 22 (77%) on two days: a B2 level from a lesson nearly failed.
  assert.equal(firstTries(all).length, 14);
  assert.equal(skillLevels({ attempts: all }).grammar.level, null, 'only 9 of 14 first tries are right');
  // The missed exercises redone on a later day are spaced retrieval and count.
  const later = [8, 9, 10, 11].map((i) => answer('b2-01', i, true, 2, i / 20));
  assert.equal(firstTries([...all, ...later]).length, 18);
  // Exercise ids repeat across lessons ("e1"), so the key includes the lesson.
  assert.equal(firstTries([answer('a', 1, true, 0, 0), answer('b', 1, true, 0, 0.1)]).length, 2);
  // Unscored practice, placement and records with no item id behave as before.
  assert.equal(firstTries([{ correct: true, at: at(0) }, { correct: true, at: at(0) }]).length, 2);
});

test('R2-12: first-try accuracy and topic mastery leave retries out', () => {
  const now = new Date(at(3)).getTime();
  const tries = [
    { source: 'lesson', lesson: 'a2-01', exercise: 'e1', topic: 'past-simple-regular', correct: false, score: 0, at: at(2, 1) },
    { source: 'lesson', lesson: 'a2-01', exercise: 'e1', topic: 'past-simple-regular', correct: true, score: 1, at: at(2, 2) },
  ];
  const r = periodReport({ attempts: tries, now, days: 7 });
  assert.equal(r.accuracy, 0, 'the retry is not a first try');
  assert.equal(r.exercises, 2, 'every answer still counts as practice done');
  assert.equal(topicMastery(tries, now).get('past-simple-regular').evidence, 1);
});

// ---------- R2-37: topics that are real ----------
test('R2-37: essay feedback never moves a topic; auto-graded writing items still count', () => {
  const now = new Date(at(5)).getTime();
  // Seven AI-confirmed grammar and preposition mistakes, and two draft bands, on the stage topic.
  const essay = [
    ...Array.from({ length: 7 }, (_, i) => ({ source: 'writing', exercise: 'we-12', topic: 'argument-structure', skill: 'writing', level: 'B2', correct: false, score: 0, error_type: i % 2 ? 'preposition' : 'comparison-form', at: at(i % 3, i) })),
    { source: 'writing', exercise: 'we-12', topic: 'argument-structure', skill: 'writing', level: 'B2', correct: false, score: 0.5, at: at(1) },
    { source: 'writing', exercise: 'we-12', topic: 'argument-structure', skill: 'writing', level: 'B2', correct: false, score: 0.55, at: at(2) },
  ];
  const m = topicMastery(essay, now);
  assert.equal(m.has('argument-structure'), false, 'grammar mistakes in an essay do not lower "argument structure"');
  assert.equal(weakTopics(m).length, 0);
  const items = Array.from({ length: 3 }, (_, i) => ({ source: 'writing', lesson: 'we-11', exercise: `we-11-${i}`, topic: 'argument-structure', correct: i > 0, at: at(1, i) }));
  assert.equal(topicMastery([...essay, ...items], now).get('argument-structure').evidence, 3);
});

test('R2-37: a weak topic practised only far below the course level is not planned', () => {
  const base = { minutes: 20, next: { id: 'c1-04' } };
  const a1 = { topic: 'daily-life-vocab', mastery: 0.4, evidence: 6, level: 'A1', route: 'drill?topic=daily-life-vocab' };
  assert.equal(dailyPlan({ ...base, level: 'C1', weak: [a1] }).blocks.find((b) => b.id === 'practice'), undefined);
  const b2 = { topic: 'conditionals-3-mixed', mastery: 0.5, evidence: 5, level: 'B2', route: 'drill?topic=conditionals-3-mixed' };
  assert.equal(dailyPlan({ ...base, level: 'C1', weak: [a1, b2] }).blocks.find((b) => b.id === 'practice').route, 'drill?topic=conditionals-3-mixed');
  assert.equal(topicMastery([{ topic: 'x', level: 'A1', correct: true, at: at(0) }, { topic: 'x', level: 'B1', correct: true, at: at(0) }], new Date(at(1)).getTime()).get('x').level, 'B1');
});

// ---------- R2-24: a practice block always has content ----------
test('R2-24: a topic with nowhere to practise is not planned; real-life topics go to their scenario', () => {
  const base = { minutes: 20, next: { id: 'a2-03' }, level: 'A2' };
  const none = dailyPlan({ ...base, weak: [{ topic: 'informal-expressions', mastery: 0.4, evidence: 4, route: null }] });
  assert.equal(none.blocks.find((b) => b.id === 'practice'), undefined);
  const travel = dailyPlan({ ...base, weak: [{ topic: 'travel-functional', mastery: 0.55, evidence: 5, level: 'A2', route: 'scenario/rl-airport-checkin?tab=practise', scenario: 'rl-airport-checkin' }] });
  const p = travel.blocks.find((b) => b.id === 'practice');
  assert.deepEqual([p.route, p.focus.kind, p.focus.scenario], ['scenario/rl-airport-checkin?tab=practise', 'scenario', 'rl-airport-checkin']);
  assert.equal(p.done, false);
  const done = dailyPlan({ ...base, weak: [{ topic: 'travel-functional', mastery: 0.55, evidence: 5, route: 'scenario/rl-airport-checkin?tab=practise', scenario: 'rl-airport-checkin' }], today: { scenarios: new Set(['rl-airport-checkin']) } });
  assert.equal(done.blocks.find((b) => b.id === 'practice').done, true);
  // A drill is ticked only by a drill on that focus.
  const err = { minutes: 20, next: { id: 'a2-03' }, level: 'A2', recurring: [{ error_type: 'article' }] };
  assert.equal(dailyPlan({ ...err, today: { drills: new Set(['error:preposition']) } }).blocks.find((b) => b.id === 'practice').done, false);
  assert.equal(dailyPlan({ ...err, today: { drills: new Set(['error:article']) } }).blocks.find((b) => b.id === 'practice').done, true);
});

// ---------- R2-02, R2-25: "Nearly there" continues with the missed exercises ----------
test('R2-02/R2-25: after "Nearly there" the plan\'s lesson is the missed exercises, unless a run is in progress', () => {
  const lesson = { minutes: 15, exercises: 13, done: 0, doneToday: 13, missed: { count: 4, minutes: 4 } };
  const learn = dailyPlan({ minutes: 10, next: { id: 'pa1-01' }, lesson }).blocks.find((b) => b.id === 'learn');
  assert.deepEqual([learn.route, learn.minutes, learn.missed, learn.slice.split], ['lesson/pa1-01?stage=missed', 4, 4, false]);
  const running = dailyPlan({ minutes: 10, next: { id: 'pa1-01' }, lesson: { ...lesson, resumable: true, done: 2, exercises: 4 } }).blocks.find((b) => b.id === 'learn');
  assert.equal(running.route, 'lesson/pa1-01?resume=1');
});

// ---------- R2-17, N6, D7: Today counts a saved run as the player does ----------
test('R2-17: the plan counts the first pass and the retries apart, as the player does', () => {
  // 16 exercises, 14 answered, 4 retries waiting at the end.
  const s = lessonSlice({ minutes: 25, exercises: 16, done: 14, doneToday: 14, revisit: 4 }, 10);
  assert.deepEqual([s.of, s.done, s.revisit], [16, 14, 4]);
  assert.ok(s.remaining >= 7, 'the retries take time too');
});

// ---------- R2-16: writing time ----------
test('R2-16: a writing block is timed from the task\'s word range and planned as a part when it is longer', () => {
  assert.equal(writingMinutes({ level: 'B2', min_words: 180, max_words: 250 }), 30);
  assert.equal(writingMinutes({ level: 'A1', min_words: 30, max_words: 80 }), 10);
  assert.equal(writingMinutes({ level: 'B1', items: new Array(8) }), 4);
  const task = { id: 'we-08', level: 'B2', min_words: 180, max_words: 250 };
  const base = { minutes: 20, next: { id: 'b2-01' }, level: 'B2', goals: ['studies'], lastReadingAt: at(1) };
  const use = dailyPlan({ ...base, writingTask: task }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([use.kind, use.minutes, use.total, use.part], ['writing', 4, 30, true]);
  const short = dailyPlan({ ...base, writingTask: { id: 'we-01', level: 'A1', items: new Array(6) } }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([short.minutes, short.part], [3, false]);
});

// ---------- R2-27: only what was done is ticked ----------
test('R2-27: the "use it" block shows the scenario done today, ticked, never the next one', () => {
  const done = { id: 'rl-airport-passport', module: 'airport', level: 'A2' };
  const next = { id: 'rl-airport-gate', module: 'airport', level: 'A2' };
  const base = { minutes: 20, next: { id: 'a2-03' }, level: 'A2', goals: ['travel'], scenario: next };
  const after = dailyPlan({ ...base, today: { scenario: done, scenarios: new Set([done.id]), speaking: true } }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([after.scenario, after.done], ['rl-airport-passport', true]);
  // A speaking item in a lesson is not the scenario.
  const lessonSpeaking = dailyPlan({ ...base, today: { speaking: true } }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([lessonSpeaking.scenario, lessonSpeaking.done], ['rl-airport-gate', false]);
  // A scenario outside the goal's modules does not stand in for the goal.
  const social = { id: 'rl-social-party', module: 'social', level: 'A2' };
  assert.equal(dailyPlan({ ...base, today: { scenario: social } }).blocks.find((b) => b.id === 'use').done, false);
});

test('R2-39: a reading block from the academic-writing goal names that goal', () => {
  const use = dailyPlan({ minutes: 20, next: { id: 'c1-04' }, level: 'C1', goals: ['work', 'writing'], lastWritingAt: at(2), lastReadingAt: at(1) }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([use.kind, use.goal], ['reading', 'writing']);
});

// ---------- R2-29, R2-38, R1-Y2: placement ----------
const bank = LEVELS.flatMap((level) => Array.from({ length: 12 }, (_, i) => ({ id: `${level}-${i}`, level, skill: ['grammar', 'vocabulary', 'reading', 'listening'][i % 4] })));
function run(answerFor, start = 'A1', goals = []) {
  const p = createPlacement(bank, { start, goals });
  let item;
  while ((item = p.next())) p.answer(item, answerFor(item));
  return p.result();
}
const knows = (level) => (item) => (LEVELS.indexOf(item.level) <= LEVELS.indexOf(level) ? { correct: true } : { correct: false, dontKnow: true });

test('R2-29: a skill\'s placement estimate never goes above the confirmed level, and says where its answers were', () => {
  const a2 = [{ skill: 'grammar', level: 'A2', correct: true }, { skill: 'grammar', level: 'A2', correct: true }];
  assert.deepEqual(placementSkillEstimate(a2, 'grammar', { confirmed: 'A1' }), { level: 'A1', items: 2, capped: false, from: 'A2', right: 2 });
  assert.equal(placementSkillEstimate(a2, 'grammar', { confirmed: null }), null, 'nothing confirmed: no skill level either');
  assert.deepEqual(placementSkillEstimate(a2, 'grammar', { confirmed: 'B1' }), { level: 'A2', items: 2, capped: false });
  const g = skillLevels({ placement: { demonstrated: 'A1', answers: a2 } }).grammar;
  assert.deepEqual([g.level, g.provisional, g.from], ['A1', true, 'A2']);
  // Moshe: A1 confirmed, 4 of 8 at A2 with grammar and reading right there.
  const r = run((item) => (item.level === 'A2' ? { correct: ['grammar', 'reading'].includes(item.skill) } : knows('A1')(item)));
  assert.equal(r.demonstrated, 'A1');
  for (const s of ['grammar', 'vocabulary', 'reading', 'listening']) assert.ok(!r.skills[s].level || LEVELS.indexOf(r.skills[s].level) <= LEVELS.indexOf('A1'), `${s}: ${r.skills[s].level}`);
});

test('R2-38: capped skills keep where their answers were (B2+, 2 of 2 at C1)', () => {
  const r = run(knows('C1'), 'B2');
  assert.equal(r.demonstrated, 'C1');
  const capped = Object.values(r.skills).filter((v) => v.capped);
  assert.ok(capped.length, 'some skill reaches B2+');
  for (const v of capped) assert.ok(['C1', 'C2'].includes(v.from) && v.right >= 2, JSON.stringify(v));
});

test('R1-Y2: the course starts at the confirmed level; non-academic goals are not started on the C1 track', () => {
  assert.equal(run(knows('B2'), 'B1', ['work']).start_level, 'B2', 'B2 confirmed: start at B2, not C1');
  const work = run(knows('C1'), 'B2', ['work', 'travel']);
  assert.deepEqual([work.demonstrated, work.start_level, work.held_for_goals], ['C1', 'B2', 'C1']);
  assert.equal(run(knows('C1'), 'B2', ['work', 'writing']).start_level, 'C1', 'academic writing chosen: C1');
  assert.equal(run(knows('C1'), 'B2', []).start_level, 'C1', 'no goals: nothing to weigh');
  assert.deepEqual(startFor(null, ['travel']), { start_level: 'PreA1' });
  assert.deepEqual(startFor('C2', ['conversation']), { start_level: 'B2', held_for_goals: 'C2' });
});

// ---------- the learner store (real curriculum files, memory backend) ----------
const root = new URL('../../', import.meta.url);
let L; let storeMod; let lessonView;
before(async () => {
  globalThis.document = { documentElement: { dataset: {}, lang: 'en', dir: 'ltr' }, visibilityState: 'visible' };
  globalThis.addEventListener = () => {};
  globalThis.fetch = async (url) => {
    try { const body = await readFile(fileURLToPath(url), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(body) }; }
    catch { return { ok: false, status: 404, json: async () => null }; }
  };
  storeMod = await import('../../js/core/store.js');
  await storeMod.openStore();
  L = await import('../../js/core/learner.js');
  storeMod.store.put('profile', { id: 'me', onboarded: true, start_choice: 'comfortable', goals: ['travel'] });
  await L.initModel();
  lessonView = await import('../../js/views/lesson.js');
});
const lessonFile = async (id) => JSON.parse(await readFile(new URL(`content/lessons/${id}.json`, root), 'utf8'));
const curriculum = async () => JSON.parse(await readFile(new URL('content/curriculum.json', root), 'utf8'));
const clear = (coll) => { for (const r of storeMod.store.all(coll)) storeMod.store.remove(coll, r.id); };

test('R2-17: Today\'s step counts match the player\'s counter for every saved state', () => {
  const states = [
    { qi: 3, queue: [...Array.from({ length: 16 }, (_, i) => [`e${i}`, false]), ['e2', true]] },
    { qi: 14, queue: [...Array.from({ length: 16 }, (_, i) => [`e${i}`, false]), ['e1', true], ['e2', true], ['e5', true], ['e9', true]] },
    { qi: 17, queue: [...Array.from({ length: 16 }, (_, i) => [`e${i}`, false]), ['e1', true], ['e2', true], ['e5', true], ['e9', true]] },
    { qi: 0, queue: [['e2', false], ['e4', false]] },
  ];
  for (const r of states) {
    const mine = L.resumeStep(r);
    const player = lessonView.stepInfo(r.queue.map(([id, retry]) => ({ ex: { id }, retry })), r.qi);
    assert.deepEqual({ retry: mine.retry, pos: mine.pos, total: mine.total, pending: mine.pending }, player, JSON.stringify(r));
  }
  const s = L.resumeStep(states[1]);
  assert.deepEqual([s.firstTotal, s.firstDone, s.revisit], [16, 14, 4]);
});

test('R2-17 and R2-02 in the store: a saved run and a "Nearly there" lesson reach the plan as the player counts them', async () => {
  await L.applyPlacement({ demonstrated: 'A1', level: 'A1', start_level: 'A2', items: 16, answers: [], skills: {} });
  const next = L.model().next;
  assert.equal(next.id, 'a2-01');
  const lesson = await lessonFile(next.id);
  const ids = lesson.exercises.map((e) => e.id);
  const queue = [...ids.map((x) => [x, false]), [ids[1], true], [ids[2], true]];
  storeMod.store.put('progress', { id: next.id, level: 'A2', status: 'started', resume: { qi: 5, queue, first: [], at: new Date().toISOString() } });
  let learn = L.todayPlan(10, { lesson }).blocks.find((b) => b.id === 'learn');
  assert.equal(learn.route, `lesson/${next.id}?resume=1`);
  assert.deepEqual([learn.slice.of, learn.step.pos, learn.step.total, learn.step.pending], [ids.length, 6, ids.length, 2]);
  // The run ended "Nearly there" with four missed: the plan's lesson is those four.
  storeMod.store.put('progress', { id: next.id, level: 'A2', status: 'started', best_score: 0.6, missed: { ids: ids.slice(0, 4), first: [], at: new Date().toISOString() } });
  learn = L.todayPlan(10, { lesson }).blocks.find((b) => b.id === 'learn');
  assert.equal(learn.route, `lesson/${next.id}?stage=missed`);
  assert.equal(learn.missed, 4);
  assert.ok(learn.minutes >= 1 && learn.minutes <= 10);
  storeMod.store.remove('progress', next.id);
});

test('R2-37 in the store: a review answer carries the topic of its word\'s lesson; old records are re-read', async () => {
  clear('attempts'); clear('cards');
  const c103 = await lessonFile('c1-03');
  const topic = (await curriculum()).levels.flatMap((l) => l.lessons).find((l) => l.id === 'c1-03').topics[0];
  L.addVocabCards(c103, new Date(Date.now() - 3 * 86_400_000));
  const card = L.allCards()[0];
  for (let i = 0; i < 4; i++) L.gradeCard(L.allCards().find((c) => c.id === card.id), { correct: false });
  const reviews = storeMod.store.all('attempts').filter((a) => a.source === 'review');
  assert.ok(reviews.length >= 4);
  assert.ok(reviews.every((a) => a.topic === topic && a.level), JSON.stringify(reviews[0]));
  assert.ok(!L.model().weak.some((w) => w.topic === 'daily-life-vocab'), 'C1 reviews created a weak A1 topic');
  // A review saved under the old fixed topic is read with its card's lesson topic.
  clear('attempts');
  for (let d = 0; d < 4; d++) storeMod.store.put('attempts', { id: `old${d}`, at: new Date(Date.now() - d * 86_400_000).toISOString(), source: 'review', exercise: card.id, topic: 'daily-life-vocab', skill: 'vocabulary', correct: false, score: 0 });
  assert.ok(!L.model().mastery.has('daily-life-vocab'));
  assert.ok(L.model().mastery.has(topic));
  clear('attempts'); clear('cards');
});

test('R2-24 in the store: weak real-life topics route to the scenario with the lowest score; topics with no exercises route nowhere', () => {
  clear('attempts');
  const now = Date.now();
  const put = (id, exercise, topic, score, h) => storeMod.store.put('attempts', { id, at: new Date(now - h * 3_600_000).toISOString(), source: 'scenario', exercise, topic, skill: 'speaking', level: 'A2', correct: score === 1, score });
  put('s1', 'rl-airport-checkin-overweight:0', 'travel-functional', 0.5, 5);
  put('s2', 'rl-airport-checkin-overweight:1', 'travel-functional', 0.5, 5);
  put('s3', 'rl-hotel-checkin-basics:0', 'travel-functional', 1, 4);
  put('s4', 'rl-hotel-checkin-basics:1', 'travel-functional', 0.5, 4);
  for (let i = 0; i < 3; i++) storeMod.store.put('attempts', { id: `ie${i}`, at: new Date(now - i * 3_600_000).toISOString(), source: 'expressions', exercise: `x${i}`, topic: 'informal-expressions', level: 'A2', correct: false, score: 0 });
  const weak = L.model().weak;
  const travel = weak.find((w) => w.topic === 'travel-functional');
  assert.deepEqual([travel.route, travel.scenario], ['scenario/rl-airport-checkin-overweight?tab=practise', 'rl-airport-checkin-overweight']);
  assert.equal(weak.find((w) => w.topic === 'informal-expressions').route, null);
  const plan = L.todayPlan(20, { scenarios: [] });
  for (const b of plan.blocks) assert.ok(!/^drill\?topic=(travel|social)-functional|informal-expressions/.test(b.route), b.route);
  clear('attempts');
});

test('R1-D3: a long explanation takes more of the lesson time than a short one', async () => {
  const { introSlots, lessonSlice } = await import('../../js/core/adaptive.js');
  const short = { explanation: [{ type: 'p', en: 'one two three' }], examples: [] };
  const long = { explanation: Array.from({ length: 10 }, () => ({ type: 'p', en: 'word '.repeat(90), he: 'מילה '.repeat(90) })), examples: [] };
  assert.equal(introSlots(short), 1);
  assert.equal(introSlots(long), 6, 'capped at 6 and Hebrew is not counted');
  const base = { minutes: 25, exercises: 16, done: 0 };
  const a = lessonSlice({ ...base, intro: 1 }, 10), b = lessonSlice({ ...base, intro: 6 }, 10);
  assert.ok(a.split && b.split && b.upto < a.upto, `a longer explanation leaves fewer exercises for today (${a.upto} vs ${b.upto})`);
});
