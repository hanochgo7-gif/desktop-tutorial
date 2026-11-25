-- Gotovski Ops: procurement, inventory and operations.
-- 001: organizations, users, roles and permissions, audit log, document numbering.
--
-- Principles that hold in every migration:
--  * Every business row belongs to an organization (org_id). A demo organization is a separate org with is_demo = true,
--    so demo data never mixes with production data.
--  * Reads go through Row Level Security. Every state change that matters (stock, approvals, money) goes through a
--    SECURITY DEFINER function that checks the permission, locks the rows it changes and runs in one transaction.
--    Clients have no direct INSERT/UPDATE/DELETE on those tables.
--  * Nothing financial or inventory-related is ever deleted. Ledgers (stock_movements, audit_log, approvals) are append-only.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- roles
create type public.app_role as enum (
  'super_admin', 'ceo', 'cfo', 'procurement_manager', 'buyer',
  'site_manager', 'warehouse_manager', 'project_manager', 'auditor', 'viewer'
);

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  is_demo boolean not null default false,
  currency text not null default 'ILS',
  -- vat_rate: default VAT for new orders. enforce_sod: the creator of a document cannot approve it.
  -- receipt_tolerance_pct: how much more than ordered may be received. price_tolerance_pct: invoice vs order price.
  settings jsonb not null default jsonb_build_object(
    'vat_rate', 0.18,
    'enforce_sod', true,
    'receipt_tolerance_pct', 0,
    'price_tolerance_pct', 0.5,
    'over_budget_role', 'cfo',
    'price_alert_pct', 10,
    'cost_of_capital_pct', 6,
    'late_supplier_threshold', 3,
    'score_weights', jsonb_build_object('price', 25, 'on_time', 25, 'fill', 15, 'quality', 15, 'service', 10, 'response', 10)
  ),
  created_at timestamptz not null default now()
);

-- One row per person who ever used the system. Never deleted, so history keeps a name.
create table public.profiles (
  id uuid primary key,                       -- = auth.users.id (no FK: deleting a login must not erase history)
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 40),
  deactivated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.orgs(id),
  user_id uuid not null references public.profiles(id),
  role public.app_role not null,
  all_sites boolean not null default true,   -- false: only the sites in membership_sites
  approval_limit numeric(14,2),              -- optional personal cap on what this user may approve (net amount)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- ---------------------------------------------------------------- permissions
create table public.role_permissions (
  role public.app_role not null,
  perm text not null,
  primary key (role, perm)
);

