# דפי המידע המשפטי: מדיניות פרטיות, תנאי שימוש, ביטול והחזרים. עברית ואנגלית.
# מריצים: python3 tools/legal.py  (כותב לשורש האתר את privacy/terms/refunds + en-*)
# לא ייעוץ משפטי. מומלץ שעורך דין יעבור על הנוסח.
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPDATED = {'he': '10 באוקטובר 2026', 'en': 'October 10, 2026'}
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


def page(lang, file, other, title, desc, h1, body):
    he = lang == 'he'
    T = (lambda a, b: a) if he else (lambda a, b: b)
    font = 'fonts/g/rubik-hebrew-423ede.woff2' if he else None
    preload = f'<link rel="preload" as="font" type="font/woff2" href="{font}" crossorigin>\n' if font else ''
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
{preload}<link rel="stylesheet" href="css/fonts.css">
<link rel="icon" href="images/icon-180.png">
<link rel="apple-touch-icon" href="images/icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="stylesheet" href="css/hanoch.css">
{STYLE}
<script src="js/consent.js" defer></script>
<script src="js/ga.js" defer></script>
</head>
<body>
<a class="skip" href="#main">{T('דלגו לתוכן', 'Skip to content')}</a>
<main class="doc" id="main">
  <a class="back" href="{T('./', 'en.html')}">{T('→ חזרה לאתר', '← Back to the site')}</a>
  <h1>{h1}</h1>
{body}
  <p class="updated">{T('עודכן לאחרונה', 'Last updated')}: {UPDATED[lang]} · <a href="{other}" hreflang="{'en' if he else 'he'}" lang="{'en' if he else 'he'}">{T('English', 'עברית')}</a></p>
