// Settings: pipeline stages, marketing sources, data export, account.

import { html, render, on, toCSV, download, fmt } from '../core/util.js';
import { store } from '../core/store.js';
import { auth } from '../core/api.js';
import { stages, contactName, sourceName, stageName } from '../core/model.js';
import { pageHeader, icon, setTitle, toast, promptDialog, confirmDialog } from '../ui/components.js';

export default async function view(el, ctx) {
  setTitle('הגדרות');
  const draw = () => {
    const sts = stages();
    const srcs = store.all('crm_sources').sort((a, b) => a.position - b.position);
    render(el, html`
      ${pageHeader({ title: 'הגדרות' })}
      <div class="grid grid-2">
        <section class="panel">
          <div class="panel-head"><h2>שלבי המכירה</h2></div>
          <p class="pad small muted">"ימים עד התראה": אחרי כמה ימים באותו שלב העסקה מסומנת כתקועה. ההסתברות משמשת לחישוב הצפי המשוקלל.</p>
          <table class="table compact"><thead><tr><th>שלב</th><th>הסתברות</th><th>ימים עד התראה</th></tr></thead><tbody>
            ${sts.map((s) => html`<tr>
              <td><input class="input sm" value="${s.name}" data-stage="${s.id}" data-k="name" aria-label="שם השלב"></td>
              <td>${s.kind === 'open' ? html`<input class="input sm num" type="number" min="0" max="99" value="${s.probability}" data-stage="${s.id}" data-k="probability" aria-label="הסתברות" style="width:80px">` : html`<span class="muted">${s.probability}%</span>`}</td>
              <td>${s.kind === 'open' ? html`<input class="input sm num" type="number" min="1" max="365" value="${s.rot_days ?? ''}" data-stage="${s.id}" data-k="rot_days" aria-label="ימים עד התראה" style="width:80px">` : ''}</td>
            </tr>`)}
          </tbody></table>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>מקורות הגעה</h2><button class="btn btn-sm btn-ghost" data-act="add-source">${icon('plus')}מקור</button></div>
          <p class="pad small muted">"ממומן" = יש עליו הוצאות פרסום, ולכן מחושבים לו CAC ו-ROAS.</p>
          <table class="table compact"><thead><tr><th>מקור</th><th>ממומן</th><th>פעיל</th></tr></thead><tbody>
            ${srcs.map((s) => html`<tr>
              <td><input class="input sm" value="${s.name}" data-src="${s.id}" data-k="name" aria-label="שם המקור"></td>
              <td><input type="checkbox" class="cbx" ${s.is_paid ? 'checked' : ''} data-src="${s.id}" data-k="is_paid" aria-label="ממומן"></td>
              <td><input type="checkbox" class="cbx" ${s.active !== false ? 'checked' : ''} data-src="${s.id}" data-k="active" aria-label="פעיל"></td>
            </tr>`)}
          </tbody></table>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>הנתונים שלי</h2></div>
          <div class="panel-body stack">
            <p class="small">${store.mode === 'remote' ? 'הנתונים נשמרים בשרת (Supabase, פרנקפורט) ומוגנים בהרשאות. מומלץ להוריד גיבוי מלא פעם בשבוע.' : html`<b class="warn-text">מצב ניסיון:</b> הנתונים נשמרים רק בדפדפן הזה. לא לשימוש עם לקוחות אמיתיים.`}</p>
            <div class="row-wrap">
              <button class="btn" data-act="backup">${icon('download')}גיבוי מלא (JSON)</button>
              <button class="btn" data-act="csv-deals">${icon('download')}עסקאות לאקסל</button>
              <button class="btn" data-act="csv-activities">${icon('download')}היסטוריית פעילות לאקסל</button>
            </div>
            <p class="small muted">${fmt.number(store.all('crm_contacts').length)} לידים, ${fmt.number(store.all('crm_deals').length)} עסקאות, ${fmt.number(store.all('crm_activities').length)} פעילויות, ${fmt.number(store.all('crm_tasks').length)} משימות.</p>
            ${store.mode === 'local' ? html`<button class="btn btn-ghost danger-text" data-act="reset-local">${icon('trash')}מחיקת נתוני הניסיון</button>` : ''}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>חשבון</h2></div>
          <div class="panel-body stack">
            ${store.mode === 'remote' ? html`<p class="small">מחובר כ-<b dir="ltr">${auth.user?.email || ''}</b> | סביבת עבודה: ${store.workspace?.name}</p>
              <div class="row-wrap"><button class="btn" data-act="password">${icon('lock')}שינוי סיסמה</button><button class="btn btn-ghost" data-act="logout">${icon('logout')}יציאה</button></div>`
              : html`<div class="row-wrap"><button class="btn btn-primary" data-act="leave-local">${icon('logout')}יציאה ממצב ניסיון</button></div>`}
          </div>
        </section>
      </div>`);
  };
  draw();
  ctx.watch(['crm_stages', 'crm_sources'], draw);

  on(el, 'change', '[data-stage]', async (e, i) => {
    const k = i.dataset.k;
    let v = i.value.trim();
    if (k !== 'name') v = v === '' ? null : Number(v);
    if (k === 'name' && !v) { toast('לשלב חייב להיות שם', { kind: 'error' }); draw(); return; }
    if (k === 'probability' && (v < 0 || v > 99)) { toast('הסתברות בין 0 ל-99', { kind: 'error' }); draw(); return; }
    try { await store.update('crm_stages', i.dataset.stage, { [k]: v }); toast('נשמר', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); draw(); }
  });
  on(el, 'change', '[data-src]', async (e, i) => {
    const k = i.dataset.k;
    const v = i.type === 'checkbox' ? i.checked : i.value.trim();
    if (k === 'name' && !v) { toast('למקור חייב להיות שם', { kind: 'error' }); draw(); return; }
    try { await store.update('crm_sources', i.dataset.src, { [k]: v }); toast('נשמר', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); draw(); }
  });
  on(el, 'click', '[data-act]', async (e, b) => {
    const a = b.dataset.act;
    const day = new Date().toISOString().slice(0, 10);
    if (a === 'add-source') {
      const name = await promptDialog('שם המקור', { title: 'מקור חדש', placeholder: 'למשל: TikTok, כנס, אתר שותף' });
      if (!name) return;
      const key = `s_${Date.now().toString(36)}`;
      try { await store.insert('crm_sources', { name, key, channel: 'other', is_paid: false, position: store.all('crm_sources').length }); toast('המקור נוסף', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); }
    }
    if (a === 'backup') download(`hg-os-backup-${day}.json`, JSON.stringify(store.exportAll(), null, 1), 'application/json');
    if (a === 'csv-deals') {
      download(`deals-${day}.csv`, toCSV([
        ['עסקה', 'ליד', 'שלב', 'סטטוס', 'סכום צפוי', 'סכום סופי', 'נגבה', 'תאריך גבייה', 'עלות ישירה', 'מקור', 'סוג שירות', 'נפתחה', 'נסגרה', 'סיבת הפסד'],
        ...store.all('crm_deals').map((d) => [d.name, contactName(store.get('crm_contacts', d.contact_id)), stageName(d.stage_id), d.outcome, d.amount_expected, d.amount_final, d.amount_paid, d.paid_at, d.direct_cost_estimate, sourceName(d.source_id), d.service_type, d.opened_at?.slice(0, 10), d.closed_at?.slice(0, 10), d.lost_reason]),
      ]), 'text/csv;charset=utf-8');
    }
    if (a === 'csv-activities') {
      download(`activities-${day}.csv`, toCSV([
        ['תאריך', 'סוג', 'ליד', 'עסקה', 'תוצאה', 'תוכן'],
        ...store.all('crm_activities').sort((x, y) => (x.at < y.at ? 1 : -1)).map((x) => [x.at, x.type, contactName(store.get('crm_contacts', x.contact_id)), store.get('crm_deals', x.deal_id)?.name, x.outcome, x.body]),
      ]), 'text/csv;charset=utf-8');
    }
    if (a === 'password') {
      const p = await promptDialog('סיסמה חדשה (לפחות 8 תווים)', { title: 'שינוי סיסמה', okLabel: 'שינוי' });
      if (!p) return;
      if (p.length < 8) { toast('הסיסמה קצרה מדי', { kind: 'error' }); return; }
      try { await auth.updatePassword(p); toast('הסיסמה שונתה', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); }
    }
    if (a === 'logout') { await auth.signOut(); location.hash = ''; location.reload(); }
    if (a === 'leave-local') { localStorage.removeItem('hgos-mode'); location.hash = ''; location.reload(); }
    if (a === 'reset-local') {
      if (!(await confirmDialog('למחוק את כל נתוני הניסיון בדפדפן הזה?', { danger: true, okLabel: 'מחיקה' }))) return;
      store.resetLocal(); location.reload();
    }
  });
}
