"""Vantix v3: re-edit + brand design system. Usage: python3 v3.py H1|H2|H3 out.mp4"""
import math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

S = "/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad"
SRC = "/root/.claude/uploads/5f33f76a-5842-5d1e-a820-fa195726d637/c15419ae-b6deed8c-1c15-4a42-93e5-611e4edcff15.mov"
W, H, FPS, SR = 1080, 1920, 30, 48000

# ---------- brand system (art director spec) ----------
NAVY9, NAVY7, BLUE, BLUE4 = (10, 26, 51), (18, 48, 94), (30, 111, 232), (60, 139, 255)
STEEL, ICE, AMBER, WHITE = (91, 102, 118), (238, 244, 253), (255, 198, 41), (255, 255, 255)
F_ANTON = f"{S}/fonts/anton-latin-400-normal.woff"
F_OSW = f"{S}/fonts/oswald-latin-700-normal.woff"
F_INTER = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
_fc = {}


def font(path, px):
    k = (path, px)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(path, px)
    return _fc[k]


def clamp(x):
    return min(max(x, 0.0), 1.0)


def out_cubic(x):
    return 1 - (1 - clamp(x)) ** 3


def out_back(x, s=1.70158):
    x = clamp(x) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


# ---------- edit (source times) ----------
MAIN = [
    dict(a=(7.775, 8.045), freeze=8.08),
    dict(a=(8.045, 11.825)),
    dict(a=(12.125, 17.325), fi=1),
    dict(a=(17.825, 27.275), fi=1),
    dict(a=(28.70, 37.175), fi=1),
]
H3_HEAD = [dict(a=(21.62, 24.22), head=True)]
HOOKS = {
    "H1": ("WHAT'S INSIDE", "YOUR AC VENTS?"),
    "H2": ("THE AIR YOU BREATHE", "STARTS HERE"),
    "H3": ("AIR DUCT CLEANING", "ONLY $97"),
}
CARD97 = (23.87, 24.88)          # full-screen baked $97 card: no cover box
ENDCARD_SRC = 31.70
SHORT_SRC = [(10.675, 12.125), (17.825, 20.54)]   # one-line baked captions -> short cover

# caption chunks: (src_start, src_end, lines, highlight, {word: src_time})
CAPS = [
    (7.70, 9.40, ["THE AIR YOU BREATHE"], ("AIR",), {"AIR": 8.54}),
    (9.40, 10.67, ["EVERY SINGLE DAY"], ("DAY",), {"DAY": 9.88}),
    (10.67, 12.10, ["EVEN WHILE YOU SLEEP"], ("SLEEP",), {"SLEEP": 11.36}),
    (12.10, 15.36, ["DUST. ALLERGENS.", "BUILDUP."], ("DUST.", "ALLERGENS.", "BUILDUP."), {"DUST.": 12.38, "ALLERGENS.": 13.08, "BUILDUP.": 14.16}),
    (15.36, 17.40, ["INSIDE YOUR VENTS", "& AC SYSTEM"], ("VENTS", "AC"), {"VENTS": 16.04, "AC": 16.60}),
    (17.80, 19.80, ["FOR A LIMITED TIME"], ("LIMITED",), {"LIMITED": 18.80}),
    (19.80, 21.75, ["VANTIX HOME SERVICES"], ("VANTIX",), {"VANTIX": 19.86}),
    (21.75, 23.87, ["AIR DUCT CLEANING", "FOR ONLY $97"], ("$97",), {"$97": 23.52}),
]
H3_CAPS = [(21.62, 23.87, ["BY VANTIX HOME SERVICES"], ("VANTIX",), {"VANTIX": 21.70})]
OFFER_SRC = 24.88                 # card in when fan shot (with baked badge) starts
CHECKS_SRC = [24.98, 25.60, 30.56]
PUNCH_SRC_CUTS = [10.675, 20.54, 24.90]      # in-segment visual cuts
INSIDE_PUNCH_SRC = 15.38
BOTH_SRC, PRICE_SRC = 32.10, 33.52


