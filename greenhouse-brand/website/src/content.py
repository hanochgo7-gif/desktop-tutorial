"""All website copy, English and Hebrew, in one place.
Every claim must trace to docs/MIFTAH_TRUTH_LEDGER.md (ledger numbers in comments). Edit text here, then run build.py.
Each value is (English, Hebrew)."""

SITE = {
    "name": ("MIFTAH Projects", "מיפתח פרויקטים"),
    "slogan": ("MIFTAH Projects - Where agriculture feels at home", "מיפתח פרויקטים חקלאות שיש לה בית"),  # 1.13; the company name leads in both languages (Merav, 5 Nov 2026)
    "phone_display": ("+972\u00a04\u00a0985\u00a04404", "04\u20119854404"),  # 1.10
    "phone_tel": "+97249854404",
    "town": ("Kibbutz Kfar Masaryk", "קיבוץ כפר מסריק"),  # 1.10
    "skip": ("Skip to content", "דילוג לתוכן"),
    "close": ("Close", "סגירה"),
    "menu": ("Menu", "תפריט"),
    "lang_other": ("עברית", "English"),
    "cta": ("Discuss your project", "דברו איתנו על הפרויקט"),
    "call_short": ("Call", "התקשרו"),
    "call": ("Call", "התקשרו"),
    "home": ("Home", "דף הבית"),
    "foot_nav": ("Pages", "עמודים"),
    "foot_contact": ("Contact", "יצירת קשר"),
    "foot_legal": ("Privacy", "פרטיות"),
    "foot_a11y": ("Accessibility statement", "הצהרת נגישות"),
    "foot_profile": ("Company profile (print / PDF)", "פרופיל החברה (הדפסה / PDF)"),
    "rights": ("© {y} MIFTAH Projects. All rights reserved.", "© {y} מיפתח פרויקטים. כל הזכויות שמורות."),
    "tb": [(("Company", "חברה"), ("MIFTAH Projects", "מיפתח פרויקטים")),
           (("Office", "משרד"), ("Kibbutz Kfar Masaryk", "קיבוץ כפר מסריק")),
           (("Work", "תחום"), ("Net houses and agricultural projects", "בתי רשת ופרויקטים חקלאיים")),
           (("Projects", "פרויקטים"), ("Israel and countries around the world", "ישראל ומדינות בעולם"))],
    "video_play": ("Play video", "הפעלת הסרטון"), "video_pause": ("Pause video", "עצירת הסרטון"),
    "noscript": ("Sending this form needs JavaScript. Please call +972 4 985 4404.", "שליחת הטופס דורשת JavaScript. אפשר להתקשר ל-04-9854404."),
    "map_label": ("Map of MIFTAH projects abroad: Mexico, Honduras, Spain, Portugal, Belarus, Georgia, India and Greece, and our office at Kibbutz Kfar Masaryk, Israel. The same information is in the projects table.",
                  "מפת הפרויקטים של מיפתח בחו״ל: מקסיקו, הונדורס, ספרד, פורטוגל, בלארוס, גאורגיה, הודו ויוון, בניהול מקיבוץ כפר מסריק. אותו מידע מופיע בטבלת הפרויקטים."),
    "archive": ("MIFTAH archive", "ארכיון מיפתח"),
}

NAV = [  # (slug, en, he)
    ("net-houses", "Net houses", "בתי רשת"),
    ("how-we-build", "How we build", "כך בונים"),
    ("turnkey-farms", "Agricultural farms", "חוות חקלאיות"),
    ("projects", "Projects", "פרויקטים"),
    ("about", "About", "אודות"),
    ("contact", "Contact", "יצירת קשר"),
]

# ---------------------------------------------------------------- shared blocks
FACTS = [  # once, under the home hero
    (("20+", "20+"), ("designing and building agricultural projects since 2003", "מאז 2003 מתכננים ומקימים פרויקטים חקלאיים")),  # 1.6
    (("Millions of m²", "מיליוני מטרים"), ("of agricultural projects and shade solutions around the world", "מיליוני מ״ר של פרויקטים חקלאיים ופתרונות הצללה בעולם")),  # 3.2
    (("Our plant", "מפעל שלנו"), ("materials processed and made, and quality-checked before they ship", "עיבוד וייצור החומרים ובקרת איכות לפני היציאה לשטח")),  # 1.7
    (("Countries", "מדינות בעולם"), ("Portugal, Spain, Mexico, India, Honduras, Georgia, Belarus, Greece, Africa and Israel", "פורטוגל, ספרד, מקסיקו, הודו, הונדורס, גאורגיה, בלארוס, יוון, אפריקה וישראל")),  # 3.1-3.3
]

STEPS = [  # OS consult (2.8), one real photo each
    ("p-site", ("Site visit and needs assessment", "מיפוי צרכים בשטח"),
     ("We meet on the land, map the crop's needs and look at the soil, drainage, access roads and the wind pattern, so the project is designed at its best.",
      "אנו נפגשים בשטח, ממפים את צורכי הגידול ובוחנים את תנאי הקרקע, הניקוז, דרכי הגישה ומשטר הרוחות לצורך תכנון מיטבי של הפרויקט."),
     ("Open farmland before a net house goes up", "שטח חקלאי פתוח, לפני הקמת בית רשת")),
    ("p-marking", ("Engineering design", "תכנון הנדסי"),
     ("Our engineering department is responsible for the static calculations, the structural design and the construction plans, drawings and bills of quantities.",
      "מחלקת ההנדסה שלנו אחראית על חישובים סטטיים, תכנון קונסטרוקטיבי והפקת תוכניות ביצוע, שרטוטים וכתבי כמויות."),
     ("Work starting on site and training the local crew, a project in India", "תחילת העבודות בשטח והדרכת צוות העובדים המקומי, פרויקט בהודו")),
    ("f-poles", ("Manufacturing in our plant", "ייצור במפעל שלנו"),
     ("Once the order is approved, every part of the system is made and fitted to the project in our plant, ready for installation on site.",
      "לאחר אישור ההזמנה, כל רכיבי המערכת מיוצרים ומותאמים לפרויקט במפעלנו לקראת ההתקנה בשטח."),
     ("Round galvanized poles set on site to the design", "עמודים מגולוונים עגולים מוצבים בשטח לפי התכנון")),
    ("p-closed", ("Installation and handover", "הקמה ומסירה"),
     ("Our installation crews, trained for work at height and with long experience in building projects, carry out the installation with care for safety, quality and professionalism, through to handing over the finished project.",
      "צוותי ההקמה שלנו, בעלי הכשרה לעבודה בגובה וניסיון רב בהקמת פרויקטים, מבצעים את ההתקנה תוך הקפדה על בטיחות, איכות ומקצועיות עד למסירת הפרויקט המושלם ללקוח."),
     ("A sealed net house with an entrance door and insect-proof mesh", "בית רשת אטום עם דלת כניסה ורשת מש למניעת כניסת חרקים")),
]

DRAWING = {  # labels for the signature section drawing; numbers match the legend
    "title": ("Section through a MIFTAH net house", "חתך של בית רשת של מיפתח"),
    "items": [
        (("Net", "רשת"), ("10–30% shade for orchards: against hail and weather damage at every stage of growth. 11% shade for bananas: a light, airy net against wind and weather damage.", "10%–30% צל למטעים: למניעת ברד ופגעי מזג האויר בכל שלבי הגידול. 11% צל לבננות: רשת קלה ואוורירית להגנה מפני רוח ופגעי מזג האויר.")),  # 2.2, 2.3
        (("Steel cables", "כבלי פלדה"), ("Tensioned across the pole heads to carry the net.", "נמתחים בין ראשי העמודים ונושאים את הרשת.")),  # 2.8
        (("Galvanized steel poles", "עמודי פלדה מגולוונים"), ("Made to the design and worked in our plant, then set in rows at the span and height set in the design.", "מיוצרים לפי תכנון ועוברים עיבוד במפעל שלנו, מוצבים בשורות, במפתח ובגובה שנקבעו בתכנון.")),  # 1.7
        (("Perimeter anchoring", "עיגון היקפי"), ("Edge cables tie the structure to the ground against wind.", "כבלי שוליים קושרים את המבנה לקרקע מול הרוח.")),
        (("Trellising and support", "הדליה ותמיכה"), ("Built with the structure to suit the crop: pergola or T-support trellising for kiwi, trellising in orchards, fruit walls, support for bananas.", "נבנית יחד עם המבנה לפי הגידול: הדליה בשיטת סוכה או תומכות T לקיווי, הדליה במטעים, קיר פירותי, תמיכה לבננות.")),  # 2.2, 3.1
        (("Folding", "קיפול"), ("In orchards the net can fold away in winter and spread again in spring, by hand or automatically.", "במטעים הרשת יכולה להתקפל בחורף ולהיפרס באביב, ידנית או אוטומטית.")),  # 2.3
    ],
    "caption": ("Schematic, not to scale. Spans, heights and net type are set by the project's requirements.", "סכמה, לא בקנה מידה. המפתחים, הגבהים וסוג הרשת נקבעים בהתאם לדרישות הפרויקט."),
    "span": ("span, set per design", "מפתח, לפי התכנון"),
    "height": ("height, set per crop", "גובה, לפי הגידול"),
    "section": ("Section A–A", "חתך A–A"),
    "mobile": ("Numbers on the drawing match the list.", "המספרים בשרטוט תואמים לרשימה."),
}

MARKETS = [  # 3.2, 3.3. (key, lat, lon, area m2 or None, en, he, label side)
    ("mx", 23.6, -102.5, 150000, "Mexico", "מקסיקו", "s"),
    ("hn", 14.8, -86.8, 70000, "Honduras", "הונדורס", "e"),
    ("es", 39.8, -2.6, 60000, "Spain", "ספרד", "e"),
    ("pt", 39.6, -8.6, None, "Portugal", "פורטוגל", "w"),
    ("by", 53.7, 27.9, None, "Belarus", "בלארוס", "e"),
    ("ge", 42.2, 43.5, 50000, "Georgia", "גאורגיה", "e"),
    ("in", 21.0, 78.0, 80000, "India", "הודו", "s"),
    ("gr", 39.1, 21.8, None, "Greece", "יוון", "e"),  # Hanoch, 12 Nov 2026
]
HQ = (32.886, 35.103, "Kibbutz Kfar Masaryk", "קיבוץ כפר מסריק")

IL_SITES = [  # places in Israel where MIFTAH has built (Hanoch, 12 Nov 2026), grouped by regional council (Hanoch, 12 Nov 2026). Coordinates: OpenStreetMap (Nominatim), checked by hand
    ('יחיעם', 'Yehiam', 32.997, 35.22, 'ma'),
    ('חניתה', 'Hanita', 33.087, 35.173, 'ma'),
    ('מצובה', 'Metzuba', 33.063, 35.157, 'ma'),
    ('גשר הזיו', 'Gesher HaZiv', 33.039, 35.111, 'ma'),
    ('בית העמק', 'Beit HaEmek', 32.97, 35.146, 'ma'),
    ('געתון', "Ga'aton", 33.006, 35.214, 'ma'),
    ('לוחמי הגטאות', "Lohamei HaGeta'ot", 32.964, 35.098, 'ma'),
    ('כפר מסריק', 'Kfar Masaryk', 32.891, 35.1, 'ma'),
    ('אדמית', 'Adamit', 33.08, 35.21, 'ma'),
    ('שבי ציון', 'Shavei Tzion', 32.981, 35.083, 'ma'),
    ('רגבה', 'Regba', 32.978, 35.1, 'ma'),
    ('סער', "Sa'ar", 33.029, 35.109, 'ma'),
    ('סאסא', 'Sasa', 33.027, 35.395, 'ge'),
    ('ברעם', "Bar'am", 33.059, 35.434, 'ge'),
    ('שומרה', 'Shomera', 33.082, 35.284, 'my'),
    ('אבן מנחם', 'Even Menachem', 33.074, 35.294, 'my'),
    ('ירון', "Yir'on", 33.078, 35.456, 'ge'),
    ('מנרה', 'Manara', 33.196, 35.545, 'ge'),
    ('כרם בן זמרה', 'Kerem Ben Zimra', 33.039, 35.468, 'mg'),
    ('דישון', 'Dishon', 33.081, 35.518, 'mh'),
    ('שמיר', 'Shamir', 33.164, 35.659, 'ge'),
    ('דפנה', 'Dafna', 33.23, 35.639, 'ge'),
    ('דן', 'Dan', 33.24, 35.653, 'ge'),
    ('מטולה', 'Metula', 33.28, 35.578, 'metula'),
    ('מרגליות', 'Margaliot', 33.215, 35.544, 'mh'),
    ('רמת מגשימים', 'Ramat Magshimim', 32.844, 35.807, 'golan'),
    ('אורטל', 'Ortal', 33.085, 35.759, 'golan'),
    ('אלוני הבשן', 'Alonei HaBashan', 33.044, 35.839, 'golan'),
    ('אל-רום', 'El Rom', 33.18, 35.772, 'golan'),
    ('אפיק', 'Afik', 32.779, 35.701, 'golan'),
    ('נטור', 'Natur', 32.854, 35.751, 'golan'),
    ('יונתן', 'Yonatan', 32.938, 35.795, 'golan'),
    ('אבני איתן', 'Avnei Eitan', 32.825, 35.767, 'golan'),
    ('מעלה גמלא', "Ma'ale Gamla", 32.89, 35.685, 'golan'),
    ('מרום גולן', 'Merom Golan', 33.132, 35.777, 'golan'),
    ('עין זיוון', 'Ein Zivan', 33.096, 35.796, 'golan'),
    ('קדמת צבי', 'Kidmat Tzvi', 33.03, 35.697, 'golan'),
    ('קשת', 'Keshet', 32.981, 35.809, 'golan'),
    ('יודפת', 'Yodfat', 32.837, 35.272, 'misgav'),  # Hanoch, 12 Nov 2026 (written יטפת)
    ('עין גב', 'Ein Gev', 32.781, 35.639, 'ey'),
    ('אפיקים', 'Afikim', 32.681, 35.578, 'ey'),
    ('אשדות יעקב', "Ashdot Ya'akov", 32.658, 35.581, 'ey'),
    ('בית זרע', 'Beit Zera', 32.688, 35.573, 'ey'),
    ('גינוסר', 'Ginosar', 32.847, 35.523, 'ey'),
    ('גשר', 'Gesher', 32.621, 35.552, 'em'),
    ('תל קציר', 'Tel Katzir', 32.705, 35.618, 'ey'),
    ('חוקוק', 'Hukok', 32.88, 35.494, 'ey'),
    ('מולדת', 'Moledet', 32.586, 35.44, 'gilboa'),
    ('עין חרוד', 'Ein Harod', 32.559, 35.394, 'gilboa'),
    ('גבים', 'Gevim', 31.507, 34.599, 'sh'),
    ('דקל', 'Dekel', 31.195, 34.345, 'eshkol'),
    ('נירים', 'Nirim', 31.335, 34.395, 'eshkol'),
    ('עין השלושה', 'Ein HaShlosha', 31.351, 34.401, 'eshkol'),
    ('ניר עם', 'Nir Am', 31.519, 34.581, 'sh'),
    ('נען', "Na'an", 31.884, 34.857, 'gezer'),
    ('עידן', 'Idan', 30.806, 35.299, 'arava'),
    ('אילת', 'Eilat', 29.557, 34.95, 'eilat'),
    ('יטבתה', 'Yotvata', 29.896, 35.06, 'eilot'),
    ('מעוז חיים', "Ma'oz Haim", 32.493, 35.551, 'em'),
    ('ניר דוד', 'Nir David', 32.503, 35.457, 'em'),
    ('כמהין', 'Kmehin', 30.91, 34.431, 'rn'),
    ('ניצנה', 'Nitzana', 30.885, 34.422, 'rn'),  # Hanoch, 12 Nov 2026 (written ניתנה)
    ('יד נתן', 'Yad Natan', 31.653, 34.706, 'lachish'),
    ('רמת יוחנן', 'Ramat Yohanan', 32.793, 35.121, 'zev'),
    ('כפר המכבי', 'Kfar HaMaccabi', 32.791, 35.115, 'zev'),  # Hanoch, 12 Nov 2026 (written טפר מכבי)
    ('כברי', 'Kabri', 33.021, 35.149, 'ma'),
    ('נתיב השיירה', 'Netiv HaShayara', 32.993, 35.136, 'ma'),
    ('בן עמי', 'Ben Ami', 33.004, 35.124, 'ma'),
    ('בצת', 'Betzet', 33.071, 35.135, 'ma'),
    ('עין המפרץ', 'Ein HaMifratz', 32.904, 35.096, 'ma'),
    ('שמרת', 'Shomrat', 32.95, 35.097, 'ma'),
    ('יקב רמת הגולן', 'Golan Heights Winery', 32.992, 35.693, 'katzrin'),
]
IL_REGIONS = {  # key: (en, he): regional or local council, north to south
    'ma': ('Mateh Asher Regional Council', 'מועצה אזורית מטה אשר'),
    'my': ("Ma'ale Yosef Regional Council", 'מועצה אזורית מעלה יוסף'),
    'mg': ('Merom HaGalil Regional Council', 'מועצה אזורית מרום הגליל'),
    'ge': ('Upper Galilee Regional Council', 'מועצה אזורית גליל עליון'),
    'mh': ("Mevo'ot HaHermon Regional Council", 'מועצה אזורית מבואות החרמון'),
    'metula': ('Metula Local Council', 'מועצה מקומית מטולה'),
    'golan': ('Golan Regional Council', 'מועצה אזורית גולן'),
    'katzrin': ('Katzrin Local Council', 'מועצה מקומית קצרין'),
    'misgav': ('Misgav Regional Council', 'מועצה אזורית משגב'),
    'ey': ('Emek HaYarden Regional Council', 'מועצה אזורית עמק הירדן'),
    'em': ("Emek HaMa'ayanot Regional Council", 'מועצה אזורית עמק המעיינות'),
    'gilboa': ('Gilboa Regional Council', 'מועצה אזורית גלבוע'),
    'zev': ('Zevulun Regional Council', 'מועצה אזורית זבולון'),
    'gezer': ('Gezer Regional Council', 'מועצה אזורית גזר'),
    'lachish': ('Lakhish Regional Council', 'מועצה אזורית לכיש'),
    'sh': ("Sha'ar HaNegev Regional Council", 'מועצה אזורית שער הנגב'),
    'eshkol': ('Eshkol Regional Council', 'מועצה אזורית אשכול'),
    'rn': ('Ramat HaNegev Regional Council (Nitzana area)', 'מועצה אזורית רמת נגב (פתחת ניצנה)'),
    'arava': ('Central Arava Regional Council', 'מועצה אזורית הערבה התיכונה'),
    'eilot': ('Hevel Eilot Regional Council', 'מועצה אזורית חבל אילות'),
    'eilat': ('Eilat', 'אילת'),
}

