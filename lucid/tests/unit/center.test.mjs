// The practice hubs' shared logic (js/ui/center.js): lane r4-practice-games (PG-15, PG-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wasUnheard, bestScore } from '../../js/ui/center.js';

const listen = { type: 'listen' };
const dictation = { type: 'dictation' };
const read = { type: 'read' };

test('PG-15: a listening result marked unheard by exercise.js is never scored (contract b)', () => {
  assert.equal(wasUnheard({ correct: true, unheard: true }, listen), true);
  assert.equal(wasUnheard({ correct: false, unheard: true }, read), true, 'the flag wins whatever the type');
});

test('PG-15: without the flag, a listening item is unheard when the browser cannot speak or every play stayed silent', () => {
  assert.equal(wasUnheard({ correct: true }, listen, { speech: false }), true);
  assert.equal(wasUnheard({ correct: true }, dictation, { speech: true, silent: true, started: false }), true);
  assert.equal(wasUnheard({ correct: true }, listen, { speech: true, silent: true, started: true }), false, 'one play that started is enough');
  assert.equal(wasUnheard({ correct: true }, listen, { speech: true, silent: false, started: false }), false, 'never played is not "nothing heard"');
  assert.equal(wasUnheard({ correct: true }, read, { speech: false }), false, 'reading is not a listening item');
  assert.equal(wasUnheard({ correct: false, dontKnow: true }, listen, { speech: false }), false, '"I don\'t know" stays a wrong first try');
  assert.equal(wasUnheard({ graded: false }, listen, { speech: false }), false);
});

test('bestScore leaves out attempts with no score', () => {
  assert.equal(bestScore([]), null);
  assert.equal(bestScore([{ score: null, correct: false }]), null);
  assert.equal(bestScore([{ score: null, correct: true }, { score: 0.5 }]), 0.5);
  assert.equal(bestScore([{ correct: true }]), 1);
});
