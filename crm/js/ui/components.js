// UI kit: overlays (modal, drawer, menu, toast, confirm), property inputs and value display, small atoms.

import { html, raw, render, esc, $, $$, on, fmt, initials, hueFor, toDateInput, toDateTimeInput, Html } from '../core/util.js';
import { store } from '../core/store.js';
import { pipelines, pipeline, stageById, optionLabel, recordLink, displayName } from '../core/schema.js';
import { icon } from './icons.js';

// ---------- overlays ----------
const layer = () => document.getElementById('overlay-root');
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function trapFocus(el, e) {
  if (e.key !== 'Tab') return;
  const items = $$(FOCUSABLE, el).filter((x) => x.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}

// modal({ title, body, size: 'sm'|'md'|'lg'|'xl', actions: [{label, kind, act, onClick, close}], onClose, dirtyCheck })
// body may be Html or a function(el) that renders into the body element. Returns { el, body, close }.
export function modal({ title, body, size = 'md', actions = [], onClose, dismissible = true, className = '', kind = 'modal' } = {}) {
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = `ov ov-${kind} ${className}`;
  const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  render(wrap, html`
    <div class="ov-backdrop" data-close></div>
    <div class="ov-panel ov-${size}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <header class="ov-head">
        <h2 id="${titleId}">${title}</h2>
        <button class="btn-icon" data-close aria-label="סגירה">${icon('x')}</button>
      </header>
      <div class="ov-body"></div>
      ${actions.length ? html`<footer class="ov-foot">${actions.map((a, i) => html`<button class="btn ${a.kind ? `btn-${a.kind}` : ''}" data-i="${i}" ${a.disabled ? 'disabled' : ''}>${a.icon ? icon(a.icon) : ''}${a.label}</button>`)}</footer>` : ''}
    </div>`);
  const bodyEl = $('.ov-body', wrap);
  if (typeof body === 'function') body(bodyEl);
  else if (body instanceof Node) bodyEl.appendChild(body);
  else render(bodyEl, body ?? '');
  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    wrap.classList.add('leaving');
    setTimeout(() => wrap.remove(), 160);
    onClose?.(result);
    if (prevFocus && document.contains(prevFocus)) prevFocus.focus?.();
  };
  const onKey = (e) => {
    if (!document.contains(wrap) || wrap !== layer().lastElementChild) return;
    if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close(); }
    trapFocus(wrap, e);
  };
  document.addEventListener('keydown', onKey, true);
  wrap.addEventListener('click', async (e) => {
    if (e.target.closest('[data-close]') && (dismissible || e.target.closest('.btn-icon'))) {
      if (e.target.classList.contains('ov-backdrop') && !dismissible) return;
      close();
      return;
    }
    const b = e.target.closest('.ov-foot [data-i]');
    if (b) {
      const a = actions[Number(b.dataset.i)];
      if (a.onClick) {
        b.disabled = true;
        try {
          const r = await a.onClick({ el: wrap, body: bodyEl, close });
          if (r !== false && a.close !== false) close(r);
        } finally { b.disabled = false; }
      } else close(a.value);
    }
  });
  layer().appendChild(wrap);
  requestAnimationFrame(() => {
    const f = $('[autofocus]', bodyEl) || $(FOCUSABLE, bodyEl) || $('.ov-foot .btn-primary', wrap) || $('.btn-icon', wrap);
    f?.focus();
  });
  return { el: wrap, body: bodyEl, close };
}
export const drawer = (opts) => modal({ ...opts, kind: 'drawer', size: opts.size || 'md' });

export function confirmDialog(message, { title = 'לאשר?', okLabel = 'אישור', danger = false, detail = '' } = {}) {
  return new Promise((res) => {
    let result = false;
    modal({
      title, size: 'sm',
      body: html`<p class="confirm-msg">${message}</p>${detail ? html`<p class="muted small">${detail}</p>` : ''}`,
      actions: [
        { label: 'ביטול', value: false },
        { label: okLabel, kind: danger ? 'danger' : 'primary', onClick: () => { result = true; } },
      ],
      onClose: () => res(result),
    });
  });
}
export function promptDialog(label, { title = '', value = '', placeholder = '', okLabel = 'שמירה', multiline = false } = {}) {
  return new Promise((res) => {
    let result = null;
    modal({
      title: title || label, size: 'sm',
      body: html`<label class="field"><span class="field-label">${label}</span>${multiline
        ? html`<textarea class="input" rows="4" autofocus placeholder="${placeholder}">${value}</textarea>`
        : html`<input class="input" autofocus value="${value}" placeholder="${placeholder}">`}</label>`,
      actions: [
        { label: 'ביטול' },
        { label: okLabel, kind: 'primary', onClick: ({ body }) => { result = $('input,textarea', body).value.trim(); } },
      ],
      onClose: () => res(result),
    }).body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.closest('.ov').querySelector('.btn-primary').click(); }
    });
  });
}

