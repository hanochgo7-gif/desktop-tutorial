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
# The address Google indexes: canonical, hreflang, sitemap, Open Graph and structured data all use it.
# When www.miftah.co.il points to this site, set it here, rebuild, and 301-redirect the vercel.app address to it in Vercel.
DOMAIN = "https://miftah-site.vercel.app"
FINAL_DOMAIN = "https://www.miftah.co.il"
GOOGLE_VERIFY = ""          # the content="" value of Search Console's HTML-tag verification, once the owner creates the property
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
PAGES = ["index", "net-houses", "how-we-build", "turnkey-farms", "projects", "about", "contact", "profile", "privacy", "accessibility"]


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
def picture(name, alt, L, sizes="100vw", archive=False, widths=(640, 1024, 1600), eager=False):
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
            f'<img src="{r}assets/img/{name}-{have[min(1, len(have) - 1)]}.jpg" srcset="{srcset("jpg")}" sizes="{sizes}" width="{w0}" height="{h0}" alt="{esc(alt)}"{' fetchpriority="high"' if eager else ' loading="lazy" decoding="async"'}{cls}></picture>')


# ---------------------------------------------------------------- signature: the section drawing
def drawing(L, animate=True, sfx=""):
    """The section drawing: a full desktop version and a two-bay phone version with larger labels, plus the legend."""
    D = C.DRAWING
    legend = "".join(f'<li><span class="k">{i + 1}</span><div><b>{esc(t(a_, L))}</b><span>{esc(t(b_, L))}</span></div></li>' for i, (a_, b_) in enumerate(D["items"]))
    fig = (f'<figure class="drawing"{" data-animate" if animate else ""}>{_drawing_svg(L, False, sfx)}{_drawing_svg(L, True, sfx)}'
           f'<figcaption><span>{esc(t(D["caption"], L))}</span></figcaption></figure>')
    return fig, f'<ol class="legend">{legend}</ol>'


