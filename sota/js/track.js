/* SOTA: measurement.
   Every event goes to window.dataLayer. GTM or GA4 loads only when an ID is set in content/site.mjs
   AND the visitor accepted the consent banner (Google Consent Mode v2: denied by default).
   Events: whatsapp_click, generate_lead (lead form), ticket_open (support ticket), booking_click,
   language_switch, cta_click, phone_click, email_click, ticket_link. */
(() => {
  "use strict";
  const CFG = window.SOTA_CONFIG || {};
  const I18N = (() => { try { return JSON.parse(document.getElementById("i18n").textContent); } catch { return { ui: {} }; } })();
  const KEY = "sota-consent";
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", wait_for_update: 500 });

  const enabled = !!(CFG.gtmId || CFG.ga4Id);
  let loaded = false;
  function load() {
    if (loaded || !enabled) return;
    loaded = true;
    if (CFG.gtmId) {
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(CFG.gtmId);
      document.head.appendChild(s);
    } else if (CFG.ga4Id) {
      const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4Id);
      document.head.appendChild(s);
      gtag("js", new Date());
      gtag("config", CFG.ga4Id, { anonymize_ip: true });
    }
  }
  function grant() {
    gtag("consent", "update", { analytics_storage: "granted" });
    load();
  }
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };

  window.sotaTrack = function (event, params) {
    const clean = {};
    for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== "") clean[k] = v;
    window.dataLayer.push({ event, page_language: document.documentElement.lang, page_type: document.body?.dataset.page, ...clean });
  };

  function banner() {
    const ui = I18N.ui || {};
    const box = document.createElement("div");
    box.className = "cookie"; box.setAttribute("role", "region"); box.setAttribute("aria-label", ui.privacyLink || "Cookies");
    const p = document.createElement("p"); p.textContent = ui.cookieText || "";
    const row = document.createElement("div"); row.className = "cta-row";
    const yes = document.createElement("button"); yes.type = "button"; yes.className = "btn btn-small"; yes.textContent = ui.cookieAccept || "OK";
    const no = document.createElement("button"); no.type = "button"; no.className = "btn btn-ghost btn-small"; no.textContent = ui.cookieDecline || "No";
    row.append(yes, no); box.append(p, row);
    yes.addEventListener("click", () => { save("granted"); grant(); box.remove(); });
    no.addEventListener("click", () => { save("denied"); box.remove(); });
    document.body.appendChild(box);
  }

  if (!enabled) return;
  const state = read();
  if (state === "granted") grant();
  else if (state !== "denied") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner); else banner();
  }
})();
