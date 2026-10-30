// Real-life English: practical situations for travel and social life, open at any course level.
import { html, render, on } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState, mark } from '../ui/components.js';
import { store } from '../core/store.js';

export const MODULES = [
  ['airport', 'plane', 'שדה תעופה', 'Airports'],
  ['hotel', 'hotel', 'מלונות', 'Hotels'],
  ['restaurant', 'utensils', 'מסעדות וברים', 'Restaurants and bars'],
  ['transport', 'car', 'תחבורה', 'Getting around'],
  ['shopping', 'bag', 'קניות', 'Shopping'],
  ['social', 'users', 'אנגלית חברתית', 'Social English'],
  ['emergency', 'siren', 'מצבי חירום', 'Emergencies'],
];

export default async function reallife(el, ctx) {
  ctx.setTitle(t('nav.reallife'));
  const data = await content.scenarios();
  const list = data?.scenarios || [];
  let module = ctx.query.m || 'all';

  function draw() {
    const shown = MODULES.filter(([id]) => module === 'all' || id === module);
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.reallife')}</h1><p>${tt('אנגלית מעשית לטיסה, למלון, למסעדה ולהיכרויות. פתוח בכל רמה, גם אם רק התחלתם.', 'Practical English for flights, hotels, restaurants and meeting people. Open at any level, even if you have just started.')}</p></div></div>
      <div class="list-tools"><div class="seg" role="group" aria-label="${tt('נושא', 'Topic')}"><button type="button" data-m="all" aria-pressed="${module === 'all'}">${tt('הכול', 'All')}</button>${MODULES.map(([id, , he, en]) => html`<button type="button" data-m="${id}" aria-pressed="${module === id}">${tt(he, en)}</button>`)}</div></div>
      <div class="row" style="margin-block-end:var(--s5)"><a class="key small" href="#/expressions">${icon('slang', { size: 18 })} ${t('nav.slang')}</a><a class="key small" href="#/conversations">${icon('tutor', { size: 18 })} ${t('nav.simulations')}</a></div>
      ${!list.length ? emptyState({ title: tt('התרחישים עוד לא זמינים', 'Scenarios are not available yet'), body: tt('נסו לרענן בעוד רגע.', 'Try again in a moment.') }) : html`<div class="stack-lg">${shown.map(([id, ic, he, en]) => {
        const items = list.filter((s) => s.module === id);
        if (!items.length) return '';
        return html`<section class="stack-sm"><h2 class="row" style="font-size:var(--t-lg)">${icon(ic)} ${tt(he, en)} <span class="small faint num">${items.length}</span></h2>
          <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${items.map((s) => { const p = store.get('progress', `rl:${s.id}`); return html`<li><a class="lesson-row" href="#/scenario/${s.id}" style="grid-template-columns:auto 1fr auto">${mark(p?.status)}
            <span class="grow">${legend(s.title_en, s.title_he)}<span class="meta" style="display:block">${tt(s.goal?.he || '', s.goal?.en || '')}</span></span>${levelTag(s.level)}</a></li>`; })}</ul></section>`;
      })}</div>`}`);
  }
  draw();
  return on(el, 'click', '[data-m]', (e, b) => { module = b.dataset.m; draw(); });
}
