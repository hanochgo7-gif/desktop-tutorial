// Marketing sources: which source brings leads, customers, revenue and profit, and what each costs.

import { html, render, on, fmt, toCSV, download, $, toDateInput } from '../core/util.js';
import { store } from '../core/store.js';
import { setQuery } from '../core/router.js';
import { sources } from '../core/model.js';
import { sourceReport, salesSummary, periodFor, UNKNOWN } from '../core/metrics.js';
import { pageHeader, icon, setTitle, modal, toast, readForm, showFieldErrors, opt, confirmDialog } from '../ui/components.js';
import { showRecords } from '../ui/drill.js';

const PERIODS = ['this_month', 'last_month', 'last_90', 'this_quarter', 'this_year', 'last_12m', 'all'];
const pct = (r) => (r.value == null ? null : fmt.percent(r.value * 100));
const x = (r) => (r.value == null ? null : `${fmt.decimal(r.value)}x`);
const money = (r) => (r.value == null ? null : fmt.money(r.value));
const na = (txt, reason) => (txt == null ? html`<span class="nil" title="${reason || 'לא ניתן לחישוב'}">—</span>` : txt);

export default async function view(el, ctx) {
  setTitle('מקורות ופרסום');
  const st = { period: ctx.query.p || 'last_90', model: ctx.query.m || 'first' };

  const draw = () => {
    setQuery({ p: st.period, m: st.model });
    const period = periodFor(st.period);
    const data = { contacts: store.all('crm_contacts'), deals: store.all('crm_deals'), sources: store.all('crm_sources'), spend: store.all('crm_ad_spend') };
    const rep = sourceReport({ ...data, period, model: st.model });
    const sales = salesSummary({ ...data, stages: store.all('crm_stages'), history: store.all('crm_deal_stage_history'), period });
    el._rep = rep; el._sales = sales;
    const t = rep.total, comp = rep.completeness;
    const insights = buildInsights(rep);
    render(el, html`
      ${pageHeader({ title: 'מקורות ופרסום', subtitle: 'מאיפה מגיעים הלקוחות והכסף, ומה זה עולה',
        actions: html`<button class="btn" data-act="spend">${icon('plus')}הוצאות פרסום</button><button class="btn btn-ghost" data-act="export">${icon('download')}ייצוא</button>` })}
      <div class="toolbar">
        <div class="seg" role="radiogroup" aria-label="תקופה">${PERIODS.map((p) => html`<button class="${p === st.period ? 'active' : ''}" data-period="${p}" role="radio" aria-checked="${p === st.period}">${periodFor(p).label}</button>`)}</div>
        <label class="row small">ייחוס:
          <select class="input sm" data-model style="width:auto">${opt([{ value: 'first', label: 'מקור ראשון (ברירת מחדל)' }, { value: 'last', label: 'מקור אחרון' }], st.model)}</select></label>
      </div>
      <section class="kpis">
        <div class="kpi-btn static"><span class="kpi-label">הוצאות פרסום</span><span class="kpi-value">${fmt.money(t.spend)}</span></div>
        <button class="kpi-btn" data-drill="leads"><span class="kpi-label">לידים</span><span class="kpi-value">${fmt.number(t.leads)}</span><span class="kpi-sub">${fmt.number(t.qualified)} מתאימים</span></button>
        <button class="kpi-btn" data-drill="customers"><span class="kpi-label">הפכו ללקוחות</span><span class="kpi-value">${fmt.number(t.customers)}</span><span class="kpi-sub">${na(pct(t.closeRate), t.closeRate.reason)} שיעור הפיכה${t.openCohort ? `, ${t.openCohort} עוד פתוחים` : ''}</span></button>
        <button class="kpi-btn" data-drill="won"><span class="kpi-label">הכנסה שנסגרה</span><span class="kpi-value money">${fmt.money(t.revenue)}</span><span class="kpi-sub">${t.wonDeals} עסקאות</span></button>
        <button class="kpi-btn" data-drill="collected"><span class="kpi-label">נגבה בפועל</span><span class="kpi-value">${fmt.money(t.collected)}</span></button>
        <div class="kpi-btn static"><span class="kpi-label">רווח אחרי פרסום</span><span class="kpi-value ${t.profitAfterAds < 0 ? 'danger-text' : ''}">${fmt.money(t.profitAfterAds)}</span><span class="kpi-sub">${t.wonMissingCost ? `${t.wonMissingCost} עסקאות בלי עלות` : 'רווח גולמי פחות הוצאות פרסום'}</span></div>
      </section>
      ${insights.length ? html`<section class="panel insights"><div class="panel-head"><h2>${icon('sparkles')}מה הנתונים אומרים</h2><span class="muted small">חישוב, לא ניחוש</span></div><ul>${insights.map((i) => html`<li>${i}</li>`)}</ul></section>` : ''}
      <div class="table-wrap"><table class="table table-sources">
        <thead><tr><th>מקור</th><th>הוצאה</th><th>לידים</th><th>מתאימים</th><th>לקוחות</th><th>שיעור הפיכה</th><th>הכנסה שנסגרה</th><th>נגבה</th><th>עלות לליד</th><th>עלות ללקוח (CAC)</th><th>ROAS</th><th>רווח אחרי פרסום</th><th>ROI</th></tr></thead>
        <tbody>${rep.rows.map((r) => html`<tr class="${r.sourceId === UNKNOWN ? 'row-unknown' : ''}">
          <th scope="row" data-label="מקור">${r.name}${r.isPaid ? html` <span class="badge badge-amber">ממומן</span>` : ''}</th>
          <td data-label="הוצאה" class="num">${r.spend ? fmt.money(r.spend) : html`<span class="nil">—</span>`}</td>
          <td data-label="לידים" class="num"><button class="linkbtn" data-src="${r.sourceId}" data-k="leads">${r.leads.length}</button></td>
          <td data-label="מתאימים" class="num"><button class="linkbtn" data-src="${r.sourceId}" data-k="qualified">${r.qualified.length}</button></td>
          <td data-label="לקוחות" class="num"><button class="linkbtn" data-src="${r.sourceId}" data-k="customers">${r.customers.length}</button></td>
          <td data-label="שיעור הפיכה" class="num">${na(pct(r.closeRate), r.closeRate.reason)}${r.leads.length && r.leads.length < 10 ? html`<small class="muted" title="פחות מ-10 לידים: מוקדם להסיק מסקנות"> *</small>` : ''}</td>
          <td data-label="הכנסה שנסגרה" class="num"><button class="linkbtn" data-src="${r.sourceId}" data-k="won">${fmt.money(r.revenue)}</button></td>
          <td data-label="נגבה" class="num">${fmt.money(r.collected)}</td>
          <td data-label="עלות לליד" class="num">${na(money(r.cpl), r.cpl.reason)}</td>
          <td data-label="CAC" class="num">${na(money(r.cac), r.cac.reason)}</td>
          <td data-label="ROAS" class="num">${na(x(r.roas), r.roas.reason)}</td>
          <td data-label="רווח אחרי פרסום" class="num ${r.profitAfterAds < 0 ? 'danger-text' : ''}">${r.revenue || r.spend ? fmt.money(r.profitAfterAds) : html`<span class="nil">—</span>`}${!r.costComplete ? html`<small class="warn-text" title="${r.wonMissingCost} עסקאות בלי עלות ישירה, הרווח מוערך ביתר"> !</small>` : ''}</td>
          <td data-label="ROI" class="num">${na(r.roi.value == null ? null : fmt.percent(r.roi.value), r.roi.reason)}</td>
        </tr>`)}</tbody>
        <tfoot><tr><th>סה"כ</th><td class="num">${fmt.money(t.spend)}</td><td class="num">${t.leads}</td><td class="num">${t.qualified}</td><td class="num">${t.customers}</td><td class="num">${na(pct(t.closeRate))}</td><td class="num">${fmt.money(t.revenue)}</td><td class="num">${fmt.money(t.collected)}</td><td></td><td class="num" title="הוצאות פרסום חלקי לקוחות חדשים ממקורות ממומנים">${na(money(t.cac), t.cac.reason)}</td><td class="num" title="הכנסה ממקורות ממומנים חלקי הוצאות הפרסום">${na(x(t.roas))}</td><td class="num">${fmt.money(t.profitAfterAds)}</td><td class="num">${na(t.roi.value == null ? null : fmt.percent(t.roi.value))}</td></tr></tfoot>
      </table></div>
      <section class="panel quality">
        <div class="panel-head"><h2>כמה אפשר לסמוך על הדוח</h2></div>
        <ul class="quality-list">
          <li>${comp.knownSource.value == null ? 'אין לידים בתקופה' : html`<b>${fmt.percent(comp.knownSource.value * 100)}</b> מהלידים עם מקור ידוע`}${comp.unknownSourceIds.length ? html` (<button class="linkbtn" data-drill="unknown">${comp.unknownSourceIds.length} בלי מקור</button>)` : ''}</li>
          <li>${comp.withCost.value == null ? 'אין עסקאות שנסגרו' : html`<b>${fmt.percent(comp.withCost.value * 100)}</b> מהעסקאות שנסגרו עם עלות ישירה`}</li>
          <li>${comp.withPayment.value == null ? '' : html`<b>${fmt.percent(comp.withPayment.value * 100)}</b> מהעסקאות שנסגרו עם גבייה רשומה${comp.unpaidWonIds.length ? html` (<button class="linkbtn" data-drill="unpaid">${comp.unpaidWonIds.length} עם יתרה</button>)` : ''}`}</li>
          <li>הוצאות הפרסום מוזנות ידנית. אין חיבור פעיל ל-Google Ads או ל-Meta.</li>
        </ul>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>איפה מאבדים לקוחות</h2><span class="muted small">עסקאות שנפתחו ב${periodFor(st.period).label}: ${sales.funnel.cohort}</span></div>
        ${sales.funnel.cohort ? html`<div class="funnel">${sales.funnel.steps.map((s, i) => {
          const w = sales.funnel.cohort ? Math.max(4, (s.ids.length / sales.funnel.cohort) * 100) : 0;
          return html`<button class="funnel-row" data-funnel="${i}"><span class="funnel-name">${s.name}</span><span class="funnel-bar"><i style="width:${w}%"></i></span><span class="num">${s.ids.length}</span><span class="muted small num">${s.fromPrev?.value != null ? fmt.percent(s.fromPrev.value * 100) : ''}</span></button>`;
        })}</div>${sales.funnel.worst?.lost ? html`<p class="panel-foot small">הנפילה הגדולה ביותר: בין "${sales.funnel.worst.from}" ל"${sales.funnel.worst.to}" (${sales.funnel.worst.lost} עסקאות).</p>` : ''}` : html`<p class="pad muted small">אין עסקאות שנפתחו בתקופה.</p>`}
      </section>
      <details class="panel defs"><summary class="panel-head"><h2>איך מחושב כל מספר</h2>${icon('chevronDown')}</summary><div class="panel-body small">
        <p><b>לידים:</b> אנשי קשר שנוצרו בתקופה, כל אחד נספר פעם אחת. מחיקה מוציאה ליד מהדוח.</p>
        <p><b>מקור:</b> ${st.model === 'first' ? 'מקור ההגעה המקורי של הליד. הכנסה משויכת למקור שנשמר על העסקה כשנפתחה.' : 'המקור של הפנייה האחרונה של הליד.'} ליד בלי מקור נספר תחת "מקור לא ידוע" ולא מנוחש.</p>
        <p><b>שיעור הפיכה ללקוח:</b> לידים מהתקופה שיש להם עסקה שנסגרה בהצלחה (בכל זמן), חלקי כל הלידים מהתקופה. לידים שעוד בתהליך אינם הפסד, ולכן בתקופות אחרונות השיעור עוד יעלה.</p>
        <p><b>הכנסה שנסגרה:</b> סכום סופי, לפני מע"מ, של עסקאות שנסגרו בהצלחה בתקופה. <b>נגבה:</b> סכומים שסומנו כנגבו עם תאריך גבייה בתקופה (הזנה ידנית).</p>
        <p><b>CAC:</b> הוצאות פרסום של המקור בתקופה, חלקי לקוחות חדשים שהעסקה הראשונה שלהם נסגרה בתקופה. לקוח חוזר לא נספר שוב.</p>
        <p><b>בשורת הסה"כ</b> ROAS, ROI ו-CAC מחושבים רק מהמקורות הממומנים: הכנסה מהפניות או מחיפוש אורגני אינה תשואה על פרסום. CAC משולב (כל הלקוחות החדשים): ${na(money(t.blendedCac), t.blendedCac.reason)}.</p>
        <p><b>ROAS:</b> הכנסה שנסגרה חלקי הוצאות הפרסום (מכפיל). <b>רווח גולמי:</b> הכנסה שנסגרה פחות עלויות ישירות. <b>ROI:</b> (רווח גולמי פחות הוצאות פרסום) חלקי הוצאות הפרסום, באחוזים. ROAS אינו ROI.</p>
        <p>כשאין מספיק נתונים (למשל אין הוצאה) מוצג "—" במקום מספר מטעה. כוכבית: פחות מ-10 לידים, מוקדם להסיק מסקנות.</p>
      </div></details>`);
  };
  draw();
  ctx.watch(['crm_contacts', 'crm_deals', 'crm_ad_spend', 'crm_sources'], draw);

  on(el, 'click', '[data-period]', (e, b) => { st.period = b.dataset.period; draw(); });
  on(el, 'change', '[data-model]', (e, s) => { st.model = s.value; draw(); });
  on(el, 'click', '[data-src]', (e, b) => {
    const r = el._rep.rows.find((x) => x.sourceId === b.dataset.src);
    const k = b.dataset.k;
    const t = { leads: 'לידים', qualified: 'לידים מתאימים', customers: 'הפכו ללקוחות', won: 'עסקאות שנסגרו' }[k];
    if (k === 'won') showRecords(`${r.name}: ${t}`, { deals: r.wonDeals });
    else showRecords(`${r.name}: ${t}`, { contacts: r[k] });
  });
  on(el, 'click', '[data-drill]', (e, b) => {
    const rep = el._rep, k = b.dataset.drill;
    if (k === 'leads') showRecords('לידים בתקופה', { contacts: rep.rows.flatMap((r) => r.leads) });
    if (k === 'customers') showRecords('לידים מהתקופה שהפכו ללקוחות', { contacts: rep.rows.flatMap((r) => r.customers) });
    if (k === 'won') showRecords('עסקאות שנסגרו בתקופה', { deals: rep.rows.flatMap((r) => r.wonDeals) });
    if (k === 'collected') showRecords('נגבה בתקופה', { deals: rep.rows.flatMap((r) => r.collectedDeals) });
    if (k === 'unknown') showRecords('לידים בלי מקור', { contacts: rep.completeness.unknownSourceIds, note: 'פתחו כל ליד ובחרו "קביעה" ליד המקור, אם אתם יודעים מאיפה הגיע.' });
    if (k === 'unpaid') showRecords('עסקאות שנסגרו עם יתרה לגבייה', { deals: rep.completeness.unpaidWonIds });
  });
  on(el, 'click', '[data-funnel]', (e, b) => { const s = el._sales.funnel.steps[Number(b.dataset.funnel)]; showRecords(`הגיעו לשלב "${s.name}"`, { deals: s.ids }); });
  on(el, 'click', '[data-act]', (e, b) => {
    if (b.dataset.act === 'spend') openSpend();
    if (b.dataset.act === 'export') {
      const rep = el._rep;
      const v = (r) => (r.value == null ? '' : Math.round(r.value * 100) / 100);
      download(`sources-${st.period}.csv`, toCSV([
        ['מקור', 'הוצאה', 'לידים', 'מתאימים', 'לקוחות', 'שיעור הפיכה', 'הכנסה שנסגרה', 'נגבה', 'עלות לליד', 'CAC', 'ROAS', 'רווח אחרי פרסום', 'ROI %'],
        ...rep.rows.map((r) => [r.name, r.spend, r.leads.length, r.qualified.length, r.customers.length, v(r.closeRate), r.revenue, r.collected, v(r.cpl), v(r.cac), v(r.roas), r.profitAfterAds, v(r.roi)]),
      ]), 'text/csv;charset=utf-8');
    }
  });
}

