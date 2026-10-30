import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeFrom, Rating, newCard, review, dueCards, vocabCardsFor, unlockedFormCards, newItemsBudget, retrievability } from '../../js/core/srs.js';
import { topicMastery, weakTopics, errorProfile, skillLevels, nextLesson, dailyPlan, periodReport, LEVELS } from '../../js/core/adaptive.js';
import { createPlacement, zeroResult } from '../../js/core/placement.js';

const T0 = new Date('2026-10-01T09:00:00Z');
const at = (days, h = 0) => new Date(T0.getTime() + days * 86_400_000 + h * 3_600_000).toISOString();

test('objective grading: wrong=Again, hint/slow=Hard, right=Good, Easy only when fast and proven', () => {
  assert.equal(gradeFrom({ correct: false, hintUsed: true }), Rating.Again);
  assert.equal(gradeFrom({ correct: true, hintUsed: true }), Rating.Hard);
  assert.equal(gradeFrom({ correct: true, slow: true }), Rating.Hard);
  assert.equal(gradeFrom({ correct: true }), Rating.Good);
  assert.equal(gradeFrom({ correct: true, fast: true, reps: 1 }), Rating.Good);
  assert.equal(gradeFrom({ correct: true, fast: true, reps: 2 }), Rating.Easy);
});

test('FSRS cards schedule forward, lapse back, and unlock form recall at stability >= 7', () => {
  let c = newCard({ id: 'v:student:meaning', kind: 'meaning', ref: { word: 'student' } }, T0);
  let now = T0;
  for (let i = 0; i < 4; i++) { c = review(c, Rating.Good, { now }); now = new Date(c.fsrs.due); }
  assert.ok(c.fsrs.stability >= 7, `stability ${c.fsrs.stability}`);
  assert.ok(new Date(c.fsrs.due) > T0);
  assert.equal(c.log.length, 4);
  const lapsed = review(c, Rating.Again, { now });
  assert.ok(lapsed.fsrs.stability < c.fsrs.stability, 'a lapse lowers stability');
  const forms = unlockedFormCards([c], now);
  assert.deepEqual(forms.map((f) => f.id), ['v:student:form']);
  assert.equal(unlockedFormCards([c, ...forms], now).length, 0, 'not duplicated');
  assert.ok(retrievability(c, new Date(now.getTime() + 30 * 86_400_000)) < retrievability(c, now));
});

test('due cards come most-forgotten first; vocab cards are not duplicated; workload governor', () => {
  const a = review(newCard({ id: 'a', kind: 'meaning', ref: {} }, T0), Rating.Good, { now: T0 });
  const b = review(review(newCard({ id: 'b', kind: 'meaning', ref: {} }, T0), Rating.Good, { now: T0 }), Rating.Good, { now: new Date(at(1)) });
  const due = dueCards([a, b], new Date(at(60)));
  assert.equal(due[0].id, 'a', 'lower retrievability first');
  const lesson = { id: 'pa1-05', vocab: [{ word: 'student' }, { word: 'Teacher' }] };
  assert.deepEqual(vocabCardsFor(lesson, [{ id: 'v:student:meaning' }], T0).map((c) => c.id), ['v:teacher:meaning']);
  const heavy = Array.from({ length: 900 }, (_, i) => ({ id: `c${i}`, fsrs: { state: 2, due: at(1), stability: 3 } }));
  assert.equal(newItemsBudget(heavy, { now: T0 }), 4);
  assert.equal(newItemsBudget([], { now: T0 }), 8);
});

test('mastery needs accuracy, enough evidence and two different days', () => {
  const now = new Date(at(3)).getTime();
  const oneDay = Array.from({ length: 8 }, (_, i) => ({ topic: 'articles', correct: true, at: at(0, i) }));
  assert.equal(topicMastery(oneDay, now).get('articles').status, 'practising', 'one sitting is not mastery');
  const twoDays = [...oneDay, ...Array.from({ length: 3 }, (_, i) => ({ topic: 'articles', correct: true, at: at(2, i) }))];
  assert.equal(topicMastery(twoDays, now).get('articles').status, 'mastered');
  const weak = Array.from({ length: 5 }, (_, i) => ({ topic: 'present-perfect', correct: i === 0, at: at(1, i) }));
  const m = topicMastery([...twoDays, ...weak], now);
  assert.equal(m.get('present-perfect').status, 'learning');
  assert.deepEqual(weakTopics(m).map((w) => w.topic), ['present-perfect']);
});

test('recurring errors need repetition across days; trends are reported', () => {
  const now = new Date(at(30)).getTime();
  const errs = [
    { error_type: 'article', at: at(10) }, { error_type: 'article', at: at(12) }, { error_type: 'article', at: at(25) }, { error_type: 'article', at: at(26) },
    { error_type: 'third-person-s', at: at(29) }, { error_type: 'third-person-s', at: at(29, 1) }, { error_type: 'third-person-s', at: at(29, 2) },
  ];
  const p = errorProfile(errs, now);
  const art = p.find((e) => e.error_type === 'article');
  const s = p.find((e) => e.error_type === 'third-person-s');
  assert.equal(art.recurring, true);
  assert.equal(s.recurring, false, 'three in one sitting is not yet a recurring pattern');
  assert.equal(s.trend, 'new');
});