insert into public.role_permissions(role, perm)
select r::public.app_role, p from (values
  -- super admin: everything
  ('super_admin', 'settings.manage'), ('super_admin', 'users.manage'), ('super_admin', 'audit.view'),
  ('super_admin', 'sites.manage'), ('super_admin', 'items.manage'), ('super_admin', 'suppliers.manage'),
  ('super_admin', 'stock.view'), ('super_admin', 'stock.move'), ('super_admin', 'stock.adjust'), ('super_admin', 'stock.transfer'), ('super_admin', 'stock.count'),
  ('super_admin', 'requests.create'), ('super_admin', 'requests.approve'), ('super_admin', 'rfq.manage'),
  ('super_admin', 'po.create'), ('super_admin', 'po.approve'), ('super_admin', 'po.send'), ('super_admin', 'po.cancel'),
  ('super_admin', 'receipts.post'), ('super_admin', 'invoices.register'), ('super_admin', 'invoices.approve_payment'),
  ('super_admin', 'budgets.view'), ('super_admin', 'budgets.manage'), ('super_admin', 'finance.view'), ('super_admin', 'reports.view'),
  -- CEO: sees everything, approves, manages budgets; does not run day-to-day operations
  ('ceo', 'audit.view'), ('ceo', 'stock.view'), ('ceo', 'requests.approve'), ('ceo', 'po.approve'),
  ('ceo', 'invoices.approve_payment'), ('ceo', 'budgets.view'), ('ceo', 'budgets.manage'), ('ceo', 'finance.view'), ('ceo', 'reports.view'),
  -- CFO
  ('cfo', 'audit.view'), ('cfo', 'stock.view'), ('cfo', 'po.approve'), ('cfo', 'invoices.register'), ('cfo', 'invoices.approve_payment'),
  ('cfo', 'budgets.view'), ('cfo', 'budgets.manage'), ('cfo', 'finance.view'), ('cfo', 'reports.view'),
  -- Procurement manager
  ('procurement_manager', 'items.manage'), ('procurement_manager', 'suppliers.manage'), ('procurement_manager', 'stock.view'),
  ('procurement_manager', 'requests.approve'), ('procurement_manager', 'rfq.manage'), ('procurement_manager', 'po.create'),
  ('procurement_manager', 'po.approve'), ('procurement_manager', 'po.send'), ('procurement_manager', 'po.cancel'),
  ('procurement_manager', 'receipts.post'), ('procurement_manager', 'invoices.register'), ('procurement_manager', 'stock.transfer'),
  ('procurement_manager', 'budgets.view'), ('procurement_manager', 'finance.view'), ('procurement_manager', 'reports.view'),
  -- Buyer
  ('buyer', 'items.manage'), ('buyer', 'suppliers.manage'), ('buyer', 'stock.view'), ('buyer', 'rfq.manage'),
  ('buyer', 'po.create'), ('buyer', 'po.send'), ('buyer', 'invoices.register'), ('buyer', 'stock.transfer'),
  ('buyer', 'budgets.view'), ('buyer', 'finance.view'), ('buyer', 'reports.view'),
  -- Site manager (normally limited to own sites)
  ('site_manager', 'stock.view'), ('site_manager', 'stock.move'), ('site_manager', 'stock.transfer'),
  ('site_manager', 'requests.create'), ('site_manager', 'requests.approve'), ('site_manager', 'po.approve'),
  ('site_manager', 'receipts.post'), ('site_manager', 'budgets.view'), ('site_manager', 'finance.view'),
  -- Warehouse manager
  ('warehouse_manager', 'items.manage'), ('warehouse_manager', 'stock.view'), ('warehouse_manager', 'stock.move'),
  ('warehouse_manager', 'stock.adjust'), ('warehouse_manager', 'stock.transfer'), ('warehouse_manager', 'stock.count'),
  ('warehouse_manager', 'requests.create'), ('warehouse_manager', 'receipts.post'),
  -- Project manager
  ('project_manager', 'stock.view'), ('project_manager', 'requests.create'), ('project_manager', 'receipts.post'),
  ('project_manager', 'budgets.view'), ('project_manager', 'finance.view'), ('project_manager', 'reports.view'),
  -- Auditor: read everything, change nothing
  ('auditor', 'audit.view'), ('auditor', 'stock.view'), ('auditor', 'budgets.view'), ('auditor', 'finance.view'), ('auditor', 'reports.view'),
  -- Viewer: stock and documents without money
  ('viewer', 'stock.view')
) v(r, p);

-- ---------------------------------------------------------------- helpers (SECURITY DEFINER so RLS on memberships does not recurse)
create or replace function public.my_orgs()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.org_id from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.user_id = (select auth.uid()) and m.active and p.deactivated_at is null
$$;

create or replace function public.my_role(p_org uuid)
returns public.app_role language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.org_id = p_org and m.user_id = (select auth.uid()) and m.active and p.deactivated_at is null
$$;

create or replace function public.has_perm(p_org uuid, p_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.profiles p on p.id = m.user_id
    join public.role_permissions rp on rp.role = m.role
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.active and p.deactivated_at is null and rp.perm = p_perm)
$$;

create or replace function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.my_role(p_org) is not null
$$;

