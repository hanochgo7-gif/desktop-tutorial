"""Responsive images: every master in media-src/ -> AVIF, WebP and JPEG at 3 widths in public/assets/img/.
Crops are fractions of the master (left, top, right, bottom). Run: python3 src/tools/images.py"""
from pathlib import Path
from PIL import Image

W = Path(__file__).resolve().parents[2]
SRC, OUT = W / "media-src", W / "public/assets/img"
WIDTHS = (640, 1024, 1600)
JOBS = {
    # name: (master, crop box as fractions or None)
    "valley": ("valley.jpg", None),
    "forest": ("forest.jpg", None),
    "p-site": ("p-site.jpg", None),
    "p-marking": ("p-marking.jpg", None),
    "p-poles": ("p-poles.jpg", None),
    "p-closed": ("p-closed.jpg", (0, 0, 1, .86)),  # trims the photographer's shadow at the bottom edge
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (master, crop) in JOBS.items():
        im = Image.open(SRC / master).convert("RGB")
        if crop:
            w, h = im.size
            im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
        for w in WIDTHS:
            if w > im.width:
                continue
            t = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            t.save(OUT / f"{name}-{w}.avif", quality=52)
            t.save(OUT / f"{name}-{w}.webp", quality=76)
            t.save(OUT / f"{name}-{w}.jpg", quality=80, optimize=True, progressive=True)
        print(name, im.size)
    # hero posters (first frame of each hero clip; see video.sh)
    for frame, name, widths in (("hero-frame.png", "hero", (960, 1600)), ("hero-portrait-frame.png", "hero-portrait", (720,))):
        im = Image.open(SRC / frame).convert("RGB")
        for w in widths:
            t = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            t.save(OUT / f"{name}-{w}.avif", quality=55); t.save(OUT / f"{name}-{w}.webp", quality=78); t.save(OUT / f"{name}-{w}.jpg", quality=80, optimize=True, progressive=True)
    # social preview: the hero frame, 1200x630
    hf = Image.open(SRC / "hero-frame.png").convert("RGB")
    w, h = hf.size; tw = round(h * 1200 / 630)
    hf.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h)).resize((1200, 630), Image.LANCZOS).save(OUT / "og-miftah.jpg", quality=84, optimize=True)


if __name__ == "__main__":
    main()
