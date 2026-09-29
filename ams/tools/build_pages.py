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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PHONE = '972509359222'
IG = 'https://www.instagram.com/aviv_shadmon/'


def wa(text):
    return f'https://wa.me/{PHONE}?text={quote(text)}'


SERVICES = [
    {
        'slug': 'muay-thai', 'menu': 'אגרוף תאילנדי', 'sub': 'טכניקה, כוח וביטחון עצמי',
        'thumb': 'svc-muaythai.webp', 'hero': 'assets/hero/poster.webp', 'hero_wh': (1280, 1280), 'hero_pos': '50% 30%',
        'title': 'אגרוף תאילנדי באימון אישי',
        'lead': 'אימון אישי במואי תאי וקיקבוקס: טכניקה, כוח, כושר וביטחון עצמי, בקצב שמתאים לך. למתחילים ולמתקדמים.',
        'intro_h': 'יותר מאימון כושר',
        'intro': ['אגרוף תאילנדי מחזק את הגוף, מלמד טכניקה ושליטה, ומשחרר מתחים. כל אימון מותאם לרמה, למטרה ולקצב שלך, כבר מהמפגש הראשון.',
                  'אפשר לשלב באימון גם אימוני כוח ומשקל גוף, ולהוסיף ליווי תזונתי כשרוצים לדייק את התוצאה.'],
        'facts': [('מסגרת', 'אחד על אחד, בזוג או בקבוצה קטנה של עד ארבעה'), ('רמה', 'מתחילים ומתקדמים'),
                  ('מיקום', 'סטודיו במזכרת בתיה, בבית שלך, בחדר כושר או בחוץ')],
        'inc_h': 'מה כולל האימון',
        'inc': [('טכניקת מואי תאי', 'אגרופים, בעיטות, ברכיים ומרפקים, עמידה ושמירה נכונה.'),
                ('עבודה על מיטים', 'תרגול מול המאמן, בקצב ובעוצמה שמתאימים לך.'),
                ('כושר וסיבולת', 'אימון שבונה אנרגיה, נשימה ויכולת להחזיק מאמץ.'),
                ('כוח ומשקל גוף', 'תרגילי כוח שמשלימים את עבודת הלחימה.'),
                ('קואורדינציה וזריזות', 'תנועה, עבודת רגליים ותזמון.'),
                ('שחרור מתחים', 'אימון שמוציא לחץ ומחזיר אנרגיה.'),
                ('ביטחון עצמי', 'התקדמות שמרגישים גם מחוץ לאימון.'),
                ('התאמה אישית מלאה', 'תוכנית לפי המטרה, הרמה והשגרה שלך.')],
        'steps': [('שיחת היכרות', 'מבינים את נקודת הפתיחה, המטרה והזמינות שלך.'),
                  ('אימון ראשון', 'לומדים את הבסיס: עמידה, שמירה ותנועה, ובודקים התאמה.'),
                  ('תוכנית אישית', 'קובעים תדירות, מיקום ומסגרת, ובונים תוכנית.'),
                  ('מתקדמים', 'כל אימון ממשיך את הקודם, עם מעקב ודיוק לאורך הדרך.')],
        'faq': [('האימונים מתאימים למתחילים?', 'כן. הרבה מתאמנים מתחילים בלי שום ניסיון קודם. כל אימון מותאם לרמת הכושר ולקצב ההתקדמות, כבר מהמפגש הראשון.'),
                ('מה להביא לאימון הראשון?', 'בגדי ספורט נוחים, מים, מגבת ורצון להתחיל. את שאר הציוד מתאימים לפי סוג האימון.'),
                ('אפשר לשלב אימוני לחימה ואימוני כוח?', 'כן. התוכנית יכולה לשלב מואי תאי, קיקבוקס, אימוני כוח ומשקל גוף, לפי המטרה האישית.'),
                ('אפשר להתאמן בזוג או עם חברים?', 'כן. אפשר להתאמן בזוג או בקבוצה קטנה של עד ארבעה משתתפים. את המסגרת בוחרים בשיחת ההיכרות.')],
        'cta_h': 'רוצה להתחיל להתאמן?', 'cta_p': 'שולחים הודעה, קובעים שיחת היכרות ואימון ראשון.',
        'wa': 'היי אביב, אשמח לשמוע על אימון אישי באגרוף תאילנדי',
    },
    {
        'slug': 'sports-nutrition', 'menu': 'תזונת ספורט ותפריטים', 'sub': 'ייעוץ ותפריט אישי לפי המטרה',
        'thumb': 'svc-nutrition.webp', 'hero': 'assets/img/nutrition-consult.webp', 'hero_wh': (1600, 1195), 'hero_pos': '50% 50%',
        'title': 'ייעוץ תזונת ספורט ותפריטים',
        'lead': 'תזונה היא חצי מהאימון. ייעוץ מקצועי ותפריט אישי שנבנים סביב המטרה, האימונים והשגרה שלך, כדי להתחזק, להתאושש ולהתקדם.',
        'intro_h': 'תזונה שמתחברת לחיים שלך',
        'intro': ['תזונה מדויקת נותנת לגוף את האנרגיה להתחזק, להתאושש ולהתקדם. התהליך נבנה אישית לפי המטרה, שגרת החיים ומערך האימונים שלך.',
                  'זה שירות עצמאי: אפשר לקבל ייעוץ ותפריט בלי אימונים, או לשלב אותם במסלול אגרוף + תזונה.'],
        'facts': [('מתאים ל', 'ירידה בשומן, בניית מסת שריר, שיפור ביצועים ושגרה מאוזנת'),
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
                  ('לומדים את השגרה שלך', 'הרגלי אכילה, שעות עבודה, זמני אימונים והאתגרים של היום־יום.'),
                  ('בונים תפריט אישי', 'ארוחות מסודרות, כמויות, חלופות וגמישות לסופי שבוע.'),
                  ('עוקבים ומדייקים', 'מעקב קבוע, מדידות ועדכון התפריט לפי ההתקדמות והשינויים בשגרה.')],
        'faq': [('אפשר לקבל רק ייעוץ תזונה ותפריט, בלי אימונים?', 'כן. ייעוץ תזונת ספורט ותפריט אישי הם שירות עצמאי. אפשר לקבל אותם בנפרד, או לשלב אותם עם אימונים במסלול אגרוף + תזונה.'),
                ('התפריט מתאים גם לאוכל שאני אוהב?', 'כן. בתחילת התהליך לומדים את הרגלי האכילה והטעם שלך, והתפריט כולל חלופות וגמישות לסופי שבוע.'),
                ('התפריט משתנה לאורך הזמן?', 'כן. יש מעקב ומדידות שוטפות, והתפריט מתעדכן לפי ההתקדמות והשינויים בשגרה.')],
        'cta_h': 'רוצה תפריט שעובד בשבילך?', 'cta_p': 'שולחים הודעה ומתחילים בשיחת היכרות קצרה.',
        'wa': 'היי אביב, אשמח לייעוץ תזונת ספורט ותפריט אישי',
    },
    {
        'slug': 'boxing-nutrition', 'menu': 'אגרוף + תזונה', 'sub': 'מסלול הדגל: אימון שבועי ותפריט חודשי', 'flag': 'מסלול הדגל',
        'thumb': 'svc-flagship.webp', 'hero': 'assets/img/flagship.webp', 'hero_wh': (2000, 1131), 'hero_pos': '30% 50%',
        'title': 'אגרוף + תזונה',
        'lead': 'חודש של תנועה, תזונה והתקדמות. ייעוץ תזונה ותפריט חודשי, יחד עם אימון אגרוף שבועי ובליווי אישי מלא.',
        'intro_h': 'שילוב מנצח של אימון ותזונה',
        'intro': ['האימון בונה כוח, כושר וביטחון, והתזונה נותנת לגוף את מה שהוא צריך כדי להתחזק ולהתאושש. כשהשניים עובדים יחד, השינוי מורגש יותר.',
                  'זה המסלול למי שרוצה ליווי מלא: שינוי פנימי שמוביל לשינוי חיצוני.'],
        'facts': [('אימונים', 'אימון אגרוף אישי אחד בשבוע'), ('תזונה', 'ייעוץ תזונה ותפריט חודשי'), ('ליווי', 'אישי מלא, 360°')],
        'inc_h': 'מה כולל המסלול',
        'inc': [('אימון אגרוף שבועי', 'אימון אישי במואי תאי, מותאם לרמה ולמטרה.'),
                ('ייעוץ תזונה', 'שיחת ייעוץ והתאמה של התזונה לאימונים.'),
                ('תפריט חודשי', 'תפריט אישי עם כמויות וחלופות.'),
                ('מעקב שוטף', 'מעקב אחרי ההתקדמות באימונים ובתזונה.'),
                ('עבודה מנטלית', 'נשימה, ריכוז ומשמעת כחלק מהתהליך.'),
                ('ליווי 360°', 'ליווי ודיוק לאורך כל החודש.')],
        'steps': [('שיחת היכרות', 'מגדירים מטרה ונקודת פתיחה.'),
                  ('תפריט ותוכנית', 'בונים תפריט חודשי ותוכנית אימונים.'),
                  ('אימון שבועי', 'נפגשים לאימון, עוקבים ומדייקים.'),
                  ('סיכום והמשך', 'בודקים מה השתנה ומחליטים יחד על ההמשך.')],
        'faq': [('למי מתאים המסלול?', 'למי שרוצה לראות שינוי בגוף ובהרגלים, ורוצה ליווי מלא ולא רק אימון או רק תפריט.'),
                ('המסלול מתאים למתחילים?', 'כן. האימונים והתפריט מותאמים לרמה ולנקודת הפתיחה שלך.')],
        'cta_h': 'רוצה ליווי מלא?', 'cta_p': 'שולחים הודעה, ומתחילים בשיחת היכרות קצרה.',
        'wa': 'היי אביב, אשמח לשמוע על המסלול המשולב אגרוף + תזונה',
    },
    {
        'slug': 'talks', 'menu': 'הרצאות וסדנאות', 'sub': 'לקבוצות, חברות, בתי ספר וארגונים',
        'thumb': 'svc-talks.webp', 'hero': 'assets/img/talks.webp', 'hero_wh': (1600, 1195), 'hero_pos': '50% 40%',
        'title': 'הרצאות וסדנאות',
        'lead': 'הרצאות לקבוצות, חברות, בתי ספר וארגונים, על הקשר בין גוף, תזונה ותודעה. מה שלמדתי בזירה, באימונים ובתאילנד, מותאם לקהל ולמטרה.',
        'intro_h': 'מהזירה אל הקהל',
        'intro': ['ההרצאות עוסקות בקשר בין גוף, תזונה ותודעה: איך לבנות משמעת, להתמודד עם לחץ ולשמור על אנרגיה, מתוך הניסיון באימונים, בלחימה ובתאילנד.',
                  'אפשר לשלב חלק מעשי: אימון התנסות קצר באגרוף תאילנדי לכל המשתתפים.'],
        'facts': [('קהל', 'קבוצות, חברות, בתי ספר וארגונים'), ('פורמט', 'הרצאה, או סדנה עם חלק מעשי'),
                  ('ניסיון', 'הדרכת ילדים בבתי ספר ואימונים בתאילנד')],
        'inc_h': 'נושאי ההרצאות',
        'inc': [('תזונת ספורט', 'איך לאכול כדי להתחזק, להתאושש ולהתקדם, בלי דיאטות קיצוניות.'),
                ('משמעת עצמית וחוסן מנטלי', 'מה אומנויות לחימה מלמדות על התמדה, ריכוז ושליטה עצמית, ואיך לקחת את זה ליום־יום.'),
                ('גוף ונפש', 'נשימה, תנועה ועבודה מנטלית ככלים לאיזון פנימי ולהתמודדות עם לחץ.'),
                ('חלק מעשי', 'אימון התנסות קצר באגרוף תאילנדי לכל המשתתפים.')],
        'steps': [('שיחת תיאום', 'מבינים מי הקהל, מה המטרה ומה המסגרת.'),
                  ('התאמת התוכן', 'בוחרים נושאים ומתאימים אותם לקהל.'),
                  ('ההרצאה', 'הרצאה חיה, עם דוגמאות מהזירה ומהאימונים.'),
                  ('חלק מעשי', 'לפי הבחירה, אימון התנסות קצר לכל המשתתפים.')],
        'faq': [('אפשר להוסיף חלק מעשי?', 'כן. אפשר לשלב אימון התנסות קצר באגרוף תאילנדי לכל המשתתפים.'),
                ('למי ההרצאות מתאימות?', 'לקבוצות, חברות, בתי ספר וארגונים. התוכן מותאם לקהל ולמטרה.')],
        'cta_h': 'מתכננים הרצאה או סדנה?', 'cta_p': 'שולחים הודעה עם כמה פרטים על הקהל, ונתאם יחד.',
        'wa': 'היי אביב, אשמח לשמוע על הרצאה',
    },
    {
        'slug': 'kids', 'menu': 'אימוני ילדים', 'sub': 'משמעת, כבוד וביטחון עצמי',
        'thumb': 'svc-kids.webp', 'hero': 'assets/img/kids.webp', 'hero_wh': (1600, 1195), 'hero_pos': '50% 50%',
        'title': 'אימוני ילדים',
        'lead': 'מסגרת מקצועית ומהנה שמפתחת משמעת, כבוד, ביטחון עצמי וחוסן מנטלי. מותאם לגיל ולרמה.',
        'intro_h': 'יותר מספורט',
        'intro': ['אומנויות לחימה מלמדות ילדים להקשיב, להתמיד ולכבד, את עצמם ואת האחרים. האימון בנוי כך שכל ילד מתקדם בקצב שלו ומרגיש הצלחה.',
                  'לאביב ניסיון בהדרכת ילדים בבתי ספר, ומסגרת בטוחה ומהנה היא חלק מהגישה שלו.'],
        'facts': [('התאמה', 'לגיל ולרמה'), ('דגש', 'משמעת, כבוד, ביטחון וחוסן'), ('ניסיון', 'הדרכת ילדים בבתי ספר')],
        'inc_h': 'מה הילדים מקבלים',
        'inc': [('משמעת', 'הקשבה, התמדה ועמידה במשימות.'),
                ('כבוד', 'לעצמם, לחברים ולמאמן.'),
                ('ביטחון עצמי', 'הצלחות קטנות שמצטברות לתחושת מסוגלות.'),
                ('חוסן מנטלי', 'התמודדות עם קושי ותסכול.'),
                ('כושר ותנועה', 'קואורדינציה, זריזות ואנרגיה בריאה.'),
                ('הנאה', 'אימון מהנה שהילדים מחכים לו.')],
        'steps': [('שיחה עם ההורים', 'מכירים את הילד, את המטרות ואת המסגרת המתאימה.'),
                  ('אימון ראשון', 'היכרות, הסבר על הכללים ובדיקת התאמה.'),
                  ('התקדמות', 'מסגרת קבועה שבה כל ילד מתקדם בקצב שלו.')],
        'faq': [('זה לא מעודד אלימות?', 'להפך. הדגש הוא על משמעת, כבוד ושליטה עצמית, והכוח נשאר בתוך האימון.'),
                ('הילד צריך ניסיון קודם?', 'לא. האימון מותאם לגיל ולרמה, גם למי שמתחיל מאפס.')],
        'cta_h': 'רוצים לשמוע על אימוני ילדים?', 'cta_p': 'שולחים הודעה ומספרים קצת על הילד.',
        'wa': 'היי אביב, אשמח לשמוע על אימוני ילדים',
    },
    {
        'slug': 'body-mind', 'menu': 'גוף ותודעה', 'sub': 'נשימה, מדיטציה ועבודה מנטלית',
        'thumb': 'svc-mind.webp', 'hero': 'assets/img/body-mind.webp', 'hero_wh': (1600, 1195), 'hero_pos': '50% 50%',
        'title': 'גוף ותודעה',
        'lead': 'תהליך שמשלב נשימות, מדיטציה, תנועה ועבודה מנטלית, לפיתוח ריכוז, איזון פנימי וחוסן.',
        'intro_h': 'לאמן גם את הראש',
        'intro': ['המטרה היא לאמן לא רק את הגוף, אלא גם את הנשמה והתודעה. נשימה נכונה, תנועה ועבודה מנטלית עוזרות להתמודד עם לחץ, להתרכז ולמצוא שקט.',
                  'אפשר לעבוד על גוף ותודעה כתהליך בפני עצמו, או לשלב אותו באימוני הלחימה.'],
        'facts': [('כלים', 'נשימות, מדיטציה, תנועה ועבודה מנטלית'), ('מטרה', 'ריכוז, איזון פנימי וחוסן'),
                  ('שילוב', 'כתהליך נפרד או כחלק מהאימונים')],
        'inc_h': 'מה כולל התהליך',
        'inc': [('נשימות', 'טכניקות נשימה לוויסות, לריכוז ולשחרור.'),
                ('מדיטציה', 'תרגול שקט שמחזק את הקשב והנוכחות.'),
                ('תנועה', 'תנועה מודעת שמחברת בין הגוף לראש.'),
                ('עבודה מנטלית', 'משמעת עצמית, התמדה והתמודדות עם לחץ.')],
        'steps': [('שיחת היכרות', 'מבינים מה מעסיק אותך ומה המטרה.'),
                  ('בניית תהליך', 'בוחרים כלים ומסגרת שמתאימים לך.'),
                  ('תרגול והעמקה', 'מתרגלים, מדייקים ומעמיקים לאורך הזמן.')],
        'faq': [('צריך ניסיון במדיטציה?', 'לא. מתחילים מהבסיס ומתקדמים בקצב שלך.'),
                ('אפשר לשלב עם אימוני אגרוף?', 'כן. הנשימה והעבודה המנטלית משתלבות באימונים ומשפרות אותם.')],
        'cta_h': 'רוצה להתחיל תהליך?', 'cta_p': 'שולחים הודעה ומתחילים בשיחת היכרות.',
        'wa': 'היי אביב, אשמח לשמוע על תהליך גוף ותודעה',
    },
]

