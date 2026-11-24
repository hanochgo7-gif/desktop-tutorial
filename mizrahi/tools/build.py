#!/usr/bin/env python3
"""
בונה את כל דפי האתר של י. מזרחי בניה ושות׳ מתוך tools/config.py, tools/content.py ו-content/*.json.

הרצה מתוך mizrahi/:  python3 tools/build.py
אין תלות חיצונית (Python 3.9+). הדפים נכתבים לתיקיית mizrahi/ עצמה.
"""
import json
import datetime
from html import escape
from pathlib import Path

import config as C
import content as T

ROOT = Path(__file__).resolve().parent.parent
CO = C.COMPANY
NAME = CO['name']
YEAR = datetime.date.today().year
INDEX = bool(C.SITE_URL)
IMAGES = {i['name']: i for i in json.loads((ROOT / 'content' / 'image-credits.json').read_text(encoding='utf-8'))}
PROJECTS = json.loads((ROOT / 'content' / 'projects.json').read_text(encoding='utf-8'))
VERSION = datetime.datetime.now().strftime('%Y%m%d%H%M')


def e(s):
    return escape(str(s), quote=True)


def tel_href(phone):
    digits = ''.join(ch for ch in phone if ch.isdigit())
    if digits.startswith('0'):
        digits = '972' + digits[1:]
    return '+' + digits


# ---------------------------------------------------------------- images
def img(name, alt, sizes='100vw', cls='', eager=False, ratio=None):
    """Responsive <img> from assets/img/<name>[-1280|-720].webp. Width/height come from the source file."""
    meta = IMAGES[name]
    w, h = meta['width'], meta['height']
    srcset = f'assets/img/{name}-720.webp 720w, assets/img/{name}-1280.webp 1280w, assets/img/{name}.webp {w}w'
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    c = f' class="{cls}"' if cls else ''
    return (f'<img{c} src="assets/img/{name}-1280.webp" srcset="{srcset}" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{e(alt)}" {load}>')


def figure(name, alt, sizes='100vw', cls='', eager=False):
    cap = IMAGES[name]['caption']
    return (f'<figure class="pic {cls}">{img(name, alt, sizes, eager=eager)}'
            f'<figcaption>{e(cap)}</figcaption></figure>')


# ---------------------------------------------------------------- logo (inline, so it inherits currentColor)
def brand_svg(file, cls):
    """A logo file inlined so it takes the colour of its place: the shape in currentColor,
    the letters cut into the stone in the page's ground colour."""
    svg = (ROOT / 'assets' / 'brand' / file).read_text(encoding='utf-8')
    svg = svg.replace('fill="#000000"', 'fill="currentColor"').replace('fill="#ffffff"', 'fill="var(--cut, var(--bg))"')
    return svg.replace('<svg ', f'<svg class="{cls}" aria-hidden="true" focusable="false" ', 1).replace(' role="img"', '')


def mark_svg(cls='mark'):
    return brand_svg('mark-black.svg', cls)


def logo_svg(cls='logo'):
    return brand_svg('logo-horizontal-black.svg', cls)


# ---------------------------------------------------------------- structured data
def org_ld():
    d = {'@context': 'https://schema.org', '@type': 'GeneralContractor' if CO['address'] else 'Organization',
         'name': NAME, 'description': 'חברת בנייה: בתים פרטיים, בנייני מגורים ומבנים ציבוריים.'}
    if C.SITE_URL:
        d['url'] = C.SITE_URL + '/'
        d['logo'] = C.SITE_URL + '/assets/brand/app-icon.png'
    if CO['legal_name']:
        d['legalName'] = CO['legal_name']
    if CO['phone']:
        d['telephone'] = tel_href(CO['phone'])
    if CO['email']:
        d['email'] = CO['email']
    if CO['founded']:
        d['foundingDate'] = str(CO['founded'])
    if CO['address']:
        d['address'] = {'@type': 'PostalAddress', 'streetAddress': CO['address'],
                        'addressLocality': CO['city'], 'addressCountry': 'IL'}
    if CO['service_area']:
        d['areaServed'] = CO['service_area']
    return d


def crumbs_ld(items):
    if not C.SITE_URL:
        return None
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': C.SITE_URL + '/' + (u if u != 'index.html' else '')}
        for i, (n, u) in enumerate(items)]}


def faq_ld(pairs):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in pairs]}


# ---------------------------------------------------------------- page shell
NAV = [
    ('private-homes.html', 'בתים פרטיים'),
    ('residential-buildings.html', 'בנייני מגורים'),
    ('public-buildings.html', 'מבנים ציבוריים'),
    ('projects.html', 'פרויקטים'),
    ('about.html', 'החברה'),
]


def head(page, title, desc, ld=(), og_image='og.jpg', preload=()):
    url = C.SITE_URL + '/' + ('' if page == 'index.html' else page) if C.SITE_URL else ''
    robots = '<meta name="robots" content="index, follow">' if INDEX else '<meta name="robots" content="noindex, nofollow">'
    canon = f'<link rel="canonical" href="{e(url)}">\n<meta property="og:url" content="{e(url)}">' if url else ''
    og_img = (C.SITE_URL + '/assets/' + og_image) if C.SITE_URL else 'assets/' + og_image
    scripts = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>\n'
                      for x in ld if x)
    pre = ''.join(
        f'<link rel="preload" as="image" imagesrcset="assets/img/{n}-720.webp 720w, assets/img/{n}-1280.webp 1280w, assets/img/{n}.webp 1920w" '
        f'imagesizes="{sz}" fetchpriority="high">\n' for n, sz in preload)
    cfg = {
        'phone': CO['phone'], 'whatsapp': CO['whatsapp'], 'email': CO['email'], 'name': NAME,
        'hgos': bool(C.HGOS_TOKEN), 'ga4': C.GA4_ID, 'ads': C.ADS_ID, 'adsLabels': C.ADS_LABELS,
    }
    return f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{robots}
{canon}
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="{e(NAME)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(og_img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#38450f">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/brand/app-icon.png">
<link rel="preload" href="assets/fonts/noto-sans-hebrew-hebrew.woff2" as="font" type="font/woff2" crossorigin>
{pre}<link rel="stylesheet" href="css/site.css?v={VERSION}">
<script>window.SITE={json.dumps(cfg, ensure_ascii=False)};document.documentElement.classList.add('js');</script>
{scripts}</head>
'''


def preview_note():
    """Shown only while the site has no contact channel: says plainly that this is a preview."""
    if CO['phone'] or CO['email'] or C.HGOS_TOKEN:
        return ''
    return ('<p class="preview-note" role="note">גרסת תצוגה: פרטי הקשר של החברה עוד לא הוזנו, '
            'ולכן הטופס לא שולח פניות.</p>')


def header(current, over_hero=False):
    links = ''.join(
        f'<li><a href="{u}"{" aria-current=\"page\"" if u == current else ""}>{t}</a></li>' for u, t in NAV)
    phone = (f'<a class="head-phone" href="tel:{tel_href(CO["phone"])}" data-track="phone_click">{e(CO["phone"])}</a>'
             if CO['phone'] else '')
    cls = 'site-head over-hero' if over_hero else 'site-head'
    return f'''<body>
