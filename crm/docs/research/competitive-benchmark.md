# מחקר תחרותי: HG OS מול CRM-ים מובילים

> תאריך: 25.10.2026 · מטרה: להחליט מה HG OS לוקח, משפר ונמנע ממנו, בעיקר בייחוס שיווקי (attribution), אנליטיקת הכנסות ורווח, ובמרכז הפעולות "היום שלי".
> הקשר העסקי: עסק של אדם אחד בישראל שבונה אתרים ומוכר שירותים דיגיטליים. הלידים מגיעים מ-Google Ads, Meta Ads, אורגני, הפניות ו-WhatsApp. העסק שולח הצעות מחיר ומבצע פולואפים. המערכת בעברית, RTL, web, משתמש אחד כרגע, ותצטרך לגדול.

## מקרא ומתודולוגיה

| תג | משמעות |
|---|---|
| **[FACT]** | מתיעוד רשמי של היצרן (knowledge base, help center, developer docs). ה-URL מצוין ליד הטענה. |
| **[USER]** | משוב משתמשים מאתרי ביקורות (G2, Capterra, GetApp, TrustRadius) או מפורומי הקהילה של היצרן. |
| **[HYP]** | השערה או המלצה שלנו. לא נבדקה מול משתמשים אמיתיים. |

**מגבלות המחקר (חשוב):**
- **לא בדקתי UI של אף מוצר.** כל מה שמתואר כאן מבוסס על תיעוד כתוב ועל ביקורות. לא היה לי חשבון באף מערכת.
- עמודי הביקורות ב-G2 וב-Capterra החזירו **HTTP 403** ל-WebFetch. לכן המשוב [USER] מ-G2/Capterra/GetApp/TrustRadius מבוסס על **תקצירי תוצאות חיפוש** של העמודים האלה ולא על קריאה ישירה שלהם. הציטוטים הם מהתקצירים.
- **Reddit לא היה נגיש** לכלי החיפוש (חסום ל-user agent). אין כאן משוב מ-Reddit.
- עמוד ה-KB של HubSpot בכתובת הישנה (`/records/understand-source-properties`) החזיר 404. הגרסה הנוכחית נקראה מ-`/properties/understand-source-properties`. גם `support.pipedrive.com/en/article/rotting-deals` החזיר 404, והגרסה הנוכחית נקראה מ-`/en/article/the-rotting-feature`.
- תמחור: שורה אחת לכל מוצר, בכוונה.

---

## 1. HubSpot CRM (Free / Starter, עם הפניות ל-Marketing Hub)

### ממצאים

**מודל ייחוס (המודל החשוב ביותר במחקר הזה):**
- [FACT] HubSpot מגדירה שני שדות נפרדים: **Original Traffic Source**, "the first known web source through which a contact interacted with your business", ו-**Latest Traffic Source**, "the most recent known web source". המערכת ממלאת אותם אוטומטית מביקורים באתר, קליקים במיילים וכו', ואפשר לעדכן אותם ידנית. — https://knowledge.hubspot.com/properties/understand-source-properties
- [FACT] רשימת הערכים קבועה: Organic search, Paid search, Email marketing, Organic social, Referrals, AI Referrals, Other campaigns, Direct traffic, Paid social, Offline sources. — אותו URL
- [FACT] יש שתי רמות פירוט, **Drill-down 1** (למשל פלטפורמה, שם קמפיין, דומיין מפנה) ו-**Drill-down 2** (למשל URL, מילת חיפוש, שם מודעה). HubSpot ממלאת אותן והן "cannot be updated manually". שינוי ידני של המקור **מנקה** את ה-drill-downs. הדוגמה בתיעוד: מודעת פייסבוק נרשמת כ-Paid social → Facebook → שם הקמפיין. — אותו URL
- [FACT] **Record Source** הוא שדה נפרד: "tells you how records were created in your HubSpot account", כלומר import, אפליקציה, אינטגרציה וכו'. HubSpot ממליצה להשתמש בו ולא בערך "Offline sources" כדי לדעת איך רשומה נוצרה. — אותו URL
- [FACT] "Companies and deals associated with contacts mirror these properties": חברה ועסקה יורשות את המקור מאנשי הקשר שמשויכים אליהן. — אותו URL
- [FACT] חוסם פרסומות "may block HubSpot's tracking cookies" ופוגע בערכי המקור. — אותו URL
- [FACT] יש שלושה סוגי דוחות ייחוס: Contact Create Attribution, Deal Create Attribution ו-Deal Revenue Attribution. המודלים הם First Touch, Last Touch, Linear, Time Decay ו-Empirical. Empirical מחליף את U/W/J-shaped. הדוחות דורשים Marketing Hub Pro/Enterprise, ו-**Deal Revenue Attribution זמין רק ב-Marketing Hub Enterprise**. — https://knowledge.hubspot.com/reports/create-attribution-reports
- [FACT] בשלבי מחזור חיים (lifecycle stage), מאפייני "date entered/exited" המחושבים **לא נמחקים** כשחוזרים לשלב קודם. ייבוא, טפסים ו-API יכולים רק לקדם את השלב. — https://knowledge.hubspot.com/records/use-lifecycle-stages (נקרא דרך תקציר חיפוש)

**כפילויות:**
- [FACT] ההתאמה היא לפי email לאנשי קשר ולפי domain לחברות. ניסיון ליצור ידנית איש קשר עם מייל קיים נחסם. שליחת טופס עם מייל קיים מעדכנת את הרשומה הקיימת. ייבוא מעדכן רק עמודות ממופות. אפשר להגדיר עד 10 שדות ייחודיים מותאמים לכל אובייקט, והם נאכפים בעריכה ידנית ובייבוא אבל **לא בטפסים**. חברות שנוצרות דרך API לא עוברות דדופליקציה לפי domain. — https://knowledge.hubspot.com/records/deduplication-of-records
- [FACT] סקירת כפילויות מרוכזת (duplicate manager) זמינה רק ב-Professional/Enterprise. — אותו מקור (לפי תקציר החיפוש)

