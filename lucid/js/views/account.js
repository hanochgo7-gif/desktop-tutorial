// Account: sign up, sign in and password reset when a server is configured. In device-only mode it
// explains that the profile on this device is the account, and how to keep a backup.
// After signing in or up, the learner returns to the screen they came from (ctx.from, or ?next=).
// An account sends the learner's progress to the server, so a learner under 16 (age.js) ticks one required box
// first: a parent or guardian has agreed. Its time is stored on the device profile (guardian_consent_at) and
// sent with the server profile; session.js creates no server profile without it.
import { html, render, on, $, esc } from '../core/util.js';
import { tt } from '../core/i18n.js';
import { toast } from '../ui/components.js';
import { auth, configured, safeNext } from '../core/api.js';
import { hasProfile, profile, saveProfile } from '../core/learner.js';
import { isUnder16 } from '../core/age.js';
import { connectAccount, syncPausedText } from '../core/session.js';
// With CAPTCHA on (config.js captchaProvider and captchaSiteKey; off by default), the three forms carry the widget
// and send its token (audit BLK-10). With it off, nothing below draws, loads or sends anything new.
import { captchaOn, mountCaptcha, isCaptchaError, captchaFailedText as CAPTCHA_FAILED } from '../core/captcha.js';

// Messages for ?notice=, set when an email link could not be used or a sign-in was cancelled.
const NOTICES = {
  link: () => tt('לא הכנסנו אתכם לחשבון דרך הקישור, כי הוא נפתח בדפדפן אחר מזה שבו ביקשתם אותו, או יותר משעה אחרי. אם אישרתם עכשיו את האימייל, היכנסו כאן עם הסיסמה. אם ביקשתם איפוס, בקשו קישור חדש ופתחו אותו בדפדפן הזה.', 'We did not sign you in from that link, because it was opened in a different browser from the one where it was requested, or more than an hour later. If you just confirmed your email, sign in here with your password. If you asked for a reset, request a new link and open it in this browser.'),
  expired: () => tt('הקישור פג תוקף או שכבר השתמשו בו. אפשר להיכנס, או לבקש קישור חדש.', 'That link has expired or was already used. Sign in, or ask for a new link.'),
  offline: () => tt('אין חיבור לשרת, ולכן לא הצלחנו להשלים את הכניסה. נסו להיכנס שוב כשיש חיבור.', 'No connection to the server, so signing in could not finish. Please sign in again when you are online.'),
  cancelled: () => tt('הכניסה בוטלה. המידע במכשיר לא השתנה.', 'Sign-in cancelled. The data on this device was not changed.'),
};

