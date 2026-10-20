"""Vantix v7: US-market/compliance pass: no implied health claims, no undated "limited time",
FTC fine print on the end card, disclosure on every AI-generated shot.
Usage: python3 v4.py <vo.mp3> <music.wav|none> <out.mp4>"""
import json, math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw
import v3
from v3 import (S, SRC, W, H, FPS, SR, NAVY9, AMBER, font, F_OSW, clamp, out_cubic, make_hook)

# ---------- picture edit: video-only source clips fitted to the new VO ----------
# (src_start, src_end, new_start, new_end); speed = src_len / new_len
CLIPS = [
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/ai_before.mp4", 0.0, 4.00, 0.00, 4.00),      # "Hey Miami... Your AC's running pretty much all year, right?"
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/open_push6.mp4", 0.0, 2.75, 4.00, 6.75),     # "So when's the last time you actually looked inside your vents?"
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/open_corner6.mp4", 0.0, 1.80, 6.75, 8.55),   # "'Cause all that dust and buildup?"
    (3.56, 5.36, 8.55, 10.40),    # home         - "It gets pushed around your house"
    (10.70, 12.10, 10.40, 11.90), # bedroom vent - "every time the AC kicks on."
    (17.83, 20.54, 11.90, 14.60), # technician   - "That's where we come in. Vantix Home Services,"
    (20.54, 22.64, 14.60, 16.70), # air handler  - "we're local, right here in Miami,"
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/ba_module6.mp4", 0.0, 3.50, 16.70, 20.20),   # Before. / wipe on "clean" / After. - "...for just 97 bucks,"
    (24.90, 27.00, 20.20, 22.40), # blower fan   - "plus we'll throw in a free AC inspection"
    (28.00, 30.06, 22.40, 24.46), # dryer vent   - "and a basic dryer-vent cleaning."
]
END_T = 24.46                      # end card: "That's three services for 97 bucks. Tap below to grab your spot."
CARD97 = (99.0, 99.1)
SHORT_W = [(10.40, 11.90)]
OFFER_T = 20.20
GEN_END, BA = 8.55, (16.70, 20.20)
WIPE_T = 17.80
HOOK = ("MIAMI HOMEOWNERS:", "WHAT'S IN YOUR VENTS?")
CAPS = [
    (0.00, 4.00, ["YOUR AC RUNS", "ALL YEAR, RIGHT?"], ("YEAR,",), {"YEAR,": 3.12}),
    (4.00, 6.75, ["WHEN'S THE LAST TIME", "YOU LOOKED IN THERE?"], ("THERE?",), {"THERE?": 6.08}),
    (6.75, 8.55, ["ALL THAT DUST", "AND BUILDUP?"], ("DUST", "BUILDUP?"), {"DUST": 7.34, "BUILDUP?": 7.82}),
    (8.55, 10.40, ["PUSHED AROUND", "YOUR HOUSE"], ("HOUSE",), {"HOUSE": 9.64}),
    (10.40, 11.90, ["EVERY TIME THE AC KICKS ON"], ("AC",), {"AC": 10.72}),
    (11.90, 14.60, ["THAT'S WHERE", "VANTIX COMES IN"], ("VANTIX",), {"VANTIX": 13.58}),
    (14.60, 16.70, ["LOCAL. RIGHT HERE", "IN MIAMI."], ("MIAMI.",), {"MIAMI.": 16.16}),
]
CHECKS = [20.30, 21.46, 23.22]
BOTH_T, PRICE_T = 24.78, 25.66     # "three services", "97 bucks"
PUNCH_CUTS = [4.00, 6.75, 8.55, 10.40, 11.90, 14.60, 16.70, 20.20, 22.40]
PUSH = (4.00, 8.55, 0.0)
ALLERGENS_PUNCH = 7.34
LICENSE = __import__("os").environ.get("VANTIX_LICENSE", "").strip()   # Fla. Stat. 489.119(5)(b): required before launch
FINE_PRINT = ("$97 air duct cleaning. Free AC system inspection and basic dryer-vent cleaning included with paid duct cleaning. "
              "Serving Miami." + (f" Lic. #{LICENSE}" if LICENSE else ""))


