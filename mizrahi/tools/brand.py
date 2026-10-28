#!/usr/bin/env python3
"""
מחולל הלוגו של י. מזרחי בניה ושות׳.

הסמל נבנה מגאומטריה (רשת 24 יחידות), והשם נכתב בגופן Noto Sans Hebrew (רישיון OFL, מותר בלוגו)
ומומר לקווי מתאר, כך שקובצי ה-SVG לא תלויים בגופן מותקן.

הרצה מתוך mizrahi/:  python3 tools/brand.py
פלט: assets/brand/*.svg (+ favicon), ו-brand/directions/*.svg (שלושת הכיוונים שנבחנו).
"""
import re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / 'assets' / 'fonts'
OUT = ROOT / 'assets' / 'brand'
DIRS = ROOT / 'brand' / 'directions'

# צבעי המותג (ראו docs/brand.md)
OLIVE = '#38450f'
BONE = '#ecebe7'
BLACK = '#000000'
WHITE = '#ffffff'

_cache = {}


def font(wght, wdth):
    """Instance of the variable font (Hebrew + Latin subsets) at the given axes."""
    key = (wght, wdth)
    if key not in _cache:
        fonts = []
        for sub in ('hebrew', 'latin'):
            f = TTFont(FONTS / f'noto-sans-hebrew-{sub}.woff2')
            fonts.append(instantiateVariableFont(f, {'wght': wght, 'wdth': wdth}))
        _cache[key] = fonts
    return _cache[key]


def text_path(text, size, wght, wdth, tracking=0.0):
    """Hebrew text (logical order) to one SVG path, set right to left starting at x=0 going left.
    Returns (d, width, ascent_box) where the path occupies x in [-width, 0], baseline y=0."""
    fonts = font(wght, wdth)
    scale = size / 1000
    text = re.sub(r'[0-9]+', lambda m: m.group(0)[::-1], text)  # digits run left to right
    parts = []
    x = 0.0
    for ch in text:
        cp = ord(ch)
        f = next((f for f in fonts if cp in f.getBestCmap()), None)
        if f is None:
            raise ValueError(f'glyph missing for {ch!r}')
        gname = f.getBestCmap()[cp]
        gs = f.getGlyphSet()
        adv = gs[gname].width * scale
        x -= adv
        pen = SVGPathPen(gs)
        # flip y (font units are y-up)
        tp = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
        gs[gname].draw(tp)
        d = pen.getCommands()
        if d:
            parts.append(d)
        x -= tracking * size
    width = -x - tracking * size
    return ' '.join(parts), width


def bounds(text, size, wght, wdth):
    fonts = font(wght, wdth)
    scale = size / 1000
    top, bottom = 0, 0
    for ch in text:
        f = next(f for f in fonts if ord(ch) in f.getBestCmap())
        gs = f.getGlyphSet()
        bp = BoundsPen(gs)
        gs[f.getBestCmap()[ord(ch)]].draw(bp)
        if bp.bounds:
            top = max(top, bp.bounds[3] * scale)
            bottom = min(bottom, bp.bounds[1] * scale)
    return top, bottom


# ---------------------------------------------------------------- the mark
# הסמל (כיוון א׳, נבחר): האות מ׳ בנויה כחתך של מבנה: רצפת יסוד, קיר נושא ותקרה.
# בכתב העברי הקו העליון-שמאלי של המ׳ נכתב כמו יו״ד; כאן הוא עולה מעל קו התקרה, כמו עמוד שממשיך למעלה:
# הי׳ של "י. מזרחי" היא החלק שבונה את המ׳. שני חלקים, צורה אחת, בלי קווים דקים, קריא גם ב-16 פיקסלים.
MW, MH = 24.0, 27.5  # mark box in grid units
T = 5.5              # stroke: slab, wall and leg share one thickness
TAG = 3.5            # how far the yod rises above the roofline


def mark_path(x0=0.0, y0=0.0, s=1.0):
    """The mark as one closed path in a MW x MH box at (x0, y0), scaled by s."""
    pts = [(0, 0), (T, 0), (T, TAG), (MW, TAG), (MW, MH), (0, MH), (0, MH - T),
           (MW - T, MH - T), (MW - T, TAG + T), (T, TAG + T), (T, TAG + T + 7.5), (0, TAG + T + 7.5)]
    d = 'M' + 'L'.join(f'{x0 + x * s:.2f} {y0 + y * s:.2f}' for x, y in pts) + 'Z'
    return d


