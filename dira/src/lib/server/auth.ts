import "server-only";
// Who is calling. Production: a Supabase access token (Authorization: Bearer). Development only:
// a signed local token from /api/dev/login, so the full flow can be tested without email delivery.

import { createHmac, timingSafeEqual } from "node:crypto";
import { accountsMode, devModes, localSecret } from "./config";
import { getStore } from "./store";
import { admin } from "./store/supabase";
import { SIGNUP_BONUS } from "@/lib/plans";

export type User = { id: string; email: string };

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export function signLocalToken(id: string, email: string) {
  const body = Buffer.from(JSON.stringify({ id, email })).toString("base64url");
  const sig = createHmac("sha256", localSecret()).update(body).digest("base64url");
  return `local.${body}.${sig}`;
}

function verifyLocalToken(token: string): User | null {
  const [prefix, body, sig] = token.split(".");
  if (prefix !== "local" || !body || !sig) return null;
  const expected = createHmac("sha256", localSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const u = JSON.parse(Buffer.from(body, "base64url").toString()) as User;
    return typeof u.id === "string" && typeof u.email === "string" ? u : null;
  } catch {
    return null;
  }
}

export async function currentUser(req: Request): Promise<User | null> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const mode = accountsMode();
  if (mode === "local") {
    if (!devModes()) return null;
    return verifyLocalToken(token);
  }
  if (mode === "supabase") {
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data.user?.email) return null;
    return { id: data.user.id, email: data.user.email };
  }
  return null;
}

/** The signed-in user, with their account created (and sign-up bonus granted) on first use. */
export async function requireUser(req: Request): Promise<User> {
  if (!accountsMode()) throw new HttpError(503, "accounts_off");
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, "unauthorized");
  await getStore().ensureAccount(u.id, u.email, SIGNUP_BONUS);
  return u;
}
