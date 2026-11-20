# דפי המידע המשפטי: מדיניות פרטיות, תנאי שימוש, ביטול והחזרים. עברית ואנגלית.
# מריצים: python3 tools/legal.py  (כותב לשורש האתר את privacy/terms/refunds + en-*)
# לא ייעוץ משפטי. טיוטה לבדיקה של עורך דין ישראלי, לא נוסח מאושר.
import os
from header import header, footer, studio_head

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPDATED = {'he': '18 בנובמבר 2026', 'en': 'November 18, 2026'}
# עמודים שעודכנו בתאריך אחר (כרגע כולם עודכנו יחד)
UPDATED_FILE = {}
TEL, TEL_HE, TEL_EN, MAIL = '+972545522053', '054-5522053', '+972 54-552-2053', 'boss@hgpro.io'

STYLE = '''<style>
  .doc { max-width: 760px; margin: 0 auto; padding: 110px var(--gutter) 60px; }
  .doc h1 { font-family: var(--f-display); font-weight: 400; font-size: clamp(2.8rem, 7vw, 5rem); line-height: 1; margin: 1rem 0 2rem; }
  .doc h2 { font-family: var(--f-display); font-weight: 400; font-size: clamp(1.6rem, 3vw, 2.2rem); margin: 2.6rem 0 .8rem; scroll-margin-top: 24px; }
  .doc p, .doc li, .doc td, .doc th { font-family: var(--f-body); font-size: 1.02rem; line-height: 1.8; color: rgba(237, 232, 222, .85); }
  .doc ul { padding-inline-start: 1.2rem; display: grid; gap: .4rem; }
  .doc a { color: var(--signal); }
  .doc .back { font-family: var(--f-mono); font-size: .8125rem; color: var(--fg-dim); display: inline-flex; min-height: 44px; align-items: center; }
  .doc .lead { font-size: 1.12rem; }
  .doc .table-wrap { overflow-x: auto; margin: 1rem 0; }
  .doc .table-wrap:focus-visible { outline: 2px solid var(--signal); outline-offset: 4px; }
  .doc table { width: 100%; border-collapse: collapse; min-width: 560px; }
  .doc th, .doc td { text-align: start; vertical-align: top; padding: .6rem .7rem; border-bottom: 1px solid rgba(237, 232, 222, .14); font-size: .95rem; }
  .doc th { color: #ede8de; font-weight: 500; }
  .doc code { font-family: var(--f-mono); font-size: .85rem; }
  .doc .updated { font-family: var(--f-mono); font-size: .8125rem; color: var(--fg-dim); margin-top: 2.6rem; }
  .doc-foot { max-width: 760px; margin: 0 auto; padding: 24px var(--gutter) 60px; border-top: 1px solid rgba(237, 232, 222, .1); display: flex; flex-wrap: wrap; gap: .2rem 1.2rem; font-family: var(--f-mono); font-size: .8125rem; }
  .doc-foot a { color: var(--fg-dim); display: inline-flex; align-items: center; min-height: 44px; }
  .doc-foot a:hover, .doc-foot a[aria-current] { color: #ede8de; }
</style>'''


def foot(he, cur):
    T = (lambda a, b: a) if he else (lambda a, b: b)
    items = [(T('privacy.html', 'en-privacy.html'), T('מדיניות פרטיות', 'Privacy policy')),
             (T('terms.html', 'en-terms.html'), T('תנאי שימוש', 'Terms of use')),
             (T('refunds.html', 'en-refunds.html'), T('ביטול והחזרים', 'Cancellations & refunds')),
             ('#', T('הגדרות עוגיות', 'Cookie settings')),
             (T('accessibility.html', 'en-accessibility.html'), T('הצהרת נגישות', 'Accessibility statement')),
             (T('./', 'en.html'), T('לדף הבית', 'Home'))]
    out = []
    for href, label in items:
        if href == '#':
            out.append(f'<a href="#" data-consent-open>{label}</a>')
        else:
            cur_attr = ' aria-current="page"' if href == cur else ''
            out.append(f'<a href="{href}"{cur_attr}>{label}</a>')
    return f'<nav class="doc-foot" aria-label="{T("מידע משפטי", "Legal")}">' + ''.join(out) + '</nav>'


# עמודים בעברית: שפת הסטודיו (css/head.css, css/page.css). באנגלית: העיצוב הקודם, כמו שאר האתר באנגלית
def OLD_FONTS(preload): return preload + '<link rel="stylesheet" href="css/fonts.css">\n'
OLD_CSS = '<link rel="stylesheet" href="css/hanoch.css">\n' + STYLE + '\n<link rel="stylesheet" href="css/head.css?v=4">'


def page(lang, file, other, title, desc, h1, body):
    he = lang == 'he'
    T = (lambda a, b: a) if he else (lambda a, b: b)
    fonts = ['fonts/g/rubik-hebrew-423ede.woff2', 'fonts/g/rubik-punct.woff2', 'fonts/handjet-ascii.woff2', 'fonts/handjet-hebrew.woff2'] if he else ['fonts/handjet-ascii.woff2']
    preload = ''.join(f'<link rel="preload" as="font" type="font/woff2" href="{f}" crossorigin>\n' for f in fonts)
    hrefs = {'he': file if he else other, 'en': other if he else file}
    return f'''<!doctype html>
<html lang="{lang}" dir="{'rtl' if he else 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | HG Studio</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://hgpro.io/{file}">
<link rel="alternate" hreflang="he" href="https://hgpro.io/{hrefs['he']}">
<link rel="alternate" hreflang="en" href="https://hgpro.io/{hrefs['en']}">
<link rel="alternate" hreflang="x-default" href="https://hgpro.io/{hrefs['he']}">
{OLD_FONTS(preload) if not he else ''}<link rel="icon" href="images/icon-180.png">
<link rel="apple-touch-icon" href="images/icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
{studio_head('') if he else OLD_CSS}
<script src="js/consent.js?v=6" defer></script>
<script src="js/adcode.js" defer></script>
<script src="js/ga.js" defer></script>
<script src="js/meta.js" defer></script>
</head>
<body{' class="st"' if he else ''}>
<a class="skip" href="#main">{T('דלגו לתוכן', 'Skip to content')}</a>
{header('', 'https://wa.me/972545522053', '', he)}
<main class="doc" id="main">
  <h1>{h1}</h1>
{body}
  <p class="updated">{T('עודכן לאחרונה', 'Last updated')}: {UPDATED_FILE.get(file, UPDATED[lang])} · <a href="{other}" hreflang="{'en' if he else 'he'}" lang="{'en' if he else 'he'}">{T('English', 'עברית')}</a></p>
</main>
{footer('', he)}
<script src="js/fluid.js" defer></script>
<script src="js/a11y.js" defer></script>
<script src="js/chrome.js?v=2" defer></script>
<script src="js/assistant.js?v=3" defer></script>
</body>
</html>
'''


CONTACT_HE = f'<a href="mailto:{MAIL}" dir="ltr">{MAIL}</a>, בוואטסאפ או בטלפון <a href="tel:{TEL}" dir="ltr">{TEL_HE}</a>'
CONTACT_EN = f'<a href="mailto:{MAIL}">{MAIL}</a>, on WhatsApp or by phone at <a href="tel:{TEL}">{TEL_EN}</a>'

