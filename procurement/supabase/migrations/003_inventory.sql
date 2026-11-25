-- 003: inventory. Balances per site and item, an append-only movement ledger, transfers between sites, stock counts,
-- reservations, fixed assets (serial-tracked equipment) and equipment on loan to employees.
-- Balances are changed only by stock_apply(), which every inventory function calls; it locks the balance row,
-- refuses negative stock and writes the ledger line in the same transaction.

-- ---------------------------------------------------------------- idempotency: a retried request returns the first result
create table public.rpc_idempotency (
  org_id uuid not null,
  key text not null check (char_length(key) between 8 and 80),
  fn text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (org_id, key)
);
alter table public.rpc_idempotency enable row level security;
revoke all on public.rpc_idempotency from anon, authenticated;

-- Returns the stored result when this key was already used, otherwise claims the key (null result).
-- A concurrent call with the same key waits on the unique index until the first one commits.
create or replace function public.idem_begin(p_org uuid, p_key text, p_fn text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_res jsonb; v_fn text;
begin
  if p_key is null then return null; end if;
  insert into public.rpc_idempotency(org_id, key, fn) values (p_org, p_key, p_fn) on conflict do nothing;
  if found then return null; end if;
  select result, fn into v_res, v_fn from public.rpc_idempotency where org_id = p_org and key = p_key;
  if v_fn <> p_fn then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023'; end if;
  return coalesce(v_res, '{"replayed": true}'::jsonb) || '{"replayed": true}'::jsonb;
end $$;

create or replace function public.idem_end(p_org uuid, p_key text, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_key is not null then update public.rpc_idempotency set result = p_result where org_id = p_org and key = p_key; end if;
  return p_result;
end $$;

-- ---------------------------------------------------------------- balances and ledger
create table public.stock_balances (
  org_id uuid not null references public.orgs(id),
  site_id uuid not null references public.sites(id),
  item_id uuid not null references public.items(id),
  on_hand numeric(14,3) not null default 0 check (on_hand >= 0),
  reserved numeric(14,3) not null default 0 check (reserved >= 0),
  damaged numeric(14,3) not null default 0 check (damaged >= 0),     -- set aside, not usable, still owned
  avg_cost numeric(14,4) not null default 0 check (avg_cost >= 0),  -- moving average purchase cost
  updated_at timestamptz not null default now(),
  primary key (site_id, item_id)
);
create index stock_balances_item_idx on public.stock_balances(item_id);
create index stock_balances_org_idx on public.stock_balances(org_id);

create table public.stock_movements (
  id bigserial primary key,
  org_id uuid not null references public.orgs(id),
  site_id uuid not null references public.sites(id),
  item_id uuid not null references public.items(id),
  type text not null check (type in (
    'opening', 'receipt', 'issue', 'transfer_out', 'transfer_in', 'return_to_supplier', 'adjustment', 'count',
    'write_off', 'damaged', 'repaired', 'loan_out', 'loan_return', 'reservation_issue')),
  qty_delta numeric(14,3) not null,            -- change to on_hand
  damaged_delta numeric(14,3) not null default 0,
  unit_cost numeric(14,4) not null default 0,  -- cost per unit used for valuation of this line
  ref_type text,                               -- po | receipt | transfer | count | loan | request | asset | manual
  ref_id uuid,
  ref_no text,
  reason text check (char_length(reason) <= 500),
  balance_after numeric(14,3) not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (qty_delta <> 0 or damaged_delta <> 0)
);
create index stock_movements_site_item_idx on public.stock_movements(site_id, item_id, created_at desc);
create index stock_movements_org_at_idx on public.stock_movements(org_id, created_at desc);
create index stock_movements_ref_idx on public.stock_movements(ref_type, ref_id);
create trigger stock_movements_append_only before update or delete on public.stock_movements
  for each row execute function public.forbid_change();

-- Core: apply one change to a balance. Internal only (not granted to clients).
-- p_cost: for incoming stock, the unit purchase cost (moves the average); for outgoing stock it is ignored and the
-- current average cost is used. p_allow_reserved: outgoing stock may also consume reserved quantity.
create or replace function public.stock_apply(
  p_org uuid, p_site uuid, p_item uuid, p_type text, p_qty numeric, p_damaged numeric default 0,
  p_cost numeric default null, p_ref_type text default 'manual', p_ref_id uuid default null, p_ref_no text default null,
  p_reason text default null, p_allow_reserved boolean default false)
returns bigint language plpgsql security definer set search_path = '' as $$
declare b public.stock_balances; v_cost numeric; v_id bigint; v_item_org uuid; v_site_org uuid;
begin
  select org_id into v_item_org from public.items where id = p_item;
  select org_id into v_site_org from public.sites where id = p_site;
  if v_item_org is distinct from p_org or v_site_org is distinct from p_org then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  if p_qty = 0 and coalesce(p_damaged, 0) = 0 then raise exception 'ZERO_QTY' using errcode = '22023'; end if;

  insert into public.stock_balances(org_id, site_id, item_id) values (p_org, p_site, p_item) on conflict do nothing;
  select * into b from public.stock_balances where site_id = p_site and item_id = p_item for update;

  if b.on_hand + p_qty < 0 then raise exception 'INSUFFICIENT_STOCK:%', b.on_hand using errcode = 'P0001'; end if;
  if p_qty < 0 and not p_allow_reserved and b.on_hand - b.reserved + p_qty < 0 then
    raise exception 'STOCK_RESERVED:%', greatest(b.on_hand - b.reserved, 0) using errcode = 'P0001';
  end if;
  if b.damaged + coalesce(p_damaged, 0) < 0 then raise exception 'INSUFFICIENT_DAMAGED:%', b.damaged using errcode = 'P0001'; end if;

  if p_qty > 0 and p_cost is not null and p_type in ('opening', 'receipt', 'transfer_in', 'adjustment', 'count', 'loan_return', 'repaired') then
    v_cost := p_cost;
    if p_type in ('opening', 'receipt', 'transfer_in') and b.on_hand + p_qty > 0 then
      update public.stock_balances set avg_cost = round((b.on_hand * b.avg_cost + p_qty * p_cost) / (b.on_hand + p_qty), 4)
      where site_id = p_site and item_id = p_item;
    end if;
  else
    v_cost := b.avg_cost;
  end if;

  update public.stock_balances
     set on_hand = on_hand + p_qty, damaged = damaged + coalesce(p_damaged, 0), updated_at = now()
   where site_id = p_site and item_id = p_item;

  insert into public.stock_movements(org_id, site_id, item_id, type, qty_delta, damaged_delta, unit_cost, ref_type, ref_id, ref_no, reason, balance_after, created_by)
  values (p_org, p_site, p_item, p_type, p_qty, coalesce(p_damaged, 0), coalesce(v_cost, 0), p_ref_type, p_ref_id, p_ref_no, p_reason, b.on_hand + p_qty, (select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- manual stock operations (one RPC, typed)
-- p_op: opening | issue | adjustment | write_off | damaged | repaired | write_off_damaged
create or replace function public.stock_operation(
  p_org uuid, p_site uuid, p_item uuid, p_op text, p_qty numeric, p_reason text default null,
  p_unit_cost numeric default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_prev jsonb; v_id bigint; v_res jsonb;
begin
  v_prev := public.idem_begin(p_org, p_idem, 'stock_operation');
  if v_prev is not null then return v_prev; end if;
  perform public.require_site(p_org, p_site);
  if p_qty is null or (p_op <> 'adjustment' and p_qty <= 0) or p_qty = 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
  if p_op in ('adjustment', 'write_off', 'write_off_damaged', 'opening') then
    perform public.require_perm(p_org, 'stock.adjust');
    if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  else
    perform public.require_perm(p_org, 'stock.move');
  end if;
  if p_op = 'damaged' and coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  if p_unit_cost is not null and p_unit_cost < 0 then raise exception 'BAD_COST' using errcode = '22023'; end if;

  v_id := case p_op
    when 'opening'           then public.stock_apply(p_org, p_site, p_item, 'opening', p_qty, 0, p_unit_cost, 'manual', null, null, p_reason)
    when 'issue'             then public.stock_apply(p_org, p_site, p_item, 'issue', -p_qty, 0, null, 'manual', null, null, p_reason)
    when 'adjustment'        then public.stock_apply(p_org, p_site, p_item, 'adjustment', p_qty, 0, p_unit_cost, 'manual', null, null, p_reason)
    when 'write_off'         then public.stock_apply(p_org, p_site, p_item, 'write_off', -p_qty, 0, null, 'manual', null, null, p_reason)
    when 'damaged'           then public.stock_apply(p_org, p_site, p_item, 'damaged', -p_qty, p_qty, null, 'manual', null, null, p_reason)
    when 'repaired'          then public.stock_apply(p_org, p_site, p_item, 'repaired', p_qty, -p_qty, null, 'manual', null, null, p_reason)
    when 'write_off_damaged' then public.stock_apply(p_org, p_site, p_item, 'write_off', 0, -p_qty, null, 'manual', null, null, p_reason)
    else null end;
  if v_id is null then raise exception 'BAD_OPERATION' using errcode = '22023'; end if;
  v_res := jsonb_build_object('movement_id', v_id);
  perform public.audit(p_org, 'rpc:stock_operation', 'stock', p_item::text, p_op || ' ' || p_qty, null,
    jsonb_build_object('site_id', p_site, 'item_id', p_item, 'op', p_op, 'qty', p_qty, 'reason', p_reason));
  return public.idem_end(p_org, p_idem, v_res);
end $$;

-- ---------------------------------------------------------------- reservations (stock held for an approved request)
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  site_id uuid not null references public.sites(id),
  item_id uuid not null references public.items(id),
  qty numeric(14,3) not null check (qty > 0),
  consumed_qty numeric(14,3) not null default 0 check (consumed_qty >= 0),
  request_line_id uuid,
  -- stock: held from what was on the shelf (covers the request line); po: goods bought for the request (already covered by the order)
  source text not null default 'stock' check (source in ('stock', 'po')),
  status text not null default 'active' check (status in ('active', 'consumed', 'released')),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (consumed_qty <= qty)
);
create index reservations_site_item_idx on public.reservations(site_id, item_id) where status = 'active';

-- ---------------------------------------------------------------- transfers between sites
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  from_site_id uuid not null references public.sites(id),
  to_site_id uuid not null references public.sites(id),
  status text not null default 'draft' check (status in ('draft', 'shipped', 'received', 'cancelled')),
  request_id uuid,
  note text check (char_length(note) <= 1000),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  shipped_by uuid references public.profiles(id), shipped_at timestamptz,
  received_by uuid references public.profiles(id), received_at timestamptz,
  check (from_site_id <> to_site_id)
);
create unique index transfers_number_uq on public.transfers(org_id, number);

create table public.transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfers(id),
  item_id uuid not null references public.items(id),
  qty numeric(14,3) not null check (qty > 0),
  received_qty numeric(14,3) not null default 0 check (received_qty >= 0),
  unit_cost numeric(14,4),
  request_line_id uuid,                       -- the purchase-request line this transfer covers
  check (received_qty <= qty)
);
create index transfer_lines_transfer_idx on public.transfer_lines(transfer_id);

-- p_lines: [{item_id, qty, request_line_id?}]
create or replace function public.transfer_create(p_org uuid, p_from uuid, p_to uuid, p_lines jsonb, p_note text default null,
  p_request_id uuid default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_prev jsonb; v_id uuid; v_no text; l jsonb; v_res jsonb;
begin
  v_prev := public.idem_begin(p_org, p_idem, 'transfer_create');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(p_org, 'stock.transfer');
  -- the source must be visible; the destination must belong to the same org
  perform public.require_site(p_org, p_from);
  if not exists (select 1 from public.sites where id = p_to and org_id = p_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  if p_from = p_to then raise exception 'SAME_SITE' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(p_lines, '[]')) = 0 then raise exception 'NO_LINES' using errcode = '22023'; end if;
  v_no := public.next_doc_no(p_org, 'TR');
  insert into public.transfers(org_id, number, from_site_id, to_site_id, note, request_id) values (p_org, v_no, p_from, p_to, p_note, p_request_id)
  returning id into v_id;
  for l in select * from jsonb_array_elements(p_lines) loop
    if (l ->> 'qty')::numeric <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if not exists (select 1 from public.items where id = (l ->> 'item_id')::uuid and org_id = p_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
    insert into public.transfer_lines(transfer_id, item_id, qty, request_line_id)
    values (v_id, (l ->> 'item_id')::uuid, (l ->> 'qty')::numeric, (l ->> 'request_line_id')::uuid);
    if (l ->> 'request_line_id') is not null then perform public.request_line_refresh((l ->> 'request_line_id')::uuid, true); end if;
  end loop;
  v_res := jsonb_build_object('id', v_id, 'number', v_no);
  perform public.audit(p_org, 'rpc:transfer_create', 'transfer', v_id::text, v_no, null, p_lines);
  return public.idem_end(p_org, p_idem, v_res);
end $$;

create or replace function public.transfer_ship(p_transfer uuid, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.transfers; l public.transfer_lines; v_prev jsonb; v_cost numeric; v_res jsonb;
begin
  select * into t from public.transfers where id = p_transfer for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(t.org_id, p_idem, 'transfer_ship');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(t.org_id, 'stock.transfer');
  perform public.require_site(t.org_id, t.from_site_id);
  if t.status <> 'draft' then raise exception 'BAD_STATUS:%', t.status using errcode = 'P0001'; end if;
  for l in select * from public.transfer_lines where transfer_id = t.id loop
    select avg_cost into v_cost from public.stock_balances where site_id = t.from_site_id and item_id = l.item_id;
    perform public.stock_apply(t.org_id, t.from_site_id, l.item_id, 'transfer_out', -l.qty, 0, null, 'transfer', t.id, t.number, 'העברה ל' || (select name from public.sites where id = t.to_site_id));
    update public.transfer_lines set unit_cost = coalesce(v_cost, 0) where id = l.id;
  end loop;
  update public.transfers set status = 'shipped', shipped_by = (select auth.uid()), shipped_at = now() where id = t.id;
  v_res := jsonb_build_object('id', t.id, 'status', 'shipped');
  perform public.audit(t.org_id, 'rpc:transfer_ship', 'transfer', t.id::text, t.number);
  return public.idem_end(t.org_id, p_idem, v_res);
end $$;

-- p_lines: [{line_id, received_qty}] – omitted lines are received in full. Shortfall is recorded as a loss on the transfer.
create or replace function public.transfer_receive(p_transfer uuid, p_lines jsonb default null, p_note text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.transfers; l public.transfer_lines; v_prev jsonb; v_q numeric; v_short numeric := 0; v_res jsonb;
begin
  select * into t from public.transfers where id = p_transfer for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(t.org_id, p_idem, 'transfer_receive');
  if v_prev is not null then return v_prev; end if;
  if not (public.has_perm(t.org_id, 'stock.move') or public.has_perm(t.org_id, 'receipts.post')) then raise exception 'FORBIDDEN:stock.move' using errcode = '42501'; end if;
  perform public.require_site(t.org_id, t.to_site_id);
  if t.status <> 'shipped' then raise exception 'BAD_STATUS:%', t.status using errcode = 'P0001'; end if;
  for l in select * from public.transfer_lines where transfer_id = t.id for update loop
    v_q := coalesce((select (x ->> 'received_qty')::numeric from jsonb_array_elements(coalesce(p_lines, '[]')) x where (x ->> 'line_id')::uuid = l.id), l.qty);
    if v_q < 0 or v_q > l.qty then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if v_q > 0 then
      perform public.stock_apply(t.org_id, t.to_site_id, l.item_id, 'transfer_in', v_q, 0, l.unit_cost, 'transfer', t.id, t.number, 'העברה מ' || (select name from public.sites where id = t.from_site_id));
    end if;
    v_short := v_short + (l.qty - v_q) * coalesce(l.unit_cost, 0);
    update public.transfer_lines set received_qty = v_q where id = l.id;
  end loop;
  update public.transfers set status = 'received', received_by = (select auth.uid()), received_at = now(),
    note = concat_ws(' | ', note, nullif(p_note, '')) where id = t.id;
  v_res := jsonb_build_object('id', t.id, 'status', 'received', 'shortage_value', round(v_short, 2));
  perform public.audit(t.org_id, 'rpc:transfer_receive', 'transfer', t.id::text, t.number || case when v_short > 0 then ' חוסר בשווי ' || round(v_short, 2) else '' end);
  return public.idem_end(t.org_id, p_idem, v_res);
end $$;

create or replace function public.transfer_cancel(p_transfer uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  select * into t from public.transfers where id = p_transfer for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(t.org_id, 'stock.transfer');
  perform public.require_site(t.org_id, t.from_site_id);
  if t.status <> 'draft' then raise exception 'BAD_STATUS:%', t.status using errcode = 'P0001'; end if;
  update public.transfers set status = 'cancelled', note = concat_ws(' | ', note, 'בוטל: ' || coalesce(p_reason, '')) where id = t.id;
  perform public.request_line_refresh(tl.request_line_id, false) from public.transfer_lines tl where tl.transfer_id = t.id and tl.request_line_id is not null;
  perform public.audit(t.org_id, 'rpc:transfer_cancel', 'transfer', t.id::text, t.number || ' ' || coalesce(p_reason, ''));
  return jsonb_build_object('id', t.id, 'status', 'cancelled');
end $$;

-- ---------------------------------------------------------------- stock counts
create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  site_id uuid not null references public.sites(id),
  status text not null default 'open' check (status in ('open', 'posted', 'cancelled')),
  note text check (char_length(note) <= 1000),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  posted_by uuid references public.profiles(id), posted_at timestamptz
);
create table public.stock_count_lines (
  count_id uuid not null references public.stock_counts(id),
  item_id uuid not null references public.items(id),
  counted_qty numeric(14,3) check (counted_qty >= 0),
  system_qty_at_post numeric(14,3),
  diff_qty numeric(14,3),
  diff_value numeric(14,2),
  counted_by uuid references public.profiles(id),
  counted_at timestamptz,
  primary key (count_id, item_id)
);

-- Opens a count for a site; lines for every item with a balance there (more can be added by counting them).
create or replace function public.count_open(p_org uuid, p_site uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_no text;
begin
  perform public.require_perm(p_org, 'stock.count');
  perform public.require_site(p_org, p_site);
  if exists (select 1 from public.stock_counts where site_id = p_site and status = 'open') then raise exception 'COUNT_ALREADY_OPEN' using errcode = 'P0001'; end if;
  v_no := public.next_doc_no(p_org, 'CNT');
  insert into public.stock_counts(org_id, number, site_id, note) values (p_org, v_no, p_site, p_note) returning id into v_id;
  insert into public.stock_count_lines(count_id, item_id)
  select v_id, b.item_id from public.stock_balances b where b.site_id = p_site and (b.on_hand > 0 or b.damaged > 0);
  perform public.audit(p_org, 'rpc:count_open', 'count', v_id::text, v_no);
  return jsonb_build_object('id', v_id, 'number', v_no);
end $$;

-- p_lines: [{item_id, counted_qty}]
create or replace function public.count_record(p_count uuid, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.stock_counts; l jsonb; n int := 0;
begin
  select * into c from public.stock_counts where id = p_count for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(c.org_id, 'stock.count');
  perform public.require_site(c.org_id, c.site_id);
  if c.status <> 'open' then raise exception 'BAD_STATUS:%', c.status using errcode = 'P0001'; end if;
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]')) loop
    if (l ->> 'counted_qty') is not null and (l ->> 'counted_qty')::numeric < 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
    if not exists (select 1 from public.items where id = (l ->> 'item_id')::uuid and org_id = c.org_id) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
    insert into public.stock_count_lines(count_id, item_id, counted_qty, counted_by, counted_at)
    values (c.id, (l ->> 'item_id')::uuid, (l ->> 'counted_qty')::numeric, (select auth.uid()), now())
    on conflict (count_id, item_id) do update set counted_qty = excluded.counted_qty, counted_by = excluded.counted_by, counted_at = excluded.counted_at;
    n := n + 1;
  end loop;
  return jsonb_build_object('saved', n);
end $$;

-- Posting compares the counted quantity with the balance at that moment and writes a 'count' movement for each difference.
-- Lines left uncounted are not changed.
create or replace function public.count_post(p_count uuid, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.stock_counts; l public.stock_count_lines; v_prev jsonb; b public.stock_balances; v_diff numeric; v_total numeric := 0; v_lines int := 0; v_res jsonb;
begin
  select * into c from public.stock_counts where id = p_count for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(c.org_id, p_idem, 'count_post');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(c.org_id, 'stock.adjust');
  perform public.require_site(c.org_id, c.site_id);
  if c.status <> 'open' then raise exception 'BAD_STATUS:%', c.status using errcode = 'P0001'; end if;
  for l in select * from public.stock_count_lines where count_id = c.id and counted_qty is not null loop
    insert into public.stock_balances(org_id, site_id, item_id) values (c.org_id, c.site_id, l.item_id) on conflict do nothing;
    select * into b from public.stock_balances where site_id = c.site_id and item_id = l.item_id for update;
    v_diff := l.counted_qty - b.on_hand;
    if v_diff <> 0 then
      if b.on_hand + v_diff < b.reserved then
        -- counted less than is reserved: the reservation can no longer be honoured; reduce it to what exists
        update public.stock_balances set reserved = greatest(b.on_hand + v_diff, 0) where site_id = c.site_id and item_id = l.item_id;
      end if;
      perform public.stock_apply(c.org_id, c.site_id, l.item_id, 'count', v_diff, 0, null, 'count', c.id, c.number, 'ספירת מלאי', true);
      v_lines := v_lines + 1;
    end if;
    update public.stock_count_lines set system_qty_at_post = b.on_hand, diff_qty = v_diff, diff_value = round(v_diff * b.avg_cost, 2)
     where count_id = c.id and item_id = l.item_id;
    v_total := v_total + round(v_diff * b.avg_cost, 2);
  end loop;
  update public.stock_counts set status = 'posted', posted_by = (select auth.uid()), posted_at = now() where id = c.id;
  v_res := jsonb_build_object('id', c.id, 'adjusted_lines', v_lines, 'diff_value', v_total);
  perform public.audit(c.org_id, 'rpc:count_post', 'count', c.id::text, c.number || ' הפרש ' || v_total);
  return public.idem_end(c.org_id, p_idem, v_res);
end $$;

-- ---------------------------------------------------------------- fixed assets (serial-tracked equipment)
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  item_id uuid not null references public.items(id),
  asset_tag text not null check (char_length(asset_tag) between 1 and 40),
  serial_no text check (char_length(serial_no) <= 80),
  purchase_date date,
  purchase_cost numeric(14,2) check (purchase_cost >= 0),
  supplier_id uuid references public.suppliers(id),
  po_id uuid,
  warranty_until date,
  last_service_on date,
  next_service_on date,
  site_id uuid references public.sites(id),
  location text check (char_length(location) <= 120),
  custodian_employee_id uuid references public.employees(id),
  responsible_user_id uuid references public.profiles(id),
  condition text not null default 'good' check (condition in ('new', 'good', 'fair', 'poor', 'broken')),
  status text not null default 'in_service' check (status in ('in_service', 'in_repair', 'on_loan', 'in_storage', 'retired', 'lost')),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index assets_tag_uq on public.assets(org_id, lower(asset_tag));
create unique index assets_serial_uq on public.assets(org_id, item_id, serial_no) where serial_no is not null and serial_no <> '';
create trigger assets_touch before update on public.assets for each row execute function public.touch_updated_at();
create trigger audit_assets after insert or update on public.assets for each row execute function public.audit_row();
create trigger assets_no_delete before delete on public.assets for each row execute function public.forbid_delete();

create table public.asset_events (
  id bigserial primary key,
  org_id uuid not null references public.orgs(id),
  asset_id uuid not null references public.assets(id),
  kind text not null check (kind in ('created', 'moved', 'assigned', 'returned', 'service', 'repair', 'condition', 'retired', 'lost', 'note')),
  at date not null default current_date,
  cost numeric(14,2) check (cost >= 0),
  site_id uuid references public.sites(id),
  employee_id uuid references public.employees(id),
  note text check (char_length(note) <= 1000),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index asset_events_asset_idx on public.asset_events(asset_id, at desc);
create trigger asset_events_append_only before update or delete on public.asset_events for each row execute function public.forbid_change();

-- One function records every asset event and updates the asset accordingly.
-- p: {kind, at, cost, site_id, employee_id, note, condition, next_service_on}
create or replace function public.asset_event(p_asset uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.assets; v_kind text := p ->> 'kind';
begin
  select * into a from public.assets where id = p_asset for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.require_perm(a.org_id, 'stock.move');
  if a.site_id is not null then perform public.require_site(a.org_id, a.site_id); end if;
  if a.status in ('retired', 'lost') and v_kind not in ('note') then raise exception 'ASSET_CLOSED' using errcode = 'P0001'; end if;
  if v_kind = 'moved' then
    if (p ->> 'site_id') is null then raise exception 'SITE_REQUIRED' using errcode = '22023'; end if;
    perform public.require_site(a.org_id, (p ->> 'site_id')::uuid);
    update public.assets set site_id = (p ->> 'site_id')::uuid, location = coalesce(p ->> 'location', location) where id = a.id;
  elsif v_kind = 'assigned' then
    if (p ->> 'employee_id') is null then raise exception 'EMPLOYEE_REQUIRED' using errcode = '22023'; end if;
    update public.assets set custodian_employee_id = (p ->> 'employee_id')::uuid, status = 'on_loan' where id = a.id;
  elsif v_kind = 'returned' then
    update public.assets set custodian_employee_id = null, status = 'in_service', condition = coalesce(p ->> 'condition', condition) where id = a.id;
  elsif v_kind = 'service' then
    update public.assets set last_service_on = coalesce((p ->> 'at')::date, current_date), next_service_on = (p ->> 'next_service_on')::date where id = a.id;
  elsif v_kind = 'repair' then
    update public.assets set status = case when p ->> 'done' = 'true' then 'in_service' else 'in_repair' end, condition = coalesce(p ->> 'condition', condition) where id = a.id;
  elsif v_kind = 'condition' then
    update public.assets set condition = p ->> 'condition' where id = a.id;
  elsif v_kind in ('retired', 'lost') then
    if coalesce(btrim(p ->> 'note'), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
    update public.assets set status = v_kind where id = a.id;
  elsif v_kind <> 'note' then
    raise exception 'BAD_OPERATION' using errcode = '22023';
  end if;
  insert into public.asset_events(org_id, asset_id, kind, at, cost, site_id, employee_id, note)
  values (a.org_id, a.id, v_kind, coalesce((p ->> 'at')::date, current_date), (p ->> 'cost')::numeric, (p ->> 'site_id')::uuid, (p ->> 'employee_id')::uuid, p ->> 'note');
  return jsonb_build_object('id', a.id, 'kind', v_kind);
end $$;

-- Asset records are created directly (stock.move) and get a 'created' event.
create or replace function public.asset_created_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.asset_events(org_id, asset_id, kind, at, cost, site_id, employee_id, note, created_by)
  values (new.org_id, new.id, 'created', coalesce(new.purchase_date, current_date), new.purchase_cost, new.site_id, new.custodian_employee_id, null, (select auth.uid()));
  return new;
end $$;
create trigger assets_created after insert on public.assets for each row execute function public.asset_created_event();

-- ---------------------------------------------------------------- equipment on loan to employees
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  site_id uuid not null references public.sites(id),
  item_id uuid not null references public.items(id),
  employee_id uuid not null references public.employees(id),
  qty numeric(14,3) not null check (qty > 0),
  returned_qty numeric(14,3) not null default 0 check (returned_qty >= 0),
  lost_qty numeric(14,3) not null default 0 check (lost_qty >= 0),
  out_at timestamptz not null default now(),
  due_on date,
  closed_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  note text check (char_length(note) <= 1000),
  created_by uuid references public.profiles(id) default auth.uid(),
  check (returned_qty + lost_qty <= qty)
);
create index loans_open_idx on public.loans(org_id, status, due_on);

create or replace function public.loan_out(p_org uuid, p_site uuid, p_item uuid, p_employee uuid, p_qty numeric, p_due date default null, p_note text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_prev jsonb; v_id uuid; v_res jsonb;
begin
  v_prev := public.idem_begin(p_org, p_idem, 'loan_out');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(p_org, 'stock.move');
  perform public.require_site(p_org, p_site);
  if p_qty is null or p_qty <= 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
  if not exists (select 1 from public.employees where id = p_employee and org_id = p_org and active) then raise exception 'EMPLOYEE_REQUIRED' using errcode = '22023'; end if;
  insert into public.loans(org_id, site_id, item_id, employee_id, qty, due_on, note) values (p_org, p_site, p_item, p_employee, p_qty, p_due, p_note) returning id into v_id;
  perform public.stock_apply(p_org, p_site, p_item, 'loan_out', -p_qty, 0, null, 'loan', v_id, null,
    'נמסר ל' || (select name from public.employees where id = p_employee));
  v_res := jsonb_build_object('id', v_id);
  return public.idem_end(p_org, p_idem, v_res);
end $$;

-- returned: back to stock; damaged: back but set aside; lost: written off
create or replace function public.loan_return(p_loan uuid, p_returned numeric, p_damaged numeric default 0, p_lost numeric default 0, p_note text default null, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.loans; v_prev jsonb; v_open numeric; v_res jsonb;
begin
  select * into l from public.loans where id = p_loan for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  v_prev := public.idem_begin(l.org_id, p_idem, 'loan_return');
  if v_prev is not null then return v_prev; end if;
  perform public.require_perm(l.org_id, 'stock.move');
  perform public.require_site(l.org_id, l.site_id);
  if l.status <> 'open' then raise exception 'BAD_STATUS:%', l.status using errcode = 'P0001'; end if;
  p_returned := coalesce(p_returned, 0); p_damaged := coalesce(p_damaged, 0); p_lost := coalesce(p_lost, 0);
  if p_returned < 0 or p_damaged < 0 or p_lost < 0 or p_returned + p_damaged + p_lost = 0 then raise exception 'BAD_QTY' using errcode = '22023'; end if;
  v_open := l.qty - l.returned_qty - l.lost_qty;
  if p_returned + p_damaged + p_lost > v_open then raise exception 'OVER_RETURN:%', v_open using errcode = 'P0001'; end if;
  if p_lost > 0 and coalesce(btrim(p_note), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;
  if p_returned > 0 then
    perform public.stock_apply(l.org_id, l.site_id, l.item_id, 'loan_return', p_returned, 0, null, 'loan', l.id, null, 'הוחזר');
  end if;
  if p_damaged > 0 then
    perform public.stock_apply(l.org_id, l.site_id, l.item_id, 'loan_return', 0, p_damaged, null, 'loan', l.id, null, 'הוחזר פגום: ' || coalesce(p_note, ''));
  end if;
  update public.loans set returned_qty = returned_qty + p_returned + p_damaged, lost_qty = lost_qty + p_lost,
    status = case when returned_qty + p_returned + p_damaged + lost_qty + p_lost >= qty then 'closed' else 'open' end,
    closed_at = case when returned_qty + p_returned + p_damaged + lost_qty + p_lost >= qty then now() end,
    note = concat_ws(' | ', note, nullif(p_note, ''))
  where id = l.id;
  if p_lost > 0 then
    perform public.audit(l.org_id, 'rpc:loan_lost', 'loan', l.id::text, 'אבד ' || p_lost || ': ' || p_note);
  end if;
  v_res := jsonb_build_object('id', l.id, 'open_qty', v_open - p_returned - p_damaged - p_lost);
  return public.idem_end(l.org_id, p_idem, v_res);
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.reservations enable row level security;
alter table public.transfers enable row level security;
alter table public.transfer_lines enable row level security;
alter table public.stock_counts enable row level security;
alter table public.stock_count_lines enable row level security;
alter table public.assets enable row level security;
alter table public.asset_events enable row level security;
alter table public.loans enable row level security;

revoke all on public.stock_balances, public.stock_movements, public.reservations, public.transfers, public.transfer_lines,
  public.stock_counts, public.stock_count_lines, public.assets, public.asset_events, public.loans from anon, authenticated;
grant select on public.stock_balances, public.stock_movements, public.reservations, public.transfers, public.transfer_lines,
  public.stock_counts, public.stock_count_lines, public.assets, public.asset_events, public.loans to authenticated;
grant insert, update (serial_no, warranty_until, location, responsible_user_id, notes, purchase_cost, purchase_date, supplier_id, next_service_on) on public.assets to authenticated;
grant insert on public.assets to authenticated;

create policy balances_select on public.stock_balances for select to authenticated using (public.has_perm(org_id, 'stock.view') and public.can_see_site(org_id, site_id));
create policy movements_select on public.stock_movements for select to authenticated using (public.has_perm(org_id, 'stock.view') and public.can_see_site(org_id, site_id));
create policy reservations_select on public.reservations for select to authenticated using (public.has_perm(org_id, 'stock.view') and public.can_see_site(org_id, site_id));
create policy transfers_select on public.transfers for select to authenticated using (public.can_see_site(org_id, from_site_id) or public.can_see_site(org_id, to_site_id));
create policy transfer_lines_select on public.transfer_lines for select to authenticated using (
  exists (select 1 from public.transfers t where t.id = transfer_id and (public.can_see_site(t.org_id, t.from_site_id) or public.can_see_site(t.org_id, t.to_site_id))));
create policy counts_select on public.stock_counts for select to authenticated using (public.can_see_site(org_id, site_id));
create policy count_lines_select on public.stock_count_lines for select to authenticated using (
  exists (select 1 from public.stock_counts c where c.id = count_id and public.can_see_site(c.org_id, c.site_id)));
create policy assets_select on public.assets for select to authenticated using (public.has_perm(org_id, 'stock.view') and (site_id is null or public.can_see_site(org_id, site_id)));
create policy assets_insert on public.assets for insert to authenticated with check (public.has_perm(org_id, 'stock.move') and (site_id is null or public.can_see_site(org_id, site_id)));
create policy assets_update on public.assets for update to authenticated
  using (public.has_perm(org_id, 'stock.move') and (site_id is null or public.can_see_site(org_id, site_id)))
  with check (public.has_perm(org_id, 'stock.move') and (site_id is null or public.can_see_site(org_id, site_id)));
create policy asset_events_select on public.asset_events for select to authenticated using (
  exists (select 1 from public.assets a where a.id = asset_id and public.has_perm(a.org_id, 'stock.view') and (a.site_id is null or public.can_see_site(a.org_id, a.site_id))));
create policy loans_select on public.loans for select to authenticated using (public.has_perm(org_id, 'stock.view') and public.can_see_site(org_id, site_id));
