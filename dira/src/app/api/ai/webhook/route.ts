import { settleJob } from "@/lib/server/ai/jobs";
import { verifyWebhook } from "@/lib/server/ai/replicate";
import { aiMode } from "@/lib/server/config";
import { handle, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const maxDuration = 60;

// Replicate calls this when a prediction finishes. The signature is checked over the raw body; the
// prediction's state is then re-read from Replicate's API rather than trusted from the payload.
export async function POST(req: Request) {
  return handle(async () => {
    if (aiMode() !== "replicate") return json({ error: "not_found" }, 404);
    const raw = await req.text();
    if (!(await verifyWebhook(req.headers, raw))) return json({ error: "bad_signature" }, 401);
    const body = JSON.parse(raw) as { id?: string };
    if (!body.id) return json({ ok: true });
    const job = await getStore().getJobByProviderId(body.id);
    if (job) await settleJob(job);
    return json({ ok: true });
  });
}
