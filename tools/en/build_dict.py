#!/usr/bin/env python3
"""Rebuild dict.json, ld.json and legal/*.html from the current en/ pages.

Each Hebrew page is run through gen.prepare() (every change except translation)
and then walked in parallel with the existing English page. Text nodes,
translatable attributes, JSON-LD values and cutaway JSON values are paired.

Use it only to re-sync the inputs after hand-editing en/ pages; the normal
workflow is to edit dict.json and run gen.py.

    python3 tools/en/build_dict.py
"""
import json
import sys
from collections import defaultdict

sys.dont_write_bytecode = True

from bs4 import BeautifulSoup, Tag  # noqa: E402

import gen  # noqa: E402

TOOL, ROOT = gen.TOOL, gen.ROOT
# "phone" is lower-case in the dictionary; gen.postprocess() capitalises the
# contact-form label ('<label for="f-phone">phone' -> 'Phone').
KNOWN_CONFLICTS = {"טלפון": "phone"}


def unfix(v, page):
    """Inverse of gen.fix_url for the legal <main> blocks."""
    if v.startswith("../") and gen.fix_url(v[3:], page) == v:
        return v[3:]
    if gen.fix_url(v, page) == v:
        return v
    raise ValueError(f"cannot reverse path {v!r} in {page}")


def extract_legal():
    (TOOL / "legal").mkdir(exist_ok=True)
    for page in sorted(gen.LEGAL):
        en = BeautifulSoup((ROOT / "en" / page).read_text("utf-8"), "html.parser")
        main = en.find("main")
        for tag in [main] + main.find_all(True):
            for a in gen.URL_ATTRS:
                if isinstance(tag.get(a), str):
                    tag[a] = unfix(tag[a], page)
            for a in gen.SRCSET_ATTRS:
                if a in tag.attrs:
                    tag[a] = ", ".join(
                        " ".join([unfix(i.split(None, 1)[0], page)] + i.split(None, 1)[1:])
                        for i in (x.strip() for x in tag[a].split(",")) if i)
        (TOOL / "legal" / page).write_text(" " + str(main) + "\n", "utf-8")


def kids(tag):
    out = []
    for c in tag.children:
        if isinstance(c, Tag):
            out.append(c)
        elif type(c) in gen.TEXT_TYPES and c.strip():
            out.append(c)
    return out


class Collector:
    def __init__(self):
        self.text = defaultdict(set)
        self.ld = defaultdict(set)
        self.problems = []

    def walk(self, he, en, page, path="html"):
        a, b = kids(he), kids(en)
        shape = lambda xs: [x.name if isinstance(x, Tag) else "#t" for x in xs]
        if shape(a) != shape(b):
            self.problems.append(f"{page}: structure differs at {path}: "
                                 f"{shape(a)[:12]} vs {shape(b)[:12]}")
            return
        for x, y in zip(a, b):
            if isinstance(x, Tag):
                self.attrs(x, y, page)
                if x.name in gen.SKIP_TEXT_IN:
                    continue
                self.walk(x, y, page, f"{path}>{x.name}")
            else:
                if gen.has_he(x) and x.parent.get("lang") != "he":
                    self.text[gen.norm(x)].add(y.strip())

    def attrs(self, x, y, page):
        if x.get("lang") == "he":
            return
        for a in gen.TEXT_ATTRS:
            v = x.get(a)
            if isinstance(v, str) and gen.has_he(v):
                if a not in y.attrs:
                    self.problems.append(f"{page}: <{x.name} {a}> missing in English")
                else:
                    self.text[gen.norm(v)].add(y[a])

    def json_pair(self, h, e, page):
        if isinstance(h, str):
            if h.startswith(gen.SITE) and gen.fix_url(h, "index.html") == e:
                return  # handled by the URL rule in gen.py
            if h != e:
                self.ld[h].add(e if isinstance(e, str) else json.dumps(e))
        elif isinstance(h, list) and isinstance(e, list) and len(h) == len(e):
            for p, q in zip(h, e):
                self.json_pair(p, q, page)
        elif isinstance(h, dict) and isinstance(e, dict) and h.keys() == e.keys():
            for k in h:
                self.json_pair(h[k], e[k], page)
        elif h != e:
            self.problems.append(f"{page}: JSON shape differs: {str(h)[:60]} vs {str(e)[:60]}")


def main():
    extract_legal()
    col = Collector()
    index_block = None
    for page in gen.PAGES:
        he = BeautifulSoup((ROOT / page).read_text("utf-8"), "html.parser")
        gen.prepare(page, he)
        en = BeautifulSoup((ROOT / "en" / page).read_text("utf-8"), "html.parser")
        col.walk(he.find("html"), en.find("html"), page)
        hs = he.find_all("script", type="application/ld+json")
        es = en.find_all("script", type="application/ld+json")
        for h, e in zip(hs, es):
            hd = json.loads(h.string)
            if page == "index.html" and hd.get("@type") == "GeneralContractor":
                index_block = e.string
                continue
            col.json_pair(hd, json.loads(e.string), page)
        for h, e in zip(he.select("script[data-cut-data]"), en.select("script[data-cut-data]")):
            col.json_pair(json.loads(h.string), json.loads(e.string), page)

    def pick(d, label):
        out = {}
        for k in sorted(d):
            vals = sorted(d[k])
            if k in KNOWN_CONFLICTS and KNOWN_CONFLICTS[k] in vals:
                vals = [KNOWN_CONFLICTS[k]]
            if len(vals) > 1:
                col.problems.append(f"{label} conflict for {k!r}: {vals}")
            out[k] = vals[0]
        return out

    strings = pick(col.text, "text")
    ld = {"strings": pick(col.ld, "ld"), "index_general_contractor": index_block}
    (TOOL / "dict.json").write_text(
        json.dumps(strings, ensure_ascii=False, indent=1) + "\n", "utf-8")
    (TOOL / "ld.json").write_text(json.dumps(ld, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(f"dict.json: {len(strings)} strings, ld.json: {len(ld['strings'])} strings")
    for p in col.problems:
        print("PROBLEM:", p)
    return 1 if col.problems else 0


if __name__ == "__main__":
    sys.exit(main())
