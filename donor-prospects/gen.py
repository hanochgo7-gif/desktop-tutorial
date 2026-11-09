# Builds Sayeret_Nahal_Global_Donor_Prospects.xlsx (Hebrew, RTL).
# Public, sourced information only. Organizational contact routes only.
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

V = "נבדק ואומת"
M = "האתר חוסם בדיקה אוטומטית: לפתוח ידנית"
R = "מקור מהמחקר, לא נבדק שנית"

# (score, name, type, country, segment, evidence, urls, affinity, capacity, route, currency, why, status, risk)
P = [
 (92, "Samis Foundation", "קרן משפחתית", "ארה\"ב (סיאטל)", "קרנות",
  "מענקים לשנת 2026 (אושרו ביולי 2025): בשביל המחר, ריטריטים של 3 ימים לחיילים ולמילואימניקים: $50K; סולמות, אלמנות צה\"ל: $120K; תוכנית מילואימניקים של עוגן: $120K; 7+ מעגלי תקווה, טיפול לבנות זוג של מילואימניקים: $100K",
  "https://samisfoundation.org/?p=7693\nhttps://samisfoundation.org/faq/",
  "כן. מממנת כמעט אותו מודל: ריטריט קבוצתי ללוחמים, ומשפחות הנופלים", "$50K–$120K למענק",
  "לפי הזמנה, אבל לפי ה-FAQ שלה מכתב פנייה של עמוד אחד (LOI) \"לא נדחה\". שולחים לכתובת הייעודית למענקים שמופיעה ב-FAQ. דורשת 501(c)(3), כלומר המענק עובר לישות האמריקאית של Jgive",
  "USD", "הכי קרוב למה שאנחנו עושים, ויש דלת פתוחה לפנייה", V, ""),
 (91, "ICEJ – International Christian Embassy Jerusalem", "ארגון נוצרי", "ישראל (סניפים בעולם, כולל בריטניה)", "נוצרים / אוונגליסטים",
  "2024: מימון הקמה לבית Balancing Home במגדל העמק, להחלמה מפוסט-טראומה של לוחמים, משוחררים וניצולי נובה. 2022: שני מקלטים במרכז שיקום לפוסט-טראומה באשכול, שמשרת כ-100 משוחררי צה\"ל",
  "https://www.icej.org/blog/icej-funds-new-trauma-recovery-home-for-israelis-in-galilee/\nhttps://www.icej.org/blog/icej-shelters-those-whose-motto-is-to-never-leave-one-behind/\nhttps://www.icej.org/frontlines-trauma-response/",
  "כן. כבר מממנים טיפול בפוסט-טראומה של לוחמים משוחררים", "לא פורסם",
  "מחלקת הסיוע של ICEJ בירושלים, קרן Israel in Crisis (דרך icej.org). לתרומה בליש\"ט: ICEJ UK",
  "USD / GBP", "ההתאמה הנושאית הכי מדויקת בקבוצה הנוצרית", V, ""),
 (91, "IFCJ – International Fellowship of Christians and Jews (יעל אקשטיין)", "קרן (תורמים נוצרים)", "ארה\"ב / ישראל", "נוצרים / אוונגליסטים; לוחמים ופצועים",
  "2016: $8.5M לצה\"ל עבור חיילים בודדים וחיילים ממשפחות במצוקה. 2024: כ-2 מיליון ₪ לפצועי צה\"ל, יחד עם ארגון נכי צה\"ל. 2025: מענקים למרכז הפוסט-טראומה של בית הלוחם באשדוד. 2018: $5M ל-FIDF",
  "https://www.jns.org/ifcj-launches-two-programs-to-support-wounded-idf-soldiers/\nhttps://www.algemeiner.com/2016/03/15/christian-jewish-aid-group-donates-8-5-million-to-idf/\nhttps://www.ifcj.org/news/fellowship-blog/soldiers-home-and-jaffa-institute",
  "כן. פצועים, חיילים בודדים, פוסט-טראומה", "גבוהה מאוד (מענקים של מיליונים)",
  "משרד IFCJ בירושלים, צוות השותפויות והמענקים (דרך ifcj.org)",
  "ILS / USD", "ערוץ המימון הנוצרי הגדול ביותר לרווחת חיילים, ונותן גם לשותפים קטנים", V, "קישור ifcj.org חוסם בדיקה אוטומטית"),
 (90, "Steven A. Cohen / Cohen Veterans Network", "אדם פרטי וארגון", "ארה\"ב", "לוחמים ופוסט-טראומה",
  "דצמבר 2025: נפתחה מרפאת Steven A. Cohen בשיבא מודיעין, למשוחררים ולמילואימניקים אחרי 7.10 ולמשפחותיהם. המימון העיקרי: FIDF ו-Steve Cohen. 2016: התחייב ל-$275M להקמת CVN, טיפול נפשי לוותיקים בארה\"ב",
  "https://www.cohenveteransnetwork.org/wp-content/uploads/2025/12/2025-CVN-Israel-Clinic-Press-Release_CVN_FIDF_UJA_FINAL.pdf\nhttps://www.businessinsider.in/billionaire-hedge-fund-manager-steve-cohen-just-pledged-275-million-to-offer-military-vets-free-mental-healthcare/articleshow/51729991.cms",
  "כן. מממן טיפול בפוסט-טראומה לחיילי צה\"ל", "גבוהה מאוד",
  "הנהלת CVN (המנכ\"ל ד\"ר Anthony Hassan), או קרן Steven & Alexandra Cohen. כדאי דרך שיבא או FIDF",
  "USD", "המסע הצוותי משלים את הטיפול הקליני שהוא כבר מממן", V, "פנייה דרך היכרות אישית בלבד"),
 (88, "HESEG Foundation – Gerry Schwartz & Heather Reisman", "קרן", "קנדה", "לוחמים משוחררים",
  "קרן חסג נוסדה ב-2005. היא מממנת לימודים ומחיה לחיילים בודדים משוחררים: יותר מ-1,500 מלגאים, כ-70 מלגות חדשות בשנה. מקיימת טקסי זיכרון לחיילים בודדים שנפלו",
  "https://www.weizmann.ac.il/WeizmannCompass/sections/people-behind-the-science/phd-honoris-causa-recipient-gerald-w-schwartz\nhttps://en.wikipedia.org/wiki/HESEG_Foundation",
  "כן. כל הקרן מוקדשת ללוחמים אחרי השירות", "גבוהה (מייסד Onex)",
  "משרד קרן חסג בישראל",
  "USD (אין CAD ב-Jgive)", "המממן הכי קרוב למודל שלנו: לוחמים קרביים אחרי השחרור", V, "קבלה קנדית לא אפשרית. לבדוק תרומה דרך ישות אמריקאית"),
 (88, "Charles Wolfson Charitable Trust / Andrew Wolfson", "קרן משפחתית ואדם פרטי", "בריטניה (charity 238043)", "לוחמים ופוסט-טראומה",
  "לפי הדוחות הכספיים של הקרן: £200K לבית הלוחם UK בשנה עד אפריל 2024, ו-£110K בשנה עד אפריל 2025. אנדרו וולפסון יו\"ר בית הלוחם UK מאז 2017/18. כובד ביוני 2026 בערב שגייס יותר מ-£2M לשבע מרפאות פוסט-טראומה",
  "https://opencharities.uk/ew/238043/files/2025-04-05-accounts.md\nhttps://www.jewishnews.co.uk/philanthropist-made-uk-chair-for-charity-helping-wounded-idf-soldiers/\nhttps://www.jewishnews.co.uk/record-2m-raised-to-ease-israels-spiralling-ptsd-crisis/amp/",
  "כן. נכי צה\"ל ופוסט-טראומה", "כ-£6M בשנה",
  "מכתב למשרד הקרן (הכתובת ברשם הצדקה הבריטי). הקרן נותנת לארגונים רשומים בבריטניה, אז עדיף דרך ערוץ הליש\"ט של Jgive",
  "GBP", "המוביל הבריטי בתחום, וזה הכיסוי היחיד ללירה שטרלינג", V, "לוודא ש-Jgive UK רשום כ-charity בבריטניה"),
 (88, "John Hagee Ministries / Night to Honor Israel", "ארגון אוונגליסטי", "ארה\"ב", "נוצרים / אוונגליסטים",
  "2024: $3.1M חולקו בערב Night to Honor Israel. בין המקבלים: Friends of the IDF, \"Battalion 66\", Brothers for Life ו-Koby Mandell Foundation. 2013: $50K ל-FIDF לרווחת חיילים. לדבריהם, יותר מ-$130M עד היום",
  "https://prnewswire.com/news-releases/hagee-ministries-holds-44th-night-to-honor-israel-302296742.html\nhttps://mycharisma.com/news/john-hagee-ministries-donates-50k-to-friends-of-the-israel-defense-forces-2/",
  "כן. כבר נתנו לגוף שנושא שם של גדוד בצה\"ל", "כ-$3M בשנה, מחולקים לכ-25 מקבלים",
  "תהליך המענקים השנתי של Night to Honor Israel (דרך jhm.org)",
  "USD", "מחזור מענקים קבוע בכל שנה", V, "לא ברור מההודעה מיהו \"Battalion 66\""),
 (85, "Harry & Jeanette Weinberg Foundation", "קרן פרטית", "ארה\"ב", "קרנות",
  "אוקטובר 2023: $100K לנט\"ל לטיפול בטראומה. 2024: $118K ב-2 מענקים ל-Brothers for Life (פצועי צה\"ל)",
  "https://hjweinbergfoundation.org/news/foundation-grants-1-4-million-in-first-round-of-funding-to-support-communities-in-israel\nhttps://grantable.co/nonprofits/brothers-for-life-morg_9c29338303644d2eaba3ca3d959414e5\nhttps://hjweinbergfoundation.org/grants/how-to-apply/",
  "חלקית עד כן. טראומה ופצועים", "$50K–$250K בישראל",
  "מקבלת LOI כל השנה דרך פורטל באתר. כדאי לדבר קודם עם צוות התוכניות",
  "USD", "קרן גדולה עם מסלול פנייה פתוח", V, "את הסכומים מ-Grantable לאמת מול ProPublica"),
 (84, "Dr. Miriam Adelson", "אדם פרטי / קרן משפחתית", "ארה\"ב / ישראל", "לוחמים ופצועים",
  "2018: $10M ל-FIDF. 2018: 100 קלנועיות לנכי צה\"ל. יולי 2024: $3M לאיחוד הצלה, לזכר הנופלים",
  "https://www.jns.org/miriam-adelson-donates-emergency-fleet-in-honor-of-fallen-soldiers-medical-volunteers/\nhttps://www.israelhayom.com/2018/05/22/adelsons-donate-100-mobility-scooters-to-disabled-%E2%80%8Eidf-veterans-%E2%80%8E\nhttps://www.jns.org/news/friends-of-the-idf-raise-record-60m-for-israeli-soldiers-at-la-gala",
  "כן. נכים ונופלים", "גבוהה מאוד",
  "Adelson Family Foundation",
  "USD / ILS", "נותנת שוב ושוב לנכי צה\"ל ולזכר הנופלים", V, "פנייה דרך היכרות אישית בלבד"),
 (83, "Russell Berrie Foundation", "קרן משפחתית (בסגירה הדרגתית)", "ארה\"ב (ניו ג'רזי)", "קרנות",
  "אוקטובר–דצמבר 2023: American Friends of NATAL $50K; קואליציית הטראומה $100K; המניות (מרכזים לילדים שכולים) $100K; ישר לחייל $35K. 2024: Brothers for Life $10K",
  "https://russellberriefoundation.org/israel-emergency-grants",
  "כן. טראומה, שכול ולוחמים", "$25K–$200K",
  "לפי הזמנה בלבד. צריך היכרות",
  "USD", "מממנת בבת אחת טראומה, שכול ולוחמים", V, "הקרן נסגרת בהדרגה, אז החלון מוגבל"),
 (82, "Azrieli Foundation (ישראל)", "קרן משפחתית", "ישראל / קנדה", "קרנות",
  "40 מיליון ₪ במענקי חירום אחרי אוקטובר 2023. בין המקבלים: ארגון אלמנות ויתומי צה\"ל, האגודה למען החייל, ותמיכה נפשית",
  "https://en.ssi.azrielifoundation.org.il/?p=162\nhttps://www.azrielifoundation.org.il/Article-14-Azrieli-Foundation.aspx",
  "חלקית עד כן", "גבוהה",
  "רוב המענקים ביוזמת הקרן, אבל היא \"שוקלת הצעות מעמותות בישראל\" בתחומים שלה",
  "ILS (ישירות לעמותה)", "קרן ישראלית שאפשר לפנות אליה ישירות, בלי ישות אמריקאית", V, ""),
 (82, "Marc & Claire Perlman", "אדם פרטי", "ארה\"ב", "לוחמים (FIDF)",
  "2019: התחייבות של $1M ואתגר תרומה תואמת, ועוד 10 מלגות IMPACT! בשווי $160K. 2018: התחייבות של $1.6M. 2020: תרומה תואמת בגאלה הווירטואלית",
  "https://jewishlink.news/nj-delegation-helps-raise-record-37m-for-fidf/\nhttps://www.jns.org/a-night-of-heroes-celebrating-israel-and-the-idf-at-70/",
  "כן", "תרם יותר מ-$1M כמה פעמים",
  "הנהלת FIDF הארצית",
  "USD", "אוהב אתגרי תרומה תואמת, וזה מתאים ל-\"25 צוותים ממתינים\"", V, ""),
 (82, "Helmsley Charitable Trust (תוכנית ישראל)", "קרן", "ארה\"ב / ישראל", "קרנות",
  "2017: $2M לבניית מרכז בית הלוחם באשדוד. $750K להידרותרפיה בבית הלוחם תל אביב",
  "https://www.helmsleytrust.org/?p=27738\nhttps://jta.org/?p=888856",
  "כן. נכי צה\"ל", "גבוהה מאוד",
  "צוות תוכנית ישראל בירושלים. לרוב לא מקבלים הצעות ביוזמה חיצונית, צריך היכרות",
  "USD / ILS", "כבר מימנו שיקום של לוחמים בהיקף גדול", V, ""),
 (82, "Haim & Cheryl Saban", "אדם פרטי / קרן משפחתית", "ארה\"ב", "לוחמים (FIDF)",
  "יו\"ר הגאלה של FIDF בלוס אנג'לס 12 פעמים. 2018: השוו את תרומת אדלסון, $10M. 2017: אירחו גאלה שגייסה $53.8M",
  "https://www.jns.org/news/friends-of-the-idf-raise-record-60m-for-israeli-soldiers-at-la-gala\nhttps://www.jta.org/2017/11/05/united-states/record-53-8-million-raised-for-idf-soldiers-at-beverly-hills-gala",
  "כן", "גבוהה מאוד",
  "Saban Family Foundation, או סניף FIDF Western Region",
  "USD", "המחויבות הארוכה ביותר לרווחת חיילים", R, "פנייה דרך היכרות אישית בלבד"),
 (80, "Ofer Yardeni", "אדם פרטי", "ארה\"ב (יליד ישראל)", "אנשי עסקים / FIDF",
  "2018: התחייבות של $1M. 2019: $2.2M לחטיבת הנדל\"ן של FIDF בניו יורק",
  "https://www.jns.org/a-night-of-heroes-celebrating-israel-and-the-idf-at-70/\nhttps://www.mannpublications.com/mannabouttown/2019/10/15/top-ny-real-estate-leaders-attend-fidf-national-gala-helping-raise-record-37m-for-israeli-soldiers/",
  "כן (יו\"ר כבוד של FIDF)", "גבוהה",
  "Stonehenge Partners, או חטיבת הנדל\"ן של FIDF בניו יורק",
  "USD", "ישראלי שמגייס גם את העמיתים שלו", R, ""),
 (80, "Jusidman Family Philanthropic Foundation", "קרן משפחתית", "מקסיקו", "אנשי עסקים בינלאומיים",
  "יוני 2026: התחייבות של 200 מיליון ₪ (£40M) לבית החולים החדש לשיקום על שם ג'וסידמן, במקום ראות תל אביב. לפי המשפחה, התרומה היא \"למען מי שהגנו על ישראל\"",
  "https://www.jewishnews.co.uk/mexican-jewish-family-gives-40m-boost-to-israels-largest-rehab-hospital/",
  "כן. שיקום פצועי מלחמה וטראומה", "גבוהה מאוד",
  "דרך ראות, או דרך דובר הקרן",
  "USD", "התרומה הגדולה ביותר מאמריקה הלטינית לשיקום לוחמים", M, "מקור אחד בלבד"),
 (78, "Cross River Bank", "חברה", "ארה\"ב / ישראל", "אנשי עסקים / תאגידים",
  "2022: מימון מסעות ריפוי לישראל לוותיקים אמריקאים דרך Heroes to Heroes. ספטמבר 2022: מענק למסע של 10 ימים לירושלים לוותיקות עם פוסט-טראומה ופגיעה מוסרית",
  "https://www.crossriver.com/newsroom/cross-river-makes-generous-contribution-heroes-heroes-organization",
  "כן. מממנים כמעט בדיוק את המודל שלנו: מסע קבוצתי לריפוי", "לא פורסם",
  "מחלקת הקשרים עם הקהילה, או המשרד בירושלים",
  "USD", "כבר מממנים מסעות ריפוי קבוצתיים, מתאים ל\"אמצו צוות\"", V, "התרומות שלהם היו לוותיקים אמריקאים, לא לישראלים"),
 (78, "Sandra Hagee Parker", "אדם פרטי", "ארה\"ב", "נוצרים / אוונגליסטים",
  "28.10.2026: התחייבה ל-$100K ל-OneFamily (נפגעי טרור ומשפחות שכולות). תומכת ותיקה ומכובדת שם",
  "https://jewishlink.news/onefamily-honors-the-donors-who-have-made-25-years-of-healing-possible/",
  "כן. שכול וטראומה", "תרומות בסדר גודל של $100K",
  "דרך CUFI Action Fund, או דרך הנהלת OneFamily",
  "USD", "תרומה אישית טרייה מאוד לנפגעי טרור ולמשפחות שכולות", V, "רק הוכחה אחת"),
 (78, "Leo David", "אדם פרטי", "ארה\"ב", "לוחמים (FIDF)",
  "נובמבר 2025: $1M בגאלה של FIDF בלוס אנג'לס. מכובד בגאלה של נובמבר 2026",
  "https://jewishjournal.com/community/384920/love-loss-and-strength-fidf-gala-showcases-israeli-spirit/\nhttps://www.fidf.org/events/category/western/los-angeles/",
  "כן", "תרם יותר מ-$1M",
  "סניף FIDF Western Region",
  "USD", "תורם עכשווי שמכובד בימים אלה", M, ""),
 (77, "Edmond de Rothschild Foundation (ישראל)", "קרן משפחתית", "ישראל", "קרנות",
  "אוקטובר 2023: קרן חירום של 20 מיליון ₪ לסיוע נפשי ולחוסן. סביב 2021: מיליון ₪ לנט\"ל ולקואליציית הטראומה",
  "https://www.edrf.org.il/en/news/the-edmond-de-rothschild-foundation-il-creates-an-nis-20-million-emergency-fund-for-immediate-psychological-assistance-to-the-victims-of-the-massacre-and-the-war-and-to-bolster-israeli-society\nhttps://www.jpost.com/israel-news/rothschild-foundation-gives-nis-1m-for-mental-health-in-southern-israel-668758",
  "חלקית. בריאות נפש, לא ספציפית ללוחמים", "גבוהה",
  "עמוד \"How to apply\" באתר edrf.org.il",
  "ILS (ישירות לעמותה)", "קרן ישראלית גדולה בבריאות נפש עם מסלול פנייה פתוח", R, ""),
 (76, "Samaritan's Purse (Franklin Graham)", "ארגון אוונגליסטי", "ארה\"ב (וזרוע בריטית)", "נוצרים / אוונגליסטים",
  "ינואר 2024: 14 אמבולנסים של מד\"א לזכר 19 מתנדבים שנפלו. 2025: אמבולנס ממוגן לזכר מתנדב שנפל",
  "https://www.samaritanspurse.org/article/samaritans-purse-provides-ambulances-in-honor-of-fallen-israeli-medics/\nhttps://www.klove.com/news/good-news/high-tech-armored-ambulance-donated-to-israel-by-american-ministries-55189",
  "חלקית. הנצחת נופלים", "גבוהה מאוד",
  "צוות החירום (DART) לישראל. לליש\"ט: הזרוע הבריטית",
  "USD / GBP", "רגילים לתרומות לזכר נופלים, אז מתאים \"מסע צוות על שם נופל\"", V, ""),
 (76, "Blavatnik Family Foundation – Sir Len Blavatnik", "קרן", "בריטניה / ארה\"ב", "אנשי עסקים בינלאומיים",
  "אחרי אוקטובר 2023 הוביל את קרן החירום של אוניברסיטת תל אביב, שנתנה מענקים ליותר מ-5,000 סטודנטים שגויסו למילואים. מוקדם יותר תרם $20M לאוניברסיטה",
  "https://english.tau.ac.il/node/3438\nhttps://en.globes.co.il/en/article-blavatnik-donates-20m-to-tel-aviv-university-1000969909",
  "כן. מילואימניקים", "גבוהה מאוד",
  "צוות התוכניות של הקרן",
  "USD / GBP", "כבר תומך במילואימניקים מאז המלחמה", V, "קישור אחד באתר הקרן מחזיר 404"),
 (76, "Harry Triguboff (Meriton)", "אדם פרטי", "אוסטרליה", "אנשי עסקים בינלאומיים",
  "2015: מימן מועדון לחיילים בודדים ברעננה דרך קק\"ל אוסטרליה (היום \"גני טריגובוף\")",
  "https://www.kkl-jnf.org/about-kkl-jnf/green-israel-news/press-releases-2016/lone-soldiers-club-raanana.aspx\nhttps://www.jwire.com.au/?p=50479",
  "כן. חיילים בודדים", "גבוהה מאוד",
  "Harry Triguboff Foundation או Meriton. כדאי שקק\"ל אוסטרליה תעשה היכרות",
  "USD", "כבר מימן רווחת חיילים, והיכולת שלו גבוהה מאוד", V, "ההוכחה מ-2015"),
 (75, "Nash Family Foundation", "קרן משפחתית", "ארה\"ב (ניו יורק)", "קרנות",
  "2023–2025: $102K ב-4 מענקים ל-Belev Echad (פצועי צה\"ל), מתוכם $35K ב-2025",
  "https://grantable.co/nonprofits/belev-echad-inc-morg_8efb00d469f745c4a40709f85b718cdd",
  "כן", "$5K–$1.5M",
  "מאז ספטמבר 2023 לא מקבלת פניות מארגונים שלא מימנה. צריך היכרות",
  "USD", "נותנת שוב ושוב לפצועי צה\"ל", V, "לאמת את הסכומים מול ProPublica"),
 (75, "Thomas D. & Denise R. Stern Family Foundation", "קרן משפחתית", "ארה\"ב (ניו יורק)", "קרנות",
  "2023–2025: $1.2M ב-3 מענקים ל-Brothers for Life, מתוכם $400K ב-2025",
  "https://grantable.co/nonprofits/brothers-for-life-morg_9c29338303644d2eaba3ca3d959414e5",
  "כן. פצועים קרביים", "גבוהה",
  "בוחרת לבד את מקבלי המענקים. צריך קשר אישי",
  "USD", "מענקים גדולים וחוזרים ללוחמים פצועים", V, "לאמת את הסכומים מול ProPublica"),
 (74, "Arthur M. Blank Family Foundation", "קרן", "ארה\"ב", "קרנות; פוסט-טראומה",
  "2021: $20M (יחד עם Bernie Marcus) לרשת Avalon לטיפול בפוסט-טראומה של ותיקי צבא ארה\"ב. אוקטובר 2023: $750K לברזילי, לסורוקה ולאיחוד הצלה",
  "https://www.atlantajewishtimes.com/marcus-and-blank-foundations-aid-veterans-with-ptsd/\nhttps://www.atlantajewishtimes.com/arthur-m-blank-foundation-donates-750k-to-israel/",
  "חלקית. פוסט-טראומה בארה\"ב, ובישראל טראומה אזרחית", "גבוהה מאוד",
  "צוות המענקים באטלנטה",
  "USD", "בדיוק הפרופיל של \"מממן פוסט-טראומה של ותיקים שגם תורם לישראל\"", M, ""),
 (74, "Genesis Prize Foundation + Jewish Funders Network", "קרן / תחרות", "ישראל / בינלאומי", "קרנות",
  "2026: פרס גל גדות הפך לקרן של $3M ל-24 עמותות טראומה ובריאות נפש. הן נבחרו מתוך 150 בקשות",
  "https://www.ynetnews.com/jewish-world/article/byjzbnl5zl",
  "כן לטראומה, לא ספציפית ללוחמים", "מענקים תואמים",
  "קול קורא פתוח. לעקוב אחרי הקרן של זוכה 2027. דורש תורם תואם חדש",
  "ILS / USD", "אחד המסלולים התחרותיים הפתוחים המעטים", V, ""),
 (72, "Jerome L. Stern Family Foundation", "קרן משפחתית", "ארה\"ב (ניו יורק)", "קרנות",
  "2023–2026: 4 מענקים ל-Belev Echad, מסווגים כ\"aid to veterans\", כולל $23K ב-2026",
  "https://grantable.co/nonprofits/belev-echad-inc-morg_8efb00d469f745c4a40709f85b718cdd",
  "כן", "$10K–$25K, צוות אחד או שניים",
  "לא מקבלת פניות ביוזמה חיצונית. צריך היכרות",
  "USD", "גודל המענק שלה הוא בדיוק צוות אחד", V, ""),
 (72, "NVIDIA", "חברה", "ארה\"ב / ישראל", "אנשי עסקים / תאגידים",
  "דצמבר 2023: $15M לסיוע בישראל, כולל $10M שהחברה השוותה לתרומות העובדים. אחד המקבלים היה קרן אסור של Jgive",
  "https://www.jpost.com/business-and-innovation/article-779378",
  "חלקית. דרך העובדים שלה שמשרתים במילואים", "גבוהה מאוד",
  "הנהלת NVIDIA ישראל, או תוכנית התרומה התואמת לעובדים. מתאים ל\"אמצו צוות\"",
  "USD / ILS", "כבר תרמה דרך Jgive, ויש לה אלפי עובדים מילואימניקים בישראל", R, "היה ויכוח פנימי על התרומה התואמת"),
 (72, "Sylvan Adams", "אדם פרטי", "קנדה / ישראל", "אנשי עסקים בינלאומיים",
  "דצמבר 2023: $100M לאוניברסיטת בן-גוריון לשיקום הדרום. נובמבר 2025: $100M לשיקום סורוקה",
  "https://wtop.com/news/2025/11/billionaire-sylvan-adams-donates-100m-to-rebuild-israeli-hospital-struck-by-iranian-missile",
  "חלקית. לא מצאנו תרומה ללוחמים", "גבוהה מאוד",
  "המשרד הפילנתרופי שלו בתל אביב",
  "ILS / USD", "התורם הגדול הפעיל ביותר מאז 7.10, וגר בישראל", R, ""),
 (70, "CBN Israel (Gordon Robertson)", "ארגון אוונגליסטי", "ישראל / ארה\"ב", "נוצרים / אוונגליסטים",
  "2024: עבודת טראומה עם קואליציית הטראומה, יחידת טיפול ניידת, ו-14 מקלטים חדשים",
  "https://cbnisrael.org/2024/10/09/on-october-7-cbn-israel-immediately-pivoted-to-war-and-terror-relief-mode/",
  "חלקית. טראומה של אזרחים", "גבוהה",
  "משרד CBN Israel בירושלים",
  "ILS / USD", "כבר מממנים טיפול בטראומה. אפשר לבקש להרחיב ללוחמים", R, ""),
 (70, "Axel Springer Foundation – Mathias Döpfner", "קרן (לא יהודית)", "גרמניה", "אנשי עסקים בינלאומיים",
  "אחרי 7.10: דיור למפונים, מעונות לילדי משפחות לוחמים, מלגות חירום לסטודנטים מילואימניקים ותמיכה פסיכו-סוציאלית. הסכומים לא פורסמו. 2025: עיטור הנשיא",
  "https://www.yahoo.com/news/haim-saban-urges-herzog-honor-221834115.html\nhttps://www.jns.org/israel-news/president-herzog-to-bestow-the-nations-highest-civilian-recognition",
  "כן / חלקית. מילואימניקים ותמיכה נפשית", "גבוהה",
  "Axel Springer Foundation",
  "USD", "התורם העסקי הלא-יהודי המתועד הכי חזק באירופה", R, "אין סכומים פורסמים"),
 (70, "Larry Ellison", "אדם פרטי", "ארה\"ב", "לוחמים (FIDF)",
  "2017: $16.6M ל-FIDF, התרומה הבודדת הגדולה בתולדות הארגון",
  "https://www.jta.org/2017/11/05/united-states/record-53-8-million-raised-for-idf-soldiers-at-beverly-hills-gala",
  "כן", "מהעשירים בעולם",
  "רק דרך הנהלת FIDF",
  "USD", "תרם הרבה מאוד לחיילים, אבל קשה מאוד להגיע אליו", R, "הדרך אליו חלשה מאוד"),
 (66, "Christian Friends of Israel (ירושלים) / CFI America", "ארגון נוצרי", "ישראל / ארה\"ב", "נוצרים / אוונגליסטים",
  "פרויקט \"מגן דוד\": מספק ציוד שמותאם לצרכים של כל יחידה ליותר מ-25 בסיסים בשנה, מאז שנות ה-90",
  "https://allisraelnews.com/blog/project-david-s-shield-helping-and-standing-with-israel-s-physical-guardian",
  "חלקית. רווחת חיילים", "כנראה קטנה",
  "צוות \"מגן דוד\" של CFI ירושלים",
  "ILS / USD", "כבר נותנים לפי יחידה, וזה מתאים לבקשה לפי צוות", R, ""),
 (65, "Sir Frank Lowy", "אדם פרטי", "אוסטרליה / ישראל", "אנשי עסקים בינלאומיים",
  "2022: $18M לאוניברסיטת תל אביב. יו\"ר המכון למחקרי ביטחון לאומי (INSS). לחם ב-1948 ביחידת קומנדו",
  "https://www.jewishpress.com/news/israel/australian-real-estate-mogul-sir-frank-lowy-gives-18-m-to-tau-international-programs/2022/12/13\nhttps://www.lowyinstitute.org/about/founder",
  "חלקית. לא מצאנו תרומה לוותיקים", "גבוהה מאוד",
  "INSS, או המשרד המשפחתי",
  "ILS / USD", "לוחם בעצמו, עם יכולת גבוהה מאוד", R, ""),
 (64, "CFOIC Heartland", "ארגון נוצרי", "ארה\"ב / ישראל", "נוצרים / אוונגליסטים",
  "2024: $1.128M לפרויקטים בישראל, כולל ארוחות ומעונות לילדים של משפחות מילואימניקים",
  "https://www.guidestar.org/profile/41-2020104",
  "חלקית. משפחות מילואימניקים", "כ-$1M בשנה",
  "cfoic.com",
  "USD", "כבר תומכים במשפחות מילואים ונותנים כל שנה", R, ""),
 (60, "Daystar Television Network", "חברה / ארגון אוונגליסטי", "ארה\"ב", "נוצרים / אוונגליסטים",
  "2024: בית לחיילים בודדים ל-15 חיילים. ציוד מגן לחיילים, ו\"מיליונים\" לעוטף",
  "https://blog.daystar.com/israel-projects-update-october-2024\nhttps://www.jns.org/news/u-s-news/american-christian-zionist-who-founded-daystar-tv-dies",
  "כן / חלקית", "\"מיליונים\" (לא מפורט)",
  "Daystar Israel / House of Hope Israel",
  "USD", "יש להם היסטוריה של תרומה לחיילים", R, "סיכון: ההנהלה מתחלפת מאז מאי 2026, ויש טענות על התעללות וטיוח. לבדוק לפני כל פנייה"),
]

