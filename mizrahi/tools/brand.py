#!/usr/bin/env python3
"""
מחולל הלוגו של י. מזרחי בניה ושות׳ — "אבן הפינה".

הסמל: אבן מרובעת שעומדת על רגל יסוד רחבה ממנה, ובפניה חקוקות ראשי התיבות ימ.
האותיות והשם כתובים ב-Frank Ruhl Libre (האות העברית הקלאסית של העיתונות והספרות בישראל; רישיון SIL OFL 1.1,
מותר בלוגו), ומומרים לקווי מתאר, כך שקובצי ה-SVG לא תלויים בגופן מותקן. הגופנים ב-tools/fonts.

הרצה מתוך mizrahi/:  python3 tools/brand.py
פלט: assets/brand/*.svg, assets/favicon.svg, brand/directions/d-cornerstone.svg
(קובצי PNG: ראו docs/design-system.md, נוצרים מה-SVG בדפדפן.)
"""
import re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path(__file__).resolve().parent / 'fonts'
OUT = ROOT / 'assets' / 'brand'
DIRS = ROOT / 'brand' / 'directions'

OLIVE = '#38450f'
BONE = '#ecebe7'
BLACK = '#000000'
WHITE = '#ffffff'

HEAVY = 'frank-ruhl-libre-900.woff'
BOOK = 'frank-ruhl-libre-500.woff'
NAME = 'י. מזרחי'
LINE2 = 'בניה ושות׳'
LABEL = 'י. מזרחי בניה ושות׳'

_fonts = {}


def font(name):
    if name not in _fonts:
        _fonts[name] = TTFont(FONTS / name)
    return _fonts[name]


def text_path(text, fname, size, tracking=0.0, kern=0.0):
    """Hebrew text (logical order) as one path, set right to left from x=0 going left, baseline y=0.
    Returns (d, width, cap_top, bbox). Digit runs keep their left-to-right order."""
    f = font(fname)
    gs, cm, upm = f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm
    sc = size / upm
    text = re.sub(r'[0-9]+', lambda m: m.group(0)[::-1], text)
    x, parts, top = 0.0, [], 0.0
    xs, ys = [], []
    for ch in text:
        g = cm[ord(ch)]
        x -= gs[g].width * sc
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        bp = BoundsPen(gs)
        gs[g].draw(bp)
        if bp.bounds:
            b = bp.bounds
            xs += [x + b[0] * sc, x + b[2] * sc]
            ys += [-b[3] * sc, -b[1] * sc]
            if ch not in '.׳':
                top = max(top, b[3] * sc)
        x -= (tracking + kern) * size
    width = -x - (tracking + kern) * size
    return ' '.join(parts), width, top, (min(xs), min(ys), max(xs), max(ys))


# ---------------------------------------------------------------- the mark: the cornerstone
# אבן 80×80 על רגל יסוד ברוחב 96 (בולטת 8 מכל צד), עם מישק של 4 ביניהן. היחסים קבועים; הכול מתכנס מכאן.
BLOCK, JOINT, FOOT, OVER = 80.0, 4.0, 11.0, 8.0
MW, MH = BLOCK + 2 * OVER, BLOCK + JOINT + FOOT
INITIALS, INITIALS_SIZE, INITIALS_KERN = 'ימ', 64.0, -0.06


def stone(fill, cut, x0=0.0, y0=0.0, s=1.0, letters=INITIALS, size=INITIALS_SIZE, footing=True):
    """SVG elements for the cornerstone at (x0, y0), scale s. `cut` is the colour of the letters
    (the ground showing through), so the mark works as one colour on any background."""
    d, _, _, bb = text_path(letters, HEAVY, size, kern=INITIALS_KERN if len(letters) > 1 else 0)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    tx = OVER + (BLOCK - w) / 2 - bb[0]
    ty = (BLOCK - h) / 2 - bb[1]
    els = f'<rect x="{OVER}" y="0" width="{BLOCK}" height="{BLOCK}" fill="{fill}"/>'
    if footing:
        els += f'<rect x="0" y="{BLOCK + JOINT}" width="{MW}" height="{FOOT}" fill="{fill}"/>'
    els += f'<path fill="{cut}" transform="translate({tx:.2f} {ty:.2f})" d="{d}"/>'
    return f'<g transform="translate({x0:.2f} {y0:.2f}) scale({s:.4f})">{els}</g>'


def svg(viewbox, body, label=LABEL, size=None):
    wh = f' width="{size}" height="{size}"' if size else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}"{wh} role="img" '
            f'aria-label="{label}">{body}</svg>\n')


def mark(fill, cut):
    return svg(f'0 0 {MW:g} {MH:g}', stone(fill, cut))


def tile(bg, fill, cut, letters=INITIALS, size=INITIALS_SIZE, pad=14.0):
    """Square tile with the stone centred: app icon, social avatar."""
    side = MW + 2 * pad
    oy = (side - MH) / 2
    return svg(f'0 0 {side:g} {side:g}', f'<rect width="{side:g}" height="{side:g}" fill="{bg}"/>'
               + stone(fill, cut, pad, oy, letters=letters, size=size))


def favicon():
    """16–32px: the stone alone with one large mem, on a bone tile so it holds on light and dark tabs."""
    side = 100.0
    s = 0.86
    ox, oy = (side - MW * s) / 2, (side - MH * s) / 2
    return svg(f'0 0 {side:g} {side:g}', f'<rect width="100" height="100" rx="14" fill="{BONE}"/>'
               + stone(OLIVE, BONE, ox, oy, s, letters='מ', size=76))


