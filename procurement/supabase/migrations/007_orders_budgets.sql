-- 007: budgets (figures and revisions), purchase orders end to end, goods receipts and supplier returns.

-- ---------------------------------------------------------------- budgets
-- Committed = approved orders not yet invoiced. Actual = invoiced (any invoice not rejected). Pending = awaiting approval.
-- Org/site budgets count whole orders (net, after order discount and shipping); category budgets count order lines.
create or replace function public.budget_figures(p_budget uuid)
returns table (id uuid, name text, amount numeric, committed numeric, actual numeric, pending numeric, available numeric, used_pct numeric)
language plpgsql stable security definer set search_path = '' as $$
declare b public.budgets; v_amount numeric; v_comm numeric := 0; v_act numeric := 0; v_pend numeric := 0;
begin
  select * into b from public.budgets x where x.id = p_budget;
  if not found then return; end if;
  if not (public.has_perm(b.org_id, 'budgets.view') or public.has_perm(b.org_id, 'requests.create') or public.has_perm(b.org_id, 'po.create'))
     or not (case when b.site_id is null then public.is_member(b.org_id) else public.can_see_site(b.org_id, b.site_id) end) then
    return;
  end if;
  v_amount := b.original_amount + coalesce((select sum(delta) from public.budget_revisions r where r.budget_id = b.id), 0);
  if b.category_id is null then
    with po as (
      select p.id, p.status, p.net_total
             - coalesce((select sum(round(l.cancelled_qty * public.net_unit(l.unit_price, l.discount_pct), 2)) from public.po_lines l where l.po_id = p.id), 0) eff,
             coalesce((select sum(i.net_amount) from public.invoices i where i.po_id = p.id and i.status <> 'rejected'), 0) inv
      from public.purchase_orders p
      where p.org_id = b.org_id and (b.site_id is null or p.site_id = b.site_id)
        and p.order_date between b.period_start and b.period_end and p.status not in ('draft', 'rejected', 'cancelled'))
    select coalesce(sum(case when status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received', 'received', 'inspected')
                             then greatest(eff - inv, 0) else 0 end), 0),
           coalesce(sum(inv), 0),
           coalesce(sum(case when status = 'pending_approval' then eff else 0 end), 0)
      into v_comm, v_act, v_pend from po;
    -- invoices with no order count against organization-wide budgets by invoice date
    if b.site_id is null then
      v_act := v_act + coalesce((select sum(i.net_amount) from public.invoices i where i.org_id = b.org_id and i.po_id is null and i.status <> 'rejected'
                                   and i.invoice_date between b.period_start and b.period_end), 0);
    end if;
  else
    with ln as (
      select p.status, round((l.qty - l.cancelled_qty) * public.net_unit(l.unit_price, l.discount_pct), 2) eff,
             coalesce((select sum(il.line_net) from public.invoice_lines il join public.invoices i on i.id = il.invoice_id
                        where il.po_line_id = l.id and i.status <> 'rejected'), 0) inv
      from public.po_lines l join public.purchase_orders p on p.id = l.po_id join public.items it on it.id = l.item_id
      left join public.categories c on c.id = it.category_id
      where p.org_id = b.org_id and (b.site_id is null or p.site_id = b.site_id)
        and p.order_date between b.period_start and b.period_end and p.status not in ('draft', 'rejected', 'cancelled')
        and (it.category_id = b.category_id or c.parent_id = b.category_id))
    select coalesce(sum(case when status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received', 'received', 'inspected')
                             then greatest(eff - inv, 0) else 0 end), 0),
           coalesce(sum(inv), 0),
           coalesce(sum(case when status = 'pending_approval' then eff else 0 end), 0)
      into v_comm, v_act, v_pend from ln;
  end if;
  return query select b.id, b.name, v_amount, v_comm, v_act, v_pend, v_amount - v_comm - v_act,
    case when v_amount > 0 then round((v_comm + v_act) * 100 / v_amount, 1) end;
end $$;

-- Budgets visible to the caller with their figures.
create or replace function public.budget_list(p_org uuid)
returns table (id uuid, name text, site_id uuid, category_id uuid, project text, department text, owner_id uuid, period_start date, period_end date,
  original_amount numeric, amount numeric, committed numeric, actual numeric, pending numeric, available numeric, used_pct numeric, active boolean)
