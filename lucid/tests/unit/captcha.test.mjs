// CAPTCHA support (audit BLK-10, roadmap LB-07): off unless config.js names a provider and a site key. While off the
// auth requests are byte-for-byte what they were and nothing is loaded; when on, sign-up, sign-in, password reset
// and the sign-in behind a password change carry the token in gotrue_meta_security.captcha_token, the field
// Supabase Auth reads. The CSP must allow the provider's hosts exactly when CAPTCHA is on.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
globalThis.localStorage = store();
globalThis.sessionStorage = store();
globalThis.location = { origin: 'https://example.org', pathname: '/lucid/', search: '', hash: '' };
globalThis.history = { replaceState() {} };
let calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url, 'https://mock.supabase.co');
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ path: u.pathname, body, raw: init.body });
  const reply = (status, json) => ({ ok: status < 400, status, text: async () => JSON.stringify(json) });
  if (u.pathname === '/auth/v1/token' && body?.password === 'right password') return reply(200, { access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: body.email } });
  if (u.pathname === '/auth/v1/token') return reply(400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha_token found)' });
  if (u.pathname === '/auth/v1/user') return reply(200, { id: 'u1', email: 'a@example.com' });
  return reply(200, {});
};

const { CONFIG } = await import('../../config.js');
const { auth, withCaptcha } = await import('../../js/core/api.js');
const C = await import('../../js/core/captcha.js');
const SHIPPED = { ...CONFIG };
beforeEach(() => { calls = []; Object.assign(CONFIG, SHIPPED); });

test('config.js ships with CAPTCHA off', () => {
  assert.equal(CONFIG.captchaProvider, '');
  assert.equal(CONFIG.captchaSiteKey, '');
  assert.equal(C.captchaOn(), false);
  assert.equal(C.captchaOn({ captchaProvider: 'turnstile', captchaSiteKey: '' }), false, 'a provider without a key is off');
  assert.equal(C.captchaOn({ captchaProvider: 'other', captchaSiteKey: 'k' }), false, 'an unknown provider is off');
  assert.equal(C.captchaOn({ captchaProvider: 'turnstile', captchaSiteKey: '0x4AAA' }), true);
  assert.equal(C.captchaOn({ captchaProvider: 'hcaptcha', captchaSiteKey: 'k' }), true);
});

test('without a token the auth requests are exactly as before; with one they carry gotrue_meta_security.captcha_token', async () => {
  assert.deepEqual(withCaptcha({ email: 'a@example.com' }, ''), { email: 'a@example.com' });
  assert.deepEqual(withCaptcha({ email: 'a@example.com' }, 'tok'), { email: 'a@example.com', gotrue_meta_security: { captcha_token: 'tok' } });
  await auth.signUp('a@example.com', 'password 1');
  await auth.signIn('a@example.com', 'right password');
  await auth.resetPassword('a@example.com');
  assert.deepEqual(calls.map((c) => c.raw), [
    JSON.stringify({ email: 'a@example.com', password: 'password 1' }),
    JSON.stringify({ email: 'a@example.com', password: 'right password' }),
    JSON.stringify({ email: 'a@example.com' }),
  ], 'the bodies sent while CAPTCHA is off');
  calls = [];
  await auth.signUp('a@example.com', 'password 1', { captchaToken: 'tok-1' });
  await auth.signIn('a@example.com', 'right password', { captchaToken: 'tok-2' });
  await auth.resetPassword('a@example.com', { captchaToken: 'tok-3' });
  assert.deepEqual(calls.map((c) => [c.path, c.body.gotrue_meta_security?.captcha_token]), [['/auth/v1/signup', 'tok-1'], ['/auth/v1/token', 'tok-2'], ['/auth/v1/recover', 'tok-3']]);
});

test('a password change passes its token to the sign-in that checks the current password, and a CAPTCHA refusal is not "wrong password"', async () => {
  await auth.signIn('a@example.com', 'right password');
  calls = [];
  await auth.updatePassword('new password 1', { current: 'right password', captchaToken: 'tok-pw' });
  assert.equal(calls.find((c) => c.path === '/auth/v1/token').body.gotrue_meta_security.captcha_token, 'tok-pw');
  await assert.rejects(auth.updatePassword('new password 1', { current: 'not it', captchaToken: 'bad' }), (e) => C.isCaptchaError(e) && e.code !== 'wrong_password');
});

