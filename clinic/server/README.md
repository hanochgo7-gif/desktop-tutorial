# השרת של העוזרת (Claude בכל אתר)

העוזרת באתר עונה מהידע המקומי בכל מקום. כדי שתענה עם Claude גם מחוץ ל-claude.ai, צריך שרת קטן שמחזיק את מפתח ה-API. התיקייה הזו היא השרת: Cloudflare Worker, חינמי עד 100,000 בקשות ביום.

## מה צריך
1. חשבון Cloudflare (חינם): https://dash.cloudflare.com
2. מפתח API של Anthropic: https://platform.claude.com (יש לטעון יתרה. שאלה ממוצעת עולה פחות מאגורה בודדת, כי הידע נשמר במטמון).
3. Node.js על המחשב.

## התקנה (פעם אחת, כ-10 דקות)
```
cd clinic/server
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # מדביקים את המפתח
npm run deploy
```
בסוף הפריסה מודפסת כתובת כמו `https://rotem-assistant.<שם>.workers.dev`.

## חיבור לאתר
בקובץ `clinic/js/config.js` מכניסים את הכתובת:
```
window.ASSISTANT_API = "https://rotem-assistant.<שם>.workers.dev";
```
ובקובץ `wrangler.toml` מגבילים את הגישה לדומיין של האתר:
```
ALLOWED_ORIGINS = "https://www.הדומיין-שלך.co.il"
```
ואז `npm run deploy` שוב.

## עדכון הידע
הידע נבנה אוטומטית מ-`js/services.js` ו-`js/products.js` בכל פריסה. אחרי שינוי בתפריט או בחנות מריצים `npm run deploy` וזהו. העובדות הכלליות (שעות, כתובת, מדיניות) נמצאות ב-`build-knowledge.mjs`.

## מה יש בפנים
- `worker.mjs`: מקבל את השיחה מהדף, מוסיף את הידע כהנחיית מערכת (עם מטמון, כדי שזה יהיה זול), ומזרים את התשובה בחזרה.
- מודל: Claude Opus 5.5 במאמץ נמוך (תשובות מהירות וקצרות), עם גיבוי אוטומטי של Anthropic אם בקשה נדחית.
- הגנות: עד 12 הודעות בשיחה, עד 600 תווים להודעה, 20 בקשות בדקה לכתובת, וגישה רק מהדומיינים שהוגדרו.
