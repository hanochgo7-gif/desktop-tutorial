// Local-first learner data. Everything the learner does is saved on the device first
// (IndexedDB, or memory when storage is unavailable) and, when an account is connected,
// synced to the server by sync.js. Records live in collections and carry `updated_at`
// plus a `_dirty` flag until the server has them. The device also remembers which account
// the data belongs to (the owner), so one learner's data never flows into another's account.

export const COLLECTIONS = ['profile', 'settings', 'progress', 'attempts', 'cards', 'writing', 'chats', 'placement', 'events'];
// Collections that are synced (profile is synced through its own table).
export const SYNCED = ['settings', 'progress', 'attempts', 'cards', 'writing', 'chats', 'placement', 'events'];

// ---------- backends ----------
export function memoryBackend() {
  const m = new Map();
  return {
    kind: 'memory',
    async load() { return [...m.values()]; },
    async put(rows) { for (const r of rows) m.set(`${r.coll}\u0000${r.id}`, r); },
    async del(keys) { for (const [c, i] of keys) m.delete(`${c}\u0000${i}`); },
    async clear() { m.clear(); },
  };
}

export function indexedDbBackend(name = 'lucid') {
  let dbp = null;
  const open = () => (dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('records', { keyPath: ['coll', 'id'] });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('records', mode);
      const out = fn(t.objectStore('records'));
      t.oncomplete = () => resolve(out?.result ?? out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };
  return {
    kind: 'indexeddb',
    async load() { return tx('readonly', (s) => s.getAll()); },
    async put(rows) { return tx('readwrite', (s) => { for (const r of rows) s.put(r); }); },
    async del(keys) { return tx('readwrite', (s) => { for (const k of keys) s.delete(k); }); },
    async clear() { return tx('readwrite', (s) => s.clear()); },
    // Close the connection and delete the whole database (used when erasing the device).
    async destroy() {
      try { (await open()).close(); } catch { /* never opened */ }
      dbp = null;
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
    },
  };
}

// Lucid's own keys in localStorage and sessionStorage all start with "lucid-" (or "lucid:").
// The origin is shared with other apps, so erasing never clears storage wholesale.
export const LUCID_KEY = /^lucid[-:]/;
const OWNER_KEY = 'lucid-owner';
const browserStorage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

// ---------- store ----------
export function createStore(backend = memoryBackend(), { now = () => new Date(), storage = browserStorage() } = {}) {
  const data = new Map(COLLECTIONS.map((c) => [c, new Map()]));
  let ownerMem = null; // used when localStorage is unavailable
  const listeners = new Set();
  let pending = [];
  let flushTimer = null;

  const emit = (colls, origin = 'local') => { for (const fn of listeners) { try { fn({ colls, origin }); } catch (e) { console.error(e); } } };
  const coll = (c) => {
    const m = data.get(c);
    if (!m) throw new Error(`Unknown collection ${c}`);
    return m;
  };
  const schedule = () => {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => store.flush(), 120);
  };

  const store = {
    backendKind: backend.kind,
    async load() {
      const rows = await backend.load();
      for (const r of rows) if (data.has(r.coll)) data.get(r.coll).set(r.id, r.data);
      return rows.length;
    },
    // Deleted records (tombstones) are hidden unless asked for; sync needs them.
    get(c, id, { includeDeleted = false } = {}) {
      const r = coll(c).get(id) ?? null;
      return r && r._deleted && !includeDeleted ? null : r;
    },
    all(c, { includeDeleted = false } = {}) {
      const out = [...coll(c).values()];
      return includeDeleted ? out : out.filter((r) => !r._deleted);
    },
    // Upsert a record; returns the stored record. A local write means the record exists, so it
    // also clears an earlier deletion; only remove() writes tombstones locally.
    put(c, record, { origin = 'local', tombstone = false } = {}) {
      if (!record || record.id == null) throw new Error('record.id required');
      const id = String(record.id);
      const rec = { ...record, id, updated_at: record.updated_at && origin === 'remote' ? record.updated_at : now().toISOString() };
      if (origin === 'local') { rec._dirty = true; if (!tombstone) delete rec._deleted; }
      else delete rec._dirty;
      coll(c).set(id, rec);
      pending.push({ coll: c, id, data: rec });
      schedule();
      emit([c], origin);
      return rec;
    },
    update(c, id, patch) {
      const cur = this.get(c, id);
      return this.put(c, { ...(cur || {}), ...(typeof patch === 'function' ? patch(cur) : patch), id });
    },
    // Soft delete so the deletion can sync. The tombstone keeps only the id: the content is gone
    // from the device at once, and sync sends the server an empty document.
    remove(c, id) {
      if (!this.get(c, id)) return;
      this.put(c, { id, _deleted: true }, { tombstone: true });
    },
    // Any learner data on this device (including tombstones still waiting to sync)? `except` skips collections.
    hasData({ except = [] } = {}) {
      for (const c of COLLECTIONS) if (!except.includes(c) && coll(c).size) return true;
      return false;
    },
    // The account id the local data belongs to, or null when it was made without an account.
    owner() {
      try { return storage ? storage.getItem(OWNER_KEY) || null : ownerMem; } catch { return ownerMem; }
    },
    setOwner(id) {
      ownerMem = id || null;
      try { if (!storage) return; if (id) storage.setItem(OWNER_KEY, id); else storage.removeItem(OWNER_KEY); } catch { /* private mode */ }
    },
    dirty() {
      const out = [];
      for (const c of SYNCED) for (const r of coll(c).values()) if (r._dirty) out.push({ coll: c, record: r });
      return out;
    },
    markClean(items) {
      for (const { coll: c, record } of items) {
        const cur = coll(c).get(record.id);
        // Only clear the flag if the record was not changed again after it was sent.
        if (cur && cur.updated_at === record.updated_at) {
          const clean = { ...cur }; delete clean._dirty;
          coll(c).set(record.id, clean);
          pending.push({ coll: c, id: record.id, data: clean });
        }
      }
      schedule();
    },
    on(type, fn) { if (type === 'change') listeners.add(fn); return () => listeners.delete(fn); },
    async flush() {
      clearTimeout(flushTimer);
      const batch = pending; pending = [];
      if (!batch.length) return;
      // Last write per key wins inside one flush.
      const last = new Map(batch.map((r) => [`${r.coll}\u0000${r.id}`, r]));
      try { await backend.put([...last.values()]); } catch (e) { console.error('save failed', e); pending = batch.concat(pending); }
    },
    snapshot() {
      const out = {};
      for (const c of COLLECTIONS) out[c] = this.all(c);
      return out;
    },
    async replaceAll(snapshot, { origin = 'import' } = {}) {
      for (const c of COLLECTIONS) coll(c).clear();
      await backend.clear();
      for (const c of COLLECTIONS) for (const r of snapshot[c] || []) {
        if (r && r.id != null) { coll(c).set(String(r.id), { ...r, _dirty: true }); pending.push({ coll: c, id: String(r.id), data: { ...r, _dirty: true } }); }
      }
      await this.flush();
      emit(COLLECTIONS, origin);
    },
    async wipe() {
      for (const c of COLLECTIONS) coll(c).clear();
      pending = [];
      await backend.clear();
      this.setOwner(null);
      emit(COLLECTIONS, 'wipe');
    },
    // Wipe, then delete the database itself. Later writes in this page stay in memory only.
    async destroy() {
      await this.wipe();
      await backend.destroy?.();
      backend = memoryBackend();
    },
  };
  return store;
}

