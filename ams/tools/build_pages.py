# -*- coding: utf-8 -*-
"""בונה את התפריט המשותף ואת דפי השירותים של אתר AMS.

הרצה מתיקיית ams:  python3 tools/build_pages.py
- מחליף בדף הבית את הכותרת העליונה והתפריט (בין הסימונים BEGIN/END header).
- יוצר את services/*.html מתוך הנתונים שבקובץ הזה.
את התוכן של כל שירות עורכים כאן, ומריצים שוב.
"""
import os
import re
from urllib.parse import quote

from content import ARTICLES, AREAS

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PHONE = '972509359222'
# כתובת האתר בדומיין, בלי / בסוף (למשל 'https://www.ams-aviv.co.il').
# כל עוד ריק: האתר מוסתר מגוגל (noindex). כשממלאים ומריצים את הסקריפט: מוסר ה-noindex,
# נוספים canonical ו-og:url, תמונות השיתוף הופכות לכתובות מלאות, ונוצרים sitemap.xml ו-robots.txt.
SITE_URL = ''
# קישור ליומן לתיאום אימון ניסיון (Google Calendar – דף הזמנת תורים, או Cal.com). כל עוד ריק, הכפתור לא מוצג.
BOOKING_URL = ''
GUIDE_WA = 'היי אביב, אשמח לקבל את המדריך החינמי למתחילים'
GEO = (31.8554, 34.8489)   # רחוב אורן, מזכרת בתיה (לפי OpenStreetMap, ברמת הרחוב)
IG = 'https://www.instagram.com/aviv_shadmon/'


def wa(text):
    return f'https://wa.me/{PHONE}?text={quote(text)}'


