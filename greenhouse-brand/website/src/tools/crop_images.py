"""Exports the crop selector's illustrations (AI-generated, labelled as such on the page).
media-src/crops/<crop>.png -> public/assets/img/crop-<crop>-{640,960,1280}.{avif,webp,jpg}, cropped to 4:3.
Run: python3 src/tools/crop_images.py"""
from pathlib import Path
from PIL import Image

W = Path(__file__).resolve().parents[2]
SRC, OUT = W / "media-src/crops", W / "public/assets/img"
CROPS = ("banana", "apple", "cherry", "kiwi", "avocado", "other")

for c in CROPS:
    im = Image.open(SRC / f"{c}.png").convert("RGB"); w, h = im.size
    if w / h > 4 / 3:
        nw = round(h * 4 / 3); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * 3 / 4); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    for wd in (640, 960, 1280):
        t = im.resize((wd, wd * 3 // 4), Image.LANCZOS); n = OUT / f"crop-{c}-{wd}"
        t.save(f"{n}.avif", quality=50); t.save(f"{n}.webp", quality=74); t.save(f"{n}.jpg", quality=78, optimize=True, progressive=True)
    print(c, im.size)