PROJECT_ROWS = [  # projects table
    ("Mexico", "מקסיקו", ("Net houses", "בתי רשת"), 150000),
    ("India", "הודו", ("Net houses", "בתי רשת"), 80000),
    ("Honduras", "הונדורס", ("Net houses", "בתי רשת"), 70000),
    ("Spain", "ספרד", ("Net houses", "בתי רשת"), 60000),
    ("Georgia", "גאורגיה", ("Net houses", "בתי רשת"), 50000),
    ("Portugal", "פורטוגל", ("Avocado net house", "בית רשת לאבוקדו"), None),
    ("Belarus", "בלארוס", ("Advanced fish-farming systems", "מערכות מתקדמות לגידול דגים"), None),
    ("Greece", "יוון", ("Agricultural project", "פרויקט חקלאי"), None),  # Hanoch, 12 Nov 2026
]

FEATURED = [  # Q q14: the five projects the owners want shown. Regions only until approval (O2).
    (("Kiwi", "קיווי"), ("Upper Galilee area", "באזור הגליל העליון"), ("Net house with a pergola trellis", "בית רשת עם הדליית סוכה")),
    (("Bananas", "בננות"), ("Western Galilee area", "באזור הגליל המערבי"), ("Banana net house with 11% net", "בית רשת לבננות עם רשת 11%")),
    (("Apples", "תפוחים"), ("Golan Heights, Israel", "רמת הגולן"), ("Net house for orchards", "בית רשת למטעים")),
    (("Cherries", "דובדבנים"), ("Israel", "ישראל"), ("Net house for orchards", "בית רשת למטעים")),
    (("Avocado", "אבוקדו"), ("Portugal", "פורטוגל"), ("Avocado net house", "בית רשת לאבוקדו")),
]

STAGES = [  # Q q3 rows marked "us" (2): 11 stages. (phase, title, receive). Merav 11 Nov 2026: "איתור" first, no maintenance
    (("Find", "איתור"), [
        (("Finding the land", "איתור הקרקע"), ("Land or a site that suits the project, found with you.", "קרקע או שטח שמתאימים לפרויקט, שמאתרים יחד איתכם.")),
    ]),
    (("Assess", "בדיקה"), [
        (("Soil testing and crop fit", "בדיקת קרקע והתאמת גידול"), ("Soil test results and a crop recommendation for your site.", "תוצאות בדיקת קרקע והמלצה על גידול מתאים לשטח.")),
        (("Business plan and budget", "תוכנית עסקית ותקציב"), ("A business plan and budget for your farm.", "תוכנית עסקית ותקציב לחווה שלכם.")),
    ]),
    (("Design", "תכנון"), [
        (("Farm design", "תכנון החווה"), ("Structures, irrigation and roads laid out as one farm.", "מבנים, השקיה ודרכים, מתוכננים כחווה אחת.")),
    ]),
    (("Build", "הקמה"), [
        (("Structures and net houses", "מבנים ובתי רשת"), ("Net houses, shade solutions and windbreaks, made in our plant and built to the design.", "בתי רשת, פתרונות הצללה ושוברי רוח, מיוצרים במפעל שלנו ומוקמים לפי התכנון.")),
        (("Irrigation systems", "מערכות השקיה"), ("Irrigation installed and working before planting.", "מערכת ההשקיה מותקנת ופועלת לפני השתילה.")),
        (("Procurement and logistics", "רכש ולוגיסטיקה"), ("Materials bought, shipped and on site when the schedule needs them.", "חומרים נרכשים, נשלחים ומגיעים לשטח בזמן שלוח הזמנים דורש.")),
        (("Planting", "שתילה"), ("The orchard or crop planted and established.", "המטע או הגידול נשתלים ומתבססים.")),
    ]),
    (("Operate", "תפעול"), [
        (("Local team", "צוות מקומי"), ("Local workers recruited, trained and managed on site.", "עובדים מקומיים מגויסים, מודרכים ומנוהלים בשטח.")),
        (("Growing and agronomy", "גידול ואגרונומיה"), ("Day-to-day growing management, season after season.", "ניהול גידול שוטף, עונה אחרי עונה.")),
        (("Harvest and marketing", "קטיף ושיווק"), ("The crop harvested and marketed.", "היבול נקטף ומשווק.")),
    ]),
]

TYPES = [  # Net houses page, organized by crop (market research implication 1)
    {"id": "banana", "img": "valley",
     "h": ("Banana net houses", "בתי רשת לבננות"), "crops": ("Bananas", "בננות"),
     "rows": [
         (("Net", "רשת"), ("11% shade net: light and airy.", "רשת צל 11%: קלה ואוורירית.")),
         (("Protects against", "מגן מפני"), ("Wind, hail and other weather damage in winter. In summer it saves water by reducing evaporation, and gives the plants better growing conditions.", "רוח, ברד ופגעי מזג האויר בחורף. בקיץ חוסך מים כי הוא מפחית התאדות, ונותן לצמחים תנאי גידול טובים יותר.")),
         (("Structure", "מבנה"), ("Large spans between poles. Trellising and plant support are part of the structure.", "מפתחים גדולים בין העמודים. ההדליה ומערכת התמיכה לשתילים הן חלק מהמבנה.")),
     ], "cap": ("A large net house in the Galilee, built by MIFTAH", "בית רשת גדול בגליל, שהקימה מיפתח")},  # 2.2
    {"id": "orchard", "img": "forest",
     "h": ("Orchard net houses", "בתי רשת למטעים"), "crops": ("Apple, pear, cherry, peach, nectarine, apricot, lemon, kiwi, avocado, persimmon", "תפוח, אגס, דובדבן, אפרסק, נקטרינה, משמש, לימון, קיווי, אבוקדו, אפרסמון"),
     "rows": [
         (("Net", "רשת"), ("10% to 30% shade, chosen for the crop.", "10% עד 30% צל, לפי הגידול.")),
         (("Protects against", "מגן מפני"), ("Hail and sunburn during flowering and fruit set, when trees are most sensitive and extreme weather can seriously damage the yield.", "ברד וכוויות שמש בפריחה ובחנטה, כשהעצים הכי רגישים ומזג אוויר קיצוני עלול לפגוע משמעותית ביבול.")),
         (("Structure", "מבנה"), ("Built so the nets fold away in winter and spread in spring. Automatic folding systems can be added.", "בנוי כך שהרשת מתקפלת בחורף ונפרסת באביב. אפשר להוסיף מערכת פריסה וקיפול אוטומטית.")),
         (("Trellising", "הדליה"), ("Support systems for the crop, such as a pergola-shaped trellis for kiwi.", "מערכות תמיכה לגידול, כמו הדליה בצורת סוכה לקיווי.")),
     ], "cap": ("A net house with a pine forest behind it, built by MIFTAH", "בית רשת על רקע יער אורנים, שהקימה מיפתח")},  # 2.3, 3.1
    {"id": "sheds", "img": None,
     "h": ("Shade solutions for work areas", "פתרונות הצללה לאזורי תפעול"), "crops": ("Shade for work areas", "יצירת הצללה לאזורי תפעול"),
     "rows": [
         (("Shade solutions for work areas", "פתרונות הצללה לאזורי תפעול"), ("Shade structures for loading, unloading and handling the produce. Wide spans leave room for trucks and carts to manoeuvre.", "סככות צל להעמסה, לפריקה ולטיפול בתוצרת החקלאית. מפתחים רחבים משאירים מקום לתמרון של משאיות ועגלות.")),
         (("Net to order", "רשת לפי הזמנה"), ("Shade percentage and color chosen with you. An opening and closing system can be added for bad weather.", "אחוז הצל והצבע נבחרים איתכם. אפשר להוסיף מערכת פתיחה וסגירה למזג אוויר קשה.")),
     ], "cap": None},  # 2.4, 2.5
    {"id": "service", "img": None,
     "h": ("Windbreaks in the orchard", "שוברי רוח במטע"), "crops": ("Wind protection without a full cover", "להתמודדות עם רוח ללא כיסוי מלא"),
     "rows": [
         (("Windbreaks", "שוברי רוח"), ("For areas where wind is a problem but the crop does not need a full cover overhead", "בשטחים בהם יש קושי בהתמודדות עם רוחות אך אין צורך בכיסוי מלא מעל הגידול החקלאי")),
     ], "cap": None},  # 2.6
]

VALUES = [  # Q q23 (client's own words), OS credo
    (("We keep our word", "מילה זו מילה"), ("What we agree is what gets built.", "מה שסוכם הוא מה שנבנה.")),
    (("Like family", "כמו משפחה"), ("Clients stay with us for years. They know there is someone to rely on.", "לקוחות נשארים איתנו שנים. הם יודעים שיש על מי לסמוך.")),
    (("Made to measure", "תפור למידה"), ("Every structure is fitted to the client's crop, land and requirements.", "כל מבנה מותאם לגידול, לקרקע ולדרישות של הלקוח.")),
]

