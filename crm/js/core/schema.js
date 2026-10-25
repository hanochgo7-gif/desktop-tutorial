// Object model: CRM object types, their built-in properties, and default settings (pipelines, options).
// Custom properties and edited option lists live in store.settings and are merged in by getProps().

import { store } from './store.js';

export const OBJECTS = {
  contact: { coll: 'contacts', singular: 'איש קשר', plural: 'אנשי קשר', icon: 'user', route: 'contacts' },
  company: { coll: 'companies', singular: 'חברה', plural: 'חברות', icon: 'building', route: 'companies', fem: true },
  deal: { coll: 'deals', singular: 'עסקה', plural: 'עסקאות', icon: 'deal', route: 'deals', fem: true },
  ticket: { coll: 'tickets', singular: 'פנייה', plural: 'פניות שירות', icon: 'ticket', route: 'tickets', fem: true },
};
export const OBJECT_TYPES = Object.keys(OBJECTS);
export const typeOfColl = (coll) => OBJECT_TYPES.find((t) => OBJECTS[t].coll === coll);

export const LIFECYCLE = [
  { value: 'subscriber', label: 'מנוי', color: 'slate' },
  { value: 'lead', label: 'ליד', color: 'sky' },
  { value: 'mql', label: 'ליד שיווקי (MQL)', color: 'violet' },
  { value: 'sql', label: 'ליד מכירות (SQL)', color: 'indigo' },
  { value: 'opportunity', label: 'הזדמנות', color: 'amber' },
  { value: 'customer', label: 'לקוח', color: 'green' },
  { value: 'evangelist', label: 'שגריר', color: 'teal' },
  { value: 'other', label: 'אחר', color: 'slate' },
];

