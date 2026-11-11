// Moving a learner's progress from the old address to Lucid's own (IS-02, docs/setup.md "Launch switch").
// Browsers keep each origin's data apart, so the old copy hands its backup to the new one with postMessage:
// 1. The old copy (OLD_HOME) opens NEW_HOME#/import?move=<nonce> and keeps the window it opened.
// 2. The new copy checks that it has an opener and sends {type: 'lucid-move-ready', nonce} to it, addressed to the
//    exact old origin only (targetOrigin), so a page at any other origin that opened it never hears from it.
// 3. The old copy answers only a message whose origin is the exact new origin, whose source is the window it opened
//    and whose nonce is its own: it sends {type: 'lucid-move-data', nonce, backup}, addressed to the new origin only.
// 4. The new copy takes only a message whose origin is the exact old origin, whose source is its opener and whose
//    nonce matches. It writes nothing until the learner has seen what the backup holds and confirmed
//    (js/views/restore.js); the old origin is shared with other sites, so that confirmation is the last check.
// 5. It replies 'lucid-move-done' or 'lucid-move-cancelled'. The old copy keeps its own data either way.
// If anything fails (a blocked pop-up, no answer), the learner downloads a backup and restores it at the new address.
import { originOf } from './home.js';

export const MSG = { ready: 'lucid-move-ready', data: 'lucid-move-data', done: 'lucid-move-done', cancelled: 'lucid-move-cancelled' };
export const NONCE = /^[0-9a-f]{32}$/;

export function newNonce(crypto = globalThis.crypto) {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// The address the old copy opens.
export function moveUrl(newHome, nonce) {
  const u = new URL(newHome);
  u.hash = `#/import?move=${nonce}`;
  return u.href;
}

const isMsg = (data, type, nonce) => Boolean(data) && typeof data === 'object' && data.type === type && data.nonce === nonce;

// Old side. getBackup() is called only once the new copy has answered. Resolves with 'done', 'cancelled' or
// 'closed' (the window was closed); rejects with Error('blocked') when the window did not open and Error('timeout')
// when the new copy did not answer in time.
export function startMove({ win = globalThis.window, newHome, getBackup, nonce = newNonce(), timeoutMs = 30_000, pollMs = 1000 }) {
  const target = originOf(newHome);
  if (!target) return Promise.reject(new Error('no new home'));
  let popup = null;
  try { popup = win.open(moveUrl(newHome, nonce), '_blank'); } catch { popup = null; }
  if (!popup) return Promise.reject(new Error('blocked'));
  return new Promise((resolve, reject) => {
    let sent = false;
    const finish = (fn, v) => { win.removeEventListener('message', onMessage); clearTimeout(timer); clearInterval(poll); fn(v); };
    const onMessage = (e) => {
      if (e.origin !== target || e.source !== popup) return;
      if (isMsg(e.data, MSG.ready, nonce) && !sent) {
        sent = true;
        clearTimeout(timer);
        Promise.resolve(getBackup()).then((backup) => popup.postMessage({ type: MSG.data, nonce, backup }, target)).catch((err) => finish(reject, err));
      } else if (isMsg(e.data, MSG.done, nonce)) finish(resolve, 'done');
      else if (isMsg(e.data, MSG.cancelled, nonce)) finish(resolve, 'cancelled');
    };
    win.addEventListener('message', onMessage);
    const timer = setTimeout(() => finish(reject, new Error('timeout')), timeoutMs);
    const poll = setInterval(() => { if (popup.closed) finish(sent ? resolve : reject, sent ? 'closed' : new Error('timeout')); }, pollMs);
  });
}

// New side. Resolves with {backup, reply(type)} once the old copy has sent its backup; rejects with
// Error('no-opener'), Error('nonce'), Error('no old home') or Error('timeout'). Nothing is written here.
export function receiveMove({ win = globalThis.window, nonce, oldHome, timeoutMs = 20_000 }) {
  const from = originOf(oldHome);
  const opener = win.opener;
  if (!from) return Promise.reject(new Error('no old home'));
  if (!NONCE.test(String(nonce || ''))) return Promise.reject(new Error('nonce'));
  if (!opener) return Promise.reject(new Error('no-opener'));
  const reply = (type) => { try { opener.postMessage({ type, nonce }, from); } catch { /* the old window is gone */ } };
  return new Promise((resolve, reject) => {
    const finish = (fn, v) => { win.removeEventListener('message', onMessage); clearTimeout(timer); fn(v); };
    const onMessage = (e) => {
      if (e.origin !== from || e.source !== opener || !isMsg(e.data, MSG.data, nonce)) return;
      finish(resolve, { backup: e.data.backup, reply });
    };
    win.addEventListener('message', onMessage);
    const timer = setTimeout(() => finish(reject, new Error('timeout')), timeoutMs);
    reply(MSG.ready);
  });
}