// A fake page: the provider's script "loads" by defining its global, as the real api.js does.
function fakePage(global) {
  const added = [];
  const rendered = [];
  const removed = [];
  const api = {
    render(el, params) { rendered.push({ el, params }); setTimeout(() => params.callback(`token-${rendered.length}`), 5); return `w${rendered.length}`; },
    remove(id) { removed.push(id); },
  };
  globalThis.window = globalThis;
  delete globalThis[global];
  globalThis.document = {
    documentElement: { lang: 'he' },
    createElement: () => ({ dataset: {}, remove() {} }),
    head: { append(s) { added.push(s.src); setTimeout(() => { globalThis[global] = api; s.onload(); }, 1); } },
  };
  return { added, rendered, removed };
}

test('off: mounting draws nothing and loads no script', () => {
  const page = fakePage('turnstile');
  assert.equal(C.mountCaptcha({ slot: true }), null);
  assert.deepEqual(page.added, []);
});

test('Turnstile: the script loads once, the widget asks for no puzzle unless needed, and each token is used once', async () => {
  Object.assign(CONFIG, { captchaProvider: 'turnstile', captchaSiteKey: '0x4AAA-test' });
  const page = fakePage('turnstile');
  const slot = { id: 'slot' };
  const w = C.mountCaptcha(slot, { lang: 'he' });
  assert.equal(await w.token(), 'token-1');
  assert.deepEqual(page.added, ['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit']);
  assert.equal(page.rendered[0].el, slot);
  assert.equal(page.rendered[0].params.sitekey, '0x4AAA-test');
  assert.equal(page.rendered[0].params.appearance, 'interaction-only');
  w.dispose();
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(page.removed, ['w1']);
  const again = C.mountCaptcha({ id: 'slot2' });
  assert.equal(await again.token(), 'token-2', 'a new widget, a new token');
  assert.equal(page.added.length, 1, 'the script is loaded once');
  again.dispose();
});

test('the CSP allows the provider exactly when CAPTCHA is on (index.html, and vercel.json when there is one)', () => {
  const policies = [];
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  policies.push(['index.html', html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]]);
  if (existsSync(join(APP, 'vercel.json'))) {
    const v = JSON.parse(readFileSync(join(APP, 'vercel.json'), 'utf8'));
    for (const h of (v.headers || []).flatMap((x) => x.headers || [])) if (/^content-security-policy$/i.test(h.key)) policies.push(['vercel.json', h.value]);
  }
  const directive = (csp, name) => (csp.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === name) || []).slice(1);
  const allHosts = [...new Set(Object.values(C.PROVIDERS).flatMap((p) => Object.values(p.csp).flat()))];
  const problems = (config, csp) => {
    const on = C.captchaProvider(config);
    if (!on) return allHosts.filter((host) => csp.includes(host)).map((host) => `${host} is allowed while CAPTCHA is off`);
    return Object.entries(C.PROVIDERS[on].csp).flatMap(([name, hosts]) => hosts.filter((host) => !directive(csp, name).includes(host)).map((host) => `${name} lacks ${host}, so the ${on} widget would be blocked (docs/setup.md, "CAPTCHA")`));
  };
  for (const [file, csp] of policies) assert.deepEqual(problems(SHIPPED, csp), [], file);
  // The check catches a provider switched on without its hosts, and is satisfied by the CSP setup.md gives.
  const today = policies[0][1];
  assert.deepEqual(problems({ captchaProvider: 'turnstile', captchaSiteKey: 'k' }, today), ['script-src lacks https://challenges.cloudflare.com, so the turnstile widget would be blocked (docs/setup.md, "CAPTCHA")', 'frame-src lacks https://challenges.cloudflare.com, so the turnstile widget would be blocked (docs/setup.md, "CAPTCHA")']);
  const setup = readFileSync(join(APP, 'docs/setup.md'), 'utf8');
  for (const p of ['turnstile', 'hcaptcha']) {
    const documented = setup.match(new RegExp(`<!-- csp:${p} -->\\s*\`\`\`\\s*([^\`]+?)\\s*\`\`\``))?.[1];
    assert.ok(documented, `docs/setup.md has no CSP for ${p}`);
    assert.deepEqual(problems({ captchaProvider: p, captchaSiteKey: 'k' }, documented), [], `the ${p} CSP in docs/setup.md`);
    // Everything else in the documented policy is today's policy, so turning CAPTCHA on widens nothing else.
    const rest = documented.split(';').map((d) => d.trim().split(/\s+/).filter((x) => !allHosts.includes(x)).join(' ')).join('; ');
    assert.equal(rest, today.split(';').map((d) => d.trim()).join('; ') + (rest.endsWith('frame-src') ? '; frame-src' : ''), `the ${p} CSP in docs/setup.md changes more than the CAPTCHA hosts`);
  }
});
