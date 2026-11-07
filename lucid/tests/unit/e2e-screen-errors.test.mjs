// The e2e suites' broken-screen pattern (tests/e2e/screen-errors.mjs) must match every "did not load" and "went
// wrong" message the app can show, the router's own error screen first: a pattern that misses one lets a check pass
// on a broken screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BROKEN, NOT_FOUND } from '../e2e/screen-errors.mjs';

const js = new URL('../../js/', import.meta.url);
const files = (dir) => readdirSync(new URL(dir, js), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}${d.name}/`) : d.name.endsWith('.js') ? [`${dir}${d.name}`] : []));

test("the router's error screens, in Hebrew and English, are broken screens", () => {
  const router = readFileSync(new URL('core/router.js', js), 'utf8');
  for (const msg of ['המסך לא נטען', 'This screen did not load', 'משהו השתבש', 'Something went wrong']) {
    assert.ok(router.includes(`'${msg}'`), `router.js no longer says '${msg}': update this test`);
    assert.ok(BROKEN.test(msg), `'${msg}' is not matched by ${BROKEN}`);
  }
});

test('every Hebrew "did not load" message in js/ (any inflection of נטען) is a broken screen', () => {
  const found = [];
  for (const f of files('')) {
    for (const m of readFileSync(new URL(f, js), 'utf8').matchAll(/'([^'\n]*לא נטע[^'\n]*)'/g)) found.push([f, m[1]]);
  }
  assert.ok(found.length >= 8, `only ${found.length} messages found`);
  for (const [f, msg] of found) assert.ok(BROKEN.test(msg), `${f}: '${msg}' is not matched by ${BROKEN}`);
});

test('a not-found heading is recognised; ordinary words are not broken screens', () => {
  for (const msg of ['השיעור לא נמצא', 'Lesson not found', 'התרחיש לא נמצא']) assert.ok(NOT_FOUND.test(msg), msg);
  for (const msg of ['נטען את השיעור', 'השיעור נטען', 'Loading…', 'שיעורים שכבר שמורים במכשיר']) assert.ok(!BROKEN.test(msg), msg);
});
