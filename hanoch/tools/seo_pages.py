# מחולל עמודי השירות (קידום אורגני). מריצים: python3 tools/seo_pages.py
# כל עמוד: תוכן ייחודי, מחירים אמיתיים מהאתר, דוגמאות מהתיק, שאלות נפוצות עם סימון לגוגל, וקישורים פנימיים.
import json, os, html, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = 'https://hgpro.io'
WA = '972545522053'
PROJ = {  # תמונה, שם, תיאור קצר, עוגן בתיק העבודות
    'gotovski': ('work/cinema/gotovski-640.webp', 'ש. גוטובסקי', 'תשתיות דלק מאז 1972', 'S. Gotovski', 'Fuel infrastructure since 1972'),
    'ams': ('work/cinema/ams-640.webp', 'AMS', 'אגרוף תאילנדי ואימון אישי', 'AMS', 'Thai boxing and personal training'),
    'allenbis': ('work/cinema/allenbis-640.webp', 'אלנביס', 'חנות שתייה וחטיפים עם משלוחים', 'Allenbis', 'Drinks and snacks store with delivery'),
    'clinic': ('work/cinema/clinic-640.webp', 'רותם גוטובסקי', 'קליניקה לקוסמטיקה טיפולית, עם חנות', 'Rotem Gotovski', 'Therapeutic cosmetics clinic with a shop'),
    'falafel': ('work/cinema/falafel-640.webp', 'קייטרינג 4X4', 'פלאפל וסביח לאירועים, עם מחשבון הצעת מחיר', '4X4 Catering', 'Falafel catering with a quote builder'),
    'rachel': ('work/cinema/rachel-640.webp', 'רחלי הורנשטיין', 'שיעורי מתמטיקה פרטיים בזום', 'Racheli Hornstein', 'Private math lessons on Zoom'),
}
PROCESS_HE = [('שיחת היכרות', 'מבינים את העסק, את הלקוחות ואת המטרה. בלי התחייבות.'),
              ('הצעה כתובה', 'מחיר סגור ולוח זמנים. מה שכתוב בה הוא מה שמשלמים.'),
              ('עיצוב', 'כיוון עיצובי שנבנה סביב העסק שלכם, לא תבנית מוכנה.'),
              ('פיתוח', 'קוד נקי ומהיר, מותאם לטלפון, לגוגל ולנגישות.'),
              ('עלייה לאוויר', 'דומיין, אחסון מהיר, Search Console ומדידת פניות.'),
              ('ליווי', 'חודש ליווי אחרי העלייה, ואפשרות לחבילת תחזוקה חודשית.')]
PROCESS_EN = [('Intro call', 'We learn the business, the customers and the goal. No commitment.'),
              ('Written proposal', 'A fixed price and a schedule. What it says is what you pay.'),
              ('Design', 'A design direction built around your business, not a template.'),
              ('Build', 'Clean, fast code, ready for mobile, Google and accessibility.'),
              ('Launch', 'Domain, fast hosting, Search Console and lead tracking.'),
              ('Support', 'A month of support after launch, and an optional monthly care plan.')]

P = []
def page(**k): P.append(k)

# ---------------------------------------------------------------- עברית
page(slug='website-building', lang='he', name='בניית אתרים לעסקים',
     title='בניית אתרים לעסקים בעיצוב אישי | HG Studio',
     desc='בניית אתר לעסק מאפס, בלי תבניות: עיצוב אישי, קוד מהיר, התאמה לטלפון וקידום בגוגל. מחיר סגור מראש ואתר באוויר תוך שבועיים.',
     h1='בניית אתרים לעסקים', kicker='שירות · בניית אתרים',
     lead='אתר עסקי טוב הוא לא כרטיס ביקור. הוא איש מכירות שעובד גם בלילה: מסביר מה אתם עושים, משכנע שאתם הבחירה הנכונה, ומביא את הלקוח עד לוואטסאפ. אני בונה כל אתר מאפס, סביב העסק שלכם, עם עיצוב, קוד ותנועה ביד אחת.',
     sections=[('למי זה מתאים', '<ul><li>עסקים קטנים ובינוניים שרוצים אתר שמביא פניות ולא רק "נמצא באינטרנט".</li><li>עסקים עם אתר ישן, איטי או מתבנית, שלא משקף את הרמה שלהם.</li><li>נותני שירות, קליניקות, חנויות, מאמנים ומורים פרטיים.</li></ul>'),
               ('מה מקבלים', '<ul><li>עיצוב אישי לכל עמוד, בלי תבנית שעוד אלף עסקים משתמשים בה.</li><li>התאמה מלאה לטלפון וטעינה מהירה, כי רוב הגולשים מגיעים מהנייד.</li><li>כותרות, תיאורים, סימון עסקי ומפת אתר, כדי שגוגל יבין מה אתם עושים ואיפה.</li><li>וואטסאפ, חיוג וטופס פנייה, עם מדידה של כל לחיצה.</li><li>מערכת ניהול פשוטה לעדכון טקסטים, תמונות ומחירים בעצמכם.</li><li>נגישות ותפריט נגישות כבר מההתחלה.</li></ul>'),
               ('למה לא תבנית', '<p>תבנית חוסכת זמן בהתחלה ועולה ביוקר אחר כך: היא נראית כמו של כולם, טוענת קוד שאתם לא צריכים, וקשה להתאים אותה לאופן שבו העסק שלכם באמת מוכר. אתר שנבנה מאפס מהיר יותר, נראה ייחודי, ובנוי מההתחלה למטרה אחת: להפוך גולש לפנייה.</p>')],
     examples=['gotovski', 'ams', 'rachel'],
     faq=[('כמה זמן לוקחת בניית אתר?', 'עד שבועיים מהשיחה הראשונה ועד שהאתר באוויר. דף נחיתה בדרך כלל מוכן תוך שבוע. כדי לעמוד בלוח הזמנים אני צריך את התוכן והתמונות בהתחלה, ואם אין, אעזור להכין אותם.'),
          ('כמה עולה לבנות אתר לעסק?', 'המחיר נקבע לפי היקף האתר ומה שהעסק צריך. אחרי שיחת היכרות קצרה מקבלים הצעה כתובה עם מחיר סגור, ומה שכתוב בהצעה זה מה שמשלמים.'),
          ('האם אוכל לעדכן את האתר בעצמי?', 'כן. מחבילת עסק ומעלה יש מערכת ניהול פשוטה לעדכון טקסטים, תמונות ומחירים, בלי לגעת בקוד.'),
          ('האתר והדומיין שייכים לי?', 'כן. הדומיין נרשם על שמכם, והאתר והקוד שייכים לכם.')],
     related=['web-design', 'landing-page', 'online-store', 'seo'],
     service=('Website development', 'בניית אתרים'))

page(slug='web-design', lang='he', name='עיצוב אתרים',
     title='עיצוב אתרים בהתאמה אישית ובלי תבניות | HG Studio',
     desc='עיצוב אתרים שנבנה סביב העסק שלכם: שפה עיצובית ייחודית, תנועה, תלת־ממד ונגישות. שישה אתרים, שש שפות עיצוב. ראו את התיק.',
     h1='עיצוב אתרים', kicker='שירות · עיצוב',
     lead='לכל עסק יש אופי, והאתר צריך להרגיש כמוהו. חברת תשתיות דלק לא אמורה להיראות כמו קליניקה, ומאמן אגרוף לא אמור להיראות כמו מורה למתמטיקה. לכן כל אתר שאני מעצב מקבל שפה משלו: גופנים, צבעים, תנועה ואפילו התנהגות של הכפתורים.',
     sections=[('איך נולד עיצוב', '<p>מתחילים מהשאלה מה הלקוח שלכם צריך להרגיש בחמש השניות הראשונות. משם בונים כיוון: מחברת משבצות למורה למתמטיקה, דוכן רחוב לקייטרינג פלאפל, ענפי דובדבן פורחים לקליניקה. העיצוב לא מקשט את התוכן, הוא מספר אותו.</p>'),
               ('מה כולל העיצוב', '<ul><li>כיוון עיצובי ושפה חזותית מלאה: צבעים, גופנים, אייקונים ותמונות.</li><li>עיצוב לטלפון ולמחשב, לא רק "התאמה".</li><li>תנועה ואנימציות גלילה שמכוונות את העין, בלי להאט את האתר.</li><li>תלת־ממד, הדמיות ותמונות ברמת סטודיו בעזרת בינה מלאכותית, כשזה מתאים.</li><li>נגישות: ניגודיות, גדלי טקסט ומיקוד מקלדת כבר בשלב העיצוב.</li></ul>'),
               ('עיצוב שמוכר', '<p>אתר יפה שלא מביא פניות הוא תמונה על הקיר. כל החלטה עיצובית נבחנת מול המטרה: האם ברור מה אתם עושים, האם קל לפנות, והאם יש סיבה לבחור דווקא בכם.</p>')],
     examples=['clinic', 'falafel', 'allenbis'],
     faq=[('האם אתם עובדים עם תבניות?', 'לא. כל אתר מעוצב ונבנה מאפס סביב העסק, כך שאין לו תאום באינטרנט.'),
          ('אני לא יודע מה אני רוצה. זה בסדר?', 'בהחלט. בשיחת ההיכרות נבין יחד את העסק והלקוחות, ואני אציע כיוון. אתם מאשרים לפני שממשיכים.'),
          ('האם העיצוב יעבוד טוב בטלפון?', 'כן. אני מעצב לטלפון ולמחשב במקביל, ובודק על מכשירים אמיתיים לפני העלייה לאוויר.')],
     related=['website-building', 'brand-identity', 'landing-page', 'ai-commercial'],
     service=('Web design', 'עיצוב אתרים'))

