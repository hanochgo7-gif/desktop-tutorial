import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolateLatin, legend } from '../../js/core/i18n.js';

const B = (s) => `<bdi dir="ltr" lang="en">${s}</bdi>`;
// The checks below are about where an isolate starts and ends; the no-wrap class and the no-break characters of
// spelled words have their own checks (round 3, BL-1), so they are folded away here.
const NBH = String.fromCodePoint(0x2011), NBSP = String.fromCodePoint(0xa0);
const unwrap = (h) => h.replace(/<span class="nw">(.*?)<\/span>/g, '$1');
const plain = (h) => unwrap(h).replaceAll(NBH, '-').replaceAll(NBSP, ' ');
const iso = (s) => plain(String(isolateLatin(s)));

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
  assert.ok(plain(String(legend('The verb be', 'הפועל be'))).includes(`הפועל ${B('be')}`));
});

// Persona round 2, R2-01: a bracket pair is never split by the English isolate (the strings from the report).
test('bracket pairs stay together: both inside the English, or both with the Hebrew', () => {
  assert.equal(iso('שתי אותיות זהות ברצף = double (A, double N, A).'), `שתי אותיות זהות ברצף = ${B('double (A, double N, A)')}.`);
  assert.equal(iso('לסדר משתמשים ב-third (3rd), לא ב-three.'), `לסדר משתמשים ב-${B('third (3rd)')}, לא ב-${B('three')}.`);
  assert.equal(iso('on + יום (on Monday), at + שעה (at six o\'clock)...'), `${B('on')} + יום ${B('(on Monday), at')} + שעה ${B('(at six o&#39;clock)')}...`);
  assert.equal(iso('ל-fif (fifteen, fifty)'), `ל-${B('fif (fifteen, fifty)')}`);
  assert.equal(iso('the book (that) I read (ולא the book that I read it)'), `${B('the book (that) I read')} (ולא ${B('the book that I read it')})`);
  // A pair that opens in English and closes in Hebrew: both brackets stay outside, so they pair in the Hebrew.
  // (Round 3: each English sentence is its own isolate.)
  assert.equal(iso('I work. They live in Eilat. (he, she, it – בשיעור הבא.)'), `${B('I work.')} ${B('They live in Eilat')}. (${B('he, she, it')} – בשיעור הבא.)`);
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
  assert.doesNotMatch(String(bi(long, { fold: true })), /dir="rtl" hidden/, 'full support never hides the Hebrew (BL-3 folds the English instead)');
  setHebrewSupport('minimal');
  assert.match(String(bi(long, { fold: true })), />בעברית<span class="sr-only">/, 'minimal keeps a Hebrew button, with the same label as partial (BL-5)');
  assert.doesNotMatch(String(bi(long, { fold: true })), />עב</, 'no "עב" label any more');
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

// ---------- Round 3, BL-1: the panel strings, one isolate per English piece ----------
// Where each isolate starts and ends, with the no-break characters of spelled words kept. N() marks an isolate of
// 20 characters or fewer (kept on one line by its "nw" unit, checked on its own below), W() a longer one.
const N = (s) => `<bdi dir="ltr" lang="en">${s}</bdi>`;
const W = N;
const exact = (s) => unwrap(String(isolateLatin(s)));

test('BL-1: IPA tokens are English, slashes included (student-44, teacher-special-ed)', () => {
  assert.equal(exact('אני יודע/ת להגות את הסיומת כ-/s/, /z/ או /ɪz/: works, lives, watches.'),
    `אני יודע/ת להגות את הסיומת כ-${N('/s/, /z/')} או ${W('/ɪz/: works, lives, watches')}.`);
  assert.equal(exact('הגייה: /s/ ב-works, /z/ ב-lives, /ɪz/ ב-watches.'),
    `הגייה: ${N('/s/')} ב-${N('works, /z/')} ב-${N('lives, /ɪz/')} ב-${N('watches')}.`);
  assert.equal(exact('באנגלית יש שתיים: קצרה /ɪ/ וארוכה /iː/ ... ב-live התנועה קצרה /lɪv/'),
    `באנגלית יש שתיים: קצרה ${N('/ɪ/')} וארוכה ${N('/iː/')} ... ב-${N('live')} התנועה קצרה ${N('/lɪv/')}`);
  assert.equal(exact('works מסתיים ב-/s/: /wɜːks/ – הברה אחת.'), `${N('works')} מסתיים ב-${N('/s/: /wɜːks/')} – הברה אחת.`);
  // IPA with spaces or a bracket keeps both slashes.
  assert.equal(exact('אומרים I can swim /aɪ kən ˈswɪm/ בלי הפסקה.'), `אומרים ${W('I can swim /aɪ kən ˈswɪm/')} בלי הפסקה.`);
  assert.equal(exact('המילה where /weə(r)/ קצרה.'), `המילה ${N('where /weə(r)/')} קצרה.`);
  assert.equal(exact('הצליל /θ/ מופיע ב-third.'), `הצליל ${N('/θ/')} מופיע ב-${N('third')}.`);
});

test('BL-1: a sound and its example word stay together; a right-to-left mark separates two pairs (teacher-adult-efl)', () => {
  assert.equal(exact("באנגלית יש /æ/ (cat), \u200F/ʌ/ (cut) ו-/e/ (bet). ב-/æ/ פותחים את הפה."),
    `באנגלית יש ${N('/æ/ (cat)')}, \u200F${N('/ʌ/ (cut)')} ו-${N('/e/ (bet)')}. ב-${N('/æ/')} פותחים את הפה.`);
  // With no mark between them the pairs share one isolate, in order: never "/æ/" apart from "(cat)".
  assert.equal(exact('באנגלית יש /æ/ (cat), /ʌ/ (cut) ו-/e/ (bet).'), `באנגלית יש ${N('/æ/ (cat), /ʌ/ (cut)')} ו-${N('/e/ (bet)')}.`);
  assert.equal(exact('th: לשון בין השיניים (think, this). \u200Fw: שפתיים מעוגלות (wet). \u200Fv: שיניים על השפה (vet).'),
    `${N('th')}: לשון בין השיניים ${N('(think, this)')}. \u200F${N('w')}: שפתיים מעוגלות ${N('(wet)')}. \u200F${N('v')}: שיניים על השפה ${N('(vet)')}.`);
});

test('BL-1: several English sentences get one isolate each, with their own full stops (ux-research, design-visual)', () => {
  assert.equal(exact("שאלה: Are you working? שלילה: I'm not working. תשובה קצרה: Yes, I am. / No, she isn't."),
    `שאלה: ${N('Are you working?')} שלילה: ${N('I&#39;m not working')}. תשובה קצרה: ${N('Yes, I am.')} / ${N('No, she isn&#39;t')}.`);
  assert.equal(exact("אני יודע/ת לבנות שלילה עם don't ו-doesn't: I don't eat meat. She doesn't work on Fridays."),
    `אני יודע/ת לבנות שלילה עם ${N('don&#39;t')} ו-${W('doesn&#39;t: I don&#39;t eat meat.')} ${W('She doesn&#39;t work on Fridays')}.`);
  assert.equal(exact("דניאל כותב: I'm a nurse. I work at night."), `דניאל כותב: ${N('I&#39;m a nurse.')} ${N('I work at night')}.`);
  assert.equal(exact('נכון, אבל כדאי לשאול בחזרה: Fine, thanks. How are you?'), `נכון, אבל כדאי לשאול בחזרה: ${N('Fine, thanks.')} ${N('How are you?')}`);
  // A Hebrew sentence that starts with an English word after a full stop.
  assert.equal(exact('בימים: on Mondays, on Fridays. on + יום + s פירושו בכל שבוע.'), `בימים: ${W('on Mondays, on Fridays.')} ${N('on')} + יום + ${N('s')} פירושו בכל שבוע.`);
  // Not after an abbreviation, an ellipsis before a small letter, or inside a quote.
  assert.equal(exact('כתוב: from 9 a.m. to 2 p.m. בכל יום.'), `כתוב: ${W('from 9 a.m. to 2 p.m.')} בכל יום.`);
  assert.equal(exact('אומרים: Mr. Cohen is here. He is early.'), `אומרים: ${N('Mr. Cohen is here.')} ${N('He is early')}.`);
  assert.equal(exact('התבנית: We live... and work... ביחד.'), `התבנית: ${W('We live... and work...')} ביחד.`);
  assert.equal(exact("בצ'אט: 'Don't go. It's late.' – מאוחר."), `בצ&#39;אט: ${W('&#39;Don&#39;t go. It&#39;s late.&#39;')} – מאוחר.`);
  // English with no Hebrew is one isolate, so its sentences never swap places in a right-to-left line.
  assert.equal(exact('I work. They live in Eilat.'), W('I work. They live in Eilat.'));
});

test('BL-1: a list number stays outside the English (design-visual: Expressions "Chill")', () => {
  const chill = "1) (פועל) לנוח, להירגע: We just chilled at home (סתם עשינו צ'יל בבית). 2) (תואר) רגוע, זורם: My manager is really chill. 3) Chill! או Chill out! = 'תירגעו!'";
  assert.equal(exact(chill), `1) (פועל) לנוח, להירגע: ${W('We just chilled at home')} (סתם עשינו צ&#39;יל בבית). 2) (תואר) רגוע, זורם: ${W('My manager is really chill.')} 3) ${N('Chill!')} או ${N('Chill out!')} = &#39;תירגעו!&#39;`);
  for (const m of exact(chill).matchAll(/<bdi[^>]*>(.*?)<\/bdi>/g)) assert.doesNotMatch(m[1], /(^\d|\s\d+\)?$)/, `a number inside "${m[1]}"`);
  // A number that belongs to the English sentence stays in it.
  assert.equal(exact('אומרים: I was born in 2009.'), `אומרים: ${N('I was born in 2009')}.`);
  assert.equal(exact('בשעה 7 a.m. בבוקר'), `בשעה 7 ${N('a.m.')} בבוקר`);
});

test('BL-1: a spelled name stays in one piece (teacher-adult-efl, student-58)', () => {
  assert.equal(exact('תאייתו: A-N-N-A.'), `תאייתו: ${N(`A${NBH}N${NBH}N${NBH}A`)}.`);
  assert.equal(exact('תאייתו: K-O-H-E-N.'), `תאייתו: ${N(`K${NBH}O${NBH}H${NBH}E${NBH}N`)}.`);
  const anna = exact('כשיש שתי אותיות זהות ברצף אומרים double: Anna = A, double N, A. כדי לשאול, אומרים: How do you spell that?');
  assert.ok(anna.includes(`Anna${NBSP}=${NBSP}A,${NBSP}double${NBSP}N,${NBSP}A`), anna);
  assert.ok(anna.includes(N('How do you spell that?').replace(' class="nw"', '')) || anna.includes(W('How do you spell that?')), anna);
  const why = exact('עוד אותיות שנשמעות כמו מילים: U = you, C = see, R = are. בהודעות כותבים u.');
  assert.ok(why.includes(`U${NBSP}=${NBSP}you, C${NBSP}=${NBSP}see, R${NBSP}=${NBSP}are`), why);
  // Hyphenated words are not spelled names.
  assert.equal(exact('אומרים e-mail ו-T-shirt.'), `אומרים ${N('e-mail')} ו-${N('T-shirt')}.`);
});

test('BL-1: a short isolate is one unit with what is attached to it; a long one may wrap (20 characters)', () => {
  const U = (lead, t, trail) => `<span class="nw">${lead}<bdi dir="ltr" lang="en">${t}</bdi>${trail}</span>`;
  const raw = (s) => String(isolateLatin(s));
  assert.equal(raw('אומרים Twenty characters ok.'), `אומרים ${U('', 'Twenty characters ok', '.')}`);
  assert.equal(raw('אומרים Twenty-one characters.'), `אומרים <bdi dir="ltr" lang="en">Twenty-one characters</bdi>.`);
  // The Hebrew prefix, an opening bracket and the punctuation after it go into the unit, so no line starts with them.
  assert.equal(raw('הסיומת כ-/s/, /z/ או /ɪz/.'), `הסיומת ${U('כ-', '/s/, /z/', '')} או ${U('', '/ɪz/', '.')}`);
  assert.equal(raw('בסלנג (I\'m low-key nervous = לחוץ/ה).'), `בסלנג ${U('(', 'I&#39;m low-key nervous', '')} = לחוץ/ה).`);
  assert.equal(raw('תשובה קצרה: Yes, I am. / No, she isn\'t.'), `תשובה קצרה: ${U('', 'Yes, I am.', '')} / ${U('', 'No, she isn&#39;t', '.')}`);
  // English alone in a Hebrew slot.
  assert.equal(raw('Have you ever...?'), U('', 'Have you ever...?', ''));
});

test('BL-1: the warning and feedback lines from the panels read in order', () => {
  assert.equal(exact('לא מוסיפים am/is/are: I work in Holon, לא I am work. ולא מוסיפים s: They live, לא They lives.'),
    `לא מוסיפים ${W('am/is/are: I work in Holon')}, לא ${N('I am work')}. ולא מוסיפים ${N('s: They live')}, לא ${N('They lives')}.`);
  assert.equal(exact("נשמע גס וחסר סבלנות. אם אתם לחוצים בזמן, אפשר לומר: Sorry, I'm in a bit of a hurry."),
    `נשמע גס וחסר סבלנות. אם אתם לחוצים בזמן, אפשר לומר: ${W('Sorry, I&#39;m in a bit of a hurry')}.`);
  assert.equal(exact('אל תשמיטו את be: He is cooking, ולא He cooking.'), `אל תשמיטו את ${N('be: He is cooking')}, ולא ${N('He cooking')}.`);
  assert.equal(exact('אומרים I\'m 30 או I\'m 30 years old. \u200Fyears בלי old – שגוי.'),
    `אומרים ${N('I&#39;m 30')} או ${N('I&#39;m 30 years old')}. \u200F${N('years')} בלי ${N('old')} – שגוי.`);
});

// ---------- Round 3, BL-3: at full support the Hebrew meta-text leads ----------
test('BL-3: at full support the Hebrew line comes first as the primary line, the English follows', async () => {
  const { bi, setHebrewSupport } = await import('../../js/core/i18n.js');
  const prompt = { en: 'Match each letter to its name, written in Hebrew letters.', he: 'התאימו כל אות לשם שלה, כתוב באותיות עבריות.' };
  setHebrewSupport('full');
  const h = String(bi(prompt));
  assert.match(h, /^<span class="bi he-first"><span class="bi-he primary" lang="he" dir="rtl">התאימו/, 'Hebrew first, marked primary');
  assert.ok(h.indexOf('bi-he primary') < h.indexOf('class="bi-en"'), 'the English comes second');
  assert.doesNotMatch(h, /hidden|data-reveal-he/, 'a short instruction shows both lines');
  // An explanation paragraph shows the Hebrew and an "EN" chip, not both texts.
  const para = String(bi(prompt, { fold: true }));
  assert.match(para, /<button type="button" class="he-reveal[^"]*en-reveal" data-reveal-he aria-expanded="false" lang="en">EN<span class="sr-only"/);
  assert.match(para, /<span class="bi-en" lang="en" dir="ltr" hidden>Match each letter/, 'the English waits behind "EN"');
  assert.doesNotMatch(para, /class="bi-he[^"]*"[^>]*hidden/, 'the Hebrew is never hidden at full');
  // Without Hebrew there is nothing to lead with: English only, as before.
  assert.equal(String(bi({ en: 'Listen.' })), '<span class="bi"><span class="bi-en" lang="en" dir="ltr">Listen.</span></span>');
});

test('BL-3: A2 (partial) and B1 (minimal) render as before', async () => {
  const { bi, setHebrewSupport } = await import('../../js/core/i18n.js');
  const x = { en: 'Use am, is or are.', he: 'משתמשים ב-am, is או are.' };
  setHebrewSupport('partial');
  assert.match(String(bi(x)), /^<span class="bi"><span class="bi-en" lang="en" dir="ltr">Use am, is or are.<\/span><span class="bi-he bi-he-after" lang="he" dir="rtl">/);
  setHebrewSupport('minimal');
  assert.match(String(bi(x)), /^<span class="bi"><span class="bi-en" lang="en" dir="ltr">Use am, is or are.<\/span><button type="button" class="he-reveal/);
  assert.doesNotMatch(String(bi(x)), /he-first|primary/);
  setHebrewSupport('full');
});
