import "server-only";

// Which real services are switched on. Everything external is off until its credentials exist.
// Development stand-ins (local accounts, mock AI, mock checkout) run only outside production, or when
// UNSAFE_DEV_MODES=1 is set for automated tests — never set it on the live site. Pages show a visible
// "test mode" notice whenever a stand-in is active.

export function devModes(): boolean {
  // Never on a Vercel production deployment, whatever the flag says: a mock checkout there would
  // hand out free credits.
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV !== "production" || process.env.UNSAFE_DEV_MODES === "1";
}

export function supabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !service || !anon) return null;
  return { url: url.replace(/\/$/, ""), service, anon };
}

export type AccountsMode = "supabase" | "local" | null;
export function accountsMode(): AccountsMode {
  if (supabaseEnv()) return "supabase";
  return devModes() ? "local" : null;
}

export type AiMode = "replicate" | "mock" | null;
export function aiMode(): AiMode {
  if (accountsMode() === null) return null;
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  return devModes() ? "mock" : null;
}

export type PaymentsMode = "grow" | "mock" | null;
export function paymentsMode(): PaymentsMode {
  if (accountsMode() === null) return null;
  if (process.env.GROW_USER_ID && process.env.GROW_PAGE_CODE) return "grow";
  return devModes() ? "mock" : null;
}

/** Public address used in payment returns and webhooks. */
export function siteUrl(req?: Request): string {
  const env = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}

/** Secret used to sign local-mode session tokens and file links. */
export function localSecret(): string {
  return process.env.LOCAL_AUTH_SECRET ?? "dev-only-secret-not-for-production";
}

export function publicConfig() {
  const s = supabaseEnv();
  return {
    accounts: accountsMode(),
    ai: aiMode(),
    payments: paymentsMode(),
    testMode: devModes() && (accountsMode() === "local" || aiMode() === "mock" || paymentsMode() === "mock"),
    supabase: s ? { url: s.url, anonKey: s.anon } : null,
  };
}
export type PublicConfig = ReturnType<typeof publicConfig>;
