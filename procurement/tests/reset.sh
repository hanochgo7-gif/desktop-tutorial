#!/bin/sh
# Rebuild the local test database from scratch: stub + all migrations. Usage: tests/reset.sh
set -e
PSQL="psql -h /tmp -p ${PGPORT:-5499} -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists proc_test" -c "create database proc_test"
$PSQL -d proc_test -f "$(dirname "$0")/local_supabase_stub.sql"
for f in "$(dirname "$0")"/../supabase/migrations/*.sql; do
  case "$f" in *_supabase_only.sql) continue;; esac
  $PSQL -d proc_test -f "$f" || { echo "FAILED in $f"; exit 1; }
done
echo "db ready"