**"היום שלי":**
- [FACT] ב-Sales workspace יש לשונית Summary עם משימות להיום, באיחור ולמחר. לחיצה על המספר פותחת queue שעובר על המשימות ברצף, ויש גם Guided actions כמו "Update next steps" ו-"Follow-up with buyer". הפיצ'ר דורש **Sales Hub Pro/Enterprise** ומושב Sales. — https://knowledge.hubspot.com/prospecting/review-sales-activity-in-the-sales-workspace

**משוב משתמשים:**
- [USER] "expensive fairly quickly as you add more contacts", "if you want to do X within the CRM, you need to buy Y access". משתמשים מתארים את התוכנית החינמית כטובה לצרכים בסיסיים, עם מגבלות על דוחות ואוטומציות. — https://www.capterra.com/p/152373/HubSpot-CRM/reviews/ , https://www.trustradius.com/products/hubspot-crm/reviews
- [USER] "if you don't have a large team ... this system is simply overpowered". משתמשים מדווחים גם על עקומת למידה. — אותם מקורות

**תמחור (שורה אחת):** יש Free. דוחות ייחוס דורשים Marketing Hub Pro ומעלה, וייחוס הכנסות דורש Enterprise.

### 1) מה ללמוד
- הפרדה מלאה בין **מקור ראשון** ל**מקור אחרון**, ובין **ערוץ שיווקי** ל**אופן יצירת הרשומה** (Traffic Source מול Record Source).
- טקסונומיה דו-שלבית: ערוץ קבוע וקטן, ומתחתיו drill-down חופשי של קמפיין, מודעה ומילת מפתח.
- היסטוריית שלבים שלא נמחקת כשחוזרים אחורה.

### 2) מה לא להעתיק
- נעילת ייחוס ההכנסות מאחורי חבילת Enterprise. אצלנו זה הבידול, ולכן זה בליבת המוצר.
- סט המודלים המלא (Time Decay, Empirical). [HYP] לעסק עם עשרות לידים בחודש אין מספיק נתונים למודל אמפירי, ולכן First/Last/Linear מספיקים.
- תלות בעוגיות כמקור יחיד לייחוס. ליד מוואטסאפ או מטלפון לא משאיר עוגייה.

### 3) הרעיון שמתאים לעסק
Original source ו-Latest source על איש הקשר, עם drill-down. כל עסקה מקבלת עותק של המקור, וייחוס ההכנסה נעשה לפי העסקה.

### 4) איך ליישם טוב יותר
- [HYP] **להקפיא** את המקור על העסקה ברגע שהיא נוצרת (snapshot), במקום "mirror" חי. כך תיקון מקור של איש קשר לא משנה רטרואקטיבית ROAS של רבעון שכבר נסגר.
- [HYP] טבלת touchpoints שנרשמת רק בהוספה (append-only). Original ו-Latest הם ערכים נגזרים ממנה, ולכן אפשר להפיק First/Last/Linear בלי מיגרציה.
- [HYP] לאפשר תיקון ידני של המקור הראשון (HubSpot מאפשרת). אצלנו התיקון יחייב סיבה ויירשם ביומן ביקורת, ולא ימחק את ה-drill-down המקורי אלא ישמור אותו כ-`raw`.
- [HYP] מקור עם ערך "לא ידוע" לא יוצג כ"Direct". הוא יופיע ברשימת "לידים בלי מקור, תקן" בתוך "היום שלי".

### 5) בעיות צפויות
- WhatsApp ושיחות טלפון לא מגיעים עם UTM. צריך להגדיר שאלה ידנית ("איך שמעת עלינו?") כ-touchpoint ידני, ואז הדיוק תלוי במשמעת של המשתמש.
- Consent ועוגיות (תיקון 13 לחוק הגנת הפרטיות): שמירת gclid ו-fbclid כרוכה בהסכמה ובמדיניות פרטיות באתרי הלקוח. [HYP]
- עסקה עם כמה אנשי קשר: צריך להחליט את המקור של מי מקפיאים. ברירת המחדל שלנו היא איש הקשר הראשי.

---

## 2. Pipedrive

### ממצאים

**Activity-based selling:**
- [FACT] בתצוגת הפייפליין העסקאות ממוינות לפי תאריך הפעילות הבאה: "Deals in the pipeline view are sorted by their next activity date". הסדר הוא: חץ אדום (באיחור), חץ ירוק (היום), סימן אזהרה צהוב ("No activities added"), חץ אפור (עתידי). — https://support.pipedrive.com/article/how-are-deals-ordered-in-the-pipeline-view
- [FACT] יש **Rotting** לכל שלב בנפרד: עסקה שלא עודכנה X ימים מקבלת אריח אדום. השעון רץ מ-"last updated time" ומתאפס כשמסמנים פעילות כבוצעה, בפעולות מייל, בהוספת הערה או קובץ ובעריכת שדות. המגבלה המתועדת: "any deal with an activity scheduled far into the future can still go rotten". — https://support.pipedrive.com/en/article/the-rotting-feature
- [USER] לפי פוסטים בקהילה, אחרי סימון פעילות כבוצעה Pipedrive מבקשת לתזמן את הפעילות הבאה, עם ברירת מחדל Call והיום. משתמשים התלוננו שהבקשה מופיעה **גם בעסקאות שנסגרו כ-Lost**, ושהאפשרות לכבות אותה היא הכול או כלום. — https://community.pipedrive.com/discussion/comment/17159 , https://community.pipedrive.com/discussion/801/is-it-possible-to-set-a-default-activity-type-default-activity-name
- [USER] אין התראה מובנית על "עסקה בלי פעילות מתוכננת". משתמשים בונים לזה פילטרים ואוטומציות. — https://community.pipedrive.com/discussion/3424/automatic-email-if-no-activity-in-deal

**מקור הליד:**
- [FACT] יש שני שדות מערכת. **Source origin** מתאר איך הנתון נכנס (Manually created, Import, API, Web forms, Messaging Inbox ועוד), ולא ניתן לעריכה. **Source channel** הוא רשימה שהאדמין מגדיר, ואליו מצטרף Source channel ID. השדות נשמרים כשליד הופך לעסקה: "the same data is attached to your business opportunity, even if it is later converted or archived". מחיקת ערוץ מסירה אותו מכל הרשומות. — https://support.pipedrive.com/en/article/lead-source-deals
- [USER] בשרשור ההכרזה בקהילה היו משתמשים שאמרו שכבר בנו לעצמם שדה "Origin" משלהם והעבירו UTM-ים דרך טפסים. אין תמיכה מובנית ב-UTM. — https://community.pipedrive.com/discussion/comment/43012