def _drawing_svg(L, mobile, sfx=""):
    """A section through a net house, drawn as a shop drawing: hatched soil, footings, dimension lines, numbered callouts.
    The phone version crops to the first two bays and keeps only the callouts that fall inside, at a readable size."""
    D = C.DRAWING; he = L == "he"; mk = ("m" if mobile else "") + sfx; W = 690 if mobile else 1260
    poles = [150, 390, 630, 870, 1110]
    top, gy = 150, 430
    p = []
    f = lambda d: f' class="dw-fade" style="--d:{d:.2f}s"'
    p.append(f'<defs><pattern id="hatch{mk}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V12" stroke="#CDBFA4" stroke-width="2"/></pattern>'
             f'<marker id="ar{mk}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0E4239"/></marker>'
             f'<marker id="tk{mk}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M5 0V10" stroke="#4B605B" stroke-width="1.5"/></marker></defs>')
    p.append(f'<rect x="0" y="{gy}" width="1260" height="70" fill="url(#hatch{mk})"/>')
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
    # the crop under the net: round orchard trees by default; banana plants and a kiwi pergola for the crop selector
    trees, bananas, pergola = [], [], []
    for i in range(len(poles) - 1):
        cx = (poles[i] + poles[i + 1]) / 2
        trees.append(f'<g{f(1.7 + i * .08)}><path class="dw-trunk" d="M{cx} {gy} V352"/><path class="dw-crown" d="M{cx - 66} 312 C{cx - 70} 262 {cx - 30} 246 {cx} 248 C{cx + 34} 246 {cx + 72} 264 {cx + 66} 312 C{cx + 60} 348 {cx - 60} 350 {cx - 66} 312 Z"/></g>')
        for bx in (cx - 52, cx + 52):
            bananas.append(f'<path class="dw-stem" d="M{bx} {gy} V320"/><path class="dw-leaf" d="M{bx} 320 q-46 -34 -92 -6 M{bx} 320 q46 -34 92 -6 M{bx} 320 q-28 -58 -62 -78 M{bx} 320 q28 -58 62 -78 M{bx} 320 q-4 -60 -2 -96"/>')
            pergola.append(f'<path class="dw-trunk" d="M{bx} {gy} V300"/>')
        pergola.append(f'<path class="dw-crown" d="M{cx - 110} 300 C{cx - 96} 280 {cx - 70} 284 {cx - 55} 290 C{cx - 30} 276 {cx} 280 {cx + 10} 288 C{cx + 34} 276 {cx + 70} 282 {cx + 110} 300 Z"/>')
    p.append(f'<g class="cr cr-trees">{"".join(trees)}</g><g class="cr cr-banana">{"".join(bananas)}</g><g class="cr cr-pergola">{"".join(pergola)}</g>')
    p.append(f'<path class="dw-drip dw-anim" style="--d:2s" d="M{poles[0] + 10} {gy - 3} H{poles[-1] - 10}"/>')
    fx0, fx1 = poles[1] + 30, poles[2] - 30
    fold = " ".join(f"l{8 if i % 2 == 0 else -8} 5" for i in range(4))  # a net folded into pleats
    p.append(f'<g class="cr cr-fold"><g class="dw-fade" style="--d:2.1s"><path class="dw-foldnet" d="M{fx1} {top - 34} H{fx0 + 14}" marker-end="url(#ar{mk})"/>'
             f'<path class="dw-fold" d="M{fx0 - 4} {top - 44} {fold}"/></g></g>')
    # dimension lines: span over one bay, height inside the last bay (desktop only)
    dy = 104
    dims = []
    dims.append(f'<g{f(2.15)}><path class="dw-dim" d="M{poles[2]} {dy} H{poles[3]}" marker-start="url(#tk{mk})" marker-end="url(#tk{mk})"/>'
             f'<path class="dw-ext" d="M{poles[2]} {dy - 8} V{top - 10} M{poles[3]} {dy - 8} V{top - 10}"/>'
             f'<text class="dw-note" x="{(poles[2] + poles[3]) / 2}" y="{dy - 8}" text-anchor="middle">{esc(t(D["span"], L))}</text></g>')
    hx = poles[-1] - 22
    dims.append(f'<g{f(2.2)}><path class="dw-dim" d="M{hx} {top} V{gy}" marker-start="url(#tk{mk})" marker-end="url(#tk{mk})"/>'
             f'<text class="dw-note" transform="translate({hx - 8} {(top + gy) / 2}) rotate(-90)" text-anchor="middle">{esc(t(D["height"], L))}</text></g>')
    # callouts: anchor point -> numbered tag, two rows (above and below the structure); label x differs by language
    rows = [  # (number, anchor, tag x en, tag x he, tag y)
        (6, (fx0, top - 30), 230, 430, 56),
        (1, (510, top + 9), 470, 650, 56),
        (2, (1000, top - 6), 1000, 1200, 56),
        (5, (200, 300), 120, 340, 540),
        (3, (630, 400), 560, 820, 540),
        (4, (1190, 355), 990, 1200, 540),
    ]
    if not mobile:
        p.extend(dims)
    if mobile:  # numbers only, every callout re-anchored inside the two-bay crop; the legend below names them
        mrows = [(2, (270, top - 6), 230, 66), (6, (fx0, top - 30), 420, 66), (1, (510, top + 9), 580, 66),
                 (4, (79, 330), 80, 540), (5, (200, 300), 250, 540), (3, (630, 400), 560, 540)]
        for n, (ax, ay), lx, ly in mrows:
            tip = ly + 20 if ly < ay else ly - 28
            p.append(f'<g class="co co-{n}"><g{f(2.3 + n * .06)}><path class="dw-lead" d="M{ax} {ay} L{lx} {tip}"/><circle class="dw-dot" cx="{ax}" cy="{ay}" r="6"/>'
                     f'<circle class="dw-tagc" cx="{lx}" cy="{ly - 4}" r="24"/><text class="dw-tag" x="{lx}" y="{ly + 4}" text-anchor="middle" style="font-size:24px">{n}</text></g></g>')
    for n, (ax, ay), lxe, lxh, ly in ([] if mobile else rows):
        lx = lxh if he else lxe
        name = t(D["items"][n - 1][0], L)
        tip = ly + 9 if ly < ay else ly - 17
        p.append(f'<g class="co co-{n}"><g{f(2.3 + n * .06)}><path class="dw-lead" d="M{ax} {ay} L{lx} {tip}"/><circle class="dw-dot" cx="{ax}" cy="{ay}" r="4"/>'
                 f'<circle class="dw-tagc" cx="{lx}" cy="{ly - 4}" r="13"/><text class="dw-tag" x="{lx}" y="{ly}" text-anchor="middle">{n}</text>'
                 f'<text class="dw-label" x="{lx - 20 if he else lx + 20}" y="{ly}" text-anchor="start">{esc(name)}</text></g></g>')
    if not mobile:
        p.append(f'<text class="dw-note" x="{20 if he else 1240}" y="24" text-anchor="end">{esc(t(D["section"], L))}</text>')  # "end" is the left edge in RTL
    desc = " ".join(f"{i + 1}. {tm(a_, L)}: {tm(b_, L)}" for i, (a_, b_) in enumerate(D["items"]))
    k = ("m" if mobile else "d") + sfx
    vb = "0 20 690 550" if mobile else "0 0 1260 570"
    return (f'<svg class="dw-{"m" if mobile else "d"}" viewBox="{vb}" role="img" aria-labelledby="dw-t-{L}{k} dw-d-{L}{k}"><title id="dw-t-{L}{k}">{esc(tm(D["title"], L))}</title><desc id="dw-d-{L}{k}">{esc(desc)}</desc>'
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
        val = (f"{m2 / 10000:g} ha" if not he else f"{m2 / 1000:g} דונם") if m2 else ""
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
    rows = "".join(f'<tr><th scope="row">{esc(en if L == "en" else he)}</th><td>{esc(t(w, L))}</td><td class="n">{(f"{a / 10000:g}" if L == "en" else f"{a / 1000:g}") if a else "–"}</td></tr>' for en, he, w, a in C.PROJECT_ROWS)
    total = sum(a for *_, a in C.PROJECT_ROWS if a)
    return (f'<div class="tbl-scroll"><table class="tbl"><caption>{esc(t(P["tbl_cap"], L))}</caption><thead><tr><th scope="col">{esc(t(P["th_country"], L))}</th><th scope="col">{esc(t(P["th_work"], L))}</th>'
            f'<th scope="col" class="n">{esc(t(P["th_area"], L))}</th></tr></thead><tbody>{rows}</tbody>'
            f'<tfoot><tr><th scope="row" colspan="2">{esc(t(P["total"], L))}</th><td class="n">{f"{total / 10000:g}" if L == "en" else f"{total / 1000:g}"}</td></tr></tfoot></table></div>')


# ---------------------------------------------------------------- shared page parts
def jsonld(slug, L, crumbs):
    org = {
        "@type": "Organization", "@id": f"{DOMAIN}/#org", "name": "MIFTAH Projects", "alternateName": "מיפתח פרויקטים",
        "url": DOMAIN + "/", "logo": f"{DOMAIN}/assets/favicon-512.png", "telephone": "+972-4-985-4404",
        "slogan": tm(C.SITE["slogan"], L),
        "address": {"@type": "PostalAddress", "addressLocality": "Kfar Masaryk", "addressCountry": "IL"},
        "areaServed": ["IL", "PT", "ES", "MX", "IN", "HN", "GE", "BY"],
        "knowsAbout": ["Agricultural net houses", "Anti-hail nets", "Banana net houses", "Orchard net houses", "Loading sheds", "Windbreaks", "Turnkey farms"],
        "employee": [{"@type": "Person", "name": "Merav Eyal Hasfel", "jobTitle": "Co-CEO and owner"}, {"@type": "Person", "name": "Yiftach Hasfel", "jobTitle": "Co-CEO and owner"}],
        "image": f"{DOMAIN}/assets/img/og-miftah.jpg", "description": tm(C.PAGES["index"]["desc"], L),
        "contactPoint": {"@type": "ContactPoint", "telephone": "+972-4-985-4404", "contactType": "sales", "availableLanguage": ["he", "en"], "areaServed": ["IL", "PT", "ES", "MX", "IN", "HN", "GE", "BY"]},
    }
    graph = [org, {"@type": "WebSite", "@id": f"{DOMAIN}/#site", "url": DOMAIN + "/", "name": "MIFTAH Projects", "inLanguage": ["en", "he"], "publisher": {"@id": f"{DOMAIN}/#org"}},
             {"@type": "WebPage", "url": url(slug, L, True), "name": tm(C.PAGES[slug]["title"], L), "inLanguage": L, "isPartOf": {"@id": f"{DOMAIN}/#site"}, "about": {"@id": f"{DOMAIN}/#org"}}]
    if crumbs:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    if slug in ("net-houses", "turnkey-farms"):
        kind = {"net-houses": "Agricultural net house design, manufacture and installation", "turnkey-farms": "Turnkey farm development abroad, delivered with agricultural partners"}[slug]
        graph.append({"@type": "Service", "name": tm(C.PAGES[slug]["h1"], L), "provider": {"@id": f"{DOMAIN}/#org"}, "serviceType": kind})
    if slug == "index":
        graph.append({"@type": "VideoObject", "name": tm(C.PAGES["index"]["vidcap"], L), "description": tm(C.PAGES["index"]["vidcap"], L) + (". MIFTAH Projects, Kfar Masaryk, Israel." if L == "en" else ". מיפתח פרויקטים, כפר מסריק."),
                      "thumbnailUrl": f"{DOMAIN}/assets/img/hero-1600.jpg", "contentUrl": f"{DOMAIN}/assets/video/hero-wide.mp4", "uploadDate": "2026-10-26", "duration": "PT12S",
                      "publisher": {"@id": f"{DOMAIN}/#org"}, "inLanguage": L})
    if slug == "how-we-build":
        graph.append({"@type": "CreativeWork", "name": tm(C.PAGES[slug]["h1"], L), "description": tm(C.PAGES[slug]["desc"], L), "creator": {"@id": f"{DOMAIN}/#org"},
                      "image": f"{DOMAIN}/assets/img/sim-poster.jpg", "inLanguage": L, "genre": "3D illustration"})
    if slug in ("contact", "net-houses"):
        faq = C.FAQ if slug == "contact" else C.NET_FAQ
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": tm(q, L), "acceptedAnswer": {"@type": "Answer", "text": tm(a, L)}} for q, a in faq]})
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
    if slug == "how-we-build":  # the still of the 3D scene is this page's largest image
        pre += (f'<link rel="preload" as="image" href="{r}assets/img/sim-poster-m.jpg" media="(max-width: 760px)">'
                f'<link rel="preload" as="image" href="{r}assets/img/sim-poster.jpg" media="(min-width: 761px)">')
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
{'<meta name="robots" content="noindex">' if noindex else '<meta name="robots" content="index, follow, max-image-preview:large">'}
{f'<meta name="google-site-verification" content="{esc(GOOGLE_VERIFY)}">' if GOOGLE_VERIFY and slug == "index" else ""}
{links}
<meta name="theme-color" content="#0E4239">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(tm(C.SITE["name"], L))}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url(slug, L, True)}">
<meta property="og:image" content="{DOMAIN}/assets/img/og-miftah.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{esc(tm(C.PAGES["index"]["vidcap"], L))}">
<meta property="og:locale" content="{"en_US" if L == "en" else "he_IL"}"><meta property="og:locale:alternate" content="{"he_IL" if L == "en" else "en_US"}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(desc)}"><meta name="twitter:image" content="{DOMAIN}/assets/img/og-miftah.jpg">
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
    mbar = "" if slug in ("contact", "how-we-build", "profile", "404") else (
        f'<nav class="mbar" id="mbar" aria-label="{"Quick contact" if L == "en" else "יצירת קשר מהירה"}" hidden><a class="btn btn-line" href="tel:{C.SITE["phone_tel"]}" data-where="mbar">{esc(t(C.SITE["call_short"], L))}</a>'
        f'<a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="mbar">{esc(t(C.SITE["cta"], L))}</a></nav>')
    return f"""<body>
<a class="skip" href="#main">{esc(t(C.SITE["skip"], L))}</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="index.html" aria-label="{esc(tm(C.SITE["name"], L))}, {esc(tm(C.SITE["home"], L))}">{logo(L)}</a>
    <p class="tagline">{esc(t(C.SITE["slogan"], L))}</p>
    <nav class="nav" id="nav" aria-label="{"Main" if L == "en" else "ראשי"}">
      <ul>{items}</ul>
      <a class="btn btn-primary nav-cta" href="contact.html" data-track="cta_click" data-label="nav">{esc(t(C.SITE["cta"], L))}</a>
    </nav>
    <a class="lang" href="{other}" hreflang="{alt}" lang="{alt}" data-track="lang_switch">{esc(t(C.SITE["lang_other"], L))}</a>
    <a class="btn btn-primary head-cta" href="contact.html" data-track="cta_click" data-label="header">{esc(t(C.SITE["cta"], L))}</a>
    <a class="head-call" href="tel:{C.SITE["phone_tel"]}" data-where="header" aria-label="{esc(tm(C.SITE["call"], L))} {esc(tm(C.SITE["phone_display"], L))}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg></a>
    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span class="bars" aria-hidden="true"></span>{esc(t(C.SITE["menu"], L))}</button>
  </div>
  <p class="tagline-m">{esc(t(C.SITE["slogan"], L))}</p>
</header>
{mbar}"""


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
        <ul>{nav}<li><a href="how-we-build.html">{esc(t(C.PAGES["how-we-build"]["h1"], L))}</a></li><li><a href="profile.html">{esc(t(S["foot_profile"], L))}</a></li></ul>
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
        fig = f'<figure class="ph-fig">{picture(name, tm(cap, L), L, sizes="(max-width: 900px) 100vw, 560px", archive=True, eager=True)}<figcaption>{esc(t(cap, L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure>'
        return f'<section class="page-head has-img"><div class="wrap ph-grid"><div>{crumbs}<h1>{esc(t(P["h1"], L))}</h1>{lead}</div>{fig}</div></section>'
    return f'<section class="page-head"><div class="wrap">{crumbs}<h1>{esc(t(P["h1"], L))}</h1>{lead}</div></section>'


