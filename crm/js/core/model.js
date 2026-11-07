// Labels and helpers for the CRM model (values match the database CHECK constraints).

import { store } from './store.js';
import { normPhone } from './rules.js';

export const LEAD_STATUS = [
  { value: 'new', label: 'חדש', color: 'sky' },
  { value: 'attempting', label: 'ניסיון יצירת קשר', color: 'amber' },
  { value: 'connected', label: 'נוצר קשר', color: 'indigo' },
  { value: 'qualified', label: 'מתאים', color: 'green' },
  { value: 'nurture', label: 'לא עכשיו (לטפח)', color: 'violet' },
  { value: 'disqualified', label: 'לא רלוונטי', color: 'slate' },
];
export const LIFECYCLE = [
  { value: 'lead', label: 'ליד', color: 'sky' },
  { value: 'qualified', label: 'ליד מתאים', color: 'indigo' },
  { value: 'opportunity', label: 'בתהליך מכירה', color: 'amber' },
  { value: 'customer', label: 'לקוח', color: 'green' },
  { value: 'former', label: 'לקוח לשעבר', color: 'slate' },
  { value: 'other', label: 'אחר', color: 'slate' },
];
export const FIT = [
  { value: 'high', label: 'גבוהה', color: 'green' },
  { value: 'medium', label: 'בינונית', color: 'amber' },
  { value: 'low', label: 'נמוכה', color: 'slate' },
];
export const UNRATED = 'לא דורג'; // lead quality (fit) not set yet
export const DISQUALIFY = ['תקציב נמוך מדי', 'לא בתחום שלנו', 'לא ענה אחרי כמה ניסיונות', 'בחר במתחרה', 'רק בירור מחיר', 'ספאם / טעות', 'אחר'];
export const LOST_REASONS = [
  { value: 'price', label: 'מחיר' },
  { value: 'competitor', label: 'הלך למתחרה' },
  { value: 'timing', label: 'עיתוי' },
  { value: 'no_budget', label: 'אין תקציב' },
  { value: 'no_response', label: 'הפסיק להגיב' },
  { value: 'not_fit', label: 'לא מתאים' },
  { value: 'diy', label: 'יעשה לבד' },
  { value: 'other', label: 'אחר' },
];
export const TASK_TYPES = [
  { value: 'call', label: 'שיחה', icon: 'phone' },
  { value: 'whatsapp', label: 'וואטסאפ', icon: 'whatsapp' },
  { value: 'email', label: 'אימייל', icon: 'mail' },
  { value: 'meeting', label: 'פגישת אפיון', icon: 'calendar' },
  { value: 'quote', label: 'הכנת הצעת מחיר', icon: 'quote' },
  { value: 'followup', label: 'מעקב / שיחת המשך', icon: 'refresh' },
  { value: 'todo', label: 'משימה', icon: 'task' },
];
export const ACTIVITY_TYPES = [
  { value: 'call', label: 'שיחה', icon: 'phone' },
  { value: 'whatsapp', label: 'וואטסאפ', icon: 'whatsapp' },
  { value: 'meeting', label: 'פגישה', icon: 'calendar' },
  { value: 'email', label: 'אימייל', icon: 'mail' },
  { value: 'note', label: 'הערה', icon: 'note' },
];
export const CALL_OUTCOMES = ['דיברנו', 'לא ענה', 'ביקש לחזור אליו', 'השארתי הודעה', 'מספר שגוי'];
export const SERVICE_TYPES = ['אתר תדמית', 'דף נחיתה', 'חנות אונליין', 'אתר מותאם', 'תחזוקה', 'קידום / SEO', 'עיצוב מחדש', 'אחר'];

export const label = (list, v) => list.find((x) => x.value === v)?.label ?? v ?? '';
export const color = (list, v) => list.find((x) => x.value === v)?.color ?? 'slate';

export function contactName(c) {
  if (!c) return '';
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company_name || c.email || c.phone || 'ללא שם';
}
export const sources = () => store.all('crm_sources').filter((s) => s.active !== false).sort((a, b) => a.position - b.position);
export const sourceName = (id) => (id ? store.get('crm_sources', id)?.name || 'מקור שנמחק' : 'לא ידוע');
export function pipeline() {
  return store.all('crm_pipelines').find((p) => p.is_default) || store.all('crm_pipelines')[0];
}
export function stages(pipelineId = pipeline()?.id) {
  return store.filter('crm_stages', (s) => s.pipeline_id === pipelineId).sort((a, b) => a.position - b.position);
}
export const stageName = (id) => store.get('crm_stages', id)?.name || '';
export const openTasks = () => store.filter('crm_tasks', (t) => t.status === 'open');
export function nextTaskFor({ contactId, dealId }) {
  return openTasks().filter((t) => (contactId && t.contact_id === contactId) || (dealId && t.deal_id === dealId))
    .sort((a, b) => ((a.due_at || '9') < (b.due_at || '9') ? -1 : 1))[0] || null;
}
export const dealsOf = (contactId) => store.filter('crm_deals', (d) => d.contact_id === contactId);
export function lastActivityAt(contactId) {
  let last = null;
  for (const a of store.all('crm_activities')) if (a.contact_id === contactId && (!last || a.at > last)) last = a.at;
  return last;
}
export function dueClass(due) {
  if (!due) return '';
  const d = new Date(due), now = new Date();
  const end = new Date(); end.setHours(23, 59, 59, 999);
  if (d < now) return 'due-overdue';
  if (d <= end) return 'due-today';
  return '';
}
// Duplicate candidates by phone or email (never merged automatically).
export function findDuplicates({ email, phone, first_name, last_name }, excludeId) {
  const e = String(email || '').trim().toLowerCase();
  const p = normPhone(phone) || '';
  const name = [first_name, last_name].filter(Boolean).join(' ').trim();
  const byContact = store.filter('crm_contacts', (c) => c.id !== excludeId && ((e && c.email === e) || (p.length >= 9 && c.phone_norm === p)));
  if (byContact.length || !first_name || !last_name) return byContact;
  return store.filter('crm_contacts', (c) => c.id !== excludeId && contactName(c) === name).map((c) => ({ ...c, _byName: true }));
}
