import { accountsMode } from "@/lib/server/config";
import { json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const maxDuration = 60;

// Daily (vercel.json): deletes AI inputs, masks and outputs older than 30 days, as the privacy page promises.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  if (!accountsMode()) return json({ ok: true, deleted: 0 });
  const store = getStore();
  const before = new Date(Date.now() - 30 * 86400_000).toISOString();
  const jobs = await store.jobsWithFilesBefore(before, 200);
  let deleted = 0;
  for (const j of jobs) {
    const paths = [j.input_path, j.mask_path, j.output_path].filter((p): p is string => Boolean(p));
    await store.deleteFiles(paths);
    await store.updateJob(j.id, { files_deleted: true, input_path: null, mask_path: null, output_path: null });
    deleted += paths.length;
  }
  return json({ ok: true, jobs: jobs.length, deleted });
}