# ---------- מדיניות פרטיות ----------
# טיוטה לבדיקת עורך דין (נובמבר 2026). הנוסח מתאר את מה שהאתר עושה בפועל:
# Google נטען רק אחרי אישור עוגיות (מצב הסכמה בסיסי), הפיקסל של Meta כבוי, הטפסים נשמרים ב-Supabase (פרנקפורט),
# היועץ הדיגיטלי עובר דרך Vercel ל-Anthropic. תקופות השמירה הן הצעה שעורך הדין צריך לאשר.
PRIVACY_HE = '''  <p class="lead">האתר hgpro.io שייך ל-HG Studio, העסק של חנוך גוטובסקי. בעמוד הזה מוסבר איזה מידע נאסף כשאתם גולשים באתר או פונים אליי, למה הוא נאסף, עם מי הוא משותף, כמה זמן הוא נשמר ומה הזכויות שלכם.</p>

  <h2>בקצרה</h2>
  <ul>
    <li>באתר אין הרשמה. הפרטים שלכם נשמרים אצלי רק אם שלחתם טופס באתר עם טלפון או מייל, או אם פניתם אליי בוואטסאפ, במייל או בטלפון.</li>
    <li>Google Analytics ו-Google Ads נטענים רק אחרי שאישרתם עוגיות. עד אז האתר לא שולח ל-Google כלום. אפשר לבטל את האישור בכל רגע.</li>
    <li>הפיקסל של Meta לא פעיל באתר, ולא נשלח ל-Meta שום מידע מהגלישה.</li>
    <li>שאלות שאתם כותבים ליועץ הדיגיטלי נשלחות ל-Anthropic כדי לנסח תשובה. אני לא שומר את השיחות.</li>
    <li>אני לא מוכר מידע אישי, ולא שולח הודעות פרסומת בלי הסכמה מפורשת שלכם מראש.</li>
  </ul>

  <h2>מי אחראי על המידע</h2>
  <p>חנוך גוטובסקי, HG Studio. לכל שאלה על פרטיות אפשר לפנות במייל <a href="mailto:boss@hgpro.io" dir="ltr">boss@hgpro.io</a>, בוואטסאפ או בטלפון <a href="tel:+972545522053" dir="ltr">054-5522053</a>.</p>

  <h2>מידע שאתם מוסרים לי</h2>
  <p>כשאתם פונים אליי בוואטסאפ, במייל או בטלפון, אני מקבל את מה שבחרתם לשלוח: שם, טלפון או מייל, ותוכן ההודעה. כשאתם שולחים טופס באתר, הפרטים נשמרים במערכת הפניות שלי, כמו שמוסבר בסעיף הבא. בדף הבית באנגלית יש טופס בריף אחר: הוא לא שולח דבר לשרת, ושומר טיוטה רק בדפדפן שלכם, עד שתבחרו לשלוח אותה בוואטסאפ או במייל.</p>
  <p>מסירת הפרטים אינה חובה לפי חוק, אבל בלי דרך ליצור איתכם קשר לא אוכל לחזור אליכם. אני משתמש במידע כדי לענות לפנייה, להכין הצעת מחיר, לתת את השירות שהוזמן, להוציא קבלות וחשבוניות ולעמוד בחובות שהחוק מטיל עליי.</p>

  <h2 id="crm">מערכת הפניות שלי</h2>
  <p>הטפסים באתר שולחים את הפרטים ישירות מהדפדפן שלכם למערכת ניהול הפניות שלי (HG OS):</p>
  <ul>
    <li>טופס הבריף באתר (בעמוד "בריף קצר"): שם, טלפון או מייל (או שניהם), שם העסק אם כתבתם, מה צריך, מתי רוצים להתחיל, ומה שכתבתם בשדה החופשי.</li>
    <li>בקשה שאחזור אליכם: שם, טלפון, היום והשעה שבחרתם, ומה שכתבתם בשדה "על מה נדבר?".</li>
  </ul>
  <p>פנייה נשמרת רק אם יש בה טלפון או מייל. יחד איתה נשמרת כתובת העמוד שממנו נשלח הטופס. אם אישרתם עוגיות, נשמר גם המקור שממנו הגעתם: פרמטרי קמפיין (UTM), מזהה קליק של מודעה (למשל gclid או fbclid), עמוד הנחיתה והאתר שהפנה אתכם. האתר שומר את המקור הזה בדפדפן שלכם עד 90 יום, ושולח אותו רק יחד עם פנייה. בלי אישור נשמרים רק הפרטים שכתבתם וכתובת העמוד, בלי הפרמטרים שבה.</p>
  <p>המערכת מאוחסנת אצל Supabase, בשרתים באיחוד האירופי (פרנקפורט, גרמניה). רק אני עובד עם המידע הזה, ואני משתמש בו כדי לחזור אליכם בנוגע לפנייה ולנהל את הקשר העסקי. אחרי שליחת הבריף אפשר להמשיך גם בוואטסאפ, בהודעה מוכנה שאתם מחליטים אם לשלוח.</p>

  <h2 id="referral">כשאתם מפנים אליי עסק של מישהו אחר</h2>
  <p>בתוכנית "חבר מביא עסק" אתם שולחים לי בוואטסאפ שם וטלפון של בעל עסק אחר (אין לכך טופס באתר). מסרו פרטים רק של מי שיודע על כך ומסכים שאפנה אליו. אני משתמש בפרטים רק כדי לפנות אליו בנוגע להפניה, אומר לו ממי קיבלתי אותם, ואם הוא לא מעוניין, אני מוחק אותם.</p>

  <h2 id="assistant">היועץ הדיגיטלי (המצפן)</h2>
  <p>היועץ הדיגיטלי הוא תוכנה, לא בן אדם. כשבוחרים בו תשובות מוכנות (כמו סוג העסק), שום דבר לא יוצא מהדפדפן. כשאתם כותבים לו שאלה, ההודעות בשיחה עוברות דרך השרת של האתר ב-Vercel אל Anthropic, החברה האמריקאית שמפעילה את מודל הבינה המלאכותית Claude, כדי לנסח תשובה. כדי שהתשובה תתאים לכם, האתר יכול לשלוח ליועץ גם את העמוד שבו אתם נמצאים ואת התשובות שבחרתם בבריף או במחשבון באתר (למשל סוג העסק ומה אתם צריכים).</p>
  <p>אני לא שומר את השיחות בשרתים שלי ולא רואה את התוכן שלהן. השיחה נשמרת רק בלשונית שלכם, ונמחקת כשסוגרים אותה. Anthropic מעבדת את ההודעות לפי התנאים המסחריים שלה. לפי מה שהיא מפרסמת, היא מוחקת אותן תוך 30 יום, שומרת עד שנתיים רק הודעות שסומנו כהפרה של מדיניות השימוש שלה, ולא מאמנת עליהן את המודלים שלה. תוכן השיחה לא נשלח ל-Google.</p>
  <p>אל תכתבו ליועץ מידע רגיש, כמו פרטי אשראי, מספר תעודת זהות, מידע רפואי או סיסמאות.</p>
  <p>שום דבר מהשיחה לא מגיע אליי בלי שתלחצו "לשלוח לחנוך בוואטסאפ". רק אז נפתחת הודעה עם הבריף שאישרתם, ואתם מחליטים אם לשלוח אותה.</p>

  <h2 id="analytics">סטטיסטיקת גלישה (Google Analytics)</h2>
  <p>האתר משתמש ב-Google Analytics 4. הקוד של Google נטען רק אחרי שאישרתם עוגיות בהודעה שמופיעה באתר. לפני כן, ואם בחרתם בלי עוגיות, האתר לא שולח ל-Google שום בקשה.</p>
  <p>אחרי אישור, Google Analytics אוסף מידע על אופן השימוש באתר: אילו עמודים נצפו ומתי, מיקום משוער (מדינה ועיר), סוג המכשיר והדפדפן, מאיפה הגעתם, ופעולות באתר כמו לחיצה על וואטסאפ, טלפון או מייל, פתיחת חלון השיחה החוזרת, צפייה בסרטונים, אילו חלקים בעמוד הוצגו, אילו שאלות נפוצות נפתחו, אילו שלבים בטופס הבריף מולאו, שליחת טופס, שליחת הודעה ליועץ הדיגיטלי ומעבר לאתרים של לקוחות. הפרטים שכתבתם בטפסים ותוכן ההודעות לא נשלחים ל-Google.</p>
  <p>לפי Google, Google Analytics 4 לא שומר כתובות IP. המטרה היא להבין אילו תכנים עוזרים לגולשים ולשפר את האתר. המידע מעובד אצל Google, גם בארצות הברית, ונשמר לכל היותר 14 חודשים לפי הגדרות השמירה.</p>
  <p>אפשר לבטל את האישור בכל עת בקישור "הגדרות עוגיות" בתחתית כל עמוד. אז האתר מוחק מהדפדפן את העוגיות של Google, וגם את המידע על המקור שממנו הגעתם ואת קוד המודעה, ששמר אחרי האישור.</p>

  <h2 id="ads">מדידת פרסום (Google Ads)</h2>
  <p>כשאני מפרסם בגוגל, חשוב לי לדעת אילו מודעות הביאו פניות. לכן, אחרי שאישרתם עוגיות, Google Ads רושמת אם הגעתם ממודעה ואם פניתם אליי (למשל בלחיצה על וואטסאפ), ונשמרות עוגיות של Google Ads. בלי אישור, Google לא מקבלת מהאתר שום מידע. אני לא משתמש במידע הזה להתאמה אישית של פרסומות או לפרסום חוזר (רימרקטינג).</p>

  <h2 id="meta">הפיקסל של Meta (פייסבוק ואינסטגרם)</h2>
  <p>באתר יש קוד מוכן לפיקסל של Meta, אבל הוא כבוי: הוא לא נטען, ולא נשלח ל-Meta שום מידע מהגלישה באתר. אם אחליט להפעיל אותו, אעדכן קודם את המדיניות הזו, והוא ייטען רק אחרי שתאשרו.</p>

  <h2 id="adcode">קוד המודעה בהודעת הוואטסאפ</h2>
  <p>אם הגעתם מקישור של מודעה, הודעת הוואטסאפ שנפתחת כוללת בסופה קוד קצר (למשל "קוד: M12"), כדי שאדע מאיזו מודעה הגיעה הפנייה. הקוד מופיע בהודעה לפני השליחה, ואפשר למחוק אותו. בלי אישור עוגיות, כשעוברים לעמוד אחר באתר הקוד עובר בכתובת של העמוד הבא, בלי עוגייה ובלי שמירה בדפדפן. אם אישרתם עוגיות, הוא נשמר בדפדפן עד סגירת הלשונית, ולא עובר בכתובת.</p>

  <h2 id="whatsapp">וואטסאפ, מייל וטלפון</h2>
  <p>לחיצה על כפתור וואטסאפ פותחת את WhatsApp, של Meta, עם הודעה מוכנה. שום דבר לא נשלח עד שאתם לוחצים על שליחה בוואטסאפ, ואפשר לשנות או למחוק את הטקסט לפני כן. הודעה ששלחתם כפופה גם למדיניות הפרטיות של WhatsApp. כשמגיעים ממודעה בגוגל, הקישור עובר לפעמים קודם דרך עמוד מעבר באתר (hgpro.io/go/wa), ואז הטקסט של ההודעה המוכנה מופיע גם בכתובת שהשרת של האתר מקבל. מייל שאתם שולחים עובר דרך ספק הדואר שלכם ושלי. קישורים לאתרים של לקוחות מובילים לאתרים עם מדיניות פרטיות משלהם.</p>

  <h2 id="cookies">עוגיות ואחסון בדפדפן</h2>
  <p>עוגיות (Cookies), זיכרון מקומי (Local Storage) וזיכרון זמני (Session Storage) הם מידע קטן שהדפדפן שומר. האתר משתמש באלה בלבד:</p>
  <div class="table-wrap" role="region" aria-label="טבלת העוגיות" tabindex="0"><table>
    <thead><tr><th scope="col">שם</th><th scope="col">של מי</th><th scope="col">בשביל מה</th><th scope="col">משך</th><th scope="col">מתי</th></tr></thead>
    <tbody>
      <tr><td><code>_ga</code></td><td>Google Analytics</td><td>מבחין בין גולשים לצורך סטטיסטיקה</td><td>13 חודשים</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>_ga_&lt;מזהה&gt;</code></td><td>Google Analytics</td><td>שומר את מצב הביקור (אחת לכל אחד משני המזהים של האתר)</td><td>13 חודשים</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>_gcl_au</code></td><td>Google Ads</td><td>מודד אם פנייה הגיעה ממודעה</td><td>90 יום</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>_gcl_aw</code>, <code>_gcl_gb</code>, <code>_gcl_dc</code></td><td>Google Ads</td><td>שומר את מזהה הקליק כשמגיעים ממודעה בגוגל</td><td>90 יום</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>hgos_touch</code></td><td>האתר, זיכרון מקומי</td><td>זוכר מאיזה קמפיין או אתר הגעתם, כדי לצרף את המקור לפנייה אם תשלחו טופס</td><td>90 יום</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>hg-ad</code></td><td>האתר, זיכרון זמני</td><td>קוד המודעה שהביאה אתכם, כדי לצרף אותו להודעת הוואטסאפ</td><td>עד סגירת הלשונית</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>hg-src</code></td><td>האתר, זיכרון זמני</td><td>שם הקמפיין או האתר שממנו הגעתם, כדי לצרף אותו להודעת הוואטסאפ המוכנה</td><td>עד סגירת הלשונית</td><td>נשלח רק בהודעה שתבחרו לשלוח</td></tr>
      <tr><td><code>hg-consent</code></td><td>האתר, זיכרון מקומי</td><td>זוכר אם אישרתם עוגיות</td><td>עד שתמחקו</td><td>הכרחי</td></tr>
      <tr><td><code>hanoch-a11y</code></td><td>האתר, זיכרון מקומי</td><td>זוכר את ההגדרות שבחרתם בתפריט הנגישות</td><td>עד שתמחקו</td><td>הכרחי</td></tr>
      <tr><td><code>hg-intro</code></td><td>האתר, זיכרון זמני</td><td>פתיחה קצרה יותר בביקור חוזר</td><td>עד סגירת הלשונית</td><td>הכרחי</td></tr>
      <tr><td><code>hg-archive-film</code></td><td>האתר, זיכרון מקומי</td><td>הסרט בארכיון מתנגן רק בביקור הראשון</td><td>עד שתמחקו</td><td>הכרחי</td></tr>
      <tr><td><code>hg-night-paused</code></td><td>האתר, זיכרון זמני</td><td>זוכר שעצרתם את האנימציה בעמוד</td><td>עד סגירת הלשונית</td><td>הכרחי</td></tr>
      <tr><td><code>hg-brief</code></td><td>האתר, זיכרון מקומי</td><td>טיוטת טופס הבריף, כדי להמשיך מאיפה שעצרתם</td><td>עד שליחה או "התחלה מחדש"</td><td>הכרחי</td></tr>
      <tr><td><code>hg-chat</code>, <code>hg-chat-hint</code>, <code>hg-chat-help</code></td><td>האתר, זיכרון זמני</td><td>השיחה עם היועץ הדיגיטלי, וזה שההזמנה אליו כבר הוצגה</td><td>עד סגירת הלשונית</td><td>הכרחי</td></tr>
    </tbody>
  </table></div>
  <p>הזיכרון של האתר נשאר במכשיר שלכם, ויוצא ממנו רק כשאתם שולחים משהו: המקור שממנו הגעתם (<code>hgos_touch</code>) יחד עם טופס, התשובות מהבריף (<code>hg-brief</code>) כשאתם כותבים ליועץ הדיגיטלי, וקוד המודעה בהודעת וואטסאפ. אפשר למחוק את כל אלה בהגדרות הדפדפן.</p>

  <h2>אחסון האתר</h2>
  <p>האתר מאוחסן אצל Vercel Inc., חברה אמריקאית, ומוגש דרך רשת שרתים בכל העולם. כמו כל שרת אינטרנט, Vercel מעבדת נתונים טכניים כמו כתובת IP, סוג הדפדפן, העמוד שהתבקש והשעה, כדי להציג לכם את האתר ולהגן עליו. גם השרת של היועץ הדיגיטלי רץ אצל Vercel, וזוכר את כתובת ה-IP לזמן קצר רק כדי למנוע שימוש לרעה. הנתונים האלה נשמרים לזמן קצר לפי ההגדרות של Vercel, ואני לא משתמש בהם כדי לזהות גולשים. הגופנים, ספריות הקוד, התמונות והסרטונים נטענים מהשרת של האתר עצמו, ולא משרתים של חברות אחרות.</p>

  <h2>עם מי המידע משותף</h2>
  <p>אני לא מוכר ולא משכיר מידע אישי. מידע מועבר רק לספקים שמופיעים בעמוד הזה (Supabase,‏ Vercel,‏ Anthropic ו-Google), ככל שהשירות שלהם נדרש, לרואה החשבון שלי ולרשויות המס לגבי לקוחות שקיבלו שירות, ולגורם שהחוק מחייב למסור לו מידע.</p>

  <h2>העברת מידע מחוץ לישראל</h2>
  <p>הספקים שעובדים איתי נמצאים מחוץ לישראל:</p>
  <ul>
    <li>Supabase: מערכת הפניות, בשרתים באיחוד האירופי (פרנקפורט).</li>
    <li>Vercel: אחסון האתר והשרת של היועץ הדיגיטלי, חברה בארצות הברית עם שרתים בעולם.</li>
    <li>Anthropic: ניסוח התשובות של היועץ הדיגיטלי, בארצות הברית.</li>
    <li>Google: סטטיסטיקה ומדידת פרסום, רק אחרי אישור עוגיות, בארצות הברית ובמדינות נוספות.</li>
  </ul>
  <p>המידע מועבר אליהם לפי התנאים שלהם להגנה על מידע. הודעה שאתם בוחרים לשלוח בוואטסאפ עוברת דרך Meta.</p>

  <h2>כמה זמן המידע נשמר</h2>
  <ul>
    <li>פנייה שלא הפכה לעבודה: נמחקת 24 חודשים אחרי הקשר האחרון איתכם.</li>
    <li>לקוחות: המידע נשמר במשך העבודה ו-7 שנים אחריה, כפי שנדרש לפי דיני המס והחשבונאות.</li>
    <li>שיחות עם היועץ הדיגיטלי: לא נשמרות אצלי. אצל Anthropic, כמו שמוסבר למעלה.</li>
    <li>נתוני Google Analytics: לכל היותר 14 חודשים.</li>
    <li>המקור שממנו הגעתם, בדפדפן שלכם: עד 90 יום.</li>
    <li>נתונים טכניים אצל Vercel: לזמן קצר.</li>
  </ul>
  <p>אפשר לבקש שאמחק את הפרטים שלכם מוקדם יותר, כמו שמוסבר בסעיף "הזכויות שלכם".</p>

  <h2>אבטחת מידע</h2>
  <p>האתר מוגש רק בחיבור מוצפן (HTTPS). פרטים שהשארתם בטופס נשמרים במערכת הפניות, שמוגנת בהרשאות ובחיבור מוצפן, ורק אני עובד עם המידע הזה. אף מערכת אינה חסינה לחלוטין, אבל אני נוקט אמצעים סבירים כדי לשמור על המידע.</p>

  <h2>הזכויות שלכם</h2>
  <ul>
    <li>לעיין במידע עליכם שמוחזק אצלי (סעיף 13 לחוק הגנת הפרטיות).</li>
    <li>לבקש לתקן או למחוק מידע שאינו נכון, שלם, ברור או מעודכן (סעיף 14 לחוק).</li>
    <li>לבקש שאמחק את הפרטים שלכם. אמחק אותם, אלא אם החוק מחייב אותי לשמור אותם (למשל חשבוניות).</li>
    <li>לבטל בכל רגע את האישור לעוגיות, בקישור "הגדרות עוגיות".</li>
    <li>מי שנמצא באיחוד האירופי, באזור הכלכלי האירופי או בבריטניה זכאי גם לזכויות לפי GDPR: גישה, תיקון, מחיקה, הגבלת עיבוד, ניוד מידע והתנגדות לעיבוד, וזכות להתלונן לרשות הפיקוח במדינתו.</li>
  </ul>
  <p>כדי לממש זכות, כתבו לי במייל <a href="mailto:boss@hgpro.io" dir="ltr">boss@hgpro.io</a>, בוואטסאפ או בטלפון <a href="tel:+972545522053" dir="ltr">054-5522053</a>. אענה בתוך 30 יום, ואם צריך, אבקש פרט מזהה כדי לוודא שהבקשה הגיעה מכם. אפשר גם להתלונן לרשות להגנת הפרטיות במשרד המשפטים.</p>

  <h2>בסיס חוקי (למבקרים מהאיחוד האירופי)</h2>
  <p>סטטיסטיקה ומדידת פרסום: הסכמה שלכם. מענה לפנייה, ליועץ הדיגיטלי ולהכנת הצעה: צעדים לבקשתכם לפני התקשרות, ואינטרס לגיטימי לענות לפניות. שמירת רשומות על לקוחות: חובה לפי דין.</p>

  <h2>הודעות פרסומת</h2>
  <p>אני לא שולח הודעות פרסומת במייל, ב-SMS או בוואטסאפ בלי הסכמה מפורשת מראש, כנדרש בסעיף 30א לחוק התקשורת. הטפסים באתר לא מבקשים הסכמה כזו, ולכן אחזור אליכם רק בנוגע לפנייה שלכם. אם אבקש בעתיד הסכמה לדיוור, היא תהיה נפרדת, וכל הודעה תכלול דרך פשוטה להסיר את עצמכם.</p>

  <h2>ילדים</h2>
  <p>האתר מיועד לעסקים ולבעלי עסקים, ולא מיועד לילדים ולבני נוער מתחת לגיל 18.</p>

  <h2>שינויים במדיניות</h2>
  <p>אם המדיניות תשתנה, הנוסח המעודכן יפורסם בעמוד הזה עם תאריך העדכון.</p>'''

