"""Builds the MIFTAH Projects website into ../public: English at the root, Hebrew under /he/.
Run: python3 src/build.py   (then python3 src/tools/images.py only if media-src changed)
Content lives in content.py; styles and scripts in assets/; config below."""
import datetime
import html
import json
import math
import re
import shutil
import sys
from pathlib import Path

import content as C
from tools import worldmap

SRC = Path(__file__).resolve().parent
PUB = SRC.parent / "public"
sys.path.insert(0, str(SRC.parents[1] / "tools"))
import build as brand  # noqa: E402  (the brand book generator: measured SVG of the original logo)

# ---------------------------------------------------------------- config
DOMAIN = "https://www.miftah.co.il"
FORM_ENDPOINT = ""          # set to a real POST endpoint (JSON) to send enquiries. Empty = honest "not connected" state.
ANALYTICS = ""              # e.g. '<script defer data-domain="miftah.co.il" src="https://plausible.io/js/script.js"></script>'
ASSET_VER = datetime.date.today().strftime("%Y%m%d")
YEAR = datetime.date.today().year
LANGS = ("en", "he")
PAGES = ["index", "net-houses", "turnkey-farms", "projects", "about", "contact", "profile", "privacy", "accessibility"]


def esc(s):
    return html.escape(str(s), quote=True)


RANGE = re.compile(r"\d[\d,.]*%?\s?[–-]\s?\d[\d,.]*%?")


def t(pair, L):
    if L == "en":
        return pair[0]
    # keep number ranges (10%–30%, 3–5, 50–300) in left-to-right order inside Hebrew text
    return RANGE.sub(lambda m: "\u2066" + m.group(0) + "\u2069", pair[1])


def url(slug, L, absolute=False):
    name = "" if slug == "index" else f"{slug}.html"
    path = ("" if L == "en" else "he/") + name
    return f"{DOMAIN}/{path}" if absolute else path


def rel(L):
    return "" if L == "en" else "../"


LOGO = brand.logo_svg("light", "compact")
LOGO_FULL = brand.logo_svg("light", "full")


def logo(L, full=False):
    s = LOGO_FULL if full else LOGO
    return s.replace('aria-label="MIFTAH"', f'aria-label="{esc(t(C.SITE["name"], L))}"')


# ---------------------------------------------------------------- media helpers
def picture(name, alt, L, sizes="100vw", cls="", eager=False, widths=(640, 1024, 1600)):
    have = [w for w in widths if (PUB / f"assets/img/{name}-{w}.jpg").exists()]
    r = rel(L)
    def srcset(ext): return ", ".join(f"{r}assets/img/{name}-{w}.{ext} {w}w" for w in have)
    from PIL import Image
    w0, h0 = Image.open(PUB / f"assets/img/{name}-{have[-1]}.jpg").size
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return (f'<picture><source type="image/avif" srcset="{srcset("avif")}" sizes="{sizes}">'
            f'<source type="image/webp" srcset="{srcset("webp")}" sizes="{sizes}">'
            f'<img src="{r}assets/img/{name}-{have[1] if len(have) > 1 else have[0]}.jpg" srcset="{srcset("jpg")}" sizes="{sizes}" width="{w0}" height="{h0}" alt="{esc(alt)}" {load}{(" class=" + chr(34) + cls + chr(34)) if cls else ""}></picture>')


# ---------------------------------------------------------------- signature drawing
def drawing(L, animate=True):
    D = C.DRAWING
    poles = [150, 390, 630, 870, 1110]
    top, gy = 150, 430
    def sag(x0, x1):
        return f"Q{(x0 + x1) / 2} {top + 14} {x1} {top}"
    net = f"M{poles[0]} {top} " + " ".join(sag(poles[i], poles[i + 1]) for i in range(len(poles) - 1))
    cable = f"M{poles[0]} {top - 6} " + " ".join(f"L{x} {top - 6}" for x in poles[1:])
    parts = []
    parts.append(f'<rect class="dw-soil" x="0" y="{gy}" width="1260" height="80"/>')
    parts.append(f'<path class="dw-ground dw-anim" style="--d:0s" d="M0 {gy} H1260"/>')
    for i, x in enumerate(poles):
        parts.append(f'<path class="dw-pole dw-anim" style="--d:{.15 + i * .1:.2f}s" d="M{x} {gy} V{top}"/>')
        parts.append(f'<path class="dw-pole-hi dw-anim" style="--d:{.2 + i * .1:.2f}s" d="M{x - 2} {gy - 4} V{top + 4}"/>')
    parts.append(f'<path class="dw-cable dw-anim" style="--d:.8s" d="{cable}"/>')
    parts.append(f'<path class="dw-cable dw-anim" style="--d:1s" d="M{poles[0]} {top} L40 {gy}"/><path class="dw-cable dw-anim" style="--d:1s" d="M{poles[-1]} {top} L1220 {gy}"/>')
    parts.append(f'<rect class="dw-fade" style="--d:1.05s" x="28" y="{gy - 10}" width="24" height="12" fill="#B9B6AE"/><rect class="dw-fade" style="--d:1.05s" x="1208" y="{gy - 10}" width="24" height="12" fill="#B9B6AE"/>')
    parts.append(f'<path class="dw-netfill dw-fade" style="--d:1.5s" d="{net} V{gy} H{poles[0]} Z"/>')
    parts.append(f'<path class="dw-net dw-anim" style="--d:1.2s" d="{net}"/>')
    parts.append(f'<path class="dw-net dw-anim" style="--d:1.45s;stroke-width:3;opacity:.7" d="M{poles[-1] + 6} {top} V{gy}"/>')
    # trellis wire and crop
    parts.append(f'<path class="dw-cable dw-anim" style="--d:1.6s;stroke-dasharray:none;opacity:.6" d="M{poles[0]} 300 H{poles[-1]}"/>')
    for i in range(len(poles) - 1):
        cx = (poles[i] + poles[i + 1]) / 2
        parts.append(f'<g class="dw-fade" style="--d:{1.7 + i * .08:.2f}s"><path class="dw-tree-trunk" d="M{cx} {gy} V340"/><ellipse class="dw-tree-crown" cx="{cx}" cy="300" rx="78" ry="56"/></g>')
    parts.append(f'<path class="dw-drip dw-anim" style="--d:2s" d="M{poles[0] + 10} {gy - 3} H{poles[-1] - 10}"/>')
    # folding arrow on the second bay (orchards)
    fx0, fx1 = poles[1] + 30, poles[2] - 30
    parts.append(f'<path class="dw-lead dw-fade" style="--d:2.1s" d="M{fx1} {top - 34} H{fx0}" marker-end="url(#ar)"/>')
    # callouts: (x, y) anchor, label anchor, number
    calls = [
        ((510, top + 9), (470, 70), 1),
        ((760, top - 6), (760, 70), 2),
        ((870, 300), (960, 205), 3),
        ((1200, gy - 30), (1080, 500), 4),
        ((630, 300), (630, 395), 5),
        ((fx0 + 6, top - 34), (250, 70), 6),
    ]
    for (ax, ay), (lx, ly), n in calls:
        name = t(D["items"][n - 1][0], L)
        parts.append(f'<g class="dw-fade" style="--d:{2.2 + n * .07:.2f}s"><path class="dw-lead" d="M{ax} {ay} L{lx} {ly + (8 if ly < ay else -16)}"/><circle class="dw-dot" cx="{ax}" cy="{ay}" r="4"/>'
                     f'<circle cx="{lx}" cy="{ly - 4}" r="13" fill="#fff" stroke="#0E4239"/><text class="dw-tag" x="{lx}" y="{ly}" text-anchor="middle">{n}</text>'
                     f'<text class="dw-label" x="{lx + 20 if L == "en" else lx - 20}" y="{ly}" text-anchor="start">{esc(name)}</text></g>')
    svg = (f'<svg viewBox="0 0 1260 520" role="img" aria-labelledby="dw-t dw-d"><title id="dw-t">{esc(t(D["title"], L))}</title>'
           f'<desc id="dw-d">{esc(" ".join(f"{i + 1}. {t(a, L)}: {t(b, L)}" for i, (a, b) in enumerate(D["items"])))}</desc>'
           '<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0E4239"/></marker></defs>'
           + "".join(parts) + "</svg>")
    legend = "".join(f'<li><span class="k">{i + 1}</span><div><b>{esc(t(a, L))}</b><span>{esc(t(b, L))}</span></div></li>' for i, (a, b) in enumerate(D["items"]))
    fig = (f'<figure class="drawing"{" data-animate" if animate else ""}>{svg}'
           f'<figcaption><span>{esc(t(D["caption"], L))}</span><span class="drawing-mobile-note">{esc(t(D["mobile"], L))}</span></figcaption></figure>')
    return fig, f'<ol class="legend">{legend}</ol>'


