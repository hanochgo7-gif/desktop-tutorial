// Memory game: the deck, how a turn is judged (a match, a mismatch, a slip), scores, bests and unlocking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDeck, judgeTurn, partnerOf, roundScore, turnBonus, maxFor, accuracyOf, longestWord, TYPE, UNLOCK, SMALL, memoryUnlocked, fewerTurns } from '../../js/core/memorygame.js';
import { bests, unlocked, recentWords } from '../../js/core/picturegame.js';

const data = JSON.parse(readFileSync(new URL('../../content/pictures.json', import.meta.url), 'utf8'));

test('each level deals 12, 16 or 20 cards: every word once as a picture and once as a word, look-alikes never together', () => {
  assert.deepEqual(data.sets.map((s) => s.memory_pairs), [6, 8, 10]);
  for (const set of data.sets) for (let r = 0; r < 40; r++) {
    const deck = makeDeck(set.words, set.memory_pairs, { seed: r / 40 + 0.009, apart: set.apart });
    assert.equal(deck.length, set.memory_pairs * 2);
    const words = new Map();
    for (const c of deck) words.set(c.w.word, [...(words.get(c.w.word) || []), c.kind]);
    assert.equal(words.size, set.memory_pairs);
    for (const [w, kinds] of words) assert.deepEqual(kinds.sort(), ['pic', 'word'], `${w}: ${kinds}`);
    for (const [x, y] of set.apart) assert.ok(!(words.has(x) && words.has(y)), `level ${set.level}: ${x} and ${y} in one round`);
  }
});

test('a deck is reproducible, can start with missed words and prefers words not seen lately', () => {
  const set = data.sets[1];
  const a = makeDeck(set.words, 8, { seed: 0.42 }), b = makeDeck(set.words, 8, { seed: 0.42 });
  assert.deepEqual(a.map((c) => c.kind + c.w.word), b.map((c) => c.kind + c.w.word));
  const recent = [...new Set(a.map((c) => c.w.word))];
  assert.ok(makeDeck(set.words, 8, { seed: 0.42, recent }).every((c) => !recent.includes(c.w.word)));
  const focus = ['truck', 'ambulance', 'soup'];
  const f = new Set(makeDeck(set.words, 8, { seed: 0.7, focus, apart: set.apart }).map((c) => c.w.word));
  assert.ok(f.has('soup') && (f.has('truck') || f.has('ambulance')), 'missed words left out');
  assert.ok(!(f.has('truck') && f.has('ambulance')), 'look-alikes together in a focus round');
});

test('a turn: a match; a mismatch with nothing seen before is not a slip; a mismatch when the pair had been seen is', () => {
  const w = (word) => ({ word });
  const cat = w('cat'), dog = w('dog'), sun = w('sun');
  const cards = [{ kind: 'pic', w: cat }, { kind: 'word', w: dog }, { kind: 'word', w: cat }, { kind: 'pic', w: dog }, { kind: 'pic', w: sun }, { kind: 'word', w: sun }];
  assert.equal(partnerOf(cards, 0), 2);
  assert.deepEqual(judgeTurn(cards, 0, 2, new Set()), { match: true, slip: false, miss: null });
  assert.deepEqual(judgeTurn(cards, 0, 1, new Set()), { match: false, slip: false, miss: null }, 'exploring is not a mistake');
  assert.deepEqual(judgeTurn(cards, 2, 4, new Set([0, 1])), { match: false, slip: true, miss: null }, 'cat word: the cat picture had been seen; the sun card was new');
  assert.deepEqual(judgeTurn(cards, 4, 3, new Set([0, 1])), { match: false, slip: false, miss: null }, 'sun: its pair was never seen');
});

test('a miss (a word to go over) is a picture paired with a word card already seen; a slip by place is not one', () => {
  const w = (word) => ({ word });
  const cat = w('cat'), dog = w('dog'), sun = w('sun');
  const cards = [{ kind: 'pic', w: cat }, { kind: 'word', w: dog }, { kind: 'word', w: cat }, { kind: 'pic', w: dog }, { kind: 'pic', w: sun }, { kind: 'word', w: sun }];
  assert.equal(judgeTurn(cards, 0, 1, new Set([1])).miss, cat, 'the cat picture was given the word dog, seen before');
  assert.equal(judgeTurn(cards, 1, 0, new Set([0])).miss, cat, 'word first: still the picture that got the wrong word');
  assert.equal(judgeTurn(cards, 0, 1, new Set()).miss, null, 'the word card was new: exploring');
  assert.equal(judgeTurn(cards, 0, 3, new Set([2, 3])).miss, null, 'two pictures: a slip of place, not of meaning');
  assert.equal(judgeTurn(cards, 0, 3, new Set([2, 3])).slip, true);
});

