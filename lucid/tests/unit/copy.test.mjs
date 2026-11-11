// Hebrew microcopy check (round 3, BL-8; the rules are in docs/ux/hebrew-microcopy.md).
// It scans the Hebrew string literals in js/ for two things the glossary rules out:
//   - singular address in instructions, possessives and the learner's own past actions: שלך, אליך, בחרת, סיימת,
//     עשית, נכנסת לחשבון, בשבילך ... (the plural is שלכם, אליכם, בחרתם, סיימתם);
//   - 'חזרה' used as a "back" label ('חזרה' means word review only; going back is 'הקודם' or the destination,
//     'להיום').
// ALLOW once listed the known hits per file; since the launch proofread it is empty, so any hit fails.
// The launch proofread (HE-03 to HE-24) also left a list of phrases that must not come back (PROOFREAD below).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HE = /[֐-׿]/;
// A word on its own (no Hebrew letter right before or after it), with or without the prefixes ו, ש, כש (וסיימת,
// שסיימת, כשסיימת).
const word = (w, after = '', prefix = 'ו?(?:ש|כש)?') => new RegExp(`(?<![א-ת])${prefix}(?:${w})(?![א-ת])${after}`, 'g');
// Singular address. Launch (HE-25): beyond the possessives, the singular past tense of the learner's own actions
// (סיימת, עשית, השלמת, נכנסת, יצאת, ...) and בשבילך / לך / אתה. 'השלמת' is also the noun "completion" (השלמת מילים)
// and 'נכנסת' the present tense "enters" (המילה נכנסת לחזרה), so those two count only in their "you did" use.
export const SINGULAR = [
  ['שלך', word('שלך')], ['אליך', word('אליך')], ['בחרת', word('בחרת')],
  ['בשבילך', word('בשבילך')], ['לך', word('לך', '', 'ו?')], ['אתה', word('אתה')], ['אותך', word('אותך')], ['עליך', word('עליך')],
  ['סיימת', word('סיימת')], ['עשית', word('עשית')], ['יצאת', word('יצאת')], ['כתבת', word('כתבת')], ['ענית', word('ענית')],
  ['פספסת', word('פספסת')], ['למדת', word('למדת')], ['שלחת', word('שלחת')],
  ['השלמת', word('השלמת', '(?=\\s+את(?![א-ת])|\\s*[.,:;!?)]|\\s*$)')], ['נכנסת', word('נכנסת', '(?=\\s+לחשבון)')],
];
export const singularHits = (he) => SINGULAR.flatMap(([w, re]) => { const n = (he.match(re) || []).length; return n ? [[w, n]] : []; });

function files(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : []; });
}
// String literals ('…', "…", `…`) that hold Hebrew, in source order, each with the literal right after it when the
// two are a Hebrew/English pair (tt('…', '…') or a STRINGS entry). A template literal's text is its fixed parts; the
// code inside its ${…} is scanned too, so a tt('…', '…') inside an html`` template counts on its own.
export function hebrewLiterals(src) {
  const lits = [];
  let i = 0;
  let prev = '';
  const readQuoted = (q) => {
    const start = i++;
    let t = '';
    while (i < src.length && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') { t += src.slice(i, i + 2); i += 2; } else t += src[i++]; }
    i++;
    lits.push({ text: t, start, end: i });
  };
  const readTemplate = () => {
    const start = i++;
    let t = '';
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { t += src.slice(i, i + 2); i += 2; }
      else if (src[i] === '$' && src[i + 1] === '{') { i += 2; code(true); t += ' '; }
      else t += src[i++];
    }
    i++;
    lits.push({ text: t, start, end: i });
  };
  const readRegex = () => {
    i++;
    let cls = false;
    while (i < src.length && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) break;
      i++;
    }
    i++;
  };
  function code(inside) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "'" || c === '"') { readQuoted(c); prev = 'x'; }
      else if (c === '`') { readTemplate(); prev = 'x'; }
      else if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; }
      else if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; }
      else if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || /\b(?:return|typeof|case)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd()))) { readRegex(); prev = 'x'; }
      else if (c === '{') { depth++; i++; prev = c; }
      else if (c === '}') { if (inside && depth === 0) { i++; return; } depth--; i++; prev = c; }
      else { if (!/\s/.test(c)) prev = /[\w$)\]]/.test(c) ? 'x' : c; i++; }
    }
  }
  code(false);
  lits.sort((a, b) => a.start - b.start);
  return lits.flatMap((l, k) => {
    if (!HE.test(l.text)) return [];
    const next = lits[k + 1];
    const paired = next && next.start >= l.end && /^\s*,\s*$/.test(src.slice(l.end, next.start));
    return [{ he: l.text, en: paired ? next.text : '' }];
  });
}
// 'חזרה' as a back label: 'חזרה ל…' / 'חזרה אל …' naming where to go, or 'חזרה' paired with an English "Back…".
// 'חזרה' as the name of word review ('Review') is the glossary's meaning and is not flagged.
export const isBackLabel = (he, en = '') => /^\s*חזרה\s+(?:ל|אל\s)/.test(he) || (/^\s*חזרה(?:\s|$)/.test(he) && /^\s*back\b/i.test(en));

