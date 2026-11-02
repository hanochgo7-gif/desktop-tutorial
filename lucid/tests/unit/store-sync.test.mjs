import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../../js/core/store.js';
import { createSync } from '../../js/core/sync.js';

// A fake server with the same semantics as lucid_records: the server stamps updated_at.
function fakeServer() {
  const rows = new Map(); let clock = 0;
  const stamp = () => new Date(Date.UTC(2026, 9, 30, 12, 0, 0, ++clock)).toISOString();
  return {
    rows,
    async pushRecords(batch) { return batch.map((r) => { const row = { ...r, updated_at: stamp() }; rows.set(`${r.coll}/${r.id}`, row); return row; }); },
    async pullRecords(since) { return [...rows.values()].filter((r) => !since || r.updated_at > since).sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1)); },
    edit(coll, id, data) { rows.set(`${coll}/${id}`, { coll, id, data: { ...data, id }, deleted: false, updated_at: stamp() }); },
  };
}
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('store persists through its backend and emits changes', async () => {
  const backend = memoryBackend();
  const s = createStore(backend);
  const seen = [];
  s.on('change', (e) => seen.push(e.colls[0]));
  s.put('progress', { id: 'pa1-05', score: 0.8 });
  s.update('progress', 'pa1-05', { score: 0.9 });
  await s.flush();
  const s2 = createStore(backend);
  await s2.load();
  assert.equal(s2.get('progress', 'pa1-05').score, 0.9);
  assert.deepEqual(seen, ['progress', 'progress']);
  s2.remove('progress', 'pa1-05');
  assert.equal(s2.all('progress').length, 0);
  assert.equal(s2.all('progress', { includeDeleted: true }).length, 1, 'tombstone kept for sync');
  assert.throws(() => s.put('nope', { id: 1 }));
});

test('two devices converge through the server, newest write wins, dirty local data is not clobbered', async () => {
  const server = fakeServer();
  const a = createStore(), b = createStore();
  const syncA = createSync({ store: a, api: server, storage: mem() });
  const syncB = createSync({ store: b, api: server, storage: mem() });

  a.put('progress', { id: 'a1-01', score: 0.6 });
  a.put('cards', { id: 'v:student', due: '2026-11-01' });
  assert.deepEqual(await syncA.run(), { pushed: 2, pulled: 2 });
  assert.equal(a.dirty().length, 0);

  await syncB.run();
  assert.equal(b.get('progress', 'a1-01').score, 0.6, 'B received A\'s progress');

  b.update('progress', 'a1-01', { score: 0.9 });
  await syncB.run();
  await syncA.run();
  assert.equal(a.get('progress', 'a1-01').score, 0.9, 'newer write from B reached A');

  // A edits offline while the server gets an edit from elsewhere: A's unsynced change survives the pull, then wins on push.
  a.update('progress', 'a1-01', { score: 1 });
  server.edit('progress', 'a1-01', { score: 0.1 });
  await syncA.run();
  assert.equal(a.get('progress', 'a1-01').score, 1);
  assert.equal(server.rows.get('progress/a1-01').data.score, 1);

  b.remove('cards', 'v:student');
  await syncB.run(); await syncA.run();
  assert.equal(a.get('cards', 'v:student'), null, 'deletions sync');
  assert.equal(a.get('cards', 'v:student', { includeDeleted: true })._deleted, true, 'as a tombstone');
  assert.equal(syncA.status().pending, 0);
});

test('a failed push keeps data dirty and reports offline', async () => {
  const s = createStore();
  const sync = createSync({ store: s, storage: mem(), api: { pushRecords: async () => { throw Object.assign(new Error('No connection'), { network: true }); }, pullRecords: async () => [] } });
  s.put('attempts', { id: 'x1', correct: true });
  await assert.rejects(sync.run());
  assert.equal(s.dirty().length, 1);
  assert.equal(sync.status().offline, true);
});

// ---------- security review S-18, S-06, S-05, S-04 ----------
import { eraseDevice, LUCID_KEY } from '../../js/core/store.js';