// ---------- toast ----------
export function toast(message, { kind = 'info', action, timeout = 4500 } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  render(el, html`${icon(kind === 'success' ? 'check' : kind === 'error' ? 'alert' : 'info')}<span>${message}</span>${action ? html`<button class="toast-act">${action.label}</button>` : ''}<button class="btn-icon toast-x" aria-label="סגירה">${icon('x')}</button>`);
  const close = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 200); };
  el.querySelector('.toast-x').onclick = close;
  if (action) el.querySelector('.toast-act').onclick = () => { action.onClick(); close(); };
  root.appendChild(el);
  if (timeout) setTimeout(close, action ? Math.max(timeout, 7000) : timeout);
  return close;
}

// ---------- popover menu ----------
// menu(anchorEl, [{label, icon, onClick, danger, divider, checked, disabled}], {align})
let openMenu = null;
export function menu(anchor, items, { align = 'start', className = '' } = {}) {
  closeMenu();
  const el = document.createElement('div');
  el.className = `menu ${className}`;
  el.setAttribute('role', 'menu');
  render(el, items.filter(Boolean).map((it, i) => it.divider
    ? html`<div class="menu-sep" role="separator"></div>`
    : it.header ? html`<div class="menu-head">${it.header}</div>`
    : html`<button class="menu-item ${it.danger ? 'danger' : ''}" role="menuitem" data-i="${i}" ${it.disabled ? 'disabled' : ''}>
        ${it.checked !== undefined ? html`<span class="menu-check">${it.checked ? icon('check') : ''}</span>` : it.icon ? icon(it.icon) : ''}
        <span>${it.label}</span>${it.hint ? html`<kbd>${it.hint}</kbd>` : ''}</button>`));
  const list = items.filter(Boolean);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const it = list[Number(b.dataset.i)];
    if (!it.keepOpen) closeMenu();
    it.onClick?.(e);
  });
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const mw = el.offsetWidth, mh = el.offsetHeight;
  // RTL: "start" aligns the menu's right edge with the anchor's right edge
  let left = align === 'start' ? r.right - mw : r.left;
  left = Math.max(8, Math.min(left, innerWidth - mw - 8));
  let top = r.bottom + 4;
  if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 4);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  openMenu = { el, anchor };
  anchor.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => el.querySelector('.menu-item:not([disabled])')?.focus());
  el.addEventListener('keydown', (e) => {
    const btns = $$('.menu-item:not([disabled])', el);
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { btns[(i + 1) % btns.length]?.focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { btns[(i - 1 + btns.length) % btns.length]?.focus(); e.preventDefault(); }
    if (e.key === 'Escape' || e.key === 'Tab') { closeMenu(); anchor.focus(); e.preventDefault(); }
  });
  return el;
}
export function closeMenu() {
  if (!openMenu) return;
  openMenu.anchor.setAttribute('aria-expanded', 'false');
  openMenu.el.remove();
  openMenu = null;
}
document.addEventListener('mousedown', (e) => { if (openMenu && !openMenu.el.contains(e.target) && !openMenu.anchor.contains(e.target)) closeMenu(); });
addEventListener('resize', closeMenu);
addEventListener('scroll', (e) => { if (openMenu && !openMenu.el.contains(e.target)) closeMenu(); }, true);

