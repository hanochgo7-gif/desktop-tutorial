-- 005: organizations, users and settings. Sign-up creates a profile; membership comes from an invitation by an admin.

-- A profile for every login (Supabase trigger on auth.users).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Who may create a new organization (keeps strangers from using the project). Managed with the service key only.
create table public.allowed_org_creators (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);
alter table public.allowed_org_creators enable row level security;
revoke all on public.allowed_org_creators from anon, authenticated;

-- Invitations: an admin invites an email with a role; the person signs up with that email and joins on first sign-in.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  email text not null check (email = lower(email) and email like '%@%'),
  role public.app_role not null,
  all_sites boolean not null default true,
  site_ids uuid[] not null default '{}',
  approval_limit numeric(14,2),
  invited_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);
create unique index invitations_open_uq on public.invitations(org_id, email) where accepted_at is null and revoked_at is null;
alter table public.invitations enable row level security;
revoke all on public.invitations from anon, authenticated;
grant select on public.invitations to authenticated;
create policy invitations_select on public.invitations for select to authenticated using (public.has_perm(org_id, 'users.manage'));
create trigger audit_invitations after insert or update on public.invitations for each row execute function public.audit_row();

-- ---------------------------------------------------------------- defaults for a new organization
create or replace function public.org_seed_defaults(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.item_types(org_id, name, tracked, loanable, consumable) values
    (p_org, 'ציוד מתכלה', false, false, true),
    (p_org, 'ציוד קבוע', true, false, false),
    (p_org, 'כלי עבודה', false, true, false),
    (p_org, 'ציוד בטיחות', false, true, true),
    (p_org, 'ציוד משרדי', false, false, true),
    (p_org, 'ציוד חשמלי', false, false, false),
    (p_org, 'מכונות', true, false, false),
    (p_org, 'חלפים', false, false, true),
    (p_org, 'חומרי גלם', false, false, true),
    (p_org, 'ציוד להשכרה', true, false, false),
    (p_org, 'ציוד מוקצה לעובד', false, true, false);
  -- the approval bands the organization asked for: up to 2,000 site manager; 2,000–10,000 procurement manager;
  -- above 10,000 procurement manager and then the CFO. Editable in Settings.
  insert into public.approval_rules(org_id, doc_type, min_amount, max_amount, step, required_role) values
    (p_org, 'po', 0, 2000, 1, 'site_manager'),
    (p_org, 'po', 2000, 10000, 1, 'procurement_manager'),
    (p_org, 'po', 10000, null, 1, 'procurement_manager'),
    (p_org, 'po', 10000, null, 2, 'cfo'),
    (p_org, 'request', 0, null, 1, 'site_manager');
end $$;
revoke all on function public.org_seed_defaults(uuid) from public, anon, authenticated;

create or replace function public.org_create(p_name text, p_is_demo boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; v_org uuid;
begin
  if v_uid is null then raise exception 'NOT_SIGNED_IN' using errcode = '28000'; end if;
  select email into v_email from public.profiles where id = v_uid;
  if not exists (select 1 from public.allowed_org_creators where email = v_email)
     and not exists (select 1 from public.memberships where user_id = v_uid and role = 'super_admin' and active) then
    raise exception 'FORBIDDEN:org.create' using errcode = '42501';
  end if;
  insert into public.orgs(name, is_demo) values (btrim(p_name), coalesce(p_is_demo, false)) returning id into v_org;
  insert into public.memberships(org_id, user_id, role, all_sites) values (v_org, v_uid, 'super_admin', true);
  perform public.org_seed_defaults(v_org);
  perform public.audit(v_org, 'rpc:org_create', 'org', v_org::text, p_name);
  return jsonb_build_object('id', v_org);
end $$;

-- Called by the app after every sign-in: joins the organizations this email was invited to.
create or replace function public.claim_invitations()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; i public.invitations; n int := 0; s uuid;
begin
  if v_uid is null then raise exception 'NOT_SIGNED_IN' using errcode = '28000'; end if;
  select email into v_email from public.profiles where id = v_uid;
  for i in select * from public.invitations where email = v_email and accepted_at is null and revoked_at is null for update loop
    insert into public.memberships(org_id, user_id, role, all_sites, approval_limit)
    values (i.org_id, v_uid, i.role, i.all_sites, i.approval_limit)
    on conflict (org_id, user_id) do update set role = excluded.role, all_sites = excluded.all_sites, approval_limit = excluded.approval_limit, active = true;
    delete from public.membership_sites where org_id = i.org_id and user_id = v_uid;
    foreach s in array i.site_ids loop
      insert into public.membership_sites(org_id, user_id, site_id) values (i.org_id, v_uid, s) on conflict do nothing;
    end loop;
    update public.invitations set accepted_at = now() where id = i.id;
    n := n + 1;
  end loop;
  return jsonb_build_object('joined', n);
end $$;

create or replace function public.member_invite(p_org uuid, p_email text, p_role public.app_role, p_all_sites boolean default true,
  p_site_ids uuid[] default '{}', p_approval_limit numeric default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(p_email)); v_id uuid; v_user uuid;
begin
  perform public.require_perm(p_org, 'users.manage');
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'BAD_EMAIL' using errcode = '22023'; end if;
  if p_role = 'super_admin' and public.my_role(p_org) <> 'super_admin' then raise exception 'FORBIDDEN:users.manage' using errcode = '42501'; end if;
  if not coalesce(p_all_sites, true) and coalesce(array_length(p_site_ids, 1), 0) = 0 then raise exception 'SITES_REQUIRED' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_site_ids) s where not exists (select 1 from public.sites x where x.id = s and x.org_id = p_org)) then
    raise exception 'WRONG_ORG' using errcode = '22023'; end if;
  update public.invitations set revoked_at = now() where org_id = p_org and email = v_email and accepted_at is null and revoked_at is null;
  insert into public.invitations(org_id, email, role, all_sites, site_ids, approval_limit)
  values (p_org, v_email, p_role, coalesce(p_all_sites, true), coalesce(p_site_ids, '{}'), p_approval_limit) returning id into v_id;
  -- whether the person already has a login (they join on their next sign-in either way)
  select id into v_user from public.profiles where email = v_email;
  return jsonb_build_object('id', v_id, 'has_account', v_user is not null);
