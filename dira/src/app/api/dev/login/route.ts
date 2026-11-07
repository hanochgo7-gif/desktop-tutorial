import { createHash } from "node:crypto";
import { signLocalToken } from "@/lib/server/auth";
import { accountsMode, devModes } from "@/lib/server/config";
import { handle, json } from "@/lib/server/http";
import { clientIp, limit } from "@/lib/server/rate-limit";

// Development sign-in without email delivery. Disabled whenever real accounts (Supabase) are set up
// or the site runs in production without UNSAFE_DEV_MODES.
export async function POST(req: Request) {
  return handle(async () => {
    if (!devModes() || accountsMode() !== "local") return json({ error: "not_found" }, 404);
    limit("login", clientIp(req.headers));
    const { email } = (await req.json().catch(() => ({}))) as { email?: string };
    const e = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) return json({ error: "bad_email" }, 400);
    const h = createHash("sha256").update(e).digest("hex");
    const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
    return json({ token: signLocalToken(id, e), email: e });
  });
}
