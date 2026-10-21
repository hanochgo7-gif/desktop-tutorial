"""חבילת הפצה: טבלת SEO, פוסטים מוכנים לרשתות, צ'קליסט השקה ואישורים מהבעלים."""
import re, html, pathlib, sys
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import build, articles

SC = (HERE / "social-cro.md").read_text()


def topic_posts(n):
    """מחלץ את שלושת הפוסטים מנושא n בקובץ של אסטרטג השיווק."""
    sec = re.split(r"\n### Topic \d", SC)[n]
    out = {}
    for key, lab in [("fb", r"\*\*Facebook \(Hebrew\)\*\*"), ("ig", r"\*\*Instagram \(Hebrew\)\*\*"), ("li", r"\*\*LinkedIn \(English, investor angle\)\*\*")]:
        m = re.search(lab + r"\n((?:>.*\n?)+)", sec)
        out[key] = "\n".join(l[2:] if l.startswith("> ") else l[1:] for l in m.group(1).strip().split("\n")) if m else ""
    return out


MINE = {
 "beit-reshet-bananot": {
  "fb": """ענף הבננות בישראל עבר ברובו לבתי רשת. השאלה היא כבר לא אם, אלא איך מתכננים מבנה שיחזיק עשור.

הנתונים מעמק הירדן ברורים: בניסוי שפורסם ב-Acta Horticulturae, בננות תחת רשת צרכו מאות מילימטרים פחות מים בשנה לעומת שטח פתוח, בלי פגיעה מובהקת ביבול.

אבל הרשת היא רק חצי מהסיפור. גובה המבנה, העיגון, מתח הכבלים ובחירת הרשת קובעים אם בית הרשת יעבור את סופת החורף הבאה.

במדריך החדש:
✔ מה מראים המחקרים על מים, יבול ואיכות פרי
✔ רשת קריסטל או פנינה, ומה ההבדל בשטח
✔ מה קובע את ההנדסה של בית רשת לבננות
✔ איך עובד המענק של משרד החקלאות

המדריך המלא 👈 [קישור]

מתכננים 50 דונם ומעלה? כתבו לנו: אזור, שטח ומצב המטע, ונחזור עם כיוון ראשון.""",
  "ig": """בננות תחת רשת: פחות מים, פחות נזקי רוח, פרי נקי יותר. 🍌
אבל מה שמחזיק את כל זה הוא המבנה: עמודים, כבלים ועיגון.

בית רשת לבננות בגליל המערבי · רשת 11%
כל רכיב נבדק במפעל שלנו לפני שהוא יוצא לשטח.

המדריך המלא לבתי רשת לבננות: קישור בביו.

#בננות #ביתרשת #בתירשת #חקלאותישראלית #גלילמערבי #עמקהירדן #מטעים #חקלאות #השקיה #מיפתח""",
  "li": """Israel's banana sector has largely moved under net houses. The water data explains why.

In a peer-reviewed Jordan Valley trial (Acta Horticulturae, 2020), bananas under 10–20% shade nets used hundreds of millimetres less irrigation water per year than open field, without a significant yield penalty.

For investors and agri-companies planning tropical or subtropical fruit in hot, windy regions, that is not a detail. It is a structural line in the business plan: water, wind, fruit quality and insurance exposure all change with the structure.

We have designed, manufactured and installed net houses for more than 20 years, including banana net houses in Israel's Western Galilee. Our new guide covers the research, the engineering and the grant rules.

🔗 Link in the first comment.

What drives your structure decision first: water, wind, or fruit quality?

#Bananas #NetHouse #WaterEfficiency #AgriculturalInvestment #Horticulture"""},
 "beit-reshet-avocado": {
  "fb": """לילה אחד של קרה יכול למחוק שנה של עבודה במטע אבוקדו צעיר.

לפי שה״מ, רשתות בהצללה גבוהה מ-50% הגנו היטב על אבוקדו מפני קרה, ורשתות של 30% הגנו פחות. ההסבר: הרשת מסתירה את שמש הבוקר שאחרי לילה קר, וזה מה שמונע את הנזק.

אבל רשת שמגינה מקרה צריכה לעמוד גם בברד וברוח. מבנה שלא תוכנן לעומס הזה עלול לקרוס בדיוק כשצריך אותו.

במדריך החדש:
✔ איזו רשת מגינה מפני קרה, צינה, מכות שמש וברד
✔ בית רשת קבוע או רשת תשליך למטע צעיר
✔ מה למדנו מבית רשת לאבוקדו שהקמנו בפורטוגל

המדריך המלא 👈 [קישור]

מגדלים 50 דונם ומעלה, או מתכננים מטע בחו״ל? כתבו לנו.""",
  "ig": """קרה, ברד, שרב. 🥑
מטע אבוקדו צעיר רגיש לכל אחד מהם.

בית רשת נכון מגן מכולם, אם הוא מתוכנן לעומס של ברד ורוח ולא רק להצללה.
בית רשת לאבוקדו בפורטוגל · יותר מ-20 שנה בשטח.

המדריך המלא: קישור בביו.

#אבוקדו #מטעאבוקדו #ביתרשת #קרה #ברד #חקלאותישראלית #פורטוגל #מטעים #חקלאות #מיפתח""",
  "li": """Portugal's avocado area grew from under 300 ha before 2013 to roughly 2,600–2,800 ha by early 2023 (CIRAD, for the Hass Avocado Board). Growth like that attracts capital, and climate risk follows it.

Frost, heat spikes, hail and wind hit young avocado orchards hardest. Israel's Extension Service reports that nets above 50% shading protect avocado well against frost, while 30% nets protect less. But a net that is dense enough for frost must also be engineered for hail load and wind, or it fails exactly when it matters.

We built an avocado net house in Portugal and have been designing and installing net houses for more than 20 years. Our new guide covers net selection, structure design and what to check before planting.

🔗 Link in the first comment.

Investors in Iberian avocado: is protection in your base case, or in the risk appendix?

#Avocado #Portugal #AgriculturalInvestment #ClimateRisk #NetHouse"""},
}
TOPIC_OF = {"beit-reshet": 1, "reshet-neged-barad": 2, "chava-haklait-turnkey": 4}

