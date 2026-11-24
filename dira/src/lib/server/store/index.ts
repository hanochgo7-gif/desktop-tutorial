import "server-only";
import { accountsMode } from "@/lib/server/config";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function getStore(): Store {
  const mode = accountsMode();
  if (mode === "supabase") return supabaseStore;
  if (mode === "local") return localStore;
  throw new Error("accounts are not configured");
}
export type { Store } from "./types";
