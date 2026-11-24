#!/usr/bin/env python3
"""Generate the English mirror (en/) of the Hebrew site.

Run from anywhere (paths are resolved relative to this file):

    python3 tools/en/gen.py                 # writes en/<page>
    python3 tools/en/gen.py --out /tmp/x    # writes /tmp/x/<page> (for checking)
    python3 tools/en/gen.py --list-missing  # print every untranslated string

Inputs, all next to this file:
    dict.json   exact Hebrew -> English strings (keys are whitespace-normalised)
    ld.json     JSON-LD / cutaway-data strings and the hand-written index block
    legal/*.html  English <main> for privacy, terms and accessibility

Requires BeautifulSoup:  pip install beautifulsoup4
"""
import argparse
import json
import posixpath
import re
import sys
from pathlib import Path
from urllib.parse import quote

try:
    from bs4 import BeautifulSoup, Comment, NavigableString, Tag
    from bs4.element import TemplateString
except ImportError:  # pragma: no cover
    sys.exit("BeautifulSoup is missing: pip install beautifulsoup4")

TOOL = Path(__file__).resolve().parent
ROOT = TOOL.parent.parent
SITE = "https://gotovski.co.il/"

PAGES = [
    "index.html", "about.html", "projects.html", "contact.html", "story.html",
    "articles.html", "gallery.html", "privacy.html", "terms.html",
    "accessibility.html", "404.html",
    "services/station-construction.html", "services/station-renovation.html",
    "services/gas-stations.html", "services/fuel-piping.html",
    "services/earthworks.html", "services/data-center.html",
    "articles/data-center-generator-farm.html",
    "articles/environment-protection.html",
    "articles/gas-station-construction-process.html",
    "articles/fuel-station-environmental-standards.html",
]
# English pages maintained by hand (not generated here) that links may point to.
OTHER_EN_PAGES = ["services/data-center-360.html"]
# Folders whose content has an English copy under en/.
EN_DIRS = ("sim/", "tour/")
LEGAL = {"privacy.html", "terms.html", "accessibility.html"}

URL_ATTRS = ("href", "src", "poster", "action", "data-full", "data-video",
             "data-src", "data-bg-src")
SRCSET_ATTRS = ("srcset", "imagesrcset")
TEXT_ATTRS = ("alt", "aria-label", "title", "placeholder", "data-cap",
              "data-caption", "data-sub", "value", "label", "content")
SKIP_TEXT_IN = ("script", "style")

WA_PREFIX = "https://wa.me/972502703674?text="
WA_HE = "שלום עוזי, מדבר ____ . מתי תהיה פנוי לשיחה?"
WA_EN = "Hello, this is ____. When would be a good time to talk?"

TEXT_TYPES = (NavigableString, TemplateString)  # not comments/scripts/doctype
HEB = re.compile(r"[֐-׿]")


def norm(s):
    return " ".join(s.split())


def has_he(s):
    return bool(s) and bool(HEB.search(s))


def page_url(page, en):
    """Absolute URL of a page (index.html -> folder URL)."""
    path = page[:-len("index.html")] if page.endswith("index.html") else page
    return SITE + ("en/" if en else "") + path


class Translator:
    def __init__(self, strings, ld):
        self.strings = strings
        self.ld = ld
        self.missing = []  # (page, where, text)
        self.page = None

    def text(self, s, where):
        key = norm(s)
        if key in self.strings:
            return self.strings[key]
        self.missing.append((self.page, where, key))
        return None

    def ld_value(self, v, where):
        if isinstance(v, str):
            if v in self.ld["strings"]:
                return self.ld["strings"][v]
            if v.startswith(SITE):
                return fix_url(v, "index.html")  # page URLs -> their /en/ URL
            if has_he(v):
                self.missing.append((self.page, where, v))
            return v
        if isinstance(v, list):
            return [self.ld_value(x, where) for x in v]
        if isinstance(v, dict):
            return {k: self.ld_value(x, where) for k, x in v.items()}
        return v


# ---------------------------------------------------------------- structure

