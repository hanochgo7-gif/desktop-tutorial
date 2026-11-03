import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { normalize, variants, checkTyped, findWrongFeedback, wordAccuracy, countWords, checkOrder, levenshtein, couldBeRight, sameAsSource, didPlusPast, keepsVerbForm, usSpelling, letterCode, oneSlip, verbStructure, agreementSlip, isVerbForm } from '../../js/core/grading.js';

test('normalisation ignores case, spacing, final punctuation and apostrophe style', () => {
  assert.equal(normalize('  She’s   a TEACHER. '), "she's a teacher");
  assert.equal(normalize('“Hello,” he said !'), 'hello," he said');
});

test('contractions are equivalent to full forms, with both readings of ’s and ’d', () => {
  assert.ok(checkTyped("I'm Dana.", ['I am Dana.']).correct);
  assert.ok(checkTyped('She does not work', ["She doesn't work."]).correct);
  assert.ok(checkTyped("He's gone home", ['He has gone home.']).correct, "he's = he has");
  assert.ok(checkTyped("He's tired", ['He is tired.']).correct, "he's = he is");
  assert.ok(checkTyped("I'd known", ['I had known']).correct);
  assert.ok(checkTyped("We can't go", ['We cannot go.']).correct);
  assert.ok(checkTyped("They won't come", ['They will not come.']).correct);
  assert.ok(!checkTyped("John's car", ['John is car']).correct, 'possessive noun is not expanded');
  assert.ok(variants("it's what's left").length >= 2);
});

test('typo tolerance accepts one slip in a long word, never a different short word', () => {
  const r = checkTyped('She is a teachr.', ['She is a teacher.']);
  assert.ok(r.correct && r.almost);
  assert.deepEqual(r.typo, { typed: 'teachr', expected: 'teacher' });
  assert.ok(checkTyped('recieve', ['receive']).almost, 'transposition');
  assert.ok(!checkTyped('is', ['it']).correct, 'short words must be exact');
  assert.ok(!checkTyped('goed', ['went']).correct);
  assert.ok(!checkTyped('She is a teacher', ['She is a doctor']).correct);
  assert.ok(!checkTyped('', ['x']).correct);
});

test('authored feedback is found for known wrong answers', () => {
  const fb = [{ match: 'goed', feedback: { en: 'Irregular: went' } }, { match: 'is', feedback: { en: 'With I use am' } }];
  assert.equal(findWrongFeedback('I goed home', fb).feedback.en, 'Irregular: went');
  assert.equal(findWrongFeedback('is', fb).feedback.en, 'With I use am');
  assert.equal(findWrongFeedback('are', fb), null);
});

test('word accuracy aligns dictation and speech to the target', () => {
  const r = wordAccuracy('i am student and happy', "I'm a student and I'm happy.");
  assert.ok(r.accuracy > 0.5 && r.accuracy < 1);
  assert.equal(wordAccuracy('We are tired', "We're tired.").accuracy, 1);
  const missing = wordAccuracy('the cat sat', 'The cat sat on the mat');
  assert.deepEqual(missing.words.map((w) => w.ok), [true, true, true, false, false, false]);
});

test('word count and order checks', () => {
  assert.equal(countWords("I'm Dana, and it's 7 o'clock."), 6);
  assert.equal(countWords('state-of-the-art   ideas'), 2);
  assert.ok(checkOrder(['My', 'brother', 'is', 'a', 'doctor'], ['My', 'brother', 'is', 'a', 'doctor']).correct);
  assert.ok(checkOrder(['Usually', 'I', 'walk'], ['I', 'usually', 'walk'], ['Usually I walk.']).correct);
  assert.ok(!checkOrder(['brother', 'My', 'is', 'a', 'doctor'], ['My', 'brother', 'is', 'a', 'doctor']).correct);
  assert.equal(levenshtein('kitten', 'sitting'), 3);
});

