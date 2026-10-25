// Data store. The server (Supabase) is the source of truth; the store keeps an in-memory copy for a fast UI.
// Writes are applied optimistically, sent to the server, and replaced by the server's row (which ran the
// validation and business rules). Network failures go to a persisted outbox and are retried; validation
// errors roll the change back and are shown to the user. Nothing is dropped silently.
//
// "local" mode (trial / automated tests) keeps everything in localStorage and runs the same rules in JS.

import { db, ApiError } from './api.js';
import { beforeSave, afterSaveLocal } from './rules.js';

export const TABLES = [
  'crm_pipelines', 'crm_stages', 'crm_sources', 'crm_contacts', 'crm_deals', 'crm_tasks',
  'crm_activities', 'crm_ad_spend', 'crm_touchpoints', 'crm_deal_stage_history',
];
const LOCAL_KEY = 'hgos-local-data';
const OUTBOX_KEY = 'hgos-outbox';

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
}));

class Store {
  constructor() {
    this.rows = {};
    this.idx = {};
    for (const t of TABLES) { this.rows[t] = []; this.idx[t] = new Map(); }
    this.listeners = new Map();
    this.mode = null;
    this.workspace = null;
    this.members = [];
    this.userId = null;
    this.cursor = 0;
    this.status = 'idle';
    this.outbox = [];
    this.flushing = false;
  }

  on(evt, fn) { if (!this.listeners.has(evt)) this.listeners.set(evt, new Set()); this.listeners.get(evt).add(fn); return () => this.listeners.get(evt)?.delete(fn); }
  emit(evt, p) { for (const fn of this.listeners.get(evt) || []) { try { fn(p); } catch (e) { console.error(e); } } }
  setStatus(s) { if (this.status !== s) { this.status = s; this.emit('status', s); } }

