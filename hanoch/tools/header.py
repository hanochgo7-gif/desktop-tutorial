# הכותרת העליונה האחידה של האתר (חדר העריכה): לוגו, שעון ישראל, אותו תפריט ואותו כפתור אחד בכל העמודים.
# משמש את tools/seo_pages.py ו-tools/blog.py, ואת index.html ו-gallery/index.html (tools/header_apply.py).
# up: הקידומת לשורש האתר ('' בדף הבית, '../' או '/' בשאר). current: הקישור שמסומן aria-current.
# העיצוב: css/home.css + css/cut.css בדף הבית ובגלריה, css/head.css בשאר העמודים.
import html


def header(up, wa, current='', he=True):
    esc = html.escape
    if he:
        links = [('archive/', 'עבודות'), ('#films', 'סרטים'), ('gallery/', 'תמונות'), ('services/', 'שירותים'),
                 ('#systems', 'מערכות'), ('#faq', 'שאלות'), ('blog/', 'מאמרים')]
        lang = f'<a href="{up}en.html" lang="en" hreflang="en">EN</a>'
        home, home_label, nav_label, menu_label, clock_k, cta = (up or '/'), 'HG Studio, לדף הבית', 'ראשי', 'תפריט', 'ישראל', 'וואטסאפ'
        extra = ('<a href="tel:+972545522053">חיוג <span dir="ltr">054-5522053</span></a>'
                 '<button type="button" data-callback hidden>שאחזור אליכם בשעה נוחה</button>')
    else:
        links = [('archive/en.html', 'Work'), ('services/en/', 'Services')]
        lang = f'<a href="{up or "/"}" lang="he" hreflang="he">עברית</a>'
        home, home_label, nav_label, menu_label, clock_k, cta = up + 'en.html', 'HG Studio, home', 'Main', 'Menu', 'Israel', 'WhatsApp'
        extra = '<a href="tel:+972545522053">Call <span dir="ltr">+972 54-552-2053</span></a>'

    def a(href, label):
        cur = ' aria-current="page"' if href == current else ''
        return f'<a href="{up}{href}"{cur}>{label}</a>'
    nav = ''.join(a(h, l) for h, l in links) + lang
    return (f'<header class="top" id="top">\n'
            f'  <a class="logo" href="{home}" aria-label="{home_label}">HG<b>·</b>STUDIO</a>\n'
            f'  <p class="clock" aria-hidden="true"><span>{clock_k}</span> <time data-clock></time></p>\n'
            f'  <nav class="nav" aria-label="{nav_label}">{nav}</nav>\n'
            f'  <a class="top-wa" href="{esc(wa)}" target="_blank" rel="noopener">{cta}</a>\n'
            f'  <details class="menu"><summary aria-label="{menu_label}"><span></span><span></span><span></span></summary>'
            f'<div class="menu-sheet">{nav}{extra}</div></details>\n'
            f'</header>')
