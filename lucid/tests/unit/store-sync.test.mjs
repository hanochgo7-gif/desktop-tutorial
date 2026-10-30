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
  assert.equal(a.get('cards', 'v:student')._deleted, true, 'deletions sync');
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
