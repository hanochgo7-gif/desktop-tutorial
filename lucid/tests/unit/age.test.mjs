// No minimum age (November 2026): age is decided at use time from the birth year (js/core/age.js), and content
// flagged as sensitive is left out for learners under 16 on every screen (js/core/content.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ageFromYear, ageOf, youngestAge, isMinor, isUnder16, forLearner, flagsOf, birthYears, SENSITIVE_FLAGS } from '../../js/core/age.js';

const now = new Date('2026-11-07T12:00:00Z');

test('age is the current year minus the birth year, with sanity bounds', () => {
  assert.equal(ageFromYear(2016, now), 10);
  assert.equal(ageFromYear('2026', now), 0, 'born this year');
  assert.equal(ageFromYear(1906, now), 120);
  assert.equal(ageFromYear(1905, now), null, 'over 120');
  assert.equal(ageFromYear(2027, now), null, 'a future year');
  assert.equal(ageFromYear('', now), null);
  assert.equal(ageFromYear(undefined, now), null);
});

test('minor and under-16 are decided now, from the year, not from the flag stored at onboarding', () => {
  // Stored as a minor at 17 in an earlier year; today the learner is 19.
  assert.equal(isMinor({ birth_year: 2007, minor: true }, now), false);
  // Stored as an adult by mistake; the year still decides.
  assert.equal(isMinor({ birth_year: 2012, minor: false }, now), true);
  assert.equal(isUnder16({ birth_year: 2012 }, now), true);
  assert.equal(isUnder16({ birth_year: 2009 }, now), false, 'turning 17 this year: surely 16');
  assert.equal(isMinor({ birth_year: 2009 }, now), true, '17 this year');
  assert.equal(isMinor({ birth_year: 2007 }, now), false, 'turning 19 this year: surely 18');
});

// Only the year is known: born in December 2010, a learner is still 15 in November 2026. The protections take the
// youngest age the year allows, so the last year of each threshold is still protected.
test('protections use the youngest possible age, so a 15-year-old and a 17-year-old born late in the year are covered', () => {
  assert.equal(youngestAge(2010, now), 15);
  assert.equal(youngestAge(2026, now), 0, 'born this year');
  assert.equal(youngestAge(2027, now), null);
  assert.equal(isUnder16({ birth_year: 2010 }, now), true, 'turning 16 this year: may still be 15');
  assert.equal(isUnder16({ birth_year: 2011 }, now), true, 'turning 15 this year');
  assert.equal(isUnder16({ birth_year: now.getFullYear() - 15 }, now), true);
  assert.equal(isMinor({ birth_year: 2008 }, now), true, 'turning 18 this year: may still be 17');
  assert.equal(forLearner([{ sensitive: ['alcohol'] }], { birth_year: 2010 }, now).hidden, 1, 'flagged items are hidden at 15');
  assert.equal(forLearner([{ sensitive: ['alcohol'] }], { birth_year: 2011 }, now).hidden, 1);
  // In January the same rule still holds: everyone born in 2011 is 15, and is treated as under 16.
  const jan = new Date('2027-01-05T12:00:00Z');
  assert.equal(isUnder16({ birth_year: 2011 }, jan), true);
  assert.equal(isUnder16({ birth_year: 2010 }, jan), false, 'born 2010: surely 16 in 2027');
});

test('without a birth year the stored flag is the fallback, and under-16 is never assumed', () => {
  assert.equal(isMinor({ minor: true }, now), true);
  assert.equal(isMinor({}, now), false);
  assert.equal(isMinor(null, now), false);
  assert.equal(isUnder16({ minor: true }, now), false);
  assert.equal(ageOf(null, now), null);
});

test('the year list covers this year and the 110 years before it, so nobody is left out', () => {
  const years = birthYears(now);
  assert.equal(years[0], 2026);
  assert.equal(years.at(-1), 1916);
  assert.equal(years.length, 111);
  assert.ok(years.includes(2016) && years.includes(2012), 'a 10-year-old and a 14-year-old can choose their year');
});

test('flagged items are hidden from under-16s only, and the count is reported', () => {
  const items = [{ id: 'a' }, { id: 'b', sensitive: ['alcohol'] }, { id: 'c', sensitive: ['vulgar', 'offensive'] }, { id: 'd', sensitive: ['unknown-flag'] }];
  assert.deepEqual(flagsOf(items[2]), ['vulgar', 'offensive']);
  assert.deepEqual(flagsOf(items[3]), [], 'unknown flags are ignored (the validator rejects them)');
  const child = forLearner(items, { birth_year: 2016 }, now);
  assert.deepEqual(child.shown.map((x) => x.id), ['a', 'd']);
  assert.equal(child.hidden, 2);
  for (const p of [{ birth_year: 2009 }, { birth_year: 2008 }, { birth_year: 1990 }, null]) {
    const r = forLearner(items, p, now);
    assert.equal(r.shown.length, 4, `nothing is hidden for ${JSON.stringify(p)}`);
    assert.equal(r.hidden, 0);
  }
  assert.deepEqual(SENSITIVE_FLAGS, ['offensive', 'vulgar', 'sexual', 'alcohol']);
});

