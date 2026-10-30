// What happens around signing in, on top of api.js: whose learning is on this device, the server
// profile, and when sync may run. The account screen calls connectAccount() after a password sign-in;
// boot calls startSession() for email links and returning sessions. Not used in device-only mode.
// - Local data remembers its owner (store.owner()). Signing in as someone else never merges silently:
//   the learner removes the other account's data or cancels (security review S-06).
// - Sync waits until the data is confirmed as this account's and the server profile exists, so a refused
//   profile (for example the age gate) also means nothing is uploaded (S-05).
import { store, eraseDevice } from './store.js';
import { auth, db, configured } from './api.js';
import { profile, saveProfile, settings } from './learner.js';
import { tt } from './i18n.js';
import { esc } from './util.js';
import { openDialog, toast } from '../ui/components.js';

let ready = false; // this account owns the device data and has a server profile
let checking = null;
let activeSync = null;

// What to do with the data on this device when `userId` signs in.
// 'proceed': nothing here, or it is already theirs (or they are signing up, and the sign-up screen
// says the device's progress moves into the new account). 'other': another account's data.
// 'unowned': data made without an account, on a sign-in: ask before moving it in.
export function ownership({ owner, userId, hasData, kind }) {
  if (!hasData || owner === userId) return 'proceed';
  if (owner) return 'other';
  return kind === 'signup' ? 'proceed' : 'unowned';
}

// The guard sync.js asks before every run.
export const syncAllowed = () => ready && auth.signedIn && Boolean(auth.user?.id) && store.owner() === auth.user.id;

function emailHtml(email) { return `<bdi dir="ltr">${esc(email || '')}</bdi>`; }

// Resolves to 'move', 'clear' or 'cancel'.
function askAboutDeviceData(decision, email) {
  const pending = store.dirty().length;
  const other = decision === 'other';
  const title = other ? tt('במכשיר הזה שמור מידע של חשבון אחר', 'This device has another account’s data')
    : tt('להעביר את ההתקדמות שבמכשיר לחשבון?', 'Move the progress on this device into your account?');
  const body = other
    ? tt(`כדי להיכנס בתור ${emailHtml(email)}, צריך קודם להסיר מהמכשיר את המידע של החשבון הקודם. מה שכבר סונכרן נשמר בחשבון ההוא בשרת.`, `To sign in as ${emailHtml(email)}, first remove the previous account’s data from this device. Whatever was synced stays in that account on the server.`)
      + (pending ? ` ${tt(`${pending} שינויים אחרונים עוד לא הגיעו לשרת, והם יימחקו.`, `${pending} recent changes have not reached the server yet and will be lost.`)}` : '')
    : tt(`במכשיר הזה יש התקדמות שלא שייכת לאף חשבון. אם היא שלכם, העבירו אותה לחשבון ${emailHtml(email)}. אם היא של מישהו אחר, הסירו אותה מהמכשיר.`, `This device has progress that is not linked to any account. If it is yours, move it into ${emailHtml(email)}. If it belongs to someone else, remove it from this device.`);
  const btn = (value, label, cls) => `<button class="key ${cls}" value="${value}" data-close>${esc(label)}</button>`;
  return new Promise((resolve) => {
    const d = openDialog(`<div class="stack" data-owner-dialog="${decision}">
        <h2>${esc(title)}</h2>
        <p class="muted">${body}</p>
        <div class="row" style="justify-content:flex-end">
          ${btn('cancel', other ? tt('ביטול הכניסה', 'Cancel sign-in') : tt('ביטול', 'Cancel'), 'ghost')}
          ${other ? btn('clear', tt('הסרה והמשך', 'Remove and continue'), 'danger') : `${btn('clear', tt('הסרה מהמכשיר', 'Remove from device'), 'ghost danger')}${btn('move', tt('העברה לחשבון', 'Move into account'), 'enter')}`}
        </div>
      </div>`, { label: title, onClose: (v) => resolve(['move', 'clear'].includes(v) ? v : 'cancel') });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close(b.value)));
  });
}

// Removes the learner data and every sync cursor, so the next account pulls its data from the start.
async function clearDeviceData() {
  await store.wipe();
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('lucid-sync-cursor')) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

// Makes sure the account has a server profile. Returns it, or null when there is no profile anywhere
// yet (onboarding will make one). Throws when the server refuses or cannot be reached.
async function ensureServerProfile() {
  const p = profile();
  const server = await db.profile();
  if (server) {
    if (!p?.onboarded) saveProfile({ onboarded: true, name: server.display_name, birth_year: server.birth_year, ui_language: server.ui_language, goals: server.goals });
    return server;
  }
  if (!p?.onboarded) return null;
  const s = settings();
  const saved = await db.saveProfile({ display_name: p.name || null, birth_year: p.birth_year, ui_language: p.ui_language || 'he', goals: p.goals || [], consent_terms_at: p.consent_terms_at || new Date().toISOString(), consent_ai_at: s.ai_consent ? s.ai_consent_at || new Date().toISOString() : null });
  return saved || { id: auth.user?.id };
}