**Leads Inbox:**
- [FACT] Leads Inbox הוא אזור המתנה ללידים לא מסוננים, שממנו ממירים ליד לעסקה. כל ליד חייב להיות מקושר לאדם או לארגון. — https://support.pipedrive.com/en/article/leads-inbox

**כפילויות:**
- [FACT] אנשים נחשבים כפולים כשיש להם **אותו שם** ובנוסף טלפון, מייל או ארגון זהים. ארגונים נחשבים כפולים כשיש להם אותו שם ואותה כתובת. עסקאות עם אותו שם לא נחשבות כפולות. — https://support.pipedrive.com/en/article/how-does-the-merge-duplicates-feature-identify-duplicates-in-pipedrive

**משוב משתמשים:**
- [USER] משתמשים משבחים את הפשטות ואת הפייפליין הוויזואלי. הדיווח המתקדם הוא נקודת חולשה ("limited customization"). לפי מבקר אחד ב-G2, "deals only display their current stage rather than their full stage history". חלק מהמדדים זמינים רק לחודש הנוכחי. משתמשים מבקרים גם את אפליקציית המובייל. — https://www.g2.com/products/pipedrive/reviews , https://www.capterra.com/p/132666/Pipedrive/reviews/

**תמחור (שורה אחת):** אין תוכנית חינמית קבועה, יש ניסיון חינם. התמחור לפי משתמש, ודוחות מתקדמים נמצאים בחבילות גבוהות (מקור: תקצירי ביקורות).

### 1) מה ללמוד
- **"לכל עסקה פתוחה יש פעולה הבאה"** כעיקרון מנחה. מיון לפי דחיפות: באיחור, היום, בלי פעולה, עתידי.
- Rotting עם סף ימים שונה לכל שלב.
- הפרדה בין origin (איך נוצר) ל-channel (מאיזה ערוץ), ושמירת המקור כשליד מומר לעסקה.

### 2) מה לא להעתיק
- דרישה לפעולה הבאה **בעסקאות סגורות**, ומתג כיבוי כללי במקום כלל חכם.
- Rotting שמתעלם מפעילות עתידית ושמתאפס מכל עריכה קטנה, גם שינוי שדה. כך עסקה "נראית חיה" בלי שקרה בה משהו אמיתי.
- התאמת כפילויות שמחייבת **שם זהה**. בעברית יש וריאציות כמו "יוסי" ו"יוסף", או שם פרטי בלבד בוואטסאפ, ולכן הכלל הזה יחמיץ הרבה כפילויות. [HYP]
- שמירת השלב הנוכחי בלבד בלי היסטוריה (לפי משוב המשתמשים).

### 3) הרעיון שמתאים לעסק
שדה "פעולה הבאה" חובה בכל ליד ועסקה פתוחים. הלוח וגם "היום שלי" ממוינים לפיו.

### 4) איך ליישם טוב יותר
- [HYP] שני דגלים נפרדים ומוסברים במקום "rotting" אחד:
  1. **"אין פעולה הבאה"**: חוסר במשימה פתוחה.
  2. **"תקוע בשלב"**: עבר את ה-SLA של השלב מאז הכניסה אליו. נמדד מ-`stage_entered_at` ולא מ-`updated_at`, ולכן עריכה של שדה לא מאפסת אותו (בדומה לגישה של Close, ראו בהמשך).
- [HYP] כשסוגרים פעולה כבוצעה מופיע דיאלוג "מה הלאה?" עם קיצורים: "פולואפ בעוד 2 ימים", "בעוד שבוע", "שלח הצעה". הדיאלוג **לא מופיע** בעסקאות Won/Lost. שם מוצע במקום זה "תזכורת ל-upsell בעוד 6 חודשים".
- [HYP] סף SLA ברירת מחדל לכל שלב בפייפליין של בניית אתרים. למשל: "הצעה נשלחה", 3 ימים.

### 5) בעיות צפויות
- כפיית "פעולה הבאה" יוצרת משימות זבל ("לבדוק") רק כדי שהדגל ייעלם. צריך למדוד כמה משימות נדחות שוב ושוב.
- ספי SLA שגויים יוצרים עייפות מהתראות. צריך לכייל לפי נתונים אמיתיים אחרי חודש-חודשיים.

---

## 3. Salesforce (Sales Cloud / Starter)

### ממצאים
- [FACT] **Lead** הוא אובייקט נפרד מ-Contact. כשהליד מוכשר ממירים אותו ל-Account ול-Contact, ואופציונלית גם ל-Opportunity: "Once a lead becomes qualified, you can convert it to an account, contact, and, optionally, an opportunity". הסטטוס נשמר ב-Lead Status. — https://trailhead.salesforce.com/content/learn/modules/prospect-tracking-with-salesforce-leads-quick-look/track-prospects-with-salesforce-leads
- [FACT] כשממזגים ליד לתוך Contact קיים, "only empty fields in the target object are overwritten". החריג היחיד הוא הדגל `overwriteLeadSource`, שערך ברירת המחדל שלו false. כלומר **LeadSource של איש קשר קיים לא נדרס כברירת מחדל.** — https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_calls_convertlead.htm
- [FACT] ב-Customizable Campaign Influence מודל ברירת המחדל הוא **Primary Campaign Source**, שנותן 100% מההשפעה לקמפיין ששמור בשדה של ההזדמנות. אפשר להגדיר מודלים עם אחוזים מותאמים. — https://resources.docs.salesforce.com/244/latest/en-us/sfdc/pdf/campaign_influence_implementation_guide.pdf

**משוב משתמשים:**
- [USER] Starter נחשב נגיש לעסקים קטנים, אבל "expensive, particularly for small businesses", "customization options are basic", "some features feel limited compared to full Salesforce". אחד המבקרים ממליץ להגדיר את הדשבורד לפני תחילת השימוש. — https://www.capterra.com/p/227088/Salesforce-Starter/reviews/ , https://www.trustradius.com/products/salesforce-starter/reviews/all

