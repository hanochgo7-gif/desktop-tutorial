-- payments received against a document: [{ id, amount (incl. VAT), date, note }]
alter table public.crm_documents add column if not exists payments jsonb not null default '[]'::jsonb check (jsonb_typeof(payments) = 'array');

-- same rules as js/core/rules.js: totals from the lines, paid from the payments list, status from what was paid
create or replace function public.crm_documents_rules()
returns trigger language plpgsql set search_path = '' as $$
declare it jsonb; sub numeric := 0; p numeric := 0;
begin
  for it in select * from jsonb_array_elements(new.items) loop
    if coalesce((it ->> 'qty')::numeric, 0) < 0 or coalesce((it ->> 'price')::numeric, 0) < 0 then
      raise exception 'invalid_line_item' using errcode = 'check_violation';
    end if;
    sub := sub + round(coalesce((it ->> 'qty')::numeric, 0) * coalesce((it ->> 'price')::numeric, 0), 2);
  end loop;
  new.subtotal := round(sub, 2);
  new.vat := round(sub * new.vat_rate / 100, 2);
  new.total := new.subtotal + new.vat;
  for it in select * from jsonb_array_elements(coalesce(new.payments, '[]'::jsonb)) loop
    p := p + coalesce((it ->> 'amount')::numeric, 0);
  end loop;
  if p > 0 then new.paid := round(p, 2); end if;
  if new.status <> 'canceled' then
    if new.total > 0 and new.paid >= new.total - 0.005 then new.status := 'paid';
    elsif new.paid > 0 and new.status in ('draft', 'sent', 'paid') then new.status := 'partial';
    elsif new.status in ('paid', 'partial') then new.status := 'sent'; end if;
  end if;
  return new;
end $$;
