// The learner's state, built on the local store: profile, settings, attempts, lesson progress,
// spaced-repetition cards and the derived learner model. Views call these functions instead of
// touching collections directly, so every recorded action feeds the adaptive engine the same way.
import { store } from './store.js';
import { uid, todayKey } from './util.js';
import { content } from './content.js';
import { topicMastery, weakTopics, errorProfile, skillLevels, nextLesson, courseLevel, unwrittenAhead, dailyPlan, lessonOrder, isLessonId, pickScenario, pickWritingTask, firstTries, introSlots, LEVELS, levelIndex } from './adaptive.js';
import { vocabCardsFor, newCard, unlockedFormCards, review as reviewCard, dueCards, newItemsBudget, gradeFrom } from './srs.js';
import { setHebrewSupport } from './i18n.js';
import { START_FOR, selfReportResult } from './placement.js';

export const DEFAULT_SETTINGS = {
  id: 'me',
  theme: 'system',            // system | light | dark
  hebrew_support: 'auto',     // auto | full | partial | minimal | off
  retention: 'standard',      // light 0.85 | standard 0.90 | exam 0.95
  new_per_day: 8,
  daily_minutes: 20,
  corrections: 'standard',    // off | light | standard | intensive (AI tutor and roleplay)
  feedback_scope: 'auto',     // auto | focused | comprehensive (writing feedback)
  english_variant: 'any',     // any | US | UK (speech voice and roleplay)
  speech_rate: 0.95,
  text_size: 100,             // 100 | 115 | 130 | 150 (%)
  weekly_goal_days: 5,
  ai_consent: false,
  sound: true,
};

export const profile = () => store.get('profile', 'me');
export const settings = () => ({ ...DEFAULT_SETTINGS, ...(store.get('settings', 'me') || {}) });
export const hasProfile = () => Boolean(profile()?.onboarded);

export function saveProfile(patch) { return store.update('profile', 'me', { ...patch }); }
export function saveSettings(patch) {
  const s = store.update('settings', 'me', { ...patch });
  applySupport();
  return s;
}

// Hebrew support ('auto') follows the level the learner has shown, never above the course level (R2-06,
// i18n supportLevel), so it is re-applied whenever either can move: at boot, on settings changes, after
// placement or a level move, and when lesson progress changes.
let supportLevel = null;
export function applySupport() {
  supportLevel = supportKey();
  setHebrewSupport(settings().hebrew_support, currentCourseLevel(), shownLevel());
}
// The level the learner has shown: the placement test's confirmed level (or the level they chose themselves),
// raised by the highest level of a completed lesson.
export function shownLevel() {
  const pl = store.get('placement', 'latest');
  const done = store.all('progress').filter((p) => isLessonId(p.id) && p.status === 'completed').map((p) => levelIndex(p.level));
  const i = Math.max(-1, levelIndex(pl?.skipped ? pl.start_level : pl?.demonstrated), ...done);
  return i >= 0 ? LEVELS[i] : null;
}
const supportKey = () => `${currentCourseLevel()}|${shownLevel()}`;

// ---------- attempts ----------
// One record per answered item. Feeds mastery, recurring errors, skill levels and reports.
export function recordAttempt(a) {
  const rec = {
    id: uid('at'),
    at: new Date().toISOString(),
    source: a.source || 'lesson',
    lesson: a.lesson || null,
    exercise: a.exercise || null,
    topic: a.topic || null,
    skill: a.skill || null,
    level: a.level || null,
    correct: Boolean(a.correct),
    // score null = practice that is never scored (speaking, writing in lessons): kept as null, so the
    // learner model leaves it out (adaptive.js). Missing scores default to right/wrong.
    score: a.score === null ? null : a.score ?? (a.correct ? 1 : 0),
    error_type: a.correct ? null : a.error_type || null,
    hint_used: Boolean(a.hint_used),
    latency_ms: a.latency_ms ?? null,
    response: a.response != null ? String(a.response).slice(0, 300) : null,
    probe: Boolean(a.probe),
  };
  store.put('attempts', rec);
  return rec;
}

// ---------- lessons ----------
// store.get hides deleted records, so a lesson whose placed-out marker was removed reads as not started.
export const progressOf = (lessonId) => store.get('progress', lessonId);
export function progressMap() { return new Map(store.all('progress').map((p) => [p.id, p])); }
// A progress write means the lesson exists for the learner: it never carries a deletion mark forward.
function putProgress(rec) {
  const { _deleted, ...clean } = rec;
  return store.put('progress', clean);
}

