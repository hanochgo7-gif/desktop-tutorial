#!/usr/bin/env node
// כלי שורת פקודה לפרסום ותזמון פוסטים של הקליניקה דרך Zernio.
// המפתח נקרא מהסביבה (ZERNIO_API_KEY) או מקובץ .env בתיקייה הזו. לעולם לא בקוד.
import Zernio from "@zernio/node";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const clinicRoot = resolve(here, "..");

// ---- .env (בלי תלות חיצונית) ----
const envFile = resolve(here, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.ZERNIO_API_KEY) {
  console.error("חסר ZERNIO_API_KEY. העתיקי את .env.example ל-.env ומלאי את המפתח, או הגדירי משתנה סביבה.");
  process.exit(1);
}
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const zernio = new Zernio();

// ---- עזרים ----
const args = process.argv.slice(2);
const cmd = args.shift();
const flag = (name, def) => { const i = args.indexOf("--" + name); if (i === -1) return def; const v = args[i + 1]; return v === undefined || v.startsWith("--") ? true : v; };
const has = (name) => args.includes("--" + name);
const die = (msg) => { console.error(msg); process.exit(1); };
const unwrap = (res) => { if (res.error) throw new Error(JSON.stringify(res.error)); return res.data; };
// שעה לפי שעון ישראל, בלי תלות באזור הזמן של המחשב
const TZ = "Asia/Jerusalem";
function atIsrael(day, hour) {
  const ymd = new Date(day); const y = ymd.getUTCFullYear(), m = ymd.getUTCMonth(), d = ymd.getUTCDate();
  let t = Date.UTC(y, m, d, hour, 0, 0);
  for (let i = 0; i < 2; i++) { const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).formatToParts(new Date(t)); const h = Number(parts.find((x) => x.type === "hour").value) % 24; t -= (h - hour) * 3600000; }
  return new Date(t);
}
const mime = (f) => ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm" })[extname(f).toLowerCase()] || "application/octet-stream";

async function accounts() {
  const data = unwrap(await zernio.accounts.listAccounts());
  return (data.accounts || []).filter((a) => a.isActive !== false);
}

// מעלה קובץ מקומי ומחזיר URL ציבורי לשימוש בפוסט
async function upload(localPath) {
  const file = resolve(clinicRoot, localPath);
  if (!existsSync(file)) die("קובץ לא נמצא: " + file);
  const contentType = mime(file);
  const pre = unwrap(await zernio.media.getMediaPresignedUrl({ body: { filename: basename(file), contentType } }));
  const r = await fetch(pre.uploadUrl, { method: "PUT", body: readFileSync(file), headers: { "Content-Type": contentType } });
  if (!r.ok) die("העלאה נכשלה: " + r.status);
  return { type: contentType.startsWith("video") ? "video" : "image", url: pre.publicUrl };
}

// בוחר חשבונות לפי רשימת פלטפורמות ("instagram,facebook") או את כולם
async function targets(platformsCsv) {
  const all = await accounts();
  if (!all.length) die("אין חשבונות מחוברים ב-Zernio. הריצי: npm run connect -- instagram (או facebook / googlebusiness / tiktok).");
  const want = platformsCsv ? String(platformsCsv).split(",").map((s) => s.trim()) : null;
  const chosen = all.filter((a) => !want || want.includes(a.platform));
  if (!chosen.length) die("לא נמצאו חשבונות עבור: " + platformsCsv + ". מחוברים: " + all.map((a) => a.platform).join(", "));
  return chosen.map((a) => ({ platform: a.platform, accountId: a._id || a.id }));
}

