// Supabase access over plain fetch: email + password auth, the PostgREST data API, RPCs and
// the lucid-ai edge function. The publishable key is public by design; every table is protected
// by row-level security. With no URL configured, Lucid runs in device-only mode.
import { CONFIG } from '../../config.js';

const SESSION_KEY = 'lucid-session';
export const configured = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseKey);

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', network = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.network = network;
  }
}

let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
function saveSession(s) {
  session = s;
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
}
const withExpiry = (r) => ({ ...r, expires_at: Date.now() + (Number(r.expires_in) || 3600) * 1000 });

async function raw(method, url, body, { auth = true, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        apikey: CONFIG.supabaseKey,
        'Content-Type': 'application/json',
        ...(auth && session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No connection to the server.', { network: true });
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const msg = json?.error?.message || json?.msg || json?.message || json?.error_description || json?.error || `HTTP ${res.status}`;
    throw new ApiError(typeof msg === 'string' ? msg : `HTTP ${res.status}`, { status: res.status, code: json?.error?.code || json?.code || json?.error_code || '' });
  }
  return json;
}

let refreshing = null;
async function ensureFresh() {
  if (!session?.refresh_token) return;
  if (session.expires_at - Date.now() > 60_000) return;
  refreshing ||= raw('POST', `${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, { refresh_token: session.refresh_token }, { auth: false })
    .then((r) => saveSession(withExpiry(r)))
    .catch((e) => { if (!e.network) saveSession(null); throw e; })
    .finally(() => { refreshing = null; });
  await refreshing;
}

async function request(method, path, body, opts) {
  await ensureFresh();
  return raw(method, `${CONFIG.supabaseUrl}${path}`, body, opts);
}

export const auth = {
  get user() { return session?.user || null; },
  get signedIn() { return Boolean(session?.access_token); },
  async signUp(email, password) {
    const redirect = location.origin + location.pathname;
    const r = await raw('POST', `${CONFIG.supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`, { email, password }, { auth: false });
    if (r?.access_token) saveSession(withExpiry(r));
    return { needsConfirmation: !r?.access_token, user: r?.user || r };
  },
  async signIn(email, password) {
    const r = await raw('POST', `${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, { email, password }, { auth: false });
    saveSession(withExpiry(r));
    return r.user;
  },
  async resetPassword(email) {
    const redirect = location.origin + location.pathname;
    await raw('POST', `${CONFIG.supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { email }, { auth: false });
  },
  async updatePassword(password) { await request('PUT', '/auth/v1/user', { password }); },
  async signOut() {
    try { if (session) await request('POST', '/auth/v1/logout', {}); } catch { /* signing out locally is enough */ }
    saveSession(null);
  },
  // Confirmation and recovery emails return with tokens in the URL fragment.
  consumeRedirect() {
    const h = location.hash;
    if (!h.includes('access_token=')) return null;
    const p = new URLSearchParams(h.replace(/^#/, ''));
    saveSession(withExpiry({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in') || 3600) }));
    const type = p.get('type');
    history.replaceState(null, '', location.pathname + (type === 'recovery' ? '#/settings?reset=1' : '#/today'));
    return type;
  },
};

export const db = {
  async profile() {
    const rows = await request('GET', `/rest/v1/lucid_profiles?select=*&id=eq.${auth.user?.id}`);
    return rows?.[0] || null;
  },
  async saveProfile(p) {
    const rows = await request('POST', '/rest/v1/lucid_profiles?on_conflict=id', { ...p, id: auth.user?.id }, {
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    });
    return rows?.[0] || null;
  },
  // Partial update of the existing profile row (an upsert would need every NOT NULL column).
  async updateProfile(patch) {
    return request('PATCH', `/rest/v1/lucid_profiles?id=eq.${auth.user?.id}`, patch, { headers: { Prefer: 'return=minimal' } });
  },
  async pushRecords(rows) {
    if (!rows.length) return [];
    return request('POST', '/rest/v1/lucid_records?on_conflict=user_id,coll,id&select=coll,id,updated_at', rows, {
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    });
  },
  async pullRecords(since, limit = 1000) {
    const q = since ? `&updated_at=gt.${encodeURIComponent(since)}` : '';
    return request('GET', `/rest/v1/lucid_records?select=coll,id,data,deleted,updated_at${q}&order=updated_at.asc&limit=${limit}`);
  },
  async exportAll() { return request('POST', '/rest/v1/rpc/lucid_export', {}); },
  async deleteAccount() {
    await request('POST', '/rest/v1/rpc/lucid_delete_account', {});
    saveSession(null);
  },
  async aiUsageToday() {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const rows = await request('GET', `/rest/v1/lucid_ai_usage?select=units,created_at&created_at=gte.${encodeURIComponent(since)}`);
    return (rows || []).reduce((a, r) => a + (r.units || 1), 0);
  },
};

// Calls the lucid-ai edge function. Throws ApiError with code 'not_configured' when AI is unavailable.
export async function callAI(payload) {
  if (!configured() || !CONFIG.aiEnabled) throw new ApiError('AI features are not configured on this server.', { code: 'not_configured' });
  if (!auth.signedIn) throw new ApiError('Sign in to use AI features.', { code: 'unauthenticated', status: 401 });
  return request('POST', `/functions/v1/${CONFIG.aiFunction}`, payload);
}
