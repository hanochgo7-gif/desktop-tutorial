#!/usr/bin/env python3
"""Builds the English page (en/index.html) from the Hebrew page (index.html).

The Hebrew page is the source of truth. After editing it, run:
    python3 bar-lifschitz/src/make_en.py
Every Hebrew string that appears on the page needs a pair in PAIRS below.
The script stops and lists any visible Hebrew it could not translate.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'index.html'
OUT = ROOT / 'en' / 'index.html'
BASE = 'https://hanochgo7-gif.github.io/desktop-tutorial/bar-lifschitz/'

# (Hebrew, English). Longer strings are applied first, so a short string never breaks a long one.
PAIRS = [
    # shorter copy (October 2026)
    # Bar's voice pass
    ('<legend>תוספות</legend>', '<legend>Add-ons</legend>'),
    ('<dt>תוספות</dt>', '<dt>Add-ons</dt>'),
    ('<li>קוקטיילים של קולר, לבחירה</li>', '<li>Cocktails by Kuller, if you like</li>'),
    ('שורת קוקטיילים בכוסות קופה עם קצף לבן, ועליהם פרחים למאכל', 'A row of coupe cocktails with white foam, topped with edible flowers'),
    ('בר ליפשיץ, שף פרטי. מבשל ומארח, אצלי בחצר במצפה מתת, אצלכם בבית ובאירועים. פשוט, מעניין, גלילי, ומבושל מול האורחים.', 'Bar Lifschitz, private chef. I cook and host, in my yard in Mitzpe Matat, at your home and at events. Simple, interesting, Galilean, and cooked in front of the guests.'),
    ('מבשל ומארח, אצלי בחצר ואצלכם. ארוחות שף פרטיות במצפה מתת, אצלכם בבית ובאירועים.', 'I cook and host, in my yard and at yours. Private chef dinners in Mitzpe Matat, at your home and at events.'),
    ('<span class="tile-name">אצלכם בבית</span>', '<span class="tile-name">At your place</span>'),
    ('<li>החצר שלי במצפה מתת</li>', '<li>My yard in Mitzpe Matat</li>'),
    ('<p>גדלתי בבית ארגנטינאי, שבו תמיד מארחים ותמיד מבשלים. אחרי הצבא נכנסתי למטבחים מקצועיים, והיום אני מארח בחצר שלי במצפה מתת.</p>', '<p>I grew up in an Argentinian home, where there were always guests and always something cooking. After the army I went into professional kitchens, and today I host in my own yard in Mitzpe Matat.</p>'),
    ('<p>הבישול שלי פשוט, מעניין וגלילי. חומרי גלם טובים, והכול מבושל מול האורחים.</p>', '<p>My cooking is simple, interesting and Galilean. Good ingredients, all cooked in front of the guests.</p>'),
    ('<p>שולחן אחד ארוך מתחת לעצים, רק לקבוצה שלכם.</p>', '<p>One long table under the trees, just for your group.</p>'),
    ('<p class="soon">בקרוב: סטודיו במתת, ל־30 עד 40 אורחים.</p>', '<p class="soon">Coming soon: a studio in Matat, for 30 to 40 guests.</p>'),
    ('<p>אני מגיע עם הצוות וחומרי הגלם, ומבשל מול האורחים.</p>', '<p>I come with my team and the ingredients, and cook in front of your guests.</p>'),
    ('<li>8 עד 40 אורחים</li>', '<li>8 to 40 guests</li>'),
    ('<p>בכל מקום שתבחרו, בסגנון שלי.</p>', '<p>Wherever you choose, in my style.</p>'),
    ('<p class="sub">משתנה עם העונה ועם האירוע.</p>', '<p class="sub">It changes with the season and the occasion.</p>'),
    ('<p class="menu-note">אפשר צמחוני, ללא גלוטן, ללא אגוזים וללא לקטוז. יין מיקבים מקומיים, או שתביאו משלכם. ובסוף הערב, משהו קטן לקחת הביתה.</p>', '<p class="menu-note">Vegetarian, gluten-free, nut-free and lactose-free are all possible. Wine from local wineries, or bring your own. And at the end of the evening, a little something to take home.</p>'),
    ('<span class="tile-desc">8 עד 40 אורחים</span>', '<span class="tile-desc">8 to 40 guests</span>'),
    ('<label for="name">השם שלכם</label>', '<label for="name">Your name</label>'),
    ('<p>אפשר צמחוני, ללא גלוטן, ללא אגוזים וללא לקטוז. ספרו לי מראש. המטבח לא כשר.</p>', '<p>Vegetarian, gluten-free, nut-free and lactose-free are all possible. Just tell me in advance. The kitchen is not kosher.</p>'),
    ('<p>יש יין מיקבים מקומיים, ואפשר להביא משלכם. באירועים יש גם קוקטיילים של קולר.</p>', '<p>There is wine from local wineries, and you are welcome to bring your own. At events there are cocktails by Kuller too.</p>'),
    ('<p>מגיעים בזמן, ומביאים משהו חם: הערבים במתת קרירים. את הכתובת אשלח עם האישור.</p>', '<p>Come on time, and bring something warm: evenings in Matat are cool. I send the address with the confirmation.</p>'),
    ('<p>בקרוב ייפתח סטודיו במתת. עד אז, נתאם יחד לפי התחזית.</p>', '<p>A studio in Matat opens soon. Until then, we plan together around the forecast.</p>'),
    ('שלוש דרכים לשבת לשולחן', 'Three ways to the table'),
    ('<h3>באירוע שלכם</h3>', '<h3>At your event</h3>'),
    ('משתנה עם העונה.', 'It changes with the season.'),
    ('<h3 id="next-title">מה קורה אחרי ההודעה</h3>', '<h3 id="next-title">What happens next</h3>'),
    ('<summary>משך הערב<', '<summary>Length of the evening<'),
    ('<summary>מספר אורחים<', '<summary>Number of guests<'),
    ('<summary>מחיר<', '<summary>Price<'),
    ('<summary>ילדים<', '<summary>Children<'),
    ('<summary>לפני שמגיעים<', '<summary>Before you come<'),
    ('<summary>בחורף<', '<summary>In winter<'),
    ('ההזמנה שלכם', 'Your booking'),
    ('<dt>איפה</dt>', '<dt>Where</dt>'),
    ('<dt>מתי</dt>', '<dt>When</dt>'),
    ('<dt>כמה</dt>', '<dt>Guests</dt>'),
    ('<dt>הגשה</dt>', '<dt>Serving</dt>'),
    ('<strong>הודעה</strong>', '<strong>Message</strong>'),
    ('<strong>שריון</strong>', '<strong>The date</strong>'),
    ('<strong>פרטים</strong>', '<strong>Details</strong>'),
    ('<strong>הערב</strong>', '<strong>The evening</strong>'),
    ('<span>אחזור עם הצעה ותפריט.</span>', '<span>I come back with a proposal and a menu.</span>'),
    ('<span>מקדמה של 30% משריינת את התאריך.</span>', '<span>A 30% deposit holds the date.</span>'),
    ('<span>כמה ימים לפני, סוגרים את הפרטים.</span>', '<span>A few days before, we settle the details.</span>'),
    ('<span>אתם מגיעים. השולחן ערוך.</span>', '<span>You arrive. The table is set.</span>'),
    ('<dt>וואטסאפ</dt>', '<dt>WhatsApp</dt>'),
    ('<dt>טלפון</dt>', '<dt>Phone</dt>'),
    ('<dt>מייל</dt>', '<dt>Email</dt>'),
    ('<dt>אינסטגרם</dt>', '<dt>Instagram</dt>'),
    ('<p class="nc-sign">בר</p>', '<p class="nc-sign">Bar</p>'),
    ('<bdi dir="ltr">058-787-0656</bdi>', '<bdi dir="ltr">+972 58-787-0656</bdi>'),
    ('<span class="tv-note">הדמיה</span>', '<span class="tv-note">Illustration</span>'),
    ('גדלתי בבית ארגנטינאי, שבו תמיד מארחים. אחרי הצבא נכנסתי למטבחים מקצועיים.', 'I grew up in an Argentinian home, where there were always guests. After the army I went into professional kitchens.'),
    ('פשוט, מעניין, גלילי. מבושל מול האורחים.', 'Simple, interesting, Galilean. Cooked in front of the guests.'),
    ('<h3>בחצר, במצפה מתת</h3>', '<h3>In the yard, Mitzpe Matat</h3>'),
    ('שולחן אחד, רק לקבוצה שלכם.', 'One table, just for your group.'),
    ('בקרוב: סטודיו ל־30 עד 40 אורחים.', 'Coming soon: a studio for 30 to 40 guests.'),
    ('אני מגיע עם הצוות, מבשל ומגיש.', 'I come with my team, cook and serve.'),
    ('<li>מהגליל ועד המרכז</li>', '<li>From the Galilee to central Israel</li>'),
    ('<h3>אירועים</h3>', '<h3>Events</h3>'),
    ('בכל מקום, בסגנון שלי.', 'Anywhere, in my style.'),
    ('משתנה לפי העונה.', 'It changes with the season.'),
    ('צמחוני, ללא גלוטן, אגוזים או לקטוז, לפי בקשה. יין מיקבים מקומיים, או שלכם. ובסוף, משהו קטן לקחת הביתה.', 'Vegetarian, gluten-free, nut-free or lactose-free on request. Wine from local wineries, or your own. And at the end, a little something to take home.'),
    ('ספרו לי מה אתם מתכננים. אחזור עם הצעה ותפריט.', 'Tell me what you have in mind. I will come back with a proposal and a menu.'),
    ('<li>אחזור עם הצעה ותפריט.</li>', '<li>I come back with a proposal and a menu.</li>'),
    ('<li>מקדמה של 30% משריינת את התאריך.</li>', '<li>A 30% deposit holds the date.</li>'),
    ('<li>כמה ימים לפני, סוגרים את הפרטים.</li>', '<li>A few days before, we settle the details.</li>'),
    ('ביטול עד חודש לפני: החזר מלא.', 'Cancel up to a month before: full refund.'),
    ('<p>שלוש שעות, 18:30 עד 21:30.</p>', '<p>Three hours, 6:30 to 9:30 pm.</p>'),
    ('<p>בחצר 6 עד 16. אצלכם 8 עד 40.</p>', '<p>In the yard 6 to 16. At your place 8 to 40.</p>'),
    ('<p>לפי התפריט, מספר האורחים והמקום. ספרו לי, ואשלח הצעה.</p>', '<p>It depends on the menu, the number of guests and the place. Tell me, and I will send a proposal.</p>'),
    ('<p>צמחוני, ללא גלוטן, אגוזים או לקטוז, לפי בקשה. המטבח לא כשר.</p>', '<p>Vegetarian, gluten-free, nut-free or lactose-free on request. The kitchen is not kosher.</p>'),
    ('<p>יין מיקבים מקומיים, או שלכם. באירועים, גם קוקטיילים של קולר.</p>', '<p>Wine from local wineries, or your own. At events, cocktails by Kuller too.</p>'),
    ('<p>מגיעים בזמן, עם שכבה חמה לערב. הכתובת נשלחת עם האישור.</p>', '<p>Arrive on time, with a warm layer for the evening. The address comes with the confirmation.</p>'),
    ('<p>סטודיו במתת ייפתח בקרוב. עד אז, מתאמים לפי התחזית.</p>', '<p>A studio in Matat opens soon. Until then, we plan around the forecast.</p>'),
    ('<p>מקדמה של 30% משריינת את התאריך, בפייבוקס או בהעברה בנקאית. ביטול עד חודש לפני: החזר מלא. אחר כך: אין החזר. במלחמה או במצב חירום, ביטול עד שלושה ימים לפני: החזר של 50%.</p>', '<p>A 30% deposit holds the date, by PayBox or bank transfer. Cancel up to a month before: full refund. After that: no refund. In war or an emergency, cancel up to three days before: 50% back.</p>'),
    ('<p class="finale-line">השולחן ערוך.</p>', '<p class="finale-line">The table is set.</p>'),
    ('<span>שף פרטי · מצפה מתת</span>', '<span>Private chef · Mitzpe Matat</span>'),
    ('<li>חברות, צוותים והשקות</li>', '<li>Companies, teams and launches</li>'),
    ('<li>מנות אישיות, מרכז שולחן, בופה או ביסים</li>', '<li>Plated, sharing plates, buffet or small bites</li>'),
    ('<li>מלצרים וקוקטיילים של קולר</li>', '<li>Waiting staff, and cocktails by Kuller</li>'),
    # head
    ("font-family='serif'%3Eב%3C", "font-family='serif'%3EB%3C"),
    ('<title>בר ליפשיץ | שף פרטי, מצפה מתת</title>', '<title>Bar Lifschitz | Private Chef, Mitzpe Matat</title>'),
    ('בר ליפשיץ, שף פרטי. ארוחות שף בחצר במצפה מתת, אצלכם בבית, ואירועים פרטיים ועסקיים. בישול מול האורחים, חומרי גלם טריים ויין מיקבים מקומיים.',
     'Bar Lifschitz, private chef. Chef dinners in his yard in Mitzpe Matat, in your home, and private or corporate events in the Galilee and across northern and central Israel. Cooked in front of the guests, with fresh ingredients and wine from local wineries.'),
    ('content="בר ליפשיץ | שף פרטי"', 'content="Bar Lifschitz | Private Chef"'),
    ('ארוחות שף פרטיות בחצר במצפה מתת, אצלכם בבית, או בכל מקום שתבחרו.', 'Private chef dinners in my yard in Mitzpe Matat, in your home, or wherever you choose.'),

    # skip, intro, header, overlay
    ('דילוג לתיאום ארוחה', 'Skip to booking'),
    ('שף פרטי, מצפה מתת', 'Private chef, Mitzpe Matat'),
    ('aria-label="ניווט ראשי"', 'aria-label="Main navigation"'),
    ('aria-label="ניווט"', 'aria-label="Navigation"'),
    ('<i aria-hidden="true"></i>ניווט</button>', '<i aria-hidden="true"></i>Menu</button>'),
    ('>סגירה</button>', '>Close</button>'),
    ('>על בר<', '>About<'),
    ('>איפה ואיך<', '>Where &amp; how<'),
    ('>התפריט<', '>The menu<'),
    ('>שאלות<', '>FAQ<'),
    ('<a class="lang" href="en/" hreflang="en" lang="en">EN</a>', '<a class="lang" href="../" hreflang="he" lang="he">עברית</a>'),
    ('<small><a class="lang" href="en/" hreflang="en" lang="en">English</a></small>', '<small><a class="lang" href="../" hreflang="he" lang="he">עברית</a></small>'),

    # hero
    ('החצר של בר במצפה מתת: שולחן עץ ארוך ערוך עם פרחים, בצל עץ', "Bar's yard in Mitzpe Matat: a long wooden table set with flowers, in the shade of a tree"),
    ('מבשל ומארח. ארוחות שף פרטיות בחצר שלי במצפה מתת, אצלכם בבית, או בכל מקום שתבחרו.', 'I cook and I host. Private chef dinners in my yard in Mitzpe Matat, in your home, or wherever you choose.'),
    ('>לתפריט<', '>See the menu<'),
    ('<li>החצר במצפה מתת</li>', '<li>The yard in Mitzpe Matat</li>'),
    ('<li>אצלכם בבית</li>', '<li>At your place</li>'),
    ('<li>אירועים פרטיים ועסקיים</li>', '<li>Private and corporate events</li>'),
    ('data-pause="השהיית הווידאו" data-play="הפעלת הווידאו">השהיית הווידאו', 'data-pause="Pause video" data-play="Play video">Pause video'),

    # about
    ('aria-label="על בר"', 'aria-label="About Bar"'),
    ('האהבה שלי לבישול הגיעה מהאהבה לאירוח, ומהחיבור שזה מייצר בין אנשים.', 'My love for cooking came from my love of hosting, and from the connection it creates between people.'),
    ('גדלתי בבית ארגנטינאי, שבו תמיד מארחים ותמיד מבשלים. אחרי הצבא התחלתי לבשל במטבחים מקצועיים, והיום אני מבשל מתוך אהבה לאירוח.',
     'I grew up in an Argentinian home, where there were always guests and always something on the stove. After the army I started cooking in professional kitchens, and today I cook out of a love for hosting.'),
    ('הבישול שלי פשוט, מעניין וגלילי. המנות מוכנות מול האורחים, עם חומרי גלם טריים וטובים ויין מיקבים מקומיים.',
     'My cooking is simple, interesting and rooted in the Galilee. Every dish is made in front of the guests, with fresh, good ingredients and wine from local wineries.'),
    ('כי ארוחה היא הרבה מעבר לאוכל.', 'Because a meal is so much more than food.'),
    ('<p class="signature">בר</p>', '<p class="signature">Bar</p>'),
    ('בר בסינר אפור מגיש סלטים על שולחן עבודה בחצר', 'Bar in a grey apron plating salads on a work table in the yard'),

    # formats
    ('בחצר, אצלכם, או בכל מקום', 'In my yard, at your place, or anywhere'),
    ('שולחן עץ ערוך בחצר עם פרחים, כוסות וחבית יין', 'A wooden table set in the yard with flowers, glasses and a wine barrel'),
    ('<h3>בחצר שלי, במצפה מתת</h3>', '<h3>In my yard, Mitzpe Matat</h3>'),
    ('ארוחה פרטית לקבוצה שלכם. המנות מוכנות מול האורחים, ואחר כך כולם יושבים לשולחן אחד.', 'A private dinner for your group. The dishes are made in front of you, then everyone sits down at one long table.'),
    ('<li>6 עד 16 אורחים</li>', '<li>6 to 16 guests</li>'),
    ('<li>18:30 עד 21:30</li>', '<li>6:30 pm to 9:30 pm</li>'),
    ('<li>מבוגרים בלבד</li>', '<li>Adults only</li>'),
    ('בקרוב: סטודיו במתת לאירועים של 30 עד 40 אורחים.', 'Coming soon: a studio in Matat for events of 30 to 40 guests.'),
    ('>לתיאום בחצר<', '>Book the yard<'),
    ('שולחן ארוך עמוס סלטים, לחמים וממרחים באירוע צהריים', 'A long table full of salads, breads and spreads at a lunch event'),
    ('<h3>אצלכם בבית</h3>', '<h3>At your place</h3>'),
    ('אני מגיע עם הצוות וחומרי הגלם, מבשל ומגיש אצלכם. ארוחות ערב, ימי הולדת, אירועים משפחתיים וצהריים.', 'I come with my team and the ingredients, cook and serve at your home. Dinners, birthdays, family occasions and lunches.'),
    ('<li>8 עד 40 סועדים</li>', '<li>8 to 40 guests</li>'),
    ('<li>הגליל והגולן, חיפה והקריות, השרון והמרכז</li>', '<li>The Galilee and Golan, Haifa and Haifa Bay, the Sharon and central Israel</li>'),
    ('<li>צריך רק מטבח, שולחנות וכיסאות</li>', '<li>All you need is a kitchen, tables and chairs</li>'),
    ('>לתיאום אצלכם<', '>Book at your place<'),
    ('בר מדבר אל האורחים בשולחן ארוך בחוץ', 'Bar talking to guests at a long outdoor table'),
    ('<h3>אירועים ושיתופי פעולה</h3>', '<h3>Events and collaborations</h3>'),
    ('אני מפיק אירוע בכל מקום שתרצו, בסגנון ובעיצוב שלי. לחברות, לצוותים ולערבים פרטיים.', 'I produce events wherever you want them, in my own style and design. For companies, teams and private evenings.'),
    ('<li>אירועי חברה וצוותים</li>', '<li>Company and team events</li>'),
    ('<li>השקות וערבים פרטיים</li>', '<li>Launches and private evenings</li>'),
    ('<li>אפשר להוסיף קוקטיילים של קולר</li>', '<li>Cocktails by Kuller can be added</li>'),
    ('<li>מנות אישיות, מרכז שולחן, בופה או מנות קטנות מסתובבות</li>', '<li>Plated, sharing plates, buffet or passed small bites</li>'),
    ('<li>מלצרים לפי גודל האירוע</li>', '<li>Waiting staff to match the size of the event</li>'),
    ('<span>להוסיף קוקטיילים של קולר</span>', '<span>Add cocktails by Kuller</span>'),
    ('>לתיאום אירוע<', '>Plan an event<'),

    # menu
    ('כך נראה תפריט אצלי, מהפתיחה ועד הקינוח. הוא משתנה לפי העונה ולפי האירוע.', 'This is what a menu looks like with me, from the first bite to dessert. It changes with the season and the occasion.'),
    ('data-label="פתיחה"', 'data-label="To begin"'), ('data-label="קרים"', 'data-label="Cold"'), ('data-label="מהים"', 'data-label="From the sea"'),
    ('data-label="חמים"', 'data-label="Hot"'), ('data-label="מתוקים"', 'data-label="Sweet"'),
    ('<div class="ev-clock" id="ev-clock">פתיחה</div>', '<div class="ev-clock" id="ev-clock">To begin</div>'),
    ('ארוחות שף פרטיות · 18:30 · מצפה מתת', 'Private chef dinners · 18:30 · Mitzpe Matat'),
    ('בר מבשל במטבח, דרך חלון מואר בקיר בורדו', 'Bar cooking in his kitchen, seen through a lit window in a burgundy wall'),
    ('גללו פנימה', 'Scroll in'),
    ('בר ליפשיץ · ארוחות שף פרטיות · מצפה מתת', 'Bar Lifschitz · Private chef dinners · Mitzpe Matat'),
    ('>או במייל</button>', '>Or by email</button>'),
    ('>טלפון: 058-787-0656</a>', '>Phone: +972 58-787-0656</a>'),
    ('>טלפון</a>', '>Phone</a>'),
    ('<legend>סגנון הגשה</legend>', '<legend>Serving style</legend>'),
    ('<span class="tile-name">מנות אישיות</span>', '<span class="tile-name">Plated, course by course</span>'),
    ('<span class="tile-name">מרכז שולחן</span>', '<span class="tile-name">Sharing plates</span>'),
    ('<span class="tile-name">בופה</span>', '<span class="tile-name">Buffet</span>'),
    ('<span class="tile-name">מנות קטנות מסתובבות</span>', '<span class="tile-name">Passed small bites</span>'),
    ('<span class="tile-name">עוד לא יודעים, נחליט יחד</span>', '<span class="tile-name">Not sure yet, let\'s decide together</span>'),
    ('content: "„"', 'content: "“"'),
    ('החליקו לצד ←', 'Swipe →'),
    ('<span class="ev-n">פתיחה</span>', '<span class="ev-n">To begin</span>'),
    ('<span class="ev-n">קרים</span>', '<span class="ev-n">Cold</span>'),
    ('<span class="ev-n">מהים</span>', '<span class="ev-n">From the sea</span>'),
    ('<span class="ev-n">חמים</span>', '<span class="ev-n">Hot</span>'),
    ('<span class="ev-n">מתוקים</span>', '<span class="ev-n">Sweet</span>'),
    ('פוקאצ׳ה, זיתים ובישבש', 'Focaccia, olives and bishbash'),
    ('חמאה חומה מוקפצת, אזוב טרי וריבת שאלוט', 'Brown butter, fresh hyssop and shallot jam'),
    ('פרוסות צוואר חזיר מהמעדנייה, סטרצ׳טלה, שמן בזיליקום, צנוברים ופרי עונתי', 'Sliced cured pork neck, stracciatella, basil oil, pine nuts and seasonal fruit'),
    ('סלט פקוס חרוש, ארוגולה, שקדים קלויים ובצל סומק על לאבנה מעושנת', 'Shaved cucumber salad, arugula, toasted almonds and sumac onion on smoked labneh'),
    ('טרטר שייטל, לצד איולי טימין ושום קונפי', 'Rump steak tartare, with thyme aioli and confit garlic'),
    ('סשימי דג מקומי, אבוקדו, קונסומה בצל סגול, חריף ורוקט', 'Local fish sashimi, avocado, red onion consommé, chili and arugula'),
    ('טרטר דג, מנגו בוסר, נענע וארוגולה, לצד יוגורט ושמן ירוק', 'Fish tartare, green mango, mint and arugula, with yogurt and green oil'),
    ('טורטליני בקרם תירס, ברוטב בצל מקורמל, חמאה ויין, עם דג מפורק', 'Tortellini in corn cream, with a caramelized onion, butter and wine sauce and flaked fish'),
    ('צ׳וריסו מהמעדנייה, לחמניית חלב, קרם פלפלים, פרובנסל ובצל מוחמץ', 'Chorizo, milk bun, pepper cream, provençal and pickled onion'),
    ('בסטייל ״לילות ביירות״, קרמבל זעתר, פטל וסירופ תפוזים וקרמל', 'Layali Beirut (Beirut Nights) style, za\'atar crumble, raspberries and orange caramel syrup'),
    ('קרמו שוקולד, שמן זית ומלח מלדון', 'Chocolate crémeux, olive oil and Maldon salt'),
    ('מתאים לצמחונים, ללא גלוטן, אלרגיות לאגוזים וללא לקטוז. יין מיקבים מקומיים, ואפשר גם להביא. ובסוף הערב, משהו קטן לקחת הביתה.', 'Can be adapted for vegetarians, gluten-free, nut allergies and lactose-free. Wine from local wineries, and you are welcome to bring your own. And at the end of the evening, a little something to take home.'),

    # gallery
    ('מהשולחנות האחרונים', 'From recent tables'),
    ('<p>עוד באינסטגרם ', '<p>More on Instagram '),
    ('aria-label="גלריית תמונות"', 'aria-label="Photo gallery"'),
    ('קערות בוראטה עם עלים ירוקים, מזלפים עליהן שמן זית', 'Bowls of burrata with greens, olive oil being poured over them'),
    ('שולחן ארוך במפה לבנה תחת שמשיות', 'A long table with a white tablecloth under parasols'),
    ('בר מבשל בערב, עשן עולה מעל הסירים', 'Bar cooking in the evening, smoke rising over the pots'),
    ('בר אוכל צלחת פסטה על החוף', 'Bar eating a plate of pasta on the beach'),
    ('בר יושב על בול עץ בשדה ירוק ומכין בצק', 'Bar sitting on a log in a green field, making dough'),

    # booking
    ('כל ארוחה נבנית בשבילכם. ספרו לי מה אתם מתכננים, ואחזור אליכם בוואטסאפ עם הצעה ותפריט.', 'Every dinner is built for you. Tell me what you have in mind, and I will get back to you on WhatsApp with a proposal and a menu.'),
    ('<legend>איפה</legend>', '<legend>Where</legend>'),
    ('<span class="tile-name">בחצר במצפה מתת</span><span class="tile-desc">6 עד 16 אורחים</span>', '<span class="tile-name">In the yard, Mitzpe Matat</span><span class="tile-desc">6 to 16 guests</span>'),
    ('<span class="tile-name">אצלכם בבית</span><span class="tile-desc">8 עד 40 סועדים</span>', '<span class="tile-name">At your place</span><span class="tile-desc">8 to 40 guests</span>'),
    ('<span class="tile-name">באירוע שלכם</span><span class="tile-desc">בכל מקום שתבחרו</span>', '<span class="tile-name">At your event</span><span class="tile-desc">Wherever you choose</span>'),
    ('<label for="region">איפה הבית</label>', '<label for="region">Where is your home</label>'),
    ('<option>הגליל והגולן</option>', '<option>The Galilee and Golan</option>'),
    ('<option>חיפה והקריות</option>', '<option>Haifa and Haifa Bay</option>'),
    ('<option>השרון והמרכז</option>', '<option>The Sharon and central Israel</option>'),
    ('<option>אזור אחר</option>', '<option>Another area</option>'),
    ('<label for="date">תאריך</label>', '<label for="date">Date</label>'),
    ('<label id="guests-label" for="guests">כמה אורחים</label>', '<label id="guests-label" for="guests">Guests</label>'),
    ('aria-label="עוד אורח"', 'aria-label="One more guest"'),
    ('aria-label="אורח אחד פחות"', 'aria-label="One guest fewer"'),
    ('<label for="name">שם</label>', '<label for="name">Name</label>'),
    ('<label for="notes">מה חוגגים, ומה חשוב שאדע?</label>', '<label for="notes">What is the occasion, and what should I know?</label>'),
    ('placeholder="למשל: יום הולדת 40, אחד מאיתנו צמחוני"', 'placeholder="For example: a 40th birthday, one of us is vegetarian"'),
    ('>שליחה בוואטסאפ<', '>Send on WhatsApp<'),
    ('<h3 id="next-title">מה קורה אחרי ששולחים</h3>', '<h3 id="next-title">What happens next</h3>'),
    ('<li>אני חוזר אליכם בוואטסאפ עם הצעה ותפריט.</li>', '<li>I get back to you on WhatsApp with a proposal and a menu.</li>'),
    ('<li>משריינים את התאריך במקדמה של 30%, בפייבוקס או בהעברה בנקאית.</li>', '<li>The date is held with a 30% deposit, by PayBox or bank transfer.</li>'),
    ('<li>כמה ימים לפני, סוגרים יחד את הפרטים האחרונים.</li>', '<li>A few days before, we go over the final details together.</li>'),
    ('ביטול עד חודש לפני הארוחה מחזיר את כל המקדמה. הפרטים המלאים בשאלות למטה.', 'Cancel up to a month before and the full deposit is returned. Full details in the FAQ below.'),
    ('>וואטסאפ: 058-787-0656<', '>WhatsApp: +972 58-787-0656<'),
    ('>אינסטגרם ‎@barlif<', '>Instagram @barlif<'),

    # faq
    ('>שאלות לפני שמגיעים<', '>Questions before you come<'),
    ('לא מצאתם תשובה? כתבו לי ב<a href="https://wa.me/972587870656" target="_blank" rel="noopener">וואטסאפ</a>.', 'Can\'t find an answer? Message me on <a href="https://wa.me/972587870656" target="_blank" rel="noopener">WhatsApp</a>.'),
    ('כמה זמן נמשכת ארוחה בחצר?', 'How long is a dinner in the yard?'),
    ('שלוש שעות, בדרך כלל מ־18:30 עד 21:30.', 'Three hours, usually from 6:30 pm to 9:30 pm.'),
    ('לכמה אורחים?', 'How many guests?'),
    ('בחצר: 6 עד 16. אצלכם: 8 עד 40. בקרוב ייפתח סטודיו במתת לאירועים של 30 עד 40 אורחים.', 'In the yard: 6 to 16. At your place: 8 to 40. A studio in Matat for events of 30 to 40 guests is opening soon.'),
    ('כמה זה עולה?', 'How much does it cost?'),
    ('כל ארוחה מתומחרת לפי התפריט, מספר האורחים והמקום. ספרו לי מה אתם מתכננים, ואשלח הצעה.', 'Each dinner is priced by the menu, the number of guests and the place. Tell me what you have in mind and I will send a proposal.'),
    ('אלרגיות והעדפות', 'Allergies and preferences'),
    ('אני מתאים את התפריט לצמחונים, ללא גלוטן, לאלרגיה לאגוזים וללא לקטוז. כתבו לי כשאתם מתאמים. המטבח לא כשר.', 'I adapt the menu for vegetarians, gluten-free, nut allergies and lactose-free. Let me know when you book. The kitchen is not kosher.'),
    ('יין ושתייה', 'Wine and drinks'),
    ('יש יין מיקבים מקומיים, ואפשר גם להביא יין משלכם. לאירועים אפשר להוסיף קוקטיילים של קולר.', 'There is wine from local wineries, and you are welcome to bring your own. For events, cocktails by Kuller can be added.'),
    ('אפשר לבוא עם ילדים?', 'Can we bring children?'),
    ('הארוחות בחצר מיועדות למבוגרים בלבד.', 'Dinners in the yard are for adults only.'),
    ('מה כדאי לדעת לפני שמגיעים?', 'What should we know before we come?'),
    ('מגיעים בזמן. בערב במתת קריר, אז כדאי להביא שכבה נוספת. הכתובת המדויקת נשלחת עם אישור ההזמנה.', 'Please arrive on time. Evenings in Matat are cool, so bring an extra layer. The exact address is sent with your booking confirmation.'),
    ('<summary>נגישות<', '<summary>Accessibility<'),
    ('יש מדרגות בכניסה. כיסא גלגלים יכול להגיע מהכביש עד הבית.', 'There are steps at the entrance. A wheelchair can reach the house from the road.'),
    ('ומה בחורף?', 'What about winter?'),
    ('בקרוב ייפתח סטודיו במתת, ואז אפשר יהיה לארח גם בימים גשומים. עד אז נתאם יחד לפי התחזית.', 'A studio in Matat is opening soon, so rainy days will be covered too. Until then, we plan together around the forecast.'),
    ('מקדמה וביטולים', 'Deposit and cancellations'),
    ('משריינים את התאריך במקדמה של 30%, בפייבוקס או בהעברה בנקאית. ביטול עד חודש לפני הארוחה מחזיר את כל המקדמה, ואחר כך המקדמה לא מוחזרת. במקרה של מלחמה או מצב חירום, ביטול עד שלושה ימים לפני האירוע מחזיר 50% מהמקדמה.',
     'The date is held with a 30% deposit, by PayBox or bank transfer. Cancel up to a month before the dinner and the full deposit is returned; after that it is non-refundable. In case of war or an emergency, cancelling up to three days before the event returns 50% of the deposit.'),

    # finale
    ('השולחן ערוך. חסרים רק אתם.', 'The table is set. All that is missing is you.'),
    ('שף פרטי. בחצר במצפה מתת, אצלכם, או בכל מקום', 'Private chef. In my yard in Mitzpe Matat, at your place, or anywhere'),
    ('aria-label="קישורים"', 'aria-label="Links"'),
    ('>וואטסאפ<', '>WhatsApp<'),
    ('>מייל<', '>Email<'),
    ('>אינסטגרם<', '>Instagram<'),
    ('>חזרה למעלה<', '>Back to top<'),

    # logo, tagline and video captions
    ('מבשל ומארח, אצלי בחצר ואצלכם', 'I cook and host, in my yard and at yours'),
    ('aria-label="בר ליפשיץ, לראש העמוד"', 'aria-label="Bar Lifschitz, back to top"'),
    ('<span class="sr-only">בר ליפשיץ</span>', '<span class="sr-only">Bar Lifschitz</span>'),
    ('ארוחות שף פרטיות בחצר שלי במצפה מתת, אצלכם בבית, או בכל מקום שתבחרו.', 'Private chef dinners in my yard in Mitzpe Matat, in your home, or wherever you choose.'),
    ('בר מגיש עשרות מנות על שולחן ארוך בחלל לבן', 'Bar plating dozens of dishes along a long table in a white room'),
    ('השולחן בחצר ערוך עם פרחים, כדי חלב עם יין וחבית עם כוסות', 'The table in the yard set with flowers, milk churns holding wine and a barrel of glasses'),
    ('מזלפים שמן זית על שורת קערות עם גבינה לבנה וירוקים', 'Olive oil drizzled over a row of bowls of white cheese and greens'),
    ('שולחן ארוך ערוך במפה לבנה בכרם, תחת שמשיות', 'A long table with a white cloth in a vineyard, under parasols'),
    ('צלחות סשימי דג לבן בקונסומה ורודה, צ׳ילי וירוקים', 'Plates of white fish sashimi in a pink consommé, chili and herbs'),
    ('ערב בחצר: שולחן ארוך מלא אורחים מרימים כוסות', 'An evening in the yard: a long table of guests raising their glasses'),
    ('שני דגים שלמים תלויים ליישון', 'Two whole fish hanging to age'),
    ('כוסות יין ודלי קרח עם בקבוקים ופרחים על חבית', 'Wine glasses and an ice bucket with bottles and flowers on a barrel'),
    ('בר עובד במטבח מואר, דרך חלון בקיר בורדו', 'Bar at work in a lit kitchen, seen through a window in a burgundy wall'),
    ('השולחן הארוך בחצר מלא אורחים מתחת לעץ', 'The long table in the yard full of guests under a tree'),

    # repeated short strings, last
    ('לתיאום ארוחה', 'Book a dinner'),
    ('בר ליפשיץ', 'Bar Lifschitz'),
]


def build():
    s = SRC.read_text(encoding='utf-8')
    s = s.replace('<html lang="he" dir="rtl">', '<html lang="en" dir="ltr">', 1)
    for he, en in sorted(PAIRS, key=lambda p: -len(p[0])):
        s = s.replace(he, en)
    # relative paths: the English page lives one folder down
    s = re.sub(r'(?<=["\s,])(images|media|brand)/', r'../\1/', s)
    s = s.replace(f'<link rel="canonical" href="{BASE}">', f'<link rel="canonical" href="{BASE}en/">')
    s = s.replace(f'<meta property="og:url" content="{BASE}">', f'<meta property="og:url" content="{BASE}en/">')
    s = s.replace('<meta property="og:locale" content="he_IL">', '<meta property="og:locale" content="en_US">')

    # visible Hebrew left outside scripts, styles and comments means a missing pair
    visible = re.sub(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', '', s, flags=re.S)
    visible = visible.replace('lang="he">עברית<', '')
    left = sorted(set(m.strip() for m in re.findall(r'[^<>"]*[֐-׿][^<>"]*', visible)))
    if left:
        print('Untranslated Hebrew:', *left, sep='\n  ')
        sys.exit(1)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(s, encoding='utf-8')
    print('wrote', OUT)


if __name__ == '__main__':
    build()
