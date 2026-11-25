\i tests/sql/_users.psql
\echo '== permissions and isolation'

-- opening balances by the warehouse manager (needs stock.adjust and a reason)
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'opening', 50, null, 10)$$, :'org', :'SA', :'CEM'), 'REASON_REQUIRED', 'opening needs a reason');
select public.stock_operation(:'org', :'SA', :'CEM', 'opening', 50, 'יתרת פתיחה', 10);
select public.stock_operation(:'org', :'SB', :'CEM', 'opening', 80, 'יתרת פתיחה', 12);
select public.stock_operation(:'org', :'SW', :'GLV', 'opening', 300, 'יתרת פתיחה', 8);
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'CEM') = 50, 'opening balance site A = 50');
commit;

-- site manager A: sees site A only, cannot see B, cannot adjust
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select tst.ok((select count(*) from public.sites) = 1, 'site manager A sees only site A');
select tst.ok((select count(*) from public.stock_balances where site_id = :'SB') = 0, 'site manager A cannot read site B stock');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'issue', 1, 'x')$$, :'org', :'SB', :'CEM'), 'SITE_FORBIDDEN', 'site manager A cannot issue at B');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'adjustment', 5, 'x')$$, :'org', :'SA', :'CEM'), 'FORBIDDEN:stock.adjust', 'site manager cannot adjust');
select public.stock_operation(:'org', :'SA', :'CEM', 'issue', 20, 'ליציקה');
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'CEM') = 30, 'issue 20 leaves 30');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'issue', 31, 'x')$$, :'org', :'SA', :'CEM'), 'INSUFFICIENT_STOCK', 'cannot issue more than on hand');
select tst.ok((select count(*) from public.budgets) = 1, 'site manager A sees the budget of A');
commit;

-- viewer: stock yes, money no
begin; set local role authenticated; set local request.jwt.claim.sub = :'VIEW';
select tst.ok((select count(*) from public.stock_balances) >= 3, 'viewer reads stock');
select tst.ok((select count(*) from public.suppliers) = 0, 'viewer cannot read suppliers');
select tst.ok((select count(*) from public.budgets) = 0, 'viewer cannot read budgets');
select tst.ok((select bool_and(stock_value is null) from public.stock_status(:'org')), 'viewer gets no stock value');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'issue', 1, 'x')$$, :'org', :'SA', :'CEM'), 'FORBIDDEN:stock.move', 'viewer cannot move stock');
commit;

-- nobody writes ledgers or balances directly
begin; set local role authenticated; set local request.jwt.claim.sub = :'ADMIN';
select tst.err(format($$insert into public.stock_movements(org_id, site_id, item_id, type, qty_delta, balance_after) values (%L, %L, %L, 'receipt', 1000, 1000)$$, :'org', :'SA', :'CEM'), 'permission denied', 'no direct insert into the ledger');
select tst.err($$update public.stock_balances set on_hand = 9999$$, 'permission denied', 'no direct update of balances');
select tst.err($$delete from public.audit_log$$, 'permission denied', 'no delete from audit log');
select tst.err(format($$select public.stock_apply(%L, %L, %L, 'receipt', 5)$$, :'org', :'SA', :'CEM'), 'permission denied', 'internal stock_apply is not callable');
select tst.err(format($$select public.approval_decide(%L, 'po', %L, 0, %L, 1, %L, 'approve', null)$$, :'org', :'org', :'SA', :'org'), 'permission denied', 'internal approval_decide is not callable');
commit;
-- even the owner cannot rewrite history
select tst.err($$update public.stock_movements set qty_delta = 1$$, 'APPEND_ONLY', 'ledger is append-only even for the owner');
select tst.err($$delete from public.audit_log$$, 'APPEND_ONLY', 'audit log is append-only even for the owner');

-- other organization sees nothing of org 1 and cannot touch it
begin; set local role authenticated; set local request.jwt.claim.sub = :'OTHER';
select tst.ok((select count(*) from public.items where org_id = :'org') = 0, 'other org cannot read our items');
select tst.ok((select count(*) from public.stock_balances where org_id = :'org') = 0, 'other org cannot read our stock');
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'issue', 1, 'x')$$, :'org', :'SA', :'CEM'), 'SITE_FORBIDDEN', 'other org cannot move our stock');
commit;
-- our user cannot mix an item of another org into our site
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select tst.err(format($$select public.stock_operation(%L, %L, %L, 'opening', 1, 'x', 1)$$, :'org', :'SA', :'FOREIGN_ITEM'), 'WRONG_ORG', 'foreign item rejected');
commit;