test('an authored wrong answer is never accepted as a one-letter typo of the key', () => {
  const known = [{ match: 'fourty', feedback: { en: 'Forty has no u.', he: 'ב-forty אין u.' } }];
  assert.equal(checkTyped('fourty', ['forty']).almost, true); // without the list, typo tolerance applies
  const r = checkTyped('fourty', ['forty'], known);
  assert.equal(r.correct, false);
  assert.ok(findWrongFeedback('fourty', known));
  assert.equal(checkTyped('forty', ['forty'], known).correct, true);
  assert.equal(checkTyped('fortty', ['forty'], known).almost, true); // other slips still count as typos
});

test('slips inside inflectional endings are errors, not typos; other slips still count as typos', () => {
  for (const [typed, key] of [['She want coffee', 'She wants coffee'], ['I am swiming', 'I am swimming'], ['He studyed', 'He studied'], ['They chated', 'They chatted'], ['She tryed', 'She tried']]) {
    assert.equal(checkTyped(typed, [key]).correct, false, `${typed} should be wrong`);
  }
  for (const [typed, key] of [['I recieved it', 'I received it'], ['She is beautifull', 'She is beautiful'], ['the adress', 'the address']]) {
    const r = checkTyped(typed, [key]);
    assert.ok(r.correct && r.almost, `${typed} should be accepted with a spelling note`);
  }
});

test('word accuracy shows the target in its own spelling, contractions included (P-15)', () => {
  const r = wordAccuracy('i am a student', "I'm a student.");
  assert.deepEqual(r.words.map((w) => w.word), ["I'm", 'a', 'student.']);
  assert.equal(r.accuracy, 1);
  const part = wordAccuracy('i a student', "I'm a student.");
  assert.deepEqual(part.words.map((w) => w.ok), [false, true, true], "half of I'm is not I'm");
  assert.deepEqual(wordAccuracy('sorry how do you spell it', 'Sorry, how do you spell that?').words.map((w) => w.ok), [true, true, true, true, true, false]);
});

// ---------- UX round 3 (exercises lane) ----------
test('EX-5: an open rewrite is offered for self-credit only when it could be right', () => {
  const q = { source: 'You have ever been to Eilat?', answers: ['Have you ever been to Eilat?'] };
  assert.deepEqual(couldBeRight('You have ever been to Eilat? x', q), { ok: false, reason: 'unchanged' }, 'the source plus a stray letter');
  assert.equal(couldBeRight('You have ever been to Eilat?', q).reason, 'unchanged');
  assert.equal(couldBeRight('Have you been to Eilat before?', q).ok, true, 'a real paraphrase is still offered');
  const p = { source: 'I live in Tel Aviv since 2020.', answers: ['I have lived in Tel Aviv since 2020.', 'I have been living in Tel Aviv since 2020.'] };
  assert.equal(couldBeRight('I did lived in Tel Aviv since 2020.', p).reason, 'did-past');
  assert.equal(couldBeRight('I lives in Tel Aviv since 2020.', p).reason, 'verb', 'the verb form of the key is missing');
  assert.equal(couldBeRight("I've lived here in Tel Aviv since 2020.", p).ok, true);
  assert.equal(couldBeRight('Tel Aviv is a nice city with good food.', p).reason, 'overlap', 'too few of the key\'s words');
  const known = [{ match: 'I am living in Tel Aviv since 2020.', feedback: { en: 'Present perfect.' } }];
  assert.equal(couldBeRight('I am living in Tel Aviv since 2020.', { ...p, wrong_feedback: known }).reason, 'known');
});

test('EX-5: the cheap checks behind self-credit', () => {
  assert.ok(didPlusPast('Did you saw the news?'));
  assert.ok(didPlusPast("She didn't liked it."));
  assert.ok(!didPlusPast('Did you need help?'), 'need ends in -ed but is a base form');
  assert.ok(!didPlusPast('I did my homework yesterday.'));
  // A fix that is only punctuation: the marks count as words.
  const s = 'The bus was late, however we still arrived on time.';
  const keys = ['The bus was late. However, we still arrived on time.'];
  assert.ok(sameAsSource(`${s} zz`, s, keys));
  assert.ok(!sameAsSource('The bus was late; however, we still arrived on time.', s, keys));
  // A fix that only adds a word: adding a real word is a change.
  assert.ok(!sameAsSource('She said to me that she was busy.', 'She said me that she was busy.', ['She told me that she was busy.']));
  // Removing hedges changes the verb forms even when no new verb comes in.
  const h = 'It could perhaps be suggested that the timetable might possibly have contributed to the fall.';
  assert.ok(keepsVerbForm('The timetable might have contributed to the fall.', h, ['The timetable may have contributed to the fall.']));
  assert.ok(keepsVerbForm('Any translation at all.', 'אף פעם לא אכלתי סושי.', ['I have never eaten sushi.']), 'no verb rule for a translation from Hebrew');
});

