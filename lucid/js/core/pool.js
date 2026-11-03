// The exercise pool: every auto-graded exercise from the available lessons, with its lesson's level
// and topics, for targeted drills, level checks and the labs.
import { content } from './content.js';
import { shuffle, sum } from './util.js';
import { LEVELS, levelIndex } from './adaptive.js';
import { findWrongFeedback, wordAccuracy } from './grading.js';
import { sentenceDiff } from './diff.js';

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
  // Each item carries its lesson's Hebrew-speaker pitfalls, for "Why?" in drills (r4 LF-10).
  cache = lessons.flatMap((l) => l.exercises.filter((e) => AUTO_TYPES.has(e.type)).map((ex) => ({
    ex, lesson: l.id, level: l.level, topic: ex.topic || l.topics[0], topics: l.topics, pitfalls: l.hebrew_pitfalls || [],
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

// Points for one answer, the same in lessons, drills and level checks: right 1, right after a hint 0.75, right
// with a spelling slip 0.9, wrong up to 0.5. A reading text or a sort is scored per question (LF-9): 5 of 6
// right is 0.83, not "wrong".
export const PER_QUESTION = new Set(['read', 'categorize']);
export function answerPoints(r, hintUsed, type) {
  if (r.correct) return hintUsed ? 0.75 : r.almost ? 0.9 : 1;
  const s = Math.max(0, Math.min(1, Number(r.score) || 0));
  return PER_QUESTION.has(type) ? s : Math.min(0.5, s);
}
// Missed on the first try: a wrong answer (0.5 or less), or a reading text or sort under 80%.
export const isMissed = (points, type) => (PER_QUESTION.has(type) ? (points ?? 0) < 0.8 - 1e-9 : (points ?? 0) <= 0.5);

// ---------- the learner's own mistakes (LF-8, LF-12) ----------
// A short clip around a single gap ("We are go" / "We go"), or the whole text with every gap filled.
export function fillGaps(text, fills) {
  const parts = String(text || '').split('___');
  if (parts.length < 2) return null;
  if (parts.length === 2) {
    const before = parts[0].trim().split(/\s+/).filter(Boolean).slice(-3).join(' ');
    const after = before ? '' : parts[1].trim().split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    return [before, fills[0], after].filter(Boolean).join(' ').replace(/\s+([.,?!])/g, '$1');
  }
  return parts.map((p, i) => `${p}${i < parts.length - 1 ? (fills[i] ?? '…') : ''}`).join('').replace(/\s+/g, ' ').trim();
}
const firstOf = (a) => (Array.isArray(a) ? a[0] : a);
const fullFill = (text, fills) => String(text || '').split('___').map((p, i, all) => `${p}${i < all.length - 1 ? (fills[i] ?? '…') : ''}`).join('').replace(/\s+/g, ' ').trim();
// The accepted answer closest to what the learner wrote (the first one when nothing was written).
const closest = (said, answers) => (said ? answers.map((a) => ({ a, acc: wordAccuracy(said, a).accuracy })).sort((x, y) => y.acc - x.acc)[0].a : answers[0]);
// Only what changed (r4 LF-4): the word diff of the learner's text against the answer, with up to `context` words
// kept on each side of a change and the rest left out ({ type: 'gap' }). [{ type: 'same' | 'del' | 'add' | 'gap', text }].
export function clipDiff(parts, context = 3) {
  const words = parts.flatMap((p) => (p.type === 'same' ? p.text.split(' ').filter(Boolean).map((w) => ({ type: 'same', text: w })) : [p]));
  const changed = words.map((w, i) => (w.type !== 'same' ? i : -1)).filter((i) => i >= 0);
  if (!changed.length) return [];
  const keep = new Set();
  for (const i of changed) for (let k = i - context; k <= i + context; k++) if (k >= 0 && k < words.length) keep.add(k);
  const out = [];
  words.forEach((w, i) => {
    if (!keep.has(i)) { if (out.at(-1)?.type !== 'gap') out.push({ type: 'gap', text: '…' }); return; }
    const last = out.at(-1);
    if (last && last.type === w.type && w.type === 'same') last.text += ` ${w.text}`;
    else out.push({ ...w });
  });
  return out;
}
// The learner's words in the same order as the answer's: every word they share is in the answer's order.
export function sameOrder(said, key) {
  const bare = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const a = bare(said), b = bare(key);
  const count = new Map();
  for (const w of b) count.set(w, (count.get(w) || 0) + 1);
  let shared = 0;
  for (const w of a) if (count.get(w)) { shared++; count.set(w, count.get(w) - 1); }
  const lcs = sentenceDiff(a.join(' '), b.join(' ')).filter((p) => p.type === 'same').reduce((n, p) => n + p.text.split(' ').length, 0);
  return lcs === shared;
}
// What the learner gave next to the right form, and a note that explains this mistake (r4 LF-4). The note is the
// matched wrong answer's feedback or the chosen option's feedback first. The item's explanation is used only when
// it is about this mistake: the attempt's error type is the item's, or (with no error type to go by) the mistake
// is of the item's kind, so a word-order rule is never the note for a wrong verb ("Have you ever went…") and a form
// rule never the note for a sentence in the wrong order. Otherwise note is null and the player shows the error
// type's own note. attempt (optional): the stored attempt, for its error type.
// Returns { pair, diff, note, own, choice }: pair = [the learner's text, the right text] (checkpoint.js), diff =
// only the changed words for gap, transform, correct and dictation items, choice = a multiple-choice item.
export function mistakeNote(ex, response, attempt = null) {
  const said = String(response ?? '');
  const idk = !said || said === '(I don\'t know)';
  const choice = ['mcq', 'listen'].includes(ex.type);
  let pair = null;
  let diff = null;
  let note = null;
  let key = null;
  if (choice) {
    const k = ex.options.indexOf(said);
    note = k >= 0 ? ex.option_feedback?.[k] || null : null;
    if (!idk) pair = ex.question?.includes('___') ? [fillGaps(ex.question, [said]), fillGaps(ex.question, [ex.options[ex.answer]])] : [said, ex.options[ex.answer]];
  } else if (ex.type === 'gap') {
    const got = said.split(' | ');
    const f = got.map((g) => findWrongFeedback(g, ex.wrong_feedback)).find(Boolean);
    note = f?.feedback || null;
    const right = ex.answers.map(firstOf);
    if (!idk) {
      pair = [fillGaps(ex.text, got), fillGaps(ex.text, right)];
      diff = clipDiff(sentenceDiff(fullFill(ex.text, got), fullFill(ex.text, right)));
    }
  } else if (['transform', 'correct', 'dictation'].includes(ex.type)) {
    note = findWrongFeedback(said, ex.wrong_feedback)?.feedback || null;
    key = closest(idk ? '' : said, ex.answers.map(String));
    if (!idk) { pair = [said, key]; diff = clipDiff(sentenceDiff(said, key)); }
  } else if (ex.type === 'order') {
    key = ex.tokens.join(' ');
    if (!idk) pair = [said, key];
  }
  if (!note && ex.explanation) {
    const orderItem = ex.type === 'order' || ex.error_type === 'word-order';
    const explains = choice || idk || ex.type === 'gap' ? true
      : attempt?.error_type && ex.error_type ? attempt.error_type === ex.error_type
        : orderItem ? !sameOrder(said, key) : sameOrder(said, key);
    if (explains) note = ex.explanation;
  }
  return { pair, diff: diff?.length ? diff : null, note, own: Boolean(note), choice };
}

// ---------- the second-try note (r4 LF-2) ----------
// A note shown before a second try must not hand over the answer. Each language part of the note ({ he, en } or
// an English string) is dropped when it quotes an accepted answer, or names a word of the answer that the
// learner's response does not have yet ("leave → left" after "leaved"). Returns the parts that are safe, or null.
// Words are compared in lower case, Latin words only; a Hebrew word breaks a phrase.
const latinWords = (s) => String(s || '').toLowerCase().replace(/[‘’ʼ`´]/g, "'").split(/[^a-z0-9'֐-׿]+/)
  .filter(Boolean).map((w) => (/[֐-׿]/.test(w) ? '¦' : w.replace(/^'+|'+$/g, ''))).filter(Boolean);
const phrase = (words) => ` ${words.join(' ')} `;
const alternatives = (a) => (Array.isArray(a) ? a : [a]).map(String);
// The accepted answers (as word lists) and the answer's words that the response lacks: for a gap, the forms and words of
// every accepted form of each gap filled wrong; otherwise the words of the closest accepted answer
// (grading.wordAccuracy) that the response does not have.
export function answerGaps(ex, response) {
  const said = String(response ?? '');
  if (ex?.type === 'gap' && Array.isArray(ex.answers)) {
    const got = said.split(' | ');
    const keys = [];
    const lacking = new Set();
    ex.answers.forEach((alts, i) => {
      const options = alternatives(alts).map(latinWords).filter((w) => w.length);
      const mine = phrase(latinWords(got[i]));
      // A gap already filled right gives nothing away when a note names it.
      if (options.some((w) => mine === phrase(w))) return;
      keys.push(...options);
      for (const w of options.flat()) if (!mine.includes(` ${w} `)) lacking.add(w);
    });
    return { keys, lacking: [...lacking] };
  }
  const answers = Array.isArray(ex?.answers) ? ex.answers.map((a) => String(Array.isArray(a) ? a[0] : a)) : [];
  if (!answers.length) return { keys: [], lacking: [] };
  const fits = answers.map((a) => ({ a, acc: wordAccuracy(said, a) })).sort((x, y) => y.acc.accuracy - x.acc.accuracy);
  const lacking = new Set(fits[0].acc.words.filter((w) => !w.ok).flatMap((w) => latinWords(w.word)));
  return { keys: answers.map(latinWords).filter((w) => w.length), lacking: [...lacking] };
}
export function retrySafe(note, ex, response) {
  if (!note) return null;
  const parts = typeof note === 'string' ? { en: note } : note;
  const { keys, lacking } = answerGaps(ex, response);
  const safe = (text) => {
    const words = latinWords(text);
    if (!words.length) return true;
    const p = phrase(words);
    if (keys.some((k) => p.includes(phrase(k)))) return false;
    return !lacking.some((w) => words.includes(w));
  };
  const out = {};
  for (const lang of ['he', 'en']) if (parts[lang] && safe(parts[lang])) out[lang] = parts[lang];
  return Object.keys(out).length ? out : null;
}
