// Picture matching game: English words matched to pictures, marked right or wrong the moment a pair is chosen.
// Pure logic (no DOM), unit-tested. Words and pictures come from content/pictures.json (three levels).
//
// A round is 3 boards. Each board shows a level's number of pictures (4, 5 or 6) and the same number of
// words in another order; the learner picks a picture and a word (either first). A right pair stays matched;
// a wrong pair is marked at once and counts as a mistake.
// Score: 10 points per pair. Only in the opt-in speed challenge, minus 3 per mistake (the two together never below
// 0) and plus a bonus for finishing a board quickly; in the calm default a mistake costs nothing (UX r4 PG-3) and is
// reported apart, as accuracy.
// Accuracy is pairs / (pairs + mistakes); level 2 opens at 70% in level 1, level 3 at 70% in level 2. Levels up to
// the learner's course level are open from the start (placement is evidence): a set opens when the course level
// reaches the top of its CEFR range (level 3, "A2–B1", for a B1 learner).
// The game is practice: it does not change the learner's level.
import { shuffle } from './util.js';

export const BOARDS = 3;
export const UNLOCK = 0.7;
export const MATCH = 10;
export const MISTAKE = 3;
// Board bonus (challenge mode only) by time per pair: up to 4 s a pair +5, up to 7 s a pair +2.
export const BOARD_BONUS = [[4000, 5], [7000, 2]];
export const maxFor = (pairs, boards = BOARDS, challenge = false) => boards * (pairs * MATCH + (challenge ? BOARD_BONUS[0][1] : 0));

export function boardBonus(ms, pairs) {
  return BOARD_BONUS.find(([perPair]) => ms <= perPair * pairs)?.[1] || 0;
}
// The round's score: pairs less mistakes (never below 0), plus the boards' speed bonuses. Shown the same way while
// playing. mistakeCost: MISTAKE in the challenge, 0 in the calm default.
export const roundScore = (matches, mistakes, bonus = 0, mistakeCost = MISTAKE) => Math.max(0, matches * MATCH - mistakes * mistakeCost) + bonus;
export const mistakeCostOf = (challenge) => (challenge ? MISTAKE : 0);
export const accuracyOf = (matches, mistakes) => (matches + mistakes ? matches / (matches + mistakes) : 0);

// The boards of a round. Words missed last time (focus) fill the first boards; words seen in recent rounds come last.
// `apart` lists pairs of words whose pictures look alike: they never share a board (when there is any way to avoid it).
export function makeBoards(words, pairs, { seed = Math.random(), boards = BOARDS, focus = [], recent = [], apart = [] } = {}) {
  const lower = (w) => w.word.toLowerCase();
  const first = [...new Set(focus.map((f) => words.find((w) => lower(w) === f.toLowerCase())).filter(Boolean))];
  const seen = new Set(recent.map((r) => r.toLowerCase()));
  const rest = shuffle(words.filter((w) => !first.includes(w)), seed);
  const focusFirst = shuffle(first, seed + 0.21);
  const others = [...rest.filter((w) => !seen.has(lower(w))), ...rest.filter((w) => seen.has(lower(w)))];
  const clash = new Map();
  for (const [x, y] of apart) for (const [p, q] of [[x, y], [y, x]]) (clash.get(p) || clash.set(p, new Set()).get(p)).add(q);
  const groups = Array.from({ length: Math.min(boards, Math.floor((first.length + others.length) / pairs)) }, () => []);
  const room = (g) => g.length < pairs;
  const clashes = (g, w) => g.some((o) => clash.get(o.word)?.has(w.word));
  // Missed words first, and every one of them is used: when the only board with room holds a missed word's
  // look-alike, a word from a full board where it fits moves over to make space. (With a single board there is
  // nowhere to move: the look-alike waits for a later round.)
  const waiting = [];
  for (const w of focusFirst.slice(0, pairs * groups.length)) {
    const g = groups.find((x) => room(x) && !clashes(x, w));
    if (g) { g.push(w); continue; }
    const r = groups.find(room);
    const swap = groups.flatMap((x) => (x === r ? [] : x.map((y, i) => [x, i, y]))).find(([x, i, y]) => !clashes(x.filter((_, j) => j !== i), w) && !clashes(r, y));
    if (swap) { const [x, i, y] = swap; x[i] = w; r.push(y); } else waiting.push(w);
  }
  // Then the other words in order; one that would sit next to its look-alike waits, used only if nothing else is left.
  for (const w of others) {
    if (!groups.some(room)) break;
    const g = groups.find((x) => room(x) && !clashes(x, w));
    if (g) g.push(w); else waiting.push(w);
  }
  for (const w of waiting) groups.find(room)?.push(w);
  const out = [];
  for (const [b, set] of groups.entries()) {
    // Pictures and words in two different orders, with no word in the same place as its picture: a word that
    // landed there swaps with its neighbour (one pass is enough, since the words are all different).
    const picOrder = shuffle(set, seed + b / 7 + 0.9);
    const wordsOrder = shuffle(set, seed + b / 7 + 0.5);
    if (pairs > 1) for (let k = 0; k < pairs; k++) {
      if (wordsOrder[k] !== picOrder[k]) continue;
      const j = (k + 1) % pairs;
      [wordsOrder[k], wordsOrder[j]] = [wordsOrder[j], wordsOrder[k]];
    }
    out.push({ pictures: picOrder, words: wordsOrder });
  }
  return out;
}

// The best round per level from the "picture-round" events (or another game's, by type): higher accuracy first,
// then the score (or another order, `better`). With a mode ('calm' or 'challenge'), only the rounds played in that
// mode count; rounds saved before modes existed were played with the bonus, so they count as 'challenge'.
export function bests(events, type = 'picture-round', mode = null, better = isBetter) {
  const out = {};
  for (const e of events) {
    if (e.type !== type || (mode && (e.mode === 'calm' ? 'calm' : 'challenge') !== mode)) continue;
    const b = out[e.level];
    const rounds = (b?.rounds || 0) + 1;
    out[e.level] = better(b, e) ? { score: e.score, accuracy: e.accuracy, mistakes: e.mistakes, turns: e.turns, matches: e.matches, rounds } : { ...b, rounds };
  }
  return out;
}
export const isBetter = (prev, round) => !prev || round.accuracy > prev.accuracy || (round.accuracy === prev.accuracy && round.score > prev.score);
// openTo: the highest level open without a round before it (openUpTo, from the course level).
export const unlocked = (best, level, openTo = 1) => level <= Math.max(1, openTo) || (best[level - 1]?.accuracy || 0) >= UNLOCK;

// CEFR levels in order, as the course names them; a set's range is written "Pre-A1–A1".
const CEFR = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const cefrIndex = (x) => CEFR.indexOf(String(x || '').trim().replace(/^Pre-?A1$/i, 'PreA1'));
export const topCefr = (range) => String(range || '').split('–').pop().trim().replace(/^Pre-?A1$/i, 'PreA1');
// The highest set level whose whole range is at or below the course level (1 when none is).
export function openUpTo(sets, courseLevel) {
  const c = cefrIndex(courseLevel);
  return Math.max(1, ...(sets || []).filter((s) => c >= 0 && cefrIndex(topCefr(s.cefr)) >= 0 && cefrIndex(topCefr(s.cefr)) <= c).map((s) => s.level));
}

export const recentWords = (events, level, rounds = 2, type = 'picture-round') => events
  .filter((e) => e.type === type && e.level === level && Array.isArray(e.words))
  .sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, rounds).flatMap((e) => e.words);
