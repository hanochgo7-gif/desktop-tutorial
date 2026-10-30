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
V = '1'  # גרסה לקבצי ה-CSS וה-JS, כדי שדפדפנים יטענו מחדש אחרי עדכון
BRAND = 'קרודו הנדסה'

INLINE_JS = "document.documentElement.classList.add('js')"
JS_HASH = "'sha256-" + base64.b64encode(hashlib.sha256(INLINE_JS.encode()).digest()).decode() + "'"
CSP = ("default-src 'self'; script-src 'self' " + JS_HASH + "; style-src 'self'; img-src 'self' data:; font-src 'self'; "
       "connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'")

e = html.escape
SVC = {s['slug']: s for s in C.SERVICES}
HAS_FIELD = bool(C.FIELD['items'])   # דף "ליקויים מהשטח" נוצר רק כשיש צילומים אמיתיים
POSTERS = {}   # תמונות סטטיות של הדגם, נוצרות ב-tools/render.mjs
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


def bar(pg, current=None):
    if pg.lang == 'en':
        return (f'<header class="bar" data-bar><a class="bar__brand" href="{pg.a("")}" aria-label="{BRAND}, Hebrew site"><img src="{pg.a("assets/img/brand/wordmark-light.svg")}" alt="Krudo Engineering" width="607" height="103"></a>'
                f'<nav class="bar__nav" aria-label="Main"><a href="#services">Services</a><a href="#about">Ravid</a><a href="{pg.a("")}" lang="he" hreflang="he">עברית</a>'
                f'<a class="btn btn--accent bar__cta" href="{wa(C.EN["wa"])}" data-wa="bar">WhatsApp</a></nav><a class="btn btn--accent bar__wa" href="{wa(C.EN["wa"])}" data-wa="bar-mobile">{ico_wa()}WhatsApp</a></header>')
    home = pg.path == 'index.html'
    services = '#services' if home else pg.a('#services')
    items = [('services', services, 'שירותים', ''), ('lawyers', pg.a('lawyers/'), 'לעורכי דין ומתווכים', ''),
             ('about', pg.a('about/'), 'על רביד', ''), ('articles', pg.a('articles/'), 'מאמרים', 'opt'), ('en', pg.a('en/'), 'English', 'opt')]
    if HAS_FIELD:
        items.insert(1, ('field', pg.a('field/'), 'ליקויים מהשטח', ''))
    links = ''.join(f'<a href="{h}"{" class=" + chr(34) + c + chr(34) if c else ""}{" aria-current=" + chr(34) + "page" + chr(34) if k == current else ""}{" lang=" + chr(34) + "en" + chr(34) if k == "en" else ""}>{t}</a>' for k, h, t, c in items)
    menu_services = ''.join(f'<li class="sm"><a href="{pg.a(s["slug"] + "/")}">{s["name"]}</a></li>' for s in C.SERVICES)
    return (f'<header class="bar" data-bar>'
            f'<a class="bar__brand" href="{pg.a("") or "./"}" aria-label="{BRAND}, לדף הבית"><img src="{pg.a("assets/img/brand/wordmark-light.svg")}" alt="{BRAND}" width="607" height="103"></a>'
            f'<nav class="bar__nav" aria-label="ראשי">{links}<a class="btn btn--accent bar__cta" href="{wa()}" data-wa="bar">לתיאום בוואטסאפ</a></nav>'
            f'<a class="btn btn--accent bar__wa" href="{wa()}" data-wa="bar-mobile">{ico_wa()}וואטסאפ</a>'
            f'<button class="bar__menu" type="button" aria-expanded="false" aria-controls="menu" data-menu-open>תפריט</button>'
            f'</header>'
            f'<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="תפריט" hidden>'
            f'<div class="menu__top"><a class="bar__brand" href="{pg.a("") or "./"}"><img src="{pg.a("assets/img/brand/wordmark-light.svg")}" alt="{BRAND}" width="607" height="103"></a><button class="menu__close" type="button" data-menu-close>סגירה</button></div>'
            f'<ul class="menu__list"><li><a href="{services}" data-menu-close>שירותים</a></li>{menu_services}'
            + (f'<li><a href="{pg.a("field/")}">ליקויים מהשטח</a></li>' if HAS_FIELD else '') +
            f'<li><a href="{pg.a("lawyers/")}">לעורכי דין ומתווכים</a></li><li><a href="{pg.a("about/")}">על רביד</a></li>'
            f'<li><a href="{pg.a("articles/")}">מאמרים</a></li><li><a href="{pg.a("checklist/")}">רשימת בדיקה למקבלי דירה</a></li><li><a href="{pg.a("contact/")}">יצירת קשר</a></li><li class="sm"><a href="{pg.a("en/")}" lang="en">English</a></li></ul>'
            f'<div class="menu__actions"><a class="btn btn--accent" href="{wa()}" data-wa="menu">{ico_wa()}וואטסאפ לרביד</a><a class="btn btn--quiet" href="tel:{C.PHONE_INTL}" data-tel="menu">{ico_phone()}<span class="ltr">{C.PHONE}</span></a></div>'
            f'</div>')


def foot(pg, credit=None):
    if pg.lang == 'en':
        return (f'<footer class="foot"><p>Krudo Engineering · Kiryat Tivon, northern Israel</p>'
                f'<nav class="foot__links" aria-label="Footer"><a href="{pg.a("")}" lang="he">עברית</a><a href="tel:{C.PHONE_INTL}" data-tel="foot"><span class="ltr">{C.PHONE_EN}</span></a><a href="mailto:{C.EMAIL}">{C.EMAIL}</a></nav>'
                f'<p class="foot__end"><span>© {YEAR}</span><a href="{pg.a("accessibility/")}">Accessibility (Hebrew)</a><a href="{pg.a("privacy/")}">Privacy (Hebrew)</a></p>'
                f'<p class="foot__credit">The apartment model on this site is an illustration.</p></footer>')
    cr = '<p class="foot__credit">' + (credit + ' ' if credit else '') + ('הדירה התלת־ממדית באתר היא המחשה.' if HAS_FIELD else 'הדירה התלת־ממדית ועמוד הדוח באתר הם המחשה.') + '</p>'
    return (f'<footer class="foot"><p>{BRAND} · בדק מבנים, איתור ליקויי בנייה ופיקוח הנדסי</p>'
            f'<nav class="foot__links" aria-label="קישורים בתחתית"><a href="{pg.a("") or "./"}#services">שירותים</a><a href="{pg.a("lawyers/")}">לעורכי דין ומתווכים</a><a href="{pg.a("about/")}">על רביד</a>'
            + (f'<a href="{pg.a("field/")}">ליקויים מהשטח</a>' if HAS_FIELD else '') +
            f'<a href="{pg.a("articles/")}">מאמרים</a><a href="{pg.a("checklist/")}">רשימת בדיקה</a><a href="{pg.a("contact/")}">יצירת קשר</a><a href="{pg.a("en/")}" lang="en">English</a></nav>'
            f'<p class="foot__end"><span>© {YEAR}</span><a href="{pg.a("accessibility/")}">הצהרת נגישות</a><a href="{pg.a("privacy/")}">פרטיות</a></p>{cr}</footer>')


