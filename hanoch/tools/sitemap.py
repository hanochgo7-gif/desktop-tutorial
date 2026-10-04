# מפת אתר מלאה: דפים, תמונות וסרטונים. מריצים: python3 tools/sitemap.py
import json, datetime, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = 'https://hgpro.io'
today = datetime.date.today().isoformat()
PAIR = {'/': '/en.html', '/work.html': '/en-work.html', '/archive/': '/archive/en.html'}
REV = {v: k for k, v in PAIR.items()}
IMG = {'/': ['/work/og-home.jpg', '/work/film-poster.webp', '/work/me/character.webp'], '/en.html': ['/work/og-home.jpg', '/work/film-poster.webp'],
       '/work.html': ['/work/og-work.jpg'] + [f'/work/cinema/{k}.webp' for k in ('gotovski', 'ams', 'allenbis', 'clinic', 'falafel', 'rachel')],
       '/en-work.html': ['/work/og-work.jpg'], '/archive/': ['/work/film/hg.webp', '/work/film/ad.webp'], '/archive/en.html': ['/work/film/hg.webp']}
VID = {'/': [('HG · Unforgettable', 'פרסומת בושם של 30 שניות שנוצרה בבינה מלאכותית על ידי HGPRO.', '/work/film/hg.webp', '/work/film/hg.mp4', 30),
             ('סרט התדמית של HGPRO', 'סרט תדמית של עבודות עיצוב ובניית אתרים.', '/work/film-poster.webp', '/work/film/reel.mp4', 22)],
       '/archive/': [('HG · Unforgettable', 'פרסומת בושם שנוצרה בבינה מלאכותית.', '/work/film/hg.webp', '/work/film/hg.mp4', 30),
                     ('לפני שהעיר מתעוררת', 'סרט פרסומת של דקה שנוצר בבינה מלאכותית.', '/work/film/ad.webp', '/work/film/ad.mp4', 58)],
       '/archive/en.html': [('Before the City Wakes', 'A one minute commercial made with AI.', '/work/film/ad.webp', '/work/film/ad-en.mp4', 58)],
       '/services/ai-commercial.html': [('HG · Unforgettable', 'פרסומת בושם שנוצרה בבינה מלאכותית.', '/work/film/hg.webp', '/work/film/hg.mp4', 30)],
       '/services/en/ai-commercial-production.html': [('HG · Unforgettable', 'A fragrance commercial made with AI.', '/work/film/hg.webp', '/work/film/hg.mp4', 30)]}
PRI = {'/': '1.0', '/en.html': '0.9', '/work.html': '0.8', '/en-work.html': '0.7', '/archive/': '0.8', '/archive/en.html': '0.7', '/accessibility.html': '0.2'}
paths = ['/', '/en.html', '/work.html', '/en-work.html', '/archive/', '/archive/en.html', '/services/', '/services/en/']
paths += [p['url'][len(D):] for p in json.load(open(ROOT + '/services/pages.json'))]
BLOG = json.load(open(ROOT + '/blog/posts.json')) if os.path.exists(ROOT + '/blog/posts.json') else []
paths += ['/blog/'] + [b['url'][len(D):] for b in BLOG]
for b in BLOG: IMG[b['url'][len(D):]] = ['/' + b['cover']]
PRI['/blog/'] = '0.7'
paths.append('/accessibility.html')
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