\echo '== moving average cost'
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select public.stock_operation(:'org', :'SW', :'CEM', 'opening', 50, 'יתרה', 10);
select public.stock_operation(:'org', :'SW', :'CEM', 'opening', 50, 'יתרה', 14);
select tst.ok((select avg_cost from public.stock_balances where site_id = :'SW' and item_id = :'CEM') = 12, 'average cost 50@10 + 50@14 = 12');
select public.stock_operation(:'org', :'SW', :'CEM', 'damaged', 5, 'שקים קרועים');
select tst.ok((select on_hand = 95 and damaged = 5 from public.stock_balances where site_id = :'SW' and item_id = :'CEM'), 'damaged moves 5 aside');
select public.stock_operation(:'org', :'SW', :'CEM', 'write_off_damaged', 5, 'נגרע');
select tst.ok((select on_hand = 95 and damaged = 0 from public.stock_balances where site_id = :'SW' and item_id = :'CEM'), 'write-off of damaged');
select tst.ok((select count(*) from public.stock_movements where site_id = :'SW' and item_id = :'CEM') = 4, 'every change is in the ledger');
select tst.ok((select bool_and(created_by = :'WH'::uuid) from public.stock_movements where site_id = :'SW' and item_id = :'CEM'), 'ledger records who');
commit;

\echo '== transfer between sites'
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select public.transfer_create(:'org', :'SW', :'SA', jsonb_build_array(jsonb_build_object('item_id', :'GLV', 'qty', 40)), 'לאתר א') ->> 'id' as tr1 \gset
select public.transfer_ship(:'tr1');
select tst.ok((select on_hand from public.stock_balances where site_id = :'SW' and item_id = :'GLV') = 260, 'shipping takes 40 out of the warehouse');
select tst.ok((select in_transit from public.stock_status(:'org', :'SA') where item_id = :'GLV') = 40, 'site A sees 40 in transit');
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
select tst.err(format($$select public.transfer_receive(%L, jsonb_build_array(jsonb_build_object('line_id', (select id from public.transfer_lines where transfer_id = %L), 'received_qty', 41)))$$, :'tr1', :'tr1'), 'BAD_QTY', 'cannot receive more than shipped');
select (public.transfer_receive(:'tr1', jsonb_build_array(jsonb_build_object('line_id', (select id from public.transfer_lines where transfer_id = :'tr1'), 'received_qty', 38)), 'שני זוגות חסרים')) ->> 'shortage_value' as short \gset
select tst.ok(:'short'::numeric = 16, 'shortage of 2 at cost 8 = 16');
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'GLV') = 38, 'site A received 38');
select tst.ok((select avg_cost from public.stock_balances where site_id = :'SA' and item_id = :'GLV') = 8, 'transfer carries the cost');
commit;

\echo '== stock count'
begin; set local role authenticated; set local request.jwt.claim.sub = :'WH';
select public.count_open(:'org', :'SA') ->> 'id' as cnt \gset
select tst.err(format($$select public.count_open(%L, %L)$$, :'org', :'SA'), 'COUNT_ALREADY_OPEN', 'one open count per site');
select public.count_record(:'cnt', jsonb_build_array(jsonb_build_object('item_id', :'CEM', 'counted_qty', 28), jsonb_build_object('item_id', :'GLV', 'counted_qty', 38)));
select (public.count_post(:'cnt')) ->> 'adjusted_lines' as adj \gset
select tst.ok(:'adj'::int = 1, 'only the line with a difference is adjusted');
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'CEM') = 28, 'count sets cement at A to 28');
select tst.ok((select diff_value from public.stock_count_lines where count_id = :'cnt' and item_id = :'CEM') = -20, 'count difference valued at -2 x 10');
commit;

\echo '== loans'
begin; set local role authenticated; set local request.jwt.claim.sub = :'SMA';
insert into public.employees(id, org_id, name, site_id) values ('00000000-0000-0000-0000-0000000000c9', :'org', 'יוסי', :'SA');
select public.loan_out(:'org', :'SA', :'GLV', '00000000-0000-0000-0000-0000000000c9', 4, current_date - 1) ->> 'id' as loan \gset
select tst.ok((select on_hand from public.stock_balances where site_id = :'SA' and item_id = :'GLV') = 34, 'loan takes 4 out');
select tst.err(format($$select public.loan_return(%L, 0, 0, 1, '')$$, :'loan'), 'REASON_REQUIRED', 'a loss needs a reason');
select public.loan_return(:'loan', 2, 1, 1, 'זוג אחד אבד');
select tst.ok((select on_hand = 36 and damaged = 1 from public.stock_balances where site_id = :'SA' and item_id = :'GLV'), 'return: 2 back, 1 damaged, 1 lost');
select tst.ok((select status from public.loans where id = :'loan') = 'closed', 'loan closed');
commit;
