\i tests/sql/_users.psql
-- approved orders from 20: 200 net (A, S1), 500 gloves @10 (A, S2), generator 26,000 (A, S1), 10 cement @12 (B, S3)
select id as po1 from public.purchase_orders where net_total = 200 \gset
select id as po2 from public.purchase_orders where supplier_id = :'S2' and status = 'approved' \gset
select id as po3 from public.purchase_orders where net_total = 26000 \gset
select id as po2l from public.po_lines where po_id = :'po2' \gset
select id as po3l from public.po_lines where po_id = :'po3' \gset

\echo '== partial receipt, excess, failure mid-receipt, retry'
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select public.receipt_post(:'po2', jsonb_build_array(jsonb_build_object('po_line_id', :'po2l', 'qty_accepted', 300)), 'DN-1', 4, 5) as r \gset
select tst.ok(:'r'::jsonb ->> 'po_status' = 'partially_received', 'partial delivery: 300 of 500');
select tst.ok((:'r'::jsonb #>> '{open_lines,0,open_qty}')::numeric = 200, '200 still open');
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'GLV') = 336, 'stock rose by what arrived (36 + 300)');
select tst.err(format($$select public.receipt_post(%L, jsonb_build_array(jsonb_build_object('po_line_id', %L, 'qty_accepted', 201)))$$, :'po2', :'po2l'), 'OVER_RECEIPT', 'cannot receive more than ordered');
-- a receipt that fails on its second line changes nothing
select tst.err(format($$select public.receipt_post(%L, jsonb_build_array(jsonb_build_object('po_line_id', %L, 'qty_accepted', 50), jsonb_build_object('po_line_id', %L, 'qty_accepted', 1)))$$, :'po2', :'po2l', :'po3l'), 'LINE_NOT_ON_PO', 'failure in the middle of a receipt');
select tst.ok((select received_qty from public.po_lines where id = :'po2l') = 300, 'nothing of the failed receipt was kept');
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'GLV') = 336, 'stock unchanged after the failed receipt');
-- the same receipt sent twice (double click, network retry) is applied once
select public.receipt_post(:'po2', jsonb_build_array(jsonb_build_object('po_line_id', :'po2l', 'qty_accepted', 100)), 'DN-2', null, null, null, 'receipt-key-0001');
select tst.ok((select public.receipt_post(:'po2', jsonb_build_array(jsonb_build_object('po_line_id', :'po2l', 'qty_accepted', 100)), 'DN-2', null, null, null, 'receipt-key-0001') ->> 'replayed')::boolean, 'retry returns the first result');
select tst.ok((select received_qty from public.po_lines where id = :'po2l') = 400, 'received once: 400');
select tst.err(format($$select public.receipt_post(%L, jsonb_build_array(jsonb_build_object('po_line_id', %L, 'qty_accepted', 0, 'qty_rejected', 5)))$$, :'po2', :'po2l'), 'REASON_REQUIRED', 'rejected goods need a reason');
commit;

\echo '== cancel after approval'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select tst.err(format($$select public.po_cancel(%L, 'לא נחוץ')$$, :'po1'), 'FORBIDDEN:po.cancel', 'a buyer cannot cancel an approved order');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'PM';
select (select committed from public.budget_figures(:'BUDA')) as before_c \gset
select public.po_cancel(:'po1', 'הפרויקט נדחה');
select tst.ok((select status from public.purchase_orders where id = :'po1') = 'cancelled', 'approved order cancelled');
select tst.ok((select committed from public.budget_figures(:'BUDA')) = :'before_c'::numeric - 200, 'its commitment left the budget');
-- the partly received order: the rest is cancelled and the order closes
select public.po_cancel(:'po2', 'הספק לא יספק את היתרה');
select tst.ok((select status from public.purchase_orders where id = :'po2') = 'closed', 'partly received order closes');
select tst.ok((select cancelled_qty from public.po_lines where id = :'po2l') = 100, 'remaining 100 cancelled');
select tst.err(format($$select public.receipt_post(%L, jsonb_build_array(jsonb_build_object('po_line_id', %L, 'qty_accepted', 1)))$$, :'po2', :'po2l'), 'BAD_STATUS', 'no receipts on a closed order');
commit;

