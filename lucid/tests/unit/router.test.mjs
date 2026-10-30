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
