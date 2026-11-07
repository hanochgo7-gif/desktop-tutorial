// בונה את כל עמודי האתר מתוך content/*.mjs. מריצים מתיקיית הריפו:
//   node sota/tools/build.mjs
// הפלט: index.html, en/index.html, service/, en/service/, privacy/, accessibility/ (בשתי השפות),
// brand/, 404.html, sitemap.xml, robots.txt, js/config.js.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import site from "../content/site.mjs";
import he from "../content/he.mjs";
import en from "../content/en.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = Date.now().toString(36);
const YEAR = new Date().getFullYear();

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const write = (rel, html) => { const p = join(ROOT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, html); };

// route path per language, relative to the site root
const ROUTES = {
  home: { he: "", en: "en/" },
  service: { he: "service/", en: "en/service/" },
  private: { he: "private/", en: "en/private/" },
  small: { he: "small-business/", en: "en/small-business/" },
  growing: { he: "growing-business/", en: "en/growing-business/" },
  privacy: { he: "privacy/", en: "en/privacy/" },
  accessibility: { he: "accessibility/", en: "en/accessibility/" },
};
const depth = (route) => route.split("/").filter(Boolean).length;
const up = (route) => "../".repeat(depth(route)) || "./";
const abs = (route) => `${site.siteUrl}/${route}`;
const rel = (from, to) => (up(from) + to) || "./";

const waHref = (text) => (site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : "");
const telHref = () => (site.phone ? `tel:${site.phone.replace(/[^\d+]/g, "")}` : "");

const ICON = {
  wa: `<svg class="wa-ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.34.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.24 3.74 1.58.68 2.2.74 2.99.62.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z"/></svg>`,
  ticket: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z"/><path d="M9 5v14" stroke-dasharray="2 3"/></svg>`,
  branch: `<svg class="branch" viewBox="0 0 44 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 14h16l8-8h16"/><circle cx="40" cy="6" r="3.5" fill="currentColor" stroke="none"/></svg>`,
};

// the SOTA wordmark as filled outlines (same geometry as assets/brand)
const WORDMARK = `<svg class="wordmark" viewBox="18 20 278 60"><g fill="currentColor" fill-rule="evenodd"><path d="M70 20H34A18 18 0 0 0 34 56H54A6 6 0 0 1 54 68H18V80H54A18 18 0 0 0 54 44H34A6 6 0 0 1 34 32H70Z"/><path d="M89 50A30 30 0 1 0 149 50A30 30 0 1 0 89 50ZM101 50A18 18 0 1 1 137 50A18 18 0 1 1 101 50Z"/><path d="M162 20H226V32H200V80H188V32H162Z"/><path d="M236 80V50A30 30 0 0 1 296 50V80H284V64H248V80ZM248 52H284V50A18 18 0 0 0 248 50Z"/></g><circle class="wm-dot" cx="119" cy="50" r="7"/></svg>`;

function head(t, { route, pageKey, title, description, noindex = false, extra = "" }) {
  const p = up(route);
  const alt = ROUTES[pageKey];
  const hreflang = alt
    ? `<link rel="alternate" hreflang="he" href="${abs(alt.he)}">
<link rel="alternate" hreflang="en" href="${abs(alt.en)}">
<link rel="alternate" hreflang="x-default" href="${abs(alt.he)}">`
    : "";
  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${abs(route)}">\n${hreflang}`}
<meta name="theme-color" content="#131517">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SOTA">
<meta property="og:locale" content="${t.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(route)}">
<meta property="og:image" content="${site.siteUrl}/assets/og-${t.lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${p}assets/mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${p}assets/apple-touch-icon.png">
<link rel="preload" href="${p}fonts/${t.lang === "he" ? "karantina-700-hebrew" : "archivo-500-800-latin"}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${p}css/fonts.css?v=${VERSION}">
<link rel="stylesheet" href="${p}css/sota.css?v=${VERSION}">
${extra}
</head>`;
}

function header(t, route, { onHome }) {
  const p = up(route);
  const other = t.lang === "he" ? "en" : "he";
  const pageKey = Object.keys(ROUTES).find((k) => ROUTES[k][t.lang] === route) || "home";
  const homeHref = rel(route, ROUTES.home[t.lang]);
  const navHref = (id) => (onHome ? `#${id}` : `${homeHref}#${id}`);
  const consultHref = navHref("consult");
  const navLinks = t.nav.map((n) => n.page
    ? `<a href="${rel(route, ROUTES[n.page][t.lang])}"${ROUTES[n.page][t.lang] === route ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`
    : `<a href="${navHref(n.id)}" data-nav="${n.id}">${esc(n.label)}</a>`).join("");
  return `<a class="skip" href="#main">${esc(t.ui.skip)}</a>
<header class="site-header" data-header>
  <div class="wrap">
    <a class="brand" href="${homeHref}" aria-label="${esc(t.ui.home)}"><img src="${p}assets/logo-dark.svg" alt="SOTA" width="300" height="88"></a>
    <nav class="nav" aria-label="${t.lang === "he" ? "ניווט ראשי" : "Main"}">${navLinks}</nav>
    <div class="header-actions">
      <a class="lang-switch" href="${rel(route, ROUTES[pageKey][other])}" hreflang="${other}" lang="${other}" aria-label="${esc(t.ui.langName)}" data-track="language_switch" data-track-to="${other}">${esc(t.ui.langLabel)}</a>
      <a class="ticket-link" href="${rel(route, ROUTES.service[t.lang])}" data-track="ticket_link">${ICON.ticket}<span class="t-label">${esc(t.ui.ticket)}</span><span class="sr-only t-sr">${esc(t.ui.ticket)}</span></a>
      <a class="btn btn-small" href="${consultHref}" data-booking data-track="cta_click" data-track-loc="header"><span class="dot" aria-hidden="true"></span>${esc(t.ui.headerCta)}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="${esc(t.ui.menu)}" data-label-open="${esc(t.ui.menu)}" data-label-close="${esc(t.ui.closeMenu)}"><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu" aria-hidden="true">
  <nav aria-label="${t.lang === "he" ? "ניווט נייד" : "Mobile"}">${navLinks}<a href="${rel(route, ROUTES.service[t.lang])}">${esc(t.footer.ticket)}</a></nav>
  <div class="mm-actions">
    <a class="btn" href="${consultHref}" data-booking data-track="cta_click" data-track-loc="menu"><span class="dot" aria-hidden="true"></span>${esc(t.hero.primary)}</a>
    <a class="btn btn-ghost btn-wa" href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-loc="menu">${ICON.wa}${esc(t.ui.whatsapp)}</a>
    <a class="btn btn-ghost" href="${rel(route, ROUTES[pageKey][other])}" hreflang="${other}" lang="${other}" data-track="language_switch" data-track-to="${other}">${esc(t.footer.other)}</a>
  </div>
</div>`;
}

