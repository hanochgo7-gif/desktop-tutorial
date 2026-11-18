# מעדכן את הכותרת העליונה בדף הבית ובגלריה מ-tools/header.py (שאר העמודים נבנים ב-seo_pages.py וב-blog.py).
# מריצים אחרי כל שינוי ב-header.py:  python3 tools/header_apply.py
import os, re
from header import header
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [('index.html', '', ''), ('gallery/index.html', '/', 'gallery/')]
for path, up, current in PAGES:
    f = os.path.join(ROOT, path)
    s = open(f, encoding='utf-8').read()
    m = re.search(r'<header class="top" id="top">.*?\n</header>', s, re.S)
    wa = re.search(r'class="[^"]*top-wa[^"]*" href="([^"]+)"', m.group(0)).group(1).replace('&amp;', '&')
    s = s[:m.start()] + header(up, wa, current) + s[m.end():]
    open(f, 'w', encoding='utf-8').write(s)
    print('header:', path)
