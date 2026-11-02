// Vocabulary review on FSRS. Grading is objective (research C1, D4/D7):
//  - meaning cards, first exposures: recognise the Hebrew meaning among options;
//  - meaning cards later: type the meaning in Hebrew (fuzzy match; "I was right" if Lucid misjudged);
//  - form cards: see the Hebrew meaning and a gapped example, type the English word.
// Modes: review (due cards), warmup (learned 1-3 days ago), exit (learned today).
import { html, render, on, $, shuffle, todayKey } from '../core/util.js';
import { t, tt, isolateLatin } from '../core/i18n.js';
import { icon } from '../ui/components.js';
import { allCards, due, gradeCard, logEvent, settings } from '../core/learner.js';
import { checkTyped, levenshtein } from '../core/grading.js';
import { say, canSpeak } from '../core/speech.js';

const stripHe = (s) => String(s || '').replace(/[֑-ׇ]/g, '').replace(/[^א-ת\s]/g, ' ').replace(/\s+/g, ' ').trim();
// "סטודנט/ית, תלמיד/ה" -> ["סטודנט", "סטודנטית", "תלמיד", "תלמידה"]
function heAlternatives(gloss) {
  const out = new Set();
  for (const part of String(gloss).split(/[,;]|\bאו\b/)) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/^(.*?)(\S+)\/(\S+)(.*)$/);
    if (m) { out.add(stripHe(m[1] + m[2] + m[4])); out.add(stripHe(m[1] + m[2] + m[3] + m[4])); out.add(stripHe(m[1] + m[3] + m[4])); }
    out.add(stripHe(p.replace(/\//g, ' ')));
  }
  return [...out].filter(Boolean);
}
export function meaningMatches(typed, gloss) {
  const t = stripHe(typed);
  if (!t) return false;
  return heAlternatives(gloss).some((a) => a === t || (a.length >= 4 && levenshtein(a, t) <= 1) || (t.length >= 3 && a.split(' ').includes(t)) || (a.length >= 3 && t.split(' ').includes(a)));
}

export default async function review(el, ctx) {
  const mode = ctx.query.mode || 'review';
  ctx.setTitle(tt('חזרה', 'Review'));
  const now = new Date();
  const dayMs = 86_400_000;
  const cards = allCards();
  let list;
  if (mode === 'warmup') list = cards.filter((c) => c.kind === 'meaning' && now - new Date(c.created_at) >= dayMs && now - new Date(c.created_at) <= 3 * dayMs).slice(0, 8);
  else if (mode === 'exit') list = cards.filter((c) => todayKey(new Date(c.created_at)) === todayKey(now)).slice(0, 12);
  else if (mode === 'early') list = cards.slice().sort((a, b) => new Date(a.fsrs.due) - new Date(b.fsrs.due)).slice(0, 20);
  else list = due(now).slice(0, 60);
  list = shuffle(list, Math.random());
  const pool = cards.map((c) => c.payload).filter((p) => p?.he);
  let i = 0; let right = 0; let shownAt = 0; let hint = false;
  const variant = settings().english_variant;

  const title = { review: tt('חזרה מרווחת', 'Spaced review'), warmup: tt('חימום', 'Warm-up'), exit: tt('בדיקת יציאה', 'Exit check'), early: tt('תרגול נוסף', 'Extra practice') }[mode];

  function shell(body, foot) {
    render(el, html`<div class="player">
      <div class="player-top"><a class="key ghost small icon-only" href="#/today" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${i}" aria-label="${title}"><span style="width:${list.length ? (i / list.length) * 100 : 100}%"></span></div>
        <span class="step-count">${t('of', { a: Math.min(i + 1, list.length), b: list.length })}</span></div>
      <div class="player-body">${body}</div>
      ${foot ? html`<div class="player-foot" id="pfoot">${foot}</div>` : ''}</div>`);
  }

  function empty() {
    const next = cards.map((c) => new Date(c.fsrs.due)).filter((d) => d > now).sort((a, b) => a - b)[0];
    const hours = next ? Math.max(1, Math.round((next - now) / 3_600_000)) : null;
    render(el, html`<div class="view narrow"><div class="empty">
      <h3>${cards.length ? tt('אין כרגע מילים לחזרה', 'Nothing to review right now') : tt('עוד אין מילים בחזרה', 'No words in review yet')}</h3>
      <p>${cards.length ? (hours ? tt(`החזרה הבאה בעוד כ-${hours} שעות. לחזור מוקדם מדי פחות מועיל לזיכרון.`, `Next review in about ${hours} hours. Reviewing too early helps memory less.`) : '') : tt('מילים נכנסות לחזרה כשמשלימים שיעור.', 'Words join your review when you complete a lesson.')}</p>
      <div class="row" style="justify-content:center"><a class="key enter" href="#/today">${tt('חזרה להיום', 'Back to Today')}</a>${cards.length ? html`<a class="key" href="#/review?mode=early">${tt('לתרגל בכל זאת', 'Practise anyway')}</a>` : ''}</div></div></div>`);
  }

  function show() {
    if (i >= list.length) return done();
    const c = list[i];
    const p = c.payload || { word: c.ref?.word, he: '' };
    hint = false;
    shownAt = performance.now();
    const firstExposures = c.kind === 'meaning' && (c.fsrs.reps || 0) < 2 && pool.length >= 3;
    let body;
    if (c.kind === 'form') {
      const gapped = p.example ? p.example.replace(new RegExp(`\\b${p.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '_____') : '_____';
      body = html`<div class="panel flash"><p class="small faint">${tt('כתבו את המילה באנגלית', 'Type the English word')}</p><p class="prompt-word" lang="he" dir="rtl">${p.he}</p><p class="ex-text" lang="en" dir="ltr" style="font-size:var(--t-lg)">${gapped}</p></div>
        <label class="sr-only" for="ans">${tt('המילה באנגלית', 'The English word')}</label><input class="input" id="ans" lang="en" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" style="font-size:var(--t-lg);margin-top:var(--s4)">`;
    } else if (firstExposures) {
      const opts = shuffle([p.he, ...shuffle(pool.filter((x) => x.he !== p.he), i + 1).slice(0, 3).map((x) => x.he)], i + 7);
      body = html`<div class="panel flash"><p class="small faint">${tt('מה המשמעות?', 'What does it mean?')}</p><p class="prompt-word" lang="en" dir="ltr">${p.word}</p>${canSpeak() ? html`<button type="button" class="key small" data-say>${icon('volume', { size: 18 })} ${tt('השמעה', 'Play')}</button>` : ''}</div>
        <div class="options" style="margin-top:var(--s4)">${opts.map((o, k) => html`<button type="button" class="option" data-pick="${o}" lang="he" dir="rtl"><span class="k" aria-hidden="true">${k + 1}</span>${o}</button>`)}</div>`;
    } else {
      body = html`<div class="panel flash"><p class="small faint">${tt('כתבו את המשמעות בעברית', 'Type the meaning in Hebrew')}</p><p class="prompt-word" lang="en" dir="ltr">${p.word}</p>${p.example ? html`<p class="muted" lang="en" dir="ltr">${p.example}</p>` : ''}${canSpeak() ? html`<button type="button" class="key small" data-say>${icon('volume', { size: 18 })} ${tt('השמעה', 'Play')}</button>` : ''}</div>
        <label class="sr-only" for="ans">${tt('המשמעות בעברית', 'The meaning in Hebrew')}</label><input class="input" id="ans" lang="he" dir="rtl" autocomplete="off" style="font-size:var(--t-lg);margin-top:var(--s4)">`;
    }
    shell(html`<h1 class="small faint" style="margin-bottom:var(--s4)">${title}</h1>${body}`,
      html`<div class="inner">${!firstExposures ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}<button type="button" class="key ghost small" data-idk>${tt('לא זוכר/ת', 'I don\'t remember')}</button><span class="grow"></span>${!firstExposures ? html`<button type="button" class="key enter" data-check>${tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button>` : ''}</div>`);
    setTimeout(() => $('#ans', el)?.focus(), 50);
  }

  // typed: the learner typed the answer. Only a typed meaning can be "what I meant" (P-08); a picked option
  // is either the right one or not.
  function grade(correct, given, typed = false) {
    const c = list[i];
    const p = c.payload || {};
    const latency = Math.round(performance.now() - shownAt);
    gradeCard(c, { correct, hintUsed: hint, latencyMs: latency, exercise: c.kind });
    if (correct) right++;
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${correct ? 'ok' : 'bad'}`;
    render(foot, html`<div class="inner"><div class="verdict" role="status">
      <div class="verdict-title">${icon(correct ? 'check' : 'x', { size: 18 })} ${correct ? tt('נכון', 'Correct') : tt('לא בדיוק', 'Not quite')}</div>
      <div class="verdict-body stack-sm"><p><span lang="en" dir="ltr" class="answer">${p.word}</span> = <span lang="he" dir="rtl">${isolateLatin(p.he)}</span></p>${p.example ? html`<p lang="en" dir="ltr" class="muted en-block review-example">${p.example}</p>` : ''}</div>
      ${!correct && typed && given && c.kind === 'meaning' ? html`<button type="button" class="key ghost small" data-override style="margin-top:var(--s2)">${tt('התכוונתי לזה – זה נכון', 'That is what I meant – count it')}</button>` : ''}
    </div><button type="button" class="key enter" data-next>${tt('המשך', 'Continue')} <span class="kbd">Enter</span></button></div>`);
    $('[data-next]', el).focus();
    $$disable();
  }
  function $$disable() { el.querySelectorAll('.option, #ans').forEach((x) => { x.disabled = true; }); }

  function done() {
    logEvent({ type: 'review', mode, count: list.length, right });
    shell(html`<div class="stack-lg"><h1>${tt('סיימתם', 'Done')}</h1>
      <p class="muted">${tt(`${right} מתוך ${list.length} נכון. מילים שהתבלבלתם בהן יחזרו מוקדם יותר, ומילים שידעתם יחזרו בעוד זמן רב יותר.`, `${right} of ${list.length} correct. Words you missed come back sooner; words you knew come back later.`)}</p></div>`,
    html`<div class="inner"><span class="grow"></span><a class="key enter" href="#/today">${tt('חזרה להיום', 'Back to Today')} <span class="kbd">Enter</span></a></div>`);
  }

  if (!list.length) { empty(); return; }
  show();

  const offs = [
    on(el, 'click', '[data-say]', () => say(list[i]?.payload?.word, { variant })),
    on(el, 'click', '[data-pick]', (e, b) => { if (b.disabled) return; const ok = b.dataset.pick === list[i].payload.he; b.classList.add(ok ? 'is-right' : 'is-wrong'); el.querySelectorAll('[data-pick]').forEach((x) => { if (x.dataset.pick === list[i].payload.he) x.classList.add('is-right'); }); grade(ok, b.dataset.pick); }),
    on(el, 'click', '[data-check]', () => {
      const c = list[i]; const v = $('#ans', el)?.value || '';
      if (!v.trim()) return;
      const ok = c.kind === 'form' ? checkTyped(v, [c.payload.word]).correct : meaningMatches(v, c.payload.he);
      grade(ok, v, true);
    }),
    on(el, 'click', '[data-idk]', () => grade(false, '')),
    on(el, 'click', '[data-hint]', (e, b) => {
      hint = true; b.remove();
      const p = list[i].payload || {};
      const h = list[i].kind === 'form' ? `${p.word[0]}${'_ '.repeat(Math.max(0, p.word.length - 1)).trim()}` : p.example || p.def || '';
      $('.flash', el).insertAdjacentHTML('beforeend', `<p class="hint-box" lang="en" dir="ltr">${h.replace(/[<>&]/g, '')}</p>`);
    }),
    on(el, 'click', '[data-override]', (e, b) => {
      // The learner says the meaning they typed was right. list[i] is the card as it was before this
      // review, so grading it again as correct replaces the "wrong" result instead of stacking on it.
      gradeCard(list[i], { correct: true, hintUsed: hint, latencyMs: null, exercise: 'override' });
      right++;
      b.replaceWith(Object.assign(document.createElement('span'), { className: 'small', textContent: tt('נספר כנכון', 'Counted as correct') }));
    }),
    on(el, 'click', '[data-next]', () => { i++; show(); }),
  ];
  const onKey = (e) => {
    if (e.key >= '1' && e.key <= '4') { const b = el.querySelectorAll('[data-pick]')[Number(e.key) - 1]; if (b && !b.disabled) { b.click(); e.preventDefault(); } return; }
    if (e.key !== 'Enter' || e.isComposing) return;
    const b = $('[data-next]', el) || $('[data-check]', el);
    if (!b || (['BUTTON', 'A'].includes(e.target.tagName) && e.target !== b)) return; // e.g. Enter on "count it"
    e.preventDefault(); b.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); };
}
