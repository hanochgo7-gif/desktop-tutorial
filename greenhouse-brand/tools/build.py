#!/usr/bin/env python3
"""
בונה את ספר המותג: index.html וארבעת קובצי הטוקנים בתיקייה tokens/.
כל הנתונים נמצאים כאן, במקום אחד, ויחסי הניגודיות מחושבים לפי נוסחת WCAG 2.1
ולא נכתבים ביד. אחרי כל שינוי בצבע מריצים:

    python3 greenhouse-brand/tools/build.py
"""
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


# ---------- ניגודיות לפי WCAG 2.1 ----------

def _lum(hex_color):
    h = hex_color.lstrip("#")
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a, b):
    la, lb = _lum(a), _lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


# סף לפי סוג: טקסט רגיל 4.5 (1.4.3), טקסט גדול 3 (1.4.3), רכיב ממשק וגרפיקה 3 (1.4.11)
THRESHOLD = {"text": 4.5, "large": 3.0, "ui": 3.0}
KIND_LABEL = {"text": "טקסט רגיל", "large": "טקסט גדול / כותרת", "ui": "גבול, אייקון, מצב"}


# ---------- נתוני הקונספטים ----------

CONCEPTS = [
    {
        "id": "eco-tech",
        "he": "חדשנות ירוקה",
        "en": "Eco-Tech",
        "mood": "טכנולוגיה מדויקת שמשרתת צמיחה. נקי, מדיד, אופטימי.",
        "audience": "חקלאים שמשקיעים בטכנולוגיה, מנהלי משקים, מנהלי בתי ספר שמחפשים מבנה מתקדם ובר-תחזוקה.",
        "hero_title": "חממות שמודדות, מקררות ומשקות בעצמן",
        "hero_sub": "תכנון, הקמה ובקרה של חממות חקלאיות ומערכות הצללה לבתי ספר.",
        "cta1": "תיאום סיור בחממה",
        "cta2": "הורדת מפרט טכני",
        "palette": [
            ("ירוק עלה", "#4CAF50", "איורים, אייקונים גדולים, גרפים. לא לטקסט ולא למילוי כפתור עם טקסט לבן."),
            ("ירוק יער", "#2E7D32", "צבע הפעולה הראשי: מילוי כפתור, כותרות משנה, סימון הצלחה."),
            ("כחול אות", "#1565C0", "קישורים, כפתור משני, טבעת פוקוס, נתונים טכניים."),
            ("אפור מתכת", "#EEEEEE", "רקעי מקטעים, פסי טבלה, מצב מושבת."),
            ("כתום ענבר", "#FF9800", "קריאה לפעולה אחת בעמוד, עם טקסט כהה בלבד."),
        ],
        "tokens": {
            "--color-bg": "#FFFFFF",
            "--color-surface": "#F1F8E9",
            "--color-field-bg": "#FFFFFF",
            "--color-text": "#212121",
            "--color-text-muted": "#5C5C5C",
            "--color-border": "#8A8A8A",
            "--color-border-subtle": "#DCE8D2",
            "--color-primary": "#2E7D32",
            "--color-primary-hover": "#1B5E20",
            "--color-on-primary": "#FFFFFF",
            "--color-secondary": "#1565C0",
            "--color-secondary-hover-bg": "#E3EEFA",
            "--color-accent": "#FF9800",
            "--color-accent-hover": "#FFB74D",
            "--color-on-accent": "#212121",
            "--color-link": "#1565C0",
            "--color-focus": "#1565C0",
            "--color-error": "#C62828",
            "--color-success": "#1B5E20",
            "--color-disabled-bg": "#EEEEEE",
            "--color-disabled-text": "#757575",
            "--color-progress": "#2E7D32",
            "--color-progress-track": "#E0E0E0",
            "--color-decor": "#4CAF50",
            "--color-dark": "#1B3A1F",
            "--color-on-dark": "#FFFFFF",
            "--font-display": "'IBM Plex Sans Hebrew', Arial, sans-serif",
            "--font-body": "'Noto Sans Hebrew', Arial, sans-serif",
            "--display-weight": "600",
            "--display-tracking": "-0.01em",
            "--radius-control": "6px",
            "--radius-card": "10px",
            "--btn-height": "46px",
            "--btn-pad": "1.25rem",
            "--btn-weight": "600",
            "--btn-border-width": "0px",
            "--field-bw": "1px",
            "--field-bw-strong": "2px",
            "--field-radius": "6px",
            "--card-border": "1px solid #DCE8D2",
            "--card-shadow": "0 1px 2px rgba(27, 58, 31, .08), 0 4px 14px rgba(27, 58, 31, .06)",
            "--card-media": "repeating-linear-gradient(90deg, #2E7D32 0 2px, transparent 2px 28px), linear-gradient(160deg, #C8E6C9, #4CAF50)",
        },
        "contrast": [
            ("#FFFFFF", "#2E7D32", "טקסט כפתור ראשי", "text"),
            ("#FFFFFF", "#1B5E20", "טקסט כפתור ראשי במעבר עכבר", "text"),
            ("#1565C0", "#FFFFFF", "קישור וכפתור משני", "text"),
            ("#212121", "#FF9800", "טקסט על כפתור ענבר", "text"),
            ("#212121", "#F1F8E9", "גוף טקסט על רקע כרטיס", "text"),
            ("#5C5C5C", "#F1F8E9", "טקסט משני על רקע כרטיס", "text"),
            ("#8A8A8A", "#FFFFFF", "גבול שדה טופס", "ui"),
            ("#C62828", "#FFFFFF", "הודעת שגיאה", "text"),
        ],
        "draft_contrast": [
            ("#FFFFFF", "#4CAF50", "טקסט לבן על כפתור ירוק עלה (בטיוטה: ‎4.9:1)", "text"),
            ("#FFFFFF", "#81C784", "טקסט לבן על מצב מעבר עכבר שבטיוטה", "text"),
            ("#CCCCCC", "#FFFFFF", "גבול שדה #CCCCCC שבטיוטה", "ui"),
        ],
        "fonts": {
            "rec": ("IBM Plex Sans Hebrew", "Noto Sans Hebrew",
                    "הנדסי ומדויק בכותרות, ניטרלי וקריא מאוד בגוף. שתי המשפחות תומכות בעברית ובלטינית, ו-Arial מחזיק כגיבוי."),
            "google": "family=IBM+Plex+Sans+Hebrew:wght@400;600;700&family=Noto+Sans+Hebrew:wght@400..700",
            "alts": [
                ("Alef + Arial", "תקין. Alef תומך בעברית, Arial זמין בכל מערכת."),
                ("Inter + Noto Sans Hebrew", "Inter לא כולל עברית. אפשרי רק אם Inter משמש לטקסט לטיני ומספרים, ו-Noto Sans Hebrew לכל השאר."),
                ("IBM Plex Sans + Noto Serif", "שתיהן בלי עברית. מחליפים ב-IBM Plex Sans Hebrew ו-Noto Serif Hebrew."),
            ],
        },
        "logo": [
            "סימן גיאומטרי: מבנה חממה בקו אחד ועלה זוויתי בתוכו. קצוות חדים, עובי קו אחיד.",
            "גרסאות: אופקית (סימן מימין לשם), אנכית (סימן מעל השם), סימן לבד לאייקון אפליקציה ופביקון.",
            "על רקע בהיר: צבע מלא. על רקע כהה: לבן בגוון אחד. אין לשים את הסימן על צילום עמוס בלי משטח.",
            "רווח בטוח: גובה הגג של הסימן מכל צד. גודל מינימלי: 24 פיקסלים לסימן, 96 פיקסלים לגרסה האופקית.",
        ],
        "icons": "קו 1.5 פיקסלים, פינות חדות, צורות גיאומטריות. אייקון בצבע הטקסט, ונקודת הדגשה אחת בירוק עלה מותרת באייקונים מעל 32 פיקסלים.",
        "photo": {
            "shots": [
                ("חממה מודרנית בשעת אור נמוך", "הקונסטרוקציה ומסכי ההצללה בפריים, הגידול בפוקוס. אור טבעי, גוון ניטרלי-קריר."),
                ("תקריב על בקר או חיישן", "על רקע עלים מטושטש. מראה שהטכנולוגיה אמיתית ונמצאת בשטח."),
                ("אנשי מקצוע בעבודה", "מהנדס או חקלאית בודקים לוח בקרה. אנשים אמיתיים מהפרויקטים, לא סטוק מחייך למצלמה."),
            ],
            "avoid": "הדמיות עם זוהר מלאכותי, הולוגרמות, ירוק רווי מדי, צילומי סטוק של \"עתיד\" שאין להם קשר לחקלאות.",
        },
        "voice": {"פורמליות": 4, "הומור": 1, "כבוד": 4, "התלהבות": 3},
        "voice_note": "מקצועי ובטוח, בלי ז'רגון מיותר. מספרים במקום סופרלטיבים: \"קירור של עד 6 מעלות\" במקום \"פתרון פורץ דרך\". פנייה ברבים, משפטים קצרים.",
        "micro": [
            ("כפתור ראשי", "תיאום סיור בחממה"),
            ("כפתור משני", "הורדת מפרט טכני"),
            ("תווית שדה ועזרה", "שטח החממה (מ״ר) · אפשר הערכה, נדייק בסיור."),
            ("שגיאה", "חסר מספר טלפון. בלי מספר לא נוכל לתאם סיור."),
            ("הצלחה", "הבקשה נשלחה. מהנדס יחזור אליכם עד סוף יום העבודה הבא."),
            ("טעינה", "מחשבים עומס הצללה…"),
            ("מצב ריק", "עוד לא שמרתם פרויקט. התחילו בהגדרת שטח וסוג גידול."),
        ],
        "brief": {
            "goal": "שהלקוח ירגיש שהוא מקבל ידע הנדסי ושותף לטווח ארוך, לא רק ספק מבנה.",
            "emotions": "ביטחון, סקרנות, אופטימיות מדודה. הירוק מחבר לצמיחה, הכחול לאמינות, הענבר מסמן את הצעד הבא.",
            "behaviors": "קריאת מפרט, הורדת קובץ, תיאום סיור. המטרה היא פנייה מושכלת, לא לחיצה אימפולסיבית.",
            "risks": "מראה קר מדי שמרחיק מנהלי בתי ספר. ריבוי נתונים בלי הקשר.",
            "hypotheses": [
                ("נתונים מדידים בפלטה ירוקה-כחולה מעלים אמון לעומת אותו תוכן בפלטה ניטרלית.",
                 "A/B על דף נחיתה מול חקלאים ומנהלי משקים.",
                 "ציון אמון בסולם 1–7, שיעור לחיצה על תיאום סיור."),
                ("טון רשמי-מתון נתפס מקצועי בלי להיתפס מנוכר.",
                 "מבחן חמש שניות ושאלון תיאור חופשי.",
                 "שכיחות המילים \"מקצועי\" לעומת \"קר\" או \"מסובך\"."),
            ],
        },
        "fixes": [
            "טקסט לבן על #4CAF50 נותן 2.78:1, לא 4.9:1 כמו בטיוטה, ונכשל ב-AA. כפתור ראשי עבר ל-#2E7D32 (5.13:1), ו-#4CAF50 נשאר לאיורים.",
            "מצב מעבר עכבר #81C784 (2.01:1) הוחלף בגוון כהה יותר, #1B5E20 (7.87:1). מעבר עכבר מכהה ולא מבהיר.",
            "גבול שדה #CCCCCC (1.61:1) לא עומד ב-3:1 של רכיבי ממשק. הוחלף ב-#8A8A8A.",
            "Inter ו-IBM Plex Sans לא כוללים עברית. הוחלפו ב-IBM Plex Sans Hebrew ו-Noto Sans Hebrew.",
            "\"בצע!\" אינו אומר מה יקרה. כל כפתור נקרא בשם הפעולה שלו.",
        ],
    },
    {
        "id": "eco-natural",
        "he": "טבעי וידידותי",
        "en": "Eco-Natural",
        "mood": "אדמה, שמש ובד. חם, ביתי, מזמין לגעת.",
        "audience": "חקלאים במשקים משפחתיים, גננים, מורים והורים, רשויות שמחפשות פתרון ירוק וקהילתי.",
        "hero_title": "חממה שגדלה יחד איתכם",
        "hero_sub": "חממות למשקים משפחתיים והצללה טבעית לחצרות בתי ספר. מתכננים איתכם, בונים אצלכם.",
        "cta1": "בואו נתכנן יחד",
        "cta2": "לראות פרויקטים שבנינו",
        "palette": [
            ("ירוק נבט", "#8BC34A", "מילוי כפתור ראשי עם טקסט חום כהה, אייקונים, הדגשות."),
            ("צהוב שמש", "#FFEB3B", "סימון והדגשה ברקע בלבד (מרקר, תגית). לא לגבולות ולא לטקסט."),
            ("חום אדמה", "#795548", "גבולות שדות, כפתור משני, כותרות קטנות."),
            ("קרם", "#FFF8E1", "רקע הדף."),
            ("תכלת שמיים", "#64B5F6", "איורים ורקעים בלבד. ניגודיות נמוכה מול קרם."),
        ],
        "tokens": {
            "--color-bg": "#FFF8E1",
            "--color-surface": "#FFFFFF",
            "--color-field-bg": "#FFFFFF",
            "--color-text": "#4E342E",
            "--color-text-muted": "#6D4C41",
            "--color-border": "#795548",
            "--color-border-subtle": "#EADDBE",
            "--color-primary": "#8BC34A",
            "--color-primary-hover": "#7CB342",
            "--color-on-primary": "#3E2723",
            "--color-secondary": "#5D4037",
            "--color-secondary-hover-bg": "#F3E9CF",
            "--color-accent": "#FFEB3B",
            "--color-accent-hover": "#FFF176",
            "--color-on-accent": "#4E342E",
            "--color-link": "#33691E",
            "--color-focus": "#33691E",
            "--color-error": "#C62828",
            "--color-success": "#33691E",
            "--color-disabled-bg": "#EFE6D2",
            "--color-disabled-text": "#8D7B70",
            "--color-progress": "#33691E",
            "--color-progress-track": "#EADDBE",
            "--color-decor": "#64B5F6",
            "--color-dark": "#4E342E",
            "--color-on-dark": "#FFF8E1",
            "--font-display": "'Rubik', Tahoma, Arial, sans-serif",
            "--font-body": "'Open Sans', Tahoma, Arial, sans-serif",
            "--display-weight": "600",
            "--display-tracking": "0",
            "--radius-control": "14px",
            "--radius-card": "20px",
            "--btn-height": "48px",
            "--btn-pad": "1.4rem",
            "--btn-weight": "600",
            "--btn-border-width": "0px",
            "--field-bw": "1.5px",
            "--field-bw-strong": "2.5px",
            "--field-radius": "12px",
            "--card-border": "0",
            "--card-shadow": "0 2px 0 #EADDBE, 0 8px 24px rgba(78, 52, 46, .08)",
            "--card-media": "radial-gradient(circle at 78% 28%, #FFEB3B 0 11%, transparent 12%), radial-gradient(ellipse at 30% 120%, #8BC34A 0 45%, transparent 46%), linear-gradient(#BBDEFB, #E3F2FD)",
        },
        "contrast": [
            ("#3E2723", "#8BC34A", "טקסט כפתור ראשי", "text"),
            ("#3E2723", "#7CB342", "טקסט כפתור ראשי במעבר עכבר", "text"),
            ("#4E342E", "#FFF8E1", "גוף טקסט על קרם", "text"),
            ("#6D4C41", "#FFF8E1", "טקסט משני על קרם", "text"),
            ("#33691E", "#FFF8E1", "קישור", "text"),
            ("#795548", "#FFFFFF", "גבול שדה טופס", "ui"),
            ("#4E342E", "#FFEB3B", "טקסט על תגית צהובה", "text"),
            ("#C62828", "#FFF8E1", "הודעת שגיאה", "text"),
        ],
        "draft_contrast": [
            ("#FFEB3B", "#FFF8E1", "גבול כפתור צהוב על קרם (בטיוטה)", "ui"),
            ("#8BC34A", "#FFF8E1", "גבול שדה ירוק בהיר על קרם (בטיוטה)", "ui"),
            ("#64B5F6", "#FFF8E1", "תכלת כצבע טקסט", "text"),
        ],
        "fonts": {
            "rec": ("Rubik", "Open Sans",
                    "Rubik עגלגל ונעים בכותרות, Open Sans פתוח וקריא בגוף. לשתיהן יש עברית, ו-Tahoma ו-Arial הם הגיבוי."),
            "google": "family=Rubik:wght@400..700&family=Open+Sans:wght@400..700",
            "alts": [
                ("Assistant + Tahoma", "תקין. Assistant קל ושקט יותר מ-Rubik. Tahoma זמין בווינדוס וחסר במק, לכן מוסיפים Arial."),
                ("PT Serif + Arial", "ל-PT Serif אין עברית. לסריף רך בעברית: Frank Ruhl Libre."),
                ("Rubik + Open Sans", "מומלץ, ראו למעלה."),
            ],
        },
        "logo": [
            "סימן אורגני: עלה מעוגל ושמש מעליו. אין קווים ישרים בסימן.",
            "על קרם או לבן: עלה ירוק ושמש צהובה עם קו מתאר חום, כדי שהשמש לא תיעלם על הרקע. על חום אדמה: הסימן בקרם.",
            "מרקמים (עץ, בד, דשא) רק מאחורי הלוגו על משטח אחיד, לא ישירות מתחתיו.",
            "רווח בטוח: קוטר השמש מכל צד. גודל מינימלי: 28 פיקסלים לסימן.",
        ],
        "icons": "קו 2 פיקסלים, קצוות ופינות מעוגלים, צורות שנראות כמו נשרטטו ביד יציבה. אייקון בחום כהה, מילוי ירוק נבט מותר בתוך הצורה.",
        "photo": {
            "shots": [
                ("שורות גידול בתוך חממה", "אור רך מפוזר דרך היריעה. עומק שדה רדוד, צבעים חמימים וטבעיים."),
                ("ידיים ואדמה", "שתילה, קטיף, ילד ומבוגר עובדים יחד. הידיים בפוקוס, הפנים לא חייבות להופיע."),
                ("חצר בית ספר בצל בד", "שעת צהריים, צל מלא על הספסלים. רואים שהצל עובד."),
            ],
            "avoid": "ירוק רווי מפילטרים, צילומי מאקרו של טיפות מים בלי הקשר, משפחות סטוק בשדה חיטה.",
        },
        "voice": {"פורמליות": 2, "הומור": 2, "כבוד": 4, "התלהבות": 4},
        "voice_note": "חם, מזמין ופשוט. גוף ראשון רבים (\"אנחנו\", \"בואו\") ופנייה ישירה ברבים. משפטים קצרים, מילים מהשטח ולא מהקטלוג.",
        "micro": [
            ("כפתור ראשי", "בואו נתכנן יחד"),
            ("כפתור משני", "לראות פרויקטים שבנינו"),
            ("תווית שדה ועזרה", "מה תרצו לגדל? · ירקות, תבלינים או שתילים. כל תשובה עוזרת."),
            ("שגיאה", "חסר @ בכתובת המייל. תקנו ונמשיך."),
            ("הצלחה", "קיבלנו! נחזור אליכם השבוע עם הצעה ראשונה."),
            ("טעינה", "רגע, אוספים את הפרטים…"),
            ("מצב ריק", "עוד אין כאן תמונות מהחממה שלכם. העלו את הראשונה."),
        ],
        "brief": {
            "goal": "שהלקוח ירגיש שבונים איתו ולא בשבילו, ושהחממה או הצל הם חלק מהבית ומהקהילה.",
            "emotions": "חמימות, שייכות, רוגע. צבעי אדמה ושמש מורידים את תחושת \"רכישה גדולה ומלחיצה\".",
            "behaviors": "השארת פרטים, שיתוף עם בני משפחה או ועד הורים, חזרה לאתר לראות פרויקטים.",
            "risks": "מראה \"חובבני\" שמעורר ספק ביכולת לבצע פרויקט גדול. קרם וצהוב שמחלישים קריאות.",
            "hypotheses": [
                ("ניסוח חם בגוף ראשון רבים מעלה השלמת טופס פנייה.",
                 "A/B על מיקרוקופי בלבד, אותו עיצוב.",
                 "שיעור השלמת טופס, זמן עד שליחה."),
                ("פינות מעוגלות וצבעי אדמה מורידים חרדת החלטה בלי לפגוע באמון ביכולת.",
                 "SAM (Self-Assessment Manikin) לפני ואחרי צפייה, ושאלת אמון.",
                 "ערכיות ועוררות בסולם SAM, ציון אמון 1–7."),
            ],
        },
        "fixes": [
            "גבול כפתור צהוב על קרם (1.15:1) וגבול ירוק בהיר (1.98:1) לא נראים. גבולות שדות עברו לחום #795548, וכפתור ראשי מלא בירוק נבט עם טקסט חום כהה.",
            "תכלת #64B5F6 נשאר לאיורים בלבד: 2.08:1 מול קרם.",
            "ל-PT Serif אין עברית. הסריף החלופי הוא Frank Ruhl Libre.",
            "\"לא לדלג על הכניסה\" לא ברור למשתמש. הוחלף במשפטים שאומרים מה קורה עכשיו ומה הלאה.",
        ],
    },
    {
        "id": "sunshine",
        "he": "ילדים וחינוך",
        "en": "Sunshine Learning",
        "mood": "שמש, צבע ומשחק. שמח וקליל, אבל ברור לגמרי.",
        "audience": "מנהלי בתי ספר וגני ילדים, רכזי קיימות, ועדי הורים ורשויות חינוך. הילדים רואים את המותג, המבוגרים מחליטים.",
        "hero_title": "יאללה, בונים צל לחצר",
        "hero_sub": "מפרשי צל, פרגולות וחממות לימודיות לבתי ספר ולגנים. בטוח, צבעוני ומתאים לתקן.",
        "cta1": "בונים צל לחצר",
        "cta2": "שאלו אותנו שאלה",
        "palette": [
            ("צהוב שמש", "#FFEB3B", "מילוי כפתור ראשי עם טקסט שחור ומסגרת כהה, שמש בלוגו."),
            ("טורקיז", "#00BCD4", "כפתור משני ומפרשי צל באיורים. טקסט כהה בלבד."),
            ("כתום קיץ", "#FF9800", "איורים ומדבקות. לפס התקדמות משתמשים בגוון הכהה #E65100."),
            ("שמנת", "#FFFDE7", "רקע הדף."),
            ("ירוק טרופי", "#4CAF50", "עלים ודשא באיורים, אייקון הצלחה גדול."),
        ],
        "tokens": {
            "--color-bg": "#FFFDE7",
            "--color-surface": "#FFFFFF",
            "--color-field-bg": "#FFFFFF",
            "--color-text": "#212121",
            "--color-text-muted": "#5D5D5D",
            "--color-border": "#00838F",
            "--color-border-subtle": "#FFF3B0",
            "--color-primary": "#FFEB3B",
            "--color-primary-hover": "#FFF176",
            "--color-on-primary": "#212121",
            "--color-secondary": "#212121",
            "--color-secondary-bg": "#00BCD4",
            "--color-secondary-hover-bg": "#26C6DA",
            "--color-accent": "#FF9800",
            "--color-accent-hover": "#FFA726",
            "--color-on-accent": "#212121",
            "--color-link": "#006064",
            "--color-focus": "#212121",
            "--color-error": "#B71C1C",
            "--color-success": "#1B5E20",
            "--color-disabled-bg": "#EEEEEE",
            "--color-disabled-text": "#757575",
            "--color-progress": "#E65100",
            "--color-progress-track": "#FFF3B0",
            "--color-decor": "#4CAF50",
            "--color-dark": "#006064",
            "--color-on-dark": "#FFFDE7",
            "--btn-border-color": "#212121",
            "--font-display": "'Fredoka', 'Varela Round', Arial, sans-serif",
            "--font-body": "'Varela Round', Arial, sans-serif",
            "--display-weight": "600",
            "--display-tracking": "0",
            "--radius-control": "999px",
            "--radius-card": "24px",
            "--btn-height": "52px",
            "--btn-pad": "1.6rem",
            "--btn-weight": "600",
            "--btn-border-width": "2px",
            "--field-bw": "2px",
            "--field-bw-strong": "3px",
            "--field-radius": "16px",
            "--card-border": "2px solid #212121",
            "--card-shadow": "4px 4px 0 #212121",
            "--card-media": "radial-gradient(circle at 22% 30%, #FFEB3B 0 13%, transparent 14%), linear-gradient(160deg, transparent 52%, #00BCD4 53% 70%, transparent 71%), linear-gradient(#FFE0B2, #FFF8E1)",
        },
        "contrast": [
            ("#212121", "#FFEB3B", "טקסט כפתור ראשי", "text"),
            ("#212121", "#00BCD4", "טקסט כפתור משני", "text"),
            ("#212121", "#FFFDE7", "גוף טקסט", "text"),
            ("#5D5D5D", "#FFFDE7", "טקסט משני", "text"),
            ("#006064", "#FFFDE7", "קישור", "text"),
            ("#00838F", "#FFFFFF", "גבול שדה טופס", "ui"),
            ("#E65100", "#FFFDE7", "פס התקדמות", "ui"),
            ("#B71C1C", "#FFFDE7", "הודעת שגיאה", "text"),
        ],
        "draft_contrast": [
            ("#FFFFFF", "#FFEB3B", "טקסט לבן על צהוב", "text"),
            ("#FFFFFF", "#00BCD4", "טקסט לבן על טורקיז", "text"),
            ("#FF9800", "#FFFDE7", "פס התקדמות כתום על שמנת (בטיוטה)", "ui"),
        ],
        "fonts": {
            "rec": ("Fredoka", "Varela Round",
                    "Fredoka עגול ומודגש בכותרות, Varela Round עגול ושקט בגוף. גובה x דומה, ושתיהן כוללות עברית."),
            "google": "family=Fredoka:wght@400..700&family=Varela+Round",
            "alts": [
                ("Fredoka One + Helvetica", "Fredoka One הישן בלי עברית, ו-Helvetica בלי עברית בווינדוס. משתמשים ב-Fredoka המשתנה."),
                ("Rubik + Verdana", "Rubik תקין. ל-Verdana אין עברית והדפדפן יחליף אותה בגופן אחר. גוף: Varela Round או Assistant."),
                ("Assistant + Open Sans", "תקין. פחות משחקי, מתאים למסמכים למנהלים."),
            ],
        },
        "logo": [
            "סימן: שמש עם קרניים מעל מפרש צל משולש. צבעים מלאים עם קו מתאר כהה, כמו מדבקה.",
            "הקו הכהה הוא חלק מהסימן: בלעדיו השמש הצהובה נעלמת על רקע בהיר.",
            "על רקע טורקיז כהה: מילויים בלבד בלי קו מתאר.",
            "רווח בטוח: קוטר השמש מכל צד. גודל מינימלי: 32 פיקסלים, כי הקרניים נעלמות בגודל קטן יותר.",
        ],
        "icons": "איור שטוח: צורות מלאות בצבעי הפלטה וקו מתאר שחור בעובי 2 פיקסלים. פינות עגולות. אייקון לבד תמיד עם תווית טקסט.",
        "photo": {
            "shots": [
                ("ילדים משחקים בצל", "מתחת למפרש צבעוני, שעת צהריים. מצלמים רק בהסכמה כתובה של ההורים, ועדיף מגב או מרחוק."),
                ("מבט מלמעלה על החצר", "צילום רחפן שמראה את הצל על הדשא והמגרש. מראה היקף בלי פנים מזוהות."),
                ("מורה וכיתה בחממה לימודית", "ידיים בשתילים, שלטי שם על ערוגות. מראה את הערך החינוכי."),
            ],
            "avoid": "פנים של ילדים בלי אישור, תמונות סטוק של ילדים מבוימים, אפקטים של קשת וברק.",
        },
        "voice": {"פורמליות": 1, "הומור": 4, "כבוד": 3, "התלהבות": 5},
        "voice_note": "שמח וקליל, אבל קורא אותו מבוגר שמאשר תקציב. משפט אחד, מילה פשוטה, פנייה ברבים (\"למדו עוד\" ולא \"למד עוד\"). בלי >> וחצים בטקסט הכפתור.",
        "micro": [
            ("כפתור ראשי", "בונים צל לחצר"),
            ("כפתור משני", "שאלו אותנו שאלה"),
            ("תווית שדה ועזרה", "כמה ילדים משחקים בחצר? · מספר משוער מספיק."),
            ("שגיאה", "חסר שם בית הספר. כתבו אותו כאן ונמשיך."),
            ("הצלחה", "יש! הבקשה אצלנו. נתקשר לתאם ביקור בחצר."),
            ("טעינה", "מותחים את הצל…"),
            ("מצב ריק", "עוד אין פינות צל ברשימה. הוסיפו את הראשונה."),
        ],
        "brief": {
            "goal": "שהמורה וההורה יראו חצר מוגנת ושמחה, ושהמנהל יראה פרויקט בטוח שאפשר להציג לוועדה.",
            "emotions": "שמחה, ביטחון, גאווה בבית הספר. הצהוב מעורר חמימות, המסגרת הכהה מוסיפה יציבות.",
            "behaviors": "שיתוף עם ועד ההורים, שליחת שאלה, בקשת ביקור בחצר.",
            "risks": "המנהל שמאשר תקציב עלול לראות בטון הקליל חוסר רצינות. עומס צבעים שמקשה על קריאה.",
            "hypotheses": [
                ("פלטה חמה ואיורים מעלים את הנכונות של מורים להציג את הפרויקט להורים.",
                 "ראיונות עומק עם מורים ורכזי קיימות, ומבחן העדפה בין שני קונספטים.",
                 "בחירה במבחן ההעדפה, נכונות לשתף בסולם 1–7."),
                ("טון לא רשמי לא פוגע באמון של מנהלים שמאשרים תקציב.",
                 "מבחן מול מנהלי בתי ספר: אותו תוכן בטון קליל ובטון רשמי.",
                 "ציון אמון, נכונות להעביר לוועדה."),
            ],
            "ethics": "בדיקות ישירות עם ילדים רק בהסכמת הורים ובאישור בית הספר. ברוב השאלות כאן מספיק לבדוק עם המבוגרים.",
        },
        "fixes": [
            "טקסט לבן על צהוב (1.22:1) ועל טורקיז (2.30:1) לא קריא. כל הטקסט על צבעים בהירים בשחור #212121.",
            "פס התקדמות כתום #FF9800 על שמנת (2.10:1) לא נראה מספיק. עבר לגוון הכהה #E65100.",
            "ל-Fredoka One ול-Verdana אין עברית. Fredoka המשתנה ו-Varela Round כן.",
            "\"למד עוד >>\" בלשון זכר יחיד ועם חצים. עבר לרבים ובלי סימנים.",
            "\"פליילסטיישן\" הוחלף במה שהכוונה אליו: משחקיות ויצירתיות.",
        ],
    },
    {
        "id": "industrial",
        "he": "תעשייתי ומקצועי",
        "en": "Industrial Tech",
        "mood": "פלדה, זכוכית ושרטוט הנדסי. ענייני, מדויק, בלי קישוט.",
        "audience": "משקים גדולים, חברות חקלאות, רשויות ומוסדות שמוציאים מכרזים, מהנדסים ואנשי רכש.",
        "hero_title": "מבנים חקלאיים בהיקף תעשייתי",
        "hero_sub": "חממות פלדה וזכוכית, מערכות הצללה למוסדות. תכנון הנדסי, ביצוע ושירות.",
        "cta1": "בקשת הצעת מחיר",
        "cta2": "מפרט הנדסי (PDF)",
        "palette": [
            ("אפור פלדה", "#546E7A", "טקסט משני, גבול תחתון לשדות, קווי שרטוט."),
            ("גרפיט", "#263238", "טקסט, מילוי כפתור ראשי, רקעים כהים."),
            ("ענבר אזהרה", "#FFA000", "קריאה לפעולה ומצב פעיל. על גרפיט או עם טקסט גרפיט בלבד."),
            ("לבן קר", "#ECEFF1", "רקע הדף."),
            ("ירוק רענן", "#8BC34A", "סימון \"פעיל/תקין\" ונגיעה של טבע, רק על רקע גרפיט."),
        ],
        "tokens": {
            "--color-bg": "#ECEFF1",
            "--color-surface": "#FFFFFF",
            "--color-field-bg": "transparent",
            "--color-text": "#263238",
            "--color-text-muted": "#455A64",
            "--color-border": "#546E7A",
            "--color-border-subtle": "#CFD8DC",
            "--color-primary": "#263238",
            "--color-primary-hover": "#37474F",
            "--color-on-primary": "#FFFFFF",
            "--color-secondary": "#263238",
            "--color-secondary-hover-bg": "#CFD8DC",
            "--color-accent": "#FFA000",
            "--color-accent-hover": "#FFB300",
            "--color-on-accent": "#263238",
            "--color-link": "#263238",
            "--color-focus": "#263238",
            "--color-error": "#C62828",
            "--color-success": "#33691E",
            "--color-disabled-bg": "#CFD8DC",
            "--color-disabled-text": "#607D8B",
            "--color-progress": "#FFA000",
            "--color-progress-track": "#263238",
            "--color-decor": "#8BC34A",
            "--color-dark": "#263238",
            "--color-on-dark": "#ECEFF1",
            "--font-display": "'Noto Sans Hebrew', Arial, sans-serif",
            "--font-body": "'IBM Plex Sans Hebrew', Arial, sans-serif",
            "--font-data": "'IBM Plex Mono', 'IBM Plex Sans Hebrew', monospace",
            "--display-weight": "700",
            "--display-stretch": "75%",
            "--display-tracking": "0",
            "--radius-control": "2px",
            "--radius-card": "0",
            "--btn-height": "44px",
            "--btn-pad": "1.2rem",
            "--btn-weight": "600",
            "--btn-border-width": "0px",
            "--field-bw": "0 0 2px 0",
            "--field-bw-strong": "0 0 3px 0",
            "--field-radius": "0",
            "--card-border": "1px solid #CFD8DC",
            "--card-shadow": "none",
            "--card-media": "linear-gradient(#ECEFF1 1px, transparent 1px) 0 0 / 100% 22px, linear-gradient(90deg, #ECEFF1 1px, transparent 1px) 0 0 / 22px 100%, linear-gradient(#546E7A, #263238)",
        },
        "contrast": [
            ("#FFFFFF", "#263238", "טקסט כפתור ראשי", "text"),
            ("#263238", "#FFA000", "טקסט על כפתור ענבר", "text"),
            ("#263238", "#ECEFF1", "גוף טקסט", "text"),
            ("#455A64", "#ECEFF1", "טקסט משני", "text"),
            ("#546E7A", "#ECEFF1", "קו תחתון של שדה", "ui"),
            ("#FFA000", "#263238", "ענבר על רקע גרפיט", "text"),
            ("#8BC34A", "#263238", "ירוק \"תקין\" על גרפיט", "text"),
            ("#C62828", "#ECEFF1", "הודעת שגיאה", "text"),
        ],
        "draft_contrast": [
            ("#FFA000", "#FFFFFF", "קישור בכתום על לבן (בטיוטה)", "text"),
            ("#FFFFFF", "#FFA000", "טקסט לבן על כפתור ענבר", "text"),
            ("#8BC34A", "#ECEFF1", "ירוק על לבן קר", "text"),
        ],
        "fonts": {
            "rec": ("Noto Sans Hebrew צר", "IBM Plex Sans Hebrew",
                    "Noto Sans Hebrew משתנה ברוחב, ובחיתוך צר (wdth 75) הוא נותן כותרת טכנית בעברית. IBM Plex Sans Hebrew בגוף. ספרות ומידות ב-IBM Plex Mono."),
            "google": "family=Noto+Sans+Hebrew:wdth,wght@62.5..100,400..800&family=IBM+Plex+Sans+Hebrew:wght@400;600&family=IBM+Plex+Mono:wght@500",
            "alts": [
                ("Roboto Condensed + Arial", "ל-Roboto Condensed אין עברית, כך שהכותרות העבריות יוצגו ב-Arial. החלופה: Noto Sans Hebrew צר."),
                ("IBM Plex Mono + Helvetica", "ל-IBM Plex Mono אין עברית. מתאים רק לספרות, מידות וקודי פריט."),
                ("Noto Sans + Verdana", "שתיהן בלי עברית. Noto Sans Hebrew ו-Arial במקומן."),
            ],
        },
        "logo": [
            "סימן: חתך של קונסטרוקציית חממה בקו ישר, עם פס ענבר בבסיס. אין עיקולים.",
            "דו-גוני: אפור פלדה וענבר. על גרפיט: קו בלבן קר, הפס נשאר ענבר.",
            "הלוגו יושב על רשת: גובה הסימן שווה לגובה שתי שורות טקסט.",
            "רווח בטוח: רוחב מפתח אחד של הקונסטרוקציה מכל צד. גודל מינימלי: 24 פיקסלים.",
        ],
        "icons": "קו 2 פיקסלים, קצוות ישרים, זוויות של 90 ו-45 מעלות בלבד, כמו שרטוט. צבע גרפיט, ענבר רק לאייקון של מצב פעיל.",
        "photo": {
            "shots": [
                ("קונסטרוקציה סימטרית", "מבט לאורך חממת פלדה, קווים מתכנסים. אור יום בהיר, גוון קר, חדות גבוהה."),
                ("משק בהיקף גדול מרחפן", "שורות של מבנים, אנשים קטנים בפריים לסקאלה."),
                ("פרטי חיבור", "מאקרו על ברגים, פרופילים ומנגנוני פתיחה. מראה איכות ביצוע."),
            ],
            "avoid": "צילומים כהים ודרמטיים שמסתירים את המבנה, אנשים עם קסדה שמחייכים למצלמה, פילטרים חמים.",
        },
        "voice": {"פורמליות": 5, "הומור": 0, "כבוד": 5, "התלהבות": 1},
        "voice_note": "ענייני ומדויק. שם עצם ופועל, מידות ומספרים, בלי שמות תואר. אין הומור: לקהל הזה הוא נקרא כחוסר רצינות.",
        "micro": [
            ("כפתור ראשי", "בקשת הצעת מחיר"),
            ("כפתור משני", "מפרט הנדסי (PDF)"),
            ("תווית שדה ועזרה", "שטח מבונה (מ״ר) · לפי התוכנית שבידיכם."),
            ("שגיאה", "יש להזין מספר שלם, בלי יחידות."),
            ("הצלחה", "הבקשה התקבלה. מספר פנייה 2041. מענה תוך 2 ימי עבודה."),
            ("טעינה", "טוען נתוני פרויקט…"),
            ("מצב ריק", "אין פרויקטים פעילים. ליצירת פרויקט: \"פרויקט חדש\"."),
        ],
        "brief": {
            "goal": "שהקונה המוסדי ירגיש שמולו גוף הנדסי שעומד בלוחות זמנים ובתקנים.",
            "emotions": "ביטחון, שליטה, מרחק רגשי נמוך. המטרה היא אמינות ולא חיבה.",
            "behaviors": "הורדת מפרט, העברה לגורם מקצועי, בקשת הצעת מחיר מסודרת.",
            "risks": "קר מדי לבתי ספר ולמשקים קטנים. ענבר שנקרא כאזהרה ולא כפעולה.",
            "hypotheses": [
                ("צבעים קרים וטיפוגרפיה צרה מעלים את התפיסה של יעילות ויכולת ביצוע.",
                 "דיפרנציאל סמנטי מול קונספט 1, עם מנהלי רכש ומהנדסים.",
                 "ציוני \"יעיל\", \"אמין\", \"גדול\" בסולם 1–7."),
                ("ספרות מונוספייס בטבלאות מפרט מקצרות את זמן איתור הנתון.",
                 "מבחן משימה: למצוא ערך בטבלה, עם ספרות רגילות ועם מונוספייס.",
                 "זמן לביצוע משימה, שיעור טעויות."),
            ],
        },
        "fixes": [
            "קישור בכתום בהיר על לבן (2.04:1) לא קריא. ענבר משמש רק כמילוי עם טקסט גרפיט או כטקסט על גרפיט.",
            "ל-Roboto Condensed, IBM Plex Mono ו-Noto Sans אין עברית. כותרות ב-Noto Sans Hebrew צר, מונוספייס לספרות בלבד.",
            "ההשערה על \"קריאות גופני מונוספייס\" שונתה: מונוספייס לא ישמש לטקסט עברי, ולכן בודקים רק טבלאות מספרים.",
            "הבדיחה \"אלומיניום זה טוב? זה מתכת!\" הוסרה: היא סותרת את הטון הרשמי של הקונספט.",
        ],
    },
]

