// Page-level pieces shared by every screen.
import { h } from './dom.js';
import { icon } from './icons.js';
import { statusLabel, statusTone } from '../core/format.js';

// Page header: title, optional subtitle/meta line, actions at the inline end. crumbs: [[label, href], ...]
export function pageHeader({ title, sub, actions = [], crumbs = [] }) {
  return h('header.page__head',
    crumbs.length ? h('nav.crumbs', { 'aria-label': 'מיקום' }, h('ol', crumbs.map(([l, href], i) => h('li', href && i < crumbs.length - 1 ? h('a', { href }, l) : h('span', { 'aria-current': i === crumbs.length - 1 ? 'page' : null }, l))))) : null,
    h('div.page__titlerow', h('div', h('h1.page__title', title), sub ? h('p.page__sub', sub) : null), actions.length ? h('div.page__actions', actions) : null));
}
export const badge = (kind, status) => h('span.badge', { class: `badge--${statusTone(kind, status)}` }, statusLabel(kind, status));
export const tone = (label, t = 'neutral') => h('span.badge', { class: `badge--${t}` }, label);

// A button. kind: primary | ghost | danger | (default secondary)
export function button(label, onClick, { kind, ic, small, href, disabled, title } = {}) {
  const kids = [ic ? icon(ic, small ? 15 : 17) : null, label];
  if (href) return h('a.btn', { href, class: [kind && `btn--${kind}`, small && 'btn--sm'].filter(Boolean).join(' ') }, kids);
  const b = h('button.btn', { type: 'button', class: [kind && `btn--${kind}`, small && 'btn--sm'].filter(Boolean).join(' '), disabled, title }, kids);
  if (onClick) b.addEventListener('click', async (e) => {
    if (b.disabled) return;
    b.disabled = true; b.classList.add('is-busy');
    try { await onClick(e); } finally { b.disabled = false; b.classList.remove('is-busy'); }
  });
  return b;
}

// A section of a page with an optional heading row and actions.
export function section(title, body, { actions = [], id, note } = {}) {
  return h('section.sec', { id, 'aria-labelledby': id ? id + '-t' : null },
    title ? h('div.sec__head', h('h2.sec__title', { id: id ? id + '-t' : null }, title), note ? h('span.sec__note', note) : null, actions.length ? h('div.sec__actions', actions) : null) : null,
    body);
}

// KPI as type: label, big figure, small context line. Optional link to the records behind it.
export function kpi(label, value, { sub, href, tone: t } = {}) {
  const inner = [h('span.kpi__label', label), h('span.kpi__value', { class: t ? `is-${t}` : '' }, value), sub ? h('span.kpi__sub', sub) : null];
  return href ? h('a.kpi', { href }, inner) : h('div.kpi', inner);
}

// Definition list: [[label, value], ...]
export const facts = (pairs) => h('dl.facts', pairs.filter(Boolean).map(([k, v]) => h('div.facts__row', h('dt', k), h('dd', v ?? h('span.dash', '—')))));

// Tabs with hash-free state: tabs([{id, label, render()}], active, onChange)
export function tabs(list, active, onChange) {
  const bar = h('div.tabs', { role: 'tablist' });
  const panel = h('div.tabpanel', { role: 'tabpanel' });
  function show(id) {
    const t = list.find((x) => x.id === id) || list[0];
    bar.querySelectorAll('[role=tab]').forEach((b) => { const on = b.dataset.id === t.id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    panel.replaceChildren();
    const out = t.render();
    if (out instanceof Promise) { panel.append(skeleton(4)); out.then((n) => panel.replaceChildren(n)); } else panel.append(out);
    onChange?.(t.id);
  }
  list.forEach((t) => bar.append(h('button.tab', { type: 'button', role: 'tab', dataset: { id: t.id }, onclick: () => show(t.id),
    onkeydown: (e) => {
      const i = list.findIndex((x) => x.id === t.id);
      const n = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : null;     // RTL: left is next
      if (n !== null) { const nt = list[(n + list.length) % list.length]; show(nt.id); bar.querySelector(`[data-id="${nt.id}"]`).focus(); }
    } }, t.label, t.count !== undefined ? h('span.tab__count', String(t.count)) : null)));
  const el = h('div', bar, panel);
  show(active);
  return el;
}

export const skeleton = (lines = 6) => h('div.skel', { 'aria-busy': 'true', 'aria-label': 'טוען' }, Array.from({ length: lines }, (_, i) => h('span.skel__line', { style: { width: `${92 - (i % 3) * 18}%` } })));
export const empty = (title, text, action) => h('div.empty', h('p.empty__title', title), text ? h('p.muted', text) : null, action || null);
export const note = (text, t = 'info') => h('div.note', { class: `note--${t}`, role: t === 'bad' ? 'alert' : null }, icon(t === 'bad' || t === 'warn' ? 'alert' : 'info', 16), h('div', text));
export const avatar = (name = '?') => {
  const s = String(name).trim(); const hue = [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return h('span.avatar', { style: { background: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 40% 28%)` }, 'aria-hidden': 'true' }, s.charAt(0));
};
