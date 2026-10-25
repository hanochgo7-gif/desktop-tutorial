// Sync layer (remote mode) against a fake PostgREST: outbox, retries, rejected writes, edits during a flush.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'hgos-store-'));
for (const f of ['store.js', 'rules.js']) copyFileSync(join(here, '../js/core', f), join(dir, f));
writeFileSync(join(dir, 'api.js'), `
export class ApiError extends Error { constructor(m, o = {}) { super(m); Object.assign(this, { status: 0, code: '', details: '', network: false }, o); } }
export const server = { rows: new Map(), seq: 100, fail: [], delay: 0 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function gate() { await wait(server.delay); const f = server.fail.shift(); if (f) throw f; }
export const db = {
  async insert(t, row) { await gate(); const r = { ...row, seq: ++server.seq, version: 1 }; server.rows.set(row.id, r); return { ...r }; },
  async update(t, id, patch) { await gate(); const cur = server.rows.get(id); if (!cur) throw new ApiError('not found', { status: 404 }); Object.assign(cur, patch, { seq: ++server.seq }); return { ...cur }; },
  async select(t, q) { const m = /id=eq\\.([^&]+)/.exec(q); if (m) { const r = server.rows.get(decodeURIComponent(m[1])); return r ? [{ ...r }] : []; } return []; },
  async selectAll() { return []; },
};`);

globalThis.localStorage = { m: new Map(), getItem(k) { return this.m.get(k) ?? null; }, setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
globalThis.addEventListener ||= () => {};
const { store } = await import(join(dir, 'store.js'));
const { server, ApiError } = await import(join(dir, 'api.js'));
store.mode = 'remote'; store.workspace = { id: 'ws', settings: {} }; store.userId = 'u';
store.on('error', () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const offline = () => new ApiError('offline', { network: true });
const reset = () => { clearTimeout(store.retryTimer); store.outbox = []; server.fail = []; server.delay = 0; };

test('an edit made while the queued insert is being sent reaches the server', async () => {
  reset();
  server.fail.push(offline());
  const t = await store.insert('crm_tasks', { title: 'call back', status: 'open' });
  assert.equal(store.outbox.length, 1);
  server.delay = 40;
  const flushing = store.flush();
  await sleep(10);
  await store.update('crm_tasks', t.id, { title: 'call back about the price' });
  await flushing;
  await store.flush();
  assert.equal(server.rows.get(t.id).title, 'call back about the price');
  assert.equal(store.get('crm_tasks', t.id).title, 'call back about the price');
  assert.equal(store.outbox.length, 0);
});

test('a 503 while sending the outbox keeps the queued work for a retry', async () => {
  reset();
  server.fail.push(offline());
  const c = await store.insert('crm_contacts', { first_name: 'Dana', phone: '0501234567' });
  server.fail.push(new ApiError('busy', { status: 503 }));
  await store.flush();
  assert.equal(store.outbox.length, 1, 'still queued');
  assert.ok(store.retryTimer, 'a retry is scheduled');
  await store.flush();
  assert.ok(server.rows.has(c.id));
  assert.equal(store.outbox.length, 0);
});

test('a direct write that fails on the network is retried later', async () => {
  reset();
  server.fail.push(offline());
  await store.insert('crm_tasks', { title: 'X', status: 'open' });
  assert.equal(store.status, 'offline');
  assert.ok(store.retryTimer, 'a retry is scheduled');
  clearTimeout(store.retryTimer);
});

test('a change the server rejects is dropped and the screen shows the server copy', async () => {
  reset();
  server.fail.push(offline());
  const c = await store.insert('crm_contacts', { first_name: 'Rejected', phone: '0507654321' });
  server.fail.push(new ApiError('bad', { status: 400 }));
  await store.flush();
  await sleep(10);
  assert.equal(store.outbox.length, 0);
  assert.equal(store.get('crm_contacts', c.id), undefined, 'the unsaved row is no longer shown');
});

test('writes to the same row are sent in order', async () => {
  reset();
  const t = await store.insert('crm_tasks', { title: 'v0', status: 'open' });
  server.delay = 20;
  await Promise.all([store.update('crm_tasks', t.id, { title: 'v1' }), store.update('crm_tasks', t.id, { title: 'v2' })]);
  assert.equal(server.rows.get(t.id).title, 'v2');
  assert.equal(store.get('crm_tasks', t.id).title, 'v2');
  clearTimeout(store.refreshSoon);
});
