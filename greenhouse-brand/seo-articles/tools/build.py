"""בונה את מרכז הידע של מיפתח: עמוד ראשי + 5 מאמרים + חבילת SEO.
כל מאמר מוגדר כ-dict במודול articles.py; התבנית כאן."""
import html, json, re, pathlib, importlib, sys

HERE = pathlib.Path(__file__).parent
OUT = HERE / "site"
SITE = "https://www.miftah.co.il"
BASE = "/articles/"
LOGO_L = (HERE / "logo_light.svg").read_text()
LOGO_D = (HERE / "logo_dark.svg").read_text()
AUTHOR = {"name": "יפתח הספל", "role": "מנכ״ל משותף, הנדסאי בניין (טכניון)",
          "bio": "יותר מעשרים שנה של תכנון, ייצור והקמה של בתי רשת ומבנים חקלאיים בגליל ובעולם, כולל פרויקט מורכב בבלארוס. אחראי על מיפוי הצרכים, התכנון ההנדסי ופיקוח הייצור והביצוע."}
PHONE = "04-9854404"

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@400;500;700&family=IBM+Plex+Mono:wght@500&display=swap">')

CSS = r"""
:root{
  /* Layout: עמוד עיתון מקצועי. עמודת קריאה אחת, תוכן עניינים דביק בצד, הדמיות ברוחב מלא */
  --paper:#F4F6F2; --surface:#FFFFFF; --ink:#13231F; --ink-2:#4A5A55; --rule:#D5DED7;
  --forest:#0E4239; --leaf:#1B6E62; --sprout:#7FC49B; --sky:#4F86A8; --amber:#C98A2B;
  --tint:#E6EFE8; --on-forest:#F4F6F2; --on-forest-2:#B9D3C4;
  --display:'Frank Ruhl Libre','David Libre',Georgia,serif;
  --body:'Heebo','Assistant',Arial,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#0D1715; --surface:#13201D; --ink:#E6EEE9; --ink-2:#A6B8B0; --rule:#26372F;
  --forest:#0A3029; --leaf:#5FB39B; --sprout:#8FD3AA; --sky:#7FB0D0; --amber:#E0A84E;
  --tint:#18302A; --on-forest:#EAF2ED; --on-forest-2:#9FC2B0; color-scheme:dark}}
:root[data-theme="dark"]{
  --paper:#0D1715; --surface:#13201D; --ink:#E6EEE9; --ink-2:#A6B8B0; --rule:#26372F;
  --forest:#0A3029; --leaf:#5FB39B; --sprout:#8FD3AA; --sky:#7FB0D0; --amber:#E0A84E;
  --tint:#18302A; --on-forest:#EAF2ED; --on-forest-2:#9FC2B0; color-scheme:dark}
*{box-sizing:border-box}
html{direction:rtl}
body{background:var(--paper);color:var(--ink);font:400 18px/1.75 var(--body);margin:0}
a{color:var(--leaf)} a:hover{color:var(--forest)}
:focus-visible{outline:3px solid var(--amber);outline-offset:3px}
.wrap{max-width:1180px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.top{background:var(--surface);border-bottom:1px solid var(--rule)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-block:14px;flex-wrap:wrap}
.top .logo{height:34px;width:auto}
.top nav{display:flex;gap:20px;flex-wrap:wrap;font-size:15px}
.top nav a{color:var(--ink);text-decoration:none} .top nav a:hover{color:var(--leaf)}
.crumbs{font-size:14px;color:var(--ink-2);padding-block:18px 0}
.crumbs a{color:var(--ink-2)}
.hero{padding-block:28px 8px}
.kicker{font:500 13px/1 var(--mono);letter-spacing:.08em;color:var(--leaf);text-transform:uppercase}
h1,h2,h3{font-family:var(--display);text-wrap:balance;color:var(--ink)}
h1{font-weight:900;font-size:clamp(34px,5.4vw,64px);line-height:1.08;margin:14px 0 16px;max-width:20ch}
.dek{font-size:clamp(19px,2vw,23px);line-height:1.6;color:var(--ink-2);max-width:60ch;margin:0}
.byline{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:22px;font-size:15px;color:var(--ink-2)}
.avatar{width:44px;height:44px;border-radius:50%;background:var(--forest);color:var(--on-forest);display:grid;place-items:center;font:700 16px var(--display)}
.byline b{color:var(--ink);font-weight:700}
.byline .sep{opacity:.5}
.reviewed{display:inline-flex;gap:6px;align-items:center;background:var(--tint);color:var(--leaf);border-radius:999px;padding:2px 12px;font-size:13px;font-weight:500}
.cover{margin:28px 0 0}
.cover img{width:100%;height:auto;aspect-ratio:16/8;object-fit:cover;display:block;border-radius:4px}
figcaption{font-size:14px;color:var(--ink-2);margin-top:8px;line-height:1.5}
.tag-ai{font:500 11px/1 var(--mono);letter-spacing:.06em;background:var(--tint);color:var(--leaf);padding:3px 7px;border-radius:3px;margin-inline-end:6px;white-space:nowrap}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:56px;padding-block:40px 24px}
.toc{position:sticky;top:20px;align-self:start;font-size:15px;border-inline-start:2px solid var(--rule);padding-inline-start:18px}
.toc b{font:500 12px/1 var(--mono);letter-spacing:.08em;color:var(--ink-2);display:block;margin-bottom:12px}
.toc ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.toc a{color:var(--ink);text-decoration:none;line-height:1.4;display:block} .toc a:hover{color:var(--leaf)}
article{min-width:0;max-width:720px}
article h2{font-weight:700;font-size:clamp(27px,3vw,36px);line-height:1.2;margin:56px 0 14px;scroll-margin-top:20px}
article h3{font-weight:700;font-size:23px;margin:34px 0 8px}
article p{margin:0 0 18px}
article ul,article ol{padding-inline-start:22px;margin:0 0 20px} article li{margin-bottom:8px}
article strong{color:var(--ink)}
.lead-box{background:var(--surface);border:1px solid var(--rule);border-radius:6px;padding:22px 24px;margin:0 0 28px}
.lead-box b.lbl,.box b.lbl{font:500 12px/1 var(--mono);letter-spacing:.08em;color:var(--leaf);display:block;margin-bottom:10px;text-transform:uppercase}
.lead-box ul{margin:0}
.box{border-radius:6px;padding:22px 24px;margin:30px 0}
.box.field{background:var(--tint)}
.box.honest{background:var(--surface);border:1px dashed var(--leaf)}
.box.fit{background:var(--surface);border:1px solid var(--rule)}
.box.fit .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.box.fit h4{margin:0 0 6px;font:700 16px var(--body)}
.box p:last-child,.box ul:last-child{margin-bottom:0}
blockquote.testi{margin:36px 0;padding:0;border:0}
blockquote.testi p{font:500 clamp(22px,2.4vw,27px)/1.45 var(--display);color:var(--forest);margin:0 0 10px}
:root[data-theme="dark"] blockquote.testi p{color:var(--sprout)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) blockquote.testi p{color:var(--sprout)}}
blockquote.testi footer{font-size:15px;color:var(--ink-2)}
figure.viz{margin:34px 0}
figure.viz .frame{background:var(--surface);border:1px solid var(--rule);border-radius:6px;padding:20px 18px 12px}
figure.viz h4{margin:0 0 4px;font:700 17px var(--body);color:var(--ink)}
figure.viz .sub{font-size:14px;color:var(--ink-2);margin:0 0 10px}
figure.viz svg{width:100%;height:auto;display:block;direction:ltr}
figure.viz svg text{fill:var(--ink-2);font:500 13px var(--body)}
figure.viz svg .v{fill:var(--ink);font-weight:700}
figure.viz svg .grid{stroke:var(--rule)}
figure.viz details{font-size:14px;margin-top:8px} figure.viz summary{cursor:pointer;color:var(--leaf)}
figure.photo{margin:34px 0} figure.photo img{width:100%;max-width:100%;height:auto;border-radius:4px;display:block}
.wide{margin-inline:-40px} @media(max-width:900px){.wide{margin-inline:0}}
.tbl{overflow-x:auto;margin:28px 0;border:1px solid var(--rule);border-radius:6px;background:var(--surface)}
.tbl table{border-collapse:collapse;width:100%;font-size:15.5px;line-height:1.5;min-width:560px}
.tbl th,.tbl td{padding:12px 14px;text-align:start;border-bottom:1px solid var(--rule);vertical-align:top}
.tbl thead th{font:700 14px var(--body);background:var(--tint);color:var(--ink)}
.tbl tr:last-child td{border-bottom:0}
.tbl td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.steps{list-style:none;padding:0;margin:26px 0;counter-reset:s;display:grid;gap:0}
.steps li{counter-increment:s;display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:14px 0;border-bottom:1px solid var(--rule);margin:0}
.steps li::before{content:counter(s);font:700 22px/44px var(--display);color:var(--on-forest);background:var(--leaf);border-radius:50%;width:44px;height:44px;text-align:center}
.steps li b{display:block}
.check{list-style:none;padding:0}
.check li{padding-inline-start:30px;position:relative}
.check li::before{content:"";position:absolute;inset-inline-start:0;top:.45em;width:16px;height:16px;border-radius:3px;border:2px solid var(--leaf)}
.faq details{border-bottom:1px solid var(--rule);padding:14px 0}
.faq summary{cursor:pointer;font:700 18px/1.5 var(--body);list-style:none;display:flex;justify-content:space-between;gap:12px}
.faq summary::after{content:"+";font:400 24px/1 var(--body);color:var(--leaf)}
.faq details[open] summary::after{content:"−"}
.faq details p{margin:10px 0 0;color:var(--ink-2)}
.cta{background:var(--forest);color:var(--on-forest);border-radius:8px;padding:34px 30px;margin:48px 0}
.cta h2,.cta h3{color:var(--on-forest);margin:0 0 10px}
.cta p{color:var(--on-forest-2)}
.cta form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}
.cta label{display:grid;gap:4px;font-size:14px;color:var(--on-forest-2)}
.cta input,.cta select{font:16px var(--body);padding:11px 12px;border-radius:4px;border:1px solid transparent;background:#F4F6F2;color:#13231F;min-width:0}
.cta button{grid-column:1/-1;justify-self:start;font:700 17px var(--body);background:var(--sprout);color:#0E2A24;border:0;border-radius:4px;padding:13px 26px;cursor:pointer}
.cta .alt{font-size:15px;margin-top:14px;color:var(--on-forest-2)} .cta .alt b{color:var(--on-forest);user-select:all}
.cta .note{min-height:1.4em;font-size:15px;color:var(--sprout);margin:8px 0 0}
.soft-cta{border-block:1px solid var(--rule);padding:18px 0;margin:36px 0;font-size:17px}
.author{display:grid;grid-template-columns:64px minmax(0,1fr);gap:16px;background:var(--surface);border:1px solid var(--rule);border-radius:6px;padding:20px;margin:40px 0}
.author .avatar{width:64px;height:64px;font-size:22px}
.author p{margin:4px 0 0;font-size:15.5px;color:var(--ink-2)}
.sources{font-size:14.5px;color:var(--ink-2)} .sources ol{padding-inline-start:20px} .sources li{margin-bottom:6px;word-break:break-word}
.related{border-top:1px solid var(--rule);padding-block:34px 60px}
.related h2{font-size:28px;margin:0 0 18px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:22px}
.card{text-decoration:none;color:var(--ink);display:grid;gap:10px}
.card img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:4px;display:block}
.card .kicker{font-size:11.5px}
.card h3{font-size:21px;line-height:1.3;margin:0}
.card p{margin:0;font-size:15px;color:var(--ink-2);line-height:1.55}
.foot{background:var(--forest);color:var(--on-forest-2);font-size:14px}
.foot .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center;padding-block:26px}
.foot .logo{height:30px;width:auto}
sup a{text-decoration:none;font:500 12px var(--mono)}
@media (max-width:900px){.layout{grid-template-columns:minmax(0,1fr);gap:0}.toc{position:static;margin-bottom:26px;order:-1}.box.fit .cols{grid-template-columns:1fr}.cta form{grid-template-columns:1fr}}
@media (prefers-reduced-motion:no-preference){.card img{transition:transform .4s}.card:hover img{transform:scale(1.02)}}
/* hub */
.hub-hero{padding-block:44px 30px}
.hub-hero h1{max-width:16ch}
.feature{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:34px;align-items:center;text-decoration:none;color:var(--ink);padding-block:10px 40px;border-bottom:1px solid var(--rule)}
.feature img,.feature video{width:100%;max-width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:4px;display:block;background:var(--tint)}
figure.photo video{width:100%;max-width:100%;height:auto;border-radius:4px;display:block;background:var(--tint)}
.feature h2{font-size:clamp(28px,3.4vw,42px);line-height:1.15;margin:10px 0 12px}
.feature p{color:var(--ink-2);margin:0}
.hub-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:34px;padding-block:40px}
.hub-grid .card h3{font-size:26px}
.trustbar{display:flex;flex-wrap:wrap;gap:10px 28px;padding-block:18px;border-block:1px solid var(--rule);font-size:15px;color:var(--ink-2)}
.trustbar b{color:var(--ink)}
@media (max-width:800px){.feature,.hub-grid{grid-template-columns:minmax(0,1fr)}}
"""


