// העוזרת של רותם: שרת קטן (Cloudflare Worker) שמחזיק את מפתח ה-API ומדבר עם Claude.
// הדף שולח את השיחה, השרת מוסיף את הידע מהאתר ומזרים את התשובה בחזרה.
import Anthropic from "@anthropic-ai/sdk";
import KNOWLEDGE from "./knowledge.txt";

const SYSTEM = `את "העוזרת של רותם", עוזרת וירטואלית באתר של קליניקת הקוסמטיקה של רותם גוטובסקי במושב בניה.
כללים:
- עני בעברית, בגוף ראשון נקבה, בטון חם ומקצועי. קצר: עד ארבעה משפטים, בלי כותרות ובלי רשימות ארוכות.
- השתמשי רק בידע שלמטה. אל תמציאי מחירים, שעות, טיפולים או מוצרים. אם משהו לא מופיע בידע, אמרי שאת לא בטוחה ושכדאי לשאול את רותם בוואטסאפ (054-577-9379).
- אל תתני אבחון רפואי או המלצה רפואית אישית. על שאלות רפואיות אפשר להסביר באופן כללי ולהפנות לאבחון אצל רותם, שהוא ללא עלות.
- כשמתאים, סיימי בהצעה לקבוע אבחון או לכתוב לרותם בוואטסאפ.
- Latency-sensitive; begin your visible answer immediately.

הידע:
${KNOWLEDGE}`;

const MAX_TURNS = 12, MAX_CHARS = 600;
const hits = new Map(); // הגבלת קצב פשוטה לכל כתובת (best effort, לכל מופע של ה-Worker)

function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = allowed.length === 0 || allowed.includes(origin) || allowed.includes("*");
  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": ok ? origin || "*" : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    },
  };
}
function limited(ip) {
  const now = Date.now(), w = hits.get(ip) || [];
  const recent = w.filter((t) => now - t < 60_000);
  recent.push(now); hits.set(ip, recent);
  return recent.length > 20;
}
function validate(body) {
  const msgs = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const clean = msgs
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
  if (!clean.length || clean[clean.length - 1].role !== "user") return null;
  return clean;
}

export default {
  async fetch(req, env) {
    const { ok, headers } = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/chat") return new Response("not found", { status: 404, headers });
    if (!ok) return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
    if (limited(req.headers.get("CF-Connecting-IP") || "?")) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers });
    let messages;
    try { messages = validate(await req.json()); } catch { messages = null; }
    if (!messages) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers });

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();
    const send = (obj) => writer.write(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));

    (async () => {
      try {
        const stream = client.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 700,
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages,
        });
        stream.on("text", (delta) => { send({ t: delta }); });
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") await send({ t: "על זה אני מעדיפה לא לענות כאן. אפשר לשאול את רותם ישירות בוואטסאפ.", replace: true });
        await send({ done: true });
      } catch (e) {
        let code = "error";
        if (e instanceof Anthropic.RateLimitError) code = "rate_limited";
        else if (e instanceof Anthropic.AuthenticationError) code = "auth";
        else if (e instanceof Anthropic.APIError) code = "api_" + e.status;
        await send({ error: code });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" } });
  },
};
