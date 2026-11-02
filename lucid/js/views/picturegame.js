// Picture matching game (#/games/pictures/<level>): match English words to pictures, three boards a round.
// A pair is marked right or wrong the moment it is chosen. Logic is in js/core/picturegame.js; the levels are
// listed on the games page (js/views/wordgame.js).
import { html, raw, render, on, $, $$ } from '../core/util.js';
import { tt, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, toast } from '../ui/components.js';
import { store } from '../core/store.js';
import { logEvent, settings } from '../core/learner.js';
import { playTone, soundOn } from '../ui/sound.js';
import { say, canSpeak } from '../core/speech.js';
import { PICTURES } from '../ui/picture-icons.js';
import { BOARDS, UNLOCK, MATCH, MISTAKE, maxFor, makeBoards, roundScore, boardBonus, accuracyOf, bests, isBetter, unlocked, recentWords } from '../core/picturegame.js';

export const picture = (name, size = 44) => html`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(PICTURES[name] || '')}</svg>`;
const pctText = (x) => `${Math.round(x * 100)}%`;
// The word as the learner's English is set: American where it differs ("flashlight"), otherwise the word itself.
const shown = (w) => (settings().english_variant === 'US' && w.us) || w.word;
const otherForm = (w) => (w.us ? (shown(w) === w.us ? `UK: ${w.word}` : `US: ${w.us}`) : '');