export function startLesson(lesson) {
  // Opening a placed-out lesson to revise it leaves it placed out, so the course level does not move back.
  if (!progressOf(lesson.id)) putProgress({ id: lesson.id, level: lesson.level, status: 'started', started_at: new Date().toISOString(), attempts: 0 });
}

export function finishLesson(lesson, { score, passed }) {
  const cur = progressOf(lesson.id) || { id: lesson.id, status: 'started' };
  const now = new Date();
  const wasDone = cur.status === 'completed';
  // A pass completes the lesson, also one that was placed out. A miss leaves a placed-out lesson placed
  // out (the learner chooses whether to move their level; see the path).
  const status = passed || wasDone ? 'completed' : cur.status === 'placed_out' ? 'placed_out' : 'started';
  putProgress({
    ...cur,
    id: lesson.id,
    level: lesson.level,
    status,
    best_score: Math.max(cur.best_score || 0, score),
    last_score: score,
    attempts: (cur.attempts || 0) + 1,
    completed_at: passed && !wasDone ? now.toISOString() : cur.completed_at || null,
  });
  // New vocabulary enters spaced repetition once the lesson is passed, at the daily new-word limit.
  if (passed) addVocabCards(lesson, now);
  logEvent({ type: 'lesson', lesson: lesson.id, score, passed });
}

// New words enter review at the daily new-word limit (the workload governor, research C1-D3): the first
// ones today, the rest queued for the next days, so a long word list never floods one session.
const utcDay = (d, plus) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + plus));
function introductionDates(n, cards, now) {
  const base = settings().new_per_day;
  const perDay = Math.max(1, Math.min(base, newItemsBudget(cards, { base, now })));
  const count = new Map();
  for (const c of cards) if (c.kind === 'meaning' && !c._deleted && c.created_at) count.set(c.created_at.slice(0, 10), (count.get(c.created_at.slice(0, 10)) || 0) + 1);
  const out = [];
  for (let d = 0; out.length < n && d < 400; d++) {
    const date = d === 0 ? now : utcDay(now, d);
    const k = todayKey(date);
    for (let free = perDay - (count.get(k) || 0); free > 0 && out.length < n; free--) { out.push(date); count.set(k, (count.get(k) || 0) + 1); }
  }
  return out;
}

export function addVocabCards(lesson, now = new Date()) {
  const cards = store.all('cards', { includeDeleted: true });
  const fresh = vocabCardsFor(lesson, cards, now);
  const dates = introductionDates(fresh.length, cards, now);
  fresh.forEach((c, i) => {
    const card = !dates[i] || dates[i] === now ? c : newCard({ id: c.id, kind: c.kind, ref: c.ref }, dates[i]);
    store.put('cards', { ...card, payload: (lesson.vocab || []).find((v) => `v:${v.word.toLowerCase()}:meaning` === c.id) });
  });
  return fresh.length;
}

// Learners placed above the early levels: the words of placed-out lessons enter review on request
// (queued at the daily limit like any other new words).
export function placedOutLessons(level) {
  if (!curriculum) return [];
  return lessonOrder(curriculum).filter((l) => l.level === level && progressOf(l.id)?.status === 'placed_out' && (!available.size || available.has(l.id)));
}
export function canImportVocab(level) {
  const ids = new Set(placedOutLessons(level).map((l) => l.id));
  return ids.size > 0 && !store.all('cards', { includeDeleted: true }).some((c) => ids.has(c.ref?.lesson));
}
// The highest level the learner placed out of, when its words are not in review yet.
export function vocabImportLevel() {
  if (!curriculum) return null;
  const levels = new Set(lessonOrder(curriculum).filter((l) => progressOf(l.id)?.status === 'placed_out').map((l) => l.level));
  const top = [...levels].sort((a, b) => levelIndex(b) - levelIndex(a))[0];
  return top && canImportVocab(top) ? top : null;
}
export async function importPlacedOutVocab(level) {
  let added = 0;
  for (const l of placedOutLessons(level)) {
    const lesson = await content.lesson(l.id);
    if (lesson) added += addVocabCards(lesson);
  }
  logEvent({ type: 'vocab-import', level, added });
  return added;
}

