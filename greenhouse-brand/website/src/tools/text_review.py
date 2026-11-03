"""Builds the text-review page for the owners: every Hebrew text on the site, page by page, in the order a visitor reads it.
Run after build.py: python3 src/tools/text_review.py  ->  public/text-review/ (noindex; not in the sitemap or the menus).
Each item keeps its place in content.py (`path`), so the changes that come back can be applied exactly."""
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
PUB = SRC.parent / "public"
OUT = PUB / "text-review"
sys.path.insert(0, str(SRC))
import content as C  # noqa: E402

HEB = re.compile(r"[֐-׿]")
SITE = "https://miftah-site.vercel.app"

# the visitor's order; the names are what Merav calls the pages
PAGES = [("index", "עמוד הבית"), ("net-houses", "בתי רשת"), ("banana-net-houses", "בתי רשת לבננות"),
         ("orchard-hail-nets", "רשתות ברד למטעים"), ("how-we-build", "כך בונים (ההדמיה)"), ("turnkey-farms", "חוות מפתח בחו״ל"),
         ("projects", "פרויקטים"), ("about", "אודות"), ("contact", "יצירת קשר"), ("profile", "פרופיל החברה (להדפסה)"),
         ("globe", "הגלובוס"), ("404", "עמוד ״הדף לא נמצא״"), ("privacy", "מדיניות פרטיות"), ("accessibility", "הצהרת נגישות")]
OPTIONAL = {"404", "privacy", "accessibility", "profile"}

TAGS = {"h1": "כותרת ראשית", "h2": "כותרת", "h3": "כותרת משנה", "h4": "כותרת משנה", "p": "פסקה", "li": "פריט ברשימה",
        "a": "קישור", "button": "כפתור", "dt": "שם שורה", "dd": "תוכן שורה", "th": "כותרת בטבלה", "td": "תא בטבלה",
        "figcaption": "כיתוב מתחת לתמונה", "label": "שם של שדה בטופס", "option": "אפשרות לבחירה", "summary": "שאלה (נפתחת בלחיצה)",
        "legend": "כותרת בטופס", "blockquote": "ציטוט", "caption": "כותרת טבלה", "span": "תווית", "small": "הערה קטנה",
        "strong": "הדגשה", "b": "הדגשה", "em": "הדגשה"}
BLOCK = set(TAGS) | {"div", "section", "header", "footer", "nav", "main", "aside", "figure", "form", "ul", "ol", "dl", "table", "tr"}
VOID = {"img", "br", "hr", "input", "meta", "link", "source", "wbr", "col", "area", "base", "embed", "param", "track"}


def norm(s):
    return re.sub(r"\s+", " ", s.replace("⁦", "").replace("⁩", "").replace(" ", " ")).strip()


