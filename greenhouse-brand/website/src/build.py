"""Builds the MIFTAH Projects website into ../public: English at the root, Hebrew under /he/.
Run: python3 src/build.py
Copy lives in content.py; styles, scripts, fonts and icons in assets/; photos come from tools/images.py (media-src/ -> public/assets/img)."""
import datetime
import hashlib
import html
import importlib.util
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

import content as C
from tools import worldmap

SRC = Path(__file__).resolve().parent
PUB = SRC.parent / "public"

# the brand book generator (greenhouse-brand/tools/build.py) holds the measured SVG of the original logo.
# Loaded by path under its own name: it is also called build.py, so a plain import would load this file.
_spec = importlib.util.spec_from_file_location("brand_book", SRC.parents[1] / "tools/build.py")
brand = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(brand)

# ---------------------------------------------------------------- config
DOMAIN = "https://www.miftah.co.il"
FORM_ENDPOINT = ""          # a URL that accepts a JSON POST and answers 2xx. Empty = honest "not connected" state.
ANALYTICS = ""              # e.g. '<script defer data-domain="miftah.co.il" src="https://plausible.io/js/script.js"></script>'
def _git_date():
    """Date of the last commit that touched src/ (falls back to today outside git), so a fresh clone builds the same files."""
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", str(SRC)], capture_output=True, text=True, cwd=SRC, timeout=10).stdout.strip()
        return datetime.date.fromisoformat(out) if out else datetime.date.today()
    except (OSError, ValueError, subprocess.SubprocessError):
        return datetime.date.today()


SOURCE_DATE = _git_date()
YEAR = SOURCE_DATE.year
LANGS = ("en", "he")
PAGES = ["index", "net-houses", "turnkey-farms", "projects", "about", "contact", "profile", "privacy", "accessibility"]


def esc(s):
    return html.escape(str(s), quote=True)


RANGE = re.compile(r"\d[\d,.]*%?\s?[–-]\s?\d[\d,.]*%?")


def t(pair, L):
    """Visible text. In Hebrew, number ranges (10%–30%, 3–5) are isolated so they keep left-to-right order."""
    if L == "en":
        return pair[0]
    return RANGE.sub(lambda m: "⁦" + m.group(0) + "⁩", pair[1])


def tm(pair, L):
    """Metadata text (title, description, alt, JSON-LD): no invisible isolate characters."""
    return pair[0] if L == "en" else pair[1]


def url(slug, L, absolute=False):
    name = "" if slug == "index" else f"{slug}.html"
    path = ("" if L == "en" else "he/") + name
    return f"{DOMAIN}/{path}" if absolute else path


def rel(L):
    return "" if L == "en" else "../"


def ver(path):
    """Cache-busting version: a short hash of the file's content."""
    return hashlib.md5(Path(path).read_bytes()).hexdigest()[:8]


LOGO = brand.logo_svg("light", "compact")
FONTV = {}  # font file -> content hash, filled in main()


def logo(L):
    return LOGO.replace('aria-label="MIFTAH"', f'aria-label="{esc(tm(C.SITE["name"], L))}"')


# ---------------------------------------------------------------- media helpers
def picture(name, alt, L, sizes="100vw", archive=False, widths=(640, 1024, 1600)):
    have = [w for w in widths if (PUB / f"assets/img/{name}-{w}.jpg").exists()]
    if not have:
        raise SystemExit(f"missing public/assets/img/{name}-*.jpg: run python3 src/tools/images.py first")
    r = rel(L)
    def srcset(ext): return ", ".join(f"{r}assets/img/{name}-{w}.{ext} {w}w" for w in have)
    from PIL import Image
    w0, h0 = Image.open(PUB / f"assets/img/{name}-{have[-1]}.jpg").size
    cls = ' class="archive"' if archive else ""
    return (f'<picture><source type="image/avif" srcset="{srcset("avif")}" sizes="{sizes}">'
            f'<source type="image/webp" srcset="{srcset("webp")}" sizes="{sizes}">'
            f'<img src="{r}assets/img/{name}-{have[min(1, len(have) - 1)]}.jpg" srcset="{srcset("jpg")}" sizes="{sizes}" width="{w0}" height="{h0}" alt="{esc(alt)}" loading="lazy" decoding="async"{cls}></picture>')


# ---------------------------------------------------------------- signature: the section drawing
def drawing(L, animate=True):
    """The section drawing: a full desktop version and a two-bay phone version with larger labels, plus the legend."""
    D = C.DRAWING
    legend = "".join(f'<li><span class="k">{i + 1}</span><div><b>{esc(t(a_, L))}</b><span>{esc(t(b_, L))}</span></div></li>' for i, (a_, b_) in enumerate(D["items"]))
    fig = (f'<figure class="drawing"{" data-animate" if animate else ""}>{_drawing_svg(L, False)}{_drawing_svg(L, True)}'
           f'<figcaption><span>{esc(t(D["caption"], L))}</span></figcaption></figure>')
    return fig, f'<ol class="legend">{legend}</ol>'