WA_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg>'
CHEV = '<svg class="menu-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
SPRITE = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z"/></symbol>
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
  <a class="brand" href="{home}" aria-label="AMS – לעמוד הראשי">
    <span class="brand-mark">AMS</span>
    <span class="brand-sub">Mind &amp; Body Connection</span>
  </a>
  <div class="header-actions">
    <a class="header-cta" href="{wa('היי אביב, אשמח לתאם שיחת היכרות')}" target="_blank" rel="noopener">{WA_ICON}<span>שליחת הודעה</span></a>
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
{item('01', home, 'ראשי', 'assets/hero/poster.webp', 'AMS', 'Mind &amp; Body Connection')}{item('02', home + '#coach', 'מי אני', 'assets/img/coach-thailand.webp', 'אביב משה שדמון', 'מאמן גוף ונפש, יותר מ־10 שנות ניסיון')}      <li class="menu-has-sub">
        <button class="menu-item" type="button" aria-expanded="true" aria-controls="menu-sub" data-sub-toggle data-img="{root}assets/img/flagship.webp" data-cap="שירותים" data-sub="שישה שירותים, מטרה אחת">
          <span class="menu-num">03</span><span class="menu-t">שירותים</span>{CHEV}
        </button>
        <div class="menu-sub" id="menu-sub">
{subs}        </div>
      </li>
{item('04', home + '#where', 'איפה מתאמנים', 'assets/img/training-session-duo.webp', 'איפה מתאמנים', 'סטודיו פרטי, בבית, בחדר כושר או בחוץ')}{item('05', home + '#faq', 'שאלות נפוצות', 'assets/img/coach-pads-duo.webp', 'שאלות נפוצות', 'מה כדאי לדעת לפני שמתחילים')}{item('06', home + '#contact', 'יצירת קשר', 'assets/img/coach-pads-duo.webp', 'יצירת קשר', 'שיחת היכרות ב־WhatsApp')}      </ol>
    </nav>
    <aside class="menu-vis" aria-label="יצירת קשר">
      <figure class="menu-fig" aria-hidden="true">
        <img src="{root}assets/img/flagship.webp" alt="" width="2000" height="1131" loading="lazy" data-menu-img>
        <figcaption><b data-menu-cap>שירותים</b><span data-menu-sub>שישה שירותים, מטרה אחת</span></figcaption>
      </figure>
      <a class="btn btn-gold btn-block" href="{wa('היי אביב, אשמח לתאם שיחת היכרות')}" target="_blank" rel="noopener">{WA_ICON}שליחת הודעה ב־WhatsApp</a>
      <p class="menu-foot"><span>אורן 21, מזכרת בתיה</span><a href="{IG}" target="_blank" rel="noopener" dir="ltr">@aviv_shadmon</a></p>
    </aside>
  </div>
