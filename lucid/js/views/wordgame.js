// Word game: levels and stages (#/games) and a round of 10 questions (#/games/<level>/<stage>).
// Every answer is marked right or wrong at once, with the right answer shown; a score with a small speed bonus
// and the best round per stage are kept. Logic is in js/core/wordgame.js.
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, t, legend, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, LEVEL_LABEL, toast } from '../ui/components.js';
import { store } from '../core/store.js';
import { model, settings, logEvent, addVocabCards } from '../core/learner.js';
import { LEVELS } from '../core/adaptive.js';
import { say, canSpeak } from '../core/speech.js';
import { STAGES, ROUND, UNLOCK, POINTS, BONUS, maxFor, wordPool, makeRound, checkAnswer, scoreFor, bests, isBetter, unlocked, recentWords } from '../core/wordgame.js';

const LAST = 'lucid-game-level';
const remember = (level) => { try { sessionStorage.setItem(LAST, level); } catch { /* storage blocked */ } };
const lastLevel = () => { try { return sessionStorage.getItem(LAST); } catch { return null; } };
const levelLessons = async (level) => {
  const [cur, available] = await Promise.all([content.curriculum(), content.availableLessons()]);
  const ids = (cur.levels.find((l) => l.id === level)?.lessons || []).map((l) => l.id).filter((id) => available.has(id));
  return (await Promise.all(ids.map((id) => content.lesson(id)))).filter(Boolean);
};
const stageName = (s) => tt(s.he, s.en);
const pctText = (x) => `${Math.round(x * 100)}%`;
const bonusText = (type) => BONUS[type].map(([ms, b]) => `${ms / 1000}s +${b}`).join(', ');

export default async function wordgame(el, ctx) {
  const { level, stage } = ctx.params;
  if (level && stage) return play(el, ctx, level, Number(stage));
  return hub(el, ctx);
}

// ---------- levels and stages ----------
async function hub(el, ctx) {
  ctx.setTitle(tt('משחק מילים', 'Word game'));
  const here = location.hash;
  const tx = await content.taxonomy();
  if (location.hash !== here) return null;
  const mine = model().courseLevel;

  function draw() {
    const best = bests(store.all('events'));
    render(el, html`
      <div class="page-head"><div><p class="small faint"><a href="#/practice">${t('nav.practice')}</a></p><h1>${tt('משחק מילים', 'Word game')}</h1>
        <p>${tt(`שאלון אוצר מילים והשלמת מילים: ${ROUND} שאלות בסיבוב, ותשובה נכונה או לא נכונה מיד. כל תשובה נכונה שווה ${POINTS} נקודות, ועוד בונוס על מהירות.`, `A vocabulary quiz and word completion: ${ROUND} questions a round, marked right or wrong at once. Each right answer is worth ${POINTS} points, plus a bonus for speed.`)}</p></div></div>
      <div class="banner small game-rules">${icon('info', { size: 16 })}<div class="stack-sm">
        <p>${tt(`בכל רמה שלושה שלבים. השלב הבא נפתח ב-${pctText(UNLOCK)} תשובות נכונות בשלב הקודם.`, `Each level has three stages. The next stage opens at ${pctText(UNLOCK)} right in the one before.`)}</p>
        <p>${tt('בונוס מהירות לכל תשובה נכונה: ', 'Speed bonus for each right answer: ')}<span lang="en" dir="ltr">${bonusText('choice')}</span>${tt('; בהקלדה: ', '; typing: ')}<span lang="en" dir="ltr">${bonusText('typed')}</span>.</p>
        <p class="faint">${tt('המשחק הוא תרגול: הוא לא משנה את הרמה שלך במסלול.', 'The game is practice: it does not change your level on the path.')}</p></div></div>
      <ol class="game-levels">${LEVELS.map((lvl) => {
        const meta = tx.levels.find((x) => x.id === lvl);
        return html`<li class="panel ${lvl === mine ? 'game-mine' : 'flat'}" id="lvl-${lvl}">
          <div class="row between"><h2 class="game-level-name"><span class="tag level">${LEVEL_LABEL[lvl]}</span> ${legend(meta?.name_en || lvl, meta?.name_he || lvl)}</h2>
            ${lvl === mine ? html`<span class="tag cobalt">${tt('הרמה שלך', 'Your level')}</span>` : ''}</div>
          <div class="game-stages">${STAGES.map((s) => {
            const b = best[`${lvl}:${s.id}`];
            const open = unlocked(best, lvl, s.id);
            const passed = b && b.accuracy >= UNLOCK;
            const inner = html`<span class="game-stage-num num">${s.id}</span><span class="grow"><span class="game-stage-name">${stageName(s)}</span>
              <span class="xsmall faint" style="display:block">${!open ? tt(`נפתח ב-${pctText(UNLOCK)} בשלב ${s.id - 1}`, `Opens at ${pctText(UNLOCK)} in stage ${s.id - 1}`) : b ? tt(`שיא: ${b.score} נקודות · ${b.correct} מתוך ${b.total}`, `Best: ${b.score} points · ${b.correct} of ${b.total}`) : tt(s.hintHe, s.hintEn)}</span></span>
              ${open ? (passed ? html`<span class="game-done">${icon('check', { size: 16 })}<span class="sr-only">${tt('עבר', 'Passed')}</span></span>` : '') : html`<span class="faint">${icon('lock', { size: 16 })}</span>`}`;
            return open ? html`<a class="game-stage" href="#/games/${lvl}/${s.id}">${inner}</a>` : html`<div class="game-stage is-locked">${inner}</div>`;
          })}</div></li>`;
      })}</ol>`);
  }
  draw();
  // After the router's scroll to the top: show the level played last, or the learner's own level.
  setTimeout(() => document.getElementById(`lvl-${lastLevel() || mine}`)?.scrollIntoView({ block: 'start' }), 0);
  ctx.watch(['events'], draw);
  return null;
}