SERVICES = [
    {
        'slug': 'muay-thai', 'seo_title': 'אגרוף תאילנדי (מואי תאי) באימון אישי במזכרת בתיה | אביב משה שדמון – AMS',  'cta': 'לתיאום אימון ניסיון', 'loc': 'במזכרת בתיה ובמרכז', 'menu': 'אגרוף תאילנדי', 'sub': 'טכניקה, כוח וביטחון עצמי',
        'thumb': 'svc-muaythai.webp', 'hero': 'assets/img/muaythai.webp', 'hero_wh': (900, 1125), 'hero_pos': '50% 30%',
        'hero_alt': 'אביב שדמון בעמידת שמירה עם כפפות אגרוף', 'closing': ('assets/img/ring-fist.webp', 941, 530),
        'title': 'אגרוף תאילנדי באימון אישי', 'tagline': 'המסלול שלך לעוצמה',
        'points': ['טכניקה, כוח וביטחון עצמי', 'אימונים בהתאמה אישית מלאה', 'שחרור מתחים ואנרגיה מחודשת'],
        'reviews': ['t2', 't3'],
        'lead': 'אני מאמן אישית במואי תאי ובקיקבוקס: טכניקה, כוח, כושר וביטחון עצמי, בקצב שמתאים לך. למתחילים ולמתקדמים.',
        'intro_h': 'יותר מאימון כושר',
        'intro': ['אגרוף תאילנדי מחזק את הגוף, מלמד טכניקה ושליטה, ומשחרר מתחים. אני מתאים כל אימון לרמה, למטרה ולקצב שלך, כבר מהמפגש הראשון.',
                  'אפשר לשלב באימון גם אימוני כוח ומשקל גוף, ולהוסיף ליווי תזונתי כשרוצים לדייק את התוצאה.'],
        'facts': [('מסגרת', 'אחד על אחד, בזוג או בקבוצה קטנה של עד ארבעה'), ('משך', '45 דקות'), ('רמה', 'מתחילים ומתקדמים'),
                  ('מיקום', 'סטודיו במזכרת בתיה, בבית שלך במזכרת בתיה, בחדר כושר או בחוץ')],
        'inc_h': 'מה כולל האימון',
        'inc': [('טכניקת מואי תאי', 'אגרופים, בעיטות, ברכיים ומרפקים, עמידה ושמירה נכונה.'),
                ('עבודה על מיטים', 'אני מחזיק את המיטים, ואתה עובד בקצב ובעוצמה שמתאימים לך.'),
                ('כושר וסיבולת', 'אימון שבונה אנרגיה, נשימה ויכולת להחזיק מאמץ.'),
                ('כוח ומשקל גוף', 'תרגילי כוח שמשלימים את עבודת הלחימה.'),
                ('קואורדינציה וזריזות', 'תנועה, עבודת רגליים ותזמון.'),
                ('שחרור מתחים', 'אימון שמוציא לחץ ומחזיר אנרגיה.'),
                ('ביטחון עצמי', 'התקדמות שמרגישים גם מחוץ לאימון.'),
                ('התאמה אישית מלאה', 'תוכנית לפי המטרה, הרמה והשגרה שלך.')],
        'steps': [('שיחת היכרות', 'אני לומד את נקודת הפתיחה, המטרה והזמינות שלך.'),
                  ('אימון ראשון', 'נתחיל מהבסיס: עמידה, שמירה ותנועה, ונבדוק התאמה.'),
                  ('תוכנית אישית', 'נקבע תדירות, מיקום ומסגרת, ואבנה לך תוכנית.'),
                  ('מתקדמים', 'כל אימון ממשיך את הקודם, ואני עוקב ומדייק לאורך הדרך.')],
        'faq': [('האימונים מתאימים למתחילים?', 'כן. הרבה מתאמנים מתחילים אצלי בלי שום ניסיון קודם. אני מתאים כל אימון לרמת הכושר ולקצב ההתקדמות, כבר מהמפגש הראשון.'),
                ('מה להביא לאימון הראשון?', 'בגדי ספורט נוחים, מים, מגבת ורצון להתחיל. את שאר הציוד נתאים לפי סוג האימון.'),
                ('אפשר לשלב אימוני לחימה ואימוני כוח?', 'כן. התוכנית יכולה לשלב מואי תאי, קיקבוקס, אימוני כוח ומשקל גוף, לפי המטרה האישית.'),
                ('כמה זמן נמשך אימון?', '45 דקות: חימום, עבודה טכנית ואימון מלא.'),
                ('מה ההבדל בין אגרוף תאילנדי, איגרוף תאילנדי ומואי תאי?', 'אין הבדל, זה אותו ספורט. מואי תאי הוא השם התאילנדי, ובעברית כותבים גם אגרוף וגם איגרוף. אצלי באימון לומדים מואי תאי וגם קיקבוקס, לפי המטרה שלך.'),
                ('אפשר להתאמן בזוג או עם חברים?', 'כן. אפשר להתאמן בזוג או בקבוצה קטנה של עד ארבעה משתתפים. את המסגרת נבחר יחד בשיחת ההיכרות.')],
        'cta_h': 'רוצה להתחיל להתאמן?', 'cta_p': 'שולחים לי הודעה, ונקבע יחד שיחת היכרות ואימון ראשון.',
        'wa': 'היי אביב, אשמח לשמוע על אימון אישי באגרוף תאילנדי',
    },
    {
        'slug': 'sports-nutrition', 'seo_title': 'ייעוץ תזונת ספורט ותפריט חיטוב אישי, גם בזום | אביב משה שדמון – AMS',  'cta': 'לתיאום שיחת ייעוץ', 'loc': 'במזכרת בתיה ובמרכז', 'menu': 'תזונת ספורט ותפריטים', 'sub': 'ייעוץ ותפריט אישי לפי המטרה',
        'thumb': 'svc-nutrition.webp', 'hero': 'assets/img/nutrition.webp', 'hero_wh': (738, 602), 'hero_pos': '50% 40%', 'hero_ratio': '738 / 602',
        'hero_alt': 'אביב שדמון נוגס בארוחה בחדר הכושר', 'closing': ('assets/img/focus.webp', 900, 1600),
        'side_img': ('assets/img/bowl.webp', 620, 580, 'קערה עם חזה עוף בגריל, קינואה, ברוקולי ועגבניות שרי'),
        'title': 'ייעוץ תזונת ספורט ותפריטים', 'tagline': 'בונים הרגלים. רואים תוצאות.',
        'points': ['תפריט מותאם אישית', 'בניית שריר וירידה בשומן', 'מעקב וליווי צמוד לאורך הדרך'],
        'lead': 'תזונה היא חצי מהאימון. אני בונה לך ייעוץ ותפריט אישי סביב המטרה, האימונים והשגרה שלך, כדי להתחזק, להתאושש ולהתקדם.',
        'intro_h': 'תזונה שמתחברת לחיים שלך',
        'intro': ['תזונה מדויקת נותנת לגוף את האנרגיה להתחזק, להתאושש ולהתקדם. התהליך מותאם אישית למטרה, לשגרת החיים ולמערך האימונים שלך.',
                  'זה שירות עצמאי: אפשר לקבל ייעוץ ותפריט בלי אימונים, או לשלב אותם במסלול אגרוף + תזונה.'],
        'facts': [('מתאים ל', 'ירידה בשומן, בניית מסת שריר, שיפור ביצועים ושגרה מאוזנת'),
                  ('איך נפגשים', 'בטלפון, בזום או בפגישה פנים מול פנים'),
                  ('שירות', 'עצמאי, או כחלק ממסלול אגרוף + תזונה'), ('הכשרה', 'הכשרה בתזונת ספורט')],
        'inc_h': 'מה כולל הליווי',
        'inc': [('ייעוץ תזונת ספורט', 'מה לאכול לפני אימון ואחריו, התאוששות, שתייה ואנרגיה לאורך היום.'),
                ('תפריט אישי', 'ארוחות מסודרות, כמויות וחלופות, שמתאימות לשעות העבודה, לטעם שלך ולסופי השבוע.'),
                ('תפריטים לפי מטרה', 'ירידה בשומן, בניית מסת שריר, שיפור ביצועים או שגרה מאוזנת.'),
                ('התאמה לאימונים', 'התפריט מותאם לסוג האימונים ולתדירות שלהם.'),
                ('מעקב ומדידות', 'מעקב שוטף ומדידות, כדי לראות מה עובד.'),
                ('חלופות מגוונות', 'אפשרויות לכל ארוחה, כדי שהתפריט לא ישעמם.'),
                ('כלים לבחירה נכונה', 'איך לבחור נכון במהלך היום, גם מחוץ לבית.'),
                ('הרגלים לטווח ארוך', 'התאמות שוטפות ובניית הרגלים שנשארים.')],
        'steps': [('מגדירים את המטרה', 'ירידה במשקל, בניית מסת שריר, שיפור ביצועים או שגרה מאוזנת.'),
                  ('לומדים את השגרה שלך', 'אני לומד את הרגלי האכילה, שעות העבודה, זמני האימונים והאתגרים של היום־יום.'),
                  ('בונים תפריט אישי', 'תפריט עם ארוחות מסודרות, כמויות, חלופות וגמישות לסופי שבוע.'),
                  ('עוקבים ומדייקים', 'אני עוקב, מודד ומעדכן את התפריט לפי ההתקדמות והשינויים בשגרה.')],
        'faq': [('אפשר לקבל רק ייעוץ תזונה ותפריט, בלי אימונים?', 'כן. ייעוץ תזונת ספורט ותפריט אישי הם שירות עצמאי. אפשר לקבל אותם בנפרד, או לשלב אותם עם אימונים במסלול אגרוף + תזונה.'),
                ('אפשר לקבל ייעוץ מרחוק?', 'כן. הייעוץ והמעקב אפשריים בטלפון, בזום או בפגישה פנים מול פנים, מה שנוח לך.'),
                ('התפריט מתאים גם לאוכל שאני אוהב?', 'כן. בתחילת התהליך אני לומד את הרגלי האכילה והטעם שלך, והתפריט כולל חלופות וגמישות לסופי שבוע.'),
                ('התפריט משתנה לאורך הזמן?', 'כן. אני עוקב ומודד באופן שוטף, ומעדכן את התפריט לפי ההתקדמות והשינויים בשגרה.')],
        'cta_h': 'רוצה תפריט שעובד בשבילך?', 'cta_p': 'שולחים לי הודעה, ונתחיל בשיחת היכרות קצרה.',
        'wa': 'היי אביב, אשמח לייעוץ תזונת ספורט ותפריט אישי',
    },
    {
        'slug': 'boxing-nutrition', 'seo_title': 'אגרוף + תזונה: אימון אגרוף שבועי ותפריט חודשי | אביב משה שדמון – AMS',  'cta': 'להצטרפות למסלול', 'loc': 'במזכרת בתיה ובמרכז', 'menu': 'אגרוף + תזונה', 'sub': 'מסלול הדגל: אימון שבועי ותפריט חודשי', 'flag': 'מסלול הדגל',
        'thumb': 'svc-flagship.webp', 'hero': 'assets/img/pads-partner.webp', 'hero_wh': (1086, 1448), 'hero_pos': '50% 35%',
        'hero_alt': 'אביב מחזיק כריות ומגן בטן, ומתאמן מכה בהן', 'closing': ('assets/img/corner.webp', 941, 532),
        'title': 'אגרוף + תזונה', 'tagline': 'המסלול המקיף לשינוי אמיתי',
        'points': ['שילוב מנצח של אימון ותזונה', 'שינוי פנימי שמוביל לחיצוני', 'ליווי אישי מלא 360°'],
        'reviews': ['t1'],
        'lead': 'חודש של תנועה, תזונה והתקדמות: ייעוץ תזונה ותפריט חודשי, יחד עם אימון אגרוף שבועי, ואני מלווה אותך אישית לאורך כל הדרך.',
        'intro_h': 'שילוב מנצח של אימון ותזונה',
        'intro': ['האימון בונה כוח, כושר וביטחון, והתזונה נותנת לגוף את מה שהוא צריך כדי להתחזק ולהתאושש. כשהשניים עובדים יחד, השינוי מורגש יותר.',
                  'זה המסלול למי שרוצה ליווי מלא: שינוי פנימי שמוביל לשינוי חיצוני.'],
        'facts': [('אימונים', 'אימון אגרוף אישי אחד בשבוע, 45 דקות'), ('תזונה', 'ייעוץ תזונה ותפריט חודשי'), ('ליווי', 'אישי מלא, 360°')],
        'inc_h': 'מה כולל המסלול',
        'inc': [('אימון אגרוף שבועי', 'אימון אישי במואי תאי, מותאם לרמה ולמטרה.'),
                ('ייעוץ תזונה', 'שיחת ייעוץ והתאמה של התזונה לאימונים.'),
                ('תפריט חודשי', 'תפריט אישי עם כמויות וחלופות.'),
                ('מעקב שוטף', 'מעקב אחרי ההתקדמות באימונים ובתזונה.'),
                ('עבודה מנטלית', 'נשימה, ריכוז ומשמעת כחלק מהתהליך.'),
                ('ליווי 360°', 'אני זמין ומדייק לאורך כל החודש.')],
        'steps': [('שיחת היכרות', 'נגדיר מטרה ונקודת פתיחה.'),
                  ('תפריט ותוכנית', 'אבנה לך תפריט חודשי ותוכנית אימונים.'),
                  ('אימון שבועי', 'נפגשים לאימון, ואני עוקב ומדייק.'),
                  ('סיכום והמשך', 'נבדוק יחד מה השתנה ונחליט על ההמשך.')],
        'faq': [('למי מתאים המסלול?', 'למי שרוצה לראות שינוי בגוף ובהרגלים, ורוצה ליווי מלא ולא רק אימון או רק תפריט.'),
                ('המסלול מתאים למתחילים?', 'כן. האימונים והתפריט מותאמים לרמה ולנקודת הפתיחה שלך.')],
        'cta_h': 'רוצה ליווי מלא?', 'cta_p': 'שולחים לי הודעה, ונתחיל בשיחת היכרות קצרה.',
        'wa': 'היי אביב, אשמח לשמוע על המסלול המשולב אגרוף + תזונה',
    },
    {
        'slug': 'talks', 'seo_title': 'הרצאות וסדנאות אגרוף תאילנדי לחברות, בתי ספר וקבוצות | אביב משה שדמון – AMS',  'cta': 'לתיאום הרצאה', 'loc': '', 'menu': 'הרצאות וסדנאות', 'sub': 'לקבוצות, חברות, בתי ספר וארגונים',
        'thumb': 'svc-talks.webp', 'hero': 'assets/img/ring.webp', 'hero_wh': (1325, 970), 'hero_pos': '50% 40%', 'hero_ratio': '1325 / 970',
        'hero_alt': 'אביב שדמון בזירה מול קהל, ידיים פתוחות לצדדים', 'closing': ('assets/img/ring-back.webp', 941, 640),
        'title': 'הרצאות וסדנאות',
        'lead': 'הרצאות לקבוצות, חברות, בתי ספר וארגונים, על הקשר בין גוף, תזונה ותודעה. מה שלמדתי בזירה, באימונים ובתאילנד, מותאם לקהל ולמטרה.',
        'intro_h': 'מהזירה אל הקהל',
        'intro': ['בהרצאות אני מדבר על הקשר בין גוף, תזונה ותודעה: איך לבנות משמעת, להתמודד עם לחץ ולשמור על אנרגיה, מתוך הניסיון שלי באימונים, בלחימה ובתאילנד.',
                  'אפשר לשלב חלק מעשי: אימון התנסות קצר באגרוף תאילנדי לכל המשתתפים.'],
        'facts': [('קהל', 'קבוצות, חברות, בתי ספר וארגונים'), ('פורמט', 'הרצאה, או סדנה עם חלק מעשי'),
                  ('ניסיון', 'הדרכת ילדים בבתי ספר ומחנה אימונים בבנגקוק')],
        'inc_h': 'נושאי ההרצאות',
        'inc': [('תזונת ספורט', 'איך לאכול כדי להתחזק, להתאושש ולהתקדם, בלי דיאטות קיצוניות.'),
                ('משמעת עצמית וחוסן מנטלי', 'מה אומנויות לחימה מלמדות על התמדה, ריכוז ושליטה עצמית, ואיך לקחת את זה ליום־יום.'),
                ('גוף ונפש', 'נשימה, תנועה ועבודה מנטלית ככלים לאיזון פנימי ולהתמודדות עם לחץ.'),
                ('חלק מעשי', 'אימון התנסות קצר באגרוף תאילנדי לכל המשתתפים.')],
        'steps': [('שיחת תיאום', 'אני לומד מי הקהל, מה המטרה ומה המסגרת.'),
                  ('התאמת התוכן', 'אני בוחר נושאים ומתאים אותם לקהל.'),
                  ('ההרצאה', 'הרצאה חיה, עם סיפורים מהזירה ומהאימונים.'),
                  ('חלק מעשי', 'לפי הבחירה, אימון התנסות קצר לכל המשתתפים.')],
        'faq': [('אפשר להוסיף חלק מעשי?', 'כן. אפשר לשלב אימון התנסות קצר באגרוף תאילנדי לכל המשתתפים.'),
                ('למי ההרצאות מתאימות?', 'לקבוצות, חברות, בתי ספר וארגונים. התוכן מותאם לקהל ולמטרה.')],
        'cta_h': 'מתכננים הרצאה או סדנה?', 'cta_p': 'שולחים לי כמה פרטים על הקהל, ונתאם יחד.',
        'wa': 'היי אביב, אשמח לשמוע על הרצאה',
    },
    {
        'slug': 'kids', 'seo_title': 'אגרוף תאילנדי לילדים מגיל 4 | אביב משה שדמון – AMS',  'cta': 'לתיאום אימון ניסיון לילד', 'loc': 'במזכרת בתיה ובמרכז', 'menu': 'אימוני ילדים', 'sub': 'מגיל 4: משמעת, כבוד וביטחון עצמי',
        'thumb': 'svc-kids.webp', 'hero': 'assets/img/kids-coach.webp', 'hero_wh': (1066, 1515), 'hero_pos': '50% 12%',
        'hero_alt': 'אביב שדמון מחייך עם מתאמן צעיר באולם האימונים', 'credit': 'צילום: אביהו רשף',
        'closing': ('assets/img/kids-coach.webp', 1066, 1515), 'video': True,
        'title': 'אימוני ילדים',
        'lead': 'אימוני אגרוף תאילנדי לילדים מגיל 4: מסגרת מקצועית ומהנה שמפתחת משמעת, כבוד, ביטחון עצמי וחוסן מנטלי, מותאמת לגיל ולרמה.',
        'intro_h': 'יותר מספורט',
        'intro': ['אומנויות לחימה מלמדות ילדים להקשיב, להתמיד ולכבד, את עצמם ואת האחרים. האימון בנוי כך שכל ילד מתקדם בקצב שלו ומרגיש הצלחה.',
                  'יש לי ניסיון בהדרכת ילדים בבתי ספר, ומסגרת בטוחה ומהנה היא חלק מהגישה שלי.'],
        'facts': [('גיל', 'מגיל 4, מותאם לגיל ולרמה'), ('משך', '45 דקות'), ('דגש', 'משמעת, כבוד, ביטחון וחוסן'), ('ניסיון', 'הדרכת ילדים בבתי ספר')],
        'inc_h': 'מה הילדים מקבלים',
        'inc': [('משמעת', 'הקשבה, התמדה ועמידה במשימות.'),
                ('כבוד', 'לעצמם, לחברים ולמאמן.'),
                ('ביטחון עצמי', 'הצלחות קטנות שמצטברות לתחושת מסוגלות.'),
                ('חוסן מנטלי', 'התמודדות עם קושי ותסכול.'),
                ('כושר ותנועה', 'קואורדינציה, זריזות ואנרגיה בריאה.'),
                ('הנאה', 'אימון מהנה שהילדים מחכים לו.')],
        'steps': [('שיחה עם ההורים', 'אני מכיר את הילד, את המטרות ואת המסגרת המתאימה.'),
                  ('אימון ראשון', 'היכרות, הסבר על הכללים ובדיקת התאמה.'),
                  ('התקדמות', 'מסגרת קבועה שבה כל ילד מתקדם בקצב שלו.')],
        'faq': [('מאיזה גיל אפשר להתחיל?', 'מגיל 4. האימון מותאם לגיל, כך שגם הקטנים מתקדמים בקצב שלהם ונהנים.'),
                ('זה לא מעודד אלימות?', 'להפך. הדגש הוא על משמעת, כבוד ושליטה עצמית, והכוח נשאר בתוך האימון.'),
                ('הילד צריך ניסיון קודם?', 'לא. האימון מותאם לגיל ולרמה, גם למי שמתחיל מאפס.')],
        'cta_h': 'רוצים לשמוע על אימוני ילדים?', 'cta_p': 'שולחים לי הודעה ומספרים קצת על הילד.',
        'wa': 'היי אביב, אשמח לשמוע על אימוני ילדים',
    },
    {
        'slug': 'body-mind', 'seo_title': 'גוף ותודעה: נשימות, מדיטציה וחוסן מנטלי | אביב משה שדמון – AMS',  'cta': 'לתיאום שיחת היכרות', 'loc': 'במזכרת בתיה ובמרכז', 'menu': 'גוף ותודעה', 'sub': 'נשימה, מדיטציה ועבודה מנטלית',
        'thumb': 'svc-mind.webp', 'hero': 'assets/img/wraps.webp', 'hero_wh': (941, 1211), 'hero_pos': '50% 30%',
        'hero_alt': 'אביב שדמון מרוכז, מלפף תחבושות על הידיים לפני אימון', 'closing': ('assets/img/wraps-close.webp', 931, 529),
        'reviews': ['t4'],
        'title': 'גוף ותודעה',
        'lead': 'תהליך שמשלב נשימות, מדיטציה, תנועה ועבודה מנטלית, לפיתוח ריכוז, איזון פנימי וחוסן.',
        'intro_h': 'לאמן גם את הראש',
        'intro': ['המטרה שלי היא לאמן לא רק את הגוף, אלא גם את הנשמה והתודעה. נשימה נכונה, תנועה ועבודה מנטלית עוזרות להתמודד עם לחץ, להתרכז ולמצוא שקט.',
                  'אפשר לעבוד על גוף ותודעה כתהליך בפני עצמו, או לשלב אותו באימוני הלחימה.'],
        'facts': [('כלים', 'נשימות, מדיטציה, תנועה ועבודה מנטלית'), ('מטרה', 'ריכוז, איזון פנימי וחוסן'),
                  ('שילוב', 'כתהליך נפרד או כחלק מהאימונים')],
        'inc_h': 'מה כולל התהליך',
        'inc': [('נשימות', 'טכניקות נשימה לוויסות, לריכוז ולשחרור.'),
                ('מדיטציה', 'תרגול שקט שמחזק את הקשב והנוכחות.'),
                ('תנועה', 'תנועה מודעת שמחברת בין הגוף לראש.'),
                ('עבודה מנטלית', 'משמעת עצמית, התמדה והתמודדות עם לחץ.')],
        'steps': [('שיחת היכרות', 'אני מקשיב למה שמעסיק אותך ולמטרה שלך.'),
                  ('בניית תהליך', 'נבחר יחד כלים ומסגרת שמתאימים לך.'),
                  ('תרגול והעמקה', 'מתרגלים, מדייקים ומעמיקים לאורך הזמן.')],
        'faq': [('צריך ניסיון במדיטציה?', 'לא. מתחילים מהבסיס ומתקדמים בקצב שלך.'),
                ('אפשר לשלב עם אימוני אגרוף?', 'כן. הנשימה והעבודה המנטלית משתלבות באימונים ומשפרות אותם.')],
        'cta_h': 'רוצה להתחיל תהליך?', 'cta_p': 'שולחים לי הודעה, ונתחיל בשיחת היכרות.',
        'wa': 'היי אביב, אשמח לשמוע על תהליך גוף ותודעה',
    },
]