// ---------- placement and level ----------
// The test saves its answers as it goes, so an interrupted placement can be resumed or restarted.
export const placementDraft = () => store.get('placement', 'inprogress');
export function savePlacementDraft({ start, answers }) { store.put('placement', { id: 'inprogress', start, answers, at: new Date().toISOString() }); }
export function clearPlacementDraft() { if (placementDraft()) store.remove('placement', 'inprogress'); }
// Onboarded, chose to take the test, has no result yet (left before the end, or never began) and has not
// completed a lesson since (a learner who is already working through the path is not sent back to the test).
export function placementPending() {
  const p = profile();
  if (!p?.onboarded || !p.start_choice || p.start_choice === 'zero' || store.get('placement', 'latest')) return false;
  return !store.all('progress').some((x) => isLessonId(x.id) && x.status === 'completed');
}
// The level the learner picked in onboarding (their own estimate), e.g. "simple conversations" = A2.
export const selfReportLevel = () => START_FOR[profile()?.start_choice] || null;

// After placement (or a retake): lessons below the start level are "placed out" (available, not required).
export async function applyPlacement(result) {
  store.put('placement', { id: 'latest', ...result, at: new Date().toISOString() });
  clearPlacementDraft();
  await setStartLevel(result.start_level);
  saveProfile({ start_level: result.start_level });
}
// Learner-controlled level move (placement is provisional; research C2, D8).
export async function moveToLevel(level) {
  // Choosing a level settles an unfinished placement: the choice is recorded as the learner's own estimate.
  if (!store.get('placement', 'latest')) { store.put('placement', { id: 'latest', ...selfReportResult(level), at: new Date().toISOString() }); clearPlacementDraft(); }
  await setStartLevel(level);
  logEvent({ type: 'level-move', level });
}
async function setStartLevel(level) {
  const cur = curriculum || await content.curriculum();
  const target = levelIndex(level);
  for (const l of lessonOrder(cur)) {
    const p = progressOf(l.id);
    if (levelIndex(l.level) < target) {
      if (!p || (p.status !== 'completed' && p.status !== 'placed_out')) putProgress({ ...(p || {}), id: l.id, level: l.level, status: 'placed_out' });
    } else if (p?.status === 'placed_out') {
      // Moving down: a placed-out lesson the learner never practised is simply not started again; one they
      // practised keeps its scores as "in progress".
      if (p.attempts || p.best_score != null || p.resume) putProgress({ ...p, status: 'started' });
      else store.remove('progress', l.id);
    }
  }
  applySupport();
}

// ---------- spaced repetition ----------
export function allCards() { return store.all('cards'); }
export function due(now = new Date()) { return dueCards(allCards(), now, settings().retention); }

export function gradeCard(card, { correct, hintUsed = false, latencyMs = null, exercise = null }) {
  const p80 = latencyP80();
  const rating = gradeFrom({ correct, hintUsed, slow: latencyMs != null && p80 && latencyMs > p80, fast: latencyMs != null && latencyMs < 2500, reps: card.fsrs.reps });
  const next = reviewCard(card, rating, { mode: settings().retention, latencyMs, exercise, hintUsed });
  store.put('cards', next);
  for (const f of unlockedFormCards(allCards())) store.put('cards', f);
  recordAttempt({ source: 'review', exercise: card.id, topic: cardTopic(card), skill: 'vocabulary', level: card.payload?.level || cardLesson(card)?.level || null, correct, hint_used: hintUsed, latency_ms: latencyMs, probe: (card.log?.length || 0) > 0 && daysSince(card.created_at) >= 25 && daysSince(card.created_at) <= 40 });
  return next;
}
// A review answer belongs to the topic of the lesson its word came from, or to no topic when the card has no
// lesson; never to a fixed topic, which made reviews of C1 words look like a weak A1 topic (persona finding R2-37).
const cardLesson = (card) => (curriculum && card?.ref?.lesson ? lessonOrder(curriculum).find((l) => l.id === card.ref.lesson) : null);
export const cardTopic = (card) => cardLesson(card)?.topics?.[0] || null;
const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / 86_400_000;
function latencyP80() {
  const xs = store.all('attempts').filter((a) => a.source === 'review' && a.latency_ms).map((a) => a.latency_ms).sort((a, b) => a - b);
  return xs.length >= 20 ? xs[Math.floor(xs.length * 0.8)] : 12000;
}

// ---------- events and weekly goal ----------
export function logEvent(e) { store.put('events', { id: uid('ev'), at: new Date().toISOString(), ...e }); }