# ---------------------------------------------------------------- pages
PAGES = {
    "index": {
        "title": ("MIFTAH Projects: Where agriculture feels at home | Net houses", "מיפתח פרויקטים - חקלאות שיש לה בית | בתי רשת למטעים"),
        "desc": ("MIFTAH Projects designs, makes and builds agricultural projects and steel-structure net houses in Israel and around the world, and builds turnkey agricultural farms abroad with business and farming partners.", "מיפתח פרויקטים מתכננת, מייצרת ומקימה פרויקטים חקלאיים ובתי רשת מקונסטרוקציית פלדה בישראל ובעולם, כמו כן עוסקת בהקמת חוות חקלאיות עד מפתח בחו״ל יחד עם שותפים עסקיים וחקלאיים."),
        "h1": ("We design, make and build net houses for orchards and bananas.", "אנחנו מתכננים, מייצרים ומקימים בתי רשת למטעים ולבננות."),
        "lead": ("Galvanized-steel net houses against hail, wind and sun, made in our own plant, built by our crews in Israel and by local crews we train and manage abroad, for more than 20 years. For investors abroad, complete turnkey farms with agricultural partners.",
                 "בתי רשת מפלדה מגולוונת נגד ברד, רוח ושמש, מיוצרים במפעל שלנו ומוקמים בידי הצוותים שלנו בישראל ובידי צוותים מקומיים שאנחנו מדריכים ומנהלים בחו״ל, כבר יותר מ-20 שנה. ולמשקיעים בחו״ל: חוות מפתח שלמות, יחד עם שותפים חקלאיים."),
        "cta2": ("For investors: turnkey farms", "למשקיעים: חוות מפתח"),
        "vidcap": ("Drone footage of a net house built by MIFTAH", "צילום רחפן של בית רשת שהקימה מיפתח"),
        "routes_h": ("Ways to work with us", "דרכי התקשרות"),
        "r1_who": ("For growers and agricultural companies", "למגדלים ולחברות חקלאיות"),
        "r1_h": ("Net houses and agricultural projects", "בתי רשת ופרויקטים חקלאיים"),
        "r1_p": ("Net houses for orchards and bananas, loading sheds and windbreaks. We map your needs on site, engineer the structure, make it in our plant, install it and maintain it.",
                 "בתי רשת למטעים ולבננות, סככות העמסה ושוברי רוח. ממפים את הצרכים בשטח, מתכננים הנדסית, מייצרים במפעל שלנו, מקימים ומתחזקים."),
        "r1_go": ("Net houses and structures", "בתי רשת ומבנים"),
        "r2_who": ("For investors, agricultural companies and entrepreneurs", "למשקיעים, לחברות חקלאיות וליזמים"),
        "r2_h": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"),
        "r2_p": ("A complete farm on your land, from soil testing and a business plan to planting, a local team, growing and marketing. Delivered by MIFTAH together with agricultural partners.",
                 "חווה שלמה על הקרקע שלכם, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול ושיווק. מיפתח מבצעת את זה יחד עם שותפים חקלאיים."),
        "r2_go": ("Turnkey farms", "חוות מפתח"),
        "draw_h": ("What a MIFTAH net house is made of", "ממה עשוי בית רשת של מיפתח"),
        "draw_p": ("Every structure is engineered for the crop, the soil and the wind on its site. These are the parts we design, make and install.",
                   "כל מבנה מתוכנן הנדסית לגידול, לקרקע ולרוח באתר שלו. אלה החלקים שאנחנו מתכננים, מייצרים ומקימים."),
        "steps_h": ("From your land to a finished net house, in four steps", "מהקרקע שלכם ועד בית רשת גמור, בארבעה שלבים"),
        "steps_p": ("Four steps, the same on every project, in Israel or abroad.", "ארבעה שלבים, אותו סדר בכל פרויקט, בישראל ובחו״ל."),
        "map_h": ("Projects on three continents", "פרויקטים בשלוש יבשות"),
        "map_p": ("Net houses in Mexico, India, Honduras, Spain and Georgia, an avocado net house in Portugal, a complex project in Belarus, and a project in Greece.",
                  "בתי רשת במקסיקו, בהודו, בהונדורס, בספרד ובגאורגיה, בית רשת לאבוקדו בפורטוגל, פרויקט מורכב בבלארוס ופרויקט ביוון."),
        "map_go": ("All projects", "לכל הפרויקטים"),
        "why_h": ("Clients stay because a word is a word.", "לקוחות נשארים, כי מילה זו מילה."),
        "why_statement": ("You get peace of mind, and time to focus on your crop and your business.", "אתם מרוויחים שקט, וזמן להתמקד בגידול ובפיתוח העסק."),  # 4.6
        "why_refs": ("References from clients in Israel and Portugal are available after a first conversation.", "המלצות מלקוחות בישראל ובפורטוגל זמינות אחרי שיחה ראשונה."),  # 3.5
    },
    "net-houses": {
        "title": ("Net houses and farm structures for growers | MIFTAH Projects", "בתי רשת חקלאיים: תכנון, ייצור והקמה | מיפתח פרויקטים"),
        "desc": ("Banana net houses with 11% net, orchard net houses with 10–30% net that fold in winter, shade solutions for work areas and windbreaks. Designed, made and installed by MIFTAH.",
                 "בתי רשת לבננות עם רשת 11%, בתי רשת למטעים עם רשת 10%–30% שמתקפלת בחורף, פתרונות הצללה לאזורי תפעול ושוברי רוח: מתוכננים, מיוצרים במפעל שלנו ומוקמים בידי מיפתח."),
        "h1": ("Net houses and agricultural projects", "בתי רשת ופרויקטים חקלאיים"),
        "lead": ("We design, make and build net houses for agricultural crops, shade solutions for work areas, windbreaks, and trellising and support systems for crops. One address from the first enquiry, through a site visit and understanding the client's needs, making and preparing the material, to installation and handover.", "אנחנו מתכננים, מייצרים ומקימים בתי רשת לגידולים חקלאיים, פתרונות הצללה לאזורי תפעול, שוברי רוח ומערכות הדליה ותמיכה לגידולים. כתובת אחת החל מהפנייה הראשונית דרך ביקור בשטח והבנת צרכי הלקוח, ייצור והכנת החומר, התקנה ומסירה ללקוח."),
        "types_h": ("By crop and by use", "לפי גידול ולפי שימוש"),
        "types_h2": ("Shade solutions, windbreaks and service", "פתרונות הצללה, שוברי רוח ושירות"),
        "draw_h": ("The parts of the structure", "החלקים של המבנה"),
        "steps_h": ("From site visit to handover", "מהביקור בשטח ועד המסירה"),
        "steps_p": ("The same four steps on every project, from the first site visit to handover.", "אותם ארבעה שלבים בכל פרויקט, מהביקור הראשון בשטח ועד המסירה ללקוח."),
        "site_h": ("Designed for the site and the client", "מתוכנן בהתאם לשטח וללקוח"),
        "site_p": ("Before designing a structure, we look at the grower's requirements, the site conditions, the crop's needs, the soil, drainage, the region and the local wind pattern. Each project is fitted to what the site requires, so the client gets the best solution for them.", "לפני שמתכננים מבנה, בודקים את דרישות המגדל, תנאי השטח, צרכי הגידול, הקרקע, הניקוז, אזור גאוגרפי ומשטר הרוחות המקומי לצרכי התכנון. כל פרויקט מותאם ספציפית לדרישות שעולות מהשטח ובכך מייצר אופטימיזציה ללקוח."),
        "abroad_h": ("Abroad", "בחו״ל"),
        "abroad_p": ("Abroad, we find the land, design the project and see it built on site.", "בחו״ל אנחנו מאתרים את השטח, מתכננים את הפרויקט ודואגים לביצוע בשטח."),  # 3.2
    },
    "turnkey-farms": {
        "title": ("Turnkey agricultural farms for investors | MIFTAH Projects", "חוות חקלאיות עד מפתח למשקיעים | מיפתח פרויקטים"),
        "desc": ("A complete farm on your land abroad, from soil testing and a business plan to planting, a local team, growing and marketing. Delivered with business partners and growers.",
                 "חווה שלמה על הקרקע שלכם בחו״ל, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול ושיווק. מיפתח מבצעת יחד עם שותפים עסקיים וחקלאים."),
        "h1": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"),
        "lead": ("For investors, agricultural companies and entrepreneurs who want a working farm on their land, without hiring a contractor, an agronomist and a site manager separately.",
                 "למשקיעים, לחברות חקלאיות וליזמים שרוצים חווה פעילה על הקרקע שלהם, בלי לשכור בנפרד קבלן, אגרונום ומנהל עבודה."),
        "honest_h": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"),
        "honest_p": ("We provide a complete turnkey agricultural solution: from finding the right land, through design, construction and setting up every system, to handing over a working farm ready to run. The infrastructure and structures draw on more than two decades of experience in Israel and around the world.",
                     "החברה מספקת פתרון חקלאי מלא במתכונת \"עד מפתח\" - החל מאיתור השטח המתאים, דרך התכנון, ההקמה וההטמעה של כלל המערכות, ועד למסירת חווה פעילה ומוכנה להפעלה. התשתיות והמבנים מבוססים על ניסיון מצטבר של למעלה משני עשורים בישראל וברחבי העולם."),  # 1.4, D4
        "stages_h": ("11 stages, and what you receive at each", "11 שלבים, ומה מקבלים בכל אחד"),
        "cta_tk": ("Discuss your land abroad", "דברו איתנו על הקרקע בחו״ל"),
        "profile_go": ("Company profile for your board", "פרופיל החברה להנהלה או לשותפים"),
        "stages_p": ("One path, from the soil to the harvest.", "מסלול אחד, מהקרקע ועד הקטיף."),
        "excl_h": ("What stays with you", "מה נשאר אצלכם"),
        "excl_1": ("Local licensing and permits, with your local advisers.", "רישוי והיתרים מקומיים, עם היועצים המקומיים שלכם."),  # q3 r2
        "excl_2": ("Ongoing reporting to owners and investors on budget and progress, with your own advisers.", "דיווח שוטף לבעלים ולמשקיעים על תקציב והתקדמות, עם היועצים שלכם."),  # q3 r12 ("not us")
        "mistake_h": ("The most common mistake", "הטעות הנפוצה ביותר"),
        "mistake_p": ("Investors trying to set up the farm by themselves to save money.",
                      "משקיעים שמנסים להקים את החווה לבד כדי לחסוך כסף."),  # 4.7
        "pt_h": ("Net houses in Portugal", "בתי רשת בפורטוגל"),
        "pt_p": ("The client came to us on the recommendation of a long-standing client, and we led the project from design through to building the avocado farm and its net houses. Another project that shows we can deliver complete turnkey agricultural solutions for entrepreneurs and investors around the world.",
                 "הלקוח הגיע אלינו בעקבות המלצה של לקוח ותיק, ואנו ליווינו את הפרויקט משלב התכנון ועד להקמת חוות האבוקדו ובתי הרשת בפועל. זהו פרויקט נוסף הממחיש את יכולתנו לספק פתרונות חקלאיים מלאים במתכונת \"עד מפתח\" עבור יזמים ומשקיעים ברחבי העולם."),  # 3.1, 3.5, 3.6
        "core_h": ("Structures at the core of the farm", "המבנים בלב החווה"),
        "core_p": ("The net houses, shade solutions and windbreaks of a turnkey farm are the same structures we design, make and build for growers.",
                   "בתי הרשת, פתרונות ההצללה ושוברי הרוח של חוות מפתח הם אותם מבנים שאנחנו מתכננים, מייצרים ומקימים לחקלאים."),
        "core_go": ("How we build net houses", "איך אנחנו בונים בתי רשת"),
        "where_h": ("Where", "איפה"),
        "where_p": ("Portugal and other European countries, India, Africa and other markets.",
                    "פורטוגל ומדינות נוספות באירופה, הודו, אפריקה ושווקים נוספים."),  # 4.1, 4.2
    },
    "banana-net-houses": {
        "title": ("Banana net houses: 11% net, wide spans | MIFTAH Projects", "בתי רשת לבננות: רשת 11%, מפתחים רחבים | מיפתח פרויקטים"),
        "desc": ("Banana net houses with an 11% shade net over wide spans, with trellising built in. Designed, made in our own plant and built by MIFTAH Projects.",
                 "בתי רשת לבננות עם רשת צל 11% על פני מפתחים רחבים, עם הדליה מובנית. מתוכננים, מיוצרים במפעל שלנו ומוקמים בידי מיפתח, בישראל ובחו״ל."),
        "h1": ("Banana net houses", "בתי רשת לבננות"),
        "lead": ("Protection from wind, hail and other weather damage, and less water lost to evaporation in the hot season.",
                 "הגנה מפני רוח, ברד ופגעי מזג האויר, ופחות מים שמתאדים בעונה החמה."),  # 2.2
    },
    "orchard-hail-nets": {
        "title": ("Orchard hail nets: apples, pears, cherries, stone fruit, lemons | MIFTAH Projects", "רשת נגד ברד למטעים: תפוחים, אגסים, דובדבנים, אפרסקים, לימונים | מיפתח פרויקטים"),
        "desc": ("Hail nets for apple, pear, cherry, peach, nectarine, apricot, lemon and kiwi orchards: a 10–30% shade net on a structure that folds away in winter. Designed, made and built by MIFTAH Projects.",
                 "רשת נגד ברד למטעי תפוחים, אגסים, דובדבנים, אפרסקים, נקטרינות, משמשים, לימונים וקיווי: רשת צל 10%–30% על מבנה שמתקפל בחורף. מתוכננים, מיוצרים ומוקמים בידי מיפתח פרויקטים."),
        "h1": ("Hail nets for orchards", "רשת נגד ברד למטעים"),
        "lead": ("A 10–30% shade net over the orchard, mainly against hail and sunburn at flowering and fruit set. The structure lets the net fold away in winter and spread again in spring.",
                 "רשת צל 10%–30% מעל המטע, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה. המבנה מאפשר לרשת להתקפל בחורף ולהיפרס שוב באביב."),  # 2.3
    },
    "projects": {
        "title": ("Net house projects on three continents | MIFTAH Projects", "בתי רשת בשלוש יבשות: הפרויקטים | מיפתח פרויקטים"),
        "desc": ("Millions of m² of agricultural projects around the world: Portugal, Spain, Mexico, India, Honduras, Georgia, Belarus, Greece and Africa, and net houses in Israel.",
                 "מיליוני מ״ר של פרויקטים חקלאיים בעולם: בפורטוגל, בספרד, במקסיקו, בהודו, בהונדורס, בגאורגיה, בבלארוס, ביוון ובאפריקה, ובישראל: בתי רשת לקיווי, לבננות, לתפוחים ולדובדבנים."),
        "h1": ("Net-house projects in Israel and around the world", "פרויקטים של בתי רשת בישראל ובעולם"),
        "lead": ("Net houses on three continents. We design the project and manage the work on site until handover to the client.", "בתי רשת בשלוש יבשות. אנחנו מתכננים את הפרויקט ומנהלים את הביצוע בשטח עד המסירה ללקוח."),  # 3.2
        "map_h": ("Abroad", "בחו״ל"),
        "tbl_cap": ("Projects around the world", "פרויקטים בעולם"),
        "il_h": ("Where we have built in Israel", "איפה עבדנו בישראל"),
        "il_p": ("Kibbutzim, moshavim and farms, from the Golan Heights to Eilat.", "קיבוצים, מושבים וחוות, מרמת הגולן ועד אילת."),  # Hanoch, 12 Nov 2026
        "th_country": ("Country", "מדינה"), "th_work": ("Project", "פרויקט"),
        "feat_h": ("Selected projects", "פרויקטים נבחרים"),
        "how_h": ("How we work abroad", "איך אנחנו עובדים בחו״ל"),
        "how": [(("We design the project", "מתכננים את הפרויקט"), ("Fitted to the site and the crop.", "בהתאמה לשטח ולגידול.")),  # 2.8
                (("We train and manage local crews", "מדריכים ומנהלים צוותים מקומיים"), ("Together with the client through the whole build.", "יחד עם הלקוח לאורך כל ההקמה.")),  # 3.2
                (("We manage the build until handover", "מנהלים את הביצוע עד המסירה"), ("We take care of manufacturing, shipping and training the local crews, or build turnkey.", "דואגים לייצור, לשילוח ולהדרכת הצוותים המקומיים או להקמה עד מפתח.")),  # 1.2, 3.3
                (("A reference from Portugal", "המלצה מפורטוגל"), ("Our client there is willing to give one, on request.", "הלקוח שלנו שם מוכן להמליץ, לפי בקשה."))],  # 3.5
        "feat_th": (("Crop", "Structure", "Region"), ("גידול", "מבנה", "אזור")),
        "feat_p": ("We name clients only with their permission. References from clients in Israel and Portugal on request.",
                   "שמות לקוחות מופיעים רק באישורם. המלצות מלקוחות בישראל ובפורטוגל, לפי בקשה."),  # q13, O2, 3.5, D6
    },
    "about": {
        "title": ("About MIFTAH Projects: a family company in Israel", "אודות מיפתח פרויקטים: חברה משפחתית שבונה לחקלאים"),
        "desc": ("MIFTAH Projects is a family company at Kibbutz Kfar Masaryk, Israel, owned and run by Merav and Yiftach Hasfel, designing and building agricultural projects since 2003.",
                 "מיפתח פרויקטים היא חברה משפחתית בקיבוץ כפר מסריק, בבעלות ובניהול של מרב ויפתח הספל. החברה מתכננת, מייצרת ומקימה בתי רשת ופרויקטים חקלאיים מאז 2003."),
        "h1": ("A family company for agricultural projects", "חברה משפחתית לפרויקטים חקלאיים"),
        "lead": ("Since 2003 we have designed, made and built agricultural projects: net houses for agricultural crops, shade solutions for work areas, windbreaks, and support and trellising solutions, in Israel and all around the world. Our office and plant are at Kibbutz Kfar Masaryk.",
                 "מאז 2003 אנחנו מתכננים, מייצרים ומקימים פרויקטים חקלאיים: בתי רשת לגידולים חקלאיים, פתרונות הצללה לאזורי תפעול, שוברי רוח ופתרונות תמיכה והדליה בישראל ובעולם כולו. המשרד והמפעל שלנו בקיבוץ כפר מסריק."),  # 1.6, 1.7, 1.10, 2.1-2.5
        "people_h": ("The owners", "הבעלים"),
        "yiftach": ("Yiftach Hasfel", "יפתח הספל"), "yiftach_r": ("Owner and Chairman", "בעלים ויו״ר"),
        "yiftach_p": ("Building practical engineer, a Technion graduate, and head of engineering at the company. Responsible for mapping the client's needs, shaping the engineering solution, managing development, quality control, supervising manufacturing and leading the work on site. Many years of experience managing and leading complex projects in Israel and around the world, combining engineering thinking, precise design and end-to-end delivery, to the highest standards of professionalism and quality.", "הנדסאי בניין, בוגר הטכניון, ומוביל התחום ההנדסי בחברה. אחראי על מיפוי צורכי הלקוח, גיבוש הפתרון ההנדסי, ניהול הפיתוח, בקרת האיכות, הפיקוח על תהליכי הייצור והובלת הביצוע בשטח. בעל ניסיון רב שנים בניהול, תכלול והובלת פרויקטים מורכבים בארץ ובעולם, תוך שילוב בין חשיבה הנדסית, תכנון מדויק ויכולת ביצוע מקצה לקצה, בסטנדרטים הגבוהים ביותר של מקצועיות ואיכות."),  # 5.1
        "merav": ("Merav Eyal Hasfel", "מרב איל הספל"), "merav_r": ("CEO", "מנכ״לית"),
        "mgmt_k": ("Management", "הנהלה"),
        "mgmt": ("Merav Eyal Hasfel, CEO, and Yiftach Hasfel, owner and chairman", "מרב איל הספל, מנכ״לית, ויפתח הספל, בעלים ויו״ר"),  # the about table (Merav, 11 Nov 2026)
        "merav_p": ("BA in Business Administration. Leads the company's activity and is responsible for finance, business development, marketing and sales. The main contact for new projects, with personal support, strategic thinking and high standards of professionalism and service.", "בעלת תואר ראשון במנהל עסקים, מובילה את פעילות החברה ומופקדת על ניהול הכספים, הפיתוח העסקי, השיווק והמכירות. משמשת כאשת הקשר הראשית לפרויקטים חדשים, תוך מתן ליווי אישי, חשיבה אסטרטגית והקפדה על סטנדרטים גבוהים של מקצועיות ושירות."),  # 5.2, q40
        "how_h": ("How we work", "איך אנחנו עובדים"),
        "how_p": ("Our own plant makes the poles, nets, cables and fittings, and checks them before they ship. Our installation crews are trained for work at height and run several projects in parallel. The team brings together Israelis and agronomy students from abroad who come to study in Israel.",
                  "המפעל שלנו מייצר את העמודים, הרשתות, הכבלים והאביזרים ובודק אותם לפני היציאה לשטח. צוותי ההקמה שלנו בעלי הכשרה לעבודה בגובה ועובדים בכמה פרויקטים במקביל. בצוות עובדים ישראלים לצד סטודנטים לאגרונומיה מחו״ל שמגיעים ללמוד בישראל."),  # 1.7, 1.9, 5.4
        "values_h": ("Why clients stay with us", "למה לקוחות נשארים איתנו"),
        "company_h": ("Company details", "פרטי החברה"),
    },
    "contact": {
        "title": ("Discuss your project | MIFTAH Projects", "דברו איתנו על הפרויקט | מיפתח פרויקטים"),
        "desc": ("Tell MIFTAH Projects where your land is, what you grow and how large it is, and we'll arrange a first conversation. Office: +972 4 985 4404.",
                 "ספרו למיפתח פרויקטים איפה הקרקע, מה מגדלים ומה גודל השטח, ונתאם שיחה ראשונה. משרד: 04-9854404, כפר מסריק."),
        "h1": ("Discuss your project", "דברו איתנו על הפרויקט"),
        "lead_off": ("Call our office. To keep the call short, prepare your project details below: where the land is, what you grow and how large it is.",
                     "התקשרו אלינו למשרד. כדי שהשיחה תהיה קצרה, הכינו כאן את פרטי הפרויקט: איפה הקרקע, מה מגדלים ומה גודל השטח."),  # O1
        "call_pill": ("Call {phone}", "התקשרו: {phone}"),
        "lead": ("Tell us where the land is, what you grow or plan to grow, and how large it is. We'll contact you to arrange a first conversation, and a visit to the site when the project fits.",
                 "ספרו לנו איפה הקרקע, מה מגדלים או מתכננים לגדל, ומה גודל השטח. נחזור אליכם כדי לתאם שיחה ראשונה, וביקור בשטח כשהפרויקט מתאים."),
        "aside_phone_h": ("Prefer to talk?", "מעדיפים לדבר?"),
        "aside_phone_p": ("Call our office. The office is in Israel (UTC+2, UTC+3 in summer).", "התקשרו אלינו למשרד."),
        "aside_profile_h": ("For your board or partners", "להנהלה או לשותפים"),
        "aside_profile_p": ("A one-page company profile to print or save as PDF.", "פרופיל חברה בעמוד אחד, להדפסה או לשמירה כ-PDF."),
        "aside_profile_go": ("Open the company profile", "לפרופיל החברה"),
        "aside_partner_h": ("Partners and suppliers", "שותפים וספקים"),
        "aside_partner_p": ("Agri-tech, farm-management or supply company? Tell us in the form what you would like to do together, or call.", "חברת אגרו-טק, ניהול חוות או אספקה? ספרו לנו בטופס מה תרצו לעשות יחד, או התקשרו."),
        "aside_office_h": ("Office", "משרד"),
    },
    "profile": {
        "title": ("Company profile | MIFTAH Projects", "פרופיל החברה | מיפתח פרויקטים"),
        "desc": ("A one-page profile of MIFTAH Projects: net houses and agricultural projects, turnkey farms abroad, process, projects and contact. Printable as a PDF.",
                 "פרופיל של מיפתח פרויקטים בעמוד אחד: בתי רשת ופרויקטים חקלאיים, חוות מפתח בחו״ל, תהליך העבודה, פרויקטים ופרטי קשר. ניתן להדפסה כ-PDF."),
        "h1": ("Company profile", "פרופיל החברה"),
        "print": ("Print or save as PDF", "הדפסה או שמירה כ-PDF"),
        "bar_p": ("One page to attach to a quote or hand out at a meeting.", "עמוד אחד לצרף להצעת מחיר או לחלק בפגישה."),
        "who": ("MIFTAH Projects is a family company owned and run by Merav and Yiftach Hasfel, based at Kibbutz Kfar Masaryk. It specialises in designing, manufacturing and building advanced agricultural projects in Israel and around the world, among them net houses, support and trellising systems, and finding and developing agricultural farms worldwide. With engineering expertise, its own manufacturing and many years of complex projects, we deliver complete turnkey solutions from the idea to handover, with uncompromising quality, professionalism and personal service.", "מיפתח פרויקטים היא חברה משפחתית בבעלות ובניהול מרב ויפתח הספל, הפועלת מקיבוץ כפר מסריק. החברה מתמחה בתכנון, ייצור והקמה של פרויקטים חקלאיים מתקדמים בארץ ובעולם, בהם בתי רשת, מערכות תמיכה והדליה, ואיתור ופיתוח חוות חקלאיות ברחבי העולם. בזכות שילוב של מומחיות הנדסית, יכולות ייצור עצמאיות וניסיון רב שנים בביצוע פרויקטים מורכבים, אנו מספקים פתרונות מפתח מלאים משלב הרעיון ועד למסירה, תוך הקפדה בלתי מתפשרת על איכות, מקצועיות ושירות אישי."),
        "svc_h": ("What we build", "מה אנחנו בונים"),
        "turn_h": ("Turnkey agricultural farms (with partners)", "חוות חקלאיות עד מפתח (עם שותפים)"),
        "proc_h": ("How a project runs", "איך מתנהל פרויקט"),
        "proj_h": ("Projects abroad", "פרויקטים בחו״ל"),
        "contact_h": ("Contact", "יצירת קשר"),
        "web": ("www.miftah.co.il", "www.miftah.co.il"),
    },
    "how-we-build": {
        "title": ("How a net house is built, step by step | MIFTAH Projects", "כך בונים בית רשת, שלב אחרי שלב | מיפתח פרויקטים"),
        "desc": ("Scroll and watch a MIFTAH net house go up: marking out, galvanized poles, cables, net, closing, irrigation and planting, hail and winter.",
                 "גללו וראו איך מקימים בית רשת של מיפתח: סימון, עמודים מגולוונים, כבלים, רשת, סגירה, השקיה ושתילה, ברד וחורף."),
        "h1": ("How a net house is built", "כך בונים בית רשת"),
        "lead": ("Scroll down and watch one go up: from bare soil, through marking out the site, digging the anchors, pouring concrete for the poles, laying out the cables and raising the poles, and lifting and sewing the net, to a protected orchard.",
                 "גללו למטה וראו אותו עולה: מאדמה חשופה, דרך סימון השטח, חפירת העוגנים, פיזור בטונים לעמודים, פריסת כבלים והעמדת העמודים, והרמת רשת ותפירה, ועד מטע מוגן."),
    },
    "privacy": {
        "title": ("Privacy | MIFTAH Projects", "מדיניות פרטיות | מיפתח פרויקטים"),
        "desc": ("How MIFTAH Projects handles the details you send through this website: what is kept, why, where, and how to see, correct or delete it.", "איך מיפתח פרויקטים מטפלת בפרטים שנשלחים דרך האתר: מה נשמר, למה, איפה, ואיך לעיין בהם, לתקן או למחוק."),
        "h1": ("Privacy", "מדיניות פרטיות"),
    },
    "accessibility": {
        "title": ("Accessibility statement | MIFTAH Projects", "הצהרת נגישות | מיפתח פרויקטים"),
        "desc": ("Accessibility statement for the MIFTAH Projects website: the standard it follows (IS 5568, WCAG AA), what was tested, known limits, and how to report a problem.", "הצהרת הנגישות של אתר מיפתח פרויקטים: התקן שלפיו הוא נבנה (ת״י 5568), מה נבדק, מגבלות ידועות ואיך לדווח על בעיה."),
        "h1": ("Accessibility statement", "הצהרת נגישות"),
    },
    "404": {
        "title": ("Page not found | MIFTAH Projects", "העמוד לא נמצא | מיפתח פרויקטים"),
        "desc": ("This page doesn't exist.", "העמוד הזה לא קיים."),
        "h1": ("This page doesn't exist.", "העמוד הזה לא קיים."),
        "p": ("The link may be old, or the address may have a typo. These pages will get you back on track:", "ייתכן שהקישור ישן או שיש טעות בכתובת. אפשר להמשיך מכאן:"),
    },
}

