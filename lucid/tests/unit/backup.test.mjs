// Backups (FR-06, IS-02; js/core/backup.js): one format for Settings, the restore screen and the move. A backup is
// checked and summarised before anything is written; a bad one changes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryBackend, COLLECTIONS } from '../../js/core/store.js';
import { makeBackup, checkBackup, restoreBackup, describeBackup, backupProblem, backupFileName, MAX_BACKUP_BYTES, devicePreferences } from '../../js/core/backup.js';

function learner() {
  const s = createStore(memoryBackend());
  s.put('profile', { id: 'me', onboarded: true, name: 'Dana', birth_year: 2001, ui_language: 'en' });
  s.put('settings', { id: 'me', daily_minutes: 20 });
  s.put('progress', { id: 'a1-01', status: 'completed', level: 'A1' });
  s.put('progress', { id: 'a1-02', status: 'started', level: 'A1' });
  s.put('progress', { id: 'a1-03', status: 'completed', level: 'A1' });
  s.remove('progress', 'a1-03'); // a tombstone is not a completed lesson
  for (const w of ['cat', 'dog', 'sun']) s.put('cards', { id: w, due: '2026-11-12' });
  s.put('writing', { id: 'w1', text: 'My first essay.' });
  return s;
}

test('a backup made on one device restores on a fresh one, with every collection, and says what it holds', async () => {
  const b = makeBackup(learner(), { now: new Date('2026-11-10T08:00:00Z') });
  assert.equal(b.app, 'lucid'); assert.equal(b.version, 1); assert.equal(b.exported_at, '2026-11-10T08:00:00.000Z'); assert.equal(b.server, null);
  assert.deepEqual(Object.keys(b.device).sort(), [...COLLECTIONS].sort());
  const text = JSON.stringify(b, null, 1);
  const r = checkBackup(text);
  assert.equal(r.ok, true);
  assert.deepEqual(r.summary, { name: 'Dana', exportedAt: '2026-11-10T08:00:00.000Z', lessons: 1, words: 3, writing: 1, chats: 0 });
  const fresh = createStore(memoryBackend());
  assert.equal(fresh.hasData(), false);
  const summary = await restoreBackup(fresh, text);
  assert.equal(summary.lessons, 1);
  assert.equal(fresh.get('profile', 'me').name, 'Dana');
  assert.equal(fresh.get('profile', 'me').onboarded, true, 'the router sends the learner to Today, not to onboarding');
  assert.equal(fresh.all('cards').length, 3);
  assert.equal(fresh.get('progress', 'a1-01').status, 'completed');
});