def cta_band(L, where):
    B = C.CTA_BAND; S = C.SITE
    lines = ([esc(t(B["min_turnkey"], L))] if where == "turnkey" else []) + ([esc(t(B["fair"], L))] if where in ("home", "turnkey") else [])
    meta = f'<p class="meta">{"<br>".join(lines)}</p>' if lines else ""
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
      {meta}
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
    cards = "".join(f'<li><b>{esc(t(c, L))}</b><span>{esc(t(w, L))}</span><span class="reg">{esc(t(r, L))}</span></li>' for c, r, w in C.FEATURED)
    return f'<ul class="feat-cards">{cards}</ul>'


# ---------------------------------------------------------------- pages
def crop_selector(L, where="home"):
    """'Which net house for your crop?': tabs that switch the specs, the matching project and the drawing."""
    H = C.HOME3
    fig, _legend = drawing(L, animate=False, sfx="c")
    fig = fig.replace('<figure class="drawing"', '<figure class="drawing crop-dw" data-crop="banana"', 1)
    tabs, panels = [], []
    for i, cr in enumerate(C.CROPS):
        sel = i == 0
        tabs.append(f'<button type="button" role="tab" id="tab-{cr["id"]}-{where}" aria-controls="crop-{cr["id"]}-{where}" aria-selected="{"true" if sel else "false"}"'
                    f'{"" if sel else " tabindex=" + chr(34) + "-1" + chr(34)} data-crop="{cr["id"]}">{esc(t(cr["label"], L))}</button>')
        rows = "".join(f'<div><dt>{esc(t(k, L))}</dt><dd>{esc(t(v, L))}</dd></div>' for k, v in cr["rows"])
        proj = (f'<p class="crop-proj"><span>{esc(t(H["crop_proj"], L))}</span>{esc(t(cr["proj"], L))}</p>' if cr["proj"] else "")
        q = "" if cr["id"] == "other" else f'?crop={cr["id"]}'
        panels.append(f'<div class="crop-panel" role="tabpanel" id="crop-{cr["id"]}-{where}" aria-labelledby="tab-{cr["id"]}-{where}"{"" if sel else " hidden"}>'
                      f'<p class="crop-say">{esc(t(cr["say"], L))}</p><dl class="crop-spec">{rows}</dl>{proj}'
                      f'<p class="crop-min">{esc(t(H["crop_min"], L))}</p>'
                      f'<a class="btn btn-primary" href="contact.html{q}" data-track="cta_click" data-label="crop-{cr["id"]}">{esc(t(H["crop_cta"] if cr["id"] != "other" else H["crop_ask"], L))}</a></div>')
    return f"""<section class="section crop cable-top" id="crop" aria-labelledby="crop-h-{where}">
  <div class="wrap">
    <div class="crop-head"><h2 id="crop-h-{where}">{esc(t(H["crop_h"], L))}</h2><p class="lead">{esc(t(H["crop_p"], L))}</p></div>
    <div class="crop-tabs" role="tablist" aria-label="{esc(tm(H["crop_h"], L))}">{"".join(tabs)}</div>
    <div class="crop-body"><div class="crop-panels">{"".join(panels)}</div><div class="crop-fig">{fig}</div></div>
  </div>
</section>"""


