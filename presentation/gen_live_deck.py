# -*- coding: utf-8 -*-
import json, os, datetime
ROOT="/tmp/claude-0/-home-user-desktop-tutorial/9088daa5-d593-5866-a256-1b36570fb83b/scratchpad/deck/project"
INK="#0E1116"; INK2="#171C24"; SAND="#D9B78C"; SANDD="#B8925C"; PAPER="#F6F3EE"; PAPER2="#ECE7DF"
TXT="#1C1F26"; MUTED="#6B7280"; MUTEDL="#A7ADB8"; LINE_D="#2A313C"; LINE_L="#E2DCD2"
H="'Frank Ruhl Libre', Georgia, serif"; B="'Heebo', Arial, sans-serif"
SAND_IMG="/_blob/44d740e7191cfd53f3fffed095fb708b"; DARK_IMG="/_blob/1dacb5aa5d84258654db189bd51df571"
RLM="‏"
def t(s): return RLM+s+RLM

slides=[]  # (id, html)
def sec(id_, bg, body, notes, extra="", pad="128px", layout="display:flex; flex-direction:column; gap:32px"):
    html=f'<section id="{id_}" dir="rtl" data-transition="fade" style="background:{bg}; color:{"#F6F3EE" if bg in (INK,) else TXT}; font-family:{B}; padding:{pad}; {layout}; text-align:right{extra}">\n{body}\n<aside>{notes}</aside>\n</section>\n'
    slides.append((id_,html))

def pnum(n, dark=True):
    return f'<p style="position:absolute; left:128px; bottom:64px; width:120px; font-size:24px; color:{MUTEDL if dark else MUTED}; text-align:left">{n}</p>'

PHOTOS={"cover":"/_blob/3c210f43b01dea0bb26500a2a5dd89d2","childhood":"/_blob/dfe9e55caa210e20d4c7c0968b21f06a","kid":"/_blob/d6d402c02cab5266180f288c9c466487","army":"/_blob/d3046a280df4ba44b02d01bc37fe96ac","stretcher":"/_blob/395c117e6c3e672da5ef708629b0d409","team":"/_blob/d991b7912beba42f8c8de27d135e5b83","barnash":"/_blob/b09ed8b5d0d038226e899b4fdb1fb602","klein":"/_blob/2f032767334d561014a8d00d72cf0034","oct7":"/_blob/638b3cf092007ccd9568c41a3beda17e","rehab":"/_blob/a29333a0ac4c6ed87eac3b9479098405","panama":"/_blob/293cab8b9543fb3ca09eed6220298714","climb":"/_blob/c1b99dab8b0f1f5775a2257854725fb9","horses":"/_blob/27dbbac195293ebea914ffaf8e421e4e","journey4":"/_blob/cd6009f2931f23c5f145ca4a3ac932cd","lecture":"/_blob/7ead3731d703527d6be6f6c79ba70937"}
def photo(label, w, h, dark=True, extra="", key=None):
    if key and key in PHOTOS:
        return f'<img src="{PHOTOS[key]}" alt="{label}" style="width:{w}px; height:{h}px; object-fit:cover{extra if extra else "; border-radius:24px"}">'
    return (f'<div style="width:{w}px; height:{h}px; background:{INK2 if dark else PAPER2}; border:3px dashed {"#3A4150" if dark else "#C9C2B6"}; '
            f'border-radius:24px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px{extra}">'
            f'<p style="font-size:64px; color:{MUTEDL if dark else MUTED}">📷</p>'
            f'<p style="font-size:26px; color:{MUTEDL if dark else MUTED}; text-align:center; padding:0 32px">{t("תמונה: "+label)}</p></div>')

def nodot(x): return x[:-1] if x.endswith(".") and not x.endswith("…") else x
def h1(s, size=120, color=SAND, ff=H, extra=""): s=nodot(s); return f'<h1 style="font-family:{ff}; font-size:{size}px; font-weight:700; line-height:1.1; color:{color}{extra}">{t(s)}</h1>'
def h2(s, size=72, color=None, extra=""): s=nodot(s); return f'<h2 style="font-family:{H}; font-size:{size}px; font-weight:700; line-height:1.15{("; color:"+color) if color else ""}{extra}">{t(s)}</h2>'
def h3(s, size=36, color=None, extra=""): s=nodot(s); return f'<h3 style="font-size:{size}px; font-weight:700; line-height:1.25{("; color:"+color) if color else ""}{extra}">{t(s)}</h3>'
def p(s, size=28, color=None, extra=""): return f'<p style="font-size:{size}px; line-height:1.45{("; color:"+color) if color else ""}{extra}">{t(s)}</p>'

def section_slide(id_, num, title, sub, notes, n, tsize=96):
    body=(f'<div style="flex:1"></div>'
          f'{h1(num, 200)}'
          f'{h2(title, tsize, "#F6F3EE")}'
          f'{p(sub, 32, MUTEDL)}'
          f'<div style="flex:1"></div>{pnum(n)}')
    sec(id_, INK, body, notes, pad="128px 128px 160px")

def circle_icon(sym, size=72, bg=SAND, fg=INK):
    return f'<div style="width:{size}px; height:{size}px; border-radius:50%; background:{bg}; display:flex; align-items:center; justify-content:center"><p style="font-size:{int(size*0.5)}px; color:{fg}; text-align:center">{sym}</p></div>'

def row_item(sym, title, desc, dark=False, tsize=36, dsize=26):
    return (f'<div style="display:flex; flex-direction:row; gap:28px; align-items:start">'
            f'{circle_icon(sym)}'
            f'<div style="flex:1; display:flex; flex-direction:column; gap:8px">{h3(title, tsize, "#F6F3EE" if dark else TXT)}{p(desc, dsize, MUTEDL if dark else MUTED) if desc else ""}</div></div>')

def card(inner, dark=False, extra=""):
    bg=INK2 if dark else "#FFFFFF"; ln=LINE_D if dark else LINE_L
    return f'<div style="flex:1; display:flex; flex-direction:column; gap:16px; background:{bg}; border:2px solid {ln}; border-radius:20px; padding:40px{extra}">{inner}</div>'

n=0
# 1 cover
n+=1
sec("cover", "#FFFFFF",
    f'<img src="/_blob/ea51aeb5512a49f3bcfe1668b8e67d90" alt="חנוך על רקע דגל ישראל" style="position:absolute; left:0px; top:0px; width:1920px; height:1080px; object-fit:cover">'
    f'<h1 style="position:absolute; left:110px; top:640px; width:780px; font-family:{H}; font-size:180px; font-weight:700; line-height:1; color:{TXT}; text-align:right">{t("7.10")}</h1>'
    f'<h2 style="position:absolute; left:110px; top:840px; width:780px; font-family:{H}; font-size:80px; font-weight:700; line-height:1.1; color:{TXT}; text-align:right">{t("הסיפור שלי")}</h2>'
    f'<p style="position:absolute; left:110px; top:950px; width:780px; font-size:30px; color:{MUTED}; text-align:right">{t("חנוך  |  לוחם סיירת נח״ל, פצוע 7 באוקטובר")}</p>',
    "שקף פתיחה. לא מדברים עליו. הוא נשאר על המסך כשהקהל נכנס.", pad="0px", layout="display:flex; flex-direction:column")