COMPARE_ROWS = [
    ("רשמיות", [4, 3, 1, 5]),
    ("חמימות", [4, 5, 5, 1]),
    ("קודים אקולוגיים", [3, 5, 3, 1]),
    ("קודים טכניים ותעשייתיים", [3, 1, 1, 5]),
    ("ידידותי לילדים", [1, 3, 5, 1]),
    ("סקלאביליות (מגוון מוצרים וקהלים)", [5, 4, 2, 5]),
]
LEVEL = {1: "נמוכה", 2: "בינונית-נמוכה", 3: "בינונית", 4: "בינונית-גבוהה", 5: "גבוהה"}

HOURS = [
    ("ניתוח דרישות ומשוב", "16–24", ""),
    ("פלטות צבע וגופנים", "12", ""),
    ("רכיבי UI ודוגמאות, כולל מצבים", "20", ""),
    ("דף תקציר מפורט לכל קונספט", "8", ""),
    ("בדיקות נגישות וניגודיות", "4", "לארבעה קונספטים, עם בדיקת מקלדת וקורא מסך, ההערכה שלנו 8–12."),
    ("פגישות צוות ועריכות", "12", ""),
]
HOURS_MISSING = [
    ("סדנת בעלי עניין: הכנה, הנחיה וסיכום", "8–12"),
    ("בדיקות משתמשים: גיוס, הנחיה וניתוח", "30–40"),
    ("אבטיפוס אינטראקטיבי לדף הבית", "16–24"),
    ("עיצוב לוגו סופי לכיוון שנבחר", "16–30"),
]


