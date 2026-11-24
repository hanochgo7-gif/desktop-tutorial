import { requireUser } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser(req);
    const store = getStore();
    const [account, ledger, purchases, jobs] = await Promise.all([
      store.getAccount(user.id),
      store.ledger(user.id, 30),
      store.purchases(user.id, 30),
      store.jobs(user.id, 30),
    ]);
    return json({
      email: user.email,
      credits: account?.credits ?? 0,
      proUntil: account?.pro_until && Date.parse(account.pro_until) > Date.now() ? account.pro_until : null,
      ledger,
      purchases: purchases.map((p) => ({ id: p.id, product: p.product, amount: p.amount_ils, credits: p.credits, status: p.status, created_at: p.created_at })),
      jobs: jobs.map((j) => ({ id: j.id, tool: j.tool, status: j.status, model: j.model, test: j.test, created_at: j.created_at })),
    });
  });
}

/** Deletes the account, its balance, its AI files and history. Purchases stay anonymised. */
export async function DELETE(req: Request) {
  return handle(async () => {
    const user = await requireUser(req);
    await getStore().deleteAccount(user.id);
    return json({ ok: true });
  });
}