def p_index(L):
    P = C.PAGES["index"]; H = C.HOME3; S = C.SITE; r = rel(L)
    vids = f'data-src-wide="{r}assets/video/hero-wide.mp4" data-src-small="{r}assets/video/hero-720.mp4" data-src-portrait="{r}assets/video/hero-portrait.mp4"'
    poster = (f'<picture><source media="(max-width: 720px) and (orientation: portrait)" type="image/avif" srcset="{r}assets/img/hero-portrait-720.avif">'
              f'<source media="(max-width: 720px) and (orientation: portrait)" type="image/webp" srcset="{r}assets/img/hero-portrait-720.webp">'
              f'<source type="image/avif" srcset="{r}assets/img/hero-960.avif 960w, {r}assets/img/hero-1600.avif 1600w" sizes="100vw">'
              f'<source type="image/webp" srcset="{r}assets/img/hero-960.webp 960w, {r}assets/img/hero-1600.webp 1600w" sizes="100vw">'
              f'<img src="{r}assets/img/hero-1600.jpg" alt="" width="1600" height="900" fetchpriority="high"></picture>')
    # the net canopy drawn over the footage: a fine mesh with a sagging edge cable, and the poles that carry it
    canopy = ('<svg class="canopy" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true">'
              '<defs><pattern id="mesh" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 0H9M0 0V9" stroke="#fff" stroke-opacity=".3" stroke-width=".9"/></pattern>'
              '<linearGradient id="fadeNet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient><linearGradient id="poleFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3E8EA" stop-opacity=".95"/><stop offset="1" stop-color="#E3E8EA" stop-opacity="0"/></linearGradient>'
              '<mask id="netMask"><rect width="1600" height="900" fill="url(#fadeNet)"/></mask></defs>'
              '<g class="canopy-net" mask="url(#netMask)"><path d="M0 0H1600V236 Q1400 274 1200 238 Q1000 274 800 238 Q600 274 400 238 Q200 274 0 238Z" fill="#fff" fill-opacity=".1"/><path d="M0 0H1600V236 Q1400 274 1200 238 Q1000 274 800 238 Q600 274 400 238 Q200 274 0 238Z" fill="url(#mesh)"/></g>'
              '<path class="canopy-cable" d="M0 238 Q200 274 400 238 Q600 274 800 238 Q1000 274 1200 238 Q1400 274 1600 238" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>'
              '</svg>')
    steps_html = steps(L)
    def stage_list(items):
        names = [t(x[0], L) for x in items]
        return ", ".join([names[0]] + [n[0].lower() + n[1:] if L == "en" else n for n in names[1:]])
    phases = "".join(f'<li><b>{esc(t(ph, L))}</b><span>{esc(stage_list(items))}</span></li>' for ph, items in C.STAGES)
    values = "".join(f'<li><b>{esc(t(a, L))}</b><span>{esc(t(b_, L))}</span></li>' for a, b_ in C.VALUES)
    # The slogan is the page headline. The Hebrew one breaks after the company name, never before the dash.
    sl = t(S["slogan"], L)
    slogan_h1 = esc(sl) if " - " not in sl else '<span class="h1-a">{} -</span> <span class="h1-b">{}</span>'.format(*map(esc, sl.split(" - ", 1)))
    return f"""
<main id="main">
<section class="hero hero3" aria-labelledby="hero-h">
  <div class="hero-media" aria-hidden="true">{poster}<video id="hero-video" muted loop playsinline preload="none" {vids}></video></div>
  {canopy}
  <div class="wrap hero-in">
    <h1 id="hero-h">{slogan_h1}</h1>
    <p class="hero-sub">{esc(t(H["h1"], L))}</p>
    <p class="lead">{esc(t(H["lead"], L))}</p>
    <div class="actions">
      <a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="hero">{esc(t(S["cta"], L))}</a>
      <a class="btn btn-line" href="#crop" data-track="route_click" data-label="hero-crop">{esc(t(H["cta2"], L))}</a>
    </div>
    <p class="hero-invest"><a href="turnkey-farms.html" data-track="route_click" data-label="hero-investors">{esc(t(H["invest"], L))}</a></p>
    <div class="hero-foot"><span>{esc(t(P["vidcap"], L))}</span><button class="vid-btn" type="button" data-video="hero-video" data-play="{esc(t(S["video_play"], L))}" data-pause="{esc(t(S["video_pause"], L))}"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg><span>{esc(t(S["video_play"], L))}</span></button></div>
  </div>
</section>

{crop_selector(L)}

<section class="section dark proof" aria-labelledby="proof-h">
  <div class="wrap">
    <div class="proof-head"><h2 id="proof-h">{esc(t(H["proof_h"], L))}</h2><div><p class="lead">{esc(t(H["proof_p"], L))}</p><p class="more"><a href="projects.html">{esc(t(H["proof_go"], L))}</a></p></div></div>
    {map_svg(L)}
  </div>
</section>

<section class="section build" aria-labelledby="steps-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="steps-h">{esc(t(H["steps_h"], L))}</h2><p class="lead">{esc(t(H["steps_p"], L))}</p></div>
    {steps_html}
    <p class="swipe-hint" aria-hidden="true">{esc(t(H["steps_swipe"], L))}</p>
    <p class="more sim-link"><a href="how-we-build.html">{esc(t(H["sim_go"], L))}</a></p>
  </div>
</section>

<section class="section white who" aria-labelledby="who-h">
  <div class="wrap who-grid">
    <div><h2 id="who-h">{esc(t(H["who_h"], L))}</h2><p class="lead">{esc(t(H["who_p"], L))}</p><p class="who-peace">{esc(t(H["who_peace"], L))}</p><p class="who-refs">{esc(t(H["who_refs"], L))}</p><p class="more"><a href="about.html">{esc(t(H["who_go"], L))}</a></p></div>
    <ul class="values one">{values}</ul>
  </div>
</section>

<section class="section dark invest" aria-labelledby="inv-h">
  <div class="wrap invest-grid">
    <div><h2 id="inv-h">{esc(t(H["inv_h"], L))}</h2><p class="lead">{esc(t(H["inv_p"], L))}</p><p class="inv-note">{esc(t(H["inv_note"], L))}</p>
      <div class="actions"><a class="btn btn-primary" href="turnkey-farms.html" data-track="route_click" data-label="investors">{esc(t(H["inv_go"], L))}</a></div></div>
    <ol class="phases-mini">{phases}</ol>
  </div>
</section>
{cta_band(L, "home")}
</main>"""


def p_net(L):
    P = C.PAGES["net-houses"]
    fig, legend = drawing(L, animate=False)
    # crops are answered by the crop selector; sheds, windbreaks and service follow as structures and services
    types = "".join(f'<article class="type" id="{ty["id"]}"><div><h3>{esc(t(ty["h"], L))}</h3><p class="crops">{esc(t(ty["crops"], L))}</p></div>'
                    f'<div><dl>{"".join(f"<dt>{esc(t(a, L))}</dt><dd>{esc(t(b, L))}</dd>" for a, b in ty["rows"])}</dl></div></article>' for ty in C.TYPES if ty["id"] in ("sheds", "service"))
    return f"""
<main id="main">
{page_head("net-houses", L, img=("forest", C.TYPES[1]["cap"]))}
{crop_selector(L, "net")}
<section class="section abroad-band" aria-labelledby="abroad-h"><div class="wrap abroad-in"><h2 id="abroad-h" class="h-small">{esc(t(P["abroad_h"], L))}</h2><p>{esc(t(P["abroad_p"], L))}</p></div></section>
<section class="section" aria-labelledby="types-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="types-h">{esc(t(P["types_h2"], L))}</h2></div>
    <div class="types">{types}</div>
  </div>
</section>
<section class="section white" aria-labelledby="draw-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="draw-h">{esc(t(P["draw_h"], L))}</h2></div>
    {fig}
    <div class="split" style="margin-top:28px"><div class="legend-wrap one">{legend}</div><div class="site-note"><h3>{esc(t(P["site_h"], L))}</h3><p class="muted" style="margin-top:8px">{esc(t(P["site_p"], L))}</p>
      <p class="more sim-link"><a href="how-we-build.html">{esc(t(C.SIM["go"], L))}</a></p></div></div>
    <figure class="band-photo">{picture("p-poles", tm(C.STEPS[2][3], L), L, sizes="(max-width: 1280px) 100vw, 1240px", archive=True, widths=(640, 1024, 1600))}<figcaption>{esc(t(C.STEPS[2][3], L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure>
  </div>
</section>
<section class="section white" aria-labelledby="nfaq-h">
  <div class="wrap split">
    <h2 id="nfaq-h">{esc(t(C.NET_FAQ_H, L))}</h2>
    <div class="faq">{"".join(f'<details><summary>{esc(t(q, L))}</summary><p>{esc(t(a, L))}</p></details>' for q, a in C.NET_FAQ)}</div>
  </div>
</section>
{cta_band(L, "net")}
</main>"""


