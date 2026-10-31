// Learner logic: evidence rules for skill levels, placement confirmation and resume, the path around
// unwritten lessons, daily-plan length and goals, and the learner store flows behind persona findings
// P-48 (progress after "Start from <level>"), P-70 (revising a placed-out lesson), P-82 (vocabulary for
// placed learners) and P-45 (Hebrew support follows the course level).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { skillLevels, placementSkillEstimate, nextLesson, courseLevel, unwrittenAhead, dailyPlan, lessonSlice, pickScenario, periodReport, LEVELS } from '../../js/core/adaptive.js';
import { createPlacement, MAX_ITEMS } from '../../js/core/placement.js';

const T0 = new Date('2026-10-01T09:00:00Z');
const at = (days, h = 0) => new Date(T0.getTime() + days * 86_400_000 + h * 3_600_000).toISOString();

// ---------- skill levels ----------
test('no skill level from the overall placement level, and none for untested skills', () => {
  const placement = { level: 'B1', skills: { grammar: { level: 'B1', items: 2 } }, answers: [] };
  const s = skillLevels({ placement });
  for (const k of ['vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing']) assert.equal(s[k].level, null, k);
});

test('placement gives a first estimate only from 2+ answers at the level, never C1/C2', () => {
  const one = [{ skill: 'vocabulary', level: 'C2', correct: true }];
  assert.equal(placementSkillEstimate(one, 'vocabulary'), null, 'one item names no level');
  const c1 = [{ skill: 'vocabulary', level: 'C1', correct: true }, { skill: 'vocabulary', level: 'C1', correct: true }];
  assert.deepEqual(placementSkillEstimate(c1, 'vocabulary'), { level: 'B2', items: 2, capped: true, from: 'C1', right: 2 });
  const half = [{ skill: 'grammar', level: 'B1', correct: true }, { skill: 'grammar', level: 'B1', correct: false }];
  assert.equal(placementSkillEstimate(half, 'grammar'), null, '1 of 2 is not enough');
  const speaking = skillLevels({ placement: { answers: [...c1, { skill: 'speaking', level: 'B1', correct: true }, { skill: 'speaking', level: 'B1', correct: true }] } });
  assert.equal(speaking.speaking.level, null, 'placement never sets speaking');
  assert.equal(speaking.vocabulary.capped, true);
});

test('practice shows a level only with 6+ answers at it, 75%+, on two different days', () => {
  const oneDay = Array.from({ length: 8 }, (_, i) => ({ skill: 'grammar', level: 'B2', correct: i < 7, at: at(0, i) }));
  assert.equal(skillLevels({ attempts: oneDay }).grammar.level, null, 'one sitting is not enough');
  const twoDays = oneDay.map((a, i) => ({ ...a, at: at(i % 2, i) }));
  const g = skillLevels({ attempts: twoDays }).grammar;
  assert.deepEqual([g.level, g.source, g.evidence, g.days], ['B2', 'practice', 8, 2]);
  const speak = Array.from({ length: 10 }, (_, i) => ({ skill: 'speaking', level: 'B1', correct: true, at: at(i) }));
  assert.equal(skillLevels({ attempts: speak }).speaking.level, null, 'self-marked speaking items never set a level');
});

test('writing needs two assessed tasks on two days; revisions of one task count once', () => {
  const sameTask = [{ exercise: 'we-05', at: at(0), evaluation: { cefr_estimate: 'B1' } }, { exercise: 'we-05', at: at(1), evaluation: { cefr_estimate: 'B2' } }];
  const one = skillLevels({ writing: sameTask }).writing;
  assert.equal(one.level, null);
  assert.equal(one.evidence, 1);
  const sameDay = [{ exercise: 'a', at: at(0, 1), evaluation: { cefr_estimate: 'B1' } }, { exercise: 'b', at: at(0, 2), evaluation: { cefr_estimate: 'B1' } }];
  assert.equal(skillLevels({ writing: sameDay }).writing.level, null, 'two texts on one day');
  const ok = [...sameTask, { exercise: 'we-06', at: at(3), evaluation: { cefr_estimate: 'B1' } }];
  assert.equal(skillLevels({ writing: ok }).writing.level, 'B1');
});

