#!/bin/sh
# Two sessions race for the same thing. Runs after tests/run.sh (uses its data). Exits non-zero on failure.
cd "$(dirname "$0")/.."
PSQL="psql -h /tmp -p ${PGPORT:-5499} -U postgres -d proc_test -qAt"
SMB=00000000-0000-0000-0000-0000000000ab
PO=$($PSQL -c "select id from public.purchase_orders where supplier_id = '00000000-0000-0000-0000-0000000000e3' and status = 'approved' and net_total = 120")
LINE=$($PSQL -c "select id from public.po_lines where po_id = '$PO'")
[ -n "$LINE" ] || { echo "FAIL: fixture order not found"; exit 1; }
race() { # $1 = label, $2 = sql
  $PSQL >"/tmp/race_$1.out" 2>&1 <<SQL
begin; set local role authenticated; set local request.jwt.claim.sub = '$SMB';
$2
select pg_sleep(1.5);
commit;
SQL
}
echo "== concurrency: two receipts of the last 10 units at once"
race a "select public.receipt_post('$PO', '[{\"po_line_id\":\"$LINE\",\"qty_accepted\":10}]');" &
sleep 0.3
race b "select public.receipt_post('$PO', '[{\"po_line_id\":\"$LINE\",\"qty_accepted\":10}]');" &
wait
OK=$(grep -l '"po_status"' /tmp/race_a.out /tmp/race_b.out | wc -l)
OVER=$(grep -lE 'OVER_RECEIPT|BAD_STATUS:received' /tmp/race_a.out /tmp/race_b.out | wc -l)
REC=$($PSQL -c "select received_qty from public.po_lines where id = '$LINE'")
if [ "$OK" = 1 ] && [ "$OVER" = 1 ] && [ "$REC" = "10.000" ]; then echo "ok - one receipt wins, the other is refused (received $REC)"; else echo "FAIL: ok=$OK over=$OVER received=$REC"; cat /tmp/race_*.out; exit 1; fi

echo "== concurrency: two issues of the last units at once"
CEM=00000000-0000-0000-0000-0000000000d1
SB=00000000-0000-0000-0000-0000000000b2
ORG=$($PSQL -c "select tst.org()")
AVAIL=$($PSQL -c "select (on_hand - reserved)::int from public.stock_balances where site_id = '$SB' and item_id = '$CEM'")
race a "select public.stock_operation('$ORG', '$SB', '$CEM', 'issue', $AVAIL, 'race a');" &
sleep 0.3
race b "select public.stock_operation('$ORG', '$SB', '$CEM', 'issue', $AVAIL, 'race b');" &
wait
OK=$(grep -l 'movement_id' /tmp/race_a.out /tmp/race_b.out | wc -l)
NO=$(grep -lE 'INSUFFICIENT_STOCK|STOCK_RESERVED' /tmp/race_a.out /tmp/race_b.out | wc -l)
LEFT=$($PSQL -c "select on_hand - reserved from public.stock_balances where site_id = '$SB' and item_id = '$CEM'")
if [ "$OK" = 1 ] && [ "$NO" = 1 ] && [ "$LEFT" = "0.000" ]; then echo "ok - one issue of $AVAIL wins, the other is refused, nothing goes negative"; else echo "FAIL: ok=$OK refused=$NO left=$LEFT"; cat /tmp/race_*.out; exit 1; fi

echo "CONCURRENCY PASSED"