def scripts(pg, model=False):
    s = ''
    if model:
        s += f'<script src="{pg.a("assets/js/apartment.js")}?v={V}" defer></script>'
    s += f'<script src="{pg.a("assets/js/site.js")}?v={V}" defer></script>'
    return s


def page(pg, title, desc, body, schema=None, current=None, model=False, credit=None, robots=None, alt_en=False, full_title=None):
    doc = [head(pg, title, desc, schema, robots, alt_en, full_title=full_title),
           '<body>',
           f'<a class="skip" href="#main">{"דילוג לתוכן" if pg.lang == "he" else "Skip to content"}</a>',
           bar(pg, current),
           f'<main id="main">{body}</main>',
           foot(pg, credit), scripts(pg, model), '</body>', '</html>']
    out = '\n'.join(doc) + '\n'
    full = os.path.join(ROOT, pg.path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(out)
    if not (robots and 'noindex' in robots):
        PAGES.append(pg.url_path)


# ---------- רכיבים ----------
def poster_key(cam, show):
    return (cam or 'overview') + ('--' + show.replace(',', '-') if show else '')


def model(pg, cam='overview', show='', label='', sway=False, focusable=False, idattr=''):
    key = poster_key(cam, show)
    POSTERS[key] = {'cam': cam, 'show': show}
    attrs = f' data-apartment data-cam="{cam}"' + (f' data-show="{show}"' if show else '') + (' data-sway' if sway else '') + (' data-focusable' if focusable else '') + (f' id="{idattr}"' if idattr else '')
    alt = label or 'המחשה תלת־ממדית של דירה לדוגמה'
    return (f'<div class="apt"{attrs} data-ui role="group" aria-label="{e(alt)}">'
            f'<noscript><img class="apt__poster" src="{pg.a("assets/img/scene/" + key + ".webp")}" alt="{e(alt)}" width="1200" height="900"></noscript></div>')


def lines(tag, cls, parts, idattr=''):
    spans = ''.join(f'<span class="line l{i + 1}"><span data-line="{i}">{e(t)}</span></span>' for i, t in enumerate(parts))
    return f'<{tag} class="{cls} lines"{f" id={chr(34)}{idattr}{chr(34)}" if idattr else ""}>{spans}</{tag}>'


def faq_block(items, h2, pg, idattr='faq', h2_id='faq-h'):
    rows = [f'<div class="faq__row" data-reveal><h2 class="faq__q faq__h" id="{h2_id}">{e(h2)}</h2></div>']
    for q, ans in items:
        a = ''.join(f'<p>{x.format(base=pg.p, articles=pg.a("articles/"))}</p>' for x in ans)
        rows.append(f'<div class="faq__row" data-reveal><h3 class="faq__q">{e(q)}</h3><div class="faq__a">{a}</div></div>')
    return f'<section class="faq" id="{idattr}" aria-labelledby="{h2_id}">{"".join(rows)}</section>'


def faq_schema(items):
    import re
    strip = lambda s: re.sub(r'<[^>]+>', '', s)
    return {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': ' '.join(strip(x) for x in a)}} for q, a in items]}


def quote_form(pg, preset=None, lang='he'):
    if lang == 'en':
        return ''
    chips = ''.join(f'<label><input type="radio" name="type" value="{e(s["name"])}"{" checked" if preset == s["slug"] else ""}><span>{e(s["chip"])}</span></label>' for s in C.SERVICES)
    F = C.FORM.get(preset, C.FORM[None])
    return (f'<form class="quote" data-quote novalidate>'
            f'<fieldset aria-describedby="quote-err"><legend>סוג הבדיקה</legend><div class="chips">{chips}</div></fieldset>'
            f'<div class="two"><label><span>עיר</span><input type="text" name="city" autocomplete="address-level2" maxlength="40" data-msg="עיר"></label>'
            f'<label><span>{e(F["size"][0])}</span><input type="text" name="size" inputmode="numeric" maxlength="12" data-msg="{e(F["size"][1])}" data-unit="{e(F["size"][2])}"></label></div>'
            f'<div class="two"><label><span>{e(F["date"])}</span><input type="text" name="date" maxlength="40" data-msg="{e(F["date"])}"></label>'
            f'<label><span>שם</span><input type="text" name="name" autocomplete="name" maxlength="60"></label></div>'
            f'<label><span>מה עוד חשוב לדעת? (לא חובה)</span><textarea name="note" rows="2" maxlength="600" placeholder="{e(F["note"])}" aria-describedby="quote-err"></textarea></label>'
            f'<p class="quote__err" id="quote-err" role="alert"></p>'
            f'<button class="btn btn--accent" type="submit">{ico_wa()}שליחה בוואטסאפ</button>'
            f'<p class="quote__note">ההודעה נפתחת אצלכם בוואטסאפ, ואתם שולחים אותה. האתר לא שומר את הפרטים.</p>'
            f'</form><a class="btn btn--accent nojs-wa" href="{wa()}" data-wa="nojs">{ico_wa()}לתיאום בוואטסאפ</a>')


def row_link(href, c1, c2, c3, r=0):
    return f'<li><a class="row" href="{href}" data-reveal><span class="c1">{e(c1)}</span><span class="c2">{e(c2)}</span><span class="c3">{e(c3)}</span><span class="c4" aria-hidden="true">←</span></a></li>'


def lineup(pg, h2, groups=None, h2_id='services-h', idattr='services', intro=''):
    ip = f'<p class="lineup__intro" data-reveal>{e(intro)}</p>' if intro else ''
    out = [f'<section class="lineup" id="{idattr}" aria-labelledby="{h2_id}"><h2 class="lineup__h" id="{h2_id}" data-reveal>{e(h2)}</h2>{ip}<div class="lineup__table">']
    for gid, gname in (groups or C.GROUPS):
        if gid == 'pro':
            rows = row_link(pg.a(C.PRO_ROW['href']), C.PRO_ROW['row'], C.PRO_ROW['when_short'], C.PRO_ROW['gives'])
        else:
            rows = ''.join(row_link(pg.a(s['slug'] + '/'), s['row'], s['when_short'], s['gives']) for s in C.SERVICES if s['group'] == gid)
        out.append(f'<h3 class="lineup__day">{e(gname)}</h3><ul>{rows}</ul>')
    out.append('</div></section>')
    return ''.join(out)


def process(items, h2_id='process-h', note2=None, note1=None):
    lis = []
    for i, (line, note) in enumerate(items):
        if i == 0 and note1:
            note = note1
        if i == 1 and note2:
            note = note2
        tag = 'h2' if i == 0 else 'p'
        ida = f' id="{h2_id}"' if i == 0 else ''
        lis.append(f'<li class="stair" data-reveal><{tag} class="stair__line"{ida}>{e(line)}</{tag}><p class="stair__note">{e(note)}</p></li>')
    return f'<section class="process" aria-labelledby="{h2_id}"><ol class="stairs">{"".join(lis)}</ol></section>'


def field_item(key):
    return next((x for x in C.FIELD['items'] if x['img'] == key), None)


def field_img(pg, x, lazy=True):
    return (f'<img src="{pg.a("assets/img/field/" + x["img"] + ".webp")}" alt="{e(x["alt"])}" width="718" height="898"'
            + (' loading="lazy"' if lazy else '') + ' decoding="async">')


def sheet(pg):
    S = C.SAMPLE_PAGE
    pics = [(field_item(k), cap) for k, cap in S['pics']]
    if HAS_FIELD and all(x for x, _ in pics):
        figs = ''.join(f'<figure{" data-target=" + chr(34) + "detail" + chr(34) if i == 0 else ""}>{field_img(pg, x)}<figcaption>{e(cap)}</figcaption></figure>' for i, (x, cap) in enumerate(pics))
        return (f'<div class="sheet sheet--real" data-ui aria-hidden="true">'
                f'<div class="sheet__band"><img src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="" width="607" height="118" loading="lazy"><p>בדק מבנים | איתור ליקויי בנייה | פיקוח הנדסי</p></div>'
                f'<div class="sheet__cols"><div class="sheet__text">'
                f'<div class="sheet__box"><h4>{e(S["no"])} · ממצא</h4><p class="sheet__finding">{e(S["finding"])}</p></div>'
                f'<div class="sheet__box" data-target="text"><h4>ממצאים ומסקנות</h4><p>{e(S["text"])}</p></div>'
                f'<div class="sheet__box"><h4>המלצה</h4><p>{e(S["rec"])}</p></div>'
                f'<div class="sheet__box"><h4>תמחור</h4><p>{e(S["price"])}</p></div></div>'
                f'<div class="sheet__box"><h4>תמונות</h4><div class="sheet__pics">{figs}</div></div>'
                f'</div><div class="sheet__foot"><span>רביד קרודו | {BRAND} | מ.ר {C.REG}</span><span>{e(S["foot"])}</span></div></div>')
    return (f'<div class="sheet" data-ui aria-hidden="true">'
            f'<div class="sheet__head"><img src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="" width="607" height="118" loading="lazy"><p><b>דוח בדק בית</b>דירה לדוגמה · המחשה</p></div>'
            f'<div class="sheet__item"><div class="sheet__shot"><i class="mark" data-target="detail"></i></div><div data-target="text">'
            f'<div class="sheet__no">ממצא: רטיבות בקיר</div>'
            f'<p class="sheet__row"><span>מיקום</span>קיר חדר הרחצה, בצד הפונה לסלון</p>'
            f'<p class="sheet__row"><span>מה נמצא</span>אזור קר במצלמה התרמית, ומד הלחות מאשר לחות גבוהה בגובה הריצוף.</p>'
            f'<p class="sheet__row"><span>המלצה</span>לאתר את מקור הנזילה ולתקן אותו, ורק אחר כך לחדש טיח וצבע.</p></div></div>'
            f'<div class="sheet__item"><div class="sheet__shot crack"><svg viewBox="0 0 330 300" aria-hidden="true"><path d="M330 70 L300 58 L286 66 L252 40 L232 46 L198 20 L176 26 L150 0" fill="none" stroke="#c4541f" stroke-width="4" stroke-linejoin="round"/><path d="M0 0H140V300H0Z" fill="#dfe7eb"/><path d="M140 0V300" stroke="#b9c7cf" stroke-width="6"/></svg></div><div>'
            f'<div class="sheet__no">ממצא: סדק בטיח</div>'
            f'<p class="sheet__row"><span>מיקום</span>קיר הסלון, מהפינה העליונה של החלון</p>'
            f'<p class="sheet__row"><span>מה נמצא</span>סדק אלכסוני שיוצא מפינת החלון.</p>'
            f'<p class="sheet__row"><span>המלצה</span>לבדוק את המקור, ולעקוב אחרי רוחב הסדק לפני תיקון.</p></div></div>'
            f'<div class="sheet__foot"><span>{BRAND} · רביד קרודו, הנדסאי בניין רשום</span><span>המחשה</span></div>'
            f'</div>')


def sample_link(pg):
    if not C.SAMPLE_REPORT:
        return ''
    return f' <a class="arrow-link" href="{pg.a(C.SAMPLE_REPORT)}" download data-sample>דוח אמיתי לדוגמה, PDF <span aria-hidden="true">←</span></a>'


def field_strip(pg):
    if not HAS_FIELD:
        return ''
    F = C.FIELD
    pick = [x for x in F['items'] if x.get('short')][:3]
    figs = ''.join(f'<li data-reveal><figure>{field_img(pg, x)}<figcaption><b>{e(x["found"])}</b><span>{e(x["short"])}</span></figcaption></figure></li>' for x in pick)
    return (f'<section class="strip" aria-labelledby="strip-h"><div class="strip__head"><h2 id="strip-h" data-reveal>{e(F["strip_h2"])}</h2><p data-reveal>{e(F["strip_p"])}</p></div>'
            f'<ul class="strip__grid">{figs}</ul>'
            f'<p class="strip__more" data-reveal><a class="arrow-link" href="{pg.a("field/")}">עוד ליקויים מהשטח, עם מה שנמדד ומה שהומלץ <span aria-hidden="true">←</span></a></p></section>')


def report_section(pg):
    h = C.HOME
    return (f'<section class="report" id="report" aria-labelledby="report-h" data-report>'
            f'<div class="report__marks" aria-hidden="true"><i></i><i></i><i></i></div>'
            f'<div class="report__stage">'
            f'<h2 class="report__title" id="report-h"><span class="a">{e(h["report_a"])}</span> <span class="b">{e(h["report_b"])}</span></h2>'
            f'<figure class="report__frame">{sheet(pg)}<figcaption class="vh">המחשה של עמוד מתוך דוח בדק בית: ממצא של רטיבות בקיר וממצא של סדק בטיח, עם מיקום, מה נמצא והמלצה.</figcaption></figure>'
            f'<p class="report__cap">{e(h["report_cap"])}<small>{e(h["report_note"])}</small>{sample_link(pg)}</p>'
            f'</div></section>')


def page_hero(pg, h1, lede, actions, crumbs=None, mdl=None, wide=False, side='', cls=''):
    cr = ''
    if crumbs:
        cr = '<nav class="crumbs" aria-label="מיקום באתר">' + ' <span aria-hidden="true">/</span> '.join(f'<a href="{h}">{e(t)}</a>' if h else f'<span aria-current="page">{e(t)}</span>' for t, h in crumbs) + '</nav>'
    m = ''
    if mdl:
        m = f'<figure class="page-hero__model">{model(pg, mdl["cam"], mdl["show"], mdl.get("label", mdl["cap"]))}<figcaption>{e(mdl["cap"])}</figcaption></figure>'
    if side:
        m = f'<div class="page-hero__side" data-load="3">{side}</div>'
    return (f'<section class="page-hero{(" " + cls) if cls else ""}" aria-labelledby="h1"><div class="page-hero__text{" wide" if (wide or not mdl) and not side else ""}">{cr}'
            f'{lines("h1", "title", h1, "h1")}'
            f'<p class="page-hero__lede" data-load="1">{lede}</p>'
            f'<div class="page-hero__actions" data-load="2">{actions}</div></div>{m}</section>')


def actions(pg, text, lang='he'):
    if lang == 'en':
        return f'<a class="btn btn--accent" href="{wa(text)}" data-wa="hero">{ico_wa()}WhatsApp Ravid</a><a class="tel" href="tel:{C.PHONE_INTL}" data-tel="hero"><span class="ltr">{C.PHONE_EN}</span></a>'
    return f'<a class="btn btn--accent" href="{wa(text)}" data-wa="hero">{ico_wa()}לתיאום בוואטסאפ</a><a class="tel" href="tel:{C.PHONE_INTL}" data-tel="hero"><span class="ltr">{C.PHONE}</span></a>'


def when_section(w, h2_id='when-h'):
    facts = ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in w['facts'])
    ps = ''.join(f'<p>{e(x)}</p>' for x in w['p'])
    return (f'<section class="when" aria-labelledby="{h2_id}"><div class="when__text" data-reveal><h2 id="{h2_id}">{e(w["h2"])}</h2><p class="lead">{e(w["lead"])}</p>{ps}</div>'
            f'<dl class="when__facts" data-reveal>{facts}</dl></section>')


def list_section(l, h2_id='list-h', pg=None, pic=None):
    rows = ''.join(f'<li data-reveal><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in l['rows'])
    fig = ''
    if pic and pg:
        src, cap, w, h, alt = pic
        fig = (f'<figure class="list__pic" data-reveal><img src="{pg.a(src)}" alt="{e(alt)}" width="{w}" height="{h}" loading="lazy" decoding="async">'
               f'<figcaption>{e(cap)}</figcaption></figure>')
    return (f'<section class="list{" list--pic" if fig else ""}" aria-labelledby="{h2_id}"><div class="list__main"><h2 id="{h2_id}" data-reveal>{e(l["h2"])}</h2>'
            f'<p class="list__intro" data-reveal>{e(l["intro"])}</p><ul class="list__rows">{rows}</ul></div>{fig}</section>')


VALLEY_CREDIT = 'צילום עמק יזרעאל: Mohammad Hijjawi, <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener license" target="_blank">CC BY-SA 4.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Jezreel_Valley_3.jpg" rel="noopener" target="_blank">ויקישיתוף</a>.'


def visit_section(pg, h2, sub, preset=None, h2_id='contact-h', idattr='contact'):
    return (f'<section class="visit" id="{idattr}" aria-labelledby="{h2_id}">'
            f'<figure class="visit__photo"><img src="{pg.a("assets/img/photo/valley-1600.webp")}" srcset="{pg.a("assets/img/photo/valley-900.webp")} 900w, {pg.a("assets/img/photo/valley-1600.webp")} 1600w, {pg.a("assets/img/photo/valley-1920.webp")} 1920w" sizes="100vw" alt="עמק יזרעאל כפי שהוא נראה מהכרמל: שדות, יישובים וגבעות" width="1600" height="900" loading="lazy" decoding="async">'
            f'<figcaption>עמק יזרעאל מהכרמל. אזור העבודה: {e(C.AREA_TOWNS)}</figcaption></figure>'
            f'<div class="visit__inner"><div class="card" data-reveal><h2 id="{h2_id}">{e(h2)}</h2><p class="card__sub">{e(sub)}</p>{quote_form(pg, preset)}'
            f'<div class="card__alt"><a href="tel:{C.PHONE_INTL}" data-tel="card"><span class="ltr">{C.PHONE}</span></a><a href="mailto:{C.EMAIL}">{C.EMAIL}</a><p>{e(C.ADDRESS)} · בודקים {e(C.AREA_IN)}</p></div></div></div></section>')


def related_nav(pg, related):
    links = []
    for slug in related:
        if slug in SVC:
            links.append((pg.a(slug + '/'), SVC[slug]['name']))
        elif slug == 'lawyers':
            links.append((pg.a('lawyers/'), 'לעורכי דין, מתווכים ושמאים'))
        elif slug == 'checklist':
            links.append((pg.a('checklist/'), 'רשימת בדיקה למקבלי דירה'))
    if not links:
        return ''
    items = ''.join(f'<li><a class="arrow-link" href="{h}">{e(t)} <span aria-hidden="true">←</span></a></li>' for h, t in links)
    return f'<nav class="related" aria-label="עוד באתר"><h2 class="related__h">עוד באתר</h2><ul>{items}</ul></nav>'


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
def build_home():
    pg = Page('index.html')
    h = C.HOME
    hero = (f'<section class="hero" aria-labelledby="h1">'
            f'{lines("h1", "hero__title", h["h1"], "h1")}'
            f'<div class="hero__lede"><p data-load="1">{e(h["lede"])}</p><div class="hero__actions" data-load="2">{actions(pg, C.WA_DEFAULT)}</div>'
            f'<div class="hero__eye" data-load="3"><button class="btn btn--quiet" type="button" aria-pressed="false" aria-controls="apt-hero" data-eye="apt-hero"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>מבט של בודק</button>'
            f'<p class="eye-say" aria-live="polite" data-eye-say data-off="{e(h["eye_off"])}" data-on="{e(h["eye_on"])}">{e(h["eye_off"])}</p></div>'
            f'</div>'
            f'<figure class="hero__model" data-load="3">{model(pg, "overview", "", "המחשה תלת־ממדית של דירה לדוגמה: סלון ומטבח, חדר שינה, רחצה, ממ״ד ומרפסת", sway=True, focusable=True, idattr="apt-hero")}</figure>'
            f'</section>')
    steps = []
    for i, s in enumerate(h['steps']):
        checks = ''.join(f'<li><b>{e(t)}</b><span>{e(d)}</span>{f"<span class=tool>{e(tool)}</span>" if tool else ""}</li>' for t, d, tool in s['checks'])
        key = poster_key(s['cam'], s['show'])
        POSTERS[key] = {'cam': s['cam'], 'show': s['show']}
        pic = f'<figure class="step__pic"><img src="{pg.a("assets/img/scene/" + key + ".webp")}" alt="המחשה: {e(s["h3"])}" width="1200" height="900" loading="lazy" decoding="async"></figure>'
        steps.append(f'<article class="step" data-step="{s["id"]}" data-cam="{s["cam"]}" data-show="{s["show"]}" aria-labelledby="st-{s["id"]}">{pic}<h3 id="st-{s["id"]}" data-reveal>{e(s["h3"])}</h3><p data-reveal>{e(s["p"])}</p><ul class="checks" data-reveal>{checks}</ul></article>')
    field = f'<a class="arrow-link" href="{pg.a("field/")}">ליקויים אמיתיים מהשטח <span aria-hidden="true">←</span></a>' if HAS_FIELD else ''
    steps.append(f'<p class="tour__end" data-reveal>{field}<a class="arrow-link" href="{pg.a("checklist/")}">רשימת בדיקה מלאה למקבלי דירה, להורדה <span aria-hidden="true">←</span></a></p>')
    tour = (f'<section class="tour" id="tour" aria-labelledby="tour-h">'
            f'<div class="tour__stage">{model(pg, "overview", "", "המחשה: סיור בדירה לדוגמה, תחנה אחרי תחנה", idattr="apt-tour")}</div>'
            f'<div class="tour__steps" data-tour="apt-tour"><header class="tour__head"><h2 id="tour-h" data-reveal>{e(h["tour_h2"])}</h2><p data-reveal>{e(h["tour_intro"])}</p></header>{"".join(steps)}</div></section>')
    names = ', '.join(f'<span class="n">{e(n)}</span>' for n in h['creds'])
    creds = (f'<section class="creds" aria-labelledby="creds-h"><div class="creds__text" data-reveal data-creds><h2 id="creds-h">{e(h["creds_lead"])}</h2> <p>{names}.</p></div>'
             f'<p class="creds__logo" data-reveal><img src="{pg.a("assets/img/brand/engineers-association.png")}" alt="איגוד המהנדסים לבנייה ולתשתיות" width="168" height="111" loading="lazy">מאתר ליקויי בנייה מטעם איגוד המהנדסים לבנייה ולתשתיות</p></section>')
    facts = ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in h['about_facts'])
    about = (f'<section class="about" id="about" aria-labelledby="about-h"><div class="about__row"><dl class="facts" data-reveal>{facts}</dl>'
             f'<div class="about__text" data-reveal><h2 id="about-h">רביד קרודו</h2><p class="about__para">{e(h["about_para"])}</p><p class="about__more">{e(h["about_more"])}</p>'
             f'<a class="arrow-link" href="{pg.a("about/")}">עוד על רביד <span aria-hidden="true">←</span></a></div></div></section>')
    visit = visit_section(pg, h['contact_h2'], h['contact_sub'])
    findings = '<script type="application/json" id="k-findings">' + json.dumps(C.FINDINGS, ensure_ascii=False) + '</script>'
    body = hero + findings + lineup(pg, h['lineup_h2'], intro=h['lineup_intro']) + creds + tour + field_strip(pg) + process(h['process']) + report_section(pg) + about + faq_block(h['faq'], h['faq_h2'], pg) + visit
    schema = graph(org_schema(), person_schema(), {'@type': 'WebSite', '@id': SITE_URL + '/#website', 'url': SITE_URL + '/', 'name': BRAND, 'inLanguage': 'he-IL', 'publisher': {'@id': SITE_URL + '/#business'}}, faq_schema(h['faq']))
    page(pg, h['title'], h['desc'], body, schema, model=True, credit=VALLEY_CREDIT, alt_en=True, full_title=f'{BRAND} · {h["title"]}')


# ---------- עמודי השירות ----------
SERVICE_PICS = {   # (צילום מהשטח, כיתוב) או None, ותמונת דגם למקרה שאין צילומים
    'second-hand': (('ceiling-damp', 'רטיבות בתקרת חדר רחצה, כפי שסומנה בחוות דעת. המקור היה איטום לקוי סביב תריס הוונטה בקיר החוץ.'), ('moisture--moisture', 'המחשה: רטיבות בקיר, כפי שהיא נראית במצלמה תרמית')),
    'private-house': (None, ('water--moisture-drain', 'המחשה: רטיבות ושיפועי ניקוז')),
    'new-apartment': (('sash-gap', 'חופש של כ־8 מ״מ בכנף ויטרינה סגורה ונעולה. התקן מתיר 4 מ״מ.'), ('plans--plans-electric-rail', 'המחשה: מידות מול התוכנית, חשמל ומעקות')),
    'common-areas': (None, ('structure--cracks-tiles', 'המחשה: סדקים וריצוף')),
    'after-renovation': (('tile-lippage', 'הפרש גובה בין אריחים, נמדד בטריז. התקן מתיר עד 1.5 מ״מ.'), ('structure--cracks-tiles', 'המחשה: סדקים וריצוף אחרי עבודות')),
    'expert-opinion': (('plumb-laser', 'בדיקת אנכיות הטיח: קרן לייזר כקו ייחוס, ומדידה בשלושה גבהים, לפי שיטת הבדיקה בתקן.'), ('structure--cracks-tiles', 'המחשה: סדק מפינת החלון, ואריחים חלולים')),
    'counter-inspection': (('sliding-door-box', 'ארגז עליון מאולתר בדלת הזזה, כפי שסומן בחוות דעת.'), ('moisture--moisture', 'המחשה: ממצא שנבדק מחדש בשטח')),
}

def build_service(s):
    pg = Page(s['slug'] + '/index.html')
    acts = actions(pg, s['wa'])
    crumbs = [('דף הבית', pg.a('') or './'), ('שירותים', pg.a('#services')), (s['name'], None)]
    mdl = dict(s['model']) if s['model'] else None
    body = page_hero(pg, s['h1'], e(s['lede']), acts, crumbs, mdl)
    body += when_section(s['when'])
    real, scene = SERVICE_PICS.get(s['slug'], (None, None))
    pic = None
    if real and HAS_FIELD and field_item(real[0]):
        x = field_item(real[0])
        pic = ('assets/img/field/' + x['img'] + '.webp', real[1], 718, 898, x['alt'])
    elif scene:
        POSTERS[scene[0]] = {'cam': scene[0].split('--')[0], 'show': scene[0].split('--')[1].replace('-', ',') if '--' in scene[0] else ''}
        pic = ('assets/img/scene/' + scene[0] + '.webp', scene[1], 1200, 900, scene[1])
    body += list_section(s['list'], pg=pg, pic=pic)
    body += process(C.HOME['process'], note2=s['report_note'], note1=s.get('visit'))
    body += faq_block(s['faq'], 'שאלות על ' + s['row'], pg)
    body += visit_section(pg, s['close'][0], s['close'][1], preset=s['slug'])
    body += related_nav(pg, s['related'])
    schema = graph({'@type': 'Service', 'name': s['name'], 'serviceType': s['name'], 'description': s['desc'], 'url': f"{SITE_URL}/{s['slug']}/",
                    'provider': {'@id': SITE_URL + '/#business'}, 'areaServed': {'@type': 'AdministrativeArea', 'name': 'צפון ישראל'}},
                   org_schema(), crumbs_schema([('דף הבית', ''), (s['name'], s['slug'] + '/')]), faq_schema(s['faq']))
    page(pg, s['title'], s['desc'], body, schema, model=bool(mdl), credit=VALLEY_CREDIT)


# ---------- לעורכי דין ----------
def build_lawyers():
    pg = Page('lawyers/index.html')
    L = C.LAWYERS
    acts = actions(pg, L['wa'])
    card = (f'<div class="card bizcard"><img class="bizcard__logo" src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="{BRAND}" width="607" height="118">'
            f'<p class="bizcard__name">רביד קרודו</p><p class="bizcard__title">הנדסאי בניין רשום · מ.ר {C.REG}</p>'
            f'<dl class="bizcard__rows"><div><dt>טלפון</dt><dd><a href="tel:{C.PHONE_INTL}" data-tel="card"><span class="ltr">{C.PHONE}</span></a></dd></div>'
            f'<div><dt>מייל</dt><dd><a href="mailto:{C.EMAIL}">{C.EMAIL}</a></dd></div><div><dt>אזור</dt><dd>{e(C.AREA)}</dd></div></dl>'
            f'<a class="btn btn--accent" href="{pg.a("assets/krudo-engineering.vcf")}" download data-vcf>שמירת איש קשר</a></div>')
    body = page_hero(pg, L['h1'], e(L['lede']), acts, [('דף הבית', pg.a('') or './'), ('לעורכי דין ומתווכים', None)], side=card)
    rows = ''.join(row_link(pg.a(h), a, b, c) for h, a, b, c in L['refer'])
    body += (f'<section class="lineup lineup--side" aria-labelledby="refer-h"><div class="lineup__main"><h2 class="lineup__h" id="refer-h" data-reveal>{e(L["refer_h2"])}</h2><div class="lineup__table"><ul>{rows}</ul></div></div>'
             f'<figure class="still" data-reveal><div class="still__clip">{sheet(pg)}</div><figcaption>מה הלקוח מקבל: סעיף לכל ממצא, עם מדידה, סעיף התקן, המלצה ותמחור לפי מחירון דקל. {"עמוד מתוך חוות דעת של רביד, בלי פרטים מזהים." if HAS_FIELD else "המחשה של עמוד מתוך דוח."}{sample_link(pg)}</figcaption></figure></section>')
    send = ''.join(f'<li>{e(x)}</li>' for x in L['send'])
    get = ''.join(f'<li>{e(x)}</li>' for x in L['get'])
    body += (f'<section class="when" aria-labelledby="work-h"><div class="when__text" data-reveal><h2 id="work-h">{e(L["statement"].split(".")[0])}.</h2><p class="lead">{e(L["statement"].split(". ", 1)[1])}</p></div>'
             f'<div class="when__facts records" data-reveal><div><h3>{e(L["send_h2"])}</h3><ul>{send}</ul></div><div><h3>{e(L["get_h2"])}</h3><ul>{get}</ul></div></div></section>')
    body += faq_block(L['faq'], 'שאלות של אנשי מקצוע', pg)
    body += visit_section(pg, 'להפנות לקוח', 'בחרו את סוג הבדיקה ושלחו את פרטי הנכס. תמונות ודוחות קיימים מצרפים בצ׳אט.')
    body += related_nav(pg, ['expert-opinion', 'counter-inspection', 'second-hand'])
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('לעורכי דין ומתווכים', 'lawyers/')]), faq_schema(L['faq']))
    page(pg, L['title'], L['desc'], body, schema, current='lawyers', credit=VALLEY_CREDIT)


