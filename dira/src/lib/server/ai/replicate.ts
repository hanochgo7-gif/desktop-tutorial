import "server-only";
// Replicate HTTP API: predictions for official models, polling, and signed webhooks.
// https://replicate.com/docs/reference/http

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.replicate.com/v1";

export type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: unknown;
};

function token() {
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t) throw new Error("REPLICATE_API_TOKEN is not set");
  return t;
}

export async function createPrediction(model: string, input: Record<string, unknown>, webhook?: string): Promise<Prediction> {
  const body: Record<string, unknown> = { input };
  if (webhook) {
    body.webhook = webhook;
    body.webhook_events_filter = ["completed"];
  }
  const res = await fetch(`${API}/models/${model}/predictions`, {
    method: "POST",
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as Prediction & { detail?: string };
  if (!res.ok || !json?.id) throw new Error(`replicate create ${res.status}: ${json?.detail ?? "no detail"}`);
  return json;
}

export async function getPrediction(id: string): Promise<Prediction> {
  const res = await fetch(`${API}/predictions/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`replicate get ${res.status}`);
  return (await res.json()) as Prediction;
}

/** The single output image URL, whether the model returns a string or an array. */
export function outputUrl(p: Prediction): string | null {
  const o = p.output;
  const url = typeof o === "string" ? o : Array.isArray(o) && typeof o[0] === "string" ? o[0] : null;
  if (!url) return null;
  try {
    const u = new URL(url);
    // Only fetch outputs from Replicate's own delivery hosts.
    if (u.protocol !== "https:" || !(u.hostname === "replicate.delivery" || u.hostname.endsWith(".replicate.delivery"))) return null;
    return url;
  } catch {
    return null;
  }
}

let cachedSecret: string | null = null;
async function webhookSecret(): Promise<string> {
  if (process.env.REPLICATE_WEBHOOK_SECRET) return process.env.REPLICATE_WEBHOOK_SECRET;
  if (cachedSecret) return cachedSecret;
  const res = await fetch(`${API}/webhooks/default/secret`, { headers: { authorization: `Bearer ${token()}` }, cache: "no-store" });
  const j = (await res.json()) as { key?: string };
  if (!j.key) throw new Error("no webhook secret");
  cachedSecret = j.key;
  return j.key;
}

/** Verifies Replicate's webhook signature (Svix scheme) over the raw body. */
export async function verifyWebhook(headers: Headers, rawBody: string, now = Date.now()): Promise<boolean> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigs = headers.get("webhook-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const secret = await webhookSecret();
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest();
  return sigs.split(" ").some((part) => {
    const b64 = part.split(",")[1];
    if (!b64) return false;
    const got = Buffer.from(b64, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
