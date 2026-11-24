// The one-time upgrade from release 2026-11-03.1 (commit b2b669b, the release before the perf programme). That
// release's worker serves code network-first and its page has no release handoff (contract C-4), so a tab started
// on it keeps that release's core modules (content.js, util.js and the rest of its boot graph, already evaluated)
// and opens this release's screens: from the network while its worker runs, and from the new release cache once the
// new worker has taken over. A screen that imported a name those modules lack would not load at all.
// So the screens take the functions added since (contracts C-1, C-3) from here, never by name from content.js or
// util.js. On a page that started on this release each one is the core module's own function, unchanged; on an old
// page it is the same function built on what the old modules have, and the C-1 methods are added to the old
// `content` object. tests/unit/compat.test.mjs checks both, and that no screen imports a name the old modules lack
// (tests/unit/fixtures/release-2026-11-03.1.json); tests/e2e/upgrade.mjs walks every screen in such a tab.
// Release 2026-11-07.1 (commit d83a500, no age limit) is the same worker and the same boot graph plus js/core/age.js;
// its content object leaves flagged items out of scenarios() and slang() for learners under 16, and has no C-1
// methods either. So the methods added here apply the same age filter, on each call, from the profile as it is now
// (age.js exists in both releases' trees; the store is the page's own). On a page of release 2026-11-03.1, whose
// scenarios() and slang() do not filter, they are wrapped with the same filter (a no-op on 2026-11-07.1's, which
// already filtered). tests/unit/fixtures/release-2026-11-07.1.json lists that release's modules (architecture.md 7).
import * as contentModule from './content.js';
import * as utilModule from './util.js';
import { store } from './store.js';
import { forLearner } from './age.js';

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const SCENARIO_ROW = ['id', 'module', 'level', 'title_en', 'title_he', 'goal', 'sensitive'];
const WRITING_ROW = ['id', 'stage', 'level', 'kind', 'title_en', 'title_he', 'word_range', 'min_words', 'max_words', 'time_limit_min'];
const scenarioRow = (s) => ({ ...pick(s, SCENARIO_ROW), n_practice: Array.isArray(s.practice) ? s.practice.length : 0 });
const writingRow = (x) => ({ ...pick(x, WRITING_ROW), ...(Array.isArray(x.items) ? { n_items: x.items.length } : {}), ...(x.prompt !== undefined ? { prompt: x.prompt } : {}) });
// The learner as stored now, as content.js reads it (null when the store cannot be read).
const storedLearner = () => { try { return store?.get('profile', 'me') || null; } catch { return null; } };
// content.js's forAge: under 16, flagged items are left out and `hidden_for_age` counts them. Idempotent: a list
// already filtered for this learner comes back as it is, with its count.
const forAge = (key, learner) => (d) => {
  if (!d || !Array.isArray(d[key])) return d;
  const { shown, hidden } = forLearner(d[key], learner());
  return hidden ? { ...d, [key]: shown, hidden_for_age: (d.hidden_for_age || 0) + hidden } : d;
};

