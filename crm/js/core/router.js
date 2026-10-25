// Hash router with lazy-loaded views.
// A view module's default export is `async (el, ctx) => cleanup?`, where
// ctx = { params, query, path, watch(colls, fn), refresh(), navigate(href) }.

import { store } from './store.js';

const ROUTES = [
  ['dashboard', () => import('../views/dashboard.js')],
  ['contacts', () => import('../views/objects.js'), { type: 'contact' }],
  ['companies', () => import('../views/objects.js'), { type: 'company' }],
  ['deals', () => import('../views/objects.js'), { type: 'deal' }],
  ['tickets', () => import('../views/objects.js'), { type: 'ticket' }],
  ['r/:type/:id', () => import('../views/record.js')],
  ['tasks', () => import('../views/tasks.js')],
  ['calendar', () => import('../views/calendar.js')],
  ['reports', () => import('../views/reports.js')],
  ['reports/:id', () => import('../views/reports.js')],
  ['workflows', () => import('../views/workflows.js')],
  ['workflows/:id', () => import('../views/workflows.js')],
  ['sequences', () => import('../views/sequences.js')],
  ['sequences/:id', () => import('../views/sequences.js')],
  ['templates', () => import('../views/templates.js')],
  ['forms', () => import('../views/forms.js')],
  ['forms/:id', () => import('../views/forms.js')],
  ['f/:id', () => import('../views/form-public.js'), { bare: true }],
  ['products', () => import('../views/products.js')],
  ['quotes', () => import('../views/quotes.js')],
  ['quotes/:id', () => import('../views/quotes.js')],
  ['quotes/:id/print', () => import('../views/quote-print.js'), { bare: true }],
  ['import', () => import('../views/import.js')],
  ['duplicates', () => import('../views/duplicates.js')],
  ['trash', () => import('../views/trash.js')],
  ['settings', () => import('../views/settings.js')],
  ['settings/:tab', () => import('../views/settings.js')],
];

const compiled = ROUTES.map(([pattern, load, extra = {}]) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  return { pattern, re, keys, load, extra };
});

function parse() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs = ''] = h.split('?');
  return { path: path.replace(/\/$/, '') || 'dashboard', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function navigate(href, { replace = false } = {}) {
  const target = href.startsWith('#') ? href : `#/${href.replace(/^\//, '')}`;
  if (replace) history.replaceState(null, '', target);
  else if (location.hash !== target) { location.hash = target; return; }
  router.go();
}
// Update the query string without re-rendering (for remembering view state in the URL).
export function setQuery(patch) {
  const { path, query } = parse();
  const q = new URLSearchParams({ ...query, ...patch });
  for (const [k, v] of [...q.entries()]) if (v === '' || v == null || v === 'undefined') q.delete(k);
  const s = q.toString();
  history.replaceState(null, '', `#/${path}${s ? `?${s}` : ''}`);
}

export const router = {
  current: null,
  onRoute: null, // set by app: (route) => void
  async go() {
    const { path, query } = parse();
    const match = compiled.find((r) => r.re.test(path));
    const root = document.getElementById('view');
    if (this.current?.cleanup) { try { this.current.cleanup(); } catch (e) { console.error(e); } }
    this.current?.unwatch?.forEach((u) => u());
    if (!match) { navigate('dashboard', { replace: true }); return; }
    const params = { ...match.extra };
    match.re.exec(path).slice(1).forEach((v, i) => { params[match.keys[i]] = v; });
    const token = Symbol('route');
    const state = { token, path, pattern: match.pattern, params, query, unwatch: [], cleanup: null };
    this.current = state;
    document.body.classList.toggle('bare', !!match.extra.bare);
    this.onRoute?.(state);
    let mod;
    try { mod = await match.load(); } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="empty"><h3>המסך לא נטען</h3><p>${String(e.message || e)}</p></div>`;
      return;
    }
    if (this.current !== state) return;
    const ctx = {
      params, query, path,
      watch: (colls, fn) => {
        const set = new Set(colls);
        const handler = (ev) => { if (this.current === state && (set.has(ev.coll) || ev.colls?.some((c) => set.has(c)))) fn(ev); };
        state.unwatch.push(store.on('change', handler), store.on('remote', handler));
      },
      refresh: () => this.go(),
      navigate,
    };
    root.innerHTML = '';
    root.scrollTop = 0;
    try {
      const cleanup = await mod.default(root, ctx);
      if (this.current === state) state.cleanup = typeof cleanup === 'function' ? cleanup : null;
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="empty"><h3>משהו השתבש בטעינת המסך</h3><p>${String(e.message || e)}</p></div>`;
    }
  },
};
addEventListener('hashchange', () => router.go());