# ---------------------------------------------------------------- map
MAP = json.loads((SRC / "data/worldmap.json").read_text())


def map_svg(L, dark=False):
    hx, hy = worldmap.px(C.HQ[1], C.HQ[0])
    parts = [f'<path class="land" d="{MAP["d"]}"/>']
    marks = []
    for key, lat, lon, m2, en, he, side in C.MARKETS:
        x, y = worldmap.px(lon, lat)
        # arc from HQ, lifted toward the north
        mx, my = (x + hx) / 2, min(y, hy) - abs(x - hx) * .18 - 10
        parts.append(f'<path class="arc" d="M{hx:.1f} {hy:.1f} Q{mx:.1f} {my:.1f} {x:.1f} {y:.1f}"/>')
        r = 4 + (math.sqrt(m2 / 150000) * 9 if m2 else 0)
        name = en if L == "en" else he
        val = (f"{m2:,} m²" if L == "en" else f"{m2:,} מ״ר") if m2 else ""
        dx, anchor = {"e": (14, "start"), "w": (-14, "end"), "s": (0, "middle")}[side]
        ly = y + (26 if side == "s" else 4)
        lab = f'<text class="mk-l" x="{x + dx:.1f}" y="{ly:.1f}" text-anchor="{anchor}">{esc(name)}</text>'
        if val:
            lab += f'<text class="mk-v" x="{x + dx:.1f}" y="{ly + 15:.1f}" text-anchor="{anchor}">{esc(val)}</text>'
        marks.append(f'<g><circle class="mk-ring" cx="{x:.1f}" cy="{y:.1f}" r="{r + 5:.1f}"/><circle class="mk" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>{lab}</g>')
    hq = (C.HQ[2] if L == "en" else C.HQ[3])
    marks.append(f'<g><circle class="hq" cx="{hx:.1f}" cy="{hy:.1f}" r="7"/><text class="mk-l" x="{hx + 12:.1f}" y="{hy + 22:.1f}" text-anchor="start">{esc(hq)}</text></g>')
    label = ("Map of MIFTAH projects: Mexico, Honduras, Spain, Portugal, Belarus, Georgia and India, managed from Kfar Masaryk, Israel. The same information is in the table." if L == "en"
             else "מפת הפרויקטים של מיפתח: מקסיקו, הונדורס, ספרד, פורטוגל, בלארוס, גאורגיה והודו, בניהול מכפר מסריק. אותו מידע מופיע בטבלה.")
    return f'<svg class="map" viewBox="0 0 {MAP["w"]} {MAP["h"]}" role="img" aria-label="{esc(label)}">{"".join(parts)}{"".join(marks)}</svg>'


def projects_table(L, dark=False):
    P = C.PAGES["projects"]
    rows = "".join(f'<tr><th scope="row">{esc(en if L == "en" else he)}</th><td>{esc(t(w, L))}</td><td class="n">{f"{a:,}" if a else "–"}</td></tr>' for en, he, w, a in C.PROJECT_ROWS)
    total = sum(a for *_, a in C.PROJECT_ROWS if a)
    return (f'<div class="tbl-scroll"><table class="tbl"><caption>{esc(t(P["tbl_cap"], L))}</caption><thead><tr><th scope="col">{esc(t(P["th_country"], L))}</th><th scope="col">{esc(t(P["th_work"], L))}</th>'
            f'<th scope="col" style="text-align:end">{esc(t(P["th_area"], L))}</th></tr></thead><tbody>{rows}</tbody>'
            f'<tfoot><tr><th scope="row" colspan="2">{esc(t(P["total"], L))}</th><td class="n">{total:,}</td></tr></tfoot></table></div>')


