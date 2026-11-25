-- 009: analytics. Supplier performance score, stock status with forecast, spend, the command center and alerts,
-- and the data functions behind the procurement assistant. All read-only; all respect site scope and finance.view.

-- ---------------------------------------------------------------- supplier performance (last 12 months)
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
    -- an order counts as on time when its last receipt came by the expected date; an open order past its date counts as late
    select p.id, p.order_date,
      case when exists (select 1 from public.po_lines l where l.po_id = p.id and l.received_qty < l.qty - l.cancelled_qty) and p.expected_date < current_date then false
           when (select max(r.received_at) from public.receipts r where r.po_id = p.id) is null then null
           else (select max(r.received_at at time zone 'Asia/Jerusalem')::date from public.receipts r where r.po_id = p.id) <= p.expected_date end on_time
    from po p where p.expected_date is not null),
  lines as (select l.* from public.po_lines l join po on po.id = l.po_id),
  rec as (select r.* from public.receipts r join po on po.id = r.po_id),
  prices as (
    select public.net_unit(l.unit_price, l.discount_pct) / nullif(a.avg_price, 0) ratio
    from lines l cross join lateral (select public.item_avg_price(l.item_id) avg_price) a where a.avg_price > 0)
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
  -- quality: ratings when given, reduced by the share of rejected and returned goods
  quality_score := case when v.q_rating is null and v.defect_pct is null then null
                        else round(coalesce(v.q_rating, 100) * (1 - coalesce(v.defect_pct, 0) / 100), 1) end;
  price_score := v.price_score; on_time_pct := v.on_time_pct; fill_pct := v.fill_pct; service_score := v.service_score;
  response_pct := v.response_pct; defect_pct := v.defect_pct; orders := v.orders; measured_deliveries := v.measured; late_90d := v.late_90d;
  -- weighted average of the components that have data
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