end $$;

create or replace function public.member_update(p_org uuid, p_user uuid, p_role public.app_role, p_all_sites boolean, p_site_ids uuid[],
  p_approval_limit numeric, p_active boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.memberships; s uuid;
begin
  perform public.require_perm(p_org, 'users.manage');
  select * into m from public.memberships where org_id = p_org and user_id = p_user for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if (m.role = 'super_admin' or p_role = 'super_admin') and public.my_role(p_org) <> 'super_admin' then raise exception 'FORBIDDEN:users.manage' using errcode = '42501'; end if;
  -- never leave the organization without an active super admin
  if m.role = 'super_admin' and (p_role <> 'super_admin' or not p_active)
     and not exists (select 1 from public.memberships where org_id = p_org and role = 'super_admin' and active and user_id <> p_user) then
    raise exception 'LAST_SUPER_ADMIN' using errcode = 'P0001';
  end if;
  if not coalesce(p_all_sites, true) and coalesce(array_length(p_site_ids, 1), 0) = 0 then raise exception 'SITES_REQUIRED' using errcode = '22023'; end if;
  update public.memberships set role = p_role, all_sites = coalesce(p_all_sites, true), approval_limit = p_approval_limit, active = coalesce(p_active, true)
   where org_id = p_org and user_id = p_user;
  delete from public.membership_sites where org_id = p_org and user_id = p_user;
  if not coalesce(p_all_sites, true) then
    foreach s in array p_site_ids loop
      if not exists (select 1 from public.sites where id = s and org_id = p_org) then raise exception 'WRONG_ORG' using errcode = '22023'; end if;
      insert into public.membership_sites(org_id, user_id, site_id) values (p_org, p_user, s);
    end loop;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Only known keys with checked types are accepted.
create or replace function public.settings_update(p_org uuid, p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare k text; v jsonb; cur jsonb;
begin
  perform public.require_perm(p_org, 'settings.manage');
  select settings into cur from public.orgs where id = p_org for update;
  for k, v in select * from jsonb_each(p_settings) loop
    if k in ('vat_rate') then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 0 and 0.5 then raise exception 'BAD_SETTING:%', k using errcode = '22023'; end if;
    elsif k in ('receipt_tolerance_pct', 'price_tolerance_pct', 'price_alert_pct', 'cost_of_capital_pct') then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 0 and 100 then raise exception 'BAD_SETTING:%', k using errcode = '22023'; end if;
    elsif k = 'late_supplier_threshold' then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 1 and 50 then raise exception 'BAD_SETTING:%', k using errcode = '22023'; end if;
    elsif k = 'enforce_sod' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'BAD_SETTING:%', k using errcode = '22023'; end if;
    elsif k = 'over_budget_role' then
      if (v #>> '{}') not in ('cfo', 'ceo', 'procurement_manager') then raise exception 'BAD_SETTING:%', k using errcode = '22023'; end if;
    elsif k = 'score_weights' then
      if jsonb_typeof(v) <> 'object' or exists (select 1 from jsonb_each(v) w where w.key not in ('price', 'on_time', 'fill', 'quality', 'service', 'response') or jsonb_typeof(w.value) <> 'number' or (w.value #>> '{}')::numeric < 0) then
        raise exception 'BAD_SETTING:%', k using errcode = '22023'; end if;
    else
      raise exception 'BAD_SETTING:%', k using errcode = '22023';
    end if;
    cur := jsonb_set(cur, array[k], v, true);
  end loop;
  update public.orgs set settings = cur where id = p_org;
  return cur;
end $$;

create or replace function public.org_rename(p_org uuid, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_perm(p_org, 'settings.manage');
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 120 then raise exception 'BAD_NAME' using errcode = '22023'; end if;
  update public.orgs set name = btrim(p_name) where id = p_org;
end $$;

-- Replaces the approval bands of one document type. The bands must start at 0, touch each other and end open.
-- p_rules: [{min_amount, max_amount, step, required_role}]
create or replace function public.approval_rules_replace(p_org uuid, p_doc_type text, p_rules jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_expect numeric := 0; r record; v_open boolean := false;
begin
  perform public.require_perm(p_org, 'settings.manage');
  if p_doc_type not in ('po', 'request') then raise exception 'BAD_DOC_TYPE' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(p_rules, '[]')) = 0 then raise exception 'RULES_REQUIRED' using errcode = '22023'; end if;
  for r in select distinct (x ->> 'min_amount')::numeric mn, (x ->> 'max_amount')::numeric mx
           from jsonb_array_elements(p_rules) x order by 1 loop
    if v_open then raise exception 'RULES_OVERLAP' using errcode = '22023'; end if;
    if r.mn <> v_expect then raise exception 'RULES_GAP:%', v_expect using errcode = '22023'; end if;
    if r.mx is null then v_open := true; else
      if r.mx <= r.mn then raise exception 'RULES_BAD_BAND' using errcode = '22023'; end if;
      v_expect := r.mx;
    end if;
  end loop;
  if not v_open then raise exception 'RULES_NOT_OPEN_ENDED' using errcode = '22023'; end if;
  delete from public.approval_rules where org_id = p_org and doc_type = p_doc_type;
  insert into public.approval_rules(org_id, doc_type, min_amount, max_amount, step, required_role)
  select p_org, p_doc_type, (x ->> 'min_amount')::numeric, (x ->> 'max_amount')::numeric, (x ->> 'step')::int, (x ->> 'required_role')::public.app_role
  from jsonb_array_elements(p_rules) x;
  return jsonb_build_object('ok', true);
end $$;
