// Word game: a quick vocabulary quiz with an answer marked right or wrong the moment it is given.
// Pure logic (no DOM), so it is unit-tested. Words come from the lessons' vocabulary lists.
//
// Each CEFR level has three stages, ordered like the retrieval ladder in research C1 (D7): recognising the
// meaning, recalling the English word, then producing it in a sentence.
//   1 meaning    English word -> choose the Hebrew meaning
//   2 english    Hebrew meaning -> choose the English word
//   3 complete   a sentence with the word missing -> type it (first letter and length shown)
// A round is 10 questions. A right answer scores 10 points plus a small speed bonus; a wrong one scores 0.
// Every level's first stage is open; the next stage opens at 70% or better in the one before.
// The game is practice: it does not change the learner's level (skill levels need lesson evidence).
import { shuffle } from './util.js';
import { normalize } from './grading.js';

export const STAGES = [
  { id: 1, key: 'meaning', he: 'מה הפירוש?', en: 'What does it mean?', hintHe: 'מילה באנגלית, בוחרים את הפירוש בעברית', hintEn: 'An English word: choose its Hebrew meaning' },
  { id: 2, key: 'english', he: 'איך אומרים באנגלית?', en: 'Say it in English', hintHe: 'פירוש בעברית, בוחרים את המילה באנגלית', hintEn: 'A Hebrew meaning: choose the English word' },
  { id: 3, key: 'complete', he: 'השלמת מילים', en: 'Complete the sentence', hintHe: 'משפט עם מילה חסרה: מקלידים אותה', hintEn: 'A sentence with a missing word: type it' },
];
export const ROUND = 10;
export const UNLOCK = 0.7;
export const POINTS = 10;
// Speed bonus by the time taken to answer: choosing is quicker than typing.
const BONUS = { choice: [[3000, 5], [6000, 3], [10000, 1]], typed: [[8000, 5], [15000, 3], [25000, 1]] };
export const MAX_SCORE = ROUND * (POINTS + 5);

const wordRe = (w) => new RegExp(`(?<![A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'i');

// The words of one level, from that level's lessons, without duplicates.
export function wordPool(lessons, level) {
  const seen = new Set();
  const out = [];
  for (const l of lessons) {
    if (l.level !== level) continue;
    for (const v of l.vocab || []) {
      const key = v.word.trim().toLowerCase();
      if (!v.he || seen.has(key)) continue;
      seen.add(key);
      out.push({ word: v.word.trim(), he: v.he, pos: v.pos || '', example: v.example || '', ipa: v.ipa || '', lesson: l.id, level, src: v });
    }
  }
  return out;
}

// A sentence can be used for completion only when it contains the word exactly as written.
export const completable = (w) => Boolean(w.example) && wordRe(w.word).test(w.example);

// Up to n other options: same part of speech first, never a duplicate of the answer's text.
function distractors(pool, target, field, n, seed) {
  const answer = normalize(target[field]);
  const used = new Set([answer]);
  const pick = [];
  const same = shuffle(pool.filter((w) => w !== target && w.pos === target.pos), seed);
  const rest = shuffle(pool.filter((w) => w !== target && w.pos !== target.pos), seed + 0.37);
  for (const w of [...same, ...rest]) {
    const v = normalize(w[field]);
    if (used.has(v)) continue;
    used.add(v);
    pick.push(w[field]);
    if (pick.length === n) break;
  }
  return pick;
}

// One round of questions for a level and stage. seed makes it reproducible (tests); omit it in the app.
export function makeRound(pool, stage, { seed = Math.random(), n = ROUND } = {}) {
  const usable = stage === 3 ? pool.filter(completable) : pool;
  const words = shuffle(usable, seed).slice(0, n);
  return words.map((w, i) => {
    const s = seed + (i + 1) / 97;
    if (stage === 3) {
      const m = w.example.match(wordRe(w.word));
      const before = w.example.slice(0, m.index);
      const after = w.example.slice(m.index + m[0].length);
      return { type: 'typed', word: w, answer: m[0], before, after, hint: maskWord(m[0]) };
    }
    const field = stage === 1 ? 'he' : 'word';
    const options = shuffle([w[field], ...distractors(pool, w, field, 3, s)], s + 0.5);
    return { type: 'choice', word: w, prompt: stage === 1 ? w.word : w.he, options, answer: options.indexOf(w[field]) };
  });
}

// "always" -> "a _ _ _ _ _", "last night" -> "l _ _ _   n _ _ _ _": the first letter of each word shows, and
// spaces, hyphens and apostrophes keep their place so the answer's shape is visible.
export function maskWord(word) {
  const chars = [...word];
  return chars.map((c, i) => (!/[A-Za-z]/.test(c) || i === 0 || !/[A-Za-z]/.test(chars[i - 1] === "'" ? 'x' : chars[i - 1]) ? c : '_')).join(' ');
}

// Typed answers: case, curly quotes and surrounding punctuation do not matter; spelling does.
export const typedCorrect = (input, answer) => normalize(input) === normalize(answer);

export function scoreFor(correct, ms, type = 'choice') {
  if (!correct) return 0;
  const bonus = (BONUS[type] || BONUS.choice).find(([limit]) => ms <= limit)?.[1] || 0;
  return POINTS + bonus;
}

// Best results per level and stage, from the "game-round" events the view logs at the end of each round.
export function bests(events) {
  const out = {};
  for (const e of events) {
    if (e.type !== 'game-round') continue;
    const k = `${e.level}:${e.stage}`;
    const b = out[k] || { score: 0, accuracy: 0, rounds: 0 };
    out[k] = { score: Math.max(b.score, e.score || 0), accuracy: Math.max(b.accuracy, e.accuracy || 0), rounds: b.rounds + 1 };
  }
  return out;
}

export const unlocked = (best, level, stage) => stage === 1 || (best[`${level}:${stage - 1}`]?.accuracy || 0) >= UNLOCK;
