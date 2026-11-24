-- 004: no minimum age (owner's decision, November 2026). Replaces lucid_profiles_guard from 001 without the
-- under-16 refusal. 001 and 002 are already applied and stay as they are; this file supersedes their 16+ comments.
-- (Numbered 004 because 003_lucid_export_account.sql already exists.)
--   * The birth year is still required and still the only date stored (data minimisation). Sanity bounds stay: it
--     cannot be in the future, and the age cannot be over 120.
--   * Under 18: marketing_opt_in is forced off, whatever the client sends (as before).
--   * Under 16: guardian_consent_at records when a parent or guardian agreed that the learner's progress is kept
--     in an account on the server (the app asks for it before it creates the profile). A new profile under 16
--     without it is refused, and records need a profile (002, S-05), so nothing of a new unconfirmed under-16 is
--     stored. The value is self-declared by the client, like the birth year. Whether a ticked box is a sufficient
--     legal basis must be reviewed before a public launch (docs/09-roadmap.md LB-04).
--   * Profiles made under 001 (16+ by the older age) for a learner born in the last year that gate let in count as
--     under 16 now and have no agreement. They are not deleted, and they can still be updated (withdrawing AI
--     consent, a name), but: their AI consent is cleared below and cannot be set again, and they cannot store new
--     records (lucid_records_own), until the agreement is given. What they already stored stays, and can be
--     exported or deleted as before.
-- Only the year is stored, so the real age is the current year minus the birth year, or one less before the
-- birthday. The current year is the UTC year, whatever the session's time zone, as in the app (js/core/age.js), so
-- the two never disagree around New Year's Eve. The sanity bound uses the older value (nobody is turned away); the protections use the younger one, so
-- a 15-year-old born late in the year is still treated as under 16, and a 17-year-old as under 18 (js/core/age.js,
-- privacy.html).
-- Safe to run more than once. Run after 003_lucid_export_account.sql.

alter table public.lucid_profiles add column if not exists guardian_consent_at timestamptz;

comment on column public.lucid_profiles.birth_year is
  'Only the birth year is stored (data minimisation). There is no minimum age; protections depend on age (lucid_profiles_guard).';
comment on column public.lucid_profiles.guardian_consent_at is
  'When a parent or guardian agreed to an account for a learner under 16. Required while the learner is under 16.';

create or replace function public.lucid_profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  age int := extract(year from now() at time zone 'UTC')::int - new.birth_year; -- the oldest the learner can be
  youngest int := greatest(age - 1, 0);                                         -- the youngest: protections use it
begin
  if new.birth_year is null or age < 0 or age > 120 then
    raise exception 'The birth year must be a past year, at most 120 years ago' using errcode = '22023';
  end if;
  if youngest < 16 and new.guardian_consent_at is null then
    -- A parent or guardian confirms before the account of a learner under 16 is kept on the server: a new profile,
    -- a younger birth year or a withdrawn agreement is refused.
    if tg_op = 'INSERT' or new.birth_year is distinct from old.birth_year or old.guardian_consent_at is not null then
      raise exception 'A parent or guardian must agree before a learner under 16 has an account' using errcode = '22023';
    end if;
    -- A profile from before 004 without the agreement: other changes go through, but AI consent stays off.
    new.consent_ai_at := null;
  end if;
  -- No marketing to minors, whatever the client sends.
  if youngest < 18 then new.marketing_opt_in := false; end if;
  new.updated_at := now();
  return new;
end $$;

-- The trigger itself (from 001) already calls this function; re-created so this file also stands on its own.
drop trigger if exists lucid_profiles_guard on public.lucid_profiles;
create trigger lucid_profiles_guard before insert or update on public.lucid_profiles
  for each row execute function public.lucid_profiles_guard();

-- A learner who counts as under 16 and has no guardian's agreement (only possible for a profile from before 004)
-- stores no new records; reading and deleting their own stay as in 002.
drop policy if exists lucid_records_own on public.lucid_records;
create policy lucid_records_own on public.lucid_records
  for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.lucid_profiles p where p.id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.lucid_profiles p where p.id = (select auth.uid())
    and (p.guardian_consent_at is not null or extract(year from now() at time zone 'UTC')::int - p.birth_year - 1 >= 16)));

-- Those profiles' AI consent was given by the learner alone under the 16+ rule: cleared (the trigger allows the update).
update public.lucid_profiles set consent_ai_at = null
  where consent_ai_at is not null and guardian_consent_at is null
    and extract(year from now() at time zone 'UTC')::int - birth_year - 1 < 16;
