-- 006: the approval engine, price helpers and purchase requests.

-- ---------------------------------------------------------------- who may fill an approval step
-- A step requiring role R can be approved by R itself, by the CEO or a super admin, and a site-manager step also by the
-- procurement manager (so a request opened by the site manager does not deadlock on segregation of duties).
create or replace function public.can_fill_role(p_actual public.app_role, p_required public.app_role)
returns boolean language sql immutable as $$
  select p_actual = p_required
      or p_actual in ('super_admin', 'ceo')
      or (p_required = 'site_manager' and p_actual = 'procurement_manager')
      or (p_required = 'buyer' and p_actual = 'procurement_manager')
$$;

-- Creates the approval steps of a document revision from the organization's rules.
create or replace function public.approvals_route(p_org uuid, p_doc_type text, p_doc_id uuid, p_revision int, p_amount numeric, p_over_budget boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int; v_role public.app_role; v_max int;
begin
  insert into public.approvals(org_id, doc_type, doc_id, revision, step, required_role, reason)
  select p_org, p_doc_type, p_doc_id, p_revision, r.step, r.required_role, 'amount'
  from public.approval_rules r
  where r.org_id = p_org and r.doc_type = p_doc_type and p_amount >= r.min_amount and (r.max_amount is null or p_amount < r.max_amount)
  order by r.step;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'NO_APPROVAL_RULE' using errcode = 'P0001'; end if;
  if p_over_budget then
    v_role := coalesce((public.app_setting(p_org, 'over_budget_role') #>> '{}')::public.app_role, 'cfo');
    if exists (select 1 from public.approvals where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision and required_role = v_role and status = 'pending') then
      update public.approvals set reason = 'over_budget' where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision and required_role = v_role and status = 'pending';
    else
      select max(step) into v_max from public.approvals where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision;
      insert into public.approvals(org_id, doc_type, doc_id, revision, step, required_role, reason)
      values (p_org, p_doc_type, p_doc_id, p_revision, v_max + 1, v_role, 'over_budget');
      v_n := v_n + 1;
    end if;
  end if;
  return v_n;
end $$;

-- Decides the current (lowest pending) step. Returns 'approved_all', 'approved_step' or 'rejected'.
create or replace function public.approval_decide(p_org uuid, p_doc_type text, p_doc_id uuid, p_revision int, p_site uuid, p_amount numeric,
  p_creator uuid, p_decision text, p_comment text)
returns text language plpgsql security definer set search_path = '' as $$
declare a public.approvals; v_uid uuid := (select auth.uid()); v_role public.app_role; v_limit numeric; v_sod boolean;
begin
  if p_decision not in ('approve', 'reject') then raise exception 'BAD_DECISION' using errcode = '22023'; end if;
  perform public.require_perm(p_org, case p_doc_type when 'po' then 'po.approve' else 'requests.approve' end);
  perform public.require_site(p_org, p_site);
  perform 1 from public.approvals where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision for update;
  select * into a from public.approvals where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision and status = 'pending'
   order by step limit 1;
  if not found then raise exception 'NO_PENDING_APPROVAL' using errcode = 'P0001'; end if;
  v_role := public.my_role(p_org);
  if not public.can_fill_role(v_role, a.required_role) then raise exception 'FORBIDDEN:approval:%', a.required_role using errcode = '42501'; end if;
  v_sod := coalesce((public.app_setting(p_org, 'enforce_sod') #>> '{}')::boolean, true);
  if v_sod and v_uid = p_creator then raise exception 'SOD_CREATOR' using errcode = '42501'; end if;
  if v_sod and exists (select 1 from public.approvals where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision and status = 'approved' and decided_by = v_uid) then
    raise exception 'SOD_SAME_APPROVER' using errcode = '42501';
  end if;
  select approval_limit into v_limit from public.memberships where org_id = p_org and user_id = v_uid;
  if p_decision = 'approve' and v_limit is not null and p_amount > v_limit then raise exception 'OVER_APPROVAL_LIMIT:%', v_limit using errcode = '42501'; end if;
  if (a.reason = 'over_budget' or p_decision = 'reject') and coalesce(btrim(p_comment), '') = '' then raise exception 'COMMENT_REQUIRED' using errcode = '22023'; end if;
  update public.approvals set status = case p_decision when 'approve' then 'approved' else 'rejected' end,
    decided_by = v_uid, decided_at = now(), comment = nullif(btrim(p_comment), '') where id = a.id;
  if p_decision = 'reject' then
    update public.approvals set status = 'superseded' where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision and status = 'pending';
    return 'rejected';
  end if;
  if exists (select 1 from public.approvals where doc_type = p_doc_type and doc_id = p_doc_id and revision = p_revision and status = 'pending') then
    return 'approved_step';
  end if;
  return 'approved_all';
end $$;

-- Pending approvals the current user can decide now (the inbox).
create or replace function public.my_approvals(p_org uuid)
returns table (doc_type text, doc_id uuid, number text, site_id uuid, amount numeric, step int, required_role public.app_role, reason text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with cur as (
    select distinct on (a.doc_type, a.doc_id) a.* from public.approvals a
    where a.org_id = p_org and a.status = 'pending'
    order by a.doc_type, a.doc_id, a.step)
  select c.doc_type, c.doc_id, coalesce(p.number, r.number), coalesce(p.site_id, r.site_id), coalesce(p.net_total, r.est_total),
         c.step, c.required_role, c.reason, c.created_at
  from cur c
  left join public.purchase_orders p on c.doc_type = 'po' and p.id = c.doc_id and p.revision = c.revision
  left join public.requests r on c.doc_type = 'request' and r.id = c.doc_id and r.revision = c.revision
  where public.can_fill_role(public.my_role(p_org), c.required_role)
    and public.has_perm(p_org, case c.doc_type when 'po' then 'po.approve' else 'requests.approve' end)
    and public.can_see_site(p_org, coalesce(p.site_id, r.site_id))
    and (p.id is not null or r.id is not null)
    and coalesce(p.created_by, r.requested_by) <> (select auth.uid())
  order by c.created_at
$$;

-- ---------------------------------------------------------------- price helpers
-- Net unit price of an order line (after line discount).
create or replace function public.net_unit(p_unit numeric, p_disc numeric)
returns numeric language sql immutable as $$ select round(p_unit * (1 - coalesce(p_disc, 0) / 100), 4) $$;

-- Last approved purchase price of an item (any supplier unless one is given).
create or replace function public.item_last_price(p_item uuid, p_supplier uuid default null)
returns numeric language sql stable security definer set search_path = '' as $$
  select public.net_unit(l.unit_price, l.discount_pct) from public.po_lines l join public.purchase_orders p on p.id = l.po_id
  where l.item_id = p_item and (p_supplier is null or p.supplier_id = p_supplier)
    and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled')
    and (public.has_perm(p.org_id, 'finance.view') or (select auth.uid()) is null)
  order by p.order_date desc, p.created_at desc limit 1
$$;

-- Quantity-weighted average purchase price over the last N days.
create or replace function public.item_avg_price(p_item uuid, p_days int default 365)
returns numeric language sql stable security definer set search_path = '' as $$
  select round(sum(l.qty * public.net_unit(l.unit_price, l.discount_pct)) / nullif(sum(l.qty), 0), 4)
  from public.po_lines l join public.purchase_orders p on p.id = l.po_id
  where l.item_id = p_item and p.status not in ('draft', 'pending_approval', 'rejected', 'cancelled')
    and p.order_date >= current_date - p_days
    and (public.has_perm(p.org_id, 'finance.view') or (select auth.uid()) is null)
$$;

-- ---------------------------------------------------------------- purchase requests
-- Recomputes how a request line is covered and moves the request to in_progress / fulfilled.
-- p_strict: raise when the line would be covered more than requested (used when a new cover is added).
create or replace function public.request_line_refresh(p_line uuid, p_strict boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.request_lines; v_ord numeric; v_tr numeric; v_res numeric; v_req uuid; r public.requests;
begin
  select * into l from public.request_lines where id = p_line for update;
  if not found then return; end if;
  select coalesce(sum(pl.qty - pl.cancelled_qty), 0) into v_ord from public.po_lines pl join public.purchase_orders p on p.id = pl.po_id
   where pl.request_line_id = p_line and p.status not in ('cancelled');
  select coalesce(sum(case when t.status = 'received' then tl.received_qty else tl.qty end), 0) into v_tr
    from public.transfer_lines tl join public.transfers t on t.id = tl.transfer_id
   where tl.request_line_id = p_line and t.status <> 'cancelled';
  select coalesce(sum(qty - case when status = 'released' then qty - consumed_qty else 0 end), 0) into v_res
    from public.reservations where request_line_id = p_line and source = 'stock';
  if p_strict and v_ord + v_tr + v_res > l.qty then raise exception 'REQUEST_OVER_COVERED:%', l.qty using errcode = 'P0001'; end if;
  update public.request_lines set ordered_qty = v_ord, transfer_qty = v_tr, reserved_qty = v_res where id = p_line;

  select * into r from public.requests where id = l.request_id for update;
  if r.status in ('approved', 'in_progress', 'fulfilled') then
    update public.requests set
      status = case
        when not exists (select 1 from public.request_lines x where x.request_id = r.id and x.ordered_qty + x.transfer_qty + x.reserved_qty < x.qty) then 'fulfilled'
        when exists (select 1 from public.request_lines x where x.request_id = r.id and x.ordered_qty + x.transfer_qty + x.reserved_qty > 0) then 'in_progress'
        else 'approved' end,
      closed_at = case when not exists (select 1 from public.request_lines x where x.request_id = r.id and x.ordered_qty + x.transfer_qty + x.reserved_qty < x.qty) then now() end
    where id = r.id;
  end if;
end $$;

-- Create or update a draft request. p: {id?, org_id, site_id, urgency, reason, needed_by, project,
--   lines: [{item_id?, description?, qty, est_unit_price?, note?}]}
create or replace function public.request_save(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_org uuid := (p ->> 'org_id')::uuid; v_site uuid := (p ->> 'site_id')::uuid; v_id uuid := (p ->> 'id')::uuid; r public.requests;
  l jsonb; n int := 0; v_price numeric; v_total numeric := 0; v_no text; v_item uuid;
begin
  perform public.require_perm(v_org, 'requests.create');
  perform public.require_site(v_org, v_site);
  if jsonb_array_length(coalesce(p -> 'lines', '[]')) = 0 then raise exception 'NO_LINES' using errcode = '22023'; end if;
  if v_id is not null then
    select * into r from public.requests where id = v_id for update;
    if not found or r.org_id <> v_org then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
    if r.status not in ('draft', 'rejected') then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
    if r.requested_by <> (select auth.uid()) then raise exception 'FORBIDDEN:not_requester' using errcode = '42501'; end if;
    update public.requests set site_id = v_site, urgency = coalesce(p ->> 'urgency', 'normal'), reason = p ->> 'reason',
      needed_by = (p ->> 'needed_by')::date, project = p ->> 'project', status = 'draft' where id = v_id;
    delete from public.request_lines where request_id = v_id;
  else
    v_no := public.next_doc_no(v_org, 'PR');
    insert into public.requests(org_id, number, site_id, urgency, reason, needed_by, project)
    values (v_org, v_no, v_site, coalesce(p ->> 'urgency', 'normal'), p ->> 'reason', (p ->> 'needed_by')::date, p ->> 'project')
    returning id into v_id;
  end if;
  for l in select * from jsonb_array_elements(p -> 'lines') loop
    n := n + 1;
    v_item := (l ->> 'item_id')::uuid;
    if v_item is not null and not exists (select 1 from public.items where id = v_item and org_id = v_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
    if coalesce((l ->> 'qty')::numeric, 0) <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    v_price := coalesce((l ->> 'est_unit_price')::numeric, case when v_item is not null then public.item_last_price(v_item) end);
    insert into public.request_lines(request_id, line_no, item_id, description, qty, est_unit_price, note)
    values (v_id, n, v_item, nullif(l ->> 'description', ''), (l ->> 'qty')::numeric, v_price, l ->> 'note');
    v_total := v_total + coalesce(round((l ->> 'qty')::numeric * v_price, 2), 0);
  end loop;
  update public.requests set est_total = v_total where id = v_id;
  return jsonb_build_object('id', v_id, 'est_total', v_total);
end $$;

-- Automatic checks for a request: local stock, surplus at other sites, open orders and transfers, similar requests, budget.
create or replace function public.request_check(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.requests; v_lines jsonb; v_budget jsonb;
begin
  select * into r from public.requests where id = p_request;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_site(r.org_id, r.site_id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'line_id', l.id, 'item_id', l.item_id, 'qty', l.qty,
    'local_available', coalesce((select b.on_hand - b.reserved from public.stock_balances b where b.site_id = r.site_id and b.item_id = l.item_id), 0),
    -- surplus elsewhere: what is above the site's minimum (or all available when no minimum is set)
    'other_sites', coalesce((select jsonb_agg(jsonb_build_object('site_id', s.id, 'site_name', s.name, 'surplus', x.surplus) order by x.surplus desc)
       from (select b.site_id, b.on_hand - b.reserved - coalesce(iss.min_qty, i.min_qty, 0) as surplus
               from public.stock_balances b join public.items i on i.id = b.item_id
               left join public.item_site_settings iss on iss.item_id = b.item_id and iss.site_id = b.site_id
              where b.item_id = l.item_id and b.site_id <> r.site_id and b.org_id = r.org_id) x
       join public.sites s on s.id = x.site_id and s.status in ('active', 'on_hold')
       where x.surplus > 0), '[]'::jsonb),
    'open_po_qty', coalesce((select sum(pl.qty - pl.cancelled_qty - pl.received_qty) from public.po_lines pl join public.purchase_orders p on p.id = pl.po_id
       where pl.item_id = l.item_id and p.site_id = r.site_id and p.status in ('draft', 'pending_approval', 'approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')), 0),
    'open_pos', coalesce((select jsonb_agg(distinct p.number) from public.po_lines pl join public.purchase_orders p on p.id = pl.po_id
       where pl.item_id = l.item_id and p.site_id = r.site_id and p.status in ('draft', 'pending_approval', 'approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received')), '[]'::jsonb),
    'in_transit_qty', coalesce((select sum(tl.qty) from public.transfer_lines tl join public.transfers t on t.id = tl.transfer_id
       where tl.item_id = l.item_id and t.to_site_id = r.site_id and t.status = 'shipped'), 0),
    'similar_requests', coalesce((select jsonb_agg(distinct r2.number) from public.request_lines l2 join public.requests r2 on r2.id = l2.request_id
       where l2.item_id = l.item_id and r2.id <> r.id and r2.org_id = r.org_id and r2.status in ('draft', 'submitted', 'approved', 'in_progress')
         and r2.created_at > now() - interval '60 days'), '[]'::jsonb),
    'last_price', public.item_last_price(l.item_id),
    'avg_price', public.item_avg_price(l.item_id)
  ) order by l.line_no), '[]'::jsonb) into v_lines
  from public.request_lines l where l.request_id = r.id;

  select coalesce(jsonb_agg(jsonb_build_object('budget_id', f.id, 'name', f.name, 'available', f.available, 'after', f.available - r.est_total,
           'over', f.available - r.est_total < 0)), '[]'::jsonb)
    into v_budget
    from public.budgets b, lateral public.budget_figures(b.id) f
   where b.org_id = r.org_id and b.active and (b.site_id is null or b.site_id = r.site_id) and b.category_id is null
     and coalesce(r.needed_by, current_date) between b.period_start and b.period_end;

  return jsonb_build_object('lines', v_lines, 'budgets', v_budget, 'est_total', r.est_total);
end $$;

create or replace function public.request_submit(p_request uuid, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.requests; v_prev jsonb; v_over boolean; v_res jsonb;
begin
  select * into r from public.requests where id = p_request for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(r.org_id, p_idem, 'request_submit');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(r.org_id, 'requests.create');
  perform public.require_site(r.org_id, r.site_id);
  if r.requested_by <> (select auth.uid()) then raise exception 'FORBIDDEN:not_requester' using errcode = '42501'; end if;
  if r.status not in ('draft', 'rejected') then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
  if r.status = 'rejected' then r.revision := r.revision + 1; end if;
  update public.requests set status = 'submitted', submitted_at = now(), revision = r.revision where id = r.id;
  -- requests route by estimated amount; a budget overrun shows on the request check and is enforced on the order
  perform public.approvals_route(r.org_id, 'request', r.id, r.revision, r.est_total, false);
  v_res := jsonb_build_object('id', r.id, 'status', 'submitted');
  perform public.audit(r.org_id, 'rpc:request_submit', 'request', r.id::text, r.number);
  return public.idem_end(r.org_id, p_idem, v_res);
end $$;

create or replace function public.request_decide(p_request uuid, p_decision text, p_comment text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.requests; v_prev jsonb; v_out text; v_res jsonb;
begin
  select * into r from public.requests where id = p_request for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(r.org_id, p_idem, 'request_decide');
  if v_prev is not null then return v_prev; end if;
  if r.status <> 'submitted' then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
  v_out := public.approval_decide(r.org_id, 'request', r.id, r.revision, r.site_id, r.est_total, r.requested_by, p_decision, p_comment);
  if v_out = 'approved_all' then update public.requests set status = 'approved', decided_at = now() where id = r.id;
  elsif v_out = 'rejected' then update public.requests set status = 'rejected', decided_at = now() where id = r.id;
  end if;
  v_res := jsonb_build_object('id', r.id, 'result', v_out);
  perform public.audit(r.org_id, 'rpc:request_decide', 'request', r.id::text, r.number || ' ' || v_out || coalesce(': ' || p_comment, ''));
  return public.idem_end(r.org_id, p_idem, v_res);
end $$;

create or replace function public.request_cancel(p_request uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_site(r.org_id, r.site_id);
  if r.requested_by <> (select auth.uid()) and not public.has_perm(r.org_id, 'requests.approve') then raise exception 'FORBIDDEN:requests.approve' using errcode = '42501'; end if;
  if r.status in ('fulfilled', 'cancelled') then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  if exists (select 1 from public.request_lines where request_id = r.id and (ordered_qty > 0 or transfer_qty > 0)) then
    raise exception 'REQUEST_HAS_ORDERS' using errcode = 'P0001';
  end if;
  -- release stock held for it
  update public.stock_balances b set reserved = b.reserved - x.open_qty
    from (select site_id, item_id, sum(qty - consumed_qty) open_qty from public.reservations
           where status = 'active' and request_line_id in (select id from public.request_lines where request_id = r.id) group by site_id, item_id) x
   where b.site_id = x.site_id and b.item_id = x.item_id;
  update public.reservations set status = 'released' where status = 'active' and request_line_id in (select id from public.request_lines where request_id = r.id);
  update public.approvals set status = 'superseded' where doc_type = 'request' and doc_id = r.id and status = 'pending';
  update public.requests set status = 'cancelled', closed_at = now() where id = r.id;
  perform public.audit(r.org_id, 'rpc:request_cancel', 'request', r.id::text, r.number || ': ' || p_reason);
  return jsonb_build_object('id', r.id, 'status', 'cancelled');
end $$;

-- Hold stock at the request's site for one line (from what is available there).
create or replace function public.request_reserve(p_line uuid, p_qty numeric, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.request_lines; r public.requests; v_prev jsonb; b public.stock_balances; v_id uuid; v_res jsonb;
begin
  select * into l from public.request_lines where id = p_line;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select * into r from public.requests where id = l.request_id for update;
  v_prev := public.idem_begin(r.org_id, p_idem, 'request_reserve');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(r.org_id, 'stock.move');
  perform public.require_site(r.org_id, r.site_id);
  if r.status not in ('approved', 'in_progress') then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
  if l.item_id is null then raise exception 'ITEM_REQUIRED' using errcode = '22023'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
  insert into public.stock_balances(org_id, site_id, item_id) values (r.org_id, r.site_id, l.item_id) on conflict do nothing;
  select * into b from public.stock_balances where site_id = r.site_id and item_id = l.item_id for update;
  if b.on_hand - b.reserved < p_qty then raise exception 'INSUFFICIENT_STOCK:%', b.on_hand - b.reserved using errcode = 'P0001'; end if;
  update public.stock_balances set reserved = reserved + p_qty where site_id = r.site_id and item_id = l.item_id;
  insert into public.reservations(org_id, site_id, item_id, qty, request_line_id) values (r.org_id, r.site_id, l.item_id, p_qty, l.id) returning id into v_id;
  perform public.request_line_refresh(l.id, true);
  v_res := jsonb_build_object('reservation_id', v_id);
  return public.idem_end(r.org_id, p_idem, v_res);
end $$;

-- Issue reserved stock to the requester (consumes the reservation).
create or replace function public.reservation_issue(p_reservation uuid, p_qty numeric, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.reservations; v_prev jsonb; v_res jsonb;
begin
  select * into v from public.reservations where id = p_reservation for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(v.org_id, p_idem, 'reservation_issue');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(v.org_id, 'stock.move');
  perform public.require_site(v.org_id, v.site_id);
  if v.status <> 'active' then raise exception 'BAD_STATUS:%', v.status using errcode = 'P0001'; end if;
  if p_qty is null or p_qty <= 0 or p_qty > v.qty - v.consumed_qty then raise exception 'BAD_QTY' using errcode = '22023'; end if;
  perform 1 from public.stock_balances where site_id = v.site_id and item_id = v.item_id for update;
  update public.stock_balances set reserved = reserved - p_qty where site_id = v.site_id and item_id = v.item_id;
  perform public.stock_apply(v.org_id, v.site_id, v.item_id, 'reservation_issue', -p_qty, 0, null, 'request', v.request_line_id, null, 'ניפוק לפי דרישה', true);
  update public.reservations set consumed_qty = consumed_qty + p_qty,
    status = case when consumed_qty + p_qty >= qty then 'consumed' else 'active' end where id = v.id;
  v_res := jsonb_build_object('reservation_id', v.id, 'left', v.qty - v.consumed_qty - p_qty);
  return public.idem_end(v.org_id, p_idem, v_res);
end $$;

create or replace function public.reservation_release(p_reservation uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.reservations;
begin
  select * into v from public.reservations where id = p_reservation for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(v.org_id, 'stock.move');
  perform public.require_site(v.org_id, v.site_id);
  if v.status <> 'active' then raise exception 'BAD_STATUS:%', v.status using errcode = 'P0001'; end if;
  perform 1 from public.stock_balances where site_id = v.site_id and item_id = v.item_id for update;
  update public.stock_balances set reserved = reserved - (v.qty - v.consumed_qty) where site_id = v.site_id and item_id = v.item_id;
  update public.reservations set status = 'released' where id = v.id;
  if v.request_line_id is not null then perform public.request_line_refresh(v.request_line_id, false); end if;
  perform public.audit(v.org_id, 'rpc:reservation_release', 'reservation', v.id::text, coalesce(p_reason, ''));
  return jsonb_build_object('id', v.id, 'status', 'released');
end $$;