<a class="skip" href="#main">דילוג לתוכן</a>
<header class="{cls}">
  {preview_note()}
  <div class="head-in">
    <a class="brand" href="index.html" aria-label="{e(NAME)}, לדף הבית">{logo_svg()}</a>
    <nav class="main-nav" aria-label="ראשי">
      <ul>{links}</ul>
    </nav>
    <div class="head-actions">
      {phone}
      <a class="btn btn-small" href="contact.html" data-track="cta_click" data-cta="header">צרו קשר</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">תפריט</button>
    </div>
  </div>
  <div class="menu" id="menu" hidden>
    <ul>{links}<li><a href="contact.html">צרו קשר</a></li></ul>
    {f'<a class="menu-phone" href="tel:{tel_href(CO["phone"])}" data-track="phone_click">{e(CO["phone"])}</a>' if CO['phone'] else ''}
  </div>
</header>
'''


def sign_rows():
    """The rows of the site sign in the footer: only facts that exist."""
    rows = [('קבלן', NAME)]
    if CO['contractor_reg']:
        rows.append(('רישום בפנקס הקבלנים', CO['contractor_reg'] + (f' · {CO["contractor_class"]}' if CO['contractor_class'] else '')))
    rows.append(('בונים', 'בתים פרטיים · בנייני מגורים · מבנים ציבוריים'))
    if CO['phone']:
        rows.append(('טלפון', f'<a href="tel:{tel_href(CO["phone"])}" data-track="phone_click">{e(CO["phone"])}</a>'))
    if CO['email']:
        rows.append(('אימייל', f'<a href="mailto:{e(CO["email"])}">{e(CO["email"])}</a>'))
    if CO['address']:
        rows.append(('משרד', e(f'{CO["address"]}, {CO["city"]}')))
    return ''.join(f'<tr><th scope="row">{k}</th><td>{v if k in ("טלפון", "אימייל") else (v if "<" in v else e(v))}</td></tr>'
                   for k, v in rows)


def footer():
    legal = []
    if CO['legal_name']:
        legal.append(e(CO['legal_name']))
    if CO['company_id']:
        legal.append('ח.פ. ' + e(CO['company_id']))
    legal_line = ' · '.join(legal)
    wa = (f'<a class="wa-float" href="https://wa.me/{e(CO["whatsapp"])}?text={e("שלום, אשמח לשיחה על פרויקט בנייה")}" '
          f'data-track="whatsapp_click" aria-label="שליחת הודעת WhatsApp">WhatsApp</a>') if CO['whatsapp'] else ''
    # on phones: one bar at the bottom with the two fastest ways to reach a person (only those that exist)
    bar = []
    if CO['phone']:
        bar.append(f'<a href="tel:{tel_href(CO["phone"])}" data-track="phone_click" data-cta="mobile-bar">התקשרו</a>')
    if CO['whatsapp']:
        bar.append(f'<a href="https://wa.me/{e(CO["whatsapp"])}?text={e("שלום, אשמח לשיחה על פרויקט בנייה")}" data-track="whatsapp_click" data-cta="mobile-bar">WhatsApp</a>')
    if bar:
        bar.append('<a href="contact.html" data-track="cta_click" data-cta="mobile-bar">טופס</a>')
        wa += f'<nav class="m-bar" aria-label="יצירת קשר מהירה">{"".join(bar)}</nav>'
    return f'''<footer class="site-foot">
  <div class="foot-in">
    <div class="sign" aria-labelledby="sign-title">
      <div class="sign-head">{mark_svg('sign-mark')}<p class="sign-title" id="sign-title">שלט האתר</p></div>
      <table class="sign-table"><tbody>{sign_rows()}</tbody></table>
    </div>
    <nav class="foot-nav" aria-label="קישורים בתחתית">
      <ul>
        <li><a href="private-homes.html">בניית בית פרטי</a></li>
        <li><a href="residential-buildings.html">בנייני מגורים</a></li>
        <li><a href="public-buildings.html">מבנים ציבוריים</a></li>
        <li><a href="projects.html">פרויקטים</a></li>
        <li><a href="about.html">החברה ושיטת העבודה</a></li>
        <li><a href="contact.html">צרו קשר</a></li>
      </ul>
      <ul>
        <li><a href="privacy.html">מדיניות פרטיות</a></li>
        <li><a href="accessibility.html">הצהרת נגישות</a></li>
        <li><a href="credits.html">קרדיט לתמונות</a></li>
        <li><button class="linklike" type="button" data-consent-open hidden>הגדרות עוגיות</button></li>
      </ul>
    </nav>
  </div>
  <div class="foot-name">{brand_svg('wordmark-black.svg', 'foot-word')}</div>
  <p class="foot-legal">© {YEAR} {e(NAME)}{(' · ' + legal_line) if legal_line else ''}. התמונות באתר הן צילומי ארכיון ותיעוד של אתרי בנייה בישראל, ואינן פרויקטים של החברה, אלא אם נכתב אחרת.</p>
