// הגדרות כלליות של האתר. אחרי שינוי מריצים: node sota/tools/build.mjs
// שדות ריקים לא מוצגים באתר (למשל כפתור וואטסאפ מופיע רק כשיש מספר).
// פרטי הקשר אפשר לעדכן גם מממשק הניהול (/admin), והם גוברים על מה שכתוב כאן.
export default {
  // הכתובת הסופית של האתר, בלי / בסוף. משמשת ל-canonical, hreflang, sitemap ו-Open Graph.
  siteUrl: "https://hanochgo7-gif.github.io/desktop-tutorial/sota", // זמני, עד שיהיה דומיין ל-SOTA

  // פרטי קשר
  phone: "",            // TODO: לתצוגה, למשל "050-123-4567"
  whatsapp: "",         // TODO: בפורמט בינלאומי בלי + ובלי 0 מוביל, למשל "972501234567"
  email: "",            // TODO: למשל "hello@sota.co.il"
  bookingUrl: "",       // קישור לתיאום שיחה ביומן (Google Calendar Appointment / Cal.com / Calendly). ריק = הכפתור מוביל לטופס.
  linkedin: "",
  facebook: "",

  // השרת (Cloudflare Worker). ריק = אותו דומיין כמו האתר (/api/...), וזה המצב המומלץ.
  apiBase: "",

  // מדידה. ריק = כבוי. כשאחד מהם מוגדר מוצג באנר הסכמה לעוגיות.
  gtmId: "",            // GTM-XXXXXXX
  ga4Id: "",            // G-XXXXXXXXXX (רק אם לא משתמשים ב-GTM)

  // Cloudflare Turnstile (הגנה מבוטים בלי "בחר את כל הרמזורים"). ריק = כבוי, ויש עדיין מלכודת דבש והגבלת קצב.
  turnstileSiteKey: "",

  founded: null,        // שנת הקמה, אם רוצים להציג בנתונים המובנים
  yearsExperience: 25,
};