def is_en_target(path):
    """True when a root-relative path has an English copy under en/."""
    bare = re.split(r"[?#]", path, 1)[0]
    if bare in PAGES or bare in OTHER_EN_PAGES or bare.startswith(EN_DIRS):
        return True
    return (ROOT / "en" / bare).is_file() if bare.endswith(".html") else False


def split_suffix(u):
    """'a/b.html?x#y' -> ('a/b.html', '?x#y')."""
    m = re.match(r"([^?#]*)(.*)$", u, re.S)
    return m.group(1), m.group(2)


def fix_url(url, page):
    """Rewrite one URL from the Hebrew page so it works from en/<page>.

    Links to pages that have an English copy (and anything under sim/ or tour/)
    point into en/; every other relative path (css/, js/, images/, fonts/,
    vendor/, docs/, video/ ...) goes back to the root with an extra ../.
    Absolute links to a page of this site are switched to its /en/ URL.
    """
    u = url.strip()
    if u.startswith(SITE):
        rest, suffix = split_suffix(u[len(SITE):])
        target = rest + "index.html" if rest == "" or rest.endswith("/") else rest
        if is_en_target(target):
            return SITE + "en/" + rest + suffix
        return url
    if (not u or u.startswith(("#", "/", "data:", "mailto:", "tel:", "javascript:"))
            or re.match(r"^[a-z][a-z0-9+.-]*:", u, re.I)):
        return url
    path, suffix = split_suffix(u)
    base = posixpath.dirname(page)
    resolved = posixpath.normpath(posixpath.join(base, path))
    if resolved.startswith("../"):
        return url
    slash = "/" if path.endswith("/") else ""
    if is_en_target(resolved):
        rel = posixpath.relpath(resolved, base or ".")
        return (rel + slash if rel != "." else "./") + suffix
    return "../" + url


def fix_srcset(value, page):
    parts = []
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        bits = item.split(None, 1)
        bits[0] = fix_url(bits[0], page)
        parts.append(" ".join(bits))
    return ", ".join(parts)


def fix_paths(soup, page):
    for meta in soup.find_all("meta", attrs={"http-equiv": re.compile("^refresh$", re.I)}):
        m = re.match(r"(\s*\d+\s*;\s*url=)(.*)$", meta.get("content", ""), re.I | re.S)
        if m:
            meta["content"] = m.group(1) + fix_url(m.group(2), page)
    for tag in soup.find_all(True):
        for a in URL_ATTRS:
            if a in tag.attrs and isinstance(tag[a], str):
                tag[a] = fix_url(tag[a], page)
        for a in SRCSET_ATTRS:
            if a in tag.attrs:
                tag[a] = fix_srcset(tag[a], page)


def normalise_whitespace(soup):
    """Whitespace-only text between tags collapses to a single newline."""
    for s in list(soup.find_all(string=True)):
        if type(s) in TEXT_TYPES and not s.strip() and "\n" in s:
            if s.parent is not None and s.parent.name in ("pre", "textarea"):
                continue
            s.replace_with("\n")


def prepare(page, soup):
    """All page changes except translation of text/attributes."""
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        c.extract()

    if page in LEGAL:
        # The file holds the English <main> (plus the whitespace around it).
        legal = BeautifulSoup((TOOL / "legal" / page).read_text("utf-8"), "html.parser")
        soup.find("main").replace_with(*list(legal.contents))

    html = soup.find("html")
    html["lang"] = "en"
    html["dir"] = "ltr"

    # Language switch: drop the Hebrew page's EN link, add a link back to Hebrew.
    for a in soup.select("a.navpill__lang"):
        a.decompose()
    depth = page.count("/") + 1
    for logo in soup.select("a.navpill__logo"):
        sw = soup.new_tag("a", attrs={
            "class": "navpill__lang", "href": "../" * depth + page,
            "lang": "he", "dir": "rtl", "aria-label": "עברית"})
        sw.string = "עב"
        logo.insert_after(sw)

    wa_he = WA_PREFIX + quote(WA_HE, safe="")
    wa_en = WA_PREFIX + quote(WA_EN, safe="")
    for a in soup.find_all(href=wa_he):
        a["href"] = wa_en

    for a in soup.find_all("a", href=re.compile(r"docs/gotovski-profile-he\.pdf$")):
        a["href"] = a["href"].replace("gotovski-profile-he.pdf",
                                      "gotovski-capability-statement.pdf")
        a["download"] = "S-Gotovski-Capability-Statement.pdf"

    fix_paths(soup, page)

    head = soup.find("head")
    if head:
        m = head.find("meta", property="og:locale")
        if m:
            m["content"] = "en_US"
        url = page_url(page, True)
        c = head.find("link", rel="canonical")
        if c:
            c["href"] = url
        m = head.find("meta", property="og:url")
        if m:
            m["content"] = url
        for l in head.find_all("link", rel="alternate", hreflang=True):
            l.extract()
        for lang, href in (("he", page_url(page, False)), ("en", url),
                           ("x-default", page_url(page, False))):
            head.append(soup.new_tag("link", attrs={"rel": "alternate", "hreflang": lang,
                                                    "href": href}))
    normalise_whitespace(soup)