// Active study time: a session runs while the tab is visible and is logged when the tab is hidden
// (capped at an hour). Reports add the session that is still open.
let sessionStart = null;
export function sessionTick() {
  if (document.visibilityState === 'visible') { sessionStart ||= Date.now(); return; }
  if (sessionStart) {
    const seconds = currentSessionSeconds();
    if (seconds >= 20) logEvent({ type: 'session', seconds });
    sessionStart = null;
  }
}
export function currentSessionSeconds(now = Date.now()) {
  return sessionStart ? Math.min(3600, Math.max(0, Math.round((now - sessionStart) / 1000))) : 0;
}

export function weekActivity(now = new Date()) {
  const start = new Date(now);
  const dow = (start.getDay() + 6) % 7; // Monday = 0
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dow);
  const days = new Set(store.all('attempts').filter((a) => new Date(a.at) >= start).map((a) => todayKey(new Date(a.at))));
  return { days: days.size, goal: settings().weekly_goal_days, startOfWeek: start };
}

// ---------- the learner model (memoised until the store changes) ----------
let cached = null;
let curriculum = null;
let available = new Set(); // lesson files that exist (content/manifest.json)
let drillTopics = new Map(); // topic -> the lowest level of an available lesson that teaches it
export async function initModel() {
  [curriculum, available] = await Promise.all([content.curriculum(), content.availableLessons().catch(() => new Set())]);
  drillTopics = new Map();
  for (const l of lessonOrder(curriculum)) {
    if (!lessonAvailable(l.id)) continue;
    for (const tp of l.topics || []) if (!drillTopics.has(tp) || levelIndex(l.level) < drillTopics.get(tp)) drillTopics.set(tp, levelIndex(l.level));
  }
  repairProgress();
  store.on('change', (e) => {
    if (e.colls.some((c) => ['attempts', 'progress', 'cards', 'placement', 'writing', 'settings', 'profile'].includes(c))) cached = null;
    if ((e.colls.includes('progress') || e.colls.includes('placement')) && supportKey() !== supportLevel) applySupport();
  });
}
// Data written before deletion marks were cleared on write (persona finding P-48): a lesson opened after
// "Start from <level>" kept the mark of its removed placed-out row, so its progress was hidden. Those rows
// hold real progress (a status other than placed_out) and are restored once.
function repairProgress() {
  for (const p of store.all('progress', { includeDeleted: true })) if (p._deleted && p.status && p.status !== 'placed_out') putProgress(p);
}
function currentCourseLevel() { return curriculum ? courseLevel(curriculum, progressMap(), available) : 'PreA1'; }
export const lessonAvailable = (id) => !available.size || available.has(id);

// Review answers saved before they carried their word's topic were all filed under "daily-life-vocab"; they
// are read with the topic of their card's lesson instead (R2-37), so old records do not keep a false weak topic.
const OLD_REVIEW_TOPIC = 'daily-life-vocab';
const withCardTopic = (a) => (a.source === 'review' && a.topic === OLD_REVIEW_TOPIC && a.exercise ? { ...a, topic: cardTopic(store.get('cards', a.exercise)) } : a);

// Where a weak topic can be practised (persona finding R2-24). The real-life topics have no lesson exercises:
// they are practised again in the scenario with the lowest score so far. Other topics need a drill made of
// lesson exercises at or below one level above the course level (as pool.drillSet builds it). A topic that
// nothing can fill gets route null, and the plan, Practice and Progress do not send the learner to it.
export const SCENARIO_TOPICS = new Set(['travel-functional', 'social-functional']);
function weakestScenario(attempts, topic) {
  const by = new Map();
  for (const a of attempts) {
    if (a.topic !== topic || !a.exercise || a.score == null || !['scenario', 'roleplay'].includes(a.source)) continue;
    const id = a.source === 'scenario' ? String(a.exercise).replace(/:\d+$/, '') : a.exercise;
    const x = by.get(id) || { id, sum: 0, n: 0, last: '' };
    x.sum += a.score; x.n++; if (a.at > x.last) x.last = a.at;
    by.set(id, x);
  }
  return [...by.values()].sort((a, b) => a.sum / a.n - b.sum / b.n || (a.last < b.last ? 1 : -1))[0]?.id || null;
}
function practiceRoute(topic, attempts, level) {
  if (SCENARIO_TOPICS.has(topic)) {
    const sc = weakestScenario(attempts, topic);
    return sc ? { route: `scenario/${sc}?tab=practise`, scenario: sc } : { route: null };
  }
  const from = drillTopics.get(topic);
  return from != null && from <= levelIndex(level) + 1 ? { route: `drill?topic=${topic}` } : { route: null };
}