# ---------------------------------------------------------------- shared page parts
def jsonld(slug, L, crumbs):
    org = {
        "@type": "Organization", "@id": f"{DOMAIN}/#org", "name": "MIFTAH Projects", "alternateName": "מיפתח פרויקטים",
        "url": DOMAIN + "/", "logo": f"{DOMAIN}/assets/favicon-512.png", "telephone": "+972-4-985-4404",
        "slogan": t(C.SITE["slogan"], L),
        "address": {"@type": "PostalAddress", "addressLocality": "Kfar Masaryk", "addressCountry": "IL"},
        "areaServed": ["IL", "PT", "ES", "MX", "IN", "HN", "GE", "BY"],
        "knowsAbout": ["Agricultural net houses", "Anti-hail nets", "Banana net houses", "Orchard net houses", "Loading sheds", "Windbreaks", "Turnkey farms"],
        "founder": [{"@type": "Person", "name": "Merav Eyal Hasfel", "jobTitle": "Co-CEO"}, {"@type": "Person", "name": "Yiftach Hasfel", "jobTitle": "Co-CEO"}],
    }
    graph = [org, {"@type": "WebSite", "@id": f"{DOMAIN}/#site", "url": DOMAIN + "/", "name": "MIFTAH Projects", "inLanguage": ["en", "he"], "publisher": {"@id": f"{DOMAIN}/#org"}},
             {"@type": "WebPage", "url": url(slug, L, True), "name": t(C.PAGES[slug]["title"], L), "inLanguage": L, "isPartOf": {"@id": f"{DOMAIN}/#site"}, "about": {"@id": f"{DOMAIN}/#org"}}]
    if crumbs:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    if slug == "net-houses":
        graph.append({"@type": "Service", "name": t(C.PAGES[slug]["h1"], L), "provider": {"@id": f"{DOMAIN}/#org"}, "serviceType": "Agricultural net house design, manufacture and installation"})
    if slug == "turnkey-farms":
        graph.append({"@type": "Service", "name": t(C.PAGES[slug]["h1"], L), "provider": {"@id": f"{DOMAIN}/#org"}, "serviceType": "Turnkey farm development abroad, delivered with agricultural partners"})
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "</script>"


def head(slug, L, crumbs=None, noindex=False):
    P = C.PAGES[slug]; r = rel(L)
    alt = "he" if L == "en" else "en"
    links = ""
    if slug != "404":
        links = (f'<link rel="canonical" href="{url(slug, L, True)}">'
                 f'<link rel="alternate" hreflang="en" href="{url(slug, "en", True)}"><link rel="alternate" hreflang="he" href="{url(slug, "he", True)}">'
                 f'<link rel="alternate" hreflang="x-default" href="{url(slug, "en", True)}">')
    font_pre = (f'<link rel="preload" href="{r}assets/fonts/IBMPlexSans-var-latin.woff2" as="font" type="font/woff2" crossorigin>' if L == "en"
                else f'<link rel="preload" href="{r}assets/fonts/IBMPlexSansHebrew-700-hebrew.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="{r}assets/fonts/IBMPlexSansHebrew-400-hebrew.woff2" as="font" type="font/woff2" crossorigin>')
    hero_pre = ""
    if slug == "index":
        hero_pre = (f'<link rel="preload" as="image" type="image/avif" href="{r}assets/img/hero-portrait-720.avif" imagesrcset="{r}assets/img/hero-portrait-720.avif 720w" imagesizes="100vw" media="(max-width: 720px) and (orientation: portrait)">'
                    f'<link rel="preload" as="image" type="image/avif" href="{r}assets/img/hero-1600.avif" imagesrcset="{r}assets/img/hero-960.avif 960w, {r}assets/img/hero-1600.avif 1600w" imagesizes="100vw" media="not all and (max-width: 720px) and (orientation: portrait)">')
    return f"""<!DOCTYPE html>
<html lang="{L}" dir="{"ltr" if L == "en" else "rtl"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(t(P["title"], L))}</title>
<meta name="description" content="{esc(t(P["desc"], L))}">
{'<meta name="robots" content="noindex">' if noindex else ""}
{links}
<meta name="theme-color" content="#0E4239">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(t(C.SITE["name"], L))}">
<meta property="og:title" content="{esc(t(P["title"], L))}">
<meta property="og:description" content="{esc(t(P["desc"], L))}">
<meta property="og:url" content="{url(slug, L, True)}">
<meta property="og:image" content="{DOMAIN}/assets/img/og-miftah.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="{"en_US" if L == "en" else "he_IL"}"><meta property="og:locale:alternate" content="{"he_IL" if L == "en" else "en_US"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{r}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{r}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{r}assets/favicon-180.png">
<link rel="manifest" href="{r}site.webmanifest">
{font_pre}
{hero_pre}
<link rel="stylesheet" href="{r}assets/fonts/fonts.css?v={ASSET_VER}">
<link rel="stylesheet" href="{r}assets/site.css?v={ASSET_VER}">
{jsonld(slug, L, crumbs) if slug != "404" else ""}
<script>window.MIFTAH={{formEndpoint:{json.dumps(FORM_ENDPOINT)}}};</script>
{ANALYTICS}
</head>"""


def header(slug, L):
    alt = "he" if L == "en" else "en"
    other = (("he/" if L == "en" else "../") + ("index.html" if slug in ("index", "404") else f"{slug}.html"))
    items = "".join(f'<li><a href="{s}.html"{" aria-current=" + chr(34) + "page" + chr(34) if s == slug else ""}>{esc(en if L == "en" else he)}</a></li>' for s, en, he in C.NAV)
    return f"""<body>
<a class="skip" href="#main">{esc(t(C.SITE["skip"], L))}</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="index.html" aria-label="{esc(t(C.SITE["name"], L))}, {esc(t(C.SITE["home"], L))}">{logo(L)}</a>
    <nav class="nav" id="nav" aria-label="{"Main" if L == "en" else "ראשי"}">
      <ul>{items}</ul>
      <a class="btn btn-primary nav-cta" href="contact.html" data-track="cta_click" data-label="nav">{esc(t(C.SITE["cta"], L))}</a>
    </nav>
    <a class="lang" href="{other}" hreflang="{alt}" lang="{alt}" data-track="lang_switch">{esc(t(C.SITE["lang_other"], L))}</a>
    <a class="btn btn-primary head-cta" href="contact.html" data-track="cta_click" data-label="header">{esc(t(C.SITE["cta"], L))}</a>
    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span class="bars" aria-hidden="true"></span>{esc(t(C.SITE["menu"], L))}</button>
  </div>
</header>"""