class G(v3.Gfx):
    def __init__(self, total):
        self.v, self.T = "H1", total
        self.end_t, self.offer_t, self.checks = END_T, OFFER_T, CHECKS
        self.hook = make_hook(*HOOK)
        self.hook_end = 1.6
        self.caps = CAPS
        self.card97 = [CARD97[0]]
        self.both_t, self.price_t = BOTH_T, PRICE_T
        self.short_w = SHORT_W
        self.sticker = (self.hook_end, BA[0])           # hidden during the full-bleed before/after
        self.progress = False                           # read as Instagram's own story bar
        self.offer_label = "MIAMI SPECIAL"              # no end date known -> no "limited-time" claim
        self.show_tech = False                          # frees the bottom of the end card for the fine print
        self.cta_layout = (1170, 1262, 1336, 0.72)
        self.fine_print = FINE_PRINT
        self._sticker_static()
        self._offer_static()
        self._endcard_static()
        strip = Image.new("RGBA", (W, 64), AMBER + (255,))
        ImageDraw.Draw(strip).text((490, 32), "MIAMI SPECIAL  ·  LOCAL MIAMI COMPANY", font=font(F_OSW, 42), fill=NAVY9, anchor="mm")
        self.strip = strip

    def cap_maxw(self, t):
        return 770 if t < GEN_END else 824   # the smaller card on generated shots ends at x=900

    def frame(self, i):
        t = i / FPS
        top = super().frame(i)
        if t < GEN_END:   # generated shots carry no baked captions: a smaller, borderless card that leaves the dirt visible
            c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(c).rounded_rectangle([40, 1236, 900, 1500], 32, fill=NAVY9 + (224,))
            ImageDraw.Draw(c).rounded_rectangle([60, 1276, 70, 1460], 5, fill=(60, 139, 255, 255))
            c.alpha_composite(top)
        else:
            c = top
        if t < END_T:   # every shot in this ad is AI-generated -> disclosure pill on all footage
            f = font("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 30)
            y = 1166 if t < GEN_END else 1206 if BA[0] <= t < BA[1] else 262 if t >= OFFER_T else 1136
            w = int(f.getlength("Dramatization.")) + 36
            ImageDraw.Draw(c).rounded_rectangle([72, y, 72 + w, y + 50], 25, fill=(0, 0, 0, 140))
            ImageDraw.Draw(c).text((72 + 18, y + 25), "Dramatization.", font=f, fill=(255, 255, 255, 235), anchor="lm")
        return c

    def flashes(self):
        return [(11.90, 0.4, 0.04, 0.12)]


def pass1(out):
    parts, files = [], []
    for i, c in enumerate(CLIPS):
        if isinstance(c[0], str):
            f, a0, a1, t0, t1 = c
            files.append(f)
            idx = 2 + len(files)                       # inputs: 0 SRC, 1 cover_tall, 2 cover_short, 3.. files
            parts.append(f"[{idx}:v]trim=start={a0}:end={a1},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,"
                         f"fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={t1 - t0:.4f},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[v{i}]")
            continue
        a0, a1, t0, t1 = c
        sp = (a1 - a0) / (t1 - t0)
        parts.append(f"[0:v]trim=start={a0}:end={a1},setpts=(PTS-STARTPTS)/{sp:.5f},"
                     "hqdn3d=1.5:1.5:4:4,scale=1088:1920:flags=lanczos,crop=1080:1920,cas=strength=0.45,"
                     f"eq=contrast=1.06:saturation=1.12,fps=30,trim=duration={t1 - t0:.4f},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[v{i}]")
    n = len(CLIPS)
    parts.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vc]")
    off = f"gte(t,{OFFER_T:.3f})+between(t,{CARD97[0]:.3f},{CARD97[1]:.3f})+between(t,{BA[0]:.3f},{BA[1]:.3f})+lt(t,{GEN_END:.3f})"
    short = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in SHORT_W)
    parts.append(f"[1:v]format=rgba[ct];[2:v]format=rgba[cs];"
                 f"[vc][ct]overlay=0:0:shortest=1:enable='not({off})*not({short})'[v1];"
                 f"[v1][cs]overlay=0:0:shortest=1:enable='not({off})*({short})',format=yuv420p[vo]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-loop", "1", "-i", f"{S}/v3/cover_tall.png",
                    "-loop", "1", "-i", f"{S}/v3/cover_short.png"] + sum([["-i", f] for f in files], []) + ["-filter_complex", ";".join(parts),
                    "-map", "[vo]", "-c:v", "libx264", "-crf", "14", "-preset", "medium", out], check=True)