// Plain-language findings computed from the report (deterministic, with the numbers behind them).
function buildInsights(rep) {
  const out = [];
  const real = rep.rows.filter((r) => r.sourceId !== UNKNOWN && r.leads.length >= 5);
  if (real.length >= 2) {
    const best = [...real].sort((a, b) => (b.closeRate.value ?? -1) - (a.closeRate.value ?? -1))[0];
    if (best.closeRate.value != null) out.push(html`השיעור הגבוה ביותר של הפיכה ללקוח: <b>${best.name}</b>, ${best.customers.length} לקוחות מתוך ${best.leads.length} לידים (${fmt.percent(best.closeRate.value * 100)}).`);
  }
  const byRev = rep.rows.filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue)[0];
  if (byRev) out.push(html`ההכנסה הגבוהה ביותר: <b>${byRev.name}</b>, ${fmt.money(byRev.revenue)} מ-${byRev.wonDeals.length} עסקאות.`);
  for (const r of rep.rows.filter((x) => x.spend > 0)) {
    if (!r.newCustomers.length) out.push(html`<b>${r.name}</b>: הוצאה של ${fmt.money(r.spend)} ועדיין אין לקוח חדש בתקופה. ${r.openCohort.length ? `${r.openCohort.length} לידים עוד בתהליך, מוקדם לשפוט.` : 'כדאי לבדוק את הקמפיין.'}`);
    else if (r.roas.value != null && r.roas.value < 1) out.push(html`<b>${r.name}</b>: ROAS של ${fmt.decimal(r.roas.value)}x, ההכנסה נמוכה מההוצאה.`);
  }
  if (rep.completeness.knownSource.value != null && rep.completeness.knownSource.value < 0.8) out.push(html`ל-${rep.completeness.unknownSourceIds.length} לידים אין מקור, ולכן ההשוואה בין המקורות חלקית.`);
  return out.slice(0, 5);
}