# 2 hook
n+=1
sec("hook", INK,
    f'<div style="flex:1"></div>'
    f'{h2("ב־7 באוקטובר<br>קיבלתי החלטה.", 110, "#F6F3EE")}'
    f'<div style="flex:1"></div>{pnum(n)}',
    "פתיחה – 3 דקות. לא מתחילים בילדות. לא מתחילים ב־7 באוקטובר. מתחילים מהרגע שבו הקהל כבר בתוך הסיפור. להגיד את המשפט. ואז לעצור. לא להסביר עדיין. המטרה: ליצור סקרנות.", pad="128px 128px 160px")
# 3 section 01
n+=1
section_slide("s01","01","מי הייתי לפני הכול","","מי הייתי לפני הכול – 7 דקות. לבחור 3–4 רגעים בלבד שהסבירו מי היית. הקהל צריך להבין שאתה לא 'הגיבור שנולד גיבור'.", n)
# 4 who
n+=1
sec("who", PAPER,
    f'{h2("חנוך, בן 24, מיישובי גדרות", 64, None, "; text-align:center")}'
    f'{photo("ילדות במושב – תמונה משפחתית או מהשדות", 570, 830, False, key="childhood")}{pnum(n, False)}',
    "אני חנוך, בן 24, מיישובי גדרות. ילדות מושבניקית. אח בכור לארבעה. הרבה סימני שאלה – לא ילד שידעו לאן הוא הולך. (להוסיף פרט אחד קטן ומצחיק מהילדות שמחבר את הקהל.)", pad="64px 128px 64px", layout="display:flex; flex-direction:column; gap:28px; align-items:center")
# 5 problem child
n+=1
sec("label", INK,
    f'<div style="display:flex; flex-direction:row; gap:64px; flex:1; align-items:center">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:32px">{h1("״ילד בעייתי״", 140)}'
    f'{p("ככה הגדירו אותי כבר מהגן. ומאז – הסתבכתי הרבה.", 40, "#F6F3EE")}'
    f'{p("כשאומרים לך משהו מספיק פעמים, אתה מתחיל להאמין לזה.", 30, MUTEDL)}</div>'
    f'{photo("חנוך ילד (גן / בית ספר יסודי)", 640, 824, key="kid")}</div>{pnum(n)}',
    "מהגן הגדירו אותי כ'ילד בעייתי' והייתי מסתבך הרבה. לתת דוגמה אחת קונקרטית – אירוע אחד, לא רשימה.", pad="128px 128px 160px")
# 6 10th grade
n+=1
steps=[("1","ההאשמה","האשימו אותי בסחר בסמים – ולא היה לי שום קשר לזה."),
       ("2","ההבנה","בסוף האמינו לי. אבל נשאר חותם: יכולים לחשוד בי בדבר כל כך חמור. אני לא ״ילד רע״ – זו תדמית, לא אני."),
       ("3","ההחלטה","לכתוב את הסיפור שלי בעצמי, ולשנות את התדמית.")]
steps_html="".join(f'<div style="display:flex; flex-direction:row; gap:28px; align-items:center"><div style="width:40px; height:40px; border-radius:50%; background:{SAND}"></div>{h3(b,48)}</div>' for a,b,c in steps)
sec("grade10", PAPER,
    f'{h2("כיתה י׳: הרגע שבו הכול התהפך", 64)}'
    f'<div style="display:flex; flex-direction:row; gap:64px; flex:1; align-items:start">'
    f'<div style="flex:1; display:flex; flex-direction:column; justify-content:space-evenly; align-self:stretch">{steps_html}</div>'
    f'<div style="width:720px; background:{INK}; border-radius:24px; padding:56px; display:flex; flex-direction:column; gap:24px">'
    f'<p style="font-family:{H}; font-size:110px; color:{SAND}; line-height:0.8">”</p>'
    f'{h3("״לא היה לי שום קשר לזה.״", 48, "#F6F3EE")}'
    f'{p("והבנתי: אם אני לא אכתוב את הסיפור שלי – מישהו אחר יכתוב אותו בשבילי.", 26, MUTEDL)}</div></div>{pnum(n, False)}',
    "אירוע אחד בכיתה י' ששינה לי את כל התפיסה. האשימו אותי בבית הספר בסחר בסמים ולא היה לי שום קשר לזה. בסוף השיחה הם האמינו לי – אבל זה השאיר בי חותם: שיכולים לחשוד בי בדבר כל כך חמור. זו הפעם הראשונה שהחלטתי לקחת את ההחלטות בחיים שלי בעצמי. מאותו רגע: חיפוש שנת שירות איכותית, שאיפה לשירות קרבי משמעותי.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:48px")
# 7 message
n+=1
sec("msg1", INK,
    f'<div style="flex:1"></div>{h2("העבר שלך מסביר אותך.", 88, MUTEDL, "; text-align:center")}{h2("אבל הוא לא חייב להגדיר אותך.", 96, SAND, "; text-align:center")}<div style="flex:1"></div>{pnum(n)}',
    "המסר של הפרק. לעצור עליו רגע. הקהל צריך להבין: לא הגיבור שנולד גיבור – נער עם הרבה סימני שאלה.", pad="128px 128px 160px")
# 8 section 02
n+=1
sec("s02", INK,
    f'<div style="display:flex; flex-direction:row; gap:64px; align-items:center; flex:1">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:24px">{h1("02",200)}{h2("הבחירה",96,"#F6F3EE")}</div>'
    f'<img src="{SAND_IMG}" alt="סמל סיירת נח״ל" style="width:640px; height:351px; object-fit:contain"></div>{pnum(n)}',
    "הבחירה – 7 דקות. המעבר לסיירת נח״ל. לא להפוך את זה ל'סיפור צבאי'. הנושא: הפעם הראשונה שבה בחרת מי אתה רוצה להיות.", pad="128px 128px 160px")
