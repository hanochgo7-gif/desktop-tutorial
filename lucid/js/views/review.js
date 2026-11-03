// Vocabulary review on FSRS. Grading is objective (research C1, D4/D7):
//  - meaning cards, first exposures: recognise the Hebrew meaning among options;
//  - meaning cards later: type the meaning in Hebrew (fuzzy match; "I was right" if Lucid misjudged);
//  - form cards: see the Hebrew meaning and a gapped example, type the English word.
// Modes: review (due cards), warmup (learned 1-3 days ago), exit (learned today).
// It answers like a lesson (UX r3 PH-2): a tap or 1-4 selects an option, and Check (or Enter) commits it.
import { html, render, on, $, $$, shuffle, todayKey } from '../core/util.js';
import { t, tt, isolateLatin } from '../core/i18n.js';
import { icon, toast, LEVEL_LABEL } from '../ui/components.js';
import { content } from '../core/content.js';
import { allCards, due, gradeCard, logEvent, settings, vocabImportLevel, importPlacedOutVocab } from '../core/learner.js';
import { meaningOptions, seedOf, cardLevel } from '../core/srs.js';
import { checkTyped, levenshtein } from '../core/grading.js';
import { say, canSpeak } from '../core/speech.js';
import { relativeDue } from './vocab.js';

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

// The vocabulary of the curriculum at the given levels, for distractors (PH-1). Offline without the lessons it is
// empty, and the options come from the learner's own words.
async function levelVocab(levels) {
  const out = new Map();
  if (!levels.size) return out;
  try {
    const [cur, available] = await Promise.all([content.curriculum(), content.availableLessons().catch(() => new Set())]);
    await Promise.all([...levels].map(async (lv) => {
      const ids = (cur.levels.find((l) => l.id === lv)?.lessons || []).map((l) => l.id).filter((id) => !available.size || available.has(id));
      const lessons = await Promise.all(ids.map((id) => content.lesson(id).catch(() => null)));
      out.set(lv, lessons.filter(Boolean).flatMap((l) => l.vocab || []));
    }));
  } catch { /* the learner's own words are enough */ }
  return out;
}