EXCLUDED = [
 ("Mike Evans (Friends of Zion)", "התרומה המתועדת היחידה: $50K למשפחה אזרחית"),
 ("The Joshua Fund, Eagles' Wings, Bridges for Peace, Larry Huch", "לא נמצאה תרומה מתועדת ללוחמים או לוותיקים"),
 ("Simon Cowell", "$150K ל-FIDF. אין לו פרופיל פילנתרופי נוצרי, אבל אפשר לבחון אותו כליד בריטי בליש\"ט"),
 ("The Wilf family, Marcus Foundation", "לא הצלחנו לאמת תרומה מהסוג הזה"),
 ("Li Ka-shing", "$130M לטכניון (2013), בלי קשר ללוחמים"),
 ("Elie Horn (ברזיל)", "מלגות ללימודי יהדות, לא ללוחמים"),
 ("Eduardo Elsztain (ארגנטינה)", "אין תרומה מתועדת אחרי 7.10"),
 ("Blaustein, Koret, Schusterman", "קישור שבור, תרומה בלי תאריך, או שלא נמצא מענק ספציפי"),
 ("Curt Landry Ministries", "ההוכחה היחידה היא פוסט מ-2015 על ציוד בסיסי. חלש מדי"),
]

NOTES = [
 ("איך מנסחים", "לתורמים מחו\"ל: \"טיפול נפשי בלוחמים משוחררים\", לא \"תמיכה בצבא\". רשות הצדקה הבריטית ורשות המס הקנדית (שביטלה את מעמד הצדקה של JNF Canada) בודקות היום ארגוני צדקה שתומכים בצה\"ל. זה גם התיאור המדויק של מה שהעמותה עושה."),
 ("מה מבקשים", "צוות אחד = $10,000 / ₪30,000. מציעים \"מסע צוות על שם נופל\" (יש 49 נופלים מאז 7.10), עם תמונות ודוח אחרי המסע. לקרנות: חבילות של 5 צוותים ($50K) או 10 צוותים ($100K), לפי גודל המענק הרגיל שלהן. לתורמי FIDF: אתגר תרומה תואמת של $250K ל-25 הצוותים הממתינים."),
 ("איך התרומה עוברת", "רק דרך Jgive. בארה\"ב: דולר, קבלת 501(c)(3) דרך Friends of Asor Fund USA, וקרן אמריקאית יכולה לתת מענק לישות הזו ולייעד אותו לקמפיין 163449. בבריטניה: ליש\"ט, קבלה בריטית. קנדה: אין CAD, אז תורם קנדי נותן בדולר בלי קבלה קנדית. קרנות ישראליות (עזריאלי, רוטשילד): ישירות לעמותה בשקלים."),
 ("סדר הפנייה", "1) קרנות עם מסלול פתוח: Samis, Weinberg, עזריאלי, רוטשילד, Genesis/JFN. 2) ארגונים נוצרים דרך המשרדים שלהם בירושלים: ICEJ, IFCJ, CBN. 3) תורמים פרטיים רק דרך היכרות אישית: חבר הנהלה, בוגר יחידה, Jgive, FIDF או בית הלוחם."),
 ("מה להכין לפני פנייה", "עמוד אחד באנגלית: הבעיה (49 נופלים, ביקוש לטיפול נפשי עלה ביותר מ-150%, 25 צוותים ממתינים), הפתרון (מסע צוותי עם אנשי מקצוע), תקציב לצוות, ושותף קליני ומדדי תוצאה. גם אישור ניהול תקין ותו מידות. מספר ה-150% והבסיס שלו צריכים לבוא מחזקי לפני שמשתמשים בהם."),
 ("פרטיות ואתיקה", "הרשימה מבוססת רק על מידע ציבורי (דוחות, הודעות לעיתונות, אתרים רשמיים). אין בה פרטי קשר אישיים, ואין לחפש אותם. פונים רק בערוצים ארגוניים או דרך היכרות. לא שולחים מיילים המוניים, וכל פנייה בתיאום עם חזקי."),
 ("אימות", "\"נבדק ואומת\" = פתחנו את המקור ווידאנו שהעובדה מופיעה בו. \"לפתוח ידנית\" = האתר חוסם בדיקה אוטומטית. \"לא נבדק שנית\" = המקור נמצא במחקר אבל לא נפתח שוב. לפני כל פנייה פותחים את המקור. סכומים מ-Grantable מאמתים מול ProPublica Nonprofit Explorer."),
 ("שיטת הניקוד", "0–100: תרומה מתועדת לישראל (40) + זיקה ללוחמים, פצועים, טראומה או שכול (30) + יכולת (15) + דרך פנייה זמינה (15). לפי ההנחיה, מי שכבר תרם למשהו דומה מקבל ציון גבוה יותר ממיליארדר בלי הוכחה."),
]

