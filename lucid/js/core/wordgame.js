// Word game: a quick vocabulary quiz with an answer marked right or wrong the moment it is given.
// Pure logic (no DOM), so it is unit-tested. Words come from the lessons' vocabulary lists.
//
// Each CEFR level has three stages, ordered like the retrieval ladder in research C1 (D7): recognising the
// meaning, recalling the English word, then producing it in a sentence.
//   1 meaning    English word -> choose the Hebrew meaning
//   2 english    Hebrew meaning -> choose the English word
//   3 complete   a sentence with the word missing -> type it (first letter of each word and length shown)
// A round is 10 questions. A right answer scores 10 points; a wrong one scores 0. In the opt-in speed challenge a
// quick right answer also earns a small bonus.
// Every level's first stage is open; the next stage opens at 70% or better in the one before.
// The game is practice: it does not change the learner's level (skill levels need lesson evidence).
import { shuffle } from './util.js';
import { normalize, checkTyped } from './grading.js';

export const STAGES = [
  { id: 1, key: 'meaning', he: 'מה הפירוש?', en: 'What does it mean?', hintHe: 'מילה באנגלית, בוחרים את הפירוש בעברית', hintEn: 'An English word: choose its Hebrew meaning' },
  { id: 2, key: 'english', he: 'איך אומרים באנגלית?', en: 'Say it in English', hintHe: 'פירוש בעברית, בוחרים את המילה באנגלית', hintEn: 'A Hebrew meaning: choose the English word' },
  { id: 3, key: 'complete', he: 'השלמת מילים', en: 'Complete the sentence', hintHe: 'משפט עם מילה חסרה: מקלידים אותה', hintEn: 'A sentence with a missing word: type it' },
];
export const ROUND = 10;
export const UNLOCK = 0.7;
export const POINTS = 10;
// Speed bonus (challenge mode only) by the time taken to answer: choosing is quicker than typing.
export const BONUS = { choice: [[3000, 5], [6000, 3], [10000, 1]], typed: [[8000, 5], [15000, 3], [25000, 1]] };
export const maxFor = (n, challenge = false) => n * (POINTS + (challenge ? BONUS.choice[0][1] : 0));
export const MAX_SCORE = maxFor(ROUND);

// How the three games are paced (PRODUCT.md: no time pressure except opt-in timed writing). Shared by the word
// quiz, the picture game and the memory game. One setting, "אתגר מהירות במשחקים" (game_speed_challenge; off unless
// set to true), is the same switch in Settings and on the games page (UX r4 PG-2):
//   calm      (off, the default) relaxed: nothing moves on by itself, a memory mismatch stays face up until the
//             next card is chosen, and a mistake costs no points.
//   challenge (on) quick answers earn a bonus, a right quiz answer moves on after a second (a wrong one always
//             waits), and mistakes and memory slips cost points.
// relaxed_pace is a legacy key derived from the switch (saved as !game_speed_challenge); it no longer decides
// anything. Each round is saved with its mode, and bests are kept apart for each mode.
export function paceOf(s = {}) {
  const challenge = s?.game_speed_challenge === true;
  return { relaxed: !challenge, challenge, mode: challenge ? 'challenge' : 'calm' };
}
// What the switch saves: the setting and its derived legacy key.
export const speedSetting = (on) => ({ game_speed_challenge: Boolean(on), relaxed_pace: !on });
// A right quiz answer moves on after this long, in the challenge only.
export const ADVANCE_MS = 1000;
// Rounds saved before the calm default were all scored with the speed bonus.
export const modeOf = (e) => (e?.mode === 'calm' ? 'calm' : 'challenge');

const LATIN = /[A-Za-z]/;
const escapeRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w, flags = 'i') => new RegExp(`(?<![A-Za-z])${escapeRe(w)}(?![A-Za-z])`, flags);

