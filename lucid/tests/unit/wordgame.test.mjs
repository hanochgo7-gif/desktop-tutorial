// Word game logic: word pools, rounds, immediate marking, scores, bests and stage unlocking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { wordPool, completable, makeRound, maskWord, gameMeaning, senses, posKey, checkAnswer, typedCorrect, scoreFor, bests, isBetter, unlocked, recentWords, paceOf, speedSetting, ADVANCE_MS, modeOf, maxFor, ROUND, MAX_SCORE } from '../../js/core/wordgame.js';

const dir = new URL('../../content/lessons/', import.meta.url);
const lessons = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const pools = Object.fromEntries(LEVELS.map((l) => [l, wordPool(lessons, l)]));

test('every level has enough words for a full round in every stage', () => {
  for (const level of LEVELS) {
    const pool = pools[level];
    assert.ok(pool.filter((w) => w.meaning).length >= ROUND, `${level}: ${pool.length} words`);
    assert.ok(pool.filter(completable).length >= ROUND, `${level}: too few sentences for completion`);
    assert.equal(new Set(pool.map((w) => w.word.toLowerCase())).size, pool.length, `${level}: duplicate words`);
  }
});

test('the meanings a game shows contain no English and no grammar labels', () => {
  assert.equal(gameMeaning('כבשה (ברבים: כבשים – ובאנגלית גם sheep, בלי s)'), 'כבשה');
  assert.equal(gameMeaning('הלך; נסע (עבר של go)'), 'הלך; נסע');
  assert.equal(gameMeaning('זקן/ה, ישן/ה; How old? = בן/בת כמה?'), 'זקן/ה, ישן/ה');
  for (const level of LEVELS) for (const w of pools[level]) if (w.meaning) assert.ok(!/[A-Za-z]/.test(w.meaning), `${w.word}: ${w.meaning}`);
  assert.equal(posKey('verb (past of go)'), 'verb past');
});

test('choice questions: four different options, one right answer, no option shares a sense with the answer', () => {
  for (const level of LEVELS) for (const stage of [1, 2]) for (let r = 0; r < 25; r++) {
    for (const q of makeRound(pools[level], stage, { seed: r / 25 + 0.013 })) {
      assert.equal(q.options.length, 4, `${level} ${stage} ${q.word.word}`);
      assert.equal(new Set(q.options.map((o) => o.toLowerCase().trim())).size, 4, `duplicate option for ${q.word.word}`);
      assert.equal(q.options[q.answer], stage === 1 ? q.word.meaning : q.word.word);
      const target = senses(q.word.he);
      for (const [k, o] of q.options.entries()) {
        if (k === q.answer) continue;
        const other = pools[level].find((w) => (stage === 1 ? w.meaning : w.word) === o);
        for (const s of senses(other.he)) assert.ok(!target.has(s), `${level} ${q.word.word}: "${o}" shares "${s}"`);
      }
    }
  }
});

test('a round has 10 different words, is reproducible, prefers new words and can start with given ones', () => {
  const pool = pools.A2;
  const a = makeRound(pool, 1, { seed: 0.3 }), b = makeRound(pool, 1, { seed: 0.3 });
  assert.equal(a.length, ROUND);
  assert.equal(new Set(a.map((q) => q.word.word)).size, ROUND);
  assert.deepEqual(a.map((q) => q.word.word), b.map((q) => q.word.word));
  const recent = a.map((q) => q.word.word);
  const c = makeRound(pool, 1, { seed: 0.3, recent });
  assert.ok(c.every((q) => !recent.includes(q.word.word)), 'recently shown words came back first');
  const focus = recent.slice(0, 3);
  const d = makeRound(pool, 1, { seed: 0.9, focus });
  for (const w of focus) assert.ok(d.some((q) => q.word.word === w), `${w} missing from a focus round`);
});

test('completion: the word is blanked in its own sentence, which has it only once', () => {
  assert.ok(!completable({ word: 'go', example: 'I go and you go.' }));
  assert.ok(completable({ word: 'go', example: 'I go home.' }));
  for (const level of LEVELS) {
    for (const q of makeRound(pools[level], 3, { seed: 0.7 })) {
      assert.equal(q.before + q.answer + q.after, q.word.example);
      assert.ok(!new RegExp(`(?<![A-Za-z])${q.answer}(?![A-Za-z])`, 'i').test(q.before + ' ' + q.after), `${q.answer} still visible`);
    }
  }
});

test('the hint shows each word separately, with its first letter', () => {
  assert.deepEqual(maskWord('always'), [['a', '_', '_', '_', '_', '_']]);
  assert.deepEqual(maskWord('last night'), [['l', '_', '_', '_'], ['n', '_', '_', '_', '_']]);
  assert.deepEqual(maskWord("don't"), [['d', '_', '_', "'", '_']]);
  assert.deepEqual(maskWord('well-known'), [['w', '_', '_', '_', '-', 'k', '_', '_', '_', '_']]);
});

test('typed answers are checked like the lessons, with UK and US spelling both right', () => {
  assert.ok(typedCorrect('Always', 'always'));
  assert.ok(typedCorrect('Last  night', 'last night'));
  assert.ok(!typedCorrect('allwayss', 'always'));
  assert.deepEqual(checkAnswer('neighbor', 'neighbour'), { correct: true, almost: false, variant: true });
  assert.deepEqual(checkAnswer('generalization', 'generalisation'), { correct: true, almost: false, variant: true });
  assert.deepEqual(checkAnswer("can't stand", 'cannot stand'), { correct: true, almost: false, variant: false });
  assert.equal(checkAnswer('recieve', 'receive').almost, true, 'a one-letter slip counts, with a note');
  assert.equal(checkAnswer('evidense', 'evidence').variant, false, 'no invented UK/US pairs');
});

