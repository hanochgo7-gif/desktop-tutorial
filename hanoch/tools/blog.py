# מחולל הבלוג (מאמרי קידום). מריצים: python3 tools/blog.py
# מקור: tools/posts/*.md (כותרת של שורות key: value בין --- + גוף ב-Markdown). פלט: blog/<slug>.html, blog/index.html, blog/feed.xml, blog/posts.json
# שאלות נפוצות: כל ### בתוך הפרק "## שאלות נפוצות" הופך לשאלה עם סימון לגוגל.
import os, re, json, html, glob, datetime, urllib.parse
from seo_pages import CSS, FR, WA, D, BY

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ROOT + '/tools/posts'
OUT = ROOT + '/blog'
esc = html.escape
MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
AUTHOR = {'@type': 'Person', '@id': D + '/#hanoch', 'name': 'חנוך גוטובסקי', 'alternateName': 'Hanoch Gotovski', 'url': D + '/', 'jobTitle': 'מעצב ומפתח אתרים'}
ORG = {'@type': 'Organization', '@id': D + '/#business', 'name': 'HGPRO', 'url': D + '/', 'logo': {'@type': 'ImageObject', 'url': D + '/images/icon-512.png'}}

BLOG_CSS = '''
.bl-meta { font-family: var(--f-mono); font-size: .76rem; color: var(--fg-dim); display: flex; flex-wrap: wrap; gap: .3rem 1rem; margin-top: 2rem; }
.bl-meta b { color: var(--signal); font-weight: 400; }
.bl-cover { margin: 2rem 0 0; border-radius: 18px; overflow: hidden; border: 1px solid rgba(237,232,222,.1); }
.bl-cover img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; }
.bl-sum { margin: 2rem 0 0; padding: 20px 22px; border-radius: 14px; border-inline-start: 3px solid var(--signal); background: rgba(237,232,222,.035); }
.bl-sum p { margin: 0; }
.bl-sum p + p { margin-top: .6rem; }
.bl-toc { margin: 2rem 0 0; padding: 18px 22px; border-radius: 14px; border: 1px solid rgba(237,232,222,.1); }
.bl-toc b { font-family: var(--f-mono); font-size: .76rem; color: var(--fg-dim); font-weight: 400; }
.bl-toc ol { margin: .6rem 0 0; gap: .3rem !important; }
.bl-toc a { color: #ede8de; text-decoration: none; }
.bl-toc a:hover { color: var(--signal); }
.sv ol { padding-inline-start: 1.6rem; display: grid; gap: .45rem; }
.sv h3 { font-family: "IBM Plex Sans Hebrew", sans-serif; font-weight: 500; font-size: 1.18rem; color: #ede8de; margin: 2rem 0 .4rem; }
.sv strong { color: #ede8de; font-weight: 500; }
.bl-table { overflow-x: auto; margin: 1.2rem 0; border: 1px solid rgba(237,232,222,.1); border-radius: 14px; }
.bl-table table { border-collapse: collapse; width: 100%; font-family: "IBM Plex Sans Hebrew", sans-serif; font-size: .95rem; }
.bl-table th, .bl-table td { text-align: start; padding: 12px 16px; border-bottom: 1px solid rgba(237,232,222,.08); color: rgba(237,232,222,.86); vertical-align: top; }
.bl-table th { color: #ede8de; font-weight: 500; background: rgba(237,232,222,.04); }
.bl-table tr:last-child td { border-bottom: 0; }
.bl-author { display: flex; gap: 16px; align-items: center; margin: 3rem 0 0; padding: 20px; border-radius: 16px; border: 1px solid rgba(237,232,222,.1); }
.bl-author img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex: none; background: #1a1a1c; }
.bl-author p { margin: 0; font-size: .95rem !important; line-height: 1.7 !important; }
.bl-author b { color: #ede8de; font-weight: 500; }
.sv-lead + .bl-list { margin-top: 2.2rem; }
.bl-list { list-style: none; padding: 0 !important; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px !important; }
.bl-list a { display: block; height: 100%; text-decoration: none; border-radius: 16px; overflow: hidden; border: 1px solid rgba(237,232,222,.1); background: rgba(237,232,222,.025); }
.bl-list img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.bl-list .tx { display: block; padding: 14px 16px 18px; }
.bl-list time { font-family: var(--f-mono); font-size: .72rem; color: var(--fg-dim); }
.bl-list b { display: block; color: #ede8de; font-family: var(--f-display); font-weight: 400; font-size: 1.35rem; line-height: 1.25; margin: .3rem 0; }
.bl-list .tx span { display: block; color: rgba(237,232,222,.7); font-family: "IBM Plex Sans Hebrew", sans-serif; font-size: .92rem; line-height: 1.6; }
'''


