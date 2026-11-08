// R9 / contract C-11: the learner model gives the same answers for a Writing-lab task whether it gets the full
// task (content/writing/exercises.json, assignments.json) or its row in the writing index the content lane
// generates (content/writing/index.json), which carries n_items in place of the items themselves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { writingMinutes, pickWritingTask, pickScenario, dailyPlan, LEVELS } from '../../js/core/adaptive.js';

const root = new URL('../../content/', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const exercises = read('writing/exercises.json').exercises;
const assignments = read('writing/assignments.json').assignments;

// The index rows as contract C-1/C-11 and plan item C1 build them: these fields, and n_items for a set of items.
const FIELDS = ['id', 'stage', 'level', 'kind', 'title_en', 'title_he', 'word_range', 'min_words', 'max_words', 'time_limit_min'];
const pick = (x, keys) => Object.fromEntries(keys.filter((k) => x[k] !== undefined).map((k) => [k, x[k]]));
const exerciseRow = (x) => ({ ...pick(x, FIELDS), ...(x.items ? { n_items: x.items.length } : {}) });
const assignmentRow = (x) => ({ ...pick(x, FIELDS), prompt: true });

test('writingMinutes(index row) equals writingMinutes(full task) for every writing exercise and assignment', () => {
  assert.ok(exercises.length > 0 && assignments.length > 0);
  let sentenceSets = 0;
  for (const x of exercises) {
    if (x.items?.length && !x.min_words) sentenceSets++;
    assert.equal(writingMinutes(exerciseRow(x)), writingMinutes(x), x.id);
    // A generator that writes n_items: 0 or null for a task without items gives the same answer.
    if (!x.items) {
      assert.equal(writingMinutes({ ...exerciseRow(x), n_items: 0 }), writingMinutes(x), `${x.id} n_items 0`);
      assert.equal(writingMinutes({ ...exerciseRow(x), n_items: null }), writingMinutes(x), `${x.id} n_items null`);
    }
  }
  for (const x of assignments) assert.equal(writingMinutes(assignmentRow(x)), writingMinutes(x), x.id);
  assert.ok(sentenceSets > 0, 'the content has at least one sentence-exercise task, the case R9 fixes');
});

test('writingMinutes keeps its rules for full tasks', () => {
  assert.equal(writingMinutes(null), null);
  assert.equal(writingMinutes({ level: 'B1', items: new Array(8) }), 4);
  assert.equal(writingMinutes({ level: 'B1', n_items: 8 }), 4);
  assert.equal(writingMinutes({ level: 'A1', n_items: 1 }), 2);
  assert.equal(writingMinutes({ level: 'B2', min_words: 180, max_words: 250, n_items: 8 }), 30); // a word range wins
  assert.equal(writingMinutes({ level: 'B1', items: [] }), null);
});

test('pickWritingTask, pickScenario and the plan are the same with index rows (C-11)', () => {
  const full = [...exercises, ...assignments];
  const rows = [...exercises.map(exerciseRow), ...assignments.map(assignmentRow)];
  const scenarios = read('real-life/scenarios.json').scenarios;
  const scenarioRows = scenarios.map((s) => pick(s, ['id', 'module', 'level', 'title_en', 'title_he', 'goal']));
  for (const level of LEVELS) {
    for (const started of [new Set(), new Set([full.find((t) => t.items)?.id])]) {
      const a = pickWritingTask(full, { level, started });
      const b = pickWritingTask(rows, { level, started });
      assert.equal(b?.id ?? null, a?.id ?? null, `${level} writing pick`);
      for (const goals of [['travel'], ['work'], ['conversation'], ['studies', 'writing']]) {
        assert.equal(pickScenario(scenarioRows, { level, goals })?.id ?? null, pickScenario(scenarios, { level, goals })?.id ?? null, `${level} ${goals} scenario pick`);
      }
    }
  }
  // Every sentence-exercise task as the plan's writing pick: the same blocks and minutes.
  for (const task of exercises.filter((x) => x.items?.length)) {
    for (const minutes of [10, 20, 35, 50]) {
      const opts = { minutes, now: Date.UTC(2026, 10, 6, 12), level: task.level, goals: ['writing'], dueCount: 3 };
      const viaFull = dailyPlan({ ...opts, writingTask: task });
      const viaRow = dailyPlan({ ...opts, writingTask: exerciseRow(task) });
      assert.deepEqual(viaRow, viaFull, `${task.id} at ${minutes} min`);
    }
  }
});
