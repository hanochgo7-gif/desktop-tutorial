const { chromium, devices } = require('playwright');
const fs = require('fs');
const SHOTS = process.argv[2] || require('os').tmpdir();
const URL = process.env.HGOS_URL || process.argv[2] || 'http://localhost:8765/crm/';
const log = (...a) => console.log('•', ...a);
let fails = 0;
const check = (cond, msg) => { if (cond) log('PASS', msg); else { fails++; log('FAIL', msg); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.click('[data-trial]');
  await p.click('.ov-foot .btn-primary'); // start working (empty)
  await p.waitForSelector('.page-head h1');
  check(await p.locator('text=אין משימות פתוחות להיום').count() === 1, 'empty My Day invites first action');

  // 1. new lead with source + first follow-up
  await p.click('[data-top="lead"]');
  await p.fill('.ov [name=first_name]', 'דנה');
  await p.fill('.ov [name=last_name]', 'ישראלי');
  await p.fill('.ov [name=phone]', '052-555-1234');
  await p.fill('.ov [name=email]', 'Dana@Example.co.il');
  await p.fill('.ov [name=company_name]', 'סטודיו דנה');
  await p.selectOption('.ov [name=first_source_id]', { label: 'Google Ads – ממודעה ממומנת' });
  await p.fill('.ov [name=need]', 'אתר תדמית');
  await p.click('.ov details.more-fields summary');
  await p.fill('.ov [name=budget_estimate]', '12000');
  await p.click('.ov-foot .btn-primary');
  await p.waitForURL(/#\/c\//);
  await p.waitForTimeout(300);
  const cid = p.url().split('/c/')[1];
  let st = await p.evaluate(() => ({ c: window.__store.all('crm_contacts')[0], t: window.__store.all('crm_tasks') }));
  check(st.c.email === 'dana@example.co.il', 'email normalised to lowercase');
  check(st.c.phone_norm === '0525551234', 'phone normalised for duplicate detection');
  check(!!st.c.first_source_id && st.c.last_source_id === st.c.first_source_id && !!st.c.first_touch_at, 'first + last source and first touch set');
  check(st.t.length === 1 && st.t[0].status === 'open', 'first follow-up task created automatically');

  // 2. log a call + next step: due task gets completed, new follow-up created, status moves
  await p.click('[data-act="log"][data-type="call"]');
  await p.fill('.ov [name=body]', 'מחפשת אתר עם 5 עמודים, תקציב 12 אלף, רוצה עד סוף החודש');
  await p.selectOption('.ov [name=_status]', 'qualified');
  check(await p.locator('.ov [name=_done_task]:checked').count() === 1, 'log dialog shows the due task to complete (ticked, visible)');
  await p.click('.ov [data-quick] button:has-text("עוד 3 ימים")');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(400);
  st = await p.evaluate(() => ({ c: window.__store.all('crm_contacts')[0], t: window.__store.all('crm_tasks'), a: window.__store.all('crm_activities') }));
  check(st.a.length === 1 && st.a[0].type === 'call', 'call logged');
  check(st.t.filter((t) => t.status === 'done').length === 1 && st.t.filter((t) => t.status === 'open').length === 1, 'due task completed, next follow-up open');
  check(st.c.lead_status === 'qualified' && st.c.lifecycle === 'qualified', 'lead marked qualified');

  // 2b. edit a task after it was scheduled: from My Day (pencil), quick date, status, delete + undo
  await p.goto(URL + '#/tasks');
  await p.waitForTimeout(300);
  check(await p.locator('.task-edit').count() >= 1, 'tasks page: every task row has an edit button');
  await p.goto(URL + '#/today');
  await p.waitForTimeout(300);
  const editBtn = p.locator('.task-edit').first();
  check(await editBtn.count() === 1, 'My Day: edit button on upcoming task');
  await editBtn.click();
  await p.fill('.ov [name=title]', 'שיחת המשך – לשלוח דוגמאות');
  await p.click('.ov [data-quick] button:has-text("שבוע")');
  await p.selectOption('.ov [name=priority]', 'high');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(300);
  let tk = await p.evaluate(() => window.__store.all('crm_tasks').find((t) => t.status === 'open'));
  const days = Math.round((new Date(tk.due_at) - Date.now()) / 864e5);
  check(tk.title === 'שיחת המשך – לשלוח דוגמאות' && tk.priority === 'high' && days >= 6 && days <= 7, `task edited: title, priority, due in a week (${days}d)`);
  await p.goto(URL + '#/c/' + cid);
  await p.waitForTimeout(300);
  await p.click('.next-card .task-edit');
  await p.selectOption('.ov [name=status]', 'canceled');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(300);
  check((await p.evaluate((id) => window.__store.get('crm_tasks', id).status, tk.id)) === 'canceled', 'task canceled from the edit dialog');
  check(await p.locator('.next-card.missing').count() === 1, 'lead page now warns: no next step');
  await p.goto(URL + '#/tasks');
  await p.waitForTimeout(200);
  await p.evaluate((id) => window.__store.update('crm_tasks', id, { status: 'open' }), tk.id);
  await p.waitForTimeout(200);
  await p.click(`.task-edit[data-id="${tk.id}"]`);
  await p.click('.ov-foot button:has-text("מחיקה")');
  await p.waitForTimeout(300);
  check(!(await p.evaluate((id) => window.__store.get('crm_tasks', id), tk.id)), 'task deleted from the edit dialog');
  await p.click('.toast:last-child .toast-act');
  await p.waitForTimeout(300);
  check((await p.evaluate((id) => window.__store.get('crm_tasks', id)?.status, tk.id)) === 'open', 'undo brings the deleted task back');
  await p.reload();
  await p.waitForTimeout(500);
  check((await p.evaluate((id) => window.__store.get('crm_tasks', id)?.title, tk.id)) === 'שיחת המשך – לשלוח דוגמאות', 'task edits persist after reload');

  // 3. duplicate warning: same phone in another format
  await p.click('[data-top="lead"]');
  await p.fill('.ov [name=first_name]', 'דנה כפולה');
  await p.fill('.ov [name=phone]', '+972 52-555-1234');
  await p.locator('.ov [name=email]').focus();
  await p.waitForTimeout(150);
  check(await p.locator('.ov [data-dup]:not([hidden])').count() === 1, 'duplicate warning shown for same phone in +972 format');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => window.__store.all('crm_contacts').length) === 1, 'first save blocked on duplicate');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);

  // 4. deal: create, move stage, win with partial payment + cost
  await p.goto(URL + '#/c/' + cid);
  await p.waitForTimeout(200);
  await p.click('.quick-bar [data-act="deal"]');
  await p.selectOption('.ov [name=service_type]', 'אתר תדמית');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(300);
  let d = await p.evaluate(() => window.__store.all('crm_deals')[0]);
  check(d && d.amount_expected === 12000 && d.outcome === 'open', 'deal created with budget as expected amount');
  check(d.source_id === st.c.first_source_id, 'deal froze the lead\'s original source');
  check(await p.evaluate(() => window.__store.all('crm_contacts')[0].lifecycle) === 'opportunity', 'lead became opportunity');
  await p.goto(URL + '#/d/' + d.id);
  await p.waitForTimeout(200);
  await p.click('.stage-path button:has-text("הצעת מחיר נשלחה")');
  await p.waitForTimeout(250);
  d = await p.evaluate(() => window.__store.all('crm_deals')[0]);
  check(d.stage_id && (await p.evaluate(() => window.__store.all('crm_deal_stage_history').length)) === 2, 'stage change recorded in history');
  await p.click('.quick-bar button:has-text("נסגר בהצלחה")');
  await p.fill('.ov [name=amount_final]', '11500');
  await p.fill('.ov [name=_paid]', '5000');
  await p.uncheck('.ov [name=_paid_vat]'); // this amount is before VAT
  await p.fill('.ov [name=direct_cost_estimate]', '2000');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(300);
  d = await p.evaluate(() => window.__store.all('crm_deals')[0]);
  check(d.outcome === 'won' && d.amount_final === 11500 && d.amount_paid === 5000 && !!d.paid_at && !!d.closed_at, 'won: final amount, paid amount/date, closed date saved');
  check(await p.evaluate(() => window.__store.all('crm_contacts')[0].lifecycle) === 'customer', 'contact became customer');
  await p.screenshot({ path: SHOTS + '/a-deal-won.png', fullPage: true });

  // 5. reload: everything persists; reports reflect the sale
  await p.reload();
  await p.waitForTimeout(600);
  st = await p.evaluate(() => ({ n: window.__store.all('crm_contacts').length, d: window.__store.all('crm_deals')[0], a: window.__store.all('crm_activities').length }));
  check(st.n === 1 && st.d.amount_paid === 5000 && st.a === 1, 'data persists after reload');
  await p.goto(URL + '#/sources?p=this_month');
  await p.waitForTimeout(400);
  const gRow = p.locator('tr', { hasText: 'Google Ads' }).first();
  const rowText = await gRow.innerText();
  check(/11,500/.test(rowText) && /5,000/.test(rowText), 'sources report: Google Ads shows 11,500 closed and 5,000 collected');
  await p.screenshot({ path: SHOTS + '/a-sources.png', fullPage: true });
  // unpaid balance visible on deal
  await p.goto(URL + '#/d/' + st.d.id);
  await p.waitForTimeout(200);
  check((await p.locator('text=יתרה לגבייה').locator('..').innerText()).includes('6,500'), 'deal shows 6,500 still to collect');

  // 6. backup download, accidental delete, restore from file
  await p.goto(URL + '#/settings');
  await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="backup"]')]);
  const file = SHOTS + '/backup.json';
  await dl.saveAs(file);
  check(JSON.parse(fs.readFileSync(file, 'utf8')).rows.crm_contacts.length === 1, 'backup file contains the data');
  await p.goto(URL + '#/c/' + cid);
  await p.waitForTimeout(200);
  await p.click('[data-act="more"]');
  await p.click('.menu-item:has-text("מחיקת הליד")');
  await p.click('.ov-foot .btn-danger');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => window.__store.all('crm_contacts').length) === 0, 'lead deleted');
  check(await p.evaluate(() => window.__store.all('crm_deals').length) === 1, 'deal kept in reports after lead delete');
  await p.goto(URL + '#/settings');
  await p.waitForTimeout(300);
  await p.setInputFiles('[data-restore-file]', file);
  await p.waitForSelector('.ov-foot .btn-danger');
  const [pre] = await Promise.all([p.waitForEvent('download'), p.click('.ov-foot .btn-danger')]);
  check(!!pre, 'safety backup downloaded before restore');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => window.__store.all('crm_contacts').length) === 1, 'restore brought the lead back');
  // corrupted file is rejected
  fs.writeFileSync(SHOTS + '/bad.json', '{"app":"other"}');
  await p.goto(URL + '#/settings');
  await p.waitForTimeout(300);
  await p.setInputFiles('[data-restore-file]', SHOTS + '/bad.json');
  await p.waitForTimeout(300);
  check(await p.locator('.toast', { hasText: 'אינו גיבוי' }).count() >= 1, 'corrupted backup rejected with a clear message');
  check(await p.evaluate(() => window.__store.all('crm_contacts').length) === 1, 'data untouched after bad restore');

  // 7. validation: empty lead and bad email
  await p.click('[data-top="lead"]');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(150);
  check(await p.locator('.ov .field-err').count() >= 1, 'empty lead rejected with field error');
  await p.fill('.ov [name=first_name]', 'בדיקה');
  await p.fill('.ov [name=email]', 'not-an-email');
  await p.click('.ov-foot .btn-primary');
  await p.waitForTimeout(150);
  check(await p.locator('.ov .field-err', { hasText: 'אימייל' }).count() === 1, 'invalid email rejected');
  await p.keyboard.press('Escape');

  // 8. mobile
  const m = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
  await m.addInitScript((data) => { localStorage.setItem('hgos-mode', 'local'); localStorage.setItem('hgos-local-data', data); }, JSON.stringify({ rows: JSON.parse(fs.readFileSync(file, 'utf8')).rows, cursor: 99 }));
  const mp = await m.newPage();
  for (const r of ['today', 'leads', 'deals', 'sources', 'c/' + cid]) {
    await mp.goto(URL + '#/' + r);
    await mp.waitForTimeout(400);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `mobile ${r}: no horizontal page scroll (${overflow}px)`);
    await mp.screenshot({ path: `${SHOTS}/m-${r.replace('/', '-')}.png`, fullPage: true });
  }
  check(await mp.locator('.bottom-nav a').count() === 6, 'mobile bottom navigation shown');
  check(await mp.evaluate(() => [...document.querySelectorAll('.bottom-nav a')].every((a) => a.scrollWidth <= a.clientWidth + 1)), 'mobile bottom navigation labels fit');
  console.log('\nconsole errors:', errs.length ? errs.join('\n') : 'none');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