def footer(L):
    S = C.SITE
    nav = "".join(f'<li><a href="{s}.html">{esc(en if L == "en" else he)}</a></li>' for s, en, he in C.NAV)
    return f"""<footer class="site-foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <span class="plate">{logo(L, full=True)}</span>
        <p class="slogan">{esc(t(S["slogan"], L))}</p>
      </div>
      <div>
        <h2>{esc(t(S["foot_nav"], L))}</h2>
        <ul>{nav}<li><a href="profile.html">{esc(t(S["foot_profile"], L))}</a></li></ul>
      </div>
      <div>
        <h2>{esc(t(S["foot_contact"], L))}</h2>
        <address>
          <a href="tel:{S["phone_tel"]}" data-where="footer"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a>
          <span>{esc(t(S["town"], L))}</span>
        </address>
        <ul style="margin-top:16px"><li><a href="privacy.html">{esc(t(S["foot_legal"], L))}</a></li><li><a href="accessibility.html">{esc(t(S["foot_a11y"], L))}</a></li></ul>
      </div>
    </div>
    <div class="titleblock" aria-hidden="true">
      <div><b>{esc(t(S["tb_doc"], L))}</b>{esc(t(S["tb_doc_v"], L))}</div>
      <div><b>{esc(t(S["tb_rev"], L))}</b>{esc(t(S["tb_rev_v"], L))}</div>
      <div><b>{esc(t(S["tb_by"], L))}</b>{esc(t(S["town"], L))}</div>
      <div><b>{esc(t(S["tb_scale"], L))}</b>{esc(t(S["tb_scale_v"], L))}</div>
    </div>
    <p class="small" style="margin-top:20px;color:var(--on-dark-2)">{esc(t(S["rights"], L).format(y=YEAR))}</p>
  </div>
</footer>
<script src="{rel(L)}assets/site.js?v={ASSET_VER}" defer></script>
</body>
</html>
"""


def page_head(slug, L, extra=""):
    P = C.PAGES[slug]
    crumbs = f'<nav class="crumbs" aria-label="{"Breadcrumb" if L == "en" else "פירורי לחם"}"><ol><li><a href="index.html">{esc(t(C.SITE["home"], L))}</a></li><li aria-current="page">{esc(t(P["h1"], L))}</li></ol></nav>'
    lead = f'<p class="lead">{esc(t(P["lead"], L))}</p>' if "lead" in P else ""
    return f'<section class="page-head"><div class="wrap">{crumbs}<h1>{esc(t(P["h1"], L))}</h1>{lead}{extra}</div></section>'


def cta_band(L, where):
    B = C.CTA_BAND; S = C.SITE
    return f"""<section class="section dark cta-band" aria-labelledby="cta-{where}">
  <div class="wrap in">
    <div>
      <h2 id="cta-{where}">{esc(t(B["h"], L))}</h2>
      <p class="lead">{esc(t(B["p"], L))}</p>
    </div>
    <div class="side">
      <div class="actions">
        <a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="band-{where}">{esc(t(S["cta"], L))}</a>
        <a class="btn btn-line" href="tel:{S["phone_tel"]}" data-where="band-{where}">{esc(t(S["call"], L))} <bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a>
      </div>
      <p class="meta">{esc(t(B["min"], L))}<br>{esc(t(B["fair"], L))}</p>
    </div>
  </div>
</section>"""


def steps(L, with_photos=True, hlevel="h3"):
    lis = []
    for i, (img, h, p, cap) in enumerate(C.STEPS):
        lis.append(f'<li><span class="n">{i + 1:02d}</span><{hlevel}>{esc(t(h, L))}</{hlevel}><p>{esc(t(p, L))}</p></li>')
    out = f'<ol class="steps">{"".join(lis)}</ol>'
    if with_photos:
        figs = "".join(f'<li><figure>{picture(img, t(cap, L), L, sizes="(max-width: 520px) 100vw, (max-width: 860px) 50vw, 25vw")}<figcaption><b>{i + 1:02d} {esc(t(h, L))}</b><span>{esc(t(cap, L))}</span></figcaption></figure></li>'
                       for i, (img, h, p, cap) in enumerate(C.STEPS))
        out += f'<ul class="series" style="margin-top:clamp(28px,4vw,48px);grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))">{figs}</ul>'
    return out


def featured(L):
    rows = "".join(f'<tr><th scope="row">{esc(t(c, L))}</th><td>{esc(t(w, L))}</td><td>{esc(t(r, L))}</td></tr>' for c, r, w in C.FEATURED)
    th = ("Crop", "Structure", "Region") if L == "en" else ("גידול", "מבנה", "אזור")
    return f'<div class="tbl-scroll"><table class="tbl"><thead><tr>{"".join(f'<th scope="col">{x}</th>' for x in th)}</tr></thead><tbody>{rows}</tbody></table></div>'