def p_sim(L):
    """The 3D build illustration. Cards scroll over a sticky canvas; build-sim.js maps the scroll to the scene.
    Without WebGL the page shows the section drawing instead (.nogl)."""
    S = C.SIM; n = len(S["chapters"])
    rail = "".join(f'<button type="button" aria-label="{esc(tm(S["step"], L))} {i + 1}: {esc(tm(h, L))}"><span></span></button>' for i, (_, h, _p) in enumerate(S["chapters"]))
    chs = []
    for i, (k, h, p) in enumerate(S["chapters"]):
        cta = ""
        if i == n - 1:
            cta = (f'<div class="actions"><a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="sim">{esc(t(C.SITE["cta"], L))}</a>'
                   f'<a class="btn btn-line" href="tel:{C.SITE["phone_tel"]}" data-where="sim">{esc(t(C.SITE["call"], L))} <bdi class="ltr">{esc(t(C.SITE["phone_display"], L))}</bdi></a></div>')
        chs.append(f'<section class="sim-ch" aria-labelledby="sim-h{i}"><div class="sim-card"><span class="k"><span class="num">{i + 1:02d}</span> {esc(t(k, L))}</span>'
                   f'<h2 id="sim-h{i}">{esc(t(h, L))}</h2><p>{esc(t(p, L))}</p>{cta}</div></section>')
    fig, legend = drawing(L, animate=False)
    r = rel(L)
    steps_label = "Steps" if L == "en" else "שלבים"
    return f"""
<main id="main">
{page_head("how-we-build", L)}
<div class="sim" id="sim" data-three="{r}assets/vendor/three.min.js?v={VER["three"]}">
  <div class="sim-track" id="sim-track">
    <div class="sim-stage" id="sim-stage">
      <canvas id="sim-cv" role="img" aria-label="{esc(tm(S["aria"], L))}"></canvas>
      <span class="sim-badge">{esc(t(S["badge"], L))}</span>
      <div class="sim-hud" aria-hidden="true"><span class="num" id="sim-step">01 / {n:02d}</span><span class="sim-barw"><span id="sim-bar"></span></span></div>
      <nav class="sim-rail" aria-label="{steps_label}">{rail}</nav>
      <span class="sim-scroll" aria-hidden="true">{esc(t(S["scroll"], L))}</span>
    </div>
    <div class="sim-chs">{"".join(chs)}</div>
  </div>
  <div class="wrap sim-fallback"><p class="notice">{esc(t(S["nogl"], L))}</p>{fig}<div class="legend-wrap">{legend}</div></div>
  <p class="wrap sim-note">{esc(t(S["note"], L))}</p>
</div>
{cta_band(L, "sim")}
<script src="{r}assets/build-sim.js?v={VER["sim"]}" defer></script>
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
{cta_band(L, "turnkey")}
</main>"""


def p_projects(L):
    P = C.PAGES["projects"]
    return f"""
<main id="main">
{page_head("projects", L)}
<section class="section white" aria-labelledby="map-h">
  <div class="wrap">
    <div class="sec-head split"><div><h2 id="map-h">{esc(t(C.GLOBE["h"], L))}</h2><p class="muted" style="margin-top:10px">{esc(t(C.GLOBE["p"], L))}</p></div>
      <p class="more"><a href="{rel(L)}globe/index.html?lang={L}" data-track="globe_open">{esc(t(C.GLOBE["full"], L))}</a></p></div>
    <div class="globe-frame" id="globe-frame"><img src="{rel(L)}assets/img/globe-poster-{L}.jpg" width="1240" height="698" alt="" loading="lazy" decoding="async">
      <iframe data-src="{rel(L)}globe/index.html?lang={L}#compact" title="{esc(tm(C.GLOBE["title"], L))}" tabindex="-1" hidden></iframe>
      <button type="button" class="btn btn-primary globe-go">{esc(t(C.GLOBE["go"], L))}</button></div>
    <div class="proj-table">{projects_table(L)}</div>
  </div>
</section>
<section class="section" aria-labelledby="feat-h">
  <div class="wrap split">
    <div><h2 id="feat-h">{esc(t(P["feat_h"], L))}</h2><p class="muted" style="margin-top:14px">{esc(t(P["feat_p"], L))}</p></div>
    <div>{featured(L)}</div>
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
      <h2 class="h-small" id="co-h" style="margin-top:32px">{esc(t(P["company_h"], L))}</h2><table class="tbl" aria-labelledby="co-h" style="margin-top:12px"><tbody>{rows}</tbody></table></div>
    <figure class="ph-fig">{picture("p-marking", tm(C.STEPS[1][3], L), L, sizes="(max-width: 960px) 100vw, 600px", archive=True)}<figcaption>{esc(t(C.STEPS[1][3], L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure>
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
    if L == "he":
        ph = "\u2066" + ph + "\u2069"  # keep the number left-to-right inside Hebrew text
    m = {k: tm(v, L).replace("{phone}", ph) for k, v in C.FORM_MSG.items()}
    m["keys"] = [[tm(lab, L), k] for k, lab in C.FORM_BRIEF_KEYS]
    return json.dumps(m, ensure_ascii=False, separators=(",", ":"))


def p_contact(L):
    P = C.PAGES["contact"]; F = C.FORM; S = C.SITE
    tel = f'<a href="tel:{S["phone_tel"]}" data-where="form-notice"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a>'
    offline = "" if FORM_ENDPOINT else f'<p class="notice form-offline">{esc(t(C.FORM_OFFLINE, L)).replace("{phone}", tel)}</p>'
    consent = esc(t(F["consent"], L)).replace("{privacy}", f'<a href="privacy.html">{esc(t(F["privacy_link"], L))}</a>')
    form = f"""<form class="form" id="review-form" method="post" action="{esc(FORM_ENDPOINT) or "contact.html"}" data-endpoint="{esc(FORM_ENDPOINT)}" data-tel="{S["phone_tel"]}" data-msg="{esc(form_msg(L))}" data-crops="{esc(json.dumps({cr["id"]: tm(cr["label"], L) for cr in C.CROPS}, ensure_ascii=False))}" novalidate aria-labelledby="form-h">
  <noscript><p class="form-status bad">{esc(t(S["noscript"], L))}</p></noscript>
  <div><h2 id="form-h" class="h-small">{esc(t(F["h"], L))}</h2><p class="small muted" style="margin-top:6px">{esc(t(F["req"], L))}</p></div>
  {offline}
  <ol class="fprog" aria-hidden="true"><li class="on"><span class="num">1</span> {esc(t(F["step1_h"], L))}</li><li><span class="num">2</span> {esc(t(F["step2_h"], L))}</li></ol>
  <div class="fstep" id="fstep-1">
    <h3 class="fstep-h" tabindex="-1">{esc(t(F["step1_h"], L))}</h3>
    <div class="fields">
    {choices("need", F["needs"], L, F["need"])}
    {choices("role", F["roles"], L, F["role"])}
    {select("country", F["country"], F["countries"], L, req=True)}
    {inp("region", F["region"], L, auto="address-level1")}
    {select("size", F["size"], F["sizes"], L, req=True)}
    {select("status", F["status"], F["statuses"], L)}
    <p class="size-note full" id="size-note" role="status" hidden></p>
    {inp("crop", F["crop"], L, hint=F["crop_hint"])}
    {select("timeline", F["timeline"], F["timelines"], L)}
    </div>
    <div class="actions fnav"><button class="btn btn-primary" type="button" data-next>{esc(t(F["next"], L))}</button></div>
  </div>
  <div class="fstep" id="fstep-2">
    <h3 class="fstep-h" tabindex="-1">{esc(t(F["step2_h"], L))}</h3>
    <div class="fields">
    {inp("name", F["name"], L, req=True, auto="name")}
    {inp("company", F["company"], L, auto="organization")}
    <p class="full reach-note" id="f-reach">{esc(t(F["reach"], L))}</p>
    {inp("email", F["email"], L, typ="email", auto="email")}
    {inp("phone", F["phone"], L, typ="tel", auto="tel", hint=F["phone_hint"])}
    <div class="field full"><label for="f-message">{esc(t(F["message"], L))}</label><textarea id="f-message" name="message" rows="4"></textarea></div>
    <div class="hp" aria-hidden="true"><label for="f-website">{esc(t(F["honeypot"], L))}</label><input id="f-website" name="mt_hp" type="text" tabindex="-1" autocomplete="off"></div>
    <label class="check full"><input type="checkbox" name="berlin" value="yes"><span>{esc(t(F["berlin"], L))}</span></label>
    <div class="check full"><input type="checkbox" id="f-consent" name="consent" value="yes" required aria-required="true"><label for="f-consent">{consent}</label></div>
    </div>
    <div class="actions fnav"><button class="btn btn-line" type="button" data-back>{esc(t(F["back"], L))}</button><button class="btn btn-primary" type="submit">{esc(t(F["send"], L))}</button></div>
  </div>
