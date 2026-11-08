// SOTA server: one Cloudflare Worker that serves the static site and the API on the same domain.
//   /api/leads              new-client consultation requests (public)
//   /api/tickets            support tickets from existing clients (public, with file upload)
//   /api/public/content     contact details and published testimonials for the site (public)
//   /api/admin/*            staff console: tickets, leads, testimonials, settings, users (login required)
// Storage: D1 (SQLite) for records, R2 for attachments. Email: Resend. Bot protection: Turnstile (optional),
// honeypot, minimum fill time and per-IP rate limits kept in D1.

const LEAD_TYPES = ["private", "small", "medium"];
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost", "spam"];
const CATEGORIES = ["hardware", "network", "email", "software", "security", "other"];
const URGENCIES = ["low", "normal", "high", "critical"];
const TICKET_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"];
const SETTING_KEYS = ["phone", "whatsapp", "email", "bookingUrl", "notifyEmail"];
const PUBLIC_SETTING_KEYS = ["phone", "whatsapp", "email", "bookingUrl"];
const MAX_FILE = 10 * 1024 * 1024;
const FILE_TYPES = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf", "text/plain": "txt",
};
const INLINE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const SESSION_COOKIE = "sota_session";
const SESSION_HOURS = 12;
const PBKDF2_ITER = 100000;
const MIN_FILL_MS = 2000;

const CATEGORY_LABEL = { hardware: "מחשב או ציוד", network: "רשת ואינטרנט", email: "אימייל וחשבונות", software: "תוכנה ומערכות", security: "אבטחת מידע", other: "אחר" };
const URGENCY_LABEL = { low: "נמוכה", normal: "רגילה", high: "גבוהה", critical: "קריטית" };
const TYPE_LABEL = { private: "לקוח פרטי", small: "עסק קטן", medium: "עסק בינוני" };

/* ---------------- helpers ---------------- */
const now = () => new Date().toISOString();
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

class HttpError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...headers,
    },
  });
}

async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
async function ipHash(req, env) {
  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "local";
  return (await sha256(ip + "|" + (env.SESSION_SECRET || "dev"))).slice(0, 32);
}

// fixed-window rate limit stored in D1, shared across Worker instances
async function rateLimit(env, key, max, windowSec) {
  const win = Math.floor(Date.now() / 1000 / windowSec);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, win, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.win = ?2 THEN rate_limits.count + 1 ELSE 1 END, win = ?2
     RETURNING count`
  ).bind(key, win).first();
  if (row && row.count > max) throw new HttpError(429, "rate_limited");
}

async function verifyTurnstile(env, token, req) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  const ip = req.headers.get("CF-Connecting-IP"); if (ip) body.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const d = await r.json();
    return !!d.success;
  } catch { return false; }
}

const validPhone = (v) => /^[\d\s()+\-.]+$/.test(v) && v.replace(/\D/g, "").length >= 9 && v.replace(/\D/g, "").length <= 15;
const validEmail = (v) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120;
const urlCount = (s) => (s.match(/https?:\/\/|www\./gi) || []).length;

async function getSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const out = {};
  for (const r of results) out[r.key] = r.value;
  return out;
}

async function sendEmail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!r.ok) console.error("email failed", r.status, await r.text());
    return r.ok;
  } catch (e) { console.error("email error", e); return false; }
}

function emailLayout(title, rows, footer, dir = "rtl") {
  const trs = rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b727a;width:130px;vertical-align:top">${escHtml(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${escHtml(v)}</td></tr>`).join("");
  return `<div dir="${dir}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#131517;max-width:600px">
<p style="font-size:13px;letter-spacing:.1em;color:#4D7A00;margin:0 0 8px">SOTA</p>
<h1 style="font-size:22px;margin:0 0 16px">${escHtml(title)}</h1>
<table style="border-collapse:collapse;width:100%">${trs}</table>
${footer ? `<p style="margin-top:20px;color:#6b727a;font-size:13px">${footer}</p>` : ""}</div>`;
}

async function notifyTo(env) {
  const s = await getSettings(env);
  return s.notifyEmail || env.NOTIFY_EMAIL || "";
}

