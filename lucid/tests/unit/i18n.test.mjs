import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolateLatin, legend } from '../../js/core/i18n.js';

const B = (s) => `<bdi dir="ltr" lang="en">${s}</bdi>`;
const iso = (s) => String(isolateLatin(s));

test('Latin runs inside Hebrew are isolated; punctuation around them stays Hebrew', () => {
  assert.equal(iso('אומרים "What\'s up?" כשנפגשים'), `אומרים ${B('&quot;What&#39;s up?&quot;')} כשנפגשים`);
  assert.equal(iso('עם he, she, it משתמשים ב-is.'), `עם ${B('he, she, it')} משתמשים ב-${B('is')}.`);
  assert.equal(iso('הצורה (I am) מלאה'), `הצורה ${B('(I am)')} מלאה`);
  assert.equal(isolateLatin('רק עברית'), 'רק עברית');
  assert.ok(!iso('<script> בדיקה').includes('<script>'), 'escapes markup');
});

// Persona panel P-19, P-47, P-55: the strings that rendered scrambled.
test('the English keeps its own ? ! and ..., the Hebrew keeps its separators and final full stop', () => {
  // A full stop that ends the Hebrew sentence stays outside, so it lands at the Hebrew end of the line.
  assert.equal(iso('באנגלית יש לזה צורה נפרדת: I work every day, אבל I\'m working at the moment.'),
    `באנגלית יש לזה צורה נפרדת: ${B('I work every day')}, אבל ${B('I&#39;m working at the moment')}.`);
  // "?" belongs to the English; " = '" and the Hebrew quote stay with the Hebrew.
  assert.equal(iso('דרך נפוצה להזמין: Can I get a large coffee? = \'אפשר לקבל קפה גדול?\'.'),
    `דרך נפוצה להזמין: ${B('Can I get a large coffee?')} = &#39;אפשר לקבל קפה גדול?&#39;.`);
  assert.equal(iso('משהו מבאס. What a bummer! = \'איזה באסה!\''), `משהו מבאס. ${B('What a bummer!')} = &#39;איזה באסה!&#39;`);
  assert.equal(iso('או פשוט Bummer!.'), `או פשוט ${B('Bummer!')}.`);
  // A Hebrew prefix hyphen stays with the Hebrew word.
  assert.equal(iso('משתמשים ב-am/is/are ובפועל עם ing.'), `משתמשים ב-${B('am/is/are')} ובפועל עם ${B('ing')}.`);
  assert.equal(iso('תאייתו: K-O-H-E-N.'), `תאייתו: ${B('K-O-H-E-N')}.`);
  // Ellipses, abbreviations and numbers attached to a word stay inside.
  assert.equal(iso('אפשר גם Could I have...?, I\'d like..., please.'), `אפשר גם ${B('Could I have...?, I&#39;d like..., please')}.`);
  assert.equal(iso('בשעה 7 a.m. בבוקר'), `בשעה 7 ${B('a.m.')} בבוקר`);
  assert.equal(iso('בקומה 2nd floor'), `בקומה ${B('2nd floor')}`);
  assert.equal(iso('Present perfect או עבר פשוט?'), `${B('Present perfect')} או עבר פשוט?`);
});

test('English-only text in a Hebrew slot is isolated whole', () => {
  assert.equal(iso('Have you ever...?'), B('Have you ever...?'));
  assert.equal(iso('English only'), B('English only'));
});

test('a legend leaves out a "Hebrew" line that is not Hebrew', () => {
  assert.ok(!String(legend('Have you ever...?', 'Have you ever...?')).includes('l-he'));
  assert.ok(!String(legend('Enjoy doing, want to do', 'enjoy doing / want to do')).includes('l-he'));
  assert.ok(String(legend('The verb be', 'הפועל be')).includes(`הפועל ${B('be')}`));
});

// Persona round 2, R2-01: a bracket pair is never split by the English isolate (the strings from the report).
test('bracket pairs stay together: both inside the English, or both with the Hebrew', () => {
  assert.equal(iso('שתי אותיות זהות ברצף = double (A, double N, A).'), `שתי אותיות זהות ברצף = ${B('double (A, double N, A)')}.`);
  assert.equal(iso('לסדר משתמשים ב-third (3rd), לא ב-three.'), `לסדר משתמשים ב-${B('third (3rd)')}, לא ב-${B('three')}.`);
  assert.equal(iso('on + יום (on Monday), at + שעה (at six o\'clock)...'), `${B('on')} + יום ${B('(on Monday), at')} + שעה ${B('(at six o&#39;clock)')}...`);
  assert.equal(iso('ל-fif (fifteen, fifty)'), `ל-${B('fif (fifteen, fifty)')}`);
  assert.equal(iso('the book (that) I read (ולא the book that I read it)'), `${B('the book (that) I read')} (ולא ${B('the book that I read it')})`);
  // A pair that opens in English and closes in Hebrew: both brackets stay outside, so they pair in the Hebrew.
  assert.equal(iso('I work. They live in Eilat. (he, she, it – בשיעור הבא.)'), `${B('I work. They live in Eilat')}. (${B('he, she, it')} – בשיעור הבא.)`);
  assert.equal(iso('[my friend, הוא חבר שלי]'), `[${B('my friend')}, הוא חבר שלי]`);
});