</form>
<div class="form-status" id="form-status" role="status" aria-live="polite" hidden></div>"""
    aside = f"""<aside class="aside" aria-label="{"Other ways to reach us" if L == "en" else "דרכים נוספות"}">
  <div class="block"><h2>{esc(t(P["aside_phone_h"], L))}</h2><a class="big-phone" href="tel:{S["phone_tel"]}" data-where="contact"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a><p>{esc(t(P["aside_phone_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_min_h"], L))}</h2><p>{esc(t(P["aside_min_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_profile_h"], L))}</h2><p>{esc(t(P["aside_profile_p"], L))}</p><p><a href="profile.html" data-track="profile_open">{esc(t(P["aside_profile_go"], L))}</a></p></div>
  <div class="block"><h2>{esc(t(P["aside_partner_h"], L))}</h2><p>{esc(t(P["aside_partner_p"], L))}</p></div>
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
    names = [t(x[0], L) for _, items in C.STAGES for x in items]
    stg = ", ".join([names[0]] + [n[0].lower() + n[1:] if L == "en" else n for n in names[1:]])
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


RENDER = {"index": p_index, "net-houses": p_net, "how-we-build": p_sim, "turnkey-farms": p_turnkey, "projects": p_projects, "about": p_about,
          "contact": p_contact, "profile": p_profile,
          "privacy": lambda L: p_prose("privacy", L, C.PRIVACY), "accessibility": lambda L: p_prose("accessibility", L, C.A11Y)}


SITEMAP_IMAGES = {  # the real photos on each page (and the 3D still), largest size
    "index": ["hero-1600.jpg", "p-site-1600.jpg", "p-marking-1600.jpg", "p-poles-1600.jpg", "p-closed-1600.jpg"],
    "net-houses": ["forest-1600.jpg", "p-poles-1600.jpg"], "turnkey-farms": ["valley-1600.jpg"],
    "projects": ["p-closed-1600.jpg", "p-site-1600.jpg"], "about": ["p-marking-1600.jpg"], "how-we-build": ["sim-poster.jpg"],
}


