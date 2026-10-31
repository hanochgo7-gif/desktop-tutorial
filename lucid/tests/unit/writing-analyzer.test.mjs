import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWriting } from '../../js/core/writing-analyzer.js';
import { countWords } from '../../js/core/grading.js';

const types = (text, opts) => analyzeWriting(text, opts).issues.map((i) => i.type);

test('flags common learner errors', () => {
  assert.ok(types('i think i am agree with you.').includes('capitalization'));
  assert.ok(types('I am agree with this idea.').includes('word-choice'));
  assert.ok(types('I need more informations and advices.').includes('countability'));
  assert.ok(types('This is more better than that.').includes('comparison-form'));
  assert.ok(types('It depends in the weather.').includes('preposition'));
  assert.ok(types('We discussed about the plan.').includes('preposition'));
  assert.ok(types('I have 20 years.').includes('false-friend'));
  assert.ok(types('Yesterday I didn\'t went home.').includes('verb-form'));
  assert.ok(types('You should to go.').includes('modal-use'));
  assert.ok(types('If it will rain, we will stay home.').includes('conditional-form'));
  assert.ok(types('I ate a apple.').includes('article'));
  assert.ok(types('It was an big house.').includes('article'));
  assert.ok(types('I like the city, it is very beautiful.').includes('punctuation'));
});

test('does not flag correct English', () => {
  const clean = 'I study at a university. It took an hour. I agree with you. An honest answer is a useful one. If it rains, we will stay. I am 20 years old. A one-day trip was enough.';
  assert.deepEqual(types(clean), []);
});

test('register checks only for formal levels; structure signals are detected', () => {
  const essay = 'This essay argues that cities should invest in public transport.\n\nFor example, research shows that buses reduce traffic. However, critics argue that it\'s too expensive.\n\nIn conclusion, the benefits are greater.';
  assert.ok(types(essay, { level: 'C1' }).includes('register'), 'contraction flagged at C1');
  assert.ok(!types(essay, { level: 'A2' }).includes('register'), 'not at A2');
  const a = analyzeWriting(essay, { level: 'B2', minWords: 30 });
  assert.deepEqual(Object.entries(a.structure).filter(([, v]) => v).map(([k]) => k).sort(), ['conclusion', 'counter', 'evidence', 'rebuttal', 'thesis']);
  assert.ok(a.connectors.contrast.includes('however'));
  assert.equal(a.stats.paragraphs, 3);
  assert.equal(a.checks.find((c) => c.id === 'length').ok, true);
});

test('length and must-include checks gate completion', () => {
  const a = analyzeWriting('I am Yael.', { minWords: 9, mustInclude: ['is'] });
  assert.equal(a.passedRequired, false);
  const b = analyzeWriting('I am Yael. I am from Tel Aviv. My friend Omer is a student.', { minWords: 9, mustInclude: ['am', 'is'] });
  assert.equal(b.passedRequired, true);
});

// Persona panel P-74: correct academic English that the checks used to flag.
test('no run-on flag after a sentence-initial linker, adverbial or short prepositional phrase', () => {
  const ok = 'However, this does not mean that every city can afford it. In 2022, there were many cities that tried it. Conversely, it is cheaper than traffic jams. According to the city report, it is cheap. For instance, it was free in May. Unfortunately, it was too late.';
  assert.deepEqual(types(ok, { level: 'B2' }), []);
  assert.ok(types('In my city there are many cars, it is noisy.', { level: 'B2' }).includes('punctuation'), 'a real comma splice is still flagged');
});

test('a or an is decided by sound, with initialisms read letter by letter', () => {
  const ok = 'A unanimous vote is rare. A utilitarian view helps. She has an MBA and works for an NGO. It was a UN report. It took an hour. A European study and a one-off payment. An unusual result came from a university.';
  assert.deepEqual(types(ok, { level: 'C1' }), []);
  const bad = analyzeWriting('He has a MBA. She ate a apple. It was an useful idea.', { level: 'B1' }).issues.filter((i) => i.type === 'article').map((i) => `${i.match} (${i.title})`);
  assert.deepEqual(bad, ['a MBA (an before a vowel sound)', 'a apple (an before a vowel sound)', 'an useful (a before a consonant sound)']);
  assert.deepEqual(types('Buy a SIM card. She had an SAT score. It was a FAQ page.', { level: 'B1' }), [], 'three capitals that may be read as a word are not checked');
});