def timeline(variant):
    segs = (H3_HEAD if variant == "H3" else []) + [dict(s) for s in MAIN]
    t = 0.0
    for s in segs:
        s["t0"] = t
        t += s["a"][1] - s["a"][0]
        s["t1"] = t
    return segs, t


def m(segs, src, head_ok=False):
    """first new time for a source time (skips head segment unless head_ok)"""
    for s in segs:
        if s.get("head") and not head_ok:
            continue
        if s["a"][0] <= src < s["a"][1] + 1e-6:
            return s["t0"] + src - s["a"][0]
    return None


def win(segs, a, b):
    """map a source interval to new-time intervals (all occurrences)"""
    out = []
    for s in segs:
        c0, c1 = max(a, s["a"][0]), min(b, s["a"][1])
        if c0 < c1:
            out.append((s["t0"] + c0 - s["a"][0], s["t0"] + c1 - s["a"][0]))
    return out


# ---------- pass 1: cut + cover box (cover zooms with footage) ----------
def cover_png():
    for name, (y0, y1) in {"tall": (1200, 1556), "short": (1215, 1400)}.items():
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([30, y0 + 12, 1050, y1 + 12], 32, fill=(0, 0, 0, 90))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([30, y0, 1050, y1], 32, fill=NAVY9 + (255,))
        d.rounded_rectangle([32, y0 + 2, 1048, y1 - 2], 30, outline=BLUE + (153,), width=2)
        d.rounded_rectangle([56, y0 + 40, 66, y1 - 40], 5, fill=BLUE4 + (255,))
        img.save(f"{S}/v3/cover_{name}.png")


def pass1(segs, off_t, out):
    parts, n = [], len(segs)
    for i, s in enumerate(segs):
        a0, a1 = s["a"]
        dur = a1 - a0
        if "freeze" in s:
            f = s["freeze"]
            v = f"[0:v]trim=start={f}:end={f + 1 / FPS:.4f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={dur:.4f},trim=duration={dur:.4f},"
        else:
            v = f"[0:v]trim=start={a0}:end={a1},setpts=PTS-STARTPTS,"
        v += "hqdn3d=1.5:1.5:4:4,scale=1088:1920:flags=lanczos,crop=1080:1920,cas=strength=0.45,eq=contrast=1.06:saturation=1.12,fps=30,format=yuv420p,setsar=1"
        parts.append(v + f"[v{i}]")
        au = f"[0:a]atrim=start={a0}:end={a1},asetpts=PTS-STARTPTS"
        if s.get("fi") or (i > 0 and segs[i - 1]["a"][1] != a0):
            au += ",afade=t=in:d=0.025"
        if i < n - 1 and segs[i + 1]["a"][0] != a1:
            au += f",afade=t=out:st={dur - 0.025:.4f}:d=0.025"
        parts.append(au + f",aresample=48000[a{i}]")
    parts.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[vc][ac]")
    off = [f"gte(t,{off_t:.3f})"] + [f"between(t,{x0:.3f},{x1:.3f})" for x0, x1 in win(segs, *CARD97)]
    short = [f"between(t,{x0:.3f},{x1:.3f})" for a0, a1 in SHORT_SRC for x0, x1 in win(segs, a0, a1)]
    en_off, en_s = "+".join(off), "+".join(short)
    parts.append(f"[1:v]format=rgba[ct];[2:v]format=rgba[cs];"
                 f"[vc][ct]overlay=0:0:shortest=1:enable='not({en_off})*not({en_s})'[v1];"
                 f"[v1][cs]overlay=0:0:shortest=1:enable='not({en_off})*({en_s})',format=yuv420p[vo]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-loop", "1", "-i", f"{S}/v3/cover_tall.png", "-loop", "1", "-i", f"{S}/v3/cover_short.png",
                    "-filter_complex", ";".join(parts), "-map", "[vo]", "-map", "[ac]", "-shortest",
                    "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-c:a", "pcm_s16le", out], check=True)


# ---------- pass 2 graphics ----------
def text_w(f, s):
    return f.getlength(s)