\echo '== quotes: total cost comparison and award'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.rfq_create(jsonb_build_object('org_id', :'org', 'site_id', :'SB', 'title', 'מלט וכפפות לאתר ב',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 100), jsonb_build_object('item_id', :'GLV', 'qty', 50)),
  'supplier_ids', jsonb_build_array(:'S1', :'S2', :'S3'))) ->> 'id' as rfq \gset
select id as rl1 from public.rfq_lines where rfq_id = :'rfq' and line_no = 1 \gset
select id as rl2 from public.rfq_lines where rfq_id = :'rfq' and line_no = 2 \gset
insert into public.quotes(id, org_id, rfq_id, supplier_id, delivery_days, credit_days, shipping_cost) values
  ('00000000-0000-0000-0000-0000000000f5', :'org', :'rfq', :'S1', 10, 30, 200);
insert into public.quote_lines(quote_id, rfq_line_id, unit_price) values ('00000000-0000-0000-0000-0000000000f5', :'rl1', 10), ('00000000-0000-0000-0000-0000000000f5', :'rl2', 9);
insert into public.quotes(id, org_id, rfq_id, supplier_id, delivery_days, credit_days, shipping_cost) values
  ('00000000-0000-0000-0000-0000000000f6', :'org', :'rfq', :'S2', 3, 60, 0);
insert into public.quote_lines(quote_id, rfq_line_id, unit_price) values ('00000000-0000-0000-0000-0000000000f6', :'rl1', 10.5), ('00000000-0000-0000-0000-0000000000f6', :'rl2', 8);
-- prices typed including VAT, and already expired
insert into public.quotes(id, org_id, rfq_id, supplier_id, delivery_days, credit_days, shipping_cost, prices_include_vat, valid_until) values
  ('00000000-0000-0000-0000-0000000000f7', :'org', :'rfq', :'S3', 5, 0, 100, true, current_date - 1);