# ---------------------------------------------------------------- lockups
def name_block(fill, right, top, block_h):
    """The two lines of the name, hanging from `right`: line 1 cap height on the stone's top edge,
    line 2 baseline on the stone's bottom edge. Returns (elements, width)."""
    d1, w1, t1, _ = text_path(NAME, HEAVY, 70)
    d2, w2, _, _ = text_path(LINE2, BOOK, 27.5, tracking=0.07)
    els = (f'<path fill="{fill}" transform="translate({right:.2f} {top + t1 + 1:.2f})" d="{d1}"/>'
           f'<path fill="{fill}" transform="translate({right:.2f} {top + block_h - 1:.2f})" d="{d2}"/>')
    return els, max(w1, w2)


def horizontal(fill, cut, bg=None):
    gap = 22.0
    _, tw = name_block(fill, 0, 0, BLOCK)
    W = MW + gap + tw
    body = stone(fill, cut, W - MW, 0)
    els, _ = name_block(fill, W - MW - gap, 0, BLOCK)
    if bg:
        p = 24
        return svg(f'{-p} {-p} {W + 2 * p:.0f} {MH + 2 * p:.0f}',
                   f'<rect x="{-p}" y="{-p}" width="{W + 2 * p:.0f}" height="{MH + 2 * p:.0f}" fill="{bg}"/>' + body + els)
    return svg(f'0 0 {W:.1f} {MH:.1f}', body + els)


def compact(fill, cut):
    """Stone above, name centred under it: stamps, avatars, the corner of a site sign."""
    d1, w1, t1, _ = text_path(NAME, HEAVY, 64)
    d2, w2, _, _ = text_path(LINE2, BOOK, 25, tracking=0.08)
    W = max(w1, w2, MW)
    s = 1.0
    body = stone(fill, cut, (W - MW) / 2, 0, s)
    y1 = MH + 22 + t1
    y2 = y1 + 36
    body += (f'<path fill="{fill}" transform="translate({(W + w1) / 2:.2f} {y1:.2f})" d="{d1}"/>'
             f'<path fill="{fill}" transform="translate({(W + w2) / 2:.2f} {y2:.2f})" d="{d2}"/>')
    return svg(f'0 0 {W:.1f} {y2 + 8:.1f}', body)


def wordmark(fill, size=70):
    """The full name on one line, for long narrow places (document footers, the site's footer)."""
    d1, w1, t1, _ = text_path(NAME, HEAVY, size)
    d2, w2, _, _ = text_path(LINE2, HEAVY, size)
    gap = size * 0.26
    W = w1 + gap + w2
    body = (f'<path fill="{fill}" transform="translate({W:.2f} {t1:.2f})" d="{d1}"/>'
            f'<path fill="{fill}" transform="translate({w2:.2f} {t1:.2f})" d="{d2}"/>')
    return svg(f'0 {-2} {W:.1f} {t1 + size * 0.08:.1f}', body)


def with_years(fill, cut, label='60 שנות ניסיון'):
    """Horizontal lockup with an endorsement line under it. ממתין לאישור החברה — לא בשימוש באתר."""
    gap = 22.0
    _, tw = name_block(fill, 0, 0, BLOCK)
    W = MW + gap + tw
    body = stone(fill, cut, W - MW, 0)
    els, _ = name_block(fill, W - MW - gap, 0, BLOCK)
    d3, w3, _, _ = text_path(label, BOOK, 24, tracking=0.06)
    els += f'<path fill="{fill}" transform="translate({W:.2f} {MH + 40:.2f})" d="{d3}"/>'
    return svg(f'0 0 {W:.1f} {MH + 48:.1f}', body + els, label=f'{LABEL}, {label}')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DIRS.mkdir(parents=True, exist_ok=True)
    files = {
        'mark-olive.svg': mark(OLIVE, BONE),
        'mark-bone.svg': mark(BONE, OLIVE),
        'mark-black.svg': mark(BLACK, WHITE),
        'mark-white.svg': mark(WHITE, BLACK),
        'app-icon.svg': tile(OLIVE, BONE, OLIVE),
        'avatar-bone.svg': tile(BONE, OLIVE, BONE),
        'logo-horizontal-olive.svg': horizontal(OLIVE, BONE),
        'logo-horizontal-bone.svg': horizontal(BONE, OLIVE),
        'logo-horizontal-black.svg': horizontal(BLACK, WHITE),
        'logo-horizontal-white.svg': horizontal(WHITE, BLACK),
        'logo-compact-olive.svg': compact(OLIVE, BONE),
        'logo-compact-bone.svg': compact(BONE, OLIVE),
        'logo-compact-black.svg': compact(BLACK, WHITE),
        'wordmark-olive.svg': wordmark(OLIVE),
        'wordmark-bone.svg': wordmark(BONE),
        'wordmark-black.svg': wordmark(BLACK),
        'pending-approval-logo-60-years.svg': with_years(OLIVE, BONE),
    }
    for name, content in files.items():
        (OUT / name).write_text(content, encoding='utf-8')
    (ROOT / 'assets' / 'favicon.svg').write_text(favicon(), encoding='utf-8')
    (DIRS / 'd-cornerstone.svg').write_text(mark(OLIVE, BONE), encoding='utf-8')
    print('wrote', len(files) + 2, 'files')


if __name__ == '__main__':
    main()
