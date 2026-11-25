-- 004: procurement documents. Purchase requests, RFQs and quotes, purchase orders, receipts, supplier returns,
-- invoices, budgets, approval rules and approvals. Documents change state only through the functions in 005.

-- ---------------------------------------------------------------- approval rules (configurable per organization)
-- A document whose net amount falls in [min_amount, max_amount) needs every step listed for that band, in order.
create table public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  doc_type text not null check (doc_type in ('request', 'po')),
  min_amount numeric(14,2) not null default 0 check (min_amount >= 0),
  max_amount numeric(14,2),
  step int not null check (step between 1 and 5),
  required_role public.app_role not null,
  check (max_amount is null or max_amount > min_amount)
);
create index approval_rules_org_idx on public.approval_rules(org_id, doc_type);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  doc_type text not null check (doc_type in ('request', 'po', 'invoice')),
  doc_id uuid not null,
  revision int not null default 0,
  step int not null,
  required_role public.app_role not null,
  reason text not null default 'amount' check (reason in ('amount', 'over_budget', 'exception')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'superseded')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index approvals_doc_idx on public.approvals(doc_type, doc_id);
create index approvals_pending_idx on public.approvals(org_id, status) where status = 'pending';

-- ---------------------------------------------------------------- budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  name text not null check (char_length(name) between 1 and 120),
  site_id uuid references public.sites(id),          -- null: the whole organization
  category_id uuid references public.categories(id),  -- null: all categories
  project text check (char_length(project) <= 120),
  department text check (char_length(department) <= 120),
  owner_id uuid references public.profiles(id),
  period_start date not null,
  period_end date not null,
  original_amount numeric(14,2) not null check (original_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create index budgets_org_idx on public.budgets(org_id, period_start, period_end);

create table public.budget_revisions (
  id bigserial primary key,
  org_id uuid not null references public.orgs(id),
  budget_id uuid not null references public.budgets(id),
  delta numeric(14,2) not null check (delta <> 0),
  reason text not null check (char_length(reason) between 2 and 500),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create trigger budget_revisions_append_only before update or delete on public.budget_revisions for each row execute function public.forbid_change();

-- ---------------------------------------------------------------- purchase requests
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  revision int not null default 0,                -- bumps when a rejected request is resubmitted
  site_id uuid not null references public.sites(id),
  requested_by uuid not null references public.profiles(id) default auth.uid(),
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'high', 'critical')),
  reason text check (char_length(reason) <= 2000),
  needed_by date,
  project text check (char_length(project) <= 120),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'fulfilled', 'cancelled')),
  est_total numeric(14,2) not null default 0,
  submitted_at timestamptz,
  decided_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index requests_number_uq on public.requests(org_id, number);
create index requests_site_status_idx on public.requests(site_id, status);

create table public.request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id),
  line_no int not null,
  item_id uuid references public.items(id),
  description text check (char_length(description) <= 500),   -- for an item not yet in the catalog
  qty numeric(14,3) not null check (qty > 0),
  est_unit_price numeric(14,4) check (est_unit_price >= 0),
  note text check (char_length(note) <= 500),
  -- how the line is being covered
  reserved_qty numeric(14,3) not null default 0 check (reserved_qty >= 0),
  transfer_qty numeric(14,3) not null default 0 check (transfer_qty >= 0),
  ordered_qty numeric(14,3) not null default 0 check (ordered_qty >= 0),
  check (item_id is not null or description is not null)
);
create index request_lines_request_idx on public.request_lines(request_id);
create index request_lines_item_idx on public.request_lines(item_id);

-- ---------------------------------------------------------------- RFQs and supplier quotes
create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  title text not null check (char_length(title) between 1 and 200),
  request_id uuid references public.requests(id),
  site_id uuid not null references public.sites(id),          -- delivery site
  status text not null default 'open' check (status in ('open', 'awarded', 'cancelled')),
  due_date date,
  note text check (char_length(note) <= 2000),
  awarded_quote_id uuid,
  award_reason text check (char_length(award_reason) <= 1000),
  awarded_by uuid references public.profiles(id),
  awarded_at timestamptz,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index rfqs_number_uq on public.rfqs(org_id, number);

