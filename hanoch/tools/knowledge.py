# קובץ הידע של המצפן, העוזר הדיגיטלי. מריצים: python3 tools/knowledge.py
# הידע נלקח רק מהעמודים של האתר עצמו (דף הבית, עמודי השירות, תיק העבודות), כדי שהעוזר לא ימציא כלום.
# הפלט: api/_knowledge.js (קובץ שמתחיל בקו תחתון לא הופך לפונקציה ב-Vercel).
import html, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = 'https://hgpro.io'


def text(fragment):
    fragment = re.sub(r'<(script|style|svg|template)[\s\S]*?</\1>', ' ', fragment)
    fragment = re.sub(r'<(br|/p|/li|/h[1-6]|/dt|/dd|/tr|/legend|/summary)\b[^>]*>', '\n', fragment)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', fragment))
    t = re.sub(r'[ \t ]+', ' ', t)
    return '\n'.join(l.strip() for l in t.split('\n') if l.strip())


def main_of(path):
    s = open(os.path.join(ROOT, path), encoding='utf-8').read()
    m = re.search(r'<main[\s\S]*?</main>', s)
    return m.group(0) if m else s


def home():
    s = main_of('index.html')
    # בלי הפתיחה ובלי טופס הבריף: הם לא ידע, הם ממשק
    s = re.sub(r'<section class="hero[\s\S]*?</section>', '', s, count=1)
    s = re.sub(r'<form class="brief"[\s\S]*?</form>', '', s)
    s = re.sub(r'<footer[\s\S]*?</footer>', '', s)
    return text(s)


def services():
    out = []
    for f in sorted(os.listdir(os.path.join(ROOT, 'services'))):
        if not f.endswith('.html') or f == 'index.html':
            continue
        s = main_of('services/' + f)
        s = re.sub(r'<nav[\s\S]*?</nav>', '', s)
        s = re.sub(r'<(video|figure)[\s\S]*?</\1>', '', s)
        out.append('### ' + D + '/services/' + f + '\n' + text(s))
    return '\n\n'.join(out)


def projects():
    js = open(os.path.join(ROOT, 'js/hanoch.js'), encoding='utf-8').read()
    a = js.index('var DATA = {'); b = js.index('  if (EN) {', a)
    c = js.index('var LIVE = {'); d = js.index('};', c) + 2
    code = 'var EN=false;' + js[a:b] + js[c:d] + 'console.log(JSON.stringify({DATA:DATA,LIVE:LIVE}))'
    data = json.loads(subprocess.run(['node', '-e', code], capture_output=True, text=True, check=True).stdout)
    out = []
    for k, p in data['DATA'].items():
        live = data['LIVE'].get(k) or ''
        lines = ['### ' + p['name'] + ' (' + p['sub'] + ')',
                 'סוג העבודה: ' + p['kind'],
                 'הסיפור בתיק העבודות: ' + D + '/work.html#' + k]
        if live:
            lines.append('האתר החי: ' + live)
        lines.append(p['story'])
        lines += ['- ' + x for x in p.get('points', [])]
        out.append('\n'.join(lines))
    return '\n\n'.join(out)


FACTS = '''## עובדות קבועות
- הסטודיו: HG Studio, של חנוך גוטובסקי, בישראל. חנוך מעצב, בונה ומפיק בעצמו.
- יצירת קשר: וואטסאפ או טלפון 054-5522053, מייל boss@hgpro.io. טופס בריף קצר בתחתית דף הבית: ''' + D + '''/#contact
- תיק העבודות: ''' + D + '''/work.html. ארכיון העבודות, הסרטים והעיצובים: ''' + D + '''/archive/
- כל השירותים: ''' + D + '''/services/
- מחירים: לא מופיעים באתר ולא נמסרים בשיחה. המחיר נקבע לפי מה שהעסק צריך, ומגיע בהצעה כתובה עם מחיר סגור לפני שמשהו מתחיל.
- פרויקטים "אֶלֶף" ו"יסוד" הם מותגים בדויים להדגמה, ולא לקוחות.
- נגישות: האתר נבנה לפי WCAG 2.2 ברמה AA ות"י 5568, עם תפריט נגישות. הצהרת נגישות: ''' + D + '''/accessibility.html
- פרטיות: סטטיסטיקה (Google Analytics) נטענת רק אחרי הסכמה. השיחה עם המצפן לא נשמרת באתר. מדיניות הפרטיות: ''' + D + '''/privacy.html
- תנאי שימוש: ''' + D + '''/terms.html. ביטול והחזרים: ''' + D + '''/refunds.html
- מאמרים: ''' + D + '''/blog/
- אני גיבור (פלטפורמה שחנוך בנה): https://anigibor.com
'''


def build():
    parts = ['# הידע של האתר hgpro.io', FACTS,
             '## דף הבית: שירותים, חבילות ומערכות\n' + home(),
             '## תיק העבודות\n' + projects(),
             '## עמודי השירות\n' + services()]
    k = '\n\n'.join(parts)
    # שורות שחוזרות על עצמן (תפריטים, כפתורים) רק מנפחות את הידע
    seen, lines = set(), []
    for l in k.split('\n'):
        key = l.strip()
        if len(key) < 60 and key in seen and not key.startswith('#'):
            continue
        seen.add(key); lines.append(l)
    k = '\n'.join(lines)
    out = os.path.join(ROOT, 'api', '_knowledge.js')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// נוצר אוטומטית על ידי tools/knowledge.py. לא עורכים ידנית.\nmodule.exports = ' + json.dumps(k, ensure_ascii=False) + ';\n')
    print('knowledge', len(k), 'chars')


if __name__ == '__main__':
    build()
