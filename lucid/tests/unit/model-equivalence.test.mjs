// Speed rewrites of the learner model give exactly the old answers (perf plan R2, R3, R7):
// - skillLevels sorts the attempts once for every skill instead of once per skill (R2);
// - util.dayOf gives the UTC day of a canonical ISO string without a Date, and todayKey(new Date(x)) otherwise (R3);
// - periodReport compares canonical timestamps as strings and sorts once for both mastery reports (R7).
// The reference implementations below are the pre-change code (commit b2b669b), kept verbatim apart from names, and
// both are run on the heavy perf learner (tools/perf/seed-heavy.mjs, built through the app's own modules in a memory
// store) and on a light one.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { skillLevels, periodReport, firstTries, errorProfile, placementSkillEstimate, EVIDENCE, RECEPTIVE, LEVELS, SKILLS, levelIndex, isLessonId, WRITING_EVENTS } from '../../js/core/adaptive.js';
import { todayKey, dayOf, isCanonicalIso } from '../../js/core/util.js';
import { seedHeavy } from '../../tools/perf/seed-heavy.mjs';

// ---------- the pre-change code ----------
const DAY = 86_400_000;
const dayKey = (iso) => String(iso).slice(0, 10);
const weight = (at, now) => 0.5 ** (Math.max(0, now - new Date(at).getTime()) / DAY / 21);
const byTime = (list) => [...list].sort((a, b) => (String(a.at) < String(b.at) ? -1 : String(a.at) > String(b.at) ? 1 : 0));
const essayFeedback = (a) => a.source === 'writing' && !a.lesson;
const scoreOf = (a) => a.score ?? (a.correct ? 1 : 0);
function refTopicMastery(attempts, now = Date.now()) {
  const by = new Map();
  for (const a of firstTries(byTime(attempts))) {
    if (!a.topic || a.source === 'placement' || a.score === null || essayFeedback(a)) continue;
    const t = by.get(a.topic) || { a: 0, n: 0, count: 0, days: new Set(), last: null, level: null };
    const w = weight(a.at, now);
    t.a += w * (a.score ?? (a.correct ? 1 : 0));
    t.n += w;
    t.count++;
    t.days.add(dayKey(a.at));
    if (!t.last || a.at > t.last) t.last = a.at;
    if (levelIndex(a.level) > levelIndex(t.level)) t.level = a.level;
    by.set(a.topic, t);
  }
  const out = new Map();
  for (const [topic, t] of by) {
    const mastery = (t.a + 1) / (t.n + 2);
    let status = 'practising';
    if (mastery < 0.6) status = 'learning';
    else if (mastery >= 0.85 && t.count >= 6 && t.days.size >= 2) status = 'mastered';
    out.set(topic, { topic, mastery, evidence: t.count, days: t.days.size, last: t.last, status, level: t.level });
  }
  return out;
}
function refWritingLevel(writing) {
  const byTask = new Map();
  for (const w of writing) {
    if (w.kind === 'essay-version' && !w.final) continue;
    const est = w.evaluation?.cefr_estimate;
    if (!est || est === 'below_PreA1' || levelIndex(est) < 0) continue;
    const at = w.at || w.updated || w.updated_at || '';
    const key = w.exercise || w.id;
    const cur = byTask.get(key);
    if (!cur || at > cur.at) byTask.set(key, { level: est, at });
  }
  const tasks = [...byTask.values()].sort((a, b) => (a.at < b.at ? -1 : 1));
  const days = new Set(tasks.map((t) => dayKey(t.at))).size;
  if (tasks.length < EVIDENCE.writingTasks || days < EVIDENCE.days) return { level: null, source: tasks.length ? 'assessed-writing' : null, evidence: tasks.length, days };
  const recent = tasks.slice(-3).map((t) => levelIndex(t.level)).sort((a, b) => a - b);
  return { level: LEVELS[recent[Math.floor((recent.length - 1) / 2)]], source: 'assessed-writing', evidence: tasks.length, days };
}
function refSkillLevels({ attempts = [], placement = null, writing = [] } = {}) {
  const out = {};
  for (const skill of SKILLS) {
    if (skill === 'speaking') { out[skill] = { level: null, source: null, evidence: 0, days: 0 }; continue; }
    if (skill === 'writing') { out[skill] = refWritingLevel(writing); continue; }
    const perLevel = new Map();
    for (const a of firstTries(byTime(attempts))) {
      if (a.skill !== skill || !a.level || a.source === 'placement' || a.score === null) continue;
      const p = perLevel.get(a.level) || { right: 0, n: 0, days: new Set() };
      p.right += scoreOf(a);
      p.n++;
      if (a.at) p.days.add(dayKey(a.at));
      perLevel.set(a.level, p);
    }
    const confirmed = placement ? (placement.demonstrated !== undefined ? placement.demonstrated : placement.level) : undefined;
    const est = RECEPTIVE.includes(skill) ? placementSkillEstimate(placement?.answers || [], skill, { confirmed }) : null;
    let r = est
      ? { level: est.level, source: 'placement', evidence: est.items, days: 1, provisional: true, capped: est.capped, ...(est.from ? { from: est.from, right: est.right } : {}) }
      : { level: null, source: null, evidence: 0, days: 0 };
    for (const l of LEVELS) {
      const p = perLevel.get(l);
      const shown = p && p.n >= EVIDENCE.items && p.right / p.n >= EVIDENCE.accuracy && p.days.size >= EVIDENCE.days;
      if (shown && (r.level == null || levelIndex(l) > levelIndex(r.level) || (l === r.level && r.provisional))) {
        r = { level: l, source: 'practice', evidence: p.n, days: p.days.size };
      }
    }
    if (r.level) {
      const p = perLevel.get(r.level);
      if (p && p.n >= 8 && p.right / p.n < 0.5) {
        r = r.level === LEVELS[0]
          ? { level: null, source: 'practice', evidence: p.n, days: p.days.size, notYet: r.level }
          : { level: LEVELS[levelIndex(r.level) - 1], source: 'practice', evidence: p.n, days: p.days.size, provisional: true, notYet: r.level };
      }
    }
    for (const l of [...LEVELS].reverse()) {
      const p = perLevel.get(l);
      if (!p || (r.level && !(levelIndex(l) > levelIndex(r.level) || (l === r.level && r.provisional)))) continue;
      if (p.n >= EVIDENCE.items && p.right / p.n >= EVIDENCE.accuracy && p.days.size >= EVIDENCE.days) continue;
      r = { ...r, collecting: { level: l, answers: p.n, right: p.right, pct: Math.round((p.right / p.n) * 100), days: p.days.size } };
      break;
    }
    const checks = byTime(attempts).filter((a) => a.source === 'checkpoint' && a.skill === skill && a.level && a.score !== null);
    const top = checks.reduce((best, a) => (levelIndex(a.level) > levelIndex(best) ? a.level : best), null);
    if (top) {
      const at = checks.filter((a) => a.level === top);
      const day = dayKey(at[at.length - 1].at);
      const last = at.filter((a) => dayKey(a.at) === day);
      r = { ...r, check: { level: top, answers: last.length, pct: Math.round((last.reduce((s, a) => s + scoreOf(a), 0) / last.length) * 100), day } };
    }
    out[skill] = r;
  }
  return out;
}
function refPeriodReport({ attempts = [], cards = [], progress = [], events = [], now = Date.now(), days = 7, extraSeconds = 0 }) {
  const since = now - days * DAY;
  const inP = (iso) => iso && new Date(iso).getTime() >= since && new Date(iso).getTime() <= now;
  const prevSince = since - days * DAY;
  const inPrev = (iso) => iso && new Date(iso).getTime() >= prevSince && new Date(iso).getTime() < since;
  const att = attempts.filter((a) => inP(a.at) && a.source !== 'placement');
  const prevAtt = attempts.filter((a) => inPrev(a.at) && a.source !== 'placement');
  const acc = (all) => { const list = firstTries(byTime(all)).filter((a) => a.score !== null && !essayFeedback(a)); return list.length ? list.reduce((s, a) => s + (a.score ?? (a.correct ? 1 : 0)), 0) / list.length : null; };
  const reviews = att.filter((a) => a.source === 'review');
  const probes = attempts.filter((a) => a.probe && inP(a.at));
  const minutes = Math.round((events.filter((e) => e.type === 'session' && inP(e.at)).reduce((s, e) => s + (e.seconds || 0), 0) + Math.max(0, extraSeconds)) / 60);
  const before = refTopicMastery(attempts.filter((a) => new Date(a.at).getTime() < since), since);
  const after = refTopicMastery(attempts, now);
  const improved = [...after.values()].filter((m) => m.evidence >= 3 && before.has(m.topic) && m.mastery - before.get(m.topic).mastery >= 0.1)
    .map((m) => ({ topic: m.topic, from: before.get(m.topic).mastery, to: m.mastery }));
  return {
    days,
    minutes,
    active_days: new Set(att.map((a) => dayKey(a.at))).size,
    lessons_completed: progress.filter((p) => isLessonId(p.id) && p.status === 'completed' && inP(p.completed_at)).length,
    exercises: att.length,
    accuracy: acc(att),
    accuracy_prev: acc(prevAtt),
    reviews: reviews.length,
    retention: acc(reviews),
    retention_30d: probes.length >= 5 ? acc(probes) : null,
    writing_sessions: new Set(events.filter((e) => WRITING_EVENTS.includes(e.type) && inP(e.at)).map((e) => `${dayKey(e.at)}|${e.exercise || ''}`)).size,
    words_started: cards.filter((c) => c.kind === 'meaning' && inP(c.created_at)).length,
    words_known: cards.filter((c) => c.kind === 'meaning' && !c._deleted && c.fsrs?.stability >= 21).length,
    improved,
    errors: errorProfile(attempts, now, { windowDays: days }),
  };
}