PRIVACY_EN = '''  <p class="lead">hgpro.io belongs to HG Studio, the business of Hanoch Gutovski. This page explains what information is collected when you browse the site or contact me, why, who it is shared with, how long it is kept, and what your rights are.</p>

  <h2>In short</h2>
  <ul>
    <li>There is no sign-up on the site. Your details are kept only if you send a form on the site with a phone number or email, or contact me on WhatsApp, by email or by phone.</li>
    <li>Google Analytics and Google Ads load only after you accept cookies. Until then the site sends nothing to Google. You can withdraw your consent at any time.</li>
    <li>The Meta Pixel is not active on the site, and no browsing information is sent to Meta.</li>
    <li>Questions you type to the digital advisor are sent to Anthropic to write an answer. I do not store the conversations.</li>
    <li>I do not sell personal information, and I do not send marketing messages without your explicit prior consent.</li>
  </ul>

  <h2>Who is responsible for the information</h2>
  <p>Hanoch Gutovski, HG Studio. For any privacy question, write to <a href="mailto:boss@hgpro.io">boss@hgpro.io</a>, on WhatsApp or by phone at <a href="tel:+972545522053">+972 54-552-2053</a>.</p>

  <h2>Information you give me</h2>
  <p>When you contact me on WhatsApp, by email or by phone, I receive what you chose to send: your name, phone number or email, and the content of your message. When you send a form on the site, the details are saved in my inquiries system, as explained in the next section. The brief form on the English home page works differently: it sends nothing to a server, and keeps a draft only in your browser until you choose to send it on WhatsApp or by email.</p>
  <p>You are not legally required to share these details, but without a way to reach you I cannot get back to you. I use the information to answer you, prepare a proposal, provide the service you ordered, issue receipts and invoices, and meet my legal obligations.</p>

  <h2 id="crm">My inquiries system</h2>
  <p>The forms on the site send your details directly from your browser to my inquiries management system (HG OS):</p>
  <ul>
    <li>The brief form on the site (the Hebrew brief page): name, phone or email (or both), business name if you gave one, what you need, when you want to start, and anything you wrote in the free-text field.</li>
    <li>A call-back request: name, phone, the day and time you picked, and anything you wrote in the "what to talk about" field.</li>
  </ul>
  <p>An inquiry is saved only if it has a phone number or an email. The address of the page the form was sent from is saved with it. If you accepted cookies, the source that brought you is saved too: campaign parameters (UTM), an ad click ID (for example gclid or fbclid), the landing page and the referring site. The site keeps this source in your browser for up to 90 days, and sends it only together with an inquiry. Without consent, only the details you typed and the page address are saved, without its parameters.</p>
  <p>The system is hosted by Supabase on servers in the European Union (Frankfurt, Germany). Only I work with this information, and I use it to get back to you about your inquiry and manage our business contact. After sending the brief you can also continue on WhatsApp, with a ready message that you decide whether to send.</p>

  <h2 id="referral">When you refer someone else's business</h2>
  <p>In the referral programme on the Hebrew site you send me the name and phone number of another business owner on WhatsApp (there is no form for this on the site). Only share the details of someone who knows about it and agrees that I contact them. I use the details only to contact them about the referral, I tell them who gave me their details, and if they are not interested, I delete them.</p>

  <h2 id="assistant">The digital advisor (Compass)</h2>
  <p>The digital advisor is software, not a person. When you pick ready-made answers (like your type of business), nothing leaves your browser. When you type a question, the messages in the conversation go through the site's server at Vercel to Anthropic, the US company that runs the Claude AI model, to write an answer. To make the answer fit you, the site may also send the advisor the page you are on and the answers you chose in the brief or the calculator on the site (for example your type of business and what you need).</p>
  <p>I do not store the conversations on my servers and I do not see their content. The conversation is kept only in your browser tab, and deleted when you close it. Anthropic processes the messages under its commercial terms. According to what it publishes, it deletes them within 30 days, keeps for up to two years only messages flagged as violating its usage policy, and does not train its models on them. The content of the conversation is not sent to Google.</p>
  <p>Please don't write sensitive information to the advisor, such as card details, ID numbers, medical information or passwords.</p>
  <p>Nothing from the chat reaches me unless you tap "Send to Hanoch on WhatsApp". Only then does a message open with the brief you approved, and you decide whether to send it.</p>

  <h2 id="analytics">Analytics (Google Analytics)</h2>
  <p>The site uses Google Analytics 4. Google's code loads only after you accept cookies in the notice shown on the site. Before that, and if you choose no cookies, the site sends no request at all to Google.</p>
  <p>After you accept, Google Analytics collects information about how the site is used: which pages were viewed and when, approximate location (country and city), device and browser type, where you came from, and actions on the site such as tapping WhatsApp, phone or email, opening the call-back window, playing videos, which parts of a page were shown, which FAQ answers were opened, which steps of the brief form were filled in, sending a form, sending a message to the digital advisor, and visiting client sites. The details you typed in forms and the content of your messages are not sent to Google.</p>
  <p>According to Google, Google Analytics 4 does not store IP addresses. The purpose is to understand which content helps visitors and to improve the site. The data is processed by Google, including in the United States, and kept for at most 14 months under the retention settings.</p>
  <p>You can withdraw consent at any time with the "Cookie settings" link at the bottom of every page. The site then deletes Google's cookies from your browser, together with the source information and the ad code it kept after you accepted.</p>

  <h2 id="ads">Ad measurement (Google Ads)</h2>
  <p>When I advertise on Google, I need to know which ads brought inquiries. So, after you accept cookies, Google Ads records whether you came from an ad and whether you contacted me (for example by tapping WhatsApp), and Google Ads cookies are stored. Without consent, Google receives no information from the site. I don't use this information for personalised ads or remarketing.</p>

  <h2 id="meta">The Meta Pixel (Facebook and Instagram)</h2>
  <p>The site has ready code for the Meta Pixel, but it is switched off: it does not load, and no browsing information from the site is sent to Meta. If I decide to turn it on, I will update this policy first, and it will load only after you agree.</p>

  <h2 id="adcode">The ad code in the WhatsApp message</h2>
  <p>If you arrived from an ad link, the WhatsApp message that opens ends with a short code (for example "Code: M12") so I know which ad brought the inquiry. You see the code before sending and can delete it. Without cookie consent, when you move to another page on the site the code travels in that page's address, without a cookie and without being stored in your browser. If you accepted cookies, it is kept in your browser until you close the tab, and does not travel in the address.</p>

  <h2 id="whatsapp">WhatsApp, email and phone</h2>
  <p>A WhatsApp button opens WhatsApp, by Meta, with a ready message. Nothing is sent until you press send in WhatsApp, and you can change or delete the text before that. A message you send is also subject to WhatsApp's privacy policy. When you arrive from a Google ad, the link sometimes passes first through a transfer page on the site (hgpro.io/go/wa), and the text of the ready message then also appears in the address the site's server receives. An email you send passes through your email provider and mine. Links to client sites lead to sites with their own privacy policies.</p>

  <h2 id="cookies">Cookies and browser storage</h2>
  <p>Cookies, local storage and session storage are small pieces of information your browser keeps. The site uses only these:</p>
  <div class="table-wrap" role="region" aria-label="Cookie table" tabindex="0"><table>
    <thead><tr><th scope="col">Name</th><th scope="col">Set by</th><th scope="col">Purpose</th><th scope="col">Duration</th><th scope="col">When</th></tr></thead>
    <tbody>
      <tr><td><code>_ga</code></td><td>Google Analytics</td><td>Tells visitors apart for statistics</td><td>13 months</td><td>Only after consent</td></tr>
      <tr><td><code>_ga_&lt;ID&gt;</code></td><td>Google Analytics</td><td>Keeps the state of the visit (one for each of the site's two IDs)</td><td>13 months</td><td>Only after consent</td></tr>
      <tr><td><code>_gcl_au</code></td><td>Google Ads</td><td>Measures whether an inquiry came from an ad</td><td>90 days</td><td>Only after consent</td></tr>
      <tr><td><code>_gcl_aw</code>, <code>_gcl_gb</code>, <code>_gcl_dc</code></td><td>Google Ads</td><td>Keeps the click ID when you arrive from a Google ad</td><td>90 days</td><td>Only after consent</td></tr>
      <tr><td><code>hgos_touch</code></td><td>This site, local storage</td><td>Remembers which campaign or site brought you, to add the source to an inquiry if you send a form</td><td>90 days</td><td>Only after consent</td></tr>
      <tr><td><code>hg-ad</code></td><td>This site, session storage</td><td>The code of the ad that brought you, to add it to the WhatsApp message</td><td>Until you close the tab</td><td>Only after consent</td></tr>
      <tr><td><code>hg-src</code></td><td>This site, session storage</td><td>The campaign name or site that brought you, to add it to the ready WhatsApp message</td><td>Until you close the tab</td><td>Sent only in a message you choose to send</td></tr>
      <tr><td><code>hg-consent</code></td><td>This site, local storage</td><td>Remembers whether you accepted cookies</td><td>Until you delete it</td><td>Necessary</td></tr>
      <tr><td><code>hanoch-a11y</code></td><td>This site, local storage</td><td>Remembers your accessibility menu settings</td><td>Until you delete it</td><td>Necessary</td></tr>
      <tr><td><code>hg-intro</code></td><td>This site, session storage</td><td>A shorter intro on a repeat visit</td><td>Until you close the tab</td><td>Necessary</td></tr>
      <tr><td><code>hg-archive-film</code></td><td>This site, local storage</td><td>The archive film plays only on the first visit</td><td>Until you delete it</td><td>Necessary</td></tr>
      <tr><td><code>hg-night-paused</code></td><td>This site, session storage</td><td>Remembers that you paused the animation on the page</td><td>Until you close the tab</td><td>Necessary</td></tr>
      <tr><td><code>hg-brief</code></td><td>This site, local storage</td><td>The brief form draft, so you can pick up where you left off</td><td>Until you send or start over</td><td>Necessary</td></tr>
      <tr><td><code>hg-chat</code>, <code>hg-chat-hint</code>, <code>hg-chat-help</code></td><td>This site, session storage</td><td>Your chat with the digital advisor, and whether its invitation was already shown</td><td>Until you close the tab</td><td>Necessary</td></tr>
    </tbody>
  </table></div>
  <p>The site's storage stays on your device, and leaves it only when you send something: the source that brought you (<code>hgos_touch</code>) with a form, your brief answers (<code>hg-brief</code>) when you write to the digital advisor, and the ad code in a WhatsApp message. You can delete all of it in your browser settings.</p>

  <h2>Hosting</h2>
  <p>The site is hosted by Vercel Inc., a US company, and served through a worldwide network of servers. Like any web server, Vercel processes technical data such as your IP address, browser type, the page requested and the time, to show you the site and protect it. The digital advisor's server also runs at Vercel, and remembers your IP address for a short time only to prevent abuse. This data is kept for a short time under Vercel's settings, and I do not use it to identify visitors. Fonts, code libraries, images and videos load from the site's own server, not from other companies' servers.</p>

  <h2>Who the information is shared with</h2>
  <p>I do not sell or rent personal information. Information is passed only to the providers named on this page (Supabase, Vercel, Anthropic and Google), as far as their service requires, to my accountant and the tax authorities for clients who received a service, and to anyone the law requires me to disclose it to.</p>

  <h2>Transfers outside Israel</h2>
  <p>The providers I work with are outside Israel:</p>
  <ul>
    <li>Supabase: my inquiries system, on servers in the European Union (Frankfurt).</li>
    <li>Vercel: site hosting and the digital advisor's server, a US company with servers worldwide.</li>
    <li>Anthropic: writing the digital advisor's answers, in the United States.</li>
    <li>Google: analytics and ad measurement, only after cookie consent, in the United States and other countries.</li>
  </ul>
  <p>Information is transferred to them under their own data protection terms. A message you choose to send on WhatsApp passes through Meta.</p>

  <h2>How long information is kept</h2>
  <ul>
    <li>An inquiry that did not become a project: deleted 24 months after our last contact.</li>
    <li>Clients: kept during the work and for 7 years after it, as required by tax and accounting law.</li>
    <li>Conversations with the digital advisor: not stored by me. At Anthropic, as explained above.</li>
    <li>Google Analytics data: at most 14 months.</li>
    <li>The source that brought you, in your browser: up to 90 days.</li>
    <li>Technical data at Vercel: a short time.</li>
  </ul>
  <p>You can ask me to delete your details sooner, as explained under "Your rights".</p>

  <h2>Security</h2>
  <p>The site is served only over an encrypted connection (HTTPS). Details you leave in a form are saved in my inquiries system, which is protected by access permissions and an encrypted connection, and only I work with that information. No system is completely secure, but I take reasonable measures to protect the information.</p>

  <h2>Your rights</h2>
  <ul>
    <li>To see the information I hold about you (section 13 of the Israeli Protection of Privacy Law).</li>
    <li>To ask me to correct or delete information that is not accurate, complete, clear or up to date (section 14).</li>
    <li>To ask me to delete your details. I will delete them, unless the law requires me to keep them (for example invoices).</li>
    <li>To withdraw cookie consent at any time, with the "Cookie settings" link.</li>
    <li>If you are in the European Union, the European Economic Area or the United Kingdom, you also have rights under the GDPR: access, rectification, erasure, restriction, portability and objection, and the right to complain to your local supervisory authority.</li>
  </ul>
  <p>To use a right, write to me at <a href="mailto:boss@hgpro.io">boss@hgpro.io</a>, on WhatsApp or by phone at <a href="tel:+972545522053">+972 54-552-2053</a>. I will answer within 30 days, and if needed I will ask for a detail that confirms the request came from you. You can also complain to the Israeli Privacy Protection Authority at the Ministry of Justice.</p>

  <h2>Legal basis (for visitors from the EU)</h2>
  <p>Analytics and ad measurement: your consent. Answering an inquiry, the digital advisor and preparing a proposal: steps you asked for before a contract, and a legitimate interest in answering inquiries. Keeping client records: a legal obligation.</p>

  <h2>Marketing messages</h2>
  <p>I do not send marketing messages by email, SMS or WhatsApp without your explicit prior consent, as required by section 30A of the Israeli Communications Law. The forms on the site do not ask for that consent, so I will contact you only about your inquiry. If I ever ask for consent to marketing, it will be separate, and every such message will include a simple way to opt out.</p>

  <h2>Children</h2>
  <p>The site is meant for businesses and business owners, and is not intended for children or teenagers under 18.</p>

  <h2>Changes to this policy</h2>
  <p>If this policy changes, the updated version will be published on this page with its date.</p>'''

