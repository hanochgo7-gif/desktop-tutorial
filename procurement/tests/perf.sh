#!/bin/sh
# Builds a scratch database proc_perf with load-test data and prints timings of the heavy reads.
cd "$(dirname "$0")/.."
PSQL="psql -h /tmp -p ${PGPORT:-5499} -U postgres -q"
$PSQL -d postgres -c "drop database if exists proc_perf" -c "create database proc_perf" >/dev/null 2>&1
$PSQL -d proc_perf -f tests/local_supabase_stub.sql >/dev/null 2>&1
for f in supabase/migrations/*.sql; do case "$f" in *_supabase_only.sql) continue;; esac; $PSQL -d proc_perf -f "$f" >/dev/null 2>&1; done
$PSQL -d proc_perf -f tests/perf.sql 2>&1 | grep -E "Time:|movements|rows|bytes|alerts|page|scores|---" | grep -v "^ *$"
