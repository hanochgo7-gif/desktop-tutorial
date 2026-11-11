// Backups (FR-06, IS-02; js/core/backup.js): one format for Settings, the restore screen and the move. A backup is
// checked and summarised before anything is written; a bad one changes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryBackend, COLLECTIONS } from '../../js/core/store.js';
import { makeBackup, checkBackup, restoreBackup, describeBackup, backupProblem, backupFileName, MAX_BACKUP_BYTES, devicePreferences, restorePreferences } from '../../js/core/backup.js';
import { setUiLang } from '../../js/core/i18n.js';

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
  assert.deepEqual(r.summary, { name: 'Dana', exportedAt: '2026-11-10T08:00:00.000Z', lessons: 1, words: 3, writing: 1, lessonWriting: 0, chats: 0 });
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

// Launch verify (learner lens): a written answer in a lesson is not a Writing lab text. The restore and move summary
// counted every row of the writing collection as "Texts in the Writing lab", so a learner who never opened the lab
// saw one there; and one lab text with its versions and draft counted as several.
test('the summary counts Writing lab texts as the learner sees them, and lesson writing apart', () => {
  const s = createStore(memoryBackend());
  s.put('profile', { id: 'me', onboarded: true, name: 'Noa' });
  s.put('writing', { id: 'lesson:pa1-01:e13', source: 'lesson', lesson: 'pa1-01', exercise: 'e13', drafts: [{ text: 'I am Noa.' }] });
  const only = checkBackup(makeBackup(s));
  assert.equal(only.summary.writing, 0, 'a lesson answer counted as a Writing lab text');
  assert.equal(only.summary.lessonWriting, 1);
  globalThis.document ??= { documentElement: { dataset: {} } };
  try {
    setUiLang('en');
    const lines = describeBackup(only.summary);
    assert.ok(lines.includes('Texts in the Writing lab: 0') && lines.includes('Writing exercises in lessons: 1'), lines.join(' | '));
    setUiLang('he');
    const he = describeBackup(only.summary);
    assert.ok(he.includes('טקסטים במעבדת הכתיבה: 0') && he.includes('תרגילי כתיבה בשיעורים: 1'), he.join(' | '));
  } finally { setUiLang('he'); }
  // One lab text: its summary, two versions and a draft share the task id.
  s.put('writing', { id: 'ess:free', kind: 'essay-summary', exercise: 'free', versions: 2 });
  s.put('writing', { id: 'ess:free#v1', kind: 'essay-version', exercise: 'free', n: 1, text: 'One.' });
  s.put('writing', { id: 'ess:free#v2', kind: 'essay-version', exercise: 'free', n: 2, text: 'One two.' });
  s.put('writing', { id: 'ess:free#draft', kind: 'essay-draft', exercise: 'free', text: 'One two three.' });
  s.put('writing', { id: 'ess:w-a2-01#draft', kind: 'essay-draft', exercise: 'w-a2-01', text: 'Started.' });
  const both = checkBackup(makeBackup(s)).summary;
  assert.equal(both.writing, 2);
  assert.equal(both.lessonWriting, 1);
  // Without lesson writing there is no lesson line.
  assert.equal(describeBackup({ ...both, lessonWriting: 0 }).length, describeBackup(both).length - 1);
  assert.ok(!describeBackup({ ...both, lessonWriting: 0 }).some((l) => l.includes('בשיעורים')));
});