// ---------- atoms ----------
export function avatar(name, { size = 'md', src, title } = {}) {
  const h = hueFor(name);
  return html`<span class="avatar avatar-${size}" style="--h:${h}" title="${title ?? name ?? ''}" aria-hidden="true">${src ? html`<img src="${src}" alt="">` : initials(name)}</span>`;
}
export function userChip(userId, { showName = true, size = 'sm' } = {}) {
  const u = store.get('users', userId);
  if (!u) return html`<span class="muted">לא משויך</span>`;
  return html`<span class="user-chip">${avatar(u.name, { size })}${showName ? html`<span>${u.name}</span>` : ''}</span>`;
}
export function badge(label, color = 'slate', extra = '') {
  return html`<span class="badge badge-${color} ${extra}">${label}</span>`;
}
export function emptyState({ icon: ic = 'inbox', title, text, action }) {
  return html`<div class="empty">
    <div class="empty-ic">${icon(ic)}</div>
    <h3>${title}</h3>
    ${text ? html`<p>${text}</p>` : ''}
    ${action ? html`<button class="btn btn-primary" data-act="${action.act}">${action.icon ? icon(action.icon) : ''}${action.label}</button>` : ''}
  </div>`;
}
export function kbd(k) { return html`<kbd>${k}</kbd>`; }
export function spinner() { return html`<span class="spinner" aria-label="טוען"></span>`; }
export function pageHeader({ title, subtitle, actions = '', back }) {
  return html`<header class="page-head">
    <div class="page-title">
      ${back ? html`<a class="back" href="${back.href}">${icon('chevronRight')}${back.label}</a>` : ''}
      <h1>${title}</h1>
      ${subtitle ? html`<p class="muted">${subtitle}</p>` : ''}
    </div>
    <div class="page-actions">${actions}</div>
  </header>`;
}
export function tabs(items, active, attr = 'data-tab') {
  return html`<div class="tabs" role="tablist">${items.map((t) => html`<button role="tab" class="tab ${t.id === active ? 'active' : ''}" aria-selected="${t.id === active}" ${raw(attr)}="${t.id}">${t.icon ? icon(t.icon) : ''}${t.label}${t.count != null ? html`<span class="tab-count">${fmt.number(t.count)}</span>` : ''}</button>`)}</div>`;
}

// ---------- property values ----------
// Display value for a property (Html). Used in tables, cards and the record sidebar.
export function displayValue(prop, value, record, type) {
  if (!prop) return value == null ? '' : String(value);
  const v = value;
  const isEmpty = v == null || v === '' || (Array.isArray(v) && !v.length);
  if (isEmpty && prop.type !== 'bool' && prop.type !== 'score') return html`<span class="nil">—</span>`;
  switch (prop.type) {
    case 'money': return html`<span class="num">${fmt.money(v, store.settings.currency)}</span>`;
    case 'number': return html`<span class="num">${fmt.number(v)}</span>`;
    case 'percent': return html`<span class="num">${fmt.percent(v)}</span>`;
    case 'score': return scoreMeter(v || 0);
    case 'date': return html`<span title="${fmt.date(v)}">${fmt.date(v)}</span>`;
    case 'datetime': return html`<span title="${fmt.dateTime(v)}">${fmt.relative(v)}</span>`;
    case 'email': return html`<a href="mailto:${v}" class="lnk" data-stop>${v}</a>`;
    case 'phone': return html`<a href="tel:${v}" class="lnk num" data-stop dir="ltr">${v}</a>`;
    case 'url': {
      const href = /^https?:/i.test(v) ? v : `https://${v}`;
      return html`<a href="${href}" target="_blank" rel="noopener" class="lnk" data-stop dir="ltr">${String(v).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`;
    }
    case 'bool': return v ? badge('כן', 'green') : html`<span class="muted">לא</span>`;
    case 'user': return userChip(v);
    case 'select': {
      const o = (prop.options || []).find((x) => x.value === v);
      return o ? badge(o.label, o.color || 'slate') : html`<span>${v}</span>`;
    }
    case 'multiselect': {
      const arr = Array.isArray(v) ? v : [v];
      return html`<span class="badges">${arr.map((x) => { const o = (prop.options || []).find((y) => y.value === x); return badge(o?.label || x, o?.color || 'slate'); })}</span>`;
    }
    case 'stage': {
      const s = stageById(type, v);
      if (!s) return html`<span>${v}</span>`;
      const color = s.type === 'won' ? 'green' : s.type === 'lost' ? 'red' : s.type === 'closed' ? 'slate' : 'indigo';
      return badge(s.name, color);
    }
    case 'pipeline': return html`<span>${pipeline(type, v)?.name || v}</span>`;
    case 'textarea': return html`<span class="pre">${v}</span>`;
    default: return html`<span>${v}</span>`;
  }
}
export function scoreMeter(n) {
  const v = Math.round(n || 0);
  const tone = v >= 60 ? 'hot' : v >= 30 ? 'warm' : 'cold';
  return html`<span class="score score-${tone}" title="ניקוד ליד ${v} מתוך 100"><span class="score-bar"><i style="width:${v}%"></i></span><span class="num">${v}</span></span>`;
}
export function recordRef(type, r) {
  if (!r) return html`<span class="nil">—</span>`;
  return html`<a class="ref" href="${recordLink(type, r.id)}">${displayName(type, r)}</a>`;
}