# ---------- אייקונים ולוגו (SVG) ----------

ICONS = {
    "eco-tech": {
        "attrs": 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"',
        "צמח": '<path d="M12 21V9"/><path d="M12 14l6-6v5z" fill="var(--color-decor)" stroke="none"/><path d="M12 14l6-6v5z"/><path d="M12 12L6 7v4z"/>',
        "שמש": '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
        "מים": '<path d="M12 3l6 10a6 6 0 0 1-12 0z"/>',
        "הצללה": '<path d="M3 20V10l9-6 9 6v10"/><path d="M3 10h18"/><path d="M8 20v-6h8v6"/>',
    },
    "eco-natural": {
        "attrs": 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"',
        "צמח": '<path d="M12 21V11"/><path d="M12 12c-4 0-6-3-6-6 4 0 6 2 6 6z" fill="var(--color-primary)"/><path d="M12 15c3 0 6-2 6-6-3 0-6 2-6 6z" fill="var(--color-primary)"/>',
        "שמש": '<circle cx="12" cy="12" r="4" fill="var(--color-accent)"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M5.6 18.4l1-1M17.4 6.6l1-1"/>',
        "מים": '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
        "הצללה": '<path d="M3 11c2-4 5-6 9-6s7 2 9 6z" fill="var(--color-primary)"/><path d="M12 11v10"/>',
    },
    "sunshine": {
        "attrs": 'fill="none" stroke="#212121" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"',
        "צמח": '<path d="M12 21V11"/><path d="M12 13c-5 0-7-3-7-7 5 0 7 3 7 7z" fill="#4CAF50"/><path d="M12 15c4 0 7-2 7-6-4 0-7 2-7 6z" fill="#4CAF50"/>',
        "שמש": '<path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/><circle cx="12" cy="12" r="5" fill="#FFEB3B"/>',
        "מים": '<path d="M12 2.5c3.5 4.5 7 7.5 7 11.5a7 7 0 0 1-14 0c0-4 3.5-7 7-11.5z" fill="#00BCD4"/>',
        "הצללה": '<path d="M3 8l18-3-4 9z" fill="#FF9800"/><path d="M4 8v13M19 6v15"/>',
    },
    "industrial": {
        "attrs": 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="butt"',
        "צמח": '<path d="M12 21V8M12 14h5V9M12 11H7V7"/>',
        "שמש": '<rect x="8" y="8" width="8" height="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
        "מים": '<path d="M12 3l6 11-6 7-6-7z"/>',
        "הצללה": '<path d="M2 20h20M4 20v-9l8-6 8 6v9M4 11h16M12 5v15M4 11l8 9 8-9"/>',
    },
}

