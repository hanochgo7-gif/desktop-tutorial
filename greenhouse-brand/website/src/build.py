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
PAGES = ["index", "net-houses", "banana-net-houses", "orchard-hail-nets", "how-we-build", "turnkey-farms", "projects", "about", "contact", "profile", "privacy", "accessibility"]


def esc(s):
    return html.escape(str(s), quote=True)


RANGE = re.compile(r"\d(?:[\d,.]*\d)?%?\s?[–-]\s?\d(?:[\d,.]*\d)?%?")


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
        "contactPoint": {"@type": "ContactPoint", "telephone": "+972-4-985-4404", "contactType": "sales", "areaServed": ["IL", "PT", "ES", "MX", "IN", "HN", "GE", "BY"]},
    }
    graph = [org, {"@type": "WebSite", "@id": f"{DOMAIN}/#site", "url": DOMAIN + "/", "name": "MIFTAH Projects", "inLanguage": ["en", "he"], "publisher": {"@id": f"{DOMAIN}/#org"}},
             {"@type": "WebPage", "url": url(slug, L, True), "name": tm(C.PAGES[slug]["title"], L), "inLanguage": L, "isPartOf": {"@id": f"{DOMAIN}/#site"}, "about": {"@id": f"{DOMAIN}/#org"}}]
    if crumbs:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    if slug in ("net-houses", "turnkey-farms", "banana-net-houses", "orchard-hail-nets"):
        kind = {"net-houses": "Agricultural net house design, manufacture and installation", "turnkey-farms": "Turnkey farm development abroad, delivered with agricultural partners",
                "banana-net-houses": "Banana net house design, manufacture and installation", "orchard-hail-nets": "Anti-hail net structures for orchards: design, manufacture and installation"}[slug]
        graph.append({"@type": "Service", "name": tm(C.PAGES[slug]["h1"], L), "provider": {"@id": f"{DOMAIN}/#org"}, "serviceType": kind})
    if slug == "index":
        graph.append({"@type": "VideoObject", "name": tm(C.PAGES["index"]["vidcap"], L), "description": tm(C.PAGES["index"]["vidcap"], L) + (". MIFTAH Projects, Kfar Masaryk, Israel." if L == "en" else ". מיפתח פרויקטים, כפר מסריק."),
                      "thumbnailUrl": f"{DOMAIN}/assets/img/hero-1600.jpg", "contentUrl": f"{DOMAIN}/assets/video/hero-wide.mp4", "uploadDate": "2026-10-26", "duration": "PT12S",
                      "publisher": {"@id": f"{DOMAIN}/#org"}, "inLanguage": L})
    if slug == "how-we-build":
        graph.append({"@type": "CreativeWork", "name": tm(C.PAGES[slug]["h1"], L), "description": tm(C.PAGES[slug]["desc"], L), "creator": {"@id": f"{DOMAIN}/#org"},
                      "image": f"{DOMAIN}/assets/img/sim-poster.jpg", "inLanguage": L, "genre": "3D illustration"})
    if slug in ("contact", "net-houses") or slug in C.CROP_PAGES:
        faq = C.FAQ if slug == "contact" else C.NET_FAQ if slug == "net-houses" else C.CROP_PAGES[slug]["faq"]
        if slug == "net-houses":  # a question shown on a crop page too is marked up only there (Google: one instance per site)
            crop_qs = {q for cp in C.CROP_PAGES.values() for q, _ in cp["faq"]}
            faq = [(q, a_) for q, a_ in faq if q not in crop_qs]
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": tm(q, L), "acceptedAnswer": {"@type": "Answer", "text": tm(a, L)}} for q, a in faq]})
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False).replace("<", "\\u003c")  # no "</script>" can close it early
    return '<script type="application/ld+json">' + data + "</script>"