function renderText(p) {
  let text = p.text.trim();
  if (p.link) text += "\n\n" + (p.link.startsWith("http") ? p.link : SITE + "/" + p.link.replace(/^\//, ""));
  return text;
}

async function createPost({ text, media, platforms, when, now, draft, hashtags, title }) {
  const body = { content: text, platforms, timezone: TZ };
  if (media?.length) body.mediaItems = media;
  if (hashtags?.length) body.hashtags = hashtags;
  if (title) body.title = title;
  if (now) body.publishNow = true;
  else if (when) body.scheduledFor = new Date(when).toISOString();
  else body.isDraft = true;
  if (draft) { body.isDraft = true; delete body.publishNow; }
  const data = unwrap(await zernio.posts.createPost({ body }));
  return data.post || data;
}

// ---- פקודות ----
const commands = {
  async accounts() {
    const list = await accounts();
    if (!list.length) return console.log("אין חשבונות מחוברים עדיין. חיבור: npm run connect -- instagram");
    for (const a of list) console.log(`${a.platform.padEnd(16)} ${a.displayName || a.username || ""}  id=${a._id || a.id}`);
  },

  // מדפיס קישור חיבור (OAuth) לפלטפורמה. פותחים בדפדפן, מאשרים, והחשבון נוסף.
  async connect() {
    const platform = args[0]; if (!platform) die("שימוש: npm run connect -- <instagram|facebook|googlebusiness|tiktok|youtube|linkedin|threads|whatsapp>");
    const profiles = unwrap(await zernio.profiles.listProfiles());
    const profile = (profiles.profiles || []).find((p) => p.isDefault) || (profiles.profiles || [])[0];
    const query = profile ? { profileId: profile._id } : {};
    const data = unwrap(await zernio.connect.getConnectUrl({ path: { platform }, query }));
    console.log("פתחי את הקישור בדפדפן ואשרי את החיבור:\n" + (data.authUrl || JSON.stringify(data)));
  },

  // פוסט בודד: npm run post -- --text "..." [--image images/x.webp] [--to instagram,facebook] [--when 2026-10-12T10:00] [--now] [--link treatments/acne.html]
  async post() {
    const text = flag("text"); if (!text || text === true) die("חסר --text");
    const platforms = await targets(flag("to"));
    const media = [];
    for (const key of ["image", "video"]) { const f = flag(key); if (f && f !== true) media.push(await upload(f)); }
    const link = flag("link");
    const post = await createPost({ text: renderText({ text, link: link === true ? null : link }), media, platforms, when: flag("when"), now: has("now"), draft: has("draft"), hashtags: flag("tags") ? String(flag("tags")).split(",") : [] });
    console.log(`נוצר: ${post._id}  סטטוס: ${post.status}${post.scheduledFor ? "  מתוזמן ל-" + post.scheduledFor : ""}`);
  },

  // לוח תוכן: npm run plan -- [--from 2026-10-13] [--to instagram,facebook] [--dry-run] [--draft]
  // קורא posts.json, מתזמן פוסט אחד לכל רשומה לפי ימים ושעה, ומעלה את התמונה מהאתר.
  async plan() {
    const plan = JSON.parse(readFileSync(resolve(here, "posts.json"), "utf8"));
    const start = new Date(flag("from") || Date.now() + 86400000);
    const dry = has("dry-run");
    const platforms = dry ? [] : await targets(flag("to"));
    let n = 0;
    for (const p of plan.posts) {
      const when = atIsrael(start.getTime() + (p.day ?? n * plan.everyDays) * 86400000, p.hour ?? plan.hour ?? 10);
      const text = renderText(p);
      if (dry) { console.log(`--- ${when.toLocaleString("he-IL", { timeZone: TZ })}  [${p.image || "ללא תמונה"}]\n${text}\n`); n++; continue; }
      const media = p.image ? [await upload(p.image)] : [];
      const post = await createPost({ text, media, platforms, when, draft: has("draft"), hashtags: p.hashtags || plan.hashtags || [], title: p.title });
      console.log(`${post.status.padEnd(10)} ${when.toISOString().slice(0, 16)}  ${p.title}  (${post._id})`);
      n++;
    }
    if (dry) console.log(`${n} פוסטים. בלי --dry-run הם ייכנסו לתזמון ב-Zernio.`);
  },

  // רשימת פוסטים: npm run list -- [--status scheduled|draft|published|failed]
  async list() {
    const query = { limit: 50 }; const st = flag("status"); if (st && st !== true) query.status = st;
    const data = unwrap(await zernio.posts.listPosts({ query }));
    for (const p of data.posts || []) console.log(`${(p.status || "").padEnd(10)} ${(p.scheduledFor || p.createdAt || "").slice(0, 16)}  ${(p.title || p.content || "").replace(/\s+/g, " ").slice(0, 60)}  (${p._id})`);
    if (!(data.posts || []).length) console.log("אין פוסטים.");
  },
};

if (!commands[cmd]) {
  console.log("פקודות: accounts | connect <platform> | post | plan | list\nדוגמאות:\n  npm run accounts\n  npm run connect -- instagram\n  npm run post -- --text \"טיפ ליום חם\" --image images/face-crew.webp --to instagram --when 2026-10-12T10:00\n  npm run plan -- --dry-run");
  process.exit(cmd ? 1 : 0);
}
commands[cmd]().catch((e) => { console.error("שגיאה:", e.message || e); process.exit(1); });