page(slug='landing-page', lang='he', name='בניית דף נחיתה',
     title='בניית דף נחיתה שממיר לפניות | HG Studio',
     desc='בניית דף נחיתה לקמפיין, להשקה או לעצמאים: עיצוב אישי, טעינה מהירה, וואטסאפ ומדידת המרות. באוויר תוך שבוע.',
     h1='בניית דף נחיתה', kicker='שירות · דפי נחיתה',
     lead='דף נחיתה עושה דבר אחד, ועושה אותו טוב: לוקח מישהו שלחץ על מודעה או על קישור, ומביא אותו לפנייה. בלי תפריטים שמסיחים את הדעת, בלי עשרה עמודים. מסר אחד ברור, הוכחה שאפשר לסמוך עליכם, וכפתור.',
     sections=[('מתי צריך דף נחיתה', '<ul><li>כשמריצים קמפיין בגוגל, בפייסבוק או באינסטגרם ורוצים שכל שקל יעבוד.</li><li>כשמשיקים מוצר, סדנה או שירות חדש.</li><li>כשאתם עצמאים ורוצים נוכחות מקצועית מהר ובתקציב שפוי.</li></ul>'),
               ('מה יש בדף', '<ul><li>כותרת שאומרת בדיוק מה מקבלים, ולמי.</li><li>עד שישה חלקים: הבעיה, הפתרון, איך זה עובד, הוכחות, שאלות ופנייה.</li><li>וואטסאפ, חיוג וטופס, עם מדידה של כל לחיצה.</li><li>טעינה מהירה, כי כל שנייה של המתנה מורידה פניות.</li><li>תמונת שיתוף ממותגת לוואטסאפ ולפייסבוק.</li></ul>'),
               ('מדידה', '<p>אפשר לחבר פיקסל של מטא, המרות של גוגל ודפי נחיתה נפרדים לכל קמפיין, כדי לדעת בדיוק מה מביא לקוחות. ראו <a href="seo.html">קידום אורגני</a> ותשתית קמפיינים.</p>')],
     examples=['falafel', 'rachel', 'ams'],
     faq=[('תוך כמה זמן הדף באוויר?', 'בדרך כלל תוך שבוע מרגע שיש תוכן ותמונות.'),
          ('אפשר להפוך את הדף לאתר מלא בהמשך?', 'כן. הדף נבנה כך שאפשר להרחיב אותו לאתר מלא בלי להתחיל מאפס.'),
          ('איך יודעים אם הדף עובד?', 'כל לחיצה על וואטסאפ, חיוג וטופס נמדדת, כך שרואים כמה פניות הגיעו ומאיזה מקור.')],
     related=['website-building', 'seo', 'web-design', 'ai-commercial'],
     service=('Landing page', 'בניית דף נחיתה'))

page(slug='online-store', lang='he', name='בניית חנות אינטרנטית',
     title='בניית חנות אינטרנטית עם סליקה ישראלית | HG Studio',
     desc='בניית חנות אונליין: קטלוג, עגלה, משלוחים, קופונים, סליקה באשראי, ביט ו-Apple Pay וחשבוניות אוטומטיות. בעיצוב אישי ובלי תבנית.',
     h1='בניית חנות אינטרנטית', kicker='שירות · מסחר מקוון',
     lead='חנות אונליין טובה מרגישה כמו המדף הכי מסודר בחנות הכי טובה: קל למצוא, קל להבין, וקל לשלם. אני בונה חנויות שמותאמות למוצרים שלכם ולאופן שבו הלקוחות שלכם קונים, עם סליקה ישראלית וחשבוניות אוטומטיות.',
     sections=[('מה יש בחנות', '<ul><li>קטלוג מוצרים עם סינון לפי סוג, מותג או מטרה.</li><li>עגלה, משלוחים, איסוף עצמי וקופונים.</li><li>סליקה באשראי, ביט ו-Apple Pay, דרך ספק הסליקה שלכם.</li><li>קבלה או חשבונית שנשלחת אוטומטית בכל תשלום.</li><li>ניהול מלאי ומחירים בעצמכם.</li></ul>'),
               ('חנות שמוכרת', '<p>מעבר לעגלה ולתשלום, מה שמוכר הוא הדרך שבה המוצר מוצג: תמונות טובות, הסבר קצר למי זה מתאים, ושאלון קצר שעוזר ללקוח לבחור. בחנות של קליניקת רותם גוטובסקי, למשל, המוצרים עומדים על מדפים כמו בקליניקה, ואפשר לשלוח את הרשימה בוואטסאפ.</p>'),
               ('תמונות מוצר בלי יום צילום', '<p>אפשר להפיק תמונות מוצר ואווירה ברמת סטודיו בעזרת בינה מלאכותית. ראו <a href="ai-commercial.html">הפקת פרסומת ב-AI</a>.</p>')],
     examples=['allenbis', 'clinic', 'gotovski'],
     faq=[('איזו סליקה אפשר לחבר?', 'אשראי, ביט ו-Apple Pay, דרך ספק הסליקה שלכם או ספק שנבחר יחד.'),
          ('האם אוכל לנהל את המוצרים לבד?', 'כן. מוסיפים מוצרים, משנים מחירים ומעדכנים מלאי בעצמכם.'),
          ('יש לי חנות קיימת. אפשר לשפר אותה?', 'כן. באלנביס, למשל, שיפרתי חנות קיימת ומהירה יותר בלי להחליף את כל המערכת.')],
     related=['website-building', 'web-design', 'seo', 'wix-migration'],
     service=('E-commerce development', 'בניית חנות אינטרנטית'))

page(slug='seo', lang='he', name='קידום אתרים אורגני',
     title='קידום אתרים אורגני (SEO) לעסקים | HG Studio',
     desc='קידום אורגני בגוגל: מחקר מילות מפתח, עמודי נחיתה לכל שירות ועיר, מהירות, סימון עסקי ופרופיל Google Business. בלי טריקים שמענישים.',
     h1='קידום אתרים אורגני (SEO)', kicker='שירות · קידום בגוגל',
     lead='קידום אורגני טוב מתחיל בבסיס: אתר מהיר, מסודר וברור, שגוגל מבין מה הוא עושה ולמי. אחר כך מגיעים התוכן, העמודים לכל שירות ועיר, והפרופיל העסקי. אני לא משתמש בטריקים שגוגל מעניש עליהם, כי הם עובדים חודש ואז מעלימים את האתר.',
     sections=[('מה עושים בפועל', '<ul><li>מחקר מילות מפתח: מה הלקוחות שלכם באמת מחפשים.</li><li>כותרות, תיאורים ומבנה כותרות נכון בכל עמוד.</li><li>סימון עסקי (Schema) לשירותים, מחירים, שאלות נפוצות וסרטונים.</li><li>עמודי נחיתה לכל שירות ולכל אזור שבו אתם עובדים.</li><li>מהירות טעינה, מפת אתר, הפניות מאתר ישן ו-Search Console.</li><li>הגדרת פרופיל Google Business, שהוא הדרך הכי מהירה להופיע במפה.</li></ul>'),
               ('כמה זמן לוקח לראות תוצאות', '<p>אף אחד לא יכול להבטיח מקום ראשון. בדרך כלל רואים תזוזה תוך שבועות עד חודשים, תלוי בתחום ובתחרות. מה שאפשר להבטיח הוא בסיס חזק שמשתפר עם הזמן, ומדידה שמראה מה עובד.</p>'),
               ('עובד גם בחיפוש של בינה מלאכותית', '<p>יותר ויותר אנשים שואלים את ChatGPT, Gemini ו-Perplexity במקום לחפש. אתר עם תוכן ברור, נתונים מסודרים וקובץ llms.txt מקבל סיכוי טוב יותר להופיע גם שם.</p>')],
     examples=['gotovski', 'clinic', 'allenbis'],
     faq=[('תוך כמה זמן אהיה בעמוד הראשון?', 'אי אפשר להבטיח מקום ראשון. בונים את הבסיס הכי חזק שאפשר, מודדים, וממשיכים לשפר.'),
          ('מה זה פרופיל Google Business?', 'הכרטיס של העסק במפות ובחיפוש המקומי. הגדרה נכונה שלו היא אחת הדרכים המהירות להביא פניות מאזור העבודה שלכם.'),
          ('אני עובר מאתר ישן. אאבד את הדירוג?', 'לא אם עושים את זה נכון: מעבירים את התוכן ומגדירים הפניה מכל כתובת ישנה לחדשה.')],
     related=['website-building', 'landing-page', 'wix-migration', 'online-store'],
     service=('Search engine optimization', 'קידום אתרים אורגני'))