function originOk(req, env) {
  const origin = req.headers.get("Origin");
  if (!origin) return true; // same-origin navigations and server-to-server
  const self = new URL(req.url).origin;
  if (origin === self) return true;
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin");
  if (!origin || origin === new URL(req.url).origin) return {};
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept", "Vary": "Origin" };
}

/* ---------------- passwords & sessions ---------------- */
async function hashPassword(password, saltB64, iter = PBKDF2_ITER) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64url(saltB64), iterations: iter }, key, 256);
  return b64url(bits);
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function hmac(env, data) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(500, "session_secret_missing");
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
async function makeSession(env, user) {
  const payload = b64url(enc.encode(JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + SESSION_HOURS * 3600e3 })));
  return `${payload}.${await hmac(env, payload)}`;
}
async function readSession(req, env) {
  const cookie = req.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!m) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig || !timingSafeEqual(sig, await hmac(env, payload))) return null;
  let data; try { data = JSON.parse(new TextDecoder().decode(fromB64url(payload))); } catch { return null; }
  if (!data.exp || data.exp < Date.now()) return null;
  const user = await env.DB.prepare("SELECT id, email, name, role, active FROM users WHERE id = ?1").bind(data.uid).first();
  if (!user || !user.active) return null;
  return user;
}
function sessionCookie(req, value, maxAge) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
async function audit(env, user, action, target) {
  await env.DB.prepare("INSERT INTO audit (created_at, user_id, action, target) VALUES (?1, ?2, ?3, ?4)").bind(now(), user?.id ?? null, action, target ?? null).run();
}

/* ---------------- public: leads ---------------- */
async function createLead(req, env, ctx) {
  const ih = await ipHash(req, env);
  await rateLimit(env, `lead:${ih}`, 5, 600);
  let body; try { body = await req.json(); } catch { throw new HttpError(400, "bad_request"); }

  // honeypot: bots fill the hidden field; answer as if it worked and store nothing
  if (str(body.company, 200)) return json({ ok: true, id: 0 });
  if (!(Number(body.elapsed) >= MIN_FILL_MS)) throw new HttpError(403, "bot");
  if (!(await verifyTurnstile(env, str(body.turnstile, 2048), req))) throw new HttpError(403, "bot");

  const d = {
    name: str(body.name, 80), phone: str(body.phone, 20), email: str(body.email, 120).toLowerCase(),
    clientType: str(body.clientType, 20), message: str(body.message, 2000),
    lang: body.lang === "en" ? "en" : "he", page: str(body.page, 200), referrer: str(body.referrer, 300),
    utm: body.utm && typeof body.utm === "object" ? JSON.stringify(Object.fromEntries(Object.entries(body.utm).slice(0, 8).map(([k, v]) => [String(k).slice(0, 30), String(v).slice(0, 120)]))) : null,
  };
  const fields = {};
  if (d.name.length < 2) fields.name = d.name ? "name" : "required";
  if (!validPhone(d.phone)) fields.phone = d.phone ? "phone" : "required";
  if (d.email && !validEmail(d.email)) fields.email = "email";
  if (!LEAD_TYPES.includes(d.clientType)) fields.clientType = "choose";
  if (d.message.length < 5) fields.message = d.message ? "message" : "required";
  if (Object.keys(fields).length) throw new HttpError(400, "validation", { fields });

  const status = urlCount(d.message) > 3 ? "spam" : "new";
  const r = await env.DB.prepare(
    `INSERT INTO leads (created_at, name, phone, email, client_type, message, status, lang, page, referrer, utm, ip_hash)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12) RETURNING id`
  ).bind(now(), d.name, d.phone, d.email || null, d.clientType, d.message, status, d.lang, d.page, d.referrer, d.utm, ih).first();

  if (status !== "spam") {
    ctx.waitUntil((async () => {
      const to = await notifyTo(env);
      await sendEmail(env, {
        to, replyTo: d.email || undefined,
        subject: `פנייה חדשה מהאתר: ${d.name} (${TYPE_LABEL[d.clientType]})`,
        html: emailLayout("פנייה חדשה לייעוץ ראשוני", [["שם", d.name], ["טלפון", d.phone], ["אימייל", d.email], ["סוג לקוח", TYPE_LABEL[d.clientType]], ["הפנייה", d.message], ["שפה", d.lang], ["עמוד", d.page]],
          env.ADMIN_URL ? `לניהול הפניות: <a href="${escHtml(env.ADMIN_URL)}">${escHtml(env.ADMIN_URL)}</a>` : ""),
        text: `פנייה חדשה\nשם: ${d.name}\nטלפון: ${d.phone}\nאימייל: ${d.email}\nסוג: ${TYPE_LABEL[d.clientType]}\n\n${d.message}`,
      });
    })());
  }
  return json({ ok: true, id: r.id });
}

