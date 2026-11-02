// Word game logic: word pools, rounds, immediate marking, scores, bests and stage unlocking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { wordPool, completable, makeRound, maskWord, typedCorrect, scoreFor, bests, unlocked, ROUND, MAX_SCORE } from '../../js/core/wordgame.js';

const dir = new URL('../../content/lessons/', import.meta.url);
const lessons = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

test('every level has enough words for a full round in every stage', () => {
  for (const level of LEVELS) {
    const pool = wordPool(lessons, level);
    assert.ok(pool.length >= ROUND, `${level}: ${pool.length} words`);
    assert.ok(pool.filter(completable).length >= ROUND, `${level}: too few sentences for completion`);
    assert.equal(new Set(pool.map((w) => w.word.toLowerCase())).size, pool.length, `${level}: duplicate words`);
  }
});

test('choice questions have four different options and exactly one right answer', () => {
  for (const level of LEVELS) for (const stage of [1, 2]) {
    const pool = wordPool(lessons, level);
    for (const q of makeRound(pool, stage, { seed: 0.42 })) {
      assert.equal(q.type, 'choice');
      assert.equal(q.options.length, 4, `${level} ${stage} ${q.word.word}`);
      assert.equal(new Set(q.options.map((o) => o.toLowerCase().trim())).size, 4, `duplicate option for ${q.word.word}`);
      const key = stage === 1 ? q.word.he : q.word.word;
      assert.equal(q.options[q.answer], key);
      assert.equal(q.prompt, stage === 1 ? q.word.word : q.word.he);
    }
  }
});

test('a round has 10 different words and is reproducible with a seed', () => {
  const pool = wordPool(lessons, 'A2');
  const a = makeRound(pool, 1, { seed: 0.3 }), b = makeRound(pool, 1, { seed: 0.3 });
  assert.equal(a.length, ROUND);
  assert.equal(new Set(a.map((q) => q.word.word)).size, ROUND);
  assert.deepEqual(a.map((q) => q.word.word), b.map((q) => q.word.word));
});

test('completion questions blank the word in its own sentence', () => {
  for (const level of LEVELS) {
    for (const q of makeRound(wordPool(lessons, level), 3, { seed: 0.7 })) {
      assert.equal(q.type, 'typed');
      assert.equal(q.before + q.answer + q.after, q.word.example);
      assert.equal(q.answer.toLowerCase(), q.word.word.toLowerCase());
    }
  }
});

test('the hint shows the first letter of each word and the length', () => {
  assert.equal(maskWord('always'), 'a _ _ _ _ _');
  assert.equal(maskWord('last night'), 'l _ _ _   n _ _ _ _');
  assert.equal(maskWord("don't"), "d _ _ ' _");
  assert.equal(maskWord('well-known'), 'w _ _ _ - k _ _ _ _');
});

test('typed answers: case and surrounding punctuation do not matter, spelling does', () => {
  assert.ok(typedCorrect('Always', 'always'));
  assert.ok(typedCorrect(' always. ', 'always'));
  assert.ok(typedCorrect('Last  night', 'last night'));
  assert.ok(!typedCorrect('alway', 'always'));
  assert.ok(!typedCorrect('allways', 'always'));
});

test('scores: 10 for a right answer plus a speed bonus; 0 for a wrong one', () => {
  assert.equal(scoreFor(false, 500), 0);
  assert.equal(scoreFor(true, 2000), 15);
  assert.equal(scoreFor(true, 5000), 13);
  assert.equal(scoreFor(true, 9000), 11);
  assert.equal(scoreFor(true, 20000), 10);
  assert.equal(scoreFor(true, 7000, 'typed'), 15, 'typing gets more time for the bonus');
  assert.equal(MAX_SCORE, 150);
});

test('bests per level and stage; the next stage opens at 70%', () => {
  const events = [
    { type: 'game-round', level: 'A1', stage: 1, score: 90, accuracy: 0.6 },
    { type: 'game-round', level: 'A1', stage: 1, score: 80, accuracy: 0.7 },
    { type: 'lesson', score: 1 },
  ];
  const b = bests(events);
  assert.deepEqual(b['A1:1'], { score: 90, accuracy: 0.7, rounds: 2 });
  assert.ok(unlocked(b, 'A1', 1) && unlocked(b, 'B2', 1), 'stage 1 of every level is open');
  assert.ok(unlocked(b, 'A1', 2), '70% in stage 1 opens stage 2');
  assert.ok(!unlocked(b, 'A1', 3), 'stage 3 needs stage 2');
  assert.ok(!unlocked(bests(events.slice(0, 1)), 'A1', 2), '60% is not enough');
});
