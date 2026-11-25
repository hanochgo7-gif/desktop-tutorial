-- Test fixture (runs as the database owner). Fixed ids so test files can switch users by id.
-- Users: one per role in org 1; site managers are limited to their site; a second org checks isolation.
create schema if not exists tst;
grant usage on schema tst to authenticated;

create or replace function tst.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'FAIL: %', p_name; end if;
  raise notice 'ok - %', p_name;
end $$;

-- Runs a statement and expects it to fail with a message containing p_pattern.
create or replace function tst.err(p_sql text, p_pattern text, p_name text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_pattern in sqlerrm) = 0 then raise exception 'FAIL: % (expected "%", got "%")', p_name, p_pattern, sqlerrm; end if;
    raise notice 'ok - % (%)', p_name, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (expected error "%", none raised)', p_name, p_pattern;
end $$;
grant execute on all functions in schema tst to authenticated;

-- ids
create or replace function tst.u(p text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' || p)::uuid $$;
grant execute on function tst.u(text) to authenticated;

insert into auth.users(id, email, raw_user_meta_data) values
  (tst.u('a1'), 'admin@t.test', '{"full_name":"אדמין"}'),
  (tst.u('a2'), 'ceo@t.test', '{"full_name":"מנכ״ל"}'),
  (tst.u('a3'), 'cfo@t.test', '{"full_name":"סמנכ״ל כספים"}'),
  (tst.u('a4'), 'pm@t.test', '{"full_name":"מנהל רכש"}'),
  (tst.u('a5'), 'buyer@t.test', '{"full_name":"קניין"}'),
  (tst.u('a6'), 'sma@t.test', '{"full_name":"מנהל אתר א"}'),
  (tst.u('a7'), 'wh@t.test', '{"full_name":"מנהל מחסן"}'),
  (tst.u('a8'), 'prj@t.test', '{"full_name":"מנהל פרויקט ב"}'),
  (tst.u('a9'), 'aud@t.test', '{"full_name":"מבקר"}'),
  (tst.u('aa'), 'view@t.test', '{"full_name":"צופה"}'),
  (tst.u('ab'), 'smb@t.test', '{"full_name":"מנהל אתר ב"}'),
  (tst.u('ac'), 'other@t.test', '{"full_name":"ארגון אחר"}'),
  (tst.u('ad'), 'buyer2@t.test', '{"full_name":"קניין 2"}');

insert into public.allowed_org_creators(email) values ('admin@t.test'), ('other@t.test');

-- org 1 is created through the API (as admin), so defaults are seeded exactly as in production
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public.org_create('בדיקות', true);
commit;

create or replace function tst.org() returns uuid language sql stable security definer as $$
  select id from public.orgs where name = 'בדיקות' $$;
grant execute on function tst.org() to authenticated;

insert into public.sites(id, org_id, code, name, kind) values
  (tst.u('b0'), tst.org(), 'W', 'מחסן מרכזי', 'warehouse'),
  (tst.u('b1'), tst.org(), 'A', 'אתר א', 'site'),
  (tst.u('b2'), tst.org(), 'B', 'אתר ב', 'site');

insert into public.memberships(org_id, user_id, role, all_sites) values
  (tst.org(), tst.u('a2'), 'ceo', true),
  (tst.org(), tst.u('a3'), 'cfo', true),
  (tst.org(), tst.u('a4'), 'procurement_manager', true),
  (tst.org(), tst.u('a5'), 'buyer', true),
  (tst.org(), tst.u('ad'), 'buyer', true),
  (tst.org(), tst.u('a6'), 'site_manager', false),
  (tst.org(), tst.u('a7'), 'warehouse_manager', true),
  (tst.org(), tst.u('a8'), 'project_manager', false),
  (tst.org(), tst.u('a9'), 'auditor', true),
  (tst.org(), tst.u('aa'), 'viewer', true),
  (tst.org(), tst.u('ab'), 'site_manager', false);
insert into public.membership_sites(org_id, user_id, site_id) values
  (tst.org(), tst.u('a6'), tst.u('b1')),
  (tst.org(), tst.u('a8'), tst.u('b2')),
  (tst.org(), tst.u('ab'), tst.u('b2'));

insert into public.categories(id, org_id, name) values
  (tst.u('c1'), tst.org(), 'חומרי בנייה'),
  (tst.u('c2'), tst.org(), 'ציוד בטיחות');
insert into public.items(id, org_id, sku, name, category_id, uom, min_qty, max_qty, lead_time_days) values
  (tst.u('d1'), tst.org(), 'CEM-50', 'מלט 50 ק״ג', tst.u('c1'), 'שק', 10, 100, 3),
  (tst.u('d2'), tst.org(), 'GLV-01', 'כפפות עבודה', tst.u('c2'), 'זוג', 20, 200, 5),
  (tst.u('d3'), tst.org(), 'GEN-500', 'גנרטור 500 קו״א', null, 'יח׳', null, null, 30);

insert into public.suppliers(id, org_id, name, company_no, payment_terms, credit_days) values
  (tst.u('e1'), tst.org(), 'ספק אחד', '511111111', 'שוטף + 30', 30),
  (tst.u('e2'), tst.org(), 'ספק שניים', '522222222', 'שוטף + 60', 60),
  (tst.u('e3'), tst.org(), 'ספק שלוש', '533333333', 'מזומן', 0);

insert into public.budgets(id, org_id, name, site_id, period_start, period_end, original_amount) values
  (tst.u('f1'), tst.org(), 'תקציב אתר א 2026', tst.u('b1'), '2026-01-01', '2026-12-31', 30000);

-- org 2
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ac';
select public.org_create('ארגון אחר', false);
commit;
insert into public.sites(id, org_id, code, name) select tst.u('b9'), id, 'X', 'אתר זר' from public.orgs where name = 'ארגון אחר';
insert into public.items(id, org_id, sku, name) select tst.u('d9'), id, 'CEM-50', 'מלט זר' from public.orgs where name = 'ארגון אחר';
