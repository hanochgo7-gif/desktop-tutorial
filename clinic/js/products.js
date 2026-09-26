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
    image: "images/hz-night-serum.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "ברייט & פרוטקט דמי מייקאפ מינרלי SPF 50",
    en: "Bright & Protect Mineral SPF 50 Demi Make Up",
    desc: "מקדם הגנה מינרלי מפני השמש, זיהום אוויר וקרינת מסכים. מסייע במניעת הזדקנות מואצת, תומך בהבהרה ומכיל טינט בגוון אחיד וזוהר.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-bright-protect-spf50.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם אייג' פרוטקשן",
    en: "Age Protection Cream",
    desc: "תכשיר להעלאת רמת הלחות בעור ולשיקום המחסום העורי.",
    size: "60 מ״ל",
    price: null,
    image: "images/hz-age-protection.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם פרופסי לייט",
    en: "Prophecy Light Cream",
    desc: "קרם במרקם קליל בטכנולוגיית HZMT, מבוסס חומצה היאלורונית מצולבת, להעלאת רמת הלחות, הנפח וגמישות העור.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-prophecy-light.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "סרום פרוטקשן שילד",
    en: "Protection Shield Serum",
    desc: "סרום ג'ל נטול שומן לאיזון העור, המסייע במניעת הופעת קומדונים ושומנים תת-עוריים.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-protection-shield.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם דרמה פיל",
    en: "Derma Fill Cream",
    desc: "תכשיר טיפולי עשיר בפורמולה מבוססת טכנולוגיית מיקרוקפסולציה ושילוב סינרגטי של פפטידים, לשיפור מראה הגמישות, לעידוד יצירת קולגן עצמוני ולמראה עור מוצק יותר.",
    size: "60 מ״ל",
    price: null,
    image: "images/hz-derma-fill.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "סרום פרופסי",
    en: "Prophecy Serum",
    desc: "סרום לחות קליל, נספג במהירות, המעניק לעור זוהר מיידי ומראה קורן. ביוסטימולטור המעודד ייצור חומצה היאלורונית טבעית.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-prophecy-serum.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "מסכת פנים רימיקרונייזד",
    en: "Remicronized Mask",
    desc: "מסכה עשירה הנספגת בעור, בטכנולוגיית HZMT, מבוססת קולגן פברילי ממוזער, לתמיכה במיצוק והפחתת מראה קמטים וקמטוטים וללחות אינטנסיבית.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-remicronized-mask.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם עיניים רימיקרונייזד",
    en: "Remicronized Eye Cream",
    desc: "קרם עיניים חדשני מבוסס HZMT לטיפול עוצמתי המתמקד במיצוק ובשיפור מראה קמטוטים.",
    size: "30 מ״ל",
    price: null,
    image: "images/hz-remicronized-eye.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "ג'ל ניקוי מטהר",
    en: "Purifying Cleansing Gel",
    desc: "ג'ל ניקוי לטיהור, איזון והרגעת העור. מתאים במיוחד לעור עם נטייה לפצעונים.",
    size: "225 מ״ל",
    price: null,
    image: "images/hz-purifying-gel.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סבון אקטיב לעור בעייתי",
    en: "Active Gentle Soap",
    desc: "ג'ל ניקוי טיפולי לעור שמן, עבה ועם נקבוביות סתומות. מסדרת Acne Skin Platform.",
    size: "250 מ״ל",
    price: null,
    image: "images/racheli-active-soap.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סבון פנים לעור עדין",
    en: "Gentle Skin Soap",
    desc: "ג'ל ניקוי עדין לכל סוגי העור, מסדרת Preventec לסימני הזדקנות ראשונים.",
    size: "250 מ״ל",
    price: null,
    image: "images/racheli-gentle-soap.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "ג'ל ניקוי לחותי",
    en: "Moisturizing Cleansing Gel",
    desc: "ג'ל ניקוי לחותי, מנקה ומאזן את העור תוך תמיכה ושמירה על מחסום העור.",
    size: "225 מ״ל",
    price: null,
    image: "images/hz-moisturizing-gel.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סבון קצף עדין",
    en: "Foaming Cleanser",
    desc: "קצף ניקוי עדין לניקוי יסודי, הרגעת אדמומיות ולתחושת נוחות מיידית, במיוחד לעור יבש או רגיש.",
    size: "225 מ״ל",
    price: null,
    image: "images/hz-foaming-cleanser.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם לחות לעור שמן גרין לאב 23",
    en: "Moist Cream for Oily Skin",
    desc: "תכשיר לחות קליל, נספג במהירות, נטול שומן, מבוסס תמצית ירוקה עשירה בכלורופיל המכילה 23 ויטמינים ומינרלים.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-moist-oily.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "סילקי פילטר SPF50",
    en: "Silky Filter Clear SPF50",
    desc: "ג'ל הגנה שקוף בטכנולוגיית פריימר, המעניק מראה מט קטיפתי, הגנה רחבת טווח ובסיס לאיפור.",
    size: "80 מ״ל",
    price: null,
    image: "images/hz-silky-filter.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם פרופסי ריץ'",
    en: "Prophecy Rich Cream",
    desc: "קרם במרקם עשיר בטכנולוגיית HZMT, מבוסס חומצה היאלורונית מצולבת ממוזערת, לשיפור מיידי במצבי יובש, להעלאת רמת הלחות, הנפח ולשיפור גמישות העור.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-prophecy-rich.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם לחות לעור יבש גרין לאב 23",
    en: "Moist Cream for Dry Skin",
    desc: "תכשיר לחות במרקם עשיר, מבוסס תמצית ירוקה עשירה בכלורופיל המכילה 23 ויטמינים ומינרלים.",
    size: "50 מ״ל",
    price: null,
    image: "images/hz-moist-dry.jpg",
    tall: true
  },
  {
    brand: "חוה זינגבוים",
    name: "קרם אקסטרים לצוואר ולמחשוף",
    en: "Extreme Cream",
    desc: "קרם למיצוק עור הצוואר והמחשוף, להעלאת רמת הלחות ולטיפול ממוקד בסימני הזדקנות.",
    size: "60 מ״ל",
    price: null,
    image: "images/hz-extreme-cream.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "מסכת אקסטרה סי",
    en: "Extra C Mask",
    desc: "מסכה טיפולית עוצמתית להעלאת רמת הלחות, הגנה אנטי-אוקסידנטית ותמיכה בתהליכי הבהרה.",
    size: "60 מ״ל",
    price: null,
    image: "images/hz-extra-c-mask.jpg",
    tall: false
  },
  {
    brand: "חוה זינגבוים",
    name: "אקטיב טריטמנט לושן (מי פנים)",
    en: "Active Treatment Lotion",
    desc: "מי פנים טיפוליים אקטיביים לשימוש אחרי הניקוי, להכנת העור לקליטת התכשירים הבאים.",
    size: "50 מ״ל",
    price: null,
    image: "images/bebelle-treatment-lotion.jpg",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "סרום ליפטינג Cell Pro",
    en: "Cell Pro Lifting Serum",
    desc: "סרום ליפטינג ממותג KLAPP Skin Care Science, מסדרת Cell Pro. זוכה מקום ראשון Beauty Forum Stars Award 2024 בקטגוריית טיפוח העור.",
    size: "30 מ״ל",
    price: null,
    image: "images/klapp-cellpro-lifting.jpg",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "קרם פנים ליפטינג Cell Pro",
    en: "Cell Pro Lifting Face Cream",
    desc: "קרם פנים ממצק מסדרת Cell Pro Lifting של KLAPP, להשלמת הסרום.",
    size: "50 מ״ל",
    price: null,
    image: "images/klapp-cellpro-lifting.jpg",
    tall: false
  },
  {
    brand: "KLAPP",
    name: "קרם אנטי-אייג'ינג גלובלי Repagen Exclusive",
    en: "Repagen Exclusive Global Anti-Age Cream",
    desc: "קרם אנטי-אייג'ינג מקיף מסדרת Repagen Exclusive של KLAPP.",
    size: "30 מ״ל",
    price: null,
    image: "images/klapp-repagen.jpg",
    tall: false
  },
  {
    brand: "KLAPP",
    name: "קרם עיניים עשיר Repagen Exclusive",
    en: "Repagen Exclusive Rich Eye Care Cream",
    desc: "קרם עיניים עשיר מסדרת Repagen Exclusive של KLAPP.",
    size: "20 מ״ל",
    price: null,
    image: "images/klapp-repagen.jpg",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "פלואיד לחות לידיים Repagen Exclusive",
    en: "Repagen Exclusive Hand Moisture Fluid",
    desc: "פלואיד לחות לידיים מסדרת Repagen Exclusive של KLAPP.",
    size: "50 מ״ל",
    price: null,
    image: "images/klapp-repagen.jpg",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "פלואיד פנים Repagen Exclusive",
    en: "Repagen Exclusive Face Fluid",
    desc: "פלואיד פנים אנטי-אייג'ינג מסדרת Repagen Exclusive של KLAPP.",
    size: "50 מ״ל",
    price: null,
    image: "images/klapp-repagen.jpg",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "סרום רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Serum",
    desc: "סרום רטינול למיצוק עור יעיל ולאורך זמן, שיפור רמת הלחות, מראה עור חלק ואחיד וזוהר טבעי שנמשך כל היום. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "30 מ״ל",
    price: null,
    image: "images/klapp-retinol-serum.webp",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "קרם יום ולילה רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Day + Night Cream",
    desc: "קרם יום ולילה. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "50 מ״ל",
    price: null,
    image: "images/klapp-retinol-trio.jpg",
    tall: false
  },
  {
    brand: "KLAPP",
    name: "מסכת לילה רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Overnight Mask",
    desc: "מסכת לילה. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "50 מ״ל",
    price: null,
    image: "images/klapp-retinol-trio.jpg",
    tall: false
  },
  {
    brand: "KLAPP",
    name: "בוסטר רטינול Triple Action PRO AGE",
    en: "Retinol Multi Level Performance Booster",
    desc: "בוסטר חדש המעודד באופן פעיל את תהליך חידוש העור במהלך הלילה. התוצאה: עור מתוח ומראה צעיר בבוקר. סדרת Retinol Multi Level Performance של KLAPP, הדור הבא של הרטינול: מיצוק, הרמה, שיקום, הפחתת קמטים והבהרה. 100% טבעוני, מיוצר בגרמניה.",
    size: "30 מ״ל",
    price: null,
    image: "images/klapp-retinol-booster.jpg",
    tall: true
  },
  {
    brand: "KLAPP",
    name: "קרם צוואר ומחשוף Cell Pro Firming",
    en: "Cell Pro Firming Neck & Décolleté Cream",
    desc: "קרם ממצק לצוואר ולמחשוף מסדרת Cell Pro Firming של KLAPP Skin Care Science.",
    size: "50 מ״ל",
    price: null,
    image: "images/klapp-cellpro-neck.webp",
    tall: true
  },
  {
    brand: "Arkana",
    name: "פילינג לקטוביוני Sensi Peel",
    en: "Lactobionic Sensi Peel",
    desc: "פילינג עדין על בסיס חומצה לקטוביונית, מסדרת Neuro Sensi Therapy של Arkana, לעור רגיש.",
    size: "30 מ״ל",
    price: null,
    image: "images/arkana-sensi.png",
    tall: false
  },
  {
    brand: "Arkana",
    name: "מסכת Neuro Sensi",
    en: "Neuro Sensi Mask",
    desc: "מסכה מרגיעה מסדרת Neuro Sensi Therapy של Arkana, להרגעת עור רגיש ומגורה.",
    size: "",
    price: null,
    image: "images/arkana-sensi.png",
    tall: false
  },
  {
    brand: "Arkana",
    name: "מסכת Skin Tone Neuro",
    en: "Skin Tone Neuro Mask",
    desc: "מסכה מבהירה ומרגיעה מסדרת Skin Tone Neuro Therapy של Arkana, עם β-White וחומצה טרנקסמית, להפחתת כתמי פיגמנטציה.",
    size: "100 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "Arkana",
    name: "פילינג Skin Tone Neuro",
    en: "Skin Tone Neuro Peel",
    desc: "פילינג מבהיר מסדרת Skin Tone Neuro Therapy של Arkana, לטיפול בכתמי פיגמנטציה ולאיחוד גוון העור.",
    size: "30 מ״ל",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "Arkana",
    name: "קרם Skin Tone Neuro",
    en: "Skin Tone Neuro Cream",
    desc: "קרם מבהיר לשימוש יומי מסדרת Skin Tone Neuro Therapy של Arkana, להשלמת הטיפול בפיגמנטציה.",
    size: "",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "Arkana",
    name: "בוסטר PDRN Rederm",
    en: "PDRN Rederm Booster",
    desc: "בוסטר מסדרת Advanced Line של Arkana: PDRN Triple Fusion, תערובת 15 פפטידים וקומפלקס HA 16. עור מוצק וחלק, לחות עמוקה ומילוי.",
    size: "30 מ״ל",
    price: null,
    image: "images/arkana-pdrn.jpg",
    tall: true
  },
  {
    brand: "Arkana",
    name: "ערכת EXO + PRP Advanced Treat",
    en: "EXO + PRP Advanced Treat",
    desc: "ערכה טיפולית מסדרת Advanced Therapy של Arkana: סרום אקסוזומים, סרום PRP ו-EXO Power, לחידוש עור ואפקט אנטי-אייג'ינג. מתאימה לטיפולי אקסוזומים ומיקרונידלינג.",
    size: "",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "Arkana",
    name: "מסכת PRP",
    en: "PRP Mask",
    desc: "מסכת בד מסדרת PRP Therapy של Arkana, עם פלמיטויל טריפפטיד-5, קופר טריפפטיד-1 וחומצה היאלורונית. אפקט דמוי PRP: התחדשות והרגעה.",
    size: "יחידה, 28 גרם סרום",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "Arkana",
    name: "PRP Rejuvenator (שפופרת)",
    en: "PRP Rejuvenator",
    desc: "תכשיר מחדש מסדרת PRP Therapy של Arkana, עם WH-Peptide ו-GHK-Cu, לאפקט ליפטינג ועיצוב מחדש של העור.",
    size: "100 מ״ל",
    price: null,
    image: null,
    tall: true
  },
  {
    brand: "Arkana",
    name: "PRP Rejuvenator (צנצנת)",
    en: "PRP Rejuvenator Cream",
    desc: "קרם מחדש לשימוש ביתי מסדרת PRP Therapy של Arkana, להשלמת הטיפול בקליניקה.",
    size: "",
    price: null,
    image: null,
    tall: false
  },
  {
    brand: "SQT",
    name: "ערכת SQT Anti-Aging Rejuvenation",
    en: "SQT Anti-Aging Rejuvenation Set",
    desc: "ערכה טיפולית מלאה בארבעה שלבים: קרם ביו-מיקרונידלינג ממצק, תמצית התחדשות ממצקת, מסכת Firming Repair וקרם התחדשות. אנטי-אייג'ינג, החלקת קמטים, מיצוק והרמה, שיפור גמישות העור.",
    size: "ערכה",
    price: null,
    image: "images/sqt-antiaging-set.jpg",
    tall: false
  },
  {
    brand: "SQT",
    name: "ערכת SQT Resurfacing Repair",
    en: "SQT Resurfacing Repair Set",
    desc: "טיפול באקנה וחידוש מרקם העור. סופחת את הזיהום והורגת את חיידקי האקנה, מתאימה לטיפול בצלקות פוסט-אקנתיות חדשות ובסימני מתיחה בגוף. מחדשת ומשפרת את מרקם העור, סוגרת נקבוביות. לעור שמן ומעורב.",
    size: "ערכה",
    price: null,
    image: "images/sqt-resurfacing.jpg",
    tall: false
  },
  {
    brand: "SQT",
    name: "ערכת SQT Resurfacing Repair Set II",
    en: "SQT Resurfacing Repair Set II",
    desc: "ערכה לעור אקנה: תמצית Resurfacing Repair (4 בקבוקונים, 20 מ״ל), אבקת ביו-מיקרונידלינג (4 בקבוקונים), תמיסת ביו-מיקרונידלינג (4 בקבוקונים) ומסכות (4 יח'). לשיפור אקנה, הבהרת סימני אקנה ושיפור עור אקנתי.",
    size: "ערכה",
    price: null,
    image: "images/sqt-resurfacing.jpg",
    tall: false
  },
  {
    brand: "Dr. Spicule",
    name: "ערכת Firming Revitalizing",
    en: "Dr. Spicule Firming Revitalizing System",
    desc: "מיצוק, חידוש והבהרת העור: תיקון ושמירה על אלסטיות, חיזוק מחסום העור, עיבוי האפידרמיס, הפחתת קמטוטים ומניעת צניחה. מכילה אקטואין, קרנוזין, פיברונקטין, בטא-גלוקן, פנטנול וחמישה שמנים צמחיים. 4 טיפולים, לכל סוגי העור כולל רגיש.",
    size: "ערכה, 4 טיפולים",
    price: null,
    image: "images/drspicule-firming.jpg",
    tall: false
  },
  {
    brand: "Dr. Spicule",
    name: "ערכת Acne Solutions",
    en: "Dr. Spicule Acne Solutions System",
    desc: "פתרונות אקנה: העלמת אקנה ופצעונים, צמצום צלקות אקנה, טיפול בנקבוביות גדולות וויסות מאזן שומן ומים. מכילה חומצה סליצילית, ביסבולול, בטא-גלוקן, פיברונקטין, צרמיד ותערובת של 10 'מכסחי אקנה'. 4 טיפולים, לעור מעורב או שמנוני.",
    size: "ערכה, 4 טיפולים",
    price: null,
    image: "images/drspicule-acne.jpg",
    tall: false
  },
  {
    brand: "Dr. Spicule",
    name: "ערכת Pigmentation & Brightening",
    en: "Dr. Spicule Anti-Pigmentation & Brightening System",
    desc: "אנטי-פיגמנטציה והבהרה: שיפור מראה עור דהוי, הבהרת כתמים כהים, היפרפיגמנטציה ומלזמה, ואיחוד גוון העור. מכילה ניאצין, חומצה טרנקסמית, פוליפפטידים וחומצות נוספות ותוצרי התססה. 4 טיפולים, לעור מעורב, יבש ושמן.",
    size: "ערכה, 4 טיפולים",
    price: null,
    image: "images/drspicule-pigment.jpg",
    tall: false
  },
  {
    brand: "SQT",
    name: "ערכת SQT Anti-Aging לטיפול ביתי",
    en: "SQT Anti-Aging Homecare Set",
    desc: "מערכת אנטי-אייג'ינג בחמישה ממדים: מטריצת קולגן-פפטיד, רכיבי תסס ביולוגיים, הגנה נגד חמצון וגליקציה, ותיקון תאי העור והמחסום העורי. הרמה ומיצוק תוך שיפור האלסטיות, לגוון עור חלק, תפוח וצעיר יותר. כוללת קרם וסרום. לכל סוגי העור כולל רגיש.",
    size: "ערכה: קרם + סרום",
    price: null,
    image: "images/sqt-homecare-set.jpg",
    tall: false
  },
  {
    brand: "SQT",
    name: "ערכת SQT Revitalizing Beauty",
    en: "SQT Revitalizing Beauty Set",
    desc: "חידוש והבהרת העור: מקנה גוון אחיד, משפרת את מרקם העור, מטפלת במשקעי המלנין ובכתמי פיגמנטציה ומדכאת את ייצור המלנין. משפרת צלקות פוסט-אקנתיות ישנות. לכל סוגי העור.",
    size: "ערכה",
    price: null,
    image: "images/sqt-sets.jpg",
    tall: false
  },
  {
    brand: "SQT",
    name: "ערכת SQT Skin Booster (Hydrating)",
    en: "SQT Nourishing Hydrating Set",
    desc: "סקין בוסטר ללא הזרקה: מתקנת ומחזקת את המחסום האפידרמלי, מחדירה בוסט של לחות ונועלת אותו בעור, ומקנה נפח. מתאימה לשיקום לאחר פלזמה, מיקרונידלינג ופילינג, לכל סוגי העור.",
    size: "ערכה",
    price: null,
    image: "images/sqt-sets.jpg",
    tall: false
  }
];