insert into public.quote_lines(quote_id, rfq_line_id, unit_price) values ('00000000-0000-0000-0000-0000000000f7', :'rl1', 11.8), ('00000000-0000-0000-0000-0000000000f7', :'rl2', 9.44);
select public.rfq_compare(:'rfq') as cmp \gset
select tst.ok((select (q ->> 'net')::numeric from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S1') = 1650, 'S1 total cost 1,000 + 450 + 200 shipping = 1,650');
select tst.ok((select (q ->> 'net')::numeric from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S2') = 1450, 'S2 total cost 1,450');
select tst.ok((select (q ->> 'net')::numeric from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S3') = 1500, 'S3 prices with VAT normalised: 1,000 + 400 + 100');
select tst.ok((select not (q ->> 'valid')::boolean from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S3'), 'expired quote marked invalid');
select tst.ok((select (q ->> 'is_cheapest')::boolean and (q ->> 'is_fastest')::boolean from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S2'), 'S2 cheapest and fastest');
select tst.ok((select (q ->> 'is_recommended')::boolean from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S2'), 'S2 recommended');
select tst.ok((select (q ->> 'diff_from_cheapest')::numeric from jsonb_array_elements(:'cmp'::jsonb -> 'quotes') q where q ->> 'supplier_id' = :'S1') = 200, 'S1 is 200 more than the cheapest');
select tst.err(format($$select public.rfq_award(%L, %L)$$, :'rfq', '00000000-0000-0000-0000-0000000000f5'), 'AWARD_REASON_REQUIRED', 'choosing a dearer quote needs a reason');
select tst.err(format($$select public.rfq_award(%L, %L, 'זה זול יותר')$$, :'rfq', '00000000-0000-0000-0000-0000000000f7'), 'QUOTE_EXPIRED', 'an expired quote cannot be awarded');
select public.rfq_award(:'rfq', '00000000-0000-0000-0000-0000000000f6') as aw \gset
select :'aw'::jsonb #>> '{po,id}' as po5 \gset
select tst.ok((select net_total from public.purchase_orders where id = :'po5') = 1450, 'order created from the quote: 1,450');
select tst.ok((select credit_days from public.purchase_orders where id = :'po5') = 60, 'order carries the quote terms');
-- prices cannot change once awarded
select tst.err($$update public.quote_lines set unit_price = 1 where quote_id = '00000000-0000-0000-0000-0000000000f6'$$, 'RFQ_CLOSED', 'quote locked after award');
-- the buyer changes a price on the order: the approver is told
select public.po_save(jsonb_build_object('id', :'po5', 'org_id', :'org', 'supplier_id', :'S2', 'site_id', :'SB',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 100, 'unit_price', 11), jsonb_build_object('item_id', :'GLV', 'qty', 50, 'unit_price', 8))));
select public.po_submit(:'po5') as sub \gset
select tst.ok(exists (select 1 from jsonb_array_elements(:'sub'::jsonb -> 'warnings') w where w ->> 'kind' = 'differs_from_quote'), 'price differs from the awarded quote: flagged');
commit;

\echo '== invoices: three-way match'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.invoice_register(jsonb_build_object('org_id', :'org', 'supplier_id', :'S2', 'po_id', :'po2', 'invoice_no', 'INV-100', 'invoice_date', current_date,
  'net_amount', 4200, 'vat_amount', 756, 'lines', jsonb_build_array(jsonb_build_object('po_line_id', :'po2l', 'qty', 400, 'unit_price', 10.5)))) as inv \gset
select :'inv'::jsonb ->> 'id' as inv1 \gset
select tst.ok(:'inv'::jsonb #>> '{match,status}' = 'exception', 'price above the order: exception');
select tst.ok((select (x ->> 'amount')::numeric from jsonb_array_elements(:'inv'::jsonb #> '{match,issues}') x where x ->> 'kind' = 'price_diff') = 200, 'overcharge 400 x 0.50 = 200');
select tst.err(format($$select public.invoice_register(jsonb_build_object('org_id', %L, 'supplier_id', %L, 'po_id', %L, 'invoice_no', ' inv-100 ', 'invoice_date', current_date, 'net_amount', 1, 'vat_amount', 0, 'lines', '[{"qty":1,"unit_price":1}]'::jsonb))$$, :'org', :'S2', :'po2'), 'DUPLICATE_INVOICE', 'the same invoice number twice is refused');
select public.invoice_register(jsonb_build_object('org_id', :'org', 'supplier_id', :'S2', 'po_id', :'po2', 'invoice_no', 'INV-101', 'invoice_date', current_date,
  'net_amount', 4000, 'vat_amount', 720, 'lines', jsonb_build_array(jsonb_build_object('po_line_id', :'po2l', 'qty', 400, 'unit_price', 10)))) as inv \gset
select :'inv'::jsonb ->> 'id' as inv2 \gset
select tst.ok(exists (select 1 from jsonb_array_elements(:'inv'::jsonb #> '{match,issues}') x where x ->> 'kind' = 'qty_over_received'), 'second invoice for the same goods: billed twice');
select tst.err(format($$select public.invoice_approve(%L, 'ok')$$, :'inv2'), 'FORBIDDEN:invoices.approve_payment', 'a buyer cannot approve payment');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'CFO';
select tst.err(format($$select public.invoice_approve(%L)$$, :'inv1'), 'COMMENT_REQUIRED', 'an exception needs a comment to approve');
select public.invoice_reject(:'inv1', 'מחיר שגוי, ביקשנו זיכוי');
select tst.ok((select public.invoice_recheck(:'inv2') ->> 'status') = 'matched', 'after rejecting the wrong one, the other matches');
select (select actual from public.budget_figures(:'BUDA')) as act_before \gset
select public.invoice_approve(:'inv2');
select public.invoice_pay(:'inv2', current_date, 'העברה 123');
select tst.ok((select status from public.invoices where id = :'inv2') = 'paid', 'approved and paid');
select tst.ok((select actual from public.budget_figures(:'BUDA')) = :'act_before'::numeric, 'actual counts invoices from registration, approval does not double it');
-- registering and approving your own invoice is not allowed
select public.invoice_register(jsonb_build_object('org_id', :'org', 'supplier_id', :'S1', 'po_id', :'po3', 'invoice_no', 'G-1', 'invoice_date', current_date,
  'net_amount', 26000, 'vat_amount', 4680, 'lines', jsonb_build_array(jsonb_build_object('po_line_id', :'po3l', 'qty', 1, 'unit_price', 26000)))) ->> 'id' as inv3 \gset
select tst.ok((select status from public.invoices where id = :'inv3') = 'exception', 'invoice for goods not received: exception');
select tst.err(format($$select public.invoice_approve(%L, 'אישור מקדמה')$$, :'inv3'), 'SOD_CREATOR', 'who registered an invoice cannot approve it');
commit;

\echo '== duplicate SKU, removed user'
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select tst.err(format($$insert into public.items(org_id, sku, name) values (%L, ' cem-50 ', 'כפול')$$, :'org'), 'duplicate key', 'SKU unique regardless of case and spaces');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER2';
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S3', 'site_id', :'SA',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 5, 'unit_price', 12)))) ->> 'id' as po6 \gset
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'ADMIN';
select public.member_update(:'org', :'BUYER2', 'buyer', true, '{}', null, false);
commit;
delete from auth.users where id = :'BUYER2';
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER2';
select tst.ok((select count(*) from public.items) = 0, 'a removed user sees nothing');
select tst.err(format($$select public.po_submit(%L)$$, :'po6'), 'FORBIDDEN', 'a removed user can do nothing');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'AUD';
select tst.ok((select created_by from public.purchase_orders where id = :'po6') = :'BUYER2', 'their orders keep the author');
select tst.ok((select full_name from public.profiles where id = :'BUYER2') = 'קניין 2', 'and the name');
select tst.ok(exists (select 1 from public.audit_log where actor_id = :'BUYER2' and actor_name = 'קניין 2'), 'audit keeps who did it');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'issue', 1, 'x')$$, :'org', :'SA', :'CEM'), 'FORBIDDEN:stock.move', 'auditor reads but cannot change');
commit;

\echo '== a supplier who is late again and again'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S3', 'site_id', :'SB', 'expected_date', current_date + 5,
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'GLV', 'qty', 10, 'unit_price', 9)))) ->> 'id' as l1 \gset
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S3', 'site_id', :'SB', 'expected_date', current_date + 5,
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'GLV', 'qty', 10, 'unit_price', 9)))) ->> 'id' as l2 \gset
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S3', 'site_id', :'SB', 'expected_date', current_date + 5,
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'GLV', 'qty', 10, 'unit_price', 9)))) ->> 'id' as l3 \gset
select public.po_submit(:'l1'); select public.po_submit(:'l2'); select public.po_submit(:'l3');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMB';
select public.po_decide(:'l1', 'approve'); select public.po_decide(:'l2', 'approve'); select public.po_decide(:'l3', 'approve');
commit;
-- time passes: the expected dates are now behind us
update public.purchase_orders set expected_date = current_date - 6 where id in (:'l1', :'l2', :'l3');
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMB';
select public.receipt_post(:'l1', jsonb_build_array(jsonb_build_object('po_line_id', (select id from public.po_lines where po_id = :'l1'), 'qty_accepted', 10)), null, 3, 2);
select public.receipt_post(:'l2', jsonb_build_array(jsonb_build_object('po_line_id', (select id from public.po_lines where po_id = :'l2'), 'qty_accepted', 10)), null, 3, 2);
select tst.ok((select on_time from public.receipts where po_id = :'l1') = false, 'receipt marked late');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'PM';
select tst.ok((select late_90d from public.supplier_score(:'S3')) = 3, 'three late orders in 90 days (two received late, one still open past its date)');
select tst.ok((select on_time_pct from public.supplier_score(:'S3')) = 0, 'on-time rate 0%');
select tst.ok((select score from public.supplier_score(:'S3')) is not null, 'score computed with enough orders');
select tst.ok((select score from public.supplier_score(:'S2')) is null, 'not enough orders: no score rather than a made-up one');
select tst.ok((public.command_center(:'org') ->> 'problem_suppliers')::int >= 1, 'command center counts the problem supplier');
select tst.ok(exists (select 1 from public.alerts(:'org') where kind = 'late_delivery' and entity_id = :'l3'), 'alert for the open late order');
select tst.ok((select available from public.budget_figures(:'BUDA')) = 0, 'budget of A: 4,000 invoiced + 26,000 invoiced = fully used');
select tst.ok(exists (select 1 from public.alerts(:'org') where kind = 'budget_near'), 'alert: budget at 100%');
select tst.ok((public.command_center(:'org') ->> 'late_deliveries')::int >= 1, 'command center counts late deliveries');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select tst.ok((select count(*) from public.alerts(:'org') where site_id = :'SB') = 0, 'site manager A gets no alerts about site B');
commit;
