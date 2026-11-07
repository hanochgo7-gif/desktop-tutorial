-- Customer panel round 1: server side of the rules in js/core/rules.js.

-- phone numbers written with the international prefix 00 (00972...) are the same number as 0...
create or replace function public.crm_norm_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(case when d like '972%' then '0' || substr(d, 4) else d end, '')
  from (select regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^00', '') as d) x
$$;

-- a source found out later for a lead also applies to its deals that had none (revenue follows the source)
create or replace function public.crm_contacts_source_to_deals()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.first_source_id is null and new.first_source_id is not null then
    update public.crm_deals set source_id = new.first_source_id where contact_id = new.id and source_id is null;
  end if;
  return new;
end $$;
revoke all on function public.crm_contacts_source_to_deals() from public, anon, authenticated;
create trigger d_source_to_deals after update of first_source_id on public.crm_contacts for each row execute function public.crm_contacts_source_to_deals();

-- payments are kept as a list in crm_deals.props.payments ([{id, amount (before VAT), gross, vat, date, note}]);
-- amount_paid / paid_at remain the totals, maintained by the app.