LOGO_MARKS = {
    "eco-tech": '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 20L24 6l18 14v22H6z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter"/><path d="M24 38V25l9-6v9z" fill="var(--mark-a)"/><path d="M24 38V27l-7-5v8z" fill="var(--mark-b)"/></svg>',
    "eco-natural": '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="32" cy="15" r="8" fill="var(--mark-b)" stroke="var(--mark-line)" stroke-width="2"/><path d="M8 41c0-15 11-24 28-22 0 14-10 22-28 22z" fill="var(--mark-a)" stroke="var(--mark-line)" stroke-width="2" stroke-linejoin="round"/><path d="M11 38c6-6 12-10 19-13" fill="none" stroke="var(--mark-line)" stroke-width="2" stroke-linecap="round"/></svg>',
    "sunshine": '<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="var(--mark-line)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3v4M17 27v2M5 15h4M27 15h2M8.5 6.5l2.8 2.8M22.7 6.5l-2.8 2.8M8.5 23.5l2.8-2.8"/><circle cx="17" cy="15" r="7" fill="var(--mark-b)"/><path d="M6 32l38-12-8 22z" fill="var(--mark-a)"/></g></svg>',
    "industrial": '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M8 38V20l16-12 16 12v18M8 20h32M24 8v30M8 20l16 18 16-18"/></g><rect x="4" y="39" width="40" height="5" fill="var(--mark-a)"/></svg>',
}
MARK_VARS = {
    # צבעי הסימן על רקע בהיר ועל רקע כהה
    "eco-tech": {"light": "--mark-a:#4CAF50;--mark-b:#2E7D32;color:#2E7D32",
                 "dark": "--mark-a:#FFFFFF;--mark-b:#FFFFFF;color:#FFFFFF",
                 "mono": "--mark-a:#212121;--mark-b:#212121;color:#212121"},
    "eco-natural": {"light": "--mark-a:#8BC34A;--mark-b:#FFEB3B;--mark-line:#5D4037;color:#5D4037",
                    "dark": "--mark-a:#8BC34A;--mark-b:#FFEB3B;--mark-line:#FFF8E1;color:#FFF8E1",
                    "mono": "--mark-a:#FFFFFF;--mark-b:#FFFFFF;--mark-line:#4E342E;color:#4E342E"},
    "sunshine": {"light": "--mark-a:#00BCD4;--mark-b:#FFEB3B;--mark-line:#212121;color:#212121",
                 "dark": "--mark-a:#00BCD4;--mark-b:#FFEB3B;--mark-line:#FFFDE7;color:#FFFDE7",
                 "mono": "--mark-a:#FFFFFF;--mark-b:#FFFFFF;--mark-line:#212121;color:#212121"},
    "industrial": {"light": "--mark-a:#FFA000;color:#546E7A",
                   "dark": "--mark-a:#FFA000;color:#ECEFF1",
                   "mono": "--mark-a:#263238;color:#263238"},
}


