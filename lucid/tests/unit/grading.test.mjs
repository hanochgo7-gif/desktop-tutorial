import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { normalize, variants, checkTyped, findWrongFeedback, wordAccuracy, countWords, checkOrder, levenshtein, couldBeRight, sameAsSource, didPlusPast, keepsVerbForm } from '../../js/core/grading.js';

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