# ---------- רביד ----------
def build_about():
    pg = Page('about/index.html')
    A = C.ABOUT
    sheet_ = ('<div class="factsheet"><dl>' + ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in A['creds']) + '</dl>'
              f'<p class="creds__logo"><img src="{pg.a("assets/img/brand/engineers-association.png")}" alt="איגוד המהנדסים לבנייה ולתשתיות" width="168" height="111">מאתר ליקויי בנייה מטעם איגוד המהנדסים לבנייה ולתשתיות</p></div>')
    # TODO: כשתגיע תמונה של רביד בשטח, היא נכנסת כאן במקום לוח העובדות או לידו
    body = page_hero(pg, A['h1'], e(A['lede']), actions(pg, C.WA_DEFAULT), [('דף הבית', pg.a('') or './'), ('על רביד', None)], side=sheet_)
    story = ''.join(f'<p>{e(x)}</p>' for x in A['story'])
    who = ''.join(f'<div><dt>{e(t)}</dt><dd>{"<br>".join(e(x) for x in items)}</dd></div>' for t, items in C.HOME['records'])
    body += (f'<section class="when" aria-labelledby="story-h"><div class="when__text" data-reveal><h2 id="story-h">למה קרודו הנדסה</h2><p class="lead">{e(A["statement"])}</p><div class="prose">{story}</div></div>'
             f'<dl class="when__facts" data-reveal>{who}</dl></section>')
    body += process(C.HOME['process'])
    body += visit_section(pg, 'לדבר עם רביד', 'שלחו כמה פרטים בוואטסאפ, או התקשרו. רביד עונה בעצמו.')
    body += related_nav(pg, ['second-hand', 'new-apartment', 'expert-opinion'])
    schema = graph(person_schema(), org_schema(), crumbs_schema([('דף הבית', ''), ('על רביד', 'about/')]))
    page(pg, A['title'], A['desc'], body, schema, current='about', credit=VALLEY_CREDIT)


