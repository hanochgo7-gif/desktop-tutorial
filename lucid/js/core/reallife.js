// Real-life track logic, without the DOM: how a scenario fits the learner's level, which scenarios to
// suggest, the key-word check for a reply in the learner's own words, and expression search.
import { levelIndex, SCENARIO_MODULES } from './adaptive.js';
import { normalize } from './grading.js';
import { l1Issues } from './writing-analyzer.js';

// ---------- levels ----------
// How a scenario's level relates to the learner's course level.
export function fitOf(level, courseLevel) {
  const d = levelIndex(level) - Math.max(0, levelIndex(courseLevel));
  return d < 0 ? 'below' : d === 0 ? 'at' : d === 1 ? 'stretch' : 'hard';
}
export const FIT_LABEL = {
  below: ['מתחת לרמה שלכם', 'Below your level'],
  at: ['ברמה שלכם', 'At your level'],
  stretch: ['אתגר קטן', 'A small stretch'],
  hard: ['מאתגר', 'Challenging'],
};

// The real-life topics each goal points to. Everyday English and conversation lead to social English (and the
// Expressions dictionary, which the hub then shows first); work to the workplace scenarios (RW-9).
export const GOAL_MODULES = { ...SCENARIO_MODULES, everyday: ['social'], conversation: ['social'] };
export const modulesFor = (goals = []) => [...new Set((goals || []).flatMap((g) => GOAL_MODULES[g] || []))];
const goalRank = (goals) => {
  const modules = modulesFor(goals);
  return (s) => (modules.includes(s.module) ? modules.indexOf(s.module) : modules.length);
};
// How close a scenario is to the learner's level, for sorting: at the level 0, one below 1, two below 2 ...,
// a small stretch 10, harder 20.
export function fitRank(level, courseLevel) {
  const d = levelIndex(level) - Math.max(0, levelIndex(courseLevel));
  return d === 0 ? 0 : d < 0 ? -d : d === 1 ? 10 : 20;
}
// Topics in the order of the learner's goals, then the rest in their usual order (RW-9).
export function moduleOrder(ids = [], goals = []) {
  const first = modulesFor(goals).filter((m) => ids.includes(m));
  return [...first, ...ids.filter((m) => !first.includes(m))];
}
// A topic's scenarios at the learner's level first, then just below, then far below, then above (RW-9).
export function byFit(items = [], courseLevel = 'A1') {
  const order = new Map(items.map((s, i) => [s.id, i]));
  return [...items].sort((a, b) => fitRank(a.level, courseLevel) - fitRank(b.level, courseLevel) || order.get(a.id) - order.get(b.id));
}

// Up to n scenarios to start with, not done yet: those for the learner's goals first, at or below their level
// (closest first), then a small stretch, then (for a goal topic only) up to two levels above, so a Pre-A1 learner
// whose goal is work is offered the A2 work scenarios before airports (r4 RW-10, student-58); then the other topics,
// at or below the level and then a small stretch (RW-9, persona panel P-46).
export function recommendScenarios(list = [], { courseLevel = 'A1', goals = [], done = new Set(), n = 3 } = {}) {
  const rank = goalRank(goals);
  const goalCount = modulesFor(goals).length;
  const order = new Map(list.map((s, i) => [s.id, i]));
  const isGoal = (s) => rank(s) < goalCount;
  const above = (s) => levelIndex(s.level) - Math.max(0, levelIndex(courseLevel));
  const open = list.filter((s) => !done.has(s.id) && levelIndex(s.level) >= 0 && (fitOf(s.level, courseLevel) !== 'hard' || (isGoal(s) && above(s) <= 2)));
  const fitTier = (s) => ({ below: 0, at: 0, stretch: 1, hard: 2 })[fitOf(s.level, courseLevel)];
  const tier = (s) => (isGoal(s) ? 0 : 3) + fitTier(s);
  const by = (a, b) => tier(a) - tier(b) || rank(a) - rank(b) || fitRank(a.level, courseLevel) - fitRank(b.level, courseLevel) || above(a) - above(b) || order.get(a.id) - order.get(b.id);
  return open.sort(by).slice(0, n);
}

