// Signing in on a device that already holds learner data (security review S-06) and the server-profile
// gate in front of sync (S-05), in js/core/session.js. Browser globals are faked; the dialog closes itself
// with the answer each test sets.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const fakeStorage = () => {
  const m = new Map();
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), m };
};
const USER = { id: 'u-b', email: 'b@example.com' };
globalThis.localStorage = fakeStorage();
globalThis.sessionStorage = fakeStorage();
localStorage.setItem('lucid-session', JSON.stringify({ access_token: 'b-token', refresh_token: 'r', expires_at: Date.now() + 3_600_000, user: USER }));
globalThis.location = { origin: 'https://example.org', pathname: '/lucid/', search: '', hash: '' };
globalThis.history = { replaceState: () => {} };
globalThis.addEventListener = () => {};

let answer = 'cancel';
let dialogs = [];
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: () => {},
  getElementById: () => ({ append: () => {} }),
  createElement: () => {
    const listeners = {};
    const d = {
      innerHTML: '', returnValue: '',
      setAttribute() {}, remove() {}, querySelectorAll: () => [],
      addEventListener: (type, fn) => { listeners[type] = fn; },
      close(v) { d.returnValue = v; listeners.close?.(); },
      showModal() { dialogs.push(d); setTimeout(() => d.close(answer), 0); },
    };
    return d;
  },
};

const server = { profile: null, refuse: false, posts: [], records: 0 };
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url, 'https://mock.supabase.co');
  const reply = (status, json) => ({ ok: status < 400, status, text: async () => (json === undefined ? '' : JSON.stringify(json)) });
  const body = init.body ? JSON.parse(init.body) : null;
  if (u.pathname === '/rest/v1/lucid_profiles' && init.method === 'GET') return reply(200, server.profile ? [server.profile] : []);
  if (u.pathname === '/rest/v1/lucid_profiles' && init.method === 'POST') {
    server.posts.push(body);
    if (server.refuse) return reply(400, { code: 'P0001', message: 'Lucid is for learners aged 16 and over.' });
    server.profile = { ...body };
    return reply(201, [server.profile]);
  }
  if (u.pathname === '/auth/v1/logout') return reply(204);
  if (u.pathname === '/auth/v1/token') return reply(200, { access_token: 'b-token', refresh_token: 'r', expires_in: 3600, user: USER });
  return reply(404, { message: 'unmocked' });
};

const { openStore } = await import('../../js/core/store.js');
const store = await openStore();
const { auth } = await import('../../js/core/api.js');
const { ownership, connectAccount, syncAllowed } = await import('../../js/core/session.js');
const fakeSync = () => { const s = { runs: 0, run: async () => { s.runs++; return { pushed: 0, pulled: 0 }; } }; return s; };

beforeEach(async () => {
  await store.wipe();
  Object.assign(server, { profile: null, refuse: false, posts: [] });
  dialogs = []; answer = 'cancel';
  if (!auth.signedIn) await auth.signIn(USER.email, 'password 123');
});

test('ownership: never merge another account\'s data; ask before moving unowned data on a sign-in', () => {
  assert.equal(ownership({ owner: null, userId: 'b', hasData: false, kind: 'signin' }), 'proceed');
  assert.equal(ownership({ owner: 'b', userId: 'b', hasData: true, kind: 'resume' }), 'proceed');
  assert.equal(ownership({ owner: 'a', userId: 'b', hasData: true, kind: 'signup' }), 'other');
  assert.equal(ownership({ owner: 'a', userId: 'b', hasData: true, kind: 'signin' }), 'other');
  assert.equal(ownership({ owner: null, userId: 'b', hasData: true, kind: 'signin' }), 'unowned');
  assert.equal(ownership({ owner: null, userId: 'b', hasData: true, kind: 'signup' }), 'proceed', 'the sign-up screen says device progress moves in');
});