def esc(s):
    return html.escape(s, quote=True)


def slugify_heading(i):
    return f"s{i}"


def add_ids(body):
    """נותן id לכל h2 ובונה תוכן עניינים."""
    toc = []
    def rep(m):
        n = len(toc) + 1
        txt = re.sub("<[^>]+>", "", m.group(1))
        toc.append((f"s{n}", txt))
        return f'<h2 id="s{n}">{m.group(1)}</h2>'
    body = re.sub(r"<h2>(.*?)</h2>", rep, body)
    return body, toc


def header(active=""):
    return f'''<header class="top"><div class="wrap"><a href="index.html" aria-label="מיפתח, מרכז הידע">{LOGO_L.replace('class="logo', 'class="logo')}</a>
<nav aria-label="ניווט ראשי"><a href="index.html">מרכז הידע</a><a href="https://www.miftah.co.il">בתי רשת</a><a href="https://www.miftah.co.il">חוות Turnkey</a><a href="#contact">דברו איתנו</a></nav></div></header>'''


def footer():
    return f'''<footer class="foot"><div class="wrap">{LOGO_D}<span>מיפתח פרויקטים · כפר מסריק · {PHONE} · Where agriculture feels at home</span></div></footer>'''


def cta_block(a):
    c = a.get("cta", {})
    return f'''<section class="cta" id="contact" aria-labelledby="cta-h">
<h2 id="cta-h">{c.get("h","בואו נבדוק אם הפרויקט שלכם מתאים")}</h2>
<p>{c.get("p","שיחה ראשונה עם יפתח, בלי התחייבות. אנחנו עובדים עם פרויקטים מ-50 דונם בישראל ומ-30 הקטר בחו״ל.")}</p>
<form id="lead-{a["slug"]}" novalidate>
<label for="f-size-{a["slug"]}">גודל השטח<input id="f-size-{a["slug"]}" placeholder="{c.get("ph","למשל 120 דונם")}"></label>
<label for="f-crop-{a["slug"]}">גידול<input id="f-crop-{a["slug"]}" placeholder="{c.get("crop","אבוקדו, בננות, תפוחים…")}"></label>
<label for="f-where-{a["slug"]}">מיקום<input id="f-where-{a["slug"]}" placeholder="{c.get("where","גליל, גולן, פורטוגל…")}"></label>
<label for="f-name-{a["slug"]}">שם<input id="f-name-{a["slug"]}" autocomplete="name"></label>
<label for="f-phone-{a["slug"]}">טלפון או וואטסאפ<input id="f-phone-{a["slug"]}" type="tel" autocomplete="tel"></label>
<button type="submit">{c.get("btn","קבעו שיחת התאמה")}</button>
</form>
<p class="note" role="status"></p>
<p class="alt">מעדיפים לדבר עכשיו? טלפון המשרד: <b>{PHONE}</b></p>
</section>'''