def globe_page():
    """Copies the 3D globe (greenhouse-brand/globe) into public/globe/: self-hosted three.js and fonts,
    the inline script moved to globe.js (the CSP allows no inline script), and ?lang=en|he for the embed."""
    G = SRC.parents[1] / "globe"; out = PUB / "globe"; out.mkdir(parents=True, exist_ok=True)
    src = (G / "index.html").read_text()
    i0 = src.index("<script>\n"); i1 = src.index("</script>", i0)
    js = src[i0 + len("<script>\n"):i1]
    pref = 'try { if (localStorage.getItem("miftah-globe-lang") === "en") L = "en"; } catch (e) {}'
    assert pref in js
    js = js.replace(pref, pref + '\n  var qs = /[?&]lang=(he|en)/.exec(location.search); if (qs) L = qs[1];')
    # the logo links back to the site, in the globe's current language
    js += '\n(function () { var a = document.getElementById("home-link"); if (!a) return; function u() { a.href = document.documentElement.lang === "en" ? "../index.html" : "../he/index.html"; } u(); new MutationObserver(u).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); })();\n'
    # embedded on Projects (#compact): the page must keep scrolling. Wheel zooms only with Ctrl/Cmd, and a
    # vertical swipe scrolls the page (horizontal drag still turns the globe).
    wheel = 'gl.addEventListener("wheel", function (e) { e.preventDefault();'
    assert wheel in js
    js = js.replace(wheel, 'gl.addEventListener("wheel", function (e) { if (location.hash === "#compact" && !e.ctrlKey && !e.metaKey) return; e.preventDefault();')
    js = js.replace('hint: "Drag to rotate · scroll or pinch to zoom · tap a point"', 'hint: location.hash === "#compact" ? "Drag to rotate · Ctrl + scroll to zoom · tap a point" : "Drag to rotate · scroll or pinch to zoom · tap a point"')
    js = re.sub(r'hint: "(גוררים כדי לסובב[^"]*)"', lambda m: 'hint: location.hash === "#compact" ? "גוררים כדי לסובב · Ctrl + גלגלת לזום · לוחצים על נקודה" : "' + m.group(1) + '"', js, count=1)
    assert js.count('location.hash === "#compact" ?') == 2
    # on a phone the embed has no Ctrl key: a sideways drag turns it, a vertical swipe scrolls the page
    js = js.replace('location.hash === "#compact" ? "Drag to rotate · Ctrl', 'location.hash === "#compact" ? (matchMedia("(pointer: coarse)").matches ? "Drag sideways to rotate · tap a point" : "Drag to rotate · Ctrl')
    js = js.replace('· tap a point" : "Drag to rotate · scroll', '· tap a point") : "Drag to rotate · scroll')
    js = js.replace('location.hash === "#compact" ? "גוררים כדי לסובב · Ctrl', 'location.hash === "#compact" ? (matchMedia("(pointer: coarse)").matches ? "גוררים לצדדים כדי לסובב · לוחצים על נקודה" : "גוררים כדי לסובב · Ctrl')
    js = js.replace('· לוחצים על נקודה" : "גוררים כדי לסובב · גלגלת', '· לוחצים על נקודה") : "גוררים כדי לסובב · גלגלת')
    assert js.count('matchMedia("(pointer: coarse)")') == 2 and js.count('tap a point") :') == 1 and js.count('על נקודה") :') == 1
    # visitors see what the figures are, not where the team got them
    NOTE = {"he": "השטחים נכונים ל-2015. נקודה צהובה: הפרויקט מסומן ברמת מדינה או אזור, לא במיקום המדויק. גובה קרן האור לפי השטח.",
            "en": "Areas as of 2015. A yellow point marks the country or region, not the exact site. Beam height follows the area."}
    js, n = re.subn(r'note: "מקור:[^"]*"', 'note: "' + NOTE["he"] + '"', js); assert n == 1
    js, n = re.subn(r'note: "Sources:[^"]*"', 'note: "' + NOTE["en"] + '"', js); assert n == 1
    for old, new in (('region: "ברמת אזור או מדינה"', 'region: "מסומן ברמת מדינה או אזור"'), ('region: "Region or country level"', 'region: "Marked at country or region level"')):
        assert old in js, old
        js = js.replace(old, new)
    js += '\ndocument.documentElement.setAttribute("data-i18n", "1");\n'  # texts are now in the page's language: show them
    # client names wait for the client's approval (ledger 3.1, 3.5, q13): the kiwi project is shown by region
    for old, new in (("קיווי בברעם", "קיווי בגליל העליון"), ("Kiwi in Bar'am", "Kiwi in the Upper Galilee"), ("קיווי, ברעם", "קיווי, הגליל העליון"),
                     ("Kiwi, Bar'am", "Kiwi, Upper Galilee"), ("עשור של עבודה משותפת עם מטע ברעם", "הלקוח מוכן להמליץ עלינו"),
                     ("A decade of work with Bar'am Orchard", "The client is willing to give a reference")):
        assert old in js, old
        js = js.replace(old, new)
    (out / "globe.js").write_text(js)
    page = src[:i0] + f'<script src="globe.js?v={ver(out / "globe.js")}"></script>' + src[i1 + len("</script>"):]
    page, n = re.subn(r'(<p class="note" id="note">)מקור:[^<]*', r'\1' + NOTE["he"], page); assert n == 1
    page = re.sub(r'(<div class="top">)(<svg class="logo".*?</svg>)', r'\1<a id="home-link" href="../index.html">\2</a>', page, count=1, flags=re.S)
    assert 'id="home-link"' in page
    page = page.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', f'<script src="../assets/vendor/three.min.js?v={VER["three"]}"></script>')
    page = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n|<link rel="preconnect"[^>]*>\n|<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n', "", page)
    page = page.replace('"Heebo", Arial, sans-serif', '"Plex", "Plex Fallback", Arial, sans-serif').replace('"IBM Plex Mono", ui-monospace', '"Plex Mono", ui-monospace')
    assert "googleapis" not in page and "cdnjs" not in page
    title = re.search(r"<title>(.*?)</title>", page).group(1)
    page = page.replace(f"<title>{title}</title>", "", 1)
    # in the embed: a plain deep-green field instead of the space backdrop, and vertical swipes left to the page
    page = page.replace("</style>", ".compact .globe { background: radial-gradient(90% 80% at 50% 45%, #0E4239 0%, #061A16 70%); touch-action: pan-y; }\nhtml:not([data-i18n]) #eb, html:not([data-i18n]) #h1, html:not([data-i18n]) #lede, html:not([data-i18n]) #hint, html:not([data-i18n]) #note, html:not([data-i18n]) #g1, html:not([data-i18n]) #g2, html:not([data-i18n]) #s1, html:not([data-i18n]) #s2, html:not([data-i18n]) #s3 { visibility: hidden; }\n.item:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #7FC49B; outline-offset: 2px; }\n</style>", 1)
    head = ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<title>{title}</title>\n<meta name="robots" content="noindex">\n<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">\n'
            f'<link rel="stylesheet" href="../assets/fonts/fonts.css?v={VER["fonts"]}">\n</head>\n<body>\n')
    (out / "index.html").write_text(head + page + "\n</body>\n</html>\n")
    for f in ("space.jpg", "fly.mp4", "fly.jpg"):
        shutil.copy(G / f, out / f)


def crumbs_for(slug, L):
    if slug == "index":
        return None
    return [(tm(C.SITE["home"], L), url("index", L, True)), (tm(C.PAGES[slug]["h1"], L), url(slug, L, True))]


def write(path, s):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(s, encoding="utf-8")


VER = {}


# The old WordPress site's URLs (from its Yoast sitemaps, read 28 Oct 2026) and where each one lives now.
# Used only once www.miftah.co.il points at this site: Google keeps the old pages' standing through 301s.
OLD_HE = [  # Hebrew pages (decoded slugs) -> new Hebrew page
    ("אודות", "about"), ("הנהלה", "about"), ("המלצות", "projects"), ("פרוייקטים", "projects"), ("project", "projects"),
    ("פתרונות", "net-houses"), ("פתרונות-קירוי-והצללה-חקלאיים", "net-houses"), ("ייעוץ-תכנון-ניהול-והדרכה", "net-houses"),
    ("פתרונות-קירוי-והצללה-אזרחיים", "index"), ("יצירת-קשר", "contact"), ("sample-page", "index"), ("8", "index"),
]
OLD_HE_PREFIX = [("project/סככות-העמסה", "net-houses"), ("project/בתי-רשת-לבננות", "net-houses"), ("project", "projects"),
                 ("project-category", "projects"), ("dt_testimonials", "projects"), ("ללא-קטגוריה", "index"), ("category", "index")]
OLD_EN = [  # English pages were ?lang=en
    ("about", "about"), ("management", "about"), ("recommendations", "projects"), ("projects", "projects"), ("solutions", "net-houses"),
    ("agricultural-shading-solutions", "net-houses"), ("planning-guiding", "net-houses"), ("civil-shading-solutions", "index"), ("contact", "contact"),
]


