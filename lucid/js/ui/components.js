// Shared UI pieces: icons, status marks, level tags, toasts, dialogs.
import { html, raw, esc } from '../core/util.js';
import { iconSvg } from './icons.js';
import { t, tt } from '../core/i18n.js';

export const icon = (name, opts) => raw(iconSvg(name, opts));

// Status as a mark in a fixed cell: filled (done), half (in progress), hollow (not started), dashed (placed out).
export function mark(status) {
  const cls = { completed: 'done', started: 'half', placed_out: 'out' }[status] || '';
  const label = { completed: tt('הושלם', 'Completed'), started: tt('בתהליך', 'In progress'), placed_out: tt('דולג לפי מבחן המיקום', 'Placed out'), '': tt('טרם התחיל', 'Not started') }[status || ''] || tt('טרם התחיל', 'Not started');
  return html`<span class="mark ${cls}" role="img" aria-label="${label}">${cls === 'done' ? icon('check', { size: 12 }) : ''}</span>`;
}

export const LEVEL_LABEL = { PreA1: 'Pre-A1', A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2' };
export const levelTag = (l) => (l ? html`<span class="tag level">${LEVEL_LABEL[l] || l}</span>` : '');

export function toast(message, { ms = 3200 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  root.append(el);
  setTimeout(() => el.remove(), ms);
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
