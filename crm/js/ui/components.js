// UI kit: overlays (modal, drawer, menu, toast, confirm), property inputs and value display, small atoms.

import { html, raw, render, esc, $, $$, on, fmt, initials, hueFor, Html } from '../core/util.js';
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

export function setTitle(t) { document.title = t ? `${t} – HG OS` : 'HG OS'; }
export { icon, html, raw, esc, render, Html, on };

// Read a form into a plain object: empty strings become null, numbers/dates converted by data-type on the input.
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') { out[el.name] = el.checked; continue; }
    if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; continue; }
    let v = el.value.trim();
    if (v === '') { out[el.name] = null; continue; }
    if (el.type === 'number') v = Number(v);
    else if (el.type === 'datetime-local') v = new Date(v).toISOString();
    out[el.name] = v;
  }
  return out;
}
export function showFieldErrors(form, errors) {
  $$('.field-err', form).forEach((x) => x.remove());
  $$('.field.invalid', form).forEach((x) => x.classList.remove('invalid'));
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input?.closest('.field');
    if (!field) continue;
    field.classList.add('invalid');
    const p = document.createElement('p');
    p.className = 'field-err'; p.setAttribute('role', 'alert'); p.textContent = msg;
    field.appendChild(p);
    first ||= input;
  }
  first?.focus();
  return !!first;
}
export const opt = (list, cur, { empty } = {}) => html`${empty != null ? html`<option value="">${empty}</option>` : ''}${list.map((o) => {
  const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label;
  return html`<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
})}`;