</footer>
{wa}
{f'<script src="https://hanochgo7-gif.github.io/desktop-tutorial/crm/embed/hgos.js" data-token="{e(C.HGOS_TOKEN)}" data-consent="hg" defer></script>' if C.HGOS_TOKEN else ''}
<script src="js/site.js?v={VERSION}" defer></script>
</body>
</html>
'''


def page(path, title, desc, body, current='', ld=(), over_hero=False, preload=()):
    html = head(path, title, desc, ld, preload=preload) + header(current, over_hero) + body + footer()
    (ROOT / path).write_text(html, encoding='utf-8')
    return path


# ---------------------------------------------------------------- shared blocks
def breadcrumbs(items):
    lis = ''.join(
        (f'<li><a href="{u}">{e(n)}</a></li>' if i < len(items) - 1 else f'<li aria-current="page">{e(n)}</li>')
        for i, (n, u) in enumerate(items))
    return f'<nav class="crumbs" aria-label="פירורי לחם"><ol>{lis}</ol></nav>'


def type_options(selected='', name='type', required=False):
    req = ' required' if required else ''
    out = []
    for key, label in T.PROJECT_TYPES:
        chk = ' checked' if key == selected else ''
        out.append(f'<label class="chip"><input type="radio" name="{name}" value="{e(label)}" data-key="{key}"{chk}{req}><span>{e(label)}</span></label>')
    return ''.join(out)


def lead_form(selected='', fid='lead', title='ספרו לנו על הפרויקט'):
    return f'''<form class="lead-form" id="{fid}" novalidate data-form="{fid}">
  <h2 class="form-title" id="{fid}-title">{e(title)}</h2>
  <fieldset class="field">
    <legend>מה בונים?</legend>
    <div class="chips">{type_options(selected)}</div>
  </fieldset>
  <div class="field">
    <label for="{fid}-name">שם</label>
    <input id="{fid}-name" name="name" type="text" autocomplete="name" required maxlength="80" aria-describedby="{fid}-name-err">
    <p class="err" id="{fid}-name-err" hidden>כתבו שם, כדי שנדע את מי לבקש.</p>
  </div>
  <div class="field">
    <label for="{fid}-phone">טלפון</label>
    <input id="{fid}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" dir="ltr" aria-describedby="{fid}-phone-err">
    <p class="err" id="{fid}-phone-err" hidden>מספר הטלפון לא נראה תקין. נסו למשל 050-1234567.</p>
  </div>
  <div class="field">
    <label for="{fid}-where">איפה הפרויקט? <span class="opt">(לא חובה)</span></label>
    <input id="{fid}-where" name="location" type="text" autocomplete="address-level2" maxlength="80">
  </div>
  <div class="field">
    <label for="{fid}-msg">כמה מילים על הפרויקט <span class="opt">(לא חובה)</span></label>
    <textarea id="{fid}-msg" name="message" rows="3" maxlength="1500"></textarea>
  </div>
  <div class="hp" aria-hidden="true"><label for="{fid}-hp">לא למילוי</label><input id="{fid}-hp" name="hgos_hp" type="text" tabindex="-1" autocomplete="off"></div>
  <button class="btn btn-wide" type="submit">שליחה</button>
  <p class="form-note">נשתמש בפרטים רק כדי לחזור אליכם בנוגע לפרויקט. <a href="privacy.html">מדיניות הפרטיות</a></p>
  <div class="form-status" role="status" aria-live="polite" tabindex="-1"></div>
</form>'''


def contact_lines(cls='contact-lines'):
    rows = []
    if CO['phone']:
        rows.append(f'<li><a href="tel:{tel_href(CO["phone"])}" data-track="phone_click">{e(CO["phone"])}</a></li>')
    if CO['whatsapp']:
        rows.append(f'<li><a href="https://wa.me/{e(CO["whatsapp"])}?text={e("שלום, אשמח לשיחה על פרויקט בנייה")}" data-track="whatsapp_click">WhatsApp</a></li>')
    if CO['email']:
        rows.append(f'<li><a href="mailto:{e(CO["email"])}">{e(CO["email"])}</a></li>')
    if CO['address']:
        rows.append(f'<li>{e(CO["address"])}, {e(CO["city"])}</li>')
    for d, h in CO['hours']:
        rows.append(f'<li class="hours"><span>{e(d)}</span><span class="num">{e(h)}</span></li>')
    return f'<ul class="{cls}">{"".join(rows)}</ul>' if rows else ''


def checklist(selected='private', heading='לפני שבוחרים קבלן', hid='check'):
    """The live thing: pick the kind of project and get what to ask any contractor, in columns."""
    tabs = ''.join(
        f'<label class="chip"><input type="radio" name="{hid}-type" value="{k}"{" checked" if k == selected else ""}><span>{e(l)}</span></label>'
        for k, l in T.PROJECT_TYPES if k != 'other')
    cols = []
    for title, items in T.CHECKLIST['common']:
        lis = ''.join(f'<li>{e(x)}</li>' for x in items)
        cols.append(f'<div class="check-col"><h3>{e(title)}</h3><ul>{lis}</ul></div>')
    for k in ('private', 'residential', 'public'):
        for title, items in T.CHECKLIST[k]:
            lis = ''.join(f'<li>{e(x)}</li>' for x in items)
            hide = '' if k == selected else ' hidden'
            cols.append(f'<div class="check-col" data-for="{k}"{hide}><h3>{e(title)}</h3><ul>{lis}</ul></div>')
    reg = ''
    if CO['contractor_reg']:
        reg = f'<p class="check-ours">המספר שלנו בפנקס הקבלנים: <strong class="num">{e(CO["contractor_reg"])}</strong>{(" · " + e(CO["contractor_class"])) if CO["contractor_class"] else ""}.</p>'
    return f'''<section class="checklist" id="{hid}" aria-labelledby="{hid}-h">
  <div class="wrap check-grid">
    <h2 class="h-sec" id="{hid}-h">{e(heading)}</h2>
    <div class="check-side">
      <p class="lead">מה לשאול כל קבלן, גם אותנו. בחרו מה אתם בונים:</p>
      <fieldset class="chips check-tabs"><legend class="sr">סוג הפרויקט</legend>{tabs}</fieldset>
      {reg}
      <p class="check-actions">
        <a href="{T.REGISTRY_URL}" rel="noopener" target="_blank">אתר רשם הקבלנים<span class="sr"> (נפתח בחלון חדש)</span></a>
        <button class="linklike" type="button" data-print>הדפסת הרשימה</button>
        <a href="https://wa.me/?text=" data-share-check data-track="share_click">שליחה לעצמי ב-WhatsApp</a>
      </p>
    </div>
    <div class="check-cols">{"".join(cols)}</div>
  </div>
