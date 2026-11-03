// Word game: levels and stages (#/games) and a round of 10 questions (#/games/<level>/<stage>).
// Every answer is marked right or wrong at once, with the right answer shown, and the game waits for the learner
// to move on. A score (with a speed bonus only in the opt-in speed challenge) and the best round per stage and
// mode are kept. Logic is in js/core/wordgame.js.
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, t, legend, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, LEVEL_LABEL, toast } from '../ui/components.js';
import { store } from '../core/store.js';
import { model, logEvent, addVocabCards, settings, saveSettings } from '../core/learner.js';
import { playTone } from '../ui/sound.js';
import { LEVELS } from '../core/adaptive.js';
import { say, canSpeak } from '../core/speech.js';
import { STAGES, ROUND, UNLOCK, POINTS, BONUS, maxFor, wordPool, makeRound, checkAnswer, scoreFor, bests, isBetter, unlocked, recentWords, paceOf } from '../core/wordgame.js';
import * as pics from '../core/picturegame.js';
import * as mem from '../core/memorygame.js';
import { picture, lockedPage } from './picturegame.js';

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
const plus = (n) => html`<bdi dir="ltr" class="num">${n < 0 ? `−${-n}` : `+${n}`}</bdi>`;
const secs = (ms) => tt(`עד ${ms / 1000} שניות`, `up to ${ms / 1000} s`);

// "How points are counted", shown only with the speed challenge on: one small table per game, in words.
function scoringTable() {
  const group = (he, en, rows) => html`<tbody><tr><th colspan="2" scope="colgroup">${tt(he, en)}</th></tr>${rows.map(([what, n]) => html`<tr><td>${what}</td><td>${plus(n)}</td></tr>`)}</tbody>`;
  return html`<details class="game-scoring"><summary>${tt('איך מנקדים?', 'How are points counted?')}</summary>
    <table class="game-scoring-table">
      ${group('בשאלון', 'Quiz', [[tt('תשובה נכונה', 'A right answer'), POINTS], ...BONUS.choice.map(([ms, b]) => [tt(`בונוס: בחירה ${secs(ms)}`, `Bonus: choosing in ${secs(ms)}`), b]), ...BONUS.typed.map(([ms, b]) => [tt(`בונוס: הקלדה ${secs(ms)}`, `Bonus: typing in ${secs(ms)}`), b])])}
      ${group('בהתאמת מילים לתמונות', 'Words and pictures', [[tt('זוג נכון', 'A right pair'), pics.MATCH], [tt('טעות', 'A mistake'), -pics.MISTAKE], ...pics.BOARD_BONUS.map(([ms, b]) => [tt(`בונוס: לוח שלם ${secs(ms)} לזוג`, `Bonus: a whole board in ${secs(ms)} a pair`), b])])}
      ${group('במשחק הזיכרון', 'Memory', [[tt('זוג', 'A pair'), mem.MATCH], [tt('קלף אחר אחרי שהזוג כבר נראה', 'Another card after the pair was seen'), -mem.SLIP], ...mem.TURN_BONUS.map(([n, b]) => [tt(`בונוס: עד ${n} תורות לזוג`, `Bonus: up to ${n} turns a pair`), b])])}
    </table></details>`;
}

export default async function wordgame(el, ctx) {
  const { level, stage } = ctx.params;
  if (level && stage) return play(el, ctx, level, Number(stage));
  return hub(el, ctx);
}

