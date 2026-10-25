# מפת אתר מלאה: דפים, תמונות וסרטונים. מריצים: python3 tools/sitemap.py
import json, datetime, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = 'https://hgpro.io'
today = datetime.date.today().isoformat()
PAIR = {'/': '/en.html', '/work.html': '/en-work.html', '/archive/': '/archive/en.html',
        '/privacy.html': '/en-privacy.html', '/terms.html': '/en-terms.html', '/refunds.html': '/en-refunds.html', '/elef/': '/elef/en.html'}
REV = {v: k for k, v in PAIR.items()}
IMG = {'/': ['/work/og-home.jpg', '/work/creation/poster.webp'], '/en.html': ['/work/og-home.jpg', '/work/creation/poster.webp'],
       '/work.html': ['/work/og-work.jpg'] + [f'/work/cinema/{k}.webp' for k in ('gotovski', 'ams', 'allenbis', 'clinic', 'chef', 'elef', 'fragrance', 'mashkanta')],
       '/en-work.html': ['/work/og-work.jpg'], '/archive/': ['/work/film/elef.webp', '/work/film/hg.webp'], '/archive/en.html': ['/work/film/elef.webp', '/work/film/hg.webp'],
       '/elef/': ['/elef/media/s8-poster.webp', '/elef/media/s1-1600.webp', '/elef/media/s12-1600.webp'], '/elef/en.html': ['/elef/media/s8-poster.webp']}