// Default editable option lists. Keys are referenced by properties via `optionsKey`.
export const DEFAULT_OPTIONS = {
  leadStatus: [
    { value: 'new', label: 'חדש', color: 'sky' },
    { value: 'open', label: 'פתוח', color: 'indigo' },
    { value: 'in_progress', label: 'בטיפול', color: 'amber' },
    { value: 'connected', label: 'נוצר קשר', color: 'violet' },
    { value: 'qualified', label: 'מתאים', color: 'green' },
    { value: 'unqualified', label: 'לא מתאים', color: 'red' },
    { value: 'bad_timing', label: 'לא הזמן', color: 'slate' },
  ],
  source: [
    { value: 'website', label: 'אתר', color: 'sky' },
    { value: 'google_ads', label: 'Google Ads', color: 'amber' },
    { value: 'facebook', label: 'פייסבוק / אינסטגרם', color: 'indigo' },
    { value: 'referral', label: 'המלצה', color: 'green' },
    { value: 'event', label: 'כנס / אירוע', color: 'violet' },
    { value: 'cold', label: 'פנייה יזומה', color: 'slate' },
    { value: 'linkedin', label: 'לינקדאין', color: 'sky' },
    { value: 'partner', label: 'שותף', color: 'teal' },
    { value: 'form', label: 'טופס', color: 'teal' },
    { value: 'import', label: 'ייבוא', color: 'slate' },
    { value: 'other', label: 'אחר', color: 'slate' },
  ],
  industry: [
    { value: 'tech', label: 'הייטק ותוכנה' },
    { value: 'retail', label: 'קמעונאות' },
    { value: 'manufacturing', label: 'תעשייה וייצור' },
    { value: 'finance', label: 'פיננסים וביטוח' },
    { value: 'health', label: 'בריאות' },
    { value: 'realestate', label: 'נדל"ן ובנייה' },
    { value: 'education', label: 'חינוך' },
    { value: 'food', label: 'מזון ומסעדנות' },
    { value: 'services', label: 'שירותים מקצועיים' },
    { value: 'logistics', label: 'לוגיסטיקה' },
    { value: 'energy', label: 'אנרגיה' },
    { value: 'public', label: 'מגזר ציבורי' },
  ],
  companyType: [
    { value: 'prospect', label: 'פוטנציאלי', color: 'sky' },
    { value: 'customer', label: 'לקוח', color: 'green' },
    { value: 'partner', label: 'שותף', color: 'violet' },
    { value: 'vendor', label: 'ספק', color: 'amber' },
    { value: 'other', label: 'אחר', color: 'slate' },
  ],
  companySize: [
    { value: '1-10', label: '1–10' },
    { value: '11-50', label: '11–50' },
    { value: '51-200', label: '51–200' },
    { value: '201-500', label: '201–500' },
    { value: '501-1000', label: '501–1,000' },
    { value: '1000+', label: '1,000+' },
  ],
  dealType: [
    { value: 'new', label: 'לקוח חדש', color: 'sky' },
    { value: 'existing', label: 'הרחבה ללקוח קיים', color: 'green' },
    { value: 'renewal', label: 'חידוש', color: 'violet' },
  ],
  priority: [
    { value: 'low', label: 'נמוכה', color: 'slate' },
    { value: 'medium', label: 'בינונית', color: 'amber' },
    { value: 'high', label: 'גבוהה', color: 'red' },
  ],
  ticketPriority: [
    { value: 'low', label: 'נמוכה', color: 'slate' },
    { value: 'medium', label: 'בינונית', color: 'amber' },
    { value: 'high', label: 'גבוהה', color: 'red' },
    { value: 'urgent', label: 'דחופה', color: 'red' },
  ],
  ticketCategory: [
    { value: 'question', label: 'שאלה כללית' },
    { value: 'billing', label: 'חיוב ותשלום' },
    { value: 'bug', label: 'תקלה' },
    { value: 'feature', label: 'בקשת פיצ׳ר' },
    { value: 'onboarding', label: 'הטמעה' },
    { value: 'cancel', label: 'ביטול' },
  ],
  ticketChannel: [
    { value: 'email', label: 'מייל' },
    { value: 'phone', label: 'טלפון' },
    { value: 'whatsapp', label: 'וואטסאפ' },
    { value: 'chat', label: 'צ׳אט' },
    { value: 'form', label: 'טופס' },
  ],
  lostReason: [
    { value: 'price', label: 'מחיר' },
    { value: 'competitor', label: 'הלך למתחרה' },
    { value: 'timing', label: 'עיתוי' },
    { value: 'no_budget', label: 'אין תקציב' },
    { value: 'no_response', label: 'הפסיק להגיב' },
    { value: 'features', label: 'חסרה יכולת' },
    { value: 'other', label: 'אחר' },
  ],
  tags: [
    { value: 'vip', label: 'VIP', color: 'amber' },
    { value: 'newsletter', label: 'ניוזלטר', color: 'sky' },
    { value: 'decision_maker', label: 'מקבל החלטות', color: 'violet' },
    { value: 'partner', label: 'שותף', color: 'teal' },
    { value: 'event_2026', label: 'כנס 2026', color: 'indigo' },
  ],
};

export const DEFAULT_PIPELINES = {
  deal: [
    {
      id: 'sales', name: 'מכירות', stages: [
        { id: 'appointment', name: 'נקבעה פגישה', probability: 20, type: 'open' },
        { id: 'qualified', name: 'מתאים לרכישה', probability: 40, type: 'open' },
        { id: 'presentation', name: 'הדגמה בוצעה', probability: 60, type: 'open' },
        { id: 'decision', name: 'מקבל החלטה', probability: 80, type: 'open' },
        { id: 'contract', name: 'חוזה נשלח', probability: 90, type: 'open' },
        { id: 'won', name: 'נסגר בהצלחה', probability: 100, type: 'won' },
        { id: 'lost', name: 'אבד', probability: 0, type: 'lost' },
      ],
    },
    {
      id: 'partners', name: 'שותפים', stages: [
        { id: 'p_intro', name: 'היכרות', probability: 10, type: 'open' },
        { id: 'p_eval', name: 'בדיקת התאמה', probability: 35, type: 'open' },
        { id: 'p_terms', name: 'מו״מ על תנאים', probability: 70, type: 'open' },
        { id: 'p_won', name: 'הסכם נחתם', probability: 100, type: 'won' },
        { id: 'p_lost', name: 'לא התקדם', probability: 0, type: 'lost' },
      ],
    },
  ],
  ticket: [
    {
      id: 'support', name: 'תמיכה', stages: [
        { id: 'new', name: 'חדשה', type: 'open' },
        { id: 'waiting_us', name: 'ממתינה לנו', type: 'open' },
        { id: 'waiting_customer', name: 'ממתינה ללקוח', type: 'open' },
        { id: 'closed', name: 'סגורה', type: 'closed' },
      ],
    },
  ],
};

