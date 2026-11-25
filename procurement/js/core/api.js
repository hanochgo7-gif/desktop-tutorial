// Supabase over plain fetch: password auth with token refresh, a small PostgREST query builder and RPC.
import { CONFIG } from '../config.js';

const SESSION_KEY = 'gops-session';
export class ApiError extends Error {
  constructor(message, { status = 0, code = '', network = false } = {}) { super(message); this.status = status; this.code = code; this.network = network; }
}

let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
const save = (s) => { session = s; try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ } };
const withExpiry = (s) => ({ ...s, expires_at: Date.now() + (Number(s.expires_in) || 3600) * 1000 });
const listeners = new Set();
export const onAuthChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => { try { fn(session); } catch { /* ignore */ } });

export const configured = () => !!CONFIG.url && !!CONFIG.key;

async function raw(method, url, body, { auth = true, headers = {} } = {}) {
  if (!configured()) throw new ApiError('NOT_CONFIGURED', { code: 'NOT_CONFIGURED' });
  if (auth) await ensureFresh();
  const h = { apikey: CONFIG.key, 'Content-Type': 'application/json', ...headers };
  if (auth && session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  let res;
  try {
    res = await fetch(url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('NETWORK', { network: true, code: 'NETWORK' });
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && auth && session) { save(null); emit(); }
    const msg = (data && (data.message || data.msg || data.error_description || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(msg, { status: res.status, code: (data && data.code) || '' });
  }
  return { data, res };
}

let refreshing = null;
async function ensureFresh() {
  if (!session?.refresh_token) return;
  if (session.expires_at && session.expires_at - Date.now() > 60_000) return;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const { data } = await raw('POST', `${CONFIG.url}/auth/v1/token?grant_type=refresh_token`, { refresh_token: session.refresh_token }, { auth: false });
        save(withExpiry(data));
      } catch (e) {
        if (!e.network) { save(null); emit(); }
      } finally { refreshing = null; }
    })();
  }
  await refreshing;
}

export const auth = {
  get user() { return session?.user || null; },
  get signedIn() { return !!session?.access_token; },
  async signIn(email, password) {
    const { data } = await raw('POST', `${CONFIG.url}/auth/v1/token?grant_type=password`, { email: email.trim().toLowerCase(), password }, { auth: false });
    save(withExpiry(data)); emit(); return data.user;
  },
  async resetPassword(email) {
    const redirect = location.origin + location.pathname;
    await raw('POST', `${CONFIG.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { email: email.trim().toLowerCase() }, { auth: false });
  },
  async updatePassword(password) { await raw('PUT', `${CONFIG.url}/auth/v1/user`, { password }); },
  async signOut() {
    try { if (session) await raw('POST', `${CONFIG.url}/auth/v1/logout`, {}); } catch { /* ignore */ }
    save(null); emit();
  },
  // links from password-recovery emails come back with tokens in the URL fragment
  consumeRedirect() {
    const h = location.hash;
    if (!h.includes('access_token=')) return null;
    const p = new URLSearchParams(h.replace(/^#/, ''));
    save(withExpiry({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in') || 3600) }));
    history.replaceState(null, '', location.pathname + '#/');
    return p.get('type');
  },
};

// Server functions. Every state change in the system is one of these.
export async function rpc(name, args = {}) {
  const { data } = await raw('POST', `${CONFIG.url}/rest/v1/rpc/${name}`, args);
  return data;
}

// A small PostgREST query builder: db('items').select('id,name').eq('org_id', x).order('name').limit(50).get()
class Query {
  constructor(table) { this.table = table; this.p = new URLSearchParams(); this.prefer = []; }
  select(cols) { this.p.set('select', cols); return this; }
  #f(col, op, v) { this.p.append(col, `${op}.${v}`); return this; }
  eq(c, v) { return this.#f(c, 'eq', v); }
  neq(c, v) { return this.#f(c, 'neq', v); }
  gt(c, v) { return this.#f(c, 'gt', v); }
  gte(c, v) { return this.#f(c, 'gte', v); }
  lt(c, v) { return this.#f(c, 'lt', v); }
  lte(c, v) { return this.#f(c, 'lte', v); }
  is(c, v) { return this.#f(c, 'is', v); }
  ilike(c, v) { return this.#f(c, 'ilike', `*${String(v).replace(/[*,()]/g, ' ')}*`); }
  in(c, list) { return this.#f(c, 'in', `(${list.map((x) => `"${String(x).replace(/"/g, '')}"`).join(',')})`); }
  // any of several columns contains the text
  search(cols, v) { const s = String(v).replace(/[*,().]/g, ' ').trim(); if (s) this.p.append('or', `(${cols.map((c) => `${c}.ilike.*${s}*`).join(',')})`); return this; }
  order(col, { desc = false, nullsLast = false } = {}) {
    const cur = this.p.get('order'); const o = `${col}.${desc ? 'desc' : 'asc'}${nullsLast ? '.nullslast' : ''}`;
    this.p.set('order', cur ? `${cur},${o}` : o); return this;
  }
  limit(n) { this.p.set('limit', String(n)); return this; }
  offset(n) { this.p.set('offset', String(n)); return this; }
  count() { this.prefer.push('count=exact'); return this; }
  url() { return `${CONFIG.url}/rest/v1/${this.table}?${this.p.toString()}`; }
  async get() {
    const { data, res } = await raw('GET', this.url(), undefined, { headers: this.prefer.length ? { Prefer: this.prefer.join(',') } : {} });
    const cr = res.headers.get('Content-Range');
    if (cr) data.total = Number(cr.split('/')[1]);
    return data;
  }
  async one() { const rows = await this.limit(1).get(); return rows[0] || null; }
  async insert(rows) {
    const { data } = await raw('POST', `${CONFIG.url}/rest/v1/${this.table}`, rows, { headers: { Prefer: 'return=representation' } });
    return Array.isArray(rows) ? data : data[0];
  }
  async update(values) {
    const { data } = await raw('PATCH', this.url(), values, { headers: { Prefer: 'return=representation' } });
    return data;
  }
  async remove() { await raw('DELETE', this.url()); }
}
export const db = (table) => new Query(table);

// Files in the private 'attachments' bucket. Path: <org>/<entity>/<entity_id>/<unique>-<name>.
export const storage = {
  async upload(path, file) {
    if (!configured()) throw new ApiError('NOT_CONFIGURED', { code: 'NOT_CONFIGURED' });
    await ensureFresh();
    let res;
    try {
      res = await fetch(`${CONFIG.url}/storage/v1/object/attachments/${path.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', body: file,
        headers: { apikey: CONFIG.key, Authorization: `Bearer ${session?.access_token}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
      });
    } catch { throw new ApiError('NETWORK', { network: true, code: 'NETWORK' }); }
    if (!res.ok) { let d = null; try { d = await res.json(); } catch { /* ignore */ } throw new ApiError((d && (d.message || d.error)) || `HTTP ${res.status}`, { status: res.status }); }
  },
  async signedUrl(path, seconds = 120) {
    const { data } = await raw('POST', `${CONFIG.url}/storage/v1/object/sign/attachments/${path.split('/').map(encodeURIComponent).join('/')}`, { expiresIn: seconds });
    const u = data.signedURL || data.signedUrl;
    return u.startsWith('http') ? u : `${CONFIG.url}/storage/v1${u.startsWith('/') ? '' : '/'}${u}`;
  },
};

// Random key so a retried or double-clicked action is applied once (the server remembers it).
export const idemKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
