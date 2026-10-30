// Interface language (Hebrew or English) and Hebrew support for learning content.
// UI strings live here; learning content carries its own {en, he} pairs.
import { html, raw, esc } from './util.js';

const STRINGS = {
  // shell
  'nav.today': ['היום', 'Today'],
  'nav.path': ['המסלול', 'Path'],
  'nav.practice': ['תרגול', 'Practice'],
  'nav.reallife': ['אנגלית לחיים', 'Real life'],
  'nav.progress': ['התקדמות', 'Progress'],
  'nav.more': ['עוד', 'More'],
  'nav.vocab': ['אוצר מילים', 'Vocabulary'],
  'nav.grammar': ['מעבדת דקדוק', 'Grammar lab'],
  'nav.reading': ['מרכז קריאה', 'Reading'],
  'nav.listening': ['מרכז האזנה', 'Listening'],
  'nav.speaking': ['מעבדת דיבור', 'Speaking lab'],
  'nav.writing': ['מעבדת כתיבה', 'Writing lab'],
  'nav.tutor': ['מורה AI', 'AI tutor'],
  'nav.slang': ['ביטויים וסלנג', 'Expressions'],
  'nav.simulations': ['סימולציות שיחה', 'Conversations'],
  'nav.profile': ['פרופיל', 'Profile'],
  'nav.settings': ['הגדרות', 'Settings'],
  'skip': ['דילוג לתוכן', 'Skip to content'],
  'loading': ['טוען…', 'Loading…'],
  'back': ['חזרה', 'Back'],
  'close': ['סגירה', 'Close'],
  'continue': ['המשך', 'Continue'],
  'check': ['בדיקה', 'Check'],
  'next': ['הבא', 'Next'],
  'start': ['התחלה', 'Start'],
  'save': ['שמירה', 'Save'],
  'cancel': ['ביטול', 'Cancel'],
  'retry': ['לנסות שוב', 'Try again'],
  'minutes': ['{n} דק׳', '{n} min'],
  'of': ['{a} מתוך {b}', '{a} of {b}'],
  'device.only': ['שמור במכשיר הזה', 'Saved on this device'],
  'synced': ['מסונכרן', 'Synced'],
  'sync.pending': ['ממתין לסנכרון', 'Waiting to sync'],
  'offline': ['אין חיבור – הכול נשמר במכשיר', 'Offline – everything is saved on this device'],
  // levels & skills
  'skill.vocabulary': ['אוצר מילים', 'Vocabulary'],
  'skill.grammar': ['דקדוק', 'Grammar'],
  'skill.reading': ['קריאה', 'Reading'],
  'skill.listening': ['הבנת הנשמע', 'Listening'],
  'skill.speaking': ['דיבור', 'Speaking'],
  'skill.writing': ['כתיבה', 'Writing'],
  'level.estimate': ['הערכה של Lucid לפי מתארי CEFR', 'Lucid estimate, aligned to CEFR descriptors'],
  'level.none': ['עוד אין מספיק נתונים', 'Not enough evidence yet'],
  // feedback
  'fb.correct': ['נכון', 'Correct'],
  'fb.almost': ['כמעט – בדקו את האיות', 'Almost – check the spelling'],
  'fb.wrong': ['לא בדיוק', 'Not quite'],
  'fb.answer': ['התשובה:', 'Answer:'],
  'fb.why': ['למה', 'Why'],
  'hint': ['רמז', 'Hint'],
  'show.answer': ['הצגת התשובה', 'Show the answer'],
  'dont.know': ['לא יודע/ת', 'I don\'t know'],
  'listen': ['השמעה', 'Listen'],
  'listen.slow': ['לאט', 'Slowly'],
  'record': ['הקלטה', 'Record'],
  'stop': ['עצירה', 'Stop'],
  'ai.label': ['משוב AI יכול לטעות', 'AI feedback can be wrong'],
  'ai.report': ['דיווח על טעות', 'Report a mistake'],
  'ai.unavailable': ['תכונות ה-AI עוד לא הוגדרו בשרת הזה. הבדיקות האוטומטיות עובדות גם בלעדיהן.', 'AI features are not configured on this server. Automatic checks still work without them.'],
};