// ---------- a round ----------
async function play(el, ctx, level, stageId) {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!LEVELS.includes(level) || !stage) { ctx.navigate('games', { replace: true }); return null; }
  ctx.setTitle(`${tt('משחק מילים', 'Word game')} · ${LEVEL_LABEL[level]}`);
  let before = bests(store.all('events'));
  if (!unlocked(before, level, stageId)) { toast(tt(`השלב הזה נפתח ב-${pctText(UNLOCK)} בשלב הקודם`, `This stage opens at ${pctText(UNLOCK)} in the stage before`)); ctx.navigate('games', { replace: true }); return null; }
  remember(level);
  const here = location.hash;
  const pool = wordPool(await levelLessons(level), level);
  if (location.hash !== here) return null; // the learner left while the words were loading
  const newRound = (focus = []) => makeRound(pool, stageId, { focus, recent: recentWords(store.all('events'), level, stageId) });
  let questions = newRound();
  if (!questions.length) {
    render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack">
      <h1>${tt('המילים של הרמה הזו לא נטענו', "This level's words did not load")}</h1>
      <p>${navigator.onLine ? tt('נסו שוב בעוד רגע.', 'Try again in a moment.') : tt('אין חיבור לאינטרנט. כדי לשחק בלי חיבור, שמרו את השיעורים בהגדרות, "שימוש בלי אינטרנט".', 'You are offline. To play offline, save the lessons in Settings, "Offline use".')}</p>
      <a class="key" href="#/games">${tt('לכל הרמות', 'All levels')}</a></div></div></div>`);
    return null;
  }
  let i = 0, score = 0, bonusTotal = 0, right = 0, streak = 0, started = 0, answered = false, done = false, timer = null;
  const missed = [];

  const scoreBadge = () => html`<span class="game-score num"><span class="sr-only">${tt('ניקוד:', 'Score:')} </span>${score}</span>`;
  function top() {
    const pct = Math.round(((i + (answered ? 1 : 0)) / questions.length) * 100);
    return html`<div class="player-top">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בסיבוב', 'Round progress')}"><span style="width:${pct}%"></span></div>
      <span class="step-count">${tt(`שאלה ${Math.min(i + 1, questions.length)} מתוך ${questions.length}`, `Question ${Math.min(i + 1, questions.length)} of ${questions.length}`)}</span>${scoreBadge()}</div>`;
  }
  const head = () => html`<h1 class="sr-only">${tt('משחק מילים', 'Word game')}, ${LEVEL_LABEL[level]}, ${tt(`שלב ${stageId}`, `stage ${stageId}`)}</h1>
    <p class="small faint row between"><span><span class="tag level">${LEVEL_LABEL[level]}</span> ${tt(`שלב ${stageId}`, `Stage ${stageId}`)}: ${stageName(stage)}</span>${streak >= 3 ? html`<span class="tag ok">${tt(`רצף ${streak}`, `${streak} in a row`)}</span>` : ''}</p>`;
  const mask = (q) => html`<span class="game-mask" lang="en" dir="ltr" aria-label="${tt(`${q.answer.length} תווים`, `${q.answer.length} characters`)}">${q.hint.map((w) => html`<span class="game-mask-word">${w.map((c) => (c === '_' ? html`<span class="slot"></span>` : html`<span class="slot shown">${c}</span>`))}</span>`)}</span>${q.words > 1 ? html` <span class="xsmall faint">${tt(`(${q.words} מילים)`, `(${q.words} words)`)}</span>` : ''}`;

  function question() {
    const q = questions[i];
    answered = false;
    done = false;
    started = performance.now();
    // Typing: the same input stays in place from question to question, so a phone keyboard stays open.
    const inp = $('#gw', el);
    if (q.type === 'typed' && inp) {
      $('.player-top', el).outerHTML = String(top());
      render($('[data-head]', el), head());
      $('[data-before]', el).textContent = q.before;
      $('[data-after]', el).textContent = q.after;
      render($('[data-hint]', el), html`<span class="faint">${tt('רמז:', 'Hint:')}</span> <span lang="he" dir="rtl">${isolateLatin(q.word.meaning || q.word.he)}</span> · ${mask(q)}`);
      inp.value = ''; inp.readOnly = false; inp.className = 'input game-input'; inp.size = Math.max(4, q.answer.length + 1); inp.maxLength = q.answer.length + 6;
      $$('[data-check], [data-skip]', el).forEach((b) => { b.disabled = false; });
      render($('#gfb', el), '');
      inp.focus({ preventScroll: true });
      return;
    }
    let body;
    if (q.type === 'choice') {
      const prompt = stageId === 1
        ? html`<div class="game-prompt"><span lang="en" dir="ltr" class="game-word">${q.prompt}</span>${q.word.ipa ? html`<span class="small faint" lang="en" dir="ltr">${q.word.ipa}</span>` : ''}${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}</div>`
        : html`<div class="game-prompt"><span lang="he" dir="rtl" class="game-word">${isolateLatin(q.prompt)}</span></div>`;
      body = html`${prompt}<div class="options" role="group" aria-label="${tt('תשובות', 'Answers')}">${q.options.map((o, k) => html`<button type="button" class="option" data-opt="${k}"><span class="k" aria-hidden="true">${k + 1}</span><span class="game-opt" ${stageId === 1 ? html`lang="he" dir="rtl"` : html`lang="en" dir="ltr"`}>${stageId === 1 ? isolateLatin(o) : o}</span><span class="game-mark" aria-hidden="true"></span></button>`)}</div>`;
    } else {
      body = html`<div class="game-prompt stack-sm"><p class="game-sentence" lang="en" dir="ltr"><span data-before>${q.before}</span><input class="input game-input" id="gw" aria-label="${tt('המילה החסרה', 'The missing word')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" lang="en" dir="ltr" size="${Math.max(4, q.answer.length + 1)}" maxlength="${q.answer.length + 6}"><span data-after>${q.after}</span></p>
        <p class="small" data-hint><span class="faint">${tt('רמז:', 'Hint:')}</span> <span lang="he" dir="rtl">${isolateLatin(q.word.meaning || q.word.he)}</span> · ${mask(q)}</p></div>
        <div class="row"><button type="button" class="key enter" data-check>${t('check')}</button><button type="button" class="key ghost" data-skip>${tt('לא יודע/ת', "I don't know")}</button></div>`;
    }
    render(el, html`<div class="player">${top()}<div class="player-body stack" id="gbody" tabindex="-1"><div data-head>${head()}</div>${body}<div id="gfb" class="game-feedback" aria-live="assertive"></div></div></div>`);
    if (q.type === 'typed') setTimeout(() => $('#gw', el)?.focus(), 30);
    else setTimeout(() => $('#gbody', el)?.focus({ preventScroll: true }), 30); // keys 1-4 answer; no option looks pre-selected
  }

  // Marks the answer at once and shows the right answer. A right answer moves on by itself; after a wrong one
  // the game waits, so the correction can be read (Enter or "Next").
  function answer(result, given) {
    if (answered) return;
    answered = true;
    const q = questions[i];
    const correct = result.correct;
    const ms = performance.now() - started;
    const { points, bonus } = scoreFor(correct, ms, q.type);
    const earned = result.almost ? POINTS : points; // a spelling slip counts, without the speed bonus
    score += earned;
    bonusTotal += result.almost ? 0 : bonus;
    if (correct) { right++; streak++; } else { streak = 0; missed.push(q.word); }
    playTone(correct);
    if (q.type === 'choice') {
      $$('[data-opt]', el).forEach((b) => {
        b.disabled = true;
        const k = Number(b.dataset.opt);
        if (k === q.answer) { b.classList.add('is-right'); render($('.game-mark', b), icon('check', { size: 18 })); }
        else if (k === given) { b.classList.add('is-wrong'); render($('.game-mark', b), icon('x', { size: 18 })); }
      });
    } else {
      const inp = $('#gw', el);
      inp.readOnly = true;
      inp.classList.add(correct ? 'right' : 'wrong');
      $$('[data-check], [data-skip]', el).forEach((b) => { b.disabled = true; });
    }
    const pair = html`<span lang="en" dir="ltr"><strong>${q.word.word}</strong></span> = <span lang="he" dir="rtl">${isolateLatin(q.word.he)}</span>`;
    const pointsLine = correct ? (result.almost ? tt(`+${POINTS} (בלי בונוס, בגלל האיות)`, `+${POINTS} (no bonus for the spelling)`) : bonus ? tt(`+${POINTS} ובונוס מהירות ${bonus}`, `+${POINTS} and a speed bonus of ${bonus}`) : `+${POINTS}`) : '';
    render($('#gfb', el), html`<div class="game-verdict ${correct ? 'ok' : 'bad'}">
      <p class="row" style="font-weight:600">${icon(correct ? 'check' : 'x', { size: 20 })}<span>${correct ? tt('נכון!', 'Right!') : tt('לא נכון', 'Not right')}</span>${correct ? html`<span class="game-plus num">${pointsLine}</span>` : ''}</p>
      ${result.almost ? html`<p class="small">${tt('כמעט מושלם. האיות הנכון:', 'Nearly perfect. The spelling is:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      ${result.variant ? html`<p class="small">${tt('נכון באיות האמריקאי או הבריטי. במשפט הזה:', 'Right in US or UK spelling. In this sentence:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      ${!correct && q.type === 'typed' ? html`<p>${tt('התשובה:', 'Answer:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      <p class="small">${pair}</p>${q.word.example ? html`<p class="small faint" lang="en" dir="ltr">${q.word.example}</p>` : ''}
      <button type="button" class="key small" data-next>${i + 1 < questions.length ? tt('לשאלה הבאה', 'Next question') : tt('לתוצאות', 'See results')}</button></div>`);
    $('.player-top', el).outerHTML = String(top());
    if (q.type === 'choice' && !correct) $('[data-next]', el)?.focus({ preventScroll: true });
    if (correct) timer = setTimeout(next, 1100);
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
    const round = { score, correct: right };
    const record = isBetter(prev, round);
    logEvent({ type: 'game-round', level, stage: stageId, score, correct: right, total: questions.length, accuracy, words: questions.map((q) => q.word.word) });
    const nowBest = bests(store.all('events'));
    const nextStage = STAGES.find((s) => s.id === stageId + 1);
    const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
    const opened = nextStage && !unlocked(before, level, nextStage.id) && unlocked(nowBest, level, nextStage.id);
    const inReview = new Set(store.all('cards', { includeDeleted: true }).map((c) => c.id));
    const toAdd = missed.filter((w) => !inReview.has(`v:${w.word.toLowerCase()}:meaning`));
    const n = toAdd.length;
    render(el, html`<div class="player">${top()}<div class="player-body stack-lg">
      <div class="game-result stack-sm">
        <p class="small faint">${LEVEL_LABEL[level]} · ${tt(`שלב ${stageId}`, `Stage ${stageId}`)}: ${stageName(stage)}</p>
        <h1 class="game-total num" tabindex="-1">${tt(`${score} נקודות`, `${score} points`)}<span class="small faint"> <bdi dir="ltr">/ ${maxFor(questions.length)}</bdi></span></h1>
        <p>${tt(`${right} מתוך ${questions.length} נכונות (${pctText(accuracy)})`, `${right} of ${questions.length} right (${pctText(accuracy)})`)}</p>
        <p class="small faint">${tt(`${right} × ${POINTS} = ${score - bonusTotal}, ובונוס מהירות ${bonusTotal}`, `${right} × ${POINTS} = ${score - bonusTotal}, plus a speed bonus of ${bonusTotal}`)}</p>
        ${record ? html`<p class="tag ok" style="width:fit-content">${prev ? tt(`שיא חדש! הקודם: ${prev.score} נקודות, ${prev.correct} נכונות`, `New best! Previous: ${prev.score} points, ${prev.correct} right`) : tt('השיא הראשון שלך בשלב הזה', 'Your first best for this stage')}</p>` : html`<p class="small faint">${tt(`השיא שלך: ${prev.score} נקודות, ${prev.correct} מתוך ${prev.total}`, `Your best: ${prev.score} points, ${prev.correct} of ${prev.total}`)}</p>`}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתח שלב ${nextStage.id}: ${nextStage.he}`, `Stage ${nextStage.id} is open: ${nextStage.en}`)}</span></p>` : ''}
        ${nextStage && !unlocked(nowBest, level, nextStage.id) ? html`<p class="small faint">${tt(`שלב ${nextStage.id} נפתח ב-${pctText(UNLOCK)}.`, `Stage ${nextStage.id} opens at ${pctText(UNLOCK)}.`)}</p>` : ''}
        ${!nextStage && accuracy >= UNLOCK && nextLevel ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`סיימת את שלושת השלבים של ${LEVEL_LABEL[level]}. אפשר להמשיך ל-${LEVEL_LABEL[nextLevel]}.`, `You finished all three stages of ${LEVEL_LABEL[level]}. You can go on to ${LEVEL_LABEL[nextLevel]}.`)}</span></p>` : ''}
      </div>
      ${missed.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="stack-sm" style="list-style:none;padding:0;margin:0">${missed.map((w) => html`<li class="panel flat"><p><strong lang="en" dir="ltr">${w.word}</strong> = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></p><p class="small faint" lang="en" dir="ltr">${w.example}</p></li>`)}</ul>
        <div class="row"><button type="button" class="key" data-missed>${tt(missed.length === 1 ? 'לשחק שוב במילה שפספסתי' : `לשחק במילים שפספסתי (${missed.length})`, missed.length === 1 ? 'Play the word I missed again' : `Play the words I missed (${missed.length})`)}</button>
        ${n ? html`<button type="button" class="key ghost" data-add>${icon('layers', { size: 16 })} ${n === 1 ? tt('להוסיף את המילה לחזרה המרווחת', 'Add the word to spaced review') : tt(`להוסיף ${n} מילים לחזרה המרווחת`, `Add ${n} words to spaced review`)}</button>` : html`<span class="small faint">${tt('המילים האלה כבר בחזרה המרווחת שלך.', 'These words are already in your spaced review.')}</span>`}</div></section>` : html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('כל התשובות נכונות!', 'Every answer right!')}</span></p>`}
      <div class="row">
        <button type="button" class="key enter" data-again>${tt('עוד סיבוב', 'Play again')}</button>
        ${nextStage && unlocked(nowBest, level, nextStage.id) ? html`<a class="key" href="#/games/${level}/${nextStage.id}">${tt(`לשלב ${nextStage.id}`, `To stage ${nextStage.id}`)}</a>` : ''}
        ${!nextStage && accuracy >= UNLOCK && nextLevel ? html`<a class="key" href="#/games/${nextLevel}/1">${tt(`ל-${LEVEL_LABEL[nextLevel]}, שלב 1`, `To ${LEVEL_LABEL[nextLevel]}, stage 1`)}</a>` : ''}
        <a class="key ghost" href="#/games">${tt('לכל הרמות', 'All levels')}</a>
      </div></div></div>`);
    $('.game-total', el)?.focus({ preventScroll: true });
  }

  function restart(focus = []) {
    before = bests(store.all('events'));
    questions = newRound(focus);
    i = 0; score = 0; bonusTotal = 0; right = 0; streak = 0; missed.length = 0;
    question();
  }

  question();
  const offs = [
    on(el, 'click', '[data-opt]', (e, b) => { const q = questions[i]; const k = Number(b.dataset.opt); answer({ correct: k === q.answer }, k); }),
    on(el, 'click', '[data-check]', () => { const v = $('#gw', el)?.value || ''; if (v.trim()) answer(checkAnswer(v, questions[i].answer), v); else $('#gw', el)?.focus(); }),
    on(el, 'click', '[data-skip]', () => answer({ correct: false }, '')),
    on(el, 'click', '[data-next]', next),
    on(el, 'click', '[data-say]', async () => {
      // Listening does not cost speed points: the time the word is spoken is not counted.
      const t0 = performance.now();
      await say(questions[i].word.word);
      if (!answered) started += performance.now() - t0;
    }),
    on(el, 'click', '[data-again]', () => restart()),
    on(el, 'click', '[data-missed]', () => restart(missed.map((w) => w.word))),
    on(el, 'click', '[data-add]', (e, b) => {
      const groups = new Map();
      for (const w of missed) groups.set(w.lesson, [...(groups.get(w.lesson) || []), w.src]);
      let added = 0;
      for (const [id, vocab] of groups) added += addVocabCards({ id, level, vocab }, new Date(), 'game');
      b.disabled = true;
      toast(added === 1 ? tt('המילה נוספה לחזרה המרווחת', 'The word was added to spaced review') : added ? tt(`${added} מילים נוספו לחזרה המרווחת`, `${added} words added to spaced review`) : tt('המילים כבר בחזרה', 'Those words are already in review'));
    }),
    // Typing: a right answer is accepted as soon as it is complete; anything else waits for Enter or Check.
    on(el, 'input', '#gw', (e, inp) => {
      const q = questions[i];
      if (answered || inp.value.replace(/\s/g, '').length < q.answer.replace(/\s/g, '').length) return;
      const r = checkAnswer(inp.value, q.answer);
      if (r.correct && !r.almost) answer(r, inp.value);
    }),
  ];
  // Keyboard, as in the lesson player: Enter on another control (a link, "I don't know", the speaker) does that
  // control's own job; otherwise Enter checks, then moves on. 1-4 choose an answer.
  const onKey = (e) => {
    if (done || e.isComposing || e.target.closest?.('dialog')) return;
    const q = questions[i];
    const onControl = ['BUTTON', 'A'].includes(e.target.tagName);
    if (e.key === 'Enter') {
      if (answered) { if (!onControl || e.target.matches('[data-next]') || e.target.id === 'gw') { e.preventDefault(); next(); } }
      else if (q?.type === 'typed' && e.target.id === 'gw') { e.preventDefault(); $('[data-check]', el)?.click(); }
      return;
    }
    if (!answered && q?.type === 'choice' && !e.target.closest?.('input') && /^[1-4]$/.test(e.key)) $(`[data-opt="${Number(e.key) - 1}"]`, el)?.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); offs.forEach((o) => o()); };
}

// Two short tones for right and wrong (Settings, "Sounds in the word game"). One audio context for the app.
let audioCtx = null;
function playTone(ok) {
  const s = settings().sound;
  if (s === false || s === 'off') return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    (ok ? [660, 880] : [220]).forEach((f, k) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; o.type = 'sine';
      const t0 = audioCtx.currentTime + k * 0.09;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + 0.2);
    });
  } catch { /* no audio: the colours, icons and text still say right or wrong */ }
}