// ---------- levels and stages ----------
// The learner's level first, with its three stages; the other levels as one compact row each. The picture and
// memory games list their open levels; locked ones are folded into one line. Levels up to the course level are
// open in those two games (placement is evidence); above it, 70% in the level before opens the next.
async function hub(el, ctx) {
  ctx.setTitle(t('nav.games'));
  const here = location.hash;
  const [tx, pictureData] = await Promise.all([content.taxonomy(), content.pictures()]);
  if (location.hash !== here) return null;
  const course = model().courseLevel;
  const mine = LEVELS.includes(course) ? course : LEVELS[0];
  // The two picture games share the levels of content/pictures.json; each has its own bests and unlocking.
  const sets = pictureData?.sets || [];
  const openTo = pics.openUpTo(sets, mine);
  const pictureGames = [
    { id: 'pictures', route: 'pictures', type: 'picture-round', he: 'התאמת מילים לתמונות', en: 'Words and pictures',
      lineHe: `${pics.BOARDS} לוחות בסיבוב. כל זוג נכון = ${pics.MATCH} נקודות, וטעות מורידה ${pics.MISTAKE}.`,
      lineEn: `${pics.BOARDS} boards a round. Each right pair = ${pics.MATCH} points; a mistake takes off ${pics.MISTAKE}.`,
      sizeHe: (s) => `${s.pairs} זוגות בלוח`, sizeEn: (s) => `${s.pairs} pairs a board`, iconOf: (s) => s.words[0].icon },
    { id: 'memory', route: 'memory', type: mem.TYPE, he: 'משחק זיכרון', en: 'Memory game',
      lineHe: `הופכים שני קלפים בכל תור ומחפשים תמונה והמילה שלה. כל זוג = ${mem.MATCH} נקודות.`,
      lineEn: `Turn two cards each turn to find a picture and its word. Each pair = ${mem.MATCH} points.`,
      sizeHe: (s) => `${s.memory_pairs * 2} קלפים`, sizeEn: (s) => `${s.memory_pairs * 2} cards`, iconOf: (s) => s.words[1].icon },
  ];
  const doneMark = () => html`<span class="game-done">${icon('check', { size: 16 })}<span class="sr-only">${tt('עבר', 'Passed')}</span></span>`;
  const pictureSection = (g, mode) => {
    const best = pics.bests(store.all('events'), g.type);
    const shownBest = pics.bests(store.all('events'), g.type, mode);
    const open = sets.filter((s) => pics.unlocked(best, s.level, openTo));
    const locked = sets.filter((s) => !open.includes(s)).map((s) => s.level);
    return html`<section class="stack-sm game-section" id="lvl-${g.id}" aria-labelledby="${g.id}-h">
      <h2 id="${g.id}-h">${tt(g.he, g.en)}</h2>
      <p class="small muted">${tt(g.lineHe, g.lineEn)}</p>
      ${sets.length ? '' : html`<p class="banner small">${icon('info', { size: 16 })}<span>${navigator.onLine ? tt('התמונות של המשחק לא נטענו. נסו שוב בעוד רגע.', "The game's pictures did not load. Try again in a moment.") : tt('התמונות של המשחק לא נטענו כי אין חיבור לאינטרנט. פתחו את Lucid פעם אחת עם חיבור, ואחר כך המשחק יעבוד גם בלעדיו.', "The game's pictures did not load because you are offline. Open Lucid once with a connection, and after that the game works without one.")}</span></p>`}
      <div class="game-stages">${open.map((set) => {
        const b = shownBest[set.level];
        const passed = (best[set.level]?.accuracy || 0) >= pics.UNLOCK;
        return html`<a class="game-stage" href="#/games/${g.route}/${set.level}"><span class="pic-level-icon">${picture(g.iconOf(set), 28)}</span><span class="grow"><span class="game-stage-name">${tt(`רמה ${set.level}: ${set.name_he}`, `Level ${set.level}: ${set.name_en}`)}</span>
          <span class="xsmall faint game-stage-sub">${b ? tt(`שיא: ${b.score} נקודות · ${pctText(b.accuracy)} דיוק`, `Best: ${b.score} points · ${pctText(b.accuracy)} accuracy`) : tt(`${g.sizeHe(set)} · ${set.cefr}`, `${g.sizeEn(set)} · ${set.cefr}`)}</span></span>${passed ? doneMark() : ''}</a>`;
      })}</div>
      ${locked.length ? html`<p class="game-locked small faint">${icon('lock', { size: 16 })}<span>${locked.length === 1
        ? tt(`רמה ${locked[0]} נפתחת ב-${pctText(pics.UNLOCK)} דיוק ברמה ${locked[0] - 1}.`, `Level ${locked[0]} opens at ${pctText(pics.UNLOCK)} accuracy in level ${locked[0] - 1}.`)
        : tt(`רמות ${locked.slice(0, -1).join(', ')} ו-${locked.at(-1)} נפתחות ב-${pctText(pics.UNLOCK)} דיוק ברמה הקודמת.`, `Levels ${locked.slice(0, -1).join(', ')} and ${locked.at(-1)} open at ${pctText(pics.UNLOCK)} accuracy in the level before.`)}</span></p>` : ''}
    </section>`;
  };
  const stageCard = (best, shownBest, lvl, s) => {
    const b = shownBest[`${lvl}:${s.id}`];
    const open = unlocked(best, lvl, s.id);
    const passed = (best[`${lvl}:${s.id}`]?.accuracy || 0) >= UNLOCK;
    const inner = html`<span class="game-stage-num num">${s.id}</span><span class="grow"><span class="game-stage-name">${stageName(s)}</span>
      <span class="xsmall faint game-stage-sub">${!open ? tt(`נפתח ב-${pctText(UNLOCK)} בשלב ${s.id - 1}`, `Opens at ${pctText(UNLOCK)} in stage ${s.id - 1}`) : b ? tt(`שיא: ${b.score} נקודות · ${b.correct} מתוך ${b.total}`, `Best: ${b.score} points · ${b.correct} of ${b.total}`) : tt(s.hintHe, s.hintEn)}</span></span>
      ${open ? (passed ? doneMark() : '') : html`<span class="faint">${icon('lock', { size: 16 })}</span>`}`;
    return open ? html`<a class="game-stage" href="#/games/${lvl}/${s.id}">${inner}</a>` : html`<div class="game-stage is-locked">${inner}</div>`;
  };
  // Another level: its name and three numbered stage keys (a lock on a stage not open yet).
  const stageChip = (best, lvl, s) => {
    const open = unlocked(best, lvl, s.id);
    const passed = (best[`${lvl}:${s.id}`]?.accuracy || 0) >= UNLOCK;
    const name = tt(`${LEVEL_LABEL[lvl]}, שלב ${s.id}: ${s.he}`, `${LEVEL_LABEL[lvl]}, stage ${s.id}: ${s.en}`);
    return open
      ? html`<a class="game-stage game-chip${passed ? ' is-done' : ''}" href="#/games/${lvl}/${s.id}" title="${name}"><span class="num" aria-hidden="true">${s.id}</span><span class="sr-only">${name}${passed ? tt(', עבר', ', passed') : ''}</span>${passed ? html`<span class="game-chip-mark" aria-hidden="true">${icon('check', { size: 12 })}</span>` : ''}</a>`
      : html`<span class="game-stage game-chip is-locked" title="${tt(`שלב ${s.id}: נעול`, `Stage ${s.id}: locked`)}"><span class="num" aria-hidden="true">${s.id}</span><span class="sr-only">${tt(`${LEVEL_LABEL[lvl]}, שלב ${s.id}: נעול`, `${LEVEL_LABEL[lvl]}, stage ${s.id}: locked`)}</span><span class="game-chip-mark" aria-hidden="true">${icon('lock', { size: 12 })}</span></span>`;
  };
  // The learner's level: its locked stages folded into one line, with their names.
  const lockedStages = (best, lvl) => {
    const locked = STAGES.filter((s) => !unlocked(best, lvl, s.id));
    if (!locked.length) return '';
    const named = (s) => tt(`שלב ${s.id} (${s.he})`, `stage ${s.id} (${s.en})`);
    return html`<p class="game-locked small faint">${icon('lock', { size: 16 })}<span>${locked.length === 1
      ? tt(`${named(locked[0])} נפתח ב-${pctText(UNLOCK)} תשובות נכונות בשלב ${locked[0].id - 1}.`, `Stage ${locked[0].id} (${locked[0].en}) opens at ${pctText(UNLOCK)} right in stage ${locked[0].id - 1}.`)
      : tt(`${named(locked[0])} ו${named(locked[1])} נפתחים ב-${pctText(UNLOCK)} תשובות נכונות בשלב שלפניהם.`, `Stage ${locked[0].id} (${locked[0].en}) and ${named(locked[1])} open at ${pctText(UNLOCK)} right in the stage before each.`)}</span></p>`;
  };
  const levelName = (lvl) => { const meta = tx.levels.find((x) => x.id === lvl); return legend(meta?.name_en || lvl, meta?.name_he || lvl); };

  function draw() {
    const all = store.all('events');
    const best = bests(all);
    const { challenge, relaxed, mode } = paceOf(settings());
    const shownBest = bests(all, mode);
    render(el, html`
      <div class="page-head"><div><p class="small faint"><a href="#/practice">${t('nav.practice')}</a></p><h1>${t('nav.games')}</h1>
        <p>${tt('שלושה משחקים לתרגול מילים. הם לא משנים את הרמה שלכם במסלול.', 'Three games to practise words. They do not change your level on the path.')}</p></div></div>
      <div class="stack-sm game-pace">
        <label class="choice game-challenge"><input type="checkbox" data-challenge ${challenge ? html`checked` : ''}><span class="grow small"><strong>${tt('אתגר מהירות', 'Speed challenge')}</strong><br>${relaxed ? tt('כבוי: אין שעון, והמשחק מחכה לכם. פועל: תשובה מהירה מוסיפה נקודות, עם שיאים נפרדים.', 'Off: no clock, and the game waits for you. On: a quick answer earns extra points, with bests of its own.') : tt('כבוי: אין שעון ואין בונוס. פועל: תשובה מהירה מוסיפה נקודות, עם שיאים נפרדים.', 'Off: no clock and no bonus. On: a quick answer earns extra points, with bests of its own.')}</span></label>
        ${relaxed ? '' : html`<p class="small muted" data-pace-note>${tt('״קצב רגוע״ כבוי בהגדרות, ולכן המשחקים עוברים לבד לשאלה הבאה והופכים בחזרה קלפים שלא התאימו.', '"Relaxed pace" is off in Settings, so the games move on by themselves and turn unmatched cards back over.')} <a href="#/settings">${tt('להגדרות', 'To Settings')}</a></p>`}
        ${challenge ? scoringTable() : ''}
      </div>
      <section class="stack-sm game-section" id="lvl-quiz" aria-labelledby="quiz-h">
        <h2 id="quiz-h">${tt('שאלון אוצר מילים והשלמת מילים', 'Vocabulary quiz and word completion')}</h2>
        <p class="small muted">${tt(`${ROUND} שאלות. כל תשובה נכונה = ${POINTS} נקודות.`, `${ROUND} questions. Each right answer = ${POINTS} points.`)}</p>
        <ul class="game-levels">
          <li class="panel game-mine" id="lvl-${mine}">
            <div class="row between"><h3 class="game-level-name"><span class="tag level">${LEVEL_LABEL[mine]}</span> ${levelName(mine)}</h3>
              <span class="tag cobalt">${tt('הרמה שלך', 'Your level')}</span></div>
            <div class="game-stages">${STAGES.filter((s) => unlocked(best, mine, s.id)).map((s) => stageCard(best, shownBest, mine, s))}</div>
            ${lockedStages(best, mine)}</li>
          ${LEVELS.filter((l) => l !== mine).map((lvl) => html`<li class="game-level-row" id="lvl-${lvl}">
            <h3 class="game-level-name"><span class="tag level">${LEVEL_LABEL[lvl]}</span> ${levelName(lvl)}</h3>
            <div class="game-chips" role="group" aria-label="${tt(`השלבים של ${LEVEL_LABEL[lvl]}`, `${LEVEL_LABEL[lvl]} stages`)}">${STAGES.map((s) => stageChip(best, lvl, s))}</div></li>`)}
        </ul>
      </section>
      ${pictureGames.map((g) => pictureSection(g, mode))}`);
  }
  draw();
  // Back from a game (after the router's scroll to the top): show the level played last. Coming from anywhere else,
  // the page stays at the top, where the learner's own level comes first.
  const last = /^#\/games\/./.test(ctx.from || '') && lastLevel();
  if (last) setTimeout(() => document.getElementById(`lvl-${last}`)?.scrollIntoView({ block: 'start' }), 0);
  ctx.watch(['events'], draw);
  // The speed challenge switch: saved at once, and the page redrawn with that mode's bests and rules.
  const off = on(el, 'change', '[data-challenge]', (e, inp) => {
    saveSettings({ game_speed_challenge: inp.checked });
    draw();
    $('[data-challenge]', el)?.focus({ preventScroll: true });
  });
  return off;
}