// ---------- the learners ----------
const root = new URL('../../', import.meta.url);
let L; let storeMod; let heavy; let light;
const snapshot = () => ({
  attempts: L.model().attempts, placement: L.model().placement,
  writing: storeMod.store.all('writing').map((w) => (w.last_evaluation ? { ...w, evaluation: w.last_evaluation } : w)),
  cards: storeMod.store.all('cards'), progress: storeMod.store.all('progress'), events: storeMod.store.all('events'),
});
before(async () => {
  globalThis.document = { documentElement: { dataset: {}, lang: 'he', dir: 'rtl' }, visibilityState: 'visible' };
  globalThis.addEventListener = () => {};
  globalThis.fetch = async (url) => {
    try { const body = await readFile(fileURLToPath(new URL(url, root)), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(body) }; } catch { return { ok: false, status: 404, json: async () => null }; }
  };
  storeMod = await import('../../js/core/store.js');
  await storeMod.openStore();
  globalThis.lucid = { store: storeMod.store };
  L = await import('../../js/core/learner.js');
  await L.initModel();
  // Light: an onboarded A1 learner after placement and one lesson's first answers.
  const PL = await import('../../js/core/placement.js');
  L.saveProfile({ onboarded: true, name: 'Light', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
  await L.applyPlacement(PL.selfReportResult('A1'));
  light = snapshot();
  const info = await seedHeavy({ base: root.href });
  assert.ok(info.attempts > 4000 && info.cards > 500, JSON.stringify(info));
  heavy = snapshot();
});

// The report time the boundary records below are placed around.
const AT = Date.UTC(2026, 9, 25, 12);
// A deterministic shuffle: the store returns records in key order (IndexedDB getAll), not in time order.
function shuffled(list, seed = 99) {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Extra records that reach the branches the seeds do not: level checks on two days, assessed essays, an attempt
// with no item id, timestamps that are not canonical (an offset, no milliseconds), placement answers, the same item
// answered twice on one day with different results, and records exactly on the report's period bounds. Then
// everything is shuffled.
function widen(s) {
  const t = (d, h) => new Date(Date.UTC(2026, 9, 1 + d, h)).toISOString();
  const checks = [];
  for (const [d, level] of [[3, 'A2'], [5, 'B1'], [5, 'B1']]) {
    for (const skill of ['grammar', 'vocabulary', 'reading', 'listening']) {
      for (let i = 0; i < 8; i++) checks.push({ id: `ck-${d}-${skill}-${i}-${level}`, at: t(d, 8 + (i % 3)), source: 'checkpoint', lesson: `check:${level}`, exercise: `c${i}`, skill, level, score: i % 4 ? 1 : 0, correct: Boolean(i % 4), topic: 'present-simple' });
    }
  }
  const odd = [
    { id: 'odd-1', at: '2026-10-20T10:00:00+03:00', source: 'lesson', lesson: 'a1-01', exercise: 'x1', skill: 'grammar', level: 'A1', score: 1, correct: true, topic: 'present-simple', error_type: 'tense' },
    { id: 'odd-2', at: '2026-10-21T10:00:00Z', source: 'review', exercise: 'x2', skill: 'vocabulary', level: 'A1', score: 0, correct: false, probe: true },
    { id: 'odd-3', at: '2026-10-22T10:00:00.000Z', source: 'drill', skill: 'grammar', level: 'A2', score: 1, correct: true, topic: 'articles' },
  ];
  const iso = (t) => new Date(t).toISOString();
  const bounds = [7, 30, 90].flatMap((days) => [AT, AT - days * DAY, AT - 2 * days * DAY, AT - days * DAY - 1, AT + 1]);
  bounds.forEach((t, i) => {
    odd.push({ id: `b-${i}`, at: iso(t), source: i % 3 ? 'lesson' : 'review', lesson: i % 3 ? 'a1-02' : null, exercise: `b${i % 4}`, skill: 'grammar', level: 'A1', score: i % 2, correct: Boolean(i % 2), topic: 'present-simple', probe: i % 2 === 0, error_type: i % 2 ? null : 'article', response: 'x' });
    odd.push({ id: `b2-${i}`, at: iso(t), source: 'lesson', lesson: 'a1-02', exercise: `b${i % 4}`, skill: 'grammar', level: 'A1', score: 1 - (i % 2), correct: !(i % 2), topic: 'present-simple' });
  });
  const events = [...s.events, ...bounds.map((t, i) => ({ id: `be-${i}`, at: iso(t), type: i % 2 ? 'session' : 'writing', seconds: 120, exercise: 'we-01' }))];
  const cards = [...s.cards, ...bounds.map((t, i) => ({ id: `v:bound${i}:meaning`, kind: 'meaning', created_at: iso(t), fsrs: { stability: 30 } }))];
  const progress = [...s.progress, ...bounds.map((t, i) => ({ id: `zz-${i}`, status: 'completed', completed_at: iso(t) }))];
  const writing = [
    ...s.writing,
    { id: 'wx1', kind: 'essay-summary', exercise: 'we-01', at: t(2, 9), evaluation: { cefr_estimate: 'B1' } },
    { id: 'wx2', kind: 'essay-version', exercise: 'we-02', final: true, at: t(4, 9), evaluation: { cefr_estimate: 'A2' } },
    { id: 'wx3', kind: 'essay-version', exercise: 'we-03', at: t(6, 9), evaluation: { cefr_estimate: 'C1' } },
  ];
  const placement = { level: 'A2', demonstrated: 'A2', answers: LEVELS.flatMap((level) => ['grammar', 'vocabulary', 'reading', 'listening'].flatMap((skill) => [{ skill, level, correct: true }, { skill, level, correct: levelIndex(level) < 3 }])) };
  return { ...s, attempts: shuffled([...s.attempts, ...checks, ...odd]), writing: shuffled(writing), placement, events: shuffled(events), cards, progress };
}

test('R2: skillLevels gives the pre-change output on the heavy and light learners (and the model uses it)', () => {
  for (const [name, s] of [['heavy', heavy], ['light', light], ['heavy+', widen(heavy)], ['light+', widen(light)], ['heavy shuffled', { ...heavy, attempts: shuffled(heavy.attempts, 5) }]]) {
    const args = { attempts: s.attempts, placement: s.placement, writing: s.writing };
    assert.deepEqual(skillLevels(args), refSkillLevels(args), name);
  }
  // model().skills is skillLevels of the model's own inputs, so the whole model is unchanged.
  assert.deepEqual(L.model().skills, refSkillLevels({ attempts: heavy.attempts, placement: heavy.placement, writing: heavy.writing }));
  assert.ok(Object.values(L.model().skills).some((x) => x.level), 'the heavy learner has a demonstrated level');
});

test('R7: periodReport gives the pre-change output for 7, 30 and 90 days on both learners', () => {
  const now = Date.now();
  for (const [name, s] of [['heavy', heavy], ['light', light], ['heavy+', widen(heavy)], ['light+', widen(light)]]) {
    for (const days of [7, 30, 90]) {
      for (const at of [now, now - 3 * DAY + 12_345, AT, AT + 0.5, now + 0.5]) {
        const args = { attempts: s.attempts, cards: s.cards, progress: s.progress, events: s.events, now: at, days, extraSeconds: 90 };
        assert.deepEqual(periodReport(args), refPeriodReport(args), `${name} ${days} days at ${at}`);
      }
    }
  }
  const r = periodReport({ ...heavy, now, days: 30 });
  assert.ok(r.exercises > 100 && r.minutes > 0, 'the heavy report is not empty');
});

test('R3: dayOf(x) equals todayKey(new Date(x)) for random canonical strings and for everything else', () => {
  let s = 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 10_000; i++) {
    const iso = new Date(Math.floor(rnd() * 253402300799999)).toISOString(); // year 1970-9999
    assert.equal(isCanonicalIso(iso), true, iso);
    assert.equal(dayOf(iso), todayKey(new Date(iso)), iso);
  }
  const others = [
    '2026-11-06T23:30:00+03:00', '2026-11-06T01:30:00-05:00', '2026-11-06T10:00:00Z', '2026-11-06T10:00Z', '2026-11-06',
    '2026-02-29T10:00:00.000Z', '2026-02-30T00:00:00.000Z', '2026-04-31T10:00:00.000Z', '2024-02-29T23:59:59.999Z', '2000-02-29T00:00:00.000Z',
    '1900-02-29T00:00:00.000Z', '2026-11-06T24:00:00.000Z', '2026-11-06t10:00:00.000z', '2026-11-06 10:00:00.000Z', 'Fri, 06 Nov 2026 22:00:00 GMT',
    new Date(Date.UTC(2026, 10, 6, 23, 59)), 1_762_473_600_000, '0000-01-01T00:00:00.000Z', null,
  ];
  for (const x of others) assert.equal(dayOf(x), todayKey(new Date(x)), String(x));
  assert.equal(isCanonicalIso('2026-02-30T00:00:00.000Z'), false, 'an impossible date takes the Date path (it rolls over)');
  // Invalid input still throws as todayKey(new Date(x)) did.
  for (const x of [undefined, 'not a date', '2026-13-01T00:00:00.000Z']) assert.throws(() => dayOf(x), RangeError, String(x));
});

test('R3: the learner\'s day checks agree with the Date path on the heavy learner', () => {
  const today = todayKey();
  const all = [...heavy.attempts, ...heavy.events].map((x) => x.at).concat(heavy.cards.map((c) => c.created_at), heavy.progress.map((p) => p.completed_at).filter(Boolean));
  for (const x of all) assert.equal(dayOf(x) === today, todayKey(new Date(x)) === today);
  // weekActivity: canonical timestamps compared as strings with the start of the week.
  for (const offset of [0, 2, 5]) {
    const now = new Date(Date.now() - offset * DAY);
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const old = new Set(storeMod.store.all('attempts').filter((a) => new Date(a.at) >= start).map((a) => todayKey(new Date(a.at)))).size;
    assert.equal(L.weekActivity(now).days, old, `week of ${now.toISOString()}`);
  }
});