def heb_date(d): return f'{d.day} ב{MONTHS[d.month - 1]} {d.year}'


def inline(t):
    t = esc(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    def link(m):
        txt, href = m.group(1), m.group(2)
        ext = href.startswith('http') and not href.startswith(D)
        if href.startswith(D): href = '../' + href[len(D) + 1:]
        return f'<a href="{href}"' + (' target="_blank" rel="noopener"' if ext else '') + f'>{txt}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', link, t)


def slugify(t, used):
    s = re.sub(r'[^\w֐-׿]+', '-', t).strip('-')[:60] or 's'
    k, i = s, 2
    while k in used: k = f'{s}-{i}'; i += 1
    used.add(k); return k


def md(body):
    """Markdown מצומצם: ## ### פסקאות, רשימות, טבלאות, > תקציר, **מודגש**, [קישור](url)."""
    out, toc, faq, used = [], [], [], set()
    lines = body.strip('\n').split('\n'); i = 0; in_faq = False; q = None
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip(): i += 1; continue
        if ln.startswith('## '):
            h = ln[3:].strip(); hid = slugify(h, used); toc.append((hid, h)); in_faq = h.startswith('שאלות נפוצות')
            out.append(f'<h2 id="{hid}">{inline(h)}</h2>' + ('<div class="sv-faq">' if in_faq else '')); i += 1; continue
        if ln.startswith('### '):
            h = ln[4:].strip()
            if in_faq:
                q = h; ans = []; i += 1
                while i < len(lines) and not lines[i].startswith('#'):
                    if lines[i].strip(): ans.append(lines[i].strip())
                    i += 1
                a = ' '.join(ans); faq.append((q, re.sub(r'\*\*|\[|\]\([^)]*\)', '', a)))
                out.append(f'<details><summary><h3>{inline(q)}</h3></summary><p>{inline(a)}</p></details>'); continue
            out.append(f'<h3 id="{slugify(h, used)}">{inline(h)}</h3>'); i += 1; continue
        if ln.startswith('>'):
            ps = []
            while i < len(lines) and lines[i].startswith('>'):
                ps.append(lines[i][1:].strip()); i += 1
            paras = [p for p in '\n'.join(ps).split('\n\n') if p.strip()]
            out.append('<div class="bl-sum">' + ''.join(f'<p>{inline(" ".join(p.split()))}</p>' for p in paras) + '</div>'); continue
        if ln.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells): rows.append(cells)
                i += 1
            th = ''.join(f'<th scope="col">{inline(c)}</th>' for c in rows[0])
            tb = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[1:])
            out.append(f'<div class="bl-table"><table><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table></div>'); continue
        m = re.match(r'(\d+\.|-)\s+', ln)
        if m:
            tag = 'ol' if m.group(1) != '-' else 'ul'; items = []
            while i < len(lines) and re.match(r'(\d+\.|-)\s+', lines[i]):
                items.append(re.sub(r'^(\d+\.|-)\s+', '', lines[i].strip())); i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>'); continue
        ps = []
        while i < len(lines) and lines[i].strip() and not re.match(r'(#|>|\||\d+\.\s|-\s)', lines[i]):
            ps.append(lines[i].strip()); i += 1
        out.append(f'<p>{inline(" ".join(ps))}</p>')
    html_ = '\n'.join(out)
    if faq: html_ = re.sub(r'(<div class="sv-faq">.*?)(?=<h2|\Z)', r'\1</div>', html_, count=1, flags=re.S)
    return html_, [t for t in toc if not t[1].startswith('שאלות נפוצות')], faq


def load():
    posts = []
    for f in sorted(glob.glob(SRC + '/*.md')):
        raw = open(f, encoding='utf8').read()
        _, fm, body = raw.split('---', 2)
        p = {}
        for ln in fm.strip().split('\n'):
            k, v = ln.split(':', 1); v = v.strip()
            p[k.strip()] = [x.strip() for x in v[1:-1].split(',') if x.strip()] if v.startswith('[') else v
        p['body'] = body
        p['date'] = datetime.date.fromisoformat(p['date'])
        if p.get('updated'): p['updated'] = datetime.date.fromisoformat(p['updated'])
        if p.get('draft') or p['date'] > datetime.date.today(): continue
        p['url'] = f"{D}/blog/{p['slug']}.html"
        p['words'] = len(re.findall(r'\w+', body))
        posts.append(p)
    return sorted(posts, key=lambda p: p['date'], reverse=True)