  // ---------- loading ----------
  async initRemote({ workspaceId, userId }) {
    this.mode = 'remote';
    this.userId = userId;
    const [ws] = await db.select('crm_workspaces', `select=id,name,settings&id=eq.${workspaceId}`);
    this.workspace = ws;
    this.members = await db.select('crm_members', `select=user_id,role,display_name&workspace_id=eq.${workspaceId}`);
    await Promise.all(TABLES.map(async (t) => {
      const rows = await db.selectAll(t, 'deleted_at=is.null');
      for (const r of rows) this._put(t, r);
    }));
    try { this.outbox = JSON.parse(localStorage.getItem(`${OUTBOX_KEY}:${workspaceId}`) || '[]'); } catch { this.outbox = []; }
    // re-apply writes that never reached the server so the screen shows them
    for (const op of this.outbox) this._applyLocal(op.table, op.id, op.data, op.op);
    this.setStatus(this.outbox.length ? 'pending' : 'saved');
    this.flush();
    this.timer = setInterval(() => this.refresh(), 60000);
    addEventListener('online', () => { this.flush(); this.refresh(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.refresh(); });
  }

  initLocal() {
    this.mode = 'local';
    this.userId = 'local-user';
    this.workspace = { id: 'local', name: 'מצב ניסיון', settings: {} };
    this.members = [{ user_id: 'local-user', role: 'owner', display_name: 'אני' }];
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { saved = null; }
    if (saved?.rows) for (const t of TABLES) for (const r of saved.rows[t] || []) this._put(t, r);
    this.cursor = saved?.cursor || 0;
    this.setStatus('saved');
    return !saved;
  }
  _persistLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ rows: this.rows, cursor: this.cursor }));
      this.setStatus('saved');
    } catch (e) { this.setStatus('error'); this.emit('error', e); }
  }
  resetLocal() { localStorage.removeItem(LOCAL_KEY); }

  // Pull rows changed on the server since our cursor (other device, server-side triggers).
  async refresh() {
    if (this.mode !== 'remote' || this.refreshing) return;
    this.refreshing = true;
    try {
      const changed = new Set();
      await Promise.all(TABLES.map(async (t) => {
        const rows = await db.select(t, `select=*&seq=gt.${this.cursor}&order=seq.asc&limit=1000`);
        for (const r of rows) {
          if (this.outbox.some((op) => op.table === t && op.id === r.id)) continue; // our unsent edit wins locally until sent
          if (r.deleted_at) this._drop(t, r.id); else this._put(t, r);
          changed.add(t);
        }
      }));
      if (changed.size) this.emit('change', { tables: [...changed], source: 'remote' });
      if (this.status === 'offline' && !this.outbox.length) this.setStatus('saved');
    } catch (e) {
      if (e.network) this.setStatus('offline');
    } finally { this.refreshing = false; }
  }

  _put(t, r) {
    const cur = this.idx[t].get(r.id);
    if (cur) Object.keys(cur).forEach((k) => { if (!(k in r)) delete cur[k]; }), Object.assign(cur, r);
    else { this.rows[t].push(r); this.idx[t].set(r.id, r); }
    if (r.seq && r.seq > this.cursor) this.cursor = r.seq;
  }
  _drop(t, id) {
    const r = this.idx[t].get(id);
    if (!r) return;
    this.idx[t].delete(id);
    this.rows[t].splice(this.rows[t].indexOf(r), 1);
  }

  // ---------- reads ----------
  all(t) { return this.rows[t] || []; }
  get(t, id) { return id ? this.idx[t]?.get(id) : undefined; }
  filter(t, fn) { return this.all(t).filter(fn); }
  find(t, fn) { return this.all(t).find(fn); }

  // ---------- writes ----------
  async insert(t, data) {
    const now = new Date().toISOString();
    const row = beforeSave(t, { id: uuid(), workspace_id: this.workspace.id, created_at: now, updated_at: now, created_by: this.userId, ...data }, null, this);
    this._put(t, row);
    this.emit('change', { tables: [t], op: 'insert', row, source: 'user' });
    return this._send({ op: 'insert', table: t, id: row.id, data: row }, null);
  }
  async update(t, id, patch) {
    const cur = this.get(t, id);
    if (!cur) throw new ApiError('הרשומה לא נמצאה');
    const prev = structuredClone(cur);
    const next = beforeSave(t, { ...cur, ...patch }, prev, this);
    const diff = {};
    for (const k of Object.keys(next)) if (JSON.stringify(next[k]) !== JSON.stringify(prev[k])) diff[k] = next[k];
    if (!Object.keys(diff).length) return cur;
    Object.assign(cur, next);
    if (cur.deleted_at) this._drop(t, id);
    this.emit('change', { tables: [t], op: 'update', row: cur, prev, source: 'user' });
    return this._send({ op: 'update', table: t, id, data: stripServerCols(diff) }, prev);
  }
  remove(t, id) { return this.update(t, id, { deleted_at: new Date().toISOString() }); }
  // Undo a delete: `row` is the copy taken before remove().
  async restore(t, row) {
    const back = { ...row, deleted_at: null };
    this._put(t, back);
    this.emit('change', { tables: [t], op: 'restore', row: back, source: 'user' });
    return this._send({ op: 'update', table: t, id: row.id, data: { deleted_at: null } }, { ...row, deleted_at: new Date().toISOString() });
  }

  _applyLocal(t, id, data, op) {
    if (op === 'insert') this._put(t, { ...data });
    else { const cur = this.get(t, id); if (cur) Object.assign(cur, data); }
    const cur = this.get(t, id);
    if (cur?.deleted_at) this._drop(t, id);
  }

  async _send(op, prev) {
    if (this.mode === 'local') {
      const row = this.get(op.table, op.id) || { ...(prev || {}), ...op.data };
      row.version = (row.version || 0) + 1;
      row.seq = ++this.cursor;
      if (row.deleted_at) this._drop(op.table, op.id);
      afterSaveLocal(op.table, row, prev, this);
      this._persistLocal();
      this.emit('change', { tables: TABLES, source: 'rules' });
      return row;
    }
    // an update to a row whose insert is still queued is merged into that insert
    const queued = this.outbox.find((o) => o.table === op.table && o.id === op.id && o.op === 'insert');
    if (queued) { Object.assign(queued.data, op.data); this._saveOutbox(); return this.get(op.table, op.id); }
    if (this.outbox.length) { this.outbox.push(op); this._saveOutbox(); this.flush(); return this.get(op.table, op.id); }
    this.setStatus('saving');
    try {
      const row = await this._exec(op);
      this._afterServer(op, row);
      this.setStatus(this.outbox.length ? 'pending' : 'saved');
      return row;
    } catch (e) {
      if (e.network) {
        this.outbox.push(op);
        this._saveOutbox();
        this.setStatus('offline');
        return this.get(op.table, op.id);
      }
      this._rollback(op, prev);
      this.setStatus(this.outbox.length ? 'pending' : 'saved');
      throw humanize(e);
    }
  }
  async _exec(op) {
    if (op.op === 'insert') return db.insert(op.table, stripServerCols(op.data, true));
    return db.update(op.table, op.id, op.data);
  }
  _afterServer(op, row) {
    if (row.deleted_at) this._drop(op.table, row.id); else this._put(op.table, row);
    this.emit('change', { tables: [op.table], op: 'server', row, source: 'server' });
    // server triggers may have changed related rows (stage history, contact lifecycle...)
    clearTimeout(this.refreshSoon);
    this.refreshSoon = setTimeout(() => this.refresh(), 400);
  }
  _rollback(op, prev) {
    if (op.op === 'insert') this._drop(op.table, op.id);
    else if (prev) { if (!this.get(op.table, op.id)) this._put(op.table, prev); else { const cur = this.get(op.table, op.id); Object.keys(cur).forEach((k) => delete cur[k]); Object.assign(cur, prev); } }
    this.emit('change', { tables: [op.table], op: 'rollback', source: 'user' });
  }
  _saveOutbox() {
    try { localStorage.setItem(`${OUTBOX_KEY}:${this.workspace.id}`, JSON.stringify(this.outbox)); } catch { /* storage full: still in memory */ }
  }
  async flush() {
    if (this.mode !== 'remote' || this.flushing || !this.outbox.length) return;
    this.flushing = true;
    this.setStatus('saving');
    try {
      while (this.outbox.length) {
        const op = this.outbox[0];
        try {
          const row = await this._exec(op);
          this.outbox.shift();
          this._saveOutbox();
          this._afterServer(op, row);
        } catch (e) {
          if (e.network) { this.setStatus('offline'); setTimeout(() => this.flush(), 15000); return; }
          // the server rejected a queued change: drop it, tell the user, reload the true state
          this.outbox.shift();
          this._saveOutbox();
          this.emit('error', humanize(e));
          await this.refresh();
        }
      }
      this.setStatus('saved');
    } finally { this.flushing = false; }
  }

  // ---------- helpers ----------
  memberName(userId) {
    const m = this.members.find((x) => x.user_id === userId);
    return m?.display_name || (userId ? 'משתמש' : '');
  }
  exportAll() {
    return { app: 'hg-os', exportedAt: new Date().toISOString(), workspace: this.workspace?.name, rows: this.rows };
  }
}