def _drawing_svg(L, mobile):
    """A section through a net house, drawn as a shop drawing: hatched soil, footings, dimension lines, numbered callouts.
    The phone version crops to the first two bays and keeps only the callouts that fall inside, at a readable size."""
    D = C.DRAWING; he = L == "he"; W = 690 if mobile else 1260
    poles = [150, 390, 630, 870, 1110]
    top, gy = 150, 430
    p = []
    f = lambda d: f' class="dw-fade" style="--d:{d:.2f}s"'
    p.append(f'<defs><pattern id="hatch{"m" if mobile else ""}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V12" stroke="#CDBFA4" stroke-width="2"/></pattern>'
             f'<marker id="ar{"m" if mobile else ""}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0E4239"/></marker>'
             f'<marker id="tk{"m" if mobile else ""}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M5 0V10" stroke="#4B605B" stroke-width="1.5"/></marker></defs>')
    p.append(f'<rect x="0" y="{gy}" width="1260" height="70" fill="url(#hatch{"m" if mobile else ""})"/>')
    p.append(f'<path class="dw-ground dw-anim" style="--d:0s" d="M0 {gy} H1260"/>')
    for i, x in enumerate(poles):
        d = .15 + i * .1
        p.append(f'<g{f(d)}><rect class="dw-footing" x="{x - 9}" y="{gy}" width="18" height="40"/></g>')
        p.append(f'<path class="dw-pole dw-anim" style="--d:{d:.2f}s" d="M{x} {gy} V{top}"/>')
    p.append(f'<path class="dw-cable dw-anim" style="--d:.8s" d="M{poles[0]} {top - 6} H{poles[-1]}"/>')
    p.append(f'<path class="dw-cable dw-anim" style="--d:1s" d="M{poles[0]} {top} L40 {gy}"/><path class="dw-cable dw-anim" style="--d:1s" d="M{poles[-1]} {top} L1220 {gy}"/>')
    p.append(f'<g{f(1.05)}><rect class="dw-footing" x="28" y="{gy - 4}" width="24" height="22"/><rect class="dw-footing" x="1208" y="{gy - 4}" width="24" height="22"/></g>')
    net = f"M{poles[0]} {top} " + " ".join(f"Q{(poles[i] + poles[i + 1]) / 2} {top + 14} {poles[i + 1]} {top}" for i in range(len(poles) - 1))
    p.append(f'<path class="dw-netfill dw-fade" style="--d:1.5s" d="{net} V{gy} H{poles[0]} Z"/>')
    p.append(f'<path class="dw-net dw-anim" style="--d:1.2s" d="{net}"/>')
    p.append(f'<path class="dw-net dw-anim" style="--d:1.45s;stroke-width:3;opacity:.7" d="M{poles[-1] + 6} {top} V{gy}"/>')
    p.append(f'<path class="dw-cable dw-anim" style="--d:1.6s;opacity:.55" d="M{poles[0]} 300 H{poles[-1]}"/>')
    for i in range(len(poles) - 1):
        cx = (poles[i] + poles[i + 1]) / 2
        p.append(f'<g{f(1.7 + i * .08)}><path class="dw-trunk" d="M{cx} {gy} V352"/><path class="dw-crown" d="M{cx - 66} 312 C{cx - 70} 262 {cx - 30} 246 {cx} 248 C{cx + 34} 246 {cx + 72} 264 {cx + 66} 312 C{cx + 60} 348 {cx - 60} 350 {cx - 66} 312 Z"/></g>')
    p.append(f'<path class="dw-drip dw-anim" style="--d:2s" d="M{poles[0] + 10} {gy - 3} H{poles[-1] - 10}"/>')
    fx0, fx1 = poles[1] + 30, poles[2] - 30
    p.append(f'<path class="dw-lead dw-fade" style="--d:2.1s" d="M{fx1} {top - 34} H{fx0}" marker-end="url(#ar{"m" if mobile else ""})"/>')
    # dimension lines: span over one bay, height inside the last bay (desktop only)
    dy = 104
    dims = []
    dims.append(f'<g{f(2.15)}><path class="dw-dim" d="M{poles[2]} {dy} H{poles[3]}" marker-start="url(#tk{"m" if mobile else ""})" marker-end="url(#tk{"m" if mobile else ""})"/>'
             f'<path class="dw-ext" d="M{poles[2]} {dy - 8} V{top - 10} M{poles[3]} {dy - 8} V{top - 10}"/>'
             f'<text class="dw-note" x="{(poles[2] + poles[3]) / 2}" y="{dy - 8}" text-anchor="middle">{esc(t(D["span"], L))}</text></g>')
    hx = poles[-1] - 22
    dims.append(f'<g{f(2.2)}><path class="dw-dim" d="M{hx} {top} V{gy}" marker-start="url(#tk{"m" if mobile else ""})" marker-end="url(#tk{"m" if mobile else ""})"/>'
             f'<text class="dw-note" transform="translate({hx - 8} {(top + gy) / 2}) rotate(-90)" text-anchor="middle">{esc(t(D["height"], L))}</text></g>')
    # callouts: anchor point -> numbered tag, two rows (above and below the structure); label x differs by language
    rows = [  # (number, anchor, tag x en, tag x he, tag y)
        (6, (fx0 + 6, top - 34), 230, 430, 56),
        (1, (510, top + 9), 470, 650, 56),
        (2, (1000, top - 6), 1000, 1200, 56),
        (5, (200, 300), 120, 340, 540),
        (3, (630, 400), 560, 820, 540),
        (4, (1190, 355), 990, 1200, 540),
    ]
    if not mobile:
        p.extend(dims)
    if mobile:  # numbers only, every callout re-anchored inside the two-bay crop; the legend below names them
        mrows = [(2, (270, top - 6), 230, 66), (6, (fx0 + 6, top - 34), 420, 66), (1, (510, top + 9), 580, 66),
                 (4, (79, 330), 80, 540), (5, (200, 300), 250, 540), (3, (630, 400), 560, 540)]
        for n, (ax, ay), lx, ly in mrows:
            tip = ly + 20 if ly < ay else ly - 28
            p.append(f'<g{f(2.3 + n * .06)}><path class="dw-lead" d="M{ax} {ay} L{lx} {tip}"/><circle class="dw-dot" cx="{ax}" cy="{ay}" r="6"/>'
                     f'<circle class="dw-tagc" cx="{lx}" cy="{ly - 4}" r="24"/><text class="dw-tag" x="{lx}" y="{ly + 4}" text-anchor="middle" style="font-size:24px">{n}</text></g>')
    for n, (ax, ay), lxe, lxh, ly in ([] if mobile else rows):
        lx = lxh if he else lxe
        name = t(D["items"][n - 1][0], L)
        tip = ly + 9 if ly < ay else ly - 17
        p.append(f'<g{f(2.3 + n * .06)}><path class="dw-lead" d="M{ax} {ay} L{lx} {tip}"/><circle class="dw-dot" cx="{ax}" cy="{ay}" r="4"/>'
                 f'<circle class="dw-tagc" cx="{lx}" cy="{ly - 4}" r="13"/><text class="dw-tag" x="{lx}" y="{ly}" text-anchor="middle">{n}</text>'
                 f'<text class="dw-label" x="{lx - 20 if he else lx + 20}" y="{ly}" text-anchor="start">{esc(name)}</text></g>')
    if not mobile:
        p.append(f'<text class="dw-note" x="{20 if he else 1240}" y="24" text-anchor="end">{esc(t(D["section"], L))}</text>')  # "end" is the left edge in RTL
    desc = " ".join(f"{i + 1}. {tm(a_, L)}: {tm(b_, L)}" for i, (a_, b_) in enumerate(D["items"]))
    k = "m" if mobile else "d"
    vb = "0 20 690 550" if mobile else "0 0 1260 570"
    return (f'<svg class="dw-{k}" viewBox="{vb}" role="img" aria-labelledby="dw-t-{L}{k} dw-d-{L}{k}"><title id="dw-t-{L}{k}">{esc(tm(D["title"], L))}</title><desc id="dw-d-{L}{k}">{esc(desc)}</desc>'
            + "".join(p) + "</svg>")