language sql stable security invoker set search_path = '' as $$
  select b.id, b.name, b.site_id, b.category_id, b.project, b.department, b.owner_id, b.period_start, b.period_end, b.original_amount,
         f.amount, f.committed, f.actual, f.pending, f.available, f.used_pct, b.active
  from public.budgets b, lateral public.budget_figures(b.id) f
  where b.org_id = p_org
  order by b.period_start desc, b.name
$$;

-- p: {id?, org_id, name, site_id, category_id, project, department, owner_id, period_start, period_end, original_amount, active}
-- The amount of an existing budget changes only through budget_revise (so every change has a reason).
create or replace function public.budget_save(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_org uuid := (p ->> 'org_id')::uuid; v_id uuid := (p ->> 'id')::uuid; v_site uuid := (p ->> 'site_id')::uuid; v_cat uuid := (p ->> 'category_id')::uuid;
begin
  perform public.require_perm(v_org, 'budgets.manage');
  if v_site is not null and not exists (select 1 from public.sites where id = v_site and org_id = v_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  if v_cat is not null and not exists (select 1 from public.categories where id = v_cat and org_id = v_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  if v_id is null then
    if coalesce((p ->> 'original_amount')::numeric, -1) < 0 then raise exception 'BAD_AMOUNT' using errcode = '22023'; end if;
    insert into public.budgets(org_id, name, site_id, category_id, project, department, owner_id, period_start, period_end, original_amount)
    values (v_org, p ->> 'name', v_site, v_cat, p ->> 'project', p ->> 'department', (p ->> 'owner_id')::uuid,
            (p ->> 'period_start')::date, (p ->> 'period_end')::date, (p ->> 'original_amount')::numeric)
    returning id into v_id;
  else
    update public.budgets set name = p ->> 'name', site_id = v_site, category_id = v_cat, project = p ->> 'project', department = p ->> 'department',
      owner_id = (p ->> 'owner_id')::uuid, period_start = (p ->> 'period_start')::date, period_end = (p ->> 'period_end')::date,
      active = coalesce((p ->> 'active')::boolean, true)
    where id = v_id and org_id = v_org;
    if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.budget_revise(p_budget uuid, p_delta numeric, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.budgets; f record;
begin
  select * into b from public.budgets where id = p_budget for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(b.org_id, 'budgets.manage');
  if p_delta is null or p_delta = 0 then raise exception 'BAD_AMOUNT' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  select * into f from public.budget_figures(b.id);
  if f.amount + p_delta < 0 then raise exception 'BAD_AMOUNT' using errcode = '22023'; end if;
  insert into public.budget_revisions(org_id, budget_id, delta, reason) values (b.org_id, b.id, p_delta, btrim(p_reason));
  perform public.audit(b.org_id, 'rpc:budget_revise', 'budget', b.id::text, b.name || ' ' || p_delta || ': ' || p_reason);
  return jsonb_build_object('id', b.id, 'amount', f.amount + p_delta);
end $$;

-- The budgets an order falls under, with what is available before and after it.
create or replace function public.po_budget_check(p_po uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p as (select * from public.purchase_orders where id = p_po),
  hits as (
    select b.id, b.category_id,
           case when b.category_id is null then p.net_total
                else (select coalesce(sum(l.line_net), 0) from public.po_lines l join public.items it on it.id = l.item_id
                       left join public.categories c on c.id = it.category_id
                       where l.po_id = p.id and (it.category_id = b.category_id or c.parent_id = b.category_id)) end as this_amount
    from public.budgets b, p
    where b.org_id = p.org_id and b.active and (b.site_id is null or b.site_id = p.site_id)
      and p.order_date between b.period_start and b.period_end)
  select coalesce(jsonb_agg(jsonb_build_object('budget_id', h.id, 'name', f.name, 'amount', f.amount, 'available', f.available,
           'this_order', h.this_amount, 'after', f.available - h.this_amount, 'over', f.available - h.this_amount < 0)), '[]'::jsonb)
  from hits h, lateral public.budget_figures(h.id) f
  where h.this_amount > 0
$$;

-- ---------------------------------------------------------------- purchase orders
create or replace function public.po_recalc(p_po uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sub numeric; p public.purchase_orders; v_net numeric;
begin
  update public.po_lines set line_net = round(qty * unit_price * (1 - discount_pct / 100), 2) where po_id = p_po;
  select coalesce(sum(line_net), 0) into v_sub from public.po_lines where po_id = p_po;
  select * into p from public.purchase_orders where id = p_po;
  if p.order_discount > v_sub + p.shipping_cost then raise exception 'DISCOUNT_TOO_BIG' using errcode = '22023'; end if;
  v_net := v_sub - p.order_discount + p.shipping_cost;
  update public.purchase_orders set subtotal = v_sub, net_total = v_net, vat_amount = round(v_net * vat_rate, 2), total = v_net + round(v_net * vat_rate, 2)
   where id = p_po;
end $$;

-- Create or update a draft order. Totals are always computed here.
-- p: {id?, org_id, supplier_id, site_id, expected_date, payment_terms, credit_days, vat_rate?, order_discount, shipping_cost, notes, internal_notes,
--     request_id?, lines: [{item_id, description?, qty, unit_price, discount_pct?, request_line_id?}]}
create or replace function public.po_save(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_org uuid := (p ->> 'org_id')::uuid; v_id uuid := (p ->> 'id')::uuid; v_site uuid := (p ->> 'site_id')::uuid; v_sup uuid := (p ->> 'supplier_id')::uuid;
  po public.purchase_orders; l jsonb; n int := 0; v_no text; v_rl uuid; v_rls uuid[] := '{}'; s public.suppliers; x uuid;
begin
  perform public.require_perm(v_org, 'po.create');
  perform public.require_site(v_org, v_site);
  select * into s from public.suppliers where id = v_sup and org_id = v_org;
  if not found then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  if s.status = 'blocked' then raise exception 'SUPPLIER_BLOCKED' using errcode = 'P0001'; end if;
  if jsonb_array_length(coalesce(p -> 'lines', '[]')) = 0 then raise exception 'NO_LINES' using errcode = '22023'; end if;
  if v_id is not null then
    select * into po from public.purchase_orders where id = v_id for update;
    if not found or po.org_id <> v_org then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
    if po.status <> 'draft' then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
    select array_agg(request_line_id) into v_rls from public.po_lines where po_id = v_id and request_line_id is not null;
    update public.purchase_orders set supplier_id = v_sup, site_id = v_site, expected_date = (p ->> 'expected_date')::date,
      payment_terms = coalesce(p ->> 'payment_terms', s.payment_terms), credit_days = coalesce((p ->> 'credit_days')::int, s.credit_days),
      vat_rate = coalesce((p ->> 'vat_rate')::numeric, vat_rate), order_discount = coalesce((p ->> 'order_discount')::numeric, 0),
      shipping_cost = coalesce((p ->> 'shipping_cost')::numeric, 0), notes = p ->> 'notes', internal_notes = p ->> 'internal_notes',
      request_id = coalesce((p ->> 'request_id')::uuid, request_id)
    where id = v_id;
    delete from public.po_lines where po_id = v_id;
  else
    v_no := public.next_doc_no(v_org, 'PO');
    insert into public.purchase_orders(org_id, number, supplier_id, site_id, expected_date, payment_terms, credit_days, vat_rate,
      order_discount, shipping_cost, notes, internal_notes, request_id, rfq_id, quote_id)
    values (v_org, v_no, v_sup, v_site, (p ->> 'expected_date')::date, coalesce(p ->> 'payment_terms', s.payment_terms),
      coalesce((p ->> 'credit_days')::int, s.credit_days),
      coalesce((p ->> 'vat_rate')::numeric, (public.app_setting(v_org, 'vat_rate') #>> '{}')::numeric, 0.18),
      coalesce((p ->> 'order_discount')::numeric, 0), coalesce((p ->> 'shipping_cost')::numeric, 0), p ->> 'notes', p ->> 'internal_notes',
      (p ->> 'request_id')::uuid, (p ->> 'rfq_id')::uuid, (p ->> 'quote_id')::uuid)
    returning id into v_id;
  end if;
  for l in select * from jsonb_array_elements(p -> 'lines') loop
    n := n + 1;
    if not exists (select 1 from public.items where id = (l ->> 'item_id')::uuid and org_id = v_org and status <> 'discontinued') then
      raise exception 'ITEM_NOT_ORDERABLE' using errcode = '22023'; end if;
    if coalesce((l ->> 'qty')::numeric, 0) <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if coalesce((l ->> 'unit_price')::numeric, -1) < 0 then raise exception 'BAD_PRICE' using errcode = '22023'; end if;
    v_rl := (l ->> 'request_line_id')::uuid;
    if v_rl is not null and not exists (select 1 from public.request_lines rl join public.requests r on r.id = rl.request_id
         where rl.id = v_rl and r.org_id = v_org and r.status in ('approved', 'in_progress') and rl.item_id = (l ->> 'item_id')::uuid) then
      raise exception 'REQUEST_LINE_NOT_OPEN' using errcode = 'P0001';
    end if;
    insert into public.po_lines(po_id, line_no, item_id, description, qty, unit_price, discount_pct, request_line_id)
    values (v_id, n, (l ->> 'item_id')::uuid, l ->> 'description', (l ->> 'qty')::numeric, (l ->> 'unit_price')::numeric,
            coalesce((l ->> 'discount_pct')::numeric, s.fixed_discount_pct, 0), v_rl);
    if v_rl is not null then v_rls := v_rls || v_rl; end if;
  end loop;
  perform public.po_recalc(v_id);
  -- request lines covered by this order (and the ones it no longer covers) are recomputed; over-ordering raises
  foreach x in array coalesce((select array_agg(distinct u) from unnest(v_rls) u), '{}') loop
    perform public.request_line_refresh(x, true);
  end loop;
  select * into po from public.purchase_orders where id = v_id;
  return jsonb_build_object('id', v_id, 'number', po.number, 'net_total', po.net_total, 'vat_amount', po.vat_amount, 'total', po.total);
end $$;

-- Draft order from approved request lines for one supplier. Prices: the supplier's agreed price, else its last price, else the estimate.
create or replace function public.po_from_request(p_request uuid, p_supplier uuid, p_line_ids uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.requests; v_lines jsonb;
begin
  select * into r from public.requests where id = p_request;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', l.item_id, 'qty', l.qty - l.ordered_qty - l.transfer_qty - l.reserved_qty,
           'unit_price', coalesce(
             (select sp.unit_price from public.supplier_prices sp where sp.supplier_id = p_supplier and sp.item_id = l.item_id
               and current_date between sp.valid_from and coalesce(sp.valid_until, current_date) order by sp.valid_from desc limit 1),
             public.item_last_price(l.item_id, p_supplier), l.est_unit_price, 0),
           'request_line_id', l.id) order by l.line_no), '[]'::jsonb)
    into v_lines
  from public.request_lines l
  where l.request_id = r.id and l.item_id is not null and l.qty - l.ordered_qty - l.transfer_qty - l.reserved_qty > 0
    and (p_line_ids is null or l.id = any(p_line_ids));
  if jsonb_array_length(v_lines) = 0 then raise exception 'NOTHING_TO_ORDER' using errcode = 'P0001'; end if;
  return public.po_save(jsonb_build_object('org_id', r.org_id, 'supplier_id', p_supplier, 'site_id', r.site_id, 'request_id', r.id,
    'expected_date', r.needed_by, 'lines', v_lines));
end $$;

-- Warnings shown to approvers: duplicates, prices above history, a price that differs from the awarded quote.
create or replace function public.po_warnings(p_po uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p as (select * from public.purchase_orders where id = p_po),
  alert as (select coalesce((public.app_setting(p.org_id, 'price_alert_pct') #>> '{}')::numeric, 10) pct from p)
  select coalesce(jsonb_agg(w), '[]'::jsonb) from (
    -- the same item is already on another open order for the same site
    select jsonb_build_object('kind', 'duplicate_item', 'item_id', l.item_id, 'other_po', o.number, 'other_qty', ol.qty - ol.cancelled_qty - ol.received_qty) w
      from p join public.po_lines l on l.po_id = p.id
      join public.po_lines ol on ol.item_id = l.item_id and ol.po_id <> p.id
      join public.purchase_orders o on o.id = ol.po_id and o.site_id = p.site_id
     where o.status in ('pending_approval', 'approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')
       and ol.qty - ol.cancelled_qty - ol.received_qty > 0
    union all
    -- price above the last purchase price by more than the alert threshold
    select jsonb_build_object('kind', 'price_above_last', 'item_id', l.item_id, 'price', public.net_unit(l.unit_price, l.discount_pct),
             'last_price', lp.v, 'pct', round((public.net_unit(l.unit_price, l.discount_pct) / lp.v - 1) * 100, 1))
      from p join public.po_lines l on l.po_id = p.id
      cross join alert
      cross join lateral (select public.item_last_price(l.item_id) v) lp
     where lp.v > 0 and public.net_unit(l.unit_price, l.discount_pct) > lp.v * (1 + alert.pct / 100)
    union all
    -- price differs from the quote the RFQ was awarded on
    select jsonb_build_object('kind', 'differs_from_quote', 'item_id', l.item_id, 'price', public.net_unit(l.unit_price, l.discount_pct),
             'quote_price', public.net_unit(ql.unit_price, ql.discount_pct))
      from p join public.po_lines l on l.po_id = p.id
      join public.quote_lines ql on ql.quote_id = p.quote_id
      join public.rfq_lines rl on rl.id = ql.rfq_line_id and rl.item_id = l.item_id
     where ql.unit_price is not null and public.net_unit(l.unit_price, l.discount_pct) <> public.net_unit(ql.unit_price, ql.discount_pct)
    union all
    select jsonb_build_object('kind', 'supplier_on_hold', 'supplier_id', s.id) from p join public.suppliers s on s.id = p.supplier_id where s.status = 'on_hold'
    union all
    select jsonb_build_object('kind', 'no_budget') from p
     where not exists (select 1 from public.budgets b where b.org_id = p.org_id and b.active and (b.site_id is null or b.site_id = p.site_id)
                         and p.order_date between b.period_start and b.period_end)
  ) x
$$;

create or replace function public.po_submit(p_po uuid, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders; v_prev jsonb; v_budget jsonb; v_over boolean; v_warn jsonb; v_res jsonb;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(po.org_id, p_idem, 'po_submit');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(po.org_id, 'po.create');
  perform public.require_site(po.org_id, po.site_id);
  if po.status <> 'draft' then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  if not exists (select 1 from public.po_lines where po_id = po.id) then raise exception 'NO_LINES' using errcode = '22023'; end if;
  if (select status from public.suppliers where id = po.supplier_id) = 'blocked' then raise exception 'SUPPLIER_BLOCKED' using errcode = 'P0001'; end if;
  perform public.po_recalc(po.id);
  select * into po from public.purchase_orders where id = p_po;
  v_budget := public.po_budget_check(po.id);
  v_over := exists (select 1 from jsonb_array_elements(v_budget) x where (x ->> 'over')::boolean);
  v_warn := public.po_warnings(po.id);
  update public.purchase_orders set status = 'pending_approval', submitted_by = (select auth.uid()), submitted_at = now(),
    over_budget = v_over, warnings = v_warn || case when v_over then jsonb_build_array(jsonb_build_object('kind', 'over_budget', 'budgets', v_budget)) else '[]'::jsonb end
  where id = po.id;
  perform public.approvals_route(po.org_id, 'po', po.id, po.revision, po.net_total, v_over);
  v_res := jsonb_build_object('id', po.id, 'status', 'pending_approval', 'over_budget', v_over, 'budgets', v_budget, 'warnings', v_warn);
  perform public.audit(po.org_id, 'rpc:po_submit', 'po', po.id::text, po.number || ' ' || po.net_total);
  return public.idem_end(po.org_id, p_idem, v_res);
end $$;

create or replace function public.po_decide(p_po uuid, p_decision text, p_comment text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders; v_prev jsonb; v_out text; v_res jsonb;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(po.org_id, p_idem, 'po_decide');
  if v_prev is not null then return v_prev; end if;
  if po.status <> 'pending_approval' then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  perform public.require_perm(po.org_id, 'po.approve');
  -- the person who submitted the order also counts as its creator for segregation of duties
  if coalesce((public.app_setting(po.org_id, 'enforce_sod') #>> '{}')::boolean, true) and po.submitted_by = (select auth.uid()) then
    raise exception 'SOD_CREATOR' using errcode = '42501';
  end if;
  v_out := public.approval_decide(po.org_id, 'po', po.id, po.revision, po.site_id, po.net_total, po.created_by, p_decision, p_comment);
  if v_out = 'approved_all' then
    update public.purchase_orders set status = 'approved', approved_at = now() where id = po.id;
  elsif v_out = 'rejected' then
    update public.purchase_orders set status = 'rejected' where id = po.id;
  end if;
  v_res := jsonb_build_object('id', po.id, 'result', v_out);
  perform public.audit(po.org_id, 'rpc:po_decide', 'po', po.id::text, po.number || ' ' || v_out || coalesce(': ' || p_comment, ''));
  return public.idem_end(po.org_id, p_idem, v_res);
end $$;

-- Back to draft for changes (after rejection, or before anything was received). A new revision needs new approvals.
create or replace function public.po_revise(p_po uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(po.org_id, 'po.create');
  perform public.require_site(po.org_id, po.site_id);
  if po.status not in ('pending_approval', 'rejected', 'approved', 'sent', 'supplier_confirmed') then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  if exists (select 1 from public.receipts where po_id = po.id) then raise exception 'PO_HAS_RECEIPTS' using errcode = 'P0001'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  update public.approvals set status = 'superseded' where doc_type = 'po' and doc_id = po.id and revision = po.revision and status = 'pending';
  update public.purchase_orders set status = 'draft', revision = revision + 1, approved_at = null, sent_at = null, supplier_confirmed_at = null,
    internal_notes = concat_ws(E'\n', internal_notes, 'גרסה ' || (po.revision + 1) || ': ' || p_reason) where id = po.id;
  perform public.audit(po.org_id, 'rpc:po_revise', 'po', po.id::text, po.number || ' גרסה ' || (po.revision + 1) || ': ' || p_reason);
  return jsonb_build_object('id', po.id, 'status', 'draft', 'revision', po.revision + 1);
end $$;

-- Status steps after approval: sent to supplier, confirmed by supplier (optionally with a new date), on its way.
create or replace function public.po_set_status(p_po uuid, p_status text, p_expected date default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(po.org_id, 'po.send');
  perform public.require_site(po.org_id, po.site_id);
  if p_status = 'sent' and po.status = 'approved' then
    update public.purchase_orders set status = 'sent', sent_at = now() where id = po.id;
  elsif p_status = 'supplier_confirmed' and po.status in ('sent') then
    update public.purchase_orders set status = 'supplier_confirmed', supplier_confirmed_at = now(), expected_date = coalesce(p_expected, expected_date) where id = po.id;
  elsif p_status = 'in_delivery' and po.status in ('sent', 'supplier_confirmed') then
    update public.purchase_orders set status = 'in_delivery', expected_date = coalesce(p_expected, expected_date) where id = po.id;
  elsif p_status = 'expected_date' and po.status in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received') then
    if p_expected is null then raise exception 'DATE_REQUIRED' using errcode = '22023'; end if;
    update public.purchase_orders set expected_date = p_expected where id = po.id;
  else
    raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001';
  end if;
  perform public.audit(po.org_id, 'rpc:po_set_status', 'po', po.id::text, po.number || ' → ' || p_status || coalesce(' ' || p_expected, '') || coalesce(': ' || p_note, ''));
  return jsonb_build_object('id', po.id, 'status', (select status from public.purchase_orders where id = po.id));
end $$;

-- ---------------------------------------------------------------- goods receipt
-- Stock rises only by what was actually accepted. Partial deliveries leave the rest open.
-- p_lines: [{po_line_id, qty_accepted, qty_rejected?, reject_reason?}]
create or replace function public.receipt_post(p_po uuid, p_lines jsonb, p_delivery_note text default null, p_quality int default null,
  p_service int default null, p_note text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders; v_prev jsonb; l jsonb; pl public.po_lines; v_acc numeric; v_rej numeric; v_tol numeric; v_rid uuid; v_no text;
  v_any boolean := false; v_res jsonb; v_open numeric;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(po.org_id, p_idem, 'receipt_post');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(po.org_id, 'receipts.post');
  perform public.require_site(po.org_id, po.site_id);
  if po.status not in ('approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received') then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  if jsonb_array_length(coalesce(p_lines, '[]')) = 0 then raise exception 'NO_LINES' using errcode = '22023'; end if;
  v_tol := coalesce((public.app_setting(po.org_id, 'receipt_tolerance_pct') #>> '{}')::numeric, 0);
  v_no := public.next_doc_no(po.org_id, 'GR');
  insert into public.receipts(org_id, number, po_id, site_id, delivery_note_no, quality_rating, service_rating, note, on_time)
  values (po.org_id, v_no, po.id, po.site_id, p_delivery_note, p_quality, p_service, p_note,
          case when po.expected_date is null then null else (now() at time zone 'Asia/Jerusalem')::date <= po.expected_date end)
  returning id into v_rid;
  for l in select * from jsonb_array_elements(p_lines) loop
    select * into pl from public.po_lines where id = (l ->> 'po_line_id')::uuid and po_id = po.id for update;
    if not found then raise exception 'LINE_NOT_ON_PO' using errcode = '22023'; end if;
    v_acc := coalesce((l ->> 'qty_accepted')::numeric, 0);
    v_rej := coalesce((l ->> 'qty_rejected')::numeric, 0);
    if v_acc < 0 or v_rej < 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if v_acc + v_rej = 0 then continue; end if;
    if v_rej > 0 and coalesce(btrim(l ->> 'reject_reason'), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
    v_open := (pl.qty - pl.cancelled_qty) * (1 + v_tol / 100) - pl.received_qty;
    if v_acc > v_open then raise exception 'OVER_RECEIPT:%:%', pl.line_no, greatest(round(v_open, 3), 0) using errcode = 'P0001'; end if;
    insert into public.receipt_lines(receipt_id, po_line_id, qty_accepted, qty_rejected, reject_reason) values (v_rid, pl.id, v_acc, v_rej, l ->> 'reject_reason');
    update public.po_lines set received_qty = received_qty + v_acc, rejected_qty = rejected_qty + v_rej where id = pl.id;
    if v_acc > 0 then
      perform public.stock_apply(po.org_id, po.site_id, pl.item_id, 'receipt', v_acc, 0, public.net_unit(pl.unit_price, pl.discount_pct), 'po', po.id, po.number,
        'קליטה ' || v_no || coalesce(' ת.מ. ' || p_delivery_note, ''));
      -- goods bought for a request are held for it
      if pl.request_line_id is not null then
        update public.stock_balances set reserved = reserved + v_acc where site_id = po.site_id and item_id = pl.item_id;
        insert into public.reservations(org_id, site_id, item_id, qty, request_line_id, source) values (po.org_id, po.site_id, pl.item_id, v_acc, pl.request_line_id, 'po');
      end if;
    end if;
    v_any := true;
  end loop;
  if not v_any then raise exception 'NO_LINES' using errcode = '22023'; end if;
  update public.purchase_orders set status = case
      when not exists (select 1 from public.po_lines where po_id = po.id and received_qty < qty - cancelled_qty) then 'received'
      else 'partially_received' end
  where id = po.id;
  v_res := jsonb_build_object('receipt_id', v_rid, 'number', v_no, 'po_status', (select status from public.purchase_orders where id = po.id),
    'open_lines', (select coalesce(jsonb_agg(jsonb_build_object('line_no', line_no, 'open_qty', qty - cancelled_qty - received_qty)), '[]'::jsonb)
                   from public.po_lines where po_id = po.id and received_qty < qty - cancelled_qty));
  perform public.audit(po.org_id, 'rpc:receipt_post', 'po', po.id::text, po.number || ' ' || v_no);
  return public.idem_end(po.org_id, p_idem, v_res);
end $$;

create or replace function public.po_inspect(p_po uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(po.org_id, 'receipts.post');
  perform public.require_site(po.org_id, po.site_id);
  if po.status <> 'received' then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  update public.purchase_orders set status = 'inspected' where id = po.id;
  perform public.audit(po.org_id, 'rpc:po_inspect', 'po', po.id::text, po.number || coalesce(': ' || p_note, ''));
  return jsonb_build_object('id', po.id, 'status', 'inspected');
end $$;

-- Cancel: before any receipt the whole order is cancelled; after a partial receipt the rest is cancelled and the order closes.
create or replace function public.po_cancel(p_po uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders; v_rl uuid;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_site(po.org_id, po.site_id);
  -- a draft or a rejected order can be dropped by whoever may create orders; anything approved needs po.cancel
  perform public.require_perm(po.org_id, case when po.status in ('draft', 'rejected') then 'po.create' else 'po.cancel' end);
  if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  if po.status in ('received', 'inspected', 'closed', 'cancelled') then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  update public.approvals set status = 'superseded' where doc_type = 'po' and doc_id = po.id and status = 'pending';
  update public.po_lines set cancelled_qty = qty - received_qty where po_id = po.id;
  if po.status = 'partially_received' then
    update public.purchase_orders set status = 'closed', closed_at = now(), cancel_reason = p_reason where id = po.id;
  else
    update public.purchase_orders set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = po.id;
  end if;
  for v_rl in select distinct request_line_id from public.po_lines where po_id = po.id and request_line_id is not null loop
    perform public.request_line_refresh(v_rl, false);
  end loop;
  perform public.audit(po.org_id, 'rpc:po_cancel', 'po', po.id::text, po.number || ': ' || p_reason);
  return jsonb_build_object('id', po.id, 'status', (select status from public.purchase_orders where id = po.id));
end $$;

-- Close a fully received order by hand, or short-close one that will not be completed (reason required).
create or replace function public.po_close(p_po uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders; v_short boolean; v_rl uuid;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(po.org_id, 'po.cancel');
  perform public.require_site(po.org_id, po.site_id);
  if po.status not in ('partially_received', 'received', 'inspected') then raise exception 'BAD_STATUS:%', po.status using errcode = 'P0001'; end if;
  v_short := exists (select 1 from public.po_lines where po_id = po.id and received_qty < qty - cancelled_qty);
  if v_short and coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  update public.po_lines set cancelled_qty = qty - received_qty where po_id = po.id and received_qty < qty;
  update public.purchase_orders set status = 'closed', closed_at = now(), cancel_reason = case when v_short then p_reason else cancel_reason end where id = po.id;
  for v_rl in select distinct request_line_id from public.po_lines where po_id = po.id and request_line_id is not null loop
    perform public.request_line_refresh(v_rl, false);
  end loop;
  perform public.audit(po.org_id, 'rpc:po_close', 'po', po.id::text, po.number || coalesce(': ' || p_reason, ''));
  return jsonb_build_object('id', po.id, 'status', 'closed');
end $$;

-- ---------------------------------------------------------------- returns to supplier
-- p_lines: [{po_line_id, qty, from_damaged?}]
create or replace function public.supplier_return_post(p_po uuid, p_lines jsonb, p_reason text, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare po public.purchase_orders; v_prev jsonb; l jsonb; pl public.po_lines; v_q numeric; v_dmg boolean; v_id uuid; v_no text; v_res jsonb;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(po.org_id, p_idem, 'supplier_return_post');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(po.org_id, 'stock.move');
  perform public.require_site(po.org_id, po.site_id);
  if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  v_no := public.next_doc_no(po.org_id, 'RTV');
  insert into public.supplier_returns(org_id, number, po_id, reason) values (po.org_id, v_no, po.id, p_reason) returning id into v_id;
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]')) loop
    select * into pl from public.po_lines where id = (l ->> 'po_line_id')::uuid and po_id = po.id for update;
    if not found then raise exception 'LINE_NOT_ON_PO' using errcode = '22023'; end if;
    v_q := (l ->> 'qty')::numeric; v_dmg := coalesce((l ->> 'from_damaged')::boolean, false);
    if v_q is null or v_q <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if pl.returned_qty + v_q > pl.received_qty then raise exception 'OVER_RETURN:%', pl.received_qty - pl.returned_qty using errcode = 'P0001'; end if;
    insert into public.supplier_return_lines(return_id, po_line_id, qty, from_damaged) values (v_id, pl.id, v_q, v_dmg);
    update public.po_lines set returned_qty = returned_qty + v_q where id = pl.id;
    perform public.stock_apply(po.org_id, po.site_id, pl.item_id, 'return_to_supplier', case when v_dmg then 0 else -v_q end,
      case when v_dmg then -v_q else 0 end, null, 'po', po.id, po.number, 'החזרה לספק ' || v_no || ': ' || p_reason);
  end loop;
  if not exists (select 1 from public.supplier_return_lines where return_id = v_id) then raise exception 'NO_LINES' using errcode = '22023'; end if;
  v_res := jsonb_build_object('id', v_id, 'number', v_no);
  perform public.audit(po.org_id, 'rpc:supplier_return_post', 'po', po.id::text, po.number || ' ' || v_no || ': ' || p_reason);
  return public.idem_end(po.org_id, p_idem, v_res);
end $$;
