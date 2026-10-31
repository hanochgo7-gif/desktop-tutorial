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
  'nav.help': ['עזרה', 'Help'],
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
  'ai.unavailable': ['תכונות ה-AI עוד לא זמינות באתר הזה. הבדיקות האוטומטיות עובדות גם בלעדיהן.', 'AI features are not available on this site yet. Automatic checks still work without them.'],
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
// 'auto' (Settings: "By level") follows the level: full at Pre-A1 and A1, partial at A2, minimal at B1 and B2,
// off at C1 and C2.
export const SUPPORT_BY_LEVEL = { PreA1: 'full', A1: 'full', A2: 'partial', B1: 'minimal', B2: 'minimal', C1: 'off', C2: 'off' };
const LEVEL_ORDER = Object.keys(SUPPORT_BY_LEVEL);
// The level that sets 'auto' support: the level the learner has shown (a placement's confirmed level or the
// highest level of a completed lesson), never above the course level. A placement that showed A2 and starts the
// course at B1 keeps A2 support until a B1 lesson is completed (R2-06). With nothing shown yet, the course level.
export function supportLevel(courseLevel, shownLevel = null) {
  const c = LEVEL_ORDER.indexOf(courseLevel), s = LEVEL_ORDER.indexOf(shownLevel);
  return s >= 0 && (c < 0 || s < c) ? shownLevel : courseLevel;
}
let support = 'full';
export const hebrewSupport = () => support;
export function setHebrewSupport(setting, level, shown = null) {
  support = setting && setting !== 'auto' ? setting : SUPPORT_BY_LEVEL[supportLevel(level, shown)] || 'full';
  document.documentElement.dataset.support = support;
}

// A dual legend: the English target and the Hebrew scaffold, in two inks.
// Hebrew is shown according to the support level; 'off' keeps it one tap away. A "Hebrew" line with no
// Hebrew letters (a title kept in English) is not a translation, so it is left out.
export function legend(en, he, { tag = 'span', cls = '' } = {}) {
  const showHe = he && HEBREW.test(he) && fold(he) !== fold(en);
  return html`<${raw(tag)} class="legend ${cls}"><span class="l-en" lang="en" dir="ltr">${en}</span>${showHe ? html`<span class="l-he" lang="he" dir="rtl">${isolateLatin(he)}</span>` : ''}</${raw(tag)}>`;
}
const fold = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9֐-׿]+/g, '');

// Hebrew content often quotes English ("אומרים What's up? כשנפגשים"). Left alone, the bidi algorithm moves
// punctuation and can reorder the English. Each English run is wrapped in a <bdi dir="ltr"> isolate at
// render time, so content files need no invisible control characters (research C3, R2 and R5).
// The isolate holds the English and what belongs to it: its own ? ! and ... and the quote marks or
// brackets around it. What joins it to the Hebrew stays outside and follows the Hebrew direction: a
// prefix hyphen (ב-am), a colon or comma, " = " before a Hebrew translation, and the Hebrew sentence's
// final full stop.
const HEBREW = /[֐-׿יִ-ﭏ]/;
const RUN = /[^֐-׿יִ-ﭏ]*[A-Za-z][^֐-׿יִ-ﭏ]*/g;
const CLOSER = { '"': '"', "'": "'", '“': '”', '‘': '’', '(': ')', '[': ']' };
const ABBREV = /(?:\.[A-Za-z]|^(?:Mr|Mrs|Ms|Dr|St|etc|vs|approx))$/i;

