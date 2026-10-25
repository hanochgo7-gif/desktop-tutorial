// Backups for browser-only mode: a daily snapshot kept in IndexedDB (last 7), plus downloadable files.
// Snapshots protect against mistakes; only a downloaded file protects against the browser's data being cleared.

const DB = 'hgos-backups';
const KEEP = 7;
const LAST_DOWNLOAD = 'hgos-last-download';

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx(db, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction('snaps', mode);
    const out = fn(t.objectStore('snaps'));
    t.oncomplete = () => res(out?.result);
    t.onerror = () => rej(t.error);
  });
}

export function backupPayload(store) {
  return { app: 'hg-os', version: 1, exportedAt: new Date().toISOString(), rows: store.rows };
}
const counts = (rows) => ({ contacts: rows.crm_contacts?.length || 0, deals: rows.crm_deals?.length || 0, tasks: rows.crm_tasks?.length || 0 });

export async function snapshotDaily(store) {
  try {
    const db = await open();
    const all = await listSnapshots();
    const today = new Date().toISOString().slice(0, 10);
    if (all.some((s) => s.id.startsWith(today))) return;
    const payload = backupPayload(store);
    await tx(db, 'readwrite', (os) => os.put({ id: `${today}-${Date.now()}`, at: payload.exportedAt, counts: counts(payload.rows), json: JSON.stringify(payload) }));
    for (const old of all.slice(KEEP - 1)) await tx(db, 'readwrite', (os) => os.delete(old.id));
  } catch (e) { console.warn('[backup] snapshot failed', e); }
}
export async function listSnapshots() {
  try {
    const db = await open();
    const all = await tx(db, 'readonly', (os) => os.getAll());
    return (all || []).map(({ json, ...m }) => ({ ...m, size: json.length })).sort((a, b) => (a.at < b.at ? 1 : -1));
  } catch { return []; }
}
export async function getSnapshot(id) {
  const db = await open();
  const s = await tx(db, 'readonly', (os) => os.get(id));
  return s ? JSON.parse(s.json) : null;
}

// Validate a backup before it replaces anything.
export function validateBackup(obj) {
  if (!obj || obj.app !== 'hg-os' || typeof obj.rows !== 'object') throw new Error('הקובץ הזה אינו גיבוי של HG OS');
  for (const t of ['crm_contacts', 'crm_deals', 'crm_stages', 'crm_sources']) {
    if (!Array.isArray(obj.rows[t])) throw new Error(`הגיבוי פגום: חסרה הטבלה ${t}`);
  }
  if (!obj.rows.crm_stages.length) throw new Error('הגיבוי פגום: אין בו שלבי מכירה');
  for (const c of obj.rows.crm_contacts) if (!c.id) throw new Error('הגיבוי פגום: יש איש קשר בלי מזהה');
  return counts(obj.rows);
}

export const markDownloaded = () => { try { localStorage.setItem(LAST_DOWNLOAD, new Date().toISOString()); } catch { /* ignore */ } };
export const lastDownloaded = () => { try { return localStorage.getItem(LAST_DOWNLOAD); } catch { return null; } };
export function backupOverdue(store, days = 7) {
  if (!store.all('crm_contacts').length) return false;
  const last = lastDownloaded();
  return !last || Date.now() - new Date(last).getTime() > days * 864e5;
}
