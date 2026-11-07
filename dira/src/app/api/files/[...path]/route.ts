import { timingSafeEqual } from "node:crypto";
import { accountsMode } from "@/lib/server/config";
import { readLocalFile, signFile } from "@/lib/server/store/local";

// Serves files of the local development store through signed, expiring links (production uses
// Supabase signed URLs and never reaches this route).
export async function GET(req: Request, ctx: RouteContext<"/api/files/[...path]">) {
  if (accountsMode() !== "local") return new Response("not found", { status: 404 });
  const { path } = await ctx.params;
  const p = path.map(decodeURIComponent).join("/");
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  const expected = signFile(p, exp);
  if (!exp || exp < Date.now() / 1000 || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const data = await readLocalFile(p);
    const type = p.endsWith(".png") ? "image/png" : p.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(data), { headers: { "content-type": type, "cache-control": "private, max-age=300" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
