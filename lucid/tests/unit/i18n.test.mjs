import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolateLatin } from '../../js/core/i18n.js';

test('Latin runs inside Hebrew are isolated; punctuation around them stays Hebrew', () => {
  assert.equal(String(isolateLatin('אומרים "What\'s up?" כשנפגשים')), 'אומרים <bdi dir="ltr" lang="en">&quot;What&#39;s up?&quot;</bdi> כשנפגשים');
  assert.equal(String(isolateLatin('עם he, she, it משתמשים ב-is.')), 'עם <bdi dir="ltr" lang="en">he, she, it</bdi> משתמשים ב-<bdi dir="ltr" lang="en">is.</bdi>');
  assert.equal(String(isolateLatin('הצורה (I am) מלאה')), 'הצורה (<bdi dir="ltr" lang="en">I am</bdi>) מלאה');
  assert.equal(isolateLatin('רק עברית'), 'רק עברית');
  assert.equal(isolateLatin('English only'), 'English only');
  assert.ok(!String(isolateLatin('<script> בדיקה')).includes('<script>'), 'escapes markup');
});
