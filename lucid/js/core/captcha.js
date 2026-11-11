// CAPTCHA for sign-up, sign-in and password reset (audit BLK-10, roadmap LB-07). Off unless config.js names a
// provider and a site key; while off, nothing here loads a script or touches the network, and the auth requests
// are exactly as before. When on, the provider's widget script is loaded on first use, the widget is drawn in the
// form (Turnstile in "interaction-only" mode, so most people see no puzzle, D19), and every request sends a fresh,
// single-use token in the field Supabase Auth reads: gotrue_meta_security.captcha_token
// (supabase/auth internal/api/middleware.go, captchaRequest), added by api.js withCaptcha.
// The CSP in index.html allows no third-party script or frame today; turning CAPTCHA on needs the provider's hosts
// added there, in the same change (docs/setup.md, "CAPTCHA", lists exactly what; tests/unit/captcha.test.mjs fails
// while config.js and the CSP disagree).
import { CONFIG } from '../../config.js';
import { tt } from './i18n.js';

export const PROVIDERS = {
  turnstile: {
    src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    global: 'turnstile',
    // https://developers.cloudflare.com/turnstile/reference/content-security-policy/
    csp: { 'script-src': ['https://challenges.cloudflare.com'], 'frame-src': ['https://challenges.cloudflare.com'] },
    params: (lang) => ({ appearance: 'interaction-only', language: lang }),
  },
  hcaptcha: {
    src: 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off',
    global: 'hcaptcha',
    csp: {
      'script-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'], 'frame-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'],
      'style-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'], 'connect-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'],
    },
    params: (lang) => ({ hl: lang }),
  },
};

export const captchaProvider = (c = CONFIG) => (c.captchaSiteKey && PROVIDERS[c.captchaProvider] ? c.captchaProvider : '');
export const captchaOn = (c = CONFIG) => Boolean(captchaProvider(c));

// Supabase Auth refuses a missing or bad token with error_code 'captcha_failed' ("captcha protection: ...").
export const captchaFailedText = () => tt('לא הצלחנו לאמת את הבקשה. נסו שוב.', 'We could not verify the request. Try again.');
export const isCaptchaError = (e) => e?.code === 'captcha_failed' || /captcha/i.test(e?.message || '') || e?.code === 'captcha_unavailable';

let loading = null;
function loadApi(p) {
  if (window[p.global]) return Promise.resolve(window[p.global]);
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = p.src;
    s.async = true;
    s.dataset.captcha = '';
    s.onload = () => (window[p.global] ? resolve(window[p.global]) : reject(new Error('captcha_unavailable')));
    s.onerror = () => { loading = null; s.remove(); reject(new Error('captcha_unavailable')); };
    document.head.append(s);
  });
  return loading;
}

// Draws the widget into `slot` and returns { token(), dispose() }. token() resolves with a fresh token (waiting for
// the widget when it has none yet) and rejects with code 'captcha_unavailable' when the provider cannot be loaded.
// A token is used once: the caller asks for a new widget after each request (the forms redraw).
export function mountCaptcha(slot, { lang = 'he' } = {}) {
  const name = captchaProvider();
  if (!name || !slot) return null;
  const p = PROVIDERS[name];
  let current = '';
  let waiters = [];
  let widget = null;
  let failed = null;
  let disposed = false;
  const settle = (fn) => { const w = waiters; waiters = []; w.forEach(fn); };
  const ready = loadApi(p).then((api) => {
    if (disposed) return api;
    widget = api.render(slot, {
      sitekey: CONFIG.captchaSiteKey, ...p.params(lang),
      callback: (t) => { current = t; settle((w) => w.resolve(t)); },
      'expired-callback': () => { current = ''; },
      'error-callback': () => { current = ''; },
    });
    return api;
  }).catch((e) => { failed = Object.assign(e, { code: 'captcha_unavailable' }); settle((w) => w.reject(failed)); });
  return {
    async token() {
      await ready;
      if (failed) throw failed;
      if (current) { const t = current; current = ''; return t; }
      return new Promise((resolve, reject) => waiters.push({ resolve: (t) => { current = ''; resolve(t); }, reject }));
    },
    dispose() {
      disposed = true;
      settle((w) => w.reject(Object.assign(new Error('captcha_disposed'), { code: 'captcha_disposed' })));
      ready.then((api) => { try { if (api && widget != null) api.remove(widget); } catch { /* the widget's element is gone */ } });
    },
  };
}
