// Settings: interface, Hebrew support, learning load, feedback, AI consent, account, and data
// (export, import, delete). Every control takes effect immediately and is saved on the device.
import { html, render, on, download, $ } from '../core/util.js';
import { tt, t } from '../core/i18n.js';
import { icon, confirmDialog, toast } from '../ui/components.js';
import { settings, saveSettings, profile, saveProfile } from '../core/learner.js';
import { store, eraseDevice } from '../core/store.js';
import { auth, db, configured } from '../core/api.js';
import { signOut } from '../core/session.js';
import { CONFIG } from '../../config.js';
import { content } from '../core/content.js';

const seg = (name, value, opts) => html`<div class="seg" role="group" data-seg="${name}">${opts.map(([v, he, en]) => html`<button type="button" data-v="${v}" aria-pressed="${String(value) === String(v)}">${tt(he, en)}</button>`)}</div>`;

export default async function settingsView(el, ctx) {
  ctx.setTitle(t('nav.settings'));
  let pwOpen = Boolean(ctx.query.reset);
  const offline = { busy: false, text: '' };
  let pwMsg = '';

  // Changing the password asks for the current one, unless a reset link was just used on this device.
  // From a reset link it opens at the top of the page; from "Change password", inside the account section.
  function passwordForm({ inline = false } = {}) {
    const fresh = auth.recoveryFresh;
    const title = fresh ? tt('סיסמה חדשה', 'New password') : tt('שינוי סיסמה', 'Change password');
    return html`<form class="${inline ? 'stack' : 'panel stack'}" data-newpass novalidate>${inline ? html`<h3>${title}</h3>` : html`<h2>${title}</h2>`}
      <input type="email" autocomplete="username" value="${auth.user?.email || ''}" hidden>
      ${fresh ? '' : html`<div class="field"><label for="cp">${tt('הסיסמה הנוכחית', 'Current password')}</label><input class="input" id="cp" type="password" autocomplete="current-password" dir="ltr" required></div>`}
      <div class="field"><label for="np">${tt('סיסמה חדשה (לפחות 8 תווים)', 'New password (at least 8 characters)')}</label><input class="input" id="np" type="password" minlength="8" autocomplete="new-password" dir="ltr" required></div>
      ${pwMsg ? html`<p class="error-text" role="alert">${pwMsg}</p>` : ''}
      <div class="row"><button class="key enter" type="submit">${t('save')}</button>${fresh ? '' : html`<button type="button" class="key ghost" data-pw-cancel>${t('cancel')}</button>`}</div></form>`;
  }

  function draw() {
    const s = settings();
    const p = profile() || {};
    const signedIn = configured() && auth.signedIn;
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.settings')}</h1><p>${tt('כל שינוי נשמר מיד.', 'Every change is saved immediately.')}</p></div></div>
      <div class="stack-lg" style="max-width:46rem">
        ${signedIn && pwOpen && ctx.query.reset ? passwordForm() : ''}
        <section class="panel stack"><h2>${tt('ממשק', 'Interface')}</h2>
          <div class="field"><span class="label">${tt('שפת הממשק', 'Interface language')}</span>${seg('ui_language', p.ui_language || 'he', [['he', 'עברית', 'Hebrew'], ['en', 'אנגלית', 'English']])}<span class="help">${tt('ההוראות והתפריטים. תוכן הלימוד תמיד באנגלית.', 'Instructions and menus. Learning content is always in English.')}</span></div>
          <div class="field"><span class="label">${tt('מראה', 'Appearance')}</span>${seg('theme', s.theme, [['system', 'לפי המכשיר', 'Match device'], ['light', 'בהיר', 'Light'], ['dark', 'כהה', 'Dark']])}</div>
          <div class="field"><span class="label">${tt('גודל טקסט', 'Text size')}</span>${seg('text_size', s.text_size, [[100, '100%', '100%'], [115, '115%', '115%'], [130, '130%', '130%'], [150, '150%', '150%']])}</div>
          <div class="field"><span class="label">${tt('הסברים בעברית', 'Hebrew support')}</span>${seg('hebrew_support', s.hebrew_support, [['auto', 'לפי הרמה', 'By level'], ['full', 'מלא', 'Full'], ['partial', 'חלקי', 'Partial'], ['minimal', 'מינימלי', 'Minimal'], ['off', 'כבוי', 'Off']])}
            <span class="help">${tt('״לפי הרמה״: מלא עד A1, חלקי ב-A2, בלחיצה ב-B1-B2, כבוי מ-C1. כשכבוי, עברית זמינה בלחיצה על ״עב״.', '"By level": full up to A1, partial at A2, on tap at B1 and B2, off from C1. When off, Hebrew is one tap away on "עב".')}</span></div>
          <div class="field"><span class="label">${tt('אנגלית בהגייה', 'English for listening and roleplay')}</span>${seg('english_variant', s.english_variant, [['any', 'בינלאומית', 'International'], ['US', 'אמריקאית', 'American'], ['UK', 'בריטית', 'British']])}</div>
          <div class="field"><span class="label">${tt('מהירות הקראה', 'Speech speed')}</span>${seg('speech_rate', s.speech_rate, [[0.8, 'איטית', 'Slow'], [0.95, 'רגילה', 'Normal'], [1.1, 'מהירה', 'Fast']])}</div>
        </section>
        <section class="panel stack"><h2>${tt('עומס לימוד', 'Learning load')}</h2>
          <div class="field"><span class="label">${tt('זמן ביום', 'Time per day')}</span>${seg('daily_minutes', s.daily_minutes, [[10, '10 דק׳', '10 min'], [20, '20 דק׳', '20 min'], [35, '35 דק׳', '35 min'], [50, '50 דק׳', '50 min']])}</div>
          <div class="field"><span class="label">${tt('יעד שבועי (ימים)', 'Weekly goal (days)')}</span>${seg('weekly_goal_days', s.weekly_goal_days, [2, 3, 4, 5, 6, 7].map((d) => [d, String(d), String(d)]))}</div>
          <div class="field"><span class="label">${tt('מילים חדשות ביום', 'New words a day')}</span>${seg('new_per_day', s.new_per_day, [[4, '4', '4'], [8, '8', '8'], [12, '12', '12'], [15, '15', '15']])}<span class="help">${tt('ברירת המחדל 8. כשהחזרות מצטברות, Lucid מוריד אוטומטית ל-4 כדי שלא תיווצר עמסה.', 'Default 8. When reviews pile up, Lucid automatically drops to 4 so they never snowball.')}</span></div>
          <div class="field"><span class="label">${tt('יעד זכירה', 'Memory target')}</span>${seg('retention', s.retention, [['light', 'קל (85%)', 'Light (85%)'], ['standard', 'רגיל (90%)', 'Standard (90%)'], ['exam', 'מבחן (95%)', 'Exam (95%)']])}<span class="help">${tt('יעד גבוה יותר = יותר חזרות ביום.', 'A higher target means more reviews a day.')}</span></div>
        </section>
        <section class="panel stack"><h2>${tt('משוב', 'Feedback')}</h2>
          <div class="field"><span class="label">${tt('כמה תיקונים בשיחה ובמורה', 'How much correction in conversations and the tutor')}</span>${seg('corrections', s.corrections, [['off', 'בלי', 'Off'], ['light', 'רק מה שחוסם הבנה', 'Only what blocks meaning'], ['standard', 'רגיל', 'Standard'], ['intensive', 'הרבה', 'Intensive']])}</div>
          <div class="field"><span class="label">${tt('משוב על כתיבה', 'Writing feedback')}</span>${seg('feedback_scope', s.feedback_scope, [['auto', 'לפי הרמה', 'By level'], ['focused', 'ממוקד (עד 3 סוגי טעויות)', 'Focused (up to 3 error types)'], ['comprehensive', 'מקיף', 'Comprehensive']])}</div>
          <label class="choice"><input type="checkbox" data-ai ${s.ai_consent ? html`checked` : ''}><span class="grow small"><strong>${tt('משוב AI', 'AI feedback')}</strong><br>${tt('כשמופעל, טקסטים ששולחים למשוב AI (כתיבה, שיחות, מורה) מעובדים אצל Anthropic לצורך המשוב בלבד. Lucid לא משתמש בהם לפרסום.', 'When on, texts you send for AI feedback (writing, conversations, tutor) are processed by Anthropic only to produce feedback. Lucid never uses them for advertising.')} ${!(configured() && CONFIG.aiEnabled) ? html`<span class="faint">${tt('(בשרת הזה ה-AI עוד לא הוגדר.)', '(AI is not configured on this server yet.)')}</span>` : ''}</span></label>
        </section>
        <section class="panel stack"><h2>${tt('חשבון וסנכרון', 'Account and sync')}</h2>
          ${!configured() ? html`<p class="small muted">${tt('Lucid פועל כאן במצב מכשיר בלבד: הכול נשמר בדפדפן הזה, ואין חשבון או סנכרון. כדי לא לאבד התקדמות, הורידו גיבוי מדי פעם.', 'Lucid runs in device-only mode here: everything is saved in this browser, with no account or sync. Download a backup now and then so you never lose progress.')}</p>`
          : signedIn ? html`<p class="small">${tt('מחובר/ת כ-', 'Signed in as ')}<strong dir="ltr">${auth.user?.email || ''}</strong></p>
            <div class="row"><button type="button" class="key small" data-sync>${icon('refresh', { size: 16 })} ${tt('לסנכרן עכשיו', 'Sync now')}</button>${pwOpen ? '' : html`<button type="button" class="key small ghost" data-pw>${tt('שינוי סיסמה', 'Change password')}</button>`}</div>
            <div class="row"><button type="button" class="key small ghost" data-signout>${icon('log-out', { size: 16 })} ${tt('יציאה', 'Sign out')}</button><button type="button" class="key small ghost" data-signout-erase style="white-space:normal;text-align:start">${icon('log-out', { size: 16 })} ${tt('יציאה ומחיקת המידע מהמכשיר', 'Sign out and remove my data from this device')}</button></div>
            <p class="xsmall faint">${tt('במחשב משותף, בחרו ביציאה עם מחיקה. מה שסונכרן נשאר בחשבון שלכם בשרת.', 'On a shared computer, sign out and remove your data. Whatever has synced stays in your account on the server.')}</p>
            ${pwOpen && !ctx.query.reset ? passwordForm({ inline: true }) : ''}`
          : html`<p class="small muted">${tt('אפשר לפתוח חשבון כדי לשמור את ההתקדמות בשרת ולהמשיך מכל מכשיר.', 'Create an account to save progress on the server and continue on any device.')}</p><div class="row"><a class="key small" href="#/account?mode=signup">${tt('יצירת חשבון', 'Create account')}</a><a class="key small ghost" href="#/account?mode=signin">${tt('כניסה', 'Sign in')}</a></div>`}
        </section>
        <section class="panel stack"><h2>${tt('שימוש בלי אינטרנט', 'Offline use')}</h2>
          <p class="small muted">${tt('המסכים, החזרה על מילים, השיחות המובנות ומעבדת הכתיבה עובדים גם בלי חיבור. את השיעורים (כ-3MB) שומרים כאן לפני נסיעה. משוב AI, שיחות AI וזיהוי דיבור דורשים חיבור.', 'Screens, word review, scripted conversations and the Writing lab work without a connection. Save the lessons here (about 3 MB) before a trip. AI feedback, AI conversations and speech recognition need a connection.')}</p>
          <div class="row"><button type="button" class="key small" data-offline ${offline.busy || !('caches' in window) ? html`disabled` : ''}>${icon('download', { size: 16 })} ${tt('שמירת כל השיעורים במכשיר', 'Save all lessons on this device')}</button><span class="small faint" data-offline-status aria-live="polite">${offline.text}</span></div>
        </section>
        <section class="panel stack"><h2>${tt('המידע שלך', 'Your data')}</h2>
          <p class="small muted">${tt('הכול שלך: אפשר להוריד את כל המידע, לשחזר מגיבוי, או למחוק הכול.', 'It is all yours: download everything, restore from a backup, or delete it all.')}</p>
          <div class="row"><button type="button" class="key small" data-export>${icon('download', { size: 16 })} ${tt('הורדת כל המידע (JSON)', 'Download all my data (JSON)')}</button>
            <label class="key small" style="cursor:pointer">${tt('שחזור מגיבוי', 'Restore a backup')}<input type="file" accept="application/json,.json" data-import class="sr-only"></label></div>
          <div class="row"><button type="button" class="key small danger" data-wipe>${icon('trash', { size: 16 })} ${signedIn ? tt('מחיקת החשבון וכל המידע', 'Delete my account and all data') : tt('מחיקת כל המידע מהמכשיר', 'Delete all data from this device')}</button></div>
        </section>
        <p class="xsmall faint"><a href="privacy.html" target="_blank" rel="noopener">${tt('מדיניות פרטיות ותנאים', 'Privacy and terms')}</a> · ${t('level.estimate')}</p>
      </div>`);
  }

  // How many lesson files are in a Lucid cache (only meaningful once the service worker is running).
  async function offlineCount() {
    if (!('caches' in window)) return null;
    const ids = (await content.manifest())?.lessons || [];
    const keys = (await caches.keys()).filter((k) => k.startsWith('lucid-'));
    let n = 0;
    for (const id of ids) {
      const url = new URL(`content/lessons/${id}.json`, location.href).href;
      for (const k of keys) if (await (await caches.open(k)).match(url)) { n++; break; }
    }
    return { n, total: ids.length };
  }
  function showOfflineCount() {
    offlineCount().then((c) => { if (!c || offline.busy) return; offline.text = tt(`${c.n} מתוך ${c.total} שיעורים שמורים במכשיר.`, `${c.n} of ${c.total} lessons saved on this device.`); const s = $('[data-offline-status]', el); if (s) s.textContent = offline.text; }).catch(() => {});
  }

  draw();
  showOfflineCount();
  const offs = [
    on(el, 'click', '[data-offline]', async (e, b) => {
      const ids = (await content.manifest())?.lessons || [];
      offline.busy = true; b.disabled = true;
      const status = $('[data-offline-status]', el);
      let ok = 0, failed = 0;
      for (const id of ids) {
        // Fetched through the service worker, which keeps a copy; a plain HTTP cache is not reliable offline.
        try { const r = await fetch(`content/lessons/${id}.json`, { cache: 'no-cache' }); if (r.ok) ok++; else failed++; } catch { failed++; }
        if (status) status.textContent = tt(`נשמרו ${ok} מתוך ${ids.length}…`, `Saved ${ok} of ${ids.length}…`);
      }
      offline.busy = false; b.disabled = false;
      offline.text = failed ? tt(`נשמרו ${ok} שיעורים; ${failed} לא נשמרו. נסו שוב עם חיבור.`, `Saved ${ok} lessons; ${failed} could not be saved. Try again with a connection.`) : tt(`כל ${ok} השיעורים שמורים. אפשר ללמוד בלי אינטרנט.`, `All ${ok} lessons are saved. You can study offline.`);
      if (status) status.textContent = offline.text;
      if (!navigator.serviceWorker?.controller) toast(tt('השמירה תעבוד אחרי טעינה מחדש אחת של Lucid.', 'Saving takes effect after Lucid has been reloaded once.'));
    }),
    on(el, 'click', '[data-seg] [data-v]', (e, b) => {
      const name = b.closest('[data-seg]').dataset.seg;
      const raw = b.dataset.v;
      const v = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
      if (name === 'ui_language') saveProfile({ ui_language: v }); else saveSettings({ [name]: v });
      draw();
    }),
    on(el, 'change', '[data-ai]', (e, c) => {
      const at = c.checked ? new Date().toISOString() : null;
      saveSettings({ ai_consent: c.checked, ai_consent_at: at });
      // The AI service checks consent on the server profile, so keep it in step.
      if (configured() && auth.signedIn) db.updateProfile({ consent_ai_at: at }).catch(() => toast(tt('לא הצלחנו לעדכן את השרת; נסו שוב.', 'Could not update the server; please try again.')));
      toast(c.checked ? tt('משוב AI הופעל', 'AI feedback is on') : tt('משוב AI כבוי', 'AI feedback is off'));
    }),
    on(el, 'click', '[data-export]', async () => {
      const local = store.snapshot();
      let server = null;
      if (configured() && auth.signedIn) { try { server = await db.exportAll(); } catch { toast(tt('לא הצלחנו להוריד את המידע מהשרת; הורד המידע מהמכשיר.', 'Could not fetch server data; the device copy was downloaded.')); } }
      download(`lucid-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'lucid', version: 1, exported_at: new Date().toISOString(), device: local, server }, null, 1));
    }),
    on(el, 'change', '[data-import]', async (e, input) => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.app !== 'lucid' || !data.device) throw new Error('not a Lucid backup');
        if (!(await confirmDialog({ title: tt('לשחזר מהגיבוי?', 'Restore from this backup?'), body: tt('המידע הנוכחי במכשיר יוחלף במידע מהקובץ.', 'The data on this device will be replaced by the file.'), confirm: tt('שחזור', 'Restore') }))) return;
        await store.replaceAll(data.device);
        toast(tt('השחזור הושלם', 'Restored'));
        ctx.navigate('today');
      } catch {
        toast(tt('הקובץ הזה לא גיבוי תקין של Lucid.', 'This file is not a valid Lucid backup.'));
      } finally { input.value = ''; }
    }),
    on(el, 'click', '[data-wipe]', async () => {
      const signedIn = configured() && auth.signedIn;
      const ok = await confirmDialog({
        title: signedIn ? tt('למחוק את החשבון לצמיתות?', 'Delete your account permanently?') : tt('למחוק את כל המידע מהמכשיר?', 'Delete all data from this device?'),
        body: tt('זה מוחק את הפרופיל, ההתקדמות, המילים והכתיבה שלך. אי אפשר לבטל. כדאי להוריד גיבוי קודם.', 'This deletes your profile, progress, words and writing. It cannot be undone. Consider downloading a copy first.'),
        confirm: tt('מחיקה לצמיתות', 'Delete permanently'), danger: true,
      });
      if (!ok) return;
      try { if (signedIn) await db.deleteAccount(); } catch (e) { toast(tt('מחיקת החשבון בשרת נכשלה. נסו שוב.', 'Deleting the server account failed. Please try again.')); return; }
      // Only Lucid's data: the browser origin is shared with other apps (security review S-04).
      await eraseDevice();
      location.hash = '#/welcome';
      location.reload();
    }),
    on(el, 'click', '[data-signout]', async () => { await signOut(); toast(tt('יצאת מהחשבון. המידע נשאר במכשיר.', 'Signed out. Your data stays on this device.')); draw(); }),
    on(el, 'click', '[data-signout-erase]', async () => {
      const { sync } = await import('../app.js');
      try { await sync?.run(); } catch { /* offline: counted below */ }
      const pending = store.dirty().length;
      const ok = await confirmDialog({
        title: tt('לצאת ולמחוק את המידע מהמכשיר?', 'Sign out and remove your data from this device?'),
        body: pending ? tt(`${pending} שינויים עוד לא הגיעו לשרת, והם יימחקו. כל השאר שמור בחשבון שלכם.`, `${pending} changes have not reached the server yet and will be lost. Everything else is saved in your account.`)
          : tt('ההתקדמות שמורה בחשבון שלכם ותחזור כשתיכנסו שוב.', 'Your progress is saved in your account and comes back when you sign in again.'),
        confirm: tt('יציאה ומחיקה', 'Sign out and remove'), danger: pending > 0,
      });
      if (!ok) return;
      await signOut({ erase: true });
      location.hash = '#/welcome';
      location.reload();
    }),
    on(el, 'click', '[data-sync]', async () => {
      const { sync } = await import('../app.js');
      try { const r = await sync?.run(); toast(r?.skipped ? tt('הסנכרון מושהה עד שהפרופיל יישמר בשרת. ננסה שוב אוטומטית.', 'Sync is paused until your profile is saved on the server. Lucid will try again automatically.') : t('synced')); } catch { toast(t('offline')); }
    }),
    on(el, 'click', '[data-pw]', () => { pwOpen = true; pwMsg = ''; draw(); $('#cp', el)?.focus(); }),
    on(el, 'click', '[data-pw-cancel]', () => { pwOpen = false; pwMsg = ''; if (ctx.query.reset) ctx.navigate('settings'); else draw(); }),
    on(el, 'submit', '[data-newpass]', async (e) => {
      e.preventDefault();
      const current = $('#cp', el)?.value || '', next = $('#np', el).value;
      if (next.length < 8) { pwMsg = tt('הסיסמה החדשה צריכה לפחות 8 תווים.', 'The new password needs at least 8 characters.'); draw(); return; }
      if (!auth.recoveryFresh && !current) { pwMsg = tt('כתבו את הסיסמה הנוכחית.', 'Enter your current password.'); draw(); return; }
      try {
        await auth.updatePassword(next, { current });
        pwOpen = false; pwMsg = '';
        toast(tt('הסיסמה עודכנה', 'Password updated'));
        if (ctx.query.reset) ctx.navigate('settings'); else draw();
      } catch (err) {
        pwMsg = err.code === 'wrong_password' ? tt('הסיסמה הנוכחית לא נכונה.', 'The current password is not correct.')
          : err.network ? tt('אין חיבור לשרת. נסו שוב.', 'No connection to the server. Please try again.') : err.message;
        draw();
      }
    }),
  ];
  return () => offs.forEach((o) => o());
}