// Property types: text, textarea, email, phone, url, number, money, percent, date, datetime,
// select, multiselect, bool, user, stage, pipeline, readonly computed values.
// Flags: required, inCreate (shown in create form), inList (default table column), readonly, group.
const P = (key, label, type, extra = {}) => ({ key, label, type, system: true, group: 'main', ...extra });

const COMMON_TAIL = [
  P('ownerId', 'בעלים', 'user', { inCreate: true, inList: true }),
  P('createdAt', 'נוצר בתאריך', 'datetime', { readonly: true, group: 'system' }),
  P('updatedAt', 'עודכן לאחרונה', 'datetime', { readonly: true, group: 'system' }),
  P('lastActivityAt', 'פעילות אחרונה', 'datetime', { readonly: true, group: 'system' }),
];

const BASE_PROPS = {
  contact: [
    P('firstName', 'שם פרטי', 'text', { inCreate: true, required: true }),
    P('lastName', 'שם משפחה', 'text', { inCreate: true }),
    P('email', 'אימייל', 'email', { inCreate: true, inList: true, unique: true }),
    P('phone', 'טלפון', 'phone', { inCreate: true, inList: true }),
    P('jobTitle', 'תפקיד', 'text', { inCreate: true }),
    P('lifecycle', 'שלב במחזור החיים', 'select', { options: LIFECYCLE, inCreate: true, inList: true, group: 'sales' }),
    P('leadStatus', 'סטטוס ליד', 'select', { optionsKey: 'leadStatus', inCreate: true, inList: true, group: 'sales' }),
    P('source', 'מקור', 'select', { optionsKey: 'source', group: 'sales' }),
    P('score', 'ניקוד ליד', 'score', { readonly: true, group: 'sales', inList: true }),
    P('tags', 'תגיות', 'multiselect', { optionsKey: 'tags' }),
    P('city', 'עיר', 'text'),
    P('address', 'כתובת', 'text'),
    P('linkedin', 'לינקדאין', 'url'),
    P('birthday', 'יום הולדת', 'date'),
    P('marketingConsent', 'הסכמה לדיוור', 'bool', { group: 'marketing', help: 'לפי חוק התקשורת (תיקון 40, "חוק הספאם") יש לשלוח דיוור שיווקי רק למי שנתן הסכמה.' }),
    P('unsubscribed', 'הוסר מדיוור', 'bool', { group: 'marketing' }),
    ...COMMON_TAIL,
  ],
  company: [
    P('name', 'שם החברה', 'text', { inCreate: true, required: true }),
    P('domain', 'דומיין', 'url', { inCreate: true, inList: true, unique: true }),
    P('industry', 'תחום', 'select', { optionsKey: 'industry', inCreate: true, inList: true }),
    P('type', 'סוג', 'select', { optionsKey: 'companyType', inCreate: true, inList: true }),
    P('size', 'מספר עובדים', 'select', { optionsKey: 'companySize' }),
    P('annualRevenue', 'הכנסה שנתית', 'money'),
    P('phone', 'טלפון', 'phone', { inCreate: true }),
    P('city', 'עיר', 'text', { inCreate: true, inList: true }),
    P('address', 'כתובת', 'text'),
    P('taxId', 'ח.פ. / ע.מ.', 'text'),
    P('linkedin', 'לינקדאין', 'url'),
    P('description', 'תיאור', 'textarea'),
    ...COMMON_TAIL,
  ],
  deal: [
    P('name', 'שם העסקה', 'text', { inCreate: true, required: true }),
    P('amount', 'סכום', 'money', { inCreate: true, inList: true }),
    P('pipelineId', 'צינור', 'pipeline', { inCreate: true, required: true }),
    P('stageId', 'שלב', 'stage', { inCreate: true, inList: true, required: true }),
    P('closeDate', 'תאריך סגירה צפוי', 'date', { inCreate: true, inList: true }),
    P('probability', 'הסתברות', 'percent', { readonly: true, computed: true }),
    P('weightedAmount', 'סכום משוקלל', 'money', { readonly: true, computed: true }),
    P('dealType', 'סוג עסקה', 'select', { optionsKey: 'dealType', inCreate: true }),
    P('priority', 'עדיפות', 'select', { optionsKey: 'priority', inCreate: true }),
    P('source', 'מקור', 'select', { optionsKey: 'source' }),
    P('nextStep', 'הצעד הבא', 'text'),
    P('lostReason', 'סיבת הפסד', 'select', { optionsKey: 'lostReason', group: 'outcome' }),
    P('closedAt', 'נסגר בתאריך', 'datetime', { readonly: true, group: 'outcome' }),
    P('stageChangedAt', 'נכנס לשלב הנוכחי', 'datetime', { readonly: true, group: 'system' }),
    ...COMMON_TAIL,
  ],
  ticket: [
    P('subject', 'נושא', 'text', { inCreate: true, required: true }),
    P('description', 'תיאור', 'textarea', { inCreate: true }),
    P('pipelineId', 'צינור', 'pipeline', { inCreate: true, required: true }),
    P('stageId', 'סטטוס', 'stage', { inCreate: true, inList: true, required: true }),
    P('priority', 'עדיפות', 'select', { optionsKey: 'ticketPriority', inCreate: true, inList: true }),
    P('category', 'קטגוריה', 'select', { optionsKey: 'ticketCategory', inCreate: true, inList: true }),
    P('channel', 'ערוץ', 'select', { optionsKey: 'ticketChannel', inCreate: true }),
    P('dueAt', 'יעד לטיפול (SLA)', 'datetime', { inList: true }),
    P('closedAt', 'נסגרה בתאריך', 'datetime', { readonly: true, group: 'system' }),
    ...COMMON_TAIL,
  ],
};

