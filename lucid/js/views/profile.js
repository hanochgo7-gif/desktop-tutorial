// Profile: who the learner is and what they are learning for. Data controls live in Settings.
import { html, render, on, $ } from '../core/util.js';
import { tt, t } from '../core/i18n.js';
import { icon, toast, LEVEL_LABEL } from '../ui/components.js';
import { profile, saveProfile, model } from '../core/learner.js';
import { content } from '../core/content.js';

export default async function profileView(el, ctx) {
  ctx.setTitle(t('nav.profile'));
  let goals = [...(profile()?.goals || [])];
  // The goals use the same cards and labels as onboarding (TF-6), not a second set of native checkboxes. The
  // page draws at once; the cards fill their place when onboarding's module has loaded, and the work goal's note
  // follows whether workplace scenarios exist.
  let goalCards = null;
  let hasWork = true;
  const drawGoals = () => {
    const slot = el.querySelector('[data-goals-slot]');
    if (slot && goalCards) render(slot, goalCards(goals, { hasWork, labelledby: 'pf-goals' }));
  };
  function draw() {
    const p = profile() || {};
    const m = model();
    // Worked out from the year alone (only the year is stored), so it can be one year more than the real age.
    const age = p.birth_year ? new Date().getFullYear() - p.birth_year : null;
    render(el, html`
      <div class="page-head"><div><h1>${p.name || t('nav.profile')}</h1><p>${tt(`לומד/ת ב-Lucid מאז ${p.created_at ? new Date(p.created_at).toLocaleDateString('he-IL') : '—'}`, `Learning with Lucid since ${p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}`)}</p></div></div>
      <div class="stack-lg" style="max-width:40rem">
        <form class="panel stack" data-form>
          <div class="field"><label for="pn">${tt('שם', 'Name')}</label><input class="input" id="pn" maxlength="40" value="${p.name || ''}" autocomplete="given-name"></div>
          <div class="field"><span class="label" id="pf-goals">${tt('מטרות', 'Goals')}</span>
            <div data-goals-slot></div></div>
          <div class="row"><button class="key enter" type="submit">${t('save')}</button></div>
        </form>
        <div class="panel stack-sm small">
          <p class="row between"><span>${tt('נקודת התחלה', 'Started at')}</span><span>${p.start_level ? LEVEL_LABEL[p.start_level] : '—'}</span></p>
          <p class="row between"><span>${tt('הרמה הנוכחית במסלול', 'Current level on the path')}</span><span>${LEVEL_LABEL[m.courseLevel]}</span></p>
          <p class="row between"><span>${tt('שנת לידה', 'Birth year')}</span><span class="num">${p.birth_year || '—'}</span></p>
          ${age != null && age < 18 ? html`<p class="banner">${icon('info', { size: 16 })}<span>${tt('מתחת לגיל 18: Lucid לא שולח שיווק לאף אחד, ובחשבון השרת חוסם הסכמה לשיווק. שאר ברירות המחדל זהות לכל הגילאים.', 'Under 18: Lucid sends no marketing to anyone, and for accounts the server blocks marketing consent. Every other default is the same at every age.')} <a href="privacy.html" target="_blank" rel="noopener">${tt('פרטיות', 'Privacy')}</a></span></p>` : ''}
        </div>
        <div class="row"><a class="key" href="#/progress">${t('nav.progress')}</a><a class="key ghost" href="#/settings">${t('nav.settings')}</a></div>
      </div>`);
    drawGoals();
  }
  draw();
  import('./onboarding.js').then((mod) => { goalCards = mod.goalCards; drawGoals(); }).catch(() => {});
  content.scenarios().catch(() => null).then((d) => {
    const work = Boolean(d?.scenarios?.some((x) => x.module === 'work'));
    if (work !== hasWork) { hasWork = work; drawGoals(); }
  });
  const offs = [
    on(el, 'click', '[data-goal]', (e, b) => {
      const g = b.dataset.goal;
      goals = goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g];
      b.setAttribute('aria-pressed', String(goals.includes(g)));
    }),
    on(el, 'submit', '[data-form]', (e) => {
      e.preventDefault();
      saveProfile({ name: $('#pn', el).value.trim(), goals });
      toast(tt('נשמר', 'Saved'));
      draw();
      el.querySelector('[data-form] button[type=submit]')?.focus();
    }),
  ];
  return () => offs.forEach((o) => o());
}
