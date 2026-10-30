import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, variants, checkTyped, findWrongFeedback, wordAccuracy, countWords, checkOrder, levenshtein } from '../../js/core/grading.js';

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