CROP_PAGES = {  # one page per search intent; every line traces to the ledger
    "banana-net-houses": {
        "crop": "banana", "prefill": "banana", "img": "valley", "cap": ("A large net house in the Galilee, built by MIFTAH", "בית רשת גדול בגליל, שהקימה מיפתח"),
        "spec_h": ("The net house, in short", "בית הרשת, בקצרה"),
        "rows": [(("Net", "רשת"), ("11% shade net, light and airy", "רשת צל 11%, קלה ואוורירית")),
                 (("Protects", "מגינה"), ("From wind, hail and other weather damage, and it saves water in the hot season by reducing evaporation. Better growing conditions for the plants.", "מפני רוח, ברד ופגעי מזג האויר, ובעונה החמה חוסכת מים כי היא מפחיתה התאדות. תנאי גידול טובים יותר לצמחים.")),
                 (("Structure", "מבנה"), ("Large spans between poles", "מפתחים גדולים בין העמודים")),
                 (("Structure and support", "מבנה ותמיכה"), ("Trellising and plant support are part of the structure", "ההדליה ומערכת התמיכה הן חלק מהמבנה")),
                 (("Season", "עונה"), ("All year; in the hot season it saves water and gives the plants the best conditions, by reducing evaporation and giving shade", "כל השנה, בעונה החמה חוסך מים ונותן לצמחים את התנאים הטובים ביותר, על ידי הפחתת ההתאדות ומתן הצללה")),
                 (("Scope", "היקף"), ("We design and build the whole structure.", "אנחנו מתכננים ומקימים את כל המבנה."))],  # 2.2, 4.2, CL 28 Oct
        "proj": [(("Western Galilee area, Israel", "באזור הגליל המערבי, ישראל"), ("Banana net house with 11% net", "בית רשת לבננות עם רשת 11%"))],  # 3.1
        "faq": [(("Which net is used over bananas?", "איזו רשת שמים מעל בננות?"), ("An 11% shade net: light and airy, over wide spans.", "רשת צל 11%: קלה ואוורירית, על פני מפתחים רחבים.")),
                (("How is a banana net house linked to grants?", "איך בית רשת קשור למענקים בבננות?"), ("In the Ministry of Agriculture's 2023 development plan, grants for irrigation and trellising in bananas are approved only when the planting is under an existing or new net house. Check the current procedure before you apply.", "בתוכנית הפיתוח של משרד החקלאות לשנת 2023, מענקים למערכת השקיה ולהדליה בבננות מאושרים רק כשהנטיעה תחת בית רשת קיים או חדש. כדאי לבדוק את הנוהל העדכני לפני ההגשה.")),  # E1
                (("Does the net save water?", "הרשת חוסכת מים?"), ("Yes. In the hot season it reduces evaporation, so the plantation needs less water.", "כן. בעונה החמה היא מפחיתה התאדות, כך שהמטע צריך פחות מים."))],  # 2.2
    },
    "orchard-hail-nets": {
        "crop": "apple", "prefill": "", "img": "p-poles", "cap": ("Galvanized poles from our plant, set out on site to the design", "עמודים מגולוונים מהמפעל שלנו, מוצבים בשטח לפי התכנון"),
        "spec_h": ("The net house, in short", "בית הרשת, בקצרה"),
        "rows": [(("Net", "רשת"), ("10% to 30% shade, chosen for the crop", "10% עד 30% צל, לפי הגידול")),
                 (("Crops", "גידולים"), ("Apples, pears, cherries, peaches, nectarines, apricots, lemons, kiwi and more", "תפוחים, אגסים, דובדבנים, אפרסקים, נקטרינות, משמשים, לימונים, קיווי ועוד")),  # Hanoch, 12 Nov 2026
                 (("Protects", "מגינה"), ("Against hail and sun damage at every stage of growth", "מפני ברד ופגעי שמש בכל שלבי הגידול")),
                 (("Season", "עונה"), ("The net folds away in winter and spreads in spring, by hand or with an automatic system", "הרשת מתקפלת בחורף ונפרסת באביב, ידנית או במערכת אוטומטית")),
                 (("Trellising", "הדליה"), ("Support for the crop, such as a pergola trellis for kiwi", "תמיכה לגידול, כמו הדליית סוכה לקיווי")),
                 (("Crops", "גידולים"), ("Apple, cherry, kiwi, avocado, persimmon", "תפוח, דובדבן, קיווי, אבוקדו, אפרסמון")),
                 (("Scope", "היקף"), ("We design and build the whole structure.", "אנחנו מתכננים ומקימים את כל המבנה."))],  # 2.1, 2.3
        "proj": [(("Golan Heights, Israel", "רמת הגולן, ישראל"), ("Apple net house", "בית רשת לתפוחים")), (("Israel", "ישראל"), ("Cherry orchard net house", "בית רשת למטע דובדבנים")),
                 (("Upper Galilee area, Israel", "באזור הגליל העליון, ישראל"), ("Kiwi net house with a pergola trellis", "בית רשת לקיווי עם הדליית סוכה")), (("Portugal", "פורטוגל"), ("Avocado net house", "בית רשת לאבוקדו"))],  # 3.1
        "faq": [(("Which net protects apples and cherries from hail?", "איזו רשת מגינה על תפוחים ודובדבנים מברד?"), ("A 10–30% shade net, mainly against hail and sunburn at flowering and fruit set.", "רשת צל 10%–30%, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה.")),
                (("Can the net fold away in winter?", "הרשת יכולה להתקפל בחורף?"), ("Yes. The structure is built so the net folds away in winter and spreads in spring, by hand or automatically.", "כן. המבנה בנוי כך שהרשת מתקפלת בחורף ונפרסת באביב, ידנית או אוטומטית.")),
                (("Can an orchard net house get a grant?", "אפשר לקבל מענק לבית רשת במטע?"), ("In the Ministry of Agriculture's 2023 development plan, net houses for apples, lychee, figs and kiwi are listed among the supported items, in certain tracks and on certain conditions. Check the current procedure before you apply.", "בתוכנית הפיתוח של משרד החקלאות לשנת 2023, בתי רשת לתפוחים, ליצ'י, תאנים וקיווי מופיעים בין נושאי הסיוע, במסלולים ובתנאים מסוימים. כדאי לבדוק את הנוהל העדכני לפני ההגשה.")),  # E1
                (("Do you build kiwi pergolas?", "אתם בונים סוכות לקיווי?"), ("Yes. The pergola trellis is built together with the net house.", "כן. הדליית הסוכה נבנית יחד עם בית הרשת."))],  # 2.3, 2.5
    },
}
CROP_PAGE = {"proj_h": ("Built by MIFTAH", "מה שהקמנו"), "proj_note": ("References from clients in Israel and Portugal on request.", "המלצות מלקוחות בישראל ובפורטוגל, לפי בקשה."),
             "steps_h": ("How a project runs", "איך מתנהל פרויקט"), "faq_h": ("Questions", "שאלות"),
             "more": ("More about banana net houses", "עוד על בתי רשת לבננות"), "more_orchard": ("More about hail nets for orchards", "עוד על רשת נגד ברד למטעים")}

