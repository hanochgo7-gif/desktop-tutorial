import { HttpError, requireUser } from "@/lib/server/auth";
import { paymentsMode } from "@/lib/server/config";
import { handle, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

// Development checkout: completes a pending mock purchase for its own buyer. Never active in production.
export async function POST(req: Request) {
  return handle(async () => {
    if (paymentsMode() !== "mock") return json({ error: "not_found" }, 404);
    const user = await requireUser(req);
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    const store = getStore();
    const p = id ? await store.getPurchase(id) : null;
    if (!p || p.user_id !== user.id || p.provider !== "mock") throw new HttpError(404, "not_found");
    const paid = await store.markPurchasePaid(p.id, `mock-${Date.now()}`);
    return json({ ok: true, paid });
  });
}
