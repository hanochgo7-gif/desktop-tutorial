"""All website copy, English and Hebrew, in one place.
Every claim must trace to docs/MIFTAH_TRUTH_LEDGER.md (ledger numbers in comments). Edit text here, then run build.py.
Each value is (English, Hebrew)."""

SITE = {
    "name": ("MIFTAH Projects", "מיפתח פרויקטים"),
    "slogan": ("MIFTAH Projects - Where agriculture feels at home", "מיפתח פרויקטים - חקלאות שיש לה בית"),  # 1.13; the company name leads in both languages (Merav, 5 Nov 2026)
    "phone_display": ("+972\u00a04\u00a0985\u00a04404", "04\u20119854404"),  # 1.10
    "phone_tel": "+97249854404",
    "town": ("Kfar Masaryk, Israel", "כפר מסריק"),  # 1.10
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
           (("Office", "משרד"), ("Kfar Masaryk, Israel", "כפר מסריק")),
           (("Work", "תחום"), ("Net houses and agricultural projects", "בתי רשת ופרויקטים חקלאיים")),
           (("Projects", "פרויקטים"), ("Israel and countries around the world", "ישראל ומדינות בעולם"))],
    "video_play": ("Play video", "הפעלת הסרטון"), "video_pause": ("Pause video", "עצירת הסרטון"),
    "noscript": ("Sending this form needs JavaScript. Please call +972 4 985 4404.", "שליחת הטופס דורשת JavaScript. אפשר להתקשר ל-04-9854404."),
    "map_label": ("Map of MIFTAH projects abroad: Mexico, Honduras, Spain, Portugal, Belarus, Georgia and India, and our office in Kfar Masaryk, Israel. The same information is in the projects table.",
                  "מפת הפרויקטים של מיפתח בחו״ל: מקסיקו, הונדורס, ספרד, פורטוגל, בלארוס, גאורגיה והודו, בניהול מכפר מסריק. אותו מידע מופיע בטבלת הפרויקטים."),
    "archive": ("MIFTAH archive", "ארכיון מיפתח"),
}

NAV = [  # (slug, en, he)
    ("net-houses", "Net houses", "בתי רשת"),
    ("how-we-build", "How we build", "כך בונים"),
    ("turnkey-farms", "Turnkey farms", "חוות חקלאיות עד מפתח"),
    ("projects", "Projects", "פרויקטים"),
    ("about", "About", "אודות"),
    ("contact", "Contact", "יצירת קשר"),
]

# ---------------------------------------------------------------- shared blocks
FACTS = [  # once, under the home hero
    (("20+", "20+"), ("designing and building agricultural projects since 2003", "מאז 2003 מתכננים ומקימים פרויקטים חקלאיים")),  # 1.6
    (("Millions of m²", "מיליוני מטרים"), ("of agricultural projects and shade solutions around the world", "מיליוני מ״ר של פרויקטים חקלאיים ופתרונות הצללה בעולם")),  # 3.2
    (("Our plant", "מפעל שלנו"), ("materials processed and made, and quality-checked before they ship", "עיבוד וייצור החומרים ובקרת איכות לפני היציאה לשטח")),  # 1.7
    (("Countries", "מדינות בעולם"), ("where we have worked: Portugal, Spain, Mexico, India, Honduras, Georgia, Belarus and Africa", "שעבדנו בהן: פורטוגל, ספרד, מקסיקו, הודו, הונדורס, גאורגיה, בלארוס ואפריקה")),  # 3.1-3.3
]

STEPS = [  # OS consult (2.8), one real photo each
    ("p-site", ("Site visit and needs assessment", "מיפוי צרכים בשטח"),
     ("We meet you on the land and map the crop, soil, drainage, access and wind.",
      "נפגשים בשטח וממפים את הגידול, הקרקע, הניקוז, הגישה והרוח."),
     ("Setting up on a MIFTAH project site", "התמקמות בשטח, בפרויקט של מיפתח")),
    ("p-marking", ("Engineering design", "תכנון הנדסי"),
     ("We calculate the loads and prepare the drawings and the bill of quantities: the list of materials the quote is based on.",
      "הנדסאי בניין מחשבים עומסים ומכינים שרטוטים וכתב כמויות."),
     ("Marking out the pole lines from the design, with the local crew", "סימון קווי העמודים לפי התכנון, עם הצוות המקומי")),
    ("f-poles", ("Manufacturing in our plant", "ייצור במפעל שלנו"),
     ("After the quote is approved, the poles, nets, cables and fittings are made, then further worked and fitted to the project in our plant.",
      "אחרי אישור הצעת המחיר, העמודים, הרשתות, הכבלים והאביזרים מיוצרים ועוברים עיבוד נוסף והתאמה לפרויקט במפעל שלנו."),
     ("Round galvanized poles from our plant on concrete blocks, set out on site to the design", "עמודים מגולוונים עגולים מהמפעל שלנו על בסיסי בטון, מוצבים בשטח לפי התכנון")),
    ("p-closed", ("Installation and handover", "הקמה ומסירה"),
     ("Our crews, trained for work at height, build the structure and hand it over to you.",
      "הצוותים שלנו, בעלי הכשרה לעבודה בגובה, מקימים את המבנה ומוסרים אותו ללקוח."),
     ("A closed net house with its entrance door", "בית רשת סגור, עם דלת כניסה")),
]

DRAWING = {  # labels for the signature section drawing; numbers match the legend
    "title": ("Section through a MIFTAH net house", "חתך של בית רשת של מיפתח"),
    "items": [
        (("Net", "רשת"), ("10–30% shade for orchards, against hail and sunburn at flowering and fruit set. 11% for bananas, light and airy.",
                         "10%–30% צל למטעים, נגד ברד וכוויות שמש בפריחה ובחנטה. 11% לבננות: רשת קלה ואוורירית.")),  # 2.2, 2.3
        (("Steel cables", "כבלי פלדה"), ("Tensioned across the pole heads to carry the net.", "נמתחים בין ראשי העמודים ונושאים את הרשת.")),  # 2.8
        (("Galvanized steel poles", "עמודי פלדה מגולוונים"), ("Made in our plant, set in rows at the span and height the design calls for.", "מיוצרים במפעל שלנו ומוצבים בשורות, במפתח ובגובה שנקבעו בתכנון.")),  # 1.7
        (("Perimeter anchoring", "עיגון היקפי"), ("Edge cables tie the structure to the ground against wind.", "כבלי שוליים קושרים את המבנה לקרקע מול הרוח.")),
        (("Trellising and support", "הדליה ותמיכה"), ("Built with the structure for the crop: a pergola trellis for kiwi, support for bananas.", "נבנית יחד עם המבנה לפי הגידול: הדליה בצורת סוכה לקיווי, תמיכה לבננות.")),  # 2.2, 3.1
        (("Folding", "קיפול"), ("On orchards, nets can fold away in winter and spread in summer, by hand or automatically.", "במטעים הרשת יכולה להתקפל בחורף ולהיפרס בקיץ, ידנית או אוטומטית.")),  # 2.3
    ],
    "caption": ("Schematic, not to scale. Spans, heights and net type are set for each project.", "סכמה, לא בקנה מידה. המפתחים, הגבהים וסוג הרשת נקבעים לכל פרויקט."),
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
]
HQ = (32.886, 35.103, "Kfar Masaryk", "כפר מסריק")

PROJECT_ROWS = [  # projects table
    ("Mexico", "מקסיקו", ("Net houses", "בתי רשת"), 150000),
    ("India", "הודו", ("Net houses", "בתי רשת"), 80000),
    ("Honduras", "הונדורס", ("Net houses", "בתי רשת"), 70000),
    ("Spain", "ספרד", ("Net houses", "בתי רשת"), 60000),
    ("Georgia", "גאורגיה", ("Net houses", "בתי רשת"), 50000),
    ("Portugal", "פורטוגל", ("Avocado net house", "בית רשת לאבוקדו"), None),
    ("Belarus", "בלארוס", ("A complex project for intensive fish farming: managing the whole project, on schedule, with local manufacturing, shipping and installation on site", "פרויקט מורכב לגידול דגים בצורה אינטנסיבית: תכלול הפרויקט, עמידה בלוח הזמנים, ייצור מקומי, שילוח והתקנה בשטח"), None),
]