# ---------------------------------------------------------------- pages
def p_index(L):
    P = C.PAGES["index"]; S = C.SITE; r = rel(L)
    facts = "".join(f'<div><dt>{esc(t(a, L))}</dt><dd>{esc(t(b, L))}</dd></div>' for a, b in C.FACTS)
    fig, legend = drawing(L)
    vids = f'data-src-wide="{r}assets/video/hero-wide.mp4" data-src-small="{r}assets/video/hero-720.mp4" data-src-portrait="{r}assets/video/hero-portrait.mp4"'
    poster = (f'<picture><source media="(max-width: 720px) and (orientation: portrait)" type="image/avif" srcset="{r}assets/img/hero-portrait-720.avif">'
              f'<source media="(max-width: 720px) and (orientation: portrait)" type="image/webp" srcset="{r}assets/img/hero-portrait-720.webp">'
              f'<source type="image/avif" srcset="{r}assets/img/hero-960.avif 960w, {r}assets/img/hero-1600.avif 1600w" sizes="100vw">'
              f'<source type="image/webp" srcset="{r}assets/img/hero-960.webp 960w, {r}assets/img/hero-1600.webp 1600w" sizes="100vw">'
              f'<img src="{r}assets/img/hero-1600.jpg" alt="" width="1600" height="900" fetchpriority="high"></picture>')
    return f"""
<main id="main">
<section class="hero" aria-labelledby="hero-h">
  <div class="hero-media" aria-hidden="true">{poster}<video id="hero-video" muted loop playsinline preload="none" {vids} style="position:absolute;inset:0"></video></div>
  <div class="wrap hero-in">
    <h1 id="hero-h">{esc(t(P["h1"], L))}</h1>
    <p class="lead">{esc(t(P["lead"], L))}</p>
    <div class="actions">
      <a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="hero">{esc(t(S["cta"], L))}</a>
      <a class="btn btn-line" href="projects.html">{esc(t(P["cta2"], L))}</a>
    </div>
    <div class="hero-foot"><span>{esc(t(P["vidcap"], L))}</span><button class="vid-btn" type="button" data-video="hero-video" aria-pressed="false"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg><span>{"Pause video" if L == "en" else "עצירת הסרטון"}</span></button></div>
  </div>
</section>
<section class="facts" aria-label="{"Key facts" if L == "en" else "עובדות מרכזיות"}"><div class="wrap"><dl>{facts}</dl></div></section>

<section class="section" aria-labelledby="routes-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="routes-h">{esc(t(P["routes_h"], L))}</h2></div>
    <div class="routes">
      <div class="route">
        <span class="who">{esc(t(P["r1_who"], L))}</span>
        <h3>{esc(t(P["r1_h"], L))}</h3>
        <p class="muted">{esc(t(P["r1_p"], L))}</p>
        <p class="min">{esc(t(P["r1_min"], L))}</p>
        <a class="go" href="net-houses.html">{esc(t(P["r1_go"], L))}</a>
      </div>
      <div class="route invest">
        <span class="who">{esc(t(P["r2_who"], L))}</span>
        <h3>{esc(t(P["r2_h"], L))}</h3>
        <p class="muted">{esc(t(P["r2_p"], L))}</p>
        <p class="min">{esc(t(P["r2_min"], L))}</p>
        <a class="go" href="turnkey-farms.html">{esc(t(P["r2_go"], L))}</a>
      </div>
    </div>
  </div>
</section>

<section class="section white" aria-labelledby="draw-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="draw-h">{esc(t(P["draw_h"], L))}</h2><p class="lead">{esc(t(P["draw_p"], L))}</p></div>
    {fig}
    <div style="margin-top:28px;max-width:900px">{legend}</div>
  </div>
</section>

<section class="section" aria-labelledby="steps-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="steps-h">{esc(t(P["steps_h"], L))}</h2><p class="lead">{esc(t(P["steps_p"], L))}</p></div>
    {steps(L)}
    <p class="photo-note">{esc(t(P["photos_note"], L))}</p>
  </div>
</section>

<section class="section white" aria-labelledby="map-h">
  <div class="wrap">
    <div class="split" style="align-items:end;margin-bottom:28px">
      <h2 id="map-h">{esc(t(P["map_h"], L))}</h2>
      <div><p class="lead">{esc(t(P["map_p"], L))}</p><p style="margin-top:14px"><a href="projects.html">{esc(t(P["map_go"], L))}</a></p></div>
    </div>
    <div class="map-wrap">{map_svg(L)}</div>
  </div>
</section>

<section class="section" aria-labelledby="why-h">
  <div class="wrap split">
    <div><h2 id="why-h">{esc(t(P["why_h"], L))}</h2><p class="statement" style="margin-top:24px">{esc(t(P["why_statement"], L))}</p></div>
    <div>
      <ul class="values">{"".join(f'<li style="grid-column:1/-1"><b>{esc(t(a, L))}</b><span>{esc(t(b, L))}</span></li>' for a, b in C.VALUES)}</ul>
      <p class="muted" style="margin-top:20px">{esc(t(P["why_refs"], L))}</p>
    </div>
  </div>
</section>
{cta_band(L, "home")}
</main>"""


def p_net(L):
    P = C.PAGES["net-houses"]
    fig, legend = drawing(L, animate=False)
    types = []
    for ty in C.TYPES:
        rows = "".join(f'<dt>{esc(t(a, L))}</dt><dd>{esc(t(b, L))}</dd>' for a, b in ty["rows"])
        types.append(f'<article class="type" id="{ty["id"]}"><div><h3>{esc(t(ty["h"], L))}</h3><p class="crops">{esc(t(ty["crops"], L))}</p></div><div><dl>{rows}</dl></div></article>')
    # real photos of two different MIFTAH net houses; the crop under them is not confirmed, so they are not tied to a crop row
    band = "".join(f'<figure>{picture(ty["img"], t(ty["cap"], L), L, sizes="(max-width: 620px) 100vw, 50vw")}<figcaption><span>{esc(t(ty["cap"], L))}</span></figcaption></figure>' for ty in C.TYPES if ty["img"])
    return f"""
<main id="main">
{page_head("net-houses", L)}
<section class="section" aria-labelledby="types-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="types-h">{esc(t(P["types_h"], L))}</h2></div>
    <div class="types">{"".join(types)}</div>
    <div class="series" style="margin-top:clamp(28px,4vw,48px);grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))">{band}</div>
  </div>
</section>
<section class="section white" aria-labelledby="draw-h">
  <div class="wrap">
    <div class="split">
      <div><h2 id="draw-h">{esc(t(P["draw_h"], L))}</h2><div style="margin-top:24px">{legend}</div></div>
      <div>{fig}<div style="margin-top:28px"><h3>{esc(t(P["site_h"], L))}</h3><p class="muted" style="margin-top:8px">{esc(t(P["site_p"], L))}</p></div></div>
    </div>
  </div>
</section>
<section class="section" aria-labelledby="steps-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="steps-h">{esc(t(P["steps_h"], L))}</h2><p class="lead">{esc(t(P["steps_p"], L))}</p></div>
    {steps(L)}
    <div class="notice" style="margin-top:clamp(28px,4vw,48px);max-width:820px"><b>{esc(t(P["abroad_h"], L))}.</b> {esc(t(P["abroad_p"], L))}</div>
  </div>
</section>
{cta_band(L, "net")}
</main>"""


