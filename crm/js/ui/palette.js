// Command palette (Ctrl/⌘+K): search every record and jump to any screen or action.

import { html, render, $, $$, esc, raw, normalize, fmt } from '../core/util.js';
import { store } from '../core/store.js';
import { OBJECTS, OBJECT_TYPES, displayName, recordLink } from '../core/schema.js';
import { modal, icon, avatar } from './components.js';
import { openCreate } from './recordForm.js';

const PAGES = [
  { label: 'לוח בקרה', href: '#/dashboard', icon: 'dashboard', kw: 'dashboard בית' },
  { label: 'אנשי קשר', href: '#/contacts', icon: 'user', kw: 'contacts לקוחות לידים' },
  { label: 'חברות', href: '#/companies', icon: 'building', kw: 'companies ארגונים' },
  { label: 'עסקאות', href: '#/deals', icon: 'deal', kw: 'deals pipeline צינור מכירות' },
  { label: 'פניות שירות', href: '#/tickets', icon: 'ticket', kw: 'tickets תמיכה' },
  { label: 'משימות', href: '#/tasks', icon: 'task', kw: 'tasks todo' },
  { label: 'יומן', href: '#/calendar', icon: 'calendar', kw: 'calendar פגישות' },
  { label: 'דוחות', href: '#/reports', icon: 'report', kw: 'reports analytics' },
  { label: 'תהליכים אוטומטיים', href: '#/workflows', icon: 'workflow', kw: 'workflows automation אוטומציה' },
  { label: 'רצפי מיילים', href: '#/sequences', icon: 'sequence', kw: 'sequences' },
  { label: 'תבניות מייל', href: '#/templates', icon: 'template', kw: 'templates' },
  { label: 'טפסים', href: '#/forms', icon: 'form', kw: 'forms לידים' },
  { label: 'מוצרים', href: '#/products', icon: 'box', kw: 'products קטלוג' },
  { label: 'הצעות מחיר', href: '#/quotes', icon: 'quote', kw: 'quotes' },
  { label: 'ייבוא נתונים', href: '#/import', icon: 'upload', kw: 'import csv excel' },
  { label: 'איתור כפילויות', href: '#/duplicates', icon: 'merge', kw: 'duplicates מיזוג' },
  { label: 'סל מחזור', href: '#/trash', icon: 'trash', kw: 'trash restore שחזור' },
  { label: 'הגדרות', href: '#/settings', icon: 'settings', kw: 'settings' },
];

export function openPalette() {
  if (document.querySelector('.palette')) return;
  let items = [];
  let active = 0;
  const m = modal({
    title: 'חיפוש', size: 'md', className: 'palette',
    body: html`<div class="pal-input">${icon('search')}<input type="text" placeholder="חיפוש אנשי קשר, חברות, עסקאות, מסכים ופעולות..." autofocus aria-label="חיפוש" role="combobox" aria-expanded="true" aria-controls="pal-res"></div>
      <div class="pal-results" id="pal-res" role="listbox"></div>
      <div class="pal-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> מעבר</span><span><kbd>Enter</kbd> פתיחה</span><span><kbd>Esc</kbd> סגירה</span></div>`,
  });
  const input = $('input', m.body);
  const res = $('.pal-results', m.body);

  const hl = (text, q) => {
    if (!q) return esc(text);
    const t = String(text);
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(t);
    return `${esc(t.slice(0, i))}<mark>${esc(t.slice(i, i + q.length))}</mark>${esc(t.slice(i + q.length))}`;
  };

  const draw = () => {
    const q = input.value.trim();
    const n = normalize(q);
    items = [];
    const groups = [];
    if (n) {
      for (const type of OBJECT_TYPES) {
        const meta = OBJECTS[type];
        const hits = [];
        for (const r of store.all(meta.coll)) {
          const name = displayName(type, r);
          const extra = r.email || r.domain || r.phone || '';
          if (normalize(name).includes(n) || normalize(extra).includes(n) || (r.phone && normalize(r.phone).includes(n))) {
            hits.push({ kind: 'rec', type, r, name, sub: type === 'deal' ? fmt.money(r.amount) : extra, href: recordLink(type, r.id) });
            if (hits.length >= 6) break;
          }
        }
        if (hits.length) groups.push({ label: meta.plural, items: hits });
      }
    }
    const actions = [
      { kind: 'act', label: 'איש קשר חדש', icon: 'plus', run: () => openCreate('contact') },
      { kind: 'act', label: 'חברה חדשה', icon: 'plus', run: () => openCreate('company') },
      { kind: 'act', label: 'עסקה חדשה', icon: 'plus', run: () => openCreate('deal') },
      { kind: 'act', label: 'פנייה חדשה', icon: 'plus', run: () => openCreate('ticket') },
    ].filter((a) => !n || normalize(a.label).includes(n));
    const pages = PAGES.filter((p) => !n || normalize(p.label).includes(n) || normalize(p.kw).includes(n)).map((p) => ({ kind: 'page', ...p }));
    if (actions.length) groups.push({ label: 'פעולות', items: actions });
    if (pages.length) groups.push({ label: 'מסכים', items: n ? pages : pages.slice(0, 8) });
    for (const g of groups) items.push(...g.items);
    active = Math.min(active, Math.max(0, items.length - 1));
    let i = 0;
    render(res, groups.length ? groups.map((g) => html`<div class="pal-group">${g.label}</div>${g.items.map((it) => {
      const idx = i++;
      return html`<div class="pal-item ${idx === active ? 'active' : ''}" role="option" aria-selected="${idx === active}" data-idx="${idx}">
        ${it.kind === 'rec' ? avatar(it.name, { size: 'sm' }) : icon(it.icon)}
        <div class="grow"><div>${raw(hl(it.label || it.name, q))}</div>${it.sub ? html`<small>${raw(hl(it.sub, q))}</small>` : ''}</div>
        ${it.kind === 'rec' ? html`<span class="muted small">${OBJECTS[it.type].singular}</span>` : ''}
      </div>`;
    })}`) : html`<p class="muted pad">אין תוצאות ל"${q}"</p>`);
  };
  const choose = (idx) => {
    const it = items[idx];
    if (!it) return;
    m.close();
    if (it.run) it.run();
    else location.hash = it.href;
  };
  input.addEventListener('input', () => { active = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(items.length - 1, active + 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
    if (e.key === 'Enter') { choose(active); e.preventDefault(); }
    $('.pal-item.active', res)?.scrollIntoView({ block: 'nearest' });
  });
  res.addEventListener('click', (e) => { const el = e.target.closest('[data-idx]'); if (el) choose(Number(el.dataset.idx)); });
  res.addEventListener('mousemove', (e) => {
    const el = e.target.closest('[data-idx]');
    if (el && Number(el.dataset.idx) !== active) { active = Number(el.dataset.idx); $$('.pal-item', res).forEach((x) => x.classList.toggle('active', x === el)); }
  });
  draw();
}
