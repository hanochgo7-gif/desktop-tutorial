// Vocabulary notebook: every word from completed lessons, with the same entry furniture each time
// (word, IPA, part of speech, Hebrew, definition, example, collocations, level) and its review status
// from the scheduler: New (never reviewed), Learning (memory stable for under 21 days), Known (21+).
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, t, uiLang } from '../core/i18n.js';
import { icon, levelTag, emptyState } from '../ui/components.js';
import { allCards, due, settings } from '../core/learner.js';
import { say, canSpeak } from '../core/speech.js';

const KNOWN_DAYS = 21;
const FILTERS = [['all', 'הכול', 'All'], ['due', 'לחזרה עכשיו', 'Due now'], ['learning', 'בלמידה', 'Learning'], ['known', 'ידועות', 'Known']];
const wordKey = (id) => String(id).replace(/:(meaning|form)$/, '');
const fold = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-֑ͯ-ׇ]/g, '').trim();

export function wordStatus(card) {
  const f = card.fsrs || {};
  if (!f.reps) return 'new';
  return (f.stability || 0) >= KNOWN_DAYS ? 'known' : 'learning';
}

// "in 3 days" / "בעוד 3 ימים"; null when the date has passed (the word is due now).
export function relativeDue(iso, now = new Date()) {
  const ms = new Date(iso) - now;
  if (!(ms > 0)) return null;
  const rtf = new Intl.RelativeTimeFormat(uiLang() === 'he' ? 'he' : 'en', { numeric: 'auto' });
  const hours = ms / 3_600_000;
  if (hours < 1) return rtf.format(Math.max(1, Math.round(ms / 60_000)), 'minute');
  if (hours < 24) return rtf.format(Math.round(hours), 'hour');
  const days = Math.round(hours / 24);
  if (days < 45) return rtf.format(days, 'day');
  if (days < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

const STATUS = {
  new: { cls: '', he: 'חדשה', en: 'New' },
  learning: { cls: 'half', he: 'בלמידה', en: 'Learning' },
  known: { cls: 'done', he: 'ידועה', en: 'Known' },
};

export default async function vocab(el, ctx) {
  ctx.setTitle(t('nav.vocab'));
  let filter = FILTERS.some(([id]) => id === ctx.query.filter) ? ctx.query.filter : 'all';
  let query = '';
  const variant = settings().english_variant;
  let words = [];

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
      return { id: c.id, p, status: wordStatus(c), due: d, isDue: !d || new Date(d) <= now };
    }).filter((w) => w.p.word).sort((a, b) => a.p.word.localeCompare(b.p.word, 'en', { sensitivity: 'base' }));
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

  function entry(w) {
    const { p } = w;
    const s = STATUS[w.status];
    const next = w.isDue ? null : relativeDue(w.due);
    const hid = `w-${w.id.replace(/[^a-z0-9]+/gi, '-')}`;
    return html`<article class="entry" aria-labelledby="${hid}">
      <div class="entry-head">
        <div class="row" style="align-items:baseline;gap:var(--s2)">
          <h2 class="entry-word" id="${hid}" lang="en" dir="ltr">${p.word}</h2>
          ${p.ipa ? html`<span class="entry-ipa" lang="en" dir="ltr">${p.ipa}</span>` : ''}
        </div>
        ${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${p.word}" aria-label="${tt('השמעה', 'Play')}: ${p.word}">${icon('volume', { size: 18 })}</button>` : ''}
      </div>
      <div class="row small">${p.pos ? html`<span class="faint" lang="en" dir="ltr">${p.pos}</span>` : ''}${levelTag(p.level)}</div>
      ${p.he ? html`<div class="entry-he" lang="he" dir="rtl">${p.he}</div>` : ''}
      ${p.def ? html`<p class="small" lang="en" dir="ltr">${p.def}</p>` : ''}
      ${p.example ? html`<p class="entry-ex" lang="en" dir="ltr">${p.example}</p>` : ''}
      ${p.collocations?.length ? html`<div class="entry-foot"><span class="xsmall faint">${tt('צירופים נפוצים:', 'Common collocations:')}</span>${p.collocations.map((c) => html`<span class="tag" lang="en" dir="ltr">${c}</span>`)}</div>` : ''}
      <div class="entry-foot small"><span class="mark ${s.cls}" aria-hidden="true">${w.status === 'known' ? icon('check', { size: 12 }) : ''}</span><span>${tt(s.he, s.en)}</span>
        <span class="faint">· ${next ? html`${tt('חזרה הבאה', 'Next review')} ${next}` : tt('לחזרה עכשיו', 'Due for review now')}</span></div>
    </article>`;
  }

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
    if (countEl) countEl.textContent = shown.length === words.length ? tt(`${words.length} מילים`, `${words.length} words`) : tt(`מוצגות ${shown.length} מתוך ${words.length} מילים`, `Showing ${shown.length} of ${words.length} words`);
    render($('#vocab-list', el), shown.length
      ? html`<div class="grid-2">${shown.map(entry)}</div>`
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
        <div class="page-head"><div><h1>${t('nav.vocab')}</h1><p>${tt('כל המילים מהשיעורים שהשלמתם, ומתי כל אחת חוזרת לחזרה.', 'Every word from the lessons you have completed, and when each one comes back for review.')}</p></div></div>
        ${emptyState({
          title: tt('עוד אין מילים במחברת', 'No words in your notebook yet'),
          body: tt('מילים נכנסות למחברת כשמשלימים שיעור. כל שיעור מוסיף כמה מילים חדשות, והן חוזרות לחזרה בדיוק לפני שהן נשכחות.', 'Words join your notebook when you complete a lesson. Each lesson adds a handful of new words, and they come back for review just before you would forget them.'),
          action: html`<a class="key enter" href="#/path">${tt('למסלול השיעורים', 'Go to your lessons')}</a>`,
        })}`);
      return;
    }
    const n = counts();
    render(el, html`
      <div class="page-head">
        <div><h1>${t('nav.vocab')}</h1><p>${tt('כל המילים מהשיעורים שהשלמתם, ומתי כל אחת חוזרת לחזרה.', 'Every word from the lessons you have completed, and when each one comes back for review.')}</p></div>
        <div>${cta(dueCount, now)}</div>
      </div>
      <div class="list-tools">
        <label class="sr-only" for="vocab-q">${tt('חיפוש מילים', 'Search words')}</label>
        <input class="input" id="vocab-q" type="search" autocomplete="off" spellcheck="false" value="${query}" placeholder="${tt('חיפוש באנגלית או בעברית', 'Search in English or Hebrew')}">
        <div class="seg" role="group" aria-label="${tt('סינון לפי מצב', 'Filter by status')}">${FILTERS.map(([id, he, en]) => html`<button type="button" data-filter="${id}" aria-pressed="${filter === id}">${tt(he, en)} <span class="num faint">${n[id]}</span></button>`)}</div>
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
  ];
  return () => offs.forEach((o) => o());
}