def make_hook(l1, l2):
    f = font(F_ANTON, 96)
    out = []
    for txt, bg, fg in [(l1, NAVY9, WHITE), (l2, AMBER, NAVY9)]:
        w = int(text_w(f, txt)) + 48
        w = min(w, 860)
        fz = f
        while text_w(fz, txt) + 48 > 860:
            fz = font(F_ANTON, fz.size - 4)
        im = Image.new("RGBA", (w, 120), bg + (255,))
        ImageDraw.Draw(im).text((24, 60), txt, font=fz, fill=fg, anchor="lm")
        out.append(im)
    return out


def check_icon(p):
    """p 0..1 animation; returns 56px RGBA"""
    sz = 56 * 4
    im = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([6, 6, sz - 6, sz - 6], outline=(60, 90, 136, 255), width=12)
    if p > 0:
        s = out_back(p / 0.55, 1.6)
        r = (sz / 2 - 2) * s
        c = sz / 2
        d.ellipse([c - r, c - r, c + r, c + r], fill=BLUE + (255,))
        q = clamp((p - 0.45) / 0.45)
        pts = [(sz * 0.27, sz * 0.52), (sz * 0.44, sz * 0.68), (sz * 0.74, sz * 0.36)]
        if q > 0:
            seg1 = min(q * 2, 1)
            x = pts[0][0] + (pts[1][0] - pts[0][0]) * seg1
            y = pts[0][1] + (pts[1][1] - pts[0][1]) * seg1
            d.line([pts[0], (x, y)], fill=WHITE, width=24)
            if q > 0.5:
                seg2 = (q - 0.5) * 2
                d.line([pts[1], (pts[1][0] + (pts[2][0] - pts[1][0]) * seg2, pts[1][1] + (pts[2][1] - pts[1][1]) * seg2)],
                       fill=WHITE, width=24, joint="curve")
    return im.resize((56, 56), Image.LANCZOS)


