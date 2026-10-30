"""All website copy, English and Hebrew, in one place.
Every claim must trace to docs/MIFTAH_TRUTH_LEDGER.md (ledger numbers in comments). Edit text here, then run build.py.
Each value is (English, Hebrew)."""

SITE = {
    "name": ("MIFTAH Projects", "מיפתח פרויקטים"),
    "slogan": ("Where agriculture feels at home", "מיפתח פרויקטים - חקלאות שיש לה בית"),  # 1.13
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
           (("Work", "תחום"), ("Net houses and farm structures", "בתי רשת ומבנים חקלאיים")),
           (("Projects", "פרויקטים"), ("Israel and 7 countries abroad", "ישראל ו-7 מדינות בחו״ל"))],
    "video_play": ("Play video", "הפעלת הסרטון"), "video_pause": ("Pause video", "עצירת הסרטון"),
    "noscript": ("Sending this form needs JavaScript. Please call +972 4 985 4404.", "שליחת הטופס דורשת JavaScript. אפשר להתקשר ל-04-9854404."),
    "map_label": ("Map of MIFTAH projects abroad: Mexico, Honduras, Spain, Portugal, Belarus, Georgia and India, and our office in Kfar Masaryk, Israel. The same information is in the projects table.",
                  "מפת הפרויקטים של מיפתח בחו״ל: מקסיקו, הונדורס, ספרד, פורטוגל, בלארוס, גאורגיה והודו, בניהול מכפר מסריק. אותו מידע מופיע בטבלת הפרויקטים."),
    "archive": ("MIFTAH archive", "ארכיון מיפתח"),
}

NAV = [  # (slug, en, he)
    ("net-houses", "Net houses", "בתי רשת"),
    ("how-we-build", "How we build", "כך בונים"),
    ("turnkey-farms", "Turnkey farms", "חוות מפתח בחו״ל"),
    ("projects", "Projects", "פרויקטים"),
    ("about", "About", "אודות"),
    ("contact", "Contact", "יצירת קשר"),
]