class Page(HTMLParser):
    """Visible text in blocks (tag, inside header/footer?), plus the texts nobody sees on screen (title, description, alt, aria)."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.blocks, self.hidden, self.skip = [], [], [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and a.get("name") == "description":
            self.hidden.append(("meta", a.get("content", "")))
        for k in ("alt", "aria-label", "title", "placeholder"):
            if a.get(k):
                self.hidden.append(("placeholder" if k == "placeholder" else "alt" if k == "alt" else "aria", a[k]))
        if tag in VOID:
            return
        if tag in ("script", "style", "noscript", "svg", "template"):
            self.skip += 1
        self.stack.append((tag, a.get("class", "")))
        if tag in BLOCK or tag == "title":
            self.blocks.append([tag, a.get("class", ""), "", any(t in ("header", "footer") for t, _ in self.stack[:-1])])

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            t, _ = self.stack.pop()
            if t in ("script", "style", "noscript", "svg", "template"):
                self.skip -= 1
            if t == tag:
                break
        if tag in BLOCK or tag == "title":
            self.blocks.append(["_", "", "", False])  # text after a block closes starts a new run

    def handle_data(self, d):
        if self.skip or not self.blocks:
            return
        self.blocks[-1][2] += d


def where(slug):
    f = PUB / ("globe/index.html" if slug == "globe" else f"he/{slug}.html")
    p = Page(); p.feed(f.read_text(encoding="utf-8"))
    runs = [(t, c, norm(x), hf) for t, c, x, hf in p.blocks if norm(x)]
    return runs, [(k, norm(v)) for k, v in p.hidden]


def label(tag, cls):
    if "btn" in cls:
        return "כפתור"
    if tag == "title":
        return "כותרת בלשונית הדפדפן ובגוגל"
    return TAGS.get(tag, "טקסט")


def walk(obj, path):
    """Every Hebrew string in content.py, with how to find it again."""
    if isinstance(obj, str):
        if HEB.search(obj):
            yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f"{path}[{k!r}]")
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            yield from walk(v, f"{path}[{i}]")


def english_for(path):
    """The English twin of a (English, Hebrew) pair, shown small for reference."""
    m = re.match(r"(.*)\[1\]$", path)
    if not m:
        return ""
    try:
        v = eval("C." + m.group(1))  # noqa: S307 - our own content module
    except Exception:
        return ""
    return v[0] if isinstance(v, tuple) and len(v) == 2 and isinstance(v[0], str) and not HEB.search(v[0]) else ""


COND = {"FORM_MSG", "FORM", "FORM_BRIEF_KEYS", "FORM_OFFLINE", "GLOBE", "SIM"}  # shown only in some states (a form error, the globe's hint)
USE = "".join((SRC / f).read_text(encoding="utf-8") for f in ("assets/site.js", "assets/build-sim.js"))


def keys(path):
    return [k for k in re.findall(r"\['([a-z_0-9]+)'\]", path)][:1]


def main():
    seen = {}
    for name in [n for n in vars(C) if n.isupper()]:
        for path, s in walk(getattr(C, name), name):
            seen.setdefault(s, []).append(path)
    found = {slug: where(slug) for slug, _ in PAGES}
    items, n = [], 0
    for s, paths in seen.items():
        ns = norm(s)
        if len(ns) < 2:
            continue
        hits = []  # (page order, position in page, label, in header/footer, page, kind)
        bare = norm(re.sub(r"\{[a-z_]+\}", " ", s))
        for exact in (True, False):
            for pi, (slug, _) in enumerate(PAGES):
                runs, hidden = found[slug]
                for ri, (tag, cls, txt, hf) in enumerate(runs):
                    ok = (ns == txt) if exact else ((len(ns) > 12 and ns in txt) or ("{" in s and len(bare) > 8 and bare[:30] in txt))
                    if ok:
                        hits.append((pi, ri, label(tag, cls), hf, slug, "g" if tag == "title" else "v")); break
                else:
                    if exact:
                        for k, v in hidden:
                            if ns == v or (len(ns) > 12 and ns in v):
                                hits.append((pi, 0, {"meta": "תיאור הדף בתוצאות גוגל", "alt": "תיאור תמונה לעיוורים (לא מוצג על המסך)",
                                                     "aria": "תווית לקוראי מסך (לא מוצגת)", "placeholder": "טקסט עזר בתוך שדה"}[k], False, slug,
                                             "g" if k == "meta" else "h")); break
            if hits:
                break
        if not hits and paths[0].split("[")[0] not in COND and not any(re.search(r"\[['\"]" + re.escape(k) + r"['\"]\]", USE) for k in keys(paths[0])):
            continue  # old copy that no page shows any more
        nonhf = [h for h in hits if not h[3]]
        if len({h[4] for h in hits}) >= 5 or (hits and not nonhf):
            group, pos, lab, page, kind = "site", min(h[1] for h in hits), hits[0][2], hits[0][4], hits[0][5]
        elif nonhf:
            pi, pos, lab, _, page, kind = min(nonhf); group = PAGES[pi][0]
        else:
            group, pos, lab, page, kind = "more", 0, "הודעה שמופיעה רק במצב מסוים", "", "v"
        n += 1
        items.append({"id": n, "g": group, "pos": pos, "label": lab, "page": page, "he": s, "en": english_for(paths[0]),
                      "paths": paths, "count": len({h[4] for h in hits}), "kind": kind,
                      "ph": sorted(set(re.findall(r"\{[a-z_]+\}", s)))})
    groups = [("site", "בכל האתר: תפריט, תחתית ופס יצירת קשר", False)] + [(s, nm, s in OPTIONAL) for s, nm in PAGES] + \
             [("more", "הודעות ותוויות שמופיעות רק במצבים מסוימים (טופס, שגיאות)", True)]
    order = {g: i for i, (g, _, _) in enumerate(groups)}
    items.sort(key=lambda it: (order[it["g"]], "vgh".index(it["kind"]), it["pos"], it["id"]))
    for i, it in enumerate(items, 1):
        it["id"] = i
    used = {it["g"] for it in items}
    data = {"site": SITE, "groups": [{"id": g, "name": nm, "optional": opt, "url": (f"{SITE}/he/{g}.html" if g not in ("site", "more", "globe", "index") else
                                      f"{SITE}/globe/" if g == "globe" else f"{SITE}/he/")} for g, nm, opt in groups if g in used],
            "items": items}
    OUT.mkdir(exist_ok=True)
    js = "window.TEXTS = " + json.dumps(data, ensure_ascii=False) + ";\n"
    (OUT / "data.js").write_text(js, encoding="utf-8")
    app = (SRC / "text-review/app.js").read_text(encoding="utf-8")
    (OUT / "app.js").write_text(app, encoding="utf-8")
    v = hashlib.sha1((js + app).encode()).hexdigest()[:8]
    logo = re.search(r'<svg class="logo logo--compact".*?</svg>', (PUB / "he/index.html").read_text(encoding="utf-8"), re.S).group(0)
    logo = logo.replace('class="logo logo--compact"', 'class="logo"').replace('role="img"', 'role="img" focusable="false"')
    page = (SRC / "text-review/index.html").read_text(encoding="utf-8").replace("{LOGO}", logo).replace("{V}", v)
    (OUT / "index.html").write_text(page, encoding="utf-8")
    by = {}
    for it in items:
        by[it["g"]] = by.get(it["g"], 0) + 1
    print(len(items), "texts;", by)


if __name__ == "__main__":
    main()
