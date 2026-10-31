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
