// Filter engine shared by list views, saved views, segments, workflows and reports.
// A filter is { prop, op, value }. A filter set is { match: 'all'|'any', filters: [...] }.

import { getProps, getProp, getValue, displayName, optionLabel, stageById } from './schema.js';
import { store, collOf } from './store.js';
import { normalize, startOfDay, endOfDay, addDays, DAY } from './util.js';

export const OPS = {
  is: 'שווה ל',
  is_not: 'שונה מ',
  contains: 'מכיל',
  not_contains: 'לא מכיל',
  starts: 'מתחיל ב',
  gt: 'גדול מ',
  lt: 'קטן מ',
  between: 'בין',
  any_of: 'אחד מ',
  none_of: 'אף אחד מ',
  before: 'לפני',
  after: 'אחרי',
  last_days: 'ב-X הימים האחרונים',
  next_days: 'ב-X הימים הבאים',
  more_than_days_ago: 'לפני יותר מ-X ימים',
  today: 'היום',
  this_week: 'השבוע',
  this_month: 'החודש',
  overdue: 'באיחור',
  known: 'יש ערך',
  unknown: 'אין ערך',
  is_true: 'כן',
  is_false: 'לא',
  me: 'אני',
  has_assoc: 'משויך ל',
};

export function opsFor(prop) {
  if (!prop) return [];
  switch (prop.type) {
    case 'text': case 'textarea': case 'email': case 'phone': case 'url':
      return ['contains', 'not_contains', 'is', 'is_not', 'starts', 'known', 'unknown'];
    case 'number': case 'money': case 'percent': case 'score':
      return ['is', 'gt', 'lt', 'between', 'known', 'unknown'];
    case 'date': case 'datetime':
      return ['today', 'this_week', 'this_month', 'last_days', 'next_days', 'more_than_days_ago', 'before', 'after', 'overdue', 'known', 'unknown'];
    case 'select': case 'stage': case 'pipeline':
      return ['any_of', 'none_of', 'known', 'unknown'];
    case 'multiselect':
      return ['any_of', 'none_of', 'known', 'unknown'];
    case 'user':
      return ['me', 'any_of', 'none_of', 'known', 'unknown'];
    case 'bool':
      return ['is_true', 'is_false'];
    default:
      return ['is', 'known', 'unknown'];
  }
}
// Which ops need a value input, and of what kind.
export function valueKind(prop, op) {
  if (['known', 'unknown', 'is_true', 'is_false', 'me', 'today', 'this_week', 'this_month', 'overdue'].includes(op)) return null;
  if (['last_days', 'next_days', 'more_than_days_ago'].includes(op)) return 'days';
  if (op === 'between') return 'range';
  if (['any_of', 'none_of'].includes(op)) return 'options';
  if (['before', 'after'].includes(op)) return 'date';
  if (['number', 'money', 'percent', 'score'].includes(prop.type)) return 'number';
  return 'text';
}

const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

export function testFilter(type, record, f) {
  const prop = getProp(type, f.prop) || { key: f.prop, type: 'text' };
  const v = valueFor(type, record, f.prop);
  const fv = f.value;
  switch (f.op) {
    case 'known': return !empty(v);
    case 'unknown': return empty(v);
    case 'is_true': return v === true;
    case 'is_false': return v !== true;
    case 'me': return v === store.settings.currentUserId;
    case 'contains': return normalize(v).includes(normalize(fv));
    case 'not_contains': return !normalize(v).includes(normalize(fv));
    case 'starts': return normalize(v).startsWith(normalize(fv));
    case 'is':
      if (['number', 'money', 'percent', 'score'].includes(prop.type)) return Number(v) === Number(fv);
      return normalize(v) === normalize(fv);
    case 'is_not': return normalize(v) !== normalize(fv);
    case 'gt': return !empty(v) && Number(v) > Number(fv);
    case 'lt': return !empty(v) && Number(v) < Number(fv);
    case 'between': {
      const [a, b] = Array.isArray(fv) ? fv : [];
      return !empty(v) && (a === '' || a == null || Number(v) >= Number(a)) && (b === '' || b == null || Number(v) <= Number(b));
    }
    case 'any_of': {
      const set = new Set(Array.isArray(fv) ? fv : [fv]);
      if (Array.isArray(v)) return v.some((x) => set.has(x));
      return set.has(v);
    }
    case 'none_of': {
      const set = new Set(Array.isArray(fv) ? fv : [fv]);
      if (Array.isArray(v)) return !v.some((x) => set.has(x));
      return !set.has(v);
    }
    case 'before': return !empty(v) && new Date(v) < startOfDay(fv);
    case 'after': return !empty(v) && new Date(v) > endOfDay(fv);
    case 'today': return !empty(v) && new Date(v) >= startOfDay() && new Date(v) <= endOfDay();
    case 'this_week': {
      if (empty(v)) return false;
      const s = startOfDay(); s.setDate(s.getDate() - s.getDay());
      const d = new Date(v);
      return d >= s && d < addDays(s, 7);
    }
    case 'this_month': {
      if (empty(v)) return false;
      const d = new Date(v), n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    }
    case 'last_days': return !empty(v) && new Date(v) >= new Date(Date.now() - Number(fv) * DAY) && new Date(v) <= new Date();
    case 'next_days': return !empty(v) && new Date(v) >= startOfDay() && new Date(v) <= endOfDay(addDays(new Date(), Number(fv)));
    case 'more_than_days_ago': return empty(v) || new Date(v) < new Date(Date.now() - Number(fv) * DAY);
    case 'overdue': return !empty(v) && new Date(v) < startOfDay();
    case 'has_assoc': return store.linkedIds(type, record.id, f.prop.replace(/^assoc:/, '')).length > 0;
    default: return true;
  }
}