REVIEWS = {
    't2': {'hl': 'גם כשאני בטוח שנגמר לי ואני לא יכול עוד, אתה לא מוותר לי',
           'text': 'אח אני חייב להגיד לך שאני הכי מעריך אצלך זה שאתה תמיד יודע להוציא ממני יותר. גם כשאני בטוח שנגמר לי ואני לא יכול עוד, אתה לא מוותר לי. אתה דוחף, מעודד וגורם לי לגלות שאני יכול יותר. מבחינתי זה אחד הדברים הכי חזקים באימונים איתך זה לא רק להתחזק פיזית, אלא לגלות כל פעם מחדש שאני מסוגל ליותר ממה שחשבתי.',
           'wh': (720, 452)},
    't3': {'hl': 'כמעט שנתיים שאני מתאמן אצלך, והגוף שלי השתנה לגמרי',
           'text': 'שמע כבר כמעט שנתיים שאני מתאמן אצלך, והגוף שלי השתנה לגמרי. נהייתי חזק יותר, גמיש יותר, עם הרבה יותר כוח מתפרץ וכושר. אני מרגיש הרבה יותר דינמי ומחובר לגוף שלי, משהו שלא הרגשתי באימונים רגילים בחדר כושר. וגם מעבר לכושר, פשוט כיף ללמוד איגרוף אצלך את כל הטכניקה והקומבואים ולהרגיש שאני כל הזמן מתקדם.',
           'wh': (720, 443)},
    't4': {'hl': 'זה בנה לי ממש שריר מנטלי',
           'text': 'שמע אחי מאז שהתחלנו להתאמן ובמיוחד לעשות ספארינג הבנתי כמה הספורט הזה הוא מנטלי. למדתי להתמודד עם לחץ, להגיב מהר, להישאר חד גם כשלא נוח, לקבל מכה ולהמשיך קדימה. זה בנה לי ממש שריר מנטלי... יותר קור רוח, יותר ביטחון ועזרת לי לגלות על עצמי יכולות התמודדות גם כשקשה אז ממש תודה על זה ימלך',
           'wh': (720, 411)},
    't5': {'hl': 'בנית תוכניות אימון מאתגרות תוך שמירה על הגוף',
           'text': 'אביב היקר, למרות שאתה צעיר מאד התרשמתי המקצועיות שלך ההבנה של המתאמנים ובנית תוכניות אימון מאתגרות תוך שמירה על הגוף. למרות החששות בהתחלה אני חייב לציין שאתה מאמן קשוב יצירתי והכי חשוב מאתגר באימון. ממליץ בחום. שמח שהכרנו בטוח שנמשיך עוד שנים יחד',
           'wh': (695, 635)},
    't1': {'hl': 'כל אימון מרגיש כמו מסיבה',
           'text': 'שמע אביב מאז שהתחלתי להתאמן אצלך, אני מרגיש הרבה יותר ביטחון עצמי והכושר שלי עלה בכמה רמות. ממש כיף להתאמן אצלך כל אימון מרגיש כמו מסיבה, ואני מחכה לאימונים כל שבוע מחדש.',
           'wh': (720, 447)},
}
HOME_REVIEWS = ['t2', 't3', 't4', 't5', 't1']


def review_card(rid, root):
    r = REVIEWS[rid]
    w, h = r['wh']
    return f'''      <figure class="review">
        <blockquote>
          <p class="review-hl">{r['hl']}</p>
          <p class="review-text">{r['text']}</p>
        </blockquote>
        <figcaption>
          <span>הודעת WhatsApp ממתאמן</span>
          <details class="review-proof"><summary>להודעה המקורית</summary><img src="{root}assets/img/reviews/{rid}.webp" alt="צילום מסך של ההודעה המקורית ב־WhatsApp" width="{w}" height="{h}" loading="lazy"></details>
        </figcaption>
      </figure>
'''


def home_reviews():
    cards = ''.join(review_card(r, '') for r in HOME_REVIEWS)
    return f'''<!-- BEGIN reviews -->
  <!-- המלצות: הודעות אמיתיות, מילה במילה, בלי שמות -->
  <section class="section reviews" id="reviews" aria-labelledby="reviews-title">
    <div class="reviews-head">
      <h2 class="h2" id="reviews-title">מה המתאמנים כותבים לי</h2>
      <p>הודעות אמיתיות שקיבלתי ב־WhatsApp, מילה במילה. בלי שמות, כדי לשמור על הפרטיות.</p>
    </div>
    <div class="reviews-grid">
{cards}    </div>
  </section>
<!-- END reviews -->'''


WA_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg>'
CHEV = '<svg class="menu-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
SPRITE = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z"/></symbol>
  <symbol id="i-glove" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 12.5A6.5 6.5 0 0 1 17 6h3.5a6.5 6.5 0 0 1 6.5 6.5V17a5 5 0 0 1-5 5h-8a3.5 3.5 0 0 1-3.5-3.5Z"/><path d="M10.5 12.8H8.4a2.9 2.9 0 0 0 0 5.8H14"/><path d="M13 22v4.5h9V22"/><path d="M16 24.3h3"/><path d="M17 10.5h6"/></symbol>
  <symbol id="i-dumbbell" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 16h13"/><path d="M6 11.5v9"/><path d="M9.5 9v14"/><path d="M22.5 9v14"/><path d="M26 11.5v9"/></symbol>
  <symbol id="i-target" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="17" r="10"/><circle cx="15" cy="17" r="5.5"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/><path d="M15 17L25.5 6.5"/><path d="M21.5 6.5h4v4"/></symbol>
  <symbol id="i-ring" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8v16"/><path d="M26 8v16"/><path d="M6 11.5q10 3 20 0"/><path d="M6 15.5q10 3 20 0"/><path d="M6 19.5q10 3 20 0"/><path d="M3 24.5h26"/><path d="M4.8 8h2.4"/><path d="M24.8 8h2.4"/></symbol>
  <symbol id="i-home" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15.5L16 6.5l11 9"/><path d="M8.5 13v13h15V13"/><path d="M13.5 26v-6.5h5V26"/></symbol>
  <symbol id="i-kettlebell" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 14.2V11a4.5 4.5 0 0 1 9 0v3.2"/><circle cx="16" cy="19.5" r="7"/><path d="M13 26.5h6"/></symbol>
  <symbol id="i-outdoor" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5.5c-4 0-7 2.9-7 6.4 0 3.6 3 6.3 7 6.3s7-2.7 7-6.3c0-3.5-3-6.4-7-6.4Z"/><path d="M16 18.2v8.3"/><path d="M16 21.5l-3-2.2"/><path d="M7 26.5h18"/></symbol>
  <symbol id="i-pin" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28s8-7.5 8-14a8 8 0 1 0-16 0c0 6.5 8 14 8 14Z"/><circle cx="16" cy="14" r="3"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="7.5" width="21" height="19" rx="2"/><path d="M5.5 13h21"/><path d="M11 5v5"/><path d="M21 5v5"/><path d="M11 18h3"/><path d="M18 18h3"/><path d="M11 22h3"/></symbol>
  <symbol id="i-instagram" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="21" height="21" rx="6"/><circle cx="16" cy="16" r="5"/><circle cx="22.2" cy="9.8" r="1.1" fill="currentColor" stroke="none"/></symbol>