// The Hebrew meaning as a game shows it: no English inside it (it would give the answer away, as in
// "כבשה (ובאנגלית גם sheep)"), no grammar labels such as "(עבר של go)", and no "How old? = ..." clauses.
// The full meaning is still shown in the feedback after the answer.
export function gameMeaning(he) {
  const parts = String(he || '')
    .replace(/\([^)]*\)/g, (p) => (LATIN.test(p) || /עבר של|רבים|ברבים/.test(p) ? '' : p))
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim())
    .filter((s) => s && !LATIN.test(s) && !s.includes('='));
  return parts.join('; ').replace(/^[,;–-]\s*|\s*[,;–-]$/g, '').trim() || null;
}

// The separate senses of a Hebrew meaning, to keep two options with the same sense out of one question
// ("יתרון" and "תועלת; יתרון" are both right for "advantage").
export function senses(he) {
  return new Set(String(he || '')
    .replace(/\([^)]*\)/g, ' ')
    .split(/[;,/]|\s[-–]\s/)
    .map((s) => normalize(s).replace(/[^֐-׿ ]/g, '').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 1));
}
const shareSense = (a, b) => { for (const s of senses(a)) if (senses(b).has(s)) return true; return false; };

// "verb (past of go)" -> "verb past", "noun (plural)" -> "noun": so past forms meet other past forms.
export function posKey(pos) {
  const p = String(pos || '').toLowerCase();
  if (/past/.test(p)) return 'verb past';
  return p.replace(/\(.*?\)/g, '').trim();
}

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
      const meaning = gameMeaning(v.he);
      out.push({ word: v.word.trim(), he: v.he, meaning, pos: posKey(v.pos), example: v.example || '', ipa: v.ipa || '', lesson: l.id, level, src: v });
    }
  }
  return out;
}

// A sentence can be used for completion only when it contains the word exactly once, as written.
export const completable = (w) => Boolean(w.example) && (w.example.match(wordRe(w.word, 'gi')) || []).length === 1;
// Choice stages need a Hebrew meaning without English in it.
const choosable = (w) => Boolean(w.meaning);

// Up to n other options for a question: never the same text and never a shared sense; same part of speech first.
function distractors(pool, target, field, n, seed) {
  const used = new Set([normalize(target[field])]);
  const fits = (w) => w !== target && choosable(w) && !shareSense(w.he, target.he);
  const pick = [];
  const same = shuffle(pool.filter((w) => fits(w) && w.pos === target.pos), seed);
  const rest = shuffle(pool.filter((w) => fits(w) && w.pos !== target.pos), seed + 0.37);
  for (const w of [...same, ...rest]) {
    const v = normalize(w[field]);
    if (used.has(v) || [...pick].some((p) => shareSense(p.he, w.he))) continue;
    used.add(v);
    pick.push(w);
    if (pick.length === n) break;
  }
  return pick.map((w) => w[field]);
}

// Words not seen recently come first, so repeated rounds do not keep showing the same ten.
function chooseWords(usable, n, seed, { recent = [], focus = [] } = {}) {
  const seen = new Set(recent.map((w) => w.toLowerCase()));
  const first = focus.map((w) => usable.find((x) => x.word.toLowerCase() === w.toLowerCase())).filter(Boolean);
  const rest = shuffle(usable.filter((w) => !first.includes(w)), seed);
  const fresh = rest.filter((w) => !seen.has(w.word.toLowerCase()));
  const old = rest.filter((w) => seen.has(w.word.toLowerCase()));
  return [...first, ...fresh, ...old].slice(0, n);
}

// One round of questions. seed makes it reproducible (tests). focus puts given words in the round first (the
// words missed last time); recent lists words shown in recent rounds, which come last.
export function makeRound(pool, stage, { seed = Math.random(), n = ROUND, focus = [], recent = [] } = {}) {
  const usable = stage === 3 ? pool.filter(completable) : pool.filter(choosable);
  const words = chooseWords(usable, n, seed, { recent, focus });
  return shuffle(words, seed + 0.11).map((w, i) => {
    const s = seed + (i + 1) / 97;
    if (stage === 3) {
      const m = w.example.match(wordRe(w.word));
      return { type: 'typed', word: w, answer: m[0], before: w.example.slice(0, m.index), after: w.example.slice(m.index + m[0].length), hint: maskWord(m[0]), words: m[0].split(/\s+/).length };
    }
    const field = stage === 1 ? 'meaning' : 'word';
    const options = shuffle([w[field], ...distractors(pool, w, field, 3, s)], s + 0.5);
    return { type: 'choice', word: w, prompt: stage === 1 ? w.word : w.meaning, options, answer: options.indexOf(w[field]) };
  });
}

