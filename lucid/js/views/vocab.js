// Vocabulary notebook: every word from completed lessons, by level, one compact row each (word, Hebrew, next
// review) that opens to the same entry furniture each time (IPA, part of speech, Hebrew, definition, example,
// collocations, level) and its review status from the scheduler: New (never reviewed), Learning (memory stable for
// under 21 days), Known (21+).
import { html, render, on, $, $$ } from '../core/util.js';
import { collatorEn, relTime } from '../core/compat.js';
import { tt, t, uiLang, isolateLatin } from '../core/i18n.js';
import { icon, levelTag, emptyState, LEVEL_LABEL } from '../ui/components.js';
import { allCards, due, settings, model } from '../core/learner.js';
import { say, canSpeak } from '../core/speech.js';
import { taxonomyIndex } from '../core/content.js';
import { shortGloss, cardLevel } from '../core/srs.js';
import { LEVELS, levelIndex } from '../core/adaptive.js';

const KNOWN_DAYS = 21;
// "מילה אחת", never "1 מילים" (UX r4 PG-9).
const wordsN = (n) => (n === 1 ? tt('מילה אחת', '1 word') : tt(`${n} מילים`, `${n} words`));
const FILTERS = [['all', 'הכול', 'All'], ['due', 'לחזרה עכשיו', 'Due now'], ['learning', 'בלמידה', 'Learning'], ['known', 'בשליטה', 'Known']];
const wordKey = (id) => String(id).replace(/:(meaning|form)$/, '');
const fold = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-֑ͯ-ׇ]/g, '').trim();

export function wordStatus(card) {
  const f = card.fsrs || {};
  if (!f.reps) return 'new';
  return (f.stability || 0) >= KNOWN_DAYS ? 'known' : 'learning';
}

// "in 3 days" / "בעוד 3 ימים"; null when the date has passed (the word is due now). The formatter is the shared
// one for the UI language (util.relTime), not one per row; rtf lets a test pass its own.
export function relativeDue(iso, now = new Date(), rtf = relTime(uiLang() === 'he' ? 'he' : 'en')) {
  const ms = new Date(iso) - now;
  if (!(ms > 0)) return null;
  // Some browsers' Hebrew data write "בעוד דקה (1)"; the number in brackets repeats the word.
  const fmt = (n, unit) => rtf.format(n, unit).replace(/\s*\(\d+\)$/, '');
  const hours = ms / 3_600_000;
  if (hours < 1) return fmt(Math.max(1, Math.round(ms / 60_000)), 'minute');
  if (hours < 24) return fmt(Math.round(hours), 'hour');
  const days = Math.round(hours / 24);
  if (days < 45) return fmt(days, 'day');
  if (days < 365) return fmt(Math.round(days / 30), 'month');
  return fmt(Math.round(days / 365), 'year');
}

const STATUS = {
  new: { cls: '', he: 'חדשה', en: 'New' },
  learning: { cls: 'half', he: 'בלמידה', en: 'Learning' },
  known: { cls: 'done', he: 'בשליטה', en: 'Known' },
};

// a.p.word.localeCompare(b.p.word, 'en', { sensitivity: 'base' }) with one shared collator, not one per comparison.
export const byWord = (a, b) => collatorEn().compare(a.p.word, b.p.word);