def p_turnkey(L):
    P = C.PAGES["turnkey-farms"]
    n = 0; phases = []
    for ph, items in C.STAGES:
        lis = []
        for title, rec in items:
            n += 1
            lis.append(f'<li><b><span class="num">{n:02d}</span><span>{esc(t(title, L))}</span></b><span>{esc(t(rec, L))}</span></li>')
        phases.append(f'<div class="phase"><h3>{esc(t(ph, L))}</h3><ol start="{n - len(items) + 1}">{"".join(lis)}</ol></div>')
    return f"""
<main id="main">
{page_head("turnkey-farms", L)}
<section class="section" aria-labelledby="honest-h">
  <div class="wrap split">
    <div class="notice"><h2 id="honest-h" style="font-size:1.375rem">{esc(t(P["honest_h"], L))}</h2><p style="margin-top:8px">{esc(t(P["honest_p"], L))}</p></div>
    <div>
      <h2 style="font-size:1.375rem">{esc(t(P["start_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["start_p"], L))}</p>
      <h2 style="font-size:1.375rem;margin-top:28px">{esc(t(P["where_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["where_p"], L))}</p>
    </div>
  </div>
</section>
<section class="section dark" aria-labelledby="stages-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="stages-h">{esc(t(P["stages_h"], L))}</h2><p class="lead">{esc(t(P["stages_p"], L))}</p></div>
    <div class="phases">{"".join(phases)}</div>
    <div class="excl">
      <div><h3 style="font-size:1.125rem">{esc(t(P["excl_h"], L))}</h3><ul style="margin:10px 0 0;padding-inline-start:1.1em;color:var(--on-dark-2)"><li>{esc(t(P["excl_1"], L))}</li><li>{esc(t(P["excl_2"], L))}</li></ul></div>
      <div><h3 style="font-size:1.125rem">{esc(t(P["mistake_h"], L))}</h3><p style="margin-top:10px;color:var(--on-dark-2)">{esc(t(P["mistake_p"], L))}</p></div>
    </div>
  </div>
</section>
<section class="section white" aria-labelledby="core-h">
  <div class="wrap split">
    <div><h2 id="core-h">{"Structures at the core of the farm" if L == "en" else "המבנים בלב החווה"}</h2>
      <p class="lead" style="margin-top:14px">{"The net houses, sheds and windbreaks of a turnkey farm are the same structures we design, make and build for growers. See how they are made." if L == "en" else "בתי הרשת, הסככות ושוברי הרוח של חוות Turnkey הם אותם מבנים שאנחנו מתכננים, מייצרים ומקימים לחקלאים. כך הם נבנים:"}</p>
      <p style="margin-top:14px"><a href="net-houses.html">{"Net houses and structures" if L == "en" else "בתי רשת ומבנים"}</a></p></div>
    <figure style="margin:0">{picture("valley", t(C.TYPES[0]["cap"], L), L, sizes="(max-width: 900px) 100vw, 58vw")}<figcaption class="small muted" style="padding-top:8px">{esc(t(C.TYPES[0]["cap"], L))}</figcaption></figure>
  </div>
</section>
{cta_band(L, "turnkey")}
</main>"""


def p_projects(L):
    P = C.PAGES["projects"]
    return f"""
<main id="main">
{page_head("projects", L)}
<section class="section white" aria-labelledby="map-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="map-h">{esc(t(P["map_h"], L))}</h2></div>
    <div class="map-wrap">{map_svg(L)}</div>
    <div style="margin-top:clamp(28px,4vw,48px);max-width:860px">{projects_table(L)}</div>
  </div>
</section>
<section class="section" aria-labelledby="feat-h">
  <div class="wrap split">
    <div><h2 id="feat-h">{esc(t(P["feat_h"], L))}</h2><p class="muted" style="margin-top:14px">{esc(t(P["feat_p"], L))}</p></div>
    <div>{featured(L)}</div>
  </div>
</section>
<section class="section white" aria-label="{esc(t(P["aerial_cap"], L))}">
  <div class="wrap">
    <figure class="film" style="margin:0">{picture("hillside", t(P["aerial_cap"], L), L, sizes="(max-width: 1300px) 100vw, 1240px")}<figcaption><span>{esc(t(P["aerial_cap"], L))}</span></figcaption></figure>
    <div class="series" style="margin-top:clamp(20px,3vw,32px);grid-template-columns:repeat(2,minmax(0,1fr))">
      <figure>{picture("forest", t(C.TYPES[1]["cap"], L), L, sizes="(max-width: 520px) 100vw, 50vw")}<figcaption><span>{esc(t(C.TYPES[1]["cap"], L))}</span></figcaption></figure>
      <figure>{picture("p-closed", t(C.STEPS[3][3], L), L, sizes="(max-width: 520px) 100vw, 50vw")}<figcaption><span>{esc(t(C.STEPS[3][3], L))}</span></figcaption></figure>
    </div>
  </div>
</section>
{cta_band(L, "projects")}
</main>"""


