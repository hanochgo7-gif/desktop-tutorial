#!/bin/sh
# Runs the database test suite on a fresh local database. Usage: tests/run.sh [file-pattern]
set -e
cd "$(dirname "$0")/.."
tests/reset.sh >/dev/null 2>&1
PSQL="psql -h /tmp -p ${PGPORT:-5499} -U postgres -d proc_test -v ON_ERROR_STOP=1 -q"
$PSQL -f tests/sql/00_setup.sql >/dev/null 2>&1
fail=0
for f in tests/sql/[1-9]*.sql; do
  case "$f" in *${1:-}*) ;; *) continue;; esac
  out=$($PSQL -f "$f" 2>&1) || fail=1
  echo "$out" | grep -E "ok - |FAIL|ERROR|^==" | sed 's/^psql:[^ ]* NOTICE:  //; s/^NOTICE:  //'
done
[ $fail = 0 ] && [ -z "${1:-}" ] && { tests/concurrency.sh || fail=1; }
[ $fail = 0 ] && echo "ALL PASSED" || { echo "FAILURES"; exit 1; }