# ---------- קשר ----------
def build_contact():
    pg = Page('contact/index.html')
    K = C.CONTACT
    side = (f'<div class="factsheet"><dl><div><dt>וואטסאפ וטלפון</dt><dd><a class="link" href="tel:{C.PHONE_INTL}" data-tel="contact"><span class="ltr">{C.PHONE}</span></a></dd></div>'
            f'<div><dt>מייל</dt><dd><a class="link" href="mailto:{C.EMAIL}">{C.EMAIL}</a></dd></div>'
            f'<div><dt>כתובת</dt><dd>{e(C.ADDRESS)}</dd></div><div><dt>אזור</dt><dd>{e(C.AREA_TOWNS)}, עד כ־50 ק״מ</dd></div></dl>'
            f'<p class="factsheet__note">לחוות דעת ולנכסים גדולים, אפשר לתאם גם רחוק יותר.</p></div>')
    body = page_hero(pg, K['h1'], e(K['lede']), actions(pg, C.WA_DEFAULT), [('דף הבית', pg.a('') or './'), ('יצירת קשר', None)], side=side)
    body += visit_section(pg, 'פרטים לוואטסאפ', 'בחרו סוג בדיקה והוסיפו מה שאתם יודעים. תמונות מצרפים בצ׳אט.', h2_id='form-h', idattr='form')
    rows = ''.join(f'<li data-reveal><b>{e(a)}</b><span>{e(b)}</span></li>' for a, b in K['next'])
    body += f'<section class="list" aria-labelledby="next-h"><h2 id="next-h" data-reveal>{e(K["next_h2"])}</h2><ul class="list__rows">{rows}</ul></section>'
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('יצירת קשר', 'contact/')]))
    page(pg, K['title'], K['desc'], body, schema, credit=VALLEY_CREDIT)