</svg>'''


def header(root, current=None):
    """כותרת עליונה + תפריט מסך מלא. root = '' לדף הבית, '../' לדפי שירות."""
    home = f'{root}index.html'
    subs = ''
    for s in SERVICES:
        cur = ' aria-current="page"' if s['slug'] == current else ''
        subs += (f'        <a href="{root}services/{s["slug"]}.html"{cur} data-img="{root}assets/img/{s["thumb"]}" data-cap="{s["menu"]}" data-sub="{s["sub"]}">'
                 f'<img src="{root}assets/img/{s["thumb"]}" alt="" width="480" height="360" loading="lazy">'
                 f'<span><b>{s["menu"]}</b><small>{s["sub"]}</small></span></a>\n')
    item = lambda n, href, t, img, cap, sub: (
        f'      <li><a class="menu-item" href="{href}" data-img="{root}{img}" data-cap="{cap}" data-sub="{sub}">'
        f'<span class="menu-num">{n}</span><span class="menu-t">{t}</span>{CHEV}</a></li>\n')
    return f'''<!-- BEGIN header -->
<header class="site-header" data-header>
  <a class="brand" href="{home}">
    <img src="{root}assets/brand/ams.svg" alt="AMS – Mind &amp; Body Connection" width="420" height="126">
  </a>
  <div class="header-actions">
    <a class="header-cta" href="{wa('היי אביב, אשמח לתאם אימון ניסיון')}" target="_blank" rel="noopener" data-cta="header">{WA_ICON}<span>אימון ניסיון</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-menu" data-menu-toggle>
      <span class="menu-btn-label">תפריט</span>
      <span class="menu-toggle-bars" aria-hidden="true"></span>
    </button>
  </div>
</header>

<div class="menu" id="site-menu" data-menu>
  <div class="menu-in">
    <nav class="menu-nav" aria-label="תפריט ראשי">
      <ol class="menu-list">
{item('01', home, 'ראשי', 'assets/hero/poster.webp', 'AMS', 'Mind &amp; Body Connection')}{item('02', root + 'about.html', 'מי אני', 'assets/img/coach.webp', 'אביב משה שדמון', 'מאמן גוף ונפש, יותר מ־10 שנות ניסיון')}      <li class="menu-has-sub">
        <button class="menu-item" type="button" aria-expanded="true" aria-controls="menu-sub" data-sub-toggle data-img="{root}assets/img/pads-partner.webp" data-cap="שירותים" data-sub="שישה שירותים, מטרה אחת">
          <span class="menu-num">03</span><span class="menu-t">שירותים</span>{CHEV}
        </button>
        <div class="menu-sub" id="menu-sub">
{subs}        </div>
      </li>
{item('04', home + '#where', 'איפה מתאמנים', 'assets/img/training.webp', 'איפה מתאמנים', 'סטודיו פרטי, בבית, בחדר כושר או בחוץ')}{item('05', home + '#faq', 'שאלות נפוצות', 'assets/img/focus.webp', 'שאלות נפוצות', 'מה כדאי לדעת לפני שמתחילים')}{item('06', root + 'articles/index.html', 'מאמרים', 'assets/img/bowl.webp', 'מאמרים', 'אימון, תזונה ותודעה')}{item('07', home + '#contact', 'יצירת קשר', 'assets/img/ready.webp', 'יצירת קשר', 'שיחת היכרות ב־WhatsApp')}      </ol>
    </nav>
    <aside class="menu-vis" aria-label="יצירת קשר">
      <figure class="menu-fig" aria-hidden="true">
        <img src="{root}assets/img/pads-partner.webp" alt="" width="1086" height="1448" loading="lazy" data-menu-img>
        <figcaption><b data-menu-cap>שירותים</b><span data-menu-sub>שישה שירותים, מטרה אחת</span></figcaption>
      </figure>
      <a class="btn btn-gold btn-block" href="{wa('היי אביב, אשמח לתאם אימון ניסיון')}" target="_blank" rel="noopener" data-cta="menu">{WA_ICON}לתיאום אימון ניסיון</a>
      <p class="menu-foot"><span class="with-ico"><svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#i-pin"/></svg>אורן 21, מזכרת בתיה</span><a class="with-ico" href="{IG}" target="_blank" rel="noopener"><svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#i-instagram"/></svg><span dir="ltr">@aviv_shadmon</span></a></p>
    </aside>
  </div>
</div>
<!-- END header -->'''


def footer(root):
    links = ''.join(f'      <li><a href="{root}services/{s["slug"]}.html">{s["menu"]}</a></li>\n' for s in SERVICES)
    area_links = ''.join(f'      <li><a href="{root}areas/{a["slug"]}.html">ליד {a["town"]}</a></li>\n' for a in AREAS)
    return f'''<!-- BEGIN footer -->
<footer class="site-footer">
  <div class="footer-top">
    <p class="logo logo-sm"><img src="{root}assets/brand/logo.svg" alt="AMS – Mind &amp; Body Connection, Aviv Moshe Shadmon" width="430" height="205" loading="lazy"></p>
    <nav class="footer-nav" aria-label="שירותים">
      <p class="footer-h">שירותים</p>
      <ul>
{links}      </ul>
    </nav>
    <nav class="footer-nav" aria-label="עוד באתר">
      <p class="footer-h">עוד באתר</p>
      <ul>
      <li><a href="{root}articles/index.html">מאמרים</a></li>
{area_links}      </ul>
    </nav>
    <div class="footer-contact">
      <p class="footer-h">יצירת קשר</p>
      <ul>
        <li><a class="with-ico" href="https://wa.me/{PHONE}" target="_blank" rel="noopener"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg>WhatsApp</a></li>
        <li><a class="with-ico" href="{IG}" target="_blank" rel="noopener"><svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#i-instagram"/></svg>Instagram</a></li>
        <li class="with-ico"><svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#i-pin"/></svg>אורן 21, מזכרת בתיה</li>
      </ul>
    </div>
  </div>
  <p class="footer-copy">© <span data-year>2026</span> AMS · אביב משה שדמון</p>
</footer>
<a class="sticky-cta" href="{wa('היי אביב, אשמח לתאם אימון ניסיון')}" target="_blank" rel="noopener" data-cta="sticky">
  {WA_ICON}
  לתיאום אימון ניסיון
</a>
<!-- END footer -->'''


def head(title, desc, root, og, extra=''):
    if not og.endswith(('.jpg', '.png')):   # תמונת שיתוף בפורמט שכל הרשתות קוראות
        og = 'assets/img/og.jpg'
    return f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<!-- בסיס בפיתוח: להסיר את noindex כשהאתר עולה לדומיין של AMS -->
<meta name="robots" content="noindex">
<meta name="theme-color" content="#16110C">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{root}{og}">
<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{root}fonts/plex/plex-hebrew-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}fonts/dragon.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}css/ams.css">
{extra}</head>'''


def ld(s):
    """נתונים מובנים לגוגל: שירות, פירורי לחם ושאלות נפוצות."""
    import json
    data = [
        {'@context': 'https://schema.org', '@type': 'Service', 'name': s['title'], 'description': s['lead'],
         'serviceType': s['menu'], 'areaServed': ['מזכרת בתיה', 'אזור המרכז'],
         'provider': {'@type': 'Person', 'name': 'אביב משה שדמון', 'sameAs': [IG]}},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'ראשי', 'item': '../index.html'},
            {'@type': 'ListItem', 'position': 2, 'name': 'שירותים', 'item': '../index.html#services'},
            {'@type': 'ListItem', 'position': 3, 'name': s['menu']}]},
        {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in s['faq']]},
    ]
    return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=1) + '\n</script>\n'


def home_faq_ld(html):
    """שאלות נפוצות בדף הבית -> נתונים מובנים (נקראות מה-HTML עצמו)."""
    import json
    qa = re.findall(r'<details>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>', html, flags=re.S)
    data = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q.strip(), 'acceptedAnswer': {'@type': 'Answer', 'text': a.strip()}} for q, a in qa]}
    return '<!-- BEGIN faq-ld -->\n<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=1) + '\n</script>\n<!-- END faq-ld -->'


