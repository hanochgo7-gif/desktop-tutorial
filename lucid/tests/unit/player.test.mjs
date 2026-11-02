// Lesson player and speaking (persona findings P-02, P-27, P-57: speaking is never graded; P-15: shadowing is
// practice; P-05: the microphone notice; P-06, P-42, P-12: fixed step counter; P-41: redo only the misses;
// P-03, P-39, P-59: short verdicts with "Why?"; P-77: model answers for open rewrites from B1).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let P, X, S, I18N;
const root = new URL('../../', import.meta.url);
const lessonFile = async (id) => JSON.parse(await readFile(new URL(`content/lessons/${id}.json`, root), 'utf8'));

before(async () => {
  globalThis.document = { documentElement: { dataset: {}, lang: 'en', dir: 'ltr' }, visibilityState: 'visible' };
  globalThis.addEventListener = () => {};
  I18N = await import('../../js/core/i18n.js');
  I18N.setUiLang('en');
  I18N.setHebrewSupport('partial');
  P = await import('../../js/views/lesson.js');
  X = await import('../../js/ui/exercise.js');
  S = await import('../../js/core/speech.js');
});

// ---------- the lesson score ----------
test('speaking and writing never count toward the lesson score or its denominator', async () => {
  const lesson = await lessonFile('pa1-01');
  const scored = P.scoredExercises(lesson);
  assert.ok(lesson.exercises.some((e) => e.type === 'speak'), 'fixture has speaking items');
  assert.ok(scored.every((e) => !['speak', 'write'].includes(e.type)));
  const first = new Map(scored.map((e) => [e.id, 1]));
  assert.equal(P.lessonScore(first, lesson), 1, 'all scored items right = 100%, whatever happened on speaking');
  first.set(scored[0].id, 0);
  assert.equal(P.lessonScore(first, lesson), (scored.length - 1) / scored.length);
  assert.equal(P.lessonScore(new Map(), { exercises: [{ id: 'w', type: 'write' }] }), 1, 'nothing to score');
});

test('answer points and the missed list', async () => {
  assert.equal(P.answerPoints({ correct: true }, false), 1);
  assert.equal(P.answerPoints({ correct: true }, true), 0.75);
  assert.equal(P.answerPoints({ correct: true, almost: true }, false), 0.9);
  assert.equal(P.answerPoints({ correct: false, score: 0.8 }, false), 0.5);
  const lesson = { exercises: [{ id: 'a', type: 'mcq' }, { id: 'b', type: 'gap' }, { id: 'c', type: 'speak' }, { id: 'd', type: 'order' }] };
  const first = new Map([['a', 1], ['b', 0.5], ['d', 0.75]]);
  assert.deepEqual(P.missedIds(first, lesson), ['b'], 'wrong first tries only; speaking never');
  assert.deepEqual(P.missedIds(new Map(), lesson), ['a', 'b', 'd'], 'unanswered counts as missed');
});

// ---------- the step counter ----------
test('the first-pass total stays fixed; retries are counted on their own; the bar only moves forward', () => {
  const q = ['a', 'b', 'c', 'd'].map((id) => ({ ex: { id }, retry: false }));
  assert.equal(P.stepLabel(P.stepInfo(q, 0)), '1 of 4');
  q.push({ ex: { id: 'a' }, retry: true });
  const s1 = P.stepInfo(q, 1);
  assert.deepEqual(s1, { retry: false, pos: 2, total: 4, pending: 1 });
  assert.equal(P.stepLabel(s1), '2 of 4 · 1 to revisit');
  q.push({ ex: { id: 'c' }, retry: true });
  assert.equal(P.stepLabel(P.stepInfo(q, 3)), '4 of 4 · 2 to revisit');
  assert.equal(P.stepLabel(P.stepInfo(q, 4)), 'Revisit 1 of 2');
  const pcts = q.map((_, i) => P.stepPct(P.stepInfo(q, i)));
  assert.deepEqual([...pcts].sort((a, b) => a - b), pcts, `not monotonic: ${pcts}`);
  assert.ok(pcts.every((p) => p >= 6 && p <= 100));
});

test('in Hebrew the counter is written in words, so the numbers cannot read backwards', () => {
  I18N.setUiLang('he');
  try {
    const q = [{ ex: { id: 'a' }, retry: false }, { ex: { id: 'b' }, retry: false }, { ex: { id: 'a' }, retry: true }];
    assert.equal(P.stepLabel(P.stepInfo(q, 0)), '1 מתוך 2 · 1 לחזרה');
    assert.equal(P.stepLabel(P.stepInfo(q, 2)), 'חוזרים 1 מתוך 1');
  } finally { I18N.setUiLang('en'); }
});

