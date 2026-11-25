\i tests/sql/_users.psql
\echo '== purchase request: checks, approval, coverage'
-- state from 10: site A cement 28, site B cement 80, warehouse cement 95

begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select public.request_save(jsonb_build_object('org_id', :'org', 'site_id', :'SA', 'urgency', 'high', 'reason', 'יציקת רצפה',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 40, 'est_unit_price', 11)))) ->> 'id' as req \gset
select (select id from public.request_lines where request_id = :'req') as rl \gset
select public.request_check(:'req') as chk \gset
select tst.ok((:'chk'::jsonb #>> '{lines,0,local_available}')::numeric = 28, 'check: 28 available locally');
select tst.ok(jsonb_array_length(:'chk'::jsonb #> '{lines,0,other_sites}') = 2, 'check: surplus at two other sites');
select tst.ok((:'chk'::jsonb #>> '{lines,0,other_sites,0,surplus}')::numeric = 85, 'check: warehouse surplus 95 - min 10 = 85');
select tst.ok((:'chk'::jsonb #>> '{budgets,0,available}')::numeric = 30000, 'check: budget of A fully available');
select public.request_submit(:'req');
select tst.err(format($$select public.request_decide(%L, 'approve')$$, :'req'), 'SOD_CREATOR', 'requester cannot approve own request');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMB';
select tst.err(format($$select public.request_decide(%L, 'approve')$$, :'req'), 'SITE_FORBIDDEN', 'site manager of B cannot approve a request of A');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'PM';
select tst.ok(exists (select 1 from public.my_approvals(:'org') where doc_id = :'req'), 'request is in the procurement manager inbox');
select public.request_decide(:'req', 'approve', 'מאושר');
select tst.ok((select status from public.requests where id = :'req') = 'approved', 'request approved');
commit;

-- cover it: 20 from local stock, 10 by transfer from B, 10 by purchase
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select public.request_reserve(:'rl', 20);
select tst.ok((select reserved from public.stock_balances where site_id = :'SA' and item_id = :'CEM') = 20, '20 held at A');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'issue', 9, 'x')$$, :'org', :'SA', :'CEM'), 'STOCK_RESERVED', 'held stock cannot be issued to someone else');
select tst.ok((select status from public.requests where id = :'req') = 'in_progress', 'request in progress');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select public.transfer_create(:'org', :'SB', :'SA', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 10, 'request_line_id', :'rl'))) ->> 'id' as tr \gset
select tst.err(format($$select public.transfer_create(%L, %L, %L, jsonb_build_array(jsonb_build_object('item_id', %L, 'qty', 11, 'request_line_id', %L)))$$, :'org', :'SW', :'SA', :'CEM', :'rl'), 'REQUEST_OVER_COVERED', 'cannot cover a request twice');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_from_request(:'req', :'S1') ->> 'id' as po0 \gset
select tst.ok((select qty from public.po_lines where po_id = :'po0') = 10, 'order from request takes the remaining 10');
select tst.ok((select unit_price from public.po_lines where po_id = :'po0') = 11, 'no price history: the estimate is used');
select tst.err(format($$select public.po_from_request(%L, %L)$$, :'req', :'S2'), 'NOTHING_TO_ORDER', 'nothing left to order');
select tst.ok((select status from public.requests where id = :'req') = 'fulfilled', 'request fully covered');
commit;

\echo '== order totals'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S1', 'site_id', :'SA', 'order_discount', 7.5, 'shipping_cost', 30,
  'lines', jsonb_build_array(
    jsonb_build_object('item_id', :'CEM', 'qty', 3, 'unit_price', 33.3333, 'discount_pct', 10),
    jsonb_build_object('item_id', :'GLV', 'qty', 7, 'unit_price', 12.5)))) as r \gset
select tst.ok((:'r'::jsonb ->> 'net_total')::numeric = 200.00, 'net = 90.00 + 87.50 - 7.50 + 30 = 200.00');
select tst.ok((:'r'::jsonb ->> 'vat_amount')::numeric = 36.00, 'VAT 18% = 36.00');
select tst.ok((:'r'::jsonb ->> 'total')::numeric = 236.00, 'total = 236.00');
select :'r'::jsonb ->> 'id' as po1 \gset
select tst.err(format($$select public.po_save(jsonb_build_object('id', %L, 'org_id', %L, 'supplier_id', %L, 'site_id', %L, 'order_discount', 500, 'lines', jsonb_build_array(jsonb_build_object('item_id', %L, 'qty', 1, 'unit_price', 10))))$$, :'po1', :'org', :'S1', :'SA', :'CEM'), 'DISCOUNT_TOO_BIG', 'discount larger than the order is refused');
select tst.err(format($$select public.po_save(jsonb_build_object('org_id', %L, 'supplier_id', %L, 'site_id', %L, 'lines', jsonb_build_array(jsonb_build_object('item_id', %L, 'qty', -1, 'unit_price', 10))))$$, :'org', :'S1', :'SA', :'CEM'), 'BAD_QTY', 'negative quantity refused');
commit;

\echo '== approval bands: up to 2,000 site manager'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_submit(:'po1');
select tst.err(format($$select public.po_decide(%L, 'approve')$$, :'po1'), 'FORBIDDEN:po.approve', 'a buyer cannot approve');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'ADMIN';
select public.member_update(:'org', :'SMA', 'site_manager', false, array[:'SA'::uuid], 100, true);
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select tst.err(format($$select public.po_decide(%L, 'approve')$$, :'po1'), 'OVER_APPROVAL_LIMIT', 'personal approval limit enforced');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'ADMIN';
select public.member_update(:'org', :'SMA', 'site_manager', false, array[:'SA'::uuid], null, true);
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select tst.ok((select result from (select public.po_decide(:'po1', 'approve') ->> 'result' as result) x) = 'approved_all', 'site manager approves 200');
select tst.ok((select status from public.purchase_orders where id = :'po1') = 'approved', 'order approved');
commit;

\echo '== 2,000 – 10,000: procurement manager; creator cannot approve'
begin; set local role authenticated; set local request.jwt.claim.sub = :'PM';
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S2', 'site_id', :'SA',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'GLV', 'qty', 500, 'unit_price', 10)))) ->> 'id' as po2 \gset
select public.po_submit(:'po2');
select tst.ok((select required_role from public.approvals where doc_id = :'po2' and status = 'pending') = 'procurement_manager', 'routed to procurement manager');
select tst.err(format($$select public.po_decide(%L, 'approve')$$, :'po2'), 'SOD_CREATOR', 'creator cannot approve own order');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select tst.err(format($$select public.po_decide(%L, 'approve')$$, :'po2'), 'FORBIDDEN:approval', 'site manager cannot fill a procurement-manager step');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'CEO';
select public.po_decide(:'po2', 'approve');
select tst.ok((select status from public.purchase_orders where id = :'po2') = 'approved', 'CEO can approve any step');
commit;

\echo '== above 10,000 and over budget: procurement manager then CFO, with a comment'
-- budget of A: 30,000. Approved so far: 200 + 5,000 = 5,200 committed. A 26,000 order breaks it.
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S1', 'site_id', :'SA',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'GEN', 'qty', 1, 'unit_price', 26000)))) ->> 'id' as po3 \gset
select public.po_submit(:'po3') as sub \gset
select tst.ok((:'sub'::jsonb ->> 'over_budget')::boolean, 'over budget detected at submit');
select tst.ok((:'sub'::jsonb #>> '{budgets,0,available}')::numeric = 24800, 'available before this order: 30,000 - 5,200');
select tst.ok((select count(*) from public.approvals where doc_id = :'po3' and status = 'pending') = 2, 'two steps');
select tst.ok((select reason from public.approvals where doc_id = :'po3' and required_role = 'cfo') = 'over_budget', 'CFO step marked over budget');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'CFO';
select tst.err(format($$select public.po_decide(%L, 'approve')$$, :'po3'), 'FORBIDDEN:approval', 'CFO cannot skip the first step');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'CEO';
select public.po_decide(:'po3', 'approve');
select tst.err(format($$select public.po_decide(%L, 'approve', 'ok')$$, :'po3'), 'SOD_SAME_APPROVER', 'one person cannot approve two steps');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'CFO';
select tst.err(format($$select public.po_decide(%L, 'approve')$$, :'po3'), 'COMMENT_REQUIRED', 'over-budget approval needs a comment');
select public.po_decide(:'po3', 'approve', 'מאושר מתקציב רזרבה');
select tst.ok((select status from public.purchase_orders where id = :'po3') = 'approved', 'approved after both steps');
select tst.ok((select available from public.budget_figures(:'BUDA')) = -1200, 'budget now 1,200 over');
select tst.ok((select committed from public.budget_figures(:'BUDA')) = 31200, 'committed = 200 + 5,000 + 26,000');
commit;

\echo '== rejection, revision and re-approval'
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_save(jsonb_build_object('org_id', :'org', 'supplier_id', :'S3', 'site_id', :'SB',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 10, 'unit_price', 15)))) ->> 'id' as po4 \gset
select public.po_submit(:'po4');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMB';
select tst.err(format($$select public.po_decide(%L, 'reject')$$, :'po4'), 'COMMENT_REQUIRED', 'rejection needs a reason');
select public.po_decide(:'po4', 'reject', 'מחיר גבוה');
select tst.ok((select status from public.purchase_orders where id = :'po4') = 'rejected', 'rejected');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'BUYER';
select public.po_revise(:'po4', 'מחיר עודכן');
select public.po_save(jsonb_build_object('id', :'po4', 'org_id', :'org', 'supplier_id', :'S3', 'site_id', :'SB',
  'lines', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'qty', 10, 'unit_price', 12))));