def p_about(L):
    P = C.PAGES["about"]; S = C.SITE
    company = [("Name", "שם", t(S["name"], L) + (" (מיפתח פרויקטים)" if L == "en" else "")), ("Office", "משרד", t(S["town"], L)),
               ("Phone", "טלפון", f'<a href="tel:{S["phone_tel"]}" data-where="about"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a>'),
               ("Management", "הנהלה", t(P["merav"], L) + (" and " if L == "en" else " ו") + t(P["yiftach"], L) + (", co-CEOs" if L == "en" else ", מנכ״לים משותפים"))]
    rows = "".join(f'<tr><th scope="row">{a if L == "en" else b}</th><td>{v if v.startswith("<a") else esc(v)}</td></tr>' for a, b, v in company)
    return f"""
<main id="main">
{page_head("about", L)}
<section class="section" aria-labelledby="people-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="people-h">{esc(t(P["people_h"], L))}</h2></div>
    <div class="people">
      <div class="person"><h3>{esc(t(P["merav"], L))}</h3><p class="role">{esc(t(P["merav_r"], L))}</p><p>{esc(t(P["merav_p"], L))}</p></div>
      <div class="person"><h3>{esc(t(P["yiftach"], L))}</h3><p class="role">{esc(t(P["yiftach_r"], L))}</p><p>{esc(t(P["yiftach_p"], L))}</p></div>
    </div>
  </div>
</section>
<section class="section white" aria-labelledby="how-h">
  <div class="wrap split">
    <div><h2 id="how-h">{esc(t(P["how_h"], L))}</h2><p class="lead" style="margin-top:14px">{esc(t(P["how_p"], L))}</p></div>
    <figure style="margin:0">{picture("p-poles", t(C.STEPS[2][3], L), L, sizes="(max-width: 900px) 100vw, 58vw")}<figcaption class="small muted" style="padding-top:8px">{esc(t(C.STEPS[2][3], L))}</figcaption></figure>
  </div>
</section>
<section class="section" aria-labelledby="values-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="values-h">{esc(t(P["values_h"], L))}</h2><p class="statement">{esc(t(C.PAGES["index"]["why_statement"], L))}</p></div>
    <ul class="values">{"".join(f'<li><b>{esc(t(a, L))}</b><span>{esc(t(b, L))}</span></li>' for a, b in C.VALUES)}</ul>
  </div>
</section>
<section class="section white" aria-labelledby="co-h">
  <div class="wrap"><div style="max-width:720px"><h2 id="co-h" style="margin-bottom:18px">{esc(t(P["company_h"], L))}</h2><table class="tbl"><tbody>{rows}</tbody></table></div></div>
</section>
{cta_band(L, "about")}
</main>"""


def choices(name, items, L, legend):
    lis = "".join(f'<label class="choice"><input type="radio" name="{name}" value="{v}"><span><b>{esc(t(a, L))}</b><small>{esc(t(b, L))}</small></span></label>' for v, a, b in items)
    return f'<fieldset class="field full"><legend>{esc(t(legend, L))}</legend><div class="choices">{lis}</div></fieldset>'


def select(name, label, items, L, req=False, hint=None):
    opts = "".join(f'<option value="{v}">{esc(t(x, L))}</option>' for v, x in items)
    return (f'<div class="field"><label for="f-{name}">{esc(t(label, L))}</label><select id="f-{name}" name="{name}"{" required aria-required=" + chr(34) + "true" + chr(34) if req else ""}>{opts}</select>'
            + (f'<span class="hint">{esc(t(hint, L))}</span>' if hint else "") + "</div>")


def inp(name, label, L, typ="text", req=False, auto="", hint=None, full=False):
    a = f' autocomplete="{auto}"' if auto else ""
    r = ' required aria-required="true"' if req else ""
    h = f'<span class="hint" id="f-{name}-h">{esc(t(hint, L))}</span>' if hint else ""
    db = f' aria-describedby="f-{name}-h"' if hint else ""
    d = ' dir="ltr"' if typ in ("email", "tel") else ""
    return f'<div class="field{" full" if full else ""}"><label for="f-{name}">{esc(t(label, L))}</label><input id="f-{name}" name="{name}" type="{typ}"{a}{r}{db}{d}>{h}</div>'


def p_contact(L):
    P = C.PAGES["contact"]; F = C.FORM; S = C.SITE
    consent = esc(t(F["consent"], L)).replace("{privacy}", f'<a href="privacy.html">{esc(t(F["privacy_link"], L))}</a>')
    form = f"""<form class="form" id="review-form" method="post" action="{esc(FORM_ENDPOINT) or "contact.html"}" novalidate aria-labelledby="form-h">
  <noscript><p class="form-status bad">{"Sending this form needs JavaScript. Please call +972 4 985 4404." if L == "en" else "שליחת הטופס דורשת JavaScript. אפשר להתקשר ל-04-9854404."}</p></noscript>
  <div><h2 id="form-h" style="font-size:1.5rem">{esc(t(F["h"], L))}</h2><p class="small muted" style="margin-top:6px">{esc(t(F["req"], L))}</p></div>
  <div class="fields">
    {inp("name", F["name"], L, req=True, auto="name")}
    {inp("company", F["company"], L, auto="organization")}
    {inp("email", F["email"], L, typ="email", req=True, auto="email")}
    {inp("phone", F["phone"], L, typ="tel", auto="tel", hint=F["phone_hint"])}
    {choices("role", F["roles"], L, F["role"])}
    {choices("need", F["needs"], L, F["need"])}
    {select("country", F["country"], F["countries"], L, req=True)}
    {inp("region", F["region"], L, auto="address-level1")}
    {select("size", F["size"], F["sizes"], L, req=True)}
    {select("status", F["status"], F["statuses"], L)}
    <p class="size-note full" id="size-note" role="status" hidden></p>
    {inp("crop", F["crop"], L, hint=F["crop_hint"])}
    {select("timeline", F["timeline"], F["timelines"], L)}
    <div class="field full"><label for="f-message">{esc(t(F["message"], L))}</label><textarea id="f-message" name="message" rows="5"></textarea></div>
    <div class="hp" aria-hidden="true"><label for="f-website">{esc(t(F["honeypot"], L))}</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <label class="check full"><input type="checkbox" name="berlin" value="yes"><span>{esc(t(F["berlin"], L))}</span></label>
    <div class="check full"><input type="checkbox" id="f-consent" name="consent" value="yes" required aria-required="true"><label for="f-consent">{consent}</label></div>
  </div>
  <div class="actions"><button class="btn btn-primary" type="submit">{esc(t(F["send"], L))}</button></div>
</form>
<div class="form-status" id="form-status" role="status" aria-live="polite" hidden></div>"""
    aside = f"""<aside class="aside" aria-label="{"Other ways to reach us" if L == "en" else "דרכים נוספות"}">
  <div class="block"><h2>{esc(t(P["aside_phone_h"], L))}</h2><a class="big-phone" href="tel:{S["phone_tel"]}" data-where="contact"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a><p>{esc(t(P["aside_phone_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_min_h"], L))}</h2><p>{esc(t(P["aside_min_p"], L))}</p></div>
  <div class="block" id="berlin"><h2>{esc(t(P["aside_fair_h"], L))}</h2><p>{esc(t(P["aside_fair_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_office_h"], L))}</h2><p>{esc(t(S["name"], L))}<br>{esc(t(S["town"], L))}</p></div>
</aside>"""
    return f"""
<main id="main">
{page_head("contact", L)}
<section class="section"><div class="wrap form-grid"><div>{form}</div>{aside}</div></section>
</main>"""