// The hint for a typed answer, word by word: the first letter of each word shows, the rest are slots.
// "last night" -> [["l", "_", "_", "_"], ["n", "_", "_", "_", "_"]]; hyphens and apostrophes stay.
export function maskWord(answer) {
  return answer.split(/\s+/).map((w) => [...w].map((c, i) => (!LATIN.test(c) || i === 0 || (!LATIN.test(w[i - 1]) && w[i - 1] !== "'") ? c : '_')));
}

// UK and US spellings both count. Only safe, regular pairs are listed (neighbour/neighbor, generalisation/
// generalization, centre/center, travelled/traveled, practise/practice, licence/license, defence/defense);
// any other one-letter difference passes as "almost" with a spelling note, as in the lessons.
const UKUS = [[/our(s?)\b/g, 'or$1'], [/isation/g, 'ization'], [/yse(s|d)?\b/g, 'yze$1'], [/tre(s?)\b/g, 'ter$1'],
  [/lled\b/g, 'led'], [/lling\b/g, 'ling'], [/\bpractise/g, 'practice'], [/\b(licen|defen|offen)ce/g, '$1se']];
export function spellings(answer) {
  const a = answer.toLowerCase();
  const out = new Set([a]);
  for (const [re, to] of UKUS) out.add(a.replace(re, to));
  return [...out];
}

// A typed answer is checked like the lessons check it (contractions, case and punctuation; a one-letter slip in
// a long word counts with a spelling note), and the other of a UK/US pair of spellings is accepted.
export function checkAnswer(input, answer) {
  const r = checkTyped(input, spellings(answer));
  const exact = r.correct && !r.almost;
  const variant = exact && spellings(answer).slice(1).some((v) => normalize(v) === normalize(input));
  return { correct: r.correct, almost: Boolean(r.almost), variant };
}
export const typedCorrect = (input, answer) => checkAnswer(input, answer).correct;

// The points for one answer. The speed bonus counts only in challenge mode.
export function scoreFor(correct, ms, type = 'choice', challenge = false) {
  if (!correct) return { points: 0, bonus: 0 };
  const bonus = challenge ? (BONUS[type] || BONUS.choice).find(([limit]) => ms <= limit)?.[1] || 0 : 0;
  return { points: POINTS + bonus, bonus };
}

// The best round per level and stage, from the "game-round" events logged at the end of each round: more right
// answers rank higher, then the score, so a perfect slow round beats a fast one with mistakes. With a mode, only
// the rounds played in that mode count (the bests shown); without one, every round counts (unlocking).
export function bests(events, mode = null) {
  const out = {};
  for (const e of events) {
    if (e.type !== 'game-round' || (mode && modeOf(e) !== mode)) continue;
    const k = `${e.level}:${e.stage}`;
    const b = out[k];
    const better = !b || (e.correct ?? 0) > b.correct || ((e.correct ?? 0) === b.correct && (e.score || 0) > b.score);
    const rounds = (b?.rounds || 0) + 1;
    out[k] = better ? { score: e.score || 0, correct: e.correct ?? 0, total: e.total || ROUND, accuracy: e.accuracy || 0, rounds } : { ...b, rounds };
  }
  return out;
}
export const isBetter = (prev, round) => !prev || round.correct > prev.correct || (round.correct === prev.correct && round.score > prev.score);

export const unlocked = (best, level, stage) => stage === 1 || (best[`${level}:${stage - 1}`]?.accuracy || 0) >= UNLOCK;

// The words shown in a level and stage's last few rounds (from the events), so the next round prefers others.
export const recentWords = (events, level, stage, rounds = 2) => events
  .filter((e) => e.type === 'game-round' && e.level === level && e.stage === stage && Array.isArray(e.words))
  .sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, rounds).flatMap((e) => e.words);