</section>'''


def faq_block(pairs, hid='faq', heading='שאלות שעולות בשיחה הראשונה', photo='crane-2015',
              alt='עגורן צהוב מעל אתר בנייה בעיר, ולמטה גדר אתר ומבנים', cta=True):
    items = ''.join(
        f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in pairs)
    facts = contact_lines('faq-facts')
    act = ('<p class="faq-cta"><a class="btn" href="#contact" data-track="cta_click" data-cta="faq">לשאלה שלא מופיעה כאן</a></p>'
           if cta else '')
    return f'''<section class="faq" id="{hid}" aria-labelledby="{hid}-h">
  <div class="wrap faq-grid">
    <div class="faq-text">
      <h2 class="h-sec" id="{hid}-h">{e(heading)}</h2>
      {facts}
      <div class="faq-list">{items}</div>
      {act}
    </div>
    <div class="faq-pic">{figure(photo, alt, '(min-width: 900px) 45vw, 100vw')}</div>
  </div>
</section>'''


def contact_section(selected='', photo='aerial-2021', alt='אתר בנייה גדול עם שני עגורנים, מבט מלמעלה על כביש, שכונה ושדות'):
    return f'''<section class="contact" id="contact" aria-labelledby="lead-title">
  <div class="contact-pic">{img(photo, alt, '100vw')}</div>
  <div class="wrap contact-in">
    <div class="card">
      {lead_form(selected)}
      {contact_lines()}
    </div>
  </div>
  <p class="contact-cap wrap"><span>{e(IMAGES[photo]['caption'])}</span></p>
</section>'''


def pic_pair(a, b):
    """Two photographs at different sizes, the larger one first: then and now, side by side."""
    return f'''<div class="pair wrap" role="group" aria-label="תמונות">
  <div class="pair-a">{figure(a, IMAGES[a]['caption'], '(min-width: 900px) 58vw, 100vw')}</div>
  <div class="pair-b">{figure(b, IMAGES[b]['caption'], '(min-width: 900px) 34vw, 70vw')}</div>
</div>'''


# ---------------------------------------------------------------- home
def home():
    hero_imgs = [('hero-1963', 'דימונה, 1963', 'שורת בנייני שיכון בבנייה בדימונה, קירות בלוקים ועמודי בטון, ופועלים על הגג'),
                 ('hero-2025', 'אשדוד, 2025', 'בניין מגורים בבנייה באשדוד, פועלים על פיגומים ותבניות לתקרה הבאה')]
    slides = ''
    for i, (n, cap, alt) in enumerate(hero_imgs):
        tag = img(n, alt, "100vw", eager=(i == 0))
        if i:  # later slides wait for the page to settle (site.js swaps data-src in)
            tag = tag.replace(' src="', ' data-src="').replace(' srcset="', ' data-srcset="')
        slides += (f'<figure class="slide{" is-on" if i == 0 else ""}" data-year="{cap}">'
                   f'{tag}'
                   f'<figcaption>{e(IMAGES[n]["caption"])}</figcaption></figure>')
    rows = ''.join(
        f'<tr><th scope="row"><a href="{s["slug"]}.html">{e(s["name"])}</a></th><td>{e(s["short"])}</td>'
        f'<td class="go"><a href="{s["slug"]}.html" aria-label="עוד על {e(s["name"])}">לפרטים</a></td></tr>'
        for s in T.SERVICES)
    steps = ''
    for i, (t, d, pic) in enumerate(T.PROCESS):
        p = f'<div class="step-pic">{img(pic, IMAGES[pic]["caption"], "(min-width: 900px) 300px, 72vw")}</div>' if pic else ''
        steps += f'<li class="step{" has-pic" if pic else ""}"><h3>{e(t)}</h3><p>{e(d)}</p>{p}</li>'

    if PROJECTS:
        work = projects_strip(PROJECTS[:3], home=True)
    else:
        work = '''<section class="work-empty" aria-labelledby="work-h">
  <div class="wrap work-empty-in">
    <h2 class="h-sec" id="work-h">פרויקטים</h2>
    <p class="lead">גלריית הפרויקטים של החברה בהכנה. עד שתעלה, בקשו מאיתנו רשימת פרויקטים שביצענו, בסוג ובהיקף של הפרויקט שלכם.</p>
    <p><a class="btn btn-light" href="contact.html?ask=projects" data-track="cta_click" data-cta="projects-list">לבקשת רשימת פרויקטים</a></p>
  </div>
</section>'''

    facts = [(str(CO['years']), 'שנות פעילות בענף הבנייה'), ('3', 'סוגי מבנים: בתים, בנייני מגורים ומבני ציבור')]
    if CO['contractor_class']:
        facts.append((CO['contractor_class'], 'ענף וסוג בפנקס הקבלנים'))
    facts_html = ''.join(f'<div class="fact"><dt>{e(b)}</dt><dd class="num">{e(a)}</dd></div>' for a, b in facts)

    body = f'''<main id="main">
<section class="hero" aria-labelledby="hero-h">
  <div class="slides" aria-live="off">{slides}</div>
  <div class="rail">
    <div class="rail-in">
      <h1 id="hero-h">{e(NAME)}</h1>
      <p class="rail-sub">{CO['years']} שנה בונים בתים פרטיים, בנייני מגורים ומבנים ציבוריים.</p>
      <p class="rail-act">
        <a class="btn btn-light" href="#contact" data-track="cta_click" data-cta="hero">ספרו לנו על הפרויקט</a>
        <a class="link-light" href="#what">מה אנחנו בונים</a>
      </p>
      <p class="rail-cap" aria-hidden="true">{e(IMAGES['hero-1963']['caption'])}</p>
    </div>
  </div>
  <button class="slides-pause" type="button" aria-pressed="false">עצירת החלפת התמונות</button>
</section>

<section class="intro" aria-labelledby="intro-h">
  <div class="wrap intro-grid">
    <h2 class="intro-h" id="intro-h">בונים לעשרות שנים</h2>
    <div class="intro-pic">{figure('kiron-1963', 'דלי בטון תלוי מעגורן מעל צינורות, ומאחוריו בניין בפיגומים', '(min-width: 900px) 46vw, 75vw', eager=False)}</div>
    <div class="intro-text">
      <p class="lead">בית או בניין עומדים עשרות שנים אחרי שהקבלן עזב את האתר. אחרי {CO['years']} שנה בענף, ראינו איך מבנים מזדקנים, ויודעים שמה שקובע את זה נעשה בשלב הבנייה: ביסודות, באיטום, בפרטים שאחר כך מכוסים בטיח.</p>
      <p>לכן אנחנו עובדים לפי מפרט כתוב, מתעדים כל שלב, ומדברים על הפרטים האלה כבר בפגישה הראשונה.</p>
    </div>
    <div class="intro-small">{figure('rebar-1934', 'פועלי בניין כורעים על רשת ברזל של תקרה וקושרים אותה', '(min-width: 900px) 24vw, 50vw')}</div>
  </div>
