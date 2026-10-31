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