// Input control for a property. `name` defaults to prop.key. Returns Html.
export function propInput(prop, value, { name = prop.key, record, type, autofocus = false, compact = false } = {}) {
  const req = prop.required ? 'required' : '';
  const af = autofocus ? 'autofocus' : '';
  const id = `f_${name}_${Math.random().toString(36).slice(2, 6)}`;
  let control;
  switch (prop.type) {
    case 'textarea':
      control = html`<textarea class="input" id="${id}" name="${name}" rows="${compact ? 3 : 4}" ${raw(req)} ${raw(af)}>${value ?? ''}</textarea>`; break;
    case 'number': case 'money': case 'percent':
      control = html`<input class="input num" id="${id}" type="number" inputmode="decimal" step="any" name="${name}" value="${value ?? ''}" ${raw(req)} ${raw(af)} dir="ltr">`; break;
    case 'date':
      control = html`<input class="input" id="${id}" type="date" name="${name}" value="${toDateInput(value)}" ${raw(req)} ${raw(af)}>`; break;
    case 'datetime':
      control = html`<input class="input" id="${id}" type="datetime-local" name="${name}" value="${toDateTimeInput(value)}" ${raw(req)} ${raw(af)}>`; break;
    case 'email':
      control = html`<input class="input" id="${id}" type="email" name="${name}" value="${value ?? ''}" ${raw(req)} ${raw(af)} dir="ltr" autocomplete="off">`; break;
    case 'phone':
      control = html`<input class="input" id="${id}" type="tel" name="${name}" value="${value ?? ''}" ${raw(req)} ${raw(af)} dir="ltr">`; break;
    case 'url':
      control = html`<input class="input" id="${id}" type="text" inputmode="url" name="${name}" value="${value ?? ''}" ${raw(req)} ${raw(af)} dir="ltr">`; break;
    case 'bool':
      control = html`<label class="switch"><input type="checkbox" id="${id}" name="${name}" ${value ? 'checked' : ''}><span></span></label>`; break;
    case 'select':
      control = html`<select class="input" id="${id}" name="${name}" ${raw(req)} ${raw(af)}><option value="">—</option>${(prop.options || []).map((o) => html`<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`)}</select>`; break;
    case 'multiselect': {
      const set = new Set(Array.isArray(value) ? value : value ? [value] : []);
      control = html`<div class="checks" id="${id}" data-multi="${name}">${(prop.options || []).map((o) => html`<label class="check-pill"><input type="checkbox" name="${name}" value="${o.value}" ${set.has(o.value) ? 'checked' : ''}><span>${o.label}</span></label>`)}</div>`; break;
    }
    case 'user':
      control = html`<select class="input" id="${id}" name="${name}" ${raw(af)}><option value="">לא משויך</option>${store.all('users').filter((u) => u.active !== false || u.id === value).map((u) => html`<option value="${u.id}" ${u.id === value ? 'selected' : ''}>${u.name}</option>`)}</select>`; break;
    case 'pipeline':
      control = html`<select class="input" id="${id}" name="${name}" data-pipeline-for="${type}">${pipelines(type).map((p) => html`<option value="${p.id}" ${p.id === value ? 'selected' : ''}>${p.name}</option>`)}</select>`; break;
    case 'stage': {
      const pid = record?.pipelineId || pipelines(type)[0]?.id;
      control = html`<select class="input" id="${id}" name="${name}" data-stage-for="${type}">${(pipeline(type, pid)?.stages || []).map((s) => html`<option value="${s.id}" ${s.id === value ? 'selected' : ''}>${s.name}${s.probability != null && type === 'deal' ? ` (${s.probability}%)` : ''}</option>`)}</select>`; break;
    }
    default:
      control = html`<input class="input" id="${id}" type="text" name="${name}" value="${value ?? ''}" ${raw(req)} ${raw(af)}>`;
  }
  return html`<div class="field ${prop.type === 'bool' ? 'field-inline' : ''}"><label class="field-label" for="${id}">${prop.label}${prop.required ? html`<span class="req" aria-hidden="true">*</span>` : ''}</label>${control}${prop.help ? html`<p class="field-help">${prop.help}</p>` : ''}</div>`;
}

