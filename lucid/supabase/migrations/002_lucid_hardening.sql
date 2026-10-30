-- Lucid 002: hardening after the October 2026 security review (docs/qa/security-review.md).
--   S-02, S-09  AI units are reserved before the model is called, in one transaction, by a SECURITY DEFINER
--               function that only the service role (the lucid-ai edge function) may execute. A per-learner
--               advisory lock serialises reservations, and a project-wide daily budget is checked in the same
--               transaction. Every reserved request stays metered, whatever the model call returns.
--   S-05        Learner records need a profile. The profile insert is where the 16+ gate runs, so an account
--               whose profile was refused cannot store records either.
--   S-07        Per-account quota on lucid_records (records and bytes); the goals text is bounded.
--   S-16        authenticated and anon lose TRUNCATE, REFERENCES and TRIGGER on every lucid_ table.
-- Lucid needs a dedicated Supabase project (docs/setup.md, S-13): lucid_delete_account deletes the auth.users
-- row, which would also remove the person from any other app sharing the project.
-- Safe to run more than once. Run after 001_lucid_core.sql.

-- ---------- AI metering (S-02, S-09) ----------
-- 'pending' marks a reservation whose model call has not finished yet. Rows written before this migration
-- (and by an older edge function, which inserted only after success) are 'ok'.
alter table public.lucid_ai_usage add column if not exists outcome text not null default 'ok';
alter table public.lucid_ai_usage drop constraint if exists lucid_ai_usage_outcome;
alter table public.lucid_ai_usage add constraint lucid_ai_usage_outcome
  check (outcome in ('pending', 'ok', 'refused', 'incomplete', 'error'));

-- Units reserved per UTC day across all learners. A separate counter (not a sum over lucid_ai_usage) so that
-- deleting an account does not hand its spend back to the project budget.
create table if not exists public.lucid_ai_budget (
  day date primary key,
  units int not null default 0 check (units >= 0)
);
alter table public.lucid_ai_budget enable row level security;

-- Reserve p_units for one AI request, or say why not. Returns {"ok": true, "id": <usage row>} or
-- {"ok": false, "reason": "daily" | "hourly" | "in_flight" | "global"}.
-- Windows: the last hour and the last 24 hours per learner; the current UTC day for the project.
-- In flight: reservations still 'pending' from the last 10 minutes (older ones stay metered but stop counting
-- as open, so a crashed call cannot block the learner for long).
create or replace function public.lucid_ai_reserve(
  p_user uuid, p_route text, p_units int,
  p_hourly int, p_daily int, p_global_daily int, p_max_in_flight int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_hour int;
  v_day int;
  v_open int;
  v_global int;
  v_id bigint;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_user is null or p_route is null or coalesce(p_units, 0) < 1
     or p_hourly is null or p_daily is null or p_global_daily is null or p_max_in_flight is null then
    raise exception 'invalid AI reservation' using errcode = '22023';
  end if;

  -- One reservation at a time per learner: a parallel request waits here, then sees this one's row
  -- (each statement below takes a fresh snapshot under READ COMMITTED).
  perform pg_advisory_xact_lock(hashtext('lucid_ai_reserve'), hashtext(p_user::text));

  select coalesce(sum(u.units) filter (where u.created_at > now() - interval '1 hour'), 0),
         coalesce(sum(u.units), 0),
         count(*) filter (where u.outcome = 'pending' and u.created_at > now() - interval '10 minutes')
    into v_hour, v_day, v_open
    from public.lucid_ai_usage u
   where u.user_id = p_user and u.created_at > now() - interval '24 hours';

  if v_day + p_units > p_daily then return jsonb_build_object('ok', false, 'reason', 'daily'); end if;
  if v_hour + p_units > p_hourly then return jsonb_build_object('ok', false, 'reason', 'hourly'); end if;
  if v_open >= p_max_in_flight then return jsonb_build_object('ok', false, 'reason', 'in_flight'); end if;

  -- Project-wide budget. The row lock serialises reservations across learners for the rest of this
  -- transaction. Lock order is always learner lock, then budget row, so two calls cannot deadlock.
  insert into public.lucid_ai_budget (day) values (v_today) on conflict (day) do nothing;
  select b.units into v_global from public.lucid_ai_budget b where b.day = v_today for update;
  if v_global + p_units > p_global_daily then return jsonb_build_object('ok', false, 'reason', 'global'); end if;
  update public.lucid_ai_budget set units = units + p_units where day = v_today;

  insert into public.lucid_ai_usage (user_id, route, units, outcome)
    values (p_user, p_route, p_units, 'pending')
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ---------- records need a profile (S-05) ----------
drop policy if exists lucid_records_own on public.lucid_records;
create policy lucid_records_own on public.lucid_records
  for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.lucid_profiles p where p.id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.lucid_profiles p where p.id = (select auth.uid())));

