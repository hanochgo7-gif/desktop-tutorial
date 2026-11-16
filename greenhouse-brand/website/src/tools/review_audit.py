"""Every request in all of Merav's review emails (docs/reviews/merav-*.txt), latest per text number, against the site now.
Run after every round and before reporting a round as done (lesson from 16 Nov 2026):

    python3 src/build.py && python3 src/tools/review_audit.py

Lists edits whose wording is not live, removals whose exact text is still a text on the site (identical texts share one
number, so a removal must reach every place that text appears), and every note, to check one by one (picture notes by eye)."""
import json, re, sys, unicodedata
from pathlib import Path
W = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(W / "src/tools"))
from apply_review import parse
norm = lambda s: re.sub(r"[\"'״׳“”]", "", re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or ""))).strip()
D = json.loads((W / "public/text-review/data.js").read_text(encoding="utf-8")[len("window.TEXTS = "):].rstrip().rstrip(";"))
by = {it["id"]: it for it in D["items"]}
pages = norm("\n".join(re.sub(r"<[^>]+>", " ", p.read_text(encoding="utf-8")) for p in (W / "public/he").glob("*.html")))
latest, notes, adds_all, others = {}, [], [], []
for f in sorted((W / "docs/reviews").glob("merav-*.txt")):
    items, adds, other = parse(f.read_text(encoding="utf-8"))
    for i, it in items.items():
        if it["new"] or it["del"]:
            latest[i] = (f.stem[6:], it)
        if it["note"]:
            notes.append((f.stem[6:], i, it["note"], by.get(i, {}).get("he", "(gone)")))
    adds_all += [(f.stem[6:], a) for a in adds]
    others += [(f.stem[6:], o) for o in other]
ok = 0; look = []
for i, (src, it) in sorted(latest.items()):
    cur = by.get(i)
    if it["del"]:
        same = [x for x in D["items"] if norm(x["he"]) == norm(it["old"])]
        if same: look.append((i, src, "REMOVAL: THE SAME TEXT IS STILL ON THE SITE", f'{it["old"][:60]} at {same[0].get("paths")}'))
        else: ok += 1
        continue
    if cur and norm(cur["he"]) == norm(it["new"]): ok += 1
    elif norm(it["new"]) in pages: ok += 1
    else: look.append((i, src, "EDIT NOT LIVE", f"she: {it['new'][:110]} || now: {cur['he'][:110] if cur else '(gone)'}"))
print("requests (latest per id):", len(latest), " live/done:", ok, " to look at:", len(look))
for x in look: print(" #%s [%s] %s: %s" % x)
print("\nNOTES:", len(notes))
for s, i, n, cur in notes: print(f" [{s}] #{i}: {n[:230]}\n      text now: {cur[:90]}")
print("\nADDS:", len(adds_all))
for s, a in adds_all: print(f" [{s}]", json.dumps(a, ensure_ascii=False)[:300])
print("\nOTHER:", others[:20])