test('no isolate ever holds half of a bracket pair', async () => {
  const { unpaired } = await import('../../js/core/i18n.js');
  const strings = ['רוב הפעלים + s (buy → buys, כי לפני ה-y יש תנועה).', 'new ↔ old (לדברים). ‏noisy ↔ quiet (q-u-i-e-t; ‏quite פירושו \'די\').', 'אל תשמיטו את be: ‏The house was built in 1950 (ולא The house built in 1950 – שמשמעו שהבית בנה משהו!).', '(a (b) c) עברית (d [e) f]'];
  for (const s of strings) {
    for (const m of iso(s).matchAll(/<bdi dir="ltr" lang="en">(.*?)<\/bdi>/g)) assert.deepEqual(unpaired(m[1]), [], `${s} -> ${m[1]}`);
  }
});

// R2-06: 'auto' support follows the level the learner has shown, never above the course level.
test('"By level" Hebrew support follows the level shown, not the level the course starts at', async () => {
  const { supportLevel, setHebrewSupport, hebrewSupport } = await import('../../js/core/i18n.js');
  globalThis.document ??= { documentElement: { dataset: {} } };
  assert.equal(supportLevel('B1', 'A2'), 'A2', 'placement showed A2 and starts at B1');
  assert.equal(supportLevel('B1', 'B1'), 'B1');
  assert.equal(supportLevel('A2', 'B2'), 'A2', 'never above the course level');
  assert.equal(supportLevel('B1', null), 'B1', 'nothing shown yet: the course level');
  setHebrewSupport('auto', 'B1', 'A2');
  assert.equal(hebrewSupport(), 'partial');
  setHebrewSupport('auto', 'B1', 'B1');
  assert.equal(hebrewSupport(), 'minimal');
  setHebrewSupport('full', 'C1', 'C1');
  assert.equal(hebrewSupport(), 'full', 'a chosen setting wins');
});

// R1-D10: at "partial" a long explanation paragraph is not doubled; its Hebrew is one tap away.
test('partial support folds the Hebrew of a long paragraph behind "בעברית"; short lines stay doubled', async () => {
  const { bi, setHebrewSupport } = await import('../../js/core/i18n.js');
  const long = { en: 'We use the present continuous for actions happening now, at the moment of speaking, and for temporary situations that are true around now but not always, such as a project this week.', he: 'משתמשים בהווה מתמשך לפעולות שקורות עכשיו.' };
  const short = { en: 'Use am, is or are.', he: 'משתמשים ב-am, is או are.' };
  setHebrewSupport('partial');
  const folded = String(bi(long, { fold: true }));
  assert.match(folded, /data-reveal-he aria-expanded="false" lang="he">בעברית/);
  assert.match(folded, /dir="rtl" hidden>/, 'the Hebrew waits behind the button');
  assert.doesNotMatch(String(bi(short, { fold: true })), /hidden|data-reveal-he/, 'a short line keeps its Hebrew');
  assert.doesNotMatch(String(bi(long)), /hidden/, 'only explanation paragraphs fold');
  setHebrewSupport('full');
  assert.doesNotMatch(String(bi(long, { fold: true })), /hidden/, 'full support shows it all');
  setHebrewSupport('minimal');
  assert.match(String(bi(long, { fold: true })), />עב</, 'minimal keeps its "עב" button');
});

test('straight quote pairs stay together inside the English isolate', async () => {
  const { isolateLatin, unpairedQuotes } = await import('../../js/core/i18n.js');
  const isolates = (t) => [...String(isolateLatin(t)).replace(/&#39;/g, "'").matchAll(/<bdi dir="ltr" lang="en">(.*?)<\/bdi>/g)].map((m) => m[1]);
  for (const t of [
    "לשלב אותו בתוך משפט ארוך: 'It was my bad that we were late'. My bad עובד כתגובה קצרה.",
    "לשכוח את a: 'It's not big deal'. נכון: It's no big deal.",
    "להשתמש ב-gonna לתנועה: 'I'm gonna the gym'. gonna בא רק לפני פועל.",
    "כעצה: 'Take it easy this week; you've been sick.' take it easy on someone פירושו להתייחס בעדינות.",
  ]) for (const i of isolates(t)) assert.equal(unpairedQuotes(i), 0, `half a quote pair in "${i}"`);
  assert.equal(unpairedQuotes("It's fine"), 0, 'apostrophes are not quotes');
});
