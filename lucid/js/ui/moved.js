// "Lucid moved" (IS-02): on the old copy (OLD_HOME), once NEW_HOME is set (js/core/home.js), a calm banner above
// every screen names the new address and, for a learner with a profile, moves their progress there in one click
// (js/core/move.js) or downloads a backup to restore there. Nothing on this device is deleted.
import { html, render, on, download } from '../core/util.js';
import { tt, uiLang } from '../core/i18n.js';
import { icon } from './components.js';
import { store } from '../core/store.js';
import { hasProfile } from '../core/learner.js';
import { NEW_HOME } from '../core/home.js';
import { startMove } from '../core/move.js';
import { makeBackup, backupFileName } from '../core/backup.js';

let status = ''; // what happened to the last move, in the interface language's words
let busy = false;
let bound = false;

const MESSAGES = {
  moving: () => tt('פתחנו את Lucid בכתובת החדשה. אשרו שם את ההעברה.', 'Lucid is open at the new address. Confirm the move there.'),
  done: () => tt('ההתקדמות הועברה. מעכשיו המשיכו ללמוד בכתובת החדשה.', 'Your progress has moved. From now on, keep learning at the new address.'),
  cancelled: () => tt('ההעברה בוטלה. שום דבר לא השתנה.', 'The move was cancelled. Nothing has changed.'),
  failed: () => tt('ההעברה בלחיצה אחת לא הצליחה. הורידו גיבוי, פתחו את הכתובת החדשה ובחרו שם ״יש לי גיבוי״.', 'The one-click move did not work. Download a backup, open the new address and choose "I have a backup" there.'),
};

export function drawMoved(doc = document) {
  const main = doc.querySelector('.main');
  if (!main) return null;
  let box = doc.getElementById('moved');
  if (!box) {
    box = doc.createElement('aside');
    box.id = 'moved';
    box.className = 'banner moved';
    main.prepend(box);
  }
  box.hidden = false;
  box.setAttribute('aria-label', tt('Lucid עבר לכתובת חדשה', 'Lucid has moved'));
  box.lang = uiLang();
  box.dir = uiLang() === 'he' ? 'rtl' : 'ltr';
  const learner = hasProfile();
  render(box, html`${icon('info', { size: 18 })}<div class="grow stack-sm">
    <p><strong>${tt('Lucid עבר לכתובת חדשה:', 'Lucid has moved to a new address:')}</strong> <a href="${NEW_HOME}" dir="ltr" data-moved-link>${NEW_HOME.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></p>
    ${learner ? html`<p class="small">${tt('ההתקדמות שלכם שמורה בדפדפן הזה. כדי להמשיך איתה בכתובת החדשה, העבירו אותה לשם: היא עוברת ישירות מהדפדפן, ואתם מאשרים שם לפני שהיא נשמרת.', 'Your progress is saved in this browser. To keep it at the new address, move it there: it goes straight from this browser, and you confirm there before it is saved.')}</p>
    <div class="row"><button type="button" class="key small enter" data-move ${busy ? html`disabled` : ''}>${tt('להעביר את ההתקדמות שלי', 'Move my progress')}</button><button type="button" class="key small ghost" data-move-backup>${icon('download', { size: 16 })} ${tt('הורדת גיבוי', 'Download a backup')}</button></div>`
    : html`<p class="small">${tt('מעכשיו לומדים שם.', 'From now on, Lucid is there.')}</p>`}
    <p class="small" role="status" data-move-status>${status}</p>
  </div>`);
  if (!bound) {
    bound = true;
    on(box, 'click', '[data-move-backup]', () => download(backupFileName(), JSON.stringify(makeBackup(store), null, 1)));
    on(box, 'click', '[data-move]', async (e, b) => {
      if (busy) return;
      busy = true; b.disabled = true;
      setStatus(box, MESSAGES.moving());
      let outcome = 'failed';
      try {
        await store.flush();
        outcome = await startMove({ newHome: NEW_HOME, getBackup: () => makeBackup(store) });
        if (outcome === 'closed') outcome = 'cancelled';
      } catch { outcome = 'failed'; }
      busy = false;
      status = MESSAGES[outcome]();
      drawMoved(doc);
    });
  }
  return box;
}

function setStatus(box, text) {
  status = text;
  const s = box.querySelector('[data-move-status]');
  if (s) s.textContent = text;
}