-- Throws a readable error when the current user lacks a permission. Error codes are stable strings the UI translates.
create or replace function public.require_perm(p_org uuid, p_perm text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'NOT_SIGNED_IN' using errcode = '28000'; end if;
  if not public.has_perm(p_org, p_perm) then
    raise exception 'FORBIDDEN:%', p_perm using errcode = '42501';
  end if;
end $$;

create or replace function public.app_setting(p_org uuid, p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select o.settings -> p_key from public.orgs o where o.id = p_org
    and (public.my_role(p_org) is not null or (select auth.uid()) is null)
$$;

-- ---------------------------------------------------------------- audit log (append-only)
create table public.audit_log (
  id bigserial primary key,
  org_id uuid,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_name text,
  action text not null,          -- insert | update | delete | rpc:<name>
  entity text not null,          -- table name or document type
  entity_id text,
  summary text,
  old_data jsonb,
  new_data jsonb
);
create index audit_org_at_idx on public.audit_log(org_id, at desc);
create index audit_entity_idx on public.audit_log(entity, entity_id);

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.audit(p_org uuid, p_action text, p_entity text, p_entity_id text, p_summary text, p_old jsonb default null, p_new jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log(org_id, actor_id, actor_name, action, entity, entity_id, summary, old_data, new_data)
  values (p_org, (select auth.uid()), public.actor_name(), p_action, p_entity, p_entity_id, p_summary, p_old, p_new)
$$;

-- Generic row trigger: records every change to master data and documents.
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_id text;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  v_org := coalesce((v_new ->> 'org_id')::uuid, (v_old ->> 'org_id')::uuid);
  v_id := coalesce(v_new ->> 'id', v_old ->> 'id');
  if tg_op = 'UPDATE' and v_old = v_new then return new; end if;
  insert into public.audit_log(org_id, actor_id, actor_name, action, entity, entity_id, old_data, new_data)
  values (v_org, (select auth.uid()), public.actor_name(), lower(tg_op), tg_table_name, v_id, v_old, v_new);
  return coalesce(new, old);
end $$;

-- Append-only guard for ledgers.
create or replace function public.forbid_change()
returns trigger language plpgsql as $$
begin
  raise exception 'APPEND_ONLY:%', tg_table_name using errcode = '42501';
end $$;

create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.forbid_change();

-- Generic updated_at.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------- document numbers: PO-2026-00001
create table public.doc_counters (
  org_id uuid not null references public.orgs(id),
  doc_type text not null,
  year int not null,
  last_no int not null default 0,
  primary key (org_id, doc_type, year)
);

create or replace function public.next_doc_no(p_org uuid, p_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_year int := extract(year from now() at time zone 'Asia/Jerusalem'); v_no int;
begin
  insert into public.doc_counters(org_id, doc_type, year, last_no) values (p_org, p_type, v_year, 1)
  on conflict (org_id, doc_type, year) do update set last_no = public.doc_counters.last_no + 1
  returning last_no into v_no;
  return p_type || '-' || v_year || '-' || lpad(v_no::text, 5, '0');
end $$;

-- ---------------------------------------------------------------- RLS for this file
alter table public.orgs enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_log enable row level security;
alter table public.doc_counters enable row level security;

create policy orgs_select on public.orgs for select to authenticated using (id in (select public.my_orgs()));
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or id in (select m.user_id from public.memberships m where m.org_id in (select public.my_orgs())));
create policy memberships_select on public.memberships for select to authenticated using (org_id in (select public.my_orgs()));
create policy role_permissions_select on public.role_permissions for select to authenticated using (true);
create policy audit_select on public.audit_log for select to authenticated using (public.has_perm(org_id, 'audit.view'));
-- doc_counters: no policies, only reachable through next_doc_no()

revoke all on public.orgs, public.profiles, public.memberships, public.role_permissions, public.audit_log, public.doc_counters from anon, authenticated;
grant select on public.orgs, public.profiles, public.memberships, public.role_permissions, public.audit_log to authenticated;

-- A user may update only their own name and phone.
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create trigger audit_memberships after insert or update or delete on public.memberships for each row execute function public.audit_row();
create trigger audit_orgs after update on public.orgs for each row execute function public.audit_row();
