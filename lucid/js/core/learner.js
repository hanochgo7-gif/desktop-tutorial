// The learner's state, built on the local store: profile, settings, attempts, lesson progress,
// spaced-repetition cards and the derived learner model. Views call these functions instead of
// touching collections directly, so every recorded action feeds the adaptive engine the same way.
import { store } from './store.js';
import { uid, todayKey } from './util.js';
import { content } from './content.js';
import { topicMastery, weakTopics, errorProfile, skillLevels, nextLesson, courseLevel, unwrittenAhead, dailyPlan, lessonOrder, isLessonId, pickScenario, pickWritingTask, LEVELS, levelIndex } from './adaptive.js';
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

// Hebrew support follows the course level ('auto'), so it is re-applied whenever the level can move:
// at boot, on settings changes, after placement or a level move, and when lesson progress changes.
let supportLevel = null;
export function applySupport() {
  supportLevel = currentCourseLevel();
  setHebrewSupport(settings().hebrew_support, supportLevel);
}

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
  recordAttempt({ source: 'review', exercise: card.id, topic: 'daily-life-vocab', skill: 'vocabulary', level: card.payload?.level || null, correct, hint_used: hintUsed, latency_ms: latencyMs, probe: (card.log?.length || 0) > 0 && daysSince(card.created_at) >= 25 && daysSince(card.created_at) <= 40 });
  return next;
}
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
export async function initModel() {
  [curriculum, available] = await Promise.all([content.curriculum(), content.availableLessons().catch(() => new Set())]);
  repairProgress();
  store.on('change', (e) => {
    if (e.colls.some((c) => ['attempts', 'progress', 'cards', 'placement', 'writing', 'settings', 'profile'].includes(c))) cached = null;
    if ((e.colls.includes('progress') || e.colls.includes('placement')) && currentCourseLevel() !== supportLevel) applySupport();
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

export function model() {
  if (cached) return cached;
  const now = Date.now();
  const attempts = store.all('attempts');
  const progress = progressMap();
  const placement = store.get('placement', 'latest');
  const writing = store.all('writing');
  const mastery = topicMastery(attempts, now);
  const errors = errorProfile(attempts, now);
  const next = curriculum ? nextLesson(curriculum, progress, available) : null;
  cached = {
    attempts, progress, placement, mastery, errors,
    weak: weakTopics(mastery),
    recurring: errors.filter((e) => e.recurring),
    skills: skillLevels({ attempts, placement, writing: writing.map((w) => (w.last_evaluation ? { ...w, evaluation: w.last_evaluation } : w)) }),
    next,
    skipped: curriculum ? unwrittenAhead(curriculum, progress, available, next) : [],
    courseLevel: curriculum ? courseLevel(curriculum, progress, available) : 'PreA1',
    placementPending: placementPending(),
  };
  return cached;
}

// What the plan needs to know about the next lesson: its real length and the saved place.
function lessonInfo(next, lesson, attempts, today) {
  if (!next || !lesson || lesson.id !== next.id) return null;
  const r = progressOf(next.id)?.resume;
  const resumable = Boolean(r && r.qi < r.queue.length);
  return {
    minutes: lesson.minutes, exercises: resumable ? r.queue.length : lesson.exercises.length, done: resumable ? r.qi : 0, resumable,
    doneToday: attempts.filter((a) => a.lesson === next.id && a.source === 'lesson' && todayKey(new Date(a.at)) === today).length,
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
  const writingDone = new Set(store.all('writing').filter((w) => w.kind === 'essay-summary' && ['evaluated', 'final', 'done'].includes(w.status)).map((w) => w.exercise));
  return dailyPlan({
    minutes, now: now.getTime(), dueCount: dueNow.length, warmupCount: warm.length, todayNewCount: todayNew.length,
    next: m.next, weak: m.weak, recurring: m.recurring, level: m.courseLevel, goals, skipped: m.skipped,
    lastSpeakingAt: lastOf('speaking'), lastWritingAt: lastOf('writing'),
    lastReadingAt: m.attempts.filter((a) => a.source === 'reading').map((a) => a.at).sort().pop() || null,
    lesson: lessonInfo(m.next, lesson, m.attempts, todayKey(now)),
    scenario: pickScenario(scenarios, { level: m.courseLevel, goals, done: scenariosDone }),
    writingTask: pickWritingTask(writingTasks, { level: m.courseLevel, done: writingDone }),
  });
}

export function newBudgetToday() {
  const cards = allCards();
  const today = cards.filter((c) => c.kind === 'meaning' && todayKey(new Date(c.created_at)) === todayKey()).length;
  return Math.max(0, Math.min(settings().new_per_day, newItemsBudget(cards, { base: settings().new_per_day })) - today);
}

export { LEVELS };