def author_box():
    return f'''<aside class="author" aria-label="על הכותב"><div class="avatar" aria-hidden="true">י״ה</div><div><b>{AUTHOR["name"]}</b> · {AUTHOR["role"]}<p>{AUTHOR["bio"]}</p></div></aside>'''


def jsonld(a, toc):
    url = SITE + BASE + a["slug"] + "/"
    graph = [
        {"@type": "BlogPosting", "@id": url + "#article", "headline": a["h1"], "description": a["meta_desc"],
         "image": [SITE + BASE + "img/" + a["cover"]], "datePublished": a["date"], "dateModified": a["date"],
         "inLanguage": "he-IL", "mainEntityOfPage": url, "keywords": ", ".join([a["kw"]] + a.get("kw2", [])),
         "author": {"@type": "Person", "name": "יפתח הספל", "alternateName": "Yiftach Hasfel", "jobTitle": "מנכ״ל משותף",
                    "worksFor": {"@id": SITE + "/#org"}},
         "publisher": {"@id": SITE + "/#org"}},
        {"@type": "Organization", "@id": SITE + "/#org", "name": "מיפתח פרויקטים", "alternateName": "MIFTAH Projects",
         "url": SITE, "telephone": "+972-4-9854404", "logo": SITE + "/logo.png",
         "address": {"@type": "PostalAddress", "addressLocality": "כפר מסריק", "addressCountry": "IL"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "מרכז הידע", "item": SITE + BASE},
            {"@type": "ListItem", "position": 3, "name": a["h1"], "item": url}]},
    ]
    if a.get("faq"):
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", ans)}}
            for q, ans in a["faq"]]})
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "</script>"