# ---------- תנאי שימוש ----------
TERMS_HE = f'''  <p class="lead">האתר hgpro.io שייך ל-HG Studio, העסק של חנוך גוטובסקי. השימוש באתר כפוף לתנאים האלה, ל<a href="privacy.html">מדיניות הפרטיות</a> ול<a href="refunds.html">מדיניות הביטול וההחזרים</a>.</p>

  <h2>מה יש באתר</h2>
  <p>באתר יש מידע על השירותים שלי, דוגמאות מעבודות שעשיתי ללקוחות, מאמרים והדגמות. חלק מההדגמות האינטראקטיביות והמספרים שמסומנים "לדוגמה" או "המחשה" הם המחשות בלבד. הסרטים והדמויות שנוצרו בבינה מלאכותית מסומנים ככאלה, והמותגים בהם בדיוניים כשזה מצוין.</p>

  <h2>הצעות מחיר והתקשרות</h2>
  <p>באתר לא מתבצעת רכישה. כל פרויקט מתחיל בהצעת מחיר כתובה, ולפעמים גם בהסכם. היקף העבודה, המחיר, לוח הזמנים ותנאי התשלום המחייבים הם אלה שבהצעה או בהסכם, והם גוברים על מה שכתוב באתר.</p>
  <p>זמני העבודה שמופיעים באתר (למשל "באוויר תוך שבועיים", "עד שבוע לאוויר", "5 ימי עסקים" ו"48 שעות במסירה מהירה") מתארים פרויקט טיפוסי, כשהחומרים מהלקוח מגיעים בזמן. המועד המחייב נקבע בהצעה.</p>
  <p>המחיר בהצעה הוא המחיר הסופי. אני עוסק פטור, ולכן לא מתווסף לו מע״מ.</p>

  <h2>בעלות על מה שאני בונה</h2>
  <p>אחרי התשלום המלא, האתר, הקוד, הדומיין והתוכן שנבנו לפרויקט שייכים ללקוח, לפי ההצעה או ההסכם. רכיבים של צד שלישי, כמו גופנים, ספריות קוד וכלים, ממשיכים להיות כפופים לרישיונות שלהם.</p>

  <h2 id="echo">ליווי באינסטגרם ובפייסבוק ("הד")</h2>
  <p>בחבילות "הד" העמודים, החשבונות והתוכן שייכים ללקוח. הגישה שלי אליהם היא כשותף או כמנהל, לפי ההרשאות שהלקוח נותן, והוא יכול לבטל אותן בכל עת. תוכן עולה לפרסום רק אחרי שהלקוח אישר אותו.</p>
  <p>תקציב הפרסום הממומן משולם על ידי הלקוח ישירות לפלטפורמה (למשל מטא), ואינו חלק מהמחיר שבהצעה. הודעות וואטסאפ נשלחות רק לאנשים שהסכימו לקבל אותן, כפי שהחוק דורש. בימי צילום, הלקוח אחראי לקבל הסכמה מעובדים ומלקוחות שמופיעים בצילומים.</p>
  <p>אי אפשר להבטיח מספר עוקבים, צפיות, פניות או מכירות, כי הם תלויים גם בפלטפורמות, בשוק ובעסק עצמו. היקף העבודה, משך ההתקשרות ותנאי הביטול נקבעים בהצעה.</p>

  <h2>זכויות יוצרים באתר</h2>
  <p>העיצוב, הקוד, הטקסטים, התמונות והסרטונים באתר שייכים ל-HG Studio, אלא אם צוין אחרת. הלוגואים, צילומי המסך והתכנים של לקוחות בתיק העבודות שייכים ללקוחות, ומוצגים כדוגמאות לעבודה שעשיתי עבורם. אין להעתיק או להשתמש בתכני האתר בלי אישור בכתב.</p>

  <h2>מאמרים ומידע כללי</h2>
  <p>המאמרים והמידע באתר הם מידע כללי. הם אינם ייעוץ משפטי, חשבונאי או מקצועי, והם עשויים להתיישן.</p>

  <h2>קישורים לאתרים אחרים</h2>
  <p>באתר יש קישורים לאתרים של לקוחות ולשירותים חיצוניים. אין לי שליטה על התוכן שלהם ועל מדיניות הפרטיות שלהם.</p>

  <h2>אחריות</h2>
  <p>אני משתדל שהמידע באתר יהיה נכון ושהאתר יהיה זמין, אבל לא יכול להבטיח שלא יהיו בו טעויות או הפסקות. האחריות שלי לשימוש באתר מוגבלת ככל שהחוק מתיר. שום דבר בתנאים האלה לא גורע מזכויות שהחוק נותן לצרכנים.</p>

  <h2>נגישות</h2>
  <p>פרטים על נגישות האתר ועל דרכי פנייה בנושא נמצאים ב<a href="accessibility.html">הצהרת הנגישות</a>.</p>

  <h2>הדין החל</h2>
  <p>על התנאים האלה חל הדין הישראלי, וסמכות השיפוט נתונה לבתי המשפט המוסמכים בישראל.</p>

  <h2 id="credits">קרדיטים ורישיונות</h2>
  <ul>
    <li>גופנים: Rubik, ‏Geist Mono, ‏JetBrains Mono, ‏Frank Ruhl Libre, ‏Fraunces, ‏Handjet, ‏Heebo ו-IBM Plex Mono, ברישיון SIL Open Font License 1.1, מאוחסנים בשרת של האתר.</li>
    <li>ספריית התלת־ממד three.js וספריית הגלילה Lenis, ברישיון MIT.</li>
    <li>ספריית האנימציה GSAP, לפי הרישיון הסטנדרטי שלה לשימוש ללא תשלום.</li>
    <li>מוזיקה בסרטים: הפרלוד מהסוויטה לצ׳לו מס׳ 1 של באך (הקלטה בנחלת הכלל, מוויקישיתוף); הנוקטורן אופ׳ 9 מס׳ 2 של שופן (הקלטה של Peter Johnston, ברישיון CC0); הפתיחה ל"וילהלם טל" של רוסיני (התזמורת של חיל הנחתים האמריקאי, בנחלת הכלל); "מצב רוח של בוקר" מתוך "פר גינט" של גריג (Musopen, בנחלת הכלל, מוויקישיתוף).</li>
    <li>התמונות, הסרטים והקולות שמסומנים כנוצרים בבינה מלאכותית נוצרו בכלים בתשלום, לפי תנאי השימוש שלהם.</li>
  </ul>

  <h2>יצירת קשר</h2>
  <p>שאלות על התנאים: {CONTACT_HE}.</p>'''

