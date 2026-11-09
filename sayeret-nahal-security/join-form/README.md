# טופס ההצטרפות: חיבור ל-CRM

**הקישור:** https://hanochgo7-gif.github.io/desktop-tutorial/sayeret-nahal/join/

**קישור לנציג צוות (כדי לספור כמה נרשמו דרכו):** אותו קישור עם `?ref=` בסוף, למשל
`https://hanochgo7-gif.github.io/desktop-tutorial/sayeret-nahal/join/?ref=team-2015-nov`
(אותיות, ספרות ומקף בלבד, עד 40 תווים). הערך נשמר בשדה `ref`.

הטופס כבר שולח אל `https://nahal-crm.vercel.app/api/join`. עד שהנתיב הזה קיים ב-CRM, השליחה נכשלת ("השליחה לא הצליחה"). **לא מפיצים את הקישור לפני שטופס בדיקה מגיע ל-CRM.**

## מה עושים בצד ה-CRM (nahal-crm)

1. מעתיקים את `crm-route.ts` (בתיקייה הזו) אל `app/api/join/route.ts` בפרויקט ה-CRM.
2. מחריגים את `/api/join` מבדיקת ההתחברות (middleware). היום הנתיב מחזיר 307, כלומר הפניה לדף הכניסה.
3. ממשים את `saveMember` כך שתכתוב למסד הנתונים של ה-CRM: upsert לפי טלפון או מייל, ו-`ref` נשמר כמקור ההגעה.
4. פורסים ל-Vercel, ממלאים טופס בדיקה מהקישור, ומוודאים שהרשומה הופיעה ב-CRM.

## אם הכתובת משתנה

1. ב-`src.html` מעדכנים `const ENDPOINT="https://...";`
2. מריצים `python3 sayeret-nahal-security/join-form/build.py` (הסקריפט מעדכן גם את ה-CSP).
3. עושים commit ו-push ל-`main`.

## מה הכתובת צריכה לעשות

- לקבל `POST` ב-HTTPS. הגוף הוא JSON, שנשלח עם `Content-Type: text/plain;charset=utf-8` (כדי שהדפדפן לא ישלח בקשת preflight).
- להחזיר קוד 2xx כשהשמירה הצליחה. כל קוד אחר מציג למשתמש "השליחה לא הצליחה" עם אפשרות לנסות שוב.
- להחזיר `Access-Control-Allow-Origin: https://hanochgo7-gif.github.io`, אחרת הדפדפן לא יראה שהשליחה הצליחה.
- **אבטחה:**
  - הכתובת גלויה לכל מי שפותח את הדף, אז אסור שתהיה בה סיסמה או מפתח סודי.
  - בצד השרת בודקים ש-`form` שווה ל-`sayeret-join-2026` ושהגודל סביר (הסלפי מוקטן ל-512 פיקסלים, בערך עד 80KB).
  - מגבילים קצב שליחות.
  - בנתונים יש מידע רגיש (פציעה, התמודדות נפשית), אז רק אנשי התחום רואים אותו ב-CRM.

אפשרויות נפוצות: Supabase Edge Function שכותבת לטבלה; Google Apps Script (Web App) שכותב לגיליון; webhook של Make.

## השדות שנשלחים

| שדה | מה זה | דוגמה |
|---|---|---|
| form, version | מזהה הטופס | `sayeret-join-2026`, `1` |
| submitted_at | זמן השליחה (ISO) | `2026-11-09T21:32:07Z` |
| ref | קוד הנציג מהקישור | `team-2015-nov` |
| first_name, last_name, phone, email | פרטים | |
| region | אזור מגורים | `ירושלים` |
| connection | החיבור לסיירת | `פלחה״ן / פלגה ב׳`, `הורה ללוחם`, `משפחה שכולה`, `מתנדב/ת` |
| fallen_name, fallen_relation | רק למשפחה שכולה | |
| enlist_year, enlist_month | רק ללוחמים (5 הפלוגות) | `2015`, `נובמבר` |
| last_role, commander | תפקיד אחרון, שם המפק״צ (לא חובה) | |
| status | מערך: משוחרר/ת טרי/ה, שכיר/ה, עצמאי/ת, סטודנט/ית, מחפש/ת עבודה ראשונה | |
| study_institution, study_field, study_year, scholars_interest | רק לסטודנטים | |
| work_field, work_role, work_experience | רק לעובדים ולמחפשי עבודה | |
| interests | מערך: במה העמותה יכולה לעזור | `["מנטורינג אישי"]` |
| memorial_fallen, memorial_assign | חלל להישאר מחובר אליו / "הקצו לי" | |
| personal, knows, personal_contact | **רגיש.** נוגע אליי אישית / מכיר מישהו / איך ליצור קשר | |
| give, fundraising, volunteer_areas, offer | מה אני מביא לקהילה | |
| idea, platforms | רעיון / איפה אני פעיל | |
| selfie_jpeg | תמונה כ-data URL (JPEG), או ריק | |
| consent | אישור שמירה ויצירת קשר (תמיד true בשליחה) | `true` |
