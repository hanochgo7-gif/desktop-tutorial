// Real-life track logic: level fit, suggestions, the key-word check on free replies, expression search.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fitOf, recommendScenarios, nextScenario, hasPhrase, checkOwnReply, searchMatch } from '../../js/core/reallife.js';

const scenarios = JSON.parse(readFileSync(new URL('../../content/real-life/scenarios.json', import.meta.url), 'utf8')).scenarios;
const slang = JSON.parse(readFileSync(new URL('../../content/real-life/slang.json', import.meta.url), 'utf8')).entries;

test('fit is relative to the course level', () => {
  assert.equal(fitOf('A1', 'A2'), 'below');
  assert.equal(fitOf('A2', 'A2'), 'at');
  assert.equal(fitOf('B1', 'A2'), 'stretch');
  assert.equal(fitOf('B2', 'A2'), 'hard');
  assert.equal(fitOf('A1', 'PreA1'), 'stretch');
});

test('Start here: not done, at or below the level first, in goal order (P-46, P-64)', () => {
  const rec = recommendScenarios(scenarios, { courseLevel: 'A2', goals: ['travel'] });
  assert.equal(rec.length, 3);
  assert.ok(rec.every((s) => ['A1', 'A2'].includes(s.level)), rec.map((s) => s.level).join());
  assert.ok(rec.every((s) => ['airport', 'hotel', 'emergency', 'transport', 'restaurant', 'shopping'].includes(s.module)));
  assert.equal(rec[0].module, 'airport');
  const done = new Set(rec.map((s) => s.id));
  assert.ok(recommendScenarios(scenarios, { courseLevel: 'A2', goals: ['travel'], done }).every((s) => !done.has(s.id)));
  // Pre-A1: nothing is at the level, so A1 scenarios are offered as a small stretch.
  const pre = recommendScenarios(scenarios, { courseLevel: 'PreA1', goals: [] });
  assert.ok(pre.length && pre.every((s) => s.level === 'A1'));
  // Conversation goal: social first.
  assert.equal(recommendScenarios(scenarios, { courseLevel: 'B1', goals: ['conversation'] })[0].module, 'social');
});

test('the next scenario stays in the topic when it suits the learner (P-66)', () => {
  const party = scenarios.find((s) => s.id === 'rl-social-party-small-talk');
  const next = nextScenario(scenarios, party, { courseLevel: 'B1' });
  assert.ok(next && next.id !== party.id);
  assert.equal(next.module, 'social');
  assert.ok(nextScenario(scenarios, scenarios.at(-1), { courseLevel: 'C2' }));
});

test('free replies: whole words, and a question back counts (P-60)', () => {
  assert.ok(hasPhrase('We met at uni.', 'uni'));
  assert.ok(!hasPhrase('I live in the United States', 'uni'));
  assert.ok(hasPhrase('Great, how about you?', 'how about you'));
  const turn = scenarios.find((s) => s.id === 'rl-social-party-small-talk').practice[0];
  const r = checkOwnReply('Hi, I work with Dana on the product team. How do you know her?', turn);
  assert.deepEqual(r.hits, []);
  assert.equal(r.asked, true);
  assert.deepEqual(checkOwnReply('We study at the same university. What about you?', turn).hits, ['university', 'what about you']);
  assert.equal(checkOwnReply('   ', turn).empty, true);
});

test('expression search matches the start of words, in English and Hebrew (P-68)', () => {
  const find = (q) => slang.filter((x) => searchMatch([x.term, x.meaning_en, x.meaning_he], q)).map((x) => x.term);
  assert.ok(!find('mate').some((t) => /ballpark/i.test(t)), 'mate matched inside "estimate"');
  assert.ok(find('ball').some((t) => /ballpark/i.test(t)));
  assert.ok(find('bum').some((t) => /bummer/i.test(t)));
  assert.ok(find('באסה').some((t) => /bummer/i.test(t)));
  assert.ok(searchMatch(['להזמין קפה'], 'קפה') && searchMatch(['הקפה שלי'], 'קפה'), 'Hebrew one-letter prefix');
  assert.ok(searchMatch(['anything'], ''));
});

test('key words match inside contractions ("tip\'s", "where\'s") but not inside other words', () => {
  assert.ok(hasPhrase("So the tip's already included, right?", 'tip'));
  assert.ok(hasPhrase("Where's the platform?", 'where'));
  assert.ok(hasPhrase("Where's the platform?", "where's"));
  assert.ok(!hasPhrase('The tipping point', 'tip'));
  assert.ok(!hasPhrase("It's fine", 'is'));
});
