// Lesson player: intro -> explanation (in short steps) -> practice -> review.
// Wrong answers show the right answer and come back once at the end of the set (retrieval after a delay); a
// wrong typed answer first gets a targeted note and a second try where the exercise allows it (LF-6). Only the
// first attempt counts toward the lesson score, and only scored exercises count: speaking and writing are
// practice, never part of the score or its denominator. After "Nearly there" the learner can redo only the
// exercises missed on the first try; their earlier right answers keep counting, so fixing the misses can
// complete the lesson.
import { html, render, on, $, todayKey } from '../core/util.js';
import { t, tt, bi, legend, hebrewSupport, isolateLatin } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, levelTag, confirmDialog, LEVEL_LABEL } from '../ui/components.js';
import { mountExercise, verdictHtml, selfJudgedHtml, answerFor } from '../ui/exercise.js';
import { exitTarget, fitFooter, fitOnResize } from '../ui/player.js';
import { recordAttempt, startLesson, finishLesson, progressOf, settings, model, newBudgetToday, logEvent, todayPlan, allCards, due, resumeStep } from '../core/learner.js';
// The day's status comes from learner.dayStatus when it exists (contract (a), today-path TP-1), read through the
// namespace so this module still loads before that export lands.
import * as learner from '../core/learner.js';
import { store } from '../core/store.js';
import { say, canSpeak, stopSpeaking } from '../core/speech.js';
import { lessonOrder, introSlots, firstTries, minutesToday, planStatus, isLessonId } from '../core/adaptive.js';
import { answerPoints, isMissed, fillGaps, mistakeNote, retrySafe, clipDiff, sameOrder } from '../core/pool.js';

export { answerPoints };