// The [start, end) of the English inside one run of non-Hebrew text.
function englishSpan(r) {
  let a = r.search(/[A-Za-z]/);
  while (a > 0 && /[0-9]/.test(r[a - 1])) a--;
  let b = r.length;
  while (b > a && !/[A-Za-z0-9]/.test(r[b - 1])) b--;
  let tail = r.slice(b).match(/^[?!.…]+/)?.[0] || '';
  const word = r.slice(a, b).match(/[A-Za-z.]+$/)?.[0] || '';
  if (/[^.]\.$|^\.$/.test(tail) && !ABBREV.test(word)) tail = tail.slice(0, -1);
  const full = r.slice(b).match(/^[?!.…]+/)?.[0] || '';
  // Quote marks or brackets that enclose the English go inside, with all its punctuation.
  while (a > 0 && CLOSER[r[a - 1]] && r[b + full.length] === CLOSER[r[a - 1]]) { a--; b += full.length + 1; tail = ''; }
  let [x, y] = keepPairs(r, a, b + tail.length);
  // A straight quote that opens inside and closes just outside ("a: 'It's not big deal'.") takes its partner in.
  if (unpairedQuotes(r.slice(x, y))) {
    const after = r.slice(y).search(/['"]/);
    if (after >= 0) y += after + 1;
    else { const before = r.slice(0, x).search(/['"][^'"]*$/); if (before >= 0) x = before; }
  }
  return [x, y];
}

// A bracket pair is never split by the isolate (R2-01): one bracket inside and its partner outside would be
// mirrored and moved by the bidi algorithm ("double (A, double N, A)." showed as "(double (A, ..."). An opener
// inside whose closer comes later in the run takes the closer in; a closer inside whose opener comes earlier
// takes the opener in. A partner beyond the run (in the Hebrew) cannot be reached; the content check flags it.
const PAIR = { '(': ')', '[': ']', '{': '}', '“': '”' };
const OPENER = Object.fromEntries(Object.entries(PAIR).map(([o, c]) => [c, o]));
function partner(r, from, step, c) {
  const [same, other] = step > 0 ? [c, PAIR[c]] : [c, OPENER[c]];
  let depth = 0;
  for (let i = from; i >= 0 && i < r.length; i += step) {
    if (r[i] === same) depth++;
    else if (r[i] === other && depth-- === 0) return i;
  }
  return -1;
}
// The brackets of r[a, b) that have no partner inside it: [index, char].
export function unpaired(s, a = 0, b = s.length) {
  const open = [], loose = [];
  for (let i = a; i < b; i++) {
    if (PAIR[s[i]]) open.push(i);
    else if (OPENER[s[i]]) { if (open.length && PAIR[s[open.at(-1)]] === s[i]) open.pop(); else loose.push(i); }
  }
  return [...loose, ...open].sort((x, y) => x - y);
}
function keepPairs(r, a, b) {
  for (let changed = true; changed;) {
    changed = false;
    for (const i of unpaired(r, a, b)) {
      const j = PAIR[r[i]] ? partner(r, b, 1, r[i]) : partner(r, a - 1, -1, r[i]);
      if (j >= b) { b = j + 1; changed = true; } else if (j >= 0 && j < a) { a = j; changed = true; }
    }
  }
  return [a, b];
}

export function isolateLatin(text) {
  const s = String(text ?? '');
  if (!/[A-Za-z]/.test(s)) return s;
  let out = '';
  let last = 0;
  for (const [at, r] of englishRuns(s)) {
    const [a, b] = englishSpan(r);
    out += esc(s.slice(last, at + a)) + `<bdi dir="ltr" lang="en">${esc(r.slice(a, b))}</bdi>`;
    last = at + b;
  }
  return raw(out + esc(s.slice(last)));
}
// The runs of non-Hebrew text that hold English, as [offset, text]. A bracket whose partner is outside the
// run (in the Hebrew: "Eilat. (he, she, it – בשיעור הבא.)") splits it, so the bracket stays with the Hebrew
// and the bidi algorithm pairs it with its partner there.
function englishRuns(s) {
  const out = [];
  const split = (r, at) => {
    const cuts = unpaired(r);
    if (!cuts.length) { if (/[A-Za-z]/.test(r)) out.push([at, r]); return; }
    let from = 0;
    for (const cut of [...cuts, r.length]) { split(r.slice(from, cut), at + from); from = cut + 1; }
  };
  for (const m of s.matchAll(RUN)) split(m[0], m.index);
  return out;
}
// Straight quote marks used as quotes (not apostrophes inside a word) that have no partner in s.
export function unpairedQuotes(s) {
  const dq = (s.match(/"/g) || []).length % 2;
  // Read left to right: an apostrophe inside a word (don't) or starting a contraction ('ll, 's = has) is not a
  // quote; a trailing one after s (parents') closes an open quote, otherwise it is a possessive.
  let open = false;
  for (const m of s.matchAll(/'/g)) {
    const i = m.index, prev = s[i - 1] || '', next = s[i + 1] || '';
    if (/[A-Za-z]/.test(prev) && /[A-Za-z]/.test(next)) continue;
    if (!open && !/[A-Za-z]/.test(prev) && /^'(?:ll|s|d|re|ve|m|t)(?![A-Za-z])/i.test(s.slice(i))) continue;
    if (/s/i.test(prev) && !/[A-Za-z]/.test(next) && !open) continue;
    open = !open;
  }
  const sq = open ? 1 : 0;
  return dq + sq;
}

// Bilingual content text: English always; Hebrew per support level.
// fold: a long explanation paragraph. At "partial" support its Hebrew is one tap away ("בעברית", per paragraph)
// instead of a full second copy under the English (R1-D10; research C3 S1: A2 gets English with a Hebrew
// tap-to-reveal). Short lines keep their Hebrew under the English.
export const FOLD_WORDS = 24;
const longText = (en) => String(en || '').split(/\s+/).filter(Boolean).length > FOLD_WORDS;
export function bi(obj, { always = false, fold = false } = {}) {
  if (!obj) return '';
  if (typeof obj === 'string') return html`<span lang="en" dir="ltr">${obj}</span>`;
  const folded = Boolean(obj.he) && fold && !always && support === 'partial' && longText(obj.en);
  const showHe = obj.he && !folded && (always || support === 'full' || support === 'partial');
  const hidden = html`<span class="bi-he bi-he-after" lang="he" dir="rtl" hidden>${isolateLatin(obj.he)}</span>`;
  return html`<span class="bi">${showHe && support === 'full' ? html`<span class="bi-he" lang="he" dir="rtl">${isolateLatin(obj.he)}</span>` : ''}<span class="bi-en" lang="en" dir="ltr">${obj.en}</span>${showHe && support !== 'full' ? html`<span class="bi-he bi-he-after" lang="he" dir="rtl">${isolateLatin(obj.he)}</span>` : ''}${folded
    ? html`<button type="button" class="he-reveal he-reveal-text" data-reveal-he aria-expanded="false" lang="he">בעברית<span class="sr-only"> ${tt('– להצגת הפסקה בעברית', '– show this paragraph in Hebrew')}</span></button>${hidden}`
    : !showHe && obj.he ? html`<button type="button" class="he-reveal" data-reveal-he aria-expanded="false" lang="he">עב<span class="sr-only"> ${tt('הצגת ההסבר בעברית', 'show the Hebrew explanation')}</span></button>${hidden}` : ''}</span>`;
}