FEATURED = [  # Q q14: the five projects the owners want shown. Regions only until approval (O2).
    (("Kiwi", "קיווי"), ("Upper Galilee, Israel", "הגליל העליון"), ("Net house with a pergola trellis", "בית רשת עם הדליית סוכה")),
    (("Bananas", "בננות"), ("Western Galilee, Israel", "הגליל המערבי"), ("Banana net house with 11% net", "בית רשת לבננות עם רשת 11%")),
    (("Apples", "תפוחים"), ("Golan Heights, Israel", "רמת הגולן"), ("Net house for orchards", "בית רשת למטעים")),
    (("Cherries", "דובדבנים"), ("Israel", "ישראל"), ("Net house for orchards", "בית רשת למטעים")),
    (("Avocado", "אבוקדו"), ("Portugal", "פורטוגל"), ("Avocado net house", "בית רשת לאבוקדו")),
]

STAGES = [  # Q q3 rows marked "us" (2): 11 stages. (phase, title, receive)
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
        (("Maintenance", "תחזוקה"), ("Structures and systems kept in working order.", "המבנים והמערכות נשמרים תקינים.")),
        (("Harvest and marketing", "קטיף ושיווק"), ("The crop harvested and marketed.", "היבול נקטף ומשווק.")),
    ]),
]