// ---------- scoring and counting (pure, unit-tested) ----------
export const UNSCORED = new Set(['write', 'speak']);
export const scoredExercises = (lesson) => lesson.exercises.filter((e) => !UNSCORED.has(e.type));
// First-try points per exercise id -> lesson score (0..1). A lesson with nothing to score counts as done. Items
// answered when nothing could be heard (unheard, r4 LF-5) are not first-try evidence: they leave the denominator.
export function lessonScore(firstTry, lesson, unheard = null) {
  const scored = scoredExercises(lesson).filter((e) => !unheard?.has(e.id));
  if (!scored.length) return 1;
  return scored.reduce((a, e) => a + (firstTry.get(e.id) || 0), 0) / scored.length;
}
// A pass is 70% of first-try points (or the lesson's own mark). The small margin keeps a sum of 0.75 and 0.9
// points that should be exactly 70% from falling short by a rounding error.
export const isPass = (score, pass = 0.7) => score >= pass - 1e-9;
// The score in words: below the pass mark it is rounded down, so a 69.6% miss never reads "70%" next to
// "70% completes the lesson" (R2-26).
export const scorePercent = (score, passed) => (passed ? Math.round(score * 100) : Math.floor(score * 100 + 1e-6));
// The end screen's title says what is true (LF-4): complete at the pass mark, "Nearly there" from 50%, and
// "Not complete yet" below that, never "Nearly there" at 8%.
export function reviewTitle(score, pass = 0.7) {
  if (isPass(score, pass)) return 'complete';
  return score >= 0.5 - 1e-9 ? 'nearly' : 'open';
}
// Why a score is lower than the number of right answers suggests: a right answer after a hint counts 0.75 and
// one with a spelling slip 0.9.
export function partialCredit(firstTry) {
  const v = [...firstTry.values()];
  return { hint: v.some((x) => x === 0.75), slip: v.some((x) => x === 0.9) };
}
// About how long redoing n exercises takes, at the lesson's own pace, counted exactly as Today counts it
// (learner.js lessonInfo): the explanation takes introSlots(lesson) exercise-sized slots. One helper for the
// intro banner and the end screen, so they never disagree (LF-4).
export const missedMinutes = (lesson, n) => Math.max(1, Math.round(n * (lesson.minutes / (lesson.exercises.length + introSlots(lesson)))));
// About how long the rest of a run takes from position qi (first pass and retries alike).
export const restMinutes = (lesson, queue, qi) => Math.max(1, Math.round((queue.length - qi) * (lesson.minutes / (lesson.exercises.length + introSlots(lesson)))));
// About how long the explanation takes to read: English at about 90 words a minute (a learner reading
// carefully), the Hebrew around it at about 180 (LF-2). Shown instead of the old "short explanation".
export function readingMinutes(lesson, support = 'full') {
  const count = (s, re) => (String(s || '').match(re) || []).length;
  const EN = /[A-Za-z][A-Za-z'’-]*/g;
  const HE = /[֐-׿]+/g;
  let en = 0, he = 0;
  const add = (o) => { if (!o) return; if (typeof o === 'string') { en += count(o, EN); return; } en += count(o.en, EN); if (support !== 'off') he += count(o.he, HE); };
  for (const b of lesson.explanation || []) {
    if (b.type === 'table') { for (const r of [b.headers, ...b.rows]) for (const c of r) { en += count(c, EN); he += count(c, HE); } }
    else if (b.type === 'examples') b.items.forEach(add);
    else add(b);
  }
  (lesson.examples || []).forEach(add);
  (lesson.hebrew_pitfalls || []).forEach(add);
  return Math.max(1, Math.round(en / 90 + he / 180));
}
// First-pass exercises before position qi (retries are counted apart, as on the step counter).
export const firstDone = (queue, qi) => queue.slice(0, qi).filter((q) => !q.retry).length;
// Today's part ends once the first pass reaches the plan's "up to exercise N" (R2-28): only on the first pass,
// only once, never in a run of only the missed exercises, and only when exercises are left after it.
export function partEnds(part, queue, qi, finished) {
  if (!part || part.done || part.shown || !finished || finished.retry || qi >= queue.length) return false;
  return part.upto < queue.filter((q) => !q.retry).length && firstDone(queue, qi) === part.upto;
}

// Scored exercises whose first try was wrong (or never answered); a reading text or sort under 80% (LF-9). An item
// nobody could hear is not missed (r4 LF-5).
export function missedIds(firstTry, lesson, unheard = null) {
  return scoredExercises(lesson).filter((e) => !unheard?.has(e.id) && isMissed(firstTry.get(e.id), e.type)).map((e) => e.id);
}
// Where the learner is: the first pass has a fixed total; retries are counted on their own.
export function stepInfo(queue, qi) {
  const cur = queue[qi];
  if (!cur) return null;
  const upTo = queue.slice(0, qi + 1);
  if (cur.retry) return { retry: true, pos: upTo.filter((q) => q.retry).length, total: queue.filter((q) => q.retry).length, pending: 0 };
  return { retry: false, pos: upTo.filter((q) => !q.retry).length, total: queue.filter((q) => !q.retry).length, pending: queue.slice(qi + 1).filter((q) => q.retry).length };
}
// "3 מתוך 14" / "3 of 14": words, so the numbers never read backwards in Hebrew (P-12). The first pass shows no
// running tally of mistakes; retries are announced only in the retry round itself (LF-7).
export function stepLabel(s) {
  if (!s) return '';
  const of = t('of', { a: s.pos, b: s.total });
  return s.retry ? `${tt('חוזרים', 'Revisit')} ${of}` : of;
}
// Progress bar: moves forward only, the first pass up to 94%, retries the rest.
export function stepPct(s) {
  if (!s) return 100;
  return Math.round(s.retry ? 94 + (6 * (s.pos - 1)) / s.total : 6 + (88 * (s.pos - 1)) / s.total);
}
const HEBREW = /[֐-׿]/;

// ---------- the explanation in short steps (LF-2) ----------
// The explanation is grouped by what it is: the core (paragraphs, rules and tables) with the Hebrew-speaker
// pitfalls about grammar next to it; the examples, with the pronunciation pitfalls (a lesson with only those
// keeps them in the core); the remaining notes (warnings and tips); the new words. Empty groups are left out.
// Each unit is { kind: 'block' | 'pit' | 'ex' | 'word', i }.
export function learnPlan(lesson, support = 'full') {
  const pits = support === 'off' ? [] : (lesson.hebrew_pitfalls || []).map((p, i) => ({ p, i }));
  const sound = (x) => /^pron-/.test(x.p.error_type || '');
  const grammarPits = pits.filter((x) => !sound(x));
  const firstPits = grammarPits.length ? grammarPits : pits;
  const laterPits = grammarPits.length ? pits.filter(sound) : [];
  const ex = lesson.explanation || [];
  const isCore = (b) => ['p', 'rule', 'table'].includes(b.type);
  const groups = [
    { id: 'core', units: [...ex.flatMap((b, i) => (isCore(b) ? [{ kind: 'block', i }] : [])), ...firstPits.map((x) => ({ kind: 'pit', i: x.i }))] },
    { id: 'examples', units: [...(lesson.examples || []).map((_, i) => ({ kind: 'ex', i })), ...laterPits.map((x) => ({ kind: 'pit', i: x.i }))] },
    { id: 'notes', units: ex.flatMap((b, i) => (isCore(b) ? [] : [{ kind: 'block', i }])) },
    { id: 'words', units: (lesson.vocab || []).map((_, i) => ({ kind: 'word', i })) },
  ];
  return groups.filter((g) => g.units.length);
}
// The steps: all units in reading order, with a new step when the next unit would pass the height budget, so
// no step is a long scroll at any text size (heights are measured on the learner's screen). A group that starts
// inside a step gets its own heading there (HEAD px). The core's first pitfall stays in step 1, right after
// the explanation it belongs to. Each unit is marked with its group (g) and whether it starts it (first).
export const HEAD = 56;
export function paginate(groups, heightOf, budget = 1450) {
  const seq = [];
  for (const g of groups) {
    let order = g.units;
    if (g.id === 'core') {
      const blocks = g.units.filter((u) => u.kind === 'block');
      const pits = g.units.filter((u) => u.kind === 'pit');
      if (pits.length && blocks.length) {
        const room = budget - HEAD - heightOf(pits[0]);
        let k = 0, sum = 0;
        while (k < blocks.length && (k === 0 || sum + heightOf(blocks[k]) <= room)) { sum += heightOf(blocks[k]); k++; }
        order = [...blocks.slice(0, k), pits[0], ...blocks.slice(k), ...pits.slice(1)];
      }
    }
    order.forEach((u, k) => seq.push({ u, g: g.id, first: k === 0 }));
  }
  const pages = [];
  const heights = [];
  let page = [], h = 0;
  for (const x of seq) {
    const uh = heightOf(x.u) + (x.first ? HEAD : 0);
    if (page.length && h + uh > budget) { pages.push(page); heights.push(h); page = []; h = 0; }
    if (!page.length && !x.first) h += HEAD; // a continued group repeats its heading
    page.push(x); h += uh;
  }
  if (page.length) { pages.push(page); heights.push(h); }
  // A last step with only a little left (two or three words) joins the step before it when both still fit.
  const n = pages.length;
  if (n > 1 && heights[n - 1] < budget * 0.3 && heights[n - 2] + heights[n - 1] - (pages[n - 1][0].first ? 0 : HEAD) <= budget * 1.08) {
    pages[n - 2].push(...pages.pop());
  }
  return pages.map((items) => ({ id: items[0].g, items }));
}
// A table taller than most of a step is split into runs of rows (its rows are cards on a phone, each one
// complete with its column names), so it can spread over two steps.
export function splitTall(groups, lesson, heightOf, limit) {
  return groups.map((g) => ({ ...g, units: g.units.flatMap((u) => {
    const b = u.kind === 'block' && !u.rows && lesson.explanation[u.i];
    const h = heightOf(u);
    // A letter table (the alphabet) stays whole, with its A-Z key, unless it is taller than a whole step.
    if (!b || b.type !== 'table' || b.rows.length < 4 || h <= (tableShape(b, lesson.level).letters ? limit / 0.85 : limit)) return [u];
    const parts = Math.min(b.rows.length, Math.ceil(h / (limit * 0.8)));
    const size = Math.ceil(b.rows.length / parts);
    const out = [];
    for (let s = 0; s < b.rows.length; s += size) out.push({ kind: 'block', i: u.i, rows: [s, Math.min(b.rows.length, s + size)] });
    return out;
  }) }));
}

// The English a pitfall talks about, to be heard (LF-2): for a pronunciation pitfall the contrast words its
// Hebrew text quotes (a word right after "לא" is the wrong sound and is left out); for a grammar pitfall the
// right example after its last colon, without "(not …)", "not '…'" and starred wrong forms, kept only where the
// Hebrew text quotes it too, so an English explanation clause is never read out as an example.
const RUN = /[^֐-׿]*[A-Za-z][^֐-׿]*/g;
const IPA = /[/ːɪəʊæɒʌθðŋʃʒɜɔˈ]/;
const NOT_HE = /(?:^|[\s(])ו?לא\s*$/;
const TERMS = /^(?:ing|es|ed|th|present|past|future|perfect|simple|continuous|passive|present perfect|past simple|present simple)$/i;
const plain = (s) => String(s).toLowerCase().replace(/[^a-z']+/g, ' ').trim();
function heRuns(p, { single = false } = {}) {
  const out = [];
  const he = String(p.he || '');
  for (const m of he.matchAll(RUN)) {
    if (NOT_HE.test(he.slice(0, m.index))) continue;
    for (let part of m[0].split(/[,:;()=]|\s[–-]\s/)) {
      part = part.replace(/^[\s\-–'"‘’“”.*‏]+|[\s\-–'"‘’“”.(‏]+$/g, '');
      if (!/^[A-Za-z][A-Za-z' ]*$/.test(part) || IPA.test(part) || part.split(' ').length > 3 || TERMS.test(part)) continue;
      if (part.length < 2 && !(single && /^[A-Z]$/.test(part))) continue;
      if (out.some((x) => x.toLowerCase() === part.toLowerCase())) continue;
      out.push(part);
    }
  }
  return out;
}
function rightExample(p) {
  const en = String(p.en || '');
  const i = en.lastIndexOf(':');
  if (i < 0) return [];
  const heLatin = ` ${plain([...String(p.he || '').matchAll(RUN)].map((m) => m[0]).join(' '))} `;
  const quoted = (s) => heLatin.includes(` ${plain(s)} `);
  const tail = en.slice(i + 1)
    .replace(/\((?:and |or )?(?:not|never)\b[^)]*\)?/gi, '')
    .replace(/\(([A-Za-z]+)\)/g, '$1')
    .replace(/\([^)]*\)?/g, '')
    .replace(/,?\s*(?:and |or )?not\s+(?:\*|['‘"“])[^'’"”.;]*['’"”]?/gi, '')
    .replace(/,?\s*or\s+['‘"“][^'’"”]*['’"”]/gi, '')
    .replace(/\*[^.;,()]*[.;,]?/g, '')
    .replace(/\s+/g, ' ').replace(/\s+([.,;?!])/g, '$1').replace(/([?!])\./g, '$1').trim();
  const out = [];
  for (const s of tail.split(/(?<=[.?!;])\s+/).map((x) => x.replace(/[;,]$/, '').trim())) {
    if (!/[A-Za-z]{2}/.test(s) || IPA.test(s)) continue;
    if (quoted(s)) { out.push(s); continue; }
    for (const c of s.split(/,\s+/).map((x) => x.replace(/^(?:but|and|or)\s+/i, '').replace(/[.;]$/, ''))) if (/[A-Za-z]{2}/.test(c) && quoted(c)) out.push(c);
  }
  return out;
}
export function pitfallSayables(p) {
  if (/^pron-/.test(p?.error_type || '')) {
    const words = heRuns(p);
    if (words.length) return words.slice(0, 4);
    return [...String(p?.en || '').matchAll(/\bthe letter ([A-Z])\b/g)].map((m) => m[1]).slice(0, 2);
  }
  const ex = rightExample(p || {});
  return ex.length ? ex.slice(0, 2) : heRuns(p || {}, { single: true }).slice(0, 4);
}

// ---------- tables (LF-3) ----------
// A table whose first header is English reads left to right; its Hebrew columns (a Hebrew header) move to the
// end as right-to-left cells. On phones and at 130-150% text each row becomes a card (CSS): the English cells
// in a line with their column names, the Hebrew under them. IPA columns, at Pre-A1, wait behind "Show IPA".
export function tableShape(b, level) {
  const english = !HEBREW.test(b.headers[0] || '');
  const cols = b.headers.map((h, i) => ({ i, he: english && HEBREW.test(h), ipa: /IPA/i.test(h) || (b.rows.length > 0 && b.rows.every((r) => /^\/[^/]+\/$/.test(String(r[i] || '').trim()))) }));
  const order = english ? [...cols.filter((c) => !c.he), ...cols.filter((c) => c.he)] : cols;
  const letters = english && b.rows.length > 0 && b.rows.every((r) => /^[A-Za-z](?:\s?[A-Za-z])?$/.test(String(r[0] || '').trim()));
  const examples = b.headers.findIndex((h) => /^examples?$/i.test(h.trim()));
  const hideIpa = level === 'PreA1' && cols.some((c) => c.ipa);
  // Rows become cards (CSS, on phones and at large text) when three or more columns show; two fit as a table.
  const stack = order.filter((c) => !(hideIpa && c.ipa)).length >= 3;
  return { english, order, letters, examples, alphabet: letters && b.rows.length >= 20, hideIpa, stack };
}
function tableBlock(b, level, continued = false) {
  const s = tableShape(b, level);
  const sayOf = (r) => (s.examples >= 0 ? r[s.examples] : String(r[0]).trim().charAt(0));
  // k: the row, for the first cell of a row (its play key); -1 for the other cells.
  const cell = (c, v, k) => {
    const cls = [c.he ? 'c-he' : 'c-en', c.ipa ? 'col-ipa' : ''].filter(Boolean).join(' ');
    const play = k >= 0 && s.letters && canSpeak() ? html`<button type="button" class="key ghost small icon-only row-say" data-say-text="${sayOf(b.rows[k])}" aria-label="${tt('השמעה', 'Play')}: ${sayOf(b.rows[k])}">${icon('volume', { size: 18 })}</button>` : '';
    return c.he
      ? html`<td class="${cls}" data-label="${b.headers[c.i]}" lang="he" dir="rtl">${isolateLatin(v)}</td>`
      : html`<td class="${cls}" data-label="${b.headers[c.i]}" dir="auto">${play}${v}</td>`;
  };
  const tools = !continued && ((s.alphabet && canSpeak()) || s.hideIpa)
    ? html`<div class="table-tools row">${s.alphabet && canSpeak() ? html`<button type="button" class="key small" data-say-text="${b.rows.map((r) => String(r[0]).trim().charAt(0)).join(', ')}" data-say-slow>${icon('turtle', { size: 18 })} <span dir="ltr" lang="en">A–Z</span> ${tt('לאט', 'slowly')}</button>` : ''}${s.hideIpa ? html`<button type="button" class="key ghost small" data-ipa-toggle aria-expanded="false">${isolateLatin(tt('להצגת IPA', 'Show IPA'))}</button>` : ''}</div>`
    : '';
  const attrs = s.english ? html`dir="ltr" lang="en"` : '';
  return html`${tools}${tableHint()}<div class="table-wrap ${s.stack ? 'tstack' : ''} ${s.letters ? 'letters' : ''} ${s.hideIpa ? 'ipa-hidden' : ''}" ${attrs}><table class="data"><thead><tr>${s.order.map((c) => html`<th class="${[c.he ? 'c-he' : 'c-en', c.ipa ? 'col-ipa' : ''].filter(Boolean).join(' ')}" ${c.he ? html`lang="he" dir="rtl"` : html`dir="auto"`}>${b.headers[c.i]}</th>`)}</tr></thead>
    <tbody>${b.rows.map((r, k) => html`<tr>${s.order.map((c, n) => cell(c, r[c.i] ?? '', n === 0 ? k : -1))}</tr>`)}</tbody></table></div>`;
}

export function renderBlocks(blocks, { level = null, continued = false } = {}) {
  return blocks.map((b) => {
    switch (b.type) {
      // Explanation paragraphs fold their Hebrew at "partial" support (a tap per paragraph, R1-D10).
      case 'rule': return html`<div class="block-rule">${bi(b, { fold: true })}</div>`;
      case 'tip': return html`<div class="block-tip row" style="align-items:flex-start">${icon('hint', { size: 18 })}<div class="grow">${bi(b, { fold: true })}</div></div>`;
      case 'warning': return html`<div class="block-warning row" style="align-items:flex-start">${icon('alert', { size: 18 })}<div class="grow">${bi(b, { fold: true })}</div></div>`;
      // When a table is still wider than the screen, a line above it and a fade say that it scrolls (markWideTables).
      case 'table': return tableBlock(b, level, continued);
      case 'examples': return html`<div class="examples">${b.items.map((x) => exampleRow(x))}</div>`;
      default: return html`<p>${bi(b, { fold: true })}</p>`;
    }
  });
}

const tableHint = () => html`<p class="table-hint xsmall faint" hidden>${tt('הטבלה רחבה מהמסך: גללו אותה הצידה כדי לראות את כל העמודות.', 'This table is wider than the screen: scroll it sideways to see every column.')}</p>`;
// A table wider than its frame says that it scrolls (R2-32): the hint line above it, and a fade on the side its
// hidden columns are on until the learner reaches the far side. It can be scrolled with the keyboard too.
export function markWideTables(root) {
  for (const w of root.querySelectorAll('.table-wrap')) {
    const hint = w.previousElementSibling?.classList.contains('table-hint') ? w.previousElementSibling : null;
    const update = () => {
      const max = w.scrollWidth - w.clientWidth;
      const wide = max > 2;
      w.classList.toggle('scrolls', wide);
      w.classList.toggle('at-end', wide && Math.abs(w.scrollLeft) >= max - 2);
      if (hint) hint.hidden = !wide;
      if (wide) { w.tabIndex = 0; w.setAttribute('role', 'region'); w.setAttribute('aria-label', tt('טבלה שאפשר לגלול הצידה', 'Table that scrolls sideways')); }
      else if (w.getAttribute('role') === 'region') { w.removeAttribute('tabindex'); w.removeAttribute('role'); w.removeAttribute('aria-label'); }
    };
    if (!w.dataset.marked) { w.dataset.marked = '1'; w.addEventListener('scroll', update, { passive: true }); }
    update();
  }
}

export function exampleRow(x) {
  return html`<div class="example">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${x.en}" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}<div class="grow">${legend(x.en, hebrewSupport() === 'off' ? null : x.he)}${x.note ? html`<div class="note" lang="en" dir="ltr">${x.note}</div>` : ''}${x.note_he && hebrewSupport() !== 'off' ? html`<div class="note" lang="he" dir="rtl">${isolateLatin(x.note_he)}</div>` : ''}</div></div>`;
}

// A Hebrew-speaker pitfall: its own box, next to the rule it belongs to, with the English it is about to hear.
export function pitfallBox(p) {
  const say = canSpeak() ? pitfallSayables(p) : [];
  return html`<div class="pitfall">
    <p class="pitfall-head">${icon('flag', { size: 16 })} ${tt('מלכודת לדוברי עברית', 'A trap for Hebrew speakers')}</p>
    <div>${bi(p, { fold: true })}</div>
    ${say.length ? html`<div class="pitfall-say">${say.map((s) => html`<button type="button" class="key small ghost say-chip" data-say-text="${s}" aria-label="${tt('השמעה', 'Play')}: ${s}">${icon('volume', { size: 16 })}<span lang="en" dir="ltr">${s}</span></button>`)}</div>` : ''}
  </div>`;
}

// ---------- the learner's own mistakes (LF-8): fillGaps and mistakeNote live in core/pool.js ----------
export { fillGaps, mistakeNote, clipDiff, sameOrder };

// The note before a second try (r4 LF-2), in the support language only ('he' unless Hebrew support is off): the
// exercise's own note when it is safe (pool.retrySafe), else the hint when it is safe, else the kind of mistake.
// Shared with the drill player (LF-10).
export function secondTryNote(r, ex, errorInfo = null) {
  const lang = hebrewSupport() === 'off' ? 'en' : 'he';
  const pick = (n) => retrySafe(n, ex, r.response)?.[lang] || null;
  const text = pick(r.retry_note || r.specific) || pick(ex.hint);
  if (text) return lang === 'he' ? html`<span lang="he" dir="rtl">${isolateLatin(text)}</span>` : html`<span lang="en" dir="ltr">${text}</span>`;
  if (errorInfo) return html`${tt(errorInfo.name_he, errorInfo.name_en)}${lang === 'he' && errorInfo.why_he ? html`: <span lang="he" dir="rtl">${isolateLatin(errorInfo.why_he)}</span>` : ''}`;
  return tt('בדקו שוב את התשובה.', 'Check your answer again.');
}

// ---------- the "all Hebrew" switch (LF-10) ----------
const HE_ALL = 'lucid-he-all';
function heAllSaved(level) { try { return JSON.parse(localStorage.getItem(HE_ALL) || '{}')[level] === true; } catch { return false; } }
function heAllSave(level, value) {
  try { const m = JSON.parse(localStorage.getItem(HE_ALL) || '{}'); m[level] = value; localStorage.setItem(HE_ALL, JSON.stringify(m)); } catch { /* storage off: the switch still works for this lesson */ }
}
function heAllApply(value) {
  const d = globalThis.document?.documentElement;
  if (!d) return;
  if (value) d.dataset.heAll = '1'; else delete d.dataset.heAll;
}
const heAllOffered = () => ['partial', 'minimal'].includes(hebrewSupport());

// A link to a lesson whose file does not exist: say it is still being written and point to the next
// lesson that is ready (P-14, P-26, P-61). A lesson that exists but did not load is a connection problem.
function missingLesson(el, { id, plan, order, available }) {
  const idx = order.findIndex((l) => l.id === id);
  const ready = (l) => available.has(l.id);
  const alt = idx < 0 ? null : order.slice(idx + 1).find(ready) || order.slice(0, idx).reverse().find(ready) || null;
  const unwritten = plan && available.size > 0 && !available.has(id);
  const body = unwritten
    ? html`<p>${tt('השיעור הזה עוד בכתיבה, ולכן אי אפשר לפתוח אותו כרגע.', 'This lesson is still being written, so it cannot be opened yet.')}</p>
      ${alt ? html`<p>${tt('אפשר להמשיך לשיעור שכבר מוכן:', 'You can go on with a lesson that is ready:')}</p><a class="key enter" href="#/lesson/${alt.id}" data-alt-lesson>${legend(alt.title_en, alt.title_he)}</a>` : ''}
      <a class="key ${alt ? 'ghost' : 'enter'}" href="#/path">${tt('למסלול', 'To the path')}</a>`
    : plan
      // Not loaded: most likely offline. Say what still works and how to prepare next time (R2-11).
      ? html`<p>${tt('לא הצלחנו לטעון את השיעור. ייתכן שאין חיבור לאינטרנט; נסו שוב כשיש חיבור.', 'The lesson did not load. You may be offline; try again when you are connected.')}</p>
        <p class="small muted">${allCards().length ? tt('גם בלי חיבור אפשר לחזור על המילים שלך ולפתוח שיעורים שכבר נשמרו במכשיר.', 'Without a connection you can still review your words and open lessons already saved on this device.') : tt('גם בלי חיבור אפשר לפתוח שיעורים שכבר נשמרו במכשיר.', 'Without a connection you can still open lessons already saved on this device.')}</p>
        <div class="stack-sm" data-saved-lessons hidden></div>
        <div class="row" style="justify-content:center"><a class="key enter" href="#/lesson/${id}?t=${Date.now()}">${tt('לנסות שוב', 'Try again')}</a>${allCards().length ? html`<a class="key" href="#/review" data-offline-review>${tt('חזרה על מילים (עובד בלי חיבור)', 'Review your words (works offline)')}</a>` : ''}<a class="key ghost" href="#/path">${tt('למסלול', 'To the path')}</a></div>
        <p class="xsmall faint">${tt('בפעם הבאה: לפני שיוצאים בלי אינטרנט, אפשר לשמור את כל השיעורים במכשיר ב', 'Next time: before you go offline, you can save all lessons on this device in ')}<a href="#/settings" data-offline-settings>${tt('הגדרות ← שימוש בלי אינטרנט', 'Settings → Offline use')}</a>.</p>`
      : html`<p>${tt('אין שיעור בכתובת הזאת.', 'There is no lesson at this address.')}</p><a class="key enter" href="#/path">${tt('למסלול', 'To the path')}</a>`;
  render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/path" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack missing-lesson">
    <h1 class="h3" tabindex="-1">${plan ? legend(plan.title_en, plan.title_he) : tt('השיעור לא נמצא', 'Lesson not found')}</h1>
    ${unwritten ? html`<p><span class="tag">${tt('בהכנה', 'In preparation')}</span></p>` : ''}
    ${body}</div></div></div>`);
  if (plan && !unwritten) savedLessons(order, id, idx).then((list) => {
    const box = el.querySelector('[data-saved-lessons]');
    if (!box || !list.length) return;
    render(box, html`<p class="small">${tt('שיעורים שכבר שמורים במכשיר:', 'Lessons already saved on this device:')}</p>${list.map((l) => html`<a class="key small ghost" href="#/lesson/${l.id}" data-saved-lesson>${legend(l.title_en, l.title_he)}</a>`)}`);
    box.hidden = false;
  }).catch(() => {});
}

// Lessons whose files the offline cache holds (opened before, or saved in Settings): up to three, the next ones
// after this lesson first, then earlier ones, skipping lessons already completed.
const lessonUrl = (lid) => new URL(`../../content/lessons/${encodeURIComponent(lid)}.json`, import.meta.url).href;
export async function savedLessons(order, id, idx) {
  if (!globalThis.caches) return [];
  const keys = (await caches.keys()).filter((k) => k.startsWith('lucid-'));
  if (!keys.length) return [];
  const stores = await Promise.all(keys.map((k) => caches.open(k)));
  const ahead = idx >= 0 ? [...order.slice(idx + 1), ...order.slice(0, idx).reverse()] : order;
  const out = [];
  for (const l of ahead) {
    if (out.length >= 3) break;
    if (l.id === id || progressOf(l.id)?.status === 'completed') continue;
    for (const c of stores) if (await c.match(lessonUrl(l.id))) { out.push(l); break; }
  }
  return out;
}

// The daily plan's slice of this lesson, when it is the plan's lesson today (the same numbers Today shows).
function planSlice(id, lesson) {
  try {
    if (model().placementPending) return null;
    return todayPlan(settings().daily_minutes, { lesson }).blocks.find((b) => b.id === 'learn' && b.lesson === id)?.slice || null;
  } catch { return null; }
}
// Today's state of the day after this lesson (LF-1), by Today's own rule: the plan for today's minutes (a choice
// made on Today counts for that day only), and the day is done when every block is done or today's work adds up
// to those minutes (adaptive.planStatus with minutesToday). learner.dayStatus (TP-1) is used when it exists;
// this fallback is the same computation, so the lesson end and Today never disagree.
// Returns { complete, next, firstRecallOpen }, or null (placement still pending, or no plan).
export function planLeft({ lesson = null, scenarios = [], writingTasks = [], paces = new Map() } = {}) {
  try {
    if (model().placementPending) return null;
    if (typeof learner.dayStatus === 'function') {
      const st = learner.dayStatus({ lesson, scenarios, writingTasks, paces });
      if (st) return { complete: Boolean(st.complete), next: st.complete ? null : st.next || null, firstRecallOpen: firstRecallOpen(st.plan, st.firstRecallOpen) };
    }
    const s = settings();
    const day = todayKey();
    const isToday = (iso) => Boolean(iso) && todayKey(new Date(iso)) === day;
    const target = s.today_minutes?.date === day && s.today_minutes.n ? s.today_minutes.n : s.daily_minutes;
    const plan = todayPlan(target, { lesson, scenarios, writingTasks });
    const minutesDone = minutesToday({
      attempts: model().attempts.filter((a) => isToday(a.at)), events: store.all('events').filter((e) => isToday(e.at)), lessons: paces,
      whole: store.all('progress').filter((x) => isLessonId(x.id) && x.status === 'completed' && isToday(x.started_at) && isToday(x.completed_at)).map((x) => x.id),
    });
    const st = planStatus(plan, { minutesDone, target });
    return { complete: st.complete, next: st.complete ? null : plan.blocks.find((b) => !b.done) || null, firstRecallOpen: firstRecallOpen(plan) };
  } catch { return null; }
}
// Words that entered review today and have not had their first round yet, while the review block is open.
function firstRecallOpen(plan, given) {
  if (typeof given === 'boolean') return given;
  if ((plan?.blocks || []).some((b) => b.id === 'review' && b.done)) return false;
  const day = todayKey();
  return due().some((c) => todayKey(new Date(c.created_at)) === day && !c.log?.length && !c.fsrs?.reps);
}
// A lesson's pace for the minutes done today, as Today loads it.
const paceOf = (l) => ({ minutes: l.minutes, exercises: l.exercises.length, intro: introSlots(l) });
// The words of a lesson that entered review today (words queued for the next days are not counted).
export function wordsAddedToday(cards, lessonId, day = todayKey()) {
  return cards.filter((c) => c.kind === 'meaning' && !c._deleted && c.ref?.lesson === lessonId && todayKey(new Date(c.created_at)) === day).length;
}
const blockName = (b) => ({
  warmup: tt('חימום', 'Warm-up'),
  review: tt('חזרה על מילים', 'Word review'),
  practice: tt('תרגול ממוקד', 'Targeted practice'),
  use: b.scenario ? tt('מהחיים', 'Real life') : b.kind === 'reading' ? tt('קריאה', 'Reading') : b.kind === 'speaking' ? tt('דיבור', 'Speaking') : tt('כתיבה', 'Writing'),
  exit: tt('בדיקת יציאה', 'Exit check'),
}[b.id] || tt('התוכנית', 'Your plan'));

export default async function lessonView(el, ctx) {
  const id = ctx.params.id;
  const [lesson, tx, curriculum, available] = await Promise.all([content.lesson(id), taxonomyIndex(), content.curriculum(), content.availableLessons().catch(() => new Set())]);
  const order = lessonOrder(curriculum);
  const plan = order.find((l) => l.id === id);
  if (!lesson) { missingLesson(el, { id, plan, order, available }); return; }
  ctx.setTitle(lesson.title_en);
  startLesson(lesson);
  const variant = settings().english_variant;
  const errors = tx.error;
  // The next lesson that has been written (an unwritten one would be a dead end).
  const idx = order.findIndex((l) => l.id === id);
  const nextPlan = order.slice(idx + 1).find((l) => !available.size || available.has(l.id)) || null;
  // Leaving returns to where the learner came from (LF-11).
  const exitTo = exitTarget(ctx.from, 'today');
  // What Today needs to judge the day (LF-1), loaded while the lesson runs: the scenarios and writing tasks of
  // the plan, the next lesson's file and the pace of every lesson answered today. Each load is cached.
  const dayExtras = { lesson: null, scenarios: [], writingTasks: [], paces: new Map() };
  (async () => {
    const today = todayKey();
    const ids = [...new Set(model().attempts.filter((a) => a.source === 'lesson' && a.lesson && a.lesson !== id && todayKey(new Date(a.at)) === today).map((a) => a.lesson))];
    const [sc, wr, nextFile, ...others] = await Promise.all([content.scenarios().catch(() => null), content.writingExercises().catch(() => null), nextPlan ? content.lesson(nextPlan.id).catch(() => null) : null, ...ids.map((x) => content.lesson(x).catch(() => null))]);
    dayExtras.scenarios = sc?.scenarios || [];
    dayExtras.writingTasks = wr?.exercises || [];
    dayExtras.lesson = nextFile;
    for (const l of others) if (l) dayExtras.paces.set(l.id, paceOf(l));
  })().catch(() => {});
  const dayState = () => {
    dayExtras.paces.set(id, paceOf(lesson));
    const next = model().next;
    return planLeft({ ...dayExtras, lesson: next && dayExtras.lesson?.id === next.id ? dayExtras.lesson : null });
  };

  let stage = ctx.query.stage === 'practice' || ctx.query.stage === 'missed' ? 'practice' : 'intro';
  const queue = lesson.exercises.map((ex) => ({ ex, retry: false }));
  let qi = 0;
  const firstTry = new Map(); // exercise id -> points (0..1) on first attempt
  const judged = new Set(); // exercises the learner counted as right themselves ("My answer is also correct")
  const unheard = new Set(); // listen items answered when no sound played: not scored (r4 LF-5, contract (b))
  let ctl = null;
  let checked = null; // last check result
  let lastAttempt = null; // the attempt record of the last check (for "My answer is also correct")
  let hintUsed = false;
  let secondTry = false; // the learner is fixing a wrong typed answer (LF-6)
  let shownAt = 0;
  let missedMode = false;
  let runSince = new Date().toISOString(); // this run's start: "Worth watching" shows only its mistakes
  let learnStep = 0;
  let exToken = 0;
  const slice = planSlice(id, lesson);
  // Today's part of a long lesson, as the daily plan set it (R2-28, R1-N7, R1-D3): shown on the intro and marked
  // in the player when the first pass reaches it.
  const part = slice?.split ? { upto: slice.upto, of: slice.of, total: slice.total, today: slice.today, done: Boolean(slice.partDone), shown: false } : null;
  heAllApply(heAllOffered() && heAllSaved(lesson.level));

  // The top bar stays on screen for the whole lesson: only its width and counter change, so the bar's width
  // moves smoothly from step to step (LF-7).
  function frame(body, foot = '') {
    const step = stage === 'practice' || stage === 'part' ? stepInfo(queue, qi) : null;
    const pct = stage === 'intro' ? 0 : stage === 'learn' ? 6 : stage === 'review' ? 100 : stepPct(step);
    if (!$('.player > .player-top', el)) {
      // The exit key shows its word at 100-115% text and only its icon at 130% and above (r4 LF-13); the top is
      // one row at large text and stays on screen below it (LF-3, CSS).
      render(el, html`<div class="player lesson-player">
        <div class="player-top">
          <button type="button" class="key ghost small exit-key" data-exit aria-label="${tt('יציאה מהשיעור', 'Leave lesson')}">${icon('x')}<span class="exit-label" aria-hidden="true">${tt('יציאה', 'Exit')}</span></button>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${tt('התקדמות בשיעור', 'Lesson progress')}"><span style="width:0%"></span></div>
          <span class="top-meta"></span>
          <a class="key ghost small icon-only" href="#/help" aria-label="${tt('עזרה', 'Help')}">${icon('info', { size: 18 })}</a>
        </div>
        <div class="player-body" id="pbody"></div>
      </div>`);
    }
    const bar = $('.player-top .progress', el);
    bar.setAttribute('aria-valuenow', String(pct));
    bar.firstElementChild.style.width = `${pct}%`;
    const meta = $('.player-top .top-meta', el);
    meta.classList.toggle('is-count', Boolean(step));
    meta.parentElement.classList.toggle('counting', Boolean(step));
    render(meta, step ? html`<span class="step-count">${stepLabel(step)}</span>` : levelTag(lesson.level));
    render($('#pbody', el), body);
    $('#pfoot', el)?.remove();
    if (foot) $('.player', el).insertAdjacentHTML('beforeend', `<div class="player-foot" id="pfoot">${foot}</div>`);
  }

  const heAllKey = () => (heAllOffered() ? html`<button type="button" class="key ghost small he-all" data-he-switch aria-pressed="${document.documentElement.dataset.heAll ? 'true' : 'false'}">${icon('globe', { size: 16 })} ${tt('הכול בעברית', 'All in Hebrew')}</button>` : '');

  // Today's plan note, one line under the main key (LF-1).
  function partNote(resuming) {
    if (part?.done) return tt('החלק של היום כבר הושלם · אפשר להמשיך, והמקום יישמר', 'Today\'s part is done · you can keep going; your place is saved');
    if (part) return tt(`היום: עד תרגיל ${part.upto} · כ-${part.today} דק׳`, `Today: up to exercise ${part.upto} · about ${part.today} min`);
    if (resuming && slice?.total && slice.remaining) return tt(`נשארו כ-${slice.remaining} דק׳`, `About ${slice.remaining} min left`);
    return '';
  }
  // After "Nearly there": the exercises missed on the first try are what is left (R2-02, R2-25).
  function missedInfo(p) {
    if (!p?.missed?.ids?.length || p.status === 'completed') return null;
    const ids = p.missed.ids.filter((x) => lesson.exercises.some((e) => e.id === x));
    return ids.length ? { n: ids.length, min: missedMinutes(lesson, ids.length), pct: scorePercent(p.last_score ?? 0, false), score: p.last_score ?? 0 } : null;
  }
  const resumeStepOf = (r) => stepInfo(r.queue.map(([eid, retry]) => ({ ex: { id: eid }, retry })), r.qi);
  const resumeLabel = (s) => (s.retry
    ? tt(`להמשיך: תרגיל חוזר ${s.pos} מתוך ${s.total}`, `Continue: revisit ${s.pos} of ${s.total}`)
    : tt(`להמשיך מתרגיל ${s.pos} מתוך ${s.total}`, `Continue from exercise ${s.pos} of ${s.total}`));

  function showIntro() {
    const p = progressOf(id);
    const resuming = Boolean(p?.resume && p.resume.qi < p.resume.queue.length);
    // Coming back resumes, never restarts (LF-1): the saved place is loaded now, so "To the explanation" and then
    // "Start practice" continue from it too.
    if (resuming) restoreResume(p.resume);
    const rs = resuming ? resumeStepOf(p.resume) : null;
    const mi = resuming ? null : missedInfo(p);
    const relearnFirst = Boolean(mi && mi.score < 0.5);
    const note = partNote(resuming);
    const noteLine = note ? html`<p class="foot-note xsmall" data-part-line>${note}</p>` : '';
    frame(html`<div class="lesson-intro stack-lg">
      ${resuming ? html`<div class="banner resume-banner" data-resume-banner>${icon('play', { size: 18 })}<span>${rs.retry
        ? tt(`עצרתם בתרגילים החוזרים (${rs.pos} מתוך ${rs.total}). התשובות שכבר נתתם שמורות.`, `You stopped in the exercises to revisit (${rs.pos} of ${rs.total}). Your answers so far are saved.`)
        : tt(`עצרתם בתרגיל ${rs.pos} מתוך ${rs.total}. התשובות שכבר נתתם שמורות.`, `You stopped at exercise ${rs.pos} of ${rs.total}. Your answers so far are saved.`)}</span></div>` : ''}
      <div class="stack-sm">
        <div class="intro-meta"><p class="small faint">${plan ? tt(`${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · שיעור ${plan.order}`, `${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · Lesson ${plan.order}`) : ''} · ${tt(`כ-${lesson.minutes} דקות`, `about ${lesson.minutes} min`)}</p>${heAllKey()}</div>
        <h1 tabindex="-1">${legend(lesson.title_en, lesson.title_he)}</h1>
      </div>
      ${mi ? html`<div class="banner stack-sm missed-choice" data-missed-banner><h2 class="small">${mi.score >= 0.5 ? tt('כמעט שם', 'Nearly there') : tt('השיעור עוד פתוח', 'Not complete yet')}</h2><p class="small">${tt(`בפעם הקודמת: ${mi.pct}% בניסיון הראשון. התשובות הנכונות נשמרו, אז כדי להשלים את השיעור נשאר לתקן רק את ${mi.n === 1 ? 'התרגיל שפספסתם' : `${mi.n} התרגילים שפספסתם`} (כ-${mi.min} דק׳).`, `Last time: ${mi.pct}% on the first try. Your right answers are kept, so to complete the lesson only the ${mi.n === 1 ? 'one exercise' : `${mi.n} exercises`} you missed are left (about ${mi.min} min).`)}</p><div class="row">${relearnFirst ? html`<button type="button" class="key ghost small" data-skip-learn>${tt('את כל התרגול מחדש', 'Practise everything again')}</button>` : html`<button type="button" class="key ghost small" data-go="learn">${tt('לקרוא שוב את ההסבר קודם', 'Read the explanation first')}</button>`}</div></div>` : ''}
      <div class="panel flat stack-sm"><h2 class="small">${tt('בסוף השיעור', 'By the end of this lesson')}</h2>
        <ul class="point-list">${lesson.objectives.map((o) => html`<li class="point">${icon('flag', { size: 16 })}<div class="grow">${bi(o)}</div></li>`)}</ul></div>
      ${lesson.warmup ? html`<div class="block-tip row" style="align-items:flex-start">${icon('sparkle', { size: 18 })}<div class="grow">${bi(lesson.warmup)}</div></div>` : ''}
      ${p?.status === 'completed' ? html`<p class="banner small">${icon('check', { size: 18 })}<span>${tt(`כבר השלמת את השיעור (ציון הכי טוב ${Math.round((p.best_score || 0) * 100)}%). אפשר לעבור עליו שוב.`, `You've completed this lesson (best ${Math.round((p.best_score || 0) * 100)}%). You can go through it again.`)}</span></p>` : ''}
    </div>`, resuming
      ? html`<div class="inner"><button type="button" class="key ghost small" data-go="learn">${tt('להסבר', 'To the explanation')}</button><button type="button" class="key ghost small" data-restart>${tt('להתחיל מההתחלה', 'Start again')}</button><span class="grow"></span><button type="button" class="key enter" data-resume>${resumeLabel(rs)} <span class="kbd">Enter</span></button>${noteLine}</div>`
      : relearnFirst
        // Under 50% the end screen advised re-reading first, and coming back keeps that advice (LF-9).
        ? html`<div class="inner"><span class="grow"></span><button type="button" class="key ghost" data-missed>${tt(`${mi.n === 1 ? 'לתרגל רק את הטעות' : `לתרגל רק את ${mi.n} הטעויות`} · כ-${mi.min} דק׳`, `Practise just the ${mi.n === 1 ? 'one' : mi.n} I missed · about ${mi.min} min`)}</button><a class="key enter" href="#/lesson/${id}?stage=relearn&t=${Date.now()}" data-relearn>${tt('לקרוא שוב את ההסבר ואז לתרגל', 'Read the explanation again, then practise')} <span class="kbd">Enter</span></a>${noteLine}</div>`
      : mi
        ? html`<div class="inner"><button type="button" class="key ghost" data-skip-learn>${tt('את כל התרגול מחדש', 'Practise everything again')}</button><span class="grow"></span><button type="button" class="key enter" data-missed>${tt(`${mi.n === 1 ? 'לתרגל את הטעות' : `לתרגל את ${mi.n} הטעויות`} · כ-${mi.min} דק׳`, `Practise the ${mi.n === 1 ? 'one' : mi.n} I missed · about ${mi.min} min`)} <span class="kbd">Enter</span></button>${noteLine}</div>`
        : html`<div class="inner"><span class="grow"></span><button type="button" class="key ghost" data-skip-learn>${tt('ישר לתרגול', 'Skip to practice')}</button><button type="button" class="key enter" data-go="learn">${tt('בואו נלמד', 'Let\'s learn')} <span class="kbd">Enter</span></button>${noteLine}</div>`);
  }

  // The end of today's part: what was done today, stop with the place saved, or finish now (R2-28, LF-4).
  function showPartEnd() {
    const s = stepInfo(queue, qi);
    const from = s.retry ? tt(`תרגיל חוזר ${s.pos} מתוך ${s.total}`, `revisit ${s.pos} of ${s.total}`) : tt(`תרגיל ${s.pos} מתוך ${s.total}`, `exercise ${s.pos} of ${s.total}`);
    const today = todayKey();
    const mine = firstTries(model().attempts.filter((a) => a.lesson === id && a.source === 'lesson' && a.score !== null && a.skill !== 'speaking' && todayKey(new Date(a.at)) === today));
    const right = mine.filter((a) => a.correct).length;
    const rest = restMinutes(lesson, queue, qi);
    frame(html`<div class="stack-lg part-end">
      <div class="stack-sm"><h1 tabindex="-1">${tt('החלק של היום הושלם', 'Today\'s part is done')}</h1>
        ${mine.length ? html`<p class="part-score" data-part-score>${tt(`היום: ${right} מתוך ${mine.length} נכונות בניסיון הראשון`, `Today: ${right} of ${mine.length} right on the first try`)}</p>` : ''}
        <p>${tt(`עשיתם את החלק שהתוכנית היומית קבעה לשיעור הזה היום (עד תרגיל ${part.upto}, כ-${part.today} דקות).`, `You've done the part of this lesson your daily plan set for today (up to exercise ${part.upto}, about ${part.today} min).`)}</p>
        <p class="muted">${tt(`המקום שלכם נשמר: בפעם הבאה ממשיכים מ${from}. אפשר לעצור כאן, או להמשיך עכשיו אם יש זמן.`, `Your place is saved: next time you continue from ${from}. Stop here, or keep going now if you have time.`)}</p></div>
      ${lesson.vocab?.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('המילים של השיעור', 'This lesson\'s words')}</h2><p class="part-words" lang="en" dir="ltr">${lesson.vocab.map((v) => html`<span class="tag">${v.word}</span> `)}</p></div>` : ''}
    </div>`, html`<div class="inner"><button type="button" class="key ghost" data-part-go>${tt(`להמשיך ולסיים · כ-${rest} דק׳`, `Keep going to the end · about ${rest} min`)}</button><span class="grow"></span><a class="key enter" href="#/today" data-part-stop>${tt('לעצור כאן', 'Stop here')} <span class="kbd">Enter</span></a></div>`);
  }

  // The explanation in short steps, with dots, Back and Next (LF-2). The step is kept, so leaving and coming
  // back opens the same step.
  const STEP_TITLE = { core: ['ההסבר', 'The explanation'], examples: ['דוגמאות', 'Examples'], notes: ['כדאי לדעת', 'Good to know'], words: ['מילים חדשות', 'New words'] };
  const STEP_MORE = { core: ['עוד מההסבר', 'More of the explanation'], examples: ['עוד דוגמאות', 'More examples'], notes: ['עוד דברים שכדאי לדעת', 'More good to know'], words: ['עוד מילים חדשות', 'More new words'] };
  const wordRow = (v) => html`<div class="word-row">
    <div class="word-line">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${v.word}" aria-label="${tt('השמעה', 'Play')}: ${v.word}">${icon('volume', { size: 18 })}</button>` : ''}<span class="entry-word" lang="en" dir="ltr">${v.word}</span><span class="faint small" lang="en">${v.pos}</span>${v.ipa ? html`<span class="entry-ipa" lang="en" dir="ltr">${v.ipa}</span>` : ''}</div>
    <div class="entry-he" lang="he" dir="rtl">${isolateLatin(v.he)}</div>
    <div class="entry-ex" lang="en" dir="ltr">${v.example}</div>${v.example_he && hebrewSupport() !== 'off' ? html`<div class="entry-ex" lang="he" dir="rtl">${isolateLatin(v.example_he)}</div>` : ''}</div>`;
  const blockOf = (u) => {
    const b = lesson.explanation[u.i];
    return u.rows ? { ...b, rows: b.rows.slice(...u.rows) } : b;
  };
  const unitHtml = (u) => (u.kind === 'block' ? html`<div class="learn-unit">${renderBlocks([blockOf(u)], { level: lesson.level, continued: Boolean(u.rows?.[0]) })}</div>`
    : u.kind === 'pit' ? pitfallBox(lesson.hebrew_pitfalls[u.i])
      : u.kind === 'ex' ? exampleRow(lesson.examples[u.i])
        : wordRow(lesson.vocab[u.i]));
  // Steps for this screen and text size: every unit is drawn once out of sight and measured, then paginated.
  let learnPages = null;
  function measure(groups) {
    const units = groups.flatMap((g) => g.units);
    const body = $('#pbody', el);
    render(body, html`<div class="lesson-learn learn-measure" aria-hidden="true"><div class="stack learn-units">${units.map(unitHtml)}</div></div>`);
    const kids = [...body.querySelectorAll('.learn-measure .learn-units > *')];
    const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const hs = new Map(units.map((u, k) => [u, (kids[k]?.getBoundingClientRect().height || 0) + gap]));
    render(body, '');
    return (u) => hs.get(u) || 0;
  }
  function pagesFor() {
    if (learnPages) return learnPages;
    // About 1,500 px of content leaves the whole step, with its title and keys (about 400 px), under 2,000 px
    // on a phone.
    const budget = Math.max(1500, Math.round(innerHeight * 1.6));
    let groups = learnPlan(lesson, hebrewSupport());
    let heightOf = measure(groups);
    const split = splitTall(groups, lesson, heightOf, budget * 0.85);
    if (split.some((g, k) => g.units.length !== groups[k].units.length)) { groups = split; heightOf = measure(groups); }
    learnPages = paginate(groups, heightOf, budget);
    return learnPages;
  }
  // A step's content: a heading wherever a group starts (or continues at the top of the step), then its units.
  function stepContent(s, k, n) {
    const out = [];
    s.items.forEach((x, j) => {
      if (j === 0 || x.first) {
        const title = x.first ? STEP_TITLE[x.g] : STEP_MORE[x.g];
        out.push(j === 0
          ? html`<h2 class="learn-h" id="learn-h" tabindex="-1"><span class="sr-only">${tt(`שלב ${k + 1} מתוך ${n}: `, `Step ${k + 1} of ${n}: `)}</span>${tt(...title)}</h2>`
          : html`<h2 class="learn-h">${tt(...title)}</h2>`);
      }
      out.push(unitHtml(x.u));
    });
    return out;
  }
  function showLearn() {
    frame(html`<div class="lesson-learn"></div>`);
    const steps = pagesFor();
    const saved = progressOf(id)?.learn_step;
    if (Number.isInteger(saved) && learnStep === 0 && saved > 0) learnStep = saved;
    learnStep = Math.max(0, Math.min(learnStep, steps.length - 1));
    drawLearn(steps, { heading: 'h1' });
    // Measured before the font arrived, the steps are measured again once it has, at the same step and focus.
    const fonts = globalThis.document?.fonts;
    if (fonts && fonts.status !== 'loaded') {
      const at = learnPages;
      fonts.ready.then(() => { if (stage === 'learn' && learnPages === at) remeasure(); });
    }
  }
  // The steps again, after something changed their heights (the font, the "all in Hebrew" switch).
  function remeasure() {
    const focusId = document.activeElement?.closest?.('[data-he-switch]') ? 'he' : document.activeElement?.matches?.('h1[tabindex]') ? 'h1' : document.activeElement?.id === 'learn-h' ? 'step' : null;
    learnPages = null;
    frame(html`<div class="lesson-learn"></div>`);
    const steps = pagesFor();
    learnStep = Math.min(learnStep, steps.length - 1);
    drawLearn(steps, { heading: 'none' });
    if (focusId === 'he') $('[data-he-switch]', el)?.focus();
    else if (focusId === 'h1') $('h1[tabindex]', el)?.focus({ preventScroll: true });
    else if (focusId === 'step') $('#learn-h', el)?.focus({ preventScroll: true });
  }
  function drawLearn(steps, { heading = 'step' } = {}) {
    const n = steps.length;
    const k = learnStep;
    const s = steps[k];
    const last = k === n - 1;
    const minutes = readingMinutes(lesson, hebrewSupport());
    frame(html`<div class="stack-lg lesson-learn" data-step="${s.id}">
      <div class="stack-sm">
        <div class="learn-head">
          ${n > 1 ? html`<span class="learn-steps" aria-hidden="true">${steps.map((_, i) => html`<span class="dot ${i === k ? 'on' : i < k ? 'done' : ''}"></span>`)}</span>` : ''}
          <span class="learn-step-label small faint" data-step-label>${n > 1 ? `${t('of', { a: k + 1, b: n })} · ` : ''}${tt(`כ-${minutes} דק׳ קריאה`, `about ${minutes} min reading`)}</span>
          ${heAllKey()}
        </div>
        <h1 tabindex="-1">${legend(lesson.title_en, lesson.title_he)}</h1>
      </div>
      <section class="stack learn-units" aria-labelledby="learn-h">${stepContent(s, k, n)}</section>
    </div>`, html`<div class="inner">${k > 0 ? html`<button type="button" class="key ghost" data-learn-prev>${tt('הקודם', 'Back')}</button>` : ''}<span class="grow"></span>${last
      ? html`<button type="button" class="key enter" data-go="practice">${tt('לתרגול', 'Start practice')} <span class="kbd">Enter</span></button>`
      : html`<button type="button" class="key ghost" data-go="practice">${tt('לתרגול', 'Start practice')}</button><button type="button" class="key enter" data-learn-next>${tt('הבא', 'Next')} <span class="kbd">Enter</span></button>`}</div>`);
    markWideTables($('#pbody', el));
    if (heading === 'step') { window.scrollTo?.(0, 0); $('#learn-h', el)?.focus({ preventScroll: true }); }
  }
  function learnMove(d) {
    const steps = pagesFor();
    learnStep = Math.max(0, Math.min(learnStep + d, steps.length - 1));
    const cur = progressOf(id);
    if (cur) store.put('progress', { ...cur, learn_step: learnStep });
    stopSpeaking();
    drawLearn(steps);
  }

  function footer(state) {
    const item = queue[qi];
    if (state === 'answer') {
      // Speaking: "Can't speak right now" skips it with no penalty and no retry; Continue moves on.
      if (ctl?.speak) {
        return html`<div class="inner">
          <button type="button" class="key ghost small" data-skip-speak>${icon('speaking', { size: 18 })} ${tt('לא יכול/ה לדבר כרגע', 'Can\'t speak right now')}</button>
          <span class="grow"></span>
          <button type="button" class="key enter" data-check disabled>${t('continue')} <span class="kbd">Enter</span></button></div>`;
      }
      const typed = ['transform', 'correct', 'dictation', 'write'].includes(item.ex.type);
      return html`<div class="inner">
        ${item.ex.hint && !hintUsed && !secondTry ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}
        ${ctl?.graded !== false && !secondTry ? html`<button type="button" class="key ghost small" data-dontknow>${tt('לא יודע/ת', 'I don\'t know')}</button>` : ''}
        <span class="grow"></span>
        ${typed && item.ex.type !== 'write' ? html`<span class="foot-hint xsmall faint" aria-hidden="true" dir="ltr">Ctrl+Enter</span>` : ''}
        <button type="button" class="key enter" data-check disabled>${item.ex.type === 'write' ? tt('שליחה', 'Submit') : tt('בדיקה', 'Check')} <span class="kbd">${item.ex.type === 'write' ? 'Ctrl+Enter' : 'Enter'}</span></button></div>`;
    }
    return html`<div class="inner"><div class="verdict" role="status">${verdictHtml(item.ex, checked, errors)}</div><button type="button" class="key enter" data-next>${t('continue')} <span class="kbd">Enter</span></button></div>`;
  }

  // Each new exercise puts focus on its prompt, unless it put focus in its own answer field (LF-5), or the learner
  // already acted in the footer within the first 90 ms ("I don't know" moved focus to Continue: it stays there).
  function focusPrompt(token) {
    if (token !== exToken || stage !== 'practice') return;
    const a = document.activeElement;
    const root = $('#exroot', el);
    if (root && a && root.contains(a) && ['INPUT', 'TEXTAREA'].includes(a.tagName)) return;
    const foot = $('#pfoot', el);
    if (foot && ((a && foot.contains(a)) || $('[data-next], [data-try-again]', foot))) return;
    const h = $('#exroot .ex-prompt', el);
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }

  function showExercise() {
    const item = queue[qi];
    hintUsed = false; checked = null; lastAttempt = null; secondTry = false;
    const token = ++exToken;
    frame(html`<div id="exroot"></div>${item.retry ? html`<p class="xsmall faint" style="margin-top:var(--s5)">${icon('refresh', { size: 14 })} ${tt('עוד פעם אחת, כדי שיישאר', 'Once more, so it sticks')}</p>` : ''}<div id="hintroot"></div>`);
    ctl = mountExercise($('#exroot', el), item.ex, {
      errors, level: lesson.level, variant,
      onChange: (ready) => { const b = $('[data-check]', el); if (b) b.disabled = !ready; },
    });
    // The footer depends on the exercise (speaking has its own), so it is drawn once the exercise knows.
    $('.player', el).insertAdjacentHTML('beforeend', `<div class="player-foot" id="pfoot">${footer('answer')}</div>`);
    if (ctl.ready()) $('[data-check]', el).disabled = false;
    shownAt = performance.now();
    // After the exercise's own focus (an answer field at 50 ms, a play key at 60 ms).
    setTimeout(() => focusPrompt(token), 90);
  }

  const attemptBase = (item) => ({ source: 'lesson', lesson: id, exercise: item.ex.id, topic: item.ex.topic || lesson.topics[0], skill: item.ex.skill, level: lesson.level });
  const canRetry = () => Boolean(ctl && ctl.retryable && typeof ctl.reopen === 'function');

  async function doCheck({ dontKnow = false } = {}) {
    const item = queue[qi];
    let r;
    if (dontKnow) {
      r = { graded: true, correct: false, score: 0, response: '(I don\'t know)', error_type: null, ...answerFor(item.ex), dontKnow: true };
      // The exercise stays, with the answer marked in it, when the exercise can show it (LF-6, EX-4).
      if (typeof ctl.reveal === 'function') ctl.reveal();
      else {
        ctl.destroy();
        render($('#exroot', el), html`<div class="stack"><h2 class="ex-prompt">${bi(item.ex.prompt)}</h2></div>`);
      }
    } else {
      r = await ctl.check();
    }
    const wasSecond = secondTry;
    secondTry = false;
    checked = r;
    const latency = Math.round(performance.now() - shownAt);
    // Answered when nothing could be heard (contract (b) with the exercises lane, EX-4): not first-try evidence,
    // no retry, an attempt with no score, and a verdict that says so.
    if (r.unheard && r.graded !== false && !dontKnow) {
      if (!item.retry && !firstTry.has(item.ex.id)) unheard.add(item.ex.id);
      lastAttempt = recordAttempt({ ...attemptBase(item), correct: false, score: null, latency_ms: latency, response: '(unheard)', unheard: true });
      saveResume();
      showResult(r);
      return;
    }
    if (r.graded !== false) {
      if (!item.retry && !firstTry.has(item.ex.id)) { firstTry.set(item.ex.id, answerPoints(r, hintUsed, item.ex.type)); unheard.delete(item.ex.id); }
      lastAttempt = recordAttempt({ ...attemptBase(item), correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type, hint_used: hintUsed, latency_ms: latency, response: r.response });
      // A wrong typed answer on the first pass: a targeted note and a second try before the answer (LF-6).
      if (!dontKnow && !r.correct && !r.model && !item.retry && !wasSecond && canRetry()) {
        saveResume(qi);
        showSecondTry(r);
        return;
      }
      if (!r.correct && !item.retry && !['match', 'categorize', 'read'].includes(item.ex.type)) queue.push({ ex: item.ex, retry: true });
    } else {
      // Practice with no score (speaking, writing): stored as done, never as right or wrong.
      recordAttempt({ ...attemptBase(item), correct: Boolean(r.correct), score: null, latency_ms: latency, response: r.response });
      if (item.ex.type === 'speak') logEvent({ type: 'speaking', lesson: id, self: r.self ?? null, recognised: r.heard != null });
      if (item.ex.type === 'write') {
        logEvent({ type: 'writing', lesson: id });
        store.put('writing', { id: `lesson:${id}:${item.ex.id}`, source: 'lesson', lesson: id, exercise: item.ex.id, level: lesson.level, drafts: [{ text: r.response, at: new Date().toISOString() }], updated: new Date().toISOString() });
      }
    }
    saveResume();
    // Speaking goes straight on: what was recognised is already on screen and there is nothing to grade.
    if (ctl.speak) { next(); return; }
    // After a second try the learner cannot count the answer themselves (r4 LF-2): the note before it pointed the
    // way, so the model answer is shown as the answer.
    if (wasSecond && r.model) checked = { ...r, noSelf: true };
    showResult(checked);
  }

  // The result footer: the verdict, with the reading score per question (LF-9), a neutral title after "I don't
  // know" (LF-6) and the lesson's Hebrew-speaker pitfall for this kind of mistake under "Why?" (LF-8).
  function showResult(r) {
    const item = queue[qi];
    const foot = $('#pfoot', el);
    const perQ = !r.correct && ['read', 'categorize'].includes(item.ex.type) && (r.score ?? 0) >= 0.6 - 1e-9;
    // A lesson writing draft saved below its target is amber, not done (r4 LF-14, contract (e) with EX-7).
    foot.className = `player-foot ${r.unheard ? 'shown' : r.graded === false ? (r.short ? 'almost' : 'ok') : r.correct ? (r.almost ? 'almost' : 'ok') : r.dontKnow ? 'shown' : (r.model || perQ) ? 'almost' : 'bad'}`;
    render(foot, footer('result'));
    if (r.noSelf) $('.self-judge', foot)?.remove();
    const title = $('.verdict-title', foot);
    if (title && r.dontKnow) render(title, html`${icon('info', { size: 18 })} ${tt('הנה התשובה', 'Here is the answer')}`);
    if (title && r.unheard) {
      render(title, html`${icon('info', { size: 18 })} ${tt('נשמע? לא נספר', 'Heard? Not counted')}`);
      $('.verdict-body', foot)?.insertAdjacentHTML('afterbegin', String(html`<p class="muted" data-unheard-note>${tt('בלי קול אי אפשר לבדוק הקשבה, ולכן התרגיל הזה לא נכנס לציון.', 'Listening cannot be checked without sound, so this exercise does not count toward the score.')}</p>`));
    }
    if (title && perQ) {
      const [right, total] = String(r.response || '').split('/').map(Number);
      if (right >= 0 && total > 0) render(title, html`${icon('info', { size: 18 })} ${item.ex.type === 'read' ? tt(`${right} מתוך ${total} נכונות`, `${right} of ${total} right`) : tt(`${right} מתוך ${total} במקום הנכון`, `${right} of ${total} in the right place`)}`);
    }
    if (!r.correct && r.error_type) addPitfallWhy(foot, r.error_type);
    fitFooter(foot);
    $('[data-next]', el)?.focus();
  }
  function addPitfallWhy(foot, type) {
    if (hebrewSupport() === 'off') return;
    const p = (lesson.hebrew_pitfalls || []).find((x) => x.error_type === type);
    if (!p) return;
    let why = $('details.why > div', foot);
    if (!why) {
      $('.verdict-body', foot)?.insertAdjacentHTML('beforeend', String(html`<details class="why"><summary>${tt('למה?', 'Why?')}</summary><div class="stack-sm"></div></details>`));
      why = $('details.why > div', foot);
    }
    why?.insertAdjacentHTML('beforeend', String(html`<div class="pitfall-why"><p class="pitfall-head small">${icon('flag', { size: 14 })} ${tt('מלכודת לדוברי עברית', 'A trap for Hebrew speakers')}</p>${bi(p)}</div>`));
  }

  // Fix it yourself (LF-6): only the targeted note (or the hint), the learner's text kept, and two ways on.
  function showSecondTry(r) {
    const item = queue[qi];
    const foot = $('#pfoot', el);
    const e = r.error_type && errors?.get(r.error_type);
    // The note never hands over the answer (r4 LF-2): retrySafe drops a part that quotes it or names a word of it
    // the learner has not written, and only the support language is shown, not the English that repeats it.
    const note = secondTryNote(r, item.ex, e);
    // A dictation's marked sentence spells out the key's words, so it stays hidden while the learner tries again;
    // "Show the answer" brings it back, and "Try again" (ctl.reopen) removes it.
    el.querySelectorAll('#exroot .word-diff').forEach((d) => { d.hidden = true; });
    foot.className = 'player-foot almost';
    render(foot, html`<div class="inner"><div class="verdict" role="status"><div class="verdict-title">${icon('info', { size: 18 })} ${tt('עוד לא. אפשר לתקן בעצמכם', 'Not yet. You can fix it yourself')}</div><div class="verdict-body"><p>${note}</p></div></div>
      <button type="button" class="key ghost" data-show-answer>${tt('להציג את התשובה', 'Show the answer')}</button><button type="button" class="key enter" data-try-again>${tt('לנסות שוב', 'Try again')} <span class="kbd">Enter</span></button></div>`);
    fitFooter(foot);
    $('[data-try-again]', el)?.focus();
  }
  function tryAgain() {
    secondTry = true;
    ctl.reopen();
    const foot = $('#pfoot', el);
    foot.className = 'player-foot';
    render(foot, footer('answer'));
    if (ctl.ready()) $('[data-check]', el).disabled = false;
    const a = document.activeElement;
    if (!a || a === document.body || !$('#exroot', el).contains(a)) $('#exroot :is(input, textarea):not([readonly])', el)?.focus();
  }
  function showAnswer() {
    const item = queue[qi];
    if (!item.retry) queue.push({ ex: item.ex, retry: true });
    saveResume();
    el.querySelectorAll('#exroot .word-diff').forEach((d) => { d.hidden = false; });
    showResult(checked);
    frameCounter();
  }

  // "My answer is also correct" on an open rewrite (B1+): counts as right, logged as self-judged, no retry.
  function selfJudge() {
    const item = queue[qi];
    if (!checked?.model || checked.correct || checked.noSelf) return;
    checked = { ...checked, correct: true, self_judged: true };
    if (!item.retry && firstTry.has(item.ex.id)) { firstTry.set(item.ex.id, answerPoints({ correct: true }, hintUsed, item.ex.type)); judged.add(item.ex.id); }
    if (lastAttempt) store.put('attempts', { ...lastAttempt, correct: true, score: 1, error_type: null, self_judged: true });
    const retryAt = queue.findIndex((q, k) => k > qi && q.retry && q.ex.id === item.ex.id);
    if (retryAt > qi) queue.splice(retryAt, 1);
    logEvent({ type: 'self-judged', lesson: id, exercise: item.ex.id, response: String(checked.response || '').slice(0, 300) });
    saveResume();
    const foot = $('#pfoot', el);
    foot.className = 'player-foot ok';
    render(foot, html`<div class="inner"><div class="verdict" role="status">${selfJudgedHtml(checked)}</div><button type="button" class="key enter" data-next>${t('continue')} <span class="kbd">Enter</span></button></div>`);
    fitFooter(foot);
    frameCounter();
    $('[data-next]', el)?.focus();
  }
  // Redraw only the step counter (the queue changed under the current exercise).
  function frameCounter() {
    const c = $('.step-count', el);
    if (c) c.textContent = stepLabel(stepInfo(queue, qi));
  }

  // Leaving mid-lesson keeps the place (research D, D17/D25): the queue, position and first-try scores.
  function saveResume(at = qi + 1) {
    const cur = progressOf(id) || { id, level: lesson.level, status: 'started' };
    const c = { ...cur, resume: { qi: at, queue: queue.map((q) => [q.ex.id, q.retry]), first: [...firstTry], judged: [...judged], unheard: [...unheard], missed: missedMode, since: runSince, at: new Date().toISOString() } };
    delete c.learn_step;
    store.put('progress', c);
  }
  function restoreResume(r) {
    const byId = new Map(lesson.exercises.map((e) => [e.id, e]));
    queue.length = 0;
    for (const [eid, retry] of r.queue) if (byId.has(eid)) queue.push({ ex: byId.get(eid), retry });
    firstTry.clear();
    for (const [k, v] of r.first) firstTry.set(k, v);
    judged.clear();
    for (const k of r.judged || []) judged.add(k);
    unheard.clear();
    for (const k of r.unheard || []) unheard.add(k);
    qi = Math.min(r.qi, queue.length);
    missedMode = Boolean(r.missed);
    runSince = r.since || runSince;
  }
  // Start again from the first exercise; the first tries already given stay first tries (LF-1).
  function restart() {
    queue.length = 0;
    for (const ex of lesson.exercises) queue.push({ ex, retry: false });
    qi = 0;
    missedMode = false;
    saveResume(0);
    learnStep = 0;
    go('learn');
  }
  // Only the missed exercises, with the earlier first-try points of the others kept.
  function startMissed(m) {
    const byId = new Map(lesson.exercises.map((e) => [e.id, e]));
    const ids = m.ids.filter((x) => byId.has(x));
    if (!ids.length) return false;
    queue.length = 0;
    for (const x of ids) queue.push({ ex: byId.get(x), retry: false });
    firstTry.clear();
    for (const [k, v] of m.first) if (!ids.includes(k)) firstTry.set(k, v);
    unheard.clear();
    for (const k of m.unheard || []) if (!ids.includes(k)) unheard.add(k);
    qi = 0;
    missedMode = true;
    return true;
  }

  // The learner's own mistakes in this run (LF-8, r4 LF-4): for a typed answer only the words that changed, with a
  // little context; for a choice what was chosen and the answer, not a "correction"; a note that explains this
  // mistake; and "You fixed it yourself" for an item put right on its second try (its score is unchanged).
  function mistakesBox() {
    const seen = new Map();
    const mine = model().attempts.filter((a) => a.lesson === id && a.source === 'lesson' && a.score !== null && a.skill !== 'speaking' && a.at >= runSince)
      .sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
    for (const a of mine) if (!a.correct && !seen.has(a.exercise)) seen.set(a.exercise, a);
    // Fixed on the second try: the very next answer, to the same exercise, was right (not a retry after the answer
    // was shown).
    const fixedLater = (a) => { const b = mine[mine.indexOf(a) + 1]; return b && b.exercise === a.exercise && b.correct ? b : null; };
    const items = lesson.exercises.filter((e) => seen.has(e.id)).map((e) => ({ e, a: seen.get(e.id), m: mistakeNote(e, seen.get(e.id).response, seen.get(e.id)), fixed: fixedLater(seen.get(e.id)) }));
    if (!items.length) return '';
    const shown = items.slice(0, 4);
    const verb = (e) => (['mcq', 'listen'].includes(e.type) ? tt('בחרתם:', 'You chose:') : e.type === 'order' ? tt('סידרתם:', 'You built:') : tt('כתבתם:', 'You wrote:'));
    const general = (a) => { const x = a.error_type && errors.get(a.error_type); return x && hebrewSupport() !== 'off' ? html`<p class="small"><span class="tag warn">${tt(x.name_he, x.name_en)}</span> <span lang="he" dir="rtl" class="muted">${isolateLatin(x.why_he)}</span></p>` : x ? html`<p class="small"><span class="tag warn">${tt(x.name_he, x.name_en)}</span></p>` : ''; };
    const ui = html`lang="${tt('he', 'en')}" dir="${tt('rtl', 'ltr')}"`;
    const diffHtml = (d) => d.map((p, k) => html`${k ? ' ' : ''}${p.type === 'gap' ? html`<span class="m-gap" aria-hidden="true">…</span>`
      : p.type === 'del' ? html`<del class="m-del"><span class="sr-only" ${ui}>${tt('במקום: ', 'instead of: ')}</span>${p.text}</del>`
        : p.type === 'add' ? html`${d[k - 1]?.type === 'del' ? html`<span class="m-arrow" aria-hidden="true">→</span> ` : ''}<ins class="m-add"><span class="sr-only" ${ui}>${tt('נכון: ', 'right: ')}</span>${p.text}</ins>`
          : html`<span class="m-same">${p.text}</span>`}`);
    const line = ({ e, m }) => {
      if (m.choice && m.pair) return html`<p class="small mistake-line mistake-choice">${tt('בחרתם:', 'You chose:')} <span class="m-chose" lang="en" dir="ltr">${m.pair[0]}</span> · ${tt('התשובה:', 'The answer:')} <span class="m-answer" lang="en" dir="ltr">${m.pair[1]}</span></p>`;
      if (m.diff) return html`<p class="small mistake-line">${verb(e)} <span class="mistake-pair mistake-diff" lang="en" dir="ltr">${diffHtml(m.diff)}</span></p>`;
      if (m.pair) return html`<p class="small mistake-line">${verb(e)} <span class="mistake-pair" lang="en" dir="ltr"><span class="m-wrong">${m.pair[0]}</span> <span aria-hidden="true">→</span><span class="sr-only">${tt(', ובצורה הנכונה: ', ', and correctly: ')}</span> <span class="m-right">${m.pair[1]}</span></span></p>`;
      return html`<div class="small">${bi(e.prompt)}</div>`;
    };
    return html`<div class="panel flat stack-sm" data-mistakes><h2 class="small">${tt('כדאי לשים לב', 'Worth watching')}</h2>
      <ul class="mistake-list">${shown.map((x) => html`<li class="stack-sm" ${x.fixed ? html`data-fixed` : ''}>
        ${x.fixed ? html`<p class="small mistake-fixed"><span class="tag fixed-tag">${icon('check', { size: 14 })} ${tt('תיקנתם בעצמכם', 'You fixed it yourself')}</span>${!x.m.choice && x.fixed.response ? html` <span class="m-final" lang="en" dir="ltr">${x.e.type === 'gap' ? fillGaps(x.e.text, String(x.fixed.response).split(' | ')) : x.fixed.response}</span>` : ''}</p>` : line(x)}
        ${x.m.note ? html`<div class="small muted">${bi(x.m.note)}</div>` : general(x.a)}
      </li>`)}</ul>
      ${items.length > shown.length ? html`<p class="xsmall faint">${tt(`ועוד ${items.length - shown.length} בתרגול של הטעויות.`, `And ${items.length - shown.length} more in the practice of your mistakes.`)}</p>` : ''}
      <p class="xsmall faint">${tt('אם זה יחזור, Lucid יוסיף תרגול ממוקד לתוכנית היומית.', 'If this keeps happening, Lucid adds a short targeted drill to your daily plan.')}</p></div>`;
  }

  function showReview() {
    const score = lessonScore(firstTry, lesson, unheard);
    const pass = lesson.completion?.pass_score ?? 0.7;
    const passed = isPass(score, pass);
    const kind = reviewTitle(score, pass);
    const credit = partialCredit(firstTry);
    const wasDone = progressOf(id)?.status === 'completed';
    finishLesson(lesson, { score, passed });
    const missed = passed ? [] : missedIds(firstTry, lesson, unheard);
    // The finished run replaces the saved place; a miss keeps the list of exercises to redo.
    const cur = store.get('progress', id);
    if (cur) { const c = { ...cur }; delete c.resume; delete c.missed; delete c.learn_step; if (missed.length) c.missed = { ids: missed, first: [...firstTry], unheard: [...unheard], at: new Date().toISOString() }; store.put('progress', c); }
    const missedMin = missedMinutes(lesson, missed.length);
    const pctText = scorePercent(score, passed);
    const nJudged = [...judged].filter((x) => firstTry.has(x)).length;
    const nUnheard = [...unheard].filter((x) => !firstTry.has(x)).length;
    // The day as Today sees it (LF-1): done, or the next block of the plan with its own route.
    const day = passed ? dayState() : null;
    // The words that really entered review today, as Today's review row counts them (LF-1); the rest wait for
    // the next days at the daily new-word limit.
    const cards = passed && !wasDone ? allCards() : [];
    const added = wordsAddedToday(cards, id);
    const queued = cards.filter((c) => c.kind === 'meaning' && c.ref?.lesson === id && todayKey(new Date(c.created_at)) > todayKey()).length;
    stage = 'review';
    const missedKey = (cls) => html`<a class="key ${cls}" href="#/lesson/${id}?stage=missed&t=${Date.now()}" data-retry>${tt(`${missed.length === 1 ? 'לתרגל רק את הטעות' : `לתרגל רק את ${missed.length} הטעויות`} · כ-${missedMin} דק׳`, `Practise just the ${missed.length === 1 ? 'one' : missed.length} I missed · about ${missedMin} min`)}${cls === 'enter' ? html` <span class="kbd">Enter</span>` : ''}</a>`;
    const wordsBanner = added || queued ? html`<p class="banner small" data-words-added>${icon('layers', { size: 18 })}<span>${added
      ? tt(`${added === 1 ? 'מילה אחת מהשיעור נכנסה היום' : `${added} מילים מהשיעור נכנסו היום`} לחזרה המרווחת. הן יחזרו בזמן שמתאים לזיכרון.`, `${added === 1 ? 'One word' : `${added} words`} from this lesson joined your spaced review today. They come back when the timing suits your memory.`)
      : tt('המילים של השיעור ייכנסו לחזרה המרווחת בימים הקרובים.', 'This lesson\'s words join your spaced review over the next days.')}${queued ? tt(` ${queued === 1 ? 'מילה אחת נוספת תתחיל' : `עוד ${queued} יתחילו`} בימים הקרובים, כי המכסה היומית מלאה.`, ` ${queued === 1 ? 'One more starts' : `${queued} more start`} over the next days, as today's quota is full.`) : ''}</span></p>` : '';
    // The score line (LF-12): plural address; on a pass it is a quiet line after what was gained.
    const scoreText = missedMode
      ? tt(`עכשיו ${pctText}% מהתרגילים נכונים: התשובות הנכונות מהפעם הקודמת ועוד מה שתרגלתם עכשיו.`, `${pctText}% of the exercises are now right: your earlier right answers plus the ones you just redid.`)
      : passed
        ? tt(`עניתם נכון בניסיון הראשון על ${pctText}% מהתרגילים.`, `You got ${pctText}% right on the first try.`)
        : tt(`${pctText}% בניסיון הראשון. צריך ${Math.round(pass * 100)}% כדי להשלים.`, `${pctText}% on the first try. ${Math.round(pass * 100)}% completes the lesson.`);
    const advice = passed || !missed.length ? '' : kind === 'open'
      ? tt(' כדאי לקרוא שוב את ההסבר ואז לתרגל רק את מה שפספסתם. מה שעניתם נכון נשמר, ולא צריך לעשות אותו שוב.', ' It helps to read the explanation again, then practise only what you missed. What you got right is kept, and you need not do it again.')
      : tt(` אפשר לתרגל רק את ${missed.length === 1 ? 'התרגיל שפספסתם' : `${missed.length} התרגילים שפספסתם`}. מה שעניתם נכון נשמר, ולא צריך לעשות אותו שוב.`, ` You can practise just the ${missed.length === 1 ? 'one' : missed.length} you missed. What you got right is kept, and you need not do it again.`);
    const notes = html`${nJudged ? html`<p class="xsmall faint" data-judged-note>${nJudged === 1 ? tt('כולל תשובה אחת שסימנתם בעצמכם כנכונה.', 'Including one answer you marked as correct yourself.') : tt(`כולל ${nJudged} תשובות שסימנתם בעצמכם כנכונות.`, `Including ${nJudged} answers you marked as correct yourself.`)}</p>` : ''}
        ${!passed && (credit.hint || credit.slip) ? html`<p class="xsmall faint" data-credit-note>${[credit.hint && tt('תשובה נכונה אחרי רמז נספרת כשלושה רבעים.', 'A right answer after a hint counts as three quarters.'), credit.slip && tt('תשובה נכונה עם טעות כתיב קטנה נספרת כ-90%.', 'A right answer with a small spelling slip counts as 90%.')].filter(Boolean).join(' ')}</p>` : ''}
        ${scoredExercises(lesson).length < lesson.exercises.length ? html`<p class="xsmall faint">${tt('תרגילי דיבור וכתיבה הם תרגול ולא נספרים בציון.', 'Speaking and writing exercises are practice and do not count toward the score.')}</p>` : ''}
        ${nUnheard ? html`<p class="xsmall faint" data-unheard-count>${nUnheard === 1 ? tt('תרגיל האזנה אחד לא נספר, כי לא נשמע קול.', 'One listening exercise was not counted, as no sound played.') : tt(`${nUnheard} תרגילי האזנה לא נספרו, כי לא נשמע קול.`, `${nUnheard} listening exercises were not counted, as no sound played.`)}</p>` : ''}`;
    const keyPoints = html`<div class="panel flat stack-sm"><h2 class="small">${tt('מה לזכור', 'Key points')}</h2><ul class="point-list">${lesson.review.key_points.map((k) => html`<li class="point">${icon('check', { size: 18 })}<div class="grow">${bi(k)}</div></li>`)}</ul></div>`;
    const title = html`<h1 tabindex="-1">${kind === 'complete' ? tt('השיעור הושלם', 'Lesson complete') : kind === 'nearly' ? tt('כמעט שם', 'Nearly there') : tt('השיעור עוד פתוח', 'Not complete yet')}</h1>`;
    // A pass leads with what was gained (LF-12): the title, the words added to review, what to remember, and then
    // the first-try percentage as a quiet line. A miss leads with what is left to do.
    const body = passed
      ? html`<div class="stack-lg review-end">${title}${wordsBanner}${keyPoints}<div class="stack-sm review-score"><p class="small muted" data-score-line>${scoreText}</p>${notes}</div>${mistakesBox()}</div>`
      : html`<div class="stack-lg review-end"><div class="stack-sm">${title}<p class="muted" data-score-line>${scoreText}${advice}</p>${notes}</div>${keyPoints}${mistakesBox()}
        <p class="small muted later-line" data-later-line>${tt('אפשר גם לעצור כאן. השיעור מחכה במסלול, והתשובות שמורות.', 'You can also stop here. The lesson waits on your path, with your answers saved.')} <a href="#/today" data-later>${tt('להיום', 'To Today')}</a></p></div>`;
    const nextKey = (cls) => (nextPlan ? html`<a class="key ${cls}" href="#/lesson/${nextPlan.id}" data-next-lesson>${tt('לשיעור הבא', 'Next lesson')}${cls === 'enter' ? html` <span class="kbd">Enter</span>` : ''}</a>` : html`<a class="key ${cls}" href="#/path">${tt('למסלול', 'To the path')}</a>`);
    let foot;
    if (passed && day?.complete) {
      // The day is done (LF-1): the main key says so and goes to Today; an open first round of today's new words
      // is offered beside it as optional, never as "continue the plan".
      foot = html`${day.firstRecallOpen ? html`<a class="key ghost" href="#/review" data-first-recall>${tt('חזרה ראשונה על המילים · לא חובה', 'First round of the new words · optional')}</a>` : nextKey('ghost')}<span class="grow"></span><a class="key enter" href="#/today" data-day-done>${tt('סיימתם להיום · להיום', 'Done for today · To Today')} <span class="kbd">Enter</span></a>`;
    } else if (passed && day?.next && day.next.id !== 'learn') {
      // The plan goes on: the main key opens the next block itself, not Today.
      foot = html`${nextKey('ghost')}<span class="grow"></span><a class="key enter" href="#/${day.next.route || 'today'}" data-plan-next>${tt(`להמשיך בתוכנית: ${blockName(day.next)} · ${day.next.minutes} דק׳`, `Continue your plan: ${blockName(day.next)} · ${day.next.minutes} min`)} <span class="kbd">Enter</span></a>`;
    } else if (passed) {
      foot = html`<a class="key ghost" href="#/today">${tt('להיום', 'To Today')}</a><span class="grow"></span>${nextKey('enter')}`;
    } else if (missed.length) {
      // At most two keys (LF-9); "To Today" is the text link above the footer.
      foot = kind === 'open'
        ? html`<span class="grow"></span>${missedKey('ghost')}<a class="key enter" href="#/lesson/${id}?stage=relearn&t=${Date.now()}" data-relearn>${tt('לקרוא שוב את ההסבר ואז לתרגל', 'Read the explanation again, then practise')} <span class="kbd">Enter</span></a>`
        : html`<span class="grow"></span><a class="key ghost" href="#/lesson/${id}?stage=practice&t=${Date.now()}" data-retry-all>${tt('את כל התרגול מחדש', 'Practise everything again')}</a>${missedKey('enter')}`;
    } else {
      foot = html`<span class="grow"></span><a class="key enter" href="#/lesson/${id}?stage=practice&t=${Date.now()}" data-retry>${tt('לתרגל שוב', 'Practise again')} <span class="kbd">Enter</span></a>`;
    }
    frame(body, html`<div class="inner">${foot}</div>`);
  }

  // Every stage opens at its top, with focus on its heading (P-44); each exercise opens at the top too.
  function go(target) {
    stopSpeaking();
    ctl?.destroy?.(); ctl = null;
    const from = stage;
    stage = target;
    if (target === 'intro') showIntro();
    else if (target === 'learn') { if (from !== 'learn') learnStep = 0; showLearn(); }
    else if (target === 'part') showPartEnd();
    else if (target === 'practice') { if (qi >= queue.length) showReview(); else showExercise(); }
    window.scrollTo?.(0, 0);
    if (stage !== 'practice') $('h1[tabindex]', el)?.focus({ preventScroll: true });
  }
  function next() {
    const finished = queue[qi];
    qi++;
    if (!missedMode && partEnds(part, queue, qi, finished)) { part.shown = true; go('part'); return; }
    go('practice');
  }

  if (ctx.query.resume && progressOf(id)?.resume) { restoreResume(progressOf(id).resume); stage = 'practice'; }
  else if (ctx.query.stage === 'missed' && progressOf(id)?.missed) startMissed(progressOf(id).missed); // else: the whole practice
  else if (ctx.query.stage === 'relearn' && progressOf(id)?.missed && startMissed(progressOf(id).missed)) stage = 'learn';
  go(stage);

  const offs = [
    on(el, 'click', '[data-go]', (e, b) => go(b.dataset.go)),
    on(el, 'click', '[data-skip-learn]', () => go('practice')),
    on(el, 'click', '[data-missed]', () => { startMissed(progressOf(id).missed); go('practice'); }),
    on(el, 'click', '[data-part-go]', () => go('practice')),
    on(el, 'click', '[data-resume]', () => go('practice')),
    on(el, 'click', '[data-restart]', async () => {
      const ok = await confirmDialog({ title: tt('להתחיל את השיעור מההתחלה?', 'Start the lesson again?'), body: tt('התרגילים יתחילו מהראשון. התשובות שכבר נתתם בניסיון הראשון נשמרות ונספרות בציון.', 'The exercises start again from the first one. The first-try answers you already gave are kept and still count.'), confirm: tt('להתחיל מההתחלה', 'Start again') });
      if (ok) restart(); else $('[data-restart]', el)?.focus();
    }),
    on(el, 'click', '[data-learn-next]', () => learnMove(1)),
    on(el, 'click', '[data-learn-prev]', () => learnMove(-1)),
    on(el, 'click', '[data-ipa-toggle]', (e, b) => {
      const w = b.closest('.table-tools')?.nextElementSibling?.nextElementSibling;
      const show = b.getAttribute('aria-expanded') !== 'true';
      w?.classList.toggle('ipa-hidden', !show);
      b.setAttribute('aria-expanded', String(show));
      render(b, isolateLatin(show ? tt('להסתרת IPA', 'Hide IPA') : tt('להצגת IPA', 'Show IPA')));
      if (w) markWideTables(w.parentElement);
    }),
    on(el, 'click', '[data-he-switch]', () => {
      const value = !document.documentElement.dataset.heAll;
      heAllApply(value);
      heAllSave(lesson.level, value);
      el.querySelectorAll('[data-he-switch]').forEach((b) => b.setAttribute('aria-pressed', String(value)));
      // The Hebrew changes the explanation's length, so its steps are measured again.
      if (stage === 'learn') remeasure();
    }),
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) doCheck(); }),
    on(el, 'click', '[data-dontknow]', () => doCheck({ dontKnow: true })),
    on(el, 'click', '[data-try-again]', () => tryAgain()),
    on(el, 'click', '[data-show-answer]', () => showAnswer()),
    on(el, 'click', '[data-skip-speak]', () => { logEvent({ type: 'speaking-skipped', lesson: id, exercise: queue[qi].ex.id }); saveResume(); next(); }),
    on(el, 'click', '[data-self-judge]', () => selfJudge()),
    on(el, 'click', '[data-hint]', (e, b) => {
      hintUsed = true; b.remove();
      render($('#hintroot', el), html`<div class="hint-box">${icon('hint', { size: 18 })}<div>${bi(queue[qi].ex.hint)}</div></div>`);
      // The hint key is gone: focus goes back to the answer field, or to the prompt, never to the page.
      const field = $('#exroot :is(input, textarea):not([readonly])', el);
      if (field) field.focus(); else focusPrompt(exToken);
    }),
    on(el, 'click', '[data-next]', () => next()),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant, slow: 'saySlow' in b.dataset })),
    on(el, 'click', '[data-exit]', () => { ctx.navigate(exitTo); }),
  ];
  // Enter presses the footer's main key: Check, Continue, Next. On a play key, a word-bank chip, a self-rating
  // or a chosen option it does that too, instead of replaying or re-inserting (LF-5); on any other control it
  // does that control's own job. Ctrl/Cmd+Enter always presses the main key, also inside free writing.
  const PASS = '[data-say], [data-say-text], [data-say-tile], [data-chip], [data-self], [aria-pressed="true"]';
  const primaryKey = () => $('#pfoot [data-resume]', el) || $('#pfoot .key.enter:not([disabled])', el);
  const onKey = (e) => {
    if (e.target.closest?.('dialog')) return;
    if (stage === 'practice' && ctl?.onKey?.(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.isComposing) return;
    const btn = primaryKey();
    if (!btn) return;
    if (!(e.ctrlKey || e.metaKey)) {
      // A new line in free writing.
      if (e.target.tagName === 'TEXTAREA' && queue[qi]?.ex.type === 'write' && stage === 'practice' && !$('[data-next]', el)) return;
      const inExercise = stage === 'practice' && $('#exroot', el)?.contains(e.target);
      if (['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName) && e.target !== btn && !(inExercise && e.target.matches?.(PASS))) return;
    }
    e.preventDefault();
    btn.click();
  };
  document.addEventListener('keydown', onKey);
  const offResize = fitOnResize(el);
  return () => { offs.forEach((o) => o()); offResize(); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); stopSpeaking(); heAllApply(false); };
}
