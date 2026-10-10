# -*- coding: utf-8 -*-
"""בונה את העמודים הסטטיים של אלף: עמודי מוצר, מדריכים, עמוד המדריכים ומפת האתר.

מריצים מתיקיית elef:  python3 tools/build.py
הנתונים של המוצרים נקראים מ-js/store.js (דרך node), והכותרת והפוטר נלקחים מ-product.html,
כך שכל שינוי שם עובר לכל העמודים בהרצה הבאה.
"""
import html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from articles import ARTICLES  # noqa: E402

BASE = 'https://hanochgo7-gif.github.io/desktop-tutorial/elef/'
TODAY = '2026-10-09'
FONTS = 'https://fonts.googleapis.com/css2?family=Bellefair&family=David+Libre:wght@400;500;700&family=Frank+Ruhl+Libre:wght@500&display=swap'
esc = lambda s: html.escape(s, quote=True)


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), 'w', encoding='utf-8') as f:
        f.write(s)


# ---------- נתוני המוצרים מתוך store.js ----------
def load_products():
    js = """
    global.window = { addEventListener(){} }; global.document = { addEventListener(){}, querySelector(){ return null }, querySelectorAll(){ return [] } };
    global.localStorage = { getItem(){ return null }, setItem(){} }; global.CustomEvent = function(){};
    require(process.argv[1]);
    console.log(JSON.stringify(window.Elef.PRODUCTS));
    """
    out = subprocess.run(['node', '-e', js, os.path.join(ROOT, 'js/store.js')], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


PRODUCTS = load_products()
BY_ID = {p['id']: p for p in PRODUCTS}
money = lambda n: '₪' + format(n, ',')


def picture(base, alt, sizes, eager=False):
    small, big = (600, 1000) if base.startswith('images/p-') else (1000, 2000)
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return ('<img src="%s-%d.webp" srcset="%s-%d.webp %dw, %s-%d.webp %dw" sizes="%s" alt="%s" %s decoding="async">'
            % (base, small, base, small, small, base, big, big, sizes, esc(alt), load))


def card(p):
    """אותו כרטיס מוצר כמו card() ב-store.js, כדי שיופיע גם בלי JavaScript."""
    badge = '<span class="product__badge">%s</span>' % p['badge'] if p.get('badge') else ''
    return ('<article class="product" data-cat="%(cat)s">'
            '<a class="product__media" href="%(slug)s.html" tabindex="-1" aria-hidden="true">%(pic)s%(badge)s</a>'
            '<div class="product__body"><h3 class="product__name"><a href="%(slug)s.html">%(name)s</a></h3>'
            '<p class="product__meta"><span>%(size)s</span><span class="product__profile">%(profile)s</span></p>'
            '<p class="product__short">%(short)s</p>'
            '<div class="product__foot"><span class="product__price">%(price)s</span>'
            '<button class="btn btn--small" type="button" data-add="%(id)s">הוספה לסל</button></div></div></article>'
            % dict(p, pic=picture(p['img'], p['alt'], '(min-width: 1100px) 30vw, (min-width: 640px) 45vw, 92vw'),
                   badge=badge, price=money(p['price'])))


# ---------- חלקים משותפים מתוך product.html ----------
TPL = read('product.html')
CHROME_TOP = TPL[TPL.index('<a class="skip"'):TPL.index('</header>') + len('</header>')]
CHROME_BOTTOM = TPL[TPL.index('<footer class="site-footer">'):TPL.index('<div class="toast"')]
CHROME_BOTTOM += '<div class="toast" id="toast" role="status" aria-live="polite"></div>\n'
CHROME_BOTTOM += '<aside class="ai-credit" aria-label="קרדיט">האתר כולו נוצר בבינה מלאכותית על ידי HG Studio</aside>\n'


def head(title, desc, path, og_type='website', image='images/og.jpg', ld=None, extra=''):
    lds = ''.join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False) for x in (ld or []))
    return '''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(t)s</title>
<meta name="description" content="%(d)s">
<link rel="canonical" href="%(url)s">
<meta property="og:title" content="%(t)s">
<meta property="og:description" content="%(d)s">
<meta property="og:type" content="%(ogt)s">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="אלף, שמן זית מהגליל">
<meta property="og:url" content="%(url)s">
<meta property="og:image" content="%(img)s">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1f2c38">
<link rel="icon" href="images/favicon-64.png" type="image/png">
<link rel="apple-touch-icon" href="images/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="%(fonts)s" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<script>document.documentElement.classList.add('js');</script>
%(extra)s%(ld)s</head>
''' % dict(t=esc(title), d=esc(desc), url=BASE + path, ogt=og_type, img=BASE + image, fonts=FONTS, ld=lds, extra=extra)


