// Filter builder UI: rows of [property][operator][value], AND/OR toggle.
// filterBuilder(el, type, set, onChange) renders in place; openFilterDialog(type, set) => Promise<set|null>.

import { html, render, $, $$, on, clone } from '../core/util.js';
import { store } from '../core/store.js';
import { getProps, getProp, OBJECTS, PROP_GROUPS, pipelines } from '../core/schema.js';
import { OPS, opsFor, valueKind } from '../core/filters.js';
import { modal, icon } from './components.js';

const ASSOC_PSEUDO = {
  contact: [['assoc:company', 'משויך לחברה'], ['assoc:deal', 'משויך לעסקה']],
  company: [['assoc:contact', 'יש אנשי קשר'], ['assoc:deal', 'יש עסקאות']],
  deal: [['assoc:contact', 'יש איש קשר'], ['assoc:company', 'משויכת לחברה']],
  ticket: [['assoc:contact', 'יש איש קשר'], ['assoc:company', 'משויכת לחברה']],
};

export function filterableProps(type) {
  const props = getProps(type).filter((p) => !p.hidden);
  const extra = (ASSOC_PSEUDO[type] || []).map(([key, label]) => ({ key, label, type: 'assoc', group: 'assoc' }));
  return [...props, ...extra];
}
function propFor(type, key) {
  if (key?.startsWith('assoc:')) return { key, label: key, type: 'assoc' };
  return getProp(type, key);
}
function opsOf(prop) {
  if (prop?.type === 'assoc') return ['known', 'unknown'];
  return opsFor(prop);
}
function optionsOf(type, prop) {
  if (prop.type === 'user') return store.all('users').map((u) => ({ value: u.id, label: u.name }));
  if (prop.type === 'stage') return pipelines(type).flatMap((p) => p.stages.map((s) => ({ value: s.id, label: pipelines(type).length > 1 ? `${s.name} (${p.name})` : s.name })));
  if (prop.type === 'pipeline') return pipelines(type).map((p) => ({ value: p.id, label: p.name }));
  return prop.options || [];
}

function valueControl(type, prop, f, i) {
  const kind = valueKind(prop, f.op);
  if (!kind) return '';
  if (kind === 'options') {
    const set = new Set(Array.isArray(f.value) ? f.value : f.value ? [f.value] : []);
    return html`<div class="fb-opts" data-i="${i}">${optionsOf(type, prop).map((o) => html`<label class="check-pill"><input type="checkbox" value="${o.value}" ${set.has(o.value) ? 'checked' : ''} data-fb="optval"><span>${o.label}</span></label>`)}</div>`;
  }
  if (kind === 'range') return html`<div class="row"><input class="input sm num" type="number" placeholder="מ-" value="${f.value?.[0] ?? ''}" data-fb="r0" data-i="${i}"><span class="muted">עד</span><input class="input sm num" type="number" placeholder="עד" value="${f.value?.[1] ?? ''}" data-fb="r1" data-i="${i}"></div>`;
  if (kind === 'days') return html`<div class="row"><input class="input sm num" type="number" min="1" value="${f.value ?? 7}" data-fb="val" data-i="${i}" style="width:90px"><span class="muted">ימים</span></div>`;
  if (kind === 'date') return html`<input class="input sm" type="date" value="${f.value ?? ''}" data-fb="val" data-i="${i}">`;
  if (kind === 'number') return html`<input class="input sm num" type="number" value="${f.value ?? ''}" data-fb="val" data-i="${i}">`;
  return html`<input class="input sm" type="text" value="${f.value ?? ''}" data-fb="val" data-i="${i}" placeholder="ערך">`;
}