async function checkProfile(sync) {
  try {
    const server = await ensureServerProfile();
    ready = Boolean(server);
    if (ready) sync?.run().catch(() => {});
    return { ok: true, synced: ready, reason: ready ? null : 'no_profile' };
  } catch (error) {
    ready = false;
    return { ok: true, synced: false, reason: error.network ? 'offline' : 'profile', error };
  }
}

// After a sign-in. kind: 'signin' | 'signup' | 'recovery' | 'resume'.
// Resolves to { ok, synced, reason }: ok false only when there is no usable session or the learner cancelled
// (then they are signed out again and the device data is unchanged).
export function connectAccount({ kind = 'signin', sync = activeSync } = {}) {
  ready = false;
  const run = connect(kind, sync);
  checking = run; // a profile re-check waits for this instead of racing it
  run.catch(() => {}).finally(() => { if (checking === run) checking = null; });
  return run;
}

async function connect(kind, sync) {
  let user;
  try { user = auth.user?.id ? auth.user : await auth.fetchUser(); } catch (error) { return { ok: false, reason: error.network ? 'offline' : 'session', error }; }
  // Without an owner, session-time events alone (logged even on the welcome screen) are not worth a question.
  const owner = store.owner();
  const decision = ownership({ owner, userId: user.id, hasData: store.hasData(owner ? {} : { except: ['events'] }), kind });
  if (decision !== 'proceed') {
    const choice = await askAboutDeviceData(decision, user.email);
    if (choice === 'cancel') { await auth.signOut(); return { ok: false, reason: 'cancelled' }; }
    if (choice === 'clear') await clearDeviceData();
  }
  store.setOwner(user.id);
  return checkProfile(sync);
}

// Retries the profile check (no questions: only when the device data is already this account's).
function recheck() {
  if (ready || checking || !auth.signedIn || !auth.user?.id || store.owner() !== auth.user.id) return;
  checking = checkProfile(activeSync).finally(() => { checking = null; });
}

// Sign out; with erase, push what is pending first (when possible), then remove Lucid's data from the device.
export async function signOut({ erase = false } = {}) {
  if (erase && syncAllowed()) { try { await activeSync?.run(); } catch { /* offline: the caller warned */ } }
  ready = false;
  await auth.signOut();
  if (erase) await eraseDevice();
}

const LINK_TOASTS = {
  signup: () => tt('האימייל אומת ונכנסת לחשבון.', 'Your email is confirmed and you are signed in.'),
  recovery: () => tt('אפשר לבחור עכשיו סיסמה חדשה.', 'You can choose a new password now.'),
};

// Boot: handle an email link (awaited, it may ask a question), then check a returning session in the background.
export async function startSession(sync) {
  if (!configured()) return;
  activeSync = sync;
  const link = await auth.consumeRedirect();
  if (link?.adopted) {
    const r = await connectAccount({ kind: link.kind, sync });
    if (!r.ok) history.replaceState(null, '', `${location.pathname}${location.search}#/account?mode=signin&notice=${r.reason === 'cancelled' ? 'cancelled' : 'link'}`);
    else { toast(LINK_TOASTS[link.kind]?.() || ''); if (r.reason === 'profile' || r.reason === 'offline') toast(syncPausedText(r.reason)); }
  } else if (auth.signedIn) {
    connectAccount({ kind: 'resume', sync }).then((r) => {
      if (!r.ok && r.reason === 'cancelled') { toast(tt('יצאת מהחשבון. המידע במכשיר לא השתנה.', 'Signed out. The data on this device was not changed.')); location.hash = '#/account?mode=signin'; }
    });
  }
  addEventListener('online', recheck);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recheck(); });
  // Onboarding after signing in creates the local profile; create the server one right after it.
  store.on('change', (e) => { if (e.colls?.includes('profile') && profile()?.onboarded) recheck(); });
}

export const syncPausedText = (reason = 'profile') => (reason === 'offline'
  ? tt('נכנסת לחשבון. אין כרגע חיבור לשרת, והסנכרון יתחיל כשהחיבור יחזור.', 'You are signed in. There is no connection to the server right now; sync will start when you are back online.')
  : tt('נכנסת לחשבון, אבל הסנכרון מושהה: השרת לא שמר את הפרופיל. ננסה שוב אוטומטית.', 'You are signed in, but sync is paused: the server did not save your profile. Lucid will try again automatically.'));
