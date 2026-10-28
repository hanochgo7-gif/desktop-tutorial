# י. מזרחי בניה ושות׳ — אתר, מותג ותשתית שיווקית

אתר סטטי בעברית (RTL): דף בית, 3 עמודי תחום, פרויקטים, החברה, צרו קשר, פרטיות, נגישות, קרדיטים ו-404.
בלי framework ובלי תלות חיצונית: Python בונה את הדפים, CSS ו-JS אחד לכל האתר.

**מצב נוכחי: גרסת תצוגה.** אין עדיין פרטי קשר, יעד לטופס ודומיין, ולכן כל הדפים `noindex`, ובראש כל עמוד מוצגת הודעה שהטופס לא שולח.
מה חסר: `docs/open-questions.md`.

## מבנה

```
index.html, *.html        הדפים (נוצרים מהסקריפט — לא לערוך ידנית)
css/site.css              מערכת העיצוב (טוקנים בראש הקובץ)
js/site.js                התחלפות תמונות, רשימת הבדיקה, טופס, תפריט, הסכמה ומדידה
assets/img/               צילומים (WebP ב-720/1280/1920)
assets/brand/             הלוגו: SVG לכל הגרסאות, PNG ב-png/
assets/fonts/             Noto Sans Hebrew (OFL)
brand/index.html          ספר המותג (פנימי, noindex)
content/projects.json     הפרויקטים (כרגע ריק)
content/image-credits.json מקור, צלם ורישיון לכל תמונה
tools/config.py           פרטי החברה ומתגי ההשקה  ← כאן מעדכנים עובדות
tools/content.py          כל הטקסטים
tools/build.py            בונה את כל הדפים
tools/brand.py            מייצר את הלוגו
docs/                     אסטרטגיה, פרסונות, מבנה, עיצוב, SEO, שיווק, בדיקות, שאלות פתוחות, מחקר
```

## הרצה מקומית

```bash
cd mizrahi
python3 tools/build.py              # בונה את הדפים, ומדפיס מה עוד חוסם השקה
cd .. && python3 -m http.server 8765
# http://localhost:8765/mizrahi/
```

## עדכון פרטי החברה

הכול ב-`tools/config.py`. שדה ריק = לא מוצג. אחרי כל שינוי: `python3 tools/build.py`.

| שדה | מה קורה כשממלאים |
|---|---|
| `phone` | טלפון בכותרת, בתפריט, בשלט האתר בפוטר, בשאלות הנפוצות, ובפס פעולה בנייד |
| `whatsapp` (972…) | כפתור WhatsApp צף, ופס פעולה בנייד |
| `email` | בפוטר; והטופס פותח אימייל מוכן (אם אין טוקן HG OS) |
| `contractor_reg`, `contractor_class` | בשלט האתר, ברשימת הבדיקה ("המספר שלנו…") ובדף הבית |
| `legal_name`, `company_id` | שורת זכויות, מדיניות פרטיות, נתונים מובנים |
| `address`, `city`, `hours` | פוטר, שאלות נפוצות, צרו קשר; הנתונים המובנים הופכים ל-GeneralContractor |
| `service_area` | נתונים מובנים ושירותים |
| `founded` | נתונים מובנים |
| `TIMELINE` | קטע "ציוני דרך" בעמוד החברה |
| `HGOS_TOKEN` | הטופס שולח כליד ל-HG OS (הגדרות ← "חיבור לאתר") |
| `GA4_ID`, `ADS_ID`, `ADS_LABELS` | באנר הסכמה + מדידה (ראו `docs/marketing.md`) |
| `SITE_URL` | **מתג ההשקה:** מסיר noindex, מוסיף canonical, יוצר sitemap.xml ו-robots.txt |

## הוספת פרויקט

ב-`content/projects.json` (רשימה). כל שדה חוץ מ-`id`, `name` ו-`images` אופציונלי — שדה שלא ממולא לא מוצג:

```json
[
  {
    "id": "beit-prati-1",
    "name": "בית פרטי, שני מפלסים",
    "type": "בית פרטי",
    "type_key": "private",
    "city": "",
    "year": "",
    "area": "",
    "scope": "עד מפתח",
    "client": "",
    "architect": "",
    "note": "",
    "is_render": false,
    "images": [
      {"src": "assets/img/projects/beit-prati-1-a.webp", "alt": "חזית הבית מהרחוב", "w": 1600, "h": 1000}
    ]
  }
]
```

- `type_key`: `private` / `residential` / `public` (לסינון).
- `is_render: true` מוסיף לכרטיס "הדמיה, לא צילום". **אין להציג הדמיה כמבנה שבוצע.**
- `client` רק באישור המזמין.
- כשיש פרויקט אחד לפחות, דף הבית מציג אוטומטית את שלושת הראשונים במקום "הגלריה בהכנה".

## החלפת תמונות

