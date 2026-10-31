// Every authored wrong answer in the lessons must be graded wrong by the real grader, as the
// exercise player calls it (with the exercise's wrong_feedback list).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { checkTyped, variants } from '../../js/core/grading.js';

const dir = new URL('../../content/lessons/', import.meta.url);
const lessons = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]);

test('no authored wrong answer passes as correct or as a typo', () => {
  const leaks = [];
  for (const [f, l] of lessons) for (const e of l.exercises || []) {
    if (!['gap', 'transform', 'correct'].includes(e.type) || !e.wrong_feedback) continue;
    const keys = e.type === 'gap' ? e.answers : [e.answers];
    for (const w of e.wrong_feedback) for (const k of keys) {
      if (k.some((a) => variants(a).some((v) => variants(w.match).includes(v)))) continue; // the match is itself a key for another blank
      if (checkTyped(w.match, k, e.wrong_feedback).correct) leaks.push(`${f} ${e.id}: "${w.match}"`);
    }
  }
  assert.deepEqual(leaks, []);
});