test('scores: 10 for a right answer, 0 for a wrong one; a speed bonus only in the speed challenge', () => {
  assert.deepEqual(scoreFor(false, 500), { points: 0, bonus: 0 });
  assert.deepEqual(scoreFor(true, 2000), { points: 10, bonus: 0 }, 'no bonus by default, however quick');
  assert.deepEqual(scoreFor(true, 2000, 'choice', true), { points: 15, bonus: 5 });
  assert.equal(scoreFor(true, 5000, 'choice', true).points, 13);
  assert.equal(scoreFor(true, 9000, 'choice', true).points, 11);
  assert.equal(scoreFor(true, 20000, 'choice', true).points, 10);
  assert.equal(scoreFor(true, 7000, 'typed', true).points, 15, 'typing gets more time for the bonus');
  assert.deepEqual(scoreFor(false, 500, 'choice', true), { points: 0, bonus: 0 });
  assert.equal(MAX_SCORE, 100);
  assert.equal(maxFor(ROUND, true), 150);
});

test('pace: one setting (UX r4 PG-2): calm by default, relaxed is derived from the challenge; rounds keep their mode', () => {
  assert.deepEqual(paceOf({}), { relaxed: true, challenge: false, mode: 'calm' });
  assert.deepEqual(paceOf(), { relaxed: true, challenge: false, mode: 'calm' });
  assert.deepEqual(paceOf(null), { relaxed: true, challenge: false, mode: 'calm' });
  // The old Settings "calm pace" key no longer decides anything: off with the challenge off is still calm.
  assert.deepEqual(paceOf({ relaxed_pace: false }), { relaxed: true, challenge: false, mode: 'calm' });
  assert.deepEqual(paceOf({ game_speed_challenge: true }), { relaxed: false, challenge: true, mode: 'challenge' });
  assert.deepEqual(paceOf({ game_speed_challenge: true, relaxed_pace: true }), { relaxed: false, challenge: true, mode: 'challenge' });
  assert.equal(paceOf({ game_speed_challenge: 'yes' }).challenge, false, 'only true turns the challenge on');
  assert.deepEqual(speedSetting(true), { game_speed_challenge: true, relaxed_pace: false });
  assert.deepEqual(speedSetting(false), { game_speed_challenge: false, relaxed_pace: true });
  assert.ok(ADVANCE_MS <= 1000, 'a right answer in the challenge moves on within a second');
  assert.equal(modeOf({ mode: 'calm' }), 'calm');
  assert.equal(modeOf({}), 'challenge', 'rounds from before the calm default were scored with the bonus');
});

test('bests are kept per mode; unlocking counts every round', () => {
  const ev = [
    { type: 'game-round', level: 'A1', stage: 1, score: 140, correct: 9, total: 10, accuracy: 0.9 },
    { type: 'game-round', level: 'A1', stage: 1, score: 80, correct: 8, total: 10, accuracy: 0.8, mode: 'calm' },
    { type: 'game-round', level: 'A1', stage: 1, score: 120, correct: 9, total: 10, accuracy: 0.9, mode: 'challenge' },
  ];
  assert.equal(bests(ev, 'calm')['A1:1'].score, 80);
  assert.equal(bests(ev, 'calm')['A1:1'].rounds, 1);
  assert.equal(bests(ev, 'challenge')['A1:1'].score, 140);
  assert.equal(bests(ev)['A1:1'].rounds, 3);
  assert.ok(unlocked(bests(ev), 'A1', 2));
  assert.ok(!bests(ev, 'calm')['A1:2']);
});

test('the best round ranks right answers first; the next stage opens at 70%', () => {
  const events = [
    { type: 'game-round', level: 'A1', stage: 1, score: 120, correct: 8, total: 10, accuracy: 0.8 },
    { type: 'game-round', level: 'A1', stage: 1, score: 110, correct: 10, total: 10, accuracy: 1 },
    { type: 'game-round', level: 'A1', stage: 1, score: 60, correct: 6, total: 10, accuracy: 0.6 },
    { type: 'lesson', score: 1 },
  ];
  const b = bests(events);
  assert.deepEqual(b['A1:1'], { score: 110, correct: 10, total: 10, accuracy: 1, rounds: 3 }, 'one round, not a mix of two');
  assert.ok(isBetter(b['A1:1'], { score: 112, correct: 10 }) && !isBetter(b['A1:1'], { score: 140, correct: 9 }));
  assert.ok(unlocked(b, 'A1', 1) && unlocked(b, 'B2', 1), 'stage 1 of every level is open');
  assert.ok(unlocked(b, 'A1', 2), '70% in stage 1 opens stage 2');
  assert.ok(!unlocked(b, 'A1', 3), 'stage 3 needs stage 2');
  assert.ok(!unlocked(bests(events.slice(2)), 'A1', 2), '60% is not enough');
});

test('recent words come from the last rounds of that level and stage', () => {
  const ev = [
    { type: 'game-round', level: 'A1', stage: 1, at: '2026-11-01', words: ['a', 'b'] },
    { type: 'game-round', level: 'A1', stage: 1, at: '2026-11-02', words: ['c'] },
    { type: 'game-round', level: 'A1', stage: 2, at: '2026-11-02', words: ['z'] },
    { type: 'game-round', level: 'A1', stage: 1, at: '2026-10-01', words: ['old'] },
  ];
  assert.deepEqual(recentWords(ev, 'A1', 1), ['c', 'a', 'b']);
});