export default async function picturegame(el, ctx) {
  const level = Number(ctx.params.level);
  const here = location.hash;
  const data = await content.pictures();
  if (location.hash !== here) return null;
  if (!data?.sets?.length) {
    render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack">
      <h1>${tt('התמונות של המשחק לא נטענו', "The game's pictures did not load")}</h1>
      <p>${navigator.onLine ? tt('נסו שוב בעוד רגע.', 'Try again in a moment.') : tt('אין חיבור לאינטרנט. פתחו את Lucid פעם אחת עם חיבור, ואחר כך המשחק יעבוד גם בלעדיו.', 'You are offline. Open Lucid once with a connection, and after that the game works without one.')}</p>
      <a class="key" href="#/games">${tt('לכל המשחקים', 'All games')}</a></div></div></div>`);
    return null;
  }
  const set = data.sets.find((s) => s.level === level);
  if (!set) { ctx.navigate('games', { replace: true }); return null; }
  let before = bests(store.all('events'));
  if (!unlocked(before, level)) { toast(tt(`הרמה הזו נפתחת ב-${pctText(UNLOCK)} דיוק ברמה הקודמת`, `This level opens at ${pctText(UNLOCK)} accuracy in the level before`)); ctx.navigate('games', { replace: true }); return null; }
  try { sessionStorage.setItem('lucid-game-level', 'pictures'); } catch { /* storage blocked */ }
  ctx.setTitle(`${tt('התאמת מילים לתמונות', 'Words and pictures')} · ${level}`);

  let boards = [], b = 0, matches = 0, mistakes = 0, bonusTotal = 0, started = 0, boardMistakes = 0;
  let sel = { pic: null, word: null }, matched = new Set(), done = false, timer = null, quietUntil = 0;
  const missed = new Map();
  const total = () => boards.length * set.pairs;
  const score = () => roundScore(matches, mistakes, bonusTotal);

  function start(focus = []) {
    before = bests(store.all('events'));
    boards = makeBoards(set.words, set.pairs, { focus, recent: recentWords(store.all('events'), level), apart: set.apart || [] });
    b = 0; matches = 0; mistakes = 0; bonusTotal = 0; missed.clear(); done = false;
    board();
  }

  function top() {
    const pct = Math.round((matches / total()) * 100);
    return html`<div class="player-top">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בסיבוב', 'Round progress')}"><span style="width:${pct}%"></span></div>
      <span class="step-count">${tt(`לוח ${Math.min(b + 1, boards.length)} מתוך ${boards.length}`, `Board ${Math.min(b + 1, boards.length)} of ${boards.length}`)}</span>
      <span class="game-score num"><span class="sr-only">${tt('ניקוד:', 'Score:')} </span>${score()}</span></div>`;
  }

  function board() {
    const bd = boards[b];
    sel = { pic: null, word: null };
    matched = new Set();
    boardMistakes = 0;
    started = performance.now();
    quietUntil = started + 450; // a double tap on the button that opened this board must not choose a card
    render(el, html`<div class="player">${top()}<div class="player-body stack" id="gbody" tabindex="-1">
      <h1 class="sr-only">${tt('התאמת מילים לתמונות', 'Words and pictures')}, ${tt(`רמה ${level}`, `level ${level}`)}</h1>
      <p class="small faint">${tt(`רמה ${level}: ${set.name_he}. בוחרים תמונה ומילה (בכל סדר).`, `Level ${level}: ${set.name_en}. Choose a picture and a word, in either order.`)}</p>
      <div class="pic-grid" data-pairs="${set.pairs}" role="group" aria-label="${tt('תמונות', 'Pictures')}">${bd.pictures.map((w, k) => html`<button type="button" class="pic-tile" data-pic="${k}" aria-pressed="false">${picture(w.icon)}<span class="sr-only">${tt('תמונה', 'Picture')} ${k + 1}: <span lang="he" dir="rtl" data-he>${w.he}</span><span data-matched></span></span><span class="pic-he" lang="he" dir="rtl" aria-hidden="true"></span></button>`)}</div>
      <div class="pic-words" data-pairs="${set.pairs}" role="group" aria-label="${tt('מילים', 'Words')}">${bd.words.map((w, k) => html`<button type="button" class="pic-word" data-word="${k}" aria-pressed="false" lang="en" dir="ltr">${shown(w)}</button>`)}</div>
      <div id="gfb" class="game-feedback small" aria-live="polite"></div></div></div>`);
    window.scrollTo?.(0, 0); // "Next board" may have been scrolled into view on a short screen
    setTimeout(() => $('#gbody', el)?.focus({ preventScroll: true }), 30);
  }

  function choose(kind, k, byKeyboard) {
    if (done) return;
    const bd = boards[b];
    const item = kind === 'pic' ? bd.pictures[k] : bd.words[k];
    if (matched.has(item)) return;
    sel[kind] = sel[kind] === k ? null : k; // a second tap on the same card unselects it
    $(`[data-${kind}="${k}"]`, el)?.classList.remove('is-wrong');
    $$(`[data-${kind}]`, el).forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset[kind]) === sel[kind])));
    if (sel.pic === null || sel.word === null) return;
    const pic = bd.pictures[sel.pic], word = bd.words[sel.word];
    const pb = $(`[data-pic="${sel.pic}"]`, el), wb = $(`[data-word="${sel.word}"]`, el);
    sel = { pic: null, word: null };
    [pb, wb].forEach((x) => x.setAttribute('aria-pressed', 'false'));
    if (pic === word) {
      matched.add(pic);
      matches++;
      const hadFocus = [pb, wb].includes(document.activeElement);
      [pb, wb].forEach((x) => { x.classList.add('is-right'); x.disabled = true; });
      render($('[data-matched]', pb), html`${tt(', הותאמה למילה ', ', matched with ')}<span lang="en" dir="ltr">${shown(pic)}</span>`);
      // A matched card is disabled; keep the keyboard on the board instead of losing focus to the page.
      if (hadFocus) $('.pic-tile:not(:disabled)', el)?.focus({ preventScroll: true });
      render($('.pic-he', pb), isolateLatin(pic.he));
      render($('#gfb', el), html`<span class="ok-text">${icon('check', { size: 16 })} <strong lang="en" dir="ltr">${shown(pic)}</strong> = <span lang="he" dir="rtl">${isolateLatin(pic.he)}</span></span>`);
      playTone(true);
      if (canSpeak() && soundOn()) say(shown(pic));
    } else {
      mistakes++;
      boardMistakes++;
      // Either word may be the one not known: both go on the list to go over.
      missed.set(pic.word, pic);
      missed.set(word.word, word);
      [pb, wb].forEach((x) => x.classList.add('is-wrong'));
      setTimeout(() => [pb, wb].forEach((x) => x.classList.remove('is-wrong')), 700);
      render($('#gfb', el), html`<span class="bad-text">${icon('x', { size: 16 })} ${tt('לא מתאים. נסו שוב.', 'Not a match. Try again.')} <span class="faint">${tt(`(פחות ${MISTAKE} נקודות)`, `(${MISTAKE} points off)`)}</span></span>`);
      playTone(false);
    }
    $('.player-top', el).outerHTML = String(top());
    if (matched.size === bd.pictures.length) boardDone(byKeyboard);
  }

  // A board done with the keyboard waits for "Next board"; with a pointer it also moves on by itself.
  function boardDone(byKeyboard) {
    const ms = performance.now() - started;
    const bonus = boardBonus(ms, set.pairs);
    bonusTotal += bonus;
    $('.player-top', el).outerHTML = String(top());
    const last = b + 1 >= boards.length;
    render($('#gfb', el), html`<div class="game-verdict ok"><p class="row" style="font-weight:600">${icon('check', { size: 20 })}<span>${tt(`לוח ${b + 1} הושלם`, `Board ${b + 1} done`)}</span>${bonus ? html`<span class="game-plus num">${tt(`בונוס מהירות ${bonus}+`, `+${bonus} speed bonus`)}</span>` : ''}</p>
      <p class="small">${boardMistakes === 1 ? tt('טעות אחת בלוח הזה.', 'One mistake on this board.') : boardMistakes ? tt(`${boardMistakes} טעויות בלוח הזה.`, `${boardMistakes} mistakes on this board.`) : tt('בלי טעויות!', 'No mistakes!')}</p>
      <button type="button" class="key small" data-nextboard>${last ? tt('לתוצאות', 'See results') : tt('ללוח הבא', 'Next board')}</button></div>`);
    const next = $('[data-nextboard]', el);
    next?.focus({ preventScroll: true });
    next?.scrollIntoView({ block: 'nearest' });
    if (!byKeyboard) timer = setTimeout(nextBoard, 2500);
  }

  function nextBoard() {
    clearTimeout(timer);
    if (done) return;
    b++;
    if (b < boards.length) board(); else summary();
  }

  function summary() {
    done = true;
    quietUntil = performance.now() + 450; // a double tap on "See results" must not press what appears under it
    const accuracy = accuracyOf(matches, mistakes);
    const prev = before[level];
    const record = isBetter(prev, { accuracy, score: score() });
    logEvent({ type: 'picture-round', level, score: score(), accuracy, matches, mistakes, total: total(), words: boards.flatMap((x) => x.pictures.map((w) => w.word)) });
    const nowBest = bests(store.all('events'));
    const nextSet = data.sets.find((s) => s.level === level + 1);
    const opened = nextSet && !unlocked(before, nextSet.level) && unlocked(nowBest, nextSet.level);
    const words = [...missed.values()];
    render(el, html`<div class="player">${top()}<div class="player-body stack-lg">
      <div class="game-result stack-sm">
        <p class="small faint">${tt(`התאמת מילים לתמונות · רמה ${level}: ${set.name_he}`, `Words and pictures · Level ${level}: ${set.name_en}`)}</p>
        <h1 class="game-total num" tabindex="-1">${tt(`${score()} נקודות`, `${score()} points`)}<span class="small faint"> <bdi dir="ltr">/ ${maxFor(set.pairs, boards.length)}</bdi></span></h1>
        <p>${tt(`${matches} זוגות, ${mistakes === 1 ? 'טעות אחת' : `${mistakes} טעויות`} (${pctText(accuracy)} דיוק)`, `${matches} pairs, ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} (${pctText(accuracy)} accuracy)`)}</p>
        <p class="small faint">${mistakes ? tt(`${matches} × ${MATCH}, פחות ${mistakes} × ${MISTAKE}${matches * MATCH < mistakes * MISTAKE ? ' (לא פחות מ-0)' : ''}, ובונוס מהירות ${bonusTotal}`, `${matches} × ${MATCH}, minus ${mistakes} × ${MISTAKE}${matches * MATCH < mistakes * MISTAKE ? ' (not below 0)' : ''}, plus a speed bonus of ${bonusTotal}`) : tt(`${matches} × ${MATCH}, ובונוס מהירות ${bonusTotal}`, `${matches} × ${MATCH}, plus a speed bonus of ${bonusTotal}`)}</p>
        ${record ? html`<p class="tag ok" style="width:fit-content">${prev ? tt(`שיא חדש! הקודם: ${prev.score} נקודות, ${pctText(prev.accuracy)} דיוק`, `New best! Previous: ${prev.score} points, ${pctText(prev.accuracy)} accuracy`) : tt('השיא הראשון שלך ברמה הזו', 'Your first best at this level')}</p>` : html`<p class="small faint">${tt(`השיא שלך: ${prev.score} נקודות, ${pctText(prev.accuracy)} דיוק`, `Your best: ${prev.score} points, ${pctText(prev.accuracy)} accuracy`)}</p>`}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתחה רמה ${nextSet.level}: ${nextSet.name_he}`, `Level ${nextSet.level} is open: ${nextSet.name_en}`)}</span></p>` : ''}
        ${nextSet && !unlocked(nowBest, nextSet.level) ? html`<p class="small faint">${tt(`רמה ${nextSet.level} נפתחת ב-${pctText(UNLOCK)} דיוק.`, `Level ${nextSet.level} opens at ${pctText(UNLOCK)} accuracy.`)}</p>` : ''}
      </div>
      ${words.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="pic-missed">${words.map((w) => html`<li class="panel flat row">${picture(w.icon, 32)}<span><strong lang="en" dir="ltr">${shown(w)}</strong>${otherForm(w) ? html` <span class="xsmall faint" lang="en" dir="ltr">(${otherForm(w)})</span>` : ''} = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say="${shown(w)}" aria-label="${tt(`השמעה: ${shown(w)}`, `Play: ${shown(w)}`)}">${icon('volume', { size: 16 })}</button>` : ''}</li>`)}</ul>
        <button type="button" class="key" data-missed>${tt(`לשחק עם המילים האלה (${words.length})`, `Play with these words (${words.length})`)}</button></section>`
        : html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('כל ההתאמות בלי טעויות!', 'Every pair without a mistake!')}</span></p>`}
      <div class="row">
        <button type="button" class="key enter" data-again>${tt('עוד סיבוב', 'Play again')}</button>
        ${nextSet && unlocked(nowBest, nextSet.level) ? html`<a class="key" href="#/games/pictures/${nextSet.level}">${tt(`לרמה ${nextSet.level}`, `To level ${nextSet.level}`)}</a>` : ''}
        <a class="key ghost" href="#/games">${tt('לכל המשחקים', 'All games')}</a>
      </div></div></div>`);
    window.scrollTo?.(0, 0);
    $('.game-total', el)?.focus({ preventScroll: true });
  }

  start();
  // Clicks in the moment after the results appear are dropped (capture phase, before the handlers below and links).
  const quiet = (e) => { if (performance.now() < quietUntil) { e.preventDefault(); e.stopPropagation(); } };
  el.addEventListener('click', quiet, true);
  const offs = [
    () => el.removeEventListener('click', quiet, true),
    // A click from the keyboard (Enter or Space on a button) has detail 0.
    on(el, 'click', '[data-pic]', (e, x) => choose('pic', Number(x.dataset.pic), e.detail === 0)),
    on(el, 'click', '[data-word]', (e, x) => choose('word', Number(x.dataset.word), e.detail === 0)),
    on(el, 'click', '[data-nextboard]', nextBoard),
    on(el, 'click', '[data-again]', () => start()),
    on(el, 'click', '[data-missed]', () => start([...missed.keys()])),
    on(el, 'click', '[data-say]', (e, x) => say(x.dataset.say)),
  ];
  return () => { clearTimeout(timer); offs.forEach((o) => o()); };
}
