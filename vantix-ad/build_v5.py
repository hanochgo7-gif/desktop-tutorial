"""Vantix v5: v4 + realistic generated vent (opening) and Apple-style before/after reveal.
Usage: python3 v4.py <vo.mp3> <music.wav|none> <out.mp4>"""
import json, math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw
import v3
from v3 import (S, SRC, W, H, FPS, SR, NAVY9, AMBER, font, F_OSW, clamp, out_cubic, make_hook)

# ---------- picture edit: video-only source clips fitted to the new VO ----------
# (src_start, src_end, new_start, new_end); speed = src_len / new_len
CLIPS = [
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/ai_before.mp4", 0.0, 2.95, 0.00, 2.95),     # generated vent, AI handheld - "Miami, your AC runs..."
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/open_push.mp4", 0.0, 2.10, 2.95, 5.05),     # same vent, push-in - "what's building up inside your vents?"
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/open_corner.mp4", 0.0, 1.80, 5.05, 6.85),   # mold corner close-up - "Dust, allergens and debris"
    (3.56, 5.36, 6.85, 9.40),     # man at home (palm trees) - "circulating through your home every day,"
    (10.70, 12.10, 9.40, 10.95),  # sleeping    - "even while you sleep."
    (17.83, 20.54, 10.95, 13.60), # technician  - "Vantix Home Services is your local Miami air duct team."
    ("/tmp/claude-0/-home-user-desktop-tutorial/5f33f76a-5842-5d1e-a820-fa195726d637/scratchpad/vent/ba_module.mp4", 0.0, 4.00, 13.60, 17.60),   # Before. / wipe / After. - "...professional air duct cleaning for just"
    (23.87, 24.88, 17.60, 18.90), # $97 card    - "$97,"
    (24.90, 27.50, 18.90, 21.50), # blower fan  - "plus a free AC system inspection"
    (28.00, 30.50, 21.50, 24.00), # dryer vent  - "and basic dryer vent cleaning included."
]
END_T = 24.00                      # custom end card: "Three services, one price, $97. Tap below..."
CARD97 = (17.60, 18.90)
SHORT_W = [(9.40, 10.95)]          # one-line baked caption -> short cover
OFFER_T = 18.90
HOOK = ("MIAMI HOMEOWNERS:", "WHAT'S IN YOUR VENTS?")

# captions: (start, end, lines, highlight words, {word: spoken time})
CAPS = [
    (0.00, 2.95, ["YOUR AC RUNS", "ALMOST ALL YEAR"], ("YEAR",), {"YEAR": 2.10}),
    (2.95, 5.05, ["WHAT'S BUILDING UP", "IN THERE?"], ("THERE?",), {"THERE?": 4.36}),
    (5.05, 6.85, ["DUST. ALLERGENS.", "DEBRIS."], ("DUST.", "ALLERGENS.", "DEBRIS."), {"DUST.": 5.26, "ALLERGENS.": 5.92, "DEBRIS.": 6.52}),
    (6.85, 9.40, ["CIRCULATING THROUGH", "YOUR HOME EVERY DAY"], ("HOME", "DAY"), {"HOME": 8.14, "DAY": 8.84}),
    (9.40, 10.95, ["EVEN WHILE YOU SLEEP"], ("SLEEP",), {"SLEEP": 10.22}),
    (10.95, 13.60, ["VANTIX HOME SERVICES", "YOUR LOCAL MIAMI TEAM"], ("VANTIX", "MIAMI"), {"VANTIX": 11.18, "MIAMI": 12.90}),
]
CHECKS = [19.00, 20.12, 22.30]
BOTH_T, PRICE_T = 25.18, 26.46     # "one price", "$97" -> price bounce on end card
PUNCH_CUTS = [2.95, 6.85, 9.40, 10.95, 13.60, 18.90, 21.50]
PUSH = (2.95, 6.85, 0.0)           # new clips carry their own camera motion
ALLERGENS_PUNCH = 5.92


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
        self.sticker = (self.hook_end, 13.60)          # hidden during the full-bleed before/after
        self.progress = False                           # read as Instagram's own story bar
        self._sticker_static()
        self._offer_static()
        self._endcard_static()
        strip = Image.new("RGBA", (W, 64), AMBER + (255,))
        ImageDraw.Draw(strip).text((490, 32), "LIMITED-TIME OFFER  ·  SERVING MIAMI", font=font(F_OSW, 42), fill=NAVY9, anchor="mm")
        self.strip = strip

    def cap_maxw(self, t):
        return 770 if t < 6.85 else 824      # the smaller card on generated shots ends at x=900

    def frame(self, i):
        t = i / FPS
        top = super().frame(i)
        if t < 6.85:   # generated shots carry no baked captions: a smaller, borderless card that leaves the dirt visible
            c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(c).rounded_rectangle([40, 1236, 900, 1500], 32, fill=NAVY9 + (224,))
            ImageDraw.Draw(c).rounded_rectangle([60, 1276, 70, 1460], 5, fill=(60, 139, 255, 255))
            c.alpha_composite(top)
        else:
            c = top
        if t < 6.85 or 13.6 <= t < 17.6:   # disclosure pill on every generated shot, above everything
            f = font("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 30)
            y = 1166 if t < 6.85 else 1206      # before/after: above the "Before."/"After." label
            w = int(f.getlength("Dramatization.")) + 36
            ImageDraw.Draw(c).rounded_rectangle([72, y, 72 + w, y + 50], 25, fill=(0, 0, 0, 140))
            ImageDraw.Draw(c).text((72 + 18, y + 25), "Dramatization.", font=f, fill=(255, 255, 255, 235), anchor="lm")
        return c

    def flashes(self):
        return [(10.95, 0.4, 0.04, 0.12), (CARD97[0], 0.8, 0.04, 0.18)]


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
    off = f"gte(t,{OFFER_T:.3f})+between(t,{CARD97[0]:.3f},{CARD97[1]:.3f})+between(t,13.600,{CARD97[0]:.3f})+lt(t,6.850)"
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
    t.append(f"0.15*between(TT,{CARD97[0]:.3f},{CARD97[0] + 0.25:.3f})*pow(1-(TT-{CARD97[0]:.3f})/0.25,3)")
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
    for ct in PUNCH_CUTS + [ALLERGENS_PUNCH, END_T]:
        add(whoosh, ct - 0.2, 0.16)
    add(thump, CARD97[0], 0.4); add(ding, CARD97[0] + 0.02, 0.22)
    for ct in CHECKS:
        add(tick, ct, 0.3)
    add(whoosh, 15.6 - 0.15, 0.2)            # the before/after wipe
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
