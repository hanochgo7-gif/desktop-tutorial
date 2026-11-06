// The "heavy" learner for tools/perf.mjs --learner heavy: about six months of daily use, built through the app's own
// modules (learner, placement, srs, adaptive, content), as a real learner's records would be.
//
// seedHeavy runs in the page (Playwright page.evaluate serialises it, so it must stay self-contained: no imports
// or closures from this module). It must run on a page of the app whose boot has opened the store
// (window.lucid.store). The unit tests run it in Node too: they set globalThis.lucid = { store } after
// openStore() and pass opts.base, the app root as a URL, so the app's modules resolve from there.
// Deterministic: a pinned PRNG drives every choice and every record id, and the history is relative to the day it
// runs (the 180 days before today, UTC), so the learner has the same shape on any date and the plan, due cards and
// "today" checks see the same history. Defaults give about 5.2-5.3k attempts, 1.2k events, 700 cards, 32 completed
// lessons, 12 scenarios and 6 essays.
//
// Returns the record counts ({ attempts, events, cards, progress, writing, lessons }).
export async function seedHeavy(opts) {
  const { days = 180, lessonsDone = 32, reviewsPerDay = 30, gamesPerDay = 2, seed = 12345, base = './', now: at = Date.now() } = opts || {};
  const L = await import(`${base}js/core/learner.js`);
  const PL = await import(`${base}js/core/placement.js`);
  const S = await import(`${base}js/core/srs.js`);
  const A = await import(`${base}js/core/adaptive.js`);
  const { content } = await import(`${base}js/core/content.js`);
  const { store } = globalThis.lucid;
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let n = 0;
  const uid = (p) => `${p}-h${(n++).toString(36)}${Math.floor(rnd() * 2 ** 31).toString(36)}`;
  // The history ends at the start of today (UTC midnight): the latest session is yesterday evening, and every record
  // is the same whatever the time of day the seed runs (the same date gives the same learner).
  const now = Math.floor(at / 864e5) * 864e5;
  L.saveProfile({ onboarded: true, name: 'Heavy', birth_year: 1995, ui_language: 'he', goals: ['travel', 'studies'], created_at: new Date(now - days * 864e5).toISOString() });
  L.saveSettings({ daily_minutes: 20, text_size: 100 });
  await L.applyPlacement(PL.selfReportResult('A1'));
  const cur = await content.curriculum();
  const avail = await content.availableLessons();
  const order = A.lessonOrder(cur).filter((l) => avail.has(l.id) && A.levelIndex(l.level) >= 1).slice(0, lessonsDone);
  const files = await Promise.all(order.map((l) => content.lesson(l.id)));
  const recs = { attempts: [], events: [], progress: [], writing: [] };
  const cards = new Map();
  const ERR = ['tense', 'article', 'preposition', 'word-order', 'spelling', 'agreement', 'vocabulary'];
  let li = 0;
  for (let d = days; d >= 1; d--) {
    const day0 = now - d * 864e5;
    const t = (min) => new Date(day0 + min * 60e3);
    let m = 9 * 60 + Math.floor(rnd() * 600);
    recs.events.push({ id: uid('ev'), at: t(m).toISOString(), type: 'session', seconds: 600 + Math.floor(rnd() * 900) });
    // A lesson about every 5 days.
    if (li < files.length && d % Math.max(1, Math.floor(days / files.length)) === 0) {
      const lesson = files[li++];
      for (let k = 0; k < 6; k++) recs.events.push({ id: uid('ev'), at: t(m + k).toISOString(), type: 'learn', lesson: lesson.id, step: k });
      for (const ex of lesson.exercises) {
        const correct = rnd() < 0.8;
        const a = { id: uid('at'), at: t(m + 10).toISOString(), source: 'lesson', lesson: lesson.id, exercise: ex.id, topic: ex.topic || lesson.topics?.[0] || null, skill: ex.skill || null, level: lesson.level, correct, score: correct ? 1 : 0, error_type: correct ? null : ERR[Math.floor(rnd() * ERR.length)], hint_used: false, latency_ms: 3000 + Math.floor(rnd() * 9000), response: correct ? null : 'I goes to the school every days', probe: false };
        recs.attempts.push(a);
        if (!correct) recs.attempts.push({ ...a, id: uid('at'), at: t(m + 20).toISOString(), correct: true, score: 1, error_type: null, response: null });
        m += 1;
      }
      recs.progress.push({ id: lesson.id, level: lesson.level, status: 'completed', started_at: t(m - 30).toISOString(), completed_at: t(m).toISOString(), best_score: 0.85, last_score: 0.85, attempts: 1 });
      recs.events.push({ id: uid('ev'), at: t(m).toISOString(), type: 'lesson', lesson: lesson.id, score: 0.85, passed: true });
      for (const c of S.vocabCardsFor(lesson, [...cards.values()], t(m))) cards.set(c.id, { ...c, payload: (lesson.vocab || []).find((v) => `v:${v.word.toLowerCase()}:meaning` === c.id) });
    }
    // The reviews of the cards due that day.
    const due = S.dueCards([...cards.values()], t(m + 40)).slice(0, reviewsPerDay);
    let right = 0;
    for (const c of due) {
      const ok = rnd() < 0.85;
      if (ok) right++;
      const lat = 1500 + Math.floor(rnd() * 8000);
      const next = S.review(c, S.gradeFrom({ correct: ok, fast: lat < 2500, reps: c.fsrs.reps }), { now: t(m + 40), latencyMs: lat, exercise: 'meaning' });
      cards.set(c.id, next);
      recs.attempts.push({ id: uid('at'), at: t(m + 40).toISOString(), source: 'review', lesson: null, exercise: c.id, topic: null, skill: 'vocabulary', level: 'A1', correct: ok, score: ok ? 1 : 0, error_type: null, hint_used: false, latency_ms: lat, response: null, probe: false });
    }
    for (const f of S.unlockedFormCards([...cards.values()], t(m + 41))) cards.set(f.id, f);
    if (due.length) recs.events.push({ id: uid('ev'), at: t(m + 45).toISOString(), type: 'review', mode: 'review', count: due.length, right });
    // Word-game and memory rounds.
    const words = [...cards.values()].filter((c) => c.kind === 'meaning').map((c) => c.ref.word);
    for (let g = 0; g < gamesPerDay && words.length > 10; g++) {
      recs.events.push({ id: uid('ev'), at: t(m + 50 + g).toISOString(), type: g % 2 ? 'memory-round' : 'game-round', level: 'A1', stage: 1 + (g % 3), score: 80 + Math.floor(rnd() * 100), correct: 8, total: 10, accuracy: 0.8, mode: 'calm', words: Array.from({ length: 10 }, () => words[Math.floor(rnd() * words.length)]) });
    }
    if (d % 3 === 0) recs.events.push({ id: uid('ev'), at: t(m + 60).toISOString(), type: 'speaking', drill: 'say-it', sound: 'th' });
    if (d % 7 === 0) recs.events.push({ id: uid('ev'), at: t(m + 70).toISOString(), type: 'writing', exercise: `w-${d}` });
    recs.events.push({ id: uid('ev'), at: t(m + 90).toISOString(), type: 'session', seconds: 300 + Math.floor(rnd() * 600) });
  }
  // Scenarios and essays.
  const sc = (await content.scenarios()).scenarios.slice(0, 12);
  sc.forEach((x, i) => recs.progress.push({ id: `rl:${x.id}`, status: 'completed', completed_at: new Date(now - (i + 2) * 7 * 864e5).toISOString() }));
  const wx = (await content.writingExercises()).exercises.slice(0, 6);
  const essay = 'Many people believe that technology makes our lives easier, but I think the truth is more complicated. For example, smartphones help us stay in touch with friends and family who live far away. However, they also distract students during lessons. '.repeat(5);
  wx.forEach((w, i) => {
    for (let k = 1; k <= 3; k++) recs.writing.push({ id: `wv:${w.id}:${k}`, kind: 'essay-version', exercise: w.id, n: k, text: essay, at: new Date(now - (i + 1) * 20 * 864e5 + k * 3600e3).toISOString() });
    recs.writing.push({ id: `ws:${w.id}`, kind: 'essay-summary', exercise: w.id, status: 'done', updated: new Date(now - (i + 1) * 20 * 864e5).toISOString() });
  });
  for (const c of cards.values()) store.put('cards', c);
  for (const [coll, list] of Object.entries(recs)) for (const r of list) store.put(coll, r);
  await store.flush();
  return { attempts: recs.attempts.length, events: recs.events.length, cards: cards.size, progress: recs.progress.length, writing: recs.writing.length, lessons: li };
}