# ---------------------------------------------------------------- shared blocks
FACTS = [  # once, under the home hero
    (("20+", "20+"), ("years designing and building agricultural structures", "שנים של תכנון והקמת מבנים חקלאיים")),  # 1.6
    (("41 ha", "410 דונם"), ("of net houses built abroad (410,000 m²), as of 2015", "בתי רשת שהקמנו בחו״ל (410,000 מ״ר), נכון ל-2015")),  # 3.2
    (("Own plant", "מפעל משלנו"), ("poles, nets, cables and fittings are made and checked before they ship", "עמודים, רשתות, כבלים ואביזרים מיוצרים ונבדקים לפני היציאה לשטח")),  # 1.7
    (("7", "7"), ("countries abroad where we have worked: Mexico, India, Honduras, Spain, Georgia, Portugal and Belarus", "מדינות בחו״ל שעבדנו בהן: מקסיקו, הודו, הונדורס, ספרד, גאורגיה, פורטוגל ובלארוס")),  # 3.1-3.3
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
    ("p-poles", ("Manufacturing in our plant", "ייצור במפעל שלנו"),
     ("After the quote is approved, poles, nets, cables and fittings are made and checked in our plant.",
      "אחרי אישור הצעת המחיר, העמודים, הרשתות, הכבלים והאביזרים מיוצרים ונבדקים במפעל שלנו."),
     ("Galvanized poles from our plant, set out on site to the design", "עמודים מגולוונים מהמפעל שלנו, מוצבים בשטח לפי התכנון")),
    ("p-closed", ("Installation and maintenance", "הקמה ותחזוקה"),
     ("Our crews, trained for work at height, build the structure and maintain it over the years.",
      "הצוותים שלנו, בעלי הכשרה לעבודה בגובה, מקימים את המבנה ומתחזקים אותו לאורך השנים."),
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
    ("Belarus", "בלארוס", ("A complex project: on schedule, with local manufacturing, shipping and local crews", "פרויקט מורכב: עמידה בלוח הזמנים, ייצור מקומי, שילוח וצוותים מקומיים"), None),
]

FEATURED = [  # Q q14: the five projects the owners want shown. Regions only until approval (O2).
    (("Kiwi", "קיווי"), ("Upper Galilee, Israel", "הגליל העליון"), ("Net house with a pergola trellis", "בית רשת עם הדליית סוכה")),
    (("Bananas", "בננות"), ("Western Galilee, Israel", "הגליל המערבי"), ("Banana net house with 11% net", "בית רשת לבננות עם רשת 11%")),
    (("Apples", "תפוחים"), ("Golan Heights, Israel", "רמת הגולן"), ("Orchard net house", "בית רשת למטע")),
    (("Cherries", "דובדבנים"), ("Israel", "ישראל"), ("Orchard net house", "בית רשת למטע")),
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
        (("Structures and net houses", "מבנים ובתי רשת"), ("Net houses, sheds and windbreaks, made in our plant and built to the design.", "בתי רשת, סככות ושוברי רוח, מיוצרים במפעל שלנו ומוקמים לפי התכנון.")),
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
     "h": ("Loading sheds and windbreaks", "סככות העמסה ושוברי רוח"), "crops": ("For the farm around the orchard", "לחווה שמסביב למטע"),
     "rows": [
         (("Loading sheds", "סככות העמסה"), ("Shade sheds for loading, unloading and handling produce. Wide spans leave room for trucks and carts to turn.", "סככות צל להעמסה, לפריקה ולטיפול בתוצרת. מפתחים רחבים משאירים מקום לתמרון של משאיות ועגלות.")),
         (("Net to order", "רשת לפי הזמנה"), ("Shade percentage and color chosen with you. An opening and closing system can be added for bad weather.", "אחוז הצל והצבע נבחרים איתכם. אפשר להוסיף מערכת פתיחה וסגירה למזג אוויר קשה.")),
         (("Windbreaks", "שוברי רוח"), ("Designed and built with the rest of the farm.", "מתוכננים ומוקמים יחד עם שאר החווה.")),
     ], "cap": None},  # 2.4, 2.5
    {"id": "service", "img": None,
     "h": ("Maintenance and dismantling", "תחזוקה ופירוק"), "crops": ("Over the life of the structure", "לאורך חיי המבנה"),
     "rows": [
         (("Maintenance", "תחזוקה"), ("We look after structures as nets, cables and fittings wear over the years.", "מטפלים במבנים לאורך השנים, כשהרשתות, הכבלים והאביזרים מתבלים.")),
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
        "desc": ("Galvanized-steel net houses for orchards and bananas, designed, made and installed by MIFTAH Projects in Israel and abroad. Turnkey farms abroad with partners.",
                 "מיפתח פרויקטים מתכננת, מייצרת ומקימה בתי רשת מפלדה מגולוונת למטעים ולבננות בישראל ובחו״ל, ומקימה חוות מפתח בחו״ל יחד עם שותפים חקלאיים."),
        "h1": ("We design, make and build net houses for orchards and bananas.", "אנחנו מתכננים, מייצרים ומקימים בתי רשת למטעים ולבננות."),
        "lead": ("Galvanized-steel net houses against hail, wind and sun, made in our own plant, built by our crews in Israel and by local crews we train and manage abroad, for more than 20 years. For investors abroad, complete turnkey farms with agricultural partners.",
                 "בתי רשת מפלדה מגולוונת נגד ברד, רוח ושמש, מיוצרים במפעל שלנו ומוקמים בידי הצוותים שלנו בישראל ובידי צוותים מקומיים שאנחנו מדריכים ומנהלים בחו״ל, כבר יותר מ-20 שנה. ולמשקיעים בחו״ל: חוות מפתח שלמות, יחד עם שותפים חקלאיים."),
        "cta2": ("For investors: turnkey farms", "למשקיעים: חוות מפתח"),
        "vidcap": ("Drone footage of a net house built by MIFTAH", "צילום רחפן של בית רשת שהקימה מיפתח"),
        "routes_h": ("Two ways to work with us", "שתי דרכים לעבוד איתנו"),
        "r1_who": ("For growers and agricultural companies", "למגדלים ולחברות חקלאיות"),
        "r1_h": ("Net houses and farm structures", "בתי רשת ומבנים חקלאיים"),
        "r1_p": ("Net houses for orchards and bananas, loading sheds and windbreaks. We map your needs on site, engineer the structure, make it in our plant, install it and maintain it.",
                 "בתי רשת למטעים ולבננות, סככות העמסה ושוברי רוח. ממפים את הצרכים בשטח, מתכננים הנדסית, מייצרים במפעל שלנו, מקימים ומתחזקים."),
        "r1_min": ("Projects from 5 ha in Israel and 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-300 דונם בחו״ל."),
        "r1_go": ("Net houses and structures", "בתי רשת ומבנים"),
        "r2_who": ("For investors, agricultural companies and entrepreneurs", "למשקיעים, לחברות חקלאיות וליזמים"),
        "r2_h": ("Turnkey farms abroad", "חוות מפתח בחו״ל"),
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
        "desc": ("Banana net houses with 11% net, orchard net houses with 10–30% net that fold in winter, loading sheds and windbreaks. Designed, made and installed by MIFTAH.",
                 "בתי רשת לבננות עם רשת 11%, בתי רשת למטעים עם רשת 10%–30% שמתקפלת בחורף, סככות העמסה ושוברי רוח: מתוכננים, מיוצרים במפעל שלנו ומוקמים בידי מיפתח."),
        "h1": ("Net houses and farm structures", "בתי רשת ומבנים חקלאיים"),
        "lead": ("We design, manufacture and install net houses for orchards and bananas, and the loading sheds and windbreaks around them. One team from the first site visit to maintenance.",
                 "אנחנו מתכננים, מייצרים ומקימים בתי רשת למטעים ולבננות, וגם את סככות ההעמסה ושוברי הרוח שמסביב. צוות אחד, מהביקור הראשון בשטח ועד התחזוקה."),
        "types_h": ("By crop and by use", "לפי גידול ולפי שימוש"),
        "types_h2": ("Sheds, windbreaks and service", "סככות, שוברי רוח ושירות"),
        "draw_h": ("The parts of the structure", "החלקים של המבנה"),
        "steps_h": ("From site visit to maintenance", "מהביקור בשטח ועד התחזוקה"),
        "steps_p": ("The same four steps on every project, from the first site visit to maintenance.", "אותם ארבעה שלבים בכל פרויקט, מהביקור הראשון בשטח ועד התחזוקה."),
        "site_h": ("Designed for the site, not from a catalog", "מתוכנן לאתר, לא מקטלוג"),
        "site_p": ("Before we draw, we check the crop, soil, drainage, truck access and wind. Loads are calculated for each project, so the steel and net match the strength the site needs, and your budget.",
                   "לפני שמשרטטים מבנה, בודקים את הגידול, הקרקע, הניקוז, הגישה למשאיות ומשטר הרוחות המקומי. העומסים מחושבים לכל פרויקט, וכתב הכמויות מאזן בין כמות הפלדה והרשת לבין החוזק והתקציב."),
        "abroad_h": ("Abroad", "בחו״ל"),
        "abroad_p": ("Abroad, we plan the work, train local crews and manage the build on site.",
                     "בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח."),  # 3.2
    },
    "turnkey-farms": {
        "title": ("Turnkey farms abroad for investors | MIFTAH Projects", "חוות מפתח בחו״ל למשקיעים | מיפתח פרויקטים"),
        "desc": ("A complete farm on your land abroad, from soil testing and a business plan to planting, growing and marketing. Delivered with agricultural partners, from 30 ha.",
                 "חווה שלמה על הקרקע שלכם בחו״ל, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול, תחזוקה ושיווק. מיפתח מבצעת יחד עם שותפים חקלאיים, מ-300 דונם."),
        "h1": ("Turnkey farms abroad", "חוות מפתח בחו״ל"),
        "lead": ("For investors, agricultural companies and entrepreneurs who want a working farm on their land, without hiring a contractor, an agronomist and a site manager separately.",
                 "למשקיעים, לחברות חקלאיות וליזמים שרוצים חווה פעילה על הקרקע שלהם, בלי לשכור בנפרד קבלן, אגרונום ומנהל עבודה."),
        "honest_h": ("Our newest line of work", "תחום העבודה החדש שלנו"),
        "honest_p": ("We deliver turnkey farms together with agricultural partners. The structures at the core of the farm come from what we have built for more than 20 years, in Israel and on three continents.",
                     "את חוות המפתח אנחנו מבצעים יחד עם שותפים חקלאיים. המבנים שבלב החווה מגיעים ממה שאנחנו בונים כבר יותר מ-20 שנה, בישראל ובשלוש יבשות."),  # 1.4, D4
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
        "core_p": ("The net houses, sheds and windbreaks of a turnkey farm are the same structures we design, make and build for growers.",
                   "בתי הרשת, הסככות ושוברי הרוח של חוות מפתח הם אותם מבנים שאנחנו מתכננים, מייצרים ומקימים לחקלאים."),
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
        "desc": ("41 ha (410,000 m²) of net houses in Mexico, India, Honduras, Spain and Georgia (2015 figures), projects in Portugal and Belarus, and net houses in Israel.",
                 "410,000 מ״ר של בתי רשת במקסיקו, בהודו, בהונדורס, בספרד ובגאורגיה (נתוני 2015), פרויקטים בפורטוגל ובבלארוס, ובישראל: בתי רשת לקיווי, לבננות, לתפוחים ולדובדבנים."),
        "h1": ("Net house projects in Israel and abroad", "פרויקטים של בתי רשת בישראל ובחו״ל"),
        "lead": ("Net houses on three continents. Abroad, we plan the work, train local crews and manage the build on site.",
                 "בתי רשת בשלוש יבשות. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח."),  # 3.2
        "map_h": ("Abroad", "בחו״ל"),
        "tbl_cap": ("Projects outside Israel", "פרויקטים מחוץ לישראל"),
        "th_country": ("Country", "מדינה"), "th_work": ("Work", "עבודה"), "th_area": ("Area (ha)", "שטח (דונם)"),
        "total": ("Total area shown (figures as of 2015)", "סך השטח המפורט (נתונים נכון ל-2015)"),
        "feat_h": ("Selected projects", "פרויקטים נבחרים"),
        "how_h": ("How we work abroad", "איך אנחנו עובדים בחו״ל"),
        "how": [(("We design the project", "מתכננים את הפרויקט"), ("Fitted to the site and the crop, before anything is built.", "מותאם לשטח ולגידול, לפני שבונים משהו.")),  # 2.8
                (("We train and manage local crews", "מדריכים ומנהלים צוותים מקומיים"), ("On site, through the whole build.", "בשטח, לאורך כל ההקמה.")),  # 3.2
                (("We manage the build until handover", "מנהלים את הביצוע עד המסירה"), ("In Belarus, manufacturing, shipping and crews were organized locally.", "בבלארוס הייצור, השילוח והצוותים אורגנו במקום.")),  # 1.2, 3.3
                (("A reference from Portugal", "המלצה מפורטוגל"), ("Our client there is willing to give one, on request.", "הלקוח שלנו שם מוכן להמליץ, לפי בקשה."))],  # 3.5
        "feat_th": (("Crop", "Structure", "Region"), ("גידול", "מבנה", "אזור")),
        "feat_p": ("We name clients only with their permission. References from clients in Israel and Portugal on request.",
                   "שמות לקוחות מופיעים רק באישורם. המלצות מלקוחות בישראל ובפורטוגל, לפי בקשה."),  # q13, O2, 3.5, D6
    },
    "about": {
        "title": ("About MIFTAH Projects: a family company in Israel", "אודות מיפתח פרויקטים: חברה משפחתית שבונה לחקלאים"),
        "desc": ("MIFTAH Projects is a family company in Kfar Masaryk, Israel, led by co-CEOs Merav and Yiftach Hasfel, building agricultural structures for more than 20 years.",
                 "מיפתח פרויקטים היא חברה משפחתית בכפר מסריק, בניהול משותף של מרב ויפתח הספל. החברה מתכננת, מייצרת ומקימה בתי רשת ומבנים חקלאיים כבר יותר מ-20 שנה."),
        "h1": ("A family company that builds for growers", "חברה משפחתית שבונה לחקלאים"),
        "lead": ("For more than 20 years we have designed, made and built agricultural structures: net houses for orchards and bananas, loading sheds, windbreaks and trellising, in Israel and abroad. Our office is in Kfar Masaryk, in the north of Israel.",
                 "כבר יותר מ-20 שנה אנחנו מתכננים, מייצרים ומקימים מבנים חקלאיים: בתי רשת למטעים ולבננות, סככות העמסה, שוברי רוח והדליה, בישראל ובחו״ל. המשרד שלנו בכפר מסריק שבצפון."),  # 1.6, 1.7, 1.10, 2.1-2.5
        "people_h": ("The owners", "הבעלים"),
        "yiftach": ("Yiftach Hasfel", "יפתח הספל"), "yiftach_r": ("Co-CEO and owner", "מנכ״ל משותף ובעלים"),
        "yiftach_p": ("Practical engineer in construction, trained at the Technion. Leads the site visits, engineering design, development, quality control, production and the building work. He ran a complex project in Belarus that kept to schedule with local manufacturing, shipping and local crews.",
                      "הנדסאי בניין (הטכניון). מוביל את מיפוי הצרכים, התכנון ההנדסי, הפיתוח, בקרת האיכות, הפיקוח על הייצור והביצוע. ניהל פרויקט מורכב בבלארוס שעמד בלוח הזמנים, עם ייצור מקומי, שילוח וצוותים מקומיים."),  # 5.1
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
        "lead_off": ("Call the office and ask for Merav Eyal Hasfel. To keep the call short, prepare your project details below: where the land is, what you grow and how large it is.",
                     "התקשרו למשרד ובקשו את מרב איל הספל. כדי שהשיחה תהיה קצרה, הכינו כאן את פרטי הפרויקט: איפה הקרקע, מה מגדלים ומה גודל השטח."),  # O1
        "call_pill": ("Call {phone}", "התקשרו: {phone}"),
        "lead": ("Tell us where the land is, what you grow or plan to grow, and how large it is. We'll contact you to arrange a first conversation, and a visit to the site when the project fits.",
                 "ספרו לנו איפה הקרקע, מה מגדלים או מתכננים לגדל, ומה גודל השטח. נחזור אליכם כדי לתאם שיחה ראשונה, וביקור בשטח כשהפרויקט מתאים."),
        "aside_phone_h": ("Prefer to talk?", "מעדיפים לדבר?"),
        "aside_phone_p": ("Call the office and ask for Merav Eyal Hasfel, co-CEO. The office is in Israel (UTC+2, UTC+3 in summer).", "התקשרו למשרד ובקשו את מרב איל הספל, מנכ״לית משותפת."),
        "aside_profile_h": ("For your board or partners", "להנהלה או לשותפים"),
        "aside_profile_p": ("A one-page company profile to print or save as PDF.", "פרופיל חברה בעמוד אחד, להדפסה או לשמירה כ-PDF."),
        "aside_profile_go": ("Open the company profile", "לפרופיל החברה"),
        "aside_min_h": ("Projects we take on", "גודל הפרויקטים שלנו"),
        "aside_min_p": ("From 5 ha (50 dunam) in Israel and from 30 ha abroad.",
                        "מ-50 דונם בישראל ומ-300 דונם בחו״ל."),  # 4.2, 4.3 (small projects are the owners' first time-waster, q21)
        "aside_partner_h": ("Partners and suppliers", "שותפים וספקים"),
        "aside_partner_p": ("Agri-tech, farm-management or supply company? Tell us what you would like to do together; choose \"A potential partner\" in the form, or call.", "חברת אגרו-טק, ניהול חוות או אספקה? ספרו לנו מה תרצו לעשות יחד: בחרו ״שותפים פוטנציאליים״ בטופס, או התקשרו."),
        "aside_fair_h": ("Fruit Logistica, Berlin", "Fruit Logistica, ברלין"),
        "aside_fair_p": ("We plan to be at Fruit Logistica, Messe Berlin, 3–5 February 2027. Tick the box in the form if you would like to meet there.",
                         "אנחנו מתכננים להיות בתערוכת Fruit Logistica בברלין, 3–5 בפברואר 2027. סמנו בטופס אם תרצו להיפגש שם."),  # 4.10
        "aside_office_h": ("Office", "משרד"),
    },
    "profile": {
        "title": ("Company profile | MIFTAH Projects", "פרופיל החברה | מיפתח פרויקטים"),
        "desc": ("A one-page profile of MIFTAH Projects: net houses and farm structures, turnkey farms abroad, process, projects and contact. Printable as a PDF.",
                 "פרופיל של מיפתח פרויקטים בעמוד אחד: בתי רשת ומבנים חקלאיים, חוות מפתח בחו״ל, תהליך העבודה, פרויקטים ופרטי קשר. ניתן להדפסה כ-PDF."),
        "h1": ("Company profile", "פרופיל החברה"),
        "print": ("Print or save as PDF", "הדפסה או שמירה כ-PDF"),
        "bar_p": ("One page to attach to a quote or hand out at a meeting.", "עמוד אחד לצרף להצעת מחיר או לחלק בפגישה."),
        "who": ("MIFTAH Projects is a family company in Kfar Masaryk, Israel, run by its owners, Merav Eyal Hasfel and Yiftach Hasfel. We design, manufacture in our own plant, install and maintain galvanized-steel net houses for orchards and bananas, in Israel and abroad, and build turnkey farms abroad together with agricultural partners.",
                "מיפתח פרויקטים היא חברה משפחתית בכפר מסריק, בניהול הבעלים, מרב איל הספל ויפתח הספל. אנחנו מתכננים, מייצרים במפעל שלנו, מקימים ומתחזקים בתי רשת מפלדה מגולוונת למטעים ולבננות, בישראל ובחו״ל, ומקימים חוות מפתח בחו״ל יחד עם שותפים חקלאיים."),
        "svc_h": ("What we build", "מה אנחנו בונים"),
        "turn_h": ("Turnkey farms abroad (with partners)", "חוות מפתח בחו״ל (עם שותפים)"),
        "proc_h": ("How a project runs", "איך מתנהל פרויקט"),
        "proj_h": ("Projects abroad", "פרויקטים בחו״ל"),
        "contact_h": ("Contact", "יצירת קשר"),
        "web": ("www.miftah.co.il", "www.miftah.co.il"),
    },
    "how-we-build": {
        "title": ("How a net house is built, step by step | MIFTAH Projects", "כך בונים בית רשת, שלב אחרי שלב | מיפתח פרויקטים"),
        "desc": ("Scroll through a 3D illustration of a MIFTAH net house going up: marking out, galvanized poles, cables, net, closing, irrigation and planting, hail and winter.",
                 "הדמיה תלת-ממדית בגלילה של הקמת בית רשת של מיפתח: סימון, עמודים מגולוונים, כבלים, רשת, סגירה, השקיה ושתילה, ברד וחורף."),
        "h1": ("How a net house is built", "כך בונים בית רשת"),
        "lead": ("Scroll down and watch one go up: from bare soil, through galvanized poles, cables and net, to a protected orchard.",
                 "גללו למטה וראו אותו עולה: מאדמה חשופה, דרך עמודים מגולוונים, כבלים ורשת, ועד מטע מוגן."),
    },
    "privacy": {
        "title": ("Privacy | MIFTAH Projects", "מדיניות פרטיות | מיפתח פרויקטים"),
        "desc": ("How MIFTAH Projects handles the details you send through this website.", "איך מיפתח פרויקטים מטפלת בפרטים שנשלחים דרך האתר."),
        "h1": ("Privacy", "מדיניות פרטיות"),
    },
    "accessibility": {
        "title": ("Accessibility statement | MIFTAH Projects", "הצהרת נגישות | מיפתח פרויקטים"),
        "desc": ("Accessibility statement for the MIFTAH Projects website.", "הצהרת הנגישות של אתר מיפתח פרויקטים."),
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
EXISTING_Q = (("Already have net houses?", "כבר יש לכם בתי רשת?"),
              ("We maintain the structures we build over the years, and when a structure is replaced, we take it down and prepare the material for a new one. If your net houses were built by another supplier, call us and ask.",
               "אנחנו מתחזקים את המבנים שאנחנו מקימים לאורך השנים, וכשמחליפים מבנה, מפרקים אותו ומכינים את החומר למבנה חדש. אם בתי הרשת שלכם הוקמו בידי ספק אחר, התקשרו ושאלו."))  # 2.6; other suppliers' structures: O14
NET_FAQ = [  # every answer is a ledger fact (numbers in comments)
    (("What is an agricultural net house?", "מה זה בית רשת חקלאי?"),
     ("A structure of galvanized-steel poles and steel cables with a net over the crop. It protects an orchard or a banana plantation from hail, sun and wind, and over bananas it also saves water by reducing evaporation.",
      "מבנה של עמודי פלדה מגולוונת וכבלי פלדה, עם רשת מעל הגידול. הוא מגן על מטע או על מטע בננות מפני ברד, שמש ורוח, ובבננות גם חוסך מים כי הוא מפחית התאדות.")),  # 2.2, 2.3, 2.8
    (("Which net is used over bananas?", "איזו רשת שמים מעל בננות?"),
     ("An 11% shade net: light and airy, over wide spans. One banana structure can reach 10 ha (100 dunam), with trellising and support built in.",
      "רשת צל 11%: קלה ואוורירית, על פני מפתחים רחבים. מבנה בודד לבננות יכול להגיע ל-100 דונם, עם הדליה ותמיכה מובנות.")),  # 2.2
    (("Which net protects apples and cherries from hail?", "איזו רשת מגינה על תפוחים ודובדבנים מברד?"),
     ("A 10–30% shade net, mainly against hail and sunburn at flowering and fruit set. The structure can let the net fold in winter and spread again in summer, by hand or automatically.",
      "רשת צל 10%–30%, בעיקר נגד ברד וכוויות שמש בפריחה ובחנטה. המבנה יכול לאפשר לרשת להתקפל בחורף ולהיפרס שוב בקיץ, ידנית או אוטומטית.")),  # 2.3
    (("Who makes the poles, cables and nets?", "מי מייצר את העמודים, הכבלים והרשתות?"),
     ("Our own plant. Poles, nets, cables and fittings are made, packed and checked before they go to the site.",
      "המפעל שלנו. עמודים, רשתות, כבלים ואביזרים מיוצרים, נארזים ונבדקים לפני שהם יוצאים לשטח.")),  # 1.7
    (("What happens before a quote?", "מה קורה לפני הצעת מחיר?"),
     ("A site visit: we look at the crop, the soil, drainage, access and the wind. We then calculate the loads and prepare drawings and a list of materials and quantities, and the quote is based on that design.",
      "ביקור בשטח: בודקים את הגידול, הקרקע, הניקוז, הגישה והרוח. אחר כך מחשבים עומסים ומכינים שרטוטים וכתב כמויות, והצעת המחיר מבוססת על התכנון הזה.")),  # 2.8, 4.3
    (("Do you also build sheds and windbreaks?", "אתם בונים גם סככות ושוברי רוח?"),
     ("Yes: loading sheds with wide spans for trucks and carts, windbreaks, and trellising and support systems. ",
      "כן: סככות העמסה במפתחים רחבים למשאיות ולעגלות, שוברי רוח ומערכות הדליה ותמיכה. ")),  # 2.4-2.6
]
NET_FAQ += [EXISTING_Q, GRANT_Q]

FAQ = [  # every answer is a ledger fact (numbers in comments)
    (("What size of project do you take on?", "מאיזה גודל פרויקט אתם עובדים?"),
     ("Projects start from 5 ha (50 dunam) in Israel and from 30 ha abroad.", "פרויקטים מתחילים מ-50 דונם בישראל ומ-300 דונם (30 הקטר) בחו״ל.")),  # 4.2, 4.3
    (("How is the price set?", "איך נקבע המחיר?"),
     ("After we review the site. Every structure is designed for its land: the crop and the net it needs, the area, the soil, drainage, access and the wind on site all go into the design. The quote is based on that design and its list of materials and quantities.", "אחרי שבודקים את השטח. כל מבנה מתוכנן לקרקע שלו: הגידול והרשת שהוא צריך, גודל השטח, הקרקע, הניקוז, הגישה והרוח באתר נכנסים לתכנון. הצעת המחיר מבוססת על התכנון ועל כתב הכמויות.")),  # 2.8, 4.3
    (("Do you work outside Israel?", "אתם עובדים מחוץ לישראל?"),
     ("Yes. We have built net houses in Mexico, India, Honduras, Spain, Georgia and Portugal, and ran a complex project in Belarus. Abroad, we plan the work, train local crews and manage the build on site.",
      "כן. הקמנו בתי רשת במקסיקו, בהודו, בהונדורס, בספרד, בגאורגיה ובפורטוגל, וניהלנו פרויקט מורכב בבלארוס. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח.")),  # 3.2, 3.3
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
    (("Manufacture and installation", "ייצור והקמה"), ("After you approve the quote, our plant makes the parts and our crews build the structure and maintain it.", "אחרי שמאשרים את ההצעה, המפעל שלנו מייצר את החלקים והצוותים שלנו מקימים את המבנה ומתחזקים אותו.")),
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

FORM = {
    "step1_h": ("About the project", "על הפרויקט"),
    "step2_h": ("How to reach you", "איך לחזור אליכם"),
    "next": ("Next: how to reach you", "הלאה: איך לחזור אליכם"),
    "back": ("Back", "חזרה"),
    "h": ("Your project", "הפרויקט שלכם"),
    "req": ("Fields marked * are required.", "שדות עם * הם חובה."),
    "name": ("Full name *", "שם מלא *"),
    "company": ("Company or organization", "חברה או ארגון"),
    "reach": ("Email or phone: fill in at least one *", "מייל או טלפון: לפחות אחד מהם *"),
    "email": ("Email", "מייל"),
    "phone": ("Phone or WhatsApp", "טלפון או וואטסאפ"),
    "phone_hint": ("Include your country code (+…) if you are outside Israel", "עם קידומת מדינה אם מחוץ לישראל"),
    "optional": ("optional", "לא חובה"),
    "role": ("I am *", "מי אתם? *"),
    "roles": [("grower", ("A grower or farm manager", "מגדלים או מנהלי משק"), ("Running an orchard or plantation", "מנהלים מטע או משק")),
              ("coop", ("A cooperative or group of growers", "אגודה או קבוצת מגדלים"), ("Several members or plots", "כמה חברים או חלקות")),
              ("company", ("An agricultural company", "חברה חקלאית"), ("Growing or developing at scale", "מגדלת או מפתחת בהיקף גדול")),
              ("investor", ("A private investor", "משקיעים פרטיים"), ("Investing in a farm or land", "משקיעים בחווה או בקרקע")),
              ("entrepreneur", ("An entrepreneur", "יזמים"), ("Starting a new farm business", "מקימים מיזם חקלאי חדש")),
              ("partner", ("A potential partner", "שותפים פוטנציאליים"), ("A company exploring work together", "חברה שבוחנת שיתוף פעולה"))],
    "need": ("What do you need? *", "מה צריך? *"),
    "needs": [("nethouse", ("Net houses or farm structures", "בתי רשת או מבנים חקלאיים"), ("Orchards, bananas, loading sheds, windbreaks", "מטעים, בננות, סככות העמסה, שוברי רוח")),
              ("turnkey", ("A turnkey farm abroad", "חוות מפתח בחו״ל"), ("From soil testing to harvest, with partners", "מבדיקת קרקע ועד קטיף, עם שותפים")),
              ("unsure", ("Not sure yet", "עוד לא ברור"), ("Let's talk it through", "נדבר ונבין יחד"))],
    "country": ("Where is the land? *", "איפה הקרקע? *"),
    "countries": [("", ("Choose a country or region", "בחירת מדינה או אזור")), ("IL", ("Israel", "ישראל")), ("PT", ("Portugal", "פורטוגל")), ("ES", ("Spain", "ספרד")),
                  ("EU", ("Another European country", "מדינה אחרת באירופה")), ("AF", ("Africa", "אפריקה")),
                  ("LA", ("Latin America", "אמריקה הלטינית")), ("AS", ("Asia", "אסיה")), ("OC", ("Australia or New Zealand", "אוסטרליה או ניו זילנד")), ("OT", ("Somewhere else", "מקום אחר")), ("SEARCH", ("Still looking for land", "עוד מחפשים קרקע"))],
    "region": ("Region or nearest town", "אזור או יישוב קרוב"),
    "size": ("Land size *", "גודל השטח *"),
    "sizes": [("", ("Choose a range", "בחירת טווח")), ("lt5", ("Under 5 ha (under 50 dunam)", "פחות מ-50 דונם")), ("5-30", ("5–30 ha (50–300 dunam)", "50 עד 300 דונם")),
              ("30-100", ("30–100 ha", "300 עד 1,000 דונם")), ("100+", ("Over 100 ha", "מעל 1,000 דונם")), ("tbd", ("Not decided yet", "עוד לא ידוע"))],
    "status": ("Land status", "מצב הקרקע"),
    "statuses": [("", ("Choose", "בחירה")), ("own", ("We own it", "בבעלותנו")), ("lease", ("We lease it", "בחכירה")), ("acquiring", ("We are acquiring it", "בתהליך רכישה")), ("search", ("Still looking", "עוד מחפשים"))],
    "crop": ("Crop", "גידול"),
    "crop_hint": ("Existing or planned, e.g. avocado", "קיים או מתוכנן, למשל אבוקדו"),
    "timeline": ("When do you want to start?", "מתי רוצים להתחיל?"),
    "timelines": [("", ("Choose", "בחירה")), ("season", ("Before the next season", "לפני העונה הבאה")), ("12m", ("Within 12 months", "תוך 12 חודשים")), ("explore", ("Just exploring", "רק בודקים"))],
    "message": ("Anything else we should know?", "עוד משהו שכדאי שנדע?"),
    "berlin": ("I'd like to meet at Fruit Logistica, Berlin, 3–5 February 2027", "אשמח להיפגש ב-Fruit Logistica, ברלין, 3–5 בפברואר 2027"),
    "consent": ("I agree that MIFTAH Projects may use these details to reply to me. See the {privacy}.", "אני מסכים/ה שמיפתח פרויקטים תשתמש בפרטים כדי לחזור אליי. פרטים נוספים ב{privacy}."),
    "privacy_link": ("privacy policy", "מדיניות הפרטיות"),
    "send": ("Send the request", "שליחת הבקשה"),
    "send_off": ("Show my summary", "הצגת הסיכום"),
    "heard": ("How did you hear about us?", "איך שמעתם עלינו?"),
    "heard_hint": ("For example: a client's recommendation, a fair, Google", "למשל: המלצה של לקוח, תערוכה, גוגל"),  # referrals drive sales, 3.6
    "honeypot": ("Leave this field empty", "השאירו שדה זה ריק"),
}

PRIVACY = {
    "en": [
        ("What we collect", "When you send the contact form, we receive what you fill in: your name, company, email and phone; what kind of client you are (grower, cooperative, company, investor and so on) and what you need; the country, region, size and status of the land; your crop, timeline and message; how you heard about us; and whether you want to meet at the fair. The form also records the page, the language, the time it was sent and how you reached the site (the referring site and any campaign tags in the link). With an enquiry we also note whether the land size meets our usual minimum, to sort enquiries. The site uses no cookies. Like any website, the hosting server keeps standard technical logs (such as IP addresses) for security. Your browser keeps, for that tab only, an unsent form draft and a note of how you reached the site (the first page, the referring site and campaign tags); the globe remembers your language choice. None of this is sent to us unless you send the form."),
        ("Why", "Only to reply to your request, arrange a conversation or a site visit, and prepare a proposal if you ask for one."),
        ("Who sees it", "MIFTAH Projects' management and office staff. We don't sell or share your details. The site is hosted by Vercel Inc. (USA), and the form's delivery service, once connected, processes the message only to deliver it to us; both may process data outside Israel."),
        ("How long", "We keep inquiries for as long as they are needed for the conversation and for our business records, and delete them on request."),
        ("Your rights", "You can ask to see, correct or delete the details you sent, under Israel's Protection of Privacy Law, 5741-1981. Call +972 4 985 4404."),
        ("Statistics", "If we add visitor statistics, we will use a service that doesn't track you across sites, and update this page first."),
        ("Updated", "29 October 2026."),
    ],
    "he": [
        ("מה אנחנו אוספים", "כששולחים את טופס יצירת הקשר, אנחנו מקבלים את מה שמולא: שם, חברה, מייל וטלפון; איזה סוג לקוח אתם (מגדל, אגודה, חברה, משקיע וכו׳) ומה צריך; המדינה, האזור, הגודל והמצב של הקרקע; הגידול, לוח הזמנים וההודעה; איך שמעתם עלינו; והאם רוצים להיפגש בתערוכה. הטופס רושם גם את העמוד, השפה, מועד השליחה ואיך הגעתם לאתר (האתר המפנה ותגיות קמפיין בקישור, אם יש). עם הפנייה אנחנו גם מציינים אם גודל השטח עומד במינימום הרגיל שלנו, כדי למיין פניות. האתר לא משתמש בעוגיות. כמו בכל אתר, שרת האחסון שומר יומני גישה טכניים רגילים (כמו כתובות IP) לצורכי אבטחה. הדפדפן שלכם שומר, רק בלשונית הזאת, טיוטה של טופס שלא נשלח ורישום של איך הגעתם לאתר (העמוד הראשון, האתר המפנה ותגיות קמפיין); הגלובוס זוכר את השפה שבחרתם. שום דבר מאלה לא נשלח אלינו אלא אם שולחים את הטופס."),
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
    "okH": ("Thank you. Your request was sent.", "תודה. הבקשה נשלחה."),
    "okP": ("We'll contact you to arrange a first conversation. If it's urgent, call {phone}.", "נחזור אליכם כדי לתאם שיחה ראשונה. אם זה דחוף: {phone}."),
    "badH": ("The request was not sent.", "הבקשה לא נשלחה."),
    "badP": ("Something went wrong on our side. Please try again in a minute, or call {phone}.", "משהו השתבש אצלנו. אפשר לנסות שוב בעוד דקה, או להתקשר: {phone}."),
    "trapP": ("This browser filled in a hidden field, so the request was not sent. Please call {phone}.", "הדפדפן מילא שדה מוסתר, ולכן הבקשה לא נשלחה. נא להתקשר: {phone}."),
    "offH": ("Online sending isn't connected yet.", "השליחה מהאתר עוד לא מחוברת."),
    "offP": ("Your details were not sent. Please call the office, and keep this summary at hand: it has everything we need.", "הפרטים לא נשלחו. נא להתקשר למשרד, והסיכום הזה יעזור: יש בו כל מה שאנחנו צריכים."),
    "copy": ("Copy the summary", "העתקת הסיכום"),
    "copied": ("Copied.", "הועתק."),
    "call": ("Call {phone}", "התקשרו: {phone}"),
    "small_il": ("Projects in Israel start from 5 ha (50 dunam).", "פרויקטים בישראל מתחילים מ-50 דונם."),  # 4.2
    "small_ab": ("Projects abroad start from 30 ha.", "פרויקטים בחו״ל מתחילים מ-300 דונם."),  # 4.2
    "tk_il": ("Turnkey farms are built abroad. In Israel we design and build net houses and farm structures.", "חוות מפתח מוקמות בחו״ל. בישראל אנחנו מתכננים ומקימים בתי רשת ומבנים חקלאיים."),  # 1.4
    "brief": ("MIFTAH Projects: project enquiry", "מיפתח פרויקטים: פנייה על פרויקט"),
    "berlin": ("Would like to meet at Fruit Logistica 2027", "רוצים להיפגש ב-Fruit Logistica 2027"),
}
FORM_BRIEF_KEYS = [  # summary labels, in order
    ("name", ("Name", "שם")), ("company", ("Company", "חברה")), ("email", ("Email", "מייל")), ("phone", ("Phone", "טלפון")),
    ("role", ("I am", "סוג פונה")), ("need", ("Need", "מה צריך")), ("country", ("Country", "מדינה")), ("region", ("Region", "אזור")),
    ("size", ("Land size", "שטח")), ("status", ("Land status", "מצב הקרקע")), ("crop", ("Crop", "גידול")), ("timeline", ("Timeline", "לוח זמנים")),
    ("message", ("Message", "הודעה")), ("heard", ("Heard about us", "איך שמעו עלינו")),
]

SIM = {  # the 3D page; every line traces to the ledger (numbers in comments)
    "badge": ("Illustration", "הדמיה"),
    "aria": ("3D illustration of a MIFTAH net house being built, step by step", "הדמיה תלת-ממדית של הקמת בית רשת של מיפתח, שלב אחרי שלב"),
    "scroll": ("Scroll to build", "גללו כדי לבנות"),
    "step": ("Step", "שלב"),
    "note": ("Illustration only. Sizes, spacing and height are not a specification: every project is designed for its crop, soil and wind.",
             "הדמיה להמחשה בלבד. המידות, המרווחים והגובה אינם מפרט: כל פרויקט מתוכנן לפי הגידול, הקרקע והרוח באתר."),
    "nogl": ("This browser can't show the 3D illustration, so here is the section drawing instead.", "הדפדפן הזה לא מציג את ההדמיה התלת-ממדית, אז הנה שרטוט החתך במקומה."),
    "go": ("See how a net house is built, in 3D", "ראו איך בונים בית רשת, בתלת-ממד"),
    "chapters": [
        (("Design", "תכנון"), ("Designed for the site", "מתוכנן לשטח"),
         ("We map the crop, soil, drainage, access and wind, then design the structure and the bill of quantities.", "ממפים את הגידול, הקרקע, הניקוז, הגישה והרוח, ואז מתכננים את המבנה ואת כתב הכמויות.")),  # 2.8, steps
        (("On site", "בשטח"), ("Marking out", "סימון"),
         ("Pole lines are marked from the engineering design, point by point.", "קווי העמודים מסומנים לפי התכנון ההנדסי, נקודה אחרי נקודה.")),
        (("From our plant", "מהמפעל שלנו"), ("Galvanized poles", "עמודים מגולוונים"),
         ("Poles made and checked in our plant are set in straight rows, at the span and height in the design.", "עמודים שיוצרו ונבדקו במפעל שלנו מוצבים בשורות ישרות, במפתח ובגובה שבתכנון.")),  # 1.7
        (("At height", "עבודה בגובה"), ("Cables and anchoring", "כבלים ועיגון"),
         ("Steel cables are tensioned across the pole heads, and the edges are anchored against the wind. Our crews are trained for work at height.", "כבלי פלדה נמתחים בין ראשי העמודים, והשוליים מעוגנים מול הרוח. הצוותים שלנו בעלי הכשרה לעבודה בגובה.")),  # 2.8
        (("The net", "הרשת"), ("Spread row by row", "נפרסת שורה אחרי שורה"),
         ("The net is unrolled over the cables and fixed, one bay at a time.", "הרשת נפרסת מעל הכבלים ומחוברת, מפתח אחרי מפתח.")),
        (("Closing", "סגירה"), ("Side nets and a door", "רשתות צד ודלת"),
         ("Side nets and an entrance door close the structure.", "רשתות בדפנות ודלת כניסה סוגרות את המבנה.")),
        (("Planting", "שתילה"), ("Irrigation, then trees", "השקיה, ואז עצים"),
         ("On a turnkey farm, drip lines go in first, then the orchard is planted under the net.", "בחוות מפתח, קווי הטפטוף מותקנים קודם, ואחר כך שותלים את המטע מתחת לרשת.")),  # stages 5, 7
        (("What the net does", "מה הרשת עושה"), ("Hail stops on the net", "הברד נעצר על הרשת"),
         ("The net catches hail before it reaches the fruit, and breaks the wind.", "הרשת עוצרת את הברד לפני שהוא מגיע לפרי, ושוברת את הרוח.")),  # 2.2, 2.3
        (("Winter", "חורף"), ("Folded, then spread again", "מתקפלת ונפרסת מחדש"),
         ("On orchards the net can fold away in winter and spread again in summer, by hand or automatically.", "במטעים הרשת יכולה להתקפל בחורף ולהיפרס שוב בקיץ, ידנית או אוטומטית.")),  # 2.3
        (("One team", "צוות אחד"), ("From design to maintenance", "מהתכנון ועד התחזוקה"),
         ("Design, our own plant, installation and maintenance, in Israel and abroad.", "תכנון, מפעל משלנו, הקמה ותחזוקה, בישראל ובחו״ל.")),
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
    "ticker": [("Banana net houses", "בתי רשת לבננות"), ("Apple and cherry net houses", "בתי רשת לתפוחים ולדובדבנים"), ("Kiwi net houses with a pergola trellis", "בתי רשת לקיווי עם הדליית סוכה"),
               ("Avocado net houses", "בתי רשת לאבוקדו"), ("Loading sheds", "סככות העמסה"), ("Windbreaks", "שוברי רוח"), ("Trellising and support", "הדליה ותמיכה"),
               ("Maintenance of structures", "תחזוקת מבנים"), ("Turnkey farms abroad", "חוות מפתח בחו״ל")],  # 2.1-2.6, 1.3
    "ticker_pause": ("Pause the scrolling list", "עצירת הרשימה הנגללת"), "ticker_play": ("Pause the scrolling list", "עצירת הרשימה הנגללת"),
    "who_k": ("Who we are", "מי אנחנו"),
    "statement_b": ("Net houses for orchards and bananas,", "בתי רשת למטעים ולבננות,"),
    "statement": (" designed and built by one team, in Israel and abroad.",
                  " שצוות אחד מתכנן ומקים, בישראל ובחו״ל."),  # 1.6, 1.7, 2.1
    "sol_h": ("Two ways to work with us", "שתי דרכים לעבוד איתנו"),
    "sol_p": ("Net houses and farm structures, in Israel and abroad. Turnkey farms abroad, delivered with agricultural partners.",
              "בתי רשת ומבנים חקלאיים, בישראל ובחו״ל. חוות מפתח בחו״ל, יחד עם שותפים חקלאיים."),  # 1.2-1.4, 2.8, D4
    "sols": [
        {"k": ("Structures", "מבנים"), "h": ("Net houses and farm structures", "בתי רשת ומבנים חקלאיים"), "img": "forest",
         "alt": ("A large white net house below a wooded hillside", "בית רשת לבן וגדול מתחת לגבעה מיוערת"),
         "p": ("Orchards and bananas, loading sheds and windbreaks. Built by our crews in Israel, and by local crews we train and manage abroad.", "מטעים ובננות, סככות העמסה ושוברי רוח. מקימים אותם הצוותים שלנו בישראל, ובחו״ל צוותים מקומיים שאנחנו מדריכים ומנהלים."),
         "chips": [("11% shade net for bananas", "רשת צל 11% לבננות"), ("10–30% shade net for orchards", "רשת צל 10%–30% למטעים")], "href": "net-houses.html"},  # 1.7, 2.1-2.4
        {"k": ("Turnkey, abroad", "חוות מפתח בחו״ל"), "h": ("Complete farms abroad", "חוות שלמות בחו״ל"), "img": None, "alt": None,  # no photo until a delivered farm can be shown (1.3; registry O1 is a banana net house)
         "p": ("Soil testing and a business plan, structures and irrigation, planting, a local team, growing and marketing. With agricultural partners.", "בדיקת קרקע ותוכנית עסקית, מבנים והשקיה, שתילה, צוות מקומי, גידול ושיווק. עם שותפים חקלאיים."),
         "chips": [("For investors", "למשקיעים"), ("From 30 ha", "מ-300 דונם")], "href": "turnkey-farms.html"},  # 1.3, 1.4, 4.2
    ],
    "field_k": ("From the field", "מהשטח"),
    "world_k": ("Where we have built", "איפה בנינו"),
    "world_unit": ("ha", "דונם"),
    "world_more": [(("Israel", "ישראל"), ("Kiwi in the Upper Galilee, bananas in the Western Galilee, apples in the Golan Heights, and cherries", "קיווי בגליל העליון, בננות בגליל המערבי, תפוחים ברמת הגולן, ודובדבנים")),  # 3.1
                   (("Portugal", "פורטוגל"), ("An avocado net house; the client came by referral", "בית רשת לאבוקדו; הלקוח הגיע בהמלצה")),
                   (("Belarus", "בלארוס"), ("A complex project, on schedule, with local manufacturing and crews", "פרויקט מורכב, בלוח הזמנים, עם ייצור וצוותים מקומיים"))],  # 3.3, 3.6
    "world_cap": ("Areas as of 2015.", "השטחים נכונים ל-2015."),
    "owners_k": ("Who you deal with", "מול מי עובדים"),
    "path_k": ("Investors", "למשקיעים"),
    "path_h": ("A farm end to end: 11 stages, from the soil to the harvest.", "חווה מקצה לקצה: 11 שלבים, מהקרקע ועד הקטיף."),  # 2 (q3)
}

# ---------------------------------------------------------------- V3 home ("under the net")
HOME3 = {
    "h1": ("A net roof over your crop.", "גג של רשת מעל הגידול שלכם."),
    "lead": ("We design, make and build galvanized-steel net houses for orchards and bananas, against hail, sun and wind, in Israel and abroad.",
             "אנחנו מתכננים, מייצרים ומקימים בתי רשת מפלדה מגולוונת למטעים ולבננות, נגד ברד, שמש ורוח, בישראל ובחו״ל."),  # 1.6, 1.7, 2.1-2.3
    "cta2": ("Which net for your crop?", "איזו רשת לגידול שלכם?"),
    "invest": ("Investing in a farm abroad? Turnkey farms, delivered with agricultural partners", "משקיעים בחווה בחו״ל? חוות מפתח, יחד עם שותפים חקלאיים"),  # 1.3, 1.4
    "crop_h": ("Which net house for your crop?", "איזה בית רשת מתאים לגידול שלכם?"),
    "crop_p": ("Choose a crop to see its net and structure.", "בחרו גידול כדי לראות את הרשת והמבנה שלו."),
    "crop_proj": ("On a MIFTAH project", "בפרויקט של מיפתח"),
    "crop_min": ("Projects from 5 ha (50 dunam) in Israel and 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-300 דונם בחו״ל."),  # 4.2
    "crop_cta": ("Discuss a project for this crop", "דברו איתנו על פרויקט לגידול הזה"),
    "crop_ask": ("Ask about your crop", "שאלו על הגידול שלכם"),
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
    "sim_go": ("Watch one go up, step by step (3D)", "צפו בהקמה, שלב אחרי שלב (תלת-ממד)"),
}

CROPS = [  # the crop selector; every row traces to the ledger
    {"id": "banana", "label": ("Bananas", "בננות"),
     "say": ("An 11% net, light and airy, over wide spans.", "רשת 11%, קלה ואוורירית, על פני מפתחים רחבים."),
     "rows": [(("Net", "רשת"), ("11% shade net", "רשת צל 11%")),
              (("Protects", "מגינה"), ("From wind and hail, and it saves water in the hot season by reducing evaporation", "מפני רוח וברד, ובעונה החמה חוסכת מים כי היא מפחיתה התאדות")),
              (("Structure", "מבנה"), ("Wide spans: one structure can reach 10 ha (100 dunam), with trellising and support built in", "מפתחים רחבים: מבנה בודד יכול להגיע ל-100 דונם, עם הדליה ותמיכה מובנות"))],
     "proj": ("Banana net house with 11% net, Western Galilee", "בית רשת לבננות עם רשת 11%, הגליל המערבי")},  # 2.2, 3.1
    {"id": "apple", "label": ("Apples", "תפוחים"),
     "say": ("A net against hail and sunburn, folded away in winter.", "רשת נגד ברד וכוויות שמש, שמתקפלת בחורף."),
     "rows": [(("Net", "רשת"), ("10–30% shade net", "רשת צל 10%–30%")),
              (("Protects", "מגינה"), ("Mainly against hail and sunburn at flowering and fruit set", "בעיקר מפני ברד וכוויות שמש בפריחה ובחנטה")),
              (("Season", "עונה"), ("Spread in summer, folded in winter, by hand or automatically", "נפרסת בקיץ ומתקפלת בחורף, ידנית או אוטומטית"))],
     "proj": ("Apple net house, Golan Heights", "בית רשת לתפוחים, רמת הגולן")},  # 2.3, 3.1
    {"id": "cherry", "label": ("Cherries", "דובדבנים"),
     "say": ("Orchard nets against hail and sunburn.", "רשת מטע נגד ברד וכוויות שמש."),
     "rows": [(("Net", "רשת"), ("10–30% shade net", "רשת צל 10%–30%")),
              (("Protects", "מגינה"), ("Mainly against hail and sunburn at flowering and fruit set", "בעיקר מפני ברד וכוויות שמש בפריחה ובחנטה")),
              (("Season", "עונה"), ("The net can fold away in winter and spread again in summer", "הרשת יכולה להתקפל בחורף ולהיפרס שוב בקיץ"))],
     "proj": ("Cherry orchard net house", "בית רשת למטע דובדבנים")},  # 2.3, 3.1
    {"id": "kiwi", "label": ("Kiwi", "קיווי"),
     "say": ("Net and trellis built as one: a pergola for the kiwi vines.", "רשת והדליה כמבנה אחד: סוכה לצמחי הקיווי."),
     "rows": [(("Trellis", "הדליה"), ("A pergola trellis, built with the structure", "הדליה בצורת סוכה, שנבנית יחד עם המבנה")),
              (("Net", "רשת"), ("Chosen for the site and the crop", "נבחרת לפי האתר והגידול")),
              (("Support", "תמיכה"), ("Trellising and support are part of the structure", "ההדליה והתמיכה הן חלק מהמבנה"))],
     "proj": ("Kiwi net house with a pergola trellis, Upper Galilee", "בית רשת לקיווי עם הדליית סוכה, הגליל העליון")},  # 2.5, 3.1
    {"id": "avocado", "label": ("Avocado", "אבוקדו"),
     "say": ("Built abroad: an avocado net house in Portugal.", "נבנה בחו״ל: בית רשת לאבוקדו בפורטוגל."),
     "rows": [(("Where", "איפה"), ("Portugal. The client came to us by referral and is willing to give a reference", "פורטוגל. הלקוח הגיע אלינו בהמלצה ומוכן להמליץ עלינו")),
              (("Net", "רשת"), ("Chosen for the site and the crop", "נבחרת לפי האתר והגידול")),
              (("Abroad", "בחו״ל"), ("We plan the work, train local crews and manage the build on site", "אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע בשטח"))],
     "proj": ("Avocado net house, Portugal", "בית רשת לאבוקדו, פורטוגל")},  # 3.1, 3.5, 3.6
    {"id": "other", "label": ("Other crops", "גידולים אחרים"),
     "say": ("Persimmon, tobacco and more, plus loading sheds and windbreaks.", "אפרסמון, טבק ועוד, וגם סככות העמסה ושוברי רוח."),
     "rows": [(("Structures", "מבנים"), ("Net houses, loading sheds with wide spans, windbreaks, trellising", "בתי רשת, סככות העמסה במפתחים רחבים, שוברי רוח, הדליה")),
              (("Service", "שירות"), ("Maintenance over the years, dismantling, and preparing the material for a new structure", "תחזוקה לאורך השנים, פירוק והכנת החומר למבנה חדש")),
              (("Not listed?", "לא ברשימה?"), ("Tell us the crop and what it needs protecting from. We'll tell you honestly whether a net house fits.", "ספרו לנו מה הגידול וממה צריך להגן עליו. נגיד לכם בכנות אם בית רשת מתאים."))],
     "proj": None},  # 2.1, 2.4-2.6
]

