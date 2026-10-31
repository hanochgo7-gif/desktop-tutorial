// Real-life track logic, without the DOM: how a scenario fits the learner's level, which scenarios to
// suggest, the key-word check for a reply in the learner's own words, and expression search.
import { levelIndex, SCENARIO_MODULES } from './adaptive.js';
import { normalize } from './grading.js';

// ---------- levels ----------
// How a scenario's level relates to the learner's course level.
export function fitOf(level, courseLevel) {
  const d = levelIndex(level) - Math.max(0, levelIndex(courseLevel));
  return d < 0 ? 'below' : d === 0 ? 'at' : d === 1 ? 'stretch' : 'hard';
}
export const FIT_LABEL = {
  below: ['מתחת לרמה שלך', 'Below your level'],
  at: ['ברמה שלך', 'At your level'],
  stretch: ['אתגר קטן', 'A small stretch'],
  hard: ['מאתגר', 'Challenging'],
};

const goalRank = (goals) => {
  const modules = (goals || []).flatMap((g) => SCENARIO_MODULES[g] || []);
  return (s) => (modules.includes(s.module) ? modules.indexOf(s.module) : modules.length);
};

// Up to n scenarios to start with: not done yet, at or below the learner's level (closest first), in the
// order of their goals; when there are not enough, scenarios one level up (a small stretch).
export function recommendScenarios(list = [], { courseLevel = 'A1', goals = [], done = new Set(), n = 3 } = {}) {
  const rank = goalRank(goals);
  const order = new Map(list.map((s, i) => [s.id, i]));
  const open = list.filter((s) => !done.has(s.id) && levelIndex(s.level) >= 0);
  const by = (a, b) => rank(a) - rank(b) || levelIndex(b.level) - levelIndex(a.level) || order.get(a.id) - order.get(b.id);
  const fit = open.filter((s) => ['below', 'at'].includes(fitOf(s.level, courseLevel))).sort(by);
  const stretch = open.filter((s) => fitOf(s.level, courseLevel) === 'stretch').sort(by);
  return [...fit, ...stretch].slice(0, n);
}

// The scenario to offer after this one: the next one in the same topic that suits the learner, else the
// first recommendation, else simply the next one in the list.
export function nextScenario(list = [], current, { courseLevel = 'A1', goals = [], done = new Set() } = {}) {
  const i = list.findIndex((s) => s.id === current?.id);
  const later = [...list.slice(i + 1), ...list.slice(0, Math.max(0, i))];
  const suits = (s) => s.id !== current?.id && !done.has(s.id) && fitOf(s.level, courseLevel) !== 'hard';
  return later.find((s) => s.module === current?.module && suits(s))
    || recommendScenarios(list, { courseLevel, goals, done: new Set([...done, current?.id]), n: 1 })[0]
    || later.find((s) => s.id !== current?.id) || null;
}

// ---------- the reply in the learner's own words ----------
const words = (s) => normalize(s).replace(/[^a-z0-9'֐-׿]+/g, ' ').split(' ').filter(Boolean);

// True when the phrase's words appear in the text in order, as whole words ("uni" does not match "united").
export function hasPhrase(text, phrase) {
  const w = words(text);
  const p = words(phrase);
  if (!p.length) return false;
  // "tip's" and "where's" contain the key words "tip" and "where": a contraction ending is ignored unless the
  // key word itself has one.
  const same = (t, x) => t === x || (!x.includes("'") && t.replace(/'(s|re|ll|ve|d|m)$/, '') === x);
  for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, j) => same(w[i + j], x))) return true;
  return false;
}

// A key-word check, not a judgement: which of the turn's key words the reply uses, and whether it asks a
// question back where the model replies do (a follow-up question keeps a conversation going).
export function checkOwnReply(text, turn = {}) {
  const keywords = turn.keywords || [];
  const hits = keywords.filter((k) => hasPhrase(text, k));
  const asked = /\?/.test(String(text)) && (turn.model_replies || []).some((r) => r.includes('?'));
  return { hits, asked, total: keywords.length, empty: !words(text).length };
}

// ---------- expression search ----------
const fold = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-֑ͯ-ׇ]/g, '');
const tokens = (s) => fold(s).split(/[^a-z0-9'א-ת]+/).filter(Boolean);
const HEBREW_PREFIX = /^[בהוכלמש](?=[א-ת]{2})/;

// Every word of the query must start a word in one of the fields ("mate" finds "mate", not "estimate").
// A Hebrew word may also match after a one-letter prefix (ה, ב, ו, כ, ל, מ, ש), so "קפה" finds "הקפה".
export function searchMatch(fields, query) {
  const q = tokens(query);
  if (!q.length) return true;
  const ws = fields.flatMap(tokens);
  const starts = ws.flatMap((w) => (HEBREW_PREFIX.test(w) ? [w, w.slice(1)] : [w]));
  return q.every((x) => starts.some((w) => w.startsWith(x)));
}