// ---------- placement ----------
const bank = LEVELS.flatMap((level) => Array.from({ length: 12 }, (_, i) => ({ id: `${level}-${i}`, level, skill: ['grammar', 'vocabulary', 'reading', 'listening'][i % 4] })));
function run(answerFor, start = 'A1', { stopAfter = Infinity, answers = [] } = {}) {
  const p = createPlacement(bank, { start, answers });
  let item;
  while ((item = p.next()) && p.progress.asked < stopAfter) p.answer(item, answerFor(item));
  return p;
}
const knows = (level) => (item) => (LEVELS.indexOf(item.level) <= LEVELS.indexOf(level) ? { correct: true } : { correct: false, dontKnow: true });

test('placement never claims a level on one lucky block', () => {
  // A B1 learner who gets 3 of the first 4 B2 items right, then 1 of 4.
  let b2 = 0;
  const lucky = (item) => {
    if (item.level !== 'B2') return knows('B1')(item);
    b2++;
    return { correct: b2 <= 3 || b2 === 8 ? b2 <= 3 : false };
  };
  const r = run(lucky, 'B1').result();
  assert.equal(r.demonstrated, 'B1');
  assert.equal(r.start_level, 'B1', 'the start is the confirmed level, not the one above');
});

test('every level the placement reports is confirmed by a second block', () => {
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    const r = run(knows(level), 'A1').result();
    const at = (l) => r.answers.filter((a) => a.level === l);
    const right = (l) => at(l).filter((a) => a.correct).length;
    const d = r.demonstrated;
    const up = LEVELS[LEVELS.indexOf(d) + 1];
    assert.ok(at(d).length >= 8 || (up && at(up).length >= 4 && right(up) / at(up).length >= 0.75), `${level}: ${d} confirmed`);
    assert.ok(r.items <= MAX_ITEMS);
  }
});

test('an interrupted placement resumes where it stopped and ends the same way', () => {
  const whole = run(knows('B1'), 'A2').result();
  const part = run(knows('B1'), 'A2', { stopAfter: 6 });
  assert.equal(part.answers.length, 6);
  const resumed = run(knows('B1'), 'A2', { answers: part.answers });
  assert.equal(resumed.progress.asked >= 6, true);
  const r = resumed.result();
  assert.equal(r.demonstrated, whole.demonstrated);
  assert.equal(r.items, whole.items);
});

test('a perfect score is the top band, and skill estimates stay at B2+', () => {
  const r = run(() => ({ correct: true }), 'B2').result();
  assert.equal(r.demonstrated, 'C2');
  assert.equal(r.top_band, true);
  for (const s of ['grammar', 'vocabulary', 'reading', 'listening']) {
    assert.ok(!r.skills[s].level || r.skills[s].level === 'B2', `${s}: ${r.skills[s].level}`);
  }
});

// ---------- path ----------
const cur = { levels: [
  { id: 'B1', lessons: [{ id: 'b1-01', level: 'B1' }, { id: 'b1-02', level: 'B1' }, { id: 'b1-03', level: 'B1' }] },
  { id: 'B2', lessons: [{ id: 'b2-01', level: 'B2' }] },
] };

test('the next lesson skips lessons that have no file, and says which were skipped', () => {
  const progress = new Map([['b1-01', { status: 'completed' }]]);
  const available = new Set(['b1-01', 'b1-03', 'b2-01']);
  const next = nextLesson(cur, progress, available);
  assert.equal(next.id, 'b1-03');
  assert.deepEqual(unwrittenAhead(cur, progress, available, next).map((l) => l.id), ['b1-02']);
  assert.equal(nextLesson(cur, progress, new Set()).id, 'b1-02', 'an unknown manifest filters nothing');
  const allB1 = new Map([['b1-01', { status: 'completed' }], ['b1-03', { status: 'completed' }]]);
  assert.equal(courseLevel(cur, allB1, available), 'B2');
  assert.equal(nextLesson(cur, allB1, new Set(['b1-01', 'b1-03'])), null);
  assert.equal(courseLevel(cur, allB1, new Set(['b1-01', 'b1-03'])), 'B1', 'nothing ready: the level of the first unwritten lesson');
});