def price_img(px, color):
    """'$97' with small top-aligned $"""
    fb, fs = font(F_ANTON, px), font(F_ANTON, int(px * 0.55))
    w = int(text_w(fs, "$") + text_w(fb, "97")) + 8
    asc = fb.getbbox("97")
    im = Image.new("RGBA", (w, asc[3] + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    top = asc[1]
    d.text((0, top - fs.getbbox("$")[1]), "$", font=fs, fill=color)
    d.text((text_w(fs, "$") + 6, 0), "97", font=fb, fill=color)
    return im.crop((0, top, w, asc[3]))


class Gfx:
    def __init__(self, variant, segs, total):
        self.v, self.segs, self.T = variant, segs, total
        self.end_t = m(segs, ENDCARD_SRC)
        self.hook = make_hook(*HOOKS[variant])
        self.caps = []
        src_caps = [(c, True) for c in H3_CAPS] if variant == "H3" else []
        caps = list(CAPS)
        if variant == "H2":  # hook already says "the air you breathe"
            caps[0] = (7.70, 9.40, ["WHAT ABOUT THE AIR?"], ("AIR",), {"AIR": 8.54})
        for c, head in src_caps + [(c, False) for c in caps]:
            t0 = m(segs, c[0], head) if not head else segs[0]["t0"] + c[0] - segs[0]["a"][0]
            t1 = m(segs, c[1] - 1e-3, head) if not head else segs[0]["t0"] + c[1] - segs[0]["a"][0]
            if t0 is None:
                for s in segs:  # chunk starts in a cut region: clamp to next segment
                    if not s.get("head") and s["a"][0] > c[0] and s["a"][0] < c[1]:
                        t0 = s["t0"]; break
            if t1 is None:
                for s in reversed(segs):
                    if not s.get("head") and s["a"][1] < c[1] and s["a"][1] > c[0]:
                        t1 = s["t1"]; break
            if t0 is None or t1 is None:
                continue
            if head:
                wt = {k: segs[0]["t0"] + v - segs[0]["a"][0] for k, v in c[4].items()}
            else:
                wt = {k: m(segs, v) for k, v in c[4].items()}
            self.caps.append((t0, t1, c[2], c[3], wt))
        self.hook_end = 1.9 if variant == "H3" else 1.6
        self.offer_t = m(segs, OFFER_SRC)
        self.checks = [m(segs, x) for x in CHECKS_SRC]
        self.card97 = [t for t in (m(segs, CARD97[0]), (segs[0]["t0"] + CARD97[0] - segs[0]["a"][0]) if variant == "H3" else None) if t is not None]
        self.both_t, self.price_t = m(segs, BOTH_SRC), m(segs, PRICE_SRC)
        self.short_w = [w for a0, a1 in SHORT_SRC for w in win(segs, a0, a1)]
        main97 = m(segs, CARD97[0])
        self.sticker = ((segs[1]["t0"] if variant == "H3" else self.hook_end), main97 - 0.05)
        self._sticker_static()
        self._offer_static()
        self._endcard_static()

    def _sticker_static(self):
        f = font(F_OSW, 44)
        txt = "AIR DUCT CLEANING"
        p = price_img(56, NAVY9)
        w = int(text_w(f, txt)) + p.size[0] + 32 + 28 + 20
        im = Image.new("RGBA", (w, 76), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, w - 1, 75], 38, fill=AMBER + (255,))
        d.text((32, 38), txt, font=f, fill=NAVY9, anchor="lm")
        im.alpha_composite(p, (32 + int(text_w(f, txt)) + 20, (76 - p.size[1]) // 2))
        self.sticker_img = im

    # ---- offer card ----
    OY = 950  # offer card top (covers baked captions, replaces caption box)

    def _offer_static(self):
        Y = self.OY
        card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([30, Y + 16, 1050, Y + 596], 32, fill=(0, 0, 0, 115))
        card.alpha_composite(sh.filter(ImageFilter.GaussianBlur(20)))
        d = ImageDraw.Draw(card)
        d.rounded_rectangle([30, Y, 1050, Y + 580], 32, fill=NAVY9 + (255,), outline=BLUE + (255,), width=3)
        lab = font(F_INTER, 34)
        x = 96
        for ch in "LIMITED-TIME SPECIAL":
            d.text((x, Y + 34), ch, font=lab, fill=AMBER); x += text_w(lab, ch) + 3
        p = price_img(150, AMBER)
        card.alpha_composite(p, (96, Y + 92))
        d.text((96 + p.size[0] + 36, Y + 92 + p.size[1]), "WHAT YOU GET:", font=font(F_OSW, 46), fill=WHITE, anchor="ls")
        d.line([(96, Y + 272), (920, Y + 272)], fill=NAVY7, width=2)
        self.offer_base = card
        self.items = [("AIR DUCT CLEANING", None), ("FREE AC SYSTEM INSPECTION", "FREE"), ("BASIC DRYER-VENT CLEANING", None)]

    def _item(self, d_img, idx, p):
        txt, hl = self.items[idx]
        y = self.OY + 288 + idx * 92
        d_img.alpha_composite(check_icon(p), (96, y + 22))
        f = font(F_OSW, 50)
        q = clamp((p - 0.2) / 0.6)
        alpha = int(255 * (0.55 + 0.45 * q))
        dx = int(16 * (1 - out_cubic(q))) if p > 0 else 0
        x = 176 + dx
        lay = Image.new("RGBA", (W, 100), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for wd in txt.split(" "):
            col = AMBER if (wd == hl and p > 0) else WHITE
            d.text((x, 50), wd, font=f, fill=col + (alpha,), anchor="lm")
            x += text_w(f, wd + " ")
        d_img.alpha_composite(lay, (0, y))

    # ---- end card ----
    def _endcard_static(self):
        src = Image.open(f"{S}/frames/endcard.png").convert("RGBA")
        lg = np.array(src.crop((240, 255, 850, 615)).convert("RGB")).astype(int)
        a = np.clip((255 - lg.min(2)) * 5 - 40, 0, 255).astype(np.uint8)
        self.logo = Image.fromarray(np.dstack([lg.astype(np.uint8), a]), "RGBA")
        tech = src.crop((450, 1160, 1080, 1920))
        fade = Image.new("L", tech.size, 255)
        g = np.tile(np.clip(np.linspace(0, 1.6, tech.size[0]), 0, 1)[None, :], (tech.size[1], 1))
        fade = Image.fromarray((g * 255).astype(np.uint8))
        tech.putalpha(ImageChops.multiply(tech.split()[3], fade))
        self.tech = tech
        bg = Image.new("RGBA", (W, H), ICE + (255,))
        ImageDraw.Draw(bg).polygon([(0, 0), (W, 0), (W, 120), (0, 420)], fill=(226, 236, 251, 255))
        self.end_bg = bg
        # price hero block
        blk = Image.new("RGBA", (700, 250), (0, 0, 0, 0))
        bd = ImageDraw.Draw(blk)
        bd.rounded_rectangle([0, 0, 699, 249], 32, fill=NAVY9 + (255,))
        fo = font(F_OSW, 64)
        pr = price_img(210, AMBER)
        tw = text_w(fo, "ONLY") + 30 + pr.size[0]
        x0 = (700 - tw) / 2
        bd.text((x0, 125), "ONLY", font=fo, fill=WHITE, anchor="lm")
        blk.alpha_composite(pr, (int(x0 + text_w(fo, "ONLY") + 30), (250 - pr.size[1]) // 2))
        self.pill = blk
        strip = Image.new("RGBA", (W, 64), AMBER + (255,))
        ImageDraw.Draw(strip).text((490, 32), "LIMITED-TIME OFFER  ·  BOOK TODAY", font=font(F_OSW, 42), fill=NAVY9, anchor="mm")
        self.strip = strip

    def endcard(self, c, tt):
        def ent(delay, dur=0.22):
            return out_cubic((tt - delay) / dur)
        c.alpha_composite(self.end_bg)
        # technician (decorative, bottom-right)
        e = ent(0.5, 0.3)
        paste(c, self.tech.resize((420, 507), Image.LANCZOS), 870, 1666, e * 0.95)
        # logo, small
        e = ent(0.0, 0.25)
        lw = int(300 * (0.92 + 0.08 * e))
        paste(c, self.logo.resize((lw, int(lw * self.logo.size[1] / self.logo.size[0])), Image.LANCZOS), 490, 352, e)
        # headline
        e = ent(0.1)
        tmp = Image.new("RGBA", (W, 130), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((490, 65), "AIR DUCT CLEANING", font=font(F_ANTON, 104), fill=NAVY9, anchor="mm")
        c.alpha_composite(fade_img(tmp, e), (0, 455 + int(20 * (1 - e))))
        # price hero with bounce on "both" / "$97"
        bounce = 1.0
        for bt in (self.both_t, self.price_t):
            if bt is not None and 0 <= (self.t - bt) / 0.35 <= 1:
                bounce = max(bounce, 1 + 0.10 * math.sin(math.pi * (self.t - bt) / 0.35))
        if tt > 0.2:
            paste_scaled(c, self.pill, 490, 725, (0.85 + 0.15 * out_back((tt - 0.2) / 0.3)) * bounce, ent(0.2))
        # add-ons
        e = ent(0.32)
        tmp = Image.new("RGBA", (W, 150), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        td.text((490, 36), "+ FREE AC SYSTEM INSPECTION", font=font(F_OSW, 56), fill=NAVY7, anchor="mm")
        td.text((490, 110), "+ BASIC DRYER-VENT CLEANING", font=font(F_OSW, 56), fill=NAVY7, anchor="mm")
        c.alpha_composite(fade_img(tmp, e), (0, 870 + int(16 * (1 - e))))
        # urgency strip
        e = ent(0.5, 0.24)
        if e > 0:
            c.alpha_composite(self.strip, (int(-W * (1 - e)), 1040))
        # CTA label + tap below + big arrow
        e = ent(0.64)
        if e > 0:
            pulse = 1 + 0.05 * (0.5 - 0.5 * math.cos(2 * math.pi * max(0.0, tt - 1.0))) if tt > 1.0 else 1.0
            tmp = Image.new("RGBA", (980, 120), (0, 0, 0, 0))
            ImageDraw.Draw(tmp).text((490, 60), "BOOK NOW FOR $97", font=font(F_ANTON, 100), fill=BLUE, anchor="mm")
            paste_scaled(c, tmp, 490, 1182, pulse, e)
            tmp = Image.new("RGBA", (980, 70), (0, 0, 0, 0))
            ImageDraw.Draw(tmp).text((490, 35), "TAP THE BUTTON BELOW", font=font(F_OSW, 52), fill=NAVY9, anchor="mm")
            paste(c, tmp, 490, 1283, e)
            bob = 22 * (0.5 - 0.5 * math.cos(2 * math.pi * tt / 0.8))
            ar = Image.new("RGBA", (140, 130), (0, 0, 0, 0))
            ImageDraw.Draw(ar).polygon([(45, 0), (95, 0), (95, 58), (135, 58), (70, 128), (5, 58), (45, 58)], fill=BLUE + (255,))
            paste(c, ar, 470, 1395 + bob, e)

    # ---- per frame ----
    def frame(self, i):
        t = self.t = i / FPS
        c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(c)
        if t >= self.end_t:
            self.endcard(c, t - self.end_t)
            return c
        # captions
        for t0, t1, lines, hl, wt in self.caps:
            if t0 <= t < t1 and (self.offer_t is None or t < self.offer_t):
                self.caption(c, t, t0, lines, hl, wt)
        # offer card
        if self.offer_t is not None and t >= self.offer_t:
            k = (t - self.offer_t) / 0.16
            card = self.offer_base.copy()
            for idx, ct in enumerate(self.checks):
                p = clamp((t - ct) / 0.45) if ct is not None else 0
                self._item(card, idx, p)
            if k < 1:
                s = 1.04 - 0.04 * out_cubic(k)
                cw, ch = int(W * s), int(H * s)
                cs = card.resize((cw, ch), Image.BILINEAR)
                ox, oy = int(540 * (s - 1)), int((self.OY + 290) * (s - 1))
                c.alpha_composite(cs.crop((ox, oy, ox + W, oy + H)))
            else:
                c.alpha_composite(card)
        # persistent price sticker
        if self.sticker[0] <= t < self.sticker[1]:
            k = (t - self.sticker[0]) / 0.25
            paste_scaled(c, self.sticker_img, 60 + self.sticker_img.size[0] / 2, 262 + 38, out_back(k) if k < 1 else 1.0)
        # hook headline (tape bars)
        if t < self.hook_end:
            self.hookbars(c, t)
        # flashes
        for ft, peak, tin, tout in self.flashes():
            if ft - tin <= t < ft + tout:
                a = (t - (ft - tin)) / tin if t < ft else 1 - (t - ft) / tout
                d.rectangle([0, 0, W, H], fill=(255, 255, 255, int(255 * peak * clamp(a))))
        # progress bar
        if not getattr(self, "progress", True):
            return c
        k = t / self.end_t
        d.rounded_rectangle([60, 240, 920, 248], 4, fill=(255, 255, 255, 56))
        xe = 60 + int(860 * k)
        for x in range(60, xe, 4):
            f = (x - 60) / 860
            col = tuple(int(BLUE[j] + (BLUE4[j] - BLUE[j]) * f) for j in range(3))
            d.rectangle([x, 240, min(x + 4, xe), 248], fill=col + (255,))
        d.ellipse([xe - 8, 236, xe + 8, 252], fill=AMBER + (255,))
        return c

    def flashes(self):
        fl = [(m(self.segs, MAIN[3]["a"][0]), 0.4, 0.04, 0.12)]
        fl += [(t, 0.8, 0.04, 0.18) for t in self.card97]
        return [f for f in fl if f[0] is not None]

    def hookbars(self, c, t):
        b1, b2 = self.hook
        layer = Image.new("RGBA", (980, 300), (0, 0, 0, 0))
        layer.alpha_composite(b1, (0, 20))
        k = clamp((t - 0.12) / 0.16)
        if k > 0:
            w = max(1, int(b2.size[0] * out_cubic(k)))
            bar = b2.copy()
            if t < 0.2:  # bar color before text appears
                bar = Image.new("RGBA", b2.size, AMBER + (255,))
            bar = bar.crop((0, 0, w, b2.size[1]))
            pulse = 1 + 0.06 * math.sin(math.pi * clamp((t - 0.9) / 0.2)) if t > 0.9 else 1
            if pulse > 1:
                bar = bar.resize((int(bar.size[0] * pulse), int(bar.size[1] * pulse)), Image.LANCZOS)
            layer.alpha_composite(bar, (0, 152 - (bar.size[1] - 120) // 2))
        layer = layer.rotate(2, resample=Image.BICUBIC, expand=False, center=(0, 150))
        c.alpha_composite(layer, (60, 262))

    def caption(self, c, t, t0, lines, hl, wt):
        short = any(a <= t < b for a, b in self.short_w)
        cy = 1307 if short else 1378
        f = font(F_OSW, 84)
        maxw = self.cap_maxw(t) if hasattr(self, "cap_maxw") else 824
        while max(text_w(f, ln) for ln in lines) > maxw:
            f = font(F_OSW, f.size - 4)
        lh = int(f.size * 1.05)
        ytop = cy - lh * len(lines) / 2
        idx = 0
        for li, ln in enumerate(lines):
            x = 96
            for wd in ln.split(" "):
                st = t0 + 0.06 * idx if t0 > 0.01 else -1.0   # opening caption is complete on frame 0 (thumbnail)
                p = clamp((t - st) / 0.1)
                if p > 0:
                    spoken = wt.get(wd)
                    lit = wd in hl and (spoken is None or t >= spoken - 0.04 or spoken - 0.04 < t0)
                    col = AMBER if lit else WHITE
                    sc = 1.0
                    if wd in hl and spoken is not None:
                        k = (t - max(spoken - 0.04, t0)) / 0.2
                        if 0 <= k <= 1:
                            sc = 1 + 0.10 * math.sin(math.pi * k)
                    ww = text_w(f, wd)
                    tmp = Image.new("RGBA", (int(ww * 1.2) + 10, lh + 20), (0, 0, 0, 0))
                    ImageDraw.Draw(tmp).text((5, (lh + 20) / 2), wd, font=f, fill=col, anchor="lm")
                    if sc != 1:
                        tmp = tmp.resize((int(tmp.size[0] * sc), int(tmp.size[1] * sc)), Image.LANCZOS)
                    yy = ytop + li * lh + lh / 2 + 14 * (1 - out_cubic(p))
                    c.alpha_composite(fade_img(tmp, out_cubic(p)), (int(x - 5 - (sc - 1) * ww / 2), int(yy - tmp.size[1] / 2)))
                x += text_w(f, wd + " ")
                idx += 1


def fade_img(im, a):
    if a >= 1:
        return im
    im = im.copy()
    im.putalpha(im.split()[3].point(lambda v: int(v * max(a, 0))))
    return im


def paste(c, im, cx, cy, a=1.0):
    if a <= 0:
        return
    c.alpha_composite(fade_img(im, a), (int(cx - im.size[0] / 2), int(cy - im.size[1] / 2)))


def paste_scaled(c, im, cx, cy, s, a=1.0):
    if s <= 0.01 or a <= 0:
        return
    im2 = im.resize((max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s))), Image.LANCZOS)
    paste(c, im2, cx, cy, a)


# ---------- zoom expression (footage + cover) ----------
def zoom_expr(g):
    segs = g.segs
    terms = ["1"]
    cuts = [s["t0"] for s in segs[1:] if not (s["a"][0] == segs[segs.index(s) - 1]["a"][1])]
    cuts += [m(segs, x) for x in PUNCH_SRC_CUTS]
    cuts += g.card97
    for ct in sorted(set(x for x in cuts if x is not None)):
        a, d = (0.15, 0.25) if any(abs(ct - x) < 0.6 for x in g.card97) else (0.06, 0.2)
        terms.append(f"{a}*between(t,{ct:.3f},{ct + d:.3f})*pow(1-(t-{ct:.3f})/{d},3)")
    for s in segs:   # slow push + 'inside' punch on the 5s vent still
        if s["a"][0] == 12.125:
            t0, t1 = s["t0"], s["t1"]
            terms.append(f"0.05*between(t,{t0:.3f},{t1:.3f})*(t-{t0:.3f})/{t1 - t0:.3f}")
            tp = m(segs, INSIDE_PUNCH_SRC)
            terms.append(f"0.08*between(t,{tp:.3f},{t1:.3f})")
            g.inside_punch = tp
    return "+".join(terms)


# ---------- SFX ----------
def sfx(g, path):
    n = int((g.T + 1) * SR)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(3)

    def add(sig, at, gain):
        if at is None:
            return
        a = int(max(at, 0) * SR)
        out[a:a + len(sig)] += gain * sig[: n - a]

    def env(L, at, rl):
        e = np.ones(L, np.float32)
        a, r = int(at * SR), int(rl * SR)
        e[:a] = np.linspace(0, 1, a)
        e[-r:] *= np.linspace(1, 0, r) ** 2
        return e

    L = int(0.4 * SR)
    nz = rng.standard_normal(L).astype(np.float32)
    cut = np.concatenate([np.linspace(0.02, 0.3, L // 2), np.linspace(0.3, 0.03, L - L // 2)])
    y = np.zeros(L, np.float32); prev = 0.0
    for k in range(L):
        prev += cut[k] * (nz[k] - prev); y[k] = prev
    whoosh = y / np.abs(y).max() * env(L, 0.16, 0.22)
    tt = np.arange(int(0.5 * SR)) / SR
    thump = (np.sin(2 * np.pi * (55 + 60 * np.exp(-12 * tt)) * tt) * np.exp(-7 * tt)).astype(np.float32)
    td = np.arange(int(1.2 * SR)) / SR
    ding = (np.sin(2 * np.pi * 1318.5 * td) * np.exp(-4 * td) + 0.5 * np.sin(2 * np.pi * 1975.5 * td) * np.exp(-5 * td)).astype(np.float32)
    tk = np.arange(int(0.06 * SR)) / SR
    tick = (np.sin(2 * np.pi * 2200 * tk) * np.exp(-60 * tk)).astype(np.float32)
    tp = np.arange(int(0.09 * SR)) / SR
    pop = (np.sin(2 * np.pi * np.cumsum(np.linspace(250, 900, len(tp))) / SR) * np.exp(-30 * tp)).astype(np.float32)

    add(thump, 0.0, 0.5)
    add(whoosh, 0.0, 0.18)
    cuts = [s["t0"] for s in g.segs[1:]] + [m(g.segs, x) for x in PUNCH_SRC_CUTS] + [getattr(g, "inside_punch", None)]
    for ct in set(x for x in cuts if x is not None):
        if all(abs(ct - x) > 0.3 for x in g.card97):
            add(whoosh, ct - 0.2, 0.22)
    for x in g.card97:
        add(thump, x, 0.45); add(ding, x + 0.02, 0.28)
    add(whoosh, g.end_t - 0.2, 0.22)
    for ct in g.checks:
        add(tick, ct, 0.35)
    add(pop, g.offer_t, 0.35)
    add(pop, g.price_t, 0.3)
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main(variant, out):
    import os
    os.makedirs(f"{S}/v3", exist_ok=True)
    segs, total = timeline(variant)
    cover_png()
    g = Gfx(variant, segs, total)
    cut = f"{S}/v3/cut_{variant}.mov"
    pass1(segs, g.offer_t, cut)
    z = zoom_expr(g)
    sfx(g, f"{S}/v3/sfx_{variant}.wav")
    N = int(round(total * FPS))
    z = z.replace("between(t,", "between(TT,").replace("(t-", "(TT-").replace("TT", "(in/30)")
    fc = (f"[0:v]scale=2160:3840:flags=bicubic,zoompan=z='{z}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*0.718':d=1:s=1080x1920:fps=30,"
          f"format=yuv420p[bz];"
          f"[bz][1:v]overlay=0:0:format=auto,format=yuv420p[v];"
          f"[2:a]aformat=channel_layouts=stereo,aresample=48000[s];"
          f"[0:a]aformat=channel_layouts=stereo,afade=t=out:st={total - 0.35:.3f}:d=0.35[va];"
          f"[va][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=7,aresample=48000[a]")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", cut,
           "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", f"{S}/v3/sfx_{variant}.wav", "-filter_complex", fc,
           "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-r", "30",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(N):
        p.stdin.write(g.frame(i).tobytes())
    p.stdin.close()
    if p.wait():
        sys.exit(1)
    print(variant, f"{total:.2f}s", "end", f"{g.end_t:.2f}", "offer", f"{g.offer_t:.2f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
