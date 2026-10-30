// Expressions dictionary (Real-life track): informal English with the same furniture for every entry.
// Collapsed: the term, its Hebrew meaning, formality, region and level. Expanded in place: meaning in
// both languages, when people use it, an example conversation, common mistakes, when not to use it,
// a warning where one is needed, and related expressions.
import { html, render, on, $, $$ } from '../core/util.js';
import { tt, t, bi, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState } from '../ui/components.js';
import { settings } from '../core/learner.js';
import { say, canSpeak, stopSpeaking } from '../core/speech.js';
import { hebrewReveal } from '../ui/center.js';

const FORMALITY = [['all', 'הכול', 'All'], ['very informal', 'לא רשמי מאוד', 'Very informal'], ['informal', 'לא רשמי', 'Informal'], ['neutral', 'ניטרלי', 'Neutral']];
const REGIONS = [['all', 'הכול', 'All'], ['US', 'ארה״ב', 'US'], ['UK', 'בריטניה', 'UK']];
const REGION_LABEL = { US: ['ארה״ב', 'US'], UK: ['בריטניה', 'UK'], both: ['ארה״ב ובריטניה', 'US and UK'], AU: ['אוסטרליה', 'Australia'] };
const fold = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-֑ͯ-ׇ]/g, '').trim();
const domId = (id) => `xp-${String(id).replace(/[^a-z0-9_-]+/gi, '-')}`;
const voiceFor = (region) => (region === 'UK' ? 'UK' : region === 'US' ? 'US' : undefined);

function formalityTag(f) {
  const l = FORMALITY.find((x) => x[0] === f);
  const cls = f === 'very informal' ? 'warn' : f === 'informal' ? 'cobalt' : '';
  return html`<span class="tag ${cls}">${l ? tt(l[1], l[2]) : f}</span>`;
}
function regionTag(r) {
  const l = REGION_LABEL[r];
  return l ? html`<span class="tag">${tt(l[0], l[1])}</span>` : '';
}

