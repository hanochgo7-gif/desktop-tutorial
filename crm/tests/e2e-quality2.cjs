// Regression tests for the code review, round 2 (money, VAT, documents, navigation, undo).
const { chromium } = require('playwright');
const URL = process.env.HGOS_URL || process.argv[2] || 'http://localhost:8765/crm/';
let fails = 0;
const check = (c, m) => { console.log(c ? '• PASS' : '• FAIL', m); if (!c) fails++; };
const near = (a, b) => Math.abs(Number(a) - b) < 0.01;
const rows = (p, t) => p.evaluate((t) => window.__store.all(t), t);

async function fresh(b) {
  const p = await (await b.newContext({ locale: 'he-IL', timezoneId: 'Asia/Jerusalem', viewport: { width: 1280, height: 860 } })).newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(URL); await p.click('[data-trial]'); await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  return p;
}
async function wonDeal(p, name, amount) {
  await p.click('[data-top="lead"]');
  await p.fill('.ov [name=first_name]', name);
  await p.fill('.ov [name=phone]', `05${Math.floor(10000000 + Math.random() * 89999999)}`);
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  await p.click('.quick-bar [data-act="deal"]');
  await p.fill('.ov [name=amount_expected]', String(amount));
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  const deal = (await rows(p, 'crm_deals')).at(-1);
  await p.goto(URL + '#/d/' + deal.id); await p.waitForTimeout(300);
  await p.click('.quick-bar button:has-text("נסגר בהצלחה")');
  await p.fill('.ov [name=amount_final]', String(amount));
  return deal;
}

(async () => {
  const b = await chromium.launch();

  // exempt business: a payment on a deal has no VAT taken off
  let p = await fresh(b);
  await p.evaluate(() => window.__store.saveSettings({ vatStatus: 'exempt' }));
  let deal = await wonDeal(p, 'נועה פטורה', 1000);
  check(await p.locator('.ov [name=_paid_vat]').count() === 0, 'exempt: no "includes VAT" checkbox when closing a deal');
  await p.fill('.ov [name=_paid]', '1000');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  deal = (await rows(p, 'crm_deals')).find((d) => d.id === deal.id);
  check(near(deal.amount_paid, 1000), `exempt: 1,000 received is 1,000 income (${deal.amount_paid})`);
  await p.close();

  // agorot: a 99.90 line prints 117.88, and paying 117.88 is accepted
  p = await fresh(b);
  deal = await wonDeal(p, 'אגורות', 100);
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(300);
  await p.click('[data-act="pr"]'); await p.waitForTimeout(200);
  await p.fill('.ov [data-k=price]', '99.9');
  await p.click('.ov-foot button:has-text("שמירה והדפסה")');
  await p.waitForURL(/#\/doc\/.+\/print/); await p.waitForTimeout(300);
  const paper = await p.locator('.paper').innerText();
  check(paper.includes('117.88') && paper.includes('99.90'), 'print shows agorot (99.90 + VAT = 117.88)');
  let doc = (await rows(p, 'crm_documents'))[0];
  await p.goto(URL + '#/finance?tab=docs'); await p.waitForTimeout(300);
  await p.click(`[data-act="pay"][data-id="${doc.id}"]`);
  await p.fill('.ov [name=amount]', '117.88');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  doc = (await rows(p, 'crm_documents'))[0];
  check(doc.status === 'paid', 'paying the printed total marks the document paid');

  // deleting that payment on the deal reopens the document
  await p.goto(URL + '#/d/' + deal.id); await p.waitForTimeout(300);
  await p.click('[data-act="money"]');
  await p.click('.ov [data-del]');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  doc = (await rows(p, 'crm_documents'))[0];
  check(doc.status === 'sent' && near(doc.paid, 0), `deleting the payment on the deal reopens the document (${doc.status}, ${doc.paid})`);

  // unlinking a paid document from its deal does not double the income
  await p.goto(URL + '#/finance?tab=docs'); await p.waitForTimeout(300);
  await p.click(`[data-act="pay"][data-id="${doc.id}"]`);
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  const income = () => p.evaluate(async () => {
    const f = await import('./js/core/finance.js');
    const now = new Date();
    return f.summary({ deals: window.__store.all('crm_deals'), documents: window.__store.all('crm_documents') }, { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) }).income;
  });
  const before = await income();
  doc = (await rows(p, 'crm_documents'))[0];
  await p.evaluate(async (id) => {
    const m = await import('./js/ui/finance-forms.js');
    m.openDocForm({ doc: window.__store.get('crm_documents', id) });
  }, doc.id);
  await p.waitForTimeout(200);
  await p.selectOption('.ov [name=deal_id]', '');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  check(near(before, 99.9) && near(await income(), 99.9), `unlinking a paid document keeps income once (${before} -> ${await income()})`);
  deal = (await rows(p, 'crm_deals')).find((d) => d.id === deal.id);
  check(near(deal.amount_paid, 0), 'the payment moved off the deal with the document');
  await p.close();

  // deleting a lead lands on the list, not on "not found"
  p = await fresh(b);
  await p.click('[data-top="lead"]');
  await p.fill('.ov [name=first_name]', 'למחיקה');
  await p.fill('.ov [name=phone]', '0501112233');
  await p.click('.ov-foot .btn-primary'); await p.waitForTimeout(400);
  await p.click('.page-head [data-act="more"], .page-head button[aria-label*="פעולות"]').catch(() => {});
  await p.click('text=מחיקת הליד');
  await p.click('.ov-foot .btn-danger'); await p.waitForTimeout(800);
  check(p.url().includes('#/leads') && !(await p.locator('text=הליד לא נמצא').count()), `after deleting a lead the list is shown (${p.url().split('#')[1]})`);

  // Ctrl+Z does not undo something whose toast is no longer on screen
  await p.evaluate(async () => {
    const m = await import('./js/ui/components.js');
    window.__undone = 0;
    m.toast('נמחק', { action: { label: 'ביטול', onClick: () => { window.__undone++; } } });
    m.toast('a'); m.toast('b');
  });
  await p.locator('body').press('Control+z');
  check(await p.evaluate(() => window.__undone) === 0, 'Ctrl+Z ignores an undo whose toast was pushed off screen');
  check(!p.errs.length, `no page errors (${p.errs.join(' | ')})`);
  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
