"""Procedural handheld phone motion for a still of a flat surface (ceiling).
A ceiling is a plane, so a 2D similarity transform per frame is physically exact (no AI warping).
Same seed -> same motion, so a before and an after clip move identically under a wipe.
Usage: python3 build_handheld.py still.png out.mp4 [seconds] [seed] [zoom0] [zoom1] [fx] [fy]
(fx, fy) = framing centre as a fraction of the still; zoom ramps zoom0 -> zoom1 with ease-in-out."""
import math, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

W, H, FPS, SUB = 1080, 1920, 30, 3      # SUB = sub-frames averaged for motion blur


def motion(t, rng_phase):
    """hand tremor: low-freq sway + mid drift + fine shake (px at 1080 wide, degrees)"""
    p = rng_phase
    x = 7 * math.sin(2 * math.pi * 0.31 * t + p[0]) + 3 * math.sin(2 * math.pi * 0.73 * t + p[1]) + 0.9 * math.sin(2 * math.pi * 2.1 * t + p[2])
    y = 6 * math.sin(2 * math.pi * 0.27 * t + p[3]) + 2.6 * math.sin(2 * math.pi * 0.81 * t + p[4]) + 0.8 * math.sin(2 * math.pi * 1.9 * t + p[5])
    r = 0.16 * math.sin(2 * math.pi * 0.22 * t + p[6]) + 0.05 * math.sin(2 * math.pi * 1.3 * t + p[7])
    s = 1.0 + 0.004 * math.sin(2 * math.pi * 0.4 * t + p[8])      # breathing toward/away from ceiling
    return x, y, r, s


def render(src, t, phase, base_zoom=1.07, fx=0.5, fy=0.5):
    x, y, r, s = motion(t, phase)
    sw, sh = src.size
    k = sw / W                                   # source px per output px
    z = base_zoom * s
    a = math.radians(r)
    ca, sa = math.cos(a) / z, math.sin(a) / z
    # inverse map: output (u,v) -> source; centre-anchored rotation/scale + translation
    cx, cy = W / 2, H / 2
    A = k * ca; B = k * sa; D = -k * sa; E = k * ca
    C = sw * fx - A * (cx + x) - B * (cy + y)
    F = sh * fy - D * (cx + x) - E * (cy + y)
    return src.transform((W, H), Image.AFFINE, (A, B, C, D, E, F), resample=Image.BICUBIC)


def main(still, out, secs=5.0, seed=7, zoom0=1.07, zoom1=None, fx=0.5, fy=0.5):
    zoom0 = float(zoom0); zoom1 = zoom0 if zoom1 is None else float(zoom1); fx, fy = float(fx), float(fy)
    rng = np.random.default_rng(int(seed))
    phase = rng.uniform(0, 2 * math.pi, 9)
    src = Image.open(still).convert("RGB")
    n = int(round(float(secs) * FPS))
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "14", "-preset", "slow", out],
                         stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS
        acc = np.zeros((H, W, 3), np.float32)
        for j in range(SUB):                      # 1/60s shutter: average sub-frames across half the frame interval
            k = t / max(float(secs), 1e-6)
            e = 4 * k ** 3 if k < 0.5 else 1 - (-2 * k + 2) ** 3 / 2
            acc += np.asarray(render(src, t + j / (FPS * SUB * 2), phase, zoom0 + (zoom1 - zoom0) * e, fx, fy), np.float32)
        fr = Image.fromarray((acc / SUB).clip(0, 255).astype(np.uint8))
        af = max(0.0, 1 - abs(t - 0.25) / 0.25)    # autofocus hunt in the first half-second
        if af > 0:
            fr = fr.filter(ImageFilter.GaussianBlur(1.2 * af))
        ex = 1 + 0.012 * math.sin(2 * math.pi * 0.5 * t + phase[0])   # gentle auto-exposure drift
        fr = Image.fromarray((np.asarray(fr, np.float32) * ex).clip(0, 255).astype(np.uint8))
        p.stdin.write(fr.tobytes())
    p.stdin.close()
    sys.exit(p.wait())


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], *(sys.argv[3:9]))
