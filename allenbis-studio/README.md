# Allenbis Studio

סטודיו ליצירת תמונות וסרטונים לאתר אלנביס (אייקוני קטגוריות, תמונות לחבילות, שליח, באנרים ואנימציה של תמונת הפתיחה), על בסיס תבנית Higgsfield Studio וה-API של Higgsfield.

## הפעלה

```bash
cp .env.example .env.local   # HF_API_BASE_URL=https://api.higgsfield.ai
pnpm install
pnpm dev                     # http://localhost:3000
```

בסרגל הצד: **Connect API key** ← מדביקים את המפתח שהועתק מ-https://open.higgsfield.ai/api-keys כמו שהוא.
המפתח נשמר בעוגיית HTTP-only בדפדפן, ורק השרת שולח בקשות ל-Higgsfield. הוא לא נשמר בקוד ולא ב-localStorage.

## תבניות (Explore)

| תבנית | מודל | הערות |
|---|---|---|
| Category icon | Recraft 4.1 | 1:1, טקסט בלבד |
| Bundle cover | Grok Imagine 2.0 | 16:9, מצרף אוטומטית את תמונת הפתיחה כרפרנס |
| Courier on the way | Grok Imagine 2.0 | 16:9, רפרנס: תמונת הפתיחה |
| Deal banner | Qwen Image 3 | 16:9 |
| Animate the storefront | Kling 3.0 Turbo | וידאו מתמונה: תמונת הפתיחה כפריים ראשון |

תבנית עם רפרנס מעלה את התמונה דרך `app/api/upload/route.ts` (כתובת העלאה חתומה), ולכן דורשת מפתח מחובר.

## שינויים מול התבנית המקורית

- מודלי תמונה תוקנו לפי התיעוד (docs.higgsfield.ai/docs/models/...): Recraft 4.1 (1k בלבד, בלי רפרנסים), Qwen Image 3 (רפרנסים דרך `/edit`, עד 3), Ideogram 4.0 (בלי `resolution`, רפרנס יחיד `image_url`, `rendering_speed`), Grok Imagine 2.0 (עד 10 רפרנסים, 1k/2k), Z-Image Turbo (בלי רפרנסים, 1k/2k).
- פעולות השרת מחזירות שגיאות כערך, כדי שבגרסת production יופיע טקסט ברור (401 מפתח שגוי, 403 אין קרדיטים, 422/423/503 וכו׳) ולא הודעת React מוסתרת.
- מניעת שליחה כפולה: חסימה בממשק בזמן שליחה, ובשרת בקשה זהה מאותו מפתח בתוך 10 שניות מחזירה את אותה בקשה.
- Polling לפי התיעוד: 2 שניות עד 10 שניות עם jitter; שגיאות 5xx/רשת לא מכשילות את הריצה.
- בטלפון סרגל הצד נפתח מכווץ.

## לא נבדק

- יצירה אמיתית מול ה-API (לא היה מפתח תקין). נבדקו: מפתח חסר, מפתח שגוי, העלאה עם מפתח שגוי, שליחה כפולה.
- Flux 2 (`flux-2-pro`) לא מופיע בתיעוד ובקטלוג; נשאר מותקן אבל כנראה לא תקין.
- מיפויי מודלי הווידאו לא אומתו מול התיעוד, מלבד Kling 3.0 Turbo image-to-video.
- `pnpm dlx shadcn@latest add higgsfield-ai/app-templates/<model>` ידרוס את התיקונים בקבצי המודלים.
