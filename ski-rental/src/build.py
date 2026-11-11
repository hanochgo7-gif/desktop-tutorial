# -*- coding: utf-8 -*-
"""Build the client questionnaire and the internal consultant guide.

    python3 ski-rental/src/build.py                 # writes ski-rental/*.html
    python3 ski-rental/src/build.py --fragments DIR # also writes page fragments
                                                    # (no <html>/<head>/<body>) for Artifact publishing
"""
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import content as C  # noqa: E402

LETTERS = {"A": "א׳", "B": "ב׳", "C": "ג׳", "D": "ד׳", "E": "ה׳", "F": "ו׳", "G": "ז׳", "H": "ח׳",
           "I": "ט׳", "J": "י׳", "K": "י״א", "L": "י״ב", "M": "י״ג", "N": "י״ד"}
LEVELS = [
    {"n": 1, "name": "מסלול כחול", "short": "בסיס", "desc": "מה שחייבים לדעת כדי להבין את העסק."},
    {"n": 2, "name": "מסלול אדום", "short": "עומק", "desc": "החשיבה, ההעדפות והחזון שמאחורי ההחלטות."},
    {"n": 3, "name": "מסלול שחור", "short": "מקצועי", "desc": "פערים, סיכונים והזדמנויות שקל לפספס."},
]
TYPE_LABEL = {"short": "פתוחה קצרה", "long": "פתוחה", "num": "מספר", "one": "בחירה יחידה", "many": "בחירה מרובה",
              "matrix": "מטריצת בחירה", "poles": "סקאלה דו-קוטבית", "grid": "טבלה", "list": "רשימה",
              "personas": "בונה פרסונות"}
TEAM = {t["k"]: t for t in C.TEAMS}
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500'
         '&family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=Secular+One&display=swap">')

e = html.escape


def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()


def all_qs():
    for ch in C.CHAPTERS:
        for q in ch["qs"]:
            yield ch, q


QBYID = {q["id"]: q for _, q in all_qs()}


def head(title, css, desc):
    return (f"<title>{e(title)}</title>\n"
            '<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<meta name="description" content="{e(desc)}">\n'
            '<meta name="robots" content="noindex, nofollow">\n'
            f"{FONTS}\n<style>\n{css}\n</style>\n")


def full_doc(head_part, body_part):
    return ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f"{head_part}</head>\n<body>\n{body_part}\n</body>\n</html>\n")