create or replace function public.supplier_scores(p_org uuid)
returns table (supplier_id uuid, name text, status text, score numeric, price_score numeric, on_time_pct numeric, fill_pct numeric,
  quality_score numeric, service_score numeric, response_pct numeric, defect_pct numeric, orders int, late_90d int, enough_data boolean,
  spend_12m numeric, expiring_docs int)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.status, sc.score, sc.price_score, sc.on_time_pct, sc.fill_pct, sc.quality_score, sc.service_score, sc.response_pct,
         sc.defect_pct, sc.orders, sc.late_90d, sc.enough_data,
         (select coalesce(sum(p.net_total), 0) from public.purchase_orders p where p.supplier_id = s.id
            and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled') and p.order_date >= current_date - 365),
         (select count(*)::int from public.supplier_documents d where d.supplier_id = s.id and d.valid_until < current_date + 30)
  from public.suppliers s left join lateral public.supplier_score(s.id) sc on true
  where s.org_id = p_org
$$;

-- ---------------------------------------------------------------- stock status with forecast
-- Per site and item: what is there, what is coming, minimum/maximum, consumption over 90 days and when it runs out.
create or replace function public.stock_status(p_org uuid, p_site uuid default null)
returns table (site_id uuid, item_id uuid, on_hand numeric, reserved numeric, available numeric, damaged numeric, on_order numeric, in_transit numeric,
  min_qty numeric, max_qty numeric, reorder_point numeric, bin_location text, avg_cost numeric, stock_value numeric,
  daily_use numeric, days_cover numeric, stockout_date date, below_min boolean, below_reorder boolean, suggested_qty numeric, lead_time_days int)
language sql stable security invoker set search_path = '' as $$
  with keys as (
    select b.site_id, b.item_id from public.stock_balances b where b.org_id = p_org and (p_site is null or b.site_id = p_site)
    union
    select s.site_id, s.item_id from public.item_site_settings s where s.org_id = p_org and (p_site is null or s.site_id = p_site)
    union
    -- items on their way to a site that has none yet
    select t.to_site_id, tl.item_id from public.transfer_lines tl join public.transfers t on t.id = tl.transfer_id
     where t.org_id = p_org and t.status = 'shipped' and (p_site is null or t.to_site_id = p_site)
    union
    select p.site_id, l.item_id from public.po_lines l join public.purchase_orders p on p.id = l.po_id
     where p.org_id = p_org and p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')
       and (p_site is null or p.site_id = p_site)),
  base as (
    select k.site_id, k.item_id, coalesce(b.on_hand, 0) on_hand, coalesce(b.reserved, 0) reserved, coalesce(b.damaged, 0) damaged, coalesce(b.avg_cost, 0) avg_cost,
      coalesce(iss.min_qty, i.min_qty) min_qty, coalesce(iss.max_qty, i.max_qty) max_qty,
      coalesce(iss.reorder_point, i.reorder_point, iss.min_qty, i.min_qty) reorder_point, iss.bin_location, i.lead_time_days,
      (select coalesce(sum(l.qty - l.cancelled_qty - l.received_qty), 0) from public.po_lines l join public.purchase_orders p on p.id = l.po_id
        where l.item_id = k.item_id and p.site_id = k.site_id and p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')) on_order,
      (select coalesce(sum(tl.qty), 0) from public.transfer_lines tl join public.transfers t on t.id = tl.transfer_id
        where tl.item_id = k.item_id and t.to_site_id = k.site_id and t.status = 'shipped') in_transit,
      -- consumption: stock that left for use (issues, write-offs, losses), not transfers or returns
      (select coalesce(-sum(m.qty_delta), 0) / 90.0 from public.stock_movements m
        where m.site_id = k.site_id and m.item_id = k.item_id and m.type in ('issue', 'reservation_issue', 'write_off', 'damaged')
          and m.created_at >= now() - interval '90 days') daily_use
    from keys k join public.items i on i.id = k.item_id
    left join public.stock_balances b on b.site_id = k.site_id and b.item_id = k.item_id
    left join public.item_site_settings iss on iss.site_id = k.site_id and iss.item_id = k.item_id
    where public.can_see_site(p_org, k.site_id) and public.has_perm(p_org, 'stock.view'))
  select site_id, item_id, on_hand, reserved, on_hand - reserved, damaged, on_order, in_transit, min_qty, max_qty, reorder_point, bin_location,
    case when public.has_perm(p_org, 'finance.view') then avg_cost end,
    case when public.has_perm(p_org, 'finance.view') then round(on_hand * avg_cost, 2) end,
    round(daily_use, 3),
    case when daily_use > 0 then round((on_hand - reserved) / daily_use, 1) end,
    case when daily_use > 0 then current_date + floor((on_hand - reserved) / daily_use)::int end,
    min_qty is not null and on_hand - reserved < min_qty,
    reorder_point is not null and on_hand - reserved + on_order + in_transit <= reorder_point,
    -- order up to the maximum; without a maximum, cover lead time plus 30 days of use (or reach the minimum)
    greatest(0, ceil(case
      when max_qty is not null then max_qty - (on_hand - reserved + on_order + in_transit)
      when daily_use > 0 then daily_use * (coalesce(lead_time_days, 7) + 30) - (on_hand - reserved + on_order + in_transit)
      when min_qty is not null then min_qty - (on_hand - reserved + on_order + in_transit)
      else 0 end)),
    lead_time_days
  from base
$$;

-- ---------------------------------------------------------------- spend (approved order value by order date)
create or replace function public.spend_breakdown(p_org uuid, p_from date, p_to date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with l as (
    select p.order_date, p.site_id, p.supplier_id, it.category_id, l.line_net
    from public.po_lines l join public.purchase_orders p on p.id = l.po_id join public.items it on it.id = l.item_id
    where p.org_id = p_org and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled')
      and p.order_date between p_from and p_to and public.has_perm(p_org, 'finance.view'))
  select jsonb_build_object(
    'by_month', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'amount', a) order by m), '[]'::jsonb)
                 from (select to_char(order_date, 'YYYY-MM') m, sum(line_net) a from l group by 1) x),
    'by_site', (select coalesce(jsonb_agg(jsonb_build_object('site_id', site_id, 'name', s.name, 'amount', a) order by a desc), '[]'::jsonb)
                from (select site_id, sum(line_net) a from l group by 1) x join public.sites s on s.id = x.site_id),
    'by_category', (select coalesce(jsonb_agg(jsonb_build_object('category_id', category_id, 'name', coalesce(c.name, 'ללא קטגוריה'), 'amount', a) order by a desc), '[]'::jsonb)
                    from (select category_id, sum(line_net) a from l group by 1) x left join public.categories c on c.id = x.category_id),
    'by_supplier', (select coalesce(jsonb_agg(jsonb_build_object('supplier_id', supplier_id, 'name', s.name, 'amount', a) order by a desc), '[]'::jsonb)
                    from (select supplier_id, sum(line_net) a from l group by 1) x join public.suppliers s on s.id = x.supplier_id),
    'total', (select coalesce(sum(line_net), 0) from l))
