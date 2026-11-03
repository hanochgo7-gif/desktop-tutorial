import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeFrom, Rating, newCard, review, dueCards, vocabCardsFor, unlockedFormCards, newItemsBudget, retrievability } from '../../js/core/srs.js';
import { topicMastery, weakTopics, errorProfile, skillLevels, nextLesson, dailyPlan, periodReport, minutesToday, lessonSlice, LEVELS } from '../../js/core/adaptive.js';
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
  const answers = [{ skill: 'grammar', level: 'A2', correct: true }, { skill: 'grammar', level: 'A2', correct: true }];
  const placement = { level: 'A2', answers };
  assert.equal(skillLevels({ placement }).grammar.level, 'A2', 'two placement answers at A2 give a first estimate');
  assert.equal(skillLevels({ placement }).grammar.provisional, true);
  const strongB1 = Array.from({ length: 8 }, (_, i) => ({ skill: 'grammar', level: 'B1', correct: i < 7, at: at(i) }));
  assert.equal(skillLevels({ attempts: strongB1, placement }).grammar.level, 'B1');
  const readingA2 = [{ skill: 'reading', level: 'A2', correct: true }, { skill: 'reading', level: 'A2', correct: true }];
  const failingA2 = Array.from({ length: 10 }, (_, i) => ({ skill: 'reading', level: 'A2', correct: i < 3, at: at(i) }));
  const lowered = skillLevels({ attempts: failingA2, placement: { answers: readingA2 } }).reading;
  assert.equal(lowered.level, 'A1', 'clear failure lowers the estimate');
  assert.equal(lowered.notYet, 'A2');
  const w = skillLevels({ writing: [{ exercise: 'a', at: at(0), evaluation: { cefr_estimate: 'B1' } }, { exercise: 'b', at: at(1), evaluation: { cefr_estimate: 'B2' } }, { exercise: 'c', at: at(2), evaluation: { cefr_estimate: 'B1' } }] });
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
    assert.equal(r.start_level, trueLevel, 'the course starts at the confirmed level (R1-Y2)');
    assert.ok(r.items <= 28, `${r.items} items`);
  }
  const none = simulate(null, 'A1');
  assert.equal(none.demonstrated, null);
  assert.equal(none.start_level, 'PreA1');
  assert.ok(none.items <= 8, 'a true beginner is not kept in the test');
  assert.equal(zeroResult().start_level, 'PreA1');
});

test('TF-9: placement says about how many questions are left; the bar stays under 90% until the last block', () => {
  for (const [trueLevel, start, noise] of [['B1', 'A1', 0], ['A2', 'B1', 0], ['C2', 'B2', 0], ['PreA1', 'A1', 0], ['C1', 'A1', 0], [null, 'A1', 0], ['B2', 'A1', 0.125]]) {
    const p = createPlacement(bank, { start });
    const seen = [];
    let item, n = 0;
    while ((item = p.next())) {
      // What the screen shows for this question: its number, and the bar for the answers before it.
      const { asked, estimate } = p.progress;
      seen.push({ q: asked + 1, estimate, bar: asked / estimate });
      const knows = trueLevel != null && LEVELS.indexOf(item.level) <= LEVELS.indexOf(trueLevel);
      const flip = Boolean(noise) && n++ % Math.round(1 / noise) === 0;
      p.answer(item, knows !== flip ? { correct: true } : { correct: false, dontKnow: !knows });
    }
    const total = p.progress.asked;
    for (const s of seen) {
      assert.ok(s.estimate >= s.q, `${trueLevel}: question ${s.q} of about ${s.estimate}`);
      if (s.q <= total - 4) assert.ok(s.bar < 0.9, `${trueLevel}: the bar is at ${Math.round(s.bar * 100)}% at question ${s.q} of ${total}`);
    }
    assert.equal(p.progress.estimate, total, 'at the end the estimate is the real count');
  }
});

test('placement tolerates an occasional slip (1 in 8)', () => {
  const r = simulate('B2', 'A1', { noise: 0.125 });
  assert.ok(['B1', 'B2'].includes(r.demonstrated), `got ${r.demonstrated}`);
});

// ---------- UX r4 today-path ----------
test('TP-2: minutesToday counts a replayed lesson exercise once, and adds reading time for a lesson read today', () => {
  const lessons = new Map([['a2-01', { minutes: 25, exercises: 16, intro: 2 }]]);
  const pace = 25 / 18;
  const once = ['e1', 'e2', 'e3', 'e4'].map((exercise, i) => ({ source: 'lesson', lesson: 'a2-01', exercise, at: at(0, i) }));
  const replay = [...once, ...once.map((a) => ({ ...a, at: at(0, 5) })), { ...once[0], retry: true, at: at(0, 6) }];
  assert.equal(minutesToday({ attempts: once, lessons }), Math.round(4 * pace));
  assert.equal(minutesToday({ attempts: replay, lessons }), Math.round(4 * pace), 'a replay or retry added minutes again');
  // A 'learn' event today (contract (f)) adds the explanation once, however many steps were shown.
  const learn = [1, 2, 3].map((step) => ({ type: 'learn', lesson: 'a2-01', step }));
  assert.equal(minutesToday({ attempts: once, events: learn, lessons }), Math.round(6 * pace));
  // Without the event, a lesson only opened today adds no reading time; begun and completed today still does.
  assert.equal(minutesToday({ attempts: once, whole: ['a2-01'], lessons }), Math.round(6 * pace));
  assert.equal(minutesToday({ attempts: once, events: learn, whole: ['a2-01'], lessons }), Math.round(6 * pace), 'reading counted twice');
});

