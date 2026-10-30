// Email-link sign-in (security review S-01) and password change (S-12) in js/core/api.js, with browser
// globals faked: storage, location/history and fetch against a pretend Supabase Auth.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const fakeStorage = () => {
  const m = new Map();
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), m };
};
globalThis.localStorage = fakeStorage();
globalThis.sessionStorage = fakeStorage();
globalThis.location = { origin: 'https://example.org', pathname: '/lucid/', search: '', hash: '' };
globalThis.history = { replaceState: (_s, _t, url) => { location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''; } };

const USERS = { victim: { id: 'u-victim', email: 'learner@example.com' }, attacker: { id: 'u-attacker', email: 'attacker@example.com' } };
const PASSWORDS = { 'learner@example.com': 'old password 1' };
let calls = [];
let online = true;
globalThis.fetch = async (url, init = {}) => {
  if (!online) throw new TypeError('fetch failed');
  const u = new URL(url, 'https://mock.supabase.co');
  const body = init.body ? JSON.parse(init.body) : null;
  const authz = init.headers?.Authorization || '';
  calls.push({ method: init.method, path: u.pathname, search: u.search, body, authz });
  const reply = (status, json) => ({ ok: status < 400, status, text: async () => JSON.stringify(json) });
  if (u.pathname === '/auth/v1/signup') return reply(200, { id: 'u-victim', email: body.email }); // confirmation needed
  if (u.pathname === '/auth/v1/recover') return reply(200, {});
  if (u.pathname === '/auth/v1/user' && init.method === 'GET') {
    const who = authz.endsWith('victim-token') || authz.endsWith('fresh-token') ? USERS.victim : authz.endsWith('attacker-token') ? USERS.attacker : null;
    return who ? reply(200, who) : reply(401, { msg: 'invalid JWT' });
  }
  if (u.pathname === '/auth/v1/user' && init.method === 'PUT') return reply(200, { ...USERS.victim });
  if (u.pathname === '/auth/v1/token') {
    if (PASSWORDS[body.email] === body.password) return reply(200, { access_token: 'fresh-token', refresh_token: 'r2', expires_in: 3600, user: USERS.victim });
    return reply(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
  }
  if (u.pathname === '/auth/v1/logout') return reply(204, {});
  return reply(404, { msg: 'unmocked' });
};

const { auth, safeNext, LINK_WINDOW_MS } = await import('../../js/core/api.js');
const fragment = (token, type, extra = '') => `#access_token=${token}&expires_in=3600&refresh_token=r&token_type=bearer&type=${type}${extra}`;

beforeEach(async () => {
  await auth.signOut();
  localStorage.clear(); sessionStorage.clear();
  location.hash = ''; calls = []; online = true;
});

test('a sign-in link that this device never asked for is ignored and stripped (S-01)', async () => {
  location.hash = fragment('attacker-token', 'signup');
  const r = await auth.consumeRedirect();
  assert.equal(r.adopted, false);
  assert.equal(auth.signedIn, false);
  assert.equal(localStorage.getItem('lucid-session'), null, 'no session stored');
  assert.ok(!location.hash.includes('access_token'), 'tokens leave the address bar');
  assert.equal(location.hash, '#/account?mode=signin&notice=link');
  assert.ok(!calls.some((c) => c.authz.includes('attacker-token')), 'the foreign token is never used');
});

test('a confirmation link is adopted after a sign-up on this device, and the learner returns where they were (S-01, P-22)', async () => {
  const r0 = await auth.signUp('Learner@Example.com', 'a good password', { next: '#/scenario/hotel?tab=roleplay' });
  assert.equal(r0.needsConfirmation, true);
  assert.ok(calls[0].search.includes('redirect_to='));
  location.hash = fragment('victim-token', 'signup');
  const r = await auth.consumeRedirect();
  assert.equal(r.adopted, true);
  assert.equal(r.user.email, 'learner@example.com');
  assert.equal(auth.user.id, 'u-victim', 'the user is fetched and stored');
  assert.equal(location.hash, '#/scenario/hotel?tab=roleplay');
  assert.equal(localStorage.getItem('lucid-auth-pending'), null, 'the marker is single-use');
});

test('a link for a different email than the one typed here is refused, even within the hour (S-01)', async () => {
  await auth.signUp('learner@example.com', 'a good password');
  location.hash = fragment('attacker-token', 'signup');
  const r = await auth.consumeRedirect();
  assert.equal(r.adopted, false);
  assert.equal(r.reason, 'email_mismatch');
  assert.equal(auth.signedIn, false);
  assert.equal(localStorage.getItem('lucid-session'), null);
});

test('stale markers, mismatched link types and error links are refused (S-01)', async () => {
  await auth.signUp('learner@example.com', 'a good password');
  const p = JSON.parse(localStorage.getItem('lucid-auth-pending'));
  localStorage.setItem('lucid-auth-pending', JSON.stringify({ ...p, at: Date.now() - LINK_WINDOW_MS - 1000 }));
  location.hash = fragment('victim-token', 'signup');
  assert.equal((await auth.consumeRedirect()).adopted, false, 'older than an hour');

  await auth.signUp('learner@example.com', 'a good password');
  location.hash = fragment('victim-token', 'recovery');
  const r = await auth.consumeRedirect();
  assert.equal(r.adopted, false, 'a sign-up marker does not accept a recovery link');
  assert.equal(location.hash, '#/account?mode=reset&notice=link');

  location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
  assert.equal((await auth.consumeRedirect()).reason, 'link_error');
  assert.equal(location.hash, '#/account?mode=signin&notice=expired');

  location.hash = '#/today';
  assert.equal(await auth.consumeRedirect(), null, 'ordinary routes are left alone');
  assert.equal(location.hash, '#/today');
});

test('a password change needs the current password, except right after a reset link from this device (S-12)', async () => {
  await auth.resetPassword('learner@example.com');
  location.hash = fragment('victim-token', 'recovery');
  const r = await auth.consumeRedirect();
  assert.equal(r.adopted, true);
  assert.equal(location.hash, '#/settings?reset=1');
  assert.equal(auth.recoveryFresh, true);
  calls = [];
  await auth.updatePassword('brand new pass 1');
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ['PUT /auth/v1/user'], 'no re-authentication after a fresh reset link');
  assert.equal(auth.recoveryFresh, false, 'the exemption is used up');

  await assert.rejects(auth.updatePassword('another pass 2'), (e) => e.code === 'reauth_required');
  await assert.rejects(auth.updatePassword('another pass 2', { current: 'wrong guess' }), (e) => e.code === 'wrong_password');
  assert.ok(!calls.some((c) => c.method === 'PUT' && c.body?.password === 'another pass 2'), 'nothing changed with a wrong current password');
  calls = [];
  await auth.updatePassword('another pass 2', { current: 'old password 1' });
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ['POST /auth/v1/token', 'PUT /auth/v1/user']);
});

test('only in-app routes are accepted as a place to return to (P-22)', () => {
  assert.equal(safeNext('#/scenario/hotel?tab=roleplay'), '#/scenario/hotel?tab=roleplay');
  assert.equal(safeNext('#/settings'), '#/settings');
  for (const bad of ['#/account?mode=signin', '#/welcome', '#/start', 'https://evil.example/#/today', '//evil.example', '#/x"><script>', null, '']) assert.equal(safeNext(bad), '', String(bad));
});