def crumbs_ld(items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': BASE + u}
                                for i, (n, u) in enumerate(items)]}


def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}


# ---------- עמודי מוצר ----------
def product_ld(p):
    return {
        '@context': 'https://schema.org', '@type': 'Product',
        'name': 'אלף %s %s' % (p['name'], p['size']), 'sku': 'ELEF-' + p['id'].upper(),
        'description': p['long'], 'image': [BASE + p['img'] + '-1000.webp'],
        'brand': {'@type': 'Brand', 'name': 'אלף'}, 'category': 'שמן זית כתית מעולה',
        'offers': {
            '@type': 'Offer', 'url': BASE + p['slug'] + '.html', 'priceCurrency': 'ILS', 'price': p['price'],
            'availability': 'https://schema.org/PreOrder', 'itemCondition': 'https://schema.org/NewCondition',
            'priceValidUntil': '2027-01-31',
            'shippingDetails': {'@type': 'OfferShippingDetails',
                                'shippingRate': {'@type': 'MonetaryAmount', 'value': 29, 'currency': 'ILS'},
                                'shippingDestination': {'@type': 'DefinedRegion', 'addressCountry': 'IL'},
                                'deliveryTime': {'@type': 'ShippingDeliveryTime',
                                                 'handlingTime': {'@type': 'QuantitativeValue', 'minValue': 0, 'maxValue': 2, 'unitCode': 'DAY'},
                                                 'transitTime': {'@type': 'QuantitativeValue', 'minValue': 2, 'maxValue': 4, 'unitCode': 'DAY'}}},
            'hasMerchantReturnPolicy': {'@type': 'MerchantReturnPolicy', 'applicableCountry': 'IL',
                                        'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
                                        'merchantReturnDays': 14, 'returnMethod': 'https://schema.org/ReturnByMail',
                                        'returnFees': 'https://schema.org/FreeReturn'},
        },
    }


def meters(p, k, label):
    on = p['taste'][k]
    return ('<span class="meter" data-meter="%s" role="img" aria-label="%s: %d מתוך 5">%s</span>'
            % (k, label, on, ''.join('<i class="%s"></i>' % ('on' if i <= on else '') for i in range(1, 6))))