**תמחור (שורה אחת):** Starter הוא נקודת הכניסה בתשלום לפי משתמש, והעלות עולה מהר עם תוספות (לפי ביקורות).

### 1) מה ללמוד
- **אי-דריסה של מקור קיים** היא ברירת המחדל בהמרה. זה מאשש את עיקרון "המקור הראשון קדוש".
- Primary Campaign Source הוא מודל ייחוס פשוט וברור (100% לקמפיין אחד). זה מספיק לרוב העסקים הקטנים.

### 2) מה לא להעתיק
- הפיצול Lead → Account + Contact + Opportunity, עם מסך המרה. [HYP] לעסק של אדם אחד שרוב לקוחותיו פרטיים או עסקים זעירים, זה שלוש רשומות במקום אחת, ונוצרות כפילויות בין Lead ל-Contact.
- תלות באדמין ובהגדרות כדי להגיע לדוח בסיסי.

### 3) הרעיון שמתאים לעסק
"ליד" הוא **סטטוס** של איש קשר ולא אובייקט נפרד. ההמרה היא פשוט פתיחת עסקה על איש הקשר, ושום שדה לא מועתק או נדרס.

### 4) איך ליישם טוב יותר
- [HYP] מודל של רשומה אחת: Contact עם `lifecycle_stage` (ליד, מוכשר, לקוח, לקוח חוזר), ועסקאות (Deals) מקושרות. Company אופציונלית, לא חובה.
- [HYP] "Primary campaign" על העסקה, שנלקח אוטומטית מה-drill-down של המקור הקפוא ואפשר לשנות אותו ידנית עם רישום ביומן.

### 5) בעיות צפויות
- כשהעסק יגדל ל-B2B עם כמה אנשי קשר בחברה, יידרש Company עם ייחוס ברמת חברה. כדאי להכין את הקשרים כבר עכשיו (many-to-many בין contact ל-deal).

---

## 4. Attio

### ממצאים
- [FACT] מודל הנתונים מורכב מ-Objects (People, Companies, Deals ואובייקטים מותאמים), Records, Attributes ו-Lists. יש **Object attributes** ששייכים לכל הרשומות של אובייקט, ויש **List attributes** כמו Stage ו-Owner שקיימים רק בתוך רשימה. — https://attio.com/help/reference/attio-101/attios-data-model/understanding-attio-data-model
- [FACT] אפשר לראות את היסטוריית העריכה המלאה של כל attribute בקליק ימני: מי שינה ומתי, למשל התקדמות שלבים של עסקה. — https://attio.com/changelog/view-attribute-edit-history
- [FACT] כפילויות מזוהות לפי domain לחברות ולפי email לאנשים. ביצירה או בייבוא עם התאמה, המערכת מציעה לעדכן את הרשומה הקיימת. במיזוג **רשימות, הערות, משימות ותגובות משתי הרשומות מאוחדות**, וגם מיילים. המיזוג עובד על שתי רשומות בכל פעם. — https://attio.com/help/reference/managing-your-data/records/merge-and-delete-records
- [FACT] `/` פותח חיפוש לפי שם, מייל, domain, טלפון או ID. `cmd/ctrl+K` פותח יותר מ-30 quick actions שמשתנות לפי ההקשר. יש קיצורי מקש בודד: `n` להערה, `t` למשימה, `c` למייל. — https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace

**משוב משתמשים:**
- [USER] משתמשים משבחים את קלות השימוש ואת מודל הנתונים הגמיש ("doesn't force everything into a rigid contact/company/deal structure"). התלונות: "the hardest CRM to onboard people onto" בגלל ההתחלה מדף ריק, דוחות ש"still developing", אינטגרציות מעטות והרשאות שטחיות. לפי ביקורת אחת, תוכנית Pro עולה כ-69$ לחודש. — https://www.g2.com/products/attio/reviews , https://www.capterra.com/p/259360/Attio/

### 1) מה ללמוד
- **היסטוריה לכל שדה** ברמת המערכת, לא רק לשלב.
- ניווט מקלדת: `/` לחיפוש, Ctrl+K לפעולות לפי הקשר, מקש בודד ליצירה מהירה.
- מיזוג כפילויות **שמאחד** את הפעילויות במקום למחוק אותן.
- הצעה "קיים כבר, לעדכן?" ברגע היצירה, במקום ניקוי בדיעבד.

### 2) מה לא להעתיק
- התחלה מדף ריק וגמישות מלאה של סכמה. [HYP] עסק של אדם אחד צריך ברירות מחדל מוכנות ולא כלי לבניית מערכת.
- דוחות כתוספת משנית. אצלנו הם הליבה.

### 3) הרעיון שמתאים לעסק
יומן שינויים (audit) לכל שדה, ובמיוחד לשדות כסף ומקור: מחיר העסקה, המקור הראשון, השלב.

### 4) איך ליישם טוב יותר
- [HYP] טבלת `field_changes` כללית, ובנוסף טבלה ייעודית `deal_stage_events` (נכנס/יצא, משך) לחישובי משפך ומחזור מכירה מהירים.
- [HYP] חיפוש שמבין **טלפון ישראלי בכל פורמט** (`050-1234567`, `0501234567`, `+972501234567`, וגם 4 הספרות האחרונות), חיפוש בעברית שמתעלם מניקוד ומגרשיים, וחיפוש לפי מספר הצעת מחיר.

### 5) בעיות צפויות
- טבלת היסטוריה גדלה מהר. צריך אינדקסים ומדיניות שמירה, אבל בהיקף של עסק אחד זה זניח.
- קיצורי מקש בודד מתנגשים עם הקלדה בעברית ועם פריסת מקלדת עברית: המקש `t` הוא `א` כשהפריסה עברית. צריך להאזין ל-`event.code` ולא ל-`event.key`. [HYP]

---

## 5. Close CRM

