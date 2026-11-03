// Picture matching game (#/games/pictures/<level>): match English words to pictures, three boards a round.
// A pair is marked right or wrong the moment it is chosen; a finished board waits for "Next board" (unless the
// calm pace is off in Settings). Logic is in js/core/picturegame.js; the levels are listed on the games page
// (js/views/wordgame.js).
import { html, raw, render, on, $, $$ } from '../core/util.js';
import { tt, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon } from '../ui/components.js';
import { store } from '../core/store.js';
import { logEvent, settings, model } from '../core/learner.js';
import { playTone, soundOn } from '../ui/sound.js';
import { say, canSpeak } from '../core/speech.js';
import { PICTURES } from '../ui/picture-icons.js';
import { BOARDS, UNLOCK, MATCH, MISTAKE, maxFor, makeBoards, roundScore, boardBonus, accuracyOf, bests, isBetter, unlocked, recentWords, openUpTo } from '../core/picturegame.js';
import { paceOf } from '../core/wordgame.js';
import { longestWord } from '../core/memorygame.js';

export const picture = (name, size = 44) => html`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(PICTURES[name] || '')}</svg>`;
const pctText = (x) => `${Math.round(x * 100)}%`;
// The word as the learner's English is set: American where it differs ("flashlight"), otherwise the word itself.
const shown = (w) => (settings().english_variant === 'US' && w.us) || w.word;
const otherForm = (w) => (w.us ? (shown(w) === w.us ? `UK: ${w.word}` : `US: ${w.us}`) : '');

// The page a locked stage or level's address shows (instead of dropping the learner on the games page).
export function lockedPage(el, { title, text, next }) {
  render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack game-locked-page">
    <span class="faint">${icon('lock', { size: 28 })}</span>
    <h1 tabindex="-1">${title}</h1>
    <p>${text}</p>
    <div class="row">${next ? html`<a class="key enter" href="${next.href}">${next.label}</a>` : ''}<a class="key" href="#/games">${tt('לכל המשחקים', 'All games')}</a></div></div></div></div>`);
  setTimeout(() => $('.game-locked-page h1', el)?.focus({ preventScroll: true }), 30);
}

// A locked picture or memory level: what opens it, and the way to the highest open level below it.
export function lockedLevel(el, route, level, isOpen) {
  const below = Array.from({ length: level - 1 }, (_, k) => level - 1 - k).find(isOpen);
  lockedPage(el, {
    title: tt('הרמה הזו עוד נעולה', 'This level is still locked'),
    text: tt(`רמה ${level} נפתחת ב-${pctText(UNLOCK)} דיוק ברמה ${level - 1}.`, `Level ${level} opens at ${pctText(UNLOCK)} accuracy in level ${level - 1}.`),
    next: below && { href: `#/games/${route}/${below}`, label: tt(`לרמה ${below}`, `To level ${below}`) },
  });
}