// ---------- a round ----------
async function play(el, ctx, level, stageId) {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!LEVELS.includes(level) || !stage) { ctx.navigate('games', { replace: true }); return null; }
  ctx.setTitle(`${tt('משחק מילים', 'Word game')} · ${LEVEL_LABEL[level]}`);
  let before = bests(store.all('events'));
  let pace = paceOf(settings());
  let mineBefore = bests(store.all('events'), pace.mode);
  if (!unlocked(before, level, stageId)) {
    const reach = [...STAGES].reverse().find((s) => s.id < stageId && unlocked(before, level, s.id));
    lockedPage(el, {
      title: tt('השלב הזה עוד נעול', 'This stage is still locked'),
      text: tt(`שלב ${stageId} של ${LEVEL_LABEL[level]} נפתח ב-${pctText(UNLOCK)} תשובות נכונות בשלב ${stageId - 1}.`, `Stage ${stageId} of ${LEVEL_LABEL[level]} opens at ${pctText(UNLOCK)} right in stage ${stageId - 1}.`),
      next: reach && { href: `#/games/${level}/${reach.id}`, label: tt(`לשלב ${reach.id}: ${reach.he}`, `To stage ${reach.id}: ${reach.en}`) },
    });
    return null;
  }
  remember(level);
  const here = location.hash;
  const pool = wordPool(await levelLessons(level), level);
  if (location.hash !== here) return null; // the learner left while the words were loading
  const newRound = (focus = []) => makeRound(pool, stageId, { focus, recent: recentWords(store.all('events'), level, stageId) });
  let questions = newRound(String(ctx.query.focus || '').split('|').filter(Boolean)); // ?focus=: the words missed in review come first
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
  // The counter has its own row on phones and at 130-150% text, like the lesson's (LF-7 .counting).
  function top() {
    const pct = Math.round(((i + (answered ? 1 : 0)) / questions.length) * 100);
    return html`<div class="player-top counting">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בסיבוב', 'Round progress')}"><span style="width:${pct}%"></span></div>
      <span class="top-meta is-count"><span class="step-count">${tt(`שאלה ${Math.min(i + 1, questions.length)} מתוך ${questions.length}`, `Question ${Math.min(i + 1, questions.length)} of ${questions.length}`)}</span></span>${scoreBadge()}</div>`;
  }
  const head = () => html`<h1 class="sr-only">${tt('משחק מילים', 'Word game')}, ${LEVEL_LABEL[level]}, ${tt(`שלב ${stageId}`, `stage ${stageId}`)}</h1>
    <p class="small faint row between"><span><span class="tag level">${LEVEL_LABEL[level]}</span> ${tt(`שלב ${stageId}`, `Stage ${stageId}`)}: ${stageName(stage)}</span>${pace.challenge && streak >= 3 ? html`<span class="tag ok">${tt(`רצף ${streak}`, `${streak} in a row`)}</span>` : ''}</p>`;
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
      setFoot('typed');
      render($('#gfb', el), '');
      inp.focus({ preventScroll: true });
      return;
    }
    let body;
    if (q.type === 'choice') {
      const prompt = stageId === 1
        ? html`<div class="game-prompt"><span lang="en" dir="ltr" class="game-word">${q.prompt}</span>${q.word.ipa ? html`<span class="small faint" lang="en" dir="ltr">${q.word.ipa}</span>` : ''}${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}</div>`
        : html`<div class="game-prompt"><span lang="he" dir="rtl" class="game-word">${isolateLatin(q.prompt)}</span></div>`;
      body = html`${prompt}<p class="small faint game-instant">${tt('הבחירה נבדקת מיד.', 'Your choice is checked at once.')}</p><div class="options game-options" role="group" aria-label="${tt('תשובות', 'Answers')}">${q.options.map((o, k) => html`<button type="button" class="option" data-opt="${k}"><span class="k" aria-hidden="true">${k + 1}</span><span class="game-opt" ${stageId === 1 ? html`lang="he" dir="rtl"` : html`lang="en" dir="ltr"`}>${stageId === 1 ? isolateLatin(o) : o}</span><span class="game-mark" aria-hidden="true"></span></button>`)}</div>`;
    } else {
      body = html`<div class="game-prompt stack-sm"><p class="game-sentence" lang="en" dir="ltr"><span data-before>${q.before}</span><input class="input game-input" id="gw" aria-label="${tt('המילה החסרה', 'The missing word')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" lang="en" dir="ltr" size="${Math.max(4, q.answer.length + 1)}" maxlength="${q.answer.length + 6}"><span data-after>${q.after}</span></p>
        <p class="small" data-hint><span class="faint">${tt('רמז:', 'Hint:')}</span> <span lang="he" dir="rtl">${isolateLatin(q.word.meaning || q.word.he)}</span> · ${mask(q)}</p></div>`;
    }
    render(el, html`<div class="player">${top()}<div class="player-body stack" id="gbody" tabindex="-1"><div data-head>${head()}</div>${body}<div id="gfb" class="game-feedback" aria-live="assertive"></div></div></div>`);
    if (q.type === 'typed') setFoot('typed');
    if (q.type === 'typed') setTimeout(() => $('#gw', el)?.focus(), 30);
    else setTimeout(() => $('#gbody', el)?.focus({ preventScroll: true }), 30); // keys 1-4 answer; no option looks pre-selected
  }

  // The footer, as in the lesson player: while typing, "I don't know" and Check; after any answer, one full-width
  // Continue key (Enter). A choice question has no footer until it is answered: the tap is the answer.
  function setFoot(kind) {
    let foot = $('#pfoot', el);
    if (!foot) { $('.player', el).insertAdjacentHTML('beforeend', '<div class="player-foot game-foot" id="pfoot"></div>'); foot = $('#pfoot', el); }
    render(foot, kind === 'next'
      ? html`<div class="inner"><span class="grow"></span><button type="button" class="key enter" data-next>${i + 1 < questions.length ? t('continue') : tt('לתוצאות', 'See results')} <span class="kbd">Enter</span></button></div>`
      : html`<div class="inner"><button type="button" class="key ghost" data-skip>${tt('לא יודע/ת', "I don't know")}</button><span class="grow"></span><button type="button" class="key enter" data-check>${t('check')} <span class="kbd">Enter</span></button></div>`);
  }

  // Marks the answer at once and shows the right answer. The game then waits, so the feedback can be read
  // (Enter or Continue); only with the calm pace turned off in Settings does a right answer move on by itself.
  function answer(result, given) {
    if (answered) return;
    answered = true;
    const q = questions[i];
    const correct = result.correct;
    const ms = performance.now() - started;
    const { points, bonus } = scoreFor(correct, ms, q.type, pace.challenge);
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
    }
    // Typing: when the answer came from the input, the focus stays there (Enter moves on), so a phone keyboard
    // stays open for the next sentence. Otherwise the Continue key takes the focus.
    const fromInput = document.activeElement?.id === 'gw';
    const pair = html`<span lang="en" dir="ltr"><strong>${q.word.word}</strong></span> = <span lang="he" dir="rtl">${isolateLatin(q.word.he)}</span>`;
    const plus = (n) => html`<bdi dir="ltr">+${n}</bdi>`;
    const pointsLine = !correct ? '' : result.almost && pace.challenge ? html`${plus(POINTS)} ${tt('(בלי בונוס, בגלל האיות)', '(no bonus for the spelling)')}` : bonus ? html`${plus(POINTS)} ${tt(`ובונוס מהירות ${bonus}`, `and a speed bonus of ${bonus}`)}` : plus(POINTS);
    render($('#gfb', el), html`<div class="game-verdict ${correct ? 'ok' : 'bad'}">
      <p class="row" style="font-weight:600">${icon(correct ? 'check' : 'x', { size: 20 })}<span>${correct ? tt('נכון', 'Right') : tt('לא נכון', 'Not right')}</span>${correct ? html`<span class="game-plus num">${pointsLine}</span>` : ''}</p>
      ${result.almost ? html`<p class="small">${tt('כמעט מושלם. האיות הנכון:', 'Nearly perfect. The spelling is:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      ${result.variant ? html`<p class="small">${tt('נכון באיות האמריקאי או הבריטי. במשפט הזה:', 'Right in US or UK spelling. In this sentence:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      ${!correct && q.type === 'typed' ? html`<p>${tt('התשובה:', 'Answer:')} <strong lang="en" dir="ltr">${q.answer}</strong></p>` : ''}
      <p class="small">${pair}</p>${q.word.example ? html`<p class="small faint" lang="en" dir="ltr">${q.word.example}</p>` : ''}</div>`);
    $('.player-top', el).outerHTML = String(top());
    setFoot('next');
    if (!fromInput) $('[data-next]', el)?.focus({ preventScroll: true });
    $('#gfb .game-verdict', el)?.scrollIntoView?.({ block: 'nearest' });
    if (correct && !pace.relaxed) timer = setTimeout(next, 1100);
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
    const prev = mineBefore[`${level}:${stageId}`];
    const round = { score, correct: right };
    const record = isBetter(prev, round);
    logEvent({ type: 'game-round', level, stage: stageId, score, correct: right, total: questions.length, accuracy, mode: pace.mode, words: questions.map((q) => q.word.word) });
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
        <h1 class="game-total num" tabindex="-1">${tt(`${score} נקודות`, `${score} points`)}<span class="small faint"> <bdi dir="ltr">/ ${maxFor(questions.length, pace.challenge)}</bdi></span></h1>
        <p>${tt(`${right} מתוך ${questions.length} נכונות (${pctText(accuracy)})`, `${right} of ${questions.length} right (${pctText(accuracy)})`)}</p>
        <p class="small faint">${tt('הניקוד:', 'Points:')} ${pace.challenge
          ? html`<bdi dir="ltr" class="num">${right} × ${POINTS} + ${bonusTotal} = ${score}</bdi> ${tt(`(בונוס מהירות: ${bonusTotal})`, `(speed bonus: ${bonusTotal})`)}`
          : html`<bdi dir="ltr" class="num">${right} × ${POINTS} = ${score}</bdi>`}</p>
        ${record ? html`<p class="tag ok" style="width:fit-content">${prev ? tt(`שיא חדש${pace.challenge ? ' באתגר מהירות' : ''}. הקודם: ${prev.score} נקודות, ${prev.correct} נכונות`, `New best${pace.challenge ? ' in the speed challenge' : ''}. Previous: ${prev.score} points, ${prev.correct} right`) : pace.challenge ? tt('השיא הראשון שלך בשלב הזה באתגר מהירות', 'Your first best for this stage in the speed challenge') : tt('השיא הראשון שלך בשלב הזה', 'Your first best for this stage')}</p>` : html`<p class="small faint">${tt(`השיא שלך${pace.challenge ? ' באתגר מהירות' : ''}: ${prev.score} נקודות, ${prev.correct} מתוך ${prev.total}`, `Your best${pace.challenge ? ' in the speed challenge' : ''}: ${prev.score} points, ${prev.correct} of ${prev.total}`)}</p>`}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתח שלב ${nextStage.id}: ${nextStage.he}`, `Stage ${nextStage.id} is open: ${nextStage.en}`)}</span></p>` : ''}
        ${nextStage && !unlocked(nowBest, level, nextStage.id) ? html`<p class="small faint">${tt(`שלב ${nextStage.id} נפתח ב-${pctText(UNLOCK)}.`, `Stage ${nextStage.id} opens at ${pctText(UNLOCK)}.`)}</p>` : ''}
        ${!nextStage && accuracy >= UNLOCK && nextLevel ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`סיימת את שלושת השלבים של ${LEVEL_LABEL[level]}. אפשר להמשיך ל-${LEVEL_LABEL[nextLevel]}.`, `You finished all three stages of ${LEVEL_LABEL[level]}. You can go on to ${LEVEL_LABEL[nextLevel]}.`)}</span></p>` : ''}
      </div>
      ${missed.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="stack-sm" style="list-style:none;padding:0;margin:0">${missed.map((w) => html`<li class="panel flat"><p><strong lang="en" dir="ltr">${w.word}</strong> = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></p><p class="small faint" lang="en" dir="ltr">${w.example}</p></li>`)}</ul>
        <div class="row"><button type="button" class="key" data-missed>${tt(missed.length === 1 ? 'לשחק שוב במילה שפספסתי' : `לשחק במילים שפספסתי (${missed.length})`, missed.length === 1 ? 'Play the word I missed again' : `Play the words I missed (${missed.length})`)}</button>
        ${n ? html`<button type="button" class="key ghost" data-add>${icon('layers', { size: 16 })} ${n === 1 ? tt('להוסיף את המילה לחזרה המרווחת', 'Add the word to spaced review') : tt(`להוסיף ${n} מילים לחזרה המרווחת`, `Add ${n} words to spaced review`)}</button>` : html`<span class="small faint">${tt('המילים האלה כבר בחזרה המרווחת שלך.', 'These words are already in your spaced review.')}</span>`}</div></section>` : html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('כל התשובות נכונות.', 'Every answer right.')}</span></p>`}
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
    pace = paceOf(settings());
    mineBefore = bests(store.all('events'), pace.mode);
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