</div>
<!-- END header -->'''


def footer(root):
    links = ''.join(f'      <li><a href="{root}services/{s["slug"]}.html">{s["menu"]}</a></li>\n' for s in SERVICES)
    return f'''<!-- BEGIN footer -->
<footer class="site-footer">
  <div class="footer-top">
    <div class="logo logo-sm" role="img" aria-label="AMS – Mind and Body Connection">
      <span class="logo-mark">AMS</span>
      <span class="logo-tag">Mind &amp; Body Connection</span>
    </div>
    <nav class="footer-nav" aria-label="שירותים">
      <p class="footer-h">שירותים</p>
      <ul>
{links}      </ul>
    </nav>
    <div class="footer-contact">
      <p class="footer-h">יצירת קשר</p>
      <ul>
        <li><a href="https://wa.me/{PHONE}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="{IG}" target="_blank" rel="noopener">Instagram</a></li>
        <li>אורן 21, מזכרת בתיה</li>
      </ul>
    </div>
  </div>
  <p class="footer-copy">© <span data-year>2026</span> AMS · אביב משה שדמון</p>
</footer>
<a class="sticky-cta" href="{wa('היי אביב, אשמח לתאם שיחת היכרות')}" target="_blank" rel="noopener">
  {WA_ICON}
  שליחת הודעה לתיאום
