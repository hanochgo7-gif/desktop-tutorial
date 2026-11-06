// Hash parsing (security review S-17) and the "came from" route used to return after signing in (P-22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

globalThis.location = { hash: '' };
const { parse, hrefOf } = await import('../../js/core/router.js');

test('a malformed escape in the hash does not throw; it is marked so the router can replace it (S-17)', () => {
  assert.doesNotThrow(() => parse('#/%E0%A4%A'));
  assert.deepEqual(parse('#/%E0%A4%A'), { path: '', query: {}, malformed: true });
  assert.deepEqual(parse('#/lesson/%ZZ'), { path: '', query: {}, malformed: true });
  location.hash = '#/%';
  assert.equal(parse().malformed, true, 'reads location.hash by default');
});

test('ordinary hashes parse as before', () => {
  assert.deepEqual(parse('#/scenario/hotel?tab=roleplay'), { path: 'scenario/hotel', query: { tab: 'roleplay' } });
  assert.deepEqual(parse('#/path/B2/'), { path: 'path/B2', query: {} });
  assert.deepEqual(parse(''), { path: '', query: {} });
  assert.deepEqual(parse('#/writing/free?x=%D7%A9'), { path: 'writing/free', query: { x: 'ש' } });
});

test('a route state turns back into the hash it came from (P-22)', () => {
  assert.equal(hrefOf({ path: 'scenario/hotel', query: { tab: 'roleplay' } }), '#/scenario/hotel?tab=roleplay');
  assert.equal(hrefOf({ path: 'settings', query: {} }), '#/settings');
  const back = parse(hrefOf({ path: 'tutor', query: { mode: 'grammar' } }));
  assert.deepEqual(back, { path: 'tutor', query: { mode: 'grammar' } });
  const next = `scenario/hotel?tab=roleplay`;
  assert.deepEqual(parse(`#/account?mode=signin&next=${encodeURIComponent(next)}`).query, { mode: 'signin', next }, 'an encoded ? stays inside the value');
  assert.deepEqual(parse('#/expressions?open=break%20a%20leg&q=a+b').query, { open: 'break a leg', q: 'a b' });
});

// The top bar of the Hebrew UI (SC-9): an English-only title gives way to its section's name.
test('an English-only title shows its section name in the Hebrew top bar; Hebrew titles and the English UI keep theirs', async () => {
  const { topTitle, sectionOf } = await import('../../js/core/router.js');
  assert.equal(topTitle('Free writing', { lang: 'he', section: 'מעבדת כתיבה' }), 'מעבדת כתיבה');
  assert.equal(topTitle('Check-in: an overweight bag', { lang: 'he', section: 'אנגלית לחיים' }), 'אנגלית לחיים');
  assert.equal(topTitle('היום', { lang: 'he', section: 'היום' }), 'היום');
  assert.equal(topTitle('צ׳ק-אין: Check-in', { lang: 'he', section: 'x' }), 'צ׳ק-אין: Check-in', 'a title with Hebrew in it stays');
  assert.equal(topTitle('Free writing', { lang: 'en', section: 'Writing lab' }), 'Free writing');
  assert.equal(topTitle('Free writing', { lang: 'he', section: '' }), 'Free writing', 'no section: the title stays');
  assert.equal(topTitle('', { lang: 'he', section: 'היום' }), '');
  const NAV = [['today', 'nav.today', 'today'], ['practice', 'nav.practice', 'practice'], ['real-life', 'nav.reallife', 'reallife']];
  const MORE = [['writing', 'nav.writing', 'writing'], ['vocab', 'nav.vocab', 'vocab']];
  assert.equal(sectionOf({ path: 'writing/free', extra: { nav: 'practice' } }, NAV, MORE)?.[1], 'nav.writing', 'a lab names itself, not Practice');
  assert.equal(sectionOf({ path: 'scenario/rl-x', extra: { nav: 'reallife' } }, NAV, MORE)?.[1], 'nav.reallife');
  assert.equal(sectionOf({ path: 'today', extra: { nav: 'today' } }, NAV, MORE)?.[1], 'nav.today');
  assert.equal(sectionOf({ path: 'settings', extra: { nav: 'settings' } }, NAV, MORE)?.[1], 'nav.settings');
  assert.equal(sectionOf({ path: 'account', extra: {} }, NAV, MORE), null);
  assert.equal(sectionOf({ path: 'vocabulary-x', extra: {} }, NAV, MORE), null, 'a prefix that is not a path segment is not the lab');
});

// ---------- route preloads, route data and the release handoff (perf plan B2, B3, B6) ----------
const appRoot = new URL('../../', import.meta.url);
const { APP, OUT, buildRouteDeps, routesOf, bootModules } = await import('../../tools/build-route-deps.mjs');

test('js/core/route-deps.js is what tools/build-route-deps.mjs generates from the code as it stands (B2)', () => {
  assert.equal(readFileSync(new URL(OUT, appRoot), 'utf8'), buildRouteDeps(APP), 'stale: run node tools/build-route-deps.mjs');
});