test('skill levels come from evidence; placement is a starting point that evidence can move', () => {
  const placement = { level: 'A2', skills: { grammar: { level: 'A2', items: 4 } } };
  const strongB1 = Array.from({ length: 8 }, (_, i) => ({ skill: 'grammar', level: 'B1', correct: i < 7, at: at(i) }));
  assert.equal(skillLevels({ attempts: strongB1, placement }).grammar.level, 'B1');
  const failingA2 = Array.from({ length: 10 }, (_, i) => ({ skill: 'reading', level: 'A2', correct: i < 3, at: at(i) }));
  assert.equal(skillLevels({ attempts: failingA2, placement }).reading.level, 'A1', 'clear failure lowers the estimate');
  const w = skillLevels({ writing: [{ evaluation: { cefr_estimate: 'B1' } }, { evaluation: { cefr_estimate: 'B2' } }, { evaluation: { cefr_estimate: 'B1' } }] });
  assert.equal(w.writing.level, 'B1');
  assert.equal(skillLevels({}).speaking.level, null, 'no evidence, no level');
});

test('next lesson skips completed and placed-out lessons; plans scale with time', () => {
  const curriculum = { levels: [{ id: 'PreA1', lessons: [{ id: 'pa1-01', level: 'PreA1' }, { id: 'pa1-02', level: 'PreA1' }] }, { id: 'A1', lessons: [{ id: 'a1-01', level: 'A1' }] }] };
  assert.equal(nextLesson(curriculum, new Map([['pa1-01', { status: 'completed' }], ['pa1-02', { status: 'placed_out' }]])).id, 'a1-01');
  const p35 = dailyPlan({ minutes: 35, dueCount: 20, warmupCount: 5, todayNewCount: 6, next: { id: 'a1-01' }, recurring: [{ error_type: 'article' }], level: 'A2' });
  assert.deepEqual(p35.blocks.map((b) => b.id), ['warmup', 'review', 'learn', 'practice', 'use', 'exit']);
  assert.equal(p35.blocks.find((b) => b.id === 'practice').route, 'drill?error=article');
  const p10 = dailyPlan({ minutes: 10, dueCount: 3, next: { id: 'a1-01' } });
  assert.deepEqual(p10.blocks.map((b) => b.id), ['review', 'learn']);
  assert.ok(p10.minutes <= 12);
  const fresh = dailyPlan({ minutes: 20, next: { id: 'pa1-01' }, level: 'PreA1' });
  assert.equal(fresh.blocks[0].id, 'learn');
});

test('period report compares with the previous period and counts retention', () => {
  const now = new Date(at(14)).getTime();
  const attempts = [
    ...Array.from({ length: 10 }, (_, i) => ({ topic: 'articles', skill: 'grammar', correct: i < 5, at: at(2, i) })),
    ...Array.from({ length: 10 }, (_, i) => ({ topic: 'articles', skill: 'grammar', source: 'review', correct: i < 9, at: at(10, i) })),
  ];
  const r = periodReport({ attempts, now, days: 7 });
  assert.equal(r.exercises, 10);
  assert.equal(r.retention, 0.9);
  assert.equal(r.accuracy_prev, 0.5);
  assert.deepEqual(r.improved.map((x) => x.topic), ['articles']);
});

// ---- placement with simulated learners ----
const bank = LEVELS.flatMap((level) => Array.from({ length: 12 }, (_, i) => ({ id: `${level}-${i}`, level, skill: ['grammar', 'vocabulary', 'reading', 'listening'][i % 4] })));
function simulate(trueLevel, start, { noise = 0 } = {}) {
  const p = createPlacement(bank, { start });
  let item, n = 0;
  while ((item = p.next())) {
    const knows = trueLevel != null && LEVELS.indexOf(item.level) <= LEVELS.indexOf(trueLevel);
    const flip = Boolean(noise) && n++ % Math.round(1 / noise) === 0;
    p.answer(item, knows !== flip ? { correct: true } : { correct: false, dontKnow: !knows });
  }
  return p.result();
}

test('placement finds the boundary for learners of known ability', () => {
  for (const [trueLevel, start] of [['B1', 'A1'], ['A2', 'B1'], ['C2', 'B2'], ['PreA1', 'A1'], ['C1', 'A1']]) {
    const r = simulate(trueLevel, start);
    assert.equal(r.demonstrated, trueLevel, `${trueLevel} from ${start}`);
    assert.equal(r.start_level, LEVELS[Math.min(6, LEVELS.indexOf(trueLevel) + 1)]);
    assert.ok(r.items <= 28, `${r.items} items`);
  }
  const none = simulate(null, 'A1');
  assert.equal(none.demonstrated, null);
  assert.equal(none.start_level, 'PreA1');
  assert.ok(none.items <= 8, 'a true beginner is not kept in the test');
  assert.equal(zeroResult().start_level, 'PreA1');
});

test('placement tolerates an occasional slip (1 in 8)', () => {
  const r = simulate('B2', 'A1', { noise: 0.125 });
  assert.ok(['B1', 'B2'].includes(r.demonstrated), `got ${r.demonstrated}`);
});