</a>
<!-- END footer -->'''


def head(title, desc, root, og):
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,400;125,800&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&family=Karantina:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}css/ams.css">
</head>'''


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
    flag = f'\n      <p class="svc-flag">{s["flag"]}</p>' if s.get('flag') else ''
    w, h = s['hero_wh']
    return f'''{head(f'{s["title"]} | AMS · אביב משה שדמון', s['lead'], r, s['hero'])}
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
        <h1 class="svc-title" id="svc-title">{s['title']}</h1>
        <p class="svc-lead">{s['lead']}</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="{wa(s['wa'])}" target="_blank" rel="noopener">{WA_ICON}לתיאום ב־WhatsApp</a>
          <a class="btn btn-line" href="#includes">מה כולל</a>
        </div>
      </div>
      <figure class="svc-hero-img">
        <img src="{r}{s['hero']}" alt="" width="{w}" height="{h}" style="object-position:{s['hero_pos']}" fetchpriority="high">
      </figure>
    </div>
  </section>

  <section class="section svc-intro" aria-labelledby="intro-title">
    <div class="svc-intro-body">
      <h2 class="h2" id="intro-title">{s['intro_h']}</h2>
{intro}    </div>
    <dl class="svc-facts">
{facts}    </dl>
  </section>

  <section class="section" id="includes" aria-labelledby="inc-title">
    <h2 class="h2" id="inc-title">{s['inc_h']}</h2>
    <ul class="svc-list">
{inc}    </ul>
  </section>

  <section class="section" aria-labelledby="steps-title">
    <h2 class="h2" id="steps-title">איך זה עובד</h2>
    <ol class="steps svc-steps">
{steps}    </ol>
  </section>

  <section class="section faq" aria-labelledby="faq-title">
    <h2 class="h2" id="faq-title">שאלות נפוצות</h2>
    <div class="faq-list">
{faq}    </div>
  </section>

  <section class="closing" aria-labelledby="closing-title">
    <img class="closing-bg" src="{r}{s['hero']}" alt="" width="{w}" height="{h}" loading="lazy">
    <div class="closing-inner">
      <h2 class="closing-title" id="closing-title"><span>{s['cta_h']}</span></h2>
      <p>{s['cta_p']}</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{wa(s['wa'])}" target="_blank" rel="noopener">{WA_ICON}שליחת הודעה ב־WhatsApp</a>
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


def main():
    os.makedirs(os.path.join(ROOT, 'services'), exist_ok=True)
    for s in SERVICES:
        with open(os.path.join(ROOT, 'services', s['slug'] + '.html'), 'w', encoding='utf-8') as f:
            f.write(service_page(s))
    p = os.path.join(ROOT, 'index.html')
    html = open(p, encoding='utf-8').read()
    html = re.sub(r'<!-- BEGIN header -->.*?<!-- END header -->', lambda m: header(''), html, flags=re.S)
    html = re.sub(r'<!-- BEGIN footer -->.*?<!-- END footer -->', lambda m: footer(''), html, flags=re.S)
    open(p, 'w', encoding='utf-8').write(html)
    print('built', len(SERVICES), 'service pages')


if __name__ == '__main__':
    main()