// content.js's C-1 methods for an old `content` object, reading the same files the same way: the generated file
// first (the new worker precaches it), the full file it was cut from when that cannot be loaded.
// The memo keeps the files as loaded; the age filter runs after it, on each call (as in content.js).
export function legacyMethods(content, { base = new URL('../../content/', import.meta.url), fetchFn = (u) => fetch(u), learner = storedLearner } = {}) {
  const memo = new Map();
  const once = (key, load) => {
    if (memo.has(key)) return memo.get(key);
    const p = load().then((v) => { if (v == null) memo.delete(key); return v; }, (e) => { memo.delete(key); throw e; });
    memo.set(key, p);
    return p;
  };
  const file = async (path, { missing } = {}) => {
    const r = await fetchFn(new URL(path, base));
    if (r.status === 404 && missing !== undefined) return missing;
    if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
    return r.json();
  };
  const writing = () => Promise.all([content.writingExercises(), content.assignments()]);
  return {
    // Only the generated files are kept here. The fallback asks the old object on each call, because release
    // 2026-11-07.1's scenarios() is already filtered for the learner of that moment (the old object keeps the file).
    scenarioIndex: () => once('scenarioIndex', () => file('real-life/index.json', { missing: null }).catch(() => null))
      .then((d) => d || content.scenarios().then((s) => (s ? { scenarios: (s.scenarios || []).map(scenarioRow), ...(s.hidden_for_age ? { hidden_for_age: s.hidden_for_age } : {}) } : null)))
      .then(forAge('scenarios', learner)),
    scenario: (id) => once(`scenario:${id}`, () => file(`real-life/scenario/${encodeURIComponent(id)}.json`, { missing: null }))
      .catch(() => content.scenarios().then((d) => d?.scenarios?.find((x) => x.id === id) || null))
      .then((s) => (s && forLearner([s], learner()).hidden ? null : s)),
    writingIndex: () => once('writingIndex', () => file('writing/index.json', { missing: null }).catch(() => null)
      .then((d) => d || writing().then(([ex, as]) => (ex || as ? { exercises: (ex?.exercises || []).map(writingRow), assignments: (as?.assignments || []).map(writingRow) } : null)))),
    writingTask: (id) => once(`writingTask:${id}`, () => file(`writing/task/${encodeURIComponent(id)}.json`, { missing: null })
      .catch(() => writing().then(([ex, as]) => ex?.exercises?.find((x) => x.id === id) || as?.assignments?.find((x) => x.id === id) || null))),
    // Rejects when the file cannot be loaded; the callers then use the lessons on this device (as with content.js).
    center: (name) => once(`center:${name}`, () => file(`centers/${encodeURIComponent(name)}.json`)),
    pool: (level) => once(`pool:${level}`, () => file(`pool/${encodeURIComponent(level)}.json`)),
  };
}

// The functions the screens take from here, for the two modules as they are on this page.
export function upgrade(contentNs, utilNs, options) {
  const { content } = contentNs;
  if (content) {
    // An old page: its content object has none of the C-1 methods. Its scenarios() and slang() get the age filter
    // (release 2026-11-03.1's did not filter; on 2026-11-07.1's the filter finds nothing more to leave out).
    if (typeof content.scenarioIndex !== 'function') {
      const learner = options?.learner || storedLearner;
      for (const [k, key] of [['scenarios', 'scenarios'], ['slang', 'entries']]) {
        const own = content[k];
        if (typeof own === 'function' && !own.ageFiltered) content[k] = Object.assign((...a) => Promise.resolve(own.apply(content, a)).then(forAge(key, learner)), { ageFiltered: true });
      }
    }
    const methods = legacyMethods(content, options);
    for (const [k, fn] of Object.entries(methods)) if (typeof content[k] !== 'function') content[k] = fn;
  }
  let collator = null;
  const relTimes = new Map();
  return {
    withItemCount: contentNs.withItemCount ?? ((row) => (row && row.n_items != null && !row.items ? { ...row, items: new Array(row.n_items) } : row)),
    CENTERS: contentNs.CENTERS ?? { read: ['read'], listen: ['listen', 'dictation'], speak: ['speak'] },
    collatorEn: utilNs.collatorEn ?? (() => (collator ||= new Intl.Collator('en', { sensitivity: 'base' }))),
    relTime: utilNs.relTime ?? ((lang) => { let f = relTimes.get(lang); if (!f) relTimes.set(lang, (f = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }))); return f; }),
    groupDigits: utilNs.groupDigits ?? ((n) => (Number.isSafeInteger(n) && !Object.is(n, -0) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : n.toLocaleString('en-US'))),
  };
}

export const { withItemCount, CENTERS, collatorEn, relTime, groupDigits } = upgrade(contentModule, utilModule);