// ---------- daily plan ----------
test('the plan shows the real lesson length and splits long lessons across days', () => {
  const p10 = dailyPlan({ minutes: 10, next: { id: 'pa1-01' }, lesson: { minutes: 15, exercises: 13, done: 0, doneToday: 0 } });
  const learn = p10.blocks.find((b) => b.id === 'learn');
  assert.equal(learn.slice.split, true);
  assert.equal(learn.slice.total, 15);
  assert.ok(learn.minutes <= 10);
  assert.ok(learn.slice.upto > 0 && learn.slice.upto < 13);
  // Next day: resumes from the saved place.
  const resumed = dailyPlan({ minutes: 10, next: { id: 'pa1-01' }, lesson: { minutes: 15, exercises: 13, done: 8, doneToday: 0, resumable: true } });
  const r = resumed.blocks.find((b) => b.id === 'learn');
  assert.equal(r.route, 'lesson/pa1-01?resume=1');
  assert.equal(r.slice.split, false, 'the rest fits');
  assert.ok(r.minutes <= 7);
  // Today's part done.
  assert.equal(lessonSlice({ minutes: 25, exercises: 16, done: 6, doneToday: 6 }, 10).partDone, true);
  assert.equal(lessonSlice({ minutes: 25, exercises: 16, done: 3, doneToday: 3 }, 10).partDone, false);
});

const scenarios = [
  { id: 'rl-social-a', module: 'social', level: 'A2' },
  { id: 'rl-hotel-b1', module: 'hotel', level: 'B1' },
  { id: 'rl-airport-a2', module: 'airport', level: 'A2' },
  { id: 'rl-airport-b2', module: 'airport', level: 'B2' },
  { id: 'rl-emergency-b1', module: 'emergency', level: 'B1' },
];

test('goals shape the plan: travel names a scenario, studies pick reading and writing', () => {
  const travel = pickScenario(scenarios, { level: 'B1', goals: ['travel'] });
  assert.equal(travel.id, 'rl-airport-a2', 'airport first, at or below the level');
  assert.equal(pickScenario(scenarios, { level: 'B1', goals: ['travel'], done: new Set(['rl-airport-a2']) }).id, 'rl-hotel-b1');
  assert.equal(pickScenario(scenarios, { level: 'B1', goals: ['work'] }), null, 'no workplace content yet');
  const base = { minutes: 20, next: { id: 'b1-01' }, level: 'B1' };
  const t = dailyPlan({ ...base, goals: ['travel'], scenario: travel }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([t.kind, t.route, t.goal], ['speaking', 'scenario/rl-airport-a2', 'travel']);
  const st = dailyPlan({ ...base, goals: ['studies'], writingTask: { id: 'we-05' }, lastReadingAt: at(1) }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([st.kind, st.route], ['writing', 'writing/we-05'], 'writing first when reading was done more recently');
  const st2 = dailyPlan({ ...base, goals: ['studies'], lastWritingAt: at(2), lastReadingAt: at(1) }).blocks.find((b) => b.id === 'use');
  assert.equal(st2.kind, 'reading');
  const work = dailyPlan({ ...base, goals: ['work'] }).blocks.find((b) => b.id === 'use');
  assert.equal(work.goal, null, 'work without workplace content leaves the default mix');
  const work2 = dailyPlan({ ...base, goals: ['work'], scenario: { id: 'rl-work-meeting', module: 'work', level: 'B1' } }).blocks.find((b) => b.id === 'use');
  assert.deepEqual([work2.route, work2.goal], ['scenario/rl-work-meeting', 'work']);
});

test('reports count only curriculum lessons and include the open session', () => {
  const now = new Date(at(3)).getTime();
  const progress = [
    { id: 'b1-01', status: 'completed', completed_at: at(2) },
    { id: 'rl:rl-airport-a2', status: 'completed', completed_at: at(2) },
    { id: 'check:B1', status: 'completed', completed_at: at(2) },
  ];
  const r = periodReport({ progress, now, events: [{ type: 'session', seconds: 120, at: at(2) }], extraSeconds: 300 });
  assert.equal(r.lessons_completed, 1);
  assert.equal(r.minutes, 7);
});

// ---------- learner store flows ----------
// learner.js runs against the real store (memory backend) and real curriculum files.
const root = new URL('../../', import.meta.url);
let L; let storeMod; let docSupport = () => globalThis.document.documentElement.dataset.support;
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
  L.applySupport();
});
const lessonFile = async (id) => JSON.parse(await readFile(new URL(`content/lessons/${id}.json`, root), 'utf8'));