NET_FAQ_H = ("Questions about net houses", "שאלות על בתי רשת")
GRANT_Q = (("Is there a grant for a net house in Israel?", "יש מענק לבית רשת בישראל?"),
           ("The Investment Administration of the Ministry of Agriculture recognizes net houses for orchards and bananas in its development plan, in certain tracks and on certain conditions. Tracks and conditions change from year to year, so check the current procedure on the Ministry of Agriculture's website before you apply.",
            "מנהלת ההשקעות במשרד החקלאות מכירה בבתי רשת למטעים ולבננות בתוכנית הפיתוח שלה, במסלולים ובתנאים מסוימים. המסלולים והתנאים משתנים משנה לשנה, ולכן כדאי לבדוק את הנוהל העדכני באתר משרד החקלאות לפני ההגשה."))  # ledger E1 (external)
EXISTING_Q = (("What about windbreaks and crop support systems?", "מה לגבי שוברי רוח ומערכות תמיכה לגידול?"),
              ("We also offer windbreaks without a full net cover over the whole orchard, and a range of trellising and crop support systems.",
               "אנו מציעים גם פתרונות לשוברי רוח ללא כיסוי רשת מלא על כל המטע וכן מציעים מגוון פתרונות למערכות הדליה ותמיכה לגידול עצמו."))  # 2.6; other suppliers' structures: O14
NET_FAQ = [  # every answer is a ledger fact (numbers in comments)
    (("What is an agricultural net house?", "מה זה בית רשת חקלאי?"),
     ("A structure of galvanized-steel poles and steel cables with a net over the crop. It protects orchards and crops from hail, sun, wind and other weather damage, saves water by reducing evaporation, and raises the quality and quantity of the crop grown under it.",
      "מבנה של עמודי פלדה מגולוונת וכבלי פלדה, עם רשת מעל הגידול. הוא מגן על המטע ועל הגידולים החקלאיים מפני ברד, שמש, רוח ופגעי מזג אויר נוספים, חוסך מים כי הוא מפחית התאדות ומעלה את איכות וכמות היבול שגדלה תחתיו.")),  # 2.2, 2.3, 2.8
    (("Which net is used over bananas?", "איזו רשת שמים מעל בננות?"),
     ("An 11% shade net: light and airy, over wide spans, with trellising and support built in.",
      "רשת צל 11%: קלה ואוורירית, על פני מפתחים רחבים, עם הדליה ותמיכה מובנות.")),  # 2.2
    (("Which net protects apples and cherries from hail?", "איזו רשת מגינה על תפוחים ודובדבנים מברד?"),
     ("A 10–30% shade net, mainly against hail and sunburn at flowering and fruit set. The structure can let the net fold away in winter and spread again in spring, by hand or automatically.", "רשת צל 10%–30%, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה. המבנה יכול לאפשר לרשת להתקפל בחורף ולהיפרס שוב באביב, ידנית או אוטומטית.")),  # 2.3
    (("Who makes the poles, cables and nets?", "מי מייצר את העמודים, הכבלים והרשתות?"),
     ("Raw materials are ordered from the manufacturers to a production plan, then worked and fitted to the site in our plant. Poles, nets, cables and connecting fittings are packed and pass quality control before they are sent to the site.",
      "חומרי הגלם מוזמנים מהיצרנים בכפוף לתוכנית יצור ועוברים עיבוד והתאמה לשטח אצלנו במפעל. עמודים, רשתות, כבלים ואביזרים לחיבור, נארזים ועוברים בקרת איכות לפני שהם נשלחים לשטח.")),  # 1.7
    (("What happens before a quote?", "מה קורה לפני הצעת מחיר?"),
     ("We receive a topographic map and the grower's requirements, check the data and make a preliminary design to build the client's quote.",
      "אנו מקבלים מפה טופוגרפית ודרישות מהחקלאי, בודקים את הנתונים ועושים תכנון ראשוני לטובת בניית הצעת מחיר ללקוח.")),  # 2.8, 4.3
    (("Are there other shade solutions?", "יש פתרונות הצללה נוספים?"),
     ("Yes, we also provide shade for agricultural work areas and for loading and unloading produce: a solution that suits the movement of forklifts, trucks, tractors and carts.",
      "כן, אנחנו נותנים פתרונות הצללה גם לאזורי תפעול חקלאיים, העמסה ופריקת התוצרת החקלאית: פתרון שמתאים לתנועה של מלגזות, משאיות, טרקטורים ועגלות.")),  # 2.4-2.6
]
NET_FAQ += [EXISTING_Q, GRANT_Q]

FAQ = [  # every answer is a ledger fact (numbers in comments)
    (("How is the price set?", "איך נקבע המחיר?"),
     ("Each project and structure is designed carefully to the needs and requirements the client presents, and the quote follows from that.", "כל פרויקט ומבנה מתוכנן בקפידה לפי הצרכים והדרישות שהוצגו על ידי הלקוח, והצעת המחיר יוצאת בהתאם לכך.")),  # 2.8, 4.3
    (("Do you work outside Israel?", "אתם עובדים מחוץ לישראל?"),
     ("Yes. We have worked in Portugal, Spain, Mexico, India, Honduras, Georgia, Belarus, Greece and Africa, and managed complex projects including design, manufacturing and building on site. Abroad, we design the project and manage the work on site.", "כן. עבדנו בפורטוגל, בספרד, במקסיקו, בהודו, בהונדורס, בגאורגיה, בבלארוס, ביוון ובאפריקה, וניהלנו פרויקטים מורכבים כולל תכנון, ייצור והקמה בשטח. בחו״ל אנחנו מתכננים את הפרויקט ומנהלים את הביצוע בשטח.")),  # 3.2, 3.3
    (("Who delivers a turnkey farm?", "מי מבצע חוות מפתח?"),
     ("MIFTAH, with business partners and growers. Finding, designing and building the project from start to finish, under one roof.", "מיפתח, יחד עם שותפים עסקיים וחקלאים. איתור, תכנון והקמת הפרויקט מתחילתו ועד סופו, תחת קורת גג אחת.")),  # 1.4, q3
    (("Can I talk to one of your clients?", "אפשר לדבר עם לקוח שלכם?"),
     ("Certainly. We will gladly give you the names of clients who work with us.", "כן בהחלט, נשמח לתת שמות של לקוחות שעובדים איתנו.")),  # 3.5
]
NEXT_H = ("What happens after you get in touch", "מה קורה אחרי שפונים")
NEXT = [  # 2.8, 4.3, 1.7 (no response-time promise until the owners give one)
    (("A first conversation", "שיחה ראשונה"), ("We talk about the crop, the land and your timing.", "מדברים על הגידול, הקרקע ולוח הזמנים שלכם.")),
    (("A visit to the site", "ביקור בשטח"), ("Defining the project, mapping the site and understanding the needs of the crop and the project.", "אפיון הפרויקט, מיפוי השטח והבנת צרכי הגידול והפרויקט.")),
    (("Design and quote", "תכנון והצעת מחיר"), ("A preliminary design to prepare the quote.", "הכנת תוכנית ראשונית לצורך מתן הצעת מחיר.")),
    (("Approval and go-ahead", "אישור ויציאה לדרך"), ("Approving the quote, agreeing the schedule and starting the project.", "אישור הצעת המחיר, סגירת לוחות זמנים ויציאה לתחילת הפרויקט.")),
    (("Manufacture and installation", "ייצור והקמה"), ("Once the quote is approved: detailed design, procurement, manufacturing and building on site.", "לאחר אישור ההצעה: תכנון מפורט, רכש, ייצור והקמה בשטח.")),
]
NEXT_ABROAD = ("Abroad, the steps run a little differently.", "בחו״ל השלבים מתנהלים בצורה קצת שונה.")  # 3.2

FAQ_H = ("Before you get in touch", "לפני שפונים")

CTA_HEADS = {  # a different opening line per page
    "home": ("Tell us about your land.", "ספרו לנו על הקרקע."),
    "net": ("Tell us about your crop and your land.", "ספרו לנו על הגידול ועל החלקה."),
    "turnkey": ("Tell us about your land abroad.", "ספרו לנו על הקרקע בחו״ל."),
    "projects": ("Planning a project like these?", "מתכננים פרויקט כזה?"),
    "about": ("Here for you. Talk to us", "פה בשבילכם, דברו איתנו"),
    "banana-net-houses": ("Planning a banana net house?", "מתכננים בית רשת לבננות?"),
    "orchard-hail-nets": ("Want to protect your orchard from hail?", "רוצים להגן על המטע מברד?"),
    "sim": ("Want one like this on your land?", "רוצים כזה על הקרקע שלכם?"),
}
CTA_BAND = {
    "h": ("Tell us about your land.", "ספרו לנו על הקרקע."),
    "p": ("Send the location, the crop and the area, and we'll get back to you to arrange a first conversation.",
          "שלחו מיקום, גידול ושטח, ונחזור אליכם כדי לתאם שיחה ראשונה."),
    "p_off": ("Call us with the location, the crop and the area, or prepare your project details here first.",
              "התקשרו אלינו עם המיקום, הגידול והשטח, או הכינו קודם את פרטי הפרויקט באתר."),  # while the form has no endpoint (O1)
}

FORM_OFFLINE = (  # shown above the form until FORM_ENDPOINT is set (truth ledger O1)
    "This form doesn't send yet. Fill it in to get a short summary of your project, then call {phone} and read it to us.",
    "הטופס עדיין לא שולח. מלאו אותו כדי לקבל סיכום קצר של הפרויקט, והתקשרו אלינו: {phone}.")