TERMS_EN = f'''  <p class="lead">hgpro.io belongs to HG Studio, the business of Hanoch Gutovski. Using the site is subject to these terms, the <a href="en-privacy.html">privacy policy</a> and the <a href="en-refunds.html">cancellation and refund policy</a>.</p>

  <h2>What is on the site</h2>
  <p>The site has information about my services, examples of work I did for clients, articles and demos. Some interactive demos and numbers marked "example" or "illustration" are illustrations only. Films and characters made with AI are labeled as such, and the brands in them are fictional where stated.</p>

  <h2>Proposals and engagement</h2>
  <p>Nothing is bought on the site. Every project starts with a written proposal, and sometimes an agreement. The binding scope of work, price, schedule and payment terms are those in the proposal or agreement, and they prevail over anything written on the site.</p>
  <p>The timelines on the site (for example "live in two weeks", "live within a week", "5 business days" and "48 hours with express delivery") describe a typical project when the client's materials arrive on time. The binding date is set in the proposal.</p>
  <p>The price in the proposal is final. I am a VAT-exempt business in Israel (osek patur), so no VAT is added.</p>

  <h2>Ownership of what I build</h2>
  <p>After full payment, the site, code, domain and content built for the project belong to the client, as set in the proposal or agreement. Third-party components, such as fonts, code libraries and tools, remain subject to their own licenses.</p>

  <h2 id="echo">Instagram and Facebook service ("Echo")</h2>
  <p>In the Echo packages, the pages, accounts and content belong to the client. My access is as a partner or admin, through permissions the client grants and can revoke at any time. Content is published only after the client approves it.</p>
  <p>The paid ad budget is paid by the client directly to the platform (for example Meta), and is not part of the price in the proposal. WhatsApp messages go only to people who agreed to receive them, as the law requires. On shoot days, the client is responsible for getting consent from staff and customers who appear in the footage.</p>
  <p>No one can promise a number of followers, views, leads or sales, because they also depend on the platforms, the market and the business itself. The scope of work, the length of the engagement and the cancellation terms are set in the proposal.</p>

  <h2>Copyright on the site</h2>
  <p>The design, code, text, images and videos on the site belong to HG Studio unless stated otherwise. Client logos, screenshots and content in the portfolio belong to the clients and are shown as examples of work I did for them. Do not copy or use the site's content without written permission.</p>

  <h2>Articles and general information</h2>
  <p>The articles and information on the site are general information. They are not legal, accounting or professional advice, and they may become outdated.</p>

  <h2>Links to other sites</h2>
  <p>The site links to client sites and outside services. I do not control their content or their privacy policies.</p>

  <h2>Liability</h2>
  <p>I try to keep the information on the site accurate and the site available, but I cannot guarantee it will be free of errors or interruptions. My liability for using the site is limited as far as the law allows. Nothing in these terms limits rights the law gives consumers.</p>

  <h2>Accessibility</h2>
  <p>Details about the site's accessibility and how to reach me about it are in the <a href="en-accessibility.html">accessibility statement</a>.</p>

  <h2>Governing law</h2>
  <p>These terms are governed by Israeli law, and the competent courts in Israel have jurisdiction.</p>

  <h2 id="credits">Credits and licenses</h2>
  <ul>
    <li>Fonts: Rubik, Geist Mono, JetBrains Mono, Frank Ruhl Libre, Fraunces, Handjet, Heebo and IBM Plex Mono, under the SIL Open Font License 1.1, hosted on the site's own server.</li>
    <li>The three.js 3D library and the Lenis scrolling library, under the MIT license.</li>
    <li>The GSAP animation library, under its standard no-charge license.</li>
    <li>Music in the films: the Prelude from Bach's Cello Suite No. 1 (a public domain recording, from Wikimedia Commons); Chopin's Nocturne Op. 9 No. 2 (recorded by Peter Johnston, CC0); the overture to Rossini's William Tell (the United States Marine Corps Band, public domain); Morning Mood from Grieg's Peer Gynt (Musopen, public domain, from Wikimedia Commons).</li>
    <li>Images, films and voices labeled as made with AI were created with paid tools, under their terms of use.</li>
  </ul>

  <h2>Contact</h2>
  <p>Questions about these terms: {CONTACT_EN}.</p>'''

