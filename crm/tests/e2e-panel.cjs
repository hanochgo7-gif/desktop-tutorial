// Regression tests for every issue the customer panel reported.
process.env.TZ = 'Asia/Jerusalem'; // same clock as the browser context, so due times compare correctly
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL = process.env.HGOS_URL || process.argv[2] || 'http://localhost:8765/crm/';
let fails = 0;
const check = (c, m) => { console.log(c ? '• PASS' : '• FAIL', m); if (!c) fails++; };
const S = (p) => p.evaluate(() => window.__store.rows);

async function fresh(b, opts = {}, sample = false) {
  const ctx = await b.newContext({ locale: 'he-IL', timezoneId: 'Asia/Jerusalem', acceptDownloads: true, ...opts });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.goto(URL);
  await p.click('[data-trial]');
  await p.click(sample ? '.ov-foot button:has-text("נתוני דוגמה")' : '.ov-foot .btn-primary');
  await p.waitForTimeout(500);
  return p;
}
async function addLead(p, { first, phone, email, source }) {
  await p.click('[data-top="lead"]');
  await p.fill('.ov [name=first_name]', first);
  if (phone) await p.fill('.ov [name=phone]', phone);
  if (email) await p.fill('.ov [name=email]', email);
  if (source) await p.selectOption('.ov [name=first_source_id]', { label: source });
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(400);
}

