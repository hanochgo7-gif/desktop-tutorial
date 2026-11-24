-- Dira Ready — database schema. Safe to run more than once (Supabase SQL editor or `supabase db push`).
-- The browser never talks to these tables: every table has row-level security on and no policies,
-- and the functions are callable only with the service-role key from the server.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  credits integer not null default 0 check (credits >= 0),
  pro_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.accounts(user_id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('signup_bonus', 'purchase', 'ai_job', 'ai_refund', 'admin')),
  ref text,
  idempotency_key text not null unique,
  balance_after integer not null,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user on public.credit_ledger (user_id, id desc);

-- Purchases outlive a deleted account (bookkeeping); the link to the person is removed.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.accounts(user_id) on delete set null,
  product text not null,
  amount_ils numeric(10, 2) not null check (amount_ils > 0),
  credits integer not null check (credits >= 0),
  pro_days integer not null default 0,
  provider text not null check (provider in ('grow', 'mock', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  process_token text,
  provider_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists purchases_user on public.purchases (user_id, created_at desc);

create table if not exists public.ai_jobs (
  id uuid primary key,
  user_id uuid not null references public.accounts(user_id) on delete cascade,
  tool text not null,
  params jsonb not null default '{}'::jsonb,
  model text not null,
  provider text not null check (provider in ('replicate', 'mock')),
  provider_id text unique,
  status text not null default 'queued' check (status in ('queued', 'running', 'finalizing', 'succeeded', 'failed', 'canceled')),
  cost integer not null,
  input_path text,
  mask_path text,
  output_path text,
  error text,
  test boolean not null default false,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  files_deleted boolean not null default false,
  unique (user_id, idempotency_key)
);
create index if not exists ai_jobs_user on public.ai_jobs (user_id, created_at desc);
create index if not exists ai_jobs_cleanup on public.ai_jobs (created_at) where files_deleted = false;

alter table public.accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.purchases enable row level security;
alter table public.ai_jobs enable row level security;

-- Creates the account on first sign-in and grants the sign-up bonus exactly once.
create or replace function public.ensure_account(p_user uuid, p_email text, p_bonus integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (user_id, email) values (p_user, p_email) on conflict (user_id) do nothing;
  if p_bonus > 0 and not exists (select 1 from credit_ledger where idempotency_key = 'signup:' || p_user) then
    update accounts set credits = credits + p_bonus where user_id = p_user;
    insert into credit_ledger (user_id, delta, reason, ref, idempotency_key, balance_after)
    select p_user, p_bonus, 'signup_bonus', null, 'signup:' || p_user, credits from accounts where user_id = p_user;
  end if;
end $$;

-- The only way credits change. Locks the account row, refuses to go below zero, and never applies
-- the same idempotency key twice.
create or replace function public.apply_credits(p_user uuid, p_delta integer, p_reason text, p_ref text, p_key text)
returns table (result text, balance integer) language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  select credits into cur from accounts where user_id = p_user for update;
  if cur is null then raise exception 'no account for %', p_user; end if;
  if exists (select 1 from credit_ledger where idempotency_key = p_key) then
    return query select 'duplicate'::text, cur; return;
  end if;
  if cur + p_delta < 0 then
    return query select 'insufficient'::text, cur; return;
  end if;
  update accounts set credits = cur + p_delta where user_id = p_user;
  insert into credit_ledger (user_id, delta, reason, ref, idempotency_key, balance_after)
  values (p_user, p_delta, p_reason, p_ref, p_key, cur + p_delta);
  return query select 'applied'::text, cur + p_delta;
end $$;

-- Completes a pending purchase: marks it paid, grants its credits and extends Pro — all or nothing.
create or replace function public.mark_purchase_paid(p_purchase uuid, p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare p purchases%rowtype;
begin
  update purchases set status = 'paid', paid_at = now(), provider_ref = p_ref
  where id = p_purchase and status = 'pending' returning * into p;
  if not found or p.user_id is null then return false; end if;
  perform apply_credits(p.user_id, p.credits, 'purchase', p.id::text, 'purchase:' || p.id);
  if p.pro_days > 0 then
    update accounts set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(days => p.pro_days)
    where user_id = p.user_id;
  end if;
  return true;
end $$;

revoke all on function public.ensure_account(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.apply_credits(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_purchase_paid(uuid, text) from public, anon, authenticated;
grant execute on function public.ensure_account(uuid, text, integer) to service_role;
grant execute on function public.apply_credits(uuid, integer, text, text, text) to service_role;
grant execute on function public.mark_purchase_paid(uuid, text) to service_role;

-- Private bucket for AI inputs and outputs; files are reachable only through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-files', 'ai-files', false, 26214400, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;
