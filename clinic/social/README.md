# פרסום לרשתות דרך Zernio

תיקייה זו מחברת את האתר ל-[Zernio](https://zernio.com): שירות אחד שמפרסם ומתזמן פוסטים לאינסטגרם, פייסבוק, Google Business, טיקטוק ועוד, דרך API. שני חשבונות ראשונים בחינם.

## התקנה (פעם אחת)

```bash
cd clinic/social
npm install
cp .env.example .env     # ולמלא את ZERNIO_API_KEY ואת SITE_URL
```

המפתח נשמר רק ב-`.env` (מוחרג מגיט) או כמשתנה סביבה. לא בקוד ולא בצ'אט.

## חיבור חשבונות

```bash
npm run connect -- instagram
npm run connect -- facebook
npm run connect -- googlebusiness
```

כל פקודה מדפיסה קישור. פותחים בדפדפן, מאשרים, והחשבון מופיע ב-`npm run accounts`.

## פרסום

```bash
# פוסט בודד, כטיוטה (ברירת מחדל, לא מתפרסם)
npm run post -- --text "טיפ לעור בקיץ" --image images/face-crew.webp

# מתוזמן, לרשתות מסוימות, עם קישור לדף באתר
npm run post -- --text "..." --image images/laser-crew.webp --to instagram,facebook --when 2026-10-12T10:00 --link treatments/laser-hair-removal.html

# מיידי
npm run post -- --text "..." --now
```

## לוח תוכן מוכן

`posts.json` מכיל שמונה פוסטים בעברית שנכתבו מתוך תוכן האתר (מדריכים, שאלות נפוצות, חנות), כל אחד עם תמונה מהאתר וקישור לדף המתאים.

```bash
npm run plan -- --dry-run            # רק מציג מה ייצא ומתי
npm run plan -- --from 2026-10-13    # מתזמן פוסט כל 3 ימים ב-10:00, מהתאריך הזה
npm run plan -- --draft              # יוצר טיוטות בלבד, לעריכה בלוח של Zernio
npm run list -- --status scheduled   # מה מתוזמן
```

אפשר לערוך את `posts.json` בחופשיות: `day` קובע יום יחסי להתחלה, `hour` שעה, `hashtags` לכל פוסט.

## מה עוד אפשר

Zernio מציע גם תיבת הודעות מאוחדת (וואטסאפ, אינסטגרם, מסנג'ר), אנליטיקה ופרסום ממומן. התיעוד המלא: https://zernio.com/llms.txt
