// Spaced repetition on FSRS (ts-fsrs, vendored). Cards are graded objectively from what the learner
// did, never by self-rating buttons (research C1, D4): wrong -> Again; right after a hint or slowly
// -> Hard; right -> Good; Easy only when fast and the card has already been passed twice.
import { fsrs, generatorParameters, createEmptyCard, Rating, State } from '../../vendor/ts-fsrs.mjs';

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
export function vocabCardsFor(lesson, existing, now = new Date()) {
  const have = new Set(existing.map((c) => c.id));
  const out = [];
  for (const v of lesson.vocab || []) {
    const id = `v:${v.word.toLowerCase()}:meaning`;
    if (!have.has(id)) out.push(newCard({ id, kind: 'meaning', ref: { word: v.word, lesson: lesson.id } }, now));
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
