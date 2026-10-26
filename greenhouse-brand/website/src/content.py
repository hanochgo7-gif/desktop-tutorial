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
    "menu": ("Menu", "תפריט"),
    "lang_other": ("עברית", "English"),
    "cta": ("Discuss your project", "דברו איתנו על הפרויקט"),
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
    "map_label": ("Map of MIFTAH projects abroad: Mexico, Honduras, Spain, Portugal, Belarus, Georgia and India, run from Kfar Masaryk, Israel. The same information is in the projects table.",
                  "מפת הפרויקטים של מיפתח בחו״ל: מקסיקו, הונדורס, ספרד, פורטוגל, בלארוס, גאורגיה והודו, בניהול מכפר מסריק. אותו מידע מופיע בטבלת הפרויקטים."),
    "swipe": ("Swipe sideways to see the whole drawing.", "החליקו הצידה כדי לראות את כל השרטוט."),
    "archive": ("MIFTAH archive", "ארכיון מיפתח"),
}

NAV = [  # (slug, en, he)
    ("net-houses", "Net houses", "בתי רשת"),
    ("turnkey-farms", "Turnkey farms", "חוות מפתח"),
    ("projects", "Projects", "פרויקטים"),
    ("about", "About", "אודות"),
    ("contact", "Contact", "צור קשר"),
]

# ---------------------------------------------------------------- shared blocks
FACTS = [  # once, under the home hero
    (("20+", "20+"), ("years designing and building agricultural structures", "שנים של תכנון והקמה של מבנים חקלאיים")),  # 1.6
    (("410,000 m²", "410,000 מ״ר"), ("(41 ha) of net houses built abroad, in Mexico, India, Honduras, Spain and Georgia", "(410 דונם) בתי רשת שהקמנו בחו״ל: מקסיקו, הודו, הונדורס, ספרד וגאורגיה")),  # 3.2
    (("Own plant", "מפעל משלנו"), ("poles, nets, cables and fittings are made and checked before they ship", "עמודים, רשתות, כבלים ואביזרים מיוצרים ונבדקים לפני היציאה לשטח")),  # 1.7
    (("From 5 ha", "מ-50 דונם"), ("project size in Israel, and from 30 ha abroad", "גודל פרויקט בישראל, ומ-30 הקטר בחו״ל")),  # 4.2
]

STEPS = [  # OS consult (2.8), one real photo each
    ("p-site", ("Needs mapping on site", "מיפוי צרכים בשטח"),
     ("We meet you on the land and map the crop, soil, location, drainage, access roads and wind before anything is drawn.",
      "נפגשים בשטח וממפים את הגידול, הקרקע, המיקום, הניקוז, דרכי הגישה ומשטר הרוחות, לפני שמשרטטים קו אחד."),
     ("Setting up on a MIFTAH project site", "התמקמות בשטח של פרויקט של מיפתח")),
    ("p-marking", ("Engineering design", "תכנון הנדסי"),
     ("Our practical engineers in construction calculate the loads and produce the drawings and a detailed bill of quantities, so material, strength and budget are balanced.",
      "הנדסאי בניין מחשבים עומסים ומפיקים שרטוטים וכתב כמויות מפורט, כדי לאזן בין כמות החומר, החוזק והתקציב."),
     ("Marking out the pole lines from the design, with the local crew", "סימון קווי העמודים לפי התכנון, עם הצוות המקומי")),
    ("p-poles", ("Manufacturing in our plant", "ייצור במפעל שלנו"),
     ("After the quote is approved, poles, nets, cables and fittings are made, packed for the site and checked before they leave.",
      "אחרי אישור הצעת המחיר, העמודים, הרשתות, הכבלים ואביזרי החיבור מיוצרים, נארזים לשטח ונבדקים לפני היציאה."),
     ("Galvanized poles from our plant, set out on site to the design", "עמודים מגולוונים מהמפעל שלנו, מוצבים בשטח לפי התכנון")),
    ("p-closed", ("Installation and maintenance", "הקמה ותחזוקה"),
     ("Our crews, certified for work at height, build the structure with the trellising the crop needs, and maintain it as the materials weather.",
      "הצוותים שלנו, בעלי הכשרה לעבודה בגובה, מקימים את המבנה עם ההדליה שהגידול צריך, ומתחזקים אותו לאורך השנים."),
     ("A closed net house with its entrance door", "בית רשת סגור, עם דלת כניסה")),
]