page(slug='ai-commercial', lang='he', name='הפקת פרסומת ב-AI',
     title='הפקת סרטון פרסומת ב-AI לעסקים | HG Studio',
     desc='סרטון פרסומת ברמה קולנועית בלי צוות צילום: עלילה, דמויות, רכבים, קריינות ומוזיקה. 30 עד 60 שניות, כולל גרסאות 15 ו-6 שניות לרשתות.',
     h1='הפקת פרסומת ב-AI', kicker='שירות · וידאו',
     lead='פרסומת ברמת טלוויזיה עלתה פעם עשרות אלפי שקלים: צוות, שחקנים, לוקיישן ויום צילום. היום אפשר להפיק סרט קולנועי עם בינה מלאכותית, בשבריר מהעלות ובתוך ימים. אני כותב את התסריט, יוצר דמויות קבועות, מצלם כל שוט, עורך על המוזיקה ומלביש קריינות.',
     sections=[('מה מקבלים', '<ul><li>תסריט ועלילה קצרה שמתאימה למותג.</li><li>דמויות, מוצר ורכבים קבועים לאורך כל הסרט.</li><li>צילום קולנועי ב-1080p, עריכה על הקצב, צבע ופסי קולנוע.</li><li>קריינות טבעית באנגלית (ובעברית לפי הצורך) ומוזיקה ברישיון חופשי.</li><li>גרסאות 30, 15 ו-6 שניות לטלוויזיה, ליוטיוב ולרשתות.</li></ul>'),
               ('חבילות', '<p>אפשר להזמין פרסומת אחת, או חבילה שכוללת גם את הדרך אל הקהל: <strong>קמפיין</strong>, ארבע פרסומות של עד 30 שניות סביב מוצר או השקה אחת, עם העלאה לאינסטגרם ולפייסבוק לפי לוח זמנים ומענה למגיבים, ו<strong>עונה</strong>, שמונה פרסומות עם עולם ודמויות שחוזרים, סרט דגל של עד דקה, פוסטים וסטוריז בכל שבוע וניהול מודעות ממומנות. <a href="../#ads">לפירוט החבילות</a>.</p>'),
               ('דוגמאות', '<p>בתיק העבודות שלוש פרסומות שהפקתי כך: <strong>אֶלֶף</strong>, פרסומת קולנועית לשמן זית מהגליל, <strong>HG · Unforgettable</strong>, פרסומת בושם עם דוגמנים, מכונית יוקרה וכביש צוקים בלילה, ו<strong>לפני שהעיר מתעוררת</strong>, סרט אקשן של דקה על מאפייה ושליח בתל אביב. <a href="../archive/">לצפייה בארכיון</a>.</p>'),
               ('חשוב לדעת', '<p>כל הדמויות בדיוניות, והמוזיקה והקולות בשימוש חוקי. הסרט מסומן כנוצר בבינה מלאכותית, כמו שנהוג היום.</p>')],
     examples=[], films=True,
     faq=[('כמה זמן לוקחת הפקה?', 'בדרך כלל כמה ימים מאישור התסריט ועד סרט ערוך.'),
          ('אפשר להשתמש במוצר האמיתי שלי?', 'כן. מצלמים את המוצר כרפרנס, והוא מופיע בסרט כמו שהוא.'),
          ('האם זה נראה אמיתי?', 'הכלים של היום מגיעים לרמה קולנועית. אני בודק כל שוט ומצלם מחדש כל מה שנראה לא טבעי.')],
     related=['website-building', 'web-design', 'landing-page', 'online-store'],
     service=('Video production', 'הפקת סרטון פרסומת'))

page(slug='ai-chatbot', lang='he', name='נציג AI לשירות לקוחות',
     title='צ׳אטבוט AI לאתר: נציג שירות 24/7 | HG Studio',
     desc='נציג AI לשירות לקוחות באתר: עונה לפי התוכן שלכם, בכל שעה, בעברית ובאנגלית, ומעביר פניות חמות לוואטסאפ.',
     h1='נציג AI לשירות לקוחות', kicker='שירות · בינה מלאכותית',
     lead='רוב השאלות שלקוחות שואלים חוזרות על עצמן: כמה זה עולה, יש תור פנוי, אתם מגיעים לאזור שלי. נציג AI באתר עונה עליהן מיד, בכל שעה, לפי המידע שלכם בלבד, ומעביר אליכם את מי שמוכן לסגור.',
     sections=[('מה הנציג יודע לעשות', '<ul><li>לענות על שאלות לפי התוכן, המחירים והשירותים שלכם.</li><li>לדבר בעברית ובאנגלית.</li><li>להציע תור, הצעת מחיר או מוצר מתאים.</li><li>להעביר את השיחה לוואטסאפ שלכם, עם סיכום של מה שהלקוח צריך.</li></ul>'),
               ('בלי לנחש', '<p>הנציג עונה רק לפי המידע שהגדרנו. כשהוא לא יודע, הוא אומר את זה ומעביר אליכם, במקום להמציא תשובה.</p>')],
     examples=['clinic'],
     faq=[('הנציג יכול לטעות?', 'הוא עונה רק לפי המידע שלכם, וכשאין לו תשובה הוא מעביר אליכם.'),
          ('צריך לעדכן אותו?', 'כשמשתנים מחירים או שירותים מעדכנים את המידע, והנציג מתעדכן איתו.')],
     related=['website-building', 'online-store', 'seo', 'ai-commercial'],
     service=('AI chatbot', 'נציג AI לשירות לקוחות'))

page(slug='wix-migration', lang='he', name='מעבר מוויקס לאתר מקצועי',
     title='מעבר מוויקס או וורדפרס בלי לאבד את גוגל | HG Studio',
     desc='הגירה מ-Wix או WordPress לאתר מהיר ומעוצב בהתאמה אישית: מעבירים את התוכן, שומרים הפניות מכל כתובת ישנה ואת המקום בגוגל.',
     h1='מעבר מוויקס או וורדפרס', kicker='שירות · הגירה',
     lead='ויקס ווורדפרס טובים להתחלה. כשהעסק גדל, האתר מתחיל להאט, להיראות כמו של כולם ולהגביל. המעבר לאתר שנבנה בהתאמה אישית לא חייב לעלות לכם את המקום בגוגל, אם עושים אותו נכון.',
     sections=[('איך שומרים על הדירוג', '<ul><li>ממפים את כל הכתובות באתר הישן.</li><li>מעבירים את התוכן ששווה לשמור, ומשפרים אותו.</li><li>מגדירים הפניה קבועה (301) מכל כתובת ישנה לחדשה.</li><li>מגישים מפת אתר חדשה ל-Search Console ועוקבים אחרי שגיאות.</li></ul>'),
               ('מה מרוויחים', '<p>אתר מהיר יותר, עיצוב שנבנה במיוחד לעסק שלכם, שליטה מלאה בקוד, ובלי מנוי חודשי לבונה האתרים. הדומיין והאתר שלכם.</p>')],
     examples=['gotovski', 'allenbis'],
     faq=[('אאבד את הדירוג בגוגל?', 'לא אם מגדירים הפניות מכל כתובת ישנה. זה חלק קבוע מהמעבר.'),
          ('מה עם המייל של העסק?', 'המייל לא תלוי באתר ונשאר כמו שהוא. רק רשומות האתר משתנות.')],
     related=['website-building', 'seo', 'web-design', 'online-store'],
     service=('Website migration', 'מעבר מוויקס'))