create table public.rfq_lines (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id),
  line_no int not null,
  item_id uuid not null references public.items(id),
  qty numeric(14,3) not null check (qty > 0),
  request_line_id uuid references public.request_lines(id),
  note text check (char_length(note) <= 500)
);
create index rfq_lines_rfq_idx on public.rfq_lines(rfq_id);

create table public.rfq_suppliers (
  rfq_id uuid not null references public.rfqs(id),
  supplier_id uuid not null references public.suppliers(id),
  invited_at timestamptz not null default now(),
  primary key (rfq_id, supplier_id)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  rfq_id uuid not null references public.rfqs(id),
  supplier_id uuid not null references public.suppliers(id),
  quote_no text check (char_length(quote_no) <= 60),
  received_on date not null default current_date,
  valid_until date,
  delivery_days int check (delivery_days between 0 and 365),
  payment_terms text check (char_length(payment_terms) <= 120),
  credit_days int check (credit_days between 0 and 365),
  shipping_cost numeric(14,2) not null default 0 check (shipping_cost >= 0),
  order_discount_pct numeric(5,2) not null default 0 check (order_discount_pct between 0 and 100),
  prices_include_vat boolean not null default false,
  warranty text check (char_length(warranty) <= 300),
  notes text check (char_length(notes) <= 2000),
  file_path text,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  entered_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index quotes_rfq_supplier_uq on public.quotes(rfq_id, supplier_id);

create table public.quote_lines (
  quote_id uuid not null references public.quotes(id),
  rfq_line_id uuid not null references public.rfq_lines(id),
  unit_price numeric(14,4) check (unit_price >= 0),            -- null: not quoted
  min_qty numeric(14,3) check (min_qty >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  note text check (char_length(note) <= 300),
  primary key (quote_id, rfq_line_id)
);

-- ---------------------------------------------------------------- purchase orders
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  revision int not null default 0,
  supplier_id uuid not null references public.suppliers(id),
  site_id uuid not null references public.sites(id),          -- delivery site
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'rejected', 'sent', 'supplier_confirmed', 'in_delivery',
    'partially_received', 'received', 'inspected', 'closed', 'cancelled')),
  request_id uuid references public.requests(id),
  rfq_id uuid references public.rfqs(id),
  quote_id uuid references public.quotes(id),
  order_date date not null default current_date,
  expected_date date,
  payment_terms text check (char_length(payment_terms) <= 120),
  credit_days int check (credit_days between 0 and 365),
  currency text not null default 'ILS',
  vat_rate numeric(5,4) not null check (vat_rate between 0 and 1),
  order_discount numeric(14,2) not null default 0 check (order_discount >= 0),
  shipping_cost numeric(14,2) not null default 0 check (shipping_cost >= 0),
  -- computed by po_recalc(); never trusted from the client
  subtotal numeric(14,2) not null default 0,
  net_total numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  over_budget boolean not null default false,
  warnings jsonb not null default '[]'::jsonb,
  notes text check (char_length(notes) <= 2000),              -- printed on the order
  internal_notes text check (char_length(internal_notes) <= 2000),
  created_by uuid not null references public.profiles(id) default auth.uid(),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  supplier_confirmed_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_discount <= subtotal + shipping_cost or status = 'draft')
);
create unique index po_number_uq on public.purchase_orders(org_id, number);
create index po_supplier_idx on public.purchase_orders(supplier_id, order_date desc);
create index po_site_status_idx on public.purchase_orders(site_id, status);
create index po_org_status_idx on public.purchase_orders(org_id, status);

create table public.po_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id),
  line_no int not null,
  item_id uuid not null references public.items(id),
  description text check (char_length(description) <= 500),
  qty numeric(14,3) not null check (qty > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  line_net numeric(14,2) not null default 0,
  received_qty numeric(14,3) not null default 0 check (received_qty >= 0),
  rejected_qty numeric(14,3) not null default 0 check (rejected_qty >= 0),
  returned_qty numeric(14,3) not null default 0 check (returned_qty >= 0),
  cancelled_qty numeric(14,3) not null default 0 check (cancelled_qty >= 0),
  request_line_id uuid references public.request_lines(id),
  check (returned_qty <= received_qty),
  check (cancelled_qty <= qty)
);
create index po_lines_po_idx on public.po_lines(po_id);
create index po_lines_item_idx on public.po_lines(item_id);
create index po_lines_request_line_idx on public.po_lines(request_line_id);