// The round's points as one left-to-right sum ("12 × 10 − 1 × 3 = 117"); the speed bonus only in the challenge.
// bonusName: what the bonus is for (the speed bonus by default; few turns in memory).
export function sumLine({ terms, total, bonus = 0, challenge = false, bonusName = null }) {
  const base = terms.reduce((a, [n, v, sign]) => a + sign * n * v, 0);
  const text = terms.map(([n, v, sign], k) => `${k ? (sign < 0 ? ' − ' : ' + ') : ''}${n} × ${v}`).join('');
  const sum = base < 0
    ? html`<bdi dir="ltr" class="num">${text}</bdi> ${tt('(לא פחות מ-0)', '(not below 0)')}${challenge ? html` <bdi dir="ltr" class="num">+ ${bonus} = ${total}</bdi>` : ''}`
    : html`<bdi dir="ltr" class="num">${text}${challenge ? ` + ${bonus}` : ''} = ${total}</bdi>`;
  return challenge ? html`${sum} (${bonusName || tt('בונוס מהירות', 'speed bonus')}: ${bonus})` : sum;
}
// The learner's best at this level in this mode, or the news that this round is a new one.
export function bestLine(prev, record, challenge) {
  const where = challenge ? tt(' באתגר מהירות', ' in the speed challenge') : '';
  if (!record) return html`<p class="small faint">${tt(`השיא שלך${where}: ${prev.score} נקודות, ${pctText(prev.accuracy)} דיוק`, `Your best${where}: ${prev.score} points, ${pctText(prev.accuracy)} accuracy`)}</p>`;
  return html`<p class="tag ok" style="width:fit-content">${prev ? tt(`שיא חדש${where}. הקודם: ${prev.score} נקודות, ${pctText(prev.accuracy)} דיוק`, `New best${where}. Previous: ${prev.score} points, ${pctText(prev.accuracy)} accuracy`) : tt(`השיא הראשון שלך ברמה הזו${where}`, `Your first best at this level${where}`)}</p>`;
}

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
  let pace = paceOf(settings()), mineBefore = {};
  const openTo = openUpTo(data.sets, model().courseLevel);
  if (!unlocked(before, level, openTo)) { lockedLevel(el, 'pictures', level, (l) => unlocked(before, l, openTo)); return null; }
  try { sessionStorage.setItem('lucid-game-level', 'pictures'); } catch { /* storage blocked */ }
  ctx.setTitle(`${tt('התאמת מילים לתמונות', 'Words and pictures')} · ${level}`);

  let boards = [], b = 0, matches = 0, mistakes = 0, bonusTotal = 0, started = 0, boardMistakes = 0;
  let sel = { pic: null, word: null }, matched = new Set(), done = false, timer = null, quietUntil = 0;
  const missed = new Map();
  const total = () => boards.length * set.pairs;
  const score = () => roundScore(matches, mistakes, bonusTotal);

  function start(focus = []) {
    before = bests(store.all('events'));
    pace = paceOf(settings());
    mineBefore = bests(store.all('events'), 'picture-round', pace.mode);
    boards = makeBoards(set.words, set.pairs, { focus, recent: recentWords(store.all('events'), level), apart: set.apart || [] });
    b = 0; matches = 0; mistakes = 0; bonusTotal = 0; missed.clear(); done = false;
    board();
  }

  function top() {
    const pct = Math.round((matches / total()) * 100);
    return html`<div class="player-top counting">
      <a class="key ghost small icon-only" href="#/games" aria-label="${tt('יציאה מהמשחק', 'Leave the game')}">${icon('x')}</a>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בסיבוב', 'Round progress')}"><span style="width:${pct}%"></span></div>
      <span class="top-meta is-count"><span class="step-count">${tt(`לוח ${Math.min(b + 1, boards.length)} מתוך ${boards.length}`, `Board ${Math.min(b + 1, boards.length)} of ${boards.length}`)}</span></span>
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
      <div class="pic-grid" data-pairs="${set.pairs}" role="group" aria-label="${tt('תמונות', 'Pictures')}">${bd.pictures.map((w, k) => html`<button type="button" class="pic-tile" data-pic="${k}" aria-pressed="false">${picture(w.icon)}<span class="sr-only">${tt('תמונה', 'Picture')} ${k + 1}: <span lang="he" dir="rtl" data-he>${w.he}</span><span data-matched></span></span><span class="pic-cap" aria-hidden="true"></span></button>`)}</div>
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
      // The board ends on the English word: large under the picture, with its Hebrew small below it.
      const cap = $('.pic-cap', pb);
      cap.style.setProperty('--len', longestWord(shown(pic)));
      render(cap, html`<span class="pic-en" lang="en" dir="ltr">${shown(pic)}</span><span class="pic-he" lang="he" dir="rtl">${isolateLatin(pic.he)}</span>`);
      render($('#gfb', el), html`<span class="ok-text">${icon('check', { size: 16 })} <strong lang="en" dir="ltr">${shown(pic)}</strong> = <span lang="he" dir="rtl">${isolateLatin(pic.he)}</span></span>`);
      playTone(true);
      if (canSpeak() && soundOn()) say(shown(pic));
    } else {
      mistakes++;
      boardMistakes++;
      // The picture was given a wrong word: its word goes on the list to go over (the word chosen for it may
      // well be known, so it does not).
      missed.set(pic.word, pic);
      [pb, wb].forEach((x) => x.classList.add('is-wrong'));
      setTimeout(() => [pb, wb].forEach((x) => x.classList.remove('is-wrong')), 700);
      render($('#gfb', el), html`<span class="bad-text">${icon('x', { size: 16 })} ${tt('לא מתאים. נסו שוב.', 'Not a match. Try again.')} <span class="faint">${tt(`(פחות ${MISTAKE} נקודות)`, `(${MISTAKE} points off)`)}</span></span>`);
      playTone(false);
    }
    $('.player-top', el).outerHTML = String(top());
    if (matched.size === bd.pictures.length) boardDone(byKeyboard);
  }

  // A finished board waits for "Next board". Only with the calm pace turned off in Settings does a board finished
  // with a pointer move on by itself (one finished with the keyboard always waits).
  function boardDone(byKeyboard) {
    const ms = performance.now() - started;
    const bonus = pace.challenge ? boardBonus(ms, set.pairs) : 0;
    bonusTotal += bonus;
    $('.player-top', el).outerHTML = String(top());
    const last = b + 1 >= boards.length;
    render($('#gfb', el), html`<div class="game-verdict ok"><p class="row" style="font-weight:600">${icon('check', { size: 20 })}<span>${tt(`לוח ${b + 1} הושלם`, `Board ${b + 1} done`)}</span>${bonus ? html`<span class="game-plus num">${tt('בונוס מהירות', 'Speed bonus')} <bdi dir="ltr">+${bonus}</bdi></span>` : ''}</p>
      <p class="small">${boardMistakes === 1 ? tt('טעות אחת בלוח הזה.', 'One mistake on this board.') : boardMistakes ? tt(`${boardMistakes} טעויות בלוח הזה.`, `${boardMistakes} mistakes on this board.`) : tt('בלי טעויות.', 'No mistakes.')}</p>
      <button type="button" class="key small" data-nextboard>${last ? tt('לתוצאות', 'See results') : tt('ללוח הבא', 'Next board')}</button></div>`);
    const next = $('[data-nextboard]', el);
    next?.focus({ preventScroll: true });
    next?.scrollIntoView({ block: 'nearest' });
    if (!byKeyboard && !pace.relaxed) timer = setTimeout(nextBoard, 2500);
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
    const prev = mineBefore[level];
    const record = isBetter(prev, { accuracy, score: score() });
    logEvent({ type: 'picture-round', level, score: score(), accuracy, matches, mistakes, total: total(), mode: pace.mode, words: boards.flatMap((x) => x.pictures.map((w) => w.word)) });
    const nowBest = bests(store.all('events'));
    const nextSet = data.sets.find((s) => s.level === level + 1);
    const opened = nextSet && !unlocked(before, nextSet.level, openTo) && unlocked(nowBest, nextSet.level, openTo);
    const words = [...missed.values()];
    const pointsLine = () => sumLine({ terms: [[matches, MATCH, 1], ...(mistakes ? [[mistakes, MISTAKE, -1]] : [])], total: score(), bonus: bonusTotal, challenge: pace.challenge });
    render(el, html`<div class="player">${top()}<div class="player-body stack-lg">
      <div class="game-result stack-sm">
        <p class="small faint">${tt(`התאמת מילים לתמונות · רמה ${level}: ${set.name_he}`, `Words and pictures · Level ${level}: ${set.name_en}`)}</p>
        <h1 class="game-total num" tabindex="-1">${tt(`${score()} נקודות`, `${score()} points`)}<span class="small faint"> <bdi dir="ltr">/ ${maxFor(set.pairs, boards.length, pace.challenge)}</bdi></span></h1>
        <p>${tt(`${matches} זוגות, ${mistakes === 1 ? 'טעות אחת' : `${mistakes} טעויות`} (${pctText(accuracy)} דיוק)`, `${matches} pairs, ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} (${pctText(accuracy)} accuracy)`)}</p>
        <p class="small faint">${tt('הניקוד:', 'Points:')} ${pointsLine()}</p>
        ${bestLine(prev, record, pace.challenge)}
        ${opened ? html`<p class="banner ok small">${icon('check', { size: 16 })}<span>${tt(`נפתחה רמה ${nextSet.level}: ${nextSet.name_he}`, `Level ${nextSet.level} is open: ${nextSet.name_en}`)}</span></p>` : ''}
        ${nextSet && !unlocked(nowBest, nextSet.level, openTo) ? html`<p class="small faint">${tt(`רמה ${nextSet.level} נפתחת ב-${pctText(UNLOCK)} דיוק.`, `Level ${nextSet.level} opens at ${pctText(UNLOCK)} accuracy.`)}</p>` : ''}
      </div>
      ${words.length ? html`<section class="stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('מילים לחזור עליהן', 'Words to go over')}</h2>
        <ul class="pic-missed">${words.map((w) => html`<li class="panel flat row">${picture(w.icon, 32)}<span><strong lang="en" dir="ltr">${shown(w)}</strong>${otherForm(w) ? html` <span class="xsmall faint" lang="en" dir="ltr">(${otherForm(w)})</span>` : ''} = <span lang="he" dir="rtl">${isolateLatin(w.he)}</span></span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say="${shown(w)}" aria-label="${tt(`השמעה: ${shown(w)}`, `Play: ${shown(w)}`)}">${icon('volume', { size: 16 })}</button>` : ''}</li>`)}</ul>
        <button type="button" class="key" data-missed>${tt(`לשחק עם המילים האלה (${words.length})`, `Play with these words (${words.length})`)}</button></section>`
        : html`<p class="banner ok">${icon('check', { size: 18 })}<span>${tt('כל ההתאמות בלי טעויות!', 'Every pair without a mistake!')}</span></p>`}
      <div class="row">
        <button type="button" class="key enter" data-again>${tt('עוד סיבוב', 'Play again')}</button>
        ${nextSet && unlocked(nowBest, nextSet.level, openTo) ? html`<a class="key" href="#/games/pictures/${nextSet.level}">${tt(`לרמה ${nextSet.level}`, `To level ${nextSet.level}`)}</a>` : ''}
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