### ממצאים
- [FACT] מודל הנתונים: **Lead** הוא חברה, ובתוכו Contacts ו-Opportunities. ב-B2C לכל ליד יש איש קשר יחיד באותו שם. סטטוסי ברירת המחדל של הזדמנות כוללים Proposal Sent, Contract Sent, Won ו-Lost. — https://help.close.com/docs/leads , https://help.close.com/docs/opportunities
- [FACT] **Inbox** הוא "sales-focused view of all your inbound communication". הוא מרכז מיילים נכנסים, שיחות שלא נענו, הודעות קוליות, SMS, משימות שהגיע מועדן או עבר, הזדמנויות שהגיעו לתאריך הסגירה הצפוי ותזכורות על הזדמנויות תקועות. יש שלוש תיקיות: Inbox, Done ו-Future (מתוזמן או snoozed). snooze של הזדמנות **מזיז את תאריך הסגירה הצפוי שלה**. כפתור Next Lead עובר לפריט הבא, ואפשר לסמן כבוצעו את כל הפריטים של ליד בבת אחת. — https://help.close.com/feature-guide/inbox.md
- [FACT] כדי לאתר לידים "רקובים", Close ממליצה על Smart View לפי **תאריך שינוי הסטטוס האחרון** ולא לפי פעילות. למשל: ליד ב-Interested שהסטטוס שלו לא השתנה יותר מ-10 ימים, כשהצפי הוא לסגור תוך 14 יום. — https://help.close.com/best-practices/avoiding-lead-rot-and-consolidating-smart-views.md
- [FACT] **אין זיהוי כפילויות מובנה ב-UI.** יש כלים שרצים דרך API key ומחזירים CSV של התאמות לפי שם ליד, טלפון או מייל. המיזוג עצמו נעשה פעם אחת חינם על ידי התמיכה, לפי כלל "מנצח" כמו הליד הוותיק או הסטטוס העדכני. — https://help.close.com/getting-started/import-data-into-close/finding-and-merging-duplicates.md
- [FACT] לא מצאתי בתיעוד של Close מאמר על lead source או UTM (נבדק מול אינדקס ה-llms.txt). — https://help.close.com/llms.txt

**משוב משתמשים:**
- [USER] "I love the inbox part". משתמשים משבחים חיוג ותיעוד אוטומטי של שיחות ו-SMS. התלונה הנפוצה היא דוחות "very basic". משתמשים מתארים את המחיר כ"יקר אבל שווה", ומבקרים גם את המובייל. — https://www.capterra.com/p/132667/Close-io/reviews/ , https://www.getapp.com/customer-management-software/a/close-io/reviews/

**תמחור (שורה אחת):** אין תוכנית חינמית קבועה. יכולות מסוימות, כמו הקלטת שיחות ומספרים מרובים, זמינות רק בתוכנית היקרה (לפי ביקורות).

### 1) מה ללמוד
- **Inbox כרשימת עבודה אחת** עם פריטים מסוגים שונים, Done שאפשר לבטל, Future ו-snooze, ומעבר "הבא" בלי לחזור לרשימה.
- "תקוע" נמדד לפי זמן מאז שינוי הסטטוס ולא לפי עריכה כלשהי.
- snooze שמעדכן את הנתון העסקי (תאריך הסגירה) ולא רק מסתיר את הפריט.

### 2) מה לא להעתיק
- דוחות חלשים.
- כפילויות שמטופלות בכלי חיצוני או דרך התמיכה.
- היעדר שדות מקור ו-UTM מובנים.

### 3) הרעיון שמתאים לעסק
**"היום שלי" = Inbox של Close + המיון של Pipedrive.** פריטים: משימות באיחור, משימות להיום, לידים חדשים שלא טופלו, הצעות מחיר שנשלחו בלי תגובה X ימים, עסקאות תקועות ולידים בלי מקור.

### 4) איך ליישם טוב יותר
- [HYP] לכל פריט יש "סיבה" גלויה, כמו "הצעה נשלחה לפני 4 ימים, אין מענה", ושלוש פעולות מהירות: בוצע, דחה (מחר, שבוע, תאריך) ופתח ב-WhatsApp (`wa.me` עם תבנית).
- [HYP] **זמן תגובה לליד חדש** (speed-to-lead) מוצג כ-KPI ראשון, כי ליד מ-Google Ads מתקרר מהר.
- [HYP] פריטים שנובעים מכללים (תקוע, בלי מקור) מחושבים בכל טעינה ולא נשמרים כמשימות. כך לא נוצרות משימות זבל, והם נעלמים ברגע שהתנאי מתוקן.

### 5) בעיות צפויות
- ריבוי סוגי פריטים מייצר רשימה ארוכה מדי. צריך סדר עדיפויות קבוע ואפשרות לקבץ לפי איש קשר.
- WhatsApp: בלי WhatsApp Business API אי אפשר לסמן "תגובה נכנסת" אוטומטית, ולכן הסימון יהיה ידני בשלב ראשון.

---

## 6. monday CRM

### ממצאים
- [FACT] המבנה מבוסס boards: Leads, Contacts, Accounts, Deals ו-Activities. הסמכת ליד נעשית בשינוי סטטוס ל-Qualified ובלחיצה על "Move to contacts", או באוטומציה. יש שיוך אוטומטי של Account לפי **domain של המייל**. — https://support.monday.com/hc/en-us/articles/4409464697618
- [FACT] אפליקציית Emails & Activities היא ציר זמן ללקוח: מיילים, פגישות, שיחות והערות, עם קטע "Upcoming" לפעילויות עתידיות. היא מותקנת מראש על boards של Contacts, Leads, Accounts ו-Deals. במובייל יש quick actions ללכידת הערות וסיכומי שיחה, ובאנדרואיד גם widget. — https://support.monday.com/hc/en-us/articles/4409766475666 , https://support.monday.com/hc/en-us/articles/33603304668050-Emails-Activities-quick-actions-on-mobile
- [FACT] **Manage duplicates** הוא כלי ידני: בוחרים עמודה, והערכים חייבים להיות **זהים** כדי שיזוהו ככפולים. בוחרים פריט לשמור, ורק ה-**Updates** של הפריט הכפול עוברים אליו. — https://support.monday.com/hc/en-us/articles/4402803033490-Manage-duplicates