def mark_paths(x0=0.0, y0=0.0, s=1.0):
    return [mark_path(x0, y0, s)]


def mark_svg(fill, bg=None, pad=0.0, size=None):
    w, h = MW + pad * 2, MH + pad * 2
    if bg:  # square tile (favicon / app icon), mark centred
        side = max(w, h)
        ox, oy = (side - MW) / 2, (side - MH) / 2
        w = h = side
    else:
        ox, oy = pad, pad
    paths = ''.join(f'<path d="{d}"/>' for d in mark_paths(ox, oy))
    bgrect = f'<rect width="{w:g}" height="{h:g}" fill="{bg}"/>' if bg else ''
    wh = f' width="{size}" height="{size}"' if size else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}"{wh} role="img" '
            f'aria-label="י. מזרחי בניה ושות׳">{bgrect}<g fill="{fill}">{paths}</g></svg>\n')


# ---------------------------------------------------------------- lockups
NAME = 'י. מזרחי'
LINE2 = 'בניה ושות׳'


def horizontal(fill, bg=None):
    """Mark on the right (where Hebrew starts), name to its left: two lines, the name heavy and narrow,
    the second line regular width. Heights tied to the mark: name cap height = 60% of mark."""
    mh = 104                     # mark height in px units (box incl. the rising yod)
    s = mh / MH
    gap = 28
    name_size = 74
    l2_size = 30.5
    d1, w1 = text_path(NAME, name_size, 800, 70, tracking=0.0)
    d2, w2 = text_path(LINE2, l2_size, 500, 100, tracking=0.02)
    top1, _ = bounds(NAME, name_size, 800, 70)
    # place text block to the left of the mark; right edge at -gap from mark's left edge
    tw = max(w1, w2)
    W = MW * (mh / MH) + gap + tw
    mark_x = W - MW * s
    text_right = mark_x - gap
    # baselines: name top aligned to mark top, second line baseline on the mark's bottom
    b1 = TAG * s + top1          # name hangs from the roofline, the yod rises above it
    b2 = mh
    g = f'<g fill="{fill}">'
    g += ''.join(f'<path d="{d}"/>' for d in mark_paths(mark_x, 0, s))
    g += f'<path transform="translate({text_right:.2f} {b1:.2f})" d="{d1}"/>'
    g += f'<path transform="translate({text_right:.2f} {b2 - 2:.2f})" d="{d2}"/>'
    g += '</g>'
    pad = 0
    bgrect = f'<rect x="-24" y="-24" width="{W + 48:.0f}" height="{mh + 48}" fill="{bg}"/>' if bg else ''
    vb = f'-24 -24 {W + 48:.0f} {mh + 48}' if bg else f'0 0 {W:.0f} {mh}'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
            f'aria-label="י. מזרחי בניה ושות׳">{bgrect}{g}</svg>\n'), (W, mh)


def compact(fill, bg=None):
    """Mark above the name: for square spaces (social avatar, site sign corner, stamp)."""
    mh = 120
    s = mh / MH
    name_size = 64
    l2_size = 27
    d1, w1 = text_path(NAME, name_size, 800, 70)
    d2, w2 = text_path(LINE2, l2_size, 500, 100, tracking=0.02)
    top1, _ = bounds(NAME, name_size, 800, 70)
    W = max(w1, w2, MW * s)
    # right-aligned column: everything hangs from the right edge, as Hebrew text does
    g = f'<g fill="{fill}">'
    g += ''.join(f'<path d="{d}"/>' for d in mark_paths(W - MW * s, 0, s))
    y1 = mh + 26 + top1
    y2 = y1 + 40
    g += f'<path transform="translate({W:.2f} {y1:.2f})" d="{d1}"/>'
    g += f'<path transform="translate({W:.2f} {y2:.2f})" d="{d2}"/>'
    g += '</g>'
    H = y2 + 8
    bgrect = f'<rect x="-28" y="-28" width="{W + 56:.0f}" height="{H + 56:.0f}" fill="{bg}"/>' if bg else ''
    vb = f'-28 -28 {W + 56:.0f} {H + 56:.0f}' if bg else f'0 0 {W:.0f} {H:.0f}'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
            f'aria-label="י. מזרחי בניה ושות׳">{bgrect}{g}</svg>\n')