# ---------- ביטול והחזרים ----------
REFUNDS_HE = f'''  <p class="lead">באתר לא מתבצעים רכישה ותשלום. כל פרויקט מתחיל בהצעת מחיר כתובה, ולפעמים גם בהסכם, ושום תשלום לא נגבה לפני שאישרתם אותם. העמוד הזה מסביר איך מבטלים התקשרות ומה מגיע לכם.</p>

  <h2>אם אתם צרכנים</h2>
  <p>אם הזמנתם שירות כצרכנים, כלומר לשימוש אישי ולא לעסק, והעסקה נעשתה מרחוק (בטלפון, בוואטסאפ או במייל), חוק הגנת הצרכן נותן לכם זכות לבטל אותה:</p>
  <ul>
    <li>בתוך 14 יום מיום העסקה, או מהיום שקיבלתם מסמך עם פרטי העסקה, לפי המאוחר מביניהם.</li>
    <li>אזרח ותיק, אדם עם מוגבלות ועולה חדש, כהגדרתם בחוק, רשאים לבטל עסקה כזו בתוך ארבעה חודשים, אם העסקה כללה שיחה (גם בשיחה אלקטרונית).</li>
    <li>בשירות חד־פעמי, כמו בניית אתר או הפקת סרטון, הביטול צריך להגיע אליי לפחות שני ימים שאינם ימי מנוחה לפני המועד שבו השירות אמור להינתן.</li>
    <li>דמי הביטול יהיו לכל היותר 5% ממחיר העסקה או 100 ש״ח, לפי הנמוך מביניהם. לא אגבה יותר מזה.</li>
    <li>את הכסף ששילמתם אחזיר בתוך 14 יום מהיום שקיבלתי את הודעת הביטול, באותו אמצעי תשלום.</li>
  </ul>

  <h2>אם אתם עסק</h2>
  <p>לקוחות שמזמינים שירות עבור העסק שלהם אינם צרכנים לפי החוק. אצלם, תנאי הביטול, שלבי התשלום ומה קורה עם עבודה שכבר נעשתה נקבעים בהצעת המחיר או בהסכם, לפני שמתחילים.</p>

  <h2>איך מבטלים</h2>
  <p>שלחו לי הודעה במייל {CONTACT_HE}, עם השם שלכם, מספר הטלפון והפרויקט. אאשר שקיבלתי את ההודעה.</p>

  <h2>פרטי העוסק</h2>
  <p>HG Studio הוא העסק של חנוך גוטובסקי. הפרטים המלאים של העוסק מופיעים בהצעת המחיר ובמסמכי העסקה.</p>

  <p>האמור בעמוד הזה כפוף לחוק הגנת הצרכן. אם יש סתירה בין העמוד לחוק, החוק גובר.</p>'''

