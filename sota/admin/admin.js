/* SOTA staff console. Talks to /api/admin/* with an HttpOnly session cookie.
   All content from the database is rendered with textContent, never as HTML. */
(() => {
  "use strict";
  const API = (window.SOTA_ADMIN_API || "") + "/api/admin";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const L = {
    status: { open: "פתוחה", in_progress: "בטיפול", waiting: "ממתינה ללקוח", resolved: "נפתרה", closed: "סגורה" },
    urgency: { critical: "קריטית", high: "גבוהה", normal: "רגילה", low: "נמוכה" },
    category: { hardware: "מחשב או ציוד", network: "רשת ואינטרנט", email: "אימייל וחשבונות", software: "תוכנה ומערכות", security: "אבטחת מידע", other: "אחר" },
    leadStatus: { new: "חדשה", contacted: "יצרנו קשר", qualified: "רלוונטית", won: "נסגרה עסקה", lost: "לא רלוונטית", spam: "ספאם" },
    type: { private: "פרטי", small: "עסק קטן", medium: "עסק בינוני" },
    event: { created: "הקריאה נפתחה", status: "סטטוס עודכן ל", urgency: "דחיפות עודכנה ל", assignee: "שויכה ל", note: "הערה" },
    settings: { phone: "טלפון לתצוגה", whatsapp: "מספר וואטסאפ (972...)", email: "אימייל לתצוגה באתר", bookingUrl: "קישור לתיאום פגישה ביומן", notifyEmail: "לאן לשלוח התראות על פניות וקריאות" },
    errors: {
      invalid_credentials: "האימייל או הסיסמה לא נכונים.", rate_limited: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.", unauthorized: "פג תוקף ההתחברות. היכנסו שוב.",
      forbidden: "רק מנהל יכול לבצע את הפעולה הזו.", weak_password: "הסיסמה צריכה להכיל לפחות 12 תווים.", wrong_password: "הסיסמה הנוכחית לא נכונה.",
      exists: "כבר יש משתמש עם האימייל הזה.", validation: "יש שדות שלא מולאו נכון.", cannot_demote_self: "אי אפשר להוריד הרשאות לעצמך.", network: "אין חיבור לשרת. בדקו את החיבור ונסו שוב.",
    },
  };

  /* ---------- tiny DOM builder (text only) ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const fmtDate = (iso) => iso ? new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : "";
  const badge = (cls, text) => h("span", { class: `badge ${cls}`, text });

  /* ---------- API ---------- */
  async function api(path, opts = {}) {
    const init = { method: opts.method || "GET", credentials: "same-origin", headers: { Accept: "application/json" } };
    if (init.method !== "GET") init.headers["X-SOTA-Admin"] = "1";
    if (opts.body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.body); }
    let res;
    try { res = await fetch(API + path, init); } catch { throw Object.assign(new Error("network"), { code: "network" }); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/login") { showLogin(); throw Object.assign(new Error("unauthorized"), { code: "unauthorized" }); }
    if (!res.ok) throw Object.assign(new Error(data.error || "error"), { code: data.error || "error", data });
    return data;
  }
  function toast(msg, isError) {
    const t = $("[data-toast]");
    t.textContent = msg; t.classList.toggle("is-error", !!isError); t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200);
  }
  const fail = (e) => toast(L.errors[e.code] || "משהו השתבש. נסו שוב.", true);

  /* ---------- session ---------- */
  let me = null, team = [];
  function showLogin() {
    me = null;
    $('[data-view="app"]').hidden = true; $('[data-view="login"]').hidden = false;
    setTimeout(() => $("#lg-email").focus(), 30);
  }
  async function showApp(user) {
    me = user;
    $('[data-view="login"]').hidden = true; $('[data-view="app"]').hidden = false;
    $("[data-me]").textContent = `${user.name} · ${user.role === "admin" ? "מנהל" : "צוות"}`;
    $$("[data-admin-only]").forEach((el) => (el.hidden = user.role !== "admin"));
    try { team = (await api("/team")).users; } catch { team = []; }
    route();
  }
  $("[data-login]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, err = $("[data-login-error]"), btn = f.querySelector("button");
    err.textContent = ""; btn.disabled = true;
    try {
      const d = await api("/login", { method: "POST", body: { email: f.email.value, password: f.password.value } });
      f.password.value = "";
      showApp(d.user);
    } catch (ex) { err.textContent = L.errors[ex.code] || "הכניסה נכשלה."; }
    btn.disabled = false;
  });
  $("[data-logout]").addEventListener("click", async () => { try { await api("/logout", { method: "POST" }); } catch {} showLogin(); });

  /* ---------- routing ---------- */
  function show(panel) {
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== panel));
    const tab = panel === "ticket" ? "tickets" : panel;
    $$("[data-tab]").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    return $(`[data-panel="${panel}"]`);
  }
  function route() {
    if (!me) return;
    const hash = location.hash.slice(1) || "overview";
    const [name, arg] = hash.split("/");
    const views = { overview, tickets, ticket: () => ticketView(arg), leads, testimonials, settings, team: teamView, account };
    (views[name] || overview)();
    $("#app").focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", route);

  async function refreshCounts() {
    try {
      const s = await api("/summary");
      const tc = $('[data-count="tickets"]'), lc = $('[data-count="leads"]');
      tc.textContent = s.tickets.active || 0; tc.hidden = !s.tickets.active; tc.classList.toggle("is-alert", !!s.tickets.critical);
      lc.textContent = s.leads.new || 0; lc.hidden = !s.leads.new;
      return s;
    } catch { return null; }
  }

  /* ---------- overview ---------- */
  async function overview() {
    const p = show("overview");
    p.replaceChildren(h("div", { class: "panel-head" }, h("h1", { text: `שלום, ${me.name.split(" ")[0]}` })));
    const s = await refreshCounts();
    if (!s) return;
    p.append(h("div", { class: "stats" },
      h("a", { class: `stat${s.tickets.critical ? " is-alert" : ""}`, href: "#tickets" }, h("b", { text: s.tickets.critical || 0 }), h("span", { text: "קריאות קריטיות פתוחות" })),
      h("a", { class: "stat", href: "#tickets" }, h("b", { text: s.tickets.active || 0 }), h("span", { text: "קריאות פעילות" })),
      h("a", { class: "stat", href: "#leads" }, h("b", { text: s.leads.new || 0 }), h("span", { text: "פניות חדשות שלא טופלו" })),
      h("div", { class: "stat" }, h("b", { text: s.leads.month || 0 }), h("span", { text: "פניות ב-30 הימים האחרונים (יעד: 5)" })),
    ));
    const list = await api("/tickets?status=active&limit=8");
    p.append(h("h2", { class: "h-s", style: "margin-bottom:12px", text: "קריאות פעילות" }), ticketTable(list.tickets));
  }

  /* ---------- tickets ---------- */
  function ticketTable(rows) {
    if (!rows.length) return h("div", { class: "table-wrap" }, h("p", { class: "empty", text: "אין קריאות להצגה." }));
    return h("div", { class: "table-wrap" }, h("table", { class: "list" },
      h("thead", {}, h("tr", {}, ["מספר", "לקוח", "סוג", "דחיפות", "סטטוס", "משויך", "נפתחה"].map((t, i) => h("th", { class: i === 2 || i === 5 ? "hide-sm" : null, scope: "col", text: t })))),
      h("tbody", {}, rows.map((t) => h("tr", {},
        h("td", {}, h("a", { class: "num", href: `#ticket/${t.number}`, text: t.number })),
        h("td", {}, h("div", { text: t.business || t.name }), t.business ? h("small", { class: "muted", text: t.name }) : null),
        h("td", { class: "hide-sm", text: L.category[t.category] || t.category }),
        h("td", {}, badge(`u-${t.urgency}`, L.urgency[t.urgency])),
        h("td", {}, badge(`s-${t.status}`, L.status[t.status])),
        h("td", { class: "hide-sm", text: t.assignee_name || "—" }),
        h("td", { class: "nowrap", text: fmtDate(t.created_at) }),
      ))),
    ));
  }
  const ticketFilter = { status: "active", q: "" };
  async function tickets() {
    const p = show("tickets");
    const sel = h("select", { "aria-label": "סינון לפי סטטוס", onchange: (e) => { ticketFilter.status = e.target.value; load(); } },
      [["active", "פעילות"], ["", "הכול"], ...Object.entries(L.status)].map(([v, t]) => h("option", { value: v, text: t })));
    sel.value = ticketFilter.status;
    const q = h("input", { type: "search", placeholder: "חיפוש: מספר, שם, טלפון…", "aria-label": "חיפוש קריאות", value: ticketFilter.q });
    let t; q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { ticketFilter.q = q.value; load(); }, 250); });
    const body = h("div");
    p.replaceChildren(h("div", { class: "panel-head" }, h("h1", { text: "קריאות שירות" }), h("div", { class: "toolbar" }, q, sel)), body);
    async function load() {
      try {
        const d = await api(`/tickets?status=${encodeURIComponent(ticketFilter.status)}&q=${encodeURIComponent(ticketFilter.q)}`);
        body.replaceChildren(ticketTable(d.tickets));
      } catch (e) { fail(e); }
    }
    load(); refreshCounts();
  }

  async function ticketView(number) {
    const p = show("ticket");
    p.replaceChildren(h("p", { class: "muted", text: "טוען…" }));
    let d;
    try { d = await api(`/tickets/${encodeURIComponent(number)}`); } catch (e) { p.replaceChildren(h("a", { class: "back", href: "#tickets", text: "→ לכל הקריאות" }), h("p", { text: "הקריאה לא נמצאה." })); return; }
    const t = d.ticket;
    const save = async (patch, msg) => {
      try { await api(`/tickets/${t.number}`, { method: "PATCH", body: patch }); toast(msg || "נשמר"); ticketView(number); refreshCounts(); }
      catch (e) { fail(e); }
    };
    const statusSel = h("select", { class: "inline-select", id: "tk-status" }, Object.entries(L.status).map(([v, x]) => h("option", { value: v, text: x })));
    statusSel.value = t.status;
    statusSel.addEventListener("change", () => save({ status: statusSel.value }, "הסטטוס עודכן"));
    const urgSel = h("select", { class: "inline-select", id: "tk-urg" }, Object.entries(L.urgency).map(([v, x]) => h("option", { value: v, text: x })));
    urgSel.value = t.urgency;
    urgSel.addEventListener("change", () => save({ urgency: urgSel.value }, "הדחיפות עודכנה"));
    const asSel = h("select", { class: "inline-select", id: "tk-assignee" }, h("option", { value: "", text: "לא משויכת" }), team.map((u) => h("option", { value: String(u.id), text: u.name })));
    asSel.value = t.assignee ? String(t.assignee) : "";
    asSel.addEventListener("change", () => save({ assignee: asSel.value ? Number(asSel.value) : null }, "השיוך עודכן"));

    const note = h("textarea", { id: "tk-note", rows: "3", placeholder: "מה נעשה, מה הלאה…" });
    const noteForm = h("form", { class: "form", onsubmit: (e) => { e.preventDefault(); if (note.value.trim()) save({ note: note.value.trim() }, "ההערה נוספה"); } },
      h("div", { class: "field" }, h("label", { for: "tk-note", text: "הוספת הערה פנימית" }), note),
      h("button", { class: "btn btn-small", type: "submit", text: "הוספת הערה" }));

    let attach = null;
    if (t.attachment_key) {
      const href = `${API}/tickets/${t.number}/file`;
      attach = h("div", { class: "card" }, h("h2", { text: "קובץ מצורף" }),
        /^image\/(png|jpeg|webp|gif)$/.test(t.attachment_type) ? h("a", { href, target: "_blank", rel: "noopener" }, h("img", { class: "attach-img", src: href, alt: t.attachment_name, loading: "lazy" })) : null,
        h("a", { href, target: "_blank", rel: "noopener", text: `${t.attachment_name} (${Math.max(1, Math.round(t.attachment_size / 1024))}KB)` }));
    }
    const tel = (t.phone || "").replace(/[^\d+]/g, "");
    const wa = tel ? "https://wa.me/" + (tel.startsWith("0") ? "972" + tel.slice(1) : tel.replace(/^\+/, "")) : "";
    p.replaceChildren(
      h("a", { class: "back", href: "#tickets", text: "→ לכל הקריאות" }),
      h("div", { class: "panel-head" }, h("h1", {}, h("span", { class: "num", text: t.number }), " ", badge(`u-${t.urgency}`, L.urgency[t.urgency]))),
      h("div", { class: "detail" },
        h("div", { style: "display:grid;gap:24px" },
          h("div", { class: "card" }, h("h2", { text: L.category[t.category] }), h("p", { class: "desc", text: t.description })),
          attach,
          h("div", { class: "card" }, h("h2", { text: "היסטוריה" }),
            h("ol", { class: "timeline" }, d.events.map((ev) => h("li", {},
              h("span", { text: ev.type === "note" ? `${ev.user_name || ""}: ${ev.body}` : `${L.event[ev.type] || ev.type}${ev.type === "status" ? L.status[ev.body] : ev.type === "urgency" ? L.urgency[ev.body] : ev.type === "assignee" ? (ev.body || "ללא שיוך") : ""}${ev.user_name && ev.type !== "note" ? ` (${ev.user_name})` : ""}` }),
              h("small", { text: fmtDate(ev.created_at) })))),
            noteForm),
        ),
        h("div", { style: "display:grid;gap:24px" },
          h("div", { class: "card" }, h("h2", { text: "טיפול" }),
            h("div", { class: "field" }, h("label", { for: "tk-status", text: "סטטוס" }), statusSel),
            h("div", { class: "field" }, h("label", { for: "tk-urg", text: "דחיפות" }), urgSel),
            h("div", { class: "field" }, h("label", { for: "tk-assignee", text: "משויכת ל" }), asSel)),
          h("div", { class: "card" }, h("h2", { text: "פרטי הלקוח" }),
            h("dl", { class: "kv" },
              h("dt", { text: "שם" }), h("dd", { text: t.name }),
              h("dt", { text: "עסק" }), h("dd", { text: t.business || "—" }),
              h("dt", { text: "טלפון" }), h("dd", {}, h("a", { href: `tel:${tel}`, class: "num", text: t.phone })),
              h("dt", { text: "אימייל" }), h("dd", {}, t.email ? h("a", { href: `mailto:${t.email}?subject=${encodeURIComponent(t.number)}`, text: t.email }) : "—"),
              h("dt", { text: "נפתחה" }), h("dd", { text: fmtDate(t.created_at) }),
              h("dt", { text: "שפה" }), h("dd", { text: t.lang === "en" ? "אנגלית" : "עברית" })),
            wa ? h("a", { class: "btn btn-ghost btn-small", href: wa, target: "_blank", rel: "noopener", text: "וואטסאפ ללקוח" }) : null),
        ),
      ),
    );
  }

  /* ---------- leads ---------- */
  const leadFilter = { status: "", q: "" };
  async function leads() {
    const p = show("leads");
    const sel = h("select", { "aria-label": "סינון לפי סטטוס", onchange: (e) => { leadFilter.status = e.target.value; load(); } },
      [["", "הכול (בלי ספאם)"], ["active", "פתוחות"], ...Object.entries(L.leadStatus)].map(([v, t]) => h("option", { value: v, text: t })));
    sel.value = leadFilter.status;
    const q = h("input", { type: "search", placeholder: "חיפוש: שם, טלפון, תוכן…", "aria-label": "חיפוש פניות", value: leadFilter.q });
    let tm; q.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => { leadFilter.q = q.value; load(); }, 250); });
    const body = h("div");
    p.replaceChildren(h("div", { class: "panel-head" }, h("h1", { text: "פניות חדשות" }), h("div", { class: "toolbar" }, q, sel)), body);
    async function load() {
      let d; try { d = await api(`/leads?status=${encodeURIComponent(leadFilter.status)}&q=${encodeURIComponent(leadFilter.q)}`); } catch (e) { return fail(e); }
      if (!d.leads.length) return body.replaceChildren(h("div", { class: "table-wrap" }, h("p", { class: "empty", text: "אין פניות להצגה." })));
      body.replaceChildren(h("div", { class: "table-wrap" }, h("table", { class: "list" },
        h("thead", {}, h("tr", {}, ["פונה", "סוג", "פנייה", "סטטוס", "התקבלה"].map((t, i) => h("th", { scope: "col", class: i === 1 ? "hide-sm" : null, text: t })))),
        h("tbody", {}, d.leads.map((l) => {
          const s = h("select", { class: "inline-select", "aria-label": `סטטוס הפנייה של ${l.name}` }, Object.entries(L.leadStatus).map(([v, t]) => h("option", { value: v, text: t })));
          s.value = l.status;
          s.addEventListener("change", async () => { try { await api(`/leads/${l.id}`, { method: "PATCH", body: { status: s.value } }); toast("הסטטוס עודכן"); refreshCounts(); } catch (e) { fail(e); } });
          const tel = (l.phone || "").replace(/[^\d+]/g, "");
          return h("tr", {},
            h("td", {}, h("div", { text: l.name }), h("a", { class: "num", href: `tel:${tel}`, text: l.phone }), l.email ? h("div", {}, h("a", { href: `mailto:${l.email}`, text: l.email })) : null),
            h("td", { class: "hide-sm", text: L.type[l.client_type] || l.client_type }),
            h("td", {}, h("p", { class: "lead-msg", text: l.message })),
            h("td", {}, s),
            h("td", { class: "nowrap", text: fmtDate(l.created_at) }));
        })),
      )));
    }
    load(); refreshCounts();
  }

  /* ---------- testimonials ---------- */
  async function testimonials() {
    const p = show("testimonials");
    const isAdmin = me.role === "admin";
    let d; try { d = await api("/testimonials"); } catch (e) { return fail(e); }
    const form = (t = {}) => {
      const id = t.id ? `t${t.id}` : "tnew";
      const f = h("form", { class: "card grid-form" },
        h("h2", { text: t.id ? "עריכת המלצה" : "המלצה חדשה" }),
        h("div", { class: "field" }, h("label", { for: `${id}-quote`, text: "תוכן ההמלצה (כפי שהלקוח כתב)" }), h("textarea", { id: `${id}-quote`, name: "quote", required: true, rows: "4", value: t.quote || "" })),
        h("div", { class: "row" },
          h("div", { class: "field" }, h("label", { for: `${id}-name`, text: "שם" }), h("input", { id: `${id}-name`, name: "name", required: true, value: t.name || "" })),
          h("div", { class: "field" }, h("label", { for: `${id}-role`, text: "תפקיד" }), h("input", { id: `${id}-role`, name: "role", value: t.role || "" }))),
        h("div", { class: "row" },
          h("div", { class: "field" }, h("label", { for: `${id}-company`, text: "שם העסק" }), h("input", { id: `${id}-company`, name: "company", value: t.company || "" })),
          h("div", { class: "field" }, h("label", { for: `${id}-lang`, text: "שפה" }), (() => { const s = h("select", { id: `${id}-lang`, name: "lang" }, h("option", { value: "he", text: "עברית" }), h("option", { value: "en", text: "אנגלית" })); s.value = t.lang || "he"; return s; })())),
        h("label", { class: "check" }, h("input", { type: "checkbox", name: "published", checked: !!t.published }), "להציג באתר (רק באישור הלקוח)"),
        h("div", { class: "toolbar" },
          h("button", { class: "btn btn-small", type: "submit", text: t.id ? "שמירה" : "הוספה" }),
          t.id ? h("button", { class: "btn btn-ghost btn-small", type: "button", text: "מחיקה", onclick: async (e) => {
            if (e.target.dataset.confirm !== "1") { e.target.dataset.confirm = "1"; e.target.textContent = "ללחוץ שוב למחיקה"; return; }
            try { await api(`/testimonials/${t.id}`, { method: "DELETE" }); toast("ההמלצה נמחקה"); testimonials(); } catch (ex) { fail(ex); }
          } }) : null));
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = { quote: f.quote.value, name: f.name.value, role: f.role.value, company: f.company.value, lang: f.lang.value, published: f.published.checked };
        try { await api(t.id ? `/testimonials/${t.id}` : "/testimonials", { method: t.id ? "PUT" : "POST", body }); toast("נשמר"); testimonials(); } catch (ex) { fail(ex); }
      });
      return f;
    };
    p.replaceChildren(
      h("div", { class: "panel-head" }, h("h1", { text: "המלצות" })),
      h("p", { class: "muted", style: "margin-bottom:20px;max-width:60ch", text: "אזור ההמלצות באתר מופיע רק כשיש לפחות המלצה אחת שמסומנת להצגה. מעלים רק המלצות אמיתיות, באישור הלקוח." }),
      h("div", { style: "display:grid;gap:20px" },
        isAdmin ? form() : null,
        d.testimonials.length ? d.testimonials.map((t) => (isAdmin ? form(t) : h("div", { class: "card t-item" }, h("blockquote", { text: t.quote }), h("small", { class: "muted", text: [t.name, t.role, t.company].filter(Boolean).join(", ") })))) : h("p", { class: "muted", text: "עדיין אין המלצות." })),
    );
  }

  /* ---------- settings ---------- */
  async function settings() {
    const p = show("settings");
    let d; try { d = await api("/settings"); } catch (e) { return fail(e); }
    const isAdmin = me.role === "admin";
    const f = h("form", { class: "card grid-form" },
      d.keys.map((k) => h("div", { class: "field" }, h("label", { for: `st-${k}`, text: L.settings[k] || k }),
        h("input", { id: `st-${k}`, name: k, value: d.settings[k] || "", dir: "ltr", disabled: !isAdmin, type: /email/i.test(k) ? "email" : k === "bookingUrl" ? "url" : "text" }))),
      isAdmin ? h("button", { class: "btn btn-small", type: "submit", text: "שמירה" }) : h("p", { class: "muted", text: "רק מנהל יכול לשנות את הפרטים." }));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {}; d.keys.forEach((k) => (body[k] = f[k].value));
      try { await api("/settings", { method: "PUT", body }); toast("הפרטים עודכנו. הם יופיעו באתר תוך כמה דקות."); } catch (ex) { fail(ex); }
    });
    p.replaceChildren(h("div", { class: "panel-head" }, h("h1", { text: "פרטי קשר" })),
      h("p", { class: "muted", style: "margin-bottom:20px;max-width:60ch", text: "הפרטים כאן גוברים על מה שמוגדר בקוד האתר: כפתורי וואטסאפ, טלפון, אימייל וכפתור תיאום הפגישה מתעדכנים לבד." }), f);
  }

  /* ---------- team ---------- */
  async function teamView() {
    const p = show("team");
    if (me.role !== "admin") { p.replaceChildren(h("p", { text: L.errors.forbidden })); return; }
    let d; try { d = await api("/users"); } catch (e) { return fail(e); }
    const add = h("form", { class: "card grid-form" }, h("h2", { text: "הוספת משתמש" }),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "nu-name", text: "שם" }), h("input", { id: "nu-name", name: "name", required: true })),
        h("div", { class: "field" }, h("label", { for: "nu-email", text: "אימייל" }), h("input", { id: "nu-email", name: "email", type: "email", dir: "ltr", required: true }))),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "nu-pass", text: "סיסמה ראשונית (12+ תווים)" }), h("input", { id: "nu-pass", name: "password", type: "password", autocomplete: "new-password", required: true, minlength: "12" })),
        h("div", { class: "field" }, h("label", { for: "nu-role", text: "הרשאה" }), h("select", { id: "nu-role", name: "role" }, h("option", { value: "staff", text: "צוות: קריאות ופניות" }), h("option", { value: "admin", text: "מנהל: הכול" })))),
      h("button", { class: "btn btn-small", type: "submit", text: "הוספה" }));
    add.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api("/users", { method: "POST", body: { name: add.name.value, email: add.email.value, password: add.password.value, role: add.role.value } }); toast("המשתמש נוסף"); teamView(); } catch (ex) { fail(ex); }
    });
    p.replaceChildren(h("div", { class: "panel-head" }, h("h1", { text: "צוות" })),
      h("div", { class: "table-wrap", style: "margin-bottom:24px" }, h("table", { class: "list" },
        h("thead", {}, h("tr", {}, ["שם", "אימייל", "הרשאה", "כניסה אחרונה", ""].map((t) => h("th", { scope: "col", text: t })))),
        h("tbody", {}, d.users.map((u) => h("tr", {},
          h("td", { text: u.name }), h("td", { dir: "ltr", text: u.email }), h("td", { text: u.role === "admin" ? "מנהל" : "צוות" }),
          h("td", { class: "nowrap", text: fmtDate(u.last_login) || "—" }),
          h("td", {}, u.id === me.id ? h("span", { class: "muted", text: "את/ה" }) : h("button", { class: "link-btn", type: "button", text: u.active ? "השבתה" : "הפעלה",
            onclick: async () => { try { await api(`/users/${u.id}`, { method: "PATCH", body: { active: !u.active } }); toast("עודכן"); teamView(); } catch (ex) { fail(ex); } } }))))))),
      add);
  }

  /* ---------- account ---------- */
  function account() {
    const p = show("account");
    const f = h("form", { class: "card grid-form" }, h("h2", { text: "החלפת סיסמה" }),
      h("div", { class: "field" }, h("label", { for: "pw-cur", text: "סיסמה נוכחית" }), h("input", { id: "pw-cur", name: "current", type: "password", autocomplete: "current-password", required: true })),
      h("div", { class: "field" }, h("label", { for: "pw-new", text: "סיסמה חדשה (12+ תווים)" }), h("input", { id: "pw-new", name: "next", type: "password", autocomplete: "new-password", required: true, minlength: "12" })),
      h("button", { class: "btn btn-small", type: "submit", text: "עדכון הסיסמה" }));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api("/password", { method: "POST", body: { current: f.current.value, next: f.next.value } }); f.reset(); toast("הסיסמה עודכנה"); } catch (ex) { fail(ex); }
    });
    p.replaceChildren(h("div", { class: "panel-head" }, h("h1", { text: "החשבון שלי" })), f);
  }

  /* ---------- boot ---------- */
  api("/me").then((d) => showApp(d.user)).catch(() => showLogin());
  setInterval(() => { if (me && !document.hidden) refreshCounts(); }, 60000);
})();