export default async function account(el, ctx) {
  ctx.setTitle(tt('חשבון', 'Account'));
  let mode = ctx.query.mode || 'signin';
  let msg = NOTICES[ctx.query.notice] ? { text: NOTICES[ctx.query.notice](), notice: true } : '';
  let busy = false;
  const next = safeNext(ctx.query.next ? `#/${String(ctx.query.next).replace(/^#?\/?/, '')}` : '') || safeNext(ctx.from);

  if (!configured()) {
    render(el, html`<div class="onboard stack"><h1>${tt('מצב מכשיר בלבד', 'Device-only mode')}</h1>
      <p class="muted">${tt('באתר הזה אין חשבונות. הפרופיל וההתקדמות נשמרים בדפדפן הזה, ואפשר להוריד גיבוי ולשחזר אותו בכל מכשיר.', 'This site has no accounts. Your profile and progress are saved in this browser, and you can download a backup and restore it on any device.')}</p>
      <div class="row"><a class="key enter" href="${hasProfile() ? '#/settings' : '#/start'}">${hasProfile() ? tt('להגדרות ולגיבוי', 'To settings and backup') : tt('להתחיל', 'Get started')}</a>${hasProfile() ? '' : html`<a class="key ghost" href="#/import">${tt('שחזור מגיבוי', 'Restore a backup')}</a>`}</div></div>`);
    return;
  }

  // Shown on sign-up and sign-in (either can upload this device's progress), only while it is still needed.
  const needsGuardian = () => mode !== 'reset' && isUnder16(profile()) && !profile()?.guardian_consent_at;
  const guardianBox = () => (needsGuardian() ? html`<div class="ob-check" data-guardian-account>
      <label class="choice"><input type="checkbox" id="guardian" required aria-describedby="guardian-help"><span class="grow">${tt('יש לי אישור של הורה או אפוטרופוס לשמור את ההתקדמות שלי בחשבון בשרת', 'I have a parent\'s or guardian\'s permission to save my progress in an account on the server')}</span></label>
      <p class="help" id="guardian-help">${tt('מתחת לגיל 16 צריך אישור של הורה או אפוטרופוס לפני שמידע יוצא מהמכשיר.', 'Under 16, a parent or guardian agrees before any data leaves this device.')}</p></div>` : '');
  // The error sits under the box and takes the focus; the typed email and password stay (no redraw).
  function guardianMissing() {
    const box = $('#guardian', el);
    box.setAttribute('aria-invalid', 'true');
    box.setAttribute('aria-describedby', 'guardian-help guardian-err');
    if (!$('#guardian-err', el)) box.closest('label').insertAdjacentHTML('afterend', `<p class="error-text field-error" id="guardian-err">${esc(tt('כדי לפתוח חשבון או להיכנס אליו צריך אישור של הורה או אפוטרופוס. בלי חשבון, Lucid עובד במכשיר הזה בלבד.', 'To create or sign in to an account, a parent or guardian needs to agree. Without an account, Lucid works on this device only.'))}</p>`);
    box.focus();
  }

  function draw() {
    const signup = mode === 'signup', reset = mode === 'reset';
    render(el, html`<div class="onboard stack-lg">
      <h1>${signup ? tt('יצירת חשבון', 'Create an account') : reset ? tt('איפוס סיסמה', 'Reset password') : tt('כניסה', 'Sign in')}</h1>
      ${signup ? html`<p class="muted small">${tt('החשבון שומר את ההתקדמות בשרת ומסנכרן בין מכשירים. מה שכבר יש במכשיר הזה יועבר לחשבון.', 'An account saves progress on the server and syncs it between devices. What is already on this device moves into the account.')}</p>` : ''}
      ${msg?.notice ? html`<p class="banner" role="alert" data-notice>${msg.text}</p>` : ''}
      <form class="stack" novalidate data-auth>
        <div class="field"><label for="em">${tt('אימייל', 'Email')}</label><input class="input" id="em" type="email" autocomplete="email" dir="ltr" required></div>
        ${!reset ? html`<div class="field"><label for="pw">${tt('סיסמה', 'Password')}</label><input class="input" id="pw" type="password" minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" dir="ltr" required>${signup ? html`<span class="help">${tt('לפחות 8 תווים.', 'At least 8 characters.')}</span>` : ''}</div>` : ''}
        ${guardianBox()}
        ${msg && !msg.notice ? html`<p class="${msg.ok ? 'banner' : 'error-text'}" role="alert">${msg.text}</p>` : ''}
        ${captchaOn() ? html`<div class="captcha-slot" data-captcha></div>` : ''}
        <button class="key enter" type="submit" ${busy ? html`disabled` : ''}>${busy ? html`<span class="spinner" aria-hidden="true" style="width:1rem;height:1rem"></span>` : ''} ${signup ? tt('יצירת חשבון', 'Create account') : reset ? tt('שליחת קישור', 'Send link') : tt('כניסה', 'Sign in')}</button>
      </form>
      <div class="row small">${mode !== 'signin' ? html`<a href="#/account?mode=signin" data-mode="signin">${tt('יש לי חשבון', 'I have an account')}</a>` : html`<a href="#/account?mode=signup" data-mode="signup">${tt('אין לי חשבון', 'I don\'t have an account')}</a><a href="#/account?mode=reset" data-mode="reset">${tt('שכחתי סיסמה', 'Forgot password')}</a>`}</div>
    </div>`);
    // A fresh widget after every draw: a token is used once, and each request redraws the form.
    captcha?.dispose();
    captcha = captchaOn() ? mountCaptcha($('[data-captcha]', el), { lang: document.documentElement.lang === 'he' ? 'he' : 'en' }) : null;
  }
  let captcha = null;
  draw();

  const offs = [
    on(el, 'click', '[data-mode]', (e, a) => { e.preventDefault(); mode = a.dataset.mode; msg = ''; draw(); }),
    on(el, 'submit', '[data-auth]', async (e) => {
      e.preventDefault();
      const email = $('#em', el).value.trim(), pw = $('#pw', el)?.value || '';
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg = { text: tt('כתובת האימייל לא תקינה.', 'That email address does not look right.') }; draw(); return; }
      if (mode !== 'reset' && pw.length < 8) { msg = { text: tt('הסיסמה צריכה לפחות 8 תווים.', 'The password needs at least 8 characters.') }; draw(); return; }
      if (needsGuardian()) {
        if (!$('#guardian', el)?.checked) { guardianMissing(); return; }
        saveProfile({ guardian_consent_at: new Date().toISOString() });
      }
      let captchaToken = '';
      if (captcha) {
        try { captchaToken = await captcha.token(); } catch (err) {
          if (err.code === 'captcha_disposed') return;
          msg = { text: CAPTCHA_FAILED() }; draw(); return;
        }
      }
      busy = true; draw();
      try {
        if (mode === 'reset') { await auth.resetPassword(email, { captchaToken }); msg = { ok: true, text: tt('אם הכתובת רשומה, נשלח אליה קישור לאיפוס. פתחו אותו בדפדפן הזה, תוך שעה.', 'If that address has an account, a reset link is on its way. Open it in this browser within an hour.') }; }
        else if (mode === 'signup') {
          const r = await auth.signUp(email, pw, { next, captchaToken });
          if (r.needsConfirmation) msg = { ok: true, text: tt('שלחנו אימייל לאישור. פתחו את הקישור בדפדפן הזה, תוך שעה, ותחזרו לכאן מחוברים.', 'We sent a confirmation email. Open the link in this browser within an hour and you will come back here signed in.') };
          else { if (await afterSignIn('signup')) return; }
        } else { await auth.signIn(email, pw, { captchaToken }); if (await afterSignIn('signin')) return; }
      } catch (err) {
        msg = { text: captchaToken && isCaptchaError(err) ? CAPTCHA_FAILED() : err.network ? tt('אין חיבור לשרת. נסו שוב.', 'No connection to the server. Please try again.') : err.status === 400 ? tt('האימייל או הסיסמה לא נכונים.', 'The email or password is not correct.') : err.message };
      }
      busy = false; draw();
    }),
  ];

  // Returns true when the screen was left (signed in), false when the learner cancelled.
  async function afterSignIn(kind) {
    const { sync } = await import('../app.js');
    const r = await connectAccount({ kind, sync });
    if (!r.ok) { msg = { text: r.reason === 'cancelled' ? NOTICES.cancelled() : NOTICES.offline(), notice: r.reason === 'cancelled' }; return false; }
    if (['profile', 'offline', 'guardian'].includes(r.reason)) toast(syncPausedText(r.reason));
    else if (r.synced) toast(tt('נכנסת לחשבון. ההתקדמות מסונכרנת.', 'Signed in. Your progress is syncing.'));
    ctx.navigate(hasProfile() ? next || 'today' : 'start');
    return true;
  }
  return () => { captcha?.dispose(); offs.forEach((o) => o()); };
}
