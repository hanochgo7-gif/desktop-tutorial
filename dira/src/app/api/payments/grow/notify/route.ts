import { paymentsMode } from "@/lib/server/config";
import { json } from "@/lib/server/http";
import { approveGrowTransaction, readGrowCallback } from "@/lib/server/payments/grow";
import { getStore } from "@/lib/server/store";

// Grow calls this after a payment. The callback isn't signed, so it is trusted only when it carries
// the secret processToken stored for the purchase and the paid sum matches the price exactly.
export async function POST(req: Request) {
  if (paymentsMode() !== "grow") return json({ error: "not_found" }, 404);
  const data = await readGrowCallback(req);
  const store = getStore();
  const id = (data.cField1 ?? "").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  const purchase = /^[0-9a-f-]{36}$/.test(id) ? await store.getPurchase(id).catch(() => null) : null;
  if (!purchase || !purchase.process_token || data.processToken !== purchase.process_token) {
    console.warn("grow notify: unverified", { cField1: data.cField1 });
    return json({ ok: false }, 400);
  }
  if (data.statusCode !== "2" || Number(data.sum) !== Number(purchase.amount_ils)) {
    console.warn("grow notify: not a completed payment for the right sum", { id, statusCode: data.statusCode, sum: data.sum });
    return json({ ok: true });
  }
  const ref = data.asmachta ? `${data.transactionId} / ${data.asmachta}` : String(data.transactionId ?? "");
  await store.markPurchasePaid(purchase.id, ref);
  await approveGrowTransaction(data).catch((e) => console.error("grow approveTransaction failed", purchase.id, e));
  return json({ ok: true });
}