**משוב משתמשים:**
- [USER] לפי משתמשים, המיזוג "simply deletes whichever one(s) aren't selected", והפעילויות מ-Emails & Activities לא עוברות. משתמשים ביקשו בדיקת כפילויות אוטומטית כשליד הופך לאיש קשר, וצוות monday השיב "a request that we still need to address". — https://community.monday.com/t/managing-duplicates-on-monday-sales-crm/48462 , https://community.monday.com/t/crm-manage-duplicates-emails-activities/83599
- [USER] כשאיש קשר משויך לכמה עסקאות, מייל על עסקה אחת מופיע גם בעסקאות האחרות. הדיווח מתואר כ"decent but shallow". משתמשים מדווחים גם על בעיות במעקב אחרי Gmail. — https://www.capterra.com/p/245800/Monday-CRM/reviews/ , https://www.g2.com/products/monday-crm/reviews

**תמחור (שורה אחת):** לפי מושבים, וכלי כפילויות זמין מ-Standard ומעלה.

### 1) מה ללמוד
- לכידה מהירה במובייל: הערה או סיכום שיחה בטאפ אחד מיד אחרי שיחה.
- גמישות ויזואלית של board ותצוגה טבלאית שמרגישה כמו גיליון. [HYP] זה מוכר למשתמשים ישראלים שעוברים מ-Excel.

### 2) מה לא להעתיק
- הפרדה ל-boards נפרדים של Leads ו-Contacts עם "העברה" ביניהם. זה מקור מובנה לכפילויות.
- מיזוג שמוחק נתונים.
- שיוך Account לפי domain של המייל. [HYP] רוב הלקוחות הקטנים בישראל משתמשים ב-gmail.com, ולכן הכלל הזה יקבץ אותם יחד בטעות.
- פעילות שמשויכת רק לאיש הקשר ומופיעה בכל העסקאות שלו.

### 3) הרעיון שמתאים לעסק
כפתור "תעד שיחה" אחרי חיוג מהמובייל, עם תוצאת השיחה ופעולה הבאה במסך אחד.

### 4) איך ליישם טוב יותר
- [HYP] PWA עם יעד שיתוף (share target), כדי לשתף טקסט או צילום מסך מוואטסאפ ישירות לליד.
- [HYP] כל פעילות נשמרת עם `contact_id` **וגם** עם `deal_id` אופציונלי. בציר הזמן של העסקה מוצגות רק הפעילויות שלה, עם מתג "הצג את כל הפעילות של איש הקשר".

### 5) בעיות צפויות
- PWA ב-iOS מוגבל: אין share target ויש הגבלות על התראות. צריך פתרון חלופי, כמו קישור מהיר או קיצור דרך של Shortcuts.

---

## 7. נוספים: מוצרים שפותרים בעיה ספציפית

### HighLevel (GoHighLevel): ייחוס ראשון ואחרון מובנה, עם click IDs
- [FACT] **First attribution** "is the first time a contact interacts with our system" ו**נשאר קבוע** אחרי שנרשם. **Latest attribution** מתעדכן בכל אינטראקציה חדשה. הקטגוריות: Paid Search, Paid Social, Direct, Organic Search, Social Media, Referrals, Others (שיחות, SMS, WhatsApp, הודעות פייסבוק), CRM UI (נוצר ידנית) ו-Third-Party (אינטגרציה). — https://help.gohighlevel.com/support/solutions/articles/48001219997-understanding-attribution-source
- [FACT] המערכת שומרת utm_source/medium/campaign/content, campaign_id, ad_group_id ו-ad_id, ואת ה-click IDs **gclid, wbraid, gbraid, msclkid ו-ctwa_clid**. ctwa_clid הוא מזהה הקליק של מודעות Click-to-WhatsApp של Meta. נקודות הכניסה לייחוס: טופס, סקר, קביעת פגישה, צ'אט והזמנה. — אותו URL
- [FACT] מגבלות מתועדות: UTM הוא **case-sensitive**, ואם הגולש עובר לעמוד אחר לפני שליחת הטופס ה-UTM עלול ללכת לאיבוד. — אותו URL
- [USER] בבקשות פיצ'ר בקהילה נכתב ששדות הייחוס לא זמינים כעמודה או לייצוא, אלא רק כפילטר. — https://ideas.gohighlevel.com/contacts/p/contact-attribution-fields-available-to-view-as-a-column-on-the-contacts-tab
- **מה ללמוד:** מקור ראשון שלא משתנה, קטגוריה "CRM UI" לליד ידני שמופרדת מ-"Others", ושמירת ctwa_clid ללידים מוואטסאפ.
- **מה לא להעתיק:** נתוני ייחוס שקבורים בלשונית ולא זמינים לייצוא.
- **בעיה צפויה:** אתר של עסק בונה אתרים עם טפסים חיצוניים (WordPress/Elementor) צריך סקריפט שלוכד UTM ו-click IDs בכניסה לאתר, שומר אותם ב-first-party cookie או ב-localStorage ומזריק אותם לשדות נסתרים. אחרת הנתונים הולכים לאיבוד בניווט בין עמודים.

### סגירת הלולאה מול הפלטפורמות (רלוונטי ל-ROAS אמיתי)
- [FACT] Google Ads Offline Conversion Import דורש auto-tagging ושמירה של **GCLID** לצד הליד. GCLID הוא case-sensitive, והמרות שעולות יותר מ-90 יום אחרי הקליק לא ייובאו (לפי הגרסה הקלאסית של המאמר). — https://support.google.com/google-ads/answer/7012522
- [FACT] Meta Conversions API for CRM משתמש ב-**lead_id**, מספר של 15–17 ספרות מ-Lead Ads, כדי לשלוח את אירועי שלבי הליד בחזרה ל-Meta עם `action_source=system_generated`. כל מעבר שלב נשלח כאירוע. — https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/how-to-find-the-lead-id , https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration/payload-specification
- [HYP] גם אם לא נבנה את ההעלאה עכשיו, **שמירת gclid ו-lead_id מהיום הראשון** היא מה שמאפשר את זה בעתיד. נתון שלא נשמר לא ניתן לשחזר.

---

## 8. טבלת השוואה מרוכזת