# 9 sayeret cards
n+=1
cards=[("▲","למה רציתי להגיע לשם","כי אני אוהב אתגרים. ורציתי להוכיח לעצמי שאני באמת תותח כמו שאני מרגיש – בניגוד למה שאמרו לי כל הזמן."),
       ("⚖","מה זה עלה לי","קושי פיזי ומנטלי, ובמקביל – כל מיני קשיים בבית שלא עצרו בשביל המסלול."),
       ("👥","מי השפיע עליי","קליין וברנש, המפקצ׳ והמג״ד שלי. שני אנשים שונים לגמרי – ושני שיעורים שנשארו איתי (בשקף הבא)."),
       ("◎","מה הצבא לימד אותי על עצמי","שהכול בראש. ושתמיד אפשר להשתפר ולהיות יותר ויותר טוב.")]
def cardinner(a): return '<div style="display:flex; flex-direction:row; gap:20px; align-items:center">'+circle_icon(a[0],64)+h3(a[1],30)+'</div>'+p(a[2],24,MUTED)
def cardrow(a,b): return '<div style="display:flex; flex-direction:row; gap:32px; flex:1">'+card(cardinner(a))+card(cardinner(b))+'</div>'
steps=[("שנת שירות ב״שומר החדש״ – גרעין נח״ל",""),("מסלול בסיירת נח״ל",""),("קו יקיר",""),("אימון חורף",""),("מבצע ״בית וגן״",""),("קו עזה","")]
cells=""
for i,(a_,b_) in enumerate(steps):
    last = i==len(steps)-1
    if i>0:
        cells+=(f'<div style="width:36px; display:flex; flex-direction:column; align-items:center; gap:14px">'
                f'<div style="height:30px; display:flex; align-items:center"><p style="font-size:30px; line-height:1; color:{SANDD}">←</p></div></div>')
    cells+=(f'<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:14px">'
            f'<div style="width:30px; height:30px; border-radius:50%; background:{SAND if last else "#FFFFFF"}; border:4px solid {SAND}"></div>'
            f'<p style="font-size:26px; font-weight:700; line-height:1.2; color:{TXT}; text-align:center">{t(a_)}</p></div>')
