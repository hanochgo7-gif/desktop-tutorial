// Account: sign up, sign in and password reset when a server is configured. In device-only mode it
// explains that the profile on this device is the account, and how to keep a backup.
import { html, render, on, $ } from '../core/util.js';
import { tt } from '../core/i18n.js';
import { icon, toast } from '../ui/components.js';
import { auth, db, configured } from '../core/api.js';
import { hasProfile, profile, saveProfile, settings } from '../core/learner.js';

export default async function account(el, ctx) {
  ctx.setTitle(tt('חשבון', 'Account'));
  let mode = ctx.query.mode || 'signin';
  let msg = '';
  let busy = false;

  if (!configured()) {
    render(el, html`<div class="onboard stack"><h1>${tt('מצב מכשיר בלבד', 'Device-only mode')}</h1>
      <p class="muted">${tt('השרת הזה לא מוגדר לחשבונות. הפרופיל וההתקדמות נשמרים בדפדפן הזה, ואפשר להוריד גיבוי ולשחזר אותו בכל מכשיר.', 'This server is not set up for accounts. Your profile and progress are saved in this browser, and you can download a backup and restore it on any device.')}</p>
      <div class="row"><a class="key enter" href="${hasProfile() ? '#/settings' : '#/start'}">${hasProfile() ? tt('להגדרות ולגיבוי', 'To settings and backup') : tt('להתחיל', 'Get started')}</a></div></div>`);
    return;
  }

  function draw() {
    const signup = mode === 'signup', reset = mode === 'reset';
    render(el, html`<div class="onboard stack-lg">
      <h1>${signup ? tt('יצירת חשבון', 'Create an account') : reset ? tt('איפוס סיסמה', 'Reset password') : tt('כניסה', 'Sign in')}</h1>
      ${signup ? html`<p class="muted small">${tt('החשבון שומר את ההתקדמות בשרת ומסנכרן בין מכשירים. מה שכבר יש במכשיר הזה יועבר לחשבון.', 'An account saves progress on the server and syncs it between devices. What is already on this device moves into the account.')}</p>` : ''}
      <form class="stack" novalidate data-auth>
        <div class="field"><label for="em">${tt('אימייל', 'Email')}</label><input class="input" id="em" type="email" autocomplete="email" dir="ltr" required></div>
        ${!reset ? html`<div class="field"><label for="pw">${tt('סיסמה', 'Password')}</label><input class="input" id="pw" type="password" minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" dir="ltr" required>${signup ? html`<span class="help">${tt('לפחות 8 תווים.', 'At least 8 characters.')}</span>` : ''}</div>` : ''}
        ${msg ? html`<p class="${msg.ok ? 'banner' : 'error-text'}" role="alert">${msg.text}</p>` : ''}
        <button class="key enter" type="submit" ${busy ? html`disabled` : ''}>${busy ? html`<span class="spinner" aria-hidden="true" style="width:1rem;height:1rem"></span>` : ''} ${signup ? tt('יצירת חשבון', 'Create account') : reset ? tt('שליחת קישור', 'Send link') : tt('כניסה', 'Sign in')}</button>
      </form>
      <div class="row small">${mode !== 'signin' ? html`<a href="#/account?mode=signin" data-mode="signin">${tt('יש לי חשבון', 'I have an account')}</a>` : html`<a href="#/account?mode=signup" data-mode="signup">${tt('אין לי חשבון', 'I don\'t have an account')}</a><a href="#/account?mode=reset" data-mode="reset">${tt('שכחתי סיסמה', 'Forgot password')}</a>`}</div>
    </div>`);
  }
  draw();

  const offs = [
    on(el, 'click', '[data-mode]', (e, a) => { e.preventDefault(); mode = a.dataset.mode; msg = ''; draw(); }),
    on(el, 'submit', '[data-auth]', async (e) => {
      e.preventDefault();
      const email = $('#em', el).value.trim(), pw = $('#pw', el)?.value || '';
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg = { text: tt('כתובת האימייל לא תקינה.', 'That email address does not look right.') }; draw(); return; }
      if (mode !== 'reset' && pw.length < 8) { msg = { text: tt('הסיסמה צריכה לפחות 8 תווים.', 'The password needs at least 8 characters.') }; draw(); return; }
      busy = true; draw();
      try {
        if (mode === 'reset') { await auth.resetPassword(email); msg = { ok: true, text: tt('אם הכתובת רשומה, נשלח אליה קישור לאיפוס.', 'If that address has an account, a reset link is on its way.') }; }
        else if (mode === 'signup') {
          const r = await auth.signUp(email, pw);
          if (r.needsConfirmation) msg = { ok: true, text: tt('שלחנו אימייל לאישור. אחרי האישור תחזרו לכאן מחוברים.', 'We sent a confirmation email. After confirming you will come back here signed in.') };
          else { await afterSignIn(); return; }
        } else { await auth.signIn(email, pw); await afterSignIn(); return; }
      } catch (err) {
        msg = { text: err.network ? tt('אין חיבור לשרת. נסו שוב.', 'No connection to the server. Please try again.') : err.status === 400 ? tt('האימייל או הסיסמה לא נכונים.', 'The email or password is not correct.') : err.message };
      }
      busy = false; draw();
    }),
  ];

  async function afterSignIn() {
    // Create or update the server profile from the device profile (age gate is enforced by the database).
    const p = profile();
    try {
      const server = await db.profile();
      if (!server && p) await db.saveProfile({ display_name: p.name || null, birth_year: p.birth_year, ui_language: p.ui_language || 'he', goals: p.goals || [], consent_terms_at: p.consent_terms_at || new Date().toISOString(), consent_ai_at: settings().ai_consent ? settings().ai_consent_at || new Date().toISOString() : null });
      if (server && !p) saveProfile({ onboarded: true, name: server.display_name, birth_year: server.birth_year, ui_language: server.ui_language, goals: server.goals });
    } catch (e) { console.warn('profile sync', e); }
    const { sync } = await import('../app.js');
    sync?.run().catch(() => {});
    toast(tt('מחובר/ת. ההתקדמות מסונכרנת.', 'Signed in. Your progress is syncing.'));
    ctx.navigate(hasProfile() ? 'today' : 'start');
  }
  return () => offs.forEach((o) => o());
}
