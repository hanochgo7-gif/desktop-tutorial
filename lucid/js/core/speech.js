// Speech through the browser: synthesis (listening items, model pronunciation) and, where the
// browser provides it, recognition (speaking practice). Voices are synthetic and vary by device;
// recognition quality on Hebrew-accented English is not validated, so it never produces a grade on
// its own (research C2, D34 and D37): learners see what was recognised and decide.
import { settings } from './learner.js';

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

// Speak English text. Resolves when finished (or immediately when speech is unavailable).
export async function say(text, { slow = false, variant } = {}) {
  if (!synth || !text) return false;
  synth.cancel();
  const s = settings();
  const lang = langFor(variant || s.english_variant);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const v = await pickVoice(lang);
  if (v) u.voice = v;
  u.rate = (slow ? 0.7 : 1) * (s.speech_rate || 0.95);
  return new Promise((resolve) => {
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
  });
}
export const stopSpeaking = () => synth?.cancel();

// Listen once. Resolves with { transcript, alternatives } or rejects with an Error whose code is
// 'unsupported' | 'denied' | 'no-speech' | 'aborted' | 'network'.
export function listen({ variant, maxMs = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(Object.assign(new Error('Speech recognition is not available in this browser.'), { code: 'unsupported' }));
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
      finish(() => reject(Object.assign(new Error(e.error), { code })));
    };
    r.onend = () => finish(() => reject(Object.assign(new Error('no-speech'), { code: 'no-speech' })));
    try { r.start(); } catch (e) { finish(() => reject(Object.assign(e, { code: 'aborted' }))); }
    listen.stop = () => { try { r.stop(); } catch { /* ignore */ } };
  });
}
