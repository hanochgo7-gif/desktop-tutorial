// Data store: in-memory collections, persisted per record to IndexedDB (localStorage fallback),
// change events, property history, recycle bin, associations, backups and cross-tab sync.

import { uid, clone, debounce } from './util.js';

export const COLLECTIONS = [
  'contacts', 'companies', 'deals', 'tickets',
  'activities', 'tasks', 'associations', 'history',
  'products', 'quotes', 'templates', 'snippets', 'sequences', 'enrollments',
  'workflows', 'workflowLogs', 'forms', 'submissions',
  'reports', 'dashboards', 'views', 'lists',
  'users', 'notifications', 'scheduled', 'trash',
];
// Collections whose field changes are recorded in `history` and whose deletes go to the recycle bin.
const TRACKED = new Set(['contacts', 'companies', 'deals', 'tickets']);
const TRASHABLE = new Set(['contacts', 'companies', 'deals', 'tickets', 'products', 'quotes', 'templates', 'sequences', 'workflows', 'forms', 'reports', 'tasks', 'lists']);
const COLL_TYPE = { contacts: 'contact', companies: 'company', deals: 'deal', tickets: 'ticket' };
const HISTORY_CAP = 25000;
const SCHEMA_VERSION = 1;
const DB_NAME = 'kesher-crm';
const LS_KEY = 'kesher-crm-fallback';

export const DEFAULT_SETTINGS = () => ({
  schemaVersion: SCHEMA_VERSION,
  currentUserId: null,
  theme: 'system',
  currency: 'ILS',
  vatRate: 18,
  company: { name: 'העסק שלי', taxId: '', address: '', phone: '', email: '', website: '', logo: '' },
  options: {},
  pipelines: null,
  customProps: {},
  propLabels: {},
  hiddenProps: {},
  scoring: { enabled: true, rules: [] },
  rottingDays: 14,
  quote: { prefix: 'Q-', nextNumber: 1001, validDays: 30, terms: 'ההצעה בתוקף ל-30 יום. המחירים אינם כוללים מע"מ אלא אם צוין אחרת.' },
  onboarded: false,
  lastBackupAt: null,
});

class Store {
  constructor() {
    this.data = {};
    this.idx = {};
    for (const c of COLLECTIONS) { this.data[c] = []; this.idx[c] = new Map(); }
    this.settings = DEFAULT_SETTINGS();
    this.listeners = new Map();
    this.pending = new Map(); // key "coll\u0000id" -> record | null (delete)
    this.backend = 'memory';
    this.status = 'saved';
    this.flushSoon = debounce(() => this.flush(), 150);
    this.assocIndex = new Map(); // "type:id" -> Set of association ids
  }

  // ---------- events ----------
  on(evt, fn) {
    if (!this.listeners.has(evt)) this.listeners.set(evt, new Set());
    this.listeners.get(evt).add(fn);
    return () => this.listeners.get(evt)?.delete(fn);
  }
  emit(evt, payload) {
    for (const fn of this.listeners.get(evt) || []) {
      try { fn(payload); } catch (e) { console.error(`[store] listener for ${evt} failed`, e); }
    }
  }