-- ---------------------------------------------------------------- receipts (goods received against an order)
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  po_id uuid not null references public.purchase_orders(id),
  site_id uuid not null references public.sites(id),
  delivery_note_no text check (char_length(delivery_note_no) <= 60),
  received_at timestamptz not null default now(),
  received_by uuid references public.profiles(id) default auth.uid(),
  on_time boolean,                                             -- received on or before the expected date
  quality_rating int check (quality_rating between 1 and 5),
  service_rating int check (service_rating between 1 and 5),
  note text check (char_length(note) <= 1000)
);
create unique index receipts_number_uq on public.receipts(org_id, number);
create index receipts_po_idx on public.receipts(po_id);

create table public.receipt_lines (
  receipt_id uuid not null references public.receipts(id),
  po_line_id uuid not null references public.po_lines(id),
  qty_accepted numeric(14,3) not null default 0 check (qty_accepted >= 0),
  qty_rejected numeric(14,3) not null default 0 check (qty_rejected >= 0),
  reject_reason text check (char_length(reject_reason) <= 300),
  primary key (receipt_id, po_line_id),
  check (qty_accepted + qty_rejected > 0)
);

create table public.supplier_returns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  number text not null,
  po_id uuid not null references public.purchase_orders(id),
  reason text not null check (char_length(reason) between 2 and 500),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.supplier_return_lines (
  return_id uuid not null references public.supplier_returns(id),
  po_line_id uuid not null references public.po_lines(id),
  qty numeric(14,3) not null check (qty > 0),
  from_damaged boolean not null default false,
  primary key (return_id, po_line_id)
);

-- ---------------------------------------------------------------- supplier invoices and three-way match
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  supplier_id uuid not null references public.suppliers(id),
  po_id uuid references public.purchase_orders(id),
  invoice_no text not null check (char_length(invoice_no) between 1 and 60),
  invoice_date date not null,
  due_date date,
  net_amount numeric(14,2) not null check (net_amount >= 0),
  vat_amount numeric(14,2) not null check (vat_amount >= 0),
  total numeric(14,2) not null check (total >= 0),
  shipping_charged numeric(14,2) not null default 0 check (shipping_charged >= 0),
  status text not null default 'registered' check (status in ('registered', 'matched', 'exception', 'approved', 'paid', 'rejected')),
  match_result jsonb,
  file_path text,
  note text check (char_length(note) <= 1000),
  registered_by uuid references public.profiles(id) default auth.uid(),
  registered_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  approval_comment text check (char_length(approval_comment) <= 1000),
  paid_at date,
  payment_ref text check (char_length(payment_ref) <= 80),
  rejected_reason text check (char_length(rejected_reason) <= 500),
  check (total = net_amount + vat_amount)
);
-- the same supplier invoice number can never be registered twice
create unique index invoices_no_uq on public.invoices(org_id, supplier_id, lower(btrim(invoice_no)));
create index invoices_po_idx on public.invoices(po_id);
create index invoices_status_idx on public.invoices(org_id, status);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  po_line_id uuid references public.po_lines(id),              -- null: a charge that is not on the order
  description text check (char_length(description) <= 300),
  qty numeric(14,3) not null check (qty > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  line_net numeric(14,2) not null
);
create index invoice_lines_invoice_idx on public.invoice_lines(invoice_id);
create index invoice_lines_po_line_idx on public.invoice_lines(po_line_id);

