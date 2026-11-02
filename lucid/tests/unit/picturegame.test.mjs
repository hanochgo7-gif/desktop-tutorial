// Picture matching game: the picture vocabulary, boards, scores, bests and level unlocking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PICTURES } from '../../js/ui/picture-icons.js';
import { BOARDS, UNLOCK, makeBoards, roundScore, boardBonus, accuracyOf, maxFor, bests, isBetter, unlocked, recentWords, openUpTo, topCefr } from '../../js/core/picturegame.js';

const data = JSON.parse(readFileSync(new URL('../../content/pictures.json', import.meta.url), 'utf8'));

test('three levels; every word has a Hebrew meaning and a picture; no word or picture is used twice', () => {
  assert.deepEqual(data.sets.map((s) => s.level), [1, 2, 3]);
  const words = new Set(), icons = new Set();
  for (const set of data.sets) {
    assert.ok(set.words.length >= set.pairs * BOARDS * 2, `level ${set.level}: too few words for varied rounds`);
    assert.ok(set.name_he && set.name_en && set.cefr);
    for (const w of set.words) {
      assert.ok(/^[A-Za-z][A-Za-z '-]*$/.test(w.word) && w.word.trim() === w.word, `"${w.word}"`);
      assert.ok(/[֐-׿]/.test(w.he) && !/[A-Za-z]/.test(w.he), `${w.word}: "${w.he}"`);
      assert.ok(PICTURES[w.icon], `${w.word}: no picture "${w.icon}"`);
      assert.ok(/^<(path|circle|rect|line|polyline|polygon|ellipse)\b/.test(PICTURES[w.icon].trim()), `${w.icon}: not SVG shapes`);
      assert.ok(!/<script|on\w+=|href=/i.test(PICTURES[w.icon]), `${w.icon}: unsafe markup`);
      if (w.us) assert.ok(/^[a-z][a-z '-]*$/.test(w.us) && w.us !== w.word, `${w.word}: US form "${w.us}"`);
      assert.ok(!words.has(w.word), `word used twice: ${w.word}`);
      assert.ok(!icons.has(w.icon), `picture used twice: ${w.icon}`);
      words.add(w.word); icons.add(w.icon);
    }
  }
});

test('a round is three boards of the level\'s pair count, ten words never repeat, and no picture sits above its word', () => {
  for (const set of data.sets) for (let r = 0; r < 30; r++) {
    const boards = makeBoards(set.words, set.pairs, { seed: r / 30 + 0.011 });
    assert.equal(boards.length, BOARDS);
    const all = boards.flatMap((b) => b.pictures.map((w) => w.word));
    assert.equal(new Set(all).size, set.pairs * BOARDS, 'a word came twice in one round');
    for (const b of boards) {
      assert.equal(b.pictures.length, set.pairs);
      assert.deepEqual([...b.pictures].sort((x, y) => x.word.localeCompare(y.word)), [...b.words].sort((x, y) => x.word.localeCompare(y.word)), 'words and pictures differ');
      assert.ok(b.pictures.every((w, k) => b.words[k] !== w), 'a word is in the same place as its picture');
    }
  }
});

test('pictures that look alike never share a board, even when both were missed last time', () => {
  for (const set of data.sets) {
    const names = new Set(set.words.map((w) => w.word));
    for (const pair of set.apart || []) assert.ok(pair.length === 2 && pair.every((w) => names.has(w)), `level ${set.level}: apart ${pair}`);
    for (let r = 0; r < 40; r++) {
      const focus = (set.apart || []).flat();
      for (const opts of [{ seed: r / 40 + 0.017 }, { seed: r / 40 + 0.017, focus }]) {
        const boards = makeBoards(set.words, set.pairs, { ...opts, apart: set.apart });
        assert.equal(boards.length, BOARDS);
        for (const b of boards) {
          const on = new Set(b.pictures.map((w) => w.word));
          for (const [x, y] of set.apart || []) assert.ok(!(on.has(x) && on.has(y)), `level ${set.level}: ${x} and ${y} on one board`);
        }
        if (opts.focus) for (const w of focus) assert.ok(boards.some((b) => b.pictures.some((p) => p.word === w)), `${w} missing from a focus round`);
      }
    }
  }
});

test('a round of missed words keeps every one of them, even with look-alikes among them', () => {
  for (const set of data.sets) for (let r = 0; r < 300; r++) {
    // A whole previous round missed, look-alikes included (as after "Play with these words").
    const [x, y] = set.apart[r % set.apart.length];
    const others = makeBoards(set.words.filter((w) => w.word !== x && w.word !== y), set.pairs, { seed: r / 300 + 0.003 }).flatMap((b) => b.pictures.map((w) => w.word));
    const focus = [x, y, ...others].slice(0, set.pairs * BOARDS);
    const boards = makeBoards(set.words, set.pairs, { seed: (r * 7 % 300) / 300 + 0.001, focus, apart: set.apart });
    const got = boards.flatMap((b) => b.pictures.map((w) => w.word));
    assert.deepEqual([...got].sort(), [...focus].sort(), `level ${set.level}: a missed word was left out`);
    for (const b of boards) {
      const on = new Set(b.pictures.map((w) => w.word));
      for (const [p, q] of set.apart) assert.ok(!(on.has(p) && on.has(q)), `level ${set.level}: ${p} and ${q} on one board`);
    }
  }
});

test('boards are reproducible, prefer words not seen lately and can start with missed words', () => {
  const set = data.sets[0];
  const a = makeBoards(set.words, set.pairs, { seed: 0.4 }), b = makeBoards(set.words, set.pairs, { seed: 0.4 });
  const words = (x) => x.flatMap((bd) => bd.pictures.map((w) => w.word));
  assert.deepEqual(words(a), words(b));
  const recent = words(a);
  assert.ok(words(makeBoards(set.words, set.pairs, { seed: 0.4, recent })).every((w) => !recent.includes(w)), 'recent words came back first');
  const focus = recent.slice(0, 3);
  const f = makeBoards(set.words, set.pairs, { seed: 0.8, focus })[0].pictures.map((w) => w.word);
  for (const w of focus) assert.ok(f.includes(w), `${w} missing from the first board of a focus round`);
});

test('score: 10 a pair, 3 off a mistake (never below 0), a bonus for a quick board in the speed challenge; accuracy is pairs over attempts', () => {
  assert.equal(roundScore(12, 0, 15), 135);
  assert.equal(roundScore(12, 2, 0), 114);
  assert.equal(roundScore(1, 5, 2), 2, 'pairs less mistakes stops at 0');
  assert.equal(boardBonus(15000, 4), 5);
  assert.equal(boardBonus(25000, 4), 2);
  assert.equal(boardBonus(40000, 4), 0);
  assert.equal(boardBonus(20000, 6), 5, 'bigger boards get more time');
  assert.equal(maxFor(4), 120, 'no bonus in the calm default');
  assert.equal(maxFor(4, BOARDS, true), 135);
  assert.equal(maxFor(6, BOARDS, true), 195);
  assert.equal(accuracyOf(12, 4), 0.75);
  assert.equal(accuracyOf(0, 0), 0);
});

test('the best round ranks accuracy first; the next level opens at 70%', () => {
  const ev = [
    { type: 'picture-round', level: 1, score: 130, accuracy: 0.8, mistakes: 3 },
    { type: 'picture-round', level: 1, score: 120, accuracy: 1, mistakes: 0 },
    { type: 'picture-round', level: 1, score: 50, accuracy: 0.5, mistakes: 12 },
    { type: 'game-round', level: 1, score: 150, accuracy: 1 },
  ];
  const b = bests(ev);
  assert.deepEqual(b[1], { score: 120, accuracy: 1, mistakes: 0, rounds: 3 }, 'one round, not a mix');
  assert.ok(isBetter(b[1], { accuracy: 1, score: 121 }) && !isBetter(b[1], { accuracy: 0.9, score: 200 }));
  assert.ok(unlocked(b, 1) && unlocked(b, 2) && !unlocked(b, 3));
  assert.ok(!unlocked(bests(ev.slice(2)), 2), '50% is not enough');
  assert.ok(unlocked(bests([{ type: 'picture-round', level: 1, score: 1, accuracy: UNLOCK }]), 2), 'exactly 70% is enough');
});

test('levels up to the course level are open from the start: a set opens when the course level reaches the top of its range', () => {
  assert.deepEqual(data.sets.map((s) => topCefr(s.cefr)), ['A1', 'A2', 'B1']);
  assert.equal(openUpTo(data.sets, 'PreA1'), 1);
  assert.equal(openUpTo(data.sets, 'A1'), 1);
  assert.equal(openUpTo(data.sets, 'A2'), 2);
  assert.equal(openUpTo(data.sets, 'B1'), 3);
  assert.equal(openUpTo(data.sets, 'C2'), 3);
  assert.equal(openUpTo(data.sets, undefined), 1);
  assert.ok(unlocked({}, 3, openUpTo(data.sets, 'B1')), 'a B1 learner plays level 3 at once');
  assert.ok(!unlocked({}, 3, openUpTo(data.sets, 'A2')), 'above the course level, 70% still opens a level');
  assert.ok(unlocked({ 2: { accuracy: 0.7 } }, 3, 2));
  const ev = [{ type: 'picture-round', level: 1, score: 120, accuracy: 1 }, { type: 'picture-round', level: 1, score: 90, accuracy: 0.8, mode: 'calm' }];
  assert.equal(bests(ev, 'picture-round', 'calm')[1].score, 90);
  assert.equal(bests(ev, 'picture-round', 'challenge')[1].score, 120);
});

test('recent words come from the last two rounds of that level', () => {
  const ev = [
    { type: 'picture-round', level: 1, at: '2026-11-01', words: ['a', 'b'] },
    { type: 'picture-round', level: 1, at: '2026-11-02', words: ['c'] },
    { type: 'picture-round', level: 2, at: '2026-11-02', words: ['z'] },
    { type: 'picture-round', level: 1, at: '2026-10-01', words: ['old'] },
  ];
  assert.deepEqual(recentWords(ev, 1), ['c', 'a', 'b']);
});