// Raw value for a filter key. Supports computed props and "assoc:<type>" pseudo-props (count of associations).
export function valueFor(type, record, key) {
  if (key.startsWith('assoc:')) return store.linkedIds(type, record.id, key.slice(6)).length || null;
  if (key === 'score' && type === 'contact') return scoreOf(record);
  return getValue(type, record, key);
}

export function applyFilters(type, records, set) {
  const filters = (set?.filters || []).filter((f) => f.prop && f.op);
  if (!filters.length) return records;
  const any = set.match === 'any';
  return records.filter((r) => (any ? filters.some((f) => testFilter(type, r, f)) : filters.every((f) => testFilter(type, r, f))));
}

// Free text search across the record's text-ish properties.
export function searchRecords(type, records, q) {
  const n = normalize(q);
  if (!n) return records;
  const keys = getProps(type).filter((p) => ['text', 'email', 'phone', 'url', 'textarea'].includes(p.type)).map((p) => p.key);
  return records.filter((r) => normalize(displayName(type, r)).includes(n) || keys.some((k) => normalize(r[k]).includes(n)));
}

// Human-readable summary of a filter, for chips and descriptions.
export function describeFilter(type, f) {
  const prop = getProp(type, f.prop);
  const label = prop?.label || (f.prop.startsWith('assoc:') ? `שיוך ל${f.prop.slice(6)}` : f.prop);
  const opLabel = OPS[f.op] || f.op;
  let val = '';
  const kind = prop ? valueKind(prop, f.op) : null;
  if (kind === 'options') {
    const arr = Array.isArray(f.value) ? f.value : [f.value];
    val = arr.map((x) => {
      if (prop.type === 'user') return store.get('users', x)?.name || x;
      if (prop.type === 'stage') return stageById(type, x)?.name || x;
      return optionLabel(prop, x);
    }).join(', ');
  } else if (kind === 'range') val = `${f.value?.[0] ?? ''}–${f.value?.[1] ?? ''}`;
  else if (kind === 'days') val = `${f.value} ימים`;
  else if (kind) val = f.value;
  return `${label} ${opLabel}${val !== '' ? ` ${val}` : ''}`;
}

// ---------- lead scoring ----------
// settings.scoring.rules: [{ id, filter: {prop, op, value}, points, label }]. Also counts engagement.
const scoreCache = new Map();
let scoreStamp = 0;
store.on('change', () => { scoreStamp++; });
store.on('settings', () => { scoreStamp++; });
export function scoreOf(contact) {
  const cached = scoreCache.get(contact.id);
  if (cached && cached.stamp === scoreStamp) return cached.score;
  const sc = store.settings.scoring;
  let score = 0;
  if (sc?.enabled !== false) {
    for (const rule of sc?.rules || []) {
      if (rule.filter && testFilterRaw('contact', contact, rule.filter)) score += Number(rule.points) || 0;
    }
  }
  score = Math.max(0, Math.min(100, score));
  scoreCache.set(contact.id, { stamp: scoreStamp, score });
  return score;
}
// testFilter without the score shortcut (avoid recursion when a rule references score).
function testFilterRaw(type, record, f) {
  if (f.prop === 'score') return false;
  return testFilter(type, record, f);
}

export const DEFAULT_SCORING_RULES = [
  { id: 'r1', label: 'מקבל החלטות', filter: { prop: 'tags', op: 'any_of', value: ['decision_maker'] }, points: 20 },
  { id: 'r2', label: 'הגיע מהמלצה', filter: { prop: 'source', op: 'any_of', value: ['referral', 'partner'] }, points: 15 },
  { id: 'r3', label: 'ליד מכירות או הזדמנות', filter: { prop: 'lifecycle', op: 'any_of', value: ['sql', 'opportunity'] }, points: 20 },
  { id: 'r4', label: 'פעילות ב-14 הימים האחרונים', filter: { prop: 'lastActivityAt', op: 'last_days', value: 14 }, points: 20 },
  { id: 'r5', label: 'יש טלפון', filter: { prop: 'phone', op: 'known' }, points: 5 },
  { id: 'r6', label: 'יש תפקיד', filter: { prop: 'jobTitle', op: 'known' }, points: 5 },
  { id: 'r7', label: 'משויך לעסקה', filter: { prop: 'assoc:deal', op: 'known' }, points: 15 },
  { id: 'r8', label: 'לא מתאים', filter: { prop: 'leadStatus', op: 'any_of', value: ['unqualified'] }, points: -40 },
];