/* ---------------- public: tickets ---------------- */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function ticketNumber() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return "SOTA-" + [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
}

// check the file's first bytes, so a renamed executable can't pass as an image
function sniff(bytes, type) {
  const h = (n) => [...bytes.slice(0, n)];
  const starts = (sig) => sig.every((v, i) => bytes[i] === v);
  switch (type) {
    case "image/png": return starts([0x89, 0x50, 0x4e, 0x47]);
    case "image/jpeg": return starts([0xff, 0xd8, 0xff]);
    case "image/gif": return starts([0x47, 0x49, 0x46, 0x38]);
    case "image/webp": return starts([0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...h(12).slice(8)) === "WEBP";
    case "application/pdf": return starts([0x25, 0x50, 0x44, 0x46]);
    case "image/heic": case "image/heif": return String.fromCharCode(...h(12).slice(4, 8)) === "ftyp";
    case "text/plain": return !h(512).some((c) => c === 0);
    default: return false;
  }
}
function fileTypeOf(file) {
  let type = (file.type || "").toLowerCase();
  const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  if (!FILE_TYPES[type]) {
    const byExt = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif", pdf: "application/pdf", txt: "text/plain", log: "text/plain" }[ext];
    type = byExt || "";
  }
  return type;
}

async function createTicket(req, env, ctx) {
  const ih = await ipHash(req, env);
  await rateLimit(env, `ticket:${ih}`, 6, 600);
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > MAX_FILE + 200 * 1024) throw new HttpError(413, "too_large", { fields: { file: "fileSize" } });
  let form; try { form = await req.formData(); } catch { throw new HttpError(400, "bad_request"); }
  const g = (k, max) => str(form.get(k), max);

  if (g("company", 200)) return json({ ok: true, number: "SOTA-000000", emailed: false });
  if (!(Number(form.get("elapsed")) >= MIN_FILL_MS)) throw new HttpError(403, "bot");
  if (!(await verifyTurnstile(env, g("turnstile", 2048), req))) throw new HttpError(403, "bot");

  const d = {
    name: g("name", 80), business: g("business", 120), phone: g("phone", 20), email: g("email", 120).toLowerCase(),
    category: g("category", 20), urgency: g("urgency", 10) || "normal", description: g("description", 4000),
    lang: form.get("lang") === "en" ? "en" : "he",
  };
  const fields = {};
  if (d.name.length < 2) fields.name = d.name ? "name" : "required";
  if (!validPhone(d.phone)) fields.phone = d.phone ? "phone" : "required";
  if (d.email && !validEmail(d.email)) fields.email = "email";
  if (!CATEGORIES.includes(d.category)) fields.category = "choose";
  if (!URGENCIES.includes(d.urgency)) fields.urgency = "choose";
  if (d.description.length < 5) fields.description = d.description ? "message" : "required";

  const file = form.get("file");
  let upload = null;
  if (file && typeof file === "object" && file.size > 0) {
    const type = fileTypeOf(file);
    if (file.size > MAX_FILE) fields.file = "fileSize";
    else if (!type) fields.file = "fileType";
    else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!sniff(bytes, type)) fields.file = "fileType";
      else upload = { bytes, type, name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(-100) || `file.${FILE_TYPES[type]}` };
    }
  }
  if (Object.keys(fields).length) throw new HttpError(400, "validation", { fields });

  // unique number; retry on the (very unlikely) collision
  let number, id;
  for (let i = 0; i < 5 && !id; i++) {
    number = ticketNumber();
    try {
      const r = await env.DB.prepare(
        `INSERT INTO tickets (number, created_at, name, business, phone, email, category, urgency, description, status, lang, ip_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'open', ?10, ?11) RETURNING id`
      ).bind(number, now(), d.name, d.business || null, d.phone, d.email || null, d.category, d.urgency, d.description, d.lang, ih).first();
      id = r.id;
    } catch (e) { if (!String(e.message).includes("UNIQUE")) throw e; }
  }
  if (!id) throw new HttpError(500, "number_failed");

  if (upload) {
    const key = `tickets/${number}/${crypto.randomUUID()}.${FILE_TYPES[upload.type]}`;
    await env.FILES.put(key, upload.bytes, { httpMetadata: { contentType: upload.type }, customMetadata: { name: upload.name } });
    await env.DB.prepare("UPDATE tickets SET attachment_key = ?1, attachment_name = ?2, attachment_type = ?3, attachment_size = ?4 WHERE id = ?5")
      .bind(key, upload.name, upload.type, upload.bytes.length, id).run();
  }
  await env.DB.prepare("INSERT INTO ticket_events (ticket_id, created_at, type, body) VALUES (?1, ?2, 'created', ?3)").bind(id, now(), d.urgency).run();

  const canEmail = !!(env.RESEND_API_KEY && env.MAIL_FROM);
  ctx.waitUntil((async () => {
    const to = await notifyTo(env);
    const urgentTag = d.urgency === "critical" ? "[קריטי] " : d.urgency === "high" ? "[דחוף] " : "";
    await sendEmail(env, {
      to, replyTo: d.email || undefined,
      subject: `${urgentTag}קריאת שירות ${number}: ${d.business || d.name}`,
      html: emailLayout(`קריאת שירות חדשה ${number}`, [["שם", d.name], ["עסק", d.business], ["טלפון", d.phone], ["אימייל", d.email], ["סוג", CATEGORY_LABEL[d.category]], ["דחיפות", URGENCY_LABEL[d.urgency]], ["תיאור", d.description], ["קובץ מצורף", upload ? upload.name : ""]],
        env.ADMIN_URL ? `לטיפול בקריאה: <a href="${escHtml(env.ADMIN_URL)}#ticket/${number}">${escHtml(env.ADMIN_URL)}</a>` : ""),
      text: `קריאת שירות ${number}\n${d.name} ${d.business}\n${d.phone}\nדחיפות: ${URGENCY_LABEL[d.urgency]}\n\n${d.description}`,
    });
    if (d.email) {
      const he = d.lang === "he";
      await sendEmail(env, {
        to: d.email,
        subject: he ? `קריאת השירות שלך נפתחה: ${number}` : `Your support ticket is open: ${number}`,
        html: emailLayout(he ? "קריאת השירות נפתחה" : "Your support ticket is open",
          he ? [["מספר קריאה", number], ["דחיפות", URGENCY_LABEL[d.urgency]], ["התיאור שלך", d.description]] : [["Ticket number", number], ["Urgency", d.urgency], ["Your description", d.description]],
          he ? "נחזור אליך לפי רמת הדחיפות. כדי לעדכן על הקריאה, השב למייל הזה וציין את מספר הקריאה." : "We'll get back to you according to the urgency you chose. To add details, reply to this email and include your ticket number.",
          he ? "rtl" : "ltr"),
        text: he ? `קריאת השירות נפתחה. מספר קריאה: ${number}` : `Your support ticket is open. Ticket number: ${number}`,
        replyTo: (await notifyTo(env)) || undefined,
      });
    }
  })());
  return json({ ok: true, number, emailed: !!(d.email && canEmail) });
}