test('every route has its modules in the map, none of them in the boot graph, and every module exists (B2)', async () => {
  const deps = (await import('../../js/core/route-deps.js')).default;
  const boot = new Set(bootModules());
  const routes = routesOf();
  assert.ok(routes.length >= 30, 'the route scan found the router table');
  assert.deepEqual(Object.keys(deps), routes.map(([p]) => p));
  for (const [pattern, view] of routes) {
    assert.ok(deps[pattern].includes(view), `${pattern} preloads its own view`);
    for (const f of deps[pattern]) {
      assert.ok(!boot.has(f), `${f} is in the boot graph already`);
      assert.ok(existsSync(new URL(f, appRoot)), f);
    }
  }
  // The lesson's deepest level (lesson -> player/exercise -> grading -> writing-analyzer) is in its list.
  for (const f of ['js/ui/player.js', 'js/ui/exercise.js', 'js/core/grading.js', 'js/core/writing-analyzer.js']) assert.ok(deps['lesson/:id'].includes(f), f);
});

function fakeDoc() {
  const head = { links: [], append(l) { this.links.push(l); } };
  return { head, createElement: () => ({}) };
}

test('preloadRoute adds one modulepreload link per module, once, resolved from the app root (B2)', async () => {
  const { preloadRoute } = await import('../../js/core/router.js?preload');
  const deps = (await import('../../js/core/route-deps.js')).default;
  const doc = fakeDoc();
  preloadRoute('lesson/:id', doc);
  assert.equal(doc.head.links.length, deps['lesson/:id'].length);
  assert.ok(doc.head.links.every((l) => l.rel === 'modulepreload'));
  assert.equal(doc.head.links[0].href, new URL('js/views/lesson.js', appRoot).href);
  preloadRoute('lesson/:id', doc);
  preloadRoute('checkpoint/:level', doc); // shares the player, exercise and grading modules with the lesson
  const hrefs = doc.head.links.map((l) => l.href);
  assert.equal(new Set(hrefs).size, hrefs.length, 'no module is preloaded twice');
  assert.ok(hrefs.includes(new URL('js/views/checkpoint.js', appRoot).href));
  assert.doesNotThrow(() => preloadRoute('no/such/route', doc));
  assert.doesNotThrow(() => preloadRoute('today', undefined), 'no document (tests, workers): nothing to do');
});