1. שומרים את התמונה ב-3 רוחבים: `name.webp` (1920), `name-1280.webp`, `name-720.webp` בתיקייה `assets/img/`. (אפשר עם כל כלי; ב-Python: `PIL.Image.save(..., 'WEBP', quality=74)`.)
2. מוסיפים רשומה ל-`content/image-credits.json` עם `name`, `caption`, `width`, `height` (ואם זו תמונה של החברה: `title` = תיאור, `creator` = הצלם, `license` = "כל הזכויות שמורות").
3. ב-`tools/build.py` / `tools/content.py` מחליפים את שם התמונה במקום הרצוי (למשל `'image': 'house-1964'` בעמוד התחום).
4. `python3 tools/build.py`.

**התמונות הנוכחיות** הן צילומי ארכיון ותיעוד של אתרי בנייה בישראל מוויקישיתוף (נחלת הכלל / CC0 / CC BY / CC BY-SA), עם קרדיט מלא ב-`credits.html`. הן לא פרויקטים של החברה, וכך כתוב באתר.
**ההמלצה הראשונה:** להחליף אותן בארכיון של החברה עצמה. 60 שנה של צילומים מאתרי עבודה שווים יותר מכל עיצוב.

## הלוגו

- כל הקבצים ב-`assets/brand/`. המקור: `python3 tools/brand.py` (מייצר הכול מאותה גאומטריה).
- PNG: מתוך ה-SVG, ב-Chromium (ראו `docs/qa-report.md`).
- **Canva:** החשבון מחובר (נמצא Brand Kit אחד), אבל הלוגו **לא נוצר בתוך Canva**: הכלים של Canva יכולים לייבא רק קבצים מכתובת ציבורית, ולא העליתי קבצים לאחסון ציבורי רק כדי לקבל כתובת.
  להעברה ל-Canva: Brand Kit ← Logos ← Upload ← `assets/brand/logo-horizontal-olive.svg`, `logo-compact-olive.svg`, `mark-olive.svg`, `mark-bone.svg`.
  צבעים: `#38450f`, `#ecebe7`, `#e1dfd9`, `#4f5a2c`. גופן: Noto Sans Hebrew (לבדוק אם קיים בספריית הגופנים של Canva; אם לא, להעלות את הגופן ל-Brand Kit — הוא ברישיון OFL).

## פריסה

האתר לא צריך שרת או בנייה בצד השרת. מעלים את תיקיית `mizrahi/` (בלי `tools/`, `docs/`, `content/`, `README.md`):

- **Netlify / Cloudflare Pages** (מומלץ — מאפשר כותרות אבטחה): לגרור את התיקייה, או לחבר את הריפו עם תיקיית פרסום `mizrahi` ופקודת בנייה `python3 tools/build.py`.
- **GitHub Pages** (כמו שאר הריפו): הריפו כבר מפרסם את כל התיקיות ב-`main`; `.github/workflows/pages.yml` מסיר את התיקיות הפנימיות של mizrahi מהפרסום.
  כתובת זמנית: `https://hanochgo7-gif.github.io/desktop-tutorial/mizrahi/`. לדומיין נפרד עדיף ריפו נפרד או Netlify.
- אחרי חיבור הדומיין: `SITE_URL` ב-config, בנייה, העלאה, Google Search Console ← הגשת sitemap.

`404.html` עובד רק כשהאתר יושב בשורש הדומיין.

## תחזוקה

- **חזרה לגרסה קודמת:** כל שינוי נשמר ב-git; `git log -- mizrahi/` ואז `git checkout <commit> -- mizrahi/`.
- **בדיקות לפני כל העלאה:** `docs/qa-report.md` מתאר את הבדיקות שהורצו. לכל הפחות: לבנות, לפתוח בדפדפן בטלפון ובמחשב, לשלוח טופס בדיקה.
- **פעמיים בשנה:** לוודא שקישור רשם הקבלנים חי (`REGISTRY_URL` ב-`tools/content.py`), לעדכן את מדיניות הפרטיות אם השתנו כלים, ולעדכן את "60" אם הוא מספר ולא שנה.
- טקסטים: `tools/content.py`. מבנה ועיצוב: `tools/build.py` + `css/site.css`.

## מסמכים

| מסמך | תוכן |
|---|---|
| `docs/strategy.md` | מיצוב, בידול, הבטחת מותג, היררכיית מסרים, בדיקת הסיסמה, שלושת הכיוונים החזותיים |
| `docs/personas.md` | 8 פרסונות, סימולציות על האתר, מה תוקן |
| `docs/site-map.md` | עמודים, קהל, כוונה, הוכחה, פעולה ומדד לכל עמוד; מסלולי המרה; הטופס |
| `docs/design-system.md` | צבעים, גופן, ריווח, רכיבים, תמונות, תנועה |
| `docs/seo.md` | מחקר ביטויים, מיפוי לעמודים, נתונים מובנים, תוכנית תוכן |
| `docs/marketing.md` | מסרים לפי קהל, מבנה Google Ads, מודעות, אירועי מדידה, A/B |
| `docs/qa-report.md` | Lighthouse, axe, בדיקות פונקציונליות, אבטחה, טבלת בעיות, תנאי סף |
| `docs/open-questions.md` | מה צריך מהחברה, ממצאים מרשומות ציבוריות, ניסוחים לאישור |
| `docs/research/` | מחקר מתחרים ומחקר ביטויים (עם מקורות) |
