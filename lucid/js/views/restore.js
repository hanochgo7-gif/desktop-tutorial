// Restore a backup (#/import), with or without a profile on this device (FR-06): Welcome ("יש לי גיבוי"), the
// device-only Account screen and the move from the old address (#/import?move=<nonce>, js/core/move.js) lead here.
// The backup is checked and summarised first; nothing is written until the learner confirms. Then Today.
import { html, render, on, $ } from '../core/util.js';
import { tt, setUiLang, uiLang } from '../core/i18n.js';
import { icon, brandMark, toast } from '../ui/components.js';
import { store } from '../core/store.js';
import { hasProfile } from '../core/learner.js';
import { checkBackup, restoreBackup, describeBackup, backupProblem } from '../core/backup.js';
import { receiveMove, MSG } from '../core/move.js';
import { OLD_HOME } from '../core/home.js';

export default async function restoreView(el, ctx) {
  ctx.setTitle(tt('שחזור מגיבוי', 'Restore a backup'));
  // Before a profile exists, the language chosen on Welcome in this session (as Welcome and onboarding do).
  try { const l = sessionStorage.getItem('lucid-ui-lang'); if (l && !hasProfile()) setUiLang(l); } catch { /* storage blocked */ }
  const moving = Boolean(ctx.query.move);
  // phase: 'waiting' (for the old address), 'choose' (a file), 'check' (summary, confirm), 'busy'.
  let phase = moving ? 'waiting' : 'choose';
  let pending = null; // {backup, summary, from: 'file' | 'move'}
  let problem = '';
  let note = '';
  let reply = null;
  let closed = false;

  const back = hasProfile() ? '#/settings' : '#/welcome';
  function draw() {
    render(el, html`<div class="onboard stack-lg restore">
      <p><span class="brand">${brandMark()}<span>Lucid</span></span></p>
      <h1 tabindex="-1" id="restore-h">${moving ? tt('העברת ההתקדמות לכתובת החדשה', 'Moving your progress to the new address') : tt('שחזור מגיבוי', 'Restore a backup')}</h1>
      ${phase === 'waiting' ? html`<p class="row muted" role="status"><span class="spinner" aria-hidden="true"></span>${tt('מקבלים את ההתקדמות מהכתובת הקודמת…', 'Receiving your progress from the old address…')}</p>` : ''}
      ${note ? html`<p class="banner" role="status" data-restore-note>${icon('info', { size: 18 })}<span>${note}</span></p>` : ''}
      ${phase === 'choose' ? html`
        <p class="muted">${tt('בחרו את קובץ הגיבוי (JSON) שהורדתם ב-Lucid, בהגדרות, ב״הורדת כל המידע״. לפני שמשהו נשמר תראו מה יש בו.', 'Choose the backup file (JSON) you downloaded from Lucid, in Settings, with "Download all my data". You will see what it holds before anything is saved.')}</p>
        <div class="row">
          <label class="key enter" style="cursor:pointer">${icon('refresh', { size: 18 })} ${tt('בחירת קובץ גיבוי', 'Choose a backup file')}<input type="file" accept="application/json,.json" class="sr-only" data-restore-file aria-describedby="restore-err"></label>
          <a class="key ghost" href="${back}">${hasProfile() ? tt('להגדרות', 'To Settings') : tt('לדף הפתיחה', 'To the welcome page')}</a>
        </div>
        <p class="error-text" id="restore-err" role="alert" data-restore-err>${problem}</p>` : ''}
      ${phase === 'check' || phase === 'busy' ? html`
        <section class="panel stack" aria-labelledby="restore-sum-h" data-restore-summary>
          <h2 id="restore-sum-h" class="h3">${tt('מה יש בגיבוי', 'What the backup holds')}</h2>
          <ul class="stack-sm">${describeBackup(pending.summary).map((line) => html`<li>${line}</li>`)}</ul>
          ${store.hasData() ? html`<p class="small" data-restore-replace>${icon('info', { size: 16 })} ${tt('המידע שכבר נמצא במכשיר הזה יוחלף במידע מהגיבוי.', 'The data already on this device will be replaced by the backup.')}</p>` : ''}
        </section>
        <div class="row">
          <button type="button" class="key enter" data-restore-go ${phase === 'busy' ? html`disabled` : ''}>${tt('שחזור', 'Restore')}</button>
          <button type="button" class="key ghost" data-restore-cancel ${phase === 'busy' ? html`disabled` : ''}>${tt('ביטול', 'Cancel')}</button>
        </div>` : ''}
    </div>`);
  }
  const focusHeading = () => $('#restore-h', el)?.focus({ preventScroll: true });
  const toCheck = (backup, from) => {
    const r = checkBackup(backup);
    if (!r.ok) return r.reason;
    pending = { backup, summary: r.summary, from };
    phase = 'check'; problem = '';
    draw();
    $('[data-restore-go]', el)?.focus();
    return '';
  };

  draw();

  if (moving) {
    receiveMove({ nonce: ctx.query.move, oldHome: OLD_HOME }).then(({ backup, reply: r }) => {
      if (closed) return;
      reply = r;
      const reason = toCheck(backup, 'move');
      if (reason) { reply(MSG.cancelled); reply = null; phase = 'choose'; note = backupProblem(reason); draw(); focusHeading(); }
    }).catch(() => {
      if (closed) return;
      phase = 'choose';
      note = tt('ההתקדמות לא הגיעה מהכתובת הקודמת. אפשר להוריד שם גיבוי (בהגדרות, ״הורדת כל המידע״) ולבחור אותו כאן.', 'Your progress did not arrive from the old address. You can download a backup there (Settings, "Download all my data") and choose it here.');
      draw();
      focusHeading();
    });
  }

  const offs = [
    on(el, 'change', '[data-restore-file]', async (e, input) => {
      const f = input.files?.[0];
      if (!f) return;
      let text = '';
      try { text = await f.text(); } catch { text = ''; }
      const reason = toCheck(text, 'file');
      if (reason) {
        problem = backupProblem(reason);
        const m = $('[data-restore-err]', el); if (m) m.textContent = problem;
        input.value = '';
      }
    }),
    on(el, 'click', '[data-restore-cancel]', () => {
      if (reply) { reply(MSG.cancelled); reply = null; }
      pending = null; phase = 'choose'; note = moving ? tt('ההעברה בוטלה. שום דבר לא נשמר במכשיר הזה.', 'The move was cancelled. Nothing was saved on this device.') : '';
      draw();
      focusHeading();
    }),
    on(el, 'click', '[data-restore-go]', async () => {
      if (!pending || phase === 'busy') return;
      phase = 'busy'; draw();
      try {
        await restoreBackup(store, pending.backup);
      } catch {
        phase = 'choose'; problem = backupProblem('shape'); pending = null; draw();
        if (reply) { reply(MSG.cancelled); reply = null; }
        return;
      }
      if (reply) { reply(MSG.done); reply = null; }
      toast(tt('השחזור הושלם', 'Restored'));
      ctx.navigate('today');
    }),
  ];
  return () => { closed = true; offs.forEach((o) => o()); if (reply) reply(MSG.cancelled); };
}
