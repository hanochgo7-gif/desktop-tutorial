/*
 * נתוני דוגמה לאתר אלנביס.
 * כל מה שמסומן כאן "example: true" הומצא לצורך הדגמה ומוצג באתר עם תווית "דוגמה".
 * כשיהיו נתונים אמיתיים: מחליפים את הערכים ומשנים example ל-false.
 */
window.ALLENBIS_DEMO = {
  delivery: {
    etaMinutes: 20,            // מבעל האתר: עד 20 דקות
    hours: '24/7',             // מבעל האתר
    area: 'מרכז תל אביב',       // מבעל האתר
    feeMinor: 1500,            // דוגמה: 15 ₪
    freeFromMinor: 8000,       // דוגמה: משלוח חינם מ-80 ₪
    example: true
  },

  // הזמנות.
  // api: כתובת מערכת ההזמנות. באתר ב-Cloudflare עם מסד הנתונים מוגדר (ראו HANDOFF.md) כותבים '/api',
  //      וההזמנות מגיעות למסך החנות (admin.html) עם מעקב חי ללקוח.
  //      כל עוד הוא ריק ו-example: true, ההזמנות נשמרות רק בדפדפן הזה, כדי שאפשר יהיה לנסות את כל הדרך (הדגמה).
  //      ריק ו-example: false: ההזמנות נשלחות בוואטסאפ בלבד.
  // whatsapp: מספר הוואטסאפ של החנות בפורמט בינלאומי, בלי + ובלי 0 בהתחלה (למשל 972501234567).
  //      משמש לשליחה בוואטסאפ כשאין מערכת הזמנות, או כגיבוי אם היא לא זמינה. כל עוד הוא ריק, אפשר לבחור למי לשלוח.
  order: { api: '', whatsapp: '', example: true },

  // גלגל המזל: בהזמנה מעל הסכום שב-commerce-config.js (wheel.minimumOrderMinor) אפשר לסובב פעם אחת.
  // כל סיבוב זוכה, ולכל פרס אותו סיכוי. type: 'gift' = מוצר מתנה (product), 'off' = הנחה באגורות (minor).
  wheel: {
    example: true,
    prizes: [
      { label: 'שקית קרח מתנה', en: 'Free bag of ice', type: 'gift', product: 'p173' },
      { label: '5 ₪ הנחה', en: '₪5 off', type: 'off', minor: 500 },
      { label: 'קינדר בואנו מתנה', en: 'Free Kinder Bueno', type: 'gift', product: 'p67' },
      { label: 'טיק טק מתנה', en: 'Free Tic Tac', type: 'gift', product: 'p77' },
      { label: '10 ₪ הנחה', en: '₪10 off', type: 'off', minor: 1000 },
      { label: 'מים מתנה', en: 'Free water', type: 'gift', product: 'p18' }
    ]
  },

  // אזור המשלוחים: הרחובות שאליהם שולחים. כתובת ברחוב שלא ברשימה מקבלת אזהרה (ואפשר עדיין לשלוח).
  area: {
    example: true,
    streets: ['אלנבי', 'רוטשילד', 'דיזנגוף', 'בן יהודה', 'הירקון', 'שינקין', 'נחלת בנימין', 'המלך ג׳ורג׳', 'קינג ג׳ורג׳',
      'בוגרשוב', 'פרישמן', 'גורדון', 'טרומפלדור', 'אחד העם', 'מונטיפיורי', 'לילינבלום', 'יהודה הלוי', 'הרצל', 'מזא״ה',
      'ביאליק', 'שלום עליכם', 'טשרניחובסקי', 'בלפור', 'שדרות חן', 'שדרות בן ציון', 'מרמורק', 'קרליבך', 'יבנה', 'נחמני',
      'הכרמל', 'גאולה', 'זמנהוף', 'שלמה המלך', 'מאפו', 'הס', 'בצלאל יפה', 'ריינס', 'פינסקר', 'מלצ׳ט', 'שד״ל', 'המגיד', 'כרמיה']
  },

  // מבצעי כמות: קונים qty יחידות מתוך products (אפשר לערבב טעמים) ומשלמים price (באגורות) על כל קבוצה.
  // המבצע מופעל לבד בסל, על היחידות היקרות קודם. בלי מוצרי עישון ואלכוהול. sign = הטקסט הקצר בשלט שעל המדף.
  multibuy: {
    example: true,
    items: [
      { id: 'bissli3', sign: '3 ב-20 ₪', signEn: '3 for ₪20', label: '3 ביסלי ב-20 ₪', en: '3 Bissli for ₪20', qty: 3, price: 2000, products: ['p44', 'p45', 'p46', 'p47', 'p48'] },
      { id: 'doritos2', sign: '2 ב-13 ₪', signEn: '2 for ₪13', label: '2 דוריטוס ב-13 ₪', en: '2 Doritos for ₪13', qty: 2, price: 1300, products: ['p49', 'p50', 'p51'] },
      { id: 'bigcola2', sign: '2 ב-24 ₪', signEn: '2 for ₪24', label: '2 בקבוקי 1.5 ליטר ב-24 ₪', en: '2 big bottles for ₪24', qty: 2, price: 2400, products: ['p3', 'p4', 'p8'] },
      { id: 'energy3', sign: '3 ב-18 ₪', signEn: '3 for ₪18', label: '3 משקאות אנרגיה ב-18 ₪', en: '3 energy drinks for ₪18', qty: 3, price: 1800, products: ['p24', 'p25', 'p26'] },
      { id: 'bars4', sign: '4 ב-25 ₪', signEn: '4 for ₪25', label: '4 חטיפי שוקולד ב-25 ₪', en: '4 chocolate bars for ₪25', qty: 4, price: 2500, products: ['p63', 'p65', 'p66', 'p69', 'p70', 'p71', 'p72'] },
      { id: 'magnum2', sign: '2 ב-25 ₪', signEn: '2 for ₪25', label: '2 מגנום ב-25 ₪', en: '2 Magnums for ₪25', qty: 2, price: 2500, products: ['p89', 'p90', 'p91', 'p179'] }
    ]
  },

  // הכי נמכרים (דוגמה)
  bestsellers: { example: true, ids: ['p1', 'p42', 'p27', 'p89', 'p44', 'p67', 'p3', 'p79', 'p54', 'p38', 'p17', 'p128'] },

  // מחירי מבצע (דוגמה). המחיר הרגיל נלקח מהקטלוג.
  deals: {
    example: true,
    items: { p89: 1190, p29: 990, p75: 1290, p111: 2290, p3: 1190, p128: 10990, p63: 590, p81: 990 }
  },

  // מוצרים שאזלו (דוגמה)
  outOfStock: { example: true, ids: ['p31', 'p95'] },

  // חבילות מוכנות (דוגמה). בלי מוצרי עישון – אסור לשלב אותם בחבילות או במבצעים.
  bundles: {
    example: true,
    items: [
      { id: 'movie', img: 'images/art/bundle-movie.webp', title: 'ערב סרט', text: 'במבה, ביסלי, קולה גדולה ו-M&M\'s', items: [['p42', 1], ['p44', 1], ['p3', 1], ['p73', 1]] },
      { id: 'party', img: 'images/art/bundle-party.webp', title: 'חברים מגיעים', text: 'שתייה, קרח, חטיפים ופיצוחים לכולם', items: [['p3', 2], ['p173', 1], ['p49', 2], ['p54', 1], ['p111', 1]] },
      { id: 'night', img: 'images/art/bundle-night.webp', title: 'לילה לבן', text: 'אנרגיה ומתוק ללילה ארוך', items: [['p27', 2], ['p38', 1], ['p62', 1], ['p79', 1]] },
      { id: 'battery', img: 'images/art/bundle-battery.webp', title: 'הסוללה נגמרה', text: 'מטען נייד וכבל USB-C', items: [['p128', 1], ['p118', 1]] }
    ]
  },

  popularSearches: ['במבה', 'קולה', 'רד בול', 'גלידה', 'מטען', 'קרח', 'ביסלי'],

  // מילים נרדפות לחיפוש: מה שהגולש מקליד ← מה שכתוב בשם המוצר
  synonyms: {
    'coke': ['קולה'], 'cola': ['קולה'], 'קוקה': ['קולה'], 'pepsi': ['פפסי'], 'sprite': ['ספרייט'], 'fanta': ['פאנטה'],
    'bamba': ['במבה'], 'bissli': ['ביסלי'], 'doritos': ['דוריטוס'], 'רד': ['red'], 'בול': ['bull'], 'רדבול': ['red bull'],
    'מונסטר': ['monster'], 'מגנום': ['magnum'], 'קינדר': ['kinder'], 'אוראו': ['oreo'], 'טוויקס': ['twix'], 'סניקרס': ['snickers'],
    'מרס': ['mars'], 'סקיטלס': ['skittles'], 'מנטוס': ['mentos'], 'טיקטק': ['tic tac'], 'צטוס': ['צ׳יטוס', 'cheetos'],
    'מים': ['מי ', 'נביעות', 'סן בנדטו'], 'אנרגיה': ['red bull', 'monster', 'xl', 'blu'], 'שוקולד': ['שוקולד', 'שוקו'],
    'סוללה': ['power bank'], 'פאוורבנק': ['power bank'], 'מטען': ['מטען', 'power bank'], 'כבל': ['כבל'], 'אייפון': ['lightning'],
    'וודקה': ['פינלנדיה', 'רוסקי', 'סמירנוף', 'גרייגוס'], 'וויסקי': ['לייבל', 'j&b', 'וויסקי']
  },

  // איורים (אופציונלי). מוסיפים נתיב לקובץ וזה מופיע באתר. לחבילות: מוסיפים img לכל חבילה.
  art: {
    emptyCart: 'images/art/empty-cart.webp',
    courier: 'images/art/courier.webp'
  },

  // תמונות לאריחי הקטגוריות: נתיב לקובץ, או מזהה מוצר (למשל 'p188') כדי להשתמש בתמונת המוצר.
  categoryArt: {
    'שתייה': 'images/art/cat-drinks.webp', 'חטיפים': 'images/art/cat-snacks.webp',
    'ממתקים': 'images/art/cat-candy.webp', 'עוגיות': 'images/art/cat-cookies.webp',
    'גלידות': 'images/art/cat-icecream.webp', 'מזון': 'images/art/cat-food.webp',
    'אביזרי סלולר': 'images/art/cat-phone.webp', 'אחר': 'images/art/cat-other.webp'
  }
};
