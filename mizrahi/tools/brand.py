#!/usr/bin/env python3
"""
מחולל הלוגו של י. מזרחי בניה ושות׳ — "שלד הבניין".

הסמל: חתך של בניין: שני עמודים, שתי תקרות ותקרת גג, עומדים על יסוד כבד ורחב מהם. העומס יורד ליסוד,
כמו בכל מבנה שהחברה בונה. שלוש התקרות הן שלושת סוגי המבנים: בתים, בנייני מגורים ומבני ציבור.
השם: Noto Sans Hebrew, הגופן של האתר, צר וכבד (כמו אותיות על שלטי אתר ותמרורים), עם פס מפריד בין הסמל לשם.

הגופן (רישיון SIL OFL 1.1, מותר בלוגו) מומר לקווי מתאר, כך שקובצי ה-SVG לא תלויים בגופן מותקן.

הרצה מתוך mizrahi/:  python3 tools/brand.py
פלט: assets/brand/*.svg, assets/favicon.svg, brand/directions/g-frame.svg
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


# ---------------------------------------------------------------- the mark: the building frame
# ריבוע 40×40. תקרות בעובי 4.6 ברוחב 34; יסוד בעובי 6.4 לכל הרוחב (בולט 3 מכל צד); עמודים ברוחב 5, 2 פנימה מקצה התקרות.
S = 40.0
SLAB, FOUND, OVER = 4.6, 6.4, 3.0
COL_W, COL_IN = 5.0, 2.0


def frame(fill, cut=None, x0=0.0, y0=0.0, s=1.0):
    """SVG group for the frame at (x0, y0), scale s. One colour; `cut` is unused (kept so all marks share a signature)."""
    floor = (S - FOUND - SLAB) / 2           # the middle slab sits halfway between roof and foundation
    els = ''
    for y in (0.0, floor):
        els += f'<rect x="{OVER:g}" y="{y:g}" width="{S - 2 * OVER:g}" height="{SLAB:g}" fill="{fill}"/>'
    els += f'<rect x="0" y="{S - FOUND:g}" width="{S:g}" height="{FOUND:g}" fill="{fill}"/>'
    for x in (OVER + COL_IN, S - OVER - COL_IN - COL_W):
        els += f'<rect x="{x:g}" y="0" width="{COL_W:g}" height="{S - FOUND:g}" fill="{fill}"/>'
    return f'<g transform="translate({x0:.2f} {y0:.2f}) scale({s:.4f})">{els}</g>'


def svg(viewbox, body, label=LABEL, size=None):
    wh = f' width="{size}" height="{size}"' if size else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}"{wh} role="img" '
            f'aria-label="{label}">{body}</svg>\n')


def mark(fill, cut):
    return svg(f'0 0 {S:g} {S:g}', frame(fill, cut))


def tile(bg, fill, cut, pad=8.0):
    side = S + 2 * pad
    return svg(f'0 0 {side:g} {side:g}', f'<rect width="{side:g}" height="{side:g}" fill="{bg}"/>' + frame(fill, cut, pad, pad))


def favicon():
    """16–32px: the same frame; it holds at 16px. Olive on transparent works on light tabs, and the bone version on dark."""
    return svg(f'-2 -2 {S + 4:g} {S + 4:g}', f'<rect x="-2" y="-2" width="{S + 4:g}" height="{S + 4:g}" rx="5" fill="{BONE}"/>' + frame(OLIVE))


# ---------------------------------------------------------------- lockups
LH = 84.0                 # the mark's height in a lockup = the height of the two name lines
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
    body = frame(fill, cut, W - LH, 0, s)
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
    body = frame(fill, cut, (W - P) / 2, 0, P / S)
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
    (DIRS / 'g-frame.svg').write_text(mark(OLIVE, BONE), encoding='utf-8')
    (DIRS / 'f-baseplate.svg').unlink(missing_ok=True)
    print('wrote', len(files) + 2, 'files')


if __name__ == '__main__':
    main()
