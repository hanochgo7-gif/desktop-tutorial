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

// Sign-up and password-reset emails come back with session tokens in the URL fragment. They are
// adopted only on the device that asked for the email, within the hour the link is valid, and only
// when the account's email matches the one typed here (S-01: a link built by someone else is ignored).
const PENDING_KEY = 'lucid-auth-pending';
const RECOVERY_KEY = 'lucid-recovery-at';
export const LINK_WINDOW_MS = 60 * 60 * 1000;
const RECOVERY_WINDOW_MS = 30 * 60 * 1000;
const webStorage = (kind) => { try { return kind === 'session' ? sessionStorage : localStorage; } catch { return null; } };
function markPending(kind, { email = '', next = '' } = {}) {
  try { webStorage('local')?.setItem(PENDING_KEY, JSON.stringify({ kind, at: Date.now(), email: email.trim().toLowerCase(), next })); } catch { /* private mode */ }
}
function takePending(now = Date.now()) {
  let p = null;
  try { p = JSON.parse(webStorage('local')?.getItem(PENDING_KEY) || 'null'); webStorage('local')?.removeItem(PENDING_KEY); } catch { p = null; }
  return p && typeof p.at === 'number' && now >= p.at && now - p.at < LINK_WINDOW_MS ? p : null;
}
const clearPending = () => { try { webStorage('local')?.removeItem(PENDING_KEY); } catch { /* ignore */ } };
const markRecovery = () => { try { webStorage('session')?.setItem(RECOVERY_KEY, String(Date.now())); } catch { /* ignore */ } };
const clearRecovery = () => { try { webStorage('session')?.removeItem(RECOVERY_KEY); } catch { /* ignore */ } };
// Only in-app routes are allowed as a place to return to.
export const safeNext = (h) => (typeof h === 'string' && /^#\/[\w\-/]*(\?[\w\-=&%.]*)?$/.test(h) && !/^#\/(account|welcome|start)\b/.test(h) ? h : '');

export const auth = {
  get user() { return session?.user || null; },
  get signedIn() { return Boolean(session?.access_token); },
  async signUp(email, password, { next = '' } = {}) {
    const redirect = location.origin + location.pathname;
    markPending('signup', { email, next: safeNext(next) });
    const r = await raw('POST', `${CONFIG.supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`, { email, password }, { auth: false });
    if (r?.access_token) { saveSession(withExpiry(r)); clearPending(); }
    return { needsConfirmation: !r?.access_token, user: r?.user || r };
  },
  async signIn(email, password) {
    const r = await raw('POST', `${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, { email, password }, { auth: false });
    saveSession(withExpiry(r));
    return r.user;
  },
  async resetPassword(email) {
    const redirect = location.origin + location.pathname;
    markPending('recovery', { email });
    await raw('POST', `${CONFIG.supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { email }, { auth: false });
  },
  // Who the current session belongs to (also refreshes the stored copy).
  async fetchUser() {
    const user = await request('GET', '/auth/v1/user');
    if (!user?.id) throw new ApiError('No user for this session.', { status: 401 });
    if (session) saveSession({ ...session, user });
    return user;
  },
  // True for a short while after a password-reset link was used on this device.
  get recoveryFresh() {
    try { const at = Number(webStorage('session')?.getItem(RECOVERY_KEY)); return Boolean(at) && Date.now() - at < RECOVERY_WINDOW_MS; } catch { return false; }
  },
  // Changing the password needs the current one (S-12), except right after a reset link.
  async updatePassword(password, { current = '' } = {}) {
    if (!this.recoveryFresh) {
      if (!current) throw new ApiError('Enter your current password.', { code: 'reauth_required' });
      const email = this.user?.email || (await this.fetchUser()).email;
      try { await this.signIn(email, current); } catch (e) {
        if (e.network) throw e;
        throw new ApiError('The current password is not correct.', { status: 400, code: 'wrong_password' });
      }
    }
    await request('PUT', '/auth/v1/user', { password });
    clearRecovery();
  },
  async signOut() {
    try { if (session) await request('POST', '/auth/v1/logout', {}); } catch { /* signing out locally is enough */ }
    saveSession(null);
    clearRecovery();
  },
  // Handles a confirmation or reset link that returned to the app. Returns null when the URL holds
  // none; otherwise { adopted, kind, user?, next?, reason? }. The tokens leave the address bar at once.
  async consumeRedirect() {
    const h = location.hash.replace(/^#\/?/, '');
    if (!/(^|&)(access_token|error|error_code)=/.test(h)) return null;
    const p = new URLSearchParams(h);
    const leave = (hash) => history.replaceState(null, '', location.pathname + location.search + hash);
    leave('#/');
    const pending = takePending();
    const type = p.get('type');
    const kind = type === 'recovery' ? 'recovery' : type === 'signup' ? 'signup' : null;
    const refuse = (reason, notice) => { leave(`#/account?mode=${kind === 'recovery' ? 'reset' : 'signin'}&notice=${notice}`); return { adopted: false, kind, reason }; };
    if (!p.get('access_token')) return refuse('link_error', 'expired');
    if (!kind || !pending || pending.kind !== kind) return refuse('not_requested_here', 'link');
    saveSession(withExpiry({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in') || 3600) }));
    let user;
    try { user = await this.fetchUser(); } catch (e) { saveSession(null); return refuse('no_user', e.network ? 'offline' : 'link'); }
    if (pending.email && String(user.email || '').toLowerCase() !== pending.email) { saveSession(null); return refuse('email_mismatch', 'link'); }
    if (kind === 'recovery') markRecovery();
    const next = kind === 'recovery' ? '#/settings?reset=1' : safeNext(pending.next) || '#/today';
    leave(next);
    return { adopted: true, kind, user, next };
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