| נושא | HubSpot | Pipedrive | Salesforce | Attio | Close | monday | HighLevel |
|---|---|---|---|---|---|---|---|
| מקור ראשון ואחרון מובנה | כן (Traffic Source + drill-down) [FACT] | ערוץ אחד, בלי UTM [FACT] | LeadSource + Campaign [FACT] | לא נמצא בתיעוד | לא נמצא בתיעוד | לא נמצא בתיעוד | כן, כולל click IDs [FACT] |
| "איך נוצר" נפרד מ"מאיפה הגיע" | Record Source [FACT] | Source origin [FACT] | – | – | – | – | CRM UI / Third-Party כקטגוריה [FACT] |
| ייחוס הכנסות | Enterprise בלבד [FACT] | ROI לפי מקור ב-Insights (כללי) [FACT] | Campaign Influence [FACT] | – | – | – | – |
| פעולה הבאה / rotting | משימות + guided actions (Pro+) [FACT] | מיון לפי פעולה הבאה + rotting לכל שלב [FACT] | – | משימות | Inbox + Future/snooze [FACT] | Upcoming בציר זמן [FACT] | – |
| היסטוריית שלבים ושדות | date entered/exited [FACT] | חסרה לפי משתמשים [USER] | – | היסטוריה לכל attribute [FACT] | Status Change report [FACT] | – | – |
| כפילויות | email/domain, חסימה ביצירה [FACT] | שם + (טלפון/מייל/ארגון) [FACT] | – | email/domain + מיזוג שמאחד [FACT] | כלי חיצוני + תמיכה [FACT] | ידני, ערך זהה, מוחק [FACT]/[USER] | – |

("–" פירושו שלא נבדק או לא נמצא במחקר הזה, ולא שהיכולת בהכרח לא קיימת.)

---

## 9. החלטות ל-HG OS

1. **להפריד בין "ערוץ רכישה" ל"אופן יצירת הרשומה".** שני שדות: `acquisition_channel` (google_ads, meta_ads, organic, referral, whatsapp, ...) ו-`record_origin` (manual, web_form, import, api, whatsapp_webhook). *ראיות:* HubSpot Record Source מול Traffic Source, ו-Pipedrive source_origin מול source_channel.
2. **המקור הראשון נכתב פעם אחת ולא נדרס אף פעם אוטומטית. המקור האחרון מתעדכן בכל touchpoint.** תיקון ידני של המקור הראשון מותר רק עם סיבה ונרשם ביומן, והערך הגולמי נשמר. *ראיות:* HighLevel ("stays fixed"), ברירת המחדל של Salesforce `overwriteLeadSource=false`, ו-HubSpot Original מול Latest.
3. **טבלת `touchpoints` שנרשמת רק בהוספה** ושומרת לכל אינטראקציה: ts, channel, utm_source/medium/campaign/content/term, gclid/gbraid/wbraid, fbclid, ctwa_clid, meta_lead_id, landing_url, referrer ו-`is_manual`. Original ו-Latest נגזרים ממנה ונשמרים כ-cache על איש הקשר. *ראיות:* HighLevel שומר את אותם click IDs, Google דורש לשמור GCLID ליד הליד, ו-Meta CAPI דורש lead_id.
4. **טקסונומיה בשתי רמות:** `channel` מרשימה סגורה וקצרה, ו-`drill_down_1/2` (קמפיין, מודעה, מילת מפתח) חופשיים. UTM-ים עוברים נרמול ל-lowercase וממופים לערוץ לפי טבלת כללים שאפשר לערוך. *ראיות:* Drill-down 1/2 של HubSpot, ו-HighLevel מזהיר ש-UTM הוא case-sensitive.
5. **העסקה מקבלת snapshot קפוא של המקור (ראשון ואחרון) ברגע היצירה**, ולא "mirror" חי. כל אנליטיקת ההכנסות נעשית לפי שדות העסקה. *ראיות:* HubSpot: "deals ... mirror these properties". אנחנו מקפיאים כדי שתיקון לא ישנה דוחות היסטוריים.
6. **אנליטיקה על כסף שנגבה, לפני מע"מ, ועם עלויות.** הכנסה לפי תשלומים או חשבוניות (לא רק "Won"), טבלת `costs_direct` לעסקה לחישוב רווח גולמי, וטבלת `ad_spend` (ערוץ × קמפיין × חודש) לחישובי CAC, ROAS ו-ROI. ברירת מחדל First-touch עם מתג ל-Last ול-Linear, ובלי מודלים מורכבים. *ראיות:* HubSpot נועלת Deal Revenue Attribution ב-Enterprise. המודלים הנתמכים שם הם First, Last, Linear ועוד.
7. **"פעולה הבאה" חובה לכל ליד ועסקה פתוחים.** הלוח ו"היום שלי" ממוינים בסדר: באיחור, היום, בלי פעולה, עתידי. *ראיות:* סדר המיון והאייקונים של Pipedrive.
8. **דיאלוג "מה הלאה?" כשסוגרים משימה, עם קיצורי זמן, ובלי להופיע בעסקאות Won/Lost.** שם מוצעת במקום זה תזכורת upsell. *ראיות:* תלונות משתמשים על Pipedrive, שמבקשת פעולה הבאה גם בעסקאות Lost ומאפשרת רק כיבוי גורף.
9. **שני דגלי בריאות נפרדים במקום "rotting":** "אין פעולה הבאה", ו"תקוע בשלב" שמחושב לפי SLA לשלב מ-`stage_entered_at`. עריכת שדה לא מאפסת את הדגל. *ראיות:* rotting של Pipedrive מתאפס מעריכות ומתעלם מפעילות עתידית. Close ממליצה למדוד "רקב" לפי תאריך שינוי סטטוס.
10. **"היום שלי" הוא Inbox אחד עם Now, Future ו-Done, עם snooze, מעבר לפריט הבא וסיבה גלויה לכל פריט.** פריטים שנובעים מכללים מחושבים בכל טעינה ולא נשמרים כמשימות. *ראיות:* Close Inbox, ו-Summary של HubSpot (היום, באיחור, מחר, עם queue).
11. **טבלת `deal_stage_events` (entered_at, exited_at) שלא נמחקת כשחוזרים אחורה**, ויומן `field_changes` לשדות כסף, מקור ושלב. *ראיות:* HubSpot שומרת date entered/exited גם בחזרה אחורה, Attio מציגה היסטוריה לכל attribute, ומשתמשי Pipedrive מתלוננים שרואים רק את השלב הנוכחי.
12. **זהות מבוססת טלפון:** נרמול ל-E.164 (‎+972) כבר בקליטה, אילוץ unique על `phone_e164` ועל `email_normalized`, והצעה "קיים כבר, לעדכן?" ברגע היצירה. התאמה **לא** דורשת שם זהה. *ראיות:* HubSpot חוסמת יצירה כפולה, Attio מציעה לעדכן, ו-Pipedrive דורשת שם זהה, מה שלא מתאים לוואטסאפ ולשמות בעברית [HYP].
13. **מיזוג שמאחד הכול:** פעילויות, משימות, עסקאות ו-touchpoints. המקור הראשון שנשמר הוא ה-touchpoint המוקדם ביותר מבין שתי הרשומות. *ראיות:* במיזוג של Attio רשימות, הערות ומשימות מאוחדים. ב-monday המיזוג "deletes whichever one(s) aren't selected" [USER].
14. **כל פעילות משויכת לאיש קשר ואופציונלית גם לעסקה ספציפית.** ציר הזמן של העסקה מציג רק את הפעילויות שלה. *ראיות:* תלונות על monday CRM שמייל על עסקה אחת מופיע בכל העסקאות של איש הקשר [USER].
15. **ברירות מחדל מוכנות במקום דף ריק, וניווט מקלדת:** פייפליין מוכן לבניית אתרים (ליד חדש → שיחת אפיון → הצעה נשלחה → משא ומתן → נסגר), רשימת ערוצים מוכנה ו-SLA לכל שלב. בנוסף `/` לחיפוש (טלפון בכל פורמט, ספרות אחרונות, עברית בלי ניקוד), Ctrl+K לפעולות וקיצורים לפי `event.code` כדי שיעבדו גם בפריסה עברית. *ראיות:* משתמשי Attio מתלוננים על onboarding מדף ריק, משתמשי HubSpot מתארים אותה כ"overpowered" לצוות קטן, והקיצורים מבוססים על אלה של Attio.

