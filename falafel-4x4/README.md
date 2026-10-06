# קייטרינג 4X4 לאירועים – האתר

אתר סטטי בעברית. אין שרת ואין בנייה: מעלים את כל התיקייה הזאת כמו שהיא.

## הקבצים
| קובץ | מה יש בו |
|---|---|
| `index.html` | כל העמוד והעיצוב |
| `quote.js` | מחשבון הצעת המחיר |
| `a11y.js` | תפריט הנגישות |
| `accessibility.html` | הצהרת הנגישות |
| `fonts/` | הגופנים Karantina ו-Rubik |
| `images/` | התמונות, הלוגו, מפת קווי הגובה ותמונת השיתוף `og.jpg` |

## להכניס מחירים למחשבון
בראש `quote.js` יש בלוק `PRICING`. ממלאים מחיר לאורח במקום כל `null`, למשל `falafel: 45`.
כל עוד חסר מחיר אחד מהפריטים שנבחרו, הקבלה מציגה "בהצעה של ניסים" במקום סכום.

## העלאה לאוויר – GitHub Pages (חינם)
1. בגיטהאב, בריפו `desktop-tutorial`: Settings, ואז Pages.
2. תחת Source בוחרים "Deploy from a branch", את הענף הראשי ואת התיקייה `/ (root)`. שומרים.
3. אחרי כדקה האתר זמין בכתובת:
   `https://hanochgo7-gif.github.io/desktop-tutorial/falafel-4x4/`
4. הקבצים `sitemap.xml`, `robots.txt`, תמונת השיתוף והכתובת הקנונית ב-`index.html` כבר מכוונים לכתובת הזאת.

## דומיין משלכם (למשל falafel4x4.co.il)
1. קונים דומיין אצל רשם דומיינים ישראלי.
2. ב-GitHub Pages, תחת Custom domain, כותבים את הדומיין. אצל הרשם מוסיפים רשומת CNAME ל-`hanochgo7-gif.github.io`.
3. מחליפים בכל הקבצים את הכתובת `https://hanochgo7-gif.github.io/desktop-tutorial/falafel-4x4/` בכתובת החדשה:
   `index.html`, `accessibility.html`, `sitemap.xml`, `robots.txt`.

מומלץ לשקול להעביר את האתר לריפו משלו, כדי שהכתובת תהיה נקייה ולא תכלול את אתר גוטובסקי שיושב באותו ריפו.

## אחרי שהאתר באוויר
- לבדוק את תמונת השיתוף בכלי של פייסבוק: https://developers.facebook.com/tools/debug/
- לפתוח פרופיל עסקי בגוגל עם הטלפון והקישור לאתר.