  // ---------- lifecycle ----------
  async init() {
    try {
      this.db = await openDB();
      this.backend = 'indexeddb';
      const rows = await idbAll(this.db, 'records');
      for (const row of rows) this._loadRow(row);
    } catch (e) {
      console.warn('[store] IndexedDB unavailable, falling back to localStorage', e);
      try {
        const json = localStorage.getItem(LS_KEY);
        this.backend = 'localstorage';
        if (json) {
          const obj = JSON.parse(json);
          if (obj.settings) this.settings = { ...DEFAULT_SETTINGS(), ...obj.settings };
          for (const c of COLLECTIONS) for (const r of obj.data?.[c] || []) this._put(c, r);
        }
      } catch (e2) {
        this.backend = 'memory';
        console.warn('[store] no persistent storage available', e2);
      }
    }
    this._rebuildAssocIndex();
    this._migrate();
    try {
      this.channel = new BroadcastChannel(DB_NAME);
      this.channel.onmessage = (e) => this._onRemote(e.data);
    } catch { /* old browsers: no cross-tab sync */ }
    const flushNow = () => { if (this.pending.size) this.flush(); };
    addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNow(); });
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    const fresh = !this.settings.onboarded && !this.data.contacts.length;
    return { fresh };
  }

  _loadRow(row) {
    if (row.c === '_meta') {
      if (row.id === 'settings') this.settings = { ...DEFAULT_SETTINGS(), ...row.d };
      return;
    }
    if (this.data[row.c]) this._put(row.c, row.d);
  }
  _put(coll, r) {
    const ix = this.idx[coll];
    if (ix.has(r.id)) {
      const i = this.data[coll].indexOf(ix.get(r.id));
      if (i >= 0) this.data[coll][i] = r; else this.data[coll].push(r);
    } else this.data[coll].push(r);
    ix.set(r.id, r);
  }
  _drop(coll, id) {
    const r = this.idx[coll].get(id);
    if (!r) return;
    this.idx[coll].delete(id);
    const i = this.data[coll].indexOf(r);
    if (i >= 0) this.data[coll].splice(i, 1);
  }
  _migrate() {
    // Future schema migrations run here, keyed by settings.schemaVersion.
    if ((this.settings.schemaVersion || 0) < SCHEMA_VERSION) {
      this.settings.schemaVersion = SCHEMA_VERSION;
      this.saveSettings();
    }
  }

  // ---------- persistence ----------
  _queue(coll, id, rec) {
    this.pending.set(`${coll}\u0000${id}`, rec ? { c: coll, id, d: rec } : null);
    this._setStatus('saving');
    this.flushSoon();
  }
  _setStatus(s) {
    if (this.status !== s) { this.status = s; this.emit('status', s); }
  }
  async flush() {
    if (!this.pending.size) return;
    const batch = [...this.pending.entries()];
    this.pending.clear();
    try {
      if (this.backend === 'indexeddb') {
        await new Promise((res, rej) => {
          const tx = this.db.transaction('records', 'readwrite');
          const os = tx.objectStore('records');
          for (const [key, row] of batch) {
            const [c, id] = key.split('\u0000');
            if (row) os.put(row); else os.delete([c, id]);
          }
          tx.oncomplete = res;
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error || new Error('transaction aborted'));
        });
      } else if (this.backend === 'localstorage') {
        localStorage.setItem(LS_KEY, JSON.stringify({ settings: this.settings, data: this.data }));
      }
      this.channel?.postMessage({ keys: batch.map(([k]) => k) });
      this._setStatus(this.pending.size ? 'saving' : 'saved');
      this.emit('saved');
    } catch (e) {
      console.error('[store] save failed', e);
      // put the batch back so nothing is lost, and retry later
      for (const [k, v] of batch) if (!this.pending.has(k)) this.pending.set(k, v);
      this._setStatus('error');
      this.emit('error', e);
      setTimeout(() => this.flush(), 4000);
    }
  }
  async _onRemote(msg) {
    if (!msg?.keys || this.backend !== 'indexeddb') return;
    const colls = new Set();
    for (const key of msg.keys) {
      const [c, id] = key.split('\u0000');
      const row = await idbGet(this.db, 'records', [c, id]);
      if (c === '_meta') { if (row) this._loadRow(row); colls.add('settings'); continue; }
      if (!this.data[c]) continue;
      if (row) this._put(c, row.d); else this._drop(c, id);
      colls.add(c);
    }
    if (colls.has('associations')) this._rebuildAssocIndex();
    this.emit('remote', { colls: [...colls] });
  }

  // ---------- reads ----------
  all(coll) { return this.data[coll] || []; }
  get(coll, id) { return id == null ? undefined : this.idx[coll]?.get(id); }
  find(coll, pred) { return this.all(coll).find(pred); }
  filter(coll, pred) { return this.all(coll).filter(pred); }
  count(coll) { return this.all(coll).length; }

  // ---------- writes ----------
  // opts: { source: 'user'|'import'|'workflow'|'form'|'sequence'|'system', silent, by }
  insert(coll, data, opts = {}) {
    const now = new Date().toISOString();
    const rec = { ...data };
    rec.id ||= uid(coll.slice(0, 3));
    rec.createdAt ||= now;
    rec.updatedAt = rec.updatedAt || now;
    if (rec.createdBy === undefined) rec.createdBy = opts.by ?? this.settings.currentUserId;
    this._put(coll, rec);
    if (coll === 'associations') this._indexAssoc(rec);
    this._queue(coll, rec.id, rec);
    if (!opts.silent) this.emit('change', { coll, op: 'insert', record: rec, source: opts.source || 'user' });
    return rec;
  }
  insertMany(coll, list, opts = {}) {
    const out = list.map((d) => this.insert(coll, d, { ...opts, silent: true }));
    if (!opts.silent) this.emit('change', { coll, op: 'bulk', records: out, source: opts.source || 'user' });
    return out;
  }
  update(coll, id, patch, opts = {}) {
    const cur = this.get(coll, id);
    if (!cur) return null;
    const prev = clone(cur);
    const changes = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'id') continue;
      const a = cur[k], b = v;
      const same = JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      if (!same) changes[k] = { from: a, to: b };
    }
    if (!Object.keys(changes).length) return cur;
    Object.assign(cur, patch);
    cur.updatedAt = new Date().toISOString();
    this._queue(coll, id, cur);
    if (TRACKED.has(coll) && opts.history !== false) {
      const at = cur.updatedAt;
      const by = opts.by ?? this.settings.currentUserId;
      for (const [key, ch] of Object.entries(changes)) {
        if (['updatedAt', 'lastActivityAt', 'stageChangedAt'].includes(key)) continue;
        this.insert('history', { type: COLL_TYPE[coll], recordId: id, key, from: ch.from ?? null, to: ch.to ?? null, at, by, source: opts.source || 'user' }, { silent: true });
      }
      this._capHistory();
    }
    if (!opts.silent) this.emit('change', { coll, op: 'update', record: cur, prev, changes, source: opts.source || 'user' });
    return cur;
  }
  updateMany(coll, ids, patch, opts = {}) {
    const out = ids.map((id) => this.update(coll, id, typeof patch === 'function' ? patch(this.get(coll, id)) : patch, opts)).filter(Boolean);
    return out;
  }
  // Deletes; trashable collections go to the recycle bin with their associations. Returns trash id (or null).
  remove(coll, id, opts = {}) {
    const rec = this.get(coll, id);
    if (!rec) return null;
    let trashId = null;
    const type = COLL_TYPE[coll];
    const assocs = type ? this.assocsOf(type, id) : [];
    if (TRASHABLE.has(coll) && opts.trash !== false) {
      trashId = this.insert('trash', { coll, record: clone(rec), assocs: assocs.map(clone), deletedAt: new Date().toISOString(), deletedBy: this.settings.currentUserId }, { silent: true }).id;
    }
    for (const a of assocs) this._removeAssoc(a.id);
    this._drop(coll, id);
    this._queue(coll, id, null);
    if (coll === 'associations') this._rebuildAssocIndex();
    if (!opts.silent) this.emit('change', { coll, op: 'remove', record: rec, source: opts.source || 'user', trashId });
    return trashId;
  }
  removeMany(coll, ids, opts = {}) {
    const trashIds = ids.map((id) => this.remove(coll, id, { ...opts, silent: true })).filter(Boolean);
    if (!opts.silent) this.emit('change', { coll, op: 'bulk', records: [], source: opts.source || 'user' });
    return trashIds;
  }
  restore(trashId) {
    const t = this.get('trash', trashId);
    if (!t) return null;
    this._put(t.coll, t.record);
    this._queue(t.coll, t.record.id, t.record);
    for (const a of t.assocs || []) {
      const other = a.a.type === COLL_TYPE[t.coll] && a.a.id === t.record.id ? a.b : a.a;
      if (this.get(collOf(other.type), other.id)) { this._put('associations', a); this._indexAssoc(a); this._queue('associations', a.id, a); }
    }
    this._drop('trash', trashId);
    this._queue('trash', trashId, null);
    this.emit('change', { coll: t.coll, op: 'insert', record: t.record, source: 'restore' });
    return t.record;
  }
  purge(trashId) {
    this._drop('trash', trashId);
    this._queue('trash', trashId, null);
    this.emit('change', { coll: 'trash', op: 'remove', record: { id: trashId } });
  }
  _capHistory() {
    const h = this.data.history;
    if (h.length > HISTORY_CAP) {
      const drop = h.splice(0, h.length - HISTORY_CAP);
      for (const r of drop) { this.idx.history.delete(r.id); this._queue('history', r.id, null); }
    }
  }

  saveSettings(patch = {}) {
    Object.assign(this.settings, patch);
    this.pending.set('_meta\u0000settings', { c: '_meta', id: 'settings', d: this.settings });
    this._setStatus('saving');
    this.flushSoon();
    this.emit('settings', this.settings);
  }

  // ---------- associations ----------
  // Stored as { a: {type,id}, b: {type,id}, label } with a type-ordered pair so lookups are symmetric.
  _indexAssoc(a) {
    for (const end of [a.a, a.b]) {
      const k = `${end.type}:${end.id}`;
      if (!this.assocIndex.has(k)) this.assocIndex.set(k, new Set());
      this.assocIndex.get(k).add(a.id);
    }
  }
  _rebuildAssocIndex() {
    this.assocIndex = new Map();
    for (const a of this.data.associations) this._indexAssoc(a);
  }
  _removeAssoc(id) {
    const a = this.get('associations', id);
    if (!a) return;
    for (const end of [a.a, a.b]) this.assocIndex.get(`${end.type}:${end.id}`)?.delete(id);
    this._drop('associations', id);
    this._queue('associations', id, null);
  }
  assocsOf(type, id) {
    const ids = this.assocIndex.get(`${type}:${id}`);
    return ids ? [...ids].map((x) => this.get('associations', x)).filter(Boolean) : [];
  }
  link(typeA, idA, typeB, idB, opts = {}) {
    if (!idA || !idB || (typeA === typeB && idA === idB)) return null;
    const existing = this.assocsOf(typeA, idA).find((a) => (a.a.type === typeB && a.a.id === idB) || (a.b.type === typeB && a.b.id === idB));
    if (existing) return existing;
    const rec = this.insert('associations', { a: { type: typeA, id: idA }, b: { type: typeB, id: idB }, label: opts.label || '' }, { silent: true });
    if (!opts.silent) this.emit('change', { coll: 'associations', op: 'insert', record: rec, source: opts.source || 'user' });
    return rec;
  }
  unlink(typeA, idA, typeB, idB) {
    for (const a of this.assocsOf(typeA, idA)) {
      if ((a.a.type === typeB && a.a.id === idB) || (a.b.type === typeB && a.b.id === idB)) this._removeAssoc(a.id);
    }
    this.emit('change', { coll: 'associations', op: 'remove', record: { a: { type: typeA, id: idA }, b: { type: typeB, id: idB } } });
  }
  linkedIds(type, id, targetType) {
    const out = [];
    for (const a of this.assocsOf(type, id)) {
      const other = a.a.type === type && a.a.id === id ? a.b : a.a;
      if (!targetType || other.type === targetType) out.push(other.id);
    }
    return out;
  }
  linked(type, id, targetType) {
    return this.linkedIds(type, id, targetType).map((x) => this.get(collOf(targetType), x)).filter(Boolean);
  }

  // Mark activity on records (drives "last activity" and deal rotting).
  touchActivity(targets = [], at = new Date().toISOString()) {
    for (const t of targets) {
      const c = collOf(t.type);
      const r = this.get(c, t.id);
      if (r && (!r.lastActivityAt || r.lastActivityAt < at)) this.update(c, t.id, { lastActivityAt: at }, { history: false, silent: true });
    }
  }

  // ---------- import / export / backups ----------
  exportJSON() {
    return { app: 'kesher-crm', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), settings: this.settings, data: this.data };
  }
  async replaceAll(obj) {
    if (!obj || obj.app !== 'kesher-crm' || !obj.data) throw new Error('הקובץ אינו גיבוי של קשר CRM');
    await this.clearAll({ keepSettings: false });
    this.settings = { ...DEFAULT_SETTINGS(), ...obj.settings };
    for (const c of COLLECTIONS) for (const r of obj.data[c] || []) { this._put(c, r); this._queue(c, r.id, r); }
    this._rebuildAssocIndex();
    this.saveSettings();
    await this.flush();
    this.emit('remote', { colls: [...COLLECTIONS, 'settings'] });
  }
  async clearAll({ keepSettings = true } = {}) {
    this.pending.clear();
    for (const c of COLLECTIONS) { this.data[c] = []; this.idx[c] = new Map(); }
    this.assocIndex = new Map();
    if (!keepSettings) this.settings = DEFAULT_SETTINGS();
    if (this.backend === 'indexeddb') {
      await new Promise((res, rej) => {
        const tx = this.db.transaction('records', 'readwrite');
        tx.objectStore('records').clear();
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    }
    this.saveSettings();
    await this.flush();
    this.channel?.postMessage({ keys: [] });
  }
  async backup(label = 'אוטומטי') {
    const snap = { id: uid('bak'), at: new Date().toISOString(), label, counts: this.counts(), json: JSON.stringify(this.exportJSON()) };
    if (this.backend !== 'indexeddb') return null;
    await idbPut(this.db, 'backups', snap);
    const all = (await idbAll(this.db, 'backups')).sort((a, b) => (a.at < b.at ? 1 : -1));
    for (const old of all.slice(10)) await idbDelete(this.db, 'backups', old.id);
    this.saveSettings({ lastBackupAt: snap.at });
    return snap;
  }
  async listBackups() {
    if (this.backend !== 'indexeddb') return [];
    return (await idbAll(this.db, 'backups')).map(({ json, ...meta }) => ({ ...meta, size: json.length })).sort((a, b) => (a.at < b.at ? 1 : -1));
  }
  async restoreBackup(id) {
    const snap = await idbGet(this.db, 'backups', id);
    if (!snap) throw new Error('הגיבוי לא נמצא');
    await this.backup('לפני שחזור');
    await this.replaceAll(JSON.parse(snap.json));
  }
  async autoBackup() {
    const last = this.settings.lastBackupAt ? new Date(this.settings.lastBackupAt).getTime() : 0;
    if (Date.now() - last > 864e5 && this.data.contacts.length) await this.backup('גיבוי יומי אוטומטי');
  }
  counts() {
    const o = {};
    for (const c of ['contacts', 'companies', 'deals', 'tickets', 'activities', 'tasks']) o[c] = this.data[c].length;
    return o;
  }
  async storageEstimate() {
    try { return await navigator.storage.estimate(); } catch { return null; }
  }
}

export const collOf = (type) => ({ contact: 'contacts', company: 'companies', deal: 'deals', ticket: 'tickets', quote: 'quotes', product: 'products' }[type] || type);
export const typeOf = (coll) => COLL_TYPE[coll];

// ---------- IndexedDB helpers ----------
function openDB() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no indexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: ['c', 'id'] });
      if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups', { keyPath: 'id' });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    req.onblocked = () => rej(new Error('indexedDB blocked'));
  });
}
const idbReq = (db, store, mode, fn) => new Promise((res, rej) => {
  const tx = db.transaction(store, mode);
  const r = fn(tx.objectStore(store));
  tx.oncomplete = () => res(r?.result);
  tx.onerror = () => rej(tx.error);
});
const idbAll = (db, store) => idbReq(db, store, 'readonly', (os) => os.getAll());
const idbGet = (db, store, key) => idbReq(db, store, 'readonly', (os) => os.get(key));
const idbPut = (db, store, val) => idbReq(db, store, 'readwrite', (os) => os.put(val));
const idbDelete = (db, store, key) => idbReq(db, store, 'readwrite', (os) => os.delete(key));

export const store = new Store();
if (typeof window !== 'undefined') window.__store = store; // handy for debugging in the console