test('EX-7: two slips in a word of 6+ letters are "almost"; shorter words and endings stay strict', () => {
  const r = checkTyped('dubble', 'double');
  assert.ok(r.correct && r.almost);
  assert.deepEqual(r.typo, { typed: 'dubble', expected: 'double' });
  assert.ok(checkTyped('She is beutifull', ['She is beautiful']).almost, 'two slips in a long word');
  assert.ok(!checkTyped('haase', ['house']).correct, 'a 5-letter word forgives one slip only');
  assert.ok(!checkTyped('allwayss', ['always']).correct, 'two extra letters are not a slip');
  assert.ok(!checkTyped('teh cat', ['the cat']).correct);
  assert.ok(!checkTyped('I am swiming', ['I am swimming']).correct, 'still no forgiveness inside an ending');
});

test('EX-7: US and UK spellings are both right', () => {
  assert.equal(checkTyped('My mom teaches English at a high school.', ['My mum teaches English at a high school.']).correct, true);
  assert.equal(checkTyped('My mom teaches English at a high school.', ['My mum teaches English at a high school.']).almost, false, 'not a slip: correct');
  for (const [us, uk] of [['my favorite color', 'my favourite colour'], ['the city center', 'the city centre'], ['a gray coat', 'a grey coat'], ['a TV program', 'a TV programme'], ['I realized', 'I realised'], ['the organization', 'the organisation'], ['we analyzed it', 'we analysed it'], ['they traveled', 'they travelled'], ['the theater', 'the theatre']]) {
    assert.ok(checkTyped(us, [uk]).correct && checkTyped(uk, [us]).correct, `${us} / ${uk}`);
  }
  for (const w of ['promise', 'exercise', 'surprised', 'your', 'hours', 'four', 'pouring', 'tour', 'rise', 'advertising']) assert.equal(usSpelling(w), w, w);
});

test('EX-7: a letter code is compared letter by letter; one slip in a dictation word is "almost"', () => {
  const c = letterCode('BVGE', 'B V J E');
  assert.deepEqual(c.words.map((w) => w.ok), [true, true, false, true], 'only the J is marked');
  assert.deepEqual(c.misses, [{ typed: 'G', expected: 'J' }]);
  assert.deepEqual(letterCode('B V E', 'B, V, J, E').misses, [{ typed: null, expected: 'J' }], 'a missing letter does not shift the rest');
  assert.equal(letterCode('anything', 'Get on the bus at ten.'), null, 'not a letter code');
  assert.deepEqual(oneSlip('Get on the bus at tenn.', ['Get on the bus at ten.']), { typed: 'tenn', expected: 'ten' });
  assert.equal(oneSlip('Get on a bus at tenn.', ['Get on the bus at ten.']), null, 'two words differ');
  const w = wordAccuracy('We go to the gym on Mondays and thursday.', 'We go to the gym on Mondays and Thursdays.').words.at(-1);
  assert.deepEqual(w, { word: 'Thursdays.', ok: true, typed: 'thursday' }, 'a word found with a slip carries what was typed');
});