# ---------- רשימת בדיקה ----------
def build_checklist():
    pg = Page('checklist/index.html')
    K = C.CHECKLIST
    secs = ''.join(f'<section aria-labelledby="cl-{i}"><h2 id="cl-{i}">{e(t)}</h2><ul>{"".join(f"<li>{e(x)}</li>" for x in items)}</ul></section>' for i, (t, items) in enumerate(K['sections']))
    body = (f'<article class="article"><header class="article__head"><nav class="crumbs no-print" aria-label="מיקום באתר"><a href="{pg.a("") or "./"}">דף הבית</a> <span aria-hidden="true">/</span> <span aria-current="page">רשימת בדיקה</span></nav>'
            f'<p class="print-only"><img src="{pg.a("assets/img/brand/logo-wordmark.svg")}" alt="{BRAND}" width="200" height="39"></p>'
            f'<h1>{e(K["h1"][0])} {e(K["h1"][1])}</h1><p class="article__meta">{e(K["lede"])}</p>'
            f'<p class="no-print page-hero__actions"><a class="btn btn--accent" href="{pg.a("assets/krudo-checklist.pdf")}" download data-pdf>הורדה כ־PDF</a><button class="btn btn--quiet" type="button" data-print>הדפסה</button></p></header>'
            f'<div class="article__body"><div class="checklist">{secs}</div>'
            f'<p class="print-only">{e(K["end"])} רביד קרודו, הנדסאי בניין רשום · {C.PHONE} · krudoeng.com</p></div>'
            f'<div class="article__aside no-print"><div class="aside-card"><h2>רוצים שרביד יבדוק?</h2><p>{e(K["end"])}</p><a class="btn btn--accent" href="{wa(SVC["new-apartment"]["wa"])}" data-wa="aside">{ico_wa()}לתיאום בוואטסאפ</a></div></div></article>')
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('רשימת בדיקה', 'checklist/')]))
    page(pg, K['title'], K['desc'], body, schema, credit=VALLEY_CREDIT)