</section>

<section class="what" id="what" aria-labelledby="what-h">
  <div class="wrap">
    <h2 class="what-h" id="what-h">שלושה סוגי מבנים,<br>אותה אחריות</h2>
    <div class="what-table">
      <p class="what-label">מה אנחנו בונים</p>
      <table class="svc-table"><tbody>{rows}</tbody></table>
    </div>
  </div>
</section>

<section class="heritage" aria-labelledby="heritage-h">
  <div class="wrap">
    <h2 class="h-sec" id="heritage-h">{CO['years']} שנה בענף</h2>
    <p class="lead heritage-lead">התחלנו לבנות כשהמדינה בנתה שכונות שלמות מבלוקים ובטון. מאז השתנו החומרים, התקנים והטכנולוגיה, ומה שלא השתנה הוא שהשם שלנו כתוב על השלט בכניסה לאתר.</p>
    <div class="heritage-tiles">
      <div class="tile-photo">
        {img('dimona-1963-wide', 'אתר בנייה במדבר: בנייני שיכון בבנייה, ערמות בלוקים, שקי מלט ודלי בטון', '(min-width: 900px) 64vw, 100vw')}
        <p class="tile-note">{e(IMAGES['dimona-1963-wide']['caption'])}. כך נראו אתרי הבנייה בישראל בשנים שבהן התחלנו.</p>
      </div>
      <div class="tile-color">
        <p class="big-num num" aria-hidden="true">{CO['years']}</p>
        <dl class="facts">{facts_html}</dl>
      </div>
    </div>
  </div>
</section>

<section class="process" aria-labelledby="process-h">
  <div class="wrap process-top">
    <h2 class="h-sec" id="process-h">מהשיחה הראשונה ועד המסירה</h2>
    <div class="process-btns">
      <button type="button" class="sq" data-dir="prev" aria-label="השלב הקודם" aria-controls="steps">→</button>
      <button type="button" class="sq" data-dir="next" aria-label="השלב הבא" aria-controls="steps">←</button>
    </div>
  </div>
  <div class="wrap"><div class="progress" aria-hidden="true"><span></span></div></div>
  <ol class="steps" id="steps" tabindex="0" aria-label="שלבי העבודה">{steps}</ol>
</section>

{checklist()}

{work}

{faq_block(T.FAQ_HOME)}

{contact_section()}
</main>
'''
    ld = [org_ld(), faq_ld(T.FAQ_HOME)]
    return page('index.html',
                f'{NAME} | חברת בנייה: בתים פרטיים, בנייני מגורים ומבני ציבור',
                f'{NAME}: {CO["years"]} שנות פעילות בענף הבנייה. בניית בתים פרטיים, בנייני מגורים ומבנים ציבוריים. מה לבדוק אצל כל קבלן, ואיך מתחילים.',
                body, 'index.html', ld, over_hero=True,
                preload=(('hero-1963', '100vw'),))


# ---------------------------------------------------------------- projects
def project_card(p):
    """One project as a strip of pictures with a fixed fact row. Fields that are missing are left out."""
    pics = ''.join(
        f'<li><img src="{e(x["src"])}" alt="{e(x["alt"])}" width="{x.get("w", 1600)}" height="{x.get("h", 1000)}" loading="lazy" decoding="async"></li>'
        for x in p.get('images', []))
    fields = [('סוג', p.get('type')), ('יישוב', p.get('city')), ('שנת מסירה', p.get('year')),
              ('שטח בנוי', p.get('area')), ('היקף העבודה', p.get('scope')), ('מזמין', p.get('client')),
              ('אדריכל', p.get('architect'))]
    facts = ''.join(f'<div><dt>{k}</dt><dd>{e(v)}</dd></div>' for k, v in fields if v)
    note = f'<p class="proj-note">{e(p["note"])}</p>' if p.get('note') else ''
    render = '<p class="proj-render">הדמיה, לא צילום</p>' if p.get('is_render') else ''
    return f'''<article class="proj" id="{e(p['id'])}" data-type="{e(p.get('type_key', ''))}">
  <ul class="strip" tabindex="0" aria-label="תמונות: {e(p['name'])}">{pics}</ul>
  <div class="wrap proj-row">
    <h3>{e(p['name'])}</h3>
    <dl class="proj-facts">{facts}</dl>
    {note}{render}
  </div>
</article>'''


def projects_strip(items, home=False):
    cards = ''.join(project_card(p) for p in items)
    more = '<p class="wrap"><a href="projects.html">לכל הפרויקטים</a></p>' if home else ''
    return f'''<section class="work" aria-labelledby="work-h">
  <div class="wrap"><h2 class="h-sec" id="work-h">פרויקטים נבחרים</h2></div>
  {cards}{more}
</section>'''


def projects_page():
    crumbs = [('דף הבית', 'index.html'), ('פרויקטים', 'projects.html')]
    if PROJECTS:
        filters = ''.join(
            f'<label class="chip"><input type="radio" name="pf" value="{k}"><span>{e(l)}</span></label>'
            for k, l in T.PROJECT_TYPES if k != 'other')
        inner = f'''<div class="wrap"><fieldset class="chips proj-filter"><legend class="sr">סינון לפי סוג</legend>
<label class="chip"><input type="radio" name="pf" value="" checked><span>הכול</span></label>{filters}</fieldset></div>
{''.join(project_card(p) for p in PROJECTS)}'''
    else:
        inner = '''<div class="wrap empty-proj">
  <p class="lead">הגלריה בהכנה. אנחנו מתעדים בימים אלה את הפרויקטים שביצענו, וכל פרויקט יעלה עם הפרטים שאפשר לאמת: סוג המבנה, יישוב, שנת מסירה, היקף העבודה, ובאישור המזמין גם שמו.</p>
  <p>עד אז: בקשו מאיתנו רשימת פרויקטים בסוג ובהיקף של הפרויקט שלכם, ונתאם ביקור או שיחה עם לקוח קודם, כשאפשר.</p>
  <p><a class="btn" href="contact.html?ask=projects" data-track="cta_click" data-cta="projects-page">לבקשת רשימת פרויקטים</a></p>
</div>'''
    body = f'''<main id="main" class="inner">