/* ---------------- public: content ---------------- */
async function publicContent(env) {
  const s = await getSettings(env);
  const contact = {};
  for (const k of PUBLIC_SETTING_KEYS) if (s[k]) contact[k] = s[k];
  const { results } = await env.DB.prepare("SELECT name, role, company, quote, lang FROM testimonials WHERE published = 1 ORDER BY sort, id").all();
  return json({ contact, testimonials: results }, 200, { "Cache-Control": "public, max-age=300" });
}

/* ---------------- admin ---------------- */
async function login(req, env) {
  const ih = await ipHash(req, env);
  await rateLimit(env, `login:${ih}`, 8, 900);
  let body; try { body = await req.json(); } catch { throw new HttpError(400, "bad_request"); }
  const email = str(body.email, 120).toLowerCase(), password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  await rateLimit(env, `login-user:${await sha256(email)}`, 10, 3600);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?1").bind(email).first();
  // hash even when the user doesn't exist, so timing doesn't reveal which emails are registered
  const hash = await hashPassword(password, user?.pass_salt || "c2FsdHNhbHRzYWx0", user?.pass_iter || PBKDF2_ITER);
  if (!user || !user.active || !timingSafeEqual(hash, user.pass_hash)) throw new HttpError(401, "invalid_credentials");
  await env.DB.prepare("UPDATE users SET last_login = ?1 WHERE id = ?2").bind(now(), user.id).run();
  await audit(env, user, "login");
  return json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, 200, { "Set-Cookie": sessionCookie(req, await makeSession(env, user), SESSION_HOURS * 3600) });
}

