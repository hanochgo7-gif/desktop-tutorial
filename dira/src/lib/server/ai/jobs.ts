import "server-only";
// AI job lifecycle: charge credits → store input → start prediction → (webhook or poll) → copy the
// output into our own storage → done. A failed or rejected job always refunds its credit.

import { randomUUID } from "node:crypto";
import { TOOL_COST } from "@/lib/plans";
import { HttpError, type User } from "@/lib/server/auth";
import { aiMode, accountsMode, siteUrl } from "@/lib/server/config";
import { getStore } from "@/lib/server/store";
import type { Job } from "@/lib/server/store/types";
import { TOOLS, type AiToolId, type Room, type Style } from "./registry";
import { createPrediction, getPrediction, outputUrl } from "./replicate";

export type NewJob = {
  tool: AiToolId;
  room?: Room;
  style?: Style;
  image: { data: Uint8Array; type: string };
  mask?: { data: Uint8Array; type: string };
  idempotencyKey: string;
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function dataUri(bytes: Uint8Array, type: string) {
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function refund(job: Job, reason: string) {
  const store = getStore();
  await store.applyCredits(job.user_id, job.cost, "ai_refund", job.id, `refund:${job.id}`);
  await store.updateJob(job.id, { status: "failed", error: reason.slice(0, 300) });
}

export async function startJob(user: User, req: Request, j: NewJob): Promise<Job> {
  const mode = aiMode();
  if (!mode) throw new HttpError(503, "ai_off");
  const store = getStore();

  const existing = await store.getJobByKey(user.id, j.idempotencyKey);
  if (existing) return existing;

  const spec = TOOLS[j.tool];
  if (spec.needsMask && !j.mask) throw new HttpError(400, "mask_required");
  const account = await store.getAccount(user.id);
  const pro = Boolean(account?.pro_until && Date.parse(account.pro_until) > Date.now());

  const id = randomUUID();
  const cost = TOOL_COST[j.tool];
  const charge = await store.applyCredits(user.id, -cost, "ai_job", id, `job:${id}`);
  if (charge.result === "insufficient") throw new HttpError(402, "no_credits");

  const base = `u/${user.id}/${id}`;
  const inputPath = `${base}/input.${EXT[j.image.type] ?? "jpg"}`;
  const maskPath = j.mask ? `${base}/mask.png` : null;
  const params: Record<string, string> = {};
  if (j.room) params.room = j.room;
  if (j.style) params.style = j.style;
  if (pro) params.resolution = "4K";

  let job: Job;
  try {
    job = await store.createJob({
    id,
    user_id: user.id,
    tool: j.tool,
    params,
    model: mode === "mock" ? "mock" : spec.model,
    provider: mode === "mock" ? "mock" : "replicate",
    provider_id: null,
    status: "queued",
    cost,
    input_path: inputPath,
    mask_path: maskPath,
    output_path: null,
    error: null,
    test: mode === "mock",
    idempotency_key: j.idempotencyKey,
    });
  } catch (e) {
    await store.applyCredits(user.id, cost, "ai_refund", id, `refund:${id}`);
    throw e;
  }

  try {
    await store.putFile(inputPath, j.image.data, j.image.type);
    if (j.mask && maskPath) await store.putFile(maskPath, j.mask.data, "image/png");

    if (mode === "mock") {
      // Development stand-in: no model runs. The "output" is the input itself, flagged as a test so
      // the studio labels it "Test output" and it can never pass for a real AI edit.
      const outPath = `${base}/output.${EXT[j.image.type] ?? "jpg"}`;
      await store.putFile(outPath, j.image.data, j.image.type);
      job = (await store.updateJob(id, { status: "succeeded", provider_id: `mock-${id}`, output_path: outPath }))!;
      return job;
    }

    // Supabase storage gives a public signed URL; the local dev store isn't reachable from the
    // internet, so inputs go inline as data URIs there.
    const remote = accountsMode() === "supabase";
    const imageRef = remote ? await store.fileUrl(inputPath, 3600, siteUrl(req)) : dataUri(j.image.data, j.image.type);
    const maskRef = j.mask && maskPath ? (remote ? await store.fileUrl(maskPath, 3600, siteUrl(req)) : dataUri(j.mask.data, "image/png")) : undefined;
    const input = spec.input({ image: imageRef, mask: maskRef, room: j.room, style: j.style, pro });
    const origin = siteUrl(req);
    const webhook = origin.startsWith("https://") ? `${origin}/api/ai/webhook` : undefined;
    const prediction = await createPrediction(spec.model, input, webhook);
    job = (await store.updateJob(id, { status: "running", provider_id: prediction.id }))!;
    return job;
  } catch (e) {
    console.error("ai job start failed", id, e);
    await refund(job, "start_failed");
    throw new HttpError(502, "ai_start_failed");
  }
}

/** Brings a running job to its final state using the provider's answer. Safe to call repeatedly. */
export async function settleJob(job: Job): Promise<Job> {
  if (job.status !== "running" || job.provider !== "replicate" || !job.provider_id) return job;
  const store = getStore();
  const p = await getPrediction(job.provider_id);
  if (p.status === "starting" || p.status === "processing") return job;
  if (!(await store.claimJob(job.id))) return (await store.getJob(job.id)) ?? job;
  try {
    if (p.status !== "succeeded") {
      await refund(job, typeof p.error === "string" ? p.error : p.status);
      return (await store.getJob(job.id))!;
    }
    const url = outputUrl(p);
    if (!url) throw new Error("no usable output url");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`output fetch ${res.status}`);
    const type = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    if (!EXT[type]) throw new Error(`unexpected output type ${type}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 40 * 1024 * 1024) throw new Error("output too large");
    const outPath = `u/${job.user_id}/${job.id}/output.${EXT[type]}`;
    await store.putFile(outPath, bytes, type);
    return (await store.updateJob(job.id, { status: "succeeded", output_path: outPath, error: null }))!;
  } catch (e) {
    console.error("ai job settle failed", job.id, e);
    await refund(job, "output_failed");
    return (await store.getJob(job.id))!;
  }
}
