"""Original music bed for the Vantix v4 edit (112 BPM, D major). Usage: python3 music.py out.wav duration"""
import sys, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 31.12
N = int(DUR * SR)
BEAT = 60 / 112
BAR = 4 * BEAT
# section marks follow the picture edit (v4.py)
PROBLEM, BRAND, RISER, PRICE, ENDCARD, OUTRO = 2.95, 10.95, 15.6, 17.6, 24.0, 29.9
rng = np.random.default_rng(11)

CHORDS = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]]   # D  A  Bm  G
BASS = [38, 45, 47, 43]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def place(buf, sig, t, g=1.0):
    a = int(t * SR)
    if a >= len(buf):
        return
    sig = sig[: len(buf) - a]
    buf[a:a + len(sig)] += g * sig


def saw(f, n):
    ph = (np.arange(n) * f / SR) % 1.0
    return 2 * ph - 1


def adsr(n, a, r):
    e = np.ones(n)
    ia, ir = int(a * SR), int(r * SR)
    e[:ia] = np.linspace(0, 1, ia)
    e[-ir:] *= np.linspace(1, 0, ir)
    return e


def section_gain(t):
    """0..1 intensity by time"""
    return np.interp(t, [0, PROBLEM, BRAND - 0.01, BRAND, PRICE, ENDCARD, OUTRO, DUR],
                     [0.55, 0.45, 0.5, 1.0, 1.0, 0.95, 0.9, 0.0])


t_all = np.arange(N) / SR
nbars = int(np.ceil(DUR / BAR)) + 1

# ---- pad ----
pad = np.zeros(N)
for b in range(nbars):
    t0 = b * BAR
    if t0 >= DUR:
        break
    n = int((BAR + 0.5) * SR)
    sig = np.zeros(n)
    for m in CHORDS[b % 4]:
        for c in (-9, 0, 9):
            sig += saw(hz(m) * 2 ** (c / 1200), n)
    sig *= adsr(n, 0.35, 0.55) / 9
    place(pad, sig, t0)
cut = np.where(t_all < PROBLEM, 1100, np.where(t_all < BRAND, 650, 2600))
pad_lo, pad_hi, pad_mid = lp(pad, 650), lp(pad, 2600), lp(pad, 1100)
pad = np.where(t_all < PROBLEM, pad_mid, np.where(t_all < BRAND, pad_lo, pad_hi))
pad = lp(pad, 6000) * 0.55

# ---- pluck arp (8ths) ----
pl = np.zeros(N)
step = BEAT / 2
k = 0
t = 0.0
while t < OUTRO:
    b = int(t // BAR)
    ch = CHORDS[b % 4]
    notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
    m = notes[k % 4]
    if t >= BRAND or k % 2 == 0:          # sparse quarters before the brand section
        n = int(0.6 * SR)
        tt = np.arange(n) / SR
        f = hz(m)
        s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt))
        s *= np.exp(-7 * tt) * np.minimum(1, tt / 0.003)
        place(pl, s, t, 0.22 * (1.0 if t >= BRAND else 0.7))
    t += step
    k += 1
d = int(0.75 * BEAT * SR)                   # dotted-8th echo
echo = np.zeros(N)
echo[d:] += pl[:-d] * 0.35
echo[2 * d:] += pl[:-2 * d] * 0.15
pl = lp(pl + echo, 7000)