// Launch verify (security lens): the account state is not a preference. A backup carried the sign-up marker (with
// the email address) and the sync cursors to another device, where the marker would let that device adopt a sign-in
// link it never asked for.
test('the account state never goes into a backup, and a file cannot write it', () => {
  const ACCOUNT = { 'lucid-session': 'tok', 'lucid-owner': 'u1', 'lucid-auth-pending': '{"kind":"signup","email":"x@y.example"}', 'lucid-recovery-at': '1', 'lucid-sync-state': 'x', 'lucid-sync-cursor': '2026-11-01', 'lucid-sync-cursor:u1': '2026-11-01' };
  const PREFS = { 'lucid-ui-lang': 'en', 'lucid-game-level': '2', 'lucid-speaking-ipa': '1', 'lucid-mic-notice': '1', 'lucid-he-all': '[]', 'lucid:speech': '{"rate":1}', 'lucid-quiz-round:a1': '3' };
  const out = devicePreferences(prefsStorage({ ...ACCOUNT, ...PREFS }));
  assert.deepEqual(out, PREFS);
  assert.ok(!JSON.stringify(out).includes('x@y.example'), 'the email address is in the backup');
  const to = prefsStorage({});
  restorePreferences({ ...ACCOUNT, ...PREFS }, to);
  assert.deepEqual(Object.fromEntries(to.map), PREFS);
});

// Launch verify (security lens): a backup the browser's database cannot store (a payload nested 20,000 deep) passed
// the checks; the restore cleared the device, the write failed and only a console line said so, and the learner saw
// "Restored" with nothing left.
const deepBackup = (depth = 20000) => `{"app":"lucid","version":1,"device":{"profile":[{"id":"me","onboarded":true,"name":"FromFile"}],"cards":[{"id":"c1","payload":${'['.repeat(depth)}${']'.repeat(depth)}}]}}`;
test('a backup the database cannot store is refused before anything is written', async () => {
  assert.deepEqual(checkBackup(deepBackup()), { ok: false, reason: 'shape' });
  const s = learner();
  const before = JSON.stringify(s.snapshot());
  await assert.rejects(restoreBackup(s, deepBackup()), (e) => e.reason === 'shape');
  assert.equal(JSON.stringify(s.snapshot()), before);
});

// A backend like IndexedDB: put stores a structured clone, and a record it cannot clone fails the whole write.
function cloningBackend() {
  const m = new Map();
  return {
    kind: 'clone', m,
    async load() { return [...m.values()].map((r) => structuredClone(r)); },
    async put(rows) { const c = rows.map((r) => structuredClone(r)); for (const r of c) m.set(`${r.coll}\u0000${r.id}`, r); },
    async del(keys) { for (const [c, i] of keys) m.delete(`${c}\u0000${i}`); },
    async clear() { m.clear(); },
  };
}
test('a restore whose data cannot be saved throws and leaves the device as it was, in memory and on disk', async () => {
  const backend = cloningBackend();
  const s = createStore(backend);
  s.put('profile', { id: 'me', onboarded: true, name: 'Existing' });
  s.put('progress', { id: 'a1-01', status: 'completed' });
  s.put('writing', { id: 'w-old', text: 'my precious essay' });
  await s.flush();
  const disk = JSON.stringify([...backend.m.keys()].sort());
  const mem = JSON.stringify(s.snapshot());
  let deep = []; for (let i = 0; i < 20000; i++) deep = [deep];
  await assert.rejects(s.replaceAll({ profile: [{ id: 'me', onboarded: true, name: 'FromFile' }], cards: [{ id: 'c1', payload: deep }] }));
  assert.equal(JSON.stringify(s.snapshot()), mem, 'the data in memory changed');
  assert.equal(JSON.stringify([...backend.m.keys()].sort()), disk, 'the data on disk changed');
  assert.equal(backend.m.get('writing\u0000w-old').data.text, 'my precious essay');
  // A restore that can be saved replaces everything, on disk too: nothing of the old data stays behind.
  await s.replaceAll({ profile: [{ id: 'me', onboarded: true, name: 'FromFile' }], cards: [{ id: 'c1', due: '2026-11-12' }] });
  assert.deepEqual([...backend.m.keys()].sort(), ['cards\u0000c1', 'profile\u0000me']);
  assert.equal(s.get('profile', 'me').name, 'FromFile');
  assert.equal(s.get('writing', 'w-old'), null);
  const again = createStore(backend); await again.load();
  assert.deepEqual(again.snapshot(), s.snapshot());
});
