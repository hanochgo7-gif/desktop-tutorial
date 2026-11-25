-- Load test: 40 sites, 5,000 items, 100,000 movements, 6,000 order lines. Times the heavy read functions as a site manager
-- and as an org-wide user. Run on a scratch database (tests/perf.sh).
\timing off
insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000f1', 'perf@t.test'), ('00000000-0000-0000-0000-0000000000f2', 'perfsite@t.test');
insert into public.allowed_org_creators(email) values ('perf@t.test');
begin; set local role authenticated; set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select public.org_create('עומס', false) ->> 'id' as org \gset
commit;
insert into public.sites(org_id, code, name) select :'org', 'S' || g, 'אתר ' || g from generate_series(1, 40) g;
insert into public.items(org_id, sku, name, min_qty, max_qty, lead_time_days) select :'org', 'SKU-' || g, 'פריט ' || g, 5, 50, 7 from generate_series(1, 5000) g;
insert into public.suppliers(org_id, name) select :'org', 'ספק ' || g from generate_series(1, 60) g;
-- balances and a ledger as if built by the functions
insert into public.stock_balances(org_id, site_id, item_id, on_hand, avg_cost)
select :'org', s.id, i.id, (random() * 80)::int, round((random() * 200)::numeric, 2)
from (select id from public.sites where org_id = :'org') s cross join lateral (select id from public.items where org_id = :'org' order by random() limit 400) i
on conflict do nothing;
insert into public.stock_movements(org_id, site_id, item_id, type, qty_delta, unit_cost, balance_after, created_at)
select :'org', b.site_id, b.item_id, case when g % 4 = 0 then 'receipt' else 'issue' end, case when g % 4 = 0 then 10 else -1 end, b.avg_cost, b.on_hand, now() - (g % 120) * interval '1 day'
from (select site_id, item_id, avg_cost, on_hand from public.stock_balances where org_id = :'org' limit 6250) b cross join generate_series(1, 16) g;
insert into public.purchase_orders(org_id, number, supplier_id, site_id, status, order_date, expected_date, vat_rate, created_by)
select :'org', 'PO-P-' || g, (select id from public.suppliers where org_id = :'org' order by random() limit 1), (select id from public.sites where org_id = :'org' order by random() limit 1),
  (array['approved','sent','closed','closed','closed','partially_received'])[1 + g % 6], current_date - (g % 300), current_date - (g % 300) + 10, 0.18, '00000000-0000-0000-0000-0000000000f1'
from generate_series(1, 1500) g;
insert into public.po_lines(po_id, line_no, item_id, qty, unit_price, line_net, received_qty)
select p.id, n, (select id from public.items where org_id = :'org' offset (abs(hashtext(p.id::text || n)) % 5000) limit 1), 10, 50 + n, 10 * (50 + n), case when p.status = 'closed' then 10 else 0 end
from public.purchase_orders p cross join generate_series(1, 4) n where p.org_id = :'org';
update public.purchase_orders p set subtotal = x.s, net_total = x.s, total = round(x.s * 1.18, 2), vat_amount = round(x.s * .18, 2)
from (select po_id, sum(line_net) s from public.po_lines group by po_id) x where x.po_id = p.id;
insert into public.memberships(org_id, user_id, role, all_sites) values (:'org', '00000000-0000-0000-0000-0000000000f2', 'site_manager', false);
insert into public.membership_sites(org_id, user_id, site_id) select :'org', '00000000-0000-0000-0000-0000000000f2', id from public.sites where org_id = :'org' and code = 'S1';
analyze;
select count(*) as movements from public.stock_movements;
\timing on
\echo '--- org-wide user (super admin)'
begin; set local role authenticated; set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select count(*) as stock_rows from public.stock_status(:'org');
select length(public.command_center(:'org')::text) as command_center_bytes;
select count(*) as alerts from public.alerts(:'org');
select count(*) as items_page from (select id from public.items where org_id = :'org' order by name limit 100) x;
select count(*) as ledger_page from (select id from public.stock_movements where org_id = :'org' order by created_at desc limit 100) x;
select count(*) as supplier_scores from public.supplier_scores(:'org');
commit;
\echo '--- site manager (one site)'
begin; set local role authenticated; set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select count(*) as stock_rows from public.stock_status(:'org');
select length(public.command_center(:'org')::text) as command_center_bytes;
commit;