test('TP-2: a part finished today stays done when the day gets more minutes (held)', () => {
  const lesson = { minutes: 25, exercises: 16, intro: 2, done: 4, doneToday: 4, revisit: 0 };
  const ten = lessonSlice(lesson, 7);
  assert.deepEqual([ten.split, ten.upto, ten.partDone], [true, 4, true]);
  assert.equal(lessonSlice(lesson, 14).partDone, false, 'without a hold, a longer day extends the part');
  const held = lessonSlice({ ...lesson, held: 4 }, 14);
  assert.deepEqual([held.upto, held.partDone, held.done], [4, true, 4]);
  // A hold ahead of the saved place (the run was reset) does not apply.
  assert.equal(lessonSlice({ ...lesson, done: 2, doneToday: 2, held: 4 }, 14).partDone, false);
});

test('TP-8: the period report counts writing sessions (one per text per day), with no level claim', () => {
  const now = new Date(at(6, 1)).getTime();
  const events = [
    { type: 'writing', exercise: 'wa-05', at: at(5, 1) }, { type: 'writing', exercise: 'wa-05', at: at(5, 2) },
    { type: 'writing-final', exercise: 'wa-05', at: at(5, 3) }, { type: 'writing', exercise: 'wa-05', at: at(6) },
    { type: 'writing', exercise: 'we-01', at: at(6) }, { type: 'writing-deleted', exercise: 'we-02', at: at(6) },
    { type: 'writing', exercise: 'old', at: at(-20) },
  ];
  const r = periodReport({ events, now });
  assert.equal(r.writing_sessions, 3);
  assert.equal(periodReport({ events: [], now }).writing_sessions, 0);
});

test('TP-12: the placement bar never grows by more than 10 points on one answer, and never moves back', () => {
  let drops = 0;
  for (const [trueLevel, start, noise] of [['B1', 'A1', 0], ['A2', 'B1', 0], ['C2', 'B2', 0], ['PreA1', 'A1', 0], ['C1', 'A1', 0], [null, 'A1', 0], ['B2', 'A1', 0.125], ['A2', 'A1', 0.2], ['B1', 'C1', 0]]) {
    const p = createPlacement(bank, { start });
    let item, n = 0, prev = p.progress.bar, prevEst = p.progress.estimate;
    assert.equal(prev, 0);
    while ((item = p.next())) {
      const knows = trueLevel != null && LEVELS.indexOf(item.level) <= LEVELS.indexOf(trueLevel);
      const flip = Boolean(noise) && n++ % Math.round(1 / noise) === 0;
      p.answer(item, knows !== flip ? { correct: true } : { correct: false, dontKnow: !knows });
      const { bar, estimate } = p.progress;
      if (estimate < prevEst && !p.done) drops++;
      assert.ok(bar - prev <= 0.1 + 1e-9, `${trueLevel} from ${start}: the bar grew ${Math.round((bar - prev) * 100)} points`);
      assert.ok(bar >= prev, `${trueLevel} from ${start}: the bar moved back`);
      prev = bar; prevEst = estimate;
    }
  }
  assert.ok(drops > 0, 'no run dropped its estimate, so the check proves nothing');
});

test('TP-10: once today\'s travel scenario is done, the extras offer the next travel scenario', () => {
  const sc = (id, module, level = 'A1') => ({ id, module, level });
  const scenarios = [sc('rl-airport-checkin', 'airport'), sc('rl-hotel-checkin', 'hotel'), sc('rl-social-hi', 'social'), sc('rl-airport-b2', 'airport', 'B2')];
  const done = scenarios[0];
  const plan = dailyPlan({
    minutes: 20, level: 'A1', goals: ['travel'], scenarios, scenario: done,
    today: { scenario: done, scenarios: new Set([done.id]) },
  });
  const use = plan.blocks.find((b) => b.id === 'use');
  assert.deepEqual([use.scenario, use.done], [done.id, true]);
  const extra = plan.extras.find((b) => b.id === 'use' && b.scenario);
  assert.ok(extra, 'no scenario among the extras');
  assert.notEqual(extra.scenario, done.id);
  assert.equal(extra.scenario, 'rl-hotel-checkin', 'a travel scenario at the learner\'s level');
  assert.deepEqual([extra.route, extra.done], ['scenario/rl-hotel-checkin', false]);
  // Without the list (older callers) nothing changes.
  assert.ok(!dailyPlan({ minutes: 20, level: 'A1', goals: ['travel'], scenario: done, today: { scenario: done, scenarios: new Set([done.id]) } }).extras.some((b) => b.id === 'use'));
});