# ---------- ליקויים מהשטח ----------
def build_field():
    if not HAS_FIELD:
        return
    F = C.FIELD
    pg = Page('field/index.html')
    side = ('<div class="factsheet"><dl>'
            '<div><dt>הבדיקה</dt><dd>ויזואלית ולא הורסת, עם ציוד מדידה</dd></div>'
            '<div><dt>בכל סעיף</dt><dd>ממצא, מסקנות וסעיף התקן, המלצה, תמחור ותמונות</dd></div>'
            '<div><dt>תמחור</dt><dd>לפי מחירון דקל, לפני מע״מ וכולל מע״מ</dd></div>'
            '<div><dt>נספחים</dt><dd>סעיפי התקנים שעליהם נשען כל ממצא</dd></div></dl></div>')
    body = page_hero(pg, F['h1'], e(F['lede']), actions(pg, C.WA_DEFAULT), [('דף הבית', pg.a('') or './'), ('ליקויים מהשטח', None)], side=side)
    for key, name in F['groups']:
        items = [x for x in F['items'] if x['group'] == key]
        if not items:
            continue
        figs = ''.join(
            f'<li data-reveal><figure>{field_img(pg, x)}'
            f'<figcaption><b>{e(x["found"])}</b><span>{e(x["note"])}</span><span><span class="field__k">המלצה:</span> {e(x["rec"])}</span></figcaption></figure></li>' for x in items)
        body += f'<section class="field" aria-labelledby="field-{key}"><h2 id="field-{key}" data-reveal>{e(name)}</h2><ul class="field__grid">{figs}</ul></section>'
    body += visit_section(pg, 'מצאתם משהו דומה?', 'שלחו תמונה ופרטים בוואטסאפ, ורביד יגיד אם צריך בדיקה, ואיזו.')
    body += related_nav(pg, ['second-hand', 'new-apartment', 'expert-opinion'])
    schema = graph(org_schema(), crumbs_schema([('דף הבית', ''), ('ליקויים מהשטח', 'field/')]))
    page(pg, F['title'], F['desc'], body, schema, current='field', credit=VALLEY_CREDIT)