# ---------- רינדור ----------

def e(s):
    return escape(s, quote=True)


def t(s):
    """טקסט רץ: קודי צבע ויחסים בכיוון שמאל-לימין, כדי שלא יתהפכו בתוך משפט עברי."""
    return re.sub(r"(#[0-9A-Fa-f]{6}|\d+(?:\.\d+)?:1)", r'<bdi dir="ltr">\1</bdi>', e(s))


def icon_svg(cid, name):
    spec = ICONS[cid]
    return f'<svg viewBox="0 0 24 24" width="40" height="40" {spec["attrs"]} aria-hidden="true">{spec[name]}</svg>'


def lockup(cid, variant):
    return (f'<span class="lockup" style="{MARK_VARS[cid][variant]}">'
            f'{LOGO_MARKS[cid]}<span class="lockup__name">שם המותג</span></span>')


def contrast_rows(pairs):
    out = []
    for fg, bg, use, kind in pairs:
        r = contrast(fg, bg)
        ok = r >= THRESHOLD[kind]
        verdict = "עובר" if ok else "נכשל"
        out.append(
            f'<tr class="{"ok" if ok else "fail"}">'
            f'<td><span class="pair" style="color:{fg};background:{bg}">אב</span></td>'
            f'<td>{t(use)}<br><span class="hex">{fg}</span> על <span class="hex">{bg}</span></td>'
            f'<td class="ratio">{r:.2f}:1</td>'
            f'<td>{KIND_LABEL[kind]} · נדרש {THRESHOLD[kind]:g}:1</td>'
            f'<td class="verdict">{verdict}</td></tr>')
    return "\n".join(out)