-- ---------------------------------------------------------------- triggers
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();
create trigger po_touch before update on public.purchase_orders for each row execute function public.touch_updated_at();
create trigger quotes_touch before update on public.quotes for each row execute function public.touch_updated_at();
create trigger audit_requests after insert or update on public.requests for each row execute function public.audit_row();
create trigger audit_po after insert or update on public.purchase_orders for each row execute function public.audit_row();
create trigger audit_invoices after insert or update on public.invoices for each row execute function public.audit_row();
create trigger audit_budgets after insert or update on public.budgets for each row execute function public.audit_row();
create trigger audit_approval_rules after insert or update or delete on public.approval_rules for each row execute function public.audit_row();
create trigger audit_approvals after insert or update on public.approvals for each row execute function public.audit_row();
create trigger audit_rfqs after insert or update on public.rfqs for each row execute function public.audit_row();
create trigger audit_quotes after insert or update on public.quotes for each row execute function public.audit_row();
create trigger receipts_append_only before update or delete on public.receipts for each row execute function public.forbid_change();
create trigger receipt_lines_append_only before update or delete on public.receipt_lines for each row execute function public.forbid_change();
create trigger requests_no_delete before delete on public.requests for each row execute function public.forbid_delete();
create trigger po_no_delete before delete on public.purchase_orders for each row execute function public.forbid_delete();
create trigger invoices_no_delete before delete on public.invoices for each row execute function public.forbid_delete();
create trigger approvals_no_delete before delete on public.approvals for each row execute function public.forbid_delete();

-- A quote cannot change once its RFQ was awarded (the order was priced from it).
create or replace function public.quote_lock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_rfq uuid; v_status text;
begin
  if tg_table_name = 'quotes' then v_rfq := coalesce(new.rfq_id, old.rfq_id);
  else select q.rfq_id into v_rfq from public.quotes q where q.id = coalesce(new.quote_id, old.quote_id); end if;
  select status into v_status from public.rfqs where id = v_rfq;
  if v_status <> 'open' then raise exception 'RFQ_CLOSED' using errcode = 'P0001'; end if;
  return coalesce(new, old);
end $$;
create trigger quotes_lock before insert or update or delete on public.quotes for each row execute function public.quote_lock();
create trigger quote_lines_lock before insert or update or delete on public.quote_lines for each row execute function public.quote_lock();

-- ---------------------------------------------------------------- RLS
alter table public.approval_rules enable row level security;
alter table public.approvals enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_revisions enable row level security;
alter table public.requests enable row level security;
alter table public.request_lines enable row level security;
alter table public.rfqs enable row level security;
alter table public.rfq_lines enable row level security;
alter table public.rfq_suppliers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_lines enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_lines enable row level security;
alter table public.supplier_returns enable row level security;
alter table public.supplier_return_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

revoke all on public.approval_rules, public.approvals, public.budgets, public.budget_revisions, public.requests, public.request_lines,
  public.rfqs, public.rfq_lines, public.rfq_suppliers, public.quotes, public.quote_lines, public.purchase_orders, public.po_lines,
  public.receipts, public.receipt_lines, public.supplier_returns, public.supplier_return_lines, public.invoices, public.invoice_lines from anon, authenticated;
grant select on public.approval_rules, public.approvals, public.budgets, public.budget_revisions, public.requests, public.request_lines,
  public.rfqs, public.rfq_lines, public.rfq_suppliers, public.quotes, public.quote_lines, public.purchase_orders, public.po_lines,
  public.receipts, public.receipt_lines, public.supplier_returns, public.supplier_return_lines, public.invoices, public.invoice_lines to authenticated;

-- Quotes are typed in by buyers directly (the lock trigger guards awarded RFQs).
grant insert, update on public.quotes, public.quote_lines to authenticated;
grant delete on public.quote_lines to authenticated;
grant insert on public.rfq_suppliers to authenticated;
grant delete on public.rfq_suppliers to authenticated;

create policy rules_select on public.approval_rules for select to authenticated using (public.is_member(org_id));
create policy approvals_select on public.approvals for select to authenticated using (public.is_member(org_id) and (
  public.has_perm(org_id, 'finance.view') or public.has_perm(org_id, 'requests.approve') or public.has_perm(org_id, 'requests.create')));

create policy budgets_select on public.budgets for select to authenticated using (
  public.has_perm(org_id, 'budgets.view') and (case when site_id is null then public.all_sites_member(org_id) else public.can_see_site(org_id, site_id) end));