test('a route starts its content as it resolves, through content.js, so the view reuses the same request (B3)', async () => {
  const requested = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    requested.push(u.replace(/^.*\/content\//, ''));
    if (u.includes('missing')) return { ok: false, status: 404, json: async () => null };
    if (u.includes('broken')) throw new TypeError('offline');
    return { ok: true, status: 200, json: async () => ({ url: u }) };
  };
  try {
    const { content } = await import('../../js/core/content.js');
    const { prefetchRoute, DATA } = await import('../../js/core/router.js');
    const patterns = new Set(routesOf().map(([p]) => p));
    for (const p of Object.keys(DATA)) assert.ok(patterns.has(p), `DATA names a route that does not exist: ${p}`);

    prefetchRoute('lesson/:id', { id: 'a1-01' });
    assert.deepEqual([...requested].sort(), ['lessons/a1-01.json', 'taxonomy.json']);
    const lesson = await content.lesson('a1-01');
    assert.ok(lesson.url.endsWith('lessons/a1-01.json'));
    assert.equal(requested.length, 2, 'the view reused the prefetched file');

    // A file that does not exist: the not-found screen still gets its null; a failed fetch is not kept.
    prefetchRoute('lesson/:id', { id: 'missing' });
    assert.equal(await content.lesson('missing'), null);
    prefetchRoute('lesson/:id', { id: 'broken' });
    await new Promise((r) => setTimeout(r, 0));
    const n = requested.length;
    assert.equal(await content.lesson('broken'), null);
    assert.equal(requested.length, n + 1, 'a failed prefetch is fetched again, not served from a rejected promise');

    // The newer per-file methods (contract C-1) are used when content.js has them, the old files otherwise.
    requested.length = 0;
    prefetchRoute('scenario/:id', { id: 'rl-x' });
    assert.deepEqual(requested, ['real-life/scenarios.json']);
    const calls = [];
    content.scenario = (id) => { calls.push(['scenario', id]); return Promise.resolve(null); };
    content.pool = (level) => { calls.push(['pool', level]); return Promise.reject(new Error('404')); };
    content.center = (kind) => { calls.push(['center', kind]); return Promise.resolve({}); };
    try {
      requested.length = 0;
      prefetchRoute('scenario/:id', { id: 'rl-y' });
      prefetchRoute('checkpoint/:level', { level: 'A2' });
      prefetchRoute('reading', {});
      assert.deepEqual(calls, [['scenario', 'rl-y'], ['pool', 'A2'], ['center', 'read']]);
      assert.ok(!requested.includes('real-life/scenarios.json'));
      await new Promise((r) => setTimeout(r, 0)); // the rejected pool promise is handled (no unhandled rejection)
    } finally { delete content.scenario; delete content.pool; delete content.center; }

    // Without a learner store (the drill and Today read the learner model), the prefetch gives up quietly.
    assert.doesNotThrow(() => prefetchRoute('today', {}));
    assert.doesNotThrow(() => prefetchRoute('drill', {}));
    assert.doesNotThrow(() => prefetchRoute('no/such/route', {}));
  } finally { globalThis.fetch = realFetch; }
});

// A fake service-worker container and registration.
function fakeWorkers({ controller = null, active = null } = {}) {
  const sw = new EventTarget();
  sw.controller = controller;
  const reg = { active, waiting: null, updates: 0, update() { this.updates++; return Promise.resolve(); } };
  const posted = [];
  const waitingWorker = ({ activates = true } = {}) => ({ postMessage(m) { posted.push(m); if (activates) setTimeout(() => sw.dispatchEvent(new Event('controllerchange')), 5); } });
  return { sw, reg, posted, waitingWorker };
}
const hubDoc = (typed = []) => ({ visibilityState: 'hidden', querySelectorAll: () => typed });
let reloads = 0;
globalThis.location.reload = () => { reloads++; };

test('the first install claiming the page is not a release switch; a later switch by another tab is (B6, C-4)', async () => {
  const R = await import('../../js/core/router.js?first-install');
  const { sw, reg } = fakeWorkers();
  R.watchRelease(reg, sw, 0);
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(R.releaseState().stale, false, 'first install');
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(R.releaseState().stale, true, 'a later release taking over');
});

test('a tab whose release was switched by another tab reloads when hidden on a hub, not on an activity (B6)', async () => {
  const R = await import('../../js/core/router.js?other-tab');
  const { sw, reg, posted } = fakeWorkers({ controller: {}, active: {} });
  R.watchRelease(reg, sw, 0);
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(R.releaseState().stale, true);
  reloads = 0;
  R.router.current = { pattern: 'lesson/:id', extra: { bare: true }, query: {} };
  assert.equal(await R.releaseOnHide(hubDoc()), false, 'a lesson is never reloaded');
  R.router.current = { pattern: 'writing/:id', extra: { nav: 'practice' }, query: {} };
  assert.equal(await R.releaseOnHide(hubDoc()), false, 'an essay is never reloaded');
  R.router.current = { pattern: 'reading', extra: { nav: 'practice' }, query: { l: 'a1-01', e: '3' } };
  assert.equal(await R.releaseOnHide(hubDoc()), false, 'an exercise opened in a centre is never reloaded');
  R.router.current = { pattern: 'tutor', extra: { nav: 'practice' }, query: {} };
  assert.equal(await R.releaseOnHide(hubDoc([{ value: 'half a message' }])), false, 'typed text is never lost');
  assert.equal(reloads, 0);
  R.router.current = { pattern: 'today', extra: { nav: 'today' }, query: {} };
  assert.equal(await R.releaseOnHide(hubDoc()), true);
  assert.equal(reloads, 1);
  assert.deepEqual(posted, [], 'the switch was another tab\'s: nothing to ask the worker');
});

test('a waiting release is asked to take over, and the page reloads once it has (B6, C-4)', async () => {
  const R = await import('../../js/core/router.js?waiting');
  const { sw, reg, posted, waitingWorker } = fakeWorkers({ controller: {}, active: {} });
  R.watchRelease(reg, sw, 0);
  R.router.current = { pattern: 'progress', extra: { nav: 'progress' }, query: {} };
  reloads = 0;
  assert.equal(await R.releaseOnHide(hubDoc()), false, 'no waiting worker: nothing happens');
  reg.waiting = waitingWorker();
  assert.equal(await R.releaseOnHide(hubDoc()), true);
  assert.deepEqual(posted, [{ type: 'lucid:activate' }]);
  assert.equal(reloads, 1);
});

test('a waiting worker that does not take over within 3 s leaves the page as it is (B6)', async () => {
  const R = await import('../../js/core/router.js?timeout');
  const { sw, reg, posted, waitingWorker } = fakeWorkers({ controller: {}, active: {} });
  R.watchRelease(reg, sw, 0);
  R.router.current = { pattern: 'today', extra: { nav: 'today' }, query: {} };
  reg.waiting = waitingWorker({ activates: false });
  reloads = 0;
  const t0 = Date.now();
  assert.equal(await R.releaseOnHide(hubDoc()), false);
  assert.ok(Date.now() - t0 >= 2900);
  assert.equal(posted.length, 1);
  assert.equal(reloads, 0);
  assert.equal(R.releaseState().stale, false);
});

test('an update check runs when the tab comes back after more than an hour, not more often (B6)', async () => {
  const R = await import('../../js/core/router.js?update');
  const { sw, reg } = fakeWorkers({ controller: {}, active: {} });
  assert.equal(R.checkForRelease(10 ** 13), false, 'no registration yet');
  R.watchRelease(reg, sw, 1_000);
  assert.equal(R.checkForRelease(1_000 + 59 * 60_000), false);
  assert.equal(reg.updates, 0);
  assert.equal(R.checkForRelease(1_000 + 61 * 60_000), true);
  assert.equal(reg.updates, 1);
  assert.equal(R.checkForRelease(1_000 + 62 * 60_000), false, 'the hour counts from the last check');
});
