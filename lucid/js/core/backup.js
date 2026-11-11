// Backups (Settings "Download all my data", "Restore a backup", the restore screen #/import and the move from the
// old address, js/core/move.js). One format: {app: 'lucid', version: 1, exported_at, device: <store snapshot>,
// preferences, server}. A backup is checked before anything is written, and the learner sees what it holds first.
import { COLLECTIONS } from './store.js';
import { tt, uiLang } from './i18n.js';

export const BACKUP_VERSION = 1;
// A backup is the learner's own text and answers: far below this. Bigger is not a Lucid backup (or not one this
// device should hold in memory twice).
export const MAX_BACKUP_BYTES = 40 * 1024 * 1024;

// The preferences Lucid keeps in localStorage beside the database (TS-08): the backup holds them too, so the file
// has everything Lucid stores on this device. Left out: the sign-in session (its tokens) and the owner mark (which
// account the data belongs to), which only make sense on this device.
const PREF_KEY = /^lucid[-:]/;
const NOT_EXPORTED = new Set(['lucid-session', 'lucid-owner']);
const localStore = () => { try { return globalThis.localStorage; } catch { return null; } };
export function devicePreferences(storage = localStore()) {
  const out = {};
  try {
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && PREF_KEY.test(k) && !NOT_EXPORTED.has(k)) out[k] = storage.getItem(k); }
  } catch { /* storage blocked */ }
  return out;
}
export function restorePreferences(prefs, storage = localStore()) {
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return;
  try {
    for (const [k, v] of Object.entries(prefs)) if (PREF_KEY.test(k) && !NOT_EXPORTED.has(k) && typeof v === 'string' && v.length <= 10_000) storage.setItem(k, v);
  } catch { /* storage blocked or full */ }
}

export function makeBackup(store, { server = null, now = new Date(), preferences = devicePreferences() } = {}) {
  return { app: 'lucid', version: BACKUP_VERSION, exported_at: now.toISOString(), device: store.snapshot(), preferences, server };
}
export const backupFileName = (now = new Date()) => `lucid-data-${now.toISOString().slice(0, 10)}.json`;

const isRecord = (r) => r && typeof r === 'object' && !Array.isArray(r) && (typeof r.id === 'string' || typeof r.id === 'number');
const live = (rows) => rows.filter((r) => !r._deleted);

// What a backup holds, for the learner to see before it replaces this device's data.
function summarise(device, exportedAt) {
  const rows = (c) => live(device[c] || []);
  const me = rows('profile').find((r) => String(r.id) === 'me') || null;
  return {
    name: typeof me?.name === 'string' ? me.name.slice(0, 60) : '',
    exportedAt: typeof exportedAt === 'string' && !Number.isNaN(Date.parse(exportedAt)) ? exportedAt : '',
    lessons: rows('progress').filter((p) => p.status === 'completed').length,
    words: rows('cards').length,
    writing: rows('writing').length,
    chats: rows('chats').length,
  };
}

// {ok: true, device, summary} for a usable backup, or {ok: false, reason} with reason one of 'size', 'json', 'app',
// 'version', 'shape', 'profile'. Accepts the parsed object or the file's text.
export function checkBackup(input) {
  let data = input;
  if (typeof input === 'string') {
    if (input.length > MAX_BACKUP_BYTES) return { ok: false, reason: 'size' };
    try { data = JSON.parse(input); } catch { return { ok: false, reason: 'json' }; }
  }
  if (!data || typeof data !== 'object' || data.app !== 'lucid') return { ok: false, reason: 'app' };
  if (data.version !== undefined && (typeof data.version !== 'number' || data.version > BACKUP_VERSION)) return { ok: false, reason: 'version' };
  const d = data.device;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false, reason: 'shape' };
  const device = {};
  for (const c of COLLECTIONS) {
    if (d[c] === undefined) { device[c] = []; continue; }
    if (!Array.isArray(d[c]) || !d[c].every(isRecord)) return { ok: false, reason: 'shape' };
    device[c] = d[c];
  }
  // A backup without a finished profile would leave the learner at the welcome screen with nothing restored.
  const me = live(device.profile).find((r) => String(r.id) === 'me');
  if (!me || !me.onboarded) return { ok: false, reason: 'profile' };
  return { ok: true, device, preferences: data.preferences, summary: summarise(device, data.exported_at) };
}

// The summary as short lines in the interface language (the restore screen lists them; Settings' confirmation joins
// them). Numbers stay digits; the name is the learner's own text and is escaped by whoever renders it.
export function describeBackup(s) {
  const he = uiLang() === 'he';
  const date = s.exportedAt ? new Date(s.exportedAt).toLocaleDateString(he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return [
    s.name ? tt(`הפרופיל: ${s.name}`, `Profile: ${s.name}`) : '',
    date ? tt(`הגיבוי נוצר ב-${date}`, `Backup made on ${date}`) : '',
    tt(`שיעורים שהושלמו: ${s.lessons}`, `Lessons completed: ${s.lessons}`),
    tt(`מילים בחזרה: ${s.words}`, `Words in review: ${s.words}`),
    tt(`טקסטים במעבדת הכתיבה: ${s.writing}`, `Texts in the Writing lab: ${s.writing}`),
  ].filter(Boolean);
}

// The error under the file chooser for a reason from checkBackup.
export function backupProblem(reason) {
  if (reason === 'profile') return tt('בגיבוי הזה אין פרופיל שהושלם, ולכן אין מה לשחזר ממנו.', 'This backup holds no finished profile, so there is nothing to restore from it.');
  if (reason === 'version') return tt('הגיבוי הזה נוצר בגרסה חדשה יותר של Lucid. טענו מחדש את Lucid ונסו שוב.', 'This backup comes from a newer version of Lucid. Reload Lucid and try again.');
  return tt('הקובץ הזה לא גיבוי תקין של Lucid. בחרו את קובץ ה-JSON שהורדתם ב״הורדת כל המידע״.', 'This file is not a valid Lucid backup. Choose the JSON file you downloaded with "Download all my data".');
}

// Replaces this device's data with the backup's (checked again) and brings its preferences back. Returns the summary.
export async function restoreBackup(store, input, { storage = localStore() } = {}) {
  const r = checkBackup(input);
  if (!r.ok) throw Object.assign(new Error(`not a usable Lucid backup (${r.reason})`), { reason: r.reason });
  await store.replaceAll(r.device);
  restorePreferences(r.preferences, storage);
  return r.summary;
}