test('deleting keeps only an id tombstone, hides it from get(), and a later local write brings the record back (S-18)', async () => {
  const s = createStore();
  s.put('writing', { id: 'ess:1', text: 'My private essay' });
  s.remove('writing', 'ess:1');
  assert.equal(s.get('writing', 'ess:1'), null, 'tombstones are hidden by default');
  const tomb = s.get('writing', 'ess:1', { includeDeleted: true });
  assert.deepEqual(Object.keys(tomb).sort(), ['_deleted', '_dirty', 'id', 'updated_at']);
  assert.equal(tomb.text, undefined, 'the content is gone from the device at once');
  // A lesson placed out, moved back, then completed must not stay deleted.
  s.put('progress', { id: 'a1-01', status: 'placed_out' });
  s.remove('progress', 'a1-01');
  s.put('progress', { ...(s.get('progress', 'a1-01') || {}), id: 'a1-01', status: 'completed' });
  assert.equal(s.all('progress').length, 1);
  assert.equal(s.get('progress', 'a1-01')._deleted, undefined);
});

test('sync pushes tombstones with an empty document and stores pulled deletions without content (S-18)', async () => {
  const server = fakeServer();
  const a = createStore(), b = createStore();
  const syncA = createSync({ store: a, api: server, storage: mem() });
  const syncB = createSync({ store: b, api: server, storage: mem() });
  a.put('chats', { id: 'tutor-1', messages: [{ role: 'user', text: 'secret' }] });
  await syncA.run(); await syncB.run();
  a.remove('chats', 'tutor-1');
  await syncA.run();
  const row = server.rows.get('chats/tutor-1');
  assert.equal(row.deleted, true);
  assert.deepEqual(row.data, {}, 'the server row keeps no content');
  // An older server row that still carries data (pushed before this fix) is not copied into the tombstone.
  server.rows.set('chats/tutor-1', { ...row, data: { messages: ['old'] }, updated_at: new Date(Date.UTC(2026, 9, 30, 13)).toISOString() });
  await syncB.run();
  assert.equal(b.get('chats', 'tutor-1'), null);
  assert.equal(b.get('chats', 'tutor-1', { includeDeleted: true }).messages, undefined);
});

test('a guard keeps sync idle: nothing is pushed or pulled while it says no (S-05, S-06)', async () => {
  const server = fakeServer();
  const s = createStore();
  let allowed = false;
  const sync = createSync({ store: s, api: server, storage: mem(), guard: () => allowed });
  s.put('attempts', { id: 'x1', correct: true });
  assert.deepEqual(await sync.run(), { pushed: 0, pulled: 0, skipped: true });
  assert.equal(server.rows.size, 0);
  assert.equal(sync.status().paused, true);
  allowed = true;
  assert.equal((await sync.run()).pushed, 1);
});

test('the device remembers which account owns its data; wiping forgets it (S-06)', async () => {
  const storage = mem();
  const s = createStore(memoryBackend(), { storage });
  assert.equal(s.hasData(), false);
  assert.equal(s.owner(), null);
  s.put('profile', { id: 'me', name: 'A' });
  s.setOwner('user-a');
  assert.equal(s.hasData(), true);
  assert.equal(createStore(memoryBackend(), { storage }).owner(), 'user-a', 'kept across reloads');
  await s.wipe();
  assert.equal(s.hasData(), false);
  assert.equal(s.owner(), null);
});

test('erasing the device removes only Lucid keys and caches, never other apps on the origin (S-04)', async () => {
  const fakeStorage = (entries) => {
    const m = new Map(Object.entries(entries));
    return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null, removeItem: (k) => m.delete(k), setItem: (k, v) => m.set(k, v), m };
  };
  const local = fakeStorage({ 'lucid-session': '{}', 'lucid-owner': 'u', 'lucid-sync-cursor:u': 't', 'lucid-auth-pending': '{}', 'hgos-session': 'crm', 'hgos-outbox': '[1]', theme: 'dark' });
  const session = fakeStorage({ 'lucid-ui-lang': 'he', 'lucid-recovery-at': '1', 'other-app': 'x' });
  const names = new Set(['lucid-2026-10-30.1', 'lucid-v1', 'hgos-v3', 'workbox-precache']);
  const cacheStorage = { keys: async () => [...names], delete: async (n) => names.delete(n) };
  await eraseDevice({ storages: [local, session], cacheStorage });
  assert.deepEqual([...local.m.keys()].sort(), ['hgos-outbox', 'hgos-session', 'theme']);
  assert.deepEqual([...session.m.keys()], ['other-app']);
  assert.deepEqual([...names].sort(), ['hgos-v3', 'workbox-precache']);
  assert.ok(LUCID_KEY.test('lucid-owner') && !LUCID_KEY.test('lucidity') && !LUCID_KEY.test('hgos-session'));
});
