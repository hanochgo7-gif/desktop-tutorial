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

  // הזמנות בוואטסאפ: מספר הוואטסאפ של החנות בפורמט בינלאומי, בלי + ובלי 0 בהתחלה (למשל 972501234567).
  // כל עוד המספר ריק, ההודעה נפתחת בוואטסאפ ואפשר לבחור למי לשלוח אותה (טוב לבדיקה).
  order: { whatsapp: '', example: true },

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