def old_redirects_htaccess():
    """mod_rewrite rules: RewriteRule matches the decoded path, so the Hebrew slugs are written as text."""
    def he(slug): return "/he/" if slug == "index" else f"/he/{slug}.html"
    def en(slug): return "/" if slug == "index" else f"/{slug}.html"
    out = ["RewriteEngine On", "# old site, English pages (?lang=en)"]
    for old, new in OLD_EN:
        out += ["RewriteCond %{QUERY_STRING} (^|&)lang=en(&|$)", f"RewriteRule ^{re.escape(old)}/?$ {en(new)}? [R=301,L,NC]"]
    out += ["RewriteCond %{QUERY_STRING} (^|&)lang=en(&|$)", "RewriteRule ^(project|project-category)/ /projects.html? [R=301,L,NC]",
            "RewriteCond %{QUERY_STRING} (^|&)lang=en(&|$)", "RewriteRule ^$ /? [R=301,L]", "# old site, Hebrew pages"]
    for old, new in OLD_HE:
        out.append(f"RewriteRule ^{re.escape(old)}/?$ {he(new)} [R=301,L,NC]")
    for old, new in OLD_HE_PREFIX:
        out.append(f"RewriteRule ^{re.escape(old)}/ {he(new)} [R=301,L,NC]")
    out.append("RewriteRule ^(feed|comments/feed|xmlrpc\\.php|wp-.*)(/.*)?$ - [G,L]")
    return "\n".join(out) + "\n"


def old_redirects_vercel():
    """The same map for Vercel. Vercel matches the percent-encoded path, so the Hebrew slugs are encoded (lower case, as WordPress wrote them)."""
    from urllib.parse import quote
    def enc(x): return quote(x, safe="-_").lower().replace("%2f", "/")
    def he(slug): return "/he/" if slug == "index" else f"/he/{slug}.html"
    def en(slug): return "/" if slug == "index" else f"/{slug}.html"
    q = [{"type": "query", "key": "lang", "value": "en"}]
    r = [{"source": f"/{old}{{/}}?", "has": q, "destination": en(new), "permanent": True} for old, new in OLD_EN]
    r += [{"source": "/(project|project-category)/:rest(.*)", "has": q, "destination": "/projects.html", "permanent": True}]
    r += [{"source": f"/{enc(old)}{{/}}?", "destination": he(new), "permanent": True} for old, new in OLD_HE]
    r += [{"source": f"/{enc(old)}/:rest(.*)", "destination": he(new), "permanent": True} for old, new in OLD_HE_PREFIX]
    return r


def main():
    A = PUB / "assets"
    A.mkdir(parents=True, exist_ok=True)
    shutil.copy(SRC / "assets/site.css", A / "site.css")
    shutil.copy(SRC / "assets/site.js", A / "site.js")
    shutil.copy(SRC / "assets/build-sim.js", A / "build-sim.js")
    (A / "img").mkdir(exist_ok=True)
    for f in (SRC / "assets/posters").iterdir():
        shutil.copy(f, A / "img" / f.name)
    (A / "vendor").mkdir(exist_ok=True)
    shutil.copy(SRC / "assets/vendor/three.min.js", A / "vendor/three.min.js")
    shutil.copytree(SRC / "assets/fonts", A / "fonts", dirs_exist_ok=True)
    for f in (SRC / "assets/icons").iterdir():
        shutil.copy(f, A / f.name)
    shutil.copy(SRC.parents[1] / "images/miftah-mark.svg", A / "favicon.svg")
    for w in (A / "fonts").glob("*.woff2"):
        FONTV[w.name] = ver(w)
    fc = A / "fonts/fonts.css"
    fc.write_text(re.sub(r"url\(\.\./fonts/([\w-]+\.woff2)\)", lambda m: f"url(../fonts/{m.group(1)}?v={FONTV[m.group(1)]})", fc.read_text()))
    VER.update(css=ver(A / "site.css"), js=ver(A / "site.js"), fonts=ver(fc), sim=ver(A / "build-sim.js"), three=ver(A / "vendor/three.min.js"))
    globe_page()
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
            imgs = "".join(f"<image:image><image:loc>{DOMAIN}/assets/img/{n}</image:loc></image:image>" for n in SITEMAP_IMAGES.get(slug, []))
            urls.append(f"<url><loc>{url(slug, L, True)}</loc><lastmod>{lastmod}</lastmod>{alts}{imgs}</url>")
    write(PUB / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + "\n".join(urls) + "\n</urlset>\n")
    write(PUB / "robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    write(PUB / "site.webmanifest", json.dumps({"name": "MIFTAH Projects", "short_name": "MIFTAH", "start_url": "/", "display": "browser", "background_color": "#F2F5F3", "theme_color": "#0E4239",
                                               "icons": [{"src": "/assets/favicon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/favicon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=1))
    EP = " " + "/".join(FORM_ENDPOINT.split("/")[:3]) if FORM_ENDPOINT else ""  # the form endpoint's origin, allowed by the CSP
    # host config for Apache (Nethost): 404 pages per language and cache headers
    write(PUB / ".htaccess", old_redirects_htaccess() + "ErrorDocument 404 /404.html\n<If \"%{REQUEST_URI} =~ m#^/he/#\">\n  ErrorDocument 404 /he/404.html\n</If>\n"
          "<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType text/html \"access plus 10 minutes\"\n  ExpiresByType text/css \"access plus 1 year\"\n  ExpiresByType application/javascript \"access plus 1 year\"\n"
          "  ExpiresByType font/woff2 \"access plus 1 year\"\n  ExpiresByType image/avif \"access plus 1 month\"\n  ExpiresByType image/webp \"access plus 1 month\"\n  ExpiresByType image/jpeg \"access plus 1 month\"\n  ExpiresByType video/mp4 \"access plus 1 month\"\n  ExpiresByType video/webm \"access plus 1 month\"\n</IfModule>\n"
          "<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml application/xml application/manifest+json text/plain\n</IfModule>\n"
          "<IfModule mod_headers.c>\n  Header always set X-Content-Type-Options \"nosniff\"\n  Header always set Referrer-Policy \"strict-origin-when-cross-origin\"\n"
          "  Header always set Content-Security-Policy \"default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'" + EP + "; frame-ancestors 'self'; form-action 'self'" + EP + "; base-uri 'self'\"\n</IfModule>\n"
          "# Turn on once HTTPS works on www.miftah.co.il (release checklist). HSTS only after the redirect is confirmed.\n"
          "# RewriteEngine On\n# RewriteCond %{HTTPS} off [OR]\n# RewriteCond %{HTTP_HOST} !^www\\. [NC]\n# RewriteRule ^ https://www.miftah.co.il%{REQUEST_URI} [L,R=301]\n"
          "# Header always set Strict-Transport-Security \"max-age=31536000\"\n")
    # host config for Vercel (the live preview): same headers as .htaccess; static files, no build step.
    csp = ("default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'" + EP +
           "; frame-src 'self'; frame-ancestors 'self'; form-action 'self'" + EP + "; base-uri 'self'")
    long_cache = [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]
    write(PUB / "vercel.json", json.dumps({
        "buildCommand": "", "installCommand": "", "outputDirectory": ".", "framework": None, "cleanUrls": False,
        # /he must end in a slash, or the Hebrew pages' relative links would point at the English ones
        "redirects": [{"source": "/he", "destination": "/he/", "permanent": True}, {"source": "/.htaccess", "destination": "/404.html", "permanent": False}] + old_redirects_vercel(),
        "headers": [
            {"source": "/(.*)", "headers": [{"key": "X-Content-Type-Options", "value": "nosniff"}, {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
                                            {"key": "Content-Security-Policy", "value": csp}]},
            {"source": "/assets/(site.css|site.js|build-sim.js|vendor/.*|fonts/.*)", "headers": long_cache},
            {"source": "/assets/(img|video)/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}]},
        ]}, indent=1) + "\n")
    print(f"built {len(list(PUB.rglob('*.html')))} pages into {PUB}")


if __name__ == "__main__":
    main()