export function model() {
  if (cached) return cached;
  const now = Date.now();
  const attempts = store.all('attempts').map(withCardTopic);
  const progress = progressMap();
  const placement = store.get('placement', 'latest');
  const writing = store.all('writing');
  const mastery = topicMastery(attempts, now);
  const errors = errorProfile(attempts, now);
  const next = curriculum ? nextLesson(curriculum, progress, available) : null;
  const level = curriculum ? courseLevel(curriculum, progress, available) : 'PreA1';
  cached = {
    attempts, progress, placement, mastery, errors,
    weak: weakTopics(mastery).map((w) => ({ ...w, ...practiceRoute(w.topic, attempts, level) })),
    recurring: errors.filter((e) => e.recurring),
    skills: skillLevels({ attempts, placement, writing: writing.map((w) => (w.last_evaluation ? { ...w, evaluation: w.last_evaluation } : w)) }),
    next,
    skipped: curriculum ? unwrittenAhead(curriculum, progress, available, next) : [],
    courseLevel: level,
    placementPending: placementPending(),
  };
  return cached;
}

// Where a saved lesson run stands, counted exactly as the player counts it (lesson.js stepInfo, persona
// findings R2-17, N6, D7): the first pass has a fixed total, and retries are counted on their own.
// resume = { qi, queue: [[exerciseId, isRetry], ...] }. pos/total/retry/pending describe the next exercise.
export function resumeStep(resume) {
  const q = (resume?.queue || []).map(([, retry]) => Boolean(retry));
  const qi = Math.max(0, Math.min(resume?.qi ?? 0, q.length));
  const firstTotal = q.filter((x) => !x).length;
  const firstDone = q.slice(0, qi).filter((x) => !x).length;
  const revisit = q.slice(qi).filter((x) => x).length;
  const base = { firstTotal, firstDone, revisit, finished: qi >= q.length };
  if (q[qi]) return { ...base, retry: true, pos: q.slice(0, qi + 1).filter((x) => x).length, total: q.filter((x) => x).length, pending: 0 };
  return { ...base, retry: false, pos: Math.min(firstDone + 1, firstTotal), total: firstTotal, pending: q.slice(qi + 1).filter((x) => x).length };
}

// What the plan needs to know about the next lesson: its real length, the saved place (first pass and
// retries apart), and the exercises missed on the first try when the last run ended "Nearly there".
function lessonInfo(next, lesson, attempts, today) {
  if (!next || !lesson || lesson.id !== next.id) return null;
  const p = progressOf(next.id);
  const r = p?.resume;
  const resumable = Boolean(r && r.qi < r.queue.length);
  const step = resumable ? resumeStep(r) : null;
  const intro = introSlots(lesson);
  const perItem = lesson.minutes / (lesson.exercises.length + intro);
  const ids = new Set(lesson.exercises.map((e) => e.id));
  const missedIds = !resumable && p?.status !== 'completed' ? (p?.missed?.ids || []).filter((x) => ids.has(x)) : [];
  return {
    // A run of only the missed exercises is timed by the lesson's own pace, not spread over the full length.
    minutes: step && r.missed ? Math.max(1, Math.round(perItem * (step.firstTotal + 2))) : lesson.minutes,
    exercises: step ? step.firstTotal : lesson.exercises.length, intro, done: step ? step.firstDone : 0, revisit: step ? step.revisit : 0, resumable,
    step, missedRun: Boolean(step && r.missed),
    missed: missedIds.length ? { count: missedIds.length, minutes: Math.max(1, Math.round(missedIds.length * perItem)) } : null,
    doneToday: firstTries(attempts.filter((a) => a.lesson === next.id && a.source === 'lesson' && todayKey(new Date(a.at)) === today)).length,
  };
}

