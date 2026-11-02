// Spaced repetition on FSRS (ts-fsrs, vendored). Cards are graded objectively from what the learner
// did, never by self-rating buttons (research C1, D4): wrong -> Again; right after a hint or slowly
// -> Hard; right -> Good; Easy only when fast and the card has already been passed twice.
import { fsrs, generatorParameters, createEmptyCard, Rating, State } from '../../vendor/ts-fsrs.mjs';
import { shuffle } from './util.js';

export { Rating, State };
export const RETENTION = { light: 0.85, standard: 0.9, exam: 0.95 };
const MAX_INTERVAL = 3650;
// Meaning-recall cards unlock their form-recall (Hebrew -> English) card at this stability (C1, D7).
export const FORM_UNLOCK_STABILITY = 7;

const schedulers = new Map();
function scheduler(mode = 'standard') {
  if (!schedulers.has(mode)) {
    schedulers.set(mode, fsrs(generatorParameters({ request_retention: RETENTION[mode] ?? 0.9, maximum_interval: MAX_INTERVAL, enable_fuzz: true })));
  }
  return schedulers.get(mode);
}

const toCard = (s) => ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined });
const fromCard = (c) => ({ ...c, due: c.due.toISOString(), last_review: c.last_review ? c.last_review.toISOString() : null });

// kind: 'meaning' (see English, recall meaning), 'form' (see Hebrew, produce English), 'grammar' (a topic review set)
export function newCard({ id, kind, ref }, now = new Date()) {
  return { id, kind, ref, fsrs: fromCard(createEmptyCard(now)), created_at: now.toISOString(), log: [] };
}

export function gradeFrom({ correct, hintUsed = false, slow = false, fast = false, reps = 0 }) {
  if (!correct) return Rating.Again;
  if (hintUsed || slow) return Rating.Hard;
  if (fast && reps >= 2) return Rating.Easy;
  return Rating.Good;
}

// Returns the updated card record (pure; the caller stores it).
export function review(card, rating, { now = new Date(), mode = 'standard', latencyMs = null, exercise = null, hintUsed = false } = {}) {
  const { card: next } = scheduler(mode).next(toCard(card.fsrs), now, rating);
  const entry = { ts: now.toISOString(), rating, latency_ms: latencyMs, exercise, hint_used: hintUsed };
  return { ...card, fsrs: fromCard(next), log: [...(card.log || []).slice(-19), entry] };
}

export function retrievability(card, now = new Date(), mode = 'standard') {
  if (!card?.fsrs || card.fsrs.state === State.New) return 0;
  return scheduler(mode).get_retrievability(toCard(card.fsrs), now, false);
}

export const isDue = (card, now = new Date()) => !card._deleted && new Date(card.fsrs.due) <= now;

// Due cards, most overdue (lowest retrievability) first.
export function dueCards(cards, now = new Date(), mode = 'standard') {
  return cards.filter((c) => isDue(c, now))
    .map((c) => ({ c, r: retrievability(c, now, mode) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.c);
}

// Cards to create when a lesson's vocabulary is learned, and form cards that have unlocked.
// via names where a card came from when it was not a finished lesson (e.g. 'game' for a word missed in the game).
export function vocabCardsFor(lesson, existing, now = new Date(), via = null) {
  const have = new Set(existing.map((c) => c.id));
  const out = [];
  for (const v of lesson.vocab || []) {
    const id = `v:${v.word.toLowerCase()}:meaning`;
    if (!have.has(id)) out.push(newCard({ id, kind: 'meaning', ref: { word: v.word, lesson: lesson.id, ...(via ? { via } : {}) } }, now));
  }
  return out;
}
export function unlockedFormCards(cards, now = new Date()) {
  const have = new Set(cards.map((c) => c.id));
  return cards
    .filter((c) => c.kind === 'meaning' && !c._deleted && c.fsrs.stability >= FORM_UNLOCK_STABILITY)
    .map((c) => c.id.replace(/:meaning$/, ':form'))
    .filter((id) => !have.has(id))
    .map((id) => newCard({ id, kind: 'form', ref: cards.find((c) => c.id === id.replace(/:form$/, ':meaning')).ref }, now));
}

// Workload governor (C1, D3): the learner's daily new-word setting (default 8), cut to 4 when the coming week's
// reviews would take more than 12 minutes a day (about 8 seconds per review). Light weeks keep the setting; the
// 15-a-day maximum is the highest value the setting offers, not an automatic increase.
export function newItemsBudget(cards, { base = 8, now = new Date() } = {}) {
  const week = new Date(now.getTime() + 7 * 86_400_000);
  const upcoming = cards.filter((c) => !c._deleted && c.fsrs.state !== State.New && new Date(c.fsrs.due) <= week).length;
  const minutesPerDay = (upcoming * 8) / 60 / 7;
  if (minutesPerDay > 12) return Math.min(base, 4);
  return base;
}

// ---------- meaning options (the recognition rung: an English word, choose its Hebrew meaning) ----------
// UX r3 PH-1: the options used to be shuffled with the card's position as the seed, so the right answer sat in the
// same places and the same three distractors came back on every card. Now each card is seeded by its id and the day,
// the distractors share the word's part of speech, and every option is a short gloss.

// A seed in [0, 1) from a string (FNV-1a): the same card shows the same options all day, other cards and days differ.
export function seedOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) / 4294967296;
}

