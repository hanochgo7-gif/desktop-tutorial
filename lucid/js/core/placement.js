// Adaptive placement test (staircase). Items are asked in blocks of four at one level, rotating
// skills. A level is passed at >= 75% (or >= 62.5% over eight items), failed at <= 25% (or below
// that over eight). The test climbs after a pass and descends after a fail, and stops when it has
// found the boundary. "I don't know" is always allowed and counts as not known, never as a guess.
import { LEVELS } from './adaptive.js';

const SKILL_ROTATION = ['grammar', 'vocabulary', 'reading', 'listening'];
export const START_FOR = { zero: null, basics: 'A1', conversations: 'A2', comfortable: 'B1', advanced: 'B2' };
const MAX_ITEMS = 28;

export function createPlacement(items, { start = 'A1', shuffle = (a) => a } = {}) {
  const pool = new Map(LEVELS.map((l) => [l, shuffle(items.filter((i) => i.level === l))]));
  const state = {
    level: start,
    perLevel: Object.fromEntries(LEVELS.map((l) => [l, { right: 0, n: 0 }])),
    passed: new Set(),
    failed: new Set(),
    asked: [],
    blockCount: 0,
    done: false,
  };

  function pick() {
    const list = pool.get(state.level) || [];
    const used = new Set(state.asked.map((a) => a.id));
    const wantSkill = SKILL_ROTATION[state.asked.length % SKILL_ROTATION.length];
    return list.find((i) => !used.has(i.id) && i.skill === wantSkill) || list.find((i) => !used.has(i.id)) || null;
  }

  function decide() {
    const L = state.level;
    const { right, n } = state.perLevel[L];
    const acc = n ? right / n : 0;
    const i = LEVELS.indexOf(L);
    let verdict = null;
    if (n >= 4 && acc >= 0.75) verdict = 'pass';
    else if (n >= 4 && acc <= 0.25) verdict = 'fail';
    else if (n >= 8 || !pick()) verdict = acc >= 0.625 ? 'pass' : 'fail';
    if (!verdict) return; // ambiguous: ask another block at this level
    if (verdict === 'pass') {
      state.passed.add(L);
      if (i === LEVELS.length - 1 || state.failed.has(LEVELS[i + 1])) return finish();
      state.level = LEVELS[i + 1];
    } else {
      state.failed.add(L);
      if (i === 0 || state.passed.has(LEVELS[i - 1])) return finish();
      state.level = LEVELS[i - 1];
    }
    if (!pick()) finish();
  }

  function finish() { state.done = true; }

  const api = {
    get done() { return state.done || state.asked.length >= MAX_ITEMS; },
    get progress() { return { asked: state.asked.length, level: state.level }; },
    next() {
      if (api.done) return null;
      const item = pick();
      if (!item) { decide(); return api.done ? null : pick(); }
      return item;
    },
    // correct: boolean; dontKnow: the learner chose "I don't know".
    answer(item, { correct, dontKnow = false }) {
      state.asked.push({ id: item.id, level: item.level, skill: item.skill, correct: Boolean(correct) && !dontKnow, dontKnow });
      const p = state.perLevel[item.level];
      p.n++;
      if (correct && !dontKnow) p.right++;
      if (p.n % 4 === 0) decide();
    },
    result() { return result(state); },
  };
  return api;
}

function result(state) {
  const passed = LEVELS.filter((l) => state.passed.has(l));
  const demonstrated = passed.length ? passed[passed.length - 1] : null;
  // Start where the learner has not yet shown they can do the level's material.
  const di = demonstrated ? LEVELS.indexOf(demonstrated) : -1;
  const startLevel = LEVELS[Math.min(LEVELS.length - 1, di + 1)];
  const skills = {};
  for (const s of SKILL_ROTATION) {
    const answered = state.asked.filter((a) => a.skill === s);
    let level = null;
    for (const l of LEVELS) {
      const at = answered.filter((a) => a.level === l);
      if (at.length && at.filter((a) => a.correct).length / at.length >= 0.67) level = l;
    }
    skills[s] = { level, items: answered.length, indicative: true };
  }
  return { demonstrated, level: demonstrated, start_level: startLevel, items: state.asked.length, answers: state.asked, skills };
}

// For a learner who says they know no English at all: no test, start at the very beginning.
export function zeroResult() {
  return { demonstrated: null, level: null, start_level: 'PreA1', items: 0, answers: [], skills: {}, skipped: 'zero' };
}
