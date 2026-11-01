"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import type { PublicConfig } from "@/lib/server/config";

export type Me = {
  email: string;
  credits: number;
  proUntil: string | null;
  ledger: { delta: number; reason: string; ref: string | null; balance_after: number; created_at: string }[];
  purchases: { id: string; product: string; amount: number; credits: number; status: string; created_at: string }[];
  jobs: { id: string; tool: string; status: string; model: string; test: boolean; created_at: string }[];
};

let configPromise: Promise<PublicConfig> | null = null;
export function getConfig(): Promise<PublicConfig> {
  configPromise ??= fetch("/api/config", { cache: "no-store" }).then((r) => r.json());
  return configPromise;
}

let sb: SupabaseClient | null = null;
function supa(cfg: PublicConfig) {
  if (!cfg.supabase) return null;
  sb ??= createClient(cfg.supabase.url, cfg.supabase.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}

const DEV_KEY = "dira.devToken";

export async function getToken(): Promise<string | null> {
  const cfg = await getConfig();
  if (cfg.accounts === "supabase") {
    const { data } = await supa(cfg)!.auth.getSession();
    return data.session?.access_token ?? null;
  }
  if (cfg.accounts === "local") {
    try {
      return localStorage.getItem(DEV_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Step 1 of sign-in: email a one-time code (production) or sign in directly (development). */
export async function sendCode(email: string): Promise<"sent" | "signed-in" | "error"> {
  const cfg = await getConfig();
  if (cfg.accounts === "supabase") {
    const { error } = await supa(cfg)!.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? "error" : "sent";
  }
  if (cfg.accounts === "local") {
    const r = await fetch("/api/dev/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    if (!r.ok) return "error";
    const { token } = (await r.json()) as { token: string };
    localStorage.setItem(DEV_KEY, token);
    window.dispatchEvent(new Event("dira-auth"));
    return "signed-in";
  }
  return "error";
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const cfg = await getConfig();
  if (cfg.accounts !== "supabase") return false;
  const { error } = await supa(cfg)!.auth.verifyOtp({ email, token: code, type: "email" });
  if (!error) window.dispatchEvent(new Event("dira-auth"));
  return !error;
}

export async function signOut() {
  const cfg = await getConfig();
  if (cfg.accounts === "supabase") await supa(cfg)!.auth.signOut();
  try {
    localStorage.removeItem(DEV_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("dira-auth"));
}

async function loadAccount(): Promise<{ cfg: PublicConfig; me: Me | null }> {
  const cfg = await getConfig();
  if (!cfg.accounts || !(await getToken())) return { cfg, me: null };
  const r = await api<Me>("/api/me");
  return { cfg, me: r.ok ? r.data : null };
}

export function useAccount() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    loadAccount().then(({ cfg, me }) => {
      setConfig(cfg);
      setMe(me);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("dira-auth", on);
    window.addEventListener("focus", on);
    return () => {
      window.removeEventListener("dira-auth", on);
      window.removeEventListener("focus", on);
    };
  }, [refresh]);

  return { config, me, loading, refresh };
}
