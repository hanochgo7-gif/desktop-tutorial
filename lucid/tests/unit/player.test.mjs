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
  assert.equal(P.stepLabel(s1), '2 of 4', 'LF-7: no running tally of mistakes in the first pass');
  q.push({ ex: { id: 'c' }, retry: true });
  assert.equal(P.stepLabel(P.stepInfo(q, 3)), '4 of 4');
  assert.equal(P.stepLabel(P.stepInfo(q, 4)), 'Revisit 1 of 2');
  const pcts = q.map((_, i) => P.stepPct(P.stepInfo(q, i)));
  assert.deepEqual([...pcts].sort((a, b) => a - b), pcts, `not monotonic: ${pcts}`);
  assert.ok(pcts.every((p) => p >= 6 && p <= 100));
});

test('in Hebrew the counter is written in words, so the numbers cannot read backwards', () => {
  I18N.setUiLang('he');
  try {
    const q = [{ ex: { id: 'a' }, retry: false }, { ex: { id: 'b' }, retry: false }, { ex: { id: 'a' }, retry: true }];
    assert.equal(P.stepLabel(P.stepInfo(q, 0)), '1 מתוך 2', 'no "לחזרה" (word review) in the first pass');
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
  assert.match(h, /<bdi dir="ltr" lang="en"(?: class="nw")?>third \(3rd\)<\/bdi>/, 'the Hebrew keeps the bracket pair inside the English');
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

// ---------- UX round 3, lane lesson-flow ----------
test('LF-4: the end title says what is true; the missed minutes match Today', async () => {
  assert.equal(P.reviewTitle(0.08), 'open', '8% is not "nearly there"');
  assert.equal(P.reviewTitle(0.49), 'open');
  assert.equal(P.reviewTitle(0.5), 'nearly');
  assert.equal(P.reviewTitle(0.69), 'nearly');
  assert.equal(P.reviewTitle(0.7), 'complete');
  assert.equal(P.reviewTitle(0.75, 0.8), 'nearly', 'the lesson\'s own pass mark');
  const lesson = await lessonFile('a2-01');
  const A = await import('../../js/core/adaptive.js');
  const perItem = lesson.minutes / (lesson.exercises.length + A.introSlots(lesson));
  for (const n of [1, 3, 6, 14]) assert.equal(P.missedMinutes(lesson, n), Math.max(1, Math.round(n * perItem)), `Today's formula for ${n}`);
});

test('LF-9: a reading text or a sort is scored per question; under 80% it is missed', async () => {
  const Pool = await import('../../js/core/pool.js');
  assert.equal(P.answerPoints({ correct: false, score: 5 / 6 }, false, 'read'), 5 / 6);
  assert.equal(P.answerPoints({ correct: false, score: 0.8 }, false, 'categorize'), 0.8);
  assert.equal(P.answerPoints({ correct: false, score: 0.8 }, false, 'gap'), 0.5, 'other types still cap a wrong answer at 0.5');
  assert.equal(P.answerPoints({ correct: true }, false, 'read'), 1);
  const lesson = { exercises: [{ id: 'r1', type: 'read' }, { id: 'r2', type: 'read' }, { id: 'c', type: 'categorize' }, { id: 'm', type: 'mcq' }] };
  const first = new Map([['r1', 5 / 6], ['r2', 0.67], ['c', 0.8], ['m', 0.5]]);
  assert.deepEqual(P.missedIds(first, lesson), ['r2', 'm']);
  assert.equal(Pool.isMissed(0.79, 'read'), true);
  assert.equal(Pool.isMissed(0.75, 'mcq'), false, 'a right answer after a hint is not missed');
});

test('LF-2: the explanation is grouped, paginated by height, and the first pitfall stays in step 1', async () => {
  const lesson = await lessonFile('b1-02');
  const groups = P.learnPlan(lesson, 'minimal');
  assert.deepEqual(groups.map((g) => g.id), ['core', 'examples', 'notes', 'words']);
  assert.ok(groups[0].units.some((u) => u.kind === 'pit'), 'grammar pitfalls sit with the explanation');
  assert.ok(groups[0].units.every((u) => u.kind === 'pit' || ['p', 'rule', 'table'].includes(lesson.explanation[u.i].type)));
  assert.ok(groups[2].units.every((u) => ['warning', 'tip'].includes(lesson.explanation[u.i].type)));
  assert.equal(P.learnPlan(lesson, 'off')[0].units.filter((u) => u.kind === 'pit').length, 0, 'no pitfalls at support "off"');
  // Every unit 500 px: no step passes the budget, nothing is lost, and step 1 holds a pitfall.
  const pages = P.paginate(groups, () => 500, 1450);
  const total = groups.reduce((a, g) => a + g.units.length, 0);
  assert.equal(pages.reduce((a, p) => a + p.items.length, 0), total);
  for (const p of pages) {
    const h = p.items.reduce((a, x, j) => a + 500 + (x.first || j === 0 ? P.HEAD : 0), 0);
    assert.ok(p.items.length === 1 || h <= 1450, `a step of ${h}px`);
  }
  assert.ok(pages[0].items.some((x) => x.u.kind === 'pit'), 'the first pitfall is in step 1');
  // A lesson with only pronunciation pitfalls keeps them in the core group.
  const pa = await lessonFile('pa1-02');
  const sound = P.learnPlan({ ...pa, hebrew_pitfalls: pa.hebrew_pitfalls.filter((x) => /^pron-/.test(x.error_type)) }, 'full');
  assert.ok(sound[0].units.some((u) => u.kind === 'pit'));
  assert.ok(P.readingMinutes(lesson, 'minimal') >= 3, 'a B1 explanation is several minutes of reading');
});

test('LF-2: a table taller than a step splits into runs of rows; a tiny last step joins the one before', () => {
  const lesson = { explanation: [{ type: 'table', headers: ['A', 'B', 'C'], rows: Array.from({ length: 10 }, (_, i) => [`a${i}`, `b${i}`, `c${i}`]) }, { type: 'p', en: 'x' }] };
  const groups = [{ id: 'core', units: [{ kind: 'block', i: 0 }, { kind: 'block', i: 1 }] }];
  const split = P.splitTall(groups, lesson, (u) => (u.i === 0 ? 3000 : 100), 1275);
  const rows = split[0].units.filter((u) => u.i === 0).map((u) => u.rows);
  assert.ok(rows.length >= 3 && rows[0][0] === 0 && rows.at(-1)[1] === 10, JSON.stringify(rows));
  assert.ok(rows.every((r, k) => !k || r[0] === rows[k - 1][1]), 'the runs follow each other with no row lost');
  assert.equal(P.splitTall(groups, lesson, () => 500, 1275)[0].units.length, 2, 'a table that fits is left whole');
  const g2 = [{ id: 'words', units: Array.from({ length: 13 }, (_, i) => ({ kind: 'word', i })) }];
  const pages = P.paginate(g2, () => 120, 1500);
  assert.equal(pages.length, 1, `13 words of 120 px make one step, not a step with one word left: ${pages.map((p) => p.items.length)}`);
});

test('LF-2: a pitfall plays the English it is about, never a starred or "not" wrong form', () => {
  const pron = { error_type: 'pron-vowel', en: 'Keep live short and make eat long.', he: 'בעברית יש תנועה אחת. לכן live ו-leave, או it ו-eat, עלולות להישמע אותו דבר. ב-live /lɪv/ התנועה קצרה.' };
  assert.deepEqual(P.pitfallSayables(pron), ['live', 'leave', 'it', 'eat']);
  const grammar = { error_type: 'tense-choice', en: "In Hebrew it is easy to write *I live here for three years. English uses the present perfect: I've lived here for three years.", he: "קל לכתוב I live here for three years. באנגלית: I've lived here for three years." };
  assert.deepEqual(P.pitfallSayables(grammar), ["I've lived here for three years."]);
  const not = { error_type: 'copula-omission', en: "Hebrew has no 'is' here: She is cooking, not 'She cooking'.", he: 'אומרים She is cooking, ולא She cooking.' };
  assert.deepEqual(P.pitfallSayables(not), ['She is cooking.']);
  const wrongSound = { error_type: 'pron-th', en: 'th', he: 'אומרים thought, ולא tought.' };
  assert.deepEqual(P.pitfallSayables(wrongSound), ['thought'], 'a word after "לא" is the wrong sound');
});

test('LF-3: English tables read left to right with Hebrew last; letter rows play; IPA waits at Pre-A1', async () => {
  const a1 = (await lessonFile('a1-01')).explanation.find((b) => b.type === 'table');
  const s = P.tableShape(a1, 'A1');
  assert.equal(s.english, true);
  assert.deepEqual(s.order.map((c) => a1.headers[c.i]), ['Who?', 'Verb', 'The rest', 'עברית']);
  assert.equal(s.stack, true, 'four columns become cards on phones');
  const abc = (await lessonFile('pa1-01')).explanation.find((b) => b.type === 'table');
  const t = P.tableShape(abc, 'PreA1');
  assert.ok(t.letters && t.alphabet && t.hideIpa);
  assert.equal(t.stack, false, 'letter and Hebrew fit as a table once IPA is hidden');
  assert.equal(P.tableShape(abc, 'A1').hideIpa, false, 'IPA shows above Pre-A1');
  const out = String(P.renderBlocks([abc], { level: 'PreA1' }));
  assert.match(out, /data-ipa-toggle/);
  assert.match(out, /<td class="c-he" data-label="נשמע כמו" lang="he" dir="rtl">/);
});

test('LF-8: a mistake note quotes what the learner wrote next to the right form, with the item\'s own note', async () => {
  const a1 = await lessonFile('a1-01');
  const e4 = a1.exercises.find((e) => e.id === 'e4');
  const m = P.mistakeNote(e4, 'are go');
  assert.deepEqual(m.pair, ['We are go', 'We go']);
  assert.match(m.note.en, /Don't add are/);
  const b1 = await lessonFile('b1-02');
  const gap = b1.exercises.find((e) => e.id === 'e7');
  const g = P.mistakeNote(gap, 'yet | for | since');
  assert.ok(g.pair[0].includes('every day for then') && g.pair[1].includes('every day since then'), JSON.stringify(g.pair));
  assert.ok(g.note && !/depends/.test(g.note.en), 'the item\'s own feedback, not the general preposition note');
  assert.equal(P.mistakeNote(e4, '(I don\'t know)').pair, null, '"I don\'t know" is not quoted as an answer');
  assert.equal(P.fillGaps('I ___ in Haifa.', ['lives']), 'I lives');
  assert.equal(P.fillGaps('___ you like tea?', ['Do']), 'Do you like tea?');
});

test('LF-11: leaving goes back to where the learner came from, Today otherwise', async () => {
  const { exitTarget } = await import('../../js/ui/player.js');
  assert.equal(exitTarget('#/path/A2'), '#/path/A2');
  assert.equal(exitTarget('#/progress', '#/path/B2'), '#/progress');
  assert.equal(exitTarget(null), '#/today', 'a link opened directly');
  assert.equal(exitTarget('#/lesson/a2-01?stage=missed'), '#/today', 'never back into another player');
  assert.equal(exitTarget('#/start'), '#/today', 'never back into onboarding');
  assert.equal(exitTarget('', '#/path/B2'), '#/path/B2');
});

// ---------- UX round 4 (docs/qa/panels-r3-retest/plan-r4.json, lane lesson-flow) ----------
test('r4 LF-2: retrySafe drops a note part that quotes the answer or names a word the learner has not written', async () => {
  const Pool = await import('../../js/core/pool.js');
  const a1 = await lessonFile('a1-01');
  const e10 = a1.exercises.find((e) => e.id === 'e10');
  const said = 'We are eating lunch at one every day.';
  assert.equal(Pool.retrySafe(e10.wrong_feedback[0].feedback, e10, said), null, 'both parts give "we eat" away');
  assert.deepEqual(Pool.retrySafe(e10.hint, e10, said), e10.hint, 'the hint "One word is extra" is safe');
  const a2 = await lessonFile('a2-05');
  const e8 = a2.exercises.find((e) => e.id === 'e8');
  assert.equal(Pool.retrySafe(e8.wrong_feedback[0].feedback, e8, 'leaved | came | slept'), null, '"leave → left" names the missing word');
  assert.ok(Pool.retrySafe(e8.hint, e8, 'leaved | came | slept'), 'the hint names no missing word');
  // A word the learner already wrote may be named; a part with no English at all is always safe.
  assert.deepEqual(Pool.retrySafe({ he: 'שימו לב לסוף של came.' }, e8, 'leaved | came | slept'), { he: 'שימו לב לסוף של came.' });
  assert.deepEqual(Pool.retrySafe({ he: 'אות אחת עוד לא נכונה.', en: 'One letter is not right: left.' }, e8, 'leaved | came | slept'), { he: 'אות אחת עוד לא נכונה.' }, 'each language part is judged on its own');
  const b1 = await lessonFile('b1-02');
  const e11 = b1.exercises.find((e) => e.id === 'e11');
  assert.equal(Pool.retrySafe('The verb form the task asks for is missing: have lived.', e11, 'I did lived in Tel Aviv since 2020.'), null, 'a plain string is an English note');
  assert.equal(Pool.retrySafe(null, e11, 'x'), null);
  const gap = a1.exercises.find((e) => e.id === 'e7');
  assert.deepEqual(Pool.answerGaps(gap, 'all | on').lacking.sort(), ['each', 'every'], 'every accepted form of a wrong gap, none of a right one');
});

test('r4 LF-2: the second-try note is in the support language only, and falls back to the hint and then the kind of mistake', async () => {
  const a1 = await lessonFile('a1-01');
  const e10 = a1.exercises.find((e) => e.id === 'e10');
  I18N.setUiLang('he');
  I18N.setHebrewSupport('full');
  try {
    const r = { response: 'We are eating lunch at one every day.', specific: e10.wrong_feedback[0].feedback };
    const n = String(P.secondTryNote(r, e10));
    assert.match(n, /יש מילה אחת מיותרת/);
    assert.doesNotMatch(n, /One word is extra|lang="en"/);
    const noHint = { ...e10, hint: null };
    assert.match(String(P.secondTryNote(r, noHint, { name_he: 'צורת הפועל', name_en: 'Verb form' })), /צורת הפועל/);
    I18N.setHebrewSupport('off');
    assert.match(String(P.secondTryNote(r, e10)), /One word is extra/);
  } finally { I18N.setUiLang('en'); I18N.setHebrewSupport('partial'); }
});

test('r4 LF-4: mistakeNote explains this mistake, shows only what changed, and keeps the two-argument call', async () => {
  const b1 = await lessonFile('b1-01');
  const e11 = b1.exercises.find((e) => e.id === 'e11');
  const went = P.mistakeNote(e11, 'Have you ever went to Eilat?');
  assert.equal(went.note, null, 'a word-order rule is not the note for a wrong verb');
  assert.ok(went.pair && went.diff, 'the two-argument call (checkpoint.js) still gives the pair');
  const order = P.mistakeNote(e11, 'You have ever been in Eilat?');
  assert.deepEqual(order.note, e11.explanation, 'a sentence still in the wrong order gets the word-order rule');
  assert.deepEqual(P.mistakeNote(e11, 'Have you ever went to Eilat?', { error_type: 'word-order' }).note, e11.explanation, 'the attempt\'s own error type decides when it has one');
  // A gap mistake: only the changed word with up to three words around it.
  const a2 = await lessonFile('a2-05');
  const e8 = a2.exercises.find((e) => e.id === 'e8');
  const g = P.mistakeNote(e8, 'leaved | came | slept');
  const words = g.diff.filter((p) => p.type !== 'gap').flatMap((p) => p.text.split(' '));
  assert.ok(words.length <= 8, `diff words: ${JSON.stringify(g.diff)}`);
  assert.deepEqual(g.diff.filter((p) => p.type !== 'same' && p.type !== 'gap').map((p) => [p.type, p.text]), [['del', 'leaved'], ['add', 'left']]);
  assert.match(g.note.en, /leave → left/, 'the matched wrong answer\'s feedback comes first');
  // A choice is a choice, not a correction.
  const b2 = await lessonFile('b2-09');
  const mc = P.mistakeNote(b2.exercises.find((e) => e.id === 'e2'), b2.exercises.find((e) => e.id === 'e2').options[0]);
  assert.ok(mc.choice && !mc.diff && mc.pair.length === 2);
  assert.deepEqual(P.clipDiff([{ type: 'same', text: 'a b c d e f g' }, { type: 'del', text: 'x' }, { type: 'add', text: 'y' }, { type: 'same', text: 'h i j k l' }]).map((p) => p.text), ['…', 'e f g', 'x', 'y', 'h i j', '…']);
  assert.deepEqual(P.clipDiff([{ type: 'same', text: 'all the same' }]), []);
  assert.equal(P.sameOrder('Have you ever went to Eilat?', 'Have you ever been to Eilat?'), true);
  assert.equal(P.sameOrder('You have ever been to Eilat?', 'Have you ever been to Eilat?'), false);
});

test('r4 LF-5: an item answered when nothing could be heard leaves the score\'s denominator and the missed list', () => {
  const lesson = { exercises: [{ id: 'a', type: 'listen' }, { id: 'b', type: 'mcq' }, { id: 'c', type: 'gap' }, { id: 'd', type: 'speak' }] };
  const first = new Map([['b', 1], ['c', 0]]);
  assert.equal(P.lessonScore(first, lesson), 1 / 3, 'without the flag a missing first try counts as 0');
  assert.equal(P.lessonScore(first, lesson, new Set(['a'])), 1 / 2);
  assert.deepEqual(P.missedIds(first, lesson), ['a', 'c']);
  assert.deepEqual(P.missedIds(first, lesson, new Set(['a'])), ['c']);
  assert.equal(P.lessonScore(new Map(), { exercises: [{ id: 'a', type: 'listen' }] }, new Set(['a'])), 1, 'nothing left to score');
});

test('r4 LF-11: a level-check miss shows its question, a gap text with the learner\'s own words', async () => {
  const { questionOf } = await import('../../js/views/checkpoint.js');
  assert.equal(questionOf({ type: 'mcq', question: 'Does Noa have a car?' }), 'Does Noa have a car?');
  assert.equal(questionOf({ type: 'mcq', question: 'Have you ever ___ sushi?' }), 'Have you ever ___ sushi?', 'the whole question, not a clip');
  assert.equal(questionOf({ type: 'gap', text: 'I ___ here ___ 2020.' }, 'live | for'), 'I live here for 2020.');
  assert.equal(questionOf({ type: 'gap', text: 'I ___ here.' }, '(I don\'t know)'), 'I ___ here.');
  assert.equal(questionOf({ type: 'correct', sentence: 'She go home.' }), 'She go home.');
  assert.equal(questionOf({ type: 'transform', source: 'אני גר כאן.' }), 'אני גר כאן.');
  assert.equal(questionOf({ type: 'dictation' }), null);
});

test('r4 LF-1: the end screen counts the words that entered review today from this lesson only', async () => {
  const day = '2026-11-03';
  const card = (lesson, at, extra = {}) => ({ kind: 'meaning', ref: { lesson }, created_at: at, ...extra });
  const cards = [card('a1-01', `${day}T09:00:00`), card('a1-01', `${day}T09:00:01`), card('a1-01', '2026-11-04T09:00:00'), card('a1-02', `${day}T09:00:00`), card('a1-01', `${day}T10:00:00`, { _deleted: true }), card('a1-01', `${day}T10:00:00`, { kind: 'form' })];
  assert.equal(P.wordsAddedToday(cards, 'a1-01', day), 2, 'queued for tomorrow, other lessons, deleted and form cards are left out');
});
