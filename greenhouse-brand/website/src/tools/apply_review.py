"""Applies an owner's review email (from /site-editor/ or /text-review/) to content.py.

    python3 src/tools/apply_review.py docs/reviews/<file>.txt          # dry run: what would change
    python3 src/tools/apply_review.py docs/reviews/<file>.txt --write  # change content.py, then run build.py

Text changes ("חדש:") are applied where the old text is a whole string in content.py (every place it appears, so the
same text stays the same across the site). Anything else is listed for a person to do by hand: removals, new
headings and paragraphs, notes, and texts built from several pieces. Engineering wording still needs Yiftach."""
import json
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
CONTENT = SRC / "content.py"
IDS = SRC / "data/text-review-ids.json"


def parse(text):
    items, adds, other, cur, key = {}, [], [], None, None
    for line in text.splitlines():
        m = re.match(r"\[#(\d+)\]\s*(.*)", line)
        if m:
            cur = items.setdefault(int(m.group(1)), {"label": m.group(2), "old": None, "new": None, "note": None, "del": False}); key = None; continue
        if line.startswith("[+]"):
            cur = {"where": line[3:].strip(), "text": "", "note": None}; adds.append(cur); key = None; continue
        if line.startswith("===="):
            cur = None; key = None; continue
        if cur is None:
            if line.strip() and not line.startswith("("):
                other.append(line)
            elif line.startswith("(") and "נוצר" not in line:
                other.append(line)
            continue
        for tag, k in (("היום: ", "old"), ("חדש: ", "new"), ("הערה: ", "note"), ("טקסט: ", "text")):
            if line.startswith(tag):
                cur[k] = line[len(tag):]; key = k; break
        else:
            if line.startswith("להוריד:"):
                cur["del"] = True; key = None
            elif key and line.strip():
                cur[key] += " " + line.strip()
            elif not line.strip():
                key = None
    return items, adds, other


def lit(s, q):
    return s.replace("\\", "\\\\").replace(q, "\\" + q)


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    text = Path(sys.argv[1]).read_text(encoding="utf-8")
    write = "--write" in sys.argv
    items, adds, other = parse(text)
    src = CONTENT.read_text(encoding="utf-8")
    sys.path.insert(0, str(SRC / "tools"))
    from text_review import HELD  # noqa: E402 - changes waiting for a decision (ledger 7b)
    done, manual, live, gone = [], [], [], []
    for i, it in sorted(items.items()):
        if it["new"] and i in HELD:
            manual.append(f"#{i} held, not applied: {HELD[i]}")
            continue
        if it["new"] and any(q + lit(it["new"].strip(), q) + q in src for q in ('"', "'")) and not any(q + lit((it["old"] or "").strip(), q) + q in src for q in ('"', "'")):
            live.append(f"#{i}")
            continue
        if it["new"] and it["old"] and it["new"].strip() != it["old"].strip():
            old, new, n = it["old"].strip(), it["new"].strip(), 0
            for q in ('"', "'"):
                pat = q + lit(old, q) + q
                c = src.count(pat)
                if c:
                    src = src.replace(pat, q + lit(new, q) + q); n += c
            if n:
                done.append(f"#{i} {'(' + str(n) + ' places) ' if n > 1 else ''}{old[:60]} -> {new[:60]}")
            elif old in src:
                manual.append(f"#{i} part of a longer string in content.py, edit by hand: {old[:70]} -> {new[:70]}")
            else:
                gone.append(f"#{i}")
        if it["del"]:
            manual.append(f"#{i} remove from the site: {it['old'][:80] if it['old'] else ''}")
        if it["note"]:
            manual.append(f"#{i} note: {it['note']}")
    for a in adds:
        manual.append(f"add {a['where']}: {a['text']}" + (f"  (note: {a['note']})" if a["note"] else ""))
    for o in other:
        manual.append("note: " + o)
    if live:
        print(f"already on the site: {len(live)} ({', '.join(live[:12])}{'…' if len(live) > 12 else ''})")
    if gone:
        print(f"old text no longer in content.py (changed since, check by eye): {len(gone)} ({', '.join(gone[:12])}{'…' if len(gone) > 12 else ''})")
    print(f"text changes applied: {len(done)}")
    for d in done:
        print("  ✓", d)
    print(f"to do by hand: {len(manual)}")
    for m in manual:
        print("  •", m)
    if write and done:
        CONTENT.write_text(src, encoding="utf-8")
        print("content.py updated. Now run: python3 src/build.py")
    elif done:
        print("(dry run: add --write to change content.py)")


if __name__ == "__main__":
    main()