def p_profile(L):
    P = C.PAGES["profile"]; S = C.SITE; H = C.PAGES["index"]
    facts = "".join(f'<div><b>{esc(t(a, L))}</b>{esc(t(b, L))}</div>' for a, b in C.FACTS)
    svc = "".join(f'<li><b>{esc(t(ty["h"], L))}</b>: {esc(t(ty["rows"][0][1], L))}</li>' for ty in C.TYPES)
    stg = ", ".join(t(x[0], L) for _, items in C.STAGES for x in items)
    proc = "".join(f'<li>{esc(t(h, L))}</li>' for _, h, _, _ in C.STEPS)
    return f"""
<main id="main">
<div class="wrap no-print"><div class="profile-bar"><p class="muted">{esc(t(P["bar_p"], L))}</p><button class="btn btn-primary" type="button" id="print-btn">{esc(t(P["print"], L))}</button></div></div>
<article class="sheet" aria-labelledby="p-h">
  <header class="p-head"><div><h1 id="p-h">{esc(t(S["name"], L))}</h1><p class="lead" style="margin-top:6px">{esc(t(S["slogan"], L))}</p></div>{logo(L)}</header>
  <p style="margin-top:18px">{esc(t(P["who"], L))}</p>
  <div class="facts-p">{facts}</div>
  <div class="cols">
    <section><h2>{esc(t(P["svc_h"], L))}</h2><ul>{svc}</ul></section>
    <section><h2>{esc(t(P["proc_h"], L))}</h2><ol style="margin:0;padding-inline-start:1.2em">{proc}</ol>
      <h2>{esc(t(P["turn_h"], L))}</h2><p class="small">{esc(stg)}.</p></section>
  </div>
  <section><h2>{esc(t(P["proj_h"], L))}</h2>{projects_table(L)}</section>
  <section style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px"><div><h2>{esc(t(P["contact_h"], L))}</h2><p><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi> &nbsp;|&nbsp; {esc(t(S["town"], L))} &nbsp;|&nbsp; <span class="ltr">{esc(t(P["web"], L))}</span></p></div>
    <img src="{rel(L)}assets/qr-site.svg" width="84" height="84" alt="{"QR code for www.miftah.co.il" if L == "en" else "קוד QR לאתר www.miftah.co.il"}"></section>
</article>
<div style="height:48px"></div>
</main>"""


def p_prose(slug, L, data):
    body = "".join(f"<h2>{esc(h)}</h2><p>{esc(p)}</p>" for h, p in data[L])
    return f"""
<main id="main">
{page_head(slug, L)}
<section class="section"><div class="wrap prose">{body}</div></section>
</main>"""


def p_404(L):
    P = C.PAGES["404"]
    links = "".join(f'<li><a href="{s}.html">{esc(en if L == "en" else he)}</a></li>' for s, en, he in C.NAV)
    home = f'<li><a href="index.html">{esc(t(C.SITE["home"], L))}</a></li>'
    return f"""
<main id="main"><section class="section"><div class="wrap nf"><h1>{esc(t(P["h1"], L))}</h1><p class="lead">{esc(t(P["p"], L))}</p><ul>{home}{links}</ul></div></section></main>"""


RENDER = {"index": p_index, "net-houses": p_net, "turnkey-farms": p_turnkey, "projects": p_projects, "about": p_about,
          "contact": p_contact, "profile": p_profile,
          "privacy": lambda L: p_prose("privacy", L, C.PRIVACY), "accessibility": lambda L: p_prose("accessibility", L, C.A11Y)}


def crumbs_for(slug, L):
    if slug == "index":
        return None
    return [(t(C.SITE["home"], L), url("index", L, True)), (t(C.PAGES[slug]["h1"], L), url(slug, L, True))]


def write(path, s):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(s, encoding="utf-8")


def main():
    # static assets
    (PUB / "assets").mkdir(parents=True, exist_ok=True)
    shutil.copy(SRC / "assets/site.css", PUB / "assets/site.css")
    shutil.copy(SRC / "assets/site.js", PUB / "assets/site.js")
    shutil.copy(SRC.parents[1] / "images/miftah-mark.svg", PUB / "assets/favicon.svg")
    for L in LANGS:
        base = PUB if L == "en" else PUB / "he"
        for slug in PAGES:
            html_ = head(slug, L, crumbs_for(slug, L), noindex=(slug == "profile")) + header(slug, L) + RENDER[slug](L) + footer(L)
            write(base / ("index.html" if slug == "index" else f"{slug}.html"), html_)
        # served for unknown URLs at any depth, so resolve its links from the site root
        nf = head("404", L, noindex=True).replace("<head>\n", '<head>\n<base href="' + ("/" if L == "en" else "/he/") + '">\n', 1)
        write(base / "404.html", nf + header("404", L) + p_404(L) + footer(L))
    # sitemap with hreflang alternates
    today = datetime.date.today().isoformat()
    urls = []
    for slug in PAGES:
        if slug == "profile":
            continue
        for L in LANGS:
            alts = "".join(f'<xhtml:link rel="alternate" hreflang="{a}" href="{url(slug, a, True)}"/>' for a in LANGS) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{url(slug, "en", True)}"/>'
            urls.append(f"<url><loc>{url(slug, L, True)}</loc><lastmod>{today}</lastmod>{alts}</url>")
    write(PUB / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(urls) + "\n</urlset>\n")
    write(PUB / "robots.txt", f"User-agent: *\nAllow: /\nDisallow: /profile.html\nDisallow: /he/profile.html\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    write(PUB / "site.webmanifest", json.dumps({"name": "MIFTAH Projects", "short_name": "MIFTAH", "start_url": "/", "display": "browser", "background_color": "#F2F5F3", "theme_color": "#0E4239",
                                               "icons": [{"src": "/assets/favicon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/favicon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=1))
    n = len(list(PUB.rglob("*.html")))
    print(f"built {n} pages into {PUB}")


if __name__ == "__main__":
    main()
