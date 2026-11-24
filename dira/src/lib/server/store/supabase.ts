import "server-only";
// Production store on Supabase (Postgres + private Storage bucket), accessed only from the server
// with the service-role key. Credit changes and purchase completion run inside SQL functions
// (supabase/schema.sql) so they are atomic under concurrent requests.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/server/config";
import type { Account, ApplyResult, Job, LedgerEntry, Purchase, Store } from "./types";

export const BUCKET = "ai-files";
let client: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (client) return client;
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured");
  client = createClient(env.url, env.service, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export const supabaseStore: Store = {
  async ensureAccount(userId, email, bonus) {
    check(await admin().rpc("ensure_account", { p_user: userId, p_email: email, p_bonus: bonus }));
    const acc = await this.getAccount(userId);
    if (!acc) throw new Error("account missing after ensure");
    return acc;
  },

  async getAccount(userId) {
    const r = await admin().from("accounts").select("*").eq("user_id", userId).maybeSingle();
    return check(r) as Account | null;
  },

  async applyCredits(userId, delta, reason, ref, key) {
    const rows = check(await admin().rpc("apply_credits", { p_user: userId, p_delta: delta, p_reason: reason, p_ref: ref, p_key: key })) as {
      result: ApplyResult;
      balance: number;
    }[];
    return rows[0];
  },

  async ledger(userId, limit = 50) {
    const r = await admin()
      .from("credit_ledger")
      .select("delta, reason, ref, balance_after, created_at")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(limit);
    return check(r) as LedgerEntry[];
  },

  async createPurchase(p) {
    const r = await admin().from("purchases").insert(p).select("*").single();
    return check(r) as Purchase;
  },

  async getPurchase(id) {
    const r = await admin().from("purchases").select("*").eq("id", id).maybeSingle();
    return check(r) as Purchase | null;
  },

  async setPurchaseToken(id, token) {
    check(await admin().from("purchases").update({ process_token: token }).eq("id", id));
  },

  async markPurchasePaid(id, providerRef) {
    return Boolean(check(await admin().rpc("mark_purchase_paid", { p_purchase: id, p_ref: providerRef })));
  },

  async purchases(userId, limit = 50) {
    const r = await admin().from("purchases").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return check(r) as Purchase[];
  },

  async createJob(j) {
    const r = await admin().from("ai_jobs").insert(j).select("*").single();
    return check(r) as Job;
  },

  async getJob(id) {
    const r = await admin().from("ai_jobs").select("*").eq("id", id).maybeSingle();
    return check(r) as Job | null;
  },

  async getJobByKey(userId, key) {
    const r = await admin().from("ai_jobs").select("*").eq("user_id", userId).eq("idempotency_key", key).maybeSingle();
    return check(r) as Job | null;
  },

  async getJobByProviderId(pid) {
    const r = await admin().from("ai_jobs").select("*").eq("provider_id", pid).maybeSingle();
    return check(r) as Job | null;
  },

  async updateJob(id, patch) {
    const r = await admin()
      .from("ai_jobs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return check(r) as Job | null;
  },

  async claimJob(id) {
    const r = await admin()
      .from("ai_jobs")
      .update({ status: "finalizing", updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["running", "queued"])
      .select("id");
    return (check(r) as { id: string }[]).length === 1;
  },

  async jobs(userId, limit = 50) {
    const r = await admin().from("ai_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return check(r) as Job[];
  },

  async jobsWithFilesBefore(iso, limit) {
    const r = await admin().from("ai_jobs").select("*").eq("files_deleted", false).lt("created_at", iso).limit(limit);
    return check(r) as Job[];
  },

  async putFile(path, data, contentType) {
    const { error } = await admin().storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
    if (error) throw new Error(error.message);
  },

  async fileUrl(path, seconds) {
    const { data, error } = await admin().storage.from(BUCKET).createSignedUrl(path, seconds);
    if (error || !data) throw new Error(error?.message ?? "no signed url");
    return data.signedUrl;
  },

  async deleteFiles(paths) {
    if (!paths.length) return;
    const { error } = await admin().storage.from(BUCKET).remove(paths);
    if (error) throw new Error(error.message);
  },

  async deleteAccount(userId) {
    // Files first (storage is not covered by foreign keys), then the auth user; accounts, ledger and
    // jobs cascade. Purchase rows are kept without the user (bookkeeping), see schema.sql.
    const jobs = await this.jobs(userId, 1000);
    const paths = jobs.flatMap((j) => [j.input_path, j.mask_path, j.output_path]).filter((p): p is string => Boolean(p));
    for (let i = 0; i < paths.length; i += 100) await this.deleteFiles(paths.slice(i, i + 100));
    const { error } = await admin().auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  },
};
