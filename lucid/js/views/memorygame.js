// Memory game (#/games/memory/<level>): cards face down, turn two at a time to find each picture and its English
// word. Every turn is marked at once. Logic is in js/core/memorygame.js; the levels are listed on the games page
// (js/views/wordgame.js).
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, toast } from '../ui/components.js';
import { store } from '../core/store.js';
import { logEvent, settings } from '../core/learner.js';
import { playTone, soundOn } from '../ui/sound.js';
import { say, canSpeak } from '../core/speech.js';
import { bests, isBetter, unlocked, recentWords } from '../core/picturegame.js';
import { UNLOCK, MATCH, SLIP, TYPE, maxFor, turnBonus, roundScore, accuracyOf, makeDeck, judgeTurn } from '../core/memorygame.js';
import { picture } from './picturegame.js';

const pctText = (x) => `${Math.round(x * 100)}%`;
const shown = (w) => (settings().english_variant === 'US' && w.us) || w.word;
const otherForm = (w) => (w.us ? (shown(w) === w.us ? `UK: ${w.word}` : `US: ${w.us}`) : '');
const BACK_AFTER = 1300; // a mismatched pair stays face up this long (or until the next card is chosen)

export default async function memorygame(el, ctx) {
  const level = Number(ctx.params.level);
  const here = location.hash;
  const data = await content.pictures();
  if (location.hash !== here) return null;
  if (!data?.sets?.length) {
    render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack">
      <h1>${tt('הקלפים של המשחק לא נטענו', "The game's cards did not load")}</h1>
      <p>${navigator.onLine ? tt('נסו שוב בעוד רגע.', 'Try again in a moment.') : tt('אין חיבור לאינטרנט. פתחו את Lucid פעם אחת עם חיבור, ואחר כך המשחק יעבוד גם בלעדיו.', 'You are offline. Open Lucid once with a connection, and after that the game works without one.')}</p>
      <a class="key" href="#/games">${tt('לכל המשחקים', 'All games')}</a></div></div></div>`);
    return null;
  }
  const set = data.sets.find((s) => s.level === level);
  if (!set) { ctx.navigate('games', { replace: true }); return null; }
  const pairs = set.memory_pairs || 6;
  let before = bests(store.all('events'), TYPE);
  if (!unlocked(before, level)) { toast(tt(`הרמה הזו נפתחת ב-${pctText(UNLOCK)} דיוק ברמה הקודמת`, `This level opens at ${pctText(UNLOCK)} accuracy in the level before`)); ctx.navigate('games', { replace: true }); return null; }
  try { sessionStorage.setItem('lucid-game-level', 'memory'); } catch { /* storage blocked */ }
  ctx.setTitle(`${tt('משחק זיכרון', 'Memory game')} · ${level}`);

  let cards = [], up = new Set(), matched = new Set(), seen = new Set(), first = null, back = null, backTimer = null;
  let turns = 0, matches = 0, slips = 0, done = false, quietUntil = 0;
  const missed = new Map();
  const score = (bonus = 0) => roundScore(matches, slips, bonus);

  function start(focus = []) {
    clearTimeout(backTimer);
    before = bests(store.all('events'), TYPE);
    cards = makeDeck(set.words, pairs, { focus, recent: recentWords(store.all('events'), level, 2, TYPE), apart: set.apart || [] });
    up = new Set(); matched = new Set(); seen = new Set(); first = null; back = null;
    turns = 0; matches = 0; slips = 0; done = false; missed.clear();
    board();
  }

  function top() {
    const pct = Math.round((matches / pairs) * 100);
    return html`<div class="player-top">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('זוגות שנמצאו', 'Pairs found')}"><span style="width:${pct}%"></span></div>
      <span class="step-count">${tt(turns === 1 ? 'תור אחד' : `${turns} תורות`, `${turns} ${turns === 1 ? 'turn' : 'turns'}`)}</span>
      <span class="game-score num"><span class="sr-only">${tt('ניקוד:', 'Score:')} </span>${score()}</span></div>`;
  }
  const refreshTop = () => { $('.player-top', el).outerHTML = String(top()); };

  // What a card shows. Face down: only its number. Face up: the picture (named by its Hebrew word for screen
  // readers) or the English word.
  function face(i) {
    const c = cards[i];
    const n = i + 1;
    if (!up.has(i) && !matched.has(i)) return html`<span class="mem-back" aria-hidden="true"></span><span class="sr-only">${tt(`קלף ${n}, הפוך`, `Card ${n}, face down`)}</span>`;
    const done = matched.has(i) ? html`<span class="sr-only">${tt(', נמצא', ', found')}</span>` : '';
    if (c.kind === 'pic') return html`${picture(c.w.icon, 40)}<span class="sr-only">${tt(`קלף ${n}: תמונה, `, `Card ${n}: picture, `)}<span lang="he" dir="rtl" data-he>${c.w.he}</span></span>${done}`;
    return html`<span class="sr-only">${tt(`קלף ${n}: `, `Card ${n}: `)}</span><span class="mem-word" lang="en" dir="ltr" data-word>${shown(c.w)}</span>${done}`;
  }
  const paint = (i) => {
    const b = $(`[data-card="${i}"]`, el);
    if (!b) return;
    render(b, face(i));
    b.classList.toggle('is-up', up.has(i) || matched.has(i));
    b.classList.toggle('is-right', matched.has(i));
    b.disabled = matched.has(i);
  };

  function board() {
    quietUntil = performance.now() + 450; // a double tap on the button that opened this round must not turn a card
    render(el, html`<div class="player">${top()}<div class="player-body stack" id="gbody" tabindex="-1">
      <h1 class="sr-only">${tt('משחק זיכרון', 'Memory game')}, ${tt(`רמה ${level}`, `level ${level}`)}</h1>
      <p class="small faint">${tt(`רמה ${level}: ${set.name_he}. הופכים שני קלפים בכל תור ומחפשים תמונה והמילה שלה באנגלית.`, `Level ${level}: ${set.name_en}. Turn two cards each turn to find a picture and its English word.`)}</p>
      <div class="mem-grid" data-pairs="${pairs}" role="group" aria-label="${tt('קלפים', 'Cards')}">${cards.map((c, i) => html`<button type="button" class="mem-card" data-card="${i}">${face(i)}</button>`)}</div>
      <div id="gfb" class="game-feedback small" aria-live="polite"></div></div></div>`);
    window.scrollTo?.(0, 0);
    setTimeout(() => $('#gbody', el)?.focus({ preventScroll: true }), 30);
  }

  // The two cards of a mismatch turn back over: after a moment, or at once when the next card is chosen.
  function turnBack() {
    clearTimeout(backTimer);
    if (!back) return;
    const pair = back;
    back = null;
    pair.forEach((i) => { up.delete(i); paint(i); $(`[data-card="${i}"]`, el)?.classList.remove('is-wrong'); });
  }

  function choose(i, byKeyboard) {
    if (done || matched.has(i) || i === first) return;
    turnBack();
    up.add(i);
    paint(i);
    const c = cards[i];
    if (first === null) {
      first = i;
      render($('#gfb', el), c.kind === 'pic' ? html`<span>${tt('תמונה:', 'Picture:')} <span lang="he" dir="rtl">${isolateLatin(c.w.he)}</span></span>` : html`<span>${tt('מילה:', 'Word:')} <strong lang="en" dir="ltr">${shown(c.w)}</strong></span>`);
      if (c.kind === 'word' && canSpeak() && soundOn()) say(shown(c.w));
      return;
    }
    const a = first;
    first = null;
    turns++;
    const { match, slip } = judgeTurn(cards, a, i, seen);
    seen.add(a); seen.add(i);
    if (match) {
      matches++;
      matched.add(a); matched.add(i);
      up.delete(a); up.delete(i);
      const hadFocus = document.activeElement === $(`[data-card="${i}"]`, el);
      [a, i].forEach(paint);
      // Found cards are disabled; keep the keyboard on the board.
      if (hadFocus) $('.mem-card:not(:disabled)', el)?.focus({ preventScroll: true });
      render($('#gfb', el), html`<span class="ok-text">${icon('check', { size: 16 })} <strong lang="en" dir="ltr">${shown(c.w)}</strong> = <span lang="he" dir="rtl">${isolateLatin(c.w.he)}</span></span>`);
      playTone(true);
      if (canSpeak() && soundOn()) say(shown(c.w));
    } else {
      if (slip) {
        slips++;
        // The word whose pair had been seen, and the one taken for it: both go on the list to go over.
        missed.set(cards[a].w.word, cards[a].w);
        missed.set(c.w.word, c.w);
      }
      [a, i].forEach((x) => $(`[data-card="${x}"]`, el)?.classList.add('is-wrong'));
      back = [a, i];
      backTimer = setTimeout(turnBack, BACK_AFTER);
      render($('#gfb', el), html`<span class="bad-text">${icon('x', { size: 16 })} ${tt('לא זוג.', 'Not a pair.')}${slip ? html` <span class="faint">${tt(`הזוג של הקלף הראשון כבר נראה (פחות ${SLIP} נקודות)`, `The first card's pair had been seen already (${SLIP} points off)`)}</span>` : ''}</span>`);
      playTone(false);
    }
    refreshTop();
    if (matches === pairs) setTimeout(summary, byKeyboard ? 0 : 700);
  }

  function summary() {
    if (done) return;
    done = true;
    clearTimeout(backTimer);
    quietUntil = performance.now() + 450; // a double tap on the last card must not press what appears under it
    const bonus = turnBonus(turns, pairs);
    const total = score(bonus);
    const accuracy = accuracyOf(matches, slips);
    const prev = before[level];
    const record = isBetter(prev, { accuracy, score: total });
    logEvent({ type: TYPE, level, score: total, accuracy, matches, slips, turns, total: pairs, words: [...new Set(cards.map((x) => x.w.word))] });
    const nowBest = bests(store.all('events'), TYPE);
    const nextSet = data.sets.find((s) => s.level === level + 1);
    const opened = nextSet && !unlocked(before, nextSet.level) && unlocked(nowBest, nextSet.level);
    const words = [...missed.values()];
    render(el, html`<div class="player"><div class="player-top">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="${tt('זוגות שנמצאו', 'Pairs found')}"><span style="width:100%"></span></div>
      <span class="game-score num"><span class="sr-only">${tt('ניקוד:', 'Score:')} </span>${total}</span></div>
      <div class="player-body stack-lg">
      <div class="game-result stack-sm">
        <p class="small faint">${tt(`משחק זיכרון · רמה ${level}: ${set.name_he}`, `Memory game · Level ${level}: ${set.name_en}`)}</p>
        <h1 class="game-total num" tabindex="-1">${tt(`${total} נקודות`, `${total} points`)}<span class="small faint"> <bdi dir="ltr">/ ${maxFor(pairs)}</bdi></span></h1>
        <p>${tt(`${matches} זוגות ב-${turns} תורות, ${slips === 1 ? 'פספוס אחד' : `${slips} פספוסים`} (${pctText(accuracy)} דיוק)`, `${matches} pairs in ${turns} turns, ${slips} ${slips === 1 ? 'slip' : 'slips'} (${pctText(accuracy)} accuracy)`)}</p>
        <p class="small faint">${tt(`פספוס: תור שבו הזוג של הקלף הראשון כבר נראה, ובכל זאת נבחר קלף אחר. ${matches} × ${MATCH}${slips ? `, פחות ${slips} × ${SLIP}` : ''}, ובונוס על מעט תורות ${bonus}.`, `A slip: a turn where the first card's pair had already been seen, but another card was chosen. ${matches} × ${MATCH}${slips ? `, minus ${slips} × ${SLIP}` : ''}, plus a bonus of ${bonus} for few turns.`)}</p>
        ${record ? html`<p class="tag ok" style="width:fit-content">${prev ? tt(`שיא חדש! הקודם: ${prev.score} נקודות, ${pctText(prev.accuracy)} דיוק`, `New best! Previous: ${prev.score} points, ${pctText(prev.accuracy)} accuracy`) : tt('השיא הראשון שלך ברמה הזו', 'Your first best at this level')}</p>` : html`<p class="small faint">${tt(`השיא שלך: ${prev.score} נקודות, ${pctText(prev.accuracy)} דיוק`, `Your best: ${prev.score} points, ${pctText(prev.accuracy)} accuracy`)}</p>`}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתחה רמה ${nextSet.level}: ${nextSet.name_he}`, `Level ${nextSet.level} is open: ${nextSet.name_en}`)}</span></p>` : ''}
        ${nextSet && !unlocked(nowBest, nextSet.level) ? html`<p class="small faint">${tt(`רמה ${nextSet.level} נפתחת ב-${pctText(UNLOCK)} דיוק.`, `Level ${nextSet.level} opens at ${pctText(UNLOCK)} accuracy.`)}</p>` : ''}
      </div>
      ${words.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="pic-missed">${words.map((w) => html`<li class="panel flat row">${picture(w.icon, 32)}<span><strong lang="en" dir="ltr">${shown(w)}</strong>${otherForm(w) ? html` <span class="xsmall faint" lang="en" dir="ltr">(${otherForm(w)})</span>` : ''} = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say="${shown(w)}" aria-label="${tt(`השמעה: ${shown(w)}`, `Play: ${shown(w)}`)}">${icon('volume', { size: 16 })}</button>` : ''}</li>`)}</ul>
        <button type="button" class="key" data-missed>${tt('סיבוב שמתחיל במילים האלה', 'A round with these words first')}</button></section>`
        : html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('בלי פספוסים: כל זוג שכבר ראית נמצא מיד.', 'No slips: every pair you had seen, you found at once.')}</span></p>`}
      <div class="row">
        <button type="button" class="key enter" data-again>${tt('עוד סיבוב', 'Play again')}</button>
        ${nextSet && unlocked(nowBest, nextSet.level) ? html`<a class="key" href="#/games/memory/${nextSet.level}">${tt(`לרמה ${nextSet.level}`, `To level ${nextSet.level}`)}</a>` : ''}
        <a class="key ghost" href="#/games">${tt('לכל המשחקים', 'All games')}</a>
      </div></div></div>`);
    window.scrollTo?.(0, 0);
    $('.game-total', el)?.focus({ preventScroll: true });
  }

  start();
  // Clicks in the moment after a round or the results appear are dropped (capture phase, before the handlers below).
  const quiet = (e) => { if (performance.now() < quietUntil) { e.preventDefault(); e.stopPropagation(); } };
  el.addEventListener('click', quiet, true);
  const offs = [
    () => el.removeEventListener('click', quiet, true),
    // A click from the keyboard (Enter or Space on a button) has detail 0.
    on(el, 'click', '[data-card]', (e, x) => choose(Number(x.dataset.card), e.detail === 0)),
    on(el, 'click', '[data-again]', () => start()),
    on(el, 'click', '[data-missed]', () => start([...missed.keys()])),
    on(el, 'click', '[data-say]', (e, x) => say(x.dataset.say)),
  ];
  return () => { clearTimeout(backTimer); done = true; offs.forEach((o) => o()); };
}