page(slug='brand-identity', lang='he', name='זהות מותגית',
     title='עיצוב לוגו וזהות מותגית לעסקים | HG Studio',
     desc='זהות מותגית לעסק: לוגו, צבעים, גופנים וכללים קצרים לשימוש, שמתאימים לאתר ולרשתות. יחד עם האתר או בנפרד.',
     h1='זהות מותגית', kicker='שירות · מיתוג',
     lead='לפני שבונים אתר, כדאי לדעת איך העסק נראה ונשמע. זהות מותגית קצרה וברורה עושה סדר: לוגו, צבעים, גופנים וכמה כללים פשוטים, כך שהאתר, הרשתות והשלט נראים כמו אותו עסק.',
     sections=[('מה כלול', '<ul><li>לוגו בכמה גרסאות: מלא, סמל, כהה ובהיר.</li><li>פלטת צבעים וגופנים לעברית ולאנגלית.</li><li>כללים קצרים לשימוש, ותבנית לפוסט ולסטורי.</li></ul>'),
               ('משתלב באתר', '<p>הזהות נבנית יחד עם האתר, כך שהשפה העיצובית נמשכת מהלוגו ועד האנימציות. ראו <a href="web-design.html">עיצוב אתרים</a>.</p>')],
     examples=['rachel', 'falafel'],
     faq=[('צריך זהות מותגית לפני האתר?', 'לא חובה, אבל זה עוזר. אפשר לבנות את שתיהן יחד.')],
     related=['web-design', 'website-building', 'landing-page', 'ai-commercial'],
     service=('Brand identity design', 'זהות מותגית'))

# ---------------------------------------------------------------- English
page(slug='web-design-studio', lang='en', name='Custom web design studio',
     title='Custom Web Design & Development | HG Studio',
     desc='HG Studio designs and builds custom websites from scratch: no templates, fast code, motion, 3D and accessibility. Fixed price, live in two weeks.',
     h1='Custom web design and development', kicker='Service · Web design',
     lead='A good business website is not a business card. It is a salesperson that works at night: it explains what you do, convinces visitors you are the right choice and brings them to a message. HG Studio designs and builds every site from scratch, around your business, with design, code and motion in one pair of hands.',
     sections=[('What you get', '<ul><li>A custom design for every page, not a template shared by thousands.</li><li>Fully responsive and fast, because most visitors arrive on a phone.</li><li>Titles, descriptions, business markup and a sitemap, so Google understands what you do.</li><li>WhatsApp, call and form buttons, with every click measured.</li><li>A simple content manager to update text, images and prices yourself.</li><li>Accessibility built in from the start.</li></ul>'),
               ('Work across languages', '<p>Sites in Hebrew, English and more, with correct right-to-left layout where needed. The studio is based in Israel and works with clients worldwide.</p>')],
     examples=['gotovski', 'clinic', 'ams'],
     faq=[('How long does a website take?', 'Up to two weeks from the first call to a live site. A landing page is usually ready within a week.'),
          ('Do you use templates?', 'No. Every site is designed and built from scratch around the business.'),
          ('Do I own the site and the domain?', 'Yes. The domain is registered in your name, and the site and the code are yours.')],
     related=['website-design', 'landing-page-design', 'ecommerce-store', 'seo-services'],
     service=('Website development', 'Custom web design'), alt='website-building')

page(slug='ai-commercial-production', lang='en', name='AI commercial production',
     title='AI Commercial & Video Ad Production | HG Studio',
     desc='Cinematic TV-quality commercials made with AI: script, consistent characters, cars, voiceover and licensed music. 30 to 60 seconds, plus 15s and 6s cutdowns.',
     h1='AI commercial production', kicker='Service · Video',
     lead='A TV-grade commercial used to need a crew, actors, a location and a shoot day. Today a cinematic film can be produced with AI in days, for a fraction of the cost. HG Studio writes the script, creates consistent characters, shoots every frame, cuts to the music and records the voiceover.',
     sections=[('What you get', '<ul><li>A short script and story that fits the brand.</li><li>Consistent characters, product and vehicles across the film.</li><li>Cinematic 1080p shots, an edit cut to the music, a color grade and widescreen framing.</li><li>Natural voiceover and legally licensed music.</li><li>30, 15 and 6 second versions for TV, YouTube and social.</li></ul>'),
               ('Packages', '<p>Order a single commercial, or a package that also gets it to your audience: <strong>Campaign</strong>, four commercials up to 30 seconds around one product or launch, published to Instagram and Facebook on a schedule with replies to comments, and <strong>Season</strong>, eight commercials with a world and characters that return, a flagship film up to a minute long, weekly posts and Stories, and paid ads management. <a href="../../en.html#ads">See the packages</a>.</p>'),
               ('Examples', '<p>The archive holds three commercials made this way: <strong>Elef</strong>, a cinematic spot for olive oil from the Galilee, <strong>HG · Unforgettable</strong>, a fragrance spot with models, a luxury car and a cliff road at night, and <strong>Before the City Wakes</strong>, a one-minute action film about a bakery and a courier in Tel Aviv. <a href="../../archive/en.html">Watch in the archive</a>.</p>'),
               ('Good to know', '<p>All characters and brands are fictional, and the music and voices are used legally. Each film is labeled as made with AI, as is customary today.</p>')],
     examples=[], films=True,
     faq=[('How long does a production take?', 'Usually a few days from script approval to a finished edit.'),
          ('Can my real product appear in it?', 'Yes. The product is photographed as a reference and appears as it is.')],
     related=['web-design-studio', 'website-design', 'landing-page-design', 'ecommerce-store'],
     service=('Video production', 'AI commercial production'), alt='ai-commercial')

page(slug='website-design', lang='en', name='Website design',
     title='Custom Website Design, No Templates | HG Studio',
     desc='Website design built around your business: a visual language of its own, motion, 3D and accessibility. Six sites, six design languages. See the work.',
     h1='Website design', kicker='Service · Design',
     lead='Every business has a character, and its website should feel like it. A fuel infrastructure company should not look like a clinic, and a boxing coach should not look like a math tutor. So every site I design gets a language of its own: typefaces, colors, motion, even the way the buttons behave.',
     sections=[('How a design is born', '<p>It starts with one question: what should your customer feel in the first five seconds? From there comes a direction: a squared notebook for a math tutor, a street stall for a falafel caterer, cherry blossoms for a skin clinic. The design does not decorate the content. It tells it.</p>'),
               ('What the design includes', '<ul><li>A design direction and a full visual language: colors, typefaces, icons and imagery.</li><li>Design for phone and desktop, not just "responsive".</li><li>Motion and scroll animation that guide the eye without slowing the site down.</li><li>3D, product renders and studio-grade images made with AI, where they fit.</li><li>Accessibility from the design stage: contrast, text sizes and keyboard focus.</li></ul>'),
               ('Design that sells', '<p>A beautiful site that brings no leads is a picture on the wall. Every design decision is checked against the goal: is it clear what you do, is it easy to get in touch, and is there a reason to choose you.</p>')],
     examples=['clinic', 'falafel', 'allenbis'],
     faq=[('Do you work with templates?', 'No. Every site is designed and built from scratch around the business, so it has no twin on the internet.'),
          ('I am not sure what I want. Is that OK?', 'Absolutely. In the intro call we work out the business and the customers together, and I propose a direction. You approve it before anything else happens.'),
          ('Will the design work well on phones?', 'Yes. I design for phone and desktop side by side, and test on real devices before launch.')],
     related=['web-design-studio', 'brand-identity-design', 'landing-page-design', 'ai-commercial-production'],
     service=('Web design', 'Website design'), alt='web-design')

page(slug='landing-page-design', lang='en', name='Landing page design',
     title='Landing Page Design That Converts | HG Studio',
     desc='A landing page for a campaign, a launch or a freelancer: custom design, fast loading, WhatsApp and conversion tracking. Live within a week.',
     h1='Landing page design', kicker='Service · Landing pages',
     lead='A landing page does one thing and does it well: it takes someone who clicked an ad or a link and turns them into an enquiry. No menus to distract them, no ten pages. One clear message, proof that you can be trusted, and a button.',
     sections=[('When you need one', '<ul><li>When you run a campaign on Google, Facebook or Instagram and want every shekel to work.</li><li>When you launch a product, a workshop or a new service.</li><li>When you are a freelancer and want a professional presence quickly and on a sane budget.</li></ul>'),
               ('What is on the page', '<ul><li>A headline that says exactly what people get, and who it is for.</li><li>Up to six sections: the problem, the solution, how it works, proof, questions and contact.</li><li>WhatsApp, call and form buttons, with every click measured.</li><li>Fast loading, because every second of waiting costs leads.</li><li>A branded share image for WhatsApp and Facebook.</li></ul>'),
               ('Tracking', '<p>A Meta pixel, Google conversions and a separate page per campaign can be connected, so you know exactly what brings customers. See <a href="seo-services.html">SEO</a> and campaign tracking.</p>')],
     examples=['falafel', 'rachel', 'ams'],
     faq=[('How soon is the page live?', 'Usually within a week of having the content and images.'),
          ('Can the page grow into a full site later?', 'Yes. It is built so it can be extended into a full site without starting over.'),
          ('How do I know the page works?', 'Every WhatsApp, call and form click is measured, so you see how many leads came in and from where.')],
     related=['web-design-studio', 'seo-services', 'website-design', 'ai-commercial-production'],
     service=('Landing page', 'Landing page design'), alt='landing-page')

