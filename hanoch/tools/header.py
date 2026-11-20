# הכותרת העליונה והתחתונה האחידות של האתר: סימן מסחרי, חמישה קישורים, EN וכפתור וואטסאפ.
# משמש את tools/seo_pages.py, tools/blog.py ו-tools/legal.py, ואת העמודים שנכתבים ביד (tools/header_apply.py).
# up: הקידומת לשורש האתר ('' בדף הבית, '../' או '/' בשאר). current: הקישור שמסומן aria-current.
# העיצוב: css/head.css (בכל העמודים). עמוד בעברית בשפת הסטודיו מקבל class="st" על body ואת studio_head().
import html


def studio_head(up, page_css=True):
    # השפה של הסטודיו (css/head.css): שני הגופנים של המסך הראשון נטענים מראש, ואחריהם head.css ו-page.css (עמודי טקסט)
    return (f'<link rel="preload" as="font" type="font/woff2" href="{up}fonts/b/noto-serif-hebrew-c.woff2" crossorigin>\n'
            f'<link rel="preload" as="font" type="font/woff2" href="{up}fonts/b/plex-he-400.woff2" crossorigin>\n'
            f'<link rel="stylesheet" href="{up}css/head.css?v=6">'
            + (f'\n<link rel="stylesheet" href="{up}css/page.css?v=1">' if page_css else ''))


def header(up, wa, current='', he=True):
    esc = html.escape
    if he:
        links = [('archive/', 'עבודות'), ('#films', 'סרטים'), ('gallery/', 'תמונות'), ('services/', 'שירותים'), ('#contact', 'צור קשר')]
        lang = f'<a class="top-lang" href="{up}en.html" lang="en" hreflang="en">EN</a>'
        home, home_label, nav_label, menu_label, cta = (up or '/'), 'HG Studio, לדף הבית', 'ראשי', 'תפריט', 'וואטסאפ'
        extra = (f'<a class="menu-wa" href="{esc(wa)}" target="_blank" rel="noopener">וואטסאפ</a>'
                 '<a href="tel:+972545522053">חיוג <span dir="ltr">054-5522053</span></a>'
                 '<button type="button" data-callback hidden>שאחזור אליכם בשעה נוחה</button>')
    else:
        links = [('archive/en.html', 'Work'), ('services/en/', 'Services')]
        lang = f'<a class="top-lang" href="{up or "/"}" lang="he" hreflang="he">עברית</a>'
        home, home_label, nav_label, menu_label, cta = up + 'en.html', 'HG Studio, home', 'Main', 'Menu', 'WhatsApp'
        extra = (f'<a class="menu-wa" href="{esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>'
                 '<a href="tel:+972545522053">Call <span dir="ltr">+972 54-552-2053</span></a>')

    def a(href, label):
        cur = ' aria-current="page"' if href == current else ''
        return f'<a href="{up}{href}"{cur}>{label}</a>'
    nav = ''.join(a(h, l) for h, l in links)
    return (f'<header class="top" id="top">\n'
            f'  <a class="logo" href="{home}" aria-label="{home_label}">HG<b>·</b>STUDIO</a>\n'
            f'  <nav class="nav" aria-label="{nav_label}">{nav}{lang}</nav>\n'
            f'  <a class="top-wa" href="{esc(wa)}" target="_blank" rel="noopener">{cta}</a>\n'
            f'  <details class="menu"><summary aria-label="{menu_label}"><span></span><span></span></summary>'
            f'<div class="menu-sheet">{nav}{lang}{extra}</div></details>\n'
            f'</header>')


WA_DEFAULT = 'https://wa.me/972545522053'


def footer(up, he=True, wa=WA_DEFAULT):
    # שורה אחת: הסימן, טלפון, מייל, וקישורים למה שלא צריך להיות בתפריט הראשי.
    # אחריה פס הפנייה הקבוע של הטלפון (css/head.css, js/chrome.js): וואטסאפ בצד של האגודל (ימין), וחיוג לידו.
    # עמוד עם אלמנט data-dock-wait (למשל הכפתור בפתיחה) מציג את הפס רק אחרי שהאלמנט יצא מהמסך למעלה
    if he:
        links = [('faq.html', 'שאלות'), ('blog/', 'מאמרים'), ('accessibility.html', 'נגישות'), ('privacy.html', 'פרטיות'), ('terms.html', 'תנאים')]
        home, nav_label, cookies, tel = (up or '/'), 'תחתון', 'עוגיות', '054-5522053'
        dock_label, dock_wa, dock_call = 'פנייה מהירה', 'וואטסאפ', 'חיוג'
    else:
        links = [('en-accessibility.html', 'Accessibility'), ('en-privacy.html', 'Privacy'), ('en-terms.html', 'Terms')]
        home, nav_label, cookies, tel = up + 'en.html', 'Footer', 'Cookies', '+972 54-552-2053'
        dock_label, dock_wa, dock_call = 'Quick contact', 'WhatsApp', 'Call'
    nav = ''.join(f'<a href="{up}{h}">{l}</a>' for h, l in links)
    return (f'<footer class="ft">\n'
            f'  <a class="ft-mark" href="{home}" aria-label="HG Studio">HG<b>·</b>STUDIO</a>\n'
            f'  <p class="ft-reach"><a href="tel:+972545522053" dir="ltr">{tel}</a><a href="mailto:boss@hgpro.io">boss@hgpro.io</a></p>\n'
            f'  <nav class="ft-nav" aria-label="{nav_label}">{nav}<a href="#" data-consent-open>{cookies}</a></nav>\n'
            f'</footer>\n'
            f'<nav class="dock" id="dock" aria-label="{dock_label}"><a class="dock-wa" href="{html.escape(wa)}" target="_blank" rel="noopener">{dock_wa}</a>'
            f'<a class="dock-call" href="tel:+972545522053">{dock_call}</a></nav>')
