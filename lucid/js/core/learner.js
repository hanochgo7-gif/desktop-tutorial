// The learner's state, built on the local store: profile, settings, attempts, lesson progress,
// spaced-repetition cards and the derived learner model. Views call these functions instead of
// touching collections directly, so every recorded action feeds the adaptive engine the same way.
import { store } from './store.js';
import { uid, todayKey } from './util.js';
import { content } from './content.js';
import { topicMastery, weakTopics, errorProfile, skillLevels, nextLesson, courseLevel, dailyPlan, lessonOrder, LEVELS, levelIndex } from './adaptive.js';
import { vocabCardsFor, unlockedFormCards, review as reviewCard, dueCards, newItemsBudget, gradeFrom } from './srs.js';
import { setHebrewSupport } from './i18n.js';

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

export function applySupport() {
  const m = model();
  setHebrewSupport(settings().hebrew_support, m.courseLevel);
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
    score: a.score ?? (a.correct ? 1 : 0),
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
export const progressOf = (lessonId) => store.get('progress', lessonId);
export function progressMap() { return new Map(store.all('progress').map((p) => [p.id, p])); }

export function startLesson(lesson) {
  const cur = progressOf(lesson.id);
  if (!cur || cur.status === 'placed_out') store.put('progress', { ...(cur || {}), id: lesson.id, level: lesson.level, status: cur?.status === 'completed' ? 'completed' : 'started', started_at: new Date().toISOString(), attempts: (cur?.attempts || 0) });
}

export function finishLesson(lesson, { score, passed }) {
  const cur = progressOf(lesson.id) || { id: lesson.id };
  const now = new Date();
  store.put('progress', {
    ...cur,
    id: lesson.id,
    level: lesson.level,
    status: passed || cur.status === 'completed' ? 'completed' : 'started',
    best_score: Math.max(cur.best_score || 0, score),
    last_score: score,
    attempts: (cur.attempts || 0) + 1,
    completed_at: passed && cur.status !== 'completed' ? now.toISOString() : cur.completed_at || null,
  });
  // New vocabulary enters spaced repetition only once the lesson is passed (and within today's budget).
  if (passed) addVocabCards(lesson, now);
  logEvent({ type: 'lesson', lesson: lesson.id, score, passed });
}

export function addVocabCards(lesson, now = new Date()) {
  const cards = store.all('cards', { includeDeleted: true });
  const fresh = vocabCardsFor(lesson, cards, now);
  for (const c of fresh) store.put('cards', { ...c, payload: (lesson.vocab || []).find((v) => `v:${v.word.toLowerCase()}:meaning` === c.id) });
  return fresh.length;
}

// After placement: lessons below the start level are "placed out" (available, not required).
export async function applyPlacement(result) {
  store.put('placement', { id: 'latest', ...result, at: new Date().toISOString() });
  const cur = await content.curriculum();
  const start = levelIndex(result.start_level);
  for (const l of lessonOrder(cur)) {
    const p = progressOf(l.id);
    if (levelIndex(l.level) < start && !p) store.put('progress', { id: l.id, level: l.level, status: 'placed_out' });
  }
  saveProfile({ start_level: result.start_level });
}
// Learner-controlled level move (placement is provisional; research C2, D8).
export async function moveToLevel(level) {
  const cur = await content.curriculum();
  const target = levelIndex(level);
  for (const l of lessonOrder(cur)) {
    const p = progressOf(l.id);
    if (levelIndex(l.level) < target && (!p || p.status !== 'completed')) store.put('progress', { ...(p || {}), id: l.id, level: l.level, status: 'placed_out' });
    if (levelIndex(l.level) >= target && p?.status === 'placed_out') store.remove('progress', l.id);
  }
  logEvent({ type: 'level-move', level });
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

let sessionStart = null;
export function sessionTick() {
  // Count active study time: visible tab, ended by hiding or after 10 idle minutes.
  if (document.visibilityState === 'visible') { sessionStart ||= Date.now(); return; }
  if (sessionStart) {
    const seconds = Math.min(3600, Math.round((Date.now() - sessionStart) / 1000));
    if (seconds >= 20) logEvent({ type: 'session', seconds });
    sessionStart = null;
  }
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
export async function initModel() {
  curriculum = await content.curriculum();
  store.on('change', (e) => { if (e.colls.some((c) => ['attempts', 'progress', 'cards', 'placement', 'writing', 'settings'].includes(c))) cached = null; });
}
export function model() {
  if (cached) return cached;
  const now = Date.now();
  const attempts = store.all('attempts');
  const progress = progressMap();
  const placement = store.get('placement', 'latest');
  const writing = store.all('writing');
  const mastery = topicMastery(attempts, now);
  const errors = errorProfile(attempts, now);
  const next = curriculum ? nextLesson(curriculum, progress) : null;
  cached = {
    attempts, progress, placement, mastery, errors,
    weak: weakTopics(mastery),
    recurring: errors.filter((e) => e.recurring),
    skills: skillLevels({ attempts, placement, writing: writing.map((w) => w.last_evaluation ? { evaluation: w.last_evaluation } : w) }),
    next,
    courseLevel: curriculum ? courseLevel(curriculum, progress) : 'PreA1',
  };
  return cached;
}

export function todayPlan(minutes = settings().daily_minutes) {
  const m = model();
  const now = new Date();
  const cards = allCards();
  const dueNow = dueCards(cards, now, settings().retention);
  const dayAgo = (d) => now.getTime() - d * 86_400_000;
  const warm = cards.filter((c) => c.kind === 'meaning' && new Date(c.created_at).getTime() <= dayAgo(1) && new Date(c.created_at).getTime() >= dayAgo(3));
  const todayNew = cards.filter((c) => todayKey(new Date(c.created_at)) === todayKey(now));
  const lastOf = (type) => store.all('events').filter((e) => e.type === type).map((e) => e.at).sort().pop() || null;
  return dailyPlan({
    minutes, now: now.getTime(), dueCount: dueNow.length, warmupCount: warm.length, todayNewCount: todayNew.length,
    next: m.next, weak: m.weak, recurring: m.recurring, lastSpeakingAt: lastOf('speaking'), lastWritingAt: lastOf('writing'), level: m.courseLevel,
  });
}

export function newBudgetToday() {
  const cards = allCards();
  const today = cards.filter((c) => c.kind === 'meaning' && todayKey(new Date(c.created_at)) === todayKey()).length;
  return Math.max(0, Math.min(settings().new_per_day, newItemsBudget(cards, { base: settings().new_per_day })) - today);
}

export { LEVELS };