// ---------- the verdict ----------
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('a speaking result is never a verdict: no "Not quite", no "Correct answer", no score', () => {
  const ex = { id: 'e1', type: 'speak', target: "I'm Maya.", explanation: { en: 'Stress the name.' } };
  for (const r of [{ graded: false, speak: true, self: null, heard: 'i am maya maya' }, { graded: false, speak: true, self: 0 }, { graded: false, speak: true, self: 1 }]) {
    const h = text(X.verdictHtml(ex, r, new Map()));
    assert.doesNotMatch(h, /Not quite|Correct answer/);
    assert.match(h, /not scored/);
  }
});

test('the verdict leads with the result and the right form; the explanation waits behind "Why?"', () => {
  const ex = { id: 'e2', type: 'mcq', explanation: { en: 'Had gone means they had left before she arrived.' } };
  const errors = new Map([['tense', { name_en: 'Tense', name_he: 'זמן', why_he: 'הסבר' }]]);
  const h = String(X.verdictHtml(ex, { correct: false, answer: 'By the time we arrived, the match had started.', error_type: 'tense' }, errors));
  const why = h.indexOf('<details class="why">');
  assert.ok(why > 0, 'no Why? toggle');
  assert.ok(h.indexOf('Correct answer') < why, 'the answer comes first');
  assert.ok(h.indexOf('Had gone means') > why && h.indexOf('Tense') > why, 'explanation and error label are folded');
  assert.match(h, /answer-block/, 'a long answer gets its own line');
  assert.doesNotMatch(String(X.verdictHtml(ex, { correct: false, answer: 'J' }, errors)), /answer-block/, 'a short one stays in the sentence');
});

test('a wrong sort lists only the misplaced items, grouped by where they belong', () => {
  const ex = { id: 'e6', type: 'categorize', categories: ['Capital', 'small'], items: [{ text: 'i', category: 'Capital' }, { text: 'phone', category: 'small' }, { text: 'maya', category: 'Capital' }, { text: 'name', category: 'small' }] };
  const placed = new Map([[0, 'Capital'], [1, 'Capital'], [2, 'small'], [3, 'small']]);
  const fixes = X.categoryFixes(ex, placed);
  assert.deepEqual(fixes, [{ category: 'Capital', items: ['maya'] }, { category: 'small', items: ['phone'] }]);
  const h = String(X.verdictHtml(ex, { correct: false, fixes, summary: '2 of 4 in place' }, new Map()));
  assert.match(text(h), /Not quite · 2 of 4 in place/);
  assert.match(h, /class="fix-list" lang="en" dir="ltr"/);
  assert.doesNotMatch(h, /→/, 'no run-on key with arrows');
  assert.doesNotMatch(text(h), /\bi\b.*Capital.*\bi\b/, 'right items are not repeated');
  assert.deepEqual(X.answerFor(ex).fixes.map((g) => g.items.length), [2, 2], '"I don\'t know" shows every item');
});

test('open rewrites from B1 call the key a model answer and offer "My answer is also correct"', async () => {
  assert.equal(X.isOpenRewrite({ type: 'transform' }, 'A2'), false);
  // R1-E2: a "Find and fix" answer is a full sentence too, so from B1 it is one model answer.
  assert.equal(X.isOpenRewrite({ type: 'correct' }, 'C1'), true, 'find and fix from B1');
  assert.equal(X.isOpenRewrite({ type: 'correct' }, 'A2'), false, 'below B1 a fix has one answer');
  for (const l of ['B1', 'B2', 'C1', 'C2']) assert.equal(X.isOpenRewrite({ type: 'transform' }, l), true, l);
  const lesson = await lessonFile('c1-03');
  const ex = lesson.exercises.find((e) => e.type === 'transform');
  const h = text(X.verdictHtml(ex, { correct: false, model: true, answer: ex.answers[0] }, new Map()));
  assert.match(h, /One model answer/);
  assert.match(h, /My answer is also correct/);
  assert.doesNotMatch(h, /Correct answer|Not quite/);
  assert.match(text(X.selfJudgedHtml({ answer: ex.answers[0] })), /Counted as correct.*your own judgement/);
  const a2 = text(X.verdictHtml(ex, { correct: false, answer: ex.answers[0] }, new Map()));
  assert.match(a2, /Correct answer/, 'below B1 the key stays the answer');
});