def service_page(s):
    r = '../'
    others = ''.join(
        f'''      <li><a class="more-card" href="{o["slug"]}.html"><img src="{r}assets/img/{o["thumb"]}" alt="" width="480" height="360" loading="lazy"><span><b>{o["menu"]}</b><small>{o["sub"]}</small></span></a></li>\n'''
        for o in SERVICES if o['slug'] != s['slug'])
    facts = ''.join(f'        <div><dt>{k}</dt><dd>{v}</dd></div>\n' for k, v in s['facts'])
    inc = ''.join(f'      <li><strong>{k}</strong><span>{v}</span></li>\n' for k, v in s['inc'])
    steps = ''.join(f'      <li>\n        <h3>{k}</h3>\n        <p>{v}</p>\n      </li>\n' for k, v in s['steps'])
    faq = ''.join(f'      <details>\n        <summary>{q}</summary>\n        <p>{a}</p>\n      </details>\n' for q, a in s['faq'])
    intro = ''.join(f'      <p>{p}</p>\n' for p in s['intro'])
    if s.get('points'):
        intro += '      <ul class="checks svc-points">\n' + ''.join(f'        <li>{p}</li>\n' for p in s['points']) + '      </ul>\n'
    tagline = f'\n        <p class="svc-tagline">{s["tagline"]}</p>' if s.get('tagline') else ''
    for a in ARTICLES:
        if a['service'] == s['slug']:
            intro += f'      <p class="svc-read"><a href="{r}articles/{a["slug"]}.html">לקריאה: {a["title"]}</a></p>\n'
    ratio = f'aspect-ratio:{s["hero_ratio"]};' if s.get('hero_ratio') else ''
    credit = f'\n        <figcaption>{s["credit"]}</figcaption>' if s.get('credit') else ''
    cimg, cw, ch = s['closing']
    side = ''
    if s.get('side_img'):
        si, sw, sh, sa = s['side_img']
        side = f'      <figure class="svc-side-fig"><img src="{r}{si}" alt="{sa}" width="{sw}" height="{sh}" loading="lazy"></figure>\n'
    reviews = ''
    if s.get('reviews'):
        reviews = f'''
  <section class="section reviews svc-reviews" aria-labelledby="reviews-title">
    <h2 class="h2" id="reviews-title">מה המתאמנים כותבים לי</h2>
    <div class="reviews-grid">
{''.join(review_card(x, r) for x in s['reviews'])}    </div>
  </section>
'''
    video = ''
    if s.get('video'):
        video = f'''
  <section class="section clip" aria-labelledby="clip-title">
    <div class="clip-text">
      <h2 class="h2" id="clip-title">ככה נראה אימון</h2>
      <p>אימון קבוצתי של ילדים: חימום, עבודה בזוגות על כריות, והרבה אנרגיה. כל ילד מתקדם בקצב שלו, ונהנה מהדרך.</p>
    </div>
    <figure class="clip-media">
      <video poster="{r}assets/video/kids-class.webp" width="464" height="832" muted loop playsinline preload="none" aria-label="סרטון קצר מאימון ילדים קבוצתי" data-clip>
        <source src="{r}assets/video/kids-class.mp4" type="video/mp4">
        <source src="{r}assets/video/kids-class.webm" type="video/webm">
      </video>
      <button class="clip-toggle" type="button" data-clip-toggle hidden>עצירה</button>
    </figure>
  </section>
'''
    flag = f'\n      <p class="svc-flag">{s["flag"]}</p>' if s.get('flag') else ''
    w, h = s['hero_wh']
    return f'''{head(s.get('seo_title') or f'{s["title"]} | אביב משה שדמון – AMS', s['lead'], r, s['hero'], ld(s))}
<body class="is-inner">
<a class="skip" href="#main">דלג לתוכן</a>

{header(r, s['slug'])}

<main id="main">
  <section class="svc-hero" aria-labelledby="svc-title">
    <div class="svc-hero-in">
      <div class="svc-hero-text">
        <ol class="crumbs" aria-label="פירורי לחם">
          <li><a href="{r}index.html">ראשי</a></li>
          <li><a href="{r}index.html#services">שירותים</a></li>
          <li aria-current="page">{s['menu']}</li>
        </ol>{flag}
        <h1 class="svc-title" id="svc-title">{s['title']}</h1>{tagline}
        <p class="svc-lead">{s['lead']}</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa(s['wa'])}" target="_blank" rel="noopener" data-cta="svc-hero">{WA_ICON}{s['cta']}</a>
          {booking_btn('svc-hero') or '<a class="btn btn-line" href="#includes">מה כולל</a>'}
        </div>
        <ul class="assure" aria-label="מה חשוב לדעת">
          <li>בלי התחייבות</li>
          <li>{'מותאם לגיל ולרמה' if s['slug'] == 'kids' else 'מותאם לקהל ולמטרה' if s['slug'] == 'talks' else 'גם למתחילים'}</li>
          <li>אני עונה אישית</li>
        </ul>
      </div>
      <figure class="svc-hero-img">
        <img src="{r}{s['hero']}" alt="{s['hero_alt']}" width="{w}" height="{h}" style="{ratio}object-position:{s['hero_pos']}" fetchpriority="high">{credit}
      </figure>
    </div>
  </section>

  <section class="section svc-intro" aria-labelledby="intro-title">
    <div class="svc-intro-body">
      <h2 class="h2" id="intro-title">{s['intro_h']}</h2>
{intro}    </div>
    <div class="svc-side">
      <dl class="svc-facts">
{facts}      </dl>
{side}    </div>
  </section>

  <section class="section" id="includes" aria-labelledby="inc-title">
    <h2 class="h2" id="inc-title">{s['inc_h']}</h2>
    <ul class="svc-list">
{inc}    </ul>
  </section>
{video}{reviews}
  <section class="section" aria-labelledby="steps-title">
    <h2 class="h2" id="steps-title">איך זה עובד</h2>
    <ol class="steps svc-steps">
{steps}    </ol>
  </section>

  <section class="section trainer" aria-labelledby="trainer-title">
    <figure class="trainer-photo">
      <img src="{r}assets/img/coach.webp" alt="אביב משה שדמון עם כריות אימון" width="1086" height="1358" loading="lazy">
    </figure>
    <div class="trainer-body">
      <p class="trainer-label">נעים להכיר</p>
      <h2 class="h2" id="trainer-title">אביב משה שדמון</h2>
      <p>אני מאמן גוף ונפש, ומתמחה במואי תאי, קיקבוקס, כוח ותזונת ספורט. התאהבתי בתחום לפני כעשור, התאמנתי במחנה אימונים בבנגקוק, ומאז אני מלווה אנשים בתהליך שבו הלחימה היא הדרך.</p>
      <ul class="creds">
        <li>הכשרה מקצועית במכון וינגייט</li>
        <li>מחנה אימונים בבנגקוק, תאילנד</li>
        <li>הכשרה בתזונת ספורט</li>
        <li>יותר מ־10 שנות ניסיון</li>
      </ul>
      <a class="trainer-link" href="{r}about.html">הסיפור שלי</a>
    </div>
  </section>

  <section class="section faq" aria-labelledby="faq-title">
    <h2 class="h2" id="faq-title">שאלות נפוצות</h2>
    <div class="faq-list">
{faq}    </div>
  </section>

  <section class="closing" aria-labelledby="closing-title">
    <img class="closing-bg" src="{r}{cimg}" alt="" width="{cw}" height="{ch}" loading="lazy">
    <div class="closing-inner">
      <h2 class="closing-title" id="closing-title"><span>{s['cta_h']}</span></h2>
      <p>{s['cta_p']}</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{wa(s['wa'])}" target="_blank" rel="noopener" data-cta="svc-closing">{WA_ICON}{s['cta']}</a>
      </div>
    </div>
  </section>

  <section class="section more" aria-labelledby="more-title">
    <h2 class="h2" id="more-title">שירותים נוספים</h2>
    <ul class="more-grid">
{others}    </ul>
  </section>
</main>

{footer(r)}

{SPRITE}

<script src="{r}js/ams.js" defer></script>
</body>
</html>
'''


def add_srcset(html):
    """לכל תמונה שיש לה גרסה קטנה (שם-רוחב.webp) מוסיפים srcset ו-sizes לפי ההקשר."""
    from PIL import Image
    html = re.sub(r' srcset="[^"]*" sizes="[^"]*"', '', html)

    def sizes_for(name, tag, before):
        if name.startswith('svc-'):
            if 'more-card' in before[-160:]:
                return '(max-width: 760px) 45vw, 230px'
            if 'service-img' in before[-80:]:
                return '(max-width: 760px) 96px, 184px'
            return '72px'
        if 'closing-bg' in tag or 'flagship-bg' in tag or 'facts-bg' in tag:
            return '100vw'
        if 'trainer-photo' in before[-80:]:
            return '(max-width: 1020px) 92vw, 420px'
        if name == 'poster.webp':
            return '(max-width: 760px) 44vh, 100vh'
        if name == 'coach.webp':
            return '(max-width: 760px) 92vw, 440px'
        return '(max-width: 1020px) 92vw, 560px'

    def fix(m):
        tag = m.group(0)
        if 'data-menu-img' in tag:          # התמונה בתפריט מתחלפת ב-JS, בלי srcset
            return tag
        src = re.search(r'src="([^"]+\.webp)"', tag)
        if not src:
            return tag
        src = src.group(1)
        disk = os.path.join(ROOT, src.replace('../', '').lstrip('/'))
        folder, name = os.path.split(disk)
        stem = name[:-5]
        small = [f for f in os.listdir(folder) if re.fullmatch(re.escape(stem) + r'-(\d+)\.webp', f)]
        if not small or not os.path.exists(disk):
            return tag
        w_small = int(re.search(r'-(\d+)\.webp$', small[0]).group(1))
        w_big = Image.open(disk).width
        src_small = src[: -len(name)] + small[0]
        attrs = f' srcset="{src_small} {w_small}w, {src} {w_big}w" sizes="{sizes_for(name, tag, html[:m.start()])}"'
        return tag.replace(f'src="{src}"', f'src="{src}"{attrs}', 1)

    return re.sub(r'<img\b[^>]*>', fix, html)


SVC = {s['slug']: s for s in SERVICES}
DATE = '2026-10-03'


def reading_minutes(a):
    words = 0
    for b in a['body']:
        if b[0] in ('p', 'h2'):
            words += len(b[1].split())
        elif b[0] == 'ul':
            words += sum(len(x.split()) for x in b[1])
        elif b[0] == 'quote':
            words += len(b[1].split())
    return max(2, round(words / 170))


def cta_box(slug, r):
    s = SVC[slug]
    return f"""      <aside class="cta-box">
        <p class="cta-box-t">{s['menu']}</p>
        <p>{s['lead']}</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa(s['wa'])}" target="_blank" rel="noopener" data-cta="article">{WA_ICON}{s['cta']}</a>
          <a class="btn btn-line" href="{r}services/{slug}.html">לפרטים על השירות</a>
        </div>
      </aside>
"""


def render_blocks(blocks, r):
    out = ''
    for b in blocks:
        if b[0] == 'p':
            out += f'      <p>{b[1]}</p>\n'
        elif b[0] == 'h2':
            out += f'      <h2>{b[1]}</h2>\n'
        elif b[0] == 'ul':
            out += '      <ul class="checks">\n' + ''.join(f'        <li>{x}</li>\n' for x in b[1]) + '      </ul>\n'
        elif b[0] == 'quote':
            out += f'      <blockquote class="pull"><p>{b[1]}</p><footer>{b[2]}</footer></blockquote>\n'
        elif b[0] == 'cta':
            out += cta_box(b[1], r)
    return out


def article_cards(items, r, current=None):
    return ''.join(
        f'      <li><a class="more-card" href="{r}articles/{a["slug"]}.html"><img src="{r}{a["img"][0]}" alt="" width="{a["img"][1]}" height="{a["img"][2]}" style="object-position:{a["img"][3]}" loading="lazy"><span><b>{a["short"]}</b><small>{a["desc"]}</small></span></a></li>\n'
        for a in items if a['slug'] != current)


def page(r, title, desc, og, ld_html, main_html, body_class='is-inner'):
    return f"""{head(title, desc, r, og, ld_html)}
<body class="{body_class}">
<a class="skip" href="#main">דלג לתוכן</a>

{header(r)}

<main id="main">
{main_html}</main>

{footer(r)}

{SPRITE}

<script src="{r}js/ams.js" defer></script>
</body>
</html>
"""


def ld_json(data):
    import json
    return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=1) + '\n</script>\n'


def crumbs(r, items):
    li = ''.join(f'          <li><a href="{href}">{t}</a></li>\n' for t, href in items[:-1])
    return f'        <ol class="crumbs" aria-label="פירורי לחם">\n          <li><a href="{r}index.html">ראשי</a></li>\n{li}          <li aria-current="page">{items[-1][0]}</li>\n        </ol>'