def meter(value, maximum=5):
    dots = "".join(f'<i class="{"on" if i < value else ""}"></i>' for i in range(maximum))
    return f'<span class="meter" role="img" aria-label="{value} מתוך {maximum}">{dots}</span>'


def render_concept(c, n):
    cid = c["id"]
    swatches = "\n".join(
        f'<li class="swatch"><span class="swatch__chip" style="background:{hx}"></span>'
        f'<span class="swatch__name">{e(name)}</span><span class="hex">{hx}</span>'
        f'<span class="swatch__role">{t(role)}</span></li>'
        for name, hx, role in c["palette"])
    alts = "\n".join(f"<li><strong>{e(p)}</strong>: {e(note)}</li>" for p, note in c["fonts"]["alts"])
    logo_notes = "\n".join(f"<li>{e(x)}</li>" for x in c["logo"])
    icons = "\n".join(f'<li>{icon_svg(cid, nm)}<span>{nm}</span></li>' for nm in ("צמח", "שמש", "מים", "הצללה"))
    shots = "\n".join(
        f'<li class="shot"><div class="shot__frame" style="background:var(--card-media)"></div>'
        f'<h5>{e(t)}</h5><p>{e(d)}</p></li>' for t, d in c["photo"]["shots"])
    voice = "\n".join(f"<li><span>{k}</span>{meter(v)}</li>" for k, v in c["voice"].items())
    micro = "\n".join(f"<tr><th scope=\"row\">{e(k)}</th><td>{e(v)}</td></tr>" for k, v in c["micro"])
    hyp = "\n".join(
        f"<tr><td>{e(h)}</td><td>{e(m)}</td><td>{e(k)}</td></tr>" for h, m, k in c["brief"]["hypotheses"])
    ethics = f'<p class="note">{e(c["brief"]["ethics"])}</p>' if "ethics" in c["brief"] else ""
    fixes = "\n".join(f"<li>{t(x)}</li>" for x in c["fixes"])
    d, b, why = c["fonts"]["rec"]

    return f'''
<section class="concept" id="{cid}" data-concept="{cid}" aria-labelledby="{cid}-title">
  <div class="concept__hero">
    <div class="wrap">
      <p class="concept__index">קונספט {n} מתוך 4 · {c["en"]}</p>
      <h2 id="{cid}-title" class="concept__title">{e(c["he"])}</h2>
      <p class="concept__mood">{e(c["mood"])}</p>
      <div class="mock" aria-label="הדמיית פתיח של אתר בקונספט {e(c["he"])}">
        <div class="mock__bar">{lockup(cid, "light")}<span class="mock__nav">חממות · הצללה · פרויקטים · צור קשר</span></div>
        <div class="mock__body">
          <div>
            <p class="mock__title">{e(c["hero_title"])}</p>
            <p class="mock__sub">{e(c["hero_sub"])}</p>
            <div class="row">
              <a class="gh-btn gh-btn--primary" href="#{cid}-ui">{e(c["cta1"])}</a>
              <a class="gh-btn gh-btn--secondary" href="#{cid}-ui">{e(c["cta2"])}</a>
            </div>
          </div>
          <div class="mock__media" style="background:var(--card-media)"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="wrap concept__spec">
    <div class="block">
      <h3>קהל ומצב רוח</h3>
      <div><p>{e(c["audience"])}</p></div>
    </div>

    <div class="block">
      <h3>צבעים</h3>
      <div><ul class="swatches">{swatches}</ul></div>
    </div>

    <div class="block">
      <h3>ניגודיות</h3>
      <div>
        <div class="table-scroll"><table class="contrast">
          <caption>הצירופים שבשימוש בקונספט. מחושב לפי WCAG 2.1.</caption>
          <thead><tr><th scope="col"><span class="sr">דוגמה</span></th><th scope="col">שימוש</th><th scope="col">יחס</th><th scope="col">סוג וסף</th><th scope="col">AA</th></tr></thead>
          <tbody>{contrast_rows(c["contrast"])}</tbody>
        </table></div>
        <details class="draft">
          <summary>צירופים מהטיוטה שלא עומדים בתקן</summary>
          <div class="table-scroll"><table class="contrast">
            <thead><tr><th scope="col"><span class="sr">דוגמה</span></th><th scope="col">שימוש</th><th scope="col">יחס</th><th scope="col">סוג וסף</th><th scope="col">AA</th></tr></thead>
            <tbody>{contrast_rows(c["draft_contrast"])}</tbody>
          </table></div>
        </details>
      </div>
    </div>

    <div class="block">
      <h3>טיפוגרפיה</h3>
      <div>
        <div class="type-specimen">
          <p class="type-specimen__display">{e(c["hero_title"])}</p>
          <p class="type-specimen__body">{e(c["hero_sub"])} מערכת קירור, יריעות פוליאתילן ובקרת השקיה. 0123456789 m² · 38°C</p>
          <p class="type-specimen__label">כותרות: {e(d)} · גוף: {e(b)}</p>
        </div>
        <p>{e(why)}</p>
        <h4>חלופות מהטיוטה ותמיכה בעברית</h4>
        <ul class="list">{alts}</ul>
      </div>
    </div>

    <div class="block">
      <h3>לוגו וסימן</h3>
      <div>
        <div class="logos">
          <div class="logo-tile logo-tile--light">{lockup(cid, "light")}</div>
          <div class="logo-tile logo-tile--dark">{lockup(cid, "dark")}</div>
          <div class="logo-tile logo-tile--mono">{lockup(cid, "mono")}</div>
        </div>
        <p class="note">"שם המותג" הוא מקום שמור. הסימנים הם סקיצת כיוון ולא לוגו סופי.</p>
        <ul class="list">{logo_notes}</ul>
      </div>
    </div>

    <div class="block" id="{cid}-ui">
      <h3>רכיבי ממשק</h3>
      <div class="ui">
        <div class="ui__group">
          <h4>כפתורים</h4>
          <div class="table-scroll"><div class="state-grid">
            <span>רגיל</span><span>מעבר עכבר</span><span>פוקוס</span><span>מושבת</span>
            <button class="gh-btn gh-btn--primary" type="button">{e(c["cta1"])}</button>
            <button class="gh-btn gh-btn--primary is-hover" type="button" tabindex="-1">{e(c["cta1"])}</button>
            <button class="gh-btn gh-btn--primary is-focus" type="button" tabindex="-1">{e(c["cta1"])}</button>
            <button class="gh-btn gh-btn--primary" type="button" disabled>{e(c["cta1"])}</button>
            <button class="gh-btn gh-btn--secondary" type="button">{e(c["cta2"])}</button>
            <button class="gh-btn gh-btn--secondary is-hover" type="button" tabindex="-1">{e(c["cta2"])}</button>
            <button class="gh-btn gh-btn--secondary is-focus" type="button" tabindex="-1">{e(c["cta2"])}</button>
            <button class="gh-btn gh-btn--secondary" type="button" disabled>{e(c["cta2"])}</button>
          </div></div>
          <p class="row"><button class="gh-btn gh-btn--accent" type="button">{e(c["micro"][0][1])}</button><span class="note">הדגשה: פעם אחת בעמוד.</span></p>
        </div>
        <div class="ui__group">
          <h4>שדות טופס</h4>
          <div class="fields">
            <div class="gh-field"><label for="{cid}-f1">שם מלא</label><input id="{cid}-f1" type="text" placeholder="למשל: דנה לוי"><span class="gh-hint">כמו שתרצו שנפנה אליכם.</span></div>
            <div class="gh-field"><label for="{cid}-f2">שטח (מ״ר)</label><input id="{cid}-f2" class="is-focus" type="text" value="1200"><span class="gh-hint">מצב פוקוס</span></div>
            <div class="gh-field"><label for="{cid}-f3">טלפון</label><input id="{cid}-f3" type="tel" aria-invalid="true" aria-describedby="{cid}-f3e" value="05"><span class="gh-error" id="{cid}-f3e">{e(c["micro"][3][1])}</span></div>
            <div class="gh-field"><label for="{cid}-f4">מספר פרויקט</label><input id="{cid}-f4" type="text" value="יוקצה אוטומטית" disabled><span class="gh-hint">מצב מושבת</span></div>
          </div>
        </div>
        <div class="ui__group">
          <h4>כרטיס והתקדמות</h4>
          <div class="cards">
            <article class="gh-card">
              <div class="gh-card__media" role="img" aria-label="מקום לצילום פרויקט"></div>
              <div class="gh-card__body">
                <span class="gh-card__meta">2,400 מ״ר · 2025</span>
                <h5 class="gh-card__title">חממת ירקות במושב בעמק</h5>
                <p class="gh-card__text">קונסטרוקציית פלדה, הצללה נפתחת וקירור ברפידות.</p>
                <a href="#{cid}-ui">לפרטי הפרויקט</a>
              </div>
            </article>
            <div class="progress-demo">
              <p>{e(c["micro"][5][1])}</p>
              <div class="gh-progress" role="progressbar" aria-label="התקדמות" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><span style="width:62%"></span></div>
              <p class="gh-success">{e(c["micro"][4][1])}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="block">
      <h3>אייקונים</h3>
      <div><ul class="icons">{icons}</ul><p>{e(c["icons"])}</p></div>
    </div>

    <div class="block">
      <h3>צילום</h3>
      <div>
        <ul class="shots">{shots}</ul>
        <p><strong>להימנע:</strong> {e(c["photo"]["avoid"])}</p>
      </div>
    </div>

    <div class="block">
      <h3>טון ומיקרוקופי</h3>
      <div>
        <ul class="voice">{voice}</ul>
        <p>{e(c["voice_note"])}</p>
        <div class="table-scroll"><table class="micro"><caption>דוגמאות ניסוח</caption><tbody>{micro}</tbody></table></div>
      </div>
    </div>

    <div class="block brief">
      <h3>דף תקציר לעיצוב ולפסיכולוגיה</h3>
      <div>
        <dl class="brief__grid">
          <div><dt>מטרה</dt><dd>{e(c["brief"]["goal"])}</dd></div>
          <div><dt>רגש רצוי</dt><dd>{e(c["brief"]["emotions"])}</dd></div>
          <div><dt>התנהגות רצויה</dt><dd>{e(c["brief"]["behaviors"])}</dd></div>
          <div><dt>סיכונים</dt><dd>{e(c["brief"]["risks"])}</dd></div>
        </dl>
        <div class="table-scroll"><table class="hyp">
          <caption>השערות לבדיקה</caption>
          <thead><tr><th scope="col">השערה</th><th scope="col">שיטה</th><th scope="col">מדד</th></tr></thead>
          <tbody>{hyp}</tbody>
        </table></div>
        {ethics}
      </div>
    </div>

    <div class="block">
      <h3>מה תוקן מהטיוטה</h3>
      <div><ul class="list fixes">{fixes}</ul></div>
    </div>

    <div class="block">
      <h3>טוקנים</h3>
      <div>
        <p>הקובץ <a href="tokens/{cid}.css"><code>tokens/{cid}.css</code></a> מגדיר את כל המשתנים. מוסיפים אותו יחד עם <a href="components.css"><code>components.css</code></a> ושמים <code>data-concept="{cid}"</code> על אלמנט עוטף.</p>
        <pre><code>{e(token_snippet(c))}</code></pre>
      </div>
    </div>
  </div>
</section>'''


