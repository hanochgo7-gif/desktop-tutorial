import { HttpError, requireUser } from "@/lib/server/auth";
import { settleJob } from "@/lib/server/ai/jobs";
import { siteUrl } from "@/lib/server/config";
import { handle, json } from "@/lib/server/http";
import { limit } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request, ctx: RouteContext<"/api/ai/jobs/[id]">) {
  return handle(async () => {
    const user = await requireUser(req);
    limit("aiPoll", user.id);
    const { id } = await ctx.params;
    const store = getStore();
    let job = await store.getJob(id);
    // Another person's job looks exactly like a missing one.
    if (!job || job.user_id !== user.id) throw new HttpError(404, "not_found");
    // Webhooks are the main path; polling covers local development and lost deliveries.
    if (job.status === "running" && Date.now() - Date.parse(job.updated_at) > 3000) job = await settleJob(job);
    const outputUrl = job.status === "succeeded" && job.output_path ? await store.fileUrl(job.output_path, 600, siteUrl(req)) : null;
    return json({ id: job.id, status: job.status, tool: job.tool, model: job.model, test: job.test, error: job.status === "failed" ? "failed" : null, outputUrl });
  });
}
