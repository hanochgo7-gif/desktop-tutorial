// Hash parsing (security review S-17) and the "came from" route used to return after signing in (P-22).
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { hash: '' };
const { parse, hrefOf } = await import('../../js/core/router.js');

test('a malformed escape in the hash does not throw; it is marked so the router can replace it (S-17)', () => {
  assert.doesNotThrow(() => parse('#/%E0%A4%A'));
  assert.deepEqual(parse('#/%E0%A4%A'), { path: '', query: {}, malformed: true });
  assert.deepEqual(parse('#/lesson/%ZZ'), { path: '', query: {}, malformed: true });
  location.hash = '#/%';
  assert.equal(parse().malformed, true, 'reads location.hash by default');
});

test('ordinary hashes parse as before', () => {
  assert.deepEqual(parse('#/scenario/hotel?tab=roleplay'), { path: 'scenario/hotel', query: { tab: 'roleplay' } });
  assert.deepEqual(parse('#/path/B2/'), { path: 'path/B2', query: {} });
  assert.deepEqual(parse(''), { path: '', query: {} });
  assert.deepEqual(parse('#/writing/free?x=%D7%A9'), { path: 'writing/free', query: { x: 'ש' } });
});

test('a route state turns back into the hash it came from (P-22)', () => {
  assert.equal(hrefOf({ path: 'scenario/hotel', query: { tab: 'roleplay' } }), '#/scenario/hotel?tab=roleplay');
  assert.equal(hrefOf({ path: 'settings', query: {} }), '#/settings');
  const back = parse(hrefOf({ path: 'tutor', query: { mode: 'grammar' } }));
  assert.deepEqual(back, { path: 'tutor', query: { mode: 'grammar' } });
  const next = `scenario/hotel?tab=roleplay`;
  assert.deepEqual(parse(`#/account?mode=signin&next=${encodeURIComponent(next)}`).query, { mode: 'signin', next }, 'an encoded ? stays inside the value');
  assert.deepEqual(parse('#/expressions?open=break%20a%20leg&q=a+b').query, { open: 'break a leg', q: 'a b' });
});

// The top bar of the Hebrew UI (SC-9): an English-only title gives way to its section's name.
test('an English-only title shows its section name in the Hebrew top bar; Hebrew titles and the English UI keep theirs', async () => {
  const { topTitle, sectionOf } = await import('../../js/core/router.js');
  assert.equal(topTitle('Free writing', { lang: 'he', section: 'מעבדת כתיבה' }), 'מעבדת כתיבה');
  assert.equal(topTitle('Check-in: an overweight bag', { lang: 'he', section: 'אנגלית לחיים' }), 'אנגלית לחיים');
  assert.equal(topTitle('היום', { lang: 'he', section: 'היום' }), 'היום');
  assert.equal(topTitle('צ׳ק-אין: Check-in', { lang: 'he', section: 'x' }), 'צ׳ק-אין: Check-in', 'a title with Hebrew in it stays');
  assert.equal(topTitle('Free writing', { lang: 'en', section: 'Writing lab' }), 'Free writing');
  assert.equal(topTitle('Free writing', { lang: 'he', section: '' }), 'Free writing', 'no section: the title stays');
  assert.equal(topTitle('', { lang: 'he', section: 'היום' }), '');
  const NAV = [['today', 'nav.today', 'today'], ['practice', 'nav.practice', 'practice'], ['real-life', 'nav.reallife', 'reallife']];
  const MORE = [['writing', 'nav.writing', 'writing'], ['vocab', 'nav.vocab', 'vocab']];
  assert.equal(sectionOf({ path: 'writing/free', extra: { nav: 'practice' } }, NAV, MORE)?.[1], 'nav.writing', 'a lab names itself, not Practice');
  assert.equal(sectionOf({ path: 'scenario/rl-x', extra: { nav: 'reallife' } }, NAV, MORE)?.[1], 'nav.reallife');
  assert.equal(sectionOf({ path: 'today', extra: { nav: 'today' } }, NAV, MORE)?.[1], 'nav.today');
  assert.equal(sectionOf({ path: 'settings', extra: { nav: 'settings' } }, NAV, MORE)?.[1], 'nav.settings');
  assert.equal(sectionOf({ path: 'account', extra: {} }, NAV, MORE), null);
  assert.equal(sectionOf({ path: 'vocabulary-x', extra: {} }, NAV, MORE), null, 'a prefix that is not a path segment is not the lab');
});