TYPES = [  # Net houses page, organized by crop (market research implication 1)
    {"id": "banana", "img": "valley",
     "h": ("Banana net houses", "בתי רשת לבננות"), "crops": ("Bananas", "בננות"),
     "rows": [
         (("Net", "רשת"), ("11% shade net: light and airy.", "רשת צל 11%: קלה ואוורירית.")),
         (("Protects against", "מגן מפני"), ("Wind and hail in winter. In summer it saves water by reducing evaporation, and gives the plants better growing conditions.", "רוח וברד בחורף. בקיץ חוסך מים כי הוא מפחית התאדות, ונותן לצמחים תנאי גידול טובים יותר.")),
         (("Structure", "מבנה"), ("Large spans between poles, so a single structure can cover up to 10 ha (100 dunam). Trellising and plant support are part of the structure.", "מפתחים גדולים בין העמודים, כך שמבנה בודד יכול להגיע ל-100 דונם. ההדליה ומערכת התמיכה לשתילים הן חלק מהמבנה.")),
     ], "cap": ("A large net house in a valley, built by MIFTAH", "בית רשת גדול בעמק, שהקימה מיפתח")},  # 2.2
    {"id": "orchard", "img": "forest",
     "h": ("Orchard net houses", "בתי רשת למטעים"), "crops": ("Apple, cherry, kiwi, avocado, persimmon", "תפוח, דובדבן, קיווי, אבוקדו, אפרסמון"),
     "rows": [
         (("Net", "רשת"), ("10% to 30% shade, chosen for the crop.", "10% עד 30% צל, לפי הגידול.")),
         (("Protects against", "מגן מפני"), ("Hail and sunburn during flowering and fruit set, when trees are most sensitive and extreme weather can seriously damage the yield.", "ברד וכוויות שמש בפריחה ובחנטה, כשהעצים הכי רגישים ומזג אוויר קיצוני עלול לפגוע משמעותית ביבול.")),
         (("Structure", "מבנה"), ("Built so the nets fold away in winter and spread in summer. Automatic folding systems can be added.", "בנוי כך שהרשת מתקפלת בחורף ונפרסת בקיץ. אפשר להוסיף מערכת פריסה וקיפול אוטומטית.")),
         (("Trellising", "הדליה"), ("Support systems for the crop, such as a pergola-shaped trellis for kiwi.", "מערכות תמיכה לגידול, כמו הדליה בצורת סוכה לקיווי.")),
     ], "cap": ("A net house with a pine forest behind it, built by MIFTAH", "בית רשת על רקע יער אורנים, שהקימה מיפתח")},  # 2.3, 3.1
    {"id": "sheds", "img": None,
     "h": ("Shade solutions for work areas, and windbreaks", "פתרונות הצללה לאזורי תפעול ושוברי רוח"), "crops": ("For the farm around the orchard", "לחווה שמסביב למטע"),
     "rows": [
         (("Shade solutions for work areas", "פתרונות הצללה לאזורי תפעול"), ("Shade structures for loading, unloading and handling produce. Wide spans leave room for trucks and carts to turn.", "סככות צל להעמסה, לפריקה ולטיפול בתוצרת. מפתחים רחבים משאירים מקום לתמרון של משאיות ועגלות.")),
         (("Net to order", "רשת לפי הזמנה"), ("Shade percentage and color chosen with you. An opening and closing system can be added for bad weather.", "אחוז הצל והצבע נבחרים איתכם. אפשר להוסיף מערכת פתיחה וסגירה למזג אוויר קשה.")),
         (("Windbreaks", "שוברי רוח"), ("Designed and built with the rest of the farm.", "מתוכננים ומוקמים יחד עם שאר החווה.")),
     ], "cap": None},  # 2.4, 2.5
    {"id": "service", "img": None,
     "h": ("Dismantling and reuse", "פירוק ושימוש חוזר"), "crops": ("Over the life of the structure", "לאורך חיי המבנה"),
     "rows": [
         (("Dismantling", "פירוק"), ("Taking structures down, and processing and preparing the material for a new structure when needed.", "פירוק מבנים, ובמידת הצורך עיבוד והכנה של החומר למבנה חדש.")),
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
        "desc": ("Agricultural projects and galvanized-steel net houses, designed, made and installed by MIFTAH Projects in Israel and around the world. Turnkey farms abroad with partners.",
                 "מיפתח פרויקטים מתכננת, מייצרת ומקימה פרויקטים חקלאיים ובתי רשת מפלדה מגולוונת בישראל ובעולם, ומקימה חוות מפתח בחו״ל יחד עם שותפים חקלאיים."),
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
        "r1_min": ("Projects from 5 ha in Israel and 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-300 דונם בחו״ל."),
        "r1_go": ("Net houses and structures", "בתי רשת ומבנים"),
        "r2_who": ("For investors, agricultural companies and entrepreneurs", "למשקיעים, לחברות חקלאיות וליזמים"),
        "r2_h": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"),
        "r2_p": ("A complete farm on your land, from soil testing and a business plan to planting, a local team, growing and marketing. Delivered by MIFTAH together with agricultural partners.",
                 "חווה שלמה על הקרקע שלכם, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול ושיווק. מיפתח מבצעת את זה יחד עם שותפים חקלאיים."),
        "r2_min": ("Projects from 30 ha.", "פרויקטים מ-300 דונם."),
        "r2_go": ("Turnkey farms", "חוות מפתח"),
        "draw_h": ("What a MIFTAH net house is made of", "ממה עשוי בית רשת של מיפתח"),
        "draw_p": ("Every structure is engineered for the crop, the soil and the wind on its site. These are the parts we design, make and install.",
                   "כל מבנה מתוכנן הנדסית לגידול, לקרקע ולרוח באתר שלו. אלה החלקים שאנחנו מתכננים, מייצרים ומקימים."),
        "steps_h": ("From your land to a finished net house, in four steps", "מהקרקע שלכם ועד בית רשת גמור, בארבעה שלבים"),
        "steps_p": ("Four steps, the same on every project, in Israel or abroad.", "ארבעה שלבים, אותו סדר בכל פרויקט, בישראל ובחו״ל."),
        "map_h": ("Projects on three continents", "פרויקטים בשלוש יבשות"),
        "map_p": ("Net houses in Mexico, India, Honduras, Spain and Georgia, an avocado net house in Portugal, and a complex project in Belarus.",
                  "בתי רשת במקסיקו, בהודו, בהונדורס, בספרד ובגאורגיה, בית רשת לאבוקדו בפורטוגל ופרויקט מורכב בבלארוס."),
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
        "lead": ("We design, manufacture and install net houses for agricultural crops, shade solutions for work areas, windbreaks, and trellising and support systems. One address from your first call, through a site visit to understand your needs, manufacturing and preparing the material, to installation and handover.",
                 "אנחנו מתכננים, מייצרים ומקימים בתי רשת לגידולים חקלאיים, פתרונות הצללה לאזורי תפעול, שוברי רוח ומערכות הדליה ותמיכה לגידולים. כתובת אחת, החל מהפנייה הראשונית, דרך ביקור בשטח והבנת צורכי הלקוח, ייצור והכנת החומר, ועד ההתקנה והמסירה ללקוח."),
        "types_h": ("By crop and by use", "לפי גידול ולפי שימוש"),
        "types_h2": ("Shade solutions, windbreaks and service", "פתרונות הצללה, שוברי רוח ושירות"),
        "draw_h": ("The parts of the structure", "החלקים של המבנה"),
        "steps_h": ("From site visit to handover", "מהביקור בשטח ועד המסירה"),
        "steps_p": ("The same four steps on every project, from the first site visit to handover.", "אותם ארבעה שלבים בכל פרויקט, מהביקור הראשון בשטח ועד המסירה ללקוח."),
        "site_h": ("Designed for the site, not from a catalog", "מתוכנן לאתר, לא מקטלוג"),
        "site_p": ("Before we draw, we check the crop, soil, drainage, truck access and wind. Loads are calculated for each project, so the steel and net match the strength the site needs, and your budget.",
                   "לפני שמשרטטים מבנה, בודקים את הגידול, הקרקע, הניקוז, הגישה למשאיות ומשטר הרוחות המקומי. העומסים מחושבים לכל פרויקט, וכתב הכמויות מאזן בין כמות הפלדה והרשת לבין החוזק והתקציב."),
        "abroad_h": ("Abroad", "בחו״ל"),
        "abroad_p": ("Abroad, we plan the work, train local crews and manage the build on site.",
                     "בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח."),  # 3.2
    },
    "turnkey-farms": {
        "title": ("Turnkey agricultural farms for investors | MIFTAH Projects", "חוות חקלאיות עד מפתח למשקיעים | מיפתח פרויקטים"),
        "desc": ("A complete farm on your land abroad, from soil testing and a business plan to planting, growing and marketing. Delivered with agricultural partners, from 30 ha.",
                 "חווה שלמה על הקרקע שלכם בחו״ל, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול, תחזוקה ושיווק. מיפתח מבצעת יחד עם שותפים חקלאיים, מ-300 דונם."),
        "h1": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"),
        "lead": ("For investors, agricultural companies and entrepreneurs who want a working farm on their land, without hiring a contractor, an agronomist and a site manager separately.",
                 "למשקיעים, לחברות חקלאיות וליזמים שרוצים חווה פעילה על הקרקע שלהם, בלי לשכור בנפרד קבלן, אגרונום ומנהל עבודה."),
        "honest_h": ("Our newest line of work", "תחום העבודה החדש שלנו"),
        "honest_p": ("We deliver turnkey farms together with business partners and growers. The structures at the core of the farm come from what we have built since 2003, in Israel and around the world.",
                     "את חוות המפתח אנחנו מבצעים יחד עם שותפים עסקיים וחקלאים. המבנים שבלב החווה מגיעים ממה שאנחנו בונים מאז 2003, בישראל ובעולם."),  # 1.4, D4
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
        "pt_h": ("A net house in Portugal", "בית רשת בפורטוגל"),
        "pt_p": ("We built an avocado net house for a client in Portugal who came to us by referral. The client is willing to give a reference.",
                 "הקמנו בית רשת לאבוקדו ללקוח בפורטוגל שהגיע אלינו בהמלצה. הלקוח מוכן להמליץ עלינו."),  # 3.1, 3.5, 3.6
        "core_h": ("Structures at the core of the farm", "המבנים בלב החווה"),
        "core_p": ("The net houses, shade solutions and windbreaks of a turnkey farm are the same structures we design, make and build for growers.",
                   "בתי הרשת, פתרונות ההצללה ושוברי הרוח של חוות מפתח הם אותם מבנים שאנחנו מתכננים, מייצרים ומקימים לחקלאים."),
        "core_go": ("How we build net houses", "איך אנחנו בונים בתי רשת"),
        "where_h": ("Where", "איפה"),
        "where_p": ("Portugal and other European countries, Africa and other markets. Minimum farm size: 30 ha.",
                    "פורטוגל ומדינות נוספות באירופה, אפריקה ושווקים נוספים. החווה צריכה להיות בגודל 300 דונם לפחות (30 הקטר)."),  # 4.1, 4.2
    },
    "banana-net-houses": {
        "title": ("Banana net houses: 11% net, wide spans | MIFTAH Projects", "בתי רשת לבננות: רשת 11%, מפתחים רחבים | מיפתח פרויקטים"),
        "desc": ("Banana net houses with an 11% shade net over wide spans, up to 10 ha in one structure. Designed, made in our own plant and built by MIFTAH Projects.",
                 "בתי רשת לבננות עם רשת צל 11% על פני מפתחים רחבים, עד 100 דונם במבנה אחד, עם הדליה מובנית. מתוכננים, מיוצרים במפעל שלנו ומוקמים בידי מיפתח, בישראל ובחו״ל."),
        "h1": ("Banana net houses", "בתי רשת לבננות"),
        "lead": ("Protection from wind and hail, and less water lost to evaporation in the hot season. One structure can cover up to 10 ha (100 dunam).",
                 "הגנה מפני רוח וברד, ופחות מים שמתאדים בעונה החמה. מבנה אחד יכול לכסות עד 100 דונם."),  # 2.2
    },
    "orchard-hail-nets": {
        "title": ("Orchard hail nets: apples, cherries, kiwi | MIFTAH Projects", "רשת נגד ברד למטעים: תפוחים, דובדבנים, קיווי | מיפתח פרויקטים"),
        "desc": ("Hail nets for apple, cherry and kiwi orchards: a 10–30% shade net on a structure that folds away in winter. Designed, made and built by MIFTAH Projects.",
                 "רשת נגד ברד למטעי תפוחים, דובדבנים וקיווי: רשת צל 10%–30% על מבנה שמתקפל בחורף. מתוכננים, מיוצרים ומוקמים בידי מיפתח פרויקטים."),
        "h1": ("Hail nets for orchards", "רשת נגד ברד למטעים"),
        "lead": ("A 10–30% shade net over the orchard, mainly against hail and sunburn at flowering and fruit set. The structure lets the net fold away in winter and spread again in summer.",
                 "רשת צל 10%–30% מעל המטע, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה. המבנה מאפשר לרשת להתקפל בחורף ולהיפרס שוב בקיץ."),  # 2.3
    },
    "projects": {
        "title": ("Net house projects on three continents | MIFTAH Projects", "בתי רשת בשלוש יבשות: הפרויקטים | מיפתח פרויקטים"),
        "desc": ("Millions of m² of agricultural projects around the world: Portugal, Spain, Mexico, India, Honduras, Georgia, Belarus and Africa, and net houses in Israel.",
                 "מיליוני מ״ר של פרויקטים חקלאיים בעולם: בפורטוגל, בספרד, במקסיקו, בהודו, בהונדורס, בגאורגיה, בבלארוס ובאפריקה, ובישראל: בתי רשת לקיווי, לבננות, לתפוחים ולדובדבנים."),
        "h1": ("Net house projects in Israel and abroad", "פרויקטים של בתי רשת בישראל ובחו״ל"),
        "lead": ("Net houses on three continents. Abroad, we plan the work, train local crews and manage the build on site.",
                 "בתי רשת בשלוש יבשות. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח."),  # 3.2
        "map_h": ("Abroad", "בחו״ל"),
        "tbl_cap": ("Projects around the world", "פרויקטים בעולם"),
        "th_country": ("Country", "מדינה"), "th_work": ("Project", "פרויקט"),
        "feat_h": ("Selected projects", "פרויקטים נבחרים"),
        "how_h": ("How we work abroad", "איך אנחנו עובדים בחו״ל"),
        "how": [(("We design the project", "מתכננים את הפרויקט"), ("Fitted to the site and the crop.", "בהתאמה לשטח ולגידול.")),  # 2.8
                (("We train and manage local crews", "מדריכים ומנהלים צוותים מקומיים"), ("Together with the client through the whole build.", "יחד עם הלקוח לאורך כל ההקמה.")),  # 3.2
                (("We manage the build until handover", "מנהלים את הביצוע עד המסירה"), ("We take care of manufacturing, shipping and training the local crews.", "דואגים לייצור, לשילוח ולהדרכת הצוותים המקומיים.")),  # 1.2, 3.3
                (("A reference from Portugal", "המלצה מפורטוגל"), ("Our client there is willing to give one, on request.", "הלקוח שלנו שם מוכן להמליץ, לפי בקשה."))],  # 3.5
        "feat_th": (("Crop", "Structure", "Region"), ("גידול", "מבנה", "אזור")),
        "feat_p": ("We name clients only with their permission. References from clients in Israel and Portugal on request.",
                   "שמות לקוחות מופיעים רק באישורם. המלצות מלקוחות בישראל ובפורטוגל, לפי בקשה."),  # q13, O2, 3.5, D6
    },
    "about": {
        "title": ("About MIFTAH Projects: a family company in Israel", "אודות מיפתח פרויקטים: חברה משפחתית שבונה לחקלאים"),
        "desc": ("MIFTAH Projects is a family company in Kfar Masaryk, Israel, led by co-CEOs Merav and Yiftach Hasfel, designing and building agricultural projects since 2003.",
                 "מיפתח פרויקטים היא חברה משפחתית בכפר מסריק, בניהול משותף של מרב ויפתח הספל. החברה מתכננת, מייצרת ומקימה בתי רשת ופרויקטים חקלאיים מאז 2003."),
        "h1": ("A family company that builds for growers", "חברה משפחתית שבונה לחקלאים"),
        "lead": ("Since 2003 we have designed, made and built agricultural projects: net houses for agricultural crops, shade solutions for work areas, windbreaks and trellising, in Israel and around the world. Our office is in Kfar Masaryk, in the north of Israel.",
                 "מאז 2003 אנחנו מתכננים, מייצרים ומקימים פרויקטים חקלאיים: בתי רשת לגידולים חקלאיים, פתרונות הצללה לאזורי תפעול, שוברי רוח והדליה, בישראל ובעולם. המשרד שלנו בכפר מסריק שבצפון."),  # 1.6, 1.7, 1.10, 2.1-2.5
        "people_h": ("The owners", "הבעלים"),
        "yiftach": ("Yiftach Hasfel", "יפתח הספל"), "yiftach_r": ("Co-CEO and owner", "מנכ״ל משותף ובעלים"),
        "yiftach_p": ("Practical engineer in construction, trained at the Technion. Leads the site visits, engineering design, development, quality control, production and the building work. He ran a complex project for intensive fish farming in Belarus that kept to schedule, with local manufacturing, shipping and installation on site.",
                      "הנדסאי בניין (הטכניון). מוביל את מיפוי הצרכים, התכנון ההנדסי, הפיתוח, בקרת האיכות, הפיקוח על הייצור והביצוע. ניהל פרויקט מורכב לגידול דגים בצורה אינטנסיבית בבלארוס, שעמד בלוח הזמנים, עם ייצור מקומי, שילוח והתקנה בשטח."),  # 5.1
        "merav": ("Merav Eyal Hasfel", "מרב איל הספל"), "merav_r": ("Co-CEO and owner", "מנכ״לית משותפת ובעלים"),
        "merav_p": ("BA in business administration. Runs the company day to day, its finance, and marketing and sales. Your first contact for a new project.",
                    "בעלת תואר ראשון במנהל עסקים. מנהלת את החברה ביום-יום, את הכספים ואת השיווק והמכירות. אשת הקשר הראשונה לפרויקט חדש."),  # 5.2, q40
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
        "aside_min_h": ("Projects we take on", "גודל הפרויקטים שלנו"),
        "aside_min_p": ("From 5 ha (50 dunam) in Israel and from 30 ha abroad.",
                        "מ-50 דונם בישראל ומ-300 דונם בחו״ל."),  # 4.2, 4.3 (small projects are the owners' first time-waster, q21)
        "aside_partner_h": ("Partners and suppliers", "שותפים וספקים"),
        "aside_partner_p": ("Agri-tech, farm-management or supply company? Tell us in the form what you would like to do together, or call.", "חברת אגרו-טק, ניהול חוות או אספקה? ספרו לנו בטופס מה תרצו לעשות יחד, או התקשרו."),
        "aside_fair_h": ("Fruit Logistica, Berlin", "Fruit Logistica, ברלין"),
        "aside_fair_p": ("We plan to be at Fruit Logistica, Messe Berlin, 3–5 February 2027. Write it in the form if you would like to meet there.",
                         "אנחנו מתכננים להיות בתערוכת Fruit Logistica בברלין, 3–5 בפברואר 2027. כתבו לנו בטופס אם תרצו להיפגש שם."),  # 4.10
        "aside_office_h": ("Office", "משרד"),
    },
    "profile": {
        "title": ("Company profile | MIFTAH Projects", "פרופיל החברה | מיפתח פרויקטים"),
        "desc": ("A one-page profile of MIFTAH Projects: net houses and agricultural projects, turnkey farms abroad, process, projects and contact. Printable as a PDF.",
                 "פרופיל של מיפתח פרויקטים בעמוד אחד: בתי רשת ופרויקטים חקלאיים, חוות מפתח בחו״ל, תהליך העבודה, פרויקטים ופרטי קשר. ניתן להדפסה כ-PDF."),
        "h1": ("Company profile", "פרופיל החברה"),
        "print": ("Print or save as PDF", "הדפסה או שמירה כ-PDF"),
        "bar_p": ("One page to attach to a quote or hand out at a meeting.", "עמוד אחד לצרף להצעת מחיר או לחלק בפגישה."),
        "who": ("MIFTAH Projects is a family company in Kfar Masaryk, Israel, run by its owners, Merav Eyal Hasfel and Yiftach Hasfel. We design, manufacture in our own plant and install galvanized-steel net houses and agricultural projects, in Israel and around the world, and build turnkey farms abroad together with agricultural partners.",
                "מיפתח פרויקטים היא חברה משפחתית בכפר מסריק, בניהול הבעלים, מרב איל הספל ויפתח הספל. אנחנו מתכננים, מייצרים במפעל שלנו ומקימים בתי רשת מפלדה מגולוונת ופרויקטים חקלאיים, בישראל ובעולם, ומקימים חוות מפתח בחו״ל יחד עם שותפים חקלאיים."),
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
        "crop": "banana", "prefill": "banana", "img": "valley", "cap": ("A large net house in a valley, built by MIFTAH", "בית רשת גדול בעמק, שהקימה מיפתח"),
        "spec_h": ("The net house, in short", "בית הרשת, בקצרה"),
        "rows": [(("Net", "רשת"), ("11% shade net, light and airy", "רשת צל 11%, קלה ואוורירית")),
                 (("Protects", "מגינה"), ("From wind and hail, and it saves water in the hot season by reducing evaporation. Better growing conditions for the plants.", "מפני רוח וברד, ובעונה החמה חוסכת מים כי היא מפחיתה התאדות. תנאי גידול טובים יותר לצמחים.")),
                 (("Structure", "מבנה"), ("Large spans between poles, so one structure can cover up to 10 ha (100 dunam)", "מפתחים גדולים בין העמודים, כך שמבנה אחד יכול לכסות עד 100 דונם")),
                 (("Support", "תמיכה"), ("Trellising and plant support are part of the structure", "ההדליה ומערכת התמיכה הן חלק מהמבנה")),
                 (("Scope", "היקף"), ("We design and build the whole structure, from 5 ha (50 dunam)", "אנחנו מתכננים ומקימים את כל המבנה, מ-50 דונם"))],  # 2.2, 4.2, CL 28 Oct
        "proj": [(("Western Galilee, Israel", "הגליל המערבי, ישראל"), ("Banana net house with 11% net", "בית רשת לבננות עם רשת 11%"))],  # 3.1
        "faq": [(("Which net is used over bananas?", "איזו רשת שמים מעל בננות?"), ("An 11% shade net: light and airy, over wide spans.", "רשת צל 11%: קלה ואוורירית, על פני מפתחים רחבים.")),
                (("How large can one banana net house be?", "כמה גדול יכול להיות בית רשת לבננות?"), ("One structure can reach 10 ha (100 dunam), thanks to large spans between the poles.", "מבנה אחד יכול להגיע ל-100 דונם, בזכות מפתחים גדולים בין העמודים.")),
                (("How is a banana net house linked to grants?", "איך בית רשת קשור למענקים בבננות?"), ("In the Ministry of Agriculture's 2023 development plan, grants for irrigation and trellising in bananas are approved only when the planting is under an existing or new net house. Check the current procedure before you apply.", "בתוכנית הפיתוח של משרד החקלאות לשנת 2023, מענקים למערכת השקיה ולהדליה בבננות מאושרים רק כשהנטיעה תחת בית רשת קיים או חדש. כדאי לבדוק את הנוהל העדכני לפני ההגשה.")),  # E1
                (("Does the net save water?", "הרשת חוסכת מים?"), ("Yes. In the hot season it reduces evaporation, so the plantation needs less water.", "כן. בעונה החמה היא מפחיתה התאדות, כך שהמטע צריך פחות מים."))],  # 2.2
    },
    "orchard-hail-nets": {
        "crop": "apple", "prefill": "", "img": "p-poles", "cap": ("Galvanized poles from our plant, set out on site to the design", "עמודים מגולוונים מהמפעל שלנו, מוצבים בשטח לפי התכנון"),
        "spec_h": ("The net house, in short", "בית הרשת, בקצרה"),
        "rows": [(("Net", "רשת"), ("10% to 30% shade, chosen for the crop", "10% עד 30% צל, לפי הגידול")),
                 (("Protects", "מגינה"), ("Mainly against hail and sunburn at flowering and fruit set", "בעיקר מפני ברד וכוויות שמש בפריחה ובחנטה")),
                 (("Season", "עונה"), ("The net folds away in winter and spreads in summer, by hand or with an automatic system", "הרשת מתקפלת בחורף ונפרסת בקיץ, ידנית או במערכת אוטומטית")),
                 (("Trellising", "הדליה"), ("Support for the crop, such as a pergola trellis for kiwi", "תמיכה לגידול, כמו הדליית סוכה לקיווי")),
                 (("Crops", "גידולים"), ("Apple, cherry, kiwi, avocado, persimmon", "תפוח, דובדבן, קיווי, אבוקדו, אפרסמון")),
                 (("Scope", "היקף"), ("We design and build the whole structure, from 5 ha (50 dunam)", "אנחנו מתכננים ומקימים את כל המבנה, מ-50 דונם"))],  # 2.1, 2.3
        "proj": [(("Golan Heights, Israel", "רמת הגולן, ישראל"), ("Apple net house", "בית רשת לתפוחים")), (("Israel", "ישראל"), ("Cherry orchard net house", "בית רשת למטע דובדבנים")),
                 (("Upper Galilee, Israel", "הגליל העליון, ישראל"), ("Kiwi net house with a pergola trellis", "בית רשת לקיווי עם הדליית סוכה")), (("Portugal", "פורטוגל"), ("Avocado net house", "בית רשת לאבוקדו"))],  # 3.1
        "faq": [(("Which net protects apples and cherries from hail?", "איזו רשת מגינה על תפוחים ודובדבנים מברד?"), ("A 10–30% shade net, mainly against hail and sunburn at flowering and fruit set.", "רשת צל 10%–30%, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה.")),
                (("Can the net fold away in winter?", "הרשת יכולה להתקפל בחורף?"), ("Yes. The structure is built so the net folds in winter and spreads in summer, by hand or automatically.", "כן. המבנה בנוי כך שהרשת מתקפלת בחורף ונפרסת בקיץ, ידנית או אוטומטית.")),
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
     ("An 11% shade net: light and airy, over wide spans. One banana structure can reach 10 ha (100 dunam), with trellising and support built in.",
      "רשת צל 11%: קלה ואוורירית, על פני מפתחים רחבים. מבנה בודד לבננות יכול להגיע ל-100 דונם, עם הדליה ותמיכה מובנות.")),  # 2.2
    (("Which net protects apples and cherries from hail?", "איזו רשת מגינה על תפוחים ודובדבנים מברד?"),
     ("A 10–30% shade net, mainly against hail and sunburn at flowering and fruit set. The structure can let the net fold in winter and spread again in summer, by hand or automatically.",
      "רשת צל 10%–30%, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה. המבנה יכול לאפשר לרשת להתקפל בחורף ולהיפרס שוב בקיץ, ידנית או אוטומטית.")),  # 2.3
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
    (("What size of project do you take on?", "מאיזה גודל פרויקט אתם עובדים?"),
     ("Projects start from 5 ha (50 dunam) in Israel and from 30 ha abroad.", "פרויקטים מתחילים מ-50 דונם בישראל ומ-300 דונם (30 הקטר) בחו״ל.")),  # 4.2, 4.3
    (("How is the price set?", "איך נקבע המחיר?"),
     ("After we review the site. Every structure is designed for its land: the crop and the net it needs, the area, the soil, drainage, access and the wind on site all go into the design. The quote is based on that design and its list of materials and quantities.", "אחרי שבודקים את השטח. כל מבנה מתוכנן לקרקע שלו: הגידול והרשת שהוא צריך, גודל השטח, הקרקע, הניקוז, הגישה והרוח באתר נכנסים לתכנון. הצעת המחיר מבוססת על התכנון ועל כתב הכמויות.")),  # 2.8, 4.3
    (("Do you work outside Israel?", "אתם עובדים מחוץ לישראל?"),
     ("Yes. We have worked in Portugal, Spain, Mexico, India, Honduras, Georgia and Africa, and ran a complex project for intensive fish farming in Belarus. Abroad, we plan the work, train local crews and manage the build on site.",
      "כן. עבדנו בפורטוגל, בספרד, במקסיקו, בהודו, בהונדורס, בגאורגיה ובאפריקה, וניהלנו פרויקט מורכב לגידול דגים בצורה אינטנסיבית בבלארוס. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח.")),  # 3.2, 3.3
    (("Who delivers a turnkey farm?", "מי מבצע חוות מפתח?"),
     ("MIFTAH, together with agricultural partners. Local licensing and permits, and ongoing reporting on budget and progress, stay with you and your advisers.", "מיפתח, יחד עם שותפים חקלאיים. רישוי והיתרים מקומיים, ודיווח שוטף על תקציב והתקדמות, נשארים אצלכם ואצל היועצים שלכם.")),  # 1.4, q3
    (("Can I talk to one of your clients?", "אפשר לדבר עם לקוח שלכם?"),
     ("Yes. Clients in Israel and in Portugal are willing to give a reference. We put you in touch after a first conversation.", "כן. לקוחות בישראל ובפורטוגל מוכנים להמליץ עלינו. נפגיש ביניכם אחרי שיחה ראשונה.")),  # 3.5
]
NEXT_H = ("What happens after you get in touch", "מה קורה אחרי שפונים")
NEXT = [  # 2.8, 4.3, 1.7 (no response-time promise until the owners give one)
    (("A first conversation", "שיחה ראשונה"), ("We talk about the crop, the land and your timing.", "מדברים על הגידול, הקרקע ולוח הזמנים שלכם.")),
    (("A visit to the site", "ביקור בשטח"), ("When the project fits, we map the crop, soil, drainage, access and wind on your land.", "כשהפרויקט מתאים, ממפים בשטח את הגידול, הקרקע, הניקוז, הגישה והרוח.")),
    (("Design and quote", "תכנון והצעת מחיר"), ("We calculate the loads and prepare the drawings and the bill of quantities. The quote is based on them.", "מחשבים עומסים ומכינים שרטוטים וכתב כמויות. הצעת המחיר מבוססת עליהם.")),
    (("Manufacture and installation", "ייצור והקמה"), ("After you approve the quote, our plant makes the parts and our crews build the structure and hand it over to you.", "אחרי שמאשרים את ההצעה, המפעל שלנו מייצר את החלקים והצוותים שלנו מקימים את המבנה ומוסרים אותו ללקוח.")),
]
NEXT_ABROAD = ("Abroad, the steps are the same: we plan the work, train local crews and manage the build on site.", "בחו״ל השלבים זהים: מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח.")  # 3.2

FAQ_H = ("Before you get in touch", "לפני שפונים")

CTA_HEADS = {  # a different opening line per page
    "home": ("Tell us about your land.", "ספרו לנו על הקרקע."),
    "net": ("Tell us about your crop and your land.", "ספרו לנו על הגידול ועל החלקה."),
    "turnkey": ("Tell us about your land abroad.", "ספרו לנו על הקרקע בחו״ל."),
    "projects": ("Planning a project like these?", "מתכננים פרויקט כזה?"),
    "about": ("Talk to Merav or Yiftach.", "דברו עם מרב או עם יפתח."),
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
    "min": ("Projects from 5 ha in Israel and from 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-300 דונם בחו״ל."),
    "min_turnkey": ("Turnkey farms from 30 ha.", "חוות מפתח מ-300 דונם."),  # 4.2
    "fair": ("We plan to be at Fruit Logistica, Berlin, 3–5 February 2027. Ask to meet.", "אנחנו מתכננים להיות ב-Fruit Logistica, ברלין, 3–5 בפברואר 2027. אפשר לתאם פגישה."),
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
    "crop_list": [("Bananas", "בננות"), ("Apples", "תפוחים"), ("Cherries", "דובדבנים"), ("Kiwi", "קיווי"), ("Avocado", "אבוקדו"), ("Persimmon", "אפרסמון"), ("Tobacco", "טבק")],
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
        ("Contact for accessibility", "MIFTAH Projects office, Kfar Masaryk, Israel. Phone +972 4 985 4404."),
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
    "okP": ("MIFTAH's team specializes in planning and building agricultural farms, greenhouses and net houses in Israel and around the world. We'll contact you soon to look at the project's needs and offer a tailored solution.",
            "צוות מיפתח מתמחה בתכנון והקמה של חוות חקלאיות, חממות ובתי רשת בישראל ובעולם. ניצור אתכם קשר בהקדם לבחינת צורכי הפרויקט והצעת פתרון מותאם."),
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
    "berlin": ("Would like to meet at Fruit Logistica 2027", "רוצים להיפגש ב-Fruit Logistica 2027"),
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
    "field": [("f-poles", ("Round galvanized poles on concrete blocks, with guy cables and the lift", "עמודים מגולוונים עגולים על בסיסי בטון, עם כבלי עיגון ובמת הרמה")),
              ("f-hailnets", ("White anti-hail net laid in strips, joined with clips", "רשת לבנה נגד ברד שנפרסת ברצועות ומחוברת בתפסים")),
              ("f-flowers", ("Anemones under a white net, with overhead sprinklers", "כלניות תחת רשת לבנה, עם ממטרות עליות")),
              ("f-shade", ("An arched shade-net house", "בית צל מקושת עם רשת הצללה"))],  # Hanoch's real photos, 8 Nov 2026
    "nogl": ("This browser can't show the 3D illustration, so here is the section drawing instead.", "הדפדפן הזה לא מציג את ההדמיה התלת-ממדית, אז הנה שרטוט החתך במקומה."),
    "go": ("See how a net house is built, step by step", "ראו איך בונים בית רשת, שלב אחרי שלב"),
    "chapters": [
        (("Design", "תכנון"), ("Planning for the site", "תכנון לשטח"),
         ("We map the soil, the needs of the crop and the grower, drainage, access and wind directions, then design the structure and the bill of quantities.", "ממפים את הקרקע, צורכי הגידול והמגדל, הניקוז, הגישה וכיווני הרוח, ואז מתכננים את המבנה ואת כתב הכמויות.")),  # 2.8, steps
        (("On site", "בשטח"), ("Marking out", "סימון"),
         ("Pole lines are marked from the engineering design, point by point.", "קווי העמודים מסומנים לפי התכנון ההנדסי, נקודה אחרי נקודה.")),
        (("From our plant", "מהמפעל שלנו"), ("Galvanized poles", "עמודים מגולוונים"),
         ("Poles made and checked in our plant are set in straight rows, at the span and height in the design.", "עמודים שיוצרו ונבדקו במפעל שלנו מוצבים בשורות ישרות, במפתח ובגובה שבתכנון.")),  # 1.7
        (("At height", "עבודה בגובה"), ("Cables and anchoring", "כבלים ועיגון"),
         ("Steel cables are tensioned between the poles. All our crews are trained to work at height.", "כבלי פלדה נמתחים בין העמודים. כל הצוותים שלנו בעלי הכשרה לעבודה בגובה.")),  # 2.8
        (("The net", "הרשת"), ("Spread row by row", "נפרסת שורה אחרי שורה"),
         ("The net is unrolled over the cables and fixed, one bay at a time.", "הרשת נפרסת מעל הכבלים ומחוברת, מפתח אחרי מפתח.")),
        (("Closing", "סגירה"), ("Side nets and a door", "רשתות צד ודלת"),
         ("Side nets and an entrance door close the structure.", "רשתות בדפנות ודלת כניסה סוגרות את המבנה.")),
        (("Planting", "שתילה"), ("Irrigation, then planting", "השקיה, ואז שתילה"),
         ("Drip lines go in first, then the trees are planted under the net.", "קווי הטפטוף מותקנים קודם, ואחר כך שותלים את העצים מתחת לרשת.")),  # stages 5, 7
        (("What the net does", "מה הרשת עושה"), ("Hail falls between the nets, through special hail-release fittings", "הברד נופל בין הרשתות עם אביזרים מיוחדים לפריקת ברד"),
         ("The net sheds the hail, so it doesn't damage the fruit.", "הרשת פורקת את הברד כך שהוא לא פוגע בפרי.")),  # 2.3 (wind: bananas only, 2.2)
        (("Hail release", "פורק ברד"), ("How the hail comes off the net", "איך הברד יורד מהרשת"),
         ("Hail rolls down the net into the valley between two strips and drops through the hail-release fittings to the ground, between the tree rows.",
          "הברד מתגלגל על הרשת אל העמק שבין שתי רצועות, ונופל דרך אביזרי פריקת הברד אל הקרקע, בין שורות העצים.")),  # Hanoch 8 Nov 2026; Merav ch08 wording; for Yiftach to confirm
        (("Autumn", "סתיו"), ("Folded, then spread again", "מתקפלת ונפרסת מחדש"),
         ("On orchards the net can fold away in winter and spread again in summer, or the other way round, as the crop needs, by hand or automatically.", "במטעים הרשת יכולה להתקפל בחורף ולהיפרס שוב בקיץ, או הפוך בהתאם לצורך הגידול, ידנית או אוטומטית.")),  # 2.3
        (("One address", "כתובת אחת"), ("From design to construction", "מהתכנון ועד ההקמה"),
         ("Design, manufacturing, installation and support, in Israel and around the world.", "תכנון, ייצור, הקמה וליווי, בישראל ובעולם.")),
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
    "statement_b": ("Net houses for agricultural crops,", "בתי רשת לגידולים חקלאיים,"),
    "statement": (" one address from design to construction, in Israel and around the world.",
                  " כתובת אחת, החל מהתכנון ועד ההקמה, בישראל ובעולם כולו."),  # 1.6, 1.7, 2.1
    "sol_h": ("Ways to work with us", "דרכי התקשרות"),
    "sol_p": ("Net houses and agricultural projects, in Israel and abroad. Turnkey farms abroad, delivered with business partners.",
              "בתי רשת ופרויקטים חקלאיים, בישראל ובחו״ל. הקמת חוות עד מפתח בחו״ל, יחד עם שותפים עסקיים."),  # 1.2-1.4, 2.8, D4
    "sols": [
        {"k": ("Structures", "מבנים"), "h": ("Net houses and agricultural projects", "בתי רשת ופרויקטים חקלאיים"), "img": "forest",
         "alt": ("A large white net house below a wooded hillside", "בית רשת לבן וגדול מתחת לגבעה מיוערת"),
         "p": ("Net houses for every type of crop, windbreaks, support and trellising, and shade solutions for work areas. All under one roof: design, manufacturing, installation and support, in Israel and abroad.", "בתי רשת לכל סוגי הגידולים החקלאיים, שוברי רוח, פתרונות תמיכה והדליה, פתרונות הצללה לאזורי תפעול. הכול תחת קורת גג אחת: תכנון, ייצור, הקמה וליווי בארץ ובחו״ל."),
         "chips": [("11% shade net for bananas", "רשת צל 11% לבננות"), ("10–30% shade net for orchards", "רשת צל 10%–30% למטעים")], "href": "net-houses.html"},  # 1.7, 2.1-2.4
        {"k": ("Turnkey agricultural farms", "חוות חקלאיות עד מפתח"), "h": ("Complete farms abroad", "חוות שלמות בחו״ל"), "img": None, "alt": None,  # no photo until a delivered farm can be shown (1.3; registry O1 is a banana net house)
         "p": ("Soil testing and a business plan, structures and irrigation, planting, a local team, growing and marketing. With agricultural partners.", "בדיקת קרקע ותוכנית עסקית, מבנים והשקיה, שתילה, צוות מקומי, גידול ושיווק. עם שותפים חקלאיים."),
         "chips": [("For investors", "למשקיעים"), ("From 30 ha", "מ-300 דונם")], "href": "turnkey-farms.html"},  # 1.3, 1.4, 4.2
    ],
    "field_k": ("From the field", "מהשטח"),
    "world_k": ("Where we have built", "איפה בנינו"),
    "world_more": [(("Israel", "ישראל"), ("Kiwi in the Upper Galilee and the Golan Heights; bananas in the Western Galilee, the Carmel coast, the Jordan Valley and the south. Apples, cherries, blueberries, raspberries, berries, peaches and nectarines in the Upper Galilee and the Golan Heights.", "קיווי בגליל העליון וברמת הגולן, בננות בגליל המערבי, בחוף הכרמל, בבקעת הירדן ובדרום הארץ. תפוחים, דובדבנים, אוכמניות, פטל, פירות יער, אפרסקים ונקטרינות בגליל העליון וברמת הגולן.")),  # 3.1
                   (("Portugal", "פורטוגל"), ("A farm growing avocado with advanced methods.", "חווה לגידול אבוקדו בצורה מתקדמת.")),
                   (("Belarus", "בלארוס"), ("A complex project for intensive fish farming, on schedule, with local manufacturing and installation on site", "פרויקט מורכב לגידול דגים בצורה אינטנסיבית, בלוח הזמנים, עם ייצור מקומי והתקנה בשטח"))],  # 3.3, 3.6
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
    "crop_min": ("Projects from 5 ha (50 dunam) in Israel and 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-300 דונם בחו״ל."),  # 4.2
    "crop_cta": ("Discuss a project for this crop", "דברו איתנו על פרויקט לגידול הזה"),
    "crop_ask": ("Ask about your crop", "שאלו על הגידול שלכם"),
    "crop_ill": ("Illustration", "הדמיה"),
    "crop_note": ("Spans, heights and net type are set for each project, to the client's requirements and the crop's needs.", "המפתחים, הגבהים וסוג הרשת נקבעים לכל פרויקט בהתאם לדרישות הלקוח ולצרכי הגידול."),
    "proof_h": ("Net houses on three continents.", "בתי רשת בשלוש יבשות."),  # 3.2
    "proof_p": ("Abroad, we plan the work, train local crews and manage the build on site.",
                "בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח."),  # 3.2, 3.3
    "proof_go": ("All projects, on the globe", "כל הפרויקטים, על הגלובוס"),
    "steps_swipe": ("Swipe sideways for all four steps", "החליקו לצד כדי לראות את ארבעת השלבים"),
    "steps_h": ("From bare soil to a closed net house.", "מאדמה חשופה ועד בית רשת סגור."),
    "steps_p": ("The same four steps on every project, in Israel or abroad.", "אותם ארבעה שלבים בכל פרויקט, בישראל ובחו״ל."),
    "who_h": ("You deal with the owners, and we keep our word.", "אתם עובדים מול הבעלים, ומילה זו מילה."),  # 4.5
    "who_p": ("MIFTAH is a family company in Kfar Masaryk, run by Merav Eyal Hasfel and Yiftach Hasfel. Yiftach, a practical engineer in construction, leads design, production and execution; Merav runs the company, finance, marketing and sales.",
              "מיפתח היא חברה משפחתית בכפר מסריק, בניהול מרב איל הספל ויפתח הספל. יפתח, הנדסאי בניין, מוביל את התכנון, הייצור והביצוע; מרב מנהלת את החברה, הכספים, השיווק והמכירות."),  # 5.1, 5.2
    "who_peace": ("What you get: peace of mind, and time to focus on your crop and your business.", "מה אתם מקבלים: שקט, וזמן להתמקד בגידול ובפיתוח העסק."),  # q25, 4.6
    "who_refs": ("Clients in Israel and Portugal are willing to give a reference. Ask, and we'll put you in touch.", "לקוחות בישראל ובפורטוגל מוכנים להמליץ עלינו. בקשו, ונפגיש ביניכם."),  # 3.5
    "who_go": ("About MIFTAH", "על מיפתח"),
    "inv_h": ("Investing in a farm abroad?", "משקיעים בחווה בחו״ל?"),
    "inv_p": ("A complete farm on your land, delivered by MIFTAH with agricultural partners, from 30 ha.",
              "חווה שלמה על הקרקע שלכם, שמיפתח מבצעת יחד עם שותפים חקלאיים, מ-300 דונם."),  # q3, 1.4, 4.2
    "inv_note": ("The most common mistake: trying to set up the farm alone to save money.", "הטעות הנפוצה ביותר: לנסות להקים את החווה לבד כדי לחסוך."),  # 4.7
    "inv_go": ("How a turnkey farm works", "איך עובדת חוות מפתח"),
    "sim_go": ("Watch one go up, step by step", "צפו בהקמה, שלב אחרי שלב"),
}

CROPS = [  # the crop selector; every row traces to the ledger. Four rows for every crop: net, protection, structure, season (Hanoch, 10 Nov 2026)
    {"id": "banana", "alt": ("Illustration: banana plants under a light white net, on galvanized poles set wide apart", "הדמיה: צמחי בננה תחת רשת לבנה וקלה, על עמודים מגולוונים במפתחים רחבים"), "label": ("Bananas", "בננות"),
     "say": ("An 11% net, light and airy, over wide spans.", "רשת 11%, קלה ואוורירית, על פני מפתחים רחבים."),
     "rows": [(("Net", "רשת"), ("11% shade net, light and airy", "רשת צל 11%, קלה ואוורירית")),
              (("Protection", "הגנה"), ("From wind, hail and other weather damage; in the hot season it saves water by reducing evaporation", "מפני רוח, ברד, ופגעי מזג האויר ובעונה החמה חוסכת מים כי היא מפחיתה התאדות.")),
              (("Structure", "מבנה"), ("Wide spans: one structure can reach 10 ha (100 dunam), with trellising and support built in", "מפתחים רחבים: מבנה בודד יכול להגיע ל-100 דונם, עם הדליה ותמיכה מובנות")),
              (("Season", "עונה"), ("All year; in the hot season it saves water and gives the plants the best conditions, by reducing evaporation and giving shade", "כל השנה, בעונה החמה חוסכת מים ונותנת תנאים מיטביים לצמח כי היא מפחיתה התאדות ונותנת צל."))],
     "proj": ("Banana net house with 11% net, Western Galilee", "בית רשת לבננות עם רשת 11%, הגליל המערבי")},  # 2.2, 3.1
    {"id": "apple", "alt": ("White anti-hail net laid in strips over a young orchard, on round galvanized poles", "רשת לבנה נגד ברד שנפרסת ברצועות מעל מטע צעיר, על עמודים מגולוונים עגולים"), "label": ("Apples", "תפוחים"),
     "say": ("A net against hail and sunburn, folded away in winter.", "רשת נגד ברד וכוויות שמש, שמתקפלת בחורף."),
     "rows": [(("Net", "רשת"), ("10–30% shade net", "רשת צל 10%–30%")),
              (("Protection", "הגנה"), ("Mainly against hail and sunburn at flowering and fruit set", "בעיקר מפני ברד וכוויות שמש בפריחה ובחנטה")),
              (("Structure", "מבנה"), ("Round galvanized poles on concrete blocks; the net is laid in strips joined with clips", "עמודים מגולוונים עגולים על בסיסי בטון; הרשת נפרסת ברצועות ומחוברת בתפסים")),
              (("Season", "עונה"), ("Spread in spring and folded before winter, by hand or automatically", "נפרסת באביב ומתקפלת לפני החורף, ידנית או אוטומטית"))],
     "proj": ("Apple net house, Golan Heights", "בית רשת לתפוחים, רמת הגולן")},  # 2.3, 3.1, Hanoch 8 Nov
    {"id": "cherry", "alt": ("Illustration: cherry trees with ripe fruit under a net against hail", "הדמיה: עצי דובדבן עם פרי בשל תחת רשת נגד ברד"), "label": ("Cherries", "דובדבנים"),
     "say": ("Orchard nets against hail and sunburn.", "רשת מטע נגד ברד וכוויות שמש."),
     "rows": [(("Net", "רשת"), ("10–30% shade net", "רשת צל 10%–30%")),
              (("Protection", "הגנה"), ("Mainly against hail and sunburn at flowering and fruit set", "בעיקר מפני ברד וכוויות שמש בפריחה ובחנטה")),
              (("Structure", "מבנה"), ("Round galvanized poles on concrete blocks; the net is laid in strips joined with clips", "עמודים מגולוונים עגולים על בסיסי בטון; הרשת נפרסת ברצועות ומחוברת בתפסים")),
              (("Season", "עונה"), ("The net can fold away in winter and spread again in summer", "הרשת יכולה להתקפל בחורף ולהיפרס שוב בקיץ"))],
     "proj": ("Cherry orchard net house", "בית רשת למטע דובדבנים")},  # 2.3, 3.1, Hanoch 8 Nov
    {"id": "kiwi", "alt": ("Illustration: kiwi vines on a pergola trellis under the net, built as one structure", "הדמיה: צמחי קיווי על הדליית סוכה מתחת לרשת, במבנה אחד"), "label": ("Kiwi", "קיווי"),
     "say": ("Net and trellis built as one: a pergola for the kiwi vines.", "רשת והדליה כמבנה אחד: סוכה לצמחי הקיווי."),
     "rows": [(("Net", "רשת"), ("Chosen for the growing region and the grower's requirements", "נבחרת לפי אזור הגידול ודרישות המגדל")),
              (("Protection", "הגנה"), ("Against hail and sun damage at every stage of growth", "מפני ברד ופגעי שמש בכל שלבי הגידול")),
              (("Structure", "מבנה"), ("Structure and trellis built together, as a pergola or with T-supports", "המבנה וההדליה בשיטת סוכה או בשיטת תומכות T מוקמות יחד")),
              (("Season", "עונה"), ("The net can fold away in winter and spread again in summer", "הרשת יכולה להתקפל בחורף ולהיפרס שוב בקיץ"))],
     "proj": ("Kiwi net house with a pergola trellis, Upper Galilee", "בית רשת לקיווי עם הדליית סוכה, הגליל העליון")},  # 2.3, 2.5, 3.1 (the orchard page lists kiwi among the orchard crops)
    {"id": "avocado", "alt": ("Illustration: avocado trees in a net house", "הדמיה: עצי אבוקדו בבית רשת"), "label": ("Avocado", "אבוקדו"),
     "say": ("An avocado net house", "בית רשת לאבוקדו"),
     "rows": [(("Net", "רשת"), ("Chosen for the growing region and the grower's requirements", "נבחרת לפי אזור הגידול ודרישות המגדל")),
              (("Protection", "הגנה"), ("Against hail and sun damage at every stage of growth", "מפני ברד ופגעי שמש בכל שלבי הגידול")),
              (("Structure", "מבנה"), ("Galvanized poles from our plant. Abroad, we plan the work, train local crews and manage the build on site", "עמודים מגולוונים מהמפעל שלנו. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח")),
              (("Season", "עונה"), ("The net can fold away in winter and spread again in summer", "הרשת יכולה להתקפל בחורף ולהיפרס שוב בקיץ"))],
     "proj": ("Avocado net house, Portugal", "בית רשת לאבוקדו, פורטוגל")},  # 2.3, 3.1, 3.5, 3.6 (the orchard page lists avocado among the orchard crops)
    {"id": "other", "alt": ("Net houses and crop rows from above, a MIFTAH project", "בתי רשת ושורות גידול ממבט מלמעלה, פרויקט של מיפתח"), "label": ("Other crops", "גידולים אחרים"),
     "say": ("Persimmon, tobacco and more, plus shade solutions for work areas and windbreaks.", "אפרסמון, טבק ועוד, וגם פתרונות הצללה לאזורי תפעול ושוברי רוח."),
     "rows": [(("Net", "רשת"), ("Chosen for the crop and the site", "נבחרת לפי הגידול והאתר")),
              (("Protection", "הגנה"), ("Tell us the crop and what it needs protecting from. We'll tell you honestly whether a net house fits.", "ספרו לנו מה הגידול וממה צריך להגן עליו. נגיד לכם בכנות אם בית רשת מתאים.")),
              (("Structure", "מבנה"), ("Net houses, shade solutions for work areas with wide spans, windbreaks, trellising; also dismantling and preparing the material for a new structure", "בתי רשת, פתרונות הצללה לאזורי תפעול במפתחים רחבים, שוברי רוח, הדליה; וגם פירוק והכנת החומר למבנה חדש")),
              (("Season", "עונה"), ("Planned for the crop, for example a net that folds in winter and spreads in summer", "לפי הגידול, למשל רשת שמתקפלת בחורף ונפרסת בקיץ"))],
     "proj": None},  # 2.1, 2.4-2.6
]


# Merav's photos from MIFTAH projects, sent 9 Nov 2026 (WhatsApp). At her request: poles shown as galvanized steel
# ("these are old photos, from when black material was used"), one net colour on the aerial shade photo, the current
# logo on the workers' shirts; workers at height shown with a harness (Hanoch, 8 Nov). Ledger 7d.
GALLERY = {
    "h": ("From our projects", "מהפרויקטים שלנו"),
    "p": ("Net houses, shading and installation work, photographed on our projects.", "בתי רשת, הצללה ועבודת הקמה, מצולמים בפרויקטים שלנו."),
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
    ],
}