def article_page(a):
    r = '../'
    img, w, h, pos, alt = a['img']
    ld_html = ld_json([
        {'@context': 'https://schema.org', '@type': 'Article', 'headline': a['title'], 'description': a['desc'],
         'image': r + img, 'datePublished': DATE, 'inLanguage': 'he',
         'author': {'@type': 'Person', 'name': 'אביב משה שדמון', 'sameAs': [IG]}},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'ראשי', 'item': '../index.html'},
            {'@type': 'ListItem', 'position': 2, 'name': 'מאמרים', 'item': 'index.html'},
            {'@type': 'ListItem', 'position': 3, 'name': a['short']}]},
    ])
    main_html = f"""  <article class="art" aria-labelledby="art-title">
    <header class="art-head">
{crumbs(r, [('מאמרים', 'index.html'), (a['short'], '')])}
      <h1 class="svc-title" id="art-title">{a['title']}</h1>
      <p class="art-meta">אביב משה שדמון · {reading_minutes(a)} דקות קריאה</p>
      <p class="svc-lead">{a['desc']}</p>
    </header>
    <figure class="art-fig">
      <img src="{r}{img}" alt="{alt}" width="{w}" height="{h}" style="object-position:{pos}" fetchpriority="high">
    </figure>
    <div class="prose">
{render_blocks(a['body'], r)}    </div>
  </article>

  <section class="section more" aria-labelledby="more-title">
    <h2 class="h2" id="more-title">עוד מאמרים</h2>
    <ul class="more-grid art-grid art-grid-4">
{article_cards(ARTICLES, r, a['slug'])}    </ul>
  </section>
"""
    return page(r, f'{a["title"]} | אביב משה שדמון – AMS', a['desc'], img, ld_html, main_html)


def articles_index():
    r = '../'
    desc = 'מאמרים של אביב משה שדמון על אגרוף תאילנדי, אימון אישי, תזונת ספורט ועבודה מנטלית.'
    main_html = f"""  <section class="svc-hero art-index-hero" aria-labelledby="svc-title">
    <div class="art-head">
{crumbs(r, [('מאמרים', '')])}
      <h1 class="svc-title" id="svc-title">מאמרים</h1>
      <p class="svc-lead">מה שאני מסביר למתאמנים שלי, גם לך: אימון, תזונה ועבודה מנטלית, בשפה פשוטה.</p>
    </div>
  </section>

  <section class="section" aria-label="כל המאמרים">
    <ul class="more-grid art-grid">
{article_cards(ARTICLES, r)}    </ul>
  </section>
"""
    return page(r, 'מאמרים | אביב משה שדמון – AMS', desc, 'assets/img/og.jpg', '', main_html)


def area_page(ar):
    r = '../'
    img, w, h, pos, alt = ar['img']
    town, mins = ar['town'], ar['min']
    msg = f'היי אביב, אני {ar["from"]} ואשמח לתאם אימון ניסיון'
    waze = 'https://waze.com/ul?q=%D7%90%D7%95%D7%A8%D7%9F%2021%20%D7%9E%D7%96%D7%9B%D7%A8%D7%AA%20%D7%91%D7%AA%D7%99%D7%94&navigate=yes'
    faq = [
        (f'כמה זמן לוקח להגיע {ar["from"]}?', f'כ־{mins} דקות נסיעה, תלוי בתנועה. הסטודיו נמצא ברחוב אורן 21 במזכרת בתיה.'),
        (f'אתה מגיע לאימונים בבית {ar["in"]}?', f'אימונים בבית אני עושה כרגע במזכרת בתיה. {ar["from"]} מגיעים לסטודיו, ואת ייעוץ התזונה אפשר לקבל גם בטלפון או בזום.'),
        ('האימונים מתאימים למתחילים?', 'כן. הרבה מתאמנים מתחילים אצלי בלי שום ניסיון קודם. אני מתאים כל אימון לרמה ולקצב שלך, כבר מהמפגש הראשון.'),
        ('יש אימונים לילדים?', 'כן, מגיל 4. האימון מותאם לגיל ולרמה. שולחים לי הודעה ואפרט על המסגרות.'),
    ]
    faq_html = ''.join(f'      <details>\n        <summary>{q}</summary>\n        <p>{x}</p>\n      </details>\n' for q, x in faq)
    services = ''.join(
        f'      <li><a class="more-card" href="{r}services/{o["slug"]}.html"><img src="{r}assets/img/{o["thumb"]}" alt="" width="480" height="360" loading="lazy"><span><b>{o["menu"]}</b><small>{o["sub"]}</small></span></a></li>\n'
        for o in SERVICES)
    ld_html = ld_json([
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'ראשי', 'item': '../index.html'},
            {'@type': 'ListItem', 'position': 2, 'name': f'ליד {town}'}]},
        {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': x}} for q, x in faq]},
    ])
    lead = f'הסטודיו שלי נמצא באורן 21 במזכרת בתיה, כ־{mins} דקות נסיעה {ar["from"]}. אימון אישי באגרוף תאילנדי, כושר ותזונת ספורט, למתחילים ולמתקדמים.'
    main_html = f"""  <section class="svc-hero" aria-labelledby="svc-title">
    <div class="svc-hero-in">
      <div class="svc-hero-text">
{crumbs(r, [(f'ליד {town}', '')])}
        <h1 class="svc-title" id="svc-title">אגרוף תאילנדי ואימון אישי ליד {town}</h1>
        <p class="svc-lead">{lead}</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa(msg)}" target="_blank" rel="noopener" data-cta="area-hero">{WA_ICON}לתיאום אימון ניסיון</a>
          <a class="btn btn-line" href="{waze}" target="_blank" rel="noopener">ניווט לסטודיו</a>
        </div>
        <ul class="assure" aria-label="מה חשוב לדעת">
          <li>בלי התחייבות</li>
          <li>גם למתחילים</li>
          <li>אני עונה אישית</li>
        </ul>
      </div>
      <figure class="svc-hero-img">
        <img src="{r}{img}" alt="{alt}" width="{w}" height="{h}" style="object-position:{pos}" fetchpriority="high">
      </figure>
    </div>
  </section>

  <section class="section svc-intro" aria-labelledby="intro-title">
    <div class="svc-intro-body">
      <h2 class="h2" id="intro-title">סטודיו פרטי, כ־{mins} דקות {ar['from']}</h2>
      <p>{ar['line']}</p>
      <p>מחפש מאמן כושר אישי או אימוני אגרוף תאילנדי ליד {town}? אני מתאים כל אימון למטרה, לרמה ולקצב שלך: אגרוף תאילנדי (מואי תאי) וקיקבוקס, כוח וכושר, ואם רוצים גם ליווי תזונתי. אפשר להתאמן אחד על אחד, בזוג או בקבוצה קטנה של עד ארבעה.</p>
    </div>
    <div class="svc-side">
      <dl class="svc-facts">
        <div><dt>הסטודיו</dt><dd>אורן 21, מזכרת בתיה</dd></div>
        <div><dt>נסיעה {ar['from']}</dt><dd>כ־{mins} דקות, תלוי בתנועה</dd></div>
        <div><dt>משך אימון</dt><dd>45 דקות</dd></div>
        <div><dt>ייעוץ תזונה</dt><dd>בסטודיו, בטלפון או בזום</dd></div>
      </dl>
    </div>
  </section>

  <section class="section more" aria-labelledby="svc-list-title">
    <h2 class="h2" id="svc-list-title">מה אפשר לעשות אצלי</h2>
    <ul class="more-grid area-svcs">
{services}    </ul>
  </section>

  <section class="section reviews svc-reviews" aria-labelledby="reviews-title">
    <h2 class="h2" id="reviews-title">מה המתאמנים כותבים לי</h2>
    <div class="reviews-grid">
{review_card('t2', r)}{review_card('t3', r)}    </div>
  </section>

  <section class="section faq" aria-labelledby="faq-title">
    <h2 class="h2" id="faq-title">שאלות נפוצות</h2>
    <div class="faq-list">
{faq_html}    </div>
  </section>

  <section class="closing" aria-labelledby="closing-title">
    <img class="closing-bg" src="{r}assets/img/ring-fist.webp" alt="" width="941" height="530" loading="lazy">
    <div class="closing-inner">
      <h2 class="closing-title" id="closing-title"><span>בחר את המסלול שלך.</span><span>תתחייב לעצמך.</span></h2>
      <p>הצעד הראשון מתחיל בשיחה. שולחים לי הודעה, ונקבע אימון ניסיון.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{wa(msg)}" target="_blank" rel="noopener" data-cta="area-closing">{WA_ICON}לתיאום אימון ניסיון</a>
      </div>
    </div>
  </section>
"""
    return page(r, f'אגרוף תאילנדי ואימון אישי ליד {town} | אביב משה שדמון – AMS', lead, img, ld_html, main_html)


def business_ld():
    """נתוני העסק לגוגל (Local Business). נבנים מכאן כדי שיהיו זהים בכל מקום."""
    base = SITE_URL or ''
    data = {
        '@context': 'https://schema.org',
        '@type': 'SportsActivityLocation',
        'name': 'AMS – Mind & Body Connection | אביב משה שדמון',
        'alternateName': ['AMS', 'אביב שדמון – אגרוף תאילנדי'],
        'description': 'אימון אישי באגרוף תאילנדי (מואי תאי) וקיקבוקס, כושר וחיטוב, תזונת ספורט ועבודה מנטלית, בסטודיו פרטי במזכרת בתיה.',
        'image': (base + '/' if base else '') + 'assets/img/og.jpg',
        'logo': (base + '/' if base else '') + 'assets/brand/logo.svg',
        'telephone': '+972-50-935-9222',
        'address': {'@type': 'PostalAddress', 'streetAddress': 'אורן 21', 'addressLocality': 'מזכרת בתיה', 'addressRegion': 'מחוז המרכז', 'addressCountry': 'IL'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': GEO[0], 'longitude': GEO[1]},
        'hasMap': 'https://www.google.com/maps/search/?api=1&query=%D7%90%D7%95%D7%A8%D7%9F%2021%20%D7%9E%D7%96%D7%9B%D7%A8%D7%AA%20%D7%91%D7%AA%D7%99%D7%94',
        'areaServed': ['מזכרת בתיה'] + [a['town'] for a in AREAS],
        'sameAs': [IG],
        'founder': {'@type': 'Person', 'name': 'אביב משה שדמון', 'jobTitle': 'מאמן אגרוף תאילנדי ומאמן כושר אישי',
                    'knowsAbout': ['אגרוף תאילנדי', 'מואי תאי', 'קיקבוקס', 'אימוני כוח', 'תזונת ספורט', 'נשימות ומדיטציה'],
                    'alumniOf': {'@type': 'EducationalOrganization', 'name': 'מכון וינגייט'}, 'sameAs': [IG]},
        'makesOffer': [{'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s['title'],
                        'url': (base + '/' if base else '') + f'services/{s["slug"]}.html'}} for s in SERVICES],
    }
    if base:
        data['url'] = base + '/'
    return '<!-- BEGIN business-ld -->\n' + ld_json(data) + '<!-- END business-ld -->'