test('EX-5: authored alternative keys are never called unchanged, and the source plus junk never passes', () => {
  const dir = new URL('../../content/lessons/', import.meta.url);
  const problems = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const l = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    if (!['B1', 'B2', 'C1', 'C2'].includes(l.level)) continue;
    for (const e of l.exercises.filter((x) => ['transform', 'correct'].includes(x.type))) {
      const source = e.type === 'transform' ? e.source : e.sentence;
      for (const a of e.answers.slice(1)) if (couldBeRight(a, { source, answers: [e.answers[0]], wrong_feedback: e.wrong_feedback }).reason === 'unchanged') problems.push(`${l.id} ${e.id}: ${a}`);
      if (/[a-z]/i.test(source) && couldBeRight(`${source} x`, { source, answers: e.answers, wrong_feedback: e.wrong_feedback }).ok) problems.push(`${l.id} ${e.id}: source + x passes`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---------- UX round 4 (exercises lane) ----------
test('r4 EX-2: self-credit only when the key\'s verb structure is kept and the subject agrees', () => {
  const q = { source: 'You have ever been to Eilat?', answers: ['Have you ever been to Eilat?'] };
  assert.equal(couldBeRight('Have you ever went to Eilat?', q).ok, false, 'went for been');
  assert.equal(couldBeRight('Have you ever went to Eilat?', q).reason, 'verb');
  assert.equal(couldBeRight('Have you ever gone to Eilat?', q).ok, false, 'gone for been');
  assert.equal(couldBeRight('Have you been to Eilat before?', q).ok, true, 'a paraphrase that keeps been');
  const p = { source: 'I live in Tel Aviv since 2020.', answers: ['I have lived in Tel Aviv since 2020.', 'I have been living in Tel Aviv since 2020.'] };
  for (const a of ['I did live in Tel Aviv since 2020.', 'I lived in Tel Aviv since 2020.', 'I have live in Tel Aviv since 2020.', 'I am living in Tel Aviv since 2020.', 'I have been lived in Tel Aviv since 2020.']) {
    const r = couldBeRight(a, p);
    assert.equal(r.ok, false, a);
    assert.equal(r.reason, 'verb', a);
  }
  assert.equal(couldBeRight("I've lived in Tel Aviv since 2020.", p).ok, true);
  assert.equal(couldBeRight("I've been living here in Tel Aviv since 2020.", { ...p, answers: [p.answers[0]] }).ok, true, 'the perfect continuous keeps the perfect');
  const m = { source: 'Maya / pass / her driving test', answers: ['Maya has just passed her driving test.'] };
  assert.deepEqual(couldBeRight('Maya have just passed her test.', m), { ok: false, reason: 'agreement' });
  assert.equal(couldBeRight('Maya has passed her driving test just now.', m).ok, true);
  // A paraphrase with another verb is left to the overlap rule.
  const c = { source: 'The concert was taken place in the park.', answers: ['The concert took place in the park.'] };
  assert.equal(couldBeRight('The concert was held in the park.', c).ok, true, 'was held for took place');
  assert.equal(verbStructure('If I had known, I would have come to visit you.', 'If I had known, I would have visited you.'), 'ok', 'the key\'s verb as an infinitive is another structure');
  assert.equal(verbStructure("If I'd known, I'd have visited you.", 'If I had known, I would have visited you.'), 'ok', "I'd = I had");
  assert.equal(verbStructure('The new timetable probably contributed to it.', 'The new timetable may have contributed to it.'), 'other', 'a modal perfect is not a tense');
});

test('r4 EX-2: subject-auxiliary agreement', () => {
  for (const s of ['I has a car.', 'They has finished.', 'She have finished.', 'Maya have just passed.', 'Has you ever been there?']) assert.ok(agreementSlip(s), s);
  for (const s of ['Maya and Noa have finished.', 'Does she have a car?', 'Many have tried.', 'I have finished.', 'Has she finished?', "Maya's just passed.", 'Students have left.']) assert.ok(!agreementSlip(s), s);
});

test('r4 EX-3: a real verb form is never forgiven as a spelling slip', () => {
  assert.equal(checkTyped('I have know Noa for ten years.', ['I have known Noa for ten years.']).correct, false);
  assert.equal(checkTyped('It was build in 1990', ['It was built in 1990']).correct, false);
  const slip = checkTyped('I have knwon Noa for ten years.', ['I have known Noa for ten years.']);
  assert.ok(slip.correct && slip.almost, 'a real slip in known is still "almost"');
  assert.ok(checkTyped('dubble', ['double']).almost && checkTyped('becuase', ['because']).almost, 'the round-3 EX-7 slips stay "almost"');
  assert.ok(isVerbForm('known') && isVerbForm('build') && isVerbForm('went') && !isVerbForm('knwon'));
});
