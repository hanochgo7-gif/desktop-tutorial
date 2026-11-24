/* SOTA: the consultation form (new clients) and the support ticket form (existing clients).
   Validation here is for the visitor's convenience; the server validates everything again. */
(() => {
  "use strict";
  const CFG = window.SOTA_CONFIG || {};
  const I18N = (() => { try { return JSON.parse(document.getElementById("i18n").textContent); } catch { return {}; } })();
  const E = I18N.errors || {};
  const API = (CFG.apiBase || "").replace(/\/$/, "");
  const MAX_FILE = 10 * 1024 * 1024;
  const FILE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif", "application/pdf", "text/plain"];
  const FILE_EXT = /\.(png|jpe?g|webp|gif|heic|heif|pdf|txt|log)$/i;
  const loadedAt = Date.now();

  const utm = {};
  new URLSearchParams(location.search).forEach((v, k) => { if (/^utm_|^gclid$/.test(k)) utm[k] = v.slice(0, 120); });

  const rules = {
    name: (v) => (!v ? E.required : v.length < 2 ? E.name : ""),
    phone: (v) => { if (!v) return E.required; const d = v.replace(/[^\d]/g, ""); return /^[\d\s()+\-.]+$/.test(v) && d.length >= 9 && d.length <= 15 ? "" : E.phone; },
    email: (v) => (!v ? "" : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : E.email),
    message: (v) => (!v ? E.required : v.length < 5 ? E.message : ""),
    description: (v) => (!v ? E.required : v.length < 5 ? E.message : ""),
    category: (v) => (v ? "" : E.choose),
    clientType: (v) => (v ? "" : E.choose),
  };

  function setError(form, name, msg) {
    const input = form.elements[name];
    const el = input && (input.length && !input.tagName ? input[0] : input);
    const field = el?.closest(".field");
    const err = field?.querySelector(".err");
    if (err) err.textContent = msg || "";
    field?.classList.toggle("has-error", !!msg);
    if (el && el.setAttribute && !(input.length && !input.tagName)) el.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validate(form, names) {
    let first = null;
    for (const n of names) {
      const raw = form.elements[n]?.value ?? "";
      const msg = rules[n](String(raw).trim());
      setError(form, n, msg);
      if (msg && !first) first = n;
    }
    return first;
  }

  function focusField(form, name) {
    const input = form.elements[name];
    const el = input && (input.length && !input.tagName ? input[0] : input);
    el?.focus();
  }

  function setBusy(form, busy, label) {
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = busy; btn.setAttribute("aria-disabled", String(busy));
    btn.querySelector("[data-label]").textContent = label;
  }

  function status(form, msg, isError) {
    const s = form.querySelector(".form-status");
    s.textContent = "";
    s.classList.toggle("is-error", !!isError);
    if (!msg) return;
    s.append(msg);
    const wa = window.SOTA?.waLink?.(I18N.ui?.waText);
    if (isError && wa) {
      s.append(" ");
      const a = document.createElement("a"); a.href = wa; a.target = "_blank"; a.rel = "noopener"; a.textContent = I18N.ui?.whatsapp || "WhatsApp";
      a.addEventListener("click", () => window.sotaTrack?.("whatsapp_click", { location: "form_error" }));
      s.append(a);
    }
  }

  // Cloudflare Turnstile, only when a site key is configured
  const widgets = new Map();
  function turnstile(form) {
    if (!CFG.turnstileSiteKey) return;
    const box = form.querySelector("[data-turnstile]");
    if (!box) return;
    const render = () => widgets.set(form, window.turnstile.render(box, { sitekey: CFG.turnstileSiteKey, theme: "dark", language: I18N.lang, appearance: "interaction-only" }));
    if (window.turnstile) return render();
    (window.__sotaTs = window.__sotaTs || []).push(render);
    if (!document.getElementById("cf-ts")) {
      window.onSotaTurnstile = () => window.__sotaTs.forEach((fn) => fn());
      const s = document.createElement("script"); s.id = "cf-ts"; s.async = true; s.defer = true;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onSotaTurnstile";
      document.head.appendChild(s);
    }
  }
  const tsToken = (form) => (widgets.has(form) && window.turnstile ? window.turnstile.getResponse(widgets.get(form)) || "" : "");
  const tsReset = (form) => { if (widgets.has(form) && window.turnstile) window.turnstile.reset(widgets.get(form)); };

  async function send(path, body) {
    let res;
    try {
      res = await fetch(API + path, { method: "POST", body, headers: body instanceof FormData ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" } });
    } catch { return { kind: "network" }; }
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : {};
    if (res.ok && data.ok) return { kind: "ok", data };
    if (!isJson || res.status === 404 || res.status === 405) return { kind: "unavailable" };
    if (res.status === 429) return { kind: "rate" };
    if (res.status === 403) return { kind: "bot" };
    if (res.status === 400 && data.fields) return { kind: "fields", fields: data.fields };
    return { kind: "server" };
  }

  function handleFailure(form, r) {
    if (r.kind === "fields") {
      const names = Object.keys(r.fields);
      names.forEach((n) => setError(form, n, E[r.fields[n]] || E.required));
      status(form, E.summary, true);
      focusField(form, names[0]);
    } else status(form, E[r.kind] || E.server, true);
    tsReset(form);
  }

  const header = () => document.querySelector("[data-header]");
  function showSuccess(form) {
    const card = form.closest(".form-card");
    const ok = card.querySelector("[data-success]");
    form.hidden = true; ok.hidden = false;
    header()?.classList.remove("is-hidden");
    window.SOTA?.scrollToTarget?.(ok, true);
    setTimeout(() => ok.focus({ preventScroll: true }), 50);
    return ok;
  }

  /* ---------- consultation (lead) form ---------- */
  const lead = document.querySelector('[data-form="lead"]');
  if (lead) {
    turnstile(lead);
    const names = ["name", "phone", "email", "clientType", "message"];
    lead.addEventListener("input", (e) => { if (e.target.closest(".has-error") && rules[e.target.name]) setError(lead, e.target.name, rules[e.target.name](e.target.value.trim())); });
    lead.addEventListener("change", (e) => { if (e.target.name === "clientType") setError(lead, "clientType", ""); });
    lead.addEventListener("submit", async (e) => {
      e.preventDefault();
      status(lead, "");
      const bad = validate(lead, names);
      if (bad) { status(lead, E.summary, true); focusField(lead, bad); return; }
      const f = lead.elements;
      const payload = {
        name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(),
        clientType: f.clientType.value, message: f.message.value.trim(), company: f.company.value,
        lang: I18N.lang, page: location.pathname, referrer: document.referrer.slice(0, 300), utm,
        elapsed: Date.now() - loadedAt, turnstile: tsToken(lead),
      };
      setBusy(lead, true, I18N.lead.sending);
      const r = await send("/api/leads", JSON.stringify(payload));
      setBusy(lead, false, I18N.lead.submit);
      if (r.kind !== "ok") return handleFailure(lead, r);
      window.sotaTrack?.("generate_lead", { client_type: payload.clientType, form: "consultation" });
      const ok = showSuccess(lead);
      const first = payload.name.split(/\s+/)[0];
      ok.querySelector("[data-success-text]").textContent = I18N.lead.successText.replace("{name}", first ? (I18N.lang === "he" ? ", " : ", ") + first : "");
    });
  }

  /* ---------- support ticket form ---------- */
  const ticket = document.querySelector('[data-form="ticket"]');
  if (ticket) {
    turnstile(ticket);
    const names = ["name", "phone", "email", "category", "description"];
    const fileInput = ticket.elements.file, drop = ticket.querySelector("[data-file-drop]"), fileName = ticket.querySelector("[data-file-name]"), removeBtn = ticket.querySelector("[data-file-remove]");
    const fileErr = (file) => (!file ? "" : file.size > MAX_FILE ? E.fileSize : FILE_TYPES.includes(file.type) || FILE_EXT.test(file.name) ? "" : E.fileType);
    function onFile() {
      const file = fileInput.files[0];
      const msg = fileErr(file);
      fileName.textContent = file ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))}KB)` : "";
      removeBtn.hidden = !file;
      const err = document.getElementById("tk-file-err"); err.textContent = msg;
      drop.closest(".field").classList.toggle("has-error", !!msg);
    }
    fileInput.addEventListener("change", onFile);
    removeBtn.addEventListener("click", () => { fileInput.value = ""; onFile(); fileInput.focus(); });
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("is-over")));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      try { const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; } catch { return; }
      onFile();
    });
    ticket.addEventListener("input", (e) => { if (e.target.closest(".has-error") && rules[e.target.name]) setError(ticket, e.target.name, rules[e.target.name](e.target.value.trim())); });
    ticket.addEventListener("change", (e) => { if (e.target.name === "category") setError(ticket, "category", rules.category(e.target.value)); });

    ticket.addEventListener("submit", async (e) => {
      e.preventDefault();
      status(ticket, "");
      let bad = validate(ticket, names);
      const fmsg = fileErr(fileInput.files[0]);
      if (fmsg) { document.getElementById("tk-file-err").textContent = fmsg; bad = bad || "file"; }
      if (bad) { status(ticket, E.summary, true); focusField(ticket, bad); return; }
      const fd = new FormData(ticket);
      if (!fileInput.files[0]) fd.delete("file");
      fd.set("lang", I18N.lang); fd.set("page", location.pathname); fd.set("elapsed", String(Date.now() - loadedAt)); fd.set("turnstile", tsToken(ticket));
      setBusy(ticket, true, I18N.ticket.sending);
      const r = await send("/api/tickets", fd);
      setBusy(ticket, false, I18N.ticket.submit);
      if (r.kind !== "ok") return handleFailure(ticket, r);
      window.sotaTrack?.("ticket_open", { category: fd.get("category"), urgency: fd.get("urgency") });
      const ok = showSuccess(ticket);
      ok.querySelector("[data-ticket-no]").textContent = r.data.number;
      ok.querySelector("[data-success-email]").hidden = !r.data.emailed;
    });

    const card = ticket.closest(".form-card");
    card.querySelector("[data-copy-ticket]")?.addEventListener("click", async (e) => {
      const no = card.querySelector("[data-ticket-no]").textContent;
      try { await navigator.clipboard.writeText(no); e.target.textContent = I18N.ui.copied; }
      catch { const r = document.createRange(); r.selectNodeContents(card.querySelector("[data-ticket-no]")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    });
    card.querySelector("[data-another]")?.addEventListener("click", () => {
      ticket.reset(); onFile(); tsReset(ticket);
      card.querySelector("[data-success]").hidden = true; ticket.hidden = false;
      ticket.elements.description.focus();
    });
  }
})();
