-- HG OS CRM – core schema (Supabase / Postgres 17)
-- Applied to project hg-forms as four migrations: crm_001a_foundation, crm_001b_marketing_contacts, crm_001c_sales, crm_001d_money_automation_wiring.
-- All CRM tables live in `public` with a crm_ prefix (they share the hg-forms project for now, see docs/adr).
-- Every data table: uuid id (client-generated allowed, for offline creation), workspace_id, created/updated
-- timestamps, soft delete (deleted_at), version, and a global `seq` used by the sync pull cursor.
-- Access: RLS – only members of a workspace see/write its rows. Workspaces can only be created by allow-listed emails.

create extension if not exists pgcrypto with schema extensions;

create sequence if not exists public.crm_seq;

-- ---------------------------------------------------------------- workspaces & members
create table public.crm_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  settings jsonb not null default '{}'::jsonb,
  intake_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  quote_counter int not null default 1000,
  created_at timestamptz not null default now()
);

create table public.crm_members (
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member', 'viewer')),
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index crm_members_user_idx on public.crm_members(user_id);

-- Emails allowed to create a workspace (prevents strangers from using this project as a free CRM).
create table public.crm_allowed_emails (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);

-- helper: workspaces of the current user (SECURITY DEFINER avoids RLS recursion on crm_members)
create or replace function public.crm_my_workspaces()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.workspace_id from public.crm_members m where m.user_id = (select auth.uid())
$$;
create or replace function public.crm_can_write(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crm_members m where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'member'))
$$;
create or replace function public.crm_is_admin(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crm_members m where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin'))
$$;
revoke all on function public.crm_my_workspaces() from public, anon;
revoke all on function public.crm_can_write(uuid) from public, anon;
revoke all on function public.crm_is_admin(uuid) from public, anon;
grant execute on function public.crm_my_workspaces() to authenticated;
grant execute on function public.crm_can_write(uuid) to authenticated;
grant execute on function public.crm_is_admin(uuid) to authenticated;

alter table public.crm_workspaces enable row level security;
alter table public.crm_members enable row level security;
alter table public.crm_allowed_emails enable row level security; -- no policies: not reachable through the API
revoke all on public.crm_allowed_emails from anon, authenticated;
revoke all on public.crm_members from anon;
revoke all on public.crm_workspaces from anon;

create policy ws_select on public.crm_workspaces for select to authenticated using (id in (select public.crm_my_workspaces()));
create policy ws_update on public.crm_workspaces for update to authenticated using (public.crm_is_admin(id)) with check (public.crm_is_admin(id));
create policy mem_select on public.crm_members for select to authenticated using (workspace_id in (select public.crm_my_workspaces()));
create policy mem_admin on public.crm_members for all to authenticated using (public.crm_is_admin(workspace_id)) with check (public.crm_is_admin(workspace_id));

-- intake_token must never be readable by plain members through the generic select; expose via function to admins only
revoke select on public.crm_workspaces from anon, authenticated;
grant select (id, name, settings, quote_counter, created_at) on public.crm_workspaces to authenticated;
grant update (name, settings) on public.crm_workspaces to authenticated;

-- ---------------------------------------------------------------- generic row trigger
create or replace function public.crm_touch_row()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.version := 1;
    -- never trust a client-supplied author; SECURITY DEFINER callers without a user (lead intake) keep theirs
    if (select auth.uid()) is not null then new.created_by := (select auth.uid()); end if;
  else
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'workspace_id is immutable' using errcode = 'check_violation';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.seq := nextval('public.crm_seq');
  return new;
end $$;

-- ---------------------------------------------------------------- audit log (insert-only)
create table public.crm_audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete', 'restore', 'purge', 'attribution_fix')),
  changed jsonb,
  actor uuid,
  at timestamptz not null default now()
);
create index crm_audit_record_idx on public.crm_audit_log(workspace_id, record_id, at desc);
alter table public.crm_audit_log enable row level security;
create policy audit_select on public.crm_audit_log for select to authenticated using (workspace_id in (select public.crm_my_workspaces()));
revoke all on public.crm_audit_log from anon;
revoke insert, update, delete, truncate on public.crm_audit_log from authenticated;

