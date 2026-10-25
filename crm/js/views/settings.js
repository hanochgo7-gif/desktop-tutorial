// Settings: pipeline stages, marketing sources, data export, account.

import { html, render, on, toCSV, download, fmt, toDateInput } from '../core/util.js';
import { store } from '../core/store.js';
import { auth } from '../core/api.js';
import { stages, contactName, sourceName, stageName, label, TASK_TYPES, ACTIVITY_TYPES, LOST_REASONS } from '../core/model.js';

// local (Israel) date/time for exports, not UTC
const localD = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '');
const localDT = (d) => (d ? new Date(d).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '');
import { pageHeader, icon, setTitle, toast, promptDialog, confirmDialog, opt } from '../ui/components.js';

export default async function view(el, ctx) {
  setTitle('הגדרות');
  const draw = () => {
    const sts = stages();
    const srcs = store.all('crm_sources').sort((a, b) => a.position - b.position);
    render(el, html`
      ${pageHeader({ title: 'הגדרות' })}
      <section class="panel biz">
        <div class="panel-head"><h2>פרטי העסק</h2><span class="muted small">מופיעים בדרישות תשלום ובייצוא לרואה החשבון</span></div>
        <form class="form-grid pad biz-form" data-biz novalidate>
          <div class="form-3">
            <label class="field"><span class="field-label">שם העסק</span><input class="input" name="businessName" value="${store.settings.businessName ?? ''}"></label>
            <label class="field"><span class="field-label">מעמד במע"מ</span><select class="input" name="vatStatus">${opt([{ value: 'licensed', label: 'עוסק מורשה' }, { value: 'exempt', label: 'עוסק פטור' }, { value: 'company', label: 'חברה בע"מ' }], store.settings.vatStatus || 'licensed')}</select></label>
            <label class="field"><span class="field-label">מספר עוסק / ח.פ.</span><input class="input" name="taxId" dir="ltr" inputmode="numeric" value="${store.settings.taxId ?? ''}"></label>
          </div>
          <div class="form-3">
            <label class="field"><span class="field-label">שיעור מע"מ (%)</span><input class="input num" name="vatRate" type="number" min="0" max="30" step="0.5" dir="ltr" value="${store.settings.vatRate ?? 18}"></label>
            <label class="field"><span class="field-label">דיווח מע"מ</span><select class="input" name="vatFrequency">${opt([{ value: 'bimonthly', label: 'דו-חודשי' }, { value: 'monthly', label: 'חודשי' }], store.settings.vatFrequency || 'bimonthly')}</select></label>
            <label class="field"><span class="field-label">תוכנת החשבוניות שלי</span><input class="input" name="invoiceSoftware" value="${store.settings.invoiceSoftware ?? ''}" placeholder="למשל: חשבונית ירוקה"></label>
          </div>
          <div class="form-3">
            <label class="field"><span class="field-label">כתובת</span><input class="input" name="address" value="${store.settings.address ?? ''}"></label>
            <label class="field"><span class="field-label">טלפון</span><input class="input" name="phone" type="tel" dir="ltr" value="${store.settings.phone ?? ''}"></label>
            <label class="field"><span class="field-label">אימייל</span><input class="input" name="email" type="email" dir="ltr" value="${store.settings.email ?? ''}"></label>
          </div>
          <label class="field"><span class="field-label">פרטים לתשלום (בנק, ביט)</span><textarea class="input" name="bankDetails" rows="2" placeholder="בנק, סניף, מספר חשבון, שם המוטב">${store.settings.bankDetails ?? ''}</textarea></label>
          <div><button class="btn btn-primary" type="submit">שמירת פרטי העסק</button></div>
        </form>
      </section>
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
          <div class="panel-head"><h2>גיבוי ושחזור</h2></div>
          <div class="panel-body stack">
            ${store.mode === 'remote' ? html`<p class="small">הנתונים נשמרים בשרת (Supabase, פרנקפורט) ומוגנים בהרשאות. מומלץ להוריד גיבוי מלא פעם בשבוע.</p>`
              : html`<p class="small">הנתונים נשמרים בדפדפן הזה בלבד. גיבוי יומי נשמר אוטומטית בדפדפן, אבל רק <b>קובץ שמורידים</b> מגן מפני ניקוי נתוני הגלישה או החלפת מחשב.</p>
                <p class="small ${el._overdue ? 'warn-text' : 'muted'}">${el._last ? `קובץ גיבוי אחרון הורד ${fmt.relative(el._last)}.` : 'עוד לא הורד קובץ גיבוי.'}</p>`}
            <div class="row-wrap">
              <button class="btn btn-primary" data-act="backup">${icon('download')}הורדת קובץ גיבוי</button>
              ${store.mode === 'local' ? html`<button class="btn" data-act="restore-file">${icon('upload')}שחזור מקובץ</button><input type="file" accept=".json,application/json" hidden data-restore-file>` : ''}
            </div>
            ${store.mode === 'local' && el._snaps?.length ? html`<div><p class="small muted">גיבויים אוטומטיים בדפדפן:</p><ul class="mini-list">${el._snaps.map((x) => html`<li class="row"><span class="grow small">${fmt.dateTime(x.at)} | ${x.counts.contacts} לידים, ${x.counts.deals} עסקאות</span><button class="btn btn-sm btn-ghost" data-snap="${x.id}">שחזור</button></li>`)}</ul></div>` : ''}
            <div class="row-wrap">
              <button class="btn" data-act="import">${icon('upload')}ייבוא לידים מאקסל (CSV)</button><input type="file" accept=".csv,text/csv" hidden data-import-file>
            </div>
            <p class="small muted">באקסל: קובץ ← שמירה בשם ← CSV UTF-8. שורה ראשונה = כותרות (שם, טלפון, אימייל, מקור, תאריך...). כפולים מדולגים אוטומטית.</p>
            <div class="row-wrap">
              <button class="btn btn-ghost" data-act="csv-tasks">${icon('download')}משימות לאקסל</button>
              <button class="btn btn-ghost" data-act="csv-deals">${icon('download')}עסקאות לאקסל</button>
              <button class="btn btn-ghost" data-act="csv-activities">${icon('download')}היסטוריית פעילות לאקסל</button>
            </div>
            <p class="small muted">${fmt.number(store.all('crm_contacts').length)} לידים, ${fmt.number(store.all('crm_deals').length)} עסקאות, ${fmt.number(store.all('crm_activities').length)} פעילויות, ${fmt.number(store.all('crm_tasks').length)} משימות.</p>
            ${store.mode === 'local' && store.all('crm_contacts').some((c) => c.tags?.includes('דוגמה')) ? html`<button class="btn btn-ghost danger-text" data-act="clear-sample">${icon('trash')}מחיקת נתוני הדוגמה בלבד</button>` : ''}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>חשבון</h2></div>
          <div class="panel-body stack">
            ${store.mode === 'remote' ? html`<p class="small">מחובר כ-<b dir="ltr">${auth.user?.email || ''}</b> | סביבת עבודה: ${store.workspace?.name}</p>
              <div class="row-wrap"><button class="btn" data-act="password">${icon('lock')}שינוי סיסמה</button><button class="btn btn-ghost" data-act="logout">${icon('logout')}יציאה</button></div>`
              : html`<p class="small">אין חשבון. כשתרצו לעבור לשרת, הורידו קובץ גיבוי, והנתונים יועברו ממנו לחשבון.</p>
                <div class="row-wrap"><button class="btn btn-ghost danger-text" data-act="reset-local">${icon('trash')}מחיקת כל הנתונים מהדפדפן</button></div>`}
          </div>
        </section>
      </div>`);
  };
  const refreshMeta = async () => {
    if (store.mode !== 'local') return;
    const bk = await import('../core/backup.js');
    el._snaps = await bk.listSnapshots();
    el._last = bk.lastDownloaded();
    el._overdue = bk.backupOverdue(store);
  };
  await refreshMeta();
  draw();
  ctx.watch(['crm_stages', 'crm_sources'], draw);

  const restore = async (obj, what) => {
    const bk = await import('../core/backup.js');
    let n;
    try { n = bk.validateBackup(obj); } catch (err) { toast(err.message, { kind: 'error', timeout: 8000 }); return; }
    if (!(await confirmDialog(`לשחזר ${what}? (${n.contacts} לידים, ${n.deals} עסקאות, ${n.tasks} משימות, ${n.documents} מסמכים, ${n.expenses} הוצאות)`, { okLabel: 'שחזור', danger: true, detail: 'הנתונים הנוכחיים יוחלפו. לפני השחזור יורד אוטומטית קובץ גיבוי של המצב הנוכחי.' }))) return;
    download(`hg-os-before-restore-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`, JSON.stringify(bk.backupPayload(store)), 'application/json');
    store.replaceAllLocal(obj.rows);
    if (obj.settings) await store.saveSettings(obj.settings, { replace: true });
    toast('השחזור הושלם', { kind: 'success' });
    location.hash = '#/today';
  };
  on(el, 'change', '[data-restore-file]', async (e, input) => {
    const f = input.files[0];
    if (!f) return;
    let obj;
    try { obj = JSON.parse(await f.text()); } catch { toast('הקובץ לא נקרא. ודאו שזה קובץ גיבוי JSON של HG OS.', { kind: 'error' }); input.value = ''; return; }
    input.value = '';
    restore(obj, `מהקובץ ${f.name}`);
  });
  on(el, 'change', '[data-import-file]', async (e, input) => {
    const f = input.files[0];
    input.value = '';
    if (f) (await import('../ui/importer.js')).importLeads(f);
  });
  on(el, 'click', '[data-snap]', async (e, b) => {
    const bk = await import('../core/backup.js');
    const obj = await bk.getSnapshot(b.dataset.snap);
    if (obj) restore(obj, 'מהגיבוי האוטומטי');
  });

  on(el, 'submit', '[data-biz]', async (e, f) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries());
    v.vatRate = v.vatRate === '' ? NaN : Number(v.vatRate);
    if (!(v.vatRate >= 0 && v.vatRate <= 30)) { toast('שיעור מע"מ לא תקין', { kind: 'error' }); return; }
    if (v.taxId && !/^\d{8,9}$/.test(v.taxId.replace(/\D/g, ''))) { toast('מספר עוסק / ח.פ. צריך 8–9 ספרות', { kind: 'error' }); return; }
    try { await store.saveSettings(v); toast('פרטי העסק נשמרו', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); }
  });
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
    const day = toDateInput(new Date());
    if (a === 'add-source') {
      const name = await promptDialog('שם המקור', { title: 'מקור חדש', placeholder: 'למשל: TikTok, כנס, אתר שותף' });
      if (!name) return;
      const key = `s_${Date.now().toString(36)}`;
      try { await store.insert('crm_sources', { name, key, channel: 'other', is_paid: false, position: store.all('crm_sources').length }); toast('המקור נוסף', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); }
    }
    if (a === 'backup') {
      const bk = await import('../core/backup.js');
      download(`hg-os-backup-${day}.json`, JSON.stringify(bk.backupPayload(store)), 'application/json');
      bk.markDownloaded();
      await refreshMeta(); draw();
      toast('קובץ הגיבוי ירד. שמרו אותו גם מחוץ למחשב (Drive, מייל לעצמכם).', { kind: 'success', timeout: 8000 });
    }
    if (a === 'restore-file') el.querySelector('[data-restore-file]').click();
    if (a === 'import') el.querySelector('[data-import-file]').click();
    if (a === 'csv-tasks') {
      download(`tasks-${day}.csv`, toCSV([
        ['משימה', 'סוג', 'סטטוס', 'מועד', 'ליד', 'עסקה', 'עדיפות', 'תוצאה', 'הערות'],
        ...store.all('crm_tasks').map((t) => [t.title, label(TASK_TYPES, t.type), { open: 'פתוחה', done: 'בוצעה', canceled: 'בוטלה' }[t.status], localDT(t.due_at), contactName(store.get('crm_contacts', t.contact_id)), store.get('crm_deals', t.deal_id)?.name, { low: 'נמוכה', normal: 'רגילה', high: 'גבוהה' }[t.priority], t.outcome, t.notes]),
      ]), 'text/csv;charset=utf-8');
    }
    if (a === 'clear-sample') {
      const sample = store.filter('crm_contacts', (c) => c.tags?.includes('דוגמה'));
      if (!(await confirmDialog(`למחוק ${sample.length} לידים לדוגמה, יחד עם העסקאות, המשימות והפעילות שלהם?`, { danger: true, okLabel: 'מחיקה' }))) return;
      const ids = new Set(sample.map((c) => c.id));
      const dealIds = new Set(store.filter('crm_deals', (d) => ids.has(d.contact_id)).map((d) => d.id));
      const rows = structuredClone(store.rows);
      rows.crm_contacts = rows.crm_contacts.filter((c) => !ids.has(c.id));
      rows.crm_deals = rows.crm_deals.filter((d) => !dealIds.has(d.id));
      rows.crm_tasks = rows.crm_tasks.filter((t) => !ids.has(t.contact_id) && !dealIds.has(t.deal_id));
      rows.crm_activities = rows.crm_activities.filter((x) => !ids.has(x.contact_id) && !dealIds.has(x.deal_id));
      rows.crm_deal_stage_history = rows.crm_deal_stage_history.filter((h) => !dealIds.has(h.deal_id));
      rows.crm_ad_spend = rows.crm_ad_spend.filter((s) => !s.sample); // keep spend the user entered
      rows.crm_documents = (rows.crm_documents || []).filter((x) => !ids.has(x.contact_id) && !dealIds.has(x.deal_id));
      rows.crm_expenses = (rows.crm_expenses || []).filter((x) => !dealIds.has(x.deal_id));
      store.replaceAllLocal(rows);
      toast('נתוני הדוגמה נמחקו', { kind: 'success' });
      draw();
    }
    if (a === 'csv-deals') {
      download(`deals-${day}.csv`, toCSV([
        ['עסקה', 'ליד', 'שלב', 'סטטוס', 'סכום צפוי (לפני מע"מ)', 'סכום סופי (לפני מע"מ)', 'נגבה (לפני מע"מ)', 'תשלום אחרון', 'עלות ישירה', 'מקור', 'סוג שירות', 'נפתחה', 'נסגרה', 'סיבת הפסד'],
        ...store.all('crm_deals').map((d) => [d.name, contactName(store.get('crm_contacts', d.contact_id)), stageName(d.stage_id), { open: 'פתוחה', won: 'נסגרה בהצלחה', lost: 'הפסד' }[d.outcome], d.amount_expected, d.amount_final, d.amount_paid, d.paid_at, d.direct_cost_estimate, sourceName(d.source_id), d.service_type, localD(d.opened_at), localD(d.closed_at), label(LOST_REASONS, d.lost_reason)]),
      ]), 'text/csv;charset=utf-8');
    }
    if (a === 'csv-activities') {
      download(`activities-${day}.csv`, toCSV([
        ['תאריך', 'סוג', 'ליד', 'עסקה', 'תוצאה', 'תוכן'],
        ...store.all('crm_activities').sort((x, y) => (x.at < y.at ? 1 : -1)).map((x) => [localDT(x.at), label(ACTIVITY_TYPES, x.type), contactName(store.get('crm_contacts', x.contact_id)), store.get('crm_deals', x.deal_id)?.name, x.outcome, x.body]),
      ]), 'text/csv;charset=utf-8');
    }
    if (a === 'password') {
      const p = await promptDialog('סיסמה חדשה (לפחות 8 תווים)', { title: 'שינוי סיסמה', okLabel: 'שינוי' });
      if (!p) return;
      if (p.length < 8) { toast('הסיסמה קצרה מדי', { kind: 'error' }); return; }
      try { await auth.updatePassword(p); toast('הסיסמה שונתה', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); }
    }
    if (a === 'logout') { await auth.signOut(); location.hash = ''; location.reload(); }
    if (a === 'reset-local') {
      if (!(await confirmDialog('למחוק את כל הנתונים מהדפדפן הזה?', { danger: true, okLabel: 'מחיקה', detail: 'אי אפשר לבטל. הורידו קובץ גיבוי לפני כן.' }))) return;
      store.resetLocal(); localStorage.removeItem('hgos-mode'); location.hash = ''; location.reload();
    }
  });
}
