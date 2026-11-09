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


IDS = SRC / "data/text-review-ids.json"    # content.py path -> id, so an owner's saved progress and the ids in her emails stay valid
BASE = SRC / "data/text-review-base.json"  # id -> the text the owners first saw, to show what changed since
REVIEWS = SRC.parent / "docs/reviews"       # the owners' emails, kept as sent
HELD = {  # changes she asked for that wait for a decision (ledger 7b)
    350: "הנתונים בטבלה עדיין מ-2015, ולכן הכותרת נשארת 2015 עד שיגיעו הנתונים המעודכנים והפרויקטים בפורטוגל.",
    **{i: "שאלות במקום כרטיסי ״מי אתם״ דורשות לבנות מחדש את השלב הזה בטופס. ממתין לאישור של חנוך." for i in range(406, 414)},
}
REPLY = {
    1: "שם החברה מופיע עכשיו עם הסלוגן בשתי השפות, באותו גופן ובאותו משקל.",
    47: "אין לנו עדיין צילום אמיתי של המפעל. צילום או סרטון קצר משם יחזק מאוד את השורה הזו.",
    49: "במקום ״7״ כתוב עכשיו ״מדינות בעולם״. אם בפריקה יש מדינה מסוימת, עדיף לכתוב אותה.",
    350: "הכותרת נשארת 2015 עד שיגיעו נתונים מעודכנים.",
    359: "אפשר להוסיף קישור או ציטוט, ברגע שהלקוח מאשר בכתב.",
    361: "מעולה. כשיהיו אישורים, נוסיף את השמות.",
    434: "זו השורה הראשונה ברשימת גודל השטח בטופס. שינינו ל״בחרו את גודל השטח״.",
    435: "המינימום (50 דונם בארץ, 300 בחו״ל) מופיע בכמה עמודים ובטופס. להוריד מכל האתר? ממתין לאישור.",
}


def reviews():
    """{id: {"new": text or None, "note": text or None}} from the owners' emails, oldest first (a later email wins)."""
    out = {}
    for f in sorted(REVIEWS.glob("*.txt")) if REVIEWS.exists() else []:
        cur, key = None, None
        for line in f.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\[#(\d+)\]", line)
            if m:
                cur = out.setdefault(int(m.group(1)), {"new": None, "note": None}); key = None; continue
            if cur is None or line.startswith("====") or line.startswith("(נוצר"):
                cur = None if line.startswith("====") or line.startswith("(נוצר") else cur; continue
            if line.startswith("היום: "):
                key = None
            elif line.startswith("חדש: "):
                key = "new"; cur["new"] = line[5:]
            elif line.startswith("הערה: "):
                key = "note"; cur["note"] = line[6:]
            elif key and line.strip():
                cur[key] += " " + line.strip()
    return out


def flags(items):
    ids = json.loads(IDS.read_text(encoding="utf-8")) if IDS.exists() else {}
    if not ids and (OUT / "data.js").exists():  # first run: take the ids of the page the owners already use
        old = json.loads((OUT / "data.js").read_text(encoding="utf-8")[len("window.TEXTS = "):].rstrip().rstrip(";"))
        for it in old["items"]:
            for p in it["paths"]:
                ids[p] = it["id"]
        BASE.write_text(json.dumps({it["id"]: it["he"] for it in old["items"]}, ensure_ascii=False, indent=0), encoding="utf-8")
    base = {int(k): v for k, v in json.loads(BASE.read_text(encoding="utf-8")).items()} if BASE.exists() else {}
    taken, nxt = set(), max(list(ids.values()) + [0]) + 1
    for it in sorted(items, key=lambda x: min([ids.get(p, 10 ** 9) for p in x["paths"]])):
        c = sorted(ids[p] for p in it["paths"] if p in ids and ids[p] not in taken)
        if c:
            it["id"] = c[0]
        else:
            it["id"] = nxt; nxt += 1
        taken.add(it["id"])
        for p in it["paths"]:
            ids.setdefault(p, it["id"])
    IDS.write_text(json.dumps(ids, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    rv = reviews()
    for it in items:
        i = it["id"]; it["v"] = hashlib.sha1(it["he"].encode()).hexdigest()[:6]
        r = rv.get(i)
        if r and r["new"] and i not in HELD:
            it["m"] = 1              # she wrote this text; it is on the site
        if r and r["new"]:
            it["sent"] = r["new"]    # what she sent, so the same change is not sent twice
        if r and r["note"]:
            it["note"] = r["note"]   # her note, already sent
        if i in HELD:
            it["held"] = HELD[i]
        if i in REPLY:
            it["reply"] = REPLY[i]
        if i not in base:
            it["nw"] = 1             # a text that did not exist when she started
        elif base[i] != it["he"] and not it.get("m"):
            it["was"] = base[i]      # changed after her answers: she should approve it


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
    flags(items)
    groups = [("upd", "מה התעדכן בעקבות התשובות שלך", False), ("site", "בכל האתר: תפריט, תחתית ופס יצירת קשר", False)] + [(s, nm, s in OPTIONAL) for s, nm in PAGES] + \
             [("more", "הודעות ותוויות שמופיעות רק במצבים מסוימים (טופס, שגיאות)", True)]
    order = {g: i for i, (g, _, _) in enumerate(groups)}
    items.sort(key=lambda it: (order[it["g"]], "vgh".index(it["kind"]), it["pos"], it["id"]))
    used = {it["g"] for it in items} | ({"upd"} if any(it.get("was") or it.get("nw") for it in items) else set())
    general = ""
    for f in sorted(REVIEWS.glob("*.txt")) if REVIEWS.exists() else []:
        m = re.search(r"הערה כללית:\n(.*?)\n\n", f.read_text(encoding="utf-8"), re.S)
        if m:
            general = m.group(1).strip()
    import datetime
    vals = {"{phone}": C.SITE["phone_display"][1], "{y}": str(datetime.date.today().year)}  # what the automatic parts show, so search finds them
    data = {"site": SITE, "sentGeneral": general, "vals": vals, "groups": [{"id": g, "name": nm, "optional": opt, "url": (f"{SITE}/he/{g}.html" if g not in ("site", "more", "globe", "index") else
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
    # the live editor (/site-editor/): the same texts, edited on the pages themselves
    ed_out = PUB / "site-editor"; ed_out.mkdir(exist_ok=True)
    ed = (SRC / "site-editor/editor.js").read_text(encoding="utf-8")
    (ed_out / "editor.js").write_text(ed, encoding="utf-8")
    ve = hashlib.sha1((js + ed).encode()).hexdigest()[:8]
    (ed_out / "index.html").write_text((SRC / "site-editor/index.html").read_text(encoding="utf-8").replace("{LOGO}", logo).replace("{V}", ve), encoding="utf-8")
    by = {}
    for it in items:
        by[it["g"]] = by.get(it["g"], 0) + 1
    print(len(items), "texts;", by)


if __name__ == "__main__":
    main()