<section class="page-top" aria-labelledby="pt-h">
  <div class="wrap">{breadcrumbs(crumbs)}<h1 class="h-page" id="pt-h">פרויקטים</h1></div>
</section>
<section class="projects" aria-label="רשימת הפרויקטים">{inner}</section>
{contact_section()}
</main>
'''
    return page('projects.html', f'פרויקטים | {NAME}',
                f'פרויקטים של {NAME}: בתים פרטיים, בנייני מגורים ומבנים ציבוריים, עם הפרטים של כל פרויקט.',
                body, 'projects.html', [crumbs_ld(crumbs)])


# ---------------------------------------------------------------- service pages
def service_page(s):
    crumbs = [('דף הבית', 'index.html'), (s['name'], s['slug'] + '.html')]
    who = ''.join(f'<li><strong>{e(a)}</strong> {e(b)}</li>' for a, b in s['for_whom'])
    prep = ''.join(f'<li>{e(x)}</li>' for x in s['prepare'])
    phases = ''.join(f'<li><h3>{e(a)}</h3><p>{e(b)}</p></li>' for a, b in s['phases'])
    others = ''.join(f'<li><a href="{o["slug"]}.html">{e(o["name"])}</a></li>' for o in T.SERVICES if o is not s)
    sel = dict(T.PROJECT_TYPES)[s['key']]
    body = f'''<main id="main" class="inner">
<section class="svc-hero" aria-labelledby="svc-h">
  <div class="wrap svc-hero-grid">
    <div class="svc-hero-text">
      {breadcrumbs(crumbs)}
      <h1 class="h-page" id="svc-h">{e(s['h1'])}</h1>
      <p class="lead">{e(s['lead'])}</p>
      <p><a class="btn" href="#contact" data-track="cta_click" data-cta="{s['key']}-hero">ספרו לנו על הפרויקט</a></p>
    </div>
    <div class="svc-hero-pic">{figure(s['image'], s['image_alt'], '(min-width: 900px) 50vw, 100vw', eager=True)}</div>
  </div>
</section>

<section class="svc-who" aria-labelledby="who-h">
  <div class="wrap two-col">
    <h2 class="h-sec" id="who-h">למי זה מתאים</h2>
    <ul class="who-list">{who}</ul>
  </div>
</section>

<section class="svc-phases" aria-labelledby="ph-h">
  <div class="wrap">
    <h2 class="h-sec" id="ph-h">איך זה נבנה</h2>
    <ol class="phases">{phases}</ol>
  </div>
</section>

{pic_pair(*s['pair'])}

<section class="svc-prep" aria-labelledby="prep-h">
  <div class="wrap two-col">
    <div>
      <h2 class="h-sec" id="prep-h">מה להכין לפגישה</h2>
      <p class="lead">לא צריך את הכול. מה שיש, יקצר את הדרך להצעה מדויקת.</p>
    </div>
    <ul class="prep-list">{prep}</ul>
  </div>
</section>

{checklist(s['key'], 'מה לשאול כל קבלן', 'check')}

{faq_block(s['faq'], heading='שאלות נפוצות', photo='crane-2015' if s['key'] != 'private' else 'tower-2020',
           alt='עגורן צהוב מעל אתר בנייה בעיר' if s['key'] != 'private' else 'בניין מגורים בבנייה בלילה, עם עגורן ותאורת עבודה')}

<nav class="svc-others wrap" aria-label="תחומים נוספים"><p>עוד תחומים:</p><ul>{others}</ul></nav>

{contact_section(sel)}
</main>
'''
    ld = [org_ld(), crumbs_ld(crumbs), faq_ld(s['faq']),
          {'@context': 'https://schema.org', '@type': 'Service', 'serviceType': s['name'],
           'provider': {'@type': 'Organization', 'name': NAME}, 'areaServed': CO['service_area'] or 'IL'}]
    return page(s['slug'] + '.html', s['title'], s['description'], body, s['slug'] + '.html', ld,
                preload=((s['image'], '(min-width: 900px) 50vw, 100vw'),))


# ---------------------------------------------------------------- about
def about():
    crumbs = [('דף הבית', 'index.html'), ('החברה', 'about.html')]
    steps = ''.join(f'<li><h3>{e(t)}</h3><p>{e(d)}</p></li>' for t, d, _ in T.PROCESS)
    timeline = ''
    if C.TIMELINE:
        rows = ''.join(f'<li><span class="num">{e(y)}</span><p>{e(t)}</p></li>' for y, t in C.TIMELINE)
        timeline = f'<section class="timeline" aria-labelledby="tl-h"><div class="wrap"><h2 class="h-sec" id="tl-h">ציוני דרך</h2><ol>{rows}</ol></div></section>'
    body = f'''<main id="main" class="inner">
<section class="page-top" aria-labelledby="pt-h">
  <div class="wrap">{breadcrumbs(crumbs)}<h1 class="h-page" id="pt-h">החברה</h1>
  <p class="lead page-lead">{e(NAME)} בונה בישראל כבר {CO['years']} שנה: בתים פרטיים, בנייני מגורים ומבנים ציבוריים.</p></div>
</section>

<section class="about-story" aria-labelledby="st-h">
  <div class="wrap two-col">
    <div>
      <h2 class="h-sec" id="st-h">השם על השלט</h2>
      <p class="lead">בכל אתר בנייה בישראל תלוי שלט, ועליו שם הקבלן שאחראי לביצוע. זה המקום שבו חברה עומדת מאחורי העבודה שלה, בשמה.</p>
      <p>{CO['years']} שנה השם שלנו מופיע על שלטים כאלה. בזמן הזה השתנו החומרים, התקנים, הטכנולוגיה והדרישות של לקוחות, של בנקים ושל רשויות. העיקרון לא השתנה: עובדים לפי מפרט כתוב, אומרים מראש מה כלול ומה לא, ונשארים זמינים גם אחרי המסירה.</p>
    </div>
    <div class="about-pic">{figure('dimona-1963-street', 'רחוב של בנייני מגורים חדשים בני שלוש קומות, ועגורן ברקע', '(min-width: 900px) 45vw, 100vw')}</div>
  </div>
</section>

{timeline}

{pic_pair('hero-1963', 'hero-2025')}

<section class="about-process" aria-labelledby="pr-h">
  <div class="wrap">
    <h2 class="h-sec" id="pr-h">שיטת העבודה</h2>
    <ol class="phases">{steps}</ol>
  </div>
