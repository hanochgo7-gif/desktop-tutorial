// Word game: levels and stages (#/games) and a round of 10 questions (#/games/<level>/<stage>).
// Every answer is marked right or wrong at once, with the right answer shown; a score with a small speed bonus
// and the best score per stage are kept. Logic is in js/core/wordgame.js.
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, t, legend, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, LEVEL_LABEL, toast } from '../ui/components.js';
import { store } from '../core/store.js';
import { model, settings, logEvent, addVocabCards } from '../core/learner.js';
import { LEVELS } from '../core/adaptive.js';
import { say, canSpeak } from '../core/speech.js';
import { STAGES, ROUND, MAX_SCORE, UNLOCK, wordPool, makeRound, typedCorrect, scoreFor, bests, unlocked } from '../core/wordgame.js';

const levelLessons = async (level) => {
  const [cur, available] = await Promise.all([content.curriculum(), content.availableLessons()]);
  const ids = (cur.levels.find((l) => l.id === level)?.lessons || []).map((l) => l.id).filter((id) => available.has(id));
  return (await Promise.all(ids.map((id) => content.lesson(id)))).filter(Boolean);
};
const stageName = (s) => tt(s.he, s.en);
const pctText = (x) => `${Math.round(x * 100)}%`;

export default async function wordgame(el, ctx) {
  const { level, stage } = ctx.params;
  if (level && stage) return play(el, ctx, level, Number(stage));
  return hub(el, ctx);
}

// ---------- levels and stages ----------
async function hub(el, ctx) {
  ctx.setTitle(tt('משחק מילים', 'Word game'));
  const tx = await content.taxonomy();
  const mine = model().courseLevel;

  function draw() {
    const best = bests(store.all('events'));
    render(el, html`
      <div class="page-head"><div><p class="small faint"><a href="#/practice">${t('nav.practice')}</a></p><h1>${tt('משחק מילים', 'Word game')}</h1>
        <p>${tt(`שאלון אוצר מילים והשלמת מילים. ${ROUND} שאלות בסיבוב, ותשובה נכונה או לא נכונה מיד. כל תשובה נכונה שווה 10 נקודות, ועוד בונוס על מהירות.`, `A vocabulary quiz and word completion. ${ROUND} questions a round, marked right or wrong at once. Each right answer is worth 10 points, plus a bonus for speed.`)}</p></div></div>
      <p class="small faint row" style="margin-block-end:var(--s5)">${icon('info', { size: 16 })}<span>${tt(`בכל רמה שלושה שלבים. השלב הבא נפתח כשמגיעים ל-${pctText(UNLOCK)} בשלב הקודם. המשחק הוא תרגול: הוא לא משנה את הרמה שלך במסלול.`, `Each level has three stages. The next stage opens at ${pctText(UNLOCK)} in the one before. The game is practice: it does not change your level on the path.`)}</span></p>
      <ol class="game-levels">${LEVELS.map((lvl) => {
        const meta = tx.levels.find((x) => x.id === lvl);
        return html`<li class="panel ${lvl === mine ? 'game-mine' : 'flat'}" id="lvl-${lvl}">
          <div class="row between"><h2 class="game-level-name"><span class="tag level">${LEVEL_LABEL[lvl]}</span> ${legend(meta?.name_en || lvl, meta?.name_he || lvl)}</h2>
            ${lvl === mine ? html`<span class="tag cobalt">${tt('הרמה שלך', 'Your level')}</span>` : ''}</div>
          <div class="game-stages">${STAGES.map((s) => {
            const b = best[`${lvl}:${s.id}`];
            const open = unlocked(best, lvl, s.id);
            const inner = html`<span class="game-stage-num num">${s.id}</span><span class="grow"><span class="game-stage-name">${stageName(s)}</span>
              <span class="xsmall faint" style="display:block">${!open ? tt(`נפתח ב-${pctText(UNLOCK)} בשלב ${s.id - 1}`, `Opens at ${pctText(UNLOCK)} in stage ${s.id - 1}`) : b ? tt(`שיא: ${b.score} נקודות · ${pctText(b.accuracy)} נכון`, `Best: ${b.score} points · ${pctText(b.accuracy)} right`) : tt(s.hintHe, s.hintEn)}</span></span>
              ${open ? (b && b.accuracy >= 0.8 ? html`<span class="game-done" aria-label="${tt('עבר', 'Passed')}">${icon('check', { size: 16 })}</span>` : '') : html`<span class="faint">${icon('lock', { size: 16 })}</span>`}`;
            return open ? html`<a class="game-stage" href="#/games/${lvl}/${s.id}">${inner}</a>` : html`<div class="game-stage is-locked" aria-disabled="true">${inner}</div>`;
          })}</div></li>`;
      })}</ol>`);
  }
  draw();
  document.getElementById(`lvl-${mine}`)?.scrollIntoView({ block: 'nearest' });
  ctx.watch(['events'], draw);
}