// ---------- speech ----------
test('the microphone notice is shown once per browser and says what happens to the voice', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  assert.equal(S.micNoticeSeen(), false);
  const h = text(S.micNoticeHtml());
  assert.match(h, /done by your browser, not by Lucid/);
  assert.match(h, /never records or keeps your voice/);
  assert.match(h, /mark how it went yourself/);
  assert.doesNotMatch(h, /every speaking exercise/, 'the Speaking lab sound drill has no self-rating, so the notice does not promise it everywhere');
  const { LUCID_KEY } = await import('../../js/core/store.js');
  assert.match(S.MIC_NOTICE_KEY, LUCID_KEY, 'the device erase removes the remembered notice');
  mem.set(S.MIC_NOTICE_KEY, '1');
  assert.equal(S.micNoticeSeen(), true);
  assert.equal(await S.micNotice(), true, 'without recognition (Node) there is nothing to ask');
  delete globalThis.localStorage;
});

test('listening fails clearly where recognition is missing, and every error has learner text', async () => {
  await assert.rejects(S.listen(), (e) => e.code === 'unsupported');
  for (const code of ['declined', 'denied', 'no-speech', 'network', 'unsupported', 'aborted']) assert.ok(S.speechErrorText({ code }).length > 10, code);
  assert.match(S.speechErrorText({ code: 'declined' }), /microphone stays off/);
});

// ---------- unscored practice in the learner model ----------
test('an unscored attempt (score null) is stored as null and stays out of mastery, levels and accuracy', async () => {
  const storeMod = await import('../../js/core/store.js');
  await storeMod.openStore();
  const L = await import('../../js/core/learner.js');
  const A = await import('../../js/core/adaptive.js');
  const rec = L.recordAttempt({ source: 'lesson', lesson: 'pa1-01', exercise: 'e11', topic: 'alphabet', skill: 'speaking', level: 'PreA1', correct: false, score: null, response: 'my name is maya maya' });
  assert.equal(rec.score, null);
  assert.equal(rec.error_type, null);
  assert.equal(L.recordAttempt({ correct: true }).score, 1, 'a missing score still defaults to right/wrong');
  const now = Date.parse('2026-10-20T12:00:00Z');
  const day = (d) => new Date(now - d * 86_400_000).toISOString();
  const unscored = Array.from({ length: 10 }, (_, i) => ({ topic: 'alphabet', skill: 'grammar', level: 'A1', source: 'lesson', correct: false, score: null, at: day(i % 3) }));
  assert.equal(A.topicMastery(unscored, now).size, 0);
  assert.equal(A.skillLevels({ attempts: unscored }).grammar.level, null);
  const scored = { topic: 'alphabet', skill: 'grammar', level: 'A1', source: 'lesson', correct: true, score: 1, at: day(0) };
  const r = A.periodReport({ attempts: [...unscored, scored], now });
  assert.equal(r.accuracy, 1, 'accuracy counts scored answers only');
  assert.equal(r.exercises, 11, 'practice still counts as activity');
});

// ---------- persona round 2 ----------
test('R1-E2: a "Find and fix" item from B1 offers "My answer is also correct"; an authored wrong answer never does', async () => {
  const lesson = await lessonFile('c1-03');
  const ex = lesson.exercises.find((e) => e.id === 'e11');
  assert.equal(ex.type, 'correct');
  const h = text(X.verdictHtml(ex, { correct: false, model: true, answer: ex.answers[0] }, new Map()));
  assert.match(h, /One model answer/);
  assert.match(h, /My answer is also correct/);
  assert.doesNotMatch(h, /Correct answer|Not quite/);
});

test('R2-04: "Why?" shows the item\'s own explanation, not the general note of its error type', () => {
  const errors = new Map([['word-choice', { name_en: 'Word choice / collocation', name_he: 'בחירת מילה', why_he: 'יש צירופים קבועים: make a decision, do homework, strong coffee.' }]]);
  const own = { id: 'e3', type: 'gap', explanation: { en: 'For order, use third (3rd), not three.', he: 'לסדר משתמשים ב-third (3rd), לא ב-three.' } };
  const h = String(X.verdictHtml(own, { correct: false, answer: 'third', error_type: 'word-choice' }, errors));
  assert.doesNotMatch(h, /make a decision/, 'the general error-type note is off-topic next to the item\'s own explanation');
  assert.match(h, /For order, use third/);
  assert.match(h, /Word choice/, 'the error type still names the mistake');
  assert.match(h, /<bdi dir="ltr" lang="en">third \(3rd\)<\/bdi>/, 'the Hebrew keeps the bracket pair inside the English');
  const bare = { id: 'e4', type: 'read' };
  assert.match(String(X.verdictHtml(bare, { correct: false, error_type: 'word-choice' }, errors)), /make a decision/, 'with nothing of its own, the general note explains');
  const spec = String(X.verdictHtml({ id: 'e5', type: 'gap' }, { correct: false, error_type: 'word-choice', specific: { en: 'Third, not three.' } }, errors));
  assert.doesNotMatch(spec, /make a decision/, 'specific feedback counts as the item\'s own');
});

