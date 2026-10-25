// "Create record" side panel, with associations and live duplicate warning.

import { html, render, $, $$, fmt } from '../core/util.js';
import { store } from '../core/store.js';
import { OBJECTS, getProps, displayName, defaultsFor, recordLink } from '../core/schema.js';
import { createRecord, findDuplicates, ValidationError } from '../core/records.js';
import { drawer, propInput, readProps, wirePipelineStage, toast, icon, pickRecord, avatar } from './components.js';

const ASSOC_ON_CREATE = {
  contact: ['company'],
  company: [],
  deal: ['contact', 'company'],
  ticket: ['contact', 'company'],
};

// openCreate('deal', { defaults, associate: [{type,id}], onCreated(rec), open: true })
export function openCreate(type, { defaults = {}, associate = [], onCreated, open = false } = {}) {
  const meta = OBJECTS[type];
  const props = getProps(type).filter((p) => p.inCreate && !p.hidden && !p.readonly);
  const values = { ...defaultsFor(type), ...defaults };
  const assoc = [...associate];
  let createAnother = false;

  const body = (el) => {
    render(el, html`<form class="form-grid" novalidate>
      ${props.map((p, i) => propInput(p, values[p.key], { record: values, type, autofocus: i === 0 }))}
      ${ASSOC_ON_CREATE[type].length ? html`<fieldset class="assoc-pick"><legend>שיוך</legend><div data-assoc></div></fieldset>` : ''}
      <div class="dup-warn" data-dup hidden></div>
      <button type="submit" hidden></button>
    </form>`);
    const form = $('form', el);
    wirePipelineStage(form, type);
    // Prefill the deal name from the associated company, HubSpot style.
    const drawAssoc = () => {
      const box = $('[data-assoc]', el);
      if (!box) return;
      render(box, ASSOC_ON_CREATE[type].map((t) => {
        const cur = assoc.filter((a) => a.type === t);
        return html`<div class="assoc-row"><span class="assoc-label">${icon(OBJECTS[t].icon)}${OBJECTS[t].singular}</span>
          <div class="assoc-vals">${cur.map((a) => { const r = store.get(OBJECTS[t].coll, a.id); return r ? html`<span class="chip">${displayName(t, r)}<button type="button" class="chip-x" data-unassoc="${t}:${a.id}" aria-label="הסרה">${icon('x')}</button></span>` : ''; })}
          <button type="button" class="btn btn-sm btn-ghost" data-add-assoc="${t}">${icon('plus')}הוספה</button></div></div>`;
      }));
    };
    drawAssoc();
    el.addEventListener('click', async (e) => {
      const add = e.target.closest('[data-add-assoc]');
      if (add) {
        const t = add.dataset.addAssoc;
        const id = await pickRecord(t, { title: `שיוך ${OBJECTS[t].singular}`, exclude: assoc.filter((a) => a.type === t).map((a) => a.id) });
        if (id) {
          assoc.push({ type: t, id });
          drawAssoc();
          const nameInput = form.querySelector('[name="name"]');
          if (type === 'deal' && t === 'company' && nameInput && !nameInput.value) nameInput.value = `${displayName('company', store.get('companies', id))} – עסקה חדשה`;
        }
      }
      const un = e.target.closest('[data-unassoc]');
      if (un) {
        const [t, id] = un.dataset.unassoc.split(':');
        const i = assoc.findIndex((a) => a.type === t && a.id === id);
        if (i >= 0) assoc.splice(i, 1);
        drawAssoc();
      }
    });
    // live duplicate check
    const dupBox = $('[data-dup]', el);
    const check = () => {
      const data = readProps(form, props);
      const dups = findDuplicates(type, data);
      dupBox.hidden = !dups.length;
      if (dups.length) {
        render(dupBox, html`${icon('alert')}<div><b>ייתכן שזו כפילות</b><p>${dups.slice(0, 3).map((d, i) => html`${i ? ', ' : ''}<a href="${recordLink(type, d.id)}" data-close>${displayName(type, d)}</a>`)} כבר קיים במערכת.</p></div>`);
      }
    };
    form.addEventListener('focusout', (e) => { if (['email', 'phone', 'domain', 'name'].includes(e.target.name)) check(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); $('.ov-foot .btn-primary', el.closest('.ov')).click(); });
  };

  const submit = ({ body: el, close }) => {
    const form = $('form', el);
    $$('.field.invalid', form).forEach((f) => f.classList.remove('invalid'));
    $$('.field-err', form).forEach((f) => f.remove());
    const data = readProps(form, props);
    try {
      const rec = createRecord(type, { ...defaults, ...data }, { associate: assoc });
      toast(`${meta.singular} נוצר${meta.fem ? 'ה' : ''}: ${displayName(type, rec)}`, { kind: 'success', action: { label: 'פתיחה', onClick: () => { location.hash = recordLink(type, rec.id); } } });
      onCreated?.(rec);
      if (createAnother) {
        createAnother = false;
        close();
        openCreate(type, { defaults, associate, onCreated });
        return false;
      }
      if (open) location.hash = recordLink(type, rec.id);
      return true;
    } catch (err) {
      if (err instanceof ValidationError) {
        for (const [k, msg] of Object.entries(err.errors)) {
          const input = form.querySelector(`[name="${k}"]`);
          const field = input?.closest('.field');
          if (field) {
            field.classList.add('invalid');
            field.insertAdjacentHTML('beforeend', `<p class="field-err" role="alert"></p>`);
            field.lastElementChild.textContent = msg;
          }
        }
        form.querySelector('.invalid input, .invalid select, .invalid textarea')?.focus();
        return false;
      }
      throw err;
    }
  };

  return drawer({
    title: `${meta.singular} חדש${meta.fem ? 'ה' : ''}`,
    body,
    actions: [
      { label: 'ביטול' },
      { label: 'יצירה והוספת עוד', onClick: (ctx) => { createAnother = true; return submit(ctx); } },
      { label: 'יצירה', kind: 'primary', onClick: submit },
    ],
  });
}