# ---------------------------------------------------------------- map
MAP = json.loads((SRC / "data/worldmap.json").read_text())


def map_svg(L):
    he = L == "he"
    flip = {"start": "end", "end": "start", "middle": "middle"}  # RTL flips text-anchor, so swap it back in Hebrew
    hx, hy = worldmap.px(C.HQ[1], C.HQ[0])
    marks = []
    for key, lat, lon, m2, en, hb, side in C.MARKETS:
        x, y = worldmap.px(lon, lat)
        r = 4 + (math.sqrt(m2 / 150000) * 9 if m2 else 0)
        val = (f"{m2:,} m²" if not he else f"{m2:,} מ״ר") if m2 else ""
        dx, dy, anchor = {"e": (r + 8, 4, "start"), "w": (-(r + 8), 4, "end"), "s": (0, r + 18, "middle"), "sw": (-(r + 6), r + 14, "end")}[side]
        an = flip[anchor] if he else anchor
        lab = f'<text class="mk-l" x="{x + dx:.1f}" y="{y + dy:.1f}" text-anchor="{an}">{esc(en if not he else hb)}</text>'
        if val:
            lab += f'<text class="mk-v" x="{x + dx:.1f}" y="{y + dy + 15:.1f}" text-anchor="{an}">{esc(val)}</text>'
        marks.append(f'<g><circle class="mk-ring" cx="{x:.1f}" cy="{y:.1f}" r="{r + 5:.1f}"/><circle class="mk" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>{lab}</g>')
    marks.append(f'<g><circle class="hq" cx="{hx:.1f}" cy="{hy:.1f}" r="7"/><text class="mk-l" x="{hx + 12:.1f}" y="{hy + 22:.1f}" text-anchor="{"end" if he else "start"}">{esc(C.HQ[2] if not he else C.HQ[3])}</text></g>')
    body = f'<path class="land" d="{MAP["d"]}"/>{"".join(marks)}'
    label = esc(tm(C.SITE["map_label"], L))
    # on phones the one wide map becomes two stacked crops, so the labels stay readable without sideways scrolling
    panels = [("map-d", f"0 0 {MAP['w']} {MAP['h']}"), ("map-m map-am", "10 125 290 150"), ("map-m map-eu", "385 0 535 250")]
    return "".join(f'<svg class="map {k}" viewBox="{vb}" role="img" aria-label="{label}">{body}</svg>' for k, vb in panels)


def projects_table(L):
    P = C.PAGES["projects"]
    rows = "".join(f'<tr><th scope="row">{esc(en if L == "en" else he)}</th><td>{esc(t(w, L))}</td><td class="n">{f"{a:,}" if a else "–"}</td></tr>' for en, he, w, a in C.PROJECT_ROWS)
    total = sum(a for *_, a in C.PROJECT_ROWS if a)
    return (f'<div class="tbl-scroll"><table class="tbl"><caption>{esc(t(P["tbl_cap"], L))}</caption><thead><tr><th scope="col">{esc(t(P["th_country"], L))}</th><th scope="col">{esc(t(P["th_work"], L))}</th>'
            f'<th scope="col" class="n">{esc(t(P["th_area"], L))}</th></tr></thead><tbody>{rows}</tbody>'
            f'<tfoot><tr><th scope="row" colspan="2">{esc(t(P["total"], L))}</th><td class="n">{total:,}</td></tr></tfoot></table></div>')


