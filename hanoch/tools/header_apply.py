# מעדכן את הכותרת העליונה והתחתונה מ-tools/header.py בעמודים שלא נבנים בכלים אחרים
# (שירותים: seo_pages.py, מאמרים: blog.py, פרטיות/תנאים/ביטולים: legal.py).
# עמוד שכבר יש בו <header class="top"> מתעדכן. עמוד בלי כותרת כזו מקבל אותה אחרי קישור הדילוג, יחד עם css/head.css ו-js/chrome.js.
# הכותרת התחתונה (<footer class="ft">) מתעדכנת, ועמוד שאין בו אחת מקבל אותה לפני הסקריפטים שבסוף העמוד.
# מריצים אחרי כל שינוי ב-header.py:  python3 tools/header_apply.py
import os, re
from header import header, footer
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WA = 'https://wa.me/972545522053'
# (קובץ, קידומת לשורש, קישור מסומן, עברית?, נתיב לקבצי css/js)
PAGES = [('index.html', '', '', True, '/'), ('gallery/index.html', '/', 'gallery/', True, '/'),
         ('work.html', '/', 'work.html', True, '/'), ('faq.html', '/', '', True, '/'), ('brief.html', '/', '', True, '/'),
         ('systems.html', '/', '', True, '/'),
         ('accessibility.html', '', '', True, ''), ('en-accessibility.html', '', '', False, ''), ('404.html', '/', '', True, '/')]
for path, up, current, he, asset in PAGES:
    f = os.path.join(ROOT, path)
    if not os.path.exists(f):
        continue
    s = open(f, encoding='utf-8').read()
    m = re.search(r'<header class="top" id="top">.*?\n</header>', s, re.S)
    if m:
        wa = re.search(r'class="[^"]*top-wa[^"]*" href="([^"]+)"', m.group(0)).group(1).replace('&amp;', '&')
        s = s[:m.start()] + header(up, wa, current, he) + s[m.end():]
    else:
        # כותרת חדשה: אחרי קישור הדילוג (או בתחילת body), וקישור "חזרה לאתר" עם החץ כבר לא צריך
        h = header(up, WA, current, he)
        m2 = re.search(r'<a class="skip"[^>]*>[^<]*</a>\n', s) or re.search(r'<body[^>]*>\n', s)
        s = s[:m2.end()] + h + '\n' + s[m2.end():]
        s = re.sub(r'\n\s*<a class="back" href="[^"]*">[^<]*</a>', '', s)
        if 'head.css' not in s:
            s = re.sub(r'(<link rel="stylesheet" href="[^"]*hanoch\.css[^"]*">)', r'\1\n<link rel="stylesheet" href="' + asset + 'css/head.css?v=3">', s, 1)
        if 'chrome.js' not in s:
            s = re.sub(r'(<script src="[^"]*a11y\.js"[^>]*></script>)', r'\1\n<script src="' + asset + 'js/chrome.js?v=1" defer></script>', s, 1)
    ft = footer(up, he)
    m3 = re.search(r'<footer class="ft">.*?\n</footer>', s, re.S)
    if m3:
        s = s[:m3.start()] + ft + s[m3.end():]
    else:
        end = s.find('</main>')
        nxt = s.find('<script src', end)
        s = s[:nxt] + ft + '\n' + s[nxt:]
    open(f, 'w', encoding='utf-8').write(s)
    print('header:', path)
