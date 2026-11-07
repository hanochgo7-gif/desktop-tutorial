// Real-life English: practical situations for travel and social life, open at any course level. The hub
// starts with a few scenarios for the learner's level and goals, says how each one fits their level, and
// lists every topic folded to its first two scenarios (persona panel P-46, P-64). Conversations reuses the
// same filters and topic sections.
import { html, render, on } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import '../core/compat.js'; // content.js's C-1 methods also on a page that started on release 2026-11-03.1 (compat.js).
import { icon, levelTag, emptyState, mark, LEVEL_LABEL } from '../ui/components.js';
import { store } from '../core/store.js';
import { model, profile } from '../core/learner.js';
import { fitOf, FIT_LABEL, recommendScenarios, moduleOrder, byFit, modulesFor } from '../core/reallife.js';

// Travel essentials first, in the order a trip needs them; then social English and work.
export const MODULES = [
  ['airport', 'reallife', 'שדה תעופה', 'Airports'],
  ['hotel', 'hotel', 'מלונות', 'Hotels'],
  ['emergency', 'siren', 'מצבי חירום', 'Emergencies'],
  ['transport', 'car', 'תחבורה', 'Getting around'],
  ['restaurant', 'utensils', 'מסעדות וברים', 'Restaurants and bars'],
  ['shopping', 'bag', 'קניות', 'Shopping'],
  ['social', 'users', 'אנגלית חברתית', 'Social English'],
  ['work', 'briefcase', 'בעבודה', 'At work'],
];
const FOLDED = 2;

// A practice place saved part-way (scenario.js keeps it in progress rl:<id>), for the hub rows (r4 RW-8).
export function savedPlace(s) {
  const p = store.get('progress', `rl:${s.id}`);
  return p && p.status !== 'completed' && Number.isInteger(p.turn) && p.turn > 0 && p.turn < (s.n_practice ?? s.practice?.length ?? 0) ? p : null;
}
// "בתהליך · תור 3 מתוך 5" on a hub row, or nothing.
export function placeTag(s) {
  const p = savedPlace(s);
  return p ? html`<span class="tag cobalt place-tag">${tt(`בתהליך · תור ${p.turn + 1} מתוך ${s.n_practice ?? s.practice.length}`, `In progress · turn ${p.turn + 1} of ${s.n_practice ?? s.practice.length}`)}</span>` : '';
}

export const doneScenarios = () => new Set(store.all('progress').filter((p) => p.id.startsWith('rl:') && p.status === 'completed').map((p) => p.id.slice(3)));

// "B1 · a small stretch": the level and how it fits the learner's course level, in words.
export function fitNote(level, courseLevel) {
  const f = fitOf(level, courseLevel);
  return html`<span class="fit fit-${f}">${tt(...FIT_LABEL[f])}</span>`;
}