# ---- drums ----
drum = np.zeros(N)
nk = int(0.35 * SR); tk = np.arange(nk) / SR
kick = np.sin(2 * np.pi * np.cumsum(48 + 95 * np.exp(-28 * tk)) / SR) * np.exp(-9 * tk)
kick += 0.3 * np.exp(-400 * tk) * rng.standard_normal(nk) * 0.3
nc = int(0.25 * SR); tc = np.arange(nc) / SR
clap_env = sum(np.exp(-90 * np.maximum(tc - o, 0)) * (tc >= o) for o in (0, 0.011, 0.022)) * 0.6 + np.exp(-14 * tc) * 0.4
clap = bp(rng.standard_normal(nc), 900, 3200) * clap_env
nh = int(0.05 * SR); th = np.arange(nh) / SR
hat = hp(rng.standard_normal(nh), 7500) * np.exp(-70 * th)
bt = 0.0
i = 0
while bt < OUTRO:
    if bt >= BRAND:
        place(drum, kick, bt, 0.9)
        if i % 2 == 1:
            place(drum, clap, bt, 0.45)
        place(drum, hat, bt + BEAT / 2, 0.22)
        place(drum, hat, bt, 0.08)
    elif bt >= PROBLEM and i % 2 == 0:
        place(drum, kick, bt, 0.45)                 # heartbeat-like pulse under the problem
    bt += BEAT
    i += 1
place(drum, kick, OUTRO, 0.9)

# ---- bass (8th pulse in full sections, held before) ----
bass = np.zeros(N)
t = PROBLEM
while t < OUTRO + BAR:
    b = int(t / BAR + 1e-6)
    f = hz(BASS[b % 4])
    if t < BRAND:
        n = int(BAR * SR)
        tt = np.arange(n) / SR
        s = np.tanh(1.5 * np.sin(2 * np.pi * f * tt)) * adsr(n, 0.08, 0.3)
        place(bass, s, t, 0.25)
        t = min((b + 1) * BAR, BRAND) if (b + 1) * BAR > t + 1e-3 else t + BAR
    else:
        n = int(BEAT / 2 * SR)
        tt = np.arange(n) / SR
        s = np.tanh(2 * np.sin(2 * np.pi * f * tt)) * np.exp(-5 * tt) * adsr(n, 0.004, 0.03)
        if t < OUTRO:
            place(bass, s, t, 0.42)
        t += BEAT / 2
bass = lp(bass, 420)

# ---- riser into the price + crash on it ----
fx = np.zeros(N)
nr = int((PRICE - RISER) * SR); tr = np.arange(nr) / SR
noise = rng.standard_normal(nr)
riser = np.zeros(nr)
seg = nr // 16
for s in range(16):
    lo = 400 * 2 ** (s / 4)
    part = bp(noise[s * seg:(s + 1) * seg + 1], lo, min(lo * 3, 18000))
    riser[s * seg:s * seg + len(part)] = part[: nr - s * seg]
riser *= (tr / tr[-1]) ** 2
place(fx, riser, RISER, 0.35)
ncr = int(2.0 * SR); tcr = np.arange(ncr) / SR
crash = hp(rng.standard_normal(ncr), 4500) * np.exp(-2.2 * tcr)
place(fx, crash, PRICE, 0.3)
place(fx, crash, ENDCARD, 0.18)

# ---- final chord ring-out ----
n = int((DUR - OUTRO) * SR)
fin = np.zeros(n)
for m in CHORDS[0] + [CHORDS[0][0] + 12]:
    fin += np.sin(2 * np.pi * hz(m) * np.arange(n) / SR)
fin *= np.exp(-1.6 * np.arange(n) / SR) / 4
place(pad, fin, OUTRO, 0.6)

# ---- mix, reverb, master ----
g = section_gain(t_all)
music_bus = pad * g + pl * g
ir_n = int(1.4 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-4.5 * np.arange(ir_n) / SR)
ir = lp(ir, 5000) / np.sqrt((ir ** 2).sum())
wet = fftconvolve(music_bus + 0.5 * drum, ir)[:N] * 0.22
mixL = music_bus + drum + bass + fx + wet
mixR = mixL.copy()
dl = int(0.012 * SR)
mixR[dl:] = (music_bus + wet)[:-dl] + drum[dl:] + bass[dl:] + fx[dl:]   # widen pad/pluck
mix = np.stack([mixL, mixR], 1)
mix = hp(mix.T, 35).T
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) / np.tanh(1.6)
mix *= 0.89
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade[:, None]
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("music", DUR)