FORM = {  # Merav's two-step "needs discovery" form, 10 Nov 2026: a very short first step to capture the lead, then the project
    "step1_h": ("Let's get to know each other", "בואו נכיר"),
    "step1_t": ("Tell us about your project", "ספרו לנו על הפרויקט שלכם"),
    "step2_h": ("Your project", "אפיון הפרויקט"),
    "step2_t": ("A few details that will help us prepare the right solution for you", "כמה פרטים שיעזרו לנו להכין עבורכם פתרון מתאים"),
    "step": ("Step", "שלב"),
    "of": ("of", "מתוך"),
    "time1": ("about a minute", "כדקה"),
    "time2": ("about two minutes", "כשתי דקות"),
    "intro": ("Two short steps, about two minutes in all.", "שני שלבים קצרים, כשתי דקות בסך הכול."),
    "next": ("Continue to the next step", "המשך לשלב הבא"),
    "back": ("Back", "חזרה"),
    "h": ("Your project", "הפרויקט שלכם"),
    "req": ("Fields marked * are required.", "שדות עם * הם חובה."),
    # labels and hints from Merav's review of 10 Nov 2026 (#405-#416)
    "name": ("Full name *", "שם מלא *"),
    "name_hint": ("Who are you?", "מי אתם?"),
    "company": ("Company (optional)", "חברה (אופציונלי)"),
    "role": ("What is your role? (optional)", "מה התפקיד שלכם? (אופציונלי)"),
    "role_hint": ("The role you hold in your organization", "מה התפקיד שממלאים בארגון?"),
    "phone": ("Phone *", "טלפון *"),
    "phone_hint": ("Your phone number; outside Israel, with the country code (+…)", "מה הטלפון שלכם? מחוץ לישראל, עם קידומת המדינה"),  # Merav, #412
    "email": ("Email *", "דואר אלקטרוני *"),
    "email_hint": ("An email address we can reply to", "כתובת דואר אלקטרוני ליצירת קשר"),
    "country": ("Which country are you contacting us from? *", "מאיזו מדינה אתם פונים אלינו? *"),
    "country_pick": ("Choose a country", "בחירת מדינה"),
    "country_top": ["IL", "PT", "ES"],  # shown first; the full list (src/data/countries.json) follows in alphabetical order
    "project": ("Which project are you interested in? *", "איזה פרויקט מעניין אתכם? *"),
    "projects": [("farm", ("A complete agricultural farm", "חווה חקלאית מלאה")), ("nethouse", ("A net house", "בית רשת")), ("other", ("Other", "אחר"))],
    "size": ("What is the planned area?", "מה גודל השטח המתוכנן?"),  # free text (Merav, #433)
    "size_hint": ("In hectares or dunam", "בדונם או בהקטר"),
    "stage": ("What stage is the project at?", "באיזה שלב נמצא הפרויקט?"),
    "stages": [("idea", ("A first idea", "רעיון ראשוני")), ("planning", ("Planning", "בתכנון")),
               ("ready", ("We have the land and are ready to start", "יש קרקע ומוכנים להתחיל")), ("expand", ("An existing site: expanding or upgrading", "שטח קיים: הרחבה או שדרוג"))],
    "land": ("A new project or an existing orchard?", "האם מדובר בפרויקט חדש או במטע קיים?"),  # Merav, #423 and #432
    "lands": [("new", ("A new project", "פרויקט חדש")), ("planted", ("An existing orchard", "מטע קיים"))],
    "planting": ("When is planting planned?", "מתי תאריך הנטיעה המתוכנן?"),  # free text (Merav, #448)
    "planting_hint": ("A date, a month or a season", "תאריך, חודש או עונה"),
    "crop": ("Which crop do you want to grow?", "מה סוג הגידול המבוקש?"),  # Merav, #447
    "crop_hint": ("Choose from the list or type, e.g. avocado", "בחרו מהרשימה או הקלידו, למשל אבוקדו"),
    "crop_list": [("Bananas", "בננות"), ("Apples", "תפוחים"), ("Cherries", "דובדבנים"), ("Pears", "אגסים"), ("Peaches", "אפרסקים"), ("Nectarines", "נקטרינות"), ("Apricots", "משמשים"), ("Lemons", "לימונים"), ("Kiwi", "קיווי"), ("Avocado", "אבוקדו"), ("Persimmon", "אפרסמון"), ("Tobacco", "טבק")],
    "message_ph": ("For example: the size of the plot, what you grow today, what the net should protect from", "למשל: גודל החלקה, מה מגדלים היום, ממה הרשת צריכה להגן"),
    "you": ("We'll get back to", "נחזור אל"),
    "edit": ("Edit", "תיקון"),
    "privacy_note": ("We use these details only to get back to you.", "נשתמש בפרטים רק כדי לחזור אליכם."),
    "message": ("Tell us briefly about your need", "ספרו לנו בקצרה על הצורך שלכם"),
    "consent": ("I agree that MIFTAH Projects may use these details to reply to me. See the {privacy}.", "אני מסכים/ה שמיפתח פרויקטים תשתמש בפרטים כדי לחזור אליי. פרטים נוספים ב{privacy}."),
    "privacy_link": ("privacy policy", "מדיניות הפרטיות"),
    "send": ("Send the enquiry", "שלח פנייה"),
    "send_off": ("Show my summary", "הצגת הסיכום"),
    "honeypot": ("Leave this field empty", "השאירו שדה זה ריק"),
}

PRIVACY = {
    "en": [
        ("What we collect", "When you send the contact form, we receive what you fill in: your name, company, role, email and phone; the country; the kind of project, the planned area, the stage, whether it is a new project or an existing orchard and the planting date; the crop and your message. The form also records the page, the language, the time it was sent and how you reached the site (the referring site and any campaign tags in the link). With an enquiry we also note whether the land size meets our usual minimum, to sort enquiries. The site uses no cookies. Like any website, the hosting server keeps standard technical logs (such as IP addresses) for security. Your browser keeps, for that tab only, an unsent form draft and a note of how you reached the site (the first page, the referring site and campaign tags); the globe remembers your language choice. None of this is sent to us unless you send the form."),
        ("Why", "Only to reply to your request, arrange a conversation or a site visit, and prepare a proposal if you ask for one."),
        ("Who sees it", "MIFTAH Projects' management and office staff. We don't sell or share your details. The site is hosted by Vercel Inc. (USA), and the form's delivery service, once connected, processes the message only to deliver it to us; both may process data outside Israel."),
        ("How long", "We keep inquiries for as long as they are needed for the conversation and for our business records, and delete them on request."),
        ("Your rights", "You can ask to see, correct or delete the details you sent, under Israel's Protection of Privacy Law, 5741-1981. Call +972 4 985 4404."),
        ("Statistics", "If we add visitor statistics, we will use a service that doesn't track you across sites, and update this page first."),
        ("Updated", "29 October 2026."),
    ],
    "he": [
        ("מה אנחנו אוספים", "כששולחים את טופס יצירת הקשר, אנחנו מקבלים את מה שמולא: שם, חברה, תפקיד, טלפון ודואר אלקטרוני; המדינה; סוג הפרויקט, השטח המתוכנן, שלב הפרויקט, פרויקט חדש או מטע קיים ומועד הנטיעה; הגידול וההודעה. הטופס רושם גם את העמוד, השפה, מועד השליחה ואיך הגעתם לאתר (האתר המפנה ותגיות קמפיין בקישור, אם יש). עם הפנייה אנחנו גם מציינים אם גודל השטח עומד במינימום הרגיל שלנו, כדי למיין פניות. האתר לא משתמש בעוגיות. כמו בכל אתר, שרת האחסון שומר יומני גישה טכניים רגילים (כמו כתובות IP) לצורכי אבטחה. הדפדפן שלכם שומר, רק בלשונית הזאת, טיוטה של טופס שלא נשלח ורישום של איך הגעתם לאתר (העמוד הראשון, האתר המפנה ותגיות קמפיין); הגלובוס זוכר את השפה שבחרתם. שום דבר מאלה לא נשלח אלינו אלא אם שולחים את הטופס."),
        ("לשם מה", "רק כדי לחזור אליכם, לתאם שיחה או ביקור בשטח ולהכין הצעה אם ביקשתם."),
        ("מי רואה את הפרטים", "ההנהלה וצוות המשרד של מיפתח פרויקטים. אנחנו לא מוכרים ולא מעבירים את הפרטים. האתר מאוחסן אצל Vercel Inc. (ארה״ב), ושירות שליחת הטופס, כשיחובר, מעבד את ההודעה רק כדי להעביר אותה אלינו; שניהם עשויים לעבד מידע מחוץ לישראל."),
        ("לכמה זמן", "פניות נשמרות כל עוד הן נחוצות לשיחה ולרישומי העסק, ונמחקות לפי בקשה."),
        ("הזכויות שלכם", "אפשר לבקש לעיין בפרטים, לתקן או למחוק אותם, לפי חוק הגנת הפרטיות, התשמ״א-1981. טלפון: 04-9854404."),
        ("סטטיסטיקה", "אם נוסיף סטטיסטיקת כניסות, נשתמש בשירות שלא עוקב אחריכם בין אתרים, ונעדכן את העמוד הזה קודם."),
        ("עדכון אחרון", "29 באוקטובר 2026."),
    ],
}

A11Y = {
    "en": [
        ("Our commitment", "We want everyone to be able to use this website, including people with disabilities. We designed and built the site to meet Israeli Standard 5568, which follows the Web Content Accessibility Guidelines (WCAG) at level AA, and we keep checking it."),
        ("What we did", "Semantic headings and landmarks; a skip link; keyboard use with visible focus; text contrast of at least 4.5:1 on plain backgrounds, and a darkened layer under text that sits on photos or video; form fields with labels and clear error messages; alternative text for images; pause buttons for the video and the moving list, which stay still for visitors who ask their device to reduce motion; Hebrew and English versions with the correct reading direction."),
        ("Checked with", "Automated checks (axe-core and Lighthouse), contrast sampled over the photos and video, and manual keyboard, zoom and screen-size testing in Chromium, in October 2026. Not yet tested: screen readers, Firefox and Safari."),
        ("Known limits", "The technical drawing and the map are images with full text equivalents next to them. The 3D globe is not keyboard-accessible; the projects table next to it has the same information. If you find anything that doesn't work for you, please tell us."),
        ("Contact for accessibility", "MIFTAH Projects office, Kibbutz Kfar Masaryk, Israel. Phone +972 4 985 4404."),
        ("Updated", "29 October 2026."),
    ],
    "he": [
        ("המחויבות שלנו", "אנחנו רוצים שכולם יוכלו להשתמש באתר, גם אנשים עם מוגבלות. תכננו ובנינו את האתר כך שיעמוד בתקן ישראלי 5568, המבוסס על הנחיות WCAG ברמה AA, ואנחנו ממשיכים לבדוק אותו."),
        ("מה עשינו", "כותרות ואזורים מסומנים; קישור דילוג לתוכן; שימוש במקלדת עם סימון פוקוס ברור; ניגודיות טקסט של 4.5:1 לפחות על רקע אחיד, ושכבה מוכהת מתחת לטקסט שמופיע על תמונות או וידאו; שדות טופס עם תוויות והודעות שגיאה ברורות; טקסט חלופי לתמונות; כפתורי עצירה לסרטון ולרשימה הנגללת, שנשארים במקום אצל מי שביקש מהמכשיר להפחית תנועה; גרסה בעברית ובאנגלית עם כיוון קריאה נכון."),
        ("איך נבדק", "בדיקות אוטומטיות (axe-core ו-Lighthouse), דגימת ניגודיות על התמונות והווידאו, ובדיקה ידנית של מקלדת, הגדלה וגדלי מסך ב-Chromium, באוקטובר 2026. עוד לא נבדק: קוראי מסך, Firefox ו-Safari."),
        ("מגבלות ידועות", "השרטוט הטכני והמפה הם תמונות, ולצידם יש מקבילה טקסטואלית מלאה. הגלובוס התלת-ממדי אינו נגיש במקלדת; טבלת הפרויקטים שלצידו מכילה את אותו מידע. אם משהו לא עובד עבורכם, נשמח שתספרו לנו."),
        ("פנייה בנושא נגישות", "משרד מיפתח פרויקטים, כפר מסריק. טלפון 04-9854404."),
        ("עדכון אחרון", "29 באוקטובר 2026."),
    ],
}

FORM_MSG = {  # messages the form script shows; build.py writes them into the page, {phone} = the office number
    "req": ("Please fill this in.", "נא למלא את השדה."),
    "email": ("Please enter an email address like name@company.com.", "נא להזין כתובת מייל, למשל name@company.com."),
    "reach": ("Please give an email address or a phone number, so we can reply.", "נא להשאיר מייל או טלפון, כדי שנוכל לחזור אליכם."),
    "phone": ("Please enter a phone number in digits, with the country code if outside Israel.", "נא להזין מספר טלפון בספרות."),
    "choose": ("Please choose one.", "נא לבחור אפשרות."),
    "consent": ("Please confirm so we can use these details to reply.", "נא לאשר, כדי שנוכל להשתמש בפרטים ולחזור אליכם."),
    "sending": ("Sending…", "שולחים…"),
    "did_you": ("Did you mean {email}?", "התכוונתם ל-{email}?"),
    "okH": ("✅ Thank you for your enquiry!", "✅ תודה על פנייתכם!"),  # Merav, 10 Nov 2026
    "okP": ("MIFTAH's team specializes in planning and building agricultural farms, greenhouses and net houses in Israel and all around the world. We'll contact you soon to look at the project's needs and offer a tailored solution.",
            "צוות מיפתח מתמחה בתכנון והקמה של חוות חקלאיות, חממות ובתי רשת בישראל ובעולם כולו. ניצור אתכם קשר בהקדם לבחינת צורכי הפרויקט והצעת פתרון מותאם."),
    "badH": ("The request was not sent.", "הבקשה לא נשלחה."),
    "badP": ("Something went wrong on our side. Please try again in a minute, or call {phone}.", "משהו השתבש אצלנו. אפשר לנסות שוב בעוד דקה, או להתקשר: {phone}."),
    "trapP": ("This browser filled in a hidden field, so the request was not sent. Please call {phone}.", "הדפדפן מילא שדה מוסתר, ולכן הבקשה לא נשלחה. נא להתקשר: {phone}."),
    "offH": ("Online sending isn't connected yet.", "השליחה מהאתר עוד לא מחוברת."),
    "offP": ("Your details were not sent. Please call the office, and keep this summary at hand: it has everything we need.", "הפרטים לא נשלחו. נא להתקשר למשרד, והסיכום הזה יעזור: יש בו כל מה שאנחנו צריכים."),
    "copy": ("Copy the summary", "העתקת הסיכום"),
    "copied": ("Copied.", "הועתק."),
    "call": ("Call {phone}", "התקשרו: {phone}"),
    "tk_il": ("Complete turnkey farms are built abroad. In Israel we design and build net houses and agricultural projects.", "חוות מלאות עד מפתח מוקמות בחו״ל. בישראל אנחנו מתכננים ומקימים בתי רשת ופרויקטים חקלאיים."),  # 1.4
    "brief": ("MIFTAH Projects: project enquiry", "מיפתח פרויקטים: פנייה על פרויקט"),
}
FORM_BRIEF_KEYS = [  # summary labels, in order
    ("name", ("Name", "שם")), ("company", ("Company", "חברה")), ("role", ("Role", "תפקיד")), ("phone", ("Phone", "טלפון")), ("email", ("Email", "דואר אלקטרוני")), ("country", ("Country", "מדינה")),
    ("project", ("Project", "פרויקט")), ("size", ("Planned area", "שטח מתוכנן")), ("stage", ("Stage", "שלב")), ("land", ("New or existing", "חדש או קיים")),
    ("planting", ("Planned planting", "מועד נטיעה")), ("crop", ("Crop", "גידול")), ("message", ("Need", "הצורך")),
]