// One line of level guidance for the hubs.
export function levelGuide(courseLevel) {
  const L = LEVEL_LABEL[courseLevel] || courseLevel;
  const next = { PreA1: 'A1', A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1' }[courseLevel];
  return html`<p class="small muted level-guide">${icon('gauge', { size: 16 })}<span>${courseLevel === 'PreA1'
    ? tt('הרמה שלכם במסלול: Pre-A1. התרחישים מתחילים ב-A1, אז כל אחד מהם הוא אתגר קטן: היעזרו במשפטים ובעברית שבלשונית ״הכנה״.', 'Your level on the path: Pre-A1. Scenarios start at A1, so each one is a small stretch: use the phrases and the Hebrew in the Prepare tab.')
    : next
      ? tt(`הרמה שלכם במסלול: ${L}. תרחישים ברמה ${L} ומטה מתאימים לכם; ${next} הם אתגר קטן.`, `Your level on the path: ${L}. Scenarios at ${L} and below fit you; ${next} ones are a small stretch.`)
      : tt(`הרמה שלכם במסלול: ${L}. כל התרחישים ברמה שלכם או מתחתיה.`, `Your level on the path: ${L}. Every scenario is at or below your level.`)}</span></p>`;
}

// Topic and level filters, shared by Real life and Conversations.
export function hubFilters(state) {
  return html`<div class="list-tools hub-filters">
    <div class="seg" role="group" aria-label="${tt('נושא', 'Topic')}"><button type="button" data-m="all" aria-pressed="${state.module === 'all'}">${tt('הכול', 'All')}</button>${MODULES.map(([id, , he, en]) => html`<button type="button" data-m="${id}" aria-pressed="${state.module === id}">${tt(he, en)}</button>`)}</div>
    <div class="seg" role="group" aria-label="${tt('רמה', 'Level')}"><button type="button" data-scope="all" aria-pressed="${state.scope === 'all'}">${tt('כל הרמות', 'All levels')}</button><button type="button" data-scope="mine" aria-pressed="${state.scope === 'mine'}">${tt('לרמה שלי', 'For my level')}</button></div>
  </div>`;
}

// Topic sections. With every topic shown, each is folded to its first two scenarios with "Show all". Each topic is
// a <details>, and only one is open at first: the learner's first goal topic, or the one with the most scenarios
// at their level, so the hub is a short list of topics instead of one long page (r4 RW-10). A topic the learner
// opens or closes stays that way during the visit (state.topicOpen).
export function hubSections(list, state, courseLevel, row) {
  const keep = (s) => state.scope === 'all' || ['below', 'at', 'stretch'].includes(fitOf(s.level, courseLevel));
  // The learner's goal topics come first, and in each topic the scenarios closest to their level (RW-9).
  const ids = moduleOrder(MODULES.map(([id]) => id), state.goals || []);
  const shown = ids.map((mid) => MODULES.find(([id]) => id === mid)).filter(([id]) => state.module === 'all' || id === state.module)
    .map(([id, ic, he, en]) => ({ id, ic, he, en, items: byFit(list.filter((s) => s.module === id && keep(s)), courseLevel) })).filter((x) => x.items.length);
  const atLevel = (x) => x.items.filter((s) => fitOf(s.level, courseLevel) === 'at').length;
  const goalFirst = modulesFor(state.goals || []).find((m) => shown.some((x) => x.id === m));
  const lead = goalFirst || [...shown].sort((a, b) => atLevel(b) - atLevel(a))[0]?.id;
  state.topicOpen ||= new Map();
  const sections = shown.map(({ id, ic, he, en, items }) => {
    const folded = state.module === 'all' && !state.open.has(id) && items.length > FOLDED;
    const isOpen = state.module !== 'all' || (state.topicOpen.has(id) ? state.topicOpen.get(id) : id === lead);
    return html`<section class="hub-topic" aria-labelledby="hub-${id}"><details class="panel flat hub-fold" data-topic="${id}" ${isOpen ? html`open` : ''}>
      <summary class="disclosure"><span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span><h2 class="row hub-head grow" id="hub-${id}">${icon(ic)} ${tt(he, en)} <span class="small faint num">${items.length}</span></h2></summary>
      <div class="stack-sm hub-fold-body"><ul class="lesson-list" style="list-style:none;padding:0;margin:0">${(folded ? items.slice(0, FOLDED) : items).map((s) => html`<li>${row(s)}</li>`)}</ul>
      ${state.module === 'all' && items.length > FOLDED ? html`<button type="button" class="key ghost small" data-unfold="${id}" aria-expanded="${!folded}">${folded ? tt(`להציג את כל ה-${items.length}`, `Show all ${items.length}`) : tt('להציג פחות', 'Show fewer')}</button>` : ''}</div></details></section>`;
  });
  return sections.length ? html`<div class="stack-sm hub-topics">${sections}</div>` : emptyState({ title: tt('אין תרחישים בסינון הזה', 'No scenarios match these filters'), action: html`<button type="button" class="key small" data-m="all">${tt('להציג הכול', 'Show everything')}</button>` });
}

// Filter clicks for both hubs; redraw() repaints the page.
export function hubEvents(el, state, redraw) {
  const offs = [
    on(el, 'click', '[data-m]', (e, b) => { state.module = b.dataset.m; redraw(); }),
    on(el, 'click', '[data-scope]', (e, b) => { state.scope = b.dataset.scope; redraw(); }),
    on(el, 'toggle', 'details[data-topic]', (e, d) => { if (e.target === d) { state.topicOpen ||= new Map(); state.topicOpen.set(d.dataset.topic, d.open); } }, true),
    on(el, 'click', '[data-unfold]', (e, b) => {
      const id = b.dataset.unfold;
      if (state.open.has(id)) state.open.delete(id); else state.open.add(id);
      redraw();
      el.querySelector(`[data-unfold="${id}"]`)?.focus();
    }),
  ];
  return () => offs.forEach((o) => o());
}

export default async function reallife(el, ctx) {
  ctx.setTitle(t('nav.reallife'));
  const data = await content.scenarioIndex();
  const list = data?.scenarios || [];
  const state = { module: MODULES.some(([id]) => id === ctx.query.m) ? ctx.query.m : 'all', scope: 'all', open: new Set(), goals: profile()?.goals || [] };

  const row = (s, courseLevel) => {
    const p = store.get('progress', `rl:${s.id}`);
    return html`<a class="lesson-row hub-row" href="#/scenario/${s.id}">${mark(p?.status)}
      <span class="grow">${legend(s.title_en, s.title_he)}${placeTag(s)}<span class="meta" style="display:block">${tt(s.goal?.he || '', s.goal?.en || '')}</span></span>
      <span class="hub-level">${levelTag(s.level)}${fitNote(s.level, courseLevel)}</span></a>`;
  };

  function draw() {
    const courseLevel = model().courseLevel;
    const start = recommendScenarios(list, { courseLevel, goals: profile()?.goals || [], done: doneScenarios() });
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.reallife')}</h1><p>${tt('אנגלית מעשית לטיסה, למלון, למסעדה, להיכרויות ולעבודה. פתוח בכל רמה, גם אם רק התחלתם.', 'Practical English for flights, hotels, restaurants, meeting people and work. Open at any level, even if you have just started.')}</p></div></div>
      <div class="row" style="margin-block-end:var(--s4)"><a class="key small" href="#/expressions">${icon('slang', { size: 18 })} ${t('nav.slang')}</a><a class="key small" href="#/conversations">${icon('tutor', { size: 18 })} ${t('nav.simulations')}</a></div>
      <p class="small muted level-guide offline-note">${icon('cloud-off', { size: 16 })}<span>${tt('לפני נסיעה: התרחישים והתרגול המובנה עובדים גם בלי אינטרנט. כדי שגם השיעורים יעבדו בלי חיבור, ', 'Before a trip: scenarios and scripted practice work without internet. To have the lessons offline too, ')}<a href="#/settings?section=offline">${tt('שמרו אותם במכשיר', 'save them on this device')}</a>.</span></p>
      ${data?.hidden_for_age ? html`<p class="small muted" data-age-note>${icon('info', { size: 16 })} ${tt('חלק מהתרחישים לא מוצגים, לפי הגיל שבפרופיל.', 'Some scenarios are not shown, based on the age in your profile.')}</p>` : ''}
      ${!list.length ? emptyState({ title: tt('התרחישים עוד לא זמינים', 'Scenarios are not available yet'), body: tt('נסו לרענן בעוד רגע.', 'Try again in a moment.') }) : html`
        ${levelGuide(courseLevel)}
        ${start.length ? html`<section class="panel flat stack-sm start-here" aria-labelledby="rl-start"><h2 id="rl-start" class="small" style="font-size:var(--t-md)">${tt('כדאי להתחיל כאן', 'Start here')}</h2>
          <p class="xsmall faint">${tt('תרחישים שעוד לא עשיתם, לפי הרמה והמטרות שלכם.', 'Scenarios you have not done yet, for your level and goals.')}</p>
          <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${start.map((s) => html`<li>${row(s, courseLevel)}</li>`)}</ul>
          ${modulesFor(state.goals).includes('social') ? html`<a class="key small start-expr" href="#/expressions">${icon('slang', { size: 18 })} ${tt('ביטויים שאנשים באמת אומרים', 'Expressions people actually use')}</a>` : ''}</section>` : ''}
        ${hubFilters(state)}
        ${hubSections(list, state, courseLevel, (s) => row(s, courseLevel))}`}`);
  }
  draw();
  return hubEvents(el, state, draw);
}