def build_product(p):
    body = TPL[TPL.index('<main id="main"'):TPL.index('</main>') + len('</main>')]
    gallery = picture(p['img'], p['alt'], '(min-width: 900px) 56vw, 92vw', eager=True) + ''.join(
        picture(g, '', '(min-width: 900px) 28vw, 46vw') for g in p['gallery'])
    reviews = {'early': 118, 'souri': 74, 'ancient': 29, 'daily': 52, 'tin': 23, 'gift': 16}
    rep = [
        ('<li aria-current="page" data-crumb>שמן זית</li>', '<li aria-current="page" data-crumb>%s</li>' % p['name']),
        ('<div class="pdp__gallery" data-gallery role="region" aria-label="תמונות המוצר" tabindex="0"></div>',
         '<div class="pdp__gallery" data-gallery role="region" aria-label="תמונות המוצר" tabindex="0">%s</div>' % gallery),
        ('<span class="pdp__badge" data-badge hidden></span>',
         '<span class="pdp__badge" data-badge>%s</span>' % p['badge'] if p.get('badge') else '<span class="pdp__badge" data-badge hidden></span>'),
        ('<h1 data-name></h1>', '<h1 data-name>%s</h1>' % p['name']),
        ('<p class="pdp__size" data-size></p>', '<p class="pdp__size" data-size>%s</p>' % p['size']),
        ('<span data-rating></span>', '<span data-rating>4.9, %d ביקורות</span>' % reviews.get(p['id'], 12)),
        ('<span data-price></span>', '<span data-price>%s</span>' % money(p['price'])),
        ('<p data-long></p>', '<p data-long>%s</p>' % p['long']),
        ('<span class="meter" data-meter="bitter"></span>', meters(p, 'bitter', 'מרירות')),
        ('<span class="meter" data-meter="pungent"></span>', meters(p, 'pungent', 'חריפות')),
        ('<span class="meter" data-meter="fruity"></span>', meters(p, 'fruity', 'פירותיות')),
        ('<button class="btn" type="button" data-add data-use-qty>', '<button class="btn" type="button" data-add="%s" data-use-qty>' % p['id']),
        ('<span data-notes></span>', '<span data-notes>%s</span>' % p['notes']),
        ('<span data-pair></span>', '<span data-pair>%s</span>' % p['pair']),
        ('<td data-variety></td>', '<td data-variety>%s</td>' % p['variety']),
        ('<td data-harvest></td>', '<td data-harvest>%s</td>' % p['harvest']),
        ('<td data-acidity></td>', '<td data-acidity>%s</td>' % p['acidity']),
        ('<td data-poly></td>', '<td data-poly>%s</td>' % p['poly']),
        ('<div class="grid" data-more></div>', '<div class="grid" data-more>%s</div>' % ''.join(card(x) for x in [y for y in PRODUCTS if y['id'] != p['id']][:3])),
    ]
    for a, b in rep:
        assert a in body, a
        body = body.replace(a, b)
    # מדריכים שקשורים למוצר
    rel = [a for a in ARTICLES if p['id'] in a['products']][:3]
    if rel:
        body = body.replace('</main>', guides_section(rel, 'מדריכים שקשורים לשמן הזה') + '</main>')
    script = TPL[TPL.index('<script src="js/store.js"></script>'):TPL.index('</body>')]
    script = script.replace("var id = new URLSearchParams(location.search).get('p');",
                            "var id = document.body.getAttribute('data-product');")
    # בעמוד הסטטי הנתונים המובנים כבר ב-head, וההפניה מכתובות ישנות לא רלוונטית
    script = re.sub(r"\n  var ld = document.createElement\('script'\);.*?document.head.appendChild\(ld\);\n", "\n", script, flags=re.S)
    script = re.sub(r"\n  /\* כתובות ישנות.*?\n  }\n", "\n", script, flags=re.S)
    # הכותרת והתיאור לגוגל כבר כתובים ב-head, אז הסקריפט לא דורס אותם
    for line in ["  document.title = p.name + ' ' + p.size + ' | אלף, שמן זית מהגליל';\n",
                 "  var md = document.querySelector('meta[name=\"description\"]');\n",
                 "  md.setAttribute('content', p.short);\n"]:
        assert line in script, line
        script = script.replace(line, '')
    title = '%s %s, שמן זית כתית מעולה | אלף' % (p['name'], p['size'])
    desc = p['short'] + ' %s, משלוח עד הבית מבית הבד בגליל העליון.' % money(p['price'])
    page = (head(title, desc, p['slug'] + '.html', 'product', p['img'] + '-1000.webp',
                 [product_ld(p), crumbs_ld([('אלף', ''), ('חנות', 'index.html#shop'), (p['name'], p['slug'] + '.html')])])
            + '<body data-product="%s">\n' % p['id'] + CHROME_TOP + '\n\n' + body + '\n\n' + CHROME_BOTTOM + '\n' + script + '</body>\n</html>\n')
    write(p['slug'] + '.html', page)


# ---------- מדריכים ----------
def img_tag(base, alt, sizes, eager=False):
    return picture('images/' + base, alt, sizes, eager)


def read_minutes(text):
    words = len(re.sub(r'<[^>]+>', ' ', text).split())
    return max(2, round(words / 180))


