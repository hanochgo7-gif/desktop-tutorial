// Import leads from a CSV exported from Excel / Google Sheets: auto-mapped columns, preview, duplicate skipping.

import { html, render, $, parseCSV, readTextFile, fmt } from '../core/util.js';
import { store } from '../core/store.js';
import { normPhone } from '../core/rules.js';
import { contactName } from '../core/model.js';
import { matchSourceText } from '../core/source-match.js';
import { modal, toast, icon, opt } from './components.js';

const TARGETS = [
  { key: '', label: 'לא לייבא' },
  { key: 'full_name', label: 'שם מלא', match: /^(שם|שם מלא|name|full ?name|לקוח|איש קשר)$/i },
  { key: 'first_name', label: 'שם פרטי', match: /(שם פרטי|first)/i },
  { key: 'last_name', label: 'שם משפחה', match: /(שם משפחה|last|surname)/i },
  { key: 'phone', label: 'טלפון', match: /(טלפון|נייד|פלאפון|phone|mobile|tel)/i },
  { key: 'email', label: 'אימייל', match: /(מייל|email|e-mail|דוא"?ל)/i },
  { key: 'company_name', label: 'עסק / חברה', match: /(עסק|חברה|company|business|ארגון)/i },
  { key: 'source', label: 'מקור הגעה', match: /(מקור|source|ערוץ|channel)/i },
  { key: 'need', label: 'צורך', match: /(צורך|need|שירות|פרויקט)/i },
  { key: 'notes', label: 'הערות', match: /(הער|notes?|comments?)/i },
  { key: 'created', label: 'תאריך פנייה', match: /(תאריך|date|created|נוצר)/i },
  { key: 'budget_estimate', label: 'תקציב', match: /(תקציב|budget)/i },
];

function guess(header) {
  const h = String(header).trim();
  return TARGETS.find((t) => t.match?.test(h))?.key || '';
}
// dd/mm/yyyy (Israeli), yyyy-mm-dd, or anything Date understands
function parseDate(s) {
  const v = String(s || '').trim();
  if (!v) return null;
  let m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); const d = new Date(y, Number(m[2]) - 1, Number(m[1]), 12); return isNaN(d) ? null : d; }
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
const matchSource = (text) => matchSourceText(text, store.all('crm_sources'));

function buildRows(data, map) {
  const existing = store.all('crm_contacts');
  const seenPhone = new Map(existing.filter((c) => c.phone_norm).map((c) => [c.phone_norm, c]));
  const seenEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email, c]));
  return data.map((cells, i) => {
    const get = (k) => { const idx = map.indexOf(k); return idx >= 0 ? String(cells[idx] ?? '').trim() : ''; };
    const r = { line: i + 2 };
    let first = get('first_name'), last = get('last_name');
    if (!first && !last && get('full_name')) { const parts = get('full_name').split(/\s+/); first = parts.shift(); last = parts.join(' '); }
    r.contact = {
      first_name: first || null, last_name: last || null, phone: get('phone') || null, email: get('email').toLowerCase() || null,
      company_name: get('company_name') || null, need: get('need') || null, notes: get('notes') || null,
    };
    const b = Number(get('budget_estimate').replace(/[^\d.]/g, ''));
    if (b > 0 && b < 1e8) r.contact.budget_estimate = b;
    const srcText = get('source');
    const src = matchSource(srcText);
    if (src) r.contact.first_source_id = src.id;
    if (srcText) r.contact.reported_source = srcText;
    r.sourceName = src?.name || (srcText ? `לא זוהה ("${srcText}")` : 'לא ידוע');
    const d = parseDate(get('created'));
    if (d && d <= new Date()) r.contact.created_at = d.toISOString();
    const pn = normPhone(r.contact.phone);
    if (r.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.contact.email)) { r.contact.email = null; r.warn = 'אימייל לא תקין הושמט'; }
    if (!r.contact.first_name && !r.contact.last_name && !r.contact.phone && !r.contact.email && !r.contact.company_name) r.skip = 'שורה ריקה';
    else if (pn && pn.length >= 9 && seenPhone.has(pn)) r.skip = `כפול: ${contactName(seenPhone.get(pn))}`;
    else if (r.contact.email && seenEmail.has(r.contact.email)) r.skip = `כפול: ${contactName(seenEmail.get(r.contact.email))}`;
    if (!r.skip) { if (pn && pn.length >= 9) seenPhone.set(pn, r.contact); if (r.contact.email) seenEmail.set(r.contact.email, r.contact); }
    return r;
  });
}