def page_path(fp):
    rel = os.path.relpath(fp, ROOT).replace(os.sep, '/')
    return '' if rel == 'index.html' else ('articles/' if rel == 'articles/index.html' else rel)


def seo_finalize(html, rel):
    """מתג ההשקה: noindex כל עוד אין דומיין; canonical, og:url ותמונת שיתוף מלאה כשיש."""
    html = re.sub(r'\n<link rel="canonical"[^>]*>|\n<meta property="og:url"[^>]*>', '', html)
    if not SITE_URL:
        if '<meta name="robots"' not in html:
            html = html.replace('<meta name="theme-color"', '<meta name="robots" content="noindex">\n<meta name="theme-color"', 1)
        return html
    url = f'{SITE_URL}/{rel}'
    html = re.sub(r'<!-- בסיס בפיתוח[^>]*-->\n<meta name="robots" content="noindex">\n', '', html)
    html = html.replace('<meta property="og:type"', f'<link rel="canonical" href="{url}">\n<meta property="og:url" content="{url}">\n<meta property="og:type"', 1)
    html = re.sub(r'<meta property="og:image" content="(?:\.\./)*([^"]+)">', lambda m: f'<meta property="og:image" content="{SITE_URL}/{m.group(1)}">', html)
    return html


def write_sitemap(paths):
    if not SITE_URL:
        for f in ('sitemap.xml', 'robots.txt'):
            if os.path.exists(os.path.join(ROOT, f)):
                os.remove(os.path.join(ROOT, f))
        return
    urls = ''.join(f'  <url><loc>{SITE_URL}/{p}</loc><lastmod>{DATE}</lastmod></url>\n' for p in paths)
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n')



def booking_btn(where):
    if not BOOKING_URL:
        return ''
    return (f'<a class="btn btn-line" href="{BOOKING_URL}" target="_blank" rel="noopener" data-booking="{where}">'
            '<svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#i-calendar"/></svg>בחירת מועד ביומן</a>')


def guide_band(r='', where='guide'):
    return f"""  <section class="section guide" id="guide" aria-labelledby="guide-title">
    <div class="guide-box">
      <figure class="guide-cover"><img src="{r}assets/img/guide-cover.webp" alt="עמוד השער של המדריך למתחילים" width="600" height="849" loading="lazy"></figure>
      <div class="guide-text">
        <p class="guide-label">מדריך חינם</p>
        <h2 class="h2" id="guide-title">מתחילים מהבית</h2>
        <p>5 תרגילים לבית, נשימה של 2 דקות, ומה לאכול סביב אימון. שולחים לי הודעה, ואני שולח לך את המדריך ב־WhatsApp.</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa(GUIDE_WA)}" target="_blank" rel="noopener" data-cta="{where}">{WA_ICON}לקבלת המדריך ב־WhatsApp</a>
        </div>
        <p class="guide-note">בלי התחייבות. אני שולח אישית, לא רשימת תפוצה.</p>
      </div>
    </div>
  </section>
"""


def about_page():
    r = ''
    gallery = ''.join(f'      <figure><img src="assets/img/{n}" alt="{a}" width="{w}" height="{h}" loading="lazy"></figure>\n' for n, a, w, h in [
        ('ring.webp', 'אביב בזירה מול קהל, ידיים פתוחות לצדדים', 1325, 970),
        ('corner.webp', 'אביב בזירה, ידיים מורמות, עם הצוות בפינה', 941, 532),
        ('ring-back.webp', 'אביב בגב למצלמה בזירה, עם צמה', 941, 640)])
    svc = ''.join(
        f'      <li><a class="more-card" href="services/{o["slug"]}.html"><img src="assets/img/{o["thumb"]}" alt="" width="480" height="360" loading="lazy"><span><b>{o["menu"]}</b><small>{o["sub"]}</small></span></a></li>\n'
        for o in SERVICES)
    ld_html = ld_json({'@context': 'https://schema.org', '@type': 'ProfilePage', 'mainEntity': {
        '@type': 'Person', 'name': 'אביב משה שדמון', 'alternateName': 'Aviv Moshe Shadmon',
        'jobTitle': 'מאמן אגרוף תאילנדי ומאמן כושר אישי', 'image': 'assets/img/coach.webp',
        'knowsAbout': ['אגרוף תאילנדי', 'מואי תאי', 'קיקבוקס', 'אימוני כוח', 'תזונת ספורט', 'נשימות ומדיטציה'],
        'alumniOf': {'@type': 'EducationalOrganization', 'name': 'מכון וינגייט'},
        'workLocation': {'@type': 'Place', 'name': 'AMS – סטודיו פרטי', 'address': 'אורן 21, מזכרת בתיה'},
        'sameAs': [IG]}})
    main_html = f"""  <section class="svc-hero" aria-labelledby="svc-title">
    <div class="svc-hero-in">
      <div class="svc-hero-text">
{crumbs(r, [('מי אני', '')])}
        <h1 class="svc-title" id="svc-title">נעים להכיר, אני אביב</h1>
        <p class="svc-tagline">מאמן גוף ונפש</p>
        <p class="svc-lead">אני מלווה אנשים בתהליך שבו הלחימה היא הדרך: אגרוף תאילנדי, כוח, תזונה ועבודה מנטלית. המטרה שלי היא לאמן לא רק את הגוף, אלא גם את הנשמה והתודעה.</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa('היי אביב, אשמח לתאם אימון ניסיון')}" target="_blank" rel="noopener" data-cta="about-hero">{WA_ICON}לתיאום אימון ניסיון</a>
          {booking_btn('about-hero')}
        </div>
      </div>
      <figure class="svc-hero-img">
        <img src="assets/img/coach.webp" alt="אביב שדמון עם כריות אימון, מסביר למתאמן" width="1086" height="1358" style="object-position:55% 30%" fetchpriority="high">
      </figure>
    </div>
  </section>

  <article class="section about-story" aria-labelledby="story-title">
    <div class="prose about-prose">
      <h2 id="story-title">איך הכל התחיל</h2>
      <p>לפני כעשור התאהבתי באומנויות הלחימה. מה שהתחיל כאימון הפך לדרך: התאמנתי, למדתי, ועליתי שלב אחרי שלב. עם הזמן הבנתי שהדבר שהכי מעניין אותי הוא לא רק להשתפר בעצמי, אלא לעזור לאנשים אחרים לעבור את הדרך הזאת.</p>
      <h2>בנגקוק</h2>
      <p>התאמנתי במחנה אימונים בבנגקוק, תאילנד, בבית של המואי תאי. שם הבנתי מקרוב את הקושי האמיתי שבתהליך של להיות טוב יותר, ואת הכבוד שהספורט הזה דורש. את מה שלמדתי שם אני מביא לכל אימון, בקצב שמתאים לכל מתאמן.</p>
      <blockquote class="pull"><p>המטרה שלי היא לאמן לא רק את הגוף, אלא גם את הנשמה והתודעה.</p></blockquote>
      <h2>הגישה שלי</h2>
      <p>כל אדם מגיע עם מטרה, ניסיון וקצב משלו. אני משלב אימון פיזי מדויק עם נשימה נכונה, תנועה ועבודה מנטלית, ובונה לכל מתאמן תוכנית שמתחברת לגוף, לשגרה ולאופי שלו. אני דוחף, אבל שומר על הגוף. ואני לא מוותר, גם כשנדמה לך שנגמר לך.</p>
      <h2>הכשרות וניסיון</h2>
      <ul class="checks">
        <li>הכשרה מקצועית במכון וינגייט</li>
        <li>מדריך מוסמך בכושר ובאמנויות לחימה</li>
        <li>הכשרה בתזונת ספורט</li>
        <li>מחנה אימונים בבנגקוק, תאילנד</li>
        <li>ניסיון בהדרכת ילדים בבתי ספר</li>
        <li>יותר מ־10 שנות ניסיון</li>
      </ul>
    </div>
  </article>

  <section class="section about-gallery" aria-labelledby="gallery-title">
    <h2 class="h2" id="gallery-title">מהזירה</h2>
    <div class="gallery">
{gallery}    </div>
  </section>

  <section class="section reviews svc-reviews" aria-labelledby="reviews-title">
    <h2 class="h2" id="reviews-title">מה המתאמנים כותבים לי</h2>
    <div class="reviews-grid">
{review_card('t2', r)}{review_card('t5', r)}    </div>
  </section>

  <section class="section more" aria-labelledby="svc-list-title">
    <h2 class="h2" id="svc-list-title">במה אני יכול לעזור לך</h2>
    <ul class="more-grid area-svcs">
{svc}    </ul>
  </section>

  <section class="closing" aria-labelledby="closing-title">
    <img class="closing-bg" src="assets/img/ready.webp" alt="" width="941" height="1672" loading="lazy">
    <div class="closing-inner">
      <h2 class="closing-title" id="closing-title"><span>בחר את המסלול שלך.</span><span>תתחייב לעצמך.</span></h2>
      <p>הצעד הראשון מתחיל בשיחה. שולחים לי הודעה, ונקבע אימון ניסיון.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{wa('היי אביב, אשמח לתאם אימון ניסיון')}" target="_blank" rel="noopener" data-cta="about-closing">{WA_ICON}לתיאום אימון ניסיון</a>
        {booking_btn('about-closing')}
      </div>
    </div>
  </section>
"""
    return page(r, 'אביב משה שדמון – מאמן אגרוף תאילנדי ומאמן כושר אישי | AMS',
                'נעים להכיר: אביב משה שדמון, מאמן גוף ונפש. הכשרה בווינגייט, מחנה אימונים בבנגקוק ויותר מ־10 שנות ניסיון באגרוף תאילנדי, כושר ותזונת ספורט.',
                'assets/img/og.jpg', ld_html, main_html)