def translate(page, soup, tr):
    tr.page = page
    for i, sc in enumerate(soup.find_all("script", type="application/ld+json")):
        raw = sc.string or ""
        data = json.loads(raw)
        if page == "index.html" and data.get("@type") == "GeneralContractor":
            sc.string = tr.ld["index_general_contractor"]
            continue
        sc.string = json.dumps(tr.ld_value(data, "ld+json"), ensure_ascii=False)
    for sc in soup.select("script[data-cut-data]"):
        data = json.loads(sc.string)
        sc.string = json.dumps(tr.ld_value(data, "cut-data"), ensure_ascii=False)

    for s in list(soup.find_all(string=True)):
        if type(s) not in TEXT_TYPES or not has_he(s):
            continue
        if s.parent is not None and s.parent.name in SKIP_TEXT_IN:
            continue
        if s.parent is not None and s.parent.get("lang") == "he":
            continue  # intentionally Hebrew (the language switch)
        en = tr.text(s, "text")
        if en is not None:
            lead = s[:len(s) - len(s.lstrip())]
            trail = s[len(s.rstrip()):]
            s.replace_with(lead + en + trail)

    for tag in soup.find_all(True):
        if tag.get("lang") == "he":
            continue
        for a in TEXT_ATTRS:
            v = tag.get(a)
            if isinstance(v, str) and has_he(v):
                en = tr.text(v, "@" + a)
                if en is not None:
                    tag[a] = en


def postprocess(out):
    out = out.replace("images/sim-datacenter", "images/sim-datacenter-en")
    out = out.replace("images/sim-datacenter-en-en", "images/sim-datacenter-en")
    out = out.replace('<label for="f-phone">phone', '<label for="f-phone">Phone')
    out = out.replace("docs/gotovski-profile-he.pdf", "docs/gotovski-capability-statement.pdf")
    out = out.replace("PDF · 0.6MB", "PDF · 0.5MB")
    return out


def build(page, tr):
    src = (ROOT / page).read_text("utf-8")
    soup = BeautifulSoup(src, "html.parser")
    prepare(page, soup)
    translate(page, soup, tr)
    return postprocess(str(soup))


def load_translator():
    strings = json.loads((TOOL / "dict.json").read_text("utf-8"))
    ld = json.loads((TOOL / "ld.json").read_text("utf-8"))
    return Translator(strings, ld)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", help="output folder (default: <repo>/en)")
    ap.add_argument("--list-missing", action="store_true",
                    help="print every untranslated string")
    ap.add_argument("pages", nargs="*", help="only these pages (default: all)")
    args = ap.parse_args(argv)
    out_dir = Path(args.out).resolve() if args.out else ROOT / "en"
    tr = load_translator()
    for page in args.pages or PAGES:
        html = build(page, tr)
        dest = out_dir / page
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html, "utf-8")
    print(f"wrote {len(args.pages or PAGES)} pages to {out_dir}")
    print(f"untranslated strings: {len(tr.missing)}")
    if args.list_missing:
        for page, where, text in tr.missing:
            print(f"  {page} [{where}] {text}")
    return 1 if tr.missing else 0


if __name__ == "__main__":
    sys.exit(main())