# ---------------------------------------------------------------- shared page parts
def jsonld(slug, L, crumbs):
    org = {
        "@type": "Organization", "@id": f"{DOMAIN}/#org", "name": "MIFTAH Projects", "alternateName": "מיפתח פרויקטים",
        "url": DOMAIN + "/", "logo": f"{DOMAIN}/assets/favicon-512.png", "telephone": "+972-4-985-4404",
        "slogan": tm(C.SITE["slogan"], L),
        "address": {"@type": "PostalAddress", "addressLocality": "Kfar Masaryk", "addressCountry": "IL"},
        "areaServed": ["IL", "PT", "ES", "MX", "IN", "HN", "GE", "BY"],
        "knowsAbout": ["Agricultural net houses", "Anti-hail nets", "Banana net houses", "Orchard net houses", "Loading sheds", "Windbreaks", "Turnkey farms"],
        "founder": [{"@type": "Person", "name": "Merav Eyal Hasfel", "jobTitle": "Co-CEO"}, {"@type": "Person", "name": "Yiftach Hasfel", "jobTitle": "Co-CEO"}],
    }
    graph = [org, {"@type": "WebSite", "@id": f"{DOMAIN}/#site", "url": DOMAIN + "/", "name": "MIFTAH Projects", "inLanguage": ["en", "he"], "publisher": {"@id": f"{DOMAIN}/#org"}},
             {"@type": "WebPage", "url": url(slug, L, True), "name": tm(C.PAGES[slug]["title"], L), "inLanguage": L, "isPartOf": {"@id": f"{DOMAIN}/#site"}, "about": {"@id": f"{DOMAIN}/#org"}}]
    if crumbs:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    if slug in ("net-houses", "turnkey-farms"):
        kind = {"net-houses": "Agricultural net house design, manufacture and installation", "turnkey-farms": "Turnkey farm development abroad, delivered with agricultural partners"}[slug]
        graph.append({"@type": "Service", "name": tm(C.PAGES[slug]["h1"], L), "provider": {"@id": f"{DOMAIN}/#org"}, "serviceType": kind})
    if slug == "contact":
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": tm(q, L), "acceptedAnswer": {"@type": "Answer", "text": tm(a, L)}} for q, a in C.FAQ]})
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "</script>"


def head(slug, L, crumbs=None, noindex=False, r=None):
    P = C.PAGES[slug]; r = rel(L) if r is None else r
    links = ""
    if slug != "404":
        links = (f'<link rel="canonical" href="{url(slug, L, True)}">'
                 f'<link rel="alternate" hreflang="en" href="{url(slug, "en", True)}"><link rel="alternate" hreflang="he" href="{url(slug, "he", True)}">'
                 f'<link rel="alternate" hreflang="x-default" href="{url(slug, "en", True)}">')
    pre = f'<link rel="preload" href="{r}assets/fonts/IBMPlexSans-var-latin.woff2?v={FONTV["IBMPlexSans-var-latin.woff2"]}" as="font" type="font/woff2" crossorigin>'
    if L == "he":  # Hebrew pages still need the Latin file for digits, spaces and punctuation
        pre += "".join(f'<link rel="preload" href="{r}assets/fonts/IBMPlexSansHebrew-{w}-hebrew.woff2?v={FONTV[f"IBMPlexSansHebrew-{w}-hebrew.woff2"]}" as="font" type="font/woff2" crossorigin>' for w in (700, 400))
    if slug == "index":
        pre += (f'<link rel="preload" as="image" type="image/avif" href="{r}assets/img/hero-portrait-720.avif" imagesrcset="{r}assets/img/hero-portrait-720.avif 720w" imagesizes="100vw" media="(max-width: 720px) and (orientation: portrait)">'
                f'<link rel="preload" as="image" type="image/avif" href="{r}assets/img/hero-1600.avif" imagesrcset="{r}assets/img/hero-960.avif 960w, {r}assets/img/hero-1600.avif 1600w" imagesizes="100vw" media="not all and (max-width: 720px) and (orientation: portrait)">')
    title, desc = tm(P["title"], L), tm(P["desc"], L)
    return f"""<!DOCTYPE html>
<html lang="{L}" dir="{"ltr" if L == "en" else "rtl"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' if noindex else ""}
{links}
<meta name="theme-color" content="#0E4239">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(tm(C.SITE["name"], L))}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url(slug, L, True)}">
<meta property="og:image" content="{DOMAIN}/assets/img/og-miftah.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="{"en_US" if L == "en" else "he_IL"}"><meta property="og:locale:alternate" content="{"he_IL" if L == "en" else "en_US"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{r}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{r}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{r}assets/favicon-180.png">
<link rel="manifest" href="{r}site.webmanifest">
{pre}
<link rel="stylesheet" href="{r}assets/fonts/fonts.css?v={VER["fonts"]}">
<link rel="stylesheet" href="{r}assets/site.css?v={VER["css"]}">
{jsonld(slug, L, crumbs) if slug != "404" else ""}
{ANALYTICS}
</head>"""


def header(slug, L):
    alt = "he" if L == "en" else "en"
    other = ("he/" if L == "en" else "../") + ("index.html" if slug in ("index", "404") else f"{slug}.html")
    items = "".join(f'<li><a href="{s}.html"{" aria-current=" + chr(34) + "page" + chr(34) if s == slug else ""}>{esc(en if L == "en" else he)}</a></li>' for s, en, he in C.NAV)
    return f"""<body>
<a class="skip" href="#main">{esc(t(C.SITE["skip"], L))}</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="index.html" aria-label="{esc(tm(C.SITE["name"], L))}, {esc(tm(C.SITE["home"], L))}">{logo(L)}</a>
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
    tb = "".join(f'<div><b>{esc(t(k, L))}</b>{esc(t(v, L))}</div>' for k, v in S["tb"])
    return f"""<footer class="site-foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <span class="plate">{logo(L)}</span>
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
        <ul class="foot-legal"><li><a href="privacy.html">{esc(t(S["foot_legal"], L))}</a></li><li><a href="accessibility.html">{esc(t(S["foot_a11y"], L))}</a></li></ul>
      </div>
    </div>
    <div class="titleblock" aria-hidden="true">{tb}</div>
    <p class="small rights">{esc(t(S["rights"], L).format(y=YEAR))}</p>
  </div>
