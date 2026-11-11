// Settings: learning support, interface, learning load, feedback, AI consent, account, and data
// (export, import, delete). Every control takes effect immediately and is saved on the device.
// Under 16 (age.js), turning AI feedback on needs one more box ticked first: a parent or guardian has agreed
// (stored as ai_guardian_consent_at, cleared when AI is turned off); without it AI shows as off, also for consent given
// when Lucid was 16+ (age.js aiConsented). A signed-in learner under 16 whose sync is
// waiting for that agreement for the account can give it here (profile.guardian_consent_at; session.js). The box
// shows only while the last profile check really paused sync for that reason (syncPauseReason), never from the
// local field alone: on a second device the agreement is on the server and sync runs.
import { html, render, on, download, $ } from '../core/util.js';
import { tt, t, isolateLatin, uiLang } from '../core/i18n.js';
import { makeBackup, backupFileName, checkBackup, restoreBackup, describeBackup, backupProblem } from '../core/backup.js';
import { icon, confirmDialog, toast } from '../ui/components.js';
import { settings, saveSettings, profile, saveProfile, placementPending } from '../core/learner.js';
import { store, eraseDevice } from '../core/store.js';
import { auth, db, configured } from '../core/api.js';
import { signOut, syncPauseReason, syncPausedText, recheckProfile } from '../core/session.js';
import { CONFIG } from '../../config.js';
import { isUnder16, aiConsented } from '../core/age.js';
import { content } from '../core/content.js';
import { speedSwitch, toggleSpeed } from './wordgame.js';
import { paceOf } from '../core/wordgame.js';

// A segmented control named by its visible label (UX r3 PH-3): the group points at the label, and at its help line
// when there is one. off: the setting does nothing on this site (AI), so the group is greyed and inert (PH-5).
// opts: [value, Hebrew, English, lang?]; with a lang the option is shown in its own language ("English" in Hebrew).
function seg(name, value, opts, { off = false, help = false } = {}) {
  const described = [help && `help-${name}`, off && 'ai-off'].filter(Boolean).join(' ');
  return html`<div class="seg" role="group" data-seg="${name}" data-n="${opts.length}" aria-labelledby="lbl-${name}" ${described ? html`aria-describedby="${described}"` : ''} ${off ? html`aria-disabled="true"` : ''}>${opts.map(([v, he, en, lang]) => html`<button type="button" data-v="${v}" aria-pressed="${String(value) === String(v) ? 'true' : 'false'}" ${off ? html`aria-disabled="true"` : ''} ${lang ? html`lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}"` : ''}>${lang ? (lang === 'he' ? he : en) : tt(he, en)}</button>`)}</div>`;
}
// PG-1: a segment's cell is as wide as the group's longest label, so no label is squeezed or runs into the next one
// (CSS: --seg-cell). Measured after each draw and again once the web fonts have loaded.
export function fitSegs(root) {
  for (const g of root.querySelectorAll('.seg[data-seg]')) {
    let w = 0;
    for (const b of g.children) {
      const r = document.createRange();
      r.selectNodeContents(b);
      const cs = getComputedStyle(b);
      w = Math.max(w, r.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight));
    }
    if (w > 0) g.style.setProperty('--seg-cell', `${Math.ceil(w) + 2}px`);
  }
}
// One labelled field: the visible label (the group's name), the control and an optional help line.
const field = (name, label, control, help = '', { off = false } = {}) => html`<div class="field${off ? ' is-off' : ''}"><span class="label" id="lbl-${name}">${label}</span>${control}${help ? html`<span class="help" id="help-${name}">${isolateLatin(help)}</span>` : ''}</div>`;

// After the data is erased, Welcome opens in the language the learner was using (FR-11): it reads this key.
export function keepUiLang(lang, storage = (() => { try { return globalThis.sessionStorage; } catch { return null; } })()) {
  try { storage?.setItem('lucid-ui-lang', lang === 'en' ? 'en' : 'he'); } catch { /* storage blocked: Hebrew */ }
}