test('P-37: a placement that was left is pending, keeps its answers, and clears on a result', async () => {
  assert.equal(L.placementPending(), true);
  assert.equal(L.selfReportLevel(), 'B1');
  // Choosing a level on the path settles it too (recorded as the learner's own estimate).
  await L.moveToLevel('A2');
  assert.equal(L.placementPending(), false);
  assert.equal(storeMod.store.get('placement', 'latest').skipped, 'self-report');
  storeMod.store.remove('placement', 'latest');
  assert.equal(L.placementPending(), true);
  L.savePlacementDraft({ start: 'B1', answers: [{ id: 'x', correct: true, dontKnow: false }] });
  assert.equal(L.placementDraft().answers.length, 1);
  await L.applyPlacement({ demonstrated: 'B2', level: 'B2', start_level: 'C1', items: 16, answers: [], skills: {} });
  assert.equal(L.placementPending(), false);
  assert.equal(L.placementDraft(), null);
  assert.equal(L.progressOf('b2-01').status, 'placed_out');
  assert.equal(L.model().courseLevel, 'C1');
  // R2-06: 'auto' support follows the level the test confirmed (B2), not the course level it starts at (C1).
  assert.equal(docSupport(), 'minimal', 'Hebrew support follows the confirmed B2');
});

test('P-48 and P-45: after "Start from B2", a finished lesson is recorded and the plan moves on', async () => {
  await L.moveToLevel('B2');
  assert.equal(L.progressOf('b2-01'), null, 'placed-out marker removed');
  assert.equal(docSupport(), 'minimal', 'support re-applied at once for B2');
  const lesson = await lessonFile('b2-01');
  L.startLesson(lesson);
  assert.equal(L.progressOf('b2-01').status, 'started');
  L.finishLesson(lesson, { score: 0.8, passed: true });
  const p = L.progressOf('b2-01');
  assert.equal(p.status, 'completed');
  assert.equal(p._deleted, undefined);
  assert.equal(L.model().next.id, 'b2-02');
  const r = periodReport({ progress: storeMod.store.all('progress'), now: Date.now() });
  assert.equal(r.lessons_completed, 1);
});

test('P-48 repair: progress hidden behind an old deletion mark comes back', async () => {
  storeMod.store.put('progress', { id: 'b2-05', level: 'B2', status: 'completed', completed_at: new Date().toISOString(), _deleted: true }, { origin: 'remote' });
  assert.equal(L.progressOf('b2-05'), null);
  await L.initModel();
  assert.equal(L.progressOf('b2-05')?.status, 'completed');
});

test('P-70: revising a placed-out lesson does not move the course level back', async () => {
  const lesson = await lessonFile('b1-03');
  assert.equal(L.progressOf('b1-03').status, 'placed_out');
  const before = L.model().courseLevel;
  L.startLesson(lesson);
  assert.equal(L.progressOf('b1-03').status, 'placed_out');
  L.finishLesson(lesson, { score: 0.5, passed: false });
  assert.equal(L.progressOf('b1-03').status, 'placed_out', 'a miss keeps it placed out');
  assert.equal(L.progressOf('b1-03').last_score, 0.5);
  assert.equal(L.model().courseLevel, before);
  L.finishLesson(lesson, { score: 0.9, passed: true });
  assert.equal(L.progressOf('b1-03').status, 'completed');
});

test('P-82: placed learners can add placed-out words; new words are queued at the daily limit', async () => {
  for (const c of storeMod.store.all('cards')) storeMod.store.remove('cards', c.id);
  assert.equal(L.canImportVocab('A2'), true);
  const added = await L.importPlacedOutVocab('A2');
  assert.ok(added > 20, `${added} words`);
  assert.equal(L.canImportVocab('A2'), false);
  const perDay = new Map();
  for (const c of L.allCards().filter((x) => x.ref?.lesson?.startsWith('a2-'))) perDay.set(c.created_at.slice(0, 10), (perDay.get(c.created_at.slice(0, 10)) || 0) + 1);
  assert.ok([...perDay.values()].every((n) => n <= L.settings().new_per_day), [...perDay.values()].join(','));
  assert.ok(L.due().length <= L.settings().new_per_day, 'only today\'s share is due now');
});

test('the plan for the store: the next lesson file gives its real length', async () => {
  const next = L.model().next;
  const plan = L.todayPlan(10, { lesson: await lessonFile(next.id) });
  const learn = plan.blocks.find((b) => b.id === 'learn');
  assert.ok(learn.slice.total >= 15);
  assert.ok(plan.minutes <= 12, `${plan.minutes} min`);
});
