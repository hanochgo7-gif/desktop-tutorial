// Short tones for right and wrong answers in the games (Web Audio, no files), when sound is on in Settings
// ("Sounds in the games"). One audio context for the whole app.
import { settings } from '../core/learner.js';

export const soundOn = () => { const s = settings().sound; return !(s === false || s === 'off'); };
let ctx = null;
export function playTone(ok) {
  if (!soundOn()) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume(); // iOS suspends it when the app goes to the background
    (ok ? [660, 880] : [220]).forEach((f, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      const t0 = ctx.currentTime + k * 0.09;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.2);
    });
  } catch { /* no audio: colours, icons and text still say right or wrong */ }
}