function requireRole(user, role) { if (role === "admin" && user.role !== "admin") throw new HttpError(403, "forbidden"); }

async function listTickets(env, url) {
  const status = url.searchParams.get("status"), q = str(url.searchParams.get("q") || "", 80);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100)), offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const where = [], args = [];
  if (status === "active") where.push("status IN ('open','in_progress','waiting')");
  else if (TICKET_STATUSES.includes(status)) { args.push(status); where.push(`status = ?${args.length}`); }
  if (q) { args.push(`%${q}%`); where.push(`(number LIKE ?${args.length} OR name LIKE ?${args.length} OR business LIKE ?${args.length} OR phone LIKE ?${args.length} OR description LIKE ?${args.length})`); }
  args.push(limit, offset);
  const sql = `SELECT t.id, t.number, t.created_at, t.updated_at, t.name, t.business, t.phone, t.email, t.category, t.urgency, t.status, t.attachment_name, u.name AS assignee_name
    FROM tickets t LEFT JOIN users u ON u.id = t.assignee ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'waiting' THEN 2 ELSE 3 END,
      CASE t.urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, t.created_at DESC
    LIMIT ?${args.length - 1} OFFSET ?${args.length}`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ tickets: results });
}

async function getTicket(env, number) {
  const t = await env.DB.prepare("SELECT t.*, u.name AS assignee_name FROM tickets t LEFT JOIN users u ON u.id = t.assignee WHERE t.number = ?1").bind(number).first();
  if (!t) throw new HttpError(404, "not_found");
  delete t.ip_hash;
  const { results } = await env.DB.prepare("SELECT e.id, e.created_at, e.type, e.body, u.name AS user_name FROM ticket_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.ticket_id = ?1 ORDER BY e.created_at, e.id").bind(t.id).all();
  return json({ ticket: t, events: results });
}

async function updateTicket(req, env, user, number) {
  const t = await env.DB.prepare("SELECT id, status, urgency, assignee FROM tickets WHERE number = ?1").bind(number).first();
  if (!t) throw new HttpError(404, "not_found");
  let body; try { body = await req.json(); } catch { throw new HttpError(400, "bad_request"); }
  const sets = [], args = [], events = [];
  if (body.status !== undefined) {
    if (!TICKET_STATUSES.includes(body.status)) throw new HttpError(400, "bad_status");
    if (body.status !== t.status) { args.push(body.status); sets.push(`status = ?${args.length}`); events.push(["status", body.status]); }
  }
  if (body.urgency !== undefined) {
    if (!URGENCIES.includes(body.urgency)) throw new HttpError(400, "bad_urgency");
    if (body.urgency !== t.urgency) { args.push(body.urgency); sets.push(`urgency = ?${args.length}`); events.push(["urgency", body.urgency]); }
  }
  if (body.assignee !== undefined) {
    const a = body.assignee === null ? null : Number(body.assignee);
    if (a !== null) { const u = await env.DB.prepare("SELECT id, name FROM users WHERE id = ?1 AND active = 1").bind(a).first(); if (!u) throw new HttpError(400, "bad_assignee"); events.push(["assignee", u.name]); }
    else events.push(["assignee", ""]);
    args.push(a); sets.push(`assignee = ?${args.length}`);
  }
  const note = str(body.note, 4000);
  if (note) events.push(["note", note]);
  if (!sets.length && !events.length) return json({ ok: true });
  const stmts = [];
  if (sets.length) { args.push(now(), t.id); stmts.push(env.DB.prepare(`UPDATE tickets SET ${sets.join(", ")}, updated_at = ?${args.length - 1} WHERE id = ?${args.length}`).bind(...args)); }
  else stmts.push(env.DB.prepare("UPDATE tickets SET updated_at = ?1 WHERE id = ?2").bind(now(), t.id));
  for (const [type, b] of events) stmts.push(env.DB.prepare("INSERT INTO ticket_events (ticket_id, created_at, user_id, type, body) VALUES (?1, ?2, ?3, ?4, ?5)").bind(t.id, now(), user.id, type, b));
  await env.DB.batch(stmts);
  return json({ ok: true });
}