create or replace function public.crm_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  o jsonb;
  n jsonb;
  act text;
begin
  if tg_op = 'INSERT' then
    insert into public.crm_audit_log(workspace_id, table_name, record_id, action, changed, actor)
    values (new.workspace_id, tg_table_name, new.id, 'insert', null, (select auth.uid()));
    return new;
  end if;
  o := to_jsonb(old);
  n := to_jsonb(new);
  for k in select jsonb_object_keys(n) loop
    if k in ('updated_at', 'version', 'seq', 'last_activity_at', 'next_action_at', 'next_followup_at') then continue; end if;
    if (o -> k) is distinct from (n -> k) then
      diff := diff || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
    end if;
  end loop;
  if diff = '{}'::jsonb then return new; end if;
  act := case
    when old.deleted_at is null and new.deleted_at is not null then 'delete'
    when old.deleted_at is not null and new.deleted_at is null then 'restore'
    else 'update' end;
  insert into public.crm_audit_log(workspace_id, table_name, record_id, action, changed, actor)
  values (new.workspace_id, tg_table_name, new.id, act, diff, (select auth.uid()));
  return new;
end $$;
revoke all on function public.crm_audit() from public, anon, authenticated;

-- ---------------------------------------------------------------- macro: standard columns, RLS, triggers
-- (applied below to each data table through crm_setup_table)
create or replace function public.crm_setup_table(t text, audited boolean default true)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy sel on public.%I for select to authenticated using (workspace_id in (select public.crm_my_workspaces()))', t);
  execute format('create policy ins on public.%I for insert to authenticated with check (public.crm_can_write(workspace_id))', t);
  execute format('create policy upd on public.%I for update to authenticated using (public.crm_can_write(workspace_id)) with check (public.crm_can_write(workspace_id))', t);
  execute format('create policy del on public.%I for delete to authenticated using (public.crm_is_admin(workspace_id))', t);
  execute format('create trigger a_touch before insert or update on public.%I for each row execute function public.crm_touch_row()', t);
  if audited then
    execute format('create trigger z_audit after insert or update on public.%I for each row execute function public.crm_audit()', t);
  end if;
  execute format('create index %I on public.%I (workspace_id, seq)', t || '_seq_idx', t);
  execute format('revoke all on public.%I from anon', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
end $$;
revoke all on function public.crm_setup_table(text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- marketing: sources, campaigns, spend
create table public.crm_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{1,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  channel text not null default 'other' check (channel in ('paid_search', 'paid_social', 'organic_search', 'organic_social', 'referral', 'outbound', 'whatsapp', 'repeat', 'partner', 'direct', 'email', 'other', 'unknown')),
  is_paid boolean not null default false,
  utm_sources text[] not null default '{}',
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create unique index crm_sources_key_uq on public.crm_sources(workspace_id, key) where deleted_at is null;

create table public.crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  source_id uuid not null references public.crm_sources(id),
  name text not null check (char_length(name) between 1 and 160),
  utm_campaign text,
  platform text not null default 'other' check (platform in ('google_ads', 'meta_ads', 'other')),
  external_id text,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  starts_on date, ends_on date,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index crm_campaigns_utm_uq on public.crm_campaigns(workspace_id, source_id, lower(utm_campaign)) where utm_campaign is not null and deleted_at is null;
create index crm_campaigns_source_idx on public.crm_campaigns(source_id);

create table public.crm_ad_spend (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  day date not null,
  source_id uuid not null references public.crm_sources(id),
  campaign_id uuid references public.crm_campaigns(id),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'ILS' check (currency ~ '^[A-Z]{3}$'),
  impressions int check (impressions >= 0),
  clicks int check (clicks >= 0),
  origin text not null default 'manual' check (origin in ('manual', 'csv', 'api')),
  import_batch text,
  synced_at timestamptz,
  note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
-- one row per day+source+campaign+origin: re-importing the same CSV updates instead of doubling spend
create unique index crm_ad_spend_day_uq on public.crm_ad_spend(workspace_id, day, source_id, coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid), origin) where deleted_at is null;

-- ---------------------------------------------------------------- companies & contacts
create table public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  domain text check (domain is null or domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  website text, industry text, phone text, email text, city text, address text, tax_id text, notes text,
  owner_id uuid references auth.users(id) on delete set null,
  last_activity_at timestamptz,
  tags text[] not null default '{}',
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create unique index crm_companies_domain_uq on public.crm_companies(workspace_id, domain) where domain is not null and deleted_at is null;
create index crm_companies_name_idx on public.crm_companies(workspace_id, lower(name));

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  email text check (email is null or (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')),
  phone text,
  phone_norm text,
  company_id uuid references public.crm_companies(id) on delete set null,
  company_name text,
  job_title text, website text, industry text, city text,
  lifecycle text not null default 'lead' check (lifecycle in ('lead', 'qualified', 'opportunity', 'customer', 'former', 'other')),
  lead_status text not null default 'new' check (lead_status in ('new', 'attempting', 'connected', 'qualified', 'nurture', 'disqualified')),
  disqualify_reason text,
  fit text check (fit in ('high', 'medium', 'low')),
  budget_estimate numeric(12, 2) check (budget_estimate >= 0),
  need text,
  notes text,
  owner_id uuid references auth.users(id) on delete set null,
  -- attribution: first touch is set once and protected; last touch moves with every new touchpoint
  first_source_id uuid references public.crm_sources(id),
  first_campaign_id uuid references public.crm_campaigns(id),
  first_touch_at timestamptz,
  first_utm jsonb,
  last_source_id uuid references public.crm_sources(id),
  last_campaign_id uuid references public.crm_campaigns(id),
  last_touch_at timestamptz,
  last_utm jsonb,
  reported_source text,
  -- marketing consent (Communications Law sec. 30A)
  marketing_consent boolean not null default false,
  consent_at timestamptz, consent_source text, consent_text text,
  unsubscribed_at timestamptz,
  became_customer_at timestamptz,
  last_activity_at timestamptz,
  next_action_at timestamptz,
  tags text[] not null default '{}',
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (coalesce(first_name, last_name, email, phone, company_name) is not null),
  check (lead_status <> 'disqualified' or disqualify_reason is not null)
);
create unique index crm_contacts_email_uq on public.crm_contacts(workspace_id, email) where email is not null and deleted_at is null;
create index crm_contacts_phone_idx on public.crm_contacts(workspace_id, phone_norm) where phone_norm is not null;
create index crm_contacts_company_idx on public.crm_contacts(company_id);
create index crm_contacts_first_source_idx on public.crm_contacts(workspace_id, first_source_id);
create index crm_contacts_next_action_idx on public.crm_contacts(workspace_id, next_action_at) where deleted_at is null;

-- Israeli phone normalisation for duplicate detection: digits only, +972 -> 0
create or replace function public.crm_norm_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(case when d like '972%' then '0' || substr(d, 4) else d end, '')
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

create or replace function public.crm_contacts_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  new.phone := nullif(trim(new.phone), '');
  new.phone_norm := public.crm_norm_phone(new.phone);
  if tg_op = 'INSERT' and new.first_source_id is not null then
    -- a source chosen when the lead is created manually counts as its first touch
    new.first_touch_at := coalesce(new.first_touch_at, now());
    new.last_source_id := coalesce(new.last_source_id, new.first_source_id);
    new.last_campaign_id := coalesce(new.last_campaign_id, new.first_campaign_id);
    new.last_touch_at := coalesce(new.last_touch_at, new.first_touch_at);
  end if;
  if tg_op = 'UPDATE' then
    -- original source is protected: only crm_fix_attribution() may change it once set
    if old.first_source_id is not null and new.first_source_id is distinct from old.first_source_id
       and coalesce(current_setting('crm.attribution_fix', true), '') <> 'on' then
      raise exception 'first_source_locked' using errcode = 'check_violation', hint = 'Use crm_fix_attribution() with a reason';
    end if;
    if old.first_touch_at is not null and coalesce(current_setting('crm.attribution_fix', true), '') <> 'on' then
      new.first_touch_at := old.first_touch_at;
      new.first_campaign_id := old.first_campaign_id;
      new.first_utm := old.first_utm;
    end if;
  end if;
  if new.lifecycle = 'customer' and new.became_customer_at is null then new.became_customer_at := now(); end if;
  if new.marketing_consent and new.consent_at is null then new.consent_at := now(); end if;
  if not new.marketing_consent and tg_op = 'UPDATE' and old.marketing_consent then new.unsubscribed_at := coalesce(new.unsubscribed_at, now()); end if;
  return new;
end $$;

-- ---------------------------------------------------------------- touchpoints
create table public.crm_touchpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null default 'manual' check (kind in ('form', 'call', 'whatsapp', 'email', 'chat', 'manual', 'import', 'referral', 'visit')),
  source_id uuid references public.crm_sources(id),
  campaign_id uuid references public.crm_campaigns(id),
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  click_id_type text check (click_id_type in ('gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid', 'other')),
  click_id text,
  landing_page text, referrer text, form_name text,
  note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create index crm_touchpoints_contact_idx on public.crm_touchpoints(contact_id, at);

-- keep contact first/last touch in sync with touchpoints (first never overwritten)
create or replace function public.crm_touchpoint_apply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare utm jsonb;
begin
  if new.deleted_at is not null then return new; end if;
  utm := jsonb_strip_nulls(jsonb_build_object('utm_source', new.utm_source, 'utm_medium', new.utm_medium, 'utm_campaign', new.utm_campaign,
    'utm_content', new.utm_content, 'utm_term', new.utm_term, 'click_id_type', new.click_id_type, 'landing_page', new.landing_page, 'referrer', new.referrer, 'kind', new.kind));
  -- first touch is only ever set when the contact has none: an unknown first source is never back-filled by a later touch
  update public.crm_contacts c set
    first_source_id = case when c.first_touch_at is null then coalesce(c.first_source_id, new.source_id) else c.first_source_id end,
    first_campaign_id = case when c.first_touch_at is null then coalesce(c.first_campaign_id, new.campaign_id) else c.first_campaign_id end,
    first_utm = case when c.first_touch_at is null then utm else c.first_utm end,
    first_touch_at = case when c.first_touch_at is null then new.at else c.first_touch_at end,
    last_source_id = case when c.last_touch_at is null or new.at >= c.last_touch_at then new.source_id else c.last_source_id end,
    last_campaign_id = case when c.last_touch_at is null or new.at >= c.last_touch_at then new.campaign_id else c.last_campaign_id end,
    last_utm = case when c.last_touch_at is null or new.at >= c.last_touch_at then utm else c.last_utm end,
    last_touch_at = greatest(c.last_touch_at, new.at)
  where c.id = new.contact_id;
  return new;
end $$;
revoke all on function public.crm_touchpoint_apply() from public, anon, authenticated;

-- ---------------------------------------------------------------- pipelines & stages
create table public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);

create table public.crm_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  key text,
  name text not null check (char_length(name) between 1 and 80),
  position int not null default 0,
  probability int not null default 0 check (probability between 0 and 100),
  kind text not null default 'open' check (kind in ('open', 'won', 'lost')),
  rot_days int check (rot_days is null or rot_days between 1 and 365),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (kind <> 'won' or probability = 100),
  check (kind <> 'lost' or probability = 0)
);
create index crm_stages_pipeline_idx on public.crm_stages(pipeline_id, position);

-- ---------------------------------------------------------------- deals
create table public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  contact_id uuid references public.crm_contacts(id) on delete set null,
  company_id uuid references public.crm_companies(id) on delete set null,
  pipeline_id uuid not null references public.crm_pipelines(id),
  stage_id uuid not null references public.crm_stages(id),
  outcome text not null default 'open' check (outcome in ('open', 'won', 'lost')),
  amount_expected numeric(12, 2) check (amount_expected >= 0),
  amount_final numeric(12, 2) check (amount_final >= 0),
  probability_override int check (probability_override between 0 and 100),
  service_type text,
  -- revenue attribution for this deal (defaults to the contact's original source, editable with history)
  source_id uuid references public.crm_sources(id),
  campaign_id uuid references public.crm_campaigns(id),
  opened_at timestamptz not null default now(),
  expected_close date,
  closed_at timestamptz,
  stage_entered_at timestamptz,
  won_reason text,
  lost_reason text check (lost_reason is null or lost_reason in ('price', 'competitor', 'timing', 'no_budget', 'no_response', 'not_fit', 'diy', 'other')),
  lost_note text,
  next_step text,
  next_followup_at timestamptz,
  last_activity_at timestamptz,
  direct_cost_estimate numeric(12, 2) check (direct_cost_estimate >= 0),
  notes text,
  owner_id uuid references auth.users(id) on delete set null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (closed_at is null or closed_at >= opened_at - interval '1 day')
);
create index crm_deals_stage_idx on public.crm_deals(workspace_id, stage_id) where deleted_at is null;
create index crm_deals_contact_idx on public.crm_deals(contact_id);
create index crm_deals_company_idx on public.crm_deals(company_id);
create index crm_deals_source_idx on public.crm_deals(workspace_id, source_id);
create index crm_deals_closed_idx on public.crm_deals(workspace_id, outcome, closed_at);

create table public.crm_deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  deal_id uuid not null references public.crm_deals(id) on delete cascade,
  from_stage_id uuid references public.crm_stages(id) on delete set null,
  to_stage_id uuid references public.crm_stages(id) on delete set null,
  at timestamptz not null default now(),
  actor uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create index crm_dsh_deal_idx on public.crm_deal_stage_history(deal_id, at);

create or replace function public.crm_deals_rules()
returns trigger language plpgsql set search_path = '' as $$
declare st record;
begin
  select s.kind, s.pipeline_id into st from public.crm_stages s where s.id = new.stage_id and s.workspace_id = new.workspace_id;
  if not found then raise exception 'stage_not_found' using errcode = 'foreign_key_violation'; end if;
  if st.pipeline_id <> new.pipeline_id then new.pipeline_id := st.pipeline_id; end if;
  new.outcome := st.kind;
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    new.stage_entered_at := now();
  end if;
  if st.kind in ('won', 'lost') then
    new.closed_at := coalesce(new.closed_at, now());
    if st.kind = 'won' then new.amount_final := coalesce(new.amount_final, new.amount_expected); end if;
  else
    new.closed_at := null;
  end if;
  if st.kind = 'lost' and new.lost_reason is null then new.lost_reason := 'other'; end if;
  if new.source_id is null and new.contact_id is not null then
    select c.first_source_id, c.first_campaign_id into new.source_id, new.campaign_id from public.crm_contacts c where c.id = new.contact_id;
  end if;
  return new;
end $$;

create or replace function public.crm_deals_after()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    insert into public.crm_deal_stage_history(workspace_id, deal_id, from_stage_id, to_stage_id, at, actor)
    values (new.workspace_id, new.id, case when tg_op = 'UPDATE' then old.stage_id end, new.stage_id, now(), (select auth.uid()));
  end if;
  -- a won deal makes its contact a customer
  if new.outcome = 'won' and (tg_op = 'INSERT' or old.outcome <> 'won') and new.contact_id is not null then
    update public.crm_contacts set lifecycle = 'customer', became_customer_at = coalesce(became_customer_at, new.closed_at)
    where id = new.contact_id and lifecycle <> 'customer';
  elsif new.outcome = 'open' and new.contact_id is not null and (tg_op = 'INSERT') then
    update public.crm_contacts set lifecycle = 'opportunity' where id = new.contact_id and lifecycle in ('lead', 'qualified');
  end if;
  return new;
end $$;
revoke all on function public.crm_deals_after() from public, anon, authenticated;

-- ---------------------------------------------------------------- activities & tasks
create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  type text not null check (type in ('call', 'whatsapp', 'email', 'meeting', 'note', 'sms', 'quote', 'payment', 'system')),
  at timestamptz not null default now(),
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  company_id uuid references public.crm_companies(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete cascade,
  subject text check (char_length(subject) <= 200),
  body text check (char_length(body) <= 20000),
  outcome text,
  direction text check (direction in ('in', 'out')),
  duration_min int check (duration_min between 0 and 1440),
  owner_id uuid references auth.users(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (coalesce(contact_id, company_id, deal_id) is not null)
);
create index crm_activities_contact_idx on public.crm_activities(contact_id, at desc);
create index crm_activities_deal_idx on public.crm_activities(deal_id, at desc);
create index crm_activities_company_idx on public.crm_activities(company_id, at desc);

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  type text not null default 'todo' check (type in ('call', 'whatsapp', 'email', 'meeting', 'quote', 'followup', 'todo')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'done', 'canceled')),
  due_at timestamptz,
  remind_at timestamptz,
  completed_at timestamptz,
  outcome text,
  notes text,
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  company_id uuid references public.crm_companies(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  automation_key text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create index crm_tasks_due_idx on public.crm_tasks(workspace_id, status, due_at);
create index crm_tasks_contact_idx on public.crm_tasks(contact_id);
create index crm_tasks_deal_idx on public.crm_tasks(deal_id);
-- an automation creates a given task at most once (idempotency)
create unique index crm_tasks_automation_uq on public.crm_tasks(workspace_id, automation_key) where automation_key is not null;

create or replace function public.crm_tasks_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and new.completed_at is null then new.completed_at := now(); end if;
  if new.status <> 'done' then new.completed_at := null; end if;
  return new;
end $$;

-- recompute "next action" on contact and "next follow-up" on deal from open tasks; bump last activity
create or replace function public.crm_tasks_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cids uuid[]; dids uuid[];
begin
  cids := array_remove(array[new.contact_id, case when tg_op = 'UPDATE' then old.contact_id end], null);
  dids := array_remove(array[new.deal_id, case when tg_op = 'UPDATE' then old.deal_id end], null);
  update public.crm_contacts c set next_action_at = (select min(t.due_at) from public.crm_tasks t where t.contact_id = c.id and t.status = 'open' and t.deleted_at is null)
    where c.id = any(cids);
  update public.crm_deals d set next_followup_at = (select min(t.due_at) from public.crm_tasks t where t.deal_id = d.id and t.status = 'open' and t.deleted_at is null)
    where d.id = any(dids);
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    update public.crm_contacts set last_activity_at = greatest(last_activity_at, new.completed_at) where id = new.contact_id;
    update public.crm_deals set last_activity_at = greatest(last_activity_at, new.completed_at) where id = new.deal_id;
  end if;
  return new;
end $$;
revoke all on function public.crm_tasks_after() from public, anon, authenticated;

create or replace function public.crm_activities_after()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not null or new.type = 'system' then return new; end if;
  update public.crm_contacts set last_activity_at = greatest(coalesce(last_activity_at, new.at), new.at) where id = new.contact_id;
  update public.crm_deals set last_activity_at = greatest(coalesce(last_activity_at, new.at), new.at) where id = new.deal_id;
  update public.crm_companies set last_activity_at = greatest(coalesce(last_activity_at, new.at), new.at) where id = new.company_id;
  return new;
end $$;
revoke all on function public.crm_activities_after() from public, anon, authenticated;

-- ---------------------------------------------------------------- services, quotes, payments, costs
create table public.crm_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  category text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  unit text,
  recurring text check (recurring in ('monthly', 'yearly')),
  cost_estimate numeric(12, 2) check (cost_estimate >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);

create table public.crm_quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  number text,
  deal_id uuid references public.crm_deals(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  company_id uuid references public.crm_companies(id) on delete set null,
  title text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  issued_at timestamptz not null default now(),
  sent_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  vat_rate numeric(5, 2) not null default 18 check (vat_rate between 0 and 100),
  prices_include_vat boolean not null default false,
  subtotal numeric(12, 2) not null default 0,
  total_before_vat numeric(12, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  lost_reason text,
  notes text, terms text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (expires_at is null or expires_at >= issued_at)
);
create unique index crm_quotes_number_uq on public.crm_quotes(workspace_id, number);
create index crm_quotes_deal_idx on public.crm_quotes(deal_id);

-- server-side totals: the client's numbers are never trusted for money
create or replace function public.crm_quotes_rules()
returns trigger language plpgsql set search_path = '' as $$
declare it jsonb; sub numeric := 0; line numeric; net numeric;
begin
  for it in select * from jsonb_array_elements(new.items) loop
    line := round(coalesce((it ->> 'qty')::numeric, 0) * coalesce((it ->> 'price')::numeric, 0) * (1 - coalesce((it ->> 'discount')::numeric, 0) / 100), 2);
    if line < 0 then raise exception 'negative_line' using errcode = 'check_violation'; end if;
    sub := sub + line;
  end loop;
  new.subtotal := round(sub, 2);
  net := round(sub * (1 - new.discount_pct / 100), 2);
  if new.prices_include_vat then
    new.total := net;
    new.total_before_vat := round(net / (1 + new.vat_rate / 100), 2);
    new.vat_amount := new.total - new.total_before_vat;
  else
    new.total_before_vat := net;
    new.vat_amount := round(net * new.vat_rate / 100, 2);
    new.total := new.total_before_vat + new.vat_amount;
  end if;
  if new.number is null or new.number = '' then
    new.number := public.crm_next_quote_number(new.workspace_id);
  end if;
  if new.status = 'sent' and new.sent_at is null then new.sent_at := now(); end if;
  if new.status in ('accepted', 'declined') and new.responded_at is null then new.responded_at := now(); end if;
  if new.status in ('draft', 'sent') then new.responded_at := null; end if;
  return new;
end $$;

create or replace function public.crm_next_quote_number(ws uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.crm_can_write(ws) and (select auth.uid()) is not null then raise exception 'not_allowed' using errcode = 'insufficient_privilege'; end if;
  update public.crm_workspaces set quote_counter = quote_counter + 1 where id = ws returning quote_counter into n;
  return 'Q-' || n;
end $$;
revoke all on function public.crm_next_quote_number(uuid) from public, anon;
grant execute on function public.crm_next_quote_number(uuid) to authenticated;

create table public.crm_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  quote_id uuid references public.crm_quotes(id) on delete set null,
  amount numeric(12, 2) not null check (amount <> 0),
  kind text not null default 'payment' check (kind in ('payment', 'refund')),
  received_on date not null,
  method text check (method in ('transfer', 'credit', 'bit', 'paybox', 'cash', 'check', 'paypal', 'other')),
  status text not null default 'received' check (status in ('received', 'pending', 'failed')),
  reference text, invoice_number text, note text,
  origin text not null default 'manual' check (origin in ('manual', 'import', 'api')),
  verified boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq'),
  check (deal_id is not null or contact_id is not null),
  check ((kind = 'payment' and amount > 0) or (kind = 'refund' and amount < 0)),
  -- a payment can be marked verified only when it came from a connected payment/accounting system
  check (not verified or origin = 'api')
);
create index crm_payments_deal_idx on public.crm_payments(deal_id);
create index crm_payments_day_idx on public.crm_payments(workspace_id, received_on);

create table public.crm_costs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete set null,
  day date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null default 'direct' check (category in ('direct', 'subcontractor', 'software', 'sales', 'overhead', 'other')),
  vendor text, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create index crm_costs_deal_idx on public.crm_costs(deal_id);

-- ---------------------------------------------------------------- automation, templates, notifications, views
create table public.crm_automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  key text,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  active boolean not null default true,
  trigger jsonb not null,
  conditions jsonb not null default '{"match":"all","filters":[]}'::jsonb,
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create table public.crm_automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  automation_id uuid not null references public.crm_automations(id) on delete cascade,
  run_key text not null,
  record_type text, record_id uuid,
  status text not null default 'ok' check (status in ('ok', 'error', 'skipped')),
  log jsonb not null default '[]'::jsonb,
  at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
-- the same trigger event never runs the same automation twice (e.g. two open tabs)
create unique index crm_automation_runs_key_uq on public.crm_automation_runs(automation_id, run_key);

create table public.crm_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  channel text not null default 'whatsapp' check (channel in ('email', 'whatsapp', 'sms')),
  subject text, body text not null default '', category text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);

create table public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null default 'info',
  text text not null,
  link text,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);
create unique index crm_notifications_dedupe_uq on public.crm_notifications(workspace_id, dedupe_key) where dedupe_key is not null;

create table public.crm_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.crm_workspaces(id) on delete cascade,
  object text not null,
  name text not null,
  filters jsonb not null default '{"match":"all","filters":[]}'::jsonb,
  columns jsonb, sort jsonb,
  position int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, version int not null default 1, seq bigint not null default nextval('public.crm_seq')
);

-- record origin (how the record was created) kept apart from the marketing source (which channel brought it)
alter table public.crm_contacts add column origin text not null default 'manual' check (origin in ('manual', 'form', 'import', 'api', 'whatsapp', 'call', 'merge'));
alter table public.crm_touchpoints drop constraint crm_touchpoints_click_id_type_check;
alter table public.crm_touchpoints add constraint crm_touchpoints_click_id_type_check check (click_id_type in ('gclid', 'gbraid', 'wbraid', 'fbclid', 'ctwa_clid', 'meta_lead_id', 'msclkid', 'ttclid', 'other'));

-- ---------------------------------------------------------------- wire up tables
select public.crm_setup_table(t) from unnest(array[
  'crm_sources', 'crm_campaigns', 'crm_ad_spend', 'crm_companies', 'crm_contacts', 'crm_touchpoints',
  'crm_pipelines', 'crm_stages', 'crm_deals', 'crm_activities', 'crm_tasks', 'crm_services',
  'crm_quotes', 'crm_payments', 'crm_costs', 'crm_automations', 'crm_templates', 'crm_views'
]) t;
select public.crm_setup_table(t, false) from unnest(array['crm_deal_stage_history', 'crm_automation_runs', 'crm_notifications']) t;

create trigger b_rules before insert or update on public.crm_contacts for each row execute function public.crm_contacts_rules();
create trigger b_rules before insert or update on public.crm_deals for each row execute function public.crm_deals_rules();
create trigger c_after after insert or update on public.crm_deals for each row execute function public.crm_deals_after();
create trigger b_rules before insert or update on public.crm_tasks for each row execute function public.crm_tasks_rules();
create trigger c_after after insert or update on public.crm_tasks for each row execute function public.crm_tasks_after();
create trigger c_after after insert or update on public.crm_activities for each row execute function public.crm_activities_after();
create trigger c_after after insert on public.crm_touchpoints for each row execute function public.crm_touchpoint_apply();
create trigger b_rules before insert or update on public.crm_quotes for each row execute function public.crm_quotes_rules();
-- stage history rows are immutable for users
drop policy upd on public.crm_deal_stage_history;
drop policy ins on public.crm_deal_stage_history;
-- automation runs: insert only (no edits)
drop policy upd on public.crm_automation_runs;
