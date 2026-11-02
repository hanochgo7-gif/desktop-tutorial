// Real-life track logic: level fit, suggestions, the key-word check on free replies, expression search.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fitOf, recommendScenarios, nextScenario, hasPhrase, checkOwnReply, searchMatch, moduleOrder, byFit, fitRank, spoken, senses } from '../../js/core/reallife.js';

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

test("quote marks around a word do not hide it from the key-word check", () => {
  assert.ok(hasPhrase("What do you mean by 'short'?", 'short'));
  assert.ok(hasPhrase("I don't know", "don't"));
});

// RW-3: the own-words check runs the Hebrew-speaker rules and ticks the turn's goal points.
test('own replies: Hebrew-speaker errors are named, goal points are ticked (RW-3)', () => {
  const intro = scenarios.find((s) => s.id === 'rl-work-first-day-intro').practice[0];
  const r = checkOwnReply('I am agree to work with you. Nice to know you.', intro, { level: 'A2' });
  assert.deepEqual(r.l1.map((i) => i.ex), ['I agree', 'Nice to meet you']);
  assert.deepEqual(checkOwnReply('Can I fix the bug until Thursday?', intro, { level: 'B1' }).l1.map((i) => i.ex), ['by Thursday']);
  assert.deepEqual(checkOwnReply('Hi everyone, it is great to be here.', intro, { level: 'A2' }).l1, [], 'a correct reply has no flags');
  const email = scenarios.find((s) => s.id === 'rl-work-email-extension').practice[0];
  assert.ok(email.points.length === 3, 'the email turn has goal points');
  const off = checkOwnReply('Hi Dana, the report will be late. I will send the first part until Wednesday, is it ok?', email, { level: 'B2' });
  assert.deepEqual(off.points.map((p) => p.ok), [false, true, false], 'a reply to the wrong person that asks for no new date');
  const good = checkOwnReply(email.model_replies[0], email, { level: 'B2' });
  assert.ok(good.points.every((p) => p.ok) && !good.l1.length, 'the model reply meets every point');
  for (const s of scenarios) for (const t of s.practice) for (const p of t.points || []) assert.ok(p.en && /[א-ת]/.test(p.he) && p.any?.length, `${s.id}: a point without words or phrases`);
});

// RW-9: Real life follows the learner's goals.
test('Start here, topic order and topic lists follow the goals, then the level (RW-9)', () => {
  const start = recommendScenarios(scenarios, { courseLevel: 'B2', goals: ['work'] });
  assert.ok(start.length === 3 && start.every((s) => s.module === 'work'), start.map((s) => s.id).join());
  assert.equal(start[0].level, 'B2', 'the closest level first');
  // A1 with a work goal: the work scenarios (a small stretch) before travel ones that fit (student-58).
  assert.equal(recommendScenarios(scenarios, { courseLevel: 'A1', goals: ['work'] })[0].module, 'work');
  assert.equal(recommendScenarios(scenarios, { courseLevel: 'A2', goals: ['everyday'] })[0].module, 'social');
  const ids = ['airport', 'hotel', 'emergency', 'transport', 'restaurant', 'shopping', 'social', 'work'];
  assert.deepEqual(moduleOrder(ids, ['work']).slice(0, 2), ['work', 'airport']);
  assert.deepEqual(moduleOrder(ids, ['conversation', 'work']).slice(0, 3), ['social', 'work', 'airport']);
  assert.deepEqual(moduleOrder(ids, []), ids);
  const work = byFit(scenarios.filter((s) => s.module === 'work'), 'B2').map((s) => s.level);
  assert.deepEqual(work, ['B2', 'B2', 'B1', 'B1', 'A2', 'A2'], 'at the level, then just below, then far below');
  assert.ok(fitRank('B2', 'B2') < fitRank('B1', 'B2') && fitRank('B1', 'B2') < fitRank('A2', 'B2') && fitRank('A2', 'B2') < fitRank('C1', 'B2'));
});

test('the next scenario after a B2 work scenario is a B2 or B1 work scenario (RW-9)', () => {
  const dis = scenarios.find((s) => s.id === 'rl-work-disagree-politely');
  const next = nextScenario(scenarios, dis, { courseLevel: 'B2', goals: ['work'], done: new Set([dis.id]) });
  assert.equal(next.module, 'work');
  assert.ok(['B1', 'B2'].includes(next.level), next.id);
  const all = new Set(scenarios.filter((s) => s.module === 'work' && s.level !== 'A2').map((s) => s.id));
  assert.equal(nextScenario(scenarios, dis, { courseLevel: 'B2', goals: ['work'], done: all }).level, 'A2', 'lower levels only when the closer ones are done');
});

// RW-10: expressions speak only the expression, and numbered senses become a list with the examples apart.
test('expressions: spoken text and numbered senses (RW-10)', () => {
  assert.equal(spoken('Brilliant (UK)'), 'Brilliant');
  assert.equal(spoken('Can I get...? (ordering)'), 'Can I get...?');
  assert.equal(spoken('No worries'), 'No worries');
  const chill = slang.find((x) => x.id === 'ex-chill');
  const he = senses(chill.meaning_he);
  assert.equal(he.length, 3);
  assert.deepEqual([he[0].def, he[0].en, he[0].after], ['(פועל) לנוח, להירגע', 'We just chilled at home', "(סתם עשינו צ'יל בבית)."]);
  assert.equal(he[1].en, 'My manager is really chill.');
  assert.ok(!/\d$/.test(he[1].en), 'the next number is not swallowed into the English');
  const en = senses(chill.meaning_en);
  assert.deepEqual([en.length, en[0].def, en[0].en], [3, '(verb) To relax', 'We just chilled at home.']);
  const bummer = senses(slang.find((x) => x.id === 'ex-bummer').meaning_he);
  assert.deepEqual([bummer.length, bummer[0].def, bummer[0].en], [1, 'משהו מאכזב או מבאס.', 'What a bummer!']);
  for (const x of slang) for (const s of [...senses(x.meaning_he), ...senses(x.meaning_en)]) assert.ok(s.def, `${x.id}: a sense without a definition`);
});