def head(slug, L, crumbs=None, noindex=False, r=None):
    P = C.PAGES[slug]; r = rel(L) if r is None else r
    links = ""
    if slug != "404":
        links = (f'<link rel="canonical" href="{url(slug, L, True)}">'
                 f'<link rel="alternate" hreflang="en" href="{url(slug, "en", True)}"><link rel="alternate" hreflang="he" href="{url(slug, "he", True)}">'
                 f'<link rel="alternate" hreflang="x-default" href="{url(slug, "en", True)}">')
    pre = f'<link rel="preload" href="{r}assets/fonts/Heebo-var-latin.woff2?v={FONTV["Heebo-var-latin.woff2"]}" as="font" type="font/woff2" crossorigin>'
    if L == "he":  # Hebrew pages still need the Latin file for digits, spaces and punctuation
        pre += f'<link rel="preload" href="{r}assets/fonts/Heebo-var-hebrew.woff2?v={FONTV["Heebo-var-hebrew.woff2"]}" as="font" type="font/woff2" crossorigin>'
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
<link rel="stylesheet" href="{r}assets/site.css?v={VER["css"]}">
<noscript><style>body.top-dark .site-head:not(.solid){{background:#fff}}body.top-dark .site-head:not(.solid) :is(.nav a,.lang,.menu-btn,.tagline,.tagline-m){{color:#0D1F1B}}.crop-panel[hidden]{{display:block!important}}.form [type=submit],.form [data-next]{{display:none}}</style></noscript>
{jsonld(slug, L, crumbs) if slug != "404" else ""}
{ANALYTICS}
</head>"""


def header(slug, L):
    alt = "he" if L == "en" else "en"
    other = ("he/" if L == "en" else "../") + ("" if slug in ("index", "404") else f"{slug}.html")  # home is "/" and "/he/", never index.html (one URL per page)
    items = "".join(f'<li><a href="{s}.html"{" aria-current=" + chr(34) + "page" + chr(34) if s == slug else ""}>{esc(en if L == "en" else he)}</a></li>' for s, en, he in C.NAV)
    # the main buttons carry the page's context into the form (turnkey, net houses, the crop of a crop page)
    ctx = qs(need="turnkey") if slug == "turnkey-farms" else qs(need="nethouse") if slug == "net-houses" else \
        qs(crop=C.CROP_PAGES[slug]["prefill"], need="nethouse") if slug in C.CROP_PAGES else ""
    head_tel = "" if slug == "contact" else f'<a class="head-tel" href="tel:{C.SITE["phone_tel"]}" data-where="header-text"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg><bdi class="ltr">{esc(t(C.SITE["phone_display"], L))}</bdi></a>'  # Contact: the header button is the number
    # on Contact the header button would link to the page itself: it calls the office instead
    cta = (f'<a class="btn btn-primary head-cta" href="tel:{C.SITE["phone_tel"]}" data-where="header-contact">{esc(t(C.SITE["call"], L))} <bdi class="ltr">{esc(t(C.SITE["phone_display"], L))}</bdi></a>' if slug == "contact" else
           f'<a class="btn btn-primary head-cta" href="contact.html{ctx}" data-track="cta_click" data-label="header">{esc(t(C.SITE["cta"], L))}</a>')
    mbar = "" if slug in ("contact", "how-we-build", "profile", "404") else (
        f'<nav class="mbar" id="mbar" aria-label="{"Quick contact" if L == "en" else "יצירת קשר מהירה"}" hidden><a class="btn btn-line" href="tel:{C.SITE["phone_tel"]}" data-where="mbar">{esc(t(C.SITE["call_short"], L))}</a>'
        f'<a class="btn btn-primary" href="contact.html{ctx}" data-track="cta_click" data-label="mbar">{esc(t(C.SITE["cta"], L))}</a></nav>')
    return f"""<body{' class="top-dark"' if slug not in ("profile", "404") else ""}>
<a class="skip" href="#main">{esc(t(C.SITE["skip"], L))}</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="./" aria-label="{esc(tm(C.SITE["name"], L))}, {esc(tm(C.SITE["home"], L))}">{logo(L)}</a>
    <p class="tagline">{esc(t(C.SITE["slogan"], L))}</p>
    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="{esc(tm(C.SITE["menu"], L))}" data-open="{esc(tm(C.SITE["menu"], L))}" data-close="{esc(tm(C.SITE["close"], L))}"><span class="bars" aria-hidden="true"></span><span class="mb-t">{esc(t(C.SITE["menu"], L))}</span></button>
    <nav class="nav" id="nav" aria-label="{"Main" if L == "en" else "ראשי"}">
      <ul>{items}</ul>
      <a class="btn btn-primary nav-cta" href="contact.html{ctx}" data-track="cta_click" data-label="nav">{esc(t(C.SITE["cta"], L))}</a>
    </nav>
    <a class="lang" href="{other}" hreflang="{alt}" lang="{alt}" data-track="lang_switch">{esc(t(C.SITE["lang_other"], L))}</a>
    {head_tel}
    {cta}
    <a class="head-call" href="tel:{C.SITE["phone_tel"]}" data-where="header" aria-label="{esc(tm(C.SITE["call"], L))} {esc(tm(C.SITE["phone_display"], L))}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg></a>
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
        <ul>{nav}<li><a href="banana-net-houses.html">{esc(t(C.PAGES["banana-net-houses"]["h1"], L))}</a></li><li><a href="orchard-hail-nets.html">{esc(t(C.PAGES["orchard-hail-nets"]["h1"], L))}</a></li><li><a href="profile.html">{esc(t(S["foot_profile"], L))}</a></li></ul>
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


def page_head(slug, L, img=None, lead_key="lead", extra=""):
    """Inner-page head in the Open Skies style: the title over a full-bleed archive photo (or the deep green field), under the see-through header."""
    P = C.PAGES[slug]
    if img is None and slug in HEAD_IMG:
        name = HEAD_IMG[slug]; img = (name, next(cap for im, _, _, cap in C.STEPS if im == name))
    mid = f'<li><a href="net-houses.html">{esc(t(C.PAGES["net-houses"]["h1"], L))}</a></li>' if slug in C.CROP_PAGES else ""
    crumbs = f'<nav class="crumbs" aria-label="{"Breadcrumb" if L == "en" else "פירורי לחם"}"><ol><li><a href="./">{esc(t(C.SITE["home"], L))}</a></li>{mid}<li aria-current="page">{esc(t(P["h1"], L))}</li></ol></nav>'
    lead = f'<p class="lead">{esc(t(P[lead_key], L))}</p>' if lead_key in P else ""
    bg = cap = ""
    if img:
        name, c = img
        bg = f'<div class="ph-media" aria-hidden="true">{picture(name, "", L, sizes="100vw", archive=True, eager=True)}</div>'
        cap = f'<p class="ph-cap">{esc(t(c, L))}. {esc(t(C.SITE["archive"], L))}.</p>'
    return f'<section class="page-head{" has-img" if img else ""}">{bg}<div class="wrap ph-in">{crumbs}<h1>{esc(t(P["h1"], L))}</h1>{lead}{extra}{cap}</div></section>'


HEAD_IMG = {"projects": "p-closed", "about": "p-site"}  # archive photos not used elsewhere on those pages


def qs(**kw):
    """?crop=apple&need=nethouse, for links that pre-fill the contact form."""
    q = "&".join(f"{k}={v}" for k, v in kw.items() if v)
    return f"?{q}" if q else ""


def cta_band(L, where, crop="", need=""):
    B = C.CTA_BAND; S = C.SITE
    lines = [esc(t(B["fair"], L))] if where in ("home", "turnkey") else []
    meta = f'<p class="meta">{"<br>".join(lines)}</p>' if lines else ""
    return f"""<section class="section dark cta-band" aria-labelledby="cta-{where}">
  <div class="wrap in">
    <div>
      <h2 id="cta-{where}">{esc(t(C.CTA_HEADS[where], L))}</h2>
      <p class="lead">{esc(t(B["p"] if FORM_ENDPOINT else B["p_off"], L))}</p>
    </div>
    <div class="side">
      <div class="actions">
        <a class="btn btn-primary" href="contact.html{qs(crop=crop, need=need)}" data-track="cta_click" data-label="band-{where}">{esc(t(S["cta"], L))}</a>
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
        fig = f'<figure>{picture(img, "", L, sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 300px", archive=True)}<figcaption>{esc(t(cap, L))}. {esc(t(C.SITE["archive"], L))}.</figcaption></figure>' if photos else ""
        lis.append(f'<li>{fig}<span class="n">{i + 1:02d}</span><h3>{esc(t(h, L))}</h3><p>{esc(t(p, L))}</p></li>')
    return f'<ol class="steps{"" if photos else " plain"}">{"".join(lis)}</ol>'


def featured(L):
    P = C.PAGES["projects"]
    cards = "".join(f'<li><b>{esc(t(c, L))}</b><span>{esc(t(w, L))}</span><span class="reg">{esc(t(r, L))}</span></li>' for c, r, w in C.FEATURED)
    return f'<ul class="feat-cards">{cards}</ul>'


# ---------------------------------------------------------------- pages
def crop_more(crop, L):
    """From a crop tab to the page that answers that search in full."""
    if crop == "banana":
        return f'<p class="more crop-more"><a href="banana-net-houses.html">{esc(t(C.CROP_PAGE["more"], L))}</a></p>'
    if crop in ("apple", "cherry", "kiwi", "avocado"):
        return f'<p class="more crop-more"><a href="orchard-hail-nets.html">{esc(t(C.CROP_PAGE["more_orchard"], L))}</a></p>'
    return ""


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
        q = qs(need="nethouse") if cr["id"] == "other" else qs(crop=cr["id"], need="nethouse")
        panels.append(f'<div class="crop-panel" role="tabpanel" id="crop-{cr["id"]}-{where}" aria-labelledby="tab-{cr["id"]}-{where}"{"" if sel else " hidden"}>'
                      f'<p class="crop-say">{esc(t(cr["say"], L))}</p><dl class="crop-spec">{rows}</dl>{proj}'
                      f'<p class="crop-min">{esc(t(H["crop_min"], L))}</p>'
                      f'<a class="btn btn-primary" href="contact.html{q}" data-track="cta_click" data-label="crop-{cr["id"]}">{esc(t(H["crop_cta"] if cr["id"] != "other" else H["crop_ask"], L))}</a>{crop_more(cr["id"], L)}</div>')
    return f"""<section class="section crop cable-top" id="crop" aria-labelledby="crop-h-{where}">
  <div class="wrap">
    <div class="crop-head"><h2 id="crop-h-{where}">{esc(t(H["crop_h"], L))}</h2><p class="lead">{esc(t(H["crop_p"], L))}</p></div>
    <div class="crop-tabs" role="tablist" aria-label="{esc(tm(H["crop_h"], L))}">{"".join(tabs)}</div>
    <div class="crop-body"><div class="crop-panels">{"".join(panels)}</div><div class="crop-fig">{fig}</div></div>
  </div>
</section>"""


def p_index(L):
    P = C.PAGES["index"]; H = C.HOME3; S = C.SITE; O = C.OS; r = rel(L)
    vids = f'data-src-wide="{r}assets/video/hero-wide.mp4" data-src-small="{r}assets/video/hero-720.mp4" data-src-portrait="{r}assets/video/hero-portrait.mp4"'
    poster = (f'<picture><source media="(max-width: 720px) and (orientation: portrait)" type="image/avif" srcset="{r}assets/img/hero-portrait-720.avif">'
              f'<source media="(max-width: 720px) and (orientation: portrait)" type="image/webp" srcset="{r}assets/img/hero-portrait-720.webp">'
              f'<source type="image/avif" srcset="{r}assets/img/hero-960.avif 960w, {r}assets/img/hero-1600.avif 1600w" sizes="100vw">'
              f'<source type="image/webp" srcset="{r}assets/img/hero-960.webp 960w, {r}assets/img/hero-1600.webp 1600w" sizes="100vw">'
              f'<img src="{r}assets/img/hero-1600.jpg" alt="" width="1600" height="900" fetchpriority="high"></picture>')
    # The slogan is the page headline: a thin line, then a heavy one. The Hebrew breaks after the company name, never before the dash.
    sl = t(S["slogan"], L)
    if " - " in sl:
        a, b = sl.split(" - ", 1); a += " -"
    else:
        a, b = sl.split(" feels ", 1) if " feels " in sl else (sl, ""); b = ("feels " + b) if b else ""
    slogan_h1 = f'<span class="h1-a">{esc(a)}</span> <span class="h1-b">{esc(b)}</span>' if b else esc(sl)
    items = "".join(f"<span>{esc(t(x, L))}</span>" for x in O["ticker"])
    ticker = (f'<section class="ticker" aria-label="{esc(tm(O["ticker_label"], L))}"><div class="ticker-track">{items}<span aria-hidden="true" class="dup">{items}</span></div>'
              f'<button class="ticker-btn" type="button" aria-pressed="false" data-pause="{esc(tm(O["ticker_pause"], L))}" data-play="{esc(tm(O["ticker_play"], L))}" aria-label="{esc(tm(O["ticker_pause"], L))}">'
              '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path class="i-pause" d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/><path class="i-play" d="M2 1l9 5-9 5z" fill="currentColor"/></svg></button></section>')
    # a figure that is a word ("Own plant") is set smaller than the numbers, so it stays on one line
    facts = "".join(f'<div class="fact{"" if re.search(r"[0-9]", tm(a_, L)) else " w"}"><b>{esc(t(a_, L))}</b><span>{esc(t(b_, L))}</span></div>' for a_, b_ in C.FACTS)
    def sol(x):
        img = picture(x["img"], tm(x["alt"], L), L, sizes="(max-width: 980px) 100vw, 40vw", archive=True) if x["img"] else ""
        chips = "".join(f"<span>{esc(t(c, L))}</span>" for c in x["chips"])
        # a card without a photo shows the four phases of a turnkey farm instead (the text below already names them, so this is for the eye)
        if not x["img"]:
            img = '<ol class="sol-phases" aria-hidden="true">' + "".join(f'<li><span class="n">{i + 1:02d}</span>{esc(t(ph, L))}</li>' for i, (ph, _) in enumerate(C.STAGES)) + '</ol>'
        return (f'<a class="sol{"" if x["img"] else " sol-plain"}" href="{x["href"]}" data-track="route_click" data-label="sol-{x["img"] or "stage"}">{img}'
                f'<div class="sol-body"><small>{esc(t(x["k"], L))}</small><h3>{esc(t(x["h"], L))}</h3><p>{esc(t(x["p"], L))}</p><div class="chips">{chips}</div></div></a>')
    sols = "".join(sol(x) for x in O["sols"])
    rows = [(en, he, a_) for en, he, _, a_ in C.PROJECT_ROWS if a_]
    top = max(a_ for *_, a_ in rows)
    bars = "".join(f'<li><b>{esc(en if L == "en" else he)}</b><span class="bar"><i style="width:{a_ / top * 100:.0f}%"></i></span>'
                   f'<span class="v">{(f"{a_ / 10000:g}" if L == "en" else f"{a_ / 1000:g}")} {esc(t(O["world_unit"], L))}</span></li>' for en, he, a_ in rows)
    more = "".join(f'<li><b>{esc(t(c, L))}</b><span>{esc(t(w, L))}</span></li>' for c, w in O["world_more"])
    # the 11 stages in their 4 phases (assess, design, build, operate), numbered across the phases
    path, n = [], 0
    for ph, items in C.STAGES:
        lis = "".join(f'<li><span class="n">{n + i + 1:02d}</span>{esc(t(x[0], L))}</li>' for i, x in enumerate(items))
        path.append(f'<div class="pp"><h3>{esc(t(ph, L))}</h3><ol start="{n + 1}">{lis}</ol></div>'); n += len(items)
    path = "".join(path)
    return f"""
<main id="main">
<section class="hero hero-os" aria-labelledby="hero-h">
  <div class="hero-media" aria-hidden="true">{poster}<video id="hero-video" muted loop playsinline preload="none" {vids}></video></div>
  <div class="wrap hero-in">
    <h1 id="hero-h">{slogan_h1}</h1>
    <div class="hero-row">
      <div><p class="hero-sub">{esc(t(H["h1"], L))}</p><p class="lead">{esc(t(H["lead"], L))}</p></div>
      <div class="actions">
        <a class="btn btn-primary" href="contact.html" data-track="cta_click" data-label="hero">{esc(t(S["cta"], L))}</a>
        <a class="btn btn-line" href="#crop" data-track="route_click" data-label="hero-crop">{esc(t(H["cta2"], L))}</a>
      </div>
    </div>
    <div class="hero-foot"><a class="hero-invest" href="turnkey-farms.html" data-track="route_click" data-label="hero-investors">{esc(t(H["invest"], L))}</a><span class="hero-cap">{esc(t(P["vidcap"], L))}</span><button class="vid-btn" type="button" data-video="hero-video" data-play="{esc(t(S["video_play"], L))}" data-pause="{esc(t(S["video_pause"], L))}"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg><span>{esc(t(S["video_play"], L))}</span></button></div>
  </div>
</section>
{ticker}

<section class="statement-os" aria-labelledby="who-k">
  <div class="wrap">
    <h2 class="kicker" id="who-k">{esc(t(O["who_k"], L))}</h2>
    <p class="big"><strong>{esc(t(O["statement_b"], L))}</strong>{esc(t(O["statement"], L))}</p>
    <div class="facts-os">{facts}</div>
  </div>
</section>

<section class="solutions" aria-labelledby="sol-h">
  <div class="wrap">
    <div class="os-head"><h2 id="sol-h">{esc(t(O["sol_h"], L))}</h2><p class="lead">{esc(t(O["sol_p"], L))}</p></div>
    <div class="sol-grid">{sols}</div>
  </div>
</section>

{crop_selector(L)}

<section class="section build field-os" aria-labelledby="steps-h">
  <div class="wrap">
    <div class="os-head"><h2 id="steps-h">{esc(t(H["steps_h"], L))}</h2><p class="lead">{esc(t(H["steps_p"], L))}</p></div>
    {steps(L)}
    <p class="swipe-hint" aria-hidden="true">{esc(t(H["steps_swipe"], L))}</p>
    <p class="more sim-link"><a href="how-we-build.html">{esc(t(H["sim_go"], L))}</a></p>
  </div>
</section>

<section class="section dark world" aria-labelledby="proof-h">
  <div class="wrap world-grid">
    <div><p class="kicker">{esc(t(O["world_k"], L))}</p><h2 id="proof-h">{esc(t(H["proof_h"], L))}</h2><p class="lead">{esc(t(H["proof_p"], L))}</p><p class="more"><a href="projects.html">{esc(t(H["proof_go"], L))}</a></p></div>
    <div><ul class="bars">{bars}</ul><p class="bars-cap">{esc(t(O["world_cap"], L))}</p><ul class="markets">{more}</ul></div>
  </div>
</section>

<section class="section owners" aria-labelledby="who-h">
  <div class="wrap">
    <h2 id="who-h">{esc(t(H["who_h"], L))}</h2>
    <p class="big-quote">{esc(t(H["who_peace"], L))}</p>
    <div class="owners-more"><p>{esc(t(H["who_p"], L))}</p><div><p>{esc(t(H["who_refs"], L))}</p><p class="more"><a href="about.html">{esc(t(H["who_go"], L))}</a></p></div></div>
  </div>
</section>

<section class="section path-os" aria-labelledby="inv-h">
  <div class="wrap">
    <div class="os-head"><h2 id="inv-h">{esc(t(O["path_h"], L))}</h2><div><p class="lead">{esc(t(H["inv_p"], L))}</p><p class="inv-note">{esc(t(H["inv_note"], L))}</p></div></div>
    <div class="path-phases">{path}</div>
    <div class="actions"><a class="btn btn-primary" href="turnkey-farms.html" data-track="route_click" data-label="investors">{esc(t(H["inv_go"], L))}</a></div>
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
{cta_band(L, "net", need="nethouse")}
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
        chs.append(f'<section class="sim-ch" aria-labelledby="sim-h{i}"><div class="sim-card"><span class="k"><span class="num">{i + 1:02d}</span> {esc(t(k, L))}<span class="k-ill"> · {esc(t(S["badge"], L))}</span></span>'
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
{page_head("turnkey-farms", L, extra=f'<div class="actions ph-actions"><a class="btn btn-primary" href="contact.html{qs(need="turnkey")}" data-track="cta_click" data-label="turnkey-head">{esc(t(P["cta_tk"], L))}</a><a class="btn btn-line" href="profile.html" data-track="profile_open">{esc(t(P["profile_go"], L))}</a></div>')}
<section class="section" aria-labelledby="honest-h">
  <div class="wrap split">
    <div>
      <h2 id="honest-h" class="h-small">{esc(t(P["honest_h"], L))}</h2><p class="lead" style="margin-top:10px">{esc(t(P["honest_p"], L))}</p>
      <h2 class="h-small" style="margin-top:28px">{esc(t(P["pt_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["pt_p"], L))}</p>
    </div>
    <div>
      <h2 class="h-small">{esc(t(P["where_h"], L))}</h2><p class="muted" style="margin-top:8px">{esc(t(P["where_p"], L))}</p>
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
{cta_band(L, "turnkey", need="turnkey")}
</main>"""


def p_projects(L):
    P = C.PAGES["projects"]
    return f"""
<main id="main">
{page_head("projects", L)}
<section class="section white" aria-labelledby="map-h">
  <div class="wrap">
    <div class="os-head"><div><h2 id="map-h">{esc(t(C.GLOBE["h"], L))}</h2><p class="lead">{esc(t(C.GLOBE["p"], L))}</p></div>
      <p class="more"><a href="{rel(L)}globe/index.html?lang={L}" data-track="globe_open">{esc(t(C.GLOBE["full"], L))}</a></p></div>
    <div class="globe-frame" id="globe-frame"><img src="{rel(L)}assets/img/globe-poster-{L}.jpg" width="1240" height="698" alt="" loading="lazy" decoding="async"><span class="ill-chip">{esc(t(C.SIM["badge"], L))}</span>
      <iframe data-src="{rel(L)}globe/index.html?lang={L}#compact" title="{esc(tm(C.GLOBE["title"], L))}" tabindex="-1" hidden></iframe>
      <button type="button" class="btn btn-primary globe-go" data-loading="{esc(tm(C.GLOBE["loading"], L))}">{esc(t(C.GLOBE["go"], L))}</button></div>
    <div class="proj-table">{projects_table(L)}</div>
  </div>
</section>
<section class="section how-abroad" aria-labelledby="how-h">
  <div class="wrap">
    <h2 id="how-h">{esc(t(P["how_h"], L))}</h2>
    <ol class="path how-path">{"".join(f'<li><span class="n">{i + 1:02d}</span><b>{esc(t(h, L))}</b><span class="d">{esc(t(d, L))}</span></li>' for i, (h, d) in enumerate(P["how"]))}</ol>
  </div>
</section>
<section class="section white" aria-labelledby="feat-h">
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
<section class="section" aria-labelledby="values-h">
  <div class="wrap">
    <h2 id="values-h">{esc(t(P["values_h"], L))}</h2>
    <ul class="values">{"".join(f'<li><b>{esc(t(a, L))}</b><span>{esc(t(b_, L))}</span></li>' for a, b_ in C.VALUES)}</ul>
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
    {choices("role", F["roles"], L, F["role"])}
    {choices("need", F["needs"], L, F["need"])}
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
    {inp("heard", F["heard"], L, hint=F["heard_hint"])}
    <div class="field full"><label for="f-message">{esc(t(F["message"], L))}</label><textarea id="f-message" name="message" rows="4"></textarea></div>
    <div class="hp" aria-hidden="true"><label for="f-website">{esc(t(F["honeypot"], L))}</label><input id="f-website" name="mt_hp" type="text" tabindex="-1" autocomplete="off"></div>
    <label class="check full"><input type="checkbox" name="berlin" value="yes"><span>{esc(t(F["berlin"], L))}</span></label>
    <div class="check full"><input type="checkbox" id="f-consent" name="consent" value="yes" required aria-required="true"><label for="f-consent">{consent}</label></div>
    </div>
    <div class="actions fnav"><button class="btn btn-line" type="button" data-back>{esc(t(F["back"], L))}</button><button class="btn btn-primary" type="submit">{esc(t(F["send"] if FORM_ENDPOINT else F["send_off"], L))}</button></div>
  </div>
</form>
<div class="form-status" id="form-status" role="status" aria-live="polite" hidden></div>"""
    nxt = "".join(f'<li><b>{esc(t(h, L))}</b><span>{esc(t(d, L))}</span></li>' for h, d in C.NEXT)
    aside = f"""<aside class="aside" aria-label="{"Other ways to reach us" if L == "en" else "דרכים נוספות"}">
  <div class="block next-block"><h2 id="next-h">{esc(t(C.NEXT_H, L))}</h2><ol class="next-list">{nxt}</ol><p class="small muted">{esc(t(C.NEXT_ABROAD, L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_phone_h"], L))}</h2><a class="big-phone" href="tel:{S["phone_tel"]}" data-where="contact"><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi></a><p>{esc(t(P["aside_phone_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_min_h"], L))}</h2><p>{esc(t(P["aside_min_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_profile_h"], L))}</h2><p>{esc(t(P["aside_profile_p"], L))}</p><p><a href="profile.html" data-track="profile_open">{esc(t(P["aside_profile_go"], L))}</a></p></div>
  <div class="block"><h2>{esc(t(P["aside_partner_h"], L))}</h2><p>{esc(t(P["aside_partner_p"], L))}</p></div>
  <div class="block" id="berlin"><h2>{esc(t(P["aside_fair_h"], L))}</h2><p>{esc(t(P["aside_fair_p"], L))}</p></div>
  <div class="block"><h2>{esc(t(P["aside_office_h"], L))}</h2><p>{esc(t(S["name"], L))}<br>{esc(t(S["town"], L))}</p></div>
</aside>"""
    return f"""
<main id="main">
{page_head("contact", L, lead_key="lead" if FORM_ENDPOINT else "lead_off",
            extra=f'<p class="ph-call"><a class="btn btn-primary" href="tel:{S["phone_tel"]}" data-where="contact-head">{esc(t(P["call_pill"], L)).replace("{phone}", "<bdi class=" + chr(34) + "ltr" + chr(34) + ">" + esc(t(S["phone_display"], L)) + "</bdi>")}</a></p>')}
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
    host = DOMAIN.split("//", 1)[1]
    qr_alt = f"QR code for {host}" if L == "en" else f"קוד QR לאתר {host}"
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
  <section class="p-contact"><div><h2>{esc(t(P["contact_h"], L))}</h2><p><bdi class="ltr">{esc(t(S["phone_display"], L))}</bdi> &nbsp;|&nbsp; {esc(t(S["town"], L))} &nbsp;|&nbsp; <span class="ltr">{esc(host)}</span></p></div>
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
    he_too = ("" if L == "he" else
              f'<div class="nf-he" lang="he" dir="rtl"><p class="lead">{esc(tm(P["p"], "he"))}</p><ul><li><a href="he/">{esc(tm(C.SITE["home"], "he"))}</a></li>'
              f'<li><a href="he/contact.html">{esc(tm(C.PAGES["contact"]["h1"], "he"))}</a></li></ul></div>')
    links = "".join(f'<li><a href="{s}.html">{esc(en if L == "en" else he)}</a></li>' for s, en, he in C.NAV)
    return f"""
<main id="main"><section class="section"><div class="wrap nf"><h1>{esc(t(P["h1"], L))}</h1><p class="lead">{esc(t(P["p"], L))}</p><ul><li><a href="./">{esc(t(C.SITE["home"], L))}</a></li>{links}</ul>{he_too}</div></section></main>"""


def rootify(s, L):
    """The 404 page is served at any depth, so make its links and assets absolute from the site root."""
    base = "/" if L == "en" else "/he/"
    s = re.sub(r'(href|src)="(\.\./)?assets/', r'\1="/assets/', s)
    s = re.sub(r'href="([a-z0-9-]+\.html)"', lambda m: f'href="{base}{m.group(1)}"', s)
    s = s.replace('href="./"', f'href="{base}"').replace('href="he/', 'href="/he/').replace('href="../', 'href="/').replace('href="site.webmanifest"', 'href="/site.webmanifest"')
    return s


def p_crop(slug, L):
    """A page per search intent (banana net houses / hail nets for orchards): the answer, the drawing, what we built, the process, questions."""
    D = C.CROP_PAGES[slug]; G = C.CROP_PAGE
    fig, _ = drawing(L, animate=False, sfx="p")
    fig = fig.replace('<figure class="drawing"', f'<figure class="drawing crop-dw" data-crop="{D["crop"]}"', 1)
    rows = "".join(f'<div><dt>{esc(t(k, L))}</dt><dd>{esc(t(v, L))}</dd></div>' for k, v in D["rows"])
    proj = "".join(f'<li><b>{esc(t(w, L))}</b><span>{esc(t(r_, L))}</span></li>' for r_, w in D["proj"])
    faq = D["faq"]
    faqs = "".join(f'<details><summary>{esc(t(q, L))}</summary><p>{esc(t(a, L))}</p></details>' for q, a in faq)
    return f"""
<main id="main">
{page_head(slug, L, img=(D["img"], D["cap"]))}
<section class="section crop-page" aria-labelledby="spec-h">
  <div class="wrap crop-body">
    <div><h2 id="spec-h">{esc(t(D["spec_h"], L))}</h2><dl class="crop-spec">{rows}</dl>
      <div class="actions"><a class="btn btn-primary" href="contact.html{qs(crop=D["prefill"], need="nethouse")}" data-track="cta_click" data-label="page-{slug}">{esc(t(C.HOME3["crop_cta"], L))}</a></div></div>
    <div class="crop-fig">{fig}</div>
  </div>
</section>
<section class="section white" aria-labelledby="proj-h">
  <div class="wrap proj-split">
    <div><h2 id="proj-h">{esc(t(G["proj_h"], L))}</h2><p class="lead">{esc(t(G["proj_note"], L))}</p></div>
    <ul class="feat-cards">{proj}</ul>
  </div>
</section>
<section class="section" aria-labelledby="csteps-h">
  <div class="wrap">
    <h2 id="csteps-h" class="os-steps-h">{esc(t(G["steps_h"], L))}</h2>
    {steps(L, photos=False)}
    <p class="more sim-link"><a href="how-we-build.html">{esc(t(C.HOME3["sim_go"], L))}</a></p>
  </div>
</section>
<section class="section white" aria-labelledby="cfaq-h">
  <div class="wrap split">
    <h2 id="cfaq-h">{esc(t(G["faq_h"], L))}</h2>
    <div class="faq">{faqs}</div>
  </div>
</section>
{cta_band(L, slug, D["prefill"], need="nethouse")}
</main>"""


RENDER = {"index": p_index, "banana-net-houses": lambda L: p_crop("banana-net-houses", L), "orchard-hail-nets": lambda L: p_crop("orchard-hail-nets", L), "net-houses": p_net, "how-we-build": p_sim, "turnkey-farms": p_turnkey, "projects": p_projects, "about": p_about,
          "contact": p_contact, "profile": p_profile,
          "privacy": lambda L: p_prose("privacy", L, C.PRIVACY), "accessibility": lambda L: p_prose("accessibility", L, C.A11Y)}


SITEMAP_IMAGES = {  # the real photos on each page (and the 3D still), largest size
    "index": ["hero-1600.jpg", "p-site-1600.jpg", "p-marking-1600.jpg", "p-poles-1600.jpg", "p-closed-1600.jpg"],
    "net-houses": ["forest-1600.jpg", "p-poles-1600.jpg"], "turnkey-farms": ["valley-1600.jpg"],
    "banana-net-houses": ["valley-1600.jpg"], "orchard-hail-nets": ["forest-1600.jpg"],
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
    for old, new in (("מיפתח פרויקטים · חקלאות שיש לה בית", "מיפתח פרויקטים - חקלאות שיש לה בית"), ("MIFTAH Projects · Where agriculture feels at home", "Where agriculture feels at home"),
                     ('d: "4 פרויקטים בגליל ובגולן"', 'd: "פרויקטים נבחרים בישראל"'), ('d: "4 projects in the Galilee and the Golan"', 'd: "Selected projects in Israel"'),
                     ("מכפר מסריק לגליל, לגולן, ולשבע מדינות מעבר לים. בכל פרויקט בחו״ל אנחנו מתכננים, מדריכים צוות מקומי ומנהלים את הביצוע.",
                      "ישראל ושבע מדינות מעבר לים. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע."),
                     ("From Kfar Masaryk to the Galilee, the Golan and seven countries abroad. On every project abroad we design, train a local crew and manage the build.",
                      "Israel and seven countries abroad. Abroad, we plan the work, train local crews and manage the build."),
                     # opened without ?lang and without a saved choice: the browser's language (Hebrew browsers get Hebrew)
                     ('var L = "he", sel = "il";', 'var L = /^he\\b/i.test(navigator.language || "") ? "he" : "en", sel = "il";'),
                     ('{ id: "baram", g: "il", lat: 33.063, lon: 35.432, prec: "exact",', '{ id: "ug", g: "il", lat: 33.0, lon: 35.5, prec: "region",'),
                     ('var fly = p.g === "il" && HAS_FLY ?', 'var fly = p.id === "il" && HAS_FLY ?')):
        assert old in js, old
        js = js.replace(old, new)
    js += ('\n(function () { var a = document.getElementById("globe-cta"); if (!a) return; function u() { var en = document.documentElement.lang === "en";'
           ' a.href = en ? "../contact.html" : "../he/contact.html"; a.textContent = en ? "Discuss your project" : "דברו איתנו על הפרויקט";'
           ' var fb = document.getElementById("flybox"); if (fb) fb.setAttribute("aria-label", en ? "From orbit to the net house" : "מהחלל אל בית הרשת");'
           ' var ic = document.getElementById("ill-chip"); if (ic) ic.textContent = en ? "Illustration" : "הדמיה"; }'
           ' u(); new MutationObserver(u).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); })();\n')
    (out / "globe.js").write_text(js)
    page = src[:i0] + f'<script src="globe.js?v={ver(out / "globe.js")}"></script>' + src[i1 + len("</script>"):]
    assert page.count("מיפתח פרויקטים · חקלאות שיש לה בית") == 1
    page = page.replace("מיפתח פרויקטים · חקלאות שיש לה בית", "מיפתח פרויקטים - חקלאות שיש לה בית")
    page = page.replace('<button class="lang" id="lang" type="button" lang="en">English</button>',
                        '<button class="lang" id="lang" type="button" lang="en">English</button><a id="globe-cta" class="globe-cta" href="../he/contact.html">דברו איתנו על הפרויקט</a><span class="ill-chip" id="ill-chip">הדמיה</span>', 1)
    assert 'id="globe-cta"' in page
    page, n = re.subn(r'(<p class="note" id="note">)מקור:[^<]*', r'\1' + NOTE["he"], page); assert n == 1
    page = re.sub(r'(<div class="top">)(<svg class="logo".*?</svg>)', r'\1<a id="home-link" href="../index.html">\2</a>', page, count=1, flags=re.S)
    assert 'id="home-link"' in page
    page = page.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', f'<script src="../assets/vendor/three.min.js?v={VER["three"]}"></script>')
    page = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n|<link rel="preconnect"[^>]*>\n|<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n', "", page)
    page = page.replace('"Heebo", Arial, sans-serif', '"Heebo", "Heebo Fallback", Arial, sans-serif').replace('--mono: "IBM Plex Mono", ui-monospace, monospace;', '--mono: var(--font);')
    assert "googleapis" not in page and "cdnjs" not in page
    title = re.search(r"<title>(.*?)</title>", page).group(1)
    page = page.replace(f"<title>{title}</title>", "", 1)
    # in the embed: a plain deep-green field instead of the space backdrop, and vertical swipes left to the page
    page = page.replace("</style>", ".compact .globe { background: radial-gradient(90% 80% at 50% 45%, #0E4239 0%, #061A16 70%); touch-action: pan-y; }\n"
                        ".globe-cta { margin-inline-start: 12px; padding: 8px 16px; border-radius: 999px; background: #7FC49B; color: #0E4239; font-weight: 700; text-decoration: none; white-space: nowrap; }\n"
                        ".compact .globe-cta { display: none; }\n.ill-chip { margin-inline-start: 10px; padding: 3px 10px; border-radius: 999px; background: rgba(6, 26, 22, .72); color: #fff; font-size: .75rem; white-space: nowrap; }\n.compact .ill-chip { display: none; }\nhtml:not([data-i18n]) #eb, html:not([data-i18n]) #h1, html:not([data-i18n]) #lede, html:not([data-i18n]) #hint, html:not([data-i18n]) #note, html:not([data-i18n]) #g1, html:not([data-i18n]) #g2, html:not([data-i18n]) #s1, html:not([data-i18n]) #s2, html:not([data-i18n]) #s3 { visibility: hidden; }\n.item:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #7FC49B; outline-offset: 2px; }\n</style>", 1)
    head = ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<title>{title}</title>\n<meta name="robots" content="noindex">\n<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">\n'
            f'<link rel="stylesheet" href="../assets/fonts/fonts.css?v={VER["fonts"]}">\n</head>\n<body>\n')
    (out / "index.html").write_text(head + page + "\n</body>\n</html>\n")
    for f in ("space.jpg", "fly.mp4", "fly.jpg"):
        shutil.copy(G / f, out / f)


def crumbs_for(slug, L):
    if slug == "index":
        return None
    mid = [(tm(C.PAGES["net-houses"]["h1"], L), url("net-houses", L, True))] if slug in C.CROP_PAGES else []
    return [(tm(C.SITE["home"], L), url("index", L, True))] + mid + [(tm(C.PAGES[slug]["h1"], L), url(slug, L, True))]


def write(path, s):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(s, encoding="utf-8")


VER = {}


# The old WordPress site's URLs (from its Yoast sitemaps, read 28 Oct 2026) and where each one lives now.
# Used only once www.miftah.co.il points at this site: Google keeps the old pages' standing through 301s.
# Every URL in the old WordPress site's Yoast sitemaps (59, read 29 Oct 2026), mapped to the best new page.
# Used once www.miftah.co.il points at this site, so the old pages' standing in Google carries over.
OLD_HE = [  # Hebrew pages, exact path (decoded) -> new Hebrew page
    ("אודות", "about"), ("הנהלה", "about"), ("המלצות", "projects"), ("פרוייקטים", "projects"), ("project", "projects"),
    ("פתרונות", "net-houses"), ("פתרונות-קירוי-והצללה-חקלאיים", "net-houses"), ("ייעוץ-תכנון-ניהול-והדרכה", "net-houses"),
    ("פתרונות-קירוי-והצללה-אזרחיים", "index"), ("יצירת-קשר", "contact"), ("sample-page", "index"), ("8", "index"),
    ("project/סככות-העמסה", "net-houses"), ("project/בתי-רשת-לבננות", "banana-net-houses"), ("project/פרוייקטים-במטעים", "orchard-hail-nets"),
    ("project/פרוייקטים-בעולם", "projects"), ("project/פרוייקטים-אזרחיים", "index"), ("project/145", "projects"),
    ("project-category/בתי-רשת-וחממות", "net-houses"), ("project-category/בתי-רשת-לבננות", "banana-net-houses"), ("project-category/סככות-העמסה", "net-houses"),
    ("project-category/פרוייקטים-אזרחיים", "index"), ("project-category/פרוייקטים-במטעים", "orchard-hail-nets"), ("project-category/פרוייקטים-בעולם", "projects"),
]
OLD_HE_PREFIX = [("project", "projects"), ("project-category", "projects"), ("dt_testimonials", "projects"), ("ללא-קטגוריה", "index"), ("category", "index")]
OLD_EN = [  # English pages were ?lang=en; exact path -> new English page
    ("about", "about"), ("management", "about"), ("recommendations", "projects"), ("projects", "projects"), ("solutions", "net-houses"),
    ("agricultural-shading-solutions", "net-houses"), ("planning-guiding", "net-houses"), ("civil-shading-solutions", "index"), ("contact", "contact"),
    ("project/בתי-רשת-לבננות", "banana-net-houses"), ("project/פרוייקטים-של-בתי-רשת-במטעים", "orchard-hail-nets"), ("project/פרוייקטים-של-בתי-רשת-במטעים-2", "orchard-hail-nets"),
    ("project/סככות-צל-להעמסה", "net-houses"), ("project/בתי-רשת-לירקות", "net-houses"), ("project/בתי-רשת-לירקות-2", "net-houses"),
    ("project/קירוי-והצללת-מתחמים-אזרחיים", "index"), ("project/קירוי-והצללת-מתחמים-אזרחיים-2", "index"), ("project/פרוייקטים-בעולם", "projects"),
    ("project-category/bananas-plantations-shadings", "banana-net-houses"), ("project-category/loading-area-shadings", "net-houses"),
    ("project-category/greenhouses", "net-houses"), ("project-category/international-projects", "projects"), ("project-category/civil-projects", "index"),
]


def _he(slug): return "/he/" if slug == "index" else f"/he/{slug}.html"
def _en(slug): return "/" if slug == "index" else f"/{slug}.html"


def old_redirects_htaccess():
    """mod_rewrite rules. RewriteRule matches the decoded path, so the Hebrew slugs are written as text (any %-encoding case matches)."""
    out = ["Options -Indexes", "RewriteEngine On", "# old site, English pages (?lang=en)"]
    for old, new in OLD_EN:
        out += ["RewriteCond %{QUERY_STRING} (^|&)lang=en(&|$)", f"RewriteRule ^{re.escape(old)}/?$ {_en(new)}? [R=301,L,NC]"]
    out += ["RewriteCond %{QUERY_STRING} (^|&)lang=en(&|$)", "RewriteRule ^(project|project-category)/ /projects.html? [R=301,L,NC]",
            "RewriteCond %{QUERY_STRING} (^|&)lang=en(&|$)", "RewriteRule ^$ /? [R=301,L]", "# old site, Hebrew pages"]
    for old, new in OLD_HE:
        out.append(f"RewriteRule ^{re.escape(old)}/?$ {_he(new)} [R=301,L,NC]")
    for old, new in OLD_HE_PREFIX:
        out.append(f"RewriteRule ^{re.escape(old)}/ {_he(new)} [R=301,L,NC]")
    out.append("RewriteRule ^(feed|comments/feed|xmlrpc\\.php|wp-.*)(/.*)?$ - [G,L]")
    out += ["# one URL per page: no index.html, and the .html ending is optional",
            "RewriteCond %{THE_REQUEST} \\s/(he/)?index\\.html[\\s?]", "RewriteRule ^(he/)?index\\.html$ /$1 [R=301,L]",
            f"RewriteRule ^(he/)?({'|'.join(x for x in PAGES if x != 'index')})/?$ /$1$2.html [R=301,L]"]
    return "\n".join(out) + "\n"


def old_redirects_vercel():
    """The same map for Vercel, which matches the path as sent. Browsers send Hebrew as upper-case %D7..., WordPress wrote
    lower case, and Vercel matches the case exactly, so every Hebrew source is listed in both (Team F, 29 Oct 2026)."""
    from urllib.parse import quote
    def encs(x): e = quote(x, safe="-_/"); return sorted({e, e.lower()}) if e != x else [x]
    q = [{"type": "query", "key": "lang", "value": "en"}]
    r = []
    for old, new in OLD_EN:
        r += [{"source": f"/{e}{{/}}?", "has": q, "destination": _en(new), "permanent": True} for e in encs(old)]
    r += [{"source": "/(project|project-category)/:rest(.*)", "has": q, "destination": "/projects.html", "permanent": True}]
    for old, new in OLD_HE:
        r += [{"source": f"/{e}{{/}}?", "destination": _he(new), "permanent": True} for e in encs(old)]
    for old, new in OLD_HE_PREFIX:
        r += [{"source": f"/{e}/:rest(.*)", "destination": _he(new), "permanent": True} for e in encs(old)]
    # one URL per page: no index.html, and the .html ending is optional
    r += [{"source": "/index.html", "destination": "/", "permanent": True}, {"source": "/he/index.html", "destination": "/he/", "permanent": True}]
    for slug in PAGES:
        if slug != "index":
            r += [{"source": f"/{slug}", "destination": f"/{slug}.html", "permanent": True}, {"source": f"/he/{slug}", "destination": f"/he/{slug}.html", "permanent": True}]
    return r


LASTMOD = SRC / "data/lastmod.json"


def page_lastmod(pages):
    """Per-page lastmod for the sitemap: the date a page's main content last changed (hash of <main>), not one date for every page."""
    import hashlib
    try:
        known = json.loads(LASTMOD.read_text())
    except (OSError, ValueError):
        known = {}
    today, out = datetime.date.today().isoformat(), {}
    for key, html in pages.items():
        m = re.search(r"<main.*?</main>", html, re.S)
        h = hashlib.sha1((m.group(0) if m else html).encode()).hexdigest()[:16]
        old = known.get(key)
        out[key] = old if old and old["hash"] == h else {"hash": h, "date": old and today or SOURCE_DATE.isoformat()}
    LASTMOD.write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
    return {k: v["date"] for k, v in out.items()}


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
    # the @font-face rules go at the top of site.css, so pages load one stylesheet (fonts.css stays for the globe page)
    (A / "site.css").write_text(fc.read_text().replace("url(../fonts/", "url(fonts/") + "\n" + (A / "site.css").read_text())
    VER.update(css=ver(A / "site.css"), js=ver(A / "site.js"), fonts=ver(fc), sim=ver(A / "build-sim.js"), three=ver(A / "vendor/three.min.js"))
    from PIL import Image  # /favicon.ico for clients that ask for it by default
    Image.open(A / "favicon-32.png").convert("RGBA").save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32)])
    globe_page()
    built = {}
    for L in LANGS:
        base = PUB if L == "en" else PUB / "he"
        for slug in PAGES:
            html = head(slug, L, crumbs_for(slug, L), noindex=(slug == "profile")) + header(slug, L) + RENDER[slug](L) + footer(L)
            write(base / ("index.html" if slug == "index" else f"{slug}.html"), html)
            built[f"{L}/{slug}"] = html
        write(base / "404.html", rootify(head("404", L, noindex=True) + header("404", L) + p_404(L) + footer(L), L))
    lastmod = page_lastmod(built)
    urls = []
    for slug in PAGES:
        if slug == "profile":
            continue
        for L in LANGS:
            alts = "".join(f'<xhtml:link rel="alternate" hreflang="{a}" href="{url(slug, a, True)}"/>' for a in LANGS) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{url(slug, "en", True)}"/>'
            imgs = "".join(f"<image:image><image:loc>{DOMAIN}/assets/img/{n}</image:loc></image:image>" for n in SITEMAP_IMAGES.get(slug, []))
            urls.append(f"<url><loc>{url(slug, L, True)}</loc><lastmod>{lastmod[f'{L}/{slug}']}</lastmod>{alts}{imgs}</url>")
    write(PUB / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + "\n".join(urls) + "\n</urlset>\n")
    write(PUB / "robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    write(PUB / "site.webmanifest", json.dumps({"name": "MIFTAH Projects", "short_name": "MIFTAH", "start_url": "/", "display": "browser", "background_color": "#F2F5F3", "theme_color": "#0E4239",
                                               "icons": [{"src": "/assets/favicon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/favicon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=1))
    EP = " " + "/".join(FORM_ENDPOINT.split("/")[:3]) if FORM_ENDPOINT else ""  # the form endpoint's origin, allowed by the CSP
    # one policy for both hosts (they had drifted apart)
    csp = ("default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'" + EP +
           "; frame-src 'self'; frame-ancestors 'self'; form-action 'self'" + EP + "; base-uri 'self'")
    perms = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    # host config for Apache (Nethost): 404 pages per language and cache headers
    write(PUB / ".htaccess", old_redirects_htaccess() + "ErrorDocument 404 /404.html\n<If \"%{REQUEST_URI} =~ m#^/he/#\">\n  ErrorDocument 404 /he/404.html\n</If>\n"
          "<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType text/html \"access plus 10 minutes\"\n  ExpiresByType text/css \"access plus 1 year\"\n  ExpiresByType application/javascript \"access plus 1 year\"\n"
          "  ExpiresByType font/woff2 \"access plus 1 year\"\n  ExpiresByType image/avif \"access plus 1 month\"\n  ExpiresByType image/webp \"access plus 1 month\"\n  ExpiresByType image/jpeg \"access plus 1 month\"\n  ExpiresByType video/mp4 \"access plus 1 month\"\n  ExpiresByType video/webm \"access plus 1 month\"\n</IfModule>\n"
          "<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml application/xml application/manifest+json text/plain\n</IfModule>\n"
          "<IfModule mod_headers.c>\n  Header always set X-Content-Type-Options \"nosniff\"\n  Header always set Referrer-Policy \"strict-origin-when-cross-origin\"\n"
          "  Header always set Content-Security-Policy \"" + csp + "\"\n  Header always set Permissions-Policy \"" + perms + "\"\n  Header always set Cross-Origin-Opener-Policy \"same-origin\"\n</IfModule>\n"
          "# Turn on once HTTPS works on www.miftah.co.il (release checklist). HSTS only after the redirect is confirmed.\n"
          "# RewriteEngine On\n# RewriteCond %{HTTPS} off [OR]\n# RewriteCond %{HTTP_HOST} !^www\\. [NC]\n# RewriteRule ^ https://www.miftah.co.il%{REQUEST_URI} [L,R=301]\n"
          "# Header always set Strict-Transport-Security \"max-age=31536000\"\n")
    # host config for Vercel (the live preview): same headers as .htaccess; static files, no build step.
    long_cache = [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]
    write(PUB / "vercel.json", json.dumps({
        "buildCommand": "", "installCommand": "", "outputDirectory": ".", "framework": None, "cleanUrls": False,
        # /he must end in a slash, or the Hebrew pages' relative links would point at the English ones
        "redirects": [{"source": "/he", "destination": "/he/", "permanent": True}, {"source": "/.htaccess", "destination": "/404.html", "permanent": False}] + old_redirects_vercel(),
        "headers": [
            {"source": "/(.*)", "headers": [{"key": "X-Content-Type-Options", "value": "nosniff"}, {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
                                            {"key": "Content-Security-Policy", "value": csp}, {"key": "Permissions-Policy", "value": perms},
                                            {"key": "Cross-Origin-Opener-Policy", "value": "same-origin"}]},
            {"source": "/assets/(site.css|site.js|build-sim.js|vendor/.*|fonts/.*)", "headers": long_cache},
            {"source": "/assets/(img|video)/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}]},
        ]}, indent=1) + "\n")
    print(f"built {len(list(PUB.rglob('*.html')))} pages into {PUB}")


if __name__ == "__main__":
    main()