export const PROP_GROUPS = {
  main: 'פרטים',
  sales: 'מכירות',
  marketing: 'שיווק',
  outcome: 'תוצאה',
  custom: 'שדות מותאמים',
  system: 'מערכת',
};

export const PROP_TYPES = {
  text: 'טקסט', textarea: 'טקסט ארוך', email: 'אימייל', phone: 'טלפון', url: 'קישור',
  number: 'מספר', money: 'סכום כספי', percent: 'אחוז', date: 'תאריך', datetime: 'תאריך ושעה',
  select: 'בחירה מרשימה', multiselect: 'בחירה מרובה', bool: 'כן / לא', user: 'משתמש',
};

// All properties for a type: built-ins (with option lists resolved from settings) + custom ones.
export function getProps(type) {
  const s = store.settings;
  const labels = s.propLabels?.[type] || {};
  const hidden = new Set(s.hiddenProps?.[type] || []);
  const base = (BASE_PROPS[type] || []).map((p) => ({
    ...p,
    label: labels[p.key] || p.label,
    options: p.optionsKey ? getOptions(p.optionsKey) : p.options,
    hidden: hidden.has(p.key),
  }));
  const custom = (s.customProps?.[type] || []).map((p) => ({ ...p, custom: true, group: 'custom', options: p.optionsKey ? getOptions(p.optionsKey) : p.options }));
  return [...base, ...custom];
}
export function getProp(type, key) {
  return getProps(type).find((p) => p.key === key);
}
export function getOptions(key) {
  return store.settings.options?.[key] || DEFAULT_OPTIONS[key] || [];
}
export function optionLabel(prop, value) {
  const o = (prop?.options || []).find((x) => x.value === value);
  return o ? o.label : value;
}

