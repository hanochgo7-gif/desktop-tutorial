-- 004: no minimum age (owner's decision, November 2026). Replaces lucid_profiles_guard from 001 without the
-- under-16 refusal. 001 and 002 are already applied and stay as they are; this file supersedes their 16+ comments.
-- (Numbered 004 because 003_lucid_export_account.sql already exists.)
--   * The birth year is still required and still the only date stored (data minimisation). Sanity bounds stay: it
--     cannot be in the future, and the age cannot be over 120.
--   * Under 18: marketing_opt_in is forced off, whatever the client sends (as before).
--   * Under 16: guardian_consent_at records when a parent or guardian agreed that the learner's progress is kept
--     in an account on the server (the app asks for it before it creates the profile). A profile under 16 without
--     it is refused, and records need a profile (002, S-05), so nothing of an unconfirmed under-16 is stored.
--     The value is self-declared by the client, like the birth year. Whether a ticked box is a sufficient legal
--     basis must be reviewed before a public launch (docs/09-roadmap.md LB-04).
-- Age is the current year minus the birth year, so it can be one year more than the real age (privacy.html).
-- Safe to run more than once. Run after 003_lucid_export_account.sql.

alter table public.lucid_profiles add column if not exists guardian_consent_at timestamptz;

comment on column public.lucid_profiles.birth_year is
  'Only the birth year is stored (data minimisation). There is no minimum age; protections depend on age (lucid_profiles_guard).';
comment on column public.lucid_profiles.guardian_consent_at is
  'When a parent or guardian agreed to an account for a learner under 16. Required while the learner is under 16.';

create or replace function public.lucid_profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  age int := extract(year from now())::int - new.birth_year;
begin
  if new.birth_year is null or age < 0 or age > 120 then
    raise exception 'The birth year must be a past year, at most 120 years ago' using errcode = '22023';
  end if;
  -- A parent or guardian confirms before the account of a learner under 16 is kept on the server.
  if age < 16 and new.guardian_consent_at is null then
    raise exception 'A parent or guardian must agree before a learner under 16 has an account' using errcode = '22023';
  end if;
  -- No marketing to minors, whatever the client sends.
  if age < 18 then new.marketing_opt_in := false; end if;
  new.updated_at := now();
  return new;
end $$;

-- The trigger itself (from 001) already calls this function; re-created so this file also stands on its own.
drop trigger if exists lucid_profiles_guard on public.lucid_profiles;
create trigger lucid_profiles_guard before insert or update on public.lucid_profiles
  for each row execute function public.lucid_profiles_guard();