def head(title, desc, url, img, extra=''):
    return f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<link rel="alternate" type="application/rss+xml" title="המאמרים של HGPRO" href="{D}/blog/feed.xml">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0a0a0b">
<link rel="icon" href="../images/icon-180.png" type="image/png">
<link rel="apple-touch-icon" href="../images/icon-180.png">
<link rel="preload" href="../fonts/dragon.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300..900&family=IBM+Plex+Sans+Hebrew:wght@400;500&family=JetBrains+Mono:wght@400&display=swap">
{FR}
<link rel="stylesheet" href="../css/hanoch.css">
<style>{CSS}{BLOG_CSS}</style>
{extra}
</head>
<body>
<header class="sv-bar">
  <a class="sv-mark" href="../" aria-label="HGPRO, לדף הבית">HG<span>·</span>PRO</a>
  <nav aria-label="ראשי"><a href="../archive/">עבודות</a><a href="../services/">שירותים</a><a href="./">מאמרים</a><a href="https://wa.me/{WA}" target="_blank" rel="noopener">וואטסאפ</a></nav>
</header>
'''


FOOT = '''<footer class="sv-foot"><span>© 2026 HGPRO · חנוך גוטובסקי</span><a href="../services/">שירותים</a><a href="./">מאמרים</a><a href="feed.xml">RSS</a><a href="../accessibility.html">הצהרת נגישות</a></footer>
<script src="../js/a11y.js" defer></script>
</body>
</html>
'''


def render(p, posts):
    body, toc, faq = md(p['body'])
    U = p['url']; img = D + '/' + p['cover']; mins = max(3, round(p['words'] / 200))
    wa = f'https://wa.me/{WA}?text=' + urllib.parse.quote(f'היי חנוך, קראתי את המאמר "{p["title"].split(" | ")[0]}" באתר. אשמח לשמוע פרטים.')
    graph = [
        {'@type': 'BlogPosting', '@id': U + '#article', 'headline': p['h1'], 'description': p['desc'], 'image': img, 'datePublished': p['date'].isoformat(),
         'dateModified': (p.get('updated') or p['date']).isoformat(), 'inLanguage': 'he-IL', 'wordCount': p['words'], 'keywords': p.get('keyword', ''),
         'author': AUTHOR, 'publisher': ORG, 'mainEntityOfPage': U, 'isPartOf': {'@id': D + '/blog/#blog'}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'HGPRO', 'item': D + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'מאמרים', 'item': D + '/blog/'},
            {'@type': 'ListItem', 'position': 3, 'name': p['h1'], 'item': U}]}]
    if faq: graph.append({'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]})
    ld = '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False) + '</script>'
    extra = f'<meta property="og:type" content="article">\n<meta property="article:published_time" content="{p["date"].isoformat()}">\n{ld}'
    tocs = f'<nav class="bl-toc" aria-labelledby="toc-h"><b id="toc-h">במאמר הזה</b><ol>' + ''.join(f'<li><a href="#{h}">{inline(t)}</a></li>' for h, t in toc) + '</ol></nav>' if len(toc) >= 3 else ''
    svc = ''.join(f'<li><a href="../services/{s}.html">{esc(BY[s]["name"])}</a></li>' for s in p.get('services', []) if s in BY)
    more = [q for q in posts if q['slug'] != p['slug']][:3]
    morel = ''.join(card(q) for q in more)
    return head(p['title'], p['desc'], U, img, extra) + f'''<main class="sv">
  <nav class="sv-crumbs" aria-label="מיקום באתר"><a href="../">HGPRO</a><span aria-hidden="true">/</span><a href="./">מאמרים</a><span aria-hidden="true">/</span><span aria-current="page">{esc(p['h1'])}</span></nav>
  <article>
  <p class="bl-meta"><b>{esc(p.get('kicker', 'מדריך'))}</b><span>חנוך גוטובסקי</span><time datetime="{p['date'].isoformat()}">{heb_date(p['date'])}</time><span>{mins} דקות קריאה</span></p>
  <h1>{esc(p['h1'])}</h1>
  <p class="sv-lead">{inline(p['lead'])}</p>
  <figure class="bl-cover"><img src="../{p['cover']}" alt="{esc(p['cover_alt'])}" width="1200" height="675" fetchpriority="high" decoding="async"></figure>
  {tocs}
  {body}
  <aside class="bl-author" aria-label="על הכותב"><img src="../work/me/character-480.webp" alt="" width="64" height="64" loading="lazy" decoding="async"><p><b>חנוך גוטובסקי</b>, מעצב ומפתח אתרים ומייסד HGPRO. בונה אתרים לעסקים מאפס, בלי תבניות, ומפיק פרסומות בבינה מלאכותית. <a href="../">עוד עליי ועל העבודות</a>.</p></aside>
  </article>
  <section class="sv-cta" aria-labelledby="cta-h">
    <h2 id="cta-h">רוצים אתר כזה לעסק שלכם?</h2>
    <p>שיחת היכרות קצרה, בלי התחייבות. אחריה מקבלים הצעה כתובה עם מחיר סגור.</p>
    <div class="row"><a class="sv-btn" href="{wa}" target="_blank" rel="noopener">שלחו הודעה בוואטסאפ</a><a class="sv-btn ghost" href="tel:+{WA}" dir="ltr">054-5522053</a><a class="sv-btn ghost" href="mailto:boss@hgpro.io">boss@hgpro.io</a></div>
  </section>
  {f'<h2>שירותים קשורים</h2><ul class="sv-rel">{svc}</ul>' if svc else ''}
  {f'<h2>עוד מאמרים</h2><ul class="bl-list">{morel}</ul>' if morel else ''}