export async function importLeads(file) {
  let text;
  try { text = await readTextFile(file); } catch { toast('לא הצלחתי לקרוא את הקובץ', { kind: 'error' }); return; }
  const rows = parseCSV(text);
  if (rows.length < 2) { toast('בקובץ אין שורות לייבוא. ודאו ששורה ראשונה היא כותרות ושיש מתחתיה נתונים.', { kind: 'error', timeout: 8000 }); return; }
  if (rows.length > 5001) { toast('הקובץ גדול מדי (יותר מ-5,000 שורות). חלקו אותו לכמה קבצים.', { kind: 'error' }); return; }
  const headers = rows[0];
  const data = rows.slice(1);
  const map = headers.map(guess);
  let built = buildRows(data, map);
  modal({
    title: `ייבוא לידים מ-${file.name}`, size: 'lg',
    body: (el) => {
      const draw = () => {
        built = buildRows(data, map);
        const ok = built.filter((r) => !r.skip);
        render(el, html`<form class="form-grid import-form">
          <p class="small">התאימו כל עמודה בקובץ לשדה במערכת. זיהיתי אוטומטית את מה שיכולתי.</p>
          <div class="import-map">${headers.map((h, i) => html`<label class="field"><span class="field-label">${h || `עמודה ${i + 1}`} <small class="muted">${data[0]?.[i] ? `(למשל: ${String(data[0][i]).slice(0, 24)})` : ''}</small></span>
            <select class="input sm" data-col="${i}">${opt(TARGETS.map((t) => ({ value: t.key, label: t.label })), map[i])}</select></label>`)}</div>
          <p class="notice">${icon('info')}<span><b>${fmt.number(ok.length)}</b> לידים ייובאו${built.length - ok.length ? html`, <b>${fmt.number(built.length - ok.length)}</b> שורות ידולגו (כפולים או ריקים)` : ''}. לידים בלי תאריך פנייה יקבלו את התאריך של היום.</span></p>
          <label class="row small"><input type="checkbox" class="cbx" name="_tasks"> ליצור לכל ליד משימת "ליצור קשר" (לא מומלץ ברשימה ישנה)</label>
          <div class="table-wrap import-preview"><table class="table compact"><thead><tr><th>שורה</th><th>שם</th><th>טלפון</th><th>מקור</th><th>תאריך</th><th>מצב</th></tr></thead><tbody>
            ${built.slice(0, 60).map((r) => html`<tr class="${r.skip ? 'row-unknown' : ''}"><td class="num">${r.line}</td><td>${contactName(r.contact)}</td><td dir="ltr" class="num">${r.contact.phone || ''}</td><td>${r.sourceName}</td><td>${r.contact.created_at ? fmt.date(r.contact.created_at) : html`<span class="muted">היום</span>`}</td><td>${r.skip ? html`<span class="warn-text">${r.skip}</span>` : r.warn || 'ייובא'}</td></tr>`)}
          </tbody></table></div>
          ${built.length > 60 ? html`<p class="muted small">מוצגות 60 שורות ראשונות מתוך ${fmt.number(built.length)}.</p>` : ''}
        </form>`);
      };
      draw();
      el.addEventListener('change', (e) => { const s = e.target.closest('[data-col]'); if (s) { map[Number(s.dataset.col)] = s.value; draw(); } });
    },
    actions: [
      { label: 'ביטול' },
      {
        label: 'ייבוא', kind: 'primary',
        onClick: async ({ body }) => {
          const ok = built.filter((r) => !r.skip);
          if (!ok.length) { toast('אין שורות לייבוא. בדקו את התאמת העמודות.', { kind: 'error' }); return false; }
          const tasks = $('[name=_tasks]', body)?.checked;
          let n = 0, failed = 0;
          for (const r of ok) {
            try {
              const c = await store.insert('crm_contacts', { ...r.contact, origin: 'import', owner_id: store.userId, lead_status: 'new', lifecycle: 'lead', ...(r.contact.created_at && r.contact.first_source_id ? { first_touch_at: r.contact.created_at } : {}) });
              if (tasks) await store.insert('crm_tasks', { title: `ליצור קשר עם ${contactName(c)}`, type: 'call', due_at: new Date(Date.now() + 864e5).toISOString(), contact_id: c.id, owner_id: store.userId });
              n++;
            } catch { failed++; }
          }
          toast(`יובאו ${fmt.number(n)} לידים${failed ? `, ${failed} נכשלו` : ''}`, { kind: failed ? 'error' : 'success', timeout: 8000 });
          location.hash = '#/leads?tab=all';
          return true;
        },
      },
    ],
  });
}
