// Dialogs, side panels, confirmations and toasts. Dialogs use <dialog> (focus trap, Escape, backdrop for free).
import { h } from './dom.js';
import { icon } from './icons.js';
import { errorText } from '../core/format.js';

let toastHost;
export function toast(message, tone = 'good', ms = 4200) {
  if (!toastHost) { toastHost = h('div.toasts', { role: 'status', 'aria-live': 'polite' }); document.body.append(toastHost); }
  const t = h('div.toast', { class: `toast--${tone}` }, icon(tone === 'bad' ? 'alert' : tone === 'warn' ? 'info' : 'check', 16), h('span', message));
  toastHost.append(t);
  setTimeout(() => { t.classList.add('toast--out'); setTimeout(() => t.remove(), 220); }, ms);
}
export const toastError = (e) => toast(errorText(e), 'bad', 7000);

// modal({title, body, actions:[{label, kind, onClick(close) → Promise|void}], wide, side}) → {el, close}
export function modal({ title, body, actions = [], wide = false, side = false, onClose } = {}) {
  const d = h('dialog.modal', { class: [wide && 'modal--wide', side && 'modal--side'].filter(Boolean).join(' '), 'aria-labelledby': 'mdl-t' });
  const close = () => { d.close(); };
  d.addEventListener('close', () => { d.remove(); onClose?.(); });
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  const foot = h('div.modal__foot');
  for (const a of actions) {
    const b = h('button.btn', { type: a.submit ? 'submit' : 'button', class: a.kind ? `btn--${a.kind}` : '' }, a.label);
    b.addEventListener('click', async (e) => {
      if (!a.onClick) return close();
      e.preventDefault();
      if (b.disabled) return;
      b.disabled = true; b.classList.add('is-busy');
      try { const r = await a.onClick(close); if (r !== false && a.closes !== false) close(); }
      catch (err) { toastError(err); }
      finally { b.disabled = false; b.classList.remove('is-busy'); }
    });
    foot.append(b);
  }
  d.append(
    h('div.modal__head', h('h2#mdl-t', title), h('button.iconbtn', { type: 'button', 'aria-label': 'סגירה', onclick: close }, icon('x'))),
    h('div.modal__body', body),
    actions.length ? foot : null,
  );
  document.body.append(d);
  d.showModal();
  const first = d.querySelector('.modal__body input:not([type=hidden]), .modal__body select, .modal__body textarea');
  if (first) first.focus();
  return { el: d, close };
}

export function confirmDialog({ title, text, confirm = 'אישור', danger = false, reason = false, reasonLabel = 'סיבה' }) {
  return new Promise((resolve) => {
    let done = false;
    const ta = reason ? h('textarea.input', { rows: 3, required: true, id: 'cf-reason' }) : null;
    const body = h('div', text ? h('p.muted', text) : null, reason ? h('label.field', h('span.field__label', reasonLabel), ta) : null);
    modal({
      title, body,
      onClose: () => { if (!done) resolve(null); },
      actions: [
        { label: 'ביטול' },
        { label: confirm, kind: danger ? 'danger' : 'primary', onClick: () => {
          if (reason && !ta.value.trim()) { ta.focus(); ta.setAttribute('aria-invalid', 'true'); return false; }
          done = true; resolve(reason ? ta.value.trim() : true);
        } },
      ],
    });
  });
}