def wordmark(fill, size=74):
    """Name only, one line: 'י. מזרחי בניה ושות׳' for very wide, short spaces (document footers)."""
    d1, w1 = text_path(NAME, size, 800, 70)
    d2, w2 = text_path(LINE2, size * 0.62, 500, 100, tracking=0.02)
    top, _ = bounds(NAME, size, 800, 70)
    gap = size * 0.28
    W = w1 + gap + w2
    g = (f'<g fill="{fill}"><path transform="translate({W:.2f} {top:.2f})" d="{d1}"/>'
         f'<path transform="translate({W - w1 - gap:.2f} {top:.2f})" d="{d2}"/></g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {top + 4:.0f}" role="img" '
            f'aria-label="י. מזרחי בניה ושות׳">{g}</svg>\n')


def with_years(fill, label='60 שנות ניסיון'):
    """Horizontal lockup with an endorsement line. ממתין לאישור החברה – לא בשימוש באתר."""
    svg, (W, mh) = horizontal(fill)
    d3, w3 = text_path(label, 26, 500, 100, tracking=0.02)
    inner = svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
    extra = f'<path fill="{fill}" transform="translate({W:.2f} {mh + 58})" d="{d3}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {mh + 66}" role="img" '
            f'aria-label="י. מזרחי בניה ושות׳, {label}">{inner}{extra}</svg>\n')


# ---------------------------------------------------------------- the rejected directions (for the record)
def direction_b(fill):
    """כיוון ב׳: סמל אדריכלי מופשט – קיר נושא על רגל יסוד, בחתך. נדחה: נקרא כמו ⊥ גנרי / סימן עדיפות מתמטי."""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="{fill}">'
            '<rect x="0" y="18.5" width="24" height="5.5"/><rect x="9.25" y="4" width="5.5" height="13"/>'
            '<rect x="3" y="0" width="18" height="2.5"/></g></svg>\n')


def direction_c(fill):
    """כיוון ג׳: לוגוטייפ בלבד – השם צר וכבד, והנקודה של י. היא ריבוע (אבן אחת)."""
    return wordmark(fill, size=96)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DIRS.mkdir(parents=True, exist_ok=True)
    files = {
        'mark-olive.svg': mark_svg(OLIVE),
        'mark-bone.svg': mark_svg(BONE),
        'mark-black.svg': mark_svg(BLACK),
        'mark-white.svg': mark_svg(WHITE),
        'app-icon.svg': mark_svg(BONE, bg=OLIVE, pad=6),
        'logo-horizontal-olive.svg': horizontal(OLIVE)[0],
        'logo-horizontal-bone.svg': horizontal(BONE)[0],
        'logo-horizontal-black.svg': horizontal(BLACK)[0],
        'logo-horizontal-white.svg': horizontal(WHITE)[0],
        'logo-compact-olive.svg': compact(OLIVE),
        'logo-compact-bone.svg': compact(BONE),
        'logo-compact-black.svg': compact(BLACK),
        'wordmark-olive.svg': wordmark(OLIVE),
        'wordmark-black.svg': wordmark(BLACK),
        'pending-approval-logo-60-years.svg': with_years(OLIVE),
    }
    for name, svg in files.items():
        (OUT / name).write_text(svg, encoding='utf-8')
    # favicon: the mark on olive, tighter padding so it holds at 16px
    (ROOT / 'assets' / 'favicon.svg').write_text(mark_svg(BONE, bg=OLIVE, pad=4), encoding='utf-8')
    (DIRS / 'a-monogram.svg').write_text(mark_svg(OLIVE), encoding='utf-8')
    (DIRS / 'b-abstract.svg').write_text(direction_b(OLIVE), encoding='utf-8')
    (DIRS / 'c-wordmark.svg').write_text(direction_c(OLIVE), encoding='utf-8')
    print('wrote', len(files) + 4, 'files')


if __name__ == '__main__':
    main()
