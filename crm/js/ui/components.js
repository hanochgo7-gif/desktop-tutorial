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
// Open dialogs, top last. Each pushes a history entry so the phone's Back button closes the dialog
// instead of leaving the screen. Typed text is never lost silently: dismissing a changed form asks first.
const stack = [];
addEventListener('popstate', () => {
  const top = stack[stack.length - 1];
  // a link or a save moved to another page (the router closes dialogs itself); only a real Back closes the top one
  if (top && location.hash !== top.hash) return;
  if (top && history.state?.hgModal !== top.id) top.requestClose('back');
  // an entry left by a dialog that closed by navigating (e.g. save -> new lead page): step over it,
  // so one Back press leaves the page
  else if (!top && history.state?.hgModal) history.back();
});
export function focusPage() {
  const h = document.querySelector('#view h1');
  if (!h) return;
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
}
export function closeAllModals() {
  for (const m of [...stack].reverse()) m.close(undefined, { nav: true });
}

export function modal({ title, body, size = 'md', actions = [], onClose, dismissible = true, className = '', kind = 'modal' } = {}) {
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = `ov ov-${kind} ${className}`;
  const id = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  render(wrap, html`
    <div class="ov-backdrop" data-close></div>
    <div class="ov-panel ov-${size}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="ov-head">
        <h2 id="${id}">${title}</h2>
        <button class="btn-icon" data-close aria-label="סגירה">${icon('x')}</button>
      </div>
      <div class="ov-body"></div>
      ${actions.length ? html`<div class="ov-foot">${actions.map((a, i) => html`<button class="btn ${a.kind ? `btn-${a.kind}` : ''}" data-i="${i}" ${a.disabled ? 'disabled' : ''}>${a.icon ? icon(a.icon) : ''}${a.label}</button>`)}</div>` : ''}
    </div>`);
  const bodyEl = $('.ov-body', wrap);
  if (typeof body === 'function') body(bodyEl);
  else if (body instanceof Node) bodyEl.appendChild(body);
  else render(bodyEl, body ?? '');
  let closed = false, dirty = false, asking = false, busy = false;
  bodyEl.addEventListener('input', (e) => { if (e.target.matches('input:not([type=search]), textarea, select')) dirty = true; });
  bodyEl.addEventListener('hg:saved', () => { dirty = false; }); // a form inside the dialog saved its own data
  bodyEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.closest('.spend-form')) return; // forms with their own submit handler
    wrap.querySelector('.ov-foot .btn-primary')?.click();
  });
  const onUnload = (e) => { if (dirty && $('form', bodyEl)) { e.preventDefault(); e.returnValue = ''; } };
  addEventListener('beforeunload', onUnload);
  const entry = { id, hash: location.hash };
  const close = (result, { nav = false, fromBack = false } = {}) => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(entry), 1);
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('beforeunload', onUnload);
    wrap.classList.add('leaving');
    wrap.inert = true; // a second tap during the closing animation does nothing
    setTimeout(() => wrap.remove(), 160);
    // drop our history entry unless the user already went back, or we're closing because of navigation
    if (!fromBack && !nav && history.state?.hgModal === id) {
      pendingBack = new Promise((res) => { addEventListener('popstate', () => res(), { once: true }); setTimeout(res, 500); });
      history.back();
    }
    onClose?.(result);
    if (!nav) {
      if (prevFocus && document.contains(prevFocus) && prevFocus !== document.body) prevFocus.focus?.();
      else focusPage();
    }
  };
  const requestClose = async (why) => {
    if (closed || asking) return;
    if (!dismissible && why !== 'back') return;
    if (dirty && $('form', bodyEl)) {
      asking = true;
      if (why === 'back') history.pushState({ hgModal: id }, ''); // stay until the user decides
      const ok = await confirmDialog('לסגור בלי לשמור? מה שהקלדתם יימחק.', { title: 'יש שינויים שלא נשמרו', okLabel: 'סגירה בלי שמירה', danger: true });
      asking = false;
      if (!ok) return;
      close(undefined);
      return;
    }
    close(undefined, { fromBack: why === 'back' });
  };
  entry.close = close;
  entry.requestClose = requestClose;
  const onKey = (e) => {
    if (!document.contains(wrap) || stack[stack.length - 1] !== entry) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); requestClose('escape'); }
    // Enter in a field saves, in every dialog (implicit submit only works for forms with a submit button)
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])')
      && bodyEl.contains(e.target) && !e.target.closest('.spend-form, [data-enter-off]')) {
      const primary = wrap.querySelector('.ov-foot .btn-primary');
      if (primary) { e.preventDefault(); primary.click(); }
    }
    trapFocus(wrap, e);
  };
  document.addEventListener('keydown', onKey, true);
  wrap.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href]');
    if (link && e.target.closest('[data-close]')) { close(undefined, { nav: true }); return; }
    if (e.target.closest('[data-close]')) { requestClose(e.target.classList.contains('ov-backdrop') ? 'backdrop' : 'x'); return; }
    const b = e.target.closest('.ov-foot [data-i]');
    if (b) {
      if (closed || busy) return; // double tap: one save only
      const a = actions[Number(b.dataset.i)];
      if (a.onClick) {
        busy = true;
        b.disabled = true;
        try {
          const r = await a.onClick({ el: wrap, body: bodyEl, close });
          if (r !== false && a.close !== false) close(r);
        } finally { busy = false; if (!closed) b.disabled = false; }
      } else close(a.value);
    }
  });
  layer().appendChild(wrap);
  stack.push(entry);
  history.pushState({ hgModal: id }, '');
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
// The latest toast's action (usually "undo") also runs with Ctrl/⌘+Z, so it is reachable without hunting for the toast.
let lastAction = null;
// A dialog that closes steps back over its history entry; navigating before that lands back on the old page.
let pendingBack = null;
export async function navigateAfterModals(hash) {
  if (pendingBack) await pendingBack;
  pendingBack = null;
  location.hash = hash;
}
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && lastAction && !e.target.closest('input, textarea')) { e.preventDefault(); lastAction.run(); }
});
export function toast(message, { kind = 'info', action, timeout = 4500 } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  render(el, html`${icon(kind === 'success' ? 'check' : kind === 'error' ? 'alert' : 'info')}<span>${message}</span>${action ? html`<button class="toast-act" title="${action.label} (Ctrl+Z)">${action.label}</button>` : ''}<button class="btn-icon toast-x" aria-label="סגירה">${icon('x')}</button>`);
  const close = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 200); if (lastAction?.el === el) lastAction = null; };
  el.querySelector('.toast-x').onclick = close;
  if (action) {
    el.querySelector('.toast-act').onclick = () => { action.onClick(); close(); };
    el.querySelector('.toast-act').setAttribute('aria-keyshortcuts', 'Control+Z');
    lastAction = { el, run: () => { action.onClick(); close(); } };
  }
  // at most two toasts at a time: older ones (and their undo buttons) go away
  while (root.children.length >= 2) {
    const old = root.firstElementChild;
    if (lastAction?.el === old) lastAction = null; // Ctrl+Z must not undo something no longer on screen
    old.remove();
  }
  root.appendChild(el);
  let left = timeout ? (action ? Math.max(timeout, 10000) : timeout) : 0, t0 = Date.now(), timer = null;
  const arm = () => { if (left > 0) { t0 = Date.now(); timer = setTimeout(close, left); } };
  const pause = () => { clearTimeout(timer); left -= Date.now() - t0; };
  el.addEventListener('mouseenter', pause); el.addEventListener('mouseleave', arm);
  el.addEventListener('focusin', pause); el.addEventListener('focusout', arm);
  arm();
  close.el = el; // for progress messages that update their text
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
  return html`<div class="tabs" role="tablist">${items.map((t) => html`<button role="tab" class="tab ${t.id === active ? 'active' : ''}" aria-selected="${String(t.id === active)}" ${raw(attr)}="${t.id}">${t.icon ? icon(t.icon) : ''}${t.label}${t.count != null ? html`<span class="tab-count">${fmt.number(t.count)}</span>` : ''}</button>`)}</div>`;
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
    else if (el.type === 'datetime-local' || el.type === 'date') {
      const d = new Date(el.type === 'date' ? `${v}T12:00:00` : v);
      if (isNaN(d) || d.getFullYear() < 2000 || d.getFullYear() > 2100) { out[el.name] = { invalid: true }; continue; }
      if (el.type === 'datetime-local') v = d.toISOString();
    }
    out[el.name] = v;
  }
  return out;
}
// Fields readForm marked as invalid dates, as { name: message } for showFieldErrors.
export function dateErrors(v) {
  const e = {};
  for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object' && x.invalid) e[k] = 'התאריך לא תקין';
  return e;
}
// Money: non-negative, at most 100 million, and a number at all.
export function moneyErrors(v, keys) {
  const e = {};
  for (const k of keys) {
    const x = v[k];
    if (x == null) continue;
    if (typeof x !== 'number' || !isFinite(x)) e[k] = 'הזינו מספר';
    else if (x < 0) e[k] = 'הסכום לא יכול להיות שלילי';
    else if (x > 1e8) e[k] = 'הסכום גבוה מדי. בדקו שוב';
  }
  return e;
}
export function showFieldErrors(form, errors) {
  $$('.field-err', form).forEach((x) => x.remove());
  $$('.field.invalid', form).forEach((x) => x.classList.remove('invalid'));
  $$('[aria-invalid]', form).forEach((x) => { x.removeAttribute('aria-invalid'); x.setAttribute('aria-describedby', (x.getAttribute('aria-describedby') || '').split(' ').filter((t) => !t.endsWith('-err')).join(' ')); });
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input?.closest('.field');
    if (!field) continue;
    field.classList.add('invalid');
    const p = document.createElement('p');
    p.className = 'field-err'; p.setAttribute('role', 'alert'); p.textContent = msg;
    p.id = `${input.id || name}-err`;
    field.appendChild(p);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), p.id].filter(Boolean).join(' '));
    first ||= input;
  }
  first?.focus();
  return !!first;
}
export const opt = (list, cur, { empty } = {}) => html`${empty != null ? html`<option value="">${empty}</option>` : ''}${list.map((o) => {
  const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label;
  return html`<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
})}`;
