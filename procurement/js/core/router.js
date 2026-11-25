// Hash routes: '#/po/123?tab=lines' → route 'po/:id' with params {id:'123'} and query {tab:'lines'}.
const routes = [];
export function route(pattern, handler, meta = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:[a-z_]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
  routes.push({ pattern, re, keys, handler, meta });
}
export function current() {
  const [p, q] = location.hash.replace(/^#\/?/, '').split('?');
  const path = p || '';
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) return { route: r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])), query: Object.fromEntries(new URLSearchParams(q || '')), path };
  }
  return null;
}
export const go = (path) => { location.hash = '#/' + path.replace(/^#?\//, ''); };
export const href = (path) => '#/' + path.replace(/^#?\//, '');
// replace the query part without adding history (tabs, filters)
export function setQuery(q) {
  const [p] = location.hash.split('?');
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== '' && v !== null && v !== undefined)).toString();
  history.replaceState(null, '', p + (s ? '?' + s : ''));
}
