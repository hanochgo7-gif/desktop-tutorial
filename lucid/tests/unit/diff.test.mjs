import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff, fixStatus, locateSpan, findLoose } from '../../js/core/diff.js';

test('word diff shows changed words inside an edited sentence and keeps the rest', () => {
  const d = wordDiff('I think social media is bad. It wastes time.', 'I believe social media is harmful. It wastes time.');
  assert.deepEqual(d.filter((p) => p.type !== 'same').map((p) => `${p.type}:${p.text}`), ['del:think', 'add:believe', 'del:bad.', 'add:harmful.']);
  assert.ok(d.some((p) => p.type === 'same' && p.text.includes('It wastes time.')));
});
test('added and removed sentences, and identical texts', () => {
  assert.deepEqual(wordDiff('A b.', 'A b. New sentence here.').map((p) => p.type), ['same', 'add']);
  assert.deepEqual(wordDiff('Same text.', 'Same text.'), [{ type: 'same', text: 'Same text.' }]);
  assert.deepEqual(wordDiff('', 'Hello.'), [{ type: 'add', text: 'Hello.' }]);
});

// Persona panel P-73: two neighbouring sentences changed, paragraph breaks kept.
test('a changed run of sentences is compared word by word with the run that replaced it, and breaks are kept', () => {
  const v1 = 'Free buses\n\nThe success of free transport depends of many things. It is cheap.\n\nSome people disagree.';
  const v2 = 'Free buses\n\nIn a survey, 60% of riders said yes. The success of free transport depends on many things. It is cheap.\n\nSome people disagree.';
  const d = wordDiff(v1, v2);
  assert.deepEqual(d.filter((p) => p.type === 'add' || p.type === 'del').map((p) => `${p.type}:${p.text}`), ['add:In a survey, 60% of riders said yes.', 'del:of', 'add:on']);
  assert.equal(d.filter((p) => p.type === 'break').length, 2, 'both paragraph breaks are kept');
  assert.ok(d.some((p) => p.type === 'same' && p.text.startsWith('The success of free transport depends')));
});

// Persona panel P-72: "Looks fixed" only when the sentence that had the mistake now has the correction.
test('a fix is judged in the sentence where the mistake was, not anywhere in the essay', () => {
  const v = 'Intro.\n\nIn my opinion, it is more better than building new roads, and people get better grades. The end.';
  assert.equal(fixStatus(v, v, 'more better', 'better'), null, 'unchanged');
  assert.equal(fixStatus(v, v.replace('more better', 'more good'), 'more better', 'better'), 'changed', 'a wrong fix is not "fixed" although "better" occurs later');
  assert.equal(fixStatus(v, v.replace('more better', 'better'), 'more better', 'better'), 'fixed');
  assert.equal(fixStatus(v, v.replace('more better', 'much better'), 'more better', 'better'), 'changed', 'a different edit is neutral');
  assert.equal(fixStatus(v, 'Intro.\n\nIn my opinion, it is better than building new roads, and people get better grades. The end. More text.', 'more better', 'better'), 'fixed', 'text added elsewhere');
  assert.equal(fixStatus(v, 'Completely new text that is more better.', 'more better', 'better'), null, 'sentence lost but the quote is still there');
  assert.equal(fixStatus(v, 'Completely new text.', 'more better', 'better'), 'changed', 'sentence lost: never "fixed"');
});

test('locating a quote selects it in its sentence, or the sentence it was in', () => {
  const v = 'One. It is more better here. Two.';
  const now = 'One. Today it is more better here. Two.';
  assert.equal(now.slice(...locateSpan(v, now, 'More  Better')), 'more better', 'case and spacing are ignored');
  const fixed = 'One. It is much nicer here. Two.';
  assert.equal(fixed.slice(...locateSpan(v, fixed, 'more better')), 'It is much nicer here.');
  assert.deepEqual(findLoose('He said \u201chi\u201d.', '"hi"'), [8, 12]);
});
