#!/usr/bin/env python3
"""
מחולל הלוגו של י. מזרחי בניה ושות׳ — "פלטת העיגון".

הסמל: פלטת בסיס מפלדה, כמו זו שמחברת עמוד ליסוד: ריבוע עם פינות קטומות ב-45° וארבעה חורי ברגי עיגון,
והאות מ׳ חתוכה דרכה. המקום שבו המבנה פוגש את היסוד — וזה מה שחברה בונה 60 שנה.
השם: Noto Sans Hebrew, הגופן של האתר, צר וכבד (כמו אותיות על שלטי אתר ותמרורים), עם פס מפריד בין הסמל לשם.

הגופן (רישיון SIL OFL 1.1, מותר בלוגו) מומר לקווי מתאר, כך שקובצי ה-SVG לא תלויים בגופן מותקן.

הרצה מתוך mizrahi/:  python3 tools/brand.py
פלט: assets/brand/*.svg, assets/favicon.svg, brand/directions/f-baseplate.svg
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

OLIVE = '#38450f'
BONE = '#ecebe7'
BLACK = '#000000'
WHITE = '#ffffff'

NAME = 'י. מזרחי'
LINE2 = 'בניה ושות׳'
LABEL = 'י. מזרחי בניה ושות׳'
NAME_FACE = (800, 75)     # weight, width
LINE2_FACE = (600, 100)
LETTER_FACE = (900, 100)

_fonts = {}


def faces(wght, wdth):
    """The variable font (Hebrew + Latin subsets) instanced at the given axes."""
    key = (wght, wdth)
    if key not in _fonts:
        _fonts[key] = [instantiateVariableFont(TTFont(FONTS / f'noto-sans-hebrew-{sub}.woff2'), {'wght': wght, 'wdth': wdth})
                       for sub in ('hebrew', 'latin')]
    return _fonts[key]


def text_path(text, face, size, tracking=0.0):
    """Hebrew text (logical order) as one path, set right to left from x=0 going left, baseline y=0.
    Returns (d, width, cap_top, bbox). Digit runs keep their left-to-right order."""
    fonts = faces(*face)
    text = re.sub(r'[0-9]+', lambda m: m.group(0)[::-1], text)
    x, parts, top, xs, ys = 0.0, [], 0.0, [], []
    for ch in text:
        f = next(f for f in fonts if ord(ch) in f.getBestCmap())
        gs, upm = f.getGlyphSet(), f['head'].unitsPerEm
        sc = size / upm
        g = f.getBestCmap()[ord(ch)]
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
        x -= tracking * size
    return ' '.join(parts), -x - tracking * size, top, (min(xs), min(ys), max(xs), max(ys))


# ---------------------------------------------------------------- the mark: the base plate
# פלטה 40×40, פינות קטומות 3.4, חורי ברגים ברדיוס 1.9 במרחק 5.4 מהשפות, האות מ׳ בגובה 27. הכול נגזר מכאן.
S, CHAMFER, BOLT_R, BOLT_IN, LETTER_SIZE = 40.0, 3.4, 1.9, 5.4, 27.0


def plate(fill, cut, x0=0.0, y0=0.0, s=1.0, bolts=True, letter_size=LETTER_SIZE):
    """SVG group for the plate at (x0, y0), scale s. `cut` is what shows through the bolt holes and the letter,
    so the mark is one colour on any ground."""
    k = CHAMFER
    pts = [(k, 0), (S - k, 0), (S, k), (S, S - k), (S - k, S), (k, S), (0, S - k), (0, k)]
    els = f'<path fill="{fill}" d="M' + 'L'.join(f'{x:g} {y:g}' for x, y in pts) + 'Z"/>'
    if bolts:
        for cx in (BOLT_IN, S - BOLT_IN):
            for cy in (BOLT_IN, S - BOLT_IN):
                els += f'<circle cx="{cx:g}" cy="{cy:g}" r="{BOLT_R:g}" fill="{cut}"/>'
    d, _, _, bb = text_path('מ', LETTER_FACE, letter_size)
    tx = (S - (bb[2] - bb[0])) / 2 - bb[0]
    ty = (S - (bb[3] - bb[1])) / 2 - bb[1]
    els += f'<path fill="{cut}" transform="translate({tx:.2f} {ty:.2f})" d="{d}"/>'
    return f'<g transform="translate({x0:.2f} {y0:.2f}) scale({s:.4f})">{els}</g>'


def svg(viewbox, body, label=LABEL, size=None):
    wh = f' width="{size}" height="{size}"' if size else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}"{wh} role="img" '
            f'aria-label="{label}">{body}</svg>\n')


def mark(fill, cut):
    return svg(f'0 0 {S:g} {S:g}', plate(fill, cut))


def tile(bg, fill, cut, pad=8.0):
    side = S + 2 * pad
    return svg(f'0 0 {side:g} {side:g}', f'<rect width="{side:g}" height="{side:g}" fill="{bg}"/>' + plate(fill, cut, pad, pad))


def favicon():
    """16–32px: the plate without bolt holes and a slightly larger mem; a solid olive shape that holds on light and dark tabs."""
    return svg(f'0 0 {S:g} {S:g}', plate(OLIVE, BONE, bolts=False, letter_size=29.5))


# ---------------------------------------------------------------- lockups
LH = 84.0                 # the plate's height in a lockup = the height of the two name lines
GAP, BAR = 22.0, 3.0      # space either side of the divider, divider width


def name_block(fill, right):
    d1, w1, t1, _ = text_path(NAME, NAME_FACE, 74)
    d2, w2, _, _ = text_path(LINE2, LINE2_FACE, 22, tracking=0.16)
    els = (f'<path fill="{fill}" transform="translate({right:.2f} {t1 + 1:.2f})" d="{d1}"/>'
           f'<path fill="{fill}" transform="translate({right:.2f} {LH - 1:.2f})" d="{d2}"/>')
    return els, max(w1, w2)


def horizontal(fill, cut, divider=True):
    s = LH / S
    _, tw = name_block(fill, 0)
    mid = (GAP * 2 + BAR) if divider else GAP
    W = LH + mid + tw
    body = plate(fill, cut, W - LH, 0, s)
    if divider:
        body += f'<rect x="{W - LH - GAP - BAR:.2f}" y="0" width="{BAR:g}" height="{LH:g}" fill="{fill}"/>'
    els, _ = name_block(fill, W - LH - mid)
    return svg(f'0 0 {W:.1f} {LH:g}', body + els)


def compact(fill, cut):
    """Plate above, name centred under it: stamps, helmets, avatars, the corner of a site sign."""
    d1, w1, t1, _ = text_path(NAME, NAME_FACE, 66)
    d2, w2, _, _ = text_path(LINE2, LINE2_FACE, 20, tracking=0.18)
    P = 100.0
    W = max(w1, w2, P)
    body = plate(fill, cut, (W - P) / 2, 0, P / S)
    y1 = P + 22 + t1
    y2 = y1 + 34
    body += (f'<path fill="{fill}" transform="translate({(W + w1) / 2:.2f} {y1:.2f})" d="{d1}"/>'
             f'<path fill="{fill}" transform="translate({(W + w2) / 2:.2f} {y2:.2f})" d="{d2}"/>')
    return svg(f'0 0 {W:.1f} {y2 + 6:.1f}', body)


def wordmark(fill, size=70):
    """The full name on one line, for long narrow places (document footers, the site's footer)."""
    d, w, t, _ = text_path(LABEL, NAME_FACE, size)
    return svg(f'0 -2 {w:.1f} {t + size * 0.1:.1f}', f'<path fill="{fill}" transform="translate({w:.2f} {t:.2f})" d="{d}"/>')


def with_years(fill, cut, label='60 שנות ניסיון'):
    """Horizontal lockup with an endorsement line. ממתין לאישור החברה — לא בשימוש באתר."""
    base = horizontal(fill, cut)
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', base).group(1).split()]
    inner = base.split('>', 1)[1].rsplit('</svg>', 1)[0]
    d3, _, _, _ = text_path(label, LINE2_FACE, 22, tracking=0.16)
    inner += f'<path fill="{fill}" transform="translate({vb[2]:.2f} {LH + 40:.2f})" d="{d3}"/>'
    return svg(f'0 0 {vb[2]:.1f} {LH + 48:.1f}', inner, label=f'{LABEL}, {label}')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DIRS.mkdir(parents=True, exist_ok=True)
    files = {
        'mark-olive.svg': mark(OLIVE, BONE),
        'mark-bone.svg': mark(BONE, OLIVE),
        'mark-black.svg': mark(BLACK, WHITE),
        'mark-white.svg': mark(WHITE, BLACK),
        'app-icon.svg': tile(OLIVE, BONE, OLIVE),
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
    for stale in ('avatar-bone.svg', 'seal-olive.svg', 'seal-bone.svg', 'seal-black.svg'):
        (OUT / stale).unlink(missing_ok=True)
        (OUT / 'png' / stale.replace('.svg', '.png')).unlink(missing_ok=True)
    (ROOT / 'assets' / 'favicon.svg').write_text(favicon(), encoding='utf-8')
    (DIRS / 'f-baseplate.svg').write_text(mark(OLIVE, BONE), encoding='utf-8')
    print('wrote', len(files) + 2, 'files')


if __name__ == '__main__':
    main()