export function filterBuilder(el, type, initial, onChange = () => {}) {
  const set = clone(initial || { match: 'all', filters: [] });
  set.filters ||= [];
  set.match ||= 'all';
  const props = filterableProps(type);
  const groups = {};
  for (const p of props) (groups[p.group || 'main'] ||= []).push(p);
  const groupLabel = (g) => (g === 'assoc' ? 'שיוכים' : PROP_GROUPS[g] || g);

  const draw = () => {
    render(el, html`<div class="fb">
      ${set.filters.length > 1 ? html`<div class="fb-match">התאמה ל
        <div class="seg"><button type="button" class="${set.match === 'all' ? 'active' : ''}" data-fb="match" data-v="all">כל התנאים</button><button type="button" class="${set.match === 'any' ? 'active' : ''}" data-fb="match" data-v="any">אחד התנאים</button></div></div>` : ''}
      ${set.filters.map((f, i) => {
        const prop = propFor(type, f.prop);
        return html`<div class="fb-row">
          ${i > 0 ? html`<span class="fb-join">${set.match === 'all' ? 'וגם' : 'או'}</span>` : ''}
          <div class="fb-line">
            <select class="input sm" data-fb="prop" data-i="${i}" aria-label="שדה">
              <option value="">בחירת שדה...</option>
              ${Object.entries(groups).map(([g, ps]) => html`<optgroup label="${groupLabel(g)}">${ps.map((p) => html`<option value="${p.key}" ${p.key === f.prop ? 'selected' : ''}>${p.label}</option>`)}</optgroup>`)}
            </select>
            ${prop ? html`<select class="input sm" data-fb="op" data-i="${i}" aria-label="תנאי">${opsOf(prop).map((op) => html`<option value="${op}" ${op === f.op ? 'selected' : ''}>${prop.type === 'assoc' ? (op === 'known' ? 'כן' : 'לא') : OPS[op]}</option>`)}</select>` : ''}
            <button type="button" class="btn-icon sm" data-fb="del" data-i="${i}" aria-label="הסרת תנאי">${icon('trash')}</button>
          </div>
          ${prop && prop.type !== 'assoc' ? valueControl(type, prop, f, i) : ''}
        </div>`;
      })}
      <button type="button" class="btn btn-sm btn-ghost" data-fb="add">${icon('plus')}הוספת תנאי</button>
    </div>`);
  };
  const emit = () => onChange(clone(set));
  on(el, 'change', '[data-fb]', (e, t) => {
    const i = Number(t.dataset.i ?? t.closest('[data-i]')?.dataset.i);
    const f = set.filters[i];
    switch (t.dataset.fb) {
      case 'prop': {
        f.prop = t.value;
        const prop = propFor(type, f.prop);
        f.op = prop ? opsOf(prop)[0] : '';
        f.value = valueKind(prop || {}, f.op) === 'days' ? 7 : undefined;
        draw(); break;
      }
      case 'op': {
        const prop = propFor(type, f.prop);
        const prevKind = valueKind(prop, f.op);
        f.op = t.value;
        const kind = valueKind(prop, f.op);
        if (kind !== prevKind) f.value = kind === 'days' ? 7 : undefined;
        draw(); break;
      }
      case 'val': f.value = t.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value; break;
      case 'r0': case 'r1': {
        const v = Array.isArray(f.value) ? [...f.value] : ['', ''];
        v[t.dataset.fb === 'r0' ? 0 : 1] = t.value === '' ? '' : Number(t.value);
        f.value = v; break;
      }
      case 'optval': {
        const box = t.closest('.fb-opts');
        set.filters[Number(box.dataset.i)].value = $$('input:checked', box).map((x) => x.value);
        break;
      }
    }
    emit();
  });
  on(el, 'input', 'input[data-fb="val"]', (e, t) => {
    const f = set.filters[Number(t.dataset.i)];
    f.value = t.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value;
    emit();
  });
  on(el, 'click', 'button[data-fb]', (e, t) => {
    const a = t.dataset.fb;
    if (a === 'add') { set.filters.push({ prop: '', op: '', value: undefined }); draw(); $$('[data-fb="prop"]', el).pop()?.focus(); }
    if (a === 'del') { set.filters.splice(Number(t.dataset.i), 1); draw(); emit(); }
    if (a === 'match') { set.match = t.dataset.v; draw(); emit(); }
  });
  if (!set.filters.length) set.filters.push({ prop: '', op: '', value: undefined });
  draw();
  return { get: () => clone({ ...set, filters: set.filters.filter((f) => f.prop && f.op) }) };
}

export function openFilterDialog(type, set, { title = 'סינון מתקדם', okLabel = 'החלת סינון' } = {}) {
  return new Promise((res) => {
    let result = null, fb;
    modal({
      title: `${title}: ${OBJECTS[type]?.plural || ''}`, size: 'md',
      body: (el) => { fb = filterBuilder(el, type, set); },
      actions: [
        { label: 'ניקוי הכול', kind: 'ghost', onClick: () => { result = { match: 'all', filters: [] }; } },
        { label: 'ביטול' },
        { label: okLabel, kind: 'primary', onClick: () => { result = fb.get(); } },
      ],
      onClose: () => res(result),
    });
  });
}