function footer(t, route, { onHome }) {
  const p = up(route);
  const homeHref = rel(route, ROUTES.home[t.lang]);
  const navHref = (id) => (onHome ? `#${id}` : `${homeHref}#${id}`);
  const other = t.lang === "he" ? "en" : "he";
  const pageKey = Object.keys(ROUTES).find((k) => ROUTES[k][t.lang] === route) || "home";
  const contactItems = [
    `<li data-contact-wrap="phone"${site.phone ? "" : " hidden"}><a href="${telHref()}" data-contact="phone" data-track="phone_click"><span class="ltr">${esc(site.phone)}</span></a></li>`,
    `<li data-contact-wrap="whatsapp"${site.whatsapp ? "" : " hidden"}><a href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-loc="footer">${esc(t.ui.whatsapp)}</a></li>`,
    `<li data-contact-wrap="email"${site.email ? "" : " hidden"}><a href="mailto:${esc(site.email)}" data-contact="email" data-track="email_click"><span class="ltr">${esc(site.email)}</span></a></li>`,
    `<li data-contact-wrap="linkedin"${site.linkedin ? "" : " hidden"}><a href="${esc(site.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>`,
    `<li data-contact-wrap="facebook"${site.facebook ? "" : " hidden"}><a href="${esc(site.facebook)}" target="_blank" rel="noopener">Facebook</a></li>`,
  ].join("");
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand"><img src="${p}assets/logo-dark.svg" alt="SOTA" width="300" height="88" loading="lazy"><p>${esc(t.footer.about)}</p></div>
      <div><h3>${esc(t.footer.navTitle)}</h3><ul>${t.nav.map((n) => `<li><a href="${n.page ? rel(route, ROUTES[n.page][t.lang]) : navHref(n.id)}">${esc(n.label)}</a></li>`).join("")}</ul></div>
      <div><h3>${esc(t.footer.clientsTitle)}</h3><ul>
        <li><a href="${navHref("consult")}">${esc(t.footer.consult)}</a></li>
        <li><a href="${rel(route, ROUTES.service[t.lang])}">${esc(t.footer.ticket)}</a></li>
      </ul></div>
      <div><h3>${esc(t.footer.contactTitle)}</h3><ul>${contactItems}<li><a href="${navHref("consult")}">${esc(t.footer.form)}</a></li></ul></div>
    </div>
    <div class="footer-bottom">
      <span>© ${YEAR} SOTA. ${esc(t.footer.rights)}</span>
      <span style="display:flex;flex-wrap:wrap;gap:20px">
        <a class="link-u" href="${rel(route, ROUTES.privacy[t.lang])}">${esc(t.footer.privacy)}</a>
        <a class="link-u" href="${rel(route, ROUTES.accessibility[t.lang])}">${esc(t.footer.accessibility)}</a>
        <a class="link-u" href="${rel(route, ROUTES[pageKey][other])}" hreflang="${other}" lang="${other}" data-track="language_switch" data-track-to="${other}">${esc(t.footer.other)}</a>
      </span>
    </div>
  </div>
  <div class="footer-mark wrap" aria-hidden="true">${WORDMARK}</div>
</footer>
${onHome ? `<div class="sticky-cta" data-sticky-cta hidden><a class="btn" href="#consult" data-track="cta_click" data-track-loc="sticky"><span class="dot" aria-hidden="true"></span>${esc(t.ui.stickyCta)}</a><a class="sticky-wa" href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" aria-label="${esc(t.ui.whatsappFloat)}" data-track="whatsapp_click" data-track-loc="sticky"${site.whatsapp ? "" : " hidden"}>${ICON.wa}</a></div>` : ""}
<a class="wa-float" href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" aria-label="${esc(t.ui.whatsappFloat)}" data-track="whatsapp_click" data-track-loc="float"${site.whatsapp ? "" : " hidden"}>${ICON.wa}</a>`;
}