(async () => {
  const b = await chromium.launch();

  // ---------- Avi: logging never silently completes the wrong task; no-answer flow ----------
  let p = await fresh(b, { viewport: { width: 1280, height: 800 } });
  await addLead(p, { first: 'אבי בדיקה', phone: '0501111111' });
  const cid = p.url().split('/c/')[1];
  let r = await S(p);
  const firstTask = r.crm_tasks[0];
  await p.click('.quick-bar [data-act="log"]');
  await p.click('.ov [data-type="note"]');
  check(await p.locator('.ov [name=_done_task]:checked').count() === 0, 'Avi: a note does not tick the due task');
  await p.fill('.ov [name=body]', 'הערה בלבד');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(300);
  r = await S(p);
  check(r.crm_tasks.find((t) => t.id === firstTask.id).status === 'open', 'Avi: saving a note leaves the open task open');
  await p.click('.quick-bar [data-act="log"]');
  await p.check('.ov [name=outcome][value="לא ענה"]');
  const due = await p.inputValue('.ov [name=_next_due]');
  const hrs = (new Date(due) - Date.now()) / 36e5;
  check(await p.inputValue('.ov [name=_status]') === 'attempting', 'Avi: "לא ענה" sets status to ניסיון יצירת קשר');
  check((hrs > 1.5 && hrs < 2.5) || new Date().getHours() >= 18, `Avi: retry defaults to ~2 hours (${hrs.toFixed(1)}h)`);
  check(await p.locator('.ov [data-quick] button:has-text("חודש")').count() === 1, 'Avi: "in a month" shortcut exists');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(300);
  r = await S(p);
  check(r.crm_contacts[0].lead_status === 'attempting', 'Avi: status saved as attempting');
  // Yossi: Enter in the task form must not reload the page
  await p.click('.next-card [data-act="task"]');
  await p.fill('.ov [name=title]', 'משימה עם אנטר');
  const before = p.url();
  await p.press('.ov [name=title]', 'Enter');
  await p.waitForTimeout(500);
  r = await S(p);
  check(p.url() === before && r.crm_tasks.some((t) => t.title === 'משימה עם אנטר'), 'Yossi: Enter in task form saves, no page reload');
  // Ronit: back closes the dialog and keeps the page; backdrop with typed text asks first
  await p.click('.quick-bar [data-act="log"]');
  await p.goBack();
  await p.waitForTimeout(300);
  check(await p.locator('.ov').count() === 0 && p.url().includes('/c/' + cid), 'Ronit: Back closes the dialog and stays on the page');
  await p.click('.quick-bar [data-act="log"]');
  await p.fill('.ov [name=body]', 'טקסט חשוב');
  await p.mouse.click(5, 400);
  await p.waitForTimeout(250);
  check(await p.locator('.ov h2:has-text("יש שינויים שלא נשמרו")').count() === 1, 'Ronit: closing with typed text asks for confirmation');
  await p.click('.ov:last-child .ov-foot button:has-text("ביטול")');
  await p.waitForTimeout(250);
  check(await p.inputValue('.ov [name=body]') === 'טקסט חשוב', 'Ronit: typed text kept after cancel');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  await p.click('.ov:last-child .ov-foot .btn-danger');
  await p.waitForTimeout(300);
  // David: every visible lead-form control has an accessible name
  await p.click('[data-top="lead"]');
  await p.click('.ov details.more-fields summary');
  const unnamed = await p.$$eval('.ov input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .ov select, .ov textarea', (els) => els.filter((e) => !(e.labels?.length || e.getAttribute('aria-label'))).map((e) => e.name));
  check(unnamed.length === 0, `David: all lead form fields have labels (${unnamed.join(',') || 'none missing'})`);
  // Yossi: 00972 phone detected; explicit "create anyway"
  await p.fill('.ov [name=first_name]', 'כפול');
  await p.fill('.ov [name=phone]', '00972-50-111-1111');
  await p.locator('.ov [name=email]').focus();
  await p.waitForTimeout(150);
  check(await p.locator('.ov [data-dup]:not([hidden])').count() === 1, 'Yossi: 00972 format detected as duplicate');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(200);
  check((await S(p)).crm_contacts.length === 1, 'Yossi: duplicate blocked until confirmed');
  await p.check('.ov [data-allow-dup]');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  check((await S(p)).crm_contacts.length === 2, 'Yossi: "create anyway" creates it');
  check(await p.locator('.ov [data-dup]:visible').count() === 0, 'Yossi/Ronit: no empty duplicate box');

  // ---------- Michal + Yossi: money ----------
  await p.goto(URL + '#/c/' + cid);
  await p.waitForTimeout(300);
  await p.click('.quick-bar [data-act="deal"]');
  await p.fill('.ov [name=amount_expected]', '10000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  let deal = (await S(p)).crm_deals[0];
  await p.goto(URL + '#/d/' + deal.id); await p.waitForTimeout(300);
  await p.click('.quick-bar button:has-text("נסגר בהצלחה")');
  await p.fill('.ov [name=amount_final]', '10000');
  await p.fill('.ov [name=_closed]', '2026-09-15');
  await p.fill('.ov [name=_paid]', '50000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(200);
  check(await p.locator('.ov .field-err').count() >= 1, 'Yossi: collecting more than the deal is rejected');
  await p.fill('.ov [name=_paid]', '5900'); // incl. VAT -> 5,000 net
  await p.fill('.ov [name=_paid_on]', '2026-09-20');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  deal = (await S(p)).crm_deals[0];
  check(deal.outcome === 'won' && deal.closed_at.startsWith('2026-09-15'), 'Michal: historical close date saved');
  check(Math.abs(deal.amount_paid - 5000) < 0.01, `Yossi: payment incl. VAT stored before VAT (5,900 -> ${deal.amount_paid})`);
  await p.click('[data-act="money"]');
  await p.fill('.ov [name=_amt]', '5900');
  await p.fill('.ov [name=_date]', '2026-10-05');
  await p.click('.ov [data-add="pay"]');
  await p.locator('.ov tbody tr').nth(1).waitFor();
  await p.click('.ov-foot .btn-primary'); await p.waitForSelector('.ov', { state: 'detached' }); await p.waitForTimeout(200);
  const m = await p.evaluate(async () => {
    const mm = await import('./js/core/metrics.js');
    const d = window.__store.all('crm_deals')[0];
    return { sep: mm.collectedIn(d, { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) }), oct: mm.collectedIn(d, { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) }), total: d.amount_paid };
  });
  check(Math.abs(m.sep - 5000) < 0.01 && Math.abs(m.oct - 5000) < 0.01 && Math.abs(m.total - 10000) < 0.01, `Michal: second payment doesn't rewrite September (Sep ${m.sep}, Oct ${m.oct})`);
  // Yossi: editing a won deal keeps it won
  await p.click('[data-act="edit"]');
  await p.fill('.ov [name=name]', 'שם חדש');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  deal = (await S(p)).crm_deals[0];
  check(deal.outcome === 'won' && deal.name === 'שם חדש' && !!deal.closed_at, 'Yossi: editing a won deal keeps it won');
  // Michal: a source set later moves the revenue
  check(!deal.source_id, 'Michal: (setup) deal has no source');
  await p.goto(URL + '#/c/' + cid); await p.waitForTimeout(300);
  await p.click('[data-act="set-source"]');
  await p.selectOption('.ov [name=first_source_id]', { label: 'הפניה מלקוח' });
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  r = await S(p);
  check(r.crm_deals[0].source_id === r.crm_contacts.find((c) => c.id === cid).first_source_id, 'Michal: setting the lead source later updates its deal');
  // Michal: spend overwrite asks; negatives rejected
  await p.goto(URL + '#/sources'); await p.waitForTimeout(300);
  await p.click('[data-act="spend"]');
  await p.fill('.ov [name=amount]', '-500');
  await p.click('.ov .spend-form button[type=submit]'); await p.waitForTimeout(200);
  check((await S(p)).crm_ad_spend.length === 0, 'Michal: negative spend rejected');
  await p.fill('.ov [name=amount]', '2000');
  await p.click('.ov .spend-form button[type=submit]'); await p.waitForTimeout(300);
  await p.fill('.ov [name=amount]', '0');
  await p.click('.ov .spend-form button[type=submit]'); await p.waitForTimeout(300);
  check(await p.locator('.ov h2:has-text("לאשר")').count() === 1, 'Michal: overwriting existing spend asks for confirmation');
  await p.click('.ov:last-child .ov-foot button:has-text("ביטול")'); await p.waitForTimeout(200);
  check((await S(p)).crm_ad_spend[0].amount === 2000, 'Michal: spend not overwritten after cancel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // David: Ctrl+Z runs the latest undo
  await p.goto(URL + '#/tasks'); await p.waitForTimeout(300);
  const t0 = (await S(p)).crm_tasks.find((t) => t.status === 'open');
  await p.click(`.task-check[data-id="${t0.id}"]`); await p.waitForTimeout(300);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  check((await S(p)).crm_tasks.find((t) => t.id === t0.id).status === 'open', 'David: Ctrl+Z undoes the last action');
  // Yossi: CSV import with Hebrew headers, a duplicate and an Israeli date
  await p.goto(URL + '#/settings'); await p.waitForTimeout(300);
  const csv = '﻿שם מלא,טלפון,מקור,תאריך פנייה\r\nרינה כהן,052-3333333,הפניה,03/08/2026\r\nאבי בדיקה,050-1111111,גוגל,01/08/2026\r\nדוד לוי,054-4444444,פייסבוק ממומן,15/07/2026\r\n,,,\r\n';
  fs.writeFileSync(require('os').tmpdir() + '/hgos-import.csv', csv);
  await p.setInputFiles('[data-import-file]', require('os').tmpdir() + '/hgos-import.csv');
  await p.waitForSelector('.import-form');
  check((await p.locator('.import-form .notice').innerText()).includes('2'), 'Yossi: import preview counts 2 new leads (duplicate and empty row skipped)');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(600);
  r = await S(p);
  const rina = r.crm_contacts.find((c) => c.first_name === 'רינה');
  const david = r.crm_contacts.find((c) => c.first_name === 'דוד');
  const src = (id) => r.crm_sources.find((s) => s.id === id)?.key;
  check(rina && src(rina.first_source_id) === 'referral' && rina.created_at.startsWith('2026-08-03'), 'Yossi: imported lead gets matched source and its own date');
  check(david && src(david.first_source_id) === 'meta_ads', 'Yossi: "פייסבוק ממומן" matched to Meta Ads');
  check(!p.errs.length, `no console errors (${p.errs.join(' | ')})`);
  await p.context().close();

  // ---------- phones: no horizontal overflow, settings reachable ----------
  for (const dev of ['iPhone 13', 'Galaxy S9+']) {
    p = await fresh(b, { ...devices[dev] }, true);
    for (const route of ['sources', 'today', 'leads', 'deals']) {
      await p.goto(URL + '#/' + route); await p.waitForTimeout(400);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(ov <= 1, `${dev} ${route}: no horizontal overflow (${ov}px)`);
    }
    await p.goto(URL + '#/leads'); await p.waitForTimeout(300);
    await p.click('tbody tr:first-child a.prim'); await p.waitForTimeout(300);
    await p.click('.quick-bar [data-act="log"]'); await p.waitForTimeout(300);
    const dlg = await p.evaluate(() => { const b = document.querySelector('.ov-body'); return b.scrollWidth - b.clientWidth; });
    check(dlg <= 1, `${dev}: log dialog fits the screen (${dlg}px)`);
    await p.screenshot({ path: require('os').tmpdir() + `/panel-${dev.replace(/\W/g, '')}-log.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check(await p.locator('.top-settings:visible').count() === 1, `${dev}: settings reachable from the top bar`);
    await p.goto(URL + '#/today'); await p.waitForTimeout(300);
    const listTop = await p.evaluate(() => document.querySelector('.act-list, .today-grid').getBoundingClientRect().top);
    const kpiTop = await p.evaluate(() => document.querySelector('.today-kpis').getBoundingClientRect().top);
    check(listTop < kpiTop, `${dev}: My Day shows the to-do list before the numbers`);
    await p.screenshot({ path: require('os').tmpdir() + `/panel-${dev.replace(/\W/g, '')}-today.png` });
    await p.context().close();
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