export default async function settingsView(el, ctx) {
  ctx.setTitle(t('nav.settings'));
  let pwOpen = Boolean(ctx.query.reset);
  const offline = { busy: false, text: '' };
  let pwMsg = '';
  let restoreMsg = '';
  let aiGuardian = false; // the guardian box next to AI feedback is ticked (kept across redraws)
  let aiGuardianError = false; // AI was ticked by a learner under 16 without the guardian box

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
    // Without AI on this site its settings do nothing, so the Feedback section is the one AI-off sentence, with no
    // controls that cannot work (launch FR-03; it was greyed controls before, PH-5). They come back when AI is on.
    const aiOn = configured() && CONFIG.aiEnabled;
    const young = isUnder16(p);
    const aiConsent = aiConsented(s, p); // under 16, consent without the guardian's agreement does not count
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.settings')}</h1><p>${tt('כל שינוי נשמר מיד.', 'Every change is saved immediately.')}</p></div></div>
      <div class="stack-lg settings-view" style="max-width:46rem">
        ${signedIn && pwOpen && ctx.query.reset ? passwordForm() : ''}
        <section class="panel stack" aria-labelledby="set-support"><h2 id="set-support">${tt('תמיכה בלמידה', 'Learning support')}</h2>
          ${field('text_size', tt('גודל טקסט', 'Text size'), seg('text_size', s.text_size, [[100, '100%', '100%'], [115, '115%', '115%'], [130, '130%', '130%'], [150, '150%', '150%']]))}
          ${field('hebrew_support', tt('הסברים בעברית', 'Hebrew support'), seg('hebrew_support', s.hebrew_support, [['auto', 'לפי הרמה', 'By level'], ['full', 'מלא', 'Full'], ['partial', 'חלקי', 'Partial'], ['minimal', 'בלחיצה', 'On tap'], ['off', 'כבוי', 'Off']], { help: true }),
            tt('״לפי הרמה״: מלא עד A1, חלקי ב-A2, בלחיצה ב-B1-B2, כבוי מ-C1. כשכבוי, עברית זמינה בלחיצה על ״בעברית״, ובשיעור יש גם מתג ״הכול בעברית״.', '"By level": full up to A1, partial at A2, on tap at B1 and B2, off from C1. When off, Hebrew is one tap away on "Hebrew", and lessons also have an "All in Hebrew" switch.'))}
          ${field('speech_rate', tt('מהירות הקראה', 'Speech speed'), seg('speech_rate', s.speech_rate, [[0.8, 'איטית', 'Slow'], [0.95, 'רגילה', 'Normal'], [1.1, 'מהירה', 'Fast']]))}
          ${field('sound', tt('צלילים במשחקים', 'Sounds in the games'), seg('sound', s.sound === false || s.sound === 'off' ? 'off' : 'on', [['on', 'פועל', 'On'], ['off', 'כבוי', 'Off']]))}
          ${speedSwitch(paceOf(s).challenge)}
        </section>
        <section class="panel stack" aria-labelledby="set-ui"><h2 id="set-ui">${tt('ממשק', 'Interface')}</h2>
          ${field('ui_language', tt('שפת הממשק', 'Interface language'), seg('ui_language', p.ui_language || 'he', [['he', 'עברית', 'עברית', 'he'], ['en', 'English', 'English', 'en']], { help: true }), tt('ההוראות והתפריטים. תוכן הלימוד תמיד באנגלית.', 'Instructions and menus. Learning content is always in English.'))}
          ${field('theme', tt('מראה', 'Appearance'), seg('theme', s.theme, [['system', 'לפי המכשיר', 'Match device'], ['light', 'בהיר', 'Light'], ['dark', 'כהה', 'Dark']]))}
          ${field('english_variant', tt('אנגלית בהגייה', 'English for listening and roleplay'), seg('english_variant', s.english_variant, [['any', 'בינלאומית', 'International'], ['US', 'אמריקאית', 'American'], ['UK', 'בריטית', 'British']], { help: true }),
            tt('קובע גם אילו מילים מוצגות במשחקי התמונות כשיש הבדל: ״אמריקאית״ מציגה למשל flashlight, והאחרות torch.', 'Also sets the words in the picture games where they differ: "American" shows, for example, flashlight; the others show torch.'))}
        </section>
        <section class="panel stack" aria-labelledby="set-load"><h2 id="set-load">${tt('עומס לימוד', 'Learning load')}</h2>
          <div class="field"><span class="label">${tt('נקודת התחלה', 'Starting point')}</span><div class="row">${placementPending()
            ? html`<a class="key small" href="#/placement?resume=1">${tt('להמשיך את מבחן המיקום', 'Continue the placement test')}</a>`
            : html`<a class="key small ghost" href="#/placement?restart=1">${tt('מבחן מיקום מחדש', 'Retake the placement test')}</a>`}<a class="key small ghost" href="#/path">${tt('לבחור רמה במסלול', 'Choose a level on the path')}</a></div></div>
          ${field('daily_minutes', tt('זמן ביום', 'Time per day'), seg('daily_minutes', s.daily_minutes, [[10, '10 דק׳', '10 min'], [20, '20 דק׳', '20 min'], [35, '35 דק׳', '35 min'], [50, '50 דק׳', '50 min']]))}
          ${field('weekly_goal_days', tt('יעד שבועי (ימים)', 'Weekly goal (days)'), seg('weekly_goal_days', s.weekly_goal_days, [2, 3, 4, 5, 6, 7].map((d) => [d, String(d), String(d)])))}
          ${field('new_per_day', tt('מילים חדשות ביום', 'New words a day'), seg('new_per_day', s.new_per_day, [[4, '4', '4'], [8, '8', '8'], [12, '12', '12'], [15, '15', '15']], { help: true }), tt('ברירת המחדל 8. כשהחזרות מצטברות, Lucid מוריד אוטומטית ל-4 כדי שלא ייווצר עומס.', 'Default 8. When reviews pile up, Lucid automatically drops to 4 so they never snowball.'))}
          ${field('retention', tt('יעד זכירה', 'Memory target'), seg('retention', s.retention, [['light', 'קל (85%)', 'Light (85%)'], ['standard', 'רגיל (90%)', 'Standard (90%)'], ['exam', 'גבוה (95%)', 'High (95%)']], { help: true }), tt('יעד גבוה יותר = יותר חזרות ביום.', 'A higher target means more reviews a day.'))}
        </section>
        <section class="panel stack" aria-labelledby="set-feedback"><h2 id="set-feedback">${tt('משוב', 'Feedback')}</h2>
          ${!aiOn ? html`<p class="small muted" id="ai-off">${isolateLatin(tt('AI לא פעיל באתר הזה. כל השאר עובד.', 'AI is not active on this site. Everything else works.'))} ${tt('לכן אין כאן הגדרות למשוב AI. הבדיקות האוטומטיות בכתיבה ובתרגילים פועלות תמיד.', 'So there are no AI feedback settings here. The automatic checks in writing and exercises always work.')}</p>` : html`
          ${field('corrections', tt('כמה תיקונים בשיחה ובמורה', 'How much correction in conversations and the tutor'), seg('corrections', s.corrections, [['off', 'בלי', 'Off'], ['light', 'קל', 'Light'], ['standard', 'רגיל', 'Standard'], ['intensive', 'הרבה', 'Intensive']], { off: !aiOn, help: true }),
            tt('קל: רק מה שחוסם הבנה. רגיל: תיקון אחד לכל היותר בכל תשובה של המורה. הרבה: עד שלושה. בשיחה עם AI רוב התיקונים מגיעים במשוב שבסוף.', 'Light: only what blocks meaning. Standard: at most one correction in each tutor reply. Intensive: up to three. In AI conversations most corrections come in the feedback at the end.'), { off: !aiOn })}
          ${field('feedback_scope', tt('משוב על כתיבה', 'Writing feedback'), seg('feedback_scope', s.feedback_scope, [['auto', 'לפי הרמה', 'By level'], ['focused', 'ממוקד', 'Focused'], ['comprehensive', 'מקיף', 'Comprehensive']], { off: !aiOn, help: true }),
            tt('ממוקד: עד 3 סוגי טעויות. מקיף: עד 12 טעויות. ״לפי הרמה״: ממוקד עד B1, מקיף מ-B2.', 'Focused: up to 3 kinds of mistake. Comprehensive: up to 12 mistakes. "By level": focused up to B1, comprehensive from B2.'), { off: !aiOn })}
          <div class="field${aiOn ? '' : ' is-off'}"><label class="choice"><input type="checkbox" data-ai ${aiOn && aiConsent ? html`checked` : ''} ${aiOn ? '' : html`disabled`} aria-describedby="ai-desc${aiOn ? '' : ' ai-off'}${aiGuardianError ? ' ai-guardian-err' : ''}"><span class="grow"><strong>${tt('משוב AI', 'AI feedback')}</strong></span></label>
            <span class="help" id="ai-desc">${isolateLatin(tt('כשמופעל, טקסטים ששולחים למשוב AI (כתיבה, שיחות, מורה) מעובדים אצל Anthropic לצורך המשוב בלבד. Lucid לא משתמש בהם לפרסום.', 'When on, texts you send for AI feedback (writing, conversations, tutor) are processed by Anthropic only to produce feedback. Lucid never uses them for advertising.'))}</span></div>
          ${aiOn && young && !aiConsent ? html`<div class="field" data-guardian-ai-box><label class="choice"><input type="checkbox" data-guardian-ai ${aiGuardian ? html`checked` : ''} ${aiGuardianError ? html`aria-invalid="true"` : ''} aria-describedby="ai-guardian-help${aiGuardianError ? ' ai-guardian-err' : ''}"><span class="grow">${isolateLatin(tt('יש לי אישור של הורה או אפוטרופוס לשלוח טקסטים למשוב AI', 'I have a parent\'s or guardian\'s permission to send my texts for AI feedback'))}</span></label>
            ${aiGuardianError ? html`<p class="error-text field-error" id="ai-guardian-err">${isolateLatin(tt('כדי להפעיל משוב AI צריך קודם אישור של הורה או אפוטרופוס.', 'To turn on AI feedback, a parent or guardian needs to agree first.'))}</p>` : ''}
            <span class="help" id="ai-guardian-help">${isolateLatin(tt('מתחת לגיל 16 צריך אישור של הורה או אפוטרופוס לפני שמפעילים משוב AI.', 'Under 16, a parent or guardian agrees before AI feedback is turned on.'))}</span></div>` : ''}`}
        </section>
        <section class="panel stack" aria-labelledby="set-account"><h2 id="set-account">${tt('חשבון וסנכרון', 'Account and sync')}</h2>
          ${!configured() ? html`<p class="small muted">${tt('Lucid פועל כאן במצב מכשיר בלבד: הכול נשמר בדפדפן הזה, ואין חשבון או סנכרון. כדי לא לאבד התקדמות, הורידו גיבוי מדי פעם.', 'Lucid runs in device-only mode here: everything is saved in this browser, with no account or sync. Download a backup now and then so you never lose progress.')}</p>`
          : signedIn ? html`<p class="small">${tt('מחובר/ת כ-', 'Signed in as ')}<strong dir="ltr">${auth.user?.email || ''}</strong></p>
            ${young && !p.guardian_consent_at && syncPauseReason() === 'guardian' ? html`<div class="field banner" data-guardian-account-box><p class="small">${tt('הסנכרון מושהה: מתחת לגיל 16 צריך קודם אישור של הורה או אפוטרופוס. עד אז ההתקדמות נשמרת רק במכשיר הזה.', 'Sync is paused: under 16, a parent or guardian needs to agree first. Until then your progress stays on this device only.')}</p>
              <label class="choice"><input type="checkbox" data-guardian-account><span class="grow">${tt('יש לי אישור של הורה או אפוטרופוס לשמור את ההתקדמות שלי בחשבון בשרת', 'I have a parent\'s or guardian\'s permission to save my progress in an account on the server')}</span></label></div>` : ''}
            <div class="row"><button type="button" class="key small" data-sync>${icon('refresh', { size: 16 })} ${tt('לסנכרן עכשיו', 'Sync now')}</button>${pwOpen ? '' : html`<button type="button" class="key small ghost" data-pw>${tt('שינוי סיסמה', 'Change password')}</button>`}</div>
            <div class="row"><button type="button" class="key small ghost" data-signout>${icon('log-out', { size: 16 })} ${tt('יציאה', 'Sign out')}</button><button type="button" class="key small ghost" data-signout-erase style="white-space:normal;text-align:start">${icon('log-out', { size: 16 })} ${tt('יציאה ומחיקת המידע מהמכשיר', 'Sign out and remove my data from this device')}</button></div>
            <p class="xsmall faint">${tt('במחשב משותף, בחרו ביציאה עם מחיקה. מה שסונכרן נשאר בחשבון שלכם בשרת.', 'On a shared computer, sign out and remove your data. Whatever has synced stays in your account on the server.')}</p>
            ${pwOpen && !ctx.query.reset ? passwordForm({ inline: true }) : ''}`
          : html`<p class="small muted">${tt('אפשר לפתוח חשבון כדי לשמור את ההתקדמות בשרת ולהמשיך מכל מכשיר.', 'Create an account to save progress on the server and continue on any device.')}</p><div class="row"><a class="key small" href="#/account?mode=signup">${tt('יצירת חשבון', 'Create account')}</a><a class="key small ghost" href="#/account?mode=signin">${tt('כניסה', 'Sign in')}</a></div>`}
        </section>
        <section class="panel stack" id="offline" tabindex="-1" aria-labelledby="offline-h"><h2 id="offline-h">${tt('שימוש בלי אינטרנט', 'Offline use')}</h2>
          <p class="small muted">${tt('המסכים, החזרה על מילים, השיחות המובנות ומעבדת הכתיבה עובדים גם בלי חיבור. את השיעורים (כ-3MB) שומרים כאן לפני נסיעה.', 'Screens, word review, scripted conversations and the Writing lab work without a connection. Save the lessons here (about 3 MB) before a trip.')} ${aiOn ? tt('משוב AI, שיחות AI וזיהוי דיבור דורשים חיבור.', 'AI feedback, AI conversations and speech recognition need a connection.') : tt('זיהוי דיבור דורש חיבור.', 'Speech recognition needs a connection.')}</p>
          <div class="row"><button type="button" class="key small" data-offline ${offline.busy || !('caches' in window) ? html`disabled` : ''}>${icon('download', { size: 16 })} ${tt('שמירת כל השיעורים במכשיר', 'Save all lessons on this device')}</button><span class="small faint" data-offline-status aria-live="polite">${offline.text}</span></div>
        </section>
        <section class="panel stack" aria-labelledby="set-data"><h2 id="set-data">${tt('המידע שלכם', 'Your data')}</h2>
          <p class="small muted">${tt('הכול שלכם: אפשר להוריד את כל המידע, לשחזר מגיבוי, או למחוק הכול.', 'It is all yours: download everything, restore from a backup, or delete it all.')}</p>
          <div class="settings-data">
            <button type="button" class="key small" data-export>${icon('download', { size: 16 })} ${tt('הורדת כל המידע (JSON)', 'Download all my data (JSON)')}</button>
            <label class="key small" style="cursor:pointer">${icon('refresh', { size: 16 })} ${tt('שחזור מגיבוי', 'Restore a backup')}<input type="file" accept="application/json,.json" data-import class="sr-only" aria-describedby="restore-msg"></label>
            <button type="button" class="key small danger" data-wipe>${icon('trash', { size: 16 })} ${signedIn ? tt('מחיקת החשבון וכל המידע', 'Delete my account and all data') : tt('מחיקת כל המידע מהמכשיר', 'Delete all data from this device')}</button>
          </div>
          <p class="error-text" id="restore-msg" role="alert" data-restore-msg>${restoreMsg}</p>
        </section>
        <p class="xsmall faint settings-foot"><a href="privacy.html" target="_blank" rel="noopener">${tt('מדיניות הפרטיות', 'Privacy policy')}</a> · <a href="accessibility.html" target="_blank" rel="noopener">${tt('הצהרת נגישות', 'Accessibility statement')}</a> · ${t('level.estimate')}</p>
      </div>`);
    fitSegs(el);
  }

  // After a redraw the keyboard stays on the control that was used (PH-3).
  const redraw = (sel) => { draw(); $(sel, el)?.focus({ preventScroll: true }); };

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
  document.fonts?.ready.then(() => { if (el.isConnected) fitSegs(el); }).catch(() => {});
  // The text size can change while the page is open (the attribute is set by the shell): measure again.
  const sizeWatch = new MutationObserver(() => fitSegs(el));
  sizeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text'] });
  showOfflineCount();
  // "Offline use" links from Real life and Help open this section (persona panel M1). The router scrolls to the
  // top after the view is drawn, so this runs after it.
  if (ctx.query.section === 'offline') setTimeout(() => { const sec = $('#offline', el); sec?.scrollIntoView({ block: 'start' }); sec?.focus({ preventScroll: true }); }, 0);
  // The profile check finishes after the first draw (and again after the agreement): draw again when its result
  // changes, keeping the focus where it was.
  const onSyncState = () => {
    if (!el.isConnected) return;
    const a = document.activeElement;
    const key = a && el.contains(a) ? (a.id ? `#${a.id}` : [...a.attributes].map((x) => x.name).find((n) => n.startsWith('data-'))) : null;
    draw();
    if (key) $(key.startsWith('#') ? key : `[${key}]`, el)?.focus({ preventScroll: true });
  };
  addEventListener('lucid-sync-state', onSyncState);
  const offs = [
    () => removeEventListener('lucid-sync-state', onSyncState),
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
      const group = b.closest('[data-seg]');
      if (group.getAttribute('aria-disabled') === 'true') return;
      const name = group.dataset.seg;
      const raw = b.dataset.v;
      const v = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
      if (name === 'ui_language') saveProfile({ ui_language: v }); else saveSettings({ [name]: v });
      redraw(`[data-seg="${name}"] [data-v="${raw}"]`);
    }),
    // The games' one speed setting (UX r4 PG-2): the same switch as on the games page, off by default.
    on(el, 'click', '[data-speed-switch]', () => { toggleSpeed(); redraw('[data-speed-switch]'); }),
    on(el, 'change', '[data-ai]', (e, c) => {
      if (!(configured() && CONFIG.aiEnabled)) { c.checked = false; return; } // no AI on this site: nothing to turn on
      const young = isUnder16(profile());
      if (c.checked && young && !aiGuardian) { c.checked = false; aiGuardianError = true; redraw('[data-guardian-ai]'); return; }
      aiGuardianError = false;
      aiGuardian = false; // turning AI on again later asks again
      const at = c.checked ? new Date().toISOString() : null;
      saveSettings({ ai_consent: c.checked, ai_consent_at: at, ...(young ? { ai_guardian_consent_at: at } : {}) });
      // The AI service checks consent on the server profile, so keep it in step.
      if (configured() && auth.signedIn) db.updateProfile({ consent_ai_at: at }).catch(() => toast(tt('לא הצלחנו לעדכן את השרת; נסו שוב.', 'Could not update the server; please try again.')));
      toast(c.checked ? tt('משוב AI הופעל', 'AI feedback is on') : tt('משוב AI כבוי', 'AI feedback is off'));
      redraw('[data-ai]');
    }),
    on(el, 'change', '[data-guardian-ai]', (e, c) => { aiGuardian = c.checked; if (c.checked && aiGuardianError) { aiGuardianError = false; redraw('[data-guardian-ai]'); } }),
    // Saving the agreement lets session.js create (or update) the server profile and start syncing. The toast
    // says what the profile check really did: started, or why sync is still paused.
    on(el, 'change', '[data-guardian-account]', async (e, c) => {
      if (!c.checked) return;
      saveProfile({ guardian_consent_at: new Date().toISOString() });
      redraw('[data-sync]');
      const r = await recheckProfile();
      toast(r.synced ? tt('האישור נשמר, והסנכרון התחיל.', 'Your agreement is saved, and sync has started.')
        : `${tt('האישור נשמר.', 'Your agreement is saved.')} ${['offline', 'profile'].includes(r.reason) ? syncPausedText(r.reason) : ''}`.trim());
    }),
    on(el, 'click', '[data-export]', async () => {
      const local = store.snapshot();
      let server = null;
      if (configured() && auth.signedIn) { try { server = await db.exportAll(); } catch { toast(tt('לא הצלחנו להוריד את המידע מהשרת; הורד המידע מהמכשיר.', 'Could not fetch server data; the device copy was downloaded.')); } }
      download(backupFileName(), JSON.stringify({ ...makeBackup(store, { server }), device: local }, null, 1));
    }),
    on(el, 'change', '[data-import]', async (e, input) => {
      const f = input.files?.[0];
      if (!f) return;
      restoreMsg = '';
      try {
        // Checked before anything is written; the confirmation says what the backup holds (js/core/backup.js).
        const text = await f.text();
        const r = checkBackup(text);
        if (!r.ok) throw Object.assign(new Error('not a Lucid backup'), { reason: r.reason });
        if (!(await confirmDialog({ title: tt('לשחזר מהגיבוי?', 'Restore from this backup?'), body: `${describeBackup(r.summary).join(' · ')}. ${tt('המידע הנוכחי במכשיר יוחלף במידע מהקובץ.', 'The data on this device will be replaced by the file.')}`, confirm: tt('שחזור', 'Restore') }))) return;
        await restoreBackup(store, text);
        toast(tt('השחזור הושלם', 'Restored'));
        ctx.navigate('today');
      } catch (err) {
        // PH-10: the error stays beside the button and says what to choose instead.
        restoreMsg = backupProblem(err?.reason);
        const m = $('[data-restore-msg]', el); if (m) m.textContent = restoreMsg;
      } finally { input.value = ''; }
    }),
    on(el, 'click', '[data-wipe]', async () => {
      const signedIn = configured() && auth.signedIn;
      const ok = await confirmDialog({
        title: signedIn ? tt('למחוק את החשבון לצמיתות?', 'Delete your account permanently?') : tt('למחוק את כל המידע מהמכשיר?', 'Delete all data from this device?'),
        body: tt('זה מוחק את הפרופיל, ההתקדמות, המילים והכתיבה שלכם. אי אפשר לבטל. כדאי להוריד גיבוי קודם.', 'This deletes your profile, progress, words and writing. It cannot be undone. Consider downloading a copy first.'),
        confirm: tt('מחיקה לצמיתות', 'Delete permanently'), danger: true,
      });
      if (!ok) return;
      try { if (signedIn) await db.deleteAccount(); } catch (e) { toast(tt('מחיקת החשבון בשרת נכשלה. נסו שוב.', 'Deleting the server account failed. Please try again.')); return; }
      // Only Lucid's data: the browser origin is shared with other apps (security review S-04). The interface
      // language is a preference of this browser session, not learner data: Welcome keeps it (FR-11).
      const lang = uiLang();
      await eraseDevice();
      keepUiLang(lang);
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
      const lang = uiLang();
      await signOut({ erase: true });
      keepUiLang(lang);
      location.hash = '#/welcome';
      location.reload();
    }),
    on(el, 'click', '[data-sync]', async () => {
      const { sync } = await import('../app.js');
      // Waiting for a guardian is not retried on its own: point to the box above instead.
      try { const r = await sync?.run(); toast(!r?.skipped ? t('synced') : syncPauseReason() === 'guardian' ? tt('הסנכרון מושהה עד שהורה או אפוטרופוס יאשרו, בתיבה שלמעלה. עד אז ההתקדמות נשמרת רק במכשיר הזה.', 'Sync is paused until a parent or guardian agrees, in the box above. Until then your progress stays on this device only.') : tt('הסנכרון מושהה עד שהפרופיל יישמר בשרת. ננסה שוב אוטומטית.', 'Sync is paused until your profile is saved on the server. Lucid will try again automatically.')); } catch { toast(t('offline')); }
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
  return () => { sizeWatch.disconnect(); offs.forEach((o) => o()); };
}
