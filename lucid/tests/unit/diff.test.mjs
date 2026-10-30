import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff } from '../../js/core/diff.js';

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