</main>
{foot(he, file)}
<script src="js/fluid.js" defer></script>
<script src="js/a11y.js" defer></script>
<script src="js/assistant.js" defer></script>
</body>
</html>
'''


CONTACT_HE = f'<a href="mailto:{MAIL}" dir="ltr">{MAIL}</a>, בוואטסאפ או בטלפון <a href="tel:{TEL}" dir="ltr">{TEL_HE}</a>'
CONTACT_EN = f'<a href="mailto:{MAIL}">{MAIL}</a>, on WhatsApp or by phone at <a href="tel:{TEL}">{TEL_EN}</a>'

# ---------- מדיניות פרטיות ----------
PRIVACY_HE = f'''  <p class="lead">האתר hgpro.io שייך ל-HG Studio, העסק של חנוך גוטובסקי. בעמוד הזה מוסבר איזה מידע נאסף כשאתם גולשים באתר או פונים אליי, למה הוא נאסף, עם מי הוא משותף ומה הזכויות שלכם.</p>

  <h2>בקצרה</h2>
  <ul>
    <li>באתר אין הרשמה, ואין טופס ששומר פרטים בשרת.</li>
    <li>פנייה בוואטסאפ, במייל או בטלפון מגיעה ישירות אליי, ורק כשאתם בוחרים לשלוח אותה.</li>
    <li>Google Analytics נטען רק אם אישרתם סטטיסטיקה, ואפשר לבטל את האישור בכל רגע.</li>
    <li>אני לא מוכר מידע אישי, ולא שולח הודעות פרסומת בלי הסכמה מפורשת שלכם.</li>
  </ul>

  <h2>מי אחראי על המידע</h2>
  <p>חנוך גוטובסקי, HG Studio. לכל שאלה על פרטיות אפשר לפנות במייל {CONTACT_HE}.</p>

  <h2>מידע שאתם מוסרים לי</h2>
  <p>כשאתם פונים אליי אני מקבל את מה שבחרתם לשלוח: שם, מספר טלפון או כתובת מייל (לפי הערוץ שבחרתם), ותוכן ההודעה. אם מילאתם את טופס הבריף בדף הבית, התשובות שבחרתם (סוג העסק, מטרות, מה יש לכם היום, ואם רציתם גם שם ומשפט על העסק) נכנסות להודעה מוכנה. הטופס לא שולח דבר לשרת: ההודעה יוצאת רק אם תלחצו "לשלוח לי בוואטסאפ" או "לשלוח לי במייל". עד אז התשובות נשמרות רק בדפדפן שלכם, כדי שתוכלו להמשיך מאיפה שעצרתם.</p>
  <h2 id="assistant">המצפן, היועץ הדיגיטלי</h2>
  <p>המצפן הוא יועץ דיגיטלי, לא בן אדם. כשבוחרים בו תשובות מוכנות (כמו סוג העסק), שום דבר לא יוצא מהדפדפן. כשכותבים לו שאלה חופשית, הטקסט של השיחה נשלח לשרת של האתר ב-Vercel, ומשם ל-Anthropic, החברה שמפעילה את מודל הבינה המלאכותית Claude, רק כדי לנסח תשובה. העיבוד יכול להיות מחוץ לישראל. האתר לא שומר את השיחה ולא מתעד את התוכן שלה. היא נשמרת רק בלשונית שלכם, ונמחקת כשסוגרים אותה. אל תכתבו למצפן מידע רגיש, כמו פרטי אשראי, תעודת זהות או מידע רפואי.</p>
  <p>שום דבר מהשיחה לא מגיע אליי בלי שתלחצו "לשלוח לחנוך בוואטסאפ". רק אז נפתחת הודעה עם הבריף שאישרתם, ואתם מחליטים אם לשלוח אותה.</p>
  <p>מסירת הפרטים אינה חובה לפי חוק, אבל בלי דרך ליצור איתכם קשר לא אוכל לחזור אליכם. אני משתמש במידע כדי לענות לפנייה, להכין הצעת מחיר, לתת את השירות שהוזמן, להוציא קבלות וחשבוניות ולעמוד בחובות שהחוק מטיל עליי.</p>

  <h2 id="analytics">סטטיסטיקת גלישה (Google Analytics)</h2>
  <p>רק אם אישרתם סטטיסטיקה בהודעה שמופיעה בכניסה לאתר, נטען Google Analytics 4 של Google. הוא אוסף מידע על אופן השימוש באתר: אילו עמודים נצפו ומתי, מיקום משוער (מדינה ועיר), סוג המכשיר והדפדפן, מאיפה הגעתם, ופעולות באתר כמו לחיצה על וואטסאפ, טלפון או מייל, צפייה בסרטונים, מעבר בין שלבי טופס הבריף (מספר השלב בלבד) ומעבר לאתרים של לקוחות. התשובות שכתבתם בטופס ותוכן ההודעות לא נשלחים ל-Google.</p>
  <p>לפי Google, Google Analytics 4 לא שומר כתובות IP. המטרה היא להבין אילו תכנים עוזרים לגולשים ולשפר את האתר. המידע מעובד אצל Google, גם מחוץ לישראל, ונשמר לכל היותר 14 חודשים לפי הגדרות השמירה. את האישור אפשר לבטל בכל עת בקישור "הגדרות עוגיות" בתחתית כל עמוד, ואז העוגיות של Google Analytics נמחקות מהדפדפן.</p>

  <h2 id="cookies">עוגיות ואחסון בדפדפן</h2>
  <p>עוגיות (Cookies) וזיכרון מקומי (Local Storage) הם קבצים קטנים שהדפדפן שומר. האתר משתמש באלה בלבד:</p>
  <div class="table-wrap" role="region" aria-label="טבלת העוגיות" tabindex="0"><table>
    <thead><tr><th scope="col">שם</th><th scope="col">של מי</th><th scope="col">בשביל מה</th><th scope="col">משך</th><th scope="col">מתי</th></tr></thead>
    <tbody>
      <tr><td><code>_ga</code></td><td>Google Analytics</td><td>מבחין בין גולשים לצורך סטטיסטיקה</td><td>שנתיים</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>_ga_&lt;מזהה&gt;</code></td><td>Google Analytics</td><td>שומר את מצב הביקור</td><td>שנתיים</td><td>רק אחרי אישור</td></tr>
      <tr><td><code>hg-consent</code></td><td>האתר, זיכרון מקומי</td><td>זוכר אם אישרתם סטטיסטיקה</td><td>עד שתמחקו</td><td>הכרחי</td></tr>
      <tr><td><code>hanoch-a11y</code></td><td>האתר, זיכרון מקומי</td><td>זוכר את ההגדרות שבחרתם בתפריט הנגישות</td><td>עד שתמחקו</td><td>הכרחי</td></tr>
      <tr><td><code>hg-intro</code></td><td>האתר, זיכרון זמני</td><td>פתיחה קצרה יותר בביקור חוזר</td><td>עד סגירת הלשונית</td><td>הכרחי</td></tr>
      <tr><td><code>hg-archive-film</code></td><td>האתר, זיכרון מקומי</td><td>הסרט בארכיון מתנגן רק בביקור הראשון</td><td>עד שתמחקו</td><td>הכרחי</td></tr>
      <tr><td><code>hg-brief</code></td><td>האתר, זיכרון מקומי</td><td>טיוטת טופס הבריף, כדי להמשיך מאיפה שעצרתם</td><td>עד שליחה או "התחלה מחדש"</td><td>הכרחי</td></tr>
      <tr><td><code>hg-chat</code>, <code>hg-chat-hint</code></td><td>האתר, זיכרון זמני</td><td>השיחה עם המצפן, וזה שההזמנה אליו כבר הוצגה</td><td>עד סגירת הלשונית</td><td>הכרחי</td></tr>
    </tbody>
  </table></div>
  <p>הזיכרון המקומי של האתר נשאר במכשיר שלכם ולא נשלח לאף אחד. אפשר למחוק את כל אלה בהגדרות הדפדפן.</p>

  <h2>אחסון האתר</h2>
  <p>האתר מאוחסן אצל Vercel Inc. בארצות הברית. כמו כל שרת אינטרנט, השרת מעבד נתונים טכניים כמו כתובת IP, סוג הדפדפן והעמוד שהתבקש, כדי להציג לכם את האתר ולהגן עליו. הנתונים האלה נשמרים לזמן קצר לפי המדיניות של Vercel, ואני לא משתמש בהם כדי לזהות גולשים. הגופנים, ספריות הקוד, התמונות והסרטונים נטענים מהשרת של האתר עצמו, ולא משרתים של חברות אחרות.</p>

  <h2>שירותים חיצוניים שאתם מפעילים</h2>
  <p>לחיצה על קישור לוואטסאפ פותחת את WhatsApp, של Meta, וההודעה כפופה למדיניות הפרטיות שלהם. מייל שאתם שולחים עובר דרך ספק הדואר שלכם ושלי. קישורים לאתרים של לקוחות מובילים לאתרים עם מדיניות פרטיות משלהם.</p>

  <h2>עם מי המידע משותף</h2>
  <p>אני לא מוכר ולא משכיר מידע אישי. מידע מועבר רק לספקים שצוינו כאן, ככל שהשירות שלהם נדרש, לרואה החשבון שלי ולרשויות המס לגבי לקוחות שקיבלו שירות, ולגורם שהחוק מחייב למסור לו מידע.</p>

  <h2>העברה מחוץ לישראל</h2>
  <p>Google,‏ Meta ו-Vercel מעבדות מידע גם בארצות הברית ובמדינות נוספות. ההעברה נעשית לפי מנגנוני ההגנה שהספקים האלה מפעילים, כמו מסגרת EU-U.S. Data Privacy Framework או סעיפים חוזיים תקניים.</p>

  <h2>כמה זמן המידע נשמר</h2>
  <p>פנייה שלא הבשילה לפרויקט נמחקת כשאין בה עוד צורך. מידע על לקוחות נשמר במשך ההתקשרות ולאחריה, ככל שנדרש לפי דיני המס והחשבונאות ולצורך טיפול בשאלות על העבודה. נתוני Google Analytics נשמרים לכל היותר 14 חודשים.</p>

  <h2>אבטחת מידע</h2>
  <p>האתר מוגש רק בחיבור מוצפן (HTTPS), ואין בו מאגר של פרטים אישיים. הגישה למידע שמגיע אליי מוגבלת אליי בלבד. אף מערכת אינה חסינה לחלוטין, אבל אני נוקט אמצעים סבירים כדי לשמור על המידע.</p>

  <h2>הזכויות שלכם</h2>
  <ul>
    <li>לעיין במידע עליכם שמוחזק אצלי (סעיף 13 לחוק הגנת הפרטיות).</li>
    <li>לבקש לתקן או למחוק מידע שאינו נכון, שלם, ברור או מעודכן (סעיף 14 לחוק).</li>
    <li>לבטל בכל רגע את האישור לסטטיסטיקה, בקישור "הגדרות עוגיות".</li>
    <li>מי שנמצא באיחוד האירופי, באזור הכלכלי האירופי או בבריטניה זכאי גם לזכויות לפי GDPR: גישה, תיקון, מחיקה, הגבלת עיבוד, ניוד מידע והתנגדות לעיבוד, וזכות להתלונן לרשות הפיקוח במדינתו.</li>
  </ul>
  <p>כדי לממש זכות, כתבו לי במייל {CONTACT_HE}. אענה בתוך 30 יום, ואם צריך, אבקש פרט מזהה כדי לוודא שהבקשה הגיעה מכם. אפשר גם להתלונן לרשות להגנת הפרטיות במשרד המשפטים.</p>

  <h2>בסיס חוקי (למבקרים מהאיחוד האירופי)</h2>
  <p>סטטיסטיקה: הסכמה שלכם. מענה לפנייה והכנת הצעה: צעדים לבקשתכם לפני התקשרות, ואינטרס לגיטימי לענות לפניות. שמירת רשומות על לקוחות: חובה לפי דין.</p>

  <h2>הודעות פרסומת</h2>
  <p>אני לא שולח הודעות פרסומת במייל, ב-SMS או בוואטסאפ בלי הסכמה מפורשת מראש, כנדרש בסעיף 30א לחוק התקשורת. כל הודעה כזו תכלול דרך פשוטה להסיר את עצמכם.</p>

  <h2>ילדים</h2>
  <p>האתר מיועד לבעלי עסקים ואינו מיועד לילדים.</p>

  <h2>שינויים במדיניות</h2>
  <p>אם המדיניות תשתנה, הנוסח המעודכן יפורסם בעמוד הזה עם תאריך העדכון.</p>'''

PRIVACY_EN = f'''  <p class="lead">hgpro.io belongs to HG Studio, the business of Hanoch Gotovski. This page explains what information is collected when you browse the site or contact me, why, who it is shared with, and what your rights are.</p>

  <h2>In short</h2>
  <ul>
    <li>There is no sign-up on the site, and no form stores your details on a server.</li>
    <li>A message on WhatsApp, by email or by phone reaches me directly, and only when you choose to send it.</li>
    <li>Google Analytics loads only if you allow analytics, and you can withdraw that at any time.</li>
    <li>I do not sell personal information, and I do not send marketing messages without your explicit consent.</li>
  </ul>

  <h2>Who is responsible for the information</h2>
  <p>Hanoch Gotovski, HG Studio. For any privacy question, write to {CONTACT_EN}.</p>

  <h2>Information you give me</h2>
  <p>When you contact me, I receive what you chose to send: your name, phone number or email address (depending on the channel you chose), and the content of your message. If you filled in the brief form on the home page, your answers (type of business, goals, what you have today, and if you wanted, a name and one sentence about the business) go into a ready message. The form sends nothing to a server: the message goes out only if you tap "Send to me on WhatsApp" or "Send to me by email". Until then, your answers are kept only in your browser, so you can pick up where you left off.</p>
  <h2 id="assistant">Compass, the digital advisor</h2>
  <p>Compass is a digital advisor, not a person. When you pick ready-made answers (like your type of business), nothing leaves your browser. When you type a free question, the text of the conversation is sent to the site’s server at Vercel, and from there to Anthropic, the company that runs the Claude AI model, only to write an answer. Processing may take place outside Israel. The site does not store the conversation or log its content. It is kept only in your browser tab, and deleted when you close it. Please don’t share sensitive information with Compass, such as card details, ID numbers or medical information.</p>
  <p>Nothing from the chat reaches me unless you tap "Send to Hanoch on WhatsApp". Only then does a message open with the brief you approved, and you decide whether to send it.</p>
  <p>You are not legally required to share these details, but without a way to reach you I cannot get back to you. I use the information to answer you, prepare a proposal, provide the service you ordered, issue receipts and invoices, and meet my legal obligations.</p>

  <h2 id="analytics">Analytics (Google Analytics)</h2>
  <p>Only if you allow analytics in the notice shown when you arrive does Google Analytics 4 by Google load. It collects information about how the site is used: which pages were viewed and when, approximate location (country and city), device and browser type, where you came from, and actions on the site such as tapping WhatsApp, phone or email, playing videos, moving between steps of the brief form (the step number only) and visiting client sites. Your answers in the form and the content of your messages are not sent to Google.</p>
  <p>According to Google, Google Analytics 4 does not store IP addresses. The purpose is to understand which content helps visitors and to improve the site. The data is processed by Google, including outside Israel, and kept for at most 14 months under the retention settings. You can withdraw consent at any time with the "Cookie settings" link at the bottom of every page, and the Google Analytics cookies are then deleted from your browser.</p>

  <h2 id="cookies">Cookies and browser storage</h2>
  <p>Cookies and local storage are small files your browser keeps. The site uses only these:</p>
  <div class="table-wrap" role="region" aria-label="Cookie table" tabindex="0"><table>
    <thead><tr><th scope="col">Name</th><th scope="col">Set by</th><th scope="col">Purpose</th><th scope="col">Duration</th><th scope="col">When</th></tr></thead>
    <tbody>
      <tr><td><code>_ga</code></td><td>Google Analytics</td><td>Tells visitors apart for statistics</td><td>2 years</td><td>Only after consent</td></tr>
      <tr><td><code>_ga_&lt;ID&gt;</code></td><td>Google Analytics</td><td>Keeps the state of the visit</td><td>2 years</td><td>Only after consent</td></tr>
      <tr><td><code>hg-consent</code></td><td>This site, local storage</td><td>Remembers whether you allowed analytics</td><td>Until you delete it</td><td>Necessary</td></tr>
      <tr><td><code>hanoch-a11y</code></td><td>This site, local storage</td><td>Remembers your accessibility menu settings</td><td>Until you delete it</td><td>Necessary</td></tr>
      <tr><td><code>hg-intro</code></td><td>This site, session storage</td><td>A shorter intro on a repeat visit</td><td>Until the tab is closed</td><td>Necessary</td></tr>
      <tr><td><code>hg-archive-film</code></td><td>This site, local storage</td><td>The archive film plays only on the first visit</td><td>Until you delete it</td><td>Necessary</td></tr>
      <tr><td><code>hg-brief</code></td><td>This site, local storage</td><td>The brief form draft, so you can pick up where you left off</td><td>Until you send or start over</td><td>Necessary</td></tr>
      <tr><td><code>hg-chat</code>, <code>hg-chat-hint</code></td><td>This site, session storage</td><td>Your chat with Compass, and whether its invitation was already shown</td><td>Until you close the tab</td><td>Necessary</td></tr>
    </tbody>
  </table></div>
  <p>The site's local storage stays on your device and is not sent to anyone. You can delete all of it in your browser settings.</p>

  <h2>Hosting</h2>
  <p>The site is hosted by Vercel Inc. in the United States. Like any web server, it processes technical data such as your IP address, browser type and the page requested, to show you the site and protect it. This data is kept for a short time under Vercel's policy, and I do not use it to identify visitors. Fonts, code libraries, images and videos load from the site's own server, not from other companies' servers.</p>

  <h2>Outside services you choose to use</h2>
  <p>A WhatsApp link opens WhatsApp, by Meta, and your message is subject to their privacy policy. An email you send passes through your email provider and mine. Links to client sites lead to sites with their own privacy policies.</p>

  <h2>Who the information is shared with</h2>
  <p>I do not sell or rent personal information. Information is passed only to the providers named here, as far as their service requires, to my accountant and the tax authorities for clients who received a service, and to anyone the law requires me to disclose it to.</p>

  <h2>Transfers outside Israel</h2>
  <p>Google, Meta and Vercel also process information in the United States and other countries. Transfers rely on the safeguards these providers use, such as the EU-U.S. Data Privacy Framework or standard contractual clauses.</p>

  <h2>How long information is kept</h2>
  <p>A message that does not become a project is deleted once it is no longer needed. Client information is kept during the engagement and afterwards as required by tax and accounting law, and to handle questions about the work. Google Analytics data is kept for at most 14 months.</p>

  <h2>Security</h2>
  <p>The site is served only over an encrypted connection (HTTPS), and it holds no database of personal details. Access to the information that reaches me is limited to me. No system is completely secure, but I take reasonable measures to protect the information.</p>

  <h2>Your rights</h2>
  <ul>
    <li>To see the information I hold about you (section 13 of the Israeli Protection of Privacy Law).</li>
    <li>To ask me to correct or delete information that is not accurate, complete, clear or up to date (section 14).</li>
    <li>To withdraw consent to analytics at any time, with the "Cookie settings" link.</li>
    <li>If you are in the European Union, the European Economic Area or the United Kingdom, you also have rights under the GDPR: access, rectification, erasure, restriction, portability and objection, and the right to complain to your local supervisory authority.</li>
  </ul>
  <p>To use a right, write to me at {CONTACT_EN}. I will answer within 30 days, and if needed I will ask for a detail that confirms the request came from you. You can also complain to the Israeli Privacy Protection Authority at the Ministry of Justice.</p>

  <h2>Legal basis (for visitors from the EU)</h2>
  <p>Analytics: your consent. Answering a message and preparing a proposal: steps you asked for before a contract, and a legitimate interest in answering messages. Keeping client records: a legal obligation.</p>

  <h2>Marketing messages</h2>
  <p>I do not send marketing messages by email, SMS or WhatsApp without your explicit prior consent, as required by section 30A of the Israeli Communications Law. Every such message includes a simple way to opt out.</p>

  <h2>Children</h2>
  <p>The site is meant for business owners and is not intended for children.</p>

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
    <li>ספריית התלת־ממד three.js, ברישיון MIT.</li>
    <li>מוזיקה בסרטים: הפרלוד מהסוויטה לצ׳לו מס׳ 1 של באך (הקלטה בנחלת הכלל, מוויקישיתוף); הנוקטורן אופ׳ 9 מס׳ 2 של שופן (הקלטה של Peter Johnston, ברישיון CC0); הפתיחה ל"וילהלם טל" של רוסיני (התזמורת של חיל הנחתים האמריקאי, בנחלת הכלל).</li>
    <li>התמונות, הסרטים והקולות שמסומנים כנוצרים בבינה מלאכותית נוצרו בכלים בתשלום, לפי תנאי השימוש שלהם.</li>
  </ul>

  <h2>יצירת קשר</h2>
  <p>שאלות על התנאים: {CONTACT_HE}.</p>'''

TERMS_EN = f'''  <p class="lead">hgpro.io belongs to HG Studio, the business of Hanoch Gotovski. Using the site is subject to these terms, the <a href="en-privacy.html">privacy policy</a> and the <a href="en-refunds.html">cancellation and refund policy</a>.</p>

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
    <li>The three.js 3D library, under the MIT license.</li>
    <li>Music in the films: the Prelude from Bach's Cello Suite No. 1 (a public domain recording, from Wikimedia Commons); Chopin's Nocturne Op. 9 No. 2 (recorded by Peter Johnston, CC0); the overture to Rossini's William Tell (the United States Marine Corps Band, public domain).</li>
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
  <p>HG Studio is the business of Hanoch Gotovski. The full business details appear in the proposal and the deal documents.</p>

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