// The scenario to offer after this one: in the same topic, the closest level at or below the learner's first,
// then lower ones, then a small stretch (a B2 learner finishing a B2 work scenario gets B2 or B1 work next, not
// A2; RW-9); else the first recommendation; else simply the next one in the list.
export function nextScenario(list = [], current, { courseLevel = 'A1', goals = [], done = new Set() } = {}) {
  const i = list.findIndex((s) => s.id === current?.id);
  const later = [...list.slice(i + 1), ...list.slice(0, Math.max(0, i))];
  const suits = (s) => s.id !== current?.id && !done.has(s.id) && fitOf(s.level, courseLevel) !== 'hard';
  return byFit(later.filter((s) => s.module === current?.module && suits(s)), courseLevel)[0]
    || recommendScenarios(list, { courseLevel, goals, done: new Set([...done, current?.id]), n: 1 })[0]
    || later.find((s) => s.id !== current?.id) || null;
}

// ---------- the reply in the learner's own words ----------
// Apostrophes inside a word stay (don't, tip's); quote marks around a word ('short') are dropped.
const words = (s) => normalize(s).replace(/[^a-z0-9'֐-׿]+/g, ' ').split(' ').map((w) => w.replace(/^'+|'+$/g, '')).filter(Boolean);

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
// question back where the model replies do (a follow-up question keeps a conversation going). It also runs the
// writing analyzer's Hebrew-speaker rules (l1), and ticks the turn's goal points (what a good reply does: name
// the problem, give a new date ...) when one of each point's phrases is there (RW-3).
export function checkOwnReply(text, turn = {}, { level = 'B1' } = {}) {
  const keywords = turn.keywords || [];
  const hits = keywords.filter((k) => hasPhrase(text, k));
  const asked = /\?/.test(String(text)) && (turn.model_replies || []).some((r) => r.includes('?'));
  const points = (turn.points || []).map((p) => ({ en: p.en, he: p.he, ok: (p.any || []).some((a) => hasPhrase(text, a)) }));
  const empty = !words(text).length;
  return { hits, asked, total: keywords.length, empty, points, l1: empty ? [] : l1Issues(text, { level }) };
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

// ---------- expressions (RW-10) ----------
// Only the expression is spoken, never its label: "Brilliant (UK)" says "Brilliant" (RW-10).
export const spoken = (term) => String(term || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

// A gloss with numbered senses ("1) ... 2) ...") becomes a list; in each sense, the definition comes first and
// an English example after "definition: " goes on its own left-to-right line, with any Hebrew after it on
// a line of its own (RW-10).
export function senses(text) {
  const t = String(text || '').trim();
  const parts = /^1\)\s/.test(t) ? t.split(/(?:^|\s)\d\)\s+/).filter(Boolean) : [t];
  return parts.map((p) => {
    // Hebrew: the definition ends at the first ":" or "." before English; English: at the first ": '".
    const hebrew = /[א-ת]/.test(p);
    const at = hebrew ? p.search(/[א-ת][^:.]*[:.]\s+(?=['"‘“]?[A-Z])/) : p.search(/:\s+(?=['"‘“]?[A-Z])/);
    const sep = at < 0 ? -1 : hebrew ? p.slice(at).search(/[:.]\s+(?=['"‘“]?[A-Z])/) + at : at;
    if (sep < 0) return { def: p.trim(), en: '', after: '' };
    const def = p.slice(0, sep + 1).replace(/:$/, '').trim();
    const rest = p.slice(sep + 1).trim();
    const he = rest.search(/[א-ת]/);
    if (he < 0) return { def, en: rest.replace(/^['‘“"]|['’”"]$/g, ''), after: '' };
    const en = rest.slice(0, he).replace(/[\s(=('"“‘]+$/, '');
    return { def, en: en.replace(/^['‘“"]|['’”"]$/g, ''), after: rest.slice(en.length).replace(/^[\s=]+/, '').trim() };
  });
}
