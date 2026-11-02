// Workplace English (persona findings R1-Y6, P-53): the "Work" goal has real content behind it. Work scenarios
// exist at A2-B2, the hub lists them, the daily plan and "Start here" pick them for a work goal, every practice
// turn has exactly one most natural reply, and the expressions persona Yael searched for are found.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickScenario, dailyPlan, levelIndex } from '../../js/core/adaptive.js';
import { recommendScenarios, searchMatch } from '../../js/core/reallife.js';
import { MODULES } from '../../js/views/reallife.js';
import { ICONS } from '../../js/ui/icons.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const scenarios = read('../../content/real-life/scenarios.json').scenarios;
const slang = read('../../content/real-life/slang.json').entries;
const work = scenarios.filter((s) => s.module === 'work');

test('work scenarios exist from A2 to B2, and the hub lists every module with a real icon', () => {
  assert.ok(work.length >= 6, `only ${work.length} work scenarios`);
  assert.ok(work.every((s) => s.id.startsWith('rl-work-')), 'work ids follow rl-work-*');
  assert.deepEqual([...new Set(work.map((s) => s.level))].sort(), ['A2', 'B1', 'B2']);
  const listed = new Map(MODULES.map(([id, ic]) => [id, ic]));
  for (const m of new Set(scenarios.map((s) => s.module))) {
    assert.ok(listed.has(m), `module ${m} has scenarios but the Real life hub does not list it`);
    assert.ok(ICONS[listed.get(m)], `module ${m} uses an icon that does not exist: ${listed.get(m)}`);
  }
});

test('a work goal picks a workplace scenario for the plan and for "Start here"', () => {
  for (const level of ['A2', 'B1', 'B2']) {
    const s = pickScenario(scenarios, { level, goals: ['work'] });
    assert.equal(s?.module, 'work', `no work scenario picked at ${level}`);
    assert.ok(levelIndex(s.level) <= levelIndex(level), `${s.id} is above ${level}`);
    const use = dailyPlan({ minutes: 20, next: { id: 'b1-01' }, level, goals: ['work'], scenario: s }).blocks.find((b) => b.id === 'use');
    assert.deepEqual([use.route, use.goal], [`scenario/${s.id}`, 'work']);
  }
  const done = new Set(work.filter((s) => s.level === 'A2').map((s) => s.id));
  assert.equal(pickScenario(scenarios, { level: 'A2', goals: ['work'], done }), null, 'nothing above the level once A2 is done');
  const start = recommendScenarios(scenarios, { courseLevel: 'B1', goals: ['work'] });
  assert.ok(start.length === 3 && start.every((s) => s.module === 'work'), `Start here for a work goal: ${start.map((s) => s.id)}`);
  const both = recommendScenarios(scenarios, { courseLevel: 'B1', goals: ['travel', 'work'] });
  assert.equal(both[0].module, 'airport', 'goal order still comes first');
});

test('every work practice turn has exactly one best, one ok and one poor reply, each explained', () => {
  for (const s of work) {
    s.practice.forEach((t, i) => {
      assert.deepEqual(t.options.map((o) => o.verdict).sort(), ['best', 'ok', 'poor'], `${s.id} turn ${i + 1}`);
      assert.ok(t.options.every((o) => o.feedback.en.length > 20 && /[א-ת]/.test(o.feedback.he)), `${s.id} turn ${i + 1}: short or missing feedback`);
      assert.ok(t.model_replies.includes(t.options.find((o) => o.verdict === 'best').text), `${s.id} turn ${i + 1}: the best reply is not a model reply`);
    });
  }
});

test('workplace expressions are in the dictionary and found by the searches that returned nothing (R1-Y6)', () => {
  const ids = ['ex-touch-base', 'ex-loop-in', 'ex-on-my-plate', 'ex-circle-back', 'ex-bandwidth', 'ex-ooo', 'ex-eod', 'ex-ping-me', 'ex-hop-on-a-call', 'ex-take-it-offline'];
  const have = new Set(slang.map((e) => e.id));
  assert.deepEqual(ids.filter((id) => !have.has(id)), []);
  assert.equal(new Set(slang.map((e) => e.term.toLowerCase())).size, slang.length, 'duplicate terms');
  const find = (q) => slang.filter((x) => searchMatch([x.term, x.meaning_en, x.meaning_he], q)).map((x) => x.id);
  for (const q of ['email', 'meeting', 'deadline', 'circle back']) assert.ok(find(q).length, `"${q}" finds no expression`);
  assert.ok(!find('mate').includes('ex-ballpark-figure'), 'word-start search still holds');
});