// Ad spend: one amount per source per month (or day), entered by hand until an ads account is connected.
function openSpend() {
  const paid = sources();
  const m = modal({
    title: 'הוצאות פרסום', size: 'md',
    body: (el) => {
      const draw = () => {
        const rows = store.all('crm_ad_spend').sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 24);
        render(el, html`<form class="form-grid spend-form" novalidate>
          <div class="form-3">
            <div class="field"><label class="field-label" for="sp-src">מקור</label><select class="input" id="sp-src" name="source_id">${opt(paid.map((s) => ({ value: s.id, label: s.name })), paid.find((s) => s.is_paid)?.id)}</select></div>
            <div class="field"><label class="field-label" for="sp-month">חודש</label><input class="input" id="sp-month" name="month" type="month" value="${toDateInput(new Date()).slice(0, 7)}"></div>
            <div class="field"><label class="field-label" for="sp-amt">סכום (₪)</label><input class="input num" id="sp-amt" name="amount" type="number" min="0" step="1" dir="ltr" autofocus></div>
          </div>
          <button class="btn btn-primary" type="submit">${icon('plus')}הוספה</button>
          <p class="field-help">הזינו את סך ההוצאה בחודש כפי שמופיע בחשבון הפרסום (כולל מע"מ אם משלמים מע"מ על הפרסום). הזנה חוזרת לאותו מקור וחודש מעדכנת את השורה הקיימת.</p>
        </form>
        ${rows.length ? html`<table class="table compact"><thead><tr><th>חודש</th><th>מקור</th><th>סכום</th><th></th></tr></thead><tbody>${rows.map((r) => html`<tr><td>${String(r.day).slice(0, 7)}</td><td>${store.get('crm_sources', r.source_id)?.name}</td><td class="num">${fmt.money(r.amount)}</td><td><button class="btn-icon sm" data-del="${r.id}" aria-label="מחיקה">${icon('trash')}</button></td></tr>`)}</tbody></table>` : html`<p class="muted small">עוד לא הוזנו הוצאות.</p>`}`);
      };
      draw();
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const v = readForm(form);
        if (!v.amount && v.amount !== 0) { showFieldErrors(form, { amount: 'הזינו סכום' }); return; }
        if (!v.month) { showFieldErrors(form, { month: 'בחרו חודש' }); return; }
        const day = `${v.month}-01`;
        const existing = store.find('crm_ad_spend', (r) => r.source_id === v.source_id && String(r.day).slice(0, 10) === day && !r.campaign_id && r.origin === 'manual');
        try {
          if (existing) await store.update('crm_ad_spend', existing.id, { amount: v.amount });
          else await store.insert('crm_ad_spend', { source_id: v.source_id, day, amount: v.amount, origin: 'manual', currency: 'ILS' });
          toast(existing ? 'ההוצאה עודכנה' : 'ההוצאה נוספה', { kind: 'success' });
          draw();
        } catch (err) { toast(err.message, { kind: 'error' }); }
      });
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-del]');
        if (!b) return;
        if (!(await confirmDialog('למחוק את שורת ההוצאה?', { danger: true, okLabel: 'מחיקה' }))) return;
        try { await store.remove('crm_ad_spend', b.dataset.del); draw(); } catch (err) { toast(err.message, { kind: 'error' }); }
      });
    },
  });
  return m;
}
