import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWriting } from '../../js/core/writing-analyzer.js';

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
