-- Finance: documents (payment requests made here + tax invoices recorded from the invoicing software) and expenses.
-- HG OS does not issue tax invoices: those must come from software registered with the Israel Tax Authority.

create table public.crm_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  kind text not null default 'payment_request' check (kind in ('payment_request', 'tax_invoice', 'tax_invoice_receipt', 'receipt', 'credit_note')),
  number text,
  external_system text,                 -- e.g. "חשבונית ירוקה", "iCount" for documents issued elsewhere
  allocation_number text,               -- Tax Authority allocation number, when the invoice has one
  issue_date date not null default current_date,
  due_date date,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  deal_id uuid references public.crm_deals(id) on delete set null,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  vat_rate numeric(5, 2) not null default 18 check (vat_rate between 0 and 100),
  subtotal numeric(12, 2) not null default 0,  -- before VAT
  vat numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,     -- incl. VAT
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial', 'paid', 'canceled')),
  paid numeric(12, 2) not null default 0 check (paid >= 0),
  paid_at date,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (due_date is null or due_date >= issue_date)
);
create index crm_documents_deal_idx on public.crm_documents(deal_id);
create index crm_documents_contact_idx on public.crm_documents(contact_id);
create unique index crm_documents_number_uq on public.crm_documents(workspace_id, kind, number) where number is not null and deleted_at is null;

-- totals are always computed on the server from the lines
create or replace function public.crm_documents_rules()
returns trigger language plpgsql set search_path = '' as $$
declare it jsonb; sub numeric := 0;
begin
  for it in select * from jsonb_array_elements(new.items) loop
    if coalesce((it ->> 'qty')::numeric, 0) < 0 or coalesce((it ->> 'price')::numeric, 0) < 0 then
      raise exception 'invalid_line_item' using errcode = 'check_violation';
    end if;
    sub := sub + round(coalesce((it ->> 'qty')::numeric, 0) * coalesce((it ->> 'price')::numeric, 0), 2);
  end loop;
  new.subtotal := round(sub, 2);
  new.vat := round(sub * new.vat_rate / 100, 2);
  new.total := new.subtotal + new.vat;
  if new.paid >= new.total and new.total > 0 and new.status <> 'canceled' then new.status := 'paid';
  elsif new.paid > 0 and new.status in ('draft', 'sent') then new.status := 'partial'; end if;
  return new;
end $$;

create table public.crm_expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  day date not null,
  vendor text,
  category text not null default 'other' check (category in ('software', 'subcontractor', 'equipment', 'office', 'vehicle', 'professional', 'training', 'fees', 'other')),
  description text,
  amount numeric(12, 2) not null check (amount >= 0),     -- before VAT
  vat numeric(12, 2) not null default 0 check (vat >= 0),  -- deductible input VAT
  deal_id uuid references public.crm_deals(id) on delete set null,
  method text check (method in ('transfer', 'credit', 'bit', 'cash', 'check', 'standing_order', 'other')),
  reference text,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create index crm_expenses_day_idx on public.crm_expenses(workspace_id, day);
create index crm_expenses_deal_idx on public.crm_expenses(deal_id);

select public.crm_setup_table(t) from unnest(array['crm_documents', 'crm_expenses']) t;
create trigger b_rules before insert or update on public.crm_documents for each row execute function public.crm_documents_rules();
