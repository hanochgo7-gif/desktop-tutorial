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
    // The shapes the views read: the manifest's lesson list and a pool file's {lessons, items} (contract C-1).
    if (u.endsWith('/content/manifest.json')) return { ok: true, status: 200, json: async () => ({ lessons: ['a1-01'] }) };
    if (u.includes('/content/pool/')) return { ok: true, status: 200, json: async () => ({ lessons: { 'a1-01': { id: 'a1-01', level: 'A1', topics: ['be-present'] } }, items: [{ lesson: 'a1-01', ex: { id: 'e1', type: 'mcq' } }] }) };
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

    // The per-file methods of contract C-1 (content lane) are what the routes ask for, and each view's own call
    // reuses the prefetched request.
    requested.length = 0;
    prefetchRoute('scenario/:id', { id: 'rl-x' });
    assert.deepEqual(requested, ['real-life/scenario/rl-x.json']);
    assert.ok((await content.scenario('rl-x')).url.endsWith('real-life/scenario/rl-x.json'));
    prefetchRoute('checkpoint/:level', { level: 'A1' });
    prefetchRoute('reading', {});
    prefetchRoute('real-life', {});
    prefetchRoute('writing/:id', { id: 'w-x' });
    prefetchRoute('writing/:id', { id: 'final-B2' }); // a final task has no file of its own: no 404 request
    assert.deepEqual([...requested].sort(), ['centers/read.json', 'pool/A1.json', 'real-life/index.json', 'real-life/scenario/rl-x.json', 'writing/index.json', 'writing/rubric.json', 'writing/task/w-x.json']);
    const { exercisePool } = await import('../../js/core/pool.js');
    const pool = await exercisePool(['A1']);
    assert.deepEqual(pool.map((p) => [p.lesson, p.level, p.topic, p.ex.id]), [['a1-01', 'A1', 'be-present', 'e1']], 'the level check reads the pool file the router started');
    await Promise.all([content.center('read'), content.scenarioIndex(), content.writingIndex(), content.writingTask('w-x')]);
    assert.equal(requested.filter((r) => r !== 'manifest.json').length, 7, 'no file was requested twice');

    // Without the C-1 methods (the boot lane merged alone), the old files.
    const C1 = ['scenarioIndex', 'scenario', 'writingIndex', 'writingTask', 'center', 'pool'];
    const saved = Object.fromEntries(C1.map((k) => [k, content[k]]));
    for (const k of C1) delete content[k];
    try {
      requested.length = 0;
      prefetchRoute('scenario/:id', { id: 'rl-x' });
      prefetchRoute('real-life', {});
      prefetchRoute('reading', {});
      assert.deepEqual(requested, ['real-life/scenarios.json']);
    } finally { Object.assign(content, saved); }
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
    } finally { Object.assign(content, saved); }

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
// A hidden page holding these fields, whose querySelectorAll matches the simple selectors a page query uses (a tag,
// [attr], [attr="v"], :not([attr])), so a field the router's query leaves out is really left out.
function fieldsDoc(fields) {
  const one = (el, sel) => {
    const m = sel.trim().match(/^([a-z]*)((?:\[[^\]]+\]|:not\(\[[^\]]+\]\))*)$/);
    if (!m) throw new Error(`selector not understood by the fake: ${sel}`);
    if (m[1] && m[1] !== el.tag) return false;
    return [...m[2].matchAll(/(:not\()?\[([\w-]+)(?:="([^"]*)")?\]\)?/g)].every(([, not, a, v]) => {
      const has = a in el.attrs && (v === undefined || el.attrs[a] === v);
      return not ? !has : has;
    });
  };
  const elements = fields.map(({ tag = 'input', attrs = {}, value = '', text = '' }) => ({
    tag, attrs, value, textContent: text, tagName: tag.toUpperCase(), type: tag === 'input' ? (attrs.type || 'text') : undefined,
    isContentEditable: 'contenteditable' in attrs && attrs.contenteditable !== 'false',
  }));
  return { visibilityState: 'hidden', querySelectorAll: (sel) => elements.filter((el) => sel.split(',').some((x) => one(el, x))) };
}
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