test('content.js leaves flagged scenarios and expressions out for an under-16 profile, at call time', async () => {
  const slang = JSON.parse(readFileSync(new URL('../../content/real-life/slang.json', import.meta.url), 'utf8'));
  slang.entries.push({ id: 'test-flagged', term: 'Flagged', sensitive: ['vulgar'], warning: { en: 'x', he: 'x' } });
  globalThis.fetch = async (url) => ({ ok: true, status: 200, json: async () => (String(url).includes('slang') ? structuredClone(slang) : { scenarios: [{ id: 's1' }, { id: 's2', sensitive: ['alcohol'] }] }) });
  globalThis.addEventListener ??= () => {};
  const { openStore } = await import('../../js/core/store.js');
  const store = await openStore();
  const { content } = await import('../../js/core/content.js');
  const year = new Date().getFullYear();
  store.put('profile', { id: 'me', onboarded: true, birth_year: year - 30 });
  let d = await content.slang();
  assert.ok(d.entries.some((x) => x.id === 'test-flagged'), 'an adult sees the flagged entry');
  assert.equal(d.hidden_for_age, undefined);
  store.update('profile', 'me', { birth_year: year - 10 });
  d = await content.slang();
  assert.ok(!d.entries.some((x) => x.id === 'test-flagged'), 'a 10-year-old does not');
  assert.equal(d.hidden_for_age, 1);
  assert.equal(d.entries.length, slang.entries.length - 1, 'every unflagged entry is still there');
  const sc = await content.scenarios();
  assert.deepEqual(sc.scenarios.map((x) => x.id), ['s1']);
  assert.equal(sc.hidden_for_age, 1);
  store.update('profile', 'me', { birth_year: year - 16 });
  assert.equal((await content.slang()).hidden_for_age, 1, 'turning 16 this year may still be 15: still hidden');
  store.update('profile', 'me', { birth_year: year - 17 });
  assert.equal((await content.slang()).entries.length, slang.entries.length, 'surely 16: the entry is back, with its warning');
});

test('content flags, where present, are known ones', () => {
  for (const [file, key] of [['real-life/slang.json', 'entries'], ['real-life/scenarios.json', 'scenarios']]) {
    const list = JSON.parse(readFileSync(new URL(`../../content/${file}`, import.meta.url), 'utf8'))[key];
    for (const x of list) if (x.sensitive !== undefined) assert.ok(flagsOf(x).length === x.sensitive.length, `${x.id} has an unknown flag`);
  }
});

// Honest copy for children and parents: the in-app notes say only that flagged content is hidden (no list of
// what), and privacy.html, which lists the flags, says no item carries one; this keeps that sentence true.
test('what under-16s are told matches the content: neutral notes in the app, and no flagged item while privacy.html says so', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  for (const f of ['views/onboarding.js', 'views/profile.js']) {
    const src = readFileSync(new URL(`../../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/כמיניים|לאלכוהול|rude, sexual|about alcohol/.test(src), `${f} lists sexual or alcohol content to a child`);
    assert.ok(src.includes('תוכן שמסומן כלא מתאים לגיל לא מוצג'), `${f} lacks the neutral note`);
  }
  const policy = readFileSync(new URL('../../privacy.html', import.meta.url), 'utf8');
  const flagged = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = new URL(name, dir);
      if (statSync(path).isDirectory()) { walk(new URL(`${name}/`, dir)); continue; }
      if (!name.endsWith('.json')) continue;
      const visit = (x) => { if (Array.isArray(x)) x.forEach(visit); else if (x && typeof x === 'object') { if (Array.isArray(x.sensitive) && x.sensitive.length) flagged.push(`${name}:${x.id}`); Object.values(x).forEach(visit); } };
      visit(JSON.parse(readFileSync(path, 'utf8')));
    }
  };
  walk(new URL('../../content/', import.meta.url));
  if (policy.includes('no item in Lucid carries such a flag') || policy.includes('כרגע אף פריט ב-Lucid לא מסומן כך')) {
    assert.deepEqual(flagged, [], 'content is flagged now: update privacy.html (both languages), then this test');
  }
});

// The AI prompts are age-neutral and child-safe, and do not forbid what the scenario briefs need: when a scene
// needs a name, an address or a number, the partner asks for an invented one (the AI is off on the live site;
// these prompts were not run against a model).
test('the AI prompts: no age claim, child-safe for everyone, and personal details are made up, never real', () => {
  const src = readFileSync(new URL('../../supabase/functions/lucid-ai/prompts.ts', import.meta.url), 'utf8');
  assert.ok(!/16\+|aged 16|16 and over/.test(src), 'an age claim in the prompts');
  assert.ok(!/never ask for personal details \(full name, address/.test(src), 'the roleplay rule contradicts scenes that need an address');
  assert.match(src, /invented one is fine/);
  assert.match(src, /do not repeat them/);
  const scenarios = JSON.parse(readFileSync(new URL('../../content/real-life/scenarios.json', import.meta.url), 'utf8')).scenarios;
  assert.ok(scenarios.some((x) => /address/.test(JSON.stringify(x.roleplay || x))), 'a scene that needs an address (the reason for the rule)');
});
