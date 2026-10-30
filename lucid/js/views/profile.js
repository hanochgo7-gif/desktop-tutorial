// Profile: who the learner is and what they are learning for. Data controls live in Settings.
import { html, render, on, $ } from '../core/util.js';
import { tt, t } from '../core/i18n.js';
import { icon, toast, LEVEL_LABEL } from '../ui/components.js';
import { profile, saveProfile, model } from '../core/learner.js';

const GOALS = { travel: ['טיולים', 'Travel'], work: ['עבודה', 'Work'], studies: ['מבחנים ולימודים', 'Exams and university'], conversation: ['ביטחון בשיחה', 'Conversation'], writing: ['כתיבה אקדמית', 'Academic writing'], everyday: ['יום-יום', 'Everyday English'] };

export default async function profileView(el, ctx) {
  ctx.setTitle(t('nav.profile'));
  function draw() {
    const p = profile() || {};
    const m = model();
    const age = p.birth_year ? new Date().getFullYear() - p.birth_year : null;
    render(el, html`
      <div class="page-head"><div><h1>${p.name || t('nav.profile')}</h1><p>${tt(`לומד/ת ב-Lucid מאז ${p.created_at ? new Date(p.created_at).toLocaleDateString('he-IL') : '—'}`, `Learning with Lucid since ${p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}`)}</p></div></div>
      <div class="stack-lg" style="max-width:40rem">
        <form class="panel stack" data-form>
          <div class="field"><label for="pn">${tt('שם', 'Name')}</label><input class="input" id="pn" maxlength="40" value="${p.name || ''}" autocomplete="given-name"></div>
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">${tt('מטרות', 'Goals')}</legend>
            <div class="choice-list">${Object.entries(GOALS).map(([id, [he, en]]) => html`<label class="choice"><input type="checkbox" name="goal" value="${id}" ${p.goals?.includes(id) ? html`checked` : ''}><span>${tt(he, en)}</span></label>`)}</div></fieldset>
          <div class="row"><button class="key enter" type="submit">${t('save')}</button></div>
        </form>
        <div class="panel stack-sm small">
          <p class="row between"><span>${tt('נקודת התחלה', 'Started at')}</span><span>${p.start_level ? LEVEL_LABEL[p.start_level] : '—'}</span></p>
          <p class="row between"><span>${tt('הרמה הנוכחית במסלול', 'Current level on the path')}</span><span>${LEVEL_LABEL[m.courseLevel]}</span></p>
          <p class="row between"><span>${tt('גיל', 'Age')}</span><span>${age ?? '—'}</span></p>
          ${age != null && age < 18 ? html`<p class="banner">${icon('info', { size: 16 })}<span>${tt('מתחת לגיל 18: אין שיווק, ופרטיות מחמירה כברירת מחדל.', 'Under 18: no marketing, and the strictest privacy by default.')}</span></p>` : ''}
        </div>
        <div class="row"><a class="key" href="#/progress">${t('nav.progress')}</a><a class="key ghost" href="#/settings">${t('nav.settings')}</a></div>
      </div>`);
  }
  draw();
  return on(el, 'submit', '[data-form]', (e) => {
    e.preventDefault();
    saveProfile({ name: $('#pn', el).value.trim(), goals: [...el.querySelectorAll('input[name=goal]:checked')].map((i) => i.value) });
    toast(tt('נשמר', 'Saved'));
    draw();
  });
}