// Round-5 review: the page listened only from the registration, after the first screen; a release that took over
// while the page booted (another tab asked) went unseen, and the page imported that release's views (C-4).
test('a release taking over while the page boots, before the registration is watched, is a release switch; the first install is not (C-4)', async () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    for (const [label, controller, stale] of [['a controlled page', {}, true], ['a first visit', null, false]]) {
      const { sw, reg } = fakeWorkers({ controller });
      Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: sw }, configurable: true, writable: true });
      const R = await import(`../../js/core/router.js?boot-${controller ? 'controlled' : 'first'}`);
      sw.dispatchEvent(new Event('controllerchange')); // during boot: no registration yet
      sw.controller = {};
      reg.active = {};
      R.watchRelease(reg, undefined, 0);
      assert.equal(R.releaseState().stale, stale, label);
      sw.dispatchEvent(new Event('controllerchange'));
      assert.equal(R.releaseState().stale, true, `${label}: a later release taking over`);
    }
  } finally {
    if (real) Object.defineProperty(globalThis, 'navigator', real); else delete globalThis.navigator;
  }
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
  R.router.current = { pattern: 'settings', extra: { nav: 'settings' }, query: {} };
  for (const type of ['email', 'password', 'url', 'tel', 'number', 'text', 'search', null]) {
    const attrs = type ? { type } : {};
    assert.equal(await R.releaseOnHide(fieldsDoc([{ attrs, value: 'x' }])), false, `a field of type ${type || "(none)"} with a value is never lost`);
  }
  assert.equal(await R.releaseOnHide(fieldsDoc([{ tag: 'textarea', value: 'a draft' }])), false);
  assert.equal(await R.releaseOnHide(fieldsDoc([{ tag: 'div', attrs: { contenteditable: 'plaintext-only' }, text: ' note ' }])), false);
  assert.equal(reloads, 0);
  // Inputs whose value nobody types (a ticked box, a chosen option, a slider) and empty fields hold nothing.
  const untyped = [{ attrs: { type: 'checkbox' }, value: 'on' }, { attrs: { type: 'radio' }, value: 'he' }, { attrs: { type: 'range' }, value: '100' }, { attrs: { type: 'hidden' }, value: 'x' }, { attrs: { type: 'password' }, value: '' }, { tag: 'div', attrs: { contenteditable: 'false' }, text: 'shown' }];
  assert.equal(await R.releaseOnHide(fieldsDoc(untyped)), true);
  assert.equal(reloads, 1);
  reloads = 0;
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

test('a drill prefetches the pool files the drill reads: pool.drillLevels\'s levels, every level without a course level', async () => {
  const R = await import('../../js/core/router.js?drill');
  const { drillLevels } = await import('../../js/core/pool.js');
  const { LEVELS } = await import('../../js/core/adaptive.js');
  for (const level of [null, undefined, '', ...LEVELS]) assert.deepEqual(R.drillLevelsOf(level), drillLevels(level || null), String(level));
  assert.deepEqual(R.drillLevelsOf(null), LEVELS, 'no course level: every level, all 7 pool files');
  // Through the route, with a learner store: the files of model().courseLevel's levels, once each.
  const { openStore } = await import('../../js/core/store.js');
  const { model } = await import('../../js/core/learner.js');
  const { content } = await import('../../js/core/content.js');
  globalThis.addEventListener ??= () => {};
  await openStore({ persistent: () => null });
  const saved = { pool: content.pool, taxonomy: content.taxonomy };
  const asked = [];
  content.pool = (level) => { asked.push(level); return Promise.resolve({ lessons: [], items: [] }); };
  content.taxonomy = () => Promise.resolve({});
  try {
    R.prefetchRoute('drill', {});
    assert.deepEqual(asked, drillLevels(model().courseLevel));
  } finally { Object.assign(content, saved); }
});
