"""Apple-style before/after module (1080x1920). Usage:
python3 build_before_after.py before.mp4 after.mp4 out.mp4
Full-bleed footage, "Before." / "After." labels, a hairline wipe that 'cleans' the frame,
small "Dramatization." disclosure. Timing: 2.2s before, 0.7s wipe, 2.1s after = 5.0s."""
import subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
T_BEFORE, T_WIPE, T_AFTER = 2.2, 0.7, 2.1
DUR = T_BEFORE + T_WIPE + T_AFTER
DISPLAY = "/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf"   # SF Pro Display stand-in
TEXT = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2      # easeInOutCubic


def frames(path, n):
    """decode n frames scaled/cropped to 1080x1920, holding the last frame if short"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf",
                          "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
                          "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    if len(fr) < n:
        fr = np.concatenate([fr, np.repeat(fr[-1:], n - len(fr), 0)])
    return fr


INK_DARK, INK_LIGHT = (29, 29, 31), (255, 255, 255)   # Apple #1D1D1F on light plates, white on dark


def ink(frame, box):
    """pick label colour from the plate's luminance behind the label"""
    a = np.asarray(frame.convert("L").crop(box), np.float32) / 255
    return INK_DARK if a.mean() > 0.58 else INK_LIGHT


def label(text, size, alpha, col):
    f = ImageFont.truetype(DISPLAY, size)
    im = Image.new("RGBA", (W, size * 2), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((0, size // 2), text, font=f, fill=col + (int(255 * alpha),))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    shade = 0.35 if col == INK_LIGHT else 0.0
    sh.putalpha(im.split()[3].point(lambda v: int(v * shade)).filter(ImageFilter.GaussianBlur(14)))
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(sh, (0, 4))
    out.alpha_composite(im)
    return out


def main(before, after, out):
    n = int(round(DUR * FPS))
    nb = int(round((T_BEFORE + T_WIPE) * FPS))
    B = frames(before, nb)
    A = frames(after, n)
    small = ImageFont.truetype(TEXT, 26)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-vf", "noise=alls=4:allf=t,format=yuv420p",
                          "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", out],
                         stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS
        k = ease((t - T_BEFORE) / T_WIPE)
        xw = int(W * k)
        # slow 2% push on the after plate, anchored at frame centre
        z = 1 + 0.02 * max(0.0, t - T_BEFORE) / (T_WIPE + T_AFTER)
        a = Image.fromarray(A[i]).resize((int(W * z), int(H * z)), Image.LANCZOS)
        a = a.crop(((a.width - W) // 2, (a.height - H) // 2, (a.width - W) // 2 + W, (a.height - H) // 2 + H))
        frame = Image.fromarray(B[min(i, nb - 1)]) if k < 1 else a
        if 0 < k < 1:
            frame = frame.copy()
            frame.paste(a.crop((0, 0, xw, H)), (0, 0))
        frame = frame.convert("RGBA")
        if 0 < k < 1:   # the hairline that 'cleans' the frame
            glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(glow).rectangle([xw - 10, 0, xw + 10, H], fill=(255, 255, 255, 90))
            frame.alpha_composite(glow.filter(ImageFilter.GaussianBlur(12)))
            ImageDraw.Draw(frame).rectangle([xw - 1, 0, xw + 1, H], fill=(255, 255, 255, 235))
        # labels: "Before." fades out as the wipe starts, "After." fades in as it ends
        ab = 1 - ease((t - T_BEFORE + 0.1) / 0.3)
        aa = ease((t - T_BEFORE - T_WIPE + 0.15) / 0.3)
        col = ink(frame, (72, 330, 560, 450))
        if ab > 0:
            frame.alpha_composite(label("Before.", 120, ab, col), (72, 300))
        if aa > 0:
            frame.alpha_composite(label("After.", 120, aa, col), (72, 300))
        dcol = ink(frame, (72, 1460, 300, 1490))
        ImageDraw.Draw(frame).text((72, 1460), "Dramatization.", font=small, fill=dcol + (150,))
        p.stdin.write(frame.convert("RGB").tobytes())
    p.stdin.close()
    sys.exit(p.wait())


if __name__ == "__main__":
    main(*sys.argv[1:4])