---

## Sources

**HubSpot (רשמי)**
- https://knowledge.hubspot.com/properties/understand-source-properties
- https://knowledge.hubspot.com/reports/create-attribution-reports
- https://knowledge.hubspot.com/records/deduplication-of-records
- https://knowledge.hubspot.com/prospecting/review-sales-activity-in-the-sales-workspace
- https://knowledge.hubspot.com/records/use-lifecycle-stages (דרך תקציר חיפוש)
- (404) https://knowledge.hubspot.com/records/understand-source-properties

**Pipedrive (רשמי + קהילה)**
- https://support.pipedrive.com/article/how-are-deals-ordered-in-the-pipeline-view
- https://support.pipedrive.com/en/article/the-rotting-feature
- https://support.pipedrive.com/en/article/lead-source-deals
- https://support.pipedrive.com/en/article/leads-inbox
- https://support.pipedrive.com/en/article/how-does-the-merge-duplicates-feature-identify-duplicates-in-pipedrive
- https://community.pipedrive.com/discussion/comment/17159
- https://community.pipedrive.com/discussion/801/is-it-possible-to-set-a-default-activity-type-default-activity-name
- https://community.pipedrive.com/discussion/3424/automatic-email-if-no-activity-in-deal
- https://community.pipedrive.com/discussion/comment/43012
- (404) https://support.pipedrive.com/en/article/rotting-deals

**Salesforce (רשמי)**
- https://trailhead.salesforce.com/content/learn/modules/prospect-tracking-with-salesforce-leads-quick-look/track-prospects-with-salesforce-leads
- https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_calls_convertlead.htm
- https://resources.docs.salesforce.com/244/latest/en-us/sfdc/pdf/campaign_influence_implementation_guide.pdf

**Attio (רשמי)**
- https://attio.com/help/reference/attio-101/attios-data-model/understanding-attio-data-model
- https://attio.com/changelog/view-attribute-edit-history
- https://attio.com/help/reference/managing-your-data/records/merge-and-delete-records
- https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace

**Close (רשמי)**
- https://help.close.com/llms.txt
- https://help.close.com/docs/leads
- https://help.close.com/docs/opportunities
- https://help.close.com/feature-guide/inbox.md
- https://help.close.com/best-practices/avoiding-lead-rot-and-consolidating-smart-views.md
- https://help.close.com/getting-started/import-data-into-close/finding-and-merging-duplicates.md

**monday CRM (רשמי + קהילה)**
- https://support.monday.com/hc/en-us/articles/4409464697618
- https://support.monday.com/hc/en-us/articles/4409766475666
- https://support.monday.com/hc/en-us/articles/33603304668050-Emails-Activities-quick-actions-on-mobile
- https://support.monday.com/hc/en-us/articles/4402803033490-Manage-duplicates
- https://community.monday.com/t/managing-duplicates-on-monday-sales-crm/48462
- https://community.monday.com/t/crm-manage-duplicates-emails-activities/83599

**HighLevel / Google / Meta (רשמי + קהילה)**
- https://help.gohighlevel.com/support/solutions/articles/48001219997-understanding-attribution-source
- https://ideas.gohighlevel.com/contacts/p/contact-attribution-fields-available-to-view-as-a-column-on-the-contacts-tab
- https://support.google.com/google-ads/answer/7012522
- https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/how-to-find-the-lead-id
- https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration/payload-specification

**ביקורות משתמשים (403 בגישה ישירה, המידע מתקצירי חיפוש)**
- https://www.capterra.com/p/152373/HubSpot-CRM/reviews/
- https://www.trustradius.com/products/hubspot-crm/reviews
- https://www.g2.com/products/pipedrive/reviews
- https://www.capterra.com/p/132666/Pipedrive/reviews/
- https://www.capterra.com/p/227088/Salesforce-Starter/reviews/
- https://www.trustradius.com/products/salesforce-starter/reviews/all
- https://www.g2.com/products/attio/reviews
- https://www.capterra.com/p/259360/Attio/
- https://www.capterra.com/p/132667/Close-io/reviews/
- https://www.getapp.com/customer-management-software/a/close-io/reviews/
- https://www.capterra.com/p/245800/Monday-CRM/reviews/
- https://www.g2.com/products/monday-crm/reviews
