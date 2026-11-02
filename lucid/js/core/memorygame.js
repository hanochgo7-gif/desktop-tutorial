// Memory game: cards lie face down; turn two at a time to find each picture and its English word.
// Pure logic (no DOM), unit-tested. Words and pictures come from content/pictures.json (three levels).
//
// A round is one board of 6, 8 or 10 pairs (12, 16 or 20 cards), half pictures and half words; level 1 also
// offers a small board of 4 pairs. Each turn shows two cards and is marked at once: a match stays face up; a
// mismatch stays face up until the next card is chosen (with the calm pace off, it turns back after a moment).
// Not finding a pair is part of the game, so only a "slip" counts against accuracy: a mismatch on a turn whose
// first card's partner had already been seen (the learner had what was needed to find it). A slip is about
// where a card lay, not about the word; a "miss" is: a picture paired with a word card the learner had already
// seen (so chose knowing what it was), and that word is not the picture's. Only misses go on the list of words
// to go over.
// Score: 10 points per pair. In the opt-in speed challenge, minus 3 per slip (never below 0) and a bonus for
// finishing in few turns. Accuracy is pairs / (pairs + slips); level 2 opens at 70% in level 1, level 3 at 70% in
// level 2 (levels up to the course level are open from the start, as in the picture game).
// The game is practice: it does not change the learner's level.
import { shuffle } from './util.js';
import { makeBoards } from './picturegame.js';

export const UNLOCK = 0.7;
export const MATCH = 10;
export const SLIP = 3;
export const TYPE = 'memory-round';
export const SMALL = 4; // the small board at level 1: 4 pairs, 8 cards
// Bonus (challenge mode only) by turns used, as a multiple of the pairs: up to 1.5 turns a pair +10, up to 2 turns
// a pair +5. (With a perfect memory, finding n pairs takes about 1.6n turns on average.)
export const TURN_BONUS = [[1.5, 10], [2, 5]];
export const maxFor = (pairs, challenge = false) => pairs * MATCH + (challenge ? TURN_BONUS[0][1] : 0);
export const turnBonus = (turns, pairs) => TURN_BONUS.find(([perPair]) => turns <= perPair * pairs)?.[1] || 0;
// slipCost: SLIP in challenge mode, 0 in the calm default.
export const roundScore = (matches, slips, bonus = 0, slipCost = SLIP) => Math.max(0, matches * MATCH - slips * slipCost) + bonus;
export const accuracyOf = (matches, slips) => (matches + slips ? matches / (matches + slips) : 0);

// The cards of a round: `pairs` words (missed words first, look-alike pictures never together, words seen in
// recent rounds last), each as a picture card and a word card, shuffled.
export function makeDeck(words, pairs, { seed = Math.random(), focus = [], recent = [], apart = [] } = {}) {
  const [board] = makeBoards(words, pairs, { seed, boards: 1, focus, recent, apart });
  if (!board) return [];
  return shuffle(board.pictures.flatMap((w) => [{ kind: 'pic', w }, { kind: 'word', w }]), seed + 0.37);
}

export const partnerOf = (cards, i) => cards.findIndex((c, j) => j !== i && c.w === cards[i].w);

// One turn: cards a then b. `seen` holds the cards shown in earlier turns (not this one).
// miss: the picture's word (its card, a or b) when the turn paired a picture with a word card seen before.
export function judgeTurn(cards, a, b, seen) {
  if (cards[a].w === cards[b].w) return { match: true, slip: false, miss: null };
  const paired = cards[a].kind !== cards[b].kind && seen.has(b);
  return { match: false, slip: seen.has(partnerOf(cards, a)), miss: paired ? (cards[a].kind === 'pic' ? cards[a].w : cards[b].w) : null };
}

// The longest word of a card's text, in letters: the word card's type size is fitted to it (CSS --len).
export const longestWord = (text) => Math.max(1, ...String(text || '').split(/\s+/).map((x) => x.length));