CSS = """.pack h2{font-size:30px;margin:48px 0 14px}.pack h3{font-size:22px;margin:26px 0 8px}
.posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:12px 0 30px}
.post{background:var(--surface);border:1px solid var(--rule);border-radius:6px;padding:16px;display:grid;gap:10px;align-content:start;min-width:0}
.post b{font:500 12px/1 var(--mono);letter-spacing:.08em;color:var(--leaf)}
.post pre{white-space:pre-wrap;font:15px/1.65 var(--body);margin:0;word-break:break-word}
.post pre[dir=ltr]{text-align:left}
.post button{justify-self:start;font:500 14px var(--body);background:var(--tint);color:var(--leaf);border:1px solid var(--rule);border-radius:4px;padding:6px 12px;cursor:pointer}
.kv td:first-child{white-space:nowrap;font-weight:700}
@media(max-width:900px){.posts{grid-template-columns:minmax(0,1fr)}}"""


def esc(s):
    return html.escape(s)


def main():
    arts = articles.ARTICLES
    seo_rows = "".join(
        f'<tr><td><a href="{a["slug"]}.html">{esc(a["h1"])}</a></td><td>{esc(a["kw"])}</td><td>{esc(a["meta_title"])} <small>({len(a["meta_title"])})</small></td><td>{esc(a["meta_desc"])} <small>({len(a["meta_desc"])})</small></td><td dir="ltr">/articles/{a["slug"]}/</td></tr>'
        for a in arts)
    posts = ""
    for a in arts:
        p = MINE.get(a["slug"]) or topic_posts(TOPIC_OF[a["slug"]])
        cards = "".join(
            f'<div class="post"><b>{lab}</b><pre{(" dir=ltr" if k == "li" else "")}>{esc(p[k])}</pre><button type="button" class="cp">העתקה</button></div>'
            for k, lab in [("fb", "FACEBOOK"), ("ig", "INSTAGRAM"), ("li", "LINKEDIN · EN")])
        posts += f'<h3>{esc(a["h1"])}</h3><div class="posts">{cards}</div>'
    body = f'''{build.head("חבילת הפצה למאמרים", "טבלת SEO, פוסטים מוכנים לפייסבוק, אינסטגרם ולינקדאין, וצ׳קליסט השקה למאמרי מיפתח.", build.SITE + build.BASE + "pack/", build.SITE + build.BASE + "img/cover-beit-reshet-og.jpg")}
<style>{CSS}</style>{build.header()}
<main class="wrap pack"><div class="hero"><span class="kicker">לצוות בלבד · לא לפרסום</span><h1>חבילת ההפצה</h1>
<p class="dek">כל מה שצריך כדי להעלות את חמשת המאמרים לאתר ולהפיץ אותם: כותרות ותיאורים לגוגל, פוסטים מוכנים, ורשימת הבדיקות לפני ההשקה.</p></div>
<h2>טבלת SEO</h2><div class="tbl"><table><thead><tr><th>מאמר</th><th>מילת מפתח ראשית</th><th>Title (תווים)</th><th>Meta description (תווים)</th><th>כתובת מומלצת</th></tr></thead><tbody>{seo_rows}</tbody></table></div>
<p>בכל עמוד כבר מוטמעים: נתונים מובנים (BlogPosting, Organization, BreadcrumbList, FAQPage), canonical, תגיות Open Graph לשיתוף בוואטסאפ ובפייסבוק, תוכן עניינים עם עוגנים, ותמונות OG בגודל 1200×630.</p>
<h2>פוסטים מוכנים לרשתות</h2><p>להחליף את [קישור] בכתובת עם UTM (utm_source=facebook|instagram|linkedin&amp;utm_medium=organic&amp;utm_campaign=שם-המאמר). בלינקדאין: לפרסם מהפרופיל של יפתח ולשתף מעמוד החברה.</p>{posts}
<h2>לפני ההשקה: תיקונים באתר הקיים</h2>
<ul class="check"><li><b>HTTPS לא עובד.</b> הכתובת המאובטחת מחזירה תעודה של nethost.co.il. בלי תעודה תקינה גוגל והדפדפנים יסמנו את האתר כלא מאובטח.</li>
<li><b>תוכנה ישנה מאוד:</b> וורדפרס 4.7 על PHP 5.3. מומלץ לעבור לאתר החדש לפני פרסום המאמרים, ולהגדיר הפניות 301 מהכתובות הישנות.</li>
<li><b>להוריד את עמודי ההצללה האזרחית</b> ואת האזכור בתיאור דף הבית, כי השירות כבר לא ניתן.</li>
<li><b>להסיר עמודי זבל מהאינדקס:</b> עמוד לדוגמה, ‎/8/‎, ‎/project/145/‎ ופוסט "Hello world".</li>
<li><b>לאפשר זום בטלפון</b> (כרגע חסום), ולהתקין Google Analytics 4 ו-Search Console עם אירועי קליק לוואטסאפ, לטלפון ולטופס.</li>
<li><b>מאמרים באנגלית:</b> קודם המאמר למשקיעים, אחריו האבוקדו, לקראת התערוכה בגרמניה בפברואר.</li></ul>
<h2>לאישור הבעלים לפני פרסום</h2>
<ul class="check"><li>מספר הוואטסאפ העסקי (‎04-9856969 הוא קו נייח).</li>
<li>אזכור שיתוף הפעולה עם ברק מ-Green Arava במאמר למשקיעים.</li>
<li>שהלקוחות שברשימת הממליצים (ברעם, אלרום, יחיעם, מצובה, חניתה והלקוח בפורטוגל) מסכימים שיזכירו אותם.</li>
<li>אישור לקוח לכל צילום מפרויקט מזוהה. הצילומים במאמרים מסומנים כ"ארכיון מיפתח" בלי שם פרויקט.</li>
<li>השורה "אין לנו מחיר לדונם בטלפון: המחיר נגזר מהתכנון" במאמר הברד.</li>
<li>עלויות משרד החקלאות הן מתכנית 2023. לבדוק אם פורסמה תכנית חדשה ולעדכן.</li>
<li>שמירה על האיזון: התמונות שמסומנות "הדמיה" נוצרו ב-AI וממחישות, הן לא צילום של פרויקט.</li></ul>
</main>{build.footer()}
<script>document.querySelectorAll('.cp').forEach(function(b){{b.addEventListener('click',function(){{var t=b.parentNode.querySelector('pre');
var done=function(){{b.textContent='הועתק';setTimeout(function(){{b.textContent='העתקה'}},1600)}};
var sel=function(){{var r=document.createRange();r.selectNodeContents(t);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='סמנו והעתיקו'}};
try{{navigator.clipboard.writeText(t.textContent).then(done,sel)}}catch(e){{sel()}}}})}});</script>'''
    (HERE / "site" / "pack.html").write_text(build.full(body))
    print("pack ok")


if __name__ == "__main__":
    main()