</section>

{checklist('private', 'מה לשאול כל קבלן', 'check')}

{contact_section()}
</main>
'''
    return page('about.html', f'החברה ושיטת העבודה | {NAME}',
                f'{NAME}: {CO["years"]} שנה בענף הבנייה בישראל. מי אנחנו, איך אנחנו עובדים מהשיחה הראשונה ועד המסירה, ומה לבדוק אצל כל קבלן.',
                body, 'about.html', [org_ld(), crumbs_ld(crumbs)])


# ---------------------------------------------------------------- contact
def contact_page():
    crumbs = [('דף הבית', 'index.html'), ('צרו קשר', 'contact.html')]
    body = f'''<main id="main" class="inner">
<section class="page-top" aria-labelledby="pt-h">
  <div class="wrap">{breadcrumbs(crumbs)}<h1 class="h-page" id="pt-h">צרו קשר</h1>
  <p class="lead page-lead">ספרו לנו מה אתם בונים ואיפה. נחזור אליכם לשיחה ראשונה, ובה כבר תדעו אם אנחנו מתאימים לפרויקט.</p></div>
</section>
<section class="contact-page" aria-label="טופס ופרטי קשר">
  <div class="wrap two-col">
    <div class="card card-flat">{lead_form('', 'lead')}</div>
    <div class="after">
      <h2 class="h-sec">מה קורה אחרי ששולחים</h2>
      <ol class="after-list">
        <li><strong>חוזרים אליכם</strong> לשיחה קצרה: מה בונים, איפה ובאיזה שלב.</li>
        <li><strong>קובעים פגישה</strong> לעבור על התוכניות, ההיתר והמפרט.</li>
        <li><strong>מכינים הצעה</strong> מפורטת לפי סעיפים, שאפשר להשוות.</li>
      </ol>
      {contact_lines()}
      <div class="after-pic">{figure('rishon-2021', 'בניין מגורים בבנייה עם פיגומים, ומאחוריו שכונה של בתים צמודי קרקע', '(min-width: 900px) 45vw, 100vw')}</div>
    </div>
  </div>
</section>
</main>
'''
    return page('contact.html', f'צרו קשר | {NAME}',
                f'פנייה ל{NAME}: בית פרטי, בניין מגורים או מבנה ציבורי. טופס קצר, ונחזור אליכם לשיחה ראשונה.',
                body, 'contact.html', [org_ld(), crumbs_ld(crumbs)])


# ---------------------------------------------------------------- legal & utility pages
def text_page(path, title, h1, desc, sections, crumbs_name, noindex_extra=False):
    crumbs = [('דף הבית', 'index.html'), (crumbs_name, path)]
    secs = ''.join(f'<section aria-labelledby="s{i}"><h2 id="s{i}">{e(h)}</h2>{html}</section>' for i, (h, html) in enumerate(sections))
    body = f'''<main id="main" class="inner">
<section class="page-top" aria-labelledby="pt-h">
  <div class="wrap">{breadcrumbs(crumbs)}<h1 class="h-page" id="pt-h">{e(h1)}</h1></div>
