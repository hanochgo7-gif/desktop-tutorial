-- 002: master data. Sites and warehouses, categories, item types, items, suppliers, employees, attachments, saved views.
-- Master data is edited directly through the API (RLS checks the permission); every change lands in audit_log.

-- ---------------------------------------------------------------- sites (a central warehouse is a site of kind 'warehouse')
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  code text not null check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'site' check (kind in ('site', 'warehouse', 'office')),
  status text not null default 'active' check (status in ('planned', 'active', 'on_hold', 'closing', 'closed')),
  address text check (char_length(address) <= 300),
  manager_id uuid references public.profiles(id),
  contacts jsonb not null default '[]'::jsonb,      -- [{name, role, phone, email}]
  opened_on date,
  expected_close_on date,
  phase text check (char_length(phase) <= 80),      -- current activity phase, drives expected needs
  needs text check (char_length(needs) <= 2000),    -- free-text special needs of this site
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_close_on is null or opened_on is null or expected_close_on >= opened_on)
);
create unique index sites_code_uq on public.sites(org_id, lower(code));

create table public.membership_sites (
  org_id uuid not null,
  user_id uuid not null,
  site_id uuid not null references public.sites(id),
  primary key (org_id, user_id, site_id),
  foreign key (org_id, user_id) references public.memberships(org_id, user_id)
);

-- Can the current user see a site? Org-wide members see all; site-scoped members see their sites.
create or replace function public.can_see_site(p_org uuid, p_site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m join public.profiles p on p.id = m.user_id
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.active and p.deactivated_at is null
      and (m.all_sites
           or exists (select 1 from public.membership_sites ms where ms.org_id = p_org and ms.user_id = m.user_id and ms.site_id = p_site)))
$$;

create or replace function public.all_sites_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select m.all_sites from public.memberships m where m.org_id = p_org and m.user_id = (select auth.uid()) and m.active), false)
$$;

create or replace function public.require_site(p_org uuid, p_site uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_site(p_org, p_site) then raise exception 'SITE_FORBIDDEN' using errcode = '42501'; end if;
end $$;

-- ---------------------------------------------------------------- categories (tree) and item types: defined by the user, no code change
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  parent_id uuid references public.categories(id),
  name text not null check (char_length(name) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index categories_name_uq on public.categories(org_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table public.item_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  name text not null check (char_length(name) between 1 and 60),
  -- tracked: each unit is a fixed asset with a serial number, warranty and service dates
  tracked boolean not null default false,
  -- loanable: can be handed to an employee and returned
  loanable boolean not null default false,
  consumable boolean not null default false,
  active boolean not null default true
);
create unique index item_types_name_uq on public.item_types(org_id, lower(name));

-- ---------------------------------------------------------------- items
create table public.items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  sku text not null check (char_length(sku) between 1 and 40),
  name text not null check (char_length(name) between 1 and 200),
  barcode text check (char_length(barcode) <= 64),
  category_id uuid references public.categories(id),
  type_id uuid references public.item_types(id),
  description text check (char_length(description) <= 4000),
  uom text not null default 'יח׳' check (char_length(uom) between 1 and 20),
  manufacturer text check (char_length(manufacturer) <= 120),
  model text check (char_length(model) <= 120),
  image_path text,
  status text not null default 'active' check (status in ('active', 'inactive', 'discontinued')),
  -- defaults; per-site values in item_site_settings override them
  min_qty numeric(14,3) check (min_qty >= 0),
  max_qty numeric(14,3) check (max_qty >= 0),
  reorder_point numeric(14,3) check (reorder_point >= 0),
  lead_time_days int check (lead_time_days between 0 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_qty is null or min_qty is null or max_qty >= min_qty)
);
-- SKU is unique per organization regardless of case and surrounding spaces
create unique index items_sku_uq on public.items(org_id, lower(btrim(sku)));
create unique index items_barcode_uq on public.items(org_id, barcode) where barcode is not null;
create index items_category_idx on public.items(category_id);
create index items_name_trgm_idx on public.items(org_id, lower(name));

create table public.item_site_settings (
  org_id uuid not null references public.orgs(id),
  item_id uuid not null references public.items(id),
  site_id uuid not null references public.sites(id),
  min_qty numeric(14,3) check (min_qty >= 0),
  max_qty numeric(14,3) check (max_qty >= 0),
  reorder_point numeric(14,3) check (reorder_point >= 0),
  bin_location text check (char_length(bin_location) <= 60),
  primary key (item_id, site_id),
  check (max_qty is null or min_qty is null or max_qty >= min_qty)
);

-- ---------------------------------------------------------------- suppliers
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  name text not null check (char_length(name) between 1 and 160),
  company_no text check (char_length(company_no) <= 20),         -- ח.פ. / עוסק מורשה
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 160),
  address text check (char_length(address) <= 300),
  contacts jsonb not null default '[]'::jsonb,                     -- [{name, role, phone, email}]
  category_ids uuid[] not null default '{}',
  payment_terms text check (char_length(payment_terms) <= 120),   -- e.g. שוטף + 60
  credit_days int check (credit_days between 0 and 365),
  delivery_terms text check (char_length(delivery_terms) <= 200),
  fixed_discount_pct numeric(5,2) check (fixed_discount_pct between 0 and 100),
  status text not null default 'active' check (status in ('active', 'on_hold', 'blocked')),
  status_reason text check (char_length(status_reason) <= 500),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index suppliers_company_no_uq on public.suppliers(org_id, company_no) where company_no is not null and company_no <> '';