let lang = 'he';
export const uiLang = () => lang;
export function setUiLang(l) {
  lang = l === 'en' ? 'en' : 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

// t('minutes', {n: 5})
export function t(key, vars) {
  const pair = STRINGS[key];
  let s = pair ? pair[lang === 'he' ? 0 : 1] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}
// Inline bilingual UI copy for one-off strings: tt('שלום', 'Hello').
export const tt = (he, en) => (lang === 'he' ? he : en);
// The other language's version of a UI string (for the secondary legend).
export function tOther(key) {
  const pair = STRINGS[key];
  return pair ? pair[lang === 'he' ? 1 : 0] : '';
}

// ---------- Hebrew support for learning content ----------
// 'auto' follows the learner's level: full support at Pre-A1-A2, partial at B1, minimal at B2, off at C1+.
export const SUPPORT_BY_LEVEL = { PreA1: 'full', A1: 'full', A2: 'partial', B1: 'minimal', B2: 'minimal', C1: 'off', C2: 'off' };
let support = 'full';
export const hebrewSupport = () => support;
export function setHebrewSupport(setting, level) {
  support = setting && setting !== 'auto' ? setting : SUPPORT_BY_LEVEL[level] || 'full';
  document.documentElement.dataset.support = support;
}

// A dual legend: the English target and the Hebrew scaffold, in two inks.
// Hebrew is shown according to the support level; 'off' keeps it one tap away.
export function legend(en, he, { tag = 'span', cls = '' } = {}) {
  return html`<${raw(tag)} class="legend ${cls}"><span class="l-en" lang="en" dir="ltr">${en}</span>${he ? html`<span class="l-he" lang="he" dir="rtl">${isolateLatin(he)}</span>` : ''}</${raw(tag)}>`;
}
// Hebrew content often quotes English ("אומרים What's up? כשנפגשים"). Left alone, the bidi algorithm can
// move punctuation and reorder the English. Each Latin run is wrapped in a <bdi dir="ltr"> isolate at
// render time, so content files need no invisible control characters (research C3, R2 and R5).
const LATIN_RUN = /[^\u0590-\u05FF]*[A-Za-z][^\u0590-\u05FF]*/g;
export function isolateLatin(text) {
  const s = String(text ?? '');
  if (!/[\u0590-\u05FF]/.test(s) || !/[A-Za-z]/.test(s)) return s;
  let out = '';
  let last = 0;
  for (const m of s.matchAll(LATIN_RUN)) {
    const run = m[0];
    const lead = run.match(/^[\s,;:()\-\u2013\u2014\u05BE]*/)[0];
    const trail = run.slice(lead.length).match(/[\s,;:()\-\u2013\u2014]*$/)[0];
    const core = run.slice(lead.length, run.length - trail.length);
    out += esc(s.slice(last, m.index)) + esc(lead) + (core ? `<bdi dir="ltr" lang="en">${esc(core)}</bdi>` : '') + esc(trail);
    last = m.index + run.length;
  }
  return raw(out + esc(s.slice(last)));
}

// Bilingual content text: English always; Hebrew per support level.
export function bi(obj, { always = false } = {}) {
  if (!obj) return '';
  if (typeof obj === 'string') return html`<span lang="en" dir="ltr">${obj}</span>`;
  const showHe = obj.he && (always || support === 'full' || support === 'partial');
  return html`<span class="bi">${showHe && support === 'full' ? html`<span class="bi-he" lang="he" dir="rtl">${isolateLatin(obj.he)}</span>` : ''}<span class="bi-en" lang="en" dir="ltr">${obj.en}</span>${showHe && support !== 'full' ? html`<span class="bi-he bi-he-after" lang="he" dir="rtl">${isolateLatin(obj.he)}</span>` : ''}${!showHe && obj.he ? html`<button type="button" class="he-reveal" data-reveal-he aria-label="${tt('הצגת הסבר בעברית', 'Show Hebrew')}" lang="he">עב</button><span class="bi-he" lang="he" dir="rtl" hidden>${isolateLatin(obj.he)}</span>` : ''}</span>`;
}
