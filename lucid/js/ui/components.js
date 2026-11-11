// Shared UI pieces: icons, status marks, level tags, toasts, dialogs.
import { html, raw, esc } from '../core/util.js';
import { iconSvg } from './icons.js';
import { t, tt } from '../core/i18n.js';

export const icon = (name, opts) => raw(iconSvg(name, opts));

// Status as a mark in a fixed cell: filled (done), half (in progress), hollow (not started), dashed (placed out).
export function mark(status) {
  const cls = { completed: 'done', started: 'half', placed_out: 'out' }[status] || '';
  const label = { completed: tt('הושלם', 'Completed'), started: tt('בתהליך', 'In progress'), placed_out: tt('דילגתם על השיעור', 'Placed out'), '': tt('טרם התחיל', 'Not started') }[status || ''] || tt('טרם התחיל', 'Not started');
  return html`<span class="mark ${cls}" role="img" aria-label="${label}">${cls === 'done' ? icon('check', { size: 12 }) : ''}</span>`;
}

export const LEVEL_LABEL = { PreA1: 'Pre-A1', A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2' };
export const levelTag = (l) => (l ? html`<span class="tag level">${LEVEL_LABEL[l] || l}</span>` : '');

// A toast never covers a key (SB-9). In a player it sits just above the answer footer (SC-6); elsewhere above any
// primary key in the lower half of the screen (the placement result's "לתוכנית של היום"); and it moves above the
// keys passed as `avoid` (the play keys a "can't hear" note is about) when it would cover them. Returns the toast.
export function toast(message, { ms = 3200, avoid = [] } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return null;
  const foot = document.querySelector('.player-foot');
  const top = foot && !foot.hidden ? foot.getBoundingClientRect().top : 0;
  let bottom = null;
  if (top > 0 && top < innerHeight) bottom = innerHeight - top + 8;
  else {
    const keys = [...document.querySelectorAll('.key.enter')].map((k) => k.getBoundingClientRect()).filter((r) => r.width && r.top >= innerHeight / 2 && r.bottom <= innerHeight);
    if (keys.length) bottom = innerHeight - Math.min(...keys.map((r) => r.top)) + 8;
  }
  root.style.bottom = bottom != null ? `${Math.round(bottom)}px` : '';
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  el.dataset.at = String(Date.now());
  root.append(el);
  const rects = avoid.filter((x) => x?.isConnected).map((x) => x.getBoundingClientRect()).filter((r) => r.width);
  const box = el.getBoundingClientRect();
  if (rects.some((r) => r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top)) {
    // Above the keys when there is room, otherwise just under them.
    const above = Math.min(...rects.map((r) => r.top)), below = Math.max(...rects.map((r) => r.bottom));
    root.style.bottom = `${Math.round(above - box.height - 8 > 0 ? innerHeight - above + 8 : Math.max(8, innerHeight - below - box.height - 8))}px`;
  }
  setTimeout(() => el.remove(), ms);
  return el;
}
// A toast is about the screen it was shown on: a new screen removes it (on every route render since SB-9, so a
// replaced address counts too), and it never covers the first exercise of a lesson (persona panel Y13). A toast
// shown just before the navigation (for example "Restored", then Today) stays.
export function clearToasts(olderThan = 500) {
  const now = Date.now();
  document.querySelectorAll('#toast-root .toast').forEach((x) => { if (now - Number(x.dataset.at || 0) > olderThan) x.remove(); });
}
if (typeof addEventListener === 'function') addEventListener('hashchange', () => clearToasts());

// SB-6: the columns of a segmented control that cannot hold its segments on one line: as many equal cells as the
// widest label allows, balanced across the rows (4 segments in 2 + 2, not 3 + 1; 9 in 3 + 3 + 3, not 4 + 4 + 1).
export function segColumns(n, inner, widest, gap = 0) {
  const fit = Math.max(1, Math.min(n, Math.floor((inner + gap) / (widest + gap))));
  return Math.ceil(n / Math.ceil(n / fit));
}

// A native <dialog>: focus is trapped and restored by the browser; Esc closes.
export function openDialog(content, { onClose, label = '' } = {}) {
  const d = document.createElement('dialog');
  d.className = 'sheet';
  if (label) d.setAttribute('aria-label', label);
  d.innerHTML = `<div class="panel">${content}</div>`;
  document.getElementById('overlay-root').append(d);
  d.addEventListener('close', () => { d.remove(); onClose?.(d.returnValue); });
  d.addEventListener('click', (e) => { if (e.target === d) d.close('dismiss'); });
  d.showModal();
  return d;
}

export function confirmDialog({ title, body, confirm, cancel = t('cancel'), danger = false }) {
  return new Promise((resolve) => {
    const d = openDialog(`
      <div class="stack">
        <h2>${esc(title)}</h2>
        ${body ? `<p class="muted">${esc(body)}</p>` : ''}
        <div class="row" style="justify-content:flex-end">
          <button class="key ghost" value="no" data-close>${esc(cancel)}</button>
          <button class="key ${danger ? 'danger' : 'enter'}" value="yes" data-close>${esc(confirm)}</button>
        </div>
      </div>`, { onClose: (v) => resolve(v === 'yes'), label: title });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close(b.value)));
  });
}

export function emptyState({ title, body, action }) {
  return html`<div class="empty"><h2 class="h3">${title}</h2>${body ? html`<p>${body}</p>` : ''}${action || ''}</div>`;
}

// The brand mark: an Enter-coloured keycap with a dual legend, L and ל.
export function brandMark() {
  return html`<span class="brand-key" aria-hidden="true">L<small lang="he">ל</small></span>`;
}