// Launch integration: the export's preferences (TS-08) are part of the one backup format, so the restore screen
// (#/import) and the move from the old address carry them as Settings does, and never the sign-in session.
function prefsStorage(entries) {
  const m = new Map(Object.entries(entries));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
test('a backup holds the preferences Lucid keeps in localStorage, not the sign-in session, and a restore brings them back', async () => {
  const from = prefsStorage({ 'lucid-mic-notice': '1', 'lucid-he-all': '["a1-01"]', 'lucid-session': '{"access_token":"secret"}', 'lucid-owner': 'u1', 'hgos-other-app': 'x' });
  assert.deepEqual(devicePreferences(from), { 'lucid-mic-notice': '1', 'lucid-he-all': '["a1-01"]' });
  const b = makeBackup(learner(), { preferences: devicePreferences(from) });
  assert.deepEqual(b.preferences, { 'lucid-mic-notice': '1', 'lucid-he-all': '["a1-01"]' });
  assert.ok(!JSON.stringify(b).includes('secret'), 'the sign-in session is in the backup');
  // A forged file cannot write the session, the owner mark or another app's keys.
  const text = JSON.stringify({ ...b, preferences: { ...b.preferences, 'lucid-session': 'forged', 'lucid-owner': 'forged', 'hgos-other-app': 'forged' } });
  const to = prefsStorage({ 'lucid-session': 'mine' });
  await restoreBackup(createStore(memoryBackend()), text, { storage: to });
  assert.equal(to.map.get('lucid-mic-notice'), '1');
  assert.equal(to.map.get('lucid-he-all'), '["a1-01"]');
  assert.equal(to.map.get('lucid-session'), 'mine');
  assert.ok(!to.map.has('lucid-owner') && !to.map.has('hgos-other-app'));
  // Without a localStorage (node, a blocked browser) the backup is made and restored all the same.
  assert.deepEqual(makeBackup(learner()).preferences, {});
});

test('checkBackup refuses what is not a usable Lucid backup, and says why', () => {
  const ok = makeBackup(learner());
  const cases = [
    ['not json', 'json'],
    [JSON.stringify({ app: 'other', device: ok.device }), 'app'],
    [JSON.stringify([1, 2]), 'app'],
    [{ ...ok, version: 99 }, 'version'],
    [{ ...ok, version: '1' }, 'version'],
    [{ ...ok, device: null }, 'shape'],
    [{ ...ok, device: [] }, 'shape'],
    [{ ...ok, device: { ...ok.device, cards: 'x' } }, 'shape'],
    [{ ...ok, device: { ...ok.device, cards: [{ no: 'id' }] } }, 'shape'],
    [{ ...ok, device: { ...ok.device, cards: [null] } }, 'shape'],
    [{ ...ok, device: { ...ok.device, profile: [] } }, 'profile'],
    [{ ...ok, device: { ...ok.device, profile: [{ id: 'me', name: 'X' }] } }, 'profile'],
    [{ ...ok, device: { ...ok.device, profile: [{ id: 'me', onboarded: true, _deleted: true }] } }, 'profile'],
    ['x'.repeat(MAX_BACKUP_BYTES + 1), 'size'],
  ];
  for (const [input, reason] of cases) assert.deepEqual(checkBackup(input), { ok: false, reason }, `${reason}: ${String(JSON.stringify(input)).slice(0, 60)}`);
  // An older backup without a version, or without a collection added later, is still fine.
  const { version, ...old } = ok;
  const { events, ...device } = ok.device;
  assert.equal(checkBackup({ ...old, device }).ok, true);
});

test('a refused backup changes nothing on the device', async () => {
  const s = learner();
  const before = JSON.stringify(s.snapshot());
  await assert.rejects(restoreBackup(s, '{"app":"lucid","device":{"profile":[]}}'), (e) => e.reason === 'profile');
  await assert.rejects(restoreBackup(s, 'nope'), (e) => e.reason === 'json');
  assert.equal(JSON.stringify(s.snapshot()), before);
});

test('the summary lines and the problems are plain, in both languages, and the file name is dated', () => {
  const lines = describeBackup({ name: 'Dana', exportedAt: '2026-11-10T08:00:00.000Z', lessons: 2, words: 5, writing: 1, chats: 0 });
  assert.equal(lines.length, 5);
  assert.match(lines[0], /Dana/);
  assert.match(lines[2], /: 2$/);
  assert.deepEqual(describeBackup({ name: '', exportedAt: '', lessons: 0, words: 0, writing: 0 }).length, 3);
  for (const r of ['profile', 'version', 'json', 'shape', undefined]) assert.ok(backupProblem(r).length > 20);
  assert.equal(backupFileName(new Date('2026-11-10T08:00:00Z')), 'lucid-data-2026-11-10.json');
});

test('Settings, the restore screen and the move all use this one module (no second copy of the checks)', () => {
  const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
  assert.match(read('js/views/settings.js'), /checkBackup\(text\)[\s\S]*restoreBackup\(store, text\)/);
  assert.doesNotMatch(read('js/views/settings.js'), /store\.replaceAll\(/);
  assert.match(read('js/views/restore.js'), /restoreBackup\(store, pending\.backup\)/);
  assert.match(read('js/ui/moved.js'), /makeBackup\(store\)/);
});