page(slug='ecommerce-store', lang='en', name='Online store development',
     title='Online Store Development with Israeli Payments | HG Studio',
     desc='An online store with catalog, cart, delivery, coupons, card, Bit and Apple Pay payments, and automatic invoices. Custom designed, no template.',
     h1='Online store development', kicker='Service · E-commerce',
     lead='A good online store feels like the tidiest shelf in the best shop: easy to find, easy to understand, easy to pay. I build stores around your products and the way your customers buy, with Israeli payment providers and automatic invoices.',
     sections=[('What the store includes', '<ul><li>A product catalog with filters by type, brand or need.</li><li>Cart, delivery, pickup and coupons.</li><li>Payment by card, Bit and Apple Pay, through your payment provider.</li><li>A receipt or invoice sent automatically with every payment.</li><li>Stock and prices you manage yourself.</li></ul>'),
               ('A store that sells', '<p>Beyond the cart and the checkout, what sells is how the product is shown: good images, a short note on who it is for, and a short quiz that helps the customer choose. In the store for the Rotem Gotovski clinic, for example, products stand on shelves like in the clinic, and the list can be sent on WhatsApp.</p>'),
               ('Product images without a shoot day', '<p>Studio-grade product and lifestyle images can be made with AI. See <a href="ai-commercial-production.html">AI commercial production</a>.</p>')],
     examples=['allenbis', 'clinic', 'gotovski'],
     faq=[('Which payment methods can be connected?', 'Card, Bit and Apple Pay, through your payment provider or one we choose together.'),
          ('Can I manage the products myself?', 'Yes. You add products, change prices and update stock yourself.'),
          ('I already have a store. Can you improve it?', 'Yes. For Allenbis, for example, I improved an existing store and made it faster without replacing the whole system.')],
     related=['web-design-studio', 'website-design', 'seo-services', 'wix-wordpress-migration'],
     service=('E-commerce development', 'Online store development'), alt='online-store')

page(slug='seo-services', lang='en', name='SEO services',
     title='Organic SEO for Businesses | HG Studio',
     desc='Organic SEO on Google: keyword research, a landing page per service and area, speed, business markup and a Google Business profile. No tricks that get punished.',
     h1='Organic SEO', kicker='Service · Google search',
     lead='Good SEO starts with the basics: a fast, tidy, clear site that Google understands, for the right people. Then come the content, a page for each service and area, and the business profile. I do not use tricks Google punishes, because they work for a month and then make the site disappear.',
     sections=[('What actually gets done', '<ul><li>Keyword research: what your customers really search for.</li><li>Titles, descriptions and a correct heading structure on every page.</li><li>Business markup (Schema) for services, prices, FAQs and videos.</li><li>A landing page for each service and each area you work in.</li><li>Loading speed, a sitemap, redirects from an old site, and Search Console.</li><li>A Google Business profile, the fastest way to show up on the map.</li></ul>'),
               ('How long until results', '<p>Nobody can promise first place. Movement usually shows within weeks to months, depending on the field and the competition. What can be promised is a strong base that improves over time, and tracking that shows what works.</p>'),
               ('Ready for AI search too', '<p>More and more people ask ChatGPT, Gemini and Perplexity instead of searching. A site with clear content, structured data and an llms.txt file has a better chance of showing up there as well.</p>')],
     examples=['gotovski', 'clinic', 'allenbis'],
     faq=[('How soon will I be on the first page?', 'First place cannot be promised. We build the strongest base possible, measure, and keep improving.'),
          ('What is a Google Business profile?', 'Your business card on Maps and in local search. Setting it up properly is one of the fastest ways to get leads from your area.'),
          ('I am moving from an old site. Will I lose my ranking?', 'Not if it is done right: the content moves over and every old address redirects to its new one.')],
     related=['web-design-studio', 'landing-page-design', 'wix-wordpress-migration', 'ecommerce-store'],
     service=('Search engine optimization', 'SEO services'), alt='seo')

page(slug='ai-customer-agent', lang='en', name='AI customer service agent',
     title='AI Chatbot for Your Website: a 24/7 Agent | HG Studio',
     desc='An AI customer service agent on your site: answers from your own content, at any hour, in Hebrew and English, and hands warm leads to your WhatsApp.',
     h1='AI customer service agent', kicker='Service · AI',
     lead='Most questions customers ask repeat themselves: how much is it, is there a free slot, do you cover my area. An AI agent on your site answers them right away, at any hour, from your information only, and passes you the people who are ready to buy.',
     sections=[('What the agent can do', '<ul><li>Answer questions from your content, prices and services.</li><li>Speak Hebrew and English.</li><li>Suggest a booking, a quote or a fitting product.</li><li>Hand the conversation to your WhatsApp, with a summary of what the customer needs.</li></ul>'),
               ('No guessing', '<p>The agent answers only from the information we set up. When it does not know, it says so and passes the customer to you instead of making something up.</p>')],
     examples=['clinic'],
     faq=[('Can the agent get things wrong?', 'It answers only from your information, and when it has no answer it passes the customer to you.'),
          ('Does it need updating?', 'When prices or services change, the information is updated and the agent follows.')],
     related=['web-design-studio', 'ecommerce-store', 'seo-services', 'ai-commercial-production'],
     service=('AI chatbot', 'AI customer service agent'), alt='ai-chatbot')

page(slug='wix-wordpress-migration', lang='en', name='Wix and WordPress migration',
     title='Move from Wix or WordPress Without Losing Google | HG Studio',
     desc='Migrate from Wix or WordPress to a fast, custom-designed site: the content moves over, every old address redirects, and your place on Google stays.',
     h1='Moving from Wix or WordPress', kicker='Service · Migration',
     lead='Wix and WordPress are fine for a start. As the business grows, the site slows down, looks like everyone else and starts to limit you. Moving to a custom-built site does not have to cost you your place on Google, if it is done right.',
     sections=[('How the ranking is kept', '<ul><li>Every address on the old site is mapped.</li><li>The content worth keeping moves over, and gets better.</li><li>A permanent (301) redirect is set from every old address to its new one.</li><li>A new sitemap goes to Search Console, and errors are tracked.</li></ul>'),
               ('What you gain', '<p>A faster site, a design made for your business, full control of the code, and no monthly site-builder subscription. The domain and the site are yours.</p>')],
     examples=['gotovski', 'allenbis'],
     faq=[('Will I lose my Google ranking?', 'Not when every old address redirects. That is a standard part of the move.'),
          ('What about my business email?', 'Email does not depend on the site and stays as it is. Only the website records change.')],
     related=['web-design-studio', 'seo-services', 'website-design', 'ecommerce-store'],
     service=('Website migration', 'Wix and WordPress migration'), alt='wix-migration')

page(slug='brand-identity-design', lang='en', name='Brand identity design',
     title='Logo and Brand Identity Design | HG Studio',
     desc='A brand identity for your business: logo, colors, typefaces and short usage rules that work on the site and on social. With the site or on its own.',
     h1='Brand identity', kicker='Service · Branding',
     lead='Before building a site, it helps to know how the business looks and sounds. A short, clear brand identity sets things straight: a logo, colors, typefaces and a few simple rules, so the site, the social accounts and the sign all look like the same business.',
     sections=[('What is included', '<ul><li>A logo in several versions: full, symbol, dark and light.</li><li>A color palette and typefaces for Hebrew and English.</li><li>Short usage rules, plus a template for a post and a story.</li></ul>'),
               ('Built into the site', '<p>The identity is built together with the site, so the visual language runs from the logo to the animations. See <a href="website-design.html">website design</a>.</p>')],
     examples=['rachel', 'falafel'],
     faq=[('Do I need a brand identity before the site?', 'Not necessarily, but it helps. Both can be built together.')],
     related=['website-design', 'web-design-studio', 'landing-page-design', 'ai-commercial-production'],
     service=('Brand identity design', 'Brand identity design'), alt='brand-identity')