wb = Workbook()
ws = wb.active
ws.title = "תורמים מדורגים"
ws.sheet_view.rightToLeft = True
hdr = ["#", "ציון", "שם", "סוג", "מדינה", "קבוצה", "הוכחות תרומה (מה, כמה, מתי)", "מקורות",
       "זיקה ללוחמים / טראומה", "יכולת / גודל מענק", "דרך פנייה (ארגונית)", "מטבע ב-Jgive",
       "למה הם", "סטטוס אימות", "סיכונים / הערות", "אחראי", "סטטוס פנייה", "תאריך פנייה", "הערות מעקב"]
ws.append(hdr)
P.sort(key=lambda r: -r[0])
for i, r in enumerate(P, 1):
    ws.append([i, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], "", "לא נפנה", "", ""])

thin = Side(style="thin", color="D0D4C8")
head_fill = PatternFill("solid", fgColor="2F3B2A")
widths = [5, 7, 30, 16, 16, 18, 60, 48, 26, 18, 42, 13, 36, 20, 30, 12, 14, 12, 24]
for c, w in enumerate(widths, 1):
    ws.column_dimensions[get_column_letter(c)].width = w
for cell in ws[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = head_fill
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws.row_dimensions[1].height = 34
tiers = [(85, "E3EFD9"), (75, "F3F6EC"), (0, "FFFFFF")]
for row in ws.iter_rows(min_row=2):
    s = row[1].value
    fill = next(PatternFill("solid", fgColor=col) for t, col in tiers if s >= t)
    for cell in row:
        cell.alignment = Alignment(vertical="top", wrap_text=True, horizontal="right" if cell.column > 2 else "center")
        cell.border = Border(top=thin, bottom=thin, left=thin, right=thin)
        if cell.column <= 15:
            cell.fill = fill
    row[1].font = Font(bold=True)
    row[2].font = Font(bold=True)
    if row[13].value != V:
        row[13].font = Font(color="9A5B00")
    if "סיכון" in (row[14].value or ""):
        row[14].font = Font(color="B00020", bold=True)
ws.freeze_panes = "D2"
ws.auto_filter.ref = f"A1:{get_column_letter(len(hdr))}{ws.max_row}"
dv = DataValidation(type="list", formula1='"לא נפנה,בבירור היכרות,נשלחה פנייה,פגישה נקבעה,הוגשה הצעה,תרם,לא רלוונטי"', allow_blank=True)
ws.add_data_validation(dv)
dv.add(f"Q2:Q{ws.max_row}")

ws2 = wb.create_sheet("איך פונים")
ws2.sheet_view.rightToLeft = True
ws2.append(["נושא", "הנחיה"])
for n in NOTES:
    ws2.append(list(n))
ws2.column_dimensions["A"].width = 22
ws2.column_dimensions["B"].width = 120
for row in ws2.iter_rows():
    for cell in row:
        cell.alignment = Alignment(wrap_text=True, vertical="top", horizontal="right")
for cell in ws2[1]:
    cell.font = Font(bold=True, color="FFFFFF"); cell.fill = head_fill
for r in range(2, ws2.max_row + 1):
    ws2.cell(r, 1).font = Font(bold=True)

ws3 = wb.create_sheet("נבדקו ולא נכנסו")
ws3.sheet_view.rightToLeft = True
ws3.append(["שם", "סיבה"])
for e in EXCLUDED:
    ws3.append(list(e))
ws3.column_dimensions["A"].width = 46
ws3.column_dimensions["B"].width = 90
for row in ws3.iter_rows():
    for cell in row:
        cell.alignment = Alignment(wrap_text=True, vertical="top", horizontal="right")
for cell in ws3[1]:
    cell.font = Font(bold=True, color="FFFFFF"); cell.fill = head_fill

out = "/home/user/desktop-tutorial/donor-prospects/Sayeret_Nahal_Global_Donor_Prospects.xlsx"
wb.save(out)
print(out, len(P), "prospects")
