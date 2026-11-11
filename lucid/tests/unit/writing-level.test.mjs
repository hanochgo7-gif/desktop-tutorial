// Persona panel P-71: the writing level comes only from final drafts, one per task.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skillLevels } from '../../js/core/adaptive.js';

const day = (d) => new Date(Date.UTC(2026, 9, 1 + d)).toISOString();
const version = (exercise, n, d, est, final = false) => ({ id: `ess:${exercise}#${n}`, kind: 'essay-version', exercise, n, at: day(d), evaluation: { cefr_estimate: est }, ...(final ? { final: true } : {}) });

test('drafts still being revised never set the writing level', () => {
  const drafts = [version('final-B2', 1, 0, 'B1'), version('final-B2', 2, 1, 'B1'), version('final-C2', 1, 2, 'B1')];
  const w = skillLevels({ writing: drafts }).writing;
  assert.equal(w.level, null);
  assert.equal(w.evidence, 0);
});

test('final drafts count once per task, on different days', () => {
  const writing = [version('a', 1, 0, 'B1'), version('a', 2, 1, 'B2', true), version('b', 1, 3, 'B2', true), version('c', 1, 4, 'A2')];
  const w = skillLevels({ writing }).writing;
  assert.equal(w.level, 'B2');
  assert.equal(w.evidence, 2);
});

// Audit BLK-11 (roadmap LB-08): with AI scores hidden (config.js aiScoring 'hidden'), AI estimates give no writing
// level, however many final drafts there are, and nothing is shown as collecting towards one.
test('with AI scores hidden, final drafts give no writing level', () => {
  const writing = [version('a', 1, 0, 'B1', true), version('b', 1, 1, 'B2', true), version('c', 1, 2, 'B2', true), version('d', 1, 3, 'B1', true), version('e', 1, 4, 'B2', true)];
  assert.equal(skillLevels({ writing }).writing.level, 'B2', 'shown: five finals on five days give a level');
  const hidden = skillLevels({ writing, useAiScores: false }).writing;
  assert.deepEqual(hidden, { level: null, source: null, evidence: 0, days: 0 });
});