def head(title, desc, canonical, og_img):
    return f'''<title>{esc(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="he" href="{canonical}">
<meta property="og:type" content="article"><meta property="og:locale" content="he_IL">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{og_img}"><meta name="twitter:card" content="summary_large_image">
{FONTS}<style>{CSS}</style><script>document.documentElement.lang='he';document.documentElement.dir='rtl';</script>'''


SCRIPT = """<script>
document.documentElement.lang="he";document.documentElement.dir="rtl";
document.querySelectorAll('form[id^="lead-"]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var n=f.parentNode.querySelector('.note');n.textContent='זו תצוגה מקדימה. באתר עצמו הפנייה תגיע ישירות ליפתח, והוא חוזר תוך יום עבודה.';});});
</script>"""


def render_article(a, all_articles):
    body, toc = add_ids(a["body"])
    toc_html = "".join(f'<li><a href="#{i}">{esc(t)}</a></li>' for i, t in toc)
    faq_html = ""
    if a.get("faq"):
        faq_html = '<h2 id="faq">שאלות נפוצות</h2><div class="faq">' + "".join(
            f"<details><summary>{esc(q)}</summary><p>{ans}</p></details>" for q, ans in a["faq"]) + "</div>"
        toc_html += '<li><a href="#faq">שאלות נפוצות</a></li>'
    src_html = ""
    if a.get("sources"):
        src_html = '<section class="sources" aria-labelledby="src-h"><h2 id="src-h">מקורות</h2><ol>' + "".join(
            f'<li id="ref{i}">{s}</li>' for i, s in enumerate(a["sources"], 1)) + "</ol></section>"
    rel = [x for x in all_articles if x["slug"] != a["slug"]][:3]
    rel_html = "".join(card(x) for x in rel)
    ai = '<span class="tag-ai">הדמיה</span>' if a.get("cover_ai", True) else ""
    canonical = SITE + BASE + a["slug"] + "/"
    page = f'''{head(a["meta_title"], a["meta_desc"], canonical, SITE + BASE + "img/" + a["cover"])}
{jsonld(a, toc)}
{header()}
<main>
<div class="wrap"><nav class="crumbs" aria-label="פירורי לחם"><a href="index.html">מרכז הידע</a> / {esc(a["cat"])}</nav>
<div class="hero"><span class="kicker">{esc(a["cat"])} · {a["read"]} דקות קריאה</span>
<h1>{a["h1"]}</h1><p class="dek">{a["dek"]}</p>
<div class="byline"><div class="avatar" aria-hidden="true">י״ה</div><span><b>{AUTHOR["name"]}</b>, {AUTHOR["role"]}</span><span class="sep">·</span><time datetime="{a["date"]}">{a["date_he"]}</time><span class="reviewed">נכתב מתוך עבודה בשטח</span></div>
<figure class="cover"><img src="img/{a["cover"]}" alt="{esc(a["cover_alt"])}" width="1600" height="800" fetchpriority="high"><figcaption>{ai}{a["cover_cap"]}</figcaption></figure></div>
<div class="layout"><article>{body}
{faq_html}
{author_box()}
{cta_block(a)}
{src_html}
</article>
<aside class="toc" aria-label="תוכן המאמר"><b>במאמר</b><ol>{toc_html}</ol></aside></div></div>
<section class="related"><div class="wrap"><h2>להמשך קריאה</h2><div class="cards">{rel_html}</div></div></section>
</main>{footer()}{SCRIPT}'''
    return page