test('R2-08: words recognition did not catch are "not caught" (grey), not marked like spelling errors', () => {
  const h = String(X.recognised('my name is maya', 'My name is Maya. M-A-Y-A.'));
  assert.doesNotMatch(h, /w-miss|marked in red/);
  assert.match(h, /class="w-uncaught"/);
  assert.match(text(h), /not caught/);
  assert.match(text(h), /spelled letters/, 'a target that spells letters says recognition rarely shows them');
  assert.doesNotMatch(text(X.recognised('I live in Haifa', 'I live in Haifa.')), /not caught|spelled letters/, 'nothing missing, no key');
  assert.equal(X.spellsLetters('K-O-H-E-N'), true);
  assert.equal(X.spellsLetters('Have a nice day.'), false);
});

test('R2-19 and R1-A10: the pronunciation note shows its Hebrew unless support is off, and folds at large text', () => {
  const focus = { en: 'In the question, have is weak and quick: /həv/.', he: 'בשאלה, have חלש ומהיר: /həv/.' };
  for (const level of ['full', 'partial', 'minimal']) {
    I18N.setHebrewSupport(level);
    const h = String(X.speakFocus(focus));
    assert.match(h, /class="bi-he[^"]*" lang="he" dir="rtl">/, level);
    assert.doesNotMatch(h, /dir="rtl" hidden/, `Hebrew hidden at ${level}`);
  }
  I18N.setHebrewSupport('off');
  assert.match(String(X.speakFocus(focus)), /data-reveal-he/, 'off: Hebrew one tap away');
  I18N.setHebrewSupport('partial');
  assert.doesNotMatch(String(X.speakFocus(focus)), /<details/, 'open at normal text size');
  document.documentElement.dataset.text = '150';
  try {
    assert.match(String(X.speakFocus(focus)), /<details class="speak-focus-fold[^>]*><summary>.*Pronunciation tip/);
  } finally { delete document.documentElement.dataset.text; }
});

test('R2-26: a score under the pass mark is rounded down and never reads as the mark', () => {
  assert.equal(P.isPass(0.696, 0.7), false);
  assert.equal(P.scorePercent(0.696, false), 69, '0.696 would round to 70% next to "70% completes"');
  assert.equal(P.scorePercent(0.69, false), 69, 'no float drift (0.69 * 100 = 68.99…)');
  assert.equal(P.scorePercent(0.996, true), 100);
  assert.equal(P.isPass((0.9 + 0.9 + 0.9 + 0.75 + 1 + 0.15) / 6.571428571428571, 0.7), true, 'a sum that is 70% up to rounding passes');
  assert.deepEqual(P.partialCredit(new Map([['a', 1], ['b', 0.75]])), { hint: true, slip: false });
  assert.deepEqual(P.partialCredit(new Map([['a', 0.9]])), { hint: false, slip: true });
  assert.equal(P.missedMinutes({ minutes: 25, exercises: new Array(16) }, 4), 6, '4 of 16 exercises in a 25-minute lesson');
});

test('R2-28: today\'s part ends once, on the first pass, when exercises are left after it', () => {
  const q = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ ex: { id }, retry: false }));
  q.push({ ex: { id: 'b' }, retry: true });
  const part = { upto: 3, shown: false, done: false };
  assert.equal(P.firstDone(q, 3), 3);
  assert.equal(P.partEnds(part, q, 2, q[1]), false, 'not yet');
  assert.equal(P.partEnds(part, q, 3, q[2]), true, 'after the third exercise');
  assert.equal(P.partEnds({ ...part, shown: true }, q, 3, q[2]), false, 'only once');
  assert.equal(P.partEnds({ ...part, done: true }, q, 3, q[2]), false, 'a part already done today');
  assert.equal(P.partEnds({ ...part, upto: 5 }, q, 5, q[4]), false, 'a part that is the whole first pass has no stop');
  assert.equal(P.partEnds(null, q, 3, q[2]), false, 'no plan, no part');
  const withRetry = [q[0], { ex: { id: 'a' }, retry: true }, q[1], q[2], q[3]];
  assert.equal(P.partEnds({ upto: 2 }, withRetry, 2, withRetry[1]), false, 'a retry never ends the part');
});