# ---------------------------------------------------------------- תבנית
CSS = '''
:root { --gutter: clamp(20px, 5vw, 64px); }
body { background: var(--ink, #0a0a0b); }
.sv-bar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 8px var(--gutter); background: rgba(10,10,11,.82); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(237,232,222,.08); }
.sv-mark { display: inline-flex; align-items: center; min-height: 44px; font-family: "HG Mark", "Fraunces", Georgia, serif; font-weight: 800; letter-spacing: -.035em; font-size: 1.45rem; text-decoration: none; color: #ede8de; direction: ltr; }
.sv-mark span { color: var(--signal); }
.sv-bar nav { display: flex; gap: 1.2rem; font-family: var(--f-mono); font-size: .8125rem; }
.sv-bar nav a { display: inline-flex; align-items: center; min-height: 44px; color: var(--fg-dim); text-decoration: none; }
.sv-bar nav a:hover { color: #ede8de; }
/* טלפון: בסרגל נשאר רק וואטסאפ, כגלולה, כדי שהעמוד לא יהיה רחב מהמסך */
@media (max-width: 560px) {
  .sv-mark { font-size: 1.2rem; }
  .sv-bar-cta nav a:not(:last-child) { display: none; }
  .sv-bar-cta nav a:last-child { min-height: 44px; padding: 0 16px; border-radius: 99px; border: 1px solid rgba(255,79,26,.6); color: #ede8de; }
}
.sv-early { display: flex; flex-wrap: wrap; gap: 12px; margin: 1.6rem 0 0; }
/* טלפון: פס פנייה קבוע בתחתית, וכפתור הנגישות עולה מעליו */
.sv-dock { display: none; }
@media (max-width: 700px) {
  .sv-dock { display: flex; gap: 8px; position: fixed; z-index: 20; inset-inline: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); padding: 6px; border-radius: 99px; background: rgba(10,10,11,.86); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(237,232,222,.12); }
  .sv-dock .sv-btn { flex: 1; justify-content: center; min-height: 44px; padding: 0 14px; }
  body { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
  .a11y { bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
}
.sv { max-width: 860px; margin: 0 auto; padding: 56px var(--gutter) 40px; }
.sv-crumbs { font-family: var(--f-mono); font-size: .8125rem; color: var(--fg-dim); display: flex; align-items: center; gap: 0 .5rem; flex-wrap: wrap; }
.sv-crumbs a { display: inline-flex; align-items: center; min-height: 32px; color: var(--fg-dim); }
.sv-kicker { font-family: var(--f-mono); font-size: .8125rem; color: var(--signal); margin-top: 2rem; letter-spacing: .04em; }
.sv h1 { font-family: var(--f-display); font-weight: 400; font-size: clamp(2.6rem, 7vw, 4.8rem); line-height: 1.02; margin: .6rem 0 1.4rem; }
html[lang="en"] .sv h1 { letter-spacing: .005em; }
.sv-lead { font-size: 1.22rem !important; line-height: 1.75 !important; color: #ede8de !important; }
.sv h2 { font-family: var(--f-display); font-weight: 400; font-size: clamp(1.6rem, 3.2vw, 2.3rem); margin: 3rem 0 .9rem; }
html[lang="en"] .sv h2 { letter-spacing: .005em; }
.sv p, .sv li { font-family: var(--f-body); font-size: 1.04rem; line-height: 1.85; color: rgba(237,232,222,.84); }
.sv ul { padding-inline-start: 1.2rem; display: grid; gap: .45rem; }
.sv a { color: var(--signal); }
.sv-steps { list-style: none; padding: 0 !important; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px !important; counter-reset: s; }
.sv-steps li { counter-increment: s; border: 1px solid rgba(237,232,222,.1); border-radius: 14px; padding: 16px 18px; background: rgba(237,232,222,.025); }
.sv-steps li::before { content: "0" counter(s); display: block; font-family: var(--f-mono); color: var(--signal); font-size: .8125rem; margin-bottom: .3rem; }
.sv-steps b { display: block; color: #ede8de; font-weight: 500; }
.sv-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 1rem; }
.sv-card { display: block; text-decoration: none; border-radius: 14px; overflow: hidden; border: 1px solid rgba(237,232,222,.1); background: #111; }
.sv-card img, .sv-card video { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.sv-card span { display: block; padding: 12px 14px; font-family: var(--f-body); font-size: .92rem; color: #ede8de; }
.sv-card small { display: block; color: var(--fg-dim); font-size: .8125rem; margin-top: 2px; }
.sv-faq details { border-bottom: 1px solid rgba(237,232,222,.1); padding: 6px 0; }
.sv-faq summary { padding-block: 8px; cursor: pointer; font-family: var(--f-body); font-size: 1.08rem; color: #ede8de; }
.sv-faq summary h3 { display: inline; font: inherit; }
.sv-cta { margin: 3.2rem 0 1rem; padding: 28px; border-radius: 18px; background: linear-gradient(135deg, rgba(255,79,26,.16), rgba(255,79,26,.04)); border: 1px solid rgba(255,79,26,.28); }
.sv-cta h2 { margin-top: 0; }
.sv-cta .row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 1rem; }
.sv-btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 22px; border-radius: 99px; background: var(--signal); color: #141416 !important; text-decoration: none; font-family: var(--f-body); font-weight: 500; }
.sv-btn.ghost { background: transparent; color: #ede8de !important; border: 1px solid rgba(237,232,222,.3); }
.sv-rel { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0 !important; }
.sv-rel a { display: inline-block; padding: 8px 14px; border-radius: 99px; border: 1px solid rgba(237,232,222,.18); color: #ede8de; text-decoration: none; font-size: .92rem; }
.sv-foot { max-width: 860px; margin: 0 auto; padding: 30px var(--gutter) 60px; font-family: var(--f-mono); font-size: .8125rem; color: var(--fg-dim); display: flex; flex-wrap: wrap; align-items: center; gap: .4rem 1.2rem; border-top: 1px solid rgba(237,232,222,.08); }
.sv-foot a { display: inline-flex; align-items: center; min-height: 32px; color: var(--fg-dim); }
@media (max-width: 700px) { .sv-foot { row-gap: 0; } .sv-foot a, .sv-crumbs a { min-height: 44px; } }
'''
# גופנים באחסון עצמי (css/fonts.css, העתקים של Google Fonts): בלי חיבור לשרת חיצוני, והגופן של הטקסט נטען מראש
def GF(up, he): return f'<link rel="preload" as="font" type="font/woff2" href="{up}fonts/g/{"rubik-hebrew-423ede.woff2" if he else "geist-mono-latin-b291d8.woff2"}" crossorigin>\n<link rel="stylesheet" href="{up}css/fonts.css">'
# הלוגו נכתב ב-HG Mark: שש האותיות שלו מ-Fraunces, באחסון עצמי (fonts/hg-mark.woff2, מוגדר ב-hanoch.css), בלי גיליון חוסם מגוגל
FR = ''

def url_of(p): return f"{D}/services/{p['slug']}.html" if p['lang'] == 'he' else f"{D}/services/en/{p['slug']}.html"
BY = {p['slug']: p for p in P}

def twin(p):
    # הגרסה בשפה השנייה של אותו שירות (alt בעמוד האנגלי מצביע על העמוד העברי)
    if p['lang'] == 'en': return BY.get(p.get('alt'))
    return next((q for q in P if q['lang'] == 'en' and q.get('alt') == p['slug']), None)

# קישורים משפטיים בכל כותרת תחתונה: פרטיות, תנאים, ביטול והחזרים, הגדרות עוגיות ונגישות
def legal(up, he):
    T = (lambda a, b: a) if he else (lambda a, b: b)
    return (f'<a href="{up}{T("privacy.html", "en-privacy.html")}">{T("מדיניות פרטיות", "Privacy")}</a>'
            f'<a href="{up}{T("terms.html", "en-terms.html")}">{T("תנאי שימוש", "Terms")}</a>'
            f'<a href="{up}{T("refunds.html", "en-refunds.html")}">{T("ביטול והחזרים", "Cancellations & refunds")}</a>'
            f'<a href="#" data-consent-open>{T("הגדרות עוגיות", "Cookie settings")}</a>'
            f'<a href="{up}{T("accessibility.html", "en-accessibility.html")}">{T("הצהרת נגישות", "Accessibility")}</a>')


