"""Texts published from the editor's publish button go live at once, in the built pages only. This pulls them into
content.py, the source of truth, so the next build and deploy keep them (Hanoch, 12 Nov 2026).

    python3 src/tools/pull_published.py          # shows what is not in content.py yet
    python3 src/tools/pull_published.py --write  # writes it into content.py (Hebrew); the English needs a translation

The log is public/published/log.json on the live site: [{"id", "old", "new", "at", "by"}], newest last."""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
CONTENT = SRC / "content.py"
LOG_URL = "https://miftah-site.vercel.app/published/log.json"
LOCAL = SRC.parent / "public/published/log.json"


def lit(s, q='"'):
    return s.replace("\\", "\\\\").replace(q, "\\" + q)


def fetch():
    try:
        with urllib.request.urlopen(LOG_URL + "?t=now", timeout=20) as r:
            return json.loads(r.read() or b"[]")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return []
        raise
    except Exception as e:  # offline: say so loudly, never pretend there is nothing
        print(f"WARNING: could not read the published log ({e}). Texts published from the editor may be missing from content.py.")
        return None


def main(write=False):
    log = fetch()
    if log is None:
        return 0
    src = CONTENT.read_text(encoding="utf-8")
    todo, done = [], 0
    for e in log:
        old, new = e["old"].strip(), e["new"].strip()
        po, pn = '"' + lit(old) + '"', '"' + lit(new) + '"'
        if po in src:
            todo.append(e)
            if write:
                src = src.replace(po, pn)
        elif pn in src:
            done += 1
        else:
            print(f"#{e['id']}: neither the old nor the new wording is a whole string in content.py; merge by hand: {old[:60]} -> {new[:60]}")
    if write and todo:
        CONTENT.write_text(src, encoding="utf-8")
    if log:
        LOCAL.parent.mkdir(parents=True, exist_ok=True)
        LOCAL.write_text(json.dumps(log, ensure_ascii=False, indent=0), encoding="utf-8")  # the next deploy carries the log forward
    for e in todo:
        print(f"{'merged' if write else 'to merge'} #{e['id']} ({e.get('at', '')}): {e['old'][:50]} -> {e['new'][:50]}  [English needs a translation]")
    print(f"published texts: {len(log)}; already in content.py: {done}; {'merged now' if write else 'waiting'}: {len(todo)}")
    return len(todo)


if __name__ == "__main__":
    main(write="--write" in sys.argv)