export default async function slang(el, ctx) {
  ctx.setTitle(t('nav.slang'));
  const data = await content.slang();
  const entries = (Array.isArray(data?.entries) ? data.entries : []).filter((x) => x?.id && x.term)
    .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const intro = tt('ביטויים שאנשים באמת אומרים: מה הם אומרים, מתי משתמשים בהם, ומתי עדיף לוותר עליהם.', 'Expressions people actually use: what they mean, when to use them, and when to leave them out.');

  if (!entries.length) {
    render(el, html`<div class="page-head"><div><h1>${t('nav.slang')}</h1><p>${intro}</p></div></div>
      ${emptyState({
        title: data ? tt('אין עדיין ביטויים במילון', 'No expressions in the dictionary yet') : tt('רשימת הביטויים לא נטענה', 'The expressions list did not load'),
        body: data ? tt('הביטויים יופיעו כאן ברגע שיתווספו. בינתיים אפשר לתרגל מצבים אמיתיים.', 'Expressions appear here as soon as they are added. Meanwhile, you can practise real-life situations.') : tt('נסו לרענן את הדף. בינתיים אפשר לתרגל מצבים אמיתיים באנגלית לחיים.', 'Try reloading the page. Meanwhile, you can practise real-life situations.'),
        action: html`<a class="key enter" href="#/real-life">${t('nav.reallife')}</a>`,
      })}`);
    return null;
  }

  const variant = settings().english_variant;
  const byKey = new Map();
  for (const x of entries) { byKey.set(fold(x.id), x); byKey.set(fold(x.term), x); }
  let query = ctx.query.q || '';
  let formality = 'all';
  let region = 'all';
  const open = new Set(ctx.query.open && byKey.has(fold(ctx.query.open)) ? [byKey.get(fold(ctx.query.open)).id] : []);

  const matches = (x) => {
    if (formality !== 'all' && x.formality !== formality) return false;
    if (region !== 'all' && x.region !== region && x.region !== 'both') return false;
    const q = fold(query);
    return !q || fold(x.term).includes(q) || fold(x.meaning_he).includes(q) || fold(x.meaning_en).includes(q);
  };

  const playBtn = (text, region, label) => (canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${text}" data-variant="${voiceFor(region) || ''}" aria-label="${label}">${icon('volume', { size: 18 })}</button>` : '');

  function details(x) {
    const related = (x.related || []).map((r) => ({ r, hit: byKey.get(fold(r)) })).filter((o) => o.hit?.id !== x.id);
    return html`
      <section class="stack-sm">
        <h3 class="small">${tt('משמעות', 'Meaning')}</h3>
        <p lang="en" dir="ltr">${x.meaning_en}</p>
        <p class="entry-he" lang="he" dir="rtl">${isolateLatin(x.meaning_he)}</p>
      </section>
      ${x.usage ? html`<section class="stack-sm"><h3 class="small">${tt('מתי משתמשים בזה', 'When people use it')}</h3><p>${bi(x.usage)}</p></section>` : ''}
      ${x.example_dialogue?.length ? html`<section class="stack-sm"><h3 class="small">${tt('דוגמה לשיחה', 'Example conversation')}</h3>
        <div class="examples" lang="en" dir="ltr">${x.example_dialogue.map((line) => html`<div class="example">${playBtn(line.text, x.region, `${tt('השמעת השורה של', 'Play the line by')} ${line.speaker}`)}
          <div class="grow"><div class="xsmall faint">${line.speaker}</div><div>${line.text}</div></div></div>`)}</div></section>` : ''}
      ${x.mistakes?.length ? html`<section class="stack-sm"><h3 class="small">${tt('טעויות נפוצות', 'Common mistakes')}</h3>
        <ul class="stack-sm" style="margin:0;padding-inline-start:1.2rem">${x.mistakes.map((m) => html`<li>${bi(m)}</li>`)}</ul></section>` : ''}
      ${x.avoid_when ? html`<section class="stack-sm"><h3 class="small">${tt('מתי לא להשתמש בזה', 'When NOT to use it')}</h3><p>${bi(x.avoid_when)}</p></section>` : ''}
      ${x.warning ? html`<p class="banner warn">${icon('alert', { size: 18 })}<span>${bi(x.warning)}</span></p>` : ''}
      ${related.length ? html`<section class="stack-sm"><h3 class="small">${tt('ביטויים קרובים', 'Related expressions')}</h3>
        <div class="row">${related.map(({ r, hit }) => (hit
          ? html`<button type="button" class="key ghost small" data-goto="${hit.id}"><span lang="en" dir="ltr">${hit.term}</span></button>`
          : html`<span class="tag" lang="en" dir="ltr">${r}</span>`))}</div></section>` : ''}`;
  }

  function entry(x) {
    const isOpen = open.has(x.id);
    const pid = domId(x.id);
    return html`<article class="entry" data-entry="${x.id}">
      <div class="entry-head" style="align-items:center">
        <h2 class="grow" style="font-size:inherit;font-weight:400">
          <button type="button" class="disclosure" data-toggle="${x.id}" aria-expanded="${isOpen}" aria-controls="${pid}">
            <span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span>
            <span class="grow"><span style="display:block"><span class="entry-word" lang="en" dir="ltr">${x.term}</span></span>
              <span style="display:block"><span class="entry-he" lang="he" dir="rtl">${isolateLatin(x.meaning_he)}</span></span></span>
          </button>
        </h2>
        ${playBtn(x.term, x.region, `${tt('השמעה', 'Play')}: ${x.term}`)}
      </div>
      <div class="entry-foot">${formalityTag(x.formality)}${regionTag(x.region)}${levelTag(x.level)}</div>
      <div class="entry-more stack" id="${pid}" ${isOpen ? '' : html`hidden`}>${isOpen ? details(x) : ''}</div>
    </article>`;
  }

  function drawList() {
    const shown = entries.filter(matches);
    $('#xp-count', el).textContent = shown.length === entries.length ? tt(`${entries.length} ביטויים`, `${entries.length} expressions`) : tt(`מוצגים ${shown.length} מתוך ${entries.length} ביטויים`, `Showing ${shown.length} of ${entries.length} expressions`);
    render($('#xp-list', el), shown.length
      ? html`<div class="stack-sm">${shown.map(entry)}</div>`
      : emptyState({
        title: tt('אין ביטויים שמתאימים', 'No expressions match'),
        body: tt('אפשר לחפש ביטוי באנגלית או משמעות בעברית, או לנקות את הסינון.', 'Search for an English expression or a Hebrew meaning, or clear the filters.'),
        action: html`<button type="button" class="key small" data-clear>${tt('ניקוי החיפוש והסינון', 'Clear search and filters')}</button>`,
      }));
  }

  function drawFilters() {
    $$('[data-formality]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.formality === formality)));
    $$('[data-region]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.region === region)));
    const i = $('#xp-q', el);
    if (i && i.value !== query) i.value = query;
  }

  render(el, html`
    <div class="page-head"><div><h1>${t('nav.slang')}</h1><p>${intro}</p></div></div>
    <div class="list-tools">
      <label class="sr-only" for="xp-q">${tt('חיפוש ביטויים', 'Search expressions')}</label>
      <input class="input" id="xp-q" type="search" autocomplete="off" spellcheck="false" value="${query}" placeholder="${tt('ביטוי באנגלית או משמעות בעברית', 'English expression or Hebrew meaning')}">
      <div class="seg" role="group" aria-label="${tt('רמת רשמיות', 'Formality')}">${FORMALITY.map(([id, he, en]) => html`<button type="button" data-formality="${id}" aria-pressed="${formality === id}">${tt(he, en)}</button>`)}</div>
      <div class="seg" role="group" aria-label="${tt('איפה אומרים את זה', 'Where it is used')}">${REGIONS.map(([id, he, en]) => html`<button type="button" data-region="${id}" aria-pressed="${region === id}">${tt(he, en)}</button>`)}</div>
    </div>
    <p class="small faint" id="xp-count" aria-live="polite" style="margin-block-end:var(--s3)"></p>
    <div id="xp-list"></div>
    <p class="xsmall faint" style="margin-block-start:var(--s5)">${tt('״לא רשמי מאוד״ מתאים לחברים קרובים בלבד. כשלא בטוחים, עדיף ניסוח ניטרלי.', '"Very informal" is for close friends only. When in doubt, a neutral phrasing is safer.')}</p>`);
  drawList();

  function toggle(id, force) {
    const x = entries.find((e) => e.id === id);
    const art = $(`[data-entry="${CSS.escape(id)}"]`, el);
    if (!x || !art) return;
    const willOpen = force ?? !open.has(id);
    if (willOpen) open.add(id); else open.delete(id);
    const panel = $('.entry-more', art);
    $('[data-toggle]', art).setAttribute('aria-expanded', String(willOpen));
    if (willOpen) render(panel, details(x));
    panel.hidden = !willOpen;
  }

  const offs = [
    on(el, 'input', '#xp-q', (e, i) => { query = i.value; drawList(); }),
    on(el, 'click', '[data-formality]', (e, b) => { formality = b.dataset.formality; drawFilters(); drawList(); }),
    on(el, 'click', '[data-region]', (e, b) => { region = b.dataset.region; drawFilters(); drawList(); }),
    on(el, 'click', '[data-clear]', () => { query = ''; formality = 'all'; region = 'all'; drawFilters(); drawList(); $('#xp-q', el)?.focus(); }),
    on(el, 'click', '[data-toggle]', (e, b) => toggle(b.dataset.toggle)),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant: b.dataset.variant || variant })),
    on(el, 'click', '[data-goto]', (e, b) => {
      const id = b.dataset.goto;
      const target = entries.find((x) => x.id === id);
      if (target && !matches(target)) { query = ''; formality = 'all'; region = 'all'; drawFilters(); drawList(); }
      toggle(id, true);
      const art = $(`[data-entry="${CSS.escape(id)}"]`, el);
      art?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      $('[data-toggle]', art)?.focus({ preventScroll: true });
    }),
    hebrewReveal(el),
  ];
  return () => { offs.forEach((o) => o()); stopSpeaking(); };
}
