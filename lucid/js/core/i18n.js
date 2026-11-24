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
  'nav.games': ['משחקי מילים', 'Word games'],
  'nav.grammar': ['מעבדת דקדוק', 'Grammar lab'],
  'nav.reading': ['מרכז קריאה', 'Reading'],
  'nav.listening': ['מרכז האזנה', 'Listening'],
  'nav.speaking': ['מעבדת דיבור', 'Speaking lab'],
  'nav.writing': ['מעבדת כתיבה', 'Writing lab'],
  'nav.tutor': ['מורה AI', 'AI tutor'],
  'nav.slang': ['ביטויים וסלנג', 'Expressions'],
  'nav.simulations': ['שיחות תרגול', 'Conversations'], // SB-7: the real-life glossary (docs/ux/hebrew-microcopy.md)
  'nav.profile': ['פרופיל', 'Profile'],
  'nav.settings': ['הגדרות', 'Settings'],
  'nav.help': ['עזרה', 'Help'],
  'skip': ['דילוג לתוכן', 'Skip to content'],
  'loading': ['טוען…', 'Loading…'],
  'back': ['הקודם', 'Back'],
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
  'ai.report': ['סימון טעות במשוב', 'Mark a mistake'], // logged on the device; nobody reviews these yet (launch TS-06)
  'ai.unavailable': ['AI לא פעיל באתר הזה. כל השאר עובד.', 'AI features are not available on this site yet. Automatic checks still work without them.'],

  // ---- lane shell-components: new keys go here ----
  // The phone tab at 130-150% text (SC-9). Not 'לחיים', which on its own reads "Cheers!" (SB-7).
  'nav.reallife.short': ['מהחיים', 'Real life'],

  // ---- lane lesson-flow: new keys go here ----

  // ---- lane exercises: new keys go here ----

  // ---- lane bilingual-text: new keys go here ----

  // ---- lane first-run-today: new keys go here ----

  // ---- lane practice-hubs: new keys go here ----

  // ---- lane games: new keys go here ----

  // ---- lane real-life-writing: new keys go here ----
  // ---- lane r4-lesson-flow: new keys go here ----

  // ---- lane r4-exercises: new keys go here ----

  // ---- lane r4-today-path: new keys go here ----

  // ---- lane r4-practice-games: new keys go here ----
  'games.speed': ['אתגר מהירות במשחקים', 'Speed challenge in the games'],
  'games.speed_help': ['כבוי: אין שעון, והמשחק מחכה לכם. פועל: תשובה מהירה מוסיפה נקודות, עם שיאים נפרדים.', 'Off: no clock, and the game waits for you. On: a quick answer earns extra points, with bests of its own.'],

  // ---- lane r4-real-life-writing: new keys go here ----

  // ---- lane r4-shell-bilingual: new keys go here ----
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
// Round 4 (SB-4): in the English interface the Hebrew line follows the Hebrew-support setting. At "minimal" it is
// read to screen readers only, and at "off" it is left out; the Hebrew interface is unchanged.
export function legend(en, he, { tag = 'span', cls = '' } = {}) {
  const showHe = he && HEBREW.test(he) && fold(he) !== fold(en);
  const quiet = lang === 'en' && (support === 'minimal' || support === 'off');
  const heLine = !showHe || (quiet && support === 'off') ? ''
    : quiet ? html`<span class="sr-only" lang="he" dir="rtl">${he}</span>`
      : html`<span class="l-he" lang="he" dir="rtl">${isolateLatin(he)}</span>`;
  return html`<${raw(tag)} class="legend ${cls}"><span class="l-en" lang="en" dir="ltr">${spelled(en)}</span>${heLine}</${raw(tag)}>`;
}
// A spelled word in an English line ("O-M-E-R", "M-A-Y-A") stays in one piece (SB-3), as it does inside Hebrew text.
const spelled = (x) => (typeof x === 'string' ? keepSpelled(x) : x);
const fold = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9֐-׿]+/g, '');

