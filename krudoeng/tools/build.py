#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""קרודו הנדסה · בונה את כל עמודי האתר מתוך content.py.

הרצה (מכל מקום): python3 krudoeng/tools/build.py
מתג ההשקה: LAUNCH. כל עוד False: כל העמודים noindex, בלי canonical, ואין sitemap ו-robots.
כשהדומיין עובר לאתר החדש: LAUNCH = True, מריצים שוב, ובודקים את sitemap.xml ו-robots.txt.
"""
import base64
import hashlib
import html
import json
import os
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import content as C  # noqa: E402

LAUNCH = False
SITE_URL = 'https://www.krudoeng.com'
PREVIEW_URL = 'https://hanochgo7-gif.github.io/desktop-tutorial/krudoeng'
ABS = SITE_URL if LAUNCH else PREVIEW_URL
YEAR = 2026
V = '3'  # גרסה לקבצי ה-CSS וה-JS, כדי שדפדפנים יטענו מחדש אחרי עדכון
BRAND = 'קרודו הנדסה'

INLINE_JS = "document.documentElement.classList.add('js')"
JS_HASH = "'sha256-" + base64.b64encode(hashlib.sha256(INLINE_JS.encode()).digest()).decode() + "'"
CSP = ("default-src 'self'; script-src 'self' " + JS_HASH + "; style-src 'self'; img-src 'self' data:; font-src 'self'; "
       "connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'")

e = html.escape
SVC = {s['slug']: s for s in C.SERVICES}
HAS_FIELD = bool(C.FIELD['items'])   # דף "ליקויים מהשטח" נוצר רק כשיש צילומים אמיתיים
PAGES = []     # לכתובות ב-sitemap


def wa(text=C.WA_DEFAULT):
    return 'https://wa.me/' + C.WA + '?text=' + urllib.parse.quote(text)


def ico_wa():
    return ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z"/></svg>')


def ico_phone():
    return ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.3 1Z"/></svg>')


class Page:
    def __init__(self, path, lang='he'):
        self.path = path            # למשל 'second-hand/index.html'
        self.depth = path.count('/')
        self.p = '../' * self.depth  # קידומת לנתיבים יחסיים
        self.lang = lang
        self.url_path = path[:-len('index.html')] if path.endswith('index.html') else path

    def a(self, target):
        return self.p + target


def head(pg, title, desc, schema=None, robots=None, alt_en=False, og_img='assets/img/og.jpg', full_title=None):
    t = full_title or (f'{title} | {BRAND}' if pg.lang == 'he' else title)
    canon = SITE_URL + '/' + pg.url_path
    out = ['<!doctype html>',
           f'<html lang="{"he" if pg.lang == "he" else "en"}" dir="{"rtl" if pg.lang == "he" else "ltr"}">',
           '<head>', '<meta charset="utf-8">',
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
           f'<meta http-equiv="Content-Security-Policy" content="{CSP}">',
           '<meta name="referrer" content="strict-origin-when-cross-origin">',
           f'<title>{e(t)}</title>', f'<meta name="description" content="{e(desc)}">']
    if robots or not LAUNCH:
        out.append(f'<meta name="robots" content="{robots or "noindex, nofollow"}">')
    if LAUNCH and not (robots and 'noindex' in robots):
        out.append(f'<link rel="canonical" href="{canon}">')
        if alt_en:
            out.append(f'<link rel="alternate" hreflang="he" href="{SITE_URL}/">')
            out.append(f'<link rel="alternate" hreflang="en" href="{SITE_URL}/en/">')
            out.append(f'<link rel="alternate" hreflang="x-default" href="{SITE_URL}/">')
    out += ['<meta name="theme-color" content="#03202d">',
            f'<meta property="og:type" content="{"website" if pg.url_path in ("", "en/") else "article" if pg.url_path.startswith("articles/") and pg.url_path != "articles/" else "website"}">',
            f'<meta property="og:site_name" content="{BRAND}">',
            f'<meta property="og:locale" content="{"he_IL" if pg.lang == "he" else "en_US"}">',
            f'<meta property="og:title" content="{e(t)}">', f'<meta property="og:description" content="{e(desc)}">',
            f'<meta property="og:url" content="{ABS}/{pg.url_path}">',
            f'<meta property="og:image" content="{ABS}/{og_img}">', '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<link rel="icon" href="{pg.a("assets/img/brand/favicon.svg")}" type="image/svg+xml">',
            f'<link rel="icon" href="{pg.a("assets/img/brand/favicon-32.png")}" sizes="32x32" type="image/png">',
            f'<link rel="apple-touch-icon" href="{pg.a("assets/img/brand/apple-touch-icon.png")}">',
            f'<link rel="preload" href="{pg.a("assets/fonts/plex-hebrew-400.woff2" if pg.lang == "he" else "assets/fonts/plex-latin-400.woff2")}" as="font" type="font/woff2" crossorigin>',
            f'<link rel="stylesheet" href="{pg.a("assets/css/site.css")}?v={V}">',
            f'<script>{INLINE_JS}</script>']
    if schema:
        out.append('<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>')
    out.append('</head>')
    return '\n'.join(out)


def ico_eye():
    return ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>'
            '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>')


ARROW = '<span aria-hidden="true">←</span>'


def q(s):
    return '"' + s + '"'


# ---------- מסגרת: סרגל עליון, תפריט נייד, סוף עמוד ----------
def header(pg, current=None, wa_text=None):
    if pg.lang == 'en':
        return (f'<header class="site-header dark"><div class="wrap site-header__in">'
                f'<a class="brand" href="{pg.a("")}" aria-label="Krudo Engineering, Hebrew site"><img src="{pg.a("assets/img/brand/wordmark-light.svg")}" alt="Krudo Engineering" width="607" height="103"></a>'
                f'<nav class="nav nav--en" aria-label="Main"><ul><li><a href="#services">Services</a></li><li><a href="#process">How it works</a></li><li><a href="#about">Ravid</a></li>'
                f'<li><a href="{pg.a("")}" lang="he" hreflang="he">עברית</a></li></ul></nav>'
                f'<a class="btn btn--primary site-header__cta" href="{wa(C.EN["wa"])}" data-wa="header">{ico_wa()}<span>WhatsApp</span></a></div></header>')
    home = pg.a('') or './'
    links = ''.join(f'<li><a href="{pg.a(href)}"{" aria-current=" + q("page") if key == current else ""}>{e(t)}</a></li>' for key, href, t in C.NAV)
    groups = ''
    for key, title, _ in C.SITUATIONS:
        items = ''.join(f'<li><a href="{pg.a(s["slug"] + "/")}"{" aria-current=" + q("page") if pg.path == s["slug"] + "/index.html" else ""}>{e(s["name"])}</a></li>' for s in C.SERVICES if s['group'] == key)
        groups += f'<li><p class="menu__label">{e(title)}</p><ul>{items}</ul></li>'
    others = ''.join(f'<li><a href="{pg.a(href)}"{" aria-current=" + q("page") if key == current else ""}>{e(t)}</a></li>' for key, href, t in C.NAV if key != 'services')
    hw = wa(wa_text) if wa_text else wa()
    return (f'<header class="site-header dark"><div class="wrap site-header__in">'
            f'<a class="brand" href="{home}" aria-label="{BRAND}, לדף הבית"><img src="{pg.a("assets/img/brand/wordmark-light.svg")}" alt="{BRAND}" width="607" height="103"></a>'
            f'<nav class="nav" aria-label="ראשי"><ul>{links}<li><a class="nav__en" href="{pg.a("en/")}" lang="en" hreflang="en">EN</a></li></ul></nav>'
            f'<a class="btn btn--primary site-header__cta" href="{hw}" data-wa="header">{ico_wa()}<span class="long">לתיאום בוואטסאפ</span><span class="short">וואטסאפ</span></a>'
            f'<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-open>תפריט</button>'
            f'</div></header>'
            f'<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="תפריט" hidden>'
            f'<div class="menu__top"><a class="brand" href="{home}"><img src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="{BRAND}" width="607" height="118"></a>'
            f'<button class="btn btn--secondary menu__close" type="button" data-menu-close>סגירה</button></div>'
            f'<div class="menu__actions"><a class="btn btn--primary" href="{hw}" data-wa="menu">{ico_wa()}וואטסאפ לרביד</a>'
            f'<a class="btn btn--secondary" href="tel:{C.PHONE_INTL}" data-tel="menu">{ico_phone()}<span class="ltr">{C.PHONE}</span></a></div>'
            f'<nav class="menu__nav" aria-label="תפריט ראשי"><p class="menu__head"><a href="{pg.a("services/")}"{" aria-current=" + q("page") if current == "services" and pg.path == "services/index.html" else ""}>שירותים</a></p>'
            f'<ul class="menu__groups">{groups}</ul><ul class="menu__main">{others}<li><a href="{pg.a("en/")}" lang="en">English</a></li></ul></nav></div>')


def footer(pg, credit=None):
    if pg.lang == 'en':
        return (f'<footer class="site-footer site-footer--compact dark"><div class="wrap site-footer__end"><p>Krudo Engineering · Kiryat Tivon, northern Israel</p>'
                f'<p class="site-footer__legal"><a href="{pg.a("")}" lang="he">עברית</a><a href="tel:{C.PHONE_INTL}" data-tel="foot"><span class="ltr">{C.PHONE_EN}</span></a>'
                f'<a href="mailto:{C.EMAIL}">{C.EMAIL}</a><a href="{pg.a("accessibility/")}">Accessibility (Hebrew)</a><a href="{pg.a("privacy/")}">Privacy (Hebrew)</a></p></div>'
                f'<div class="wrap"><p class="site-footer__credit">© {YEAR} Krudo Engineering. The apartment image on this page is an AI-generated illustration.</p></div></footer>')
    svc = ''.join(f'<li><a href="{pg.a(s["slug"] + "/")}">{e(s["name"])}</a></li>' for s in C.SERVICES)
    site = (''.join(f'<li><a href="{pg.a(h)}">{e(t)}</a></li>' for k, h, t in C.NAV if k != 'services')
            + f'<li><a href="{pg.a("checklist/")}">רשימת בדיקה למקבלי דירה</a></li><li><a href="{pg.a("en/")}" lang="en">English</a></li>')
    return (f'<footer class="site-footer dark"><div class="wrap site-footer__grid">'
            f'<div class="site-footer__brand"><img src="{pg.a("assets/img/brand/wordmark-light.svg")}" alt="{BRAND}" width="607" height="103" loading="lazy">'
            f'<p>בדק מבנים, איתור ליקויי בנייה ופיקוח הנדסי.</p><p>רביד קרודו, הנדסאי בניין רשום · מ.ר {C.REG}</p></div>'
            f'<nav aria-label="שירותים"><h2 class="site-footer__h">שירותים</h2><ul>{svc}<li><a href="{pg.a("services/")}">כל השירותים</a></li></ul></nav>'
            f'<nav aria-label="באתר"><h2 class="site-footer__h">באתר</h2><ul>{site}</ul></nav>'
            f'<div><h2 class="site-footer__h">יצירת קשר</h2><ul><li><a href="{wa()}" data-wa="footer">וואטסאפ לרביד</a></li>'
            f'<li><a href="tel:{C.PHONE_INTL}" data-tel="footer"><span class="ltr">{C.PHONE}</span></a></li><li><a href="mailto:{C.EMAIL}">{C.EMAIL}</a></li>'
            f'<li>{e(C.ADDRESS)}</li><li>בודקים {e(C.AREA_IN)}</li></ul></div></div>'
            f'<div class="wrap site-footer__end"><p>© {YEAR} {BRAND}</p><p class="site-footer__legal"><a href="{pg.a("accessibility/")}">הצהרת נגישות</a><a href="{pg.a("privacy/")}">פרטיות</a></p></div>'
            + (f'<div class="wrap"><p class="site-footer__credit">{credit}</p></div>' if credit else '') + '</footer>')


def scripts(pg, model=False):
    s = ''
    if model:
        s += f'<script src="{pg.a("assets/js/inspect.js")}?v={V}" defer></script>'
    s += f'<script src="{pg.a("assets/js/site.js")}?v={V}" defer></script>'
    return s


def page(pg, title, desc, body, schema=None, current=None, model=False, credit=None, robots=None, alt_en=False, full_title=None, wa_text=None):
    doc = [head(pg, title, desc, schema, robots, alt_en, full_title=full_title),
           '<body>',
           f'<a class="skip" href="#main">{"דילוג לתוכן" if pg.lang == "he" else "Skip to content"}</a>',
           header(pg, current, wa_text),
           f'<main id="main">{body}</main>',
           footer(pg, credit), scripts(pg, model), '</body>', '</html>']
    out = '\n'.join(doc) + '\n'
    full = os.path.join(ROOT, pg.path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(out)
    if not (robots and 'noindex' in robots):
        PAGES.append(pg.url_path)


# ---------- רכיבים ----------
def apt_view(pg, h):
    """הדירה בהדמיה: כמו בביקור רגיל, ו"מבט של בודק" (סרטון שעובר ביניהן). כל ממצא: סיכה בתמונה, שורה ברשימה ותקריב להמחשה."""
    img = lambda n: pg.a('assets/img/apt/' + n)
    srcset = lambda k: f'{img(k + "-1280.webp")} 1280w, {img(k + "-2048.webp")} 2048w'
    sizes = '(min-width: 1240px) 700px, (min-width: 901px) 56vw, 100vw'
    pins, finds = '', ''
    for i, (k, (t, d)) in enumerate(C.FINDINGS.items(), 1):
        a = C.APT[k]
        pins += (f'<button type="button" class="apt__pin" data-f="{k}" data-x="{a["pos"][0]}" data-y="{a["pos"][1]}" data-cam="{" ".join(str(v) for v in a["cam"])}" '
                 f'data-close="{img("close-" + k + ".webp")}" data-cap="{e(a["cap"])}" data-alt="{e(a["alt"])}" data-say="{i}. {e(t)}: {e(d)}" '
                 f'aria-label="{i}. {e(t)}" tabindex="-1"><span class="apt__dot" aria-hidden="true">{i}</span><span class="apt__say" aria-hidden="true">{e(t)}</span></button>')
        finds += (f'<li><button type="button" class="find" data-f="{k}" aria-pressed="false"><span class="find__n" aria-hidden="true">{i}</span>'
                  f'<span class="find__t">{e(t)}</span><span class="find__d">{e(d)}</span></button></li>')
    view = (f'<div class="apt" data-apt><div class="apt__stage"><div class="apt__move">'
            f'<img class="apt__day" src="{img("day-1280.webp")}" srcset="{srcset("day")}" sizes="{sizes}" width="2048" height="1360" loading="lazy" decoding="async" '
            f'alt="הדמיה של דירה לדוגמה במבט מלמעלה, בלי תקרה: סלון ומטבח, חדר שינה, חדר רחצה, ממ״ד ומרפסת">'
            f'<img class="apt__eye" src="{img("eye-1280.webp")}" srcset="{srcset("eye")}" sizes="{sizes}" width="2048" height="1360" loading="lazy" decoding="async" alt="">'
            f'<video class="apt__vid" muted playsinline preload="none" aria-hidden="true" tabindex="-1" data-src="{pg.a("assets/media/reveal-1280.mp4")}" data-src-s="{pg.a("assets/media/reveal-854.mp4")}"></video>'
            f'<div class="apt__pins">{pins}</div></div><i class="apt__scan" aria-hidden="true"></i></div>'
            f'<div class="eye"><button class="btn btn--secondary" type="button" aria-pressed="false" data-eye>{ico_eye()}מבט של בודק</button>'
            f'<p class="eye__say" aria-live="polite" data-eye-say data-off="{e(h["eye_off"])}" data-on="{e(h["eye_on"])}">{e(h["eye_off"])}</p></div>'
            f'<div class="apt__close" hidden><p><b>המחשה</b><span></span></p></div></div>')
    return view, f'<ol class="finds" aria-label="מה רביד בודק בדירה">{finds}</ol>'


def crumbs(pg, items):
    parts = ''.join(f'<li><a href="{h}">{e(t)}</a></li>' if h else f'<li><span aria-current="page">{e(t)}</span></li>' for t, h in items)
    return f'<nav class="crumbs" aria-label="מיקום באתר"><ol>{parts}</ol></nav>'


def actions(pg, text=None, label='לתיאום בוואטסאפ', lang='he'):
    text = text or (C.WA_DEFAULT if lang == 'he' else C.EN['wa'])
    wa_label = label if lang == 'he' else 'WhatsApp Ravid'
    tel = C.PHONE if lang == 'he' else C.PHONE_EN
    return (f'<div class="actions"><a class="btn btn--primary" href="{wa(text)}" data-wa="action">{ico_wa()}{e(wa_label)}</a>'
            f'<a class="btn btn--secondary" href="tel:{C.PHONE_INTL}" data-tel="action">{ico_phone()}<span class="ltr">{tel}</span></a></div>')


def page_head(pg, h1, lede, crumb_items, side='', acts=None):
    acts = actions(pg) if acts is None else acts
    side_html = f'<div class="page-head__side">{side}</div>' if side else ''
    return (f'<section class="page-head" aria-labelledby="h1"><div class="wrap page-head__grid{" has-side" if side else ""}">'
            f'<div class="page-head__text">{crumbs(pg, crumb_items)}<h1 id="h1">{e(h1)}</h1><p class="lede">{lede}</p>{acts}</div>{side_html}</div></section>')


def section(sid, h2, inner, intro='', cls='', more=''):
    head_ = f'<div class="section__head"><h2 id="{sid}-h">{e(h2)}</h2>' + (f'<p>{intro}</p>' if intro else '') + '</div>'
    return (f'<section class="section{(" " + cls) if cls else ""}" id="{sid}" aria-labelledby="{sid}-h">'
            f'<div class="wrap">{head_}{inner}{more}</div></section>')


def more_links(*links):
    return '<p class="section__more">' + ''.join(f'<a class="link-arrow" href="{h}">{e(t)} {ARROW}</a>' for h, t in links) + '</p>'


def facts_card(facts, title='בקצרה', extra=''):
    rows = ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in facts)
    return f'<div class="facts-card"><p class="facts-card__h">{e(title)}</p><dl class="facts">{rows}</dl>{extra}</div>'


def svc_card(pg, s, level=3, who=False):
    w = f'<p class="svc__who">{e(C.WHO[s["slug"]])}</p>' if who else ''
    return (f'<li class="svc"><h{level} class="svc__name"><a href="{pg.a(s["slug"] + "/")}">{e(s["name"])}</a></h{level}>{w}'
            f'<dl class="svc__facts"><div><dt>מתי</dt><dd>{e(s["when_short"])}</dd></div><div><dt>מה מקבלים</dt><dd>{e(s["gives"])}</dd></div></dl>'
            f'<span class="svc__more" aria-hidden="true">לפרטים ←</span></li>')


def link_card(href, title, text, level=3):
    return (f'<li class="svc"><h{level} class="svc__name"><a href="{href}">{e(title)}</a></h{level}><p class="svc__who">{e(text)}</p>'
            f'<span class="svc__more" aria-hidden="true">לעמוד ←</span></li>')


def chooser(pg, who=False, level=3):
    cols = ''
    for key, title, sub in C.SITUATIONS:
        cards = ''.join(svc_card(pg, s, level + 1, who) for s in C.SERVICES if s['group'] == key)
        also = ''.join(f'<li>{e(q_)} <a class="link-arrow" href="{pg.a(slug + "/")}">{e(SVC[slug]["name"])} {ARROW}</a></li>' for slug, q_ in C.SITUATION_ALSO.get(key, []))
        also = f'<ul class="chooser__also">{also}</ul>' if also else ''
        cols += f'<div class="chooser__col"><h{level} class="chooser__h">{e(title)}</h{level}><p class="chooser__sub">{e(sub)}</p><ul class="svc-list">{cards}</ul>{also}</div>'
    return f'<div class="chooser">{cols}</div>'


def why_grid():
    return '<ul class="why">' + ''.join(f'<li class="why__item"><h3>{e(t)}</h3><p>{e(p)}</p></li>' for t, p in C.WHY) + '</ul>'


def steps(items):
    return '<ol class="steps">' + ''.join(f'<li class="step"><span class="step__n" aria-hidden="true">{i + 1}</span><h3 class="step__h">{e(t)}</h3><p>{e(p)}</p></li>'
                                       for i, (t, p) in enumerate(items)) + '</ol>'


def faq_list(items, pg):
    rows = ''
    for qq, ans in items:
        a = ''.join(f'<p>{x.format(base=pg.p, articles=pg.a("articles/"))}</p>' for x in ans)
        rows += f'<details class="faq__item"><summary>{e(qq)}</summary><div class="faq__a">{a}</div></details>'
    return f'<div class="faq">{rows}</div>'


def faq_schema(items):
    import re
    strip = lambda s: re.sub(r'<[^>]+>', '', s)
    return {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': qq, 'acceptedAnswer': {'@type': 'Answer', 'text': ' '.join(strip(x) for x in a)}} for qq, a in items]}


def quote_form(pg, preset=None):
    chips = ''.join(f'<label><input type="radio" name="type" value="{e(s["name"])}"{" checked" if preset == s["slug"] else ""}><span>{e(s["chip"])}</span></label>' for s in C.SERVICES)
    F = C.FORM.get(preset, C.FORM[None])
    return (f'<form class="quote" data-quote novalidate>'
            f'<fieldset aria-describedby="quote-err"><legend>סוג הבדיקה</legend><div class="chips">{chips}</div></fieldset>'
            f'<div class="two"><label><span>עיר</span><input type="text" name="city" autocomplete="address-level2" maxlength="40" data-msg="עיר"></label>'
            f'<label><span>{e(F["size"][0])}</span><input type="text" name="size" inputmode="numeric" maxlength="12" data-msg="{e(F["size"][1])}" data-unit="{e(F["size"][2])}"></label></div>'
            f'<div class="two"><label><span>{e(F["date"])}</span><input type="text" name="date" maxlength="40" data-msg="{e(F["date"])}"></label>'
            f'<label><span>שם</span><input type="text" name="name" autocomplete="name" maxlength="60"></label></div>'
            f'<label><span>מה עוד חשוב לדעת? (לא חובה)</span><textarea name="note" rows="3" maxlength="600" placeholder="{e(F["note"])}" aria-describedby="quote-err"></textarea></label>'
            f'<p class="quote__err" id="quote-err" role="alert"></p>'
            f'<button class="btn btn--primary" type="submit">{ico_wa()}שליחת הפרטים בוואטסאפ</button>'
            f'<p class="quote__note">ההודעה נפתחת אצלכם בוואטסאפ, ואתם שולחים אותה. האתר לא שומר את הפרטים.</p>'
            f'</form><a class="btn btn--primary nojs-wa" href="{wa()}" data-wa="nojs">{ico_wa()}לתיאום בוואטסאפ</a>')


def contact_section(pg, h2, sub, preset=None, sid='contact', cls='section--paper'):
    info = (f'<div class="contact__info"><h2 id="{sid}-h">{e(h2)}</h2><p class="lead">{e(sub)}</p><ul class="contact__list">'
            f'<li><span>וואטסאפ וטלפון</span><a href="tel:{C.PHONE_INTL}" data-tel="contact"><span class="ltr">{C.PHONE}</span></a></li>'
            f'<li><span>מייל</span><a href="mailto:{C.EMAIL}">{C.EMAIL}</a></li>'
            f'<li><span>אזור</span><b>{e(C.AREA_TOWNS)}, עד כ־50 ק״מ מקריית טבעון</b></li></ul></div>')
    form = f'<div class="contact__form"><p class="contact__form-h">פרטים לוואטסאפ</p>{quote_form(pg, preset)}</div>'
    return (f'<section class="section contact{(" " + cls) if cls else ""}" id="{sid}" aria-labelledby="{sid}-h">'
            f'<div class="wrap contact__grid">{info}{form}</div></section>')


def cta_band(pg, h2, text, acts=None, sid='next'):
    acts = actions(pg) if acts is None else acts
    return (f'<section class="section section--paper" id="{sid}" aria-labelledby="{sid}-h"><div class="wrap cta-band">'
            f'<div><h2 id="{sid}-h">{e(h2)}</h2><p class="lead">{e(text)}</p></div>{acts}</div></section>')


def field_item(key):
    return next((x for x in C.FIELD['items'] if x['img'] == key), None)


def field_img(pg, x, lazy=True):
    return (f'<img src="{pg.a("assets/img/field/" + x["img"] + ".webp")}" alt="{e(x["alt"])}" width="718" height="898"'
            + (' loading="lazy"' if lazy else '') + ' decoding="async">')


def photo_cards(pg, items, full=False, level=3):
    out = ''
    for x in items:
        note = x['note'] if full else x.get('short', x['note'])
        rec = f'<p class="photo__rec"><span>המלצה:</span> {e(x["rec"])}</p>' if full else ''
        out += (f'<li class="photo"><figure>{field_img(pg, x)}<figcaption><h{level} class="photo__h">{e(x["found"])}</h{level}>'
                f'<p>{e(note)}</p>{rec}</figcaption></figure></li>')
    return f'<ul class="photos{" photos--2" if full else ""}">{out}</ul>'


def sample_link(pg):
    if not C.SAMPLE_REPORT:
        return ''
    return f'<p><a class="link-arrow" href="{pg.a(C.SAMPLE_REPORT)}" download data-sample>דוח אמיתי לדוגמה, PDF {ARROW}</a></p>'


def sample_report(pg):
    """קטע קריא מחוות דעת אמיתית, במבנה של הדוח של רביד, ולצידו הסבר על חלקי הסעיף."""
    S = C.SAMPLE_PAGE
    pics = [(field_item(k), cap) for k, cap in S['pics']]
    figs = ''
    if HAS_FIELD and all(x for x, _ in pics):
        figs = ('<div class="doc__box"><p class="doc__k">תמונות</p><div class="doc__pics">'
                + ''.join(f'<figure>{field_img(pg, x)}<figcaption>{e(cap)}</figcaption></figure>' for x, cap in pics) + '</div></div>')
    doc = (f'<div class="doc"><div class="doc__band"><img src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="{BRAND}" width="607" height="118" loading="lazy">'
           f'<p>בדק מבנים | איתור ליקויי בנייה | פיקוח הנדסי</p></div><div class="doc__body">'
           f'<div class="doc__box"><p class="doc__k">{e(S["no"])} · ממצא</p><p class="doc__finding">{e(S["finding"])}</p></div>'
           f'<div class="doc__box"><p class="doc__k">ממצאים ומסקנות</p><p>{e(S["text"])}</p></div>'
           f'<details class="doc__more" data-open-wide><summary>המשך הסעיף: המלצה, תמחור ותמונות</summary><div class="doc__body doc__body--more">'
           f'<div class="doc__box"><p class="doc__k">המלצה</p><p>{e(S["rec"])}</p></div>'
           f'<div class="doc__box"><p class="doc__k">תמחור</p><p>{e(S["price"])}</p></div>{figs}</div></details></div>'
           f'<p class="doc__foot">{e(S["foot"])}</p></div>')
    parts = ''.join(f'<li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in C.HOME2['report_parts'])
    side = f'<div class="sample__aside"><h3>מה יש בכל סעיף</h3><ul class="parts">{parts}</ul>{sample_link(pg)}</div>'
    return f'<div class="sample">{doc}{side}</div>'


def stations():
    cols = ''
    for st in C.HOME['steps']:
        checks = ''.join(f'<li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d, _tool in st['checks'])
        cols += f'<div class="station"><h3>{e(st["h3"])}</h3><p>{e(st["p"])}</p><ul class="station__checks">{checks}</ul></div>'
    return f'<div class="stations">{cols}</div>'


def checks_split(rows, pic=None):
    lst = '<ul class="checks">' + ''.join(f'<li><h3>{e(t)}</h3><p>{e(d)}</p></li>' for t, d in rows) + '</ul>'
    if not pic:
        return f'<div class="split split--solo">{lst}</div>'
    src, cap, alt = pic
    return (f'<div class="split">{lst}<figure class="split__pic"><img src="{src}" alt="{e(alt)}" width="718" height="898" loading="lazy" decoding="async">'
            f'<figcaption>{e(cap)}</figcaption></figure></div>')


def related_section(pg, related, h2='עוד שירותים שיכולים להתאים'):
    cards = ''
    for slug in related:
        if slug in SVC:
            cards += svc_card(pg, SVC[slug], 3)
        elif slug == 'lawyers':
            cards += link_card(pg.a('lawyers/'), 'לעורכי דין, מתווכים ושמאים', 'איך מפנים לקוח, מה הוא מקבל, ודוח לדוגמה.')
        elif slug == 'checklist':
            cards += link_card(pg.a('checklist/'), 'רשימת בדיקה למקבלי דירה', 'מה לבדוק בעצמכם ביום המסירה. להדפסה ולהורדה.')
    return section('related', h2, f'<ul class="svc-list svc-list--row">{cards}</ul>', cls='section--paper') if cards else ''


VALLEY_CREDIT = 'צילום עמק יזרעאל: Mohammad Hijjawi, <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener license" target="_blank">CC BY-SA 4.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Jezreel_Valley_3.jpg" rel="noopener" target="_blank">ויקישיתוף</a>.'
MODEL_NOTE = 'הדירה, הסרטון והתקריבים באזור "מה בודקים בדירה" הם הדמיה שנוצרה בבינה מלאכותית, ולא צילומים מבדיקה אמיתית.'


# ---------- Schema ----------
def org_schema():
    return {
        '@type': 'ProfessionalService', '@id': SITE_URL + '/#business', 'name': BRAND, 'alternateName': 'Krudo Engineering',
        'url': SITE_URL + '/', 'logo': SITE_URL + '/assets/img/brand/icon-512.png', 'image': SITE_URL + '/assets/img/og.jpg',
        'description': C.HOME['desc'], 'telephone': '+972-54-756-0711', 'email': C.EMAIL,
        'address': {'@type': 'PostalAddress', 'streetAddress': 'מעלה אבשלום 65', 'addressLocality': 'קריית טבעון', 'postalCode': '3609464', 'addressCountry': 'IL'},
        'areaServed': [{'@type': 'AdministrativeArea', 'name': 'מחוז הצפון'}, {'@type': 'AdministrativeArea', 'name': 'מחוז חיפה'}] +
                      [{'@type': 'City', 'name': n} for n in ['חיפה', 'קריית טבעון', 'קריית אתא', 'קריית ביאליק', 'קריית מוצקין', 'קריית ים', 'נשר', 'יקנעם עילית', 'מגדל העמק', 'עפולה', 'נצרת', 'נוף הגליל', 'רמת ישי', 'זכרון יעקב', 'עכו']],
        'founder': {'@id': SITE_URL + '/#ravid'}, 'employee': {'@id': SITE_URL + '/#ravid'},
        'knowsAbout': ['בדק בית', 'בדק מבנים', 'איתור ליקויי בנייה', 'חוות דעת הנדסית', 'בדיקה נגדית', 'פיקוח הנדסי', 'איתור רטיבות'],
        'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'שירותים', 'itemListElement': [{'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s['name'], 'url': f"{SITE_URL}/{s['slug']}/"}} for s in C.SERVICES]},
        'sameAs': [u for u in C.SOCIAL.values() if u],
    }


def person_schema():
    return {'@type': 'Person', '@id': SITE_URL + '/#ravid', 'name': 'רביד קרודו', 'alternateName': 'Ravid Krudo', 'jobTitle': 'הנדסאי בניין רשום',
            'worksFor': {'@id': SITE_URL + '/#business'}, 'alumniOf': {'@type': 'CollegeOrUniversity', 'name': 'מכללת אורט'},
            'hasCredential': [{'@type': 'EducationalOccupationalCredential', 'name': 'הנדסאי בניין רשום בפנקס ההנדסאים, מספר רישום 38633308', 'credentialCategory': 'רישום מקצועי'},
                              {'@type': 'EducationalOccupationalCredential', 'name': 'מאתר ליקויי בנייה', 'recognizedBy': {'@type': 'Organization', 'name': 'איגוד המהנדסים לבנייה ולתשתיות'}}]}


def crumbs_schema(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE_URL + '/' + u} for i, (n, u) in enumerate(items)]}


def graph(*nodes):
    return {'@context': 'https://schema.org', '@graph': list(nodes)}


# ---------- עמוד הבית ----------
HOME_PHOTOS = ['ceiling-damp', 'tile-pinhole', 'sash-gap']   # שלושה ממצאים שונים, בלי חזרה על הצילומים שבדוח לדוגמה


def build_home():
    pg = Page('index.html')
    h, H = C.HOME, C.HOME2
    photo = lambda w: pg.a(f'assets/img/photo/house-{w}.webp')
    hero = (f'<section class="hero hero--photo dark" aria-labelledby="h1">'
            f'<img class="hero__photo" src="{photo(1600)}" srcset="{photo(900)} 900w, {photo(1600)} 1600w, {photo(2400)} 2400w" sizes="100vw" alt="" width="2400" height="1334" fetchpriority="high">'
            f'<div class="wrap hero__grid"><div class="hero__text"><h1 id="h1">{e(H["h1"])}</h1><p class="lede">{e(h["lede"])}</p>{actions(pg)}</div></div></section>')
    # הדירה בהדמיה: אזור משלה, עם מבט של בודק ושבעה ממצאים
    view, finds = apt_view(pg, h)
    inspect = (f'<section class="section dark" id="inspect" aria-labelledby="inspect-h"><div class="wrap inspect">'
               f'<div class="section__head"><h2 id="inspect-h">{e(H["inspect_h2"])}</h2><p>{e(H["inspect_p"])}</p></div>'
               f'{view}{finds}</div></section>')
    body = hero
    body += section('services', H['chooser_h2'], chooser(pg).replace('class="chooser"', 'class="chooser chooser--home"', 1), e(H['chooser_p']),
                    more=more_links((pg.a('services/'), 'כל השירותים, עם הפירוט'), (pg.a('lawyers/'), 'לעורכי דין, מתווכים ושמאים')))
    body += section('why', H['why_h2'], why_grid(), cls='section--paper')
    body += section('process', H['process_h2'], steps(C.PROCESS))
    body += inspect
    if HAS_FIELD:
        pick = [field_item(k) for k in HOME_PHOTOS if field_item(k)]
        body += section('field', H['field_h2'], photo_cards(pg, pick), e(C.FIELD['strip_p']), cls='section--paper',
                        more=more_links((pg.a('field/'), 'כל הליקויים מהשטח, עם מה שנמדד ומה שהומלץ')))
    body += section('report', H['report_h2'], sample_report(pg), e(H['report_p']))
    about = (f'<div class="prose"><p class="lead">{e(h["about_para"])}</p><p>{e(h["about_more"])}</p>'
             f'<p><a class="link-arrow" href="{pg.a("about/")}">עוד על רביד, ההסמכות והניסיון {ARROW}</a></p></div>')
    body += section('about', H['about_h2'], about, cls='section--paper')
    body += section('faq', H['faq_h2'], faq_list(h['faq'], pg))
    body += contact_section(pg, h['contact_h2'], h['contact_sub'])
    schema = graph(org_schema(), person_schema(), {'@type': 'WebSite', '@id': SITE_URL + '/#website', 'url': SITE_URL + '/', 'name': BRAND, 'inLanguage': 'he-IL', 'publisher': {'@id': SITE_URL + '/#business'}}, faq_schema(h['faq']))
    page(pg, h['title'], h['desc'], body, schema, model=True, credit=MODEL_NOTE, alt_en=True, full_title=f'{BRAND} · {h["title"]}')


# ---------- עמוד השירותים ----------
def build_services():
    pg = Page('services/index.html')
    P = C.SERVICES_PAGE
    home = pg.a('') or './'
    body = page_head(pg, P['h1'], e(P['lede']), [('דף הבית', home), ('שירותים', None)])
    body += f'<section class="section" aria-label="השירותים לפי מצב"><div class="wrap">{chooser(pg, who=True, level=2)}</div></section>'
    body += section('checks', P['checks_h2'], stations(), e(P['checks_p']), cls='section--paper')
    cards = (f'<div class="cta-cards">'
             f'<div class="cta-card"><h2 id="next-h">{e(P["unsure_h2"])}</h2><p>{e(P["unsure_p"])}</p>{actions(pg, label="לשאלה בוואטסאפ")}</div>'
             f'<div class="cta-card"><h2>לעורכי דין, מתווכים ושמאים</h2><p>{e(C.LAWYERS["lede"])}</p>'
             f'<p><a class="link-arrow" href="{pg.a("lawyers/")}">איך מפנים לקוח {ARROW}</a></p></div></div>')
    body += f'<section class="section" id="next" aria-labelledby="next-h"><div class="wrap">{cards}</div></section>'
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('שירותים', 'services/')]),
                   {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': s['name'], 'url': f"{SITE_URL}/{s['slug']}/"} for i, s in enumerate(C.SERVICES)]})
    page(pg, P['title'], P['desc'], body, schema, current='services')


# ---------- עמודי השירות: תבנית אחת ----------
SERVICE_PICS = {   # צילום מהשטח וכיתוב לכל שירות (רק כשיש צילומים)
    'second-hand': ('ceiling-damp', 'רטיבות בתקרת חדר רחצה, כפי שסומנה בחוות דעת. המקור היה איטום לקוי סביב תריס הוונטה בקיר החוץ.'),
    'private-house': ('plaster-waviness', 'בדיקת גליות בטיח בפלס של 1 מ׳: נמדד מרווח של 6 מ״מ, והתקן מתיר 5.'),
    'new-apartment': ('sash-gap', 'חופש של כ־8 מ״מ בכנף ויטרינה סגורה ונעולה. התקן מתיר 4 מ״מ.'),
    'after-renovation': ('tile-lippage', 'הפרש גובה בין אריחים, נמדד בטריז. התקן מתיר עד 1.5 מ״מ.'),
    'expert-opinion': ('plumb-laser', 'בדיקת אנכיות הטיח: קרן לייזר כקו ייחוס, ומדידה בשלושה גבהים, לפי שיטת הבדיקה בתקן.'),
    'counter-inspection': ('sliding-door-box', 'ארגז עליון מאולתר בדלת הזזה, כפי שסומן בחוות דעת.'),
}
REPORT_STEP = {'expert-opinion': 'חוות הדעת', 'counter-inspection': 'ההתייחסות בכתב'}


def build_service(s):
    pg = Page(s['slug'] + '/index.html')
    home = pg.a('') or './'
    w = s['when']
    extra = (f'<p class="facts-card__more"><a class="link-arrow" href="{pg.a("checklist/")}">רשימת בדיקה למקבלי דירה, להורדה {ARROW}</a></p>'
             if s['slug'] == 'new-apartment' else '')
    body = page_head(pg, s['name'], e(s['lede']), [('דף הבית', home), ('שירותים', pg.a('services/')), (s['name'], None)],
                     side=facts_card(C.FACTS[s['slug']] + [('המחיר', C.PRICE_LINE)], extra=extra), acts=actions(pg, s['wa']))
    paras = ''.join(f'<p>{e(x)}</p>' for x in w['p'])
    body += section('when', w['h2'], f'<div class="prose"><p class="lead">{e(w["lead"])}</p>{paras}</div>')
    pic = None
    if HAS_FIELD and s['slug'] in SERVICE_PICS and field_item(SERVICE_PICS[s['slug']][0]):
        x = field_item(SERVICE_PICS[s['slug']][0])
        pic = (pg.a('assets/img/field/' + x['img'] + '.webp'), SERVICE_PICS[s['slug']][1], x['alt'])
    body += section('checks', s['list']['h2'], checks_split(s['list']['rows'], pic), e(s['list']['intro']), cls='section--paper')
    report_title = REPORT_STEP.get(s['slug'], 'דוח תוך שבוע')
    report_note = s['report_note'] + ('' if s['slug'] in REPORT_STEP else ' ה־PDF מגיע תוך שבוע, בוואטסאפ ובמייל.')
    items = [C.PROCESS[0], (C.PROCESS[1][0], s.get('visit') or C.PROCESS[1][1]), (report_title, report_note), C.PROCESS[3]]
    if s['slug'] != 'counter-inspection':
        body += section('process', 'מה מקבלים ואיך זה עובד', steps(items))
    body += section('faq', 'שאלות על ' + s['row'], faq_list(s['faq'], pg), cls='section--paper')
    body += contact_section(pg, s['close'][0], s['close'][1], preset=s['slug'], cls='')
    body += related_section(pg, s['related'])
    schema = graph({'@type': 'Service', 'name': s['name'], 'serviceType': s['name'], 'description': s['desc'], 'url': f"{SITE_URL}/{s['slug']}/",
                    'provider': {'@id': SITE_URL + '/#business'}, 'areaServed': {'@type': 'AdministrativeArea', 'name': 'צפון ישראל'}},
                   org_schema(), crumbs_schema([('דף הבית', ''), ('שירותים', 'services/'), (s['name'], s['slug'] + '/')]), faq_schema(s['faq']))
    page(pg, s['title'], s['desc'], body, schema, current='services', wa_text=s['wa'])


# ---------- לעורכי דין ----------
def build_lawyers():
    pg = Page('lawyers/index.html')
    L = C.LAWYERS
    home = pg.a('') or './'
    card = (f'<div class="facts-card bizcard"><img class="bizcard__logo" src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="{BRAND}" width="607" height="118">'
            f'<p class="bizcard__name">רביד קרודו</p><p class="bizcard__title">הנדסאי בניין רשום · מ.ר {C.REG}</p>'
            f'<dl class="facts"><div><dt>טלפון</dt><dd><a href="tel:{C.PHONE_INTL}" data-tel="card"><span class="ltr">{C.PHONE}</span></a></dd></div>'
            f'<div><dt>מייל</dt><dd><a href="mailto:{C.EMAIL}">{C.EMAIL}</a></dd></div><div><dt>אזור</dt><dd>{e(C.AREA)}</dd></div></dl>'
            f'<a class="btn btn--secondary" href="{pg.a("assets/krudo-engineering.vcf")}" download data-vcf>שמירת איש קשר</a></div>')
    body = page_head(pg, 'לעורכי דין, מתווכים ושמאים', e(L['lede']), [('דף הבית', home), ('לעורכי דין ומתווכים', None)],
                     side=card, acts=actions(pg, L['wa'], 'להפניית לקוח בוואטסאפ'))
    refer = ''.join(f'<li class="svc"><h3 class="svc__name"><a href="{pg.a(href)}">{e(a)}</a></h3><dl class="svc__facts"><div><dt>מתי</dt><dd>{e(b)}</dd></div>'
                    f'<div><dt>מה מקבלים</dt><dd>{e(c)}</dd></div></dl><span class="svc__more" aria-hidden="true">לפרטים ←</span></li>' for href, a, b, c in L['refer'])
    body += section('refer', L['refer_h2'], f'<ul class="svc-list svc-list--row">{refer}</ul>')
    send = ''.join(f'<li>{e(x)}</li>' for x in L['send'])
    get = ''.join(f'<li>{e(x)}</li>' for x in L['get'])
    work = (f'<p class="lead work__statement">{e(L["statement"])}</p><div class="work">'
            f'<div class="work__col"><h3>{e(L["send_h2"])}</h3><ul class="ticks">{send}</ul></div>'
            f'<div class="work__col"><h3>{e(L["get_h2"])}</h3><ul class="ticks">{get}</ul></div></div>')
    body += section('work', 'איך עובדים יחד', work, cls='section--paper')
    body += section('report', 'דוח לדוגמה', sample_report(pg), e('כך נראה סעיף בחוות דעת של רביד. בלי פרטים מזהים.'))
    body += section('faq', 'שאלות של אנשי מקצוע', faq_list(L['faq'], pg), cls='section--paper')
    body += contact_section(pg, 'להפנות לקוח', 'בחרו את סוג הבדיקה ושלחו את פרטי הנכס. תמונות ודוחות קיימים מצרפים בצ׳אט.', cls='')
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('לעורכי דין ומתווכים', 'lawyers/')]), faq_schema(L['faq']))
    page(pg, L['title'], L['desc'], body, schema, current='lawyers', wa_text=L['wa'])


# ---------- אודות ----------
def build_about():
    pg = Page('about/index.html')
    A, h = C.ABOUT, C.HOME
    home = pg.a('') or './'
    logo = (f'<p class="assoc"><img src="{pg.a("assets/img/brand/engineers-association.png")}" alt="איגוד המהנדסים לבנייה ולתשתיות" width="168" height="111">'
            f'<span>מאתר ליקויי בנייה מטעם איגוד המהנדסים לבנייה ולתשתיות</span></p>')
    body = page_head(pg, 'רביד קרודו', e(A['lede']), [('דף הבית', home), ('אודות', None)],
                     side=facts_card(h['about_facts'], 'בקצרה', logo), acts=actions(pg, label='לדבר עם רביד בוואטסאפ'))
    story = ''.join(f'<p>{e(x)}</p>' for x in A['story'])
    body += section('story', 'למה קרודו הנדסה', f'<div class="prose"><p class="lead">{e(A["statement"])}</p>{story}</div>')
    creds = ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in A['creds'])
    body += section('creds', A['creds_h2'], f'<dl class="facts facts--wide">{creds}</dl>', cls='section--paper')
    recs = ''.join(f'<div class="work__col"><h3>{e(t)}</h3><ul class="ticks">{"".join(f"<li>{e(x)}</li>" for x in items)}</ul></div>' for t, items in h['records'])
    body += section('fields', 'תחומים ולקוחות', f'<div class="work">{recs}</div>')
    body += cta_band(pg, 'לדבר עם רביד', 'שלחו כמה פרטים בוואטסאפ, או התקשרו. רביד עונה בעצמו.')
    schema = graph(person_schema(), org_schema(), crumbs_schema([('דף הבית', ''), ('אודות', 'about/')]))
    page(pg, A['title'], A['desc'], body, schema, current='about')


# ---------- צור קשר ----------
def build_contact():
    pg = Page('contact/index.html')
    K = C.CONTACT
    home = pg.a('') or './'
    body = page_head(pg, 'צרו קשר', e(K['lede']), [('דף הבית', home), ('צרו קשר', None)])
    body += contact_section(pg, 'תיאום בדיקה', 'בחרו סוג בדיקה והוסיפו מה שאתם יודעים. תמונות מצרפים בצ׳אט.', sid='form', cls='')
    body += section('next', K['next_h2'], steps(K['next']), cls='section--paper')
    area = (f'<figure class="area"><img src="{pg.a("assets/img/photo/valley-1600.webp")}" srcset="{pg.a("assets/img/photo/valley-900.webp")} 900w, {pg.a("assets/img/photo/valley-1600.webp")} 1600w, {pg.a("assets/img/photo/valley-1920.webp")} 1920w" '
            f'sizes="(max-width: 1240px) 100vw, 1200px" alt="עמק יזרעאל כפי שהוא נראה מהכרמל: שדות, יישובים וגבעות" width="1600" height="900" loading="lazy" decoding="async">'
            f'<figcaption>עמק יזרעאל מהכרמל.</figcaption></figure>')
    body += section('area', 'אזור העבודה', area, e(f'{C.AREA_TOWNS}, עד כ־50 ק״מ מקריית טבעון. לחוות דעת ולנכסים גדולים, אפשר לתאם גם רחוק יותר.'))
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('צרו קשר', 'contact/')]))
    page(pg, K['title'], K['desc'], body, schema, current='contact', credit=VALLEY_CREDIT)


# ---------- ליקויים מהשטח ----------
def build_field():
    if not HAS_FIELD:
        return
    F = C.FIELD
    pg = Page('field/index.html')
    home = pg.a('') or './'
    side = facts_card([('הבדיקה', 'ויזואלית ולא הורסת, עם ציוד מדידה'), ('בכל סעיף', 'ממצא, מסקנות וסעיף התקן, המלצה, תמחור ותמונות'),
                       ('תמחור', 'לפי מחירון דקל, לפני מע״מ וכולל מע״מ'), ('נספחים', 'סעיפי התקנים שעליהם נשען כל ממצא')], 'איך בנוי כל ממצא בדוח')
    body = page_head(pg, 'ליקויים מהשטח', e(F['lede']), [('דף הבית', home), ('ליקויים מהשטח', None)], side=side)
    for i, (key, name) in enumerate(F['groups']):
        items = [x for x in F['items'] if x['group'] == key]
        if items:
            body += section('g-' + key, name, photo_cards(pg, items, full=True), cls='' if i % 2 == 0 else 'section--paper')
    body += cta_band(pg, 'מצאתם משהו דומה?', 'שלחו תמונה ופרטים בוואטסאפ, ורביד יגיד אם צריך בדיקה, ואיזו.')
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('ליקויים מהשטח', 'field/')]))
    page(pg, F['title'], F['desc'], body, schema, current='field')


# ---------- מאמרים, מדריכים ועמודי מסמך ----------
def fmt_date(d):
    months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    y, m, dd = d.split('-')
    return f'{int(dd)} ב{months[int(m) - 1]} {y}'


def doc_page(pg, h1, meta, crumb_items, body_html, aside_html='', head_extra='', head_pre=''):
    head_ = (f'<section class="page-head page-head--doc" aria-labelledby="h1"><div class="wrap">{head_pre}{crumbs(pg, crumb_items)}<h1 id="h1">{e(h1)}</h1>'
             + (f'<p class="lede">{meta}</p>' if meta else '') + head_extra + '</div></section>')
    aside = f'<div class="article__aside no-print">{aside_html}</div>' if aside_html else ''
    return (head_ + f'<div class="section section--doc"><div class="wrap article-layout{" has-aside" if aside_html else ""}">'
            f'<article class="article__body" aria-labelledby="h1">{body_html}</article>{aside}</div></div>')


def blocks_html(blocks):
    parts = []
    for kind, val in blocks:
        if kind == 'p':
            parts.append(f'<p>{e(val)}</p>')
        elif kind == 'h2':
            parts.append(f'<h2>{e(val)}</h2>')
        elif kind == 'ul':
            parts.append('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in val) + '</ul>')
        elif kind == 'table':
            head_, *rows = val
            parts.append('<div class="table-wrap"><table><thead><tr>' + ''.join(f'<th scope="col">{e(x)}</th>' for x in head_) + '</tr></thead><tbody>' +
                         ''.join('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>' for r in rows) + '</tbody></table></div>')
    return ''.join(parts)


def aside_card(pg, title, text, wa_text, link=None):
    lk = f'<p><a class="link-arrow" href="{link[0]}">{e(link[1])} {ARROW}</a></p>' if link else ''
    return (f'<div class="aside-card"><p class="aside-card__h">{e(title)}</p><p>{e(text)}</p>'
            f'<a class="btn btn--primary" href="{wa(wa_text)}" data-wa="aside">{ico_wa()}לתיאום בוואטסאפ</a>{lk}</div>')


def build_articles():
    idx = Page('articles/index.html')
    home = idx.a('') or './'
    K = C.CHECKLIST
    cards = (f'<li class="svc"><p class="svc__kicker">מדריך להורדה</p><h2 class="svc__name"><a href="{idx.a("checklist/")}">{e(" ".join(K["h1"]))}</a></h2>'
             f'<p class="svc__who">{e(K["lede"])}</p><span class="svc__more" aria-hidden="true">למדריך ←</span></li>')
    cards += ''.join(f'<li class="svc"><p class="svc__kicker"><time datetime="{a["date"]}">{fmt_date(a["date"])}</time></p><h2 class="svc__name"><a href="{a["slug"]}/">{e(a["title"])}</a></h2>'
                     f'<p class="svc__who">{e(a["desc"])}</p><span class="svc__more" aria-hidden="true">לקריאה ←</span></li>' for a in C.ARTICLES)
    body = page_head(idx, 'מאמרים ומדריכים', e('מה שכדאי לדעת לפני שקונים, מקבלים מפתח או נכנסים למחלוקת. כתב רביד קרודו.'),
                     [('דף הבית', home), ('מאמרים ומדריכים', None)], acts='')
    body += f'<section class="section" aria-label="רשימת המאמרים והמדריכים"><div class="wrap"><ul class="svc-list svc-list--row">{cards}</ul></div></section>'
    page(idx, 'מאמרים ומדריכים על בדק בית וליקויי בנייה', 'מאמרים ומדריכים של רביד קרודו, הנדסאי בניין רשום: רשימת בדיקה למקבלי דירה, איך לקרוא מפרט טכני, ליקויים נפוצים ואחריות הקבלן.', body,
         graph(org_schema(), crumbs_schema([('דף הבית', ''), ('מאמרים ומדריכים', 'articles/')])), current='articles')
    for a in C.ARTICLES:
        pg = Page(f'articles/{a["slug"]}/index.html')
        svc = SVC[a['service']]
        meta = f'רביד קרודו · <time datetime="{a["date"]}">{fmt_date(a["date"])}</time> · עודכן <time datetime="{a["updated"]}">{fmt_date(a["updated"])}</time>'
        body = doc_page(pg, a['title'], meta, [('דף הבית', pg.a('') or './'), ('מאמרים ומדריכים', pg.a('articles/')), (a['title'], None)],
                        blocks_html(a['body']), aside_card(pg, svc['name'], svc['lede'], svc['wa'], (pg.a(svc['slug'] + '/'), 'על הבדיקה')))
        schema = graph({'@type': 'Article', 'headline': a['title'], 'description': a['desc'], 'inLanguage': 'he-IL', 'datePublished': a['date'], 'dateModified': a['updated'],
                        'author': {'@id': SITE_URL + '/#ravid'}, 'publisher': {'@id': SITE_URL + '/#business'}, 'mainEntityOfPage': f'{SITE_URL}/articles/{a["slug"]}/'},
                       person_schema(), org_schema(), crumbs_schema([('דף הבית', ''), ('מאמרים ומדריכים', 'articles/'), (a['title'], f'articles/{a["slug"]}/')]))
        page(pg, a['title'], a['desc'], body, schema, current='articles')


def build_checklist():
    pg = Page('checklist/index.html')
    K = C.CHECKLIST
    secs = ''.join(f'<section aria-labelledby="cl-{i}"><h2 id="cl-{i}">{e(t)}</h2><ul>{"".join(f"<li>{e(x)}</li>" for x in items)}</ul></section>' for i, (t, items) in enumerate(K['sections']))
    logo = f'<p class="print-only"><img src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="{BRAND}" width="200" height="39"></p>'
    body_html = (f'<div class="checklist">{secs}</div><p class="print-only">{e(K["end"])} רביד קרודו, הנדסאי בניין רשום · {C.PHONE} · krudoeng.com</p>')
    tools = (f'<div class="actions no-print"><a class="btn btn--primary" href="{pg.a("assets/krudo-checklist.pdf")}" download data-pdf>הורדה כ־PDF</a>'
             f'<button class="btn btn--secondary" type="button" data-print>הדפסה</button></div>')
    body = doc_page(pg, ' '.join(K['h1']), e(K['lede']), [('דף הבית', pg.a('') or './'), ('מאמרים ומדריכים', pg.a('articles/')), ('רשימת בדיקה', None)],
                    body_html, aside_card(pg, 'רוצים שרביד יבדוק?', K['end'], SVC['new-apartment']['wa'], (pg.a('new-apartment/'), 'בדק בית לדירה חדשה')), head_extra=tools, head_pre=logo)
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('מאמרים ומדריכים', 'articles/'), ('רשימת בדיקה', 'checklist/')]))
    page(pg, K['title'], K['desc'], body, schema, current='articles')


# ---------- English ----------
def build_en():
    pg = Page('en/index.html', lang='en')
    E = C.EN
    hero = (f'<section class="hero dark" aria-labelledby="h1"><div class="wrap hero__grid">'
            f'<div class="hero__text"><h1 id="h1">{e(" ".join(E["h1"]))}</h1><p class="lede">{e(E["lede"])}</p>{actions(pg, lang="en")}'
            f'<p class="hero__trust">Reg. 38633308 · Building defects inspector, Israel Association of Construction and Infrastructure Engineers</p></div>'
            f'<figure class="hero__visual"><img class="hero__img" src="{pg.a("assets/img/apt/eye-1280.webp")}" srcset="{pg.a("assets/img/apt/eye-1280.webp")} 1280w, {pg.a("assets/img/apt/eye-2048.webp")} 2048w" '
            f'sizes="(min-width: 901px) 54vw, 100vw" width="2048" height="1360" alt="Illustration: a sample apartment seen from above, with the defects an inspector looks for highlighted">'
            f'<figcaption class="eye"><p class="eye__say">Illustration: what an inspector looks for.</p></figcaption></figure></div></section>')
    cards = ''.join(f'<li class="svc"><h3 class="svc__name">{e(a)}</h3><dl class="svc__facts"><div><dt>When</dt><dd>{e(b)}</dd></div><div><dt>You get</dt><dd>{e(c)}</dd></div></dl></li>' for a, b, c in E['services'])
    body = hero + section('services', E['services_h2'], f'<ul class="svc-list svc-list--row">{cards}</ul>')
    body += section('process', E['process_h2'], steps(E['process']), cls='section--paper')
    about = (f'<div class="about-teaser"><div class="prose"><p class="lead">{e(E["about"][0])}</p><p>{e(E["about"][1])}</p></div>'
             f'<div class="facts-card"><dl class="facts"><div><dt>Registration</dt><dd>Registered construction practical engineer, 38633308</dd></div>'
             f'<div><dt>Based in</dt><dd>Kiryat Tivon</dd></div><div><dt>Area</dt><dd>Northern Israel, up to about 50 km</dd></div></dl></div></div>')
    body += section('about', E['about_h2'], about)
    faq = ''.join(f'<details class="faq__item"><summary>{e(qq)}</summary><div class="faq__a">{"".join(f"<p>{e(x)}</p>" for x in a)}</div></details>' for qq, a in E['faq'])
    body += section('faq', E['faq_h2'], f'<div class="faq">{faq}</div>', cls='section--paper')
    body += (f'<section class="section" id="contact" aria-labelledby="contact-h"><div class="wrap cta-band"><div><h2 id="contact-h">{e(E["contact_h2"])}</h2>'
             f'<p class="lead">{e(E["contact_p"])} <a class="link-arrow" href="mailto:{C.EMAIL}">{C.EMAIL}</a></p></div>{actions(pg, lang="en")}</div></section>')
    schema = graph({**org_schema(), 'name': 'Krudo Engineering', 'alternateName': BRAND, 'description': E['desc']})
    page(pg, E['title'], E['desc'], body, schema, alt_en=True, full_title=E['title'])


# ---------- נגישות ופרטיות ----------
def build_legal():
    pg = Page('accessibility/index.html')
    acc = [
        ('h2', 'מחויבות לנגישות'),
        ('p', 'קרודו הנדסה רואה חשיבות במתן שירות שוויוני לכל הלקוחות, ובכלל זה לאנשים עם מוגבלות. האתר נבנה כך שיהיה נגיש, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג־2013, ולתקן הישראלי ת״י 5568 המבוסס על הנחיות WCAG ברמה AA.'),
        ('h2', 'מה נעשה באתר'),
        ('ul', ['ניווט מלא במקלדת, עם סימון ברור של הרכיב שבפוקוס, וקישור "דילוג לתוכן" בראש כל עמוד', 'מבנה סמנטי: כותרות לפי סדר, אזורי ניווט מסומנים ורשימות אמיתיות', 'ניגודיות צבעים לפי הנחיות AA, טקסט בסיסי בגודל 18 פיקסלים, ושום טקסט קטן מ־16 פיקסלים', 'טקסט חלופי לתמונות, ותיאור מילולי להמחשות', 'באתר אין אנימציות. ההמחשה התלת־ממדית משתנה רק כשלוחצים על "מבט של בודק", ובהגדרת "הפחתת תנועה" של מערכת ההפעלה גם המעבר הזה מיידי', 'כל התוכן נקרא גם בלי JavaScript, וכל ההמחשות מוצגות גם כתמונה סטטית', 'שדות הטופס מתויגים, והודעות שגיאה מוקראות', 'האתר מותאם לנייד, לטאבלט ולמחשב, ותומך בהגדלת טקסט עד 200%']),
        ('h2', 'מגבלות ידועות'),
        ('p', 'ההמחשה התלת־ממדית של הדירה היא חזותית. כל מה שהיא מראה מתואר גם בטקסט שלידה, והממצאים שבה הם כפתורים עם שם מילולי.'),
        ('h2', 'נתקלתם בבעיה?'),
        ('p', f'אם משהו באתר לא נגיש לכם, נשמח לדעת ולתקן. רכז הנגישות: רביד קרודו, טלפון {C.PHONE}, מייל {C.EMAIL}. נשתדל לחזור אליכם תוך שלושה ימי עבודה.'),
        ('p', f'הצהרה זו עודכנה ב{C.LEGAL_DATE}.'),
    ]
    priv = [
        ('h2', 'בקצרה'),
        ('p', 'האתר לא שומר מידע אישי. כשממלאים את הטופס, הפרטים לא נשלחים לשרת של האתר: הם נפתחים אצלכם כהודעה מוכנה בוואטסאפ, ואתם מחליטים אם לשלוח אותה.'),
        ('h2', 'איזה מידע אנחנו מקבלים'),
        ('p', 'רק מה שאתם שולחים לנו בעצמכם: בוואטסאפ, בטלפון או במייל. בדרך כלל שם, טלפון, סוג הנכס, עיר, גודל, ותיאור של מה שצריך לבדוק, ולפעמים תמונות או מסמכים.'),
        ('h2', 'למה משתמשים בו'),
        ('p', 'כדי לחזור אליכם, לתאם בדיקה, לתת הצעת מחיר ולהכין את הדוח. המידע לא נמכר ולא מועבר לאחרים, מלבד מה שנדרש כדי לתת את השירות או לפי חוק.'),
        ('h2', 'עוגיות ומדידה'),
        ('p', 'האתר לא משתמש כרגע בעוגיות ולא בכלי מדידה או פרסום. אם יתווספו בעתיד, העמוד הזה יעודכן לפני כן.'),
        ('h2', 'שירותים של אחרים'),
        ('p', 'ההודעות עוברות דרך וואטסאפ, שירות של Meta, וכפופות למדיניות הפרטיות שלו. מייל נשלח דרך ספק הדואר שלכם ושלנו.'),
        ('h2', 'הזכויות שלכם'),
        ('p', f'לפי חוק הגנת הפרטיות, אפשר לבקש לעיין במידע שלכם שנמצא אצלנו, לתקן אותו או למחוק אותו. פנו לרביד קרודו: {C.PHONE}, {C.EMAIL}.'),
        ('p', f'עודכן ב{C.LEGAL_DATE}.'),
    ]
    for path, title, desc, blocks, h1 in [
        ('accessibility/index.html', 'הצהרת נגישות', 'הצהרת הנגישות של אתר קרודו הנדסה: מה נעשה כדי שהאתר יהיה נגיש, מגבלות ידועות, ופרטי רכז הנגישות.', acc, 'הצהרת נגישות'),
        ('privacy/index.html', 'מדיניות פרטיות', 'מדיניות הפרטיות של אתר קרודו הנדסה: האתר לא שומר מידע אישי, והטופס נפתח כהודעת וואטסאפ.', priv, 'מדיניות פרטיות'),
    ]:
        pg = Page(path)
        body = doc_page(pg, h1, '', [('דף הבית', pg.a('') or './'), (h1, None)], blocks_html(blocks))
        page(pg, title, desc, body)


# ---------- 404 והפניות מהכתובות הישנות ----------
OLD = [
    ('בדק-בית-דירה-חדשה-מקבלן', 'new-apartment/'), ('בדק-בית-דירה-יד-שניה', 'second-hand/'), ('בדק-בית-דירה-לאחר-שיפוץ', 'after-renovation/'),
    ('חוות-דעת-הנדסית', 'expert-opinion/'), ('blog', 'articles/'), ('הצהרת-נגישות', 'accessibility/'), ('copy-of-הצהרת-נגישות', 'accessibility/'),
    ('מדיניות-פרטיות', 'privacy/'), ('תנאי-שימוש-באתר', 'privacy/'),
] + [('post/' + a['old'], 'articles/' + a['slug'] + '/') for a in C.ARTICLES]


def build_redirects():
    lines_ = []
    for old, new in OLD:
        pg = Page(old + '/index.html')
        target = pg.a(new)
        doc = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
               f'<title>{BRAND}</title><link rel="canonical" href="{SITE_URL}/{new}"><meta http-equiv="refresh" content="0; url={target}"></head>'
               f'<body><p>הדף עבר. <a href="{target}">להמשך</a></p></body></html>\n')
        full = os.path.join(ROOT, pg.path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        open(full, 'w', encoding='utf-8').write(doc)
        enc = '/' + urllib.parse.quote(old)
        lines_.append(f'{enc}  /{new}  301!')
        lines_.append(f'{enc}/  /{new}  301!')
    # Netlify / Cloudflare Pages: הפניות 301 אמיתיות, אם האתר יעלה לשם
    open(os.path.join(ROOT, '_redirects'), 'w', encoding='utf-8').write('# הפניות מהכתובות של האתר הקודם (Wix)\n' + '\n'.join(lines_) + '\n')
    body = (f'<section class="page-head" aria-labelledby="h1"><div class="wrap"><h1 id="h1">הדף לא נמצא</h1>'
            f'<p class="lede">אולי הוא עבר, ואולי נפלה טעות בכתובת. אפשר להמשיך מכאן:</p>'
            f'<div class="actions"><a class="btn btn--secondary" href="/">לדף הבית</a><a class="btn btn--secondary" href="/services/">לשירותים</a>'
            f'<a class="btn btn--primary" href="{wa()}" data-wa="404">{ico_wa()}וואטסאפ לרביד</a></div></div></section>')
    # 404 עובד רק בשורש הדומיין, ולכן הנתיבים בו מתחילים מ-/
    doc404 = Page('404.html')
    doc404.p = '/'
    page(doc404, 'הדף לא נמצא', 'הדף לא נמצא באתר קרודו הנדסה.', body, robots='noindex')


def build_headers():
    h = ('/*\n  X-Frame-Options: DENY\n  Content-Security-Policy: frame-ancestors \'none\'\n  X-Content-Type-Options: nosniff\n'
         '  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n')
    with open(os.path.join(ROOT, '_headers'), 'w', encoding='utf-8') as f:
        f.write('# כותרות אבטחה ל-Netlify ול-Cloudflare Pages\n' + h)


def build_vcf():
    v = ('BEGIN:VCARD\r\nVERSION:3.0\r\nN:קרודו;רביד;;;\r\nFN:רביד קרודו\r\nORG:קרודו הנדסה\r\nTITLE:הנדסאי בניין רשום\\, מ.ר 38633308\r\n'
         f'TEL;TYPE=CELL,VOICE:{C.PHONE_INTL}\r\nEMAIL;TYPE=INTERNET:{C.EMAIL}\r\nADR;TYPE=WORK:;;מעלה אבשלום 65;קריית טבעון;;3609464;ישראל\r\n'
         f'URL:{SITE_URL}/\r\nNOTE:בדק מבנים\\, איתור ליקויי בנייה ופיקוח הנדסי. בדק בית\\, בדיקה נגדית וחוות דעת הנדסית בצפון\r\nEND:VCARD\r\n')
    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    open(os.path.join(ROOT, 'assets', 'krudo-engineering.vcf'), 'w', encoding='utf-8', newline='').write(v)


def build_seo_files():
    sm, rb = os.path.join(ROOT, 'sitemap.xml'), os.path.join(ROOT, 'robots.txt')
    if not LAUNCH:
        for f in (sm, rb):
            if os.path.exists(f):
                os.remove(f)
        return
    urls = ''.join(f'<url><loc>{SITE_URL}/{u}</loc></url>' for u in sorted(set(PAGES)) if u != '404.html')
    open(sm, 'w', encoding='utf-8').write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    open(rb, 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n')


def main():
    build_home()
    build_services()
    for s in C.SERVICES:
        build_service(s)
    build_lawyers()
    build_about()
    build_contact()
    build_checklist()
    build_field()
    build_articles()
    build_en()
    build_legal()
    build_redirects()
    build_headers()
    build_vcf()
    build_seo_files()
    print(f'built {len(PAGES)} pages, {len(OLD)} redirects · launch={LAUNCH}')


if __name__ == '__main__':
    main()