</section>
<div class="wrap prose">{secs}</div>
</main>
'''
    return page(path, title, desc, body, path, [crumbs_ld(crumbs)])


def privacy():
    who = e(CO['legal_name'] or NAME)
    reach = []
    if CO['email']:
        reach.append(f'באימייל <a href="mailto:{e(CO["email"])}">{e(CO["email"])}</a>')
    if CO['phone']:
        reach.append(f'בטלפון <a href="tel:{tel_href(CO["phone"])}">{e(CO["phone"])}</a>')
    reach_txt = ' או '.join(reach) if reach else 'בפרטי הקשר שבאתר'
    analytics = ('<p>באתר פועלים כלי מדידה של Google (Analytics ו-Ads). הם נטענים רק אם אישרתם עוגיות מדידה, ואפשר לשנות את הבחירה בכל עת בקישור "הגדרות עוגיות" בתחתית כל עמוד.</p>'
                 if (C.GA4_ID or C.ADS_ID) else
                 '<p>האתר אינו משתמש כרגע בעוגיות מדידה או פרסום. אם יופעלו בעתיד, הן ייטענו רק אחרי הסכמה, ומדיניות זו תתעדכן.</p>')
    crm = ('<p>פניות מהטופס נשמרות במערכת ניהול הפניות של החברה (HG OS, על גבי Supabase), עם פרטי הקמפיין שהביא אתכם לאתר, אם היה כזה. '
           'פרטי הקמפיין נשמרים בדפדפן שלכם עד 90 יום, ורק אחרי הסכמה לעוגיות.</p>' if C.HGOS_TOKEN else '')
    sections = [
        ('מי אנחנו', f'<p>האתר מופעל על ידי {who}. מדיניות זו מסבירה איזה מידע נאסף באתר, למה, ומה הזכויות שלכם.</p>'),
        ('איזה מידע נאסף', '<p>כשאתם ממלאים את טופס הפנייה: שם, טלפון, סוג הפרויקט, ואם בחרתם לכתוב, מיקום הפרויקט ופרטים עליו. אין חובה חוקית למסור את המידע, אבל בלי שם וטלפון לא נוכל לחזור אליכם.</p>'),
        ('למה הוא משמש', '<p>רק כדי לחזור אליכם בנוגע לפרויקט שפניתם עליו, ולנהל את הקשר איתכם. לא נמכור את המידע ולא נעביר אותו לצד שלישי לשיווק.</p>' + crm),
        ('עוגיות ומדידה', analytics),
        ('כמה זמן שומרים', '<p>כל עוד יש קשר עסקי פעיל, ולאחר מכן לפרק הזמן הנדרש לפי דין. אפשר לבקש מחיקה בכל עת.</p>'),
        ('הזכויות שלכם', f'<p>לפי חוק הגנת הפרטיות, התשמ"א–1981, אתם רשאים לעיין במידע שנשמר עליכם, ולבקש לתקן או למחוק אותו. פנו אלינו {reach_txt}.</p>'),
        ('אבטחה', '<p>האתר מוגש בחיבור מוצפן (HTTPS). הגישה לפניות מוגבלת לאנשי החברה שמטפלים בהן.</p>'),
        ('עדכונים', f'<p>מדיניות זו עודכנה לאחרונה ב-{datetime.date.today().strftime("%d.%m.%Y")}.</p>'),
    ]
    return text_page('privacy.html', f'מדיניות פרטיות | {NAME}', 'מדיניות פרטיות',
                     f'מדיניות הפרטיות של אתר {NAME}: איזה מידע נאסף, למה, וכיצד לבקש עיון, תיקון או מחיקה.', sections, 'מדיניות פרטיות')


def accessibility():
    reach = CO['email'] or CO['phone']
    contact = (f'<p>נתקלתם בבעיה? כתבו לנו: <a href="mailto:{e(CO["email"])}">{e(CO["email"])}</a></p>' if CO['email']
               else f'<p>נתקלתם בבעיה? התקשרו: <a href="tel:{tel_href(CO["phone"])}">{e(CO["phone"])}</a></p>' if CO['phone']
               else '<p>פרטי רכז הנגישות יפורסמו כאן עם עליית האתר.</p>')
    sections = [
        ('מחויבות לנגישות', '<p>האתר נבנה כך שיתאים לתקן הישראלי ת"י 5568, המבוסס על הנחיות WCAG 2.1 ברמה AA.</p>'),
        ('מה נעשה באתר', '<ul><li>מבנה כותרות תקין וניווט מלא במקלדת, עם סימון פוקוס ברור.</li><li>קישור "דילוג לתוכן" בראש כל עמוד.</li>'
         '<li>טקסט חלופי לכל תמונה, וכיתוב שמסביר מה מוצג בה.</li><li>ניגודיות צבעים לפי הנחיות AA.</li>'
         '<li>האתר מכבד את הגדרת "הפחתת תנועה" של מערכת ההפעלה, ואפשר לעצור את החלפת התמונות בראש דף הבית.</li>'
         '<li>טפסים עם תוויות, הודעות שגיאה כתובות, וקריאה של סטטוס השליחה לקוראי מסך.</li><li>הטקסט נשאר קריא בהגדלה של עד 200%.</li></ul>'),
        ('נבדק ב', '<p>דפדפן Chromium במחשב ובתצוגת טלפון, ניווט מקלדת, הפחתת תנועה, גלישה בלי JavaScript, ובדיקות אוטומטיות (Lighthouse ו-axe). לפני ההשקה מתוכננת בדיקה גם ב-Safari (iPhone) ועם קורא מסך.</p>'),
        ('מגבלות ידועות', '<p>תמונות הארכיון מוצגות כפי שהן, ולכן חלק מהפרטים שבהן אינם מתוארים במלואם בטקסט החלופי.</p>'),
        ('יצירת קשר בנושא נגישות', contact),
        ('עדכון', f'<p>ההצהרה עודכנה ב-{datetime.date.today().strftime("%d.%m.%Y")}.</p>'),
    ]
    return text_page('accessibility.html', f'הצהרת נגישות | {NAME}', 'הצהרת נגישות',
                     f'הצהרת הנגישות של אתר {NAME}: מה נעשה באתר, מגבלות ידועות ואיך פונים.', sections, 'הצהרת נגישות')


def credits():
    rows = ''.join(
        f'<li><strong>{e(i["caption"])}</strong>. {e(i["title"])}'
        f'{(", צילום: " + e(i["creator"])) if i.get("creator") else ""}. '
        f'רישיון: <a href="{e(i["licenseUrl"])}" rel="noopener">{e(i["license"])}</a>. '
        f'<a href="{e(i["page"])}" rel="noopener">מקור בוויקישיתוף</a>.</li>'
        for i in IMAGES.values())
    sections = [
        ('תמונות ארכיון ותיעוד', '<p>עד שיצולמו פרויקטים של החברה, באתר מוצגות תמונות של אתרי בנייה בישראל מארכיונים ומאוספים פתוחים. '
         'הן מראות את הענף ואת התקופות שבהן פעלנו, ואינן פרויקטים של החברה.</p>'
         f'<ul class="credits">{rows}</ul>'),
        ('גופן', '<p>Noto Sans Hebrew, מאת Google, ברישיון SIL Open Font License 1.1.</p>'),
    ]
    return text_page('credits.html', f'קרדיט לתמונות | {NAME}', 'קרדיט לתמונות',
                     'מקורות, צלמים ורישיונות של תמונות הארכיון והתיעוד באתר, והגופן שבו האתר כתוב.', sections, 'קרדיט לתמונות')


def not_found():
    body = '''<main id="main" class="inner">
<section class="page-top nf" aria-labelledby="pt-h">
  <div class="wrap"><h1 class="h-page" id="pt-h">העמוד לא נמצא</h1>
  <p class="lead page-lead">ייתכן שהכתובת השתנתה. אפשר להמשיך מכאן:</p>
  <ul class="nf-links"><li><a href="index.html">דף הבית</a></li><li><a href="private-homes.html">בתים פרטיים</a></li>
  <li><a href="residential-buildings.html">בנייני מגורים</a></li><li><a href="public-buildings.html">מבנים ציבוריים</a></li>
  <li><a href="contact.html">צרו קשר</a></li></ul></div>
</section>
</main>
'''
    html = head('404.html', f'העמוד לא נמצא | {NAME}', 'העמוד לא נמצא.').replace(
        '<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex">') + header('') + body + footer()
    (ROOT / '404.html').write_text(html, encoding='utf-8')
    return '404.html'


# ---------------------------------------------------------------- seo files
def seo_files(pages):
    sm, rb = ROOT / 'sitemap.xml', ROOT / 'robots.txt'
    if not C.SITE_URL:
        for f in (sm, rb):
            if f.exists():
                f.unlink()
        return
    today = datetime.date.today().isoformat()
    urls = ''.join(
        f'<url><loc>{C.SITE_URL}/{"" if p == "index.html" else p}</loc><lastmod>{today}</lastmod></url>'
        for p in pages if p not in ('404.html',))
    sm.write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n', encoding='utf-8')
    rb.write_text(f'User-agent: *\nDisallow: /brand/\nDisallow: /docs/\nSitemap: {C.SITE_URL}/sitemap.xml\n', encoding='utf-8')


def main():
    pages = [home(), about(), projects_page(), contact_page()]
    pages += [service_page(s) for s in T.SERVICES]
    pages += [privacy(), accessibility(), credits(), not_found()]
    seo_files(pages)
    missing = C.ready_to_launch()
    print('built:', ', '.join(pages))
    print('launch blockers:', ', '.join(missing) if missing else 'none')


if __name__ == '__main__':
    main()