export function scan(base = root) {
  const hits = {};
  const add = (file, word, n = 1) => { (hits[file] ??= {})[word] = (hits[file][word] || 0) + n; };
  for (const p of files(join(base, 'js'))) {
    const file = relative(base, p).split('\\').join('/');
    for (const { he, en } of hebrewLiterals(readFileSync(p, 'utf8'))) {
      for (const [word, n] of singularHits(he)) add(file, word, n);
      if (isBackLabel(he, en)) add(file, 'חזרה (back)');
    }
  }
  return hits;
}

// Hits on the day the check was added (round 3) were 58 in 21 files. The launch proofread (HE-04, HE-15, HE-16,
// HE-25) fixed the last of them, so nothing is allowed any more: a new singular or back-label slip fails at once.
const ALLOW = {};

test('BL-8: the copy check finds singular address and "חזרה" as a back label', () => {
  assert.deepEqual(hebrewLiterals("tt('בחרו את התשובה שלך', 'Pick') + \"שלכם\" + `אליך ${a}` + html`<a>${tt('חזרה להיום', 'Back to Today')}</a>`; const r = /['\"]/;"),
    [{ he: 'בחרו את התשובה שלך', en: 'Pick' }, { he: 'שלכם', en: '' }, { he: 'אליך  ', en: '' }, { he: 'חזרה להיום', en: 'Back to Today' }]);
  assert.ok(isBackLabel('חזרה', 'Back') && isBackLabel('חזרה להיום') && isBackLabel('חזרה אל המסלול'));
  assert.ok(!isBackLabel('חזרה', 'Review') && !isBackLabel('חזרה על מילים') && !isBackLabel('חזרות להיום') && !isBackLabel('זמן לחזרה'));
});

// ---------- Round 4, SB-7: one set of names for real-life English ----------
// The section is "אנגלית לחיים", one situation is a "תרחיש", the conversations hub is "שיחות תרגול" and small talk is
// "שיחת חולין". The retired names fail anywhere in js/ and content/real-life/.
// Launch (HE-10): the glossary also retired 'שיחות מובנות' ("scripted conversations") for 'שיחות תרגול'.
export const RETIRED = [['מצבים אמיתיים', /מצבים אמיתיים/g], ['סימולציות שיחה', /סימולציות שיחה/g], ['סמול טוק', /סמול טוק/g],
  ['שיחות מובנות', /שיח(?:ות|ה) (?:ה)?מובנ(?:ות|ה)(?![א-ת])/g]];
export function scanRetired(base = root) {
  const walk = (dir, ext) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : []; });
  const hits = [];
  for (const p of [...walk(join(base, 'js'), '.js'), ...walk(join(base, 'content', 'real-life'), '.json')]) {
    const file = relative(base, p).split('\\').join('/');
    const src = readFileSync(p, 'utf8');
    for (const [word, re] of RETIRED) { const n = (src.match(re) || []).length; if (n) hits.push({ file, word, n }); }
  }
  return hits;
}
test('SB-7: real-life English has one set of names (no "מצבים אמיתיים", "סימולציות שיחה", "סמול טוק" or "שיחות מובנות")', () => {
  // Every lane that renamed its files (TP-13, RW-11, PG-9) has merged: any hit fails.
  const fresh = scanRetired().map((h) => `${h.file}: ${h.word} ×${h.n}`);
  assert.deepEqual(fresh, [], `real-life names outside the glossary (docs/ux/hebrew-microcopy.md):\n${fresh.join('\n')}`);
});