// Hebrew content often quotes English ("אומרים What's up? כשנפגשים"). Left alone, the bidi algorithm moves
// punctuation and can reorder the English. Each English run is wrapped in a <bdi dir="ltr"> isolate at
// render time, so content files need no invisible control characters (research C3, R2 and R5).
// The isolate holds the English and what belongs to it: its own ? ! and ... and the quote marks or
// brackets around it. What joins it to the Hebrew stays outside and follows the Hebrew direction: a
// prefix hyphen (ב-am), a colon or comma, " = " before a Hebrew translation, and the Hebrew sentence's
// final full stop.
// Round 3 (BL-1): IPA is English too, so "/ɪz/" is one token and never "/ɪ" + "z/"; a sound and its example word
// ("/æ/ (cat)") stay in one isolate; a run of several English sentences gets one isolate per sentence, each with
// its own full stop, so no isolate carries two sentences across a line end; a Hebrew list number after an English
// sentence ("chill. 3) Chill!") stays with the Hebrew; and short isolates do not wrap (class "nw").
const HEBREW = /[֐-׿יִ-ﭏ]/;
// English letters: the Latin script (with é and the IPA letters ɪ æ ʌ ɒ ə ʃ ʒ ŋ ð), the Greek θ used in IPA,
// and the IPA length and stress marks ː ˈ ˌ.
const L = '\\p{Script=Latin}θːˈˌ';
const LETTER = new RegExp(`[${L}]`, 'u');
const WORD_CHAR = new RegExp(`[${L}0-9\\p{M}]`, 'u');
// A run of text that holds English: no Hebrew letters and no right-to-left mark. Content puts U+200F between two
// English runs that belong to different parts of the Hebrew sentence ("/æ/ (cat), ‏/ʌ/ (cut)").
const NOT_HE = '[^\\u0590-\\u05FF\\uFB1D-\\uFB4F\\u200F]';
const RUN = new RegExp(`${NOT_HE}*[${L}]${NOT_HE}*`, 'gu');
const CLOSER = { '"': '"', "'": "'", '“': '”', '‘': '’', '(': ')', '[': ']' };
const ABBREV = /(?:\.[A-Za-z]|^(?:Mr|Mrs|Ms|Dr|St|etc|vs|approx))$/i;
// English pieces of this many characters or fewer are kept on one line (the "nw" unit below). Round 4 (SB-3): 30, so
// a short quote inside a Hebrew paragraph ("Yes, I've been there twice") is not cut in half.
export const NOWRAP_MAX = 30;