def token_snippet(c):
    keys = ["--color-primary", "--color-primary-hover", "--color-on-primary", "--color-secondary",
            "--color-accent", "--color-on-accent", "--color-bg", "--color-text", "--color-border",
            "--font-display", "--font-body"]
    lines = [f'[data-concept="{c["id"]}"] {{']
    lines += [f"  {k}: {c['tokens'][k]};" for k in keys]
    lines.append(f"  /* full list: tokens/{c['id']}.css */")
    lines.append("}")
    return "\n".join(lines)


def token_file(c):
    raw = "\n".join(f"  --brand-{i + 1}: {hx}; /* {name} */" for i, (name, hx, _) in enumerate(c["palette"]))
    sem = "\n".join(f"  {k}: {v};" for k, v in c["tokens"].items())
    return (f'/* {c["he"]} ({c["en"]}): טוקנים. קובץ שנוצר אוטומטית מ-tools/build.py, לא לערוך ביד.\n'
            f'   גופנים: <link rel="stylesheet" href="https://fonts.googleapis.com/css2?{c["fonts"]["google"]}&display=swap"> */\n\n'
            f'[data-concept="{c["id"]}"] {{\n  /* פלטת המותג */\n{raw}\n\n  /* תפקידים */\n{sem}\n}}\n')


