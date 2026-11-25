-- 012: performance at scale (tested with 40 sites, 5,000 items, 100,000 movements: tests/perf.sh).
-- 1. Row Level Security evaluated once per query: policies compare against sets computed once (my_orgs_with, my_sites)
--    instead of calling a permission function for every row.
-- 2. stock_status computed with grouped aggregates instead of per-row subqueries.
-- 3. command_center and alerts compute stock status once and count problem suppliers without scoring each one.

-- Organizations where the current user holds a permission.
create or replace function public.my_orgs_with(p_perm text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.org_id from public.memberships m join public.profiles p on p.id = m.user_id
  join public.role_permissions rp on rp.role = m.role
  where m.user_id = (select auth.uid()) and m.active and p.deactivated_at is null and rp.perm = p_perm
$$;
-- Sites the current user can see, across organizations.
create or replace function public.my_sites()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.sites s join public.memberships m on m.org_id = s.org_id join public.profiles p on p.id = m.user_id
  where m.user_id = (select auth.uid()) and m.active and p.deactivated_at is null
    and (m.all_sites or exists (select 1 from public.membership_sites ms where ms.org_id = m.org_id and ms.user_id = m.user_id and ms.site_id = s.id))
$$;
grant execute on function public.my_orgs_with(text), public.my_sites() to authenticated;

-- ---------------------------------------------------------------- policies on the large tables
drop policy sites_select on public.sites;
create policy sites_select on public.sites for select to authenticated using (id in (select public.my_sites()));
drop policy items_select on public.items;
create policy items_select on public.items for select to authenticated using (org_id in (select public.my_orgs()));
drop policy iss_select on public.item_site_settings;
create policy iss_select on public.item_site_settings for select to authenticated using (site_id in (select public.my_sites()));
drop policy balances_select on public.stock_balances;
create policy balances_select on public.stock_balances for select to authenticated
  using (org_id in (select public.my_orgs_with('stock.view')) and site_id in (select public.my_sites()));
drop policy movements_select on public.stock_movements;
create policy movements_select on public.stock_movements for select to authenticated
  using (org_id in (select public.my_orgs_with('stock.view')) and site_id in (select public.my_sites()));
drop policy reservations_select on public.reservations;
create policy reservations_select on public.reservations for select to authenticated
  using (org_id in (select public.my_orgs_with('stock.view')) and site_id in (select public.my_sites()));
drop policy po_select on public.purchase_orders;
create policy po_select on public.purchase_orders for select to authenticated using (
  (org_id in (select public.my_orgs_with('finance.view')) or org_id in (select public.my_orgs_with('receipts.post')))
  and site_id in (select public.my_sites()));
drop policy po_lines_select on public.po_lines;
create policy po_lines_select on public.po_lines for select to authenticated using (po_id in (select p.id from public.purchase_orders p));
drop policy receipts_select on public.receipts;
create policy receipts_select on public.receipts for select to authenticated using (site_id in (select public.my_sites()));
drop policy receipt_lines_select on public.receipt_lines;
create policy receipt_lines_select on public.receipt_lines for select to authenticated using (receipt_id in (select r.id from public.receipts r));
drop policy requests_select on public.requests;
create policy requests_select on public.requests for select to authenticated using (site_id in (select public.my_sites()));
drop policy request_lines_select on public.request_lines;
create policy request_lines_select on public.request_lines for select to authenticated using (request_id in (select r.id from public.requests r));
drop policy invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (org_id in (select public.my_orgs_with('finance.view'))
  and (po_id is null and public.all_sites_member(org_id) or po_id in (select p.id from public.purchase_orders p)));
drop policy invoice_lines_select on public.invoice_lines;
create policy invoice_lines_select on public.invoice_lines for select to authenticated using (invoice_id in (select i.id from public.invoices i));
drop policy suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers for select to authenticated using (
  org_id in (select public.my_orgs_with('finance.view')) or org_id in (select public.my_orgs_with('suppliers.manage'))
  or org_id in (select public.my_orgs_with('receipts.post')));
drop policy transfer_lines_select on public.transfer_lines;
create policy transfer_lines_select on public.transfer_lines for select to authenticated using (transfer_id in (select t.id from public.transfers t));
drop policy transfers_select on public.transfers;
create policy transfers_select on public.transfers for select to authenticated using (from_site_id in (select public.my_sites()) or to_site_id in (select public.my_sites()));
drop policy categories_select on public.categories;
create policy categories_select on public.categories for select to authenticated using (org_id in (select public.my_orgs()));
drop policy item_types_select on public.item_types;
create policy item_types_select on public.item_types for select to authenticated using (org_id in (select public.my_orgs()));

create index if not exists stock_movements_use_idx on public.stock_movements(org_id, created_at) where type in ('issue', 'reservation_issue', 'write_off', 'damaged');
create index if not exists po_lines_open_idx on public.po_lines(po_id, item_id);

-- ---------------------------------------------------------------- stock status, set-based
-- Security definer with an explicit scope: checks stock.view once and limits rows to the caller's sites.
create or replace function public.stock_status(p_org uuid, p_site uuid default null)
returns table (site_id uuid, item_id uuid, on_hand numeric, reserved numeric, available numeric, damaged numeric, on_order numeric, in_transit numeric,
  min_qty numeric, max_qty numeric, reorder_point numeric, bin_location text, avg_cost numeric, stock_value numeric,
  daily_use numeric, days_cover numeric, stockout_date date, below_min boolean, below_reorder boolean, suggested_qty numeric, lead_time_days int)
language plpgsql stable security definer set search_path = '' as $$
declare v_fin boolean := public.has_perm(p_org, 'finance.view');
begin
  if not public.has_perm(p_org, 'stock.view') then return; end if;
  return query
  with vis as (select s.id from public.sites s where s.org_id = p_org and (p_site is null or s.id = p_site) and s.id in (select public.my_sites())),
  bal as (select b.site_id, b.item_id, b.on_hand, b.reserved, b.damaged, b.avg_cost from public.stock_balances b where b.org_id = p_org and b.site_id in (select id from vis)),
  iss as (select x.site_id, x.item_id, x.min_qty, x.max_qty, x.reorder_point, x.bin_location from public.item_site_settings x where x.org_id = p_org and x.site_id in (select id from vis)),
  onord as (select p.site_id, l.item_id, sum(l.qty - l.cancelled_qty - l.received_qty) q from public.po_lines l join public.purchase_orders p on p.id = l.po_id
            where p.org_id = p_org and p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received') and p.site_id in (select id from vis)
            group by 1, 2),
  intr as (select t.to_site_id site_id, tl.item_id, sum(tl.qty) q from public.transfer_lines tl join public.transfers t on t.id = tl.transfer_id
           where t.org_id = p_org and t.status = 'shipped' and t.to_site_id in (select id from vis) group by 1, 2),
  use90 as (select m.site_id, m.item_id, -sum(m.qty_delta) / 90.0 d from public.stock_movements m
            where m.org_id = p_org and m.type in ('issue', 'reservation_issue', 'write_off', 'damaged') and m.created_at >= now() - interval '90 days'
              and m.site_id in (select id from vis) group by 1, 2),
  keys as (select k.site_id, k.item_id from bal k union select k.site_id, k.item_id from iss k union select k.site_id, k.item_id from onord k union select k.site_id, k.item_id from intr k),
  base as (
    select k.site_id, k.item_id, coalesce(b.on_hand, 0) oh, coalesce(b.reserved, 0) rs, coalesce(b.damaged, 0) dm, coalesce(b.avg_cost, 0) ac,
      coalesce(i2.min_qty, i.min_qty) mn, coalesce(i2.max_qty, i.max_qty) mx, coalesce(i2.reorder_point, i.reorder_point, i2.min_qty, i.min_qty) rp,
      i2.bin_location bin, i.lead_time_days lt, coalesce(o.q, 0) oo, coalesce(t.q, 0) tr, coalesce(u.d, 0) du
    from keys k join public.items i on i.id = k.item_id
    left join bal b on b.site_id = k.site_id and b.item_id = k.item_id
    left join iss i2 on i2.site_id = k.site_id and i2.item_id = k.item_id
    left join onord o on o.site_id = k.site_id and o.item_id = k.item_id
    left join intr t on t.site_id = k.site_id and t.item_id = k.item_id
    left join use90 u on u.site_id = k.site_id and u.item_id = k.item_id)
  select x.site_id, x.item_id, x.oh, x.rs, x.oh - x.rs, x.dm, x.oo, x.tr, x.mn, x.mx, x.rp, x.bin,
    case when v_fin then x.ac end, case when v_fin then round(x.oh * x.ac, 2) end,
    round(x.du, 3),
    case when x.du > 0 then round((x.oh - x.rs) / x.du, 1) end,
    case when x.du > 0 then current_date + floor((x.oh - x.rs) / x.du)::int end,
    x.mn is not null and x.oh - x.rs < x.mn,
    x.rp is not null and x.oh - x.rs + x.oo + x.tr <= x.rp,
    greatest(0, ceil(case
      when x.mx is not null then x.mx - (x.oh - x.rs + x.oo + x.tr)
      when x.du > 0 then x.du * (coalesce(x.lt, 7) + 30) - (x.oh - x.rs + x.oo + x.tr)
      when x.mn is not null then x.mn - (x.oh - x.rs + x.oo + x.tr)
      else 0 end)),
    x.lt
  from base x;
end $$;

-- Problem suppliers counted set-based: status, expiring documents, or repeated lateness in 90 days.
create or replace function public.problem_supplier_ids(p_org uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  with thr as (select coalesce((public.app_setting(p_org, 'late_supplier_threshold') #>> '{}')::int, 3) n),
  late as (
    select p.supplier_id, count(*) n from public.purchase_orders p
    where p.org_id = p_org and p.expected_date is not null and p.order_date >= current_date - 90
      and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled')
      and ((p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received') and p.expected_date < current_date)
        or exists (select 1 from public.receipts r where r.po_id = p.id and r.on_time = false))
    group by 1)
  select s.id from public.suppliers s left join late l on l.supplier_id = s.id cross join thr
  where s.org_id = p_org and public.has_perm(p_org, 'finance.view')
    and (s.status <> 'active' or coalesce(l.n, 0) >= thr.n
         or exists (select 1 from public.supplier_documents d where d.supplier_id = s.id and d.valid_until < current_date + 30))
$$;
grant execute on function public.problem_supplier_ids(uuid) to authenticated;

create or replace function public.command_center(p_org uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v jsonb; v_fin boolean := public.has_perm(p_org, 'finance.view'); v_ss record;
begin
  select count(*) filter (where s.below_min) below_min, count(*) filter (where s.below_reorder) reorder into v_ss from public.stock_status(p_org) s;
  select jsonb_build_object(
    'sites_active', (select count(*) from public.sites where org_id = p_org and status = 'active' and kind = 'site'),
    'sites_total', (select count(*) from public.sites where org_id = p_org),
    'items', (select count(*) from public.items where org_id = p_org and status = 'active'),
    'stock_value', case when v_fin then (select coalesce(sum(b.on_hand * b.avg_cost), 0) from public.stock_balances b where b.org_id = p_org) end,
    'open_pos', (select count(*) from public.purchase_orders where org_id = p_org and status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')),
    'open_pos_value', case when v_fin then (select coalesce(sum(net_total), 0) from public.purchase_orders where org_id = p_org
                         and status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')) end,
    'pending_approval', (select count(*) from public.purchase_orders where org_id = p_org and status = 'pending_approval')
                      + (select count(*) from public.requests where org_id = p_org and status = 'submitted'),
    'my_approvals', (select count(*) from public.my_approvals(p_org)),
    'late_deliveries', (select count(*) from public.purchase_orders p where p.org_id = p_org and p.expected_date < current_date
                         and p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')),
    'below_min', v_ss.below_min,
    'reorder_needed', v_ss.reorder,
    'budgets_over', case when public.has_perm(p_org, 'budgets.view') then (select count(*) from public.budget_list(p_org) b where b.active and b.available < 0) end,
    'problem_suppliers', case when v_fin then (select count(*) from public.problem_supplier_ids(p_org)) end,
    'invoice_exceptions', case when v_fin then (select count(*) from public.invoices where org_id = p_org and status = 'exception') end,
    'requests_to_handle', (select count(*) from public.requests where org_id = p_org and status in ('approved', 'in_progress')),
    'savings_ytd', case when v_fin then public.savings_summary(p_org, date_trunc('year', current_date)::date, current_date) end,
    'spend_12m', case when v_fin then public.spend_breakdown(p_org, (date_trunc('month', current_date) - interval '11 months')::date, current_date) end
  ) into v;
  return v;
end $$;

create or replace function public.alerts(p_org uuid)
returns table (kind text, severity text, title text, entity text, entity_id uuid, site_id uuid, amount numeric, detail jsonb)
language sql stable security invoker set search_path = '' as $$
  with ss as materialized (select * from public.stock_status(p_org)),
  bl as materialized (select * from public.budget_list(p_org))
  select 'late_delivery', case when current_date - p.expected_date > 7 then 'high' else 'medium' end,
         p.number, 'po', p.id, p.site_id, case when public.has_perm(p_org, 'finance.view') then p.net_total end,
         jsonb_build_object('days_late', current_date - p.expected_date, 'supplier_id', p.supplier_id)
  from public.purchase_orders p
  where p.org_id = p_org and p.expected_date < current_date and p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')
  union all
  select 'delivery_at_risk', 'medium', p.number, 'po', p.id, p.site_id, null,
         jsonb_build_object('expected_date', p.expected_date, 'on_time_pct', sc.on_time_pct)
  from public.purchase_orders p cross join lateral public.supplier_score(p.supplier_id) sc
  where p.org_id = p_org and p.status in ('approved', 'sent') and p.expected_date between current_date and current_date + 3
    and sc.on_time_pct is not null and sc.on_time_pct < 70
  union all
  select case when s.available <= 0 then 'stock_out' else 'stockout_soon' end, case when s.available <= 0 then 'high' else 'medium' end,
         i.name, 'item', s.item_id, s.site_id, null,
         jsonb_build_object('available', s.available, 'days_cover', s.days_cover, 'stockout_date', s.stockout_date, 'suggested_qty', s.suggested_qty)
  from ss s join public.items i on i.id = s.item_id
  where (s.below_min or (s.days_cover is not null and s.days_cover <= coalesce(s.lead_time_days, 7) + 3)) and s.on_order + s.in_transit = 0
  union all
  select 'budget_over', 'high', b.name, 'budget', b.id, b.site_id, b.available, jsonb_build_object('used_pct', b.used_pct)
  from bl b where b.active and b.available < 0
  union all
  select 'budget_near', 'medium', b.name, 'budget', b.id, b.site_id, b.available, jsonb_build_object('used_pct', b.used_pct)
  from bl b where b.active and b.available >= 0 and b.used_pct >= 90
  union all
  select 'invoice_exception', 'medium', i.invoice_no, 'invoice', i.id, null, i.total, i.match_result
  from public.invoices i where i.org_id = p_org and i.status = 'exception'
  union all
  select 'supplier_doc_expiring', case when d.valid_until < current_date then 'high' else 'low' end, s.name || ': ' || d.title, 'supplier', s.id, null, null,
         jsonb_build_object('valid_until', d.valid_until, 'kind', d.kind)
  from public.supplier_documents d join public.suppliers s on s.id = d.supplier_id
  where d.org_id = p_org and d.valid_until < current_date + 30 and s.status <> 'blocked'
  union all
  select 'loan_overdue', 'low', e.name || ': ' || i.name, 'loan', l.id, l.site_id, null, jsonb_build_object('due_on', l.due_on, 'qty', l.qty - l.returned_qty - l.lost_qty)
  from public.loans l join public.employees e on e.id = l.employee_id join public.items i on i.id = l.item_id
  where l.org_id = p_org and l.status = 'open' and l.due_on < current_date
  union all
  select 'service_due', case when a.next_service_on < current_date then 'medium' else 'low' end, a.asset_tag || ' ' || i.name, 'asset', a.id, a.site_id, null,
         jsonb_build_object('next_service_on', a.next_service_on)
  from public.assets a join public.items i on i.id = a.item_id
  where a.org_id = p_org and a.status not in ('retired', 'lost') and a.next_service_on < current_date + 14
$$;

-- privileges for the functions this file (re)created
revoke execute on function public.stock_status(uuid, uuid), public.command_center(uuid), public.alerts(uuid) from public, anon;
grant execute on function public.stock_status(uuid, uuid), public.command_center(uuid), public.alerts(uuid) to authenticated;

-- ---------------------------------------------------------------- supplier score: item averages computed once per call
create or replace function public.supplier_score(p_supplier uuid)
returns table (score numeric, price_score numeric, on_time_pct numeric, fill_pct numeric, quality_score numeric, service_score numeric,
  response_pct numeric, defect_pct numeric, orders int, measured_deliveries int, late_90d int, enough_data boolean)
language plpgsql stable security definer set search_path = '' as $$
declare s public.suppliers; w jsonb; v record; v_parts numeric := 0; v_wsum numeric := 0;
begin
  select * into s from public.suppliers where id = p_supplier;
  if not found or not (public.has_perm(s.org_id, 'finance.view') or public.has_perm(s.org_id, 'suppliers.manage')) then return; end if;
  w := coalesce(public.app_setting(s.org_id, 'score_weights'), '{"price":25,"on_time":25,"fill":15,"quality":15,"service":10,"response":10}'::jsonb);
  with po as (
    select p.* from public.purchase_orders p
    where p.supplier_id = s.id and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled') and p.order_date >= current_date - 365),
  deliv as (
    select p.id, p.order_date,
      case when exists (select 1 from public.po_lines l where l.po_id = p.id and l.received_qty < l.qty - l.cancelled_qty) and p.expected_date < current_date then false
           when (select max(r.received_at) from public.receipts r where r.po_id = p.id) is null then null
           else (select max(r.received_at at time zone 'Asia/Jerusalem')::date from public.receipts r where r.po_id = p.id) <= p.expected_date end on_time
    from po p where p.expected_date is not null),
  lines as (select l.* from public.po_lines l join po on po.id = l.po_id),
  rec as (select r.* from public.receipts r join po on po.id = r.po_id),
  -- average price of each item this supplier sold, across all suppliers in the same 12 months
  avgp as (
    select l.item_id, sum(l.qty * public.net_unit(l.unit_price, l.discount_pct)) / nullif(sum(l.qty), 0) avg_price
    from public.po_lines l join public.purchase_orders p on p.id = l.po_id
    where p.org_id = s.org_id and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled') and p.order_date >= current_date - 365
      and l.item_id in (select item_id from lines)
    group by l.item_id),
  prices as (select public.net_unit(l.unit_price, l.discount_pct) / a.avg_price ratio from lines l join avgp a on a.item_id = l.item_id where a.avg_price > 0)
  select
    (select count(*) from po)::int orders,
    (select count(*) from deliv where on_time is not null)::int measured,
    (select round(100.0 * count(*) filter (where on_time) / nullif(count(*) filter (where on_time is not null), 0), 1) from deliv) on_time_pct,
    (select count(*) from deliv where on_time = false and order_date >= current_date - 90)::int late_90d,
    (select round(100.0 * sum(received_qty - returned_qty) / nullif(sum(qty - case when po.status = 'closed' then 0 else cancelled_qty end), 0), 1)
       from lines join po on po.id = lines.po_id where po.status in ('received', 'inspected', 'closed')) fill_pct,
    (select round(100.0 * (sum(rejected_qty) + sum(returned_qty)) / nullif(sum(received_qty) + sum(rejected_qty), 0), 1) from lines) defect_pct,
    (select round(avg(quality_rating) * 20, 1) from rec where quality_rating is not null) q_rating,
    (select round(avg(service_rating) * 20, 1) from rec where service_rating is not null) service_score,
    (select round(greatest(0, least(100, 100 - (avg(ratio) - 1) * 200)), 1) from prices) price_score,
    (select round(100.0 * count(q.id) / nullif(count(*), 0), 1) from public.rfq_suppliers rs join public.rfqs r on r.id = rs.rfq_id
       left join public.quotes q on q.rfq_id = rs.rfq_id and q.supplier_id = rs.supplier_id
       where rs.supplier_id = s.id and r.created_at >= now() - interval '365 days') response_pct
  into v;
  quality_score := case when v.q_rating is null and v.defect_pct is null then null
                        else round(coalesce(v.q_rating, 100) * (1 - coalesce(v.defect_pct, 0) / 100), 1) end;
  price_score := v.price_score; on_time_pct := v.on_time_pct; fill_pct := v.fill_pct; service_score := v.service_score;
  response_pct := v.response_pct; defect_pct := v.defect_pct; orders := v.orders; measured_deliveries := v.measured; late_90d := v.late_90d;
  if price_score is not null then v_parts := v_parts + price_score * (w ->> 'price')::numeric; v_wsum := v_wsum + (w ->> 'price')::numeric; end if;
  if on_time_pct is not null then v_parts := v_parts + on_time_pct * (w ->> 'on_time')::numeric; v_wsum := v_wsum + (w ->> 'on_time')::numeric; end if;
  if fill_pct is not null then v_parts := v_parts + least(fill_pct, 100) * (w ->> 'fill')::numeric; v_wsum := v_wsum + (w ->> 'fill')::numeric; end if;
  if quality_score is not null then v_parts := v_parts + quality_score * (w ->> 'quality')::numeric; v_wsum := v_wsum + (w ->> 'quality')::numeric; end if;
  if service_score is not null then v_parts := v_parts + service_score * (w ->> 'service')::numeric; v_wsum := v_wsum + (w ->> 'service')::numeric; end if;
  if response_pct is not null then v_parts := v_parts + response_pct * (w ->> 'response')::numeric; v_wsum := v_wsum + (w ->> 'response')::numeric; end if;
  enough_data := v.orders >= 3;
  score := case when enough_data and v_wsum > 0 then round(v_parts / v_wsum, 1) end;
  return next;
end $$;
revoke execute on function public.supplier_score(uuid) from public, anon;
grant execute on function public.supplier_score(uuid) to authenticated;

-- anon (not signed in) never calls any function of this system
revoke execute on all functions in schema public from anon;