$$;

-- ---------------------------------------------------------------- savings
-- Savings from quote comparison: on awarded RFQs, the highest eligible quote minus the awarded one (net).
-- Reported as "difference from the most expensive valid quote", which is how it is labelled in the app.
create or replace function public.savings_summary(p_org uuid, p_from date, p_to date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with aw as (
    select r.id, r.number, r.awarded_quote_id, public.rfq_compare(r.id) c from public.rfqs r
    where r.org_id = p_org and r.status = 'awarded' and r.awarded_at::date between p_from and p_to and public.has_perm(p_org, 'finance.view')),
  x as (
    select aw.number,
      (select (q ->> 'net')::numeric from jsonb_array_elements(aw.c -> 'quotes') q where (q ->> 'quote_id')::uuid = aw.awarded_quote_id) awarded,
      (select max((q ->> 'net')::numeric) from jsonb_array_elements(aw.c -> 'quotes') q where (q ->> 'valid')::boolean and (q ->> 'full_cover')::boolean) highest
    from aw)
  select jsonb_build_object('rfqs', count(*), 'vs_highest_quote', coalesce(sum(greatest(highest - awarded, 0)), 0)) from x
$$;

-- ---------------------------------------------------------------- command center
create or replace function public.command_center(p_org uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v jsonb; v_fin boolean := public.has_perm(p_org, 'finance.view'); v_late_thr int;
begin
  v_late_thr := coalesce((public.app_setting(p_org, 'late_supplier_threshold') #>> '{}')::int, 3);
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
    'below_min', (select count(*) from public.stock_status(p_org) s where s.below_min),
    'reorder_needed', (select count(*) from public.stock_status(p_org) s where s.below_reorder),
    'budgets_over', case when public.has_perm(p_org, 'budgets.view') then (select count(*) from public.budget_list(p_org) b where b.active and b.available < 0) end,
    'problem_suppliers', case when v_fin then (select count(*) from public.supplier_scores(p_org) s where s.status <> 'active' or s.late_90d >= v_late_thr or s.expiring_docs > 0) end,
    'invoice_exceptions', case when v_fin then (select count(*) from public.invoices where org_id = p_org and status = 'exception') end,
    'requests_to_handle', (select count(*) from public.requests where org_id = p_org and status in ('approved', 'in_progress')),
    'savings_ytd', case when v_fin then public.savings_summary(p_org, date_trunc('year', current_date)::date, current_date) end,
    'spend_12m', case when v_fin then public.spend_breakdown(p_org, (date_trunc('month', current_date) - interval '11 months')::date, current_date) end
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------- alerts (computed, never stored)
create or replace function public.alerts(p_org uuid)
returns table (kind text, severity text, title text, entity text, entity_id uuid, site_id uuid, amount numeric, detail jsonb)
language sql stable security invoker set search_path = '' as $$
  -- deliveries past their expected date
  select 'late_delivery', case when current_date - p.expected_date > 7 then 'high' else 'medium' end,
         p.number, 'po', p.id, p.site_id, case when public.has_perm(p_org, 'finance.view') then p.net_total end,
         jsonb_build_object('days_late', current_date - p.expected_date, 'supplier_id', p.supplier_id)
  from public.purchase_orders p
  where p.org_id = p_org and p.expected_date < current_date and p.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')
  union all
  -- deliveries likely to slip: expected within 3 days, supplier has a poor on-time record, not yet confirmed or shipped
  select 'delivery_at_risk', 'medium', p.number, 'po', p.id, p.site_id, null,
         jsonb_build_object('expected_date', p.expected_date, 'on_time_pct', sc.on_time_pct)
  from public.purchase_orders p cross join lateral public.supplier_score(p.supplier_id) sc
  where p.org_id = p_org and p.status in ('approved', 'sent') and p.expected_date between current_date and current_date + 3
    and sc.on_time_pct is not null and sc.on_time_pct < 70
  union all
  -- stock that will run out before a reorder could arrive
  select case when s.available <= 0 then 'stock_out' else 'stockout_soon' end, case when s.available <= 0 then 'high' else 'medium' end,
         i.name, 'item', s.item_id, s.site_id, null,
         jsonb_build_object('available', s.available, 'days_cover', s.days_cover, 'stockout_date', s.stockout_date, 'suggested_qty', s.suggested_qty)
  from public.stock_status(p_org) s join public.items i on i.id = s.item_id
  where (s.below_min or (s.days_cover is not null and s.days_cover <= coalesce(s.lead_time_days, 7) + 3)) and s.on_order + s.in_transit = 0
  union all
  select 'budget_over', 'high', b.name, 'budget', b.id, b.site_id, b.available, jsonb_build_object('used_pct', b.used_pct)
  from public.budget_list(p_org) b where b.active and b.available < 0
  union all
  select 'budget_near', 'medium', b.name, 'budget', b.id, b.site_id, b.available, jsonb_build_object('used_pct', b.used_pct)
  from public.budget_list(p_org) b where b.active and b.available >= 0 and b.used_pct >= 90
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

-- ---------------------------------------------------------------- assistant data functions
-- Every answer carries the exact source and period so the app can show where the number came from.

-- Items whose latest price rose against their previous 180-day average.
create or replace function public.price_trends(p_org uuid, p_min_pct numeric default 10)
returns table (item_id uuid, name text, sku text, last_price numeric, prev_avg numeric, change_pct numeric, last_supplier text, last_order date)
language sql stable security invoker set search_path = '' as $$
  with ln as (
    select l.item_id, p.order_date, p.supplier_id, public.net_unit(l.unit_price, l.discount_pct) price, l.qty,
           row_number() over (partition by l.item_id order by p.order_date desc, p.created_at desc) rn
    from public.po_lines l join public.purchase_orders p on p.id = l.po_id
    where p.org_id = p_org and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled') and public.has_perm(p_org, 'finance.view')),
  last as (select * from ln where rn = 1),
  prev as (select ln.item_id, sum(ln.price * ln.qty) / nullif(sum(ln.qty), 0) avg_p from ln join last on last.item_id = ln.item_id
           where ln.rn > 1 and ln.order_date >= last.order_date - 180 group by ln.item_id)
  select i.id, i.name, i.sku, last.price, round(prev.avg_p, 4), round((last.price / prev.avg_p - 1) * 100, 1), s.name, last.order_date
  from last join prev on prev.item_id = last.item_id join public.items i on i.id = last.item_id join public.suppliers s on s.id = last.supplier_id
  where prev.avg_p > 0 and (last.price / prev.avg_p - 1) * 100 >= p_min_pct
  order by 6 desc
$$;

-- Order lines priced well above the item's average: the biggest purchasing anomalies by money.
create or replace function public.spend_anomalies(p_org uuid, p_days int default 180, p_limit int default 5)
returns table (po_id uuid, po_number text, item_id uuid, item_name text, supplier text, order_date date, price numeric, avg_price numeric, excess numeric)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.number, i.id, i.name, s.name, p.order_date, public.net_unit(l.unit_price, l.discount_pct), a.v,
         round((public.net_unit(l.unit_price, l.discount_pct) - a.v) * l.qty, 2) excess
  from public.po_lines l join public.purchase_orders p on p.id = l.po_id join public.items i on i.id = l.item_id join public.suppliers s on s.id = p.supplier_id
  cross join lateral (select public.item_avg_price(l.item_id) v) a
  where p.org_id = p_org and p.status not in ('draft', 'rejected', 'cancelled') and p.order_date >= current_date - p_days
    and a.v > 0 and public.net_unit(l.unit_price, l.discount_pct) > a.v * 1.15 and public.has_perm(p_org, 'finance.view')
  order by excess desc limit p_limit
$$;

-- Consolidation: the same supplier with several draft/pending orders, or the same item needed by several sites.
create or replace function public.consolidation_opportunities(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'same_supplier', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('supplier_id', p.supplier_id, 'supplier', s.name, 'orders', jsonb_agg(p.number), 'count', count(*),
               'shipping_total', sum(p.shipping_cost), 'shipping_saving', sum(p.shipping_cost) - max(p.shipping_cost)) x
        from public.purchase_orders p join public.suppliers s on s.id = p.supplier_id
        where p.org_id = p_org and p.status in ('draft', 'pending_approval') and public.has_perm(p_org, 'finance.view')
        group by p.supplier_id, s.name having count(*) > 1) q),
    'same_item', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('item_id', l.item_id, 'item', i.name, 'requests', jsonb_agg(distinct r.number), 'sites', count(distinct r.site_id),
               'qty', sum(l.qty - l.ordered_qty - l.transfer_qty - l.reserved_qty)) x
        from public.request_lines l join public.requests r on r.id = l.request_id join public.items i on i.id = l.item_id
        where r.org_id = p_org and r.status in ('approved', 'in_progress') and l.qty > l.ordered_qty + l.transfer_qty + l.reserved_qty
        group by l.item_id, i.name having count(distinct r.id) > 1) q))
$$;

-- Best supplier for a category over the last 12 months: lowest average price index among suppliers with at least 2 orders in it.
create or replace function public.best_supplier_for_category(p_org uuid, p_category uuid)
returns table (supplier_id uuid, name text, orders int, spend numeric, price_index numeric, on_time_pct numeric, score numeric)
language sql stable security invoker set search_path = '' as $$
  with l as (
    select p.supplier_id, p.id po_id, l.line_net, public.net_unit(l.unit_price, l.discount_pct) / nullif(public.item_avg_price(l.item_id), 0) ratio
    from public.po_lines l join public.purchase_orders p on p.id = l.po_id join public.items it on it.id = l.item_id
    left join public.categories c on c.id = it.category_id
    where p.org_id = p_org and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled') and p.order_date >= current_date - 365
      and (it.category_id = p_category or c.parent_id = p_category) and public.has_perm(p_org, 'finance.view'))
  select s.id, s.name, count(distinct l.po_id)::int, sum(l.line_net), round(avg(l.ratio), 3), sc.on_time_pct, sc.score
  from l join public.suppliers s on s.id = l.supplier_id left join lateral public.supplier_score(s.id) sc on true
  group by s.id, s.name, sc.on_time_pct, sc.score
  having count(distinct l.po_id) >= 2
  order by round(avg(l.ratio), 3), sc.score desc nulls last
$$;