SIM = {  # the 3D page; every line traces to the ledger (numbers in comments)
    "badge": ("Illustration", "הדמיה"),
    "aria": ("Photorealistic illustration, made with AI, of a MIFTAH net house being built, step by step", "הדמיה מציאותית, שנוצרה בבינה מלאכותית, של הקמת בית רשת של מיפתח, שלב אחרי שלב"),
    "scroll": ("Scroll to build", "גללו כדי לבנות"),
    "step": ("Step", "שלב"),
    "note": ("Sizes, spacing and height are not a specification: every project is designed for its crop, the grower's needs, the soil and drainage, and the wind on site.",
             "המידות, המרווחים והגובה אינם מפרט: כל פרויקט מתוכנן לפי הגידול, צורכי המגדל, הקרקע והניקוז ומשטרי הרוחות באתר."),  # no visible illustration labels (Hanoch, 7 Nov 2026)
    "field_h": ("From the field", "מהשטח"),
    "field_p": ("Photos from our projects.", "צילומים מהפרויקטים שלנו."),
    "field": [("f-poles", ("A steel structure going up, with cables", "קונסטרוקציית פלדה בתהליך הקמה עם כבלים")),
              ("f-hailnets", ("Crystal net against wind and hail, being lifted and spread", "רשת קריסטלית להגנה מפגעי רוח וברד בתהליך הרמה ופריסה")),
              ("f-flowers", ("An apple orchard in bloom under a net that protects against hail", "מטע תפוחים בפריחה תחת רשת להגנה מפגעי ברד")),
              ("f-shade", ("A greenhouse with shade net, made to a client's special order", "חממה עם רשת הצללה לפי הזמנה מיוחדת של לקוח"))],  # Hanoch's real photos, 8 Nov 2026
    "nogl": ("This browser can't show the 3D illustration, so here is the section drawing instead.", "הדפדפן הזה לא מציג את ההדמיה התלת-ממדית, אז הנה שרטוט החתך במקומה."),
    "go": ("See how a net house is built, step by step", "ראו איך בונים בית רשת, שלב אחרי שלב"),
    "chapters": [
        (("Design", "תכנון"), ("Site planning", "תכנון השטח"),
         ("Mapping the soil, the client's requirements and the crop's needs, drainage, the wind pattern and more, and then designing the structure and the whole project.", "מיפוי הקרקע, דרישות הלקוח וצרכי הגידול, הניקוז, משטר הרוחות ועוד, ואז מתכננים את המבנה ואת הפרויקט כולו.")),  # 2.8, steps
        (("On site", "בשטח"), ("Marking out", "סימון"),
         ("Pole lines are marked from the engineering design, point by point.", "קווי העמודים מסומנים לפי התכנון ההנדסי, נקודה אחרי נקודה.")),
        (("From our plant", "מהמפעל שלנו"), ("Galvanized poles", "עמודים מגולוונים"),
         ("Poles worked and fitted to the project's needs leave our plant and are set on site, at the span and height the design sets.", "עמודים שעברו עיבוד והתאמה לצרכי הפרויקט ויצאו מהמפעל שלנו מוצבים בשטח, במפתח ובגובה בהתאם לתכנון.")),  # 1.7
        (("At height", "עבודה בגובה"), ("Cables and anchoring", "כבלים ועיגון"),
         ("Steel cables are tensioned between the poles. All our crews are trained to work at height, and we take care over quality and safety.", "כבלי פלדה נמתחים בין העמודים. כל הצוותים שלנו בעלי הכשרה לעבודה בגובה ואנו מקפידים על איכות ובטיחות.")),  # 2.8
        (("The net", "הרשת"), ("Spread row by row", "נפרסת שורה אחרי שורה"),
         ("The net is unrolled over the cables and fixed with dedicated connection fittings, one bay at a time.", "הרשת נפרסת מעל הכבלים ומחוברת באמצעות אביזרי חיבור ייעודיים, מפתח אחרי מפתח.")),
        (("Closing", "סגירה"), ("Side nets and a door", "רשתות צד ודלת"),
         ("Side nets and an entrance door close the structure.", "רשתות בדפנות ודלת כניסה סוגרות את המבנה.")),
        (("Planting", "שתילה"), ("Irrigation, then planting", "השקיה, ואז שתילה"),
         ("First the drip lines are installed, then the saplings are planted under the net.", "תחילה מותקנים קווי הטפטוף, ולאחר מכן שותלים את השתילים מתחת לרשת.")),  # stages 5, 7
        (("What the net does", "מה הרשת עושה"), ("Hail falls between the nets, through special hail-release fittings", "הברד נופל בין הרשתות עם אביזרים מיוחדים לפריקת ברד"),
         ("The net sheds the hail, so it doesn't damage the fruit or load the structure.", "הרשת פורקת את הברד כך שהוא לא פוגע בפרי ולא יוצר עומס על המבנה.")),  # 2.3 (wind: bananas only, 2.2)
        (("Hail release", "פורק ברד"), ("How the hail comes off the net", "איך הברד יורד מהרשת"),
         ("The net is designed so hail rolls into the release areas between the crop rows, where dedicated hail-release fittings let it drop to the ground between the tree rows. This reduces the weight load on the system and protects the crop.",
          "תכנון הרשת מאפשר לברד להתגלגל אל אזורי הפריקה שבין שורות הגידול, שם הוא משתחרר באמצעות אביזרי פריקת ברד ייעודיים ונופל לקרקע בין שורות העצים. מנגנון זה מסייע בהפחתת עומסי משקל על המערכת ובשמירה על הגידול.")),  # Hanoch 8 Nov 2026; Merav ch08 wording; for Yiftach to confirm
        (("Autumn", "סתיו"), ("Folded, then spread again", "מתקפלת ונפרסת מחדש"),
         ("In orchards the net can fold away in winter and spread again in spring, or the other way round as the crop needs, by hand or automatically.", "במטעים הרשת יכולה להתקפל בחורף ולהיפרס שוב באביב, או הפוך בהתאם לצורך הגידול, ידנית או אוטומטית.")),  # 2.3
        (("One address", "כתובת אחת"), ("From design to handover", "מהתכנון ועד המסירה"),
         ("Design, manufacturing, installation and support, in Israel and all around the world.", "תכנון, ייצור, הקמה וליווי, בישראל ובעולם כולו.")),
    ],
}

GLOBE = {
    "h": ("Projects on the globe", "הפרויקטים על הגלובוס"),
    "p": ("Drag to turn it, zoom in on Israel, and tap a point for the project.", "גררו כדי לסובב, התקרבו לישראל, ולחצו על נקודה כדי לראות את הפרויקט."),
    "title": ("Interactive globe of MIFTAH projects", "גלובוס אינטראקטיבי של הפרויקטים של מיפתח"),
    "full": ("Open the globe full screen", "פתיחת הגלובוס במסך מלא"),
    "go": ("Turn the globe", "לסובב את הגלובוס"),
    "loading": ("Loading the globe…", "הגלובוס נטען…"),
}

