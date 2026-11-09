# מפת אתר מלאה: דפים, תמונות וסרטונים. מריצים: python3 tools/sitemap.py
import json, datetime, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = 'https://hgpro.io'
today = datetime.date.today().isoformat()
import hashlib, re, subprocess
# תאריך עדכון לכל עמוד: היום שבו התוכן שרואים בו (כותרת, תיאור והתוכן הראשי) השתנה באמת, ולא היום שבו הסקריפט רץ.
# הזיכרון נשמר ב-tools/lastmod.json (התיקייה לא עולה לאתר). עמוד שאין לו עדיין זיכרון מקבל את תאריך הקומיט האחרון שלו
LM_FILE = ROOT + '/tools/lastmod.json'
LM = json.load(open(LM_FILE, encoding='utf8')) if os.path.exists(LM_FILE) else {}
def page_file(p): return ROOT + (p + 'index.html' if p.endswith('/') else p)
def lastmod(p):
    f = page_file(p)
    src = open(f, encoding='utf8').read()
    sig = ''.join(re.findall(r'<title>.*?</title>|<meta name="description"[^>]*>|<main[\s\S]*?</main>', src))
    h = hashlib.sha1(sig.encode('utf8')).hexdigest()
    if LM.get(p, {}).get('h') != h:
        d = today
        if p not in LM:
            try:
                dirty = subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', f], cwd=ROOT).returncode != 0
                d = today if dirty else (subprocess.run(['git', 'log', '-1', '--format=%cs', '--', f], cwd=ROOT, capture_output=True, text=True).stdout.strip() or today)
            except Exception:
                pass
        LM[p] = {'h': h, 'd': d}
    return LM[p]['d']
PAIR = {'/': '/en.html', '/work.html': '/en-work.html', '/archive/': '/archive/en.html',
        '/privacy.html': '/en-privacy.html', '/terms.html': '/en-terms.html', '/refunds.html': '/en-refunds.html', '/elef/': '/elef/en.html'}
REV = {v: k for k, v in PAIR.items()}
IMG = {'/': ['/work/og-home.jpg', '/work/creation/poster.webp'], '/en.html': ['/work/og-home.jpg', '/work/creation/poster.webp'],
       '/work.html': ['/work/og-work.jpg'] + [f'/work/cinema/{k}.webp' for k in ('gotovski', 'ams', 'allenbis', 'clinic', 'chef', 'elef', 'fragrance', 'mashkanta')],
       '/en-work.html': ['/work/og-work.jpg'], '/archive/': ['/work/film/elef.webp', '/work/film/hg.webp'], '/archive/en.html': ['/work/film/elef.webp', '/work/film/hg.webp'],
       '/elef/': ['/elef/media/s8-poster.webp', '/elef/media/s1-1600.webp', '/elef/media/s12-1600.webp'], '/elef/en.html': ['/elef/media/s8-poster.webp']}
# סרטונים לכל עמוד: רק מה שבאמת מופיע בעמוד. מותגים בדיוניים וקונספט מסומנים ככאלה בכל תיאור
ELEF_HE = ('אֶלֶף · שמן זית מהגליל', 'פרסומת קולנועית של דקה למותג בדיוני של שמן זית, שנוצרה בבינה מלאכותית על ידי HG Studio.', '/work/film/elef.webp', '/work/film/elef.mp4', 60)
HG_HE = ('HG · Unforgettable', 'פרסומת בושם של 20 שניות למותג קונספט של הסטודיו, שנוצרה בבינה מלאכותית.', '/work/film/hg.webp', '/work/film/hg.mp4', 20)
NIGHT_HE = ('אתר שלא נסגר בשבע', 'פרסומת אנכית ל-HG Studio שנוצרה בבינה מלאכותית, עם מסכים אמיתיים מאתרי לקוחות.', '/work/film/studio-night.webp', '/work/film/studio-night.mp4', 32)
CON = 'מותג קונספט של הסטודיו. '
VID = {'/work.html': [ELEF_HE, HG_HE, NIGHT_HE,
                       ('HG TRAVELS · פרסומת למותג קונספט של חופשות סקי', 'פרסומת אנכית שנוצרה בבינה מלאכותית למותג קונספט של הסטודיו.', '/work/film/hgtravels.webp', '/work/film/hgtravels.mp4', 38),
                       ('HG Fragrance · הנפילה', CON + 'גבר בחליפה שחורה נופל מהשמיים מעל העיר, נוחת בענן אבק ליד מכונית עם הבקבוק על הגג, והולך.', '/work/film/hgr-the-fall.webp', '/work/film/hgr-the-fall.mp4', 19),
                       ('HG Fragrance · העריכה', CON + 'עריכה מהירה: גברים בפשתן בשחור־לבן, הבקבוק באור כחול, רחוב אדום וזוג.', '/work/film/hgr-the-edit.webp', '/work/film/hgr-the-edit.mp4', 13),
                       ('HG Fragrance · ארבע עונות', CON + 'קמפיין אופנה: גברים בפשתן על רקע בטון, בקבוק אחד בארבעה אורות.', '/work/film/hgr-four-seasons.webp', '/work/film/hgr-four-seasons.mp4', 13),
                       ('HG Fragrance · אחרי החשכה', CON + 'רחוב אדום אחרי הגשם, הבקבוק בידיים וזוג באור חם. הלילה רק מתחיל.', '/work/film/hgr-after-dark.webp', '/work/film/hgr-after-dark.mp4', 8),
                       ('HG Fragrance · ליד האח', CON + 'גבר במעיל שחור מחזיק את Nocturne ליד אח בהרים, ואז עומד מול חלון מעל השלג.', '/work/film/hgr-by-the-fire.webp', '/work/film/hgr-by-the-fire.mp4', 5),
                       ('HG Fragrance · המגדל', CON + 'מתחת למגדל זכוכית ושמיים כחולים, גבר במעיל ארוך נוגע בצווארון והולך.', '/work/film/hgr-the-tower.webp', '/work/film/hgr-the-tower.mp4', 4)],
       '/archive/': [ELEF_HE, HG_HE, NIGHT_HE],
       '/archive/en.html': [("A website that doesn't close at seven", 'A vertical HG Studio ad made with AI, with real screens from client sites.', '/work/film/studio-night.webp', '/work/film/studio-night.mp4', 32)],
       '/services/ai-commercial.html': [ELEF_HE, HG_HE],
       '/services/en/ai-commercial-production.html': [('Elef · Galilee olive oil', 'A one minute cinematic commercial for a fictional olive oil brand, made with AI.', '/work/film/elef.webp', '/work/film/elef-en.mp4', 60),
                     ('HG · Unforgettable', 'A 20 second fragrance commercial for a studio concept brand, made with AI.', '/work/film/hg.webp', '/work/film/hg.mp4', 20)]}
