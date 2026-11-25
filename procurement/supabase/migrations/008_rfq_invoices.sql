-- 008: requests for quotation, quote comparison and award; supplier invoices with three-way match.

-- ---------------------------------------------------------------- RFQ
-- p: {org_id, site_id, title, request_id?, due_date?, note?, lines: [{item_id, qty, request_line_id?, note?}], supplier_ids: [uuid]}
create or replace function public.rfq_create(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_org uuid := (p ->> 'org_id')::uuid; v_site uuid := (p ->> 'site_id')::uuid; v_id uuid; v_no text; l jsonb; n int := 0; s text;
begin
  perform public.require_perm(v_org, 'rfq.manage');
  perform public.require_site(v_org, v_site);
  if jsonb_array_length(coalesce(p -> 'lines', '[]')) = 0 then raise exception 'NO_LINES' using errcode = '22023'; end if;
  v_no := public.next_doc_no(v_org, 'RFQ');
  insert into public.rfqs(org_id, number, title, request_id, site_id, due_date, note)
  values (v_org, v_no, coalesce(nullif(btrim(p ->> 'title'), ''), v_no), (p ->> 'request_id')::uuid, v_site, (p ->> 'due_date')::date, p ->> 'note')
  returning id into v_id;
  for l in select * from jsonb_array_elements(p -> 'lines') loop
    n := n + 1;
    if not exists (select 1 from public.items where id = (l ->> 'item_id')::uuid and org_id = v_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
    if coalesce((l ->> 'qty')::numeric, 0) <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    insert into public.rfq_lines(rfq_id, line_no, item_id, qty, request_line_id, note)
    values (v_id, n, (l ->> 'item_id')::uuid, (l ->> 'qty')::numeric, (l ->> 'request_line_id')::uuid, l ->> 'note');
  end loop;
  for s in select jsonb_array_elements_text(coalesce(p -> 'supplier_ids', '[]')) loop
    if not exists (select 1 from public.suppliers where id = s::uuid and org_id = v_org and status <> 'blocked') then raise exception 'SUPPLIER_BLOCKED' using errcode = 'P0001'; end if;
    insert into public.rfq_suppliers(rfq_id, supplier_id) values (v_id, s::uuid) on conflict do nothing;
  end loop;
  perform public.audit(v_org, 'rpc:rfq_create', 'rfq', v_id::text, v_no);
  return jsonb_build_object('id', v_id, 'number', v_no);
end $$;

-- Full comparison of the quotes on an RFQ, by total landed cost and not only unit price.
-- Prices entered including VAT are normalised to net. A minimum order quantity above the requested quantity is priced at the minimum.
create or replace function public.rfq_compare(p_rfq uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.rfqs; v_vat numeric; v_coc numeric; v_quotes jsonb; v_lines jsonb; v_nlines int;
begin
  select * into r from public.rfqs where id = p_rfq;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_site(r.org_id, r.site_id);
  if not public.has_perm(r.org_id, 'finance.view') then raise exception 'FORBIDDEN:finance.view' using errcode = '42501'; end if;
  v_vat := coalesce((public.app_setting(r.org_id, 'vat_rate') #>> '{}')::numeric, 0.18);
  v_coc := coalesce((public.app_setting(r.org_id, 'cost_of_capital_pct') #>> '{}')::numeric, 6);
  select count(*) into v_nlines from public.rfq_lines where rfq_id = r.id;

  with ql as (
    select q.id quote_id, rl.id rfq_line_id, rl.item_id, rl.qty, ql.min_qty,
           greatest(rl.qty, coalesce(ql.min_qty, 0)) buy_qty,
           case when q.prices_include_vat then round(ql.unit_price / (1 + v_vat), 4) else ql.unit_price end unit,
           ql.discount_pct
    from public.quotes q join public.rfq_lines rl on rl.rfq_id = q.rfq_id
    left join public.quote_lines ql on ql.quote_id = q.id and ql.rfq_line_id = rl.id
    where q.rfq_id = r.id and q.status = 'active'),
  qt as (
    select q.*, s.name supplier_name, s.status supplier_status,
      (select count(*) from ql where ql.quote_id = q.id and ql.unit is not null) quoted_lines,
      (select coalesce(sum(round(ql.buy_qty * ql.unit, 2)), 0) from ql where ql.quote_id = q.id and ql.unit is not null) base,
      (select coalesce(sum(round(ql.buy_qty * ql.unit * (1 - ql.discount_pct / 100), 2)), 0) from ql where ql.quote_id = q.id and ql.unit is not null) after_line_disc,
      (select bool_or(ql.min_qty > ql.qty) from ql where ql.quote_id = q.id) min_qty_applies,
      sc.score, sc.quality_score
    from public.quotes q join public.suppliers s on s.id = q.supplier_id
    left join lateral public.supplier_score(q.supplier_id) sc on true
    where q.rfq_id = r.id and q.status = 'active'),
  calc as (
    select qt.*, round(after_line_disc * order_discount_pct / 100, 2) order_disc,
           after_line_disc - round(after_line_disc * order_discount_pct / 100, 2) + shipping_cost net,
           (valid_until is null or valid_until >= current_date) valid,
           quoted_lines = v_nlines full_cover
    from qt),
  elig as (select * from calc where valid and full_cover and supplier_status <> 'blocked'),
  mins as (select min(net) min_net, min(coalesce(delivery_days, 999)) min_days, max(coalesce(credit_days, 0)) max_credit from elig),
  scored as (
    select c.*, round(c.net * (1 + v_vat), 2) total,
      round(c.net * (1 - v_coc / 100 * coalesce(c.credit_days, 0) / 365), 2) effective_cost,
      case when c.valid and c.full_cover and c.supplier_status <> 'blocked' then
        round(0.5 * (m.min_net / nullif(c.net, 0) * 100)
            + 0.2 * (case when coalesce(c.delivery_days, 999) = 0 then 100 else greatest(m.min_days, 1)::numeric / greatest(coalesce(c.delivery_days, 999), 1) * 100 end)
            + 0.2 * coalesce(c.score, 60)
            + 0.1 * (case when m.max_credit = 0 then 100 else coalesce(c.credit_days, 0)::numeric / m.max_credit * 100 end), 1) end value_score
    from calc c cross join mins m)
  select coalesce(jsonb_agg(jsonb_build_object(
      'quote_id', s.id, 'supplier_id', s.supplier_id, 'supplier_name', s.supplier_name, 'supplier_status', s.supplier_status,
      'quote_no', s.quote_no, 'valid_until', s.valid_until, 'valid', s.valid, 'full_cover', s.full_cover, 'quoted_lines', s.quoted_lines,
      'base', s.base, 'line_discounts', s.base - s.after_line_disc, 'order_discount', s.order_disc, 'shipping', s.shipping_cost,
      'net', s.net, 'vat', s.total - s.net, 'total', s.total, 'effective_cost', s.effective_cost,
      'delivery_days', s.delivery_days, 'payment_terms', s.payment_terms, 'credit_days', s.credit_days, 'warranty', s.warranty,
      'min_qty_applies', coalesce(s.min_qty_applies, false), 'prices_include_vat', s.prices_include_vat,
      'supplier_score', s.score, 'quality_score', s.quality_score, 'value_score', s.value_score,
      'is_cheapest', s.net = (select min_net from mins) and s.value_score is not null,
      'is_fastest', coalesce(s.delivery_days, 999) = (select min_days from mins) and s.value_score is not null,
      'is_best_quality', s.value_score is not null and s.quality_score is not null and s.quality_score = (select max(quality_score) from scored where value_score is not null),
      'is_recommended', s.value_score is not null and s.value_score = (select max(value_score) from scored),
      'diff_from_cheapest', case when s.value_score is not null then s.net - (select min_net from mins) end
    ) order by s.net), '[]'::jsonb)
  into v_quotes from scored s;

  select coalesce(jsonb_agg(jsonb_build_object(
      'rfq_line_id', rl.id, 'item_id', rl.item_id, 'qty', rl.qty,
      'last_price', public.item_last_price(rl.item_id), 'avg_price', public.item_avg_price(rl.item_id),
      'list_price', (select min(sp.unit_price) from public.supplier_prices sp where sp.item_id = rl.item_id and current_date between sp.valid_from and coalesce(sp.valid_until, current_date)),
      'offers', (select coalesce(jsonb_agg(jsonb_build_object('quote_id', q.id, 'supplier_id', q.supplier_id,
                   'net_unit', public.net_unit(case when q.prices_include_vat then round(x.unit_price / (1 + v_vat), 4) else x.unit_price end, x.discount_pct),
                   'min_qty', x.min_qty, 'note', x.note)), '[]'::jsonb)
                 from public.quote_lines x join public.quotes q on q.id = x.quote_id
                 where x.rfq_line_id = rl.id and x.unit_price is not null and q.status = 'active')
    ) order by rl.line_no), '[]'::jsonb)
  into v_lines from public.rfq_lines rl where rl.rfq_id = r.id;

  return jsonb_build_object('rfq_id', r.id, 'status', r.status, 'vat_rate', v_vat, 'cost_of_capital_pct', v_coc,
    'weights', jsonb_build_object('price', 50, 'delivery', 20, 'supplier', 20, 'terms', 10), 'quotes', v_quotes, 'lines', v_lines);
end $$;

-- Award an RFQ to one quote and create the draft order from it. Choosing anything but the cheapest eligible quote needs a reason.
create or replace function public.rfq_award(p_rfq uuid, p_quote uuid, p_reason text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rfqs; q public.quotes; v_prev jsonb; v_cmp jsonb; v_me jsonb; v_lines jsonb; v_vat numeric; v_sub numeric; v_po jsonb; v_res jsonb;
begin
  select * into r from public.rfqs where id = p_rfq for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(r.org_id, p_idem, 'rfq_award');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(r.org_id, 'rfq.manage');
  perform public.require_perm(r.org_id, 'po.create');
  perform public.require_site(r.org_id, r.site_id);
  if r.status <> 'open' then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
  select * into q from public.quotes where id = p_quote and rfq_id = r.id and status = 'active';
  if not found then raise exception 'QUOTE_NOT_ACTIVE' using errcode = 'P0001'; end if;
  v_cmp := public.rfq_compare(r.id);
  select x into v_me from jsonb_array_elements(v_cmp -> 'quotes') x where (x ->> 'quote_id')::uuid = q.id;
  if not coalesce((v_me ->> 'valid')::boolean, false) then raise exception 'QUOTE_EXPIRED' using errcode = 'P0001'; end if;
  if not coalesce((v_me ->> 'is_cheapest')::boolean, false) and char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'AWARD_REASON_REQUIRED' using errcode = '22023';
  end if;
  v_vat := (v_cmp ->> 'vat_rate')::numeric;
  select jsonb_agg(jsonb_build_object('item_id', rl.item_id, 'qty', greatest(rl.qty, coalesce(ql.min_qty, 0)),
           'unit_price', case when q.prices_include_vat then round(ql.unit_price / (1 + v_vat), 4) else ql.unit_price end,
           'discount_pct', ql.discount_pct, 'request_line_id', rl.request_line_id) order by rl.line_no),
         sum(round(greatest(rl.qty, coalesce(ql.min_qty, 0)) * (case when q.prices_include_vat then round(ql.unit_price / (1 + v_vat), 4) else ql.unit_price end) * (1 - ql.discount_pct / 100), 2))
    into v_lines, v_sub
  from public.rfq_lines rl join public.quote_lines ql on ql.rfq_line_id = rl.id and ql.quote_id = q.id
  where rl.rfq_id = r.id and ql.unit_price is not null;
  if v_lines is null then raise exception 'NO_LINES' using errcode = '22023'; end if;
  v_po := public.po_save(jsonb_build_object('org_id', r.org_id, 'supplier_id', q.supplier_id, 'site_id', r.site_id, 'request_id', r.request_id,
    'rfq_id', r.id, 'quote_id', q.id, 'expected_date', current_date + coalesce(q.delivery_days, 0),
    'payment_terms', q.payment_terms, 'credit_days', q.credit_days, 'shipping_cost', q.shipping_cost,
    'order_discount', round(v_sub * q.order_discount_pct / 100, 2), 'lines', v_lines));
  update public.rfqs set status = 'awarded', awarded_quote_id = q.id, award_reason = nullif(btrim(p_reason), ''), awarded_by = (select auth.uid()), awarded_at = now()
   where id = r.id;
  v_res := jsonb_build_object('rfq_id', r.id, 'po', v_po, 'was_cheapest', (v_me ->> 'is_cheapest')::boolean, 'comparison', v_me);
  perform public.audit(r.org_id, 'rpc:rfq_award', 'rfq', r.id::text, r.number || ' → ' || (select name from public.suppliers where id = q.supplier_id)
    || coalesce(': ' || p_reason, ''), null, v_me);
  return public.idem_end(r.org_id, p_idem, v_res);
end $$;

create or replace function public.rfq_cancel(p_rfq uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rfqs;
begin
  select * into r from public.rfqs where id = p_rfq for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(r.org_id, 'rfq.manage');
  if r.status <> 'open' then raise exception 'BAD_STATUS:%', r.status using errcode = 'P0001'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  update public.rfqs set status = 'cancelled', note = concat_ws(E'\n', note, 'בוטל: ' || p_reason) where id = r.id;
  return jsonb_build_object('id', r.id, 'status', 'cancelled');
end $$;

-- ---------------------------------------------------------------- invoices and three-way match (order ↔ receipt ↔ invoice)
create or replace function public.invoice_match(p_invoice uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i public.invoices; po public.purchase_orders; v_tol numeric; v_issues jsonb := '[]'::jsonb; l record; v_status text; v_sum numeric; v_ship_other numeric;
begin
  select * into i from public.invoices where id = p_invoice for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if i.status in ('approved', 'paid', 'rejected') then return i.match_result; end if;
  v_tol := coalesce((public.app_setting(i.org_id, 'price_tolerance_pct') #>> '{}')::numeric, 0.5);
  if i.po_id is null then
    v_issues := v_issues || jsonb_build_object('kind', 'no_po');
  else
    select * into po from public.purchase_orders where id = i.po_id;
    if po.status in ('draft', 'pending_approval', 'rejected', 'cancelled') then
      v_issues := v_issues || jsonb_build_object('kind', 'po_not_approved', 'po_status', po.status);
    end if;
    for l in
      select il.*, pl.line_no, pl.received_qty, pl.returned_qty, public.net_unit(pl.unit_price, pl.discount_pct) po_unit,
             (select coalesce(sum(x.qty), 0) from public.invoice_lines x join public.invoices xi on xi.id = x.invoice_id
               where x.po_line_id = il.po_line_id and xi.status <> 'rejected') invoiced_all
      from public.invoice_lines il left join public.po_lines pl on pl.id = il.po_line_id
      where il.invoice_id = i.id
    loop
      if l.po_line_id is null then
        v_issues := v_issues || jsonb_build_object('kind', 'charge_not_on_po', 'description', l.description, 'amount', l.line_net);
        continue;
      end if;
      if l.po_unit > 0 and abs(l.unit_price - l.po_unit) / l.po_unit * 100 > v_tol then
        v_issues := v_issues || jsonb_build_object('kind', 'price_diff', 'line_no', l.line_no, 'invoice_price', l.unit_price, 'po_price', l.po_unit,
          'amount', round((l.unit_price - l.po_unit) * l.qty, 2));
      elsif l.po_unit = 0 and l.unit_price > 0 then
        v_issues := v_issues || jsonb_build_object('kind', 'price_diff', 'line_no', l.line_no, 'invoice_price', l.unit_price, 'po_price', 0, 'amount', l.line_net);
      end if;
      if l.received_qty - l.returned_qty <= 0 then
        v_issues := v_issues || jsonb_build_object('kind', 'not_received', 'line_no', l.line_no, 'qty', l.qty);
      elsif l.invoiced_all > l.received_qty - l.returned_qty then
        v_issues := v_issues || jsonb_build_object('kind', 'qty_over_received', 'line_no', l.line_no, 'invoiced', l.invoiced_all,
          'received', l.received_qty - l.returned_qty, 'amount', round((l.invoiced_all - (l.received_qty - l.returned_qty)) * l.unit_price, 2));
      end if;
    end loop;
    select coalesce(sum(shipping_charged), 0) into v_ship_other from public.invoices where po_id = po.id and id <> i.id and status <> 'rejected';
    if i.shipping_charged > po.shipping_cost - v_ship_other + 0.01 then
      v_issues := v_issues || jsonb_build_object('kind', 'shipping_diff', 'charged', i.shipping_charged, 'allowed', greatest(po.shipping_cost - v_ship_other, 0));
    end if;
    if abs(i.vat_amount - round(i.net_amount * po.vat_rate, 2)) > 1 then
      v_issues := v_issues || jsonb_build_object('kind', 'vat_mismatch', 'vat', i.vat_amount, 'expected', round(i.net_amount * po.vat_rate, 2));
    end if;
  end if;
  select coalesce(sum(line_net), 0) into v_sum from public.invoice_lines where invoice_id = i.id;
  if abs(v_sum + i.shipping_charged - i.net_amount) > 1 then
    v_issues := v_issues || jsonb_build_object('kind', 'lines_sum_mismatch', 'lines', v_sum + i.shipping_charged, 'net', i.net_amount);
  end if;
  -- the same amount from the same supplier within 30 days under another number
  if exists (select 1 from public.invoices x where x.org_id = i.org_id and x.supplier_id = i.supplier_id and x.id <> i.id and x.status <> 'rejected'
               and x.total = i.total and abs(x.invoice_date - i.invoice_date) <= 30) then
    v_issues := v_issues || jsonb_build_object('kind', 'possible_duplicate',
      'others', (select jsonb_agg(x.invoice_no) from public.invoices x where x.org_id = i.org_id and x.supplier_id = i.supplier_id and x.id <> i.id
                   and x.status <> 'rejected' and x.total = i.total and abs(x.invoice_date - i.invoice_date) <= 30));
  end if;
  v_status := case when jsonb_array_length(v_issues) = 0 then 'matched' else 'exception' end;
  update public.invoices set status = v_status, match_result = jsonb_build_object('checked_at', now(), 'issues', v_issues) where id = i.id;
  return jsonb_build_object('status', v_status, 'issues', v_issues);
end $$;

-- p: {org_id, supplier_id, po_id?, invoice_no, invoice_date, net_amount, vat_amount, shipping_charged?, note?, file_path?,
--     lines: [{po_line_id?, description?, qty, unit_price}]}
create or replace function public.invoice_register(p jsonb, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_org uuid := (p ->> 'org_id')::uuid; v_po uuid := (p ->> 'po_id')::uuid; po public.purchase_orders; v_prev jsonb; v_id uuid; l jsonb;
  v_net numeric := (p ->> 'net_amount')::numeric; v_vat numeric := (p ->> 'vat_amount')::numeric; v_credit int; v_match jsonb; v_res jsonb;
begin
  v_prev := public.idem_begin(v_org, p_idem, 'invoice_register');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(v_org, 'invoices.register');
  if not exists (select 1 from public.suppliers where id = (p ->> 'supplier_id')::uuid and org_id = v_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  if v_po is not null then
    select * into po from public.purchase_orders where id = v_po and org_id = v_org;
    if not found then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
    perform public.require_site(v_org, po.site_id);
    if po.supplier_id <> (p ->> 'supplier_id')::uuid then raise exception 'PO_OTHER_SUPPLIER' using errcode = '22023'; end if;
  elsif not public.all_sites_member(v_org) then
    raise exception 'SITE_FORBIDDEN' using errcode = '42501';
  end if;
  if v_net is null or v_vat is null or v_net < 0 or v_vat < 0 then raise exception 'BAD_AMOUNT' using errcode = '22023'; end if;
  if (p ->> 'invoice_date') is null then raise exception 'DATE_REQUIRED' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(p -> 'lines', '[]')) = 0 then raise exception 'NO_LINES' using errcode = '22023'; end if;
  if exists (select 1 from public.invoices where org_id = v_org and supplier_id = (p ->> 'supplier_id')::uuid and lower(btrim(invoice_no)) = lower(btrim(p ->> 'invoice_no'))) then
    raise exception 'DUPLICATE_INVOICE' using errcode = '23505';
  end if;
  v_credit := coalesce(po.credit_days, (select credit_days from public.suppliers where id = (p ->> 'supplier_id')::uuid), 0);
  insert into public.invoices(org_id, supplier_id, po_id, invoice_no, invoice_date, due_date, net_amount, vat_amount, total, shipping_charged, note, file_path)
  values (v_org, (p ->> 'supplier_id')::uuid, v_po, btrim(p ->> 'invoice_no'), (p ->> 'invoice_date')::date, (p ->> 'invoice_date')::date + v_credit,
          v_net, v_vat, v_net + v_vat, coalesce((p ->> 'shipping_charged')::numeric, 0), p ->> 'note', p ->> 'file_path')
  returning id into v_id;
  for l in select * from jsonb_array_elements(p -> 'lines') loop
    if coalesce((l ->> 'qty')::numeric, 0) <= 0 or coalesce((l ->> 'unit_price')::numeric, -1) < 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if (l ->> 'po_line_id') is not null and not exists (select 1 from public.po_lines where id = (l ->> 'po_line_id')::uuid and po_id = v_po) then
      raise exception 'LINE_NOT_ON_PO' using errcode = '22023'; end if;
    insert into public.invoice_lines(invoice_id, po_line_id, description, qty, unit_price, line_net)
    values (v_id, (l ->> 'po_line_id')::uuid, l ->> 'description', (l ->> 'qty')::numeric, (l ->> 'unit_price')::numeric,
            round((l ->> 'qty')::numeric * (l ->> 'unit_price')::numeric, 2));
  end loop;
  v_match := public.invoice_match(v_id);
  v_res := jsonb_build_object('id', v_id, 'match', v_match);
  perform public.audit(v_org, 'rpc:invoice_register', 'invoice', v_id::text, (p ->> 'invoice_no') || ' ' || (v_net + v_vat));
  return public.idem_end(v_org, p_idem, v_res);
end $$;

create or replace function public.invoice_recheck(p_invoice uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i public.invoices;
begin
  select * into i from public.invoices where id = p_invoice;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(i.org_id, 'invoices.register');
  return public.invoice_match(p_invoice);
end $$;

create or replace function public.invoice_approve(p_invoice uuid, p_comment text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i public.invoices; v_prev jsonb; v_match jsonb; po public.purchase_orders; v_sod boolean; v_uid uuid := (select auth.uid()); v_res jsonb;
begin
  select * into i from public.invoices where id = p_invoice for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(i.org_id, p_idem, 'invoice_approve');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(i.org_id, 'invoices.approve_payment');
  if i.status not in ('registered', 'matched', 'exception') then raise exception 'BAD_STATUS:%', i.status using errcode = 'P0001'; end if;
  if i.po_id is not null then
    select * into po from public.purchase_orders where id = i.po_id for update;
    perform public.require_site(i.org_id, po.site_id);
  end if;
  v_sod := coalesce((public.app_setting(i.org_id, 'enforce_sod') #>> '{}')::boolean, true);
  if v_sod and (i.registered_by = v_uid or po.created_by = v_uid) then raise exception 'SOD_CREATOR' using errcode = '42501'; end if;
  v_match := public.invoice_match(i.id);
  if v_match ->> 'status' = 'exception' and char_length(btrim(coalesce(p_comment, ''))) < 5 then raise exception 'COMMENT_REQUIRED' using errcode = '22023'; end if;
  update public.invoices set status = 'approved', approved_by = v_uid, approved_at = now(), approval_comment = nullif(btrim(p_comment), '') where id = i.id;
  insert into public.approvals(org_id, doc_type, doc_id, step, required_role, reason, status, decided_by, decided_at, comment)
  values (i.org_id, 'invoice', i.id, 1, public.my_role(i.org_id), case when v_match ->> 'status' = 'exception' then 'exception' else 'amount' end,
          'approved', v_uid, now(), nullif(btrim(p_comment), ''));
  -- a received order whose received goods are all invoiced and approved is closed
  if po.id is not null and po.status in ('received', 'inspected') and not exists (
      select 1 from public.po_lines pl where pl.po_id = po.id and pl.received_qty - pl.returned_qty >
        (select coalesce(sum(x.qty), 0) from public.invoice_lines x join public.invoices xi on xi.id = x.invoice_id
          where x.po_line_id = pl.id and xi.status in ('approved', 'paid'))) then
    update public.purchase_orders set status = 'closed', closed_at = now() where id = po.id;
  end if;
  v_res := jsonb_build_object('id', i.id, 'status', 'approved', 'match', v_match);
  perform public.audit(i.org_id, 'rpc:invoice_approve', 'invoice', i.id::text, i.invoice_no || ' ' || i.total || coalesce(': ' || p_comment, ''));
  return public.idem_end(i.org_id, p_idem, v_res);
end $$;

create or replace function public.invoice_pay(p_invoice uuid, p_paid_on date, p_ref text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i public.invoices;
begin
  select * into i from public.invoices where id = p_invoice for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(i.org_id, 'invoices.approve_payment');
  if i.status <> 'approved' then raise exception 'BAD_STATUS:%', i.status using errcode = 'P0001'; end if;
  update public.invoices set status = 'paid', paid_at = coalesce(p_paid_on, current_date), payment_ref = p_ref where id = i.id;
  perform public.audit(i.org_id, 'rpc:invoice_pay', 'invoice', i.id::text, i.invoice_no || ' ' || i.total || coalesce(' ' || p_ref, ''));
  return jsonb_build_object('id', i.id, 'status', 'paid');
end $$;

create or replace function public.invoice_reject(p_invoice uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i public.invoices;
begin
  select * into i from public.invoices where id = p_invoice for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not (public.has_perm(i.org_id, 'invoices.approve_payment') or public.has_perm(i.org_id, 'invoices.register')) then
    raise exception 'FORBIDDEN:invoices.register' using errcode = '42501'; end if;
  if i.status in ('paid', 'rejected') then raise exception 'BAD_STATUS:%', i.status using errcode = 'P0001'; end if;
  if i.status = 'approved' and not public.has_perm(i.org_id, 'invoices.approve_payment') then raise exception 'FORBIDDEN:invoices.approve_payment' using errcode = '42501'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  update public.invoices set status = 'rejected', rejected_reason = p_reason where id = i.id;
  perform public.audit(i.org_id, 'rpc:invoice_reject', 'invoice', i.id::text, i.invoice_no || ': ' || p_reason);
  return jsonb_build_object('id', i.id, 'status', 'rejected');
end $$;
