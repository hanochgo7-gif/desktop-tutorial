// Supabase access over plain fetch: auth (email + password) and the PostgREST data API.
// The publishable key is public by design; every table is protected by Row Level Security on the server.

export const CONFIG = {
  url: 'https://ewddzunakbaxtonysgrd.supabase.co',
  key: 'sb_publishable_gQV6w1bIQz5-84ZhsBrG9Q_gkKi341s',
};

const SESSION_KEY = 'hgos-session';

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', details = '', network = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.network = network;
  }
}

let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
const saveSession = (s) => {
  session = s;
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
};

export const auth = {
  get user() { return session?.user || null; },
  get signedIn() { return !!session?.access_token; },
  async signIn(email, password) {
    const r = await authCall('token?grant_type=password', { email, password });
    saveSession(withExpiry(r));
    return r.user;
  },
  async signUp(email, password) {
    const redirect = location.origin + location.pathname;
    const r = await authCall(`signup?redirect_to=${encodeURIComponent(redirect)}`, { email, password });
    if (r.access_token) saveSession(withExpiry(r));
    return r;
  },
  async resetPassword(email) {
    const redirect = location.origin + location.pathname;
    await authCall(`recover?redirect_to=${encodeURIComponent(redirect)}`, { email });
  },
  async updatePassword(password) {
    await request('PUT', `${CONFIG.url}/auth/v1/user`, { password });
  },
  async signOut() {
    try { if (session) await request('POST', `${CONFIG.url}/auth/v1/logout`, {}); } catch { /* ignore */ }
    saveSession(null);
  },
  // Links from confirmation / recovery emails come back with tokens in the URL fragment.
  consumeRedirect() {
    const h = location.hash;
    if (!h.includes('access_token=')) return null;
    const p = new URLSearchParams(h.replace(/^#/, ''));
    const s = { access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in') || 3600), token_type: 'bearer' };
    saveSession(withExpiry(s));
    history.replaceState(null, '', location.pathname + '#/today');
    return p.get('type') || 'signin';
  },
  async loadUser() {
    const u = await request('GET', `${CONFIG.url}/auth/v1/user`);
    saveSession({ ...session, user: u });
    return u;
  },
};

function withExpiry(r) {
  return { ...r, expires_at: Math.floor(Date.now() / 1000) + Number(r.expires_in || 3600) };
}

async function authCall(path, body) {
  return request('POST', `${CONFIG.url}/auth/v1/${path}`, body, { anon: true });
}

let refreshing = null;
async function ensureFresh() {
  if (!session?.refresh_token) return;
  if (session.expires_at - 60 > Date.now() / 1000) return;
  refreshing ||= (async () => {
    try {
      const r = await request('POST', `${CONFIG.url}/auth/v1/token?grant_type=refresh_token`, { refresh_token: session.refresh_token }, { anon: true, noRefresh: true });
      saveSession(withExpiry({ ...session, ...r }));
    } catch (e) {
      if (!e.network) { saveSession(null); window.dispatchEvent(new Event('hgos:signed-out')); }
      throw e;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

async function request(method, url, body, { anon = false, noRefresh = false, headers = {} } = {}) {
  if (!anon && !noRefresh) await ensureFresh();
  const h = { apikey: CONFIG.key, 'Content-Type': 'application/json', ...headers };
  if (!anon && session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  let res;
  try {
    res = await fetch(url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    throw new ApiError('אין חיבור לשרת. בדקו את החיבור לאינטרנט.', { network: true });
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && !anon) { window.dispatchEvent(new Event('hgos:signed-out')); }
    const msg = data?.msg || data?.message || data?.error_description || data?.error || `שגיאת שרת (${res.status})`;
    throw new ApiError(msg, { status: res.status, code: data?.code || data?.error_code || '', details: data?.details || data?.hint || '' });
  }
  return data;
}

// ---------- data API ----------
const rest = (path) => `${CONFIG.url}/rest/v1/${path}`;

export const db = {
  // All rows of a table, paged (PostgREST returns at most 1000 per request).
  async selectAll(table, query = '') {
    const out = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const rows = await request('GET', rest(`${table}?select=*${query ? `&${query}` : ''}&order=seq.asc`), undefined, { headers: { Range: `${from}-${from + page - 1}`, 'Range-Unit': 'items' } });
      out.push(...rows);
      if (rows.length < page) break;
    }
    return out;
  },
  select(table, query) {
    return request('GET', rest(`${table}?${query}`));
  },
  async insert(table, row) {
    const r = await request('POST', rest(table), row, { headers: { Prefer: 'return=representation' } });
    return r[0];
  },
  async update(table, id, patch) {
    const r = await request('PATCH', rest(`${table}?id=eq.${encodeURIComponent(id)}`), patch, { headers: { Prefer: 'return=representation' } });
    if (!r.length) throw new ApiError('הרשומה לא נמצאה או שאין הרשאה לעדכן אותה', { status: 404 });
    return r[0];
  },
  // update without reading the row back (for tables where not every column is readable, e.g. crm_workspaces)
  async patch(table, id, patch) {
    await request('PATCH', rest(`${table}?id=eq.${encodeURIComponent(id)}`), patch, { headers: { Prefer: 'return=minimal' } });
  },
  rpc(fn, args = {}) {
    return request('POST', rest(`rpc/${fn}`), args);
  },
};