# ---------- מאמרים ----------
def fmt_date(d):
    months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    y, m, dd = d.split('-')
    return f'{int(dd)} ב{months[int(m) - 1]} {y}'


def build_articles():
    idx = Page('articles/index.html')
    items = ''.join(f'<li data-reveal><a href="{a["slug"]}/"><b>{e(a["title"])}</b><span>{e(a["desc"])}</span><time datetime="{a["date"]}">{fmt_date(a["date"])}</time></a></li>' for a in C.ARTICLES)
    body = (f'<section class="article" aria-labelledby="h1"><header class="article__head"><nav class="crumbs" aria-label="מיקום באתר"><a href="{idx.a("") or "./"}">דף הבית</a> <span aria-hidden="true">/</span> <span aria-current="page">מאמרים</span></nav>'
            f'<h1 id="h1">מאמרים</h1><p class="article__meta">מה שכדאי לדעת לפני שקונים, מקבלים מפתח או נכנסים למחלוקת. כתב רביד קרודו.</p></header>'
            f'<div class="article__body"><ul class="index-list">{items}</ul></div></section>')
    page(idx, 'מאמרים על בדק בית וליקויי בנייה', 'מאמרים של רביד קרודו, הנדסאי בניין רשום: איך לקרוא מפרט טכני, ליקויים נפוצים בדירות חדשות, ואחריות הקבלן לפי חוק המכר.', body,
         graph(org_schema(), crumbs_schema([('דף הבית', ''), ('מאמרים', 'articles/')])), current='articles')
    for a in C.ARTICLES:
        pg = Page(f'articles/{a["slug"]}/index.html')
        parts = []
        for kind, val in a['body']:
            if kind == 'p':
                parts.append(f'<p>{e(val)}</p>')
            elif kind == 'h2':
                parts.append(f'<h2>{e(val)}</h2>')
            elif kind == 'ul':
                parts.append('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in val) + '</ul>')
            elif kind == 'table':
                head_, *rows = val
                parts.append('<table><thead><tr>' + ''.join(f'<th scope="col">{e(x)}</th>' for x in head_) + '</tr></thead><tbody>' +
                             ''.join('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>' for r in rows) + '</tbody></table>')
        svc = SVC[a['service']]
        body = (f'<article class="article" aria-labelledby="h1"><header class="article__head"><nav class="crumbs" aria-label="מיקום באתר"><a href="{pg.a("") or "./"}">דף הבית</a> <span aria-hidden="true">/</span> <a href="{pg.a("articles/")}">מאמרים</a></nav>'
                f'<h1 id="h1">{e(a["title"])}</h1><p class="article__meta">רביד קרודו · <time datetime="{a["date"]}">{fmt_date(a["date"])}</time> · עודכן <time datetime="{a["updated"]}">{fmt_date(a["updated"])}</time></p></header>'
                f'<div class="article__body">{"".join(parts)}</div>'
                f'<div class="article__aside"><div class="aside-card"><h2>{e(svc["name"])}</h2><p>{e(svc["lede"])}</p><a class="btn btn--accent" href="{wa(svc["wa"])}" data-wa="article">{ico_wa()}לתיאום בוואטסאפ</a>'
                f'<p><a class="link" href="{pg.a(svc["slug"] + "/")}">על הבדיקה</a></p></div></div></article>')
        schema = graph({'@type': 'Article', 'headline': a['title'], 'description': a['desc'], 'inLanguage': 'he-IL', 'datePublished': a['date'], 'dateModified': a['updated'],
                        'author': {'@id': SITE_URL + '/#ravid'}, 'publisher': {'@id': SITE_URL + '/#business'}, 'mainEntityOfPage': f'{SITE_URL}/articles/{a["slug"]}/'},
                       person_schema(), org_schema(), crumbs_schema([('דף הבית', ''), ('מאמרים', 'articles/'), (a['title'], f'articles/{a["slug"]}/')]))
        page(pg, a['title'], a['desc'], body, schema, current='articles')


# ---------- English ----------
def build_en():
    pg = Page('en/index.html', lang='en')
    E = C.EN
    hero = (f'<section class="page-hero page-hero--en" aria-labelledby="h1"><div class="page-hero__text">{lines("h1", "title", E["h1"], "h1")}'
            f'<p class="page-hero__lede" data-load="1">{e(E["lede"])}</p><div class="page-hero__actions" data-load="2">{actions(pg, E["wa"], "en")}</div></div>'
            f'<figure class="page-hero__model">{model(pg, "overview", "moisture,drain,cracks,tiles,plans,electric,rail", "Illustration: a sample apartment, with what an inspector looks for")}<figcaption>Illustration: what an inspector looks for</figcaption></figure></section>')
    rows = ''.join(f'<li><div class="row" data-reveal><span class="c1">{e(a)}</span><span class="c2">{e(b)}</span><span class="c3">{e(c)}</span><span class="c4"></span></div></li>' for a, b, c in E['services'])
    services = f'<section class="lineup" id="services" aria-labelledby="services-h"><h2 class="lineup__h" id="services-h" data-reveal>{e(E["services_h2"])}</h2><div class="lineup__table"><ul>{rows}</ul></div></section>'
    stairs = ''.join(f'<li class="stair" data-reveal><{"h2" if i == 0 else "p"} class="stair__line"{" id=" + chr(34) + "process-h" + chr(34) if i == 0 else ""}>{e(l)}</{"h2" if i == 0 else "p"}><p class="stair__note">{e(n)}</p></li>' for i, (l, n) in enumerate(E['process']))
    proc = f'<section class="process" aria-labelledby="process-h"><ol class="stairs">{stairs}</ol></section>'
    about = (f'<section class="when" id="about" aria-labelledby="about-h"><div class="when__text" data-reveal><h2 id="about-h">{e(E["about_h2"])}</h2><p class="lead">{e(E["about"][0])}</p><p>{e(E["about"][1])}</p></div>'
             f'<dl class="when__facts" data-reveal><div><dt>Registration</dt><dd>Certified construction practical engineer, 38633308</dd></div><div><dt>Based in</dt><dd>Kiryat Tivon</dd></div><div><dt>Area</dt><dd>Northern Israel, up to about 50 km</dd></div></dl></section>')
    faq = ''.join(f'<div class="faq__row" data-reveal><h3 class="faq__q">{e(q)}</h3><div class="faq__a">{"".join(f"<p>{e(x)}</p>" for x in a)}</div></div>' for q, a in E['faq'])
    faq = f'<section class="faq" aria-labelledby="faq-h"><div class="faq__row" data-reveal><h2 class="faq__q faq__h" id="faq-h">{e(E["faq_h2"])}</h2></div>{faq}</section>'
    close = (f'<section class="close" aria-labelledby="close-h"><div class="close__text" data-reveal><h2 id="close-h">{e(E["contact_h2"])}</h2><p>{e(E["contact_p"])}</p>'
             f'<div class="close__actions">{actions(pg, E["wa"], "en")}<a class="link" href="mailto:{C.EMAIL}">{C.EMAIL}</a></div></div></section>')
    schema = graph({**org_schema(), 'name': 'Krudo Engineering', 'alternateName': BRAND, 'description': E['desc']})
    page(pg, E['title'], E['desc'], hero + services + proc + about + faq + close, schema, model=True, alt_en=True, full_title=E['title'])


# ---------- נגישות ופרטיות ----------
def build_legal():
    pg = Page('accessibility/index.html')
    acc = [
        ('h2', 'מחויבות לנגישות'),
        ('p', 'קרודו הנדסה רואה חשיבות במתן שירות שוויוני לכל הלקוחות, ובכלל זה לאנשים עם מוגבלות. האתר נבנה כך שיהיה נגיש, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג־2013, ולתקן הישראלי ת״י 5568 המבוסס על הנחיות WCAG ברמה AA.'),
        ('h2', 'מה נעשה באתר'),
        ('ul', ['ניווט מלא במקלדת, עם סימון ברור של הרכיב שבפוקוס, וקישור "דילוג לתוכן" בראש כל עמוד', 'מבנה סמנטי: כותרות לפי סדר, אזורי ניווט מסומנים ורשימות אמיתיות', 'ניגודיות צבעים לפי הנחיות AA, וגודל טקסט בסיסי של 17 פיקסלים לפחות', 'טקסט חלופי לתמונות, ותיאור מילולי להמחשות', 'האתר מכבד את הגדרת "הפחתת תנועה" של מערכת ההפעלה: בלי סיבוב, סריקה ומעברים', 'כל התוכן נקרא גם בלי JavaScript, וכל ההמחשות מוצגות גם כתמונה סטטית', 'שדות הטופס מתויגים, והודעות שגיאה מוקראות', 'האתר מותאם לנייד, לטאבלט ולמחשב, ותומך בהגדלת טקסט עד 200%']),
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
        parts = []
        for kind, val in blocks:
            if kind == 'p':
                parts.append(f'<p>{e(val)}</p>')
            elif kind == 'h2':
                parts.append(f'<h2>{e(val)}</h2>')
            elif kind == 'ul':
                parts.append('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in val) + '</ul>')
        body = (f'<article class="article" aria-labelledby="h1"><header class="article__head"><nav class="crumbs" aria-label="מיקום באתר"><a href="{pg.a("") or "./"}">דף הבית</a></nav><h1 id="h1">{e(h1)}</h1></header>'
                f'<div class="article__body">{"".join(parts)}</div></article>')
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
    pg = Page('404.html')
    body = (f'<section class="page-hero" aria-labelledby="h1"><div class="page-hero__text wide">{lines("h1", "title", ["הדף", "לא נמצא"], "h1")}'
            f'<p class="page-hero__lede">אולי הוא עבר, ואולי נפלה טעות בכתובת. אפשר להמשיך מכאן:</p>'
            f'<div class="page-hero__actions"><a class="btn btn--quiet" href="/">לדף הבית</a><a class="btn btn--accent" href="{wa()}" data-wa="404">{ico_wa()}וואטסאפ לרביד</a></div></div></section>')
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
    with open(os.path.join(HERE, 'posters.json'), 'w', encoding='utf-8') as f:
        json.dump(POSTERS, f, ensure_ascii=False, indent=1)
    print(f'built {len(PAGES)} pages, {len(POSTERS)} model posters, {len(OLD)} redirects · launch={LAUNCH}')


if __name__ == '__main__':
    main()
