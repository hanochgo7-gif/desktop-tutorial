// CI (.github/workflows/lucid-verify.yml, LB-09) runs every browser suite and the upgrade from the releases that tabs
// may still run: a suite added to tests/e2e/ without a place in the matrix would never run in CI (the launch lanes'
// launch-honesty and launch-content suites were left out at first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../../', import.meta.url));
const workflow = readFileSync(join(app, '..', '.github/workflows/lucid-verify.yml'), 'utf8');

test('every e2e suite is in the CI matrix, on the source and the built tree', () => {
  const matrix = workflow.match(/^\s+suite: \[([^\]]*)\]/m)?.[1].split(',').map((s) => s.trim()) || [];
  assert.match(workflow, /^\s+tree: \[source, built\]/m);
  // screen-errors.mjs is a helper; upgrade.mjs has its own job (below).
  const suites = readdirSync(join(app, 'tests/e2e')).filter((f) => f.endsWith('.mjs') && !['screen-errors.mjs', 'upgrade.mjs'].includes(f)).map((f) => f.replace(/\.mjs$/, ''));
  assert.deepEqual(suites.filter((s) => !matrix.includes(s)), [], 'suites missing from the matrix');
  assert.deepEqual(matrix.filter((s) => !suites.includes(s)), [], 'the matrix names a suite that does not exist');
});

test('the upgrade job fetches the commits upgrade.mjs starts from (the release live at launch and d83a500)', () => {
  const upgrade = readFileSync(join(app, 'tests/e2e/upgrade.mjs'), 'utf8');
  const live = upgrade.match(/^const LIVE_FROM = '([0-9a-f]{40})';/m)?.[1];
  const from = upgrade.match(/^const FROM = '([0-9a-f]{7,40})';/m)?.[1];
  assert.ok(live && from, 'upgrade.mjs names its base commits');
  const fetch = workflow.match(/git fetch --no-tags --depth=1 origin ([0-9a-f ]+)\n/)?.[1].trim().split(/\s+/) || [];
  assert.ok(fetch.includes(live), `the upgrade job does not fetch ${live}`);
  assert.ok(fetch.some((c) => c.startsWith(from)), `the upgrade job does not fetch ${from}`);
  assert.match(workflow, /E2E_ROOT="\$RUNNER_TEMP\/built" node tests\/e2e\/upgrade\.mjs/);
});
