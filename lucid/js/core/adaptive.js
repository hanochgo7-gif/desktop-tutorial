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

// ---------- first tries ----------
// Evidence counts only the first answer to an item on a day. A retry at the end of a lesson comes seconds
// after the right answer was shown, and "Practise the ones I missed" or "Practise everything again" on the
// same day repeats answers just seen, so neither shows what the learner can do. The same item answered
// again on a later day is spaced retrieval and counts. Exercise ids are unique only inside their lesson,
// so the key includes the lesson. Answers with no item id (older records, tests) are all kept.
const itemKey = (a) => (a.exercise ? `${a.source || ''}|${a.lesson || ''}|${a.exercise}|${dayKey(a.at)}` : null);
export function firstTries(attempts) {
  const seen = new Set();
  return attempts.filter((a) => {
    if (a.retry) return false;
    const k = itemKey(a);
    if (!k) return true;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
const byTime = (list) => [...list].sort((a, b) => (String(a.at) < String(b.at) ? -1 : String(a.at) > String(b.at) ? 1 : 0));

// ---------- topic mastery ----------
// mastery = time-weighted accuracy with a neutral prior (Laplace), so two lucky answers are not
// "mastered". "mastered" also needs evidence on two different days (in-session accuracy alone is
// not mastery: research C1, D22 / what-not-to-build 10). Only first tries count (above).
// Feedback on an essay in the Writing lab (source "writing" with no lesson) is not an answer to an item:
// its mistakes feed recurring errors and its assessed drafts feed the writing level, but neither moves a
// topic, so a grammar slip in an essay never makes "argument structure" weak (persona finding R2-37).
// Auto-graded writing exercises run in the set player with their task as `lesson`, and count.
const essayFeedback = (a) => a.source === 'writing' && !a.lesson;
export function topicMastery(attempts, now = Date.now()) {
  const by = new Map();
  for (const a of firstTries(byTime(attempts))) {
    if (!a.topic || a.source === 'placement' || a.score === null || essayFeedback(a)) continue; // score null: practice, not evidence
    const t = by.get(a.topic) || { a: 0, n: 0, count: 0, days: new Set(), last: null, level: null };
    const w = weight(a.at, now);
    t.a += w * (a.score ?? (a.correct ? 1 : 0));
    t.n += w;
    t.count++;
    t.days.add(dayKey(a.at));
    if (!t.last || a.at > t.last) t.last = a.at;
    if (levelIndex(a.level) > levelIndex(t.level)) t.level = a.level; // the highest level it was practised at
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
// A level needs evidence for that skill, at that level (research C2, D1-D2; Companion Volume p. 29):
// - practice (lessons, drills, reviews): at least 6 first-try answers at level L (retries and same-day
//   redos do not count, see firstTries), 75%+ right, on at least 2 days;
// - placement: a first estimate only, from at least 2 placement questions at L in that skill (2 of 2, or
//   67%+ of more), and never above the overall level the test confirmed (two questions in one skill do
//   not outweigh two blocks). Multiple-choice placement items never establish C1 or C2: higher estimates
//   are capped at B2 and shown as "B2+";
// - writing: only final drafts of texts assessed by AI feedback (a draft still being revised never counts),
//   one per task, at least 2 tasks on 2 different days (median of the last 3, the lower of two);
// - speaking: Lucid does not assess speaking level yet (speech recognition never grades on its own), so it
//   stays "not yet assessed".
// Clear failure at the current level (under 50% over 8+ answers) lowers it one step, as a first estimate.
export const EVIDENCE = { items: 6, accuracy: 0.75, days: 2, placementItems: 2, placementAccuracy: 2 / 3, placementCap: 'B2', writingTasks: 2 };
export const RECEPTIVE = ['grammar', 'vocabulary', 'reading', 'listening'];
const scoreOf = (a) => a.score ?? (a.correct ? 1 : 0);

// First estimate for one skill from placement answers ({ level, skill, correct }). `confirmed` is the
// overall level the test confirmed (null when none was); the estimate never goes above it. When the shown
// level is lower than the level of the answers behind it, `from` says where they were ("B2+, 2 of 2 at C1").
export function placementSkillEstimate(answers = [], skill, { confirmed } = {}) {
  let best = null;
  for (const l of LEVELS) {
    const at = answers.filter((a) => a.skill === skill && a.level === l);
    const right = at.filter((a) => a.correct).length;
    if (at.length >= EVIDENCE.placementItems && right / at.length >= EVIDENCE.placementAccuracy - 1e-9) best = { level: l, items: at.length, right };
  }
  if (!best) return null;
  if (confirmed === null) return null; // the test confirmed no level: two answers in one skill do not set one
  const capped = levelIndex(best.level) > levelIndex(EVIDENCE.placementCap);
  let level = capped ? EVIDENCE.placementCap : best.level;
  const overall = confirmed !== undefined && levelIndex(level) > levelIndex(confirmed);
  if (overall) level = confirmed;
  const out = { level, items: best.items, capped: capped && !overall };
  if (level !== best.level) Object.assign(out, { from: best.level, right: best.right });
  return out;
}

function writingLevel(writing) {
  // One piece of evidence per task: its latest assessed version, once it is marked final (persona panel P-71).
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
  // The median; with two texts, the lower one (a cautious estimate).
  return { level: LEVELS[recent[Math.floor((recent.length - 1) / 2)]], source: 'assessed-writing', evidence: tasks.length, days };
}

export function skillLevels({ attempts = [], placement = null, writing = [] } = {}) {
  const out = {};
  for (const skill of SKILLS) {
    if (skill === 'speaking') { out[skill] = { level: null, source: null, evidence: 0, days: 0 }; continue; }
    if (skill === 'writing') { out[skill] = writingLevel(writing); continue; }
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
    out[skill] = r;
  }
  return out;
}

// ---------- the path ----------
export function lessonOrder(curriculum) {
  return curriculum.levels.flatMap((l) => l.lessons);
}
export const isDone = (p) => p && (p.status === 'completed' || p.status === 'placed_out');
// Curriculum lessons have plain ids ("b1-03"); scenarios ("rl:...") and level checks ("check:...") share
// the progress collection but are not lessons.
export const isLessonId = (id) => !String(id).includes(':');
const progressFor = (progressById, id) => progressById.get?.(id) ?? progressById[id];
// `available` = the lesson files that exist (content/manifest.json). An empty or missing set means unknown.
const isAvailable = (available, id) => !available || !available.size || available.has(id);

// The next lesson to take: the first one in order that is not done and has been written.
export function nextLesson(curriculum, progressById, available = null) {
  for (const l of lessonOrder(curriculum)) if (!isDone(progressFor(progressById, l.id)) && isAvailable(available, l.id)) return l;
  return null;
}

// Lessons still being written that the learner would otherwise have reached before `next`.
export function unwrittenAhead(curriculum, progressById, available, next) {
  const out = [];
  for (const l of lessonOrder(curriculum)) {
    if (next && l.id === next.id) break;
    if (!isDone(progressFor(progressById, l.id)) && !isAvailable(available, l.id)) out.push(l);
  }
  return out;
}

// Course level = the level of the next lesson. Distinct from demonstrated skill levels.
export function courseLevel(curriculum, progressById, available = null) {
  return (nextLesson(curriculum, progressById, available) || nextLesson(curriculum, progressById))?.level ?? 'C2';
}

// ---------- the daily plan ----------
// Blocks follow research C1 §10 (warm-up recall, due reviews, new learning, use it, exit check),
// scaled to the minutes the learner has today. Each block says why it is there. The lesson gets the time
// the other blocks leave (at least 5 minutes), so the plan fits the day; a long lesson is split.
const BUDGET = { 10: { review: 5, learn: 5 }, 20: { review: 6, learn: 10, use: 4 }, 35: { warm: 3, review: 10, learn: 10, use: 8, exit: 4 }, 50: { warm: 3, review: 12, learn: 15, practice: 6, use: 10, exit: 4 } };

// How much of a lesson fits today. Lessons take 15-25 minutes; when one does not fit, today's plan takes
// a part of it and the lesson's saved place (resume) carries the rest to the next day. The explanation
// counts as about two exercises of time. lesson = { minutes, exercises, done, doneToday, revisit }, counted
// the way the player counts (persona findings R2-17, N6, D7): exercises is the first-pass total, done the
// first-pass exercises answered, revisit the retries still waiting at the end, and doneToday the first-pass
// answers given today. Retries add time but never grow the total.
// How many exercise-sized slots a lesson's explanation and examples take: about 120 English words per slot
// (a learner reading carefully), at least 1 and at most 6. A heuristic for planning, not a measured rate.
export function introSlots(lesson) {
  const words = (v) => (typeof v === 'string' ? v.split(/\s+/).filter(Boolean).length : Array.isArray(v) ? v.reduce((a, x) => a + words(x), 0) : v && typeof v === 'object' ? Object.entries(v).reduce((a, [k, x]) => a + (k === 'he' ? 0 : words(x)), 0) : 0);
  const n = words(lesson?.explanation) + words(lesson?.examples);
  return Math.min(6, Math.max(1, Math.round(n / 120)));
}

export function lessonSlice(lesson, budget) {
  if (!lesson?.minutes || !lesson.exercises) return { today: budget, total: null, split: false, done: lesson?.done || 0, of: lesson?.exercises || 0, revisit: 0 };
  const n = lesson.exercises;
  const intro = lesson.intro ?? 2;
  const per = lesson.minutes / (n + intro);
  const done = Math.min(n, Math.max(0, lesson.done || 0));
  const revisit = Math.max(0, lesson.revisit || 0);
  const start = Math.max(0, done - (lesson.doneToday || 0)); // the position when today began
  const left = (from) => (from > 0 ? per * (n - from + revisit) : lesson.minutes);
  const remaining = Math.max(1, Math.round(left(done)));
  const k = Math.max(1, Math.floor((start > 0 ? budget : budget - intro * per) / per));
  const upto = Math.min(n, start + k);
  // It fits, or only the retries at the end would be left over: today is the rest of the lesson.
  if (left(start) <= budget + 2 || (start > 0 && upto >= n)) return { today: Math.max(1, Math.round(left(start))), total: lesson.minutes, remaining, split: false, done, of: n, revisit };
  return { today: budget, total: lesson.minutes, remaining, split: true, done, of: n, revisit, upto, partDone: done >= upto && done < n };
}

// About how long a Writing lab task takes, so a plan never budgets a 250-word text as 4 minutes (persona
// finding R2-16): planning, writing and a quick check of the middle of the word range at about 5 words a
// minute up to A2, 7 at B1-B2 and 9 from C1 (an exam pace, such as 250 words in 40 minutes), or half a
// minute per item for a set of sentence exercises. A heuristic, not a measured rate.
export function writingMinutes(task) {
  if (!task) return null;
  if (task.items?.length && !task.min_words) return Math.max(2, Math.round(task.items.length / 2));
  const lo = task.word_range?.[0] ?? task.min_words;
  const hi = task.word_range?.[1] ?? task.max_words ?? lo;
  if (!lo) return null;
  const i = levelIndex(task.level);
  const pace = i <= levelIndex('A2') ? 5 : i <= levelIndex('B2') ? 7 : 9;
  return Math.max(5, Math.round((lo + hi) / 2 / pace / 5) * 5);
}

// Goals shape the "use it" block, only where Lucid has content for them: travel and conversation pick a
// real-life scenario (travel: airport, hotel and emergencies first), exams and academic writing pick
// reading and writing. Work picks workplace scenarios (content/real-life, module "work"); without any, a work goal
// alone would leave the default mix.
export const GOAL_KINDS = { travel: ['speaking'], conversation: ['speaking'], work: ['speaking'], studies: ['reading', 'writing'], writing: ['writing', 'reading'] };
export const SCENARIO_MODULES = { travel: ['airport', 'hotel', 'emergency', 'transport', 'restaurant', 'shopping'], conversation: ['social'], work: ['work'] };

// The next real-life scenario for the learner's goals: not done yet, at or below their level, in goal order.
export function pickScenario(scenarios = [], { level = 'A1', goals = [], done = new Set() } = {}) {
  const modules = goals.flatMap((g) => SCENARIO_MODULES[g] || []);
  const rank = (s) => modules.indexOf(s.module);
  const fit = scenarios.filter((s) => rank(s) >= 0 && levelIndex(s.level) >= 0 && levelIndex(s.level) <= levelIndex(level) && !done.has(s.id));
  fit.sort((a, b) => rank(a) - rank(b) || levelIndex(b.level) - levelIndex(a.level));
  return fit[0] || null;
}

// The next writing-lab task at or below the learner's level that has not had feedback yet. A task with a
// draft in progress (`started`) comes first, so a text begun on one day is picked up on the next.
export function pickWritingTask(tasks = [], { level = 'A1', done = new Set(), started = new Set() } = {}) {
  const fit = tasks.filter((t) => levelIndex(t.level) >= 0 && levelIndex(t.level) <= levelIndex(level) && !done.has(t.id));
  fit.sort((a, b) => Number(started.has(b.id)) - Number(started.has(a.id)) || levelIndex(b.level) - levelIndex(a.level) || (a.stage ?? 0) - (b.stage ?? 0));
  return fit[0] || null;
}

// today = what the learner already did today: { scenarios, tasks, drills (Sets of ids; drills as
// "error:x" or "topic:y"), scenario and writingTask (the ones done today, as objects), reading, speaking,
// writing (booleans) }. A block is ticked only for what was really done (persona finding R2-27): once a goal's
// kind was practised today, the block shows that scenario or task, ticked, instead of moving on to the next.
function useBlock({ minutes, level, goals, last, scenario, writingTask, today = {} }) {
  const beginner = levelIndex(level) <= levelIndex('A1');
  const speaking = (goal, sc = scenario, done = false) => (sc
    ? { id: 'use', kind: 'speaking', minutes, route: `scenario/${sc.id}`, scenario: sc.id, goal, why: 'scenario', done }
    : { id: 'use', kind: 'speaking', minutes, route: beginner ? 'speaking' : 'real-life', goal, why: 'speak', done: Boolean(today.speaking) });
  const writing = (goal, tk = writingTask, done = false) => {
    const total = writingMinutes(tk);
    // A text longer than the block: today is a part (the editor saves the draft as the learner types).
    const part = Boolean(total && total > minutes + 1);
    return { id: 'use', kind: 'writing', minutes: total && !part ? Math.min(minutes, total) : minutes, route: tk ? `writing/${tk.id}` : 'writing', task: tk?.id, goal, why: 'write', total, part, started: Boolean(tk?.started), done: tk ? done : Boolean(today.writing) };
  };
  const byKind = {
    speaking,
    writing,
    reading: (goal) => ({ id: 'use', kind: 'reading', minutes, route: 'reading', goal, why: 'read', done: Boolean(today.reading) }),
  };
  // Work counts only when there is a workplace scenario to practise.
  const active = level === 'PreA1' ? [] : goals.filter((g) => GOAL_KINDS[g] && (g !== 'work' || scenario?.module === 'work' || today.scenario?.module === 'work'));
  const kinds = [...new Set(active.flatMap((g) => GOAL_KINDS[g]))];
  if (kinds.length) {
    const goalOf = (kind) => active.find((g) => GOAL_KINDS[g].includes(kind));
    const modules = active.flatMap((g) => SCENARIO_MODULES[g] || []);
    if (kinds.includes('speaking') && today.scenario && modules.includes(today.scenario.module)) return speaking(goalOf('speaking'), today.scenario, true);
    if (kinds.includes('writing') && today.writingTask) return writing(goalOf('writing'), today.writingTask, true);
    if (kinds.includes('reading') && today.reading) return byKind.reading(goalOf('reading'));
    // Rotate between the goal's kinds: the one practised least recently comes first.
    const kind = [...kinds].sort((a, b) => (last[a] || '').localeCompare(last[b] || ''))[0];
    return byKind[kind](goalOf(kind));
  }
  const speakDue = !last.speaking || (last.writing && last.speaking < last.writing);
  return speakDue || beginner ? speaking(null) : byKind.writing(null);
}

// The targeted-practice focus: a recurring mistake first, then a weak topic that can be practised. A weak
// topic carries `route` when the caller knows where it can be practised: a drill when lessons have exercises
// for it, a scenario for the real-life topics, or null when nothing can fill it, and then it is not planned
// (persona finding R2-24: a block must never open an empty page). A topic practised only more than one level
// below the course level is not planned either (R2-37): recurring mistakes cover what an advanced learner
// still gets wrong.
function practiceFocus({ recurring, weak, level }) {
  if (recurring[0]?.error_type) return { kind: 'error', id: recurring[0].error_type, route: `drill?error=${recurring[0].error_type}` };
  const w = weak.find((x) => x.route !== null && (!x.level || levelIndex(x.level) >= levelIndex(level) - 1));
  if (!w) return null;
  if (w.scenario) return { kind: 'scenario', id: w.topic, scenario: w.scenario, route: w.route || `scenario/${w.scenario}` };
  return { kind: 'topic', id: w.topic, route: w.route || `drill?topic=${w.topic}` };
}

export function dailyPlan({
  minutes = 35, now = Date.now(), dueCount = 0, warmupCount = 0, todayNewCount = 0,
  next = null, weak = [], recurring = [], lastSpeakingAt = null, lastWritingAt = null, lastReadingAt = null, level = 'PreA1',
  goals = [], lesson = null, scenario = null, writingTask = null, skipped = [], today = {},
} = {}) {
  const blocks = [];
  const add = (b) => blocks.push(b);
  const plan = BUDGET[[10, 20, 35, 50].reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best), 35)];

  if (plan.warm && warmupCount > 0) add({ id: 'warmup', minutes: plan.warm, count: Math.min(warmupCount, 8), route: 'review?mode=warmup', why: 'warmup' });
  if (dueCount > 0) add({ id: 'review', minutes: plan.review, count: Math.min(dueCount, Math.round(plan.review * 6)), route: 'review', why: 'review' });
  const learnAt = blocks.length; // the lesson goes here; its time is what the other blocks leave
  const focus = practiceFocus({ recurring, weak, level });
  if (focus && (plan.practice || plan.use)) {
    const { route, ...f } = focus;
    const done = focus.kind === 'scenario' ? Boolean(today.scenarios?.has(focus.scenario)) : Boolean(today.drills?.has(`${focus.kind}:${focus.id}`));
    add({ id: 'practice', minutes: plan.practice || 4, focus: f, route, why: 'practice', done });
  }
  if (plan.use) add(useBlock({ minutes: plan.use, level, goals, last: { speaking: lastSpeakingAt, writing: lastWritingAt, reading: lastReadingAt }, scenario, writingTask, today }));
  if (plan.exit && todayNewCount > 0) add({ id: 'exit', minutes: plan.exit, count: todayNewCount, route: 'review?mode=exit', why: 'exit' });
  if (next) {
    const others = blocks.reduce((a, b) => a + b.minutes, 0);
    const budget = Math.max(5, Math.min(plan.learn + (dueCount ? 0 : plan.review), minutes - others));
    // A lesson that ended "Nearly there" is finished by redoing only the missed exercises (persona findings
    // R2-02, R2-25), unless a run of it is in progress.
    const missed = !lesson?.resumable && lesson?.missed?.count ? lesson.missed : null;
    const slice = missed
      ? { today: Math.max(1, missed.minutes), total: lesson.minutes || null, split: false, done: 0, of: lesson.exercises || 0, revisit: 0, missed: missed.count }
      : lessonSlice(lesson, budget);
    const route = lesson?.resumable ? `lesson/${next.id}?resume=1` : missed ? `lesson/${next.id}?stage=missed` : `lesson/${next.id}`;
    blocks.splice(learnAt, 0, {
      id: 'learn', minutes: slice.today, lesson: next.id, route, why: 'learn', resume: Boolean(lesson?.resumable), missed: missed?.count || 0,
      step: lesson?.step || null, missedRun: Boolean(lesson?.missedRun), slice, skipped: skipped.map((l) => l.id),
    });
  }
  if (!blocks.length) add({ id: 'learn', minutes, route: next ? `lesson/${next.id}` : 'writing', lesson: next?.id, why: next ? 'learn' : 'write' });
  return { minutes: blocks.reduce((a, b) => a + b.minutes, 0), blocks };
}

// ---------- reports ----------
// extraSeconds: active time in the session that is still open (sessions are logged when they end).
export function periodReport({ attempts = [], cards = [], progress = [], events = [], now = Date.now(), days = 7, extraSeconds = 0 }) {
  const since = now - days * DAY;
  const inP = (iso) => iso && new Date(iso).getTime() >= since && new Date(iso).getTime() <= now;
  const prevSince = since - days * DAY;
  const inPrev = (iso) => iso && new Date(iso).getTime() >= prevSince && new Date(iso).getTime() < since;
  const att = attempts.filter((a) => inP(a.at) && a.source !== 'placement');
  const prevAtt = attempts.filter((a) => inPrev(a.at) && a.source !== 'placement');
  // Accuracy is first-try accuracy: retries and same-day redos are left out (firstTries), and so is essay
  // feedback, where each mistake the AI found is a record of its own, not a wrong answer.
  const acc = (all) => { const list = firstTries(byTime(all)).filter((a) => a.score !== null && !essayFeedback(a)); return list.length ? list.reduce((s, a) => s + (a.score ?? (a.correct ? 1 : 0)), 0) / list.length : null; };
  const reviews = att.filter((a) => a.source === 'review');
  // Retention = share of due reviews answered correctly (what the scheduler is meant to keep near the target).
  const probes = attempts.filter((a) => a.probe && inP(a.at));
  const minutes = Math.round((events.filter((e) => e.type === 'session' && inP(e.at)).reduce((s, e) => s + (e.seconds || 0), 0) + Math.max(0, extraSeconds)) / 60);
  const before = topicMastery(attempts.filter((a) => new Date(a.at).getTime() < since), since);
  const after = topicMastery(attempts, now);
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
    words_started: cards.filter((c) => c.kind === 'meaning' && inP(c.created_at)).length,
    words_known: cards.filter((c) => c.kind === 'meaning' && !c._deleted && c.fsrs?.stability >= 21).length,
    improved,
    errors: errorProfile(attempts, now, { windowDays: days }),
  };
}
