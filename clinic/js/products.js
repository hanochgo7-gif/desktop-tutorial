// רשימת המוצרים בחנות. להוספת מוצר: מוסיפים אובייקט לרשימה.
// price: מספר בשקלים, או null כשעדיין אין מחיר (יוצג "מחיר בוואטסאפ").
// image: נתיב לתמונה, או null כשעדיין אין תמונה.
window.PRODUCTS = [
  {
    brand: "SQT",
    name: "SQT ביו-מיקרונידלינג, אבקה",
    desc: "מחטים ננו-ביולוגיות לחידוש האפידרמיס. לשימוש בקליניקה.",
    size: "",
    price: null,
    image: "images/sqt-vials.webp",
    tall: false
  },
  {
    brand: "SQT",
    name: "SQT Refine Spicule Serum",
    desc: "סרום ספיקולים לשימוש ביתי בין הטיפולים, ערכה עם ארבעה מילויים.",
    size: "",
    price: null,
    image: "images/sqt-serum-box.webp",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "מסכת זהב מחממת",
    en: "Gold Heating Mask",
    desc: "מסכה טיפולית מתחממת, מבוססת על המינרל זאוליט, למראה זוהר ובריא ולהעלאת רמת הלחות באופן מיידי.",
    size: "100 מ״ל",
    price: null,
    image: "images/hz-gold-heating-mask.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "סרום לילה",
    en: "Night Serum for Anti-Aging",
    desc: "סרום לילה טיפולי לעידוד תהליכי חידוש, שיקום, תיקון וריפוי העור.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "ברייט & פרוטקט דמי מייקאפ מינרלי SPF 50",
    en: "Bright & Protect Mineral SPF 50 Demi Make Up",
    desc: "מקדם הגנה מינרלי מפני השמש, זיהום אוויר וקרינת מסכים. מסייע במניעת הזדקנות מואצת, תומך בהבהרה ומכיל טינט בגוון אחיד וזוהר.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם אייג' פרוטקשן",
    en: "Age Protection Cream",
    desc: "תכשיר להעלאת רמת הלחות בעור ולשיקום המחסום העורי.",
    size: "60 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם פרופסי לייט",
    en: "Prophecy Light Cream",
    desc: "קרם במרקם קליל בטכנולוגיית HZMT, מבוסס חומצה היאלורונית מצולבת, להעלאת רמת הלחות, הנפח וגמישות העור.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "סרום פרוטקשן שילד",
    en: "Protection Shield Serum",
    desc: "סרום ג'ל נטול שומן לאיזון העור, המסייע במניעת הופעת קומדונים ושומנים תת-עוריים.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם דרמה פיל",
    en: "Derma Fill Cream",
    desc: "תכשיר טיפולי עשיר בפורמולה מבוססת טכנולוגיית מיקרוקפסולציה ושילוב סינרגטי של פפטידים, לשיפור מראה הגמישות, לעידוד יצירת קולגן עצמוני ולמראה עור מוצק יותר.",
    size: "60 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "סרום פרופסי",
    en: "Prophecy Serum",
    desc: "סרום לחות קליל, נספג במהירות, המעניק לעור זוהר מיידי ומראה קורן. ביוסטימולטור המעודד ייצור חומצה היאלורונית טבעית.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "מסכת פנים רימיקרונייזד",
    en: "Remicronized Mask",
    desc: "מסכה עשירה הנספגת בעור, בטכנולוגיית HZMT, מבוססת קולגן פברילי ממוזער, לתמיכה במיצוק והפחתת מראה קמטים וקמטוטים וללחות אינטנסיבית.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם עיניים רימיקרונייזד",
    en: "Remicronized Eye Cream",
    desc: "קרם עיניים חדשני מבוסס HZMT לטיפול עוצמתי המתמקד במיצוק ובשיפור מראה קמטוטים.",
    size: "30 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "ג'ל ניקוי מטהר",
    en: "Purifying Cleansing Gel",
    desc: "ג'ל ניקוי לטיהור, איזון והרגעת העור. מתאים במיוחד לעור עם נטייה לפצעונים.",
    size: "225 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סבון אקטיב לעור בעייתי",
    en: "Active Gentle Soap",
    desc: "ג'ל ניקוי טיפולי לעור שמן, עבה ועם נקבוביות סתומות. מסדרת Acne Skin Platform.",
    size: "250 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סבון פנים לעור עדין",
    en: "Gentle Skin Soap",
    desc: "ג'ל ניקוי עדין לכל סוגי העור, מסדרת Preventec לסימני הזדקנות ראשונים.",
    size: "250 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "ג'ל ניקוי לחותי",
    en: "Moisturizing Cleansing Gel",
    desc: "ג'ל ניקוי לחותי, מנקה ומאזן את העור תוך תמיכה ושמירה על מחסום העור.",
    size: "225 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סבון קצף עדין",
    en: "Foaming Cleanser",
    desc: "קצף ניקוי עדין לניקוי יסודי, הרגעת אדמומיות ולתחושת נוחות מיידית, במיוחד לעור יבש או רגיש.",
    size: "225 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם לחות לעור שמן גרין לאב 23",
    en: "Moist Cream for Oily Skin",
    desc: "תכשיר לחות קליל, נספג במהירות, נטול שומן, מבוסס תמצית ירוקה עשירה בכלורופיל המכילה 23 ויטמינים ומינרלים.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סילקי פילטר SPF50",
    en: "Silky Filter Clear SPF50",
    desc: "ג'ל הגנה שקוף בטכנולוגיית פריימר, המעניק מראה מט קטיפתי, הגנה רחבת טווח ובסיס לאיפור.",
    size: "80 מ״ל",
    price: null,
    image: null,
    tall: true
  }
];
