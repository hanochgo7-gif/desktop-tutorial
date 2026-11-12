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
    "p-site": ("p-site.jpg", (.0625, 0, .9375, 1)),  # 4:3: open farmland before a net house, Hermon behind (still miftah-283, Drive "סטילס מצלמה"; Merav 11 Nov 2026)
    "p-marking": ("p-marking.jpg", (.3375, .2778, 1, .94)),  # 4:3, without the two workers at the left (one may be a minor)
    "p-poles": ("p-poles.jpg", None),
    "p-closed": ("p-closed.jpg", (0, 0, 1, .86)),  # trims the photographer's shadow at the bottom edge
    # real field photos from Hanoch, 8 Nov 2026 (galvanized steel only; the ones with no visible harness at height or rusty pipe are not used)
    "f-poles": ("f-poles-blocks.jpg", (0, .3125, 1, .875)),  # 4:3: round poles on concrete blocks, guys and the yellow lift
    "f-hailnets": ("f-hailnets.jpg", None),  # white anti-hail net strips on an orchard
    "f-flowers": ("f-flowers.jpg", None),  # anemones under a net (back on Hanoch's request, 12 Nov 2026, with his caption)
    "f-shade": ("f-shade.jpg", None),  # arched shade-net house
    # Merav's project photos, 9 Nov 2026 (content.GALLERY; ledger 7d)
    **{n: (f"merav/{n}.jpg", None) for n in ("g-shade-op", "g-shade-air", "g-lift-net", "g-cable", "g-drape", "g-lift-field", "g-basket", "g-team",
                                            "g-air-forest", "g-air-valley", "g-air-wide", "g-air-rows", "g-tunnel-colour", "g-tunnels", "g-tunnel-arch",
                                            "g-blue-shade", "g-orchard-net", "g-dark-house", "g-road")},
    # 39 stills from the Drive folder "סטילס מצלמה" for the gallery (Hanoch, 12 Nov 2026: at least 45 photos); 001 and 005 are panoramas
    **{f"s{n:03d}": (f"gallery/s{n:03d}.jpg", None) for n in (13, 89, 95, 117, 124, 143, 99, 101, 104, 110, 216, 226, 230, 242, 250, 128, 130, 131, 136, 138,
                                                            199, 202, 211, 259, 153, 154, 160, 147, 148, 150, 189, 235, 268, 271, 273, 277, 280)},
    "s001": ("gallery/s001.jpg", None), "s005": ("gallery/s005.jpg", None),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (master, crop) in JOBS.items():
        im = Image.open(SRC / master).convert("RGB")
        if crop:
            w, h = im.size
            im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
        for w in WIDTHS:
            if w > im.width * 1.02:  # a crop a few pixels narrower than 1600 still gets its 1600 file (a stale one would outlive the crop)
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