function scripts(t, route, page) {
  const p = up(route);
  const i18n = { lang: t.lang, errors: t.errors, ui: t.ui, lead: t.consult.form, ticket: t.service.form, ...(page === "home" ? { check: t.check } : {}) };
  return `<script type="application/json" id="i18n">${JSON.stringify(i18n).replace(/</g, "\\u003c")}</script>
<script src="${p}js/config.js?v=${VERSION}"></script>
<script src="${p}js/track.js?v=${VERSION}" defer></script>
<script src="${p}vendor/gsap.min.js" defer></script>
<script src="${p}vendor/ScrollTrigger.min.js" defer></script>
<script src="${p}vendor/lenis.min.js" defer></script>
<script src="${p}js/main.js?v=${VERSION}" defer></script>
${page === "home" || page === "service" || page === "audience" ? `<script src="${p}js/forms.js?v=${VERSION}" defer></script>` : ""}
${page === "home" ? `<script src="${p}js/check.js?v=${VERSION}" defer></script>` : ""}`;
}

function jsonLd(t, route) {
  const org = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${site.siteUrl}/#org`,
    name: "SOTA",
    url: abs(route),
    logo: `${site.siteUrl}/assets/logo-light.svg`,
    image: `${site.siteUrl}/assets/og-${t.lang}.png`,
    description: t.meta.home.description,
    areaServed: { "@type": "Country", name: "Israel" },
    availableLanguage: ["he", "en"],
    knowsAbout: t.services.items.map((s) => s.t),
    slogan: t.why.quote,
  };
  if (site.phone) org.telephone = site.phone;
  if (site.email) org.email = site.email;
  const sameAs = [site.linkedin, site.facebook].filter(Boolean);
  if (sameAs.length) org.sameAs = sameAs;
  if (site.founded) org.foundingDate = String(site.founded);
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, "") } })),
  };
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: "SOTA", url: `${site.siteUrl}/`, inLanguage: t.lang, publisher: { "@id": `${site.siteUrl}/#org` } };
  return [org, faq, website].map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
}

// a transit-style route with stations, for the "who we help" tracks
function trackSvg(n) {
  const yAt = (x) => (x <= 130 ? 30 : x >= 150 ? 10 : 30 - (x - 130));
  const xs = Array.from({ length: n }, (_, i) => Math.round(14 + (i * (286 - 14)) / (n - 1)));
  const circles = xs.map((x, i) => `<circle cx="${x}" cy="${yAt(x)}" r="${i === n - 1 ? 7 : 5.5}"${i === n - 1 ? ' class="end"' : ""}/>`).join("");
  return `<svg viewBox="0 0 300 40" aria-hidden="true"><path class="rail" d="M14 30H130L150 10H286"/><path class="live" d="M14 30H130L150 10H286" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-draw/>${circles}</svg>`;
}

function finalLines() {
  // side routes merge into two trunks that end at one station above the headline
  const paths = [
    "M0 80H586",
    "M1200 80H614",
    "M0 330H120L250 200V120L290 80H586",
    "M1200 330H1080L950 200V120L910 80H614",
    "M140 600V420L250 310V200",
    "M1060 600V420L950 310V200",
  ];
  return `<svg class="final-lines" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
${paths.map((d, i) => `<path d="${d}"/><path class="live" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-final="${i}"/>`).join("\n")}
<circle class="stn" cx="600" cy="80" r="14"/><circle class="stn-dot" cx="600" cy="80" r="5"/>
</svg>`;
}

function consultSection(t, route, preset = "") {
  const f = t.consult.form;
  const privacy = rel(route, ROUTES.privacy[t.lang]);
  const types = f.types.map((o) => `<label><input type="radio" name="clientType" value="${o.v}" id="lead-type-${o.v}"${o.v === preset ? " checked" : ""}><span>${esc(o.l)}</span></label>`).join("");
  return `<section class="section" id="consult" aria-labelledby="consult-title">
  <div class="wrap consult">
    <div class="consult-copy">
      <span class="label is-signal"><span class="node" aria-hidden="true"></span>${esc(t.consult.label)}</span>
      <h2 id="consult-title" class="display h-l">${esc(t.consult.title)}</h2>
      <p class="lede">${esc(t.consult.text)}</p>
      <ul class="assure">${t.consult.assure.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
      <div class="alt-contact" data-alt-contact${site.whatsapp || site.phone ? "" : " hidden"}>
        <span class="small muted">${esc(t.consult.altLabel)}</span>
        <a class="btn btn-ghost btn-small btn-wa" href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-loc="consult"${site.whatsapp ? "" : " hidden"}>${ICON.wa}${esc(t.ui.whatsapp)}</a>
        <a class="btn btn-ghost btn-small" href="${telHref()}" data-contact="phone" data-track="phone_click" data-contact-wrap="phone"${site.phone ? "" : " hidden"}><span class="ltr">${esc(site.phone)}</span></a>
      </div>
    </div>
    <div class="form-card">
      <form class="form" data-form="lead" novalidate>
        <div class="row">
          <div class="field"><label for="lead-name">${esc(f.name)}</label><input id="lead-name" name="name" type="text" autocomplete="name" required maxlength="80" aria-describedby="lead-name-err"><span class="err" id="lead-name-err" aria-live="polite"></span></div>
          <div class="field"><label for="lead-phone">${esc(f.phone)}</label><input id="lead-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20" aria-describedby="lead-phone-err"><span class="err" id="lead-phone-err" aria-live="polite"></span></div>
        </div>
        <div class="field"><label for="lead-email">${esc(f.email)} <span class="opt">${esc(f.optional)}</span></label><input id="lead-email" name="email" type="email" autocomplete="email" maxlength="120" aria-describedby="lead-email-err"><span class="err" id="lead-email-err" aria-live="polite"></span></div>
        <fieldset class="field" aria-describedby="lead-type-err"><legend class="flabel">${esc(f.type)}</legend><div class="seg" role="radiogroup">${types}</div><span class="err" id="lead-type-err" aria-live="polite"></span></fieldset>
        <div class="field"><label for="lead-message">${esc(f.message)}</label><textarea id="lead-message" name="message" required maxlength="2000" placeholder="${esc(f.messagePh)}" aria-describedby="lead-message-err"></textarea><span class="err" id="lead-message-err" aria-live="polite"></span></div>
        <div class="hp" aria-hidden="true"><label for="lead-company">Company</label><input id="lead-company" name="company" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="cf-turnstile" data-turnstile></div>
        <p class="consent">${fill(f.consent, { privacy })}</p>
        <div class="form-foot"><button class="btn" type="submit"><span class="dot" aria-hidden="true"></span><span data-label>${esc(f.submit)}</span></button><p class="form-status" role="status" aria-live="polite"></p></div>
      </form>
      <div class="form-success" data-success hidden tabindex="-1">
        <span class="ok-ring" aria-hidden="true"></span>
        <h3 class="display h-l">${esc(f.successTitle)}</h3>
        <p class="lede" data-success-text></p>
        <a class="btn btn-ghost btn-wa" href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-loc="lead_success"${site.whatsapp ? "" : " hidden"}>${ICON.wa}${esc(f.successWa)}</a>
      </div>
      <div class="next-steps">
        <h3 class="flabel">${esc(t.consult.nextTitle)}</h3>
        <ol>${t.consult.next.map((n, i) => `<li><span class="ns-n" aria-hidden="true">${i + 1}</span><div><b>${esc(n.t)}</b><span>${esc(n.d)}</span></div></li>`).join("")}</ol>
      </div>
    </div>
  </div>
</section>`;
}