test('score: 10 a pair; in the speed challenge 3 off a slip (never below 0) and a bonus for few turns; accuracy is pairs over pairs and slips', () => {
  assert.equal(roundScore(6, 0, 10), 70);
  assert.equal(roundScore(6, 2, 0), 54);
  assert.equal(roundScore(1, 9, 5), 5);
  assert.equal(roundScore(6, 2, 0, 0), 60, 'calm: a slip costs nothing');
  assert.equal(turnBonus(9, 6), 10);
  assert.equal(turnBonus(12, 6), 5);
  assert.equal(turnBonus(13, 6), 0);
  assert.equal(turnBonus(15, 10), 10);
  assert.equal(maxFor(6), 60);
  assert.equal(maxFor(6, true), 70);
  assert.equal(maxFor(SMALL), 40);
  assert.equal(accuracyOf(6, 2), 0.75);
  assert.equal(accuracyOf(0, 0), 0);
});

test('the small board deals 8 cards at level 1; word cards know their longest word', () => {
  const deck = makeDeck(data.sets[0].words, SMALL, { seed: 0.5, apart: data.sets[0].apart });
  assert.equal(deck.length, 8);
  assert.equal(longestWord('cat'), 3);
  assert.equal(longestWord('fire extinguisher'), 12);
  assert.equal(longestWord(''), 1);
});

test('memory rounds have their own bests, unlocking and recent words, apart from the picture game', () => {
  const ev = [
    { type: TYPE, level: 1, score: 60, accuracy: 0.75, at: '2026-11-01', words: ['a'] },
    { type: TYPE, level: 1, score: 50, accuracy: 0.6, at: '2026-11-02', words: ['b'] },
    { type: 'picture-round', level: 1, score: 100, accuracy: 1, at: '2026-11-02', words: ['z'] },
  ];
  const b = bests(ev, TYPE);
  assert.equal(b[1].score, 60);
  assert.equal(b[1].rounds, 2);
  assert.ok(unlocked(b, 2) && !unlocked(b, 3));
  assert.ok(!unlocked(bests(ev.slice(1), TYPE), 2), '60% is not enough');
  assert.equal(bests(ev)[1].score, 100, 'the picture game keeps its own');
  const modes = [...ev, { type: TYPE, level: 1, score: 40, accuracy: 0.8, mode: 'calm' }];
  assert.equal(bests(modes, TYPE, 'calm')[1].score, 40, 'calm rounds have their own best');
  assert.equal(bests(modes, TYPE, 'challenge')[1].score, 60, 'older rounds count as the challenge');
  assert.ok(UNLOCK === 0.7);
  assert.deepEqual(recentWords(ev, 1, 2, TYPE), ['b', 'a']);
});

// UX r4 PG-4 (keeping GM-3): above the course level, memory levels open on English, never on working memory.
test('memory level 2 above the course level opens on a picture-game best of 70%, not on calm memory accuracy', () => {
  const calmMemory = { type: TYPE, level: 1, score: 60, accuracy: 0.9, matches: 6, slips: 0, turns: 9, mode: 'calm' };
  assert.ok(!memoryUnlocked([calmMemory], 2, 1), 'calm memory accuracy 0.9 with no picture best opened level 2');
  assert.ok(!memoryUnlocked([calmMemory, { type: 'picture-round', level: 1, score: 80, accuracy: 0.69, mode: 'calm' }], 2, 1), '69% in the picture game is not enough');
  assert.ok(memoryUnlocked([calmMemory, { type: 'picture-round', level: 1, score: 100, accuracy: 0.7, mode: 'calm' }], 2, 1), 'a picture-game level-1 best of 0.7 did not open level 2');
  assert.ok(!memoryUnlocked([calmMemory, { type: 'picture-round', level: 2, score: 100, accuracy: 1 }], 2, 1), 'another level of the picture game opened it');
  // In the speed challenge memory accuracy also counts (and rounds from before modes count as the challenge).
  assert.ok(memoryUnlocked([{ ...calmMemory, mode: 'challenge' }], 2, 1));
  assert.ok(memoryUnlocked([{ type: TYPE, level: 1, score: 60, accuracy: 0.86 }], 2, 1));
  assert.ok(!memoryUnlocked([{ ...calmMemory, mode: 'challenge', accuracy: 0.6 }], 2, 1));
  // Levels up to the course level are open with no evidence.
  assert.ok(memoryUnlocked([], 1, 1) && memoryUnlocked([], 3, 3) && !memoryUnlocked([], 3, 2));
});

test('the calm memory best is the fewest turns a pair, so the small and the full board compare fairly', () => {
  assert.ok(fewerTurns(null, { turns: 12, matches: 6 }));
  assert.ok(fewerTurns({ turns: 12, matches: 6 }, { turns: 10, matches: 6 }));
  assert.ok(!fewerTurns({ turns: 10, matches: 6 }, { turns: 12, matches: 6 }));
  assert.ok(!fewerTurns({ turns: 9, matches: 6 }, { turns: 7, matches: 4 }), '7 turns for 4 pairs is not better than 9 for 6');
  const ev = [{ type: TYPE, level: 1, score: 60, accuracy: 0.7, matches: 6, turns: 14, mode: 'calm' }, { type: TYPE, level: 1, score: 60, accuracy: 1, matches: 6, turns: 9, mode: 'calm' }];
  assert.equal(bests(ev, TYPE, 'calm', fewerTurns)[1].turns, 9);
});