</footer>
<script src="{rel(L)}assets/site.js?v={VER["js"]}" defer></script>
</body>
</html>
"""


def page_head(slug, L, img=None):
    P = C.PAGES[slug]
    crumbs = f'<nav class="crumbs" aria-label="{"Breadcrumb" if L == "en" else "פירורי לחם"}"><ol><li><a href="index.html">{esc(t(C.SITE["home"], L))}</a></li><li aria-current="page">{esc(t(P["h1"], L))}</li></ol></nav>'
    lead = f'<p class="lead">{esc(t(P["lead"], L))}</p>' if "lead" in P else ""
    if img:
        name, cap = img
        fig = f'<figure class="ph-fig">{picture(name, tm(cap, L), L, sizes="(max-width: 900px) 100vw, 560px", archive=True)}<figcaption>{esc(t(cap, L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure>'
        return f'<section class="page-head has-img"><div class="wrap ph-grid"><div>{crumbs}<h1>{esc(t(P["h1"], L))}</h1>{lead}</div>{fig}</div></section>'
    return f'<section class="page-head"><div class="wrap">{crumbs}<h1>{esc(t(P["h1"], L))}</h1>{lead}</div></section>'


def cta_band(L, where):
    B = C.CTA_BAND; S = C.SITE
    return f"""<section class="section dark cta-band" aria-labelledby="cta-{where}">
  <div class="wrap in">
    <div>
      <h2 id="cta-{where}">{esc(t(C.CTA_HEADS[where], L))}</h2>
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


def steps(L, photos=True):
    """Process steps, each with its real photo on Home; text only on Net houses, so the photos aren't shown twice."""
    lis = []
    for i, (img, h, p, cap) in enumerate(C.STEPS):
        fig = f'<figure>{picture(img, tm(cap, L), L, sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 300px", archive=True)}<figcaption>{esc(t(cap, L))}</figcaption></figure>' if photos else ""
        lis.append(f'<li>{fig}<span class="n">{i + 1:02d}</span><h3>{esc(t(h, L))}</h3><p>{esc(t(p, L))}</p></li>')
    return f'<ol class="steps{"" if photos else " plain"}">{"".join(lis)}</ol>'


def featured(L):
    P = C.PAGES["projects"]
    rows = "".join(f'<tr><th scope="row">{esc(t(c, L))}</th><td>{esc(t(w, L))}</td><td>{esc(t(r, L))}</td></tr>' for c, r, w in C.FEATURED)
    ths = "".join(f'<th scope="col">{esc(x)}</th>' for x in tm(P["feat_th"], L))
    return f'<div class="tbl-scroll"><table class="tbl"><thead><tr>{ths}</tr></thead><tbody>{rows}</tbody></table></div>'


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
  <div class="hero-media" aria-hidden="true">{poster}<video id="hero-video" muted loop playsinline preload="none" {vids}></video></div>
  <div class="wrap hero-in">
    <h1 id="hero-h">{esc(t(P["h1"], L))}</h1>
    <p class="lead">{esc(t(P["lead"], L))}</p>
    <div class="actions">
      <a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="hero">{esc(t(S["cta"], L))}</a>
      <a class="btn btn-line" href="turnkey-farms.html" data-track="route_click" data-label="hero-investors">{esc(t(P["cta2"], L))}</a>
    </div>
    <div class="hero-foot"><span>{esc(t(P["vidcap"], L))}</span><button class="vid-btn" type="button" data-video="hero-video" data-play="{esc(t(S["video_play"], L))}" data-pause="{esc(t(S["video_pause"], L))}"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg><span>{esc(t(S["video_play"], L))}</span></button></div>
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
        <a class="go" href="net-houses.html" data-track="route_click" data-label="growers">{esc(t(P["r1_go"], L))}</a>
      </div>
      <div class="route invest">
        <span class="who">{esc(t(P["r2_who"], L))}</span>
        <h3>{esc(t(P["r2_h"], L))}</h3>
        <p class="muted">{esc(t(P["r2_p"], L))}</p>
        <p class="min">{esc(t(P["r2_min"], L))}</p>
        <a class="go" href="turnkey-farms.html" data-track="route_click" data-label="investors">{esc(t(P["r2_go"], L))}</a>
      </div>
    </div>
  </div>
</section>

<section class="section white" aria-labelledby="draw-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="draw-h">{esc(t(P["draw_h"], L))}</h2><p class="lead">{esc(t(P["draw_p"], L))}</p></div>
    {fig}
    <div class="legend-wrap">{legend}</div>
  </div>
</section>

<section class="section" aria-labelledby="steps-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="steps-h">{esc(t(P["steps_h"], L))}</h2><p class="lead">{esc(t(P["steps_p"], L))}</p></div>
    {steps(L)}
  </div>
</section>

<section class="section white" aria-labelledby="map-h">
  <div class="wrap">
    <div class="split map-head">
      <h2 id="map-h">{esc(t(P["map_h"], L))}</h2>
      <div><p class="lead">{esc(t(P["map_p"], L))}</p><p class="more"><a href="projects.html">{esc(t(P["map_go"], L))}</a></p></div>
    </div>
    {map_svg(L)}
  </div>
</section>

<section class="section why" aria-labelledby="why-h">
  <div class="wrap">
    <h2 id="why-h" class="h-small">{esc(t(P["why_h"], L))}</h2>
    <p class="statement big">{esc(t(P["why_statement"], L))}</p><p class="muted refs">{esc(t(P["why_refs"], L))}</p>
  </div>
</section>
{cta_band(L, "home")}
</main>"""


def p_net(L):
    P = C.PAGES["net-houses"]
    fig, legend = drawing(L, animate=False)
    types = "".join(f'<article class="type" id="{ty["id"]}"><div><h3>{esc(t(ty["h"], L))}</h3><p class="crops">{esc(t(ty["crops"], L))}</p></div>'
                    f'<div><dl>{"".join(f"<dt>{esc(t(a, L))}</dt><dd>{esc(t(b, L))}</dd>" for a, b in ty["rows"])}</dl></div></article>' for ty in C.TYPES)
    return f"""
<main id="main">
{page_head("net-houses", L, img=("forest", C.TYPES[1]["cap"]))}
<section class="section" aria-labelledby="types-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="types-h">{esc(t(P["types_h"], L))}</h2></div>
    <div class="types">{types}</div>
  </div>