// ---------- pipelines ----------
export function pipelines(type = 'deal') {
  return store.settings.pipelines?.[type] || DEFAULT_PIPELINES[type] || [];
}
export function pipeline(type, id) {
  const all = pipelines(type);
  return all.find((p) => p.id === id) || all[0];
}
export function stage(type, pipelineId, stageId) {
  const p = pipeline(type, pipelineId);
  return p?.stages.find((s) => s.id === stageId);
}
// Look up a stage across all pipelines (stage ids are unique per object type).
export function stageById(type, stageId) {
  for (const p of pipelines(type)) {
    const s = p.stages.find((x) => x.id === stageId);
    if (s) return { ...s, pipelineId: p.id, pipelineName: p.name };
  }
  return null;
}
export const isClosedStage = (type, stageId) => ['won', 'lost', 'closed'].includes(stageById(type, stageId)?.type);

// ---------- record helpers ----------
export function displayName(type, r) {
  if (!r) return '';
  switch (type) {
    case 'contact': return [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || 'ללא שם';
    case 'company': return r.name || r.domain || 'ללא שם';
    case 'deal': return r.name || 'עסקה ללא שם';
    case 'ticket': return r.subject || 'פנייה ללא נושא';
    default: return r.name || r.title || r.id;
  }
}
export function recordLink(type, id) {
  return `#/r/${type}/${id}`;
}

// Value used for display, filtering and sorting. Computes derived props.
export function getValue(type, r, key) {
  if (!r) return undefined;
  if (key === 'probability' && type === 'deal') return stageById('deal', r.stageId)?.probability ?? 0;
  if (key === 'weightedAmount' && type === 'deal') {
    return Math.round((Number(r.amount) || 0) * ((stageById('deal', r.stageId)?.probability ?? 0) / 100));
  }
  if (key === 'name' && type === 'contact') return displayName('contact', r);
  return r[key];
}

export function defaultsFor(type) {
  const me = store.settings.currentUserId;
  if (type === 'deal') {
    const p = pipelines('deal')[0];
    return { pipelineId: p.id, stageId: p.stages[0].id, ownerId: me, dealType: 'new' };
  }
  if (type === 'ticket') {
    const p = pipelines('ticket')[0];
    return { pipelineId: p.id, stageId: p.stages[0].id, ownerId: me, priority: 'medium' };
  }
  if (type === 'contact') return { ownerId: me, lifecycle: 'lead', leadStatus: 'new' };
  if (type === 'company') return { ownerId: me, type: 'prospect' };
  return {};
}

export const ACTIVITY_TYPES = {
  note: { label: 'הערה', icon: 'note' },
  email: { label: 'אימייל', icon: 'mail' },
  call: { label: 'שיחה', icon: 'phone' },
  meeting: { label: 'פגישה', icon: 'calendar' },
  whatsapp: { label: 'וואטסאפ', icon: 'message' },
  sms: { label: 'SMS', icon: 'message' },
};
export const CALL_OUTCOMES = [
  { value: 'connected', label: 'נענתה' },
  { value: 'no_answer', label: 'לא נענתה' },
  { value: 'voicemail', label: 'הושארה הודעה' },
  { value: 'busy', label: 'תפוס' },
  { value: 'wrong_number', label: 'מספר שגוי' },
];
export const TASK_TYPES = [
  { value: 'todo', label: 'משימה' },
  { value: 'call', label: 'שיחה' },
  { value: 'email', label: 'אימייל' },
  { value: 'meeting', label: 'פגישה' },
];