def js_data(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


# ----------------------------------------------------------------------------
# Client questionnaire
# ----------------------------------------------------------------------------
CLIENT_KEYS = ["id", "lvl", "t", "q", "req", "hint", "more", "opts", "rows", "cols", "pairs", "fields",
               "unit", "min", "founders", "show"]


def client_page():
    chapters = [{"id": ch["id"], "title": ch["title"], "lead": ch["lead"],
                 "qs": [{k: q[k] for k in CLIENT_KEYS if k in q} for q in ch["qs"]]}
                for ch in C.CHAPTERS]
    data = {"chapters": chapters, "letters": LETTERS, "levels": LEVELS, "undecided": C.UNDECIDED, "other": C.OTHER}
    n_all = sum(len(ch["qs"]) for ch in C.CHAPTERS)
    n_blue = sum(1 for _, q in all_qs() if q["lvl"] == 1)

    legend = "".join(
        f'<span class="piste piste-{lv["n"]}"><i></i><b>{e(lv["name"])}</b>&nbsp;· {e(lv["desc"])}</span>'
        for lv in LEVELS)
    seg = "".join(
        f'<button type="button" data-lvl="{n}" aria-pressed="false"><span class="piste piste-{n}"><i></i></span>{label}</button>'
        for n, label in [(1, "כחול"), (2, "כחול ואדום"), (3, "הכול")])

    body = f"""<div class="app" dir="rtl" lang="he">
<header class="hero">
  <div class="wrap">
    <div>
      <p class="eyebrow">שאלון אפיון · שלב ראשון</p>
      <h1>רואי ואומר,<br><span>בואו נכיר את העסק.</span></h1>
      <p class="lede">השאלון הזה הוא הצעד הראשון בבניית העסק להשכרת ציוד סקי. הוא עוזר לנו להבין מה אתם רוצים להקים, בשביל מי ולמה, כדי שכל החלטה בהמשך, מהמחיר ועד הלוגו, תישען על משהו אמיתי. אתם לא צריכים לדעת הכול. בשביל זה אנחנו כאן.</p>
    </div>
    <div class="how">
      <div><b>לא חייבים לסיים בבת אחת</b><p>התשובות נשמרות תוך כדי. אפשר לעצור ולחזור מתי שנוח.</p></div>
      <div><b>״{e(C.UNDECIDED)}״ זו תשובה טובה</b><p>היא מראה לנו איפה לעזור. אל תנחשו ואל תמציאו מספרים.</p></div>
      <div><b>מתחילים במסלול הכחול</b><p>{n_blue} שאלות בסיס, בערך שעה. את האדום והשחור אפשר להשאיר לפגישה.</p></div>
      <div><b>חלק מהשאלות לכל אחד לבד</b><p>בשאלות A-13 עד A-17 כל אחד עונה בנפרד, בלי להתייעץ קודם.</p></div>
    </div>
    <div class="levels">{legend}</div>
  </div>
  <svg class="ridge" viewBox="0 0 1200 46" preserveAspectRatio="none" aria-hidden="true"><path fill="var(--snow)" d="M0 46V30l80-8 70 8 90-20 60 14 60-6 70 14 90-26 80 20 60-6 80 14 80-20 80 14 80-10 80 12 70-14 70 10v20z"/></svg>
</header>

<div class="bar">
  <div class="wrap">
    <div class="bar-progress">
      <div class="nums"><b id="q-done"></b><span id="q-req"></span></div>
      <div class="track" aria-hidden="true"><span id="q-track"></span></div>
    </div>
    <div class="seg" id="q-level" role="group" aria-label="אילו שאלות להציג">{seg}</div>
    <span class="save" id="q-save" role="status" data-state="local"></span>
    <button type="button" class="btn btn-primary" id="q-open-sheet">סיכום ושליחה</button>
    <select class="chap-select" id="q-chap" aria-label="מעבר לפרק"></select>
  </div>
</div>

<div class="wrap layout">
  <nav class="nav" aria-label="פרקי השאלון">
    <ol id="q-nav"></ol>
    <p class="nav-foot">{n_all} שאלות ב-{len(C.CHAPTERS)} פרקים. הרמה שנבחרה בסרגל קובעת אילו מהן מוצגות.</p>
  </nav>
  <main id="q-main" aria-live="off"></main>
</div>

<div class="sheet-back" id="q-back" hidden></div>
<section class="sheet" id="q-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="q-sheet-t">
  <div class="sheet-h"><h2 id="q-sheet-t">סיכום ושליחה</h2><button type="button" class="btn" id="q-sheet-close">סגירה</button></div>
  <div class="sheet-b" id="q-sheet-body"></div>
</section>
<div class="toast" id="q-toast" role="status" hidden></div>
</div>
<script>window.SKI_Q={js_data(data)};</script>
<script>
{read("client.js")}
</script>"""
    hp = head("שאלון אפיון השכרת סקי", read("base.css") + read("client.css"),
              "שאלון האפיון לרואי ולאומר לקראת הקמת העסק להשכרת ציוד סקי.")
    return hp, body


# ----------------------------------------------------------------------------
# Consultant guide
# ----------------------------------------------------------------------------
def idchip(i):
    q = QBYID.get(i)
    if q:
        return f'<a class="idchip l{q["lvl"]}" href="#g-{i}" title="{e(q["q"])}">{i}</a>'
    if i in LETTERS:
        return f'<a class="idchip" href="#gb-{i}">פרק {LETTERS[i]}</a>'
    return f'<span class="idchip">{e(i)}</span>'


def show_text(s):
    if "any" in s:
        return f'מוצגת רק אם ב-{s["id"]} נבחר: {" / ".join(s["any"])}'
    return f'מוסתרת אם ב-{s["id"]} נבחר: {" / ".join(s["none"])}'


def bank_item(q):
    lv = LEVELS[q["lvl"] - 1]
    teams = ", ".join(TEAM[t]["name"] for t in q["teams"])
    meta = [f'<span class="piste piste-{q["lvl"]}"><i></i>{lv["short"]}</span>',
            '<span class="tag-req">חובה</span>' if q["req"] else "<span>רשות</span>",
            f'<span>סוג: {TYPE_LABEL[q["t"]]}{" (" + e(q["unit"]) + ")" if q.get("unit") else ""}</span>',
            f'<span>צוותים: {e(teams)}</span>']
    if q.get("founders"):
        meta.append("<span>כל יזם עונה בנפרד</span>")
    if q.get("show"):
        meta.append(f'<span>{e(show_text(q["show"]))}</span>')
    extra = []
    extra.append(f'<p class="why"><b>למה זה חשוב לנו:</b> {e(q["why"])}</p>')
    if q.get("more"):
        extra.append(f'<p class="fu"><b>שאלת המשך:</b> {e(q["more"])}</p>')
    if q.get("opts"):
        extra.append(f'<p class="opts">אפשרויות: {" · ".join(e(o) for o in q["opts"])}</p>')
    elif q.get("rows"):
        cols = q.get("cols", [])
        cols_txt = " · ".join(e(c["label"] if isinstance(c, dict) else c) for c in cols)
        extra.append(f'<p class="opts">שורות: {" · ".join(e(r) for r in q["rows"])}<br>עמודות: {cols_txt}</p>')
    elif q.get("pairs"):
        extra.append(f'<p class="opts">צירים: {" · ".join(e(a) + " ↔ " + e(b) for a, b in q["pairs"])}</p>')
    elif q.get("fields"):
        extra.append(f'<p class="opts">שדות: {" · ".join(e(f["label"]) for f in q["fields"])}</p>')
    if q.get("flag"):
        extra.append(f'<p class="flag"><b>דגל אדום:</b> {e(q["flag"])}</p>')
    search = (q["id"] + " " + q["q"] + " " + q["why"] + " " + q.get("flag", "")).lower()
    return (f'<article class="bq" id="g-{q["id"]}" data-lvl="{q["lvl"]}" data-teams="{q["teams"]}" '
            f'data-req="{1 if q["req"] else 0}" data-flag="{1 if q.get("flag") else 0}" data-s="{e(search)}">'
            f'<div class="id">{q["id"]}</div><div><p class="qt">{e(q["q"])}</p>'
            f'<div class="meta">{"".join(meta)}</div>{"".join(extra)}</div></article>')


def guide_page():
    qs = [q for _, q in all_qs()]
    n_req = sum(q["req"] for q in qs)
    n_flags = sum(1 for q in qs if q.get("flag"))
    by_lvl = {n: sum(1 for q in qs if q["lvl"] == n) for n in (1, 2, 3)}

    steps = "".join(f'<li><b>{e(s["name"])}</b><p>{e(s["body"])}</p></li>' for s in C.SESSIONS)

    teams_html = []
    for t in C.TEAMS:
        owned = [q for q in qs if t["k"] in q["teams"]]
        research = ""
        if t.get("research"):
            research = ('<div><h4>מה בודקים במחקר, עם מקורות</h4><ul>'
                        + "".join(f"<li>{e(r)}</li>" for r in t["research"]) + "</ul></div>")
        teams_html.append(f"""<article class="team" id="team-{t['k']}">
  <h3><span class="tk">{t['k']}</span>{e(t['name'])}</h3>
  <p class="lens">{e(t['lens'])}</p>
  <div class="covers">{''.join(f'<span>{e(c)}</span>' for c in t['covers'])}</div>
  <div><h4>נקודות עיוורון שהצוות מביא לשאלון</h4><ul>{''.join(f'<li>{e(b)}</li>' for b in t['blind'])}</ul></div>
  {research}
  <p class="must"><b>אסור לצאת מהאפיון בלי:</b> {e(t['must'])}</p>
  <div><h4>שאלות בבעלות הצוות ({len(owned)})</h4><div class="owned">{''.join(idchip(q['id']) for q in owned)}</div></div>
</article>""")

    checks = "".join(f"""<div class="check">
  <h3>{e(c['title'])}</h3>
  <p class="c"><b>מה בודקים:</b> {e(c['check'])}</p>
  <p class="s"><b>מתי זה דגל:</b> {e(c['signal'])}</p>
  <div class="owned">{''.join(idchip(i) for i in c['ids'])}</div>
</div>""" for c in C.CROSS_CHECKS)

    team_opts = "".join(f'<option value="{t["k"]}">{e(t["name"])}</option>' for t in C.TEAMS)
    bank = []
    for ch in C.CHAPTERS:
        bank.append(f'<section class="bank-ch" id="gb-{ch["id"]}"><h3><span class="l">{LETTERS[ch["id"]]}</span>{e(ch["title"])}</h3>'
                    + "".join(bank_item(q) for q in ch["qs"]) + "</section>")

    dl_rows = "".join(
        f'<tr><td class="n">{i + 1:02d}</td><td><b>{e(he)}</b><span class="en">{e(en)}</span></td>'
        f'<td><div class="owned">{"".join(idchip(x) for x in inputs)}</div></td><td>{e(need)}</td></tr>'
        for i, (en, he, inputs, need) in enumerate(C.DELIVERABLES))

    log_rows = "".join(f'<tr><td class="n">{i:02d}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' for i in range(1, 11))

    body = f"""<div class="app" dir="rtl" lang="he">
<header class="g-hero">
  <div class="wrap">
    <span class="internal">פנימי · לא לשליחה ללקוח</span>
    <h1>מדריך יועצים לאפיון העסק של רואי ואומר</h1>
    <p>כל מה שמאחורי השאלון: תשעת צוותי המומחים ונקודות העיוורון שהם הביאו, הערה פנימית לכל שאלה, הבדיקות הצולבות שמאתגרות את התשובות, ומפה מכל תשובה לתוצר שהיא מזינה.</p>
    <div class="kpis">
      <div><b>{len(qs)}</b><span>שאלות</span></div>
      <div><b>{n_req}</b><span>שאלות חובה</span></div>
      <div><b>{by_lvl[1]} / {by_lvl[2]} / {by_lvl[3]}</b><span>בסיס / עומק / מקצועי</span></div>
      <div><b>{n_flags}</b><span>דגלים אדומים מוגדרים</span></div>
      <div><b>{len(C.CROSS_CHECKS)}</b><span>בדיקות צולבות</span></div>
    </div>
  </div>
</header>

<div class="wrap g-layout">
  <nav class="toc" aria-label="תוכן המדריך"><ol>
    <li><a href="#use">איך משתמשים</a></li>
    <li><a href="#process">תהליך ופגישות</a></li>
    <li><a href="#teams">צוותי המומחים</a></li>
    <li><a href="#checks">חשיבה ביקורתית</a></li>
    <li><a href="#bank">מאגר השאלות</a></li>
    <li><a href="#deliverables">מפת התוצרים</a></li>
    <li><a href="#log">יומן נקודות לבירור</a></li>
  </ol></nav>

  <main class="g-main">
    <section class="g-sec" id="use">
      <h2>איך משתמשים במדריך</h2>
      <p class="lead">השאלון שרואי ואומר ממלאים לא כולל אף אחת מההערות שכאן. המדריך הוא כלי העבודה שלנו לקריאת התשובות, להכנה לפגישות ולזיהוי פערים.</p>
      <ul class="research">
        <li><b>שלוש רמות עומק</b> מסומנות כמו מסלולי סקי: <span class="piste piste-1"><i></i>בסיס</span>, <span class="piste piste-2"><i></i>עומק</span>, <span class="piste piste-3"><i></i>מקצועי</span>. ״חובה״ מסומן בנפרד מהרמה.</li>
        <li><b>לכל שאלה</b>: מזהה קבוע, סוג תשובה, חובה או רשות, הצוותים האחראים, ו״למה זה חשוב לנו״. בחלק מהשאלות יש שאלת המשך ודגל אדום.</li>
        <li><b>תשובה לא ברורה לא מנחשים.</b> רושמים אותה ביומן נקודות לבירור (בסוף המדריך) עם המזהה שלה.</li>
        <li><b>אין מספרי שוק בלי מקור.</b> כל נתון שלא נבדק מסומן כהשערה עד שצוות המחקר מאמת אותו.</li>
      </ul>
    </section>

    <section class="g-sec" id="process">
      <h2>תהליך האפיון והפגישות</h2>
      <ol class="steps">{steps}</ol>
    </section>

    <section class="g-sec" id="teams">
      <h2>תשעת צוותי המומחים</h2>
      <p class="lead">כל צוות בחן את העסק מזווית אחרת, זיהה שאלות קריטיות ונקודות עיוורון, והשאלות שלו אוחדו לשאלון אחד בלי כפילויות. כל שאלה רשומה תחת כל הצוותים שצריכים את התשובה שלה.</p>
      <div class="teams">{''.join(teams_html)}</div>
    </section>

    <section class="g-sec" id="checks">
      <h2>מנגנון החשיבה הביקורתית</h2>
      <p class="lead">אחרי שהתשובות מגיעות, עוברים על הבדיקות האלה לפני הפגישה. כל בדיקה מצליבה כמה שאלות ומחפשת סתירה, הנחה שלא נבדקה או פער בין שאיפה למשאבים. מה שעולה כאן הוא חומר הפגישה, לא ביקורת על היזמים.</p>
      <div class="checks">{checks}</div>
    </section>

    <section class="g-sec" id="bank">
      <h2>מאגר השאלות עם ההערות הפנימיות</h2>
      <div class="filters" role="group" aria-label="סינון שאלות">
        <div class="seg" id="f-lvl">
          <button type="button" data-v="0" aria-pressed="true">הכול</button>
          <button type="button" data-v="1" aria-pressed="false"><span class="piste piste-1"><i></i></span>בסיס</button>
          <button type="button" data-v="2" aria-pressed="false"><span class="piste piste-2"><i></i></span>עומק</button>
          <button type="button" data-v="3" aria-pressed="false"><span class="piste piste-3"><i></i></span>מקצועי</button>
        </div>
        <select id="f-team" aria-label="צוות"><option value="">כל הצוותים</option>{team_opts}</select>
        <label class="fcount"><input type="checkbox" id="f-req"> רק חובה</label>
        <label class="fcount"><input type="checkbox" id="f-flag"> רק עם דגל אדום</label>
        <input type="search" id="f-s" placeholder="חיפוש מילה או מזהה" aria-label="חיפוש">
        <span class="fcount" id="f-count" role="status"></span>
      </div>
      {''.join(bank)}
    </section>

    <section class="g-sec" id="deliverables">
      <h2>מפת התוצרים</h2>
      <p class="lead">התוצרים נבנים רק אחרי האפיון והמחקר. הטבלה מראה מאילו תשובות כל תוצר ניזון ומה עוד חייב לקרות לפני שמתחילים לכתוב אותו.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>תוצר</th><th>נשען על</th><th>מה עוד צריך לפני שמתחילים</th></tr></thead>
        <tbody>{dl_rows}</tbody>
      </table></div>
    </section>

    <section class="g-sec" id="log">
      <h2>יומן נקודות לבירור</h2>
      <p class="lead">כל תשובה לא ברורה, סתירה או הנחה שלא נבדקה נרשמת כאן עם מזהה השאלה. היומן נסגר רק כשלכל שורה יש תשובה או החלטה מתועדת.</p>
      <div class="tbl-wrap"><table class="log">
        <thead><tr><th>#</th><th>מזהה</th><th>מה לא ברור</th><th>סוג (סתירה, חוסר, הנחה)</th><th>מי בודק</th><th>עד מתי</th><th>סטטוס</th></tr></thead>
        <tbody>{log_rows}</tbody>
      </table></div>
    </section>
  </main>
</div>
</div>
<script>
{read("guide.js")}
</script>"""
    hp = head("מדריך יועצים לאפיון הסקי", read("base.css") + read("guide.css"),
              "מדריך פנימי לצוות: הערות לכל שאלה, צוותי מומחים, בדיקות צולבות ומפת תוצרים.")
    return hp, body


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("wrote", os.path.relpath(path), f"({len(text.encode('utf-8')) // 1024} KB)")


def main():
    frag_dir = None
    if "--fragments" in sys.argv:
        frag_dir = sys.argv[sys.argv.index("--fragments") + 1]
        os.makedirs(frag_dir, exist_ok=True)
    for name, fn in [("questionnaire.html", client_page), ("consultant-guide.html", guide_page)]:
        hp, body = fn()
        write(os.path.join(OUT, name), full_doc(hp, body))
        if frag_dir:
            write(os.path.join(frag_dir, name), hp + body + "\n")


if __name__ == "__main__":
    main()