</main>
''' + FOOT


def card(p, first=False):
    load = 'fetchpriority="high"' if first else 'loading="lazy"'
    return (f'<li><a href="{p["slug"]}.html"><img src="../{p["cover"]}" alt="" width="1200" height="675" {load} decoding="async">'
            f'<span class="tx"><time datetime="{p["date"].isoformat()}">{heb_date(p["date"])}</time><b>{esc(p["h1"])}</b><span>{esc(p["desc"])}</span></span></a></li>')


def index(posts):
    U = D + '/blog/'
    title = 'מאמרים על בניית אתרים, עיצוב, קידום ו-AI | HGPRO'
    desc = 'מדריכים מעשיים לבעלי עסקים: כמה עולה אתר, איך בוחרים מעצב, קידום אורגני בגוגל, דפי נחיתה שממירים ופרסומות AI. נכתב על ידי חנוך גוטובסקי.'
    ld = '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@type': 'Blog', '@id': U + '#blog', 'name': 'המאמרים של HGPRO', 'url': U, 'inLanguage': 'he-IL',
        'author': AUTHOR, 'publisher': ORG, 'blogPost': [{'@type': 'BlogPosting', 'headline': p['h1'], 'url': p['url'], 'datePublished': p['date'].isoformat(), 'image': D + '/' + p['cover']} for p in posts]}, ensure_ascii=False) + '</script>'
    img = D + '/' + posts[0]['cover'] if posts else D + '/work/og-home.jpg'
    return head(title, desc, U, img, '<meta property="og:type" content="website">\n' + ld) + f'''<main class="sv">
  <nav class="sv-crumbs" aria-label="מיקום באתר"><a href="../">HGPRO</a><span aria-hidden="true">/</span><span aria-current="page">מאמרים</span></nav>
  <h1>מאמרים</h1>
  <p class="sv-lead">מדריכים קצרים וישירים לבעלי עסקים: אתרים, עיצוב, גוגל ובינה מלאכותית. בלי מילים גבוהות, עם מספרים אמיתיים.</p>
  <ul class="bl-list">{''.join(card(p, i == 0) for i, p in enumerate(posts))}</ul>
</main>
''' + FOOT


def feed(posts):
    items = ''.join(f'''
  <item><title>{esc(p['h1'])}</title><link>{p['url']}</link><guid>{p['url']}</guid><pubDate>{datetime.datetime.combine(p['date'], datetime.time(8)).strftime('%a, %d %b %Y %H:%M:%S +0300')}</pubDate><description>{esc(p['desc'])}</description></item>''' for p in posts)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>המאמרים של HGPRO</title><link>{D}/blog/</link><language>he</language>
  <description>מדריכים לבעלי עסקים על בניית אתרים, עיצוב, קידום ובינה מלאכותית.</description>
  <atom:link href="{D}/blog/feed.xml" rel="self" type="application/rss+xml"/>{items}
</channel>
</rss>
'''


if __name__ == '__main__':
    posts = load(); os.makedirs(OUT, exist_ok=True)
    for p in posts:
        assert os.path.exists(ROOT + '/' + p['cover']), 'missing cover ' + p['cover']
        open(f"{OUT}/{p['slug']}.html", 'w', encoding='utf8').write(render(p, posts))
    open(OUT + '/index.html', 'w', encoding='utf8').write(index(posts))
    open(OUT + '/feed.xml', 'w', encoding='utf8').write(feed(posts))
    json.dump([{'url': p['url'], 'cover': p['cover'], 'date': p['date'].isoformat()} for p in posts], open(OUT + '/posts.json', 'w'), indent=1)
    print('posts', len(posts))