// Read values for props from a form element. Converts types. Missing => undefined (not included).
export function readProps(formEl, props) {
  const out = {};
  for (const p of props) {
    if (p.type === 'multiselect') {
      const box = formEl.querySelector(`[data-multi="${CSS.escape(p.key)}"]`);
      if (box) out[p.key] = $$('input:checked', box).map((i) => i.value);
      continue;
    }
    const el = formEl.querySelector(`[name="${CSS.escape(p.key)}"]`);
    if (!el) continue;
    if (p.type === 'bool') { out[p.key] = el.checked; continue; }
    let v = el.value;
    if (['number', 'money', 'percent'].includes(p.type)) v = v === '' ? null : Number(v);
    else if (p.type === 'date') v = v ? new Date(`${v}T12:00:00`).toISOString() : null;
    else if (p.type === 'datetime') v = v ? new Date(v).toISOString() : null;
    else if (typeof v === 'string') v = v.trim() || null;
    out[p.key] = v;
  }
  return out;
}

// Keep stage <select> in sync with pipeline <select> inside a form.
export function wirePipelineStage(formEl, type) {
  const ps = formEl.querySelector(`[data-pipeline-for="${type}"]`);
  const ss = formEl.querySelector(`[data-stage-for="${type}"]`);
  if (!ps || !ss) return;
  ps.addEventListener('change', () => {
    const p = pipeline(type, ps.value);
    render(ss, p.stages.map((s) => html`<option value="${s.id}">${s.name}${s.probability != null && type === 'deal' ? ` (${s.probability}%)` : ''}</option>`));
  });
}

// Searchable record picker: resolves to a record id or null.
export function pickRecord(type, { title, exclude = [], onCreate } = {}) {
  return new Promise((res) => {
    let result = null, creating = false;
    const coll = { contact: 'contacts', company: 'companies', deal: 'deals', ticket: 'tickets' }[type];
    const m = modal({
      title: title || 'בחירה', size: 'sm',
      body: html`<input class="input" type="search" placeholder="חיפוש..." autofocus data-q><div class="pick-list" data-list></div>`,
      onClose: () => { if (!creating) res(result); },
    });
    const list = $('[data-list]', m.body);
    const draw = (q = '') => {
      const n = q.trim().toLowerCase();
      const rows = store.all(coll).filter((r) => !exclude.includes(r.id) && (!n || displayName(type, r).toLowerCase().includes(n) || String(r.email || r.domain || '').toLowerCase().includes(n))).slice(0, 40);
      render(list, html`${rows.map((r) => html`<button class="pick-item" data-id="${r.id}">${avatar(displayName(type, r), { size: 'sm' })}<span><b>${displayName(type, r)}</b><small class="muted">${r.email || r.domain || (r.amount != null ? fmt.money(r.amount) : '') || ''}</small></span></button>`)}
        ${!rows.length ? html`<p class="muted pad">לא נמצאו תוצאות</p>` : ''}
        ${onCreate ? html`<button class="pick-item pick-create" data-create>${icon('plus')}<span>יצירה חדשה${n ? ` "${q}"` : ''}</span></button>` : ''}`);
    };
    draw();
    $('[data-q]', m.body).addEventListener('input', (e) => draw(e.target.value));
    list.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-id]');
      if (b) { result = b.dataset.id; m.close(); return; }
      if (e.target.closest('[data-create]')) {
        const q = $('[data-q]', m.body).value.trim();
        creating = true;
        m.close();
        const r = await onCreate(q);
        res(r ? r.id : null);
      }
    });
  });
}

export function setTitle(t) { document.title = t ? `${t} – קשר CRM` : 'קשר CRM'; }
export { icon, html, raw, esc, render, Html, on };
