// The one-click move from the old address (IS-02, js/core/move.js), with two fake windows: postMessage only to the
// exact origin on each side, only from the window opened / the opener, only with the nonce; nothing else is answered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startMove, receiveMove, moveUrl, newNonce, NONCE, MSG } from '../../js/core/move.js';

const OLD = 'https://old.github.io';
const OLD_HOME = `${OLD}/desktop-tutorial/lucid/`;
const NEW = 'https://lucid.example.org';
const NEW_HOME = `${NEW}/`;

// A window at `origin`: listeners, and postMessage that delivers to it only when targetOrigin matches.
function fakeWindow(origin) {
  const listeners = new Set();
  const w = {
    origin, closed: false, opener: null, sent: [], // sent: what the other side posted towards this window
    addEventListener: (t, fn) => { if (t === 'message') listeners.add(fn); },
    removeEventListener: (t, fn) => { if (t === 'message') listeners.delete(fn); },
    listeners: () => listeners.size,
    // Delivery as a browser does it: the event's origin is the sender's, its source the sender's window proxy.
    deliver(data, from) { for (const fn of [...listeners]) fn({ data, origin: from.origin, source: from }); },
  };
  return w;
}
// The old page and the new page it opens, wired as the browser would wire them.
function pair({ blocked = false } = {}) {
  const oldWin = fakeWindow(OLD);
  const newWin = fakeWindow(NEW);
  // Each side holds a proxy of the other: the new page's opener, the old page's popup. A message is delivered only
  // when its targetOrigin is the receiver's origin, with the sender's proxy as its source.
  const popup = { origin: NEW, get closed() { return newWin.closed; } };
  newWin.opener = { origin: OLD };
  newWin.opener.postMessage = (data, targetOrigin) => { if (targetOrigin === OLD) queueMicrotask(() => oldWin.deliver(data, popup)); };
  popup.postMessage = (data, targetOrigin) => { newWin.sent.push({ data, targetOrigin }); if (targetOrigin === NEW) queueMicrotask(() => newWin.deliver(data, newWin.opener)); };
  oldWin.open = (url) => { oldWin.opened = url; return blocked ? null : popup; };
  return { oldWin, newWin, popup };
}
const backup = { app: 'lucid', version: 1, device: { profile: [{ id: 'me', onboarded: true, name: 'Dana' }] } };

test('nonces are 128-bit hex and the move address carries one in the hash only', () => {
  const n = newNonce();
  assert.match(n, NONCE);
  assert.notEqual(n, newNonce());
  assert.equal(moveUrl(NEW_HOME, n), `${NEW}/#/import?move=${n}`);
});

test('a full move: ready -> backup -> the learner confirms -> done; each message to the exact origin only', async () => {
  const { oldWin, newWin } = pair();
  const nonce = newNonce();
  let asked = 0;
  const moving = startMove({ win: oldWin, newHome: NEW_HOME, nonce, getBackup: () => { asked++; return backup; }, pollMs: 5 });
  assert.equal(oldWin.opened, `${NEW}/#/import?move=${nonce}`);
  assert.equal(asked, 0, 'nothing is read before the new address answers');
  const got = await receiveMove({ win: newWin, nonce, oldHome: OLD_HOME });
  assert.deepEqual(got.backup, backup);
  assert.equal(asked, 1);
  assert.deepEqual(newWin.sent.map((m) => m.targetOrigin), [NEW], 'the backup went to the new origin only');
  got.reply(MSG.done);
  assert.equal(await moving, 'done');
  assert.equal(oldWin.listeners(), 0, 'listeners are removed');
  assert.equal(newWin.listeners(), 0);
});

test('the new side ignores a backup from another origin, from a window that is not its opener, or with another nonce', async () => {
  const { newWin } = pair();
  const nonce = newNonce();
  const waiting = receiveMove({ win: newWin, nonce, oldHome: OLD_HOME, timeoutMs: 50 });
  const forged = { type: MSG.data, nonce, backup: { app: 'lucid', evil: true } };
  newWin.deliver(forged, { origin: 'https://evil.example' });                // wrong origin
  newWin.deliver(forged, { origin: OLD });                                   // right origin, not the opener
  newWin.deliver({ ...forged, nonce: newNonce() }, newWin.opener);           // the opener, wrong nonce
  newWin.deliver({ type: MSG.ready, nonce, backup: {} }, newWin.opener);     // wrong type
  await assert.rejects(waiting, /timeout/);
});

test('the old side answers only the window it opened, at the new origin, with its nonce', async () => {
  const { oldWin, popup } = pair();
  const nonce = newNonce();
  let asked = 0;
  const moving = startMove({ win: oldWin, newHome: NEW_HOME, nonce, getBackup: () => { asked++; return backup; }, timeoutMs: 60, pollMs: 5 });
  oldWin.deliver({ type: MSG.ready, nonce }, { origin: 'https://evil.example' });
  oldWin.deliver({ type: MSG.ready, nonce }, { origin: NEW });               // same origin, another window
  oldWin.deliver({ type: MSG.ready, nonce: newNonce() }, popup);
  oldWin.deliver({ type: MSG.done, nonce: newNonce() }, popup);
  await assert.rejects(moving, /timeout/);
  assert.equal(asked, 0, 'no backup was read for anyone');
});

test('the new side writes nothing by itself and needs an opener, a valid nonce and the old address', async () => {
  const { newWin } = pair();
  await assert.rejects(receiveMove({ win: { ...newWin, opener: null }, nonce: newNonce(), oldHome: OLD_HOME }), /no-opener/);
  await assert.rejects(receiveMove({ win: newWin, nonce: 'abc', oldHome: OLD_HOME }), /nonce/);
  await assert.rejects(receiveMove({ win: newWin, nonce: newNonce(), oldHome: '' }), /no old home/);
});

test('a blocked window, a cancelled move and a closed window are reported, not hidden', async () => {
  await assert.rejects(startMove({ win: pair({ blocked: true }).oldWin, newHome: NEW_HOME, getBackup: () => backup }), /blocked/);
  await assert.rejects(startMove({ win: pair().oldWin, newHome: '', getBackup: () => backup }), /no new home/);
  {
    const { oldWin, newWin } = pair();
    const nonce = newNonce();
    const moving = startMove({ win: oldWin, newHome: NEW_HOME, nonce, getBackup: () => backup, pollMs: 5 });
    const got = await receiveMove({ win: newWin, nonce, oldHome: OLD_HOME });
    got.reply(MSG.cancelled);
    assert.equal(await moving, 'cancelled');
  }
  {
    const { oldWin, newWin } = pair();
    const nonce = newNonce();
    const moving = startMove({ win: oldWin, newHome: NEW_HOME, nonce, getBackup: () => backup, pollMs: 5 });
    await receiveMove({ win: newWin, nonce, oldHome: OLD_HOME });
    newWin.closed = true;
    assert.equal(await moving, 'closed');
  }
  {
    const { oldWin, newWin } = pair();
    const moving = startMove({ win: oldWin, newHome: NEW_HOME, getBackup: () => backup, pollMs: 5, timeoutMs: 1000 });
    newWin.closed = true; // closed before it answered
    await assert.rejects(moving, /timeout/);
  }
});