# ---------------------------------------------------------------- "Open Skies" home (design chosen 28 Oct 2026)
OS = {
    "ticker_label": ("What we build", "מה אנחנו בונים"),
    "ticker": [("Banana net houses", "בתי רשת לבננות"), ("Orchard net houses", "בתי רשת למטעים"), ("Kiwi net houses", "בתי רשת לקיווי"),
               ("Avocado net houses", "בתי רשת לאבוקדו"), ("Shade solutions for work areas", "פתרונות הצללה לאזורי תפעול"), ("Windbreaks", "שוברי רוח"), ("Trellising and support", "הדליה ותמיכה"),
               ("Agricultural planning and development", "תכנון ופיתוח בחקלאות"), ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח")],  # 2.1-2.6, 1.3
    "ticker_pause": ("Pause the scrolling list", "עצירת הרשימה הנגללת"), "ticker_play": ("Pause the scrolling list", "עצירת הרשימה הנגללת"),
    "who_k": ("Who we are", "מי אנחנו"),
    "statement_b": ("Agricultural projects and net houses,", "פרויקטים חקלאיים ובתי רשת,"),
    "statement": (" one address from design to handover, in Israel and around the world.", " כתובת אחת, החל מהתכנון ועד המסירה, בישראל ובעולם כולו."),  # 1.6, 1.7, 2.1
    "sol_h": ("Ways to work with us", "דרכי התקשרות"),
    "sol_p": ("Net houses and agricultural projects, in Israel and abroad. Turnkey farms abroad, delivered with business partners.",
              "בתי רשת ופרויקטים חקלאיים, בישראל ובחו״ל. הקמת חוות עד מפתח בחו״ל, יחד עם שותפים עסקיים."),  # 1.2-1.4, 2.8, D4
    "sols": [
        {"k": ("Structures", "מבנים"), "h": ("Net houses and agricultural projects", "בתי רשת ופרויקטים חקלאיים"), "img": "forest",
         "alt": ("A large white net house below a wooded hillside", "בית רשת לבן וגדול מתחת לגבעה מיוערת"),
         "p": ("Net houses for every type of crop, windbreaks, support and trellising, and shade solutions for work areas. All under one roof: design, manufacturing, installation and support, in Israel and abroad.", "בתי רשת לכל סוגי הגידולים החקלאיים, שוברי רוח, פתרונות תמיכה והדליה, פתרונות הצללה לאזורי תפעול. הכול תחת קורת גג אחת: תכנון, ייצור, הקמה וליווי בארץ ובחו״ל."),
         "chips": [], "href": "net-houses.html"},  # 1.7, 2.1-2.4
        {"k": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"), "h": ("Complete farms worldwide", "חוות שלמות בעולם"), "img": None, "alt": None,  # no photo until a delivered farm can be shown (1.3; registry O1 is a banana net house)
         "p": ("Finding and testing land, a business plan, structures and irrigation, planting, a local team, growing and marketing, and support through the project. Finding business partners.", "איתור ובדיקת קרקע, הכנת תוכנית עסקית, מבנים והשקיה, שתילה, צוות מקומי, גידול ושיווק, ליווי של הפרויקט. מציאת שותפים עסקיים."),
         "chips": [("For investors", "למשקיעים")], "href": "turnkey-farms.html"},  # 1.3, 1.4, 4.2
    ],
    "field_k": ("From the field", "מהשטח"),
    "world_k": ("Where we have built", "איפה בנינו"),
    "world_more": [(("Israel", "ישראל"), ("Kiwi in the Upper Galilee and the Golan Heights; bananas in the Western Galilee, the Carmel coast, the Jordan Valley and the south. Apples, pears, apricots, cherries, blueberries, raspberries, berries, peaches and nectarines in the Upper Galilee and the Golan Heights.", "קיווי בגליל העליון וברמת הגולן, בננות בגליל המערבי, בחוף הכרמל, בבקעת הירדן ובדרום הארץ. תפוחים, אגסים, משמשים, דובדבנים, אוכמניות, פטל, פירות יער, אפרסקים ונקטרינות בגליל העליון וברמת הגולן.")),  # 3.1
                   (("Portugal", "פורטוגל"), ("A farm growing avocado with advanced methods.", "חווה לגידול אבוקדו בצורה מתקדמת.")),
                   (("Belarus", "בלארוס"), ("A complex project for intensive fish farming.", "פרויקט מורכב לגידול דגים בצורה אינטנסיבית."))],  # 3.3, 3.6
    "owners_k": ("Who you deal with", "מול מי עובדים"),
    "path_k": ("Investors", "למשקיעים"),
    "path_h": ("A farm end to end: 11 stages, from the soil to the harvest.", "חווה מקצה לקצה: 11 שלבים, מהקרקע ועד הקטיף."),  # 2 (q3)
}

# ---------------------------------------------------------------- V3 home ("under the net")
HOME3 = {
    "h1": ("Agricultural projects under one roof.", "פרויקטים חקלאיים תחת קורת גג אחת."),
    "lead": ("We design, make and build agricultural projects in Israel and around the world.",
             "אנחנו מתכננים, מייצרים ומקימים פרויקטים חקלאיים בישראל ובעולם כולו."),  # 1.6, 1.7, 2.1-2.3
    "cta2": ("Which net is right for you?", "איזו רשת מתאימה לכם?"),
    "invest": ("Looking for an agricultural investment abroad? We initiate, develop, design and build turnkey farms and agricultural projects, with business partners and growers.", "מחפשים השקעה חקלאית בחו״ל? יזום, פיתוח, תכנון והקמת חוות ופרויקטים חקלאיים עד מפתח, יחד עם שותפים עסקיים וחקלאים."),  # 1.3, 1.4
    "crop_h": ("Which net house for your crop?", "איזה בית רשת מתאים לגידול שלכם?"),
    "crop_p": ("Choose a crop to see its net and structure.", "בחרו גידול כדי לראות את הרשת והמבנה שלו."),
    "crop_proj": ("On a MIFTAH project", "בפרויקט של מיפתח"),
    "crop_cta": ("Discuss a project for this crop", "דברו איתנו על פרויקט לגידול הזה"),
    "crop_ask": ("Ask about your crop", "שאלו על הגידול שלכם"),
    "crop_ill": ("Illustration", "הדמיה"),
    "crop_note": ("Spans, heights and net type are set for each project, to the client's requirements and the crop's needs.", "המפתחים, הגבהים וסוג הרשת נקבעים לכל פרויקט בהתאם לדרישות הלקוח ולצרכי הגידול."),
    "proof_h": ("Net houses on three continents.", "בתי רשת בשלוש יבשות."),  # 3.2
    "proof_p": ("Abroad, we find the land, design the project and see it built on site.", "בחו״ל אנחנו מאתרים את השטח, מתכננים את הפרויקט ודואגים לביצוע בשטח."),  # 3.2, 3.3
    "proof_go": ("All projects, on the globe", "כל הפרויקטים, על הגלובוס"),
    "steps_swipe": ("Swipe sideways for all four steps", "החליקו לצד כדי לראות את ארבעת השלבים"),
    "steps_h": ("From bare soil to a closed net house.", "מאדמה חשופה ועד בית רשת סגור."),
    "steps_p": ("The same four steps on every project, in Israel or abroad.", "אותם ארבעה שלבים בכל פרויקט, בישראל ובחו״ל."),
    "who_h": ("You deal with the owners, and we keep our word.", "אתם עובדים מול הבעלים, ומילה זו מילה."),  # 4.5
    "who_p": ("MIFTAH is a family company at Kibbutz Kfar Masaryk, run by Merav Eyal Hasfel and Yiftach Hasfel. Yiftach, a practical engineer in construction, leads design, production and execution; Merav runs the company, finance, marketing and sales.",
              "מיפתח היא חברה משפחתית בקיבוץ כפר מסריק, בניהול מרב איל הספל ויפתח הספל. יפתח, הנדסאי בניין, מוביל את התכנון, הייצור והביצוע; מרב מנהלת את החברה, הכספים, השיווק והמכירות."),  # 5.1, 5.2
    "who_peace": ("What you get: peace of mind, and time to focus on your crop and your business.", "מה אתם מקבלים: שקט, וזמן להתמקד בגידול ובפיתוח העסק."),  # q25, 4.6
    "who_refs": ("Clients in Israel and Portugal are willing to give a reference. Ask, and we'll put you in touch.", "לקוחות בישראל ובפורטוגל מוכנים להמליץ עלינו. בקשו, ונפגיש ביניכם."),  # 3.5
    "who_go": ("About MIFTAH", "על מיפתח"),
    "inv_h": ("Investing in a farm abroad?", "משקיעים בחווה בחו״ל?"),
    "inv_p": ("A complete farm on your land, delivered by MIFTAH with business partners and growers.",
              "חווה שלמה על הקרקע שלכם, שמיפתח מבצעת יחד עם שותפים עסקיים וחקלאים."),  # q3, 1.4, 4.2
    "inv_note": ("The most common mistake: trying to set up the farm alone to save money.", "הטעות הנפוצה ביותר: לנסות להקים את החווה לבד כדי לחסוך."),  # 4.7
    "inv_go": ("How a turnkey farm works", "איך עובדת חוות מפתח"),
    "sim_go": ("Watch one go up, step by step", "צפו בהקמה, שלב אחרי שלב"),
}

CROPS = [  # the crop selector; every row traces to the ledger. Four rows for every crop: net, protection, structure, season (Hanoch, 10 Nov 2026)
    {"id": "banana", "alt": ("Large white net houses in a valley, from above: a MIFTAH project", "בתי רשת לבנים גדולים בעמק, ממבט מלמעלה: פרויקט של מיפתח"), "label": ("Bananas", "בננות"),
     "say": ("An 11% net, light and airy, over wide spans.", "רשת 11%, קלה ואוורירית, על פני מפתחים רחבים."),
     "rows": [(("Net", "רשת"), ("11% shade net, light and airy", "רשת צל 11%, קלה ואוורירית")),
              (("Protection", "הגנה"), ("From wind, hail and other weather damage; in the hot season it saves water by reducing evaporation", "מפני רוח, ברד, ופגעי מזג האויר ובעונה החמה חוסכת מים כי היא מפחיתה התאדות.")),
              (("Structure", "מבנה"), ("Wide spans, with trellising and support built in", "מפתחים רחבים, עם הדליה ותמיכה מובנות")),
              (("Season", "עונה"), ("All year; in the hot season it saves water and gives the plants the best conditions, by reducing evaporation and giving shade", "כל השנה, בעונה החמה חוסכת מים ונותנת תנאים מיטביים לצמח כי היא מפחיתה התאדות ונותנת צל."))],
     "proj": ("Banana net house with 11% net, in the Western Galilee area", "בית רשת לבננות עם רשת 11%, באזור הגליל המערבי")},  # 2.2, 3.1
    {"id": "apple", "alt": ("White anti-hail net laid in strips over a young orchard, on round galvanized poles", "רשת לבנה נגד ברד שנפרסת ברצועות מעל מטע צעיר, על עמודים מגולוונים עגולים"), "label": ("Orchards", "מטעים"),
     "say": ("Nets that protect against hail and sun damage", "רשתות להגנה מפני ברד ופגעי שמש"),
     "kinds": ("Apples, pears, cherries, peaches, nectarines, apricots, lemons and more", "תפוחים, אגסים, דובדבנים, אפרסקים, נקטרינות, משמשים, לימונים ועוד"),  # Hanoch, 12 Nov 2026
     "rows": [(("Net", "רשת"), ("10–30% shade net", "רשת צל 10%–30%")),
              (("Protection", "הגנה"), ("Against hail and sun damage at every stage of growth", "מפני ברד ופגעי שמש בכל שלבי הגידול")),
              (("Structure", "מבנה"), ("Support and trellising systems for the different crops. Fruit walls.", "מערכות תמיכה והדליה לגידולים השונים. קיר פירותי.")),
              (("Season", "עונה"), ("Spread in spring and folded before winter, by hand or automatically", "נפרסת באביב ומתקפלת לפני החורף, ידנית או אוטומטית"))],
     "proj": ("Apple net house, Golan Heights", "בית רשת לתפוחים, רמת הגולן")},  # 2.3, 3.1, Hanoch 8 Nov
    {"id": "kiwi", "alt": ("Illustration: kiwi vines on a pergola trellis under the net, built as one structure", "הדמיה: צמחי קיווי על הדליית סוכה מתחת לרשת, במבנה אחד"), "label": ("Kiwi", "קיווי"),
     "say": ("Net and trellis built as one, for kiwi", "רשת והדליה כמבנה אחד לקיווי"),
     "rows": [(("Net", "רשת"), ("Chosen for the growing region and the grower's requirements", "נבחרת לפי אזור הגידול ודרישות המגדל")),
              (("Protection", "הגנה"), ("Against hail and sun damage at every stage of growth", "מפני ברד ופגעי שמש בכל שלבי הגידול")),
              (("Structure", "מבנה"), ("Structure and trellis built together, as a pergola or with T-supports", "המבנה וההדליה בשיטת סוכה או בשיטת תומכות T מוקמות יחד")),
              (("Season", "עונה"), ("The net can fold away in winter and spread again in spring", "הרשת יכולה להתקפל בחורף ולהיפרס שוב באביב"))],
     "proj": ("Kiwi net house with a pergola trellis, in the Upper Galilee area", "בית רשת לקיווי עם הדליית סוכה, באזור הגליל העליון")},  # 2.3, 2.5, 3.1 (the orchard page lists kiwi among the orchard crops)
    {"id": "avocado", "alt": ("Illustration: avocado trees in a net house", "הדמיה: עצי אבוקדו בבית רשת"), "label": ("Avocado", "אבוקדו"),
     "say": ("An avocado net house", "בית רשת לאבוקדו"),
     "rows": [(("Net", "רשת"), ("Chosen for the growing region and the grower's requirements", "נבחרת לפי אזור הגידול ודרישות המגדל")),
              (("Protection", "הגנה"), ("Against hail and sun damage at every stage of growth", "מפני ברד ופגעי שמש בכל שלבי הגידול")),
              (("Structure", "מבנה"), ("Galvanized poles from our plant. Abroad, we plan the work, train local crews and manage the build on site", "עמודים מגולוונים מהמפעל שלנו. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח")),
              (("Season", "עונה"), ("The net can fold away in winter and spread again in spring", "הרשת יכולה להתקפל בחורף ולהיפרס שוב באביב"))],
     "proj": ("Avocado net house, Portugal", "בית רשת לאבוקדו, פורטוגל")},  # 2.3, 3.1, 3.5, 3.6 (the orchard page lists avocado among the orchard crops)
    {"id": "other", "alt": ("Net houses and crop rows from above, a MIFTAH project", "בתי רשת ושורות גידול ממבט מלמעלה, פרויקט של מיפתח"), "label": ("Other crops", "גידולים אחרים"),
     "say": ("Persimmon, tobacco and more, plus shade solutions for work areas and windbreaks.", "אפרסמון, טבק ועוד, וגם פתרונות הצללה לאזורי תפעול ושוברי רוח."),
     "rows": [(("Net", "רשת"), ("Chosen for the crop and the site", "נבחרת לפי הגידול והאתר")),
              (("Protection", "הגנה"), ("Tell us the crop and what it needs protecting from. We'll tell you honestly whether a net house fits.", "ספרו לנו מה הגידול וממה צריך להגן עליו. נגיד לכם בכנות אם בית רשת מתאים.")),
              (("Structure", "מבנה"), ("Net houses, shade solutions for work areas with wide spans, windbreaks, trellising; also dismantling and preparing the material for a new structure", "בתי רשת, פתרונות הצללה לאזורי תפעול במפתחים רחבים, שוברי רוח, הדליה; וגם פירוק והכנת החומר למבנה חדש")),
              (("Season", "עונה"), ("Planned for the crop, for example a net that folds in winter and spreads in spring", "לפי הגידול, למשל רשת שמתקפלת בחורף ונפרסת באביב"))],
     "proj": None},  # 2.1, 2.4-2.6
]


# Merav's photos from MIFTAH projects, sent 9 Nov 2026 (WhatsApp). At her request: poles shown as galvanized steel
# ("these are old photos, from when black material was used"), one net colour on the aerial shade photo, the current
# logo on the workers' shirts; workers at height shown with a harness (Hanoch, 8 Nov). Ledger 7d.
GALLERY = {
    "h": ("From our projects", "מהפרויקטים שלנו"),
    "p": ("Net houses, shading, installation, folding and the seasons, photographed on our projects.", "בתי רשת, הצללה, הקמה, קיפול ועונות השנה, מצולמים בפרויקטים שלנו."),
    "groups": [
        (("Net houses", "בתי רשת"), [
            ("g-air-forest", ("A white net house between forest and orchards", "בית רשת לבן בין יער למטעים")),
            ("g-air-valley", ("Large net houses in a valley, next to farm buildings", "בתי רשת גדולים בעמק, ליד מבני משק")),
            ("g-air-rows", ("Net houses and crop rows, from above", "בתי רשת ושורות גידול, מבט מלמעלה")),
            ("g-air-wide", ("A field of white net houses", "שדה של בתי רשת לבנים")),
            ("g-tunnels", ("Arched net houses with a service building", "בתי רשת מקושתים עם מבנה שירות")),
            ("g-tunnel-arch", ("An arched net house with an open front", "בית רשת מקושת עם חזית פתוחה")),
            ("g-dark-house", ("A long net house with dark net side walls", "בית רשת ארוך עם דפנות רשת כהות")),
            ("g-road", ("Net houses along a farm road", "בתי רשת לאורך דרך שדה")),
            ("g-tunnel-colour", ("An arched structure with net and coloured covers", "מבנה מקושת עם רשת ויריעות צבעוניות")),
        ]),
        (("Installation in the field", "הקמה בשטח"), [
            ("g-lift-net", ("Spreading white net from a lift over young plants", "פריסת רשת לבנה מבמת הרמה מעל שתילים צעירים")),
            ("g-cable", ("A worker in a harness tensions a cable before the net goes on", "עובד ברתמה מותח כבל לפני פריסת הרשת")),
            ("g-drape", ("Anti-hail net going up between the poles", "רשת נגד ברד עולה בין העמודים")),
            ("g-lift-field", ("The lift and a field crew while the net is spread", "במת ההרמה וצוות השטח בזמן פריסת הרשת")),
            ("g-basket", ("A worker in a harness in the lift basket, by galvanized poles", "עובד ברתמה בסל במת ההרמה, ליד עמודים מגולוונים")),
            ("g-team", ("Our field crew", "מצוות השטח שלנו")),
        ]),
        (("Shading for work areas", "הצללה לאזורי תפעול"), [
            ("g-shade-op", ("A work-area shade with green shade net", "סככת תפעול עם רשת הצללה ירוקה")),  # Merav: "סככת תפעול"
            ("g-shade-air", ("The same shade, from above", "סככת התפעול, מבט מלמעלה")),
            ("g-blue-shade", ("A blue shade net over a yard", "רשת הצללה כחולה מעל משטח")),
            ("g-orchard-net", ("Blue net beside an orchard", "רשת כחולה ליד מטע")),
        ]),
        (("Under the net", "מתחת לרשת"), [  # stills from the Drive folder "סטילס מצלמה", Hanoch 12 Nov 2026
            ("s089", ("Net strips meeting over the rows, from below", "רצועות הרשת נפגשות מעל השורות, מבט מלמטה")),
            ("s013", ("An orchard alley under two net strips", "מעבר במטע מתחת לשתי רצועות רשת")),
            ("s117", ("The ridge line between two strips", "קו הרכס בין שתי רצועות")),
            ("s095", ("A young orchard under the net", "מטע צעיר מתחת לרשת")),
            ("s001", ("A wide view under the net", "מבט רחב מתחת לרשת")),
            ("s005", ("The net over a young orchard, with a wind turbine", "הרשת מעל מטע צעיר, וטורבינת רוח ברקע")),
            ("s124", ("A tree seen through the net", "עץ שנראה מבעד לרשת")),
            ("s143", ("Sunlight through the net and the clips on the ridge", "אור השמש מבעד לרשת והתפסים על הרכס")),
            ("s110", ("Vines climbing under the net", "גפנים מטפסות מתחת לרשת")),
        ]),
        (("Structure and poles", "המבנה והעמודים"), [
            ("s099", ("A galvanized ladder-frame end post", "עמוד קצה מגולוון במבנה סולם")),
            ("s101", ("The cable bolted through a galvanized frame", "הכבל מוברג דרך מסגרת מגולוונת")),
            ("s216", ("Perimeter poles leaning outward, with guy cables", "עמודי שוליים נוטים החוצה, עם כבלי עיגון")),
            ("s230", ("End posts and the net rolled on the cable", "עמודי קצה והרשת מגולגלת על הכבל")),
            ("s250", ("The edge of the structure, with a wind turbine", "שולי המבנה, וטורבינת רוח ברקע")),
            ("s242", ("The cable grid over the rows", "רשת הכבלים מעל השורות")),
            ("s104", ("Pole rows along an orchard alley", "שורות עמודים לאורך מעבר במטע")),
            ("s226", ("A net house over a young orchard", "בית רשת מעל מטע צעיר")),
        ]),
        (("Folded for winter", "מקופלת לחורף"), [
            ("s128", ("Nets gathered on the ridge cables", "הרשתות אסופות על כבלי הרכס")),
            ("s130", ("Rows of folded net, from the side", "שורות של רשת מקופלת, מבט מהצד")),
            ("s136", ("Folded nets above a blooming field", "רשתות מקופלות מעל שדה פורח")),
            ("s131", ("Nets tied up between the poles", "רשתות קשורות בין העמודים")),
            ("s138", ("Tied net bundles at the pole tops", "צרורות רשת קשורים בראשי העמודים")),
        ]),
        (("Orchards in bloom", "מטעים בפריחה"), [
            ("s199", ("An orchard in bloom under the net", "מטע בפריחה מתחת לרשת")),
            ("s211", ("Blossom rows and a wind turbine", "שורות בפריחה וטורבינת רוח")),
            ("s202", ("Blossom close up, under the net", "פריחה מקרוב, מתחת לרשת")),
            ("s259", ("A blossoming branch under the net", "ענף פורח מתחת לרשת")),
        ]),
        (("Trellising", "הדליה"), [
            ("s154", ("Vines on a pergola trellis under the net", "צמחים על הדליית סוכה מתחת לרשת")),
            ("s160", ("The pergola wires under the net", "חוטי הסוכה מתחת לרשת")),
            ("s147", ("A trellised plot under the net", "חלקה מודלית מתחת לרשת")),
        ]),
        (("From the outside", "מבחוץ"), [
            ("s271", ("Side nets sloping to the ground", "רשתות צד יורדות באלכסון אל הקרקע")),
            ("s273", ("A long side net along a farm road", "רשת צד ארוכה לאורך דרך עפר")),
            ("s277", ("The side of a net house, with the Hermon behind", "דופן בית רשת, והחרמון ברקע")),
            ("s268", ("A closed net house from the side", "בית רשת סגור, מבט מהצד")),
            ("s280", ("A net house corner and a wind turbine", "פינת בית רשת וטורבינת רוח")),
            ("s235", ("The corner of a net house, side net closed", "פינת בית רשת עם רשת צד סגורה")),
            ("s148", ("A net house along a dirt road", "בית רשת לאורך דרך עפר")),
            ("s150", ("A net house gable, from the road", "חזית בית רשת, מבט מהדרך")),
            ("s153", ("A white net house in the landscape", "בית רשת לבן בנוף")),
            ("s189", ("A net house beside a country road", "בית רשת ליד דרך כפרית")),
        ]),
    ],
}