test('if + will in an indirect question is not flagged; low-precision rules are off above B2', () => {
  assert.deepEqual(types('It is unclear if hybrid work will preserve demand. I wonder if she will come.', { level: 'B1' }), []);
  assert.ok(types('If it will rain, we will stay home.', { level: 'B1' }).includes('conditional-form'));
  assert.ok(!types('If it will rain, we will stay home.', { level: 'C2' }).includes('conditional-form'), 'not run at C2');
  assert.ok(!types('I like the city, it is very beautiful.', { level: 'C1' }).includes('punctuation'), 'run-on rule not run at C1');
});

test('a title line is not merged into the first sentence or counted as a paragraph', () => {
  const body = Array.from({ length: 6 }, () => 'This sentence has exactly eight words in it.').join(' ');
  const a = analyzeWriting(`Remote work and the future of cities\n\n${body}\n\n${body}`, { level: 'C2' });
  assert.equal(a.stats.paragraphs, 2);
  assert.equal(a.stats.longest_sentence, 8);
  assert.ok(!a.issues.some((i) => i.title === 'Very long sentence'));
  assert.equal(a.checks.find((c) => c.id === 'caps').ok, true);
});

test('a closing reference list is not counted toward the word range or checked', () => {
  const body = Array.from({ length: 30 }, () => 'Remote work changes how cities use their office space.').join(' ');
  const text = `${body}\n\nReferences\nVarga, E. (2024). a study , of cities. Journal, 1(2), 3-4.\nHolm, J. (2023). another title. Press.`;
  const a = analyzeWriting(text, { level: 'C2', minWords: 250, maxWords: 300 });
  assert.equal(a.stats.words, 270);
  assert.ok(a.stats.reference_words > 10);
  assert.match(a.checks.find((c) => c.id === 'length').en, /reference list \(\d+ words\) is not counted/);
  assert.ok(!a.issues.some((i) => i.type === 'punctuation' || i.type === 'capitalization'), 'reference entries are not checked');
  assert.equal(analyzeWriting('References are useful. I like them.', {}).stats.reference_words, 0, 'a word, not a heading');
});

// Persona round 2 (T5): phrase linkers and fronted time phrases take a comma before a full clause.
test('no run-on flag after phrase linkers such as "To sum up," or "Last year,"', () => {
  const ok = 'To sum up, I believe it works. To conclude, it is good. All in all, this is fine. First of all, it is cheap. Last year, there were many buses. Put simply, it is fast. Two years ago, I was there. On the whole, it is worth it. That said, it is not cheap.';
  assert.deepEqual(types(ok, { level: 'B2' }), []);
  assert.ok(types('The plan is simple, it is cheap.', { level: 'B2' }).includes('punctuation'), 'a real comma splice is still flagged');
});

// Persona round 2 (Y6): an email is not an argumentative essay.
test('an email gets no argument signals, no formal-register warnings, and its sign-off is not checked', () => {
  const email = 'Hi Tom,\nI am writing about the meeting next week. I haven\'t finished the report yet, but it\'s nearly done.\n\nBest,\nYael Cohen';
  const a = analyzeWriting(email, { level: 'B2', kind: 'email', formal: true });
  assert.deepEqual(a.structure, {}, 'no thesis or counterargument checklist');
  assert.equal(a.checks.find((c) => c.id === 'end').ok, true, 'the sign-off does not fail the punctuation check');
  assert.ok(!a.issues.some((i) => i.type === 'register' || i.type === 'punctuation'), JSON.stringify(a.issues));
  assert.equal(a.stats.words, countWords(email));
  assert.ok(!a.connectors.contrast?.includes('yet') && !a.connectors.sequence?.includes('next'), '"yet" and "next" in "not ... yet" and "next week" are not linkers');
  const b = analyzeWriting('It is cheap, yet it is slow. Next, we test it.', { level: 'B1' });
  assert.ok(b.connectors.contrast.includes('yet') && b.connectors.sequence.includes('next'), 'linking "yet" and "Next," still count');
  assert.equal(analyzeWriting(email, { level: 'B2' }).structure.thesis, false, 'an essay still gets the argument signals');
});