// ---------- a round ----------
async function play(el, ctx, level, stageId) {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!LEVELS.includes(level) || !stage) { ctx.navigate('games', { replace: true }); return null; }
  ctx.setTitle(`${tt('משחק מילים', 'Word game')} · ${LEVEL_LABEL[level]}`);
  const before = bests(store.all('events'));
  if (!unlocked(before, level, stageId)) { toast(tt(`השלב הזה נפתח ב-${pctText(UNLOCK)} בשלב הקודם`, `This stage opens at ${pctText(UNLOCK)} in the stage before`)); ctx.navigate('games', { replace: true }); return null; }
  const pool = wordPool(await levelLessons(level), level);
  let questions = makeRound(pool, stageId);
  let i = 0, score = 0, right = 0, streak = 0, started = 0, answered = false, done = false, timer = null;
  const missed = [];
  const audio = sound();

  function top() {
    const pct = Math.round((i / questions.length) * 100);
    return html`<div class="player-top">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בסיבוב', 'Round progress')}"><span style="width:${pct}%"></span></div>
      <span class="step-count">${tt(`שאלה ${Math.min(i + 1, questions.length)} מתוך ${questions.length}`, `Question ${Math.min(i + 1, questions.length)} of ${questions.length}`)}</span>
      <span class="game-score num" aria-label="${tt(`ניקוד: ${score}`, `Score: ${score}`)}">${score}</span></div>`;
  }

  function question() {
    const q = questions[i];
    answered = false;
    done = false;
    started = performance.now();
    const head = html`<p class="small faint row between"><span><span class="tag level">${LEVEL_LABEL[level]}</span> ${tt(`שלב ${stageId}`, `Stage ${stageId}`)}: ${stageName(stage)}</span>${streak >= 3 ? html`<span class="tag ok">${tt(`רצף ${streak}`, `${streak} in a row`)}</span>` : ''}</p>`;
    let body;
    if (q.type === 'choice') {
      const prompt = stageId === 1
        ? html`<div class="game-prompt"><span lang="en" dir="ltr" class="game-word">${q.prompt}</span>${q.word.ipa ? html`<span class="small faint" lang="en" dir="ltr">${q.word.ipa}</span>` : ''}${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}</div>`
        : html`<div class="game-prompt"><span lang="he" dir="rtl" class="game-word">${q.prompt}</span></div>`;
      body = html`${prompt}<div class="options" role="group" aria-label="${tt('תשובות', 'Answers')}">${q.options.map((o, k) => html`<button type="button" class="option" data-opt="${k}"><span class="k" aria-hidden="true">${k + 1}</span><span ${stageId === 1 ? html`lang="he" dir="rtl"` : html`lang="en" dir="ltr"`}>${o}</span></button>`)}</div>`;
    } else {
      body = html`<div class="game-prompt stack-sm"><p class="game-sentence" lang="en" dir="ltr">${q.before}<input class="input game-input" id="gw" aria-label="${tt('המילה החסרה', 'The missing word')}" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" dir="ltr" size="${Math.max(4, q.answer.length + 1)}" maxlength="${q.answer.length + 6}">${q.after}</p>
        <p class="small"><span class="faint">${tt('רמז:', 'Hint:')}</span> <span lang="he" dir="rtl">${isolateLatin(q.word.he)}</span> · <span lang="en" dir="ltr" class="game-mask">${q.hint}</span></p></div>
        <div class="row"><button type="button" class="key enter" data-check>${t('check')}</button><button type="button" class="key ghost" data-skip>${tt('לא יודע/ת', "I don't know")}</button></div>`;
    }
    render(el, html`<div class="player">${top()}<div class="player-body stack" id="gbody" tabindex="-1">${head}${body}<div id="gfb" class="game-feedback" aria-live="assertive"></div></div></div>`);
    if (q.type === 'typed') setTimeout(() => $('#gw', el)?.focus(), 30);
    else setTimeout(() => $('#gbody', el)?.focus({ preventScroll: true }), 30); // keys 1-4 answer; no option looks pre-selected
  }

  // Marks the answer at once, shows the right answer, and moves on by itself (or on Enter / "Next").
  function answer(correct, given) {
    if (answered) return;
    answered = true;
    const q = questions[i];
    const ms = performance.now() - started;
    const points = scoreFor(correct, ms, q.type);
    score += points;
    if (correct) { right++; streak++; } else { streak = 0; missed.push(q.word); }
    audio(correct);
    if (q.type === 'choice') {
      $$('[data-opt]', el).forEach((b) => { b.disabled = true; const k = Number(b.dataset.opt); if (k === q.answer) b.classList.add('is-right'); else if (k === given) b.classList.add('is-wrong'); });
    } else {
      const inp = $('#gw', el);
      inp.readOnly = true;
      inp.classList.add(correct ? 'right' : 'wrong');
      $$('[data-check], [data-skip]', el).forEach((b) => { b.disabled = true; });
    }
    const pair = html`<span lang="en" dir="ltr"><strong>${q.word.word}</strong></span> = <span lang="he" dir="rtl">${isolateLatin(q.word.he)}</span>`;
    render($('#gfb', el), html`<div class="game-verdict ${correct ? 'ok' : 'bad'}">
      <p class="row" style="font-weight:600">${icon(correct ? 'check' : 'x', { size: 20 })}<span>${correct ? tt('נכון!', 'Right!') : tt('לא נכון', 'Not right')}</span>${correct ? html`<span class="game-plus num">+${points}</span>` : ''}</p>
      ${!correct && q.type === 'typed' ? html`<p>${tt('התשובה:', 'Answer:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      <p class="small">${pair}</p>${q.word.example ? html`<p class="small faint" lang="en" dir="ltr">${q.word.example}</p>` : ''}
      <button type="button" class="key small" data-next>${i + 1 < questions.length ? tt('לשאלה הבאה', 'Next question') : tt('לתוצאות', 'See results')}</button></div>`);
    $('.player-top', el).outerHTML = String(top());
    $('[data-next]', el)?.focus({ preventScroll: true });
    timer = setTimeout(next, correct ? 1100 : 2600);
  }

  function next() {
    clearTimeout(timer);
    if (!answered || done) return;
    i++;
    if (i < questions.length) question(); else summary();
  }

  function summary() {
    done = true;
    const accuracy = right / questions.length;
    const prev = before[`${level}:${stageId}`];
    const record = !prev || score > prev.score;
    logEvent({ type: 'game-round', level, stage: stageId, score, correct: right, total: questions.length, accuracy });
    const nowBest = bests(store.all('events'));
    const nextStage = STAGES.find((s) => s.id === stageId + 1);
    const opened = nextStage && !unlocked(before, level, nextStage.id) && unlocked(nowBest, level, nextStage.id);
    const inReview = new Set(store.all('cards').map((c) => c.id));
    const toAdd = missed.filter((w) => !inReview.has(`v:${w.word.toLowerCase()}:meaning`));
    render(el, html`<div class="player">${top()}<div class="player-body stack-lg">
      <div class="game-result stack-sm">
        <p class="small faint">${LEVEL_LABEL[level]} · ${tt(`שלב ${stageId}`, `Stage ${stageId}`)}: ${stageName(stage)}</p>
        <p class="game-total num">${score}<span class="small faint"> / ${MAX_SCORE}</span></p>
        <p>${tt(`${right} מתוך ${questions.length} נכונות (${pctText(accuracy)})`, `${right} of ${questions.length} right (${pctText(accuracy)})`)}</p>
        ${record ? html`<p class="tag ok" style="width:fit-content">${prev ? tt(`שיא חדש! הקודם: ${prev.score}`, `New best! Previous: ${prev.score}`) : tt('השיא הראשון שלך בשלב הזה', 'Your first best for this stage')}</p>` : html`<p class="small faint">${tt(`השיא שלך: ${prev.score}`, `Your best: ${prev.score}`)}</p>`}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתח שלב ${nextStage.id}: ${nextStage.he}`, `Stage ${nextStage.id} is open: ${nextStage.en}`)}</span></p>` : ''}
        ${nextStage && !unlocked(nowBest, level, nextStage.id) ? html`<p class="small faint">${tt(`שלב ${nextStage.id} נפתח ב-${pctText(UNLOCK)}.`, `Stage ${nextStage.id} opens at ${pctText(UNLOCK)}.`)}</p>` : ''}
      </div>
      ${missed.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="stack-sm" style="list-style:none;padding:0;margin:0">${missed.map((w) => html`<li class="panel flat"><p><strong lang="en" dir="ltr">${w.word}</strong> = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></p><p class="small faint" lang="en" dir="ltr">${w.example}</p></li>`)}</ul>
        ${toAdd.length ? html`<button type="button" class="key" data-add>${icon('layers', { size: 16 })} ${tt(`להוסיף ${toAdd.length} מילים לחזרה המרווחת`, `Add ${toAdd.length} words to spaced review`)}</button>` : html`<p class="small faint">${tt('המילים האלה כבר בחזרה המרווחת שלך.', 'These words are already in your spaced review.')}</p>`}</section>` : html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('כל התשובות נכונות!', 'Every answer right!')}</span></p>`}
      <div class="row">
        <button type="button" class="key enter" data-again>${tt('עוד סיבוב', 'Play again')}</button>
        ${nextStage && unlocked(nowBest, level, nextStage.id) ? html`<a class="key" href="#/games/${level}/${nextStage.id}">${tt(`לשלב ${nextStage.id}`, `To stage ${nextStage.id}`)}</a>` : ''}
        <a class="key ghost" href="#/games">${tt('לכל הרמות', 'All levels')}</a>
      </div></div></div>`);
    $('[data-again]', el)?.focus({ preventScroll: true });
  }

  question();
  const offs = [
    on(el, 'click', '[data-opt]', (e, b) => { const q = questions[i]; const k = Number(b.dataset.opt); answer(k === q.answer, k); }),
    on(el, 'click', '[data-check]', () => { const v = $('#gw', el)?.value || ''; if (v.trim()) answer(typedCorrect(v, questions[i].answer), v); }),
    on(el, 'click', '[data-skip]', () => answer(false, '')),
    on(el, 'click', '[data-next]', next),
    on(el, 'click', '[data-say]', () => say(questions[i].word.word)),
    on(el, 'click', '[data-again]', () => { questions = makeRound(pool, stageId); i = 0; score = 0; right = 0; streak = 0; missed.length = 0; question(); }),
    on(el, 'click', '[data-add]', (e, b) => {
      const groups = new Map();
      for (const w of missed) groups.set(w.lesson, [...(groups.get(w.lesson) || []), w.src]);
      let n = 0;
      for (const [id, vocab] of groups) n += addVocabCards({ id, level, vocab });
      b.disabled = true;
      toast(n ? tt(`${n} מילים נוספו לחזרה המרווחת`, `${n} words added to spaced review`) : tt('המילים כבר בחזרה', 'Those words are already in review'));
    }),
    // Typing: the answer is checked as soon as it has as many letters as the hidden word, or on Enter.
    on(el, 'input', '#gw', (e, inp) => { const q = questions[i]; if (!answered && inp.value.replace(/\s/g, '').length >= q.answer.replace(/\s/g, '').length && typedCorrect(inp.value, q.answer)) answer(true, inp.value); }),
  ];
  const onKey = (e) => {
    if (done || (e.target.closest?.('input') && e.key !== 'Enter')) return;
    const q = questions[i];
    if (e.key === 'Enter') {
      if (answered) { e.preventDefault(); next(); }
      else if (q?.type === 'typed') { e.preventDefault(); $('[data-check]', el)?.click(); }
      return;
    }
    if (!answered && q?.type === 'choice' && /^[1-4]$/.test(e.key)) { const b = $(`[data-opt="${Number(e.key) - 1}"]`, el); if (b) b.click(); }
  };
  document.addEventListener('keydown', onKey);
  return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); offs.forEach((o) => o()); };
}

// Two short tones for right and wrong when sound is on in Settings (Web Audio, no files).
function sound() {
  let ctx = null;
  return (ok) => {
    if (settings().sound === false) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const notes = ok ? [660, 880] : [220];
      notes.forEach((f, k) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = 'sine';
        const t0 = ctx.currentTime + k * 0.09;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.2);
      });
    } catch { /* no audio: the colours and text still say right or wrong */ }
  };
}
