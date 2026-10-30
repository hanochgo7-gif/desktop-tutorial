-- Lucid: learner data (curriculum content is static, versioned JSON served with the app).
-- Every table is prefixed lucid_ so Lucid can share a Supabase project with other apps.
-- Row-level security restricts every row to its owner; the anon role gets no table access.

-- ---------- profiles ----------
create table if not exists public.lucid_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  -- Only the birth year is stored (data minimisation). Users must be 16+; 16-17 year-olds get
  -- protective defaults (see lucid_profiles_guard).
  birth_year int not null,
  ui_language text not null default 'he' check (ui_language in ('he', 'en')),
  hebrew_support text not null default 'full' check (hebrew_support in ('full', 'partial', 'minimal', 'off')),
  english_variant text not null default 'any' check (english_variant in ('US', 'UK', 'any')),
  goals text[] not null default '{}' check (cardinality(goals) <= 8),
  daily_minutes int not null default 20 check (daily_minutes between 5 and 120),
  level text check (level in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  consent_terms_at timestamptz not null default now(),
  consent_ai_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.lucid_profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  age int := extract(year from now())::int - new.birth_year;
begin
  if new.birth_year is null or age < 16 or age > 120 then
    raise exception 'Lucid is for learners aged 16 and over' using errcode = '22023';
  end if;
  -- No marketing to minors, whatever the client sends.
  if age < 18 then new.marketing_opt_in := false; end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists lucid_profiles_guard on public.lucid_profiles;
create trigger lucid_profiles_guard before insert or update on public.lucid_profiles
  for each row execute function public.lucid_profiles_guard();

-- ---------- learner records (local-first sync) ----------
-- The app keeps its state in collections (progress, attempts, cards, ...). Each record is synced
-- here as a JSON document; the server stamps updated_at, and clients pull changes since their
-- last cursor. Last write wins, which is enough for one learner on several devices.
create table if not exists public.lucid_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coll text not null check (coll in ('progress', 'attempts', 'cards', 'writing', 'chats', 'settings', 'placement', 'events')),
  id text not null check (char_length(id) between 1 and 120),
  data jsonb not null check (pg_column_size(data) <= 65536),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, id)
);
create index if not exists lucid_records_sync on public.lucid_records (user_id, updated_at);

create or replace function public.lucid_records_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists lucid_records_stamp on public.lucid_records;
create trigger lucid_records_stamp before insert or update on public.lucid_records
  for each row execute function public.lucid_records_stamp();

-- ---------- AI usage (rate limiting and cost transparency) ----------
-- Written only by the lucid-ai edge function with the service role; learners can read their own.
create table if not exists public.lucid_ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  route text not null check (route in ('evaluate_writing', 'roleplay_turn', 'roleplay_feedback', 'tutor_turn')),
  units int not null default 1 check (units between 1 and 10),
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);
create index if not exists lucid_ai_usage_window on public.lucid_ai_usage (user_id, created_at);

-- ---------- row-level security ----------
alter table public.lucid_profiles enable row level security;
alter table public.lucid_records enable row level security;
alter table public.lucid_ai_usage enable row level security;

drop policy if exists lucid_profiles_own on public.lucid_profiles;
create policy lucid_profiles_own on public.lucid_profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists lucid_records_own on public.lucid_records;
create policy lucid_records_own on public.lucid_records
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lucid_ai_usage_read_own on public.lucid_ai_usage;
create policy lucid_ai_usage_read_own on public.lucid_ai_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.lucid_profiles, public.lucid_records, public.lucid_ai_usage from anon;
revoke insert, update, delete on public.lucid_ai_usage from authenticated;
grant select, insert, update, delete on public.lucid_profiles, public.lucid_records to authenticated;
grant select on public.lucid_ai_usage to authenticated;

-- ---------- export and deletion ----------
-- Export everything stored about the caller (runs with the caller's rights, so RLS applies).
create or replace function public.lucid_export() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.lucid_profiles p where p.id = auth.uid()),
    'records', coalesce((select jsonb_agg(jsonb_build_object('coll', r.coll, 'id', r.id, 'data', r.data, 'deleted', r.deleted, 'updated_at', r.updated_at) order by r.coll, r.id)
                         from public.lucid_records r where r.user_id = auth.uid()), '[]'::jsonb),
    'ai_usage', coalesce((select jsonb_agg(jsonb_build_object('route', u.route, 'units', u.units, 'created_at', u.created_at) order by u.created_at)
                          from public.lucid_ai_usage u where u.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- Delete the caller's account. Every lucid_ table cascades from auth.users.
create or replace function public.lucid_delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.lucid_export() from public, anon;
revoke all on function public.lucid_delete_account() from public, anon;
grant execute on function public.lucid_export() to authenticated;
grant execute on function public.lucid_delete_account() to authenticated;