// Columns the server owns; never sent from the client.
function stripServerCols(d, keepId = false) {
  const out = { ...d };
  for (const k of ['seq', 'version', 'updated_at', 'created_by', 'phone_norm', 'outcome', 'stage_entered_at']) delete out[k];
  if (!keepId) delete out.id;
  if (!keepId) delete out.workspace_id;
  if (!keepId) delete out.created_at;
  return out;
}

// Turn database errors into messages a person can act on.
const CONSTRAINTS = {
  crm_contacts_email_uq: 'כבר קיים ליד עם האימייל הזה. חפשו אותו במקום ליצור כפילות.',
  first_source_locked: 'מקור ההגעה המקורי נעול. אפשר לשנות רק את המקור האחרון.',
  crm_contacts_check: 'צריך למלא לפחות שם, טלפון או אימייל.',
  crm_contacts_check1: 'כשמסמנים "לא רלוונטי" צריך לבחור סיבה.',
  crm_contacts_email_check: 'כתובת האימייל לא תקינה.',
  stage_not_found: 'השלב לא נמצא. רעננו את העמוד.',
  crm_ad_spend_day_uq: 'כבר הוזנה הוצאה למקור ולתקופה האלה. ערכו את השורה הקיימת.',
  crm_sources_key_uq: 'כבר קיים מקור בשם הזה.',
};
export function humanize(e) {
  if (!(e instanceof ApiError)) return e;
  const hay = `${e.message} ${e.details}`;
  for (const [k, msg] of Object.entries(CONSTRAINTS)) if (hay.includes(k)) return new ApiError(msg, e);
  if (e.status === 401 || e.status === 403 || e.code === '42501') return new ApiError('אין הרשאה לפעולה הזו. התחברו מחדש.', e);
  if (e.code === '23514') return new ApiError(`ערך לא תקין: ${e.message}`, e);
  return e;
}

export const store = new Store();
if (typeof window !== 'undefined') window.__store = store;