function homePage(t) {
  const route = ROUTES.home[t.lang];
  const p = up(route);
  const svcRoute = rel(route, ROUTES.service[t.lang]);
  const privacy = rel(route, ROUTES.privacy[t.lang]);
  const f = t.consult.form;
  const yrs = site.yearsExperience;

  const problemItems = t.problem.items.map((s) => `<li class="problem-item"><span class="x" aria-hidden="true"></span><p>${esc(s)}</p></li>`).join("");
  const steps = t.approach.steps.map((s, i) => `<li class="step" data-step="${i}"><span class="stn" aria-hidden="true"></span><span class="n" aria-hidden="true">0${i + 1}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p><img class="step-vis" src="${p}assets/visuals/step-${i + 1}.webp" alt="" width="480" height="480" loading="lazy" decoding="async"></li>`).join("");
  const svcs = t.services.items.map((s) => `<li class="svc"><h3>${esc(s.t)}</h3>${ICON.branch}<p>${esc(s.d)}</p>${s.q ? `<div class="svc-q"><span class="sr-only">${esc(t.services.qLabel)}</span><ul>${s.q.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></div>` : ""}</li>`).join("");
  const whyCells = t.why.cells.map((c) => `<li class="why-cell"><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></li>`).join("");
  const pathCards = ["private", "small", "growing"].map((k, i) => {
    const tr = t.who.tracks[i];
    return `<li><a class="path-card" href="${rel(route, ROUTES[k][t.lang])}" data-track="path_select" data-track-loc="${k}">${trackSvg(tr.stations)}<h3>${esc(t.audiences[k].label)}</h3><p class="who-size">${esc(tr.size)}</p><p>${esc(tr.d)}</p><span class="go">${esc(t.paths.go)}</span></a></li>`;
  }).join("");
  const faqs = t.faq.items.map((q, i) => `<details${i === 0 ? " open" : ""}><summary><span>${esc(q.q)}</span><span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>${fill(q.a, { service: svcRoute })}</p></div></details>`).join("");

  return `${head(t, { route, pageKey: "home", title: t.meta.home.title, description: t.meta.home.description, extra: jsonLd(t, route) })}
<body data-page="home">
${header(t, route, { onHome: true })}
<main id="main">

<section class="hero" aria-labelledby="hero-title">
  <canvas class="hero-canvas" data-hero-canvas aria-hidden="true"></canvas>
  <div class="years-chip" aria-label="${yrs} ${esc(t.hero.chip)}"><span class="ring" aria-hidden="true"></span><b data-count-to="${yrs}">${yrs}</b><span aria-hidden="true">${esc(t.hero.chip)}</span></div>
  <div class="wrap">
    <h1 id="hero-title" class="display h-hero">${t.hero.lines.map((l) => `<span class="line"><span>${esc(l)}</span></span>`).join("")}</h1>
    <div class="hero-foot">
      <p class="lede" data-hero-fade>${esc(t.hero.sub)}</p>
      <div class="cta-row" data-hero-fade>
        <a class="btn" href="#consult" data-track="cta_click" data-track-loc="hero_primary"><span class="dot" aria-hidden="true"></span>${esc(t.hero.primary)}</a>
        <a class="btn btn-ghost" href="${waHref(t.ui.waText) || "#approach"}" data-wa-or-consult data-wa-text="${esc(t.ui.waText)}" data-track="cta_click" data-track-loc="hero_secondary">${esc(t.hero.secondary)}</a>
      </div>
    </div>
    <a class="scroll-cue" href="#problem" data-hero-fade><i aria-hidden="true"></i>${esc(t.hero.scroll)}</a>
  </div>
</section>

<section class="section paths" id="paths" aria-labelledby="paths-title">
  <div class="wrap">
    <div class="section-head">
      <span class="label is-signal"><span class="node" aria-hidden="true"></span>${esc(t.paths.label)}</span>
      <h2 id="paths-title" class="display h-l">${esc(t.paths.title)}</h2>
      <p class="lede">${esc(t.paths.lede)}</p>
    </div>
    <ul class="path-grid">${pathCards}
      <li class="path-clients"><a href="${svcRoute}" data-track="cta_click" data-track-loc="paths_clients">${ICON.ticket}<span><b>${esc(t.paths.clientsT)}</b><span>${esc(t.paths.clientsD)}</span></span><span class="go">${esc(t.paths.clientsGo)}</span></a></li>
    </ul>
  </div>
</section>

<section class="section" id="problem" aria-labelledby="problem-title">
  <div class="wrap">
    <div class="section-head">
      <span class="label"><span class="node" aria-hidden="true"></span>${esc(t.problem.label)}</span>
      <h2 id="problem-title" class="display h-xl" data-split>${esc(t.problem.title)}</h2>
      <p class="lede">${esc(t.problem.lede)}</p>
    </div>
    <div class="problem">
      <div>
        <ul class="problem-list" data-problem-list>${problemItems}</ul>
        <p class="problem-close">${t.problem.close}</p>
      </div>
      <figure class="problem-visual"><canvas data-tangle aria-hidden="true"></canvas><figcaption class="small muted">${esc(t.problem.caption)}</figcaption></figure>
    </div>
  </div>
</section>

<section class="section approach" id="approach" aria-labelledby="approach-title">
  <div class="route-stage" data-route-stage>
    <div class="wrap">
      <div class="section-head">
        <span class="label is-signal"><span class="node" aria-hidden="true"></span>${esc(t.approach.label)}</span>
        <h2 id="approach-title" class="display h-xl">${esc(t.approach.title)}</h2>
        <p class="lede">${esc(t.approach.lede)}</p>
      </div>
      <div class="steps-wrap" data-steps><span class="rail" aria-hidden="true"></span><span class="rail-live" aria-hidden="true"></span><ol class="steps">${steps}</ol></div>
    </div>
  </div>
</section>

<section class="section" id="services" aria-labelledby="services-title">
  <div class="wrap services">
    <div class="section-head">
      <span class="label"><span class="node" aria-hidden="true"></span>${esc(t.services.label)}</span>
      <h2 id="services-title" class="display h-l">${esc(t.services.title)}</h2>
      <p class="lede">${esc(t.services.lede)}</p>
    </div>
    <div>
      <ul class="svc-list">${svcs}</ul>
      <p class="svc-note">${esc(t.services.note)} <a class="link-u" href="#consult">${esc(t.footer.consult)}</a></p>
    </div>
  </div>
</section>

<section class="section why" id="why" aria-labelledby="why-title" data-why>
  <div class="wrap">
    <span class="label"><span class="node" aria-hidden="true"></span>${esc(t.why.label)}</span>
    <div class="why-top">
      <div><div class="big-num" aria-hidden="true"><span data-count-to="${yrs}">${yrs}</span><span class="sig"></span></div><p class="why-unit">${esc(t.why.unit)}</p></div>
      <h2 id="why-title" class="display h-l">${esc(t.why.title)}</h2>
    </div>
    <ul class="why-grid">${whyCells}</ul>
    <figure class="why-visual" aria-hidden="true"><video data-ambient muted loop playsinline preload="none" poster="${p}assets/visuals/years.webp"><source src="${p}assets/visuals/years.mp4" type="video/mp4"></video></figure>
    <p class="why-quote display h-l">${esc(t.why.quote)}</p>
  </div>
</section>

<section class="section check-sec" id="check" aria-labelledby="check-title">
  <div class="wrap">
    <div class="check" data-check>
      <div class="check-intro">
        <span class="label is-signal"><span class="node" aria-hidden="true"></span>${esc(t.check.label)}</span>
        <h2 id="check-title" class="display h-l">${esc(t.check.title)}</h2>
        <p class="lede">${esc(t.check.lede)}</p>
        <noscript><p class="small muted">JavaScript is required for the quick check.</p></noscript>
      </div>
      <div class="check-panel" data-check-panel>
        <div class="check-route" aria-hidden="true"><span class="cr-rail"></span><span class="cr-live" data-check-live></span>${t.check.questions.map((_, i) => `<span class="cr-stn" data-check-stn="${i}" style="--i:${i}"></span>`).join("")}<span class="cr-stn cr-end" style="--i:${t.check.questions.length}"></span></div>
        <div class="check-body" data-check-body aria-live="polite">
          <p class="check-q">${esc(t.check.questions[0].q)}</p>
        </div>
      </div>
    </div>
  </div>
</section>

${consultSection(t, route)}

<section class="section" id="testimonials" aria-labelledby="testimonials-title" data-testimonials hidden>
  <div class="wrap">
    <div class="section-head">
      <span class="label"><span class="node" aria-hidden="true"></span>${esc(t.testimonials.label)}</span>
      <h2 id="testimonials-title" class="display h-l">${esc(t.testimonials.title)}</h2>
    </div>
    <div class="quotes" data-quotes></div>
  </div>
</section>

<section class="section" id="faq" aria-labelledby="faq-title">
  <div class="wrap faq-wrap">
    <div class="section-head">
      <span class="label"><span class="node" aria-hidden="true"></span>${esc(t.faq.label)}</span>
      <h2 id="faq-title" class="display h-l">${esc(t.faq.title)}</h2>
    </div>
    <div class="faq">${faqs}</div>
  </div>
</section>

<section class="final has-visual" aria-labelledby="final-title" data-final-section>
  <div class="final-visual" aria-hidden="true"><video data-ambient muted loop playsinline preload="none" poster="${p}assets/visuals/tangle.webp"><source src="${p}assets/visuals/tangle.mp4" type="video/mp4"></video></div>
  ${finalLines()}
  <div class="wrap">
    <h2 id="final-title" class="display h-xl">${esc(t.final.title)}</h2>
    <p class="lede">${esc(t.final.text)}</p>
    <div class="cta-row">
      <a class="btn" href="#consult" data-booking data-track="cta_click" data-track-loc="final_primary"><span class="dot" aria-hidden="true"></span>${esc(t.final.primary)}</a>
      <a class="btn btn-ghost btn-wa" href="${waHref(t.ui.waText)}" data-wa data-wa-text="${esc(t.ui.waText)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-loc="final"${site.whatsapp ? "" : " hidden"}>${ICON.wa}${esc(t.final.secondary)}</a>
    </div>
  </div>
</section>
</main>
${footer(t, route, { onHome: true })}
${scripts(t, route, "home")}
</body>
</html>
`;
}

function audiencePage(t, key) {
  const route = ROUTES[key][t.lang];
  const a = t.audiences[key];
  const svcRoute = rel(route, ROUTES.service[t.lang]);
  const homeHref = rel(route, ROUTES.home[t.lang]);
  const others = ["private", "small", "growing"].filter((k) => k !== key);
  const steps = t.approach.steps.map((s, i) => `<li><img class="aud-step-vis" src="${up(route)}assets/visuals/step-${i + 1}.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><span class="n" aria-hidden="true">0${i + 1}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join("");
  const faqs = a.faq.map((q, i) => `<details${i === 0 ? " open" : ""}><summary><span>${esc(q.q)}</span><span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>${fill(q.a, { service: svcRoute })}</p></div></details>`).join("");
  const preset = key === "private" ? "private" : key === "small" ? "small" : "medium";
  const stations = { private: 2, small: 4, growing: 6 }[key];
  return `${head(t, { route, pageKey: key, title: a.meta.title, description: a.meta.description })}
<body data-page="audience" data-audience="${key}">
${header(t, route, { onHome: false })}
<main id="main">
  <section class="page-hero aud-hero">
    <div class="wrap aud-hero-grid">
      <div class="aud-hero-text">
      <div class="aud-crumbs small"><a class="link-u" href="${homeHref}">SOTA</a> <span aria-hidden="true">/</span> <span>${esc(a.label)}</span></div>
      <span class="label is-signal"><span class="node" aria-hidden="true"></span>${esc(a.label)} · ${esc(a.size)}</span>
      <h1 class="display h-xl">${esc(a.title)}</h1>
      <p class="lede">${esc(a.lede)}</p>
      <div class="cta-row">
        <a class="btn" href="#consult" data-track="cta_click" data-track-loc="audience_hero"><span class="dot" aria-hidden="true"></span>${esc(t.hero.primary)}</a>
        <a class="btn btn-ghost" href="#help">${esc(t.audience.ctaSecondary)}</a>
      </div>
      <div class="aud-track" aria-hidden="true">${trackSvg(stations)}</div>
      </div>
      <figure class="aud-visual" aria-hidden="true"><video data-ambient muted loop playsinline preload="none" poster="${up(route)}assets/visuals/${key}.webp"><source src="${up(route)}assets/visuals/${key}.mp4" type="video/mp4"></video></figure>
    </div>
  </section>

  <section class="section aud-sec" aria-labelledby="pains-title">
    <div class="wrap aud-split">
      <h2 id="pains-title" class="display h-l">${esc(a.painsTitle)}</h2>
      <ul class="aud-pains">${a.pains.map((x) => `<li><span class="x" aria-hidden="true"></span><p>${esc(x)}</p></li>`).join("")}</ul>
    </div>
  </section>

  <section class="section aud-sec" id="help" aria-labelledby="help-title">
    <div class="wrap">
      <h2 id="help-title" class="display h-l aud-h">${esc(a.helpTitle)}</h2>
      <ul class="aud-help">${a.help.map((h) => `<li>${ICON.branch}<h3>${esc(h.t)}</h3><p>${esc(h.d)}</p></li>`).join("")}</ul>
      <div class="aud-q">
        <h3 class="flabel">${esc(a.qTitle)}</h3>
        <div class="svc-q"><ul>${a.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></div>
      </div>
    </div>
  </section>

  <section class="section aud-sec" aria-labelledby="steps-title">
    <div class="wrap">
      <h2 id="steps-title" class="display h-l aud-h">${esc(t.audience.stepsTitle)}</h2>
      <ol class="aud-steps">${steps}</ol>
    </div>
  </section>

  ${consultSection(t, route, preset)}

  <section class="section aud-sec" id="faq" aria-labelledby="faq-title">
    <div class="wrap faq-wrap">
      <div class="section-head"><h2 id="faq-title" class="display h-l">${esc(t.audience.faqTitle)}</h2></div>
      <div class="faq">${faqs}</div>
    </div>
  </section>

  <section class="section aud-sec aud-others" aria-labelledby="others-title">
    <div class="wrap">
      <h2 id="others-title" class="h-m">${esc(t.audience.other)}</h2>
      <ul class="others">${others.map((k) => `<li><a class="path-card mini" href="${rel(route, ROUTES[k][t.lang])}"><h3>${esc(t.audiences[k].label)}</h3><p class="who-size">${esc(t.audiences[k].size)}</p><span class="go">${esc(t.paths.go)}</span></a></li>`).join("")}
        <li><a class="path-card mini" href="${svcRoute}"><h3>${esc(t.paths.clientsT)}</h3><p class="who-size">${esc(t.paths.clientsGo)}</p><span class="go">${esc(t.paths.clientsGo)}</span></a></li></ul>
    </div>
  </section>
</main>
${footer(t, route, { onHome: false })}
${scripts(t, route, "audience")}
</body>
</html>
`;
}

function servicePage(t) {
  const route = ROUTES.service[t.lang];
  const s = t.service, f = s.form;
  const privacy = rel(route, ROUTES.privacy[t.lang]);
  const consult = `${rel(route, ROUTES.home[t.lang])}#consult`;
  const cats = f.categories.map((c) => `<option value="${c.v}">${esc(c.l)}</option>`).join("");
  const urg = f.urgencies.map((u) => `<label title="${esc(u.h)}"><input type="radio" name="urgency" value="${u.v}" id="tk-urg-${u.v}"${u.v === "normal" ? " checked" : ""}><span data-level="${u.v}">${esc(u.l)}${u.h ? `<span class="sr-only">: ${esc(u.h)}</span>` : ""}</span></label>`).join("");
  return `${head(t, { route, pageKey: "service", title: t.meta.service.title, description: t.meta.service.description })}
<body data-page="service">
${header(t, route, { onHome: false })}
<main id="main">
  <section class="page-hero aud-hero">
    <div class="wrap aud-hero-grid">
      <div class="aud-hero-text">
      <span class="label is-signal"><span class="node" aria-hidden="true"></span>${esc(s.label)}</span>
      <h1 class="display h-xl">${esc(s.title)}</h1>
      <p class="lede">${esc(s.lede)}</p>
      </div>
      <figure class="aud-visual svc-visual" aria-hidden="true"><video data-ambient muted loop playsinline preload="none" poster="${up(route)}assets/visuals/service.webp"><source src="${up(route)}assets/visuals/service.mp4" type="video/mp4"></video></figure>
    </div>
  </section>
  <div class="wrap service-layout">
    <aside class="service-aside">
      <div class="box"><h2 class="h-s">${esc(s.urgentTitle)}</h2><p class="muted">${esc(s.urgentText)}</p><p class="muted" data-contact-wrap="phone"${site.phone ? "" : " hidden"}>${esc(s.urgentCall)} <a href="${telHref()}" data-contact="phone" data-track="phone_click"><span class="ltr">${esc(site.phone)}</span></a></p></div>
      <div class="box"><h2 class="h-s">${esc(s.tipsTitle)}</h2><ul class="assure small">${s.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="box"><h2 class="h-s">${esc(s.notClientTitle)}</h2><p class="muted">${fill(s.notClientText, { consult })}</p></div>
    </aside>
    <div class="form-card">
      <form class="form" data-form="ticket" novalidate enctype="multipart/form-data">
        <div class="row">
          <div class="field"><label for="tk-name">${esc(f.name)}</label><input id="tk-name" name="name" type="text" autocomplete="name" required maxlength="80" aria-describedby="tk-name-err"><span class="err" id="tk-name-err" aria-live="polite"></span></div>
          <div class="field"><label for="tk-business">${esc(f.business)} <span class="opt">${esc(f.optional)}</span></label><input id="tk-business" name="business" type="text" autocomplete="organization" maxlength="120"></div>
        </div>
        <div class="row">
          <div class="field"><label for="tk-phone">${esc(f.phone)}</label><input id="tk-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20" aria-describedby="tk-phone-err"><span class="err" id="tk-phone-err" aria-live="polite"></span></div>
          <div class="field"><label for="tk-email">${esc(f.email)} <span class="opt">${esc(f.optional)}</span></label><input id="tk-email" name="email" type="email" autocomplete="email" maxlength="120" aria-describedby="tk-email-hint tk-email-err"><span class="small muted" id="tk-email-hint">${esc(f.emailHint)}</span><span class="err" id="tk-email-err" aria-live="polite"></span></div>
        </div>
        <div class="field"><label for="tk-category">${esc(f.category)}</label><select id="tk-category" name="category" required aria-describedby="tk-category-err"><option value="">${esc(f.categoryPh)}</option>${cats}</select><span class="err" id="tk-category-err" aria-live="polite"></span></div>
        <fieldset class="field"><legend class="flabel">${esc(f.urgency)}</legend><div class="seg urgency">${urg}</div></fieldset>
        <div class="field"><label for="tk-description">${esc(f.description)}</label><textarea id="tk-description" name="description" required maxlength="4000" placeholder="${esc(f.descriptionPh)}" aria-describedby="tk-description-err"></textarea><span class="err" id="tk-description-err" aria-live="polite"></span></div>
        <div class="field">
          <span class="flabel" id="tk-file-label">${esc(f.file)} <span class="opt">${esc(f.optional)}</span></span>
          <label class="file-drop" data-file-drop>
            <input id="tk-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/heic,application/pdf,text/plain,.log,.txt" aria-labelledby="tk-file-label" aria-describedby="tk-file-hint tk-file-err">
            <span><b>${esc(f.fileCta)}</b> <span class="muted">${esc(f.fileOr)}</span></span>
            <span class="small muted" id="tk-file-hint">${esc(f.fileHint)}</span>
            <span class="file-name" data-file-name></span>
          </label>
          <button class="btn btn-ghost btn-small" type="button" data-file-remove hidden>${esc(f.fileRemove)}</button>
          <span class="err" id="tk-file-err" aria-live="polite"></span>
        </div>
        <div class="hp" aria-hidden="true"><label for="tk-company">Company website</label><input id="tk-company" name="company" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="cf-turnstile" data-turnstile></div>
        <p class="consent">${fill(f.consent, { privacy })}</p>
        <div class="form-foot"><button class="btn" type="submit"><span class="dot" aria-hidden="true"></span><span data-label>${esc(f.submit)}</span></button><p class="form-status" role="status" aria-live="polite"></p></div>
      </form>
      <div class="form-success" data-success hidden tabindex="-1">
        <span class="ok-ring" aria-hidden="true"></span>
        <h2 class="display h-l">${esc(f.successTitle)}</h2>
        <p class="small muted">${esc(f.successNo)}</p>
        <p class="ticket-no" data-ticket-no></p>
        <p class="lede">${esc(f.successText)} <span data-success-email hidden>${esc(f.successEmail)}</span></p>
        <div class="cta-row"><button class="btn btn-ghost btn-small" type="button" data-copy-ticket>${esc(f.copyNo)}</button><button class="btn btn-ghost btn-small" type="button" data-another>${esc(f.another)}</button></div>
      </div>
    </div>
  </div>
</main>
${footer(t, route, { onHome: false })}
${scripts(t, route, "service")}
</body>
</html>
`;
}

function legalPage(t, key, bodyHtml) {
  const route = ROUTES[key][t.lang];
  const m = t.meta[key];
  return `${head(t, { route, pageKey: key, title: m.title, description: m.description })}
<body data-page="${key}">
${header(t, route, { onHome: false })}
<main id="main">
  <section class="page-hero"><div class="wrap"><h1 class="display h-xl">${esc(m.title.split(" | ")[0])}</h1></div></section>
  <div class="wrap"><article class="prose">${bodyHtml}</article></div>
</main>
${footer(t, route, { onHome: false })}
${scripts(t, route, key)}
</body>
</html>
`;
}

const LEGAL = JSON.parse(readFileSync(join(ROOT, "content/legal.json"), "utf8"));
const contactLine = (lang) => {
  const parts = [];
  if (site.email) parts.push(`<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`);
  if (site.phone) parts.push(`<span class="ltr">${esc(site.phone)}</span>`);
  return parts.length ? parts.join(" · ") : `<span class="todo">${lang === "he" ? "TODO: אימייל וטלפון לפניות" : "TODO: contact email and phone"}</span>`;
};
const legalHtml = (lang, key) => fill(LEGAL[lang][key], { contact: contactLine(lang), updated: LEGAL.updated, consult: `${rel(ROUTES[key][lang], ROUTES.home[lang])}#consult` });

for (const t of [he, en]) {
  write(`${ROUTES.home[t.lang]}index.html`, homePage(t));
  write(`${ROUTES.service[t.lang]}index.html`, servicePage(t));
  for (const k of ["private", "small", "growing"]) write(`${ROUTES[k][t.lang]}index.html`, audiencePage(t, k));
  write(`${ROUTES.privacy[t.lang]}index.html`, legalPage(t, "privacy", legalHtml(t.lang, "privacy")));
  write(`${ROUTES.accessibility[t.lang]}index.html`, legalPage(t, "accessibility", legalHtml(t.lang, "accessibility")));
}

// 404 (served from the site root by the Worker)
write("404.html", `${head(he, { route: "", pageKey: null, title: "העמוד לא נמצא | SOTA", description: "העמוד שחיפשת לא נמצא.", noindex: true }).replace(/href="\.\/(css|fonts|assets)/g, 'href="/$1')}
<body data-page="404">
<main id="main" class="page-hero" style="min-height:100svh;display:grid;align-content:center">
  <div class="wrap" style="display:grid;gap:24px">
    <img src="/assets/logo-dark.svg" alt="SOTA" width="160" height="47" style="width:160px">
    <h1 class="display h-xl">המסלול הזה לא מוביל לשום מקום.</h1>
    <p class="lede">העמוד שחיפשת לא קיים או שהכתובת השתנתה. <span lang="en">This page doesn't exist.</span></p>
    <div class="cta-row"><a class="btn" href="/"><span class="dot" aria-hidden="true"></span>לדף הבית</a><a class="btn btn-ghost" href="/en/" lang="en">English home</a></div>
  </div>
</main>
</body>
</html>
`);

// runtime config
write("js/config.js", `/* נוצר אוטומטית מ-content/site.mjs על ידי tools/build.mjs. לא לערוך ידנית. */
window.SOTA_CONFIG = ${JSON.stringify({
  apiBase: site.apiBase, phone: site.phone, whatsapp: site.whatsapp, email: site.email, bookingUrl: site.bookingUrl,
  gtmId: site.gtmId, ga4Id: site.ga4Id, turnstileSiteKey: site.turnstileSiteKey,
}, null, 2)};
`);

// sitemap + robots
const urls = ["home", "private", "small", "growing", "service", "privacy", "accessibility"].flatMap((k) => ["he", "en"].map((l) => ({ k, l })));
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(({ k, l }) => `  <url>
    <loc>${abs(ROUTES[k][l])}</loc>
    <xhtml:link rel="alternate" hreflang="he" href="${abs(ROUTES[k].he)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(ROUTES[k].en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(ROUTES[k].he)}"/>
    <changefreq>${k === "home" ? "monthly" : "yearly"}</changefreq>
    <priority>${k === "home" ? "1.0" : ["private", "small", "growing"].includes(k) ? "0.9" : k === "service" ? "0.6" : "0.3"}</priority>
  </url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /brand/

Sitemap: ${site.siteUrl}/sitemap.xml
`);

console.log(`built SOTA (${VERSION}) for ${site.siteUrl}`);
