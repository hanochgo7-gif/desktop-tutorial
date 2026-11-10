// app/api/join/route.ts in nahal-crm (Next.js App Router).
// Receives the join form from https://hanochgo7-gif.github.io/desktop-tutorial/sayeret-nahal/join/
// The body is JSON sent as text/plain (no CORS preflight). Returns 2xx only after the row is saved.

const ALLOWED_ORIGIN = "https://hanochgo7-gif.github.io";
const MAX_BYTES = 400_000; // selfie is downscaled to 512px in the browser

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 120)) : []);

// Very small in-memory limiter (per instance). Swap for Upstash/DB-based if abuse shows up.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), win = 10 * 60_000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 5;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(req: Request) {
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) return new Response("forbidden", { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return new Response("too many", { status: 429, headers: cors });

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return new Response("too large", { status: 413, headers: cors });
  let d: Record<string, unknown>;
  try { d = JSON.parse(raw); } catch { return new Response("bad json", { status: 400, headers: cors }); }
  if (d.form !== "sayeret-join-2026" || d.consent !== true) return new Response("bad form", { status: 400, headers: cors });

  const member = {
    first_name: str(d.first_name, 60), last_name: str(d.last_name, 60),
    phone: str(d.phone, 20).replace(/[^\d+]/g, ""), email: str(d.email, 120).toLowerCase(),
    region: str(d.region, 60), connection: str(d.connection, 60), ref: str(d.ref, 40),
    fallen_name: str(d.fallen_name, 80), fallen_relation: str(d.fallen_relation, 40),
    enlist_year: typeof d.enlist_year === "number" ? d.enlist_year : null, enlist_month: str(d.enlist_month, 20),
    last_role: str(d.last_role, 80), commander: str(d.commander, 80),
    status: list(d.status), study_institution: str(d.study_institution, 80), study_field: str(d.study_field, 80),
    study_year: str(d.study_year, 10), scholars_interest: d.scholars_interest === true,
    work_field: str(d.work_field, 80), work_role: str(d.work_role, 120), work_experience: str(d.work_experience, 30),
    interests: list(d.interests), memorial_fallen: str(d.memorial_fallen, 80), memorial_assign: d.memorial_assign === true,
    personal: list(d.personal), knows: list(d.knows), personal_contact: str(d.personal_contact, 300), // sensitive
    give: list(d.give), fundraising: list(d.fundraising), volunteer_areas: list(d.volunteer_areas),
    offer: str(d.offer, 500), idea: str(d.idea, 2000), platforms: list(d.platforms),
    selfie_jpeg: typeof d.selfie_jpeg === "string" && d.selfie_jpeg.startsWith("data:image/jpeg;base64,") ? d.selfie_jpeg : "",
    consent_at: new Date().toISOString(), source: "join-form-2026",
  };
  if (!member.first_name || !member.last_name || member.phone.length < 9 || !/^\S+@\S+\.\S+$/.test(member.email))
    return new Response("missing fields", { status: 400, headers: cors });

  try {
    await saveMember(member); // TODO: write to the CRM's own database (upsert by phone/email)
  } catch (e) {
    console.error("join save failed", e);
    return new Response("save failed", { status: 500, headers: cors });
  }
  return new Response("ok", { status: 200, headers: cors });
}

// Replace with the CRM's real data layer. Keep `personal` and `personal_contact` visible only to the relevant staff.
async function saveMember(_m: Record<string, unknown>): Promise<void> {
  throw new Error("saveMember not implemented");
}