PRI = {'/': '1.0', '/en.html': '0.9', '/work.html': '0.8', '/en-work.html': '0.7', '/archive/': '0.8', '/archive/en.html': '0.7', '/accessibility.html': '0.2', '/en-accessibility.html': '0.2'}
paths = ['/', '/en.html', '/work.html', '/en-work.html', '/archive/', '/archive/en.html', '/services/', '/services/en/']
paths += [p['url'][len(D):] for p in json.load(open(ROOT + '/services/pages.json'))]
BLOG = json.load(open(ROOT + '/blog/posts.json')) if os.path.exists(ROOT + '/blog/posts.json') else []
paths += ['/blog/'] + [b['url'][len(D):] for b in BLOG]
for b in BLOG: IMG[b['url'][len(D):]] = ['/' + b['cover']]
PRI['/blog/'] = '0.7'
paths += ['/elef/', '/elef/en.html']; PRI['/elef/'] = '0.6'; PRI['/elef/en.html'] = '0.5'
paths.append('/refer.html'); PRI['/refer.html'] = '0.3'
paths.append('/accessibility.html'); paths.append('/en-accessibility.html')
for lp in ('privacy', 'terms', 'refunds'):
    paths += [f'/{lp}.html', f'/en-{lp}.html']; PRI[f'/{lp}.html'] = PRI[f'/en-{lp}.html'] = '0.2'
out = []
for p in paths:
    alt = ''
    other = PAIR.get(p) or REV.get(p)
    if other:
        he, en = (p, other) if p in PAIR else (other, p)
        alt = f'\n    <xhtml:link rel="alternate" hreflang="he" href="{D}{he}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="{D}{en}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="{D}{he}"/>'
    imgs = ''.join(f'\n    <image:image><image:loc>{D}{i}</image:loc></image:image>' for i in IMG.get(p, []))
    vids = ''.join(f'\n    <video:video><video:thumbnail_loc>{D}{t}</video:thumbnail_loc><video:title>{html.escape(n)}</video:title><video:description>{html.escape(d)}</video:description><video:content_loc>{D}{c}</video:content_loc><video:duration>{s}</video:duration><video:family_friendly>yes</video:family_friendly></video:video>' for n, d, t, c, s in VID.get(p, []))
    pr = PRI.get(p, '0.8' if p.startswith('/services/') else '0.6' if p.startswith('/blog/') else '0.5')
    out.append(f'  <url>\n    <loc>{D}{p}</loc>{alt}\n    <lastmod>{lastmod(p)}</lastmod>\n    <priority>{pr}</priority>{imgs}{vids}\n  </url>')
xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"'
       ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n' + '\n'.join(out) + '\n</urlset>\n')
open(ROOT + '/sitemap.xml', 'w', encoding='utf8').write(xml); print('urls', len(paths))
json.dump(LM, open(LM_FILE, 'w', encoding='utf8'), ensure_ascii=False, indent=1, sort_keys=True)
