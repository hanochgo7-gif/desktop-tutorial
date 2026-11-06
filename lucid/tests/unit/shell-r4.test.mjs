// Round 4, lane shell-bilingual: the shell's own logic (segmented-control columns; more checks join below).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segColumns } from '../../js/ui/components.js';

test('SB-6: a segmented control that cannot hold its segments on one line gets equal cells, balanced across rows', () => {
  // 4 segments whose widest label (166px) fits twice in 334px: a 2 x 2 grid.
  assert.equal(segColumns(4, 334, 160, 3), 2);
  // 9 segments, 2 fit a row: 2 columns (5 rows), never wider than the widest label allows.
  assert.equal(segColumns(9, 334, 160, 3), 2);
  // 9 segments, 4 would fit a row: 3 columns of 3, not 4 + 4 + 1.
  assert.equal(segColumns(9, 500, 115, 3), 3);
  // 4 segments, 3 would fit: 2 + 2, not 3 + 1.
  assert.equal(segColumns(4, 400, 120, 3), 2);
  // A label wider than the whole track: one column (the label may then wrap inside its cell).
  assert.equal(segColumns(3, 200, 260, 3), 1);
  // Never more columns than segments.
  assert.equal(segColumns(2, 1000, 80, 3), 2);
});

// The top-bar title size is kept across page loads under a key (perf plan B7): any change that can change the size
// (language, text size, width, font, the section names) gives a new key, so a stale size is never reused.
test('B7: the kept title size is keyed by everything that sets it', async () => {
  globalThis.location ??= { hash: '' };
  const { titleFitKey, TITLE_FIT_VERSION } = await import('../../js/core/router.js');
  const at = { lang: 'he', base: 17, width: 212, font: '600 Rubik, system-ui 0px', names: ['היום', 'מעבדת כתיבה', 'הגדרות'] };
  const key = titleFitKey(at);
  assert.equal(titleFitKey({ ...at, names: [...at.names] }), key, 'stable for the same inputs');
  assert.ok(key.endsWith(`|v${TITLE_FIT_VERSION}`));
  for (const change of [{ lang: 'en' }, { base: 19.5 }, { width: 211 }, { font: '600 system-ui 0px' }, { names: ['היום', 'מעבדת כתיבה', 'הגדרות!'] }, { names: ['היום', 'הגדרות', 'מעבדת כתיבה'] }]) {
    assert.notEqual(titleFitKey({ ...at, ...change }), key, JSON.stringify(change));
  }
  assert.doesNotThrow(() => titleFitKey());
});