REFUNDS_EN = f'''  <p class="lead">Nothing is bought or paid for on the site. Every project starts with a written proposal, and sometimes an agreement, and nothing is charged before you approve them. This page explains how to cancel and what you are entitled to.</p>

  <h2>If you are a consumer</h2>
  <p>If you ordered a service as a consumer, meaning for personal use and not for a business, and the deal was made remotely (by phone, WhatsApp or email), the Israeli Consumer Protection Law gives you the right to cancel it:</p>
  <ul>
    <li>Within 14 days of the deal, or of the day you received a document with the deal's details, whichever is later.</li>
    <li>Senior citizens, people with disabilities and new immigrants, as the law defines them, may cancel such a deal within four months if it included a conversation (including an electronic one).</li>
    <li>For a one-time service, such as building a website or producing a film, the cancellation must reach me at least two days that are not rest days before the date the service is due to be provided.</li>
    <li>The cancellation fee will be at most 5% of the price or 100 shekels, whichever is lower. I will not charge more than that.</li>
    <li>I will refund what you paid within 14 days of receiving your cancellation notice, using the same payment method.</li>
  </ul>

  <h2>If you are a business</h2>
  <p>Clients who order a service for their business are not consumers under the law. For them, the cancellation terms, the payment stages and what happens to work already done are set in the proposal or agreement before work starts.</p>

  <h2>How to cancel</h2>
  <p>Send me a message at {CONTACT_EN}, with your name, phone number and the project. I will confirm that I received it.</p>

  <h2>Business details</h2>
  <p>HG Studio is the business of Hanoch Gutovski. The full business details appear in the proposal and the deal documents.</p>

  <p>This page is subject to the Israeli Consumer Protection Law. If anything here conflicts with the law, the law prevails.</p>'''