-- Certificates, insurance, licences, framework agreements: with expiry dates
create table public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  supplier_id uuid not null references public.suppliers(id),
  kind text not null check (kind in ('insurance', 'license', 'certificate', 'agreement', 'tax', 'other')),
  title text not null check (char_length(title) between 1 and 160),
  valid_until date,
  file_path text,
  created_at timestamptz not null default now()
);

-- Agreed prices (price lists / framework agreements) per supplier and item
create table public.supplier_prices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  supplier_id uuid not null references public.suppliers(id),
  item_id uuid not null references public.items(id),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  min_qty numeric(14,3) check (min_qty >= 0),
  valid_from date not null default current_date,
  valid_until date,
  source text check (char_length(source) <= 160),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);
create index supplier_prices_item_idx on public.supplier_prices(item_id);

-- ---------------------------------------------------------------- employees (people who hold equipment; not necessarily system users)
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  name text not null check (char_length(name) between 1 and 120),
  employee_no text check (char_length(employee_no) <= 30),
  phone text check (char_length(phone) <= 40),
  site_id uuid references public.sites(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- attachments (files live in Storage; this is the index)
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  entity text not null check (entity in ('request', 'rfq', 'quote', 'po', 'receipt', 'invoice', 'supplier', 'item', 'asset', 'site')),
  entity_id uuid not null,
  file_path text not null,
  file_name text not null check (char_length(file_name) <= 200),
  mime text,
  size_bytes bigint check (size_bytes between 0 and 26214400),
  uploaded_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments(entity, entity_id);

-- ---------------------------------------------------------------- saved table views per user
create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  user_id uuid not null references public.profiles(id) default auth.uid(),
  screen text not null check (char_length(screen) <= 40),
  name text not null check (char_length(name) between 1 and 60),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- triggers
create trigger sites_touch before update on public.sites for each row execute function public.touch_updated_at();
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
create trigger suppliers_touch before update on public.suppliers for each row execute function public.touch_updated_at();
create trigger audit_sites after insert or update or delete on public.sites for each row execute function public.audit_row();
create trigger audit_items after insert or update or delete on public.items for each row execute function public.audit_row();
create trigger audit_item_site after insert or update or delete on public.item_site_settings for each row execute function public.audit_row();
create trigger audit_suppliers after insert or update or delete on public.suppliers for each row execute function public.audit_row();
create trigger audit_supplier_docs after insert or update or delete on public.supplier_documents for each row execute function public.audit_row();
create trigger audit_supplier_prices after insert or update or delete on public.supplier_prices for each row execute function public.audit_row();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_row();
create trigger audit_item_types after insert or update or delete on public.item_types for each row execute function public.audit_row();
create trigger audit_employees after insert or update or delete on public.employees for each row execute function public.audit_row();
create trigger audit_membership_sites after insert or update or delete on public.membership_sites for each row execute function public.audit_row();

-- Master records are deactivated, never deleted (history refers to them).
create or replace function public.forbid_delete()
returns trigger language plpgsql as $$
begin raise exception 'NO_DELETE:%', tg_table_name using errcode = '42501'; end $$;
create trigger sites_no_delete before delete on public.sites for each row execute function public.forbid_delete();
create trigger items_no_delete before delete on public.items for each row execute function public.forbid_delete();
create trigger suppliers_no_delete before delete on public.suppliers for each row execute function public.forbid_delete();
create trigger employees_no_delete before delete on public.employees for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------- RLS
alter table public.sites enable row level security;
alter table public.membership_sites enable row level security;
alter table public.categories enable row level security;
alter table public.item_types enable row level security;
alter table public.items enable row level security;
alter table public.item_site_settings enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.supplier_prices enable row level security;
alter table public.employees enable row level security;
alter table public.attachments enable row level security;
alter table public.saved_views enable row level security;

revoke all on public.sites, public.membership_sites, public.categories, public.item_types, public.items, public.item_site_settings,
  public.suppliers, public.supplier_documents, public.supplier_prices, public.employees, public.attachments, public.saved_views from anon, authenticated;
grant select on public.sites, public.membership_sites, public.categories, public.item_types, public.items, public.item_site_settings,
  public.suppliers, public.supplier_documents, public.supplier_prices, public.employees, public.attachments, public.saved_views to authenticated;
grant insert, update on public.sites, public.categories, public.item_types, public.items, public.item_site_settings,
  public.suppliers, public.supplier_documents, public.supplier_prices, public.employees to authenticated;
grant insert, delete on public.membership_sites to authenticated;
grant delete on public.item_site_settings, public.supplier_documents to authenticated;
grant insert on public.attachments to authenticated;
grant insert, update, delete on public.saved_views to authenticated;

-- sites: visible by scope; managed by sites.manage
create policy sites_select on public.sites for select to authenticated using (public.can_see_site(org_id, id));
create policy sites_insert on public.sites for insert to authenticated with check (public.has_perm(org_id, 'sites.manage'));
create policy sites_update on public.sites for update to authenticated using (public.has_perm(org_id, 'sites.manage')) with check (public.has_perm(org_id, 'sites.manage'));

create policy msites_select on public.membership_sites for select to authenticated using (org_id in (select public.my_orgs()));
create policy msites_write on public.membership_sites for insert to authenticated with check (public.has_perm(org_id, 'users.manage'));
create policy msites_delete on public.membership_sites for delete to authenticated using (public.has_perm(org_id, 'users.manage'));

-- catalog: every member reads; items.manage edits
create policy categories_select on public.categories for select to authenticated using (public.is_member(org_id));
create policy categories_write on public.categories for insert to authenticated with check (public.has_perm(org_id, 'items.manage'));
create policy categories_update on public.categories for update to authenticated using (public.has_perm(org_id, 'items.manage')) with check (public.has_perm(org_id, 'items.manage'));
create policy item_types_select on public.item_types for select to authenticated using (public.is_member(org_id));
create policy item_types_write on public.item_types for insert to authenticated with check (public.has_perm(org_id, 'items.manage'));
create policy item_types_update on public.item_types for update to authenticated using (public.has_perm(org_id, 'items.manage')) with check (public.has_perm(org_id, 'items.manage'));
create policy items_select on public.items for select to authenticated using (public.is_member(org_id));
create policy items_insert on public.items for insert to authenticated with check (public.has_perm(org_id, 'items.manage'));
create policy items_update on public.items for update to authenticated using (public.has_perm(org_id, 'items.manage')) with check (public.has_perm(org_id, 'items.manage'));
create policy iss_select on public.item_site_settings for select to authenticated using (public.can_see_site(org_id, site_id));
create policy iss_insert on public.item_site_settings for insert to authenticated with check (
  public.can_see_site(org_id, site_id) and (public.has_perm(org_id, 'items.manage') or public.has_perm(org_id, 'stock.adjust')));
create policy iss_update on public.item_site_settings for update to authenticated
  using (public.can_see_site(org_id, site_id) and (public.has_perm(org_id, 'items.manage') or public.has_perm(org_id, 'stock.adjust')))
  with check (public.can_see_site(org_id, site_id) and (public.has_perm(org_id, 'items.manage') or public.has_perm(org_id, 'stock.adjust')));
create policy iss_delete on public.item_site_settings for delete to authenticated
  using (public.can_see_site(org_id, site_id) and public.has_perm(org_id, 'items.manage'));

-- suppliers: commercial data, readable by anyone who sees money or buys
create policy suppliers_select on public.suppliers for select to authenticated using (
  public.has_perm(org_id, 'finance.view') or public.has_perm(org_id, 'suppliers.manage') or public.has_perm(org_id, 'receipts.post'));
create policy suppliers_insert on public.suppliers for insert to authenticated with check (public.has_perm(org_id, 'suppliers.manage'));
create policy suppliers_update on public.suppliers for update to authenticated using (public.has_perm(org_id, 'suppliers.manage')) with check (public.has_perm(org_id, 'suppliers.manage'));
create policy sdocs_select on public.supplier_documents for select to authenticated using (public.has_perm(org_id, 'finance.view') or public.has_perm(org_id, 'suppliers.manage'));
create policy sdocs_insert on public.supplier_documents for insert to authenticated with check (public.has_perm(org_id, 'suppliers.manage'));
create policy sdocs_update on public.supplier_documents for update to authenticated using (public.has_perm(org_id, 'suppliers.manage')) with check (public.has_perm(org_id, 'suppliers.manage'));
create policy sdocs_delete on public.supplier_documents for delete to authenticated using (public.has_perm(org_id, 'suppliers.manage'));
create policy sprices_select on public.supplier_prices for select to authenticated using (public.has_perm(org_id, 'finance.view'));
create policy sprices_insert on public.supplier_prices for insert to authenticated with check (public.has_perm(org_id, 'suppliers.manage'));
create policy sprices_update on public.supplier_prices for update to authenticated using (public.has_perm(org_id, 'suppliers.manage')) with check (public.has_perm(org_id, 'suppliers.manage'));

create policy employees_select on public.employees for select to authenticated using (public.is_member(org_id));
create policy employees_insert on public.employees for insert to authenticated with check (public.has_perm(org_id, 'stock.move') or public.has_perm(org_id, 'users.manage'));
create policy employees_update on public.employees for update to authenticated
  using (public.has_perm(org_id, 'stock.move') or public.has_perm(org_id, 'users.manage'))
  with check (public.has_perm(org_id, 'stock.move') or public.has_perm(org_id, 'users.manage'));

create policy attachments_select on public.attachments for select to authenticated using (public.is_member(org_id));
create policy attachments_insert on public.attachments for insert to authenticated with check (public.is_member(org_id) and uploaded_by = (select auth.uid()));

create policy views_own on public.saved_views for all to authenticated
  using (user_id = (select auth.uid()) and public.is_member(org_id))
  with check (user_id = (select auth.uid()) and public.is_member(org_id));
