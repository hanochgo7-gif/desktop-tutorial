import "server-only";
// Grow (formerly Meshulam) hosted payment page — the same integration the owner already runs.
// https://developers.grow.business/reference/post_api-light-server-1-0-createpaymentprocess
// Flow: createPaymentProcess → customer pays on Grow's page → Grow POSTs to notifyUrl → we verify
// the secret processToken and the sum, credit the account, then approveTransaction.

import type { Purchase } from "@/lib/server/store/types";

const DEFAULT_BASE = "https://sandbox.meshulam.co.il/api/light/server/1.0";

export function growConfig() {
  const userId = process.env.GROW_USER_ID;
  const pageCode = process.env.GROW_PAGE_CODE;
  if (!userId || !pageCode) return null;
  return { userId, pageCode, apiKey: process.env.GROW_API_KEY, base: (process.env.GROW_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "") };
}

type GrowResponse<T> = { status: number | string; err?: unknown; data?: T };

async function growPost<T>(method: string, fields: Record<string, string>): Promise<T> {
  const cfg = growConfig();
  if (!cfg) throw new Error("Grow is not configured");
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  const res = await fetch(`${cfg.base}/${method}`, { method: "POST", body, cache: "no-store" });
  const json = (await res.json().catch(() => null)) as GrowResponse<T> | null;
  if (!res.ok || !json || String(json.status) !== "1") throw new Error(`Grow ${method} failed: ${res.status} ${JSON.stringify(json?.err ?? json)}`);
  return json.data as T;
}

export async function createGrowPayment(p: Purchase, email: string, description: string, origin: string, lang: string) {
  const cfg = growConfig()!;
  const fields: Record<string, string> = {
    pageCode: cfg.pageCode,
    userId: cfg.userId,
    chargeType: "1",
    sum: String(p.amount_ils),
    successUrl: `${origin}/${lang}/account?paid=${p.id}`,
    cancelUrl: `${origin}/${lang}/pricing?cancelled=1`,
    notifyUrl: `${origin}/api/payments/grow/notify`,
    description: description.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100),
    "pageField[email]": email,
    cField1: p.id.replace(/-/g, ""),
  };
  if (cfg.apiKey) fields.apiKey = cfg.apiKey;
  const data = await growPost<{ url: string; processId: string | number; processToken: string }>("createPaymentProcess", fields);
  return { url: data.url, processId: String(data.processId), processToken: data.processToken };
}

export async function approveGrowTransaction(data: Record<string, string>) {
  const cfg = growConfig()!;
  const fields: Record<string, string> = { ...data, pageCode: cfg.pageCode };
  if (cfg.apiKey) fields.apiKey = cfg.apiKey;
  await growPost("approveTransaction", fields);
}

/** Grow posts form fields shaped like "data[customFields][cField1]"; flatten to the last key. */
export async function readGrowCallback(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  const flat: Record<string, string> = {};
  const put = (key: string, value: unknown) => {
    if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) put(k, v);
    else if (value !== undefined && value !== null) flat[key] = String(value);
  };
  if (type.includes("application/json")) {
    const json = await req.json();
    put("", json?.data ?? json);
  } else {
    const form = await req.formData();
    for (const [rawKey, value] of form.entries()) {
      if (typeof value !== "string") continue;
      const parts = rawKey.match(/[^[\]]+/g) ?? [rawKey];
      flat[parts[parts.length - 1]] = value;
    }
  }
  return flat;
}