PAGES = [
    ('he', 'privacy.html', 'en-privacy.html', 'מדיניות פרטיות', 'מדיניות הפרטיות של HG Studio: איזה מידע נאסף באתר hgpro.io, עוגיות, Google Analytics והזכויות שלכם.', 'מדיניות פרטיות', PRIVACY_HE),
    ('en', 'en-privacy.html', 'privacy.html', 'Privacy policy', 'The HG Studio privacy policy: what information hgpro.io collects, cookies, Google Analytics and your rights.', 'Privacy policy', PRIVACY_EN),
    ('he', 'terms.html', 'en-terms.html', 'תנאי שימוש', 'תנאי השימוש באתר hgpro.io של HG Studio: הצעות מחיר, בעלות, זכויות יוצרים וקרדיטים.', 'תנאי שימוש', TERMS_HE),
    ('en', 'en-terms.html', 'terms.html', 'Terms of use', 'Terms of use for hgpro.io by HG Studio: proposals, ownership, copyright and credits.', 'Terms of use', TERMS_EN),
    ('he', 'refunds.html', 'en-refunds.html', 'מדיניות ביטול והחזרים', 'איך מבטלים התקשרות עם HG Studio, ומה מגיע לכם לפי חוק הגנת הצרכן.', 'ביטול והחזרים', REFUNDS_HE),
    ('en', 'en-refunds.html', 'refunds.html', 'Cancellation and refund policy', 'How to cancel an engagement with HG Studio, and what you are entitled to under Israeli consumer law.', 'Cancellations and refunds', REFUNDS_EN),
]

if __name__ == '__main__':
    for lang, file, other, title, desc, h1, body in PAGES:
        open(os.path.join(ROOT, file), 'w', encoding='utf-8').write(page(lang, file, other, title, desc, h1, body))
    print('legal pages', len(PAGES))

# אחרי כל בנייה: טביעות הסקריפטים המוטמעים ב-CSP (vercel.json) מתעדכנות, כדי שסקריפט שהשתנה לא ייחסם באתר
if __name__ == "__main__":
    import csp
    csp.main()
