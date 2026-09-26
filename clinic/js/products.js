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
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם פרופסי ריץ'",
    en: "Prophecy Rich Cream",
    desc: "קרם במרקם עשיר בטכנולוגיית HZMT, מבוסס חומצה היאלורונית מצולבת ממוזערת, לשיפור מיידי במצבי יובש, להעלאת רמת הלחות, הנפח ולשיפור גמישות העור.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם לחות לעור יבש גרין לאב 23",
    en: "Moist Cream for Dry Skin",
    desc: "תכשיר לחות במרקם עשיר, מבוסס תמצית ירוקה עשירה בכלורופיל המכילה 23 ויטמינים ומינרלים.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם אקסטרים לצוואר ולמחשוף",
    en: "Extreme Cream",
    desc: "קרם למיצוק עור הצוואר והמחשוף, להעלאת רמת הלחות ולטיפול ממוקד בסימני הזדקנות.",
    size: "60 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "מסכת אקסטרה סי",
    en: "Extra C Mask",
    desc: "מסכה טיפולית עוצמתית להעלאת רמת הלחות, הגנה אנטי-אוקסידנטית ותמיכה בתהליכי הבהרה.",
    size: "60 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "אקטיב טריטמנט לושן (מי פנים)",
    en: "Active Treatment Lotion",
    desc: "מי פנים טיפוליים אקטיביים לשימוש אחרי הניקוי, להכנת העור לקליטת התכשירים הבאים.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "KLAPP",
    name: "סרום ליפטינג Cell Pro",
    en: "Cell Pro Lifting Serum",
    desc: "סרום ליפטינג ממותג KLAPP Skin Care Science, מסדרת Cell Pro. זוכה מקום ראשון Beauty Forum Stars Award 2024 בקטגוריית טיפוח העור.",
    size: "30 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "KLAPP",
    name: "קרם פנים ליפטינג Cell Pro",
    en: "Cell Pro Lifting Face Cream",
    desc: "קרם פנים ממצק מסדרת Cell Pro Lifting של KLAPP, להשלמת הסרום.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "KLAPP",
    name: "קרם אנטי-אייג'ינג גלובלי Repagen Exclusive",
    en: "Repagen Exclusive Global Anti-Age Cream",
    desc: "קרם אנטי-אייג'ינג מקיף מסדרת Repagen Exclusive של KLAPP.",
    size: "30 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "KLAPP",
    name: "קרם עיניים עשיר Repagen Exclusive",
    en: "Repagen Exclusive Rich Eye Care Cream",
    desc: "קרם עיניים עשיר מסדרת Repagen Exclusive של KLAPP.",
    size: "20 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "KLAPP",
    name: "פלואיד לחות לידיים Repagen Exclusive",
    en: "Repagen Exclusive Hand Moisture Fluid",
    desc: "פלואיד לחות לידיים מסדרת Repagen Exclusive של KLAPP.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "KLAPP",
    name: "פלואיד פנים Repagen Exclusive",
    en: "Repagen Exclusive Face Fluid",
    desc: "פלואיד פנים אנטי-אייג'ינג מסדרת Repagen Exclusive של KLAPP.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "KLAPP",
    name: "סרום רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Serum",
    desc: "סרום רטינול. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "30 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "KLAPP",
    name: "קרם יום ולילה רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Day + Night Cream",
    desc: "קרם יום ולילה. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "KLAPP",
    name: "מסכת לילה רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Overnight Mask",
    desc: "מסכת לילה. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "50 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "KLAPP",
    name: "בוסטר רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Booster",
    desc: "בוסטר חדש המעודד באופן פעיל את תהליך חידוש העור במהלך הלילה. התוצאה: עור מתוח ומראה צעיר בבוקר. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "30 מ״ל",
    price: null,
    image: null,
    tall: true
  }
];
