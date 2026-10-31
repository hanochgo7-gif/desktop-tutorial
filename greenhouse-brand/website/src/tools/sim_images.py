"""Photoreal build illustrations (one per chapter of how-we-build) -> AVIF, WebP and JPEG at 3 widths, 16:9.
Masters: media-src/sim-real/chNN.png (made with AI from one master site image, 31 Oct 2026; earlier set in v1/).
Run: python3 src/tools/sim_images.py"""
from pathlib import Path
from PIL import Image

W = Path(__file__).resolve().parents[2]
SRC, OUT = W / "media-src/sim-real", W / "public/assets/img"


def main():
    for i in range(1, 11):
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


if __name__ == "__main__":
    main()
