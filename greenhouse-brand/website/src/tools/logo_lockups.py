"""The two logo lockups Hanoch sent (file "לוגו צד.ai", 12 Nov 2026): the mark with the name and the slogan under it, one in
English (MIFTAH / Where agriculture feels at home) and one in Hebrew (מיפתח / חקלאות שיש לה בית). Every letter is drawn as a path
from the self-hosted Heebo, so the logo looks the same before and without any web font.

    python3 src/tools/logo_lockups.py   # writes src/assets/brand/miftah-lockup-en.svg and miftah-lockup-he.svg

Geometry is the logo's own (greenhouse-brand/tools/build.py): mark x 355-943, name x 1021-1555 on baseline 508 with
cap height 101, slogan from x 356 to 1557 on baseline 588. Original colours only."""
import io
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

W = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(W.parent / "tools"))
import build as brand  # noqa: E402  (the logo geometry)

FONTS = W / "src/assets/fonts"
TEAL, DARK, MINT = "#1B6E62", "#0E4239", "#7FC49B"


def font(script, wght):
    f = TTFont(FONTS / f"Heebo-var-{script}.woff2")
    f = instantiateVariableFont(f, {"wght": wght})
    b = io.BytesIO(); f.flavor = None; f.save(b); b.seek(0)
    return TTFont(b)


def glyphs(f, text, rtl):
    cmap = f.getBestCmap(); hmtx = f["hmtx"]
    names = [cmap[ord(c)] for c in text]
    if rtl:
        names = names[::-1]  # Hebrew without marks or ligatures: visual order is the reverse
    return [(n, hmtx[n][0]) for n in names]


def run(f, text, rtl, x0, x1, baseline, size=None, height=None, ref=None, fit=False, track=0):
    """Lays the text from x0 to x1 on the baseline: scaled by size (em) or so that `ref` glyph is `height` tall, then the
    letters spread to fill the width exactly."""
    gs = f.getGlyphSet(); upm = f["head"].unitsPerEm
    if height:
        from fontTools.pens.boundsPen import BoundsPen
        bp = BoundsPen(gs); gs[f.getBestCmap()[ord(ref)]].draw(bp)
        s = height / (bp.bounds[3] - bp.bounds[1])
    else:
        s = (size or 0) / upm
    seq = glyphs(f, text, rtl)
    if fit:  # the word itself fills the width (set close, `track` units between letters), as the name in the logo
        s = (x1 - x0 - track * (len(seq) - 1)) / sum(a for _, a in seq)
    natural = sum(a for _, a in seq) * s
    gap = (x1 - x0 - natural) / max(1, len(seq) - 1)
    out, x = [], x0
    for name, adv in seq:
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
        d = pen.getCommands()
        if d:
            out.append(d)
        x += adv * s + gap
    return "".join(out)


def mark():
    col = brand.LOGO_VARIANTS["light"]; p = []
    for xl, xr, top, rt, rb in brand._ARCHES:
        p.append(f'<path fill="{col["post"]}" d="M{xl} {top}L{xr} {top + 12}V{brand._BASE}H{xl}z"/>')
        p.append(f'<path fill="{col["roof"]}" d="M{xl} {top}L674 {rt}V{rb}L{xr} {top + 12}z"/>')
    for x, y in brand._BARS:
        p.append(f'<rect fill="{col["bar"]}" x="{x}" y="{y}" width="33" height="{brand._BASE - y}"/>')
    return "".join(p)


def lockup(lang):
    if lang == "en":
        name = f'<path fill="{TEAL}" fill-rule="evenodd" d="{brand._WORDMARK}"/>'
        slogan = run(font("latin", 500), "Where agriculture feels at home", False, 356, 1557, 588, size=70)
    else:
        he = font("hebrew", 700)
        name = f'<path fill="{TEAL}" d="{run(he, "מיפתח", True, 1021, 1555, 508, fit=True, track=8)}"/>'
        slogan = run(font("hebrew", 400), "חקלאות שיש לה בית", True, 356, 1557, 588, height=38, ref="ח")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" class="logo logo--lockup" viewBox="345 232 1222 376" role="img" aria-label="MIFTAH">'
            f'{mark()}{name}<path fill="{TEAL}" d="{slogan}"/></svg>')


def main():
    out = W / "src/assets/brand"
    for lang in ("en", "he"):
        (out / f"miftah-lockup-{lang}.svg").write_text(lockup(lang), encoding="utf-8")
        print(lang, len(lockup(lang)))


if __name__ == "__main__":
    main()