-- ---------- storage quota (S-07) ----------
alter table public.lucid_profiles drop constraint if exists lucid_profiles_goals_text;
alter table public.lucid_profiles add constraint lucid_profiles_goals_text
  check (char_length(array_to_string(goals, '')) <= 640);

-- Running totals per account, kept by the trigger below (summing on every insert would be too slow).
create table if not exists public.lucid_storage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  record_count int not null default 0,
  byte_count bigint not null default 0
);
alter table public.lucid_storage enable row level security;

-- The limits. To change them, re-create this function with other numbers. Bytes are the JSON text of
-- `data`. An attempt record is roughly 250-400 bytes, so the record limit is usually reached first.
create or replace function public.lucid_storage_limits(out max_records int, out max_bytes bigint)
language sql immutable set search_path = '' as $$
  select 100000, 50::bigint * 1024 * 1024
$$;

-- AFTER row trigger, so an upsert that turns into an update is counted once (a BEFORE INSERT trigger would
-- also fire for upserts that end up updating). Only writes that grow an account are refused, so an account
-- over a lowered limit can still delete or shrink records.
create or replace function public.lucid_records_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  d_count int := 1;
  d_bytes bigint;
  v_count int;
  v_bytes bigint;
  lim record;
begin
  if tg_op = 'DELETE' then
    -- update, never insert: during account deletion the storage row may already be gone.
    update public.lucid_storage
       set record_count = record_count - 1, byte_count = byte_count - octet_length(old.data::text)
     where user_id = old.user_id;
    return null;
  end if;

  d_bytes := octet_length(new.data::text);
  if tg_op = 'UPDATE' then
    if new.user_id = old.user_id then
      d_count := 0;
      d_bytes := d_bytes - octet_length(old.data::text);
      if d_bytes = 0 then return null; end if;
    else
      update public.lucid_storage
         set record_count = record_count - 1, byte_count = byte_count - octet_length(old.data::text)
       where user_id = old.user_id;
    end if;
  end if;

  insert into public.lucid_storage as s (user_id, record_count, byte_count)
  values (new.user_id, d_count, d_bytes)
  on conflict (user_id) do update
    set record_count = s.record_count + excluded.record_count, byte_count = s.byte_count + excluded.byte_count
  returning s.record_count, s.byte_count into v_count, v_bytes;

  select * into lim from public.lucid_storage_limits();
  if (d_count > 0 or d_bytes > 0) and (v_count > lim.max_records or v_bytes > lim.max_bytes) then
    raise exception 'Lucid storage limit reached for this account (% records or % MB)',
      lim.max_records, lim.max_bytes / 1048576
      using errcode = '54000', hint = 'lucid_storage_quota';
  end if;
  return null;
end $$;

drop trigger if exists lucid_records_quota on public.lucid_records;
create trigger lucid_records_quota after insert or update or delete on public.lucid_records
  for each row execute function public.lucid_records_quota();

-- Count what is already stored (a no-op on a new project; recomputes if run again).
insert into public.lucid_storage (user_id, record_count, byte_count)
select r.user_id, count(*), coalesce(sum(octet_length(r.data::text)), 0)
  from public.lucid_records r group by r.user_id
on conflict (user_id) do update set record_count = excluded.record_count, byte_count = excluded.byte_count;

-- ---------- privileges (S-16 and the new objects) ----------
-- Supabase's default privileges grant everything on new tables and functions to anon and authenticated.
revoke truncate, references, trigger on public.lucid_profiles, public.lucid_records, public.lucid_ai_usage from authenticated, anon;
revoke all on public.lucid_ai_budget, public.lucid_storage from anon, authenticated;
revoke all on function public.lucid_ai_reserve(uuid, text, int, int, int, int, int) from public, anon, authenticated;
grant execute on function public.lucid_ai_reserve(uuid, text, int, int, int, int, int) to service_role;
revoke all on function public.lucid_records_quota() from public, anon, authenticated;
revoke all on function public.lucid_storage_limits() from public, anon, authenticated;