VID = {'/work.html': [('אֶלֶף · שמן זית מהגליל', 'פרסומת קולנועית של דקה לשמן זית שנוצרה בבינה מלאכותית על ידי HG Studio.', '/work/film/elef.webp', '/work/film/elef.mp4', 60),
                       ('HG · Unforgettable', 'פרסומת בושם של 20 שניות שנוצרה בבינה מלאכותית על ידי HG Studio.', '/work/film/hg.webp', '/work/film/hg.mp4', 20),
                       ('אתר שלא נסגר בשבע', 'פרסומת אנכית ל-HG Studio שנוצרה בבינה מלאכותית, עם מסכים אמיתיים מאתרי לקוחות.', '/work/film/studio-night.webp', '/work/film/studio-night.mp4', 32),
                       ('העסק נסגר בשבע. האתר? לא.', 'פרסומת מציגה ל-HG Studio. המציגה והקול נוצרו בבינה מלאכותית, והמסכים אמיתיים.', '/work/film/studio-host.webp', '/work/film/studio-host.mp4', 22),
                       ('GLUCKSKI · פרסומת לביגוד סקי', 'פרסומת אנכית לביגוד סקי שנוצרה בבינה מלאכותית על ידי HG Studio: גלישה וסנובורד, הפרטים של הסט והזמנה בחנות בטלפון.', '/work/film/gluckski2.webp', '/work/film/gluckski2.mp4', 30),
                       ('HG Fragrance · הנפילה', "גבר בחליפה שחורה נופל מהשמיים מעל העיר, נוחת בענן אבק ליד מכונית עם הבקבוק על הגג, והולך.", '/work/film/hgr-the-fall.webp', '/work/film/hgr-the-fall.mp4', 19),
                       ('HG Fragrance · ההתנגשות', "רחוב ריק עם שחר: גבר מתנגש בעוברת אורח, הבקבוק וצעיף משי עפים בהילוך איטי.", '/work/film/hgr-the-collision.webp', '/work/film/hgr-the-collision.mp4', 11),
                       ('HG Fragrance · הכניסה', "מצלמת מסדרון: גבר מרסס בצווארון, חבר נכנס ונעצר: \"רגע, מה אתה שם?\"", '/work/film/hgr-the-entrance.webp', '/work/film/hgr-the-entrance.mp4', 13),
                       ('HG Fragrance · ריסוס אחד', "יוצר תוכן מדבר למצלמה, מרסס בצווארון מול המראה ומניח את הבקבוק ליד מנורה.", '/work/film/hgr-one-spray.webp', '/work/film/hgr-one-spray.mp4', 12),
                       ('HG Fragrance · התיק', "אישה במשקפי שמש שוברת חלון של מכונית, לוקחת את שקית HG מהמושב האחורי והולכת.", '/work/film/hgr-the-bag.webp', '/work/film/hgr-the-bag.mp4', 12),
                       ('HG Fragrance · העריכה', "עריכה מהירה: גברים בפשתן בשחור־לבן, הבקבוק באור כחול, רחוב אדום וזוג.", '/work/film/hgr-the-edit.webp', '/work/film/hgr-the-edit.mp4', 13),
                       ('HG Fragrance · פלאש', "לילה ופלאש של מצלמה: כביש רטוב, אישה צוחקת עם הבקבוק, ריסוס בצווארון.", '/work/film/hgr-flash.webp', '/work/film/hgr-flash.mp4', 8),
                       ('HG Fragrance · ארבע עונות', "קמפיין אופנה: גברים בפשתן על רקע בטון, בקבוק אחד בארבעה אורות.", '/work/film/hgr-four-seasons.webp', '/work/film/hgr-four-seasons.mp4', 13),
                       ('HG Fragrance · אחרי החשכה', "רחוב אדום אחרי הגשם, הבקבוק בידיים וזוג באור חם. הלילה רק מתחיל.", '/work/film/hgr-after-dark.webp', '/work/film/hgr-after-dark.mp4', 8),
                       ('HG Fragrance · ליד האח', "גבר במעיל שחור מחזיק את Nocturne ליד אח בהרים, ואז עומד מול חלון מעל השלג.", '/work/film/hgr-by-the-fire.webp', '/work/film/hgr-by-the-fire.mp4', 5),
                       ('HG Fragrance · המגדל', "מתחת למגדל זכוכית ושמיים כחולים, גבר במעיל ארוך נוגע בצווארון והולך.", '/work/film/hgr-the-tower.webp', '/work/film/hgr-the-tower.mp4', 4)],
       '/archive/': [('אֶלֶף · שמן זית מהגליל', 'פרסומת שמן זית שנוצרה בבינה מלאכותית.', '/work/film/elef.webp', '/work/film/elef.mp4', 60),
                     ('HG · Unforgettable', 'פרסומת בושם שנוצרה בבינה מלאכותית.', '/work/film/hg.webp', '/work/film/hg.mp4', 20),
                     ('אתר שלא נסגר בשבע', 'פרסומת אנכית ל-HG Studio שנוצרה בבינה מלאכותית, עם מסכים אמיתיים מאתרי לקוחות.', '/work/film/studio-night.webp', '/work/film/studio-night.mp4', 32),
                     ('העסק נסגר בשבע. האתר? לא.', 'פרסומת מציגה ל-HG Studio. המציגה והקול נוצרו בבינה מלאכותית, והמסכים אמיתיים.', '/work/film/studio-host.webp', '/work/film/studio-host.mp4', 22)],
       '/archive/en.html': [('A website that doesn\'t close at seven', 'A vertical HG Studio ad made with AI, with real screens from client sites.', '/work/film/studio-night.webp', '/work/film/studio-night.mp4', 32),
                     ('The business closes at seven. The website? No.', 'An HG Studio presenter ad. The presenter and voice were made with AI; the screens are real.', '/work/film/studio-host.webp', '/work/film/studio-host.mp4', 22)],
       '/services/ai-commercial.html': [('אֶלֶף · שמן זית מהגליל', 'פרסומת שמן זית שנוצרה בבינה מלאכותית.', '/work/film/elef.webp', '/work/film/elef.mp4', 60),
                     ('HG · Unforgettable', 'פרסומת בושם שנוצרה בבינה מלאכותית.', '/work/film/hg.webp', '/work/film/hg.mp4', 20)],
       '/services/en/ai-commercial-production.html': [('Elef · Galilee olive oil', 'A cinematic olive oil commercial made with AI.', '/work/film/elef.webp', '/work/film/elef-en.mp4', 60),
                     ('HG · Unforgettable', 'A fragrance commercial made with AI.', '/work/film/hg.webp', '/work/film/hg.mp4', 20)]}
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
    out.append(f'  <url>\n    <loc>{D}{p}</loc>{alt}\n    <lastmod>{today}</lastmod>\n    <priority>{pr}</priority>{imgs}{vids}\n  </url>')
xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"'
       ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n' + '\n'.join(out) + '\n</urlset>\n')
open(ROOT + '/sitemap.xml', 'w', encoding='utf8').write(xml); print('urls', len(paths))
