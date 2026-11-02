// Hash router with lazy-loaded views.
// A view module's default export is `async (el, ctx) => cleanup?`, where
// ctx = { params, query, path, from, watch(colls, fn), navigate(href), setTitle(text) }, where `from` is the
// hash of the screen the learner came from (the account screen uses it to return there after signing in).
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
  ['games', () => import('../views/wordgame.js'), { nav: 'practice' }],
  ['games/pictures/:level', () => import('../views/picturegame.js'), { bare: true }],
  ['games/memory/:level', () => import('../views/memorygame.js'), { bare: true }],
  ['games/:level/:stage', () => import('../views/wordgame.js'), { bare: true }],
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
  ['help', () => import('../views/help.js'), { nav: 'help', public: true }],
];

const compiled = ROUTES.map(([pattern, load, extra = {}]) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  return { pattern, re, keys, load, extra };
});

// The path is decoded on its own and the query by URLSearchParams, so an encoded "?" or "&" inside a value
// (such as ?next=scenario%2Fx%3Ftab%3Droleplay) stays inside it. A malformed escape in the path (for example
// "#/%E0%A4%A") must not stop the app from starting: it is reported as malformed and the route replaced.
export function parse(hash = location.hash) {
  const h = hash.replace(/^#\/?/, '');
  const i = h.indexOf('?');
  let path = i < 0 ? h : h.slice(0, i);
  try { path = decodeURIComponent(path); } catch { return { path: '', query: {}, malformed: true }; }
  return { path: path.replace(/\/$/, ''), query: Object.fromEntries(new URLSearchParams(i < 0 ? '' : h.slice(i + 1))) };
}

export const hrefOf = ({ path, query = {} }) => {
  const qs = new URLSearchParams(query).toString();
  return `#/${path}${qs ? `?${qs}` : ''}`;
};

export function navigate(href, { replace = false } = {}) {
  const target = href.startsWith('#') ? href : `#/${href.replace(/^\//, '')}`;
  if (replace) { history.replaceState(null, '', target); router.go(); return; }
  if (location.hash !== target) { location.hash = target; return; }
  router.go();
}

// The top bar of the Hebrew UI speaks Hebrew (SC-9): a content title with no Hebrew letters ("Free writing", a
// scenario's English name) gives way to the name of its section; the page heading below still carries it.
const HEBREW = /[֐-׿]/;
export function topTitle(title, { lang = 'he', section = '' } = {}) {
  const text = String(title || '');
  return lang === 'he' && text && !HEBREW.test(text) && section ? section : text;
}
// The section a route belongs to, as [href, label key] from the shell's lists: a lab first (its own entry), then the
// main entry the route lights up, then Settings and Help.
export function sectionOf(route, nav = [], labs = []) {
  const path = route?.path || '';
  const lab = labs.find(([href]) => path === href || path.startsWith(`${href}/`));
  if (lab) return lab;
  const key = route?.extra?.nav || path.split('/')[0];
  return nav.find(([href, , ic]) => ic === key || href === key) || ({ settings: ['settings', 'nav.settings'], help: ['help', 'nav.help'] })[key] || null;
}

export const router = {
  current: null,
  onRoute: null, // set by app: (route) => void
  onTitle: null, // set by app: (route) => void, when a view sets its title
  async go() {
    let { path, query, malformed } = parse();
    if (malformed) { navigate(hasProfile() ? 'today' : 'welcome', { replace: true }); return; }
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
    const prev = this.current;
    const from = prev ? (prev.path === path ? prev.from : hrefOf(prev)) : null; // a query-only change keeps the origin
    const state = { path, pattern: match.pattern, params, query, from, extra: match.extra, unwatch: [], cleanup: null };
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
      params, query, path, from,
      navigate,
      watch: (colls, fn) => {
        const set = new Set(colls);
        state.unwatch.push(store.on('change', (ev) => { if (this.current === state && ev.colls?.some((c) => set.has(c))) fn(ev); }));
      },
      // The title belongs to the route, so the shell can redraw without losing it (SC-9); the shell decides how
      // it shows in the top bar (onTitle).
      setTitle: (text) => {
        document.title = text ? `${text} · Lucid` : 'Lucid';
        state.title = text || '';
        if (this.current !== state) return;
        if (this.onTitle) this.onTitle(state);
        else { const el = document.getElementById('top-title'); if (el) el.textContent = state.title; }
      },
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