async function ticketFile(env, number) {
  const t = await env.DB.prepare("SELECT attachment_key, attachment_name, attachment_type FROM tickets WHERE number = ?1").bind(number).first();
  if (!t?.attachment_key) throw new HttpError(404, "not_found");
  const obj = await env.FILES.get(t.attachment_key);
  if (!obj) throw new HttpError(404, "not_found");
  const inline = INLINE_TYPES.includes(t.attachment_type);
  return new Response(obj.body, {
    headers: {
      "Content-Type": t.attachment_type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(t.attachment_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}

async function listLeads(env, url) {
  const status = url.searchParams.get("status"), q = str(url.searchParams.get("q") || "", 80);
  const where = [], args = [];
  if (status === "active") where.push("status IN ('new','contacted','qualified')");
  else if (LEAD_STATUSES.includes(status)) { args.push(status); where.push(`status = ?${args.length}`); }
  else where.push("status != 'spam'");
  if (q) { args.push(`%${q}%`); where.push(`(name LIKE ?${args.length} OR phone LIKE ?${args.length} OR email LIKE ?${args.length} OR message LIKE ?${args.length})`); }
  const { results } = await env.DB.prepare(`SELECT id, created_at, updated_at, name, phone, email, client_type, message, status, note, lang, page, utm FROM leads ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT 300`).bind(...args).all();
  return json({ leads: results });
}

async function updateLead(req, env, user, id) {
  let body; try { body = await req.json(); } catch { throw new HttpError(400, "bad_request"); }
  const sets = [], args = [];
  if (body.status !== undefined) { if (!LEAD_STATUSES.includes(body.status)) throw new HttpError(400, "bad_status"); args.push(body.status); sets.push(`status = ?${args.length}`); }
  if (body.note !== undefined) { args.push(str(body.note, 4000)); sets.push(`note = ?${args.length}`); }
  if (!sets.length) return json({ ok: true });
  args.push(now(), id);
  const r = await env.DB.prepare(`UPDATE leads SET ${sets.join(", ")}, updated_at = ?${args.length - 1} WHERE id = ?${args.length}`).bind(...args).run();
  if (!r.meta.changes) throw new HttpError(404, "not_found");
  await audit(env, user, "lead_update", String(id));
  return json({ ok: true });
}

function testimonialInput(body) {
  const d = { name: str(body.name, 80), role: str(body.role, 80), company: str(body.company, 120), quote: str(body.quote, 1200), lang: body.lang === "en" ? "en" : "he", published: body.published ? 1 : 0, sort: Number.isFinite(+body.sort) ? Math.trunc(+body.sort) : 0 };
  if (d.name.length < 2 || d.quote.length < 10) throw new HttpError(400, "validation");
  return d;
}

async function summary(env) {
  const t = await env.DB.prepare(`SELECT
      SUM(status IN ('open','in_progress','waiting')) AS active,
      SUM(status = 'open') AS open,
      SUM(status IN ('open','in_progress','waiting') AND urgency = 'critical') AS critical,
      SUM(status IN ('open','in_progress','waiting') AND urgency = 'high') AS high
    FROM tickets`).first();
  const l = await env.DB.prepare(`SELECT SUM(status = 'new') AS new, SUM(created_at >= ?1 AND status != 'spam') AS month FROM leads`).bind(new Date(Date.now() - 30 * 864e5).toISOString()).first();
  return json({ tickets: t, leads: l });
}

async function adminRouter(req, env, url) {
  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";
  const method = req.method;

  // state-changing requests must come from our own page (custom header + same origin)
  if (method !== "GET") {
    const origin = req.headers.get("Origin");
    if ((origin && origin !== url.origin) || req.headers.get("X-SOTA-Admin") !== "1") throw new HttpError(403, "csrf");
  }
  if (path === "/login" && method === "POST") return login(req, env);
  if (path === "/logout" && method === "POST") return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(req, "", 0) });

  const user = await readSession(req, env);
  if (!user) throw new HttpError(401, "unauthorized");
  let m;

  if (path === "/me" && method === "GET") return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  if (path === "/summary" && method === "GET") return summary(env);

  if (path === "/tickets" && method === "GET") return listTickets(env, url);
  if ((m = path.match(/^\/tickets\/(SOTA-[A-Z0-9]{6})$/))) {
    if (method === "GET") return getTicket(env, m[1]);
    if (method === "PATCH") { const r = await updateTicket(req, env, user, m[1]); await audit(env, user, "ticket_update", m[1]); return r; }
  }
  if ((m = path.match(/^\/tickets\/(SOTA-[A-Z0-9]{6})\/file$/)) && method === "GET") return ticketFile(env, m[1]);

  if (path === "/leads" && method === "GET") return listLeads(env, url);
  if ((m = path.match(/^\/leads\/(\d+)$/)) && method === "PATCH") return updateLead(req, env, user, Number(m[1]));

  if (path === "/team" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT id, name FROM users WHERE active = 1 ORDER BY name").all();
    return json({ users: results });
  }

  if (path === "/testimonials" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM testimonials ORDER BY sort, id").all();
    return json({ testimonials: results });
  }
  if (path === "/testimonials" && method === "POST") {
    requireRole(user, "admin");
    const d = testimonialInput(await req.json());
    const r = await env.DB.prepare("INSERT INTO testimonials (created_at, name, role, company, quote, lang, published, sort) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id")
      .bind(now(), d.name, d.role || null, d.company || null, d.quote, d.lang, d.published, d.sort).first();
    await audit(env, user, "testimonial_create", String(r.id));
    return json({ ok: true, id: r.id });
  }
  if ((m = path.match(/^\/testimonials\/(\d+)$/))) {
    requireRole(user, "admin");
    if (method === "PUT") {
      const d = testimonialInput(await req.json());
      const r = await env.DB.prepare("UPDATE testimonials SET name = ?1, role = ?2, company = ?3, quote = ?4, lang = ?5, published = ?6, sort = ?7, updated_at = ?8 WHERE id = ?9")
        .bind(d.name, d.role || null, d.company || null, d.quote, d.lang, d.published, d.sort, now(), Number(m[1])).run();
      if (!r.meta.changes) throw new HttpError(404, "not_found");
      await audit(env, user, "testimonial_update", m[1]);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM testimonials WHERE id = ?1").bind(Number(m[1])).run();
      await audit(env, user, "testimonial_delete", m[1]);
      return json({ ok: true });
    }
  }

  if (path === "/settings" && method === "GET") return json({ settings: await getSettings(env), keys: SETTING_KEYS });
  if (path === "/settings" && method === "PUT") {
    requireRole(user, "admin");
    const body = await req.json();
    const stmts = [];
    for (const k of SETTING_KEYS) {
      if (body[k] === undefined) continue;
      let v = str(body[k], 300);
      if (k === "whatsapp") v = v.replace(/\D/g, "");
      if (k === "bookingUrl" && v && !/^https:\/\//.test(v)) throw new HttpError(400, "validation", { fields: { bookingUrl: "url" } });
      if ((k === "email" || k === "notifyEmail") && v && !validEmail(v)) throw new HttpError(400, "validation", { fields: { [k]: "email" } });
      stmts.push(env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3").bind(k, v, now()));
    }
    if (stmts.length) await env.DB.batch(stmts);
    await audit(env, user, "settings_update");
    return json({ ok: true });
  }

  if (path === "/users" && method === "GET") {
    requireRole(user, "admin");
    const { results } = await env.DB.prepare("SELECT id, email, name, role, active, created_at, last_login FROM users ORDER BY id").all();
    return json({ users: results });
  }
  if (path === "/users" && method === "POST") {
    requireRole(user, "admin");
    const b = await req.json();
    const email = str(b.email, 120).toLowerCase(), name = str(b.name, 80), role = b.role === "admin" ? "admin" : "staff", password = typeof b.password === "string" ? b.password : "";
    if (!validEmail(email) || name.length < 2) throw new HttpError(400, "validation");
    if (password.length < 12) throw new HttpError(400, "weak_password");
    const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
    try {
      await env.DB.prepare("INSERT INTO users (email, name, role, pass_hash, pass_salt, pass_iter, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
        .bind(email, name, role, await hashPassword(password, salt), salt, PBKDF2_ITER, now()).run();
    } catch (e) { if (String(e.message).includes("UNIQUE")) throw new HttpError(409, "exists"); throw e; }
    await audit(env, user, "user_create", email);
    return json({ ok: true });
  }
  if ((m = path.match(/^\/users\/(\d+)$/)) && method === "PATCH") {
    requireRole(user, "admin");
    const id = Number(m[1]), b = await req.json();
    if (id === user.id && (b.active === false || b.role === "staff")) throw new HttpError(400, "cannot_demote_self");
    const stmts = [];
    if (b.active !== undefined) stmts.push(env.DB.prepare("UPDATE users SET active = ?1 WHERE id = ?2").bind(b.active ? 1 : 0, id));
    if (b.role !== undefined) stmts.push(env.DB.prepare("UPDATE users SET role = ?1 WHERE id = ?2").bind(b.role === "admin" ? "admin" : "staff", id));
    if (b.password !== undefined) {
      if (typeof b.password !== "string" || b.password.length < 12) throw new HttpError(400, "weak_password");
      const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
      stmts.push(env.DB.prepare("UPDATE users SET pass_hash = ?1, pass_salt = ?2, pass_iter = ?3 WHERE id = ?4").bind(await hashPassword(b.password, salt), salt, PBKDF2_ITER, id));
    }
    if (stmts.length) await env.DB.batch(stmts);
    await audit(env, user, "user_update", String(id));
    return json({ ok: true });
  }
  if (path === "/password" && method === "POST") {
    const b = await req.json();
    const full = await env.DB.prepare("SELECT * FROM users WHERE id = ?1").bind(user.id).first();
    if (!timingSafeEqual(await hashPassword(String(b.current || ""), full.pass_salt, full.pass_iter), full.pass_hash)) throw new HttpError(400, "wrong_password");
    if (typeof b.next !== "string" || b.next.length < 12) throw new HttpError(400, "weak_password");
    const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
    await env.DB.prepare("UPDATE users SET pass_hash = ?1, pass_salt = ?2, pass_iter = ?3 WHERE id = ?4").bind(await hashPassword(b.next, salt), salt, PBKDF2_ITER, user.id).run();
    await audit(env, user, "password_change");
    return json({ ok: true });
  }

  throw new HttpError(404, "not_found");
}

/* ---------------- entry ---------------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) {
      // static site (served by Workers Static Assets)
      return env.ASSETS.fetch(req);
    }
    const cors = corsHeaders(req, env);
    try {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (url.pathname.startsWith("/api/admin")) return await adminRouter(req, env, url);
      if (!originOk(req, env)) throw new HttpError(403, "origin_not_allowed");
      let res;
      if (url.pathname === "/api/leads" && req.method === "POST") res = await createLead(req, env, ctx);
      else if (url.pathname === "/api/tickets" && req.method === "POST") res = await createTicket(req, env, ctx);
      else if (url.pathname === "/api/public/content" && req.method === "GET") res = await publicContent(env);
      else if (url.pathname === "/api/health") res = json({ ok: true });
      else throw new HttpError(404, "not_found");
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      if (e instanceof HttpError) return json({ ok: false, error: e.code, ...(e.extra || {}) }, e.status, cors);
      console.error(e);
      return json({ ok: false, error: "server_error" }, 500, cors);
    }
  },
};

export { hashPassword, ticketNumber, sniff };