def guides_section(arts, heading, hid='guides-title'):
    items = ''.join(
        '<li class="guide-card"><a href="%s.html">%s<span class="guide-card__title">%s</span>'
        '<span class="guide-card__dek">%s</span></a></li>'
        % (a['slug'], img_tag(a['image'], '', '(min-width: 900px) 30vw, 92vw'), a['title'], a['description'])
        for a in arts)
    return ('<section class="section section--tight guides" aria-labelledby="%s"><div class="wrap">'
            '<div class="section-head"><h2 id="%s">%s</h2><a class="link" href="madrichim.html">כל המדריכים</a></div>'
            '<ul class="guide-grid">%s</ul></div></section>\n' % (hid, hid, heading, items))


def product_callout(pid):
    p = BY_ID[pid]
    return ('<div class="callout" data-label="%s">%s<div class="callout__body"><p class="callout__kicker">מהכרם שלנו</p>'
            '<p class="callout__name"><a href="%s.html">%s</a></p><p class="callout__short">%s</p>'
            '<p class="callout__foot"><span class="product__price">%s</span>'
            '<button class="btn btn--small" type="button" data-add="%s">הוספה לסל</button></p></div></div>'
            % (esc(p['name']), picture(p['img'], p['alt'], '160px'), p['slug'], p['name'], p['short'], money(p['price']), p['id']))


def build_article(a):
    body = re.sub(r'\{\{product:(\w+)\}\}', lambda m: product_callout(m.group(1)), a['body'])
    # טבלה רחבה נגללת לצדדים בטלפון, ולכן צריך להגיע אליה גם במקלדת
    body = body.replace('<div class="table-wrap">', '<div class="table-wrap" tabindex="0" role="region" aria-label="טבלה, אפשר לגלול לצדדים">')
    faq = ''.join('<details class="qa"><summary>%s</summary><div><p>%s</p></div></details>' % (q, ans) for q, ans in a['faq'])
    mins = read_minutes(a['body'] + a['dek'])
    others = [x for x in ARTICLES if x['slug'] != a['slug']][:3]
    prods = ''.join(card(BY_ID[i]) for i in a['products'])
    url = a['slug'] + '.html'
    ld = [
        {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': a['title'], 'description': a['description'],
         'image': [BASE + 'images/' + a['image'] + ('-1000.webp' if a['image'].startswith('p-') else '-2000.webp')],
         'datePublished': TODAY, 'dateModified': TODAY, 'inLanguage': 'he-IL',
         'author': {'@type': 'Organization', 'name': 'צוות בית הבד של אלף', 'url': BASE},
         'publisher': {'@type': 'Organization', 'name': 'אלף, שמן זית מהגליל', 'logo': {'@type': 'ImageObject', 'url': BASE + 'images/apple-touch-icon.png'}},
         'mainEntityOfPage': BASE + url, 'keywords': ', '.join(a['keywords'])},
        crumbs_ld([('אלף', ''), ('מדריכים', 'madrichim.html'), (a['title'], url)]),
        faq_ld(a['faq']),
    ]
    main = '''<main id="main" class="on-light">
  <article class="article">
    <div class="wrap article__wrap">
      <nav class="crumbs" aria-label="מיקום בעמוד"><ol><li><a href="index.html">בית</a></li><li><a href="madrichim.html">מדריכים</a></li><li aria-current="page">%(title)s</li></ol></nav>
      <header class="article__head">
        <h1>%(title)s</h1>
        <p class="article__dek">%(dek)s</p>
        <p class="article__meta">צוות בית הבד של אלף <span aria-hidden="true">|</span> <time datetime="%(date)s">9 באוקטובר 2026</time> <span aria-hidden="true">|</span> %(mins)d דקות קריאה</p>
      </header>
      <figure class="article__hero">%(hero)s</figure>
      <div class="article__body">%(body)s</div>
      <section class="article__faq" aria-labelledby="faq-title"><h2 id="faq-title">שאלות נפוצות</h2>%(faq)s</section>
    </div>
  </article>
  <section class="section section--tight process" aria-labelledby="prods-title"><div class="wrap">
    <div class="section-head"><h2 id="prods-title">השמנים שהוזכרו במדריך</h2></div>
    <div class="grid">%(prods)s</div>
  </div></section>
  %(more)s
</main>''' % dict(title=a['title'], dek=a['dek'], date=TODAY, mins=mins,
                  hero=img_tag(a['image'], a['image_alt'], '(min-width: 900px) 760px, 100vw', eager=True),
                  body=body, faq=faq, prods=prods, more=guides_section(others, 'עוד מדריכים', 'more-guides'))
    page = (head(a['seo_title'] + ' | אלף', a['description'], url, 'article',
                 'images/' + a['image'] + ('-1000.webp' if a['image'].startswith('p-') else '-2000.webp'), ld)
            + '<body>\n' + CHROME_TOP + '\n\n' + main + '\n\n' + CHROME_BOTTOM + '\n<script src="js/store.js"></script>\n</body>\n</html>\n')
    write(url, page)