def full(page):
    """עמוד-משנה מתפרסם בלי שלד, לכן מקבל מסמך מלא משלו."""
    return ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>'
            + page.replace("<header class=\"top\">", "</head><body><header class=\"top\">", 1) + "</body></html>")


def card(x):
    return f'''<a class="card" href="{x["slug"]}.html"><img src="img/{x["thumb"]}" alt="" loading="lazy" width="800" height="450"><span class="kicker">{esc(x["cat"])}</span><h3>{x["h1"]}</h3><p>{x["card"]}</p></a>'''


def render_hub(arts):
    f = arts[0]
    rest = "".join(card(x) for x in arts[1:])
    return f'''{head("מרכז הידע של מיפתח", "מדריכים מקצועיים על בתי רשת, רשתות נגד ברד, אחוזי הצללה והקמת חוות Turnkey, מתוך יותר מעשרים שנה בשטח.", SITE + BASE, SITE + BASE + "img/" + f["cover"])}
{header()}
<main><div class="wrap">
<section class="hub-hero"><span class="kicker">מרכז הידע · מיפתח פרויקטים</span>
<h1>מה שלמדנו ביותר מעשרים שנה של בתי רשת. כתוב, לפני שאתם משקיעים.</h1>
<p class="dek">מדריכים מעשיים לחקלאים, למנהלי משקים ולמשקיעים: איך בוחרים מבנה, רשת והצללה, ואיך מקימים חווה שעובדת מהיום הראשון. בלי פרסומת, עם נתונים ומקורות.</p>
<div class="trustbar"><span><b>יותר מ-20</b> שנה בשטח</span><span><b>מפעל</b> משלנו לעמודים, רשתות ואביזרים</span><span><b>צוותים</b> מבוטחים ומוסמכים לעבודה בגובה</span><span>ישראל · פורטוגל · אירופה · אפריקה</span></div></section>
<a class="feature" href="{f["slug"]}.html"><video src="vid/hub-hero.mp4" poster="img/{f["cover"]}" autoplay muted loop playsinline aria-label="הדמיה: מבט רחפן על בית רשת חקלאי בגליל" width="1280" height="720"></video><div><span class="kicker">{esc(f["cat"])}</span><h2>{f["h1"]}</h2><p>{f["card"]}</p></div></a>
<section class="hub-grid" aria-label="מאמרים">{rest}</section>
<p class="soft-cta">לצוות: <a href="pack.html">חבילת ההפצה</a> עם טבלת SEO, פוסטים מוכנים לרשתות וצ׳קליסט השקה.</p>
</div></main>{footer()}'''


if __name__ == "__main__":
    sys.path.insert(0, str(HERE))
    import articles
    importlib.reload(articles)
    arts = articles.ARTICLES
    OUT.mkdir(exist_ok=True)
    for a in arts:
        (OUT / f'{a["slug"]}.html').write_text(full(render_article(a, arts)))
    (OUT / "index.html").write_text(render_hub(arts))
    print("built", len(arts))
