// Hash router with lazy-loaded views.
// A view module's default export is `async (el, ctx) => cleanup?`, where
// ctx = { params, query, path, watch(colls, fn), navigate(href), setTitle(text) }.
import { store } from './store.js';
import { hasProfile } from './learner.js';

const ROUTES = [
  ['welcome', () => import('../views/welcome.js'), { bare: true, public: true }],
  ['start', () => import('../views/onboarding.js'), { bare: true, public: true }],
  ['account', () => import('../views/account.js'), { public: true }],
  ['placement', () => import('../views/placement.js'), { bare: true }],
  ['today', () => import('../views/today.js'), { nav: 'today' }],
  ['path', () => import('../views/path.js'), { nav: 'path' }],
  ['path/:level', () => import('../views/path.js'), { nav: 'path' }],
  ['lesson/:id', () => import('../views/lesson.js'), { bare: true }],
  ['checkpoint/:level', () => import('../views/checkpoint.js'), { bare: true }],
  ['review', () => import('../views/review.js'), { bare: true }],
  ['practice', () => import('../views/practice.js'), { nav: 'practice' }],
  ['drill', () => import('../views/drill.js'), { bare: true }],
  ['vocab', () => import('../views/vocab.js'), { nav: 'practice' }],
  ['grammar', () => import('../views/grammar.js'), { nav: 'practice' }],
  ['reading', () => import('../views/reading.js'), { nav: 'practice' }],
  ['listening', () => import('../views/listening.js'), { nav: 'practice' }],
  ['speaking', () => import('../views/speaking.js'), { nav: 'practice' }],
  ['writing', () => import('../views/writing.js'), { nav: 'practice' }],
  ['writing/:id', () => import('../views/essay.js'), { nav: 'practice' }],
  ['tutor', () => import('../views/tutor.js'), { nav: 'practice' }],
  ['real-life', () => import('../views/reallife.js'), { nav: 'reallife' }],
  ['scenario/:id', () => import('../views/scenario.js'), { nav: 'reallife' }],
  ['expressions', () => import('../views/slang.js'), { nav: 'reallife' }],
  ['conversations', () => import('../views/simulations.js'), { nav: 'reallife' }],
  ['progress', () => import('../views/progress.js'), { nav: 'progress' }],
  ['profile', () => import('../views/profile.js'), { nav: 'progress' }],
  ['settings', () => import('../views/settings.js'), { nav: 'settings' }],
];

const compiled = ROUTES.map(([pattern, load, extra = {}]) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  return { pattern, re, keys, load, extra };
});

export function parse() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs = ''] = h.split('?');
  return { path: path.replace(/\/$/, ''), query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function navigate(href, { replace = false } = {}) {
  const target = href.startsWith('#') ? href : `#/${href.replace(/^\//, '')}`;
  if (replace) { history.replaceState(null, '', target); router.go(); return; }
  if (location.hash !== target) { location.hash = target; return; }
  router.go();
}

export const router = {
  current: null,
  onRoute: null, // set by app: (route) => void
  async go() {
    let { path, query } = parse();
    if (!path) path = hasProfile() ? 'today' : 'welcome';
    let match = compiled.find((r) => r.re.test(path));
    if (!match) { navigate(hasProfile() ? 'today' : 'welcome', { replace: true }); return; }
    if (!match.extra.public && !hasProfile()) { navigate('welcome', { replace: true }); return; }
    if ((path === 'welcome' || path === 'start') && hasProfile() && !query.again) { navigate('today', { replace: true }); return; }
    const root = document.getElementById('view');
    if (this.current?.cleanup) { try { this.current.cleanup(); } catch (e) { console.error(e); } }
    this.current?.unwatch?.forEach((u) => u());
    const params = {};
    match.re.exec(path).slice(1).forEach((v, i) => { params[match.keys[i]] = v; });
    const state = { path, pattern: match.pattern, params, query, extra: match.extra, unwatch: [], cleanup: null };
    this.current = state;
    this.onRoute?.(state);
    let mod;
    try { mod = await match.load(); } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="empty"><h3>${document.documentElement.lang === 'he' ? 'המסך לא נטען' : 'This screen did not load'}</h3><p>${navigator.onLine ? '' : (document.documentElement.lang === 'he' ? 'אין חיבור לאינטרנט.' : 'You are offline.')}</p><a class="key" href="">${document.documentElement.lang === 'he' ? 'טעינה מחדש' : 'Reload'}</a></div>`;
      return;
    }
    if (this.current !== state) return;
    const ctx = {
      params, query, path,
      navigate,
      watch: (colls, fn) => {
        const set = new Set(colls);
        state.unwatch.push(store.on('change', (ev) => { if (this.current === state && ev.colls?.some((c) => set.has(c))) fn(ev); }));
      },
      setTitle: (text) => { document.title = text ? `${text} · Lucid` : 'Lucid'; const el = document.getElementById('top-title'); if (el) el.textContent = text || ''; },
    };
    root.innerHTML = '<div class="boot"><span class="spinner" role="status" aria-label="…"></span></div>';
    try {
      state.cleanup = (await mod.default(root, ctx)) || null;
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="empty"><h3>${document.documentElement.lang === 'he' ? 'משהו השתבש' : 'Something went wrong'}</h3><p class="small faint">${String(e.message || e).replace(/[<>&]/g, '')}</p><a class="key" href="#/today">${document.documentElement.lang === 'he' ? 'חזרה להיום' : 'Back to Today'}</a></div>`;
    }
    if (!query.keepScroll) window.scrollTo(0, 0);
    if (state.extra.bare) root.focus({ preventScroll: true });
  },
  start() {
    addEventListener('hashchange', () => this.go());
    return this.go();
  },
};
