// End-to-end API tests against a running local server:
//   npx wrangler dev --port 8787   (after db:init:local and user:add with the test admin below)
//   SOTA_TEST_EMAIL=admin@sota.test SOTA_TEST_PASSWORD=... npm test
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.SOTA_BASE || "http://127.0.0.1:8787";
const EMAIL = process.env.SOTA_TEST_EMAIL || "admin@sota.test";
const PASSWORD = process.env.SOTA_TEST_PASSWORD || "TestPassword-1234";
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

const lead = (over = {}) => ({ name: "ישראל ישראלי", phone: "050-1234567", email: "israel@example.com", clientType: "small", message: "רוצה להתייעץ על המחשוב במשרד", lang: "he", page: "/", elapsed: 5000, ...over });
const post = (path, body, headers = {}) => fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

function ticketForm(over = {}, file) {
  const fd = new FormData();
  const base = { name: "דנה כהן", business: "כהן ושות'", phone: "+972 52 765 4321", email: "dana@example.com", category: "network", urgency: "high", description: "האינטרנט במשרד נופל כל כמה דקות", lang: "he", elapsed: "4000", ...over };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  if (file) fd.set("file", file.blob, file.name);
  return fd;
}

let cookie = "", ticketNo = "", leadId = 0;
const admin = (path, opts = {}) => fetch(BASE + "/api/admin" + path, {
  method: opts.method || "GET",
  headers: { Cookie: cookie, ...(opts.method && opts.method !== "GET" ? { "X-SOTA-Admin": "1", "Content-Type": "application/json" } : {}), ...(opts.headers || {}) },
  body: opts.body ? JSON.stringify(opts.body) : undefined,
});

test("lead: field validation returns the fields to fix", async () => {
  const r = await post("/api/leads", lead({ name: "", phone: "12", email: "nope", clientType: "x", message: "" }));
  assert.equal(r.status, 400);
  const d = await r.json();
  assert.deepEqual(Object.keys(d.fields).sort(), ["clientType", "email", "message", "name", "phone"]);
});

test("lead: instant submissions are treated as bots", async () => {
  const r = await post("/api/leads", lead({ elapsed: 300 }));
  assert.equal(r.status, 403);
});

test("lead: honeypot answers ok but stores nothing", async () => {
  const r = await post("/api/leads", lead({ company: "spam inc" }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).id, 0);
});

test("lead: a valid request is stored", async () => {
  const r = await post("/api/leads", lead());
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.ok(d.ok && d.id > 0);
  leadId = d.id;
});

test("lead: other origins are refused", async () => {
  const r = await post("/api/leads", lead(), { Origin: "https://evil.example" });
  assert.equal(r.status, 403);
});

test("ticket: opens with a screenshot and returns a ticket number", async () => {
  const r = await fetch(BASE + "/api/tickets", { method: "POST", body: ticketForm({}, { blob: new Blob([PNG], { type: "image/png" }), name: "error.png" }) });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.match(d.number, /^SOTA-[A-Z0-9]{6}$/);
  ticketNo = d.number;
});

test("ticket: a disguised file is rejected", async () => {
  const r = await fetch(BASE + "/api/tickets", { method: "POST", body: ticketForm({}, { blob: new Blob(["MZ\x90\x00 not an image"], { type: "image/png" }), name: "photo.png" }) });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).fields.file, "fileType");
});

test("ticket: missing fields are reported", async () => {
  const r = await fetch(BASE + "/api/tickets", { method: "POST", body: ticketForm({ category: "", description: "x", phone: "abc" }) });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys((await r.json()).fields).sort(), ["category", "description", "phone"]);
});

test("admin: everything needs a session", async () => {
  assert.equal((await fetch(BASE + "/api/admin/tickets")).status, 401);
});

test("admin: login without the console header is refused (CSRF)", async () => {
  const r = await post("/api/admin/login", { email: EMAIL, password: PASSWORD });
  assert.equal(r.status, 403);
});

test("admin: wrong password is refused", async () => {
  const r = await post("/api/admin/login", { email: EMAIL, password: "wrong-password-123" }, { "X-SOTA-Admin": "1" });
  assert.equal(r.status, 401);
});

test("admin: login sets an HttpOnly, SameSite=Strict cookie", async () => {
  const r = await post("/api/admin/login", { email: EMAIL, password: PASSWORD }, { "X-SOTA-Admin": "1" });
  assert.equal(r.status, 200);
  const sc = r.headers.get("set-cookie");
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/); assert.match(sc, /Path=\/api\/admin/);
  cookie = sc.split(";")[0];
  const me = await (await admin("/me")).json();
  assert.equal(me.user.email, EMAIL);
});