def render(p):
    he = p['lang'] == 'he'; up = '../' if he else '../../'
    U = url_of(p); esc = html.escape
    tw = twin(p)
    alts = (f'\n<link rel="alternate" hreflang="{p["lang"]}" href="{U}">\n<link rel="alternate" hreflang="{tw["lang"]}" href="{url_of(tw)}">') if tw else ''
    lang_link = (f'<a href="{"en/" if he else "../"}{tw["slug"]}.html" hreflang="{tw["lang"]}" lang="{tw["lang"]}">{"English" if he else "עברית"}</a>') if tw else ''
    T = (lambda a, b: a) if he else (lambda a, b: b)
    home = D + ('/' if he else '/en.html'); hub = D + ('/services/' if he else '/services/en/')
    wa_text = T(f'היי חנוך, הגעתי מהעמוד "{p["name"]}" באתר. אשמח לשמוע פרטים.', f'Hi Hanoch, I found your "{p["name"]}" page. I would like to hear more.')
    wa = f'https://wa.me/{WA}?text=' + urllib.parse.quote(wa_text)
    steps = PROCESS_HE if he else PROCESS_EN
    ex = ''
    if p.get('films'):
        films = [('film/elef', T('אֶלֶף · שמן זית מהגליל', 'Elef · Galilee olive oil'), T('פרסומת קולנועית · 60 שניות', 'Cinematic commercial · 60 seconds')),
                 ('film/hg', 'HG · Unforgettable', T('פרסומת בושם · 30 שניות', 'Fragrance commercial · 30 seconds')),
                 ('film/ad', T('לפני שהעיר מתעוררת', 'Before the City Wakes'), T('סרט פרסומת · 60 שניות', 'Commercial · 60 seconds'))]
        ex = ''.join(f'<a class="sv-card" href="{up}archive/{"" if he else "en.html"}"><video controls preload="none" playsinline poster="{up}work/{f}.webp" src="{up}work/{f}{"-en" if (not he and f in ("film/ad", "film/elef")) else ""}.mp4"></video><span>{esc(n)}<small>{esc(s)}</small></span></a>' for f, n, s in films)
    else:
        for k in p['examples']:
            img, nh, sh, ne, se = PROJ[k]
            ex += f'<a class="sv-card" href="{up}{"work.html" if he else "en-work.html"}#{k}"><img src="{up}{img}" alt="{esc(T(nh, ne))}, {esc(T(sh, se))}" width="640" height="360" loading="lazy" decoding="async"><span>{esc(T(nh, ne))}<small>{esc(T(sh, se))}</small></span></a>'
    rel = ''.join(f'<li><a href="{BY[r]["slug"]}.html">{esc(BY[r]["name"])}</a></li>' for r in p['related'] if r in BY)
    faq = ''.join(f'<details><summary><h3>{esc(q)}</h3></summary><p>{esc(a)}</p></details>' for q, a in p['faq'])
    secs = ''.join(f'<h2>{esc(h)}</h2>{body}' for h, body in p['sections'])
    stype, sname = p['service']
    org = {'@type': 'ProfessionalService', '@id': D + '/#business', 'name': 'HG Studio', 'url': D + '/', 'telephone': '+972-54-552-2053', 'email': 'boss@hgpro.io', 'image': D + '/work/og-home.jpg', 'areaServed': 'IL'}
    graph = [
        {'@type': 'WebPage', '@id': U + '#page', 'url': U, 'name': p['title'], 'description': p['desc'], 'inLanguage': 'he-IL' if he else 'en', 'isPartOf': {'@id': D + '/#website'}, 'breadcrumb': {'@id': U + '#crumbs'}},
        {'@type': 'BreadcrumbList', '@id': U + '#crumbs', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'HG Studio', 'item': home},
            {'@type': 'ListItem', 'position': 2, 'name': T('שירותים', 'Services'), 'item': hub},
            {'@type': 'ListItem', 'position': 3, 'name': p['name'], 'item': U}]},
        {'@type': 'Service', 'name': sname, 'serviceType': stype, 'url': U, 'description': p['desc'], 'provider': org, 'areaServed': {'@type': 'Country', 'name': 'Israel'}},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in p['faq']]}]
    if p.get('films'):
        graph += [{'@type': 'VideoObject', 'name': T('אֶלֶף · שמן זית מהגליל', 'Elef · Galilee olive oil'), 'description': T('פרסומת קולנועית של דקה למותג בדיוני של שמן זית, שנוצרה בבינה מלאכותית על ידי HG Studio.', 'A one minute cinematic commercial for a fictional olive oil brand, made with AI by HG Studio.'), 'thumbnailUrl': D + '/work/film/elef.webp', 'contentUrl': D + ('/work/film/elef.mp4' if he else '/work/film/elef-en.mp4'), 'uploadDate': '2026-10-09', 'duration': 'PT60S'},
                  {'@type': 'VideoObject', 'name': 'HG · Unforgettable', 'description': 'A 30 second fragrance commercial made with AI by HG Studio.', 'thumbnailUrl': D + '/work/film/hg.webp', 'contentUrl': D + '/work/film/hg.mp4', 'uploadDate': '2026-10-04', 'duration': 'PT30S'},
                  {'@type': 'VideoObject', 'name': T('לפני שהעיר מתעוררת', 'Before the City Wakes'), 'description': T('סרט פרסומת של דקה שנוצר בבינה מלאכותית על ידי HG Studio.', 'A one minute commercial made with AI by HG Studio.'), 'thumbnailUrl': D + '/work/film/ad.webp', 'contentUrl': D + ('/work/film/ad.mp4' if he else '/work/film/ad-en.mp4'), 'uploadDate': '2026-10-02', 'duration': 'PT59S'}]
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False)
    alt = ''
    foot_links = ''.join(f'<a href="{("" if q["lang"] == p["lang"] else ("en/" if he else "../"))}{q["slug"]}.html">{esc(q["name"])}</a>' for q in P if q['lang'] == p['lang'])
    return f'''<!doctype html>
<html lang="{'he' if he else 'en'}" dir="{'rtl' if he else 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(p['title'])}</title>
<meta name="description" content="{esc(p['desc'])}">
<link rel="canonical" href="{U}">{alts}
<meta property="og:type" content="website">
<meta property="og:locale" content="{'he_IL' if he else 'en_US'}">
<meta property="og:title" content="{esc(p['title'])}">
<meta property="og:description" content="{esc(p['desc'])}">
<meta property="og:url" content="{U}">
<meta property="og:image" content="{D}/work/og-home.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0a0a0b">
<link rel="icon" href="{up}images/icon-180.png" type="image/png">
<link rel="apple-touch-icon" href="{up}images/icon-180.png">
{GF(up, he)}
<link rel="preload" as="font" type="font/woff2" href="{up}fonts/hg-mark.woff2" crossorigin>
<link rel="stylesheet" href="{up}css/hanoch.css">
<style>{CSS}</style>
<script type="application/ld+json">{ld}</script>
<script src="{up}js/consent.js" defer></script>
<script src="{up}js/ga.js" defer></script>
</head>
<body>
<a class="skip" href="#main">{T("דלגו לתוכן", "Skip to content")}</a>
<header class="sv-bar sv-bar-cta">
  <a class="sv-mark" href="{up}{'' if he else 'en.html'}" aria-label="HG·STUDIO, {T('לדף הבית', 'home')}">HG<span>·</span>STUDIO</a>
  <nav aria-label="{T('ראשי', 'Main')}"><a href="{up}{'archive/' if he else 'archive/en.html'}">{T('עבודות', 'Work')}</a><a href="{up}{'' if he else 'en.html'}#pricing">{T('שירותים', 'Services')}</a>{'<a href="../blog/">מאמרים</a>' if he else ''}<a href="{wa}" target="_blank" rel="noopener">{T('וואטסאפ', 'WhatsApp')}</a></nav>
</header>
<main class="sv" id="main">
  <nav class="sv-crumbs" aria-label="{T('מיקום באתר', 'Breadcrumb')}"><a href="{up}{'' if he else 'en.html'}">HG Studio</a><span aria-hidden="true">/</span><a href="./">{T('שירותים', 'Services')}</a><span aria-hidden="true">/</span><span aria-current="page">{esc(p['name'])}</span></nav>
  <p class="sv-kicker">{esc(p['kicker'])}</p>
  <h1>{esc(p['h1'])}</h1>
  <p class="sv-lead">{esc(p['lead'])}</p>
  <p class="sv-early" id="quote-top"><a class="sv-btn" href="{wa}" target="_blank" rel="noopener">{T('לקבלת הצעת מחיר בוואטסאפ', 'Get a quote on WhatsApp')}</a></p>
  {secs}
  <h2>{T('איך זה עובד', 'How it works')}</h2>
  <ol class="sv-steps">{''.join(f'<li><b>{esc(a)}</b>{esc(b)}</li>' for a, b in steps)}</ol>
  <h2>{T('איך נקבע המחיר', 'How pricing works')}</h2>
  <p>{T('כל פרויקט מתומחר לפי מה שהעסק שלכם צריך. אחרי שיחת היכרות קצרה מקבלים הצעה כתובה עם מחיר סגור ולוח זמנים, ומה שכתוב בהצעה זה מה שמשלמים.', 'Every project is priced around what your business needs. After a short intro call you get a written proposal with a fixed price and a schedule, and what it says is what you pay.')}</p>
  {f'<h2>{T("מהתיק", "From the portfolio")}</h2><div class="sv-cards">{ex}</div>' if ex else ''}
  <h2>{T('שאלות נפוצות', 'FAQ')}</h2>
  <div class="sv-faq">{faq}</div>
  <section class="sv-cta" aria-labelledby="cta-h">
    <h2 id="cta-h">{T('בואו נדבר', "Let's talk")}</h2>
    <p>{T('שיחת היכרות קצרה, בלי התחייבות. אחריה מקבלים הצעה כתובה עם מחיר סגור.', 'A short intro call, no commitment. Afterwards you get a written proposal with a fixed price.')}</p>
    <div class="row"><a class="sv-btn" href="{wa}" target="_blank" rel="noopener">{T('שלחו הודעה בוואטסאפ', 'Message on WhatsApp')}</a><a class="sv-btn ghost" href="tel:+{WA}" dir="ltr">{T('054-5522053', '+972 54-552-2053')}</a><a class="sv-btn ghost" href="mailto:boss@hgpro.io">boss@hgpro.io</a></div>
  </section>
  {f'<h2>{T("שירותים קשורים", "Related services")}</h2><ul class="sv-rel">{rel}</ul>' if rel else ''}
</main>
<footer class="sv-foot"><span>© 2026 HG Studio · {T('חנוך גוטובסקי', 'Hanoch Gotovski')}</span>{foot_links}{lang_link}{legal(up, he)}</footer>
<div class="sv-dock" id="dock"><a class="sv-btn" href="{wa}" target="_blank" rel="noopener">{T('וואטסאפ', 'WhatsApp')}</a><a class="sv-btn ghost" href="tel:+{WA}">{T('חיוג', 'Call')}</a></div>
{f'<script src="{up}js/captions.js" defer></script>' if p.get('films') else ''}<script src="{up}js/a11y.js" defer></script>
<script src="{up}js/assistant.js" defer></script>
</body>
</html>
'''

