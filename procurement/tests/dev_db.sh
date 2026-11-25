#!/bin/sh
# Local development database proc_dev: all migrations, a demo organization with history, and one login per role.
# Every login uses the dev server password (demo1234). Usage: tests/dev_db.sh
set -e
cd "$(dirname "$0")/.."
PSQL="psql -h /tmp -p ${PGPORT:-5499} -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists proc_dev" -c "create database proc_dev" >/dev/null
$PSQL -d proc_dev -f tests/local_supabase_stub.sql >/dev/null 2>&1
for f in supabase/migrations/*.sql; do $PSQL -d proc_dev -f "$f" >/dev/null 2>&1 || { echo "FAILED in $f"; exit 1; }; done
$PSQL -d proc_dev -f tests/seed_demo.sql >/dev/null
$PSQL -d proc_dev <<'SQL' >/dev/null
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000d002', 'cfo@example.com', '{"full_name":"סמנכ״לית כספים (הדגמה)"}'),
  ('00000000-0000-0000-0000-00000000d003', 'buyer@example.com', '{"full_name":"מנהלת רכש (הדגמה)"}'),
  ('00000000-0000-0000-0000-00000000d004', 'site@example.com', '{"full_name":"מנהל אתר צפון (הדגמה)"}'),
  ('00000000-0000-0000-0000-00000000d005', 'warehouse@example.com', '{"full_name":"מנהל מחסן (הדגמה)"}'),
  ('00000000-0000-0000-0000-00000000d006', 'viewer@example.com', '{"full_name":"צופה (הדגמה)"}');
insert into public.memberships(org_id, user_id, role, all_sites)
select o.id, u.id::uuid, u.role::public.app_role, u.all_sites from public.orgs o,
  (values ('00000000-0000-0000-0000-00000000d002', 'cfo', true), ('00000000-0000-0000-0000-00000000d003', 'procurement_manager', true),
          ('00000000-0000-0000-0000-00000000d004', 'site_manager', false), ('00000000-0000-0000-0000-00000000d005', 'warehouse_manager', true),
          ('00000000-0000-0000-0000-00000000d006', 'viewer', true)) u(id, role, all_sites);
insert into public.membership_sites(org_id, user_id, site_id)
select o.id, '00000000-0000-0000-0000-00000000d004', s.id from public.orgs o join public.sites s on s.org_id = o.id and s.code = 'N1';
SQL
echo "proc_dev ready: demo@example.com (super admin), cfo@, buyer@, site@, warehouse@, viewer@example.com – password demo1234"
