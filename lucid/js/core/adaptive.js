// The learner model: what the learner has mastered, which mistakes recur, which CEFR level each
// skill has demonstrated, and what to do today. Everything is computed from recorded attempts, so
// it can be audited and recomputed; nothing is assigned by time spent or lessons clicked through.

export const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const SKILLS = ['vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing'];
const DAY = 86_400_000;
const dayKey = (iso) => String(iso).slice(0, 10);
export const levelIndex = (l) => LEVELS.indexOf(l);

// Recent evidence counts more: an attempt's weight halves every 21 days.
const weight = (at, now) => 0.5 ** (Math.max(0, now - new Date(at).getTime()) / DAY / 21);

// ---------- topic mastery ----------
// mastery = time-weighted accuracy with a neutral prior (Laplace), so two lucky answers are not
// "mastered". "mastered" also needs evidence on two different days (in-session accuracy alone is
// not mastery: research C1, D22 / what-not-to-build 10).
export function topicMastery(attempts, now = Date.now()) {
  const by = new Map();
  for (const a of attempts) {
    if (!a.topic || a.source === 'placement') continue;
    const t = by.get(a.topic) || { a: 0, n: 0, count: 0, days: new Set(), last: null };
    const w = weight(a.at, now);
    t.a += w * (a.score ?? (a.correct ? 1 : 0));
    t.n += w;
    t.count++;
    t.days.add(dayKey(a.at));
    if (!t.last || a.at > t.last) t.last = a.at;
    by.set(a.topic, t);
  }
  const out = new Map();
  for (const [topic, t] of by) {
    const mastery = (t.a + 1) / (t.n + 2);
    let status = 'practising';
    if (mastery < 0.6) status = 'learning';
    else if (mastery >= 0.85 && t.count >= 6 && t.days.size >= 2) status = 'mastered';
    out.set(topic, { topic, mastery, evidence: t.count, days: t.days.size, last: t.last, status });
  }
  return out;
}

export function weakTopics(mastery, { limit = 5 } = {}) {
  return [...mastery.values()].filter((m) => m.evidence >= 3 && m.mastery < 0.7).sort((a, b) => a.mastery - b.mastery).slice(0, limit);
}

// ---------- recurring errors ----------
export function errorProfile(attempts, now = Date.now(), { windowDays = 30 } = {}) {
  const since = now - windowDays * DAY;
  const half = now - 14 * DAY;
  const by = new Map();
  for (const a of attempts) {
    if (!a.error_type || new Date(a.at).getTime() < since) continue;
    const e = by.get(a.error_type) || { error_type: a.error_type, count: 0, days: new Set(), recent: 0, earlier: 0, examples: [] };
    e.count++;
    e.days.add(dayKey(a.at));
    if (new Date(a.at).getTime() >= half) e.recent++; else e.earlier++;
    if (a.response && e.examples.length < 3) e.examples.push({ response: a.response, ref: a.exercise, at: a.at });
    by.set(a.error_type, e);
  }
  return [...by.values()].map((e) => ({
    error_type: e.error_type,
    count: e.count,
    days: e.days.size,
    recurring: e.count >= 3 && e.days.size >= 2,
    trend: e.earlier === 0 ? (e.recent ? 'new' : 'steady') : e.recent < e.earlier * 0.6 ? 'improving' : e.recent > e.earlier * 1.4 ? 'worsening' : 'steady',
    examples: e.examples,
  })).sort((a, b) => b.count - a.count);
}

// ---------- demonstrated level per skill ----------
// A skill demonstrates level L when attempts at L reach >= 75% accuracy over >= 6 items.
// Placement provides the starting estimate; later evidence can raise it, and clear failure at
// the estimated level (< 50% over >= 8 items) lowers it. Writing uses assessed texts only.
export function skillLevels({ attempts = [], placement = null, writing = [] } = {}) {
  const out = {};
  for (const skill of SKILLS) {
    const perLevel = new Map();
    for (const a of attempts) {
      if (a.skill !== skill || !a.level || a.source === 'placement') continue;
      const p = perLevel.get(a.level) || { right: 0, n: 0 };
      p.right += a.score ?? (a.correct ? 1 : 0);
      p.n++;
      perLevel.set(a.level, p);
    }
    let level = placement?.skills?.[skill]?.level ?? placement?.level ?? null;
    let source = level ? 'placement' : null;
    let evidence = placement?.skills?.[skill]?.items ?? 0;
    for (const l of LEVELS) {
      const p = perLevel.get(l);
      if (p && p.n >= 6 && p.right / p.n >= 0.75 && (level == null || levelIndex(l) > levelIndex(level))) {
        level = l; source = 'practice'; evidence = p.n;
      }
    }
    if (level) {
      const p = perLevel.get(level);
      if (p && p.n >= 8 && p.right / p.n < 0.5) {
        level = LEVELS[Math.max(0, levelIndex(level) - 1)]; source = 'practice'; evidence = p.n;
      }
    }
    if (skill === 'writing') {
      const assessed = writing.filter((w) => w.evaluation?.cefr_estimate && w.evaluation.cefr_estimate !== 'below_PreA1').slice(-3);
      if (assessed.length) {
        const sorted = assessed.map((w) => levelIndex(w.evaluation.cefr_estimate)).sort((a, b) => a - b);
        level = LEVELS[sorted[Math.floor(sorted.length / 2)]]; source = 'assessed-writing'; evidence = assessed.length;
      }
    }
    out[skill] = { level, source, evidence };
  }
  return out;
}

// ---------- the path ----------
export function lessonOrder(curriculum) {
  return curriculum.levels.flatMap((l) => l.lessons);
}
export const isDone = (p) => p && (p.status === 'completed' || p.status === 'placed_out');