// "Delete all data from this device": the store and its database, Lucid's keys in localStorage and
// sessionStorage, and Lucid's service-worker caches. Nothing else on the shared origin is touched.
export async function eraseDevice({ storages = [browserStorage(), (() => { try { return globalThis.sessionStorage; } catch { return null; } })()], cacheStorage = globalThis.caches } = {}) {
  if (store) await store.destroy();
  for (const s of storages) {
    if (!s) continue;
    try {
      const keys = [];
      for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && LUCID_KEY.test(k)) keys.push(k); }
      keys.forEach((k) => s.removeItem(k));
    } catch { /* storage unavailable */ }
  }
  try {
    const names = cacheStorage ? await cacheStorage.keys() : [];
    await Promise.all(names.filter((n) => n.startsWith('lucid-')).map((n) => cacheStorage.delete(n)));
  } catch { /* caches unavailable */ }
}

// The app's singleton, created by app.js once it knows which backend works.
export let store = null;
export async function openStore() {
  let backend = memoryBackend();
  try {
    if (typeof indexedDB !== 'undefined') {
      const idb = indexedDbBackend();
      await idb.load();
      backend = idb;
    }
  } catch (e) {
    console.warn('IndexedDB unavailable; progress is kept for this session only.', e);
  }
  store = createStore(backend);
  await store.load();
  addEventListener('pagehide', () => store.flush());
  return store;
}