export default async function vocab(el, ctx) {
  ctx.setTitle(t('nav.vocab'));
  let filter = FILTERS.some(([id]) => id === ctx.query.filter) ? ctx.query.filter : 'all';
  let query = '';
  const variant = settings().english_variant;
  let words = [];
  const ix = await taxonomyIndex().catch(() => null);
  const opened = new Set(); // words opened in place
  const levelOpen = new Map(); // level -> open, as the learner leaves it during this visit
  const showAll = new Set(); // levels showing every word

  function collect() {
    const now = new Date();
    const cards = allCards();
    // A word is due when any of its cards (meaning or form) is due; the next date is the earliest.
    const nextDue = new Map();
    for (const c of cards) {
      const k = wordKey(c.id);
      const d = c.fsrs?.due;
      if (d && (!nextDue.has(k) || d < nextDue.get(k))) nextDue.set(k, d);
    }
    words = cards.filter((c) => c.kind === 'meaning').map((c) => {
      const p = { word: c.ref?.word || '', ...(c.payload || {}) };
      const d = nextDue.get(wordKey(c.id)) || c.fsrs?.due;
      return { id: c.id, p, level: cardLevel(c), status: wordStatus(c), due: d, isDue: !d || new Date(d) <= now };
    }).filter((w) => w.p.word).sort(byWord);
    return { dueCount: due(now).length, now };
  }

  const counts = () => ({
    all: words.length,
    due: words.filter((w) => w.isDue).length,
    learning: words.filter((w) => w.status !== 'known').length,
    known: words.filter((w) => w.status === 'known').length,
  });
  const passes = (w) => (filter === 'due' ? w.isDue : filter === 'learning' ? w.status !== 'known' : filter === 'known' ? w.status === 'known' : true);
  const matches = (w) => {
    const q = fold(query);
    return !q || fold(w.p.word).includes(q) || fold(w.p.he).includes(q);
  };

  function cta(dueCount, now) {
    if (dueCount > 0) return html`<a class="key enter" href="#/review">${icon('layers')} ${tt(`חזרה על מילים (${dueCount})`, `Review due words (${dueCount})`)}</a>`;
    const next = words.map((w) => w.due).filter((d) => d && new Date(d) > now).sort()[0];
    return next ? html`<p class="small muted">${tt('אין כרגע מילים לחזרה. החזרה הבאה', 'Nothing to review right now. Next review')} ${relativeDue(next, now)}.</p>` : '';
  }

  // UX r3 PH-7: a word is one compact row (word · Hebrew · next review) that opens in place to show the rest of its
  // entry: IPA, part of speech, the full meaning, the definition, the example with a play key, and collocations.
  const domId = (w) => `vw-${w.id.replace(/[^a-z0-9]+/gi, '-')}`;
  function entry(w) {
    const { p } = w;
    const s = STATUS[w.status];
    const next = w.isDue ? null : relativeDue(w.due);
    const id = domId(w);
    const isOpen = opened.has(w.id);
    return html`<li class="vocab-item">
      <button type="button" class="vocab-row" data-word="${w.id}" aria-expanded="${String(isOpen)}" aria-controls="${id}">
        <span class="mark ${s.cls}" aria-hidden="true">${w.status === 'known' ? icon('check', { size: 12 }) : ''}</span>
        <span class="vocab-row-text"><span class="vocab-row-word" lang="en" dir="ltr">${p.word}</span>${p.he ? html`<span class="vocab-row-he" lang="he" dir="rtl">${isolateLatin(shortGloss(p.he))}</span>` : ''}</span>
        <span class="vocab-row-when small faint">${next || tt('לחזרה עכשיו', 'Due now')}</span>
        <span class="chev" aria-hidden="true">${icon('chevron', { size: 16 })}</span>
      </button>
      <div class="vocab-detail" id="${id}" ${isOpen ? '' : html`hidden`}>
        <div class="row small" style="gap:var(--s2)">${p.ipa ? html`<span class="entry-ipa" lang="en" dir="ltr">${p.ipa}</span>` : ''}${p.pos ? html`<span class="faint" lang="en" dir="ltr">${p.pos}</span>` : ''}${levelTag(p.level)}<span class="faint">${tt(s.he, s.en)}</span></div>
        ${p.he ? html`<div class="entry-he" lang="he" dir="rtl">${isolateLatin(p.he)}</div>` : ''}
        ${p.def ? html`<p class="small en-block" lang="en" dir="ltr">${p.def}</p>` : ''}
        ${p.example || canSpeak() ? html`<div class="vocab-ex">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${p.example || p.word}" aria-label="${tt('השמעה', 'Play')}: ${p.word}">${icon('volume', { size: 18 })}</button>` : ''}${p.example ? html`<p class="entry-ex en-block" lang="en" dir="ltr">${p.example}</p>` : ''}</div>` : ''}
        ${p.collocations?.length ? html`<div class="entry-foot"><span class="xsmall faint">${tt('צירופים נפוצים:', 'Common collocations:')}</span>${p.collocations.map((c) => html`<span class="tag" lang="en" dir="ltr">${c}</span>`)}</div>` : ''}
      </div>
    </li>`;
  }

  // Words by level, in folds: the learner's level (or the nearest level below it that has words) first and open,
  // then the levels above, then the easier ones. While searching, every level with a match is open.
  function levelGroups(shown) {
    const groups = LEVELS.map((level) => ({ level, words: shown.filter((w) => w.level === level) })).filter((g) => g.words.length);
    const other = shown.filter((w) => !LEVELS.includes(w.level));
    if (other.length) groups.push({ level: 'other', words: other });
    const ci = levelIndex(model().courseLevel);
    const below = groups.filter((g) => g.level !== 'other' && levelIndex(g.level) <= ci);
    const rec = below.length ? below[below.length - 1].level : groups[0]?.level;
    const ri = rec && rec !== 'other' ? levelIndex(rec) : -1;
    const rank = (g) => (g.level === 'other' ? 99 : levelIndex(g.level) >= ri ? levelIndex(g.level) - ri : 50 + ri - levelIndex(g.level));
    return { groups: groups.sort((a, b) => rank(a) - rank(b)), rec };
  }
  const BATCH = 60;

  function drawFilters() {
    const n = counts();
    $$('[data-filter]', el).forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
      const c = $('.num', b);
      if (c) c.textContent = n[b.dataset.filter];
    });
  }

  function drawList() {
    const shown = words.filter((w) => passes(w) && matches(w));
    const countEl = $('#vocab-count', el);
    if (countEl) countEl.textContent = shown.length === words.length ? wordsN(words.length) : tt(`מוצגות ${shown.length} מתוך ${words.length} מילים`, `Showing ${shown.length} of ${words.length} words`);
    const { groups, rec } = levelGroups(shown);
    render($('#vocab-list', el), shown.length
      ? html`<div class="stack-sm">${groups.map((g) => {
        const isOpen = query ? true : levelOpen.has(g.level) ? levelOpen.get(g.level) : g.level === rec;
        const meta = g.level === 'other' ? null : ix?.level.get(g.level);
        const dueN = g.words.filter((w) => w.isDue).length;
        // A long level shows its first words, and the rest on request, so the page stays short (PH-7).
        const limit = query || showAll.has(g.level) ? g.words.length : BATCH;
        return html`<details class="panel flat vocab-level" data-level="${g.level}" ${isOpen ? html`open` : ''}>
          <summary class="disclosure">
            <span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span>
            <h2 class="grow" id="vl-${g.level}" style="font-size:var(--t-lg)">${g.level === 'other' ? tt('מילים נוספות', 'Other words') : html`${LEVEL_LABEL[g.level]}${meta ? html` · ${tt(meta.name_he, meta.name_en)}` : ''}`}</h2>
            <span class="row small disclosure-meta" style="gap:var(--s2)">${g.level === rec && !query ? html`<span class="tag cobalt">${tt('הרמה שלכם', 'Your level')}</span>` : ''}<span class="faint num">${wordsN(g.words.length)}${dueN ? tt(` · ${dueN} לחזרה עכשיו`, ` · ${dueN} due now`) : ''}</span></span>
          </summary>
          <ul class="vocab-rows" aria-labelledby="vl-${g.level}">${g.words.slice(0, limit).map(entry)}</ul>
          ${limit < g.words.length ? html`<button type="button" class="key small ghost vocab-more" data-more="${g.level}">${tt(`הצגת עוד ${g.words.length - limit} מילים`, `Show ${g.words.length - limit} more words`)}</button>` : ''}
        </details>`;
      })}</div>`
      : emptyState({
        title: query ? tt('אין מילים שמתאימות לחיפוש', 'No words match your search') : tt('אין מילים בקבוצה הזו כרגע', 'No words in this group right now'),
        body: query ? tt('אפשר לחפש מילה באנגלית או את התרגום שלה בעברית.', 'Search for an English word or its Hebrew translation.') : '',
        action: html`<button type="button" class="key small" data-clear>${tt('הצגת כל המילים', 'Show all words')}</button>`,
      }));
  }

  function draw() {
    const { dueCount, now } = collect();
    if (!words.length) {
      render(el, html`
        <div class="page-head"><div><h1>${t('nav.vocab')}</h1><p>${tt('כל המילים מהשיעורים שהשלמתם, ומתי כל אחת חוזרת.', 'Every word from the lessons you have completed, and when each one comes back for review.')}</p></div></div>
        ${emptyState({
          title: tt('עוד אין מילים במחברת', 'No words in your notebook yet'),
          body: tt('מילים נכנסות למחברת כשמשלימים שיעור. כל שיעור מוסיף כמה מילים חדשות, והן חוזרות בדיוק לפני שהן נשכחות.', 'Words join your notebook when you complete a lesson. Each lesson adds a handful of new words, and they come back for review just before you would forget them.'),
          action: html`<a class="key enter" href="#/path">${tt('למסלול השיעורים', 'Go to your lessons')}</a>`,
        })}`);
      return;
    }
    const n = counts();
    render(el, html`
      <div class="page-head">
        <div><h1>${t('nav.vocab')}</h1><p>${tt('כל המילים מהשיעורים שהשלמתם, ומתי כל אחת חוזרת.', 'Every word from the lessons you have completed, and when each one comes back for review.')}</p></div>
        <div>${cta(dueCount, now)}</div>
      </div>
      <div class="list-tools">
        <label class="sr-only" for="vocab-q">${tt('חיפוש מילים', 'Search words')}</label>
        <input class="input" id="vocab-q" type="search" autocomplete="off" spellcheck="false" value="${query}" placeholder="${tt('חיפוש באנגלית או בעברית', 'Search in English or Hebrew')}">
        <div class="seg vocab-filters" role="group" aria-label="${tt('סינון לפי מצב', 'Filter by status')}">${FILTERS.map(([id, he, en]) => html`<button type="button" data-filter="${id}" aria-pressed="${String(filter === id)}">${tt(he, en)} <span class="num">${n[id]}</span></button>`)}</div>
      </div>
      <p class="small faint" id="vocab-count" aria-live="polite" style="margin-block-end:var(--s3)"></p>
      <div id="vocab-list"></div>
      <p class="xsmall faint" style="margin-block-start:var(--s5)">${tt(`״ידועה״: הזיכרון של המילה יציב לפחות ${KNOWN_DAYS} יום לפי מודל החזרה. ״בלמידה״: פחות מזה. ״חדשה״: עוד לא חזרתם עליה.`, `Known: the word's memory is stable for at least ${KNOWN_DAYS} days by the review model. Learning: less than that. New: not reviewed yet.`)}</p>`);
    drawList();
  }

  draw();
  ctx.watch(['cards'], draw);
  const offs = [
    on(el, 'input', '#vocab-q', (e, i) => { query = i.value; drawList(); }),
    on(el, 'click', '[data-filter]', (e, b) => { filter = b.dataset.filter; drawFilters(); drawList(); }),
    on(el, 'click', '[data-clear]', () => { query = ''; filter = 'all'; const i = $('#vocab-q', el); if (i) { i.value = ''; i.focus(); } drawFilters(); drawList(); }),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant })),
    // A row opens and closes in place (a button, so Enter and Space toggle it too); the focus stays on it.
    on(el, 'click', '[data-word]', (e, b) => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      if (open) opened.add(b.dataset.word); else opened.delete(b.dataset.word);
      b.setAttribute('aria-expanded', String(open));
      const d = document.getElementById(b.getAttribute('aria-controls'));
      if (d) d.hidden = !open;
    }),
    on(el, 'click', '[data-more]', (e, b) => {
      const level = b.dataset.more;
      const before = $$(`details[data-level="${level}"] .vocab-row`, el).length;
      showAll.add(level); drawList();
      $$(`details[data-level="${level}"] .vocab-row`, el)[before]?.focus();
    }),
    on(el, 'toggle', 'details[data-level]', (e, d) => { if (e.target === d && !query) levelOpen.set(d.dataset.level, d.open); }, true),
  ];
  return () => offs.forEach((o) => o());
}
