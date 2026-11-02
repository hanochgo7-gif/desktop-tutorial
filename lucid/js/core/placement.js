// Adaptive placement test (staircase). Items are asked in blocks of four at one level, rotating skills.
// 3 of 4 passes a level for the moment and the test climbs; 0-1 of 4 fails it and the test descends;
// 2 of 4 asks a second block at the same level, which then needs 6 of 8.
// A level counts only once it is confirmed by a second passing block: 6 of 8 at that level, or 3+ of 4 at
// the level above. Before finishing, the test asks a confirming block at the highest level passed, so the
// result never claims a level on four answers, and it never places above the highest confirmed level.
// "I don't know" is always allowed and counts as not known, never as a guess. An interrupted test can be
// resumed: replaying the saved answers rebuilds the same state.
// The course starts at the confirmed level itself, not the one above it (persona finding R1-Y2): 75% at a
// level is control, not mastery, so its lessons are the right next step. C1 and C2 are the academic track
// (argument, academic vocabulary); a learner whose goals are all non-academic (work, travel, conversation,
// everyday English) starts at B2 instead, and the result says so and offers the higher start.
import { LEVELS, placementSkillEstimate } from './adaptive.js';

const SKILL_ROTATION = ['grammar', 'vocabulary', 'reading', 'listening'];
export const START_FOR = { zero: null, basics: 'A1', conversations: 'A2', comfortable: 'B1', advanced: 'B2' };
export const MAX_ITEMS = 28;
const BLOCK = 4;
const PASS = 0.75;
const idx = (l) => LEVELS.indexOf(l);

// Goals that want the academic track at C1-C2; any other goal (or none) is weighed as non-academic only
// when the learner chose at least one goal.
export const ACADEMIC_GOALS = ['studies', 'writing'];
export function startFor(demonstrated, goals = []) {
  const start = demonstrated || LEVELS[0];
  const academic = goals.some((g) => ACADEMIC_GOALS.includes(g));
  if (idx(start) >= idx('C1') && goals.length && !academic) return { start_level: 'B2', held_for_goals: start };
  return { start_level: start };
}

