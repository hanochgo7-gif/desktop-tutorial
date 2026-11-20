/*
 * הגדרות העסק — כאן משנים מחיר, טלפון, משלוחים, תשלום ומדידה.
 * כל ערך שמסומן TODO ממתין לאישור של רויטל (ראו LAUNCH.md).
 */
window.OUOU_CONFIG = {
  product: {
    id: 'ou-ou-classic',
    name: 'או או | מה אתה יותר?',
    price: 140, // ₪, סופי (עוסק פטור — ללא מע"מ)
    maxPerOrder: 50
  },

  // מספר וואטסאפ בפורמט בינלאומי, בלי + ובלי 0 מוביל. מקור: הפלייר.
  whatsapp: '972507281161', // TODO: לאשר שזה המספר לאתר
  phoneDisplay: '050-7281161',
  email: null, // TODO: מייל לעסק (מוצג רק כשמוגדר)
  instagram: 'https://www.instagram.com/revitalin/', // TODO: לאשר שזה החשבון לקידום המשחק

  // קישור לדף תשלום של ספק הסליקה (Grow / PayPlus / מורנינג).
  // null = ההזמנה נשלחת בוואטסאפ ורויטל חוזרת לאישור ותשלום.
  // אפשר להשתמש ב-{total} וב-{order} בתוך הקישור אם הספק תומך בפרמטרים.
  paymentUrl: null, // TODO

  // מחיר null = "יעודכן באישור ההזמנה". להחליף אחרי הצעות מחיר מספקי המשלוח.
  shipping: [
    { id: 'pickup', label: 'נקודת איסוף / לוקר', price: null, needsAddress: false },
    { id: 'post', label: 'דואר ישראל', price: null, needsAddress: true },
    { id: 'courier', label: 'שליח עד הבית', price: null, needsAddress: true }
  ],
  freeShippingFrom: null, // TODO: למשל 280 (שני משחקים). null = לא מוצג

  // מדידה ופרסום — נטענים רק אחרי הסכמת הגולש. null = כבוי (ואין באנר עוגיות).
  analytics: {
    ga4: null,          // 'G-XXXXXXX'
    metaPixel: null,    // '1234567890'
    tiktokPixel: null   // 'CXXXXXXX'
  }
};