test("admin: a forged session cookie is refused", async () => {
  const [payload] = cookie.split("=")[1].split(".");
  const r = await fetch(BASE + "/api/admin/me", { headers: { Cookie: `sota_session=${payload}.forgedsignature` } });
  assert.equal(r.status, 401);
});

test("admin: the new ticket is listed, updated and keeps a history", async () => {
  const list = await (await admin("/tickets?status=active")).json();
  assert.ok(list.tickets.some((t) => t.number === ticketNo));
  const up = await admin(`/tickets/${ticketNo}`, { method: "PATCH", body: { status: "in_progress", note: "התקשרתי ללקוחה" } });
  assert.equal(up.status, 200);
  const d = await (await admin(`/tickets/${ticketNo}`)).json();
  assert.equal(d.ticket.status, "in_progress");
  assert.deepEqual(d.events.map((e) => e.type), ["created", "status", "note"]);
  assert.equal(d.ticket.ip_hash, undefined);
});

test("admin: the attachment downloads with safe headers", async () => {
  const r = await admin(`/tickets/${ticketNo}/file`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/png");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.match(r.headers.get("content-security-policy"), /sandbox/);
  assert.equal(new Uint8Array(await r.arrayBuffer()).length, PNG.length);
});

test("admin: leads can be worked", async () => {
  const d = await (await admin("/leads")).json();
  assert.ok(d.leads.some((l) => l.id === leadId));
  assert.equal((await admin(`/leads/${leadId}`, { method: "PATCH", body: { status: "contacted" } })).status, 200);
  assert.equal((await admin(`/leads/${leadId}`, { method: "PATCH", body: { status: "bogus" } })).status, 400);
});

test("admin: contact settings and published testimonials reach the site", async () => {
  assert.equal((await admin("/settings", { method: "PUT", body: { whatsapp: "+972-50-000-0000", phone: "050-000-0000", bookingUrl: "https://cal.com/sota" } })).status, 200);
  assert.equal((await admin("/settings", { method: "PUT", body: { bookingUrl: "javascript:alert(1)" } })).status, 400);
  const t = await admin("/testimonials", { method: "POST", body: { name: "לקוח לבדיקה", quote: "המלצה לבדיקה בלבד, תימחק מיד", lang: "he", published: true } });
  assert.equal(t.status, 200);
  const { id } = await t.json();
  const pub = await (await fetch(BASE + "/api/public/content")).json();
  assert.equal(pub.contact.whatsapp, "972500000000");
  assert.ok(pub.testimonials.some((x) => x.name === "לקוח לבדיקה"));
  assert.equal(pub.contact.notifyEmail, undefined);
  assert.equal((await admin(`/testimonials/${id}`, { method: "DELETE" })).status, 200);
  await admin("/settings", { method: "PUT", body: { whatsapp: "", phone: "", bookingUrl: "" } });
});

test("admin: staff users can't change settings or manage the team", async () => {
  const email = `staff${Date.now()}@sota.test`;
  assert.equal((await admin("/users", { method: "POST", body: { name: "איש צוות", email, password: "short", role: "staff" } })).status, 400);
  assert.equal((await admin("/users", { method: "POST", body: { name: "איש צוות", email, password: "StaffPassword-123", role: "staff" } })).status, 200);
  const r = await post("/api/admin/login", { email, password: "StaffPassword-123" }, { "X-SOTA-Admin": "1" });
  const staffCookie = r.headers.get("set-cookie").split(";")[0];
  const s = (path, opts = {}) => fetch(BASE + "/api/admin" + path, { method: opts.method || "GET", headers: { Cookie: staffCookie, "X-SOTA-Admin": "1", "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  assert.equal((await s("/tickets")).status, 200);
  assert.equal((await s("/settings", { method: "PUT", body: { phone: "1" } })).status, 403);
  assert.equal((await s("/users")).status, 403);
  // deactivate: the staff session stops working at once
  const users = (await (await admin("/users")).json()).users;
  const u = users.find((x) => x.email === email);
  await admin(`/users/${u.id}`, { method: "PATCH", body: { active: false } });
  assert.equal((await s("/tickets")).status, 401);
});

test("public: rate limit kicks in after repeated leads", async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await post("/api/leads", lead({ message: `בדיקת עומס ${i}` }));
  assert.equal(last.status, 429);
});