export default async function review(el, ctx) {
  const mode = ctx.query.mode || 'review';
  ctx.setTitle(tt('חזרה', 'Review'));
  const dayMs = 86_400_000;
  const variant = settings().english_variant;
  const title = { review: tt('חזרה מרווחת', 'Spaced review'), warmup: tt('חימום', 'Warm-up'), exit: tt('בדיקת יציאה', 'Exit check'), early: tt('תרגול נוסף', 'Extra practice') }[mode];
  let now, cards, list, learned, vocabAt;
  let i = 0; let right = 0; let shownAt = 0; let hint = false;
  let picked = null; let opts = null; let answered = false;
  let missed = [];
  // Distractors already shown this session, so the next cards draw fresh ones (PH-1).
  const used = new Map(); const sets = new Set();

  async function begin() {
    now = new Date();
    cards = allCards();
    if (mode === 'warmup') list = cards.filter((c) => c.kind === 'meaning' && now - new Date(c.created_at) >= dayMs && now - new Date(c.created_at) <= 3 * dayMs).slice(0, 8);
    else if (mode === 'exit') list = cards.filter((c) => todayKey(new Date(c.created_at)) === todayKey(now)).slice(0, 12);
    else if (mode === 'early') list = cards.slice().sort((a, b) => new Date(a.fsrs.due) - new Date(b.fsrs.due)).slice(0, 20);
    else list = due(now).slice(0, Math.min(60, Number(ctx.query.n) || 60)); // ?n=: the daily plan's share (TF-3)
    list = shuffle(list, Math.random());
    const seen = new Set();
    learned = cards.map((c) => c.payload).filter((p) => p?.he && !seen.has(p.word) && seen.add(p.word));
    const needs = new Set(list.filter((c) => c.kind === 'meaning' && (c.fsrs.reps || 0) < 2).map(cardLevel).filter(Boolean));
    vocabAt = await levelVocab(needs);
    i = 0; right = 0; missed = [];
  }

  function shell(body, foot) {
    render(el, html`<div class="player">
      <div class="player-top"><a class="key ghost small icon-only" href="#/today" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${i}" aria-label="${title}"><span style="width:${list.length ? (i / list.length) * 100 : 100}%"></span></div>
        <span class="step-count">${t('of', { a: Math.min(i + 1, list.length), b: list.length })}</span></div>
      <div class="player-body">${body}</div>
      ${foot ? html`<div class="player-foot" id="pfoot">${foot}</div>` : ''}</div>`);
  }

  // Nothing to review: the bare player route keeps a heading, the next step and a way out (PH-2).
  // "בעוד כשעה", "בעוד כשעתיים", "בעוד כ-5 שעות", then days the same way: never "כ-1 שעות".
  function inAbout(ms) {
    const h = Math.max(1, Math.round(ms / 3_600_000));
    if (h < 24) return h === 1 ? ['בעוד כשעה', 'in about an hour'] : h === 2 ? ['בעוד כשעתיים', 'in about 2 hours'] : [`בעוד כ-${h} שעות`, `in about ${h} hours`];
    const d = Math.round(h / 24);
    return d === 1 ? ['בעוד כיום', 'in about a day'] : d === 2 ? ['בעוד כיומיים', 'in about 2 days'] : [`בעוד כ-${d} ימים`, `in about ${d} days`];
  }
  function empty() {
    const next = cards.map((c) => new Date(c.fsrs.due)).filter((d) => d > now).sort((a, b) => a - b)[0];
    const when = next ? inAbout(next - now) : null;
    const importLevel = vocabImportLevel();
    const L = importLevel && (LEVEL_LABEL[importLevel] || importLevel);
    const body = cards.length
      ? (when ? tt(`החזרה הבאה ${when[0]}. לחזור מוקדם מדי פחות מועיל לזיכרון.`, `Next review ${when[1]}. Reviewing too early helps memory less.`) : '')
      : importLevel ? tt(`מילים נכנסות לחזרה כשמשלימים שיעור. אפשר גם להוסיף עכשיו את מילות המפתח של שיעורי ${L} שדילגתם עליהם. הן ייכנסו בהדרגה, עד ${settings().new_per_day} ביום.`, `Words join your review when you complete a lesson. You can also add the key words of the ${L} lessons you placed out of now. They come in gradually, up to ${settings().new_per_day} a day.`)
        : tt('מילים נכנסות לחזרה כשמשלימים שיעור.', 'Words join your review when you complete a lesson.');
    render(el, html`<div class="review-empty"><div class="empty">
      <span class="review-empty-key" aria-hidden="true">${icon('layers', { size: 26 })}</span>
      <h1 id="rv-empty" tabindex="-1">${cards.length ? tt('אין כרגע מילים לחזרה', 'Nothing to review right now') : tt('עוד אין מילים בחזרה', 'No words in review yet')}</h1>
      ${body ? html`<p>${body}</p>` : ''}
      <div class="review-empty-actions">
        ${importLevel ? html`<button type="button" class="key enter" data-import="${importLevel}">${tt(`להוסיף את המילים של ${L}`, `Add the ${L} words`)}</button>` : ''}
        ${cards.length ? html`<a class="key" href="#/review?mode=early">${tt('לתרגל בכל זאת', 'Practise anyway')}</a>` : ''}
        <a class="key ${importLevel ? '' : 'enter'}" href="#/today">${tt('להיום', 'To Today')}</a>
      </div></div></div>`);
  }

  function show() {
    if (i >= list.length) return done();
    const c = list[i];
    const p = c.payload || { word: c.ref?.word, he: '' };
    hint = false; picked = null; answered = false; opts = null;
    shownAt = performance.now();
    if (c.kind === 'meaning' && (c.fsrs.reps || 0) < 2 && p.he) {
      // Seeded by the card and the day: the right answer's place and the distractors differ from card to card (PH-1).
      const o = meaningOptions(p, { learned, level: vocabAt.get(cardLevel(c)) || [], seed: seedOf(`${c.id}|${todayKey(now)}`), used, sets });
      if (o.options.length >= 3) opts = o;
    }
    let body;
    if (c.kind === 'form') {
      const gapped = p.example ? p.example.replace(new RegExp(`\\b${p.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '_____') : '_____';
      body = html`<div class="panel flash"><p class="small faint">${tt('כתבו את המילה באנגלית', 'Type the English word')}</p><p class="prompt-word" lang="he" dir="rtl">${p.he}</p><p class="ex-text" lang="en" dir="ltr" style="font-size:var(--t-lg)">${gapped}</p></div>
        <label class="sr-only" for="ans">${tt('המילה באנגלית', 'The English word')}</label><input class="input" id="ans" lang="en" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" style="font-size:var(--t-lg);margin-top:var(--s4)">`;
    } else if (opts) {
      body = html`<div class="panel flash"><p class="small faint" id="rv-q">${tt('מה המשמעות?', 'What does it mean?')}</p><p class="prompt-word" lang="en" dir="ltr" tabindex="-1">${p.word}</p>${canSpeak() ? html`<button type="button" class="key small" data-say>${icon('volume', { size: 18 })} ${tt('השמעה', 'Play')}</button>` : ''}</div>
        <div class="options" role="group" aria-labelledby="rv-q" style="margin-top:var(--s4)">${opts.options.map((o, k) => html`<button type="button" class="option" data-pick="${k}" aria-pressed="false" lang="he" dir="rtl"><span class="k" aria-hidden="true">${k + 1}</span><span>${o}</span></button>`)}</div>`;
    } else {
      body = html`<div class="panel flash"><p class="small faint">${tt('כתבו את המשמעות בעברית', 'Type the meaning in Hebrew')}</p><p class="prompt-word" lang="en" dir="ltr">${p.word}</p>${p.example ? html`<p class="muted" lang="en" dir="ltr">${p.example}</p>` : ''}${canSpeak() ? html`<button type="button" class="key small" data-say>${icon('volume', { size: 18 })} ${tt('השמעה', 'Play')}</button>` : ''}</div>
        <label class="sr-only" for="ans">${tt('המשמעות בעברית', 'The meaning in Hebrew')}</label><input class="input" id="ans" lang="he" dir="rtl" autocomplete="off" style="font-size:var(--t-lg);margin-top:var(--s4)">`;
    }
    // Check opens once there is an answer: an option chosen or something typed.
    shell(html`<h1 class="small faint" style="margin-bottom:var(--s4)">${title}</h1>${body}`,
      html`<div class="inner">${!opts ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}<button type="button" class="key ghost small" data-idk>${tt('לא זוכר/ת', 'I don\'t remember')}</button><span class="grow"></span><button type="button" class="key enter" data-check disabled>${tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div>`);
    // The keyboard starts in the answer field, or on the word for an options card (1-4 then Enter answer it), so
    // focus never falls to the page between cards.
    setTimeout(() => ($('#ans', el) || $('.flash .prompt-word', el))?.focus({ preventScroll: true }), 50);
  }

  // The verdict in the footer. typed: the learner typed the answer; only a typed meaning can be "what I meant" (P-08).
  // overridden: the learner said so, and the footer turns green like the lesson's "My answer is also correct".
  function verdict({ correct, typed = false, given = '', overridden = false }) {
    const c = list[i];
    const p = c.payload || {};
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${correct ? 'ok' : 'bad'}`;
    render(foot, html`<div class="inner"><div class="verdict" role="status">
      <div class="verdict-title">${icon(correct ? 'check' : 'x', { size: 18 })} ${overridden ? tt('נספר כנכון', 'Counted as correct') : correct ? tt('נכון', 'Correct') : tt('לא בדיוק', 'Not quite')}</div>
      <div class="verdict-body stack-sm"><p><span lang="en" dir="ltr" class="answer">${p.word}</span> = <span lang="he" dir="rtl">${isolateLatin(p.he)}</span></p>${p.example ? html`<p lang="en" dir="ltr" class="muted en-block review-example">${p.example}</p>` : ''}</div>
      ${!correct && typed && given && c.kind === 'meaning' ? html`<button type="button" class="key ghost small" data-override style="margin-top:var(--s2)">${tt('התכוונתי לזה – זה נכון', 'That is what I meant – count it')}</button>` : ''}
    </div><button type="button" class="key enter" data-next>${tt('המשך', 'Continue')} <span class="kbd">Enter</span></button></div>`);
  }

  function grade(correct, given, typed = false) {
    const c = list[i];
    const latency = Math.round(performance.now() - shownAt);
    const next = gradeCard(c, { correct, hintUsed: hint, latencyMs: latency, exercise: c.kind });
    answered = true;
    if (correct) right++;
    else missed.push({ id: c.id, p: c.payload || { word: c.ref?.word, he: '' }, level: cardLevel(c), due: next.fsrs.due });
    verdict({ correct, typed, given });
    el.querySelectorAll('.option, #ans').forEach((x) => { x.disabled = true; });
    $('[data-next]', el).focus();
  }

  function commit() {
    if (answered) return;
    const c = list[i];
    if (opts) {
      if (picked == null) return;
      const ok = picked === opts.answer;
      $$('[data-pick]', el).forEach((b) => { const k = Number(b.dataset.pick); if (k === opts.answer) b.classList.add('is-right'); else if (k === picked) b.classList.add('is-wrong'); });
      grade(ok, opts.options[picked]);
      return;
    }
    const v = $('#ans', el)?.value || '';
    if (!v.trim()) return;
    const ok = c.kind === 'form' ? checkTyped(v, [c.payload.word]).correct : meaningMatches(v, c.payload.he);
    grade(ok, v, true);
  }

  function pick(k) {
    if (answered || !opts) return;
    picked = k;
    $$('[data-pick]', el).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.pick) === k)));
    const b = $('[data-check]', el); if (b) b.disabled = false;
  }

  // The end: how it went, the words missed with when each comes back, and a game with those words (PH-2).
  function done() {
    logEvent({ type: 'review', mode, count: list.length, right });
    const byLevel = new Map();
    for (const m of missed) if (m.level) byLevel.set(m.level, (byLevel.get(m.level) || 0) + 1);
    const gameLevel = [...byLevel].sort((a, b) => b[1] - a[1])[0]?.[0];
    const back = (iso) => { const r = relativeDue(iso); return r ? `${tt('תחזור', 'Comes back')} ${r}` : tt('תחזור בחזרה הבאה', 'Comes back in your next review'); };
    shell(html`<div class="stack-lg"><div class="stack-sm"><h1 id="rv-done" tabindex="-1">${tt('סיימתם', 'Done')}</h1>
      <p class="muted">${tt(`${right} מתוך ${list.length} נכון. מילים שהתבלבלתם בהן יחזרו מוקדם יותר, ומילים שידעתם יחזרו בעוד זמן רב יותר.`, `${right} of ${list.length} correct. Words you missed come back sooner; words you knew come back later.`)}</p></div>
      ${missed.length ? html`<section class="stack-sm" aria-labelledby="rv-missed">
        <h2 id="rv-missed" class="review-missed-h">${tt(missed.length === 1 ? 'המילה שפספסתם' : `המילים שפספסתם (${missed.length})`, missed.length === 1 ? 'The word you missed' : `The words you missed (${missed.length})`)}</h2>
        <ul class="review-missed">${missed.map((m) => html`<li class="review-miss">
          ${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${m.p.word}" aria-label="${tt('השמעה', 'Play')}: ${m.p.word}">${icon('volume', { size: 18 })}</button>` : ''}
          <span class="grow"><span class="review-miss-word"><span lang="en" dir="ltr" class="answer">${m.p.word}</span> = <span lang="he" dir="rtl">${isolateLatin(m.p.he)}</span></span>
          <span class="review-miss-when small faint">${back(m.due)}</span></span></li>`)}</ul>
        ${gameLevel ? html`<div class="row"><a class="key" href="#/games/${gameLevel}/1?focus=${encodeURIComponent(missed.map((m) => m.p.word).join('|'))}">${icon('sparkle', { size: 18 })} ${tt('לשחק במילים האלה', 'Play these words')}</a></div>` : ''}
      </section>` : ''}</div>`,
    html`<div class="inner"><span class="grow"></span><a class="key enter" href="#/today">${tt('להיום', 'To Today')} <span class="kbd">Enter</span></a></div>`);
    $('#rv-done', el)?.focus({ preventScroll: true });
  }

  await begin();
  if (!list.length) empty(); else show();

  const offs = [
    on(el, 'click', '[data-say]', () => say(list[i]?.payload?.word, { variant })),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant })),
    on(el, 'click', '[data-pick]', (e, b) => { if (!b.disabled) pick(Number(b.dataset.pick)); }),
    on(el, 'input', '#ans', (e, inp) => { const b = $('[data-check]', el); if (b && !answered) b.disabled = !inp.value.trim(); }),
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) commit(); }),
    on(el, 'click', '[data-idk]', () => { if (!answered) grade(false, ''); }),
    on(el, 'click', '[data-hint]', (e, b) => {
      hint = true; b.remove();
      const p = list[i].payload || {};
      const h = list[i].kind === 'form' ? `${p.word[0]}${'_ '.repeat(Math.max(0, p.word.length - 1)).trim()}` : p.example || p.def || '';
      $('.flash', el).insertAdjacentHTML('beforeend', `<p class="hint-box" lang="en" dir="ltr">${h.replace(/[<>&]/g, '')}</p>`);
      $('#ans', el)?.focus();
    }),
    on(el, 'click', '[data-override]', () => {
      // The learner says the meaning they typed was right. list[i] is the card as it was before this
      // review, so grading it again as correct replaces the "wrong" result instead of stacking on it.
      gradeCard(list[i], { correct: true, hintUsed: hint, latencyMs: null, exercise: 'override' });
      right++;
      missed = missed.filter((m) => m.id !== list[i].id);
      verdict({ correct: true, overridden: true });
      $('[data-next]', el).focus();
    }),
    on(el, 'click', '[data-next]', () => { i++; show(); }),
    on(el, 'click', '[data-import]', async (e, b) => {
      b.disabled = true;
      const n = await importPlacedOutVocab(b.dataset.import);
      toast(n ? tt(`${n} מילים נוספו לחזרה. הן ייכנסו בהדרגה.`, `${n} words added to review. They come in gradually.`) : tt('המילים האלה כבר בחזרה.', 'These words are already in review.'));
      await begin();
      if (!list.length) { empty(); $('#rv-empty', el)?.focus(); } else show();
    }),
  ];
  const onKey = (e) => {
    if (e.target.closest?.('dialog')) return;
    if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT') {
      // The key selects that option and moves the focus to it, so the next Enter checks it.
      const b = $$('[data-pick]', el)[Number(e.key) - 1];
      if (b && !b.disabled) { pick(Number(b.dataset.pick)); b.focus({ preventScroll: true }); e.preventDefault(); }
      return;
    }
    if (e.key !== 'Enter' || e.isComposing) return;
    const b = $('[data-next]', el) || $('[data-check]', el) || $('.player-foot a.key.enter', el);
    if (!b || b.disabled) return;
    // Enter on a chosen option checks it; on another button or link it does that control's own job (e.g. "count it").
    const chosen = e.target.matches?.('[data-pick][aria-pressed="true"]');
    if (['BUTTON', 'A'].includes(e.target.tagName) && e.target !== b && !chosen) return;
    e.preventDefault(); b.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); };
}
