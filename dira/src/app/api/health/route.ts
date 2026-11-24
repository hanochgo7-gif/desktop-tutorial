import { publicConfig } from "@/lib/server/config";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET() {
  const c = publicConfig();
  return json({ ok: true, accounts: c.accounts, ai: c.ai, payments: c.payments });
}
