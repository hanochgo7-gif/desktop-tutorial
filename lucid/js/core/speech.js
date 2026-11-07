// Speech through the browser: synthesis (listening items, model pronunciation) and, where the
// browser provides it, recognition (speaking practice). Voices are synthetic and vary by device;
// recognition quality on Hebrew-accented English is not validated, so it never produces a grade on
// its own (research C2, D34 and D37): learners see what was recognised and decide.
// Recognition is the browser's own service (in Chrome, for example, the audio goes to the browser
// maker's servers). Lucid never touches the audio: it gets only the recognised text. Before the first
// use on a browser, the learner sees a one-time notice that says so and can keep the microphone off.
import { settings } from './learner.js';
import { html } from './util.js';
import { tt } from './i18n.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export const canSpeak = () => Boolean(synth);
export const canListen = () => Boolean(Recognition);

let voicesReady = null;
function voices() {
  if (!synth) return Promise.resolve([]);
  voicesReady ||= new Promise((resolve) => {
    const list = synth.getVoices();
    if (list.length) return resolve(list);
    synth.addEventListener('voiceschanged', () => resolve(synth.getVoices()), { once: true });
    setTimeout(() => resolve(synth.getVoices()), 1200);
  });
  return voicesReady;
}

function langFor(variant) { return variant === 'UK' ? 'en-GB' : 'en-US'; }

async function pickVoice(lang) {
  const list = await voices();
  const exact = list.filter((v) => v.lang?.replace('_', '-') === lang);
  // Prefer higher-quality local voices when the platform labels them.
  return exact.find((v) => /natural|enhanced|premium|google/i.test(v.name)) || exact[0] || list.find((v) => v.lang?.startsWith('en')) || null;
}

// Whether the browser has an English voice at all (without one, speech is silent).
export async function hasEnglishVoice() {
  return (await voices()).some((v) => /^en\b|^en[-_]/i.test(v.lang || ''));
}

// Every utterance reports what happened on the document, as a 'lucid:speech' event with detail { state, id,
// text }: 'start' when sound starts, then 'end' (finished, or cut off by the next one) or 'error' (failed while
// playing); 'silent' when nothing played: no start within 1.5 s, or it ended or failed before starting. The shell
// shows the playing button and explains a silent device (SC-6); other screens can wait for 'start'.
export const SPEECH_EVENT = 'lucid:speech';
export const SILENT_AFTER_MS = 1500;
let utteranceSeq = 0;
function emit(state, id, text) {
  try { document.dispatchEvent(new CustomEvent(SPEECH_EVENT, { detail: { state, id, text } })); } catch { /* no DOM */ }
}

// Speak English text. Resolves true when it finished, false when nothing (or not all of it) played.
export async function say(text, { slow = false, variant } = {}) {
  if (!text) return false;
  const id = ++utteranceSeq;
  if (!synth) { emit('silent', id, text); return false; }
  synth.cancel();
  const s = settings();
  const lang = langFor(variant || s.english_variant);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const v = await pickVoice(lang);
  if (v) u.voice = v;
  u.rate = (slow ? 0.7 : 1) * (s.speech_rate || 0.95);
  return new Promise((resolve) => {
    let started = false;
    let silent = false;
    let done = false;
    const finish = (state, ok) => { if (done) return; done = true; clearTimeout(quiet); clearTimeout(giveUp); if (state) emit(state, id, text); resolve(ok); };
    // 'silent' is said once; a slow (online) voice that starts after it still reports 'start' and 'end'. With no
    // start at all the promise settles after 8 s, so a caller waiting for it never hangs.
    const quiet = setTimeout(() => { if (!started && !done) { silent = true; emit('silent', id, text); } }, SILENT_AFTER_MS);
    const giveUp = setTimeout(() => { if (!started) finish(null, false); }, 8000);
    u.onstart = () => { if (done) return; started = true; clearTimeout(quiet); clearTimeout(giveUp); emit('start', id, text); };
    u.onend = () => finish(started ? 'end' : silent ? null : 'silent', started);
    // Cut off by the next utterance (or a stop) is an ordinary end, not a failure.
    u.onerror = (e) => {
      const cut = /interrupted|canceled/.test(e?.error || '');
      finish(started ? (cut ? 'end' : 'error') : silent ? null : cut ? 'end' : 'silent', false);
    };
    synth.speak(u);
  });
}
export const stopSpeaking = () => synth?.cancel();

// ---------- the microphone notice ----------
// Shown once per browser (the speech service belongs to the browser, so a new browser shows it again).
// Remembered in localStorage under a "lucid-" key, which the device erase removes; when storage is
// blocked it is remembered for this page load only.
export const MIC_NOTICE_KEY = 'lucid-mic-notice';
let noticeSeen = false;
let noticeOpen = null;
export function micNoticeSeen() {
  if (noticeSeen) return true;
  try { noticeSeen = globalThis.localStorage?.getItem(MIC_NOTICE_KEY) === '1'; } catch { /* storage blocked */ }
  return noticeSeen;
}
function rememberNotice() {
  noticeSeen = true;
  try { globalThis.localStorage?.setItem(MIC_NOTICE_KEY, '1'); } catch { /* storage blocked */ }
}

