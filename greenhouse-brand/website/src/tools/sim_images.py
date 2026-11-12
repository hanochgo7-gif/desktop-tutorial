"""Photoreal build illustrations (one per chapter of how-we-build) -> AVIF, WebP and JPEG at 3 widths, 16:9.
Masters: media-src/sim-real/chNN.png (made with AI from one master site image and colour-graded to the real drone photo, 31 Oct 2026; chNN-portrait.png = 9:16 phone cut; ungraded in v3-raw/, earlier sets in v1/ and v2/).
Run: python3 src/tools/sim_images.py"""
from pathlib import Path
from PIL import Image

W = Path(__file__).resolve().parents[2]
SRC, OUT = W / "media-src/sim-real", W / "public/assets/img"


def main():
    for i in range(1, len(list(SRC.glob("ch[0-9][0-9].png"))) + 1):
        im = Image.open(SRC / f"ch{i:02d}.png").convert("RGB")
        w, h = im.size; th = round(w * 9 / 16); top = (h - th) // 2
        im = im.crop((0, top, w, top + th))
        for wd in (960, 1600, 2400):
            t = im.resize((wd, round(wd * 9 / 16)), Image.LANCZOS)
            n = OUT / f"sim-r{i:02d}-{wd}"
            t.save(f"{n}.avif", quality=50); t.save(f"{n}.webp", quality=74); t.save(f"{n}.jpg", quality=78, optimize=True, progressive=True)
        if i == 1:  # the page's poster (shown before the first picture, and in the social preview)
            im.resize((1600, 900), Image.LANCZOS).save(OUT / "sim-poster.jpg", quality=78, optimize=True, progressive=True)
            ph = im.height; pw = round(ph * 9 / 16); l = (im.width - pw) // 2
            im.crop((l, 0, l + pw, ph)).resize((720, 1280), Image.LANCZOS).save(OUT / "sim-poster-m.jpg", quality=78, optimize=True, progressive=True)
        print(f"ch{i:02d}", im.size)
    # portrait (9:16) cuts for phones: a full-height window centred at 48%, moved per chapter where the people or the work would fall
    # outside it (series of 12 Nov 2026, built from the real stills: the eye-level and close chapters are not pixel-aligned anyway)
    FOCUS = {1: .33, 2: .5, 3: .87, 4: .5, 5: .5, 6: .86, 7: .3, 10: .45, 11: .82}
    for i in range(1, len(list(SRC.glob("ch[0-9][0-9].png"))) + 1):
        im = Image.open(SRC / f"ch{i:02d}.png").convert("RGB"); w, h = im.size
        cw = round(h * 9 / 16); x0 = max(0, min(w - cw, round(w * FOCUS.get(i, .48) - cw / 2)))
        im = im.crop((x0, 0, x0 + cw, h))
        for wd in (720, cw):
            t = im.resize((wd, round(wd * 16 / 9)), Image.LANCZOS); n = OUT / f"sim-r{i:02d}m-{720 if wd == 720 else 'hd'}"
            t.save(f"{n}.avif", quality=52); t.save(f"{n}.webp", quality=76); t.save(f"{n}.jpg", quality=80, optimize=True, progressive=True)
    # a tiny blurred stand-in for the first picture, shown before it arrives (inlined as CSS)
    import base64, io, re
    tiny = Image.open(SRC / "ch01.png").convert("RGB").resize((32, 18), Image.LANCZOS); b = io.BytesIO(); tiny.save(b, "WEBP", quality=60)
    uri = "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
    css = W / "src/assets/site.css"; c = css.read_text(encoding="utf-8")
    css.write_text(re.sub(r'(\.sim\.photo \.sim-stage \{ background-image: url\(")[^"]*', lambda m: m.group(1) + uri, c), encoding="utf-8")

if __name__ == "__main__":
    main()