create policy budget_rev_select on public.budget_revisions for select to authenticated using (
  exists (select 1 from public.budgets b where b.id = budget_id));

create policy requests_select on public.requests for select to authenticated using (public.can_see_site(org_id, site_id));
create policy request_lines_select on public.request_lines for select to authenticated using (
  exists (select 1 from public.requests r where r.id = request_id));

create policy rfqs_select on public.rfqs for select to authenticated using (public.has_perm(org_id, 'finance.view') and public.can_see_site(org_id, site_id));
create policy rfq_lines_select on public.rfq_lines for select to authenticated using (exists (select 1 from public.rfqs r where r.id = rfq_id));
create policy rfq_suppliers_select on public.rfq_suppliers for select to authenticated using (exists (select 1 from public.rfqs r where r.id = rfq_id));
create policy rfq_suppliers_write on public.rfq_suppliers for insert to authenticated with check (
  exists (select 1 from public.rfqs r where r.id = rfq_id and r.status = 'open' and public.has_perm(r.org_id, 'rfq.manage')));
create policy rfq_suppliers_delete on public.rfq_suppliers for delete to authenticated using (
  exists (select 1 from public.rfqs r where r.id = rfq_id and r.status = 'open' and public.has_perm(r.org_id, 'rfq.manage')));
create policy quotes_select on public.quotes for select to authenticated using (exists (select 1 from public.rfqs r where r.id = rfq_id));
create policy quotes_insert on public.quotes for insert to authenticated with check (public.has_perm(org_id, 'rfq.manage')
  and exists (select 1 from public.rfqs r where r.id = rfq_id and r.org_id = quotes.org_id)
  and exists (select 1 from public.suppliers s where s.id = supplier_id and s.org_id = quotes.org_id));
create policy quotes_update on public.quotes for update to authenticated using (public.has_perm(org_id, 'rfq.manage')) with check (public.has_perm(org_id, 'rfq.manage'));
create policy quote_lines_select on public.quote_lines for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id));
create policy quote_lines_write on public.quote_lines for insert to authenticated with check (
  exists (select 1 from public.quotes q join public.rfq_lines rl on rl.id = rfq_line_id and rl.rfq_id = q.rfq_id where q.id = quote_id and public.has_perm(q.org_id, 'rfq.manage')));
create policy quote_lines_update on public.quote_lines for update to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id and public.has_perm(q.org_id, 'rfq.manage')))
  with check (exists (select 1 from public.quotes q join public.rfq_lines rl on rl.id = rfq_line_id and rl.rfq_id = q.rfq_id where q.id = quote_id and public.has_perm(q.org_id, 'rfq.manage')));
create policy quote_lines_delete on public.quote_lines for delete to authenticated using (
  exists (select 1 from public.quotes q where q.id = quote_id and public.has_perm(q.org_id, 'rfq.manage')));

-- Orders and invoices carry money: finance.view plus site scope. Receivers (receipts.post) see the orders of their sites.
create policy po_select on public.purchase_orders for select to authenticated using (
  (public.has_perm(org_id, 'finance.view') or public.has_perm(org_id, 'receipts.post')) and public.can_see_site(org_id, site_id));
create policy po_lines_select on public.po_lines for select to authenticated using (exists (select 1 from public.purchase_orders p where p.id = po_id));
create policy receipts_select on public.receipts for select to authenticated using (public.can_see_site(org_id, site_id));
create policy receipt_lines_select on public.receipt_lines for select to authenticated using (exists (select 1 from public.receipts r where r.id = receipt_id));
create policy sreturns_select on public.supplier_returns for select to authenticated using (exists (select 1 from public.purchase_orders p where p.id = po_id));
create policy sreturn_lines_select on public.supplier_return_lines for select to authenticated using (exists (select 1 from public.supplier_returns r where r.id = return_id));
create policy invoices_select on public.invoices for select to authenticated using (public.has_perm(org_id, 'finance.view')
  and (po_id is null and public.all_sites_member(org_id) or exists (select 1 from public.purchase_orders p where p.id = po_id)));
create policy invoice_lines_select on public.invoice_lines for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id));