def render_compare():
    head = "".join(f'<th scope="col"><a href="#{c["id"]}">{e(c["he"])}</a></th>' for c in CONCEPTS)
    rows = []
    for label, vals in COMPARE_ROWS:
        cells = "".join(f"<td>{meter(v)}<span>{LEVEL[v]}</span></td>" for v in vals)
        rows.append(f'<tr><th scope="row">{e(label)}</th>{cells}</tr>')
    return f'<table class="compare"><thead><tr><td></td>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>'


def render_hours():
    rows = "".join(
        f"<tr><td>{e(t)}</td><td class=\"num\">{h}</td><td>{e(n)}</td></tr>" for t, h, n in HOURS)
    missing = "".join(
        f"<tr class=\"missing\"><td>{e(t)}</td><td class=\"num\">{h}</td><td>לא הוערך בטיוטה. ההערכה שלנו.</td></tr>"
        for t, h in HOURS_MISSING)
    return (f'<table class="hours"><thead><tr><th scope="col">משימה</th><th scope="col">שעות</th><th scope="col">הערה</th></tr></thead>'
            f'<tbody>{rows}<tr class="total"><th scope="row">סה״כ בטיוטה</th><td class="num">72–80</td><td></td></tr>'
            f'{missing}<tr class="total"><th scope="row">סה״כ כולל המשימות החסרות</th><td class="num">142–186</td><td></td></tr></tbody></table>')


def nav_strip():
    items = []
    for c in CONCEPTS:
        chips = "".join(f'<i style="background:{hx}"></i>' for _, hx, _ in c["palette"])
        items.append(f'<li><a href="#{c["id"]}"><span class="strip">{chips}</span>'
                     f'<span class="strip__name">{e(c["he"])}</span><span class="strip__en">{c["en"]}</span></a></li>')
    return "\n".join(items)


def build():
    # כתובת אחת לכל הגופנים בעמוד. כל משפחה מופיעה פעם אחת, אחרת Google Fonts מחזיר שגיאה.
    fonts = "&".join([
        "family=Heebo:wght@400;500;700;800",
        "family=IBM+Plex+Sans+Hebrew:wght@400;600;700",
        "family=Noto+Sans+Hebrew:wdth,wght@62.5..100,400..800",
        "family=Rubik:wght@400..700",
        "family=Open+Sans:wght@400..700",
        "family=Fredoka:wght@400..700",
        "family=Varela+Round",
        "family=IBM+Plex+Mono:wght@500",
    ])
    shell = (ROOT / "tools" / "shell.html").read_text(encoding="utf-8")
    html = (shell
            .replace("{{FONTS}}", fonts)
            .replace("{{NAV}}", nav_strip())
            .replace("{{CONCEPTS}}", "\n".join(render_concept(c, i + 1) for i, c in enumerate(CONCEPTS)))
            .replace("{{COMPARE}}", render_compare())
            .replace("{{HOURS}}", render_hours())
            .replace("{{TOKEN_LINKS}}", "".join(f'<link rel="stylesheet" href="tokens/{c["id"]}.css">' for c in CONCEPTS)))
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    for c in CONCEPTS:
        (ROOT / "tokens" / f'{c["id"]}.css').write_text(token_file(c), encoding="utf-8")

    # בדיקה: כל צירוף שבשימוש חייב לעבור
    failed = [(c["id"], u, round(contrast(f, b), 2)) for c in CONCEPTS for f, b, u, k in c["contrast"]
              if contrast(f, b) < THRESHOLD[k]]
    if failed:
        raise SystemExit(f"צירופים שלא עוברים: {failed}")
    print("נבנה: index.html ו-tokens/*.css. כל הצירופים שבשימוש עוברים AA.")


if __name__ == "__main__":
    build()