def build_index():
    items = ''.join(
        '<li class="guide-card guide-card--wide"><a href="%s.html">%s<span class="guide-card__title">%s</span>'
        '<span class="guide-card__dek">%s</span><span class="guide-card__meta">%d דקות קריאה</span></a></li>'
        % (a['slug'], img_tag(a['image'], '', '(min-width: 900px) 30vw, 92vw'), a['title'], a['description'], read_minutes(a['body'] + a['dek']))
        for a in ARTICLES)
    ld = [{'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'מדריכים על שמן זית', 'url': BASE + 'madrichim.html',
           'hasPart': [{'@type': 'BlogPosting', 'headline': a['title'], 'url': BASE + a['slug'] + '.html'} for a in ARTICLES]},
          crumbs_ld([('אלף', ''), ('מדריכים', 'madrichim.html')])]
    main = '''<main id="main" class="on-light">
  <div class="wrap">
    <nav class="crumbs" aria-label="מיקום בעמוד"><ol><li><a href="index.html">בית</a></li><li aria-current="page">מדריכים</li></ol></nav>
    <header class="guides-head">
      <h1>מדריכים על שמן זית</h1>
      <p>מה שלמדנו בארבעה דורות בכרם ובבית הבד: איך בוחרים שמן, איך שומרים אותו, איך מבשלים בו ומה קורה בעונת הקטיף.</p>
    </header>
    <ul class="guide-grid guide-grid--index">%s</ul>
  </div>
</main>''' % items
    page = (head('מדריכים על שמן זית: בחירה, שמירה ובישול | אלף',
                 'מדריכים מבית בד בגליל העליון: איך בוחרים שמן זית כתית מעולה, מה זה פוליפנולים, איך שומרים שמן, טיגון בשמן זית והזן הסורי.',
                 'madrichim.html', ld=ld)
            + '<body>\n' + CHROME_TOP + '\n\n' + main + '\n\n' + CHROME_BOTTOM + '\n<script src="js/store.js"></script>\n</body>\n</html>\n')
    write('madrichim.html', page)


def build_home_guides():
    s = read('index.html')
    block = '<!--GUIDES-->\n' + guides_section(ARTICLES[:3], 'מדריכים מבית הבד', 'home-guides') + '<!--/GUIDES-->'
    s = re.sub(r'<!--GUIDES-->.*?<!--/GUIDES-->', lambda m: block, s, flags=re.S)
    write('index.html', s)


def build_sitemap():
    pages = [('', '1.0', 'weekly'), ('madrichim.html', '0.8', 'weekly'), ('info.html', '0.3', 'monthly')]
    pages += [(p['slug'] + '.html', '0.9', 'weekly') for p in PRODUCTS]
    pages += [(a['slug'] + '.html', '0.7', 'monthly') for a in ARTICLES]
    urls = ''.join('  <url><loc>%s%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq><priority>%s</priority></url>\n'
                   % (BASE, u, TODAY, f, pr) for u, pr, f in pages)
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')


if __name__ == '__main__':
    for p in PRODUCTS:
        build_product(p)
    for a in ARTICLES:
        build_article(a)
    build_index()
    build_home_guides()
    build_sitemap()
    print('built %d product pages, %d guides, madrichim.html, sitemap.xml' % (len(PRODUCTS), len(ARTICLES)))