def ph(key, w, h, label): return f'<img src="{PHOTOS[key]}" alt="{label}" style="width:{w}px; height:{h}px; object-fit:cover; border-radius:16px">'
sec("sayeret", PAPER,
    f'<div style="display:flex; flex-direction:row-reverse; gap:32px; align-items:center; justify-content:space-between">{h2("השירות הצבאי", 60)}<img src="{DARK_IMG}" alt="סמל סיירת נח״ל" style="width:260px; height:143px; object-fit:contain"></div>'
    f'<div style="position:relative; display:flex; flex-direction:row-reverse; gap:8px"><div style="position:absolute; left:117px; top:13px; width:1430px; height:4px; background:{SAND}"></div>{cells}</div>'
    f'<div style="display:flex; flex-direction:row-reverse; gap:32px; justify-content:center">{ph("team", 842, 520, "סוף מסלול – העלייה להר")}{ph("army", 348, 520, "הסיכה")}{ph("stretcher", 390, 520, "מסע אלונקות")}</div>{pnum(n, False)}',
    "השירות בקצרה: שנת שירות ב'שומר החדש' – גרעין נח״ל, משם הגעתי לסיירת – מסלול של שנה וחודשיים. עליתי לקו יקיר, אחר כך אימון חורף, מבצע 'בית וגן' בג'נין, ואז עלינו לקו עזה. (לספר בעל פה: למה רציתי להגיע לסיירת – אוהב אתגרים, להוכיח לעצמי; המחיר – קושי פיזי ומנטלי וקשיים בבית; מה הצבא לימד אותי – שהכול בראש ושתמיד אפשר להשתפר. מוטיבציה מביאה אותך להתחלה, משמעת מביאה אותך לסוף.)", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:28px")
# 10 commanders
n+=1
def cmd(name, role, big, small, key, label):
    pw = {"klein":int(600*564/460),"barnash":int(600*577/460)}.get(key,696)
    return card('<div style="display:flex; flex-direction:row; justify-content:center">'+photo(label, pw, 600, True, "; border-radius:16px", key=key)+'</div>'+h1(name+"  ·  "+role, 44), True, "; gap:16px; padding:28px")
sec("commanders", INK,
    f'{h2("שני מפקדים. שני שיעורים.", 52, "#F6F3EE")}'
    f'<div style="display:flex; flex-direction:row; gap:48px; flex:1">'
    f'{cmd("קליין","המפקצ׳","מצוינות. מקצועיות. לעשות דברים כמו שצריך – ועד הסוף.","המסגרת שהוא הכניס אותנו אליה לא נגמרה בשחרור. עד היום אני במשטר אימונים בגללו.","klein","חנוך עם קליין")}'
    f'{cmd("ברנש","המג״ד, יונתן צור","קודם כל בן אדם.","הגיע משלדג, עטור שבחים והישגים בכל תחום. ובכל זאת ידע את השמות של רוב החיילים, התייעץ איתנו, ודיבר איתנו כחבר – לא כמג״ד לחייל.","barnash","חנוך עם ברנש בטקס סוף מסלול")}</div>{pnum(n)}',
    "קליין – תמיד דחף אותנו למצוינות ומקצועיות, לעשות דברים כמו שצריך ועד הסוף. עד היום אני במשטר אימונים בגלל המסגרת שהוא הכניס אותנו אליה. ברנש (יונתן צור) – הגיע משלדג, פיקד בתפקידים רבים, עטור שבחים. ובכל זאת קודם כל היה אדם: ידע שמות, התייעץ איתנו, דיבר איתנו בשיח חברי. התמונה: לחיצת יד בטקס סוף המסלול. השיעור: אפשר להיות הכי טוב ועדיין להישאר בן אדם.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:32px")
# 11 key idea
# (msg2 slide removed; stretcher photo moved to the service slide)
# 12 section 03
n+=1
section_slide("s03","03","7 באוקטובר","","7 באוקטובר – 15 דקות. הלב הרגשי של ההרצאה, אבל לא כל ההרצאה. לספר כמו סרט. לא רק מה קרה – מה חשבת בכל שלב.", n)
# 12- what is an APC
n+=1
sec("nagmash", INK,
    f'{h1("מה זה נגמ״ש?", 80, "#F6F3EE", extra="; text-align:center")}'
    f'<div style="display:flex; flex-direction:row; justify-content:center"><img src="/_blob/f4908a91d351508c9a89909c3c3063cb" alt="נגמ״ש אכזרית" style="width:1220px; height:686px; object-fit:cover; border-radius:16px"></div>{pnum(n)}',
    "רגע לפני שמספרים על קו עזה: להסביר בעל פה מה זה נגמ״ש – נושא גייסות משוריין, כבד, הצוות בפנים, המפקד והמקלען למעלה. הקהל צריך לדעת מה הכלי הזה כדי להבין את מה שיקרה לו בהמשך.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:32px; align-items:center")
# 12a0 sector diagram
n+=1
def box(txt, hot=False, w=None, sub=""):
    st=f"background:{SAND if hot else INK2}; border:2px solid {SAND if hot else LINE_D}; border-radius:16px; padding:20px 28px; display:flex; flex-direction:column; align-items:center; gap:4px"+(f"; width:{w}px" if w else "; flex:1")
    return (f'<div style="{st}"><p style="font-size:30px; font-weight:700; color:{INK if hot else "#F6F3EE"}; text-align:center">{t(txt)}</p>'
            + (f'<p style="font-size:22px; color:{"#5A4A30" if hot else MUTEDL}; text-align:center">{t(sub)}</p>' if sub else '') + '</div>')
vline=f'<div style="display:flex; flex-direction:row; justify-content:center"><div style="width:4px; height:28px; background:{LINE_D}"></div></div>'
hbar=f'<div style="display:flex; flex-direction:row; justify-content:center"><div style="width:1100px; height:4px; background:{LINE_D}"></div></div>'
sec("sector", INK,
    f'{h2("איך זה עבד בגזרה", 52, "#F6F3EE")}'
    f'<div style="display:flex; flex-direction:row; justify-content:center">{box("סיירת נח״ל תפסה את הגזרה הדרומית", False, 900)}</div>'
    f'{vline}{hbar}'
    f'<div style="display:flex; flex-direction:row; gap:32px; justify-content:center">{box("מוצב כרם שלום", False, 520, "פלחה״ן")}{box("מוצב סופה", False, 520, "פלוגת נ״ט")}</div>'
    f'{vline}'
    f'<div style="display:flex; flex-direction:row; justify-content:center">{box("פלס״ר – הפלוגה שלי", True, 900, "מחולקת בין שני המוצבים")}</div>'
    f'{vline}{hbar}'
    f'<div style="display:flex; flex-direction:row; gap:32px; justify-content:center">{box("תורנות מטבח")}{box("צוות עתודה", True, None, "זמין לכל אירוע בגזרה")}{box("כיתת כוננות")}</div>'
    f'{vline}'
    f'<div style="display:flex; flex-direction:row; justify-content:center">{box("משמרת בוקר 05:30  ·  משמרת ערב 18:30", False, 900)}</div>{pnum(n)}',
    "להסביר את המבנה בשלושה משפטים: סיירת נח״ל תפסה את הגזרה הדרומית. שני מוצבים – כרם שלום (פלחה״ן) וסופה (פלוגת נ״ט). הפלס״ר, הפלוגה שלי, הייתה מחולקת בין שניהם. כל מוצב מחולק למשימות, והמשימה שלנו הייתה צוות עתודה – זמין לכל אירוע. משמרות: כל בוקר 05:30 וכל ערב 18:30. ומכאן – לשקף הבא: ערב חג.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:10px")
# 12a before: holiday eve, morning shift, 06:29
n+=1
rows=[("6.10","ערב חג. ארוחת חג, אימון, ולישון."),("05:30","קמתי למשמרת בוקר."),("06:29","מטח רקטות. ואז –")]
rows_html="".join(f'<div style="display:flex; flex-direction:row; gap:32px; align-items:baseline"><p style="width:260px; font-family:{H}; font-size:56px; font-weight:700; color:{SAND}; text-align:right; line-height:1.1">{t(a)}</p><p style="flex:1; font-size:32px; color:#F6F3EE; line-height:1.4; text-align:right">{t(b)}</p></div>' for a,b in rows)
sec("before", INK,
    f'<div style="display:flex; flex-direction:row; gap:64px; flex:1; align-items:center">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:24px">{h1("עליתי למשמרת", 110, "#F6F3EE")}{h2("05:30  7.10", 56, SAND)}</div>'
    f'<img src="/_blob/aa74bbaa3534513504eef54af5d816c1" alt="חנוך בציוד מלא, הבוקר של 7 באוקטובר" style="width:620px; height:824px; object-fit:cover; border-radius:24px"></div>{pnum(n)}',
    "בעל פה, לפני השקף: ערב 6.10, ערב חג – ארוחת חג, אימון, והלכתי לישון. (על צוות העתודה והכוננות – כבר סופר בתרשים.) ואז: ב-05:30 קמתי למשמרת בוקר. התמונה מהבוקר הזה. משפט על הבוקר – רגיל, שקט. ואז השקף הבא: 06:29.", pad="128px 128px 160px")
# 12b1 rockets video
n+=1
sec("rockets", INK,
    f'<div style="display:flex; flex-direction:row; gap:64px; flex:1; align-items:center">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:28px">{h1("06:29", 150)}{h3("מטח רקטות מעזה.", 48, "#F6F3EE")}'
    f'</div>'
    f'<img src="/_blob/696e54df30bc318d2e738de2f43080cc" data-video="/_blob/64459c0ba816aee5c43f7c0ad3533605" data-video-start="click" alt="מטח רקטות משוגר מעזה, 06:29" style="width:466px; height:824px; object-fit:cover; border-radius:16px"></div>{pnum(n)}',
    "06:29 – מטח רקטות. הסרטון (17 שניות) מתחיל בלחיצה. להגיד: קמתי למשמרת, ובשש עשרים ותשע – ללחוץ. אחרי הסרטון עוברים להקלטת הקשר של הסמג״ד.", pad="128px 128px 160px")
# --- radio recording slides ---
import random
def radio(id_, when, title, sub, dur, notes, seed, lines=()):
    global n
    n+=1
    random.seed(seed)
    chars=sum(len(sp)+len(tx) for sp,tx in lines); tsz = 44 if chars<80 else 38 if chars<140 else 32 if chars<260 else 27
    bars="".join(f'<rect x="{i*14}" y="{60-h}" width="8" height="{2*h}" rx="4" fill="#D9B78C" opacity="{0.35+0.65*(h/56):.2f}"/>' for i,h in enumerate([max(4,int(56*abs(random.gauss(0.45,0.3)))) for _ in range(100)]))
    sec(id_, INK,
        f'<div style="flex:1"></div>'
        f'<div style="display:flex; flex-direction:column; gap:28px; background:{INK2}; border:2px solid {LINE_D}; border-radius:24px; padding:56px 64px">'
        f'<div style="display:flex; flex-direction:row; gap:24px; align-items:center; justify-content:space-between">{p("רשת הקשר  ·  "+when, 26, MUTEDL)}{p(dur, 26, MUTEDL)}</div>'
        f'{h2(title, 52, "#F6F3EE")}'
        f'<div style="display:flex; flex-direction:row; gap:32px; align-items:center"><div style="width:80px; height:80px; border-radius:50%; background:{SAND}; display:flex; align-items:center; justify-content:center"><p style="font-size:34px; color:{INK}; text-align:center">▶</p></div>'
        f'<svg viewBox="0 0 1400 120" width="1120" height="96" aria-label="גל קול של ההקלטה">{bars}</svg></div>'
        f'{p(sub, 26, SAND)}'
        + "".join(f'<p style="font-size:{tsz}px; line-height:1.35; color:#F6F3EE; text-align:right"><b>{t(sp)}</b> {t(tx)}</p>' if sp else f'<p style="font-size:{tsz}px; line-height:1.35; color:#F6F3EE; text-align:right">{t(tx)}</p>' for sp,tx in lines)
        + '</div>'
        f'<div style="flex:1"></div>{pnum(n)}', notes, pad="128px 128px 160px")
radio("radio1", "7.10, 06:45", "הסמג״ד עידו שני מכריז על מלחמה.", "רבע שעה אחרי מטח הרקטות.", "0:09",
      "הקלטת קשר, 9 שניות: הסמג״ד עידו שני מכריז על מלחמה, 06:45. בגרסה החיה אין קול – ההקלטה מוטמעת בקובץ ה-PowerPoint ומתנגנת בלחיצה. להשמיע, לשתוק, ואז: ובדיוק אז, מהצד השני של הכביש –", 7,
      [("הסמג״ד:","אנחנו במלחמה! כל אחד הגנה בגזרתו."),("","להרוג מחבלים. בהצלחה!")])
# 12c nukhba video (morning shift)
n+=1
sec("nukhba", INK,
    f'<img src="/_blob/8df5840dfbf20c49b91141e47f493675" data-video="/_blob/d19ded10dad56e377ea0a0bd40766f7e" data-video-start="click" alt="מצלמת גוף של מחבלי הנוח׳בה מגיעים לנקודה שבמפה ויורים טילי נ״ט לעבר הנגמ״ש" style="position:absolute; left:0px; top:0px; width:1920px; height:1080px; object-fit:cover">'
    f'<div style="position:absolute; left:0px; top:960px; width:1920px; height:120px; background:linear-gradient(180deg, rgba(14,17,22,0) 0%, rgba(14,17,22,0.75) 100%)"></div>'
    f'<h2 style="position:absolute; left:128px; top:1000px; width:1664px; font-family:{H}; font-size:36px; font-weight:700; line-height:1.15; color:#F6F3EE; text-align:right">{t("באותן דקות, מהצד השני של הכביש")}</h2>',
    "הסרטון על כל המסך, מתחיל בלחיצה. לספר: עליתי למשמרת בוקר, בוקר רגיל – ובדיוק ברגע הזה ללחוץ. מצלמת הגוף של המחבלים מגיעים לנקודה שבמפה ויורים נ״ט על הנגמ״ש. לא לדבר מעליו 20–30 שניות. אחר כך: ואני עוד לא ידעתי כלום.", pad="0px", layout="display:flex; flex-direction:column")
# 12b map
n+=1
sec("map", INK,
    f'<h2 style="position:absolute; left:128px; top:88px; width:1664px; font-family:{H}; font-size:56px; font-weight:700; line-height:1.15; color:#F6F3EE; text-align:right">{t("מפת הקרב")}</h2>'
    f'<img src="/_blob/b2d5c939adf45f21bed252e1210ddef0" alt="מפת הקרב: מוצב סופה, קיבוץ סופה, נקודת המחבלים, הנגמ״ש ואנדרטת דנגור" style="position:absolute; left:0px; top:200px; width:1920px; height:656px; object-fit:cover">',
    "מיד אחרי הסרטון: להסביר מה הם ראו. איפה המוצב, איפה הקיבוץ, מאיפה הגיעו המחבלים (הנקודה האדומה), ואיפה הנגמ״ש שהם ירו עליו. שני משפטים – הקהל צריך רק להבין את המרחב.", pad="0px", layout="display:flex; flex-direction:column")
# (timeline slide removed at the user's request)
# 13c outpost video
n+=1
sec("outpost", INK,
    f'<img src="/_blob/0cab90eeb9ff87a9cfcd3eba3dea2362" data-video="/_blob/cff6066009bca6243cef47dbd71e76e3" data-video-start="click" alt="סרטון מתוך מוצב סופה" style="position:absolute; left:654px; top:0px; width:612px; height:1080px; object-fit:cover">'
    f'<h2 style="position:absolute; left:1290px; top:128px; width:560px; font-family:{H}; font-size:50px; font-weight:700; line-height:1.15; color:#F6F3EE; text-align:right; white-space:nowrap">{t("בינתיים, בתוך המוצב")}</h2>{pnum(n)}',
    "הסרטון מתחיל בלחיצה עליו (לא אוטומטית), כדי שתשלוט מתי. להגיד קודם: אני לא הייתי שם – ואז להפעיל. אחרי הסרטון: משפט אחד על מה שזה עשה לך לראות את זה אחר כך.", pad="0px", layout="display:flex; flex-direction:column")
# 14 moment
n+=1
sec("moment", INK,
    f'<div style="display:flex; flex-direction:row; gap:64px; flex:1; align-items:center">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:28px">'
    f'{h2("באותו רגע שנפצעתי,", 60, "#F6F3EE")}{h2("מחשבה אחת בלבד עברה בראשי…", 60, SAND)}'
    f'{p("תמיד לימדו אותנו: מי שלא ממשיך לתפקד – נשאר עם הטראומה", 36, MUTEDL)}</div>'
    f'{photo("רגע הפינוי: הפצועים מטופלים בשטח על ידי לוחמי קרקל", 720, 824, key="oct7")}</div>{pnum(n)}',
    "הרגע של הפציעה. לעצור אחרי 'הדבר היחיד שעבר לי בראש היה…' – שנייה של שקט – ואז: תמיד אמרו לנו שמי שלא מתפקד מקבל פוסט טראומה. אז תפקדתי. זו ההחלטה השנייה – אותה החלטה מכיתה י': לפעול, לא לתת לדברים לקרות לי.", pad="128px 128px 160px")
radio("radio2", "7.10, 07:45", "הסמל מבקש פינוי.", "שעה בדיוק אחרי הכרזת המלחמה.", "0:07",
      "הקלטת קשר, 7 שניות: חכים, מפקד כוח האכזרית, מבקש פינוי ב-07:45 – בדיוק שעה אחרי שהסמג״ד הכריז על מלחמה. להגיד את זה: שעה. כל מה שסיפרתי עכשיו קרה בתוך שעה אחת. ההקלטה עם קול בקובץ ה-PowerPoint.", 11,
      [("חכים (מפקד כוח האכזרית):","מוכרחים פינוי דחוף."),("קליין:","חכים קבל, אין לנו איך לעזור לכם. אנחנו בניהול אש עם מחבלים.")])
# 14b apc day after
n+=1
sec("apc", INK,
    f'<div style="display:flex; flex-direction:row; justify-content:center"><img src="/_blob/67ad09c34520658624d5e54510ba914b" alt="הנגמ״ש ההרוס, יום אחרי הקרב, מזווית הראייה של המחבלים" style="width:1408px; height:792px; object-fit:cover; border-radius:16px"></div>'
    f'<p style="position:absolute; left:128px; bottom:64px; width:1664px; font-size:28px; color:{MUTEDL}; text-align:right">{t("הנגמ״ש שלנו, מצולם מהמקום שבו עמדו המחבלים.")}</p>',
    "יום אחרי הקרב. התמונה צולמה מהנקודה שממנה ירו עלינו. לתת לקהל להסתכל. משפט אחד: ככה זה נראה מהצד שלהם.", pad="128px 128px 160px")
radio("radio3", "7.10, דקות אחרי 07:45", "כל הכוחות באזור עולים לקשר. כולם מבקשים פינוי.", "אחד מהשני. אין למי לפנות.", "0:20",
      "הקלטת קשר, 20 שניות: דקות אחרי הבקשה של חכים, כל הכוחות באזור עולים לקשר ומבקשים פינוי אחד מהשני. להשמיע עד הסוף. אחר כך משפט אחד: זה הרגע שבו הבנתי שאף אחד לא בא. ההקלטה עם קול בקובץ ה-PowerPoint.", 13,
      [("קליין (המפקצ׳):","חמ״ל מקליין. תן לי דוח מצב על כוחות פינוי: א. לסופה, ב. לאנדרטת נירים."),("החמ״ליסט:","קיבל. כי אין לי שום מושג. אין פינוי, אין פינוי כרגע. אנחנו חייבים פינוי דחוף, דחוף."),("קליין:","מה אתה אומר לי? אתה החמ״ל, אחי!")])
radio("radio4", "7.10, 07:50", "קליין נותן פקודה. והיא מאפסת אותנו.", "המפקצ׳ שדחף אותנו למצוינות במסלול – עכשיו זה נכנס לפעולה.", "0:08",
      "הקלטת קשר, 07:50: קליין נותן פקודה שמאפסת אותנו. חמש דקות אחרי שכולם מבקשים פינוי – קול אחד ברור. לחבר לשקף המפקדים: זו המסגרת שהוא הכניס אותנו אליה. ההקלטה עם קול בקובץ ה-PowerPoint.", 17,
      [("קליין למפקד כוח האכזרית:","תאפס אותם. תקפיאו מצב. תסגרו את כל הפינות."),("","שימו ת׳פצועים באמצע, ואל תתנו למחבלים להגיע אליכם.")])
# 14a0 evacuation photo
n+=1
sec("evac", INK,
    f'<div style="display:flex; flex-direction:row; justify-content:center"><img src="/_blob/ae03b7fce5b9d050b369da64db814d52" alt="הפינוי: הצוות ליד הנגמ״ש, אלונקות על הקרקע" style="width:1408px; height:792px; object-fit:cover; border-radius:16px"></div>'
    f'<p style="position:absolute; left:128px; bottom:64px; width:1664px; font-size:28px; color:{MUTEDL}; text-align:right">{t("הפינוי. הצוות ליד הנגמ״ש, האלונקות על הקרקע.")}</p>',
    "תמונה מרגע הפינוי, מתוך הרכב שהגיע. לא להסביר הרבה – להגיד מי צילם ומאיפה, ומה הרגשת כשסוף סוף הגיע מישהו.", pad="128px 128px 160px")
# 14a soroka: photo + voice message, merged
n+=1
random.seed(23)
bars="".join(f'<rect x="{i*14}" y="{60-h}" width="8" height="{2*h}" rx="4" fill="#D9B78C" opacity="{0.35+0.65*(h/56):.2f}"/>' for i,h in enumerate([max(4,int(56*abs(random.gauss(0.45,0.3)))) for _ in range(64)]))
lines=[("חנוך:","היי כולם, מה קורה, זה חנוך. מבקש לא להפיץ את ההקלטה, לא בא לי שכל העולם ישמע אותי מדבר."),("","הייתי בסופה, הותקלנו מחבלים. קיבלתי כדור ביד, חוץ מזה אני בסדר גמור."),("","בגדול דואגים לי, אמא פה, אבא תכף יגיע. כל הצבא עליי, כל הבי״ח עליי. אני בסדר גמור."),("","אוהב את כולם, נשיקות, נפגש.")]
tr="".join(f'<p style="font-size:26px; line-height:1.35; color:#F6F3EE; text-align:right"><b>{t(sp)}</b> {t(tx)}</p>' if sp else f'<p style="font-size:26px; line-height:1.35; color:#F6F3EE; text-align:right">{t(tx)}</p>' for sp,tx in lines)
sec("soroka", INK,
    f'<div style="display:flex; flex-direction:row; gap:48px; flex:1; align-items:stretch">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:18px; background:{INK2}; border:2px solid {LINE_D}; border-radius:24px; padding:40px 48px; justify-content:center">'
    f'<div style="display:flex; flex-direction:row; gap:24px; align-items:center; justify-content:space-between">{p("סורוקה  ·  שעתיים אחרי הפינוי", 24, MUTEDL)}{p("0:28", 24, MUTEDL)}</div>'
    f'{h2("ההודעה הקולית ששלחתי מהמיטה.", 40, "#F6F3EE")}'
    f'<div style="display:flex; flex-direction:row; gap:24px; align-items:center"><div style="width:80px; height:80px; border-radius:50%; background:{SAND}; display:flex; align-items:center; justify-content:center"><p style="font-size:34px; color:{INK}; text-align:center">▶</p></div>'
    f'<svg viewBox="0 0 896 120" width="740" height="80" aria-label="גל קול של ההקלטה">{bars}</svg></div>'
    f'{p("״אני בסדר גמור.״ עוד לא ידעתי כלום.", 26, SAND)}{tr}</div>'
    f'<img src="/_blob/fa2ed9bcf42af6840e8c4bbf27acd2ec" alt="חנוך על אלונקה במסדרון בסורוקה, שעתיים אחרי הפינוי" style="width:464px; height:824px; object-fit:cover; border-radius:24px"></div>{pnum(n)}',
    "סורוקה, שעתיים אחרי הפינוי. התמונה + ההודעה הקולית ששלחתי לכולם. להשמיע (עם קול בקובץ ה-PowerPoint). הקהל שומע 'אני בסדר גמור' – ואתה כבר יודע שזה לא היה נכון. משפט אחד אחרי: באותו רגע חשבתי שהחלק הקשה נגמר. ואז הנגמ״ש יום אחרי, ואז הטוויסט.", pad="128px 128px 160px")
# 15 twist
n+=1
sec("twist", SAND,
    f'<div style="flex:1"></div>{h1("האמת?", 120, INK, extra="; text-align:center")}{h1("הקרב היה החלק הקל.", 130, INK, extra="; text-align:center")}'
    f'<div style="flex:1"></div>',
    "הטוויסט של ההרצאה. הקהל מצפה שהשיא היה 7 באוקטובר – ואתה אומר: הקרב היה החלק הקל. מכאן ההרצאה עוברת מסיפור מלחמה לסיפור חיים.")
# 16 section 04
n+=1
section_slide("s04","04","ואז הכול נגמר","","ואז הכול נגמר – 8 דקות.", n)
# 17 numbers
n+=1
stats=[("19","חברים ויותר שאיבדתי באותו יום"),("10","חברים נוספים, כמעט, במהלך המלחמה"),("3","חודשי אשפוז בתל השומר"),("2","פציעות: יד ועין")]
def statcard(a,b): return card(h1(a,110,SAND,extra="; text-align:center")+p(b,26,"#F6F3EE","; text-align:center"), True, "; align-items:center; justify-content:center; padding:40px 24px")
sec("numbers", INK,
    f'<div style="display:flex; flex-direction:row; gap:96px; flex:1; align-items:center">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:40px">'
    f'{h2("הדבר הכי קשה לא היה הפציעה.", 72, "#F6F3EE")}'
    f'{p("הדברים שהם לא יספיקו לעשות. המשפחות שנשארו.", 32, MUTEDL)}'
    f'{h3("זה מה שנשאר איתי.", 44, SAND)}</div>'
    f'</div>{pnum(n)}',
    "מספר אחד על המסך: 19. מעל 19 חברים באותו יום, ועוד כמעט עשרה במהלך המלחמה. זה הדבר שהיה לי הכי קשה אחרי השביעי – לא הפציעה. הדברים שהם לא יספיקו לעשות, והמשפחות השכולות. (אפשר להגיד שם אחד או שניים. לעצור. לא למהר לשקף הבא.)", pad="128px 128px 160px")
# 18 after
n+=1
items=[("✚","הפציעה",""),
       ("⌂","השיקום",""),
       ("♥","האובדן",""),
       ("→","החיים שאחרי","")]
sec("after", PAPER,
    f'{h2("מה שאף אחד לא מכין אותך אליו", 64)}'
    f'<div style="display:flex; flex-direction:row; gap:64px; flex:1; align-items:start">'
    f'<div style="flex:1; display:flex; flex-direction:column; justify-content:space-evenly; align-self:stretch">{"".join(row_item(a,b,c,False,44,24) for a,b,c in items)}</div>'
    f'{photo("מהשיקום בתל השומר", 520, 640, False, key="rehab")}</div>{pnum(n, False)}',
    "הפציעה – יד (חוסם עורקים) ועין (רסיס). השיקום – ארוך ומתיש, לבד רוב הזמן, בלי משככי כאבים, 3 חודשים בתל השומר. (לא להיכנס לסיבה – זה אישי ולא חלק מההרצאה.) האובדן. החיים שאחרי – המעבר המהיר בין לוחם לפצוע לאזרח. כאן ההרצאה עוברת מסיפור מלחמה לסיפור חיים.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:40px")
# 19 the journey since (replaces panama)
n+=1
def tile(label, key, cap):
    return (f'<div style="flex:1; display:flex; flex-direction:column; gap:12px">{photo(label, 304, 520, True, "; border-radius:20px", key=key)}'
            f'<p style="font-size:24px; color:{MUTEDL}; text-align:center">{t(cap)}</p></div>')
sec("journey", INK,
    f'<div style="display:flex; flex-direction:row-reverse; gap:32px; align-items:baseline; justify-content:space-between">{h2("מאז.", 72, "#F6F3EE")}</div>'
    f'<div style="display:flex; flex-direction:row; gap:36px; flex:1">'
    f'{tile("טיולים", "panama", "טיולים")}'
    f'{tile("סוסים", "horses", "סוסים")}'
    f'{tile("טיפוס", "climb", "טיפוס")}'
    f'{tile("סנפלינג במפל", "journey4", "סנפלינג")}'
    f'{tile("הרצאה על הבמה", "lecture", "הרצאות")}</div>{pnum(n)}',
    "שקף אחד על כל המסע מאז – ממש בקצרה. משפט על כל תמונה, לא יותר. פנמה: הריטריט שבו פגשתי אנשים טובים וראיתי שבאמת קיימים כאלה – משם התחלתי לחזור לאנשים. סוסים. טיפוס. ומה שעוד יגיע.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:40px")
# 20 section 05
n+=1
section_slide("s05","05","מה עושים כשהחיים לא חוזרים להיות מה שהיו?","","מה עושים כשהחיים לא חוזרים להיות מה שהיו – 10 דקות. החלק החדש. עליו הדגש.", n, 72)
# 21 principles
n+=1
P=[("1","אתה לא שולט במה שקורה לך","אבל אתה כן שולט במה שאתה עושה עם זה.",False),
   ("2","לא חייבים לדעת את כל הדרך","צריך לדעת רק מה הצעד הבא.",False),
   ("3","זהות לא מקבלים. בונים.","הפציעה לא מגדירה אותך. העבר לא מגדיר אותך. גם מה שקרה לך לא מגדיר בהכרח את האדם שתהיה.",True)]
ph="".join(card(f'{circle_icon(a,88)}{h3(b,44,"#F6F3EE" if d else TXT)}{p(c,28,MUTEDL if d else MUTED)}', d, "; gap:28px; padding:56px 48px") for a,b,c,d in P)
sec("principles", PAPER,
    f'{h2("שלושה עקרונות", 64)}<div style="display:flex; flex-direction:row; gap:40px; flex:1">{ph}</div>{pnum(n, False)}',
    "עיקרון 1 – אתה לא שולט במה שקורה לך, אבל אתה כן שולט במה שאתה עושה עם זה. עיקרון 2 – לא חייבים לדעת את כל הדרך. רק את הצעד הבא. עיקרון 3 – זהות לא מקבלים. בונים. לכל עיקרון: דוגמה אחת מהחיים שלך מאז הפציעה.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:48px")
# 22 section 06
n+=1
section_slide("s06","06","להפוך כאב למשהו","","להפוך כאב למשהו – 7 דקות.", n)
# 23 today
n+=1
T6=[("🎓","לימודים","הנדסאי בניין, ובקרוב – יזמות וקיימות באוניברסיטת רייכמן."),
    ("💼","עבודה","עבדתי בכל מיני עבודות – כל אחת לימדה אותי משהו."),
    ("🎤","הרצאות","לעמוד מול אנשים ולספר. לא בשביל רחמים."),
    ("🚀","קורסים והתנסויות","מיציתי את עצמי עד הקצה: קורסים, טיולים בעולם, ניסיון בכל דבר."),
    ("◎","שאיפות","יש לי שאיפות גדולות. אני לא יודע את כל הדרך – אני יודע מה הצעד הבא."),
    ("📈","הרצון להתפתח","לא לעצור. תמיד אפשר להיות יותר טוב.")]
def c6(a,b,c): return card(f'<div style="display:flex; flex-direction:row; gap:20px; align-items:center">{circle_icon(a,72)}{h3(b,44)}</div>{p(c,28,MUTED)}')
sec("today", PAPER,
    f'{h2("מה אני עושה עם זה היום", 64)}'
    f'<div style="display:flex; flex-direction:row; gap:32px; flex:1">{c6(*T6[0])}{c6(*T6[1])}{c6(*T6[2])}</div>'
    f'<div style="display:flex; flex-direction:row; gap:32px; flex:1">{c6(*T6[3])}{c6(*T6[4])}{c6(*T6[5])}</div>{pnum(n, False)}',
    "לימודים, עבודה, הרצאות, מטרות, בניית עתיד, הרצון להתפתח. המסר: לא תמיד אפשר לבחור את הסיפור שקיבלת. אפשר לבחור מה אתה עושה איתו.", pad="128px 128px 160px", layout="display:flex; flex-direction:column; gap:32px")
# (why slide removed at the user's request)
# (country slide removed at the user's request)
# 26 callback
n+=1
sec("callback", INK,
    f'<div style="flex:1"></div>{p("בהתחלה אמרתי לכם:", 40, MUTEDL, "; text-align:center")}{h2("ב־7 באוקטובר קיבלתי החלטה", 72, MUTEDL, "; text-align:center")}'
    f'<div style="height:56px"></div>{p("האמת היא שאני מקבל אותה מחדש", 44, "#F6F3EE", "; text-align:center")}{h2("כל בוקר", 110, SAND, "; text-align:center")}<div style="flex:1"></div>{pnum(n)}',
    "הסיום – 3 דקות. חוזרים למשפט מהפתיחה.", pad="128px 128px 160px")
# 27 decision x3
n+=1
D=[("כיתה י׳","כשהאשימו אותי – החלטתי לכתוב את הסיפור שלי בעצמי."),("7.10","כשנפצעתי – החלטתי לתפקד ולהמשיך."),("היום","כשהחיים לא חזרו למה שהיו – החלטתי לבנות אותם מחדש.")]
dh="".join(card(f'{h1(a,80,SAND,extra="; text-align:center")}{p(b,30,"#F6F3EE","; text-align:center")}', True, "; align-items:center; padding:56px 40px; gap:24px") for a,b in D)
sec("decision", INK,
    f'{h2("ההחלטה הייתה לקחת את ההחלטות בחיים שלי בעצמי.", 60, "#F6F3EE", "; text-align:center")}<div style="flex:1"></div>'
    f'<div style="display:flex; flex-direction:row-reverse; gap:40px">{dh}</div><div style="flex:1"></div>{pnum(n)}',
    "כאן סוגרים את המעגל מהפתיחה: 'ההחלטה' לא הייתה רק להמשיך להילחם. ההחלטה הייתה לקחת החלטות ולפעול בחיים של עצמי – כמו שעשיתי כילד, כמו שעשיתי בקרב, כמו שאני עושה היום.", pad="128px 128px 160px")
# 28 final
n+=1
sec("final", SAND,
    f'<div style="display:flex; flex-direction:row-reverse; gap:64px; align-items:center; flex:1">'
    f'<img src="/_blob/48fe90cb8bb83ef0eba26362de16aad1" alt="חנוך רוכב על סוס" style="width:620px; height:824px; object-fit:cover; border-radius:24px">'
    f'<div style="flex:1; display:flex; flex-direction:column; gap:28px; justify-content:center">'
    f'{h2("לא תמיד אנחנו בוחרים את מה שקורה לנו", 52, "#5A4A30")}{h1("אבל אנחנו כן בוחרים מה אנחנו עושים מכאן", 76, INK)}'
    f'<div style="height:24px"></div>{h3("תודה", 44, INK)}'
    f'<div style="display:flex; flex-direction:row-reverse; gap:32px; align-items:center">'
    f'<img src="/_blob/41627163abc2d5db7ef9ee7c7df1f3ed" alt="QR לאינסטגרם hanoch234" style="width:200px; height:200px; border-radius:16px">'
    f'<div style="display:flex; flex-direction:column; gap:10px">{p("חנוך  |  054-5522053", 30, "#5A4A30")}{p("Instagram: hanoch234", 30, "#5A4A30")}{p("hanochgo@gmail.com", 30, "#5A4A30")}</div></div></div></div>',
    "המשפט האחרון. לעצור. לא להוסיף כלום אחריו. הקהל מצלם את ה-QR.")

order=[i for i,_ in slides]
_a,_b=order.index('nagmash'),order.index('sector'); order[_a],order[_b]=order[_b],order[_a]
for i,h in slides:
    open(os.path.join(ROOT,"slides",i+".html"),"w",encoding="utf-8").write(h)
deck={"v":4,"createdOnFiles":{"v":1,"at":"2026-09-26T13:06:01Z"},
 "title":"7.10 – הסיפור שלי","order":order,
 "sections":{"open":{"description":"פתיחה: ההחלטה שהקהל עוד לא מבין","start":"cover"},
  "s1":{"description":"מי הייתי לפני הכול: ילד בעייתי, כיתה י׳, ההחלטה הראשונה","start":"s01"},
  "s2":{"description":"הבחירה: סיירת נח״ל והמפקדים","start":"s02"},
  "s3":{"description":"7 באוקטובר: הזירה, שבעה שלבים, הסרטונים ורגע הפציעה","start":"s03"},
  "s4":{"description":"ואז הכול נגמר: פציעה, שיקום, אובדן, פנמה","start":"s04"},
  "s5":{"description":"שלושה עקרונות לחיים שלא חוזרים למה שהיו","start":"s05"},
  "s6":{"description":"להפוך כאב למשהו, למה אני כאן, והסיום","start":"s06"}},
 "faces":{"frank-ruhl-libre":{"family":"Frank Ruhl Libre","href":"https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300..900&display=swap"},
          "heebo":{"family":"Heebo","href":"https://fonts.googleapis.com/css2?family=Heebo:wght@300..800&display=swap"}},
 "designSystems":[]}
json.dump(deck,open(os.path.join(ROOT,"deck.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=1)
print(len(slides), order)
