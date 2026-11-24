"""Generates the SOTA logo files as filled vector outlines (no strokes, no live text).

    python3 sota/tools/brand_assets.py      (needs: pip install fonttools brotli)

Output: sota/assets/brand/*.svg
The geometry is the same as assets/logo-dark.svg (stroke 12 on a 60-unit letter height),
converted to outlines so the files render identically in Canva, print and any other tool.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "brand")
os.makedirs(OUT, exist_ok=True)

GRAPHITE, PAPER, SIGNAL, SIGNAL_INK = "#131517", "#ECEAE4", "#C5F03C", "#4D7A00"

# Letters as filled outlines (units: same grid as the stroke logo; cap height 20..80).
LETTERS = [
    # S: three bars joined by two half rings (outer r18, inner r6)
    "M70 20H34A18 18 0 0 0 34 56H54A6 6 0 0 1 54 68H18V80H54A18 18 0 0 0 54 44H34A6 6 0 0 1 34 32H70Z",
    # O: ring, outer r30 inner r18 (inner wound the other way so it stays a hole)
    "M89 50A30 30 0 1 0 149 50A30 30 0 1 0 89 50ZM101 50A18 18 0 1 1 137 50A18 18 0 1 1 101 50Z",
    # T
    "M162 20H226V32H200V80H188V32H162Z",
    # A: arch with a crossbar
    "M236 80V50A30 30 0 0 1 296 50V80H284V64H248V80ZM248 52H284V50A18 18 0 0 0 248 50Z",
]
DOT = (119, 50, 7)  # the signal in the O
X0, X1, Y0, Y1 = 18, 296, 20, 80


def wordmark(ink, dot, dx=0, dy=0, scale=1):
    t = f' transform="translate({dx} {dy}) scale({scale})"' if (dx or dy or scale != 1) else ""
    paths = "".join(f'<path d="{d}"/>' for d in LETTERS)
    cx, cy, r = DOT
    return f'<g{t}><g fill="{ink}" fill-rule="evenodd">{paths}</g><circle cx="{cx}" cy="{cy}" r="{r}" fill="{dot}"/></g>'


def svg(w, h, body, bg=None, title="SOTA"):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 4}" height="{h * 4}" role="img" aria-label="{title}"><title>{title}</title>{rect}{body}</svg>\n'


def load(path, axes=None):
    f = TTFont(path)
    if axes and "fvar" in f:
        f = instancer.instantiateVariableFont(f, axes)
    return f


def text_path(font, text, size, x, baseline, tracking=0.0, rtl=False, target_width=None):
    """Lay out a single line as outlines. Hebrew: glyphs are placed in visual order (reversed runs)."""
    cmap, gs, hmtx = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
    upm = font["head"].unitsPerEm
    if rtl:
        # visual order for a short RTL line that may contain one LTR run (e.g. "IT")
        runs, cur, cur_ltr = [], "", None
        for ch in text:
            ltr = ch.isascii() and ch.isalnum()
            if cur and ltr != cur_ltr and ch != " ":
                runs.append((cur, cur_ltr)); cur = ""
            if ch != " " or cur:
                cur_ltr = ltr if ch != " " else cur_ltr
            cur += ch
        runs.append((cur, cur_ltr))
        visual = "".join(r if ltr else r[::-1] for r, ltr in reversed(runs))
        visual = visual.replace("  ", " ")
    else:
        visual = text
    glyphs = [cmap[ord(c)] for c in visual]
    advances = [hmtx[g][0] for g in glyphs]
    natural = sum(advances) * size / upm
    track = tracking * size
    if target_width is not None and len(glyphs) > 1:
        track = (target_width - natural) / (len(glyphs) - 1)
    width = natural + track * (len(glyphs) - 1)
    if rtl:
        x = x - width  # x is the right edge
    pen = SVGPathPen(gs)
    s = size / upm
    cx = x
    for g, adv in zip(glyphs, advances):
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, cx, baseline)))
        cx += adv * s + track
    return pen.getCommands(), width


fonts_dir = os.path.join(ROOT, "fonts")
archivo = load(os.path.join(fonts_dir, "archivo-500-800-latin.woff2"), {"wdth": 100, "wght": 600})
plex_he = load(os.path.join(fonts_dir, "ibm-plex-sans-hebrew-500-hebrew.woff2"))
plex_he_lat = load(os.path.join(fonts_dir, "ibm-plex-sans-hebrew-500-latin.woff2"))

files = {}
PAD = 24
W, H = X1 - X0 + PAD * 2, Y1 - Y0 + PAD * 2

# 1. wordmark in four colorways
for name, ink, dot, bg in [
    ("sota-logo-on-dark", PAPER, SIGNAL, None),
    ("sota-logo-on-light", GRAPHITE, SIGNAL_INK, None),
    ("sota-logo-black", "#000000", "#000000", None),
    ("sota-logo-white", "#FFFFFF", "#FFFFFF", None),
]:
    files[name] = svg(W, H, wordmark(ink, dot, PAD - X0, PAD - Y0))

# 2. English lockup: wordmark + "IT CONSULTING" justified to the wordmark width
tag_size = 15
for name, ink, dot, sub in [("sota-lockup-en-on-dark", PAPER, SIGNAL, "#ABB1B7"), ("sota-lockup-en-on-light", GRAPHITE, SIGNAL_INK, "#4F555B")]:
    d, _ = text_path(archivo, "IT CONSULTING", tag_size, PAD, PAD + 60 + 30, target_width=X1 - X0)
    files[name] = svg(W, H + 34, wordmark(ink, dot, PAD - X0, PAD - Y0) + f'<path d="{d}" fill="{sub}"/>')

# 3. Hebrew lockup: wordmark + "ייעוץ IT לעסקים", right-aligned under the wordmark
for name, ink, dot, sub in [("sota-lockup-he-on-dark", PAPER, SIGNAL, "#ABB1B7"), ("sota-lockup-he-on-light", GRAPHITE, SIGNAL_INK, "#4F555B")]:
    # Hebrew and Latin live in separate subset files; lay out the two runs by hand (visual order: "לעסקים IT ייעוץ" read right to left)
    size, base, right = 21, PAD + 60 + 34, W - PAD
    gap = size * 0.28
    d1, w1 = text_path(plex_he, "ייעוץ", size, right, base, rtl=True)
    _, w_it = text_path(plex_he_lat, "IT", size, 0, 0)
    d2, _ = text_path(plex_he_lat, "IT", size, right - w1 - gap - w_it, base)
    d3, _ = text_path(plex_he, "לעסקים", size, right - w1 - gap - w_it - gap, base, rtl=True)
    files[name] = svg(W, H + 40, wordmark(ink, dot, PAD - X0, PAD - Y0) + f'<g fill="{sub}"><path d="{d1}"/><path d="{d2}"/><path d="{d3}"/></g>')

# 4. symbol (the station): app icon, avatar, favicon
for name, bg, ring, dot in [("sota-mark-dark", GRAPHITE, PAPER, SIGNAL), ("sota-mark-light", PAPER, GRAPHITE, SIGNAL_INK), ("sota-mark-signal", SIGNAL, GRAPHITE, GRAPHITE)]:
    body = (f'<rect width="120" height="120" rx="28" fill="{bg}"/>'
            f'<path d="M30 60A30 30 0 1 0 90 60A30 30 0 1 0 30 60ZM45 60A15 15 0 1 1 75 60A15 15 0 1 1 45 60Z" fill="{ring}"/>'
            f'<circle cx="60" cy="60" r="8.5" fill="{dot}"/>')
    files[name] = svg(120, 120, body)

for name, content in files.items():
    with open(os.path.join(OUT, name + ".svg"), "w") as fh:
        fh.write(content)
print("\n".join(sorted(files)))