select public.po_submit(:'po4');
select tst.ok((select revision from public.purchase_orders where id = :'po4') = 1, 'revision 1');
select tst.ok((select count(*) from public.approvals where doc_id = :'po4' and revision = 1 and status = 'pending') = 1, 'new approval for the new revision');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMB';
select public.po_decide(:'po4', 'approve');
select tst.ok((select status from public.purchase_orders where id = :'po4') = 'approved', 'revision approved');
commit;

\echo '== approval-rule configuration is validated'
begin; set local role authenticated; set local request.jwt.claim.sub = :'ADMIN';
select tst.err(format($$select public.approval_rules_replace(%L, 'po', '[{"min_amount":0,"max_amount":1000,"step":1,"required_role":"site_manager"},{"min_amount":2000,"max_amount":null,"step":1,"required_role":"cfo"}]')$$, :'org'), 'RULES_GAP', 'a gap between bands is refused');
select tst.err(format($$select public.approval_rules_replace(%L, 'po', '[{"min_amount":0,"max_amount":1000,"step":1,"required_role":"site_manager"}]')$$, :'org'), 'RULES_NOT_OPEN_ENDED', 'bands must cover any amount');
select tst.err(format($$select public.member_update(%L, %L, 'viewer', true, '{}', null, true)$$, :'org', :'ADMIN'), 'LAST_SUPER_ADMIN', 'cannot demote the last super admin');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'PM';
select tst.err(format($$select public.approval_rules_replace(%L, 'po', '[]')$$, :'org'), 'FORBIDDEN:settings.manage', 'procurement manager cannot change approval rules');
select tst.err(format($$select public.settings_update(%L, '{"enforce_sod": false}')$$, :'org'), 'FORBIDDEN:settings.manage', 'nor switch off segregation of duties');
commit;