test('the server profile is created from the device profile before the first sync (S-05)', async () => {
  store.put('profile', { id: 'me', onboarded: true, name: 'B', birth_year: 2000, ui_language: 'he', goals: ['travel'] });
  store.setOwner(USER.id);
  const sync = fakeSync();
  const r = await connectAccount({ kind: 'signin', sync });
  assert.deepEqual({ ok: r.ok, synced: r.synced }, { ok: true, synced: true });
  assert.equal(server.posts[0].birth_year, 2000);
  assert.equal(syncAllowed(), true);
  assert.equal(sync.runs, 1);
});

test('when the server refuses the profile, nothing syncs (S-05)', async () => {
  store.put('profile', { id: 'me', onboarded: true, name: 'B', birth_year: 2015 });
  store.setOwner(USER.id);
  server.refuse = true;
  const sync = fakeSync();
  const r = await connectAccount({ kind: 'signin', sync });
  assert.equal(r.reason, 'profile');
  assert.equal(r.synced, false);
  assert.equal(syncAllowed(), false, 'the sync guard stays closed');
  assert.equal(sync.runs, 0);
});

test('signing in over another account\'s data and cancelling signs out and changes nothing (S-06)', async () => {
  store.put('profile', { id: 'me', onboarded: true, name: 'A', birth_year: 1990 });
  store.put('writing', { id: 'ess:a', text: 'A\'s essay' });
  store.setOwner('u-a');
  answer = 'cancel';
  const sync = fakeSync();
  const r = await connectAccount({ kind: 'signin', sync });
  assert.deepEqual({ ok: r.ok, reason: r.reason }, { ok: false, reason: 'cancelled' });
  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0].innerHTML, /data-owner-dialog="other"/);
  assert.match(dialogs[0].innerHTML, /b@example\.com/);
  assert.equal(auth.signedIn, false);
  assert.equal(store.owner(), 'u-a');
  assert.equal(store.get('writing', 'ess:a').text, 'A\'s essay');
  assert.equal(server.posts.length, 0, 'A\'s profile is never written to B\'s account');
  assert.equal(sync.runs, 0);
});

test('choosing to remove the other account\'s data wipes it and loads this account\'s profile (S-06)', async () => {
  store.put('profile', { id: 'me', onboarded: true, name: 'A', birth_year: 1990 });
  store.setOwner('u-a');
  localStorage.setItem('lucid-sync-cursor:u-b', '2026-01-01T00:00:00Z');
  server.profile = { id: USER.id, display_name: 'B', birth_year: 2001, ui_language: 'en', goals: [] };
  answer = 'clear';
  const sync = fakeSync();
  const r = await connectAccount({ kind: 'signin', sync });
  assert.equal(r.ok, true);
  assert.equal(store.owner(), USER.id);
  assert.equal(store.get('profile', 'me').name, 'B');
  assert.equal(localStorage.getItem('lucid-sync-cursor:u-b'), null, 'B pulls everything again');
  assert.equal(server.posts.length, 0);
  assert.equal(sync.runs, 1);
});

test('unowned data on a sign-in is moved only after the learner agrees (S-06)', async () => {
  store.put('profile', { id: 'me', onboarded: true, name: 'B', birth_year: 2000 });
  answer = 'move';
  const r = await connectAccount({ kind: 'signin', sync: fakeSync() });
  assert.equal(r.ok, true);
  assert.match(dialogs[0].innerHTML, /data-owner-dialog="unowned"/);
  assert.equal(store.owner(), USER.id);
  assert.equal(store.get('profile', 'me').name, 'B', 'kept');
});

test('a new device with only anonymous session events signs in without a question', async () => {
  store.put('events', { id: 'ev1', type: 'session', seconds: 40 });
  const r = await connectAccount({ kind: 'signin', sync: fakeSync() });
  assert.equal(r.ok, true);
  assert.equal(dialogs.length, 0);
  assert.equal(store.owner(), USER.id);
});