export function nextLesson(curriculum, progressById) {
  for (const l of lessonOrder(curriculum)) if (!isDone(progressById.get?.(l.id) ?? progressById[l.id])) return l;
  return null;
}

// Course level = the level of the next lesson. Distinct from demonstrated skill levels.
export function courseLevel(curriculum, progressById) {
  return nextLesson(curriculum, progressById)?.level ?? 'C2';
}

// ---------- the daily plan ----------
// Blocks follow research C1 §10 (warm-up recall, due reviews, new learning, use it, exit check),
// scaled to the minutes the learner has today. Each block says why it is there.
export function dailyPlan({
  minutes = 35, now = Date.now(), dueCount = 0, warmupCount = 0, todayNewCount = 0,
  next = null, weak = [], recurring = [], lastSpeakingAt = null, lastWritingAt = null, level = 'PreA1',
} = {}) {
  const blocks = [];
  const add = (b) => blocks.push(b);
  const budget = { 10: { review: 5, learn: 5 }, 20: { review: 6, learn: 10, use: 4 }, 35: { warm: 3, review: 10, learn: 10, use: 8, exit: 4 }, 50: { warm: 3, review: 12, learn: 15, practice: 6, use: 10, exit: 4 } };
  const plan = budget[[10, 20, 35, 50].reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best), 35)];

  if (plan.warm && warmupCount > 0) add({ id: 'warmup', minutes: plan.warm, count: Math.min(warmupCount, 8), route: 'review?mode=warmup', why: 'warmup' });
  if (dueCount > 0) add({ id: 'review', minutes: plan.review, count: Math.min(dueCount, Math.round(plan.review * 6)), route: 'review', why: 'review' });
  if (next) add({ id: 'learn', minutes: plan.learn + (dueCount ? 0 : plan.review), lesson: next.id, route: `lesson/${next.id}`, why: 'learn' });
  const focus = recurring[0]?.error_type ? { kind: 'error', id: recurring[0].error_type } : weak[0] ? { kind: 'topic', id: weak[0].topic } : null;
  if (focus && (plan.practice || plan.use)) {
    add({ id: 'practice', minutes: plan.practice || 4, focus, route: focus.kind === 'error' ? `practice?error=${focus.id}` : `practice?topic=${focus.id}`, why: 'practice' });
  }
  if (plan.use) {
    const speakDue = !lastSpeakingAt || (lastWritingAt && lastSpeakingAt < lastWritingAt);
    const beginner = levelIndex(level) <= levelIndex('A1');
    add(speakDue || beginner
      ? { id: 'use', kind: 'speaking', minutes: plan.use, route: beginner ? 'speaking' : 'real-life', why: 'speak' }
      : { id: 'use', kind: 'writing', minutes: plan.use, route: 'writing', why: 'write' });
  }
  if (plan.exit && todayNewCount > 0) add({ id: 'exit', minutes: plan.exit, count: todayNewCount, route: 'review?mode=exit', why: 'exit' });
  if (!blocks.length) add({ id: 'learn', minutes, route: next ? `lesson/${next.id}` : 'writing', lesson: next?.id, why: next ? 'learn' : 'write' });
  return { minutes: blocks.reduce((a, b) => a + b.minutes, 0), blocks };
}

// ---------- reports ----------
export function periodReport({ attempts = [], cards = [], progress = [], events = [], now = Date.now(), days = 7 }) {
  const since = now - days * DAY;
  const inP = (iso) => iso && new Date(iso).getTime() >= since;
  const prevSince = since - days * DAY;
  const inPrev = (iso) => iso && new Date(iso).getTime() >= prevSince && new Date(iso).getTime() < since;
  const att = attempts.filter((a) => inP(a.at) && a.source !== 'placement');
  const prevAtt = attempts.filter((a) => inPrev(a.at) && a.source !== 'placement');
  const acc = (list) => (list.length ? list.reduce((s, a) => s + (a.score ?? (a.correct ? 1 : 0)), 0) / list.length : null);
  const reviews = att.filter((a) => a.source === 'review');
  // Retention = share of due reviews answered correctly (what the scheduler is meant to keep near the target).
  const probes = attempts.filter((a) => a.probe && inP(a.at));
  const minutes = Math.round(events.filter((e) => e.type === 'session' && inP(e.at)).reduce((s, e) => s + (e.seconds || 0), 0) / 60);
  const before = topicMastery(attempts.filter((a) => new Date(a.at).getTime() < since), since);
  const after = topicMastery(attempts, now);
  const improved = [...after.values()].filter((m) => m.evidence >= 3 && before.has(m.topic) && m.mastery - before.get(m.topic).mastery >= 0.1)
    .map((m) => ({ topic: m.topic, from: before.get(m.topic).mastery, to: m.mastery }));
  return {
    days,
    minutes,
    active_days: new Set(att.map((a) => dayKey(a.at))).size,
    lessons_completed: progress.filter((p) => p.status === 'completed' && inP(p.completed_at)).length,
    exercises: att.length,
    accuracy: acc(att),
    accuracy_prev: acc(prevAtt),
    reviews: reviews.length,
    retention: acc(reviews),
    retention_30d: probes.length >= 5 ? acc(probes) : null,
    words_started: cards.filter((c) => c.kind === 'meaning' && inP(c.created_at)).length,
    words_known: cards.filter((c) => c.kind === 'meaning' && !c._deleted && c.fsrs?.stability >= 21).length,
    improved,
    errors: errorProfile(attempts, now, { windowDays: days }),
  };
}