def zoom_expr():
    t = []
    for ct in PUNCH_CUTS:
        a, d = 0.06, 0.2
        t.append(f"{a}*between(TT,{ct:.3f},{ct + d:.3f})*pow(1-(TT-{ct:.3f})/{d},3)")
    a, b, z = PUSH
    t.append(f"{z}*between(TT,{a:.3f},{b:.3f})*(TT-{a:.3f})/{b - a:.3f}")
    return ("1+" + "+".join(t)).replace("TT", "(in/30)")


def sfx(total, path):
    n = int((total + 1) * SR)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(3)

    def add(sig, at, gain):
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
    add(thump, 0.0, 0.45)
    for ct in PUNCH_CUTS + [END_T]:
        add(whoosh, ct - 0.2, 0.16)
    for ct in CHECKS:
        add(tick, ct, 0.3)
    add(whoosh, WIPE_T - 0.15, 0.2)          # the before/after wipe
    add(thump, OFFER_T, 0.35); add(ding, OFFER_T + 0.02, 0.22)   # $97 lands with the offer card
    add(pop, 1.6, 0.25); add(pop, OFFER_T, 0.3); add(pop, PRICE_T, 0.25)
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main(vo, music, out):
    v3.cover_png()
    vo_len = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", vo],
                                  capture_output=True, text=True).stdout)
    total = round(vo_len + 1.0, 2)
    cut = f"{S}/v4/cut.mov"
    pass1(cut)
    g = G(total)
    sfx(total, f"{S}/v4/sfx.wav")
    z = zoom_expr()
    ins = ["-i", cut, "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", vo, "-i", f"{S}/v4/sfx.wav"]
    # VO: light de-ess/presence + compression; music ducked under VO (sidechain)
    fa = ("[2:a]aformat=channel_layouts=stereo,aresample=48000,highpass=f=80,"
          "equalizer=f=3500:t=q:w=1.2:g=2,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,"
          f"loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,apad=whole_dur={total},asplit=2[vo1][vo2];"
          "[3:a]aformat=channel_layouts=stereo,aresample=48000,volume=0.8[sx];")
    if music != "none":
        ins += ["-i", music]
        fa += (f"[4:a]aformat=channel_layouts=stereo,aresample=48000,atrim=0:{total},loudnorm=I=-26.5:TP=-3:LRA=11,aresample=48000,"
               f"afade=t=in:d=0.3,afade=t=out:st={total - 1.2:.2f}:d=1.2[mu];"
               "[mu][vo2]sidechaincompress=threshold=0.025:ratio=8:attack=15:release=300[mud];"
               "[vo1][mud][sx]amix=inputs=3:duration=longest:normalize=0,")
    else:
        fa += "[vo2]anullsink;[vo1][sx]amix=inputs=2:duration=first:normalize=0,"
    fa += "loudnorm=I=-14:TP=-1.0:LRA=7,aresample=48000[a]"
    fc = (f"[0:v]tpad=stop_mode=clone:stop_duration=10,scale=2160:3840:flags=bicubic,"
          f"zoompan=z='{z}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*0.718':d=1:s=1080x1920:fps=30,format=yuv420p[bz];"
          f"[bz][1:v]overlay=0:0:format=auto,format=yuv420p[v];" + fa)
    cmd = ["ffmpeg", "-v", "error", "-y"] + ins + ["-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-r", "30",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(int(round(total * FPS))):
        p.stdin.write(g.frame(i).tobytes())
    p.stdin.close()
    if p.wait():
        sys.exit(1)
    print("done", total)


if __name__ == "__main__":
    import os
    os.makedirs(f"{S}/v4", exist_ok=True)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