test('BL-8: no new singular address or "חזרה" back label in the Hebrew UI', () => {
  const hits = scan();
  const size = Object.values(ALLOW).reduce((a, w) => a + Object.values(w).reduce((x, y) => x + y, 0), 0);
  console.log(`copy allowlist: ${size} known hits in ${Object.keys(ALLOW).length} files`);
  const fresh = [];
  for (const [file, words] of Object.entries(hits)) for (const [word, n] of Object.entries(words)) {
    const allowed = ALLOW[file]?.[word] || 0;
    if (n > allowed) fresh.push(`${file}: ${word} ×${n} (allowed ${allowed})`);
  }
  assert.deepEqual(fresh, [], `new copy outside the glossary (docs/ux/hebrew-microcopy.md):\n${fresh.join('\n')}`);
});

// ---------- Launch: the AI proofread of the Hebrew copy (HE-03 to HE-25) ----------
// This is an AI proofread, not the native-speaker review (LB-11). Each phrase below was fixed at launch; the checks
// keep it from coming back. UI phrases are matched in the Hebrew string literals of js/, lesson phrases in every
// Hebrew string of content/lessons/*.json and content/curriculum.json.
export const UI_PROOFREAD = [
  ['HE-05 "בנוח" takes no gender', /בנוח\/ה/],
  ['HE-08 "שאלה" (a question) for "שאלו" (these)', /ייתכן שאלה(?![א-ת])/],
  ['HE-09 the speech rate is "מהירות הקראה", feminine', /מהירות הדיבור|^(?:איטי|מהיר)$/],
  ['HE-10 the one AI-off sentence', /תכונות ה-AI|AI[^.]{0,40}עוד לא זמינ/],
  ['HE-11 "בשליטה", "תכתיב", "משימה"', /^ידוע(?:ה|ות)$|(?<![א-ת])הכתבה(?![א-ת])|(?<![א-ת])[הו]?מטל(?:ה|ות)(?![א-ת])/],
  ['HE-12 "בשני ימים שונים"', /ביומיים/],
  ['HE-13 the learner passed the check; "שיעור היום הושלם"', /בדיקת רמה\s+עברה|השלמת שיעור היום/],
  ['HE-14 "דילגתם", with no cause', /(?<![א-ת])דולג(?:ו|ה)?(?![א-ת])/],
  ['HE-16 "החשבון:" for a slash-form status', /מחובר\/ת כ-/],
  ['HE-20 unclear labels', /אנגלית בהגייה|נשמע\? לא נספר|לא אחת מהתשובות שלנו|^את כל התרגול מחדש$|סיימתם להיום · להיום$|דיוק כאן פותחים|השרת חוסם הסכמה לשיווק/],
  ['HE-22 one voice and form for statuses and buttons', /שפספסתי|^בוצעה · /],
  ['HE-23 a percentage, like its neighbour', /שלושה רבעים/],
  ['HE-24 "יומיום", "יומיומי"', /(?<![א-ת])יום-יום(?![א-ת])|יום-יומי(?!ים)/],
];
export const LESSON_PROOFREAD = [
  ['HE-17 "ב-X משתמשים", not "את X משתמשים"', /(?<![א-ת])את [A-Za-z][A-Za-z/' .…-]* משתמשים/],
  ['HE-17 "עדיף להשתמש ב…"; "שלוש הצורות"', /(?<![א-ת])עדיף את(?![א-ת])|כל השלוש(?![א-ת])/],
  ['HE-18 "ייגעו", the full spelling', /(?<![א-ת])יגעו(?![א-ת])/],
  ['HE-19 one description of /ɪ/', /קרובה ל'אֶ'/],
  // ("מסתיים ב-. או ! או ?" names the full stop itself, so only a comma right after the prefix counts.)
  ['HE-24 a Hebrew prefix with nothing after it', /(?<![א-ת])[בלמ]-,/],
  // An ASCII apostrophe used as a geresh inside a straight-quoted Hebrew fragment ('ג'י') reads as the closing quote.
  // The opening quote follows a space or a bracket and comes right before a Hebrew letter.
  ['HE-07/HE-24 geresh inside straight quotes', /(?<=^|[\s(])'[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7 ]*?[גזצ][\u0591-\u05C7]*'[\u05D0-\u05EA]/],
];
export function heStrings(v, key = '', out = []) {
  if (typeof v === 'string') { if (HE.test(v)) out.push({ key, text: v }); }
  else if (Array.isArray(v)) v.forEach((x) => heStrings(x, key, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) heStrings(x, k, out);
  return out;
}
export function scanProofread(base = root) {
  const hits = [];
  for (const p of files(join(base, 'js'))) {
    const file = relative(base, p).split('\\').join('/');
    for (const { he } of hebrewLiterals(readFileSync(p, 'utf8'))) {
      for (const [id, re] of UI_PROOFREAD) if (re.test(he)) hits.push(`${file}: ${id}: ${he.slice(0, 80)}`);
    }
  }
  const lessons = readdirSync(join(base, 'content', 'lessons')).filter((f) => f.endsWith('.json')).map((f) => `content/lessons/${f}`);
  for (const file of [...lessons, 'content/curriculum.json']) {
    for (const { key, text } of heStrings(JSON.parse(readFileSync(join(base, file), 'utf8')))) {
      for (const [id, re] of LESSON_PROOFREAD) if (re.test(text)) hits.push(`${file}: ${id}: ${text.slice(0, 80)}`);
      // HE-03: a lesson title addresses the learner in the plural or the slash form, never "אתה".
      if (key === 'title_he' && /(?<![א-ת])אתה(?![א-ת])/.test(text)) hits.push(`${file}: HE-03 title in the masculine singular: ${text}`);
    }
  }
  return hits;
}

test('HE-25: the singular check catches the past tense and בשבילך, and leaves the noun "השלמת" and "נכנסת" (enters) alone', () => {
  const hit = (he) => singularHits(he).map(([w]) => w);
  assert.deepEqual(hit('כמעט סיימת:'), ['סיימת']);
  assert.deepEqual(hit('עשית את כל השיעורים שמוכנים כרגע.'), ['עשית']);
  assert.deepEqual(hit('כבר השלמת את השיעור'), ['השלמת']);
  assert.deepEqual(hit('נכנסת לחשבון. ההתקדמות מסונכרנת.'), ['נכנסת']);
  assert.deepEqual(hit('האימייל אומת ונכנסת לחשבון.'), ['נכנסת']);
  assert.deepEqual(hit('כשסיימת את השיעור'), ['סיימת']);
  assert.deepEqual(hit('יצאת מהחשבון.'), ['יצאת']);
  assert.deepEqual(hit('המשפט הבא בשבילך'), ['בשבילך']);
  assert.deepEqual(hit('מאיפה אתה?'), ['אתה']);
  for (const ok of ['השלמת מילים', 'שאלון אוצר מילים, השלמת מילים', 'המילה נכנסת לחזרה', 'כמעט סיימתם:', 'נכנסתם לחשבון', 'המשפט הבא בשבילכם', 'מאיפה את/ה?', 'הלך'])
    assert.deepEqual(hit(ok), [], ok);
});

test('Launch proofread (HE-03 to HE-24): the fixed Hebrew phrases do not come back in js/ or the lessons', () => {
  const hits = scanProofread();
  assert.deepEqual(hits, [], `Hebrew the launch proofread fixed is back:\n${hits.join('\n')}`);
});

test('Launch proofread: single fixes the patterns above cannot see', async () => {
  const lesson = (id) => JSON.parse(readFileSync(join(root, 'content', 'lessons', `${id}.json`), 'utf8'));
  const all = (id) => heStrings(lesson(id)).map((s) => s.text);
  // HE-07: 'orange' ends in /dʒ/, so the Hebrew spelling ends in ג׳ (with a geresh), not a bare ג.
  assert.ok(all('pa1-07').some((s) => s.includes('an orange') && s.includes('ג׳')), 'pa1-07: the "an orange" note lacks the geresh');
  // HE-24: D has a dagesh like B and P; the warm-up names what the 26 are.
  assert.ok(all('pa1-01').includes('דִּי') && !all('pa1-01').includes('דִי'), 'pa1-01: D without a dagesh');
  assert.ok(all('pa1-01').some((s) => s.includes('נלמד את כל 26 האותיות')), 'pa1-01: "נלמד את כל 26" lacks its noun');
  // HE-10: the AI-off message is the glossary's one sentence (the UI starts in Hebrew).
  const { t, uiLang } = await import('../../js/core/i18n.js');
  assert.equal(uiLang(), 'he');
  assert.equal(t('ai.unavailable'), 'AI לא פעיל באתר הזה. כל השאר עובד.');
});