// Round 4 (SB-2): an English sentence that ends the text (or its line) keeps its own full stop. Left outside the
// isolate, a full stop at the end of a right-to-left line is drawn at the English's left, so a wrapped line read
// ".I work in a bank". A sentence is two words or more (a slash list such as "am/is/are" counts its words), or one
// capitalised word ("Maya"). A spelled name ("K-O-H-E-N") is not a sentence: the full stop after it is the Hebrew's.
const isSentence = (t) => t.trim().split(/[\s/]+/).filter(Boolean).length >= 2 || /^\p{Lu}[\p{L}'’]*\p{L}$/u.test(t.trim());
// A lone token of up to three characters ("I", "go", "/ɪ/") before a question mark is the subject of a Hebrew
// question ("זה E או I?"): the question mark is the Hebrew sentence's.
const loneToken = (t) => /^\S{1,3}$/u.test(t) && [...t].length <= 3;

// The [start, end) of the English inside one run of non-Hebrew text. `last`: the run ends the text.
function englishSpan(r, last = false) {
  let a = r.search(LETTER);
  while (a > 0 && /[0-9]/.test(r[a - 1])) a--;
  // The opening slash of an IPA token ("ב-/æ/", "/aɪ kən ˈswɪm/") belongs to it; the Hebrew prefix hyphen does not.
  if (r[a - 1] === '/' && r.indexOf('/', a) > a) a--;
  let b = r.length;
  while (b > a && !WORD_CHAR.test(r[b - 1])) b--;
  // ...and so does its closing slash, after a bracket if there is one ("/weə(r)/").
  const close = r.slice(b).match(/^[)\]]?\//);
  if (close && (r.slice(a, b).match(/\//g) || []).length % 2) b += close[0].length;
  // A list number after an English sentence is the Hebrew list's ("chill. 3) Chill!"): it stays outside, and
  // the sentence keeps its own full stop.
  const num = r.slice(a, b).match(/[.!?…]["'”’]?(\s+[0-9]+)$/);
  if (num) b -= num[1].length;
  let tail = r.slice(b).match(/^[?!.…]+/)?.[0] || '';
  const word = r.slice(a, b).match(/[A-Za-z.]+$/)?.[0] || '';
  const spans = sentenceSpans(r.slice(a, b));
  const lastSentence = r.slice(a, b).slice(spans.at(-1)[0]);
  // The full stop ends the text, or its line: only white space (and no Hebrew) follows it.
  const ends = tail === '.' && (/^\.[ \t]*\n/.test(r.slice(b)) || (last && /^\.\s*$/.test(r.slice(b))));
  if (/[^.]\.$|^\.$/.test(tail) && !ABBREV.test(word) && !(ends && isSentence(lastSentence))) tail = tail.slice(0, -1);
  if (tail === '?' && loneToken(r.slice(a, b))) tail = '';
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

// The sentences of one English span, as [start, end) pairs: a break after . ! ? or … (with a closing quote) and
// before a capital, optionally across " / " or " – " ("Yes, I am. / No, she isn't"). Never after an
// abbreviation (Mr., a.m.), and never where a bracket or quote pair would be split.
// A single full stop before a small letter ends a sentence too: in Hebrew text that is a new Hebrew sentence
// that starts with an English word ("on Fridays. on + יום"). An ellipsis before a small letter does not
// ("We live... and work...").
const SENTENCE_END = /[.!?…]+["'”’]?(?=(\s+(?:[/–—]\s+)?)["'“‘]?\p{Lu})|(?<![.…])\.["'”’]?(?=(\s+)\p{Ll})/gu;
export function sentenceSpans(t) {
  const out = [];
  let from = 0;
  for (const m of t.matchAll(SENTENCE_END)) {
    const end = m.index + m[0].length;
    const word = t.slice(from, m.index).match(/[A-Za-z.]+$/)?.[0] || '';
    if (/^\.(?!\.)/.test(m[0]) && ABBREV.test(word)) continue;
    const piece = t.slice(from, end);
    if (unpaired(piece).length || unpairedQuotes(piece)) continue;
    out.push([from, end]);
    from = end + (m[1] ?? m[2]).length;
  }
  out.push([from, t.length]);
  return out;
}
// A spelled word stays in one piece: the hyphens of "A-N-N-A" become non-breaking hyphens (U+2011), and
// "A, double N, A" takes no-break spaces, as does a short "letter = word" pair ("U = you", "Noa = N-O-A").
export const keepSpelled = (t) => t
  .replace(/(?<![A-Za-z])[A-Za-z](?:-[A-Za-z])+(?![A-Za-z])/g, (m) => m.replace(/-/g, '\u2011'))
  .replace(/(?<![A-Za-z])[A-Z](?:, (?:double )?[A-Z])+(?![A-Za-z])/g, (m) => m.replace(/ /g, '\u00a0'))
  .replace(/(?<![A-Za-z])([A-Za-z]{1,4}) = ([A-Za-z]{1,5})(?![A-Za-z])/g, '$1\u00a0=\u00a0$2');
// Round 4 (SB-3): inside a long isolate, an arrow pair of up to two words a side ("lie → lying", "I → am") is a
// unit that never breaks at the arrow.
const ARROW = /(?<![^\s(])((?:[\p{L}'’-]+ )?[\p{L}'’-]+ → [\p{L}'’-]+(?: (?![\p{L}'’-]+ →)[\p{L}'’-]+)?)(?![\p{L}'’-])/gu;
const arrows = (h) => h.replace(ARROW, '<span class="nw">$1</span>');
const bdi = (t, pairs = false) => `<bdi dir="ltr" lang="en">${pairs ? arrows(esc(keepSpelled(t))) : esc(keepSpelled(t))}</bdi>`;
// A short English piece (NOWRAP_MAX characters or fewer) is kept on one line by a unit (class "nw", an inline-block
// in app.css) that also holds what is attached to it with no space between: a Hebrew prefix ("ב-"), an opening
// bracket, the Hebrew full stop or comma after it. So the line never breaks inside the English or between the English
// and its punctuation, and a piece wider than the whole line still wraps inside its unit instead of pushing the
// page sideways at 150% text. (A plain white-space: nowrap did push narrow cards sideways.)
const unit = (lead, t, trail) => `<span class="nw">${esc(lead)}${bdi(t)}${esc(trail)}</span>`;
const short = (t) => [...t].length <= NOWRAP_MAX;

export function isolateLatin(text) {
  const s = String(text ?? '');
  if (!LETTER.test(s)) return s;
  // English with no Hebrew in a Hebrew slot is one isolate, sentence order and full stop included.
  if (!HEBREW.test(s)) return raw(short(s) ? unit('', s, '') : bdi(s));
  // The text as plain pieces (strings) and English pieces ({ t }).
  const parts = [];
  let last = 0;
  for (const [at, r] of englishRuns(s)) {
    const [a, b] = englishSpan(r, at + r.length === s.length);
    const t = r.slice(a, b);
    parts.push(s.slice(last, at + a));
    sentenceSpans(t).forEach(([x, y], i, all) => { parts.push({ t: t.slice(x, y) }); if (i < all.length - 1) parts.push(t.slice(y, all[i + 1][0])); });
    last = at + b;
  }
  parts.push(s.slice(last));
  // A short piece takes in the characters attached to it on both sides.
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (typeof p === 'string' || !short(p.t)) continue;
    if (typeof parts[i - 1] === 'string') { p.lead = parts[i - 1].match(/\S*$/)[0]; parts[i - 1] = parts[i - 1].slice(0, parts[i - 1].length - p.lead.length); }
    // A letter and its Hebrew name ("A = אֵיי") stay together too (SB-3).
    if (typeof parts[i + 1] === 'string') { p.trail = parts[i + 1].match(/^(?: = [\u0590-\u05FF\uFB1D-\uFB4F]+(?=\s|$|[.,;:!?)]))?\S*/)[0]; parts[i + 1] = parts[i + 1].slice(p.trail.length); }
  }
  return raw(parts.map((p) => (typeof p === 'string' ? esc(p) : short(p.t) ? unit(p.lead || '', p.t, p.trail || '') : bdi(p.t, true))).join(''));
}
// The runs of non-Hebrew text that hold English, as [offset, text]. A bracket whose partner is outside the
// run (in the Hebrew: "Eilat. (he, she, it – בשיעור הבא.)") splits it, so the bracket stays with the Hebrew
// and the bidi algorithm pairs it with its partner there.
// Round 4 (SB-3): a run is also split where the Hebrew sentence goes on between two English pieces. A list of
// letters or short words ("I, G" in "E ו-I, G ו-J", "s, I" in "בלי s, I גדולה") is split at each comma, so every
// piece is its own isolate and the list's commas stay Hebrew. After a Hebrew prefix, "y: lie → lying" is split at
// the colon, so the prefix's isolate holds only its own token ("ל-y") and the hyphen never touches "lying".
const LIST_ITEM = /^-?[A-Za-z]{1,3}[.?!…]*$/;
function leaves(r, at, s, out) {
  const items = r.split(', ');
  if (items.length > 1 && items.every((x) => LIST_ITEM.test(x.trim()))) {
    let from = 0;
    for (const x of items) { if (LETTER.test(x)) out.push([at + from, x]); from += x.length + 2; }
    return;
  }
  const colon = HEBREW.test(s[at - 1] || '') && r.match(/^-[^\s:]+(?=: [A-Za-z])/);
  if (colon) { out.push([at, colon[0]]); leaves(r.slice(colon[0].length + 1), at + colon[0].length + 1, s, out); return; }
  out.push([at, r]);
}
function englishRuns(s) {
  const out = [];
  const split = (r, at) => {
    const cuts = unpaired(r);
    if (!cuts.length) { if (LETTER.test(r)) leaves(r, at, s, out); return; }
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
// Round 3 (BL-3): at "full" support (Pre-A1 and A1) the Hebrew leads. Instructions and explanations are meta-text,
// so their Hebrew is the first and primary line ("bi-he primary") and the English follows in a quieter ink. An
// explanation paragraph (fold) shows its Hebrew only, with the English one tap away ("EN", the mirror of "בעברית"
// at partial). English target content (examples, options, passages, tables) does not go through bi() and stays
// primary at every level. The app's one reveal listener (app.js, [data-reveal-he]) opens the next sibling.
export const FOLD_WORDS = 24;
const longText = (en) => String(en || '').split(/\s+/).filter(Boolean).length > FOLD_WORDS;
export function bi(obj, { always = false, fold = false } = {}) {
  if (!obj) return '';
  if (typeof obj === 'string') return html`<span lang="en" dir="ltr">${obj}</span>`;
  if (support === 'full' && obj.he) {
    const he = html`<span class="bi-he primary" lang="he" dir="rtl">${isolateLatin(obj.he)}</span>`;
    return fold
      ? html`<span class="bi he-first">${he}<button type="button" class="he-reveal he-reveal-text en-reveal" data-reveal-he aria-expanded="false" lang="en">EN<span class="sr-only" lang="${lang}"> ${tt('– להצגת הפסקה באנגלית', '– show this paragraph in English')}</span></button><span class="bi-en" lang="en" dir="ltr" hidden>${spelled(obj.en)}</span></span>`
      : html`<span class="bi he-first">${he}<span class="bi-en" lang="en" dir="ltr">${spelled(obj.en)}</span></span>`;
  }
  const folded = Boolean(obj.he) && fold && !always && support === 'partial' && longText(obj.en);
  const showHe = obj.he && !folded && (always || support === 'partial');
  const hidden = html`<span class="bi-he bi-he-after" lang="he" dir="rtl" hidden>${isolateLatin(obj.he)}</span>`;
  // One label for every Hebrew chip, on its own line under the English (BL-5): "בעברית" ("Hebrew" in the English UI).
  const chip = (cls, sr) => html`<button type="button" class="${cls}" data-reveal-he aria-expanded="false" lang="${lang}">${tt('בעברית', 'Hebrew')}<span class="sr-only"> ${sr}</span></button>${hidden}`;
  return html`<span class="bi"><span class="bi-en" lang="en" dir="ltr">${spelled(obj.en)}</span>${showHe ? html`<span class="bi-he bi-he-after" lang="he" dir="rtl">${isolateLatin(obj.he)}</span>` : ''}${folded
    ? chip('he-reveal he-reveal-text', tt('– להצגת הפסקה בעברית', '– show this paragraph in Hebrew'))
    : !showHe && obj.he ? chip('he-reveal', tt('– להצגת ההסבר בעברית', '– show the explanation in Hebrew')) : ''}</span>`;
}
