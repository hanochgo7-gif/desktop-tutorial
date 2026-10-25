// Finance module: payment requests, recorded invoices, payments, expenses, VAT estimate, accountant export.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL = process.env.HGOS_URL || process.argv[2] || 'http://localhost:8765/crm/';
let fails = 0;
const check = (c, m) => { console.log(c ? '• PASS' : '• FAIL', m); if (!c) fails++; };
const near = (a, b) => Math.abs(Number(a) - b) < 0.01;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: 'he-IL', timezoneId: 'Asia/Jerusalem', viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.click('[data-trial]');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(400);

  // business details
  await p.goto(URL + '#/settings'); await p.waitForTimeout(300);
  await p.fill('[data-biz] [name=businessName]', 'HG בניית אתרים');
  await p.fill('[data-biz] [name=taxId]', '123456782');
  await p.fill('[data-biz] [name=bankDetails]', 'בנק לאומי 10, סניף 800, חשבון 12345');
  await p.click('[data-biz] button[type=submit]'); await p.waitForTimeout(200);
  check((await p.evaluate(() => window.__store.settings)).businessName === 'HG בניית אתרים', 'business details saved');

  // a won deal without payment
  await p.click('[data-top="lead"]');
  await p.fill('.ov [name=first_name]', 'לקוחה לחשבונית');
  await p.fill('.ov [name=phone]', '0529990000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  await p.click('.quick-bar [data-act="deal"]');
  await p.fill('.ov [name=amount_expected]', '10000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  let deal = await p.evaluate(() => window.__store.all('crm_deals')[0]);
  await p.goto(URL + '#/d/' + deal.id); await p.waitForTimeout(300);
  await p.click('.quick-bar button:has-text("נסגר בהצלחה")');
  await p.fill('.ov [name=amount_final]', '10000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);

  // payment request from the deal, prefilled, printed
  await p.click('[data-act="pr"]'); await p.waitForTimeout(200);
  check(await p.inputValue('.ov [data-k=price]') === '10000', 'payment request prefilled with the deal amount');
  check((await p.locator('.ov .doc-totals').innerText()).includes('11,800'), 'totals show 10,000 + 18% VAT = 11,800');
  await p.click('.ov-foot button:has-text("שמירה והדפסה")');
  await p.waitForURL(/#\/doc\/.+\/print/); await p.waitForTimeout(300);
  const paper = await p.locator('.paper').innerText();
  check(paper.includes('אינו חשבונית מס') && paper.includes('HG בניית אתרים') && paper.includes('11,800') && paper.includes('PR-'), 'print view: business, number, total and "not a tax invoice" note');
  check(paper.includes('בנק לאומי'), 'print view: bank details');
  await p.screenshot({ path: require('os').tmpdir() + '/fin-print.png', fullPage: true });
  let doc = await p.evaluate(() => window.__store.all('crm_documents')[0]);
  check(doc.status === 'sent' && near(doc.total, 11800) && doc.deal_id === deal.id, 'document saved as sent, linked to the deal');

  // partial payment, mirrored on the deal (before VAT)
  await p.goto(URL + '#/finance?tab=docs'); await p.waitForTimeout(300);
  await p.click(`[data-act="pay"][data-id="${doc.id}"]`);
  await p.fill('.ov [name=amount]', '20000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(200);
  check(await p.locator('.ov .field-err').count() === 1, 'payment above the balance is rejected');
  await p.fill('.ov [name=amount]', '5900');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  doc = await p.evaluate(() => window.__store.all('crm_documents')[0]);
  deal = await p.evaluate(() => window.__store.all('crm_deals')[0]);
  check(doc.status === 'partial' && near(doc.paid, 5900), 'document partially paid');
  check(near(deal.amount_paid, 5000), `payment recorded on the deal before VAT (5,900 -> ${deal.amount_paid})`);

  // record a tax invoice issued in the invoicing software; duplicate number refused
  await p.click('[data-act="new-inv"]');
  await p.selectOption('.ov [name=contact_id]', { index: 1 });
  await p.fill('.ov [name=number]', '30012');
  await p.fill('.ov [name=external_system]', 'חשבונית ירוקה');
  await p.fill('.ov [data-k=description]', 'אתר תדמית – מקדמה');
  await p.fill('.ov [data-k=price]', '5000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  check((await p.evaluate(() => window.__store.all('crm_documents').filter((x) => x.kind === 'tax_invoice').length)) === 1, 'external tax invoice recorded');
  await p.click('[data-act="new-inv"]');
  await p.selectOption('.ov [name=contact_id]', { index: 1 });
  await p.fill('.ov [name=number]', '30012');
  await p.fill('.ov [data-k=price]', '100');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  check(await p.locator('.ov .field-err', { hasText: '30012' }).count() === 1, 'duplicate invoice number refused');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  if (await p.locator('.ov .btn-danger').count()) await p.click('.ov .btn-danger');
  await p.waitForTimeout(200);

  // expense incl. VAT
  await p.goto(URL + '#/finance?tab=expenses'); await p.waitForTimeout(300);
  await p.click('[data-act="new-exp"]');
  await p.fill('.ov [name=vendor]', 'Google Workspace');
  await p.fill('.ov [name=_amount]', '1180');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  const exp = await p.evaluate(() => window.__store.all('crm_expenses')[0]);
  check(near(exp.amount, 1000) && near(exp.vat, 180), 'expense 1,180 incl. VAT stored as 1,000 + 180 input VAT');

  // overview numbers
  await p.goto(URL + '#/finance?tab=overview&p=this_month'); await p.waitForTimeout(400);
  const kp = await p.locator('.kpis').innerText();
  check(kp.includes('5,000') && kp.includes('1,000') && kp.includes('4,000'), 'overview: income 5,000, expenses 1,000, profit 4,000');
  const vatTxt = await p.locator('.panel:has-text("מע\\"מ:")').first().innerText();
  check(vatTxt.includes('900') && vatTxt.includes('180') && vatTxt.includes('720'), 'VAT estimate: 900 output - 180 input = 720');
  check((await p.locator('.kpi-btn[data-drill="owed"]').innerText()).includes('5,000'), 'receivables: 5,000 still owed on the deal (before VAT)');
  await p.screenshot({ path: require('os').tmpdir() + '/fin-overview.png', fullPage: true });

  // accountant export
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="export"]')]);
  const file = require('os').tmpdir() + '/acc.csv';
  await dl.saveAs(file);
  const csv = fs.readFileSync(file, 'utf8');
  check(csv.startsWith('﻿') && csv.includes('תקבול') && csv.includes('הוצאה') && csv.includes('Google Workspace') && csv.includes('30012'), 'accountant CSV: receipts, expenses and recorded invoices');

  // backup carries finance data and business details
  const bk = await p.evaluate(async () => (await import('./js/core/backup.js')).backupPayload(window.__store));
  check(bk.rows.crm_documents.length === 2 && bk.rows.crm_expenses.length === 1 && bk.settings.businessName === 'HG בניית אתרים', 'backup includes documents, expenses and business details');

  // phone
  const m = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
  await m.addInitScript((d) => { localStorage.setItem('hgos-mode', 'local'); localStorage.setItem('hgos-local-data', d.data); localStorage.setItem('hgos-settings', d.settings); }, { data: JSON.stringify({ rows: bk.rows, cursor: 999 }), settings: JSON.stringify(bk.settings) });
  const mp = await m.newPage();
  for (const t of ['overview', 'docs', 'expenses']) {
    await mp.goto(URL + '#/finance?tab=' + t); await mp.waitForTimeout(400);
    const ov = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(ov <= 1, `iPhone finance ${t}: no horizontal overflow (${ov}px)`);
    await mp.screenshot({ path: require('os').tmpdir() + `/fin-m-${t}.png`, fullPage: true });
  }
  check(await mp.locator('.bottom-nav a[href="#/finance"]').count() === 1, 'finance reachable from the phone navigation');
  console.log('console errors:', errs.join(' | ') || 'none');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