export function createPlacement(items, { start = 'A1', shuffle = (a) => a, answers = [], goals = [] } = {}) {
  const pool = new Map(LEVELS.map((l) => [l, shuffle(items.filter((i) => i.level === l))]));
  const state = {
    level: start,
    perLevel: Object.fromEntries(LEVELS.map((l) => [l, { right: 0, n: 0 }])),
    passed: new Set(),
    failed: new Set(),
    asked: [],
    done: false,
  };
  const stats = (l) => state.perLevel[l];
  const acc = (l) => (stats(l).n ? stats(l).right / stats(l).n : 0);

  function pick(level = state.level) {
    const list = pool.get(level) || [];
    const used = new Set(state.asked.map((a) => a.id));
    const wantSkill = SKILL_ROTATION[state.asked.length % SKILL_ROTATION.length];
    return list.find((i) => !used.has(i.id) && i.skill === wantSkill) || list.find((i) => !used.has(i.id)) || null;
  }
  const hasBlock = (level) => {
    const used = new Set(state.asked.map((a) => a.id));
    return (pool.get(level) || []).filter((i) => !used.has(i.id)).length >= BLOCK;
  };

  // Confirmed: 75%+ at the level, over two blocks there or with a passing block at the level above.
  function confirmed(l) {
    if (!l || !stats(l).n || acc(l) < PASS) return false;
    const up = LEVELS[idx(l) + 1];
    return stats(l).n >= 2 * BLOCK || Boolean(up && stats(up).n >= BLOCK && acc(up) >= PASS);
  }

  // `l` is the highest level passed so far: finish once it is confirmed, or ask a confirming block there.
  function settle(l) {
    if (!l || confirmed(l)) return finish();
    if (stats(l).n < 2 * BLOCK && hasBlock(l)) { state.level = l; return undefined; }
    // It cannot be confirmed: it does not count, and the level below has to stand on its own.
    state.passed.delete(l); state.failed.add(l);
    return settle(LEVELS.slice(0, idx(l)).filter((x) => state.passed.has(x)).pop() || null);
  }

  function decide() {
    const L = state.level;
    const { right, n } = stats(L);
    const i = idx(L);
    let verdict = null;
    if (n === BLOCK) verdict = right >= 3 ? 'pass' : right <= 1 ? 'fail' : null;
    else verdict = acc(L) >= PASS ? 'pass' : 'fail';
    if (!verdict) {
      if (hasBlock(L)) return undefined; // 2 of 4: one more block at this level
      verdict = 'fail';
    }
    if (verdict === 'pass') {
      state.passed.add(L); state.failed.delete(L);
      const up = LEVELS[i + 1];
      if (up && !state.failed.has(up) && hasBlock(up)) { state.level = up; return undefined; }
      return settle(L);
    }
    state.failed.add(L); state.passed.delete(L);
    const down = LEVELS[i - 1];
    if (down && state.passed.has(down)) return settle(down);
    if (down && !state.failed.has(down) && hasBlock(down)) { state.level = down; return undefined; }
    return settle(LEVELS.slice(0, i).filter((x) => state.passed.has(x)).pop() || null);
  }

  function finish() { state.done = true; }

  const api = {
    get done() { return state.done || state.asked.length >= MAX_ITEMS; },
    get progress() { return { asked: state.asked.length, level: state.level }; },
    // The answers so far, in a form that can be saved and replayed.
    get answers() { return state.asked.map(({ id, correct, dontKnow }) => ({ id, correct, dontKnow })); },
    next() {
      if (api.done) return null;
      const item = pick();
      if (!item) { decide(); return api.done ? null : pick(); }
      return item;
    },
    // correct: boolean; dontKnow: the learner chose "I don't know".
    answer(item, { correct, dontKnow = false }) {
      state.asked.push({ id: item.id, level: item.level, skill: item.skill, correct: Boolean(correct) && !dontKnow, dontKnow });
      const p = stats(item.level);
      p.n++;
      if (correct && !dontKnow) p.right++;
      if (item.level === state.level && p.n % BLOCK === 0) decide();
    },
    result() { return result(state, confirmed, goals); },
  };
  // Resume: replay saved answers (items that left the bank are skipped).
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const a of answers) { const item = byId.get(a.id); if (item && !api.done) api.answer(item, a); }
  return api;
}

function result(state, confirmed, goals) {
  const confirmedLevels = LEVELS.filter((l) => confirmed(l));
  const demonstrated = confirmedLevels.length ? confirmedLevels[confirmedLevels.length - 1] : null;
  const skills = {};
  for (const s of SKILL_ROTATION) {
    // A skill's first estimate never goes above the confirmed overall level (persona finding R2-29).
    const est = placementSkillEstimate(state.asked, s, { confirmed: demonstrated });
    skills[s] = {
      level: est?.level ?? null, items_at_level: est?.items ?? 0, capped: Boolean(est?.capped), items: state.asked.filter((a) => a.skill === s).length, indicative: true,
      ...(est?.from ? { from: est.from, right: est.right } : {}),
    };
  }
  return {
    demonstrated, level: demonstrated, ...startFor(demonstrated, goals), items: state.asked.length, answers: state.asked, skills,
    confirmed: confirmedLevels, top_band: Boolean(demonstrated && idx(demonstrated) >= idx('C1')),
  };
}

// For a learner who says they know no English at all: no test, start at the very beginning.
export function zeroResult() {
  return { demonstrated: null, level: null, start_level: 'PreA1', items: 0, answers: [], skills: {}, skipped: 'zero' };
}
// A learner who skips the test and picks a starting level themselves (their own estimate, not evidence).
export function selfReportResult(level) {
  return { demonstrated: null, level: null, start_level: level, items: 0, answers: [], skills: {}, skipped: 'self-report' };
}