# תמונה לכל שירות בעמוד הריכוז: פרויקט אמיתי לסוגי האתרים, וסמל הזכוכית של המערכת לשאר (בגודל התצוגה, 352 על 198)
HUB_IMG = {'website-building': 'work/thumbs/hub/gotovski.webp', 'web-design-studio': 'work/thumbs/hub/gotovski.webp',
           'web-design': 'work/thumbs/hub/clinic.webp', 'website-design': 'work/thumbs/hub/clinic.webp',
           'landing-page': 'work/thumbs/hub/falafel.webp', 'landing-page-design': 'work/thumbs/hub/falafel.webp',
           'online-store': 'work/thumbs/hub/sell.webp', 'ecommerce-store': 'work/thumbs/hub/sell.webp',
           'seo': 'work/thumbs/hub/grow.webp', 'seo-services': 'work/thumbs/hub/grow.webp',
           'ai-commercial': 'work/thumbs/hub/ad.webp', 'ai-commercial-production': 'work/thumbs/hub/ad.webp',
           'ai-chatbot': 'work/thumbs/hub/ai.webp', 'ai-customer-agent': 'work/thumbs/hub/ai.webp',
           'wix-migration': 'work/thumbs/hub/after.webp', 'wix-wordpress-migration': 'work/thumbs/hub/after.webp',
           'brand-identity': 'work/thumbs/hub/brand.webp', 'brand-identity-design': 'work/thumbs/hub/brand.webp'}

def hub(lang):
    he = lang == 'he'; up = '../' if he else '../../'; T = (lambda a, b: a) if he else (lambda a, b: b)
    items = [p for p in P if p['lang'] == lang]
    U = D + ('/services/' if he else '/services/en/')
    cards = ''.join(f'<li><a href="{p["slug"]}.html">' + (f'<img src="{up}{HUB_IMG[p["slug"]]}" alt="" width="352" height="198" loading="lazy" decoding="async">' if p['slug'] in HUB_IMG else '') + f'<div><b>{html.escape(p["name"])}</b><span>{html.escape(p["desc"])}</span></div></a></li>' for p in items)
    ld = json.dumps({'@context': 'https://schema.org', '@type': 'ItemList', 'name': T('שירותי HG Studio', 'HG Studio services'),
                     'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': url_of(p), 'name': p['name']} for i, p in enumerate(items)]}, ensure_ascii=False)
    title = T('שירותים: בניית אתרים, עיצוב, חנויות, SEO ו-AI | HG Studio', 'Services: web design, development and AI video | HG Studio')
    desc = T('כל השירותים של HG Studio: בניית אתרים לעסקים, עיצוב אתרים, דפי נחיתה, חנויות אינטרנטיות, קידום אורגני, פרסומות ונציגי AI.', 'All HG Studio services: custom web design and development, and AI commercial production.')
    return f'''<!doctype html>
<html lang="{lang}" dir="{'rtl' if he else 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{U}">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{U}"><meta property="og:image" content="{D}/work/og-home.jpg">
<meta name="theme-color" content="#0a0a0b">
<link rel="icon" href="{up}images/icon-180.png" type="image/png">
{GF(up, he)}
<link rel="preload" as="font" type="font/woff2" href="{up}fonts/hg-mark.woff2" crossorigin>
<link rel="stylesheet" href="{up}css/hanoch.css">
<style>{CSS}
.sv-list {{ list-style: none; padding: 0 !important; display: grid; gap: 12px !important; }}
.sv-list a {{ display: grid; grid-template-columns: 176px 1fr; gap: 20px; align-items: center; padding: 14px 20px 14px 14px; border-radius: 14px; border: 1px solid rgba(237,232,222,.1); text-decoration: none; background: rgba(237,232,222,.025); }}
[dir="rtl"] .sv-list a {{ padding: 14px 14px 14px 20px; }}
.sv-list img {{ width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; background: #111; }}
@media (max-width: 560px) {{ .sv-list a {{ grid-template-columns: 104px 1fr; gap: 14px; }} .sv-list b {{ font-size: 1.25rem; }} }}
.sv-list b {{ display: block; color: #ede8de; font-family: var(--f-display); font-weight: 400; font-size: 1.5rem; }}
.sv-list span {{ display: block; color: rgba(237,232,222,.7); font-family: var(--f-body); font-size: .95rem; margin-top: 4px; line-height: 1.6; }}
</style>
<script type="application/ld+json">{ld}</script>
<script src="{up}js/consent.js" defer></script>
<script src="{up}js/ga.js" defer></script>
</head>
<body>
<a class="skip" href="#main">{T('דלגו לתוכן', 'Skip to content')}</a>
<header class="sv-bar"><a class="sv-mark" href="{up}{'' if he else 'en.html'}">HG<span>·</span>STUDIO</a><nav><a href="{up}{'archive/' if he else 'archive/en.html'}">{T('עבודות', 'Work')}</a>{'<a href="../blog/">מאמרים</a>' if he else ''}<a href="{up}{'' if he else 'en.html'}#pricing">{T('שירותים', 'Services')}</a></nav></header>
<main class="sv" id="main">
  <nav class="sv-crumbs"><a href="{up}{'' if he else 'en.html'}">HG Studio</a><span aria-hidden="true">/</span><span aria-current="page">{T('שירותים', 'Services')}</span></nav>
  <h1>{T('שירותים', 'Services')}</h1>
  <p class="sv-lead">{T('עיצוב, קוד ותנועה ביד אחת. כל שירות נבנה סביב העסק שלכם, עם מחיר סגור מראש.', 'Design, code and motion in one pair of hands. Every service is built around your business, at a fixed price.')}</p>
  <ul class="sv-list">{cards}</ul>
</main>
<footer class="sv-foot"><span>© 2026 HG Studio</span>{legal(up, he)}</footer>
<script src="{up}js/a11y.js" defer></script>
<script src="{up}js/assistant.js" defer></script>
</body>
</html>
'''

if __name__ == '__main__':
    os.makedirs(ROOT + '/services/en', exist_ok=True)
    for p in P:
        path = ROOT + ('/services/' if p['lang'] == 'he' else '/services/en/') + p['slug'] + '.html'
        open(path, 'w', encoding='utf8').write(render(p))
    open(ROOT + '/services/index.html', 'w', encoding='utf8').write(hub('he'))
    open(ROOT + '/services/en/index.html', 'w', encoding='utf8').write(hub('en'))
    json.dump([{'url': url_of(p), 'lang': p['lang']} for p in P], open(ROOT + '/services/pages.json', 'w'), indent=1)
    print('pages', len(P) + 2)

