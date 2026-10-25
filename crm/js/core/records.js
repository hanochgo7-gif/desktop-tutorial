// Domain operations on top of the store: create/update CRM records with business rules,
// activities, tasks, notifications and duplicate detection. Views should call these, not store.insert directly.

import { store, collOf } from './store.js';
import { OBJECTS, getProps, stageById, displayName, defaultsFor, isClosedStage } from './schema.js';
import { normalize, normalizePhone, isEmail } from './util.js';

export class ValidationError extends Error {
  constructor(errors) { super(Object.values(errors)[0]); this.errors = errors; }
}

export function validate(type, data, { id } = {}) {
  const errors = {};
  for (const p of getProps(type)) {
    const v = data[p.key];
    if (p.required && (v == null || v === '')) errors[p.key] = `חובה למלא ${p.label}`;
    if (p.type === 'email' && v && !isEmail(v)) errors[p.key] = 'כתובת אימייל לא תקינה';
    if (p.unique && v) {
      const dup = findDuplicates(type, { [p.key]: v }).find((r) => r.id !== id);
      if (dup) errors[p.key] = `כבר קיים ${OBJECTS[type].singular} עם ${p.label} זה: ${displayName(type, dup)}`;
    }
  }
  return errors;
}

// Business rules applied on every create/update of a deal or ticket.
function applyRules(type, next, prev) {
  if ((type === 'deal' || type === 'ticket') && next.stageId && next.stageId !== prev?.stageId) {
    next.stageChangedAt = new Date().toISOString();
    const st = stageById(type, next.stageId);
    if (st && !next.pipelineId) next.pipelineId = st.pipelineId;
    if (st && st.pipelineId !== next.pipelineId) next.pipelineId = st.pipelineId;
    if (isClosedStage(type, next.stageId)) next.closedAt ||= new Date().toISOString();
    else next.closedAt = null;
  }
  if (type === 'contact' && next.email) next.email = String(next.email).trim().toLowerCase();
  if (type === 'company' && next.domain) next.domain = String(next.domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return next;
}

// create('deal', {...}, { associate: [{type:'contact', id}], source })
export function createRecord(type, data, { associate = [], source = 'user', skipValidation = false } = {}) {
  const base = { ...defaultsFor(type), ...data };
  if (!skipValidation) {
    const errors = validate(type, base);
    if (Object.keys(errors).length) throw new ValidationError(errors);
  }
  applyRules(type, base, null);
  if ((type === 'contact' || type === 'company') && !base.source) base.source = source === 'user' ? 'other' : source;
  const rec = store.insert(collOf(type), base, { source });
  for (const a of associate) if (a?.id) store.link(type, rec.id, a.type, a.id, { silent: true });
  // A new contact with a company email domain is auto-linked to that company (like HubSpot).
  if (type === 'contact' && rec.email && !associate.some((a) => a.type === 'company')) {
    const domain = rec.email.split('@')[1];
    const free = ['gmail.com', 'walla.co.il', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'walla.com', 'bezeqint.net', 'live.com'];
    if (domain && !free.includes(domain)) {
      const co = store.find('companies', (c) => c.domain === domain);
      if (co) store.link('contact', rec.id, 'company', co.id, { silent: true });
    }
  }
  if (associate.length) store.emit('change', { coll: 'associations', op: 'bulk', records: [], source });
  return rec;
}

export function updateRecord(type, id, patch, { source = 'user', skipValidation = false } = {}) {
  const prev = store.get(collOf(type), id);
  if (!prev) return null;
  const next = { ...patch };
  if (!skipValidation) {
    const merged = { ...prev, ...patch };
    const errors = validate(type, merged, { id });
    // only report errors for fields being changed
    for (const k of Object.keys(errors)) if (!(k in patch)) delete errors[k];
    if (Object.keys(errors).length) throw new ValidationError(errors);
  }
  if ('stageId' in next && next.stageId !== prev.stageId) {
    applyRules(type, Object.assign(next, { pipelineId: next.pipelineId || prev.pipelineId }), prev);
    if (next.pipelineId === prev.pipelineId) delete next.pipelineId;
  } else applyRules(type, next, prev);
  return store.update(collOf(type), id, next, { source });
}

export function deleteRecords(type, ids, { source = 'user' } = {}) {
  return store.removeMany(collOf(type), ids, { source });
}

// ---------- duplicates ----------
export function findDuplicates(type, data) {
  const coll = collOf(type);
  if (type === 'contact') {
    const email = data.email && normalize(data.email);
    const phone = data.phone && normalizePhone(data.phone);
    return store.filter(coll, (r) => (email && normalize(r.email) === email) || (phone && phone.length >= 9 && normalizePhone(r.phone) === phone));
  }
  if (type === 'company') {
    const d = data.domain && normalize(String(data.domain).replace(/^https?:\/\/(www\.)?/, ''));
    const n = data.name && normalize(data.name);
    return store.filter(coll, (r) => (d && normalize(r.domain) === d) || (n && !data.domain && normalize(r.name) === n));
  }
  return [];
}

// ---------- activities ----------
// logActivity({ type: 'note'|'email'|'call'|'meeting'|'whatsapp'|'sms', subject, body, at, targets: [{type,id}], ...extra })
export function logActivity(act, { source = 'user' } = {}) {
  const at = act.at || new Date().toISOString();
  const rec = store.insert('activities', { ownerId: store.settings.currentUserId, ...act, at }, { source });
  // An activity on a contact also shows on its companies and open deals, like HubSpot's associated timeline.
  const targets = expandTargets(act.targets || []);
  if (targets.length !== (act.targets || []).length) store.update('activities', rec.id, { targets }, { silent: true });
  store.touchActivity(targets, at);
  return rec;
}
export function expandTargets(targets) {
  const out = [...targets];
  const has = (t) => out.some((x) => x.type === t.type && x.id === t.id);
  for (const t of targets) {
    if (t.type === 'contact') {
      for (const id of store.linkedIds('contact', t.id, 'company')) { const x = { type: 'company', id }; if (!has(x)) out.push(x); }
    }
  }
  return out;
}
export function activitiesFor(type, id) {
  return store.filter('activities', (a) => a.targets?.some((t) => t.type === type && t.id === id));
}

// ---------- tasks ----------
export function createTask(task, { source = 'user' } = {}) {
  return store.insert('tasks', {
    title: '', type: 'todo', priority: 'medium', status: 'open', ownerId: store.settings.currentUserId,
    dueAt: null, notes: '', targets: [], ...task,
  }, { source });
}
export function completeTask(id, done = true) {
  const t = store.update('tasks', id, { status: done ? 'done' : 'open', completedAt: done ? new Date().toISOString() : null });
  if (t && done) store.touchActivity(t.targets, t.completedAt);
  return t;
}
export function tasksFor(type, id) {
  return store.filter('tasks', (t) => t.targets?.some((x) => x.type === type && x.id === id));
}

// ---------- notifications ----------
export function notify(userId, text, { link = '', kind = 'info' } = {}) {
  if (!userId) return null;
  return store.insert('notifications', { userId, text, link, kind, read: false }, { source: 'system' });
}

// Short text used for timeline/system entries.
export function recordLabel(type, id) {
  const r = store.get(collOf(type), id);
  return r ? displayName(type, r) : '(נמחק)';
}
