// The exercise pool: every auto-graded exercise from the available lessons, with its lesson's level
// and topics, for targeted drills, level checks and the labs.
import { content } from './content.js';
import { shuffle, sum } from './util.js';
import { LEVELS, levelIndex } from './adaptive.js';

export const AUTO_TYPES = new Set(['mcq', 'gap', 'order', 'match', 'categorize', 'transform', 'correct', 'listen', 'dictation']);

// Competing structures for interleaved review (research C1, D11): practise each topic next to the
// one learners confuse it with.
export const COMPETITORS = {
  'present-simple': ['present-continuous'], 'present-continuous': ['present-simple'],
  'present-simple-vs-continuous': ['present-perfect'],
  'past-simple-regular': ['past-simple-irregular'], 'past-simple-irregular': ['past-simple-regular', 'present-perfect'],
  'present-perfect': ['past-simple-irregular'], 'present-perfect-vs-past': ['past-continuous'],
  'past-continuous': ['past-simple-regular'], 'past-perfect': ['present-perfect-vs-past'],
  'future-going-to-will': ['future-arrangements'], 'future-arrangements': ['future-going-to-will'],
  comparatives: ['superlatives'], superlatives: ['comparatives'],
  'countable-uncountable': ['quantifiers'], quantifiers: ['some-any'], 'some-any': ['quantifiers'],
  'conditionals-0-1': ['conditionals-2'], 'conditionals-2': ['conditionals-0-1', 'conditionals-3-mixed'], 'conditionals-3-mixed': ['conditionals-2'],
  'passive-intro': ['present-perfect'], 'passive-advanced': ['passive-intro'],
  'reported-speech-intro': ['reported-speech-advanced'], 'reported-speech-advanced': ['reported-speech-intro'],
  'articles-a-an': ['articles'], articles: ['articles-a-an'],
  'prepositions-place': ['prepositions-time'], 'prepositions-time': ['prepositions-place'],
  'modals-obligation-advice': ['modal-can'], 'modal-can': ['modals-obligation-advice'],
  'gerund-infinitive': ['modals-obligation-advice'], 'relative-clauses': ['pronouns-object'],
  'be-present': ['present-simple'], 'be-negative-questions': ['present-simple-questions-negatives'],
};

// Topics that train each error type (when no exercise is tagged with the error itself).
export const ERROR_TOPICS = {
  'copula-omission': ['be-present', 'be-negative-questions'],
  article: ['articles-a-an', 'articles'],
  'third-person-s': ['present-simple-third-person'],
  'do-support': ['present-simple-questions-negatives', 'past-simple-questions', 'wh-questions'],
  'word-order': ['word-order-basic', 'adjectives-basic', 'wh-questions', 'adverbs-frequency'],
  'tense-choice': ['present-simple-vs-continuous', 'present-perfect-vs-past', 'past-continuous', 'past-perfect'],
  'verb-form': ['past-simple-irregular', 'past-simple-regular', 'present-perfect'],
  agreement: ['be-present', 'present-simple-third-person', 'there-is-are'],
  'plural-form': ['plurals'],
  countability: ['countable-uncountable', 'quantifiers', 'some-any'],
  preposition: ['prepositions-place', 'prepositions-time'],
  pronoun: ['pronouns-subject', 'pronouns-object', 'possessives'],
  'modal-use': ['modal-can', 'modals-obligation-advice'],
  'conditional-form': ['conditionals-0-1', 'conditionals-2', 'conditionals-3-mixed'],
  'passive-form': ['passive-intro', 'passive-advanced'],
  'reported-speech': ['reported-speech-intro', 'reported-speech-advanced'],
  'gerund-infinitive': ['gerund-infinitive'],
  'relative-clause': ['relative-clauses'],
  'comparison-form': ['comparatives', 'superlatives'],
  cohesion: ['connectors-basic', 'connectors-contrast', 'cohesion-devices'],
  register: ['register'],
  'word-choice': ['collocations', 'phrasal-verbs-basic'],
  'false-friend': ['collocations', 'numbers'],
  capitalization: ['sentence-basics', 'alphabet'],
  punctuation: ['sentence-basics', 'connectors-basic'],
  spelling: ['alphabet', 'past-simple-regular'],
};

let cache = null;
export async function exercisePool() {
  if (cache) return cache;
  const lessons = await content.allLessons();
  cache = lessons.flatMap((l) => l.exercises.filter((e) => AUTO_TYPES.has(e.type)).map((ex) => ({
    ex, lesson: l.id, level: l.level, topic: ex.topic || l.topics[0], topics: l.topics,
    errors: new Set([ex.error_type, ...Object.values(ex.option_errors || {}), ...(ex.wrong_feedback || []).map((f) => f.error_type)].filter(Boolean)),
  })));
  return cache;
}

const recentlyRight = (attempts, now = Date.now()) => new Set(attempts.filter((a) => a.correct && now - new Date(a.at).getTime() < 86_400_000).map((a) => `${a.lesson}:${a.exercise}`));
const key = (p) => `${p.lesson}:${p.ex.id}`;

// A targeted set: ~70% target items, ~30% competing items, interleaved, avoiding items the learner
// got right in the last 24 hours when there is enough choice.
export async function drillSet({ topic = null, error = null, level = null, size = 8, attempts = [] }) {
  const pool = await exercisePool();
  const fresh = recentlyRight(attempts);
  const maxLevel = level ? levelIndex(level) + 1 : LEVELS.length - 1;
  const eligible = pool.filter((p) => levelIndex(p.level) <= maxLevel);
  let target = [];
  if (topic) target = eligible.filter((p) => p.topic === topic || p.topics.includes(topic));
  if (error) {
    target = eligible.filter((p) => p.errors.has(error));
    if (target.length < size) target = target.concat(eligible.filter((p) => (ERROR_TOPICS[error] || []).includes(p.topic) && !target.includes(p)));
  }
  const competitorTopics = topic ? COMPETITORS[topic] || [] : [];
  const competing = eligible.filter((p) => competitorTopics.includes(p.topic));
  const prefer = (list) => [...list.filter((p) => !fresh.has(key(p))), ...list.filter((p) => fresh.has(key(p)))];
  const nTarget = competing.length ? Math.ceil(size * 0.7) : size;
  const chosen = [...prefer(shuffle(target, Math.random())).slice(0, nTarget), ...prefer(shuffle(competing, Math.random())).slice(0, size - nTarget)];
  return shuffle(chosen, Math.random());
}

// A level check: one or two items from each lesson of the level, mixed (unassisted; research C2, D31).
export async function checkpointSet(level, size = 16) {
  const pool = (await exercisePool()).filter((p) => p.level === level);
  const byLesson = new Map();
  for (const p of shuffle(pool, Math.random())) { if (!byLesson.has(p.lesson)) byLesson.set(p.lesson, []); byLesson.get(p.lesson).push(p); }
  const out = [];
  let round = 0;
  while (out.length < size && round < 4) {
    for (const list of byLesson.values()) if (list[round] && out.length < size) out.push(list[round]);
    round++;
  }
  return shuffle(out, Math.random());
}

export const meanScore = (rs) => (rs.length ? sum(rs, (r) => r.points) / rs.length : 0);