</section>
<section class="section white" aria-labelledby="draw-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="draw-h">{esc(t(P["draw_h"], L))}</h2></div>
    {fig}
    <div class="split" style="margin-top:28px"><div class="legend-wrap one">{legend}</div><div><h3>{esc(t(P["site_h"], L))}</h3><p class="muted" style="margin-top:8px">{esc(t(P["site_p"], L))}</p></div></div>
  </div>
</section>
<section class="section" aria-labelledby="steps-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="steps-h">{esc(t(P["steps_h"], L))}</h2><p class="lead">{esc(t(P["steps_p"], L))}</p></div>
    {steps(L, photos=False)}
    <figure class="band-photo">{picture("p-poles", tm(C.STEPS[2][3], L), L, sizes="(max-width: 1280px) 100vw, 1240px", archive=True, widths=(640, 1024, 1600))}<figcaption>{esc(t(C.STEPS[2][3], L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure>
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
{page_head("turnkey-farms", L, img=("valley", C.TYPES[0]["cap"]))}
<section class="section" aria-labelledby="honest-h">
  <div class="wrap split">
    <div>
      <h2 id="honest-h" class="h-small">{esc(t(P["honest_h"], L))}</h2><p class="lead" style="margin-top:10px">{esc(t(P["honest_p"], L))}</p>
      <h2 class="h-small" style="margin-top:28px">{esc(t(P["pt_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["pt_p"], L))}</p>
    </div>
    <div>
      <h2 class="h-small">{esc(t(P["start_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["start_p"], L))}</p>
      <h2 class="h-small" style="margin-top:28px">{esc(t(P["where_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["where_p"], L))}</p>
    </div>
  </div>
</section>
<section class="section dark" aria-labelledby="stages-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="stages-h">{esc(t(P["stages_h"], L))}</h2><p class="lead">{esc(t(P["stages_p"], L))}</p></div>
    <div class="phases">{"".join(phases)}</div>
    <div class="excl">
      <div><h3>{esc(t(P["excl_h"], L))}</h3><ul><li>{esc(t(P["excl_1"], L))}</li><li>{esc(t(P["excl_2"], L))}</li></ul></div>
      <div><h3>{esc(t(P["mistake_h"], L))}</h3><p>{esc(t(P["mistake_p"], L))}</p></div>
    </div>
  </div>
</section>
<section class="section white" aria-labelledby="core-h">
  <div class="wrap split">
    <h2 id="core-h">{esc(t(P["core_h"], L))}</h2>
    <div><p class="lead">{esc(t(P["core_p"], L))}</p><p class="more"><a href="net-houses.html">{esc(t(P["core_go"], L))}</a></p></div>
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
    {map_svg(L)}
    <div class="proj-table">{projects_table(L)}</div>
  </div>
</section>
<section class="section" aria-labelledby="feat-h">
  <div class="wrap split">
    <div><h2 id="feat-h">{esc(t(P["feat_h"], L))}</h2><p class="muted" style="margin-top:14px">{esc(t(P["feat_p"], L))}</p></div>
    <div>{featured(L)}</div>
  </div>
</section>
<section class="section white" aria-label="{"Photos" if L == "en" else "תמונות"}">
  <div class="wrap">
    <div class="series two">
      <figure>{picture("p-closed", tm(C.STEPS[3][3], L), L, sizes="(max-width: 620px) 100vw, 620px", archive=True)}<figcaption><span>{esc(t(C.STEPS[3][3], L))}. {esc(t(C.SITE["archive"], L))}.</span></figcaption></figure>
      <figure>{picture("p-site", tm(C.STEPS[0][3], L), L, sizes="(max-width: 620px) 100vw, 620px", archive=True)}<figcaption><span>{esc(t(C.STEPS[0][3], L))}. {esc(t(C.SITE["archive"], L))}.</span></figcaption></figure>
    </div>
  </div>
</section>
{cta_band(L, "projects")}
</main>"""


def p_about(L):
    P = C.PAGES["about"]; S = C.SITE
    company = [(("Name", "שם"), t(S["name"], L) + (" (מיפתח פרויקטים)" if L == "en" else "")), (("Office", "משרד"), t(S["town"], L)),
               (("Phone", "טלפון"), None),
               (("Management", "הנהלה"), t(P["merav"], L) + (" and " if L == "en" else " ו") + t(P["yiftach"], L) + (", co-CEOs" if L == "en" else ", מנכ״לים משותפים"))]
    phone = f'<a href="tel:{S["phone_tel"]}" data-where="about"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a>'
    rows = "".join(f'<tr><th scope="row">{esc(t(k, L))}</th><td>{phone if v is None else esc(v)}</td></tr>' for k, v in company)
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
    <div><h2 id="how-h">{esc(t(P["how_h"], L))}</h2><p class="lead" style="margin-top:14px">{esc(t(P["how_p"], L))}</p>
      <figure class="ph-fig" style="margin-top:28px">{picture("p-marking", tm(C.STEPS[1][3], L), L, sizes="(max-width: 960px) 100vw, 600px", archive=True)}<figcaption>{esc(t(C.STEPS[1][3], L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure></div>
    <div><h2 class="h-small" id="co-h">{esc(t(P["company_h"], L))}</h2><table class="tbl" aria-labelledby="co-h" style="margin-top:12px"><tbody>{rows}</tbody></table></div>
  </div>
</section>
<section class="section" aria-labelledby="values-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="values-h">{esc(t(P["values_h"], L))}</h2><p class="statement">{esc(t(C.PAGES["index"]["why_statement"], L))}</p></div>
    <ul class="values">{"".join(f'<li><b>{esc(t(a, L))}</b><span>{esc(t(b, L))}</span></li>' for a, b in C.VALUES)}</ul>
  </div>
</section>
{cta_band(L, "about")}
</main>"""


def choices(name, items, L, legend):
    lis = "".join(f'<label class="choice"><input type="radio" name="{name}" value="{v}"><span><b>{esc(t(a, L))}</b><small>{esc(t(b, L))}</small></span></label>' for v, a, b in items)
    return f'<fieldset class="field full"><legend>{esc(t(legend, L))}</legend><div class="choices">{lis}</div></fieldset>'


def select(name, label, items, L, req=False):
    opts = "".join(f'<option value="{v}">{esc(tm(x, L))}</option>' for v, x in items)  # tm: no invisible isolates in submitted text
    r = ' required aria-required="true"' if req else ""
    return f'<div class="field"><label for="f-{name}">{esc(t(label, L))}</label><select id="f-{name}" name="{name}"{r}>{opts}</select></div>'


def inp(name, label, L, typ="text", req=False, auto="", hint=None):
    a = f' autocomplete="{auto}"' if auto else ""
    r = ' required aria-required="true"' if req else ""
    h = f'<span class="hint" id="f-{name}-h">{esc(t(hint, L))}</span>' if hint else ""
    db = f' aria-describedby="f-{name}-h"' if hint else ""
    d = ' dir="ltr"' if typ in ("email", "tel") else ""
    return f'<div class="field"><label for="f-{name}">{esc(t(label, L))}</label><input id="f-{name}" name="{name}" type="{typ}"{a}{r}{db}{d}>{h}</div>'


def form_msg(L):
    """The form script's messages and summary labels, from content.py, as JSON for a data attribute."""
    ph = tm(C.SITE["phone_display"], L)
    m = {k: tm(v, L).replace("{phone}", ph) for k, v in C.FORM_MSG.items()}
    m["keys"] = [[tm(lab, L), k] for k, lab in C.FORM_BRIEF_KEYS]
    return json.dumps(m, ensure_ascii=False, separators=(",", ":"))


def p_contact(L):
    P = C.PAGES["contact"]; F = C.FORM; S = C.SITE
    consent = esc(t(F["consent"], L)).replace("{privacy}", f'<a href="privacy.html">{esc(t(F["privacy_link"], L))}</a>')
    form = f"""<form class="form" id="review-form" method="post" action="{esc(FORM_ENDPOINT) or "contact.html"}" data-endpoint="{esc(FORM_ENDPOINT)}" data-tel="{S["phone_tel"]}" data-msg="{esc(form_msg(L))}" novalidate aria-labelledby="form-h">
  <noscript><p class="form-status bad">{esc(t(S["noscript"], L))}</p></noscript>
  <div><h2 id="form-h" class="h-small">{esc(t(F["h"], L))}</h2><p class="small muted" style="margin-top:6px">{esc(t(F["req"], L))}</p></div>
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
    <div class="hp" aria-hidden="true"><label for="f-website">{esc(t(F["honeypot"], L))}</label><input id="f-website" name="mt_hp" type="text" tabindex="-1" autocomplete="off"></div>
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
<section class="section white" aria-labelledby="faq-h">
  <div class="wrap split">
    <h2 id="faq-h">{esc(t(C.FAQ_H, L))}</h2>
    <div class="faq">{"".join(f'<details><summary>{esc(t(q, L))}</summary><p>{esc(t(a, L))}</p></details>' for q, a in C.FAQ)}</div>
  </div>
</section>
</main>"""


def p_profile(L):
    P = C.PAGES["profile"]; S = C.SITE
    facts = "".join(f'<div><b>{esc(t(a, L))}</b>{esc(t(b, L))}</div>' for a, b in C.FACTS)
    svc = "".join(f'<li><b>{esc(t(ty["h"], L))}</b>: {esc(t(ty["rows"][0][1], L))}</li>' for ty in C.TYPES)
    stg = ", ".join(t(x[0], L) for _, items in C.STAGES for x in items)
    proc = "".join(f'<li>{esc(t(h, L))}</li>' for _, h, _, _ in C.STEPS)
    qr_alt = "QR code for www.miftah.co.il" if L == "en" else "קוד QR לאתר www.miftah.co.il"
    return f"""
<main id="main">
<div class="wrap no-print"><div class="profile-bar"><p class="muted">{esc(t(P["bar_p"], L))}</p><button class="btn btn-primary" type="button" id="print-btn">{esc(t(P["print"], L))}</button></div></div>
<article class="sheet" aria-labelledby="p-h">
  <header class="p-head"><div><h1 id="p-h">{esc(t(S["name"], L))}</h1><p class="lead">{esc(t(S["slogan"], L))}</p></div>{logo(L)}</header>
  <p class="p-who">{esc(t(P["who"], L))}</p>
  <div class="facts-p">{facts}</div>
  <div class="cols">
    <section><h2>{esc(t(P["svc_h"], L))}</h2><ul>{svc}</ul></section>
    <section><h2>{esc(t(P["proc_h"], L))}</h2><ol class="p-proc">{proc}</ol>
      <h2>{esc(t(P["turn_h"], L))}</h2><p class="small">{esc(stg)}.</p></section>
  </div>
  <section><h2>{esc(t(P["proj_h"], L))}</h2>{projects_table(L)}</section>
  <section class="p-contact"><div><h2>{esc(t(P["contact_h"], L))}</h2><p><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi> &nbsp;|&nbsp; {esc(t(S["town"], L))} &nbsp;|&nbsp; <span class="ltr">{esc(t(P["web"], L))}</span></p></div>
    <img src="{rel(L)}assets/qr-site.svg" width="84" height="84" alt="{esc(qr_alt)}"></section>
</article>
<div class="sheet-gap"></div>
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
    return f"""
<main id="main"><section class="section"><div class="wrap nf"><h1>{esc(t(P["h1"], L))}</h1><p class="lead">{esc(t(P["p"], L))}</p><ul><li><a href="index.html">{esc(t(C.SITE["home"], L))}</a></li>{links}</ul></div></section></main>"""


def rootify(s, L):
    """The 404 page is served at any depth, so make its links and assets absolute from the site root."""
    base = "/" if L == "en" else "/he/"
    s = re.sub(r'(href|src)="(\.\./)?assets/', r'\1="/assets/', s)
    s = re.sub(r'href="([a-z0-9-]+\.html)"', lambda m: f'href="{base}{m.group(1)}"', s)
    s = s.replace('href="he/', 'href="/he/').replace('href="../', 'href="/').replace('href="site.webmanifest"', 'href="/site.webmanifest"')
    return s


RENDER = {"index": p_index, "net-houses": p_net, "turnkey-farms": p_turnkey, "projects": p_projects, "about": p_about,
          "contact": p_contact, "profile": p_profile,
          "privacy": lambda L: p_prose("privacy", L, C.PRIVACY), "accessibility": lambda L: p_prose("accessibility", L, C.A11Y)}


def crumbs_for(slug, L):
    if slug == "index":
        return None
    return [(tm(C.SITE["home"], L), url("index", L, True)), (tm(C.PAGES[slug]["h1"], L), url(slug, L, True))]


def write(path, s):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(s, encoding="utf-8")


VER = {}


def main():
    A = PUB / "assets"
    A.mkdir(parents=True, exist_ok=True)
    shutil.copy(SRC / "assets/site.css", A / "site.css")
    shutil.copy(SRC / "assets/site.js", A / "site.js")
    shutil.copytree(SRC / "assets/fonts", A / "fonts", dirs_exist_ok=True)
    for f in (SRC / "assets/icons").iterdir():
        shutil.copy(f, A / f.name)
    shutil.copy(SRC.parents[1] / "images/miftah-mark.svg", A / "favicon.svg")
    for w in (A / "fonts").glob("*.woff2"):
        FONTV[w.name] = ver(w)
    fc = A / "fonts/fonts.css"
    fc.write_text(re.sub(r"url\(\.\./fonts/([\w-]+\.woff2)\)", lambda m: f"url(../fonts/{m.group(1)}?v={FONTV[m.group(1)]})", fc.read_text()))
    VER.update(css=ver(A / "site.css"), js=ver(A / "site.js"), fonts=ver(fc))
    for L in LANGS:
        base = PUB if L == "en" else PUB / "he"
        for slug in PAGES:
            write(base / ("index.html" if slug == "index" else f"{slug}.html"),
                  head(slug, L, crumbs_for(slug, L), noindex=(slug == "profile")) + header(slug, L) + RENDER[slug](L) + footer(L))
        write(base / "404.html", rootify(head("404", L, noindex=True) + header("404", L) + p_404(L) + footer(L), L))
    # sitemap: lastmod is the date of the last commit to the source, not the build date
    lastmod = SOURCE_DATE.isoformat()
    urls = []
    for slug in PAGES:
        if slug == "profile":
            continue
        for L in LANGS:
            alts = "".join(f'<xhtml:link rel="alternate" hreflang="{a}" href="{url(slug, a, True)}"/>' for a in LANGS) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{url(slug, "en", True)}"/>'
            urls.append(f"<url><loc>{url(slug, L, True)}</loc><lastmod>{lastmod}</lastmod>{alts}</url>")
    write(PUB / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(urls) + "\n</urlset>\n")
    write(PUB / "robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    write(PUB / "site.webmanifest", json.dumps({"name": "MIFTAH Projects", "short_name": "MIFTAH", "start_url": "/", "display": "browser", "background_color": "#F2F5F3", "theme_color": "#0E4239",
                                               "icons": [{"src": "/assets/favicon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/favicon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=1))
    EP = " " + "/".join(FORM_ENDPOINT.split("/")[:3]) if FORM_ENDPOINT else ""  # the form endpoint's origin, allowed by the CSP
    # host config for Apache (Nethost): 404 pages per language and cache headers
    write(PUB / ".htaccess", "ErrorDocument 404 /404.html\n<If \"%{REQUEST_URI} =~ m#^/he/#\">\n  ErrorDocument 404 /he/404.html\n</If>\n"
          "<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType text/html \"access plus 10 minutes\"\n  ExpiresByType text/css \"access plus 1 year\"\n  ExpiresByType application/javascript \"access plus 1 year\"\n"
          "  ExpiresByType font/woff2 \"access plus 1 year\"\n  ExpiresByType image/avif \"access plus 1 month\"\n  ExpiresByType image/webp \"access plus 1 month\"\n  ExpiresByType image/jpeg \"access plus 1 month\"\n  ExpiresByType video/mp4 \"access plus 1 month\"\n  ExpiresByType video/webm \"access plus 1 month\"\n</IfModule>\n"
          "<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml application/xml application/manifest+json text/plain\n</IfModule>\n"
          "<IfModule mod_headers.c>\n  Header always set X-Content-Type-Options \"nosniff\"\n  Header always set Referrer-Policy \"strict-origin-when-cross-origin\"\n"
          "  Header always set Content-Security-Policy \"default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'" + EP + "; frame-ancestors 'self'; form-action 'self'" + EP + "; base-uri 'self'\"\n</IfModule>\n"
          "# Turn on once HTTPS works on www.miftah.co.il (release checklist). HSTS only after the redirect is confirmed.\n"
          "# RewriteEngine On\n# RewriteCond %{HTTPS} off [OR]\n# RewriteCond %{HTTP_HOST} !^www\\. [NC]\n# RewriteRule ^ https://www.miftah.co.il%{REQUEST_URI} [L,R=301]\n"
          "# Header always set Strict-Transport-Security \"max-age=31536000\"\n")
    print(f"built {len(list(PUB.rglob('*.html')))} pages into {PUB}")


if __name__ == "__main__":
    main()
