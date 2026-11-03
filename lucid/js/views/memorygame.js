// Memory game (#/games/memory/<level>): cards face down, turn two at a time to find each picture and its English
// word. Every turn is marked at once. Logic is in js/core/memorygame.js; the levels are listed on the games page
// (js/views/wordgame.js).
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon } from '../ui/components.js';
import { store } from '../core/store.js';
import { logEvent, settings, model } from '../core/learner.js';
import { playTone, soundOn } from '../ui/sound.js';
import { say, canSpeak } from '../core/speech.js';
import { bests, isBetter, unlocked, recentWords, openUpTo } from '../core/picturegame.js';
import { UNLOCK, MATCH, SLIP, TYPE, SMALL, maxFor, turnBonus, roundScore, accuracyOf, makeDeck, judgeTurn, longestWord } from '../core/memorygame.js';
import { paceOf } from '../core/wordgame.js';
import { picture, sumLine, bestLine, lockedLevel } from './picturegame.js';

const pctText = (x) => `${Math.round(x * 100)}%`;
const shown = (w) => (settings().english_variant === 'US' && w.us) || w.word;
const otherForm = (w) => (w.us ? (shown(w) === w.us ? `UK: ${w.word}` : `US: ${w.us}`) : '');
// A mismatched pair stays face up until the next card is chosen. Only with the calm pace turned off in Settings
// does it also turn back by itself, after this long.
const BACK_AFTER = 1300;

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
  // Level 1 also has a small board of 4 pairs (8 cards): #/games/memory/1?pairs=4.
  const small = level === 1 && Number(ctx.query?.pairs) === SMALL;
  const pairs = small ? SMALL : set.memory_pairs || 6;
  let before = bests(store.all('events'), TYPE);
  let pace = paceOf(settings()), mineBefore = {};
  const openTo = openUpTo(data.sets, model().courseLevel);
  if (!unlocked(before, level, openTo)) { lockedLevel(el, 'memory', level, (l) => unlocked(before, l, openTo)); return null; }
  try { sessionStorage.setItem('lucid-game-level', 'memory'); } catch { /* storage blocked */ }
  ctx.setTitle(`${tt('משחק זיכרון', 'Memory game')} · ${level}`);

  let cards = [], up = new Set(), matched = new Set(), seen = new Set(), first = null, back = null, backTimer = null;
  let turns = 0, matches = 0, slips = 0, done = false, quietUntil = 0, backAt = 0;
  const missed = new Map();
  const found = []; // the words, in the order their pairs were found (the end screen lists them all)
  const score = (bonus = 0) => roundScore(matches, slips, bonus, pace.challenge ? SLIP : 0);

  function start(focus = []) {
    clearTimeout(backTimer);
    before = bests(store.all('events'), TYPE);
    pace = paceOf(settings());
    mineBefore = bests(store.all('events'), TYPE, pace.mode);
    cards = makeDeck(set.words, pairs, { focus, recent: recentWords(store.all('events'), level, 2, TYPE), apart: set.apart || [] });
    up = new Set(); matched = new Set(); seen = new Set(); first = null; back = null;
    turns = 0; matches = 0; slips = 0; done = false; missed.clear(); found.length = 0;
    board();
  }

  function top() {
    const pct = Math.round((matches / pairs) * 100);
    return html`<div class="player-top counting">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('זוגות שנמצאו', 'Pairs found')}"><span style="width:${pct}%"></span></div>
      <span class="top-meta is-count"><span class="step-count">${tt(turns === 1 ? 'תור אחד' : `${turns} תורות`, `${turns} ${turns === 1 ? 'turn' : 'turns'}`)}</span></span>
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
    return html`<span class="sr-only">${tt(`קלף ${n}: `, `Card ${n}: `)}</span><span class="mem-word" lang="en" dir="ltr" data-word style="--len:${longestWord(shown(c.w))}">${shown(c.w)}</span>${done}`;
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
      <p class="small faint">${tt(`רמה ${level}: ${set.name_he}. הופכים שני קלפים בכל תור ומחפשים תמונה והמילה שלה באנגלית.`, `Level ${level}: ${set.name_en}. Turn two cards each turn to find a picture and its English word.`)}${level === 1 ? html` <a class="mem-size" href="${small ? '#/games/memory/1' : `#/games/memory/1?pairs=${SMALL}`}">${small ? tt(`ללוח הרגיל: ${(set.memory_pairs || 6) * 2} קלפים`, `Back to the full board: ${(set.memory_pairs || 6) * 2} cards`) : tt(`ללוח קטן: ${SMALL * 2} קלפים`, `A small board: ${SMALL * 2} cards`)}</a>` : ''}</p>
      <div id="gfb" class="game-feedback mem-feedback small" aria-live="polite"></div>
      <div class="mem-grid" data-pairs="${pairs}" role="group" aria-label="${tt('קלפים', 'Cards')}">${cards.map((c, i) => html`<button type="button" class="mem-card" data-card="${i}">${face(i)}</button>`)}</div></div></div>`);
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
    // A second tap on a card that just made a mismatch (a double tap) must not cut the mismatch short.
    if (back?.includes(i) && performance.now() - backAt < 450) return;
    turnBack();
    up.add(i);
    paint(i);
    const c = cards[i];
    // A card in the live line: its number for screen readers (the cards show no numbers), then what it is.
    const named = (k) => { const x = cards[k]; return html`<span class="sr-only">${tt(`קלף ${k + 1}:`, `Card ${k + 1}:`)} </span>${x.kind === 'pic' ? html`${tt('תמונה,', 'picture,')} <span lang="he" dir="rtl">${isolateLatin(x.w.he)}</span>` : html`${tt('מילה,', 'word,')} <strong lang="en" dir="ltr">${shown(x.w)}</strong>`}`; };
    if (c.kind === 'word' && canSpeak() && soundOn()) say(shown(c.w));
    if (first === null) {
      first = i;
      render($('#gfb', el), html`<span>${named(i)}.</span>`);
      return;
    }
    const a = first;
    first = null;
    turns++;
    const { match, slip, miss } = judgeTurn(cards, a, i, seen);
    seen.add(a); seen.add(i);
    if (match) {
      matches++;
      found.push(c.w);
      matched.add(a); matched.add(i);
      up.delete(a); up.delete(i);
      const hadFocus = document.activeElement === $(`[data-card="${i}"]`, el);
      [a, i].forEach(paint);
      // Found cards are disabled; keep the keyboard where it was: the next card still in play after this one.
      if (hadFocus) {
        const all = $$('.mem-card', el);
        const next = [...all.slice(i + 1), ...all.slice(0, i)].find((x) => !x.disabled);
        next?.focus({ preventScroll: true });
        next?.scrollIntoView?.({ block: 'nearest' });
      }
      render($('#gfb', el), html`<span class="ok-text">${icon('check', { size: 16 })} <strong lang="en" dir="ltr">${shown(c.w)}</strong> = <span lang="he" dir="rtl">${isolateLatin(c.w.he)}</span></span>`);
      playTone(true);
    } else {
      if (slip) slips++;
      // Only a real miss goes on the list to go over: a picture paired with a word card already seen. A slip of
      // place (the pair had been seen, another card was turned) is about memory, not the word.
      if (miss) missed.set(miss.word, miss);
      [a, i].forEach((x) => $(`[data-card="${x}"]`, el)?.classList.add('is-wrong'));
      back = [a, i];
      backAt = performance.now();
      if (!pace.relaxed) backTimer = setTimeout(turnBack, BACK_AFTER);
      // Both cards are named, then the verdict: what was turned is part of what a learner has to remember.
      render($('#gfb', el), html`<span>${named(a)}.</span> <span>${named(i)}.</span> <span class="bad-text">${icon('x', { size: 16 })} ${tt('לא זוג.', 'Not a pair.')}</span>${slip && pace.challenge ? html` <span class="faint">${tt(`הזוג של הקלף הראשון כבר נראה (פחות ${SLIP} נקודות)`, `The first card's pair had been seen already (${SLIP} points off)`)}</span>` : ''}`);
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
    const bonus = pace.challenge ? turnBonus(turns, pairs) : 0;
    const total = score(bonus);
    const accuracy = accuracyOf(matches, slips);
    const prev = mineBefore[level];
    const record = isBetter(prev, { accuracy, score: total });
    logEvent({ type: TYPE, level, score: total, accuracy, matches, slips, turns, total: pairs, mode: pace.mode, words: [...new Set(cards.map((x) => x.w.word))] });
    const nowBest = bests(store.all('events'), TYPE);
    const nextSet = data.sets.find((s) => s.level === level + 1);
    const opened = nextSet && !unlocked(before, nextSet.level, openTo) && unlocked(nowBest, nextSet.level, openTo);
    const words = [...missed.values()];
    render(el, html`<div class="player"><div class="player-top">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="${tt('זוגות שנמצאו', 'Pairs found')}"><span style="width:100%"></span></div>
      <span class="game-score num"><span class="sr-only">${tt('ניקוד:', 'Score:')} </span>${total}</span></div>
      <div class="player-body stack-lg">
      <div class="game-result stack-sm">
        <p class="small faint">${tt(`משחק זיכרון · רמה ${level}: ${set.name_he}`, `Memory game · Level ${level}: ${set.name_en}`)}</p>
        <h1 class="game-total num" tabindex="-1">${tt(`${total} נקודות`, `${total} points`)}<span class="small faint"> <bdi dir="ltr">/ ${maxFor(pairs, pace.challenge)}</bdi></span></h1>
        <p>${tt(`${matches} זוגות ב-${turns} תורות (${pctText(accuracy)} דיוק)`, `${matches} pairs in ${turns} turns (${pctText(accuracy)} accuracy)`)}</p>
        <p class="small faint">${tt('הניקוד:', 'Points:')} ${pace.challenge
          ? sumLine({ terms: [[matches, MATCH, 1], ...(slips ? [[slips, SLIP, -1]] : [])], total, bonus, challenge: true, bonusName: tt('בונוס על מעט תורות', 'bonus for few turns') })
          : sumLine({ terms: [[matches, MATCH, 1]], total })}</p>
        ${slips ? html`<p class="small faint">${slips === 1 ? tt('פעם אחת נבחר קלף אחר אף שהזוג כבר נראה.', 'Once, another card was chosen although the pair had been seen.') : tt(`${slips === 2 ? 'פעמיים' : `${slips} פעמים`} נבחר קלף אחר אף שהזוג כבר נראה.`, `${slips} times, another card was chosen although the pair had been seen.`)}</p>` : ''}
        ${bestLine(prev, record, pace.challenge)}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתחה רמה ${nextSet.level}: ${nextSet.name_he}`, `Level ${nextSet.level} is open: ${nextSet.name_en}`)}</span></p>` : ''}
        ${nextSet && !unlocked(nowBest, nextSet.level, openTo) ? html`<p class="small faint">${tt(`רמה ${nextSet.level} נפתחת ב-${pctText(UNLOCK)} דיוק.`, `Level ${nextSet.level} opens at ${pctText(UNLOCK)} accuracy.`)}</p>` : ''}
      </div>
      ${words.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="pic-missed">${words.map((w) => html`<li class="panel flat row">${picture(w.icon, 32)}<span><strong lang="en" dir="ltr">${shown(w)}</strong>${otherForm(w) ? html` <span class="xsmall faint" lang="en" dir="ltr">(${otherForm(w)})</span>` : ''} = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say="${shown(w)}" aria-label="${tt(`השמעה: ${shown(w)}`, `Play: ${shown(w)}`)}">${icon('volume', { size: 16 })}</button>` : ''}</li>`)}</ul>
        <button type="button" class="key" data-missed>${tt('סיבוב שמתחיל במילים האלה', 'A round with these words first')}</button></section>`
        : !slips ? html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('כל זוג שכבר נראה נמצא מיד.', 'Every pair already seen was found at once.')}</span></p>` : ''}
      <div class="row">
        <button type="button" class="key enter" data-again>${tt('עוד סיבוב', 'Play again')}</button>
        ${nextSet && unlocked(nowBest, nextSet.level, openTo) ? html`<a class="key" href="#/games/memory/${nextSet.level}">${tt(`לרמה ${nextSet.level}`, `To level ${nextSet.level}`)}</a>` : ''}
        <a class="key ghost" href="#/games">${tt('לכל המשחקים', 'All games')}</a>
      </div>
      <section class="stack-sm" aria-labelledby="mem-pairs-h"><h2 id="mem-pairs-h" class="small" style="font-size:var(--t-md)">${tt(`כל הזוגות בסיבוב (${found.length})`, `Every pair in the round (${found.length})`)}</h2>
        <ul class="game-pairs">${found.map((w) => html`<li class="panel flat row">${picture(w.icon, 32)}<span class="grow"><strong lang="en" dir="ltr">${shown(w)}</strong>${otherForm(w) ? html` <span class="xsmall faint" lang="en" dir="ltr">(${otherForm(w)})</span>` : ''} = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say="${shown(w)}" aria-label="${tt(`השמעה: ${shown(w)}`, `Play: ${shown(w)}`)}">${icon('volume', { size: 16 })}</button>` : ''}</li>`)}</ul></section></div></div>`);
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