export function micNoticeHtml() {
  return html`<div class="stack mic-notice">
    <h2>${tt('לפני שמשתמשים במיקרופון', 'Before you use the microphone')}</h2>
    <p>${tt('זיהוי הדיבור נעשה על ידי הדפדפן, לא על ידי Lucid. בחלק מהדפדפנים, למשל Chrome, הקול נשלח לשירות זיהוי הדיבור של יצרן הדפדפן כדי להפוך אותו לטקסט.', 'Speech recognition is done by your browser, not by Lucid. In some browsers, such as Chrome, your voice is sent to the browser maker\'s speech service to turn it into text.')}</p>
    <p>${tt('Lucid מקבל רק את הטקסט שזוהה ומשתמש בו כמו בטקסט שהקלדתם. הוא לא מקליט ולא שומר את הקול שלכם.', 'Lucid gets only the recognised text and uses it like text you typed. It never records or keeps your voice.')}</p>
    <p class="small muted">${tt('לא חייבים מיקרופון: בתרגילי הדיבור שבשיעורים אפשר לומר בקול ולסמן בעצמכם איך הלך.', 'You don\'t need the microphone: in lesson speaking exercises you can say it aloud and mark how it went yourself.')} <a href="privacy.html" target="_blank" rel="noopener">${tt('מדיניות הפרטיות', 'Privacy policy')}</a></p>
    <div class="row" style="justify-content:flex-end">
      <button type="button" class="key ghost" value="no" data-close>${tt('לא עכשיו', 'Not now')}</button>
      <button type="button" class="key enter" value="yes" data-close>${tt('להשתמש במיקרופון', 'Use the microphone')}</button>
    </div></div>`;
}

// Resolves true when the learner has seen the notice (now or before) and chose to go on; false when they
// chose "Not now" or closed it. Without recognition there is nothing to explain, so it resolves true.
export function micNotice() {
  if (!Recognition || micNoticeSeen()) return Promise.resolve(true);
  noticeOpen ||= import('../ui/components.js').then(({ openDialog }) => new Promise((resolve) => {
    const d = openDialog(String(micNoticeHtml()), { label: tt('לפני שמשתמשים במיקרופון', 'Before you use the microphone'), onClose: (v) => { if (v === 'yes') rememberNotice(); resolve(v === 'yes'); } });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close(b.value)));
    // The notice opens at its top, with focus on its heading, also when large text makes it scroll (SC-6).
    const h = d.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    d.scrollTop = 0;
  })).finally(() => { noticeOpen = null; });
  return noticeOpen;
}

// ---------- recognition ----------
const fail = (message, code) => Object.assign(new Error(message), { code });

// Listen once, after the microphone notice. Resolves with { transcript, alternatives } or rejects with an
// Error whose code is 'unsupported' | 'declined' | 'denied' | 'no-speech' | 'aborted' | 'network'.
export async function listen(opts = {}) {
  if (!Recognition) throw fail('Speech recognition is not available in this browser.', 'unsupported');
  if (!(await micNotice())) throw fail('The learner kept the microphone off.', 'declined');
  return listenOnce(opts);
}

function listenOnce({ variant, maxMs = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const r = new Recognition();
    r.lang = langFor(variant || settings().english_variant);
    r.interimResults = false;
    r.maxAlternatives = 3;
    let done = false;
    const finish = (fn) => { if (!done) { done = true; clearTimeout(t); fn(); } };
    const t = setTimeout(() => { try { r.stop(); } catch { /* ignore */ } }, maxMs);
    r.onresult = (e) => {
      const res = e.results[0];
      const alternatives = [...res].map((a) => a.transcript);
      finish(() => resolve({ transcript: alternatives[0] || '', alternatives }));
    };
    r.onerror = (e) => {
      const code = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'no-speech' : e.error === 'network' ? 'network' : 'aborted';
      finish(() => reject(fail(e.error, code)));
    };
    r.onend = () => finish(() => reject(fail('no-speech', 'no-speech')));
    try { r.start(); } catch (e) { finish(() => reject(Object.assign(e, { code: 'aborted' }))); }
    listen.stop = () => { try { r.stop(); } catch { /* ignore */ } };
  });
}

// What to tell the learner when listening did not work.
export function speechErrorText(err) {
  switch (err?.code) {
    case 'declined': return tt('בסדר, המיקרופון נשאר כבוי.', 'OK, the microphone stays off.');
    case 'denied': return tt('אין הרשאה למיקרופון. אפשר לאשר אותה בהגדרות הדפדפן.', 'Microphone access was blocked. You can allow it in your browser settings.');
    case 'no-speech': return tt('לא נשמע דיבור. נסו שוב, קרוב יותר למיקרופון.', 'No speech was heard. Try again, a little closer to the microphone.');
    case 'network': return tt('זיהוי הדיבור צריך חיבור לאינטרנט בדפדפן הזה. בדקו את החיבור ונסו שוב.', 'Speech recognition needs an internet connection in this browser. Check your connection and try again.');
    case 'unsupported': return tt('זיהוי דיבור לא זמין בדפדפן הזה.', 'Speech recognition is not available in this browser.');
    default: return tt('זיהוי הדיבור לא הצליח הפעם. נסו שוב.', 'Speech recognition did not work this time. Please try again.');
  }
}