// What was already done today, so the plan ticks only what was really done (persona finding R2-27).
function doneToday(now, { scenarios, writingTasks, attempts }) {
  const day = todayKey(now);
  const isToday = (iso) => iso && todayKey(new Date(iso)) === day;
  const events = store.all('events').filter((e) => isToday(e.at));
  const scenarioIds = new Set([
    ...store.all('progress').filter((x) => String(x.id).startsWith('rl:') && isToday(x.completed_at)).map((x) => x.id.slice(3)),
    ...events.filter((e) => e.type === 'speaking' && (e.scenario || e.roleplay)).map((e) => e.scenario || e.roleplay),
  ]);
  const taskIds = new Set(events.filter((e) => e.type === 'writing' && e.exercise).map((e) => e.exercise));
  // The most recent of today's events that names a scenario or a task.
  const latest = (pick) => events.map((e) => ({ at: e.at, id: pick(e) })).filter((x) => x.id).sort((a, b) => (a.at < b.at ? 1 : -1))[0]?.id;
  const scenarioId = latest((e) => e.type === 'speaking' && (e.scenario || e.roleplay)) || [...scenarioIds][0];
  return {
    scenarios: scenarioIds,
    tasks: taskIds,
    drills: new Set(events.filter((e) => e.type === 'drill').flatMap((e) => [e.topic && `topic:${e.topic}`, e.error && `error:${e.error}`]).filter(Boolean)),
    scenario: scenarios.find((x) => x.id === scenarioId) || null,
    writingTask: writingTasks.find((x) => x.id === latest((e) => e.type === 'writing' && e.exercise)) || null,
    reading: attempts.some((a) => a.source === 'reading' && isToday(a.at)),
    speaking: events.some((e) => e.type === 'speaking'),
    writing: events.some((e) => e.type === 'writing'),
  };
}

// extras (loaded by the view): the next lesson's file, real-life scenarios and writing-lab tasks.
export function todayPlan(minutes = settings().daily_minutes, { lesson = null, scenarios = [], writingTasks = [] } = {}) {
  const m = model();
  const now = new Date();
  const cards = allCards();
  const dueNow = dueCards(cards, now, settings().retention);
  const dayAgo = (d) => now.getTime() - d * 86_400_000;
  const warm = cards.filter((c) => c.kind === 'meaning' && new Date(c.created_at).getTime() <= dayAgo(1) && new Date(c.created_at).getTime() >= dayAgo(3));
  const todayNew = cards.filter((c) => todayKey(new Date(c.created_at)) === todayKey(now));
  const lastOf = (type) => store.all('events').filter((e) => e.type === type).map((e) => e.at).sort().pop() || null;
  const goals = profile()?.goals || [];
  const scenariosDone = new Set(store.all('progress').filter((p) => String(p.id).startsWith('rl:') && p.status === 'completed').map((p) => p.id.slice(3)));
  // The scenario a weak real-life topic sends the learner back to is not also the "use it" scenario.
  for (const w of m.weak) if (w.scenario) scenariosDone.add(w.scenario);
  const writing = store.all('writing');
  const writingDone = new Set(writing.filter((w) => w.kind === 'essay-summary' && ['evaluated', 'final', 'done'].includes(w.status)).map((w) => w.exercise));
  const writingStarted = new Set(writing.filter((w) => w.kind === 'essay-draft' && String(w.text || '').trim()).map((w) => w.exercise));
  const task = pickWritingTask(writingTasks, { level: m.courseLevel, done: writingDone, started: writingStarted });
  const today = doneToday(now, { scenarios, writingTasks, attempts: m.attempts });
  if (today.writingTask) today.writingTask = { ...today.writingTask, started: true };
  return dailyPlan({
    minutes, now: now.getTime(), dueCount: dueNow.length, warmupCount: warm.length, todayNewCount: todayNew.length,
    next: m.next, weak: m.weak, recurring: m.recurring, level: m.courseLevel, goals, skipped: m.skipped,
    lastSpeakingAt: lastOf('speaking'), lastWritingAt: lastOf('writing'),
    lastReadingAt: m.attempts.filter((a) => a.source === 'reading').map((a) => a.at).sort().pop() || null,
    lesson: lessonInfo(m.next, lesson, m.attempts, todayKey(now)),
    scenario: pickScenario(scenarios, { level: m.courseLevel, goals, done: scenariosDone }),
    writingTask: task && { ...task, started: writingStarted.has(task.id) },
    today,
  });
}

export function newBudgetToday() {
  const cards = allCards();
  const today = cards.filter((c) => c.kind === 'meaning' && todayKey(new Date(c.created_at)) === todayKey()).length;
  return Math.max(0, Math.min(settings().new_per_day, newItemsBudget(cards, { base: settings().new_per_day })) - today);
}

export { LEVELS };