DRAWING = {  # labels for the signature section drawing; numbers match the legend
    "title": ("Section through a MIFTAH net house", "חתך של בית רשת של מיפתח"),
    "items": [
        (("Net", "רשת"), ("10–30% shade for orchards, against hail and sunburn at flowering and fruit set. 11% for bananas, light and airy.",
                         "10%–30% צל למטעים, נגד ברד ונזקי שמש בפריחה ובחנטה. 11% לבננות: רשת קלה ואוורירית.")),  # 2.2, 2.3
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
    ("mx", 23.6, -102.5, 150000, "Mexico", "מקסיקו", "w"),
    ("hn", 14.8, -86.8, 70000, "Honduras", "הונדורס", "e"),
    ("es", 40.0, -3.7, 60000, "Spain", "ספרד", "e"),
    ("pt", 39.4, -8.2, None, "Portugal", "פורטוגל", "w"),
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
    (("Kiwi", "קיווי"), ("Upper Galilee, Israel", "הגליל העליון"), ("Net house with a pergola-shaped trellis", "בית רשת עם הדליה בצורת סוכה")),
    (("Bananas", "בננות"), ("Western Galilee, Israel", "הגליל המערבי"), ("Banana net house with 11% net", "בית רשת לבננות עם רשת 11%")),
    (("Apples", "תפוחים"), ("Golan Heights, Israel", "רמת הגולן"), ("Orchard net house", "בית רשת למטע")),
    (("Cherries", "דובדבנים"), ("Israel", "ישראל"), ("Orchard net house", "בית רשת למטע")),
    (("Avocado", "אבוקדו"), ("Portugal", "פורטוגל"), ("Avocado net house", "בית רשת לאבוקדו")),
]

STAGES = [  # Q q3 rows marked "us" (2): 11 stages. (phase, title, receive)
    (("Assess", "בדיקה"), [
        (("Soil testing and crop fit", "בדיקת קרקע והתאמת גידול"), ("Soil test results and a crop recommendation for your site.", "תוצאות בדיקת קרקע והמלצה על גידול מתאים לשטח.")),
        (("Business plan and budget", "תוכנית עסקית ותקציב"), ("A business plan and budget for the investor.", "תוכנית עסקית ותקציב למשקיע.")),
    ]),
    (("Design", "תכנון"), [
        (("Farm design", "תכנון החווה"), ("Structures, irrigation and roads laid out as one farm.", "מבנים, השקיה ודרכים, מתוכננים כחווה אחת.")),
    ]),
    (("Build", "הקמה"), [
        (("Structures and net houses", "מבנים ובתי רשת"), ("Net houses, sheds and windbreaks, made in our plant and built to the design.", "בתי רשת, סככות ושוברי רוח, מיוצרים במפעל שלנו ומוקמים לפי התכנון.")),
        (("Irrigation systems", "מערכות השקיה"), ("Water supply and irrigation installed and working before planting.", "אספקת מים והשקיה, מותקנות ופועלות לפני השתילה.")),
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

TYPES = [  # Net houses page, organised by crop (market research implication 1)
    {"id": "banana", "img": "valley",
     "h": ("Banana net houses", "בתי רשת לבננות"), "crops": ("Bananas", "בננות"),
     "rows": [
         (("Net", "רשת"), ("11% shade net: light and very airy.", "רשת צל 11%: קלה ואוורירית מאוד.")),
         (("Protects against", "מגן מפני"), ("Wind and hail in winter. In summer it saves water by reducing evaporation, and gives the plants better growing conditions.", "רוח וברד בחורף. בקיץ חוסך מים כי הוא מפחית התאדות, ונותן לצמחים תנאי גידול טובים יותר.")),
         (("Structure", "מבנה"), ("Large spans between poles, so a single structure can cover up to 10 ha (100 dunam). Trellising and plant support are part of the structure.", "מפתחים גדולים בין העמודים, כך שמבנה בודד יכול להגיע ל-100 דונם. ההדליה ומערכת התמיכה לשתילים הן חלק מהמבנה.")),
         (("Why it pays", "למה זה משתלם"), ("The light net and wide spans use less material than other net houses.", "הרשת הקלה והמפתחים הרחבים חוסכים חומר לעומת בתי רשת אחרים.")),
     ], "cap": ("A large net house in a valley, built by MIFTAH", "בית רשת גדול בעמק, שהקימה מיפתח")},  # 2.2
    {"id": "orchard", "img": "forest",
     "h": ("Orchard net houses", "בתי רשת למטעים"), "crops": ("Apple, cherry, kiwi, avocado, persimmon", "תפוח, דובדבן, קיווי, אבוקדו, אפרסמון"),
     "rows": [
         (("Net", "רשת"), ("10% to 30% shade, chosen for the crop.", "10% עד 30% צל, לפי הגידול.")),
         (("Protects against", "מגן מפני"), ("Hail and sunburn during flowering and fruit set, when trees are most sensitive and a single storm can cut the yield.", "ברד ונזקי שמש בפריחה ובחנטה, כשהעצים הכי רגישים וסערה אחת יכולה לפגוע ביבול.")),
         (("Structure", "מבנה"), ("Built so the nets fold away in winter and spread in summer. Automatic folding systems can be added.", "בנוי כך שהרשת מתקפלת בחורף ונפרסת בקיץ. אפשר להוסיף מערכת פריסה וקיפול אוטומטית.")),
         (("Trellising", "הדליה"), ("Support systems for the crop, such as a pergola-shaped trellis for kiwi.", "מערכות תמיכה לגידול, כמו הדליה בצורת סוכה לקיווי.")),
     ], "cap": ("A net house against a pine forest, built by MIFTAH", "בית רשת על רקע יער אורנים, שהקימה מיפתח")},  # 2.3, 3.1
    {"id": "sheds", "img": None,
     "h": ("Loading sheds and windbreaks", "סככות העמסה ושוברי רוח"), "crops": ("For the farm around the orchard", "לחווה שמסביב למטע"),
     "rows": [
         (("Loading sheds", "סככות העמסה"), ("Shade sheds for loading, unloading and handling produce. Wide spans leave room for trucks and carts to turn.", "סככות צל להעמסה, לפריקה ולטיפול בתוצרת. מפתחים רחבים משאירים מקום לתמרון של משאיות ועגלות.")),
         (("Net to order", "רשת לפי הזמנה"), ("Shade percentage and colour chosen with you. An opening and closing system can be added for bad weather.", "אחוז הצל והצבע נבחרים איתך. אפשר להוסיף מערכת פתיחה וסגירה למזג אוויר קשה.")),
         (("Windbreaks", "שוברי רוח"), ("Designed and built with the rest of the farm.", "מתוכננים ומוקמים יחד עם שאר החווה.")),
     ], "cap": None},  # 2.4, 2.5
    {"id": "service", "img": None,
     "h": ("Maintenance, dismantling and reuse", "תחזוקה, פירוק ושימוש חוזר"), "crops": ("For structures already in the field", "למבנים שכבר עומדים בשטח"),
     "rows": [
         (("Maintenance", "תחזוקה"), ("Care for structures as nets, cables and fittings weather over the years.", "טיפול במבנים לאורך השנים, כשהרשתות, הכבלים והאביזרים מתבלים.")),
         (("Dismantling", "פירוק"), ("Taking structures down, and processing and preparing the material for a new structure when needed.", "פירוק מבנים, ובמידת הצורך עיבוד והכנה של החומר למבנה חדש.")),
         (("One stage only", "שלב אחד בלבד"), ("Needs mapping, design, manufacture, supervision, training or maintenance can each be ordered on their own.", "אפשר להזמין בנפרד מיפוי צרכים, תכנון, ייצור, פיקוח, הדרכה או תחזוקה.")),
     ], "cap": None},  # 2.6, 2.7
]

VALUES = [  # Q q23 (client's own words), OS credo
    (("A word is a word", "מילה זו מילה"), ("What we agree is what gets built.", "מה שסוכם הוא מה שנבנה.")),
    (("Like family", "כמו משפחה"), ("Clients stay with us for years. They know there is someone to rely on.", "לקוחות נשארים איתנו שנים. הם יודעים שיש על מי לסמוך.")),
    (("Made to measure", "תפור למידה"), ("Every structure is fitted to the client's crop, land and requirements.", "כל מבנה מותאם לגידול, לקרקע ולדרישות של הלקוח.")),
]

# ---------------------------------------------------------------- pages
PAGES = {
    "index": {
        "title": ("Net houses for orchards and bananas | MIFTAH Projects", "בתי רשת למטעים ולבננות | מיפתח פרויקטים"),
        "desc": ("Galvanized-steel net houses for orchards and bananas, designed, made and installed by MIFTAH Projects in Israel and abroad. Turnkey farms abroad with partners.",
                 "מיפתח פרויקטים מתכננת, מייצרת ומקימה בתי רשת מפלדה מגולוונת למטעים ולבננות בישראל ובחו״ל, ומקימה חוות מפתח בחו״ל יחד עם שותפים חקלאיים."),
        "h1": ("We design, make and build net houses for orchards.", "אנחנו מתכננים, מייצרים ומקימים בתי רשת למטעים."),
        "lead": ("Galvanized-steel net houses against hail, wind and sun, made in our own plant and built by our own crews, in Israel and abroad for more than 20 years. For investors abroad, complete turnkey farms with agricultural partners.",
                 "בתי רשת מפלדה מגולוונת נגד ברד, רוח ושמש, מיוצרים במפעל שלנו ומוקמים בידי הצוותים שלנו, בישראל ובחו״ל כבר יותר מ-20 שנה. ולמשקיעים בחו״ל: חוות מפתח שלמות, יחד עם שותפים חקלאיים."),
        "cta2": ("For investors: turnkey farms", "למשקיעים: חוות מפתח"),
        "vidcap": ("Drone footage of a net house built by MIFTAH", "צילום רחפן של בית רשת שהקימה מיפתח"),
        "routes_h": ("Two ways to work with us", "שתי דרכים לעבוד איתנו"),
        "r1_who": ("For growers and agricultural companies", "למגדלים ולחברות חקלאיות"),
        "r1_h": ("Net houses and farm structures", "בתי רשת ומבנים חקלאיים"),
        "r1_p": ("Net houses for orchards and bananas, loading sheds and windbreaks. We map your needs on site, engineer the structure, make it in our plant, install it and maintain it.",
                 "בתי רשת למטעים ולבננות, סככות העמסה ושוברי רוח. ממפים את הצרכים בשטח, מתכננים הנדסית, מייצרים במפעל שלנו, מקימים ומתחזקים."),
        "r1_min": ("Projects from 5 ha in Israel and 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-30 הקטר בחו״ל."),
        "r1_go": ("Net houses and structures", "בתי רשת ומבנים"),
        "r2_who": ("For investors, agricultural companies and entrepreneurs", "למשקיעים, לחברות חקלאיות וליזמים"),
        "r2_h": ("Turnkey farms abroad", "חוות מפתח בחו״ל"),
        "r2_p": ("A complete farm on your land, from soil testing and a business plan to planting, a local team, growing and marketing. Delivered by MIFTAH together with agricultural partners.",
                 "חווה שלמה על הקרקע שלך, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול ושיווק. מיפתח מבצעת את זה יחד עם שותפים חקלאיים."),
        "r2_min": ("Projects from 30 ha.", "פרויקטים מ-30 הקטר."),
        "r2_go": ("Turnkey farms", "חוות מפתח"),
        "draw_h": ("What a MIFTAH net house is made of", "ממה עשוי בית רשת של מיפתח"),
        "draw_p": ("Every structure is engineered for the crop, the soil and the wind on its site. These are the parts we design, make and install.",
                   "כל מבנה מתוכנן הנדסית לגידול, לקרקע ולרוח באתר שלו. אלה החלקים שאנחנו מתכננים, מייצרים ומקימים."),
        "steps_h": ("How a project runs", "איך מתנהל פרויקט"),
        "steps_p": ("Four steps, the same on every project, in Israel or abroad. Each one can also be ordered on its own.",
                    "ארבעה שלבים, אותו סדר בכל פרויקט, בישראל ובחו״ל. אפשר להזמין כל שלב גם בנפרד."),
        "photos_note": ("Photos from MIFTAH project sites.", "צילומים מאתרי פרויקטים של מיפתח."),
        "map_h": ("Projects on three continents", "פרויקטים בשלוש יבשות"),
        "map_p": ("Net houses in Mexico, India, Honduras, Spain and Georgia, an avocado net house in Portugal, and a complex project in Belarus, all from our office in Kfar Masaryk.",
                  "בתי רשת במקסיקו, בהודו, בהונדורס, בספרד ובגאורגיה, בית רשת לאבוקדו בפורטוגל ופרויקט מורכב בבלארוס, כולם מהמשרד שלנו בכפר מסריק."),
        "map_go": ("All projects", "לכל הפרויקטים"),
        "why_h": ("Why clients stay with us", "למה לקוחות נשארים איתנו"),
        "why_statement": ("You get peace of mind, and time to focus on your crop and your business.", "אתם מרוויחים שקט, וזמן להתמקד בגידול ובפיתוח העסק."),  # 4.6
        "why_refs": ("References from clients in Israel and Portugal are available after a first conversation.", "המלצות מלקוחות בישראל ובפורטוגל, אחרי שיחה ראשונה."),  # 3.5
    },
    "net-houses": {
        "title": ("Net houses for bananas and orchards | MIFTAH Projects", "בתי רשת לבננות ולמטעים, סככות ושוברי רוח | מיפתח פרויקטים"),
        "desc": ("Banana net houses with 11% net, orchard net houses with 10–30% net that fold in winter, loading sheds and windbreaks. Designed, made and installed by MIFTAH.",
                 "בתי רשת לבננות עם רשת 11%, בתי רשת למטעים עם רשת 10%–30% שמתקפלת בחורף, סככות העמסה ושוברי רוח: מתוכננים, מיוצרים במפעל שלנו ומוקמים בידי מיפתח."),
        "h1": ("Net houses and farm structures", "בתי רשת ומבנים חקלאיים"),
        "lead": ("We design, manufacture and install net houses for orchards and bananas, and the loading sheds and windbreaks around them. One team from the first site visit to maintenance.",
                 "אנחנו מתכננים, מייצרים ומקימים בתי רשת למטעים ולבננות, וגם את סככות ההעמסה ושוברי הרוח שמסביב. צוות אחד, מהביקור הראשון בשטח ועד התחזוקה."),
        "types_h": ("By crop and by use", "לפי גידול ולפי שימוש"),
        "draw_h": ("The parts of the structure", "החלקים של המבנה"),
        "steps_h": ("From site visit to maintenance", "מהביקור בשטח ועד התחזוקה"),
        "steps_p": ("The same four steps on every project. Each one can also be ordered on its own.", "אותם ארבעה שלבים בכל פרויקט. אפשר להזמין כל שלב גם בנפרד."),
        "site_h": ("Designed for the site, not from a catalogue", "מתוכנן לאתר, לא מקטלוג"),
        "site_p": ("Before a structure is drawn, we look at the crop, the soil, drainage, access for trucks and the local wind regime. Loads are calculated per project, and the bill of quantities balances the amount of steel and net against strength and budget.",
                   "לפני שמשרטטים מבנה, בודקים את הגידול, הקרקע, הניקוז, הגישה למשאיות ומשטר הרוחות המקומי. העומסים מחושבים לכל פרויקט, וכתב הכמויות מאזן בין כמות הפלדה והרשת לבין החוזק והתקציב."),
        "abroad_h": ("Abroad", "בחו״ל"),
        "abroad_p": ("On projects outside Israel we plan the work, train and manage local crews, and run execution on site. Components usually come from our plant in Israel; in Belarus, manufacturing was organised locally.",
                     "בפרויקטים מחוץ לישראל אנחנו מתכננים את העבודה, מדריכים ומנהלים צוותים מקומיים ומנהלים את הביצוע בשטח. הרכיבים מגיעים בדרך כלל מהמפעל שלנו בישראל; בבלארוס הייצור נעשה במקום."),  # 3.2, 1.7
    },
    "turnkey-farms": {
        "title": ("Turnkey farms abroad for investors | MIFTAH Projects", "חוות מפתח בחו״ל למשקיעים | מיפתח פרויקטים"),
        "desc": ("A complete farm on your land abroad, from soil testing and a business plan to planting, growing and marketing. Delivered with agricultural partners, from 30 ha.",
                 "חווה שלמה על הקרקע שלך בחו״ל, מבדיקת קרקע ותוכנית עסקית ועד שתילה, צוות מקומי, גידול, תחזוקה ושיווק. מיפתח מבצעת יחד עם שותפים חקלאיים, מ-30 הקטר."),
        "h1": ("Turnkey farms abroad", "חוות מפתח בחו״ל"),
        "lead": ("For investors, agricultural companies and entrepreneurs who want a working farm on their land, without hiring a contractor, an agronomist and a site manager separately.",
                 "למשקיעים, לחברות חקלאיות וליזמים שרוצים חווה עובדת על הקרקע שלהם, בלי לשכור בנפרד קבלן, אגרונום ומנהל עבודה."),
        "honest_h": ("Our newest line of work", "תחום העבודה החדש שלנו"),
        "honest_p": ("We deliver turnkey farms together with agricultural partners. The structures at the core of the farm come from what we have built for more than 20 years, in Israel and on three continents.",
                     "את חוות המפתח אנחנו מבצעים יחד עם שותפים חקלאיים. המבנים שבלב החווה מגיעים ממה שאנחנו בונים כבר יותר מ-20 שנה, בישראל ובשלוש יבשות."),  # 1.4, D4
        "stages_h": ("Eleven stages, and what you receive at each", "אחד-עשר שלבים, ומה מקבלים בכל אחד"),
        "stages_p": ("Take the whole path, or a single stage.", "אפשר לקחת את כל הדרך, או שלב אחד."),
        "excl_h": ("What stays with you", "מה נשאר אצלך"),
        "excl_1": ("Local licensing and permits, with your local advisers.", "רישוי והיתרים מקומיים, עם היועצים המקומיים שלך."),  # q3 r2
        "excl_2": ("Formal investor reporting on budget and progress, with your own advisers.", "דיווח פורמלי למשקיעים על תקציב והתקדמות, עם היועצים שלך."),  # q3 r12
        "start_h": ("Start with the assessment", "מתחילים בבדיקה"),
        "start_p": ("You can begin with soil testing, crop fit and a business plan alone, and decide on the build once the numbers are in front of you.",
                    "אפשר להתחיל רק בבדיקת קרקע, התאמת גידול ותוכנית עסקית, ולהחליט על ההקמה כשהמספרים מונחים לפניך."),  # 2.7
        "mistake_h": ("The mistake we see most", "הטעות שאנחנו רואים הכי הרבה"),
        "mistake_p": ("Investors trying to set up the farm by themselves to save money.",
                      "משקיעים שמנסים להקים את החווה לבד כדי לחסוך כסף."),  # 4.7
        "pt_h": ("Already working in Portugal", "כבר עובדים בפורטוגל"),
        "pt_p": ("We built an avocado net house in Portugal. The client came to us by referral and is willing to talk to new investors after a first conversation with us.",
                 "הקמנו בית רשת לאבוקדו בפורטוגל. הלקוח הגיע אלינו בהמלצה, ומוכן לדבר עם משקיעים חדשים אחרי שיחה ראשונה איתנו."),  # 3.1, 3.5, 3.6
        "core_h": ("Structures at the core of the farm", "המבנים בלב החווה"),
        "core_p": ("The net houses, sheds and windbreaks of a turnkey farm are the same structures we design, make and build for growers.",
                   "בתי הרשת, הסככות ושוברי הרוח של חוות מפתח הם אותם מבנים שאנחנו מתכננים, מייצרים ומקימים לחקלאים."),
        "core_go": ("How we build net houses", "איך אנחנו בונים בתי רשת"),
        "where_h": ("Where", "איפה"),
        "where_p": ("Portugal and other European countries, Israel, and we are open to projects in Africa. Minimum farm size: 30 ha.",
                    "פורטוגל ומדינות נוספות באירופה, ישראל, ואנחנו פתוחים לפרויקטים באפריקה. גודל חווה מינימלי: 30 הקטר."),  # 4.1, 4.2
    },
    "projects": {
        "title": ("Projects in Israel, Europe and the Americas | MIFTAH Projects", "פרויקטים בישראל, באירופה ובאמריקה | מיפתח פרויקטים"),
        "desc": ("410,000 m² of net houses built in Mexico, India, Honduras, Spain and Georgia, plus Portugal and Belarus, and net houses in the Galilee and the Golan Heights.",
                 "410,000 מ״ר של בתי רשת בחו״ל: מקסיקו, הודו, הונדורס, ספרד וגאורגיה, וגם פורטוגל ובלארוס. ובישראל: בתי רשת לקיווי, לבננות, לתפוחים ולדובדבנים."),
        "h1": ("Projects in Israel and abroad", "פרויקטים בישראל ובחו״ל"),
        "lead": ("Net houses on three continents, run from our office in Kfar Masaryk. Abroad, we plan the work, train and manage local crews, and supervise execution.",
                 "בתי רשת בשלוש יבשות, מהמשרד שלנו בכפר מסריק. בחו״ל אנחנו מתכננים את העבודה, מדריכים ומנהלים צוותים מקומיים ומפקחים על הביצוע."),
        "map_h": ("Abroad", "בחו״ל"),
        "tbl_cap": ("Projects outside Israel", "פרויקטים מחוץ לישראל"),
        "th_country": ("Country", "מדינה"), "th_work": ("Work", "עבודה"), "th_area": ("Area (m²)", "שטח (מ״ר)"),
        "total": ("Total area shown", "סך השטח המפורט"),
        "feat_h": ("Selected projects", "פרויקטים נבחרים"),
        "feat_th": (("Crop", "Structure", "Region"), ("גידול", "מבנה", "אזור")),
        "feat_p": ("Client names and detailed figures are published only with each client's approval. References are available after a first conversation.",
                   "שמות לקוחות ונתונים מפורטים מתפרסמים רק באישור של כל לקוח. המלצות זמינות אחרי שיחה ראשונה."),  # q13, O2
        "aerial_cap": ("A MIFTAH net house from the air, among orchards and hills", "בית רשת של מיפתח מהאוויר, בין מטעים וגבעות"),
    },
    "about": {
        "title": ("About MIFTAH Projects: a family company in Israel", "אודות מיפתח פרויקטים: חברה משפחתית שבונה לחקלאים"),
        "desc": ("MIFTAH Projects is a family company in Kfar Masaryk, Israel, led by co-CEOs Merav and Yiftach Hasfel, building agricultural structures for more than 20 years.",
                 "מיפתח פרויקטים היא חברה משפחתית בכפר מסריק, בניהול משותף של מרב ויפתח הספל. החברה יוזמת, מתכננת ומבצעת פרויקטים בחקלאות, מהתשתיות ועד כל סוגי המבנים החקלאיים."),
        "h1": ("A family company that builds for growers", "חברה משפחתית שבונה לחקלאים"),
        "lead": ("We initiate, design and carry out agricultural projects, from the project's infrastructure to every kind of agricultural structure. More than 20 years, from Kfar Masaryk in the north of Israel.",
                 "אנחנו יוזמים, מתכננים ומבצעים פרויקטים בחקלאות, מהתשתיות של הפרויקט ועד כל סוגי המבנים החקלאיים. יותר מ-20 שנה, מכפר מסריק שבצפון."),  # 1.1, 1.6
        "people_h": ("The owners", "הבעלים"),
        "yiftach": ("Yiftach Hasfel", "יפתח הספל"), "yiftach_r": ("Co-CEO and owner", "מנכ״ל משותף ובעלים"),
        "yiftach_p": ("Practical engineer in construction, trained at the Technion. Leads needs mapping, engineering design, development, quality control, production supervision and execution. He ran a complex project in Belarus that kept to schedule with local manufacturing, shipping and local crews.",
                      "הנדסאי בניין מטעם הטכניון. מוביל את מיפוי הצרכים, התכנון ההנדסי, הפיתוח, הבקרה, הפיקוח על הייצור והביצוע. ניהל פרויקט מורכב בבלארוס שעמד בלוח הזמנים, עם ייצור מקומי, שילוח וצוותים מקומיים."),  # 5.1
        "merav": ("Merav Eyal Hasfel", "מרב איל הספל"), "merav_r": ("Co-CEO and owner", "מנכ״לית משותפת ובעלים"),
        "merav_p": ("BA in business administration. Runs the company day to day, its finance, and marketing and sales. Your first contact for a new project.",
                    "בעלת תואר ראשון במנהל עסקים. מנהלת את החברה ביום-יום, את הכספים ואת השיווק והמכירות. איש הקשר הראשון לפרויקט חדש."),  # 5.2, q40
        "how_h": ("How we work", "איך אנחנו עובדים"),
        "how_p": ("Our own plant makes the poles, nets, cables and fittings, and checks them before they ship. Our installation crews are trained for work at height and run several projects in parallel. The team brings together Israelis and agronomy students from abroad who come to study in Israel.",
                  "המפעל שלנו מייצר את העמודים, הרשתות, הכבלים והאביזרים ובודק אותם לפני היציאה לשטח. צוותי ההקמה שלנו בעלי הכשרה לעבודה בגובה ועובדים בכמה פרויקטים במקביל. בצוות עובדים ישראלים לצד סטודנטים לאגרונומיה מחו״ל שמגיעים ללמוד בישראל."),  # 1.7, 1.9, 5.4
        "values_h": ("Why clients stay with us", "למה לקוחות נשארים איתנו"),
        "company_h": ("Company details", "פרטי החברה"),
    },
    "contact": {
        "title": ("Request a project review | MIFTAH Projects", "בקשו בדיקת פרויקט | מיפתח פרויקטים"),
        "desc": ("Tell MIFTAH Projects where your land is, what you grow and how large it is, and we'll arrange a first conversation. Office: +972 4 985 4404.",
                 "ספרו למיפתח פרויקטים איפה הקרקע, מה מגדלים ומה גודל השטח, ונתאם שיחה ראשונה. משרד: 04-9854404, כפר מסריק."),
        "h1": ("Request a project review", "בקשו בדיקת פרויקט"),
        "lead": ("Tell us where the land is, what you grow or plan to grow, and how large it is. We'll contact you to arrange a first conversation, and a visit to the site when the project fits.",
                 "ספרו לנו איפה הקרקע, מה מגדלים או מתכננים לגדל, ומה גודל השטח. נחזור אליך כדי לתאם שיחה ראשונה, וביקור בשטח כשהפרויקט מתאים."),
        "aside_phone_h": ("Prefer to talk?", "מעדיפים לדבר?"),
        "aside_phone_p": ("Call the office and ask for Merav Hasfel, co-CEO.", "התקשרו למשרד ובקשו את מרב הספל, מנכ״לית משותפת."),
        "aside_min_h": ("Projects we take on", "פרויקטים שאנחנו לוקחים"),
        "aside_min_p": ("From 5 ha (50 dunam) in Israel and from 30 ha abroad. Pricing follows a review of the site, because every structure is designed for its land.",
                        "מ-50 דונם בישראל ומ-30 הקטר בחו״ל. המחיר נקבע אחרי בדיקה של השטח, כי כל מבנה מתוכנן לקרקע שלו."),  # 4.2, 4.3
        "aside_fair_h": ("Fruit Logistica, Berlin", "Fruit Logistica, ברלין"),
        "aside_fair_p": ("We'll be at Fruit Logistica, Messe Berlin, 3–5 February 2027. Tick the box in the form to arrange a meeting there.",
                         "נהיה בתערוכת Fruit Logistica במסה ברלין, 3–5 בפברואר 2027. סמנו בטופס אם תרצו להיפגש שם."),  # 4.10
        "aside_office_h": ("Office", "משרד"),
    },
    "profile": {
        "title": ("Company profile | MIFTAH Projects", "פרופיל החברה | מיפתח פרויקטים"),
        "desc": ("A one-page profile of MIFTAH Projects: net houses and farm structures, turnkey farms abroad, process, projects and contact. Printable as a PDF.",
                 "פרופיל של מיפתח פרויקטים בעמוד אחד: בתי רשת ומבנים חקלאיים, חוות מפתח בחו״ל, תהליך העבודה, פרויקטים ופרטי קשר. ניתן להדפסה כ-PDF."),
        "h1": ("Company profile", "פרופיל החברה"),
        "print": ("Print or save as PDF", "הדפסה או שמירה כ-PDF"),
        "bar_p": ("One page to attach to a quote or hand out at a meeting.", "עמוד אחד לצרף להצעת מחיר או לחלק בפגישה."),
        "who": ("MIFTAH Projects is a family company in Kfar Masaryk, Israel. We design, manufacture in our own plant, install and maintain galvanized-steel net houses for orchards and bananas, in Israel and abroad, and build turnkey farms abroad together with agricultural partners.",
                "מיפתח פרויקטים היא חברה משפחתית בכפר מסריק. אנחנו מתכננים, מייצרים במפעל שלנו, מקימים ומתחזקים בתי רשת מפלדה מגולוונת למטעים ולבננות, בישראל ובחו״ל, ומקימים חוות מפתח בחו״ל יחד עם שותפים חקלאיים."),
        "svc_h": ("What we build", "מה אנחנו בונים"),
        "turn_h": ("Turnkey farms abroad (with partners)", "חוות מפתח בחו״ל (עם שותפים)"),
        "proc_h": ("How a project runs", "איך מתנהל פרויקט"),
        "proj_h": ("Projects abroad", "פרויקטים בחו״ל"),
        "contact_h": ("Contact", "יצירת קשר"),
        "web": ("www.miftah.co.il", "www.miftah.co.il"),
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

CTA_HEADS = {  # a different opening line per page
    "home": ("Tell us about your land.", "ספרו לנו על הקרקע."),
    "net": ("Tell us about your crop and your plot.", "ספרו לנו על הגידול ועל החלקה."),
    "turnkey": ("Start with the assessment.", "מתחילים בבדיקה."),
    "projects": ("Planning a project of this size?", "מתכננים פרויקט בהיקף כזה?"),
    "about": ("Talk to Merav or Yiftach.", "דברו עם מרב או עם יפתח."),
}
CTA_BAND = {
    "h": ("Tell us about your land.", "ספרו לנו על הקרקע."),
    "p": ("Send the location, the crop and the area. We'll contact you to arrange a first conversation and, when the project fits, a visit to the site.",
          "שלחו מיקום, גידול ושטח. נחזור אליך לתאם שיחה ראשונה, וכשהפרויקט מתאים, ביקור בשטח."),
    "min": ("Projects from 5 ha in Israel and from 30 ha abroad.", "פרויקטים מ-50 דונם בישראל ומ-30 הקטר בחו״ל."),
    "fair": ("Meet us at Fruit Logistica, Berlin, 3–5 February 2027.", "נפגשים ב-Fruit Logistica, ברלין, 3–5 בפברואר 2027."),
}

FORM = {
    "h": ("Your project", "הפרויקט שלך"),
    "req": ("Fields marked * are required.", "שדות עם * הם חובה."),
    "name": ("Full name *", "שם מלא *"),
    "company": ("Company or organisation", "חברה או ארגון"),
    "email": ("Email *", "מייל *"),
    "phone": ("Phone or WhatsApp", "טלפון או וואטסאפ"),
    "phone_hint": ("With country code, e.g. +351…", "עם קידומת מדינה אם מחוץ לישראל"),
    "optional": ("optional", "לא חובה"),
    "role": ("I am *", "אני *"),
    "roles": [("investor", ("A private investor", "משקיע פרטי"), ("Investing in a farm or land", "משקיע בחווה או בקרקע")),
              ("company", ("An agricultural company", "חברה חקלאית"), ("Growing or developing at scale", "מגדלת או מפתחת בהיקף גדול")),
              ("entrepreneur", ("An entrepreneur", "יזם"), ("Building a new agricultural venture", "מקים מיזם חקלאי חדש")),
              ("grower", ("A grower or farm manager", "חקלאי או מנהל משק"), ("Running an orchard or plantation", "מנהל מטע או משק"))],
    "need": ("What do you need? *", "מה צריך? *"),
    "needs": [("nethouse", ("Net houses or farm structures", "בתי רשת או מבנים חקלאיים"), ("Orchards, bananas, loading sheds, windbreaks", "מטעים, בננות, סככות העמסה, שוברי רוח")),
              ("turnkey", ("A turnkey farm abroad", "חוות מפתח בחו״ל"), ("From soil testing to harvest, with partners", "מבדיקת קרקע ועד קטיף, עם שותפים")),
              ("stage", ("One stage only", "שלב אחד בלבד"), ("e.g. design, soil testing, maintenance", "למשל תכנון, בדיקת קרקע, תחזוקה")),
              ("unsure", ("Not sure yet", "עוד לא בטוח"), ("Let's talk it through", "נדבר ונבין יחד"))],
    "country": ("Where is the land? *", "איפה הקרקע? *"),
    "countries": [("", ("Choose a country or region", "בחירת מדינה או אזור")), ("IL", ("Israel", "ישראל")), ("PT", ("Portugal", "פורטוגל")), ("ES", ("Spain", "ספרד")),
                  ("EU", ("Another European country", "מדינה אחרת באירופה")), ("AF", ("Africa", "אפריקה")), ("OT", ("Somewhere else", "מקום אחר")), ("SEARCH", ("Still looking for land", "עוד מחפשים קרקע"))],
    "region": ("Region or nearest town", "אזור או יישוב קרוב"),
    "size": ("Land size *", "גודל השטח *"),
    "sizes": [("", ("Choose a range", "בחירת טווח")), ("lt5", ("Under 5 ha (under 50 dunam)", "פחות מ-50 דונם")), ("5-30", ("5–30 ha (50–300 dunam)", "50–300 דונם")),
              ("30-100", ("30–100 ha", "300–1,000 דונם")), ("100+", ("Over 100 ha", "מעל 1,000 דונם")), ("tbd", ("Not decided yet", "עוד לא ידוע"))],
    "status": ("Land status", "מצב הקרקע"),
    "statuses": [("", ("Choose", "בחירה")), ("own", ("We own it", "בבעלותנו")), ("lease", ("We lease it", "בחכירה")), ("acquiring", ("We are acquiring it", "בתהליך רכישה")), ("search", ("Still looking", "עוד מחפשים"))],
    "crop": ("Crop", "גידול"),
    "crop_hint": ("Existing or planned, e.g. avocado", "קיים או מתוכנן, למשל אבוקדו"),
    "timeline": ("When do you want to start?", "מתי רוצים להתחיל?"),
    "timelines": [("", ("Choose", "בחירה")), ("season", ("Before the next season", "לפני העונה הבאה")), ("12m", ("Within 12 months", "תוך 12 חודשים")), ("explore", ("Just exploring", "רק בודקים"))],
    "message": ("Anything else we should know?", "עוד משהו שכדאי שנדע?"),
    "berlin": ("I'd like to meet at Fruit Logistica, Berlin, 3–5 February 2027", "אשמח להיפגש ב-Fruit Logistica, ברלין, 3–5 בפברואר 2027"),
    "consent": ("I agree that MIFTAH Projects may use these details to reply to me. See the {privacy}.", "אני מסכים/ה שמיפתח פרויקטים תשתמש בפרטים כדי לחזור אליי. ראו {privacy}."),
    "privacy_link": ("privacy notice", "מדיניות הפרטיות"),
    "send": ("Send the request", "שליחת הבקשה"),
    "honeypot": ("Leave this field empty", "השאירו שדה זה ריק"),
}

PRIVACY = {
    "en": [
        ("What we collect", "When you send the project-review form, we receive the details you type: your name, company, email, phone, the country and size of the land, your crop, timeline and message. We don't ask for anything else, and the site does not use advertising cookies."),
        ("Why", "Only to reply to your request, arrange a conversation or a site visit, and prepare a proposal if you ask for one."),
        ("Who sees it", "MIFTAH Projects' management and office staff. We don't sell or share your details. The form's delivery service, once connected, processes the message only to deliver it to us."),
        ("How long", "We keep enquiries for as long as they are needed for the conversation and for our business records, and delete them on request."),
        ("Your rights", "You can ask to see, correct or delete the details you sent, under Israel's Protection of Privacy Law, 5741-1981. Call +972 4 985 4404."),
        ("Statistics", "If we add visitor statistics, we will use a service that doesn't track you across sites, and update this page first."),
        ("Updated", "26 October 2026."),
    ],
    "he": [
        ("מה אנחנו אוספים", "כששולחים את טופס בדיקת הפרויקט, אנחנו מקבלים את הפרטים שהוקלדו: שם, חברה, מייל, טלפון, מדינת הקרקע וגודלה, הגידול, לוח הזמנים וההודעה. אנחנו לא מבקשים שום פרט נוסף, והאתר לא משתמש בעוגיות פרסום."),
        ("לשם מה", "רק כדי לחזור אליך, לתאם שיחה או ביקור בשטח ולהכין הצעה אם ביקשת."),
        ("מי רואה את הפרטים", "ההנהלה וצוות המשרד של מיפתח פרויקטים. אנחנו לא מוכרים ולא מעבירים את הפרטים. שירות שליחת הטופס, כשיחובר, מעבד את ההודעה רק כדי להעביר אותה אלינו."),
        ("לכמה זמן", "פניות נשמרות כל עוד הן נחוצות לשיחה ולרישומי העסק, ונמחקות לפי בקשה."),
        ("הזכויות שלך", "אפשר לבקש לעיין בפרטים, לתקן או למחוק אותם, לפי חוק הגנת הפרטיות, התשמ״א-1981. טלפון: 04-9854404."),
        ("סטטיסטיקה", "אם נוסיף סטטיסטיקת כניסות, נשתמש בשירות שלא עוקב אחריך בין אתרים, ונעדכן את העמוד הזה קודם."),
        ("עדכון אחרון", "26 באוקטובר 2026."),
    ],
}

A11Y = {
    "en": [
        ("Our commitment", "We want everyone to be able to use this website, including people with disabilities. The site was built to meet Israeli Standard 5568, which follows the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA."),
        ("What we did", "Semantic headings and landmarks; a skip link; full keyboard use with visible focus; text contrast of at least 4.5:1; form fields with labels and clear error messages; alternative text for images; a pause button for the moving video, which does not start for visitors who ask their device to reduce motion; Hebrew and English versions with the correct reading direction."),
        ("Checked with", "Automated checks (axe-core and Lighthouse) and manual keyboard and screen-size testing in Chromium, in October 2026."),
        ("Known limits", "The technical drawing and the map are images with full text equivalents next to them. If you find anything that doesn't work for you, please tell us."),
        ("Contact for accessibility", "MIFTAH Projects office, Kfar Masaryk, Israel. Phone +972 4 985 4404."),
        ("Updated", "26 October 2026."),
    ],
    "he": [
        ("המחויבות שלנו", "אנחנו רוצים שכל אחד יוכל להשתמש באתר, גם אנשים עם מוגבלות. האתר נבנה לפי תקן ישראלי 5568, המבוסס על הנחיות WCAG 2.1 ברמה AA."),
        ("מה עשינו", "כותרות ואזורים מסומנים; קישור דילוג לתוכן; שימוש מלא במקלדת עם סימון פוקוס ברור; ניגודיות טקסט של 4.5:1 לפחות; שדות טופס עם תוויות והודעות שגיאה ברורות; טקסט חלופי לתמונות; כפתור עצירה לסרטון הנע, שלא מתחיל לפעול אצל מי שביקש מהמכשיר להפחית תנועה; גרסה בעברית ובאנגלית עם כיוון קריאה נכון."),
        ("איך נבדק", "בדיקות אוטומטיות (axe-core ו-Lighthouse) ובדיקה ידנית של מקלדת וגדלי מסך ב-Chromium, באוקטובר 2026."),
        ("מגבלות ידועות", "השרטוט הטכני והמפה הם תמונות, ולצידם יש מקבילה טקסטואלית מלאה. אם משהו לא עובד עבורך, נשמח שתספרו לנו."),
        ("פנייה בנושא נגישות", "משרד מיפתח פרויקטים, כפר מסריק. טלפון 04-9854404."),
        ("עדכון אחרון", "26 באוקטובר 2026."),
    ],
}