const HE = /[א-ת]/;
const LATIN = /[A-Za-z]/;
const MAX_WORDS = 4;
// Keeps a prefix hyphen ("לנסוע ב-"); drops loose punctuation at the ends.
const tidy = (s) => String(s).replace(/\s+/g, ' ').replace(/^[\s,;:–-]+|[\s,;:]+$|\s+[–-]+$/g, '').trim();
const heWords = (s) => s.split(' ').filter((w) => HE.test(w)).length;
// The first MAX_WORDS Hebrew words, and whatever stands between them ("בן דוד / בת דודה").
function firstWords(s) {
  const out = [];
  let n = 0;
  for (const w of s.split(' ')) { if (HE.test(w) && ++n > MAX_WORDS) break; out.push(w); }
  return tidy(out.join(' '));
}
// The gloss an option shows: the text before "(" or ";", then the first comma sense when that is still long, and never
// more than four words. "כבשה (ברבים: …)" -> "כבשה"; "(ב)משרה חלקית" -> "משרה חלקית". cut: words had to be dropped.
export function glossParts(he) {
  const s = String(he || '');
  let g = tidy(s.split(/[(;]/)[0]);
  if (!HE.test(g)) g = tidy(s.replace(/\([^)]*\)/g, ' ').split(';')[0]);
  if (heWords(g) > MAX_WORDS) g = tidy(g.split(',')[0]);
  const cut = heWords(g) > MAX_WORDS;
  return { text: cut ? firstWords(g) : g, cut };
}
export const shortGloss = (he) => glossParts(he).text;

// The senses of a gloss, so two options never mean the same thing ("מבוגר/ת, זקן/ה" and "זקן").
function senses(he) {
  return new Set(String(he || '').replace(/\([^)]*\)/g, ' ').split(/[;,/]/)
    .map((x) => x.replace(/[^א-ת ]/g, '').replace(/\s+/g, ' ').trim()).filter((x) => x.length > 1));
}
const shareSense = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

// "verb (past of go)" -> "verb past", "noun (plural)" -> "noun"; the wider class is the fallback group.
export function posKey(pos) {
  const p = String(pos || '').toLowerCase();
  if (/past/.test(p)) return 'verb past';
  return p.replace(/\(.*?\)/g, '').trim();
}
const classOf = (key) => (key === 'verb past' ? key : /verb/.test(key) ? 'verb' : /noun/.test(key) ? 'noun' : /adj/.test(key) ? 'adjective' : key);

// target: a vocabulary entry ({ word, he, pos }). learned: the entries of the learner's own words; level: the entries
// of the curriculum at the word's level. used: Map(gloss -> times shown this session), so later cards prefer fresh
// distractors; sets: the distractor sets already shown this session, never shown twice while others fit. Returns
// { options, answer }, with fewer options when too few words fit.
export function meaningOptions(target, { learned = [], level = [], seed = Math.random(), used = new Map(), sets = new Set(), n = 3 } = {}) {
  const right = shortGloss(target.he);
  const key = posKey(target.pos);
  const cls = classOf(key);
  // An infinitive ("לבשל") would give itself away among nouns, so then every option is an infinitive; and an
  // infinitive never stands among the options of a word that is not a verb.
  const infinitive = cls === 'verb' && right.startsWith('ל');
  const tSenses = senses(target.he);
  const word = String(target.word || '').toLowerCase();
  const entry = (v) => {
    const g = glossParts(v.he);
    const k = posKey(v.pos);
    return { text: g.text, cut: g.cut, key: k, cls: classOf(k), senses: senses(v.he), word: String(v.word || '').toLowerCase() };
  };
  const isInfinitive = (e) => e.cls === 'verb' && e.text.startsWith('ל');
  const fits = (e) => e.text && !e.cut && HE.test(e.text) && !LATIN.test(e.text) && e.word !== word && e.text !== right
    && !shareSense(e.senses, tSenses) && (infinitive ? isInfinitive(e) : cls === 'verb' || !isInfinitive(e));
  const mine = learned.map(entry).filter(fits);
  const theirs = level.map(entry).filter(fits);
  const tiers = [
    mine.filter((e) => e.key === key),
    theirs.filter((e) => e.key === key),
    [...mine, ...theirs].filter((e) => e.cls === cls),
    [...mine, ...theirs],
  ];
  const draw = (s) => {
    const pick = [];
    const texts = new Set([right]);
    tiers.forEach((tier, ti) => {
      // Fresh distractors first within each group; the shuffle decides among equals.
      const order = shuffle(tier, (s + ti * 0.137) % 1).sort((a, b) => (used.get(a.text) || 0) - (used.get(b.text) || 0));
      for (const e of order) {
        if (pick.length === n) return;
        if (texts.has(e.text) || pick.some((p) => shareSense(p.senses, e.senses))) continue;
        texts.add(e.text);
        pick.push(e);
      }
    });
    return pick.map((e) => e.text);
  };
  const setKey = (xs) => [...xs].sort().join('|');
  let others = draw(seed);
  for (let k = 1; k < 6 && sets.has(setKey(others)); k++) others = draw((seed + k * 0.381) % 1);
  sets.add(setKey(others));
  for (const o of others) used.set(o, (used.get(o) || 0) + 1);
  const options = shuffle([right, ...others], (seed + 0.5) % 1);
  return { options, answer: options.indexOf(right) };
}