def trial_page():
    """דף נחיתה לפרסום ולביו באינסטגרם: מטרה אחת, בלי תפריט. לא נכנס לגוגל."""
    r = ''
    msg = 'היי אביב, הגעתי מהדף של אימון הניסיון ואשמח לתאם'
    steps = ''.join(f'      <li>\n        <h3>{k}</h3>\n        <p>{v}</p>\n      </li>\n' for k, v in [
        ('שיחה קצרה', 'על המטרה, הניסיון ופציעות שחשוב לי לדעת.'),
        ('חימום', 'מכינים את הגוף ומעלים דופק בהדרגה.'),
        ('טכניקה', 'עמידה, שמירה, אגרופים ובעיטה.'),
        ('כריות', 'אני מחזיק, ואתה עובד בקצב שלך.')])
    faq = [('אני לא בכושר. זה מתאים לי?', 'כן. לא צריך להיות בכושר כדי להתחיל, מתחילים כדי להיכנס לכושר. אני מתאים את הקצב והעוצמה אליך מהדקה הראשונה.'),
           ('כמה זמן נמשך האימון?', '45 דקות.'),
           ('איפה?', 'בסטודיו הפרטי שלי, אורן 21 במזכרת בתיה. כ־5 דקות מקריית עקרון וכ־15 מרחובות וגדרה.'),
           ('כמה זה עולה?', 'שולחים לי הודעה ב־WhatsApp, ואני שולח את כל האפשרויות, בלי התחייבות.'),
           ('מה להביא?', 'בגדי ספורט נוחים, מים ומגבת. את שאר הציוד נתאים לפי סוג האימון.')]
    faq_html = ''.join(f'      <details>\n        <summary>{q}</summary>\n        <p>{x}</p>\n      </details>\n' for q, x in faq)
    head_html = head('אימון ניסיון באגרוף תאילנדי, 45 דקות, במזכרת בתיה | AMS',
                     'אימון ניסיון אישי באגרוף תאילנדי עם אביב משה שדמון: 45 דקות, אחד על אחד, בסטודיו פרטי במזכרת בתיה. גם בלי ניסיון וגם בלי כושר.',
                     r, 'assets/img/og.jpg')
    return f"""{head_html}
<body class="is-inner is-lp">
<a class="skip" href="#main">דלג לתוכן</a>
<header class="site-header" data-header>
  <span class="brand"><img src="assets/brand/ams.svg" alt="AMS – Mind &amp; Body Connection" width="420" height="126"></span>
  <div class="header-actions">
    <a class="header-cta" href="{wa(msg)}" target="_blank" rel="noopener" data-cta="lp-header">{WA_ICON}<span>אימון ניסיון</span></a>
  </div>
</header>

<main id="main">
  <section class="svc-hero" aria-labelledby="svc-title">
    <div class="svc-hero-in">
      <div class="svc-hero-text">
        <p class="svc-flag">אימון ניסיון</p>
        <h1 class="svc-title" id="svc-title">45 דקות שיראו לך מה אתה מסוגל</h1>
        <p class="svc-lead">אימון ניסיון אישי באגרוף תאילנדי, אחד על אחד, בסטודיו פרטי במזכרת בתיה. גם אם אף פעם לא התאמנת, וגם אם אתה לא בכושר.</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa(msg)}" target="_blank" rel="noopener" data-cta="lp-hero">{WA_ICON}לתיאום אימון ניסיון</a>
          {booking_btn('lp-hero')}
        </div>
        <ul class="assure" aria-label="מה חשוב לדעת">
          <li>בלי התחייבות</li>
          <li>גם למתחילים</li>
          <li>אני עונה אישית</li>
        </ul>
      </div>
      <figure class="svc-hero-img">
        <img src="assets/img/muaythai.webp" alt="אביב שדמון בעמידת שמירה עם כפפות אגרוף" width="900" height="1125" style="object-position:50% 30%" fetchpriority="high">
      </figure>
    </div>
  </section>

  <section class="section" aria-labelledby="steps-title">
    <h2 class="h2" id="steps-title">מה קורה באימון</h2>
    <ol class="steps svc-steps">
{steps}    </ol>
  </section>

  <section class="section reviews svc-reviews" aria-labelledby="reviews-title">
    <h2 class="h2" id="reviews-title">מה המתאמנים כותבים לי</h2>
    <div class="reviews-grid">
{review_card('t2', r)}{review_card('t3', r)}{review_card('t1', r)}    </div>
  </section>

  <section class="section trainer" aria-labelledby="trainer-title">
    <figure class="trainer-photo">
      <img src="assets/img/coach.webp" alt="אביב משה שדמון עם כריות אימון" width="1086" height="1358" loading="lazy">
    </figure>
    <div class="trainer-body">
      <p class="trainer-label">מי יאמן אותך</p>
      <h2 class="h2" id="trainer-title">אביב משה שדמון</h2>
      <p>מאמן גוף ונפש, עם יותר מ־10 שנות ניסיון באגרוף תאילנדי, כוח ותזונת ספורט. הכשרה מקצועית בווינגייט ומחנה אימונים בבנגקוק.</p>
    </div>
  </section>

  <section class="section faq" aria-labelledby="faq-title">
    <h2 class="h2" id="faq-title">שאלות לפני שמתחילים</h2>
    <div class="faq-list">
{faq_html}    </div>
  </section>

  <section class="closing" aria-labelledby="closing-title">
    <img class="closing-bg" src="assets/img/ring-fist.webp" alt="" width="941" height="530" loading="lazy">
    <div class="closing-inner">
      <h2 class="closing-title" id="closing-title"><span>מוכן לעשות שינוי?</span></h2>
      <p>שולחים הודעה, ואני חוזר אליך אישית לקביעת מועד.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{wa(msg)}" target="_blank" rel="noopener" data-cta="lp-closing">{WA_ICON}לתיאום אימון ניסיון</a>
        {booking_btn('lp-closing')}
      </div>
      <p class="lp-alt">עוד לא מוכן? <a href="{wa(GUIDE_WA)}" target="_blank" rel="noopener" data-cta="lp-guide">קבל בחינם את המדריך למתחילים</a></p>
    </div>
  </section>
</main>

<footer class="site-footer lp-footer">
  <p class="footer-copy">AMS · אביב משה שדמון · אורן 21, מזכרת בתיה · <a href="index.html">לאתר המלא</a></p>
</footer>
<a class="sticky-cta" href="{wa(msg)}" target="_blank" rel="noopener" data-cta="lp-sticky">
  {WA_ICON}
  לתיאום אימון ניסיון
</a>

{SPRITE}

<script src="js/ams.js" defer></script>
</body>
</html>
"""


def notfound_page():
    """דף שגיאה 404. מוגש מכל עומק בכתובת, ולכן כל הנתיבים מתחילים מ-/ (שורש הדומיין)."""
    r = '/'
    main_html = f"""  <section class="svc-hero nf" aria-labelledby="svc-title">
    <div class="art-head">
      <p class="nf-code">404</p>
      <h1 class="svc-title" id="svc-title">הדף הזה לא בזירה</h1>
      <p class="svc-lead">יכול להיות שהקישור שבור, או שהדף עבר מקום. אבל אפשר להמשיך מכאן:</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{wa('היי אביב, אשמח לתאם אימון ניסיון')}" target="_blank" rel="noopener" data-cta="404">{WA_ICON}לתיאום אימון ניסיון</a>
        <a class="btn btn-line" href="/">לדף הבית</a>
      </div>
    </div>
  </section>

  <section class="section more" aria-labelledby="svc-list-title">
    <h2 class="h2" id="svc-list-title">אולי חיפשת</h2>
    <ul class="more-grid area-svcs">
""" + ''.join(
        f'      <li><a class="more-card" href="/services/{o["slug"]}.html"><img src="/assets/img/{o["thumb"]}" alt="" width="480" height="360" loading="lazy"><span><b>{o["menu"]}</b><small>{o["sub"]}</small></span></a></li>\n'
        for o in SERVICES) + """    </ul>
  </section>
"""
    return page(r, 'הדף לא נמצא | AMS', 'הדף לא נמצא באתר של אביב משה שדמון – AMS.', 'assets/img/og.jpg', '', main_html)


def home_articles():
    cards = article_cards(ARTICLES[:3], '')
    return f"""<!-- BEGIN articles -->
  <section class="section" id="articles" aria-labelledby="articles-title">
    <div class="services-head">
      <h2 class="h2" id="articles-title">מאמרים</h2>
      <a class="btn btn-line" href="articles/index.html">לכל המאמרים</a>
    </div>
    <ul class="more-grid art-grid">
{cards}    </ul>
  </section>
<!-- END articles -->"""


def main():
    written = []

    def write(fp, html, index=True):
        rel = page_path(fp)
        html = add_srcset(html)
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(seo_finalize(html, rel) if index else html)
        if index:
            written.append(rel)

    for sub in ('services', 'articles', 'areas'):
        os.makedirs(os.path.join(ROOT, sub), exist_ok=True)
    p = os.path.join(ROOT, 'index.html')
    html = open(p, encoding='utf-8').read()
    html = re.sub(r'<!-- BEGIN header -->.*?<!-- END header -->', lambda m: header(''), html, flags=re.S)
    html = re.sub(r'<!-- BEGIN footer -->.*?<!-- END footer -->', lambda m: footer(''), html, flags=re.S)
    html = re.sub(r'<!-- BEGIN sprite -->.*?<!-- END sprite -->',
                  lambda m: '<!-- BEGIN sprite -->\n' + SPRITE + '\n<!-- END sprite -->', html, flags=re.S)
    html = re.sub(r'<!-- BEGIN reviews -->.*?<!-- END reviews -->', lambda m: home_reviews(), html, flags=re.S)
    html = re.sub(r'<!-- BEGIN articles -->.*?<!-- END articles -->', lambda m: home_articles(), html, flags=re.S)
    html = re.sub(r'<!-- BEGIN guide -->.*?<!-- END guide -->', lambda m: '<!-- BEGIN guide -->\n' + guide_band('', 'home-guide') + '<!-- END guide -->', html, flags=re.S)
    html = re.sub(r'<!-- BEGIN booking-closing -->.*?<!-- END booking-closing -->', lambda m: '<!-- BEGIN booking-closing -->' + booking_btn('closing') + '<!-- END booking-closing -->', html, flags=re.S)
    if '<!-- BEGIN faq-ld -->' in html:
        html = re.sub(r'<!-- BEGIN faq-ld -->.*?<!-- END faq-ld -->', lambda m: home_faq_ld(html), html, flags=re.S)
    else:
        html = html.replace('</head>', home_faq_ld(html) + '\n</head>', 1)
    html = re.sub(r'<!-- BEGIN business-ld -->.*?<!-- END business-ld -->', lambda m: business_ld(), html, flags=re.S)
    if not SITE_URL and '<meta name="robots"' not in html:   # חזרה למצב פיתוח
        html = html.replace('<meta name="theme-color"', '<!-- בסיס בפיתוח: להסיר את noindex כשהאתר עולה לדומיין של AMS -->\n<meta name="robots" content="noindex">\n<meta name="theme-color"', 1)
    write(p, html)
    for s in SERVICES:
        write(os.path.join(ROOT, 'services', s['slug'] + '.html'), service_page(s))
    write(os.path.join(ROOT, 'articles', 'index.html'), articles_index())
    write(os.path.join(ROOT, 'about.html'), about_page())
    write(os.path.join(ROOT, 'trial.html'), trial_page(), index=False)
    write(os.path.join(ROOT, '404.html'), notfound_page(), index=False)
    for sub, items, fn in (('articles', ARTICLES, article_page), ('areas', AREAS, area_page)):
        for x in items:
            write(os.path.join(ROOT, sub, x['slug'] + '.html'), fn(x))
    write_sitemap(written)
    print('built', len(written), 'pages:', len(SERVICES), 'services,', len(ARTICLES), 'articles,', len(AREAS), 'areas',
          '| SITE_URL =', SITE_URL or '(none – noindex)')


if __name__ == '__main__':
    main()
